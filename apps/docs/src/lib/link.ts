// What the docs' link forms (the hero's actions, the link cards, the component index) share. No imports: the browser's
// module (link-fallback.ts) reads it too.

/** Marks the plain anchor a link form holds until its element is defined (lib/link-fallback.ts). */
export const linkAttribute = 'data-link-fallback';

/** Whether an address leaves the site: it names a scheme or a host. A path or a fragment stays. */
export const isExternal = (href: string) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href.trim());

/**
 * The destination props of a Tanrei link form for an address: one that leaves the site opens in a new tab
 * and says so in `newTabLabel`, the page's words for it (`strings(lang).opensInNewTab`).
 */
export function destination(href: string, newTabLabel: string) {
  const external = isExternal(href);
  return { external, props: { href, target: external ? 'new' : undefined, 'target-label': external ? newTabLabel : undefined } } as const;
}
