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
 * `transition-duration` the hide delay, from `--tanrei-comp-tooltip-motion-show-delay` and `-hide-delay`).
 */
import type { TanreiTooltip } from '../components/tooltip/tooltip.js';

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
  /** The tooltip, placed by the host over the text it shows; made by the host when first asked. */
  tip: () => TanreiTooltip | null;
  /** What to show now, or null while nothing is cut (read each time the tooltip would open). */
  content: () => CutTextContent | null;
  /** The element whose transition carries the tooltip's waits (see above). */
  clock: () => Element | null;
}

/** A duration as a computed style writes it, in ms. */
const ms = (value: string) => (Number.parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);

export class CutTextTip {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;
  private focused = false;

  constructor(private readonly options: CutTextTipOptions) {}

  /** Whether the tooltip is open. */
  get shown(): boolean {
    return !!this.options.tip()?.open;
  }

  /** The tooltip's waits, as its tokens resolve now, in ms. */
  private waits(): { show: number; hide: number } {
    const clock = this.options.clock();
    const style = clock ? getComputedStyle(clock) : null;
    return { show: ms(style?.transitionDelay ?? ''), hide: ms(style?.transitionDuration ?? '') };
  }

  /** Opens the tooltip with what is cut now, or closes it where nothing is. */
  private show(): void {
    clearTimeout(this.timer);
    const content = this.options.content();
    if (!content) return this.hide();
    const tip = this.options.tip();
    if (!tip) return;
    tip.variant = content.title ? 'rich' : 'plain';
    tip.title = content.title ?? '';
    tip.text = content.text;
    if (!tip.open) tip.open = true;
  }

  /** Closes the tooltip at once. */
  hide(): void {
    clearTimeout(this.timer);
    const tip = this.options.tip();
    if (tip?.open) tip.open = false;
  }

  /** A fine pointer came onto the row: the tooltip opens after the show delay, where something is cut. */
  pointerEnter(pointerType: string): void {
    if (pointerType === 'touch') return;
    this.hovered = true;
    clearTimeout(this.timer);
    if (this.shown) return this.show();
    this.timer = setTimeout(() => {
      if (this.hovered) this.show();
    }, this.waits().show);
  }

  /** The pointer left the row (and its tooltip): it closes after the hide delay, unless keyboard focus is on the row. */
  pointerLeave(pointerType: string): void {
    if (pointerType === 'touch') return;
    this.hovered = false;
    clearTimeout(this.timer);
    if (this.focused) return;
    this.timer = setTimeout(() => this.hide(), this.waits().hide);
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
