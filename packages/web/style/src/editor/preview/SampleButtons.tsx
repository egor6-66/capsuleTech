import { Heart, Plus, Sparkles, Trash2 } from 'lucide-solid';

/**
 * Гамма кнопок: primary, secondary, ghost, destructive — чтобы видеть,
 * как тема расходится по разным вариантам разом.
 */
export const SampleButtons = () => (
  <div class="rounded-lg border border-border bg-card p-4">
    <div class="text-xs text-muted-foreground mb-3">Buttons</div>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-sm hover:opacity-90"
      >
        <Sparkles size={12} />
        Primary
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80"
      >
        <Plus size={12} />
        Secondary
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent hover:text-accent-foreground"
      >
        <Heart size={12} />
        Outline
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-foreground text-xs font-medium hover:bg-accent hover:text-accent-foreground"
      >
        Ghost
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-medium shadow-sm hover:opacity-90"
      >
        <Trash2 size={12} />
        Destructive
      </button>
    </div>
  </div>
);
