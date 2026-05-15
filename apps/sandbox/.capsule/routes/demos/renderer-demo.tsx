import { lazy } from 'solid-js';

const RendererDemo = lazy(() => import('@pages/demos/renderer-demo') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/renderer-demo')({
  component: RendererDemo,
});
