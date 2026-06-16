/**
 * Line-based markdown parser for docs-builder.
 * Port of docs/_build/extract.mjs parser functions (zero new deps).
 *
 * Canon: docs/_meta/docs-system.md §1, §2
 */

import type { IAudience, IAudienceBlock, IDocMeta, IDocSection } from './types.js';

// ─── constants ────────────────────────────────────────────────────────────────

const VALID_STATUS = new Set(['proposed', 'canon', 'documented', 'deprecated', 'superseded']);
const VALID_AUDIENCE = new Set<string>(['agent', 'dev', 'user', 'report']);
export const DEFAULT_AUDIENCE: IAudience[] = ['agent', 'dev', 'user'];

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
  // tolerated legacy fields
  'name',
  'owner-agent',
  'group',
  'zone',
  'priority',
  'last-updated',
]);

// ─── types ────────────────────────────────────────────────────────────────────

export interface IHeading {
  level: number;
  heading: string;
  id: string | null;
  startLine: number;
  endLine: number;
}

export interface IParseFrontmatterResult {
  meta: Record<string, unknown>;
  bodyStartLine: number;
}

export interface IParseSectionsResult {
  sections: Record<string, IDocSection>;
  warnings: string[];
  errors: string[];
  docWikilinks: string[];
}

export interface IValidateMetaResult {
  warnings: string[];
  errors: string[];
}

// ─── frontmatter ─────────────────────────────────────────────────────────────

const stripQuotes = (s: string): string => {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
};

/**
 * Minimal YAML parser — supports our docs shape:
 *   - scalar: `key: value`
 *   - flow-list: `key: [a, b, c]`
 *   - block-list: `key:\n  - a\n  - b`
 *   - quoted strings
 */
export const parseYaml = (yaml: string, file: string): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  const warnings: string[] = [];

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    // block-list item under currentKey
    const blockItem = line.match(/^\s+-\s+(.*)$/);
    if (blockItem && currentKey) {
      if (!Array.isArray(out[currentKey])) out[currentKey] = [];
      (out[currentKey] as string[]).push(stripQuotes(blockItem[1].trim()));
      continue;
    }

    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) {
      warnings.push(`${file}: unparseable frontmatter line: ${line}`);
      continue;
    }
    const [, key, rawValue] = kv;
    currentKey = key;
    const value = rawValue.trim();
    if (value === '') {
      out[key] = [];
      continue;
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      out[key] =
        inner === ''
          ? []
          : inner
              .split(',')
              .map((x) => stripQuotes(x.trim()))
              .filter(Boolean);
      currentKey = null;
      continue;
    }
    out[key] = stripQuotes(value);
    currentKey = null;
  }

  return out;
};

/**
 * Parse YAML frontmatter (between leading `---` / `---`).
 * Returns `{ meta, bodyStartLine }`.
 */
export const parseFrontmatter = (
  lines: string[],
  file: string,
): IParseFrontmatterResult & { warnings: string[] } => {
  if (lines[0] !== '---') return { meta: {}, bodyStartLine: 0, warnings: [] };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    return { meta: {}, bodyStartLine: 0, warnings: [`${file}: unterminated frontmatter`] };
  }
  const yaml = lines.slice(1, end).join('\n');
  const meta = parseYaml(yaml, file);
  return { meta, bodyStartLine: end + 1, warnings: [] };
};

// ─── validation ───────────────────────────────────────────────────────────────

/** Coerce frontmatter audience to array (tolerate legacy `audience: claude` string). */
export const normalizeAudience = (audience: unknown): IAudience[] | null => {
  if (!audience) return null;
  const list = Array.isArray(audience) ? (audience as string[]) : [audience as string];
  return list
    .map((a) => (a === 'claude' ? 'agent' : a))
    .filter((a) => VALID_AUDIENCE.has(a)) as IAudience[];
};

