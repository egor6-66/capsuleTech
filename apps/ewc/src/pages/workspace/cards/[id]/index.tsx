/**
 * Card-by-id (`/workspace/cards/$id`) — детальная карточка происшествия.
 *
 * Рендерится в `<Outlet/>` родительского cards-layout (main-слот).
 *
 * Форма описана как ДАННЫЕ (`incidentCardSchema`, ISchema) и рисуется
 * `@capsuletech/web-renderer`'ом. Registry собирается из проксированного `Ui`
 * (`{ ui: Ui }`) — рендерер резолвит dot-path'ы (`ui.Field.Label`, `ui.Input`…)
 * прямо по нему. Режим `static` — пока read-only показ дефолта; редактирование
 * через `@capsuletech/web-ui-creator` и реальные данные (id из Feature) — позже.
 */
import type { Registry } from '@capsuletech/web-renderer';
import { Renderer } from '@capsuletech/web-renderer';

import { incidentCardSchema } from '../../../../rendererSchemes/incidentCard';

const Card = Page((Ui) => {
  const registry = { ui: Ui } as unknown as Registry;

  return (
    <div class="h-full overflow-y-auto p-4">
      <Renderer schema={incidentCardSchema} registry={registry} mode="static" />
    </div>
  );
});

export default Card;
