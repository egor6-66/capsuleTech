import type { Component, ComponentProps, JSX } from 'solid-js';

/**
 * One selectable leaf inside a section.
 *
 * `label` is `JSX.Element` at runtime (icons, badges), but MUST be a plain
 * `string` when the composite is authored as a studio preset (`ISchema`) — the
 * store is JSON, so anything non-serializable would be dropped there.
 */
export interface ISectionedListItem {
  /** Stable id — passed to `onSelect`, compared against `selectedId`. */
  id: string;
  /** Row label. Runtime: any JSX; in a preset/store: a plain string. */
  label: JSX.Element;
}

/** One collapsible group (accordion section) with its selectable items. */
export interface ISectionedListSection {
  /** Unique accordion value within the list — also the `open` array key. */
  value: string;
  /** Group header label. Runtime: any JSX; in a preset/store: a plain string. */
  label: JSX.Element;
  /** Optional muted caption under the header (renders the trigger stack). */
  subtitle?: JSX.Element;
  /** Optional leading icon component (lucide icon or SVG component). */
  icon?: Component<ComponentProps<'svg'>>;
  /** Items shown when the section is expanded. */
  items: ISectionedListItem[];
}

/**
 * SectionedList — «accordion of groups → selectable list» composite.
 *
 * The one kit home for the repeating pattern shared by learn `Concepts`/`Rules`
 * and studio `ComponentSegments`: a set of collapsible sections, each holding a
 * list of picker rows. Consumers feed data only — all structure/chrome lives in
 * the kit (zero raw classes leak out).
 */
export interface ISectionedListProps {
  /** Sections in display order. */
  sections: ISectionedListSection[];
  /** id of the currently-selected item — highlights the matching row. */
  selectedId?: string | null;
  /**
   * Fired when a row is picked. Runtime handler — NOT part of the preset schema
   * (the store carries data, not callbacks).
   */
  onSelect?: (id: string) => void;
  /** Controlled open sections (accordion values). Pair with `onOpenChange`. */
  open?: string[];
  /** Controlled open-change callback. */
  onOpenChange?: (value: string[]) => void;
  /**
   * Uncontrolled initial open set. `'all'` expands every section. Ignored when
   * `open` (controlled) is provided.
   */
  defaultOpen?: string[] | 'all';
  /**
   * Optional hover-preview per item — runtime-only (studio). When provided, the
   * kit wraps every row in a `Tooltip` whose content is `itemPreview(id)`. The
   * consumer supplies only the content (data), never the tooltip structure.
   */
  itemPreview?: (id: string) => JSX.Element;
  /** Passthrough class on the outer accordion. */
  class?: string;
}
