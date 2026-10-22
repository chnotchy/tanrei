import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AppearController,
  AvailabilityController,
  FollowController,
  SHORTCUT_UPDATE,
  type ShadowLayer,
  SystemWatchController,
  anchorGone,
  choiceAttribute as choiceConverter,
  chordsConverter,
  chordsOf,
  compChoice,
  crossOffsetAttribute as crossNumeric,
  findInteractive,
  numericAttribute as numeric,
  registerOverlay,
  report,
  shadeFilter,
  shadeOn,
  shadowLayers,
  styleQueries,
  swallowRelease,
  usableLength as usable,
} from '../../primitives/index.js';
// TIP-27: a plain tooltip draws its shortcut with the keyboard shortcut, which the tooltip defines wherever it is imported.
import '../keyboard-shortcut/keyboard-shortcut.js';
import type { TanreiKeyboardShortcut } from '../keyboard-shortcut/keyboard-shortcut.js';
import { ARROW_PROPERTY, CHOICE, INVERSE_PROPERTY, styles } from './tooltip.styles.js';
import { PLACEMENTS, type TanreiTooltipPlacement, type TooltipArrow, type TooltipSide, placeTooltip } from './tooltip-placement.js';
import { TanreiElement } from '../../primitives/element.js';

export { type TanreiTooltipPlacement, type TooltipArrow, type TooltipBox, type TooltipPlace, type TooltipSide, placeTooltip } from './tooltip-placement.js';

/** Plain: one short phrase, by default on the inverse surface. Rich: an optional title and a few sentences, by default on a raised surface. */
export type TanreiTooltipVariant = 'plain' | 'rich';
/** What `toggle` carries: the new value of `open`. */
export interface TanreiTooltipToggleDetail {
  open: boolean;
}

/** TIP-17: each prop, its attribute and the token it falls back to. */
const WAITS = [
  { prop: 'showDelay', attribute: 'show-delay', token: 'comp.tooltip.motion.show-delay' },
  { prop: 'hideDelay', attribute: 'hide-delay', token: 'comp.tooltip.motion.hide-delay' },
  { prop: 'touchTimeout', attribute: 'touch-timeout', token: 'comp.tooltip.timeout.touch' },
] as const;

/** TIP-27: the element that takes focus inside `element`: itself, or the native control a component draws in its shadow root. */
function focusableOf(element: Element): Element {
  for (let current = element; ; ) {
    const inner = [...(current.shadowRoot?.children ?? [])].map((child) => findInteractive(child)).find((found) => found !== null);
    if (!inner) return current;
    current = inner;
  }
}

/** TIP-8: the tooltip showing in this window, if any — at most one. */
let showing: TanreiTooltip | null = null;
/** TIP-28: the tooltip still fading out after the pointer or the focus left its anchor, if any. */
let fading: TanreiTooltip | null = null;
/** TIP-28: whether tooltips are warm in this window — one closed, a moment ago, because the pointer or the focus left its anchor. */
let warm = false;
let warmTimer: ReturnType<typeof setTimeout> | undefined;

/** TIP-28: the next tooltip of this window, for `duration` ms, appears at once and whole. */
function warmFor(duration: number) {
  clearTimeout(warmTimer);
  warm = duration > 0;
  if (warm) warmTimer = setTimeout(() => (warm = false), duration);
}

