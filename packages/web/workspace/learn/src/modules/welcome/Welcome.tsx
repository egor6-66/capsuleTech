import { Launcher } from '@capsuletech/web-shell/ui';

import { MAIN_SEGMENTS } from '../../shared/segments';

/**
 * Welcome (`Learn.Welcome.Root`) — корневой лаунчер зоны learn: hero + грид
 * карточек-разделов (`MAIN_SEGMENTS`). Тонкий data-binding над `Shell.Launcher`
 * (клик → `onSegmentNavigate { nav: 'root', segment }`). Был inline-const в
 * `capsule.tsx`.
 */
const Welcome = () => (
  <Launcher
    segments={MAIN_SEGMENTS}
    nav="root"
    title="Learn"
    description="Выберите раздел, чтобы начать обучение."
    hint="Контент придёт с backend/learn (ADR 055)."
  />
);

export default Welcome;
