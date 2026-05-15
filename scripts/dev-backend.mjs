#!/usr/bin/env node
// Запуск Rust-бэка capsule-server из корня workspace. Cross-platform обёртка
// над `cargo run -p capsule-server`, ставит env-переменные и cwd.
//
// Зачем не одноразовая команда в package.json: на Windows встроенный шелл
// (cmd) и pnpm не пробрасывают $PWD корректно в подкоманду PowerShell, а
// одиночные кавычки в JSON ломают подстановку. Node-обёртка снимает весь
// quoting-hell.

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const workspaceRoot = resolve(process.cwd());

process.env.CAPSULE_WORKSPACE_ROOT = workspaceRoot;
process.env.CAPSULE_WRITE_SCOPE ??= 'apps/agent';

console.log(`[dev-backend] workspace: ${workspaceRoot}`);
console.log(`[dev-backend] write scope: ${process.env.CAPSULE_WRITE_SCOPE}`);

const child = spawn('cargo', ['run', '-p', 'capsule-server'], {
  cwd: resolve(workspaceRoot, 'backend'),
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

const forward = (sig) => () => {
  if (!child.killed) child.kill(sig);
};
process.on('SIGINT', forward('SIGINT'));
process.on('SIGTERM', forward('SIGTERM'));
