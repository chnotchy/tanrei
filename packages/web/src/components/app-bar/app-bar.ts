import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { AvailabilityController, OpenAxesController, report } from '../../primitives/index.js';
import { AXES, CORE_SIZES, heightProbe, styles } from './app-bar.styles.js';
import { ownDirection } from '../../styles/product-text.js';

/** The core sizes (small, large), plus any a design system adds: a size other than small has a title row that collapses. */
export type TanreiAppBarSize = 'small' | 'large' | (string & {});

/** Where the top row's title sits: after the navigation button, or centred on the bar. */
export type TanreiAppBarTitleAlignment = 'start' | 'center';

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Names the current screen at its top edge and holds the way back and the screen's most used actions, flat while the
 * content is at its top and set apart once content scrolls under it.
 *
 * Contract: specs/app-bar.spec.json. A layout region: no role of its own, never focusable, no events of its
 * own. Its items are the product's icon-only `<tanrei-button>`s — the spec's `navigation` kind with `slot="navigation"` and
 * its `action` kind with `slot="actions"` — which it lays out and never restyles (APB-11). The title is `headline`,
 * because HTML's global `title` attribute would put a tooltip over the whole bar; it is the screen's heading, of
 * `heading-level` (1 by default).
 *
 * Scrolled: the bar connects to a scrolling element and sets `scrolled` from it — the document's scrolling element by
 * default, the element whose id `scroll-target` names, or nothing with `scroll-target="none"` (then set `scrolled`
 * yourself). A large bar shrinks one for one with the scroll until only its top row is left (APB-8).
 *
 * Every visual value comes from `--tanrei-comp-app-bar-*` tokens. The color reaches under `env(safe-area-inset-top)` and
 * the side insets; the content stays inside them (APB-10).
 *
 * @tag tanrei-app-bar
 * @slot navigation - The navigation item: one icon-only `<tanrei-button>` (back, menu or close) at the start.
 * @slot actions - The action items: up to three icon-only `<tanrei-button>`s at the end, in reading order.
 * @csspart container - The bar: its color, elevation, and the system insets it reaches under.
 * @csspart top-row - The row of the navigation item, the title block and the actions.
 * @csspart title - The title (the heading), in the top row and in a large bar's own title row.
 * @csspart subtitle - The line under the title.
 * @csspart expanded - A large bar's own title row, under the top row, which collapses as the content scrolls.
 * @csspart outline - The bar's bottom edge.
 */
