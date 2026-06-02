import type { Component } from 'solid-js';

/**
 * NodeBody — per-type dispatcher for a canvas node's content. Keeps the
 * `Canvas` widget (web-flow zone) generic: it renders `<Widgets.NodeBody>` and
 * this maps `type` → the right body.
 *   - 'monitor' → `Widgets.SystemMonitor` (live host-metrics).
 *   - anything else → generic `Views.NodeCard` (icon + label) — unchanged default.
 */
const NodeBody = Widget(
  (Ui, _store, props: { type?: string; label?: string; icon?: Component<{ class?: string }> }) => (
    <Ui.Flow.Switch fallback={<Views.NodeCard label={props.label} icon={props.icon} />}>
      <Ui.Flow.Match when={props.type === 'monitor'}>
        <Widgets.SystemMonitor />
      </Ui.Flow.Match>
    </Ui.Flow.Switch>
  ),
);

export default NodeBody;
