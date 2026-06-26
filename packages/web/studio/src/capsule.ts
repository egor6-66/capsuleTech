/**
 * @capsuletech/web-studio/capsule
 *
 * Манифест пакета для механизма регистрации (ADR 033).
 *
 * App подключает пакет в capsule.app.ts:
 *   packages: ['@capsuletech/web-studio']
 *
 * Vite-плагин (CapsuleRegistryPlugin) читает этот файл через jiti и генерирует
 * глобалы:
 *   - `WebStudio.ComponentsPalette`  → палитра компонентов (click в store / drag в creator)
 *   - `WebStudio.Info`               → info-панель (контракт / манифест / readme)
 *   - `WebStudio.Navigation`         → навигация по разделам студии
 *   - `WebStudio.Props`              → редактор пропсов выбранного пресета
 *   - `WebStudio.Provider`           → провайдер студии (общий DnDProvider)
 *   - `WebStudio.Tree`               → иерархия композиции (creator-mode)
 *   - `WebStudio.Welcome`            → welcome/index-fallback для /workspace/web-studio
 *
 * Selection — общий singleton в `@capsuletech/web-studio/selection`; все
 * модули читают/пишут без Provider'а.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { InfoPanel } from './info';
import { PropsPanel } from './inspector';
import { Navigation } from './navigation';
import { ComponentsPalette } from './palette';
import { StudioProvider } from './providers';
import { TreePanel } from './tree';
import { Welcome } from './welcome';

export default defineCapsuleModule({
  name: 'WebStudio',
  components: {
    ComponentsPalette,
    Info: InfoPanel,
    Navigation,
    Props: PropsPanel,
    Provider: StudioProvider,
    Tree: TreePanel,
    Welcome,
  },
});
