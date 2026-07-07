/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Exercise | Learn.Progress | Learn.Tour |
 *   Learn.SentenceBuilder | Learn.Collections |
 *   Learn.Words | Learn.Search | Learn.Markdown |
 *   Learn.Nav.{Main,Library,Lessons} | Learn.Welcome.{Root,Library,Lessons} |
 *   Learn.Library.{Info} |
 *   Learn.Lesson | Learn.Lessons | Learn.Concept | Learn.Concepts |
 *   Learn.Rule | Learn.Rules | Learn.RuleDrills
 *
 * `Words` / `Search` / `Markdown` — промоутнутые атомы `shared/` (переиспользуются
 * многими модулями, поэтому top-level, не под `Library`).
 *
 * lessons-домен раздроблен по сущностям (бриф split) и регистрируется ПЛОСКО:
 * `<Entity>` = деталь, `<Entities>` = список — `Learn.Lesson`/`Learn.Lessons` и т.д.
 *
 * ## Nav / Welcome — пакетные блоки, вложенный неймспейс (консолидация)
 *
 * Навигация консолидирована в пакет (бриф `web-learn-nav-consolidation`):
 * - `Learn.Nav.Main` — главный header-nav (был app-Shape `shapes/shellNavigation`);
 * - `Learn.Nav.{Library,Lessons}` — под-навы (были inline-const'ы здесь);
 * - `Learn.Welcome.{Root,Library,Lessons}` — лаунчеры (были inline-const'ы здесь).
 *
 * Блоки живут в своих папках (`modules/navigation` / `modules/welcome`), данные
 * сегментов — единый источник `shared/segments`. Вложенный неймспейс безопасен:
 * у nav/welcome-блоков нет своих `__events` (контракт события —
 * `Shell.SegmentNav.Events`, generic `onSegmentNavigate { nav, segment }`), а
 * вложенность влияет только на рендер (прецедент `Learn.Library.Info`). App
 * различает источник по `payload.nav` (`root`/`library`/`lessons`).
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { LearnProvider } from './core';
import { Concept, Concepts } from './modules/concepts';
import { Exercise } from './modules/exercise';
import { Tour } from './modules/guides';
import { Lesson, Lessons } from './modules/lessons';
import { Collections, Info } from './modules/library';
import {
  Lessons as NavLessons,
  Library as NavLibrary,
  Main as NavMain,
} from './modules/navigation';
import { Progress } from './modules/progress';
import { Rule, RuleDrills, Rules } from './modules/rules';
import { SentenceBuilder } from './modules/sentence-builder';
import {
  Lessons as WelcomeLessons,
  Library as WelcomeLibrary,
  Root as WelcomeRoot,
} from './modules/welcome';
import { Markdown } from './shared/markdown';
import { Search } from './shared/search';
import { Words } from './shared/words';

export default defineCapsuleModule({
  name: 'Learn',
  components: {
    Provider: LearnProvider,
    Exercise,
    Progress,
    Tour,
    SentenceBuilder,
    Collections,
    Words,
    Search,
    Markdown,
    Nav: { Main: NavMain, Library: NavLibrary, Lessons: NavLessons },
    Welcome: { Root: WelcomeRoot, Library: WelcomeLibrary, Lessons: WelcomeLessons },
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
