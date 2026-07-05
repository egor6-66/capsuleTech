/**
 * Learn.Lessons.Rule — тело выбранного правила (URL-driven по `id`-пропу):
 * title (рендерим сами) → markdown-справочник (`Markdown` → `Prose`, ведущий
 * H1 срезан — он и есть title). Дриллы уехали в отдельный `RuleDrills` (правая
 * панель), здесь их НЕТ. Данные — из кэша стора (`lessonsStore.rule(id)`);
 * `openRule` дедуплицирован, поэтому общий с `RuleDrills` id = ОДИН fetch.
 *
 * Wikilinks в теле (`[[ref]]`) → `emitRefNav`: правило → `onRuleSelect`,
 * концепт → `onConceptSelect` (по загруженным спискам). `useEmitOptional` —
 * тот же контракт, что остальные connected-блоки. Fallback до выбора.
 *
 * Phantom `__events?: IRuleEvents` → codegen `Learn.Lessons.Rule.Events`.
 * Регистрируется как `Learn.Lessons.Rule` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { createEffect, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { Markdown } from './Markdown';
import { emitRefNav } from './refnav';
import { lessonsStore } from './store';

export interface IRuleProps {
  class?: string;
  /** Правило к показу (из URL). */
  id?: string;
}

export interface IRuleEvents {
  onRuleSelect: { id: string };
  onConceptSelect: { id: string };
}

const RuleComponent = (props: IRuleProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  // Реакция на смену id: подгрузить правило в кэш (дедуп в сторе).
  createEffect(() => {
    const id = props.id;
    if (id) void lessonsStore.openRule(apiBase, id);
  });

  const rule = () => (props.id ? lessonsStore.rule(props.id) : null);
  const onWikilink = (ref: string) => emitRefNav(ref, 'Learn.Lessons.Rule', emit);

  return (
    <Show
      when={rule()}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
          <Typography tone="muted">Выберите правило</Typography>
        </Layout.Flex>
      }
    >
      {(r) => (
        <Layout.Flex orientation="vertical" gapY={4} p={6} class={props.class}>
          <Typography variant="h1">{r().title}</Typography>
          <Markdown body={r().body} stripLeadingH1 onWikilink={onWikilink} />
        </Layout.Flex>
      )}
    </Show>
  );
};

/** Phantom `__events` для codegen (см. `View`). На runtime не используется. */
export const Rule: ((props: IRuleProps) => ReturnType<typeof RuleComponent>) & {
  readonly __events?: IRuleEvents;
} = RuleComponent;

export default Rule;
