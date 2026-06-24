// Remote bootstrap-entry. Импортируется boot.js'ом из iframe-srcdoc когда
// universal-canvas embed'ится через @capsuletech/web-remote.
//
// Использует `createCapsuleApp` (@capsuletech/web-core/bootstrap) — единая
// bootstrap-цепочка для standalone и embedded режимов (ADR-053 consequence 7a).
//
// ADR 059: push-поля configOverride/runtimeProps удалены из createCapsuleApp —
// host-override config'а теперь идёт через postMessage-handshake (web-core сам).
// Здесь остаётся только eventSink (ctx.channel → canvas→host события / useEmit).
// Полный перевод этого entry на self-mounting (без `bootstrap`/ctx) — Brief 2/3.
//
// HCA-слои (Feature / Controller) не знают в каком режиме работает приложение.
//
// ITERATION 2 SMOKE (2026-06-22): подписка на reactive prop ctx.props.clickCount
// через createEffect. Хост шлёт <Remote.View clickCount={signal()}> — framework
// пушит изменения через канал — здесь createEffect триггерится и логирует.
// Это event-driven push, никаких polling / интервалов. Лог должен появляться в
// iframe console при каждом клике на кнопку host-side.

import type { IAppConfig } from '@capsuletech/web-core/app-config';
import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
import type { IRemoteBootstrap } from '@capsuletech/web-remote';
import { createEffect, createRoot } from 'solid-js';
import { routeTree } from '../.capsule/routes/routeTree.gen';
import appConfigRaw from '../capsule.app';

const appConfig = appConfigRaw as IAppConfig;

export const bootstrap: IRemoteBootstrap = (root, ctx) => {
  console.log('[universal-canvas] bootstrap (createCapsuleApp)');

  ctx.channel.send('mounted', { name: 'universal-canvas', ts: Date.now() });

  // ITERATION 2 SMOKE — reactive props (Decision 4).
  // ctx.props.clickCount меняется когда host (canvas.tsx) поднимает clickCount signal.
  // Push через канал, не polling.
  //
  // Важно: createEffect должен жить ВНУТРИ Solid root. createCapsuleApp создаёт
  // root через render() ниже, но эффект до этого вызова — bootstrap-time scope, где
  // активного root ещё нет. Без createRoot эффект отработал бы один раз и не
  // подписался бы на изменения store'а внутри ctx.props proxy.
  createRoot(() => {
    createEffect(() => {
      console.log('[universal-canvas] received clickCount:', ctx.props.clickCount);
    });
  });

  return createCapsuleApp(root, {
    routeTree,
    appConfig,
    eventSink: ctx.channel,
  });
};
