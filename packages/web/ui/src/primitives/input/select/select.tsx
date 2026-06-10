import { cn } from '@capsuletech/web-style';
import { Select as KobalteSelect } from '@kobalte/core/select';
import { Check, ChevronDown } from 'lucide-solid';
import { splitProps } from 'solid-js';

import { createFinish } from '../../../lib/finish';

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

/**
 * The button that opens / closes the select popover.
 * Intended for compound usage — wraps `KobalteSelect.Trigger`.
 */
const Trigger = (props: ISelectTriggerProps) => {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <KobalteSelect.Trigger class={cn(selectTriggerCva(), local.class)} {...(others as object)}>
      {local.children}
      <KobalteSelect.Icon class="shrink-0 text-muted-foreground transition-transform duration-200 data-[expanded]:rotate-180">
        <ChevronDown size={16} aria-hidden="true" />
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
 *
 * ## Enter + exit animation — auto-height unfold
 * Kobalte natively delays Content removal from the DOM while a closing CSS
 * animation plays — no `forceMount` or motionone needed. The `select-content-animate`
 * class (defined in `@capsuletech/web-style/index.css`) animates the panel HEIGHT
 * (grid-rows 0fr→1fr) rather than scaling it, so the attached single-block panel
 * unfolds downward from the seam without the scale/translate "pinch" flash:
 *   - enter → `select-unfold` keyframe on `[data-expanded]`
 *   - exit  → `select-fold`   keyframe on `[data-closed]`
 *
 * The grid trick requires the single child to shrink below its content height,
 * so it is split into two layers:
 *   - outer wrapper (the grid child) → `overflow-hidden`; it gets squeezed by the
 *     grid during the unfold and clips silently — NO scrollbar flickers in.
 *   - inner wrapper → `overflow-auto` + `max-h` (Kobalte's
 *     `--kb-popper-content-available-height`); the genuine scrollbar for long
 *     lists, which never appears for short ones.
 *
 * ## Finish effect
 * Activated via the reactive `useFinishMode()` signal (read inside `createFinish`);
 * no DOM walk / `closest()` / ref needed.
 */
const Content = (props: ISelectContentProps) => {
  const [local, others] = splitProps(props, ['class', 'style', 'portalProps']);

  const finish = createFinish();

  return (
    <KobalteSelect.Portal {...(local.portalProps as object)}>
      <KobalteSelect.Content
        class={cn(selectContentCva(), 'select-content-animate', local.class)}
        style={{
          ...(typeof local.style === 'object' ? local.style : {}),
          ...finish.surfaceStyle(),
        }}
        {...(others as object)}
      >
        <div class="overflow-hidden">
          <div class="overflow-auto max-h-[var(--kb-popper-content-available-height)]">
            <KobalteSelect.Listbox />
          </div>
        </div>
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
 *
 * `gutter` defaults to `0` px — the panel butts directly against the trigger so
 * the two form a single continuous block (the trigger flattens its bottom corners
 * and the panel its top; see `variants.ts`). Pass an explicit `gutter` to detach.
 */
const SelectImpl = (props: ISelectProps) => {
  const [local, kobalteProps] = splitProps(props, [
    'options',
    'placeholder',
    'class',
    'children',
    'gutter',
  ]);

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
      gutter={local.gutter ?? 0}
      itemComponent={(itemProps) => (
        <KobalteSelect.Item item={itemProps.item} class={selectItemCva()}>
          <KobalteSelect.ItemIndicator class={selectItemIndicatorCva()}>
            <Check size={14} aria-hidden="true" />
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
