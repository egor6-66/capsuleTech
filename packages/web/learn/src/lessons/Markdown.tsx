/**
 * Markdown — internal-хелпер рендера markdown-тел концептов/правил (там
 * таблицы + callout'ы + wikilinks!). Переиспользует `renderMarkdown` из
 * `@capsuletech/web-docs` (та же механика, что `DocSection` инжектит README в
 * studio Info) — не тянем новый markdown-dep. Контент курируемый (lang-vault,
 * ADR 069), поэтому `innerHTML` безопасен — тот же контракт, что `web-docs`.
 *
 * Обёрнут в `Prose` (`@capsuletech/web-ui`) — типографика rendered-markdown
 * (заголовки/списки/таблицы/код/callout) на design-tokens. Собственных стилей
 * НЕ добавляем: Tailwind preflight сбрасывает браузерные стили, без Prose
 * грамматические таблицы выглядели бы кашей.
 *
 * `stripLeadingH1` — срезать ведущий `# …` (в концепте/правиле H1 == title,
 * который блок рендерит сам; иначе дубль заголовка).
 *
 * `onWikilink` — делегированный click-handler на контейнере: `web-docs` рендерит
 * `[[ref]]` как `<a class="wikilink" data-ref="ref">`; клик по такой ссылке →
 * `onWikilink(ref)` (блок сам решает, правило это или концепт). Без коллбэка —
 * голый `Prose` (тот же рендер, что был у `View`).
 *
 * НЕ регистрируется — building-block `View`/`Concept`/`Rule`.
 */
import { renderMarkdown } from '@capsuletech/web-docs';
import { Prose } from '@capsuletech/web-ui/prose';

export interface IMarkdownProps {
  body: string;
  class?: string;
  /** Срезать ведущий H1 (== title блока) перед рендером. */
  stripLeadingH1?: boolean;
  /** Клик по `[[wikilink]]` (по `data-ref` анкора). */
  onWikilink?: (ref: string) => void;
}

/** Убрать первый заголовок первого уровня (`# …`) в начале тела. */
const stripLeadingH1 = (body: string): string => body.replace(/^\s*#\s+.*(?:\r?\n|$)/, '');

export const Markdown = (props: IMarkdownProps) => {
  const html = () => renderMarkdown(props.stripLeadingH1 ? stripLeadingH1(props.body) : props.body);

  if (!props.onWikilink) return <Prose class={props.class} innerHTML={html()} />;

  const onClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement | null)?.closest?.('a.wikilink');
    const ref = anchor?.getAttribute('data-ref');
    if (ref) {
      e.preventDefault();
      props.onWikilink?.(ref);
    }
  };

  // Обёртка-контейнер ловит bubbling клика по анкору (делегирование) — сам
  // `Prose` рисуется через innerHTML, вешать листенеры на его потомков негде.
  // Листенер вешаем через ref (native addEventListener), а не JSX-`onClick`:
  // контейнер — не интерактивный контрол (клавиатурная активация идёт через
  // сами `<a>`-анкоры), поэтому a11y-хендлеры на нём не нужны и не уместны.
  const bind = (node: HTMLDivElement) => node.addEventListener('click', onClick);

  return (
    <div class={props.class} ref={bind}>
      <Prose innerHTML={html()} />
    </div>
  );
};

export default Markdown;
