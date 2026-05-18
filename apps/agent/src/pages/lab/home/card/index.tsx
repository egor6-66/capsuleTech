import { Link } from '@tanstack/solid-router';
import { For } from 'solid-js';

/**
 * `/lab/home/card` — index = root + layout. Здесь демонстрируем переход
 * к динамическому параметру `[id]` → `$id` в TanStack.
 */
const Card = Page((Ui) => (
  <div class="space-y-4">
    <div class="space-y-2">
      <h2 class="text-lg font-semibold">/lab/home/card</h2>
      <p class="text-sm text-muted-foreground">
        index.tsx папки card. Ниже — табы по id (динамический параметр).
      </p>
    </div>
    <div class="flex items-center gap-2 text-sm">
      <span class="text-muted-foreground">open id:</span>
      <For each={['42', 'foo', 'q-1']}>
        {(id) => (
          <Link
            to="/lab/home/card/$id"
            params={{ id }}
            class="px-2 py-0.5 rounded-md border border-border/60 hover:bg-muted"
            activeProps={{ class: 'bg-muted font-medium' }}
          >
            #{id}
          </Link>
        )}
      </For>
    </div>
    <div class="rounded-lg border border-border/60 p-4">
      <Ui.Outlet />
    </div>
  </div>
));

export default Card;
