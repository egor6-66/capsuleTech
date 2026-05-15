import { lazy } from 'solid-js';

const Index = lazy(() => import('@pages/home/index') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/home/index')({
  component: Index,
});
