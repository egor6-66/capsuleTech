/**
 * /workspace — welcome (index fallback шелла).
 *
 * Рендерится в `<Ui.Outlet/>` workspace-шелла на голом `/workspace`. Конвенция роутера:
 * `_index.tsx` рядом с `index.tsx`. Презентация — `Learn.Welcome` (ADR 033); карточки
 * эмитят `onNavigate` → root-`Features.App` роутит в раздел.
 */
const WorkspaceHome = Page(() => <Learn.Welcome />);

export default WorkspaceHome;
