import { cn } from '@capsuletech/web-style';
import { Root as SkeletonRoot } from '@kobalte/core/skeleton';
import { For, mergeProps, splitProps } from 'solid-js';

import type { ISkeletonProps } from './interfaces';
import { skeletonBlockCva, skeletonWrapperCva } from './variants';

const DEFAULT_ROWS: Record<string, number> = {
  text: 3,
  table: 8,
  list: 5,
  card: 1,
  map: 1,
};

/**
 * Single animated placeholder block backed by @kobalte/core Skeleton.Root.
 *
 * WHY wrapper pattern:
 * kobalte's Skeleton.Root forces inline style `{ height: "auto", width: "100%" }`
 * unconditionally (combineStyle puts its defaults first). This overrides Tailwind
 * `h-*` / `w-*` / `flex-1` classes applied directly to SkeletonRoot — blocks
 * collapse to ~0 height.
 *
 * Fix: stacked-div approach.
 *   outer <div>  — owns definite dimensions (h-*, w-*, flex-1) + visual (bg-muted, pulse).
 *   inner SkeletonRoot — fills 100%×100% via inline style (beats kobalte's own defaults);
 *                        transparent, carries only role="group" / data-animate / a11y id.
 */
const Block = (props: { class?: string }) => (
  <div class={cn(skeletonBlockCva(), props.class)}>
    <SkeletonRoot animate visible style={{ width: '100%', height: '100%' }} class="block" />
  </div>
);

// ---------------------------------------------------------------------------
// Variant layouts — thin wrappers that compose Block shards
// ---------------------------------------------------------------------------

const TextSkeleton = (props: { rows: number }) => (
  <div class="flex flex-col gap-2">
    <For each={Array.from({ length: props.rows })}>
      {(_, i) => (
        <Block class={cn('h-4', i() === props.rows - 1 && props.rows > 1 ? 'w-3/4' : 'w-full')} />
      )}
    </For>
  </div>
);

const TableSkeleton = (props: { rows: number }) => (
  <div class="flex h-full w-full flex-col gap-0">
    {/* Header row */}
    <div class="flex gap-3 border-b border-border px-3 py-2">
      <Block class="h-4 w-1/4" />
      <Block class="h-4 w-1/3" />
      <Block class="h-4 w-1/5" />
      <Block class="h-4 flex-1" />
    </div>
    {/* Data rows */}
    <For each={Array.from({ length: props.rows })}>
      {() => (
        <div class="flex gap-3 border-b border-border px-3 py-2.5">
          <Block class="h-3.5 w-1/4" />
          <Block class="h-3.5 w-1/3" />
          <Block class="h-3.5 w-1/5" />
          <Block class="h-3.5 flex-1" />
        </div>
      )}
    </For>
  </div>
);

const ListSkeleton = (props: { rows: number }) => (
  <div class="flex flex-col gap-3">
    <For each={Array.from({ length: props.rows })}>
      {() => (
        <div class="flex items-center gap-3">
          {/* Avatar circle */}
          <Block class="h-10 w-10 shrink-0 rounded-full" />
          {/* Text lines */}
          <div class="flex flex-1 flex-col gap-1.5">
            <Block class="h-3.5 w-2/3" />
            <Block class="h-3 w-1/2" />
          </div>
        </div>
      )}
    </For>
  </div>
);

const CardSkeleton = () => (
  <div class="flex flex-col gap-0 rounded-lg border border-border bg-card overflow-hidden">
    {/* Header zone */}
    <div class="flex flex-col gap-2 border-b border-border px-card py-card-tight">
      <Block class="h-5 w-2/5" />
      <Block class="h-3.5 w-3/5" />
    </div>
    {/* Body zone */}
    <div class="flex flex-col gap-2 px-card py-card">
      <Block class="h-3.5 w-full" />
      <Block class="h-3.5 w-full" />
      <Block class="h-3.5 w-3/4" />
    </div>
  </div>
);

/** Full-bleed map placeholder — single kobalte Skeleton fills the container. */
const MapSkeleton = () => (
  <div class={cn(skeletonBlockCva({ variant: 'map' }), 'h-full w-full')}>
    <SkeletonRoot animate visible style={{ width: '100%', height: '100%' }} class="block" />
  </div>
);

const VARIANTS = {
  text: TextSkeleton,
  table: TableSkeleton,
  list: ListSkeleton,
  card: CardSkeleton,
  map: MapSkeleton,
} as const;

/**
 * Skeleton — placeholder заглушка для состояний загрузки.
 * Заполняет контейнер той же формой, что и реальный контент.
 *
 * Внутри использует @kobalte/core Skeleton.Root для каждого блока-шарда:
 * роль, data-animate/data-visible и a11y-семантика — от kobalte.
 * Визуальный pulse и layout-пресеты — наш слой поверх.
 *
 * @example
 * ```tsx
 * <Skeleton />                          // text, 3 rows
 * <Skeleton variant="table" rows={10} />
 * <Skeleton variant="list" rows={4} />
 * <Skeleton variant="card" />
 * <Skeleton variant="map" />           // fills h-full w-full
 * ```
 */
export const Skeleton = (props: ISkeletonProps) => {
  const merged = mergeProps({ variant: 'text' as const }, props);
  const [local, others] = splitProps(merged, ['variant', 'rows', 'class', 'style']);

  const rows = () => local.rows ?? DEFAULT_ROWS[local.variant ?? 'text'] ?? 3;

  return (
    <div
      class={cn(skeletonWrapperCva({ variant: local.variant }), local.class)}
      style={local.style}
      {...(others as object)}
    >
      {VARIANTS[local.variant ?? 'text']({ rows: rows() })}
    </div>
  );
};
