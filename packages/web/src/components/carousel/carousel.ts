import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { hiddenHost } from '../../primitives/hidden.js';
import { exported } from '../../primitives/composed.js';
import { AvailabilityController, BUTTON_VARIANTS, compChoice, containWheel, DIRECTION_PROBE, DirectionController, giveVariant, inverseBoolean, PressController, RovingKeys, hostAria, report, slottedInteractive, stoppedBefore, SystemWatchController, syncFocusStyle, WordsController } from '../../primitives/index.js';
import { TanreiButton } from '../button/button.js';
import { CarouselGeometry, type TanreiCarouselHeroAlignment } from './carousel-geometry.js';
import { carouselStyles, itemStyles } from './carousel.styles.js';
import { TanreiElement } from '../../primitives/element.js';

export type { TanreiCarouselHeroAlignment } from './carousel-geometry.js';

/**
 * With fluid widths, where a narrowed item's content is anchored: `center` shows its middle; `toward-hero` aligns the
 * items after the hero to their start and the items before it to their end (CRL-15).
 */
export type TanreiCarouselContentAlignment = 'center' | 'toward-hero';

/**
 * Whether the previous and next controls are drawn over the ends of the row (CRL-41, CRL-42): `auto` where the primary
 * pointer is fine and can hover, shown while the carousel is hovered or holds focus; `always` everywhere, at all times;
 * `none` never.
 */
export type TanreiCarouselNavigation = 'auto' | 'always' | 'none';

/** The detail of `pausedchange`: the new value of `paused`. */
export interface TanreiCarouselPausedChangeDetail {
  paused: boolean;
}

const HERO_ALIGNMENTS: readonly TanreiCarouselHeroAlignment[] = ['start', 'center'];
const CONTENT_ALIGNMENTS: readonly TanreiCarouselContentAlignment[] = ['center', 'toward-hero'];
const NAVIGATIONS: readonly TanreiCarouselNavigation[] = ['auto', 'always', 'none'];

/** The previous and next controls (CRL-41), in the order Tab visits them; each is a part of that name. */
const NAV_CONTROLS = ['previous', 'next'] as const;
type NavControl = (typeof NAV_CONTROLS)[number];
/** Each control's glyph: a ligature of the system's icon set, mirrored by the Button where the set says so (CRL-23). */
const NAV_GLYPHS: Record<NavControl, string> = { previous: 'chevron_left', next: 'chevron_right' };
/** Each Button's documented parts under the control's name: `previous-container`, `previous-label`, `previous-icon`. */
const NAV_PARTS = Object.fromEntries(
  NAV_CONTROLS.map((control) => [control, exported(TanreiButton, Object.fromEntries(TanreiButton.parts.map((part) => [part, { as: `${control}-${part}` }])))]),
) as Record<NavControl, { attribute: string; names: string[] }>;

/**
 * A release at least this fast is a fling (CRL-14), in px per ms: the web names no minimum fling velocity of its own,
 * so the spec's 0.5 points per millisecond. A behaviour of the spec, not a design value.
 */
const FLING_VELOCITY = 0.5;

/** How far back the velocity of a release looks, in ms: the moves it averages over (a finger that held still is `stoppedBefore`). */
const VELOCITY_WINDOW = 80;

/**
 * Where no `scrollend` comes, a scroll counts as over once no scroll event has come for this long, in ms. A behaviour
 * constant of the fallback, not a design value.
 */
const SCROLL_IDLE = 100;

/** The glyphs of the playback control (CRL-35): ligatures of the system's icon set. */
const PAUSE_GLYPH = 'pause';
const PLAY_GLYPH = 'play_arrow';

/** What the carousel tells each of its items. */
interface ItemContext {
  tabStop: boolean;
  position: number;
  size: number;
}

/** Where the carousel draws an item (CRL-12, CRL-15, CRL-26, CRL-40), in CSS px. */
interface ItemPlacement {
  /** The drawn container's start from the carousel's start edge, along the reading direction: on a device pixel. */
  start: number;
  /** The drawn container's width: to the next item's start less the gap (CRL-40), after any scale. */
  width: number;
  /** The width its content is laid out at: H. */
  content: number;
  /** The content box's physical left edge in the container (after the scale). */
  contentLeft: number;
  /** The scale its height and its content are drawn at, or null while scaleOthers is false. */
  scale: number | null;
  /** CRL-4: narrower than any slot (on its way to or from an edge slot, or not drawn): no hit area beyond half the gap on each side. */
  narrow: boolean;
}

/**
 * One item of a carousel — the spec's item kind `item`: the product's content in a rounded box, one action
 * named by its label. A child of `<tanrei-carousel>`, which places it, sizes it and says which item is the Tab stop.
 *
 * The host is a `listitem` with its position among the items; inside it one element has the button role, named by
 * `label` — the content is not read (CRL-19). The content is the default slot: an image, a poster, anything that is not
 * interactive (CRL-20). The item lays it out at the hero's width and the carousel's height, aligned as the carousel
 * says, clips it to its corners and hands it `comp.carousel.item.content.color` as the inherited `color` (CRL-15,
 * CRL-16). Give an image `inline-size: 100%; block-size: 100%; object-fit: cover`.
 *
 * @tag tanrei-carousel-item
 * @slot - The content: an image or other visual, never anything interactive.
 * @csspart container - The item's rounded box: its resting fill, its corners, every state and the button semantics.
 * @csspart content - The box the content is laid out in: the hero's width, the item's height.
 * @csspart state-layer - The layer over the content that shows hover, focus and press (CRL-16).
 * @fires click - The item was activated by pointer, touch, keyboard or assistive technology.
 */
export class TanreiCarouselItem extends TanreiElement {
  static override styles = [itemStyles, hiddenHost];

  // `element.focus()` focuses the item's button; the carousel moves focus between items this way.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    context: { state: true },
  };

  /** The item's accessible name: what its content shows ("Coast path, 12 photos"). Required; the content is not read. */
  label = '';

  /** What the carousel says about this item. */
  private context: ItemContext = { tabStop: false, position: 0, size: 0 };

  /** CRL-5 / CRL-6: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.container,
    holdCarrier: () => this.renderRoot?.querySelector('.clip') ?? null,
    disabled: () => false,
  });

  /** Space activates on key-up, as a native button does, and only when the key went down on the item. */
  private spaceDown = false;

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  /** @internal The carousel's side: which item is the Tab stop, and the item's position and the number of items. */
  setCarouselContext(context: ItemContext) {
    const now = this.context;
    if (context.tabStop === now.tabStop && context.position === now.position && context.size === now.size) return;
    this.context = context;
  }

  /**
   * @internal CRL-8, CRL-12, CRL-15, CRL-26, CRL-40: where the carousel draws the item — the drawn container's start
   * along the row and its width — the width its content is laid out at, where the content sits and the scale of its
   * height and content. Written as custom properties on the host, so a scroll re-renders nothing.
   */
  place({ start, width, content, contentLeft, scale, narrow }: ItemPlacement) {
    this.style.setProperty('--_x', `${start}px`);
    this.style.setProperty('--_w', `${width}px`);
    this.style.setProperty('--_content', `${content}px`);
    this.style.setProperty('--_content-left', `${contentLeft}px`);
    if (scale === null) this.style.removeProperty('--_scale');
    else this.style.setProperty('--_scale', String(scale));
    // CRL-4: an item narrower than any slot gets no hit area beyond its container and half the gap on each side.
    if (narrow) this.style.setProperty('--_hit-floor', '0px');
    else this.style.removeProperty('--_hit-floor');
  }

  /** @internal Moves keyboard focus to the item's button. */
  focusButton(options?: FocusOptions) {
    this.container?.focus(options);
  }

  /** CRL-7: where style queries are missing, the focus style is read when focus arrives. */
  #onFocus() {
    syncFocusStyle(this, this.container);
  }

  /** CRL-1: Enter activates on key-down and Space on key-up, as a native button does. */
  #onKeyDown(event: KeyboardEvent) {
    if (event.target !== this.container) return;
    this.press.onKeyDown(event);
    if (event.key === 'Enter') {
      if (!event.repeat) this.container?.click();
    } else if (event.key === ' ') {
      // Space would scroll the row or the page.
      event.preventDefault();
      this.spaceDown = true;
    }
  }

  #onKeyUp(event: KeyboardEvent) {
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    this.container?.click();
  }

  #onBlur() {
    // A Space whose key-up arrives somewhere else does not activate, as on a native button.
    this.spaceDown = false;
    this.press.onBlur();
  }

  /** CRL-20: an item's content holds nothing interactive; a debug build names what it found, on every slot change. */
  private async inspectContent() {
    const found = await slottedInteractive(this.renderRoot.querySelector('slot'));
    if (found) {
      report(this, 'CRL-20', `a carousel item holds an interactive element (<${found.localName}>), which assistive technology cannot reach and whose press would also activate the item; an item is one action — put other actions outside the carousel`);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    const { position, size } = this.context;
    // CRL-19: a list item with its position among the items and their number.
    hostAria(this, {
      role: 'listitem',
      'aria-posinset': position ? String(position) : null,
      'aria-setsize': size ? String(size) : null,
    });
    // CRL-20: an item without a label still renders; a debug build says it has no name.
    if (changed.has('label') && !this.label.trim()) report(this, 'CRL-20', 'label is empty, so the carousel item has no accessible name; give it a label that says what its content shows');
  }

  protected override render() {
    return html`
      <div
        part="container"
        class="container"
        data-tanrei-shape
        role="button"
        tabindex=${this.context.tabStop ? '0' : '-1'}
        aria-label=${this.label}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @keydown=${this.#onKeyDown}
        @keyup=${this.#onKeyUp}
        @blur=${this.#onBlur}
        @focus=${this.#onFocus}
      >
        <div class="clip" aria-hidden="true">
          <div part="content" class="content"><slot @slotchange=${this.inspectContent}></slot></div>
        </div>
        <span part="state-layer" class="state-layer" aria-hidden="true"></span>
      </div>
    `;
  }
}

