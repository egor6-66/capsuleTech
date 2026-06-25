---
tags: [builders, vite-builder, adr-060, brief, phase-1, contract, owner-builders]
status: ready
date: 2026-06-25
zone: owner-builders (claude-scope vite-builder)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
sequence: 2-of-2 (эмитит артефакт из defineContract — web-core brief 1-of-2)
---

# Brief — builders: контракт-артефакт из `contract.ts` (ADR 060 Phase 1)

> [!info] Кому: **owner-builders**. Запуск: `claude-scope vite-builder`. Та же ветка, что web-core
> brief 1-of-2. Прочитай `packages/builders/OWNERSHIP.md` (ownership-gate) + ADR 060 (D3) +
> `packages/builders/vite/src/plugins/capsuleRegistry.ts` (codegen) +
> `packages/builders/vite/src/plugins/constants.ts` (DEFINE_FACTORIES). НЕ коммить — architect.

> [!warning] Зависит от web-core brief 1-of-2 (`@capsuletech/web-core/contract` → `defineContract`/`IContract`).
> Порядок: web-core первым, architect пересоберёт его dist, потом этот.

## Зачем

ADR 060 D3: сборка ремоут-аппа эмитит **контракт-артефакт** из `apps/<app>/contract.ts` (одна
Zod-схема → 4 производных), хостящийся рядом с аппом. Хост вендорит его (Phase 2), студия фетчит
(Phase 4). Здесь — эмиттер + регистрация фабрики как глобала.

## Scope

### 1. Зарегистрировать `defineContract` как глобал
В `vite/src/plugins/constants.ts → DEFINE_FACTORIES` добавить:
```ts
'@capsuletech/web-core/contract': ['defineContract'],
```
(как `defineAppConfig`/`defineEndpoint` — авто-импорт в TSX + доступен в build-eval'е `contract.ts`).

### 2. Эмиттер артефакта (новый шаг/плагин, по образцу как генерится `.capsule/*`)
Читает `apps/<app>/contract.ts` (jiti-eval, как `capsule.app.ts` грузится shared-file-manager'ом),
если файл есть → на build (и dev-middleware) эмитит **в served-выход аппа** (`.capsule/contract/` →
хостится как `${url}/.capsule/contract/...`):

| Файл | Из чего |
|---|---|
| `manifest.json` | `{ name, version }` (из package.json аппа) + список имён in/out событий |
| `schema.json` | каждое in/out событие → `zodToJsonSchema(schema)` |
| `contract.d.ts` | inferred-типы (`InEvents`/`OutEvents` из web-core/contract) |
| `contract.mjs` | ре-экспорт самого контракта (zod-модуль) для runtime-валидации хостом |

- **`zod-to-json-schema` dep** добавить в vite-builder. ⚠️ **POC-нюанс (Phase 0):** вызывать
  `zodToJsonSchema(schema, { $refStrategy: 'none', target: 'jsonSchema7' })` **БЕЗ опции `name`** —
  иначе оборачивает в `$ref`+`definitions` и `properties` прячутся (рендер ломается). Без `name` —
  инлайн-схема с top-level `properties`, walkable.
- Если `contract.ts` нет — шаг no-op (не все аппы — ремоуты).
- dev: middleware отдаёт `/.capsule/contract/*` (как раньше делал retired RemoteManifestPlugin для
  manifest — тот же приём отдачи JSON по URL-пути, но теперь живой контракт, не мёртвый srcdoc).

### 3. (опц., если просто) тип-codegen в .capsule/@types
Если тривиально — можно сразу генерить локальный `.capsule/@types/contract.d.ts` для САМОГО аппа
(чтобы автор видел типы своего контракта). Полный host-side codegen (`remotes.d.ts` из vendored
артефакта) — Phase 2, НЕ здесь.

## Что НЕ трогать
- `defineContract` реализация — web-core (brief 1-of-2, только потребляй).
- Host-регистрация ремоутов / vendoring / `remotes.d.ts` — Phase 2.
- Root-event-bus мост — Phase 3 (web-core/web-remote).

## Тесты
- `apps/<app>/contract.ts` есть → эмитятся 4 файла; нет → no-op.
- `schema.json` имеет top-level `properties` (НЕ `$ref`) — проверка POC-нюанса (`name` не передан).
- manifest содержит name/version + имена in/out.
- (если делал) dev-middleware отдаёт `/.capsule/contract/manifest.json`.

## Верификация (вернуть хвосты)
```
pnpm --filter @capsuletech/vite-builder test
pnpm --filter @capsuletech/vite-builder typecheck
pnpm --filter @capsuletech/vite-builder build
```
Плюс sanity: на тестовом аппе с `contract.ts` после build есть `.capsule/contract/schema.json` с
инлайн-`properties`. Вернуть architect'у diff-summary + хвосты. НЕ коммить.
