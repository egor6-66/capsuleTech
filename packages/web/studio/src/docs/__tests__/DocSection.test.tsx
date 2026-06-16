/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { DocSection } from '../DocSection';
import { DocsProvider } from '../provider';
import type { IDocsRegistry } from '../types';

const fixture: IDocsRegistry = {
  'adr/048': {
    meta: {
      title: 'ADR 048',
      audience: ['agent', 'dev', 'user'],
    },
    sections: {
      D4: {
        heading: 'D4 — Extraction',
        level: 3,
        body: 'Plain **markdown** body.',
        audience: ['agent', 'dev', 'user'],
        wikilinks: [],
      },
      audienceMix: {
        heading: 'Mixed',
        level: 3,
        body: 'before <!-- audience: agent --> AGENT_ONLY <!-- /audience --> after',
        audience: ['agent', 'dev'],
        wikilinks: [],
      },
    },
    wikilinks: [],
  },
};

const renderSection = (body: () => HTMLDivElement, Children: () => unknown): (() => void) => {
  const div = body();
  return render(() => Children() as never, div);
};

describe('<DocSection>', () => {
  it('renders the requested section body as HTML', () => {
    const div = document.createElement('div');
    renderSection(
      () => div,
      () => (
        <DocsProvider registry={fixture}>
          <DocSection slug="adr/048#D4" />
        </DocsProvider>
      ),
    );
    expect(div.querySelector('section')?.dataset.slug).toBe('adr/048#D4');
    expect(div.innerHTML).toContain('<strong>markdown</strong>');
  });

  it('shows fallback when section is missing', () => {
    const div = document.createElement('div');
    renderSection(
      () => div,
      () => (
        <DocsProvider registry={fixture}>
          <DocSection slug="adr/048#missingId" />
        </DocsProvider>
      ),
    );
    expect(div.querySelector('.studio-docs-missing')).toBeTruthy();
  });

  it('shows fallback when doc is missing', () => {
    const div = document.createElement('div');
    renderSection(
      () => div,
      () => (
        <DocsProvider registry={fixture}>
          <DocSection slug="adr/999#D1" />
        </DocsProvider>
      ),
    );
    expect(div.querySelector('.studio-docs-missing')).toBeTruthy();
  });

  it('audience filter keeps matching blocks', () => {
    const div = document.createElement('div');
    renderSection(
      () => div,
      () => (
        <DocsProvider registry={fixture}>
          <DocSection slug="adr/048#audienceMix" audience={['agent']} />
        </DocsProvider>
      ),
    );
    expect(div.innerHTML).toContain('AGENT_ONLY');
  });

  it('audience filter drops non-matching blocks', () => {
    const div = document.createElement('div');
    renderSection(
      () => div,
      () => (
        <DocsProvider registry={fixture}>
          <DocSection slug="adr/048#audienceMix" audience={['user']} />
        </DocsProvider>
      ),
    );
    expect(div.innerHTML).not.toContain('AGENT_ONLY');
    expect(div.innerHTML).toContain('before');
    expect(div.innerHTML).toContain('after');
  });

  it('custom fallback overrides default', () => {
    const div = document.createElement('div');
    renderSection(
      () => div,
      () => (
        <DocsProvider registry={fixture}>
          <DocSection slug="missing#x" fallback={<div class="custom-fb">CUSTOM</div>} />
        </DocsProvider>
      ),
    );
    expect(div.querySelector('.custom-fb')?.textContent).toBe('CUSTOM');
  });
});
