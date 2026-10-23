import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, ariaAttribute, report } from '../../primitives/index.js';
import { styles } from './badge.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** A larger count shows as `max` followed by a plus sign. */
const DEFAULT_MAX = 999;

/** What each anchor's own `aria-description` was before a badge described it, so it can be given back. */
const ownDescriptions = new WeakMap<Element, string | null>();

/**
 * Marks an icon, a navigation item or an avatar with a dot or a small count to show that something is waiting.
 *
 * Contract: specs/badge.spec.json. Wrap the anchor: `<tanrei-badge count="3" label="3 unread"><tanrei-button variant="text"
 * label="Inbox"><span slot="icon">inbox</span></tanrei-button></tanrei-badge>`. No `count` is the dot, `count="0"` draws nothing, a count
 * above `max` shows as `999+`. Every visual value is a `--tanrei-comp-badge-*` token.
 *
 * The badge is not in the accessibility tree: what it says reaches assistive technology through its anchor. It sets
 * `aria-description` on the slotted anchor — `label`, or the displayed count when there is no label — so the anchor is
 * announced with its own name followed by it ("Inbox, button, 3 unread"). An anchor that is a Tanrei component passes
 * it on to its native element. The badge takes no space and no input, and never announces a change by itself.
 *
 * A badge needs an anchor: with no element in its slot it draws nothing and says nothing, and a debug build reports it
 * (BDG-16). A count that stands by itself in a row is that row's text (a navigation drawer item's `trailing-text`).
 *
 * @tag tanrei-badge
 * @slot - The anchor the badge sits on, which it needs: an icon, an icon button, a navigation item or an avatar. Its
 *   first element is the one that is described; with none, the badge draws nothing (BDG-16).
 * @csspart container - The dot, or the pill that holds the count (hidden from assistive technology).
 * @csspart label - The count, or the capped count followed by a plus sign.
 */
