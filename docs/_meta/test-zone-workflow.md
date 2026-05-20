---
title: Test Zone Workflow
description: Live-режим работы над верстаткой в capsule-test через owner-tests + visual agent owners + Storybook.
status: living
last-verified: 2026-05-21
---

# Test Zone Workflow

Регламент работы над верстаткой в **`D:\CODING\projects\my\capsule-test`** (внешняя prod-зона) во время interactive-сессии с user'ом.

## Состав ролей

| Роль | Что делает |
|---|---|
| **User** | Открывает Storybook / dev-app в браузере. Видит изменения realtime через Vite HMR. Принимает визуально (`ок, делаем PR` / `вижу баг`). |
| **Architect (главный)** | Триаж запросов, диспатчинг агентов, мониторинг таймингов owner-tests, мерж PR'ов, републиш в Verdaccio. |
| **owner-tests** | Держит `pnpm dev` (apps) и `pnpm storybook:ui` (web-ui) в background. **Не правит `packages/*`**. При framework-gap'е — пинг главному. |
| **owner-web-ui / owner-web-style / owner-builders / etc.** | По запросу главного — правят свою зону. В live-режиме **уncommitted в worktree** (Vite HMR показывает user'у). После апрува user'а — commit/PR. |

## Цикл одного изменения

```
1. User: "сделай X на странице Y" / "Button в Storybook выглядит криво"
2. Architect диспатчит owner-* (с явной инструкцией "live: правь в worktree, БЕЗ PR")
3. owner-* правит файлы — uncommitted остаются в worktree главного assistant'а
4. Vite HMR подхватывает → у user'а в браузере обновляется
5. User проверяет визуально:
   - ✓ "ок, делайте PR" → owner-* коммитит + push + gh pr create
   - ✗ "не то" → architect либо итерирует с тем же owner'ом, либо триажит к другому
6. Architect мержит PR (после CI green)
7. Если изменение требует republish (web-* / vite-builder / cli):
   - `pnpm release-local --group=all` (или `--group=cli` / `--group=web_base`)
   - В capsule-test: `pnpm install --force` (или **nuke**-flow при pnpm cache quirk — см. ниже)
   - owner-tests перезапускает dev/Storybook (если нужно)
8. User → следующее задание
```

## Тайминги (наблюдаемые на Windows + pnpm 9 + Verdaccio)

| Шаг | Норма | Алерт (kill+перехват) |
|---|---|---|
| `pnpm release-local --group=all` (15 пакетов) | **3-8 мин** | **>12 мин** → owner-tests завис, главный делает сам |
| `pnpm release-local --group=cli` (4 пакета) | 1-3 мин | >5 мин |
| `pnpm install` (fresh, root + ewc-client) | 20-40 сек | >2 мин |
| `pnpm install --force` (cache hit) | 5-15 сек | >1 мин |
| `capsule create app <name>` (non-interactive) | 10-30 сек | >2 мин |
| `pnpm dev` startup (Vite + RouterPlugin + scaffold) | 5-15 сек | >1 мин |
| `pnpm --filter @capsuletech/web-ui storybook` startup | 15-30 сек | >2 мин |
| TanStack Router CLI initial regen (после first page) | 2-5 сек (race quirk!) | см. ниже |
| Vite HMR propagation (CSS/JSX) | <1 сек | >5 сек = lost watcher |

**Правило главного**: если owner-tests молчит дольше алерт-порога — `Get-Process node` смотрим возраст процессов, kill release-local'ные, перехватываем сами.

## Known quirks

### pnpm tarball cache (re-publish same version)
Verdaccio обновлён, но `pnpm install --force` берёт старый tarball из глобального store (integrity hit). Признак: `node_modules/@capsuletech/<pkg>/dist/...` содержит старое содержимое, хотя Verdaccio API отдаёт новое.

**Fix**:
```bash
cd capsule-test
rm -rf node_modules pnpm-lock.yaml
cd apps/<app>
rm -rf node_modules pnpm-lock.yaml
cd ..
pnpm store prune
pnpm install
```
Это nuke-flow. Снимает все integrity-anchor'ы → pnpm перекачивает свежие tarball'ы. См. также [chip-задачу про автоматизацию в release-local](#).

### TanStack Router cold-start race
При `capsule create app` + первый `pnpm dev`: RouterPlugin создаёт `.capsule/routes/welcome.tsx`, но TanStack Router Vite plugin успевает прочитать routesDir **до** этого → `routeTree.gen.ts` содержит только `__root__`. Симптом: `<p>Not Found</p>` на любой странице.

**Workaround**: `touch .capsule/routes/welcome.tsx` (или сохранить файл в IDE) → TanStack chokidar регенерит.

**Structural fix**: см. chip-task для owner-builders (`RouterPlugin` должен сначала завершить initial scan, потом инстанцировать TanStackRouterVite).

### Vite HMR не подхватывает `.storybook/main.ts`
Storybook keeps Vite конфиг в памяти. Изменение `main.ts` / `preview-head.html` требует **full restart** процесса storybook (Ctrl+C → re-run). HMR работает только для `preview.css` / stories / src/.

## Кто пингует кого

- **User** видит баг → **architect**.
- **owner-tests** видит framework gap (template kerd, missing dep, broken scaffold) → **architect** с конкретикой (file:line, symptom, hypothesis).
- **owner-*** видит cross-package issue → **architect** (НЕ другой owner напрямую).
- **architect** не пишет код в `packages/*` сам — только триаж и merge.

## Что НЕ делать в live-режиме

- ❌ Делать PR от owner-* пока user не сказал "ок". Файлы должны быть uncommitted в worktree, иначе live-preview не увидит.
- ❌ `git checkout main` пока есть uncommitted правки от текущего цикла (потеряем работу).
- ❌ Параллельно править одну и ту же зону двумя owner'ами.
- ❌ `release-local --group=all` если поменялся только один пакет — используй `--group=cli` или `--group=web_base`.

## Связанные доки

- [POLICY (CLAUDE.md)](../../CLAUDE.md) — две роли, OWNERSHIP, не-костыли.
- [architect-routing.md](./architect-routing.md) — symptom → agent table.
- [anti-patterns.md](./anti-patterns.md) — каталог костылей с proper-fix'ами.
