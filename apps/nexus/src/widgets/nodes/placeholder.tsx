import type { Component } from 'solid-js';

/**
 * Placeholder — responsive node widget for the dashboard catalog.
 *
 * Narrow container (rightbar rail, ~60px) → just the lucide icon.
 * Wide container (main) → full card with icon + title.
 * Toggle is pure CSS container-query (`@container` + `@min-[140px]:`), so the
 * SAME cell renders compact in the rail and full once dragged into main.
 *
 * Widget factory args are (Ui, store, props) — store (2nd) unused here; the
 * external props (title, icon) are the 3rd arg.
 */
const Placeholder = Widget(
  (Ui, _store, props: { title?: string; icon?: Component<{ class?: string }> }) => (
    <div class="@container h-full w-full">
      {/* icon mode — narrow (rail) */}
      <div class="flex h-full items-center justify-center text-muted-foreground @min-[140px]:hidden">
        <Ui.Flow.Dynamic component={props.icon} class="size-6" />
      </div>
      {/* full mode — wide (main) */}
      <Ui.Card class="hidden h-full min-w-[240px] flex-col items-center justify-center gap-2 p-cell @min-[140px]:flex">
        <Ui.Flow.Dynamic component={props.icon} class="size-8 text-muted-foreground" />
        <Ui.Typography variant="h4">{props.title}</Ui.Typography>
        <Ui.Typography variant="muted">узел-заглушка</Ui.Typography>
      </Ui.Card>
    </div>
  ),
);

export default Placeholder;
