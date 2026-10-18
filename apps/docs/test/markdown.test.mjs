// The docs' Markdown passes (src/lib/markdown.mjs), run by the pipeline the site configures — no browser, no build.
//
// Every page here is a few lines of Markdown given to the processor `astro.config.mjs` configures (test/site-pipeline.mjs
// runs Astro's own configuration step), once with Tanrei's passes and once without them: what a pass writes is held
// here, and everything a pass does not claim must come out as the engine and Starlight alone write it.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { EXTERNAL_WORDS, externalLinks, fenceAttributes, tanreiMarkdown } from '../src/lib/markdown.mjs';
import { EXTERNAL_WORDS as CONTENT_WORDS, tanreiContent } from '../src/lib/markdown-content.mjs';
import { TANREI, configure, element, elements, mdxHtml, pageURL, renderers, text } from './site-pipeline.mjs';

const site = await renderers(await configure());
const alone = await renderers(await configure({ without: [TANREI] }));

/** English words, as the site's strings would give them: enough to see which word lands where. */
const words = {
  kind: (kind) => ({ note: 'Note', tip: 'Tip', caution: 'Caution', danger: 'Danger' })[kind],
  code: { copy: 'Copy', copied: 'Copied', copyFailed: 'Could not copy', highlighted: 'Highlighted', added: 'Added', removed: 'Removed' },
  externalLink: 'external link',
};
const fence = (first, ...lines) => ['```' + first, ...lines, '```', ''].join('\n');
const inner = (html, name) => new RegExp(`<${name}\\b[^>]*>([\\s\\S]*)</${name}>`).exec(html)?.[1];

describe('the pipeline', () => {
  test("the site's configuration adds Tanrei's four passes after Starlight's, and nothing else", () => {
    const withTanrei = site.plugins.hastPlugins;
    const without = alone.plugins.hastPlugins;
    assert.notEqual(site.plugins, alone.plugins, 'the two configurations share no processor');
    assert.equal(withTanrei.length, without.length + 4);
    assert.ok(without.length >= 1, "Starlight's own step is registered");
    assert.deepEqual(withTanrei.slice(0, without.length).map(String), without.map(String), 'the steps before Tanrei\'s are the same');
    const added = withTanrei.slice(without.length);
    // The table's and the code's passes are made anew for each document (they count a page's names).
    assert.deepEqual(added.map((plugin) => (typeof plugin === 'function' ? plugin().name : plugin.name)), ['tanrei-docs-callout', 'tanrei-docs-table', 'tanrei-docs-code', 'tanrei-docs-external-link']);
    assert.deepEqual(site.plugins.mdastPlugins.length, alone.plugins.mdastPlugins.length, 'no step of the Markdown tree is Tanrei\'s');
    assert.deepEqual(site.plugins.features, alone.plugins.features);
  });

  test("the engine's own highlighter is off: a fence reaches the pass as it was written", async () => {
    assert.equal(site.config.markdown.syntaxHighlight, false);
    assert.equal(await alone.md(fence('ts', 'const a = 1;')), '<pre dir="ltr"><code class="language-ts">const a = 1;\n</code></pre>\n');
  });

  test('configuring the site warns of nothing', () => {
    assert.deepEqual(site.messages, []);
  });
});

