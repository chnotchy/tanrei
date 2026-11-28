/**
 * A text that is one line by default and cut with an ellipsis where it does not fit, and the tooltip that shows the
 * whole of it — only while it is cut (TRV-6, TRV-7, TRV-50, and the navigation drawer's rows that mirror them).
 *
 * - `isCut(element)` says whether an element's text is cut: its content is wider (or taller) than its box.
 * - `CutTextTip` opens and closes a plain or rich `<tanrei-tooltip>` the host places over the text (an absolutely
 *   placed tooltip element with no anchor of its own, opened by setting `open`, as the drawer's collapsed name is). It
 *   answers a fine pointer resting on the row (after the tooltip's show delay), keyboard focus (at once), the pointer
 *   leaving (after the hide delay, unless keyboard focus stays), focus leaving, a press and Escape. It opens nothing
 *   for a touch: a long-press on a row is the platform's. The tooltip is hoverable for free where it stands inside the
 *   row in the document's tree, because its surface's pointer events reach the row (WCAG 1.4.13).
 *
 * The host gives what the text is now (`content`, null while nothing is cut) and the element that carries the
 * tooltip's waits as a transition the host never runs (`clock`: `transition-delay` is the show delay and
 * `transition-duration` the hide delay, from `--tanrei-comp-tooltip-motion-show-delay` and `-hide-delay`), read in the
 * frame's read phase (`TipWait`).
 */
import { cancelPhaseRead, readInPhase } from './read-phase.js';

/**
 * What of a `<tanrei-tooltip>` the primitive sets. (Said here, not imported: a primitive every component loads names no
 * component's module.)
 */
export interface CutTextTooltip {
  open: boolean;
  variant: string;
  title: string;
  text: string;
}

/** Whether an element's text is cut: its content takes more room than its box gives (half a pixel of rounding aside). */
export function isCut(element: Element | null | undefined): boolean {
  if (!element) return false;
  return element.scrollWidth - element.clientWidth > 0.5 || element.scrollHeight - element.clientHeight > 0.5;
}

/** What a cut text's tooltip shows: the text alone (a plain tooltip), or a title and the text (a rich one). */
export interface CutTextContent {
  title?: string;
  text: string;
}

export interface CutTextTipOptions {
  /** The tooltip, where the host has made one (it is not made, nor moved, to be closed). */
  tip: () => CutTextTooltip | null;
  /** Makes the tooltip where it has none, and places it over the text it is about to show: called only to open it. */
  place?: () => void;
  /** What to show now, or null while nothing is cut (read each time the tooltip would open). */
  content: () => CutTextContent | null;
  /** The element whose transition carries the tooltip's waits (see above). */
  clock: () => Element | null;
}

/** A duration as a computed style writes it, in ms. */
const ms = (value: string) => (Number.parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);

/**
 * One wait of a tooltip's, its show delay or its hide delay, from the moment it is begun (`start`). How long it is comes
 * from the element that carries the waits as a transition (`clock`: `transition-delay` is the show delay and
 * `transition-duration` the hide delay), read as the tokens resolve then — in the read phase of the next frame
 * (src/primitives/read-phase.ts), with every other read of it, and the time from the start to that phase taken off the
 * wait. Read in the event that begins it (the pointer coming onto a row), the computed style had the browser style the
 * page for it there and then, whatever the pointer's hover and the page's own answer to it had just changed. Where the
 * wait is shorter than a frame, it ends in the task after that phase.
 */
export class TipWait {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly clock: () => Element | null) {}

  /** Begins the show (`show`) or hide (`hide`) wait now, and calls `then` at its end; one begun before is withdrawn. */
  start(which: 'show' | 'hide', then: () => void): void {
    this.cancel();
    const from = performance.now();
    readInPhase(this, () => {
      const clock = this.clock();
      const style = clock ? getComputedStyle(clock) : null;
      const wait = ms((which === 'show' ? style?.transitionDelay : style?.transitionDuration) ?? '');
      return () => {
        this.timer = setTimeout(then, Math.max(0, wait - (performance.now() - from)));
      };
    });
  }

  /** Withdraws the wait begun, whether its length has been read yet or not. */
  cancel(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    cancelPhaseRead(this);
  }
}

export class CutTextTip {
  private readonly wait: TipWait;
  private hovered = false;
  private focused = false;

  constructor(private readonly options: CutTextTipOptions) {
    this.wait = new TipWait(options.clock);
  }

  /** Whether the tooltip is open. */
  get shown(): boolean {
    return !!this.options.tip()?.open;
  }

  /** Opens the tooltip with what is cut now, or closes it where nothing is. */
  private show(): void {
    this.wait.cancel();
    const content = this.options.content();
    if (!content) return this.hide();
    this.options.place?.();
    const tip = this.options.tip();
    if (!tip) return;
    tip.variant = content.title ? 'rich' : 'plain';
    tip.title = content.title ?? '';
    tip.text = content.text;
    if (!tip.open) tip.open = true;
  }

  /** Closes the tooltip at once. */
  hide(): void {
    this.wait.cancel();
    const tip = this.options.tip();
    if (tip?.open) tip.open = false;
  }

  /** A fine pointer came onto the row: the tooltip opens after the show delay, where something is cut. */
  pointerEnter(pointerType: string): void {
    if (pointerType === 'touch') return;
    this.hovered = true;
    if (this.shown) return this.show();
    this.wait.start('show', () => {
      if (this.hovered) this.show();
    });
  }

  /** The pointer left the row (and its tooltip): it closes after the hide delay, unless keyboard focus is on the row. */
  pointerLeave(pointerType: string): void {
    if (pointerType === 'touch') return;
    this.hovered = false;
    this.wait.cancel();
    if (this.focused) return;
    this.wait.start('hide', () => this.hide());
  }

  /** Focus came onto the row: by the keyboard, the tooltip opens at once where something is cut. */
  focus(keyboard: boolean): void {
    this.focused = keyboard;
    if (keyboard) this.show();
  }

  /** Focus left the row: the tooltip closes, unless the pointer still rests on it. */
  blur(): void {
    this.focused = false;
    if (!this.hovered) this.hide();
  }

  /** The row was pressed: the tooltip closes. */
  press(): void {
    this.hovered = false;
    this.hide();
  }

  /** Escape: closes an open tooltip and says whether there was one, so that the key does nothing else then. */
  escape(): boolean {
    const was = this.shown;
    this.hide();
    return was;
  }
}
