import { cn } from '@capsuletech/web-style';
import {
  children,
  type JSX,
  splitProps,
  type ValidComponent,
} from 'solid-js';
import { useTrace } from '../../../internal/useTrace';
import { Slot } from '../../slot';
import { mergeStyle, toGap } from '../grid/utils';
import type {
  FlexAlign,
  FlexDirection,
  FlexJustify,
  FlexOrientation,
  FlexWrap,
  IFlexProps,
} from './interfaces';

// Статические таблицы → Tailwind purge видит все классы в исходниках.
const DIRECTION: Record<FlexDirection, string> = {
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  col: 'flex-col',
  'col-reverse': 'flex-col-reverse',
};

const WRAP: Record<FlexWrap, string> = {
  wrap: 'flex-wrap',
  nowrap: 'flex-nowrap',
  'wrap-reverse': 'flex-wrap-reverse',
};

const ALIGN: Record<FlexAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const JUSTIFY: Record<FlexJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

/** orientation → flex-direction class */
const ORIENTATION_DIR: Record<FlexOrientation, FlexDirection> = {
  horizontal: 'row',
  vertical: 'col',
};

// ---------------------------------------------------------------------------
// Flex — public component (CSS-flex only)
// ---------------------------------------------------------------------------

/**
 * Flex — низкоуровневая Flexbox-обёртка для страниц и виджетов.
 *
 * Передавай `children` как обычно:
 * ```tsx
 * <Flex gap={2} align="center">
 *   <Icon /> <span>Label</span>
 * </Flex>
 * ```
 *
 * Для resize-раскладок используй `<Layout.Resizable items={[...]} />`.
 */
export const Flex = <T extends ValidComponent = 'div'>(props: IFlexProps<T>) => {
  useTrace('web-ui.flex'); // ADR 062
  const [own, polyAndRest] = splitProps(props, [
    'orientation',
    'direction',
    'wrap',
    'align',
    'justify',
    'gap',
    'gapX',
    'gapY',
    'inline',
    'class',
    'style',
    'h',
    'minH',
    'maxH',
    'w',
    'minW',
    'maxW',
    'fluid',
  ]);
  // `children` выделяем В `poly` (а не оставляем в `others`), иначе он
  // утечёт в `<Slot {...others}>` ВТОРЫМ потребителем ленивого getter'а —
  // параллельно с `children(() => …)` ниже это давало двойную инстанциацию
  // потомка (bug A, ADR 062): два onMount/подписки у effectful-ребёнка
  // (RemoteComponent, MapView, …). Резолвим ровно один раз через `resolved`.
  const [poly, others] = splitProps(polyAndRest, ['as', 'children']);

  // `orientation` maps to a direction class if `direction` is not explicitly set
  const effectiveDirection = (): FlexDirection | undefined => {
    if (own.direction) return own.direction;
    if (own.orientation) return ORIENTATION_DIR[own.orientation];
    return undefined;
  };

  // Resolve children reactively to detect empty state.
  // Empty = null / undefined / empty array → container gets min-h-slot so it
  // stays visible and droppable in the UI editor even when no children are present.
  const resolved = children(() => (props as { children?: JSX.Element }).children);
  const isEmpty = () => {
    const r = resolved();
    return r == null || (Array.isArray(r) && r.length === 0);
  };

  const classes = () =>
    cn(
      own.inline ? 'inline-flex' : 'flex',
      effectiveDirection() && DIRECTION[effectiveDirection()!],
      own.wrap && WRAP[own.wrap],
      own.align && ALIGN[own.align],
      own.justify && JUSTIFY[own.justify],
      own.class,
    );

  const toSpacing = (n: number) => `calc(var(--spacing) * ${n})`;

  const computed = (): JSX.CSSProperties => {
    const s: JSX.CSSProperties = {};
    if (own.gap !== undefined) s.gap = toGap(own.gap);
    if (own.gapX !== undefined) s['column-gap'] = toGap(own.gapX);
    if (own.gapY !== undefined) s['row-gap'] = toGap(own.gapY);
    // Sizing props — spacing-scale via CSS custom property, parity with Tailwind.
    if (own.h !== undefined) s.height = own.h === 'full' ? '100%' : toSpacing(own.h);
    if (own.w !== undefined) s.width = own.w === 'full' ? '100%' : toSpacing(own.w);
    if (own.maxH !== undefined) s['max-height'] = toSpacing(own.maxH);
    if (own.maxW !== undefined) s['max-width'] = toSpacing(own.maxW);
    if (own.minW !== undefined) s['min-width'] = toSpacing(own.minW);
    // minH: explicit prop wins over the auto empty-container fallback.
    if (own.fluid !== undefined) s.flex = `1 1 ${own.fluid}px`;
    if (own.minH !== undefined) {
      s['min-height'] = toSpacing(own.minH);
    } else if (isEmpty()) {
      // Empty container → inline min-height via CSS variable so the slot stays
      // visible/droppable in the editor without depending on Tailwind content-scan.
      s['min-height'] = 'var(--size-slot)';
    }
    return s;
  };

  // Slot is generic over T; the explicit class/style still fight TS because
  // `Omit<ComponentProps<T>, 'as'>` is opaque for an unresolved T. Casting the
  // whole props bag to `any` matches the same shortcut used inside Slot for
  // the `{...others}` spread.
  //
  // `children` НЕ в `others` (выделен в `poly` выше) → передаём ровно один,
  // уже резолвнутый инстанс через JSX-ребёнка `{resolved()}`. Так isEmpty и
  // рендер делят один и тот же `children()`-мемо — одна инстанциация потомка.
  return (
    <Slot
      {...({
        as: (poly.as as T) ?? ('div' as T),
        class: classes(),
        style: mergeStyle(computed(), own.style) as never,
        ...(others as object),
      } as any)}
    >
      {resolved()}
    </Slot>
  );
};
