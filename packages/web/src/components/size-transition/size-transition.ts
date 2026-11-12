import { type PropertyDeclarations, type PropertyValues, html } from 'lit';
import { AnimatedSize, numericAttribute, report, usableLength } from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import { ANCHORS, AXES, styles } from './size-transition.styles.js';

/** Which of its sizes follows the content: its height (`block`), its width (`inline`) or both. */
export type TanreiSizeTransitionAxis = (typeof AXES)[number];
/** The edge that stays still while the box grows or shrinks. */
export type TanreiSizeTransitionAnchor = (typeof ANCHORS)[number];
/** What `settle` carries: the box's size at rest, in CSS pixels. */
export interface TanreiSizeTransitionSettleDetail {
  width: number;
  height: number;
}

/** A size of the content: its inline size (width) and block size (height). */
interface Measured {
  inline: number;
  block: number;
}

/** What the layout gives the content to be laid out with, besides the box's own width (SZT-6). */
interface Room {
  font: string;
  direction: string;
}

const SIZE_TRANSITIONS = /^(block-size|inline-size|height|width)$/;
/** The attribute a size transition carries while it moves: one that holds another follows it (SZT-6). */
const RESIZING = 'data-resizing';

// SZT-6: the window was resized in this frame. Its `resize` event is dispatched in the frame's rendering steps, before
// the resize observers report, and a task queued then runs after them: the flag holds for the reports of that frame.
// The window is listened to only while a size transition is connected: loading the module adds no listener to a page
// that draws none (a page's frame, the app shell, listens to the window by media queries alone).
let windowResized = false;
let connected = 0;
const onWindowResize = () => {
  windowResized = true;
  setTimeout(() => (windowResized = false));
};

/**
 * Wraps content whose size changes — a message that grows, a section that gains a line, a panel that loses a row — and
 * moves its own size to the content's new size as one motion, so that what stands after it moves smoothly instead of
 * jumping, while the edge it is anchored to stays still.
 *
 * Contract: specs/size-transition.spec.json. The public form of the package's size motion (`AnimatedSize`,
 * src/primitives/motion.ts): the box moves from the size shown to the content's, in its layout (what follows it moves
 * with it), clipped with `overflow: clip`, the content justified to the anchor's edge. A change is seen two ways: a
 * change of the product's markup in it (a mutation observer) starts the motion in the task that made it; any other — a
 * component inside that changes its own size, an image or a face that loads — is seen by a resize observer of the
 * content after layout, before the frame is painted. The time grows with the distance (SZT-3,
 * `comp.size-transition.motion.*`) unless `duration` gives one.
 *
 * At once: the first frame (SZT-1), a change of the room the layout gives it — the window, its own width on the block
 * axis, its text size or direction (SZT-6) —, a change while a size transition in its content moves (it follows that
 * one), `disabled`, reduced motion (SZT-7), and while it is not drawn (SZT-9). It exposes nothing to assistive
 * technology and is never a focus stop (SZT-10).
 *
 * @tag tanrei-size-transition
 * @slot - The content whose size the box follows.
 * @fires {CustomEvent<TanreiSizeTransitionSettleDetail>} settle - The box's size has come to rest after a change, by a motion or at once: once per change, after its last frame; `detail` is the new `width` and `height` in CSS pixels. It does not bubble.
 */
