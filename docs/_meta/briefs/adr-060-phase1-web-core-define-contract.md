---
tags: [web-core, adr-060, brief, phase-1, contract, owner-web-core]
status: ready
date: 2026-06-25
zone: owner-web-core (claude-scope core)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
sequence: 1-of-2 (контракт-фабрика; builders 2-of-2 эмитит артефакт из неё)
---

# Brief — web-core: `defineContract` + IContract (ADR 060 Phase 1)

> [!info] Кому: **owner-web-core**. Запуск: `claude-scope core`. Ветка: **новая от main**
> (architect скажет имя). Прочитай `packages/web/runtime/core/OWNERSHIP.md` (ownership-gate) +
> ADR 060 (D2/D3/D8). НЕ коммить — architect.

## Зачем

ADR 060: ремоут-апп объявляет **явный публичный интерфейс** (in/out события) Zod-схемой — это
single source для типов (`z.infer`), runtime-валидации (фильтр host↔app, ADR 059 D4) и
design-time рендера в студии. Нужна фабрика `defineContract`, которой автор аппа это объявляет.
Артефакт-эмит (json-schema/d.ts/mjs) — отдельный brief (builders 2-of-2); здесь — контракт + типы +
runtime-валидатор.

## Scope — новый subpath `@capsuletech/web-core/contract`

### 1. Типы + фабрика
```ts
// IContract — публичный интерфейс аппа. in: host→app (диспатч в корень), out: app→host (корневой surface).
export interface IContract {
  in: Record<string, ZodTypeAny>;
  out: Record<string, ZodTypeAny>;
}

// Фабрика — z инжектится (как defineAppConfig). Возвращает IContract as-is (typed passthrough,
// сохраняя generic'и: важно, иначе z.infer на стороне хоста сломается — ср. zod-standalone canon).
export const defineContract = <C extends IContract>(build: (z: Zod) => C): C => build(Zod);
```
- `Zod` — из `@capsuletech/shared-zod` (единственный поставщик zod, не инжектим свой). НЕ ломай generic'и (`<C extends IContract>` сохраняет точные типы событий).
- Автор пишет: `apps/<app>/contract.ts` → `export default defineContract((z) => ({ in: {...}, out: {...} }))`.

### 2. Runtime-валидатор (для host-стороны позже, но контракт здесь)
Хелпер, который по контракту + имени события + payload валидирует (используется host'ом в Phase 3
на приёме app→host и при диспатче host→app — фильтр ADR 059 D4):
```ts
export const validateEvent = (
  contract: IContract, dir: 'in' | 'out', eventName: string, payload: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } => { /* safeParse, вернуть issue path+message */ };
```
(точную форму — на твоё усмотрение; главное — safeParse + читаемый error с path).

### 3. Type-помощники для консумера (хоста)
Тип, извлекающий из контракта мапу событий → payload-тип (host типизирует `on*` и dispatch):
```ts
export type OutEvents<C extends IContract> = { [K in keyof C['out']]: z.infer<C['out'][K]> };
export type InEvents<C extends IContract>  = { [K in keyof C['in']]:  z.infer<C['in'][K]> };
```

## НЕ трогать
- Артефакт-эмит / `zod-to-json-schema` / DEFINE_FACTORIES регистрация — builders (brief 2-of-2).
- Root-event-bus мост (Phase 3), studio-рендер (Phase 4) — позже.
- `defineAppConfig`/`defineEndpoint` — не трогать, `defineContract` рядом, новый subpath.

## package.json
Добавить export `./contract` (как `./app-config`). Без новых рантайм-deps (zod уже peer).

## Тесты
- `defineContract` возвращает контракт с сохранёнными типами (typecheck: `z.infer` на in/out события даёт точный тип).
- `validateEvent`: валидный payload → ok; невалидный → error с path+message; неизвестное событие → error.

## Верификация (вернуть хвосты)
```
pnpm --filter @capsuletech/web-core test
pnpm --filter @capsuletech/web-core typecheck
pnpm --filter @capsuletech/web-core build
```
Вернуть architect'у diff-summary + хвосты. НЕ коммить.
