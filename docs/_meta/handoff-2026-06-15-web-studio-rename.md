# Handoff — Rename `@capsuletech/studio` → `@capsuletech/web-studio` (owner-studio scope)

Date: 2026-06-15
Coordinator: главный (parallel: infra + cross-zone consumers + apps/playground + docs)
Owner: **owner-studio**
Scope: только `packages/web/studio/**` — внутренний ренейм пакета.

---

## Контекст

Единый большой cross-zone PR. User решил:

- Пакет: `@capsuletech/studio` → `@capsuletech/web-studio` (единообразие с web-зоной, ADR 047).
- Global namespace: `Editor.*` → `WebStudio.*`.
- Controllers: `Controllers.Editor` → `Controllers.WebStudio`.
- **Ренеймим всё внутри тоже** — файлы, классы, хуки, типы. Не только глобал.

В work-tree УЖЕ есть WIP внутри пакета — сохрани его, ренейм поверх:

- `src/palette/` (новая палитра — `Palette` + `groups.ts` + тесты, регистрируется как `WebStudio.ComponentsPalette`)
- `src/capsule.ts` — модифицирован (добавлен `ComponentsPalette` слот)
- `package.json`, `vite.config.mts`, `vitest.config.ts` — модифицированы
- `vitest.setup.ts` — новый

Параллельно главный делает: `tsconfig.base.json`, `nx.json`, `packages/builders/{compliance,vite}/**`, `packages/web/kit/ui/**`, `packages/web/runtime/{data-gen,renderer}/**`, `packages/cli/src/templates/app/**`, `apps/playground/**`, `docs/**`, `.claude/agents/owner-studio.md`, `pnpm-lock.yaml` (через `pnpm install`).

Никаких git ops с твоей стороны — финальный коммит/PR делает главный.

---

## Зона ответственности (только эти пути)

`packages/web/studio/**` — твоё всё.

**НЕ трогать:** tsconfig.base.json, nx.json, packages/builders/, packages/web/kit/, packages/web/runtime/, packages/cli/, apps/, docs/, .claude/. Это сделает главный.

---

## Что сделать

### 1. `package.json`

```diff
- "name": "@capsuletech/studio",
+ "name": "@capsuletech/web-studio",
```

Остальные поля (`exports`, `peerDependencies`, `scripts`) не зависят от self-name — не трогай если они уже корректны.

### 2. `src/capsule.ts`

- `defineCapsuleModule({ name: 'Editor', ... })` → `name: 'WebStudio'`.
- Ключ в `controllers`: `{ Editor: EditorController }` → `{ WebStudio: WebStudioController }` (после ренейма класса в шаге 5).
- Ключи в `components` (Overlay / Provider / Canvas / Tree / Palette / Inspector / ComponentsPalette) — **оставь как есть** (это семантические слоты глобала `WebStudio.X`).
- Импорты обнови под новые имена файлов (шаг 4).
- JSDoc/комменты:
  - `Editor.X → components` → `WebStudio.X → components`
  - `Controllers.Editor` → `Controllers.WebStudio`
  - Абзац про «Имя 'Editor' (не 'UICreator')...» — переформулируй: зональный канон диктует `WebStudio.*` (см. ADR 047). Концепт «editor» как domain-функция остаётся в комментариях и filenames до этого ренейма; теперь идём в зональное имя.

### 3. Переименовать файлы (mv, чтобы git видел rename)

`src/controllers/`:
- `EditorOverlay.tsx` → `WebStudioOverlay.tsx`
- `EditorProvider.tsx` → `WebStudioProvider.tsx`
- `EditorCanvas.tsx` → `WebStudioCanvas.tsx`
- `EditorTree.tsx` → `WebStudioTree.tsx`
- `EditorPalette.tsx` → `WebStudioPalette.tsx`
- `EditorInspector.tsx` → `WebStudioInspector.tsx`
- `EditorController.tsx` → `WebStudioController.tsx`
- `useEditor.ts` → `useWebStudio.ts`

`src/controllers/__tests__/`:
- `EditorOverlay.test.tsx` → `WebStudioOverlay.test.tsx`
- `EditorProvider.test.tsx` → `WebStudioProvider.test.tsx`
- `EditorCanvas.test.tsx` → `WebStudioCanvas.test.tsx`
- `EditorTree.test.tsx` → `WebStudioTree.test.tsx`
- `EditorPalette.test.tsx` → `WebStudioPalette.test.tsx`
- `EditorInspector.test.tsx` → `WebStudioInspector.test.tsx`
- `EditorController.test.ts` → `WebStudioController.test.ts`

Любые другие `Editor*` файлы в подкаталогах studio (controllers/palette/, controllers/tree/, state/, manifests/, generators/, inspector/, docs/) — переименуй аналогично.

