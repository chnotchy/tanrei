import { LitElement, type PropertyDeclarations, type PropertyValues, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { html, literal } from 'lit/static-html.js';
import { wordPlaces } from '../../generated/words.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  GlyphMirrorController,
  KeptLengths,
  LINK_MARK,
  LinkController,
  PressController,
  RovingKeys,
  type TanreiLinkTarget,
  WordsController,
  deepActive,
  fillPlaces,
  placeFaults,
  reportPlaces,
  focusWithin,
  hostAria,
  linkAttributes,
  notifyItemUpdate,
  parseValues,
  isDisabledControl,
  report,
  linkForm,
  slottedInteractive,
  syncFocusStyle,
} from '../../primitives/index.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import '../button/button.js';
import type { TanreiButton } from '../button/button.js';
import { ownDirection } from '../../styles/product-text.js';
import { itemStyles, listStyles } from './list.styles.js';

/** LST-21: the glyph of the icon set a selected option draws — the spec's name, not a value. */
const CHECK_GLYPH = 'check';

/** Whether people choose items: `none` shows or opens things; `single` and `multiple` make the list a listbox. A closed set. */
export type TanreiListSelection = 'none' | 'single' | 'multiple';
const SELECTIONS: readonly TanreiListSelection[] = ['none', 'single', 'multiple'];

/** How an item's leading slot is framed: `avatar` a round box, `image` a larger rounded square, `none` not drawn. A closed set. */
export type TanreiListLeadingMedia = 'none' | 'avatar' | 'image';
const LEADING_MEDIA: readonly TanreiListLeadingMedia[] = ['none', 'avatar', 'image'];

/**
 * Whether people can put the items in another order: `none` fixes the order; `buttons` draws two move buttons in every
 * item. The spec's third value, `drag` (the two buttons and a handle a pointer drags), is not built here yet: it is
 * read as `buttons`, the form that is complete by itself (LST-36), and reported in debug builds.
 */
export type TanreiListReorder = 'none' | 'buttons';
/** The spec's values (LST-7): `drag` is known, and drawn as `buttons` until its handle is built. TODO: build the drag handle. */
const REORDERS: readonly string[] = ['none', 'buttons', 'drag'];

/** What `move` carries: the index the item had when the move was asked for and the index it is to have, both from 0. */
export interface TanreiListMoveDetail {
  from: number;
  to: number;
}

/** LST-37: the glyphs of the icon set the two move buttons draw — the spec's names, not values. */
const MOVE_GLYPHS = { up: 'arrow_upward', down: 'arrow_downward' } as const;
/** One of an item's two move buttons. */
type MoveButton = keyof typeof MOVE_GLYPHS;
/** A control of a reorderable item, in reading and focus order (LST-37, LST-52). */
type ControlPlace = MoveButton | 'trailing';
const CONTROL_PLACES: readonly ControlPlace[] = ['up', 'down', 'trailing'];

/** What `change` carries: the list's `value` after the change (single), or its `values` (multiple). */
export type TanreiListChangeDetail = { value: string | null } | { values: string[] };

/** An item is static, one action (interactive), a link (LST-31), or an option of a selectable list (LST-12). */
type ItemMode = 'static' | 'interactive' | 'link' | 'option';

/** What the list tells each of its items. */
interface ItemContext {
  selectable: boolean;
  selected: boolean;
  tabStop: boolean;
  position: number;
  size: number;
  /** LST-36: the list is reorderable, so the item is static and draws the two move buttons. */
  reorder: boolean;
  /** LST-51: the controls of every item stand on a line of their own below the text. */
  stacked: boolean;
  /** LST-38: the names of the two move buttons; empty where nobody gave the word. */
  moveUp: string;
  moveDown: string;
}

/** The item of `list` an event came from: the first list item on its composed path whose list is `list`. */
function itemOf(list: Element, event: Event): TanreiListItem | null {
  for (const node of event.composedPath()) {
    if (node === list) return null;
    if (node instanceof TanreiListItem && node.parentElement === list) return node;
  }
  return null;
}

/**
 * One row of a list — the spec's item kind `list-item`: a headline with an optional overline, supporting
 * text, leading icon or media and trailing text, icon or control. Placed as a child of `<tanrei-list>`, which decides
 * whether it is an option; otherwise it is static, one action with `interactive`, or a link with `href`.
 *
 * Contract: specs/list.spec.json. Every visual value comes from `--tanrei-comp-list-*` tokens, one set per condition
 * (unselected, selected) and state. How a press is answered and how keyboard focus is drawn are the system's choices of
 * kind (`--tanrei-sys-behavior-*`), read from the cascade.
 *
 * Semantics: the host is a `listitem` — or, in a selectable list, an `option` with its selected state, named by the
 * headline and described by the overline, supporting text and trailing text, which takes focus itself. An interactive
 * item draws one element with the button role inside its list item, named and described the same way. The list sets
 * each item's position and the list's size (`aria-posinset`, `aria-setsize`) and which one is the tab stop.
 *
 * With `href` (and outside a selectable list) the item is a link item (LST-31): an `<a href>` in place of the
 * element with the button role, inside the host's list item, in the list's one tab stop and arrow-key order, drawn as an
 * interactive item is. Enter follows it and Space does not; `click` fires first and cancelling it cancels the
 * navigation. `target="new"` opens a new tab, safely (`noopener`), draws the icon set's `open_in_new` as the trailing
 * icon unless `trailing-icon` names one, and reads `target-label` at the end of the item's description.
 *
 * @tag tanrei-list-item
 * @slot leading - The avatar's or the image's content (an `<img>`, or a monogram for an avatar), drawn only while `leading-media` is `avatar` or `image`. Hidden from assistive technology unless it is named (an `alt`, an `aria-label`).
 * @slot trailing - A control of your own at the end of a static item: a switch, a checkbox, an icon button. It keeps its own tokens, semantics and focus stop. An interactive item or an option must hold no interactive element (reported in debug builds). In a reorderable list it stands after the two move buttons: one control, typically the button that removes the item.
 * @csspart container - The row: its color, corners, every state, the ripple and the focus ring; an interactive item's button, a link item's anchor.
 * @csspart leading-icon - The leading glyph.
 * @csspart leading-media - The avatar's or the image's box.
 * @csspart overline - The line above the headline.
 * @csspart headline - The item's main text.
 * @csspart supporting-text - The text below the headline.
 * @csspart trailing-text - The short value at the end of the row.
 * @csspart trailing-icon - The trailing glyph; the mark of a link item that opens a new context while `trailing-icon` is empty.
 * @csspart move-button - One of the two move buttons of an item of a reorderable list, a `<tanrei-button>`: first the one that moves the item up, then the one that moves it down.
 * @csspart mark - The check at the end of an option: the icon set's `check` glyph in a box reserved in every option.
 * @csspart divider - The hairline along the bottom of the item.
 * @fires click - An interactive item or a link item was activated by pointer, touch, keyboard or assistive technology. A link item fires it before the browser follows the address; `preventDefault()` cancels the navigation.
 */
export class TanreiListItem extends LitElement {
  static override styles = [itemStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    overline: { type: String },
    supportingText: { type: String, attribute: 'supporting-text' },
    supportingMaxLines: { type: Number, attribute: 'supporting-max-lines' },
    trailingText: { type: String, attribute: 'trailing-text' },
    leadingIcon: { type: String, attribute: 'leading-icon' },
    trailingIcon: { type: String, attribute: 'trailing-icon' },
    leadingMedia: { type: String, attribute: 'leading-media', reflect: true },
    interactive: { type: Boolean, reflect: true },
    value: { type: String },
    disabled: { type: Boolean, reflect: true },
    divider: { type: Boolean, reflect: true },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
    context: { state: true },
    supportingLines: { state: true },
  };

