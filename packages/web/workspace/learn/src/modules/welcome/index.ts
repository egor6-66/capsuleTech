/**
 * `modules/welcome` — welcome-лаунчеры зоны learn (hero + грид разделов).
 *
 * `Root`/`Lessons`/`Library` — тонкие data-биндинги над `Shell.Launcher` +
 * сегменты зоны (из `shared/segments`). Регистрируются вложенно
 * `Learn.Welcome.{Root,Lessons,Library}` (решение user: не плодить имена,
 * симметрия с `Learn.Nav.*`). Ранее лаунчеры были inline-const'ами в `capsule.tsx`,
 * а `segments.ts` жил тут — оба переехали (UI → сюда, данные → `shared/segments`).
 *
 * Тип main-сегментов реэкспортится для типизации хендлеров (backward-compat
 * `./welcome` subpath; `MAIN_SEGMENTS` был `LEARN_SEGMENTS`).
 */
export { type IMainSegment, MAIN_SEGMENTS, type MainSegmentId } from '../../shared/segments';
export { default as Lessons } from './LessonsWelcome';
export { default as Library } from './LibraryWelcome';
export { default as Root } from './Welcome';
