import { mergeProps, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useShapeUi } from './context';
import type { IShapeComponentProps, IShapeWrapper } from './types';
import {
  createUiTracker,
  getTrackerPath,
  resolveByPath,
  resolveValuesInObject,
} from './ui-tracker';

/**
 * Shape wrapper v2 — двухфазная форма (Shape ADR 036).
 *
 * ```ts
 * Shape(
 *   (ui) => ({ schema, as }),              // BIND: фиксирует данные + шаблон
 *   (ui, props) => ({ child, ...config }), // CONFIG: row-типизирован из schema (объект ИЛИ функция(ui, props))
 * )
 * ```
 *
 * Runtime flow:
 *  1. `bind(ui)` вызывается на module-load: `{ schema, as, defaults? }`.
 *     `ui` — path-tracker (реального Ui ещё нет; резолв lazy на рендере).
 *  2. `config` = объект ИЛИ `(ui, props) => config`. Хранится as-is; вычисляется per-render.
 *  3. При рендере:
 *     a. template = consumer `as` ?? resolveTemplate(bind.as) ?? undefined.
 *     b. configValue = typeof config === 'function' ? config(uiTracker, consumerProps) : config.
 *     c. `data` = consumer `data` ?? configValue.defaults ?? undefined.
 *     d. `child` из configValue резолвится (trackers → realUi) и передаётся шаблону как `child`.
 *     e. extras из configValue (за исключением `defaults` и `child`) + consumer extras (consumer wins).
 *     f. `<Dynamic component={Template} data={data} child={resolvedChild} {...extras} />`.
 *
 * `child: { use, props }` (batch-элемент, nav-паттерн):
 *  - `use` — компонент каждого элемента (tracker → rezolvируется).
 *  - `props(it)` — маппер row→props (результат тоже резолвится).
 *  Передаётся в шаблон как `child` prop (шаблон сам итерирует через `child.use` / `child.props`).
 *
 * Реактивность: `consumerProps` — Solid-реактивный proxy. `mergeProps`/`splitProps`
 * сохраняют реактивный tracking. Config-функция вычисляется реактивно если передана.
 */
const shape = (bind: (...args: unknown[]) => unknown, config?: unknown) => {
  // Bind вызывается на module-load. ui — path-tracker (real Ui ещё нет).
  // item убран из bind в ADR 036 — batch-дескриптор переехал в arg2 (child).
  const bindUiTracker = createUiTracker();
  const bindResult = bind(bindUiTracker) as {
    schema?: unknown;
    as?: unknown;
    defaults?: unknown;
    [key: string]: unknown;
  };

  const { schema: _schema, as: defaultAs, defaults: bindDefaults, ...bindExtras } = bindResult;

  return (consumerProps: IShapeComponentProps<unknown>) => {
    const realUi = useShapeUi();

    // --- Резолв template ---
    const resolveTemplate = (): unknown => {
      if (consumerProps.as) return consumerProps.as;
      if (!defaultAs) return undefined;
      const path = getTrackerPath(defaultAs);
      if (path && realUi) return resolveByPath(realUi, path);
      return defaultAs;
    };

    const Template = resolveTemplate();
    if (!Template) return null;

    const [ownProps, rest] = splitProps(consumerProps as Record<string, unknown>, ['as', 'data']);

    // Вычисляем сырой config-объект (ui-tracker + consumer props).
    // Функциональная форма получает (ui, props) — ui — path-tracker (тот же экземпляр,
    // что и при bind; trackers внутри конфига резолвируются в realUi при рендере).
    const getRawConfig = (): Record<string, unknown> => {
      if (typeof config === 'function') {
        return (config as (ui: unknown, p: unknown) => Record<string, unknown>)(
          bindUiTracker,
          consumerProps,
        ) ?? {};
      }
      return config != null ? (config as Record<string, unknown>) : {};
    };

    // Config-функция как source для mergeProps.
    // Solid mergeProps обрабатывает функции: вызывает createMemo(fn) внутри,
    // что позволяет сигналам внутри config-функции корректно трекуваться.
    const configSource = (): Record<string, unknown> => {
      const raw = getRawConfig();
      // Вырезаем defaults и child — они обрабатываются отдельно
      const { defaults: _d, child: _c, ...extras } = raw;
      return extras;
    };

    // Резолвим trackers в bindExtras (static, вычисляется один раз)
    const resolvedBindExtras = resolveValuesInObject(bindExtras as Record<string, unknown>, realUi);

    // Резолвим child из config (batch-дескриптор, раньше был item в bind).
    // Вычисляется реактивно (внутри configSource-цикла), т.к. config может быть функцией.
    const getResolvedChild = (): Record<string, unknown> | undefined => {
      const raw = getRawConfig();
      const configChild = raw.child as { use?: unknown; props?: (it: unknown) => unknown } | undefined;
      if (!configChild) return undefined;

      const resolvedChildUse = configChild.use != null
        ? (() => {
            const path = getTrackerPath(configChild.use);
            if (path && realUi) return resolveByPath(realUi, path);
            return configChild.use;
          })()
        : undefined;

      const resolvedChildProps = configChild.props != null
        ? (() => {
            const fn = configChild.props;
            return (it: unknown) => {
              const result = fn(it);
              if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
                return resolveValuesInObject(result as Record<string, unknown>, realUi);
              }
              return result;
            };
          })()
        : undefined;

      return {
        child: {
          use: resolvedChildUse,
          props: resolvedChildProps,
        },
      };
    };

    const hasConsumerData = 'data' in (consumerProps as Record<string, unknown>);

    // Порядок приоритета: resolvedBindExtras < configSource() < resolvedChild < consumer rest.
    // configSource и resolvedChild — функции → mergeProps сам оборачивает в createMemo.
    const mergedExtras = mergeProps(
      resolvedBindExtras,
      configSource,                              // функция — Solid обернёт в createMemo
      () => getResolvedChild() ?? {},            // child реактивно из config
      rest,
    );

    // data: читаем config-defaults реактивно через геттер в JSX
    const getData = () => {
      if (hasConsumerData) return ownProps.data;
      const raw = getRawConfig();
      return 'defaults' in raw ? raw.defaults : bindDefaults;
    };

    return (
      <Dynamic
        component={Template as Parameters<typeof Dynamic>[0]['component']}
        data={getData()}
        {...(mergedExtras as Record<string, unknown>)}
      />
    );
  };
};

export const Shape = shape as unknown as IShapeWrapper;
