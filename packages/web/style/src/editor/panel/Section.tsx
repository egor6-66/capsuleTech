import type { Component, JSX } from 'solid-js';
import { Show } from 'solid-js';

interface IProps {
  icon: Component<{ size?: number }>;
  title: string;
  description?: string;
  children: JSX.Element;
}

/**
 * Один блок настроек: иконка + заголовок + подпись + контент. Используется
 * в Panel для группировки контролов — чтобы не было «свалки слайдеров».
 */
export const Section = (props: IProps) => (
  <div class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 border-b border-border last:border-0">
    <div class="flex items-start gap-3">
      <div class="h-8 w-8 rounded-md bg-muted/60 grid place-items-center text-muted-foreground shrink-0">
        <props.icon size={16} />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium leading-tight">{props.title}</div>
        <Show when={props.description}>
          <div class="text-xs text-muted-foreground mt-0.5">{props.description}</div>
        </Show>
      </div>
    </div>
    <div class="pl-11">{props.children}</div>
  </div>
);
