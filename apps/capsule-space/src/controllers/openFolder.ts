/**
 * Controller: OpenFolder
 * ----------------------
 * Перехватывает onClick на кнопке с meta tag 'openFolder' и делегирует
 * в Features.Desktop.openFolder через next.with(...).
 *
 * Тот же pattern что Controllers.WindowControls (PR #154).
 * После Phase 2 expansion (full Projects widget + store) — Controller
 * получит дополнительные UI states (loading / selected / error).
 */
const OpenFolder = Controller(() => ({
  initial: 'idle',
  states: {
    idle: {
      onClick: async ({ target, next }) => {
        if (target.has('openFolder')) return next.with(Features.Desktop, 'openFolder');
      },
    },
  },
}));

export default OpenFolder;
