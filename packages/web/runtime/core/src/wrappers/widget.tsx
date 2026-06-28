// Outlet — capsule-обёртка над TanStack <Outlet/> через @capsuletech/web-router.
// CapsuleOutlet владеет view-transition-name через DepthContext (ADR 046 D4).
// Имя `Ui.Outlet` для consumer'ов сохраняется (re-export через alias).
import { CapsuleOutlet as Outlet } from '@capsuletech/web-router';
import { useSettingsMode } from '@capsuletech/web-style';
import { children, For, Show } from 'solid-js';
import { useCtx } from '../engine/ctx';
import { UiProxy } from '../engine/ui-proxy';
import { Ui as BaseUi } from '../ui-kit';
import type { IWidgetOptions, IWidgetRenderer, IWidgetWrapper } from './interfaces';
import { ShapeUiContext } from './shape';

// Cast to IWidgetWrapper: the implementation uses `any` internally to handle
// the generic <P, S> without losing type safety at the call site.
export const WidgetWrapper: IWidgetWrapper = ((
  Component: IWidgetRenderer<any, any>,
  options?: IWidgetOptions<any>,
) => {
  return function Widget(wrapperProps) {
    const ctx = useCtx();
    const store = ctx?.store;
    const rawUi = { ...(BaseUi as any), Outlet } as any;
    // Mirror view.tsx: wrap through UiProxy when inside a Controller-tree so
    // meta-tagged elements in a Widget get event-binding and store registration.
    // When Widget is rendered outside a Controller (e.g. standalone Storybook or
    // top-level Page without a logical parent), rawUi passes through unchanged.
    const proxiedUi = ctx ? UiProxy(rawUi, ctx, wrapperProps) : rawUi;

    const Loader = options?.loader;
    const settings = options?.settings;

    // Loader swap: when store.loading === true AND a Loader was provided,
    // render the Loader branch; otherwise render the content branch.
    // Solid's <Show> unmounts the inactive branch so content (e.g. MapView)
    // is never instantiated while the loader is displayed.
    const isLoading = () => Boolean(Loader && store?.loading);

    // settingsMode: reactive global signal from @capsuletech/web-style.
    // useSettingsMode() returns an Accessor<boolean> — calling it inside JSX
    // creates a reactive dependency so the strip mounts/unmounts reactively.
    const settingsMode = useSettingsMode();

    // Settings strip is active when:
    //   • global settingsMode is ON
    //   • options.settings is non-empty
    //   • store is available (Widget is inside a Controller-tree; we need
    //     store.ctx.data for value() calls and UiProxy for meta-binding)
    const showSettings = () => Boolean(settingsMode() && settings?.length && store);

    // Stable reference to the proxied Button component for use inside For.
    // proxiedUi is stable within a Widget instance (same ctx, same wrapperProps shape).
    const ProxiedButton = (proxiedUi as any).Button as any;

    // Settings strip — frosted floating overlay at top of widget.
    // z-10 sits above scrollable content (DataTable, MapView, etc.).
    // Frosted effect: semi-transparent theme-aware bg + backdrop-blur + shadow.
    const settingsStrip = () => (
      <div class="absolute inset-x-0 top-0 z-10 flex h-10 items-center gap-2 rounded-b-md border-b border-border/60 bg-background/85 px-3 text-sm shadow-lg backdrop-blur-md">
        <For each={settings}>
          {(setting) => {
            // toggle: active when value(store.ctx.data) is truthy.
            // Active pill: primary-filled (accent bg + foreground text).
            // Inactive pill: muted ghost (bg-muted/40 + muted-foreground text, hover to muted).
            // State communicated via fill, not text prefix.
            const isActive = () => setting.value(store?.ctx?.data);
            return (
              <ProxiedButton
                size="sm"
                variant="ghost"
                class={
                  isActive()
                    ? 'h-7 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90'
                    : 'h-7 rounded-full bg-muted/40 px-3 text-xs font-medium text-muted-foreground hover:bg-muted'
                }
                meta={{ tags: setting.tags }}
              >
                {setting.label}
              </ProxiedButton>
            );
          }}
        </For>
      </div>
    );

    // Single content instance — created ONCE per (non-loading) mount via Solid's
    // children() helper, then shared between the normal and settings-overlay
    // branches. Referencing content() in both inner-<Show> branches makes the
    // SAME instance move between them on a settings-toggle (no remount).
    //
    // Why this matters: the previous code called Component(...) at TWO separate
    // call-sites (the inner-Show `fallback` AND the settings <div>). Under the
    // nested reactive <Show> the factory was evaluated twice on mount → content
    // instantiated ×2 / disposed ×1 (churn, net 1). This double-mount was the
    // root of bug A: Widget(Canvas) spawned two <Remote.View> → two
    // RemoteComponent → doubled transport subscriptions → one message delivered
    // twice. See ADR 062 trace diagnosis.
    //
    // Defined as a local component so the content lives INSIDE the loader <Show>:
    // while store.loading is true the loader branch is shown, WidgetContent is
    // never mounted, and Component (e.g. MapView) is never instantiated — the
    // loader contract (content not built behind the loader) is preserved. A
    // top-level children() call would eager-instantiate the content via its
    // memo and break that contract.
    const WidgetContent = () => {
      const content = children(
        () => (Component as IWidgetRenderer)(proxiedUi, store, wrapperProps),
      );
      return (
        <Show when={showSettings()} fallback={content()}>
          {/*
            Settings-active path: root must be `relative` to host the absolute strip.
            Content wrapper uses `absolute inset-0 overflow-auto` so it gets a definite
            height synchronously — critical for DataTable virtualizer (same pattern as
            Matrix cell with settings). The content instance MOVES here from the
            fallback (it is not remounted), thanks to the shared children() memo.
          */}
          <div class="relative h-full w-full">
            {settingsStrip()}
            <div class="absolute inset-0 overflow-auto">{content()}</div>
          </div>
        </Show>
      );
    };

    return (
      <ShapeUiContext.Provider value={proxiedUi}>
        <Show when={!isLoading()} fallback={Loader && (Loader(proxiedUi, wrapperProps) as any)}>
          <WidgetContent />
        </Show>
      </ShapeUiContext.Provider>
    );
  };
}) as IWidgetWrapper;
