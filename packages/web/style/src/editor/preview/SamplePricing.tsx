import { Check, Sparkles } from 'lucide-solid';
import { For } from 'solid-js';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '0 ₽',
    sub: 'Forever free',
    features: ['1 проект', '3 редактора', 'Базовая палитра'],
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '1 290 ₽',
    sub: 'в месяц',
    features: ['Неограниченные проекты', 'Своя дизайн-система', 'Экспорт CSS'],
    featured: true,
  },
];

export const SamplePricing = () => (
  <div class="grid grid-cols-2 gap-3">
    <For each={PLANS}>
      {(plan) => (
        <div
          class="relative rounded-lg border p-4 transition-colors"
          classList={{
            'border-primary bg-primary/5 shadow-md': plan.featured,
            'border-border bg-card': !plan.featured,
          }}
        >
          {plan.featured ? (
            <span class="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
              <Sparkles size={10} />
              Хит
            </span>
          ) : null}
          <div class="flex flex-col">
            <span class="text-xs text-muted-foreground">{plan.name}</span>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-xl font-semibold leading-none">{plan.price}</span>
              <span class="text-[11px] text-muted-foreground">{plan.sub}</span>
            </div>
          </div>
          <ul class="mt-3 flex flex-col gap-1.5">
            <For each={plan.features}>
              {(f) => (
                <li class="flex items-center gap-1.5 text-xs">
                  <Check size={12} class="text-primary shrink-0" />
                  <span class="text-muted-foreground">{f}</span>
                </li>
              )}
            </For>
          </ul>
        </div>
      )}
    </For>
  </div>
);
