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
 *   - `WebStudio.Canvas`             → тонкий remote-embed канваса (`<Remote.View>`)
 *   - `WebStudio.ComponentsPalette`  → палитра компонентов (click в store / drag в creator)
 *   - `WebStudio.Info`               → info-панель (контракт / манифест / readme)
 *   - `WebStudio.Navigation`         → навигация по разделам студии
 *   - `WebStudio.Props`              → редактор пропсов выбранного узла
 *   - `WebStudio.Provider`           → провайдер студии (DnD + Remote + связка палитра→канвас)
 *   - `WebStudio.Styles`             → canvas-local theme/dark override (панель, не дропдаун)
 *   - `WebStudio.Tree`               → иерархия композиции + мини-палитра вставки (creator-mode)
 *   - `WebStudio.Welcome`            → welcome/index-fallback для /workspace/web-studio
 *
 * Document — единый singleton в `@capsuletech/web-studio` (`useDocument`); все
 * модули читают/пишут без Provider'а (SSOT редактируемого дерева).
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { Canvas } from './canvas';
import { InfoPanel } from './info';
import { PropsPanel } from './inspector';
import { Navigation } from './navigation';
import { ComponentsPalette } from './palette';
import { StudioProvider } from './providers';
import { StylesPanel } from './styles';
import { TreePanel } from './tree';
import { Welcome } from './welcome';

export default defineCapsuleModule({
  name: 'WebStudio',
  components: {
    Canvas,
    ComponentsPalette,
    Info: InfoPanel,
    Navigation,
    Props: PropsPanel,
    Provider: StudioProvider,
    Styles: StylesPanel,
    Tree: TreePanel,
    Welcome,
  },
});
