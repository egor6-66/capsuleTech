import { Launcher } from '@capsuletech/web-shell/ui';

import { LIBRARY_SEGMENTS } from '../../shared/segments';

/**
 * LibraryWelcome (`Learn.Welcome.Library`) — лаунчер раздела library
 * (`LIBRARY_SEGMENTS`). Тонкий data-binding над `Shell.Launcher` (клик →
 * `onSegmentNavigate { nav: 'library', segment }`). Был inline-const в `capsule.tsx`.
 */
const LibraryWelcome = () => (
  <Launcher
    segments={LIBRARY_SEGMENTS}
    nav="library"
    title="Library"
    description="Выберите раздел библиотеки."
    hint="Словарь и закладки придут с backend/learn (ADR 055)."
  />
);

export default LibraryWelcome;
