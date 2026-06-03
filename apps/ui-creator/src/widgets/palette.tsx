/**
 * Palette — палитра компонентов (верхняя секция сайдбара конструктора).
 *
 * Источник — манифесты `@capsuletech/web-ui-creator/manifests`. Раскладка:
 *   - простые категории (Контролы, Типографика, …) — плоский список;
 *   - контейнеры/композиции (Card/Field) — со вложенными частями под чевроном;
 *   - Card/Field вынесены в категорию `composition` («Композиции»).
 *
 * Темплейты: у компонента с темплейтами (`listTemplatesFor`) справа иконка →
 * Portal-поповер со списком карточек-превью (рендер фрагмента через
 * `web-renderer`); каждая карточка draggable — тащим `{ source:'palette',
 * template: fragment }`, drop вставляет поддерево (см. `editor/dnd.ts`).
 * Portal — чтобы поповер не обрезался overflow узкого сайдбара.
 *
 * Обычный элемент тащим как `{ source:'palette', type }` — добавляет одну ноду.
 */
import { createDraggable, useDnD } from '@capsuletech/web-dnd';
import { type Registry, Renderer } from '@capsuletech/web-renderer';
import {
  type ComponentCategory,
  canAcceptChild,
  getCategories,
  getManifest,
  type IComponentManifest,
  listByCategory,
} from '@capsuletech/web-ui-creator/manifests';
import {
  buildTemplate,
  type ITemplate,
  listTemplatesFor,
} from '@capsuletech/web-ui-creator/generators';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  control: 'Контролы',
  typography: 'Типографика',
  container: 'Контейнеры',
  composition: 'Композиции',
  composite: 'Составные',
  feedback: 'Фидбек',
  wrapper: 'Обёртки',
};

/** Порядок секций палитры. */
const CATEGORY_ORDER: ComponentCategory[] = [
  'control',
  'typography',
  'container',
  'composition',
  'feedback',
  'wrapper',
];
const catRank = (c: ComponentCategory): number => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

/** Порядок контейнеров: layout вперёд. */
const CONTAINER_ORDER = ['ui.Layout.Grid', 'ui.Layout.Flex', 'ui.Group', 'ui.List'];
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

const TemplatesIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const Palette = Widget((Ui) => {
  const registry = { ui: Ui } as unknown as Registry;
  const dnd = useDnD();
  const composites = listByCategory('composite');
  // Вложенные части — только у composite-owner'ов (Card/Field с явным `accepts`).
  const partsOf = (containerType: string): IComponentManifest[] =>
    getManifest(containerType)?.accepts
      ? composites.filter((c) => canAcceptChild(containerType, c.type))
      : [];

  /** Карточка-превью темплейта: рендерит фрагмент + draggable (тащим фрагмент). */
  const TemplateCard = (props: { t: ITemplate }) => {
    const fragment = buildTemplate(props.t);
    const drag = createDraggable({
      id: `tmpl:${props.t.id}`,
      data: () => ({ source: 'palette', template: fragment }),
    });
    return (
      <div
        ref={drag.ref}
        title="Перетащите в холст"
        class="cursor-grab rounded-md border p-1 transition-colors hover:border-primary active:cursor-grabbing"
        classList={{ 'opacity-50': drag.isDragging() }}
      >
        <div class="mb-1 px-1 text-xs font-medium">{props.t.label}</div>
        <div class="pointer-events-none max-h-40 overflow-hidden rounded bg-background p-1">
          <div class="origin-top-left scale-[0.85]">
            <Renderer schema={{ components: fragment }} registry={registry} mode="static" />
          </div>
        </div>
      </div>
    );
  };

  /** Иконка темплейтов + Portal-поповер. null, если темплейтов нет. */
  const TemplatesTrigger = (props: { forType: string }) => {
    const templates = listTemplatesFor(props.forType);
    if (templates.length === 0) return null;
    const [open, setOpen] = createSignal(false);
    const [pos, setPos] = createSignal({ x: 0, y: 0 });
    let btn: HTMLButtonElement | undefined;
    const toggle = (e: MouseEvent) => {
      e.stopPropagation();
      if (!open() && btn) {
        const r = btn.getBoundingClientRect();
        setPos({ x: r.right + 6, y: r.top });
      }
      setOpen((o) => !o);
    };
    // Закрываем поповер как только начался drag (источник может размонтироваться —
    // web-dnd уже снял клон, перетаскивание продолжится).
    createEffect(() => {
      if (dnd.state.activeId()) setOpen(false);
    });
    return (
      <>
        <button
          ref={btn}
          type="button"
          title="Шаблоны"
          onClick={toggle}
          class="flex size-5 shrink-0 items-center justify-center rounded text-foreground/40 hover:bg-accent/50 hover:text-foreground"
        >
          <TemplatesIcon />
        </button>
        <Show when={open()}>
          <Portal>
            {/* backdrop для закрытия по клику вне */}
            <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              class="fixed z-50 flex w-64 flex-col gap-2 overflow-y-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-xl"
              style={{ left: `${pos().x}px`, top: `${pos().y}px`, 'max-height': '70vh' }}
            >
              <div class="px-1 text-[11px] uppercase tracking-wide text-foreground/40">Шаблоны</div>
              <For each={templates}>{(t) => <TemplateCard t={t} />}</For>
            </div>
          </Portal>
        </Show>
      </>
    );
  };

  /** Плоский элемент + (если есть) иконка темплейтов справа. */
  const Leaf = (props: { m: IComponentManifest }) => (
    <div class="flex w-full items-center justify-between gap-1">
      <Item m={props.m} />
      <TemplatesTrigger forType={props.m.type} />
    </div>
  );

  /** Контейнер/композиция: вложенные части под чевроном (по умолчанию свёрнут). */
  const ContainerItem = (props: { m: IComponentManifest }) => {
    const parts = partsOf(props.m.type);
    const [open, setOpen] = createSignal(false);
    return (
      <div class="flex w-full flex-col items-start gap-0.5">
        <div class="flex w-full items-center justify-between gap-0.5">
          <div class="flex min-w-0 items-center gap-0.5">
            <Show when={parts.length > 0}>
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
          <TemplatesTrigger forType={props.m.type} />
        </div>
        <Show when={parts.length > 0 && open()}>
          <div class="ml-3 flex flex-col items-start gap-0.5 border-l border-border/50 pl-2">
            <For each={parts}>{(c) => <Item m={c} />}</For>
          </div>
        </Show>
      </div>
    );
  };

  const sections = () =>
    getCategories()
      .filter((c) => c !== 'composite')
      .sort((a, b) => catRank(a) - catRank(b));

  const itemsOf = (cat: ComponentCategory): IComponentManifest[] =>
    cat === 'container'
      ? [...listByCategory(cat)].sort((a, b) => orderRank(a.type) - orderRank(b.type))
      : [...listByCategory(cat)];

  const isContainerLike = (cat: ComponentCategory) => cat === 'container' || cat === 'composition';

  return (
    <div class="flex h-full flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <For each={sections()}>
          {(cat) => (
            <div class="mb-3">
              <div class="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div class="flex flex-col items-start gap-0.5">
                <For each={itemsOf(cat)}>
                  {(m) => (isContainerLike(cat) ? <ContainerItem m={m} /> : <Leaf m={m} />)}
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
