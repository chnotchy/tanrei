// The elements that are drawn in the light DOM by ONE stylesheet, which the page loads or the element adds to its root
// (src/primitives/sheets.ts) — every caller of `adoptUnlessDrawn()` — as the tests that count what they cost
// a page mount them: src/primitives/sheets.test.ts (writes of `adoptedStyleSheets`) and src/primitives/passes.test.ts
// (style passes and layouts).

export interface LightDomSubject {
  /** The element. */
  tag: string;
  /** The stylesheet a page loads for it (dist/). */
  css: string;
  /** The name the sheet sets on the element: what the element asks its root for. */
  mark: string;
  /** One instance, with the product's own elements in it. */
  html: (n: number) => string;
  /** A property the sheet decides, read from `part` (a selector inside the instance; the element itself where empty): drawn alike by the page's sheet and by the element's. */
  drawn: { part: string; property: string };
  /** Where in an instance the product could write another of the same kind (a selector inside the instance; the element itself where empty). */
  inside: string;
  /** Whether the element is still once it is drawn: false for one that animates at rest, whose frames each cost a style pass (the passes of two pages are then not compared). */
  steady: boolean;
}

export const LIGHT_DOM_SUBJECTS: LightDomSubject[] = [
  {
    tag: 'tanrei-table',
    css: 'table.css',
    mark: '--_table-pad-block',
    html: (n) => `<tanrei-table><table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>row ${n}</td><td>${n}</td></tr></tbody></table></tanrei-table>`,
    drawn: { part: 'td', property: 'padding-top' },
    inside: 'td',
    steady: true,
  },
  {
    tag: 'tanrei-description-list',
    css: 'description-list.css',
    mark: '--_dl-fact-gap',
    html: (n) => `<tanrei-description-list><dl><div><dt>Term ${n}</dt><dd>Fact</dd></div></dl></tanrei-description-list>`,
    drawn: { part: 'dd', property: 'margin-left' },
    inside: 'dd',
    steady: true,
  },
  {
    tag: 'tanrei-figure',
    css: 'figure.css',
    mark: '--_figure-fill',
    html: (n) => `<tanrei-figure><figure><div>content ${n}</div><figcaption>Caption</figcaption></figure></tanrei-figure>`,
    drawn: { part: 'figure', property: 'margin-left' },
    inside: 'figure > div',
    steady: true,
  },
  {
    tag: 'tanrei-page-header',
    css: 'page-header.css',
    mark: '--_pgh-title-font',
    html: (n) => `<tanrei-page-header><h1>Title ${n}</h1></tanrei-page-header>`,
    drawn: { part: 'h1', property: 'margin-top' },
    inside: '',
    steady: true,
  },
  {
    tag: 'tanrei-accordion',
    css: 'accordion.css',
    mark: '--_acc-container',
    html: (n) => `<tanrei-accordion><details><summary>Question ${n}</summary><div>Answer</div></details></tanrei-accordion>`,
    drawn: { part: 'summary', property: 'display' },
    inside: 'details > div',
    steady: true,
  },
  {
    tag: 'tanrei-link-card',
    css: 'link-card.css',
    mark: '--_lc-container',
    html: (n) => `<tanrei-link-card><a href="#c${n}">Card ${n}</a></tanrei-link-card>`,
    drawn: { part: '', property: 'display' },
    inside: '',
    steady: true,
  },
  {
    tag: 'tanrei-tree-view',
    css: 'tree-view.css',
    mark: '--_trv-gap',
    html: (n) => `<tanrei-tree-view label="Tree ${n}"><ul><li data-value="a${n}"><span>Item</span></li></ul></tanrei-tree-view>`,
    drawn: { part: 'ul', property: 'padding-left' },
    inside: 'li',
    steady: true,
  },
  {
    tag: 'tanrei-breadcrumbs',
    css: 'breadcrumbs.css',
    mark: '--_brc-start',
    html: (n) => `<tanrei-breadcrumbs label="Trail ${n}"><a href="#h${n}">Home</a><span aria-current="page">Here</span></tanrei-breadcrumbs>`,
    drawn: { part: 'a', property: 'text-decoration-line' },
    inside: '',
    steady: true,
  },
  {
    tag: 'tanrei-table-of-contents',
    css: 'table-of-contents.css',
    mark: '--_toc-row-height',
    html: (n) => `<tanrei-table-of-contents label="Contents ${n}"><ul><li><a href="#s${n}">Section</a></li></ul></tanrei-table-of-contents>`,
    drawn: { part: 'ul', property: 'padding-left' },
    inside: 'li',
    steady: true,
  },
  {
    tag: 'tanrei-code-block',
    css: 'code.css',
    mark: '--_code-block-light',
    html: (n) => `<tanrei-code-block><pre><code>const n = ${n};</code></pre></tanrei-code-block>`,
    drawn: { part: 'pre', property: 'margin-top' },
    inside: '',
    steady: true,
  },
  {
    tag: 'tanrei-app-shell',
    css: 'app-shell.css',
    mark: '--_aps-breakpoint-medium',
    html: (n) => `<tanrei-app-shell><header slot="header">Header ${n}</header><main id="main${n}">Main</main></tanrei-app-shell>`,
    drawn: { part: '', property: 'display' },
    inside: 'main',
    steady: true,
  },
  {
    tag: 'tanrei-skeleton',
    css: 'skeleton.css',
    mark: '--_skl-gap',
    html: (n) => `<tanrei-skeleton label="Loading ${n}" show-delay="0"><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>`,
    drawn: { part: '', property: 'display' },
    inside: '',
    steady: false,
  },
];
