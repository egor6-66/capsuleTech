# Brief — owner-web-renderer: `/capsule`-регистрация (рендерер как глобал)

**Зона:** `packages/web/runtime/renderer/` (scope `renderer`).
**Итерация:** universal-canvas iter 1 — «подтянуть рендерер в апп».
**Тип:** мелкая обвязка по прецеденту `@capsuletech/web-remote`. Движок не трогаем.

## Зачем

`apps/universal-canvas` — это **app**, а app-коду нельзя `import { Renderer } from '@capsuletech/web-renderer'` (compliance `app-package-import` = structural error, валит CI). В студии барьера нет (пакет→пакет), а в аппе есть.

Значит апп должен получить рендерер **глобалом** через `/capsule`-манифест (как `Remote.*`, `Maps.*`, `Layouts.Matrix`). У рендерера этого манифеста нет — единственный отсутствующий кусок. Фреймворк его уже ждёт: `packages/web/runtime/core/src/app-config.ts` документирует `@capsuletech/web-renderer` как глобал-кандидат.

Целевой глобал: `Renderer.View` → `<Renderer.View schema={...} registry={...} mode? />`.

## Что сделать (3 правки, зеркало web-remote)

### 1. `src/capsule.ts` (новый файл)

```ts
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { Renderer } from './renderer';

export default defineCapsuleModule({
  name: 'Renderer', // НЕ JS-builtin → TS2451 не грозит; апп берёт строкой, без { use, as }
  components: { View: Renderer },
});
```

### 2. `package.json`

- В `exports` добавить субпат (рядом с `"."`):
```jsonc
"./capsule": {
  "types": "./dist/capsule.d.ts",
  "import": "./dist/capsule.mjs",
  "default": "./dist/capsule.mjs"
}
```
- В `dependencies` добавить `@capsuletech/web-core: "workspace:*"` (нужен для `@capsuletech/web-core/module`; сейчас в deps только `web-contract`). Цикла нет — web-core не зависит от web-renderer.

### 3. `vite.config.mts` — multi-entry

Сейчас single-entry. Перевести на объект-entry (точь-в-точь как `packages/web/runtime/remote/vite.config.mts`):

```ts
export default libConfig({
  entry: {
    index: 'src/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleRenderer',
});
```

## Acceptance (owner гоняет ДО возврата, commit-only — НЕ push)

1. `pnpm --filter @capsuletech/web-renderer build` → green, в `dist/` появились `capsule.mjs` + `capsule.d.ts`.
2. `pnpm --filter @capsuletech/web-renderer test` → green (движок не менялся, тесты как были).
3. `pnpm --filter @capsuletech/web-renderer typecheck` (или `pnpm nx typecheck web-renderer`) → green.
4. `pnpm exec biome check --write packages/web/runtime/renderer` → чисто, re-stage.
5. `git commit` со scope-тегом, **без push**. Вернуть architect'у last-lines билда.

## Чего НЕ делать

- Не трогать `src/renderer.tsx` / `resolve.ts` / `types.ts` (движок готов).
- Не править `tsconfig.base.json` (root, architect добавит path `@capsuletech/web-renderer/capsule`).
- Не править апп / capsule.app.ts (architect, часть B).

## После owner'а (часть B, architect)

- `tsconfig.base.json`: path `@capsuletech/web-renderer/capsule` → `src/capsule.ts`.
- `apps/universal-canvas/capsule.app.ts`: `packages: ['@capsuletech/web-renderer']`.
- `widgets/display.tsx`: registry из глобалов + демо-схема → `<Renderer.View schema registry/>`.
- Проверка optimizeDeps.exclude / dev-restart, browser-verify в :3000.
