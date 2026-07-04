import { cva } from '@capsuletech/web-style';

/**
 * Prose — типографика для rendered-markdown (заголовки, списки, таблицы, код).
 *
 * Стилизует ВЛОЖЕННЫЙ html/children через descendant-селекторы (`[&_h2]:…`
 * паттерн kit'а), не сам корневой элемент. Всё на существующих design-tokens
 * (Token set FROZEN) → тёмная тема работает автоматически через CSS-переменные.
 *
 * ⚠️ Разделение base ↔ size:
 *   - `base` — **size-инвариантные** правила: цвета, границы, веса, list-маркеры,
 *     структура таблиц, паддинги ячеек. НИКАКИХ `text-<size>` и вертикальных
 *     margin'ов здесь быть не должно.
 *   - `size` — **всё, что различается**: font-size заголовков/тела/таблиц +
 *     вертикальный ритм (margin между блоками).
 *
 * Почему так: CVA-варианты имеют равную specificity с base. Если один и тот же
 * arbitrary-селектор (`[&_h1]:text-*`) появится и в base, и в size — на элементе
 * окажутся оба класса, и применённое правило будет зависеть от порядка в
 * сгенерированном CSS (недетерминированно). Так как за раз активен ровно ОДИН
 * size-вариант, размещение всех размеров/margin'ов в size-ветках исключает
 * коллизию: на элемент попадает только одна версия каждого селектора.
 */
export const variants = {
  size: {
    // md — документ-режим: полноразмерные заголовки, просторный ритм.
    md: [
      'text-base',
      // headings
      '[&_h1]:text-3xl [&_h1]:mt-8 [&_h1]:mb-4',
      '[&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-3',
      '[&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2',
      '[&_h4]:text-base [&_h4]:mt-4 [&_h4]:mb-2',
      // block rhythm
      '[&_p]:my-4',
      '[&_ul]:my-4 [&_ol]:my-4',
      '[&_blockquote]:my-4',
      '[&_pre]:my-4 [&_pre]:text-sm',
      '[&_hr]:my-8',
      // tables
      '[&_table]:my-4 [&_table]:text-sm',
    ],
    // sm — компакт для панелей/Info: сжатые заголовки и ритм, размер тела 14px.
    sm: [
      'text-sm',
      // headings
      '[&_h1]:text-xl [&_h1]:mt-5 [&_h1]:mb-2',
      '[&_h2]:text-lg [&_h2]:mt-5 [&_h2]:mb-2',
      '[&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-1.5',
      '[&_h4]:text-sm [&_h4]:mt-3 [&_h4]:mb-1',
      // block rhythm
      '[&_p]:my-2.5',
      '[&_ul]:my-2.5 [&_ol]:my-2.5',
      '[&_blockquote]:my-2.5',
      '[&_pre]:my-2.5 [&_pre]:text-xs',
      '[&_hr]:my-5',
      // tables
      '[&_table]:my-2.5 [&_table]:text-xs',
    ],
  },
};

export const proseCva = cva(
  [
    // root
    'text-foreground',
    '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
    // headings — вес/трекинг/цвет (размеры — в size-варианте)
    '[&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-foreground',
    '[&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2',
    '[&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-foreground',
    '[&_h4]:font-semibold [&_h4]:text-foreground',
    // paragraphs / inline
    '[&_p]:leading-normal',
    '[&_strong]:font-semibold [&_strong]:text-foreground',
    '[&_em]:italic',
    '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:opacity-80',
    // lists
    '[&_ul]:list-disc [&_ul]:pl-6',
    '[&_ol]:list-decimal [&_ol]:pl-6',
    '[&_li]:my-1 [&_li]:marker:text-muted-foreground',
    '[&_ul_ul]:my-1 [&_ol_ol]:my-1 [&_ul_ol]:my-1 [&_ol_ul]:my-1',
    // blockquote
    '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
    // inline code
    '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]',
    // code block (reset inline-code styling inside <pre>)
    '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-4',
    '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[0.95em] [&_pre_code]:font-mono',
    // horizontal rule
    '[&_hr]:border-t [&_hr]:border-border',
    // images
    '[&_img]:max-w-full [&_img]:rounded-lg',
    // ── tables (главный кейс — грамматические таблицы) ──────────────────
    '[&_table]:w-full [&_table]:border-collapse',
    '[&_thead]:border-b [&_thead]:border-border',
    '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold',
    '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
    // зебра поверх линий-сетки — читается как документ
    '[&_tbody_tr:nth-child(even)]:bg-muted/40',
  ],
  {
    variants,
    defaultVariants: {
      size: 'md',
    },
  },
);
