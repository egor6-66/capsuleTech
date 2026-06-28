---
title: web-learn library — sub-navigation + sub-views (mirror studio store/creator)
status: ready
audience: owner-сессия web-learn (scope `learn`)
last_updated: 2026-06-28
adr_refs: [055, 064, 032, 033, 036]
---

# Кто ты / запуск

Owner пакета **`@capsuletech/web-learn`** (scope **`learn`**): `.\claude-scope.ps1 -Scope learn` — fenced в `packages/web/learn/`, git commit-only. **Read первым** `packages/web/learn/OWNERSHIP.md`.

**Эталон для подражания — навигация studio** (открой и копируй паттерн):
- `packages/web/studio/src/navigation/Navigation.tsx` (Tier-2 connected, useEmit + useRouter active)
- `packages/web/studio/src/navigation/segments.ts` (internal SEGMENTS + BASE)
- `packages/web/studio/src/welcome/Welcome.tsx` (phantom `__events` паттерн)

Хук блокнул → STOP + escalate.

# Цель

Внутри модуля `src/library/` пакета сделать **под-навигацию library** (как studio store↔creator) + под-вью. App (learn) смонтирует. Это перенос «explorer» из app в пакет + добавление переключателя разделов library.

**Под-разделы library (placeholder-набор, architect выбрал — можно переименовать):**
- **explorer** — поиск слова + карточка + связи (текущий app-`Views.Library.Explorer` переезжает сюда).
- **collections** — сохранённые списки/закладки (placeholder, может использовать `VocabList`).

# Что сделать (в `packages/web/learn/src/library/`)

## 1. `segments.ts` (internal, НЕ в публичный subpath)
```ts
export type LibrarySegmentId = 'explorer' | 'collections';
export interface ILibrarySegment { id: LibrarySegmentId; label: string; description: string; }
export const LIBRARY_SEGMENTS: readonly ILibrarySegment[] = [
  { id: 'explorer', label: 'Explorer', description: 'Поиск слова, связи, синонимы, фонетика.' },
  { id: 'collections', label: 'Collections', description: 'Сохранённые списки и закладки.' },
] as const;
export const LIBRARY_BASE = '/workspace/library';
```
> `LIBRARY_BASE` хардкодит app-роут — так же делает studio (`STUDIO_BASE`). Известный studio-pattern; пропификация base — отдельно позже, не сейчас.

## 2. `Navigation.tsx` — переключатель (калька studio Navigation)
Tier-2 connected: `useEmit` + `useRouter().current()` для active. **Отдельное событие `onLibraryNavigate`** (НЕ `onNavigate` — иначе схлопнется с `Learn.Welcome.onNavigate` payload в app-Feature).
```tsx
export interface ILibraryNavEvents { onLibraryNavigate: LibrarySegmentId; }
// active(): path.startsWith(LIBRARY_BASE) → последний сегмент ∈ LIBRARY_SEGMENTS
// emit('onLibraryNavigate', { source: 'Learn.LibraryNav', payload: seg.id })
// рендер: <Group orientation="horizontal" variant="attached"><For>{Button variant active?'default':'ghost'}</For>
// phantom: export const Navigation: ((p)=>any) & { readonly __events?: ILibraryNavEvents }
```
(Структуру 1:1 бери из studio `Navigation.tsx`, поменяв segments/event-name/base.)

## 3. `WordExplorer.tsx` — explorer-вью (перенос из app)
Перенеси содержимое app-`apps/learn/src/views/library/explorer.tsx` сюда как **stateless package-компонент** `WordExplorer` (поиск-input disabled + тоггл-чипы Synonyms/Constructions/Phonetics/Related + empty-state, на `@capsuletech/web-ui` примитивах). Тот же placeholder, просто в пакете. (Architect удалит app-копию.)

## 4. `Collections.tsx` — placeholder под-вью
Простой `<div data-stub="Learn.Collections">` с Typography + опц. `VocabList`. Заглушка.

## 5. Регистрация — `src/capsule.ts`
Добавь в `components`: `LibraryNav: Navigation`, `WordExplorer`, `Collections`. (Существующие Provider/Welcome/LessonView/... не трогай.) → глобалы `Learn.LibraryNav` / `Learn.WordExplorer` / `Learn.Collections`. Codegen из phantom даст `Learn.LibraryNav.Events`.

## 6. Экспорт
`src/library/index.ts` — реэкспорт WordExplorer/Collections/Navigation (+ типы). `segments.ts` — internal, НЕ реэкспортить. Build-entry `library` уже есть.

## 7. Тесты
Smoke: `WordExplorer` рендерит `[data-stub="Learn.WordExplorer"]`; `Collections` рендерит; `Navigation` — рендер списка сегментов (обернуть в тест-контекст если useEmit бросает вне scope — как studio тесты, либо не тестить Navigation как studio).

# Acceptance (last-lines → architect)
- `pnpm --filter @capsuletech/web-learn build` — все entry, `library` чанк содержит новые компоненты.
- `pnpm --filter @capsuletech/web-learn typecheck` clean.
- `pnpm --filter @capsuletech/web-learn test` — smoke green.
- `pnpm exec biome check packages/web/learn --diagnostic-level=error` — clean (organize-imports не забудь).

# Что НЕ делаем
- Реальная логика explorer/collections (поиск, данные) — placeholder; данные с backend/learn — позже через web-query.
- App-сторона (`apps/learn`) — НЕ твоя (architect готовит роуты + Feature-хендлер).
- Пропификация `LIBRARY_BASE`, переименование сегментов — по сигналу architect.

# После
Architect: подключит роуты `/workspace/library/{explorer,collections}` + `_index` + library-layout с `<Learn.LibraryNav/>`, добавит `onLibraryNavigate`-хендлер в `Features.App`, удалит app-копию explorer'а. Затем сборка app↔package + верификация.
