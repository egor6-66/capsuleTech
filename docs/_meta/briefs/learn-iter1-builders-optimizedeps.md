---
title: Learn Iter 1 — register @capsuletech/web-learn in vite-builder optimizeDeps
status: ready
audience: owner-сессия в scope=builders (claude-scope), commit-only без push
last_updated: 2026-06-28
adr_refs: [055]
---

# Кто ты

Owner-сессия пакета `builders`. Main (architect) зафенсен из `packages/builders/*` scope-хуком, поэтому эту правку делаешь ты. Запуск (USER): `claude-scope ... builders`. **Commit-only, без push.** Без topic-веток. Хук блокнул → STOP + escalate, не обходи.

# Контекст

Architect добавляет новый top-level фронт-пакет `@capsuletech/web-learn` (ADR 055, см. бриф `learn-iter1-web-learn-skeleton.md`). По канону (CLAUDE.md §Aliasing) каждый новый workspace-пакет, который потребляют apps, обязан быть в `optimizeDeps.exclude` в `capsuleConfig.ts` — иначе esbuild dev-сервера пытается пре-бандлить workspace-пакет и ломает JSX-транспиляцию / морозит резолв (грабля session web-charts).

# Задача (одна строка + ребилд)

## 1. `packages/builders/vite/src/defines/capsuleConfig.ts`

В массив `optimizeDeps.exclude` (рядом с `'@capsuletech/web-studio'`, ~строка 212) добавить:

```ts
'@capsuletech/web-learn',
```

Subpath'ы (`/lesson`, `/exercise`, …) добавлять НЕ нужно — exclude по имени пакета покрывает их.

## 2. Ребилд vite-builder

```bash
pnpm --filter @capsuletech/vite-builder build
```

Обязательно: `capsule dev` запускает vite-builder из `dist`, не из src — без ребилда dev-сервер apps/learn не подхватит exclude.

# Acceptance

- `@capsuletech/web-learn` присутствует в `optimizeDeps.exclude`.
- `pnpm --filter @capsuletech/vite-builder build` — успешно (last-lines в отчёт architect'у).
- Diff минимальный: одна строка в `capsuleConfig.ts` + пересобранный `dist/` (если dist трекается — иначе только src-строка).

# Что НЕ трогаем

- Никаких других правок в `capsuleConfig.ts` / плагинах.
- `tsconfig.base.json` (paths) — зона architect, не твоя.
- Сам пакет `packages/web/learn/` — зона owner learn-сессии.
