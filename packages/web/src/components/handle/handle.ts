import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing, svg } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AvailabilityController, OpenAxesController, PressController, TOUCH_SLOP, report, syncFocusStyle } from '../../primitives/index.js';
import type { TanreiHandleSizeRegistry } from '../../registry.js';
import { AXES, AXES_OF_RESIZE, CORNERS, styles } from './handle.styles.js';

/** Which size the handle changes: a height (`vertical`), a width (`horizontal`), or both at once at a corner. */
export type TanreiHandleAxis = 'vertical' | 'horizontal' | 'both';
/** The corner an arc bows toward, in logical terms: `end` is the right in a left-to-right layout, the left in a right-to-left one. */
export type TanreiHandleCorner = 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start';
/** The core sizes, plus any a design system's generated `.d.ts` registers. */
export type TanreiHandleSize = keyof TanreiHandleSizeRegistry;

/** What `resizestart` carries: how the drag is made. */
export interface TanreiHandleResizeStartDetail {
  pointerType: 'mouse' | 'touch' | 'pen';
}
/**
 * What `resize` carries: the distance from the press, in CSS pixels — `inline` positive toward the end edge (to the
 * right in a left-to-right layout, to the left in a right-to-left one), `block` positive downward.
 */
export interface TanreiHandleResizeDetail {
  inline: number;
  block: number;
}
/** What `resizeend` carries: the distance of `resize` where the drag ended, and whether the platform cancelled the press. */
export interface TanreiHandleResizeEndDetail extends TanreiHandleResizeDetail {
  cancelled: boolean;
}
/**
 * What `step` carries: the axis a key moved along, the way it points (1 downward or toward the end edge, -1 upward or
 * toward the start edge) and how far it asks to go — one step, a large step, or the owner's least (`limit` with -1, Home)
 * or greatest (`limit` with 1, End) size.
 */
export interface TanreiHandleStepDetail {
  axis: 'inline' | 'block';
  direction: 1 | -1;
  amount: 'one' | 'large' | 'limit';
}

/** The keys that activate the handle (HDL-7). */
const ACTIVATE = ['Enter', ' '];

/** `expanded` has three values: no attribute is null (no expanded state), `"false"` is false, anything else true. */
const nullableBoolean = {
  fromAttribute: (value: string | null) => (value === null ? null : value !== 'false'),
  toAttribute: (value: boolean | null) => (value === null ? null : String(value)),
};

interface Drag {
  id: number;
  x: number;
  y: number;
  pointerType: TanreiHandleResizeStartDetail['pointerType'];
  /** The inline distance counts toward the end edge: to the left in right-to-left (HDL-17). */
  rtl: boolean;
  /** Past the touch slop: a drag, which emitted resizestart. */
  moving: boolean;
  inline: number;
  block: number;
}

/**
 * The mark a person drags, or moves from the keyboard, to change the size of what it stands on: a sheet's top, a text
 * field's corner, a pane's or a preview frame's edge. One axis is a short capsule; two axes are a quarter-circle arc that
 * bows toward its corner.
 *
 * Contract: specs/handle.spec.json. It never sizes anything itself: it tells its owner how far it was dragged
 * (`resizestart`, `resize`, `resizeend`), which step a key asked for (`step`) and that it was pressed without a drag
 * (`activate`); the owner keeps the size and gives it back as `value`, which assistive technology reads. With a `value`
 * it is a focusable separator (the window splitter pattern); without one, a button, with `expanded` where the owner has
 * two sizes. Every visual value comes from `--tanrei-comp-handle-*` tokens.
 *
 * Out of sight until it is used (HDL-23): drawn while a mouse is over it, while it has keyboard focus and while a press
 * or a drag holds it, and always on a touch screen (HDL-25) or with `revealed`. It is one Tab stop all the same.
 *
 * A press takes no focus and selects nothing, so a field keeps its caret while its handle is dragged. The drag follows
 * the pointer anywhere (pointer capture); an owner that holds an iframe sets `pointer-events: none` on it between
 * `resizestart` and `resizeend`, or the iframe takes the pointer as it passes over it. The events bubble within the
 * tree the handle stands in and do not leave a shadow root: an element that puts a handle in its own shadow root hears
 * them on the handle and says what it means in its own events.
 *
 * Assistive technology's increment and decrement (HDL-10) reach a web page as the arrow keys, which HDL-9 answers.
 *
 * @tag tanrei-handle
 * @csspart container - The box the line is drawn in, which carries the states and the focus ring: a `role="separator"` element with a value, a `<button>` without one.
 * @csspart line - The drawn line: the capsule, or the arc's SVG (hidden from assistive technology).
 * @fires {CustomEvent<TanreiHandleResizeStartDetail>} resizestart - A drag began: a press on the handle moved past the touch slop.
 * @fires {CustomEvent<TanreiHandleResizeDetail>} resize - The drag moved: `detail.inline` and `detail.block`, the distance from the press.
 * @fires {CustomEvent<TanreiHandleResizeEndDetail>} resizeend - The drag ended, once: released, or cancelled by the platform (`detail.cancelled`).
 * @fires {CustomEvent<TanreiHandleStepDetail>} step - A key asked for a change of size: `detail.axis`, `detail.direction`, `detail.amount`.
 * @fires {CustomEvent} activate - Pressed and released without a drag, or Enter or Space with keyboard focus: the owner switches between the sizes it knows.
 */
