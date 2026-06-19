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
 *   - `WebStudio.Canvas`             → preview (store-mode) / composition canvas (creator-mode)
 *   - `WebStudio.CanvasStyle`        → canvas-only override темы/dark (state-injectable)
 *   - `WebStudio.ComponentsPalette`  → палитра компонентов (click в store / drag в creator)
 *   - `WebStudio.CreatorRoot`        → обёртка creator-страницы (общий DnDProvider)
 *   - `WebStudio.Tree`               → иерархия композиции (creator-mode)
 *   - `WebStudio.Props`              → редактор пропсов выбранного пресета
 *   - `WebStudio.Info`               → info-панель (контракт / манифест / readme)
 *
 * Selection — общий singleton в `@capsuletech/web-studio/selection`; все
 * модули читают/пишут без Provider'а.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { WebStudioCanvas } from './controllers/WebStudioCanvas';
import { WebStudioCanvasStyle } from './controllers/WebStudioCanvasStyle';
import { WebStudioCreatorRoot } from './controllers/WebStudioCreatorRoot';
import { WebStudioInfo } from './controllers/WebStudioInfo';
import { WebStudioProps } from './controllers/WebStudioProps';
import { WebStudioTree } from './controllers/WebStudioTree';
import { Navigation } from './navigation';
import { ComponentsPalette } from './palette';

export default defineCapsuleModule({
  name: 'WebStudio',
  components: {
    Canvas: WebStudioCanvas,
    CanvasStyle: WebStudioCanvasStyle,
    ComponentsPalette,
    CreatorRoot: WebStudioCreatorRoot,
    Info: WebStudioInfo,
    Navigation,
    Props: WebStudioProps,
    Tree: WebStudioTree,
  },
});
