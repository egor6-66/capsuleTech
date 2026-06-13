import { createMemo, For, type JSX, Show } from 'solid-js';
import { filterBodyByAudience } from './audience-filter';
import { useDocsRegistry } from './provider';
import { renderMarkdown } from './render-markdown';
import type { Audience } from './types';

export interface IDocPageProps {
  slug: string;
  audience?: Audience[];
  fallback?: JSX.Element;
  class?: string;
}

const defaultFallback = (slug: string) => (
  <div class="studio-docs-missing" data-slug={slug}>
    {`[studio/docs] doc "${slug}" not found`}
  </div>
);

/**
 * Render the full doc — title + all sections in registry order,
 * optionally filtered by audience. Sections inherit doc-level audience
 * unless overridden by their own audience-blocks.
 *
 * ```tsx
 * <DocPage slug="architecture/adr/048-docs-as-data" audience={['user']}/>
 * ```
 */
export const DocPage = (props: IDocPageProps): JSX.Element => {
  const registry = useDocsRegistry();

  const doc = createMemo(() => registry[props.slug] ?? null);

  const sections = createMemo(() => {
    const d = doc();
    if (!d) return [];
    return Object.entries(d.sections).map(([id, section]) => {
      const filtered = filterBodyByAudience(section.body, props.audience);
      return { id, heading: section.heading, level: section.level, html: renderMarkdown(filtered) };
    });
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
};
