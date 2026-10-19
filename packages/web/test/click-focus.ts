// Where a mouse press puts focus, as Safari on macOS decides it — in any engine.
//
// HTML leaves it to the browser which focusable areas a click focuses ("click focusable"), and asks only that one with
// a tabindex be one. Safari on macOS follows the platform: a pressed `<button>`, checkbox or link takes no focus, and
// a press that lands inside a shadow root that delegates focus goes to the first element in it that a click does
// focus — so a part with `tabindex="-1"` takes the focus of a press on its neighbour. Chromium, Firefox and WebKit on
// Linux focus the pressed button itself, so a test of "a press never gives that part focus" passes there whatever the
// component does. With this rule simulated, the same test fails on Linux as it does on a Mac.
//
// What it simulates (observed in Playwright's WebKit on macOS): for a primary-button `mousedown` that no listener has
// cancelled, the engine's own focusing is cancelled at the window, after every listener of the page and the component
// has run, and focus is placed by these steps instead — through the event's path from the target outward, the first
// element a click focuses takes focus; a shadow host that delegates focus hands it to the first element of its shadow
// tree, in tree order, that a click focuses, and is passed when it has none; where no element takes it, the focused
// element loses focus, to the body. A click focuses an element with a tabindex and a text control, while neither
// disabled, inert nor hidden.
import type { Page } from '@playwright/test';

/** Installs the rule on the page's current document, until it is reloaded. */
export const simulateMacClickFocus = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const TEXT = 'input:not([type=button], [type=submit], [type=reset], [type=checkbox], [type=radio], [type=range], [type=color], [type=file], [type=image]), textarea, [contenteditable]:not([contenteditable=false])';
    const takes = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement &&
      (el.hasAttribute('tabindex') || el.matches(TEXT)) &&
      !el.matches(':disabled') &&
      !el.closest('[inert]') &&
      el.checkVisibility();
    const delegate = (host: Element): HTMLElement | null => {
      for (const each of host.shadowRoot!.querySelectorAll('*')) {
        if (each.shadowRoot?.delegatesFocus) {
          const inner = delegate(each);
          if (inner) return inner;
        } else if (takes(each)) return each;
      }
      return null;
    };
    window.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.defaultPrevented) return;
      event.preventDefault();
      for (const each of event.composedPath()) {
        if (!(each instanceof Element)) continue;
        const to = each.shadowRoot?.delegatesFocus ? delegate(each) : takes(each) ? each : null;
        if (to) return to.focus();
      }
      (document.activeElement as HTMLElement | null)?.blur();
    });
  });
