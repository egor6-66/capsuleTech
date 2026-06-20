/**
 * ComponentsPalette — палитра компонентов студио.
 *
 * Структура (только имена, без live preview):
 *   L1 (Accordion): «Примитивы» | «Композиции»          (по manifest.category)
 *   L2 (Accordion item): компонент — раскрывается если есть пресеты
 *      L3 (внутри L2): имена пресетов (`getPresets(type)`)
 *   L2 (плоский div): компоненты БЕЗ пресетов — не разворачиваются
 *
 * Поведение пресета зависит от studio-режима (`useStudioMode()` — derived из URL):
 *   - `store` (`/workspace/web-studio/store`) — клик по пресету пишет его в shared
 *                                                selection (singleton store в
 *                                                `src/selection.ts`); Canvas рендерит
 *                                                preview через Renderer. Никакой
 *                                                Provider не требуется.
 *   - `creator` (`/workspace/web-studio/creator`) — пресет становится drag-source
 *                                                  через `@capsuletech/web-dnd`
 *                                                  для сборки композиции. `DnDProvider`
 *                                                  обязан быть выше по дереву — его
 *                                                  монтирует `WebStudio.CreatorRoot`
 *                                                  (общий с `WebStudio.Canvas`-drop-target'ом).
 *
 * Сейчас пресеты определены только для Button (`ui.Button`).
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import {
  getAllManifests,
  getPresets,
  hasPresets,
  type IPreset,
  type IPrimitiveManifestEntry,
} from '@capsuletech/web-ui/manifest';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { useStudioMode } from '../navigation/useStudioMode';
import { useSelectedPreset } from '../selection';
import { DraggablePresetItem } from './DraggablePresetItem';
import { groupManifests } from './groups';

const PresetItem = (props: { p: IPreset }) => {
  const { selected, setSelected } = useSelectedPreset();
  const isSelected = () => selected()?.id === props.p.id;
  return (
    <button
      type="button"
      onClick={() => setSelected(props.p)}
      class="cursor-pointer flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      classList={{ 'bg-accent text-accent-foreground': isSelected() }}
      data-testid={`preset-${props.p.id}`}
    >
      {props.p.label}
    </button>
  );
};

const ComponentLabel = (props: { m: IPrimitiveManifestEntry }) => (
  <Flex gap={2} align={'center'}>
    <Typography>{props.m.icon()}</Typography>
    <Typography variant={'muted'}>{props.m.label}</Typography>
  </Flex>
);

/**
 * Item — leaf пресета. В store-режиме — click-source (мутирует selection),
 * в creator-режиме — drag-source. Решение принимается per-render через
 * `useStudioMode()` (URL-derived → один source of truth с Navigation).
 */
const Item = (props: { p: IPreset; mode: ReturnType<typeof useStudioMode> }) => (
  <Show when={props.mode() === 'creator'} fallback={<PresetItem p={props.p} />}>
    <DraggablePresetItem p={props.p} />
  </Show>
);

const ComponentNode = (props: {
  m: IPrimitiveManifestEntry;
  mode: ReturnType<typeof useStudioMode>;
}) => (
  <Show
    when={hasPresets(props.m.type)}
    fallback={
      <div class="flex items-center gap-2 px-2 py-2 text-sm">
        <ComponentLabel m={props.m} />
      </div>
    }
  >
    <Accordion.Item value={props.m.type}>
      <Accordion.Trigger class={'py-2'}>
        <ComponentLabel m={props.m} />
      </Accordion.Trigger>
      <Accordion.Content>
        <div class="flex flex-col pl-3">
          <For each={getPresets(props.m.type)}>{(p) => <Item p={p} mode={props.mode} />}</For>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Show>
);

const ComponentList = (props: {
  items: readonly IPrimitiveManifestEntry[];
  mode: ReturnType<typeof useStudioMode>;
}) => (
  <Accordion multiple class="pl-3">
    <For each={props.items}>{(m) => <ComponentNode m={m} mode={props.mode} />}</For>
  </Accordion>
);

export const ComponentsPalette = () => {
  const groups = groupManifests(getAllManifests());
  const mode = useStudioMode();

  return (
    <Flex wrap="wrap" w={'full'}>
      <Accordion defaultValue={['primitives']} fluid={250} multiple>
        <Accordion.Item value="primitives">
          <Accordion.Trigger>Примитивы</Accordion.Trigger>
          <Accordion.Content>
            <ComponentList items={groups.primitives} mode={mode} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>

      <Accordion defaultValue={['compositions']} fluid={250} multiple>
        <Accordion.Item value="compositions">
          <Accordion.Trigger>Композиции</Accordion.Trigger>
          <Accordion.Content>
            <ComponentList items={groups.compositions} mode={mode} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Flex>
  );
};
