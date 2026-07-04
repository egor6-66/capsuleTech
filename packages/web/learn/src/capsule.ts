/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Welcome | Learn.LessonView | Learn.Exercise |
 *   Learn.Progress | Learn.VocabList | Learn.Tour | Learn.SentenceBuilder |
 *   Learn.LibraryNav | Learn.LibraryWelcome | Learn.Collections |
 *   Learn.Library.{Search,Words,Info}
 *
 * `Library` — вложенный namespace-блок (как `WebStudio.*` на верхнем уровне,
 * но на один уровень глубже): `Learn.Library.Search` / `.Words` / `.Info`.
 * Блоки раздельные намеренно (brief `learn-library-block-migration.md` §3) —
 * апп раскладывает их по слотам Matrix сам (main = Search+Words, rightBar =
 * Info). codegen per-component `.Events` aggregate (`packagesTypesOut`,
 * `componentEntries` в CapsuleRegistryPlugin) читает только ПЛОСКИЕ ключи
 * `components` — вложенные `Library.*` в агрегат не попадают; `IWordsEvents`/
 * `IInfoEvents` типизируются вручную через прямой импорт из `./library`.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { LearnProvider } from './core';
import { Exercise } from './exercise';
import { Tour } from './guides';
import { LessonView } from './lesson';
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
    LessonView,
    Exercise,
    Progress,
    VocabList,
    Tour,
    SentenceBuilder,
    LibraryNav,
    LibraryWelcome,
    Collections,
    Library: { Search, Words, Info },
  },
});
