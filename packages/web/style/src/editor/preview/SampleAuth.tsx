import { ArrowRight, Lock, Mail } from 'lucide-solid';

/**
 * Auth-form sample. Использует только семантические токены — `bg-card`,
 * `text-foreground`, `border-border`, `bg-primary` — поэтому полностью
 * реагирует на смену темы в редакторе.
 */
export const SampleAuth = () => (
  <div class="rounded-lg border border-border bg-card text-card-foreground p-6 shadow-sm">
    <div class="space-y-1.5 mb-5">
      <h3 class="text-base font-semibold leading-none">Войти в Capsule</h3>
      <p class="text-xs text-muted-foreground">Войдите, чтобы продолжить редактирование</p>
    </div>
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium">Email</span>
        <div class="relative">
          <Mail
            size={14}
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="email"
            placeholder="you@company.com"
            class="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium">Пароль</span>
        <div class="relative">
          <Lock
            size={14}
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="password"
            placeholder="••••••••"
            class="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </label>
      <button
        type="button"
        class="mt-1 inline-flex items-center justify-center gap-2 h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
      >
        Войти
        <ArrowRight size={14} />
      </button>
    </div>
  </div>
);
