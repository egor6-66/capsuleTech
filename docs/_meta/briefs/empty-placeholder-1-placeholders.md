# Brief — `Placeholders.Empty` — generic empty-state (scope `web-placeholders`)

**Контекст (user):** learn (и любой апп) повсюду рисует пустое состояние руками —
`<Layout.Flex h="full" align="center" justify="center" p={6}><Typography tone="muted">Выберите
урок / Практики нет / Библиотека пуста</Typography></Layout.Flex>`. Это **empty**, не error.
Существующие блоки (`NotFound`/`ErrorState`/`AccessDenied`/`Community`/`WidgetUnavailable`) — все
«ошибка/отказ». Нужен **generic empty-state** блок.

## Задача — новый блок `Empty`
`PlaceholderShell` уже всё умеет (icon/title/description опц. action/secondaryAction/compact) —
Empty = тонкий блок поверх него, как остальные пять.

- `src/blocks/empty.tsx`:
  ```ts
  interface IEmptyProps {
    title?: string;         // default напр. 'Пусто'; потребитель обычно задаёт («Выберите урок»)
    description?: string;
    icon?: JSX.Element;     // опц. override (по умолчанию — нейтральная lucide, напр. Inbox)
    actionLabel?: string;   // опц. — если задан, рисуется action + эмитится onAction
    compact?: boolean;      // для узких слотов (правая панель, встройка)
  }
  interface IEmptyEvents { onAction: Record<string, never>; }  // только когда actionLabel задан
  ```
  Реализация — `PlaceholderShell` с дефолт-иконкой (нейтральная, напр. `Inbox`/`SearchX`), title/
  description; `action` только при `actionLabel` (→ `emit('onAction', { source: 'Placeholders.Empty' })`),
  иначе ни кнопки, ни события (чистое информационное пусто). `compact` пробрасывается в shell.
  Phantom `__events?: IEmptyEvents` (как у остальных блоков).
- `src/blocks/types.ts` — `IEmptyProps` + `IEmptyEvents`.
- `src/blocks/index.ts` — экспорт `Empty` + типы.
- `src/capsule.ts` — зарегистрировать `Empty` в `Placeholders.*` (ADR 033, как остальные 5).
- `src/blocks/__tests__/blocks.test.tsx` — кейс Empty: рендер title/description; `actionLabel` задан →
  кнопка + эмит `onAction`; не задан → нет кнопки/события.

## Verify
`nx run @capsuletech/web-placeholders:typecheck` + `:test` + `:build`. `Placeholders.Empty`
резолвится. Существующие 5 блоков не тронуты.
