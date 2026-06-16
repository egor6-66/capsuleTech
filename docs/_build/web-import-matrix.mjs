#!/usr/bin/env node
/**
 * W5 — cross-package import inventory for packages/web/**.
 *
 * Scans every web-package's src/**\/*.{ts,tsx,mts,cts} for imports of
 * @capsuletech/* and @capsule/* and emits a baseline matrix to
 * docs/_meta/web-import-matrix.md.
 *
 * Baseline для D2 domain-isolation (ADR 047). Не enforcement — просто snapshot.
 *
 * Run from repo root: `node docs/_build/web-import-matrix.mjs`
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WEB_ROOT = join(ROOT, 'packages/web');
const OUT = join(ROOT, 'docs/_meta/web-import-matrix.md');

// ─── walk packages ───────────────────────────────────────────────────────────

const readPj = async (pjPath) => {
  try {
    return JSON.parse(await readFile(pjPath, 'utf8'));
  } catch {
    return null;
  }
};

const findPackages = async () => {
  const pkgs = [];
  for (const zone of await readdir(WEB_ROOT, { withFileTypes: true })) {
    if (!zone.isDirectory()) continue;
    const zoneDir = join(WEB_ROOT, zone.name);
    // sole-inhabitant zone — package.json lives directly under zoneDir
    const zonePj = await readPj(join(zoneDir, 'package.json'));
    if (zonePj && zonePj.name) {
      pkgs.push({ zone: zone.name, dirName: zone.name, name: zonePj.name, dir: zoneDir });
      continue;
    }
    // normal zone — iterate subdirs (skip build artifacts)
    for (const pkg of await readdir(zoneDir, { withFileTypes: true })) {
      if (!pkg.isDirectory()) continue;
      if (pkg.name === 'node_modules' || pkg.name === 'dist' || pkg.name.startsWith('.')) continue;
      const pkgDir = join(zoneDir, pkg.name);
      const pj = await readPj(join(pkgDir, 'package.json'));
      if (pj && pj.name) {
        pkgs.push({ zone: zone.name, dirName: pkg.name, name: pj.name, dir: pkgDir });
      }
    }
  }
  return pkgs.sort((a, b) => a.name.localeCompare(b.name));
};

// ─── walk src ────────────────────────────────────────────────────────────────

const SRC_EXT = /\.(ts|tsx|mts|cts)$/;

const walkSrc = async (dir, out = []) => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      await walkSrc(p, out);
    } else if (e.isFile() && SRC_EXT.test(e.name) && !e.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
};

// ─── parse imports ───────────────────────────────────────────────────────────

const IMPORT_RX =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]((?:@capsuletech|@capsule)\/[^'"]+)['"]/g;

const collectImports = (src) => {
  const out = [];
  for (const m of src.matchAll(IMPORT_RX)) {
    out.push(m[1]);
  }
  return out;
};

/** @capsuletech/web-ui/lib → @capsuletech/web-ui */
const baseSpecifier = (spec) => {
  const parts = spec.split('/');
  return `${parts[0]}/${parts[1]}`;
};

const subpath = (spec) => {
  const parts = spec.split('/');
  return parts.length > 2 ? parts.slice(2).join('/') : null;
};

// ─── main ────────────────────────────────────────────────────────────────────

const pkgs = await findPackages();
const nameToPkg = new Map(pkgs.map((p) => [p.name, p]));

/** importer-name → { target-name → { fileCount, subpaths: Set, files: Set, external: bool } } */
const graph = new Map();

for (const pkg of pkgs) {
  const files = await walkSrc(join(pkg.dir, 'src'));
  const targets = new Map();
  for (const f of files) {
    const src = await readFile(f, 'utf8');
    const imports = collectImports(src);
    for (const spec of imports) {
      const base = baseSpecifier(spec);
      if (base === pkg.name) continue; // self-import (subpath)
      let entry = targets.get(base);
      if (!entry) {
        entry = {
          fileCount: 0,
          subpaths: new Set(),
          files: new Set(),
          external: !nameToPkg.has(base),
        };
        targets.set(base, entry);
      }
      entry.files.add(relative(pkg.dir, f).replace(/\\/g, '/'));
      const sp = subpath(spec);
      if (sp) entry.subpaths.add(sp);
    }
    for (const t of targets.values()) t.fileCount = t.files.size;
  }
  graph.set(pkg.name, targets);
}

// ─── derive zone matrix ─────────────────────────────────────────────────────

const ZONES = ['kit', 'runtime', 'domain', 'boost', 'studio'];
const zoneMatrix = {};
for (const z of ZONES) zoneMatrix[z] = Object.fromEntries(ZONES.map((z2) => [z2, 0]));

