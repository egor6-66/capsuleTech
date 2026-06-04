import {
  type Component,
  createEffect,
  createMemo,
  ErrorBoundary,
  For,
  type JSX,
  mergeProps,
  Suspense,
} from 'solid-js';
import { createComponent } from 'solid-js/web';
import { resolvePath } from './resolve';
import type {
  IEditOverlayProps,
  IEditorNode,
  IErrorFallbackProps,
  IInteraction,
  IRendererProps,
  ISchema,
  NodeId,
  Registry,
  RenderMode,
} from './types';

/**
 * Множество dot-path'ов нод, чьи root-элементы — void HTML-элементы
 * (`input`, `hr`, `img` и т.п.), не принимающие дочерних узлов.
 *
 * Для таких нод overlay нельзя аппендить как ребёнка компонента —
 * рендерер вместо этого оборачивает нод в тонкий `<span
 * style="display:block; position:relative">`. `position:relative`
 * устанавливает containing block для absolute overlay; `display:block`
 * гарантирует создание бокса (а значит — реального containing block
 * для absolute-потомка). В отличие от `display:contents`, block-бокс
 * создаёт containing block без каких-либо оговорок (display:contents по
 * CSS-спеке не создаёт собственный бокс и position:relative на нём
 * игнорируется браузером, что приводит к позиционированию overlay
 * относительно ближайшего real-containing block, т.е. родительского
 * контейнера).
 *
 * `display:block` занимает ту же ширину (100% родителя), что и большинство
 * UI-инпут-компонентов в формах (full-width block). Высота обёртки
 * определяется содержимым void-элемента — layout-нейтрально для блочного
 * стека.
 *
 * Список расширяем: хост может передать свой `voidTypes` (не реализовано
 * в v1 — достаточно hard-coded реестра базовых примитивов).
 */
const VOID_NODE_TYPES = new Set([
  'ui.Input',
  'ui.Separator',
  'ui.Divider',
  'ui.Hr',
  'ui.Image',
  'ui.Img',
  'ui.Embed',
]);

/** Default-fallback для нерезолвящегося `type`: dev-warning + ничего. */
const DefaultFallback: Component<{ type: string; nodeId: NodeId }> = (p) => {
  console.warn(
    `[@capsuletech/renderer] cannot resolve component "${p.type}" for node "${p.nodeId}"`,
  );
  return null;
};

/**
 * Default-error-fallback: для runtime-ошибок из компонента ноды. DEV-логирует
 * ошибку через `console.error` (включая nodeId+type для трекинга) и возвращает
 * `null`. Host может передать кастомный `errorFallback` в `Renderer` props.
 *
 * Boundary per-RenderNode даёт **sibling isolation**: один кривой компонент
 * не положит соседей — fail-зона ограничена своим поддеревом.
 */
const DefaultErrorFallback: Component<IErrorFallbackProps> = (p) => {
  console.error(
    `[@capsuletech/renderer] runtime error in component "${p.type}" (node "${p.nodeId}"):`,
    p.error,
  );
  return null;
};

/**
 * Какие interactions активны в данном моде. Логика отрезана сюда, чтобы можно
 * было её расширить под `full` без правок рендера.
 *
 * `warnedInline` — per-Renderer-instance Set для дедупликации warn'ов. Без неё
 * каждый recompute мемо (правка schema-signal в редакторе → recompute) флудил
 * бы консоль одинаковыми предупреждениями про inline-interactions. Set создаётся
 * один раз в `Renderer` и переживает все recompute'ы.
 */
const activeInteractions = (
  list: IInteraction[] | undefined,
  mode: RenderMode,
  warnedInline: Set<string>,
): IInteraction[] => {
  if (!list || mode === 'static') return [];
  const out: IInteraction[] = [];
  for (const it of list) {
    if (it.ref) {
      out.push(it);
      continue;
    }
    if (it.inline && !warnedInline.has(it.id)) {
      warnedInline.add(it.id);
      if (mode === 'controlled') {
        console.warn(
          `[@capsuletech/renderer] interaction "${it.id}" has inline schema but mode is "controlled" — ignored. Use mode="full" once supported.`,
        );
      } else {
        // mode === 'full' — пока не реализовано, см. v1.2 (R3).
        console.warn(
          `[@capsuletech/renderer] interaction "${it.id}" inline schema requires mode="full" (not implemented yet).`,
        );
      }
    }
  }
  return out;
};

