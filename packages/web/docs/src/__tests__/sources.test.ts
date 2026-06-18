import type { IDocsRegistry } from '@capsuletech/docs-builder';
import { afterEach, describe, expect, it } from 'vitest';
import {
  _resetDocsSources,
  hasDocsSources,
  loadDoc,
  loadRegistry,
  setDocsSources,
} from '../sources';

const makeRegistry = (entries: Record<string, { title: string }>): IDocsRegistry =>
  Object.fromEntries(
    Object.entries(entries).map(([slug, e]) => [
      slug,
      {
        meta: { title: e.title, audience: ['dev'] },
        sections: {},
        wikilinks: [],
      },
    ]),
  );

describe('docs sources singleton', () => {
  afterEach(() => {
    _resetDocsSources();
  });

  it('hasDocsSources reports empty by default', () => {
    expect(hasDocsSources()).toBe(false);
  });

  it('hasDocsSources reports true after register', () => {
    setDocsSources({
      'web-ui': async () => ({ default: makeRegistry({ 'web-ui/button': { title: 'Button' } }) }),
    });
    expect(hasDocsSources()).toBe(true);
  });

  it('loadDoc resolves via slug-prefix dispatch', async () => {
    setDocsSources({
      'web-ui': async () => ({ default: makeRegistry({ 'web-ui/button': { title: 'Button' } }) }),
    });
    const entry = await loadDoc('web-ui/button');
    expect(entry?.meta.title).toBe('Button');
  });

  it('loadDoc returns null when slug has no matching prefix and no root', async () => {
    setDocsSources({
      'web-ui': async () => ({ default: makeRegistry({ 'web-ui/button': { title: 'Button' } }) }),
    });
    const entry = await loadDoc('mylib/foo');
    expect(entry).toBeNull();
  });

  it('loadDoc falls back to root for unknown prefix', async () => {
    setDocsSources({
      root: async () => ({
        default: makeRegistry({ 'architecture/adr/048': { title: 'ADR 048' } }),
      }),
    });
    const entry = await loadDoc('architecture/adr/048');
    expect(entry?.meta.title).toBe('ADR 048');
  });

  it('loadDoc returns null when doc missing in registry', async () => {
    setDocsSources({
      'web-ui': async () => ({ default: makeRegistry({ 'web-ui/button': { title: 'Button' } }) }),
    });
    const entry = await loadDoc('web-ui/unknown');
    expect(entry).toBeNull();
  });

  it('loadDoc strips section anchor from slug', async () => {
    setDocsSources({
      'web-ui': async () => ({ default: makeRegistry({ 'web-ui/button': { title: 'Button' } }) }),
    });
    const entry = await loadDoc('web-ui/button#props');
    expect(entry?.meta.title).toBe('Button');
  });

  it('loader is cached after first call', async () => {
    let calls = 0;
    setDocsSources({
      'web-ui': async () => {
        calls += 1;
        return { default: makeRegistry({ 'web-ui/button': { title: 'Button' } }) };
      },
    });
    await loadDoc('web-ui/button');
    await loadDoc('web-ui/button');
    await loadDoc('web-ui/other');
    expect(calls).toBe(1);
  });

  it('loadRegistry returns full registry for a key', async () => {
    setDocsSources({
      'web-ui': async () => ({
        default: makeRegistry({
          'web-ui/button': { title: 'Button' },
          'web-ui/card': { title: 'Card' },
        }),
      }),
    });
    const reg = await loadRegistry('web-ui');
    expect(reg && Object.keys(reg).sort()).toEqual(['web-ui/button', 'web-ui/card']);
  });

  it('loadRegistry returns null for unknown key', async () => {
    const reg = await loadRegistry('missing');
    expect(reg).toBeNull();
  });

  it('accepts loader returning a bare registry (no default wrapper)', async () => {
    setDocsSources({
      'web-ui': async () => makeRegistry({ 'web-ui/button': { title: 'Button' } }),
    });
    const entry = await loadDoc('web-ui/button');
    expect(entry?.meta.title).toBe('Button');
  });
});