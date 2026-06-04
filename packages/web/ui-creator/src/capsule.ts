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
import EditorController from './controllers/EditorController';
import { EditorOverlay } from './controllers/EditorOverlay';
import { EditorProvider } from './controllers/EditorProvider';
import { EditorCanvas } from './controllers/EditorCanvas';

export default defineCapsuleModule({
  name: 'Editor',
  components: {
    Overlay: EditorOverlay,
    Provider: EditorProvider,
    Canvas: EditorCanvas,
  },
  controllers: {
    Editor: EditorController,
  },
});
