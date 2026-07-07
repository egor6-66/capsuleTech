import { useEmitOptional } from '@capsuletech/web-core';
import { useActiveSegment } from '@capsuletech/web-router';
import { Header } from '@capsuletech/web-shell/ui';
import { Button } from '@capsuletech/web-ui/button';

import { MAIN_SEGMENTS } from '../../shared/segments';

/**
 * MainNav (`Learn.Nav.Main`) — главный header-nav зоны learn. Раньше жил в АППЕ
 * (`apps/learn/src/shapes/shellNavigation.tsx`) — теперь пакетный концерн: app
 * лишь монтит блок в хедере и роутит его событие.
 *
 * Header-лук поверх `Shell.Header.Navigation` (batch-контейнер над `ui.Group`) +
 * зеркало механики `Shell.SegmentNav`: активный сегмент — производная от URL
 * (`useActiveSegment`, route-prefix-агностично), клик эмитит generic
 * `onSegmentNavigate { nav: 'root', segment }` (тот же контракт, что sub-nav'ы;
 * app-Feature различает источник по `payload.nav`). web-shell НЕ трогаем —
 * собираем из его готовых блоков + kit-примитивов.
 *
 * `useEmitOptional` (НЕ useEmit): может рендериться вне host-scope — вне scope
 * emit тихо no-op'ится.
 *
 * Собственных `__events` у блока нет — контракт события типизируется из
 * `Shell.SegmentNav.Events`, агрегировать в `Learn.Nav.*.Events` нечего (nav
 * влияет только на рендер; вложенный ключ безопасен, прецедент `Learn.Library.Info`).
 */
const MainNav = () => {
  const emit = useEmitOptional();
  const active = useActiveSegment(MAIN_SEGMENTS.map((s) => s.id));

  // Item-компонент реактивен по `active()`: `Group` рендерит batch через `<For>`
  // (props-маппер вызывается один раз на item), поэтому подсветку держим внутри
  // самого элемента, а не в статичном props-мапе.
  const NavButton = (p: { id: string; label: string }) => (
    <Button
      variant={active() === p.id ? 'default' : 'ghost'}
      aria-current={active() === p.id ? 'page' : undefined}
      onClick={() =>
        emit('onSegmentNavigate', {
          source: 'Learn.Nav.Main',
          payload: { nav: 'root', segment: p.id },
        })
      }
    >
      {p.label}
    </Button>
  );

  return (
    <Header.Navigation
      variant="attached"
      data={[...MAIN_SEGMENTS]}
      item={{ use: NavButton, props: (s) => ({ id: s.id, label: s.label }) }}
    />
  );
};

export default MainNav;