export class TanreiBadge extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'badge');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    count: { type: Number },
    max: { type: Number },
    label: { type: String },
    anchor: { state: true },
    assigned: { state: true },
  };

  /** How many things are waiting. Null (no attribute) draws the dot; 0 draws nothing; above 0 draws the number. */
  count: number | null = null;

  /** The largest count shown as it is; a larger one shows as max followed by a plus sign (999+). */
  max = DEFAULT_MAX;

  /** What assistive technology reads after the anchor's own name ("3 unread"). With no label, the displayed count is read; a dot needs one. */
  label = '';

  /** The slotted element being described. */
  private anchor: Element | null = null;

  /** BDG-14: the count as drawn — null (the dot), 0 (nothing: also for a negative count or one that is not a number) or a whole number above 0. */
  private get shown(): number | null {
    const count = this.count;
    if (count === null || count === undefined) return null;
    if (Number.isNaN(count)) return 0;
    return Math.max(0, Math.floor(count));
  }

  /** BDG-14: max as used — its default when it is below 1 or not a number. */
  private get cap(): number {
    const max = this.max;
    return typeof max === 'number' && max >= 1 ? Math.floor(max) : DEFAULT_MAX;
  }

  /** BDG-4 / BDG-12: the displayed text, in the locale's digits without grouping; max and a plus sign above max. */
  private get text(): string {
    const shown = this.shown;
    if (!shown) return '';
    const format = new Intl.NumberFormat(this.locale(), { useGrouping: false, maximumFractionDigits: 0 });
    return shown > this.cap ? `${format.format(this.cap)}+` : format.format(shown);
  }

  /** The current locale: the nearest `lang`, else the browser's. */
  private locale(): string | undefined {
    const lang = this.closest('[lang]')?.getAttribute('lang') || (typeof navigator !== 'undefined' ? navigator.language : '');
    try {
      return Intl.getCanonicalLocales(lang)[0];
    } catch {
      return undefined;
    }
  }

  /**
   * BDG-3 / BDG-13: the pill's drawn height, which CSS cannot read along the line: measured into `--_lead`, so the
   * leading circle — a square of that height — stays centered on the corner point when text makes the pill grow.
   */
  private readonly lead = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
    for (const entry of entries) {
      const pill = entry.target as HTMLElement;
      const height = pill.getBoundingClientRect().height;
      if (height > 0) pill.style.setProperty('--_lead', `${height}px`);
    }
  });


  private observePill() {
    const pill = this.renderRoot.querySelector('.count .container');
    if (pill && this.lead) this.lead.observe(pill);
  }

  #onSlotChange(event: Event) {
    this.anchor = (event.target as HTMLSlotElement).assignedElements()[0] ?? null;
  }

  /** BDG-16: whether the slot has been read, so that a badge is not reported as anchorless before its first assignment. */
  private assigned = false;

  /** BDG-16: whether the badge is without an anchor, so that it is reported once each time it is left without one. */
  private missing = false;

  protected override firstUpdated() {
    // An empty slot fires no slotchange: read the assignment once, after the first render.
    this.anchor = this.renderRoot.querySelector('slot')?.assignedElements()[0] ?? null;
    this.assigned = true;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.observePill();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.lead?.disconnect();
    // A badge removed from its anchor (the anchor moved elsewhere) stops describing it.
    if (this.anchor && this.anchor.parentElement !== this) this.describe(this.anchor, null);
  }

  /** BDG-8: puts `description` on `anchor` (null: gives the anchor back its own). */
  private describe(anchor: Element, description: string | null) {
    if (description === null) {
      if (!ownDescriptions.has(anchor)) return;
      const own = ownDescriptions.get(anchor)!;
      ownDescriptions.delete(anchor);
      if (own === null) anchor.removeAttribute('aria-description');
      else anchor.setAttribute('aria-description', own);
      return;
    }
    // An anchor that moves the product's ARIA holds it in data-aria-description (src/primitives/delegated-aria.ts).
    if (!ownDescriptions.has(anchor)) ownDescriptions.set(anchor, ariaAttribute(anchor, 'aria-description'));
    if (ariaAttribute(anchor, 'aria-description') !== description) anchor.setAttribute('aria-description', description);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // BDG-14: the value is drawn as the spec says, and a debug build names it.
    if (changed.has('count')) {
      const count = this.count;
      if (typeof count === 'number' && Number.isNaN(count)) report(this, 'BDG-14', 'count is not a number; it is drawn as 0');
      else if (typeof count === 'number' && count < 0) report(this, 'BDG-14', `count ${count} is negative; it is drawn as 0`);
      else if (typeof count === 'number' && !Number.isInteger(count)) report(this, 'BDG-14', `count ${count} is not a whole number; it is drawn as ${Math.floor(count)}`);
    }
    if (changed.has('max') && !(typeof this.max === 'number' && this.max >= 1)) {
      report(this, 'BDG-14', `max ${this.max} is below 1; the default ${DEFAULT_MAX} is used`);
    }
    // BDG-9: a dot with no label tells assistive technology nothing.
    if ((changed.has('count') || changed.has('label')) && this.shown === null && !this.label) {
      report(this, 'BDG-9', 'the dot has no label, so it tells assistive technology nothing; give it a label ("New messages")');
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // The pill is a new element whenever the form changes (dot → count); observing one twice is a no-op.
    this.observePill();
    // BDG-16: a badge with nothing to sit on draws nothing; a debug build says so each time it is left without one.
    const missing = this.assigned && !this.anchor;
    const began = missing && !this.missing;
    this.missing = missing;
    if (began) {
      report(this, 'BDG-16', 'the badge has no anchor, so it draws nothing; wrap the icon, button, navigation item or avatar it marks. A count that stands by itself in a row is that row\'s text', { once: false });
    }
    // BDG-8 / BDG-10 / BDG-5: the anchor's description follows count and label; nothing is announced by the badge.
    const previous = changed.get('anchor' as keyof TanreiBadge) as Element | null | undefined;
    if (previous && previous !== this.anchor) this.describe(previous, null);
    if (!this.anchor) return;
    const shown = this.shown;
    const description = shown === 0 ? null : this.label || (shown === null ? null : this.text);
    this.describe(this.anchor, description);
  }

  protected override render() {
    const shown = this.shown;
    const form = shown === null ? 'dot' : 'count';
    // BDG-5: a count of 0 draws nothing; BDG-16: nor does a badge with no anchor. BDG-8: what is drawn is hidden from
    // assistive technology.
    return html`
      <slot @slotchange=${this.#onSlotChange}></slot>
      <span class="corner ${form}" aria-hidden="true" ?hidden=${shown === 0 || !this.anchor}>
        ${form === 'dot'
          ? html`<span part="container" class="container"></span>`
          : html`<span part="container" class="container" data-tanrei-shape><span part="label" class="label">${this.text || nothing}</span></span>`}
      </span>
    `;
  }
}

if (!customElements.get('tanrei-badge')) customElements.define('tanrei-badge', TanreiBadge);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-badge': TanreiBadge;
  }
}
