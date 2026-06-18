import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../render-markdown';

describe('renderMarkdown — wikilink rewrite', () => {
  it('rewrites bare wikilink to anchor with data-wikilink', () => {
    const html = renderMarkdown('See [[web-ui/button]] for details.');
    expect(html).toContain('<a href="#web-ui/button" data-wikilink="web-ui/button">web-ui/button</a>');
  });

  it('rewrites aliased wikilink', () => {
    const html = renderMarkdown('See [[web-ui/button|the Button doc]].');
    expect(html).toContain(
      '<a href="#web-ui/button" data-wikilink="web-ui/button">the Button doc</a>',
    );
  });

  it('handles section anchor in slug', () => {
    const html = renderMarkdown('See [[web-ui/button#props]].');
    expect(html).toContain(
      '<a href="#web-ui/button#props" data-wikilink="web-ui/button#props">web-ui/button#props</a>',
    );
  });

  it('escapes html-sensitive chars in slug and alias', () => {
    const html = renderMarkdown('Bad [[a<b|c"d]].');
    expect(html).toContain('<a href="#a&lt;b" data-wikilink="a&lt;b">c&quot;d</a>');
  });

  it('renders standard markdown around wikilinks', () => {
    const html = renderMarkdown('**bold** [[slug|alias]] text.');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a href="#slug" data-wikilink="slug">alias</a>');
  });

  it('renders multiple wikilinks in one paragraph', () => {
    const html = renderMarkdown('[[a]] and [[b|B]] together.');
    expect(html).toContain('data-wikilink="a"');
    expect(html).toContain('data-wikilink="b"');
  });

  it('leaves unmatched brackets alone', () => {
    const html = renderMarkdown('Not a wikilink: [single] or [[unclosed.');
    expect(html).toContain('[single]');
    expect(html).toContain('[[unclosed');
  });
});
