/**
 * Learn.Rule — тело выбранного правила (URL-driven по `id`-пропу) через
 * kit-композит `Ui.Article` (без examples/related — правило это title +
 * markdown-справочник, `Markdown` → `Prose`, ведущий H1 срезан — он и есть
 * title). Дриллы уехали в отдельный `RuleDrills` (правая панель), здесь их НЕТ.
 * Данные — из кэша `rulesStore.rule(id)`; `openRule` дедуплицирован, поэтому
 * общий с `RuleDrills` id = ОДИН fetch. Пусто → `Placeholders.Empty`.
 *
 * Wikilinks в теле (`[[ref]]`) → `emitRefNav`: правило → `onRuleSelect`,
 * концепт → `onConceptSelect` (по загруженным спискам). `useEmitOptional` —
 * тот же контракт, что остальные connected-блоки. Fallback до выбора.
 *
 * Phantom `__events?: IRuleEvents` → codegen `Learn.Rule.Events`.
 * Регистрируется как `Learn.Rule` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Empty } from '@capsuletech/web-placeholders';
import { Article } from '@capsuletech/web-ui/article';
import { createEffect, Show } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { emitRefNav } from '../../core/refnav';
import { Markdown } from '../../shared/markdown';
import { rulesStore } from './store';

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
    if (id) void rulesStore.openRule(apiBase, id);
  });

  const rule = () => (props.id ? rulesStore.rule(props.id) : null);
  const onWikilink = (ref: string) => void emitRefNav(ref, apiBase, 'Learn.Rule', emit);

  return (
    <Show when={rule()} fallback={<Empty title="Выберите правило" />}>
      {(r) => (
        <Article
          title={r().title}
          body={<Markdown body={r().body} stripLeadingH1 onWikilink={onWikilink} />}
          class={props.class}
        />
      )}
    </Show>
  );
};

/** Phantom `__events` для codegen. На runtime не используется. */
export const Rule: ((props: IRuleProps) => ReturnType<typeof RuleComponent>) & {
  readonly __events?: IRuleEvents;
} = RuleComponent;

export default Rule;
