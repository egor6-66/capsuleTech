#!/usr/bin/env node
/**
 * docs-as-data extractor (ADR 048 E1 — phase 1)
 *
 * Canon: docs/_meta/docs-system.md
 *
 * Walks docs/**​/*.md, extracts frontmatter + sections + audience-blocks +
 * wikilinks, emits typed registry to docs/.generated/registry.{ts,json}.
 *
 * Custom line-based parser (zero new deps). Code-fence aware.
 *
 * Exit codes:
 *   0 — success (warnings allowed)
 *   1 — errors (section-ID collision, unknown audience, frontmatter schema mismatch)
 */

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS_DIR = join(ROOT, 'docs');
const OUT_DIR = join(DOCS_DIR, '.generated');

const VALID_STATUS = new Set(['proposed', 'canon', 'documented', 'deprecated', 'superseded']);
const VALID_AUDIENCE = new Set(['agent', 'dev', 'user', 'report']);
const DEFAULT_AUDIENCE = ['agent', 'dev', 'user'];

const stats = {
  files: 0,
  sections: 0,
  warnings: [],
  errors: [],
};

const warn = (file, msg) => stats.warnings.push(`${file}: ${msg}`);
const error = (file, msg) => stats.errors.push(`${file}: ${msg}`);

// ─── walk ────────────────────────────────────────────────────────────────────

const walkMd = async (dir, out = []) => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      // Skip generated + hidden dirs
      if (e.name === '.generated' || e.name === '_build' || e.name.startsWith('.')) continue;
      await walkMd(p, out);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
};

// ─── slug ────────────────────────────────────────────────────────────────────

/** Strip leading `NN-` from a path segment (directories only). File basename keeps its prefix. */
const stripNumericPrefix = (seg) => seg.replace(/^\d+-/, '');

/** docs/01-architecture/adr/048-foo.md → architecture/adr/048-foo */
const filePathToSlug = (absPath) => {
  const rel = relative(DOCS_DIR, absPath).replace(/\\/g, '/');
  const noExt = rel.replace(/\.md$/, '');
  const parts = noExt.split('/');
  const fileBase = parts.pop();
  const stripped = parts.map(stripNumericPrefix);
  if (stripped.length === 0) return fileBase === 'index' || /^\d+-index$/.test(fileBase) ? 'index' : fileBase;
  return [...stripped, fileBase].join('/');
};

/** Heading → kebab-slug (fallback when {#id} not provided). */
const headingToSlug = (text) =>
  text
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'section';

// ─── parser ──────────────────────────────────────────────────────────────────

/** Parse YAML frontmatter (between leading --- / ---). Returns {meta, bodyStartLine}. */
const parseFrontmatter = (lines, file) => {
  if (lines[0] !== '---') return { meta: {}, bodyStartLine: 0 };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    warn(file, 'unterminated frontmatter');
    return { meta: {}, bodyStartLine: 0 };
  }
  const yaml = lines.slice(1, end).join('\n');
  return { meta: parseYaml(yaml, file), bodyStartLine: end + 1 };
};

/**
 * Minimal YAML parser — supports our docs shape:
 *   - scalar: `key: value`
 *   - flow-list: `key: [a, b, c]` or `key: [a]`
 *   - block-list: `key:\n  - a\n  - b`
 *   - quoted strings: `key: "value"` or `key: 'value'`
 * Comments (`# ...`) and nested objects NOT supported (not used in our docs).
 */
const parseYaml = (yaml, file) => {
  const out = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // block-list item under currentKey
    const blockItem = line.match(/^\s+-\s+(.*)$/);
    if (blockItem && currentKey) {
      if (!Array.isArray(out[currentKey])) out[currentKey] = [];
      out[currentKey].push(stripQuotes(blockItem[1].trim()));
      continue;
    }

    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) {
      warn(file, `unparseable frontmatter line: ${line}`);
      continue;
    }
    const [, key, rawValue] = kv;
    currentKey = key;
    const value = rawValue.trim();
    if (value === '') {
      // block-list follows on next lines
      out[key] = [];
      continue;
    }
    // flow-list
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      out[key] = inner === ''
        ? []
        : inner.split(',').map((x) => stripQuotes(x.trim())).filter(Boolean);
      currentKey = null;
      continue;
    }
    out[key] = stripQuotes(value);
    currentKey = null;
  }
  return out;
};

const stripQuotes = (s) => {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
};

