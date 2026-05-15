import { lazy } from 'solid-js';

const ManifestsDemo = lazy(() => import('@pages/demos/manifests-demo') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/manifests-demo')({
  component: ManifestsDemo,
});