describe('a notice', () => {
  const STATUS = { note: 'info', tip: undefined, caution: 'warning', danger: 'error' };

  for (const [kind, status] of Object.entries(STATUS)) {
    test(`:::${kind} is a callout at the reading size${status ? ` with the status ${status}` : ', with no status and the glyph lightbulb'}`, async () => {
      const html = await site.md(`:::${kind}\nThe body, with *stress*.\n:::\n`);
      const callout = element(html, 'tanrei-callout');
      assert.equal(callout.get('size'), 'large');
      assert.equal(callout.get('status'), status);
      assert.equal(callout.get('data-kind'), kind);
      // Starlight's title for the kind in the page's language is the title, and its text the hand-off.
      const name = words.kind(kind);
      assert.equal(callout.get('data-title'), name);
      assert.deepEqual([...callout.keys()].sort(), ['data-kind', 'data-title', 'size', ...(status ? ['status'] : [])].sort());
      assert.ok(html.includes(`<p slot="title">${name}</p>`), html);
      assert.ok(html.includes('<div class="tanrei-prose" data-size="large" data-measure="false"><p>The body, with <em>stress</em>.</p></div>'), html);
      assert.equal(html.includes('<span slot="icon" data-pagefind-ignore>lightbulb</span>'), kind === 'tip', html);
      // Nothing of Starlight's notice is left: not its element, its classes or its inline icon.
      assert.doesNotMatch(html, /<aside|starlight-aside|<svg/);
    });
  }

  test("the author's title is the title, with its markup, and its text is the hand-off", async () => {
    const html = await site.md(':::caution[Mind the *gap* in `code`]\nBody.\n:::\n');
    assert.equal(element(html, 'tanrei-callout').get('data-title'), 'Mind the gap in code');
    assert.match(html, /<p slot="title">Mind the <em>gap<\/em> in <code[^>]*>code<\/code><\/p>/);
  });

  test("a page of another language gets the kind's name in that language", async () => {
    const html = await site.md(':::note\nBody.\n:::\n', { page: 'ja/test-page.md' });
    const said = element(await alone.md(':::note\nBody.\n:::\n', { page: 'ja/test-page.md' }), 'aside').get('aria-label');
    assert.notEqual(said, 'Note');
    assert.equal(element(html, 'tanrei-callout').get('data-title'), said);
  });

  test('a notice with no body has no prose box', async () => {
    const html = await site.md(':::danger[Only a title]\n:::\n');
    assert.equal(html.trim(), '<tanrei-callout size="large" data-kind="danger" data-title="Only a title" status="error"><p slot="title">Only a title</p></tanrei-callout>');
  });

  test('what a notice holds is passed on: a table, code and a link inside it are Tanrei\'s too', async () => {
    const html = await site.md(['## Inside', '', ':::note', '| a |', '|---|', '| 1 |', '', '```js', '1', '```', '', '[out](https://example.com/)', ':::', ''].join('\n'));
    const body = inner(html, 'tanrei-callout');
    assert.equal(element(body, 'tanrei-table').get('label'), 'Inside');
    assert.equal(element(body, 'tanrei-code-block').get('label'), 'Inside: JavaScript');
    assert.equal(element(body, 'a').get('data-external'), 'true');
  });

  test('in an .mdx page the same callout is written, without Starlight\'s icon', async () => {
    const html = mdxHtml(await site.mdx(':::tip[A *fine* point]\nBody.\n:::\n'));
    assert.equal(html.trim(), '<tanrei-callout size="large" data-kind="tip" data-title="A fine point"><span slot="icon" data-pagefind-ignore>lightbulb</span><p slot="title">A <em>fine</em> point</p><div class="tanrei-prose" data-size="large" data-measure="false"><p>Body.</p></div></tanrei-callout>');
    assert.match(mdxHtml(await alone.mdx(':::tip[A *fine* point]\nBody.\n:::\n')), /<p class="starlight-aside__title" aria-hidden="true"><svg /);
  });

  test("the kind's name becomes status-label where the callout has a status and the title does not say it (MarkdownContent)", async () => {
    const page = await site.md([':::note', 'a', ':::', '', ':::note[Read this first]', 'b', ':::', '', ':::tip[A tip of my own]', 'c', ':::', '', ':::danger[Danger]', 'd', ':::', ''].join('\n'));
    const callouts = elements(tanreiContent(page, words), 'tanrei-callout');
    assert.deepEqual(callouts.map((callout) => [callout.get('data-kind') ?? '(taken)', callout.get('status-label')]), [['(taken)', undefined], ['(taken)', 'Note'], ['(taken)', undefined], ['(taken)', undefined]]);
    assert.ok(callouts.every((callout) => !callout.has('data-title')), 'the hand-off is taken out of the page');
  });

  test('status-label compares the title as text, and escapes the name it writes', () => {
    const quoted = { ...words, kind: () => 'Mind "this" & that' };
    assert.equal(tanreiContent('<tanrei-callout size="large" data-kind="caution" data-title="Mind &quot;this&quot; &amp; that" status="warning">', quoted), '<tanrei-callout size="large" status="warning">');
    assert.equal(tanreiContent('<tanrei-callout size="large" data-kind="caution" data-title="Else" status="warning">', quoted), '<tanrei-callout size="large" status-label="Mind &quot;this&quot; &amp; that" status="warning">');
  });
});

