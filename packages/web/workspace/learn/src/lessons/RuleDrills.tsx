/**
 * Learn.Lessons.RuleDrills — практика правила (URL-driven по `id`-пропу):
 * секция «Практика» с дриллами правила (существующий internal `Drill`, чекер
 * глобален в `lessonsStore`, item'ы санитизированы бэком). Выделен из `Rule` в
 * отдельный блок под правую панель three-pane (бриф three-pane).
 *
 * Данные — из ТОГО ЖЕ кэша, что `Rule`: `openRule` дедуплицирован, поэтому оба
 * блока на один id = ОДИН fetch правила (дриллы приезжают в его композиции).
 *
 * Слова дриллов озвучиваются через `onSpeak { audioUrl }` — тот же канал, что
 * `Learn.Lessons.View` / `Learn.Library.*`; плеер/движок — app-concern.
 * `useEmitOptional` — тот же контракт, что остальные connected-блоки.
 *
 * Phantom `__events?: IRuleDrillsEvents` → codegen `Learn.Lessons.RuleDrills.Events`.
 * Регистрируется как `Learn.Lessons.RuleDrills` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { createEffect, For, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { Drill } from './Drill';
import { lessonsStore } from './store';

export interface IRuleDrillsProps {
  class?: string;
  /** Правило, чьи дриллы показываем (из URL). */
  id?: string;
}

export interface IRuleDrillsEvents {
  onSpeak: { audioUrl: string | null };
}

const RuleDrillsComponent = (props: IRuleDrillsProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  // Реакция на смену id: подгрузить правило в кэш (дедуп со стороной `Rule`).
  createEffect(() => {
    const id = props.id;
    if (id) void lessonsStore.openRule(apiBase, id);
  });

  const drills = () => (props.id ? (lessonsStore.rule(props.id)?.drills ?? []) : []);
  const handleSpeak = (audioUrl: string | null) => {
    emit('onSpeak', { source: 'Learn.Lessons.RuleDrills', payload: { audioUrl } });
  };

  return (
    <Show
      when={drills().length > 0}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
          <Typography tone="muted">Практики нет</Typography>
        </Layout.Flex>
      }
    >
      <Layout.Flex orientation="vertical" gapY={3} p={6} class={props.class}>
        <Typography variant="h2">Практика</Typography>
        <For each={drills()}>
          {(drill) => <Drill drill={drill} apiBase={apiBase} onSpeak={handleSpeak} />}
        </For>
      </Layout.Flex>
    </Show>
  );
};

/** Phantom `__events` для codegen (см. `View`). На runtime не используется. */
export const RuleDrills: ((props: IRuleDrillsProps) => ReturnType<typeof RuleDrillsComponent>) & {
  readonly __events?: IRuleDrillsEvents;
} = RuleDrillsComponent;

export default RuleDrills;
