import { lazy } from 'solid-js';

const Configs = lazy(() => import('@pages/home/configs') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/home/configs')({
  component: Configs,
});
