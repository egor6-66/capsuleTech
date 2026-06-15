/**
 * Palette — палитра компонентов студио (итерация 1: только структура).
 *
 * Структура: двухуровневый nested accordion.
 *   L1: «Примитивы» | «Композиции»               (по manifest.category)
 *   L2: компоненты (Button, Input, Card, …)      (manifest.label + icon, без вложенности)
 *
 * Кастомные варианты — в отдельном модуле (не внутри палитры).
 *
 * Что НЕ делает итерация 1:
 *  - DnD source, click → emit, mode-prop (presentation/composition)
 *  - Composite-парты (Card.Header и т.д.) как отдельные L2 элементы
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { getAllManifests, type IPrimitiveManifestEntry } from '@capsuletech/web-ui/manifest';
import { For } from 'solid-js';
import { groupManifests } from './groups';

const ComponentNode = (props: { m: IPrimitiveManifestEntry }) => (
  <div class="flex items-center gap-2 px-2 py-1 text-sm">
    <span class="shrink-0 text-muted-foreground">{props.m.icon()}</span>
    <span>{props.m.label}</span>
  </div>
);

const ComponentList = (props: { items: readonly IPrimitiveManifestEntry[] }) => (
  <div class="flex flex-col pl-3">
    <For each={props.items}>{(m) => <ComponentNode m={m} />}</For>
  </div>
);

export const Palette = () => {
  const groups = groupManifests(getAllManifests());

  return (
    <Accordion multiple defaultValue={['primitives', 'compositions']} class="w-full">
      <Accordion.Item value="primitives">
        <Accordion.Trigger>Примитивы</Accordion.Trigger>
        <Accordion.Content>
          <ComponentList items={groups.primitives} />
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="compositions">
        <Accordion.Trigger>Композиции</Accordion.Trigger>
        <Accordion.Content>
          <ComponentList items={groups.compositions} />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};
