---
title: web-learn library Navigation — drop hardcoded app-URL, derive active from own segments
status: ready
audience: owner-сессия web-learn (scope `learn`)
last_updated: 2026-06-28
adr_refs: [032, 033]
---

# Кто / запуск

Owner `@capsuletech/web-learn` (scope **`learn`**): `.\claude-scope.ps1 -Scope learn`. Read `packages/web/learn/OWNERSHIP.md`. Commit-only.

# Баг (канон-нарушение)

`packages/web/learn/src/library/segments.ts` экспортит **`LIBRARY_BASE = '/workspace/library'`** — пакет **хардкодит полный app-URL**. `Navigation.tsx` через `path.startsWith(LIBRARY_BASE)` вычисляет active. Это **корень в app-структуру**: app сменил роуты (`/workspace/library` → `/library`) — active-highlight в пакете отвалился.

**Канон:** пакетный Navigation знает **только свои сегменты** (`explorer`/`collections`), НЕ полный URL. Полный роут — забота app'а (он ловит `onLibraryNavigate` и сам делает `router.goTo`). Active-state — derived из URL **route-prefix-агностично**.

(Тот же анти-паттерн в `web-studio` `STUDIO_BASE` — НЕ твоя зона, но зафлажь architect'у: owner-studio пусть починит аналогично.)

# Фикс

## `segments.ts`
Удалить `LIBRARY_BASE`. Оставить только `LibrarySegmentId` + `LIBRARY_SEGMENTS`.

## `Navigation.tsx` — `active()` route-agnostic
Вместо `startsWith(LIBRARY_BASE)` — брать **последний сегмент пути** и сверять с своими id:
```tsx
const active = (): LibrarySegmentId | undefined => {
  const segs = router.current().split('/').filter(Boolean);
  const last = segs[segs.length - 1];
  return LIBRARY_SEGMENTS.some((s) => s.id === last) ? (last as LibrarySegmentId) : undefined;
};
```
Так nav подсвечивает `explorer`/`collections` независимо от того, под каким префиксом смонтирован (`/library/...`, `/foo/library/...` — без разницы). На голом `/library` (last=`library`) active нет — ок (дефолт-вью).

Остальное (emit `onLibraryNavigate`, рендер кнопок) — без изменений.

# Acceptance
- `LIBRARY_BASE` удалён, в пакете не осталось хардкод app-URL (grep `/workspace`, `/library` в library/ — только в комментах если что).
- `pnpm --filter @capsuletech/web-learn build` + `typecheck` + `test` + `biome check` — green.
- Active-state работает при монтировании под `/library/explorer` (проверит architect в app'е).

# Note architect'у (от owner'а)
Если у `LibraryNav` нет доступа к router вне scope — он Tier-2 connected (рендерится в app-логик-контексте), `useRouter()` уже используется. Сегмент-агностичный active — чистое решение, без знания app-роутов.