/**
 * Опциональная конвенция: wrapper-компонент (Controller / Feature из web-core)
 * МОЖЕТ выставить статический маркер `__capsuleKind` на самой функции —
 * `'controller'` или `'feature'`. Renderer использует его только для
 * **best-effort** валидации `IInteraction.kind` против реального вида wrapper'а.
 *
 * Если маркер отсутствует — валидация молчит. Это позволяет:
 * - использовать renderer с произвольными компонентами без шума;
 * - web-core'у opt-in'нуться позже (2 строки в `createLogicWrapper`);
 * - ловить опечатки в JSON-схеме (`kind: 'feature'` на Controller-wrapper'е).
 */
const getKindMarker = (Wrapper: unknown): 'controller' | 'feature' | undefined => {
  const v = (Wrapper as { __capsuleKind?: unknown })?.__capsuleKind;
  return v === 'controller' || v === 'feature' ? v : undefined;
};

/**
 * DEV-валидация схемы. Ловит распространённые ошибки в JSON, которые renderer
 * технически переживает (рендерит null / тихо пропускает), но host'у полезно
 * узнать в консоли. Каждый warn-кейс дедуплицируется через `warned` Set —
 * чтобы при правках через editor (новый schema-ref на каждое нажатие) не
 * флудить одним и тем же сообщением.
 *
 * Проверяется:
 * - `components.root` существует в `components.nodes`;
 * - каждый `nodes[key]` имеет `node.id === key` (иначе lookup по id развалится);
 * - все элементы `node.children` присутствуют в `nodes`;
 * - в каждом `node.children` нет дубликатов id (иначе `<For>` отрендерит
 *   узел дважды с непредсказуемым keying'ом).
 */
const validateSchema = (schema: ISchema, warned: Set<string>) => {
  const { root, nodes } = schema.components;
  const warn = (key: string, msg: string) => {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(`[@capsuletech/renderer] ${msg}`);
  };

  if (!(root in nodes)) {
    warn(
      `root-missing:${root}`,
      `root nodeId "${root}" not found in schema.components.nodes — nothing will render`,
    );
  }

  for (const [key, node] of Object.entries(nodes)) {
    if (node.id !== key) {
      warn(
        `id-mismatch:${key}:${node.id}`,
        `node at key "${key}" has node.id="${node.id}" — they must match, lookups go by key`,
      );
    }
    const seen = new Set<string>();
    for (const childId of node.children) {
      if (seen.has(childId)) {
        warn(
          `dup-child:${key}:${childId}`,
          `node "${key}" has duplicate child id "${childId}" — <For> will render duplicates`,
        );
      } else {
        seen.add(childId);
      }
      if (!(childId in nodes)) {
        warn(
          `missing-child:${key}:${childId}`,
          `node "${key}" references missing child id "${childId}"`,
        );
      }
    }
  }
};

interface IRenderNodeProps {
  nodeId: NodeId;
  schema: ISchema;
  registry: Registry;
  mode: RenderMode;
  fallback: Component<{ type: string; nodeId: NodeId }>;
  errorFallback: Component<IErrorFallbackProps>;
  /** Pre-indexed: nodeId → interactions, активные в текущем моде. */
  interactionsByNode: Record<NodeId, IInteraction[]>;
  /** Per-Renderer dedup для warn'ов о kind-mismatch (см. getKindMarker). */
  warnedKindMismatch: Set<string>;
  /**
   * Если задан — edit-decoration режим. Для каждой ноды рендерер монтирует
   * overlay `position:absolute; inset:0` внутри бокса ноды, без замеров.
   * Отсутствует → обычный путь рендера (prod-путь не задевается).
   */
  editOverlay?: Component<IEditOverlayProps>;
}

