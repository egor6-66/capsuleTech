import { marked } from 'marked';

/**
 * Render raw markdown → HTML string.
 *
 * Uses `marked` (~30 kB minified, zero deps). Markdown source in `docs/**`
 * is controlled — consumers `innerHTML` the result directly.
 *
 * `marked` is synchronous in our config (no async extensions); the cast
 * to `string` is safe.
 */
marked.setOptions({
  gfm: true,
  breaks: false,
});

export const renderMarkdown = (md: string): string => marked.parse(md) as string;
