import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

// @babel/traverse is CJS with __esModule:true — Node.js ESM interop gives the namespace object,
// not the function. Unwrap .default when present.
const traverse: typeof _traverse = (_traverse as any).default ?? _traverse;

import * as t from '@babel/types';
import { classify, extractGroup, type Layer } from './classify';
import {
  CROSS_LAYER_ALLOWED,
  HOST_TAG_HINT_SUGGESTIONS,
  LAYER_PREFIXES,
  NATIVE_JS_GLOBALS,
  NATIVE_JS_TIMERS,
  RUNTIME_ALLOWED,
} from './rules';
import {
  classifyZone,
  extractZonePackage,
  isZoneImportAllowed,
  NO_PREFIX_PKG_DIRS,
  PACKAGE_TO_ZONE,
  WORKSPACE_DIR_RENAME,
  type Zone,
} from './zones';

/**
 * All known violation kind literals.
 * Used in per-kind severity mapping (ICheckOptions.severity).
 */
export type ViolationKind =
  | 'disallowed-import' // import не из allowlist данного слоя
  | 'upward-import' // нижний слой тащит верхний
  | 'horizontal-import' // сосед по слою (другая группа)
  | 'side-effect-fetch' // fetch/axios в не-feature
  | 'unknown-alias' // @-литерал в meta.tags не зарегистрирован в capsule.app.ts
  | 'cross-zone-import' // packages/web/<zone> импортит запрещённую zone (ADR 047 D1/D2)
  | 'native-jsx' // HTML host-tag в HCA-слое (Phase L)
  | 'native-js' // DOM global / raw timer в HCA-слое (Phase L)
  | 'raw-class' // class=/className= JSX-атрибут в HCA-слое (Phase L)
  | 'app-package-import'; // runtime @capsuletech/* / @capsule/* в apps/*/src (Phase L)

export interface IViolation {
  file: string;
  line: number;
  column: number;
  source: string;
  /**
   * HCA layer for apps/* files. `'system'` for `packages/*` zone-checked files.
   * `'test'` for test files (suppressed checks).
   */
  layer: Exclude<Layer, null>;
  /**
   * Zone for `packages/web/*` files, when classified. Set on `cross-zone-import`
   * violations only.
   */
  zone?: Zone;
  kind: ViolationKind;
  /**
   * Effective severity computed by `check()` from `ICheckOptions.severity` mapping.
   * `'error'` — structural violation, fails CI gate and Vite build.
   * `'warn'`  — cosmetic violation, logged but non-blocking.
   */
  severity: 'error' | 'warn';
  message: string;
  hint?: string;
}

/**
 * Per-kind severity override. Missing kinds fall back to DEFAULT_SEVERITY.
 * L7 flip: `app-package-import` and `disallowed-import` are `'error'` by default.
 * Cosmetic kinds (`raw-class`, `native-jsx`, `native-js`) remain `'warn'`.
 */
export const DEFAULT_SEVERITY: Record<ViolationKind, 'error' | 'warn'> = {
  'app-package-import': 'error',
  'disallowed-import': 'error',
  'upward-import': 'warn',
  'horizontal-import': 'warn',
  'side-effect-fetch': 'warn',
  'unknown-alias': 'warn',
  'cross-zone-import': 'warn',
  'native-jsx': 'warn',
  'native-js': 'warn',
  'raw-class': 'warn',
};

export interface ICheckOptions {
  /** Доп. allowlist по слоям, мерджится с дефолтным. */
  extraAllowed?: Partial<Record<Exclude<Layer, null | 'system' | 'test'>, RegExp[]>>;
  /** Включить ли проверку `fetch`/`axios` в не-feature. По умолчанию true. */
  checkSideEffects?: boolean;
  /**
   * Whitelist зарегистрированных алиасов (ключей `aliases` из `capsule.app.ts`).
   * Если не задан — проверка `unknown-alias` пропускается.
   */
  aliasKeys?: ReadonlySet<string>;
  /**
   * Per-kind severity override. Merged with DEFAULT_SEVERITY (per-key, not full replace).
   * Missing keys fall through to DEFAULT_SEVERITY.
   *
   * Example — revert structural kinds to warn during app-cleanup transition:
   *   severity: { 'app-package-import': 'warn', 'disallowed-import': 'warn' }
   */
  severity?: Partial<Record<ViolationKind, 'error' | 'warn' | 'off'>>;
}

