/**
 * Learn.Concept — статья выбранного концепта (URL-driven по `id`-пропу) через
 * kit-композит `Ui.Article`: title → принцип (lead) → markdown-тело
 * (`Markdown` → `Prose`, ведущий H1 срезан) → примеры (en/ru) → чипы
 * `relatedRules` («Смотри правила»). Блок кормит только данными — вся вёрстка
 * статьи в ките (component-model canon, ноль ручной композиции). Данные — из
 * кэша `conceptsStore.concept(id)` (дедуп); пусто → `Placeholders.Empty`.
 *
 * Кросс-навигация (ADR 069): чип relatedRules → emit `onRuleSelect { id }`;
 * wikilink в теле (`[[ref]]`) → `emitRefNav` (правило/концепт по спискам).
 * Подпись чипа = title правила — читаем `rulesStore.rules()` (концепт-деталь
 * ссылается на правила; read-only lookup, не связь сторов).
 * `useEmitOptional` — тот же контракт, что остальные connected-блоки.
 *
 * Phantom `__events?: IConceptEvents` → codegen `Learn.Concept.Events`.
 * Регистрируется как `Learn.Concept` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Empty } from '@capsuletech/web-placeholders';
import { Article } from '@capsuletech/web-ui/article';
import { createEffect, Show } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { emitRefNav } from '../../core/refnav';
import { Markdown } from '../../shared/markdown';
import { rulesStore } from '../rules/store';
import { conceptsStore } from './store';

export interface IConceptProps {
  class?: string;
  /** Концепт к показу (из URL). */
  id?: string;
}

export interface IConceptEvents {
  onRuleSelect: { id: string };
  onConceptSelect: { id: string };
}

const ConceptComponent = (props: IConceptProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  createEffect(() => {
    const id = props.id;
    if (id) void conceptsStore.openConcept(apiBase, id);
  });

  const concept = () => (props.id ? conceptsStore.concept(props.id) : null);
  const onWikilink = (ref: string) => void emitRefNav(ref, apiBase, 'Learn.Concept', emit);
  const selectRule = (id: string) =>
    emit('onRuleSelect', { source: 'Learn.Concept', payload: { id } });
  // Подпись чипа = title правила, если список правил загружен, иначе сам id.
  const ruleLabel = (id: string) => rulesStore.rules().find((r) => r.id === id)?.title ?? id;

  return (
    <Show when={concept()} fallback={<Empty title="Выберите концепт" />}>
      {(c) => (
        <Article
          title={c().title}
          lead={c().principle || undefined}
          body={<Markdown body={c().body} stripLeadingH1 onWikilink={onWikilink} />}
          examples={c().examples.map((ex) => ({ primary: ex.en, secondary: ex.ru }))}
          related={c().relatedRules.map((id) => ({ id, label: ruleLabel(id) }))}
          relatedLabel="Смотри правила"
          onRelatedSelect={selectRule}
          class={props.class}
        />
      )}
    </Show>
  );
};

/** Phantom `__events` для codegen. На runtime не используется. */
export const Concept: ((props: IConceptProps) => ReturnType<typeof ConceptComponent>) & {
  readonly __events?: IConceptEvents;
} = ConceptComponent;

export default Concept;
