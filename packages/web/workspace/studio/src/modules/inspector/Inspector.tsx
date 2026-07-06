/**
 * Inspector — универсальный редактор пропсов.
 *
 * Принимает список категорий и values, рендерит через kit `Accordion`
 * (`@capsuletech/web-ui/accordion`). Каждое поле — `FieldRenderer` (Solid
 * component-диспатчер), который читает values реактивно через Solid Store
 * proxy → input'ы не теряют фокус при вводе, изменения отражаются мгновенно.
 *
 * `kit` — UI-кит для рендера полей (по умолчанию `DEFAULT_KIT` из
 * `@capsuletech/web-ui`). Передай собственный для мока в тестах.
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import { For } from 'solid-js';
import { FieldRenderer } from './fields';
import { DEFAULT_KIT } from './kit';
import type { IInspectorProps } from './types';

export const Inspector = (props: IInspectorProps) => {
  const kit = () => props.kit ?? DEFAULT_KIT;

  return (
    <Accordion bordered multiple class={props.class}>
      <For each={props.categories}>
        {(cat) => (
          <Accordion.Item value={cat.id}>
            <Accordion.Trigger data-testid={`inspector-cat-${cat.id}`}>
              {cat.label}
            </Accordion.Trigger>
            <Accordion.Content>
              <Flex orientation="vertical" gap={3} px={1} py={2}>
                <For each={cat.fields}>
                  {(field) => (
                    <FieldRenderer
                      field={field}
                      values={props.values}
                      onChange={props.onChange}
                      kit={kit()}
                    />
                  )}
                </For>
              </Flex>
            </Accordion.Content>
          </Accordion.Item>
        )}
      </For>
    </Accordion>
  );
};
