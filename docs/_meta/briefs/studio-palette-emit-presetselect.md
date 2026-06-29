# Brief — owner-studio: палитра эмитит `presetSelect` (HCA-событие вверх)

**Зона:** `packages/web/studio/` (scope `web-studio`).
**Итерация:** universal-canvas iter 2, Половина 2 (studio-сторона).
**Тип:** package emits named event (ADR 032 useEmit). Никакой remote-механики тут нет — только эмит.

## Зачем

Сейчас клик пресета в `ComponentsPalette` пишет в **синглтон `selection`** (`useSelectedPreset().setSelected`). Это package-internal мутация, **не HCA-событие** — host-Feature его поймать не может.

По канону package-событий (пакет эмитит **именованное** событие вверх через `useEmit`, app-Feature ловит как `Feature<...>`) палитра должна на выбор пресета **эмитить** событие. Host (playground) поймает его и переправит в remote-канвас, канвас отрисует схему рендерером.

**Граница ровно тут:** твоя зона — только «палитра эмитит `presetSelect`». Кто ловит и что делает дальше (host→canvas→renderer) — НЕ твоя зона (app-код, architect).

## Что сделать

В палитре на **клик пресета** (store-режим, `PresetItem` / `Item`) дополнительно эмитить именованное событие через `useEmit` (канал ADR 032 — `@capsuletech/web-core/...`, как уже делают другие studio-controllers; если в палитре useEmit ещё не подключён — подключить по образцу существующих studio Controllers).

- **Имя события:** `onPresetSelect` (`on`-префикс — как `onNavigate` в `Navigation.tsx`).
- **Payload:** `{ schema }` — `preset.schema` (это `ISchema` из `@capsuletech/web-contract`, JSON-сериализуемый).

Точный образец — `packages/web/studio/src/navigation/Navigation.tsx:44,61`:

```ts
const emit = useEmit(); // import { useEmit } from '@capsuletech/web-core'
// ... на клик пресета (PresetItem):
emit('onPresetSelect', {
  source: 'WebStudio.ComponentsPalette',
  payload: { schema: props.p.schema },
});
```

### Про существующий синглтон-write

`setSelected(preset)` (запись в `selection` синглтон) **оставь как есть** — он используется внутренним preview студии. Просто **добавь** эмит рядом, не убирай синглтон. Никаких поведенческих регрессий в самой студии.

### DnD (creator-режим)

Пока **только клик** (`PresetItem`). Drag-drop (`DraggablePresetItem`) — НЕ трогаем в этой итерации (следующий шаг).

## Контракт события (фиксируем — host ловит ровно это)

| Поле | Тип | Смысл |
|---|---|---|
| event name | `onPresetSelect` | имя HCA-события, бабблит к ближайшему host logic-wrapper'у |
| `payload.schema` | `ISchema` | схема выбранного пресета (то, что рендерер нарисует) |

Architect реализует host-сторону (`Features.Canvas` ловит `presetSelect`) под это имя/форму — **не меняй их** без сигнала.

## Acceptance (owner, commit-only — НЕ push)

1. `pnpm --filter @capsuletech/web-studio build` → green.
2. `pnpm --filter @capsuletech/web-studio test` → green (+ при возможности тест: клик пресета → `presetSelect` эмитнут с правильным payload).
3. `pnpm --filter @capsuletech/web-studio typecheck` → green.
4. `pnpm exec biome check --write packages/web/studio` → чисто, re-stage.
5. `git commit` со scope-тегом, **без push**. Вернуть architect'у last-lines билда + имя коммита.

## Чего НЕ делать

- Не трогать remote / contract / canvas — это app-код (architect).
- Не убирать синглтон-write.
- Не трогать DnD-ветку.
- Не менять имя события / форму payload.
