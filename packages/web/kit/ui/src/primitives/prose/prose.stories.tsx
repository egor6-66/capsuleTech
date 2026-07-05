import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Prose } from './prose';

const meta = {
  title: 'ComponentsPalette/Prose',
  component: Prose,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
    },
  },
  args: { size: 'md' },
  decorators: [
    (Story) => (
      <div class="max-w-3xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Prose>;

export default meta;
type Story = StoryObj<typeof meta>;

// Курируемый markdown уже отрендерен в HTML (в проде — через renderMarkdown из
// web-docs). Главный кейс — грамматическая таблица.
const GRAMMAR_HTML = `
  <h1>Present Simple</h1>
  <p>The <strong>Present Simple</strong> tense is used for regular actions, habits and
  general truths. It is one of the most common tenses in English — see
  <a href="#">the reference</a> for edge cases.</p>

  <h2>Formation</h2>
  <p>The base form of the verb; add <code>-s</code> / <code>-es</code> in the third person
  singular.</p>

  <table>
    <thead>
      <tr><th>Person</th><th>Affirmative</th><th>Negative</th><th>Question</th></tr>
    </thead>
    <tbody>
      <tr><td>I / you / we / they</td><td>work</td><td>do not work</td><td>Do … work?</td></tr>
      <tr><td>he / she / it</td><td>work<strong>s</strong></td><td>does not work</td><td>Does … work?</td></tr>
    </tbody>
  </table>

  <h2>Spelling of the -s ending</h2>
  <table>
    <thead><tr><th>Rule</th><th>Example</th></tr></thead>
    <tbody>
      <tr><td>most verbs: <code>+s</code></td><td>read → reads</td></tr>
      <tr><td>-ss, -sh, -ch, -x, -o: <code>+es</code></td><td>go → goes, watch → watches</td></tr>
      <tr><td>consonant + y: <code>y → ies</code></td><td>study → studies</td></tr>
    </tbody>
  </table>

  <h3>Common uses</h3>
  <ul>
    <li>Habits and routines: <em>I drink coffee every morning.</em></li>
    <li>General truths: <em>Water boils at 100°C.</em></li>
    <li>Timetables: <em>The train leaves at 6.</em></li>
  </ul>

  <blockquote>Remember: the <code>-s</code> ending appears <strong>only</strong> in the third
  person singular.</blockquote>

  <h4>Code note</h4>
  <pre><code>const conjugate = (verb) =&gt; verb + 's';</code></pre>

  <hr/>
  <p>See also: Present Continuous, Past Simple.</p>
`;

/** Главный кейс: грамматическая таблица — должна выглядеть как документ, не как каша. */
export const GrammarDocument: Story = {
  name: 'grammar document (tables · main case)',
  args: { size: 'md' },
  render: (args) => <Prose {...args} innerHTML={GRAMMAR_HTML} />,
};

/** Компакт-режим для боковых панелей / studio Info. */
export const CompactPanel: Story = {
  name: 'compact (size=sm) — panels / Info',
  args: { size: 'sm' },
  render: (args) => (
    <div class="max-w-sm rounded-lg border p-4">
      <Prose {...args} innerHTML={GRAMMAR_HTML} />
    </div>
  ),
};

/** Content через children (JSX), а не innerHTML. */
export const ChildrenMode: Story = {
  name: 'children (JSX) mode',
  args: { size: 'md' },
  render: (args) => (
    <Prose {...args}>
      <h2>Rendered from JSX</h2>
      <p>
        Prose также стилизует прямой JSX-контент — те же токены, тот же ритм, что и для{' '}
        <code>innerHTML</code>.
      </p>
      <ul>
        <li>Первый пункт</li>
        <li>Второй пункт</li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>Column A</th>
            <th>Column B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>row 1</td>
            <td>value</td>
          </tr>
          <tr>
            <td>row 2</td>
            <td>value</td>
          </tr>
        </tbody>
      </table>
    </Prose>
  ),
};

// renderMarkdown (web-docs) выдаёт семантику Obsidian-callout'ов и wikilink'ов;
// Prose её красит. HTML здесь — то, что вернёт renderMarkdown в проде.
const CALLOUTS_HTML = `
  <h2>Callouts &amp; wikilinks</h2>
  <p>Учительский markdown с Obsidian-callout'ами и внутренними ссылками —
  переход по <a class="wikilink" data-ref="grammar-verbs-tenses">временам глагола</a>
  вешает потребитель (web-learn) по <code>data-ref</code>.</p>

  <div class="callout callout-info">
    <p class="callout-title">Информация</p>
    <p>Present Simple используется для регулярных действий и общих истин.</p>
  </div>

  <div class="callout callout-tip">
    <p class="callout-title">Совет</p>
    <p>Запомни окончание <code>-s</code> для третьего лица единственного числа.</p>
  </div>

  <div class="callout callout-warning">
    <p class="callout-title">Внимание</p>
    <p>Не путай Present Simple с Present Continuous — см.
    <a class="wikilink" data-ref="present-continuous">Present Continuous</a>.</p>
  </div>

  <div class="callout callout-note">
    <p class="callout-title">Заметка</p>
    <p>Callout без заголовка тоже валиден — тело рендерится как обычный markdown
    со списком:</p>
    <ul><li>habits</li><li>general truths</li><li>timetables</li></ul>
  </div>
`;

/** Callout-блоки (4 типа) + wikilink-акцент — семантика из renderMarkdown. */
export const CalloutsAndWikilinks: Story = {
  name: 'callouts (4 types) + wikilinks',
  args: { size: 'md' },
  render: (args) => <Prose {...args} innerHTML={CALLOUTS_HTML} />,
};

/** md vs sm бок-о-бок. */
export const SizeComparison: Story = {
  name: 'size — md vs sm',
  render: () => {
    const SNIPPET = `
      <h2>Heading</h2>
      <p>A paragraph of body text with <a href="#">a link</a> and <code>inline code</code>.</p>
      <table>
        <thead><tr><th>Key</th><th>Value</th></tr></thead>
        <tbody><tr><td>alpha</td><td>1</td></tr><tr><td>beta</td><td>2</td></tr></tbody>
      </table>
    `;
    return (
      <div class="grid grid-cols-2 gap-6">
        <div>
          <p class="mb-2 text-xs text-muted-foreground">size="md"</p>
          <Prose size="md" innerHTML={SNIPPET} />
        </div>
        <div>
          <p class="mb-2 text-xs text-muted-foreground">size="sm"</p>
          <Prose size="sm" innerHTML={SNIPPET} />
        </div>
      </div>
    );
  },
};
