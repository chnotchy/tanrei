import { type CSSResult, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { type ShadowLayer, shadeOn, shadowLayers } from './arrow.js';
import { FollowController } from './follow.js';
import { deepActive } from './modal.js';
import { AppearController, type AppearTiming, appearStyles } from './motion.js';
import { type AnchoredArrow, type AnchoredPlace, type AnchoredPlacement, type AnchoredSide, ANCHORED_PLACEMENTS, type NamedSide, anchorGone, placeAnchored, usableLength, visibleViewport } from './placement.js';
import { keyboardCover } from './sheet.js';

// A surface that opens beside a control and stays with it (a popover, POP-1 to POP-5, POP-7, POP-8, POP-10, POP-26,
// POP-27, POP-36; and every surface that cites those rules — a select's, a combobox's, a color field's). What the
// component keeps is what it draws inside the surface; what this keeps is everything about where the surface is:
//
//   presenting   into the top layer (`popover="manual"`: above an open modal dialog the element stands in), or in place
//                for a test's fixture (`inline`), and out of it again
//   placing      `placeAnchored()` (src/primitives/placement.ts) against the anchor's box: the side and the alignment,
//                the offsets, flipping, shifting, and — where the side lacks room — the surface limited to the room,
//                or moved back over the anchor where the room is less than the surface's least size
//   following    FollowController: placed again when the anchor moves, by events, frame by frame only while it moves
//   the anchor   gone (removed, hidden, scrolled out of sight): the component is told, once
//   the arrow    where it points, and the elevation drawn round the surface and its arrow as one shape
//   motion       the one appearance (src/primitives/motion.ts, role anchored): from `sys.motion.appear.*`, grown from
//                the middle of the edge that faces the anchor (from its own centre where `appear.origin` says so, or
//                where it covers its anchor), and back the same way, each turned round from where the other had got
//                to; closed or closing it takes no pointer and no focus
//
// The markup, in the component's shadow root (the class names are the component's; it names them to both halves):
//
//   <div class="surface" popover="manual">    the placed box: unpainted, never transformed, so its box is the surface at
//                                             rest; the arrow's elevation filter is set on it (src/primitives/arrow.ts)
//     <div class="motion">                    what fades and grows (AppearController)
//       <span class="arrow">                  (src/primitives/arrow.ts)
//       <div class="box">                     the painted box
//     </div>
//     <span class="shade"> … the shade filter
//   </div>
//
// The placed box carries, written here: `top` and `left`; `data-side` (top, bottom, left, right); `data-held` while it
// covers its anchor; `data-arrow` and `--_arrow-at` (the arrow); and three lengths the component's own rules size the
// painted box with — `--_anchored-max-inline` and `--_anchored-max-block` (the most it may be now: the window less its
// margins, or the room its side leaves) and `--_anchored-anchor-inline` (the anchor's width, while the surface matches it).

type Host = ReactiveControllerHost & HTMLElement;

export interface AnchoredSurfaceOptions {
  /** The placed box. */
  surface: () => HTMLElement | null;
  /** What fades and grows inside it. */
  motion: () => HTMLElement | null;
  /** The painted box, whose corner radius an arrow stays off. */
  box: () => HTMLElement | null;
  /** The element the surface stands beside. */
  anchor: () => Element | null;
  placement: () => AnchoredPlacement;
  /** What a placement that is not one of the thirteen is placed as. */
  fallback: AnchoredPlacement;
  /** The order `auto` tries the sides in, and how it lines the surface up. */
  auto: readonly NamedSide[];
  autoAlign: 'center' | 'start';
  /** The distance from the anchor's edge as the product set it; anything that is not a usable length takes the token. */
  offset: () => number | null | undefined;
  crossOffset: () => number;
  /** Whether an arrow is asked for now. */
  arrow: () => boolean;
  /** Whether the surface is as wide as its anchor. */
  matchWidth?: () => boolean;
  /** Drawn in place, not in the top layer: placed inside its positioned ancestor, which stands for the window. */
  inline?: () => boolean;
  /** The least size the surface is limited to; with less room than that on its side, it covers its anchor instead. */
  least?: () => { width: number; height: number };
  /** What scrolls inside the surface: its position is kept while the surface is measured. */
  scroller?: () => HTMLElement | null;
  /** The element that carries the elevation for the shade filter (`.shade`). */
  shade?: () => Element | null;
  /** The anchor has gone out of sight while the surface is shown: called once each time it goes. */
  gone: () => void;
  /**
   * The surface's limits were set and it is about to be measured: whatever the component lays out by script for the
   * width it has (a row of actions that stacks) is laid out now.
   */
  arrange?: () => void;
  /** The surface was placed. */
  placed?: (place: AnchoredPlace) => void;
  /** Whatever else the placement depends on, as one comparable string (a choice of the system read from the cascade). */
  depends?: () => string;
}

/** What `anchoredSurfaceStyles()` is told: the selectors of the markup above, and the component's tokens as CSS expressions. */
export interface AnchoredStyleOptions {
  surface: string;
  motion: string;
  /** The distance to the anchor and to the window's edges. */
  offset: string;
  margin: string;
  /** The arrow's base, height and inset; left out by a surface that never draws one. */
  arrow?: { width: string; height: string; inset: string };
  /** The entrance's and the exit's durations and curves: the component's tokens, which alias the anchored role's. */
  enter: AppearTiming;
  exit: AppearTiming;
  /** Where it starts from, where the component has tokens of its own for it (`appearStyles()`'s `appear`). */
  appear?: string;
}

/**
 * The placed box and its motion. The box is a popover in the top layer with none of the browser's popover defaults,
 * placed by script; it paints nothing. The placement reads its lengths through real properties of the box (a custom
 * property holds an expression): the offset, the window margin, the arrow's measures and the window's safe-area insets.
 * What is inside it appears as every surface does (`appearStyles()`, role anchored, from its anchor): closed it stands
 * where `sys.motion.appear.*` start it, open it is whole, and it moves between the two over `enter` and `exit` — a
 * cross-fade over `sys.motion.role.reduced` where motion is reduced.
 */
export function anchoredSurfaceStyles({ surface, motion, offset, margin, arrow, enter, exit, appear }: AnchoredStyleOptions): CSSResult {
  return unsafeCSS(`
  ${surface} {
    box-sizing: border-box;
    position: fixed;
    inset: auto;
    margin: 0;
    border: 0;
    padding: 0;
    background: none;
    color: inherit;
    overflow: visible;
    inline-size: max-content;
    max-inline-size: none;
    max-block-size: none;
    outline: none;
    scroll-margin-block-start: ${offset};
    scroll-margin-block-end: ${margin};
    scroll-margin-inline-start: ${arrow?.width ?? '0px'};
    scroll-margin-inline-end: ${arrow?.height ?? '0px'};
    scroll-padding-block-start: ${arrow?.inset ?? '0px'};
    scroll-padding-block-end: env(safe-area-inset-bottom, 0px);
    scroll-padding-inline-start: env(safe-area-inset-left, 0px);
    scroll-padding-inline-end: env(safe-area-inset-right, 0px);
    outline-offset: env(safe-area-inset-top, 0px);
  }
  ${surface}:not(:popover-open):not(.inline) {
    display: none;
  }
  ${surface}:popover-open,
  ${surface}.inline {
    display: block;
  }
  ${surface}.inline {
    position: absolute;
  }
  /* Closed or closing, it takes no pointer: a press reaches what lies under it. */
  ${surface}:not(.open) {
    pointer-events: none;
  }
  /* What the arrow is placed against. */
  ${motion} {
    position: relative;
  }
  ${appearStyles({ motion, open: `${surface}.open`, role: 'anchored', origin: 'anchor', enter, exit, appear })}
`);
}

const px = (value: string) => Number.parseFloat(value) || 0;

/**
 * The box CSS positions a surface drawn in place in. `offsetParent` — the box that stands for the window in a fixture —
 * names the nearest positioned ancestor a script of the page may see, and so passes over one that stands in another
 * element's shadow root: the frame of a `<tanrei-field>` around the control. The surface's `top` and `left` are
 * counted from that nearer box. Walks the flattened tree from the surface to `seen` and returns the first positioned
 * element on the way; `seen` itself where there is none, which is every case but that one.
 */
function positionedIn(surface: HTMLElement, seen: HTMLElement): HTMLElement {
  const up = (node: Element): Element | null => node.assignedSlot ?? node.parentElement ?? ((node.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
  for (let at = up(surface); at && at !== seen; at = up(at)) if (getComputedStyle(at).position !== 'static') return at as HTMLElement;
  return seen;
}

/**
 * Presents, places and follows a surface beside its anchor. `show()` when the component opens, `hide()` when it
 * closes; `place()` when something the placement depends on changed in a way no event tells (the host rendering again
 * is seen by itself).
 */
export class AnchoredSurfaceController implements ReactiveController {
  /** Whether the surface is presented (a surface that is fading out is not). */
  shown = false;
  /** The side it stands on, kept while that side has room. */
  side: AnchoredSide | null = null;
  /** Where it was last placed. */
  at: AnchoredPlace | null = null;
  /** The elevation's layers, for `shadeFilter()`, while an arrow is drawn. */
  layers: ShadowLayer[] = [];
  private shade = '';
  private placedFor = '';
  private lastLayout = '';
  private wasGone = false;
  private cover = 0;
  /** The width it was last arranged for. */
  private arranged = Number.NaN;
  private readonly following: FollowController;
  /** Its appearance: opened and closed, turned round, made at once (src/primitives/motion.ts). */
  private readonly appear: AppearController;

  constructor(
    private readonly host: Host,
    private readonly options: AnchoredSurfaceOptions,
  ) {
    host.addController(this);
    this.following = new FollowController(host, {
      followed: () => [options.anchor()],
      sized: () => [options.surface()],
      check: this.check,
    });
    this.appear = new AppearController(host, { motion: options.motion });
  }

  hostDisconnected() {
    this.hide(false);
  }

  private get inline(): boolean {
    return !!this.options.inline?.();
  }

  /**
   * The window the surface is kept in — its visible part (`visibleViewport()`: above the on-screen keyboard), less its
   * safe-area insets — or, in place, the box it is positioned in.
   */
  private frame(surface: HTMLElement, style: CSSStyleDeclaration) {
    const root = document.documentElement;
    if (this.inline) {
      const parent = (surface.offsetParent as HTMLElement | null) ?? root;
      const box = parent.getBoundingClientRect();
      // Where the surface's own `top` and `left` are counted from, when that is not the box that stands for the window.
      const held = positionedIn(surface, parent);
      const from = held === parent ? null : held.getBoundingClientRect();
      const shift = from ? { x: box.x + parent.clientLeft - from.x - held.clientLeft, y: box.y + parent.clientTop - from.y - held.clientTop } : { x: 0, y: 0 };
      return { x: box.x + parent.clientLeft, y: box.y + parent.clientTop, width: parent.clientWidth, height: parent.clientHeight, cover: 0, shift };
    }
    const [top, bottom, left, right] = [px(style.outlineOffset), px(style.scrollPaddingBlockEnd), px(style.scrollPaddingInlineStart), px(style.scrollPaddingInlineEnd)];
    // POP-36, SEL-24, CMB-22: the visible part of the window — the keyboard's top edge is an edge of it — less the
    // safe-area insets of the layout viewport's own edges.
    const view = visibleViewport();
    const [x, y] = [Math.max(view.x, left), Math.max(view.y, top)];
    const [end, foot] = [Math.min(view.x + view.width, root.clientWidth - right), Math.min(view.y + view.height, root.clientHeight - bottom)];
    return { x, y, width: Math.max(0, end - x), height: Math.max(0, foot - y), cover: keyboardCover(), shift: { x: 0, y: 0 } };
  }

  /** What the placement was made for, as one comparable string. */
  private layout(): string {
    const surface = this.options.surface();
    const anchor = this.options.anchor();
    if (!surface) return '';
    const frame = this.frame(surface, getComputedStyle(surface));
    const box = anchor?.getBoundingClientRect();
    // Hidden with its box where it was (`visibility: hidden`), or taken out of the page: gone, with nothing moved.
    const there = !!anchor && anchor.isConnected && (typeof anchor.checkVisibility !== 'function' || anchor.checkVisibility({ visibilityProperty: true }));
    const size = surface.getBoundingClientRect();
    const shade = surface.dataset.arrow ? this.readShade() : '';
    return [
      box ? `${box.x - (this.inline ? frame.x : 0)},${box.y - (this.inline ? frame.y : 0)},${box.width},${box.height}` : 'none',
      String(there),
      `${frame.x},${frame.y},${frame.width},${frame.height}`,
      `${size.width},${size.height}`,
      getComputedStyle(this.host).direction,
      shade,
      `${this.options.placement()},${this.options.offset()},${this.options.crossOffset()},${this.options.arrow()},${!!this.options.matchWidth?.()}`,
      this.options.depends?.() ?? '',
    ].join(' ');
  }

  private readShade(): string {
    const shade = this.options.shade?.();
    return shade ? getComputedStyle(shade).boxShadow : '';
  }

  /** Places again if what the placement depends on changed; FollowController asks when something can have moved. */
  private readonly check = (): boolean => {
    if (!this.shown) return false;
    if (this.layout() === this.lastLayout) return false;
    this.place();
    return true;
  };

  /** Something no event tells of changed what the placement depends on (the content, a prop): looked at in the next frame. */
  request() {
    this.following.request();
  }

  /**
   * Runs `during` with the surface going on from what it shows (`AppearController.keep`): for a change inside it that
   * an engine draws the surface anew for. WebKit starts the appearance again from its start (`@starting-style`) when a
   * slot inside the surface is given other elements (`HTMLSlotElement.assign`): a surface drawn whole would be drawn
   * from nothing for a frame, and one appearing would start again. Returns what `during` returns.
   */
  keep<T>(during: () => T): T {
    return this.appear.keep(during);
  }

  /** Places the surface against its anchor now. Returns whether it could (it is shown, and there is an anchor in the page). */
  place(): boolean {
    const surface = this.options.surface();
    const motion = this.options.motion();
    const element = this.options.anchor();
    if (!surface || !motion || !this.shown) return false;
    const inline = this.inline;
    const style = getComputedStyle(surface);
    const frame = this.frame(surface, style);
    const root = document.documentElement;
    const box = element?.getBoundingClientRect();
    // POP-5: the anchor removed, hidden or out of sight — told once each time it goes. (In place there is no window to leave.)
    const gone = !element || !box || (!inline && anchorGone(element, box, { width: root.clientWidth, height: root.clientHeight }));
    if (gone && !this.wasGone) {
      this.wasGone = true;
      this.options.gone();
    } else if (!gone) this.wasGone = false;
    if (!this.shown || !element || !box || !element.isConnected) return false;

    const margin = px(style.scrollMarginBlockEnd);
    const anchor = { x: box.x - frame.x, y: box.y - frame.y, width: box.width, height: box.height };
    const viewport = { width: frame.width, height: frame.height };
    const limit = (name: 'inline' | 'block', value: number) => surface.style.setProperty(`--_anchored-max-${name}`, `${Math.max(0, value)}px`);
    const scroller = this.options.scroller?.() ?? null;
    const scrolled = scroller?.scrollTop ?? 0;
    // Measured at the most it may be in this window: its own size, within its own limits.
    limit('inline', viewport.width - 2 * margin);
    limit('block', viewport.height - 2 * margin);
    if (this.options.matchWidth?.()) surface.style.setProperty('--_anchored-anchor-inline', `${anchor.width}px`);
    else surface.style.removeProperty('--_anchored-anchor-inline');
    // Its drawn size, not `offsetWidth` / `offsetHeight`: those are rounded to whole pixels (the box is never transformed).
    const measure = () => {
      const drawn = surface.getBoundingClientRect();
      return { width: drawn.width, height: drawn.height };
    };
    const rtl = getComputedStyle(this.host).direction === 'rtl';
    const named = this.options.placement();
    const placement = ANCHORED_PLACEMENTS.includes(named) ? named : this.options.fallback;
    // Another placement or direction is another place, taken at once: the side it was on says nothing.
    if (this.placedFor !== `${placement} ${rtl}`) this.side = null;
    this.placedFor = `${placement} ${rtl}`;
    const painted = this.options.box();
    // What the component lays out for the width it has is laid out again when that width's limit changes.
    const arrange = (width: number) => {
      if (width === this.arranged) return;
      this.arranged = width;
      this.options.arrange?.();
    };
    arrange(Math.max(0, viewport.width - 2 * margin));
    let size = measure();
    const arrow: AnchoredArrow = {
      width: px(style.scrollMarginInlineStart),
      height: px(style.scrollMarginInlineEnd),
      inset: px(style.scrollPaddingBlockStart),
      radius: painted ? Math.min(px(getComputedStyle(painted).borderTopLeftRadius), size.width / 2, size.height / 2) : 0,
      drawn: this.options.arrow(),
    };
    const offset = this.options.offset();
    const input = {
      anchor,
      viewport,
      placement,
      offset: usableLength(offset) ? offset : px(style.scrollMarginBlockStart),
      crossOffset: this.options.crossOffset(),
      margin,
      rtl,
      arrow,
      fallback: this.options.fallback,
      auto: this.options.auto,
      autoAlign: this.options.autoAlign,
      holdInMargin: true,
    };
    let at = placeAnchored({ ...input, surface: size, keep: this.side });
    if (!at.fits) {
      // POP-5: neither side has room. Limited to the room of the one with more — unless that is less than its least
      // size, where it keeps the window's limit and is moved back over the anchor.
      const vertical = at.side === 'top' || at.side === 'bottom';
      const least = this.options.least?.() ?? { width: 0, height: 0 };
      if (at.room > 0 && at.room >= (vertical ? least.height : least.width)) {
        limit(vertical ? 'block' : 'inline', at.room);
        if (!vertical) arrange(at.room);
        size = measure();
        at = placeAnchored({ ...input, surface: size, keep: at.side });
      }
    }
    if (scroller && scroller.scrollTop !== scrolled) scroller.scrollTop = scrolled;
    this.side = at.side;
    this.at = at;
    // In place the surface's `top` and `left` are counted from the box CSS positions it in (`positionedIn()`): the box
    // it is kept in, or a positioned box of a shadow tree it is slotted through (a Field's frame around a control).
    surface.style.top = `${at.top + (inline ? frame.shift.y : frame.y)}px`;
    surface.style.left = `${at.left + (inline ? frame.shift.x : frame.x)}px`;
    // POP-26: the side it grows from, and whether it covers its anchor (then from its middle): read by its appearance.
    surface.dataset.side = at.side;
    surface.toggleAttribute('data-held', at.held);
    // POP-10: the arrow on the edge that faces the anchor, and the elevation round the surface and the arrow together.
    if (at.arrow) {
      surface.style.setProperty('--_arrow-at', `${at.point}px`);
      const shade = this.readShade();
      if (shade !== this.shade) {
        this.shade = shade;
        this.layers = shadowLayers(shade);
        this.host.requestUpdate();
      }
      surface.dataset.arrow = this.layers.length ? 'shaded' : 'flat';
    } else delete surface.dataset.arrow;
    shadeOn(surface);
    this.options.placed?.(at);
    // POP-36: the keyboard came up over it: what has focus inside is scrolled into the room left.
    if (frame.cover > 0 && frame.cover !== this.cover) {
      const active = deepActive();
      if (active && active !== surface && this.host.contains(active)) (active as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    this.cover = frame.cover;
    this.lastLayout = this.layout();
    return true;
  }

  /**
   * POP-1, POP-26, POP-27: into the top layer — the newest in it, so above a dialog opened since — placed, and
   * appearing from the anchor's side: from where it had got to if it was still closing. Returns whether it is shown
   * (no surface, no anchor in the page: it is not). `instant`: whole at once, with no entrance — for a surface drawn
   * anew in another presentation while it is open (POP-42).
   */
  show(instant = false): boolean {
    const surface = this.options.surface();
    const motion = this.options.motion();
    if (!surface || !motion || !this.host.isConnected || !this.options.anchor()?.isConnected) return false;
    const inline = this.inline;
    const leaving = !this.shown && !inline && surface.matches(':popover-open');
    surface.inert = false;
    surface.classList.toggle('inline', inline);
    if (!inline) {
      // POP-27: still closing, it is put back where its exit has got to.
      if (surface.matches(':popover-open'))
        this.appear.keep(() => {
          surface.hidePopover();
          surface.showPopover();
        });
      else surface.showPopover();
    }
    this.shown = true;
    this.wasGone = false;
    this.arranged = Number.NaN;
    if (!leaving) this.side = null;
    if (!this.place()) {
      // Its anchor left the page as it opened.
      this.hide(false);
      return false;
    }
    this.following.start();
    // Placed, it starts from the side it was placed on (its style was read for its size before it had one); a
    // surface still closing goes on from where it is.
    if (!leaving) this.appear.drawAtOnce();
    surface.classList.add('open');
    // Drawn in place, or asked to be, it is whole at once.
    this.appear.enter(inline || instant);
    return true;
  }

  /**
   * POP-1, POP-26, POP-27: leaving the way it came, from the opacity and the size it has reached, then out of the top
   * layer — or at once (`fade` false). Closing, it already takes no pointer and no focus.
   */
  hide(fade = true) {
    const surface = this.options.surface();
    const motion = this.options.motion();
    this.following.stop();
    this.lastLayout = '';
    this.wasGone = false;
    if (!surface || !motion) {
      this.shown = false;
      return;
    }
    const finish = () => {
      if (this.shown) return;
      this.side = null;
      this.at = null;
      surface.classList.remove('inline', 'open');
      if (surface.hasAttribute('popover') && surface.matches(':popover-open')) surface.hidePopover();
      surface.inert = false;
    };
    if (!this.shown) {
      // Already closing: told to go at once, it goes.
      if (!fade) {
        void this.appear.exit(true);
        finish();
      }
      return;
    }
    this.shown = false;
    surface.inert = true;
    surface.classList.remove('open');
    if (!fade || surface.classList.contains('inline')) {
      void this.appear.exit(true);
      finish();
      return;
    }
    // Out of the top layer once its exit has played; told to open again before that, it stays.
    void this.appear.exit().then((left) => left && finish());
  }
}
