/**
 * /workspace/web-studio — welcome (index fallback).
 *
 * Рендерится в `<Ui.Outlet/>` layout'а студии, когда юзер на голом
 * `/workspace/web-studio` без дочернего матча. Конвенция роутера: `_index.tsx`
 * рядом с `index.tsx` (layout) → router-плагин эмитит index-роут с этим
 * компонентом вместо null-stub.
 *
 * Презентация welcome'а живёт в `@capsuletech/web-studio` как модуль
 * `WebStudio.Welcome` (ADR 033). Доступ уже гейтится layout'ом
 * (`meta.can: 'studio'`) — здесь meta не нужно.
 */
const WebStudioWelcomePage = Page(() => <WebStudio.Welcome />);

export default WebStudioWelcomePage;
