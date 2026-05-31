/**
 * Palette — палитра компонентов (верхняя секция сайдбара конструктора).
 *
 * Источник — манифесты `@capsuletech/web-ui-creator/manifests`. Раскладка:
 *   - простые категории (Контролы, Обёртки, …) — плоский левый список;
 *   - контейнеры — с вложенными составными частями, которые контейнер реально
 *     принимает (`canAcceptChild`). Card-части идут под Card, Field-части под
 *     Field; Field не покажет Card Header, т.к. `accepts` его не пускает.
 *
 * Элементы — по контенту (`items-start`, без растяжки) и draggable (web-dnd):
 * тащим `{ source:'palette', type }`, drop на canvas добавляет ноду.
 */
import { createDraggable } from '@capsuletech/web-dnd';
import {
  type ComponentCategory,
  canAcceptChild,
  getCategories,
  type IComponentManifest,
  listByCategory,
} from '@capsuletech/web-ui-creator/manifests';
import { For, Show } from 'solid-js';

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  control: 'Контролы',
  typography: 'Типографика',
  container: 'Контейнеры',
  composite: 'Составные',
  feedback: 'Фидбек',
  wrapper: 'Обёртки',
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
  const partsOf = (containerType: string): IComponentManifest[] =>
    composites.filter((c) => canAcceptChild(containerType, c.type));

  return (
    <div class="flex h-full flex-col">
      <div class="shrink-0 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
        Палитра
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <For each={getCategories().filter((c) => c !== 'composite')}>
          {(cat) => (
            <div class="mb-3">
              <div class="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div class="flex flex-col items-start gap-0.5">
                <For each={listByCategory(cat)}>
                  {(m) => (
                    <>
                      <Item m={m} />
                      <Show when={cat === 'container'}>
                        <div class="ml-3 flex flex-col items-start gap-0.5 border-l border-border/50 pl-2">
                          <For each={partsOf(m.type)}>{(c) => <Item m={c} />}</For>
                        </div>
                      </Show>
                    </>
                  )}
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
