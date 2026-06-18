import { marked, type Tokens } from 'marked';

/**
 * Render raw markdown → HTML string.
 *
 * Uses `marked` (~30 kB minified, zero deps). Markdown source in `docs/**`
 * is controlled — consumers `innerHTML` the result directly.
 *
 * `marked` is synchronous in our config (no async extensions); the cast
 * to `string` is safe.
 *
 * Wikilink rewrite: `[[slug]]` and `[[slug|alias]]` → `<a href="#<slug>"
 * data-wikilink="<slug>">alias-or-slug</a>`. Consumers can intercept the
 * click via delegated handler on `[data-wikilink]` to navigate via their
 * own router instead of the default anchor jump.
 */
marked.setOptions({
  gfm: true,
  breaks: false,
});

const escapeHtml = (s: string): string =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

marked.use({
  extensions: [
    {
      name: 'wikilink',
      level: 'inline',
      start(src: string) {
        return src.indexOf('[[');
      },
      tokenizer(src: string) {
        const match = /^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/.exec(src);
        if (!match) return undefined;
        const [raw, slug, alias] = match;
        return {
          type: 'wikilink',
          raw,
          slug: slug.trim(),
          alias: alias?.trim() ?? slug.trim(),
        };
      },
      renderer(token: Tokens.Generic) {
        const slug = escapeHtml(token.slug as string);
        const alias = escapeHtml(token.alias as string);
        return `<a href="#${slug}" data-wikilink="${slug}">${alias}</a>`;
      },
    },
  ],
});

export const renderMarkdown = (md: string): string => marked.parse(md) as string;
