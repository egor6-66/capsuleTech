import { lazy } from 'solid-js';

const EditorStateDemo = lazy(() => import('@pages/demos/editor-state-demo') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/editor-state-demo')({
  component: EditorStateDemo,
});