/** Walk lines, return list of {level, heading, id, startLine, endLine}. Code-fence aware. */
const parseHeadings = (lines, bodyStartLine, file) => {
  const headings = [];
  let inFence = false;
  let fenceMarker = null;
  for (let i = bodyStartLine; i < lines.length; i++) {
    const line = lines[i];
    // code-fence toggle (``` or ~~~)
    const fenceMatch = line.match(/^(\s{0,3})(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (fenceMarker === marker) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }
    if (inFence) continue;

    // ATX heading: ^#{1,6} space text [{#id}]
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1].length;
    let text = m[2];
    let id = null;
    const idMatch = text.match(/\s*\{#([A-Za-z0-9_-]+)\}\s*$/);
    if (idMatch) {
      id = idMatch[1];
      text = text.slice(0, idMatch.index).trim();
    }
    headings.push({ level, heading: text, id, startLine: i });
  }
  // resolve endLine: next heading at same-or-shallower level, else EOF
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    let end = lines.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        end = headings[j].startLine;
        break;
      }
    }
    h.endLine = end;
  }
  return headings;
};

/** Extract section body lines (excluding the heading line itself) as raw markdown. */
const sliceBody = (lines, startLine, endLine) => lines.slice(startLine + 1, endLine).join('\n').trim();

/** Find audience blocks inside body (block + inline forms). Returns list of {audience, content, start, end}. */
const AUDIENCE_OPEN_RX = /<!--\s*audience:\s*([a-z, ]+)\s*-->/g;
const AUDIENCE_CLOSE_RX = /<!--\s*\/audience\s*-->/g;

const extractAudienceBlocks = (body, file) => {
  const blocks = [];
  const openings = [...body.matchAll(AUDIENCE_OPEN_RX)];
  const closings = [...body.matchAll(AUDIENCE_CLOSE_RX)];
  if (openings.length !== closings.length) {
    warn(file, `audience-block mismatch: ${openings.length} opens vs ${closings.length} closes`);
  }
  let closeIdx = 0;
  for (const open of openings) {
    const close = closings[closeIdx++];
    if (!close) break;
    const audience = open[1]
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    for (const a of audience) {
      if (!VALID_AUDIENCE.has(a)) {
        error(file, `unknown audience value: "${a}"`);
      }
    }
    blocks.push({
      audience,
      content: body.slice(open.index + open[0].length, close.index).trim(),
      start: open.index,
      end: close.index + close[0].length,
    });
  }
  return blocks;
};

/** Compute resolved audience for a section: union of block-level || frontmatter-level || system default. */
const resolveAudience = (audienceBlocks, frontmatterAudience) => {
  if (audienceBlocks.length === 0) {
    return frontmatterAudience && frontmatterAudience.length > 0
      ? [...frontmatterAudience]
      : [...DEFAULT_AUDIENCE];
  }
  // union of all block audiences
  const all = new Set();
  for (const b of audienceBlocks) for (const a of b.audience) all.add(a);
  return [...all].sort();
};

/** Find wikilinks [[target]], [[target|alias]], [[target#section]] in text.
 * Skips wikilinks inside inline-code (single-backtick) and fenced code blocks.
 */
const WIKILINK_RX = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|[^\]\n]+)?\]\]/g;

/** Strip fenced code blocks (``` or ~~~) and inline code (`...`) from text — leave whitespace
 * so character offsets don't shift drastically for downstream parsers. Used only for wikilink scan.
 */
const stripCodeForScan = (text) => {
  // strip fenced blocks first (lazy)
  let out = text.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  out = out.replace(/~~~[\s\S]*?~~~/g, (m) => ' '.repeat(m.length));
  // strip inline code
  out = out.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
  return out;
};

const extractWikilinks = (text) => {
  const scan = stripCodeForScan(text);
  const out = [];
  for (const m of scan.matchAll(WIKILINK_RX)) {
    const target = m[1].trim();
    const section = m[2] ? m[2].trim() : undefined;
    out.push(section ? `${target}#${section}` : target);
  }
  return [...new Set(out)];
};

// ─── per-file processing ─────────────────────────────────────────────────────

const FRONTMATTER_REQUIRED = ['status', 'tags', 'last_updated'];
const FRONTMATTER_OPTIONAL = new Set([
  'title',
  'type',
  'description',
  'audience',
  'date',
  'amended',
  'supersedes',
  'supersedes_partial',
  // tolerated but not part of canon (legacy fields)
  'name',
  'owner-agent',
  'group',
  'zone',
  'priority',
  'last-updated', // legacy underscore-less
]);

/** Derive `type` from path when frontmatter doesn't set it explicitly. */
const deriveType = (slug, meta) => {
  if (meta.type) return meta.type;
  if (slug.startsWith('architecture/adr/')) return 'adr';
  if (slug.startsWith('_meta/')) {
    const audience = meta.audience;
    if (Array.isArray(audience) ? audience.includes('claude') || audience.includes('agent') : audience === 'claude') {
      return 'ai-anchor';
    }
    return 'canon';
  }
  return 'guide';
};

