/**
 * Learn.Lessons.Rules — справочник правил аккордеоном (ADR 069, паттерн
 * studio-палитры на `Ui.Accordion`). Рут аккордеона = категория (Фонетика /
 * Грамматика / Речь), элементы = правила (только title — список растёт, не
 * раздуваем). Порядок групп + ru-подписи + подзаголовки — константа блока;
 * внутри группы — по `sortOrder`, затем title.
 *
 * URL-driven: активное правило приходит `id`-пропом (deep-link), клик по
 * элементу = emit `onRuleSelect { id }` наверх (апп роутит). Группы свёрнуты по
 * умолчанию, КРОМЕ группы активного `id` (раскрываем один раз при появлении
 * id/списка; дальше пользователь свободно тогглит).
 *
 * `useEmitOptional` — блок рендерится и вне Controller/Feature-scope (unit).
 * Phantom `__events?: IRulesEvents` → codegen `Learn.Lessons.Rules.Events`.
 * Регистрируется как `Learn.Lessons.Rules` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { lessonsStore } from './store';
import type { IRuleSummary, RuleCategory } from './types';

export interface IRulesProps {
  class?: string;
  /** Активное правило (из URL) — подсветка + раскрытие его группы. */
  id?: string;
}

export interface IRulesEvents {
  onRuleSelect: { id: string };
}

interface IRuleGroup {
  category: RuleCategory;
  label: string;
  subtitle: string;
}

/** Порядок разделов справочника + ru-подписи (single source — этот блок). */
const RULE_GROUPS: readonly IRuleGroup[] = [
  { category: 'phonetics', label: 'Фонетика', subtitle: 'Звуки, чтение, произношение.' },
  { category: 'grammar', label: 'Грамматика', subtitle: 'Строй фразы: времена, порядок, связки.' },
  { category: 'speech', label: 'Речь', subtitle: 'Живые обороты и разговорные модели.' },
] as const;

const byOrder = (a: IRuleSummary, b: IRuleSummary): number =>
  a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

const RulesComponent = (props: IRulesProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (lessonsStore.rules().length === 0) void lessonsStore.loadRules(apiBase);
  });

  // Непустые группы в каноничном порядке, элементы отсортированы.
  const groups = () =>
    RULE_GROUPS.map((g) => ({
      ...g,
      items: lessonsStore
        .rules()
        .filter((r) => r.category === g.category)
        .sort(byOrder),
    })).filter((g) => g.items.length > 0);

  // Раскрытые группы (controlled). По умолчанию всё свёрнуто; группу активного
  // id раскрываем ОДИН раз — при появлении id или подгрузке списка.
  const [open, setOpen] = createSignal<string[]>([]);
  let appliedId: string | undefined;
  createEffect(() => {
    const id = props.id;
    const category = lessonsStore.rules().find((r) => r.id === id)?.category;
    if (!id || id === appliedId || !category) return;
    appliedId = id;
    setOpen((prev) => (prev.includes(category) ? prev : [...prev, category]));
  });

  const handleSelect = (id: string) => {
    emit('onRuleSelect', { source: 'Learn.Lessons.Rules', payload: { id } });
  };

  return (
    <Show
      when={groups().length > 0}
      fallback={
        <Layout.Flex p={2} class={props.class}>
          <Typography tone="muted" size="sm">
            Справочник пуст.
          </Typography>
        </Layout.Flex>
      }
    >
      <Accordion multiple bordered rounded value={open()} onChange={setOpen} class={props.class}>
        <For each={groups()}>
          {(group) => (
            <Accordion.Item value={group.category}>
              <Accordion.Trigger>
                <span class="flex min-w-0 flex-col gap-0.5 text-left">
                  <Typography>{group.label}</Typography>
                  <Typography size="sm" tone="muted">
                    {group.subtitle}
                  </Typography>
                </span>
              </Accordion.Trigger>
              <Accordion.Content>
                <div class="flex flex-col gap-0.5 py-1 pl-3 pr-1">
                  <For each={group.items}>
                    {(rule) => (
                      <button
                        type="button"
                        onClick={() => handleSelect(rule.id)}
                        class="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        classList={{
                          'bg-accent text-accent-foreground': props.id === rule.id,
                        }}
                      >
                        {rule.title}
                      </button>
                    )}
                  </For>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          )}
        </For>
      </Accordion>
    </Show>
  );
};

/** Phantom `__events` для codegen (см. `List`). На runtime не используется. */
export const Rules: ((props: IRulesProps) => ReturnType<typeof RulesComponent>) & {
  readonly __events?: IRulesEvents;
} = RulesComponent;

export default Rules;
