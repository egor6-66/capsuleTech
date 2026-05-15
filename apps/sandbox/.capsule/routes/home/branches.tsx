import { lazy } from 'solid-js';

const Branches = lazy(() => import('@pages/home/branches') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/home/branches')({
  component: Branches,
});
