use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("absolute paths are not allowed: {0}")]
    Absolute(String),
    #[error("path escapes workspace root: {0}")]
    Escape(String),
    #[error("path is not a file: {0}")]
    NotAFile(String),
    #[error("path is not a directory: {0}")]
    NotADir(String),
    #[error("invalid regex: {0}")]
    BadRegex(String),
    #[error("path is outside the write scope ({scope}): {path}")]
    OutsideWriteScope { scope: String, path: String },
    #[error("file already exists (pass overwrite=true to replace): {0}")]
    AlreadyExists(String),
    #[error("apply_diff: block #{index} search pattern not found in {path}")]
    DiffSearchMissing { path: String, index: usize },
    #[error("apply_diff: block #{index} search pattern matches {count} times in {path} (must match exactly once)")]
    DiffSearchAmbiguous { path: String, index: usize, count: usize },
    #[error("apply_diff: no blocks provided")]
    DiffEmpty,
}

pub type Result<T> = std::result::Result<T, Error>;

const SKIP_DIRS: &[&str] = &[
    ".git", "target", "node_modules", "dist", "build", ".next", ".nuxt", ".turbo", ".nx",
    ".cache", ".idea", ".vscode", "coverage",
];

#[derive(Clone, Debug)]
pub struct Workspace {
    root: PathBuf,
    write_scope: Option<PathBuf>,
}

impl Workspace {
    pub fn new(root: impl Into<PathBuf>) -> Result<Self> {
        let root = std::fs::canonicalize(root.into())?;
        Ok(Self { root, write_scope: None })
    }

    pub fn with_write_scope(mut self, scope_rel: Option<&str>) -> Result<Self> {
        self.write_scope = match scope_rel {
            None => None,
            Some(s) if s.is_empty() || s == "." => None,
            Some(s) => {
                let joined = self.root.join(s);
                std::fs::create_dir_all(&joined)?;
                Some(std::fs::canonicalize(&joined)?)
            }
        };
        Ok(self)
    }

