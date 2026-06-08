import { Zod } from '@capsuletech/shared-zod';
import { mergeProps, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { useShapeUi } from './context';
import type { IShapeComponentProps, IShapeTools, IShapeWrapper } from './types';
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
 *   (ui, props) => ({ item, ...config }), // CONFIG: row-типизирован из schema (объект ИЛИ функция(ui, props))
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
 *     d. `item` из configValue резолвится (trackers → realUi) и передаётся шаблону как `item`.
 *     e. extras из configValue (за исключением `defaults` и `item`) + consumer extras (consumer wins).
 *     f. `<Dynamic component={Template} data={data} item={resolvedItem} {...extras} />`.
 *
 * `item: { use, props }` (batch-элемент, nav-паттерн):
 *  - `use` — компонент каждого элемента (tracker → rezolvируется).
 *  - `props(it)` — маппер row→props (результат тоже резолвится).
 *  Передаётся в шаблон как `item` prop (шаблон сам итерирует через `item.use` / `item.props`).
 *
 * Реактивность: `consumerProps` — Solid-реактивный proxy. `mergeProps`/`splitProps`
 * сохраняют реактивный tracking. Config-функция вычисляется реактивно если передана.
 */
/** Singleton инструментов для Shape bind. Создаётся один раз. */
const shapeTools: IShapeTools = { zod: Zod };

const shape = (bind: (...args: unknown[]) => unknown, config?: unknown) => {
  // Bind вызывается на module-load. ui — path-tracker (real Ui ещё нет).
  // item убран из bind в ADR 036 — batch-дескриптор живёт в arg2 (item).
  const bindUiTracker = createUiTracker();
  const bindResult = bind(bindUiTracker, shapeTools) as {
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
        return (
          (config as (ui: unknown, p: unknown) => Record<string, unknown>)(
            bindUiTracker,
            consumerProps,
          ) ?? {}
        );
      }
      return config != null ? (config as Record<string, unknown>) : {};
    };

    // Config-функция как source для mergeProps.
    // Solid mergeProps обрабатывает функции: вызывает createMemo(fn) внутри,
    // что позволяет сигналам внутри config-функции корректно трекуваться.
    const configSource = (): Record<string, unknown> => {
      const raw = getRawConfig();
      // Вырезаем defaults и item — они обрабатываются отдельно
      const { defaults: _d, item: _i, ...extras } = raw;
      return extras;
    };

    // Резолвим trackers в bindExtras (static, вычисляется один раз)
    const resolvedBindExtras = resolveValuesInObject(bindExtras as Record<string, unknown>, realUi);

    // Резолвим item из config (batch-дескриптор).
    // Вычисляется реактивно (внутри configSource-цикла), т.к. config может быть функцией.
    const getResolvedItem = (): Record<string, unknown> | undefined => {
      const raw = getRawConfig();
      const configItem = raw.item as
        | { use?: unknown; props?: (it: unknown) => unknown }
        | undefined;
      if (!configItem) return undefined;

      const resolvedItemUse =
        configItem.use != null
          ? (() => {
              const path = getTrackerPath(configItem.use);
              if (path && realUi) return resolveByPath(realUi, path);
              return configItem.use;
            })()
          : undefined;

      const resolvedItemProps =
        configItem.props != null
          ? (() => {
              const fn = configItem.props;
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
        item: {
          use: resolvedItemUse,
          props: resolvedItemProps,
        },
      };
    };

    const hasConsumerData = 'data' in (consumerProps as Record<string, unknown>);

    // Порядок приоритета: resolvedBindExtras < configSource() < resolvedChild < consumer rest.
    // configSource и resolvedChild — функции → mergeProps сам оборачивает в createMemo.
    const mergedExtras = mergeProps(
      resolvedBindExtras,
      configSource, // функция — Solid обернёт в createMemo
      () => getResolvedItem() ?? {}, // item реактивно из config
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
