// Pages for src/styles/prose.perf.test.ts. First, a long page of prose: `blocks` blocks of every kind prose styles, and `islands`
// islands of mixed kinds among them (PRS-16) — Tanrei elements and parts marked `tanrei-not-prose` — of which a third
// hold a prose again (two deep) and a ninth a prose inside an island inside that one (three deep). The prose stands
// `depth` elements below the body, as a content column does in a product's page.
const paragraph = (i: number) => `<p>Paragraph ${i} with <a href="#a${i}">a link</a>, <strong>strong</strong>, <em>stress</em> and <code>code</code>.</p>`;
const BLOCKS: ((i: number) => string)[] = [
  (i) => `<h2 id="h${i}">Heading ${i}</h2>`,
  paragraph,
  paragraph,
  paragraph,
  () => '<ul><li>item <a href="#x">link</a></li><li>item<ul><li>nested</li><li>nested <code>x</code></li></ul></li><li><input type="checkbox" disabled> task</li></ul>',
  (i) => `<h3>Sub ${i}</h3>`,
  paragraph,
  (i) => `<blockquote><p>Quote ${i}</p><p>second</p></blockquote>`,
  () => '<ol><li><p>one</p><p>two</p></li><li><p>three</p></li></ol>',
  (i) => `<dl><dt>term</dt><dd>description ${i}</dd></dl>`,
  (i) => `<pre><code>const x = ${i};</code></pre>`,
  () => '<hr>',
  (i) => `<div class="tanrei-prose-heading"><h4 id="w${i}">Anchored ${i}</h4><a class="tanrei-prose-anchor" href="#w${i}" aria-label="Link to ${i}">#</a></div>`,
  () => '<section><p>in a section</p><p>and another</p></section>',
];
/** What an island holds that is not prose: the elements prose would style, were they its own. */
const INSIDE = '<div><section><h3>Title</h3><p>Text with <a href="#x">a link</a> and <strong>strong</strong>.</p><ul><li>item</li><li>item</li></ul></section></div>';
const ISLANDS: ((content: string) => string)[] = [
  (content) => `<tanrei-card>${content}</tanrei-card>`,
  (content) => `<div class="tanrei-not-prose">${content}</div>`,
  (content) => `<tanrei-callout status="info" headline="Note">${content}</tanrei-callout>`,
  (content) => `<tanrei-tabs><tanrei-tab-panel>${content}</tanrei-tab-panel></tanrei-tabs>`,
  (content) => `<tanrei-code-block><pre><code>let a = 1;</code></pre>${content}</tanrei-code-block>`,
  () => '<tanrei-table><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td><a href="#">2</a></td></tr><tr><td>3</td><td>4</td></tr></tbody></table></tanrei-table>',
];
const again = (i: number, content: string) => `<div class="tanrei-prose" data-measure="false"><h3>Prose again</h3>${paragraph(i)}<ul><li>item</li></ul>${content}</div>`;

/** The body of the page: one `.tanrei-prose` (`#prose`) inside `depth` wrappers. No element is defined: the page is styled as it is parsed. */
export function prosePage({ blocks = 2000, islands = 300, depth = 12 }: { blocks?: number; islands?: number; depth?: number } = {}): string {
  const out: string[] = [];
  const every = Math.max(1, Math.floor(blocks / islands));
  let island = 0;
  for (let i = 0; i < blocks; i++) {
    out.push(BLOCKS[i % BLOCKS.length](i));
    if (i % every !== every - 1 || island >= islands) continue;
    const marked = `<div class="tanrei-not-prose">${INSIDE}</div>`;
    let content = INSIDE;
    if (island % 3 === 1) content = again(island, marked);
    if (island % 9 === 2) content = again(island, ISLANDS[island % 3](again(island, marked)));
    out.push(ISLANDS[island % ISLANDS.length](content));
    island += 1;
  }
  return `${'<div>'.repeat(depth)}<article class="tanrei-prose" id="prose">${out.join('\n')}</article>${'</div>'.repeat(depth)}`;
}

/**
 * A table of live components in a page of prose, as a page of documentation has one: `<tanrei-table>` around a native
 * table of `rows` rows, each cell of which holds what a fixture's cell holds — a line of text with a link and inline
 * code, and a component (`<x-live>`, an element of the page's own that no one defines: the test writes on it what a
 * component writes on itself while it is defined). About 21 elements a row. With a footer row or without: table.css
 * asks the table which (`:has(> tfoot > tr)`).
 */
export function fixturesTablePage({ rows = 120, footer = false }: { rows?: number; footer?: boolean } = {}): string {
  const cell = (i: number, j: number) => `<td><div class="demo"><x-live id="live-${i}-${j}"><span>live</span></x-live></div><p>Row ${i} with <a href="#r${i}">a link</a> and <code>code</code>.</p></td>`;
  const row = (i: number) => `<tr><th scope="row">Fixture ${i}</th>${cell(i, 1)}${cell(i, 2)}<td><ul><li>one</li><li>two</li></ul></td></tr>`;
  const body = Array.from({ length: rows }, (_, i) => row(i)).join('\n');
  const foot = footer ? '<tfoot><tr><th scope="row">All</th><td></td><td></td><td></td></tr></tfoot>' : '';
  return `<article class="tanrei-prose" id="prose"><div class="tanrei-prose-heading"><h2 id="fixtures">Fixtures</h2><a class="tanrei-prose-anchor" href="#fixtures" aria-label="Link to: Fixtures">#</a></div><tanrei-table id="fixtures-table"><table><caption>Fixtures</caption><thead><tr><th scope="col">Fixture</th><th scope="col">Live</th><th scope="col" data-align="end">Again</th><th scope="col">Notes</th></tr></thead><tbody>${body}</tbody>${foot}</table></tanrei-table><p>After the table.</p></article>`;
}
