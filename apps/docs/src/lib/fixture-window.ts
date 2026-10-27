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
 * as the reader scrolls past them would be scrolled back to each one. WebKit scrolls at a frame of the window's own,
 * which it holds back while the window is out of view, so a scroll cannot be put back afterwards: put back on the
 * page's next frames it was too early on a loaded machine, and the page was scrolled to the window later; and putting
 * back a place read before those frames undid the reader's own scrolling since. So nothing in the window is revealed:
 * a dialog opens with nothing focused in it (it is `inert` for the call, so its focusing steps find nothing), and a
 * focus asked for takes place without scrolling. The page's focus is given back as it was, in the call and — where
 * the page's focus has gone into the frame since (WebKit moves it after the call has returned) — on the page's next
 * frames and when the window is let go.
 */
function hold(root: HTMLElement) {
  const page = window.parent as Window & typeof globalThis;
  const frame = window.frameElement as HTMLElement | null;
  if (page === window || !frame) return;
  // What had the page's focus before the window first took a part in it.
  let before: Element | null = null;
  const giveBack = () => {
    const now = page.document.activeElement;
    // The focus is the page's own where it is on something of the page (the reader's), or still where it was. It went
    // into the frame where it is on the frame, or nowhere (Firefox takes it off the page's element and names none).
    if (!before || now === before || (now !== frame && now !== null && now !== page.document.body)) return;
    if (before instanceof page.HTMLElement && before !== page.document.body) before.focus({ preventScroll: true });
    else {
      (document.activeElement as HTMLElement | null)?.blur();
      frame.blur();
    }
  };
  const kept = <T>(run: () => T): T => {
    if (!root.hasAttribute(HELD)) return run();
    const focused = page.document.activeElement;
    if (focused !== frame) before = focused ?? page.document.body;
    const x = page.scrollX;
    const y = page.scrollY;
    try {
      return run();
    } finally {
      if (page.scrollX !== x || page.scrollY !== y) page.scrollTo({ left: x, top: y, behavior: 'instant' });
      giveBack();
      // The page's frames, not the window's: WebKit holds back the frames of a window out of view.
      page.requestAnimationFrame(() => {
        giveBack();
        page.requestAnimationFrame(giveBack);
      });
    }
  };
  // Let go (lib/fixture-stages.ts takes the mark away): the page's focus is given back once more if it went in since.
  new MutationObserver(() => {
    if (!root.hasAttribute(HELD)) giveBack();
  }).observe(root, { attributes: true, attributeFilter: [HELD] });
  const showModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    if (!root.hasAttribute(HELD)) return showModal.call(this);
    const inert = this.inert;
    this.inert = true;
    try {
      return kept(() => showModal.call(this));
    } finally {
      this.inert = inert;
    }
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
