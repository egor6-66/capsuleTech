/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Welcome | Learn.Exercise | Learn.Progress |
 *   Learn.Tour | Learn.SentenceBuilder | Learn.LibraryNav |
 *   Learn.LessonsNav | Learn.LessonsWelcome | Learn.LibraryWelcome | Learn.Collections |
 *   Learn.Words | Learn.Search | Learn.Markdown |
 *   Learn.Library.{Info} |
 *   Learn.Lesson | Learn.Lessons | Learn.Concept | Learn.Concepts |
 *   Learn.Rule | Learn.Rules | Learn.RuleDrills
 *
 * `Words` / `Search` / `Markdown` — промоутнутые атомы `shared/` (были
 * `Learn.Library.Words`/`.Search` / internal): переиспользуются многими
 * модулями, поэтому top-level, не под `Library`.
 *
 * lessons-домен раздроблен по сущностям (бриф split) и регистрируется ПЛОСКО:
 * `<Entity>` = деталь, `<Entities>` = список — `Learn.Lesson`/`Learn.Lessons`,
 * `Learn.Concept`/`Learn.Concepts`, `Learn.Rule`/`Learn.Rules` (+ `RuleDrills`).
 * Больше НЕ nested `Learn.Lessons.{...}` — плоские ключи попадают в codegen-
 * агрегат `.Events` штатно (ручное типизирование событий не нужно). Блоки
 * раздельные намеренно (апп раскладывает по слотам Matrix сам: список слева,
 * деталь справа). `Library.Info` пока остаётся вложенным (вне scope split).
 *
 * ## Nav / Welcome — композиция shell-блоков, НЕ свой UI (пилот дедупа)
 *
 * `LibraryNav`/`LessonsNav`/`Welcome`/`LessonsWelcome`/`LibraryWelcome` больше НЕ
 * собственные компоненты зоны — визуал уехал в `@capsuletech/web-shell/ui`
 * (`SegmentNav`/`Launcher`, поверх stateless web-ui `SegmentedBar`/`Launcher`).
 * Здесь остаётся ТОЛЬКО тонкий data-binding: shell-блок + сегменты зоны
 * (`LEARN_SEGMENTS`/`LESSONS_SEGMENTS`/`LIBRARY_SEGMENTS` = данные, не UI).
 * Ключи глобалов `Learn.*` не меняются — апп продолжает звать те же
 * `Learn.LibraryNav`/`Learn.Welcome`/…; меняется источник (shell-блок) и
 * событие: оба блока эмитят единый generic `onSegmentNavigate { nav, segment }`
 * (см. `Shell.SegmentNav.Events`), app-Feature различает источник по
 * `payload.nav`. Собственных `__events`-фантомов у этих биндингов нет — контракт
 * события типизируется из web-shell, не из `Learn.*.Events`.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { Launcher, SegmentNav } from '@capsuletech/web-shell/ui';
import { LearnProvider } from './core';
import { Concept, Concepts } from './modules/concepts';
import { Exercise } from './modules/exercise';
import { Tour } from './modules/guides';
import { Lesson, Lessons } from './modules/lessons';
import { LESSONS_SEGMENTS } from './modules/lessons/segments';
import { Collections, Info } from './modules/library';
import { LIBRARY_SEGMENTS } from './modules/library/segments';
import { Progress } from './modules/progress';
import { Rule, RuleDrills, Rules } from './modules/rules';
import { SentenceBuilder } from './modules/sentence-builder';
import { LEARN_SEGMENTS } from './modules/welcome/segments';
import { Markdown } from './shared/markdown';
import { Search } from './shared/search';
import { Words } from './shared/words';

// Тонкие data-биндинги: композиция готового shell-блока с данными зоны.
// Это НЕ «свой UI» — весь визуал/механика/классы живут в web-shell/web-ui.
const LibraryNav = () => <SegmentNav segments={LIBRARY_SEGMENTS} nav="library" />;
const LessonsNav = () => <SegmentNav segments={LESSONS_SEGMENTS} nav="lessons" />;

const Welcome = () => (
  <Launcher
    segments={LEARN_SEGMENTS}
    nav="root"
    title="Learn"
    description="Выберите раздел, чтобы начать обучение."
    hint="Контент придёт с backend/learn (ADR 055)."
  />
);
const LessonsWelcome = () => (
  <Launcher
    segments={LESSONS_SEGMENTS}
    nav="lessons"
    title="Lessons"
    description="Выберите раздел уроков."
    hint="Концепты и правила приходят из lang-vault (backend/learn)."
  />
);
const LibraryWelcome = () => (
  <Launcher
    segments={LIBRARY_SEGMENTS}
    nav="library"
    title="Library"
    description="Выберите раздел библиотеки."
    hint="Словарь и закладки придут с backend/learn (ADR 055)."
  />
);

export default defineCapsuleModule({
  name: 'Learn',
  components: {
    Provider: LearnProvider,
    Welcome,
    Exercise,
    Progress,
    Tour,
    SentenceBuilder,
    LibraryNav,
    LessonsNav,
    LessonsWelcome,
    LibraryWelcome,
    Collections,
    Words,
    Search,
    Markdown,
    Library: { Info },
    Lesson,
    Lessons,
    Concept,
    Concepts,
    Rule,
    Rules,
    RuleDrills,
  },
});
