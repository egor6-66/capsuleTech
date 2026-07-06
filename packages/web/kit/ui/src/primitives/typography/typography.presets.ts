/**
 * Typography presets — именованные варианты Typography-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Покрываем основные семантические варианты (h1/h2/p/lead/muted/blockquote/code)
 * + один override-пример (центрированный заголовок). Tone/size/dim — реже нужны
 * как «отправная точка», их можно настроить в Inspector'е через contract-fields.
 */

import type { IPreset } from '../../manifest/types';

const singleText = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'txt',
    nodes: {
      txt: { id: 'txt', type: 'ui.Typography', parentId: null, children: [], props },
    },
  },
});

export const typographyPresets: readonly IPreset[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    schema: singleText({ variant: 'h1', children: 'Heading 1' }),
    description:
      'Заголовок верхнего уровня страницы. Один на маршрут (SEO + a11y outline). Тег рендерится как `<h1>`.',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    schema: singleText({ variant: 'h2', children: 'Heading 2' }),
    description: 'Заголовок секции. Имеет нижний border-b для визуального разделения. Тег `<h2>`.',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    schema: singleText({ variant: 'h3', children: 'Heading 3' }),
    description: 'Подзаголовок внутри секции. Меньше `h2`, без border-b. Тег `<h3>`.',
  },
  {
    id: 'p',
    label: 'Paragraph',
    schema: singleText({
      variant: 'p',
      children: 'Обычный абзац с базовым размером и нормальным line-height.',
    }),
    description: 'Базовый параграф. Дефолт для тела текста, описаний, инструкций. Тег `<p>`.',
  },
  {
    id: 'lead',
    label: 'Lead',
    schema: singleText({
      variant: 'lead',
      children: 'Лид-параграф — крупнее обычного, для вступления раздела.',
    }),
    description:
      'Вступительный абзац (intro) — крупнее `p`, цвет muted-foreground. Используй один раз в начале раздела/страницы.',
  },
  {
    id: 'muted',
    label: 'Muted',
    schema: singleText({
      variant: 'muted',
      children: 'Вторичный текст — подписи, метаданные, пояснения.',
    }),
    description:
      'Приглушённый текст для подписей под полями, метаданных, hint-текста. Меньше базы, цвет muted-foreground.',
  },
  {
    id: 'blockquote',
    label: 'Blockquote',
    schema: singleText({ variant: 'blockquote', children: 'Цитата с левой границей и курсивом.' }),
    description:
      'Цитата — левый border-l + italic. Для выделенного авторского текста, отзывов, врезок.',
  },
  {
    id: 'code',
    label: 'Inline code',
    schema: singleText({ variant: 'code', children: 'const x = 42' }),
    description:
      "Inline-код в потоке текста — фон muted, моноширинный шрифт. Для имён переменных, путей, коротких snippet'ов.",
  },
  {
    id: 'overline',
    label: 'Overline',
    schema: singleText({ variant: 'overline', children: 'Section label' }),
    description:
      'Надзаголовок (eyebrow/kicker) — мелкий uppercase с трекингом, muted. Ставится над заголовком секции как метка-категория. Тег `<p>`.',
  },
  {
    id: 'centered-heading',
    label: 'Centered heading',
    schema: singleText({ variant: 'h2', align: 'center', children: 'Centered Heading' }),
    description: 'Heading 2 с центрированием — для hero-секций, modal-заголовков, лендинг-блоков.',
  },
];
