import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AnimatedSize, AvailabilityController, report } from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import { parseValues } from '../../primitives/values.js';
import '../handle/handle.js';
import type { TanreiHandle, TanreiHandleResizeDetail, TanreiHandleStepDetail } from '../handle/handle.js';
import { HANDLES, SIZE_INDICATORS, VARIANTS, styles } from './resizable-frame.styles.js';

/** The two looks: `outlined`, a box a preview is checked in; `plain`, the edge of a pane (a navigation drawer, a side bar). */
export type TanreiResizableFrameVariant = 'outlined' | 'plain';
/** A handle the frame draws: on its start or its end edge (the width), its bottom edge (the height) or its bottom-end corner (both). */
export type TanreiResizableFrameHandle = 'start' | 'end' | 'bottom' | 'bottom-end';
/** When the size indicator is drawn: never, while a handle is held or has keyboard focus, or always. */
export type TanreiResizableFrameSizeIndicator = 'none' | 'active' | 'always';
/** What `resize` and `change` carry: the box's width and height in CSS pixels. */
export interface TanreiResizableFrameSizeDetail {
  width: number;
  height: number;
}

/** `snap-widths`: whitespace-separated widths or a JSON array; anything that is not a number is kept to be reported (RSF-16). */
const numberList = {
  fromAttribute: (value: string | null): number[] => parseValues(value).map((entry) => (entry.trim() === '' ? Number.NaN : Number(entry))),
};
/** `handles`: whitespace-separated or a JSON array; an empty attribute is no handle at all. */
const handleList = { fromAttribute: (value: string | null): string[] => parseValues(value) };
/** A number attribute whose absence (or an empty value) is null: a size the layout gives. */
const nullableNumber = {
  fromAttribute: (value: string | null): number | null => (value === null || value.trim() === '' ? null : Number(value)),
  toAttribute: (value: number | null): string | null => (value === null || value === undefined ? null : String(value)),
};

const usable = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, least: number, greatest: number) => Math.min(Math.max(value, least), Math.max(least, greatest));
const EMBEDDED = 'iframe, object, embed';

/** Which size a handle changes, and which way a distance toward the end edge goes for it. */
const SIDES: Record<TanreiResizableFrameHandle, { width: -1 | 0 | 1; height: 0 | 1 }> = {
  start: { width: -1, height: 0 },
  end: { width: 1, height: 0 },
  bottom: { width: 0, height: 1 },
  'bottom-end': { width: 1, height: 1 },
};

interface Drag {
  handle: TanreiResizableFrameHandle;
  width: number;
  height: number;
  changed: boolean;
  /** The embedded documents RSF-6 took the pointer from, with the inline value each had. */
  embedded: [HTMLElement, string][];
}

