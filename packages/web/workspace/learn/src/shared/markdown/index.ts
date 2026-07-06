/**
 * shared/markdown — атом рендера markdown (`renderMarkdown` → `Prose`,
 * strip-H1 + wikilink-делегирование). Готовый рендер, используется
 * повсеместно. Направление строгое: `modules/ → shared/`, НИКОГДА обратно.
 */
export { type IMarkdownProps, Markdown } from './Markdown';
