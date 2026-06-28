/**
 * Navigation — группа кнопок-сегментов library (ADR 032), калька studio Navigation.
 *
 * Tier-2 connected block: обычный Solid-компонент (НЕ Controller-обёртка),
 * рендерится ВНУТРИ родительского HCA-контекста (Feature/Controller аппа) и
 * эмитит `onLibraryNavigate` через `useEmit` — родитель (Features.App) сам решает
 * что делать (router.goTo, лог, блокировка).
 *
 * Отдельное событие `onLibraryNavigate` (НЕ `onNavigate`) — иначе в app-Feature
 * payload схлопнулся бы с `Learn.Welcome.onNavigate` (другой набор сегментов).
 *
 * Канон:
 *   - Сегменты library — собственное знание зоны; список в `./segments`,
 *     аппом не параметризуется.
 *   - Активный сегмент derived из роутера через `useRouter().current()` —
 *     single source of truth = URL.
 *   - Пакет НЕ роутит сам: только эмитит `onLibraryNavigate` с `payload = segment`.
 *
 * Phantom `__events?: ILibraryNavEvents` → codegen `Learn.LibraryNav.Events`.
 */

import { useEmit } from '@capsuletech/web-core';
import { useRouter } from '@capsuletech/web-router';
import { Button } from '@capsuletech/web-ui/button';
import { Group } from '@capsuletech/web-ui/group';
import { For } from 'solid-js';
import { LIBRARY_BASE, LIBRARY_SEGMENTS, type LibrarySegmentId } from './segments';

export type { LibrarySegmentId };

export interface ILibraryNavEvents {
  /** ID под-раздела, по которому кликнули (`'explorer' | 'collections'`). */
  onLibraryNavigate: LibrarySegmentId;
}

export interface ILibraryNavProps {
  class?: string;
}

const NavigationComponent = (props: ILibraryNavProps) => {
  const emit = useEmit();
  const router = useRouter();

  const active = (): LibrarySegmentId | undefined => {
    const path = router.current();
    if (!path.startsWith(LIBRARY_BASE)) return undefined;
    const rest = path.slice(LIBRARY_BASE.length).replace(/^\/+/, '');
    const seg = rest.split('/')[0];
    return LIBRARY_SEGMENTS.some((s) => s.id === seg) ? (seg as LibrarySegmentId) : undefined;
  };

  return (
    <Group orientation="horizontal" variant="attached" class={props.class}>
      <For each={LIBRARY_SEGMENTS}>
        {(seg) => (
          <Button
            variant={active() === seg.id ? 'default' : 'ghost'}
            onClick={() =>
              emit('onLibraryNavigate', { source: 'Learn.LibraryNav', payload: seg.id })
            }
          >
            {seg.label}
          </Button>
        )}
      </For>
    </Group>
  );
};

/**
 * Learn.LibraryNav — переключатель под-разделов library (explorer / collections).
 *
 * Phantom `__events?: ILibraryNavEvents` нужен codegen-у для генерации
 * `Learn.LibraryNav.Events` (namespace-merge). На runtime не используется.
 */
export const Navigation: ((props: ILibraryNavProps) => any) & {
  readonly __events?: ILibraryNavEvents;
} = NavigationComponent;
