/**
 * @capsuletech/web-ui-creator/capsule
 *
 * Манифест пакета для механизма регистрации (ADR 033).
 *
 * App подключает пакет в capsule.app.ts:
 *   packages: ['@capsuletech/web-ui-creator']
 *
 * Вите-плагин (CapsuleRegistryPlugin) читает этот файл через jiti и генерирует
 * глобалы:
 *   - `Editor.Overlay`   → components (EditorOverlay)
 *   - `Editor.Provider`  → components (EditorProvider)
 *   - `Editor.Canvas`    → components (EditorCanvas)
 *   - `Controllers.Editor` → controllers (EditorController)
 *
 * Имя 'Editor' (не 'UICreator') — отражает семантику use-case: визуальный
 * редактор, не creator-инструментарий.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { EditorCanvas } from './controllers/EditorCanvas';
import EditorController from './controllers/EditorController';
import { EditorInspector } from './controllers/EditorInspector';
import { EditorOverlay } from './controllers/EditorOverlay';
import { EditorPalette } from './controllers/EditorPalette';
import { EditorProvider } from './controllers/EditorProvider';
import { EditorTree } from './controllers/EditorTree';

export default defineCapsuleModule({
  name: 'Editor',
  components: {
    Overlay: EditorOverlay,
    Provider: EditorProvider,
    Canvas: EditorCanvas,
    Tree: EditorTree,
    Palette: EditorPalette,
    Inspector: EditorInspector,
  },
  controllers: {
    Editor: EditorController,
  },
});
