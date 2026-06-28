export type { AccessResolver } from '../engine/access-resolver';
/**
 * registerAccessResolver — инъекция глобального capability-резолвера.
 * Намеренно экспортируется из engine (исключение из правила «engine/* не public»):
 * единственный способ дать web-access возможность подключить gate-ось
 * без создания цикла web-core → web-access → web-core.
 * Приложения или пакет web-access вызывают registerAccessResolver(fn) при инициализации.
 */
export {
  hasAccessResolver,
  registerAccessResolver,
  resolveAccess,
} from '../engine/access-resolver';
export { createUseCtx, useCtx } from '../engine/ctx';
/**
 * useEmit — программный канал HCA-событий (ADR 032, фаза 1).
 * Намеренно экспортируется из engine (нарушение правила «engine/* не public»):
 * единственный способ дать внешним пакетам (web-dnd, web-renderer, etc.)
 * доступ к dispatch-механизму без дублирования engine-логики. См. use-emit.ts.
 */
export { useEmit, useEmitOptional } from '../engine/use-emit';
export { ControllerWrapper as Controller } from './controller';
export { Entity } from './entity';
export { FeatureWrapper as Feature } from './feature';
export { PageWrapper as Page } from './page';
export { Shape, ShapeUiContext, useShapeUi } from './shape';
export { ViewWrapper as View } from './view';
export { WidgetWrapper as Widget } from './widget';
