import { LitElement, type PropertyDeclarations, type PropertyValues, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { html, literal } from 'lit/static-html.js';
import { ownDirection } from '../styles/product-text.js';
import { delegatedAria } from './delegated-aria.js';
import {
  type Destination,
  type DestinationContext,
  type LinkActivation,
  askDestinationContext,
  badgeDescription,
  notifyDestinationUpdate,
} from './destination.js';
import { TanreiElement } from './element.js';
import { syncFocusStyle } from './focus-ring.js';
import { LinkController, linkAttributes, readDestination } from './link.js';
import { PressController, type PressedBy } from './press.js';
import type { Point } from './ripple.js';
import { markConditionChange } from './selection.js';

// The item of a navigation bar (src/primitives/destination.ts has the region's side and the item's styles). A module of
// its own: tsc writes the class's static fields as a `static { … }` block (useDefineForClassFields is off), which a
// bundler keeps as a possible side effect wherever the module is imported, so a bundle that takes only the region's side
// (the navigation drawer, which draws its own cells) imports destination.ts and never this.

let ids = 0;

/**
 * A destination of a bar: a subclass gives its tag, its styles (`destinationStyles()` with its prefix, and the
 * cell's layout in the region) and nothing else. The region tells it whether it is selected, its position and whether
 * its label is drawn; it fires `DESTINATION_UPDATE` when a prop the region reads changes.
 */
export class NavigationDestination extends TanreiElement implements Destination {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    // Its own accessor (below): a link without a value reads its href. Reflected by hand, as it was given.
    value: { type: String, noAccessor: true },
    label: { type: String },
    icon: { type: String },
    disabled: { type: Boolean, reflect: true },
    badge: { type: Boolean, reflect: true },
    badgeCount: { type: Number, attribute: 'badge-count' },
    badgeLabel: { type: String, attribute: 'badge-label' },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
    context: { state: true },
  };

  /**
   * The behaviour ids the link's debug reports cite (`LinkController`'s `ids`): the navigation bar's, the one region
   * whose item this is. A subclass for another region names its own.
   */
  protected static linkIds: { refused: string; newContext: string } = { refused: 'NVB-33', newContext: 'NVB-32' };

  private given = '';

  /**
   * What identifies the destination: the region's `value` selects it by this, and `change` / `reselect` carry it. While
   * it is given none, a link's `href` stands for it, as written (NVB-30) — so a page sets the region's `value` to its
   * own address and nothing on the items.
   */
  get value(): string {
    return this.given || (readDestination(this.href).href ?? '');
  }

  set value(value: string) {
    const before = this.value;
    this.given = value ?? '';
    this.requestUpdate('value', before);
  }

  /** Its name, drawn under the icon (as the region's label visibility says) and always its accessible name. Required. */
  label = '';

  /** The name of a glyph of the system's icon set: outlined while unselected, filled while selected. Required. */
  icon = '';

  /** Unavailable: it keeps its place and its disabled look, cannot be activated and leaves the focus order. */
  disabled = false;

  /** Draws a Tanrei badge on the icon, from `badgeCount` and `badgeLabel`. */
  badge = false;

  /** The badge's count: null (no attribute) draws the dot, 0 nothing, above 0 the number (999+ above 999). */
  badgeCount: number | null = null;

  /** What assistive technology reads after the destination's name and state ("3 unread"). A dot needs one. */
  badgeLabel = '';

  /** The address the destination leads to: a URL, a path or a fragment. Not empty, the destination is a link and not a button (NVB-30), and the region does not select it by a press (NVB-31). White space is no address; a `javascript:` address or one that cannot be read is refused and reported (NVB-33). */
  href = '';

  /** Where a link opens: `same` (here) or `new` (a new tab or window, with `noopener`), which a cell has no place to mark and says through `targetLabel` (NVB-32). HTML's `_self` and `_blank` are read as those; anything else is `same` and is reported (NVB-33). Ignored without `href`. */
  target = 'same';

  /** What assistive technology reads at the end of the link's description while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: the anchor's `rel`. `noopener` is added while `target` is `new`; `noreferrer` is yours to add. */
  rel: string | null = null;

  /** Web only: the anchor's `download`. A link that asks for a download is the browser's: the region fires nothing for it (NVB-31). */
  download: string | null = null;

  private context: DestinationContext = { selected: false, position: 0, size: 0, labelShown: true };
  /** Whether the region has told it anything yet: the first selection is drawn, not animated. */
  private told = false;
  private grow = false;

  /**
   * NVB-30, NVB-32, NVB-33: the link the destination is while it has an address, what its anchor carries, and what a
   * debug build is told (src/primitives/link.ts).
   */
  private readonly link = new LinkController(this, { ids: (this.constructor as typeof NavigationDestination).linkIds, disabled: () => this.disabled });

  /** The pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.container') ?? null,
    holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
    disabled: () => this.disabled,
    // NVB-1, NVB-30: a link is pressed by Enter alone; Space is the browser's, and shows no pressed state.
    keys: () => this.link.pressKeys,
    // A press outside the item container (elsewhere in the cell) grows the ripple from its centre.
    origin: (at: Point) => {
      const box = this.renderRoot?.querySelector('.container')?.getBoundingClientRect();
      return box && at.x >= box.left && at.x <= box.right && at.y >= box.top && at.y <= box.bottom ? at : null;
    },
  });

  constructor() {
    super();
    // A disabled destination swallows every click that reaches it, from its content or dispatched on it.
    this.addEventListener(
      'click',
      (event) => {
        if (this.disabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.id) this.id = `tanrei-destination-${++ids}`;
  }

  /** @internal The region's side. */
  setDestinationContext(context: DestinationContext) {
    const now = this.context;
    // Every key of either: a region that no longer names a variant must still be heard (NVB-3).
    const keys = new Set([...Object.keys(context), ...Object.keys(now)]) as Set<keyof DestinationContext>;
    if ([...keys].every((key) => context[key] === now[key]) && this.told) return;
    this.grow = this.told && context.selected && !now.selected;
    this.told = true;
    this.context = context;
  }

  /** Whether the region draws this destination as its selected one. */
  get selected(): boolean {
    return this.context.selected;
  }

  /**
   * @internal NVB-31: what the region is told of a click on this destination — null while it is a button; for a link
   * its address, and whether the click follows it in place: the primary button, no modifier key, not already
   * cancelled, on a link that opens where the person is and asks for no download.
   */
  linkActivation(event: MouseEvent): LinkActivation | null {
    const form = this.link.form;
    if (!form) return null;
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
    return { href: this.href, counted: plain && !form.disabled && !form.opensNew && this.download === null };
  }

  /** `element.click()` activates the destination as a person would; a disabled one does nothing. */
  override click() {
    if (this.disabled) return;
    this.cell?.click();
  }

  private get cell(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.cell') ?? null;
  }

  /** @internal The region took the pointer's press for something else (a drag of its indicator): it ends as any press by the pointer does. */
  releasePress(by?: Event | PressedBy) {
    this.press.release(by);
  }

  private readonly onFocus = () => syncFocusStyle(this, this.cell);

  protected override willUpdate(changed: PropertyValues<this>) {
    if (!this.told) askDestinationContext(this);
    const before = changed.get('context' as keyof NavigationDestination) as DestinationContext | undefined;
    if (before && before.selected !== this.context.selected) markConditionChange(this.cell);
  }

  protected override updated(changed: PropertyValues<this>) {
    const { position, size } = this.context;
    // The host is a list item of the region's list: its position among the destinations is read (2 of 4).
    this.setAttribute('role', 'listitem');
    if (position) this.setAttribute('aria-posinset', String(position));
    if (size) this.setAttribute('aria-setsize', String(size));
    if (this.grow) {
      this.grow = false;
      this.growIndicator();
    }
    // The value as it was given, for a selector or a product that reads it; a link's href is not written back as one.
    if (changed.has('value')) {
      if (this.given) {
        if (this.getAttribute('value') !== this.given) this.setAttribute('value', this.given);
      } else if (this.hasAttribute('value')) this.removeAttribute('value');
    }
    notifyDestinationUpdate(this, changed);
  }

  /**
   * The new active indicator grows in width from the item container's centre, at its full height; a subclass names
   * another box that grows so (the bar's icon indicator, NVB-15).
   */
  protected growIndicator(selector = '.indicator') {
    const indicator = this.renderRoot.querySelector<HTMLElement>(selector);
    if (!indicator || typeof indicator.animate !== 'function') return;
    const style = getComputedStyle(indicator);
    const duration = (Number.parseFloat(style.animationDuration) || 0) * 1000;
    for (const running of indicator.getAnimations()) if (running.id === 'tanrei-destination-grow') running.cancel();
    if (duration <= 0) return;
    const animation = indicator.animate([{ insetInline: '50%' }, { insetInline: '0px' }], { duration, easing: style.animationTimingFunction || 'ease' });
    animation.id = 'tanrei-destination-grow';
  }

  /** What the cell holds: the item container with the icon (and its badge), the label, the press-hold carrier. */
  protected content() {
    const glyph = html`<span part="icon" class="icon" aria-hidden="true">${this.icon}</span>`;
    return html`
      <span part="container" class="container" data-tanrei-shape>
        <span part="active-indicator" class="indicator" aria-hidden="true"></span>
        ${this.badge ? html`<tanrei-badge .count=${this.badgeCount ?? null} label=${this.badgeLabel}>${glyph}</tanrei-badge>` : glyph}
      </span>
      <span class="label-box" aria-hidden="true"><span part="label" class="label" dir=${ownDirection(this.label)}>${this.label}</span></span>
      <span class="hold"></span>
    `;
  }

  protected override render() {
    const { selected, labelShown, variant, position, size } = this.context;
    // `first` and `last`: the destinations at the region's two ends, whose hit areas a region may take to its edges.
    const classes = classMap({ cell: true, selected, d: this.disabled, 'no-label': !labelShown, first: position === 1, last: position > 0 && position === size, ...(variant ? { [variant]: true } : {}) });
    // NVB-30: with an address it is a link — the same cell, with the same classes, parts and listeners, so every state
    // is drawn from the same tokens — whose address, target, rel and disabled form are the link primitive's. NVB-32:
    // one that opens a new context says so last, after the badge's description; a cell has no place for a mark.
    const link = this.link.form;
    const tag = link ? literal`a` : literal`button`;
    return html`<${tag}
      part="cell"
      class=${classes}
      type=${link ? nothing : 'button'}
      ?disabled=${!link && this.disabled}
      draggable=${link ? 'false' : nothing}
      ${linkAttributes(link)}
      ${delegatedAria(this, {
        'aria-current': selected && 'page',
        'aria-label': this.label,
        // The product's aria-description on the host comes first (src/primitives/delegated-aria.ts), then the badge's.
        'aria-description': this.link.describe(this.getAttribute('data-aria-description'), badgeDescription(this.badge, this.badgeCount, this.badgeLabel)),
      })}
      @pointerdown=${this.press.onPointerDown}
      @pointerup=${this.press.release}
      @pointercancel=${this.press.release}
      @pointerleave=${this.press.release}
      @keydown=${this.press.onKeyDown}
      @keyup=${this.press.onKeyUp}
      @blur=${this.press.onBlur}
      @focus=${this.onFocus}
      >${this.content()}</${tag}
    >`;
  }
}
