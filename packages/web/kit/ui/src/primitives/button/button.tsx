import { cn, createStyle } from '@capsuletech/web-style';
import type { ValidComponent } from 'solid-js';
import { Show, splitProps } from 'solid-js';

import { Slot } from '../slot';
import { Spinner } from '../spinner';
import type { IButtonProps } from './interfaces';
import { buttonCva } from './variants';

/**
 * Button — полиморфный кнопка-компонент с CVA-вариантами.
 *
 * @example
 * ```tsx
 * <Button>Click</Button>
 * <Button variant="secondary" size="lg">Large Secondary</Button>
 * <Button as="a" href="/foo">Link Button</Button>
 * <Button size="icon"><Plus /></Button>
 * <Button disabled>Disabled</Button>
 * <Button loading>Sign in</Button>
 * <Button loading={someSignal()}>Submit</Button>
 * <Button fullWidth>Full Width</Button>
 * ```
 */
export const Button = <T extends ValidComponent = 'button'>(props: IButtonProps<T>) => {
  const [local, variantProps, loadingProps, presentational, others] = splitProps(
    props,
    ['class', 'style'],
    ['variant', 'size'],
    ['loading', 'disabled', 'children'],
    ['fullWidth'],
  );

  const { className, style } = createStyle(buttonCva, {
    ...variantProps,
    class: cn(local.class, presentational.fullWidth && 'w-full'),
    style: local.style,
  });

  const [polyProps, domProps] = splitProps(others, ['as']);

  const isDisabled = () => !!(loadingProps.loading || loadingProps.disabled);

  // Resolve the element tag so we can apply type/data-disabled conditionally.
  const resolvedAs = () => (polyProps.as as ValidComponent | undefined) ?? 'button';
  const isButton = () => resolvedAs() === 'button';

  return (
    <Slot
      as={resolvedAs() as T}
      class={className()}
      style={style()}
      disabled={isDisabled()}
      // type="button" — prevent accidental form submission (only for native <button>)
      type={isButton() ? 'button' : undefined}
      // data-slot — universal selector hook (test/inspector/canvas-overlay)
      data-slot="button"
      // data-variant / data-size — test matcher + Figma-sync hooks
      data-variant={variantProps.variant ?? 'default'}
      data-size={variantProps.size ?? 'default'}
      // data-disabled — Kobalte-convention attr for CSS-targeting; mirrors native disabled
      data-disabled={isDisabled() ? '' : undefined}
      // aria-busy + data-busy — loading state (a11y + CSS-targeting)
      aria-busy={loadingProps.loading ? 'true' : undefined}
      data-busy={loadingProps.loading ? '' : undefined}
      {...(domProps as any)}
    >
      <Show when={loadingProps.loading} fallback={loadingProps.children}>
        <Spinner />
      </Show>
    </Slot>
  );
};
