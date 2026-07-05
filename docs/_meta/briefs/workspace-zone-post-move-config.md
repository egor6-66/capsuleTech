# Brief — post-move конфиг-фикс web-studio / web-learn (зона `workspace`)

**Контекст:** ADR 047 Amendment D7. Architect перенёс `packages/web/studio` → `packages/web/workspace/studio` и `packages/web/learn` → `packages/web/workspace/learn` (git mv по-файлово, tsconfig.base.json уже обновлён, `pnpm install` сделан). Пакеты теперь **на один уровень глубже**, поэтому depth-зависимые относительные пути в двух конфиг-файлах каждого пакета указывают мимо. Scope-fence не пустил architect'а внутрь пакетов — доделывают owner'ы.

**Симптом (текущий, до фикса):** `nx run-many -t typecheck -p @capsuletech/web-studio @capsuletech/web-learn` красный: `--jsx is not set`, `moduleResolution`, web-ui subpaths не резолвятся — всё downstream от того, что пакетный `tsconfig.json` больше не наследует `tsconfig.base.json`.

---

## owner-studio (scope `studio`) — 3 правки

`packages/web/workspace/studio/tsconfig.json`:
```jsonc
// было
"extends": "../../../tsconfig.base.json",
// стало (+1 уровень)
"extends": "../../../../tsconfig.base.json",
```

`packages/web/workspace/studio/project.json`:
```jsonc
// было
"$schema": "../../../../node_modules/nx/schemas/project-schema.json",
"sourceRoot": "packages/web/studio/src",
// стало
"$schema": "../../../../../node_modules/nx/schemas/project-schema.json",
"sourceRoot": "packages/web/workspace/studio/src",
```

`packages/web/workspace/studio/OWNERSHIP.md` — во фронтматтере:
```yaml
# было
zone: studio
# стало
zone: workspace
```

## owner-learn (scope `learn`) — те же 3 правки

`packages/web/workspace/learn/tsconfig.json`:
```jsonc
"extends": "../../../../tsconfig.base.json",   // было ../../../
```

`packages/web/workspace/learn/project.json`:
```jsonc
"$schema": "../../../../../node_modules/nx/schemas/project-schema.json",
"sourceRoot": "packages/web/workspace/learn/src",
```

`packages/web/workspace/learn/OWNERSHIP.md` — `zone: learn` → `zone: workspace` (если поля нет — добавить; learn впервые встаёт в канон зон).

---

## Verify (каждый owner в своём scope)
```
npx nx run @capsuletech/web-studio:typecheck --skip-nx-cache   # (или web-learn)
```
Должно стать зелёным. Если после depth-фикса всплывает НЕ-конфиг ошибка — это реальная поломка переезда, эскалировать architect'у (не глушить).

**НЕ трогать:** содержимое src, публичный API, tsconfig.base.json (root, зона architect), zones.ts (owner-builders, отдельный бриф).
