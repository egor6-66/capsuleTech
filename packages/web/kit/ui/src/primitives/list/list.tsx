import { createStyle } from '@capsuletech/web-style';
import { createVirtualizer } from '@tanstack/solid-virtual';
import type { JSX } from 'solid-js';
import { For, splitProps } from 'solid-js';
import { useTrace } from '../../internal/useTrace';
import type { FlexJustify } from '../layout/flex/interfaces';
import { mergeStyle, toGap } from '../layout/grid/utils';
import type {
  IListBatchProps,
  IListProps,
  IListRenderProps,
  IVirtualListProps,
} from './interfaces';
import { listVariants } from './variants';

// justify-content raw values — inline-style paths (grid/wrap) don't use
// Tailwind classes, so this mirrors Flex's JUSTIFY table but with CSS values.
const JUSTIFY_CONTENT: Record<FlexJustify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

const toSpacing = (n: number) => `calc(var(--spacing) * ${n})`;

/** Type guard: batch mode — data + item.use present (ADR 036 §3). */
function isBatchMode<T>(props: IListProps<T>): props is IListBatchProps<T> {
  const p = props as IListBatchProps<T>;
  return p.data !== undefined && p.item?.use !== undefined;
}

/** Type guard: render-prop mode — items + children (function) present. */
function isRenderMode<T>(props: IListProps<T>): props is IListRenderProps<T> {
  return (
    (props as IListRenderProps<T>).items !== undefined &&
    typeof (props as IListRenderProps<T>).children === 'function'
  );
}

export function List<T = unknown>(props: IListProps<T>) {
  useTrace('web-ui.list'); // ADR 062
  // --- batch mode ---
  if (isBatchMode(props)) {
    const [local, variants, others] = splitProps(
      props,
      ['class', 'style', 'data', 'item', 'min', 'gap', 'wrap', 'justify', 'p', 'px', 'py'],
      ['variant', 'orientation'],
    );

    // Container padding overlay — spacing-scale, parity with Flex.p/px/py.
    // Applies on top of whichever layout path is active (grid/wrap/plain).
    const paddingStyle = (): JSX.CSSProperties => {
      const s: JSX.CSSProperties = {};
      if (local.p !== undefined) s.padding = toSpacing(local.p);
      if (local.px !== undefined) s['padding-inline'] = toSpacing(local.px);
      if (local.py !== undefined) s['padding-block'] = toSpacing(local.py);
      return s;
    };

    const isGrid = () => !!local.min;
    const isCustomLayout = () => local.wrap || local.min;

    const { className, style } = createStyle(listVariants, {
      get variant() {
        return variants.variant;
      },
      get orientation() {
        return isCustomLayout() ? undefined : variants.orientation;
      },
      get class() {
        return isCustomLayout() ? undefined : local.class;
      },
      get style() {
        return isCustomLayout() ? undefined : local.style;
      },
    });

    const getItemProps = local.item.props ?? ((item: T) => item as Record<string, unknown>);
    const ItemTpl = local.item.use;

    const gapValue = () => (local.gap === undefined ? '0.5rem' : toGap(local.gap));

    const gridStyle = (): JSX.CSSProperties => ({
      display: 'grid',
      'grid-template-columns': `repeat(auto-fit, minmax(${local.min}, 1fr))`,
      gap: gapValue(),
      width: '100%',
      ...(typeof local.style === 'object' ? local.style : {}),
      ...paddingStyle(),
    });

    // Content-width wrap: flex-wrap, no 1fr-stretch — items keep natural width
    // and wrap to new lines. Each item wrapped in a shrink-0 <li> so the
    // layout is robust regardless of the item template's own CSS.
    const wrapStyle = (): JSX.CSSProperties => ({
      display: 'flex',
      'flex-wrap': 'wrap',
      gap: gapValue(),
      width: '100%',
      ...(local.justify ? { 'justify-content': JUSTIFY_CONTENT[local.justify] } : {}),
      ...(typeof local.style === 'object' ? local.style : {}),
      ...paddingStyle(),
    });

    if (local.wrap) {
      return (
        <ul class={local.class} style={wrapStyle()} {...(others as object)}>
          <For each={local.data}>
            {(item) => (
              <li class="shrink-0 list-none">
                <ItemTpl {...getItemProps(item)} />
              </li>
            )}
          </For>
        </ul>
      );
    }

    return (
      <ul
        class={isGrid() ? local.class : className()}
        style={(isGrid() ? gridStyle() : mergeStyle(paddingStyle(), style())) as JSX.CSSProperties}
        {...(others as object)}
      >
        <For each={local.data}>{(item) => <ItemTpl {...getItemProps(item)} />}</For>
      </ul>
    );
  }

  // --- render-prop mode (classic: items + children render function) ---
  if (isRenderMode(props)) {
    const [local, variants, others] = splitProps(
      props,
      ['class', 'style', 'items', 'children'],
      ['variant', 'orientation'],
    );

    const { className, style } = createStyle(listVariants, {
      get variant() {
        return variants.variant;
      },
      get orientation() {
        return variants.orientation;
      },
      get class() {
        return local.class;
      },
      get style() {
        return local.style;
      },
    });

    return (
      <div class={className()} style={style()} {...(others as object)}>
        <For each={local.items}>{(item, index) => local.children(item, index)}</For>
      </div>
    );
  }

  // --- semantic mode: plain children, no iteration ---
  const [local, variants, others] = splitProps(
    props,
    ['class', 'style', 'children'],
    ['variant', 'orientation'],
  );

  const { className, style } = createStyle(listVariants, {
    get variant() {
      return variants.variant;
    },
    get orientation() {
      return variants.orientation;
    },
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });

  return (
    <ul class={className()} style={style() as JSX.CSSProperties} {...(others as object)}>
      {local.children}
    </ul>
  );
}

function VirtualList<T>(props: IVirtualListProps<T>) {
  useTrace('web-ui.list-virtual'); // ADR 062
  let parentRef: HTMLDivElement | undefined;

  const [local, variants, others] = splitProps(
    props,
    ['class', 'style', 'items', 'children', 'estimateSize'],
    ['variant', 'orientation'],
  );

  const { className, style } = createStyle(listVariants, {
    get variant() {
      return variants.variant;
    },
    get orientation() {
      return variants.orientation;
    },
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });

  const virtualizer = createVirtualizer({
    get count() {
      return local.items?.length ?? 0;
    },
    getScrollElement: () => parentRef ?? null,
    estimateSize: () => local.estimateSize ?? 40,
    horizontal: variants.orientation === 'horizontal',
  });

  return (
    <div
      ref={parentRef}
      class={className()}
      style={
        {
          ...(typeof style() === 'object' ? style() : {}),
          overflow: 'auto',
          position: 'relative',
        } as JSX.CSSProperties
      }
      {...(others as object)}
    >
      <div
        style={{
          height:
            variants.orientation !== 'horizontal' ? `${virtualizer.getTotalSize()}px` : '100%',
          width: variants.orientation === 'horizontal' ? `${virtualizer.getTotalSize()}px` : '100%',
          position: 'relative',
        }}
      >
        <For each={virtualizer.getVirtualItems()}>
          {(virtualItem) => (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: variants.orientation !== 'horizontal' ? `${virtualItem.size}px` : '100%',
                transform:
                  variants.orientation === 'horizontal'
                    ? `translateX(${virtualItem.start}px)`
                    : `translateY(${virtualItem.start}px)`,
              }}
            >
              {local.children(local.items![virtualItem.index], () => virtualItem.index)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

List.Virtual = VirtualList;