/**
 * Рендерит одну ноду + её детей рекурсивно. Оборачивает поддерево в
 * Controllers/Features из `interactionsByNode[nodeId]` (внешний interaction
 * — наружный wrapper).
 *
 * Используем `createComponent` напрямую вместо `<Dynamic>` — это то же, во
 * что компилируется обычный JSX `<X />`. Solid'овский `<Dynamic>` оборачивает
 * вызов компонента в `createMemo + untrack(c(others))`, что в нашем случае
 * (лениво-резолвящиеся Feature → Controller → Entity) ломает цепочку
 * `useCtx()` — Entity внутри отрендеренного через Renderer'а Controller'а
 * не видит ctx, UiProxy не подцепляется, события не доходят до Controller.
 */
const RenderNode: Component<IRenderNodeProps> = (props) => {
  const node = () => props.schema.components.nodes[props.nodeId];

  const resolved = createMemo(() => {
    const n = node();
    if (!n) return undefined;
    return resolvePath(props.registry, n.type);
  });

  /**
   * Создаёт JSX-компонент для текущей ноды. Все props читаются через **функ-
   * циональные источники** в `mergeProps` — так при изменении дерева
   * (`updateNode` / `addNode` / `removeNode`) изменения попадают в компонент
   * без полного re-mount (Solid диффит через `<For>`/реактивные пропы).
   *
   * `children` собирается реактивным getter'ом: если у ноды есть дети-узлы,
   * рендерим `<For>`; если нет — отдаём `props.children` из node.props
   * (текстовый контент для leaf'ов вроде `<Card.Title>CAPSULE</Card.Title>`).
   *
   * ### edit-decoration режим (`editOverlay` задан)
   *
   * Overlay монтируется без единого замера геометрии — только средствами CSS:
   * - корню ноды форсится `style: "position:relative"` через инжект в props
   *   (компоненты форвардят произвольные props в DOM — доказано `data-node-id`);
   * - overlay-элемент `position:absolute; inset:0` аппендится ПОСЛЕ реальных
   *   детей/текста (не сдвигает раскладку, не создаёт доп. flex/grid child);
   * - layout-identical: relative + absolute-ребёнок раскладку не двигают.
   *
   * **Void-ноды** (`ui.Input`, `ui.Separator`, `ui.Image` и т.п.) не принимают
   * детей — overlay нельзя аппендить внутрь. Для них нода оборачивается в
   * `<span style="display:contents; position:relative">`: `display:contents`
   * убирает span из box-model, `position:relative` создаёт containing block.
   * Overlay монтируется внутрь span'а как absolute-sibling void-элемента.
   * (Поддержка: Chrome 122+, Firefox 115+, Safari 17.4+ — приемлемо для
   * design-time редактора, см. VOID_NODE_TYPES.)
   */
  const renderedTree = () => {
    const n = node();
    if (!n) return null;
    const Comp = resolved();
    if (!Comp) {
      const Fb = props.fallback;
      return createComponent(Fb as any, { type: n.type, nodeId: n.id });
    }

    const EditOverlay = props.editOverlay;

    // Строим реальный children-getter — shared для обоих путей (edit / non-edit).
    const realChildrenGetter = () => {
      const cur = node();
      if (!cur) return null;
      if (cur.children.length === 0) {
        // Нет схема-детей → пропускаем `props.children` (текст) из самой ноды.
        return cur.props?.children as any;
      }
      return (
        <For each={node()?.children ?? []}>
          {(childId) => (
            <RenderNode
              nodeId={childId}
              schema={props.schema}
              registry={props.registry}
              mode={props.mode}
              fallback={props.fallback}
              errorFallback={props.errorFallback}
              interactionsByNode={props.interactionsByNode}
              warnedKindMismatch={props.warnedKindMismatch}
              editOverlay={props.editOverlay}
            />
          )}
        </For>
      );
    };

    if (!EditOverlay) {
      // Обычный путь — prod-код не задевается.
      const mergedNodeProps = mergeProps(() => node()?.props ?? {}, {
        get meta() {
          return node()?.meta;
        },
        get styles() {
          // Renderer не интерпретирует styles — просто прокидывает host'у. Host
          // (Component или Controller-wrapper через UiProxy) решает, как
          // применить: смержить в class через `createStyle`, отдать в `style`-attr,
          // или проигнорировать. Стабильно реактивно через getter.
          return node()?.styles;
        },
        get children() {
          return realChildrenGetter();
        },
      });
      return createComponent(Comp as any, mergedNodeProps);
    }

    // --- edit-decoration путь ---
    //
    // Захватываем nodeId/node для overlay реактивно через getter'ы.
    // Overlay перемонтируется дёшево (просто компонент), поддерево ноды
    // стабильно (renderSig-механизм выше этого не трогает).
    const isVoid = VOID_NODE_TYPES.has(n.type);

    // Overlay-mount: position:absolute; inset:0 — покрывает весь бокс ноды.
    // pointer-events управляется хостом внутри EditOverlay-компонента.
    const overlayMount = () =>
      createComponent(EditOverlay, {
        get nodeId() {
          return node()?.id ?? props.nodeId;
        },
        get node() {
          return node() as IEditorNode;
        },
      });

    if (isVoid) {
      // Void-нода: компонент не принимает children → overlay нельзя вставить
      // внутрь. Оборачиваем в display:block span, который создаёт реальный
      // containing block (position:relative + display:block). display:contents
      // НЕ используется: по CSS-спеке elements with display:contents не
      // создают own box, поэтому position:relative на них игнорируется —
      // absolute-потомок позиционируется по ближайшему real containing block
      // (родительскому контейнеру), что накрывало бы весь родитель, а не
      // сам инпут.
      const voidComp = createComponent(
        Comp as any,
        mergeProps(() => node()?.props ?? {}, {
          get meta() {
            return node()?.meta;
          },
          get styles() {
            return node()?.styles;
          },
        }),
      );
      return (
        <span style="display:block; position:relative">
          {voidComp}
          <span style="position:absolute; inset:0; pointer-events:none" aria-hidden="true">
            {overlayMount()}
          </span>
        </span>
      );
    }

    // Не-void нода: форсим position:relative на корне компонента через инжект
    // в props. Компоненты форвардят произвольные style-атрибуты в DOM-корень
    // (доказано тем, что data-node-id долетает). Overlay аппендится ПОСЛЕ
    // реальных детей — не сдвигает раскладку (absolute-позиционирован).
    const mergedEditProps = mergeProps(() => node()?.props ?? {}, {
      get style() {
        // Форсируем position:relative; хост может дополнять через node.props.style,
        // но position:relative обязателен для containing block overlay.
        const nodeStyle = (node()?.props as any)?.style;
        if (typeof nodeStyle === 'string') return `position:relative; ${nodeStyle}`;
        if (nodeStyle && typeof nodeStyle === 'object')
          return { position: 'relative' as const, ...nodeStyle };
        return 'position:relative';
      },
      get meta() {
        return node()?.meta;
      },
      get styles() {
        return node()?.styles;
      },
      get children() {
        const realChildren = realChildrenGetter();
        // Overlay идёт после реальных детей — absolute-позиционирован, не
        // создаёт нового flex/grid-child и не двигает раскладку.
        return (
          <>
            {realChildren}
            <span style="position:absolute; inset:0; pointer-events:none" aria-hidden="true">
              {overlayMount()}
            </span>
          </>
        );
      },
    });
    return createComponent(Comp as any, mergedEditProps);
  };

  // Оборачиваем поддерево wrapper'ами из interactions. Первый interaction в
  // массиве — самый наружный wrapper; идём с конца, чтобы вложение получалось
  // <A><B>{node}</B></A>.
  //
  // КРИТИЧЕСКОЕ: внутреннее поддерево строится **через thunk-цепочку**, не
  // как готовое JSX-значение. `createComponent(Comp, ...)` синхронно вызывает
  // `Comp(props)` — то есть жадно выполняет компонент в **текущем** owner'е.
  // Если построить inner и потом обернуть его в Wrapper — Comp успеет
  // отработать ДО того, как Wrapper установит свой Context.Provider, и
  // `useCtx()` внутри Entity вернёт `undefined`.
  //
  // Поэтому каждый шаг цикла копит **функцию**, которая создаст inner; в
  // children-getter родительского wrapper'а эта функция и вызывается — уже
  // внутри его Context.Provider, где ctx уже выставлен.
  const wrapped = () => {
    const its = props.interactionsByNode[props.nodeId];
    if (!its || its.length === 0) return renderedTree();
    let buildAcc: () => any = () => renderedTree();
    for (let i = its.length - 1; i >= 0; i--) {
      const it = its[i];
      const Wrapper = it.ref
        ? (resolvePath(props.registry, it.ref) as Component<any> | undefined)
        : undefined;
      if (!Wrapper) {
        console.warn(
          `[@capsuletech/renderer] interaction "${it.id}" ref "${it.ref}" not found in registry — skipped.`,
        );
        continue;
      }
      // Best-effort kind validation. Если у Wrapper'а есть `__capsuleKind` маркер
      // и он не совпадает с `it.kind` — DEV-warn (один раз per Renderer instance).
      // Если маркера нет — молчим. Wrapper всё равно применяется.
      const marker = getKindMarker(Wrapper);
      if (marker && marker !== it.kind && !props.warnedKindMismatch.has(it.id)) {
        props.warnedKindMismatch.add(it.id);
        console.warn(
          `[@capsuletech/renderer] interaction "${it.id}" declares kind="${it.kind}" but ref "${it.ref}" is a ${marker}. JSON likely misclassifies it. Wrapper still applied.`,
        );
      }
      const prevBuild = buildAcc;
      const wrapperPropsStatic = it.props ?? {};
      buildAcc = () =>
        createComponent(Wrapper as any, {
          ...wrapperPropsStatic,
          get children() {
            return prevBuild();
          },
        });
    }
    return buildAcc();
  };

  // Реактивность wrapped() — компромисс между «полной» реактивностью и
  // «стабильным mount'ом» вложенных Controllers/Features. `wrapped()` сам по
  // себе пересобирает thunk-chain createComponent'ов — если делать его
  // плоским memo, на КАЖДОЕ изменение schema-props (label, etc.) все
  // Controllers re-init'нутся, что в редакторе мёртво.
  //
  // Решение: вычисляем `renderSig` через createMemo с *внутренней*
  // reducer-семантикой — return prev если **материальные** атрибуты не
  // изменились, return next иначе. Материальные для wrap-chain:
  //   - node.type (резолвится в Comp; смена → swap компонента);
  //   - interactions[].id+ref+kind (chain wrapper'ов изменился);
  //   - props.fallback (для unresolved-type случая).
  // Изменения node.props/meta/children проходят мимо sig'а и обрабатываются
  // как обычно — через реактивные getter'ы в `mergedProps` (стабильный mount).
  //
  // Дальше — `<For each={[renderSig()]}>{() => <InnerTree />}</For>`:
  // однооэлементный массив для контролируемого re-mount'а. `For` диффит по
  // item-identity (===), так что пока sig() возвращает тот же ref, InnerTree
  // остаётся mount'нутым; новый ref → For re-mount'ит → wrapped() пересобирает
  // chain свежий.
  //
  // ErrorBoundary остаётся снаружи: throw из createComponent в `wrapped()`
  // проходит через render-computation InnerTree (он — Component, его body
  // под catchError'ом), и boundary ловит. Прямой `<EB>{() => wrapped()}</EB>`
  // в solid-js 1.9.x не ловит — поэтому Component-обёртка обязательна.
  // Аналогично, `<Show keyed>` не годится — там function-child ломает та же
  // catchError-граница.
  type RenderSig = {
    type: string | undefined;
    its: IInteraction[] | undefined;
    fallback: Component<{ type: string; nodeId: NodeId }>;
  };
  const renderSig = createMemo((prev: RenderSig | undefined): RenderSig => {
    const next: RenderSig = {
      type: node()?.type,
      its: props.interactionsByNode[props.nodeId],
      fallback: props.fallback,
    };
    if (!prev) return next;
    if (prev.type !== next.type) return next;
    if (prev.fallback !== next.fallback) return next;
    const a = prev.its;
    const b = next.its;
    if (a !== b) {
      if (!a || !b || a.length !== b.length) return next;
      for (let i = 0; i < a.length; i++) {
        const x = a[i];
        const y = b[i];
        if (x.id !== y.id || x.ref !== y.ref || x.kind !== y.kind) return next;
      }
    }
    return prev; // ничего материального не изменилось — оставляем тот же ref
  });

  const InnerTree: Component = () => wrapped() as unknown as JSX.Element;

  // `<For each={[renderSig()]}>` — однооэлементный массив для контролируемого
  // re-mount'а. `For` диффит по item identity (по умолчанию): пока
  // `renderSig()` возвращает тот же ref (custom equals в memo → no material
  // change), item-ссылка стабильна, InnerTree остаётся mount'нутым,
  // schema-props (label и т.п.) обновляются через `mergedProps` getter'ы.
  // Когда `renderSig()` эмитит новую ссылку, item меняется, `For` re-mount'ит
  // InnerTree → `wrapped()` пересобирает chain свежий.
  //
  // ErrorBoundary остаётся снаружи: InnerTree — Component, его body
  // выполняется в render-computation, попадающую под `catchError`.
  return (
    <ErrorBoundary
      fallback={(error, reset) =>
        createComponent(props.errorFallback as any, {
          type: node()?.type ?? 'unknown',
          nodeId: props.nodeId,
          error,
          reset,
        })
      }
    >
      <For each={[renderSig()]}>{() => <InnerTree />}</For>
    </ErrorBoundary>
  );
};

