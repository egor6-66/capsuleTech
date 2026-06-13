import { marked } from 'marked';

/**
 * Render raw markdown → HTML string.
 *
 * Uses `marked` (~30 kB minified, zero deps). Per E4 CP decision Q3:
 * markdown source in `docs/**` is controlled, so XSS is not a vector;
 * consumers `innerHTML` the result directly.
 *
 * `marked` is synchronous in our config (no async extensions); the cast
 * to `string` is safe.
 *
 * Customization (post-launch):
 *   - syntax-highlighting via marked extensions
 *   - wikilink → `<a href="#slug">` rewrite (currently rendered as raw `[[name]]`)
 */
marked.setOptions({
  // We control the source — Solid renders via innerHTML, so HTML output is
  // the target. `breaks: false` keeps standard markdown semantics (one
  // newline = no <br>; two = paragraph break).
  gfm: true,
  breaks: false,
});

export const renderMarkdown = (md: string): string => marked.parse(md) as string;
