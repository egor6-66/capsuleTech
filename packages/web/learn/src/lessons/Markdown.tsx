/**
 * Markdown — internal-хелпер рендера markdown-тел концептов/правил (там
 * таблицы!). Переиспользует `renderMarkdown` из `@capsuletech/web-docs`
 * (та же механика, что `DocSection` инжектит README в studio Info) — не
 * тянем новый markdown-dep. Контент курируемый (lang-vault, ADR 069), поэтому
 * `innerHTML` безопасен — тот же контракт, что `web-docs`.
 *
 * НЕ регистрируется — building-block `View`.
 */
import { renderMarkdown } from '@capsuletech/web-docs';

export interface IMarkdownProps {
  body: string;
  class?: string;
}

export const Markdown = (props: IMarkdownProps) => (
  <div class={props.class} innerHTML={renderMarkdown(props.body)} />
);

export default Markdown;
