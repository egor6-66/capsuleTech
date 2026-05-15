import { lazy } from 'solid-js';

const ThemeEditor = lazy(() => import('@pages/demos/theme-editor') as Promise<{ default: any }>);

import { createFileRoute } from '@tanstack/solid-router';

export const Route = createFileRoute('/demos/theme-editor')({
  component: ThemeEditor,
});
