import { ariaAttribute } from './delegated-aria.js';

/**
 * Semantics that live on the host (a divider, a progress indicator, a loading indicator): components with no native
 * element to carry them — nothing is interactive, so there is nothing to focus — whose spec says the host carries
 * `role` and its `aria-*` attributes. `null` removes an attribute; an attribute is only written when it changes, so an
 * update that changes nothing does not touch the accessibility tree. (A pressable component keeps its semantics on the
 * native element in its shadow root instead: axe cannot see `ElementInternals`.)
 */
export function hostAria(host: Element, attributes: Record<string, string | null>) {
  for (const [name, value] of Object.entries(attributes)) {
    // A component that moves the product's ARIA to data-aria-* holds the value there (src/primitives/delegated-aria.ts).
    const now = ariaAttribute(host, name);
    if (value === null) {
      if (now !== null) host.removeAttribute(name);
    } else if (now !== value) host.setAttribute(name, value);
  }
}
