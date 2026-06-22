// Remote bootstrap-entry. Импортируется boot.js'ом из iframe-srcdoc когда
// universal-canvas embed'ится через @capsuletech/web-remote.
//
// Reuses генеренный <Bootstrap/> (BaseProviders + routeTree) — same code path,
// что и обычный SPA-запуск (.capsule/index.ts). Отличается только container:
// вместо #root отдаём DOM-ноду которую дал shell.
//
// ITERATION 1 (smoke): шлём 'mounted' хосту через channel.send. Хост ловит
// через `<Remote.View onMounted={cb}>` — auto-subscribe по /^on[A-Z]/ (ADR-053
// Decision 5). Канон-флоу, никакого Solid reactivity на iframe boundary, никаких
// app-импортов на хосте. Если log на хосте увидим — транспорт жив.

import { createRoot } from '@capsuletech/web-core/create';
import type { IRemoteBootstrap } from '@capsuletech/web-remote';
import { Bootstrap } from '../.capsule/bootstrap';

export const bootstrap: IRemoteBootstrap = (root, ctx) => {
  console.log('[universal-canvas] bootstrap');

  ctx.channel.send('mounted', { name: 'universal-canvas', ts: Date.now() });

  return createRoot(Bootstrap, { container: root });
};
