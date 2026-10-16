// A state motion read at fixed moments of it, not in whatever frames the machine draws.
//
// A test that samples a transition in real time — a loop of frames for "the duration and a margin" — reads what a fast
// machine draws: a runner that draws a frame half a second late sees a 300 ms motion as one jump and never a moment in
// between, and one whose motion runs slower than the loop (Chromium in harsh mode plays it at a fifth of its speed)
// stops sampling before the end and reads a width on the way as the last one. This holds each transition the change
// starts at its beginning, in the task of the change, and then moves it to tenths of its duration one by one: what the
// test reads there is the same moment on any machine. (The carousel's own motion, an animation without a target that
// its script plays, is held the same way by `carousel.test.ts`.)
//
//   await holdTransitions(host, ['inline-size', 'width']);   // before the change
//   await host.evaluate((el) => (el.extended = false));      // the change, by any means
//   const { held, moments, rest } = await stepTransitions(host, read);
import { type Locator, expect } from '@playwright/test';
import { EVERY_ANIMATION } from './motions.js';

/** A transition held by `holdTransitions`. */
export interface HeldTransition {
  /** The property that moves, as the engine names it. */
  property: string;
  /** The element it runs on, as `localName.class.class`. */
  on: string;
  /** Its duration in whole milliseconds. */
  duration: number;
  /** Its easing, as the engine serializes it. */
  easing: string;
}

interface Holding {
  held: CSSTransition[];
  stop: () => void;
}

/**
 * From now on, every CSS transition that starts on `target`, inside it or inside a shadow root within it — of one of
 * `properties`, or of any property when none are given — is held still at its start. It is caught in the task of the
 * change that starts it: a mutation of the element or of anything inside it (an attribute, a style, a text) is answered
 * in a microtask of that task, before any frame, by asking for the transitions (which brings the style up to date and
 * so creates them) and pausing the new ones. A change that mutates nothing (a media query) is caught at `transitionrun`,
 * a frame later. Called again, it lets go of what it held and starts anew.
 */
export const holdTransitions = (target: Locator, properties?: readonly string[]): Promise<void> =>
  target.evaluate(
    (el, { properties, source }) => {
      const w = window as unknown as { __heldTransitions?: Holding };
      w.__heldTransitions?.stop();
      const every = (0, eval)(source) as (root: Element) => Animation[];
      const held: CSSTransition[] = [];
      const wanted = (a: Animation): a is CSSTransition =>
        typeof CSSTransition !== 'undefined' && a instanceof CSSTransition && a.playState !== 'finished' && !held.includes(a) && (!properties || properties.includes(a.transitionProperty));
      const hold = () => {
        for (const transition of every(el).filter(wanted)) {
          transition.pause();
          transition.currentTime = 0;
          held.push(transition);
        }
      };
      const ended = new AbortController();
      const observer = new MutationObserver(() => {
        observe();
        hold();
      });
      const roots = (root: Element | ShadowRoot): (Element | ShadowRoot)[] => [root, ...[...root.querySelectorAll('*')].flatMap((each) => (each.shadowRoot ? roots(each.shadowRoot) : []))];
      const listened = new WeakSet<Node>();
      const observe = () => {
        for (const root of roots(el)) {
          observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
          if (listened.has(root)) continue;
          listened.add(root);
          root.addEventListener('transitionrun', hold, { capture: true, signal: ended.signal });
        }
      };
      observe();
      w.__heldTransitions = {
        held,
        stop: () => {
          observer.disconnect();
          ended.abort();
        },
      };
    },
    { properties: properties ? [...properties] : undefined, source: EVERY_ANIMATION },
  );

/**
 * Waits until `count` transitions are held (`holdTransitions`), stops holding new ones, and steps all of the held ones
 * together through their durations in `steps`ths, from the start (0) to the end (`steps`) inclusive, calling `read` at
 * each moment; then lets them finish and calls `read` once more. A held transition is paused, so `read` may take any
 * number of round trips: the moment does not move while it reads. Returns what moved and the readings.
 */
export async function stepTransitions<T>(target: Locator, read: () => Promise<T>, { count = 1, steps = 10 } = {}): Promise<{ held: HeldTransition[]; moments: T[]; rest: T }> {
  const page = target.page();
  const heldCount = () => page.evaluate(() => (window as unknown as { __heldTransitions?: Holding }).__heldTransitions?.held.length ?? 0);
  await expect.poll(heldCount, { message: `${count} transition(s) began and were held` }).toBeGreaterThanOrEqual(count);
  const held = await page.evaluate(() => {
    const holding = (window as unknown as { __heldTransitions: Holding }).__heldTransitions;
    holding.stop();
    return holding.held.map((transition) => {
      const effect = transition.effect as KeyframeEffect;
      const target = effect.target!;
      return {
        property: transition.transitionProperty,
        on: [target.localName, ...target.classList].join('.') + (effect.pseudoElement ?? ''),
        duration: Math.round(Number(effect.getTiming().duration)),
        easing: String(effect.getTiming().easing),
      };
    });
  });
  const moments: T[] = [];
  for (let i = 0; i <= steps; i++) {
    await page.evaluate(
      ({ i, steps }) => {
        // One that a later change of its property cancelled stays cancelled: a time set on it would bring it back.
        for (const transition of (window as unknown as { __heldTransitions: Holding }).__heldTransitions.held.filter((each) => each.playState !== 'idle')) {
          const timing = transition.effect!.getComputedTiming();
          transition.currentTime = Number(timing.delay ?? 0) + (Number(timing.activeDuration) * i) / steps;
        }
      },
      { i, steps },
    );
    moments.push(await read());
  }
  await page.evaluate(() => {
    for (const transition of (window as unknown as { __heldTransitions: Holding }).__heldTransitions.held) if (transition.playState !== 'idle') transition.finish();
  });
  return { held, moments, rest: await read() };
}
