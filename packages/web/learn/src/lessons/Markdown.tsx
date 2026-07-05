/**
 * Markdown — internal-хелпер рендера markdown-тел концептов/правил (там
 * таблицы!). Переиспользует `renderMarkdown` из `@capsuletech/web-docs`
 * (та же механика, что `DocSection` инжектит README в studio Info) — не
 * тянем новый markdown-dep. Контент курируемый (lang-vault, ADR 069), поэтому
 * `innerHTML` безопасен — тот же контракт, что `web-docs`.
 *
 * Обёрнут в `Prose` (`@capsuletech/web-ui`) — типографика rendered-markdown
 * (заголовки/списки/таблицы/код) на design-tokens. Собственных стилей НЕ
 * добавляем: Tailwind preflight сбрасывает браузерные стили, без Prose
 * грамматические таблицы выглядели бы кашей.
 *
 * НЕ регистрируется — building-block `View`/`Concept`/`Rule`.
 */
import { renderMarkdown } from '@capsuletech/web-docs';
import { Prose } from '@capsuletech/web-ui/prose';

export interface IMarkdownProps {
  body: string;
  class?: string;
}

export const Markdown = (props: IMarkdownProps) => (
  <Prose class={props.class} innerHTML={renderMarkdown(props.body)} />
);

export default Markdown;
