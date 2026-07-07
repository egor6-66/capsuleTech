/**
 * /web-studio — welcome (index fallback секции студии).
 *
 * Рендерится в `<Ui.Outlet/>` секции на голом `/web-studio` без дочернего матча.
 * `WebStudio.Welcome` (ADR 033) — карточки store/creator, эмитят `onNavigate` →
 * root-`Features.App` роутит в лист режима. Доступ уже гейтит layout (`meta.can: 'studio'`).
 */
const WebStudioHome = Page(() => <WebStudio.Welcome />);

export default WebStudioHome;
