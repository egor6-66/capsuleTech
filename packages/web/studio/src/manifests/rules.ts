/**
 * Studio-specific manifest rules — container-gate + accept-фильтрация компонентов
 * для узловой мини-палитры дерева (creator-mode, вставка кликом; бриф §3, §5).
 *
 * ⚠️ Не хардкод-список типов. Использует РЕАЛЬНЫЙ containment-сигнал манифеста
 * (`isLeaf` + `accepts`), уже присутствующий в `@capsuletech/web-ui/manifest`:
 *  - leaf-примитивы (Button/Input/Label/…) несут `isLeaf: true`;
 *  - контейнеры (Flex/Grid/Group/List) — без `isLeaf`, принимают любого ребёнка;
 *  - composition'ы (Card/Field) несут `accepts`-предикат (только свои parts).
 *
 * `canAcceptChild(parentType, childType)` инкапсулирует это правило. Accept-policy,
 * которую бриф считал «отсутствующей метадатой», по факту уже есть на уровне
 * kit-манифестов — временный хардкод-предикат НЕ нужен.
 */

import {
  canAcceptChild,
  getAllManifests,
  getManifest,
  hasPresets,
  type IPrimitiveManifestEntry,
} from '@capsuletech/web-ui/manifest';

/**
 * Может ли узел данного типа держать детей (container-gate для мини-палитры).
 * `true` только для не-leaf зарегистрированных типов; неизвестный тип или leaf
 * → `false` (мини-палитра не показывается). Корневой `ui.Layout.Flex` → `true`.
 */
export const acceptsChildren = (type: string | undefined): boolean => {
  if (!type) return false;
  const m = getManifest(type);
  return m ? m.isLeaf !== true : false;
};

/**
 * Манифесты компонентов, которые узел `nodeType` может принять ребёнком —
 * источник для узловой мини-палитры (тот же `ComponentSegments`, что и store).
 *
 * Acceptance на уровне КОМПОНЕНТА (не отдельного пресета): «принят компонент →
 * все его пресеты валидны» — ровно как в store-палитре, где вкладка = компонент
 * с пресетами. Только с пресетами (`hasPresets`) — компоненты без вариаций в
 * мини-палитре не показываем.
 */
export const manifestsForNode = (nodeType: string): readonly IPrimitiveManifestEntry[] =>
  getAllManifests().filter((m) => hasPresets(m.type) && canAcceptChild(nodeType, m.type));
