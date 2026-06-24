#!/usr/bin/env node
/* ============================================================================
 * scripts/build-packages.mjs
 * ---------------------------------------------------------------------------
 * PURPOSE
 *   Собрать пакеты capsule в их `dist/` — БЕЗ publish и БЕЗ bump версий.
 *   Закрывает боль «свежий `git clone` → нет dist → ничего не запускается».
 *
 *   Это build-only половина того, что умеет `scripts/release-local.mjs`:
 *   тот же рецепт фаз, но без Verdaccio/publish. release-local остаётся для
 *   «собрать + опубликовать группу», этот скрипт — для «просто собрать».
 *
 * USAGE
 *   pnpm build:packages                          # все пакеты, верный порядок
 *   pnpm build:packages @capsuletech/web-remote  # один конкретный пакет
 *   pnpm build:packages web-remote               # scope-префикс можно опустить
 *   node scripts/build-packages.mjs --only=web-ui
 *
 * ПОРЯДОК ФАЗ (повторяет проверенные фазы release-local)
 *   1. compliance      — AST-линтер, leaf. vite-builder резолвит его dist на
 *                        своём билде, а как declared-dep он НЕ объявлен → на
 *                        параллельном `-r` стартует одновременно и падает.
 *                        Поэтому отдельной фазой первым.
 *   2. vite-builder    — dev/build-пайплайн; его dist дёргает `capsule` CLI у
 *                        приложений (на билде самих пакетов не нужен).
 *   3. rest            — всё остальное в packages/** (shared-* / web-* / boost-* /
 *                        canvas-* / cli / desktop / …) КРОМЕ web-style. Внутри
 *                        фазы pnpm соблюдает топологический порядок по declared
 *                        workspace-deps.
 *   4. web-style       — ПОСЛЕДНИМ. Его index.css имеет `@source "../../web-*
 *                        /dist/**"` (Tailwind v4 сканит сиблинг-dist в момент
 *                        `vite build`). Если строить параллельно с web-ui —
 *                        utility-классы сиблингов не попадут в финальный CSS.
 *
 * ПОЧЕМУ нет фазы для lib-builder и прочих builder-leaf'ов:
 *   vite.config.mts пакетов импортируют билдер ИЗ ИСХОДНИКА, напр.
 *   `import { libConfig } from '../../../builders/lib/src'` — не из dist.
 *   Значит их предварительный dist для сборки соседей не требуется.
 * ==========================================================================*/
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const C = { cyan: '\x1b[36m', red: '\x1b[31m', yellow: '\x1b[33m', reset: '\x1b[0m' };
const log = (m) => console.log(`${C.cyan}[build]${C.reset} ${m}`);
const warn = (m) => console.warn(`${C.yellow}[build]${C.reset} ${m}`);
const fail = (m) => {
  console.error(`${C.red}[build]${C.reset} ${m}`);
  process.exit(1);
};

const WEB_STYLE = '@capsuletech/web-style';
const normName = (n) => (n.startsWith('@capsuletech/') ? n : `@capsuletech/${n}`);

const run = (cmdArgs) => {
  log(`> pnpm ${cmdArgs.join(' ')}`);
  const r = spawnSync('pnpm', cmdArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return r.status ?? 1;
};

/**
 * Собрать ВСЕ пакеты в правильном порядке (web-style последним).
 * Экспортируется — release-local.mjs может переиспользовать при желании.
 */
export function buildAllPackages() {
  const phases = [
    { name: 'compliance', filters: ['--filter', '@capsuletech/compliance'] },
    { name: 'vite-builder', filters: ['--filter', '@capsuletech/vite-builder'] },
    {
      name: 'rest — packages/** минус compliance/vite-builder/web-style',
      filters: [
        '--filter',
        './packages/**',
        '--filter',
        '!@capsuletech/compliance',
        '--filter',
        '!@capsuletech/vite-builder',
        '--filter',
        `!${WEB_STYLE}`,
      ],
    },
    {
      name: 'web-style (Tailwind @source-скан сиблинг-dist — строго последним)',
      filters: ['--filter', WEB_STYLE],
    },
  ];

  for (const phase of phases) {
    log(`phase: ${phase.name}`);
    // pnpm -r run build пропускает пакеты без скрипта "build" — biome-config и
    // прочие config-only тихо скипаются, ошибки не будет.
    const code = run(['-r', '--workspace-concurrency=4', ...phase.filters, 'run', 'build']);
    if (code !== 0) fail(`фаза "${phase.name}" упала — сборка прервана`);
  }
  log('✓ все пакеты собраны');
}

/**
 * Собрать ОДИН пакет (без зависимостей — предполагается, что соседи уже собраны).
 * Для свежего клона сначала прогони полную сборку `pnpm build:packages`.
 */
export function buildOnePackage(name) {
  const pkg = normName(name);
  log(`один пакет: ${pkg}`);
  const code = run(['-r', '--filter', pkg, 'run', 'build']);
  if (code !== 0) fail(`сборка ${pkg} упала`);
  log(`✓ ${pkg} собран`);
}

// ── CLI ──────────────────────────────────────────────────────────────────
const invokedDirectly = resolve(process.argv[1] ?? '') === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  let only = null;
  for (const a of argv) {
    if (a.startsWith('--only=')) only = a.slice('--only='.length);
    else if (!a.startsWith('-')) only = a;
  }
  if (only && only !== true) buildOnePackage(only);
  else buildAllPackages();
}
