/**
 * Learn.Rules — справочник правил через `Ui.SectionedList` (ADR 069,
 * kit-композит «аккордеон групп → список»). Секция = категория (Фонетика /
 * Грамматика / Речь), элементы = правила (только title — список растёт, не
 * раздуваем). Порядок групп + ru-подписи + подзаголовки — константа блока;
 * внутри группы — по `sortOrder`, затем title. Блок кормит только данными —
 * вся структура в ките.
 *
 * URL-driven: активное правило приходит `id`-пропом (deep-link), клик по
 * элементу = emit `onRuleSelect { id }` наверх (апп роутит). Группы свёрнуты по
 * умолчанию, КРОМЕ группы активного `id` (раскрываем один раз при появлении
 * id/списка; дальше пользователь свободно тогглит).
 *
 * `useEmitOptional` — блок рендерится и вне Controller/Feature-scope (unit).
 * Phantom `__events?: IRulesEvents` → codegen `Learn.Rules.Events`.
 * Регистрируется как `Learn.Rules` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Empty } from '@capsuletech/web-placeholders';
import { SectionedList } from '@capsuletech/web-ui/sectionedList';
import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { rulesStore } from './store';
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
    if (rulesStore.rules().length === 0) void rulesStore.loadRules(apiBase);
  });

  // Непустые группы в каноничном порядке, элементы отсортированы.
  const groups = () =>
    RULE_GROUPS.map((g) => ({
      ...g,
      items: rulesStore
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
    const category = rulesStore.rules().find((r) => r.id === id)?.category;
    if (!id || id === appliedId || !category) return;
    appliedId = id;
    setOpen((prev) => (prev.includes(category) ? prev : [...prev, category]));
  });

  const handleSelect = (id: string) => {
    emit('onRuleSelect', { source: 'Learn.Rules', payload: { id } });
  };

  return (
    <Show when={groups().length > 0} fallback={<Empty title="Справочник пуст" compact />}>
      <SectionedList
        sections={groups().map((g) => ({
          value: g.category,
          label: g.label,
          subtitle: g.subtitle,
          items: g.items.map((r) => ({ id: r.id, label: r.title })),
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
export const Rules: ((props: IRulesProps) => ReturnType<typeof RulesComponent>) & {
  readonly __events?: IRulesEvents;
} = RulesComponent;

export default Rules;
