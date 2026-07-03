import { useEmitOptional } from '@capsuletech/web-core';
import { Button } from '@capsuletech/web-ui/button';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { For, Show, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import type { IPickerEvents, IPickerOption, IPickerProps } from './interfaces';

const normalizeOption = (option: string | IPickerOption): IPickerOption =>
  typeof option === 'string' ? { value: option } : option;

/**
 * Dropdown-based generic picker — каркас селекта без домена. Данные (options)
 * и state (value/onSelect) инжектит потребитель; при выборе эмитится named-event
 * `onPick { name, value }` в ближайший Controller/Feature (ADR 032).
 *
 * `useEmitOptional` (НЕ useEmit): контрол может рендериться вне host-scope
 * (прецедент ComponentsPalette) — вне scope emit тихо no-op'ится.
 *
 * `onSelect`-prop, если задан, вызывается тоже — инжект-путь для studio-подобных
 * кейсов (ADR 041: событие = роль, инжект = опция).
 *
 * @example
 * ```tsx
 * // Standalone — свой dropdown root (default):
 * <Picker name="engine" options={engines()} value={engine} onSelect={setEngine} />
 *
 * // Sub mode — внутри родительского Dropdown.Content (например Shell.Header.Menu):
 * <Shell.Header.Menu>
 *   <Picker mode="sub" name="engine" options={engines()} value={engine} />
 * </Shell.Header.Menu>
 * ```
 */
const PickerComponent = (props: IPickerProps) => {
  const [local] = splitProps(props, [
    'options',
    'value',
    'onSelect',
    'onChange',
    'triggerLabel',
    'icon',
    'class',
    'mode',
    'name',
  ]);
  const emit = useEmitOptional();
  const current = () => local.value?.();
  const options = () => local.options.map(normalizeOption);
  const mode = () => local.mode ?? 'standalone';

  const select = (value: string) => {
    local.onSelect?.(value);
    emit('onPick', {
      source: 'Shell.Picker',
      payload: { name: local.name ?? 'picker', value },
    });
    local.onChange?.(value);
  };

  const renderItems = () => (
    <For each={options()}>
      {(option) => (
        <Dropdown.Item onSelect={() => select(option.value)}>
          <span class="inline-block w-4 text-primary">
            <Show when={current() === option.value}>&#x2713;</Show>
          </span>
          <span>{option.label ?? option.value}</span>
        </Dropdown.Item>
      )}
    </For>
  );

  if (mode() === 'standalone') {
    return (
      <Dropdown modal={false}>
        <Dropdown.Trigger as={Button} variant="outline" size="sm" class={local.class}>
          <Show when={local.icon}>
            <Dynamic component={local.icon} class="size-4" aria-hidden="true" />
          </Show>
          <Show when={local.triggerLabel !== undefined} fallback={<span>{current()}</span>}>
            {local.triggerLabel}
          </Show>
          <span class="text-muted-foreground" aria-hidden="true">
            &#9662;
          </span>
        </Dropdown.Trigger>
        <Dropdown.Content>{renderItems()}</Dropdown.Content>
      </Dropdown>
    );
  }

  return (
    <Dropdown.Sub>
      <Dropdown.Row
        variant="sub"
        icon={local.icon}
        label={local.triggerLabel ?? current()}
        class={local.class}
      />
      <Dropdown.SubContent>{renderItems()}</Dropdown.SubContent>
    </Dropdown.Sub>
  );
};

/**
 * Phantom `__events?: IPickerEvents` — для codegen'а `Shell.Picker.Events`
 * (см. IPickerEvents doc). На runtime не читается.
 */
export const Picker: ((props: IPickerProps) => ReturnType<typeof PickerComponent>) & {
  readonly __events?: IPickerEvents;
} = PickerComponent;
