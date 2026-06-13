#!/usr/bin/env node
/**
 * Explicit-mapping backfill for `status` + `tags` (ADR 048 E2 cleanup).
 *
 * Adds missing fields per the mappings below. Idempotent:
 *   - skips a field if the file already has it
 *   - appends at the end of the frontmatter block (preserves existing key order)
 *
 * Run from repo root: `node docs/_build/backfill-status-tags.mjs`
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** path (relative to repo root) → { status?, tags? } */
const MAPPING = {
  // status — 7 docs
  'docs/_archive/agent-prompts/actions/Init.md':                                  { status: 'deprecated', tags: ['archive', 'legacy-copilot'] },
  'docs/_archive/copilot-chats/copilot-conversations/Obsidian_Vault_Initialization_Setup@20260509_170842.md':
                                                                                    { status: 'deprecated' },
  'docs/_meta/design-tokens.md':                                                  { status: 'documented' },
  'docs/_meta/handoff-2026-06-05-events.md':                                      { status: 'documented' },
  'docs/_meta/handoff-2026-06-05.md':                                             { status: 'documented' },
  'docs/_meta/shape-v2-and-table.md':                                             { status: 'documented' },
  'docs/_meta/web-style.md':                                                      { status: 'canon' },

  // tags-only — 25 docs (Init.md above already gets both)
  'docs/_meta/anti-patterns.md':                                                  { tags: ['meta', 'anti-patterns'] },
  'docs/_meta/architect-routing.md':                                              { tags: ['meta', 'routing'] },
  'docs/_meta/briefs/owner-cli-agent-interface.md':                               { tags: ['brief', 'owner-cli'] },
  'docs/_meta/briefs/owner-web-router-capsule-outlet.md':                         { tags: ['brief', 'owner-web-router', 'C1'] },
  'docs/_meta/briefs/owner-web-style-C3-vt-css-enumerate.md':                     { tags: ['brief', 'owner-web-style', 'C3'] },
  'docs/_meta/briefs/owner-web-ui-B6-light-placeholders.md':                      { tags: ['brief', 'owner-web-ui', 'B6'] },
  'docs/_meta/briefs/owner-web-ui-W4-bundle-size-manifest.md':                    { tags: ['brief', 'owner-web-ui', 'W4'] },
  'docs/_meta/briefs/owner-web-ui-W4-phase2-bundle-assertions.md':                { tags: ['brief', 'owner-web-ui', 'W4'] },
  'docs/_meta/dep-management-plan.md':                                            { tags: ['meta', 'deps'] },
  'docs/_meta/docs-consumer-integration.md':                                      { tags: ['meta', 'docs-as-data'] },
  'docs/_meta/docs-system.md':                                                    { tags: ['meta', 'docs-as-data', 'canon'] },
  'docs/_meta/owner-agent-canon.md':                                              { tags: ['meta', 'agents', 'canon'] },
  'docs/_meta/OWNERSHIP-template.md':                                             { tags: ['meta', 'template'] },
  'docs/_meta/readme-template.md':                                                { tags: ['meta', 'template'] },
  'docs/_meta/test-zone-workflow.md':                                             { tags: ['meta', 'testing'] },
  'docs/_meta/web-audit-cross-imports.md':                                        { tags: ['meta', 'web-audit'] },
  'docs/_meta/web-audit.md':                                                      { tags: ['meta', 'web-audit'] },
  'docs/_meta/web-rework-plan.md':                                                { tags: ['meta', 'web-rework', 'plan'] },
  'docs/_meta/web-zones/boost.md':                                                { tags: ['meta', 'web-zones', 'boost'] },
  'docs/_meta/web-zones/domain.md':                                               { tags: ['meta', 'web-zones', 'domain'] },
  'docs/_meta/web-zones/index.md':                                                { tags: ['meta', 'web-zones'] },
  'docs/_meta/web-zones/kit.md':                                                  { tags: ['meta', 'web-zones', 'kit'] },
  'docs/_meta/web-zones/runtime.md':                                              { tags: ['meta', 'web-zones', 'runtime'] },
  'docs/_meta/web-zones/studio.md':                                               { tags: ['meta', 'web-zones', 'studio'] },
};

const splitFrontmatter = (src) => {
  const lines = src.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;
  return {
    fmLines: lines.slice(1, end),
    bodyLines: lines.slice(end + 1),
    eol: src.includes('\r\n') ? '\r\n' : '\n',
  };
};

const hasField = (fmLines, key) =>
  fmLines.some((ln) => new RegExp(`^${key}\\s*:`).test(ln));

const formatFlowList = (arr) => `[${arr.join(', ')}]`;

const stats = { processed: 0, added: 0, skippedAlready: 0, missingFile: 0 };

for (const [relPath, fields] of Object.entries(MAPPING)) {
  stats.processed++;
  const abs = join(ROOT, relPath);
  let src;
  try {
    src = await readFile(abs, 'utf8');
  } catch {
    console.log(`  ! missing: ${relPath}`);
    stats.missingFile++;
    continue;
  }
  const parts = splitFrontmatter(src);
  if (!parts) {
    console.log(`  ! no frontmatter: ${relPath}`);
    continue;
  }
  const { fmLines, bodyLines, eol } = parts;
  const additions = [];
  if (fields.status && !hasField(fmLines, 'status')) {
    additions.push(`status: ${fields.status}`);
  }
  if (fields.tags && !hasField(fmLines, 'tags')) {
    additions.push(`tags: ${formatFlowList(fields.tags)}`);
  }
  if (additions.length === 0) {
    stats.skippedAlready++;
    continue;
  }
  const newFm = [...fmLines, ...additions];
  const out = ['---', ...newFm, '---', ...bodyLines].join(eol);
  await writeFile(abs, out, 'utf8');
  stats.added += additions.length;
  console.log(`  + ${relPath}  (${additions.join('; ')})`);
}

console.log('');
console.log(`Processed:        ${stats.processed}`);
console.log(`Fields added:     ${stats.added}`);
console.log(`Already had:      ${stats.skippedAlready}`);
console.log(`Missing files:    ${stats.missingFile}`);
