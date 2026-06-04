/**
 * TemplatesTrigger — кнопка «Шаблоны» + Dropdown со списком TemplateCard.
 * Null если темплейтов нет.
 *
 * Chrome-компонент редактора — использует Dropdown из @capsuletech/web-ui/dropdown
 * напрямую (не из контент-кита).
 *
 * Иконка: LayoutGrid из @capsuletech/web-ui/icons (lucide, 4 ячейки = «шаблоны»).
 * Закрытие при старте drag — через controlled open + createEffect.
 *
 * Dropdown.Trigger polymorphic: as={Button} с variant="ghost" size="icon" —
 * всё стилевое поведение делегируется Button, без дублирования ghost-icon классов.
 */

import { useDnD } from '@capsuletech/web-dnd';
import type { Registry } from '@capsuletech/web-renderer';
import { Button } from '@capsuletech/web-ui/button';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { LayoutGrid } from '@capsuletech/web-ui/icons';
import { createEffect, createSignal, For } from 'solid-js';
import { listTemplatesFor } from '../../generators';
import { TemplateCard } from './TemplateCard';

export const TemplatesTrigger = (props: { forType: string; registry: Registry }) => {
  const templates = listTemplatesFor(props.forType);
  if (templates.length === 0) return null;

  const dnd = useDnD();
  const [open, setOpen] = createSignal(false);

  // Закрываем dropdown как только начался drag (источник может размонтироваться).
  createEffect(() => {
    if (dnd.state.activeId()) setOpen(false);
  });

  return (
    <Dropdown open={open()} onOpenChange={setOpen}>
      <Dropdown.Trigger
        as={Button}
        variant="ghost"
        size="icon"
        title="Шаблоны"
        onClick={(e: MouseEvent) => e.stopPropagation()}
        data-testid={`templates-trigger-${props.forType}`}
      >
        <LayoutGrid size={14} aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Content
        class="flex w-64 flex-col gap-2 overflow-y-auto p-2"
        style={{ 'max-height': '70vh' }}
        data-testid="templates-popover"
      >
        <div class="px-1 text-[11px] uppercase tracking-wide text-foreground/40">Шаблоны</div>
        <For each={templates}>{(t) => <TemplateCard t={t} registry={props.registry} />}</For>
      </Dropdown.Content>
    </Dropdown>
  );
};
