import type { Page } from '@playwright/test';

/**
 * Resolves once no element on the page is settling (`data-tanrei-settling`, in the document and every shadow root).
 *
 * Every element settles from each time it is connected until two frame callbacks after its first update (MOT-3,
 * src/primitives/element.ts): a test that counts the frames a page asks for at rest begins counting after that, or it
 * counts the two callbacks of an element that a render has just connected.
 */
export const allSettled = (page: Page): Promise<unknown> =>
  page.waitForFunction(() => {
    const settling = (root: Document | ShadowRoot): boolean =>
      [...root.querySelectorAll('*')].some((el) => el.hasAttribute('data-tanrei-settling') || (!!el.shadowRoot && settling(el.shadowRoot)));
    return !settling(document);
  });