/**
 * Describes an element in a few words when a person points at it, focuses it with the keyboard or long-presses it,
 * without taking focus or blocking anything.
 *
 * Contract: specs/tooltip.spec.json. Wraps its anchor (the default slot). The drawn tooltip is a `popover="manual"`
 * element in the shadow root, in the top layer — above an open modal `<dialog>` — placed against the anchor by script:
 * on the side and with the alignment `placement` names, `offset` away and moved along the side by `crossOffset`, flipped
 * to the opposite side, shifted along it and, in a window smaller than itself, held inside it; it keeps the side it is on
 * while that side has room, follows the anchor while open and closes when nothing of the anchor can be seen. It is a
 * read overlay: it never takes focus and holds nothing focusable.
 *
 * It opens after a fine pointer rests on the anchor for the show delay (at once while tooltips are warm: another is open
 * or fading, or one closed a moment ago), at once on keyboard focus, and on a touch long-press; it stays while the pointer
 * is over the anchor, the gap between the anchor and the tooltip, or the tooltip, or the anchor has keyboard focus, and
 * closes on Escape, an activation of the anchor, a press on it, the hide delay after the pointer left, or the touch
 * timeout after the finger lifted. The show delay, hide delay and touch timeout are `showDelay`, `hideDelay` and
 * `touchTimeout` in milliseconds (0 is at once), or the tokens `motion.show-delay`, `motion.hide-delay` and
 * `timeout.touch` while unset. Opening and closing by itself fires `toggle`; setting `open` does not.
 *
 * It comes out of the anchor's side as every surface appears (`sys.motion.appear.*`: a fade and a growth from 0.96
 * under the default system), grown from the middle of the edge that faces the anchor, over `motion.enter-duration` and
 * `-easing`, and goes back the same way over `motion.exit-duration` and `-easing`; a motion that is interrupted turns
 * round from where it is, a warm tooltip appears whole at once, one mounted open before the page's first paint is there
 * without its motion, and where motion is reduced it cross-fades over `sys.motion.role.reduced`. Its place is never
 * animated.
 *
 * `arrow` draws a triangle that points at the anchor, one shape with the container; `inverse` draws it in the opposite
 * scheme's colors (true) or on a surface of the scheme (false). Left unset, each takes the system's choice:
 * `--tanrei-comp-tooltip-arrow-visible` (off in the default system) and its form's `-plain-container-inverse` (on) or
 * `-rich-container-inverse` (off). `shortcut` writes the keys of the anchor's command after a plain tooltip's text and
 * gives them to the anchor as `aria-keyshortcuts`.
 *
 * While `describes` is true (the default; the attribute `no-describe` turns it off) the text — after the title, for a
 * rich tooltip — is the anchor's `aria-description`, set on the first focusable element slotted in (a Tanrei component
 * forwards it from its host to its native element), whether or not the tooltip is open.
 *
 * Every visual value comes from `--tanrei-comp-tooltip-*` tokens.
 *
 * @tag tanrei-tooltip
 * @slot - The anchor: the element the tooltip describes.
 * @csspart container - The drawn tooltip: its color, corners, elevation and padding.
 * @csspart arrow - The triangle that points at the anchor, while one is drawn.
 * @csspart title - The heading of a rich tooltip.
 * @csspart supporting-text - The description.
 * @csspart shortcut - The `<tanrei-keyboard-shortcut>` that writes a plain tooltip's shortcut after its text.
 * @fires {CustomEvent<TanreiTooltipToggleDetail>} toggle - The tooltip opened or closed by itself (hover, focus, long-press, Escape, the touch timeout, another tooltip opening): `detail.open` (and the element's `open`) is the new value.
 */
