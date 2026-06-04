import { createSignal, For, Show } from 'solid-js';
import { Button } from '@capsuletech/web-ui/button';
import { Flex } from '@capsuletech/web-ui/flex';
import { ChevronDown, ChevronRight } from '@capsuletech/web-ui/icons';
import type { IInspectorKit } from './kit';
import { renderField } from './fields';
import type { ICategory, OnChangeFn, ValuesMap } from './types';

interface ICategoryProps {
  category: ICategory;
  values: ValuesMap;
  onChange: OnChangeFn;
  kit: IInspectorKit;
}

/**
 * Одна секция Inspector'а. Collapsible header — клик переключает развёрнутый
 * вид. Начальное состояние — `category.defaultCollapsed`.
 */
export const Category = (props: ICategoryProps) => {
  const [collapsed, setCollapsed] = createSignal(!!props.category.defaultCollapsed);

  return (
    <div class="border border-white/15 rounded overflow-hidden">
      <Button
        variant="ghost"
        class="w-full justify-between px-3 py-2 text-sm font-medium text-left h-auto rounded-none hover:bg-white/5"
        onClick={() => setCollapsed(!collapsed())}
      >
        <span>{props.category.label}</span>
        <Show when={collapsed()} fallback={<ChevronDown size={14} class="opacity-50" aria-hidden="true" />}>
          <ChevronRight size={14} class="opacity-50" aria-hidden="true" />
        </Show>
      </Button>
      <Show when={!collapsed()}>
        <Flex orientation="vertical" gap={3} class="px-3 py-3 border-t border-white/10">
          <Show when={props.category.description}>
            <p class="text-xs opacity-60">{props.category.description}</p>
          </Show>
          <For each={props.category.fields}>
            {(field) => renderField(field, props.values, props.onChange, props.kit)}
          </For>
        </Flex>
      </Show>
    </div>
  );
};
