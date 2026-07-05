/**
 * Shell.SegmentNav — connected segment-nav блок (tier-2). Собирает stateless
 * `SegmentedBar` (web-ui) + `useActiveSegment` (web-router) + emit: подсветка
 * активного сегмента берётся из URL (route-prefix-агностично), клик эмитит
 * generic `onSegmentNavigate`. Роутер/сеть знает только shell — визуал (web-ui)
 * остаётся stateless.
 */
export interface ISegmentNavProps {
  /** Сегменты в порядке отображения. `id` — стабильный, `label` — подпись. */
  segments: readonly { id: string; label: string }[];
  /** Дискриминатор источника nav'а (`'library'`|`'lessons'`|…). Уходит в `payload.nav`. */
  nav: string;
  /** Passthrough-класс на бар (напр. центрирование `mx-auto w-fit`). */
  class?: string;
}

/**
 * Единое generic-событие nav'ов (решение user, brief pilot-segment-nav-3).
 *
 * Вместо per-nav событий — ОДНО `onSegmentNavigate`; оба connected-блока
 * (`SegmentNav`, `Launcher`) эмитят его же, а app-Feature различает источник по
 * `nav`-дискриминатору внутри payload. Схлопывания payload нет — дискриминатор
 * внутри.
 *
 * Phantom `__events?: ISegmentNavEvents` на компонентах нужен codegen'у для
 * `Shell.SegmentNav.Events` / `Shell.Launcher.Events` (namespace-merge) — host
 * `Feature<Shell.SegmentNav.Events>` типизирует `target.payload` в
 * `onSegmentNavigate` без per-handler аннотации. На runtime не используется.
 */
export interface ISegmentNavEvents {
  /** Клик по сегменту nav'а. `nav` — дискриминатор источника, `segment` — id. */
  onSegmentNavigate: { nav: string; segment: string };
}
