// Remote bootstrap-entry. Импортируется boot.js'ом из iframe-srcdoc когда
// universal-canvas embed'ится через @capsuletech/web-remote.
//
// Использует `createCapsuleApp` (@capsuletech/web-core/bootstrap) — единая
// bootstrap-цепочка для standalone и embedded режимов (ADR-053 consequence 7a).
//
// Три embedded-поля из ctx:
//  - ctx.config     → configOverride  (host ambient config, Decision 3)
//  - ctx.props      → runtimeProps    (reactive host props, Decision 4)
//  - ctx.channel    → eventSink       (canvas→host events + useEmit routing, Decision 5)
//
// HCA-слои (Feature / Controller) не знают в каком режиме работает приложение.

import type { IAppConfig } from '@capsuletech/web-core/app-config';
import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
import type { IRemoteBootstrap } from '@capsuletech/web-remote';
import { routeTree } from '../.capsule/routes/routeTree.gen';
import appConfigRaw from '../capsule.app';

const appConfig = appConfigRaw as IAppConfig;

export const bootstrap: IRemoteBootstrap = (root, ctx) => {
  console.log('[universal-canvas] bootstrap (createCapsuleApp)');

  ctx.channel.send('mounted', { name: 'universal-canvas', ts: Date.now() });

  return createCapsuleApp(root, {
    routeTree,
    appConfig,
    configOverride: ctx.config,
    runtimeProps: ctx.props,
    eventSink: ctx.channel,
  });
};