/** Derive `type` from slug when frontmatter doesn't set it. */
export const deriveType = (slug: string, meta: Record<string, unknown>): string => {
  if (meta.type) return meta.type as string;
  if (slug.startsWith('architecture/adr/')) return 'adr';
  if (slug.startsWith('_meta/')) {
    const audience = meta.audience;
    const list = Array.isArray(audience) ? (audience as string[]) : [audience as string];
    if (list.includes('claude') || list.includes('agent')) return 'ai-anchor';
    return 'canon';
  }
  return 'guide';
};

/**
 * Validate required frontmatter fields. Returns warnings and errors.
 * Mutates meta to handle legacy `last-updated` → `last_updated`.
 */
export const validateMeta = (meta: Record<string, unknown>, file: string): IValidateMetaResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const req of FRONTMATTER_REQUIRED) {
    // tolerate legacy `last-updated` for `last_updated`
    if (req === 'last_updated' && meta['last-updated'] && !meta.last_updated) {
      meta.last_updated = meta['last-updated'];
    }
    if (meta[req] === undefined || meta[req] === null || meta[req] === '') {
      warnings.push(`${file}: missing frontmatter field: ${req}`);
    }
  }

  if (meta.status && !VALID_STATUS.has(meta.status as string)) {
    warnings.push(
      `${file}: non-canon status: "${meta.status}" (expected one of ${[...VALID_STATUS].join('|')})`,
    );
  }

  return { warnings, errors };
};

// ─── headings ────────────────────────────────────────────────────────────────

/** Heading → kebab-slug (fallback when {#id} not provided). */
export const headingToSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'section';

