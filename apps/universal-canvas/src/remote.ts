// Remote bootstrap-entry. Импортируется boot.js'ом из iframe-srcdoc когда
// universal-canvas embed'ится через @capsuletech/web-remote.
//
// Reuses генеренный <Bootstrap/> (BaseProviders + routeTree) — same code path,
// что и обычный SPA-запуск (.capsule/index.ts). Отличается только container:
// вместо #root отдаём DOM-ноду которую дал shell.

import { createRoot } from '@capsuletech/web-core/create';
import { Bootstrap } from '../.capsule/bootstrap';

export const bootstrap = (root: HTMLElement) => {
  return createRoot(Bootstrap, { container: root });
};
