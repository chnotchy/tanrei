// Adding a stylesheet to the root an element stands in — the document or a shadow root — and what it costs the page.
//
// A component that is drawn in the light DOM, or that draws the product's own children from outside its
// shadow root, has ONE stylesheet: the page loads it (`@tanrei/web/<name>.css`) to draw the component before any
// script runs, and the element carries the same text and adds it to its root, so that it is drawn without the page's
// copy and inside a product's own shadow root.
//
// A root that already has the rules must not get them a second time. A sheet added to the DOCUMENT has the browser
// build the document's rules again, and — where the sheet holds an `@property`, a layer or a selector that no tag or
// class narrows — style every element of the page again: on a long page each such write costs 60 to 90 ms, once per
// component whose module arrived. So:
//
//   - `adopt()` writes `adoptedStyleSheets` only when the sheet is not in the list (by identity), and never assigns a
//     list that says what the root already has;
//   - `adoptUnlessDrawn()` first asks the cascade whether the root draws the element already: a name the stylesheet
//     sets on the element itself. The cascade is the truth — a page that loaded the sheet into a layer of its own, or
//     inside a bundle, answers the same — and it is asked once for a root while the root's own stylesheets stay as
//     many as they were: not once per instance, not once per turn, and not once per kind — the first question asks it
//     for every kind of element that stands in the root (`DRAWN_MARKS`), in one style pass.

import { flatParent } from './flat-tree.js';

type Root = Document | ShadowRoot;

const isRoot = (node: Node): node is Root => 'adoptedStyleSheets' in node;

/** Adds `sheet` to `root`, unless the root has it: one write of `adoptedStyleSheets` for a sheet and a root, ever. */
export function adopt(root: Node, sheet: CSSStyleSheet | null | undefined) {
  if (!sheet || !isRoot(root) || root.adoptedStyleSheets.includes(sheet)) return;
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
}

/**
 * The element whose answer is the root's: the outermost one of `element`'s own kind among its ancestors in the same
 * root, or `element` itself. An element inside one of its own kind (an accordion in an item of an accordion) inherits
 * the name with the very value its own rule gives it, so its parent would answer for it whether the root has the rule
 * or not; the outermost one inherits from nothing of its kind that the root's rules reach.
 */
function outermost(element: Element): Element {
  let subject = element;
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.localName === element.localName) subject = ancestor;
  }
  return subject;
}

/**
 * Whether the rules that set `mark` on `element` are in its root's cascade: the name has a value on the element — on
 * the outermost of its kind in that root — which is not simply what it inherits (a custom property inherits, and an
 * element of the same kind around this one in ANOTHER root, its own sheet drawing it, would answer for a root that
 * has no such rule).
 */
function drawn(element: Element, mark: string): boolean {
  const subject = outermost(element);
  const value = getComputedStyle(subject).getPropertyValue(mark).trim();
  if (value === '') return false;
  const from = flatParent(subject);
  return !from || getComputedStyle(from).getPropertyValue(mark).trim() !== value;
}

/**
 * Every element drawn by one stylesheet of its own (every caller of `adoptUnlessDrawn()`, as `test/light-dom.ts` lists
 * them), and the name that stylesheet sets on it. The first question asked in a root is asked for every one of them
 * that stands in the root at that moment, in the same style pass: on a page whose modules arrive one by one, each
 * defining its elements in a task of its own, a question of each kind in its own module had the browser style the page
 * once for each of them — a tenth of a second each on a long page. Only what is drawn is kept from it: a kind whose
 * rules the root does not have yet (a stylesheet still loading) is asked again when its own element is connected. A
 * name that is missing here, or wrong, only has that kind ask for itself (`src/primitives/sheets.test.ts` holds the list to
 * `test/light-dom.ts`).
 */
export const DRAWN_MARKS: Readonly<Record<string, `--${string}`>> = {
  'tanrei-accordion': '--_acc-container',
  'tanrei-app-shell': '--_aps-breakpoint-medium',
  'tanrei-breadcrumbs': '--_brc-start',
  'tanrei-code-block': '--_code-block-light',
  'tanrei-description-list': '--_dl-fact-gap',
  'tanrei-figure': '--_figure-fill',
  'tanrei-link-card': '--_lc-container',
  'tanrei-page-header': '--_pgh-title-font',
  'tanrei-skeleton': '--_skl-gap',
  'tanrei-table': '--_table-pad-block',
  'tanrei-table-of-contents': '--_toc-row-height',
  'tanrei-tree-view': '--_trv-gap',
};

/**
 * The kinds each root was found to draw already (by tag and mark), with the number of stylesheets the root had when it
 * answered. The answers are kept while that number stands — a page's stylesheets do not come and go with its elements
 * — so the cascade is asked ONCE for a root, not once for each kind, nor once for each turn in which an element is
 * connected: the question is a read of computed style inside the script that connected the element, and has the
 * browser style (and, on a page with container queries, lay out) whatever that script has written so far. A root that
 * gains or loses a stylesheet is asked again.
 */
const found = new WeakMap<Root, { count: number; asked: boolean; drawn: Set<string> }>();

/** How many stylesheets of its own the root has (linked, written in a `<style>`): reading it styles nothing. */
const loaded = (root: Root) => root.styleSheets.length;

const kind = (tag: string, mark: string) => `${tag} ${mark}`;

/**
 * Adds `sheet` to the root `element` stands in, unless that root draws the element already — it has the sheet, or the
 * page loaded the same rules as a stylesheet of its own (`mark` is a custom property the sheet sets on every element
 * of this element's kind, and on nothing else).
 */
export function adoptUnlessDrawn(element: Element, sheet: CSSStyleSheet | null | undefined, mark: `--${string}`) {
  const root = element.getRootNode();
  if (!sheet || !isRoot(root) || root.adoptedStyleSheets.includes(sheet)) return;
  const count = loaded(root);
  let answers = found.get(root);
  if (!answers || answers.count !== count) found.set(root, (answers = { count, asked: false, drawn: new Set() }));
  const own = kind(element.localName, mark);
  if (answers.drawn.has(own)) return;
  const drawnHere = drawn(element, mark);
  if (drawnHere) answers.drawn.add(own);
  // The first question of the root: the other kinds that stand in it are asked in the same style pass, before the
  // sheet below (if any) is added and has the page styled again.
  if (!answers.asked) {
    answers.asked = true;
    for (const [tag, name] of Object.entries(DRAWN_MARKS)) {
      const other = kind(tag, name);
      if (other === own) continue;
      const instance = root.querySelector(tag);
      if (instance && drawn(instance, name)) answers.drawn.add(other);
    }
  }
  if (!drawnHere) adopt(root, sheet);
}
