# Fix — activeSegment на deep-link'ах (scope `router`)

**Баг (USER, live):** на `/lessons/concepts/word-as-image` таб `concepts` гаснет. `activeSegment` сверяет **последний** кусок пути (`word-as-image` ∉ ids) вместо «мы внутри секции concepts». Латентный баг (был и в старых per-Nav копиях с той же `last`-логикой) — теперь централизован → чиним ОДИН раз для всех навов.

## Фикс — `packages/web/runtime/router/src/segments.ts`
```ts
/**
 * Активный сегмент = id из `ids`, ПРИСУТСТВУЮЩИЙ в пути (мы «внутри» секции),
 * route-prefix-агностично. Deep-link `/lessons/concepts/word-as-image` → `concepts`
 * активен, хотя последний кусок = word-as-image. Чистая функция.
 */
export const activeSegment = (
  path: string,
  ids: readonly string[],
): string | undefined => {
  const segs = path.split('/').filter(Boolean);
  return ids.find((id) => segs.includes(id));
};
```
(`useActiveSegment` не трогать — он дёргает `activeSegment`.)

## Тест — `src/__tests__/segments.test.ts` (добавить кейсы)
- `activeSegment('/lessons/concepts/word-as-image', ['concepts','rules'])` → `'concepts'` (deep-link, РЕГРЕСС-кейс).
- `activeSegment('/lessons/concepts', ['concepts','rules'])` → `'concepts'` (без deep).
- `activeSegment('/library/explorer', ['concepts','rules'])` → `undefined` (чужая секция — ни один id не в пути).
- prefix-агностичность: `/app/lessons/rules/x` + `['concepts','rules']` → `'rules'`.

## Verify
`nx run @capsuletech/web-router:test --skip-nx-cache`. После мержа live: deep-link `/learn/lessons/concepts/<word>` → таб `concepts` подсвечен.
