import type { Locator, Page } from '@playwright/test';

/**
 * In the page: asks for one frame and waits for it. Where the test has installed a clock of the page's own
 * (`page.clock`, test/page-clock.ts), `requestAnimationFrame` is the clock's and runs only as the test moves it: then
 * nothing is waited for. Self-contained, so that it can be given to `page.evaluate()`.
 */
export async function frameInPage(): Promise<void> {
  if (!/\[native code\]/.test(Function.prototype.toString.call(requestAnimationFrame))) return;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Has the page draw a frame after the test changed what it lays out: a box's size (`restyle()`), a token on the root
 * (`rootTokens()`), an attribute, an element put in or taken out (`rewrite()`).
 *
 * Playwright's headless WebKit on Linux (the WPE build that CI runs, `scripts/ci-like.sh`) now and then performs no
 * rendering update after such a write from the test: the new style and layout are there for any read, but for seconds
 * nothing is drawn and no resize observer is told, so a component that answers its own size (a table that releases
 * its first column) is seen not to answer. A frame callback asked for from the page ends it at once; a repaint or a
 * forced layout does not. The same pages in a headed WebKit never did it, and a product's page asks for frames of its
 * own all the time.
 *
 * Measured in that container, each write followed by a wait polled from the test as an `expect` polls, 2,000 writes of
 * each kind: on a page of one table, with a resize observer on its stage, a width written inline 12, a height 9, a
 * token on the root 7, an attribute 7, `hidden` 9, an element put in or taken out 5, a cell's text 0; on the table's own
 * answer (TBL-42, its first column released and kept), a width 7, an attribute 8, a token 3, an element put in a cell
 * and taken out 0. With a frame asked for after each write (these helpers): 0 of 14,000 on the first page,
 * 0 of 8,000 on the second.
 */
export const askForFrame = (page: Page): Promise<void> => page.evaluate(frameInPage);

/**
 * Runs `write` on the element of `target` in the page — an attribute set or taken off, an element put in or taken out,
 * a property that changes what is drawn — then has the page draw a frame (`askForFrame()`), so that a test that then
 * waits for what follows from the write waits for the component, never for that engine's next frame. What `write`
 * returns is returned.
 *
 *   await rewrite(host(page, 'a'), (el) => el.setAttribute('size', 'small'));
 *   await rewrite(stage(page, 'a'), (el, html) => el.insertAdjacentHTML('beforeend', html), markup);
 */
export async function rewrite<R, Arg>(target: Locator, write: (el: HTMLElement, arg: Arg) => R | Promise<R>, arg?: Arg): Promise<R> {
  // Playwright types the element as either kind and the argument as it arrives serialized; a write names its element
  // as an HTML element, which a test's target is, and gets its argument as it gave it.
  const result = await target.evaluate(write as unknown as (el: SVGElement | HTMLElement, arg: unknown) => R | Promise<R>, arg);
  await askForFrame(target.page());
  return result;
}
