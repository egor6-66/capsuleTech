# Brief 1/4 — web-router: path/segment хелперы (scope `router`)

**Пилот дедупа Nav/Welcome (канон [[feedback_product_wide_kit_layering]]).** Логика «активный сегмент по URL» скопирована 3× в learn Nav'ах. Путь ≠ UI-концерн → живёт в web-router (нужен и контроллеру/фиче, не только UI). Забираем копипасту сюда.

## Добавить

`packages/web/runtime/router/src/segments.ts`:
```ts
import { useRouter } from './context';

/**
 * Активный сегмент по последнему непустому куску пути — route-prefix-агностично
 * (подсветка работает под любым префиксом монтирования). Чистая функция.
 */
export const activeSegment = (
  path: string,
  ids: readonly string[],
): string | undefined => {
  const last = path.split('/').filter(Boolean).at(-1);
  return last && ids.includes(last) ? last : undefined;
};

/** Реактивная обёртка над current() — отдаёт активный сегмент из URL. */
export const useActiveSegment = (ids: readonly string[]): (() => string | undefined) => {
  const router = useRouter();
  return () => activeSegment(router.current(), ids);
};
```

Экспорт из `src/index.ts`:
```ts
export { activeSegment, useActiveSegment } from './segments';
```

## Тест (node-env, чистая функция)
`src/__tests__/segments.test.ts` — `activeSegment`: матч последнего сегмента; `undefined` если не в ids; prefix-агностичность (`/foo/library/explorer` + `['explorer']` → `'explorer'`); trailing slash / пустой путь.

## Verify
`nx run @capsuletech/web-router:test --skip-nx-cache` + `:typecheck`. Публичный `ICapsuleRouter` НЕ трогаем — только additive хелперы.