  /** The item's main text, and its accessible name. Required. */
  headline = '';

  /** A short line above the headline: a category, a source. */
  overline = '';

  /** Text below the headline. One line of it makes a two-line item; two or more make a three-line item. */
  supportingText = '';

  /** The lines of supporting text shown before it ends with an ellipsis; 0 shows all of it. The full text is still the item's description. */
  supportingMaxLines = 0;

  /** A short value at the end of the row: a count, a time, a size. */
  trailingText = '';

  /** The name of a glyph of the system's icon set at the start of the row. Empty: nothing, and no space. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. */
  leadingIcon = '';

  /** The name of a glyph at the end of the row, such as `chevron_right` (which the icon set flags: it points to the left in a right-to-left layout). */
  trailingIcon = '';

  /** How the `leading` slot is framed: `avatar` (a round box) or `image` (a rounded square); it replaces the leading icon. */
  leadingMedia: TanreiListLeadingMedia = 'none';

  /** Makes the item one pressable action that emits `click`. Ignored in a selectable list, where every item is an option. */
  interactive = false;

  /** Identifies the option: the list's `value` or `values` select it, and `change` carries it. Unique within the list. */
  value = '';

  /** Prevents activation; the arrow keys still reach it. Ignored for a static item. */
  disabled = false;

  /** Draws a hairline along the bottom of the item. Set it on every item but the last, or at the end of a group. */
  divider = false;

  /**
   * The destination: a URL, a path or a fragment. Not empty, the item is a link item (LST-31) whether `interactive` is
   * set or not: one link inside its list item, in the list's arrow-key order, followed by Enter and not by Space.
   * Ignored in a selectable list, where every item is an option; white space is no destination, and a `javascript:`
   * address or one that cannot be read is refused and reported in debug builds (LST-35).
   */
  href = '';

