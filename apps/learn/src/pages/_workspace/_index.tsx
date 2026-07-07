/**
 * /workspace — welcome (index fallback шелла).
 *
 * Рендерится в `<Ui.Outlet/>` workspace-шелла на голом `/workspace`. Конвенция роутера:
 * `_index.tsx` рядом с `index.tsx`. Презентация — `Learn.Welcome.Root` (ADR 033); карточки
 * эмитят `onSegmentNavigate { nav: 'root', segment }` → root-`Features.App` роутит в раздел.
 */
const WorkspaceHome = Page(() => <Learn.Welcome.Root />);

export default WorkspaceHome;