export class TanreiTooltip extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'tooltip');
  static override styles = [styles, hiddenHost];

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    text: { type: String },
    headline: { type: String },
    shortcut: { converter: chordsConverter },
    placement: { type: String, reflect: true },
    offset: { converter: numeric },
    crossOffset: { attribute: 'cross-offset', converter: crossNumeric },
    arrow: { reflect: true, converter: choiceConverter },
    inverse: { reflect: true, converter: choiceConverter },
    describes: {
      type: Boolean,
      attribute: 'no-describe',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    open: { type: Boolean, reflect: true },
    showDelay: { attribute: 'show-delay', converter: numeric },
    hideDelay: { attribute: 'hide-delay', converter: numeric },
    touchTimeout: { attribute: 'touch-timeout', converter: numeric },
    layers: { state: true },
    confirming: { attribute: false },
  };

  /** Plain is one short phrase, by default on the inverse surface; rich an optional title and a few sentences, by default on a raised surface. */
  variant: TanreiTooltipVariant = 'plain';

  /** The description. Required. */
  text = '';

  /** A heading for a rich tooltip (the spec's `title`); a plain one ignores it. */
  headline = '';

  /**
   * The keyboard shortcut of the anchor's command, in the keyboard shortcut's key names: one chord per string, pressed
   * in order (`["mod+b"]`); the attribute holds the chords separated by spaces. A plain tooltip writes it after its text
   * for the keyboard the person uses and gives it to the anchor as `aria-keyshortcuts`; a rich one ignores it. It does
   * not make the keys work.
   */
  shortcut: string[] = [];

  /**
   * Where it prefers to stand: a side of the anchor (`top`, `bottom`, `start`, `end`), alone to centre it there or with
   * the edge it lines up with (`top-start`, `end-bottom`), or `auto` for the first side with room. It flips to the
   * opposite side when that one has no room, keeping the alignment.
   */
  placement: TanreiTooltipPlacement = 'top';

  /** The distance from the anchor's edge, in CSS pixels; 0 lets them touch. Null takes `offset`, the token. */
  offset: number | null = null;

  /**
   * How far it moves along the side it stands on, in CSS pixels: positive towards the end above or below the anchor,
   * towards the bottom beside it. It never moves the tooltip off the anchor's side. The attribute is `cross-offset`.
   */
  crossOffset = 0;

  /**
   * Whether it draws an arrow that points at the anchor. Null, the default, takes the system's choice
   * (`arrow.visible`, off in the default system). The attribute: absent is null, `arrow` is true, `arrow="false"` is false.
   */
  arrow: boolean | null = null;

  /**
   * Whether it is drawn inverse — in the opposite scheme's colors. False draws it on a surface of the scheme; null, the
   * default, takes its form's choice (`plain.container.inverse`, on in the default system, or `rich.container.inverse`,
   * off). The attribute: absent is null, `inverse` is true, `inverse="false"` is false. Colors and elevation only.
   */
  inverse: boolean | null = null;

  /** Whether the text is the anchor's accessible description. Set `no-describe` when the text repeats the anchor's name. */
  describes = true;

  /** Whether the tooltip is showing. It opens and closes itself and fires `toggle`; set it to show a tooltip on your own. */
  open = false;

  /**
   * A confirmation its host shows for a moment (a copy button's "Copied", CPY-18): opened and closed by `open` alone —
   * hover, focus, a long press, an activation and leaving the anchor neither open it nor close it — still closed by
   * Escape and by another tooltip that opens, and kept from assistive technology, because the host announces the same
   * words itself. Internal between Tanrei elements.
   * @internal
   */
  confirming = false;

  /**
   * How long, in ms, a fine pointer rests on the anchor before it opens; 0 opens it at once. Null takes
   * `motion.show-delay`. Hover alone: keyboard focus still opens it at once. Not scaled by the motion dial.
   */
  showDelay: number | null = null;

  /**
   * How long, in ms, it waits after the pointer has left the anchor, the gap and the tooltip; 0 closes it at once. Null
   * takes `motion.hide-delay`. It stays hoverable at 0, because the gap counts as hover.
   */
  hideDelay: number | null = null;

  /**
   * How long, in ms, a tooltip opened by a long-press stays after the finger lifts; 0 closes it as the finger lifts. Null
   * takes `timeout.touch`.
   */
  touchTimeout: number | null = null;

  private hovering = false;
  private keyboard = false;
  /** TIP-4, TIP-6: closed by Escape, an activation or a press on it: it stays closed until the pointer comes back or focus does. */
  private dismissed = false;
  /** TIP-28: it is closing because the pointer or the focus left its anchor, which keeps tooltips warm. */
  private left = false;
  /** TIP-28: it opened by itself while tooltips were warm, so it appears whole — noted as it opens, before the other one goes. */
  private tookOver = false;
  private showTimer: ReturnType<typeof setTimeout> | undefined;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private touchTimer: ReturnType<typeof setTimeout> | undefined;
  private touchShown = false;
  private shown = false;
  private lastLayout = '';
  /** TIP-9: the side it stands on, kept while that side has room; and the placement and direction it was taken for. */
  private side: TooltipSide | null = null;
  private placedFor = '';
  /** TIP-25: the elevation's layers, drawn round the container and its arrow as one shape; and what they were read from. */
  private layers: ShadowLayer[] = [];
  private shade = '';
  private systemWatch: SystemWatchController | undefined;
  /** The element this tooltip put `aria-description` on, and what it wrote. */
  private described: { element: Element; text: string } | null = null;
  /** TIP-27: the element this tooltip put `aria-keyshortcuts` on, and what it wrote. */
  private keyed: { element: Element; keys: string } | null = null;
  private unregister: (() => void) | null = null;
  /** TIP-15, TIP-28, TIP-29: its appearance — opened and closed, turned round, made at once (src/primitives/motion.ts). */
  private readonly appear = new AppearController(this, { motion: () => this.motion });

  constructor() {
    super();
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('click', this.onActivate);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('contextmenu', this.onContextMenu);
  }

  protected override createRenderRoot() {
    const root = super.createRenderRoot();
    // TIP-27: the keys it writes changed without it (the keyboard convention of an ancestor): the anchor's shortcut follows.
    root.addEventListener(SHORTCUT_UPDATE, () => this.sync());
    return root;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointermove', this.onPointerMove, true);
    this.unregister?.();
    this.unregister = null;
    this.hovering = false;
    this.left = false;
    this.clearTimers();
    this.stopFollowing();
    if (showing === this) showing = null;
    if (fading === this) fading = null;
    this.shown = false;
    this.side = null;
    this.surface?.classList.remove('open');
    this.describe(null);
    this.key(null, null);
  }

  override connectedCallback() {
    super.connectedCallback();
    // POP-24: what it describes is what opened it; a popover that closes takes the tooltips of its controls with it, at
    // once — each closing by itself, as when another tooltip opens (src/primitives/dismiss.ts).
    this.unregister = registerOverlay(this, { openers: () => [this.anchor], open: () => this.open, close: () => this.giveWay() });
    if (this.hasUpdated) this.sync();
  }

  /** The placed box: the popover in the top layer. It is never transformed, so its box is the tooltip's at rest (TIP-15). */
  private get surface(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.surface') ?? null;
  }

  /** TIP-15: what fades, grows and travels: the container and its arrow, inside the placed box. */
  private get motion(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.motion') ?? null;
  }

  /** The anchor: the first element slotted in. */
  private get anchor(): Element | null {
    const slot = this.renderRoot?.querySelector('slot');
    return slot?.assignedElements({ flatten: true })[0] ?? null;
  }

  private get hasText(): boolean {
    return this.text.trim() !== '';
  }

  /** TIP-27: the chords a plain tooltip draws; a rich one draws none. */
  private get keys(): string[] {
    return this.variant === 'rich' ? [] : chordsOf(this.shortcut).filter((chord) => chord.trim() !== '');
  }

  /**
   * @internal Whether it is drawn inverse right now (TIP-26): `inverse` when it is true or false, else its form's choice
   * as the cascade gives it at this moment — never cached, and an unknown name is the first value (off).
   */
  get drawnInverse(): boolean {
    return compChoice(this, INVERSE_PROPERTY, CHOICE) === 'on';
  }

  /** TIP-25: whether an arrow is asked for right now: `arrow` when it is true or false, else the system's choice. */
  private get wantsArrow(): boolean {
    return compChoice(this, ARROW_PROPERTY, CHOICE) === 'on';
  }

  /** TIP-1, TIP-3, TIP-28: the show and hide delays, the touch timeout and the warm time, in ms, as the tokens resolve now. */
  private tokenTiming() {
    const probe = this.renderRoot?.querySelector('.timing');
    if (!probe) return { show: 0, hide: 0, touch: 0, warm: 0 };
    const style = getComputedStyle(probe);
    const ms = (value: string) => (Number.parseFloat(value) || 0) * 1000;
    return { show: ms(style.transitionDelay), hide: ms(style.transitionDuration), touch: ms(style.animationDuration), warm: ms(style.animationDelay) };
  }

  /**
   * TIP-17, TIP-18: the waits, in ms, read as each one starts (a change mid-wait applies the next time): a usable prop as
   * given, the token otherwise.
   */
  private timing() {
    const tokens = this.tokenTiming();
    return {
      show: usable(this.showDelay) ? this.showDelay : tokens.show,
      hide: usable(this.hideDelay) ? this.hideDelay : tokens.hide,
      touch: usable(this.touchTimeout) ? this.touchTimeout : tokens.touch,
    };
  }

  private clearTimers() {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    clearTimeout(this.touchTimer);
  }

  /** TIP-7: opens or closes by itself, and says so. */
  private setBySelf(open: boolean) {
    if (open && (!this.hasText || this.confirming)) return;
    if (this.open === open) return;
    if (open) this.tookOver = this.takesOver;
    // TIP-8: the other tooltip closes first, at once.
    if (open && showing && showing !== this) showing.giveWay();
    this.open = open;
    this.dispatchEvent(new CustomEvent<TanreiTooltipToggleDetail>('toggle', { detail: { open } }));
  }

  /** TIP-28: closes because the pointer or the keyboard focus left the anchor: the next tooltip finds this window warm. */
  private leave() {
    if (!this.open || this.confirming) return;
    this.left = true;
    this.setBySelf(false);
  }

  /** @internal TIP-8, TIP-28: another tooltip opened; this one disappears at once, without its motion. */
  giveWay() {
    this.clearTimers();
    this.left = false;
    this.setBySelf(false);
    this.hide(false);
  }

  /**
   * TIP-8, TIP-28: whether this tooltip takes over from another — one is open, one is still fading out after its anchor
   * was left, or one closed that way within the warm time. It then waits for no show delay and makes no motion.
   */
  private get takesOver(): boolean {
    return (showing !== null && showing !== this) || (fading !== null && fading !== this) || warm;
  }

  // ── Pointer (TIP-1, TIP-5, TIP-6) ─────────────────────────────────────────────────────────────────────────────────

  private readonly onPointerEnter = (event: PointerEvent) => {
    // A second enter without a leave (a browser re-sending boundary events) is the same hover (TIP-6).
    if (event.pointerType === 'touch' || this.hovering) return;
    this.hovering = true;
    this.dismissed = false;
    document.addEventListener('pointermove', this.onPointerMove, true);
    clearTimeout(this.hideTimer);
    if (this.open) return;
    // TIP-8, TIP-28: a person already reading tooltips gets this one at once.
    if (this.takesOver) {
      this.setBySelf(true);
      return;
    }
    clearTimeout(this.showTimer);
    const { show } = this.timing();
    if (show === 0) {
      this.setBySelf(true);
      return;
    }
    this.showTimer = setTimeout(() => {
      if (this.hovering && !this.dismissed) this.setBySelf(true);
    }, show);
  };

  /**
   * TIP-1: whether a point (viewport coordinates) is in the gap between the anchor and the shown container — as deep as
   * the space between them (the offset, and the arrow's height while one is drawn), as wide as the container along that
   * side. Measured, not drawn, so it takes no press. A tooltip that is closed or leaving has none (TIP-29).
   */
  private inGap(x: number, y: number): boolean {
    const surface = this.surface;
    if (!surface || !this.shown) return false;
    const a = (this.anchor ?? this).getBoundingClientRect();
    const s = surface.getBoundingClientRect();
    const across = (from: number, to: number, at: number) => at >= from && at <= to;
    switch (surface.dataset.side) {
      case 'top':
        return across(s.left, s.right, x) && across(s.bottom, a.top, y);
      case 'bottom':
        return across(s.left, s.right, x) && across(a.bottom, s.top, y);
      case 'left':
        return across(s.top, s.bottom, y) && across(s.right, a.left, x);
      case 'right':
        return across(s.top, s.bottom, y) && across(a.right, s.left, x);
      default:
        return false;
    }
  }

  /**
   * The pointer moved somewhere that is not the anchor, the gap or the tooltip: it left, even if the browser sent no
   * pointerleave.
   */
  private readonly onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && !event.composedPath().includes(this)) this.onPointerLeave(event);
  };

  private readonly onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    // TIP-1: in the gap it is still hovering; the pointer-move listener stays to see it leave the gap.
    if (this.hovering && this.inGap(event.clientX, event.clientY)) return;
    document.removeEventListener('pointermove', this.onPointerMove, true);
    if (!this.hovering) return;
    this.hovering = false;
    clearTimeout(this.showTimer);
    if (!this.open || this.keyboard || this.touchShown) return;
    clearTimeout(this.hideTimer);
    const { hide } = this.timing();
    if (hide === 0) {
      this.leave();
      return;
    }
    this.hideTimer = setTimeout(() => {
      if (!this.hovering && !this.keyboard) this.leave();
    }, hide);
  };

  /** TIP-6: an activation of the anchor closes the tooltip, which stays closed until the pointer comes back. */
  private readonly onActivate = (event: MouseEvent) => {
    if (this.confirming || (this.surface && event.composedPath().includes(this.surface))) return;
    this.dismiss();
  };

  /** TIP-4, TIP-6, TIP-13: closed on purpose. TIP-28: the person is done with tooltips, so the next one waits and moves as a first one does. */
  private dismiss() {
    this.dismissed = true;
    this.clearTimers();
    if (this.open) warmFor(0);
    this.setBySelf(false);
  }

  // ── Keyboard (TIP-2, TIP-4) ───────────────────────────────────────────────────────────────────────────────────────

  private readonly onFocusIn = (event: FocusEvent) => {
    const target = event.composedPath()[0];
    if (!(target instanceof Element) || !target.matches(':focus-visible')) return;
    this.keyboard = true;
    this.dismissed = false;
    this.clearTimers();
    this.setBySelf(true);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    const to = event.relatedTarget as Node | null;
    if (to && (this.contains(to) || this.renderRoot.contains(to))) return;
    this.keyboard = false;
    if (!this.hovering && !this.touchShown) {
      clearTimeout(this.showTimer);
      this.leave();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !this.confirming) this.dismiss();
  };

  /** TIP-4: Escape closes an open tooltip without moving focus, and goes no further (an enclosing dialog stays open). */
  private readonly onEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.open) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.dismiss();
  };

  // ── Touch (TIP-3) ─────────────────────────────────────────────────────────────────────────────────────────────────

  /** A touch long-press is the platform's `contextmenu`: the tooltip opens instead of a menu, and the anchor is not activated. */
  private readonly onContextMenu = (event: MouseEvent) => {
    if ((event as PointerEvent).pointerType !== 'touch' || !this.hasText || this.confirming) return;
    event.preventDefault();
    this.clearTimers();
    this.dismissed = false;
    this.touchShown = true;
    this.setBySelf(true);
    document.addEventListener('pointerup', this.onTouchEnd, true);
    document.addEventListener('pointercancel', this.onTouchEnd, true);
  };

  /** The finger lifted: it stays for the touch timeout (TIP-17: 0 closes it now, having shown for the whole press). */
  private readonly onTouchEnd = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    document.removeEventListener('pointerup', this.onTouchEnd, true);
    document.removeEventListener('pointercancel', this.onTouchEnd, true);
    clearTimeout(this.touchTimer);
    const close = () => {
      this.touchShown = false;
      if (!this.keyboard && !this.hovering) this.setBySelf(false);
    };
    const { touch } = this.timing();
    if (touch === 0) close();
    else this.touchTimer = setTimeout(close, touch);
  };

  /** TIP-3, TIP-13: a touch anywhere else closes it sooner; a press on the tooltip closes it and goes no further. */
  private readonly onDocumentPress = (event: PointerEvent) => {
    const path = event.composedPath();
    if (this.surface && path.includes(this.surface)) {
      event.preventDefault();
      event.stopPropagation();
      this.touchShown = false;
      // TIP-13, TIP-29: a leaving tooltip takes no pointer, so the rest of this press would end on what lies under it.
      swallowRelease();
      this.dismiss();
      return;
    }
    if (event.pointerType === 'touch' && this.touchShown && !path.includes(this)) {
      this.touchShown = false;
      this.dismiss();
    }
  };


  /** TIP-13: nothing of a press on the tooltip reaches what lies under it, nor the tooltip's ancestors. */
  private readonly swallow = (event: Event) => {
    event.stopPropagation();
    if (event.type === 'click' || event.type === 'mousedown') event.preventDefault();
  };

  // ── Presentation (TIP-9, TIP-13, TIP-15, TIP-22 to TIP-29) ────────────────────────────────────────────────────────

  /** TIP-9: places the container against the anchor, in viewport coordinates; closes when the anchor has gone. */
  private place() {
    const surface = this.surface;
    const motion = this.motion;
    const container = this.renderRoot?.querySelector<HTMLElement>('.bubble');
    if (!surface || !motion || !container || !this.shown) return;
    const element = this.anchor ?? this;
    const anchor = element.getBoundingClientRect();
    const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    // Removed, hidden (display: none, visibility: hidden, a closed <details>) or out of sight (src/primitives/placement.ts).
    const gone = !this.isConnected || anchorGone(element, anchor, viewport);
    if (gone) {
      this.clearTimers();
      this.setBySelf(false);
      return;
    }
    const style = getComputedStyle(surface);
    const px = (value: string) => Number.parseFloat(value) || 0;
    const margin = px(style.scrollMarginBlockEnd);
    // Its drawn size, not `offsetWidth` / `offsetHeight`: those are rounded to whole pixels, which puts the centre up to
    // half a pixel off the anchor's (the surface is never transformed, so this is its layout box, whatever its motion).
    const drawn = surface.getBoundingClientRect();
    const size = { width: drawn.width, height: drawn.height };
    const rtl = getComputedStyle(this).direction === 'rtl';
    const placement = PLACEMENTS.includes(this.placement) ? this.placement : 'top';
    // TIP-19, TIP-22: another placement or direction is another place, taken at once: the side it was on says nothing.
    if (this.placedFor !== `${placement} ${rtl}`) this.side = null;
    this.placedFor = `${placement} ${rtl}`;
    const arrow: TooltipArrow = {
      width: px(style.scrollMarginInlineStart),
      height: px(style.scrollMarginInlineEnd),
      inset: px(style.scrollPaddingBlockStart),
      radius: Math.min(px(getComputedStyle(container).borderTopLeftRadius), size.width / 2, size.height / 2),
      drawn: this.wantsArrow,
    };
    const at = placeTooltip({
      anchor,
      surface: size,
      viewport,
      placement,
      // TIP-24: the prop as given, or the token.
      offset: usable(this.offset) ? this.offset : px(style.scrollMarginBlockStart),
      crossOffset: this.crossOffset,
      margin,
      rtl,
      arrow,
      keep: this.side,
    });
    this.side = at.side;
    surface.style.top = `${at.top}px`;
    surface.style.left = `${at.left}px`;
    // TIP-15: the side it grows from, and whether it covers its anchor (then from its middle): read by its appearance.
    surface.dataset.side = at.side;
    surface.toggleAttribute('data-held', at.held);
    // TIP-25: the arrow on the edge that faces the anchor, and the elevation round the container and the arrow together.
    if (at.arrow) {
      surface.style.setProperty('--_arrow-at', `${at.point}px`);
      const shade = getComputedStyle(this.renderRoot.querySelector('.shade')!).boxShadow;
      if (shade !== this.shade) {
        this.shade = shade;
        this.layers = shadowLayers(shade);
      }
      surface.dataset.arrow = this.layers.length ? 'shaded' : 'flat';
    } else delete surface.dataset.arrow;
    // On the placed box: what moves inside it keeps `filter` for the appearance's blur.
    shadeOn(surface);
  }

  /** What a frame can change besides the boxes: the direction, whether an arrow is asked for, and the look. */
  private get drawnAs(): string {
    const style = getComputedStyle(this);
    // TIP-25: and the elevation the filter round an arrow was made from (a theme switched while it shows).
    const shade = this.surface?.dataset.arrow ? getComputedStyle(this.renderRoot.querySelector('.shade')!).boxShadow : '';
    return `${style.direction},${style.getPropertyValue(ARROW_PROPERTY).trim()},${style.getPropertyValue(INVERSE_PROPERTY).trim()},${shade}`;
  }

  /**
   * TIP-9: follows the anchor while it moves (scrolling, layout, the viewport) for as long as it is shown — asked by
   * FollowController when something can have moved, frame by frame only while something does.
   */
  private readonly follow = (): boolean => {
    const box = (this.anchor ?? this).getBoundingClientRect();
    const surface = this.surface;
    // The surface's own size too, unrounded: its text reflowing (a web font arriving after it opened) moves the centre.
    const size = surface?.getBoundingClientRect();
    // TIP-19: the layout direction too — `start` and `end` are sides of it (TIP-20), so a change of it places the container again.
    const layout = `${box.x},${box.y},${box.width},${box.height},${document.documentElement.clientWidth},${document.documentElement.clientHeight},${size?.width},${size?.height},${this.drawnAs}`;
    if (layout === this.lastLayout) return false;
    this.lastLayout = layout;
    this.place();
    return true;
  };

  private readonly following = new FollowController(this, {
    followed: () => [this.anchor ?? this],
    sized: () => [this.surface],
    check: this.follow,
  });

  private stopFollowing() {
    this.following.stop();
    this.lastLayout = '';
    document.removeEventListener('pointerdown', this.onDocumentPress, true);
    window.removeEventListener('keydown', this.onEscape, true);
    document.removeEventListener('pointerup', this.onTouchEnd, true);
    document.removeEventListener('pointercancel', this.onTouchEnd, true);
  }

  /**
   * Into the top layer (above an open dialog, which is there already), placed, and coming out of the anchor's side
   * (TIP-15) — from where it had got to if it was still leaving (TIP-29), or whole at once if it takes over from another
   * tooltip (TIP-28).
   */
  private show() {
    const surface = this.surface;
    const motion = this.motion;
    if (!surface || !motion || !this.isConnected) return;
    const leaving = !this.shown && surface.matches(':popover-open');
    const whole = !leaving && (this.tookOver || this.takesOver);
    this.tookOver = false;
    // TIP-8, TIP-28: at most one tooltip in a window, and the one before disappears at once.
    if (showing && showing !== this) showing.giveWay();
    if (fading && fading !== this) fading.hide(false);
    if (fading === this) fading = null;
    showing = this;
    // Shown again even when still open, so it is the newest in the top layer: above a dialog opened since — and, still
    // leaving, put back where its exit has got to (TIP-29).
    if (surface.matches(':popover-open'))
      this.appear.keep(() => {
        surface.hidePopover();
        surface.showPopover();
      });
    else surface.showPopover();
    this.shown = true;
    if (!leaving) this.side = null;
    this.place();
    if (!this.open) return; // its anchor is out of sight: it closes again, never having been drawn
    this.following.start();
    document.addEventListener('pointerdown', this.onDocumentPress, true);
    window.addEventListener('keydown', this.onEscape, true);
    // Placed, it starts from the side it was placed on (its style was read for its size before it had one); a tooltip
    // still leaving goes on from where it is; one that takes over is whole at once (TIP-28).
    if (!leaving) this.appear.drawAtOnce();
    surface.classList.add('open');
    this.appear.enter(whole);
  }

  /**
   * Going back the way it came (TIP-15) — from where it had got to if it was still entering (TIP-29) — or at once, then
   * out of the top layer. Leaving, it is already closed for the pointer (TIP-29).
   */
  private hide(fade = true) {
    const surface = this.surface;
    const motion = this.motion;
    const left = this.left;
    this.left = false;
    this.stopFollowing();
    if (showing === this) showing = null;
    if (!surface || !motion) return;
    const finish = () => {
      if (this.shown) return;
      if (fading === this) fading = null;
      this.side = null;
      if (surface.matches(':popover-open')) surface.hidePopover();
    };
    if (!this.shown) {
      // Already leaving: told to go at once, it goes (TIP-28).
      if (!fade) {
        void this.appear.exit(true);
        finish();
      }
      return;
    }
    this.shown = false;
    if (!fade) {
      surface.classList.remove('open');
      void this.appear.exit(true);
      finish();
      return;
    }
    // TIP-28: tooltips stay warm from now, for the warm time.
    if (left) {
      warmFor(this.tokenTiming().warm);
      fading = this;
    }
    surface.classList.remove('open');
    // Out of the top layer once its exit has played; told to open again before that, it stays.
    void this.appear.exit().then((gone) => gone && finish());
  }

  /** TIP-14: the text (after the title, for a rich tooltip) as the anchor's description, or nothing. */
  private describe(text: string | null) {
    const target = text ? this.describedElement() : null;
    const now = this.described;
    if (now && (now.element !== target || now.text !== text)) {
      if (now.element.getAttribute('aria-description') === now.text) now.element.removeAttribute('aria-description');
      this.described = null;
    }
    if (target && text && !this.described) {
      target.setAttribute('aria-description', text);
      this.described = { element: target, text };
    }
  }

  /** TIP-27: the shortcut as `aria-keyshortcuts` on the anchor's focusable element, or nothing. What it wrote, it takes back. */
  private key(target: Element | null, keys: string | null) {
    const now = this.keyed;
    if (now && (now.element !== target || now.keys !== keys)) {
      if (now.element.getAttribute('aria-keyshortcuts') === now.keys) now.element.removeAttribute('aria-keyshortcuts');
      this.keyed = null;
    }
    if (target && keys && !this.keyed) {
      target.setAttribute('aria-keyshortcuts', keys);
      this.keyed = { element: target, keys };
    }
  }

  /** The anchor's focusable element: the first slotted element that is (or holds, or draws in its shadow root) one. */
  private describedElement(): Element | null {
    const slot = this.renderRoot?.querySelector('slot');
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    for (const element of assigned) {
      const found = findInteractive(element);
      if (found) return found;
    }
    return assigned[0] ?? null;
  }

  private description(): string {
    const title = this.variant === 'rich' ? this.headline.trim() : '';
    return [title, this.text.trim()].filter(Boolean).join(', ');
  }

  /**
   * TIP-14, TIP-27: what the anchor carries for assistive technology. The shortcut is its `aria-keyshortcuts`, on the
   * element that takes focus; where the anchor states one itself, the text KBS-10 gives — the label, else that notation — ends its description
   * instead.
   */
  private sync() {
    const drawn = this.hasText ? this.renderRoot?.querySelector<TanreiKeyboardShortcut>('tanrei-keyboard-shortcut') : null;
    const keys = drawn?.ariaKeyShortcuts ?? null;
    const element = keys ? this.describedElement() : null;
    const target = element ? focusableOf(element) : null;
    const ours = (each: Element) => this.keyed?.element === each && each.getAttribute('aria-keyshortcuts') === this.keyed.keys;
    const stated = [element, target].some((each) => !!each && each.hasAttribute('aria-keyshortcuts') && !ours(each));
    this.key(stated ? null : target, stated ? null : keys);
    const spoken = stated && drawn ? drawn.spokenKeys : '';
    this.describe(this.describes && this.hasText ? [this.description(), spoken].filter(Boolean).join(', ') : null);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // TIP-16: without text it never opens.
    if (changed.has('open') && this.open && !this.hasText) this.open = false;
  }

  protected override updated(changed: PropertyValues<this>) {
    this.sync();
    if (changed.has('text') && !this.hasText) report(this, 'TIP-16', 'text is empty, so the tooltip never opens and describes nothing; give it text');
    if ((changed.has('headline') || changed.has('variant')) && this.variant !== 'rich' && this.headline.trim()) {
      report(this, 'TIP-16', `a plain tooltip ignores its headline "${this.headline}"; use variant="rich" to draw it`);
    }
    for (const { prop, attribute, token } of WAITS) {
      const value: unknown = this[prop];
      if (!changed.has(prop) || value === null || value === undefined || usable(value)) continue;
      const why = typeof value === 'number' && Number.isFinite(value) ? 'is negative' : 'is not a finite number';
      report(this, 'TIP-17', `${attribute} ${JSON.stringify(String(value))} ${why}; ${token} is used in its place`);
    }
    if (changed.has('placement') && !PLACEMENTS.includes(this.placement)) {
      report(this, 'TIP-22', `placement "${String(this.placement)}" is not one of ${PLACEMENTS.join(', ')}; the tooltip is placed as "top"`);
    }
    const offset: unknown = this.offset;
    if (changed.has('offset') && offset !== null && offset !== undefined && !usable(offset)) {
      const why = typeof offset === 'number' && Number.isFinite(offset) ? 'is negative' : 'is not a finite number';
      report(this, 'TIP-24', `offset ${JSON.stringify(String(offset))} ${why}; comp.tooltip.offset is used in its place`);
    }
    const cross: unknown = this.crossOffset;
    if (changed.has('crossOffset') && cross !== null && cross !== undefined && !Number.isFinite(cross)) {
      report(this, 'TIP-24', `cross-offset ${JSON.stringify(String(cross))} is not a finite number; 0 is used in its place`);
    }
    if ((changed.has('shortcut') || changed.has('variant')) && this.variant === 'rich' && chordsOf(this.shortcut).length) {
      report(this, 'TIP-27', `a rich tooltip ignores its shortcut "${chordsOf(this.shortcut).join(' ')}"; a plain tooltip draws it`);
    }
    // TIP-26: where a browser has no style queries, the look the cascade names now is written for the same rules.
    const surface = this.surface;
    if (surface && !styleQueries()) {
      surface.dataset.inverse = this.drawnInverse ? 'on' : 'off';
      // A style query follows a system switched on the root by itself; here the choice is read again when it is.
      this.systemWatch ??= new SystemWatchController(this);
    }
    if (changed.has('open')) {
      if (this.open) this.show();
      else {
        this.touchShown = false;
        this.hide();
      }
    } else if (this.open && this.shown) this.place();
  }

  protected override render() {
    const rich = this.variant === 'rich';
    const title = rich && this.headline.trim() ? this.headline : '';
    const keys = this.keys;
    // TIP-13, TIP-14: role tooltip; hidden from assistive technology while the anchor carries its text as a description.
    // TIP-15: the popover is the placed box; what moves is the wrapper inside it, which holds the container and its arrow.
    return html`
      <slot @slotchange=${() => this.sync()}></slot>
      <div
        class="surface"
        popover="manual"
        role="tooltip"
        aria-hidden=${(this.describes && this.hasText) || this.confirming ? 'true' : nothing}
        @pointerenter=${() => clearTimeout(this.hideTimer)}
        @click=${this.swallow}
        @mousedown=${this.swallow}
        @pointerup=${this.swallow}
      >
        <div class="motion" data-tanrei-appear>
          <span part="arrow" class="arrow" aria-hidden="true"></span>
          <div part="container" class=${keys.length ? 'bubble keyed' : 'bubble'} data-tanrei-shape>
            ${title ? html`<span part="title" class="title">${title}</span>` : nothing}
            <span part="supporting-text" class="text">${this.text}</span>
            ${keys.length
              ? html`<tanrei-keyboard-shortcut part="shortcut" class="shortcut" .keys=${keys} .hosted=${true} size="small" variant="plain"></tanrei-keyboard-shortcut>`
              : nothing}
          </div>
        </div>
        <span class="shade" aria-hidden="true"></span>
        ${shadeFilter(this.layers)}
      </div>
      <span class="timing" aria-hidden="true"></span>
    `;
  }
}

if (!customElements.get('tanrei-tooltip')) customElements.define('tanrei-tooltip', TanreiTooltip);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tooltip': TanreiTooltip;
  }
}
