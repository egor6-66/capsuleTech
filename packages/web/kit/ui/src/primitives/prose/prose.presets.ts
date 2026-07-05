/**
 * Prose presets — именованные варианты для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * innerHTML в пресетах — заранее отрендеренный markdown (палитра не гоняет
 * renderMarkdown). Главный кейс — таблица (грамматика), поэтому document-preset
 * несёт таблицу.
 */

import type { IPreset } from '../../manifest/types';

const singleProse = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'prose',
    nodes: {
      prose: { id: 'prose', type: 'ui.Prose', parentId: null, children: [], props },
    },
  },
});

const DOC_HTML =
  '<h2>Present Simple</h2>' +
  '<p>Употребляется для регулярных действий и общих истин.</p>' +
  '<table><thead><tr><th>Лицо</th><th>Форма</th></tr></thead>' +
  '<tbody>' +
  '<tr><td>I / you / we / they</td><td>work</td></tr>' +
  '<tr><td>he / she / it</td><td>work<strong>s</strong></td></tr>' +
  '</tbody></table>' +
  '<blockquote>Окончание <code>-s</code> добавляется только в 3-м лице ед. числа.</blockquote>';

export const prosePresets: readonly IPreset[] = [
  {
    id: 'document',
    label: 'Document',
    schema: singleProse({ size: 'md', innerHTML: DOC_HTML }),
    description:
      'Полноразмерная проза с грамматической таблицей — заголовки, абзацы, таблица с линиями/зеброй, цитата. Главный кейс: концепты/правила из learn.',
  },
  {
    id: 'compact-panel',
    label: 'Compact panel',
    schema: singleProse({
      size: 'sm',
      innerHTML:
        '<h3>README</h3><p>Короткая справка для боковой панели / studio Info.</p><ul><li>Компактный ритм</li><li>Тело 14px</li></ul>',
    }),
    description:
      'Компакт-режим (size="sm") — сжатые заголовки и вертикальный ритм для узких панелей и info-блоков.',
  },
];
