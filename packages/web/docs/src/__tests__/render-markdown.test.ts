import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../render-markdown';

describe('renderMarkdown — wikilinks', () => {
  it('rewrites a bare wikilink to a semantic anchor (no href)', () => {
    const html = renderMarkdown('See [[grammar-verbs-tenses]] for details.');
    expect(html).toContain(
      '<a class="wikilink" data-ref="grammar-verbs-tenses">grammar-verbs-tenses</a>',
    );
    expect(html).not.toContain('href');
  });

  it('rewrites an aliased wikilink using the label', () => {
    const html = renderMarkdown('See [[grammar-verbs-tenses|the tenses lesson]].');
    expect(html).toContain(
      '<a class="wikilink" data-ref="grammar-verbs-tenses">the tenses lesson</a>',
    );
  });

  it('escapes html-sensitive chars in ref and label', () => {
    const html = renderMarkdown('Bad [[a<b|c"d]].');
    expect(html).toContain('<a class="wikilink" data-ref="a&lt;b">c&quot;d</a>');
  });

  it('renders standard inline markdown around wikilinks', () => {
    const html = renderMarkdown('**bold** [[slug|alias]] text.');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a class="wikilink" data-ref="slug">alias</a>');
  });

  it('renders multiple wikilinks in one paragraph', () => {
    const html = renderMarkdown('[[a]] and [[b|B]] together.');
    expect(html).toContain('data-ref="a"');
    expect(html).toContain('data-ref="b"');
  });

  it('leaves unmatched brackets alone', () => {
    const html = renderMarkdown('Not a wikilink: [single] or [[unclosed.');
    expect(html).toContain('[single]');
    expect(html).toContain('[[unclosed');
  });

  it('does NOT rewrite [[…]] inside a fenced code block', () => {
    const html = renderMarkdown('```\nlink to [[slug]]\n```');
    expect(html).not.toContain('data-ref');
    expect(html).toContain('[[slug]]');
  });

  it('does NOT rewrite [[…]] inside an inline code span', () => {
    const html = renderMarkdown('use `[[slug]]` literally');
    expect(html).not.toContain('data-ref');
    expect(html).toContain('[[slug]]');
  });
});

describe('renderMarkdown — callouts', () => {
  it('rewrites a callout with a title', () => {
    const html = renderMarkdown('> [!info] Heads up\n> body text here');
    expect(html).toContain('<div class="callout callout-info">');
    expect(html).toContain('<p class="callout-title">Heads up</p>');
    expect(html).toContain('body text here');
  });

  it('supports an empty title', () => {
    const html = renderMarkdown('> [!tip]\n> just a body');
    expect(html).toContain('<div class="callout callout-tip">');
    expect(html).toContain('<p class="callout-title"></p>');
    expect(html).toContain('just a body');
  });

  it('maps each known type', () => {
    for (const type of ['info', 'tip', 'warning', 'note']) {
      const html = renderMarkdown(`> [!${type}] T\n> b`);
      expect(html).toContain(`callout callout-${type}`);
    }
  });

  it('falls back to note for an unknown type', () => {
    const html = renderMarkdown('> [!danger] Careful\n> b');
    expect(html).toContain('<div class="callout callout-note">');
    expect(html).toContain('<p class="callout-title">Careful</p>');
  });

  it('renders nested markdown in the body', () => {
    const html = renderMarkdown(
      '> [!warning] Watch out\n> some **bold** and a [[ref|link]]\n>\n> - item one\n> - item two',
    );
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a class="wikilink" data-ref="ref">link</a>');
    expect(html).toContain('<li>item one</li>');
    expect(html).toContain('<li>item two</li>');
  });

  it('leaves an ordinary blockquote untouched', () => {
    const html = renderMarkdown('> just a quote\n> second line');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('callout');
  });

  it('escapes html-sensitive chars in the title', () => {
    const html = renderMarkdown('> [!note] a<b & c\n> body');
    expect(html).toContain('<p class="callout-title">a&lt;b &amp; c</p>');
  });
});

describe('renderMarkdown — no regression', () => {
  it('renders tables', () => {
    const html = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders lists and code', () => {
    const html = renderMarkdown('- one\n- two\n\n`code`');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<code>code</code>');
  });

  it('mixes callouts, wikilinks and plain markdown in one document', () => {
    const html = renderMarkdown(
      '# Title\n\nSee [[intro]].\n\n> [!info] Note\n> body with [[more|details]]\n\nPlain paragraph.',
    );
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<a class="wikilink" data-ref="intro">intro</a>');
    expect(html).toContain('<div class="callout callout-info">');
    expect(html).toContain('<a class="wikilink" data-ref="more">details</a>');
    expect(html).toContain('Plain paragraph.');
  });
});
