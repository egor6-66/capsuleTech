#!/usr/bin/env node
// dev-diagnostics-pretty.mjs — JSONL → one-line pretty.
//
// Используется в pipeline'е Monitor:
//   tail -F .capsule/dev-diagnostics.log | node dev-diagnostics-pretty.mjs
// либо как standalone — читает файл как аргумент и tail-итит изменения через
// fs.watch + offset-tracking (cross-platform, без зависимости от GNU tail).
//
// Каждая stdout-строка = одно Monitor-notification у agent'а.
//
// Формат: `[diag:<type>:<severity>] <file>:<line>:<col> — <code>: <message>`

import { createReadStream, statSync, watch } from 'node:fs';
import { createInterface } from 'node:readline';

function format(rec) {
  const loc = rec.line != null ? `:${rec.line}${rec.col != null ? `:${rec.col}` : ''}` : '';
  const code = rec.code ? `${rec.code}: ` : '';
  return `[diag:${rec.type}:${rec.severity}] ${rec.file}${loc} — ${code}${rec.message}`;
}

function writeLine(line) {
  if (!line.trim()) return;
  try {
    const rec = JSON.parse(line);
    process.stdout.write(format(rec) + '\n');
  } catch {
    // Незаконченная строка / битый JSON — игнорируем.
  }
}

function tailFile(path) {
  let offset = 0;
  try {
    offset = statSync(path).size;
  } catch {
    offset = 0;
  }

  const readNew = () => {
    let size;
    try {
      size = statSync(path).size;
    } catch {
      return;
    }
    if (size < offset) {
      // Truncate (dev-server restarted) — start from 0.
      offset = 0;
    }
    if (size === offset) return;
    const stream = createReadStream(path, { start: offset, end: size - 1, encoding: 'utf8' });
    const rl = createInterface({ input: stream });
    rl.on('line', writeLine);
    rl.on('close', () => {
      offset = size;
    });
  };

  // Initial flush — если в файле уже есть записи, выведи их все.
  offset = 0;
  readNew();

  // fs.watch на rename + change.
  try {
    watch(path, { persistent: true }, () => {
      readNew();
    });
  } catch {
    // Файл удалён / недоступен — exit.
    process.exit(0);
  }
}

function pipeMode() {
  const rl = createInterface({ input: process.stdin });
  rl.on('line', writeLine);
  rl.on('close', () => process.exit(0));
}

const arg = process.argv[2];
if (arg) {
  tailFile(arg);
} else {
  pipeMode();
}