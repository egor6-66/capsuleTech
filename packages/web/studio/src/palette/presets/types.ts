/**
 * Preset — именованный вариант компонента kit'а: JSON-схема для Renderer'а
 * (`@capsuletech/web-renderer`). Schema-based, не JSX — потому что канвас
 * рендерит пресеты через `<Renderer schema={...} registry={...} mode="static" />`.
 *
 * Сейчас структура минимальная (id + label + schema). По мере роста добавим
 * описания, теги, пропы для интеграции с inspector'ом и DnD.
 */

import type { ISchema } from '@capsuletech/web-renderer';

export interface IPreset {
  /** Стабильный id внутри компонента. Используется как key и для DnD payload позже. */
  id: string;
  /** Человекочитаемое имя для палитры (RU). */
  label: string;
  /** JSON-схема для Renderer'а — что показывать в канвасе. */
  schema: ISchema;
  /**
   * Описание для info-панели (3-аккордионный модуль студио):
   * зачем эта вариация, когда применять, чем отличается от соседних
   * пресетов того же компонента. Заполняется вручную при создании
   * пресета — авто-генерация даст мусор («Button с variant=ghost»),
   * смысловую нагрузку угадать нельзя.
   */
  description?: string;
}
