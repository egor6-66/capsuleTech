import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const TypographyContract = defineContract({ name: 'Typography', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      // Семантический вариант (CVA `variant`). Управляет font-weight/tracking/border.
      // По умолчанию тег выбирается из variant (h1/h2/h3/p/blockquote/code; lead→p; muted→p).
      variant: z
        .enum(['h1', 'h2', 'h3', 'p', 'blockquote', 'code', 'lead', 'muted', 'overline'])
        .optional(),
      // Color override через CVA (старый канал). Поверх него ещё `tone` (см. ниже).
      color: z.enum(['default', 'muted', 'primary', 'destructive']).optional(),
      // Tone — override цвета через отдельный prop. Если задан — переопределяет
      // `color` CVA-variant. Введён, чтобы не лочить юзеров в CVA-color, когда
      // нужна семантика «muted text на primary heading'е».
      tone: z.enum(['default', 'muted', 'destructive', 'primary']).optional(),
      // Выравнивание текста — не пересекается с variant.
      align: z.enum(['start', 'center', 'end']).optional(),
      // Размер шрифта override — поверх variant'а. Полезно для «h2 weight + 5xl size».
      size: z.enum(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl']).optional(),
      // Font-weight override — поверх веса варианта. Выигрывает у variant'а
      // (h1 extrabold + weight="normal" → normal). Tailwind `font-{weight}`.
      weight: z
        .enum(['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold'])
        .optional(),
      // Monospace — `font-mono`, ортогонально variant/weight/size. Для inline
      // технических токенов без chrome варианта `code` (bg-muted/padding).
      mono: z.boolean().optional(),
      // Visual dim — opacity-0 при true, иначе opacity-100. Элемент остаётся в DOM,
      // высота сохраняется (полезно для fade-in без layout shift).
      dim: z.boolean().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'h1', props: { variant: 'h1' } },
    { name: 'h2', props: { variant: 'h2' } },
    { name: 'h3', props: { variant: 'h3' } },
    { name: 'p', props: { variant: 'p' } },
    { name: 'lead', props: { variant: 'lead' } },
    { name: 'muted', props: { variant: 'muted' } },
    { name: 'blockquote', props: { variant: 'blockquote' } },
    { name: 'code', props: { variant: 'code' } },
    { name: 'overline', props: { variant: 'overline' } },
    { name: 'centered', props: { variant: 'p', align: 'center' } },
    { name: 'tone-primary', props: { variant: 'h2', tone: 'primary' } },
    { name: 'tone-destructive', props: { variant: 'p', tone: 'destructive' } },
    { name: 'size-override', props: { variant: 'h2', size: '5xl' } },
    { name: 'weight-override', props: { variant: 'h1', weight: 'normal' } },
    { name: 'mono', props: { variant: 'p', mono: true } },
    { name: 'dimmed', props: { variant: 'p', dim: true } },
  ]),
]);
