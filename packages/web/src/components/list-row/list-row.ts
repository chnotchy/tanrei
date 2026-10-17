import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { type CutTextContent, CutTextTip, isCut } from '../../primitives/cut-text.js';
import { AvailabilityController, GlyphDrawnController, GlyphMirrorController, OpenAxesController, deepActive, notifyItemUpdate, report } from '../../primitives/index.js';
import type { TanreiListRowDensityRegistry } from '../../registry.js';
import type { TanreiListItemFrame } from '../list/list.js';
import '../tooltip/tooltip.js';
import type { TanreiTooltip } from '../tooltip/tooltip.js';
import { AXES, styles } from './list-row.styles.js';

/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiListRowDensity = keyof TanreiListRowDensityRegistry;

/** Text with its runs of white space made one space, trimmed: what a person hears of it. */
const spoken = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** LRW-2: supportingLines read as 1 or 2 — the nearer of the two; anything that is not a number is 1. */
function readLines(value: unknown): { lines: 1 | 2; exact: boolean } {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return { lines: 1, exact: false };
  const lines = n >= 1.5 ? 2 : 1;
  return { lines, exact: n === lines };
}

/** LRW-7: the rows whose tooltip is open, which one Escape listener of the window closes. */
const open = new Set<TanreiListRow>();
let escapeHeard = false;
function hearEscape() {
  if (escapeHeard || typeof window === 'undefined') return;
  escapeHeard = true;
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || !open.size) return;
      let closed = false;
      for (const row of [...open]) closed = row.closeTip() || closed;
      // The key does nothing else then (LRW-7): a dialog the row is in stays open.
      if (closed) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
}

/**
 * One row of text with something before it and something after it: an overline, a headline and a line or two of
 * supporting text; a glyph, an avatar, a picture or a control at its start; a short value, a control and a glyph at its
 * end. Placed as the direct child of a `<tanrei-list-item>`, which tells it what the item is, or standing alone.
 *
 * Contract: specs/list-row.spec.json. Every visual value is a `--tanrei-comp-list-row-*` token. The row draws no fill,
 * edge or state and is never pressable: pressing, focus, selection, the check, the handle and the dividers are the
 * List's. Inside an action, a link or an option the item's paddings are the row's (LRW-8), and a selected option hands
 * it its content color (LRW-9). The item it is in is named by its headline and described by its other texts (LST-49).
 *
 * A headline or a supporting text that is cut is shown whole in a tooltip on hover, and on the keyboard focus of its
 * list item (LRW-7); assistive technology always gets the whole text.
 *
 * @tag tanrei-list-row
 * @slot leading - Content at the row's start in place of `leading-icon`: an avatar, a picture, or — while the row is static — a checkbox, a radio button or a switch. Drawn at its own size, given no style.
 * @slot trailing - Content at the row's end, after the trailing text and before the trailing glyph: a badge, or — while the row is static — a switch, a checkbox or an icon-only Button.
 * @csspart container - The row's box: its paddings and its least height.
 * @csspart leading - The box of the leading part: the slot's content, the glyph, or — where the List asks for it (its `icon-space`, LRW-16) — a glyph's room, empty.
 * @csspart leading-icon - The glyph `leading-icon` names.
 * @csspart text - The column of the overline, the headline and the supporting text.
 * @csspart overline - The line above the headline.
 * @csspart headline - The row's name.
 * @csspart supporting-text - The text under the headline.
 * @csspart trailing-text - The short value at the row's end.
 * @csspart trailing - The box of the trailing slot.
 * @csspart trailing-icon - The glyph `trailing-icon` names.
 */
