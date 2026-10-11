// `autofocus` on an element that is not focusable itself — its shadow root delegates focus, or its `focus()` goes to
// a part of it — when the page first loads.
//
// The browser looks for what `autofocus` names when it first draws the page. An element a module script defines is
// not defined yet: its host has no shadow root to delegate to, the browser focuses nothing, and it does not look
// again. (Inserted into a page whose elements are defined, a host that delegates focus is focused by the browser.) So
// the element takes the focus itself, once, when it first renders — and only where the page has given focus to
// nothing else, as the browser's own autofocus does.
import type { LitElement } from 'lit';

/** Whether `host` is asked for by `autofocus` and nothing of the page has focus. */
export function wantsAutofocus(host: HTMLElement): boolean {
  if (!host.hasAttribute('autofocus')) return false;
  const active = host.ownerDocument.activeElement;
  return !active || active === host.ownerDocument.body || active === host.ownerDocument.documentElement;
}

/**
 * Gives an element's class that answer in one call, after the class is written: when an element of it first renders
 * with `autofocus`, and nothing but the body has focus then and still when its first update has ended, it is focused
 * (its own `focus()`, which delegates).
 */
export function focusedAtFirst(element: { prototype: LitElement }): void {
  const prototype = element.prototype as unknown as { firstUpdated(changed: unknown): void };
  const first = prototype.firstUpdated;
  prototype.firstUpdated = function (this: LitElement, changed: unknown) {
    first.call(this, changed);
    if (!wantsAutofocus(this)) return;
    void this.updateComplete.then(() => {
      if (this.isConnected && wantsAutofocus(this)) this.focus();
    });
  };
}
