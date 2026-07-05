import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const ProseContract = defineContract({ name: 'Prose', kind: 'primitive' }, [
  // Контент — rendered-markdown html или text/JSX; для DnD-дерева это leaf
  // (детей-нод не композим, содержимое — строка/разметка).
  rule.isLeaf(),
  rule.props(
    z.object({
      // Плотность типографики. md — документ, sm — компакт для панелей/Info.
      size: z.enum(['sm', 'md']).optional(),
      // Rendered-markdown HTML (курируемый источник). Инжектится как innerHTML.
      innerHTML: z.string().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    {
      name: 'document',
      props: {
        size: 'md',
        innerHTML:
          '<h2>Present Simple</h2><p>Употребляется для регулярных действий.</p><table><thead><tr><th>Лицо</th><th>Форма</th></tr></thead><tbody><tr><td>I / you / we / they</td><td>work</td></tr><tr><td>he / she / it</td><td>work<strong>s</strong></td></tr></tbody></table>',
      },
    },
    {
      name: 'compact-panel',
      props: {
        size: 'sm',
        innerHTML: '<h3>README</h3><p>Короткая справка в боковой панели.</p>',
      },
    },
  ]),
]);