/**
 * Hook-импорты, разрешённые в app-коде (инжектятся как globals через unplugin-auto-import).
 *
 * Source of truth (вариант a из бриф phase1b): compliance — gate of rules;
 * vite-builder импортирует отсюда. Dependency direction: vite-builder -> compliance
 * (однонаправленно, без цикла).
 *
 * Семантика allowlist в check():
 *   - Если import из source содержит ТОЛЬКО имена из allowlist -> пропустить.
 *   - Mixed-import ({ useRemote, Provider }) -> app-package-import (Provider не в списке).
 *   - Ручной import { useRemote } from '@capsuletech/web-remote' эквивалентен
 *     AutoImport-инжекту — тоже проходит allowlist.
 */
export const HOOK_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  '@capsuletech/web-core': ['useCtx'],
  '@capsuletech/web-router': ['useRouter'],
  '@capsuletech/desktop/runtime': ['useDesktop'],
  '@capsuletech/web-remote': ['useRemote'],
};

/** Паттерны для `no-app-package-imports` — запрет runtime-импортов наших namespace. */
const APP_PKG_PREFIXES = [/^@capsuletech\//, /^@capsule\//];

/**
 * Resolve effective severity for a given violation kind, merging caller overrides
 * with DEFAULT_SEVERITY. `'off'` items are filtered out by `check()`.
 */
const resolveSeverity = (
  kind: ViolationKind,
  override: Partial<Record<ViolationKind, 'error' | 'warn' | 'off'>> | undefined,
): 'error' | 'warn' | 'off' => override?.[kind] ?? DEFAULT_SEVERITY[kind];

/** Проверить файл — вернуть список нарушений (может быть пустым). */
export const check = (absPath: string, code: string, opts: ICheckOptions = {}): IViolation[] => {
  const layer = classify(absPath);
  if (layer === 'test') return [];

  // Zone-canon check for packages/web/<zone>/<pkg> per ADR 047 D1/D2 (Phase D3).
  // Apps (layer != null && layer != 'system') run HCA-layer check below.
  if (layer === 'system') {
    return runZoneCheck(absPath, code);
  }
  if (!layer) return [];

  // Internal accumulator — severity is stamped in the post-process step below.
  type IViolationRaw = Omit<IViolation, 'severity'>;
  const violations: IViolationRaw[] = [];

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });
  } catch {
    return []; // не можем парсить — не наша проблема
  }

  const extraAllowed = opts.extraAllowed?.[layer] ?? [];
  const allowed = [...(RUNTIME_ALLOWED[layer] ?? []), ...extraAllowed];
  const fileGroup = extractGroup(absPath, layer);

  /**
   * Проверяет один import.
   * @param importedNames — список value-specifiers (не type-only). null = dynamic import.
   */
  const checkImport = (
    source: string,
    isTypeOnly: boolean,
    line: number,
    column: number,
    importedNames: readonly string[] | null = null,
  ) => {
    if (isTypeOnly) return; // type-only не создаёт runtime-связи
    if (source.startsWith('.')) return; // относительный импорт — внутри пакета/группы, ок

    // Phase L: no-app-package-imports — runtime @capsuletech/* / @capsule/* запрещены в app-коде.
    // Перехватывает до cross-layer и allowlist проверок, чтобы дать точный message.
    if (APP_PKG_PREFIXES.some((rx) => rx.test(source))) {
      // Hook-import allowlist: если ВСЕ imported names зарегистрированы в HOOK_IMPORTS
      // для данного source — пропускаем. Mixed-import -> нарушение (часть имён не в allowlist).
      // Применяется только к static ImportDeclaration (importedNames != null и длина > 0).
      if (importedNames !== null && importedNames.length > 0) {
        const allowedHooks = HOOK_IMPORTS[source];
        if (allowedHooks) {
          const allAllowed = importedNames.every((name) => allowedHooks.includes(name));
          if (allAllowed) return;
        }
      }

      violations.push({
        file: absPath,
        line,
        column,
        source,
        layer,
        kind: 'app-package-import',
        message: `Runtime-импорт "${source}" из app-кода запрещён (слой ${layer}).`,
        hint: 'App собирается через globals (Ui.*/Views.*/Controllers.*/…). Эти namespace инжектятся через unplugin-auto-import — никаких import не нужно. Для типов используй "import type".',
      });
      return;
    }

    // Cross-layer через @views/, @controllers/, @features/, @widgets/, @pages/
    for (const [prefix, targetLayer] of Object.entries(LAYER_PREFIXES)) {
      if (!source.startsWith(prefix)) continue;
      const allowedTargets = CROSS_LAYER_ALLOWED[layer];
      if (allowedTargets.has(targetLayer)) {
        // Разрешено для widget/page-ролей. Доп. проверка горизонтали:
        if (targetLayer === layer) {
          // та же layer, но через alias — горизонталь внутри. Имя группы:
          const targetGroup = source.slice(prefix.length).split('/')[0];
          if (fileGroup && targetGroup && targetGroup !== fileGroup) {
            violations.push({
              file: absPath,
              line,
              column,
              source,
              layer,
              kind: 'horizontal-import',
              message: `Horizontal import: ${layer} "${fileGroup}" импортирует соседа "${targetGroup}".`,
              hint: 'Композиция между сущностями одного слоя — только в Widget через слоты/children.',
            });
          }
        }
        return;
      }
      // Не разрешено: upward или horizontal
      const isUpward = LAYER_ORDER[targetLayer] > LAYER_ORDER[layer];
      violations.push({
        file: absPath,
        line,
        column,
        source,
        layer,
        kind: isUpward ? 'upward-import' : 'horizontal-import',
        message: isUpward
          ? `Upward import: ${layer} не может импортировать ${targetLayer} ("${source}").`
          : `Horizontal import: ${layer} не может импортировать соседа из ${targetLayer} ("${source}").`,
        hint: isUpward
          ? 'Зависимость должна идти сверху вниз. Перенеси композицию в Widget.'
          : 'Композиция между сущностями одного слоя — только в Widget через слоты/children.',
      });
      return;
    }

    // Внешние — проверяем allowlist
    if (allowed.some((rx) => rx.test(source))) return;

    violations.push({
      file: absPath,
      line,
      column,
      source,
      layer,
      kind: 'disallowed-import',
      message: `Import "${source}" не разрешён в слое ${layer}.`,
      hint: `Допустимые в ${layer}: ${allowed.map((r) => r.source).join(', ')}.`,
    });
  };

  const checkMetaTags = (tagsArray: t.ArrayExpression) => {
    if (!opts.aliasKeys) return;
    for (const el of tagsArray.elements) {
      if (!el || !t.isStringLiteral(el)) continue;
      const value = el.value;
      if (!value.startsWith('@')) continue;
      if (opts.aliasKeys.has(value)) continue;
      const loc = el.loc?.start;
      violations.push({
        file: absPath,
        line: loc?.line ?? 0,
        column: loc?.column ?? 0,
        source: value,
        layer,
        kind: 'unknown-alias',
        message: `Unknown alias "${value}" в meta.tags — не зарегистрирован в capsule.app.ts > aliases.`,
        hint: `Зарегистрируй "${value}" в aliases или убери @-префикс если это обычный тег.`,
      });
    }
  };

  // Phase L: no-native-js — дедупликация по позиции+имени
  const seenNativeJs = new Set<string>();

  traverse(ast, {
    // ─── Phase L: no-raw-class ────────────────────────────────────────────────
    // Ловим JSXAttribute с name === 'class' / 'className' / 'classList'
    // и Solid namespace-директивы class:foo={...}
    JSXAttribute(path) {
      const node = path.node;
      const attrName = node.name;

      // Сначала — meta.tags check (существующий)
      if (t.isJSXIdentifier(attrName) && attrName.name === 'meta') {
        const value = node.value;
        if (!value || !t.isJSXExpressionContainer(value)) return;
        const expr = value.expression;
        if (!t.isObjectExpression(expr)) return;
        for (const prop of expr.properties) {
          if (!t.isObjectProperty(prop)) continue;
          const key = prop.key;
          const keyName = t.isIdentifier(key)
            ? key.name
            : t.isStringLiteral(key)
              ? key.value
              : null;
          if (keyName !== 'tags') continue;
          if (!t.isArrayExpression(prop.value)) continue;
          checkMetaTags(prop.value);
        }
        return;
      }

      // no-raw-class: JSXIdentifier 'class' | 'className' | 'classList'
      if (t.isJSXIdentifier(attrName)) {
        const n = attrName.name;
        if (n === 'class' || n === 'className' || n === 'classList') {
          const loc = node.loc?.start;
          violations.push({
            file: absPath,
            line: loc?.line ?? 0,
            column: loc?.column ?? 0,
            source: n,
            layer,
            kind: 'raw-class',
            message: `Raw class на JSX-узле запрещён в слое ${layer}.`,
            hint: 'Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.',
          });
          return;
        }
      }

      // Solid namespace-директива: class:foo={signal} или classList={...}
      if (t.isJSXNamespacedName(attrName)) {
        const ns = attrName.namespace.name;
        if (ns === 'class' || ns === 'classList') {
          const loc = node.loc?.start;
          violations.push({
            file: absPath,
            line: loc?.line ?? 0,
            column: loc?.column ?? 0,
            source: `${ns}:${attrName.name.name}`,
            layer,
            kind: 'raw-class',
            message: `Raw class на JSX-узле запрещён в слое ${layer}.`,
            hint: 'Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.',
          });
        }
      }
    },

    // ─── Phase L: no-native-jsx ───────────────────────────────────────────────
    JSXOpeningElement(path) {
      const node = path.node;
      const nameNode = node.name;
      // JSXMemberExpression (<Ui.Button>) — ок
      if (!t.isJSXIdentifier(nameNode)) return;
      const tagName = nameNode.name;
      // PascalCase — компонент, не host-tag
      if (!/^[a-z]/.test(tagName)) return;

      const loc = node.loc?.start;
      const suggestion = HOST_TAG_HINT_SUGGESTIONS[tagName];
      const hint = suggestion
        ? `Используй ${suggestion}. Если нужного примитива нет — расширь @capsuletech/web-ui, не пиши нативу руками.`
        : 'Используй Ui.* / Views.* primitives. Если нужного примитива нет — расширь @capsuletech/web-ui.';

      violations.push({
        file: absPath,
        line: loc?.line ?? 0,
        column: loc?.column ?? 0,
        source: tagName,
        layer,
        kind: 'native-jsx',
        message: `Native HTML tag "<${tagName}>" запрещён в слое ${layer}.`,
        hint,
      });
    },

    ImportDeclaration(path) {
      const node = path.node;
      const isTypeOnly = node.importKind === 'type';
      const source = node.source.value;
      const loc = node.loc?.start;

      // Собираем value-specifiers для hook-allowlist.
      // Default/namespace import — не named hooks, передаём null.
      const hasNonNamed = node.specifiers.some(
        (s) => t.isImportDefaultSpecifier(s) || t.isImportNamespaceSpecifier(s),
      );
      const importedNames: string[] | null = hasNonNamed
        ? null
        : node.specifiers.flatMap((s) => {
            if (t.isImportSpecifier(s) && s.importKind !== 'type') {
              const imported = s.imported;
              return t.isIdentifier(imported)
                ? [imported.name]
                : t.isStringLiteral(imported)
                  ? [imported.value]
                  : [];
            }
            return [];
          });

      checkImport(source, isTypeOnly, loc?.line ?? 0, loc?.column ?? 0, importedNames);
    },

    CallExpression(path) {
      const node = path.node;

      // dynamic import('...')
      if (
        t.isImport(node.callee) &&
        node.arguments.length > 0 &&
        t.isStringLiteral(node.arguments[0])
      ) {
        const source = node.arguments[0].value;
        const loc = node.loc?.start;
        // Dynamic import не передаёт importedNames (null) — allowlist не применяется.
        checkImport(source, false, loc?.line ?? 0, loc?.column ?? 0, null);
        return;
      }

      // ─── Phase L: no-native-js (timers) ────────────────────────────────────
      const callee = node.callee;
      if (t.isIdentifier(callee) && NATIVE_JS_TIMERS.has(callee.name)) {
        const loc = node.loc?.start;
        const key = `${loc?.line ?? 0}:${loc?.column ?? 0}:${callee.name}`;
        if (!seenNativeJs.has(key)) {
          seenNativeJs.add(key);
          violations.push({
            file: absPath,
            line: loc?.line ?? 0,
            column: loc?.column ?? 0,
            source: callee.name,
            layer,
            kind: 'native-js',
            message: `Прямой доступ к native "${callee.name}" запрещён в слое ${layer}.`,
            hint: 'Используй Solid primitives (createTimer/createDebounce) или onCleanup для cleanup. Raw timers не привязаны к lifecycle.',
          });
        }
        return;
      }

      // Side-effect: fetch/axios в не-feature (существующий check)
      if (opts.checkSideEffects === false) return;
      if (layer === 'feature') return;

      let calleeName: string | null = null;
      if (t.isIdentifier(callee)) {
        calleeName = callee.name;
      } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.object)) {
        calleeName = callee.object.name;
      }

      if (calleeName === 'fetch' || calleeName === 'axios' || calleeName === 'XMLHttpRequest') {
        const loc = node.loc?.start;
        violations.push({
          file: absPath,
          line: loc?.line ?? 0,
          column: loc?.column ?? 0,
          source: calleeName,
          layer,
          kind: 'side-effect-fetch',
          message: `Сетевой вызов "${calleeName}(...)" запрещён в слое ${layer}.`,
          hint: 'API-вызовы — только во Feature. Передай результат вверх через next() или вниз через store.',
        });
      }
    },

    // ─── Phase L: no-native-js (DOM globals via MemberExpression) ────────────
    // Ловим: document.X, window.X, localStorage.X и т.д.
    MemberExpression(path) {
      const node = path.node;
      if (!t.isIdentifier(node.object)) return;
      const name = node.object.name;
      if (!NATIVE_JS_GLOBALS.has(name)) return;

      const loc = node.loc?.start;
      const key = `${loc?.line ?? 0}:${loc?.column ?? 0}:${name}`;
      if (seenNativeJs.has(key)) return;
      seenNativeJs.add(key);

      violations.push({
        file: absPath,
        line: loc?.line ?? 0,
        column: loc?.column ?? 0,
        source: name,
        layer,
        kind: 'native-js',
        message: `Прямой доступ к native "${name}" запрещён в слое ${layer}.`,
        hint: 'Используй services (router/utils/api) или Solid primitives (onMount/onCleanup/createEffect). Прямой DOM-доступ блокирует desktop/SSR.',
      });
    },
  });

  // Post-process: stamp severity + filter out 'off' kinds.
  const severityOverride = opts.severity;
  return violations.flatMap((v) => {
    const sev = resolveSeverity(v.kind, severityOverride);
    if (sev === 'off') return [];
    return [{ ...v, severity: sev }];
  });
};

