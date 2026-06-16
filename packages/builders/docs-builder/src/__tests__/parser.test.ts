import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIENCE,
  extractWikilinks,
  headingToSlug,
  normalizeAudience,
  parseAudienceBlocks,
  parseFrontmatter,
  parseHeadings,
  parseSections,
  parseYaml,
  resolveAudience,
  validateMeta,
} from '../parser.js';

// ─── parseFrontmatter ─────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
  it('parses valid frontmatter', () => {
    const lines = [
      '---',
      'title: Hello World',
      'status: canon',
      'tags: [a, b]',
      'last_updated: 2026-01-01',
      '---',
      '',
      '# Body',
    ];
    const { meta, bodyStartLine, warnings } = parseFrontmatter(lines, 'test.md');
    expect(meta.title).toBe('Hello World');
    expect(meta.status).toBe('canon');
    expect(meta.tags).toEqual(['a', 'b']);
    expect(meta.last_updated).toBe('2026-01-01');
    expect(bodyStartLine).toBe(6);
    expect(warnings).toHaveLength(0);
  });

  it('returns empty meta and 0 bodyStartLine when no frontmatter', () => {
    const lines = ['# Just a heading', '', 'Some content'];
    const { meta, bodyStartLine, warnings } = parseFrontmatter(lines, 'test.md');
    expect(meta).toEqual({});
    expect(bodyStartLine).toBe(0);
    expect(warnings).toHaveLength(0);
  });

  it('warns on unterminated frontmatter', () => {
    const lines = ['---', 'title: Broken', '# No closing'];
    const { meta, bodyStartLine, warnings } = parseFrontmatter(lines, 'test.md');
    expect(meta).toEqual({});
    expect(bodyStartLine).toBe(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('unterminated frontmatter');
  });

  it('parses block-list', () => {
    const lines = ['---', 'tags:', '  - foo', '  - bar', '---', ''];
    const { meta } = parseFrontmatter(lines, 'test.md');
    expect(meta.tags).toEqual(['foo', 'bar']);
  });

  it('parses quoted strings', () => {
    const lines = ['---', 'title: "Quoted title"', "description: 'single quotes'", '---'];
    const { meta } = parseFrontmatter(lines, 'test.md');
    expect(meta.title).toBe('Quoted title');
    expect(meta.description).toBe('single quotes');
  });
});

// ─── validateMeta ─────────────────────────────────────────────────────────────

describe('validateMeta', () => {
  it('warns on missing required fields', () => {
    const meta: Record<string, unknown> = {};
    const { warnings } = validateMeta(meta, 'test.md');
    expect(warnings.some((w) => w.includes('missing frontmatter field: status'))).toBe(true);
    expect(warnings.some((w) => w.includes('missing frontmatter field: tags'))).toBe(true);
    expect(warnings.some((w) => w.includes('missing frontmatter field: last_updated'))).toBe(true);
  });

  it('warns on non-canon status', () => {
    const meta: Record<string, unknown> = {
      status: 'unknown',
      tags: ['x'],
      last_updated: '2026-01-01',
    };
    const { warnings } = validateMeta(meta, 'test.md');
    expect(warnings.some((w) => w.includes('non-canon status'))).toBe(true);
  });

  it('no warnings for valid meta', () => {
    const meta: Record<string, unknown> = {
      status: 'canon',
      tags: ['a'],
      last_updated: '2026-01-01',
    };
    const { warnings } = validateMeta(meta, 'test.md');
    expect(warnings).toHaveLength(0);
  });

  it('migrates legacy last-updated to last_updated', () => {
    const meta: Record<string, unknown> = {
      status: 'canon',
      tags: ['a'],
      'last-updated': '2026-01-01',
    };
    validateMeta(meta, 'test.md');
    expect(meta.last_updated).toBe('2026-01-01');
  });
});

// ─── parseHeadings ────────────────────────────────────────────────────────────

