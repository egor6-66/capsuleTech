# Аудит: shared zone (shared-zod / shared-utils)

- **Путь:** `packages/shared/*`
- **Аудит:** 2026-07-07

Малые runtime-shared листья. Оба чисты по crutch-sweep'у.

## @capsuletech/shared-zod (0.1.1) — 🟢 READY

`z.ts` shim + re-export zod + subpath `/gen` (faker-base + gen + registry + types — data-generation для моков). Единственный поставщик Zod для web-* ([[project_zod_standalone]] — Zod = глобал, generics сохраняются, апы не импортят zod напрямую). Group web_base.

**Фиксы:** бренд-rename (CC-1). **v2-заметка:** при апгрейде zod (peer сейчас `^3.23.8`) сверить, что `z.ts`-shim переживает — если целимся в zod v4, это отдельная проверка совместимости (generics/API). Не блокер, но заложить в план vendor-версий.

## @capsuletech/shared-utils (0.1.0) — 🟢 READY

Один `index.ts` — приватные utility-хелперы. Group web_base, publishConfig public. Тривиален.

**Фиксы:** бренд-rename. Проверить, что все экспорты реально используются (мёртвые хелперы — под снос; но пакет крошечный).

## Итог

Оба 🟢 — переносим, только бренд-rename. Ни костылей, ни архитектурных вопросов. shared-zod держать как единственный zod-провайдер в v2 (канон).
