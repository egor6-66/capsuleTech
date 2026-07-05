/**
 * Learn.Concepts — библиотека прозы через `Ui.SectionedList` (ADR 069,
 * kit-композит «аккордеон групп → список»). Секция = вид концепта (Подход /
 * Паттерн / Рекомендация), элементы = концепты (только title — маршрут-темы, не
 * раздуваем). Блок кормит только данными — вся структура в ките.
 * Порядок групп + ru-подписи + подзаголовки — константа блока; внутри — по
 * `sortOrder`, затем title.
 *
 * URL-driven: активный концепт приходит `id`-пропом (deep-link), клик = emit
 * `onConceptSelect { id }` наверх (апп роутит). Группы РАЗВЁРНУТЫ по умолчанию —
 * концепты читаются маршрутом (раскрываем один раз при первой подгрузке списка).
 *
 * `useEmitOptional` — блок рендерится и вне Controller/Feature-scope (unit).
 * Phantom `__events?: IConceptsEvents` → codegen `Learn.Concepts.Events`.
 * Регистрируется как `Learn.Concepts` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Empty } from '@capsuletech/web-placeholders';
import { SectionedList } from '@capsuletech/web-ui/sectionedList';
import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { conceptsStore } from './store';
import type { ConceptKind, IConceptSummary } from './types';

export interface IConceptsProps {
  class?: string;
  /** Активный концепт (из URL) — подсветка карточки. */
  id?: string;
}

export interface IConceptsEvents {
  onConceptSelect: { id: string };
}

interface IConceptGroup {
  kind: ConceptKind;
  label: string;
  subtitle: string;
}

/** Порядок видов концептов + ru-подписи (single source — этот блок). */
const CONCEPT_GROUPS: readonly IConceptGroup[] = [
  { kind: 'approach', label: 'Подход', subtitle: 'Как думать о языке в целом.' },
  { kind: 'pattern', label: 'Паттерн', subtitle: 'Повторяемые модели построения.' },
  { kind: 'recommendation', label: 'Рекомендация', subtitle: 'Практические советы и привычки.' },
] as const;

const byOrder = (a: IConceptSummary, b: IConceptSummary): number =>
  a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

const ConceptsComponent = (props: IConceptsProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (conceptsStore.concepts().length === 0) void conceptsStore.loadConcepts(apiBase);
  });

  const groups = () =>
    CONCEPT_GROUPS.map((g) => ({
      ...g,
      items: conceptsStore
        .concepts()
        .filter((c) => c.kind === g.kind)
        .sort(byOrder),
    })).filter((g) => g.items.length > 0);

  // Развёрнуто по умолчанию: раскрываем все непустые группы ОДИН раз, когда
  // список впервые подгрузился; далее пользователь тогглит свободно.
  const [open, setOpen] = createSignal<string[]>([]);
  let seeded = false;
  createEffect(() => {
    const gs = groups();
    if (seeded || gs.length === 0) return;
    seeded = true;
    setOpen(gs.map((g) => g.kind));
  });

  const handleSelect = (id: string) => {
    emit('onConceptSelect', { source: 'Learn.Concepts', payload: { id } });
  };

  return (
    <Show when={groups().length > 0} fallback={<Empty title="Библиотека пуста" compact />}>
      <SectionedList
        sections={groups().map((g) => ({
          value: g.kind,
          label: g.label,
          subtitle: g.subtitle,
          items: g.items.map((c) => ({ id: c.id, label: c.title })),
        }))}
        selectedId={props.id}
        onSelect={handleSelect}
        open={open()}
        onOpenChange={setOpen}
        class={props.class}
      />
    </Show>
  );
};

/** Phantom `__events` для codegen. На runtime не используется. */
export const Concepts: ((props: IConceptsProps) => ReturnType<typeof ConceptsComponent>) & {
  readonly __events?: IConceptsEvents;
} = ConceptsComponent;

export default Concepts;
