import type { IAudience } from '@capsuletech/docs-builder';
import { createMemo, type JSX, Show } from 'solid-js';
import { filterBodyByAudience } from './audience-filter';
import { useDocsRegistry } from './provider';
import { renderMarkdown } from './render-markdown';

export interface IDocSectionProps {
  /**
   * Section locator. Two forms supported:
   *   - `'<docSlug>#<sectionId>'` — addresses a specific section
   *   - `'<docSlug>'` — first H2 section of the doc (rare; prefer DocPage)
   */
  slug: string;
  /**
   * Audience filter applied to the section body. If set, audience-comment
   * blocks with non-overlapping audience are stripped. If omitted, no
   * filtering — full body rendered.
   */
  audience?: IAudience[];
  /**
   * Fallback rendered when the slug doesn't resolve (missing doc or section).
   * Default fallback emits a visible warning element (no-op safe in prod).
   */
  fallback?: JSX.Element;
  /** Optional class attribute for the wrapper element. */
  class?: string;
}

const defaultFallback = (slug: string) => (
  <div class="web-docs-missing" data-slug={slug}>
    {`[web-docs] section "${slug}" not found`}
  </div>
);

/**
 * Render a specific section of a doc, optionally filtered by audience.
 *
 * ```tsx
 * <DocSection slug="architecture/adr/048-docs-as-data#D4" audience={['dev']}/>
 * ```
 */
export const DocSection = (props: IDocSectionProps): JSX.Element => {
  const registry = useDocsRegistry();

  const resolved = createMemo(() => {
    const [docSlug, sectionId] = props.slug.split('#');
    if (!docSlug) return null;
    const doc = registry[docSlug];
    if (!doc) return null;
    const section = sectionId
      ? doc.sections[sectionId]
      : Object.values(doc.sections).find((s) => s.level === 2);
    return section ? { doc, section } : null;
  });

  const html = createMemo(() => {
    const r = resolved();
    if (!r) return '';
    const filtered = filterBodyByAudience(r.section.body, props.audience);
    return renderMarkdown(filtered);
  });

  return (
    <Show when={resolved()} fallback={props.fallback ?? defaultFallback(props.slug)}>
      {(r) => (
        <section class={props.class} data-slug={props.slug} data-heading={r().section.heading}>
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: docs source is controlled */}
          <div innerHTML={html()} />
        </section>
      )}
    </Show>
  );
};