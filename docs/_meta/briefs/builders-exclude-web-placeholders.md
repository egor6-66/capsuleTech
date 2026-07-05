---
title: vite-builder — @capsuletech/web-placeholders в optimizeDeps.exclude
status: ready
audience: owner-сессия `claude-scope -Scope vite-builder` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: []
---

# Scope (однострочник)

`packages/builders/vite/src/defines/capsuleConfig.ts` → `optimizeDeps.exclude`:
добавить `'@capsuletech/web-placeholders'` (рядом с `'@capsuletech/web-auth'`,
~строка 206). Новый workspace-пакет; без exclude esbuild пре-бандлит его в
аппах → stale-резолв/заморозка src-правок (грабля web-charts 2026-06-02).

# Acceptance

`pnpm --filter @capsuletech/vite-builder test` зелёные; `build` пакета
(consumer-аппы увидят после rebuild dist + рестарта dev — канон).
