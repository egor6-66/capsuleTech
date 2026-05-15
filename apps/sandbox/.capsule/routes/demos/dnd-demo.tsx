import { lazy } from 'solid-js';

const DndDemo = lazy(() => import('@pages/demos/dnd-demo') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/dnd-demo')({
  component: DndDemo,
});
