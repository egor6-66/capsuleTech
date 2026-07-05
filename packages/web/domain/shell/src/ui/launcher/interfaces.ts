/**
 * Shell.Launcher — connected-обёртка над web-ui `Launcher` (tier-2): hero + грид
 * кликабельных разделов. Клик по карточке эмитит ТО ЖЕ generic-событие
 * `onSegmentNavigate` что и `SegmentNav` (дискриминатор `nav`) — app-Feature
 * различает источник по `payload.nav`. Данные (segments) инжектит апп (с бэка);
 * визуал остаётся stateless в web-ui.
 *
 * События блока — `ISegmentNavEvents` из соседнего `segmentNav` (единый generic
 * nav-контракт, решение user). Phantom `__events?: ISegmentNavEvents` на
 * компоненте нужен codegen'у для `Shell.Launcher.Events`.
 */
export interface IShellLauncherProps {
  /** Разделы-карточки в порядке отображения. */
  segments: readonly { id: string; label: string; description?: string }[];
  /** Дискриминатор источника nav'а. Уходит в `payload.nav`. */
  nav: string;
  /** Заголовок hero (H1). Не задан — hero не рисуется. */
  title?: string;
  /** Подзаголовок hero (muted). */
  description?: string;
  /** Подсказка внизу (muted, small). */
  hint?: string;
}
