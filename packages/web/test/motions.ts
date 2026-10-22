import type { Locator, Page } from '@playwright/test';

/**
 * Motions that run inside shadow roots, waited for or counted where they run.
 *
 * `document.getAnimations()` lists only the animations of the document's own tree, and `el.getAnimations({ subtree:
 * true })` only those of the element's own tree: neither looks into a shadow root, in Chromium, Firefox or WebKit. A
 * component's motions run in its shadow root, so a wait built on either returns at once and a count reads 0 while the
 * component moves. These ask every shadow root on the way down.
 */

/**
 * The source of an in-page function `(root) => Animation[]`: every animation in `root` (a document, a shadow root or an
 * element and its subtree) and in each shadow root inside it, at any depth. For a script the test writes into the page
 * itself (`const every = ${EVERY_ANIMATION};`), where a function of this module cannot be called.
 */
export const EVERY_ANIMATION = `(function every(root) {
  const own = root.nodeType === Node.ELEMENT_NODE ? root.getAnimations({ subtree: true }) : root.getAnimations();
  const inside = [...(root.nodeType === Node.ELEMENT_NODE ? [root] : []), ...root.querySelectorAll('*')].flatMap((el) => (el.shadowRoot ? every(el.shadowRoot) : []));
  return [...own, ...inside];
})`;

/**
 * Waits until every motion of `target` has ended: the element's own, its subtree's, and those in every shadow root
 * inside it — or, given the page, every motion in it. Those running when it is asked are waited for (asking flushes
 * style, so a motion the last change starts is among them). An animation that never ends (a spinner's) is not waited
 * for, and one that is cancelled counts as ended.
 */
export const motionEnded = (target: Locator | Page): Promise<void> =>
  ('keyboard' in target ? target.locator(':root') : target).evaluate(async (given, source) => {
    const el = given === document.documentElement ? document : given;
    const running = ((0, eval)(source) as (root: Element | Document) => Animation[])(el);
    const ending = running.filter((animation) => Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY);
    await Promise.all(ending.map((animation) => animation.finished.catch(() => undefined)));
  }, EVERY_ANIMATION);

/**
 * How many motions `target` has now — its own, its subtree's and those in every shadow root inside it — counting those
 * running, paused or waiting for their delay: "nothing moves" is 0. Asking flushes style, so a motion the last change
 * starts is counted.
 */
export const motionCount = (target: Locator): Promise<number> =>
  target.evaluate((given, source) => ((0, eval)(source) as (root: Element) => Animation[])(given).length, EVERY_ANIMATION);