export class TanreiHandle extends LitElement {
  private readonly availability = new AvailabilityController(this, 'handle');
  static override styles = [styles, hiddenHost];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  /** @internal Its documented parts, for an element that holds it and exports them (src/primitives/composed.ts, `exported()`). */
  static readonly parts: readonly string[] = ['container', 'line'];

  static override properties: PropertyDeclarations = {
    axis: { type: String, reflect: true },
    corner: { type: String, reflect: true },
    size: { type: String, reflect: true },
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    valueText: { type: String, attribute: 'value-text' },
    expanded: { converter: nullableBoolean },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
    revealed: { type: Boolean, reflect: true },
  };

  /** Which size it changes: `vertical` a height (the line lies across it), `horizontal` a width (the line stands upright), `both` a height and a width at a corner (an arc). */
  axis: TanreiHandleAxis = 'vertical';

  /** The corner an arc bows toward while `axis` is both, in logical terms. Ignored for one axis. */
  corner: TanreiHandleCorner = 'bottom-end';

  /** `medium` for a sheet, a pane or a frame; `small` for a text field's corner. The hit area meets the minimum target at both. */
  size: TanreiHandleSize = 'medium';

  /** The size it stands for, as its owner counts it (lines, pixels, a percentage), told to assistive technology. Null makes it a button with no value. */
  value: number | null = null;

  /** The least value, told to assistive technology with `value`. */
  min = 0;

  /** The greatest value, told to assistive technology with `value`. */
  max = 100;

  /** The value in your words ("6 lines", `value-text`), read in place of the number. Empty reads the number. */
  valueText = '';

  /** While `value` is null: whether what it switches is at its larger size (`aria-expanded`). Null tells no such state; the attribute takes `true` and `false`. */
  expanded: boolean | null = null;

  /** The accessible name, saying what it resizes ("Resize message"), in your words. Never drawn. Required. */
  label = '';

  /** Draws it as unavailable; it takes no input and no focus. */
  disabled = false;

  /** Draws the line at rest, where it would otherwise be out of sight until it is used (a sheet's grip). */
  revealed = false;

  private readonly axes = new OpenAxesController(this, { component: 'handle', behavior: 'HDL-20', axes: AXES });

  /** HDL-11, HDL-12: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
    disabled: () => this.disabled,
  });

  private drag: Drag | null = null;
  /** A drag has just ended: the click the release makes is not an activation (HDL-7). */
  private swallowClick = false;

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  /** HDL-20: an axis or a corner the component does not define is drawn as the first. */
  private get shownAxis(): TanreiHandleAxis {
    return (AXES_OF_RESIZE as readonly string[]).includes(this.axis) ? this.axis : 'vertical';
  }
  private get shownCorner(): TanreiHandleCorner {
    return (CORNERS as readonly string[]).includes(this.corner) ? this.corner : 'bottom-end';
  }
  /** HDL-8: a value makes it a separator; none makes it a button. */
  private get separator(): boolean {
    return typeof this.value === 'number' && Number.isFinite(this.value);
  }


  /**
   * HDL-7. Every event of the handle bubbles within the tree it stands in and stops at a shadow root (not composed):
   * an owner hears it on the handle.
   */
  private activate() {
    this.dispatchEvent(new CustomEvent('activate', { bubbles: true }));
  }

  // ---- HDL-6, HDL-7: the drag and the press ----

