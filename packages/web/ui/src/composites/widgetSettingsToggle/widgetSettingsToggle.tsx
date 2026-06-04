import { toggleSettingsMode, useSettingsMode } from '@capsuletech/web-style';
import { Show } from 'solid-js';

import type { IWidgetSettingsToggleProps } from './interfaces';

/**
 * Button that toggles settingsMode (on / off) via the @capsuletech/web-style store.
 *
 * settingsMode is INDEPENDENT of layoutMode — toggling widget settings does not
 * affect the layout edit / view mode and vice versa.
 *
 * Shows a cog icon (⚙) + "Settings" label. When settingsMode is ON the button
 * receives an `aria-pressed="true"` attribute and a filled appearance.
 *
 * @example
 * ```tsx
 * <WidgetSettingsToggle />
 * <WidgetSettingsToggle onChange={(on) => console.log('settings mode:', on)} />
 * ```
 */
export const WidgetSettingsToggle = (props: IWidgetSettingsToggleProps) => {
  const enabled = useSettingsMode();
  return (
    <button
      type="button"
      onClick={() => {
        const next = !enabled();
        toggleSettingsMode();
        props.onChange?.(next);
      }}
      aria-label="Widget settings"
      aria-pressed={enabled() ? 'true' : 'false'}
      class={`inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${enabled() ? 'bg-accent text-accent-foreground' : 'bg-card'} ${props.class ?? ''}`}
    >
      {/* Cog icon (unicode gear) */}
      <Show when={enabled()} fallback={<>&#x2699; Settings</>}>
        &#x2699; Settings
      </Show>
    </button>
  );
};
