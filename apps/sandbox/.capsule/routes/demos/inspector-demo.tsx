import { lazy } from 'solid-js';

const InspectorDemo = lazy(() => import('@pages/demos/inspector-demo') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/inspector-demo')({
  component: InspectorDemo,
});
