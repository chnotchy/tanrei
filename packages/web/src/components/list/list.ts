import { LitElement, type PropertyDeclarations, type PropertyValues, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { html, literal } from 'lit/static-html.js';
import { wordPlaces } from '../../generated/words.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  CoalescedSync,
  GlyphDrawnController,
  GlyphMirrorController,
  LINK_MARK,
  LONG_PRESS,
  LinkController,
  PressController,
  RovingKeys,
  TOUCH_SLOP as SLOP,
  type TanreiLinkTarget,
  WordsController,
  countWork,
  deepActive,
  fillPlaces,
  focusWithin,
  hostAria,
  linkAttributes,
  linkForm,
  notifyItemUpdate,
  parseValues,
  placeFaults,
  pressTakenWithin,
  report,
  reportPlaces,
  slottedInteractive,
  syncFocusStyle,
} from '../../primitives/index.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import '../button/button.js';
import type { TanreiButton } from '../button/button.js';
import '../menu/menu.js';
import { itemStyles, listStyles } from './list.styles.js';

/** LST-21: the glyph of the icon set a selected option draws — the spec's name, not a value. */
const CHECK_GLYPH = 'check';
/** LST-32: the glyph of the handle. */
const HANDLE_GLYPH = 'drag_indicator';

/** The direction the items follow one another (LST-1). A closed set. */
export type TanreiListOrientation = 'vertical' | 'horizontal';
const ORIENTATIONS: readonly TanreiListOrientation[] = ['vertical', 'horizontal'];

/** The space between two neighbouring items (LST-1): none, or `comp.list.gap.{small,medium,large}`. A closed set. */
export type TanreiListGap = 'none' | 'small' | 'medium' | 'large';
const GAPS: readonly TanreiListGap[] = ['none', 'small', 'medium', 'large'];

/** Whether people choose items: `none` shows or opens things; `single` and `multiple` make the list a listbox. A closed set. */
export type TanreiListSelection = 'none' | 'single' | 'multiple';
const SELECTIONS: readonly TanreiListSelection[] = ['none', 'single', 'multiple'];

/** What `move` carries: the index the item had when the move began and the index it is to have, both from 0. */
export interface TanreiListMoveDetail {
  from: number;
  to: number;
}

/** What `change` carries: the list's `value` after the change (single), or its `values` (multiple). */
export type TanreiListChangeDetail = { value: string | null } | { values: string[] };

/** LST-33: the four moves of the move menu, in their order. */
type Move = 'start' | 'before' | 'after' | 'end';
const MOVES: readonly Move[] = ['start', 'before', 'after', 'end'];
/** LST-33: the glyph of each move, in a column and in a line (the icon set mirrors the second set in right-to-left). */
const MOVE_GLYPHS: Record<TanreiListOrientation, Record<Move, string>> = {
  vertical: { start: 'vertical_align_top', before: 'arrow_upward', after: 'arrow_downward', end: 'vertical_align_bottom' },
  horizontal: { start: 'first_page', before: 'arrow_back', after: 'arrow_forward', end: 'last_page' },
};
/** LST-47: the word key of each move. */
const MOVE_WORDS = { start: 'moveToStartLabel', before: 'moveBeforeLabel', after: 'moveAfterLabel', end: 'moveToEndLabel' } as const;

/** An item is static, one action (interactive), a link (LST-26), or an option of a selectable list (LST-18). */
type ItemMode = 'static' | 'interactive' | 'link' | 'option';

/** What the list tells each of its items. */
interface ItemContext {
  selectable: boolean;
  selected: boolean;
  tabStop: boolean;
  position: number;
  size: number;
  /** LST-31: the list is reorderable, so the item is static and draws a handle. */
  reorder: boolean;
  orientation: TanreiListOrientation;
  /** LST-3: where the item draws the divider between it and the item before it; none for the first. */
  divider: 'none' | 'block' | 'inline';
  /** LST-32, LST-33, LST-47: the handle's name and description and the four move words; empty where nobody gave them. */
  handleLabel: string;
  handleHint: string;
  moves: Record<Move, string>;
}

const NO_MOVES: Record<Move, string> = { start: '', before: '', after: '', end: '' };

/** LST-48: what an item tells an element of its content that fits itself to the item (a List row). */
export interface TanreiListItemFrame {
  /** The item is an action, a link or an option: it pads its content and carries its states (LST-8). */
  boxed: boolean;
  /** The item draws the handle of a reorderable list before its content, the item's gap away (LST-32). */
  handled: boolean;
  /** The item is a selected option: its content takes the selected content color (LST-8). */
  selected: boolean;
  /** The item is a disabled action, link or option (LST-15). */
  disabled: boolean;
}

/**
 * LST-48, LST-49: an element that fits itself to the item it is the direct child of — a `<tanrei-list-row>`. The item
 * sets `listItemFrame` (null once the element is no longer its child), and reads the item's name and description from it.
 * The element fires `tanrei-list-item-content` (bubbling) when it is first defined and whenever its name or description
 * changes, so that the item tells it the frame and the list hears the new name.
 */
export interface TanreiListItemContent extends HTMLElement {
  listItemFrame: TanreiListItemFrame | null;
  readonly listItemName: string;
  readonly listItemDescription: string;
}

/** Whether a child of an item fits itself to the item (LST-48). */
const fitsItem = (element: Element): element is TanreiListItemContent => 'listItemFrame' in element && 'listItemName' in element;

/** The item of `list` an event came from: the first list item on its composed path whose list is `list`. */
function itemOf(list: Element, event: Event): TanreiListItem | null {
  for (const node of event.composedPath()) {
    if (node === list) return null;
    if (node instanceof TanreiListItem && node.parentElement === list) return node;
  }
  return null;
}

/** Text with its runs of white space made one space, trimmed: what a person hears of it. */
const spoken = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** Whether motion is reduced for this person. */
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One item of a list — the spec's item kind `list-item`: a box around your own content (its children). Placed as a
 * child of `<tanrei-list>`, which decides whether it is an option; otherwise it is static, one action with
 * `interactive`, or a link with `href`.
 *
 * Contract: specs/list.spec.json. A static item draws nothing and adds no space: its content is the item (LST-7). An
 * interactive item, a link item or an option pads its content, carries hover, focus and press, the fill of a selected
 * option, and hands its content a color and a text style (LST-8) — every value a `--tanrei-comp-list-*` token, one set
 * per condition (unselected, selected) and state.
 *
 * Semantics: the host is a `listitem` — or, in a selectable list, an `option` with its selected state, which takes focus
 * itself. An interactive item draws one element with the button role inside its list item; a link item an `<a href>`.
 * Each is named by `label`, else by the text of its content, which is then presentational (LST-19). The list sets each
 * item's position and the list's size (`aria-posinset`, `aria-setsize`) and which one is the tab stop.
 *
 * In a reorderable list the item draws a handle before its content (LST-32): an icon-only `tanrei-button` that opens a
 * menu of moves and, with Space, lifts the item for the keyboard. The whole item can be dragged.
 *
 * @tag tanrei-list-item
 * @slot - The item's content: your own — text, an image, a card, a file item. An interactive item, a link item or an option must hold no interactive element (reported in debug builds); a static item may hold your controls, which keep their own semantics and focus.
 * @csspart container - The item's box: its color, corners, every state, the ripple and the focus ring; an interactive item's button, a link item's anchor.
 * @csspart content - The box around the slot.
 * @csspart handle - The handle of an item of a reorderable list, a `<tanrei-button>`.
 * @csspart mark - The check at the end of an option: the icon set's `check` glyph in a box reserved in every option.
 * @csspart new-context - The glyph `open_in_new` at the end of a link item that opens a new context.
 * @csspart divider - The hairline between the item and the one before it, while the list has dividers.
 * @fires click - An interactive item or a link item was activated by pointer, touch, keyboard or assistive technology. A link item fires it before the browser follows the address; `preventDefault()` cancels the navigation.
 */
export class TanreiListItem extends LitElement {
  static override styles = [itemStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    interactive: { type: Boolean, reflect: true },
    value: { type: String },
    disabled: { type: Boolean, reflect: true },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
    context: { state: true },
    menuOpen: { state: true },
  };

  /** The item's name: an interactive item, a link item or an option is named by it in place of its content's text, and the list calls every item by it in a handle's name and in what it announces. Empty: the text of the content. */
  label = '';

  /** Makes the item one pressable action that emits `click`. Ignored in a selectable or a reorderable list. */
  interactive = false;

  /** Identifies the option: the list's `value` or `values` select it, and `change` carries it. Unique within the list. */
  value = '';

  /** Prevents activation; the arrow keys still reach it. Ignored for a static item. */
  disabled = false;

  /**
   * The destination: a URL, a path or a fragment. Not empty, the item is a link item (LST-26) whether `interactive` is
   * set or not: one link inside its list item, in the list's arrow-key order, followed by Enter and not by Space.
   * Ignored in a selectable or a reorderable list; white space is no destination, and a `javascript:` address or one
   * that cannot be read is refused and reported in debug builds (LST-30).
   */
  href = '';

  /**
   * Where the destination opens: `same` (here) or `new` (a new tab or window, with `noopener`), which the item marks
   * with the glyph `open_in_new` at its end and says through `targetLabel` (LST-28). HTML's `_self` and `_blank` are read
   * as those two; anything else is `same` and reported. Ignored without `href`.
   */
  target: TanreiLinkTarget = 'same';

  /** What assistive technology reads as the link's description while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: forwarded to the anchor's `rel`; `target="new"` adds `noopener` to it. Ignored without `href`. */
  rel: string | null = null;

  /** Web only: forwarded to the anchor's `download` (the file name; empty for the address's own). Ignored without `href`. */
  download: string | null = null;

  /** What the list says about this item. */
  private context: ItemContext = { selectable: false, selected: false, tabStop: false, position: 0, size: 0, reorder: false, orientation: 'vertical', divider: 'none', handleLabel: '', handleHint: '', moves: NO_MOVES };

  /** LST-33: whether the move menu is open, and whether it has been drawn yet (it is drawn the first time it opens). */
  private menuOpen = false;
  private menuDrawn = false;