/** Coerce frontmatter audience to array (we tolerate legacy `audience: claude` string). */
const normalizeAudience = (audience) => {
  if (!audience) return null;
  const list = Array.isArray(audience) ? audience : [audience];
  return list
    .map((a) => (a === 'claude' ? 'agent' : a))
    .filter((a) => VALID_AUDIENCE.has(a));
};

const validateMeta = (meta, slug, file) => {
  for (const req of FRONTMATTER_REQUIRED) {
    // tolerate legacy `last-updated` for `last_updated`
    if (req === 'last_updated' && meta['last-updated'] && !meta.last_updated) {
      meta.last_updated = meta['last-updated'];
    }
    if (meta[req] === undefined || meta[req] === null || meta[req] === '') {
      warn(file, `missing frontmatter field: ${req}`);
    }
  }
  if (meta.status && !VALID_STATUS.has(meta.status)) {
    warn(file, `non-canon status: "${meta.status}" (expected one of ${[...VALID_STATUS].join('|')})`);
  }
  // unknown fields warning (informational only)
  for (const k of Object.keys(meta)) {
    if (!FRONTMATTER_REQUIRED.includes(k) && !FRONTMATTER_OPTIONAL.has(k)) {
      // silent — not all docs are canon-strict; just don't surface this until E2 inventory pass
    }
  }
};

const processFile = async (absPath) => {
  stats.files++;
  const src = await readFile(absPath, 'utf8');
  const lines = src.split(/\r?\n/);
  const file = relative(ROOT, absPath).replace(/\\/g, '/');

  const { meta: rawMeta, bodyStartLine } = parseFrontmatter(lines, file);
  const slug = filePathToSlug(absPath);
  validateMeta(rawMeta, slug, file);

  const docAudience = normalizeAudience(rawMeta.audience);

  // Derive computed meta
  const meta = {
    ...rawMeta,
    type: deriveType(slug, rawMeta),
    audience: docAudience && docAudience.length > 0 ? docAudience : [...DEFAULT_AUDIENCE],
  };

  // Headings → sections (H2 + H3 only per canon §1.5)
  const headings = parseHeadings(lines, bodyStartLine, file);
  const sectionHeadings = headings.filter((h) => h.level === 2 || h.level === 3);

  // H1 → meta.title fallback
  if (!meta.title) {
    const h1 = headings.find((h) => h.level === 1);
    if (h1) meta.title = h1.heading;
  }

  const sections = {};
  const docWikilinks = new Set();
  const idCollisions = new Set();
  const usedIds = new Set();

  // Build parent map: each H3 belongs to most recent H2
  let currentH2Id = null;
  for (const h of sectionHeadings) {
    if (h.level === 2) currentH2Id = null; // reset, computed after id-resolution
  }

  // Pass 1 — resolve IDs (explicit {#id} OR auto-slug with collision suffix per canon §1.3)
  const resolved = sectionHeadings.map((h) => {
    if (h.id) {
      // Explicit ID — collision is an author bug, fail
      if (usedIds.has(h.id)) {
        idCollisions.add(h.id);
        error(file, `explicit section-id collision: "${h.id}" used multiple times`);
      }
      usedIds.add(h.id);
      return { ...h, resolvedId: h.id };
    }
    // Auto-slug — collision suffix per canon §1.3
    const base = headingToSlug(h.heading);
    let id = base;
    let suffix = 1;
    while (usedIds.has(id)) {
      suffix++;
      id = `${base}-${suffix}`;
    }
    usedIds.add(id);
    warn(
      file,
      `H${h.level} "${h.heading}" — no {#id}; using auto-slug "${id}"` +
        (suffix > 1 ? ` (collision suffix)` : ''),
    );
    return { ...h, resolvedId: id };
  });

  // Pass 2 — extract bodies + audience + wikilinks + parentId
  let lastH2 = null;
  for (const h of resolved) {
    if (h.level === 2) lastH2 = h.resolvedId;
    const parentId = h.level === 3 ? lastH2 : undefined;

    const body = sliceBody(lines, h.startLine, h.endLine);
    const audienceBlocks = extractAudienceBlocks(body, file);
    const audience = resolveAudience(audienceBlocks, docAudience);
    const wikilinks = extractWikilinks(body);
    for (const w of wikilinks) docWikilinks.add(w);

    sections[h.resolvedId] = {
      heading: h.heading,
      level: h.level,
      ...(parentId ? { parentId } : {}),
      body,
      audience,
      wikilinks,
    };
    stats.sections++;
  }

  return {
    slug,
    record: {
      meta,
      sections,
      wikilinks: [...docWikilinks].sort(),
    },
  };
};

