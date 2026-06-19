/**
 * WebStudio.Welcome — controller-обёртка над welcome-панелью.
 *
 * Рендерится в `<Ui.Outlet/>` layout'а студии как index-fallback
 * `/workspace/web-studio` — когда нет дочернего матча маршрута.
 * Никакого state нет: компонент транслирует управление полностью
 * в презентационный `<Welcome />` с дефолтными текстами.
 *
 * Презентация (заголовок / описание / карточки разделов / подсказка)
 * живёт в `../welcome/`.
 */

import { Welcome } from '../welcome';

export const WebStudioWelcome = () => <Welcome />;