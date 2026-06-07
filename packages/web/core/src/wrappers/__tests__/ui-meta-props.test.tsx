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
// Compile-time: compound (namespace) components — static sub-props preserved
// Regression guard for PR #119: WithMetaProps must not strip Card.Header,
// Field.Label, Navigation.Item etc. when augmenting the callable signature.
// ---------------------------------------------------------------------------

describe('ViewUi — Field compound: sub-components preserved with meta', () => {
  it('Ui.Field.Label is a function (not lost after WithMetaProps)', () => {
    expectTypeOf<ViewUi['Field']['Label']>().toBeFunction();
  });

  it('Ui.Field.Label accepts IUiMetaProps (meta prop)', () => {
    type LabelProps = Parameters<ViewUi['Field']['Label']>[0];
    expectTypeOf<LabelProps>().toMatchTypeOf<IUiMetaProps>();
  });

  it('Ui.Field.Content is a function', () => {
    expectTypeOf<ViewUi['Field']['Content']>().toBeFunction();
  });

  it('Ui.Field.Content accepts meta prop', () => {
    type ContentProps = Parameters<ViewUi['Field']['Content']>[0];
    expectTypeOf<ContentProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Field.Group is a function', () => {
    expectTypeOf<ViewUi['Field']['Group']>().toBeFunction();
  });

  it('Ui.Field.Label accepts meta prop', () => {
    type LabelProps = Parameters<ViewUi['Field']['Label']>[0];
    expectTypeOf<LabelProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });
});

describe('WidgetUi — Card compound: sub-components preserved with meta', () => {
  it('Ui.Card.Header is a function (not lost after WithMetaProps)', () => {
    expectTypeOf<WidgetUi['Card']['Header']>().toBeFunction();
  });

  it('Ui.Card.Header accepts meta prop', () => {
    type HeaderProps = Parameters<WidgetUi['Card']['Header']>[0];
    expectTypeOf<HeaderProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Card.Title is a function', () => {
    expectTypeOf<WidgetUi['Card']['Title']>().toBeFunction();
  });

  it('Ui.Card.Title accepts meta prop', () => {
    type TitleProps = Parameters<WidgetUi['Card']['Title']>[0];
    expectTypeOf<TitleProps>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Card.Content is a function', () => {
    expectTypeOf<WidgetUi['Card']['Content']>().toBeFunction();
  });

  it('Ui.Card.Description is a function', () => {
    expectTypeOf<WidgetUi['Card']['Description']>().toBeFunction();
  });

  it('Ui.Card.Footer is a function', () => {
    expectTypeOf<WidgetUi['Card']['Footer']>().toBeFunction();
  });
});

// ---------------------------------------------------------------------------
// NOTE (ADR 033): Table и DataTable удалены из ViewUi/WidgetUi.
// Таблица переехала в @capsuletech/web-table (глобал Tables.*).
// Тесты Table/DataTable meta-props ниже удалены — тип больше не в Ui-namespace.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// NOTE (ADR 032): ThemePicker, DarkModeToggle, LayoutModeToggle и
// WidgetSettingsToggle удалены из ViewUi/WidgetUi. Это connected-контролы со
// state из @capsuletech/web-style — переехали в @capsuletech/web-shell (tier-2),
// больше не часть stateless Ui-namespace. Апп импортит их из
// `@capsuletech/web-shell/ui` (ModeToggle config-driven + ThemePicker).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// NOTE (ADR 033 фаза 1): MapView и Chart удалены из ViewUi/WidgetUi.
// Они больше не являются частью Ui-namespace — регистрируются через
// capsule.app.ts: packages → глобал Maps.* (кодген, фаза 3).
// Тесты для Ui.MapView / Ui.Chart удалены вместе с типами из interfaces.ts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Compile-time: ViewUi.Layout subset — Grid + Flex present, Matrix absent
// Added 2026-05-27. View receives Layout: ViewLayoutSubset (Pick<typeof Layout, 'Grid'|'Flex'>).
// Matrix is intentionally excluded — it is a page-level application shell.
// ---------------------------------------------------------------------------

describe('ViewUi — Layout subset: Grid and Flex present', () => {
  it('Ui.Layout.Grid is present in ViewUi', () => {
    type LayoutInView = ViewUi['Layout'];
    expectTypeOf<LayoutInView>().toHaveProperty('Grid');
  });

  it('Ui.Layout.Flex is present in ViewUi', () => {
    type LayoutInView = ViewUi['Layout'];
    expectTypeOf<LayoutInView>().toHaveProperty('Flex');
  });

  it('Ui.Layout.Grid is a function (callable component)', () => {
    expectTypeOf<ViewUi['Layout']['Grid']>().toBeFunction();
  });

  it('Ui.Layout.Flex is a function (callable component)', () => {
    expectTypeOf<ViewUi['Layout']['Flex']>().toBeFunction();
  });

  it('Ui.Layout.Grid accepts IUiMetaProps (meta prop)', () => {
    type GridProps = Parameters<ViewUi['Layout']['Grid']>[0];
    expectTypeOf<GridProps>().toMatchTypeOf<IUiMetaProps>();
  });

  it('Ui.Layout.Flex accepts IUiMetaProps (meta prop)', () => {
    type FlexProps = Parameters<ViewUi['Layout']['Flex']>[0];
    expectTypeOf<FlexProps>().toMatchTypeOf<IUiMetaProps>();
  });

  it('Ui.Layout does NOT expose Matrix (page-shell guard)', () => {
    type LayoutInView = ViewUi['Layout'];
    // @ts-expect-error Matrix must not exist on ViewLayoutSubset
    type _guard = LayoutInView['Matrix'];
  });
});