  /** LST-26 … LST-30: the link the item is while it has a destination and is neither an option nor in a reorderable list (src/primitives/link.ts). */
  private readonly link = new LinkController(this, {
    ids: { refused: 'LST-30', newContext: 'LST-28' },
    disabled: () => this.disabled,
    holds: () => (this.context.selectable ? 'an option of a selectable list' : this.context.reorder ? 'an item of a reorderable list' : null),
  });

  /** LST-12 / LST-13: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). LST-27: a link item is pressed by Enter alone. */
  private readonly press = new PressController(this, {
    container: () => this.row,
    holdCarrier: () => this.renderRoot.querySelector('.hold'),
    disabled: () => !this.active,
    keys: () => this.link.pressKeys,
  });

  /** LST-22: the check is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.mark, .new-context, .handle-glyph'));
  /** LST-28: the mark of a new context is mirrored in right-to-left, as the icon set marks its name. */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.new-context' });

  /** Space activates on key-up, as a native button does, and only when the key went down on the item. */
  private spaceDown = false;

  constructor() {
    super();
    // LST-15: a disabled action or option swallows every click that reaches it, from its content or dispatched on it.
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
    this.addEventListener('tanrei-list-item-content', this.onContentFits);
  }

  /** @internal The list's side: whether the item is an option, selected, the tab stop, and where it stands. */
  setListContext(context: ItemContext) {
    const now = this.context;
    const same = (Object.keys(context) as (keyof ItemContext)[]).every((key) =>
      key === 'moves' ? MOVES.every((move) => context.moves[move] === now.moves[move]) : context[key] === now[key],
    );
    if (same) return;
    if (!context.reorder) this.menuOpen = false;
    this.context = context;
  }

  /** @internal The item's name: its label, else the headline of a List row that is its child (LST-49), else the text of its content (LST-19). */
  get name(): string {
    return spoken(this.label) || this.contentName || spoken(this.textContent);
  }

  /** LST-48: the children that fit themselves to the item (List rows). */
  private get fitted(): TanreiListItemContent[] {
    return [...this.children].filter(fitsItem);
  }

  /** LST-49: the name the item's List rows give it: their headlines. */
  private get contentName(): string {
    return spoken(
      this.fitted
        .map((child) => child.listItemName)
        .filter(Boolean)
        .join(' '),
    );
  }

  /** LST-49: the description the item's List rows give it: their other texts. */
  private get contentDescription(): string {
    return spoken(
      this.fitted
        .map((child) => child.listItemDescription)
        .filter(Boolean)
        .join(' '),
    );
  }

  /** The frames told last, by child, so that a child is told only a change (LST-48). */
  private told = new WeakMap<Element, string>();
  /** The children told a frame, so that one that left the item is told it stands alone. */
  private framed = new Set<TanreiListItemContent>();

  /** LST-48: tells each child that fits itself to the item what the item is, and a child that left that it stands alone. */
  private tellContent() {
    const mode = this.mode;
    const frame: TanreiListItemFrame = { boxed: mode !== 'static', handled: this.context.reorder, selected: this.selected, disabled: mode !== 'static' && this.disabled };
    const key = JSON.stringify(frame);
    const now = new Set(this.fitted);
    for (const child of this.framed) {
      if (now.has(child) || child.parentElement === this) continue;
      if (child.listItemFrame) child.listItemFrame = null;
      this.told.delete(child);
    }
    for (const child of now) {
      if (this.told.get(child) === key) continue;
      this.told.set(child, key);
      child.listItemFrame = frame;
    }
    this.framed = now;
  }

  /** LST-48, LST-49: a List row in the content was defined, or its texts changed: it is told the frame, and the list hears the new name. */
  private readonly onContentFits = (event: Event) => {
    const child = event.target as Element;
    if (child.parentElement !== this) return;
    event.stopPropagation();
    this.told.delete(child);
    this.tellContent();
    this.requestUpdate();
    if (this.hasUpdated) notifyItemUpdate(this, 'tanrei-list-item-update');
  };

  /** @internal Whether the item takes focus in its list: an action or an option — a disabled one too (LST-15). */
  get takesFocus(): boolean {
    return this.mode !== 'static';
  }

  /** @internal Whether the item is a selected option. */
  get selected(): boolean {
    return this.context.selectable && this.context.selected;
  }

  /** @internal Whether the item is one pressable thing outside a selectable list — an action or a link (LST-26) — and so takes its place in the list's arrow-key order (LST-17). */
  get pressable(): boolean {
    return this.interactive || linkForm(this, this.disabled) !== null;
  }

  /** @internal LST-32: the handle, while the list is reorderable. */
  get handle(): TanreiButton | null {
    return this.renderRoot?.querySelector<TanreiButton>('.handle') ?? null;
  }

  /** @internal Whether an event came from the handle (or from inside it). */
  fromHandle(event: Event): boolean {
    const handle = this.handle;
    return !!handle && event.composedPath().includes(handle);
  }

  /** @internal Whether keyboard focus is on the handle, or in the move menu. */
  get handleFocused(): boolean {
    const active = deepActive();
    const handle = this.handle;
    if (!active || !handle) return false;
    return active === handle || !!handle.shadowRoot?.contains(active) || !!this.renderRoot?.contains(active);
  }

  /** @internal Puts focus on the handle, once it is drawn and enabled. */
  async focusHandle() {
    await this.updateComplete;
    const handle = this.handle;
    await handle?.updateComplete;
    handle?.focus();
  }

  /** @internal LST-33: opens the move menu. */
  openMenu() {
    if (!this.context.reorder || this.context.size < 2) return;
    this.menuDrawn = true;
    this.menuOpen = true;
  }

  /** @internal The element that takes focus: an interactive item's box, a link item's anchor, an option's host. */
  get focusTarget(): HTMLElement | null {
    const mode = this.mode;
    return mode === 'interactive' || mode === 'link' ? this.row : mode === 'option' ? this : null;
  }

  /** LST-18, LST-26: an option in a selectable list, else static in a reorderable list (LST-31), else a link while it has a destination, else an action while `interactive`, else static. */
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

  /** `element.focus()` focuses an action's box, or an option; a static item focuses its handle where it has one. */
  override focus(options?: FocusOptions) {
    const target = this.focusTarget;
    if (target === this) super.focus(options);
    else if (target) target.focus(options);
    else this.handle?.focus(options);
  }

  /** `element.click()` activates an action or an option as a person would, and follows a link item; a static or disabled item does nothing (LST-7, LST-15). */
  override click() {
    if (!this.active) return;
    if (this.mode === 'option') super.click();
    else this.row?.click();
  }

  /** LST-23 / LST-24: an action's click comes from its box; an option's from its host, which the list answers. */
  private activate() {
    if (this.mode === 'interactive') this.row?.click();
    else if (this.mode === 'option') super.click();
  }

  /** LST-23: Enter activates on key-down and Space on key-up, as a native button does. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    const mode = this.mode;
    if (mode === 'static' || event.composedPath()[0] !== this.focusTarget) return;
    // LST-27: a link item's keys are the anchor's own — Enter fires its click and follows it, Space scrolls the page.
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

  /** LST-15: a press on a disabled item does not focus it (as on a native disabled control); the arrow keys still reach it. */
  private onMouseDown(event: MouseEvent) {
    if (this.mode !== 'static' && this.disabled) event.preventDefault();
  }

  /** LST-14: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (event.composedPath()[0] === this.focusTarget) syncFocusStyle(this, this.focusTarget);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    if (event.composedPath()[0] !== this.focusTarget) return;
    this.spaceDown = false;
    this.press.onBlur();
  };

  /** LST-20: an action's, a link's or an option's content holds nothing interactive; a debug build names what it found, on every change of it. */
  private async inspectContent() {
    if (this.mode === 'static') return;
    const found = await slottedInteractive(this.renderRoot.querySelector('.content slot'));
    if (found) {
      report(this, 'LST-20', `${this.mode === 'option' ? 'an option' : this.mode === 'link' ? 'a link item' : 'an interactive item'} holds an interactive element (<${found.localName}>) in its content, which assistive technology cannot reach and whose press would also activate the item; make the item static and let that element be its control`);
    }
  }

  /** The content changed: what it holds is inspected, the list hears that the item's name may have changed. */
  private onContentChange() {
    this.tellContent();
    this.requestUpdate();
    void this.inspectContent();
    this.reportName();
    if (this.hasUpdated) notifyItemUpdate(this, 'tanrei-list-item-update');
  }

  /** LST-19: an item that must be named and is not. */
  private reportName() {
    if ((this.mode !== 'static' || this.context.reorder) && !this.name) {
      report(this, 'LST-19', 'the item has no name — an empty label and no text in its content — so assistive technology cannot tell it apart; give it a label');
    }
  }

  /** LST-32: the handle's native button says that it opens a menu, and whether it is open. */
  private async markHandle() {
    const handle = this.handle;
    await handle?.updateComplete;
    const button = handle?.shadowRoot?.querySelector('button');
    if (!button) return;
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', String(this.menuOpen && this.context.size > 1));
  }

  /** LST-33: the handle was pressed — by pointer, touch, Enter or assistive technology, as a Button is. */
  private onHandleClick(event: Event) {
    const list = this.parentElement;
    // A press that carried the item is no press of the handle.
    if (list instanceof TanreiList && list.swallowsHandleClick()) {
      event.stopPropagation();
      return;
    }
    if (this.menuOpen) this.menuOpen = false;
    else this.openMenu();
  }

  /** LST-33: the menu asks to be closed — Escape, a press outside, Tab, focus leaving, an item chosen. */
  private onMenuClose() {
    this.menuOpen = false;
  }

  /** LST-33: a move was chosen. */
  private onMoveChosen(move: Move) {
    this.menuOpen = false;
    const list = this.parentElement;
    if (list instanceof TanreiList) list.requestMenuMove(this, move);
  }

  /** LST-48: a List row in the content is told what the item is before the item is drawn as that. */
  protected override willUpdate() {
    this.tellContent();
  }

