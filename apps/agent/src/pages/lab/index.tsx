import { Link } from '@tanstack/solid-router';

/**
 * Полигон роутинга. `index.tsx` в папке = root + layout одновременно.
 *
 *   /lab          → этот компонент (рендерит nav + Outlet)
 *   /lab/_auth     → дочерний layout
 *   /lab/home/... → демо вложенности, params и pathless
 */
const Lab = Page((Ui) => (
  <div class="flex flex-col h-full">
    <header class="px-6 py-4 border-b border-border/60 flex items-center gap-4">
      <h1 class="text-base font-semibold">/lab</h1>
      <nav class="flex items-center gap-3 text-sm text-muted-foreground">
        <Link
          to="/lab/auth"
          class="hover:text-foreground"
          activeProps={{ class: 'text-foreground font-medium' }}
        >
          /lab/auth
        </Link>
        <Link
          to="/lab/home/card"
          class="hover:text-foreground"
          activeProps={{ class: 'text-foreground font-medium' }}
        >
          /lab/home/card
        </Link>
        <Link
          to="/lab/home/a"
          class="hover:text-foreground"
          activeProps={{ class: 'text-foreground font-medium' }}
        >
          /lab/home/a (pathless)
        </Link>
        <Link
          to="/lab/home/b"
          class="hover:text-foreground"
          activeProps={{ class: 'text-foreground font-medium' }}
        >
          /lab/home/b
        </Link>
        <Link to="/" class="ml-auto hover:text-foreground">
          ← chat
        </Link>
      </nav>
    </header>
    <main class="flex-1 overflow-y-auto p-6">
      <Ui.Outlet />
    </main>
  </div>
));

export default Lab;