/** Walk lines, return list of headings. Code-fence aware. */
export const parseHeadings = (lines: string[], bodyStartLine: number): IHeading[] => {
  const headings: IHeading[] = [];
  let inFence = false;
  let fenceMarker: string | null = null;

  for (let i = bodyStartLine; i < lines.length; i++) {
    const line = lines[i];
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

    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1].length;
    let text = m[2];
    let id: string | null = null;
    const idMatch = text.match(/\s*\{#([A-Za-z0-9_-]+)\}\s*$/);
    if (idMatch) {
      id = idMatch[1];
      text = text.slice(0, idMatch.index!).trim();
    }
    headings.push({ level, heading: text, id, startLine: i, endLine: lines.length });
  }

  // resolve endLine
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

// ─── audience blocks ──────────────────────────────────────────────────────────

const AUDIENCE_OPEN_RX = /<!--\s*audience:\s*([a-z, ]+)\s*-->/g;
const AUDIENCE_CLOSE_RX = /<!--\s*\/audience\s*-->/g;

/**
 * Find audience blocks inside body (block form).
 * Returns list of blocks + any warnings/errors.
 */
export const parseAudienceBlocks = (
  body: string,
  file: string,
): { blocks: IAudienceBlock[]; warnings: string[]; errors: string[] } => {
  const blocks: IAudienceBlock[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const openings = [...body.matchAll(AUDIENCE_OPEN_RX)];
  const closings = [...body.matchAll(AUDIENCE_CLOSE_RX)];

  if (openings.length !== closings.length) {
    warnings.push(
      `${file}: audience-block mismatch: ${openings.length} opens vs ${closings.length} closes`,
    );
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
        errors.push(`${file}: unknown audience value: "${a}"`);
      }
    }

    blocks.push({
      audience: audience as IAudience[],
      content: body.slice(open.index! + open[0].length, close.index!).trim(),
      start: open.index!,
      end: close.index! + close[0].length,
    });
  }

  return { blocks, warnings, errors };
};

/** Compute resolved audience for a section. */
export const resolveAudience = (
  audienceBlocks: IAudienceBlock[],
  frontmatterAudience: IAudience[] | null,
): IAudience[] => {
  if (audienceBlocks.length === 0) {
    return frontmatterAudience && frontmatterAudience.length > 0
      ? [...frontmatterAudience]
      : [...DEFAULT_AUDIENCE];
  }
  const all = new Set<IAudience>();
  for (const b of audienceBlocks) for (const a of b.audience) all.add(a);
  return [...all].sort() as IAudience[];
};

// ─── wikilinks ────────────────────────────────────────────────────────────────

const WIKILINK_RX = /\[\[([^\]|#\n]+)(?:#([^\]|\n]+))?(?:\|[^\]\n]+)?\]\]/g;

/** Strip fenced code blocks and inline code — leave whitespace so offsets don't shift. */
const stripCodeForScan = (text: string): string => {
  let out = text.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  out = out.replace(/~~~[\s\S]*?~~~/g, (m) => ' '.repeat(m.length));
  out = out.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
  return out;
};

/**
 * Find wikilinks [[target]], [[target|alias]], [[target#section]] in text.
 * Skips wikilinks inside inline-code and fenced code blocks.
 */
export const extractWikilinks = (text: string): string[] => {
  const scan = stripCodeForScan(text);
  const out: string[] = [];
  for (const m of scan.matchAll(WIKILINK_RX)) {
    const target = m[1].trim();
    const section = m[2] ? m[2].trim() : undefined;
    out.push(section ? `${target}#${section}` : target);
  }
  return [...new Set(out)];
};

// ─── sections ────────────────────────────────────────────────────────────────

/** Extract section body (excluding heading line). */
const sliceBody = (lines: string[], startLine: number, endLine: number): string =>
  lines
    .slice(startLine + 1, endLine)
    .join('\n')
    .trim();

/**
 * Parse all H2/H3 sections from a document.
 * Returns sections map + accumulated warnings/errors + doc-level wikilinks.
 */
export const parseSections = (
  lines: string[],
  bodyStartLine: number,
  file: string,
  frontmatterAudience: IAudience[] | null,
): IParseSectionsResult => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const sections: Record<string, IDocSection> = {};
  const docWikilinks = new Set<string>();

  const headings = parseHeadings(lines, bodyStartLine);
  const sectionHeadings = headings.filter((h) => h.level === 2 || h.level === 3);

  // Pass 1 — resolve IDs
  const usedIds = new Set<string>();
  const resolved = sectionHeadings.map((h) => {
    if (h.id) {
      if (usedIds.has(h.id)) {
        errors.push(`${file}: explicit section-id collision: "${h.id}" used multiple times`);
      }
      usedIds.add(h.id);
      return { ...h, resolvedId: h.id };
    }
    const base = headingToSlug(h.heading);
    let id = base;
    let suffix = 1;
    while (usedIds.has(id)) {
      suffix++;
      id = `${base}-${suffix}`;
    }
    usedIds.add(id);
    warnings.push(
      `${file}: H${h.level} "${h.heading}" — no {#id}; using auto-slug "${id}"` +
        (suffix > 1 ? ' (collision suffix)' : ''),
    );
    return { ...h, resolvedId: id };
  });

  // Pass 2 — extract bodies + audience + wikilinks
  let lastH2: string | null = null;
  for (const h of resolved) {
    if (h.level === 2) lastH2 = h.resolvedId;
    const parentId = h.level === 3 ? (lastH2 ?? undefined) : undefined;

    const body = sliceBody(lines, h.startLine, h.endLine);
    const { blocks: audienceBlocks, warnings: aw, errors: ae } = parseAudienceBlocks(body, file);
    warnings.push(...aw);
    errors.push(...ae);

    const audience = resolveAudience(audienceBlocks, frontmatterAudience);
    const wikilinks = extractWikilinks(body);
    for (const w of wikilinks) docWikilinks.add(w);

    const section: IDocSection = {
      heading: h.heading,
      level: h.level as 2 | 3,
      ...(parentId !== undefined ? { parentId } : {}),
      body,
      audience,
      wikilinks,
    };
    sections[h.resolvedId] = section;
  }

  return { sections, warnings, errors, docWikilinks: [...docWikilinks] };
};
