import { SegmentNav } from '@capsuletech/web-shell/ui';

import { LIBRARY_SEGMENTS } from '../../shared/segments';

/**
 * LibraryNav (`Learn.Nav.Library`) — под-навигация library. Тонкий data-binding:
 * готовый connected-блок `Shell.SegmentNav` + сегменты зоны. Весь визуал/active/
 * emit — внутри web-shell (эмитит `onSegmentNavigate { nav: 'library', segment }`).
 * Был inline-const в `capsule.tsx`.
 */
const LibraryNav = () => <SegmentNav segments={LIBRARY_SEGMENTS} nav="library" />;

export default LibraryNav;
