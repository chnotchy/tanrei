// Where a light-DOM element of this package is used, for the page's observers that cannot see into a shadow root.
//
// Two scripts of the package observe the document and write on what the product put in it: the observer that marks the
// glyphs that mirror (`observeIcons()`, src/primitives/glyph-mirror.ts — a `.tanrei-icon` in an accordion's header or a
// tree view's row), and the Link's script (`observeLinks()`, src/link.ts — a `.tanrei-link` in an app shell's skip link
// slot or in a table's cell, which takes its label's own direction as `dir`). A document's observer cannot see into a
// shadow root, and a product that renders its own view in one — the usual case for a page of web components — would
// see every such glyph drawn unmirrored in a right-to-left layout, and every such link drawn without what the script
// adds. So the element says when it is connected and disconnected (`lightHost()`, called by TanreiLightElement), and
// each module that installs a document's observer hears it (`hearLightHosts()`): it observes the shadow root the element
// is connected in while the element is there. In the document nothing changes: the document is observed already, and
// an element connected there is not told at all.
//
// This module holds only the message, so a light-DOM element that imports it carries neither the icon sets, the Link's
// script nor their observers. Nothing here reads a style or a layout.

/** What hears an element connected in a shadow root (`true`), or disconnected after it was (`false`). */
type Told = (host: Element, connected: boolean) => void;

/** The elements connected in a shadow root now: told to each listener that comes after them. */
const inShadowRoots = new Set<Element>();
const listeners: Told[] = [];

/** Tells that `host`, a light-DOM element of the package, was connected or disconnected. */
export function lightHost(host: Element, connected: boolean): void {
  if (connected) {
    if (!(host.getRootNode() instanceof ShadowRoot)) return;
    inShadowRoots.add(host);
  } else if (!inShadowRoots.delete(host)) {
    return;
  }
  for (const listener of listeners) listener(host, connected);
}

/**
 * Hears every light-DOM element of the package connected in a shadow root, and disconnected after it: those connected
 * now first. Once per listener (each observer of the page has one).
 */
export function hearLightHosts(listener: Told): void {
  if (listeners.includes(listener)) return;
  listeners.push(listener);
  for (const host of inShadowRoots) listener(host, true);
}
