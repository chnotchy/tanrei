// Where a light-DOM element of this package is used, for the observer that marks the glyphs that mirror.
//
// A `.tanrei-icon` the product puts in an element that draws in the light DOM (an accordion's header, a tree view's row)
// is marked by the page's observer (`observeIcons()`, src/primitives/glyph-mirror.ts), which `@tanrei/web` and
// `@tanrei/web/icons` install on the document. A document's observer cannot see into a shadow root, and a product that
// renders its own view in one — the usual case for a page of web components — would see every such glyph drawn
// unmirrored in a right-to-left layout. So the element says when it is connected and disconnected (`lightHost()`,
// called by TanreiLightElement), and the module that installs the document's observer hears it (`hearLightHosts()`,
// src/icons.ts): it observes the shadow root the element is connected in while the element is there. In the document
// nothing changes: the document is observed already.
//
// This module holds only the message, so a light-DOM element that imports it carries neither the icon sets nor the
// observer. Nothing here reads a style or a layout.

/** What hears an element connected (`true`) or disconnected (`false`). */
type Told = (host: Element, connected: boolean) => void;

/** The elements connected before anything hears them, told once something does. */
const waiting = new Set<Element>();
let told: Told | undefined;

/** Tells that `host`, a light-DOM element of the package, was connected or disconnected. */
export function lightHost(host: Element, connected: boolean): void {
  if (told) told(host, connected);
  else if (connected) waiting.add(host);
  else waiting.delete(host);
}

/** Hears every light-DOM element of the package connected and disconnected: those connected now first. Once per page. */
export function hearLightHosts(listener: Told): void {
  told = listener;
  for (const host of waiting) listener(host, true);
  waiting.clear();
}
