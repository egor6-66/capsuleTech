import type { Component } from 'solid-js';
import { Show } from 'solid-js';

/**
 * FilePickerCard — responsive UI for the file-picker node.
 *
 * Narrow container (rail, ~60px) → just the icon (passed by the FilePicker widget).
 * Wide container (main) → full card: pick button + selected path / error.
 * Reads selected path / error from parent Feature context via useCtx().
 * The 'pick' button is handled by Features.FilePicker.onClick.
 */
const FilePickerCard = View((Ui, props: { icon?: Component<{ class?: string }> }) => {
  const ctx = useCtx();

  return (
    <div class="@container h-full w-full">
      {/* icon mode — narrow (rail) */}
      <div class="flex h-full items-center justify-center text-muted-foreground @min-[140px]:hidden">
        <Ui.Flow.Dynamic component={props.icon} class="size-6" />
      </div>
      {/* full mode — wide (main) */}
      <Ui.Card class="hidden h-full min-w-[240px] flex-col gap-2 p-cell @min-[140px]:flex">
        <Ui.Typography variant="h4">Файлы</Ui.Typography>
        <Ui.Button meta={{ tags: ['pick'] }}>Выбрать файл</Ui.Button>
        <Show when={ctx.store.ctx.path}>
          <Ui.Typography variant="muted" class="break-all">
            {ctx.store.ctx.path as string}
          </Ui.Typography>
        </Show>
        <Show when={ctx.store.ctx.error}>
          <Ui.Typography variant="muted" class="break-all text-destructive">
            {ctx.store.ctx.error as string}
          </Ui.Typography>
        </Show>
      </Ui.Card>
    </div>
  );
});

export default FilePickerCard;
