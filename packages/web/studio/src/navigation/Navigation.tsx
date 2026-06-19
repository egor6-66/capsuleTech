/**
 * Navigation — группа кнопок-сегментов студии (ADR 032).
 *
 * Tier-2 connected block: обычный Solid-компонент (НЕ Controller-обёртка),
 * который рендерится ВНУТРИ родительского HCA-контекста (любая Feature/Controller
 * аппа) и эмитит `onNavigate` через `useEmit` — родитель (Features.App) сам
 * принимает решение что делать: router.goTo, логирование, блокировка перехода.
 *
 * Канон:
 *   - Сегменты студии — её собственное знание; список зашит в `./segments`,
 *     аппом не параметризуется (студия знает свои разделы).
 *   - Активный сегмент derived из роутера через `useRouter().current()` —
 *     single source of truth = URL, никаких локальных стейтов в аппе.
 *   - Пакет НЕ роутит сам: только эмитит `onNavigate` с `payload = segment`.
 *     Если хэндлер `onNavigate` в дереве отсутствует — клик уходит в no-op
 *     через автобаббл; визуально кнопка не «активируется» (active читается
 *     из URL, а URL не сменился).
 *
 * Phantom `__events?: INavigationEvents` → codegen генерирует
 * `namespace WebStudio.Navigation { type Events = ... }`, чтобы
 * `Feature<WebStudio.Navigation.Events>` типизировал `target.payload` в
 * `onNavigate` без per-handler аннотации.
 */

import { useEmit } from '@capsuletech/web-core';
import { useRouter } from '@capsuletech/web-router';
import { Button } from '@capsuletech/web-ui/button';
import { Group } from '@capsuletech/web-ui/group';
import { For } from 'solid-js';
import { SEGMENTS, STUDIO_BASE, type SegmentId } from './segments';

export type { SegmentId };

export interface INavigationEvents {
  /** ID сегмента, по которому кликнули (`'store' | 'creator'`). */
  onNavigate: SegmentId;
}

export interface INavigationProps {
  class?: string;
}

const NavigationComponent = (props: INavigationProps) => {
  const emit = useEmit();
  const router = useRouter();

  const active = (): SegmentId | undefined => {
    const path = router.current();
    if (!path.startsWith(STUDIO_BASE)) return undefined;
    const rest = path.slice(STUDIO_BASE.length).replace(/^\/+/, '');
    const seg = rest.split('/')[0];
    return SEGMENTS.some((s) => s.id === seg) ? (seg as SegmentId) : undefined;
  };

  return (
    <Group orientation="horizontal" variant="attached" class={props.class}>
      <For each={SEGMENTS}>
        {(seg) => (
          <Button
            variant={active() === seg.id ? 'default' : 'ghost'}
            onClick={() => emit('onNavigate', { source: 'WebStudio.Navigation', payload: seg.id })}
          >
            {seg.label}
          </Button>
        )}
      </For>
    </Group>
  );
};

/**
 * WebStudio.Navigation — переключатель разделов студии (store / creator).
 *
 * Phantom `__events?: INavigationEvents` нужен codegen-у для генерации
 * `WebStudio.Navigation.Events` (namespace-merge). На runtime не используется.
 */
export const Navigation: ((props: INavigationProps) => any) & {
  readonly __events?: INavigationEvents;
} = NavigationComponent;
