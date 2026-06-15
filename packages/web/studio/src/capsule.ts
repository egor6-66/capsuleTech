/**
 * @capsuletech/web-studio/capsule
 *
 * Манифест пакета для механизма регистрации (ADR 033).
 *
 * App подключает пакет в capsule.app.ts:
 *   packages: ['@capsuletech/web-studio']
 *
 * Вите-плагин (CapsuleRegistryPlugin) читает этот файл через jiti и генерирует
 * глобалы:
 *   - `WebStudio.Overlay`           → components (WebStudioOverlay)
 *   - `WebStudio.Provider`          → components (WebStudioProvider)
 *   - `WebStudio.Canvas`            → components (WebStudioCanvas)
 *   - `WebStudio.Tree`              → components (WebStudioTree)
 *   - `WebStudio.Palette`           → components (WebStudioPalette)
 *   - `WebStudio.Inspector`         → components (WebStudioInspector)
 *   - `WebStudio.ComponentsPalette` → components (Palette)
 *   - `Controllers.WebStudio`       → controllers (WebStudioController)
 *
 * Имя 'WebStudio' отражает зональный канон (ADR 047 web-zone naming).
 * Внутренний use-case — визуальный редактор (editor) UI-деревьев; это
 * domain-функция пакета, а пространство имён соответствует зоне.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { WebStudioCanvas } from './controllers/WebStudioCanvas';
import WebStudioController from './controllers/WebStudioController';
import { WebStudioInspector } from './controllers/WebStudioInspector';
import { WebStudioOverlay } from './controllers/WebStudioOverlay';
import { WebStudioPalette } from './controllers/WebStudioPalette';
import { WebStudioProvider } from './controllers/WebStudioProvider';
import { WebStudioTree } from './controllers/WebStudioTree';
import { Palette as ComponentsPalette } from './palette';

export default defineCapsuleModule({
  name: 'WebStudio',
  components: {
    Overlay: WebStudioOverlay,
    Provider: WebStudioProvider,
    Canvas: WebStudioCanvas,
    Tree: WebStudioTree,
    Palette: WebStudioPalette,
    Inspector: WebStudioInspector,
    // Новая палитра (итерация 1 — структура без режимов). Под отдельным ключом
    // чтобы не ломать legacy `WebStudio.Palette` пока старое не зачищено.
    ComponentsPalette,
  },
  controllers: {
    WebStudio: WebStudioController,
  },
});