  protected override updated(changed: PropertyValues<this>) {
    const { position, size, tabStop } = this.context;
    const mode = this.mode;
    const option = mode === 'option';
    // LST-49: an option without a label is named by its List row's headline and described by the row's other texts.
    const ownName = spoken(this.label) || this.contentName;
    const ownDescription = this.contentDescription;
    // LST-18, LST-19: a list item — or an option with its selected state, named by its label (else by its content) —
    // with its position and the list's size.
    hostAria(this, {
      role: option ? 'option' : 'listitem',
      'aria-selected': option ? String(this.selected) : null,
      'aria-disabled': option && this.disabled ? 'true' : null,
      'aria-label': option && ownName ? ownName : null,
      'aria-description': option && ownDescription ? ownDescription : null,
      'aria-posinset': position ? String(position) : null,
      'aria-setsize': size ? String(size) : null,
      // LST-17: an option takes focus itself; only the list's tab stop is in the tab order.
      tabindex: option ? (tabStop ? '0' : '-1') : null,
    });
    const contextChanged = (changed as Map<PropertyKey, unknown>).has('context');
    // LST-32: the handle is a button that opens a menu, with its expanded state — said before the menu is first drawn
    // (the menu says it of its anchor itself once it is).
    if (this.context.reorder) void this.markHandle();
    if (changed.has('interactive') || changed.has('href') || contextChanged) void this.inspectContent();
    if (changed.has('label') || changed.has('interactive') || changed.has('href') || contextChanged) this.reportName();
    if (changed.has('disabled') && this.disabled) this.spaceDown = false;
    // LST-31: a reorderable list's item that asks to be a button or a link is drawn static; a debug build says so.
    if (this.context.reorder && (this.interactive || this.href.trim())) {
      report(this, 'LST-31', `an item of a reorderable list is static: its ${this.interactive ? 'interactive' : 'href'} is ignored, because an item that is itself one ${this.interactive ? 'button' : 'link'} is taken by a press that a drag would take`);
    }
    // The list re-reads its items when one of the props it depends on changes; an internal event, kept out of the item's public API.
    if (['label', 'value', 'disabled', 'interactive', 'href'].some((key) => changed.has(key as keyof TanreiListItem)) && this.hasUpdated) {
      notifyItemUpdate(this, 'tanrei-list-item-update');
    }
  }

  protected override render() {
    const mode = this.mode;
    const interactive = mode === 'interactive';
    // LST-26: a link item's box is an anchor in place of the element with the button role — the same classes, part and
    // listeners, in the list's roving tab stop — whose address and disabled form are the link primitive's (LST-29).
    const link = this.link.form;
    const tag = link ? literal`a` : literal`div`;
    const action = interactive || !!link;
    const { reorder, size, orientation, divider } = this.context;
    // LST-49: named by the label, else by its List row's headline; described by the row's other texts, then by the
    // words of a link that opens a new context (LST-28).
    const name = spoken(this.label) || this.contentName;
    const description = [this.contentDescription, link ? this.link.describe() : ''].filter(Boolean).join(' ') || null;
    const lone = size < 2;
    // LST-32: the handle's name, its place {label} filled with the item's name.
    const handleName = this.context.handleLabel
      ? fillPlaces(this.context.handleLabel, { label: this.name })
          .runs.map((run) => run.text)
          .join('')
      : '';
    const index = this.context.position - 1;
    // LST-33: the moves that would leave the item where it is are disabled.
    const useless: Record<Move, boolean> = { start: index <= 0, before: index <= 0, after: index >= size - 1, end: index >= size - 1 };
    return html`
      <${tag}
        part="container"
        class=${classMap({ row: true, p: mode !== 'static', d: mode !== 'static' && this.disabled, selected: this.selected, reorder })}
        data-tanrei-shape
        role=${interactive ? 'button' : nothing}
        ${linkAttributes(link)}
        tabindex=${action ? (this.context.tabStop ? '0' : '-1') : nothing}
        aria-label=${action && name ? name : nothing}
        aria-description=${description || nothing}
        aria-disabled=${interactive && this.disabled ? 'true' : nothing}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
        @mousedown=${this.onMouseDown}
      >
        ${reorder
          ? html`<tanrei-button
              id="handle"
              part="handle"
              class="handle"
              variant="text"
              size="small"
              label=${handleName}
              .forwardedDescription=${this.context.handleHint || null}
              ?disabled=${lone}
              focusable-when-disabled
              @click=${this.onHandleClick}
              ><span slot="icon" class="handle-glyph" data-mirror="never"><span class="ink">${HANDLE_GLYPH}</span></span></tanrei-button
            >`
          : nothing}
        <span part="content" class="content"><slot @slotchange=${this.onContentChange}></slot></span>
        <span class="hold" aria-hidden="true"></span>
        ${link?.opensNew ? html`<span part="new-context" class="new-context" aria-hidden="true"><span class="ink">${LINK_MARK}</span></span>` : nothing}
        ${this.context.selectable ? html`<span part="mark" class="mark" aria-hidden="true"><span class="ink">${CHECK_GLYPH}</span></span>` : nothing}
      </${tag}>
      ${reorder && this.menuDrawn
        ? html`<tanrei-menu anchor="handle" placement="bottom-start" .open=${this.menuOpen && !lone} @close=${this.onMenuClose}>
            ${MOVES.map(
              (move) =>
                html`<tanrei-menu-item
                  label=${this.context.moves[move]}
                  leading-icon=${MOVE_GLYPHS[orientation][move]}
                  ?disabled=${useless[move]}
                  data-move=${move}
                  @click=${() => this.onMoveChosen(move)}
                ></tanrei-menu-item>`,
            )}
          </tanrei-menu>`
        : nothing}
      ${divider !== 'none' ? html`<span part="divider" class="divider ${divider}" aria-hidden="true"></span>` : nothing}
    `;
  }
}

/** LST-43: a move the list emitted and the product has not answered yet. */
interface PendingMove {
  item: TanreiListItem;
  name: string;
  from: number;
  to: number;
  /** Whether keyboard focus was on the item's handle, or in its menu, when the move was asked for. */
  focused: boolean;
  /** The items and their names when the move was asked for: what tells a new element for the same content from one that never moved. */
  before: TanreiListItem[];
  names: string[];
  timer: number;
}

/** A box, from the list's own top-left corner. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** LST-34 … LST-40: an item being carried — by a pointer or by the keyboard. */
interface Carry {
  item: TanreiListItem;
  by: 'pointer' | 'keyboard';
  from: number;
  /** The place it would land in now. */
  target: number;
  /** The items, and each one's box, as they were laid out when it was lifted. */
  items: TanreiListItem[];
  slots: Box[];
  /** The list's origin and the pointer when it was lifted (pointer only). */
  origin: { x: number; y: number };
  pointer: { x: number; y: number };
  last: { x: number; y: number };
  pointerId: number;
  /** The space between two items along the list, read when it was lifted. */
  gap: number;
}

/** A press on an item that may become a drag (LST-36). */
interface Press {
  item: TanreiListItem;
  pointerId: number;
  type: string;
  onHandle: boolean;
  x: number;
  y: number;
  timer: number;
}

/**
 * Holds a set of your own items in one column, one line, or lines that wrap into a grid; people read them, open them
 * one by one, choose from them, or drag them into another order.
 *
 * Contract: specs/list.spec.json. The list draws nothing and adds no space around its `<tanrei-list-item>` children
 * (LST-1): `orientation` lays them out as a column or a line, `wrap` lets them run onto further lines (a grid, LST-2),
 * `gap` sets the space between them and `dividers` a hairline between them (LST-3). It carries the semantics — a
 * `list`, or a `listbox` named by `label` while `selection` is `single` or `multiple` — and moves keyboard focus among
 * the items that are actions, links or options: one tab stop (a roving tabindex), the arrow keys of the arrangement
 * without wrapping, Home, End and typeahead (LST-17). Moving focus never changes the selection; Space or Enter chooses.
 *
 * The selection is the list's: `value` names the selected option of a single-select list, `values` those of a
 * multiple-select list, each by the options' `value`. The list sets them before firing `change`, as a native control
 * does; set them yourself to select from script (a new array for `values`).
 *
 * With `reorderable` (and `selection` none) people can put the items in another order (LST-31): every item is static
 * and draws a handle. The whole item can be dragged — a mouse after a few pixels of movement, a touch or a pen after a
 * long press or at once from the handle — while the other items slide aside; the handle opens a menu of four moves
 * (start, before, after, end), and with the keyboard Space on the handle lifts the item, the arrow keys carry it, Space
 * or Enter drop it and Escape puts it back, each step announced. Every way fires `move` with `from` and `to` and changes
 * nothing: the order is your data. Reorder your items in answer (move the elements, or let your framework render the new
 * order) and the list draws them changing place, keeps focus on the moved item's handle and says `moved-text` through
 * its one polite live region. A move you have not made within `--tanrei-comp-list-motion-reorder-duration` is taken as
 * refused. The words are yours (attributes, or once with `setWords()`).
 *
 * @tag tanrei-list
 * @slot - The items: `<tanrei-list-item>` children.
 * @csspart items - The box that lays the items out.
 * @fires {CustomEvent<TanreiListChangeDetail>} change - The user changed the selection: `detail.value` (single) or `detail.values` (multiple) after the change, which the list already holds.
 * @fires {CustomEvent<TanreiListMoveDetail>} move - The user asked for an item to stand in another place — by the move menu, the keyboard or a drag: `detail.from` is the item's index and `detail.to` the index it is to have, both from 0. Fired once per move; it bubbles and cannot be cancelled. The list has moved nothing: reorder your items.
 */