export class TanreiSizeTransition extends TanreiElement {
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    axis: { type: String, reflect: true },
    anchor: { type: String, reflect: true },
    duration: { converter: numericAttribute },
    disabled: { type: Boolean, reflect: true },
  };

  /** Which of its sizes follows the content: `block` (the default, its height), `inline` (its width) or `both`. */
  axis: TanreiSizeTransitionAxis = 'block';

  /** The edge that stays still: `start` (the default: the first line never moves), `end` or `center` (both edges move by half). */
  anchor: TanreiSizeTransitionAnchor = 'start';

  /**
   * How long one change takes, in milliseconds, for every distance; 0 is at once. Null, the default, takes the system's
   * answer, which grows with the distance (SZT-3). The `duration` attribute: an empty one is not a number.
   */
  duration: number | null = null;

  /** Follows the content's size at once, without a motion (SZT-8). */
  disabled = false;

  /** The content's size as last reported; none before its first report (SZT-1) and while it is not drawn (SZT-9). */
  private measured: Measured | null = null;
  private room: Room | null = null;
  /** The size the last change went to, which the resize observer's next report of it then leaves alone. */
  private target: Measured | null = null;
  /** The last change was made at once to follow a size transition inside the content (SZT-6). */
  private following = false;
  /** Each change's number: a settle is emitted for the latest only (SZT-11). */
  private change = 0;

  private readonly resizes = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => this.resized(entries.at(-1)!)) : null;
  private readonly mutations = typeof MutationObserver === 'function' ? new MutationObserver((records) => this.mutated(records)) : null;

  private readonly size = ((host: TanreiSizeTransition) =>
    new AnimatedSize(host, {
      box: () => host.box,
      content: () => host.content,
      get axis() {
        return host.followedAxis;
      },
      // The content is justified to the anchor's edge by the box's layout (the styles), not moved by the motion.
      anchor: () => 'start',
      duration: (distance) => host.durationFor(distance),
      easing: 'var(--tanrei-comp-size-transition-motion-easing)',
    }))(this);

  constructor() {
    super();
    // A settle does not bubble: an inner one is heard on its way down (SZT-6).
    this.addEventListener('settle', this.innerSettled, { capture: true });
  }

  private get box(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.box') ?? null;
  }

  private get content(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.content') ?? null;
  }

  /** SZT-13: the axis as followed — block for a name it does not define. */
  private get followedAxis(): TanreiSizeTransitionAxis {
    return (AXES as readonly string[]).includes(this.axis) ? this.axis : 'block';
  }

  override connectedCallback() {
    super.connectedCallback();
    if (connected++ === 0) window.addEventListener('resize', onWindowResize);
    // Connected again, its first frame is drawn at rest, as at first (SZT-1).
    this.observe();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (--connected === 0) window.removeEventListener('resize', onWindowResize);
    this.resizes?.disconnect();
    this.mutations?.disconnect();
    this.measured = null;
    this.room = null;
    this.target = null;
    this.following = false;
    this.change++;
    this.toggleAttribute(RESIZING, false);
  }

  private observe() {
    const content = this.content;
    if (!content || !this.isConnected) return;
    this.resizes?.observe(content);
    this.mutations?.observe(this, { childList: true, characterData: true, subtree: true });
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SZT-13: a name it does not define is the default, and reported; so is a duration that is no length of time.
    if (changed.has('axis') && !(AXES as readonly string[]).includes(this.axis)) {
      report(this, 'SZT-13', `axis "${String(this.axis)}" is not a value of the size transition; it follows the block axis`);
    }
    if (changed.has('anchor') && !(ANCHORS as readonly string[]).includes(this.anchor)) {
      report(this, 'SZT-13', `anchor "${String(this.anchor)}" is not a value of the size transition; it is anchored at the start`);
    }
    if (changed.has('duration') && this.duration !== null && this.duration !== undefined && !usableLength(this.duration)) {
      report(this, 'SZT-13', `duration ${JSON.stringify(String(this.duration))} is not a number of milliseconds of 0 or more; the system's duration is used in its place`);
    }
  }

  protected override firstUpdated() {
    this.observe();
  }

  protected override updated(changed: PropertyValues<this>) {
    // SZT-8: turned on during a motion, the newest size is taken at once, and settles. A change of axis likewise ends
    // the motion where it is: the box follows its content on the new axis from then on.
    const ends = (changed.has('disabled') && this.disabled) || (changed.has('axis') && changed.get('axis') !== undefined);
    if (ends && this.size.resizing && this.measured) this.respond(this.measured, true, true);
  }

  /**
   * The product changed its markup in the box: the motion starts in the task that changed it. A change inside a size
   * transition in its content is that one's to move; this one follows it (SZT-6).
   */
  private mutated(records: MutationRecord[]) {
    if (!this.measured || !this.box?.isConnected) return;
    const inner = (record: MutationRecord) => {
      for (let node = record.target instanceof Element ? record.target : record.target.parentElement; node && node !== this; node = node.parentElement) {
        if (node.localName === this.localName) return true;
      }
      return false;
    };
    if (records.every(inner)) return;
    this.respond(this.measured, false);
  }

  /** The content's size changed in this frame's layout, by a change the markup does not show (or the room's, SZT-6). */
  private resized(entry: ResizeObserverEntry) {
    const size = entry.borderBoxSize?.[0];
    if (!size) return;
    const now: Measured = { inline: size.inlineSize, block: size.blockSize };
    const was = this.measured;
    const style = getComputedStyle(this);
    const room: Room = { font: style.fontSize, direction: style.direction };
    const wasRoom = this.room;
    const target = this.target;
    const drawn = now.inline > 0 || now.block > 0;
    this.measured = drawn ? now : null;
    this.room = room;
    this.target = null;
    // SZT-1: the first report is the first frame, drawn at rest. SZT-9: one not drawn, and one drawn again, too.
    if (!was || !drawn || !wasRoom) return;
    // The size a change in the markup already went to, in its own task.
    if (target && !this.moved(target, now)) return;
    if (!this.moved(was, now)) return;
    // SZT-6: the room the layout gives it changed — the window, its own width on the block axis (the box's inline size
    // is the layout's there), its text size or its direction.
    const roomChanged =
      windowResized || (this.followedAxis === 'block' && Math.abs(now.inline - was.inline) >= 0.5) || wasRoom.font !== room.font || wasRoom.direction !== room.direction;
    this.respond(was, roomChanged);
  }

  /** Whether `now` differs from `was` along the axis it follows. */
  private moved(was: Measured, now: Measured): boolean {
    const axis = this.followedAxis;
    const block = Math.abs(now.block - was.block) >= 0.5;
    const inline = Math.abs(now.inline - was.inline) >= 0.5;
    return axis === 'block' ? block : axis === 'inline' ? inline : block || inline;
  }

  /**
   * SZT-2, SZT-6 to SZT-9: moves the box to its content's size, or takes it at once, from `was` (the size the last
   * frame drew at rest); then emits settle once it rests, where the size changed along its axis (SZT-11) or a motion
   * under way was ended (`ending`, SZT-8).
   */
  private respond(was: Measured, atOnce: boolean, ending = false) {
    const nested = !!this.querySelector(`[${RESIZING}]`);
    const quiet = atOnce || nested || this.following || this.disabled || document.visibilityState === 'hidden';
    this.following = nested;
    const change = ++this.change;
    // From the size the last frame drew: the content's last report, which the box at rest had.
    this.size.fit(!quiet, was);
    const box = this.box;
    const content = this.content;
    if (!box || !content) return;
    const rect = content.getBoundingClientRect();
    const now: Measured = { inline: rect.width, block: rect.height };
    this.target = now;
    if (this.size.resizing) {
      this.toggleAttribute(RESIZING, true);
      const motions = box.getAnimations().filter((animation) => SIZE_TRANSITIONS.test((animation as CSSTransition).transitionProperty ?? ''));
      void Promise.allSettled(motions.map((animation) => animation.finished)).then(() => {
        if (change !== this.change) return;
        this.toggleAttribute(RESIZING, false);
        this.settle();
      });
      return;
    }
    this.toggleAttribute(RESIZING, false);
    // Following a size transition inside it, it rests when that one does (`innerSettled`).
    if ((ending || this.moved(was, now)) && !this.following) this.settle();
  }

  /**
   * SZT-3: a set duration as given; else `motion.duration` up to `motion.distance-step`, `motion.duration-step` more for
   * each further step begun, never more than `motion.duration-max`. `distance` is from the size shown to the newest.
   */
  private durationFor(distance: number): string {
    if (usableLength(this.duration)) return `${this.duration}ms`;
    const timing = this.renderRoot.querySelector('.timing');
    if (!timing) return 'var(--tanrei-comp-size-transition-motion-duration)';
    const style = getComputedStyle(timing);
    const [base = 0, step = 0, max = 0] = style.transitionDuration.split(',').map((time) => (Number.parseFloat(time) || 0) * 1000);
    const distanceStep = Number.parseFloat(style.inlineSize) || 0;
    const steps = distanceStep > 0 ? Math.max(0, Math.ceil((distance - distanceStep) / distanceStep)) : 0;
    return `${Math.min(max, base + step * steps)}ms`;
  }

  private settle() {
    const { width, height } = this.getBoundingClientRect();
    this.dispatchEvent(new CustomEvent<TanreiSizeTransitionSettleDetail>('settle', { detail: { width, height } }));
  }

  /** SZT-6: a size transition inside its content has come to rest — and so has this one, which followed it. */
  private readonly innerSettled = (event: Event) => {
    if (event.target === this || !this.following || this.querySelector(`[${RESIZING}]`)) return;
    this.following = false;
    const change = ++this.change;
    // The size it rests at: a last report of it (the inner one's end, a fraction from its last frame) moves nothing.
    const rect = this.content?.getBoundingClientRect();
    if (rect) this.target = { inline: rect.width, block: rect.height };
    // After the inner one's own listeners: heard on the way down, it would come first.
    queueMicrotask(() => {
      if (change === this.change) this.settle();
    });
  };

  protected override render(): unknown {
    return html`<div class="box"><div class="content"><slot></slot></div></div><span class="timing" aria-hidden="true"></span>`;
  }
}

if (!customElements.get('tanrei-size-transition')) customElements.define('tanrei-size-transition', TanreiSizeTransition);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-size-transition': TanreiSizeTransition;
  }
}
