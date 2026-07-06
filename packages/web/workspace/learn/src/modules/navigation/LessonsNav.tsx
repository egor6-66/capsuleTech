import { SegmentNav } from '@capsuletech/web-shell/ui';

import { LESSONS_SEGMENTS } from '../../shared/segments';

/**
 * LessonsNav (`Learn.Nav.Lessons`) — под-навигация Lessons. Тонкий data-binding:
 * `Shell.SegmentNav` + сегменты зоны (эмитит `onSegmentNavigate { nav: 'lessons',
 * segment }`). Был inline-const в `capsule.tsx`.
 */
const LessonsNav = () => <SegmentNav segments={LESSONS_SEGMENTS} nav="lessons" />;

export default LessonsNav;
