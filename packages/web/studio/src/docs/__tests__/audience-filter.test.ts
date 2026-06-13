import { describe, expect, it } from 'vitest';
import { filterBodyByAudience } from '../audience-filter';

describe('filterBodyByAudience', () => {
  it('returns body unchanged when no filter requested (strips comment markers)', () => {
    const body = 'before <!-- audience: agent -->content<!-- /audience --> after';
    expect(filterBodyByAudience(body)).toBe('before content after');
  });

  it('keeps blocks whose audience intersects the requested set', () => {
    const body = '<!-- audience: agent,dev --> A <!-- /audience -->';
    expect(filterBodyByAudience(body, ['dev'])).toBe(' A ');
  });

  it('drops blocks whose audience does not intersect', () => {
    const body = 'pre <!-- audience: agent --> A <!-- /audience --> post';
    expect(filterBodyByAudience(body, ['user'])).toBe('pre  post');
  });

  it('handles multi-line blocks', () => {
    const body = '<!-- audience: dev -->\nline1\nline2\n<!-- /audience -->';
    expect(filterBodyByAudience(body, ['dev'])).toBe('\nline1\nline2\n');
  });

  it('strips multiple blocks independently', () => {
    const body =
      '<!-- audience: agent --> A <!-- /audience --> mid <!-- audience: dev --> B <!-- /audience -->';
    expect(filterBodyByAudience(body, ['dev'])).toBe(' mid  B ');
  });

  it('handles comma+space audience lists', () => {
    const body = '<!-- audience: agent, dev --> X <!-- /audience -->';
    expect(filterBodyByAudience(body, ['dev'])).toBe(' X ');
  });

  it('returns empty filter unchanged behaviour when audience: [] passed', () => {
    const body = '<!-- audience: agent --> A <!-- /audience -->';
    expect(filterBodyByAudience(body, [])).toBe(' A ');
  });
});
