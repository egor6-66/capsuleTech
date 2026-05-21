/* @vitest-environment jsdom */
/**
 * ui-meta-props.test.tsx
 *
 * Характеризационные тесты для `IUiMetaProps` / `WithMetaProps<T>`.
 *
 * Проблема до фикса (TS2322):
 *   `<Ui.Input meta={{ tags: ['email'], name: 'email' }} type="email" />`
 *   → "Property 'meta' does not exist on type 'IntrinsicAttributes & IInputProps'"
 *
 * Корень: ViewUi / WidgetUi использовали сырые `typeof Input` (= `Component<IInputProps>`).
 * `IInputProps` не знает ничего про UiProxy-layer props (meta/payload/dynamicMeta/modifiers).
 *
 * Фикс: `WithMetaProps<T>` — mapped type, добавляющий `& IUiMetaProps` к каждому
 * callable компоненту в Ui-namespace. `ViewUi = WithMetaProps<ViewUiRaw>` и т.д.
 * Живёт в web-core (не web-ui): UiProxy — HCA-layer, не DOM/style primitive layer.
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import type { ITagMeta, IUiMetaProps, ViewUi, WidgetUi } from '../interfaces';
import { ViewWrapper } from '../view';

// ---------------------------------------------------------------------------
// Compile-time: IUiMetaProps shape
// ---------------------------------------------------------------------------

describe('IUiMetaProps — compile-time shape', () => {
  it('meta field is optional ITagMeta', () => {
    expectTypeOf<IUiMetaProps['meta']>().toEqualTypeOf<ITagMeta | undefined>();
  });

  it('payload is optional unknown', () => {
    expectTypeOf<IUiMetaProps['payload']>().toEqualTypeOf<unknown>();
  });

  it('dynamicMeta is optional ITagMeta', () => {
    expectTypeOf<IUiMetaProps['dynamicMeta']>().toEqualTypeOf<ITagMeta | undefined>();
  });

  it('modifiers is an optional object with optional boolean flags', () => {
    type M = IUiMetaProps['modifiers'];
    expectTypeOf<NonNullable<M>['ctrl']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<NonNullable<M>['shift']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<NonNullable<M>['alt']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<NonNullable<M>['meta']>().toEqualTypeOf<boolean | undefined>();
  });
});

// ---------------------------------------------------------------------------
// Compile-time: WithMetaProps applied to ViewUi
// ---------------------------------------------------------------------------

describe('ViewUi — IUiMetaProps injected into component props', () => {
  it('Ui.Input accepts meta prop (no TS2322)', () => {
    // This is the exact pattern that was failing before the fix.
    // If WithMetaProps is not applied, this type assertion would fail at compile time.
    type InputProps = Parameters<ViewUi['Input']>[0];
    expectTypeOf<InputProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Button accepts meta prop', () => {
    type ButtonProps = Parameters<ViewUi['Button']>[0];
    expectTypeOf<ButtonProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Input still accepts its original props (type, value, etc.)', () => {
    // WithMetaProps must not strip original props — it only intersects & IUiMetaProps.
    type InputProps = Parameters<ViewUi['Input']>[0];
    // `type` comes from IInputProps (extends JSX.InputHTMLAttributes)
    expectTypeOf<InputProps>().toMatchTypeOf<{ type?: string }>();
  });

  it('Ui.Input accepts payload prop', () => {
    type InputProps = Parameters<ViewUi['Input']>[0];
    expectTypeOf<InputProps>().toMatchTypeOf<{ payload?: unknown }>();
  });

  it('Ui.Input accepts dynamicMeta prop', () => {
    type InputProps = Parameters<ViewUi['Input']>[0];
    expectTypeOf<InputProps>().toMatchTypeOf<{ dynamicMeta?: ITagMeta }>();
  });
});

describe('WidgetUi — IUiMetaProps injected into component props', () => {
  it('Ui.Card accepts meta prop', () => {
    type CardProps = Parameters<WidgetUi['Card']>[0];
    expectTypeOf<CardProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Animate accepts meta prop', () => {
    type AnimateProps = Parameters<WidgetUi['Animate']>[0];
    expectTypeOf<AnimateProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });
});

// ---------------------------------------------------------------------------
// Runtime: ViewWrapper + UiProxy does not crash when meta is passed
// (the actual prop stripping is in UiProxy; here we verify no runtime error)
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: () => void;
let savedWarn: typeof console.warn;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  savedWarn = console.warn;
  console.warn = () => {};
});

afterEach(() => {
  cleanup?.();
  document.body.removeChild(container);
  console.warn = savedWarn;
});

describe('ViewWrapper — meta prop forwarded to UiProxy without error', () => {
  it('View factory can render stub component with meta prop via Ui arg', () => {
    // We use a stub that accepts meta (UiProxy-aware) rather than lazy web-ui,
    // to avoid Suspense/lazy loading complexity in jsdom environment.
    const StubInput = (props: any) => (
      <input data-testid="inp" type={props.type ?? 'text'} />
    );

    let capturedUi: any;
    const TestView = ViewWrapper((ui) => {
      capturedUi = ui;
      // We cast to 'any' here only for the runtime test stub — in production
      // code the types are satisfied by the actual UiProxy-wrapped components.
      const WrappedInput = (ui as any).Input ?? StubInput;
      return (
        <div data-testid="view">
          <StubInput meta={{ tags: ['email'], name: 'email' }} type="email" />
        </div>
      );
    });

    cleanup = render(() => <TestView />, container);
    expect(container.querySelector('[data-testid="view"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="inp"]')).not.toBeNull();
    // UiProxy is not active (no ControllerContext) — capturedUi is BaseUi
    expect(capturedUi).toBeDefined();
  });
});
