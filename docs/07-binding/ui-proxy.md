---
tags: [hca, binding, proxy, ui]
status: documented
---

# 🪞 UiProxy — перехват UI-событий

**Файл:** `packages/core/src/wrappers/ui/ui-kit/proxy.tsx`

UiProxy — «магия», которая делает Entity stateless. Подменяет базовый UI-kit на обёртки, которые при наличии **собственного `meta`** регистрируются в store и автоматически отправляют события в Controller. Без `meta` — пропускаются как структурные.

## Когда активируется

В `EntityWrapper`:

```tsx
// packages/core/src/wrappers/ui/entity.tsx
const ctx = useCtx();
const Ui = ctx ? UiProxy(ctx, wrapperProps) : BaseUi;
return <Component {...Ui} />;
```

Если Entity рендерится **внутри** Controller/Feature (есть Context) — Entity получает Proxy-обёртки. Без Context — голый UI.

## Politика регистрации (C — own meta)

> [!info]
> Только элементы с **собственным** `meta={...}` на JSX-узле попадают в `store.components` и получают обработчики событий. Унаследованный `dynamicMeta` от Entity-уровня не влияет на регистрацию структурных обёрток (Field, Field.Label, Field.Content и т.п.).

```ts
const hasOwnMeta = !!componentProps?.meta;

if (!hasOwnMeta) {
  // сквозной рендер без побочных эффектов
  return <OriginalComponent {...mergedProps} />;
}

// иначе — registerComponent + event-bindings + name-derivation + class/disabled
```

| Случай | Регистрируется? | Получает event-handlers? |
|---|---|---|
| `<Button meta={{tags:['submit']}}>` | ✅ да | ✅ да |
| `<Field>` без своего meta | ❌ нет | ❌ нет |
| `<Field meta={{tags:['form-root']}}>` (если бы захотел подписать структуру) | ✅ да | ✅ да |
| `<Field.Label>Email</Field.Label>` | ❌ нет | ❌ нет |

`meta` стало явным opt-in флагом «элемент участвует в HCA-потоке».

## Жизненный цикл регистрации (фикс [[007-uiproxy-cleanup|ADR 007]])

```tsx
const id = createUniqueId();                           // SSR-safe, стабильный

createEffect(() => {
  const name = deriveName(props.meta);
  ctx.store.registerComponent({
    [id]: { ...props, ...(name ? { name } : {}) },
  });
});

onCleanup(() => ctx.store.unregisterComponent(id));
```

- `createUniqueId()` генерит **стабильный** id один раз на mount (не на каждый рендер).
- `createEffect` пере-регистрирует props при их изменении (зеркало store ↔ DOM).
- `onCleanup` снимает запись из стора при unmount.

После этого `store.pick / omit / match / matchEntry` отражают **именно смонтированный** набор компонентов.

## Деривация `name` (под капотом)

`name` больше не пишется в JSX. Выводится из `meta.tags`:

```ts
const deriveName = (meta) =>
  meta?.tags?.find((t) => typeof t === 'string' && !t.startsWith('@'));
```

Первый «конкретный» тег (без `@`-префикса) становится `name`:
- `meta={{tags:['email','@inputs']}}` → `name='email'`
- `meta={{tags:['submit']}}` → `name='submit'`
- `meta={{tags:['@inputs']}}` (только алиасы) → `name=undefined`

`name` затем:
1. Пишется в `store.components[id].name` — для удобной адресации.
2. Прокидывается как DOM-атрибут (для `<input name="email">`, формы, accessibility).
3. Используется в `getTargetData` → `target.name` в хэндлере.
4. Используется в `dynamicProps.class` для адресной стилизации (`store.styles[name]`).

## Перехватываемые события (см. [[009-event-interception-extension|ADR 009]])

```ts
const EVENT_HANDLERS = [
  ['onClick',   { updateStore: false }],
  ['onInput',   { updateStore: true  }],
  ['onChange',  { updateStore: true  }],
  ['onBlur',    { updateStore: false }],
  ['onFocus',   { updateStore: false }],
  ['onKeyDown', { updateStore: false }],
];
```

`updateStore: true` означает: при срабатывании автообновляется `store.components[id]` значением `target` (для инпутов и селектов).

## Дедупликация на bubbling

Каждый сработавший handler помечает `event` флагом `__capsule_<eventName>__`. Верхние обёртки в DOM-цепочке (если родитель тоже зарегистрирован) пропускают повторный вызов:

```ts
const flag = `__capsule_${eventName}__`;
return (e) => {
  if (e[flag]) return;
  e[flag] = true;
  // dispatch...
};
```

Без этого: `<Button>` внутри `<Field>` (где оба зарегистрированы) выдавал бы **два** вызова `onClick` на один клик. Теперь — ровно один (на самом target).

> [!info]
> Маркер живёт на конкретном Event-объекте, поэтому **между разными кликами** ничего не пересекается.

## Сборка `target` (что приходит в Controller)

```ts
{
  name: el?.name || derivedName || finalProps.name,
  value: el?.type === 'checkbox' ? el?.checked : (el?.value ?? finalProps.value),
  type: el?.type,
  meta:        parseMeta(el?.getAttribute?.('meta'), finalProps.meta),
  dynamicMeta: finalProps?.dynamicMeta,
  key:         e?.key,                                // для KeyboardEvent
  modifiers:   { ctrl, shift, alt, meta },
}
```

`meta` ищется сначала в DOM-атрибуте (если разработчик задал статически), потом в props — фикс старого бага с `typeof === 'object'` теперь корректный (`typeof === 'string' → JSON.parse`).

## Two-tier meta

Внутри `mergeProps` соблюдается два слоя:

| Поле в `target` | Источник | Семантика |
|---|---|---|
| `meta` | inner JSX (`<Button meta={...}>`) — побеждает в merge | **авторская роль** (зашита в Entity) |
| `dynamicMeta` | outer Entity-prop (`<LoginForm meta={...}>`) | **сценарная окраска** от Widget'а |

Один и тот же Entity можно использовать в разных Widget'ах с разными `dynamicMeta` — теги Entity не трогаются, но Controller через `pick(['@login-form'])` найдёт ровно тех, кому Widget накинул сценарий.

## Динамические props

```ts
const dynamicProps = {
  get class()    { return `${props.class || ''} ${store.styles?.[name] || ''}`.trim(); },
  get disabled() { return store.loading || props.disabled; },
  get name()     { return deriveName(props.meta); },
  ...eventBindings,
};
```

Все getter'ы реактивны — Solid пересчитает их при изменении `store.styles`/`store.loading`/`props.meta`.

## Async-ошибки

Хэндлеры вызываются через `safeCall`, который:
- ловит синхронные исключения (`try/catch`),
- цепляет `.catch` к промису, если хэндлер async.

Это закрывает старую дыру — `unhandledrejection` от падений в Controller'е больше не теряются.

## Связанное

- [[controller-proxy]]
- [[lifecycle]]
- [[tagging-system]]
- [[007-uiproxy-cleanup|ADR 007]] · [[008-hybrid-fsm-api|ADR 008]] · [[009-event-interception-extension|ADR 009]]
