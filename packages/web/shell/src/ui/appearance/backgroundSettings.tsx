/**
 * BackgroundSettings — internal ambient-glow editor for use inside Appearance.
 *
 * NOT exported from any barrel. Only Appearance.tsx imports this component.
 * State lives in @capsuletech/web-style (useAmbientConfig / setAmbientGlow /
 * addAmbientGlow / removeAmbientGlow / resetAmbientConfig).
 *
 * Rendered as a Dropdown.Sub (SubTrigger «Фон ▶» + SubContent with the full
 * editor panel). Each GlowItem stops keydown/pointerdown propagation on its
 * content div so slider arrow-keys don't bleed into Dropdown's keyboard nav.
 */

import {
  addAmbientGlow,
  removeAmbientGlow,
  resetAmbientConfig,
  setAmbientGlow,
  useAmbientConfig,
} from '@capsuletech/web-style';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { Button } from '@capsuletech/web-ui/button';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { X } from '@capsuletech/web-ui/icons';
import { Slider } from '@capsuletech/web-ui/slider';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Index } from 'solid-js';

// ---------------------------------------------------------------------------
// BackgroundPanel — full panel content
// ---------------------------------------------------------------------------

function BackgroundPanel() {
  const cfg = useAmbientConfig();

  return (
    <div class="flex flex-col gap-3 p-3">
      {/* Collapsible list of glow items — each collapses/expands independently.
          <Index> keys by position so DOM rows stay stable during slider drag:
          setAmbientGlow spreads a new object at index i (ссылка меняется),
          <For> would remount the row and break the drag; <Index> never does. */}
      <Accordion multiple>
        <Index each={cfg().glows}>
          {(glow, i) => (
            <Accordion.Item value={`glow-${i}`}>
              <Accordion.Trigger>Подсветка {i + 1}</Accordion.Trigger>
              <Accordion.Content>
                <div
                  class="flex flex-col gap-3"
                  onKeyDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    class="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => removeAmbientGlow(i)}
                    aria-label={`Удалить подсветку ${i + 1}`}
                  >
                    <X class="mr-1.5 size-3.5" aria-hidden="true" />
                    Удалить
                  </Button>

                  <Slider
                    label="X"
                    showValue
                    min={-20}
                    max={120}
                    step={1}
                    value={glow().x}
                    onChange={(v) => setAmbientGlow(i, { x: v })}
                  />
                  <Slider
                    label="Y"
                    showValue
                    min={-20}
                    max={120}
                    step={1}
                    value={glow().y}
                    onChange={(v) => setAmbientGlow(i, { y: v })}
                  />

                  <Slider
                    label="Радиус"
                    showValue
                    min={10}
                    max={100}
                    step={1}
                    value={glow().size}
                    onChange={(v) => setAmbientGlow(i, { size: v })}
                  />

                  <Slider
                    label="Яркость"
                    showValue
                    min={0}
                    max={0.6}
                    step={0.01}
                    value={glow().alpha}
                    onChange={(v) => setAmbientGlow(i, { alpha: v })}
                  />

                  <div class="flex items-center gap-2">
                    <span class="text-sm text-muted-foreground">Тинт</span>
                    <div class="ml-auto flex items-center gap-1">
                      <Toggle
                        checked={glow().tint === 'primary'}
                        label="Primary"
                        size="sm"
                        onChange={(on) => {
                          if (on) setAmbientGlow(i, { tint: 'primary' });
                        }}
                      />
                      <Toggle
                        checked={glow().tint === 'accent'}
                        label="Accent"
                        size="sm"
                        onChange={(on) => {
                          if (on) setAmbientGlow(i, { tint: 'accent' });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          )}
        </Index>
      </Accordion>

      {/* Add glow — outside Accordion, always visible */}
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        onClick={() => addAmbientGlow()}
      >
        + Добавить подсветку
      </Button>

      {/* Reset — outside Accordion, always visible */}
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        onClick={() => resetAmbientConfig()}
      >
        Reset
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BackgroundSettings — public (within this folder only)
// ---------------------------------------------------------------------------

/**
 * Sub-menu entry for the ambient background editor.
 * Always rendered in `mode="sub"` (Dropdown.Sub + SubTrigger + SubContent).
 * Intended for use only inside Appearance — not re-exported from ui/index.ts.
 */
export function BackgroundSettings() {
  return (
    <Dropdown.Sub>
      <Dropdown.SubTrigger>
        <span class="text-muted-foreground">Фон</span>
        <span class="ml-auto text-muted-foreground" aria-hidden="true">
          &#9658;
        </span>
      </Dropdown.SubTrigger>
      <Dropdown.SubContent class="w-72">
        <BackgroundPanel />
      </Dropdown.SubContent>
    </Dropdown.Sub>
  );
}
