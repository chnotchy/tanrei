// The one script of a window of the fixtures' gallery (lib/fixture-stages.ts writes each window's document): it defines
// the Tanrei elements the window's fixture holds, as a page of the site defines its own (lib/register-web.ts). A
// window's document inherits the page's policy, which runs no inline script that the page itself does not hold, so the
// window runs this module from the site, by its address.
//
// The page imports it too, for that address alone (`windowModule`): it is the module's own, whatever the build names
// its file. In the page it defines nothing more — the page has already imported what it imports.

/** The address of this module, which a window's document loads. */
export const windowModule = import.meta.url;

/** Set on a window's root while it draws (`HELD`): the page takes it away once what the window draws has opened. */
export const HELD = 'data-docs-held';

/**
 * While a window draws, it neither takes the page's focus nor scrolls the page. A modal fixture opens as it is drawn —
 * `showModal()` moves focus into the dialog, and `focus()` is called on what it holds — and each engine then moves the
 * page's focus into the frame and scrolls the page to it, whether the frame is `inert` or not: a page of windows drawn
 * as the reader scrolls past them would be scrolled back to each one. Each open and each focus is let take place in the
 * window, without scrolling, and the page's focus and scroll are given back as they were.
 */
function hold(root: HTMLElement) {
  const page = window.parent as Window & typeof globalThis;
  const frame = window.frameElement as HTMLElement | null;
  const kept = <T>(run: () => T): T => {
    if (!root.hasAttribute(HELD) || page === window) return run();
    const focused = page.document.activeElement;
    const x = page.scrollX;
    const y = page.scrollY;
    const giveBack = () => {
      if (page.scrollX !== x || page.scrollY !== y) page.scrollTo({ left: x, top: y, behavior: 'instant' });
      if (page.document.activeElement === focused) return;
      if (focused instanceof page.HTMLElement && focused !== page.document.body) return focused.focus({ preventScroll: true });
      // Nothing of the page had the focus: the window gives up its own, so that nothing of it is revealed by scrolling.
      (document.activeElement as HTMLElement | null)?.blur();
      frame?.blur();
    };
    try {
      return run();
    } finally {
      giveBack();
      // WebKit moves the page's focus after the call has returned, and scrolls the page at its next frame. The page's
      // frames are asked for, not the window's: WebKit holds back the frames of a window out of view.
      page.requestAnimationFrame(() => {
        giveBack();
        page.requestAnimationFrame(giveBack);
      });
    }
  };
  const showModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    return kept(() => showModal.call(this));
  };
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
    return kept(() => focus.call(this, root.hasAttribute(HELD) ? { ...options, preventScroll: true } : options));
  };
}

const root = document.documentElement;
if (root.hasAttribute(HELD)) {
  hold(root);
  await import('./register-web');
}
