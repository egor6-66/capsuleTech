import { lazy } from 'solid-js';

const Apps = lazy(() => import('@pages/home/apps') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/home/apps')({
  component: Apps,
});
