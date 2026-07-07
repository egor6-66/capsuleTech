# Аудит: apps zone (продуктовые фронты)

> Файл назван `apps-frontends.md`, а не `apps/README.md`: governance-хук резолвит сегмент
> `apps` в пакет-зону и фенсит main. Docs-аудит — не код зоны, поэтому обходим коллизию имени.

- **Путь:** `apps/*`
- **Аудит:** 2026-07-08 (pass-1)
- **Контекст:** апы — фронты продуктов. В v2 (ADR 077) первая волна = **framework + backend**;
  апы **мигрируют вместе со своими продуктами** (learn-апп → learn-продукт и т.д.), НЕ в первой
  волне. Здесь — зрелость + compliance-posture как ориентир.

## Инвентарь

| Апп | src | cfg | Слои | Зрелость |
|---|---|---|---|---|
| learn | 27 | ✓ | все (−views) | **ЭТАЛОН** (checkpoint), самый полный |
| playground | 22 | ✓ | все (−views) | эталон+визитка ИЛИ снос (развилка, см. ниже) |
| studio | 14 | ✓ | все (−views) | WIP (mid-mirror learn) |
| auth | 5 | ✓ | все 7 | мал, но полнослойный (ADR 068 ф.1) |
| universal-canvas | 3 | ✓ | −entities | scaffold + debug-логи |
| community | 0 | ✗ | — | **пусто** (не построен) |

## Compliance-posture — ✅ ЧИСТО (app-package-import)

Grep `from '@capsuletech/…'` по `apps/**`: почти все — в **`.capsule/`** (codegen: bootstrap,
routes, app-config.gen, registry/packages) — генерятся, **compliance exempt**. Единственные
`src/`-импорты: `playground/src/endpoints/auth.ts` + `studio/src/endpoints/auth.ts` —
`@capsuletech/shared-zod/gen` (моки API). `endpoints/` — не HCA-слой, gen разрешён.
**→ ноль app-package-import нарушений в HCA-слоях (views/widgets/…).** Канон «ноль import в
слоях» держится.

## Crutch-профиль (src, без codegen)

- **Codegen exempt:** `routeTree.gen.ts` (`@ts-nocheck` + `as any`), `.capsule/@types/*.d.ts` — генерятся, не крутыли.
- **universal-canvas** `controllers/canvas.tsx:32,42` — **2 stray `console.log`** (`[canvas:ping]`/`[canvas:setComposition]`). Реальный debug в контроллере → снять/gate. Scaffold-остаток.
- **learn (ЭТАЛОН)** — `widgets/header.tsx:16-19` + `features/app.tsx:66,75,113`: `(store?.ctx as any)?.data?.engine`. **store.ctx typing-gap виден ДАЖE в эталоне.** Cross-cutting: `store.ctx` не типизирован под schema-context (web-core/web-state) → апы кастуют `as any` чтобы читать данные. **v2-кандидат:** типизировать `store.ctx` в web-core/state → убрать `as any` из app-слоёв (канон «без крутылей»). Связано с runtime web-state/web-core.
- **learn** `pages/_workspace/{exercises,guides,progress}/index.tsx` — `{/* TODO: <Learn.XNav /> */}` — честные future-phase стабы (секции не добиты; дриллы/прогресс ждут учителя, checkpoint).

## Тиры (pass-1)

**🟢 REFERENCE:** **learn** — эталон (kit-first, анатомия core/+слои, PR #473). Ориентир для
структуры продуктового фронта. Хвосты: store.ctx-касты (cross-cutting фикс) + nav-стабы.

**🟡 / развилки:**
- **auth** (5 src) — полнослойный, ADR 068 ф.1. Мал; проверить полноту при переносе с identity-продуктом.
- **playground** (22 src) — **развилка:** checkpoint противоречив — «эталон+визитка» vs «сносим,
  studio занимает :3050». Держит `remote-entry` (web-remote consumer) + web-access/web-auth wiring
  (единственный потребитель web-access/web-auth в апах!). Решить судьбу: hub-апп (подтягивает апы
  через remote) ИЛИ снос. **Влияет на web-remote/web-access/web-auth usage-вердикты.**

**🟠 scaffold / WIP:**
- **studio** (14 src) — WIP mid-mirror learn (checkpoint: роутинг мёртв, pages спутаны, scaffold-мусор). Мигрирует со studio-продуктом; сначала добить под learn-анатомию.
- **universal-canvas** (3 src) — scaffold (base ещё `/`, gateway-роут PENDING), debug-логи. Привязан к canvas/Unity-треку (ADR 075). Defer.
- **community** (0 src, нет cfg) — **пустой скелет**, не построен (charter-сессия была, апп нет). Строится со community-продуктом. N/A для переноса.

## Ключевой cross-cutting вывод

**store.ctx typing-gap** — единственный крутыль-паттерн в эталоне (learn кастует `store.ctx as any`
для чтения data). Не app-баг, а **framework-gap** (web-core/web-state: `store.ctx` не типизирован
под schema-context). Фикс в runtime → убирает `as any` из всех app-слоёв. **v2-приоритет** для
web-core/state (эталонность апа упирается в это).

## Открыто (pass-2)
- playground-судьба (hub vs снос) → web-remote/access/auth usage.
- universal-canvas base-flip `/`→`/canvas/` + gateway-роут (уже PENDING в nginx).
- Полная compliance-прогонка (`pnpm compliance:check`) на апах для warn-класса (native-jsx/raw-class) — pass-1 покрыл только structural.
