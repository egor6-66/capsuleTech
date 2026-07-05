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
export const useActiveSegment = (
  ids: readonly string[],
): (() => string | undefined) => {
  const router = useRouter();
  return () => activeSegment(router.current(), ids);
};
