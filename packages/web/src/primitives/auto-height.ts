// The height of a native text area that follows its lines (ETI-7 to ETI-10).
//
// A `<textarea>` has the height it is given, never the height of its text. This routine gives it one: it measures the
// lines the text needs in the width the element has, holds them between a fewest and a most, and — where the change
// follows the value — moves the height there from the one shown, as ONE motion however many lines came or went.
//
// What moves is a box around the native element, never the element and never its text:
//
//   <div class="box">            ← `box`: its block size is the animated one. It is what the host is as tall as, so the
//     <textarea class="input">     height the element takes IN ITS LAYOUT changes at every frame (ETI-10) and a holder
//   </div>                         that sizes itself to its content follows with no script of its own.
//
// The native element is given its end height at once (`--_rows`, which the component's stylesheet multiplies by one
// line of its text style). A box as tall as its text has nothing to scroll, so the browser never scrolls the first line
// away to show a caret on a line the box does not hold yet; the first line stays at the top edge at every frame, and
// the box, which clips while it moves, uncovers the new lines as its bottom edge passes them. The box clips without
// being a scroll container (`overflow: clip` in the component's stylesheet): one that only hides what overflows it can
// still be scrolled, and the browser would scroll it to reveal the caret on the new line. Going down, the element is
// the smaller height at once and the box still holds the room that leaves.
//
// It holds no token and writes no duration: the component's stylesheet says how `[data-resizing]` moves
// (`transition: block-size <its duration> <its curve>`), and a stylesheet that says none — reduced motion — is a change
// made at once. It asks for no frame and no layout at rest: it runs when it is called, and reads the layout only then.

/** What the routine reads and writes; each is asked for when it runs, so an element drawn again is found again. */
export interface AutoHeightOptions {
  /** The box whose block size is the animated one. */
  box: () => HTMLElement | null;
  /** The native text area; none while the component shows one line (`<input>`), which needs no routine. */
  input: () => HTMLTextAreaElement | null;
  /**
   * A copy of the placeholder, laid out in the element's own width and text style and drawn nowhere, whose
   * `scrollHeight` is the height the placeholder's lines need (ETI-22): a browser does not count a placeholder among
   * what a text area scrolls. Read only while the value is empty.
   */
  placeholder?: () => HTMLElement | null;
  /** The fewest lines it shows; anything below one is one. */
  min: () => number;
  /** The most lines it shows before the text scrolls inside it; 0 is no limit, and one below `min` is `min`. */
  max: () => number;
  /** A change is made at once while this answers true: a pointer held down in the text (ETI-9). */
  still?: () => boolean;
  /** The number of lines shown is about to change, or is first known: called once, before any motion of that change begins. */
  rows?: (rows: number, scrolling: boolean) => void;
}

