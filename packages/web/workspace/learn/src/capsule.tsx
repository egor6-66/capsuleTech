/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Welcome | Learn.Exercise | Learn.Progress |
 *   Learn.VocabList | Learn.Tour | Learn.SentenceBuilder | Learn.LibraryNav |
 *   Learn.LessonsNav | Learn.LessonsWelcome | Learn.LibraryWelcome | Learn.Collections |
 *   Learn.Library.{Search,Words,Info} |
 *   Learn.Lessons.{List,View,Concepts,Concept,Rules,Rule,RuleDrills}
 *
 * `Library` / `Lessons` — вложенные namespace-блоки (как `WebStudio.*` на
 * верхнем уровне, но на уровень глубже): `Learn.Library.Search` /
 * `Learn.Lessons.List` и т.д. Блоки раздельные намеренно (апп раскладывает по
 * слотам Matrix сам: список слева, деталь справа).
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
import { Exercise } from './exercise';
import { Tour } from './guides';
import { Concept, Concepts, List, Rule, RuleDrills, Rules, View } from './lessons';
import { LESSONS_SEGMENTS } from './lessons/segments';
import { Collections, Info, Search, VocabList, Words } from './library';
import { LIBRARY_SEGMENTS } from './library/segments';
import { Progress } from './progress';
import { SentenceBuilder } from './sentence-builder';
import { LEARN_SEGMENTS } from './welcome/segments';

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
    VocabList,
    Tour,
    SentenceBuilder,
    LibraryNav,
    LessonsNav,
    LessonsWelcome,
    LibraryWelcome,
    Collections,
    Library: { Search, Words, Info },
    Lessons: { List, View, Concepts, Concept, Rules, Rule, RuleDrills },
  },
});
