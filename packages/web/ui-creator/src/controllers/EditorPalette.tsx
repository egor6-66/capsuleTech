/**
 * Editor.Palette — палитра компонентов для визуального редактора (ADR 032, фаза 6, чанк 3).
 *
 * Источники данных:
 *  - `/manifests` (`getCategories`, `listByCategory`, `getManifest`, `canAcceptChild`)
 *    — реестр компонентов, категории, разрешение вложенности.
 *  - `/generators` (`listTemplatesFor`, `buildTemplate`)
 *    — темплейты для дропдаун-превью.
 *  - `useEditorKit()` — КОНТЕНТ-кит. Используется ТОЛЬКО для рендера превью
 *    в `<Renderer>` (Canvas-контент пользователя).
 *
 * Chrome-UI редактора (Dropdown, Button, Flex, иконки) — прямые импорты
 * из `@capsuletech/web-ui`. Контент — `useEditorKit()`.
 *
 * DnD — только СТАРТ drag'а (палитра не drop-target):
 *  - обычный компонент → `{ source:'palette', type }` (добавить одну ноду)
 *  - темплейт → `{ source:'palette', template: IEditorTree }` (вставить поддерево)
 *
 * Под-компоненты (Item/TemplateCard/TemplatesTrigger/Leaf/ContainerItem)
 * и editor-метаданные (CATEGORY_LABELS/CATEGORY_ORDER/catRank/orderRank) — в `controllers/palette/`.
 */

import type { Registry } from '@capsuletech/web-renderer';
import { Flex } from '@capsuletech/web-ui/flex';
import { For } from 'solid-js';
import {
  canAcceptChild,
  type ComponentCategory,
  getCategories,
  getManifest,
  type IComponentManifest,
  listByCategory,
} from '../manifests';
import { useEditorKit } from './EditorProvider';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONTAINER_ORDER,
  catRank,
  ContainerItem,
  Leaf,
  orderRank,
} from './palette';

// Re-export editor-метаданных для внешних потребителей (тесты, документация).
export { CATEGORY_LABELS, CATEGORY_ORDER, CONTAINER_ORDER, catRank, orderRank };

// ── Kit helpers ────────────────────────────────────────────────────────────────

/**
 * Строит Registry для `<Renderer>` из kit-объекта (КОНТЕНТ-кит).
 * Выделено из JSX-тела — вычисление не должно мешать читать разметку.
 */
const registryFromKit = (kit: ReturnType<typeof useEditorKit>): Registry =>
  ({ ui: kit } as unknown as Registry);

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
    <Flex orientation="vertical" class="h-full">
      <Flex orientation="vertical" class="min-h-0 flex-1 overflow-y-auto p-2">
        <For each={sections()}>
          {(cat) => (
            <div class="mb-3" data-testid={`palette-section-${cat}`}>
              <div class="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              <Flex orientation="vertical" gap={0.5} class="items-start">
                <For each={itemsOf(cat)}>
                  {(m) =>
                    isContainerLike(cat) ? (
                      <ContainerItem m={m} partsOf={partsOf} registry={registry()} />
                    ) : (
                      <Leaf m={m} registry={registry()} />
                    )
                  }
                </For>
              </Flex>
            </div>
          )}
        </For>
      </Flex>
    </Flex>
  );
};
