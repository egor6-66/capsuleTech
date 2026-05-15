import { Link } from '@tanstack/solid-router';

/**
 * `/lab/auth` — собственный root+layout. Под собой держит /login и /registration.
 */
const Auth = Page((Ui) => (
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3 text-sm">
      <span class="text-muted-foreground">auth tabs:</span>
      <Link
        to="/lab/auth/login"
        class="px-3 py-1 rounded-md border border-border/60 hover:bg-muted"
        activeProps={{ class: 'bg-muted font-medium' }}
      >
        login
      </Link>
      <Link
        to="/lab/auth/registration"
        class="px-3 py-1 rounded-md border border-border/60 hover:bg-muted"
        activeProps={{ class: 'bg-muted font-medium' }}
      >
        registration
      </Link>
    </div>
    <div class="rounded-lg border border-border/60 p-4">
      <Ui.Outlet />
    </div>
  </div>
));

export default Auth;
