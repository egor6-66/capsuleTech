# Brief — Renderer: пустой schema-дефолт (undefined не должен ломать)

**Зона:** owner-web-renderer (`packages/web/runtime/renderer/`). Один пакет, локальная правка.
**Запуск:** `.\claude-scope.ps1 -Scope renderer`
**Тип:** commit-only (push делает architect/user после verify).

## Зачем

`<Renderer.View>` сейчас падает, если `schema === undefined`. Потребители (напр. канвас: `store?.ctx?.data?.schema` до прихода первой `setComposition`) легитимно передают `undefined` в первый кадр. Renderer должен это пережить — **коалесить в пустую схему и рендерить ничего, молча** (без краша, без warn-флуда).

## Где ломается (факт)

`renderer.tsx`, `Renderer` (public entry) дёргает `props.schema` без защиты в трёх местах:
- `validateSchema(props.schema, …)` (~562) — читает `schema.components` → throw на undefined;
- `props.schema.interactions` (~567);
- `props.schema.components.root` + `schema={props.schema}` (~577–578).

## Что сделать

1. **`types.ts`** — `IRendererProps.schema` сделать опциональным:
   ```ts
   schema?: ISchema;
   ```

2. **`renderer.tsx`** — добавить канонический пустой schema-константой + accessor-коалесинг:
   ```ts
   /** Пустой schema-дефолт: root указывает в никуда, нод нет → рендерит ничего.
    *  Коалес-таргет для undefined/absent schema, чтобы первый кадр потребителя
    *  (данные ещё не пришли) не ронял рендерер. */
   const EMPTY_SCHEMA: ISchema = { components: { root: '', nodes: {} } };
   ```
   В `Renderer`:
   ```ts
   const schema = () => props.schema ?? EMPTY_SCHEMA;
   ```
   Заменить **все** три `props.schema` на `schema()`:
   - `createEffect(() => validateSchema(schema(), warnedSchemaIssues));`
   - `activeInteractions(schema().interactions, …)`
   - `nodeId={schema().components.root}` + `schema={schema()}`.

3. **`validateSchema`** — пустую схему считать валидной (no-op, без warn). В начале функции:
   ```ts
   // Пустая схема (нет нод) — легитимное «рендерить ничего», не предупреждаем.
   if (Object.keys(nodes).length === 0) return;
   ```
   (Иначе пустой root `''` даст ложный `root-missing` warn.)

**Почему рендерит ничего без доп. правок:** `RenderNode` с `nodeId=''` → `nodes['']` undefined → `renderedTree()` уже возвращает `null` (строки ~261–262). `interactions` undefined → `activeInteractions` уже отдаёт `[]` (строка ~97). Менять `RenderNode` не нужно.

## Не делать

- НЕ трогать `RenderNode`, resolve, edit-overlay пути — они уже корректны на отсутствующей ноде.
- НЕ выносить `EMPTY_SCHEMA` в `web-contract` сейчас (это другая суб-зона). Если позже понадобится framework-wide канонический пустой — отдельный разговор. Сейчас renderer-local достаточно.
- НЕ менять сигнатуру/поведение при непустой схеме — это чистое расширение на undefined-кейс.

## Verify (обязательно, last-lines в отчёт)

- **Тест** (новый, `src/__tests__/`): `<Renderer schema={undefined} registry={{}} />` — (а) не бросает, (б) рендерит пусто, (в) console.warn НЕ вызван (можно через spy на `console.warn`). Плюс кейс `schema={EMPTY_SCHEMA-эквивалент}`.
- `pnpm --filter @capsuletech/web-renderer test` — green.
- `pnpm --filter @capsuletech/web-renderer build` — dist собран (потребители резолвят через dist).
- `pnpm exec biome check --write packages/web/runtime/renderer` + re-stage (CI biome-гейт).
- Typecheck: `pnpm nx run web-renderer:typecheck` (или run-many) — оптональный `schema?` не должен сломать существующих потребителей (они передают schema всегда).

## Связано

Прецедент 2026-06-30: canvas display.tsx убрал demoSchema-фоллбэк → `schema` стал undefined в первый кадр. [[reference_widget_store_arg_canon]].
