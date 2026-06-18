/* @vitest-environment jsdom */
import type { IDocsRegistry } from '@capsuletech/docs-builder';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { DocPage } from '../DocPage';
import { DocsProvider } from '../provider';

const fixture: IDocsRegistry = {
  'adr/048': {
    meta: {
      title: 'ADR 048 — Docs as data',
      audience: ['agent', 'dev', 'user'],
    },
    sections: {
      context: {
        heading: 'Контекст',
        level: 2,
        body: 'context body',
        audience: ['agent', 'dev', 'user'],
        wikilinks: [],
      },
      decisions: {
        heading: 'Decisions',
        level: 2,
        body: 'decisions intro',
        audience: ['agent', 'dev', 'user'],
        wikilinks: [],
      },
      D1: {
        heading: 'D1 — Source',
        level: 3,
        parentId: 'decisions',
        body: 'D1 body',
        audience: ['agent', 'dev', 'user'],
        wikilinks: [],
      },
    },
    wikilinks: [],
  },
};

describe('<DocPage>', () => {
  it('renders title and all sections in registry order', () => {
    const div = document.createElement('div');
    render(
      () => (
        <DocsProvider registry={fixture}>
          <DocPage slug="adr/048" />
        </DocsProvider>
      ),
      div,
    );
    expect(div.querySelector('h1')?.textContent).toBe('ADR 048 — Docs as data');
    const sections = div.querySelectorAll('section[data-section-id]');
    expect(sections.length).toBe(3);
    expect((sections[0] as HTMLElement).dataset.sectionId).toBe('context');
    expect((sections[1] as HTMLElement).dataset.sectionId).toBe('decisions');
    expect((sections[2] as HTMLElement).dataset.sectionId).toBe('D1');
  });

  it('shows fallback for missing slug', () => {
    const div = document.createElement('div');
    render(
      () => (
        <DocsProvider registry={fixture}>
          <DocPage slug="missing/doc" />
        </DocsProvider>
      ),
      div,
    );
    expect(div.querySelector('.web-docs-missing')).toBeTruthy();
  });
});
