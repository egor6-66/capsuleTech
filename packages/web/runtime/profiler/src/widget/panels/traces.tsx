import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { useTraceBus } from '../../api/useTraceBus';
import type { ITraceEvent, ITraceLevel } from '../../core/trace';

const LEVEL_COLOR: Record<ITraceLevel, string> = {
  debug: '#888',
  info: '#3498db',
  warn: '#f1c40f',
};

interface ITraceGroup {
  traceId: string;
  events: ITraceEvent[];
  /** Длительность цепочки birth→death, мс. */
  span: number;
}

/** Сгруппировать поток по `traceId`, сохранив порядок первого появления. */
function group(events: readonly ITraceEvent[]): ITraceGroup[] {
  const byId = new Map<string, ITraceEvent[]>();
  for (const e of events) {
    const list = byId.get(e.traceId);
    if (list) list.push(e);
    else byId.set(e.traceId, [e]);
  }
  const out: ITraceGroup[] = [];
  for (const [traceId, evs] of byId) {
    const span = evs.length > 1 ? evs[evs.length - 1].ts - evs[0].ts : 0;
    out.push({ traceId, events: evs, span });
  }
  // Новейшие цепочки сверху.
  return out.reverse();
}

function preview(data: unknown): string {
  if (data === undefined) return '';
  if (typeof data === 'object') {
    try {
      const s = JSON.stringify(data);
      return s.length > 80 ? `${s.slice(0, 77)}…` : s;
    } catch {
      return '[object]';
    }
  }
  return String(data);
}

export function TracesPanel() {
  const bus = useTraceBus();
  const [events, setEvents] = createSignal<readonly ITraceEvent[]>(bus ? bus.all() : []);

  onMount(() => {
    if (!bus) return;
    setEvents(bus.all());
    const unsubscribe = bus.subscribe(() => setEvents([...bus.all()]));
    onCleanup(unsubscribe);
  });

  const groups = createMemo(() => group(events()));

  return (
    <Show
      when={bus}
      fallback={
        <div style={{ opacity: 0.5, 'font-size': '10px', padding: '4px 0' }}>
          No trace bus in context.
        </div>
      }
    >
      <Show
        when={groups().length > 0}
        fallback={
          <div style={{ opacity: 0.5, 'font-size': '10px', padding: '4px 0' }}>
            No traces yet. Enable a category via{' '}
            <code style={{ color: '#00d4ff' }}>trace.enable('remote')</code> or{' '}
            <code style={{ color: '#00d4ff' }}>?trace=remote</code>, then interact.
          </div>
        }
      >
        <For each={groups()}>
          {(g) => (
            <div style={{ 'margin-bottom': '10px' }}>
              <div
                style={{
                  display: 'flex',
                  'justify-content': 'space-between',
                  'align-items': 'center',
                  color: '#00d4ff',
                  'font-weight': 'bold',
                  'margin-bottom': '3px',
                }}
              >
                <span>{g.traceId}</span>
                <span style={{ color: '#777', 'font-weight': 'normal' }}>
                  {g.events.length} · {g.span}ms
                </span>
              </div>
              <For each={g.events}>
                {(e, i) => {
                  const delta = i() === 0 ? 0 : e.ts - g.events[0].ts;
                  return (
                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        'align-items': 'baseline',
                        padding: '1px 0 1px 8px',
                        'border-left': `2px solid ${LEVEL_COLOR[e.level]}`,
                      }}
                    >
                      <span style={{ color: '#666', 'flex-shrink': 0, width: '34px' }}>
                        +{delta}
                      </span>
                      <span style={{ color: '#ddd', 'flex-shrink': 0 }}>
                        {e.node}
                        <span style={{ color: LEVEL_COLOR[e.level] }}>:{e.phase}</span>
                      </span>
                      <Show when={e.data !== undefined}>
                        <span
                          style={{
                            color: '#888',
                            overflow: 'hidden',
                            'text-overflow': 'ellipsis',
                            'white-space': 'nowrap',
                          }}
                        >
                          {preview(e.data)}
                        </span>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          )}
        </For>
      </Show>
    </Show>
  );
}
