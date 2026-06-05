/**
 * @capsuletech/web-agent/ui
 *
 * UI-БЛОКИ — интерфейс агента кусками: чат-панель, лента сообщений, композер,
 * вьюер tool-call'ов, drop картинки. Апп берёт нужные куски и ставит в свои
 * Matrix-слоты. Всё на `@capsuletech/web-ui` (правило: интерфейс — из ui-kit).
 *
 * Headless-режим: апп может НЕ подключать /ui (агент «по API», только /client +
 * /tools). Поэтому UI отделён от логики (../controllers) намеренно.
 *
 * TODO(owner-web-agent): по мере роста разнести на отдельные subpath'ы
 * (/panel, /composer) — финальный split согласовать в ADR с главным.
 */

export {};