export class TanreiListRow extends LitElement {
  private readonly availability = new AvailabilityController(this, 'list-row');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    overline: { type: String },
    supportingText: { type: String, attribute: 'supporting-text' },
    supportingLines: { type: Number, attribute: 'supporting-lines' },
    leadingIcon: { type: String, attribute: 'leading-icon' },
    trailingText: { type: String, attribute: 'trailing-text' },
    trailingIcon: { type: String, attribute: 'trailing-icon' },
    density: { type: String, reflect: true, useDefault: true },
    listItemFrame: { attribute: false },
    leadingFilled: { state: true },
    trailingFilled: { state: true },
  };

  /** The row's name, on one line, cut where it does not fit (the whole in the tooltip). The list item the row is in is named by it. */
  headline = '';

  /** A short line above the headline: a category, a source, a time. One line. */
  overline = '';

  /** The text under the headline, on `supporting-lines` lines at most, cut on the last with an ellipsis. */
  supportingText = '';

  /** How many lines the supporting text may take: 1 or 2 (two make a three-line row). Another number is read as the nearer. */
  supportingLines = 1;

  /** The name of a glyph of the system's icon set at the row's start. Decorative; the leading slot's content is drawn in its place. */
  leadingIcon = '';

  /** A short value at the row's end: a count, a size, a time. One line, never more than half of the row. */
  trailingText = '';

  /** The name of a glyph of the system's icon set at the row's very end (`chevron_right`). Decorative, mirrored where the icon set says. */
  trailingIcon = '';

  /** How much room the row takes: `regular` (56, 72, 88) or `compact` (40, 56, 72). A design system may add values. */
  density: TanreiListRowDensity = 'regular';

  /**
   * @internal LST-48: what the list item this row is the direct child of says it is; null while the row stands alone (or
   * is nested deeper in an item's content). Set by the item.
   */
  listItemFrame: TanreiListItemFrame | null = null;

  private leadingFilled = false;
  private trailingFilled = false;

  /** LRW-14: densities a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'list-row', behavior: 'LRW-14', axes: AXES });

  /** LRW-4, LRW-6: the glyphs are drawn only while the icon set can draw them, and mirrored where it says they point. */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.leading-icon, .trailing-icon'));
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.leading-icon, .trailing-icon' });

  /** @internal LST-49: the name the row gives the list item it is in: its headline. */
  get listItemName(): string {
    return spoken(this.headline);
  }

  /** @internal LST-49: the description the row gives an action, a link or an option: its overline, supporting text and trailing text. */
  get listItemDescription(): string {
    return [this.overline, this.supportingText, this.trailingText].map(spoken).filter(Boolean).join(' ');
  }

  /** @internal LST-50: the row draws a glyph as its leading part — its leadingIcon, with the leading slot empty. */
  get listItemGlyph(): boolean {
    return !this.leadingFilled && spoken(this.leadingIcon) !== '';
  }

  /** LRW-3: the number of lines of text. */
  private get lines(): 1 | 2 | 3 {
    const overline = spoken(this.overline) !== '';
    const supporting = spoken(this.supportingText) !== '';
    if (supporting && (overline || readLines(this.supportingLines).lines === 2)) return 3;
    return overline || supporting ? 2 : 1;
  }

  /** The list item this row is the direct child of, while that item has told it what it is. */
  private item: HTMLElement | null = null;

  override connectedCallback() {
    super.connectedCallback();
    hearEscape();
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('pointerdown', this.onPress);
    // LST-48: the item this row is the direct child of tells it what the item is — now, and on every change.
    this.ask();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('pointerenter', this.onPointerEnter);
    this.removeEventListener('pointerleave', this.onPointerLeave);
    this.removeEventListener('pointerdown', this.onPress);
    this.listen(null);
    this.cutTip.hide();
    open.delete(this);
  }

  /** LST-48, LST-49: asks the item it is in for its frame, and tells it that its name may have changed. */
  private ask() {
    // An internal event, kept out of the row's public API (as the list item's own update is).
    notifyItemUpdate(this, 'tanrei-list-item-content');
  }

  /** LRW-7: the item's keyboard focus shows the tooltip; Escape there is the window's (`hearEscape`). */
  private listen(item: HTMLElement | null) {
    if (this.item === item) return;
    this.item?.removeEventListener('focusin', this.onItemFocus);
    this.item?.removeEventListener('focusout', this.onItemBlur);
    this.item = item;
    item?.addEventListener('focusin', this.onItemFocus);
    item?.addEventListener('focusout', this.onItemBlur);
  }

  private readonly onItemFocus = () => {
    const active = deepActive();
    this.cutTip.focus(!!active && active !== this && !this.contains(active) && active.matches(':focus-visible'));
    this.track();
  };

  private readonly onItemBlur = () => {
    this.cutTip.blur();
    this.track();
  };

  private readonly onPointerEnter = (event: PointerEvent) => {
    this.cutTip.pointerEnter(event.pointerType);
  };

  private readonly onPointerLeave = (event: PointerEvent) => {
    this.cutTip.pointerLeave(event.pointerType);
  };

  private readonly onPress = () => {
    this.cutTip.press();
    this.track();
  };

  /** @internal LRW-7: Escape closes an open tooltip, and says whether there was one. */
  closeTip(): boolean {
    const was = this.cutTip.escape();
    this.track();
    return was;
  }

  /** Keeps the set of open tooltips that Escape closes. */
  private track() {
    if (this.cutTip.shown) open.add(this);
    else open.delete(this);
  }

  /** LRW-7: the tooltip that shows a cut headline or supporting text whole (src/primitives/cut-text.ts), made when first wanted. */
  private readonly cutTip = new CutTextTip({
    tip: () => this.tipElement,
    place: () => {
      this.placeTip();
      queueMicrotask(() => this.track());
    },
    content: () => this.cutContent(),
    clock: () => this.renderRoot?.querySelector('.tip-clock') ?? null,
  });

  private tipElement: TanreiTooltip | null = null;

  private placeTip(): TanreiTooltip | null {
    const text = this.renderRoot?.querySelector('.text');
    let tip = this.tipElement;
    if (!text) return tip;
    if (!tip) {
      tip = document.createElement('tanrei-tooltip') as TanreiTooltip;
      tip.className = 'cut-tip';
      tip.setAttribute('no-describe', '');
      tip.setAttribute('aria-hidden', 'true');
      tip.addEventListener('close', () => this.track());
      this.tipElement = tip;
    }
    if (tip.parentElement !== text) {
      if (tip.open) tip.open = false;
      text.append(tip);
    }
    return tip;
  }

  /** LRW-7: what is cut — the headline, or the supporting text — as the headline alone, or the headline and the supporting text. */
  private cutContent(): CutTextContent | null {
    const headline = this.renderRoot?.querySelector('.headline');
    const supporting = this.renderRoot?.querySelector('.supporting');
    if (!isCut(headline) && !isCut(supporting)) return null;
    const name = spoken(this.headline);
    const note = spoken(this.supportingText);
    return note ? { title: name, text: note } : { text: name };
  }

  private onLeadingChange(event: Event) {
    this.leadingFilled = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || spoken(node.textContent) !== '');
  }

  private onTrailingChange(event: Event) {
    this.trailingFilled = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || spoken(node.textContent) !== '');
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('supportingLines') && !readLines(this.supportingLines).exact) {
      report(this, 'LRW-2', `supportingLines ${String(this.supportingLines)} is neither 1 nor 2; it is read as ${readLines(this.supportingLines).lines}`, { once: false });
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('listItemFrame')) {
      // LRW-7: the keyboard focus of the item this row is in shows the tooltip.
      this.listen(this.listItemFrame && this.parentElement ? this.parentElement : null);
    }
    if (changed.has('headline') && this.hasUpdated && spoken(this.headline) === '') {
      report(this, 'LRW-10', 'the row has no headline, so the list item it is in has no name; give it a headline');
    }
    if ((changed.has('leadingIcon') || (changed as Map<PropertyKey, unknown>).has('leadingFilled')) && this.leadingFilled && spoken(this.leadingIcon)) {
      report(this, 'LRW-4', `leadingIcon "${this.leadingIcon}" is not drawn: the leading slot holds content, which is drawn in its place`);
    }
    // LST-49, LRW-14: the item this row is in takes its new name and description. LST-50: the list hears whether the
    // row draws a leading glyph.
    if (this.hasUpdated && ['headline', 'overline', 'supportingText', 'trailingText', 'leadingIcon', 'leadingFilled'].some((key) => (changed as Map<PropertyKey, unknown>).has(key)) && !changed.has('listItemFrame')) this.ask();
  }

  protected override firstUpdated() {
    if (spoken(this.headline) === '') report(this, 'LRW-10', 'the row has no headline, so the list item it is in has no name; give it a headline');
  }

  protected override render() {
    const frame = this.listItemFrame;
    const lines = this.lines;
    const overline = spoken(this.overline);
    const supporting = spoken(this.supportingText);
    const trailingText = spoken(this.trailingText);
    const leadingIcon = spoken(this.leadingIcon);
    const trailingIcon = spoken(this.trailingIcon);
    const drawsIcon = !this.leadingFilled && leadingIcon !== '';
    // LRW-16: without a leading part of its own, the row keeps a glyph's room where the list asks for it (LST-50).
    const keepsRoom = !this.leadingFilled && !drawsIcon && !!frame?.leadingRoom;
    return html`
      <div
        part="container"
        class=${classMap({ row: true, two: lines === 2, three: lines === 3, boxed: !!frame?.boxed, handled: !!frame?.handled, selected: !!frame?.selected, disabled: !!frame?.disabled })}
      >
        <div class="parts">
          <span part="leading" class=${classMap({ leading: true, has: this.leadingFilled || drawsIcon || keepsRoom })}>
            <slot name="leading" @slotchange=${this.onLeadingChange}></slot>
            ${drawsIcon
              ? html`<span part="leading-icon" class="leading-icon" aria-hidden="true"><span class="ink">${leadingIcon}</span></span>`
              : keepsRoom
                ? html`<span class="leading-room" aria-hidden="true"></span>`
                : nothing}
          </span>
          <span part="text" class="text">
            ${overline ? html`<span part="overline" class="overline"><bdi>${overline}</bdi></span>` : nothing}
            <span part="headline" class="headline"><bdi>${spoken(this.headline)}</bdi></span>
            ${supporting
              ? html`<span part="supporting-text" class="supporting" style=${styleMap({ '--_lines': String(readLines(this.supportingLines).lines) })}><bdi>${supporting}</bdi></span>`
              : nothing}
          </span>
          ${trailingText ? html`<span part="trailing-text" class="trailing-text"><bdi>${trailingText}</bdi></span>` : nothing}
          <span part="trailing" class=${classMap({ trailing: true, has: this.trailingFilled })}><slot name="trailing" @slotchange=${this.onTrailingChange}></slot></span>
          ${trailingIcon ? html`<span part="trailing-icon" class="trailing-icon" aria-hidden="true"><span class="ink">${trailingIcon}</span></span>` : nothing}
        </div>
      </div>
      <span class="tip-clock"></span>
    `;
  }
}

if (!customElements.get('tanrei-list-row')) customElements.define('tanrei-list-row', TanreiListRow);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-list-row': TanreiListRow;
  }
}
