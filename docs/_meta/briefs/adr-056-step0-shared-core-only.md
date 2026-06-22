# Brief — shared только `solid-js` core (Шаг 0 ADR 056 финальный discriminating test)

**Zone**: `owner-vite-builder` (`packages/builders/vite/`)
**Type**: discriminating micro-test — НЕ commit.
**Tree**: main shared.

---

## Контекст

Прошлый browser run дал:
```
SyntaxError: The requested module '/@id/__x00__virtual:mf:__mfe_internal__host__loadShare__solid_mf_2_js_mf_1_web__loadShare__.js'
does not provide an export named 'setStyleProperty'
```

MF2-vite shared-loader proxy для `solid-js/web` не re-exports всех функций Solid runtime (JSX-compile-output ждёт `setStyleProperty`, `template`, `insert`, `render`, …). То есть `shared: { 'solid-js/web': singleton }` ломает Solid.

**Гипотеза**: `solid-js` core (только reactive primitives — `createSignal`, `createEffect`, `createMemo`, etc.) — узкий API surface, может пройти через MF shared без потери экспортов. `/web` и `/store` — runtime-heavy, поэтому ломаются.

Если **только core работает** → есть partial path: shared только reactivity, web/store локальные для каждого app (multi-runtime для рендера, но shared reactivity primitives).

Если **даже core ломает** → fundamental RED, ADR 056 D1 нерабочий.

## Что менять

**Один файл**: `packages/builders/vite/src/defines/capsuleConfig.ts`

В **обоих** federation() блоках (`name: 'host'` и `name: 'universal_canvas'`) убрать из `shared:` две строки:

```ts
'solid-js/web': { singleton: true },
'solid-js/store': { singleton: true },
```

Оставить только:

```ts
shared: {
  'solid-js': { singleton: true },
},
```

Остальной diagnostic patch (federation + dts:false + basename switch) — НЕ трогай.

## После правки

1. Пересборка:
   ```
   pnpm --filter @capsuletech/vite-builder build
   ```

2. **НЕ перезапускай dev-сервера** — architect это сделает сам. Только rebuild + confirm в чат.

## Что НЕ делать

- НЕ удаляй federation() блоки или dts:false.
- НЕ трогай ничего вне `packages/builders/vite/`.
- НЕ коммитить.

## После теста (architect's part)

Architect kill'ит старые серверы, запускает заново, открывает browser. Дальше — либо **partial PASS** (если ошибка про `setStyleProperty` ушла) → план revised ADR 056, либо **RED** (если новая ошибка про exports `solid-js` core) → план alt-transport.

## Связано

- [[adr-056-step0-bare-specifier-fix]] — предыдущий patch (bare specifier)
- [[adr-056-step0-mf2-diagnostic-patch]] — federation + dts:false
