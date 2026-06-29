# Brief — Studio: связка инспектор → канвас (store-режим)

**Зона:** owner-studio (`packages/web/studio/`). Один файл правки + опц. тест.
**Запуск:** `.\claude-scope.ps1 -Scope studio`
**Тип:** commit-only (push делает architect/user после verify).

## Зачем

Сейчас: выбрал пресет в палитре → канвас нарисовал. Но правки в инспекторе (`WebStudio.Props`) **не доходят** до канваса.

**Корень.** Инспектор правит `selection.ts` store (`patchProps`/`patchNodeType`). А `CanvasBinding` кормит канвас **одноразово** на событие `onPresetSelect`, причём *другим объектом* — registry-схемой из `target.payload.schema` (immutable пресет из реестра), а не editable-клоном из `selection.ts`. Инспектор и канвас смотрят в **разные** схемы → правки инспектора в канвас не попадают.

## Решение — `selection.ts` как SSOT, канвас реактивно его зеркалит

И палитра (`setSelected`), и инспектор (`patchProps`) уже пишут в `selection.ts`. Канвас должен **реактивно отражать** `selection.schema()`. Заменяем one-shot dispatch на `createEffect`.

**Файл:** `packages/web/studio/src/providers/CanvasBinding.tsx`

**Было:**
```ts
const CanvasBinding = Feature(() => {
  const canvasName = useCanvasName();
  const { remote } = useRemote();
  const canvas = remote(canvasName, 'main');

  return {
    initial: 'idle',
    states: {
      idle: {
        onPresetSelect: ({ target }) => {
          const { schema } = target.payload as { schema: ISchema };
          canvas.dispatch('setComposition', { schema });
        },
        canvasClick: () => {},
      },
    },
  };
});
```

**Стало:**
```ts
import { createEffect } from 'solid-js';
import { useSelectedPreset } from '../selection';
// (ISchema-импорт больше не нужен, если не используется)

const CanvasBinding = Feature(() => {
  const canvasName = useCanvasName();
  const { remote } = useRemote();
  const canvas = remote(canvasName, 'main');
  const { schema: selectedSchema } = useSelectedPreset(); // SSOT студии

  // Канвас реактивно зеркалит editable-схему selection-стора.
  // JSON-снимок: (1) глубокое чтение → эффект трекает ЛЮБУЮ вложенную правду
  //   props (granular patchProps инспектора файрит эффект);
  // (2) сериализуемый plain-снимок для postMessage-границы remote
  //   (store-proxy туда отдавать нельзя).
  createEffect(() => {
    const s = selectedSchema();
    if (!s) return; // ничего не выбрано — канвас держит пустую схему (renderer-дефолт)
    canvas.dispatch('setComposition', { schema: JSON.parse(JSON.stringify(s)) });
  });

  return {
    initial: 'idle',
    states: {
      idle: {
        // out-событие канваса (contract.out) — ловим здесь как nearest logic. No-op.
        canvasClick: () => {},
      },
    },
  };
});
```

### Почему это работает
- `createEffect` в теле Feature **owned** (LogicWrapper — Solid-компонент) → cleanup на unmount.
- Выбор пресета → `setSelected` делает full-replace схемы → эффект файрит → канвас рисует.
- Правка инспектора → `patchProps` гранулярно мутирует вглубь → `JSON.stringify` (deep-read) подписал эффект на эти ключи → файрит → канвас перерисовывает.
- Инспектор и канвас теперь смотрят в **один** объект (`selection.ts`).

### Почему убираем `onPresetSelect`-хендлер
Палитра и так пишет в `selection.ts` через `setSelected` (см. `palette/ComponentsPalette.tsx`), эффект ловит это из стора. Событийный путь становится избыточным → хендлер удаляем. Палитра-эмит (`useEmitOptional('onPresetSelect')`) остаётся — без приёмника просто бабблит в no-op. **Палитру и `IComponentsPaletteEvents` НЕ трогаем** (вычистка эмита — отдельная мелочь, не в этом брифе).

## Scope-границы

- **Только store-режим** (один пресет ↔ инспектор ↔ канвас). `composition.ts` (сборка дерева из нескольких пресетов, creator-режим) — **отдельная будущая итерация**, в этом брифе НЕ трогать.
- **Без дебаунса** в этой итерации (канвас в iframe, фокус инпутов не теряется; перф-нюанс на потом).
- Наверх (в апп) НЕ эмитим — вся связка внутри студии.

## Verify (last-lines в отчёт)

- `pnpm --filter @capsuletech/web-studio test` — green (если есть тест на CanvasBinding — обнови; если падёт мок dispatch — поправь под новый store-driven путь).
- `pnpm --filter @capsuletech/web-studio build` — dist собран.
- `pnpm exec biome check --write packages/web/studio` + re-stage.
- Typecheck: `pnpm nx run web-studio:typecheck` — `selectedSchema()` типизирован как `ISchema | null`, `JSON.parse(JSON.stringify(...))` отдаёт `any` → dispatch съест.

**Браузер-verify (architect/user после merge):** :3050 `/workspace/web-studio/store` → клик Button-пресет → канвас рисует кнопку → в инспекторе сменить `variant`/`size`/текст → канвас перерисовывается синхронно.

## Связано

[[project_studio_canvas_remote_plan]], [[project_current_checkpoint]]. Зависит от renderer-empty-schema (пустой первый кадр) — [[reference_widget_store_arg_canon]].
