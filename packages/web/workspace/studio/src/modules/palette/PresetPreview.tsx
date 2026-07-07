/**
 * PresetPreview — живой рендер схемы пресета для ховер-тултипа палитры.
 *
 * `<Renderer mode="static">` рисует `preset.schema` по локальному
 * `PREVIEW_REGISTRY` (web-ui компоненты). Static — только компоненты, без
 * interactions/контроллеров: чистая картинка «что это за компонент».
 *
 * `pointer-events-none` — превью не перехватывает наведение (тултип и так живёт
 * пока курсор на триггере). Ограничение размеров + overflow — крупный пресет
 * (Card, Flex-варианты) не разносит панель тултипа.
 */

import type { ISchema } from '@capsuletech/web-renderer';
import { Renderer } from '@capsuletech/web-renderer';
import { Flex } from '@capsuletech/web-ui/flex';
import { PREVIEW_REGISTRY } from './previewRegistry';

export const PresetPreview = (props: { schema: ISchema }) => (
  // `pointer-events-none` — превью не перехватывает наведение (grep-safe).
  // max-h/max-w — arbitrary px clamp через inline-style (не class), kit spacing-
  // шкала тут не подходит (220/280px вне scale).
  <Flex
    p={1}
    overflow="hidden"
    class="pointer-events-none"
    style={{ 'max-height': '220px', 'max-width': '280px' }}
  >
    <Renderer schema={props.schema} registry={PREVIEW_REGISTRY} mode="static" />
  </Flex>
);
