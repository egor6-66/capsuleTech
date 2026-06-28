/**
 * @capsuletech/web-learn/capsule — манифест пакета для регистрации (ADR 033).
 *
 * App подключает: `packages: ['@capsuletech/web-learn']` в capsule.app.ts →
 * CapsuleRegistryPlugin генерит глобалы Learn.*:
 *   Learn.Provider | Learn.Welcome | Learn.LessonView | Learn.Exercise |
 *   Learn.Progress | Learn.VocabList | Learn.Tour | Learn.SentenceBuilder
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { LearnProvider } from './core';
import { Exercise } from './exercise';
import { Tour } from './guides';
import { LessonView } from './lesson';
import { VocabList } from './library';
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
  },
});