export class TanreiList extends LitElement {
  private readonly availability = new AvailabilityController(this, 'list');
  static override styles = [listStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    orientation: { type: String, reflect: true },
    wrap: { type: Boolean, reflect: true },
    gap: { type: String, reflect: true },
    dividers: { type: Boolean, reflect: true },
    selection: { type: String, reflect: true },
    label: { type: String },
    value: { type: String },
    values: { attribute: 'values', converter: { fromAttribute: parseValues } },
    reorderable: { type: Boolean, reflect: true },
    dragHandleLabel: { type: String, attribute: 'drag-handle-label' },
    dragHandleHint: { type: String, attribute: 'drag-handle-hint' },
    moveToStartLabel: { type: String, attribute: 'move-to-start-label' },
    moveBeforeLabel: { type: String, attribute: 'move-before-label' },
    moveAfterLabel: { type: String, attribute: 'move-after-label' },
    moveToEndLabel: { type: String, attribute: 'move-to-end-label' },
    liftedText: { type: String, attribute: 'lifted-text' },
    movedText: { type: String, attribute: 'moved-text' },
    cancelledText: { type: String, attribute: 'cancelled-text' },
  };

  /** The direction the items follow one another: `vertical`, a column from the top; `horizontal`, a line from the start edge. */
  orientation: TanreiListOrientation = 'vertical';

  /** Lets the items run onto a further line where the list ends, so that they form a grid (LST-2). A vertical list wraps where the height you give it ends. */
  wrap = false;

  /** The space between two neighbouring items, and between two lines: `none` (touching), `small`, `medium` or `large`. */
  gap: TanreiListGap = 'none';

  /** Draws a hairline between every two neighbouring items. Read only while `wrap` is false (LST-3). */
  dividers = false;

  /** Whether people choose items: `none` shows or opens things; `single` chooses one; `multiple` any number. */
  selection: TanreiListSelection = 'none';

  /** The accessible name of the list: what the items are. Required while `selection` is `single` or `multiple`, and while the list is reorderable. */
  label = '';

  /** The value of the selected option while `selection` is `single`; `null` selects none. */
  value: string | null = null;

  /** The values of the selected options while `selection` is `multiple`. Assign a new array to change it. */
  values: string[] = [];

  /**
   * Lets people put the items in another order: a handle in every item, the whole item draggable, a menu of moves from
   * the handle, and the keyboard from the handle. The list fires `move` and never changes the order itself. Read only
   * while `selection` is `none`; every item of a reorderable list is static (LST-31).
   */
  reorderable = false;

  /** The accessible name of every handle: your sentence with the place `{label}`, which the list fills with the item's name ("Reorder {label}"). Empty reads the product's words. */
  dragHandleLabel = '';

  /** The description of every handle: how to move an item with the keyboard, in your words. Empty reads the product's words; with neither, none. */
  dragHandleHint = '';

  /** The move menu's item that moves the item to the first place ("Move to top"). Empty reads the product's words. */
  moveToStartLabel = '';

  /** The move menu's item that moves the item one place toward the start ("Move up", in a line "Move left"). Empty reads the product's words. */
  moveBeforeLabel = '';

  /** The move menu's item that moves the item one place toward the end ("Move down", "Move right"). Empty reads the product's words. */
  moveAfterLabel = '';

  /** The move menu's item that moves the item to the last place ("Move to bottom"). Empty reads the product's words. */
  moveToEndLabel = '';

  /** Said when the keyboard lifts an item: your sentence with `{label}`, `{position}` (from 1) and `{count}` ("{label} lifted: {position} of {count}"). */
  liftedText = '';

  /** Said when a lifted item reaches another place, and once a move has taken effect: `{label}`, `{position}`, `{count}` ("{label}: {position} of {count}"). */
  movedText = '';

  /** Said when a move with the keyboard is cancelled: `{label}`, `{position}`, `{count}` ("{label} returned to {position} of {count}"). */
  cancelledText = '';

  /** LST-17: the item that had focus last, which stays the tab stop. */
  private lastFocused: TanreiListItem | null = null;
  private readonly keys = new RovingKeys({ wrap: false });
  /** LST-47: the words are the product's — this list's props, else the product's words, else nothing. */
  private readonly words = new WordsController(this);
  private handleName = '';
  private handleHintText = '';
  private moveNames: Record<Move, string> = NO_MOVES;

  /** LST-43: the move that was emitted and is not answered yet. */
  private pending: PendingMove | null = null;
  /** LST-36: a press that may become a drag. */
  private press: Press | null = null;
  /** LST-34 … LST-40: the item being carried. */
  private carry: Carry | null = null;
  /** LST-39: the items are drawn as they were dropped until the product's order arrives or the wait ends. */
  private holding = false;
  /** A drag just ended: the click it would make on the handle is no press of the handle. */
  private swallowUntil = 0;
  /** LST-46: the handle that holds keyboard focus, and where its item stood. */
  private heldFocus: { item: TanreiListItem; index: number } | null = null;
  /** LST-41: where each item is laid out (its box from the list's corner), and the motions that are running. */
  private places = new Map<TanreiListItem, Box & { name: string }>();
  private readonly motions = new Map<TanreiListItem, Animation>();
  private resize?: ResizeObserver;
  private scrollFrame = 0;
  /**
   * The re-read of the items (`sync()`), once per turn however many items said they changed in it: a list of N items
   * built, or N names changed at once, re-reads its N items once — not once per item, which made the build O(N²).
   */
  private readonly syncs = new CoalescedSync(() => this.sync());
  /** What reads the items' context in the task it runs in reads it re-read (a key press, a press, focus). */
  private readonly flushSyncs = () => this.syncs.flush();

  constructor() {
    super();
    // Before every handler below: an item that changed in this task is read as it is now.
    for (const type of ['keydown', 'keyup', 'click', 'focusin', 'focusout', 'pointerdown', 'contextmenu', 'dragstart']) this.addEventListener(type, this.flushSyncs, { capture: true });
    this.addEventListener('keydown', this.onKeyDown, { capture: true });
    this.addEventListener('keyup', this.onKeyUp, { capture: true });
    this.addEventListener('click', this.onClick);
    // LST-36: the click that ends a drag presses nothing under it — not the handle, not the product's content.
    this.addEventListener(
      'click',
      (event) => {
        if (!this.swallowsHandleClick()) return;
        event.preventDefault();
        event.stopPropagation();
      },
      { capture: true },
    );
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('pointerdown', this.onPointerDown);
    this.addEventListener('contextmenu', this.onContextMenu);
    this.addEventListener('dragstart', this.onDragStart);
    this.addEventListener('tanrei-list-item-update', this.syncs.request);
  }

  /** The items, in order: the list's `<tanrei-list-item>` children. */
  private get items(): TanreiListItem[] {
    return [...this.children].filter((child): child is TanreiListItem => child instanceof TanreiListItem);
  }

  /** LST-6: a selection the list does not define is drawn as `none`. */
  private get mode(): TanreiListSelection {
    return SELECTIONS.includes(this.selection) ? this.selection : 'none';
  }

  private get axis(): TanreiListOrientation {
    return ORIENTATIONS.includes(this.orientation) ? this.orientation : 'vertical';
  }

  private get rtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  /** LST-31: reorderable while nothing is chosen from it. */
  private get isReorderable(): boolean {
    return this.mode === 'none' && this.reorderable;
  }

