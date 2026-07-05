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
 * Two Obsidian constructs are lifted into semantic HTML. The renderer emits
 * only structure (classes / `data-*`); presentation is Prose (web-ui) and
 * click behaviour is the consumer (web-learn / studio Info):
 *
 * - **Callouts** — a blockquote whose first line is `[!type] Title` →
 *   `<div class="callout callout-<type>"><p class="callout-title">Title</p>…body…</div>`.
 *   `type ∈ info|tip|warning|note`; unknown → `note`. Title is the remainder
 *   of the first line (may be empty). The body is nested markdown, rendered
 *   as usual.
 * - **Wikilinks** — `[[id]]` and `[[id|label]]` →
 *   `<a class="wikilink" data-ref="id">label-or-id</a>` (no `href` — path
 *   resolution is not the renderer's zone; the consumer wires the click via
 *   a delegated handler on `[data-ref]`).
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

const KNOWN_CALLOUTS = new Set(['info', 'tip', 'warning', 'note']);

marked.use({
  extensions: [
    {
      name: 'callout',
      level: 'block',
      start(src: string) {
        const m = /(?:^|\n) {0,3}> ?\[!/.exec(src);
        return m ? m.index : undefined;
      },
      tokenizer(src: string) {
        // First line must be a callout header: `> [!type] Title`.
        const header = /^ {0,3}> ?\[!(\w+)\]([^\n]*)(?:\n|$)/.exec(src);
        if (!header) return undefined;
        // Consume the full run of consecutive blockquote lines.
        const block = /^(?: {0,3}>[^\n]*(?:\n|$))+/.exec(src);
        if (!block) return undefined;
        const raw = block[0];

        const type = header[1].toLowerCase();
        const title = header[2].trim();
        // Strip blockquote markers from every line, drop the header line,
        // keep the rest as the callout body (nested markdown).
        const bodyText = raw
          .replace(/\n$/, '')
          .split('\n')
          .slice(1)
          .map((line) => line.replace(/^ {0,3}> ?/, ''))
          .join('\n');

        return {
          type: 'callout',
          raw,
          calloutType: KNOWN_CALLOUTS.has(type) ? type : 'note',
          title,
          tokens: this.lexer.blockTokens(bodyText, []),
        };
      },
      renderer(token: Tokens.Generic) {
        const type = token.calloutType as string;
        const title = escapeHtml(token.title as string);
        const body = this.parser.parse(token.tokens ?? []);
        return `<div class="callout callout-${type}"><p class="callout-title">${title}</p>${body}</div>`;
      },
    },
    {
      name: 'wikilink',
      level: 'inline',
      start(src: string) {
        const i = src.indexOf('[[');
        return i === -1 ? undefined : i;
      },
      tokenizer(src: string) {
        const match = /^\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/.exec(src);
        if (!match) return undefined;
        const [raw, ref, label] = match;
        return {
          type: 'wikilink',
          raw,
          ref: ref.trim(),
          label: label?.trim() ?? ref.trim(),
        };
      },
      renderer(token: Tokens.Generic) {
        const ref = escapeHtml(token.ref as string);
        const label = escapeHtml(token.label as string);
        return `<a class="wikilink" data-ref="${ref}">${label}</a>`;
      },
    },
  ],
});

export const renderMarkdown = (md: string): string => marked.parse(md) as string;
