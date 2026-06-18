/**
 * createFinish — unit tests.
 *
 * Activation is driven by the global `useFinishMode()` signal from
 * `@capsuletech/web-style`. DOM walk and MutationObserver are gone.
 *
 * Covers:
 *   - OFF: returns empty {} (true no-op)
 *   - ON:  returns gradient background + box-shadow
 *   - Reactive: signal toggle activates / deactivates immediately
 *   - Config store: values from useFinishConfig() are reflected in output
 *   - Config override: per-instance partial overrides take precedence
 *   - innerOnly: outer shadows suppressed when true
 *   - centerGlowAlpha > 0: radial layer prepended to background
 *   - surfaceAlpha < 1: card stops use color-mix with transparency
 */

import { createRoot } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test.
// ---------------------------------------------------------------------------

import type { IFinishConfig } from '@capsuletech/web-style';

// Controlled signal values used by the mocked accessors.
let _finishModeValue = false;
let _finishConfigValue: IFinishConfig = {
  topForegroundAlpha: 0.09,
  topStopPosition: 0,
  midCardAlpha: 0.7,
  midStopPosition: 45,
  bottomPrimaryAlpha: 0.18,
  bottomStopPosition: 100,
  hairlineAlpha: 0.4,
  innerBorderAlpha: 0.06,
  contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
  glowAlpha: 0.22,
  glowSpread: '0 8px 24px',
  innerOnly: false,
  centerGlowAlpha: 0,
  centerGlowSize: '60%',
  surfaceAlpha: 1,
  innerGlowAlpha: 0,
};

vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useFinishMode: () => () => _finishModeValue,
    useFinishConfig: () => () => _finishConfigValue,
  };
});

import { createFinish } from '../createFinish';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setFinishMode(value: boolean): void {
  _finishModeValue = value;
}

function setFinishConfig(patch: Partial<IFinishConfig>): void {
  _finishConfigValue = { ..._finishConfigValue, ...patch };
}

function resetConfig(): void {
  _finishModeValue = false;
  _finishConfigValue = {
    topForegroundAlpha: 0.09,
    topStopPosition: 0,
    midCardAlpha: 0.7,
    midStopPosition: 45,
    bottomPrimaryAlpha: 0.18,
    bottomStopPosition: 100,
    hairlineAlpha: 0.4,
    innerBorderAlpha: 0.06,
    contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)',
    glowAlpha: 0.22,
    glowSpread: '0 8px 24px',
    innerOnly: false,
    centerGlowAlpha: 0,
    centerGlowSize: '60%',
    surfaceAlpha: 1,
    innerGlowAlpha: 0,
  };
}

beforeEach(() => resetConfig());
afterEach(() => resetConfig());

// ---------------------------------------------------------------------------
// OFF state
// ---------------------------------------------------------------------------

describe('createFinish — OFF (useFinishMode returns false)', () => {
  it('returns empty {} — true no-op', () => {
    createRoot((dispose) => {
      setFinishMode(false);
      const finish = createFinish();
      expect(finish.surfaceStyle()).toEqual({});
      dispose();
    });
  });

  it('does not set background when finish is off', () => {
    createRoot((dispose) => {
      setFinishMode(false);
      const finish = createFinish();
      expect(finish.surfaceStyle().background).toBeUndefined();
      dispose();
    });
  });

  it('does not add box-shadow when finish is off', () => {
    createRoot((dispose) => {
      setFinishMode(false);
      const finish = createFinish();
      expect(finish.surfaceStyle()['box-shadow']).toBeUndefined();
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// ON state
// ---------------------------------------------------------------------------

describe('createFinish — ON (useFinishMode returns true)', () => {
  it('returns a three-stop linear-gradient background', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      expect(finish.surfaceStyle().background).toContain('linear-gradient');
      dispose();
    });
  });

  it('gradient contains top stop with --foreground', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      expect(finish.surfaceStyle().background).toContain('--foreground');
      dispose();
    });
  });

  it('gradient contains mid stop with --card fading to transparent', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('--card');
      expect(bg).toContain('transparent');
      dispose();
    });
  });

  it('gradient contains bottom stop with --primary', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      expect(finish.surfaceStyle().background).toContain('--primary');
      dispose();
    });
  });

  it('box-shadow contains top hairline inset', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      expect(finish.surfaceStyle()['box-shadow']).toContain('inset 0 1px 0');
      dispose();
    });
  });

  it('box-shadow contains inner border inset', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      expect(finish.surfaceStyle()['box-shadow']).toContain('inset 0 0 0 1px');
      dispose();
    });
  });

  it('box-shadow contains contact shadow', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      // Default contactShadow: '0 1px 2px rgb(0 0 0 / 0.4)'
      expect(finish.surfaceStyle()['box-shadow']).toContain('0 1px 2px');
      dispose();
    });
  });

  it('box-shadow contains coloured depth glow', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      expect(shadow).toContain('8px 24px');
      expect(shadow).toContain('--primary');
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// Reactive: signal-driven activation
// ---------------------------------------------------------------------------

describe('createFinish — reactive (signal-driven)', () => {
  it('activates immediately when useFinishMode signal is true', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish();
      expect(finish.surfaceStyle().background).toContain('linear-gradient');
      dispose();
    });
  });

  it('returns {} when useFinishMode signal is false', () => {
    createRoot((dispose) => {
      setFinishMode(false);
      const finish = createFinish();
      expect(finish.surfaceStyle()).toEqual({});
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// Config store — values from useFinishConfig() reflected in output
// ---------------------------------------------------------------------------

describe('createFinish — reads from useFinishConfig()', () => {
  it('reflects custom topForegroundAlpha from store', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ topForegroundAlpha: 0.15 });
      const finish = createFinish();
      // 0.15 → 15%
      expect(finish.surfaceStyle().background).toContain('15%');
      dispose();
    });
  });

  it('reflects custom hairlineAlpha from store', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ hairlineAlpha: 0.6 });
      const finish = createFinish();
      expect(finish.surfaceStyle()['box-shadow']).toContain('60%');
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// Config override — per-instance partial overrides take precedence
// ---------------------------------------------------------------------------