/** A number from an attribute (`item-width` in CSS px, `autoplay-interval` in ms); no attribute is null. */
const numberConverter = {
  fromAttribute: (value: string | null) => (value === null || value.trim() === '' ? null : Number(value)),
  toAttribute: (value: number | null) => (value === null || value === undefined ? null : String(value)),
};


/** A number that is positive, else null (CRL-24). */
const positive = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

/** The motions the carousel starts itself: a settle, a scroll into place or a dot's move (CRL-14, CRL-18, CRL-30), or an advance (CRL-32). */
type Motion = 'scroll' | 'autoplay';

/**
 * Lets people browse a row of visual items that scrolls sideways around one item in focus — the hero, in the centre (the
 * default) or at the start, the others narrower (fluid widths) or smaller (scaleOthers) as they move away, every two
 * neighbours one gap apart at every scroll position (CRL-40) — each item opening what it shows. A featured row may loop, show its position in dots and advance by itself, with a control to stop it.
 *
 * Contract: specs/carousel.spec.json. The items are `<tanrei-carousel-item>` children, in order. The carousel is a native
 * horizontal scroller — wheel, trackpad, touch and pen scroll it as the platform does — whose track is as long as the
 * scroll range; it places every item from the scroll offset (CRL-12), and settles at a resting position when a scroll
 * ends while `snap` is true (CRL-14). The items are one Tab stop; the arrow keys, Home and End move between items and
 * bring the focused one into place (CRL-17, CRL-18). Over the ends of the row, a previous and a next control move it one
 * resting position (CRL-41 – CRL-43). Below the items, a controls row holds the page indicator (one
 * slider, CRL-29 – CRL-31) and the playback control (CRL-35). Every visual value comes from `--tanrei-comp-carousel-*`
 * tokens.
 *
 * @tag tanrei-carousel
 * @slot - `<tanrei-carousel-item>` children: the items, in order.
 * @csspart row - The scroller: as wide as the carousel, scrolled sideways by the person.
 * @csspart list - The element with the list role around the items, named by `label`.
 * @csspart controls - The row below the items that holds the indicator and the playback control.
 * @csspart indicator - The dots: one slider, named by `label`.
 * @csspart dot - One dot of the indicator.
 * @csspart playback - The playback control: a native button that pauses and plays autoplay.
 * @csspart previous - The previous control over the row's inline start: a `<tanrei-button>`.
 * @csspart next - The next control over the row's inline end: a `<tanrei-button>`.
 * @exportparts tanrei-button container: previous-container, label: previous-label, icon: previous-icon
 * @exportparts tanrei-button container: next-container, label: next-label, icon: next-icon
 * @fires {CustomEvent<TanreiCarouselPausedChangeDetail>} pausedchange - The person paused or played autoplay with the playback control; `detail.paused` is the new value. Not fired when `paused` is set, nor for a hold.
 */