describe('parseHeadings', () => {
  it('parses H1, H2, H3 headings', () => {
    const lines = [
      '# Doc Title',
      '',
      '## Section One',
      'some content',
      '### Sub Section',
      'sub content',
      '## Section Two',
    ];
    const headings = parseHeadings(lines, 0);
    expect(headings).toHaveLength(4);
    expect(headings[0]).toMatchObject({ level: 1, heading: 'Doc Title' });
    expect(headings[1]).toMatchObject({ level: 2, heading: 'Section One' });
    expect(headings[2]).toMatchObject({ level: 3, heading: 'Sub Section' });
    expect(headings[3]).toMatchObject({ level: 2, heading: 'Section Two' });
  });

  it('extracts explicit {#id}', () => {
    const lines = ['## My Section {#my-id}', 'content'];
    const headings = parseHeadings(lines, 0);
    expect(headings[0].id).toBe('my-id');
    expect(headings[0].heading).toBe('My Section');
  });

  it('does not parse headings inside code fence', () => {
    const lines = ['## Real Heading', '```', '## Not a Heading', '```', '## Another Real Heading'];
    const headings = parseHeadings(lines, 0);
    expect(headings).toHaveLength(2);
    expect(headings[0].heading).toBe('Real Heading');
    expect(headings[1].heading).toBe('Another Real Heading');
  });

  it('does not parse headings inside tilde fence', () => {
    const lines = ['## Real', '~~~', '## Inside Tilde', '~~~', '## After'];
    const headings = parseHeadings(lines, 0);
    expect(headings).toHaveLength(2);
  });

  it('resolves endLine correctly', () => {
    const lines = [
      '## Section A', // 0
      'content a', // 1
      '### Sub', // 2
      'sub', // 3
      '## Section B', // 4
    ];
    const headings = parseHeadings(lines, 0);
    // Section A ends at Section B (line 4)
    expect(headings[0].endLine).toBe(4);
    // Sub ends at Section B (level <= H3 is false, but H2 <= H3 is true... wait level 2 <= 3? No: 2 <= 3 is true)
    // Actually: next heading with level <= h.level. Sub is H3, next is H2 (level 2 <= 3) → ends at line 4
    expect(headings[1].endLine).toBe(4);
    // Section B: no following headings → EOF
    expect(headings[2].endLine).toBe(lines.length);
  });

  it('respects bodyStartLine offset', () => {
    const lines = ['frontmatter-line', '---', '## Real Section'];
    const headings = parseHeadings(lines, 2);
    expect(headings).toHaveLength(1);
    expect(headings[0].heading).toBe('Real Section');
  });
});

// ─── parseAudienceBlocks ──────────────────────────────────────────────────────

describe('parseAudienceBlocks', () => {
  it('parses a simple audience block', () => {
    const body = '<!-- audience: agent, dev -->\nsome content\n<!-- /audience -->';
    const { blocks, warnings, errors } = parseAudienceBlocks(body, 'test.md');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].audience).toEqual(['agent', 'dev']);
    expect(blocks[0].content).toBe('some content');
    expect(warnings).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('warns on mismatched open/close counts', () => {
    const body = '<!-- audience: agent -->extra open';
    const { warnings } = parseAudienceBlocks(body, 'test.md');
    expect(warnings.some((w) => w.includes('audience-block mismatch'))).toBe(true);
  });

  it('errors on unknown audience value', () => {
    const body = '<!-- audience: alien -->\ncontent\n<!-- /audience -->';
    const { errors } = parseAudienceBlocks(body, 'test.md');
    expect(errors.some((e) => e.includes('unknown audience value: "alien"'))).toBe(true);
  });

  it('returns empty for body without audience blocks', () => {
    const body = 'Just plain content without any audience markers.';
    const { blocks } = parseAudienceBlocks(body, 'test.md');
    expect(blocks).toHaveLength(0);
  });
});

// ─── resolveAudience ──────────────────────────────────────────────────────────

describe('resolveAudience', () => {
  it('returns DEFAULT_AUDIENCE when no blocks and no frontmatter audience', () => {
    const result = resolveAudience([], null);
    expect(result).toEqual(DEFAULT_AUDIENCE);
  });

  it('returns frontmatter audience when no blocks', () => {
    const result = resolveAudience([], ['agent']);
    expect(result).toEqual(['agent']);
  });

  it('returns union of block audiences when blocks present', () => {
    const blocks = [
      { audience: ['agent' as const, 'dev' as const], content: 'c1', start: 0, end: 10 },
      { audience: ['user' as const], content: 'c2', start: 20, end: 30 },
    ];
    const result = resolveAudience(blocks, null);
    // sorted
    expect(result.sort()).toEqual(['agent', 'dev', 'user'].sort());
  });
});

// ─── extractWikilinks ─────────────────────────────────────────────────────────

