#!/usr/bin/env node
/**
 * capsule-docs CLI
 * Usage: capsule-docs build --root <path> --strategy <package|app|docs> --out <path> [--pkg-name <name>]
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { extractDocs } from './extract.js';
import type { ISlugStrategy } from './types.js';

const USAGE = `
capsule-docs build --root <path> --strategy <package|app|docs> --out <path> [--pkg-name <name>]

Options:
  --root       Required. Absolute or relative path to the directory to walk.
  --strategy   Required. One of: package, app, docs.
  --out        Required. Output path for the JSON registry file.
  --pkg-name   Required for 'package'/'app' strategies. Package or app name.
  --help       Show this help.
`.trim();

const parseArgs = (argv: string[]): Record<string, string | boolean> => {
  const args: Record<string, string | boolean> = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      i++;
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i += 2;
      } else {
        args[key] = true;
        i++;
      }
      continue;
    }
    i++;
  }
  return args;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const subcommand = process.argv[2];
  if (subcommand !== 'build') {
    console.error(`Unknown subcommand: "${subcommand}". Expected: build`);
    console.error(USAGE);
    process.exit(1);
  }

  // Re-parse excluding the subcommand
  const flags = parseArgs(process.argv.slice(3));

  const root = flags.root as string | undefined;
  const strategy = flags.strategy as string | undefined;
  const out = flags.out as string | undefined;
  const pkgName = flags['pkg-name'] as string | undefined;

  if (!root) {
    console.error('Error: --root is required.');
    process.exit(1);
  }
  if (!strategy) {
    console.error('Error: --strategy is required.');
    process.exit(1);
  }
  if (!(['package', 'app', 'docs'] as string[]).includes(strategy)) {
    console.error(`Error: --strategy must be one of: package, app, docs. Got: "${strategy}"`);
    process.exit(1);
  }
  if (!out) {
    console.error('Error: --out is required.');
    process.exit(1);
  }
  if ((strategy === 'package' || strategy === 'app') && !pkgName) {
    console.error(`Error: --pkg-name is required for strategy "${strategy}".`);
    process.exit(1);
  }

  const absRoot = resolve(root);
  const absOut = resolve(out);

  const result = await extractDocs({
    root: absRoot,
    strategy: strategy as ISlugStrategy,
    pkgName,
  });

  if (result.errors.length > 0) {
    for (const e of result.errors) {
      process.stderr.write(`  ERROR: ${e}\n`);
    }
  }

  if (result.warnings.length > 0) {
    for (const w of result.warnings.slice(0, 20)) {
      process.stderr.write(`  WARN: ${w}\n`);
    }
    if (result.warnings.length > 20) {
      process.stderr.write(`  WARN: ... and ${result.warnings.length - 20} more\n`);
    }
  }

  await mkdir(dirname(absOut), { recursive: true });
  await writeFile(absOut, JSON.stringify(result.registry, null, 2) + '\n', 'utf8');

  console.log(`docs-builder: wrote ${absOut}`);
  console.log(
    `docs-builder: ${Object.keys(result.registry).length} docs, ` +
      `${result.warnings.length} warnings, ${result.errors.length} errors`,
  );

  if (result.errors.length > 0) {
    process.exit(1);
  }
};

main().catch((err) => {
  console.error('docs-builder: fatal', err);
  process.exit(1);
});
