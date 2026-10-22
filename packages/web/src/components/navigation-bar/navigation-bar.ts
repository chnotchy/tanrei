import { type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import {
  AvailabilityController,
  DestinationsController,
  GlyphMirrorController,
  IndicatorDragController,
  type IndicatorPlace,
  NavigationDestination,
  type TanreiLabelVisibility,
  hostAria,
  indicatorChoice,
  indicatorPlace,
  layoutScale,
} from '../../primitives/index.js';
import { ownDirection } from '../../styles/product-text.js';
import { TanreiBadge } from '../badge/badge.js';
import { barStyles, itemStyles } from './navigation-bar.styles.js';
import { TanreiElement } from '../../primitives/element.js';

export type { TanreiLabelVisibility, TanreiNavigationChangeDetail } from '../../primitives/index.js';

/** How the active indicator is filled: a soft container (tonal), or the strong color with the content inverted on it. */
export type TanreiNavigationBarVariant = 'tonal' | 'filled';

/** A box on the page, in viewport coordinates. */
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Where the active indicator is drawn while it moves, over one destination (NVB-23). */
interface Cover {
  box: Box;
  opacity: number;
  /** The destination drawn selected: its own item container's fill is not drawn while the bar's layer is the indicator. */
  fill: boolean;
  /** The indicator's corner, in px. */
  radius: number;
  /**
   * How much larger the bar is drawn than laid out (`layoutScale`): `box` is measured on the page, and a clip is
   * written in the destination's own pixels.
   */
  scale: Scale;
}

type Scale = { x: number; y: number };

/** The item container's corners, for a clip drawn to its shape. */
const RADIUS = 'calc(var(--tanrei-corner-radius) * var(--_corner-scale))';

/** A length in px, to a hundredth (never in exponent notation). */
const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const num = (value: number) => Math.round(value * 100) / 100;
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const between = (a: Box, b: Box, p: number): Box => ({ left: lerp(a.left, b.left, p), top: lerp(a.top, b.top, p), right: lerp(a.right, b.right, p), bottom: lerp(a.bottom, b.bottom, p) });

/**
 * A clip of `element` to `box`, with the item container's corners (negative insets reach outside the element). Both are
 * read on the page and the clip is in the element's own pixels: under a scaled ancestor the two differ by `scale`.
 */
function clipTo(element: Element, box: Box, scale: Scale): string {
  const own = element.getBoundingClientRect();
  return `inset(${px((box.top - own.top) / scale.y)} ${px((own.right - box.right) / scale.x)} ${px((own.bottom - box.bottom) / scale.y)} ${px((box.left - own.left) / scale.x)} round ${RADIUS})`;
}

/**
 * A clip of `element` to everything but `box` (rounded by `radius`), or nothing where the box does not meet it: the
 * plain copy is cut away exactly where the covered copy is drawn, so nothing is painted twice (NVB-23).
 */
function cutOut(element: Element, box: Box, radius: number, scale: Scale): string {
  const own = element.getBoundingClientRect();
  const [x, y, w, h] = [(box.left - own.left) / scale.x, (box.top - own.top) / scale.y, (box.right - box.left) / scale.x, (box.bottom - box.top) / scale.y];
  if (!(w > 0 && h > 0 && x < own.width / scale.x && x + w > 0 && y < own.height / scale.y && y + h > 0)) return '';
  // As the browser clamps a radius: at most half of either side.
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return `path(evenodd, "M-99999 -99999H99999V99999H-99999Z M${num(x + r)} ${num(y)}H${num(x + w - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w)} ${num(y + r)}V${num(y + h - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w - r)} ${num(y + h)}H${num(x + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x)} ${num(y + h - r)}V${num(y + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + r)} ${num(y)}Z")`;
}

/**
 * One destination of a navigation bar — the spec's item kind `destination`: an icon, a label under it and an
 * optional badge on the icon, inside the item container. Placed as a child of `<tanrei-navigation-bar>`, in order; the
 * bar decides whether it is the selected one and answers its activation.
 *
 * It is a button, or with `href` a link (NVB-30): an `<a href>` in the shadow root, drawn exactly as the button
 * is, whose context menu, new-tab gestures and address are the browser's own — except that it is not dragged as a link,
 * because a sideways drag moves the active indicator. A link is not selected by a press (NVB-31): a plain activation
 * makes the bar fire `change` (or `reselect`) — cancelable, with `detail.href`, before the browser follows the link —
 * and the page shown next sets the bar's `value`; a modified or a middle click, a link whose `target` is `new` and a
 * download fire nothing. Without a `value` a link's `href` is its value. `target="new"` opens a new tab, safely
 * (`noopener`), and draws no mark — a cell has no place for one — so `targetLabel` says it (NVB-32). Space does not
 * activate a link.
 *
 * It is named by its label whether or not the label is drawn, the selected one `aria-current="page"`, its badge's
 * text and then, for a link that opens a new context, `targetLabel` its description; its host is a list item of the
 * bar's list. Its icon and label are drawn twice: the second copy, in the covered colors and clipped to the active
 * indicator, is hidden from assistive technology (NVB-23).
 *
 * Its properties are the shared destination's (`src/primitives/destination.ts`): `value`, `label`, `icon`, `disabled`,
 * `badge`, `badgeCount` (`badge-count`), `badgeLabel` (`badge-label`), `href`, `target`, `targetLabel`
 * (`target-label`) and the web-only `rel` and `download`.
 *
 * @tag tanrei-navigation-bar-item
 * @csspart cell - The whole cell: the native button or link, the hit area.
 * @csspart container - The item container: the destination's whole share of the bar, held in from the bar's edges by `comp.navigation-bar.container.padding` — the same box for every destination. The state layer's box, the focus ring's and the ripple's.
 * @csspart active-indicator - The fill of the item container (the active indicator while selected).
 * @csspart icon-indicator - The box behind the icon alone (transparent in the default system).
 * @csspart icon - The glyph (hidden from assistive technology).
 * @csspart label - The label (hidden from assistive technology: the cell is named by it).
 * @csspart covered-content - The copy of the icon and label in the covered colors, clipped to the active indicator (hidden from assistive technology).
 */
export class TanreiNavigationBarItem extends NavigationDestination {
  static override styles = itemStyles;

  /**
   * NVB-25: the destination's glyph, in both of its copies (NVB-23), is marked when the icon set mirrors its name in
   * right-to-left (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark.
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon, .c-icon' });

  /** @internal The item container, which the bar measures to move its active indicator (NVB-15, NVB-27). */
  get itemContainer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  /**
   * @internal NVB-23: clips the covered copy to where the bar draws the active indicator while it moves, cuts the plain
   * copy away there — and, on the destination whose colors the indicator has, leaves the item container's own fill
   * undrawn, so that the indicator is painted once. `null` gives all of them back to the styles: at rest the
   * selected destination draws its covered copy whole and every other destination none of it.
   */
  setCover(cover: Cover | null) {
    const root = this.renderRoot;
    const covered = root?.querySelector<HTMLElement>('.covered');
    const fill = root?.querySelector<HTMLElement>('.indicator');
    if (!covered || !fill) return;
    const plain = [...root.querySelectorAll<HTMLElement>('.plain, .label-box')];
    // While the indicator moves the plain copy is drawn wherever it is not covered; at rest the selected one is wholly covered.
    this.itemContainer?.toggleAttribute('data-moving', !!cover);
    if (!cover) {
      for (const each of [covered, ...plain]) each.style.removeProperty('clip-path');
      covered.style.removeProperty('opacity');
      fill.style.removeProperty('visibility');
      return;
    }
    // Everything is read before anything is written.
    const clip = clipTo(covered, cover.box, cover.scale);
    // A fading indicator (NVB-15: appearing or disappearing in place) cross-fades the two copies instead.
    const cuts = plain.map((each) => (cover.opacity >= 1 ? cutOut(each, cover.box, cover.radius, cover.scale) : ''));
    covered.style.clipPath = clip;
    covered.style.opacity = String(cover.opacity);
    // The bar's layer is the indicator while it moves: the selected destination's own fill would be a second one.
    if (cover.fill) fill.style.visibility = 'hidden';
    else fill.style.removeProperty('visibility');
    plain.forEach((each, index) => {
      if (cuts[index]) each.style.clipPath = cuts[index];
      else each.style.removeProperty('clip-path');
    });
  }

  /** NVB-15: the new icon indicator grows in width from its centre; the item container is the bar's to move. */
  protected override growIndicator() {
    super.growIndicator('.icon-fill');
  }

  /** The glyph, inside the badge when there is one (NVB-16): the badge is drawn above it. */
  private badged(glyph: TemplateResult, covered = false) {
    if (!this.badge) return glyph;
    return html`<tanrei-badge class=${covered ? 'covered-badge' : nothing} .count=${this.badgeCount ?? null} label=${this.badgeLabel}>${glyph}</tanrei-badge>`;
  }

  /**
   * NVB-12, NVB-23: the item container around the column — the icon indicator with the icon in it, the label under it —
   * and the same column again in the covered colors. Each copy has its own badge, so the badge is above both.
   */
  protected override content() {
    return html`
      <span part="container" class="container" data-tanrei-shape>
        <span part="active-indicator" class="indicator" aria-hidden="true"></span>
        <span class="content">
          <span part="icon-indicator" class="icon-indicator" data-tanrei-shape>
            <span class="icon-fill" aria-hidden="true"></span>
            <span class="plain">${this.badged(html`<span part="icon" class="icon" aria-hidden="true">${this.icon}</span>`)}</span>
          </span>
          <span class="label-box" aria-hidden="true"><span part="label" class="label" dir=${ownDirection(this.label)}>${this.label}</span></span>
        </span>
        <span part="covered-content" class="covered" aria-hidden="true">
          <span class="c-icon-indicator">${this.badged(html`<span class="c-icon">${this.icon}</span>`, true)}</span>
          <span class="c-label-box"><span class="c-label" dir=${ownDirection(this.label)}>${this.label}</span></span>
        </span>
      </span>
      <span class="hold"></span>
    `;
  }
}

/** The active indicator on its way to a destination, or away (NVB-15, NVB-28, NVB-29). */
interface Slide {
  /** Its timing: an effect without keyframes on the indicator, whose progress follows the selection motion's easing. */
  timing: Animation;
  /** Where it starts; null fades it in on the new destination's item container, at its full size. */
  start: Box | null;
  /** The destination it moves to; null fades it out over `from`. */
  to: TanreiNavigationBarItem | null;
  from: TanreiNavigationBarItem | null;
}

/** The active indicator under a dragged pointer (NVB-27). */
interface Following {
  /** The pointer's place along the bar at its last move (clientX). */
  x: number;
  /** The catch-up from where the indicator rested to the pointer's place, while it runs. */
  catchUp: { timing: Animation; from: Box } | null;
  /** The two destinations the indicator was last drawn between. */
  place: IndicatorPlace<TanreiNavigationBarItem> | null;
}

/**
 * Three to five top-level destinations along the bottom edge of a compact window, one of them the current screen.
 *
 * Contract: specs/navigation-bar.spec.json. `<tanrei-navigation-bar-item>` children are the destinations, in order. The
 * bar's `value` is the selected destination's value; the bar sets it when a destination is activated — pointer, Enter,
 * Space, `item.click()` — and then fires `change`, or `reselect` when the selected destination is activated again. The
 * host is a navigation landmark named by `label`.
 *
 * A bar of links (NVB-30…33): a destination with `href` is a link, and the selected destination is the current page
 * (`aria-current="page"`) — one state, which in a site of separate pages the page says, through `value` (a link without
 * a `value` takes its `href`). The bar never writes `value` for a link: a plain activation (Enter, not Space) fires
 * `change` or `reselect` with `detail.href`, cancelable, before the browser follows the link (a router cancels it, goes
 * to `detail.href` itself and sets `value`), and the active indicator stays on the destination `value` selects until
 * `value` changes; a modified or a middle click, a link whose `target` is `new` and a download are the browser's and
 * fire nothing.
 *
 * The bar is the ground the active indicator moves on: one constant color. Each destination's item container is its
 * whole equal share of the bar, held in from the bar's edges by `comp.navigation-bar.container.padding` — the same box
 * for every destination, whatever it holds — and it is where the active indicator, hover, press and the focus indicator
 * are drawn. When the selection changes, the active indicator — one layer of the bar — slides at its full size from the
 * previous destination's item container to the new one's, and the covered copy of every destination's icon and label is
 * clipped to it in the same frame (NVB-15, NVB-23); where nothing was selected it fades in, in place.
 *
 * A drag across the bar — by touch, a pen or a mouse, past 8 px and further sideways than up or down, while a
 * destination is selected — carries the indicator with the pointer, its place and the covered colors changing
 * continuously (NVB-27). Nothing is selected before the release, which chooses the nearer of the two destinations the
 * indicator lies between (or the one a fling is toward), activates it as a tap would — `value`, one `change` — or
 * returns the indicator and fires nothing; a release on a link is a plain press on that link (`change` with its
 * `href`, the link followed, `value` not written), so the indicator returns to the destination `value` selects and goes
 * on to the chosen one when the product sets `value`; Escape, a cancelled pointer, or `value` set meanwhile returns it
 * (NVB-28, NVB-29).
 *
 * Every visual value comes from `--tanrei-comp-navigation-bar-*` tokens: `variant` chooses the conditions the
 * destinations are drawn from (tonal: unselected and selected; filled: filled-unselected and filled-selected). How a
 * press is answered and how keyboard focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`).
 * The color reaches under `env(safe-area-inset-bottom)` and the side insets; the destinations stay inside them.
 *
 * @tag tanrei-navigation-bar
 * @slot - `<tanrei-navigation-bar-item>` children: the destinations.
 * @csspart container - The bar: its color, elevation and the insets it reaches under.
 * @csspart outline - The bar's top edge.
 * @csspart indicator - The active indicator while it moves between destinations or follows a drag (at rest, the selected destination's item container is the indicator).
 * @csspart list - The row of destinations (a list).
 * @fires {CustomEvent<TanreiNavigationChangeDetail>} change - The user activated another destination, or released a drag of the active indicator on one: `detail.value` (and, for a button destination, the bar's `value`) is its value. For a link it is fired before the link is followed, only for a plain activation of a link that opens in place, carries `detail.href`, leaves `value` to the page, and is cancelable: `preventDefault()` stops the browser's navigation.
 * @fires {CustomEvent<TanreiNavigationChangeDetail>} reselect - The user activated the selected destination again: `detail.value` is its value; for a link, as `change`. A drag that returns the indicator to it does not fire it.
 */
export class TanreiNavigationBar extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'navigation-bar');
  static override styles = barStyles;

  static override properties: PropertyDeclarations = {
    value: { type: String },
    variant: { type: String, reflect: true },
    labelVisibility: { type: String, attribute: 'label-visibility', reflect: true },
    label: { type: String },
  };

  /** The value of the selected destination; empty selects none. The bar sets it when a button destination is activated, and never for a link (NVB-31): in a site of separate pages each page sets it to its own destination (a link's `href` where it has no `value`). */
  value = '';

  /** How the active indicator is filled: `tonal` (a soft container, the default) or `filled` (the strong color, the content inverted on it); anything else is `tonal`. Reflected. */
  variant: TanreiNavigationBarVariant = 'tonal';

  /** Which destinations draw their label: `always`, `selected` (only the selected one) or `never` (anything else is `always`). No item container changes size with it. Reflected. */
  labelVisibility: TanreiLabelVisibility = 'always';

  /** Names the navigation landmark ("Main"). */
  label = '';

  /** NVB-1…3, NVB-17, NVB-19, NVB-20, NVB-22, NVB-31: selection, activation and the debug reports (src/primitives/destination.ts). */
  private readonly destinations = new DestinationsController<TanreiNavigationBarItem>(this, {
    items: () => [...this.children].filter((child): child is TanreiNavigationBarItem => child instanceof TanreiNavigationBarItem),
    ids: { unknownValue: 'NVB-3', emptyLabel: 'NVB-20', duplicate: 'NVB-22', count: 'NVB-17' },
    range: [3, 5],
    labelShown: (selected) => (this.labelVisibility === 'never' ? false : this.labelVisibility === 'selected' ? selected : true),
    variant: () => (this.variant === 'filled' ? 'filled' : ''),
    synced: (selected, items) => this.follow(selected, items),
    // NVB-31: a link is followed, not selected.
    link: (item, event) => item.linkActivation(event),
  });

  /** NVB-27…29: the drag of the active indicator — the gesture (src/primitives/indicator-drag.ts); the bar draws it. */
  private readonly drag = new IndicatorDragController(this, {
    // NVB-27: on the bar, and only while a destination is selected and there is one to carry the indicator to.
    accepts: (event) => {
      const bar = this.renderRoot?.querySelector('.bar');
      return !!bar && event.composedPath().includes(bar) && !!this.destinations.selected && this.items.some((item) => !item.disabled);
    },
    taken: (x) => this.takeDrag(x),
    moved: (x) => {
      if (!this.following) return;
      this.following.x = x;
      this.followPointer();
    },
    released: (x, velocity) => this.releaseDrag(x, velocity),
    cancelled: () => this.returnIndicator(),
  });

  /** The destination drawn selected at the last sync; undefined until the first (which is drawn, not animated). */
  private shown: TanreiNavigationBarItem | null | undefined = undefined;
  /** The destinations seen at an earlier sync: one that arrives selected is put in place at once. */
  private readonly known = new WeakSet<TanreiNavigationBarItem>();
  private slide: Slide | null = null;
  private following: Following | null = null;
  /** Where the indicator was last drawn while moving: a new selection, a drag or a return starts from there. */
  private drawn: Box | null = null;
  private frameId = 0;

  constructor() {
    super();
    // NVB-28, NVB-30: nothing of the bar is dragged as content (a link, where a browser would start one anyway): a
    // sideways drag moves the active indicator, the one behaviour of a link the bar takes.
    this.addEventListener('dragstart', (event) => event.preventDefault());
  }

  /** The bar's destinations, in order. */
  get items(): TanreiNavigationBarItem[] {
    return this.destinations.items;
  }

  private get pill(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.pill') ?? null;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.rest();
  }

  protected override updated(changed: PropertyValues<this>) {
    // NVB-19: a navigation landmark named by the bar's label.
    if (changed.has('label') || !this.hasAttribute('role')) hostAria(this, { role: 'navigation', 'aria-label': this.label || null });
  }

  /**
   * NVB-15: a new selection moves the active indicator from the destination drawn selected before — or from where the
   * indicator is, mid-way or where a released drag left it — to the new one. The first selection, and a destination
   * that arrives already selected, are put in place at once; so is every change of size or place without a new
   * selection (the styles draw the rest state).
   *
   * NVB-29: while a drag lasts, a selection the product sets — or a destination under the indicator that it removes or
   * disables — ends the drag, and the indicator goes to the selected destination from where it is.
   */
  private follow(selected: TanreiNavigationBarItem | null, items: TanreiNavigationBarItem[]) {
    const before = this.shown;
    const arrived = !!selected && !this.known.has(selected);
    this.shown = selected;
    for (const item of items) this.known.add(item);
    if (this.drag.taken) {
      const place = this.following?.place;
      const gone = (item: TanreiNavigationBarItem | undefined) => !!item && (item.disabled || !items.includes(item));
      if (before === selected && !gone(place?.from) && !gone(place?.to)) return;
      this.drag.cancel(false);
      this.returnIndicator();
      return;
    }
    if (before === undefined || before === selected) return;
    if (!this.hasUpdated || arrived) {
      this.rest();
      return;
    }
    this.slideTo(selected, before && before.isConnected && items.includes(before) ? before : null);
  }

  /** A motion of the indicator's own, read through real properties of its layer — 0 where motion is reduced. */
  private motion(of: 'selection' | 'state'): { duration: number; easing: string } {
    const style = getComputedStyle(this.pill ?? this);
    const [duration, easing] = of === 'selection' ? [style.animationDuration, style.animationTimingFunction] : [style.transitionDuration, style.transitionTimingFunction];
    return { duration: (Number.parseFloat(duration) || 0) * 1000, easing: easing || 'ease' };
  }

  /** A clock: an effect without keyframes on the indicator's layer (it draws nothing), whose progress follows `easing`. */
  private clock(id: string, duration: number, easing: string): Animation | null {
    const pill = this.pill;
    if (!pill || duration <= 0 || typeof KeyframeEffect === 'undefined') return null;
    const timing = new Animation(new KeyframeEffect(pill, [], { duration, easing }), document.timeline);
    timing.id = id;
    timing.play();
    return timing;
  }

  private boxOf(item: TanreiNavigationBarItem | null): Box | null {
    const box = item?.itemContainer?.getBoundingClientRect();
    return box && (box.width || box.height) ? { left: box.left, top: box.top, right: box.right, bottom: box.bottom } : null;
  }

  /**
   * NVB-15, NVB-28, NVB-29: the indicator goes to `to` over the selection motion — from where it is drawn, or from
   * `from`'s item container, at its full size all the way; with nowhere to come from it fades in on `to`, and with
   * nowhere to go it fades out where it is. At once where motion is reduced.
   */
  private slideTo(to: TanreiNavigationBarItem | null, from: TanreiNavigationBarItem | null) {
    const start = this.drawn ?? this.boxOf(from);
    this.rest();
    const { duration, easing } = this.motion('selection');
    if (!start && !to) return;
    const timing = this.clock('tanrei-navigation-bar-slide', duration, easing);
    if (!timing) return;
    this.slide = { timing, start, to, from };
    // The first frame now, before the destinations draw their new conditions: nothing is drawn in its new place early.
    this.frame();
  }

  /**
   * One frame of a slide: the indicator at the eased progress between where it started and the new destination's item
   * container as it is now, and every covered copy clipped to it — the look a drag draws with the indicator at that
   * place (NVB-27).
   */
  private frame() {
    const slide = this.slide;
    if (!slide) return;
    const state = slide.timing.playState;
    if (state === 'finished' || state === 'idle') {
      this.rest();
      return;
    }
    const progress = slide.timing.effect?.getComputedTiming().progress ?? 0;
    let box: Box | null;
    let opacity = 1;
    if (slide.to) {
      const target = this.boxOf(slide.to);
      if (!target) {
        this.rest();
        return;
      }
      if (slide.start) box = between(slide.start, target, progress);
      else {
        // NVB-15: where none was selected before it fades in at its full size; it does not grow in width.
        box = target;
        opacity = Math.min(1, Math.max(0, progress));
      }
    } else {
      box = this.boxOf(slide.from) ?? slide.start;
      opacity = Math.min(1, Math.max(0, 1 - progress));
    }
    if (!box) {
      this.rest();
      return;
    }
    this.draw(box, opacity, slide.to ?? slide.from, slide.to);
    this.frameId = requestAnimationFrame(() => this.frame());
  }

  /**
   * Draws the indicator at `box`, in `owner`'s colors (the destination it belongs to), and clips every destination's
   * covered copy to it in the same frame (NVB-23); `fill` is the destination drawn selected, whose own item container's
   * fill is not drawn meanwhile.
   */
  private draw(box: Box, opacity: number, owner: TanreiNavigationBarItem | null, fill: TanreiNavigationBarItem | null) {
    const pill = this.pill;
    const bar = this.renderRoot.querySelector('.bar');
    const origin = bar?.getBoundingClientRect();
    if (!pill || !bar || !origin) return;
    // The boxes are the page's; what is written is in the bar's own pixels, whatever scales the bar (a sheet or a
    // dialog growing in around it): the indicator and every clip are right at any scale.
    const scale = layoutScale(bar);
    // Drawn flat (scaled to nothing), nothing is seen and nothing can be measured: the next frame draws it.
    if (!scale.x || !scale.y) return;
    pill.style.left = px((box.left - origin.left) / scale.x);
    pill.style.top = px((box.top - origin.top) / scale.y);
    pill.style.width = px((box.right - box.left) / scale.x);
    pill.style.height = px((box.bottom - box.top) / scale.y);
    pill.style.opacity = String(opacity);
    pill.classList.add('moving');
    pill.classList.toggle('filled', this.variant === 'filled');
    pill.classList.toggle('d', !!owner?.disabled);
    this.drawn = box;
    const radius = Number.parseFloat(getComputedStyle(pill).borderTopLeftRadius) || 0;
    for (const item of this.items) item.setCover({ box, opacity, fill: item === fill, radius, scale });
  }

  /** Nothing moves the indicator any longer; what is drawn stays as it is. */
  private stopMoving() {
    cancelAnimationFrame(this.frameId);
    this.slide?.timing.cancel();
    this.slide = null;
    this.following?.catchUp?.timing.cancel();
    this.following = null;
  }

  /** The indicator at rest: the bar's layer is not drawn, and every destination's styles draw its item container and covered copy. */
  private rest() {
    this.stopMoving();
    this.drawn = null;
    const pill = this.pill;
    if (pill) {
      pill.classList.remove('moving');
      for (const property of ['left', 'top', 'width', 'height', 'opacity']) pill.style.removeProperty(property);
    }
    for (const item of this.items) item.setCover(null);
  }

  // ---- the drag (NVB-27…29) ----

  /**
   * NVB-27: the bar took the drag. The press activates nothing and the destination under it leaves its pressed state as
   * when a press ends; the indicator comes from where it is drawn — a running slide stops there — to the pointer's place
   * over the state motion (not where motion is reduced), following the pointer meanwhile.
   */
  private takeDrag(x: number) {
    for (const item of this.items) item.releasePress('pointer');
    const from = this.drawn ?? this.boxOf(this.destinations.selected);
    this.stopMoving();
    const { duration, easing } = this.motion('state');
    const timing = from ? this.clock('tanrei-navigation-bar-catch-up', duration, easing) : null;
    this.following = { x, catchUp: timing && from ? { timing, from } : null, place: null };
    this.followPointer();
  }

  /**
   * NVB-27: where the indicator is drawn while the pointer is at `x` — on an enabled destination's item container at its
   * cell's centre, halfway between two neighbouring enabled ones where their cells meet, at the linear interpolation in
   * between — and the two destinations it lies between.
   */
  private placeAt(x: number): { place: IndicatorPlace<TanreiNavigationBarItem>; box: Box } | null {
    const stops = this.items
      .filter((item) => !item.disabled)
      .flatMap((item) => {
        const box = this.boxOf(item);
        return box ? [{ item, left: box.left, right: box.right }] : [];
      })
      .sort((a, b) => a.left - b.left);
    const place = indicatorPlace(stops, x);
    if (!place) return null;
    const [from, to] = [this.boxOf(place.from), this.boxOf(place.to)];
    return from && to ? { place, box: between(from, to, place.p) } : null;
  }

  /**
   * NVB-27: draws the indicator where the pointer is, in the frame it moves — without a motion of its own, except the
   * catch-up that brings it from where it rested — in the selected destination's colors.
   */
  private followPointer() {
    cancelAnimationFrame(this.frameId);
    const following = this.following;
    if (!following) return;
    const at = this.placeAt(following.x);
    if (!at) return;
    following.place = at.place;
    let box = at.box;
    const catchUp = following.catchUp;
    if (catchUp) {
      const over = catchUp.timing.playState === 'finished' || catchUp.timing.playState === 'idle';
      if (over) following.catchUp = null;
      else box = between(catchUp.from, box, catchUp.timing.effect?.getComputedTiming().progress ?? 1);
    }
    const selected = this.destinations.selected;
    this.draw(box, 1, selected, selected);
    if (following.catchUp) this.frameId = requestAnimationFrame(() => this.followPointer());
  }

  /**
   * NVB-28: a release chooses one enabled destination — the one the indicator is nearer to of the two it lies between
   * (the one after it from halfway on), or the one of the two a fling is toward. Another than the selected one is
   * activated as a tap activates it: with its own click, so the bar sets `value` and fires `change` once, and the
   * indicator settles from where the release left it. A link is pressed the same way and is not selected by it
   * (NVB-31): `change` with its `href`, the link followed, `value` not written — so the indicator returns to the
   * destination `value` selects, unless the product set `value` in its listener, and then it goes on to the chosen one
   * from where it is. The selected one: the indicator returns, and nothing is fired.
   */
  private releaseDrag(x: number, velocity: number) {
    const place = this.placeAt(x)?.place ?? this.following?.place ?? null;
    this.stopMoving();
    const selected = this.destinations.selected;
    const chosen = place ? indicatorChoice(place, velocity) : null;
    if (chosen && chosen !== selected && !chosen.disabled) {
      this.drag.activate(() => chosen.click());
      if (this.destinations.selected === chosen) return;
    }
    this.returnIndicator();
  }

  /** NVB-28, NVB-29: the indicator goes back to the selected destination from where it is, over the selection motion. */
  private returnIndicator() {
    this.stopMoving();
    this.slideTo(this.destinations.selected, null);
  }

  protected override render() {
    return html`
      <div part="container" class="bar">
        <div part="outline" class="outline" aria-hidden="true"></div>
        <span part="indicator" class="pill" data-tanrei-shape aria-hidden="true"></span>
        <div part="list" class="destinations" role="list"><slot></slot></div>
      </div>
    `;
  }
}

// A destination's badge is the badge component (NVB-16): it is defined wherever a bar is.
if (!customElements.get('tanrei-badge')) customElements.define('tanrei-badge', TanreiBadge);
if (!customElements.get('tanrei-navigation-bar-item')) customElements.define('tanrei-navigation-bar-item', TanreiNavigationBarItem);
if (!customElements.get('tanrei-navigation-bar')) customElements.define('tanrei-navigation-bar', TanreiNavigationBar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-navigation-bar': TanreiNavigationBar;
    'tanrei-navigation-bar-item': TanreiNavigationBarItem;
  }
}
