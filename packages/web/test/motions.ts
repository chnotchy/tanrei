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
 * The element's computed `property` (of its `pseudo`-element, given one), read once no motion that can change it still
 * runs: the element's own transitions and animations, its pseudo-element's, and those of every ancestor in the flat
 * tree — through the slot it is assigned to, and out of each shadow root to its host. An ancestor's motion counts
 * because an inherited property (`color`, a custom property a `var()` reads) follows it with no motion of its own, so
 * `el.getAnimations()` lists nothing while the value still moves.
 *
 * The race it closes: a colour polled until it equals its end value can pass while its transition still runs — an
 * engine serializes an interpolated colour like its end value (Firefox writes it in the end value's space, alpha already
 * rounded, and unpremultiplies a translucent one differently from one frame to the next) — and a strict read of the
 * same value a moment later reads another frame of the motion. Poll this, not a plain read, when an exact read of the
 * same value follows; or wait with `motionEnded()` between the two. An animation that never ends (a spinner's) and one
 * that is paused are not waited for; one that is cancelled counts as ended; one that a finished one starts is waited
 * for in turn.
 */
export const settledCss = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate(
    async (el, [name, part]) => {
      for (;;) {
        const chain: Element[] = [];
        for (let node: Element | null = el; node; node = node.assignedSlot ?? node.parentElement ?? ((node.parentNode as ShadowRoot | null)?.host ?? null)) chain.push(node);
        // Asking flushes style, so a motion the last change starts is among them. The element's own list, with
        // subtree, holds its pseudo-elements' (each targets the element); a descendant's is no part of its value.
        const own = el.getAnimations({ subtree: true }).filter((animation) => (animation.effect as KeyframeEffect | null)?.target === el);
        const running = [...own, ...chain.slice(1).flatMap((node) => node.getAnimations())].filter(
          (animation) => animation.playState === 'running' && Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY,
        );
        if (!running.length) return getComputedStyle(el, part ?? undefined).getPropertyValue(name);
        await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
      }
    },
    [property, pseudo ?? null] as const,
  );

/**
 * How many motions `target` has now — its own, its subtree's and those in every shadow root inside it — counting those
 * running, paused or waiting for their delay: "nothing moves" is 0. Asking flushes style, so a motion the last change
 * starts is counted.
 */
export const motionCount = (target: Locator): Promise<number> =>
  target.evaluate((given, source) => ((0, eval)(source) as (root: Element) => Animation[])(given).length, EVERY_ANIMATION);
