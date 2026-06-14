#!/usr/bin/env node
/**
 * compliance-inventory.mjs
 * ────────────────────────
 * Прогон `@capsuletech/compliance` по всем `apps/STAR/src/STARSTAR.{ts,tsx}` и
 * выдача markdown-отчёта с группировкой по kind'у, app'у и файлу. Используется
 * для **L0-inventory** фазы canon-enforcement (Phase L) — собрать все warn-mode
 * нарушения новых правил (`native-jsx` / `native-js` / `raw-class` /
 * `app-package-import`) до flip warn → error.
 *
 * Запуск:
 *   node scripts/compliance-inventory.mjs            — все apps, отчёт в stdout
 *   node scripts/compliance-inventory.mjs --md       — сохранить в
 *                                                    docs/_meta/compliance-inventory-YYYY-MM-DD.md
 *   node scripts/compliance-inventory.mjs --kind=native-jsx
 *                                                  — фильтр по kind'у
 *   node scripts/compliance-inventory.mjs --app=playground
 *                                                  — только один app
 *   node scripts/compliance-inventory.mjs --check   — CI gate mode: exit non-zero
 *                                                    if any severity:'error' violations
 *                                                    remain after allowlist filtering.
 *                                                    See docs/_meta/compliance-allowlist.json.
 *
 * Поведение:
 *  1. Импортит `check` из локально установленного `@capsuletech/compliance`
 *     (pnpm workspace — будет та версия что лежит в node_modules после
 *     `pnpm install` или прямой workspace symlink).
 *  2. Рекурсивно ходит по `apps/STAR/src/STARSTAR.{ts,tsx}`, исключая
 *     `node_modules`, `dist`, `.capsule`.
 *  3. Для каждого файла вызывает `check(absPath, code)` — это та же функция
 *     что и vite plugin. Возвращает массив `IViolation`.
 *  4. Группирует, печатает summary + детали.
 *
 * NB: compliance работает на исходниках. `.capsule/` (auto-gen) пропускается
 * самим `classify`. Тесты (`*.spec.ts` / `*.test.ts`) пропускаются `classify`
 * с layer='test' (relaxed mode).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(process.cwd());
const ARGS = process.argv.slice(2);
const flag = (name) => ARGS.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const flagValue = (name) => {
  const f = flag(name);
  if (!f) return null;
  const eq = f.indexOf('=');
  return eq === -1 ? true : f.slice(eq + 1);
};

const SAVE_MD = !!flag('md');
const KIND_FILTER = flagValue('kind');
const APP_FILTER = flagValue('app');
/**
 * --check: CI gate mode.
 * Exits non-zero if there are severity:'error' violations outside the allowlist.
 */
const CHECK_MODE = !!flag('check');

// ─── Allowlist (Variant A) ────────────────────────────────────────────────────
// Known structural violations during the cleanup transition.
// CI ignores violations from these path+kind pairs. App cleanup PRs remove entries.
const ALLOWLIST_PATH = resolve(ROOT, 'docs/_meta/compliance-allowlist.json');
/** @type {Map<string, Set<string>>} relPath → Set<kind> */
const buildAllowlistMap = () => {
  const map = new Map();
  if (!existsSync(ALLOWLIST_PATH)) return map;
  try {
    const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
    for (const entry of raw.entries ?? []) {
      const relPath = entry.path.replaceAll('\\', '/');
      if (!map.has(relPath)) map.set(relPath, new Set());
      for (const kind of entry.kinds ?? []) {
        map.get(relPath).add(kind);
      }
    }
  } catch (e) {
    console.error(`[compliance:check] failed to load allowlist: ${e.message}`);
  }
  return map;
};
const ALLOWLIST = buildAllowlistMap();

const today = new Date().toISOString().slice(0, 10);
const OUT_PATH = resolve(ROOT, 'docs/_meta', `compliance-inventory-${today}.md`);

