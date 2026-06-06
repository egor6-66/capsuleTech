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
 *   (ui) => ({ schema, as, item? }),   // BIND: фиксирует данные + шаблон
 *   (props) => ({ ...config }),        // CONFIG: row-типизирован из schema (объект ИЛИ функция)
 * )
 * ```
 *
 * Runtime flow:
 *  1. `bind(ui)` вызывается на module-load: `{ schema, as, item?, defaults? }`.
 *     `ui` — path-tracker (реального Ui ещё нет; резолв lazy на рендере).
 *  2. `config` = объект ИЛИ `(props) => config`. Хранится as-is; вычисляется per-render.
 *  3. При рендере:
 *     a. template = consumer `as` ?? resolveTemplate(bind.as) ?? undefined.
 *     b. configValue = typeof config === 'function' ? config(consumerProps) : config.
 *     c. `data` = consumer `data` ?? configValue.defaults ?? undefined.
 *     d. extras из configValue (за исключением `defaults`) + consumer extras (consumer wins).
 *     e. `item` из bind резолвится (trackers → realUi).
 *     f. `<Dynamic component={Template} data={data} {...extras} {...item?} />`.
 *
 * `item: { use, props }` (batch-элемент, nav-паттерн):
 *  - `use` — компонент каждого элемента (tracker → rezolvируется).
 *  - `props(it)` — маппер row→props (результат тоже резолвится).
 *  Передаётся в шаблон как `item` prop (шаблон сам итерирует через `item.use` / `item.props`).
 *
 * Реактивность: `consumerProps` — Solid-реактивный proxy. `mergeProps`/`splitProps`
 * сохраняют реактивный tracking. Config-функция вычисляется реактивно если передана.
 */
const shape = (bind: (...args: unknown[]) => unknown, config?: unknown) => {
  // Bind вызывается на module-load. ui — path-tracker (real Ui ещё нет).
  const bindResult = bind(createUiTracker()) as {
    schema?: unknown;
    as?: unknown;
    item?: { use?: unknown; props?: (it: unknown) => unknown };
    defaults?: unknown;
    [key: string]: unknown;
  };

  const { schema: _schema, as: defaultAs, item: bindItem, defaults: bindDefaults, ...bindExtras } = bindResult;

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

    // Config-функция как source для mergeProps.
    // Solid mergeProps обрабатывает функции: вызывает createMemo(fn) внутри,
    // что позволяет сигналам внутри config-функции корректно трекуваться.
    // Если config = объект → wrap в функцию тоже работает (static, без ре-рендера).
    const configSource = (): Record<string, unknown> => {
      const raw: Record<string, unknown> =
        typeof config === 'function'
          ? ((config as (p: unknown) => Record<string, unknown>)(consumerProps) ?? {})
          : config != null
            ? (config as Record<string, unknown>)
            : {};
      // Вырезаем defaults — они не идут в extras (идут в data)
      const { defaults: _d, ...extras } = raw;
      return extras;
    };

    // Резолвим trackers в bindExtras (static, вычисляется один раз)
    const resolvedBindExtras = resolveValuesInObject(bindExtras as Record<string, unknown>, realUi);

    // Резолвим item из bind (static)
    let resolvedItem: Record<string, unknown> | undefined;
    if (bindItem) {
      const resolvedItemUse = bindItem.use != null
        ? (() => {
            const path = getTrackerPath(bindItem.use);
            if (path && realUi) return resolveByPath(realUi, path);
            return bindItem.use;
          })()
        : undefined;

      const resolvedItemProps = bindItem.props != null
        ? (() => {
            const fn = bindItem.props;
            return (it: unknown) => {
              const result = fn(it);
              if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
                return resolveValuesInObject(result as Record<string, unknown>, realUi);
              }
              return result;
            };
          })()
        : undefined;

      resolvedItem = {
        item: {
          use: resolvedItemUse,
          props: resolvedItemProps,
        },
      };
    }

    const hasConsumerData = 'data' in (consumerProps as Record<string, unknown>);

    // Порядок приоритета: resolvedBindExtras < configSource() < resolvedItem < consumer rest.
    // configSource — функция → mergeProps сам оборачивает в createMemo для реактивности.
    const mergedExtras = mergeProps(
      resolvedBindExtras,
      configSource,   // функция — Solid обернёт в createMemo
      resolvedItem ?? {},
      rest,
    );

    // data: читаем config-defaults реактивно через геттер в JSX
    const getData = () => {
      if (hasConsumerData) return ownProps.data;
      const raw: Record<string, unknown> =
        typeof config === 'function'
          ? ((config as (p: unknown) => Record<string, unknown>)(consumerProps) ?? {})
          : config != null
            ? (config as Record<string, unknown>)
            : {};
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
