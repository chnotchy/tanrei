import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  DIRECTION_PROBE,
  DirectionController,
  SystemWatchController,
  compChoice,
  countWork,
  parseValues,
  report,
  styleQueries,
  syncFocusStyle,
  tabbables,
} from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import { delegatedAria, delegatesAria, namedByProduct } from '../../primitives/delegated-aria.js';
import { CHOICE, EDGES, type Edge, FORMS, LAYERS, SCROLL_EDGES, styles } from './scroll-area.styles.js';

/** How an edge shows that content lies beyond it; `auto` takes the design system's answer (`comp.scroll-area.scroll-edge`). */
export type TanreiScrollAreaScrollEdge = (typeof SCROLL_EDGES)[number];
/** An edge the area can watch: `start` and `end` follow the layout direction. */
export type TanreiScrollAreaEdge = Edge;

/** The most blur layers drawn, whatever `blur.layers` says: each is a backdrop filter over the band, drawn in every frame of a scroll. */
const MOST_LAYERS = 16;
/** How far past an end the content must be scrolled before content lies beyond that edge: the sentinels' thickness, so the two readings agree. */
const SENTINEL = 1;

/**
 * A box that scrolls the product's content with the platform's own scrolling and shows, at each edge it watches, that
 * more lies beyond it — a band in the surface's color, a fade of the content, a line or a blur, as the design system
 * or the instance chooses — without changing its size or moving the content.
 *
 * Contract: specs/scroll-area.spec.json. The host is as large as its layout gives it (a height, a max-height, a share
 * of a flex or grid track); the content is laid out at its width and scrolls in each direction it does not fit. The
 * area lays out and styles nothing inside it, draws no fill, edge or corner of its own, and keeps the browser's scroll
 * bars.
 *
 * `scroll-edge` chooses the mark: `shadow` (a band `comp.scroll-area.shadow.extent` deep in
 * `--tanrei-comp-scroll-area-shadow-color`), `fade` (the content fades toward the edge: for a transparent surface, a
 * picture or a video behind), `line`, `blur` (a browser without backdrop filters draws shadow) or `none`; `auto`, the
 * default, takes `comp.scroll-area.scroll-edge`, which follows `sys.behavior.scroll-edge`. The shadow's color is the
 * surface the area stands on, `sys.color.surface` by default: on another surface (a card, a sheet, a container color)
 * set `--tanrei-comp-scroll-area-shadow-color` on the element or an ancestor to that surface's color.
 *
 * Whether content lies beyond an edge is told by one IntersectionObserver on four sentinels at the ends of the content
 * (and, when a size changes, by the scroll's own extents): no scroll listener, no layout read while scrolling — only
 * `scrollend`, once a sideways scroll has ended, keeps the distance from the start edge for a flip of direction. While
 * the content scrolls and nothing inside it takes focus, the box is one stop in the focus order, a region named by
 * `label`, so that a keyboard can scroll it.
 *
 * @tag tanrei-scroll-area
 * @slot - The content the area scrolls.
 * @csspart container - The scroll box: its scroll bars are the browser's own.
 * @cssprop --tanrei-comp-scroll-area-shadow-color - The shadow band's color: the surface the area stands on.
 */
