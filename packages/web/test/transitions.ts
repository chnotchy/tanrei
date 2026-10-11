// The transitions a change starts, kept as the engine announces them.
//
// A test that changes a state and then asks, in a later round trip, which transitions are running
// (`el.getAnimations()`) asks a clock: a state transition is 150 ms, and on a runner without a GPU two frames, or one
// answer to the test, can take longer than that — the transition is over and the list is empty. `transitionrun` does
// not depend on when the question arrives: the engine sends it once for every transition it creates, however late the
// next frame is, and at that moment the transition is still listed, so its duration and its easing are read from the
// transition itself.
//
//   await watchTransitions(target);          // before the change
//   await target.hover();                    // the change, by any means
//   await expect.poll(() => transitionsRun(target)).toContainEqual(expect.objectContaining({ property: 'box-shadow', duration }));
import type { Locator } from '@playwright/test';

/** One transition the engine began. */
export interface TransitionRun {
  /** The property that moves, as CSS names it (`background-color`). */
  property: string;
  /** The pseudo-element it runs on (`::after`), or an empty string for the element's own. */
  pseudo: string;
  /** Whether it runs on the watched element itself (or its pseudo-elements), not on something inside it. */
  own: boolean;
  /** The element it runs on, as `localName.class.class`. */
  on: string;
  /** Its duration in whole milliseconds (Firefox reports a token of 200 ms as 200.000015). */
  duration: number;
  /** Its easing, as the engine serializes it. */
  easing: string;
}

/**
 * Begins to keep every transition that starts on the element, inside it, and inside its shadow root (the event does
 * not leave a shadow root, so the root is listened to as well). Called again, it forgets what it kept.
 */
export const watchTransitions = (locator: Locator): Promise<void> =>
  locator.evaluate((el) => {
    const kept = el as Element & { transitionsRun?: unknown[]; stopWatchingTransitions?: () => void };
    kept.stopWatchingTransitions?.();
    const stop = new AbortController();
    kept.stopWatchingTransitions = () => stop.abort();
    const runs: unknown[] = (kept.transitionsRun = []);
    const listed = (value: string) => value.split(/,\s*(?![^(]*\))/).map((each) => each.trim());
    const record = (event: Event) => {
      const { propertyName: property, pseudoElement: pseudo } = event as TransitionEvent;
      const target = event.target as Element;
      const transition = target.getAnimations({ subtree: true }).find((a) => {
        const effect = a.effect as KeyframeEffect | null;
        return (a as CSSTransition).transitionProperty === property && effect?.target === target && (effect.pseudoElement ?? '') === pseudo;
      });
      let duration: number;
      let easing: string;
      if (transition) {
        ({ easing } = transition.effect!.getTiming() as { easing: string });
        duration = Number(transition.effect!.getTiming().duration);
      } else {
        // Over before the frame that announces it (a frame later than the whole transition): it is no longer listed,
        // and what it ran over is what the style it was made from says for its property.
        const style = getComputedStyle(target, pseudo || undefined);
        const properties = listed(style.transitionProperty);
        const at = Math.max(properties.indexOf(property), properties.indexOf('all'), 0);
        const pick = (values: string[]) => values[at % values.length]!;
        const time = pick(listed(style.transitionDuration));
        duration = Number.parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
        easing = pick(listed(style.transitionTimingFunction));
      }
      runs.push({ property, pseudo, own: target === el, on: [target.localName, ...target.classList].join('.'), duration: Math.round(duration), easing });
    };
    el.addEventListener('transitionrun', record, { signal: stop.signal });
    el.shadowRoot?.addEventListener('transitionrun', record, { signal: stop.signal });
  });

/** The transitions that have started since `watchTransitions`, in the order the engine announced them. */
export const transitionsRun = (locator: Locator): Promise<TransitionRun[]> => locator.evaluate((el) => [...((el as Element & { transitionsRun?: TransitionRun[] }).transitionsRun ?? [])]);
