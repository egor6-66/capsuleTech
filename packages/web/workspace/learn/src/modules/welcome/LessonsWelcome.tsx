import { Launcher } from '@capsuletech/web-shell/ui';

import { LESSONS_SEGMENTS } from '../../shared/segments';

/**
 * LessonsWelcome (`Learn.Welcome.Lessons`) — лаунчер раздела Lessons
 * (`LESSONS_SEGMENTS`). Тонкий data-binding над `Shell.Launcher` (клик →
 * `onSegmentNavigate { nav: 'lessons', segment }`). Был inline-const в `capsule.tsx`.
 */
const LessonsWelcome = () => (
  <Launcher
    segments={LESSONS_SEGMENTS}
    nav="lessons"
    title="Lessons"
    description="Выберите раздел уроков."
    hint="Концепты и правила приходят из lang-vault (backend/learn)."
  />
);

export default LessonsWelcome;
