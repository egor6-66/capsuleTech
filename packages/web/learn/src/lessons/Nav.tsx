/**
 * Nav — под-навигация раздела Lessons (ADR 032), калька `library/Navigation`.
 *
 * Tier-2 connected block: обычный Solid-компонент (НЕ Controller-обёртка),
 * рендерится ВНУТРИ родительского HCA-контекста аппа и эмитит
 * `onLessonsNavigate` через `useEmit` — родитель (Features.App) сам решает что
 * делать (router.goTo, лог). Отдельное имя события (НЕ `onNavigate`/
 * `onLibraryNavigate`) — иначе payload схлопнулся бы с другими наборами
 * сегментов в app-Feature.
 *
 * Канон (как library):
 *   - Сегменты Lessons — собственное знание зоны; список в `./segments`.
 *   - Активный сегмент derived из роутера (`useRouter().current()`) —
 *     single source of truth = URL, route-prefix-агностично.
 *   - Пакет НЕ роутит сам: только эмитит `onLessonsNavigate` с payload = segment.
 *
 * Phantom `__events?: ILessonsNavEvents` → codegen `Learn.LessonsNav.Events`.
 * Регистрируется как ПЛОСКИЙ `Learn.LessonsNav` (как `LibraryNav`) через
 * `../capsule` (ADR 033).
 */
import { useEmit } from '@capsuletech/web-core';
import { useRouter } from '@capsuletech/web-router';
import { Button } from '@capsuletech/web-ui/button';
import { Group } from '@capsuletech/web-ui/group';
import { For } from 'solid-js';
import { LESSONS_SEGMENTS, type LessonsSegmentId } from './segments';

export type { LessonsSegmentId };

export interface ILessonsNavEvents {
  /** ID под-раздела, по которому кликнули (`'concepts' | 'rules'`). */
  onLessonsNavigate: LessonsSegmentId;
}

export interface INavProps {
  class?: string;
}

const NavComponent = (props: INavProps) => {
  const emit = useEmit();
  const router = useRouter();

  // Route-prefix-агностично: последний сегмент пути сверяется со своими id.
  const active = (): LessonsSegmentId | undefined => {
    const segs = router.current().split('/').filter(Boolean);
    const last = segs[segs.length - 1];
    return LESSONS_SEGMENTS.some((s) => s.id === last) ? (last as LessonsSegmentId) : undefined;
  };

  return (
    <Group
      orientation="horizontal"
      variant="attached"
      class={['mx-auto w-fit', props.class].filter(Boolean).join(' ')}
    >
      <For each={LESSONS_SEGMENTS}>
        {(seg) => {
          const isActive = () => active() === seg.id;
          return (
            <Button
              variant={isActive() ? 'default' : 'ghost'}
              // active = текущий раздел: подсвечен, но не кликабелен (pointer-events-none
              // вместо disabled — disabled погасил бы подсветку через opacity-50).
              class={isActive() ? 'pointer-events-none' : undefined}
              aria-current={isActive() ? 'page' : undefined}
              onClick={() =>
                emit('onLessonsNavigate', { source: 'Learn.LessonsNav', payload: seg.id })
              }
            >
              {seg.label}
            </Button>
          );
        }}
      </For>
    </Group>
  );
};

/**
 * Learn.LessonsNav — переключатель под-разделов Lessons (concepts / rules).
 *
 * Phantom `__events?: ILessonsNavEvents` нужен codegen-у для
 * `Learn.LessonsNav.Events` (namespace-merge). На runtime не используется.
 */
export const Nav: ((props: INavProps) => ReturnType<typeof NavComponent>) & {
  readonly __events?: ILessonsNavEvents;
} = NavComponent;

export default Nav;