export class TanreiAppBar extends LitElement {
  private readonly availability = new AvailabilityController(this, 'app-bar');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    size: { type: String, reflect: true },
    headline: { type: String },
    subtitle: { type: String },
    titleAlignment: { type: String, attribute: 'title-alignment', reflect: true },
    scrolled: { type: Boolean, reflect: true },
    scrollTarget: { type: String, attribute: 'scroll-target' },
    headingLevel: { type: Number, attribute: 'heading-level' },
    hasNavigation: { state: true },
    hasActions: { state: true },
    layerExpands: { state: true },
    collapse: { state: true },
    covered: { state: true },
    connected: { state: true },
  };

  /** Small puts the title in the one row; large gives it a larger row of its own that collapses as the content scrolls. Reflected. */
  size: TanreiAppBarSize = 'small';

  /** The screen's name (the spec's `title`), and its heading for assistive technology. Empty draws no title and exposes no heading. */
  headline = '';

  /** One line under the title. Empty draws none. */
  subtitle = '';

  /** `start` (after the navigation button) or `center` (centred on the bar). A large bar's own title row always starts at the start. Reflected. */
  titleAlignment: TanreiAppBarTitleAlignment = 'start';

  /** Whether content lies under the bar: the scrolled look, and a large bar drawn collapsed. A connected scrolling element sets it. Reflected. */
  scrolled = false;

  /**
   * The scrolling element the bar follows (web only): empty follows the document's scrolling element, an id follows the
   * element with that id (in the bar's own document or shadow root), `none` follows nothing.
   */
  scrollTarget = '';

  /** The title's heading level (web only), 1 to 6. */
  headingLevel = 1;

  private hasNavigation = false;
  private hasActions = false;
  /** Whether a size a layer added is defined by the active system (then it has a title row that collapses). */
  private layerExpands = false;
  /** How far a connected scroll has pulled a large bar's title row up under the top row, in px. */
  private collapse = 0;
  /** The part of the expanded title that is covered, 0 to 1: the top row's title fades in with it (APB-8). */
  private covered = 0;
  /** Whether a scrolling element is connected (APB-9). */
  private connected = false;

  /** APB-14: sizes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'app-bar', behavior: 'APB-14', axes: AXES });

  private source: { target: EventTarget; read: () => number } | null = null;
  private retry = 0;
  private offset = 0;
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());

  override connectedCallback() {
    super.connectedCallback();
    if (!this.hasUpdated) return;
    this.observe();
    this.connectScroll();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnectScroll();
    this.resize$?.disconnect();
  }

  /** A size other than small has a title row of its own: large, or a size a layer added that the active system defines. */
  private get expands(): boolean {
    if (this.size === 'large') return true;
    return !(CORE_SIZES as readonly string[]).includes(this.size) && this.layerExpands;
  }

  private get center(): boolean {
    return this.titleAlignment === 'center';
  }

  private find<T extends Element>(selector: string): T | null {
    return this.renderRoot?.querySelector<T>(selector) ?? null;
  }

  // ---- APB-8, APB-9: the connected scrolling element ----

  private disconnectScroll() {
    cancelAnimationFrame(this.retry);
    if (this.source) this.source.target.removeEventListener('scroll', this.onScroll);
    this.source = null;
    this.connected = false;
  }

  /** Follows the element `scroll-target` names (the document's scrolling element when empty; nothing for `none`). */
  private connectScroll(attempt = 0) {
    this.disconnectScroll();
    const name = (this.scrollTarget ?? '').trim();
    if (name === 'none') return;
    if (name === '') {
      const read = () => document.scrollingElement?.scrollTop ?? window.scrollY;
      this.source = { target: window, read };
    } else {
      const root = this.getRootNode() as Document | ShadowRoot;
      const element = typeof root.getElementById === 'function' ? root.getElementById(name) : null;
      if (!element) {
        // The element may come later in the document: look again on the next frame, once.
        if (attempt === 0) this.retry = requestAnimationFrame(() => this.connectScroll(1));
        else report(this, 'APB-9', `scroll-target "${name}" names no element; the bar follows nothing and draws what scrolled says`);
        return;
      }
      this.source = { target: element, read: () => element.scrollTop };
    }
    this.source.target.addEventListener('scroll', this.onScroll, { passive: true });
    this.connected = true;
    this.onScroll();
  }

  private readonly onScroll = () => {
    if (!this.source) return;
    this.offset = Math.max(0, this.source.read());
    this.follow();
  };

  /**
   * APB-8, APB-9: a small bar is scrolled while the content has left its top; a large one shrinks one for one with the
   * scroll, from its expanded height to its top row, and is scrolled only once it has fully collapsed.
   */
  private follow() {
    if (!this.connected) return;
    const block = this.find<HTMLElement>('.block');
    const range = this.expands && block ? block.offsetHeight : 0;
    this.collapse = this.expands ? clamp(this.offset, 0, range) : 0;
    this.covered = this.expands ? this.coveredPart(block, range) : 1;
    this.scrolled = this.offset > range;
  }

  /** How much of the expanded title the top row covers, 0 to 1 (APB-8). */
  private coveredPart(block: HTMLElement | null, range: number): number {
    if (!block || range <= 0) return 0;
    if (this.collapse >= range) return 1;
    const title = block.querySelector<HTMLElement>('.title');
    if (!title || title.offsetHeight <= 0) return this.collapse >= range ? 1 : 0;
    return clamp((this.collapse - title.offsetTop) / title.offsetHeight, 0, 1);
  }

  // ---- APB-6: the centred title's balance ----

  private measure() {
    this.balance();
    this.follow();
  }

  /**
   * APB-6: a centred title block is centred on the bar's full width — narrowed on the side that has less beside it by
   * the difference, so that it never runs under either slot.
   */
  private balance() {
    const row = this.find<HTMLElement>('.row');
    const area = this.find<HTMLElement>('.title-area');
    if (!row || !area) return;
    if (!this.center) {
      area.style.removeProperty('--_balance-start');
      area.style.removeProperty('--_balance-end');
      return;
    }
    const r = row.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    const rtl = getComputedStyle(this).direction === 'rtl';
    const start = rtl ? r.right - a.right : a.left - r.left;
    const end = rtl ? a.left - r.left : r.right - a.right;
    area.style.setProperty('--_balance-start', `${Math.max(0, end - start)}px`);
    area.style.setProperty('--_balance-end', `${Math.max(0, start - end)}px`);
  }

  /** APB-4, APB-13: which slots hold items; more than one navigation item or three actions still render, and are reported. */
  private onSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    const items = slot.assignedElements();
    if (slot.name === 'navigation') {
      this.hasNavigation = items.length > 0;
      if (items.length > 1) report(this, 'APB-13', `the bar holds ${items.length} navigation items; a bar has one navigation button`);
    } else {
      this.hasActions = items.length > 0;
      if (items.length > 3) report(this, 'APB-13', `the bar holds ${items.length} action items; more than three belong in an overflow menu`);
    }
  }

  /** The boxes whose size moves the centred title's balance and the collapse's range. */
  private observe() {
    for (const selector of ['.row', '.navigation', '.actions', '.block']) {
      const element = this.find(selector);
      if (element) this.resize$?.observe(element);
    }
  }

  protected override firstUpdated() {
    this.observe();
    this.connectScroll();
  }

  protected override updated(changed: PropertyValues<this>) {
    // APB-14: a size a layer added is a size with its own title row where the active system defines it.
    if (changed.has('size')) {
      const layer = !(CORE_SIZES as readonly string[]).includes(this.size);
      this.layerExpands = layer && getComputedStyle(this).getPropertyValue(heightProbe(this.size)).trim() !== '';
    }
    if (changed.has('scrollTarget') && changed.get('scrollTarget') !== undefined) this.connectScroll();
    // The block's natural height is the collapse's range: watch it (fonts, text size, a subtitle).
    const block = this.find('.block');
    if (block) this.resize$?.observe(block);
    if (changed.has('size') || changed.has('layerExpands' as keyof TanreiAppBar) || changed.has('headline') || changed.has('subtitle')) this.follow();
    if (changed.has('titleAlignment') || changed.has('hasNavigation' as keyof TanreiAppBar) || changed.has('hasActions' as keyof TanreiAppBar)) this.balance();
  }

  /** APB-5, APB-7, APB-12: the title (a heading) and the subtitle read after it; `hidden` keeps a copy out of the tree. */
  private titleBlock(hidden: boolean) {
    const level = clamp(Math.round(Number(this.headingLevel) || 1), 1, 6);
    return html`
      <div class="title-block" aria-hidden=${hidden ? 'true' : nothing}>
        <div part="title" class="title" dir=${ownDirection(this.headline)} role="heading" aria-level=${level}>${this.headline}</div>
        ${this.subtitle ? html`<div part="subtitle" class="subtitle" dir=${ownDirection(this.subtitle)}>${this.subtitle}</div>` : nothing}
      </div>
    `;
  }

  protected override render() {
    const titled = this.headline.trim() !== '';
    const expands = this.expands;
    // APB-9: without a connection, a large bar is drawn collapsed while scrolled is true and expanded while it is false.
    const covered = !expands ? 1 : this.connected ? this.covered : this.scrolled ? 1 : 0;
    // APB-7, APB-8: the top row draws no title while the expanded one is wholly visible, and fades it in as it is covered.
    const topTitle = titled && covered > 0;
    // APB-12: the expanded title is the one exposed while any of it is visible.
    const topHidden = expands && covered < 1;
    const showsExpanded = expands && (this.connected || !this.scrolled);
    return html`
      <div part="container" class="container">
        <div
          part="top-row"
          class=${classMap({ row: true, center: this.center, 'has-navigation': this.hasNavigation, 'has-actions': this.hasActions })}
        >
          <div class="navigation"><slot name="navigation" @slotchange=${this.onSlotChange}></slot></div>
          <div class="title-area" style=${styleMap({ opacity: expands && covered < 1 ? String(covered) : null })}>
            ${topTitle ? this.titleBlock(topHidden) : nothing}
          </div>
          <div class="actions"><slot name="actions" @slotchange=${this.onSlotChange}></slot></div>
        </div>
        ${showsExpanded
          ? html`<div part="expanded" class="expanded" aria-hidden=${covered >= 1 ? 'true' : nothing}>
              <div class="block" style=${styleMap({ '--_collapse': this.collapse > 0 ? `${this.collapse}px` : null })}>
                ${titled ? this.titleBlock(false) : nothing}
              </div>
            </div>`
          : nothing}
        <div part="outline" class="outline" aria-hidden="true"></div>
      </div>
    `;
  }
}

if (!customElements.get('tanrei-app-bar')) customElements.define('tanrei-app-bar', TanreiAppBar);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-app-bar': TanreiAppBar;
  }
}
