# Brief — compliance zone-canon: новая зона `workspace` (scope `compliance`)

> Запуск: `claude-scope -Scope compliance` (пакет `@capsuletech/compliance` в packages/builders/; отдельного «builders»-скоупа нет — скоуп резолвится по пакету).

**Контекст:** ADR 047 **Amendment D7**. Введена зона-каталог `workspace` = апп-хосты `web-studio` + `web-learn` + общий (будущий) `web-workspace`. Плоская зона `studio` (sole-inhabitant) уходит; `web-learn` **впервые** встаёт в канон (раньше был слепым пятном — `classifyZone` → null). Файлы уже физически на `packages/web/workspace/{studio,learn}/`.

**Жёсткое правило (мандат user):** апп-члены `web-studio` ⊥ `web-learn` — импорт друг в друга **запрещён линтером** (модуль не пускает корни в соседа). Оба могут импортить **только** общий `web-workspace`. `web-workspace` потребителей не знает (shared ↛ app).

Файлы: `packages/builders/compliance/src/zones.ts`, `.../src/check.ts` (path-reconstruction), `.../src/__tests__/zones.test.ts`.

---

## `zones.ts` — точечные правки

**1. `Zone` type** (`'studio'` → `'workspace'`):
```ts
export type Zone = 'kit' | 'runtime' | 'domain' | 'boost' | 'workspace';
```

**2. `ZONE_RX`** — заменить строку studio:
```ts
  ['workspace', /[\\/]packages[\\/]web[\\/]workspace[\\/]/],
```

**3. `extractZonePackage`** — УДАЛИТЬ sole-inhabitant спец-кейс studio. `workspace` использует обычную `<zone>/<pkg>` экстракцию (studio/learn/kit — реальные субдиры):
```ts
export const extractZonePackage = (absPath: string, zone: Zone | null): string | null => {
  if (!zone) return null;
  const rx = new RegExp(`[\\\\/]packages[\\\\/]web[\\\\/]${zone}[\\\\/]([^\\\\/]+)[\\\\/]`);
  const m = absPath.match(rx);
  return m ? m[1] : null;
};
```
(строку `if (zone === 'studio') return 'studio';` убрать; комментарий про sole-inhabitant тоже.)

**4. `NO_PREFIX_PKG_DIRS`** — убрать упоминание «studio handled separately (whole zone)» из комментария (больше не whole-zone).

**5. `PACKAGE_TO_ZONE`** — заменить studio-строку на три:
```ts
  // workspace (апп-хосты + общий kit; ADR 047 D7)
  '@capsuletech/web-studio': 'workspace',
  '@capsuletech/web-learn': 'workspace',
  '@capsuletech/web-workspace': 'workspace',
```

**6. `ZONE_ALLOWED_DEPS`** — заменить studio-ключ:
```ts
  // workspace — апп-хосты, потребляют всё нижнее (наследуют host-роль студии).
  workspace: new Set<Zone>(['workspace', 'kit', 'runtime', 'boost', 'domain']),
```

**7. `isZoneImportAllowed`** — добавить спец-кейс ПЕРЕД финальным return (по образцу cross-domain):
```ts
  // Внутри workspace: апп-члены (web-studio/web-learn) ⊥ друг друга; разрешён
  // импорт ТОЛЬКО общего web-workspace (designated shared). ADR 047 D7.
  if (fromZone === 'workspace' && targetZone === 'workspace' && fromPkg !== targetPkg) {
    return targetPkg === '@capsuletech/web-workspace';
  }
```
(эта строка покрывает и app→shared allowed, и app↔app forbidden, и shared→app forbidden.)

## `check.ts` — path-reconstruction

Найти спец-кейс, реконструирующий npm-имя из studio-пути (был «whole zone без префикса», см. коммент в zones.ts / ADR 047 D6 cost). Для `workspace` имя = `@capsuletech/web-<pkgDir>` по обычному правилу (studio→web-studio, learn→web-learn, kit→web-workspace). ⚠️ `kit` субдир → имя `web-workspace` (НЕ `web-kit`) — это исключение, добавить в маппинг (аналогично `NO_PREFIX_PKG_DIRS`, но тут rename-исключение). Свериться с фактическим кодом check.ts.

## `zones.test.ts` — переписать

- `classifyZone`/`extractZonePackage`/`PACKAGE_TO_ZONE`/`ZONE_ALLOWED_DEPS`/`check` studio-кейсы → `workspace` (пути `packages/web/workspace/studio/...`).
- Добавить кейсы: `web-studio` → `web-learn` = **cross-zone violation** (app⊥app); `web-studio` → `web-workspace` = **allowed**; `web-workspace` → `web-studio` = **violation** (shared↛app); `web-learn` → `web-workspace` = allowed; `workspace` → kit/runtime/boost/domain = allowed.
- `each zone allows itself` — обновить список зон на `['kit','runtime','boost','domain','workspace']`.

## Verify
```
npx nx run @capsuletech/compliance:test --skip-nx-cache
npx nx run @capsuletech/compliance:typecheck
```

**Примечание:** `web-workspace` пакета ещё нет (скаффолдится следующим шагом) — forward-ref в PACKAGE_TO_ZONE безвреден. `web-learn` встал в канон впервые: если после регистрации всплывут его старые cross-zone импорты — это НЕ регресс, а закрытие дыры; зафиксировать список architect'у (не глушить).
