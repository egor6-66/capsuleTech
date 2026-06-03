/**
 * Canvas — рабочая область конструктора (main-панель).
 *
 * АРХИТЕКТУРА: edit-decoration через `editOverlay` контракт web-renderer
 * (ADR 031). Никаких geometry-замеров, ResizeObserver, tick или абсолютного
 * оверлей-слоя. Размер chrome-обводки берётся из CSS (position:absolute; inset:0
 * внутри бокса ноды). Canvas только:
 *   - рендерит дерево через `<Renderer editOverlay={CanvasOverlay} …/>`;
 *   - управляет DnD-дропом (drop-zone + intent → applyDrop);
 *   - синкает dropTargetId со стором для кросс-подсветки с деревом.
 *
 * DnD-логика (резолв цели/позиции, применение) — общий слой `editor/dnd.ts`.
 *
 * interactive-тоггл: сигнал `interactive`. При true — editOverlay не передаётся
 * в Renderer, компоненты получают события (живой режим), подсветки нет.
 */
import { createDroppable, useDnD } from '@capsuletech/web-dnd';
import {
  type IEditOverlayProps,
  type ISchema,
  type Registry,
  Renderer,
} from '@capsuletech/web-renderer';
import { createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js';
import {
  applyDrop,
  canInto,
  canvasIntent,
  type DragSpec,
  type DropIntent,
  dragSpec,
} from '../editor/dnd';
import { useEditor } from '../editor/store';

/** Полупрозрачная заливка из цвета (работает и с hex, и с var(--primary)). */
const fill = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/**
 * CanvasOverlay — edit-decoration для одной ноды.
 *
 * Рендерер монтирует этот компонент ВНУТРИ бокса каждой ноды
 * (`position:absolute; inset:0`). Размер = размер ноды из CSS, без замеров.
 * pointer-events:auto → клики доходят сюда, не до живых компонентов.
 *
 * Цветовая логика:
 *   - метка доминирует над ВСЕМИ видами подсветки;
 *   - drag: цель → яркая обводка+заливка; кандидат → слабая обводка; метка → бледная;
 *   - покой: выделен → яркая обводка+заливка; метка → бледная обводка+заливка;
 *   - обводка = inset box-shadow (не border — не сдвигает раскладку);
 *   - линия-вставки: beforeId-нода рисует полосу на лидирующей кромке;
 *     parentId (если beforeId===null) рисует полосу на хвостовой кромке.
 *     Ориентация: getComputedStyle(parent) на flex-direction/grid — только
 *     во время drag, не geometry-замер.
 */
const CanvasOverlay = (
  p: IEditOverlayProps & {
    // Инжектируются через closure из Canvas (ниже).
    _getState: () => CanvasOverlayState;
  },
) => {
  const { nodeId } = p;
  const s = () => p._getState();

  /** Цвет ноды: метка доминирует. */
  const color = () => s().marks[nodeId] ?? 'var(--primary)';
  const marked = () => s().marks[nodeId] != null;
  const spec = () => s().spec;
  const tgt = () => s().dropTargetId;
  const sel = () => s().selectedId;
  const it = () => s().intent;
  /**
   * Глубина узла → z-index оверлея. Чем ГЛУБЖЕ узел, тем БОЛЬШЕ индекс, поэтому
   * оверлей вложенного всегда лежит ПОВЕРХ родительского и первым ловит клик →
   * корректный выбор самого внутреннего узла под курсором + компоненты инертны
   * (нативный клик/фокус до них не доходит). Все оверлеи соревнуются в одном
   * корневом stacking-context'е (узлы — position:relative без z-index).
   */
  const depth = () => s().depth[nodeId] ?? 0;

  /**
   * Ориентация родительского контейнера.
   * Вызывается только во время drag (когда intent не null) — style-запрос,
   * не geometry-замер. Функция результат не кэширует намеренно: drag-фаза короткая.
   */
  const isParentRow = (parentId: string): boolean => {
    const el = document.querySelector(`[data-node-id="${parentId}"]`);
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display.includes('flex')) return cs.flexDirection.startsWith('row');
    if (cs.display.includes('grid')) {
      return cs.gridTemplateColumns.split(' ').filter((t) => t && t !== 'none').length > 1;
    }
    return false;
  };

  /**
   * box-shadow-стиль для обводки.
   * drag-режим перекрывает idle-режим полностью.
   */
  const ringStyle = (): string | undefined => {
    const c = color();
    const sp = spec();
    if (sp) {
      if (tgt() === nodeId) return `inset 0 0 0 2px ${c}`;
      if (canInto(s().tree, sp, nodeId)) return `inset 0 0 0 1px ${c}`;
      if (marked()) return `inset 0 0 0 1px ${c}`;
      return undefined;
    }
    if (sel() === nodeId) return `inset 0 0 0 2px ${c}`;
    if (marked()) return `inset 0 0 0 1px ${c}`;
    return undefined;
  };

  const bgStyle = (): string | undefined => {
    const c = color();
    const sp = spec();
    if (sp) {
      if (tgt() === nodeId) return fill(c, 12);
      if (marked()) return fill(c, 6);
      return undefined;
    }
    if (sel() === nodeId) return fill(c, 14);
    if (marked()) return fill(c, 6);
    return undefined;
  };

  /**
   * Линия-вставки.
   * - Если intent.beforeId === nodeId → полоса на лидирующей кромке.
   * - Если intent.parentId === nodeId && beforeId === null → полоса на хвостовой кромке.
   * Ориентация = ориентация родителя (getComputedStyle — разово, во время drag).
   */
  const insertionSide = (): 'leading' | 'trailing' | null => {
    const intent = it();
    if (!intent) return null;
    if (intent.beforeId === nodeId) return 'leading';
    if (intent.parentId === nodeId && intent.beforeId === null) return 'trailing';
    return null;
  };

  const insertionIsRow = (): boolean => {
    const intent = it();
    if (!intent) return false;
    // Для beforeId-кейса ориентация = ориентация РОДИТЕЛЯ ноды.
    // Для trailing-кейса (parentId) = ориентация ЭТОЙ ноды.
    return isParentRow(intent.parentId);
  };

  const lineClass = (side: 'leading' | 'trailing', row: boolean): string => {
    if (row) {
      return side === 'leading'
        ? 'pointer-events-none absolute inset-y-0 -left-px w-0.5 rounded'
        : 'pointer-events-none absolute inset-y-0 -right-px w-0.5 rounded';
    }
    return side === 'leading'
      ? 'pointer-events-none absolute inset-x-0 -top-px h-0.5 rounded'
      : 'pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded';
  };

  return (
    <>
      {/* База: всегда-перехватывающий слой. z-index=depth → глубокий узел ловит
          клик первым (правильный innermost-select); компоненты под ним инертны.
          Во время drag — pointer-events:none, чтобы не мешать dnd. Chrome
          (обводка/заливка) применяется поверх той же ноды. */}
      <div
        class="absolute inset-0 cursor-pointer rounded-sm"
        style={{
          'z-index': `${depth()}`,
          'pointer-events': spec() ? 'none' : 'auto',
          'box-shadow': ringStyle(),
          'background-color': bgStyle(),
        }}
        onClick={(e) => {
          e.stopPropagation();
          s().onSelect(nodeId);
        }}
      />
      <Show when={insertionSide()}>
        {(side) => (
          <div
            class={lineClass(side(), insertionIsRow())}
            style={{ 'background-color': color(), 'z-index': '9999' }}
          />
        )}
      </Show>
    </>
  );
};

