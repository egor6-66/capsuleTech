import { TrendingDown, TrendingUp, Users } from 'lucide-solid';
import { For } from 'solid-js';

const METRICS = [
  { label: 'Активные', value: '12 480', delta: '+12%', positive: true, icon: Users },
  { label: 'Сессии', value: '1.2M', delta: '+4.3%', positive: true, icon: TrendingUp },
  { label: 'Ошибки', value: '38', delta: '-22%', positive: false, icon: TrendingDown },
];

export const SampleMetrics = () => (
  <div class="grid grid-cols-3 gap-3">
    <For each={METRICS}>
      {(m) => (
        <div class="rounded-lg border border-border bg-card p-3">
          <div class="flex items-center justify-between text-muted-foreground mb-2">
            <m.icon size={14} />
            <span
              class="text-[10px] font-mono px-1.5 py-0.5 rounded"
              classList={{
                'text-green-500 bg-green-500/10': m.positive,
                'text-red-500 bg-red-500/10': !m.positive,
              }}
            >
              {m.delta}
            </span>
          </div>
          <div class="text-xs text-muted-foreground">{m.label}</div>
          <div class="text-lg font-semibold tracking-tight mt-0.5">{m.value}</div>
        </div>
      )}
    </For>
  </div>
);