  /**
   * Where the destination opens: `same` (here) or `new` (a new tab or window, with `noopener`), which the item marks
   * with the glyph `open_in_new` as its trailing icon — unless `trailingIcon` names one — and says through `targetLabel`
   * (LST-33). HTML's `_self` and `_blank` are read as those two; anything else is `same` and reported. Ignored without `href`.
   */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads at the end of the link's description while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: forwarded to the anchor's `rel`; `target="new"` adds `noopener` to it. Ignored without `href`. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download` (the file name; empty for the address's own). Ignored without `href`. */
  download: string | null = null;

  /** What the list says about this item. */
  private context: ItemContext = { selectable: false, selected: false, tabStop: false, position: 0, size: 0, reorder: false, stacked: false, moveUp: '', moveDown: '' };

  /** The lines the supporting text takes as laid out (LST-17). */
  private supportingLines = 1;

  /**
   * LST-31 … LST-35: the link the item is while it has a destination and is no option, what its anchor carries, and
   * what a debug build is told (src/primitives/link.ts). An option holds a state and takes none (LST-35).
   */
  private readonly link = new LinkController(this, {
    ids: { refused: 'LST-35', newContext: 'LST-33' },
    disabled: () => this.disabled,
    holds: () => (this.context.selectable ? 'an option of a selectable list' : this.context.reorder ? 'an item of a reorderable list' : null),
  });

  /**
   * LST-8 / LST-9: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). LST-32: a
   * link item is pressed by Enter alone; Space is the browser's.
   */
  private readonly press = new PressController(this, {
    container: () => this.row,
    holdCarrier: () => this.renderRoot.querySelector('.text'),
    disabled: () => !this.active,
    keys: () => this.link.pressKeys,
  });

  /** LST-27: the check is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.mark, .move-glyph'));
  /**
   * LST-37: the two move buttons each keep a touch target's length along the row — two narrower than that stand apart
   * by what is missing (src/primitives/kept-length.ts). LST-51: the list is told when their lengths arrive.
   */
  private readonly kept = new KeptLengths(() => this.drawn());
  /**
   * LST-29: the leading and trailing glyphs are marked when the icon set mirrors their names in right-to-left
   * (`chevron_right`, `arrow_forward`; never `check`), and `iconGlyph()` draws the mark. The mark (LST-21) is not named.
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.leading-icon, .trailing-icon' });

  /** Space activates on key-up, as a native button does, and only when the key went down on the item. */
  private spaceDown = false;
  private lines?: ResizeObserver;
  private observed: Element | null = null;

  constructor() {
    super();
    // LST-2: a disabled action or option swallows every click that reaches it, from its content or dispatched on it.
    this.addEventListener(
      'click',
      (event) => {
        if (this.mode !== 'static' && this.disabled) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('keyup', this.onKeyUp);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  /** @internal The list's side: whether the item is an option, selected, the tab stop, and where it stands. */
  setListContext(context: ItemContext) {
    const now = this.context;
    if (Object.keys(context).every((key) => context[key as keyof ItemContext] === now[key as keyof ItemContext])) return;
    this.context = context;
  }

  /** @internal Whether the item takes focus in its list: an action or an option — a disabled one too (LST-2). */
  get takesFocus(): boolean {
    return this.mode !== 'static';
  }

  /** @internal Whether the item is a selected option. */
  get selected(): boolean {
    return this.context.selectable && this.context.selected;
  }

  /**
   * @internal Whether the item is one pressable thing outside a selectable list — an action (`interactive`) or a link
   * (LST-31) — and so takes its place in the list's arrow-key order (LST-15). What the list asks before it tells the item
   * anything.
   */
  get pressable(): boolean {
    return this.interactive || linkForm(this, this.disabled) !== null;
  }

  /** @internal LST-37: one of the item's two move buttons, while the list is reorderable. */
  moveButton(which: MoveButton): TanreiButton | null {
    return this.renderRoot?.querySelector<TanreiButton>(`.move.${which}`) ?? null;
  }

  /** @internal LST-52: the product's control in the trailing slot — the first element it placed there. */
  get trailingControl(): HTMLElement | null {
    return [...this.children].find((child): child is HTMLElement => child instanceof HTMLElement && child.slot === 'trailing') ?? null;
  }

  /** @internal The control of the item at `place`. */
  control(place: ControlPlace): HTMLElement | null {
    return place === 'trailing' ? this.trailingControl : this.moveButton(place);
  }

  /** @internal Which of the item's controls an event came from: a move button, or what the trailing slot holds. */
  placeOf(event: Event): ControlPlace | null {
    const path = event.composedPath();
    for (const which of ['up', 'down'] as const) {
      const button = this.moveButton(which);
      if (button && path.includes(button)) return which;
    }
    const trailing = this.trailingControl;
    return trailing && path.includes(trailing) ? 'trailing' : null;
  }

  /**
   * @internal LST-51: whether the item's controls, standing in the row, would leave its text column narrower than
   * `comp.list.reorder.text-min-width` (a length that grows with the text, read as the row computes it). Counted from what stands beside the text — the leading element, the trailing text and icon, the
   * move buttons and the trailing control, each at the width it has, and the gaps between them — so the answer is the
   * same whichever way the controls are placed now.
   */
  get squeezed(): boolean {
    const row = this.row;
    const controls = this.renderRoot?.querySelector<HTMLElement>('.controls');
    if (!row || !controls) return false;
    const width = (element: Element) => element.getBoundingClientRect().width;
    const style = getComputedStyle(row);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const held = [...controls.children].flatMap((child) => (child instanceof HTMLSlotElement ? child.assignedElements({ flatten: true }) : [child])).map(width).filter((each) => each > 0);
    const between = Number.parseFloat(getComputedStyle(controls).columnGap) || 0;
    let beside = held.reduce((sum, each) => sum + each, 0) + between * Math.max(0, held.length - 1);
    let parts = held.length ? 2 : 1;
    for (const child of row.children) {
      if (child === controls || child.classList.contains('text')) continue;
      const taken = width(child);
      if (taken <= 0) continue;
      beside += taken;
      parts++;
    }
    const whole = width(row);
    const text = whole - (Number.parseFloat(style.paddingLeft) || 0) - (Number.parseFloat(style.paddingRight) || 0) - beside - gap * (parts - 1);
    const least = Number.parseFloat(style.scrollPaddingTop);
    return Number.isFinite(least) && text < least;
  }

  /** LST-51: what the list measures has been drawn, or has changed its size. */
  private drawn() {
    const list = this.parentElement;
    if (this.context.reorder && list instanceof TanreiList) list.itemDrawn();
  }

  /**
   * LST-41, LST-52: which move button holds focus. Focus that goes from one button to the other never leaves this
   * shadow root, so the list — outside it — is told from here.
   */
  private onMovesFocus(event: FocusEvent) {
    const list = this.parentElement;
    const place = this.placeOf(event);
    if (place && list instanceof TanreiList) list.controlFocused(this, place);
  }

  /** LST-39: a move button was activated — by pointer, touch, Enter, Space or assistive technology, as a Button is. */
  private onMove(which: MoveButton) {
    const list = this.parentElement;
    if (list instanceof TanreiList) list.requestMove(this, which);
  }

  /** @internal The element that takes focus: an interactive item's row, a link item's anchor, an option's host. */
  get focusTarget(): HTMLElement | null {
    const mode = this.mode;
    return mode === 'interactive' || mode === 'link' ? this.row : mode === 'option' ? this : null;
  }

  /**
   * LST-12, LST-31: an option in a selectable list, else a link while it has a destination, else an action while
   * `interactive`, else static. LST-36: every item of a reorderable list is static, whatever it asks to be — a row that
   * is itself one button or one link cannot hold the buttons that move it.
   */
  private get mode(): ItemMode {
    if (this.context.selectable) return 'option';
    if (this.context.reorder) return 'static';
    return this.link.form ? 'link' : this.interactive ? 'interactive' : 'static';
  }

  /** Whether the item can be activated now. */
  private get active(): boolean {
    return this.mode !== 'static' && !this.disabled;
  }

  private get row() {
    return this.renderRoot?.querySelector<HTMLElement>('.row') ?? null;
  }

  /** LST-7: a leading media the list does not define is drawn as `none`. */
  private get media(): TanreiListLeadingMedia {
    return LEADING_MEDIA.includes(this.leadingMedia) ? this.leadingMedia : 'none';
  }

  /**
   * LST-23: the overline, supporting text and trailing text, in reading order — the full text, even when it is cut.
   * LST-33: a link item that opens a new context ends it with `targetLabel`.
   */
  private get description(): string {
    return this.link.describe(this.overline, this.supportingText, this.trailingText) ?? '';
  }

  /** `element.focus()` focuses an action's row, or an option; a static item has nothing to focus (LST-11). */
  override focus(options?: FocusOptions) {
    const target = this.focusTarget;
    if (target === this) super.focus(options);
    else target?.focus(options);
  }

  /** `element.click()` activates an action or an option as a person would, and follows a link item; a static or disabled item does nothing (LST-2, LST-11). */
  override click() {
    if (!this.active) return;
    if (this.mode === 'option') super.click();
    else this.row?.click();
  }

  /** LST-1 / LST-13 / LST-14: an action's click comes from its row; an option's from its host, which the list answers. */
  private activate() {
    if (this.mode === 'interactive') this.row?.click();
    else if (this.mode === 'option') super.click();
  }

  /** LST-1: Enter activates on key-down and Space on key-up, as a native button does. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const mode = this.mode;
    if (mode === 'static' || event.composedPath()[0] !== this.focusTarget) return;
    // LST-32: a link item's keys are the anchor's own — Enter fires its click and follows it, Space scrolls the page as
    // on any link — so nothing is prevented and no click is made here. A disabled one has no address to follow.
    if (mode === 'link') {
      if (this.active) this.press.onKeyDown(event);
      return;
    }
    if (event.key === ' ') event.preventDefault(); // Space would scroll the page.
    if (!this.active) return;
    this.press.onKeyDown(event);
    if (event.key === 'Enter') {
      if (!event.repeat) this.activate();
    } else if (event.key === ' ') this.spaceDown = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (this.mode === 'static' || event.composedPath()[0] !== this.focusTarget) return;
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    if (this.active) this.activate();
  };

  /** LST-2: a press on a disabled item does not focus it (as on a native disabled control); the arrow keys still reach it. */
  private onMouseDown(event: MouseEvent) {
    if (this.mode !== 'static' && this.disabled) event.preventDefault();
  }

  /** LST-10: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (event.composedPath()[0] === this.focusTarget) syncFocusStyle(this, this.focusTarget);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    if (event.composedPath()[0] !== this.focusTarget) return;
    // A Space whose key-up arrives somewhere else does not activate, as on a native button.
    this.spaceDown = false;
    this.press.onBlur();
  };

  /** LST-24: an action's or an option's slots hold nothing interactive; a debug build names what it found, on every slot change. */
  private async inspectSlots() {
    if (this.mode === 'static') return;
    for (const slot of this.renderRoot.querySelectorAll('slot')) {
      const found = await slottedInteractive(slot);
      if (found) {
        report(this, 'LST-24', `${this.mode === 'option' ? 'an option' : this.mode === 'link' ? 'a link item' : 'an interactive item'} holds an interactive element (<${found.localName}>) in its ${slot.name} slot, which assistive technology cannot reach and whose press would also activate the item; make the item static and let that element be its control`);
        return;
      }
    }
  }

  /** LST-24: what the trailing slot holds is inspected; LST-51: and, in a reorderable list, measured again. */
  private onTrailingChange() {
    void this.inspectSlots();
    this.drawn();
  }

  /** LST-23: media holding content the product named (an `alt`, an `aria-label`) is read; any other is hidden. */
  private mediaNamed = false;
  private onLeadingChange(event: Event) {
    const assigned = (event.target as HTMLSlotElement).assignedElements({ flatten: true });
    const named = assigned.some((element) => !!(element.getAttribute('alt')?.trim() || element.getAttribute('aria-label')?.trim() || element.getAttribute('aria-labelledby')?.trim()));
    if (named !== this.mediaNamed) {
      this.mediaNamed = named;
      this.requestUpdate();
    }
    void this.inspectSlots();
  }

  /** LST-17: count the supporting text's lines as laid out, whenever its box changes. */
  private observeLines() {
    const supporting = this.renderRoot.querySelector('.supporting');
    if (supporting === this.observed) return;
    this.lines?.disconnect();
    this.observed = supporting;
    if (!supporting) {
      this.supportingLines = 1;
      return;
    }
    this.lines ??= new ResizeObserver(() => {
      const element = this.observed;
      if (!element) return;
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      const lines = lineHeight > 0 ? Math.max(1, Math.round(element.getBoundingClientRect().height / lineHeight)) : 1;
      if (lines !== this.supportingLines) this.supportingLines = lines;
    });
    this.lines.observe(supporting);
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.observed) this.lines?.observe(this.observed);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.lines?.disconnect();
    this.kept.clear();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // LST-7: a leading media the list does not define is drawn as none; a debug build says so.
    if (changed.has('leadingMedia') && !LEADING_MEDIA.includes(this.leadingMedia)) {
      report(this, 'LST-7', `leadingMedia "${this.leadingMedia}" is not a value the list defines; it is drawn as "none"`);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    const { position, size, tabStop } = this.context;
    const mode = this.mode;
    const option = mode === 'option';
    // LST-12, LST-23: a list item — or an option with its selected state, named by the headline and described by the
    // rest — with its position and the list's size.
    hostAria(this, {
      role: option ? 'option' : 'listitem',
      'aria-selected': option ? String(this.selected) : null,
      'aria-disabled': option && this.disabled ? 'true' : null,
      'aria-label': option && this.headline ? this.headline : null,
      'aria-description': option && this.description ? this.description : null,
      'aria-posinset': position ? String(position) : null,
      'aria-setsize': size ? String(size) : null,
      // LST-15: an option takes focus itself; only the list's tab stop is in the tab order.
      tabindex: option ? (tabStop ? '0' : '-1') : null,
    });
    // LST-23: an item without a headline has no accessible name; a debug build says so.
    if (changed.has('headline') && !this.headline.trim()) report(this, 'LST-23', 'headline is empty, so the item has no accessible name; give it a headline');
    if (changed.has('interactive') || changed.has('href') || (changed as Map<PropertyKey, unknown>).has('context')) void this.inspectSlots();
    if (changed.has('disabled') && this.disabled) this.spaceDown = false;
    this.observeLines();
    // LST-36: a reorderable list's item that asks to be a button or a link is drawn static; a debug build says so.
    if (this.context.reorder && (this.interactive || this.href.trim())) {
      report(this, 'LST-36', `an item of a reorderable list is static: its ${this.interactive ? 'interactive' : 'href'} is ignored, because a row that is itself one ${this.interactive ? 'button' : 'link'} cannot hold the buttons that move it`);
    }
    // LST-37: the two move buttons, measured while they are drawn.
    this.kept.set(this.context.reorder ? [...this.renderRoot.querySelectorAll<HTMLElement>('.move')] : []);
    if (this.context.reorder) this.drawn();
    // The list re-reads its items when one of the props it depends on changes; an internal event, kept out of the item's
    // public API.
    if (['headline', 'value', 'disabled', 'interactive', 'href'].some((key) => changed.has(key as keyof TanreiListItem)) && this.hasUpdated) {
      notifyItemUpdate(this, 'tanrei-list-item-update');
    }
  }

  protected override render() {
    const mode = this.mode;
    const interactive = mode === 'interactive';
    // LST-31: a link item's row is an anchor in place of the element with the button role — the same classes, part and
    // listeners, in the list's roving tab stop — whose address and disabled form are the link primitive's (LST-34: a
    // disabled one is the anchor without `href`, still reached by the arrow keys through its tabindex).
    const link = this.link.form;
    const tag = link ? literal`a` : literal`div`;
    const action = interactive || !!link;
    // LST-33: a new context is marked where the trailing icon is drawn, unless the product named its own.
    const trailingIcon = this.trailingIcon || (link?.opensNew ? LINK_MARK : '');
    const media = this.media;
    const lead = media !== 'none' ? media : this.leadingIcon ? 'icon' : 'none';
    // LST-17: one line for the headline, one for an overline, and the supporting text's lines as laid out.
    const lines = Math.min(3, 1 + (this.overline ? 1 : 0) + (this.supportingText ? this.supportingLines : 0));
    const clamp = this.supportingMaxLines > 0;
    const { reorder, position, size } = this.context;
    // LST-37, LST-38, LST-40: one move button — an icon-only text Button, named by the product's sentence with its
    // place {headline} filled by the item's headline (a plain string: the headline is not described a second time),
    // disabled and still drawn where the item cannot go that way. Its glyph is never mirrored: up is up in every layout.
    const move = (which: MoveButton, sentence: string, disabled: boolean) => html`<tanrei-button
      part="move-button"
      class="move ${which}"
      variant="text"
      label=${sentence
        ? fillPlaces(sentence, { headline: this.headline })
            .runs.map((run) => run.text)
            .join('')
        : ''}
      ?disabled=${disabled}
      @click=${() => this.onMove(which)}
      ><span slot="icon" class="move-glyph" data-mirror="never"><span class="ink">${MOVE_GLYPHS[which]}</span></span></tanrei-button
    >`;
    const trailing = html`<slot name="trailing" @slotchange=${this.onTrailingChange}></slot>`;
    return html`
      <${tag}
        part="container"
        class=${classMap({ row: true, p: mode !== 'static', d: mode !== 'static' && this.disabled, selected: this.selected, stacked: reorder && this.context.stacked, [`lines-${lines}`]: true })}
        data-tanrei-shape
        role=${interactive ? 'button' : nothing}
        ${linkAttributes(link)}
        tabindex=${action ? (this.context.tabStop ? '0' : '-1') : nothing}
        aria-label=${action && this.headline ? this.headline : nothing}
        aria-description=${action && this.description ? this.description : nothing}
        aria-disabled=${interactive && this.disabled ? 'true' : nothing}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @mousedown=${this.onMouseDown}
      >
        ${lead === 'icon' ? html`<span part="leading-icon" class="leading-icon" aria-hidden="true">${this.leadingIcon}</span>` : nothing}
        ${media !== 'none'
          ? html`<span part="leading-media" class="media ${media}" data-tanrei-shape aria-hidden=${this.mediaNamed ? nothing : 'true'}
              ><slot name="leading" @slotchange=${this.onLeadingChange}></slot
            ></span>`
          : nothing}
        <span class="text">
          ${this.overline ? html`<span part="overline" class="overline">${this.overline}</span>` : nothing}
          <span part="headline" class="headline">${this.headline}</span>
          ${this.supportingText
            ? html`<span part="supporting-text" class=${classMap({ supporting: true, clamped: clamp })} dir=${clamp ? ownDirection(this.supportingText) : nothing} style=${styleMap(clamp ? { '--_max-lines': String(this.supportingMaxLines) } : {})}>${this.supportingText}</span>`
            : nothing}
        </span>
        ${this.trailingText ? html`<span part="trailing-text" class="trailing-text">${this.trailingText}</span>` : nothing}
        ${trailingIcon ? html`<span part="trailing-icon" class="trailing-icon" aria-hidden="true">${trailingIcon}</span>` : nothing}
        ${reorder
          ? html`<span class="controls"
              ><span class="moves" @focusin=${this.onMovesFocus}>${move('up', this.context.moveUp, position <= 1)}${move('down', this.context.moveDown, position >= size)}</span>${trailing}</span
            >`
          : trailing}
        ${this.context.selectable
          ? html`<span part="mark" class="mark" aria-hidden="true"><span class="ink">${CHECK_GLYPH}</span></span>`
          : nothing}
      </${tag}>
      ${this.divider ? html`<span part="divider" class="divider lead-${lead}" aria-hidden="true"></span>` : nothing}
    `;
  }
}

/** LST-41: a move the list emitted and the product has not answered yet. */
interface PendingMove {
  /** The item that was asked to move, its headline then, and where from and to. */
  item: TanreiListItem;
  headline: string;
  from: number;
  to: number;
  /** The button that asked, and whether keyboard focus was on it. */
  which: MoveButton;
  focused: boolean;
  /** The items and their headlines when the move was asked for: what tells a new element for the same content from one that never moved. */
  before: TanreiListItem[];
  headlines: string[];
  /** Ends the wait: the move is then taken as refused. */
  timer: number;
}

/** LST-41, LST-52: the control of a reorderable item that holds keyboard focus, and where its item stood. */
interface HeldFocus {
  item: TanreiListItem;
  index: number;
  place: ControlPlace;
}

/**
 * Shows a column of related items that people read, open one by one, choose from, or put in another order.
 *
 * Contract: specs/list.spec.json. The list draws nothing and adds no space around its `<tanrei-list-item>` children;
 * it carries the semantics — a `list`, or a `listbox` named by `label` while `selection` is `single` or `multiple` — and
 * moves keyboard focus among the items: one tab stop (a roving tabindex), Up and Down Arrow without wrapping, Home, End
 * and typeahead. Moving focus never changes the selection; Space or Enter chooses.
 *
 * The selection is the list's: `value` names the selected option of a single-select list, `values` those
 * of a multiple-select list, each by the options' `value`. The list sets them before firing `change`, as a native
 * control does; set them yourself to select from script (a new array for `values`).
 *
 * With `reorder="buttons"` (and `selection` none) the list is reorderable (LST-36): every item is static and draws two
 * move buttons — Tanrei Buttons, each a focus stop of its own in reading order, before the item's trailing control —
 * and the list is not one tab stop and handles no key. A press fires `move` with `from` and `to` and changes nothing:
 * the order is your data. Reorder your items in answer (move the elements, or let your framework render the new
 * order) and the list draws the two rows changing place, keeps focus on the same button of the moved item — on its
 * other button once it is first or last — and says `moved-text` once through its one polite live region, with
 * `{headline}`, `{position}` (from 1) and `{count}` filled. A move you have not made within
 * `--tanrei-comp-list-motion-reorder-duration` is taken as refused: nothing is announced. The three words are yours
 * (`move-up-label`, `move-down-label`, `moved-text`, or once with `setWords()`): without them the buttons work unnamed
 * and nothing is announced, and a debug build says so. The spec's `reorder="drag"` (a handle a pointer drags) is not
 * built yet and is read as `buttons`.
 *
 * @tag tanrei-list
 * @slot - The items: `<tanrei-list-item>` children.
 * @fires {CustomEvent<TanreiListChangeDetail>} change - The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the list already holds.
 * @fires {CustomEvent<TanreiListMoveDetail>} move - The user asked for an item to stand in another place, by a move button: `detail.from` is the item's index and `detail.to` the index it is to have, both from 0. Fired once per move; it bubbles and cannot be cancelled. The list has moved nothing: reorder your items.
 */
export class TanreiList extends LitElement {
  private readonly availability = new AvailabilityController(this, 'list');
  static override styles = [listStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    selection: { type: String, reflect: true },
    label: { type: String },
    value: { type: String },
    values: { attribute: 'values', converter: { fromAttribute: parseValues } },
    reorder: { type: String, reflect: true },
    moveUpLabel: { type: String, attribute: 'move-up-label' },
    moveDownLabel: { type: String, attribute: 'move-down-label' },
    movedText: { type: String, attribute: 'moved-text' },
  };

  /** Whether people choose items: `none` shows or opens things; `single` chooses one; `multiple` any number. */
  selection: TanreiListSelection = 'none';

  /** The accessible name of the list: what the items are. Required while `selection` is `single` or `multiple`. */
  label = '';

  /** The value of the selected option while `selection` is `single`; `null` selects none. */
  value: string | null = null;

  /** The values of the selected options while `selection` is `multiple`. Assign a new array to change it. */
  values: string[] = [];

  /**
   * Whether people can put the items in another order: `none` fixes it; `buttons` draws in every item a button that
   * moves it up and one that moves it down. The list fires `move` and never changes the order itself: the items are
   * your data. Read only while `selection` is `none`, and every item of a reorderable list is static (LST-36). The
   * spec's `drag` is not built yet: it is read as `buttons` and reported in debug builds.
   */
  reorder: 'none' | 'buttons' = 'none';

  /** The accessible name of the button that moves an item up by one place: your sentence with the place `{headline}`, which the list fills with the item's headline ("Move {headline} up"). Empty reads the product's words (`setWords({ moveUpLabel })`); Tanrei has none, and without them the button works unnamed (LST-38). */
  moveUpLabel = '';

  /** The accessible name of the button that moves an item down by one place ("Move {headline} down"). As `moveUpLabel`. */
  moveDownLabel = '';

  /**
   * The sentence assistive technology is told once an item stands in its new place. Write the whole sentence in your
   * language and mark three places, which the list fills: `{headline}` with the moved item's headline, `{position}`
   * with the place it now has, counted from 1, and `{count}` with the number of items. Empty reads the product's words
   * (`setWords({ movedText })`); Tanrei has no sentence, and without one nothing is announced (LST-38).
   */
  movedText = '';

  /** LST-15: the item that had focus last, which stays the tab stop. */
  private lastFocused: TanreiListItem | null = null;
  private readonly keys = new RovingKeys({ wrap: false });

  /** LST-38: the three words are the product's — this list's props, else the product's words, else nothing. */
  private readonly words = new WordsController(this);
  /** LST-38: the names of the two move buttons as found at the last render. */
  private upName = '';
  private downName = '';
  /** LST-51: whether the controls of every item stand below its text. */
  private stacked = false;
  /** LST-41: the move that was emitted and is not answered yet. */
  private pending: PendingMove | null = null;
  /** LST-41, LST-52: where keyboard focus stands among the items' controls. */
  private held: HeldFocus | null = null;
  /** The record `keepFocus()` is returning focus to, until it has: a loss of focus meanwhile does not drop it. */
  private returning: HeldFocus | null = null;
  private focusTurn = 0;
  /** LST-43: where each item was drawn (its top, from the list's), and the motions that are running. */
  private places = new Map<TanreiListItem, { top: number; headline: string }>();
  private readonly motions = new Map<TanreiListItem, Animation>();
  /** LST-43: the item the last move was asked for, drawn above the one it passes. */
  private raised: TanreiListItem | null = null;
  private resize?: ResizeObserver;

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown, { capture: true });
    this.addEventListener('click', this.onClick);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('tanrei-list-item-update', this.sync);
  }

  /** The items, in order: the list's `<tanrei-list-item>` children. */
  private get items(): TanreiListItem[] {
    return [...this.children].filter((child): child is TanreiListItem => child instanceof TanreiListItem);
  }

  /** LST-7: a selection the list does not define is drawn as `none`. */
  private get mode(): TanreiListSelection {
    return SELECTIONS.includes(this.selection) ? this.selection : 'none';
  }

  /** LST-36: reorderable while nothing is chosen from it and `reorder` asks for the buttons (`drag` is read as them, until its handle is built). */
  private get reorderable(): boolean {
    return this.mode === 'none' && ((this.reorder as string) === 'buttons' || (this.reorder as string) === 'drag');
  }

  /** LST-42: the one live region, while the list is reorderable. */
  private get announcer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.announcer') ?? null;
  }

  /** LST-26: which values are selected now. */
  private get chosen(): Set<string> {
    const mode = this.mode;
    if (mode === 'single') return new Set(this.value === null || this.value === undefined ? [] : [this.value]);
    if (mode === 'multiple') return new Set(this.values ?? []);
    return new Set();
  }

  /** Tells every item what it is now (LST-12, LST-15, LST-26, LST-36) and reports what a debug build should (LST-23, LST-26, LST-38). */
  private readonly sync = () => {
    // Before its first render the list has not read its own props — which words name the move buttons, whether it is
    // reorderable — and its first render tells the items.
    if (!this.hasUpdated) return;
    const items = this.items;
    const selectable = this.mode !== 'none';
    const reorder = this.reorderable;
    const chosen = this.chosen;
    const isSelected = (item: TanreiListItem) => selectable && chosen.has(item.value);
    // LST-37: a reorderable list is not one tab stop — its items are static, and each button is a stop of its own.
    const focusable = (item: TanreiListItem) => selectable || (!reorder && item.pressable);
    // LST-15: the tab stop is the item focused last, else the first selected option, else the first enabled item (else
    // the first that takes focus, so that a column of disabled items is still reached).
    const candidates = items.filter(focusable);
    const tabStop =
      (this.lastFocused && candidates.includes(this.lastFocused) ? this.lastFocused : null) ??
      candidates.find(isSelected) ??
      candidates.find((item) => !item.disabled) ??
      candidates[0] ??
      null;
    const stacked = reorder && this.stacked;
    items.forEach((item, index) =>
      item.setListContext({ selectable, selected: isSelected(item), tabStop: item === tabStop, position: index + 1, size: items.length, reorder, stacked, moveUp: reorder ? this.upName : '', moveDown: reorder ? this.downName : '' }),
    );

    // LST-38: a word nobody gave, where the part that needs it is drawn — once per word and page.
    if (reorder && items.length && this.isConnected) {
      if (!this.upName) this.words.missing('moveUpLabel', { id: 'LST-38', effect: 'the button that moves an item up is drawn and works, and has no accessible name' });
      if (!this.downName) this.words.missing('moveDownLabel', { id: 'LST-38', effect: 'the button that moves an item down is drawn and works, and has no accessible name' });
      // LST-38: what of a button's sentence is not its place, and a sentence without the item's headline.
      for (const [key, sentence, example] of [['moveUpLabel', this.upName, 'Move {headline} up'], ['moveDownLabel', this.downName, 'Move {headline} down']] as const) {
        if (!sentence) continue;
        const declared = wordPlaces[key] ?? [];
        reportPlaces(this, 'LST-38', key, sentence, declared, 'every button is named with it as it is written');
        if (placeFaults(sentence, declared).absent.length) report(this, 'LST-38', `${key} has no place {headline}, so the buttons of every row have the same name; write it as "${example}"`);
      }
      if (!this.words.get('movedText', this.movedText)) this.words.missing('movedText', { id: 'LST-38', effect: 'nothing is announced after an item was moved' });
    }
    this.settle(items);
    this.scheduleReports();
  };

  private reportFrame = 0;

  /**
   * LST-26: an option without a value, a value two options share, and a selected value that names no option — reported a
   * frame after the list changed, against what it holds then: while the page is still being parsed, or an item is still
   * upgrading, the list is briefly without items or values it is about to have.
   */
  private scheduleReports() {
    if (this.reportFrame || this.mode === 'none') return;
    this.reportFrame = requestAnimationFrame(() => {
      this.reportFrame = 0;
      const items = this.items;
      if (this.mode === 'none' || !this.isConnected) return;
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (!item.value) report(this, 'LST-26', `option ${index + 1} ("${item.headline}") has no value, so it can never be selected`);
        else if (seen.has(item.value)) report(this, 'LST-26', `option ${index + 1} ("${item.headline}") repeats the value "${item.value}"; values must be unique within the list`);
        seen.add(item.value);
      });
      for (const named of this.chosen) if (!items.some((item) => item.value === named)) report(this, 'LST-26', `the selection names "${named}", which no option has as its value`);
    });
  }

  /**
   * @internal LST-39: a move button of `item` was activated. The list emits `move` once, with the index the item has
   * and the one it is to have, and moves nothing: it waits for the product's order (LST-41).
   */
  requestMove(item: TanreiListItem, which: MoveButton) {
    if (!this.reorderable) return;
    const items = this.items;
    const from = items.indexOf(item);
    const to = from + (which === 'up' ? -1 : 1);
    if (from < 0 || to < 0 || to >= items.length) return;
    const button = item.moveButton(which);
    const active = deepActive();
    const focused = !!button && !!active && (active === button || !!button.shadowRoot?.contains(active));
    // LST-43: where every item is drawn now, before the product gives another order.
    this.recordPlaces(items);
    this.raised = item;
    if (this.pending) clearTimeout(this.pending.timer);
    const pending: PendingMove = { item, headline: item.headline, from, to, which, focused, before: items, headlines: items.map((each) => each.headline), timer: 0 };
    this.pending = pending;
    // LST-41: an order the product has not given within the reorder motion's time is a move it refused.
    pending.timer = window.setTimeout(() => {
      if (this.pending === pending) this.pending = null;
    }, this.motion().duration);
    this.dispatchEvent(new CustomEvent<TanreiListMoveDetail>('move', { bubbles: true, detail: { from, to } }));
    // A product that reordered in its handler has answered already.
    this.sync();
  }

  /**
   * LST-41: whether the product has given the order that was asked for — the moved item stands at `to`, as the element
   * it was or as a new one for the same content — and, if so, what follows: the announcement and the focus.
   */
  private settle(items: TanreiListItem[]) {
    const pending = this.pending;
    if (!pending) return;
    if (!this.reorderable) {
      clearTimeout(pending.timer);
      this.pending = null;
      return;
    }
    const at = items[pending.to];
    if (!at) return;
    // A new element for the same content: the moved item's headline, on an element that did not stand there with it.
    const again = at.headline === pending.headline && (at !== pending.before[pending.to] || pending.headlines[pending.to] !== pending.headline);
    if (at !== pending.item && !again) return;
    clearTimeout(pending.timer);
    this.pending = null;
    if (this.raised === pending.item) this.raised = at;
    this.announce(at.headline, pending.to + 1, items.length);
    if (!pending.focused) return;
    // The product may have taken focus for itself in its handler: then it is the product's.
    const active = deepActive();
    if (active && active !== document.body && active !== document.documentElement && !focusWithin(this)) return;
    this.held = { item: at, index: pending.to, place: pending.which };
    this.keepFocus(items, true);
  }

  /** The reorder motion's time (in milliseconds) and curve as the cascade computes them: a duration token is an expression (LST-41, LST-43). */
  private motion(): { duration: number; easing: string } {
    const carrier = this.announcer;
    if (!carrier) return { duration: 0, easing: 'ease' };
    const style = getComputedStyle(carrier);
    const duration = Number.parseFloat(style.transitionDuration) * 1000;
    return { duration: duration > 0 ? duration : 0, easing: style.transitionTimingFunction.split(/,(?![^(]*\))/)[0].trim() || 'ease' };
  }

  /**
   * LST-42: the product's sentence with its places filled, put into the live region in place of what it held. The
   * headline is a run of its own direction, isolated from the sentence (LST-30); the two numbers are written as the
   * list's language writes a whole number. LST-38: without the sentence nothing is announced.
   */
  private announce(headline: string, position: number, count: number) {
    const region = this.announcer;
    if (!region) return;
    const sentence = this.words.get('movedText', this.movedText);
    if (!sentence) {
      region.replaceChildren();
      return;
    }
    const number = new Intl.NumberFormat(ambientLocale(this), { maximumFractionDigits: 0 });
    // (A word with places is read in one place: src/primitives/places.ts.) Another text between braces and a
    // brace that opens or closes nothing stay as they are written, and are reported.
    const { runs } = fillPlaces(sentence, { headline, position: number.format(position), count: number.format(count) });
    reportPlaces(this, 'LST-42', 'movedText', sentence, wordPlaces.movedText ?? [], 'it is announced as it is written');
    region.replaceChildren(
      ...runs.map((run) => {
        if (run.place !== 'headline') return run.text;
        const name = document.createElement('bdi');
        name.textContent = run.text;
        return name;
      }),
    );
  }

  /**
   * LST-41, LST-52: puts keyboard focus back on the control it was on. An element the product moves in the document, or
   * replaces, loses focus without anything having taken it: the same control of the same item gets it back, or — the
   * item gone — the control in the same place of the item that now stands where it stood, else of the one before it.
   * Where that control is absent or disabled, the first control of that item that can take focus; where the list is
   * empty or the item has none, focus is left to the product. `moved`: a move took effect, so focus goes to the moved
   * item wherever the browser left it.
   */
  private keepFocus(items: TanreiListItem[], moved = false) {
    const held = this.held;
    if (!held || !this.reorderable) return;
    if (!moved) {
      // Focus that stands somewhere was not lost: it is the person's, or the product's.
      const active = deepActive();
      if (active && active !== document.body && active !== document.documentElement && active.isConnected) return;
    }
    let item = held.item;
    let index = items.indexOf(item);
    if (index < 0) {
      if (!items.length) {
        this.held = null;
        return;
      }
      index = Math.min(held.index, items.length - 1);
      item = items[index];
    }
    // LST-40: which controls can take focus is read from the item's place, not from a button that is still to be drawn.
    const usable = (place: ControlPlace) => {
      if (place === 'up') return index > 0;
      if (place === 'down') return index < items.length - 1;
      const control = item.trailingControl as (HTMLElement & { disabled?: boolean }) | null;
      return !!control && !isDisabledControl(control);
    };
    const place = [held.place, ...CONTROL_PLACES.filter((each) => each !== held.place)].find(usable);
    if (!place) return;
    const returning = (this.held = { item, index, place });
    this.returning = returning;
    const turn = ++this.focusTurn;
    void (async () => {
      // The item draws its buttons for its new place, and the button enables itself, before it can take focus.
      await item.updateComplete;
      const control = item.control(place) as (HTMLElement & { updateComplete?: Promise<unknown> }) | null;
      await control?.updateComplete;
      if (this.returning === returning) this.returning = null;
      if (turn !== this.focusTurn || !control?.isConnected || this.held?.item !== item) return;
      control.focus();
    })();
  }

  /** An item's top as it is laid out, from the window's: without what a running motion adds to it. */
  private laidOut(item: TanreiListItem): { top: number; offset: number } {
    const top = item.getBoundingClientRect().top;
    if (!this.motions.has(item)) return { top, offset: 0 };
    const transform = getComputedStyle(item).transform;
    const offset = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform).m42 : 0;
    return { top: top - offset, offset };
  }

  /** LST-43: where every item is drawn now. Read when the list's box changes and when a move is asked for, never at rest. */
  private recordPlaces(items = this.items) {
    if (!this.reorderable || !this.isConnected) {
      this.places.clear();
      return;
    }
    const origin = this.getBoundingClientRect().top;
    this.places = new Map(items.map((item) => [item, { top: this.laidOut(item).top - origin, headline: item.headline }]));
  }

  /**
   * LST-43: the order changed — every item whose place changed moves from where it was drawn to its new place, along
   * the list's axis, without fading or scaling, the focus ring with the item that holds it. An element the product
   * gave anew for an item it had is moved as that item; an item that is new or gone appears or leaves at once. Where
   * motion is reduced the new order is drawn at once.
   */
  private async placesChanged() {
    let items = this.items;
    // A new element is measured once it has drawn itself (still before the frame is painted).
    const unfinished = items.filter((item) => !item.hasUpdated);
    if (unfinished.length) {
      await Promise.all(unfinished.map((item) => item.updateComplete));
      items = this.items;
    }
    if (!this.reorderable || !this.isConnected) return;
    const before = this.places;
    const origin = this.getBoundingClientRect().top;
    const gone = [...before].filter(([item]) => !items.includes(item));
    const next = new Map<TanreiListItem, { top: number; headline: string }>();
    const moving: [TanreiListItem, number][] = [];
    for (const item of items) {
      const { top: absolute, offset } = this.laidOut(item);
      const top = absolute - origin;
      next.set(item, { top, headline: item.headline });
      let was = before.get(item)?.top;
      if (was === undefined) {
        // The same content on a new element: the one item that is gone and had this headline.
        const same = gone.filter(([, place]) => place.headline === item.headline);
        if (same.length !== 1) continue;
        was = same[0][1].top;
        if (this.raised === same[0][0]) this.raised = item;
      }
      if (Math.abs(was - top) >= 0.5) moving.push([item, was + offset - top]);
    }
    this.places = next;
    for (const [item, motion] of this.motions) {
      if (items.includes(item)) continue;
      this.motions.delete(item);
      motion.cancel();
    }
    if (!moving.length) return;
    const { duration, easing } = this.motion();
    const still = !duration || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    for (const [item, from] of moving) {
      const running = this.motions.get(item);
      if (running) {
        this.motions.delete(item);
        running.cancel();
      }
      if (still || typeof item.animate !== 'function') continue;
      const lift = item === this.raised ? { zIndex: 1 } : {};
      const frames = [
        { transform: `translateY(${from}px)`, ...lift },
        { transform: 'translateY(0)', ...lift },
      ];
      let motion: Animation;
      try {
        motion = item.animate(frames, { duration, easing });
      } catch {
        motion = item.animate(frames, { duration, easing: 'ease' });
      }
      this.motions.set(item, motion);
      const done = () => {
        if (this.motions.get(item) === motion) this.motions.delete(item);
      };
      motion.finished.then(done, done);
    }
  }

  /**
   * @internal LST-51: an item drew its controls, or they changed size: the list measures once, after all of them — and
   * with every other list that was told in this turn (`measureTogether`).
   */
  itemDrawn() {
    measureTogether(this);
  }

  /** @internal LST-51: whether the controls of any item would leave its text narrower than reorder.text-min-width — a reading of the layout; null where there is nothing to ask. */
  readStacked(): boolean | null {
    return this.isConnected ? this.reorderable && this.items.some((item) => item.squeezed) : null;
  }

  /** @internal LST-51: the controls of every item stand on a line of their own, or beside the text — all rows at once, so that the buttons stand under each other. */
  showStacked(stacked: boolean | null) {
    if (stacked === null || stacked === this.stacked) return;
    this.stacked = stacked;
    this.sync();
  }

  /**
   * LST-51: where the controls of any item would leave its text narrower than reorder.text-min-width, the controls of every item
   * stand on a line of their own.
   */
  private measureStacked() {
    this.showStacked(this.readStacked());
  }

  /** The list's children changed: what each item is, where each is drawn, and where focus stands. */
  private readonly onSlotChange = () => {
    this.sync();
    if (!this.reorderable) return;
    const items = this.items;
    void this.placesChanged();
    this.keepFocus(items);
    this.itemDrawn();
  };

  /** LST-15: arrows, Home, End and typeahead move focus among the items that take it, without wrapping. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const item = itemOf(this, event);
    if (!item || event.composedPath()[0] !== item.focusTarget) return;
    const items = this.items;
    const current = items.indexOf(item);
    const target = this.keys.target(
      event.key,
      current,
      items.map((each) => ({ focusable: this.mode !== 'none' || each.pressable, label: each.headline })),
    );
    if (target === null) return;
    // The key is the list's: it scrolls nothing and does not reach the item (a Space that continues a search is typed).
    event.preventDefault();
    event.stopPropagation();
    if (target !== current) items[target].focus();
  };

  /** @internal LST-41, LST-52: a control of `item` took keyboard focus. */
  controlFocused(item: TanreiListItem, place: ControlPlace) {
    if (this.reorderable) this.held = { item, index: this.items.indexOf(item), place };
  }

  private readonly onFocusIn = (event: FocusEvent) => {
    const item = itemOf(this, event);
    // LST-41, LST-52: which control of which item holds focus in a reorderable list (a move button says so itself).
    if (this.reorderable) {
      const place = item?.placeOf(event) ?? null;
      this.held = item && place ? { item, index: this.items.indexOf(item), place } : null;
      return;
    }
    if (!item || event.composedPath()[0] !== item.focusTarget || item === this.lastFocused) return;
    this.lastFocused = item;
    this.sync();
  };

  /**
   * Focus left a control of a reorderable item. Where it went somewhere — another control, the page — the list holds
   * nothing any more, and its live region is at rest (LST-42). Where the item was taken out of its place by the
   * product, nothing took focus: the record stays, and `keepFocus()` reads it when the children have changed.
   */
  private readonly onFocusOut = (event: FocusEvent) => {
    const held = this.held;
    if (!held) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.contains(next)) return;
    queueMicrotask(() => {
      if (this.held !== held || this.items[held.index] !== held.item || focusWithin(this)) return;
      // Focus is on its way back to this control (`keepFocus()`): the button it stood on was disabled under it at the
      // end of the list, and a Button — one of its form's controls (BTN-29) — loses focus the moment it is disabled in
      // one engine, before the control that takes it has drawn. The record stays until that turn is over.
      if (this.returning === held) return;
      this.held = null;
      this.announcer?.replaceChildren();
    });
  };

  /** LST-13 / LST-14: activating an enabled option changes the selection and emits `change` once. */
  private readonly onClick = (event: MouseEvent) => {
    const mode = this.mode;
    if (mode === 'none') return;
    const item = itemOf(this, event);
    // A disabled option swallows its clicks (LST-2); a click from inside its slots is its own.
    if (!item || item.disabled) return;
    if (mode === 'single') {
      // A single choice is never cleared by its own option.
      if (this.value === item.value) return;
      this.value = item.value;
      this.dispatchEvent(new CustomEvent<TanreiListChangeDetail>('change', { bubbles: true, detail: { value: this.value } }));
    } else {
      const values = this.values ?? [];
      this.values = values.includes(item.value) ? values.filter((each) => each !== item.value) : [...values, item.value];
      this.dispatchEvent(new CustomEvent<TanreiListChangeDetail>('change', { bubbles: true, detail: { values: [...this.values] } }));
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this.reorderable) this.resize?.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = null;
    this.held = null;
    for (const motion of this.motions.values()) motion.cancel();
    this.motions.clear();
    this.places.clear();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // LST-7: a selection the list does not define is drawn as none; a debug build says so.
    if (changed.has('selection') && !SELECTIONS.includes(this.selection)) {
      report(this, 'LST-7', `selection "${this.selection}" is not a value the list defines; it is drawn as "none"`);
    }
    // LST-7: and so is a reorder it does not define.
    if (changed.has('reorder') && !REORDERS.includes(this.reorder)) {
      report(this, 'LST-7', `reorder "${this.reorder}" is not a value the list defines; it is drawn as "none"`);
    }
    // The spec's third value waits for its handle: the two buttons, which are complete by themselves, are drawn (LST-36).
    if (changed.has('reorder') && (this.reorder as string) === 'drag') {
      report(this, 'LST-44', 'reorder "drag" is not built on the web yet: the two move buttons are drawn and no handle, as for "buttons"');
    }
    // LST-38: the names of the move buttons — this list's props, else the product's words, else none.
    this.upName = this.words.get('moveUpLabel', this.moveUpLabel);
    this.downName = this.words.get('moveDownLabel', this.moveDownLabel);
  }

  protected override updated(changed: PropertyValues<this>) {
    const mode = this.mode;
    // LST-12: a list, or a listbox named by label (multi-selectable while selection is multiple). LST-42: a reorderable
    // list is a list inside the host, beside its live region (render()), and the host has no role of its own.
    hostAria(this, {
      role: this.reorderable ? null : mode === 'none' ? 'list' : 'listbox',
      'aria-label': this.reorderable ? null : this.label || null,
      'aria-multiselectable': mode === 'multiple' ? 'true' : null,
    });
    // LST-23: a listbox without a name; a debug build says so.
    if ((changed.has('label') || changed.has('selection')) && mode !== 'none' && !this.label.trim()) {
      report(this, 'LST-23', 'a selectable list has no label, so the listbox has no accessible name; say what the options are');
    }
    // LST-36: an option cannot hold a button, so a selectable list is never reorderable; a debug build says so.
    if ((changed.has('reorder') || changed.has('selection')) && mode !== 'none' && REORDERS.includes(this.reorder) && (this.reorder as string) !== 'none') {
      report(this, 'LST-36', `reorder "${this.reorder}" is ignored while selection is "${mode}": an option cannot hold the buttons that move it`);
    }
    // LST-43, LST-51: the list's own box is watched only while it is reorderable — where its items are drawn, and
    // whether their controls still fit beside their text.
    if (this.reorderable) {
      if (!this.resize && typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(() => {
          this.recordPlaces();
          this.measureStacked();
        });
      }
      this.resize?.observe(this);
    } else {
      this.resize?.disconnect();
      this.places.clear();
      this.held = null;
      this.stacked = false;
    }
    this.sync();
  }

  protected override render() {
    if (!this.reorderable) return html`<slot @slotchange=${this.onSlotChange}></slot>`;
    // LST-42: one live region of the list's own while it is reorderable — a status: polite, announced whole, empty at
    // rest, drawn nowhere. A list's children are list items and nothing else, so the list role is then carried by a box
    // of the shadow root around the items, and the region stands beside it. The region also carries the reorder
    // motion's time and curve for the script to read (a duration token is an expression).
    return html`<div class="items" role="list" aria-label=${this.label || nothing}><slot @slotchange=${this.onSlotChange}></slot></div
      ><span class="quiet"><span class="announcer" role="status" aria-live="polite"></span></span>`;
  }
}

/**
 * LST-51: the lists that measure in this turn, read together and then written. A list measured in a microtask of its
 * own, between the renders of the other lists' items, would have the page styled and laid out for itself. One
 * microtask reads them all — one layout — and only then does any of them change how its rows stand.
 */
const toMeasure = new Set<TanreiList>();
function measureTogether(list: TanreiList) {
  if (!toMeasure.size) {
    queueMicrotask(() => {
      const lists = [...toMeasure];
      toMeasure.clear();
      const stacked = lists.map((each) => each.readStacked());
      lists.forEach((each, n) => each.showStacked(stacked[n]));
    });
  }
  toMeasure.add(list);
}

if (!customElements.get('tanrei-list-item')) customElements.define('tanrei-list-item', TanreiListItem);
if (!customElements.get('tanrei-list')) customElements.define('tanrei-list', TanreiList);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-list': TanreiList;
    'tanrei-list-item': TanreiListItem;
  }
  interface HTMLElementEventMap {
    'tanrei-list-item-update': Event;
  }

}
