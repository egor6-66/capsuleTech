/**
 * solidBundleShim.ts — утилиты для разрешения проблемы multi-Solid в iframe.
 *
 * ПРОБЛЕМА (ADR-053 consequence 7b, Вариант C — import-map injection):
 *
 * Когда remote-app грузится внутри iframe через boot.mjs, у iframe и хоста
 * могут быть разные ESM-URL для `solid-js` (разные vite-dev origins).
 * Результат — два инстанса Solid runtime: `store` из boot.mjs не нотифицирует
 * эффекты из remote.ts. Симптом: `console.warn '[capsule/solid] multiple instances'`.
 *
 * РЕШЕНИЕ — Вариант C (import-map injection):
 * Хост при генерации iframe srcdoc добавляет `<script type="importmap">` до
 * первого `<script type="module">`. Все `import 'solid-js'` в iframe-коде
 * резолвятся к одному URL — тому, который предоставляет хост.
 *
 * Этот файл предоставляет:
 *  1. `buildSolidImportMap(hostOrigin)` — строит JSON import-map объект.
 *  2. `renderSolidImportMapTag(hostOrigin)` — строит HTML-строку для инлайна в srcdoc.
 *  3. `SOLID_IMPORT_SPECIFIERS` — список всех specifier'ов solid-js (для документации).
 *
 * ИСПОЛЬЗОВАНИЕ (owner-web-remote, buildSrcdoc.ts):
 * ```ts
 * import { renderSolidImportMapTag } from '@capsuletech/web-core/bootstrap';
 *
 * const srcdoc = `<!doctype html>
 * <html>
 * <head>
 *   ${renderSolidImportMapTag(parentOrigin)}
 * </head>
 * <body>
 *   <div id="capsule-remote-root"></div>
 *   <script type="module" src="${bootUrl}"></script>
 * </body>
 * </html>`;
 * ```
 *
 * ВАЖНО: import-map должен появляться ДО любого `<script type="module">`.
 * HTML-спецификация не разрешает import-map после первого module-script.
 *
 * ВЕРИФИКАЦИЯ multi-Solid warning:
 * Тест в jsdom не может имитировать multi-origin ESM — это браузерная проблема.
 * E2e-верификация: запустить `apps/universal-canvas` + `apps/playground`, открыть
 * DevTools в iframe-фрейме, убедиться что `[capsule/solid] multiple instances`
 * больше не выводится. Затем проверить что `createEffect(() => ctx.props.X)` в
 * remote.ts триггерится при изменении `<Remote.View X={signal()}>` на хосте.
 *
 * @module
 */

/**
 * Все specifier'ы solid-js которые могут использоваться в remote-app.
 * Ключи import-map — строгое соответствие ESM specifier'ам.
 */
export const SOLID_IMPORT_SPECIFIERS = [
  'solid-js',
  'solid-js/web',
  'solid-js/store',
  'solid-js/h',
  'solid-js/html',
  'solid-js/universal',
] as const;

export type SolidImportSpecifier = (typeof SOLID_IMPORT_SPECIFIERS)[number];

/**
 * Строит import-map объект для solid-js, указывающий все specifier'ы на
 * URL'ы с хост-origin'а (где solid-js уже загружен и является singleton'ом).
 *
 * В dev-режиме (vite) solid-js доступен по пути `/@fs/...` или `/node_modules/solid-js/...`.
 * В prod — по пути `/assets/solid-js-<hash>.mjs` или аналогичному.
 *
 * Передавай `hostOrigin` как `window.location.origin` хоста (не iframe'а).
 *
 * @param hostOrigin - Origin хоста (например `http://localhost:5173`)
 * @param paths - Опциональный override: specifier → путь от origin'а.
 *   По умолчанию — dev-пути vite.
 *   В prod замени на актуальные hashed-пути из manifest.json.
 */
export const buildSolidImportMap = (
  hostOrigin: string,
  paths: Partial<Record<SolidImportSpecifier, string>> = {},
): { imports: Record<string, string> } => {
  const defaultPaths: Record<SolidImportSpecifier, string> = {
    'solid-js': '/node_modules/solid-js/dist/solid.js',
    'solid-js/web': '/node_modules/solid-js/web/dist/web.js',
    'solid-js/store': '/node_modules/solid-js/store/dist/store.js',
    'solid-js/h': '/node_modules/solid-js/h/dist/h.js',
    'solid-js/html': '/node_modules/solid-js/html/dist/html.js',
    'solid-js/universal': '/node_modules/solid-js/universal/dist/universal.js',
  };

  const resolvedPaths = { ...defaultPaths, ...paths };

  const imports: Record<string, string> = {};
  for (const specifier of SOLID_IMPORT_SPECIFIERS) {
    imports[specifier] = `${hostOrigin}${resolvedPaths[specifier]}`;
  }

  return { imports };
};

/**
 * Строит HTML-строку `<script type="importmap">...</script>` для инлайна в iframe srcdoc.
 *
 * Должна идти ПЕРВЫМ script-тегом в `<head>` — до boot.mjs и app entry.
 *
 * @param hostOrigin - Origin хоста (например `window.location.origin` на хосте)
 * @param paths - Опциональный override путей (см. buildSolidImportMap)
 */
export const renderSolidImportMapTag = (
  hostOrigin: string,
  paths?: Partial<Record<SolidImportSpecifier, string>>,
): string => {
  const importMap = buildSolidImportMap(hostOrigin, paths);
  return `<script type="importmap">${JSON.stringify(importMap)}</script>`;
};
