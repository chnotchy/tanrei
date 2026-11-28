import type { Page } from '@playwright/test';

/**
 * Resolves once no element the page draws is settling (`data-tanrei-settling`, in the document and every shadow root).
 *
 * Every element settles from each time it is connected until two frame callbacks after its first update (MOT-3,
 * src/primitives/element.ts): a test that counts the frames a page asks for at rest begins counting after that, or it
 * counts the two callbacks of an element that a render has just connected. One the page does not draw (in a hidden
 * container, a panel not shown, a closed details) settles until two frames after it is first drawn, and asks for no
 * frame meanwhile: it is not waited for. Whether it is drawn is asked as `Settle` asks it (src/primitives/motion.ts):
 * its own box, or, for a host of `display: contents`, the nearest box up its flat tree.
 */
export const allSettled = (page: Page): Promise<unknown> =>
  page.waitForFunction(() => {
    const flatParent = (el: Element): Element | null => el.assignedSlot ?? el.parentElement ?? ((el.getRootNode() as ShadowRoot).host || null);
    const drawn = (el: Element): boolean => {
      let at: Element | null = el;
      while (at && getComputedStyle(at).display === 'contents') at = flatParent(at);
      return !at || at.checkVisibility();
    };
    const settling = (root: Document | ShadowRoot): boolean =>
      [...root.querySelectorAll('*')].some((el) => (el.hasAttribute('data-tanrei-settling') && drawn(el)) || (!!el.shadowRoot && settling(el.shadowRoot)));
    return !settling(document);
  });
