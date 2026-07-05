/**
 * `./lessons` — публичный барель lessons-домена. Внутри домен раздроблен на
 * per-entity модули (`lessons`/`concepts`/`rules`/`drills`, бриф split): каждый
 * владеет своим стором/api/types/блоками. Этот барель их агрегирует в один
 * публичный субпат (backward-compat для manual-typing импортов app'а); сами
 * блоки регистрируются ПЛОСКО — `Learn.Lesson`/`Learn.Concept`/… (не nested).
 *
 * Internal (НЕ реэкспортим): `Drill`/`LessonCard` (item-шаблоны), `core/refnav`
 * (координатор), api-функции.
 */

export type { ConceptKind, IConcept, IConceptSummary, ILessonExample } from '../concepts';
// ── Concept (библиотека прозы) ───────────────────────────────────────────────
export {
  Concept,
  Concepts,
  conceptsStore,
  type IConceptEvents,
  type IConceptProps,
  type IConceptsEvents,
  type IConceptsProps,
  type IConceptsStore,
} from '../concepts';
export type {
  ICheckRequest,
  ICheckResult,
  IDrill,
  IDrillItem,
  ILessonAudio,
  ILessonImage,
  IResolvedWord,
  Verdict,
} from '../drills';
// ── Drill (интерактив) — стор + контракты (компонент `Drill` internal) ────────
export { drillsStore, type IDrillsStore } from '../drills';
export type { IRule, IRuleDetail, IRuleSummary, RuleCategory } from '../rules';
// ── Rule (справочник + практика) ─────────────────────────────────────────────
export {
  type IRuleDrillsEvents,
  type IRuleDrillsProps,
  type IRuleEvents,
  type IRuleProps,
  type IRulesEvents,
  type IRulesProps,
  type IRulesStore,
  Rule,
  RuleDrills,
  Rules,
  rulesStore,
} from '../rules';
// ── Lesson (урок) ────────────────────────────────────────────────────────────
export { type ILessonEvents, type ILessonProps, Lesson } from './Lesson';
export { type ILessonsEvents, type ILessonsProps, Lessons } from './Lessons';
export { type ILessonsSegment, LESSONS_SEGMENTS, type LessonsSegmentId } from './segments';
export { type ILessonsStore, lessonsStore } from './store';
export type { ILessonDetail, ILessonSummary } from './types';