/**
 * Gives its content — a component preview, a page in an embedded document, a navigation drawer, a side bar — a width
 * and a height a person changes by dragging a handle on its edge or its corner, from the keyboard (each handle is a
 * separator: the arrows, Page Up and Page Down, Home and End), or by activating the handle, which switches between the
 * greatest size and the one before it.
 *
 * Contract: specs/resizable-frame.spec.json. Built from `<tanrei-handle>`, one for each name in `handles`, in its
 * shadow root: the frame gives each its value, least, greatest and name, and hears its events there; they do not
 * leave the shadow root. The frame's own events are `resize` (in every frame of a drag) and `change` (once a person
 * has changed the size), both with `{ width, height }`; neither is sent when you set `width` or `height`.
 *
 * `variant="outlined"` (the default) is a box a preview is checked in: rounded corners, one hairline, the handles
 * outside the box so that they cover nothing, drawn at rest while a mouse is over the frame. `variant="plain"` is a
 * pane's edge: no edge or corners of its own, the content filling the box with its own surface, each handle centred on
 * its edge and out of sight until it is used. `handles="start"` is for content at the end of a layout (a side bar): the
 * box then stands at the end of its room.
 *
 * `width` and `height` are null until a person or you give one: the box then takes the width the layout gives and the
 * height the layout gives (or the content's). The least width is `min-width`, or 320 (the reflow width of WCAG
 * 1.4.10); the greatest is `max-width`, or the room the layout gives. While a drag lasts, every `<iframe>`, `<object>`
 * and `<embed>` in the content takes no pointer, so the drag is not lost over it.
 *
 * @tag tanrei-resizable-frame
 * @slot - The content: a component, an embedded document, a layout, a navigation drawer.
 * @csspart container - The box the content is laid out in.
 * @csspart size-indicator - The width × height label (hidden from assistive technology).
 * @csspart start-handle - The `<tanrei-handle>` on the start edge.
 * @csspart end-handle - The `<tanrei-handle>` on the end edge.
 * @csspart bottom-handle - The `<tanrei-handle>` on the bottom edge.
 * @csspart corner-handle - The `<tanrei-handle>` at the bottom-end corner.
 * @fires {CustomEvent<TanreiResizableFrameSizeDetail>} resize - The size changed during a drag, in every frame it changes.
 * @fires {CustomEvent<TanreiResizableFrameSizeDetail>} change - A person finished changing the size: a drag ended, a key changed it, or a handle was activated.
 */
