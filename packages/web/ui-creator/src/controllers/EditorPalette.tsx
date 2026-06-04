/**
 * Editor.Palette — палитра компонентов для визуального редактора (ADR 032, фаза 6, чанк 3).
 *
 * Портировано из `apps/ui-creator/src/widgets/palette.tsx`.
 *
 * Источники данных:
 *  - `/manifests` (`getCategories`, `listByCategory`, `getManifest`, `canAcceptChild`)
 *    — реестр компонентов, категории, разрешение вложенности.
 *  - `/generators` (`listTemplatesFor`, `buildTemplate`)
 *    — темплейты для дропдаун-превью.
 *  - `useEditorKit()` — КОНТЕНТ-кит. Используется ТОЛЬКО для рендера превью
 *    в `<Renderer>` (Canvas-контент пользователя). Не используется для chrome-UI
 *    самого редактора.
 *
 * Chrome-UI редактора (Dropdown темплейтов, кнопки, чевроны) — прямые импорты
 * из `@capsuletech/web-ui`. Контент — `useEditorKit()`.
 *
 * DnD — только СТАРТ drag'а (палитра не drop-target):
 *  - обычный компонент → `{ source:'palette', type }` (добавить одну ноду)
 *  - темплейт → `{ source:'palette', template: IEditorTree }` (вставить поддерево)
 *
 * Данные/утилиты:
 *  - `CATEGORY_LABELS`, `CATEGORY_ORDER`, `CONTAINER_ORDER`, `catRank`, `orderRank`
 *    — editor-метаданные для раскладки секций. Живут в этом модуле.
 *
 * Dropdown темплейтов — портальный, не обрезается overflow узкого сайдбара
 * (Kobalte Dropdown.Content монтируется в Portal автоматически).
 */

import { createDraggable, useDnD } from '@capsuletech/web-dnd';
import { Renderer } from '@capsuletech/web-renderer';
import type { Registry } from '@capsuletech/web-renderer';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import {
  type ComponentCategory,
  canAcceptChild,
  getCategories,
  getManifest,
  type IComponentManifest,
  listByCategory,
} from '../manifests';
import {
  buildTemplate,
  type ITemplate,
  listTemplatesFor,
} from '../generators';
import { createEffect, createSignal, For, Show } from 'solid-js';
import { useEditorKit } from './EditorProvider';

// ── Editor-metadata: категории ─────────────────────────────────────────────────

/** Человекочитаемые названия категорий для заголовков секций. */
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  control: 'Контролы',
  typography: 'Типографика',
  container: 'Контейнеры',
  composition: 'Композиции',
  composite: 'Составные',
  feedback: 'Фидбек',
  wrapper: 'Обёртки',
};

/** Порядок отображения секций (composite скрыт — показывается только как часть ContainerItem). */
export const CATEGORY_ORDER: ComponentCategory[] = [
  'control',
  'typography',
  'container',
  'composition',
  'feedback',
  'wrapper',
];

/** Предпочтительный порядок контейнеров: layout-компоненты вперёд. */
export const CONTAINER_ORDER = ['ui.Layout.Grid', 'ui.Layout.Flex', 'ui.Group', 'ui.List'];

/** Ранг категории для сортировки секций. */
export const catRank = (c: ComponentCategory): number => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

/** Ранг контейнера для сортировки внутри секции 'container'. */
export const orderRank = (type: string): number => {
  const i = CONTAINER_ORDER.indexOf(type);
  return i < 0 ? CONTAINER_ORDER.length : i;
};

// ── Kit helpers ────────────────────────────────────────────────────────────────

/**
 * Строит Registry для `<Renderer>` из kit-объекта (КОНТЕНТ-кит).
 * Выделено из JSX-тела — вычисление не должно мешать читать разметку.
 */
const registryFromKit = (kit: ReturnType<typeof useEditorKit>): Registry =>
  ({ ui: kit } as unknown as Registry);

// ── Внутренние под-компоненты ──────────────────────────────────────────────────

/** Один draggable-элемент палитры (обычный компонент). */
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

/** Иконка кнопки «Шаблоны» (4 квадрата — grid). */
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

/** Карточка-превью одного темплейта: рендерит фрагмент + draggable. */
const TemplateCard = (props: { t: ITemplate; registry: Registry }) => {
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
          <Renderer schema={{ components: fragment }} registry={props.registry} mode="static" />
        </div>
      </div>
    </div>
  );
};

