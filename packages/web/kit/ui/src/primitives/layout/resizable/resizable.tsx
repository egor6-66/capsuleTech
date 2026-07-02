import { cn } from '@capsuletech/web-style';
import { children, createMemo, For, type JSX, Show } from 'solid-js';
import { useTrace } from '../../../internal/useTrace';
import { ResizableHandle, ResizablePanel, ResizableRoot } from './_resize/primitives';
import type { IResizableItem, IResizableProps, ResizableOrientation } from './interfaces';

// fillInitialSizes — 1:1 из flex.tsx.
const fillInitialSizes = (items: IResizableItem[]): number[] => {
  const declared = items.map((it) => it.initialSize);
  const sum = declared.reduce<number>((s, v) => s + (v ?? 0), 0);
  const missing = declared.filter((v) => v === undefined).length;
  const remainder = Math.max(0, 1 - sum);
  const auto = missing > 0 ? remainder / missing : 0;
  return declared.map((v) => v ?? auto);
};

// Children-mode helper: JSX children → IResizableItem[].
// Каждый top-level child становится панелью с resizable=true (без initialSize → auto-distribute).
const childrenToItems = (resolved: unknown): IResizableItem[] => {
  const arr = Array.isArray(resolved) ? resolved : resolved == null ? [] : [resolved];
  return arr
    .filter((node) => node != null && node !== false)
    .map((node) => ({ children: node as JSX.Element, resizable: true }));
};

// ResizableInner — corvu-mode (минимум один item с resizable=true).
const ResizableInner = (props: {
  items: IResizableItem[];
  orientation: ResizableOrientation;
  withHandle?: boolean;
  handleDisabled?: boolean;
  class?: string;
  onSizesChange?: (sizes: number[]) => void;
}) => {
  const items = createMemo(() => props.items);
  const sizes = createMemo(() => fillInitialSizes(items()));

  return (
    <ResizableRoot
      orientation={props.orientation}
      class={props.class}
      onSizesChange={props.onSizesChange}
    >
      <For each={items()}>
        {(item, index) => (
          <>
            <ResizablePanel
              initialSize={sizes()[index()]}
              minSize={item.minSize}
              maxSize={item.maxSize}
              collapsible={item.collapsible}
              class="min-h-0 min-w-0 overflow-hidden"
            >
              {item.children}
            </ResizablePanel>
            <Show
              when={(() => {
                const next = items()[index() + 1];
                return !!next && item.resizable !== false && next.resizable !== false;
              })()}
            >
              <ResizableHandle
                withHandle={props.withHandle}
                disabled={props.handleDisabled}
                classList={{ 'pointer-events-none': !!props.handleDisabled }}
              />
            </Show>
          </>
        )}
      </For>
    </ResizableRoot>
  );
};

// StaticInner — items без resize (все resizable=false / отсутствует). CSS flex.
const StaticInner = (props: {
  items: IResizableItem[];
  orientation: ResizableOrientation;
  class?: string;
  style?: JSX.CSSProperties | string;
}) => {
  const dirClass = props.orientation === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  return (
    <div class={cn(dirClass, props.class)} style={props.style as JSX.CSSProperties | undefined}>
      <For each={props.items}>{(item) => <div>{item.children}</div>}</For>
    </div>
  );
};

/**
 * Resizable — корневой layout-контейнер с панелями переменного размера (corvu).
 *
 * **Два способа задать панели:**
 *
 * 1. **JSX children** (рекомендуется для статичных и редактируемых case'ов):
 *    ```tsx
 *    <Resizable orientation="horizontal" withHandle>
 *      <Sidebar />
 *      <Main />
 *    </Resizable>
 *    ```
 *    Каждый top-level child становится панелью (resizable=true, auto-distribute size).
 *
 * 2. **`items` prop** (для динамических раскладок с control-over-sizes):
 *    ```tsx
 *    <Resizable
 *      orientation="horizontal"
 *      items={[
 *        { children: <Sidebar />, resizable: true, initialSize: 0.3, minSize: 0.15 },
 *        { children: <Main />, resizable: true, initialSize: 0.7 },
 *      ]}
 *      withHandle
 *      onSizesChange={persistSizes}
 *    />
 *    ```
 *
 * Если задан `items` — он source-of-truth, `children` игнорируются.
 */
export const Resizable = (props: IResizableProps) => {
  useTrace('web-ui.resizable'); // ADR 062
  const orientation = (): ResizableOrientation => props.orientation ?? 'horizontal';

  // children → items если items не задан.
  const resolved = children(() => props.children);
  const effectiveItems = createMemo<IResizableItem[]>(() =>
    props.items !== undefined ? props.items : childrenToItems(resolved()),
  );

  const hasElements = () => effectiveItems().length > 0;
  const hasResizable = () => hasElements() && effectiveItems().some((it) => it.resizable === true);

  return (
    <Show
      when={hasResizable()}
      fallback={
        <StaticInner
          items={effectiveItems()}
          orientation={orientation()}
          class={props.class}
          style={props.style}
        />
      }
    >
      <ResizableInner
        items={effectiveItems()}
        orientation={orientation()}
        withHandle={props.withHandle}
        handleDisabled={props.handleDisabled}
        class={props.class}
        onSizesChange={props.onSizesChange}
      />
    </Show>
  );
};
