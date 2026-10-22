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
//     inside a bundle, answers the same — and it is asked once for a root and a sheet while the root's own stylesheets
//     stay as many as they were: not once per instance, and not once per turn.

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
 * The sheets each root was found to draw already, with the number of stylesheets the root had when it answered. The
 * answer is kept while that number stands — a page's stylesheets do not come and go with its elements — so the
 * cascade is asked ONCE for a root and a sheet, not once for each turn in which an element is connected: the question
 * is a read of computed style inside the script that connected the element, and has the browser style (and, on a page
 * with container queries, lay out) whatever that script has written so far. A root that gains or loses a stylesheet
 * is asked again.
 */
const found = new WeakMap<Root, Map<CSSStyleSheet, number>>();

/** How many stylesheets of its own the root has (linked, written in a `<style>`): reading it styles nothing. */
const loaded = (root: Root) => root.styleSheets.length;

/**
 * Adds `sheet` to the root `element` stands in, unless that root draws the element already — it has the sheet, or the
 * page loaded the same rules as a stylesheet of its own (`mark` is a custom property the sheet sets on every element
 * of this element's kind, and on nothing else).
 */
export function adoptUnlessDrawn(element: Element, sheet: CSSStyleSheet | null | undefined, mark: `--${string}`) {
  const root = element.getRootNode();
  if (!sheet || !isRoot(root) || root.adoptedStyleSheets.includes(sheet)) return;
  let sheets = found.get(root);
  if (!sheets) found.set(root, (sheets = new Map()));
  const count = loaded(root);
  if (sheets.get(sheet) === count) return;
  if (drawn(element, mark)) sheets.set(sheet, count);
  else {
    sheets.delete(sheet);
    adopt(root, sheet);
  }
}
