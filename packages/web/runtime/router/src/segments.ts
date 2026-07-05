import { useRouter } from './context';

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

/** Реактивная обёртка над current() — отдаёт активный сегмент из URL. */
export const useActiveSegment = (
  ids: readonly string[],
): (() => string | undefined) => {
  const router = useRouter();
  return () => activeSegment(router.current(), ids);
};