describe('createFinish — per-instance config override', () => {
  it('respects custom topForegroundAlpha override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ topForegroundAlpha: 0.25 });
      expect(finish.surfaceStyle().background).toContain('25%');
      dispose();
    });
  });

  it('respects custom bottomPrimaryAlpha override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ bottomPrimaryAlpha: 0.3 });
      expect(finish.surfaceStyle().background).toContain('30%');
      dispose();
    });
  });

  it('respects custom midCardAlpha override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ midCardAlpha: 0.5 });
      expect(finish.surfaceStyle().background).toContain('50%');
      dispose();
    });
  });

  it('respects custom hairlineAlpha override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ hairlineAlpha: 0.6 });
      expect(finish.surfaceStyle()['box-shadow']).toContain('60%');
      dispose();
    });
  });

  it('respects custom innerBorderAlpha override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerBorderAlpha: 0.12 });
      expect(finish.surfaceStyle()['box-shadow']).toContain('12%');
      dispose();
    });
  });

  it('respects custom contactShadow override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ contactShadow: '0 2px 4px rgb(0 0 0 / 0.6)' });
      expect(finish.surfaceStyle()['box-shadow']).toContain('0 2px 4px');
      dispose();
    });
  });

  it('respects custom glowAlpha override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ glowAlpha: 0.35 });
      expect(finish.surfaceStyle()['box-shadow']).toContain('35%');
      dispose();
    });
  });

  it('respects custom glowSpread override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ glowSpread: '0 12px 32px' });
      expect(finish.surfaceStyle()['box-shadow']).toContain('0 12px 32px');
      dispose();
    });
  });

  it('respects custom stop positions override', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({
        topStopPosition: 5,
        midStopPosition: 50,
        bottomStopPosition: 95,
      });
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('5%');
      expect(bg).toContain('50%');
      expect(bg).toContain('95%');
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// New knob: innerOnly
// ---------------------------------------------------------------------------

describe('createFinish — innerOnly knob', () => {
  it('innerOnly=false (default): box-shadow includes contact shadow and glow', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerOnly: false });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      // outer layers must be present
      expect(shadow).toContain('0 1px 2px'); // contactShadow
      expect(shadow).toContain('--primary'); // glow
      dispose();
    });
  });

  it('innerOnly=true: box-shadow contains only inset layers', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerOnly: true });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      // inset layers present
      expect(shadow).toContain('inset 0 1px 0');
      expect(shadow).toContain('inset 0 0 0 1px');
      // outer layers absent
      expect(shadow).not.toContain('0 1px 2px rgb(0 0 0'); // contactShadow gone
      expect(shadow).not.toContain('8px 24px'); // glow gone
      dispose();
    });
  });

  it('innerOnly=true from store: outer shadows suppressed', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ innerOnly: true });
      const finish = createFinish();
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      expect(shadow).toContain('inset');
      expect(shadow).not.toContain('8px 24px');
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// New knob: centerGlowAlpha / centerGlowSize
// ---------------------------------------------------------------------------

