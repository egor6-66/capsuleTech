import { lazy } from 'solid-js';

const Index = lazy(() => import('@pages/demos/index') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/index')({
  component: Index,
});
