import type { JSX } from 'solid-js';

/**
 * One worked example under the article body.
 *
 * The kit renders each as a compact entity `Ui.Card` (`primary` → title,
 * `secondary` → subtitle) — the consumer feeds data, never a layout.
 *
 * Runtime accepts `JSX.Element`; a serializable preset (`ISchema`) uses plain
 * strings (the store is JSON).
 */
export interface IArticleExample {
  /** Primary line — rendered as the example card title. */
  primary: JSX.Element;
  /** Optional secondary line — rendered as the muted card subtitle. */
  secondary?: JSX.Element;
}

/**
 * One "related" chip in the see-also row.
 *
 * `label` is `JSX.Element` at runtime; a plain `string` in a preset/store.
 */
export interface IArticleRelated {
  /** Stable id — passed to `onRelatedSelect`. */
  id: string;
  /** Chip label. Runtime: any JSX; in a preset/store: a plain string. */
  label: JSX.Element;
}

/**
 * Article — the reusable «heading + lead + markdown body + examples + related»
 * pattern as a single kit composite.
 *
 * Replaces the hand-composed article learn `Concept` used to build
 * (`Layout.Flex` + `Typography h1` + `Markdown` + `For` example cards + `For`
 * related chips) — an anti-pattern per the component-model canon. All structure
 * and classes live in the kit; the consumer feeds data only (zero raw classes
 * leak out). Every slot is `<Show>`-gated, so an absent slot renders nothing.
 *
 * `body` is a **node slot** (`JSX.Element`): markdown rendering with wikilinks
 * currently lives in the learn domain, so the consumer passes its own rendered
 * markdown and the kit only positions it. Pulling `Markdown`/wikilink into the
 * kit (`Ui.Prose`) is a separate future step — not here.
 */
export interface IArticleProps {
  /** Heading (h1). */
  title?: JSX.Element;
  /** Lead / intro — the principle, rendered muted under the title. */
  lead?: JSX.Element;
  /**
   * Body — a rendered content node (e.g. markdown). The kit only positions it;
   * it does not parse or style the markup. Runtime-only slot.
   */
  body?: JSX.Element;
  /** Worked examples — each drawn as a compact entity `Ui.Card`. */
  examples?: IArticleExample[];
  /** Related references — a wrapping row of interactive `Ui.Badge` chips. */
  related?: IArticleRelated[];
  /** Heading above the related block (e.g. «Смотри правила»). */
  relatedLabel?: JSX.Element;
  /**
   * Fired when a related chip is picked. Runtime handler — NOT part of the
   * preset schema (the store carries data, not callbacks).
   */
  onRelatedSelect?: (id: string) => void;
  /** Passthrough class on the outer stack. */
  class?: string;
}
