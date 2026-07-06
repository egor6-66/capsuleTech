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
 *   - `WebStudio.Nav.Main`           → header-таббар разделов студии (store / creator)
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
import { StudioProvider } from './core';
import { Canvas } from './modules/canvas';
import { InfoPanel } from './modules/info';
import { PropsPanel } from './modules/inspector';
import { MainNav } from './modules/navigation';
import { ComponentsPalette } from './modules/palette';
import { StylesPanel } from './modules/styles';
import { TreePanel } from './modules/tree';
import { Welcome } from './modules/welcome';

export default defineCapsuleModule({
  name: 'WebStudio',
  components: {
    Canvas,
    ComponentsPalette,
    Info: InfoPanel,
    // Вложенный ключ `WebStudio.Nav.Main` — безопасен: у nav нет своих `__events`
    // (контракт из `Shell.SegmentNav.Events`), агрегировать в `.Events` нечего;
    // вложенность влияет только на рендер (прецедент `Learn.Library.Info`).
    Nav: { Main: MainNav },
    Props: PropsPanel,
    Provider: StudioProvider,
    Styles: StylesPanel,
    Tree: TreePanel,
    Welcome,
  },
});
