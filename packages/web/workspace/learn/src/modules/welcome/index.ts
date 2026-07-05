// `./welcome` subpath — теперь ТОЛЬКО данные (сегменты разделов app'а).
// UI ушёл: welcome-панель = композиция `Shell.Launcher` + `LEARN_SEGMENTS` в
// `../capsule` (пилот дедупа Nav/Welcome, канон product-wide kit layering).
export { type ILearnSegment, LEARN_SEGMENTS, type LearnSegmentId } from './segments';