/**
 * Public entry. Принимает schema + registry, рендерит дерево от root'а.
 *
 * Renderer — это «обобщённый Widget»: композиция Entity-узлов + навешенных
 * Controllers/Features. Используется и в редакторе (превью), и в host-app
 * (production-render), что гарантирует идентичный рендер в обоих контекстах.
 */
export const Renderer: Component<IRendererProps> = (props) => {
  const mode = () => props.mode ?? 'controlled';
  const fallback = () => props.fallback ?? DefaultFallback;
  const errorFallback = () => props.errorFallback ?? DefaultErrorFallback;

  // Per-instance dedup для inline-warn'ов. `Set` живёт в closure'е мемо,
  // сбрасывается при unmount/remount Renderer'а — что и нужно (новый
  // монтаж = новая сессия, warn-ы снова актуальны).
  const warnedInline = new Set<string>();
  // Аналогичный Set для kind-mismatch (см. getKindMarker).
  const warnedKindMismatch = new Set<string>();
  // И для validateSchema (missing root, dup children, id-mismatch и т.п.).
  const warnedSchemaIssues = new Set<string>();

  // DEV-validation. Запускается на каждое изменение `props.schema`, но
  // warn'ит каждую уникальную проблему только один раз.
  createEffect(() => {
    validateSchema(props.schema, warnedSchemaIssues);
  });

  const interactionsByNode = createMemo(() => {
    const idx: Record<NodeId, IInteraction[]> = {};
    for (const it of activeInteractions(props.schema.interactions, mode(), warnedInline)) {
      if (!idx[it.nodeId]) idx[it.nodeId] = [];
      idx[it.nodeId].push(it);
    }
    return idx;
  });

  return (
    <Suspense fallback={props.loadingFallback}>
      <RenderNode
        nodeId={props.schema.components.root}
        schema={props.schema}
        registry={props.registry}
        mode={mode()}
        fallback={fallback()}
        errorFallback={errorFallback()}
        interactionsByNode={interactionsByNode()}
        warnedKindMismatch={warnedKindMismatch}
        editOverlay={props.editOverlay}
      />
    </Suspense>
  );
};
