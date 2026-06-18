import type { IAudience, IDocEntry } from '@capsuletech/docs-builder';
import { createMemo, createResource, For, type JSX, Show, Suspense } from 'solid-js';
import { filterBodyByAudience } from './audience-filter';
import { useContextRegistry } from './provider';
import { renderMarkdown } from './render-markdown';
import { hasDocsSources, loadDoc } from './sources';

export interface IDocPageProps {
  slug: string;
  audience?: IAudience[];
  fallback?: JSX.Element;
  loading?: JSX.Element;
  class?: string;
}

const defaultFallback = (slug: string) => (
  <div class="web-docs-missing" data-slug={slug}>
    {`[web-docs] doc "${slug}" not found`}
  </div>
);

const renderSections = (doc: IDocEntry, audience: IAudience[] | undefined) =>
  Object.entries(doc.sections).map(([id, section]) => ({
    id,
    heading: section.heading,
    level: section.level,
    html: renderMarkdown(filterBodyByAudience(section.body, audience)),
  }));

/**
 * Render the full doc — title + all sections in registry order,
 * optionally filtered by audience. Sections inherit doc-level audience
 * unless overridden by their own audience-blocks.
 *
 * Sync if `<DocsProvider>` is active, async (lazy) otherwise.
 *
 * ```tsx
 * <DocPage slug="architecture/adr/048-docs-as-data" audience={['user']}/>
 * ```
 */
export const DocPage = (props: IDocPageProps): JSX.Element => {
  const ctxRegistry = useContextRegistry();

  if (ctxRegistry) {
    const doc = createMemo(() => ctxRegistry[props.slug] ?? null);
    const sections = createMemo(() => {
      const d = doc();
      return d ? renderSections(d, props.audience) : [];
    });

    return (
      <Show when={doc()} fallback={props.fallback ?? defaultFallback(props.slug)}>
        {(d) => (
          <article class={props.class} data-slug={props.slug}>
            <Show when={d().meta.title}>
              <h1>{d().meta.title}</h1>
            </Show>
            <For each={sections()}>
              {(s) => (
                <section data-section-id={s.id} data-heading={s.heading} data-level={s.level}>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: docs source is controlled */}
                  <div innerHTML={s.html} />
                </section>
              )}
            </For>
          </article>
        )}
      </Show>
    );
  }

  if (!hasDocsSources()) {
    return props.fallback ?? defaultFallback(props.slug);
  }

  const [resource] = createResource(
    () => props.slug,
    async (slug) => {
      const doc = await loadDoc(slug);
      if (!doc) return null;
      return { doc, sections: renderSections(doc, props.audience) };
    },
  );

  return (
    <Suspense fallback={props.loading ?? null}>
      <Show when={resource()} fallback={props.fallback ?? defaultFallback(props.slug)}>
        {(r) => (
          <article class={props.class} data-slug={props.slug}>
            <Show when={r().doc.meta.title}>
              <h1>{r().doc.meta.title}</h1>
            </Show>
            <For each={r().sections}>
              {(s) => (
                <section data-section-id={s.id} data-heading={s.heading} data-level={s.level}>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: docs source is controlled */}
                  <div innerHTML={s.html} />
                </section>
              )}
            </For>
          </article>
        )}
      </Show>
    </Suspense>
  );
};
