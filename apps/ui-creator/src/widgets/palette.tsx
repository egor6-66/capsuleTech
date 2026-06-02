/**
 * Palette — палитра компонентов (верхняя секция сайдбара конструктора).
 *
 * Источник — манифесты `@capsuletech/web-ui-creator/manifests`. Раскладка:
 *   - простые категории (Контролы, Обёртки, …) — плоский левый список;
 *   - контейнеры — с вложенными составными частями, которые контейнер реально
 *     принимает (`canAcceptChild`). Card-части идут под Card, Field-части под
 *     Field; Field не покажет Card Header, т.к. `accepts` его не пускает.
 *     Контейнер с частями схлопывается чевроном (Card/Field); без частей
 *     (Grid/Flex/Group) — обычный плоский элемент.
 *
 * Элементы — по контенту (`items-start`, без растяжки) и draggable (web-dnd):
 * тащим `{ source:'palette', type }`, drop на canvas добавляет ноду.
 */
import { createDraggable } from '@capsuletech/web-dnd';
import {
  type ComponentCategory,
  canAcceptChild,
  getCategories,
  getManifest,
  type IComponentManifest,
  listByCategory,
} from '@capsuletech/web-ui-creator/manifests';
import { createSignal, For, Show } from 'solid-js';

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  control: 'Контролы',
  typography: 'Типографика',
  container: 'Контейнеры',
  composite: 'Составные',
  feedback: 'Фидбек',
  wrapper: 'Обёртки',
};

/** Порядок контейнеров в палитре: layout вперёд, Card/Field — в конец. */
const CONTAINER_ORDER = [
  'ui.Layout.Grid',
  'ui.Layout.Flex',
  'ui.Group',
  'ui.List',
  'ui.Card',
  'ui.Field',
];
const orderRank = (type: string): number => {
  const i = CONTAINER_ORDER.indexOf(type);
  return i < 0 ? CONTAINER_ORDER.length : i;
};

const Item = (props: { m: IComponentManifest }) => {
  const drag = createDraggable({
    id: `palette:${props.m.type}`,
    data: () => ({ source: 'palette', type: props.m.type }),
  });
  return (
    <button
      ref={drag.ref}
      type="button"
      title={props.m.description}
      class="flex cursor-grab items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent/50 active:cursor-grabbing"
      classList={{ 'opacity-40': drag.isDragging() }}
    >
      <span class="shrink-0 text-foreground/60">{props.m.icon()}</span>
      <span>{props.m.label}</span>
    </button>
  );
};

const Palette = Widget(() => {
  const composites = listByCategory('composite');
  // Вложенные части — только у composite-owner'ов (Card/Field с явным `accepts`).
  // Контейнеры без `accepts` (Grid/Flex) принимают всё → не подтягиваем под них части.
  const partsOf = (containerType: string): IComponentManifest[] =>
    getManifest(containerType)?.accepts
      ? composites.filter((c) => canAcceptChild(containerType, c.type))
      : [];

  /** Контейнер в палитре: если есть вложенные части — схлопывается чевроном (по умолчанию свёрнут). */
  const ContainerItem = (props: { m: IComponentManifest }) => {
    const parts = partsOf(props.m.type);
    const [open, setOpen] = createSignal(false);
    return (
      <div class="flex flex-col items-start gap-0.5">
        <div class="flex items-center gap-0.5">
          <Show when={parts.length > 0} fallback={<span class="size-4 shrink-0" />}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open() ? 'Свернуть' : 'Развернуть'}
              class="flex size-4 shrink-0 items-center justify-center text-foreground/40 transition-transform hover:text-foreground"
              classList={{ 'rotate-90': open() }}
            >
              ›
            </button>
          </Show>
          <Item m={props.m} />
        </div>
        <Show when={parts.length > 0 && open()}>
          <div class="ml-3 flex flex-col items-start gap-0.5 border-l border-border/50 pl-2">
            <For each={parts}>{(c) => <Item m={c} />}</For>
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div class="flex h-full flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <For each={getCategories().filter((c) => c !== 'composite')}>
          {(cat) => (
            <div class="mb-3">
              <div class="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div class="flex flex-col items-start gap-0.5">
                <For
                  each={
                    cat === 'container'
                      ? [...listByCategory(cat)].sort((a, b) => orderRank(a.type) - orderRank(b.type))
                      : listByCategory(cat)
                  }
                >
                  {(m) => (cat === 'container' ? <ContainerItem m={m} /> : <Item m={m} />)}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
});

export default Palette;
