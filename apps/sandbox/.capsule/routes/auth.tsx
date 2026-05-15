import { lazy } from 'solid-js';

const Auth = lazy(() => import('@pages/auth') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/auth')({
  component: Auth,
});