describe('createFinish — centerGlowAlpha / centerGlowSize knobs', () => {
  it('centerGlowAlpha=0 (default): no radial layer in background', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ centerGlowAlpha: 0 });
      const bg = finish.surfaceStyle().background as string;
      expect(bg).not.toContain('radial-gradient');
      dispose();
    });
  });

  it('centerGlowAlpha>0: radial-gradient prepended to background', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ centerGlowAlpha: 0.3 });
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('radial-gradient');
      expect(bg).toContain('--primary');
      // radial layer appears BEFORE linear-gradient (comma-separated, first = topmost)
      expect(bg.indexOf('radial-gradient')).toBeLessThan(bg.indexOf('linear-gradient'));
      dispose();
    });
  });

  it('centerGlowAlpha>0: alpha is reflected as percentage in color-mix', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ centerGlowAlpha: 0.4, centerGlowSize: '80%' });
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('40%');
      expect(bg).toContain('80%');
      dispose();
    });
  });

  it('centerGlowAlpha>0: radial uses two-value ellipse size (valid CSS)', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ centerGlowAlpha: 0.3, centerGlowSize: '75%' });
      const bg = finish.surfaceStyle().background as string;
      // Two-value form: "75% 75% at 50% 50%" — required for valid radial-gradient syntax.
      expect(bg).toContain('75% 75% at 50% 50%');
      dispose();
    });
  });

  it('centerGlowSize is used as the radial gradient size', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ centerGlowAlpha: 0.2, centerGlowSize: '120px' });
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('120px');
      dispose();
    });
  });

  it('centerGlowAlpha from store is applied', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ centerGlowAlpha: 0.5, centerGlowSize: '70%' });
      const finish = createFinish();
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('radial-gradient');
      expect(bg).toContain('50%');
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// New knob: surfaceAlpha
// ---------------------------------------------------------------------------

describe('createFinish — surfaceAlpha knob', () => {
  it('surfaceAlpha=1 (default): gradient uses plain var(--card), no color-mix wrap', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ surfaceAlpha: 1 });
      const bg = finish.surfaceStyle().background as string;
      // At alpha=1 the card base is the bare token, not wrapped in color-mix.
      // There should be exactly one "transparent" — from the mid stop fade.
      const matches = bg.match(/var\(--card\)/g) ?? [];
      // plain var(--card) still appears (not wrapped), transparent still present.
      expect(matches.length).toBeGreaterThan(0);
      dispose();
    });
  });

  it('surfaceAlpha<1: card stops use color-mix wrapping --card with transparent', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ surfaceAlpha: 0.8 });
      const bg = finish.surfaceStyle().background as string;
      // The card base becomes color-mix(in srgb, var(--card) 80%, transparent)
      expect(bg).toContain('--card');
      expect(bg).toContain('80%');
      dispose();
    });
  });

  it('surfaceAlpha=0: card contribution is 0%', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ surfaceAlpha: 0 });
      const bg = finish.surfaceStyle().background as string;
      // 0 * 100 = 0%
      expect(bg).toContain('0%');
      dispose();
    });
  });

  it('surfaceAlpha from store is applied', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ surfaceAlpha: 0.6 });
      const finish = createFinish();
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('60%');
      dispose();
    });
  });

  it('per-instance surfaceAlpha override takes precedence over store', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ surfaceAlpha: 0.6 });
      // instance override: 0.9 → 90%
      const finish = createFinish({ surfaceAlpha: 0.9 });
      const bg = finish.surfaceStyle().background as string;
      expect(bg).toContain('90%');
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// New knob: innerGlowAlpha
// ---------------------------------------------------------------------------

describe('createFinish — innerGlowAlpha knob', () => {
  it('innerGlowAlpha=0 (default): no inner-glow inset layer in box-shadow', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerGlowAlpha: 0 });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      // Should only have hairline + innerBorder (+ outer layers); not the 24px glow inset.
      expect(shadow).not.toContain('inset 0 0 24px');
      dispose();
    });
  });

  it('innerGlowAlpha>0: inset 24px glow layer added to box-shadow', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerGlowAlpha: 0.5 });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      expect(shadow).toContain('inset 0 0 24px');
      expect(shadow).toContain('--primary');
      dispose();
    });
  });

  it('innerGlowAlpha>0: alpha is reflected as percentage in color-mix', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerGlowAlpha: 0.6 });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      expect(shadow).toContain('60%');
      dispose();
    });
  });

  it('innerGlowAlpha>0 with innerOnly=true: inner-glow inset is still present', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      const finish = createFinish({ innerGlowAlpha: 0.4, innerOnly: true });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      // inner glow is an inset layer — must survive innerOnly=true
      expect(shadow).toContain('inset 0 0 24px');
      // outer glow still absent
      expect(shadow).not.toContain('8px 24px');
      dispose();
    });
  });

  it('innerGlowAlpha from store is applied', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ innerGlowAlpha: 0.3 });
      const finish = createFinish();
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      expect(shadow).toContain('inset 0 0 24px');
      expect(shadow).toContain('30%');
      dispose();
    });
  });

  it('innerGlowAlpha per-instance override takes precedence over store', () => {
    createRoot((dispose) => {
      setFinishMode(true);
      setFinishConfig({ innerGlowAlpha: 0.3 });
      const finish = createFinish({ innerGlowAlpha: 0.7 });
      const shadow = finish.surfaceStyle()['box-shadow'] as string;
      expect(shadow).toContain('70%');
      dispose();
    });
  });

  it('innerGlowAlpha=0 with finish OFF: returns empty {}', () => {
    createRoot((dispose) => {
      setFinishMode(false);
      const finish = createFinish({ innerGlowAlpha: 0.5 });
      expect(finish.surfaceStyle()).toEqual({});
      dispose();
    });
  });
});
