/**
 * Canvas — рабочая область конструктора (main-панель).
 *
 * Держит редактируемое дерево (`IEditorTree`) и рендерит его через
 * `@capsuletech/web-renderer`. Drop из палитры (`web-dnd`) добавляет ноду
 * pure-операцией `addNode` в тот контейнер, над которым отпустили.
 *
 * Render-схема = дерево + редакторские инъекции (исходное дерево не трогаем):
 *  - `data-node-id` на каждую ноду → по нему находим target-контейнер при drop;
 *  - ЛЮБОМУ контейнеру-приёмнику — `min-height` (`ROOM`): пустой → есть куда
 *    прицелиться; непустой → остаётся место добавить ещё (контент не схлопывает
 *    контейнер до своей высоты). Пустому дополнительно — dashed-рамка;
 *  - пока тащим: валидные цели получают маркер `data-drop-ok`, а CSS
 *    (`DROP_HL_CSS`) рисует слабый ring на всех и ЯРЧЕ — только на самой
 *    внутренней под курсором (`:hover:not(:has(...))` отсекает предков). `:hover`
 *    во время pointer-драга работает — web-dnd не делает pointer-capture.
 *
 * Правило drop (`canDropInto`): составную часть (`composite`) пускаем только в
 * контейнер, который её ЯВНО принимает (`Field` → `Field Label`); root-`Grid`
 * её отвергнет. Остальное — по `canAcceptChild`.
 *
 * Состояние дерева — общий `useEditor()` стор (тот же, что у Tree): Canvas рисует
 * и мутирует через `setTree`, Tree читает. Provider живёт в Constructor.
 */
import { createDroppable, useDnD } from '@capsuletech/web-dnd';
import { type ISchema, type Registry, Renderer } from '@capsuletech/web-renderer';
import { addNode } from '@capsuletech/web-ui-creator/state';
import { Show } from 'solid-js';
import { acceptsChildren, canDropInto } from '../editor/rules';
import { useEditor } from '../editor/store';

const ROOM = 'min-h-12';
const EMPTY_CUE = 'rounded-md outline-dashed outline-1 outline-border/60';
/**
 * Подсветка drop-целей через CSS по маркеру `data-drop-ok`:
 *  - все валидные цели — слабый inset-ring;
 *  - самая ВНУТРЕННЯЯ под курсором — ярче; `:not(:has([data-drop-ok]:hover))`
 *    отсекает предков (у них есть hovered-потомок-цель → они не подсвечиваются).
 */
const DROP_HL_CSS =
  '[data-drop-ok]{box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--primary) 35%,transparent)}' +
  '[data-drop-ok]:hover:not(:has([data-drop-ok]:hover))' +
  '{box-shadow:inset 0 0 0 2px var(--primary);background-color:color-mix(in oklch,var(--primary) 12%,transparent)}';

const Canvas = Widget((Ui) => {
  const { tree, setTree } = useEditor();
  const registry = { ui: Ui } as unknown as Registry;
  const dnd = useDnD();

  /** Тип тащимого компонента из палитры (или null). */
  const draggedType = (): string | null => {
    const a = dnd.state.activeData();
    return a && a.source === 'palette' && typeof a.type === 'string' ? a.type : null;
  };

  const renderSchema = (): ISchema => {
    const src = tree();
    const dragType = draggedType();
    const nodes: ISchema['components']['nodes'] = {};
    for (const [id, n] of Object.entries(src.nodes)) {
      const accepts = acceptsChildren(n);
      const valid = dragType != null && id !== src.root && canDropInto(n.type, dragType);
      const cls = [
        n.props.class,
        accepts ? ROOM : '',
        accepts && n.children.length > 0 ? 'pb-6' : '',
        accepts && n.children.length === 0 ? EMPTY_CUE : '',
      ]
        .filter(Boolean)
        .join(' ');
      nodes[id] = {
        ...n,
        props: {
          ...n.props,
          'data-node-id': id,
          ...(valid ? { 'data-drop-ok': '' } : {}),
          ...(cls ? { class: cls } : {}),
        },
      };
    }
    return { components: { root: src.root, nodes } };
  };

  const isEmpty = () => tree().nodes[tree().root].children.length === 0;

  /** Тащим то, что принимает root → канва (root) — валидная цель (фон-подсветка). */
  const rootValid = (): boolean => {
    const dt = draggedType();
    return dt ? canDropInto(tree().nodes[tree().root].type, dt) : false;
  };

  /** Ближайшая нода с `data-node-id` под точкой (или root). */
  const resolveTargetId = (x: number, y: number): string => {
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    while (el) {
      const id = el.dataset.nodeId;
      if (id && tree().nodes[id]) return id;
      el = el.parentElement;
    }
    return tree().root;
  };

  const drop = createDroppable({
    id: 'canvas-root',
    accepts: (d) => d.source === 'palette' && typeof d.type === 'string',
    onDrop: (d, info) => {
      const type = d.type as string;
      const targetId = resolveTargetId(info.pointer.x, info.pointer.y);
      const target = tree().nodes[targetId];
      if (!target || !canDropInto(target.type, type)) return;
      try {
        const { tree: next } = addNode(tree(), { type, parentId: targetId });
        setTree(next);
      } catch {
        /* EditorOpError — тихо игнорим */
      }
    },
  });

  return (
    <div class="flex h-full flex-col">
      <style>{DROP_HL_CSS}</style>
      <div class="shrink-0 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
        Canvas
      </div>
      <div
        ref={drop.ref}
        class="relative min-h-0 flex-1 overflow-auto p-4 transition-colors"
        classList={{ 'bg-primary/5': rootValid() }}
      >
        <Show
          when={!isEmpty()}
          fallback={
            <div class="flex h-full items-center justify-center text-sm text-foreground/40">
              Перетащите компонент из палитры
            </div>
          }
        >
          <Renderer schema={renderSchema()} registry={registry} mode="static" />
        </Show>
      </div>
    </div>
  );
});

export default Canvas;