const LAYER_ORDER: Record<Exclude<Layer, null | 'system' | 'test'>, number> = {
  view: 0,
  controller: 1,
  feature: 2,
  widget: 3,
  page: 4,
};

/**
 * Zone-canon check for `packages/web/<zone>/<pkg>/` files (Phase D3).
 *
 * Reads `@capsuletech/web-*` and `@capsuletech/boost-*` imports and validates
 * against `ZONE_ALLOWED_DEPS` per ADR 047 D1 + cross-domain canon (D2).
 *
 * Vendor packages (`shared-zod`, `shared-utils`, `vite-builder`, etc.) and
 * non-capsule imports are skipped — only the @capsuletech zone-classified
 * surface is checked.
 *
 * Type-only imports are skipped (no runtime coupling).
 */
const runZoneCheck = (absPath: string, code: string): IViolation[] => {
  const fromZone = classifyZone(absPath);
  if (!fromZone) return [];
  const fromPkgDir = extractZonePackage(absPath, fromZone);
  if (!fromPkgDir) return [];
  // Reconstruct npm package name from <zone>/<pkg-dir>:
  //   kit/ui              → @capsuletech/web-ui
  //   runtime/core        → @capsuletech/web-core
  //   runtime/data-gen    → @capsuletech/data-gen   (no prefix; package-scoped util)
  //   boost/layout        → @capsuletech/boost-layout
  //   domain/auth         → @capsuletech/web-auth
  //   workspace/studio    → @capsuletech/web-studio
  //   workspace/learn     → @capsuletech/web-learn
  //   workspace/kit       → @capsuletech/web-workspace (rename-exception; shared kit)
  let fromPkg: string;
  if (fromZone === 'workspace') {
    const dir = WORKSPACE_DIR_RENAME[fromPkgDir] ?? fromPkgDir;
    fromPkg = `@capsuletech/web-${dir}`;
  } else if (NO_PREFIX_PKG_DIRS.has(fromPkgDir)) {
    fromPkg = `@capsuletech/${fromPkgDir}`;
  } else {
    const prefix = fromZone === 'boost' ? 'boost' : 'web';
    fromPkg = `@capsuletech/${prefix}-${fromPkgDir}`;
  }

  type IViolationRaw = Omit<IViolation, 'severity'>;
  const violations: IViolationRaw[] = [];

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });
  } catch {
    return [];
  }

  const checkSource = (source: string, isTypeOnly: boolean, line: number, column: number) => {
    if (isTypeOnly) return;
    if (!source.startsWith('@capsuletech/')) return;

    // Strip subpath: '@capsuletech/web-auth/session' → '@capsuletech/web-auth'
    const npmName = source.split('/').slice(0, 2).join('/');
    const targetZone = PACKAGE_TO_ZONE[npmName];
    // Unknown @capsuletech package (shared-zod, vite-builder, cli, …) — shared
    // infrastructure, allowed everywhere.
    if (!targetZone) return;
    if (npmName === fromPkg) return; // self-import via npm alias — ok

    if (isZoneImportAllowed(fromZone, fromPkg, targetZone, npmName)) return;

    const isCrossDomain = fromZone === 'domain' && targetZone === 'domain' && npmName !== fromPkg;
    const isWorkspaceAppCross =
      fromZone === 'workspace' && targetZone === 'workspace' && npmName !== fromPkg;
    let message: string;
    let hint: string;
    if (isCrossDomain) {
      message = `Cross-domain import: ${fromPkg} (domain) → ${npmName} (domain). Direct domain↔domain imports запрещены (ADR 047 D2).`;
      hint =
        'Extract capability в @capsuletech/web-contract/capabilities, consumer тянет контракт, target реализует через ADR 033 manifest.';
    } else if (isWorkspaceAppCross) {
      message = `Workspace app-cross import: ${fromPkg} → ${npmName}. Апп-члены workspace (web-studio/web-learn) ⊥ друг друга; разрешён импорт только общего @capsuletech/web-workspace (ADR 047 D7).`;
      hint =
        'Общий код вынеси в @capsuletech/web-workspace (оба аппа могут его тянуть). Апп в апп корни не пускает.';
    } else {
      message = `Cross-zone import: ${fromPkg} (${fromZone}) → ${npmName} (${targetZone}). Zone ${fromZone} не может зависеть на ${targetZone} (ADR 047 D1).`;
      hint = `Zone ${fromZone} разрешает: ${[...(ZONE_ALLOWED_DEPS_PUBLIC[fromZone] ?? [])].join(', ')}. Если связь нужна — поднять обсуждение архитектуры.`;
    }
    violations.push({
      file: absPath,
      line,
      column,
      source,
      layer: 'system',
      zone: fromZone,
      kind: 'cross-zone-import',
      message,
      hint,
    });
  };

  traverse(ast, {
    ImportDeclaration(path) {
      const node = path.node;
      const isTypeOnly = node.importKind === 'type';
      const source = node.source.value;
      const loc = node.loc?.start;
      checkSource(source, isTypeOnly, loc?.line ?? 0, loc?.column ?? 0);
    },
    CallExpression(path) {
      const node = path.node;
      if (
        t.isImport(node.callee) &&
        node.arguments.length > 0 &&
        t.isStringLiteral(node.arguments[0])
      ) {
        const source = node.arguments[0].value;
        const loc = node.loc?.start;
        checkSource(source, false, loc?.line ?? 0, loc?.column ?? 0);
      }
    },
  });

  // Stamp severity from DEFAULT_SEVERITY (zone-check has no per-call override).
  return violations.map((v) => ({ ...v, severity: DEFAULT_SEVERITY[v.kind] }));
};

// Re-export of zones table referenced in error hints. Avoids a circular import.
import { ZONE_ALLOWED_DEPS as ZONE_ALLOWED_DEPS_PUBLIC } from './zones';