/**
 * Кнопка «Шаблоны» + Dropdown со списком TemplateCard.
 * Null если темплейтов нет.
 *
 * Chrome-компонент редактора — использует `Dropdown` из `@capsuletech/web-ui` напрямую
 * (не из контент-кита). Kobalte под капотом — портал + Floating UI позиционирование.
 * Закрытие при старте drag — через controlled `open` + createEffect.
 */
const TemplatesTrigger = (props: { forType: string; registry: Registry }) => {
  const templates = listTemplatesFor(props.forType);
  if (templates.length === 0) return null;

  const dnd = useDnD();

  const [open, setOpen] = createSignal(false);

  // Закрываем dropdown как только начался drag (источник может размонтироваться).
  createEffect(() => {
    if (dnd.state.activeId()) setOpen(false);
  });

  return (
    <Dropdown open={open()} onOpenChange={setOpen}>
      <Dropdown.Trigger
        title="Шаблоны"
        onClick={(e: MouseEvent) => e.stopPropagation()}
        class="flex size-5 shrink-0 items-center justify-center rounded text-foreground/40 hover:bg-accent/50 hover:text-foreground"
        data-testid={`templates-trigger-${props.forType}`}
      >
        <TemplatesIcon />
      </Dropdown.Trigger>
      <Dropdown.Content
        class="flex w-64 flex-col gap-2 overflow-y-auto p-2"
        style={{ 'max-height': '70vh' }}
        data-testid="templates-popover"
      >
        <div class="px-1 text-[11px] uppercase tracking-wide text-foreground/40">Шаблоны</div>
        <For each={templates}>{(t) => <TemplateCard t={t} registry={props.registry} />}</For>
      </Dropdown.Content>
    </Dropdown>
  );
};

/** Плоский элемент + (опционально) кнопка шаблонов справа. */
const Leaf = (props: { m: IComponentManifest; registry: Registry }) => (
  <div class="flex w-full items-center justify-between gap-1">
    <Item m={props.m} />
    <TemplatesTrigger forType={props.m.type} registry={props.registry} />
  </div>
);

/** Контейнер/композиция со вложенными composite-частями под чевроном. */
const ContainerItem = (props: { m: IComponentManifest; partsOf: (t: string) => IComponentManifest[]; registry: Registry }) => {
  const parts = () => props.partsOf(props.m.type);
  const [open, setOpen] = createSignal(false);
  return (
    <div class="flex w-full flex-col items-start gap-0.5">
      <div class="flex w-full items-center justify-between gap-0.5">
        <div class="flex min-w-0 items-center gap-0.5">
          <Show when={parts().length > 0}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open() ? 'Свернуть' : 'Развернуть'}
              class="flex size-4 shrink-0 items-center justify-center text-foreground/40 transition-transform hover:text-foreground"
              classList={{ 'rotate-90': open() }}
              data-testid={`chevron-${props.m.type}`}
            >
              ›
            </button>
          </Show>
          <Item m={props.m} />
        </div>
        <TemplatesTrigger forType={props.m.type} registry={props.registry} />
      </div>
      <Show when={parts().length > 0 && open()}>
        <div class="ml-3 flex flex-col items-start gap-0.5 border-l border-border/50 pl-2">
          <For each={parts()}>{(c) => <Item m={c} />}</For>
        </div>
      </Show>
    </div>
  );
};

// ── Editor.Palette ─────────────────────────────────────────────────────────────

/**
 * Editor.Palette — монтируется внутри `<Editor.Provider>`.
 *
 * Нет внешних props — всё берётся из manifests/generators и kit-context.
 */
export const EditorPalette = () => {
  const kit = useEditorKit();
  const registry = (): Registry => registryFromKit(kit);

  const composites = listByCategory('composite');

  // Вложенные части composite-контейнера: только те, которые этот контейнер принимает.
  const partsOf = (containerType: string): IComponentManifest[] =>
    getManifest(containerType)?.accepts
      ? (composites as IComponentManifest[]).filter((c) => canAcceptChild(containerType, c.type))
      : [];

  // Секции: все категории кроме 'composite' (его части вложены в ContainerItem).
  const sections = () =>
    getCategories()
      .filter((c) => c !== 'composite')
      .sort((a, b) => catRank(a) - catRank(b));

  // Компоненты секции: контейнеры сортируем по CONTAINER_ORDER, остальные — как есть.
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
            <div class="mb-3" data-testid={`palette-section-${cat}`}>
              <div class="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <div class="flex flex-col items-start gap-0.5">
                <For each={itemsOf(cat)}>
                  {(m) =>
                    isContainerLike(cat)
                      ? <ContainerItem m={m} partsOf={partsOf} registry={registry()} />
                      : <Leaf m={m} registry={registry()} />
                  }
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
