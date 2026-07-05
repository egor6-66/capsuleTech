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
import { Card } from '@capsuletech/web-ui/card';
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
      <Accordion multiple value={open()} onChange={setOpen} class={props.class}>
        <For each={groups()}>
          {(group) => (
            <Accordion.Item value={group.category}>
              <Accordion.Trigger>
                <Layout.Flex orientation="vertical" gapY={0} align="start">
                  <Typography>{group.label}</Typography>
                  <Typography size="sm" tone="muted">
                    {group.subtitle}
                  </Typography>
                </Layout.Flex>
              </Accordion.Trigger>
              <Accordion.Content>
                <Layout.Flex orientation="vertical" gapY={1} p={1}>
                  <For each={group.items}>
                    {(rule) => (
                      <Card
                        role="button"
                        tabIndex={0}
                        interactive
                        selected={props.id === rule.id}
                        padding="sm"
                        onClick={() => handleSelect(rule.id)}
                      >
                        <Typography>{rule.title}</Typography>
                      </Card>
                    )}
                  </For>
                </Layout.Flex>
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