for (const pkg of pkgs) {
  const targets = graph.get(pkg.name);
  for (const [targetName] of targets) {
    const target = nameToPkg.get(targetName);
    if (!target) continue; // external (kobalte, solid, etc.)
    zoneMatrix[pkg.zone][target.zone]++;
  }
}

// ─── emit markdown ──────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

let md = '';
md += '---\n';
md += 'title: web-import-matrix\n';
md +=
  'description: Baseline cross-package import inventory for packages/web/** (W5 / ADR 047). Snapshot, not enforcement.\n';
md += 'status: documented\n';
md += 'tags: [meta, web-rework, audit]\n';
md += `last_updated: ${today}\n`;
md += '---\n\n';

md += '# Web cross-package import matrix\n\n';
md += `> Generated by \`docs/_build/web-import-matrix.mjs\`. Re-run to refresh.\n\n`;
md += `**Scope:** ${pkgs.length} packages in \`packages/web/**\`. **External @capsuletech/* deps** (cli, builders, shared-zod, etc.) shown but not part of zone matrix.\n\n`;

// Zone matrix
md += '## Zone × Zone counts {#zone-matrix}\n\n';
md +=
  'Row = importer zone, column = imported zone. Cell = number of (importer-pkg, imported-pkg) edges.\n\n';
md += `| from \\ to | ${ZONES.join(' | ')} |\n`;
md += `|---|${ZONES.map(() => '---').join('|')}|\n`;
for (const fromZone of ZONES) {
  const row = [`**${fromZone}**`];
  for (const toZone of ZONES) {
    const v = zoneMatrix[fromZone][toZone];
    row.push(v === 0 ? '—' : String(v));
  }
  md += `| ${row.join(' | ')} |\n`;
}
md += '\n';

md += '**Legend (zone canon, ADR 047):**\n';
md += '- `kit` — stateless primitives (ui)\n';
md += '- `runtime` — framework runtime (core, state, router, …)\n';
md += '- `domain` — domain-modules (auth, shell, agent)\n';
md += '- `boost` — domain-boosters (table, map, flow, chart, layout)\n';
md += '- `studio` — design-time host (sole inhabitant)\n\n';
md += 'Direction discipline (ADR 047):\n';
md += '- `runtime ← kit`: OK (runtime may use kit primitives)\n';
md += '- `domain ← runtime, kit`: OK\n';
md += '- `boost ← runtime, kit`: OK\n';
md += '- `studio ← *`: OK (top consumer)\n';
md += '- `kit → *`: violation candidate (kit must stay leaf)\n';
md += '- `runtime → domain | boost | studio`: violation candidate\n';
md +=
  '- `domain → boost | studio` or `boost → domain | studio`: cross-axis violation candidate\n\n';

// Per-package detail
md += '## Per-package imports {#per-package}\n\n';
for (const pkg of pkgs) {
  const targets = graph.get(pkg.name);
  const total = [...targets.values()].reduce((a, b) => a + b.fileCount, 0);
  md += `### \`${pkg.name}\` (zone: ${pkg.zone}) {#${pkg.zone}-${pkg.dirName}}\n\n`;
  if (targets.size === 0) {
    md += `_No \`@capsuletech/*\` / \`@capsule/*\` imports._\n\n`;
    continue;
  }
  md += `Imports from **${targets.size}** packages (${total} file-references):\n\n`;
  md += `| target | zone | edges | subpaths |\n`;
  md += `|---|---|---|---|\n`;
  const rows = [...targets.entries()]
    .map(([name, info]) => ({
      name,
      zone: nameToPkg.get(name)?.zone ?? '(external)',
      fileCount: info.fileCount,
      subpaths: [...info.subpaths].sort().join(', ') || '—',
    }))
    .sort((a, b) => b.fileCount - a.fileCount);
  for (const r of rows) {
    md += `| \`${r.name}\` | ${r.zone} | ${r.fileCount} | ${r.subpaths} |\n`;
  }
  md += '\n';
}

await writeFile(OUT, md, 'utf8');
console.log(`Wrote ${relative(ROOT, OUT).replace(/\\/g, '/')}`);
console.log(`Packages scanned: ${pkgs.length}`);
console.log(`Zone matrix:`);
console.log(`  ${'from\\to'.padEnd(10)} ${ZONES.map((z) => z.padStart(8)).join(' ')}`);
for (const fromZone of ZONES) {
  const cells = ZONES.map((to) => String(zoneMatrix[fromZone][to]).padStart(8));
  console.log(`  ${fromZone.padEnd(10)} ${cells.join(' ')}`);
}
