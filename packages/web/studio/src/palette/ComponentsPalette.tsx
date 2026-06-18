/**
 * ComponentsPalette — палитра компонентов студио.
 *
 * Структура (только имена, без live preview):
 *   L1 (Accordion): «Примитивы» | «Композиции»          (по manifest.category)
 *   L2 (Accordion item): компонент — раскрывается если есть пресеты
 *      L3 (внутри L2): имена пресетов (`getPresets(type)`)
 *   L2 (плоский div): компоненты БЕЗ пресетов — не разворачиваются
 *
 * Mode 1 — click: клик по пресету пишет его в shared selection (singleton signal
 *                 в `src/selection.ts`); `<WebStudio.Canvas>` рендерит preview
 *                 через Renderer. Никакой Provider не требуется.
 * Mode 2 — DnD (для сборки композиций) — будущая итерация.
 *
 * Сейчас пресеты определены только для Button (`ui.Button`).
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import { getAllManifests, type IPrimitiveManifestEntry } from '@capsuletech/web-ui/manifest';
import { For, Show } from 'solid-js';
import { getPresets, hasPresets, type IPreset } from '@capsuletech/web-ui/manifest';
import { useSelectedPreset } from '../selection';
import { groupManifests } from './groups';

const PresetItem = (props: { p: IPreset }) => {
  const { selected, setSelected } = useSelectedPreset();
  const isSelected = () => selected()?.id === props.p.id;
  return (
    <button
      type="button"
      onClick={() => setSelected(props.p)}
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      classList={{ 'bg-accent text-accent-foreground': isSelected() }}
      data-testid={`preset-${props.p.id}`}
    >
      {props.p.label}
    </button>
  );
};

const ComponentLabel = (props: { m: IPrimitiveManifestEntry }) => (
  <span class="inline-flex items-center gap-2">
    <span class="shrink-0 text-muted-foreground">{props.m.icon()}</span>
    <span>{props.m.label}</span>
  </span>
);

const ComponentNode = (props: { m: IPrimitiveManifestEntry }) => (
  <Show
    when={hasPresets(props.m.type)}
    fallback={
      <div class="flex items-center gap-2 px-2 py-1 text-sm">
        <ComponentLabel m={props.m} />
      </div>
    }
  >
    <Accordion.Item value={props.m.type}>
      <Accordion.Trigger>
        <ComponentLabel m={props.m} />
      </Accordion.Trigger>
      <Accordion.Content>
        <div class="flex flex-col pl-3">
          <For each={getPresets(props.m.type)}>{(p) => <PresetItem p={p} />}</For>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  </Show>
);

const ComponentList = (props: { items: readonly IPrimitiveManifestEntry[] }) => (
  <Accordion multiple class="pl-3">
    <For each={props.items}>{(m) => <ComponentNode m={m} />}</For>
  </Accordion>
);

export const ComponentsPalette = () => {
  const groups = groupManifests(getAllManifests());

  return (
    <Flex wrap="wrap" w={'full'}>
      <Accordion defaultValue={['primitives']} fluid={250} multiple>
        <Accordion.Item value="primitives">
          <Accordion.Trigger>Примитивы</Accordion.Trigger>
          <Accordion.Content>
            <ComponentList items={groups.primitives} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>

      <Accordion defaultValue={['compositions']} fluid={250} multiple>
        <Accordion.Item value="compositions">
          <Accordion.Trigger>Композиции</Accordion.Trigger>
          <Accordion.Content>
            <ComponentList items={groups.compositions} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Flex>
  );
};
