// The show delay of an indicator (LDG-11, LDG-14…16; PRG-19, PRG-21…23): from the moment it is inserted, the indicator
// waits, drawing and exposing nothing, so that a wait shorter than the delay shows nothing at all. The loading indicator
// and the progress indicator wait alike, and from the same token unless the product gives one indicator its own delay.
//
// A delay is a wait, not motion: it is a timer, kept where motion is reduced and counted while the indicator cannot be
// seen. Every insertion waits its whole delay with the values of that moment; a removal cancels it. The token is a
// duration, which is an expression: it is computed through the inert `transition-delay` of a probe the component keeps
// in its shadow root (its styles set it), never parsed from the custom property, and read with every other host's of
// the turn (`readTogether`), so a hundred indicators inserted at once style the page once.

import { readTogether } from './read-together.js';

/** An attribute that is empty or does not parse as a finite number is not a number, and is reported as written. */
export const milliseconds = {
  fromAttribute: (value: string | null) => (value === null ? null : value.trim() === '' ? Number.NaN : Number(value)),
};

/** A number of milliseconds the element uses as given: finite and not negative. */
export const usableMilliseconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * How a value the element cannot use is shown in its report — the attribute as written where it did not parse — or
 * null for a value it uses, or for null (which takes the token without a report).
 */
export function unusableMilliseconds(host: Element, value: number | null | undefined, attribute: string): string | null {
  if (value === null || value === undefined || usableMilliseconds(value)) return null;
  const written = host.getAttribute(attribute);
  return Number.isNaN(value) && written !== null ? `"${written}"` : String(value);
}

/** The host of a show delay: an element with a `showDelay` property in milliseconds, null for the token. */
export interface ShowDelayHost extends HTMLElement {
  showDelay: number | null;
}

/**
 * One indicator's show delay. The component calls `start()` as it is inserted, after anything it resets there, and
 * `stop()` as it is removed. `shown` is false while it waits; `show` is called when the wait ends — in `start()` itself
 * where the delay is 0, so that the indicator is shown as it is inserted. `probe` is an element of the component's
 * shadow root whose `transition-delay` is the delay token, in place before `start()`.
 */
export class ShowDelay {
  /** False from an insertion until its delay ends. */
  shown = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Counts the insertions: a read asked for by one is not taken by the next. */
  private insertions = 0;

  constructor(
    private readonly host: ShowDelayHost,
    private readonly probe: HTMLElement,
    private readonly show: () => void,
  ) {}

  /** A new wait, with the delay of this moment: the product's, or else the token's as it resolves now. */
  start(): void {
    this.cancel();
    this.shown = false;
    const insertion = ++this.insertions;
    // A delay the product gives needs no token: it starts now. The token's is read with every other host's of the turn,
    // still before any frame, so the first frame draws the indicator shown where the token is 0.
    const given = usableMilliseconds(this.host.showDelay) ? this.host.showDelay : null;
    if (given !== null) {
      this.wait(given);
      return;
    }
    readTogether(() => {
      if (insertion !== this.insertions || !this.host.isConnected) return;
      const delay = (Number.parseFloat(getComputedStyle(this.probe).transitionDelay) || 0) * 1000;
      return () => {
        if (insertion === this.insertions && this.host.isConnected) this.wait(delay);
      };
    });
  }

  /** Removed: a wait that runs is cancelled, and nothing it would have shown is. */
  stop(): void {
    this.cancel();
    this.shown = false;
  }

  private wait(delay: number) {
    if (delay === 0) this.end();
    else this.timer = setTimeout(() => this.end(), delay);
  }

  private end() {
    this.timer = undefined;
    this.shown = true;
    this.show();
  }

  private cancel() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}