  /**
   * HDL-6: a press on the target belongs to the handle. It takes no focus and selects nothing (the press's mousedown is
   * refused), and the pointer is captured, so that the drag follows it past the window's edge.
   */
  private readonly onPointerDown = (event: PointerEvent) => {
    if (this.disabled || (event.pointerType === 'mouse' && event.button !== 0) || this.drag) return;
    this.swallowClick = false;
    this.press.onPointerDown(event);
    const container = this.container;
    try {
      container?.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is no longer active (a synthetic event) cannot be captured; the drag follows it while it is over.
    }
    const pointerType = event.pointerType === 'touch' || event.pointerType === 'pen' ? event.pointerType : 'mouse';
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pointerType, rtl: getComputedStyle(this).direction === 'rtl', moving: false, inline: 0, block: 0 };
  };

  private readonly onMouseDown = (event: MouseEvent) => {
    // HDL-6: no focus, no text selection, no caret moved by the press.
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const block = event.clientY - drag.y;
    const inline = drag.rtl ? -dx : dx;
    if (!drag.moving) {
      if (Math.hypot(dx, block) <= TOUCH_SLOP) return;
      drag.moving = true;
      this.container?.classList.add('dragging');
      this.dispatchEvent(new CustomEvent<TanreiHandleResizeStartDetail>('resizestart', { bubbles: true, detail: { pointerType: drag.pointerType } }));
    }
    if (inline === drag.inline && block === drag.block) return;
    drag.inline = inline;
    drag.block = block;
    this.dispatchEvent(new CustomEvent<TanreiHandleResizeDetail>('resize', { bubbles: true, detail: { inline, block } }));
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    this.press.release(event);
    this.endDrag(false);
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    this.press.release(event);
    this.endDrag(true);
  };

  /** The capture was taken away without a release (the element moved out of the tree under the pointer): a cancel. */
  private readonly onLostCapture = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    this.press.release(event);
    this.endDrag(true);
  };

  /** HDL-6: resizeend once, with the distance where it ended; a press that never moved is no drag and ends nothing. */
  private endDrag(cancelled: boolean) {
    const drag = this.drag;
    this.drag = null;
    if (!drag?.moving) return;
    this.container?.classList.remove('dragging');
    this.swallowClick = true;
    this.dispatchEvent(new CustomEvent<TanreiHandleResizeEndDetail>('resizeend', { bubbles: true, detail: { inline: drag.inline, block: drag.block, cancelled } }));
  }

  /**
   * HDL-7: a press released without a drag, a button's Enter or Space, and assistive technology's click activate the
   * handle; the click a drag's release makes does not.
   */
  private readonly onClick = (event: MouseEvent) => {
    if (this.disabled) return;
    if (this.swallowClick) {
      this.swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    this.activate();
  };

  // ---- HDL-9: the keys ----

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (this.disabled) return;
    this.swallowClick = false;
    this.press.onKeyDown(event);
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // A separator has no click of its own: Enter (on its keydown) and Space (on its keyup) activate it, as a button's do.
    if (this.separator && event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) this.activate();
      return;
    }
    if (this.separator && event.key === ' ') {
      event.preventDefault();
      return;
    }
    const step = this.separator ? this.stepFor(event) : null;
    if (!step) return;
    event.preventDefault();
    this.dispatchEvent(new CustomEvent<TanreiHandleStepDetail>('step', { bubbles: true, detail: step }));
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.press.onKeyUp(event);
    if (this.disabled || !this.separator || event.key !== ' ') return;
    event.preventDefault();
    this.activate();
  };

  /** HDL-9, HDL-17: the step a key asks for, along the axis of the handle; null for a key that is not its. */
  private stepFor(event: KeyboardEvent): TanreiHandleStepDetail | null {
    const axis = this.shownAxis;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const amount = event.shiftKey ? 'large' : 'one';
    const block = axis !== 'horizontal';
    const inline = axis !== 'vertical';
    const toEnd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const toStart = rtl ? 'ArrowRight' : 'ArrowLeft';
    // Home and End, and Page Up and Page Down, go along the block axis where there is one.
    const main: TanreiHandleStepDetail['axis'] = block ? 'block' : 'inline';
    switch (event.key) {
      case 'ArrowDown':
        return block ? { axis: 'block', direction: 1, amount } : null;
      case 'ArrowUp':
        return block ? { axis: 'block', direction: -1, amount } : null;
      case toEnd:
        return inline ? { axis: 'inline', direction: 1, amount } : null;
      case toStart:
        return inline ? { axis: 'inline', direction: -1, amount } : null;
      case 'PageDown':
        return { axis: main, direction: 1, amount: 'large' };
      case 'PageUp':
        return { axis: main, direction: -1, amount: 'large' };
      case 'Home':
        return { axis: main, direction: -1, amount: 'limit' };
      case 'End':
        return { axis: main, direction: 1, amount: 'limit' };
      default:
        return null;
    }
  }

  /** HDL-13: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocus = () => syncFocusStyle(this, this.container);

  override disconnectedCallback() {
    super.disconnectedCallback();
    // HDL-6: a drag the element was taken away from has ended, cancelled.
    this.endDrag(true);
  }

  override willUpdate(changed: PropertyValues<this>) {
    // HDL-15: a handle disabled while it is dragged takes no more input; its drag ends, cancelled.
    if (changed.has('disabled') && this.disabled && this.drag) {
      this.press.hostDisconnected();
      this.endDrag(true);
    }
  }

  override updated(changed: PropertyValues<this>) {
    if (changed.has('label') && !this.label.trim()) report(this, 'HDL-8', 'label is empty, so the handle has no accessible name; give it a label that says what it resizes');
    if (changed.has('axis') && this.axis !== this.shownAxis) report(this, 'HDL-20', `axis "${this.axis}" is not a value of the handle; it is drawn as "vertical"`);
    if (changed.has('corner') && this.corner !== this.shownCorner) report(this, 'HDL-20', `corner "${this.corner}" is not a value of the handle; it is drawn as "bottom-end"`);
  }

  private lineTemplate() {
    // HDL-1, HDL-2: the capsule, or the arc; never a glyph of the icon set. Hidden from assistive technology (HDL-8).
    if (this.shownAxis !== 'both') return html`<span part="line" class="capsule" data-tanrei-shape aria-hidden="true"></span>`;
    return html`<svg part="line" class="arc" aria-hidden="true" focusable="false">${svg`<circle></circle>`}</svg>`;
  }

  override render() {
    const axis = this.shownAxis;
    const classes = classMap({
      container: true,
      [axis]: true,
      [this.shownCorner]: axis === 'both',
      disabled: this.disabled,
      revealed: this.revealed,
    });
    const name = this.label.trim() || nothing;
    const inner = html`${this.lineTemplate()}<span class="hold" aria-hidden="true"></span>`;
    if (this.separator) {
      // HDL-8: a focusable separator with its value; its orientation is its line's.
      const valueText = this.valueText.trim();
      return html`<div
        part="container"
        class=${classes}
        data-tanrei-shape
        role="separator"
        tabindex=${this.disabled ? nothing : '0'}
        aria-label=${name}
        aria-orientation=${axis === 'horizontal' ? 'vertical' : 'horizontal'}
        aria-valuenow=${String(this.value)}
        aria-valuemin=${String(this.min)}
        aria-valuemax=${String(this.max)}
        aria-valuetext=${valueText || nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @pointerdown=${this.onPointerDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerCancel}
        @lostpointercapture=${this.onLostCapture}
        @pointerleave=${this.press.release}
        @mousedown=${this.onMouseDown}
        @click=${this.onClick}
        @keydown=${this.onKeyDown}
        @keyup=${this.onKeyUp}
        @focus=${this.onFocus}
        @blur=${this.press.onBlur}
      >${inner}</div>`;
    }
    // HDL-8: without a value, a button, with the expanded state where the owner gives one.
    return html`<button
      part="container"
      class=${classes}
      data-tanrei-shape
      type="button"
      ?disabled=${this.disabled}
      aria-label=${name}
      aria-expanded=${this.expanded === null || this.expanded === undefined ? nothing : String(this.expanded)}
      @pointerdown=${this.onPointerDown}
      @pointermove=${this.onPointerMove}
      @pointerup=${this.onPointerUp}
      @pointercancel=${this.onPointerCancel}
      @lostpointercapture=${this.onLostCapture}
      @pointerleave=${this.press.release}
      @mousedown=${this.onMouseDown}
      @click=${this.onClick}
      @keydown=${this.onKeyDown}
      @keyup=${this.onKeyUp}
      @focus=${this.onFocus}
      @blur=${this.press.onBlur}
    >${inner}</button>`;
  }
}

if (!customElements.get('tanrei-handle')) customElements.define('tanrei-handle', TanreiHandle);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-handle': TanreiHandle;
  }
}
