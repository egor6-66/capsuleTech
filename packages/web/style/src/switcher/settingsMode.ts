import { createSignal, type Accessor } from 'solid-js';

const STORAGE_KEY = 'capsule-settings-mode';

// Module-level singleton signal. SSR-safe: localStorage read guarded.
const [enabled, setEnabled] = createSignal<boolean>(
  typeof window !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY) === 'true'
    : false,
);

/**
 * Reactive accessor for settingsMode. Solid tracks reads automatically
 * in createMemo / JSX. Signal initialised once on module-load from
 * localStorage (browser-only guard). Changes via `setSettingsMode(...)`.
 *
 * settingsMode is orthogonal to layoutMode — a user can have
 * layoutMode='edit' and settingsMode on/off independently.
 *
 * Storage key: `capsule-settings-mode`.
 */
export const useSettingsMode = (): Accessor<boolean> => enabled;

/** Set + persist. */
export const setSettingsMode = (next: boolean): void => {
  setEnabled(next);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(next));
  }
};

/** Toggle helper — `false` ⇔ `true`. */
export const toggleSettingsMode = (): void => {
  setSettingsMode(!enabled());
};