/** The lines a measured height is: a whole number, a hair's breadth forgiven (a line of 24.5 px reported as 24). */
const wholeLines = (lines: number) => Math.max(1, Math.ceil(lines - 0.05));

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class AutoHeight {
  /** The lines the element shows, or is on its way to show; 0 until it was first fitted. */
  rows = 0;
  /** Whether the text has more lines than it shows, and scrolls inside it. */
  scrolling = false;
  /** The width and the line the last fit was made for: a different one is a change that is made at once (ETI-9). */
  private laid: { width: number; line: number } | null = null;

  constructor(private readonly options: AutoHeightOptions) {}

  /** `min` and `max` as the sentence reads them (ETI-7). */
  private bounds(): { min: number; max: number } {
    const least = Number(this.options.min());
    const min = Number.isFinite(least) && least >= 1 ? Math.floor(least) : 1;
    const most = Number(this.options.max());
    const max = Number.isFinite(most) && most > 0 ? Math.max(min, Math.floor(most)) : Number.POSITIVE_INFINITY;
    return { min, max };
  }

  private lineOf(input: HTMLElement): number {
    return Number.parseFloat(getComputedStyle(input).lineHeight) || 0;
  }

  /** The number of lines is `rows`: said once for each change, before anything moves. */
  private tell(rows: number, scrolling: boolean) {
    const changed = rows !== this.rows;
    this.rows = rows;
    this.scrolling = scrolling;
    if (changed) this.options.rows?.(rows, scrolling);
  }

  /** The component shows one line and has no text area: one line, nothing scrolling up or down, no box that moves. */
  single() {
    const box = this.options.box();
    if (box) this.settle(box);
    this.laid = null;
    this.tell(1, false);
  }

  /**
   * Fits the height to the lines of the text. With `animate` — a change that follows the value — the height moves from
   * the one shown to the new one; a change that arrives while it moves goes on from the height then shown, and nothing
   * is queued. Without it, and where the element is not laid out, a pointer is held down in the text or motion is
   * reduced, the change is made at once.
   */
  fit(animate: boolean) {
    const box = this.options.box();
    const input = this.options.input();
    if (!box || !input) return;
    const line = this.lineOf(input);
    const width = input.clientWidth;
    const { min, max } = this.bounds();
    // An element that is not shown has no lines to measure: it stands at its fewest until it is laid out.
    if (!line || !width) {
      this.settle(box);
      input.style.setProperty('--_rows', String(Math.max(min, Math.min(this.rows || min, max))));
      this.laid = null;
      if (!this.rows) this.tell(min, false);
      return;
    }
    const moving = box.hasAttribute('data-resizing');
    const shown = animate || moving ? box.getBoundingClientRect().height : 0;
    // The lines the text needs: what the element scrolls when it is given no height.
    const { blockSize } = input.style;
    input.style.blockSize = '0px';
    let needed = wholeLines(input.scrollHeight / line);
    input.style.blockSize = blockSize;
    // ETI-22: an empty input is as tall as its placeholder's lines.
    const hint = input.value ? null : (this.options.placeholder?.() ?? null);
    if (hint) needed = Math.max(needed, wholeLines(hint.scrollHeight / line));
    const rows = Math.max(min, Math.min(needed, max));
    const scrolling = needed > rows;
    this.tell(rows, scrolling);
    this.laid = { width, line };
    input.style.setProperty('--_rows', String(rows));
    input.toggleAttribute('data-overflows', scrolling);
    this.settle(box);
    if (!animate || this.options.still?.() || reduced()) return;
    const end = box.getBoundingClientRect().height;
    if (Math.abs(end - shown) < 0.5) return;
    // From the height shown, drawn without a transition…
    box.style.blockSize = `${shown}px`;
    void box.offsetHeight;
    // …to the end height, as the stylesheet says `[data-resizing]` moves.
    box.setAttribute('data-resizing', '');
    box.style.blockSize = `${end}px`;
    // A stylesheet that gives the motion no time (a layer's duration of zero) starts none, and none will end.
    const style = getComputedStyle(box);
    if (!style.transitionDuration.split(',').some((time) => Number.parseFloat(time) > 0)) this.settle(box);
  }

  /** The box is as tall as what it holds again: a motion has ended, or the next change is made at once. */
  private settle(box: HTMLElement) {
    if (box.hasAttribute('data-resizing')) box.removeAttribute('data-resizing');
    if (box.style.blockSize) box.style.blockSize = '';
  }

  /** The box's own transition of its height ended or was cancelled: bind it to `transitionend` and `transitioncancel` on the box. */
  readonly ended = (event: TransitionEvent) => {
    const box = this.options.box();
    if (!box || event.target !== box || !/^(block-size|height|width)$/.test(event.propertyName)) return;
    this.settle(box);
  };

  /**
   * The element was laid out again: where its width or the line of its text changed — a narrower column, enlarged
   * text, another text style — the lines are counted again and the height changes at once (ETI-9). A layout that
   * changed neither (the element's own height, which it wrote itself) is left alone. Call it from a `ResizeObserver`
   * of the native element.
   */
  relaid() {
    const input = this.options.input();
    if (!input) return;
    const width = input.clientWidth;
    const line = this.lineOf(input);
    if (this.laid && this.laid.width === width && this.laid.line === line) return;
    this.fit(false);
  }
}
