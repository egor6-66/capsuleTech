/**
 * Learn.Lessons.Rules — список правил (справочник): title + tags. Lazy-load при
 * первом монтировании (зеркало `Learn.Lessons.List`). Клик →
 * `lessonsStore.openRule` (fetch правила + его дриллов) + emit `onRuleSelect { id }`.
 *
 * `useEmitOptional` — блок может рендериться вне Controller/Feature-scope.
 *
 * Phantom `__events?: IRulesEvents` → codegen `Learn.Lessons.Rules.Events`.
 * Регистрируется как `Learn.Lessons.Rules` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, onMount, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { lessonsStore } from './store';

export interface IRulesProps {
  class?: string;
}

export interface IRulesEvents {
  onRuleSelect: { id: string };
}

const RulesComponent = (props: IRulesProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (lessonsStore.rules().length === 0) void lessonsStore.loadRules(apiBase);
  });

  const handleSelect = (id: string) => {
    void lessonsStore.openRule(apiBase, id);
    emit('onRuleSelect', { source: 'Learn.Lessons.Rules', payload: { id } });
  };

  return (
    <Layout.Flex orientation="vertical" gapY={1} p={1} class={props.class}>
      <For each={lessonsStore.rules()}>
        {(rule) => (
          <Card
            role="button"
            tabIndex={0}
            interactive
            selected={lessonsStore.selectedRuleId() === rule.id}
            padding="sm"
            onClick={() => handleSelect(rule.id)}
          >
            <Layout.Flex orientation="vertical" gapY={1}>
              <Typography>{rule.title}</Typography>
              <Show when={rule.tags.length > 0}>
                <Layout.Flex orientation="horizontal" gapX={1} gapY={1} wrap="wrap">
                  <For each={rule.tags}>
                    {(tag) => (
                      <Typography size="sm" tone="muted">
                        #{tag}
                      </Typography>
                    )}
                  </For>
                </Layout.Flex>
              </Show>
            </Layout.Flex>
          </Card>
        )}
      </For>
    </Layout.Flex>
  );
};

/** Phantom `__events` для codegen (см. `List`). На runtime не используется. */
export const Rules: ((props: IRulesProps) => ReturnType<typeof RulesComponent>) & {
  readonly __events?: IRulesEvents;
} = RulesComponent;

export default Rules;
