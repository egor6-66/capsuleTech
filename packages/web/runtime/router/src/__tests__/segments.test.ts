import { describe, expect, it } from 'vitest';
import { activeSegment } from '../segments';

/**
 * `activeSegment` — чистая функция: id из набора известных секций, ПРИСУТСТВУЮЩИЙ
 * в пути (мы «внутри» этой секции), а не последний кусок пути. Deep-link
 * `/lessons/concepts/word-as-image` → секция `concepts` активна, хотя последний
 * кусок = `word-as-image`. Route-prefix-агностично: подсветка работает под любым
 * префиксом монтирования (важно для дедупа Nav/Welcome, канон
 * product-wide-kit-layering). Node-env — без Solid runtime.
 *
 * `useActiveSegment` — тонкая реактивная обёртка над `useRouter().current()`;
 * логика полностью в `activeSegment`, поэтому покрываем чистую функцию.
 */

describe('activeSegment', () => {
  const ids = ['library', 'explorer', 'settings'] as const;

  it('матчит id секции, присутствующий в пути', () => {
    expect(activeSegment('/library', ids)).toBe('library');
    expect(activeSegment('/explorer', ids)).toBe('explorer');
  });

  it('deep-link: активна секция, а не последний кусок пути (регресс)', () => {
    expect(activeSegment('/lessons/concepts/word-as-image', ['concepts', 'rules'])).toBe(
      'concepts',
    );
    expect(activeSegment('/lessons/concepts', ['concepts', 'rules'])).toBe('concepts');
    // секция активна, даже если за ней вложенный роут
    expect(activeSegment('/library/detail', ids)).toBe('library');
  });

  it('undefined, когда ни один id не в пути (чужая секция)', () => {
    expect(activeSegment('/unknown', ids)).toBeUndefined();
    expect(activeSegment('/library/explorer', ['concepts', 'rules'])).toBeUndefined();
  });

  it('prefix-агностично — матчит под любым префиксом монтирования', () => {
    expect(activeSegment('/ewc/settings', ids)).toBe('settings');
    expect(activeSegment('/app/lessons/rules/x', ['concepts', 'rules'])).toBe('rules');
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
