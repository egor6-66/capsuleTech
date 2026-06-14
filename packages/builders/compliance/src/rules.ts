import type { Layer } from './classify';

/**
 * Allowlist разрешённых импортов **по слоям**. Регулярки против import-source.
 * Применяется к runtime-импортам; type-only (`import type`) пропускаются всегда.
 *
 * Расширяется через `compliancePlugin({ extraAllowed: { feature: [/^@app\/api/] } })`.
 *
 * Phase L (2026-06-13): @capsuletech and @capsule scopes fully removed from allowlist.
 * Covered by no-app-package-imports rule -- runtime import of these namespaces
 * in app code is forbidden. Globals (Ui, Views, Controllers etc.) come from
 * unplugin-auto-import via .capsule/registry -- no explicit import needed.
 * For types use "import type" -- those are always skipped.
 */

const COMMON: RegExp[] = [
  /^solid-js(\/.*)?$/, // solid-js, solid-js/web, solid-js/store
];

export const RUNTIME_ALLOWED: Record<Exclude<Layer, null | 'system' | 'test'>, RegExp[]> = {
  view: [
    ...COMMON,
    // View максимально изолирована (stateless UI leaf): только Solid.
    // @capsuletech/web-style и любые @capsuletech/* → no-app-package-imports (запрещено).
  ],

  controller: [
    ...COMMON,
    /^xstate(\/.*)?$/,
    /^@xstate\/solid$/,
    /^es-toolkit(\/.*)?$/,
    // Тяжёлая логика, кастомные FSM-машины, утилиты — да.
    // @capsuletech/web-state / web-router → no-app-package-imports (запрещено).
    // API-клиенты — нет (это Feature).
  ],

  feature: [
    ...COMMON,
    /^xstate(\/.*)?$/,
    /^@xstate\/solid$/,
    /^es-toolkit(\/.*)?$/,
    // Feature-only:
    /^@app\/(api|services)(\/.*)?$/, // конвенция: API/services живут под @app/*
    // @capsuletech/web-state / web-router / web-query → no-app-package-imports (запрещено).
    /^@tanstack\/solid-router$/, // Router — runtime lib, не наш пакет
  ],

  widget: [
    ...COMMON,
    // Widget — чистая композиция через глобальные namespaces (Entities/Controllers/Features),
    // которые приходят через unplugin-auto-import из .capsule/registry. Их в коде не видно.
    // @capsuletech/web-ui → no-app-package-imports (запрещено).
  ],

  page: [
    ...COMMON,
    /^@tanstack\/solid-router$/,
    // Page — корневой layout; widgets подсасываются через namespace, не импортом.
    // @capsuletech/web-ui → no-app-package-imports (запрещено).
  ],
};

/**
 * Защита от cross-layer импортов через alias-prefix:
 * `@views/*` из не-widget — горизонталь / upward.
 * `@features/*` из non-widget — upward.
 * И т.д.
 *
 * NB: `@entities/` удалён (директория переименована в `views/`, PR #109).
 */
export const LAYER_PREFIXES: Record<string, Exclude<Layer, null | 'system' | 'test'>> = {
  '@views/': 'view',
  '@controllers/': 'controller',
  '@features/': 'feature',
  '@widgets/': 'widget',
  '@pages/': 'page',
};

/**
 * Какому слою разрешено импортировать какой alias-prefix.
 * `widget` может тащить `@views/`, `@controllers/`, `@features/` — это его роль.
 * Все остальные — не могут импортировать соседей по слою.
 */
export const CROSS_LAYER_ALLOWED: Record<
  Exclude<Layer, null | 'system' | 'test'>,
  Set<Exclude<Layer, null | 'system' | 'test'>>
> = {
  view: new Set(),
  controller: new Set(),
  feature: new Set(),
  widget: new Set(['view', 'controller', 'feature']),
  page: new Set(['widget']),
};

// ─── Phase L anti-canon constants ────────────────────────────────────────────

/**
 * Map host-tag name → suggested Ui.* primitive.
 * Used by `no-native-jsx` rule to produce actionable hints.
 * Расширяй по мере inventory L0-phase (warn-mode).
 */
export const HOST_TAG_HINT_SUGGESTIONS: Record<string, string> = {
  // Layout
  div: 'Ui.Layout.Flex / Ui.Layout.Grid / Ui.Layout.Box',
  span: 'Ui.Layout.Inline / Ui.Typography.Text',
  section: 'Ui.Layout.Section',
  article: 'Ui.Layout.Article',
  header: 'Ui.Layout.Header',
  footer: 'Ui.Layout.Footer',
  nav: 'Ui.Layout.Nav',
  main: 'Ui.Layout.Main',
  aside: 'Ui.Layout.Aside',
  // Typography
  p: 'Ui.Typography.Paragraph',
  h1: 'Ui.Typography.H1',
  h2: 'Ui.Typography.H2',
  h3: 'Ui.Typography.H3',
  h4: 'Ui.Typography.H4',
  h5: 'Ui.Typography.H5',
  h6: 'Ui.Typography.H6',
  strong: 'Ui.Typography.Strong',
  em: 'Ui.Typography.Em',
  code: 'Ui.Typography.Code',
  pre: 'Ui.Typography.Pre',
  // Interactive
  a: 'Ui.Link',
  button: 'Ui.Button',
  input: 'Ui.Input',
  textarea: 'Ui.Textarea',
  select: 'Ui.Select',
  label: 'Ui.Label',
  form: 'Ui.Form',
  // Lists
  ul: 'Ui.List.Unordered',
  ol: 'Ui.List.Ordered',
  li: 'Ui.List.Item',
  // Table
  table: 'Ui.Table',
  thead: 'Ui.Table.Head',
  tbody: 'Ui.Table.Body',
  tr: 'Ui.Table.Row',
  th: 'Ui.Table.HeadCell',
  td: 'Ui.Table.Cell',
  // Media
  img: 'Ui.Image',
  svg: 'Ui.Icon (или Ui.Svg для raw svg)',
  path: 'Ui.Icon (внутри Ui.Svg)',
  // Misc
  hr: 'Ui.Divider',
  br: 'Ui.LineBreak',
};

/**
 * DOM globals — прямой доступ запрещён в HCA-слоях (no-native-js rule).
 * Блокирует desktop/SSR совместимость.
 */
export const NATIVE_JS_GLOBALS: ReadonlySet<string> = new Set([
  'document',
  'window',
  'navigator',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'screen',
  'performance',
  'crypto',
  'indexedDB',
  'self',
]);

/**
 * Raw timer functions — запрещены в HCA-слоях (no-native-js rule).
 * Не привязаны к lifecycle — вызывают утечки памяти при HMR и unmount.
 * Используй Solid primitives: createTimer / createDebounce / onCleanup.
 */
export const NATIVE_JS_TIMERS: ReadonlySet<string> = new Set([
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'queueMicrotask',
]);
