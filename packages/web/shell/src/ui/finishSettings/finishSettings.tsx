import { resetFinishConfig, setFinishConfig, useFinishConfig } from '@capsuletech/web-style';
import { Button } from '@capsuletech/web-ui/button';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { Slider } from '@capsuletech/web-ui/slider';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { onMount, splitProps } from 'solid-js';

import type { IFinishSettingsProps } from './interfaces';

// ---------------------------------------------------------------------------
// Section — semantic grouping inside the panel
// ---------------------------------------------------------------------------

function Section(props: { label: string; children: import('solid-js').JSX.Element }) {
  return (
    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {props.label}
      </span>
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel content — all sliders and toggles
//
// Wrapped in a div that stops keyboard events from propagating into Dropdown's
// keyboard-navigation handlers (arrow keys / space would otherwise move focus
// or activate menu items while the user is dragging a slider).
// ---------------------------------------------------------------------------

function FinishPanel() {
  const cfg = useFinishConfig();

  let panelRef!: HTMLDivElement;
  onMount(() => {
    // Prevent slider arrow keys / space from leaking into Dropdown keyboard nav.
    panelRef.addEventListener('keydown', (e) => e.stopPropagation());
    // Prevent pointer events on sliders from triggering item-selection logic.
    panelRef.addEventListener('pointerdown', (e) => e.stopPropagation());
  });

  return (
    <div ref={panelRef} class="flex flex-col gap-4 p-3">
      {/* ── Поверхность ─────────────────────────────────────────────────── */}
      <Section label="Поверхность">
        <Slider
          label="Top tint"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().topForegroundAlpha}
          onChange={(v) => setFinishConfig({ topForegroundAlpha: v })}
        />
        <Slider
          label="Mid card"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().midCardAlpha}
          onChange={(v) => setFinishConfig({ midCardAlpha: v })}
        />
        <Slider
          label="Bottom tint"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().bottomPrimaryAlpha}
          onChange={(v) => setFinishConfig({ bottomPrimaryAlpha: v })}
        />
        <Slider
          label="Surface"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().surfaceAlpha}
          onChange={(v) => setFinishConfig({ surfaceAlpha: v })}
        />
      </Section>

      <Dropdown.Separator />

      {/* ── Кромка ──────────────────────────────────────────────────────── */}
      <Section label="Кромка">
        <Slider
          label="Hairline"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().hairlineAlpha}
          onChange={(v) => setFinishConfig({ hairlineAlpha: v })}
        />
        <Slider
          label="Inner border"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().innerBorderAlpha}
          onChange={(v) => setFinishConfig({ innerBorderAlpha: v })}
        />
      </Section>

      <Dropdown.Separator />

      {/* ── Глубина ─────────────────────────────────────────────────────── */}
      <Section label="Глубина">
        <Slider
          label="Glow"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().glowAlpha}
          onChange={(v) => setFinishConfig({ glowAlpha: v })}
        />
        <Slider
          label="Inner glow"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().innerGlowAlpha}
          onChange={(v) => setFinishConfig({ innerGlowAlpha: v })}
        />
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm text-foreground">Inner only</span>
          <Toggle checked={cfg().innerOnly} onChange={(v) => setFinishConfig({ innerOnly: v })} />
        </div>
      </Section>

      <Dropdown.Separator />

      {/* ── Центр-свечение ──────────────────────────────────────────────── */}
      <Section label="Центр-свечение">
        <Slider
          label="Intensity"
          showValue
          min={0}
          max={1}
          step={0.01}
          value={cfg().centerGlowAlpha}
          onChange={(v) => setFinishConfig({ centerGlowAlpha: v })}
        />
        <Slider
          label="Center glow size"
          showValue
          min={20}
          max={100}
          step={5}
          value={parseInt(cfg().centerGlowSize, 10) || 60}
          onChange={(v) => setFinishConfig({ centerGlowSize: `${v}%` })}
        />
      </Section>

      <Dropdown.Separator />

      {/* ── Reset ───────────────────────────────────────────────────────── */}
      <Button variant="outline" size="sm" class="w-full" onClick={() => resetFinishConfig()}>
        Reset
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FinishSettings — public component
// ---------------------------------------------------------------------------

/**
 * Connected control for finish-mode surface parameters. State lives in
 * `@capsuletech/web-style` (`useFinishConfig` / `setFinishConfig` / `resetFinishConfig`).
 *
 * Panel contains grouped sliders (built from `@capsuletech/web-ui/slider`) and a
 * Toggle (`@capsuletech/web-ui/toggle`) — surface controls that automatically
 * receive the finish treatment when finish-mode is enabled.
 *
 * Keyboard conflict mitigation: the panel root stops `keydown` and `pointerdown`
 * propagation so Kobalte's menu keyboard-navigation does not interfere with
 * slider arrow-key input.
 *
 * @example
 * ```tsx
 * // Standalone — own dropdown root:
 * <FinishSettings />
 *
 * // Sub mode — inside Shell.Header.Menu:
 * <Shell.Header.Menu>
 *   <Shell.ThemePicker mode="sub" />
 *   <Shell.FinishSettings mode="sub" />
 * </Shell.Header.Menu>
 * ```
 */
export const FinishSettings = (props: IFinishSettingsProps) => {
  const [local] = splitProps(props, ['mode', 'triggerLabel', 'class']);
  const mode = () => local.mode ?? 'standalone';
  const label = () => local.triggerLabel ?? 'Объём';

  if (mode() === 'standalone') {
    return (
      <Dropdown>
        <Dropdown.Trigger as={Button} variant="outline" size="sm" class={local.class}>
          <span>{label()}</span>
          <span class="text-muted-foreground" aria-hidden="true">
            &#9662;
          </span>
        </Dropdown.Trigger>
        <Dropdown.Content class="w-72">
          <FinishPanel />
        </Dropdown.Content>
      </Dropdown>
    );
  }

  return (
    <Dropdown.Sub>
      <Dropdown.SubTrigger class={local.class}>
        <span class="text-muted-foreground">Объём:</span>
        <span class="ml-1.5">{label()}</span>
        <span class="ml-auto text-muted-foreground" aria-hidden="true">
          &#9658;
        </span>
      </Dropdown.SubTrigger>
      <Dropdown.SubContent class="w-72">
        <FinishPanel />
      </Dropdown.SubContent>
    </Dropdown.Sub>
  );
};
