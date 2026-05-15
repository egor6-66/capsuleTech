import '@capsule/web-style/css';
import '../index.css';

import type { JSX } from 'solid-js';
import { render } from 'solid-js/web';

export function createRoot(
  Component: () => Node | JSX.ArrayElement | string | number | boolean | null | undefined,
) {
  const container = document.getElementById('root');

  if (!container) throw new Error('root not found');

  return render(Component, container);
}
