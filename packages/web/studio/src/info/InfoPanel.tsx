/**
 * InfoPanel — connected-обёртка над info-панелью.
 *
 * Читает `selected` через `useSelectedPreset()` (singleton), резолвит тип
 * корневой ноды пресета, тянет манифест и контракт из kit'а
 * (`@capsuletech/web-ui/manifest`). Пробрасывает в stateless `<Info>`.
 *
 * Презентация (3-аккордионный композер + блоки Contract/Manifest/Readme)
 * живёт в `./Info`.
 *
 * Регистрируется как `WebStudio.Info` через `../capsule` (ADR 033).
 */

import { getContract, getManifest } from '@capsuletech/web-ui/manifest';
import { createMemo, Show } from 'solid-js';
import { useSelectedPreset } from '../selection';
import { EmptyState } from './EmptyState';
import { Info } from './Info';

export const InfoPanel = () => {
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
