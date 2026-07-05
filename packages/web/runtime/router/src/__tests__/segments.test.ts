import { describe, expect, it } from 'vitest';
import { activeSegment } from '../segments';

/**
 * `activeSegment` — чистая функция: последний непустой сегмент пути, если он
 * входит в набор известных id. Route-prefix-агностично: подсветка работает под
 * любым префиксом монтирования (важно для дедупа Nav/Welcome, канон
 * product-wide-kit-layering). Node-env — без Solid runtime.
 *
 * `useActiveSegment` — тонкая реактивная обёртка над `useRouter().current()`;
 * логика полностью в `activeSegment`, поэтому покрываем чистую функцию.
 */

describe('activeSegment', () => {
  const ids = ['library', 'explorer', 'settings'] as const;

  it('матчит последний сегмент пути', () => {
    expect(activeSegment('/library', ids)).toBe('library');
    expect(activeSegment('/explorer', ids)).toBe('explorer');
  });

  it('undefined, если последний сегмент не в ids', () => {
    expect(activeSegment('/unknown', ids)).toBeUndefined();
    expect(activeSegment('/library/detail', ids)).toBeUndefined();
  });

  it('prefix-агностично — матчит под любым префиксом монтирования', () => {
    expect(activeSegment('/foo/library/explorer', ids)).toBe('explorer');
    expect(activeSegment('/ewc/settings', ids)).toBe('settings');
  });

  it('игнорирует trailing slash', () => {
    expect(activeSegment('/library/', ids)).toBe('library');
    expect(activeSegment('/foo/explorer//', ids)).toBe('explorer');
  });

  it('undefined для пустого / корневого пути', () => {
    expect(activeSegment('', ids)).toBeUndefined();
    expect(activeSegment('/', ids)).toBeUndefined();
  });

  it('undefined для пустого набора ids', () => {
    expect(activeSegment('/library', [])).toBeUndefined();
  });
});