/** Состояние, которое CanvasOverlay читает через closure (_getState). */
interface CanvasOverlayState {
  spec: DragSpec | null;
  dropTargetId: string | null;
  selectedId: string | null;
  intent: DropIntent | null;
  marks: Record<string, string>;
  /** nodeId → глубина в дереве (для z-index оверлеев). */
  depth: Record<string, number>;
  tree: ReturnType<ReturnType<typeof useEditor>['tree']>;
  onSelect: (id: string) => void;
}

const Canvas = Widget((Ui) => {
  const { tree, setTree, dropTargetId, setDropTargetId, selectedId, setSelectedId, marks } =
    useEditor();
  const registry = { ui: Ui } as unknown as Registry;
  const dnd = useDnD();

  /**
   * interactive-тоггл: true → editOverlay не передаётся, компоненты живые.
   * UI-кнопки нет (пока), но проводка готова.
   */
  const [interactive, setInteractive] = createSignal(false);
  // Подавить неиспользуемую переменную предупреждения — в будущем пробрасывается в тулбар.
  void setInteractive;

  const spec = (): DragSpec | null => dragSpec(dnd.state.activeData());

  // ── DnD-дроп ──────────────────────────────────────────────────────────────
  const drop = createDroppable({
    id: 'canvas-root',
    accepts: (d) => dragSpec(d) != null,
    onDrop: (d, info) => {
      const s = dragSpec(d);
      if (!s) return;
      const it = canvasIntent(tree(), s, info.pointer.x, info.pointer.y);
      if (it) setTree(applyDrop(tree(), s, it));
    },
  });

  // Локальный intent (для линии-вставки) — только когда курсор над канвасом.
  const intent = createMemo<DropIntent | null>(() => {
    const s = spec();
    const pt = dnd.state.pointer();
    if (!s || !pt || !drop.isOver()) return null;
    return canvasIntent(tree(), s, pt.x, pt.y);
  });

  // Двусторонний синк цели с деревом.
  createEffect(() => {
    if (!dnd.state.activeData() || dnd.state.overId() == null) {
      setDropTargetId(null);
      return;
    }
    if (drop.isOver()) setDropTargetId(intent()?.parentId ?? null);
  });
  onCleanup(() => setDropTargetId(null));

  /** Клик по ноде (через data-node-id) → выделить; повторный — снять. */
  const onCanvasClick = (e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-node-id]') as HTMLElement | null;
    const id = el?.dataset.nodeId ?? null;
    setSelectedId((cur) => (cur === id ? null : id));
  };

  /** select из оверлея: повторный клик по активной — снять. */
  const onSelect = (id: string) => setSelectedId((cur) => (cur === id ? null : id));

  // ── renderSchema: добавляем data-node-id в props каждой ноды ──────────────
  const renderSchema = (): ISchema => {
    const src = tree();
    const nodes: ISchema['components']['nodes'] = {};
    for (const [id, n] of Object.entries(src.nodes)) {
      nodes[id] = { ...n, props: { ...n.props, 'data-node-id': id } };
    }
    return { components: { root: src.root, nodes } };
  };

  const isEmpty = () => tree().nodes[tree().root].children.length === 0;

  /** nodeId → глубина (root=0). Для z-index оверлеев: глубже = выше. */
  const depthMap = createMemo(() => {
    const t = tree();
    const d: Record<string, number> = {};
    const walk = (id: string, depth: number) => {
      d[id] = depth;
      for (const c of t.nodes[id]?.children ?? []) walk(c, depth + 1);
    };
    walk(t.root, 0);
    return d;
  });

  /**
   * Состояние для CanvasOverlay. Передаётся через замыкание (_getState),
   * а не через props-объект, чтобы не создавать лишний reactive Component-prop.
   * CanvasOverlay читает сигналы напрямую — fine-grained реактивность Solid'а.
   */
  const overlayState = (): CanvasOverlayState => ({
    spec: spec(),
    dropTargetId: dropTargetId(),
    selectedId: selectedId(),
    intent: intent(),
    marks: marks(),
    depth: depthMap(),
    tree: tree(),
    onSelect,
  });

  /**
   * Компонент-обёртка, чтобы передать _getState через closure.
   * Создаётся ОДИН РАЗ при инициализации Widget-factory — ссылка стабильна.
   * `overlayState()` вызывается внутри CanvasOverlay при каждом render-вызове
   * (fine-grained реактивность Solid'а), так что данные всегда свежие.
   */
  const OverlayComponent = (p: IEditOverlayProps) =>
    CanvasOverlay({ ...p, _getState: overlayState });

  return (
    <div class="flex h-full flex-col">
      <div
        ref={drop.ref}
        class="relative min-h-0 flex-1 overflow-auto"
        classList={{ 'bg-primary/5': spec() != null }}
        onClick={onCanvasClick}
      >
        <div class="relative min-h-full w-full">
          <Renderer
            schema={renderSchema()}
            registry={registry}
            mode="static"
            editOverlay={interactive() ? undefined : OverlayComponent}
          />

          <Show when={isEmpty()}>
            <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-foreground/40">
              Перетащите компонент из палитры
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
});

export default Canvas;
