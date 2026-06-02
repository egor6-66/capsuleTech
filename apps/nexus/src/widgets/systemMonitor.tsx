import { Activity } from 'lucide-solid';

/**
 * SystemMonitor — host-monitor node body (ADR 023 + 028). Composes the
 * `SystemMonitor` Feature (rolling metrics buffer + start/stop monitoring) with
 * the `SystemMonitorCard` View (gauges / sparklines / bars / stat-cards). Drop
 * into the 'monitor' node via `Widgets.NodeBody`.
 */
const SystemMonitor = Widget(() => (
  <Features.SystemMonitor>
    <Views.SystemMonitorCard icon={Activity} />
  </Features.SystemMonitor>
));

export default SystemMonitor;