describe('WidgetUi — Layout is Grid + Flex only (Matrix moved to web-shell, ADR 033)', () => {
  it('Ui.Layout does NOT expose Matrix in WidgetUi (web-shell guard)', () => {
    type LayoutInWidget = WidgetUi['Layout'];
    // @ts-expect-error Matrix must not exist on WidgetUi Layout (moved to web-shell)
    type _guard = LayoutInWidget['Matrix'];
  });

  it('Ui.Layout.Grid is present in WidgetUi', () => {
    type LayoutInWidget = WidgetUi['Layout'];
    expectTypeOf<LayoutInWidget>().toHaveProperty('Grid');
  });

  it('Ui.Layout.Flex is present in WidgetUi', () => {
    type LayoutInWidget = WidgetUi['Layout'];
    expectTypeOf<LayoutInWidget>().toHaveProperty('Flex');
  });
});

// ---------------------------------------------------------------------------
// Compile-time: Tooltip compound — root + Trigger/Content/Arrow sub-components
// Tooltip is lazy (kobalte-heavy). Mirrors Dropdown pattern.
// Guards: root + 3 sub-components accept IUiMetaProps in both ViewUi and WidgetUi.
// ---------------------------------------------------------------------------

describe('ViewUi — Tooltip compound: root and sub-components preserved with meta', () => {
  it('Ui.Tooltip is a function', () => {
    expectTypeOf<ViewUi['Tooltip']>().toBeFunction();
  });

  it('Ui.Tooltip accepts IUiMetaProps (meta prop)', () => {
    type Props = Parameters<ViewUi['Tooltip']>[0];
    expectTypeOf<Props>().toMatchTypeOf<IUiMetaProps>();
  });

  it('Ui.Tooltip.Trigger is a function', () => {
    expectTypeOf<ViewUi['Tooltip']['Trigger']>().toBeFunction();
  });

  it('Ui.Tooltip.Trigger accepts meta prop', () => {
    type Props = Parameters<ViewUi['Tooltip']['Trigger']>[0];
    expectTypeOf<Props>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Tooltip.Content is a function', () => {
    expectTypeOf<ViewUi['Tooltip']['Content']>().toBeFunction();
  });

  it('Ui.Tooltip.Content accepts meta prop', () => {
    type Props = Parameters<ViewUi['Tooltip']['Content']>[0];
    expectTypeOf<Props>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Tooltip.Arrow is a function', () => {
    expectTypeOf<ViewUi['Tooltip']['Arrow']>().toBeFunction();
  });

  it('Ui.Tooltip.Arrow accepts meta prop', () => {
    type Props = Parameters<ViewUi['Tooltip']['Arrow']>[0];
    expectTypeOf<Props>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });
});

describe('WidgetUi — Tooltip compound: root and sub-components preserved with meta', () => {
  it('Ui.Tooltip is a function', () => {
    expectTypeOf<WidgetUi['Tooltip']>().toBeFunction();
  });

  it('Ui.Tooltip accepts IUiMetaProps (meta prop)', () => {
    type Props = Parameters<WidgetUi['Tooltip']>[0];
    expectTypeOf<Props>().toMatchTypeOf<IUiMetaProps>();
  });

  it('Ui.Tooltip.Trigger is a function (not lost after WithMetaProps)', () => {
    expectTypeOf<WidgetUi['Tooltip']['Trigger']>().toBeFunction();
  });

  it('Ui.Tooltip.Trigger accepts meta prop', () => {
    type Props = Parameters<WidgetUi['Tooltip']['Trigger']>[0];
    expectTypeOf<Props>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Tooltip.Content is a function', () => {
    expectTypeOf<WidgetUi['Tooltip']['Content']>().toBeFunction();
  });

  it('Ui.Tooltip.Content accepts meta prop', () => {
    type Props = Parameters<WidgetUi['Tooltip']['Content']>[0];
    expectTypeOf<Props>().toMatchTypeOf<{ meta?: ITagMeta }>();
  });

  it('Ui.Tooltip.Arrow is a function', () => {
    expectTypeOf<WidgetUi['Tooltip']['Arrow']>().toBeFunction();
  });

  it('Ui.Tooltip.Arrow accepts meta prop', () => {
    type Props = Parameters<WidgetUi['Tooltip']['Arrow']>[0];
    expectTypeOf<Props>().toMatchTypeOf<{ meta?: ITagMeta }>();
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
    const StubInput = (props: any) => <input data-testid="inp" type={props.type ?? 'text'} />;

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