    pub fn write_scope(&self) -> Option<&Path> {
        self.write_scope.as_deref()
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    fn check_write_scope(&self, abs: &Path) -> Result<()> {
        if let Some(scope) = &self.write_scope {
            if !abs.starts_with(scope) {
                let rel = abs.strip_prefix(&self.root).unwrap_or(abs);
                let scope_rel = scope.strip_prefix(&self.root).unwrap_or(scope);
                return Err(Error::OutsideWriteScope {
                    scope: scope_rel.to_string_lossy().replace('\\', "/"),
                    path: rel.to_string_lossy().replace('\\', "/"),
                });
            }
        }
        Ok(())
    }

    fn resolve_for_write(&self, rel: &str) -> Result<PathBuf> {
        let p = Path::new(rel);
        if p.is_absolute() {
            return Err(Error::Absolute(rel.to_string()));
        }
        let joined = self.root.join(p);
        if let Some(parent) = joined.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let parent_canonical = match joined.parent() {
            Some(parent) => std::fs::canonicalize(parent)?,
            None => self.root.clone(),
        };
        if !parent_canonical.starts_with(&self.root) {
            return Err(Error::Escape(rel.to_string()));
        }
        let final_path = parent_canonical.join(joined.file_name().unwrap_or_default());
        self.check_write_scope(&final_path)?;
        Ok(final_path)
    }

    fn resolve(&self, rel: &str) -> Result<PathBuf> {
        let rel = if rel.is_empty() || rel == "." { "" } else { rel };
        let p = Path::new(rel);
        if p.is_absolute() {
            return Err(Error::Absolute(rel.to_string()));
        }
        let joined = if rel.is_empty() {
            self.root.clone()
        } else {
            self.root.join(p)
        };
        let canonical = std::fs::canonicalize(&joined)?;
        if !canonical.starts_with(&self.root) {
            return Err(Error::Escape(rel.to_string()));
        }
        Ok(canonical)
    }

    fn to_rel_string(&self, abs: &Path) -> String {
        abs.strip_prefix(&self.root)
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_else(|_| abs.to_string_lossy().to_string())
    }

    pub async fn write_text(&self, rel: &str, content: &str, overwrite: bool) -> Result<WriteResult> {
        let path = self.resolve_for_write(rel)?;
        let existed = tokio::fs::try_exists(&path).await.unwrap_or(false);
        if existed && !overwrite {
            return Err(Error::AlreadyExists(rel.to_string()));
        }
        tokio::fs::write(&path, content).await?;
        Ok(WriteResult {
            path: rel.replace('\\', "/"),
            bytes: content.len() as u64,
            created: !existed,
        })
    }

    pub async fn apply_diff(&self, rel: &str, blocks: &[DiffBlock]) -> Result<DiffResult> {
        if blocks.is_empty() {
            return Err(Error::DiffEmpty);
        }
        let path = self.resolve(rel)?;
        let meta = tokio::fs::metadata(&path).await?;
        if !meta.is_file() {
            return Err(Error::NotAFile(rel.to_string()));
        }
        self.check_write_scope(&path)?;
        let original = tokio::fs::read_to_string(&path).await?;

        let mut current = original.clone();
        let mut applied = Vec::with_capacity(blocks.len());
        for (i, block) in blocks.iter().enumerate() {
            let count = current.matches(&block.search).count();
            if count == 0 {
                return Err(Error::DiffSearchMissing { path: rel.to_string(), index: i });
            }
            if count > 1 {
                return Err(Error::DiffSearchAmbiguous {
                    path: rel.to_string(),
                    index: i,
                    count,
                });
            }
            current = current.replacen(&block.search, &block.replace, 1);
            applied.push(BlockApplied {
                index: i,
                search_bytes: block.search.len() as u64,
                replace_bytes: block.replace.len() as u64,
            });
        }

        tokio::fs::write(&path, &current).await?;
        Ok(DiffResult {
            path: rel.replace('\\', "/"),
            bytes_before: original.len() as u64,
            bytes_after: current.len() as u64,
            blocks_applied: applied,
        })
    }

    pub async fn create_dir(&self, rel: &str) -> Result<DirCreateResult> {
        let path = self.resolve_for_write(rel)?;
        let existed = tokio::fs::try_exists(&path).await.unwrap_or(false);
        tokio::fs::create_dir_all(&path).await?;
        Ok(DirCreateResult {
            path: rel.replace('\\', "/"),
            created: !existed,
        })
    }

    pub async fn read_text(&self, rel: &str) -> Result<ReadResult> {
        let path = self.resolve(rel)?;
        let meta = tokio::fs::metadata(&path).await?;
        if !meta.is_file() {
            return Err(Error::NotAFile(rel.to_string()));
        }
        let content = tokio::fs::read_to_string(&path).await?;
        Ok(ReadResult {
            path: rel.to_string(),
            bytes: meta.len(),
            content,
        })
    }

    pub async fn list_dir(&self, rel: &str, max_entries: usize) -> Result<ListResult> {
        let path = self.resolve(rel)?;
        let meta = tokio::fs::metadata(&path).await?;
        if !meta.is_dir() {
            return Err(Error::NotADir(rel.to_string()));
        }

        let mut rd = tokio::fs::read_dir(&path).await?;
        let mut entries = Vec::new();
        let mut truncated = false;
        while let Some(entry) = rd.next_entry().await? {
            let name = entry.file_name().to_string_lossy().to_string();
            if SKIP_DIRS.contains(&name.as_str()) {
                continue;
            }
            if entries.len() >= max_entries {
                truncated = true;
                break;
            }
            let ft = entry.file_type().await?;
            let kind = if ft.is_dir() {
                "dir"
            } else if ft.is_file() {
                "file"
            } else if ft.is_symlink() {
                "symlink"
            } else {
                "other"
            };
            let bytes = if ft.is_file() {
                entry.metadata().await.ok().map(|m| m.len())
            } else {
                None
            };
            let entry_path = self.to_rel_string(&entry.path());
            entries.push(DirEntry { path: entry_path, name, kind: kind.into(), bytes });
        }

        entries.sort_by(|a, b| match (a.kind.as_str(), b.kind.as_str()) {
            ("dir", "dir") | ("file", "file") => a.name.cmp(&b.name),
            ("dir", _) => std::cmp::Ordering::Less,
            (_, "dir") => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        });

        let normalized_rel = self.to_rel_string(&path);
        Ok(ListResult {
            path: if normalized_rel.is_empty() { ".".into() } else { normalized_rel },
            entries,
            truncated,
        })
    }

    pub async fn grep(
        &self,
        pattern: &str,
        rel_path: Option<&str>,
        max_matches: usize,
    ) -> Result<GrepResult> {
        let scope_rel = rel_path.unwrap_or("").to_string();
        let scope_abs = self.resolve(&scope_rel)?;

        match run_ripgrep(pattern, &scope_abs, max_matches).await {
            Ok(Some(matches)) => Ok(GrepResult {
                pattern: pattern.to_string(),
                scope: self.normalize_scope(&scope_abs),
                engine: "ripgrep".into(),
                truncated: matches.len() >= max_matches,
                matches: self.relativize_matches(matches),
            }),
            Ok(None) => {
                let matches = naive_grep(pattern, &scope_abs, max_matches)?;
                Ok(GrepResult {
                    pattern: pattern.to_string(),
                    scope: self.normalize_scope(&scope_abs),
                    engine: "naive".into(),
                    truncated: matches.len() >= max_matches,
                    matches: self.relativize_matches(matches),
                })
            }
            Err(e) => Err(e),
        }
    }

    fn normalize_scope(&self, scope_abs: &Path) -> String {
        let s = self.to_rel_string(scope_abs);
        if s.is_empty() { ".".into() } else { s }
    }

    fn relativize_matches(&self, mut matches: Vec<GrepMatch>) -> Vec<GrepMatch> {
        for m in &mut matches {
            let p = PathBuf::from(&m.path);
            if p.is_absolute() {
                m.path = self.to_rel_string(&p);
            } else {
                m.path = m.path.replace('\\', "/");
            }
        }
        matches
    }
}

async fn run_ripgrep(pattern: &str, scope: &Path, max_matches: usize) -> Result<Option<Vec<GrepMatch>>> {
    use tokio::process::Command;

    let output = Command::new("rg")
        .arg("--json")
        .arg("--max-count")
        .arg(max_matches.to_string())
        .arg("-e")
        .arg(pattern)
        .arg(scope)
        .output()
        .await;

    let output = match output {
        Ok(o) => o,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(Error::Io(e)),
    };

    let mut matches = Vec::new();
    for line in output.stdout.split(|&b| b == b'\n') {
        if line.is_empty() {
            continue;
        }
        let Ok(v) = serde_json::from_slice::<serde_json::Value>(line) else { continue };
        if v.get("type").and_then(|t| t.as_str()) != Some("match") {
            continue;
        }
        let data = match v.get("data") {
            Some(d) => d,
            None => continue,
        };
        let path = data
            .pointer("/path/text")
            .and_then(|p| p.as_str())
            .unwrap_or("")
            .to_string();
        let line_no = data.get("line_number").and_then(|n| n.as_u64()).unwrap_or(0) as usize;
        let text = data
            .pointer("/lines/text")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .trim_end_matches('\n')
            .to_string();
        matches.push(GrepMatch { path, line: line_no, text });
        if matches.len() >= max_matches {
            break;
        }
    }

    Ok(Some(matches))
}

fn naive_grep(pattern: &str, scope: &Path, max_matches: usize) -> Result<Vec<GrepMatch>> {
    let re = regex::Regex::new(pattern).map_err(|e| Error::BadRegex(e.to_string()))?;
    let mut matches = Vec::new();

    let walker = walkdir::WalkDir::new(scope).into_iter().filter_entry(|e| {
        if e.depth() == 0 {
            return true;
        }
        let name = e.file_name().to_string_lossy();
        !SKIP_DIRS.contains(&name.as_ref())
    });

    for entry in walker.flatten() {
        if matches.len() >= max_matches {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        if let Ok(md) = entry.metadata() {
            if md.len() > 2_000_000 {
                continue;
            }
        }
        let Ok(content) = std::fs::read_to_string(entry.path()) else { continue };
        for (i, line) in content.lines().enumerate() {
            if matches.len() >= max_matches {
                break;
            }
            if re.is_match(line) {
                matches.push(GrepMatch {
                    path: entry.path().to_string_lossy().to_string(),
                    line: i + 1,
                    text: line.to_string(),
                });
            }
        }
    }

    Ok(matches)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadResult {
    pub path: String,
    pub bytes: u64,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteResult {
    pub path: String,
    pub bytes: u64,
    pub created: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirCreateResult {
    pub path: String,
    pub created: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffBlock {
    pub search: String,
    pub replace: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockApplied {
    pub index: usize,
    pub search_bytes: u64,
    pub replace_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffResult {
    pub path: String,
    pub bytes_before: u64,
    pub bytes_after: u64,
    pub blocks_applied: Vec<BlockApplied>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirEntry {
    pub path: String,
    pub name: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListResult {
    pub path: String,
    pub entries: Vec<DirEntry>,
    pub truncated: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrepMatch {
    pub path: String,
    pub line: usize,
    pub text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GrepResult {
    pub pattern: String,
    pub scope: String,
    pub engine: String,
    pub truncated: bool,
    pub matches: Vec<GrepMatch>,
}
