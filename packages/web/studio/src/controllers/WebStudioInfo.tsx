/**
 * WebStudio.Info — controller-обёртка над info-панелью.
 *
 * Читает `selected` через `useSelectedPreset()` (singleton), резолвит тип
 * корневой ноды пресета, тянет манифест (`@capsuletech/web-ui/manifest`)
 * и контракт (`info/contract-registry`). Пропускает в `<Info>` как props.
 *
 * Презентация (3-аккордионный композер + блоки Contract/Manifest/Readme)
 * живёт в `../info/`.
 */

import { getManifest } from '@capsuletech/web-ui/manifest';
import { createMemo, Show } from 'solid-js';
import { EmptyState, getContract, Info } from '../info';
import { useSelectedPreset } from '../selection';

export const WebStudioInfo = () => {
  const { selected } = useSelectedPreset();

  const rootType = createMemo(() => {
    const p = selected();
    if (!p) return null;
    const rootId = p.schema.components.root;
    return p.schema.components.nodes[rootId]?.type ?? null;
  });

  return (
    <Show when={selected() && rootType()} fallback={<EmptyState />}>
      <Info
        preset={selected()!}
        type={rootType()!}
        manifest={getManifest(rootType()!)}
        contract={getContract(rootType()!)}
      />
    </Show>
  );
};
