import { cn } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';
import type { IUiMapProps } from './interfaces';
import { mapCva } from './variants';

/**
 * Ui.MapView — light placeholder for `@capsuletech/boost-map` heavy mirror.
 *
 * Naming `MapView` (NOT `Map`) — `Map` is a built-in JS class; shadowing it
 * in module scope is flagged by lint (biome `noShadowRestrictedNames`).
 * `MapView` also mirrors the heavy boost-map root API → migration is rename-free.
 *
 * Zero engine deps. Renders an SVG world-glyph on a frosted-muted rect.
 *
 * @example
 * <Ui.MapView size="lg" />
 * <Ui.MapView size="full" ariaLabel="Region overview">
 *   <Button>Load full map</Button>
 * </Ui.MapView>
 */
export const MapView = (props: IUiMapProps) => {
  const merged = mergeProps({ ariaLabel: 'Map placeholder' }, props);
  const [local, others] = splitProps(merged, ['size', 'class', 'children', 'ariaLabel']);

  return (
    <div
      role="img"
      aria-label={local.ariaLabel}
      data-state="placeholder"
      data-slot="map"
      class={cn(mapCva({ size: local.size }), local.class)}
      {...others}
    >
      {/* Static world-glyph — inline SVG, zero icon-pack pull. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-12 opacity-40"
        aria-hidden="true"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {local.children}
    </div>
  );
};
