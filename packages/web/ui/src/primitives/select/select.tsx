import { cn } from '@capsuletech/web-style';
import { Select as KobalteSelect } from '@kobalte/core/select';
import { splitProps } from 'solid-js';

import type {
  ISelectContentProps,
  ISelectProps,
  ISelectTriggerProps,
  ISelectValueProps,
} from './interfaces';
import {
  selectContentCva,
  selectItemCva,
  selectItemIndicatorCva,
  selectTriggerCva,
} from './variants';

/** Chevron icon rendered inside the trigger. Pure SVG — no lucide dep at runtime. */
const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Checkmark icon rendered next to the selected item. */
const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * The button that opens / closes the select popover.
 * Intended for compound usage — wraps `KobalteSelect.Trigger`.
 */
const Trigger = (props: ISelectTriggerProps) => {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <KobalteSelect.Trigger class={cn(selectTriggerCva(), local.class)} {...(others as object)}>
      {local.children}
      <KobalteSelect.Icon>
        <ChevronDownIcon />
      </KobalteSelect.Icon>
    </KobalteSelect.Trigger>
  );
};

/**
 * Displays the currently selected value in the trigger.
 * `placeholder` is controlled by the root `<Select placeholder="…">` prop.
 */
const Value = (props: ISelectValueProps) => {
  const [local, others] = splitProps(props, ['class']);
  return (
    <KobalteSelect.Value<string>
      class={cn('pointer-events-none flex-1 truncate text-left', local.class)}
      {...(others as object)}
    >
      {(state) => state.selectedOption()}
    </KobalteSelect.Value>
  );
};

/**
 * The dropdown panel containing the list of selectable items.
 * Rendered inside a Kobalte Portal (teleported to `document.body`).
 */
const Content = (props: ISelectContentProps) => {
  const [local, others] = splitProps(props, ['class', 'portalProps']);
  return (
    <KobalteSelect.Portal {...(local.portalProps as object)}>
      <KobalteSelect.Content class={cn(selectContentCva(), local.class)} {...(others as object)}>
        <KobalteSelect.Listbox />
      </KobalteSelect.Content>
    </KobalteSelect.Portal>
  );
};

/**
 * Accessible select primitive built on `@kobalte/core/select`.
 *
 * **Primary API** — pass `options` array:
 * ```tsx
 * <Select
 *   options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]}
 *   value={selected()}
 *   onChange={setSelected}
 *   placeholder="Choose…"
 * />
 * ```
 *
 * **Compound mode** — full control via `Select.Trigger` + `Select.Content`.
 * In compound mode `options` + `itemComponent` must still be supplied to the root
 * because Kobalte Select is data-driven (the Listbox renders from `options`):
 * ```tsx
 * <Select
 *   options={['a', 'b', 'c']}
 *   placeholder="Choose…"
 *   value={selected()}
 *   onChange={setSelected}
 *   itemComponent={(p) => (
 *     <KobalteSelectItem item={p.item}>{p.item.rawValue}</KobalteSelectItem>
 *   )}
 * >
 *   <Select.Trigger><Select.Value /></Select.Trigger>
 *   <Select.Content />
 * </Select>
 * ```
 */
const SelectImpl = (props: ISelectProps) => {
  const [local, kobalteProps] = splitProps(props, ['options', 'placeholder', 'class', 'children']);

  const optionValues = () => (local.options ?? []).map((o) => o.value);
  const labelMap = () => {
    const m: Record<string, string> = {};
    for (const o of local.options ?? []) m[o.value] = o.label;
    return m;
  };
  const disabledSet = () =>
    new Set((local.options ?? []).filter((o) => o.disabled).map((o) => o.value));

  return (
    <KobalteSelect<string>
      class={cn('relative w-full', local.class)}
      options={optionValues()}
      placeholder={local.placeholder}
      optionDisabled={(v) => disabledSet().has(v)}
      itemComponent={(itemProps) => (
        <KobalteSelect.Item item={itemProps.item} class={selectItemCva()}>
          <KobalteSelect.ItemIndicator class={selectItemIndicatorCva()}>
            <CheckIcon />
          </KobalteSelect.ItemIndicator>
          <KobalteSelect.ItemLabel>
            {labelMap()[itemProps.item.rawValue] ?? itemProps.item.rawValue}
          </KobalteSelect.ItemLabel>
        </KobalteSelect.Item>
      )}
      {...(kobalteProps as object)}
    >
      {local.children ?? (
        <>
          <Trigger>
            <Value />
          </Trigger>
          <Content />
        </>
      )}
    </KobalteSelect>
  );
};

export const Select = Object.assign(SelectImpl, {
  Trigger,
  Content,
  Value,
});

// Named re-exports for web-core createLazy pattern.
export { Content as SelectContent, Trigger as SelectTrigger, Value as SelectValue };
