// An engine whose focus() does not know the `focusVisible` option, in any engine.
//
// Chrome and Edge before 145 and Safari before 18.4 are inside the package's floor (Chrome and Edge 125, Firefox 126,
// Safari 17.5) and leave the option unread: a script's focus there is drawn by the engine's own rule — with the focus
// indicator unless the last focus the engine counted was a pointer's — whatever the component asked for. Every engine
// the tests run in reads it, so a test of "a pointer's press moves focus with no ring" passes there whatever the
// component does in those browsers. With this installed, focus() reads `preventScroll` alone (a dictionary member the
// engine knows) and never `focusVisible`, and `hasFocusVisibleOption()` answers false, as it does in those browsers.
import type { Page } from '@playwright/test';

/** Installs the rule on the page's current document, until it is reloaded. */
export const withoutFocusVisibleOption = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
      const known: FocusOptions = {};
      if (options && 'preventScroll' in options) known.preventScroll = options.preventScroll;
      focus.call(this, known);
    };
  });
