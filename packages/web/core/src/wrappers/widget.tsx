import { useSettingsMode } from '@capsuletech/web-style';
import { Outlet } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';
import { useCtx } from '../engine/ctx';
import { UiProxy } from '../engine/ui-proxy';
import { Ui as BaseUi } from '../ui-kit';
import type { IWidgetOptions, IWidgetRenderer, IWidgetWrapper } from './interfaces';
import { ShapeUiContext } from './shape';

// Cast to IWidgetWrapper: the implementation uses `any` internally to handle
// the generic <P, S> without losing type safety at the call site.
// biome-ignore lint/suspicious/noExplicitAny: generic wrapper implementation
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

    // Settings strip — absolute overlay at top of widget.
    // z-10 sits above scrollable content (DataTable, MapView, etc.).
    // Classes mirror Matrix cell settings-strip 1:1.
    const settingsStrip = () => (
      <div class="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-1 border-b border-border bg-popover px-2 text-sm shadow-md">
        <For each={settings}>
          {(setting) => {
            // toggle: active when value(store.ctx.data) is truthy → 'default' variant,
            // inactive → 'outline'. value() called reactively inside JSX so Solid
            // tracks the reactive dependency on store.ctx.data automatically.
            const isActive = () => setting.value(store?.ctx?.data);
            return (
              <ProxiedButton
                size="sm"
                variant={isActive() ? 'default' : 'outline'}
                meta={{ tags: setting.tags }}
              >
                {isActive() ? `✓ ${setting.label}` : setting.label}
              </ProxiedButton>
            );
          }}
        </For>
      </div>
    );

    return (
      <ShapeUiContext.Provider value={proxiedUi}>
        <Show when={!isLoading()} fallback={Loader && (Loader(proxiedUi, wrapperProps) as any)}>
          <Show
            when={showSettings()}
            fallback={
              // Normal path — no settings strip: render content directly as before.
              // No wrapper added here to avoid disturbing existing layout (flex, grid, h-full, etc.).
              (Component as IWidgetRenderer)(proxiedUi, store, wrapperProps)
            }
          >
            {/*
              Settings-active path: root must be `relative` to host the absolute strip.
              Content wrapper uses `absolute inset-0 overflow-auto` so it gets a definite
              height synchronously — critical for DataTable virtualizer (same pattern as
              Matrix cell with settings). settingsMode is a rare editing-mode toggle; the
              content remounts on toggle which is acceptable.
            */}
            <div class="relative h-full w-full">
              {settingsStrip()}
              <div class="absolute inset-0 overflow-auto">
                {(Component as IWidgetRenderer)(proxiedUi, store, wrapperProps)}
              </div>
            </div>
          </Show>
        </Show>
      </ShapeUiContext.Provider>
    );
  };
}) as IWidgetWrapper;
