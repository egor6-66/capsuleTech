import { useEmitOptional } from '@capsuletech/web-core';
import { useActiveSegment } from '@capsuletech/web-router';
import { Header } from '@capsuletech/web-shell/ui';
import { Button } from '@capsuletech/web-ui/button';

import { SEGMENTS } from '../../shared/segments';

/**
 * MainNav (`WebStudio.Nav.Main`) — header-таббар внутренней навигации студии
 * (store / creator). Зеркало `learn/modules/navigation/MainNav`.
 *
 * Header-лук поверх `Shell.Header.Navigation` (batch-контейнер над `ui.Group`) +
 * механика `Shell.SegmentNav`: активный сегмент — производная от URL
 * (`useActiveSegment`, route-prefix-агностично), клик эмитит generic
 * `onSegmentNavigate { nav: 'web-studio', segment }` (тот же контракт, что
 * sub-nav'ы; app-Feature различает источник по `payload.nav`). Пакет НЕ знает
 * app-путей — только id сегментов; web-shell собираем из готовых блоков.
 *
 * `useEmitOptional` (НЕ useEmit): может рендериться вне host-scope — тогда emit
 * тихо no-op'ится.
 *
 * Собственных `__events` у блока НЕТ — контракт события типизируется из
 * `Shell.SegmentNav.Events`, агрегировать в `WebStudio.Nav.*.Events` нечего (nav
 * влияет только на рендер; вложенный ключ безопасен, прецедент `Learn.Library.Info`).
 */
const MainNav = () => {
  const emit = useEmitOptional();
  const active = useActiveSegment(SEGMENTS.map((s) => s.id));

  // Item реактивен по `active()`: `Group` рендерит batch через `<For>`
  // (props-маппер вызывается один раз на item), поэтому подсветку держим внутри
  // самого элемента, а не в статичном props-мапе.
  const NavButton = (p: { id: string; label: string }) => (
    <Button
      variant={active() === p.id ? 'default' : 'ghost'}
      aria-current={active() === p.id ? 'page' : undefined}
      onClick={() =>
        emit('onSegmentNavigate', {
          source: 'WebStudio.Nav.Main',
          payload: { nav: 'web-studio', segment: p.id },
        })
      }
    >
      {p.label}
    </Button>
  );

  return (
    <Header.Navigation
      variant="attached"
      data={[...SEGMENTS]}
      item={{ use: NavButton, props: (s) => ({ id: s.id, label: s.label }) }}
    />
  );
};

export default MainNav;