const COMPLIANCE_DIST = resolve(ROOT, 'packages/builders/compliance/dist/index.mjs');
if (!existsSync(COMPLIANCE_DIST)) {
  console.error(
    `compliance dist not found at ${relative(ROOT, COMPLIANCE_DIST)}\n` +
      `run \`pnpm --filter @capsuletech/compliance build\` first`,
  );
  process.exit(1);
}
const { check } = await import(pathToFileURL(COMPLIANCE_DIST).href);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.capsule', '.next', '.nuxt', 'build']);
const SOURCE_RX = /\.(ts|tsx)$/;
const TEST_RX = /\.(spec|test)\.(ts|tsx)$/;

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && SOURCE_RX.test(entry.name) && !TEST_RX.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const appsDir = resolve(ROOT, 'apps');
const appNames = readdirSync(appsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
  .map((e) => e.name)
  .filter((name) => !APP_FILTER || name === APP_FILTER);

const allViolations = [];
let scannedCount = 0;

for (const app of appNames) {
  const srcDir = join(appsDir, app, 'src');
  if (!existsSync(srcDir)) continue;
  const files = walk(srcDir);
  scannedCount += files.length;
  for (const file of files) {
    let code;
    try {
      code = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const violations = check(file, code);
    for (const v of violations) {
      if (KIND_FILTER && v.kind !== KIND_FILTER) continue;
      allViolations.push({ ...v, app, relFile: relative(ROOT, file).replaceAll('\\', '/') });
    }
  }
}

const byKind = {};
const byApp = {};
const byFile = {};
for (const v of allViolations) {
  byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;
  byApp[v.app] = (byApp[v.app] ?? 0) + 1;
  byFile[v.relFile] = (byFile[v.relFile] ?? 0) + 1;
}

const NEW_KINDS = new Set(['native-jsx', 'native-js', 'raw-class', 'app-package-import']);

const lines = [];
const push = (s = '') => lines.push(s);

push(`# Compliance inventory — ${today}`);
push('');
push(`Scanned: ${scannedCount} files in ${appNames.length} app(s) (${appNames.join(', ')})`);
push(`Total violations: **${allViolations.length}**`);
if (KIND_FILTER) push(`Filter: kind=\`${KIND_FILTER}\``);
if (APP_FILTER) push(`Filter: app=\`${APP_FILTER}\``);
push('');

push('## Summary by kind');
push('');
push('| Kind | Count | Phase L? |');
push('|---|---|---|');
for (const kind of Object.keys(byKind).sort((a, b) => byKind[b] - byKind[a])) {
  push(`| \`${kind}\` | ${byKind[kind]} | ${NEW_KINDS.has(kind) ? 'YES' : 'no'} |`);
}
push('');

push('## Summary by app');
push('');
push('| App | Violations |');
push('|---|---|');
for (const app of Object.keys(byApp).sort((a, b) => byApp[b] - byApp[a])) {
  push(`| ${app} | ${byApp[app]} |`);
}
push('');

push('## Top 20 files by violation count');
push('');
push('| File | Count |');
push('|---|---|');
const topFiles = Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);
for (const [file, count] of topFiles) {
  push(`| \`${file}\` | ${count} |`);
}
push('');

push('## Examples by kind (up to 5 each)');
push('');
const byKindSamples = {};
for (const v of allViolations) {
  if (!byKindSamples[v.kind]) byKindSamples[v.kind] = [];
  byKindSamples[v.kind].push(v);
}
for (const kind of Object.keys(byKindSamples).sort()) {
  push(`### \`${kind}\` (${byKindSamples[kind].length})`);
  push('');
  for (const v of byKindSamples[kind].slice(0, 5)) {
    push(`- \`${v.relFile}:${v.line}:${v.column}\` — ${v.message}`);
    if (v.hint) push(`  hint: ${v.hint}`);
  }
  push('');
}

const report = lines.join('\n');

if (SAVE_MD) {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, report, 'utf8');
  console.log(`Saved: ${relative(ROOT, OUT_PATH)}`);
} else {
  process.stdout.write(report);
  process.stdout.write('\n');
}

const newKindTotal = Object.entries(byKind)
  .filter(([k]) => NEW_KINDS.has(k))
  .reduce((sum, [, n]) => sum + n, 0);
console.error(`\n[inventory] scanned=${scannedCount} files, violations=${allViolations.length} (new-kind=${newKindTotal})`);

// ─── --check: CI gate ─────────────────────────────────────────────────────────
if (CHECK_MODE) {
  // Filter to severity:'error' violations not covered by the allowlist.
  const STRUCTURAL_KINDS = new Set(['app-package-import', 'disallowed-import']);
  const blockingViolations = allViolations.filter((v) => {
    if (!STRUCTURAL_KINDS.has(v.kind)) return false;
    // Check allowlist: normalize path relative to ROOT.
    const relPath = v.relFile.replaceAll('\\', '/');
    const allowedKinds = ALLOWLIST.get(relPath);
    if (allowedKinds?.has(v.kind)) return false; // allowlisted
    return true;
  });

  if (blockingViolations.length > 0) {
    console.error('\n[compliance:check] FAILED — structural violations outside allowlist:');
    for (const v of blockingViolations) {
      console.error(`  [${v.kind}] ${v.relFile}:${v.line}:${v.column}`);
      console.error(`    ${v.message}`);
      if (v.hint) console.error(`    hint: ${v.hint}`);
    }
    console.error(`\n[compliance:check] ${blockingViolations.length} blocking violation(s). Fix them or add to docs/_meta/compliance-allowlist.json with a TTL.`);
    process.exit(1);
  } else {
    const allowlistedCount = allViolations.filter((v) => {
      if (!STRUCTURAL_KINDS.has(v.kind)) return false;
      const relPath = v.relFile.replaceAll('\\', '/');
      return ALLOWLIST.get(relPath)?.has(v.kind) ?? false;
    }).length;
    console.error(`\n[compliance:check] PASSED — 0 blocking structural violations (${allowlistedCount} allowlisted, ${newKindTotal} cosmetic warn-only).`);
  }
}
