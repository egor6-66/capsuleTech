/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { DocsProvider } from '../provider';
import type { IDocsRegistry } from '../types';
import { useDoc } from '../useDoc';

const fixture: IDocsRegistry = {
  'architecture/adr/048-docs-as-data': {
    meta: {
      title: 'ADR 048',
      status: 'proposed',
      tags: ['adr'],
      last_updated: '2026-06-13',
      audience: ['agent', 'dev', 'user'],
    },
    sections: {
      D4: {
        heading: 'D4 — Extraction',
        level: 3,
        body: 'body markdown',
        audience: ['agent', 'dev'],
        wikilinks: [],
      },
    },
    wikilinks: [],
  },
};

/** Render a probe component that captures the hook output via callback. */
const probe = <T,>(use: () => T, registry: IDocsRegistry): T => {
  let captured: T | undefined;
  const Probe = () => {
    captured = use();
    return null;
  };
  const div = document.createElement('div');
  const dispose = render(
    () => (
      <DocsProvider registry={registry}>
        <Probe />
      </DocsProvider>
    ),
    div,
  );
  dispose();
  return captured as T;
};

describe('useDoc', () => {
  it('returns the doc entry for known slug', () => {
    const entry = probe(() => useDoc('architecture/adr/048-docs-as-data'), fixture);
    expect(entry?.meta.title).toBe('ADR 048');
    expect(entry?.sections.D4?.heading).toBe('D4 — Extraction');
  });

  it('returns undefined for unknown slug', () => {
    const entry = probe(() => useDoc('unknown-slug'), fixture);
    expect(entry).toBeUndefined();
  });

  it('throws outside DocsProvider', () => {
    const div = document.createElement('div');
    expect(() =>
      render(() => {
        useDoc('any');
        return null;
      }, div),
    ).toThrow(/DocsProvider/);
  });
});
