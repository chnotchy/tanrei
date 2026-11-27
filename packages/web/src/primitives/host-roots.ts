// Where an element of this package is used, for the page's observers that cannot see into a shadow root.
//
// Two scripts of the package observe the document and write on what the product put in it: the observer that marks the
// glyphs that mirror (`observeIcons()`, src/primitives/glyph-mirror.ts — a `.tanrei-icon` in an accordion's header, a
// dialog's body or a button's label), and the Link's script (`observeLinks()`, src/link.ts — a `.tanrei-link` in an app
// shell's skip link slot, a table's cell or a dialog's body, which takes its label's own direction as `dir`). A
// document's observer cannot see into a shadow root, and a product that renders its own view in one — the usual case
// for a page of web components — would see every such glyph drawn unmirrored in a right-to-left layout, and every such
// link drawn without what the script adds. So each element of the package — drawn in the light DOM or in a shadow root
// of its own, since what the product slots into the latter stays in the product's root — says when it is connected
// and disconnected (`hostRoot()`, called by TanreiElement and TanreiLightElement, with the root it reads once), and
// each module that installs a document's observer hears it (`hearHostRoots()`): it observes the shadow root the
// element is connected in while the element is there. In the document nothing changes: the document is observed
// already, and an element connected there is not told at all. Nor is one drawn in the shadow root of another element
// of the package: what is there the package draws itself (TanreiElement leaves it out).
//
// This module holds only the message, so an element that imports it carries neither the icon sets, the Link's script
// nor their observers. Nothing here reads a style or a layout.

/** What hears an element connected in a shadow root (its root), or disconnected after it was (`null`). */
type Told = (host: Element, root: ShadowRoot | null) => void;

/** The elements connected in a shadow root now, with it: told to each listener that comes after them. */
const inShadowRoots = new Map<Element, ShadowRoot>();
const listeners: Told[] = [];

/**
 * Tells that `host`, an element of the package, was connected in `root` (what its `getRootNode()` returned), or
 * disconnected (`null`). A root that is not a shadow root is not told.
 */
export function hostRoot(host: Element, root: Node | null): void {
  if (root) {
    if (!(root instanceof ShadowRoot)) return;
    inShadowRoots.set(host, root);
  } else if (!inShadowRoots.delete(host)) {
    return;
  }
  for (const listener of listeners) listener(host, root);
}

/**
 * Hears every element of the package connected in a shadow root, and disconnected after it: those connected now
 * first. Once per listener (each observer of the page has one).
 */
export function hearHostRoots(listener: Told): void {
  if (listeners.includes(listener)) return;
  listeners.push(listener);
  for (const [host, root] of inShadowRoots) listener(host, root);
}