// ─── emit ────────────────────────────────────────────────────────────────────

/** Serialize value as JS literal — supports string, number, boolean, array, object. */
const serialize = (val, indent = 0) => {
  const pad = '  '.repeat(indent);
  if (val === null) return 'null';
  if (typeof val === 'string') {
    // Use template literal for multi-line, otherwise regular string
    if (val.includes('\n')) {
      const escaped = val.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
      return '`' + escaped + '`';
    }
    return JSON.stringify(val);
  }
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const items = val.map((v) => serialize(v, indent + 1));
    // inline if all primitives + total length short
    const inline = items.join(', ');
    if (inline.length < 80 && !inline.includes('\n')) return `[${inline}]`;
    return `[\n${items.map((it) => `${pad}  ${it}`).join(',\n')},\n${pad}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const lines = keys.map((k) => `${pad}  ${JSON.stringify(k)}: ${serialize(val[k], indent + 1)}`);
    return `{\n${lines.join(',\n')},\n${pad}}`;
  }
  return JSON.stringify(val);
};

const emitRegistry = async (registry) => {
  await mkdir(OUT_DIR, { recursive: true });

  // ── TS ──
  const tsLines = [
    '// AUTO-GENERATED by docs/_build/extract.mjs — DO NOT EDIT BY HAND.',
    '// Canon: docs/_meta/docs-system.md',
    '// Regenerate via: pnpm docs:build',
    '',
    'export const docs = ' + serialize(registry, 0) + ' as const;',
    '',
    'export type DocSlug = keyof typeof docs;',
    'export type SectionSlug = `${DocSlug & string}#${string}`;',
    '',
  ];
  await writeFile(join(OUT_DIR, 'registry.ts'), tsLines.join('\n'), 'utf8');

  // ── JSON ──
  await writeFile(join(OUT_DIR, 'registry.json'), JSON.stringify(registry, null, 2) + '\n', 'utf8');
};

// ─── main ────────────────────────────────────────────────────────────────────

const main = async () => {
  const t0 = Date.now();
  console.log(`docs-extract: walking ${DOCS_DIR}`);

  const files = await walkMd(DOCS_DIR);
  files.sort();

  const registry = {};
  for (const f of files) {
    const { slug, record } = await processFile(f);
    if (registry[slug]) {
      error(f, `slug collision: "${slug}" already produced by another file`);
      continue;
    }
    registry[slug] = record;
  }

  // Wikilink resolution pass (warn, not error in v1 per canon §4.2)
  const resolveTarget = (link) => link.split('#')[0];
  const knownSlugs = new Set(Object.keys(registry));
  let unresolved = 0;
  for (const [slug, rec] of Object.entries(registry)) {
    for (const link of rec.wikilinks) {
      const target = resolveTarget(link);
      // Tolerate two common reference styles:
      //   "048-docs-as-data" → matches any slug ending with "/048-docs-as-data" OR equal
      //   "ADR 047" / freeform → ignored (likely human-text in wikilinks like [[name|alias]])
      const exact = knownSlugs.has(target);
      const suffix = !exact && [...knownSlugs].some((s) => s.endsWith('/' + target));
      if (!exact && !suffix) {
        unresolved++;
        // Warn (don't fail) until E2 inventory pass — per canon §4.2
        stats.warnings.push(`${slug}: unresolved wikilink "${link}"`);
      }
    }
  }

  await emitRegistry(registry);

  const elapsed = Date.now() - t0;
  console.log(`docs-extract: ${stats.files} files, ${stats.sections} sections, ${elapsed}ms`);
  console.log(`docs-extract: wrote docs/.generated/registry.{ts,json}`);

  if (stats.warnings.length > 0) {
    console.log(`docs-extract: ${stats.warnings.length} warnings (${unresolved} wikilinks)`);
    // Print up to first 20 warnings to surface trends without log-bombing CI
    for (const w of stats.warnings.slice(0, 20)) console.warn(`  ⚠ ${w}`);
    if (stats.warnings.length > 20) console.warn(`  ⚠ ... and ${stats.warnings.length - 20} more`);
  }

  if (stats.errors.length > 0) {
    console.error(`docs-extract: ${stats.errors.length} ERRORS`);
    for (const e of stats.errors) console.error(`  ✖ ${e}`);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error('docs-extract: fatal', err);
  process.exit(1);
});