export class TanreiResizableFrame extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'resizable-frame');
  static override styles = [styles, hiddenHost];

  /** @internal Its documented parts. */
  static readonly parts: readonly string[] = ['container', 'size-indicator', 'start-handle', 'end-handle', 'bottom-handle', 'corner-handle'];

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    handles: { converter: handleList },
    width: { converter: nullableNumber },
    height: { converter: nullableNumber },
    minWidth: { attribute: 'min-width', converter: nullableNumber },
    maxWidth: { attribute: 'max-width', converter: nullableNumber },
    minHeight: { attribute: 'min-height', converter: nullableNumber },
    maxHeight: { attribute: 'max-height', converter: nullableNumber },
    snapWidths: { attribute: 'snap-widths', converter: numberList },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    sizeIndicator: { type: String, attribute: 'size-indicator' },
    widthLabel: { type: String, attribute: 'width-label' },
    heightLabel: { type: String, attribute: 'height-label' },
    cornerLabel: { type: String, attribute: 'corner-label' },
    held: { state: true },
    keyed: { state: true },
    pointed: { state: true },
    measured: { state: true },
  };

  /** `outlined`: a box with rounded corners and one hairline, its handles outside it. `plain`: a pane's edge, the handles centred on it. */
  variant: TanreiResizableFrameVariant = 'outlined';

  /** Which handles it draws: any of `start`, `end`, `bottom`, `bottom-end`. The attribute is space-separated. */
  handles: TanreiResizableFrameHandle[] = ['end'];

  /** The box's width in pixels; null takes the width the layout gives. A person's drag, key or activation changes it. */
  width: number | null = null;

  /** The box's height in pixels; null takes the height the layout gives, or the content's. */
  height: number | null = null;

  /** The least width a person can give; null is `--tanrei-comp-resizable-frame-container-min-width` (320). */
  minWidth: number | null = null;

  /** The greatest width; null is the width the layout gives. */
  maxWidth: number | null = null;

  /** The least height; null is `--tanrei-comp-resizable-frame-container-min-height`. */
  minHeight: number | null = null;

  /** The greatest height; null is unlimited. */
  maxHeight: number | null = null;

  /** Widths in whole pixels a drag that changes the width snaps to (`snap-widths="360 600 1024"`). */
  snapWidths: number[] = [];

  /** Pixels one arrow key changes a size by. */
  step = 10;

  /** Pixels Shift with an arrow key, Page Up or Page Down changes a size by. */
  largeStep = 100;

  /** When the size indicator is drawn: `none`, `active` (while a handle is held or has keyboard focus) or `always`. */
  sizeIndicator: TanreiResizableFrameSizeIndicator = 'active';

  /** The accessible name of the start and the end handle ("Resize preview width"), in your words. Required while one is drawn. */
  widthLabel = '';

  /** The accessible name of the bottom handle ("Resize preview height"). Required while it is drawn. */
  heightLabel = '';

  /** The accessible name of the corner handle ("Resize preview"). Required while it is drawn. */
  cornerLabel = '';

  /** A handle is held by a press or a drag (RSF-10). */
  private held = false;
  /** A handle has keyboard focus (RSF-10). */
  private keyed = false;
  /** A fine pointer is over the frame (RSF-19). */
  private pointed = false;
  /** What was last measured of the layout (RSF-1, RSF-12). */
  private measured = { room: 0, around: 0, boxWidth: 0, boxHeight: 0, content: 0, leastWidth: 0, leastHeight: 0, snap: 0 };

  private drag: Drag | null = null;
  /** The width and the height before a person last made each the greatest (RSF-8). */
  private previous: { width: number | null; height: number | null } = { width: null, height: null };
  /** A key or an activation changed the size: the next update moves to it (RSF-7). */
  private moveNext = false;

  private readonly motion = new AnimatedSize(this, {
    box: () => this.box,
    axis: 'both',
    anchor: () => 'start',
    duration: 'var(--tanrei-comp-resizable-frame-motion-resize-duration)',
    easing: 'var(--tanrei-comp-resizable-frame-motion-resize-easing)',
  });

  private readonly observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.measure()) : null;
  private observed: Element[] = [];

  private get box(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.box') ?? null;
  }

  // ---- what is drawn: RSF-1, RSF-3, RSF-16 ----

  private get shownVariant(): TanreiResizableFrameVariant {
    return (VARIANTS as readonly string[]).includes(this.variant) ? this.variant : 'outlined';
  }
  private get shownIndicator(): TanreiResizableFrameSizeIndicator {
    return (SIZE_INDICATORS as readonly string[]).includes(this.sizeIndicator) ? this.sizeIndicator : 'active';
  }
  /** The handles it draws, once each, in the focus order of RSF-18. */
  private get shownHandles(): TanreiResizableFrameHandle[] {
    const named = new Set(Array.isArray(this.handles) ? this.handles : []);
    return HANDLES.filter((handle) => named.has(handle));
  }
  /** The snap widths that are whole numbers of pixels above zero (RSF-16). */
  private get snaps(): number[] {
    return (Array.isArray(this.snapWidths) ? this.snapWidths : []).filter((width) => Number.isInteger(width) && width > 0);
  }

  /** The least width: `min-width`, or the token (RSF-1). */
  private get leastWidth(): number {
    return usable(this.minWidth) ? Math.max(0, this.minWidth) : this.measured.leastWidth;
  }
  /** The greatest width: the lesser of `max-width` and the room the layout gives, never under the least (RSF-1). */
  private get greatestWidth(): number {
    const room = this.measured.room > 0 ? this.measured.room - this.measured.around : Number.POSITIVE_INFINITY;
    return Math.max(this.leastWidth, Math.min(usable(this.maxWidth) ? this.maxWidth : Number.POSITIVE_INFINITY, room));
  }
  private get leastHeight(): number {
    return usable(this.minHeight) ? Math.max(0, this.minHeight) : this.measured.leastHeight;
  }
  /** The greatest height: `max-height`, or none (for a drag and a key); RSF-8 takes the content's height for it. */
  private get greatestHeight(): number {
    return Math.max(this.leastHeight, usable(this.maxHeight) ? this.maxHeight : Number.POSITIVE_INFINITY);
  }
  /** The width the box is given now: the product's or the person's, within its least and greatest; else the layout's. */
  private get shownWidth(): number {
    if (usable(this.width)) return Math.round(clamp(this.width, this.leastWidth, this.greatestWidth));
    return Math.round(this.measured.boxWidth || this.leastWidth);
  }
  private get shownHeight(): number {
    if (usable(this.height)) return Math.round(clamp(this.height, this.leastHeight, this.greatestHeight));
    return Math.round(this.measured.boxHeight || this.leastHeight);
  }

  // ---- measuring: RSF-1, RSF-12 ----

  /** The room, what the handles take of it, the box and the content, and the token lengths the element counts with. */
  private measure() {
    const root = this.renderRoot as ShadowRoot | undefined;
    const room = root?.querySelector<HTMLElement>('.room');
    const box = this.box;
    const content = root?.querySelector<HTMLElement>('.content');
    if (!room || !box || !content) return;
    const probe = (name: string) => root!.querySelector<HTMLElement>(`.probe.${name}`)?.getBoundingClientRect().width ?? 0;
    const frame = root!.querySelector<HTMLElement>('.frame')!;
    // Outlined, the handles' tracks and the gaps between the tracks are room the box cannot take (RSF-3).
    let around = 0;
    if (this.shownVariant === 'outlined') {
      const columns = getComputedStyle(frame).gridTemplateColumns.split(' ').filter((track) => track.endsWith('px'));
      const gap = Number.parseFloat(getComputedStyle(frame).columnGap) || 0;
      const tracks = columns.map((track) => Number.parseFloat(track));
      const boxTrack = box.getBoundingClientRect().width;
      // Every track but the box's, and a gap between each two.
      const others = tracks.reduce((sum, track) => sum + track, 0) - boxTrack;
      around = Math.max(0, others) + gap * Math.max(0, tracks.length - 1);
    }
    const style = getComputedStyle(room);
    const roomWidth = room.clientWidth - (Number.parseFloat(style.paddingInlineStart) || 0) - (Number.parseFloat(style.paddingInlineEnd) || 0);
    const rect = box.getBoundingClientRect();
    const next = {
      room: roomWidth,
      around,
      boxWidth: rect.width,
      boxHeight: rect.height,
      content: content.getBoundingClientRect().height + (box.offsetHeight - box.clientHeight),
      leastWidth: probe('min-width'),
      leastHeight: probe('min-height'),
      snap: probe('snap'),
    };
    const was = this.measured;
    if (Object.keys(next).some((key) => Math.abs(next[key as keyof typeof next] - was[key as keyof typeof was]) >= 0.5)) this.measured = next;
  }

  private watch() {
    const root = this.renderRoot as ShadowRoot | undefined;
    const targets = [root?.querySelector('.room'), this.box, root?.querySelector('.content'), ...(root?.querySelectorAll('tanrei-handle') ?? [])].filter((el): el is Element => !!el);
    if (targets.length === this.observed.length && targets.every((el, i) => el === this.observed[i])) return;
    this.observer?.disconnect();
    for (const el of targets) this.observer?.observe(el);
    this.observed = targets;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.observed = [];
      this.watch();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.observer?.disconnect();
    this.observed = [];
    if (this.drag) this.endDrag();
    window.removeEventListener('pointerup', this.onRelease, true);
    window.removeEventListener('pointercancel', this.onRelease, true);
  }

  // ---- RSF-4 to RSF-6: the drag ----

  private handleOf(event: Event): TanreiResizableFrameHandle | null {
    const name = (event.currentTarget as HTMLElement | null)?.dataset.handle;
    return (HANDLES as readonly string[]).includes(name ?? '') ? (name as TanreiResizableFrameHandle) : null;
  }

  private readonly onResizeStart = (event: Event) => {
    const handle = this.handleOf(event);
    if (!handle) return;
    // A motion under way is stopped where it is: the drag goes on from the size shown (RSF-4).
    this.motion.fit(false);
    this.measure();
    const embedded: [HTMLElement, string][] = [];
    // RSF-6: every embedded document in the content takes no pointer while the drag lasts.
    for (const node of this.renderRoot.querySelector<HTMLSlotElement>('slot')?.assignedElements({ flatten: true }) ?? []) {
      for (const el of [...(node.matches(EMBEDDED) ? [node] : []), ...node.querySelectorAll(EMBEDDED)] as HTMLElement[]) {
        embedded.push([el, el.style.getPropertyValue('pointer-events')]);
        el.style.setProperty('pointer-events', 'none');
      }
    }
    this.drag = { handle, width: this.shownWidth, height: this.shownHeight, changed: false, embedded };
    this.held = true;
  };

  private readonly onResize = (event: Event) => {
    const drag = this.drag;
    const handle = this.handleOf(event);
    if (!drag || handle !== drag.handle) return;
    const { inline, block } = (event as CustomEvent<TanreiHandleResizeDetail>).detail;
    const side = SIDES[handle];
    const size: Partial<TanreiResizableFrameSizeDetail> = {};
    if (side.width) size.width = this.snapped(clamp(Math.round(drag.width + side.width * inline), this.leastWidth, this.greatestWidth));
    if (side.height) size.height = clamp(Math.round(drag.height + block), this.leastHeight, this.greatestHeight);
    this.give(size, 'resize');
  };

  private readonly onResizeEnd = (event: Event) => {
    if (!this.drag || this.handleOf(event) !== this.drag.handle) return;
    this.endDrag();
  };

  /** RSF-4: the drag has ended, the size is kept; change once where it changed. RSF-6: the embedded documents take input again. */
  private endDrag() {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    for (const [el, value] of drag.embedded) {
      if (value) el.style.setProperty('pointer-events', value);
      else el.style.removeProperty('pointer-events');
    }
    if (drag.changed) this.emit('change');
  }

  /** RSF-5: a width within snap-distance of a snap width is that width. */
  private snapped(width: number): number {
    const distance = this.measured.snap;
    let best: number | null = null;
    for (const snap of this.snaps) {
      if (Math.abs(snap - width) <= distance && (best === null || Math.abs(snap - width) < Math.abs(best - width))) best = snap;
    }
    return best === null ? width : clamp(best, this.leastWidth, this.greatestWidth);
  }

  /** Gives the box a person's size, and says so: `resize` during a drag, `change` for a key or an activation. */
  private give(size: Partial<TanreiResizableFrameSizeDetail>, say: 'resize' | 'change' | null): boolean {
    const width = size.width ?? null;
    const height = size.height ?? null;
    const changed = (width !== null && width !== this.shownWidth) || (height !== null && height !== this.shownHeight);
    // A size the layout gave becomes the person's own once a handle moves it, even where the number is the same.
    if (width !== null) this.width = width;
    if (height !== null) this.height = height;
    if (!changed) return false;
    if (this.drag) this.drag.changed = true;
    if (say) this.emit(say, { width: width ?? this.shownWidth, height: height ?? this.shownHeight });
    return true;
  }

  private emit(type: 'resize' | 'change', size?: TanreiResizableFrameSizeDetail) {
    const detail = size ?? { width: this.shownWidth, height: this.shownHeight };
    // Each event is written out by its name, so that the manifest's analyzer finds both.
    if (type === 'resize') this.dispatchEvent(new CustomEvent<TanreiResizableFrameSizeDetail>('resize', { bubbles: true, composed: true, detail }));
    else this.dispatchEvent(new CustomEvent<TanreiResizableFrameSizeDetail>('change', { bubbles: true, composed: true, detail }));
  }

  // ---- RSF-7, RSF-8: keys and activation ----

  private readonly onStep = (event: Event) => {
    const handle = this.handleOf(event);
    if (!handle || this.drag) return;
    const { axis, direction, amount } = (event as CustomEvent<TanreiHandleStepDetail>).detail;
    const side = SIDES[handle];
    const by = amount === 'large' ? this.largeStep : this.step;
    const size: Partial<TanreiResizableFrameSizeDetail> = {};
    if (axis === 'inline' && side.width) {
      // Home is the least and End the greatest from either edge; an arrow away from the box widens it.
      size.width = amount === 'limit' ? (direction < 0 ? this.leastWidth : this.greatestWidth) : clamp(this.shownWidth + direction * side.width * (usable(by) ? by : 0), this.leastWidth, this.greatestWidth);
    } else if (axis === 'block' && side.height) {
      const greatest = Number.isFinite(this.greatestHeight) ? this.greatestHeight : Math.max(this.shownHeight, this.contentHeight);
      size.height = amount === 'limit' ? (direction < 0 ? this.leastHeight : greatest) : clamp(this.shownHeight + direction * (usable(by) ? by : 0), this.leastHeight, this.greatestHeight);
    } else return;
    if (size.width !== undefined) size.width = Math.round(size.width);
    if (size.height !== undefined) size.height = Math.round(size.height);
    this.moveNext = true;
    if (!this.give(size, 'change')) this.moveNext = false;
  };

  /** The content's own height (RSF-8: the greatest height while `max-height` is null). */
  private get contentHeight(): number {
    return Math.round(Math.max(this.leastHeight, this.measured.content));
  }

  private readonly onActivate = (event: Event) => {
    const handle = this.handleOf(event);
    if (!handle || this.drag) return;
    this.measure();
    const side = SIDES[handle];
    const size: Partial<TanreiResizableFrameSizeDetail> = {};
    if (side.width) {
      const greatest = Math.round(this.greatestWidth);
      if (this.shownWidth < greatest) {
        this.previous.width = this.shownWidth;
        size.width = greatest;
      } else size.width = Math.round(this.previous.width ?? this.leastWidth);
    }
    if (side.height) {
      const greatest = Math.round(Number.isFinite(this.greatestHeight) ? this.greatestHeight : this.contentHeight);
      if (this.shownHeight < greatest) {
        this.previous.height = this.shownHeight;
        size.height = greatest;
      } else size.height = Math.round(this.previous.height ?? this.leastHeight);
    }
    this.moveNext = true;
    if (!this.give(size, 'change')) this.moveNext = false;
  };

  // ---- RSF-10, RSF-19: held, keyboard focus, a pointer over the frame ----

  private readonly onHandleDown = () => {
    this.held = true;
    window.addEventListener('pointerup', this.onRelease, true);
    window.addEventListener('pointercancel', this.onRelease, true);
  };
  private readonly onRelease = () => {
    window.removeEventListener('pointerup', this.onRelease, true);
    window.removeEventListener('pointercancel', this.onRelease, true);
    this.held = false;
  };
  private readonly onFocusIn = (event: FocusEvent) => {
    const handle = event.currentTarget as TanreiHandle;
    this.keyed = !!handle.shadowRoot?.querySelector('.container')?.matches(':focus-visible');
  };
  private readonly onFocusOut = () => {
    this.keyed = false;
  };
  private readonly onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') this.pointed = true;
  };
  private readonly onPointerLeave = () => {
    this.pointed = false;
  };

  // ---- the update ----

  override willUpdate(changed: PropertyValues<this>) {
    // RSF-12: a size the product sets is drawn at once; the motion of RSF-7 is for a person's key or activation only.
    if ((changed.has('width') || changed.has('height')) && !this.moveNext && !this.drag) this.motion.fit(false);
  }

  override updated(changed: PropertyValues<this>) {
    // The observer measures each element it is given when it starts to watch it, and again whenever it changes size.
    this.watch();
    if (this.moveNext) {
      this.moveNext = false;
      this.motion.fit(true);
    }
    if (changed.has('variant') && this.variant !== this.shownVariant) report(this, 'RSF-16', `variant "${this.variant}" is not a value of the resizable frame; it is drawn as "outlined"`);
    if (changed.has('sizeIndicator') && this.sizeIndicator !== this.shownIndicator) report(this, 'RSF-16', `size-indicator "${this.sizeIndicator}" is not a value of the resizable frame; it is treated as "active"`);
    if (changed.has('handles')) {
      for (const name of Array.isArray(this.handles) ? this.handles : []) {
        if (!(HANDLES as readonly string[]).includes(name)) report(this, 'RSF-16', `handles names "${name}", which is not a handle of the resizable frame (start, end, bottom, bottom-end); it is not drawn`);
      }
    }
    if (changed.has('snapWidths')) {
      for (const width of Array.isArray(this.snapWidths) ? this.snapWidths : []) {
        if (!(Number.isInteger(width) && width > 0)) report(this, 'RSF-16', `snap-widths has "${width}", which is not a whole number of pixels above zero; it is ignored`);
      }
    }
    if (changed.has('handles') || changed.has('widthLabel') || changed.has('heightLabel') || changed.has('cornerLabel')) {
      const shown = this.shownHandles;
      const missing = [
        ...(shown.some((h) => h === 'start' || h === 'end') && !this.widthLabel.trim() ? ['width-label'] : []),
        ...(shown.includes('bottom') && !this.heightLabel.trim() ? ['height-label'] : []),
        ...(shown.includes('bottom-end') && !this.cornerLabel.trim() ? ['corner-label'] : []),
      ];
      for (const name of missing) report(this, 'RSF-9', `${name} is empty, so a handle it names has no accessible name; give it one that says what it resizes`);
    }
  }

  private labelOf(handle: TanreiResizableFrameHandle): string {
    return handle === 'bottom' ? this.heightLabel : handle === 'bottom-end' ? this.cornerLabel : this.widthLabel;
  }

  private handleTemplate(handle: TanreiResizableFrameHandle) {
    const side = SIDES[handle];
    const forWidth = handle === 'start' || handle === 'end';
    // RSF-9: the width for the start and the end handle, the height for the bottom and the corner handle.
    const value = forWidth ? this.shownWidth : this.shownHeight;
    const least = forWidth ? this.leastWidth : this.leastHeight;
    const greatest = forWidth ? this.greatestWidth : Number.isFinite(this.greatestHeight) ? this.greatestHeight : Math.max(this.shownHeight, this.contentHeight);
    // Before the room is first measured the greatest is not known yet: the value stands for it.
    const max = Number.isFinite(greatest) ? greatest : value;
    const part = handle === 'bottom-end' ? 'corner-handle' : `${handle}-handle`;
    return html`<tanrei-handle
      part=${part}
      class=${`handle-${handle}`}
      data-handle=${handle}
      axis=${side.width && side.height ? 'both' : side.width ? 'horizontal' : 'vertical'}
      corner="bottom-end"
      size="medium"
      .value=${value}
      .min=${Math.round(least)}
      .max=${Math.round(Math.max(least, max))}
      .label=${this.labelOf(handle)}
      .revealed=${this.shownVariant === 'outlined' && this.pointed}
      @resizestart=${this.onResizeStart}
      @resize=${this.onResize}
      @resizeend=${this.onResizeEnd}
      @step=${this.onStep}
      @activate=${this.onActivate}
      @pointerdown=${this.onHandleDown}
      @focusin=${this.onFocusIn}
      @focusout=${this.onFocusOut}
    ></tanrei-handle>`;
  }

  /** RSF-10: width × height in whole pixels, in the digits of the layout's language, without grouping; RSF-13: written left to right in every layout. */
  private indicatorText(): string {
    const lang = this.closest('[lang]')?.getAttribute('lang') || (typeof navigator !== 'undefined' ? navigator.language : 'en');
    let format: Intl.NumberFormat;
    try {
      format = new Intl.NumberFormat(lang, { useGrouping: false, maximumFractionDigits: 0 });
    } catch {
      format = new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: 0 });
    }
    return `${format.format(this.shownWidth)} × ${format.format(this.shownHeight)}`;
  }

  override render() {
    const variant = this.shownVariant;
    const handles = this.shownHandles;
    const outlined = variant === 'outlined';
    const hasWidth = usable(this.width);
    const hasHeight = usable(this.height);
    // RSF-1: the box stands at the end of its room while it is resized from its start edge alone.
    const atEnd = handles.includes('start') && !handles.includes('end');
    // RSF-3: outlined, a track for each edge a handle stands beyond; plain, the box's cell alone.
    const startColumn = outlined && handles.includes('start');
    const endColumn = outlined && (handles.includes('end') || handles.includes('bottom-end'));
    const bottomRow = outlined && (handles.includes('bottom') || handles.includes('bottom-end'));
    const columns = [startColumn ? 'auto' : null, hasWidth ? 'auto' : 'minmax(0, 1fr)', endColumn ? 'auto' : null].filter(Boolean).join(' ');
    const rows = [hasHeight ? 'auto' : 'minmax(0, 1fr)', bottomRow ? 'auto' : null].filter(Boolean).join(' ');
    const area = (row: 'box' | 'bottom') =>
      `"${[startColumn ? (row === 'box' ? 'hs' : '.') : null, row === 'box' ? 'box' : 'hb', endColumn ? (row === 'box' ? 'he' : 'hc') : null].filter(Boolean).join(' ')}"`;
    const areas = [area('box'), bottomRow ? area('bottom') : null].filter(Boolean).join(' ');
    const indicator = this.shownIndicator;
    const shown = indicator === 'always' || (indicator === 'active' && (this.held || this.keyed));
    const sizes = {
      '--_rsf-w': hasWidth ? `${this.shownWidth}px` : undefined,
      '--_rsf-h': hasHeight ? `${this.shownHeight}px` : undefined,
      '--_rsf-min-h': usable(this.minHeight) ? `${Math.max(0, this.minHeight)}px` : 'var(--tanrei-comp-resizable-frame-container-min-height)',
      '--_rsf-max-h': usable(this.maxHeight) ? `${this.greatestHeight}px` : undefined,
      'min-inline-size': hasWidth ? undefined : usable(this.minWidth) ? `${Math.max(0, this.minWidth)}px` : 'var(--tanrei-comp-resizable-frame-container-min-width)',
      'max-inline-size': hasWidth || !usable(this.maxWidth) ? undefined : `${this.greatestWidth}px`,
    };
    // RSF-2, RSF-18: outlined, the box is a focus stop while its content scrolls inside it.
    const scrolls = outlined && this.measured.content - 0.5 > this.measured.boxHeight;
    return html`<div class=${classMap({ room: true, 'at-end': atEnd })}>
      <div
        class=${classMap({ frame: true, [variant]: true, fills: !hasWidth })}
        style=${styleMap({ 'grid-template-columns': columns, 'grid-template-rows': rows, 'grid-template-areas': areas })}
        @pointerenter=${this.onPointerEnter}
        @pointerleave=${this.onPointerLeave}
      >
        <div part="container" class="box" style=${styleMap(sizes)} tabindex=${scrolls ? '0' : nothing}><slot class="content"></slot></div>
        <span part="size-indicator" class=${classMap({ indicator: true, shown, live: !!this.drag })} dir="ltr" aria-hidden="true">${this.indicatorText()}</span>
        ${handles.map((handle) => this.handleTemplate(handle))}
      </div>
    </div>
    <span class="probe min-width" aria-hidden="true"></span><span class="probe min-height" aria-hidden="true"></span><span class="probe snap" aria-hidden="true"></span>`;
  }
}

if (!customElements.get('tanrei-resizable-frame')) customElements.define('tanrei-resizable-frame', TanreiResizableFrame);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-resizable-frame': TanreiResizableFrame;
  }
}
