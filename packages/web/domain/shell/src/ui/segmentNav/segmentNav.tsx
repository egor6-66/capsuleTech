import { useEmitOptional } from '@capsuletech/web-core';
import { useActiveSegment } from '@capsuletech/web-router';
import { SegmentedBar } from '@capsuletech/web-ui/segmentedBar';

import type { ISegmentNavEvents, ISegmentNavProps } from './interfaces';

/**
 * SegmentNav — connected сегмент-nav: stateless `SegmentedBar` (web-ui) +
 * `useActiveSegment` (web-router) + emit. Подсветка активного сегмента —
 * производная от URL (реактивно, route-prefix-агностично); клик эмитит
 * generic named-event `onSegmentNavigate { nav, segment }` в ближайший
 * Controller/Feature (ADR 032).
 *
 * `useEmitOptional` (НЕ useEmit): блок может рендериться вне host-scope
 * (прецедент Picker/ComponentsPalette) — вне scope emit тихо no-op'ится.
 *
 * @example
 * ```tsx
 * <Shell.SegmentNav
 *   nav="library"
 *   segments={[{ id: 'words', label: 'Слова' }, { id: 'phrases', label: 'Фразы' }]}
 * />
 * ```
 */
const SegmentNavComponent = (props: ISegmentNavProps) => {
  const emit = useEmitOptional();
  const active = useActiveSegment(props.segments.map((s) => s.id));

  return (
    <SegmentedBar
      items={props.segments}
      activeId={active()}
      onSelect={(id) =>
        emit('onSegmentNavigate', {
          source: 'Shell.SegmentNav',
          payload: { nav: props.nav, segment: id },
        })
      }
      class={props.class}
    />
  );
};

/**
 * Phantom `__events?: ISegmentNavEvents` — для codegen'а `Shell.SegmentNav.Events`
 * (см. ISegmentNavEvents doc). На runtime не читается.
 */
export const SegmentNav: ((props: ISegmentNavProps) => ReturnType<typeof SegmentNavComponent>) & {
  readonly __events?: ISegmentNavEvents;
} = SegmentNavComponent;