### 4. Обнови импорты внутри пакета

После mv пути поломаются. Прогон по всем `.ts/.tsx` в `packages/web/studio/`:
- `./EditorX` → `./WebStudioX`
- `../EditorX` → `../WebStudioX`
- `./useEditor` → `./useWebStudio`

### 5. Идентификаторы (классы, функции, хуки, типы)

**Компоненты/контроллеры:**
- `EditorOverlay` → `WebStudioOverlay`
- `EditorProvider` → `WebStudioProvider`
- `EditorCanvas` → `WebStudioCanvas`
- `EditorTree` → `WebStudioTree`
- `EditorPalette` → `WebStudioPalette` (не путать с новым компонентом `Palette` из `src/palette/` — он остаётся `Palette`, регистрируется как `WebStudio.ComponentsPalette`)
- `EditorInspector` → `WebStudioInspector`
- `EditorController` → `WebStudioController`

**Хуки:**
- `useEditor` → `useWebStudio`
- `useEditorKit` → `useWebStudioKit`

**Типы:**
- `IEditorNode` → `IWebStudioNode`
- `IEditorTree` → `IWebStudioTree`
- `IEditorState` → `IWebStudioState`
- Все остальные `IEditor*` типы → `IWebStudio*`

**Прочее:** все `Editor*`/`useEditor*`/`IEditor*` идентификаторы которые встретятся в коде.

**Исключения (НЕ переименовывать):**
- Слово «editor» в JSDoc/комментах как описание use-case («визуальный редактор», «editor canvas overlay», «editor-нода») — это нормальная человеческая речь, остаётся.
- Если встретятся `data-editor-*` атрибуты — это публичный DOM-контракт; спроси прежде чем менять (по идее тоже нужно ренеймить в `data-web-studio-*`, но согласуй).

### 6. Refs к глобалам внутри пакета

В файлах пакета (особенно `useEditor.ts` после ренейма, и все тесты в `__tests__/` которые мокают глобалы):

- `Controllers.Editor` → `Controllers.WebStudio`
- `Editor.Provider` / `Editor.Canvas` / `Editor.Palette` / `Editor.Tree` / `Editor.Overlay` / `Editor.Inspector` / `Editor.ComponentsPalette` → `WebStudio.*`

### 7. README.md, OWNERSHIP.md, CHANGELOG.md

Внутри `packages/web/studio/`:
- README: package name + namespace refs.
- OWNERSHIP: name пакета + namespace refs + section про публичный API.
- CHANGELOG — добавь:
  ```markdown
  ## Unreleased

  - **BREAKING**: package renamed `@capsuletech/studio` → `@capsuletech/web-studio` (zone-naming consistency, ADR 047)
  - **BREAKING**: global namespace `Editor.*` → `WebStudio.*`, `Controllers.Editor` → `Controllers.WebStudio`
  - internal types `IEditorNode` / `IEditorTree` / `IEditorState` → `IWebStudio*`
  - internal components/hooks `EditorX` / `useEditor` → `WebStudioX` / `useWebStudio`
  ```

### 8. Прочие файлы

- `project.json` — если поле `name` ссылается на `@capsuletech/studio`, обнови.
- `src/docs/index.ts` — если экспортит docs-anchor с package name, обнови.
- `vitest.setup.ts` — если упоминает имя пакета или Editor*, обнови.
- `vite.config.mts`, `vitest.config.ts` — проверь поля типа `name` / aliases.

---

## Валидация

- `pnpm --filter @capsuletech/web-studio test` (новое имя!). Если pnpm не резолвит новое имя без install — это ОК, главный сделает install. Главное чтобы файлы пакета были консистентны.
- Если упадут внутренние тесты — фикси (импорты, namespace refs, type-name мисматчи).
- Тесты для новой `src/palette/` (WIP) должны жить и проходить.

---

## Отчёт

Когда закончишь, дай главному компактный отчёт:

1. Сколько файлов переименовано (короткой таблицей: старое → новое).
2. Сколько identifier-замен сделано (без построчного diff'а).
3. Результат `pnpm --filter @capsuletech/web-studio test` (или почему не запустилось).
4. Места где сознательно оставил `Editor`/`editor` (комменты, спорные data-атрибуты).

---

## Что НЕ делать

- НЕ git add / commit / push / branch — финал делает главный.
- НЕ трогать файлы вне `packages/web/studio/**`.
- НЕ переименовывать слово «editor» в человеческих описаниях/JSDoc.
- НЕ удалять старый `EditorPalette` контроллер (старая DnD-палитра) — это второй компонент, остаётся в работе, переименовывается в `WebStudioPalette`.