export class TanreiCarousel extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'carousel');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  /** CRL-41: the controls' variant is a token's choice, read again when the page switches its design system. */
  private readonly system = new SystemWatchController(this);
  static override styles = [carouselStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    heroAlignment: { type: String, attribute: 'hero-alignment', reflect: true },
    itemWidth: { attribute: 'item-width', converter: numberConverter },
    // An HTML boolean attribute cannot default to true: the attributes are the inverses, `fixed-width`, `free-scroll` and
    // `no-playback-control`.
    fluidWidth: { attribute: 'fixed-width', reflect: true, converter: inverseBoolean },
    contentAlignment: { type: String, attribute: 'content-alignment', reflect: true },
    scaleOthers: { type: Boolean, attribute: 'scale-others', reflect: true },
    snap: { attribute: 'free-scroll', reflect: true, converter: inverseBoolean },
    loop: { type: Boolean, reflect: true },
    navigation: { type: String, reflect: true },
    indicator: { type: Boolean, reflect: true },
    autoplay: { type: Boolean, reflect: true },
    autoplayInterval: { attribute: 'autoplay-interval', converter: numberConverter },
    paused: { type: Boolean, reflect: true },
    playbackControl: { attribute: 'no-playback-control', reflect: true, converter: inverseBoolean },
    autoplayProgress: { type: Boolean, attribute: 'autoplay-progress', reflect: true },
    playLabel: { type: String, attribute: 'play-label' },
    pauseLabel: { type: String, attribute: 'pause-label' },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
    label: { type: String },
    restingCount: { state: true },
    indicatorFits: { state: true },
    current: { state: true },
    reducedMotion: { state: true },
    glyphReady: { state: true },
    firstDisabled: { state: true },
    lastDisabled: { state: true },
  };

  /** Where the item in focus sits: `center` (the middle of the row, items on both sides) or `start` (the inner start edge). An unknown value is drawn as `center` and reported (CRL-24). Reflected. */
  heroAlignment: TanreiCarouselHeroAlignment = 'center';

  /**
   * The width the hero is laid out at, in CSS px (the `item-width` attribute); null takes
   * `comp.carousel.container.large-width`. With fixed widths every item is this wide (at most the inner width); with
   * fluid widths the hero is kept between a floor and a cap (CRL-9). Not a positive number: treated as null and
   * reported (CRL-24).
   */
  itemWidth: number | null = null;

  /** Whether item widths change fluidly (CRL-10). False (the `fixed-width` attribute) makes every item the hero's width. */
  fluidWidth = true;

  /** With fluid widths, where a narrowed item's content is anchored: `center` or `toward-hero` (CRL-15). An unknown value is `center`, reported (CRL-24). Reflected. */
  contentAlignment: TanreiCarouselContentAlignment = 'center';

  /** Draws the items other than the hero smaller, down to `comp.carousel.container.min-scale`, following the scroll (CRL-26). */
  scaleOthers = false;

  /** Whether the row settles at a resting position when a scroll ends (CRL-14). False (the `free-scroll` attribute) lets it rest wherever it ends. */
  snap = true;

  /** Whether the row is endless (CRL-27). Takes effect only with two or more items. */
  loop = false;

  /**
   * Whether the previous and next controls are drawn over the ends of the row (CRL-41, CRL-42): `auto` (the default)
   * where the primary pointer is fine and can hover, shown while the carousel is hovered or holds focus; `always` on
   * every device, at all times; `none` never. Keep `auto` wherever you can: without the controls a mouse moves the row
   * only with Shift and the wheel (WCAG 2.5.7). An unknown value is `auto`, reported (CRL-24). Reflected.
   */
  navigation: TanreiCarouselNavigation = 'auto';

  /** Draws the dots below the items: one per resting position, the current one stretched (CRL-29). */
  indicator = false;

  /** Advances the row by itself, one resting position every `autoplayInterval` (CRL-32); it holds while hovered, focused within, pressed or hidden, and never runs where motion is reduced. */
  autoplay = false;

  /** How long the row rests before autoplay moves on, in ms (the `autoplay-interval` attribute); null takes `comp.carousel.autoplay.interval`. Not a positive number: null, reported (CRL-24). */
  autoplayInterval: number | null = null;

  /** Whether autoplay is paused, by the person (the playback control, which fires `pausedchange`) or by the product (which fires nothing). Reflected. */
  paused = false;

  /** Draws the playback control while autoplay is on (CRL-35). False (the `no-playback-control` attribute) hides it: keep it wherever you can (WCAG 2.2.2). */
  playbackControl = true;

  /** Fills the current dot to show the time until autoplay moves on (CRL-36). Needs `indicator`. */
  autoplayProgress = false;

  /** The playback control's accessible name while autoplay is paused ("Play the slideshow"). Required while it can be drawn. */
  playLabel = '';

  /** The playback control's accessible name while autoplay is playing ("Pause the slideshow"). Required while it can be drawn. */
  pauseLabel = '';

  /** The previous control's accessible name ("Previous walk"). Required while the control can be drawn (CRL-41). */
  previousLabel = '';

  /** The next control's accessible name ("Next walk"). Required while the control can be drawn (CRL-41). */
  nextLabel = '';

  /** Names the carousel's list and its indicator for assistive technology ("Recently played"). Required. */
  label = '';

  /** D, the number of resting positions of the last arrangement. */
  private restingCount = 0;
  /** CRL-29: whether the indicator's container fits beside the playback control's target. */
  private indicatorFits = true;
  /** CRL-31: the resting position nearest the indicator's position, from 0. */
  private current = 0;
  /** CRL-34: `prefers-reduced-motion: reduce`, followed as it changes. */
  private reducedMotion = false;
  /** CRL-38: whether the icon set can draw the playback glyphs. */
  private glyphReady = false;
  /** CRL-43: the row is at, or moving to, its first or its last resting position, and does not loop. */
  private firstDisabled = false;
  private lastDisabled = false;

  private readonly itemKeys = new RovingKeys({ wrap: false });
  private readonly loopKeys = new RovingKeys({ wrap: true });
  /**
   * Watches the row — the box the arrangement measures (CRL-8) — not the host: the host is also as tall as its controls
   * row, which an arrangement may add or take away (CRL-29), and an observer told of a change its own callback made
   * does not come to rest within the frame.
   */
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.arrange());
  private readonly motionQuery = typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-reduced-motion: reduce)');
  /**
   * CRL-23: the row follows the direction it inherits, and a change of it while the page runs: the scroll offset and
   * where each item's content sits were written physically for the old direction, so the row is arranged again — the
   * resting item kept where it was, without motion.
   */
  private readonly direction = new DirectionController(this, () => this.arrange());

  /** The arrangement of the last layout, the items it placed and the scroll offset they were placed at. */
  private geometry: CarouselGeometry | null = null;
  /** The zoom of the row's ancestors, read when the row is arranged: a device pixel is the window's ratio times it (CRL-40). */
  private zoom = 1;
  private laidOut: TanreiCarouselItem[] = [];
  private offset = 0;
  /** The offset the carousel last wrote itself: a scroll event that reports it is the carousel's own. */
  private written = Number.NaN;
  /** CRL-17: the item that last had keyboard focus in the carousel, or the one a dot's move brought (CRL-30). */
  private remembered: TanreiCarouselItem | null = null;
  /** CRL-32: the Tab stop an advance keeps, until the person moves the row. */
  private pinned: TanreiCarouselItem | null = null;

  /** The scroll the carousel is animating, where it goes, and whether it is an advance. */
  private scrolling: Animation | null = null;
  private scrollFrame = 0;
  private target: number | null = null;
  /** Whether the row is moving: a scroll, a settle, a scroll into place, a dot's move or an advance, not yet at rest. */
  private moving = false;

  /**
   * CRL-14: a finger is on the row; where it was and when (its events' own time stamps, not the time a frame handled
   * them), for the velocity of its release.
   */
  private touching = false;
  private scrolledSinceTouch = false;
  private samples: { x: number; time: number }[] = [];
  /** The direction of the last release's fling (1 toward the end, −1 toward the start), or 0. */
  private fling: -1 | 0 | 1 = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  /** CRL-30: the indicator is being pressed by this pointer, and the dot it last moved the row to. */
  private indicatorPointer: number | null = null;
  private indicatorDot = -1;

  // ── Autoplay (CRL-32 – CRL-36) ──
  /** The time of the interval that has passed, in ms, up to the moment the clock last stopped. */
  private elapsed = 0;
  /** When the clock last started (`performance.now()`), or null while it is stopped. */
  private runningSince: number | null = null;
  private advanceTimer: ReturnType<typeof setTimeout> | undefined;
  /** The interval the advance's timer was last set for, in ms: a new interval sets it again. */
  private timedInterval = 0;
  /** CRL-36: the animation that draws the current dot's fill across the interval — the browser runs it, no frame is asked for. */
  private progressAnimation: Animation | null = null;
  /** CRL-36: the resting position the row last came to rest at. */
  private progressDot = 0;
  /** CRL-33: the holds, and the hover and focus holds that playing lifted until the pointer or focus leaves. */
  private hovering = false;
  private hoverLifted = false;
  private focusWithin = false;
  private focusLifted = false;
  private pressing = false;
  private documentHidden = false;

  /** The last reported values, so a debug build reports each once per change. */
  private reported = new Map<string, unknown>();

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('pointerdown', this.onPointerDown, { capture: true });
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.reducedMotion = this.motionQuery?.matches ?? false;
    this.motionQuery?.addEventListener('change', this.onMotionChange);
    this.documentHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pointerup', this.onPointerUp, true);
    window.addEventListener('pointercancel', this.onPointerUp, true);
    if (this.hasUpdated) {
      this.observeRow();
      this.arrange();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize$?.disconnect();
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerUp, true);
    this.stopScrolling();
    this.stopClock();
    this.endProgress();
    clearTimeout(this.idleTimer);
  }

  /** The carousel's items, in order. */
  get items(): TanreiCarouselItem[] {
    return [...this.children].filter((child): child is TanreiCarouselItem => child instanceof TanreiCarouselItem);
  }

  /** CRL-24: the hero alignment drawn — `heroAlignment`, or the default while it names a value the carousel does not define. */
  private get drawnHero(): TanreiCarouselHeroAlignment {
    return HERO_ALIGNMENTS.includes(this.heroAlignment) ? this.heroAlignment : 'center';
  }

  /** CRL-24: the content alignment drawn. */
  private get drawnContent(): TanreiCarouselContentAlignment {
    return CONTENT_ALIGNMENTS.includes(this.contentAlignment) ? this.contentAlignment : 'center';
  }

  /** CRL-24: the navigation drawn — `navigation`, or the default while it names a value the carousel does not define. */
  private get drawnNavigation(): TanreiCarouselNavigation {
    return NAVIGATIONS.includes(this.navigation) ? this.navigation : 'auto';
  }

  /** CRL-41: whether the previous and next controls are in the tree (`auto` leaves the pointer's kind to CSS). */
  private get navigationDrawn(): boolean {
    return this.drawnNavigation !== 'none' && this.restingCount >= 2;
  }

  /** CRL-29: whether the indicator is drawn. */
  private get indicatorDrawn(): boolean {
    return this.indicator && this.restingCount >= 2 && this.indicatorFits;
  }

  /** CRL-35: whether the playback control is drawn. */
  private get playbackDrawn(): boolean {
    return this.autoplay && this.playbackControl && this.restingCount >= 2 && !this.reducedMotion;
  }

  /** CRL-36: whether the current dot shows the time until autoplay moves on. */
  private get progressDrawn(): boolean {
    return this.autoplayProgress && this.indicatorDrawn && this.autoplay && !this.paused && !this.reducedMotion;
  }

  private get scroller(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.scroller') ?? null;
  }

  private get rtl(): boolean {
    return this.direction.rtl;
  }

  /** The scroll offset along the reading direction (a right-to-left row scrolls to negative `scrollLeft`). */
  private readOffset(): number {
    const scroller = this.scroller;
    return scroller ? Math.abs(scroller.scrollLeft) : 0;
  }

  /**
   * What a `zoom` in CSS on an ancestor makes of one of the row's own pixels (CRL-40): the browser says it where it
   * can, and where it cannot the row's box, measured in the window's pixels and in its own, tells it. 1 with no zoom.
   */
  private readZoom(): number {
    const scroller = this.scroller as (HTMLElement & { currentCSSZoom?: number }) | null;
    if (!scroller) return 1;
    if (typeof scroller.currentCSSZoom === 'number') return scroller.currentCSSZoom > 0 ? scroller.currentCSSZoom : 1;
    const own = Number.parseFloat(getComputedStyle(scroller).width);
    const seen = scroller.getBoundingClientRect().width;
    return own > 0 && seen > 0 ? seen / own : 1;
  }

  /** The tokens the arrangement reads, in px (and the least scale, a number), through the probes' real properties. */
  private metrics() {
    const read = (selector: string) => {
      const probe = this.renderRoot.querySelector<HTMLElement>(selector);
      return probe ? getComputedStyle(probe) : null;
    };
    const [slots, controls] = [read('.probe'), read('.probe-controls')];
    const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0;
    const minScale = Number.parseFloat(controls?.flexGrow ?? '');
    return {
      // The row's width in its own pixels, as its tokens are: a client rect is in the window's, which a `zoom` on an
      // ancestor makes larger than the row's (the row's box is a border box, so its used width is the whole of it).
      width: this.scroller ? px(getComputedStyle(this.scroller).width) : 0,
      zoom: this.readZoom(),
      padding: px(slots?.paddingLeft),
      gap: px(slots?.paddingRight),
      largeWidth: positive(this.itemWidth) ?? px(slots?.paddingTop),
      smallMin: px(slots?.paddingBottom),
      smallMax: px(slots?.marginLeft),
      dotSize: px(controls?.paddingLeft),
      dotActive: px(controls?.paddingRight),
      dotGap: px(controls?.paddingTop),
      indicatorPadding: px(controls?.paddingBottom),
      touch: px(controls?.marginLeft),
      minScale: Number.isFinite(minScale) ? minScale : 1,
    };
  }

  /**
   * CRL-8 – CRL-13, CRL-21, CRL-27: arranges the slots for the carousel's width, its axes and its items, and keeps the
   * resting item where it was, as far as the new range allows, without motion.
   */
  private arrange() {
    const scroller = this.scroller;
    const track = this.renderRoot?.querySelector<HTMLElement>('.track');
    const stage = this.renderRoot?.querySelector<HTMLElement>('.stage');
    if (!scroller || !track || !stage || !this.isConnected) return;
    const items = this.items;
    const { zoom, ...metrics } = this.metrics();
    this.zoom = zoom;
    const before = this.geometry;
    const next = new CarouselGeometry({
      ...metrics,
      heroAlignment: this.drawnHero,
      fluid: this.fluidWidth !== false,
      scaleOthers: this.scaleOthers === true,
      snap: this.snap !== false,
      loop: this.loop,
      count: items.length,
    });

    // Where the resting item was, in the last arrangement: its index, and how far the row was from it.
    const wasAnimating = this.target !== null;
    const offset = this.target ?? this.offset;
    this.stopScrolling();
    let position: number;
    if (before && this.laidOut.length && before.step > 0) {
      const p = before.position(offset);
      const index = before.restingIndex(p);
      const anchor = this.laidOut[index];
      const moved = anchor ? items.indexOf(anchor) : -1;
      const at = moved >= 0 ? moved : Math.min(index, Math.max(0, items.length - 1));
      if (next.toSlot) {
        // As far from slot 0 as it was, in positions (0 at rest).
        position = at + (before.toSlot ? p - Math.round(p) : 0);
      } else {
        // Its start where it was, in px.
        position = before.toSlot || next.step <= 0 ? at : at - before.item(index, p).start / next.step;
      }
      if (next.loop) position = next.middle + position;
    } else {
      position = next.loop ? next.middle : next.position(this.readOffset());
    }

    this.geometry = next;
    this.laidOut = items;
    if (this.remembered && !items.includes(this.remembered)) this.remembered = null;
    if (this.pinned && !items.includes(this.pinned)) this.pinned = null;
    const view = metrics.width;
    track.style.setProperty('--_track', `${view + next.range}px`);
    stage.style.setProperty('--_view', `${view}px`);
    this.setOffset(next.offset(next.recentre(position)));

    // CRL-29: the dots fit while their container leaves the playback control's target and a gap on each side.
    const d = next.restingCount;
    const container = d * metrics.dotSize + Math.max(0, d - 1) * metrics.dotGap + (metrics.dotActive - metrics.dotSize) + 2 * metrics.indicatorPadding;
    this.indicatorFits = container <= next.inner - 2 * (metrics.touch + metrics.gap);
    this.restingCount = d;
    if (this.indicator && d >= 2 && !this.indicatorFits && this.reported.get('fit') !== `${d}@${next.inner}`) {
      this.reported.set('fit', `${d}@${next.inner}`);
      report(this, 'CRL-20', `indicator is set but its ${d} dots do not fit beside the playback control at this width, so they are not drawn; a row of dots is for a short featured row`, { once: false });
    }
    if (wasAnimating || this.moving) this.atRest();
    this.syncTabStop();
    this.syncClock();
  }

  /** Scrolls to `offset` at once and places the items there. */
  private setOffset(offset: number) {
    const scroller = this.scroller;
    if (!scroller) return;
    const before = this.readOffset();
    scroller.scrollLeft = this.rtl ? -offset : offset;
    const now = this.readOffset();
    // A write that moves the row is reported by one scroll event, which is then the carousel's own; one that moves
    // nothing is reported by none, and must not make a later scroll to this same offset look like the carousel's.
    this.written = now !== before ? now : Number.NaN;
    this.place(now);
  }

  /**
   * CRL-12, CRL-13, CRL-15, CRL-26, CRL-29, CRL-40: every item and every dot for `offset` — all from the one scroll
   * position, in one pass.
   *
   * CRL-40: a browser paints a box's edges on whole device pixels, so two gaps of the same length in CSS px can be
   * painted a device pixel apart (10 and 9 for a gap of 8 at a pixel ratio of 1.25, measured). So each drawn item's
   * start is rounded to a device pixel, and its end is the next item's rounded start less the gap, itself rounded: the
   * rounding falls on a width, never on a gap.
   */
  private place(offset: number) {
    const geometry = this.geometry;
    if (!geometry) return;
    this.offset = offset;
    const p = geometry.position(offset);
    const { padding, hero, gap } = geometry;
    const rtl = this.rtl;
    const towardHero = geometry.fluid && this.drawnContent === 'toward-hero';
    // A device pixel of the row: the window's ratio and the zoom of an ancestor, which the ratio does not hold.
    const ratio = ((typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1) || 1) * this.zoom;
    const snap = (length: number) => Math.round(length * ratio) / ratio;
    const view = geometry.inner + 2 * padding;
    const items = this.laidOut;
    const placed = items.map((_, index) => geometry.item(index, p));
    // The drawn items in the order they stand in: neighbours are one slot position apart.
    const order = placed.map((_, index) => index).filter((index) => placed[index].drawn).sort((a, b) => placed[a].s - placed[b].s);
    const starts = new Map<number, number>(order.map((index) => [index, snap(padding + placed[index].start)]));
    const width = new Map<number, number>();
    order.forEach((index, at) => {
      const start = starts.get(index)!;
      const next = order[at + 1];
      const neighbour = next !== undefined && Math.abs(placed[next].s - placed[index].s - 1) < 1e-6;
      const end = neighbour ? starts.get(next)! - snap(gap) : snap(padding + placed[index].start + placed[index].width);
      width.set(index, Math.max(0, end - start));
    });
    items.forEach((item, index) => {
      const { s, drawn, transit, scale: k } = placed[index];
      const scale = geometry.scaled ? k : null;
      if (!drawn) {
        // CRL-12: at or beyond an edge slot the item is not drawn: no width, beyond the stage's edge on its side, where
        // nothing of it (a focus ring) can show and no press reaches it. It stays in the list for assistive technology.
        item.place({ start: s > 0 ? view + gap : -gap, width: 0, content: hero, contentLeft: 0, scale, narrow: true });
        return;
      }
      const w = width.get(index)!;
      // What the drawn container leaves beside its content, which is H wide before the scale (CRL-15, CRL-26).
      const free = w - k * hero;
      // CRL-15: centred, or the side nearest the hero — an item after it aligns its start, one before it its end.
      const contentLeft = towardHero && s !== 0 ? ((s > 0) !== rtl ? 0 : free) : free / 2;
      item.place({ start: starts.get(index)!, width: w, content: hero, contentLeft, scale, narrow: transit });
    });
    this.paintDots(p);
    this.syncEnds();
  }

  /** CRL-43: the previous control is disabled at (or on the way to) the first resting position, the next at the last. */
  private syncEnds() {
    const geometry = this.geometry;
    if (!geometry) return;
    const { first, last } = geometry.atEnds(geometry.position(this.target ?? this.offset));
    if (first !== this.firstDisabled) this.firstDisabled = first;
    if (last !== this.lastDisabled) this.lastDisabled = last;
  }

  /** CRL-29, CRL-36: each dot's stretch and fill for the position `p`; the value of the slider. */
  private paintDots(p: number) {
    const geometry = this.geometry;
    if (!geometry) return;
    const q = geometry.indicatorPosition(p);
    const current = geometry.nearestResting(p);
    if (current !== this.current) this.current = current;
    const progress = this.progressDrawn;
    this.renderRoot.querySelectorAll<HTMLElement>('.dot').forEach((dot, j) => {
      const w = Math.max(0, 1 - geometry.dotDistance(q, j));
      dot.style.setProperty('--_w', String(w));
      dot.classList.toggle('timed', progress && j === this.progressDot);
    });
    this.renderRoot.querySelector('.indicator')?.classList.toggle('progress', progress);
    // CRL-36: the dots may have been drawn again, or the progress may have stopped being drawn: the fill's animation follows.
    const timed = progress ? this.renderRoot.querySelectorAll('.dot')[this.progressDot]?.querySelector('.fill') : null;
    if (((this.progressAnimation?.effect as KeyframeEffect | null | undefined)?.target ?? null) !== (timed ?? null)) this.drawProgress();
  }

  /** CRL-17, CRL-32: one Tab stop — the item that last had keyboard focus, the one an advance kept, or else the resting item. */
  private syncTabStop() {
    const items = this.laidOut;
    const geometry = this.geometry;
    if (!geometry || !items.length) return;
    const stop = this.remembered ?? this.pinned ?? items[geometry.restingIndex(geometry.position(this.offset))];
    items.forEach((item, index) => item.setCarouselContext({ tabStop: item === stop, position: index + 1, size: items.length }));
  }

  // ── Scrolling ───────────────────────────────────────────────────────────────────────────────────

  /** CRL-14: the row scrolled: the items follow; a scroll that is not the carousel's own is the person's move. */
  private readonly onScroll = () => {
    const offset = this.readOffset();
    const own = Math.abs(offset - this.written) < 1;
    // The write has been reported: the next scroll event is someone else's, wherever it leads (back here, too).
    if (own) this.written = Number.NaN;
    if (this.touching) this.scrolledSinceTouch = true;
    this.place(offset);
    if (own && this.target === null) return;
    if (!own) {
      // CRL-33: the person (or the browser) moves the row; the clock waits for it to come to rest.
      this.moving = true;
      this.pinned = null;
      this.syncClock();
    }
    this.syncTabStop();
    // Not every engine ends every scroll with `scrollend` (Firefox after a wheel, older engines not at all): a pause ends
    // the person's scroll too. The carousel's own scrolls end by themselves.
    clearTimeout(this.idleTimer);
    if (this.target === null) this.idleTimer = setTimeout(() => this.onScrollEnd(), SCROLL_IDLE);
  };

  /** CRL-14: a scroll ended (a drag released, a wheel or trackpad gesture over): the row settles while snap is true. */
  private readonly onScrollEnd = () => {
    clearTimeout(this.idleTimer);
    if (this.target !== null || this.touching) return;
    this.settle();
  };

  private readonly onTouchStart = (event: TouchEvent) => {
    if (event.touches.length > 1) return;
    this.stopScrolling();
    this.touching = true;
    this.scrolledSinceTouch = false;
    this.fling = 0;
    this.samples = [];
    this.sample(event);
    this.syncClock();
  };

  /** CRL-14: the finger moved. */
  private readonly onTouchMove = (event: TouchEvent) => {
    if (this.touching && event.touches.length === 1) this.sample(event);
  };

  /** Where the finger of `event` is along the row, at the event's own time. */
  private sample(event: TouchEvent) {
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (touch) this.samples.push({ x: touch.clientX, time: event.timeStamp });
  }

  /**
   * CRL-14: the finger left the row: a release faster than FLING_VELOCITY is a fling, in its direction. The velocity is
   * the finger's over its moves in the last VELOCITY_WINDOW before the release, timed by the events' own time stamps, so
   * a busy main thread (or a frame that came late) does not slow a fling down — and none where the finger had held
   * still for longer than POINTER_STOPPED_TIME before it lifted (`stoppedBefore`): a row stopped on the item that was
   * wanted is not flung past it.
   */
  private readonly onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length || !this.touching) return;
    this.touching = false;
    const lastMove = this.samples[this.samples.length - 1]?.time;
    this.sample(event);
    const release = event.timeStamp;
    const stopped = lastMove === undefined || stoppedBefore(lastMove, release);
    const recent = this.samples.filter((sample) => release - sample.time <= VELOCITY_WINDOW);
    const [first, last] = [recent[0], recent[recent.length - 1]];
    // The finger moving toward the row's start scrolls it toward its end: toward the left, or the right in right-to-left.
    const toward = this.rtl ? 1 : -1;
    const velocity = !stopped && first && last && last.time > first.time ? (toward * (last.x - first.x)) / (last.time - first.time) : 0;
    // A touch that did not scroll the row (a tap, or the page's vertical scroll) is no fling of the row.
    this.fling = this.scrolledSinceTouch && Math.abs(velocity) >= FLING_VELOCITY ? (velocity > 0 ? 1 : -1) : 0;
    this.samples = [];
    this.syncClock();
    // A touch that never scrolled (or stopped a settle) settles now. One that scrolled a row that snaps settles from
    // where the finger let go — on the next resting position after a fling, on the nearest one otherwise — and the row
    // is held still while it does: the browser's own momentum, which carries a quick stroke on (to the row's end) even
    // where the finger stopped before it lifted, would otherwise choose the resting position instead of the release. A
    // row that does not snap comes to rest where the browser's scroll ends: by `scrollend`, or, where none comes and
    // the finger had come to rest before it lifted (so no scroll event follows either), once no scroll has come for a
    // moment.
    if (!this.scrolledSinceTouch) this.settle();
    else if (this.snap === false) {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.onScrollEnd(), SCROLL_IDLE);
    } else {
      clearTimeout(this.idleTimer);
      this.settle({ release: true });
      this.hold(this.target !== null);
    }
  };

  /** Holds the row still — no momentum, no pan — while a touch release's settle runs (CRL-14); the scroll offset stays settable. */
  private hold(on: boolean) {
    this.scroller?.classList.toggle('held', on);
  }

  /**
   * A wheel or a trackpad takes over from a running settle; Shift with a vertical wheel scrolls the row (CRL-14). A
   * sideways wheel toward an end the row stands at is cancelled, so that it does not reach the page (`containWheel()`).
   */
  private readonly onWheel = (event: WheelEvent) => {
    this.takeOver();
    if (event.shiftKey && event.deltaX === 0 && event.deltaY !== 0 && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      event.preventDefault();
      this.scroller?.scrollBy({ left: event.deltaY });
      return;
    }
    containWheel(event, event.currentTarget as Element);
  };

  /**
   * The person takes over from a motion the carousel runs (a wheel, a mouse press): it stops where it is, and, unless a
   * scroll follows, the row comes to rest — settling first while snap is true — once no scroll has come for a moment.
   */
  private takeOver() {
    if (this.target === null) return;
    this.stopScrolling();
    this.moving = true;
    this.pinned = null;
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.onScrollEnd(), SCROLL_IDLE);
  }

  /**
   * CRL-14: while snap is true, the row comes to rest at a resting position — the next one in the direction of a fling,
   * or the nearest. With `release`, the settle is a touch release's: it claims the row from the release (whatever the
   * pan or the momentum moved before its first frame), and runs even where the row is already at the resting position,
   * so that the row stays held until its first frame; a settle after a scroll ended yields to a scroll that comes before
   * its first frame.
   */
  private settle({ release = false } = {}) {
    const geometry = this.geometry;
    const direction = this.fling;
    this.fling = 0;
    if (!geometry || this.snap === false) {
      this.atRest();
      return;
    }
    const offset = this.readOffset();
    const target = geometry.offset(geometry.settlePosition(geometry.position(offset), direction));
    if (release || Math.abs(target - offset) >= 0.5) this.scrollRowTo(target, { from: offset, claim: release });
    else this.atRest();
  }

  /**
   * The row came to rest. CRL-27: a looping row moves by whole turns back to the middle of its track (which draws nothing
   * new). CRL-33: the clock starts again from zero after the row moved — and only then: an engine reports the end of the
   * carousel's own scroll (`scrollend`) when it next updates its rendering, which may be long after the row came to rest,
   * and a row that has been at rest since keeps the time it has counted (CRL-32).
   */
  private atRest() {
    const geometry = this.geometry;
    const moved = this.moving;
    this.moving = false;
    if (geometry) {
      const p = geometry.position(this.readOffset());
      const centred = geometry.recentre(p);
      if (centred !== p) this.setOffset(geometry.offset(centred));
      this.progressDot = geometry.nearestResting(centred);
    }
    if (moved) {
      this.elapsed = 0;
      this.runningSince = null;
      this.stopClock();
    }
    this.syncTabStop();
    this.place(this.readOffset());
    this.syncClock();
  }

  /**
   * The motion of a settle, a scroll into place and a dot's move (CRL-14, CRL-18, CRL-30), or of an advance (CRL-32):
   * the tokens through real properties, 0 where reduced.
   */
  private motion(kind: Motion): { duration: number; easing: string } {
    const carrier = kind === 'autoplay' ? this.renderRoot.querySelector('.timing') : this.scroller;
    const style = getComputedStyle(carrier ?? this);
    return { duration: (Number.parseFloat(style.animationDuration) || 0) * 1000, easing: style.animationTimingFunction || 'ease' };
  }

  private stopScrolling() {
    cancelAnimationFrame(this.scrollFrame);
    this.scrolling?.cancel();
    this.scrolling = null;
    this.target = null;
    this.hold(false);
  }

  /**
   * Scrolls from `from` to `to` over the motion's duration and easing, or at once where motion is reduced. It starts in
   * the next frame. With `claim`, that first frame replaces whatever scrolled the row since the call (the browser's own
   * jump to a focused element, the momentum after a fling); without it, a scroll that came before the first frame wins,
   * as one that comes during the motion does. The easing's progress is read from an effect without a target, so the
   * scroll follows the token's curve.
   */
  private scrollRowTo(to: number, { from = this.offset, claim = true, kind = 'scroll' as Motion } = {}) {
    this.stopScrolling();
    const { duration, easing } = this.motion(kind);
    this.target = to;
    this.moving = true;
    this.syncClock();
    // Where the row was when the carousel last set it: a scroll away from there is someone else's (the product's, the
    // browser's), which wins and settles in its turn.
    let last: number | null = claim ? null : this.readOffset();
    const overtaken = () => {
      if (last === null || Math.abs(this.readOffset() - last) <= 1) return false;
      this.stopScrolling();
      this.onScroll();
      return true;
    };
    const finish = () => {
      this.scrolling = null;
      this.target = null;
      this.hold(false);
      this.atRest();
    };
    if (Math.abs(to - from) < 0.5 || duration <= 0 || typeof KeyframeEffect === 'undefined') {
      this.scrollFrame = requestAnimationFrame(() => {
        if (overtaken()) return;
        this.setOffset(to);
        finish();
      });
      return;
    }
    const timing = new Animation(new KeyframeEffect(null, [], { duration, easing, fill: 'forwards' }));
    this.scrolling = timing;
    timing.play();
    const step = () => {
      if (this.scrolling !== timing || overtaken()) return;
      const progress = timing.effect?.getComputedTiming().progress ?? 1;
      this.setOffset(from + (to - from) * (progress ?? 1));
      last = this.readOffset();
      if (timing.playState === 'finished') {
        finish();
        return;
      }
      this.scrollFrame = requestAnimationFrame(step);
    };
    this.scrollFrame = requestAnimationFrame(step);
  }

  /** Moves the row to `position` over the scroll motion, as the person asked (a key, a dot): the Tab stop follows (CRL-30). */
  private moveTo(position: number) {
    const geometry = this.geometry;
    if (!geometry) return;
    this.pinned = null;
    this.remembered = this.laidOut[geometry.restingIndex(position)] ?? null;
    this.scrollRowTo(geometry.offset(position));
    this.syncTabStop();
  }

  // ── Focus and keys ──────────────────────────────────────────────────────────────────────────────

  /** The item an event came from. */
  private itemOf(event: Event): TanreiCarouselItem | null {
    for (const node of event.composedPath()) {
      if (node === this) return null;
      if (node instanceof TanreiCarouselItem && node.parentElement === this) return node;
    }
    return null;
  }

  /** A mouse or a pen takes over from a running motion (a touch does in onTouchStart). CRL-33: a press holds autoplay. */
  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') this.takeOver();
    this.pressing = true;
    this.syncClock();
  };

  private readonly onPointerUp = () => {
    if (!this.pressing) return;
    this.pressing = false;
    this.syncClock();
  };

  /** CRL-33: the hover hold; leaving ends a hold that playing lifted. */
  private readonly onPointerEnter = () => {
    this.hovering = true;
    this.syncClock();
  };

  private readonly onPointerLeave = () => {
    this.hovering = false;
    this.hoverLifted = false;
    this.syncClock();
  };

  /**
   * CRL-17: the focused item becomes the Tab stop. CRL-18: keyboard or assistive-technology focus — focus the browser
   * shows, `:focus-visible`, which a pointer's never is — brings it into place over the scroll motion. CRL-33: focus
   * within holds autoplay, however it came there.
   */
  private readonly onFocusIn = (event: FocusEvent) => {
    this.focusWithin = true;
    this.syncClock();
    const item = this.itemOf(event);
    if (!item) return;
    this.remembered = item;
    this.syncTabStop();
    if (item.shadowRoot?.activeElement?.matches(':focus-visible')) this.reveal(item);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && (this.contains(next) || this.renderRoot.contains(next))) return;
    this.focusWithin = false;
    this.focusLifted = false;
    this.syncClock();
  };

  /** CRL-18: slot 0 (or as near as the range allows, the shorter way round), or wholly in view with the least scroll. */
  private reveal(item: TanreiCarouselItem) {
    const geometry = this.geometry;
    const index = this.laidOut.indexOf(item);
    if (!geometry || index < 0) return;
    this.pinned = null;
    this.scrollRowTo(geometry.offset(geometry.revealPosition(index, geometry.position(this.offset))), { from: this.offset });
  }

  /** CRL-17: Right / Left Arrow (mirrored in right-to-left) to the next and previous item, wrapping while loop is in effect; Home and End. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const item = this.itemOf(event);
    if (!item) return;
    const rtl = this.rtl;
    const keys: Record<string, string> = { ArrowRight: rtl ? 'ArrowUp' : 'ArrowDown', ArrowLeft: rtl ? 'ArrowDown' : 'ArrowUp', Home: 'Home', End: 'End' };
    const key = keys[event.key];
    if (!key) return;
    const items = this.laidOut;
    const roving = this.geometry?.loop ? this.loopKeys : this.itemKeys;
    const target = roving.target(key, items.indexOf(item), items.map((each) => ({ focusable: true, label: each.label })));
    // The arrow keys never scroll the row themselves.
    event.preventDefault();
    if (target === null || items[target] === item) return;
    items[target].focusButton({ preventScroll: true });
  };

  // ── The indicator (CRL-29 – CRL-31) ─────────────────────────────────────────────────────────────

  /** CRL-5 / CRL-6: the indicator's pressed state, by pointer or touch only, lasting as long as the press. */
  private readonly indicatorPress = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.indicator') ?? null,
    holdCarrier: () => this.renderRoot?.querySelector('.indicator .hold') ?? null,
    disabled: () => false,
    keys: [],
  });

  /** CRL-5 / CRL-6: the playback control's pressed state. */
  private readonly playbackPress = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.playback') ?? null,
    holdCarrier: () => this.renderRoot?.querySelector('.playback .hold') ?? null,
    disabled: () => false,
  });

  /** CRL-30: the dot nearest a point along the indicator. */
  private dotAt(x: number): number {
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    this.renderRoot.querySelectorAll<HTMLElement>('.dot').forEach((dot, j) => {
      const box = dot.getBoundingClientRect();
      const d = Math.abs(x - (box.left + box.width / 2));
      if (d < distance) {
        distance = d;
        nearest = j;
      }
    });
    return nearest;
  }

  /** CRL-30: moves the row to dot `j`'s resting position, unless it is already going there. */
  private toDot(j: number) {
    const geometry = this.geometry;
    if (!geometry || j < 0 || j === this.indicatorDot) return;
    this.indicatorDot = j;
    this.moveTo(geometry.restingPosition(j, geometry.position(this.target ?? this.offset)));
  }

  private readonly onIndicatorPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const indicator = event.currentTarget as HTMLElement;
    indicator.setPointerCapture?.(event.pointerId);
    this.indicatorPointer = event.pointerId;
    this.indicatorDot = -1;
    this.indicatorPress.onPointerDown(event);
    syncFocusStyle(this, indicator);
    this.toDot(this.dotAt(event.clientX));
  };

  private readonly onIndicatorPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.indicatorPointer) return;
    this.toDot(this.dotAt(event.clientX));
  };

  private readonly onIndicatorPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.indicatorPointer) return;
    this.indicatorPointer = null;
    this.indicatorDot = -1;
    this.indicatorPress.release(event);
  };

  /** CRL-30: Right / Left Arrow to the next and previous resting position (wrapping while loop is in effect), Home and End; mirrored in right-to-left. */
  private readonly onIndicatorKeyDown = (event: KeyboardEvent) => {
    const geometry = this.geometry;
    if (!geometry || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const rtl = this.rtl;
    const from = geometry.position(this.target ?? this.offset);
    let to: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const forward = (event.key === 'ArrowRight') !== rtl;
      to = geometry.stepResting(from, forward ? 1 : -1, geometry.loop);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // A slider's vertical arrows move it too (as the platform's own range input does, and as a screen reader's increment and decrement arrive).
      to = geometry.stepResting(from, event.key === 'ArrowUp' ? 1 : -1, geometry.loop);
    } else if (event.key === 'Home') {
      to = geometry.restingPosition(0, from);
    } else if (event.key === 'End') {
      to = geometry.restingPosition(geometry.restingCount - 1, from);
    }
    if (to === null) return;
    event.preventDefault();
    if (Math.abs(to - from) > 1e-3) this.moveTo(to);
  };

  private readonly onIndicatorFocus = (event: FocusEvent) => {
    syncFocusStyle(this, event.currentTarget as HTMLElement);
  };

  // ── The previous and next controls (CRL-41 – CRL-43) ─────────────────────────────────────────────

  /**
   * CRL-43: one resting position back or on from where the row is — or is going, so that presses in a row add up — over
   * the scroll motion; round the ring under loop. The items' Tab stop follows; focus stays on the control. The move is
   * the person's: autoplay's time starts from zero once the row is at rest (CRL-33).
   */
  private navigate(direction: 1 | -1) {
    const geometry = this.geometry;
    if (!geometry) return;
    const from = geometry.position(this.target ?? this.offset);
    const to = geometry.adjacentResting(from, direction);
    if (Math.abs(to - from) > 1e-3) this.moveTo(to);
    this.syncEnds();
  }

  private readonly onPrevious = () => this.navigate(-1);
  private readonly onNext = () => this.navigate(1);

  /** CRL-41: each control is told the variant its token names, through the channel a Button reads from the component that places it (BTN-10). */
  private giveVariants() {
    const variant = compChoice(this, '--tanrei-comp-carousel-navigation-button-variant', BUTTON_VARIANTS);
    for (const control of NAV_CONTROLS) giveVariant(this.renderRoot?.querySelector(`tanrei-button.${control}`), variant);
  }

  private navControl(control: NavControl) {
    const label = control === 'previous' ? this.words.get('previousItemLabel', this.previousLabel) : this.words.get('nextItemLabel', this.nextLabel);
    return html`<tanrei-button
      part=${control}
      exportparts=${NAV_PARTS[control].attribute}
      class="navigation ${control} ${this.drawnNavigation}"
      size="medium"
      label=${label}
      .focusableWhenDisabled=${true}
      .disabled=${control === 'previous' ? this.firstDisabled : this.lastDisabled}
      @click=${control === 'previous' ? this.onPrevious : this.onNext}
      ><span slot="icon">${NAV_GLYPHS[control]}</span></tanrei-button
    >`;
  }

  // ── Autoplay (CRL-32 – CRL-36) ──────────────────────────────────────────────────────────────────

  /** How long the row rests before it advances, in ms: `autoplayInterval`, or comp.carousel.autoplay.interval through a real property. */
  private interval(): number {
    const own = positive(this.autoplayInterval);
    if (own !== null) return own;
    const timing = this.renderRoot?.querySelector('.timing');
    const seconds = timing ? Number.parseFloat(getComputedStyle(timing).transitionDelay) : Number.NaN;
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
  }

  /** CRL-33: whether a hold is in effect. */
  private get held(): boolean {
    return (this.hovering && !this.hoverLifted) || (this.focusWithin && !this.focusLifted) || this.pressing || this.touching || this.documentHidden;
  }

  /** CRL-32, CRL-34: whether the clock runs now. */
  private get clockRuns(): boolean {
    return this.isConnected && this.autoplay && !this.paused && this.restingCount >= 2 && !this.reducedMotion && !this.held && !this.moving && this.interval() > 0;
  }

  /** The time of the interval that has passed, in ms. */
  private passed(now = performance.now()): number {
    return this.elapsed + (this.runningSince === null ? 0 : now - this.runningSince);
  }

  /** Starts or stops the clock as the conditions of CRL-32 – CRL-34 say; a stop keeps the time that has passed. */
  private syncClock() {
    const runs = this.clockRuns;
    const interval = runs ? this.interval() : 0;
    if (runs && (this.runningSince === null || this.timedInterval !== interval)) {
      // The clock starts — or runs on under a new interval (CRL-32): the advance is timed for what is left of the
      // interval as it is now, so that the row moves when the fill of CRL-36, which is drawn against it, is full.
      this.runningSince ??= performance.now();
      this.timedInterval = interval;
      clearTimeout(this.advanceTimer);
      this.advanceTimer = setTimeout(this.onTimeUp, Math.max(0, interval - this.passed()));
    } else if (!runs && this.runningSince !== null) {
      this.elapsed = this.passed();
      this.stopClock();
    }
    this.drawProgress();
  }

  private stopClock() {
    this.runningSince = null;
    clearTimeout(this.advanceTimer);
    // CRL-36: the fill stops with the clock, where it is; drawProgress() puts it where the clock says.
    if (this.progressAnimation?.playState === 'running') this.progressAnimation.pause();
  }

  /** CRL-32: the interval has passed with the row at rest: on to the next resting position, or from the last back to the first. */
  private readonly onTimeUp = () => {
    const geometry = this.geometry;
    if (!geometry || !this.clockRuns) return;
    // A timer may fire a little early: the clock decides, not the timer.
    const remaining = this.interval() - this.passed();
    if (remaining > 1) {
      this.advanceTimer = setTimeout(this.onTimeUp, remaining);
      return;
    }
    this.elapsed = this.interval();
    this.stopClock();
    this.drawProgress();
    // An advance moves neither focus nor the items' Tab stop.
    const items = this.laidOut;
    this.pinned = this.remembered ?? this.pinned ?? items[geometry.restingIndex(geometry.position(this.offset))] ?? null;
    const to = geometry.stepResting(geometry.position(this.offset), 1, true);
    this.scrollRowTo(geometry.offset(to), { kind: 'autoplay' });
  };

  /**
   * CRL-36: the current dot's fill, as the part of the interval that has passed. One animation of the interval's length
   * draws it — the fill's scale along the row, from nothing at its start edge to the whole dot, at an even pace — and the
   * browser runs it: script writes only when the clock starts or stops (a hold, a pause, the row moving, a new
   * interval), putting the animation at the time the clock has counted and letting it run or holding it there.
   */
  private drawProgress() {
    const dot = this.renderRoot?.querySelectorAll<HTMLElement>('.dot')[this.progressDot];
    this.renderRoot?.querySelectorAll<HTMLElement>('.dot.timed').forEach((each) => each !== dot && each.classList.remove('timed'));
    const fill = dot?.querySelector<HTMLElement>('.fill');
    const interval = this.interval();
    if (!this.progressDrawn || !dot || !fill || !(interval > 0) || typeof fill.animate !== 'function') {
      this.endProgress();
      return;
    }
    dot.classList.add('timed');
    let animation = this.progressAnimation;
    const effect = animation?.effect as KeyframeEffect | null | undefined;
    if (!animation || effect?.target !== fill || effect.getTiming().duration !== interval) {
      this.endProgress();
      animation = this.progressAnimation = fill.animate({ transform: ['scaleX(0)', 'scaleX(1)'] }, { duration: interval, easing: 'linear', fill: 'both' });
      animation.pause();
    }
    animation.currentTime = Math.min(interval, this.passed());
    if (this.runningSince !== null) animation.play();
    else if (animation.playState !== 'paused') animation.pause();
  }

  private endProgress() {
    this.progressAnimation?.cancel();
    this.progressAnimation = null;
  }

  /** CRL-35: the person pauses or plays; on play the time starts from zero and the hover and focus holds in effect are lifted (CRL-33). */
  private readonly onPlaybackClick = () => {
    const paused = !this.paused;
    this.paused = paused;
    if (!paused) {
      this.elapsed = 0;
      this.runningSince = null;
      this.stopClock();
      this.hoverLifted = this.hovering;
      this.focusLifted = this.focusWithin;
    }
    this.syncClock();
    this.dispatchEvent(new CustomEvent<TanreiCarouselPausedChangeDetail>('pausedchange', { detail: { paused }, bubbles: true, composed: true }));
  };

  private readonly onPlaybackFocus = (event: FocusEvent) => {
    syncFocusStyle(this, event.currentTarget as HTMLElement);
  };

  /** CRL-34: reduced motion stops autoplay; when it stops being reduced, autoplay starts again with the time from zero. */
  private readonly onMotionChange = (event: MediaQueryListEvent) => {
    this.reducedMotion = event.matches;
    if (!event.matches) {
      this.elapsed = 0;
      this.runningSince = null;
      this.stopClock();
    }
    this.syncClock();
  };

  /** CRL-33: a hidden document holds autoplay. */
  private readonly onVisibilityChange = () => {
    this.documentHidden = document.visibilityState === 'hidden';
    this.syncClock();
  };

  /**
   * CRL-38: the playback glyphs are drawn only once the icon set can draw them — before that the glyph's box stays and
   * shows nothing, never the glyph's name as text. A face that never loads leaves the box empty.
   */
  private async checkGlyphs() {
    if (this.glyphReady) return;
    const icon = this.renderRoot.querySelector<HTMLElement>('.playback .icon');
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!icon) return;
    if (!fonts) {
      this.glyphReady = true;
      return;
    }
    const style = getComputedStyle(icon);
    const font = `${style.fontSize} ${style.fontFamily}`;
    const text = `${PAUSE_GLYPH}${PLAY_GLYPH}`;
    try {
      if (fonts.check(font, text)) {
        this.glyphReady = true;
        return;
      }
      const faces = await fonts.load(font, text);
      if (faces.length || fonts.check(font, text)) this.glyphReady = true;
    } catch {
      // A font string the engine cannot parse: nothing to wait for.
      this.glyphReady = true;
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────────────────────────

  protected override firstUpdated() {
    this.observeRow();
    this.arrange();
  }

  private observeRow() {
    const row = this.scroller;
    if (row) this.resize$?.observe(row);
  }

  /** CRL-20, CRL-24: what a debug build reports, each once per value. */
  private reportOnce(key: string, value: unknown, id: string, message: string) {
    if (Object.is(this.reported.get(key), value)) return;
    this.reported.set(key, value);
    report(this, id, message, { once: false });
  }

  protected override updated(changed: PropertyValues<this>) {
    // CRL-20: a list and an indicator without a name; a playback control without its names.
    if (changed.has('label') && !this.label.trim()) report(this, 'CRL-20', 'label is empty, so the carousel’s list and its indicator have no accessible name; give it a label ("Recently played")');
    if ((changed.has('autoplay') || changed.has('playbackControl') || changed.has('playLabel') || changed.has('pauseLabel')) && this.autoplay && this.playbackControl) {
      const missing = [this.words.lacks('playLabel', this.playLabel) && 'play-label', this.words.lacks('pauseLabel', this.pauseLabel) && 'pause-label'].filter(Boolean).join(' and ');
      if (missing) this.reportOnce('labels', missing, 'CRL-20', `autoplay is on and the playback control is drawn, but ${missing} is empty, so the control has no accessible name in that state; give it both labels ("Pause the slideshow", "Play the slideshow")`);
      else this.reported.delete('labels');
    }
    // CRL-20: the previous and next controls without their names.
    if (this.navigationDrawn) {
      if (!this.words.get('previousItemLabel', this.previousLabel)) this.words.missing('previousItemLabel', { prop: 'previousLabel', id: 'CRL-20', effect: 'the previous control is drawn and has no accessible name' });
      if (!this.words.get('nextItemLabel', this.nextLabel)) this.words.missing('nextItemLabel', { prop: 'nextLabel', id: 'CRL-20', effect: 'the next control is drawn and has no accessible name' });
    }
    this.giveVariants();
    // CRL-24: an unknown alignment is drawn as the default; an itemWidth or autoplayInterval that is not a positive number is null.
    if (changed.has('heroAlignment') && !HERO_ALIGNMENTS.includes(this.heroAlignment)) {
      this.reportOnce('heroAlignment', this.heroAlignment, 'CRL-24', `heroAlignment "${this.heroAlignment}" is not a hero alignment of the carousel; it is drawn as "center"`);
    }
    if (changed.has('contentAlignment') && !CONTENT_ALIGNMENTS.includes(this.contentAlignment)) {
      this.reportOnce('contentAlignment', this.contentAlignment, 'CRL-24', `contentAlignment "${this.contentAlignment}" is not a content alignment of the carousel; it is drawn as "center"`);
    }
    if (changed.has('navigation') && !NAVIGATIONS.includes(this.navigation)) {
      this.reportOnce('navigation', this.navigation, 'CRL-24', `navigation "${this.navigation}" is not a navigation of the carousel; it is drawn as "auto"`);
    }
    if (changed.has('itemWidth') && this.itemWidth !== null && this.itemWidth !== undefined && positive(this.itemWidth) === null) {
      this.reportOnce('itemWidth', this.itemWidth, 'CRL-24', `itemWidth ${String(this.itemWidth)} is not a positive number of CSS pixels; comp.carousel.container.large-width is used instead`);
    }
    if (changed.has('autoplayInterval') && this.autoplayInterval !== null && this.autoplayInterval !== undefined && positive(this.autoplayInterval) === null) {
      this.reportOnce('autoplayInterval', this.autoplayInterval, 'CRL-24', `autoplayInterval ${String(this.autoplayInterval)} is not a positive number of milliseconds; comp.carousel.autoplay.interval is used instead`);
    }
    const geometryChanged = ['heroAlignment', 'itemWidth', 'fluidWidth', 'scaleOthers', 'snap', 'loop', 'indicator'].some((name) => changed.has(name as keyof TanreiCarousel));
    if (this.hasUpdated && geometryChanged) this.arrange();
    else if (['contentAlignment', 'restingCount', 'indicatorFits', 'autoplayProgress', 'paused', 'reducedMotion'].some((name) => changed.has(name as keyof TanreiCarousel))) {
      this.place(this.offset);
    }
    if (['autoplay', 'paused', 'autoplayInterval', 'restingCount', 'reducedMotion', 'autoplayProgress'].some((name) => changed.has(name as keyof TanreiCarousel))) {
      this.syncClock();
    }
    if (this.playbackDrawn && !this.glyphReady) void this.checkGlyphs();
  }

  protected override render() {
    const d = this.restingCount;
    const indicator = this.indicatorDrawn;
    const playback = this.playbackDrawn;
    const navigation = this.navigationDrawn;
    const current = Math.min(this.current, Math.max(0, d - 1));
    const geometry = this.geometry;
    // CRL-8, CRL-9: the hero's width where the product names one — the row's own width in a box as wide as its content.
    const hero = positive(this.itemWidth);
    const valueText = geometry ? (this.laidOut[geometry.restingIndex(geometry.restingPosition(current, geometry.middle + current))]?.label ?? '') : '';
    // The playback control comes first in the tree, so that it is the first Tab stop (CRL-17); it is drawn in the
    // controls row, at its inline end (CRL-28).
    // The previous and next controls come next, before the row, over whose ends they are drawn (CRL-17, CRL-41).
    // The row is no Tab stop of its own (CRL-17: at most five): Firefox makes every scroller one, so it is taken out
    // of the order (`tabindex="-1"`). The keys reach the items, which bring themselves into place (CRL-18).
    return html`
      ${playback
        ? html`<button
            part="playback"
            class="control playback"
            type="button"
            data-tanrei-shape
            aria-label=${(this.paused ? this.words.get('playLabel', this.playLabel) : this.words.get('pauseLabel', this.pauseLabel)) || nothing}
            @click=${this.onPlaybackClick}
            @focus=${this.onPlaybackFocus}
            @pointerdown=${this.playbackPress.onPointerDown}
            @pointerup=${this.playbackPress.release}
            @pointercancel=${this.playbackPress.release}
            @pointerleave=${this.playbackPress.release}
            @keydown=${this.playbackPress.onKeyDown}
            @keyup=${this.playbackPress.onKeyUp}
            @blur=${this.playbackPress.onBlur}
          >
            <span class="icon hold${this.glyphReady ? '' : ' loading'}" aria-hidden="true">${this.paused ? PLAY_GLYPH : PAUSE_GLYPH}</span>
          </button>`
        : nothing}
      <div class="viewport">
      ${navigation ? NAV_CONTROLS.map((control) => this.navControl(control)) : nothing}
      <div
        part="row"
        class="scroller"
        style=${hero === null ? nothing : `--_hero: ${hero}px`}
        tabindex="-1"
        @scroll=${this.onScroll}
        @scrollend=${this.onScrollEnd}
        @touchstart=${{ handleEvent: this.onTouchStart, passive: true }}
        @touchmove=${{ handleEvent: this.onTouchMove, passive: true }}
        @touchend=${{ handleEvent: this.onTouchEnd, passive: true }}
        @touchcancel=${{ handleEvent: this.onTouchEnd, passive: true }}
        @wheel=${{ handleEvent: this.onWheel, passive: false }}
      >
        <div class="track">
          <div part="list" class="stage" role="list" aria-label=${this.label || nothing}><slot @slotchange=${() => this.arrange()}></slot></div>
        </div>
      </div>
      </div>
      ${indicator || playback
        ? html`<div part="controls" class="controls">
            ${indicator
              ? html`<div
                  part="indicator"
                  class="control indicator"
                  data-tanrei-shape
                  role="slider"
                  tabindex="0"
                  aria-label=${this.label || nothing}
                  aria-orientation="horizontal"
                  aria-valuemin="1"
                  aria-valuemax=${String(d)}
                  aria-valuenow=${String(current + 1)}
                  aria-valuetext=${valueText || nothing}
                  @pointerdown=${this.onIndicatorPointerDown}
                  @pointermove=${this.onIndicatorPointerMove}
                  @pointerup=${this.onIndicatorPointerUp}
                  @pointercancel=${this.onIndicatorPointerUp}
                  @lostpointercapture=${this.onIndicatorPointerUp}
                  @keydown=${this.onIndicatorKeyDown}
                  @focus=${this.onIndicatorFocus}
                >
                  <span class="hold" hidden></span>
                  ${Array.from({ length: d }, () => html`<span part="dot" class="dot" aria-hidden="true"><span class="fill"></span></span>`)}
                </div>`
              : nothing}
          </div>`
        : nothing}
      <span class="probe" aria-hidden="true"></span>
      <span class="probe probe-controls" aria-hidden="true"></span>
      ${DIRECTION_PROBE}
      <span class="timing" aria-hidden="true"></span>
    `;
  }
}

if (!customElements.get('tanrei-carousel-item')) customElements.define('tanrei-carousel-item', TanreiCarouselItem);
if (!customElements.get('tanrei-carousel')) customElements.define('tanrei-carousel', TanreiCarousel);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-carousel': TanreiCarousel;
    'tanrei-carousel-item': TanreiCarouselItem;
  }
}
