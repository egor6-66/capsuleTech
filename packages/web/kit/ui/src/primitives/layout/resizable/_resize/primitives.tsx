import { createStyle } from '@capsuletech/web-style';
import type { DynamicProps, HandleProps, RootProps } from '@corvu/resizable';
import ResizablePrimitive from '@corvu/resizable';
import type { ValidComponent } from 'solid-js';
import { Show, splitProps } from 'solid-js';

import { GripIcon } from './grip-icon';
import { resizableHandleCva, resizableRootCva } from './variants';

type ResizableRootProps<T extends ValidComponent = 'div'> = RootProps<T> & {
  class?: string;
  style?: string | Record<string, string | number>;
};

export const ResizableRoot = <T extends ValidComponent = 'div'>(
  props: DynamicProps<T, ResizableRootProps<T>>,
) => {
  const [local, rest] = splitProps(props as ResizableRootProps, ['class', 'style']);
  const { className, style } = createStyle(resizableRootCva, {
    class: local.class,
    style: local.style,
  });
  return <ResizablePrimitive class={className()} style={style()} {...rest} />;
};

export const ResizablePanel = ResizablePrimitive.Panel;

type ResizableHandleProps<T extends ValidComponent = 'button'> = HandleProps<T> & {
  class?: string;
  style?: string | Record<string, string | number>;
  withHandle?: boolean;
  /**
   * Реактивная активность ручки. Default: true.
   * false → без hairline (bg-transparent), pointer-events-none, corvu drag
   * отключён, grip скрыт. Handle остаётся смонтирован — флип не ремоунтит панели.
   */
  active?: boolean;
  /**
   * Визуал ручки. Default: 'line' (bg-border hairline на активной).
   * 'ghost' — без линии в любом состоянии; поведение active не меняется.
   */
  variant?: 'line' | 'ghost';
};

export const ResizableHandle = <T extends ValidComponent = 'button'>(
  props: DynamicProps<T, ResizableHandleProps<T>>,
) => {
  const [local, rest] = splitProps(props as ResizableHandleProps, [
    'class',
    'style',
    'withHandle',
    'active',
    'variant',
  ]);
  const isActive = () => local.active !== false;
  // Getters — createStyle мемоизирует cvaFn(props); без них флип `active`
  // не пересчитал бы класс (props оценились бы один раз при создании объекта).
  const { className, style } = createStyle(resizableHandleCva, {
    get active() {
      return isActive();
    },
    get variant() {
      return local.variant;
    },
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });
  return (
    <ResizablePrimitive.Handle disabled={!isActive()} class={className()} style={style()} {...rest}>
      <Show when={local.withHandle && isActive()}>
        <GripIcon />
      </Show>
    </ResizablePrimitive.Handle>
  );
};