describe('extractWikilinks', () => {
  it('extracts simple [[Target]] wikilinks', () => {
    const text = 'See [[ADR 048]] and [[another-doc]].';
    const links = extractWikilinks(text);
    expect(links).toContain('ADR 048');
    expect(links).toContain('another-doc');
  });

  it('extracts [[target|alias]] and strips alias', () => {
    const text = '[[048-docs-as-data|ADR 048]]';
    const links = extractWikilinks(text);
    expect(links).toContain('048-docs-as-data');
    expect(links).not.toContain('ADR 048');
  });

  it('extracts [[target#section]]', () => {
    const text = '[[docs-system#section-id]]';
    const links = extractWikilinks(text);
    expect(links).toContain('docs-system#section-id');
  });

  it('skips wikilinks inside inline code', () => {
    const text = 'Use `[[not-a-link]]` to do things.';
    const links = extractWikilinks(text);
    expect(links).not.toContain('not-a-link');
  });

  it('skips wikilinks inside fenced code block', () => {
    const text = '```\n[[inside-fence]]\n```\n[[outside]]';
    const links = extractWikilinks(text);
    expect(links).not.toContain('inside-fence');
    expect(links).toContain('outside');
  });

  it('deduplicates links', () => {
    const text = '[[dup]] and [[dup]] again';
    const links = extractWikilinks(text);
    expect(links.filter((l) => l === 'dup')).toHaveLength(1);
  });
});

// ─── headingToSlug ────────────────────────────────────────────────────────────

describe('headingToSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(headingToSlug('My Section')).toBe('my-section');
  });

  it('removes em-dash and en-dash', () => {
    expect(headingToSlug('A — B')).toBe('a-b');
    expect(headingToSlug('A – B')).toBe('a-b');
  });

  it('removes punctuation but keeps letters and numbers', () => {
    expect(headingToSlug('Section 1.2.3!')).toBe('section-123');
  });

  it('collapses multiple hyphens', () => {
    expect(headingToSlug('A   B')).toBe('a-b');
  });

  it('returns "section" for empty string', () => {
    expect(headingToSlug('!!!')).toBe('section');
  });
});

// ─── parseSections ────────────────────────────────────────────────────────────

describe('parseSections', () => {
  it('only includes H2 and H3 sections', () => {
    const lines = [
      '---',
      'status: canon',
      '---',
      '# Title',
      '## H2 Section',
      'body',
      '### H3 Section',
      'sub body',
      '#### H4 is inline content',
      'h4 body',
    ];
    const { sections } = parseSections(lines, 3, 'test.md', null);
    const levels = Object.values(sections).map((s) => s.level);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
    expect(levels).not.toContain(4);
  });

  it('uses explicit {#id} as section key', () => {
    const lines = ['## My Section {#my-id}', 'body text'];
    const { sections } = parseSections(lines, 0, 'test.md', null);
    expect(sections['my-id']).toBeDefined();
    expect(sections['my-id'].heading).toBe('My Section');
  });

  it('uses auto-slug when {#id} missing and emits warning', () => {
    const lines = ['## No ID Here', 'body'];
    const { sections, warnings } = parseSections(lines, 0, 'test.md', null);
    expect(sections['no-id-here']).toBeDefined();
    expect(warnings.some((w) => w.includes('no {#id}'))).toBe(true);
  });

  it('adds collision suffix to auto-slug', () => {
    const lines = ['## Dup', 'a', '## Dup', 'b'];
    const { sections, warnings } = parseSections(lines, 0, 'test.md', null);
    expect(sections['dup']).toBeDefined();
    expect(sections['dup-2']).toBeDefined();
    expect(warnings.some((w) => w.includes('collision suffix'))).toBe(true);
  });

  it('errors on explicit {#id} collision', () => {
    const lines = ['## A {#same-id}', 'a', '## B {#same-id}', 'b'];
    const { errors } = parseSections(lines, 0, 'test.md', null);
    expect(errors.some((e) => e.includes('explicit section-id collision'))).toBe(true);
  });

  it('sets parentId on H3 sections', () => {
    const lines = ['## Parent {#parent}', 'parent body', '### Child {#child}', 'child body'];
    const { sections } = parseSections(lines, 0, 'test.md', null);
    expect(sections['child'].parentId).toBe('parent');
    expect(sections['parent'].parentId).toBeUndefined();
  });

  it('is code-fence aware in section bodies', () => {
    const lines = ['## Section {#sec}', '```', '## Not a heading', '```', 'real content'];
    const { sections } = parseSections(lines, 0, 'test.md', null);
    expect(Object.keys(sections)).toHaveLength(1);
    expect(sections['sec']).toBeDefined();
  });
});