export class TanreiScrollArea extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'scroll-area');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    scrollEdge: { type: String, attribute: 'scroll-edge', reflect: true },
    edges: { attribute: 'edges', converter: { fromAttribute: parseValues, toAttribute: (value: string[]) => value.join(' ') } },
    label: { type: String },
    focusStop: { state: true },
    layers: { state: true },
  };

  /**
   * How an edge shows that content lies beyond it: `shadow`, `fade`, `line`, `blur` or `none`; `auto` (the default)
   * takes `comp.scroll-area.scroll-edge`. Anything else is `auto`, reported in debug builds (SCA-15). Reflected.
   */
  scrollEdge: TanreiScrollAreaScrollEdge = 'auto';

  /**
   * Which edges show the scroll edge: any of `top`, `bottom`, `start`, `end` (start is the left in left-to-right, the
   * right in right-to-left). The attribute is space-separated. Any other name is ignored, reported in debug builds.
   */
  edges: TanreiScrollAreaEdge[] = ['top', 'bottom'];

  /** The name of the box while it is a focus stop of its own (SCA-10): what it holds ("Messages"). Never drawn. */
  label = '';

  /** SCA-10: the box is a focus stop and a region — the content scrolls and nothing inside takes focus. */
  private focusStop = false;

  /** SCA-6: how many layers the blur is drawn in, `blur.layers` as the cascade gives it when the area renders. */
  private layers = 1;

  /** Whether content lies beyond each edge, named or not. */
  private readonly beyond: Record<Edge, boolean> = { top: false, bottom: false, start: false, end: false };

  /** Whether the content does not fit, in either direction. */
  private scrolls = false;
  /** Whether the box's fit has been read once (SCA-18). */
  private sized = false;

  /** The sizes of the box's scroll bars as last written (left, right, bottom). */
  private bars = '';

  private intersections: IntersectionObserver | null = null;
  private sizes: ResizeObserver | null = null;

  /** SCA-7, SCA-15: without style queries the form is read from the cascade when the area renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  /** SCA-14: how far the box was scrolled from its start edge when a scroll last ended. */
  private fromStart = 0;

  /** SCA-14: the direction `fromStart` was kept in: the one the box was last drawn for. */
  private keptIn: 'ltr' | 'rtl' | null = null;

  /**
   * SCA-14: the distance from the start edge, kept — unless the direction around the box has changed and the area has
   * not yet drawn itself for it: the engine's own move back to the start (WebKit reports it, and its scroll's end,
   * before the direction is seen) is not a scroll of the person's.
   */
  private keep(along: number) {
    const now = this.matches(':dir(rtl)') ? 'rtl' : 'ltr';
    if (this.keptIn !== null && now !== this.keptIn) return;
    this.keptIn = now;
    this.fromStart = along;
  }

  /**
   * SCA-14: drawn for a new direction at once, keeping the scroll position from the start edge. Every engine puts a box
   * back at its start when the direction around it flips, so the distance from the start edge kept when the last scroll
   * ended is given back, before the frame is painted. The fade's mask is placed by physical sides, so the flip moves it,
   * which its transition would run: the transitions the flip started are finished.
   */
  private readonly direction = new DirectionController(this, (direction) => {
    this.keptIn = direction;
    const box = this.box;
    if (box) box.scrollLeft = direction === 'rtl' ? -this.fromStart : this.fromStart;
    for (const animation of this.renderRoot.querySelector('.frame')?.getAnimations({ subtree: true }) ?? []) {
      if (animation instanceof CSSTransition) animation.finish();
    }
  });

  private get frame(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.frame');
  }

  private get box(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.scroll');
  }

  /** The edges named, in their own order, without the names that are not edges. */
  private get named(): Edge[] {
    const given = Array.isArray(this.edges) ? this.edges : parseValues(String(this.edges ?? ''));
    return EDGES.filter((edge) => given.includes(edge));
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.observe();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.intersections?.disconnect();
    this.sizes?.disconnect();
    this.intersections = null;
    this.sizes = null;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SCA-15: a scroll edge the area does not define is auto; an edge it does not know is ignored.
    if (changed.has('scrollEdge') && !(SCROLL_EDGES as readonly string[]).includes(this.scrollEdge)) {
      report(this, 'SCA-15', `scroll-edge "${this.scrollEdge}" is not a value of the scroll area; it is drawn as "auto"`);
    }
    if (changed.has('edges')) {
      const given = Array.isArray(this.edges) ? this.edges : parseValues(String(this.edges ?? ''));
      for (const name of given) {
        if (!(EDGES as readonly string[]).includes(name)) report(this, 'SCA-15', `edges names "${name}", which is not an edge of the scroll area (top, bottom, start, end); it is ignored`);
      }
    }
    // SCA-6: the blur is drawn in as many layers as the token says, read when the area renders.
    const count = Number.parseInt(getComputedStyle(this).getPropertyValue(LAYERS), 10);
    this.layers = Number.isFinite(count) ? Math.min(MOST_LAYERS, Math.max(1, count)) : 1;
  }

  protected override firstUpdated() {
    this.observe();
  }

  protected override updated(changed: PropertyValues<this>) {
    // SCA-7: without style queries, the name the cascade gives now is written for the styles to match.
    const frame = this.frame;
    if (frame) {
      if (styleQueries()) delete frame.dataset.scrollEdge;
      else frame.dataset.scrollEdge = compChoice(this, CHOICE, [...FORMS, 'none'] as const);
    }
    if (changed.has('edges')) this.writeEdges();
    // SCA-10: a focus stop with no name still takes focus, and says so in debug builds.
    if (((changed as Map<string, unknown>).has('focusStop') || changed.has('label')) && this.focusStop && !this.label && !namedByProduct(this)) {
      report(this, 'SCA-10', 'the content scrolls and nothing inside it takes focus, so the box is a focus stop of its own, a region — but label is empty and the region has no accessible name; give it a label');
    }
    this.checkProductName();
  }

  /** SCA-18: a name the product gives has no element to stand on while the box is no region — once its fit is known. */
  private checkProductName() {
    if (this.sized && !this.focusStop && namedByProduct(this)) {
      report(this, 'SCA-18', 'the name given on the element (aria-label or aria-labelledby) names nothing while the box is not a focus stop: it is a region only while the content scrolls and nothing inside takes focus (SCA-10); name what is inside, or give the box a label for when it is one');
    }
  }

  /** SCA-8: one IntersectionObserver on the box for the four sentinels, and one ResizeObserver for the box and the content. */
  private observe() {
    const box = this.box;
    if (!box || this.intersections) return;
    this.intersections = new IntersectionObserver(this.intersected, { root: box, threshold: 0 });
    for (const sentinel of this.renderRoot.querySelectorAll('.sentinel')) this.intersections.observe(sentinel);
    this.sizes = new ResizeObserver(this.resized);
    this.sizes.observe(box);
    const content = this.renderRoot.querySelector('.content');
    if (content) this.sizes.observe(content);
  }

  /**
   * SCA-8: a sentinel left or entered the box — the platform's own notice; nothing is measured. An edge has content
   * beyond it while its sentinel is out of the box. A notice of a box that is not drawn (no root bounds) says nothing.
   */
  private readonly intersected = (entries: IntersectionObserverEntry[]) => {
    countWork('scroll-area.intersected');
    for (const entry of entries) {
      const root = entry.rootBounds;
      if (!root || root.width === 0 || root.height === 0) continue;
      this.beyond[(entry.target as HTMLElement).dataset.edge as Edge] = !entry.isIntersecting;
    }
    this.edgesChanged();
  };

  /**
   * A size changed — of the box or of the content, never in a frame of a scroll. Read from the scroll's own extents
   * before the frame is painted, so that the first frame, and a frame after content was added, draws its edges; and
   * the scroll bars' sizes, which the marks stay inside.
   */
  private readonly resized = () => {
    countWork('scroll-area.resized');
    const box = this.box;
    if (!box || (!box.clientWidth && !box.clientHeight)) return;
    const { scrollTop, scrollHeight, clientHeight, scrollWidth, clientWidth, clientLeft, clientTop, offsetWidth, offsetHeight } = box;
    const along = Math.abs(box.scrollLeft);
    this.beyond.top = scrollTop > SENTINEL;
    this.beyond.bottom = scrollHeight - clientHeight - scrollTop > SENTINEL;
    this.beyond.start = along > SENTINEL;
    this.beyond.end = scrollWidth - clientWidth - along > SENTINEL;
    this.keep(along);
    const bars = [clientLeft, offsetWidth - clientWidth - clientLeft, offsetHeight - clientHeight - clientTop].map((size) => `${Math.max(0, size)}px`);
    if (bars.join(' ') !== this.bars) {
      this.bars = bars.join(' ');
      const frame = this.frame;
      frame?.style.setProperty('--_bar-left', bars[0]);
      frame?.style.setProperty('--_bar-right', bars[1]);
      frame?.style.setProperty('--_bar-bottom', bars[2]);
    }
    this.edgesChanged();
    if (!this.sized) {
      this.sized = true;
      this.checkProductName();
    }
  };

  private edgesChanged() {
    this.writeEdges();
    const scrolls = EDGES.some((edge) => this.beyond[edge]);
    if (scrolls !== this.scrolls) {
      this.scrolls = scrolls;
      this.readStop();
    }
  }

  /** SCA-2: `data-<edge>` on the frame while content lies beyond an edge that edges names — written only when it changes. */
  private writeEdges() {
    const frame = this.frame;
    if (!frame) return;
    const named = this.named;
    for (const edge of EDGES) {
      const drawn = this.beyond[edge] && named.includes(edge);
      if (frame.hasAttribute(`data-${edge}`) !== drawn) frame.toggleAttribute(`data-${edge}`, drawn);
    }
  }

  /**
   * SCA-10: a focus stop of its own while the content does not fit and nothing inside takes focus. Read when the fit
   * changes, when the slotted content changes, and when focus arrives inside — never in a frame of a scroll.
   */
  private readStop() {
    const slot = this.renderRoot.querySelector('slot');
    const stop = this.scrolls && !(slot && tabbables(slot).length > 0);
    if (stop !== this.focusStop) this.focusStop = stop;
  }

  private readonly onSlotChange = () => this.readStop();

  /** Focus arrived inside the content: something there takes focus, so the box need not. */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (event.composedPath()[0] !== this.box && this.focusStop) this.readStop();
  };

  /**
   * SCA-14: once a scroll has ended — never in a frame of it — the distance from the start edge is kept, read from the
   * scroll's own offset, for a flip of direction to give back; only while the box scrolls sideways.
   */
  private readonly onScrollEnd = () => {
    // A box that does not scroll sideways has no distance along the line to keep: nothing is read.
    if (!this.beyond.start && !this.beyond.end) return;
    countWork('scroll-area.scroll-ended');
    this.keep(Math.abs(this.box?.scrollLeft ?? 0));
  };

  /** SCA-11: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocus = () => syncFocusStyle(this, this.box);

  protected override render(): unknown {
    const named = this.named;
    const layers = Array.from({ length: this.layers }, (_, i) => i + 1);
    const stop = this.focusStop;
    // The box holds the content with no text between them: a space there would be laid out beside it.
    return html`<div class="frame"><div
        part="container"
        class="scroll"
        tabindex=${stop ? '0' : nothing}
        role=${stop ? 'region' : nothing}
        ${delegatedAria(this, { 'aria-label': stop ? this.label : null })}
        @focus=${this.onFocus}
        @focusin=${this.onFocusIn}
        @scrollend=${this.onScrollEnd}
      ><div class="content"><slot @slotchange=${this.onSlotChange}></slot>${EDGES.map((edge) => html`<span class="sentinel ${edge}" data-edge=${edge} aria-hidden="true"></span>`)}</div></div>${named.map(
        (edge) => html`<div class="edge ${edge}" aria-hidden="true"><div class="band"></div>${layers.map((i) => html`<div class="layer" style="--_i: ${i}; --_n: ${this.layers}"></div>`)}</div>`,
      )}<span class="ring" data-tanrei-shape></span>${DIRECTION_PROBE}</div>`;
  }
}

// SCA-18: the product's ARIA on the host is its box's, and a name only while the box is a region.
delegatesAria(TanreiScrollArea, { sentence: 'SCA-18' });
if (!customElements.get('tanrei-scroll-area')) customElements.define('tanrei-scroll-area', TanreiScrollArea);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-scroll-area': TanreiScrollArea;
  }
}
