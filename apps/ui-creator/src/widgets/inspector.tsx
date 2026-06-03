/**
 * Inspector — правая панель: инфо о выбранном узле (`store.selectedId`).
 *
 * Пока read-only: тип, label, id, число детей и список пропсов. Редактирование
 * пропсов (полноценный инспектор) — следующий шаг.
 */
import { getManifest } from '@capsuletech/web-ui-creator/manifests';
import { For, Show } from 'solid-js';
import { useEditor } from '../editor/store';

const Inspector = Widget(() => {
  const { tree, selectedId } = useEditor();
  const node = () => {
    const id = selectedId();
    return id ? (tree().nodes[id] ?? null) : null;
  };
  const manifest = () => {
    const n = node();
    return n ? getManifest(n.type) : undefined;
  };
  const props = () => {
    const n = node();
    return n ? Object.entries(n.props).filter(([k]) => !k.startsWith('data-')) : [];
  };

  return (
    <div class="flex h-full flex-col">
      <div class="shrink-0 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
        Инспектор
      </div>
      <Show
        when={node()}
        fallback={
          <div class="flex flex-1 items-center justify-center text-sm text-foreground/40">
            Выберите компонент
          </div>
        }
      >
        <div class="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
          <div class="mb-3 flex items-center gap-2">
            <span class="text-foreground/60">{manifest()?.icon()}</span>
            <span class="font-medium">{manifest()?.label ?? node()?.type}</span>
          </div>

          <dl class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <dt class="shrink-0 text-foreground/50">Тип</dt>
              <dd class="truncate font-mono text-xs">{node()?.type}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="shrink-0 text-foreground/50">ID</dt>
              <dd class="truncate font-mono text-xs">{node()?.id}</dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt class="shrink-0 text-foreground/50">Детей</dt>
              <dd>{node()?.children.length}</dd>
            </div>
          </dl>

          <Show when={props().length > 0}>
            <div class="mt-3 border-t pt-3">
              <div class="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground/40">
                Пропсы
              </div>
              <dl class="space-y-1">
                <For each={props()}>
                  {([k, v]) => (
                    <div class="flex items-center justify-between gap-2">
                      <dt class="shrink-0 text-foreground/50">{k}</dt>
                      <dd class="truncate font-mono text-xs">{String(v)}</dd>
                    </div>
                  )}
                </For>
              </dl>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
});

export default Inspector;
