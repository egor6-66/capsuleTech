/**
 * ComponentsPalette — store-палитра компонентов студио.
 *
 * Структура:
 *   L1 (Accordion): «Примитивы» | «Композиции»          (по `groupManifests`)
 *   L2..L3: общий `<ComponentSegments>` (компонент → его пресеты)
 *
 * Действие клика по пресету инжектится сверху (`storeSelect`), а не ветвится по
 * URL-режиму — палитра и узловая мини-палитра теперь ОДИН сегментированный блок
 * (`ComponentSegments`), различаются только источником + действием + стилями
 * (бриф `studio-palette-unify-segmented`).
 *
 * store-действие: `loadPreset(preset)` в единый document-стор + `emit`
 * (`onPresetSelect`) вверх. Подсветка активного = `loadedPresetId() === p.id`.
 *
 * Palette-drag убран из дизайна (вставка = клик; reorder-DnD iter 2 живёт внутри
 * дерева, не в палитре) — `DraggablePresetItem` удалён.
 */

import type { ISchema } from '@capsuletech/web-contract';
import { useEmitOptional } from '@capsuletech/web-core';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import { getAllManifests, type IPreset } from '@capsuletech/web-ui/manifest';
import { useDocument } from '../document';
import { ComponentSegments } from './ComponentSegments';
import { groupManifests } from './groups';

/** HCA-события, которые эмитит палитра вверх (ADR 032, useEmit-канал). */
export interface IComponentsPaletteEvents {
  /** Выбран пресет (клик в store-режиме). Payload — схема для Renderer'а. */
  onPresetSelect: { schema: ISchema };
}

const ComponentsPaletteComponent = () => {
  const groups = groupManifests(getAllManifests());
  const { loadedPresetId, loadPreset } = useDocument('store');
  // useEmitOptional (НЕ useEmit): палитра рендерится и standalone (store-mode,
  // без host logic-wrapper'а — см. тесты). Вне scope — no-op, внутри — баббл к
  // ближайшему host-Feature. useEmit() тут бросил бы.
  const emit = useEmitOptional();

  const storeSelect = (p: IPreset) => {
    loadPreset(p);
    emit('onPresetSelect', {
      source: 'WebStudio.ComponentsPalette',
      payload: { schema: p.schema },
    });
  };

  return (
    <Flex wrap="wrap" w={'full'}>
      <Accordion defaultValue={['primitives']} fluid={250} multiple>
        <Accordion.Item value="primitives">
          <Accordion.Trigger>Примитивы</Accordion.Trigger>
          <Accordion.Content>
            <ComponentSegments
              manifests={groups.primitives}
              onSelect={storeSelect}
              selectedId={loadedPresetId()}
            />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>

      <Accordion defaultValue={['compositions']} fluid={250} multiple>
        <Accordion.Item value="compositions">
          <Accordion.Trigger>Композиции</Accordion.Trigger>
          <Accordion.Content>
            <ComponentSegments
              manifests={groups.compositions}
              onSelect={storeSelect}
              selectedId={loadedPresetId()}
            />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Flex>
  );
};

/**
 * WebStudio.ComponentsPalette — палитра компонентов студии.
 *
 * Phantom `__events?: IComponentsPaletteEvents` нужен codegen-у для генерации
 * `WebStudio.ComponentsPalette.Events` (namespace-merge), чтобы host
 * `Feature<WebStudio.ComponentsPalette.Events>` типизировал `target.payload`
 * в `onPresetSelect` без per-handler аннотации. На runtime не используется.
 */
export const ComponentsPalette: (() => any) & {
  readonly __events?: IComponentsPaletteEvents;
} = ComponentsPaletteComponent;
