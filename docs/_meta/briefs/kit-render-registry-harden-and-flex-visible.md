# Brief — harden render-registry path-invariant + Flex preset visible

**Итерация:** universal-canvas iter 3 (registry-консистентность).
**Зоны:** owner-web-core (Part A — guard) + owner-web-ui (Part B — Flex + gap).
**Контекст ниже — прочитать, это определяет почему именно так.**

## Контекст (зачем)

Канвас кормит рендерер: `<Renderer.View schema={preset} registry={{ ui: Ui }} />`.
- `Ui` — namespace, собираемый в **web-core** (`packages/web/runtime/core/src/ui-kit/imports.tsx`): `Ui.Button`, `Ui.Layout.Flex`, `Ui.Card.Header`, `Ui.Icons.*`, …
- `preset.type` — dot-path из **web-ui** манифеста (`*.manifest.tsx` → `type: 'ui.Button'` / `'ui.Layout.Flex'` / …).

**Резолв работает только потому, что manifest-типы СОВПАДАЮТ со структурой `Ui`** — по соглашению, НЕ enforced. Это позиции **статические** (не динамические): один кит → его пресеты всегда его же пути. Цель — **захардить инвариант**, чтобы дрейф (кто-то добавит примитив с путём ≠ namespace) падал fast, а не давал тихий `cannot resolve` в канвасе.

Аудит (2026-06-29): почти все типы выровнены. Единственный gap — `ui.Animate` (`animate.manifest.tsx`): в namespace `Ui.Animate` НЕТ (Animate — wrapper-категория, не экспортится в imports.tsx). Пресетов у Animate нет → флоу пока не задевает, но инвариант это вскроет.

## Part A — owner-web-core: guard-тест path-инварианта

Добавить тест (в `packages/web/runtime/core/`, где собирается `Ui`):

> Для **каждого** `manifest.type` из `@capsuletech/web-ui/manifest` (`getAllManifests()`) путь должен резолвиться в собранном namespace `Ui` (тот же объект, что апп передаёт как `{ ui: Ui }`).

- Резолв — простой walk по dot-path (`'ui.Layout.Flex'` → `ns.Layout.Flex`), без зависимости на web-renderer.
- Тест падает с понятным списком нерезолвящихся типов → дрейф ловится в CI, не в рантайме канваса.
- Исключения (намеренно не-render-узлы, напр. wrapper'ы без визуала) — явный allowlist в тесте с комментарием, НЕ молчаливый skip.

Это и есть «прописать пути» как enforced-инвариант: namespace = единственный источник, тест гарантирует полноту.

## Part B — owner-web-ui

### B1 — Flex preset видимым
Сейчас Flex-пресет (`flex.presets.ts`, `type: 'ui.Layout.Flex'`) рендерится **пустым** (нет детей/размера) → в канвасе невидим. Дать пустому Flex видимый дефолт в пресете: напр. min-height + бордер/фон-плейсхолдер, либо демо-дети (пара заглушек), чтобы dropped/selected Flex был виден. На вкус owner'а — но «пустой контейнер виден как контейнер».

### B2 — gap `ui.Animate`
Part A вскроет `ui.Animate` как нерезолвящийся. Решить **причинно**, не костылём:
- если Animate — реальный render-узел → добавить его в namespace (координация с owner-web-core по `imports.tsx`);
- если Animate — не render-node (чистый wrapper) → убрать у него render-`type` из манифеста ИЛИ внести в allowlist исключений Part A с обоснованием.

## Acceptance (каждый owner, commit-only — НЕ push)
- Part A: `pnpm --filter @capsuletech/web-core test` green (новый guard включён, проходит после B2).
- Part B: `pnpm --filter @capsuletech/web-ui build|test` green; Flex-пресет визуально не пустой.
- biome check --write своей зоны, re-stage. Вернуть last-lines + имена коммитов.

## Вне scope (отдельно)
- **Белый бордер канваса** (баг) — отдельная диагностика, не сюда.
- Прокидка kit-registry в канвас как глобал вместо `{ui:Ui}` — пока НЕ надо (namespace уже служит registry, инвариант его страхует). Адаптеры/мульти-кит — будущее (по плану user'а).
