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
import { PREVIEW_REGISTRY } from './previewRegistry';

export const PresetPreview = (props: { schema: ISchema }) => (
  <div class="pointer-events-none max-h-[220px] max-w-[280px] overflow-hidden p-1">
    <Renderer schema={props.schema} registry={PREVIEW_REGISTRY} mode="static" />
  </div>
);
