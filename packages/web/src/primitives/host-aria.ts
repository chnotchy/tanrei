/**
 * Semantics that live on the host (a divider, a progress indicator, a loading indicator): components with no native
 * element to carry them — nothing is interactive, so there is nothing to focus — whose spec says the host carries
 * `role` and its `aria-*` attributes. `null` removes an attribute; an attribute is only written when it changes, so an
 * update that changes nothing does not touch the accessibility tree. (A pressable component keeps its semantics on the
 * native element in its shadow root instead: axe cannot see `ElementInternals`.)
 */
export function hostAria(host: Element, attributes: Record<string, string | null>) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null) {
      if (host.hasAttribute(name)) host.removeAttribute(name);
    } else if (host.getAttribute(name) !== value) host.setAttribute(name, value);
  }
}