describe('a table', () => {
  const TABLE = ['| Region | January | Share | Note |', '|:---|---:|:---:|---|', '| North | 12 | 40% | first |', ''].join('\n');

  test('is wrapped in the scroll box, named by the nearest heading before it', async () => {
    const html = await site.md(`## Sales by region\n\n### In *winter*\n\n${TABLE}`, { frontmatter: { title: 'The page' } });
    const box = element(html, 'tanrei-table');
    assert.deepEqual([...box], [['label', 'In winter']]);
    assert.match(html, /<tanrei-table label="In winter"><table>\n<thead>[\s\S]*<\/tbody>\n<\/table><\/tanrei-table>/);
  });

  test("a table before any heading is named by the page's title, and by nothing on a page without one", async () => {
    assert.equal(element(await site.md(TABLE, { frontmatter: { title: 'The page' } }), 'tanrei-table').get('label'), 'The page');
    assert.deepEqual(elements(await site.md(`${TABLE}\n${TABLE}`), 'tanrei-table').map((box) => [...box]), [[], []]);
  });

  test('tables under one heading are numbered, and the count is each page\'s own', async () => {
    const page = `## One\n\n${TABLE}\n${TABLE}\n## Two\n\n${TABLE}\n## One\n\n${TABLE}`;
    const labels = async () => elements(await site.md(page), 'tanrei-table').map((box) => box.get('label'));
    assert.deepEqual(await labels(), ['One', 'One (2)', 'Two', 'One (3)']);
    assert.deepEqual(await labels(), ['One', 'One (2)', 'Two', 'One (3)'], 'a second page starts again');
  });

  test("a column's alignment is the Table's data-align — start, center, end — on its header cell and each of its cells, and no style is left", async () => {
    const html = await site.md(TABLE);
    assert.deepEqual(elements(html, 'th').map((cell) => [...cell]), [[['data-align', 'start']], [['data-align', 'end']], [['data-align', 'center']], []]);
    assert.deepEqual(elements(html, 'td').map((cell) => [...cell]), [[['data-align', 'start']], [['data-align', 'end']], [['data-align', 'center']], []]);
    assert.doesNotMatch(html, /style=| align=/);
  });

  test('the engine still writes alignment as the style this pass reads, and the table is otherwise the engine\'s', async () => {
    const engine = await alone.md(TABLE);
    assert.deepEqual(elements(engine, 'th').map((cell) => cell.get('style')), ['text-align: left', 'text-align: right', 'text-align: center', undefined]);
    const expected = engine.replaceAll(' style="text-align: left"', ' data-align="start"').replaceAll(' style="text-align: right"', ' data-align="end"').replaceAll(' style="text-align: center"', ' data-align="center"');
    assert.equal(await site.md(TABLE), `<tanrei-table>${expected.trimEnd()}</tanrei-table>\n`);
  });

  test('the header cells are the engine\'s th in a thead, and a table of a header alone is wrapped as any other', async () => {
    const html = await site.md('## Empty\n\n| Name | Value |\n|---|---|\n');
    assert.equal(inner(html, 'tanrei-table'), '<table>\n<thead>\n<tr>\n<th>Name</th>\n<th>Value</th>\n</tr>\n</thead>\n</table>');
    assert.equal(element(html, 'tanrei-table').get('label'), 'Empty');
  });

  test('a table written as HTML is the author\'s own: not wrapped, in .md and in .mdx', async () => {
    const written = '<table><tr><td style="text-align: right">1</td></tr></table>';
    assert.equal(await site.md(`${written}\n`), await alone.md(`${written}\n`));
    const html = mdxHtml(await site.mdx(`${written}\n\n| a |\n|--:|\n| 1 |\n`));
    assert.equal(elements(html, 'tanrei-table').length, 1, 'the Markdown table alone');
    assert.ok(html.startsWith('<table><tr><td style="text-align: right">1</td></tr></table>'), html);
    assert.equal(element(html, 'th').get('data-align'), 'end');
  });
});

