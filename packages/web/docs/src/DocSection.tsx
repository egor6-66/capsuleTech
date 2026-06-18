import type { IAudience, IDocSection } from '@capsuletech/docs-builder';
import { createMemo, createResource, type JSX, Show, Suspense } from 'solid-js';
import { filterBodyByAudience } from './audience-filter';
import { useContextRegistry } from './provider';
import { renderMarkdown } from './render-markdown';
import { hasDocsSources, loadDoc } from './sources';

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
  /** Optional loading state for the async/lazy path. */
  loading?: JSX.Element;
  /** Optional class attribute for the wrapper element. */
  class?: string;
}

const defaultFallback = (slug: string) => (
  <div class="web-docs-missing" data-slug={slug}>
    {`[web-docs] section "${slug}" not found`}
  </div>
);

const resolveSection = (
  doc: { sections: Record<string, IDocSection> } | null,
  sectionId: string | undefined,
): IDocSection | null => {
  if (!doc) return null;
  if (sectionId) return doc.sections[sectionId] ?? null;
  return Object.values(doc.sections).find((s) => s.level === 2) ?? null;
};

/**
 * Render a specific section of a doc, optionally filtered by audience.
 *
 * Two render paths:
 *   - Synchronous: a `<DocsProvider registry>` is active → context lookup.
 *   - Asynchronous: no provider, sources singleton is populated by the
 *     auto-generated registry → lazy `import()` per slug-prefix.
 *
 * ```tsx
 * <DocSection slug="architecture/adr/048-docs-as-data#D4" audience={['dev']}/>
 * ```
 */
export const DocSection = (props: IDocSectionProps): JSX.Element => {
  const ctxRegistry = useContextRegistry();

  // Sync path — provider with explicit registry (legacy / fixture mode).
  if (ctxRegistry) {
    const resolved = createMemo(() => {
      const [docSlug, sectionId] = props.slug.split('#');
      if (!docSlug) return null;
      const doc = ctxRegistry[docSlug];
      if (!doc) return null;
      const section = resolveSection(doc, sectionId);
      return section ? { section } : null;
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
  }

  // Async path — sources singleton populated by capsule-registry.
  if (!hasDocsSources()) {
    return props.fallback ?? defaultFallback(props.slug);
  }

  const [resource] = createResource(
    () => props.slug,
    async (slug) => {
      const [docSlug, sectionId] = slug.split('#');
      const doc = await loadDoc(docSlug);
      const section = resolveSection(doc, sectionId);
      if (!section) return null;
      const filtered = filterBodyByAudience(section.body, props.audience);
      return { section, html: renderMarkdown(filtered) };
    },
  );

  return (
    <Suspense fallback={props.loading ?? null}>
      <Show when={resource()} fallback={props.fallback ?? defaultFallback(props.slug)}>
        {(r) => (
          <section class={props.class} data-slug={props.slug} data-heading={r().section.heading}>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: docs source is controlled */}
            <div innerHTML={r().html} />
          </section>
        )}
      </Show>
    </Suspense>
  );
};
