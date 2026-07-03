# Brief — web-core: снять orphaned `ui.Animate` из allowlist guard-теста + self-check от рота

**Зона:** owner-web-core (`packages/web/runtime/core/`). Один файл:
`src/ui-kit/__tests__/manifest-path-invariant.test.ts`.
**Запуск:** `.\claude-scope.ps1 -Scope core`. **Тип:** commit-only (push делает architect).
**Приоритет:** low (hygiene, однострочник + мини-тест).

## Проблема

Строка 49: `const ALLOWLIST = new Set<string>(['ui.Animate']);` — манифест `ui.Animate` давно
удалён из web-ui (iter 3 universal-canvas, ~2026-06-29), запись orphaned: тест зелёный, но cruft.
В файле УЖЕ есть тест «allowlist has no stale entries» — но он ловит обратное направление
(entry, который ТЕПЕРЬ резолвится, надо снять). Кейс «entry ссылается на несуществующий манифест
вообще» не ловится ничем — так `ui.Animate` и прожил месяц.

## Фикс (патч подготовлен, применить + прогнать)

1. `ALLOWLIST` → пустой: `new Set<string>([])` с коротким комментом (формат: `'ui.X'`).
   Обоснование-блок про Animate wrapper-категорию в шапке (строки ~37-48) ужать до generic-описания
   конвенции allowlist'а.
2. Self-check от будущего рота — orphaned-entry тест (отличный от существующего stale-теста):

```ts
it('allowlist entries reference existing manifests', () => {
  const manifestTypes = new Set(getAllManifests().map((m) => m.type));
  const orphaned = [...ALLOWLIST].filter((type) => !manifestTypes.has(type));

  expect(orphaned).toEqual([]);
});
```

(Стиль/импорты — как в существующих тестах файла; `getAllManifests` там уже используется.)

## Verify (last-lines в отчёт)

- `pnpm --filter @capsuletech/web-core test` (минимум `-- manifest-path-invariant`) + `pnpm nx run @capsuletech/web-core:typecheck`.
- `pnpm exec biome check --write packages/web/runtime/core` + re-stage.
- НЕ коммитить — правки оставить в дереве, commit/PR делает architect.

## Связано

Долг из checkpoint 2026-06-29 (iter 3: «Allowlist rot»). Парная волна — `web-ui-separator-decorative.md`.
