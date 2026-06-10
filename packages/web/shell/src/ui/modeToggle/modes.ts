import {
  toggleDarkMode,
  toggleDndMode,
  toggleFinishMode,
  toggleResizeMode,
  toggleSettingsMode,
  useDarkMode,
  useDndMode,
  useFinishMode,
  useResizeMode,
  useSettingsMode,
} from '@capsuletech/web-style';
import { Maximize2, Moon, Move, SlidersHorizontal, Sparkles } from '@capsuletech/web-ui/icons';

import type { BuiltinMode, IModeDescriptor } from './interfaces';

/**
 * Built-in mode descriptors bound to the `@capsuletech/web-style` switcher store.
 *
 * Each entry collapses what used to be a bespoke `*ModeToggle` component into a
 * declarative `{ active, toggle, label, icon }` record. The accessors are the
 * module-level singletons from web-style, so all togglers across the app share
 * one source of truth.
 */
export const MODES = {
  dark: {
    active: useDarkMode(),
    toggle: () => toggleDarkMode(),
    label: 'Dark mode',
    icon: Moon,
  },
  dnd: {
    active: useDndMode(),
    toggle: toggleDndMode,
    label: 'Drag & drop',
    icon: Move,
  },
  resize: {
    active: useResizeMode(),
    toggle: toggleResizeMode,
    label: 'Resize',
    icon: Maximize2,
  },
  settings: {
    active: useSettingsMode(),
    toggle: toggleSettingsMode,
    label: 'Widget settings',
    icon: SlidersHorizontal,
  },
  finish: {
    active: useFinishMode(),
    toggle: toggleFinishMode,
    label: 'Глэс',
    icon: Sparkles,
  },
} satisfies Record<BuiltinMode, IModeDescriptor>;
