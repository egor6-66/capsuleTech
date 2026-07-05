import { useEmitOptional } from '@capsuletech/web-core';
import { Launcher as UiLauncher } from '@capsuletech/web-ui/launcher';

import type { ISegmentNavEvents } from '../segmentNav/interfaces';
import type { IShellLauncherProps } from './interfaces';

/**
 * Launcher — connected-обёртка над stateless web-ui `Launcher`: прокидывает
 * hero-пропы (title/description/hint) и разделы, а клик по карточке
 * превращает в generic named-event `onSegmentNavigate { nav, segment }` —
 * тот же контракт, что у `SegmentNav` (см. ISegmentNavEvents).
 *
 * `useEmitOptional` (НЕ useEmit): блок может рендериться вне host-scope —
 * вне scope emit тихо no-op'ится.
 *
 * @example
 * ```tsx
 * <Shell.Launcher
 *   nav="workspace"
 *   title="Мастерская"
 *   segments={[{ id: 'studio', label: 'Студия', description: 'Собрать UI' }]}
 * />
 * ```
 */
const LauncherComponent = (props: IShellLauncherProps) => {
  const emit = useEmitOptional();

  return (
    <UiLauncher
      items={props.segments}
      title={props.title}
      description={props.description}
      hint={props.hint}
      onSelect={(id) =>
        emit('onSegmentNavigate', {
          source: 'Shell.Launcher',
          payload: { nav: props.nav, segment: id },
        })
      }
    />
  );
};

/**
 * Phantom `__events?: ISegmentNavEvents` — для codegen'а `Shell.Launcher.Events`.
 * На runtime не читается.
 */
export const Launcher: ((props: IShellLauncherProps) => ReturnType<typeof LauncherComponent>) & {
  readonly __events?: ISegmentNavEvents;
} = LauncherComponent;