describe('a fenced block', () => {
  const code = (html) => /<pre translate="no" spellcheck="false"><code data-syntax-of="([^"]*)">([\s\S]*?)<\/code><\/pre><\/tanrei-code-block>/.exec(html);
  const lines = (html) => code(html)[2].split(/(?=<span data-line="")/);

  test('of a language the highlighter knows is the code block with its runs, a copy button and a name', async () => {
    const source = ['import { a } from "./a";', 'const b = a < 1 && a > 0;'];
    const html = await site.md(`## Usage\n\n${fence('ts', ...source)}`);
    const block = element(html, 'tanrei-code-block');
    assert.deepEqual([...block], [['language', 'ts'], ['label', 'Usage: TypeScript'], ['copy', '']]);
    assert.equal(code(html)[1], 'ts');
    // COD-2: one line break at the end of a fence is the fence's; the code itself is whole, character for character.
    assert.equal(text(code(html)[2]), source.join('\n'));
    assert.match(code(html)[2], /^<span data-line=""><span data-line-code=""><span data-syntax="keyword">import<\/span>/);
    assert.equal(lines(html).length, 2);
    assert.ok(lines(html).every((line) => /^<span data-line=""><span data-line-code="">[\s\S]*<\/span><\/span>$/.test(line)), 'each line is its box and the box of its code');
    // Nothing of the engine's block is left: Starlight's `dir`, the engine's `language-` class.
    assert.doesNotMatch(html.slice(html.indexOf('<tanrei-code-block')), /dir=|class=/);
  });

  test('of a language the highlighter does not know is drawn plain, keeps its language, and the build is warned once', async () => {
    const fresh = await renderers(await configure());
    const html = await fresh.md(`## Notes\n\n${fence('nolang', 'first <b>')}\n${fence('nolang', 'second')}`);
    const [first, second] = elements(html, 'tanrei-code-block');
    assert.deepEqual([...first], [['language', 'nolang'], ['label', 'Notes'], ['copy', '']]);
    assert.equal(second.get('label'), 'Notes (2)');
    assert.ok(html.includes('<code data-syntax-of="nolang"><span data-line=""><span data-line-code="">first &lt;b&gt;</span></span></code>'), html);
    assert.doesNotMatch(html, /data-syntax="/);
    const warnings = fresh.messages.filter((event) => event.level === 'warn');
    assert.equal(warnings.length, 1, JSON.stringify(fresh.messages));
    assert.match(warnings[0].message, /"nolang".*drawn plain.*test-page\.md/);
  });

  test('with no language, or `text`, is drawn plain and warns of nothing', async () => {
    const fresh = await renderers(await configure());
    const html = await fresh.md(`${fence('', 'a  b')}\n${fence('text', 'c')}`);
    assert.deepEqual(elements(html, 'tanrei-code-block').map((block) => [...block]), [[['copy', '']], [['language', 'text'], ['copy', '']]]);
    assert.ok(html.includes('<code data-syntax-of="text"><span data-line=""><span data-line-code="">a  b</span></span></code>'), html);
    assert.doesNotMatch(html, /data-syntax="/);
    assert.deepEqual(fresh.messages, []);
  });

  for (const shell of ['sh', 'bash', 'zsh', 'shell']) {
    test(`of ${shell} takes the prompt $, drawn before each line and not part of the code`, async () => {
      const html = await site.md(fence(shell, 'pnpm install', 'pnpm build'));
      const block = element(html, 'tanrei-code-block');
      assert.deepEqual([...block], [['language', shell], ['label', 'Shell'], ['prompt', '$'], ['copy', '']]);
      assert.ok(lines(html).every((line) => line.startsWith('<span data-line=""><span data-line-prompt="" aria-hidden="true" data-prompt="$"></span><span data-line-code="">')), html);
      assert.equal(text(code(html)[2]), 'pnpm install\npnpm build');
    });
  }

  test('`prompt=""` and `copy="false"` take away what the pass adds', async () => {
    const html = await site.md(fence('sh prompt="" copy="false"', 'ls'));
    assert.deepEqual([...element(html, 'tanrei-code-block')], [['language', 'sh'], ['label', 'Shell']]);
    assert.doesNotMatch(html, /data-line-prompt/);
  });

  test('a headline, or a label of its own, is the name: none is made from the heading', async () => {
    const html = await site.md(`## Usage\n\n${fence('ts headline="sizes.ts"', '1')}\n${fence('ts label="The sizes"', '2')}\n${fence('ts', '3')}`);
    assert.deepEqual(elements(html, 'tanrei-code-block').map((block) => [block.get('headline'), block.get('label')]), [['sizes.ts', undefined], [undefined, 'The sizes'], [undefined, 'Usage: TypeScript']]);
  });

  test('blocks that would share a name are numbered, by heading and language', async () => {
    const html = await site.md(`## Usage\n\n${fence('ts', '1')}\n${fence('ts', '2')}\n${fence('css', 'a{}')}\n${fence('', 'x')}\n${fence('', 'y')}`, { frontmatter: { title: 'The page' } });
    assert.deepEqual(elements(html, 'tanrei-code-block').map((block) => block.get('label')), ['Usage: TypeScript', 'Usage: TypeScript (2)', 'Usage: CSS', 'Usage', 'Usage (2)']);
    assert.equal(element(await site.md(fence('json', '{}'), { frontmatter: { title: 'The page' } }), 'tanrei-code-block').get('label'), 'The page: JSON');
  });

  test("line numbers, a first line's number and marked lines are the element's attributes, and are drawn beside the lines", async () => {
    const html = await site.md(fence('ts line-numbers start-line="96" highlighted-lines="97" added-lines="98" removed-lines="96"', 'const a = 1;', 'const b = 2;', 'const c = 3;'));
    const block = element(html, 'tanrei-code-block');
    assert.deepEqual([...block], [['language', 'ts'], ['label', 'TypeScript'], ['copy', ''], ['line-numbers', ''], ['start-line', '96'], ['highlighted-lines', '97'], ['added-lines', '98'], ['removed-lines', '96']]);
    assert.deepEqual(lines(html).map((line) => /^<span data-line=""( data-(?:removed|highlighted|added)="")><span data-line-gutter="" aria-hidden="true" data-number="(\d+)" data-sign="(.)"><\/span><span data-line-code="">/.exec(line)?.slice(1)), [[' data-removed=""', '96', '−'], [' data-highlighted=""', '97', ' '], [' data-added=""', '98', '+']]);
    assert.equal(text(code(html)[2]), 'const a = 1;\nconst b = 2;\nconst c = 3;');
  });

  test('every other attribute a fence may give is written on the element as it was given', async () => {
    const html = await site.md(fence('css variant="outlined" size="small" wrap max-lines="4" language-label="Styles" highlight="false"', 'a { color: red }'));
    assert.deepEqual([...element(html, 'tanrei-code-block')], [['language', 'css'], ['label', 'CSS'], ['copy', ''], ['variant', 'outlined'], ['size', 'small'], ['wrap', ''], ['max-lines', '4'], ['language-label', 'Styles'], ['highlight', 'false']]);
  });

  test('an attribute the element does not have, or a first line that is not attributes, fails the page and names it', async () => {
    await assert.rejects(site.md(fence('ts frame="none"', '1')), /test-page\.md: a code fence's first line — "frame" is not an attribute a fence may give its code block\./);
    await assert.rejects(site.md(fence('ts {2,4}', '1')), /test-page\.md: a code fence's first line — "\{2,4\}" is not written as attributes/);
  });

  test('fenceAttributes reads names and quoted values, and says what it cannot read', () => {
    assert.deepEqual(fenceAttributes(''), {});
    assert.deepEqual(fenceAttributes('headline="a b.ts"  line-numbers highlighted-lines="3, 7-9" prompt=""'), { headline: 'a b.ts', 'line-numbers': true, 'highlighted-lines': '3, 7-9', prompt: '' });
    assert.equal(fenceAttributes('headline="x" ins={2}'), '"ins" is not an attribute a fence may give its code block');
    assert.equal(fenceAttributes("headline='x'"), `"='x'" is not written as attributes (name or name="value")`);
  });

  test('a block written by hand in .mdx is left as written', async () => {
    const written = '<tanrei-code-block language="ts"><pre><code>{"const a = 1;"}</code></pre></tanrei-code-block>';
    assert.equal(mdxHtml(await site.mdx(`${written}\n`)), mdxHtml(await alone.mdx(`${written}\n`)));
    assert.equal(mdxHtml(await site.mdx(`${written}\n`)), '<tanrei-code-block language="ts"><pre><code>const a = 1;</code></pre></tanrei-code-block>');
  });

  test("the copy button's and the marked lines' words are written where the block asks for them, and one it already says is kept (MarkdownContent)", async () => {
    const page = await site.md(`${fence('ts', '1')}\n${fence('ts copy="false" highlighted-lines="1" added-lines="1" removed-lines="1"', '1')}\n${fence('ts copy-label="Take it" highlighted-label="Look"  highlighted-lines="1"', '1')}`);
    const blocks = elements(tanreiContent(page, words), 'tanrei-code-block');
    const said = (block) => Object.fromEntries([...block].filter(([name]) => name.endsWith('-label')));
    assert.deepEqual(said(blocks[0]), { 'copy-label': 'Copy', 'copied-label': 'Copied', 'copy-failed-label': 'Could not copy' });
    assert.deepEqual(said(blocks[1]), { 'highlighted-label': 'Highlighted', 'added-label': 'Added', 'removed-label': 'Removed' });
    assert.deepEqual(said(blocks[2]), { 'copy-label': 'Take it', 'highlighted-label': 'Look', 'copied-label': 'Copied', 'copy-failed-label': 'Could not copy' });
  });
});

describe('inline code', () => {
  test('is not the pipeline\'s: it comes out as the engine writes it', async () => {
    const page = 'Set `size="large"` on the `<tanrei-button>`.\n';
    assert.equal(await site.md(page), await alone.md(page));
  });

  test('becomes Tanrei\'s inline code by its class and two attributes, and the code of a block does not (MarkdownContent)', async () => {
    const html = tanreiContent(await site.md(`Set \`size\` here.\n\n${fence('ts', 'const a = 1;')}`), words);
    assert.ok(html.includes('<p>Set <code class="tanrei-code" dir="auto" translate="no" spellcheck="false">size</code> here.</p>'), html);
    assert.ok(html.includes('<pre translate="no" spellcheck="false"><code data-syntax-of="ts">'), html);
  });

  test('a class and attributes it already has are kept, and nothing is written twice', () => {
    assert.equal(tanreiContent('<code class="x y">a</code><code class="tanrei-code" translate="yes">b</code><code spellcheck="true">c</code>', words), '<code class="tanrei-code x y" translate="no" spellcheck="false">a</code><code class="tanrei-code" translate="yes" spellcheck="false">b</code><code class="tanrei-code" spellcheck="true" translate="no">c</code>');
    const once = tanreiContent('<p><code>a</code></p>', words);
    assert.equal(tanreiContent(once, words), once);
  });
});

describe('a link that leaves the site', () => {
  const own = new URL(site.config.site);
  const marked = [['data-external', 'true'], [EXTERNAL_WORDS, 'externalLink']];
  const link = async (address, render = site) => [...element(await render.md(`[words](${address})\n`), 'a')].filter(([name]) => name !== 'href');

  test('the mark for the words is one name, in the pass and in the component that takes it', () => {
    assert.equal(EXTERNAL_WORDS, CONTENT_WORDS);
    assert.equal(EXTERNAL_WORDS, 'data-docs-words');
  });

  for (const address of ['https://example.com/', 'http://example.com/a?b=c#d', '//example.org/a', `https://docs.${own.host}/`, `${own.protocol}//${own.host}:8443/`]) {
    test(`${address} is of another origin: marked as the Link's external link, with the place for its words`, async () => {
      assert.deepEqual(await link(address), marked);
    });
  }

  for (const address of [`${own.origin}/components/button/`, own.origin, '/components/button/', '../button/', 'button', '#usage', '?tab=specs', 'mailto:someone@example.com', 'tel:+15550100']) {
    test(`${address} is not: left as the engine writes it`, async () => {
      assert.deepEqual(await link(address), []);
      assert.equal(await site.md(`[words](${address})\n`), await alone.md(`[words](${address})\n`));
    });
  }

  test('where and how the address opens does not change: no target, no rel, and the address is as written', async () => {
    const html = await site.md('[words](https://example.com/a?b=c&d=e "A title")\n');
    assert.deepEqual([...element(html, 'a')], [['href', 'https://example.com/a?b=c&d=e'], ['title', 'A title'], ...marked]);
  });

  test('an address written bare, in angle brackets or by reference is a link like any other', async () => {
    const html = await site.md('See https://www.example.com/a and <https://example.net/b> and [c][ref].\n\n[ref]: https://example.org/c\n');
    assert.deepEqual(elements(html, 'a').map((anchor) => [anchor.get('href'), anchor.get('data-external'), anchor.get(EXTERNAL_WORDS)]), [['https://www.example.com/a', 'true', 'externalLink'], ['https://example.net/b', 'true', 'externalLink'], ['https://example.org/c', 'true', 'externalLink']]);
  });

  test('a link in a heading, in a table, around code and around a picture is marked; the heading\'s own anchor is not', async () => {
    const html = await site.md('## Read [the guide](https://example.com/guide)\n\n| a |\n|---|\n| [b](https://example.com/b) |\n\n[`code`](https://example.com/c) [![alt](/picture.png)](https://example.com/d)\n');
    assert.deepEqual(elements(html, 'a').map((anchor) => [anchor.get('href'), anchor.get('data-external')]), [['https://example.com/guide', 'true'], ['#read-the-guide', undefined], ['https://example.com/b', 'true'], ['https://example.com/c', 'true'], ['https://example.com/d', 'true']]);
    assert.equal(element(html, 'tanrei-table').get('label'), 'Read the guide');
  });

  test('code is never a link: an address in a fence or in inline code is text', async () => {
    const html = await site.md(`\`https://example.com/a\`\n\n${fence('text', 'https://example.com/b', '[c](https://example.com/c)')}`);
    assert.deepEqual(elements(html, 'a'), []);
    assert.doesNotMatch(html, /data-external/);
  });

  test("a picture's address is not a link", async () => {
    const page = '![alt](https://example.com/picture.png)\n';
    assert.equal(await site.md(page), await alone.md(page));
  });

  // LNK-32: the other site's icon, from the lock file the site commits (links.config.mjs) — the site's own file, so the
  // page asks no other site for anything; an origin with no recorded icon shows the arrow alone.
  test("a link to a site whose icon is recorded shows it before its text, as the site's own file", async () => {
    const lock = JSON.parse(readFileSync(new URL('../link-data.lock.json', import.meta.url), 'utf8'));
    const [origin, entry] = Object.entries(lock.icons).find(([, icon]) => icon.ok);
    const html = await site.md(`[words](${origin}/somewhere)\n`);
    const icon = element(html, 'img');
    assert.equal(icon.get('class'), 'tanrei-link-site-icon');
    assert.equal(icon.get('src'), `/link-pictures/${entry.file}`);
    assert.deepEqual([icon.get('alt'), icon.get('width'), icon.get('height'), icon.get('loading'), icon.get('decoding'), icon.get('referrerpolicy')], ['', String(entry.width), String(entry.height), 'lazy', 'async', 'no-referrer']);
    assert.ok(existsSync(new URL(`../public/link-pictures/${entry.file}`, import.meta.url)), 'the picture is committed beside the lock file');
    assert.match(inner(html, 'a'), /^<img [^>]*>words$/, 'the icon is the anchor\'s first child, before its text');
    assert.doesNotMatch(await site.md('[words](https://example.com/)\n'), /<img/, 'an origin with no recorded icon: the arrow alone');
  });

  test('the pass puts the icon it is given into the anchor through the engine, and the anchor itself is never replaced', () => {
    const icons = { 'https://example.com': { src: '/link-pictures/x.png', width: 32, height: 32 } };
    const pass = externalLinks([own.origin], icons);
    const node = { type: 'element', tagName: 'a', properties: { href: 'https://example.com/a' }, children: [{ type: 'text', value: 'words' }] };
    const prepended = [];
    const returned = pass.element.visit(node, { setProperty: () => {}, prependChild: (parent, child) => prepended.push([parent, child]) });
    assert.equal(returned, undefined);
    assert.equal(prepended.length, 1);
    assert.equal(prepended[0][0], node);
    assert.equal(prepended[0][1].tagName, 'img');
    assert.equal(prepended[0][1].properties.src, '/link-pictures/x.png');
    assert.equal(node.children.length, 1, 'the tree is changed through the engine alone');
  });

  test('an anchor an author wrote as HTML is the author\'s own, in .md and in .mdx', async () => {
    const written = '<a href="https://example.com/">words</a>';
    assert.equal(await site.md(`${written}\n`), await alone.md(`${written}\n`));
    const html = mdxHtml(await site.mdx(`${written} and [these](https://example.com/)\n`));
    assert.deepEqual(elements(html, 'a').map((anchor) => [...anchor]), [[['href', 'https://example.com/']], [['href', 'https://example.com/'], ...marked]]);
  });

  describe('an anchor another step wrote (the pass itself, given the element)', () => {
    const pass = site.plugins.hastPlugins.find((plugin) => plugin.name === 'tanrei-docs-external-link');
    const visit = (properties) => {
      const node = { type: 'element', tagName: 'a', properties: { ...properties }, children: [] };
      const written = {};
      const returned = pass.element.visit(node, { setProperty: (_node, name, value) => (written[name] = value) });
      assert.equal(returned, undefined, 'the anchor is never replaced');
      assert.deepEqual(node.properties, properties, 'the tree is changed through the engine alone');
      return written;
    };

    test('is found by the element name a', () => {
      assert.deepEqual(pass.element.filter, ['a']);
    });
    test('of another origin is marked', () => {
      assert.deepEqual(visit({ href: 'https://example.com/' }), Object.fromEntries(marked));
    });
    test('that already says whether it is external is left alone, whichever it says', () => {
      assert.deepEqual(visit({ href: 'https://example.com/', 'data-external': 'false' }), {});
      assert.deepEqual(visit({ href: 'https://example.com/', 'data-external': 'true' }), {});
      assert.deepEqual(visit({ href: 'https://example.com/', dataExternal: 'false' }), {});
    });
    test("that carries a class of Tanrei's is left alone", () => {
      assert.deepEqual(visit({ href: 'https://example.com/', className: ['tanrei-link'] }), {});
      assert.deepEqual(visit({ href: 'https://example.com/', class: 'plain tanrei-prose-anchor' }), {});
      assert.deepEqual(visit({ href: 'https://example.com/', class: 'plain' }), Object.fromEntries(marked));
    });
    test('that already has a description, or opens a new tab, is marked without the place for the words (LNK-34)', () => {
      for (const said of [{ 'aria-description': 'the tracker' }, { ariaDescription: 'the tracker' }, { 'aria-describedby': 'note' }, { target: '_blank' }]) assert.deepEqual(visit({ href: 'https://example.com/', ...said }), { 'data-external': 'true' });
    });
    test('with no address, or one of the site, is left alone', () => {
      assert.deepEqual(visit({}), {});
      assert.deepEqual(visit({ href: `${own.origin}/a` }), {});
    });
  });

  test('the place for the words becomes aria-description in the page\'s words, escaped, inside an anchor\'s tag only (MarkdownContent)', async () => {
    const page = await site.md(`[out](https://example.com/) [in](/in) and \`<a href="/x" ${EXTERNAL_WORDS}="externalLink">\` as code\n`);
    const html = tanreiContent(page, { ...words, externalLink: 'opens "elsewhere" & away' });
    assert.deepEqual(elements(html, 'a').map((anchor) => [...anchor]), [[['href', 'https://example.com/'], ['data-external', 'true'], ['aria-description', 'opens "elsewhere" & away']], [['href', '/in']]]);
    assert.ok(html.includes('aria-description="opens &quot;elsewhere&quot; &amp; away"'), html);
    assert.ok(text(html).includes(`<a href="/x" ${EXTERNAL_WORDS}="externalLink">`), 'the mark written as code is still the text it was');
  });
});

describe('what is not a pass\'s', () => {
  const same = async (page, options) => assert.equal(await site.md(page, options), await alone.md(page, options));

  test('a paragraph, with stress, a line break and typographic punctuation', () => same('A *plain* paragraph with **weight**, "quotes" -- and a break  \nhere. ~~Gone.~~\n'));
  test('lists: bulleted, numbered, nested and of tasks', () => same('- one\n- two\n  1. first\n  2. second\n\n3. three\n4. four\n\n- [ ] to do\n- [x] done\n'));
  test('a picture', () => same('![A picture](/picture.png "Its title")\n'));
  test('a quotation and a rule', () => same('> Quoted, with a [link](/inside).\n\n---\n'));
  test('a heading, with the anchor Starlight gives it', () => same('# One\n\n## Two `code`\n\n###### Six\n'));
  test('raw HTML, as a block and in a line', () => same('<details class="x"><summary>More</summary>\n\nHidden *text*.\n\n</details>\n\nA line with <kbd>Ctrl</kbd> and <span data-x="1">a span</span>.\n'));
  test('a footnote', () => same('A claim.[^1]\n\n[^1]: Its source.\n'));
  test('a directive that is not a notice', () => same(':::figure\nNot a notice.\n:::\n\nA :badge[text] directive.\n'));
  test('the same page in another language', () => same('## 見出し\n\n本文と[リンク](/ja/components/button/)。\n', { page: 'ja/test-page.md' }));

  test('in .mdx: a component, an expression and JSX of the author\'s come out as the engine compiles them', async () => {
    const page = '## A heading\n\nA paragraph with {1 + 1} and <Badge text="new" />.\n\n<Card title="A card">\n\n- one\n- two\n\n</Card>\n\n<div class="not-content"><img src="/picture.png" alt="" /></div>\n';
    const compiled = await site.mdx(page);
    assert.equal(compiled, await alone.mdx(page));
    const components = { Badge: ({ text: label }) => `[badge ${label}]`, Card: ({ title, children }) => [`[card ${title}]`, children, '[/card]'] };
    assert.match(mdxHtml(compiled, components), /<p>A paragraph with 2 and \[badge new\]\.<\/p>\n\[card A card\]<ul>\n<li>one<\/li>\n<li>two<\/li>\n<\/ul>\[\/card\]\n<div class="not-content"><img src="\/picture\.png" alt=""><\/div>/);
  });

  test('the headings and the title a page reports are the same', async () => {
    const page = '## One\n\n| a |\n|---|\n\n### Two\n\n```ts\n1\n```\n';
    assert.match(await site.mdx(page), /export function getHeadings\(\) \{ return \[\{"depth":2,"slug":"one","text":"One"\},\{"depth":3,"slug":"two","text":"Two"\}\]; \}/);
    assert.equal((await site.mdx(page)).match(/export function getHeadings.*/)[0], (await alone.mdx(page)).match(/export function getHeadings.*/)[0]);
  });
});

describe('the content column (MarkdownContent)', () => {
  test("a heading with Starlight's link becomes prose's heading with its anchor, named by Starlight's words", async () => {
    const html = tanreiContent(await site.md('## The "quoted" title\n'), words);
    assert.equal(html, '<div class="tanrei-prose-heading"><h2 id="the-quoted-title">The “quoted” title</h2><a class="tanrei-prose-anchor" href="#the-quoted-title" aria-label="Section titled “The “quoted” title”" data-pagefind-ignore><span class="tanrei-icon" aria-hidden="true">link</span></a></div>\n');
  });

  test("what Starlight and the docs mark as not content is marked as not prose, once", () => {
    const html = tanreiContent('<div class="not-content x"><p class="card">a</p><a class="sl-link-card" href="/a">b</a><ul class="card-grid"></ul><p class="cardinal">c</p></div>', words);
    assert.equal(html, '<div class="not-content x tanrei-not-prose"><p class="card tanrei-not-prose">a</p><a class="sl-link-card tanrei-not-prose" href="/a">b</a><ul class="card-grid tanrei-not-prose"></ul><p class="cardinal">c</p></div>');
    assert.equal(tanreiContent(html, words), html);
  });

  test('a whole page: every hand-off of the pipeline is taken, and nothing of Starlight\'s Markdown is left', async () => {
    const page = await site.md(['## A page', '', ':::caution[Before you start]', 'Read [the notes](https://example.com/notes).', ':::', '', '| a | b |', '|:--|--:|', '| `x` | 2 |', '', fence('sh', 'pnpm install')].join('\n'));
    const html = tanreiContent(page, words);
    assert.doesNotMatch(html, new RegExp(`data-kind=|data-title=|${EXTERNAL_WORDS}=|sl-heading-wrapper|sl-anchor-link|starlight-aside`));
    assert.equal(element(html, 'tanrei-callout').get('status-label'), 'Caution');
    assert.equal(element(html, 'a href="https://example.com/notes"').get('aria-description'), 'external link');
    assert.equal(element(html, 'tanrei-code-block').get('copy-label'), 'Copy');
    assert.equal(element(html, 'code class="tanrei-code"[^>]*').size, 0);
  });
});

describe('the integration', () => {
  const hook = tanreiMarkdown().hooks['astro:config:setup'];
  const logger = () => ({ warned: [], warn(message) { this.warned.push(message); } });

  test('is the one astro.config.mjs lists, after Starlight', () => {
    const names = site.config.integrations.map((integration) => integration.name);
    assert.ok(names.indexOf(TANREI) > names.indexOf('@astrojs/starlight'), names.join(', '));
    assert.equal(tanreiMarkdown().name, TANREI);
  });

  test('a site with no address of its own marks no link, and says so', async () => {
    const log = logger();
    const config = { markdown: { processor: { options: { hastPlugins: [] } } } };
    await hook({ config, logger: log });
    assert.equal(config.markdown.processor.options.hastPlugins.length, 3);
    assert.match(log.warned.join('\n'), /no address of its own/);
  });

  test('a processor that takes no HTML-tree plugins is left alone, and says so', async () => {
    const log = logger();
    const config = { site: 'https://docs.example.com', markdown: { processor: { options: {} } } };
    await hook({ config, logger: log });
    assert.deepEqual(config.markdown.processor.options, {});
    assert.match(log.warned.join('\n'), /takes no HTML-tree plugins/);
  });

  test('the pages a test renders are pages of the site\'s content, where Starlight\'s steps run', () => {
    assert.ok(fileURLToPath(pageURL('test-page.md')).startsWith(fileURLToPath(new URL('./src/content/docs/', site.config.root))));
  });
});
