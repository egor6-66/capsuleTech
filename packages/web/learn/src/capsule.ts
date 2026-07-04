/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Welcome | Learn.Exercise | Learn.Progress |
 *   Learn.VocabList | Learn.Tour | Learn.SentenceBuilder | Learn.LibraryNav |
 *   Learn.LibraryWelcome | Learn.Collections |
 *   Learn.Library.{Search,Words,Info} | Learn.Lessons.{List,View}
 *
 * `Library` / `Lessons` — вложенные namespace-блоки (как `WebStudio.*` на
 * верхнем уровне, но на уровень глубже): `Learn.Library.Search` /
 * `Learn.Lessons.List` и т.д. Блоки раздельные намеренно (апп раскладывает по
 * слотам Matrix сам: List слева, View справа). codegen per-component `.Events`
 * aggregate (`packagesTypesOut`, `componentEntries` в CapsuleRegistryPlugin)
 * читает только ПЛОСКИЕ ключи `components` — вложенные `Library.*`/`Lessons.*`
 * в агрегат не попадают; `IWordsEvents`/`ILessonsListEvents` типизируются
 * вручную через прямой импорт из `./library` / `./lessons`.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { LearnProvider } from './core';
import { Exercise } from './exercise';
import { Tour } from './guides';
import { List, View } from './lessons';
import {
  Collections,
  Info,
  Navigation as LibraryNav,
  LibraryWelcome,
  Search,
  VocabList,
  Words,
} from './library';
import { Progress } from './progress';
import { SentenceBuilder } from './sentence-builder';
import { Welcome } from './welcome';

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
    LibraryWelcome,
    Collections,
    Library: { Search, Words, Info },
    Lessons: { List, View },
  },
});
