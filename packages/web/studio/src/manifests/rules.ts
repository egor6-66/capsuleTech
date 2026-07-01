/**
 * Studio-specific manifest rules — container-gate + accept-фильтрация пресетов
 * для мини-палитры узла дерева (creator-mode, вставка кликом; бриф §3).
 *
 * ⚠️ Не хардкод-список типов. Использует РЕАЛЬНЫЙ containment-сигнал манифеста
 * (`isLeaf` + `accepts`), уже присутствующий в `@capsuletech/web-ui/manifest`:
 *  - leaf-примитивы (Button/Input/Label/…) несут `isLeaf: true`;
 *  - контейнеры (Flex/Grid/Group/List) — без `isLeaf`, принимают любого ребёнка;
 *  - composition'ы (Card/Field) несут `accepts`-предикат (только свои parts).
 *
 * `canAcceptChild(parentType, childType)` инкапсулирует это правило. Так что
 * accept-policy, которую бриф §3 считал «отсутствующей метадатой», по факту
 * уже есть на уровне kit-манифестов — временный хардкод-предикат НЕ нужен.
 */

import {
  canAcceptChild,
  getAllManifests,
  getManifest,
  getPresets,
  type IPreset,
} from '@capsuletech/web-ui/manifest';

/**
 * Может ли узел данного типа держать детей (container-gate для мини-палитры).
 * `true` только для не-leaf зарегистрированных типов; неизвестный тип или leaf
 * → `false` (мини-палитра не показывается). Корневой `ui.Flex` → `true`.
 */
export const acceptsChildren = (type: string | undefined): boolean => {
  if (!type) return false;
  const m = getManifest(type);
  return m ? m.isLeaf !== true : false;
};

/** Дот-путь корневой ноды пресета — тип, который реально вставится в дерево. */
const presetRootType = (preset: IPreset): string =>
  preset.schema.components.nodes[preset.schema.components.root]?.type ?? '';

/**
 * Пресеты, которые узел `nodeType` может принять ребёнком — плоский список
 * across all зарегистрированных типов, отфильтрованный реальным accept-предикатом
 * манифеста (`canAcceptChild`). Напр. Flex принимает всё; Card — только Card-parts.
 */
export const presetsForNode = (nodeType: string): readonly IPreset[] => {
  const out: IPreset[] = [];
  for (const m of getAllManifests()) {
    for (const p of getPresets(m.type)) {
      if (canAcceptChild(nodeType, presetRootType(p))) out.push(p);
    }
  }
  return out;
};