  /** LST-44: the one live region. */
  private get announcer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.announcer') ?? null;
  }

  private get box(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.items') ?? null;
  }

  /** LST-25: which values are selected now. */
  private get chosen(): Set<string> {
    const mode = this.mode;
    if (mode === 'single') return new Set(this.value === null || this.value === undefined ? [] : [this.value]);
    if (mode === 'multiple') return new Set(this.values ?? []);
    return new Set();
  }

  /** Tells every item what it is now (LST-3, LST-17, LST-18, LST-25, LST-31) and reports what a debug build should (LST-25, LST-47). */
  private readonly sync = () => {
    if (!this.hasUpdated) return;
    countWork('list.sync');
    const items = this.items;
    const selectable = this.mode !== 'none';
    const reorder = this.isReorderable;
    const chosen = this.chosen;
    const isSelected = (item: TanreiListItem) => selectable && chosen.has(item.value);
    const focusable = (item: TanreiListItem) => selectable || (!reorder && item.pressable);
    // LST-17: the tab stop is the item focused last, else the first selected option, else the first enabled item.
    const candidates = items.filter(focusable);
    const tabStop =
      (this.lastFocused && candidates.includes(this.lastFocused) ? this.lastFocused : null) ??
      candidates.find(isSelected) ??
      candidates.find((item) => !item.disabled) ??
      candidates[0] ??
      null;
    const orientation = this.axis;
    const divider: ItemContext['divider'] = this.dividers && !this.wrap ? (orientation === 'vertical' ? 'block' : 'inline') : 'none';
    items.forEach((item, index) =>
      item.setListContext({
        selectable,
        selected: isSelected(item),
        tabStop: item === tabStop,
        position: index + 1,
        size: items.length,
        reorder,
        orientation,
        divider: index === 0 ? 'none' : divider,
        handleLabel: reorder ? this.handleName : '',
        handleHint: reorder ? this.handleHintText : '',
        moves: reorder ? this.moveNames : NO_MOVES,
      }),
    );
    // LST-47: a word nobody gave, where the part that needs it is drawn — once per word and page.
    if (reorder && items.length && this.isConnected) {
      const effects: [Parameters<WordsController['missing']>[0], string, string][] = [
        ['dragHandleLabel', this.handleName, 'every handle is drawn and works, and has no accessible name'],
        ['moveToStartLabel', this.moveNames.start, 'the move menu’s first item has no name'],
        ['moveBeforeLabel', this.moveNames.before, 'the move menu’s second item has no name'],
        ['moveAfterLabel', this.moveNames.after, 'the move menu’s third item has no name'],
        ['moveToEndLabel', this.moveNames.end, 'the move menu’s fourth item has no name'],
        ['liftedText', this.words.get('liftedText', this.liftedText), 'nothing is announced when the keyboard lifts an item'],
        ['movedText', this.words.get('movedText', this.movedText), 'nothing is announced when an item reaches another place'],
        ['cancelledText', this.words.get('cancelledText', this.cancelledText), 'nothing is announced when a move with the keyboard is cancelled'],
      ];
      for (const [key, word, effect] of effects) if (!word) this.words.missing(key, { id: 'LST-47', effect });
      if (this.handleName) {
        const declared = wordPlaces.dragHandleLabel ?? [];
        reportPlaces(this, 'LST-47', 'dragHandleLabel', this.handleName, declared, 'every handle is named with it as it is written');
        if (placeFaults(this.handleName, declared).absent.length) report(this, 'LST-47', 'dragHandleLabel has no place {label}, so the handles of every item have the same name; write it as "Reorder {label}"');
      }
    }
    this.settle(items);
    this.scheduleReports();
  };

  private reportFrame = 0;

  /** LST-25: an option without a value, a value two options share, and a selected value that names no option — reported a frame after the list changed. */
  private scheduleReports() {
    if (this.reportFrame || this.mode === 'none') return;
    this.reportFrame = requestAnimationFrame(() => {
      this.reportFrame = 0;
      const items = this.items;
      if (this.mode === 'none' || !this.isConnected) return;
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (!item.value) report(this, 'LST-25', `option ${index + 1} ("${item.name}") has no value, so it can never be selected`);
        else if (seen.has(item.value)) report(this, 'LST-25', `option ${index + 1} ("${item.name}") repeats the value "${item.value}"; values must be unique within the list`);
        seen.add(item.value);
      });
      for (const named of this.chosen) if (!items.some((item) => item.value === named)) report(this, 'LST-25', `the selection names "${named}", which no option has as its value`);
    });
  }

  // ── Moves ────────────────────────────────────────────────────────────────────────────────────────────────────────

  /** @internal LST-33: a move was chosen from the menu of `item`. */
  requestMenuMove(item: TanreiListItem, move: Move) {
    if (!this.isReorderable || this.carry) return;
    const items = this.items;
    const from = items.indexOf(item);
    if (from < 0) return;
    const to = move === 'start' ? 0 : move === 'before' ? from - 1 : move === 'after' ? from + 1 : items.length - 1;
    // The menu's items that would move nothing are disabled; a move to where it stands is no move.
    if (to < 0 || to >= items.length || to === from) return;
    this.recordPlaces(items);
    this.emitMove(item, from, to, true);
  }

  /** LST-33, LST-35, LST-39: emits `move` once and waits for the product's order (LST-43). */
  private emitMove(item: TanreiListItem, from: number, to: number, focused: boolean) {
    const items = this.items;
    if (this.pending) clearTimeout(this.pending.timer);
    const pending: PendingMove = { item, name: item.name, from, to, focused, before: items, names: items.map((each) => each.name), timer: 0 };
    this.pending = pending;
    // LST-43: an order the product has not given within the reorder motion's time is a move it refused.
    pending.timer = window.setTimeout(() => {
      if (this.pending !== pending) return;
      this.pending = null;
      this.refused(pending);
    }, this.motion().duration);
    this.dispatchEvent(new CustomEvent<TanreiListMoveDetail>('move', { bubbles: true, detail: { from, to } }));
    // A product that reordered in its handler has answered already.
    this.syncs.now();
  }

  /** LST-39, LST-43: the product did not give the order: what was dropped goes back, focus stays on the handle of what stands there. */
  private refused(pending: PendingMove) {
    if (this.holding) {
      this.holding = false;
      this.release(true);
    }
    if (pending.focused) {
      const at = this.items[pending.from];
      if (at && !focusWithin(this)) void at.focusHandle();
    }
  }

  /** LST-43: whether the product has given the order that was asked for — and, if so, the announcement and the focus. */
  private settle(items: TanreiListItem[]) {
    const pending = this.pending;
    if (!pending) return;
    if (!this.isReorderable) {
      clearTimeout(pending.timer);
      this.pending = null;
      return;
    }
    const at = items[pending.to];
    if (!at) return;
    // A new element for the same content: the moved item's name, on an element that did not stand there with it.
    const again = at.name === pending.name && (at !== pending.before[pending.to] || pending.names[pending.to] !== pending.name);
    if (at !== pending.item && !again) return;
    clearTimeout(pending.timer);
    this.pending = null;
    this.say('movedText', this.movedText, at.name, pending.to + 1, items.length);
    if (!pending.focused) return;
    // The product may have taken focus for itself in its handler: then it is the product's.
    const active = deepActive();
    if (active && active !== document.body && active !== document.documentElement && !focusWithin(this) && active.isConnected) return;
    this.heldFocus = { item: at, index: pending.to };
    void at.focusHandle();
  }

  /** The reorder motion's time (in milliseconds) and curve as the cascade computes them: a duration token is an expression. */
  private motion(): { duration: number; easing: string } {
    const carrier = this.announcer;
    if (!carrier) return { duration: 0, easing: 'ease' };
    const style = getComputedStyle(carrier);
    const duration = Number.parseFloat(style.transitionDuration) * 1000;
    return { duration: duration > 0 ? duration : 0, easing: style.transitionTimingFunction.split(/,(?![^(]*\))/)[0].trim() || 'ease' };
  }

  /**
   * LST-44: one of the product's sentences with its places filled, put into the live region in place of what it held.
   * The name is a run of its own direction, isolated from the sentence; the two numbers are written as the list's
   * language writes a whole number. LST-47: without the sentence nothing is announced.
   */
  private say(key: 'liftedText' | 'movedText' | 'cancelledText', own: string, name: string, position: number, count: number) {
    const region = this.announcer;
    if (!region) return;
    const sentence = this.words.get(key, own);
    if (!sentence) {
      region.replaceChildren();
      return;
    }
    const number = new Intl.NumberFormat(ambientLocale(this), { maximumFractionDigits: 0 });
    const { runs } = fillPlaces(sentence, { label: name, position: number.format(position), count: number.format(count) });
    reportPlaces(this, 'LST-44', key, sentence, wordPlaces[key] ?? [], 'it is announced as it is written');
    region.replaceChildren(
      ...runs.map((run) => {
        if (run.place !== 'label') return run.text;
        const bdi = document.createElement('bdi');
        bdi.textContent = run.text;
        return bdi;
      }),
    );
  }

  // ── Where the items are ──────────────────────────────────────────────────────────────────────────────────────────

  /** An item's box as it is laid out, from the list's corner: without what a transform or a running motion adds to it. */
  private laidOut(item: TanreiListItem, origin = this.getBoundingClientRect()): Box {
    const rect = item.getBoundingClientRect();
    const transform = getComputedStyle(item).transform;
    const matrix = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform) : null;
    return { x: rect.left - origin.left - (matrix?.m41 ?? 0), y: rect.top - origin.top - (matrix?.m42 ?? 0), w: rect.width, h: rect.height };
  }

  /** Where an item is drawn now, transform included, from the list's corner. */
  private drawnAt(item: TanreiListItem, origin = this.getBoundingClientRect()): Box {
    const rect = item.getBoundingClientRect();
    return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
  }

  /** LST-41: where every item is laid out now. Read when a box changes and after every change of order, never during a drag. */
  private recordPlaces(items = this.items) {
    if (!this.isReorderable || !this.isConnected || this.carry || this.holding) return;
    const origin = this.getBoundingClientRect();
    this.places = new Map(items.map((item) => [item, { ...this.laidOut(item, origin), name: item.name }]));
  }

  /** Where every item is laid out is read a frame later, with every other list that asked in this turn: one layout for all. */
  private scheduleRecord() {
    recordTogether(this);
  }

  /** @internal Called by `recordTogether()`. */
  recordNow() {
    this.recordPlaces();
  }

  /**
   * LST-39, LST-41: the order changed — every item moves from where it was drawn to where it is now laid out, in both
   * directions where the list wraps, without fading or scaling, the focus ring with it. An element the product gave
   * anew for an item it had moves as that item; an item that is new or gone appears or leaves at once. What was
   * dropped and held (LST-39) goes on from where it is drawn. Where motion is reduced the new order is drawn at once.
   */
  private async placesChanged() {
    let items = this.items;
    const unfinished = items.filter((item) => !item.hasUpdated);
    if (unfinished.length) {
      await Promise.all(unfinished.map((item) => item.updateComplete));
      items = this.items;
    }
    if (!this.isReorderable || !this.isConnected) return;
    const origin = this.getBoundingClientRect();
    const held = this.holding;
    // Where each item is drawn before anything is let go: its laid-out box then, plus what its transform adds now.
    const before = new Map<TanreiListItem, { x: number; y: number }>();
    for (const [item, place] of this.places) {
      if (!items.includes(item)) continue;
      const transform = item.isConnected ? getComputedStyle(item).transform : 'none';
      const matrix = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform) : null;
      before.set(item, { x: place.x + (matrix?.m41 ?? 0), y: place.y + (matrix?.m42 ?? 0) });
    }
    const gone = [...this.places].filter(([item]) => !items.includes(item));
    if (held) {
      this.holding = false;
      this.letGo(false);
    }
    for (const [item, motion] of this.motions) {
      motion.cancel();
      this.motions.delete(item);
    }
    const now = new Map(items.map((item) => [item, { ...this.laidOut(item, origin), name: item.name }]));
    const moving: [TanreiListItem, number, number][] = [];
    for (const item of items) {
      const place = now.get(item)!;
      let was = before.get(item);
      if (!was) {
        // The same content on a new element: the one item that is gone and had this name.
        const same = gone.filter(([, old]) => old.name === place.name);
        if (same.length !== 1) continue;
        was = { x: same[0][1].x, y: same[0][1].y };
      }
      const dx = was.x - place.x;
      const dy = was.y - place.y;
      if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) moving.push([item, dx, dy]);
    }
    this.places = now;
    if (!moving.length) return;
    const { duration, easing } = this.motion();
    if (!duration || reducedMotion()) return;
    for (const [item, dx, dy] of moving) {
      if (typeof item.animate !== 'function') continue;
      const frames = [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }];
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

  // ── Carrying an item ─────────────────────────────────────────────────────────────────────────────────────────────

  /** @internal Whether a click on a handle now is the end of a drag, which presses nothing. */
  swallowsHandleClick(): boolean {
    return !!this.carry || performance.now() < this.swallowUntil;
  }

  /** The space between two items along the list, as laid out. */
  private gapNow(): number {
    const box = this.box;
    if (!box) return 0;
    const style = getComputedStyle(box);
    const value = Number.parseFloat(this.axis === 'vertical' ? style.rowGap : style.columnGap);
    return Number.isFinite(value) ? value : 0;
  }

  /** LST-34, LST-36: lifts `item`, records where every item is laid out, and draws it dragged (LST-37). */
  private lift(item: TanreiListItem, by: Carry['by'], pointer?: { x: number; y: number; id: number }) {
    const items = this.items;
    const from = items.indexOf(item);
    if (from < 0 || items.length < 2 || this.holding) return false;
    for (const motion of this.motions.values()) motion.cancel();
    this.motions.clear();
    this.letGo(false);
    const origin = this.getBoundingClientRect();
    const slots = items.map((each) => this.laidOut(each, origin));
    const point = pointer ?? { x: 0, y: 0, id: -1 };
    this.carry = { item, by, from, target: from, items, slots, origin: { x: origin.left, y: origin.top }, pointer: { x: point.x, y: point.y }, last: { x: point.x, y: point.y }, pointerId: point.id, gap: this.gapNow() };
    item.toggleAttribute('data-dragged', true);
    this.toggleAttribute('data-carrying', true);
    if (by === 'pointer') this.toggleAttribute('data-pointer-carrying', true);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('keydown', this.onDocumentKey, true);
    return true;
  }

  /**
   * LST-38: where each item stands while the carried one would land at `target` — translations from its laid-out box.
   * Along a list that does not wrap every item is placed by the lengths before it in the new order; in a wrapping list
   * each item takes the box of the place it moves into.
   */
  private offsets(carry: Carry, target: number): Map<TanreiListItem, { x: number; y: number }> {
    const { items, slots, from } = carry;
    const order = items.filter((_, index) => index !== from);
    order.splice(target, 0, items[from]);
    const result = new Map<TanreiListItem, { x: number; y: number }>();
    if (this.wrap) {
      const rtl = this.rtl;
      order.forEach((item, place) => {
        const own = slots[items.indexOf(item)];
        const to = slots[place];
        const x = rtl ? to.x + to.w - (own.x + own.w) : to.x - own.x;
        result.set(item, { x, y: to.y - own.y });
      });
      return result;
    }
    const vertical = this.axis === 'vertical';
    const rtl = !vertical && this.rtl;
    // The flow's start: the top of a column, the start edge of a line (its right in right-to-left).
    const first = slots[0];
    const startOf = (box: Box) => (vertical ? box.y : rtl ? -(box.x + box.w) : box.x);
    const lengthOf = (box: Box) => (vertical ? box.h : box.w);
    let at = startOf(first);
    for (const item of order) {
      const own = slots[items.indexOf(item)];
      const shift = at - startOf(own);
      result.set(item, vertical ? { x: 0, y: shift } : { x: rtl ? -shift : shift, y: 0 });
      at += lengthOf(own) + carry.gap;
    }
    return result;
  }

  /** LST-38: places every item but `skip` for the carried one landing at `target`, over the reorder motion (at once where motion is reduced). */
  private arrange(carry: Carry, skip: TanreiListItem | null) {
    const { duration, easing } = this.motion();
    const still = !duration || reducedMotion();
    const offsets = this.offsets(carry, carry.target);
    for (const item of carry.items) {
      if (item === skip) continue;
      const offset = offsets.get(item) ?? { x: 0, y: 0 };
      item.style.transition = still ? 'none' : `transform ${duration}ms ${easing}`;
      item.style.transform = offset.x || offset.y ? `translate(${offset.x}px, ${offset.y}px)` : '';
    }
  }

  /** LST-37: the carried item under the pointer, along the axis only while the list does not wrap, never past the list's box. */
  private follow(carry: Carry, x: number, y: number) {
    const origin = this.getBoundingClientRect();
    const own = carry.slots[carry.from];
    // What the pointer travelled, less what the list itself travelled meanwhile (a scroll).
    let dx = x - carry.pointer.x - (origin.left - carry.origin.x);
    let dy = y - carry.pointer.y - (origin.top - carry.origin.y);
    const width = origin.width;
    const height = origin.height;
    dx = Math.min(Math.max(dx, -own.x), Math.max(-own.x, width - own.x - own.w));
    dy = Math.min(Math.max(dy, -own.y), Math.max(-own.y, height - own.y - own.h));
    if (!this.wrap) {
      if (this.axis === 'vertical') dx = 0;
      else dy = 0;
    }
    carry.item.style.transition = 'none';
    carry.item.style.transform = `translate(${dx}px, ${dy}px)`;
    // LST-38: the place it would land in now.
    const target = this.targetAt(carry, own.x + own.w / 2 + dx, own.y + own.h / 2 + dy);
    if (target !== carry.target) {
      carry.target = target;
      this.arrange(carry, carry.item);
    }
  }

  /** LST-38: the place a carried item whose centre is at (cx, cy) would land in. */
  private targetAt(carry: Carry, cx: number, cy: number): number {
    const { slots, from } = carry;
    if (this.wrap) {
      let best = from;
      let distance = Number.POSITIVE_INFINITY;
      slots.forEach((slot, index) => {
        const d = Math.hypot(slot.x + slot.w / 2 - cx, slot.y + slot.h / 2 - cy);
        if (d < distance) {
          distance = d;
          best = index;
        }
      });
      return best;
    }
    const vertical = this.axis === 'vertical';
    const rtl = !vertical && this.rtl;
    const centre = (slot: Box) => (vertical ? slot.y + slot.h / 2 : slot.x + slot.w / 2);
    const c = vertical ? cy : cx;
    // In the flow's direction: past a neighbour's centre is further along (to the left in a right-to-left line).
    const past = (a: number, b: number) => (rtl ? a <= b : a >= b);
    let target = from;
    for (let index = from + 1; index < slots.length; index++) if (past(c, centre(slots[index]))) target = index;
    if (target === from) for (let index = from - 1; index >= 0; index--) if (past(centre(slots[index]), c)) target = index;
    return target;
  }

  /** LST-34: the place one step from `target` by `key`, or null where the key is not one of the arrangement's. */
  private stepFrom(carry: Carry, key: string): number | null {
    const count = carry.items.length;
    const last = count - 1;
    if (key === 'Home') return 0;
    if (key === 'End') return last;
    const vertical = this.axis === 'vertical';
    const rtl = this.rtl;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const t = carry.target;
    if (!this.wrap) {
      if (vertical) return key === 'ArrowDown' ? Math.min(t + 1, last) : key === 'ArrowUp' ? Math.max(t - 1, 0) : null;
      return key === forward ? Math.min(t + 1, last) : key === backward ? Math.max(t - 1, 0) : null;
    }
    // A wrapping list: along the lines in reading order; across them to the nearest place of the next or previous line.
    const along = vertical ? { next: 'ArrowDown', previous: 'ArrowUp' } : { next: forward, previous: backward };
    if (key === along.next) return Math.min(t + 1, last);
    if (key === along.previous) return Math.max(t - 1, 0);
    const across = vertical ? { next: forward, previous: backward } : { next: 'ArrowDown', previous: 'ArrowUp' };
    if (key !== across.next && key !== across.previous) return null;
    return nearestAcross(carry.slots, t, key === across.next ? 1 : -1, vertical) ?? t;
  }

  /** LST-34: the keyboard moves the lifted item one step. */
  private stepCarry(carry: Carry, target: number) {
    if (target === carry.target) return;
    carry.target = target;
    this.arrange(carry, null);
    this.say('movedText', this.movedText, carry.item.name, target + 1, carry.items.length);
  }

  /**
   * LST-35, LST-39: the carried item is dropped where it would land. It settles into its place over the reorder motion
   * and loses its dragged look; where the place is new the list emits `move` and holds the items as dropped until the
   * product's order arrives.
   */
  private drop() {
    const carry = this.carry;
    if (!carry) return;
    const { item, from, target } = carry;
    const focused = carry.by === 'keyboard' || item.handleFocused;
    this.endCarry();
    if (target === from) {
      this.release(false);
      return;
    }
    // Settle into the gap: its place in the new order.
    const offsets = this.offsets(carry, target);
    const { duration, easing } = this.motion();
    const still = !duration || reducedMotion();
    const own = offsets.get(item) ?? { x: 0, y: 0 };
    item.style.transition = still ? 'none' : `transform ${duration}ms ${easing}`;
    item.style.transform = `translate(${own.x}px, ${own.y}px)`;
    this.holding = true;
    this.places = new Map(carry.items.map((each, index) => [each, { ...carry.slots[index], name: each.name }]));
    this.emitMove(item, from, target, focused);
  }

  /** LST-35, LST-40: the carried item goes back with its neighbours; nothing is emitted. */
  private cancel(announce: boolean) {
    const carry = this.carry;
    if (!carry) return;
    this.endCarry();
    this.release(true);
    if (announce && carry.item.isConnected) this.say('cancelledText', this.cancelledText, carry.item.name, carry.from + 1, carry.items.length);
  }

  /** What every end of a carry shares: the dragged look goes, the listeners are let go. */
  private endCarry() {
    const carry = this.carry;
    if (!carry) return;
    this.carry = null;
    carry.item.removeAttribute('data-dragged');
    this.removeAttribute('data-carrying');
    this.removeAttribute('data-pointer-carrying');
    this.stopScroll();
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('keydown', this.onDocumentKey, true);
    document.removeEventListener('touchmove', this.onTouchMove);
    if (carry.by === 'pointer') this.swallowUntil = performance.now() + 400;
    if (carry.pointerId >= 0 && this.hasPointerCapture?.(carry.pointerId)) this.releasePointerCapture(carry.pointerId);
  }

  /** Every item back to its laid-out place: over the reorder motion where `animated`, else at once. */
  private release(animated: boolean) {
    const { duration, easing } = this.motion();
    const still = !animated || !duration || reducedMotion();
    for (const item of this.items) {
      if (!item.style.transform && !item.style.transition) continue;
      item.style.transition = still ? 'none' : `transform ${duration}ms ${easing}`;
      item.style.transform = '';
      if (still) item.style.transition = '';
      else window.setTimeout(() => {
        if (!item.style.transform) item.style.transition = '';
      }, duration + 50);
    }
  }

  /** Every transform the list set is taken away at once (the order the product gave is drawn by `placesChanged()`). */
  private letGo(animated: boolean) {
    for (const item of this.items) {
      item.style.transition = '';
      item.style.transform = '';
    }
    if (animated) this.release(true);
  }

  // ── Pointer (LST-36 … LST-40) ────────────────────────────────────────────────────────────────────────────────────

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.isReorderable || this.carry || this.press || this.holding || event.isPrimary === false) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const item = itemOf(this, event);
    if (!item || this.items.length < 2) return;
    const path = event.composedPath();
    const onHandle = item.fromHandle(event);
    // LST-36: a press on an interactive element of the content is that element's; the handle is the item's own.
    if (!onHandle && pressTakenWithin(path, item)) return;
    if (onHandle && item.handle?.disabled) return;
    const press: Press = { item, pointerId: event.pointerId, type: event.pointerType, onHandle, x: event.clientX, y: event.clientY, timer: 0 };
    this.press = press;
    // LST-36: a touch or a pen elsewhere on the item lifts it after a long press held within the slop.
    if (event.pointerType !== 'mouse' && !onHandle) {
      press.timer = window.setTimeout(() => {
        if (this.press !== press) return;
        this.startPointerCarry(press, press.x, press.y);
      }, LONG_PRESS);
      document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    }
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  };

  private startPointerCarry(press: Press, x: number, y: number) {
    this.press = null;
    clearTimeout(press.timer);
    if (!this.lift(press.item, 'pointer', { x: press.x, y: press.y, id: press.pointerId })) {
      this.stopPointer();
      return;
    }
    // From now on the pointer is the list's: no scrolling (touch), no text selection, no hover of anything under it.
    if (press.type !== 'mouse') document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    try {
      this.setPointerCapture(press.pointerId);
    } catch {
      // A pointer that is gone cannot be captured: the window's listeners still follow it.
    }
    getSelection?.()?.removeAllRanges();
    const carry = this.carry;
    if (carry) this.follow(carry, x, y);
    this.startScroll();
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const press = this.press;
    if (press && event.pointerId === press.pointerId) {
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y) > SLOP;
      if (!moved) return;
      // LST-36: a mouse anywhere and a touch or a pen on the handle lift once past the slop; a touch elsewhere that
      // moves sooner than the long press scrolls, and lifts nothing.
      if (press.type === 'mouse' || press.onHandle) this.startPointerCarry(press, event.clientX, event.clientY);
      else this.stopPointer();
      return;
    }
    const carry = this.carry;
    if (!carry || carry.by !== 'pointer' || event.pointerId !== carry.pointerId) return;
    event.preventDefault();
    carry.last = { x: event.clientX, y: event.clientY };
    this.follow(carry, event.clientX, event.clientY);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const carry = this.carry;
    if (carry && carry.by === 'pointer' && event.pointerId === carry.pointerId) {
      this.stopPointer();
      this.drop();
      return;
    }
    if (this.press?.pointerId === event.pointerId) this.stopPointer();
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    const carry = this.carry;
    if (carry && carry.by === 'pointer' && event.pointerId === carry.pointerId) {
      this.stopPointer();
      this.cancel(false);
      return;
    }
    if (this.press?.pointerId === event.pointerId) this.stopPointer();
  };

  /** LST-36: once the item is lifted a touch scrolls nothing — the one place a touch's scrolling can still be refused. */
  private readonly onTouchMove = (event: TouchEvent) => {
    if (this.carry?.by === 'pointer' && event.cancelable) event.preventDefault();
  };

  /** LST-36: a long press on a reorderable item opens no menu of the platform's. */
  private readonly onContextMenu = (event: Event) => {
    if (!this.isReorderable) return;
    if (this.carry || (this.press && this.press.type !== 'mouse')) event.preventDefault();
  };

  /** LST-37: nothing of the list is taken by the platform's own drag and drop (an image, a link, selected text). */
  private readonly onDragStart = (event: DragEvent) => {
    if (this.isReorderable && itemOf(this, event)) event.preventDefault();
  };

  private stopPointer() {
    const press = this.press;
    if (press) clearTimeout(press.timer);
    this.press = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    if (!this.carry) document.removeEventListener('touchmove', this.onTouchMove);
  }

  /** LST-35, LST-40: the window lost focus — whatever is carried goes back. */
  private readonly onWindowBlur = () => {
    if (!this.carry) return;
    const keyboard = this.carry.by === 'keyboard';
    this.stopPointer();
    this.cancel(keyboard);
  };

  /** LST-40: Escape puts a dragged item back, and reaches nothing else — not the dialog the list is in. */
  private readonly onDocumentKey = (event: KeyboardEvent) => {
    const carry = this.carry;
    if (!carry || carry.by !== 'pointer' || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.stopPointer();
    this.cancel(false);
  };

  // ── Scrolling near an edge (LST-38) ──────────────────────────────────────────────────────────────────────────────

  private startScroll() {
    const step = () => {
      this.scrollFrame = 0;
      const carry = this.carry;
      if (!carry || carry.by !== 'pointer') return;
      const scroller = scrollingAncestor(this);
      const edge = Number.parseFloat(getComputedStyle(this).getPropertyValue('--tanrei-sys-target-touch')) || 48;
      const area =
        scroller === document.scrollingElement || !scroller
          ? { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }
          : scroller.getBoundingClientRect();
      const { x, y } = carry.last;
      const speed = (distance: number) => (distance < edge ? Math.ceil(((edge - Math.max(distance, 0)) / edge) * 16) : 0);
      const down = speed(area.bottom - y) - speed(y - area.top);
      const right = speed(area.right - x) - speed(x - area.left);
      const target = scroller ?? document.scrollingElement;
      if (target && (down || right)) {
        const before = { top: target.scrollTop, left: target.scrollLeft };
        target.scrollBy({ top: this.axis === 'vertical' || this.wrap ? down : 0, left: this.axis === 'horizontal' || this.wrap ? right : 0 });
        if (target.scrollTop !== before.top || target.scrollLeft !== before.left) this.follow(carry, x, y);
      }
      this.scrollFrame = requestAnimationFrame(step);
    };
    this.scrollFrame = requestAnimationFrame(step);
  }

  private stopScroll() {
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = 0;
  }

  // ── Keyboard ─────────────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * The list's children changed: what each item is, where each is drawn, and where focus stands. Only the list's own
   * slot changing is that: a slot inside an item (a component that slots its rows into List items) changing what it
   * holds bubbles here too, once per item, and is the item's content — which the item tells the list itself
   * (item-update). Re-read for each of those, a list of N such items built re-read itself N times: O(N²).
   */
  private readonly onSlotChange = (event: Event) => {
    if (event.target !== event.currentTarget) return;
    // LST-35, LST-40: the product changed the items while one was carried — it goes back, nothing is moved.
    if (this.carry) {
      const carry = this.carry;
      const keyboard = carry.by === 'keyboard';
      this.stopPointer();
      this.cancel(keyboard && carry.item.isConnected);
    }
    this.syncs.now();
    if (!this.isReorderable) return;
    this.observeItems();
    void this.placesChanged();
    this.keepFocus();
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (this.isReorderable) {
      this.reorderKey(event);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const item = itemOf(this, event);
    if (!item || event.composedPath()[0] !== item.focusTarget) return;
    const items = this.items;
    const current = items.indexOf(item);
    const key = this.rovingKey(event.key, items, current);
    if (key === null) return;
    const target = typeof key === 'number' ? key : this.keys.target(key, current, items.map((each) => ({ focusable: this.mode !== 'none' || each.pressable, label: each.name })));
    if (target === null) return;
    // The key is the list's: it scrolls nothing and does not reach the item (a Space that continues a search is typed).
    event.preventDefault();
    event.stopPropagation();
    if (target !== current) items[target].focus();
  };

  /**
   * LST-17: the key RovingKeys reads for `key` in this arrangement — the arrows along the list as Down and Up — or, in a
   * wrapping list, the index an arrow across the lines moves to; null for an arrow that is not the arrangement's.
   */
  private rovingKey(key: string, items: TanreiListItem[], current: number): string | number | null {
    if (!key.startsWith('Arrow')) return key;
    const vertical = this.axis === 'vertical';
    const rtl = this.rtl;
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const along = vertical ? { next: 'ArrowDown', previous: 'ArrowUp' } : { next: forward, previous: backward };
    if (key === along.next) return 'ArrowDown';
    if (key === along.previous) return 'ArrowUp';
    if (!this.wrap) return null;
    const across = vertical ? { next: forward, previous: backward } : { next: 'ArrowDown', previous: 'ArrowUp' };
    if (key !== across.next && key !== across.previous) return null;
    const origin = this.getBoundingClientRect();
    const focusable = items.map((each) => this.mode !== 'none' || each.pressable);
    const slots = items.map((each) => this.laidOut(each, origin));
    let at = current;
    for (;;) {
      const next = nearestAcross(slots, at, key === across.next ? 1 : -1, vertical);
      if (next === null) return current;
      if (focusable[next]) return next;
      at = next;
    }
  }

  /** LST-33 … LST-35: the keys of a handle, and of an item lifted by the keyboard. */
  private reorderKey(event: KeyboardEvent) {
    const carry = this.carry;
    if (carry?.by === 'keyboard') {
      if (event.key === 'Tab') return; // Focus leaving the handle cancels (onFocusOut).
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') this.cancel(true);
      else if (event.key === ' ' || event.key === 'Enter') {
        if (!event.repeat) this.drop();
      } else if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        const target = this.stepFrom(carry, event.key);
        if (target !== null) this.stepCarry(carry, target);
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || carry) return;
    const item = itemOf(this, event);
    if (!item || !item.fromHandle(event) || item.handle?.disabled) return;
    if (event.key === ' ') {
      // LST-34: Space lifts — it does not press the handle.
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (this.lift(item, 'keyboard')) {
        this.say('liftedText', this.liftedText, item.name, this.items.indexOf(item) + 1, this.items.length);
        this.arrange(this.carry!, null);
      }
    } else if (event.key === 'ArrowDown') {
      // LST-33: Down Arrow opens the move menu, as on a menu button.
      event.preventDefault();
      event.stopPropagation();
      item.openMenu();
    }
  }

  /** A Space that lifted or dropped an item presses nothing on its way up. */
  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (!this.isReorderable || event.key !== ' ') return;
    const item = itemOf(this, event);
    if (item?.fromHandle(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  /** LST-46: a handle took keyboard focus — or focus went somewhere else. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const item = itemOf(this, event);
    if (this.isReorderable) {
      this.heldFocus = item ? { item, index: this.items.indexOf(item) } : null;
      return;
    }
    if (!item || event.composedPath()[0] !== item.focusTarget || item === this.lastFocused) return;
    this.lastFocused = item;
    this.syncs.now();
  };

  /** LST-35: focus leaving the handle of an item lifted by the keyboard puts it back. LST-46: a handle let go of focus. */
  private readonly onFocusOut = (event: FocusEvent) => {
    const carry = this.carry;
    if (carry?.by === 'keyboard' && carry.item.fromHandle(event)) {
      const next = event.relatedTarget;
      const handle = carry.item.handle;
      if (!(next instanceof Node && handle && (handle === next || handle.shadowRoot?.contains(next)))) {
        // An item the product took away is not announced as returned.
        queueMicrotask(() => this.cancel(carry.item.isConnected));
      }
    }
    const held = this.heldFocus;
    if (!held) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.contains(next)) return;
    queueMicrotask(() => {
      if (this.heldFocus !== held || this.items[held.index] !== held.item || focusWithin(this)) return;
      this.heldFocus = null;
    });
  };

  /**
   * LST-46: an item that held keyboard focus on its handle was taken away (or replaced): focus goes to the handle of the
   * item that now stands where it stood, else of the item before it; the last one gone leaves focus to the product.
   */
  private keepFocus() {
    const held = this.heldFocus;
    if (!held || !this.isReorderable) return;
    if (this.pending && this.items.includes(held.item)) return;
    const items = this.items;
    if (items.includes(held.item)) {
      held.index = items.indexOf(held.item);
      return;
    }
    const active = deepActive();
    if (active && active !== document.body && active !== document.documentElement && active.isConnected) return;
    if (!items.length) {
      this.heldFocus = null;
      return;
    }
    const index = Math.min(held.index, items.length - 1);
    const item = items[index];
    this.heldFocus = { item, index };
    void item.focusHandle();
  }

  /** LST-24: activating an enabled option changes the selection and emits `change` once. */
  private readonly onClick = (event: MouseEvent) => {
    const mode = this.mode;
    if (mode === 'none') return;
    const item = itemOf(this, event);
    if (!item || item.disabled) return;
    if (mode === 'single') {
      if (this.value === item.value) return;
      this.value = item.value;
      this.dispatchEvent(new CustomEvent<TanreiListChangeDetail>('change', { bubbles: true, detail: { value: this.value } }));
    } else {
      const values = this.values ?? [];
      this.values = values.includes(item.value) ? values.filter((each) => each !== item.value) : [...values, item.value];
      this.dispatchEvent(new CustomEvent<TanreiListChangeDetail>('change', { bubbles: true, detail: { values: [...this.values] } }));
    }
  };

  /** LST-41: every item's box is watched while the list is reorderable — where each is laid out is read when one changes. */
  private observeItems() {
    if (!this.resize) return;
    this.resize.disconnect();
    this.resize.observe(this);
    for (const item of this.items) this.resize.observe(item);
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this.isReorderable) this.observeItems();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize?.disconnect();
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = null;
    this.stopPointer();
    if (this.carry) this.cancel(false);
    this.holding = false;
    this.letGo(false);
    for (const motion of this.motions.values()) motion.cancel();
    this.motions.clear();
    this.places.clear();
    toRecord.delete(this);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // LST-6: a value the list does not define is drawn as the default; a debug build says so.
    if (changed.has('selection') && !SELECTIONS.includes(this.selection)) report(this, 'LST-6', `selection "${this.selection}" is not a value the list defines; it is drawn as "none"`);
    if (changed.has('orientation') && !ORIENTATIONS.includes(this.orientation)) report(this, 'LST-6', `orientation "${this.orientation}" is not a value the list defines; it is drawn as "vertical"`);
    if (changed.has('gap') && !GAPS.includes(this.gap)) report(this, 'LST-6', `gap "${this.gap}" is not a value the list defines; it is drawn as "none"`);
    // LST-35, LST-40: the product changed what the list is while an item was carried: it goes back.
    if (this.carry && (changed.has('reorderable') || changed.has('selection'))) {
      const keyboard = this.carry.by === 'keyboard';
      this.stopPointer();
      this.cancel(keyboard);
    }
    // LST-47: the words — this list's props, else the product's words, else none.
    this.handleName = this.words.get('dragHandleLabel', this.dragHandleLabel);
    this.handleHintText = this.words.get('dragHandleHint', this.dragHandleHint);
    const next = Object.fromEntries(MOVES.map((move) => [move, this.words.get(MOVE_WORDS[move], (this as unknown as Record<string, string>)[MOVE_WORDS[move]])])) as Record<Move, string>;
    if (MOVES.some((move) => next[move] !== this.moveNames[move])) this.moveNames = next;
  }

  protected override updated(changed: PropertyValues<this>) {
    const mode = this.mode;
    const reorder = this.isReorderable;
    // LST-18: a list, or a listbox named by label (multi-selectable while selection is multiple, with its orientation).
    // LST-44: a reorderable list is a list inside the host, beside its live region (render()).
    hostAria(this, {
      role: reorder ? null : mode === 'none' ? 'list' : 'listbox',
      'aria-label': reorder ? null : this.label || null,
      'aria-multiselectable': mode === 'multiple' ? 'true' : null,
      'aria-orientation': mode !== 'none' && this.axis === 'horizontal' && !this.wrap ? 'horizontal' : null,
    });
    if ((changed.has('label') || changed.has('selection') || changed.has('reorderable')) && (mode !== 'none' || reorder) && !this.label.trim()) {
      report(this, 'LST-18', `a ${reorder ? 'reorderable' : 'selectable'} list has no label, so the ${reorder ? 'list' : 'listbox'} has no accessible name; say what the items are`);
    }
    // LST-31: a selectable list is never reorderable; a debug build says so.
    if ((changed.has('reorderable') || changed.has('selection')) && mode !== 'none' && this.reorderable) {
      report(this, 'LST-31', `reorderable is ignored while selection is "${mode}": an option is chosen by a press that a drag would take`);
    }
    // LST-3: a wrapping list draws no dividers.
    if ((changed.has('dividers') || changed.has('wrap')) && this.dividers && this.wrap) {
      report(this, 'LST-3', 'dividers is ignored while wrap is true: the lines of a grid are told apart by their gap');
    }
    if (reorder) {
      if (!this.resize && typeof ResizeObserver !== 'undefined') this.resize = new ResizeObserver(() => this.scheduleRecord());
      this.observeItems();
      this.scheduleRecord();
    } else {
      this.resize?.disconnect();
      this.places.clear();
      this.heldFocus = null;
    }
    this.syncs.now();
  }

  protected override render() {
    const reorder = this.isReorderable;
    // LST-1, LST-2: the box that lays the items out. LST-44: while reorderable it carries the list role (the host has
    // none), and the live region stands beside it — a status: polite, announced whole, empty at rest, drawn nowhere. It
    // also carries the reorder motion's time and curve for the script to read (a duration token is an expression).
    return html`<div
        part="items"
        class="items"
        role=${reorder ? 'list' : 'presentation'}
        aria-label=${reorder && this.label ? this.label : nothing}
      ><slot @slotchange=${this.onSlotChange}></slot></div
      >${reorder ? html`<span class="quiet"><span class="announcer" role="status" aria-live="polite"></span></span>` : nothing}`;
  }
}

/**
 * LST-17, LST-34: in a wrapping list, the place of the next (`step` 1) or previous (-1) line whose centre is nearest,
 * along the line, to the centre of the place `at`; null where there is no such line. Lines are told apart by where
 * they begin across the list: the top of a line of a horizontal list, the start of a column of a vertical one.
 */
function nearestAcross(slots: readonly Box[], at: number, step: 1 | -1, vertical: boolean): number | null {
  const crossStart = (box: Box) => (vertical ? box.x : box.y);
  const alongCentre = (box: Box) => (vertical ? box.y + box.h / 2 : box.x + box.w / 2);
  const crossLength = (box: Box) => (vertical ? box.w : box.h);
  const lines: number[][] = [];
  slots.forEach((slot, index) => {
    const last = lines.at(-1);
    const lead = last ? slots[last[0]] : null;
    if (lead && Math.abs(crossStart(slot) - crossStart(lead)) < crossLength(lead) / 2) last!.push(index);
    else lines.push([index]);
  });
  const line = lines.findIndex((each) => each.includes(at));
  const other = lines[line + step];
  if (!other) return null;
  const c = alongCentre(slots[at]);
  let best = other[0];
  for (const index of other) if (Math.abs(alongCentre(slots[index]) - c) < Math.abs(alongCentre(slots[best]) - c)) best = index;
  return best;
}

/**
 * LST-41: the lists whose places are read in the next frame, read together — reads only, one after another, so that the
 * page is laid out once for all of them and not once for each.
 */
const toRecord = new Set<TanreiList>();
let recordFrame = 0;
function recordTogether(list: TanreiList) {
  toRecord.add(list);
  if (recordFrame) return;
  recordFrame = requestAnimationFrame(() => {
    recordFrame = 0;
    const lists = [...toRecord];
    toRecord.clear();
    for (const each of lists) each.recordNow();
  });
}

/** The nearest ancestor of `element` that scrolls, across shadow roots; null for the document's own scrolling. */
function scrollingAncestor(element: Element): Element | null {
  for (let at: Node | null = element.parentNode; at; at = at instanceof ShadowRoot ? at.host : at.parentNode) {
    if (!(at instanceof Element)) continue;
    if (at === document.documentElement || at === document.body) return null;
    const style = getComputedStyle(at);
    const scrolls = /(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflowX}`);
    if (scrolls && (at.scrollHeight > at.clientHeight || at.scrollWidth > at.clientWidth)) return at;
  }
  return null;
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
