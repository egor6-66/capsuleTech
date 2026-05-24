/**
 * Widget: Projects.OpenFolder
 * ---------------------------
 * Минимальный прототип Phase 2 ADR 018 — кнопка "📁 Open folder".
 * Композиция Controller (route onClick) + Feature (Tauri dialog side effect).
 *
 * Click → dialog.open({ directory: true }) → console.log path.
 *
 * После Phase 2 expansion:
 *   - сохранять path в store (zustand / web-state)
 *   - LRU list recently opened (требует tauri-plugin-store)
 *   - full Projects sidebar widget
 *
 * Использование: добавить `<Widgets.Projects.OpenFolder />` в нужный
 * Page slot (например `_workspace/spaces.tsx` main slot).
 */
const OpenFolder = Widget((Ui) => (
  <Controllers.OpenFolder>
    <Features.Desktop>
      <Ui.Button meta={{ tags: ['openFolder'] }} variant="ghost" size="sm" aria-label="Open folder">
        📁 Open folder
      </Ui.Button>
    </Features.Desktop>
  </Controllers.OpenFolder>
));

export default OpenFolder;
