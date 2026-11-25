/** What has focus in `document`, inside every shadow root it is in. */
export function focusedIn(document: Document): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/**
 * The parent of an element in the flat tree, the tree the page is drawn from: the slot it is assigned to where it has
 * one, else its parent element, else the host of the shadow root it stands at the top of; `null` at the document's
 * root. What lays out, clips, scrolls, inherits or is inert is walked up this way.
 */
export function flatParent(element: Element): Element | null {
  const up = element.assignedSlot ?? element.parentElement;
  if (up) return up;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}
