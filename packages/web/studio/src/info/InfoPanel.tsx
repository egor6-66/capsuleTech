/**
 * InfoPanel — connected-обёртка над info-панелью ВЫБРАННОГО УЗЛА.
 *
 * Читает `selectedNode()` из единого document-стора, резолвит его тип, тянет
 * манифест и контракт из kit'а (`@capsuletech/web-ui/manifest`). Работает
 * идентично в store-mode и creator-mode (бриф §2) — «один флоу» по
 * `selectedNode()`.
 *
 * `<Info>` требует `IPreset` (для описания + label в Manifest-блоке). Источник:
 *  - store-mode: document загружен из одного пресета и выбран его root →
 *    отдаём РЕАЛЬНЫЙ пресет (сохраняем описание вариации, без регрессии);
 *  - иначе (creator-узел / не-root): синтез preset-обёртки из узла — `Info` и
 *    блоки остаются stateless и нетронутыми (бриф §2).
 *
 * Регистрируется как `WebStudio.Info` через `../capsule` (ADR 033).
 */

import type { IEditorNode } from '@capsuletech/web-renderer';
import { getContract, getManifest, getPresets, type IPreset } from '@capsuletech/web-ui/manifest';
import { Show } from 'solid-js';
import { useDocument } from '../document';
import { useStudioMode } from '../navigation/useStudioMode';
import { EmptyState } from './EmptyState';
import { Info } from './Info';

/** Синтез preset-обёртки из узла — мини-схема с одним узлом-корнем. */
const nodeAsPreset = (node: IEditorNode): IPreset => ({
  id: node.id,
  label: getManifest(node.type)?.label ?? node.type,
  schema: { components: { root: node.id, nodes: { [node.id]: node } } },
});

export const InfoPanel = () => {
  // Активный режим (URL) — info рисует слайс текущего режима.
  const doc = useDocument(useStudioMode());

  const node = () => doc.selectedNode();
  const type = () => node()?.type ?? null;

  const preset = (): IPreset | null => {
    const n = node();
    if (!n) return null;
    const loadedId = doc.loadedPresetId();
    // store-mode: document = один пресет, выбран его root → реальный пресет.
    if (loadedId && doc.selectedNodeId() === doc.schema().components.root) {
      return getPresets(n.type).find((p) => p.id === loadedId) ?? nodeAsPreset(n);
    }
    return nodeAsPreset(n);
  };

  return (
    <Show when={node() && type()} fallback={<EmptyState />}>
      <Info
        preset={preset()!}
        type={type()!}
        manifest={getManifest(type()!)}
        contract={getContract(type()!)}
      />
    </Show>
  );
};
