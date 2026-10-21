import { type CSSResultGroup, LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { hiddenHost } from '../../primitives/hidden.js';
import { classMap } from 'lit/directives/class-map.js';
import { html as staticHtml, literal } from 'lit/static-html.js';
import {
  AvailabilityController,
  CoalescedSync,
  FollowController,
  GlyphDrawnController,
  GlyphMirrorController,
  LINK_MARK,
  LONG_PRESS,
  LinkController,
  type LinkForm,
  PressController,
  RovingKeys,
  SEPARATION_VALUES,
  SHORTCUT_UPDATE,
  type SeparationProp,
  SystemWatchController,
  TOUCH_SLOP,
  chordsConverter,
  chordsOf,
  compChoice,
  countWork,
  deepActive,
  documentPainted,
  hostAria,
  linkAttributes,
  layoutSize,
  naturalHeight,
  notifyItemUpdate,
  registerOverlay,
  report,
  styleQueries,
  swallowRelease,
  syncFocusStyle,
  syncSeparation,
} from '../../primitives/index.js';
// MNU-31: an item draws its shortcut with the keyboard shortcut, which the menu defines wherever it is imported.
import '../keyboard-shortcut/keyboard-shortcut.js';
import type { TanreiKeyboardShortcut } from '../keyboard-shortcut/keyboard-shortcut.js';
import { groupStyles, itemStyles, menuStyles, submenuStyles } from './menu.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** Where the surface goes against the anchor. A closed set; an unknown value is drawn as `bottom-start` (MNU-14). */
export type TanreiMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
const PLACEMENTS: readonly TanreiMenuPlacement[] = ['bottom-start', 'bottom-end', 'top-start', 'top-end'];

/**
 * What opens the menu (MNU-60): `anchor`, the product from its anchor; `context`, a person asking for a context menu at a
 * point of the anchor, which is then an area. A closed set; an unknown value is `anchor`.
 */
export type TanreiMenuTrigger = 'anchor' | 'context';
const TRIGGERS: readonly TanreiMenuTrigger[] = ['anchor', 'context'];

/** How a context menu was asked for (MNU-60): a secondary click or assistive technology, a touch or a pen held still, or a key. */
export type TanreiMenuContextInput = 'pointer' | 'long-press' | 'keyboard';
/** What `contextrequest` carries (MNU-60): the point in client coordinates, the element it was asked about, and how. */
export interface TanreiMenuContextRequestDetail {
  x: number;
  y: number;
  element: Element;
  input: TanreiMenuContextInput;
}

/**
 * Why the menu asks to be closed (MNU-5, MNU-6), by the spec's names. The web has no back gesture of its own: Escape is
 * its close request, so `back` is never sent here.
 */
export type TanreiMenuCloseReason = 'escape' | 'back' | 'outside' | 'tab' | 'focus-out' | 'item';
export interface TanreiMenuCloseDetail {
  reason: TanreiMenuCloseReason;
}
/** What a checkbox item's `change` carries: its new `checked`. */
export interface TanreiMenuCheckboxItemChangeDetail {
  checked: boolean;
}
/** What a group's `change` carries: its new `value`. */
export interface TanreiMenuGroupChangeDetail {
  value: string | null;
}

/** What a submenu item's `toggle` carries: its new `open`. */
export interface TanreiSubmenuToggleDetail {
  open: boolean;
}
/** How the menu tells a group from what is next to it (MNU-35): `auto` takes `comp.menu.separation`. */
export type TanreiMenuSeparation = SeparationProp;
/**
 * Whether a row keeps the room of the mark and leading icon columns where it draws nothing there (MNU-59): `auto` while
 * another item of its section draws in the column, `always` on every row, `never` only where the row itself draws in it.
 */
export type TanreiMenuIconSpace = 'auto' | 'always' | 'never';
const ICON_SPACES: readonly TanreiMenuIconSpace[] = ['auto', 'always', 'never'];

type Condition = 'unselected' | 'selected' | 'current' | 'destructive' | 'expanded';

/** What the menu tells each item: where it is in its surface, and which columns its section and its surface keep (MNU-19, MNU-59). */
interface ItemContext {
  position: number;
  size: number;
  markColumn: boolean;
  iconColumn: boolean;
  /** MNU-19: the surface holds an item with a trailing icon or a submenu indicator, so every row keeps that column. */
  trailingIconColumn: boolean;
  radioChecked: boolean;
  /** MNU-31: the keyboard shortcut's form, as `comp.menu.shortcut.variant` names it where the menu is. */
  shortcutVariant: string;
  /** MNU-38: the glyph the item's group names for its marks; empty where it names none. */
  groupMarkIcon: string;
}

/** MNU-38: the design system's choice of mark for each kind of item; the first value is what an unknown name draws. */
const MARK_CHOICES = {
  checkbox: { property: '--tanrei-comp-menu-checkbox-item-mark', values: ['checkbox', 'check'] },
  radio: { property: '--tanrei-comp-menu-radio-item-mark', values: ['radio', 'check'] },
} as const;

/** MNU-22, MNU-39: the icon set's check, by its name. MNU-42: the submenu indicator. */
const CHECK = 'check';
const SUBMENU_INDICATOR = 'chevron_right';

/** MNU-31: `comp.menu.shortcut.variant`, the form an item's shortcut is drawn in. */
const SHORTCUT_VARIANT = '--tanrei-comp-menu-shortcut-variant';
/** The keyboard shortcut's default form, which an empty choice falls back to. */
const DEFAULT_SHORTCUT_VARIANT = 'keycap';

// ── Placement (MNU-2): a pure function of the anchor's box, the surface's size and the viewport ─────────────────────

export interface MenuBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where the surface goes (MNU-2): `offset` from the anchor on the placement's side, flipped to the other side when this
 * one has less room than the surface needs within `margin` of the viewport's edge and the other has more; aligned by its
 * start or end edge with the anchor's (mirrored in right-to-left), then shifted along the anchor to stay `margin` inside
 * the viewport; its height limited to the room left. Coordinates are the viewport's (`left` is physical).
 */
export function placeMenu(input: { anchor: MenuBox; surface: { width: number; height: number }; viewport: { width: number; height: number }; placement: TanreiMenuPlacement; offset: number; margin: number; rtl: boolean }) {
  const { anchor, surface, viewport, placement, offset, margin, rtl } = input;
  let side: 'top' | 'bottom' = placement.startsWith('top') ? 'top' : 'bottom';
  const edge = placement.endsWith('end') ? 'end' : 'start';
  const below = viewport.height - margin - (anchor.y + anchor.height + offset);
  const above = anchor.y - offset - margin;
  if (side === 'bottom' && below < surface.height && above > below) side = 'top';
  else if (side === 'top' && above < surface.height && below > above) side = 'bottom';
  const room = Math.max(0, side === 'bottom' ? below : above);
  const height = Math.min(surface.height, room);
  const top = side === 'bottom' ? anchor.y + anchor.height + offset : anchor.y - offset - height;
  // The start edge is the left one in left-to-right.
  const alignLeft = (edge === 'start') !== rtl;
  const wanted = alignLeft ? anchor.x : anchor.x + anchor.width - surface.width;
  const left = Math.max(margin, Math.min(wanted, viewport.width - margin - surface.width));
  return { top, left, maxHeight: room, side };
}

/**
 * Where the surface of a context menu goes from the point it was asked for at (MNU-61): with no offset, a corner on the
 * point — the block-start corner for a `bottom-*` placement, the block-end one for `top-*`, the inline-start one for
 * `*-start` (mirrored in right-to-left) — flipped to the other side of the point, along each axis by itself, where its
 * side has less room than the surface needs within `margin` of the viewport's edge and the other side has more; then
 * shifted to stay `margin` inside the viewport, its height limited to the room left. Coordinates are the viewport's.
 */
export function placeAtPoint(input: { point: { x: number; y: number }; surface: { width: number; height: number }; viewport: { width: number; height: number }; placement: TanreiMenuPlacement; margin: number; rtl: boolean }) {
  const { point, surface, viewport, placement, margin, rtl } = input;
  let side: 'top' | 'bottom' = placement.startsWith('top') ? 'top' : 'bottom';
  const below = viewport.height - margin - point.y;
  const above = point.y - margin;
  if (side === 'bottom' && below < surface.height && above > below) side = 'top';
  else if (side === 'top' && above < surface.height && below > above) side = 'bottom';
  const room = Math.max(0, side === 'bottom' ? below : above);
  const height = Math.min(surface.height, room);
  const top = side === 'bottom' ? point.y : point.y - height;
  // Along the line: the surface runs to the right of the point where its start is the left (left-to-right, `*-start`).
  let rightward = placement.endsWith('end') === rtl;
  const right = viewport.width - margin - point.x;
  const left = point.x - margin;
  if (rightward && right < surface.width && left > right) rightward = false;
  else if (!rightward && left < surface.width && right > left) rightward = true;
  const wanted = rightward ? point.x : point.x - surface.width;
  return { top, left: Math.max(margin, Math.min(wanted, viewport.width - margin - surface.width)), maxHeight: room, side };
}

/**
 * Where a submenu's surface goes (MNU-46, MNU-47): beside the surface that holds its item (`parent`), `offset` from that
 * surface's inline-end edge — or from the side `prefer` names, the side its parent surface was itself placed on — and on
 * the other side when this one has less room than the surface needs within `margin` of the viewport's edge and the
 * other has more. Where the side it is on has room for `minWidth` but not for the surface, the surface is narrowed to
 * the room. Where neither side has room for `minWidth` it is laid over `parent`: on the side with more room, as far
 * towards it as the margin allows, as wide as leaves `touch` of the parent uncovered on its other side and never
 * narrower than `minWidth`. Its first row (`lead` below its own block-start edge) is level with the item's `row`, then
 * it is shifted along the block axis to stay `margin` inside the viewport, its height limited to the room.
 * Coordinates are the viewport's (`left` and `side` are physical).
 */
export function placeSubmenu(input: {
  parent: MenuBox;
  row: MenuBox;
  surface: { width: number; height: number };
  lead: number;
  viewport: { width: number; height: number };
  offset: number;
  margin: number;
  minWidth: number;
  touch: number;
  rtl: boolean;
  prefer?: 'left' | 'right' | null;
}) {
  const { parent, row, surface, lead, viewport, offset, margin, minWidth, touch, rtl, prefer } = input;
  const rooms = { right: viewport.width - margin - (parent.x + parent.width + offset), left: parent.x - offset - margin };
  let side: 'left' | 'right' = prefer ?? (rtl ? 'left' : 'right');
  const other = side === 'right' ? 'left' : 'right';
  if (rooms[side] < surface.width && rooms[other] > rooms[side]) side = other;
  let width = surface.width;
  let left: number;
  const overlap = rooms[side] < Math.min(minWidth, surface.width);
  if (overlap) {
    // MNU-47: over the parent, from the viewport's margin on that side back towards the parent's far edge.
    const edge = side === 'right' ? viewport.width - margin : margin;
    const kept = side === 'right' ? parent.x + touch : parent.x + parent.width - touch;
    const free = side === 'right' ? edge - kept : kept - edge;
    width = Math.min(Math.max(minWidth, Math.min(surface.width, free)), Math.max(0, viewport.width - 2 * margin));
    left = side === 'right' ? edge - width : edge;
  } else {
    width = Math.min(surface.width, rooms[side]);
    left = side === 'right' ? parent.x + parent.width + offset : parent.x - offset - width;
  }
  const room = Math.max(0, viewport.height - 2 * margin);
  const height = Math.min(surface.height, room);
  const top = Math.max(margin, Math.min(row.y - lead, viewport.height - margin - height));
  return { top, left, width, maxHeight: room, side, overlap };
}

/** Whether `p` lies in the triangle `a`, `b`, `c` (its edges included). MNU-45: the pointer's path to a submenu. */
export function inTriangle(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): boolean {
  const cross = (u: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) => (u.x - w.x) * (v.y - w.y) - (v.x - w.x) * (u.y - w.y);
  const d1 = cross(p, a, b);
  const d2 = cross(p, b, c);
  const d3 = cross(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// ── The items ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** The properties of a row that are the element's own business: a change of one is not told to the menu. */
const INTERNAL = new Set<PropertyKey>(['context', 'pointerFocused', 'presented', 'blocks']);

/** Each child in a slot of its own; only a changed assignment is written (assigning again re-slots the child, which blurs a focused item). */
function assignBlocks(root: ParentNode, blocks: readonly Element[]) {
  const slots = root.querySelectorAll('slot');
  blocks.forEach((block, i) => {
    const slot = slots[i];
    if (slot && (slot.assignedNodes().length !== 1 || slot.assignedNodes()[0] !== block)) slot.assign(block);
  });
}

/**
 * What an element forwarded into a menu stands for, where that is not itself: a function, under this key, that returns
 * the rows it draws for the menu in its own shadow root. A menubar's menu that is folded into the overflow item draws
 * itself there as a submenu item (MBR-22). Internal between Tanrei elements.
 * @internal
 */
export const FORWARDED_ROWS: unique symbol = Symbol.for('tanrei.menu.forwarded-rows');

/** The elements a block of a surface stands for: a forwarding `<slot>` stands for what is assigned to it. */
const resolved = (block: Element): Element[] =>
  block instanceof HTMLSlotElement ? block.assignedElements({ flatten: true }).flatMap((element) => (element as { [FORWARDED_ROWS]?: () => Element[] })[FORWARDED_ROWS]?.() ?? [element]) : [block];

/**
 * What a menubar tells a menu it shows — its own menus' and the overflow item's (MBR-9, MBR-13, MBR-14, MBR-22, MBR-29).
 * Internal between Tanrei elements; no part of the menu's public surface.
 * @internal
 */
export interface TanreiMenuBarChannel {
  /** MBR-14: the bar. A press or focus inside it is not outside the menu: the bar decides what it does. */
  ground: Element;
  /** MBR-13: an inline arrow key the menu has no use of its own for (MNU-51) is handed to the bar, which moves to the neighbouring menu. */
  inlineKey(towardsEnd: boolean): void;
  /** MBR-9: where focus goes when the menu opens — its first or its last enabled item — and whether without the focus ring (the input was a pointer). */
  entry: { end: 'first' | 'last'; quiet: boolean };
  /** MBR-29: the menu takes the place of another, or gives its place to one: its surfaces come and go without their motion. */
  quick: boolean;
  /** MBR-22: the menu's own surface is the overflow item's, whose level is not counted in the depth a debug build reports (MNU-52). */
  fold: boolean;
}

/**
 * The blocks of a surface (the menu's, a submenu's), each in a slot of its own, held in tiles — a group, or a run of
 * adjacent items outside any group — and between two tiles the two forms of the separation: the divider (MNU-23), a
 * separator, and the gap (MNU-36), empty space that is nothing to assistive technology. Under divider a tile is a box
 * with no look; under gap it is a sheet of its own. The surface's styles draw the form its separation names (MNU-35),
 * so a change of the attribute or of the token is followed without a render.
 */
function blocksTemplate(blocks: readonly Element[]) {
  // A forwarding slot is drawn as what is assigned to it: a group at its start or end is a group there.
  const group = (element: Element | undefined, edge: 'first' | 'last') => {
    const elements = element ? resolved(element) : [];
    return (edge === 'first' ? elements[0] : elements.at(-1)) instanceof TanreiMenuGroup;
  };
  const tiles: number[] = [];
  blocks.forEach((block, i) => {
    if (i === 0 || group(blocks[i - 1], 'last') || group(block, 'first')) tiles.push(1);
    else tiles[tiles.length - 1] += 1;
  });
  return tiles.map(
    (count, i) =>
      html`${i > 0 ? html`<div part="divider" class="divider" role="separator"></div><div class="gap"></div>` : nothing}<div part="tile" class="tile" data-tanrei-shape>${Array.from({ length: count }, () => html`<slot></slot>`)}</div>`,
  );
}

/**
 * What every row of a menu is (the spec's `item`, `checkbox-item`, `radio-item` and `submenu` kinds): a label, optional
 * supporting text, a leading icon and trailing text. The host carries the row's semantics and takes focus — except a
 * link item (MNU-53), whose row is the browser's own link: the anchor in its shadow root carries them, and the host is
 * nothing to assistive technology. The menu moves focus among the rows of a surface, tells each its position, the
 * surface's size and which columns the surface reserves, and answers its activation.
 */
export abstract class TanreiMenuRowBase extends TanreiElement {
  static override styles: CSSResultGroup = [itemStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    supportingText: { type: String, attribute: 'supporting-text' },
    leadingIcon: { type: String, attribute: 'leading-icon' },
    trailingText: { type: String, attribute: 'trailing-text' },
    disabled: { type: Boolean, reflect: true },
    context: { state: true },
    pointerFocused: { state: true },
  };

  /** The item's text and its accessible name. Required. */
  label = '';

  /** A line below the label that says more about the item; it is the item's description. */
  supportingText = '';

  /** The name of a glyph of the system's icon set before the label. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. */
  leadingIcon = '';

  /**
   * Text at the end of the row that is not a keyboard shortcut, such as a count or "Beta": it is the item's description,
   * never its keyboard shortcut. An item's shortcut goes in `shortcut`; an item that has both draws the shortcut.
   */
  trailingText = '';

  /** Prevents activation. The item stays reachable with the arrow keys. */
  disabled = false;

  /** What the menu says about this item. */
  protected context: ItemContext = {
    position: 0,
    size: 0,
    markColumn: false,
    iconColumn: false,
    trailingIconColumn: false,
    radioChecked: false,
    shortcutVariant: DEFAULT_SHORTCUT_VARIANT,
    groupMarkIcon: '',
  };

  /** MNU-8: focus the pointer moved here, which draws no focus ring. */
  protected pointerFocused = false;

  /**
   * MNU-30: a glyph the menu draws — the check of a mark, the check in a checked box, a named mark, the submenu
   * indicator — carries `data-drawn` while the icon set can draw it rather than spell its name in a fallback face. Its
   * ink — the glyph's name at its own width — is watched for any change of size: the icon face loading or failing, the
   * family changing with the system, the menu opening.
   */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.check, .submenu-indicator, .link-mark') ?? []);
  /**
   * MNU-33: the leading and trailing glyphs, the glyph a `mark-icon` names and the submenu indicator are marked when the
   * icon set mirrors their names in right-to-left (`arrow_right`, `chevron_right`, `undo`), and `iconGlyph()` draws the
   * mark. The check (MNU-22, MNU-39) is not among them: it is never mirrored.
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.leading-icon, .trailing-icon, .check.named' });

  /** @internal How the activation being dispatched came: a Space keeps a checkbox or radio item's menu open (MNU-6). */
  activation: 'pointer' | 'enter' | 'space' = 'pointer';

  /** The ARIA role of the kind. */
  protected abstract readonly itemRole: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';

  /** MNU-18: the condition the item is drawn from. */
  protected get condition(): Condition {
    return 'unselected';
  }

  /** Whether a checkbox or radio item is checked (always false for an action). */
  protected get isChecked(): boolean {
    return false;
  }

  /** MNU-38: which control a checkbox or radio item is marked as, where its mark is a control look; null for a kind that has no mark. */
  protected get markKind(): 'checkbox' | 'radio' | null {
    return null;
  }

  /** MNU-38: the glyph the item itself names for its mark. */
  protected get ownMarkIcon(): string {
    return '';
  }

  /** MNU-31: the chords of the item's shortcut; a kind without one has none. */
  protected get shortcutKeys(): string[] {
    return [];
  }

  /** MNU-21: the product's glyph at the end of the row; a kind without one has none. */
  protected get trailingGlyph(): string {
    return '';
  }

  /** MNU-42: whether the row ends in the submenu indicator. */
  protected get opensSubmenu(): boolean {
    return false;
  }

  /** MNU-24: what the kind adds to the host's semantics. */
  protected kindAria(): Record<string, string | null> {
    return {};
  }

  /** MNU-58: whether the row is a link item that names the destination the person is at (drawn from the current condition, with no mark). */
  protected get currentRow(): boolean {
    return false;
  }

  /** MNU-53: the link the item is now — its row is then an anchor that carries its semantics and takes its focus. Null for every kind but an item with a destination. */
  protected get linkForm(): LinkForm | null {
    return null;
  }

  /** MNU-57: what the kind is, where it takes no destination ("a checkbox item"); null for the kind that takes one. */
  protected get holds(): string | null {
    return null;
  }

  /**
   * @internal Whether the row draws a link's mark in its trailing icon column (MNU-55): a link item that opens a new
   * context and names no trailing icon of its own. The menu reserves the column for its surface then (MNU-19).
   */
  get linkMarked(): boolean {
    return !!this.linkForm?.opensNew && !this.trailingGlyph && !this.opensSubmenu;
  }

  /** The element that takes the item's focus and carries its semantics: the anchor of a link item (MNU-53), else the host. */
  private get focusTarget(): HTMLElement {
    return (this.linkForm && this.rowElement) || this;
  }

  /** @internal Whether the item itself — its host, or the anchor of a link item — is where `event` came from (not something inside it, such as a submenu's surface). */
  isTargetOf(event: Event): boolean {
    const target = event.composedPath()[0];
    return target === this || (!!this.linkForm && target === this.rowElement);
  }

  /** Whether the item has focus: its host, or the anchor of a link item. */
  private get focused(): boolean {
    return this.matches(':focus') || this.shadowRoot?.activeElement === this.rowElement;
  }

  /** Focus goes to the element that is the item: the host, or the anchor of a link item (MNU-53). */
  override focus(options?: FocusOptions) {
    const target = this.focusTarget;
    if (target === this) super.focus(options);
    else target.focus(options);
  }

  /** MNU-15 / MNU-16: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.rowElement,
    holdCarrier: () => this.renderRoot.querySelector('.text'),
    disabled: () => this.disabled,
  });

  private spaceDown = false;
  /** Whether the item had focus before a render that may replace the element that holds it (a row that becomes a link, or stops being one). */
  private hadFocus = false;

  constructor() {
    super();
    // MNU-9: a disabled item swallows every click that reaches it, from its content or dispatched on it.
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
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('keyup', this.onKeyUp);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  override connectedCallback() {
    super.connectedCallback();
    // MNU-7: every item takes focus from the menu (arrow keys, the pointer) and none is a Tab stop (Tab closes the menu).
    // A link item's anchor takes it instead (MNU-53).
    if (!this.linkForm && !this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
  }

  /** @internal The row in the surface that holds the item. */
  get rowElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.row') ?? null;
  }

  /** @internal The menu's side: the item's position, its surface's size, the columns and a radio item's checked. */
  setMenuContext(context: ItemContext) {
    const now = this.context;
    if (Object.keys(context).every((key) => context[key as keyof ItemContext] === now[key as keyof ItemContext])) return;
    this.context = context;
  }

  /** @internal MNU-8: the pointer moved onto the item — focus follows it, without the focus ring. */
  focusFromPointer() {
    if (this.focused) return;
    this.pointerFocused = true;
    this.focus({ preventScroll: true });
  }

  /**
   * @internal MNU-45: the pointer crosses the item on its way to an open submenu — it is not drawn hovered. Written on
   * the row at once, not in a render: the pointer is already over it.
   */
  suppressHover(suppress: boolean) {
    this.rowElement?.toggleAttribute('data-nh', suppress);
  }

  /**
   * @internal MNU-38: where a browser has no style container queries, the mark the design system chooses is read from
   * the cascade and written on the mark column; where it has them nothing is written (an attribute could only go stale).
   */
  syncMark() {
    const mark = this.renderRoot?.querySelector<HTMLElement>('.mark');
    const kind = this.markKind;
    if (!mark || !kind) return;
    if (styleQueries()) delete mark.dataset.mark;
    else mark.dataset.mark = compChoice(this, MARK_CHOICES[kind].property, MARK_CHOICES[kind].values);
  }

  /**
   * The click that activates the item: on the host, which the menu answers — or, for a link item, the anchor's own, so
   * that the browser follows the link after it unless it was cancelled (MNU-54).
   */
  private send() {
    const target = this.focusTarget;
    if (target === this) super.click();
    else target.click();
  }

  /** `element.click()` activates the item as a pointer would; a disabled item does nothing (MNU-9). */
  override click() {
    if (this.disabled) return;
    this.activation = 'pointer';
    this.send();
  }

  /** MNU-6: the activation is a click on the host, which the menu answers; `via` says how it came. */
  private activate(via: 'enter' | 'space') {
    this.activation = via;
    try {
      this.send();
    } finally {
      this.activation = 'pointer';
    }
  }

  /** Enter activates on key-down and Space on key-up, as a native button does. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.isTargetOf(event)) return;
    if (event.key === ' ') event.preventDefault(); // Space would scroll the surface.
    if (this.disabled) return;
    this.press.onKeyDown(event);
    if (event.key === 'Enter') {
      // MNU-54: Enter on a link item is the browser's own — it fires the anchor's click and follows the link, with a
      // modifier key in another tab or window — so nothing is prevented or replaced; a held key activates once.
      if (this.linkForm) {
        if (event.repeat) event.preventDefault();
        return;
      }
      event.preventDefault();
      if (!event.repeat) this.activate('enter');
    } else if (event.key === ' ') this.spaceDown = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (!this.isTargetOf(event)) return;
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    // MNU-54: Space activates a link item as Enter does — with the anchor's own click — unless a modifier key is down.
    if (this.linkForm && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
    if (!this.disabled) this.activate('space');
  };

  /** MNU-17: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (this.isTargetOf(event)) syncFocusStyle(this, this.focusTarget);
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    if (!this.isTargetOf(event)) return;
    this.pointerFocused = false;
    this.spaceDown = false;
    this.press.onBlur();
  };


  /** MNU-31: whether the item draws a keyboard shortcut (in place of its trailing text). */
  private get hasShortcut(): boolean {
    return this.shortcutKeys.length > 0;
  }

  /** MNU-38: the glyph the mark is, where the item or its group names one; empty where the design system chooses. */
  private get markIconName(): string {
    return this.markKind ? this.ownMarkIcon.trim() || this.context.groupMarkIcon.trim() : '';
  }

  /**
   * MNU-24: named by the label; described by the supporting text and by the trailing text it draws — never read as a
   * shortcut; its shortcut is `aria-keyshortcuts`, in the form the keyboard shortcut it draws gives (KBS-12).
   */
  private semantics() {
    const drawn = this.renderRoot.querySelector<TanreiKeyboardShortcut>('tanrei-keyboard-shortcut');
    const shortcut = this.hasShortcut && drawn ? drawn.ariaKeyShortcuts : null;
    // MNU-55: a link item that opens a new context says so last.
    const description = [this.supportingText, this.hasShortcut ? '' : this.trailingText, this.linkForm?.targetLabel ?? ''].filter(Boolean).join(', ');
    return { shortcut, description };
  }

  protected override willUpdate(_changed: PropertyValues<this>) {
    this.hadFocus = this.hasUpdated && this.focused;
  }

  protected override firstUpdated() {
    // KBS-12, MNU-24: the shortcut's keys changed without the item (an ancestor's keyboard convention): expose them again.
    this.renderRoot.addEventListener(SHORTCUT_UPDATE, () => this.requestUpdate());
  }

  protected override updated(changed: PropertyValues<this>) {
    const { shortcut, description } = this.semantics();
    const semantics = {
      role: this.itemRole,
      'aria-checked': this.markKind ? String(this.isChecked) : null,
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-label': this.label || null,
      'aria-description': description || null,
      'aria-keyshortcuts': shortcut,
      'aria-posinset': this.context.position ? String(this.context.position) : null,
      'aria-setsize': this.context.size ? String(this.context.size) : null,
      ...this.kindAria(),
    };
    // MNU-53: a link item is exposed once, on its anchor — the menu item role with everything a menu item says; the
    // role and the disabled state there are the link primitive's (`linkAttributes()`). The host is then nothing: no
    // role, no name, and not focusable itself.
    const anchor = this.linkForm ? this.rowElement : null;
    const none = Object.fromEntries(Object.keys(semantics).map((name) => [name, null]));
    if (anchor) {
      const { role: _role, 'aria-disabled': _disabled, ...own } = semantics;
      hostAria(anchor, own);
    }
    hostAria(this, anchor ? none : semantics);
    // MNU-7: every item takes focus from the menu (arrow keys, the pointer) and none is a Tab stop — the host, or the
    // anchor of a link item (its `tabindex` is in the template).
    const wasHost = this.matches(':focus') && !this.shadowRoot?.activeElement;
    if (anchor) {
      if (this.getAttribute('tabindex') === '-1') {
        // Focus the host held moves to the anchor before the host stops taking it.
        if (wasHost) anchor.focus({ preventScroll: true });
        this.removeAttribute('tabindex');
      }
    } else if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
    // The row was replaced under focus (an item that became a link, or stopped being one): focus stays on the item.
    if (this.hadFocus && !this.focused) this.focus({ preventScroll: true });
    this.hadFocus = false;
    // MNU-57: a kind that holds a state, or opens another level, takes no destination; one written on it is ignored.
    const held = this.holds;
    if (held && this.getAttribute('href')?.trim()) {
      report(this, 'MNU-57', `${held} cannot be a link: a control that holds a state, or a second action, is not a destination; href, target and targetLabel are ignored`);
    }
    this.syncMark();
    // MNU-26: an item without a label still renders; a debug build says it has no name.
    if (changed.has('label') && !this.label.trim()) report(this, 'MNU-26', 'label is empty, so the item has no accessible name; give it a label');
    // MNU-31: a shortcut and trailing text both given draw the shortcut, and a debug build says so.
    if (this.hasShortcut && this.trailingText && [...changed.keys()].some((key) => key === 'shortcut' || key === 'trailingText')) {
      report(this, 'MNU-31', `the item "${this.label}" has both a shortcut and trailing text; the shortcut is drawn and the trailing text is not`);
    }
    if (changed.has('disabled') && this.disabled) this.spaceDown = false;
    // The menu re-reads its items when a prop it depends on changes (columns, conditions, typeahead, a submenu's open);
    // an internal event, kept out of the item's public API.
    if (this.hasUpdated && [...changed.keys()].some((key) => !INTERNAL.has(key))) notifyItemUpdate(this, 'tanrei-menu-item-update');
  }

  /**
   * MNU-22, MNU-38 … MNU-40: the mark column. A glyph the item or its group names is that glyph alone; otherwise the
   * column holds both of the design system's choices — the control look of the kind (a box with the icon set's check on
   * it, or a ring with its fill) and the icon set's check — and the styles draw the one the choice token names.
   */
  private renderMark() {
    const kind = this.markKind;
    if (!kind) return nothing;
    const named = this.markIconName;
    if (named) return html`<span class="check named"><span class="check-ink">${named}</span></span>`;
    return html`${kind === 'checkbox'
        ? html`<span class="control box" data-tanrei-shape><span class="check box-check"><span class="check-ink">${CHECK}</span></span></span>`
        : html`<span class="control ring" data-tanrei-shape><span class="fill"></span></span>`}<span class="check system"><span class="check-ink">${CHECK}</span></span>`;
  }

  protected renderRow() {
    const condition = this.condition;
    const kind = this.markKind;
    const markColumn = this.context.markColumn || !!kind;
    const iconColumn = this.context.iconColumn || !!this.leadingIcon;
    const trailingGlyph = this.trailingGlyph;
    // MNU-55: a link item that opens a new context ends in the icon set's mark where the product named no glyph there.
    const marked = this.linkMarked;
    const trailingIconColumn = this.context.trailingIconColumn || !!trailingGlyph || this.opensSubmenu || marked;
    // MNU-53: with a destination the same row is an anchor — the same classes, parts and listeners, so every state is
    // drawn from the same tokens — whose address, target, rel, role (the menu item's) and disabled form are the link
    // primitive's. It takes the item's focus (`tabindex`, never a Tab stop) and its semantics (`updated()`).
    const link = this.linkForm;
    const tag = link ? literal`a` : literal`div`;
    return staticHtml`
      <${tag}
        part="container"
        ${linkAttributes(link)}
        tabindex=${link ? '-1' : nothing}
        class=${classMap({
          row: true,
          p: true,
          d: this.disabled,
          pf: this.pointerFocused,
          selected: condition === 'selected',
          destructive: condition === 'destructive',
          expanded: condition === 'expanded',
          checked: this.isChecked,
          current: this.currentRow,
        })}
        data-tanrei-shape
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
      >
        <span class="content">
          ${markColumn ? html`<span part="mark" class=${classMap({ column: true, mark: true, checkbox: kind === 'checkbox', radio: kind === 'radio' })} aria-hidden="true">${this.renderMark()}</span>` : nothing}
          ${iconColumn
            ? html`<span class="column leading"><span part="leading-icon" class=${classMap({ 'leading-icon': true, empty: !this.leadingIcon })} aria-hidden="true">${this.leadingIcon}</span></span>`
            : nothing}
          <span class="text">
            <span part="label" class="label">${this.label}</span>
            ${this.supportingText ? html`<span part="supporting-text" class="supporting">${this.supportingText}</span>` : nothing}
          </span>
          ${this.hasShortcut
            ? html`<span class="column trailing"
                ><tanrei-keyboard-shortcut
                  part="shortcut"
                  class="shortcut"
                  .keys=${this.shortcutKeys}
                  .hosted=${true}
                  size="small"
                  variant=${this.context.shortcutVariant}
                  ?disabled=${this.disabled}
                ></tanrei-keyboard-shortcut
              ></span>`
            : this.trailingText
              ? html`<span class="column trailing"><span part="trailing-text" class="trailing-text">${this.trailingText}</span></span>`
              : nothing}
          ${this.opensSubmenu
            ? html`<span class="column trailing-icon-column"
                ><span part="submenu-indicator" class="trailing-icon submenu-indicator" aria-hidden="true"><span class="ink">${SUBMENU_INDICATOR}</span></span></span
              >`
            : marked
              ? html`<span class="column trailing-icon-column"
                  ><span part="trailing-icon link-mark" class="trailing-icon link-mark" aria-hidden="true"><span class="ink">${LINK_MARK}</span></span></span
                >`
              : trailingIconColumn
              ? html`<span class=${classMap({ column: true, 'trailing-icon-column': true, reserved: !trailingGlyph })}
                  ><span part="trailing-icon" class=${classMap({ 'trailing-icon': true, empty: !trailingGlyph })} aria-hidden="true">${trailingGlyph}</span></span
                >`
              : nothing}
        </span>
      </${tag}>
    `;
  }

  protected override render() {
    return this.renderRow();
  }
}

/**
 * What an item that is not a submenu is (the spec's `item`, `checkbox-item` and `radio-item` kinds): a row that may also
 * end in a keyboard shortcut and a trailing icon; the mark of a checkbox or radio item is in the mark column.
 */
export abstract class TanreiMenuItemBase extends TanreiMenuRowBase {
  static override properties: PropertyDeclarations = {
    trailingIcon: { type: String, attribute: 'trailing-icon' },
    shortcut: { converter: chordsConverter },
  };

  /** The name of a glyph at the end of the row; one the icon set flags (`arrow_right`) is mirrored in a right-to-left layout. */
  trailingIcon = '';

  /**
   * The item's keyboard shortcut, in the keyboard shortcut component's key names: one chord per string, pressed in order
   * (`["mod+c"]`; the attribute holds the chords separated by spaces, `shortcut="mod+c"`). The menu draws it at the end of
   * the row for the keyboard the person uses and exposes it as `aria-keyshortcuts` (MNU-24, MNU-31). It does not make
   * the keys work; the product binds them.
   */
  shortcut: string[] = [];

  protected override get shortcutKeys(): string[] {
    return chordsOf(this.shortcut);
  }

  protected override get trailingGlyph(): string {
    return this.trailingIcon;
  }
}

/**
 * An action in a menu — the spec's item kind `item`: it does something and closes the menu.
 *
 * With `href` it is a link item (MNU-53): the row is an `<a href role="menuitem" tabindex="-1">` in the shadow
 * root, drawn exactly as an action is and moved to with the same keys, and the browser's own link in everything else —
 * its context menu, a new tab by a modified or a middle click, its address shown on hover. It is exposed as a menu
 * item, not as a link: a menu is read by its items. A plain activation — a click, a touch, Enter, and Space too, which
 * activates every row of a menu — fires the item's `click` (the anchor's own: `preventDefault()` cancels the
 * navigation, as a router does), then the menu's `close`, and then the browser follows the link (MNU-54). A modified
 * or a middle click is the browser's: no `close`, and the menu stays open. `target="new"` opens a new tab, safely
 * (`noopener`), ends the row with the icon set's `open_in_new` in the trailing icon column unless `trailing-icon` names
 * a glyph, and is said through `targetLabel` (MNU-55). A disabled link item is the anchor without `href` (MNU-56).
 *
 * @tag tanrei-menu-item
 * @csspart container - The row: its color, corners, every state, the ripple and the focus ring.
 * @csspart mark - The mark column (kept in a row without a mark as the menu's `iconSpace` says, MNU-59).
 * @csspart leading-icon - The leading glyph.
 * @csspart label - The item's text.
 * @csspart supporting-text - The line below the label.
 * @csspart trailing-text - The text at the end of the row that is not a shortcut (a count, "Beta").
 * @csspart shortcut - The `<tanrei-keyboard-shortcut>` that draws the item's shortcut in the trailing column (MNU-31).
 * @csspart trailing-icon - The trailing glyph; for a link item that opens a new context and names none, the `open_in_new` mark.
 * @csspart link-mark - The `open_in_new` glyph of a link item that opens a new context (the same element as `trailing-icon`; hidden from assistive technology).
 * @fires click - The item was activated by pointer, touch, keyboard or assistive technology; the menu then emits `close` with the reason `item`. For a link item it is the anchor's own click, before the menu closes and before the link is followed: `preventDefault()` stops the navigation and not the `close`.
 */
export class TanreiMenuItem extends TanreiMenuItemBase {
  static override properties: PropertyDeclarations = {
    destructive: { type: Boolean, reflect: true },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
    current: { type: Boolean, reflect: true },
  };

  /**
   * Marks a link item as the destination the person is at now (MNU-58): its anchor says `aria-current="page"` and its
   * row is drawn from the current condition — the fill of the row the person is on — with no mark and no change of
   * weight. You set it; the menu never does. Ignored without `href`, and reported. A menubar sets it on the row a folded
   * current link item draws of itself (MBR-43).
   */
  current = false;

  /** Marks an action that deletes or discards something; it is drawn in the destructive condition (the error color). */
  destructive = false;

  /** The address the item leads to: a URL, a path or a fragment. Not empty, the item is a link item (MNU-53): the browser's own link, exposed as a menu item; a plain activation fires `click`, closes the menu and follows it (MNU-54). White space is no address; a `javascript:` address or one that cannot be read is refused and reported (MNU-57). */
  href = '';

  /** Where a link item opens: `same` (here) or `new` (a new tab or window, with `noopener`), which the row marks with `open_in_new` unless `trailing-icon` names a glyph, and says through `targetLabel` (MNU-55). HTML's `_self` and `_blank` are read as those; anything else is `same` and is reported (MNU-57). Ignored without `href`. */
  target = 'same';

  /** What assistive technology reads at the end of the link item's description while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: the anchor's `rel`. `noopener` is added while `target` is `new`; `noreferrer` is yours to add. */
  rel: string | null = null;

  /** Web only: the anchor's `download`. */
  download: string | null = null;

  /**
   * MNU-53, MNU-55 … MNU-57: the link the item is while it has an address, what its anchor carries — the menu item
   * role in place of the link's, because a menu is read by its items — and what a debug build is told
   * (src/primitives/link.ts). The item keeps a menu's keys: Space presses it as Enter does (MNU-54).
   */
  private readonly link = new LinkController(this, { ids: { refused: 'MNU-57', newContext: 'MNU-55' }, disabled: () => this.disabled, role: 'menuitem' });

  protected override get linkForm(): LinkForm | null {
    return this.link.form;
  }

  /** @internal Whether the item is a link item now (MNU-53). */
  get isLink(): boolean {
    return !!this.link.form;
  }

  protected readonly itemRole = 'menuitem';

  /** MNU-58: the current page is said where the link is — on the anchor, which carries a link item's semantics (MNU-53). */
  protected override kindAria(): Record<string, string | null> {
    return { 'aria-current': this.currentRow ? 'page' : null };
  }

  protected override get currentRow(): boolean {
    return this.current && this.isLink;
  }

  /** MNU-58: a current link item is drawn from the current condition — the fill of the row the person is on, and its colors. */
  protected override get condition(): Condition {
    if (this.currentRow) return 'current';
    return this.destructive ? 'destructive' : 'unselected';
  }

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    // MNU-58: current names a destination; without one it is ignored, and a debug build says so.
    if ((changed.has('current') || changed.has('href')) && this.current && !this.isLink) {
      report(this, 'MNU-58', 'current is set on an item with no destination; it is ignored — current marks the link item of the page the person is on');
    }
  }
}

/**
 * An option switched on or off on its own — the spec's item kind `checkbox-item`. Its `checked` is its own: the menu
 * switches it when the item is activated and fires the item's `change`. A checked item's row is filled, and it is
 * marked as the design system chooses (`comp.menu.checkbox-item.mark`: the checkbox look, a box in both conditions, in
 * the default system; the icon set's check in m3-like and cupertino) unless the item or its group names a glyph.
 *
 * @tag tanrei-menu-checkbox-item
 * @csspart container - The row.
 * @csspart mark - The mark column: the box of the checkbox look, or the glyph that marks the item while it is checked. A drawing, never a control.
 * @csspart leading-icon - The leading glyph.
 * @csspart label - The item's text.
 * @csspart supporting-text - The line below the label.
 * @csspart trailing-text - The text at the end of the row that is not a shortcut.
 * @csspart shortcut - The `<tanrei-keyboard-shortcut>` that draws the item's shortcut in the trailing column (MNU-31).
 * @csspart trailing-icon - The trailing glyph.
 * @fires {CustomEvent<TanreiMenuCheckboxItemChangeDetail>} change - The item was activated: `detail.checked` (and the element's `checked`) is the new value.
 */
export class TanreiMenuCheckboxItem extends TanreiMenuItemBase {
  static override properties: PropertyDeclarations = {
    checked: { type: Boolean, reflect: true },
    markIcon: { type: String, attribute: 'mark-icon' },
  };

  /** Whether the option is on. */
  checked = false;

  /**
   * The name of a glyph of the system's icon set to mark this item with while it is checked, instead of the mark the
   * design system chooses (`check` draws a plain check). Empty takes its group's `mark-icon`, then the system's choice.
   */
  markIcon = '';

  protected readonly itemRole = 'menuitemcheckbox';

  protected override get holds() {
    return 'a checkbox item';
  }

  protected override get condition(): Condition {
    return this.checked ? 'selected' : 'unselected';
  }

  protected override get isChecked(): boolean {
    return this.checked;
  }

  protected override get markKind() {
    return 'checkbox' as const;
  }

  protected override get ownMarkIcon(): string {
    return this.markIcon ?? '';
  }
}

/**
 * One choice of several in its group — the spec's item kind `radio-item`: it is checked while its group's `value` is
 * its own. A checked item's row is filled, and it is marked as the design system chooses (`comp.menu.radio-item.mark`:
 * the radio look, a ring in both conditions, in the default system; the icon set's check in m3-like and cupertino)
 * unless the item or its group names a glyph.
 *
 * @tag tanrei-menu-radio-item
 * @csspart container - The row.
 * @csspart mark - The mark column: the ring of the radio look, or the glyph that marks the item while it is checked. A drawing, never a control.
 * @csspart leading-icon - The leading glyph.
 * @csspart label - The item's text.
 * @csspart supporting-text - The line below the label.
 * @csspart trailing-text - The text at the end of the row that is not a shortcut.
 * @csspart shortcut - The `<tanrei-keyboard-shortcut>` that draws the item's shortcut in the trailing column (MNU-31).
 * @csspart trailing-icon - The trailing glyph.
 */
export class TanreiMenuRadioItem extends TanreiMenuItemBase {
  static override properties: PropertyDeclarations = {
    value: { type: String },
    markIcon: { type: String, attribute: 'mark-icon' },
  };

  /** Identifies the choice: the item is checked while its group's value equals it. Unique within its group; required. */
  value = '';

  /**
   * The name of a glyph of the system's icon set to mark this item with while it is checked, instead of the mark the
   * design system chooses (`check` draws a plain check). Empty takes its group's `mark-icon`, then the system's choice.
   */
  markIcon = '';

  protected readonly itemRole = 'menuitemradio';

  protected override get holds() {
    return 'a radio item';
  }

  protected override get condition(): Condition {
    return this.context.radioChecked ? 'selected' : 'unselected';
  }

  protected override get isChecked(): boolean {
    return this.context.radioChecked;
  }

  protected override get markKind() {
    return 'radio' as const;
  }

  protected override get ownMarkIcon(): string {
    return this.markIcon ?? '';
  }
}

/** How a submenu's surface is drawn now: not at all, in place beside its item (the menu is `inline`), or in the top layer. */
type Presentation = 'hidden' | 'inline' | 'overlay';

/** Orders the submenus by when they were opened: of two open in one surface, the later one stays (MNU-48). */
let opened = 0;

/**
 * An item that opens another level of the menu beside it — the spec's item kind `submenu`. It holds that level's items
 * as its children, of any kind, further submenus included; it draws its row, ending in the icon set's `chevron_right`,
 * in the surface that holds it, and its own surface as a manual popover in the top layer, placed against the row
 * (MNU-46, MNU-47). It is not an action: activating it opens its submenu and closes nothing. `open` is its own: the menu
 * sets it when the person opens or closes the submenu and fires `toggle`; the product may also set it. The menu it is in
 * does the rest — the keys, the pointer's path, placement, focus and closing.
 *
 * @tag tanrei-submenu
 * @slot - The submenu's items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 * @csspart container - The row: its color, corners, every state, the ripple and the focus ring; filled from the expanded condition while the submenu is open.
 * @csspart mark - The mark column, empty in a submenu item (kept in a row without a mark as the menu's `iconSpace` says, MNU-59).
 * @csspart leading-icon - The leading glyph.
 * @csspart label - The item's text.
 * @csspart supporting-text - The line below the label.
 * @csspart trailing-text - The text at the end of the row, before the indicator: the current value of what the submenu sets, or a count.
 * @csspart submenu-indicator - The icon set's `chevron_right` at the end of the row, mirrored in a right-to-left layout.
 * @csspart surface - The submenu's floating sheet, drawn from the menu's surface tokens.
 * @csspart scroll - The padded box inside the surface that scrolls the items.
 * @csspart divider - A line between a group and what is next to it, while the menu's separation is divider.
 * @csspart tile - A group, or a run of items outside any group: a sheet of its own while the separation is gap (MNU-36), a box with no look while it is divider.
 * @fires {CustomEvent<TanreiSubmenuToggleDetail>} toggle - The person opened or closed the submenu: `detail.open` (and the element's `open`) is the new value. It bubbles. A change the product makes, and the whole menu closing, fire none.
 */
export class TanreiSubmenu extends TanreiMenuRowBase {
  static override styles = [itemStyles, submenuStyles, hiddenHost];

  // Each child in a slot of its own, so that a divider or a gap can be drawn between two of them (MNU-23, MNU-36).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    blocks: { state: true },
    presented: { state: true },
  };

  /**
   * Whether the item's submenu is shown. The menu sets it when the person opens or closes the submenu and fires
   * `toggle`; the product may also set it. It shows nothing while the surface that holds the item is not shown, while
   * the item is disabled and while it holds no item.
   */
  open = false;

  protected readonly itemRole = 'menuitem';

  protected override get holds() {
    return 'a submenu item';
  }

  /** The submenu's children, each in a slot of its own. */
  private blocks: Element[] = [];
  /** Whether its surface is drawn now: the item is then in the expanded condition (MNU-50). */
  private presented = false;
  private readonly children$ = new MutationObserver(() => this.readChildren());

  /** @internal How its surface is drawn now. */
  presentation: Presentation = 'hidden';
  /** @internal The side of the surface that holds its item that its own surface is placed on (MNU-46). */
  side: 'left' | 'right' = 'right';
  /** @internal MNU-47: its surface is laid over the surface that holds its item. */
  overlap = false;
  /** @internal What it was last placed for: the menu places it again when this changes. */
  lastLayout = '';
  /** @internal When it was opened, among the submenus of the page. */
  openedAt = 0;

  constructor() {
    super();
    // A forwarding <slot> child changed what is assigned to it (a folded menu of a menubar, MBR-22): the blocks' kinds
    // (dividers) and the items.
    this.addEventListener('slotchange', (event) => {
      if ((event.target as Node | null)?.parentNode !== this) return;
      this.requestUpdate();
      notifyItemUpdate(this, 'tanrei-menu-item-update');
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true });
    this.readChildren();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
  }

  private readChildren() {
    const now = [...this.children];
    if (now.length !== this.blocks.length || now.some((child, i) => child !== this.blocks[i])) this.blocks = now;
  }

  /** @internal The submenu's surface. */
  get surfaceElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.surface') ?? null;
  }

  /** @internal The box of the surface that scrolls its items. */
  get scrollElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.scroll') ?? null;
  }

  protected override get condition(): Condition {
    return this.presented ? 'expanded' : 'unselected';
  }

  protected override get opensSubmenu(): boolean {
    return true;
  }

  /** MNU-24: a menu item that opens a menu, and whether that menu is open. */
  protected override kindAria() {
    return { 'aria-haspopup': 'menu', 'aria-expanded': String(this.presented) };
  }

  /**
   * @internal The menu's side (MNU-43, MNU-48 … MNU-50): draws the surface in place or in the top layer, or removes it —
   * fading out, as the menu's own does (MNU-4). Returns whether the presentation changed.
   */
  present(mode: Presentation, quick = false): boolean {
    const surface = this.surfaceElement;
    if (!surface || mode === this.presentation) return false;
    const was = this.presentation;
    this.presentation = mode;
    this.presented = mode !== 'hidden';
    this.lastLayout = '';
    surface.classList.toggle('inline', mode === 'inline');
    surface.classList.remove('entering');
    if (mode === 'overlay') {
      surface.classList.remove('leaving');
      if (!surface.matches(':popover-open')) surface.showPopover();
    } else {
      this.overlap = false;
      surface.classList.remove('cascading');
      if (was === 'overlay') {
        // MBR-29: gone at once where a menubar's menu gives its place to another.
        if (!quick) this.leave(surface);
        else if (surface.isConnected && surface.matches(':popover-open')) surface.hidePopover();
      }
    }
    return true;
  }

  /** @internal MNU-50: the open motion, growing from the edge that faces the item. Called once the surface is placed. */
  enter() {
    const surface = this.surfaceElement;
    if (!surface) return;
    surface.classList.remove('entering');
    void surface.offsetWidth; // restart the animation
    surface.classList.add('entering');
  }

  private leave(surface: HTMLElement) {
    surface.classList.add('leaving');
    const finish = () => {
      if (this.presentation === 'overlay' || !surface.classList.contains('leaving')) return;
      surface.classList.remove('leaving');
      if (surface.isConnected && surface.matches(':popover-open')) surface.hidePopover();
    };
    const running = surface.getAnimations();
    if (running.length === 0) finish();
    else void Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    if (changed.has('open') && this.open && !this.openedAt) this.openedAt = ++opened;
    if (changed.has('open') && !this.open) this.openedAt = 0;
  }

  protected override firstUpdated() {
    super.firstUpdated();
    // The surface exists now: the menu presents it if it is open.
    notifyItemUpdate(this, 'tanrei-menu-item-update');
  }

  protected override updated(changed: PropertyValues<this>) {
    assignBlocks(this.surfaceElement ?? this.renderRoot, this.blocks);
    super.updated(changed);
  }

  protected override render() {
    // MNU-24: the submenu's surface is a menu of its own, named by its item's label.
    return html`${this.renderRow()}
      <div part="surface" class="surface" data-tanrei-shape popover="manual" role="menu" aria-label=${this.label || nothing}>
        <div part="scroll" class="scroll">${blocksTemplate(this.blocks)}</div>
      </div>`;
  }
}

/**
 * A run of related items — the spec's item kind `group` — optionally under a title (its `label`, as `<optgroup label>`:
 * a `title` attribute would also draw the browser's tooltip), which names it. The menu separates a group from what is
 * next to it, by a divider or a gap as its `separation` names; a group of radio items is one set of choices, and holds
 * which one is checked in `value`.
 *
 * @tag tanrei-menu-group
 * @slot - The group's items.
 * @csspart title - The heading above the items.
 * @fires {CustomEvent<TanreiMenuGroupChangeDetail>} change - A radio item of the group was chosen: `detail.value` (and the element's `value`) is the new value.
 */
export class TanreiMenuGroup extends TanreiElement {
  static override styles = [groupStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    label: { type: String },
    value: { type: String },
    markIcon: { type: String, attribute: 'mark-icon' },
    nesting: { state: true },
  };

  /** The group's title, drawn above its items, which names the group; empty draws none. */
  label = '';

  /** The value of the group's checked radio item; `null` checks none. The group sets it when a radio item is chosen. */
  value: string | null = null;

  /**
   * The name of a glyph of the system's icon set that marks the group's checked checkbox and radio items, for those that
   * name none of their own (`check` draws a plain check). Empty takes the design system's choice (MNU-38).
   */
  markIcon = '';

  /** Whether this group sits in another (MNU-29). */
  private nesting = { nested: false };

  /** @internal The menu's side. */
  setMenuContext(nesting: { nested: boolean }) {
    if (this.nesting.nested === nesting.nested) return;
    this.nesting = nesting;
  }

  protected override updated(changed: PropertyValues<this>) {
    const { nested } = this.nesting;
    // MNU-24: a group named by its title; MNU-29: a group in a group is drawn as its outer group's items.
    hostAria(this, { role: nested ? 'none' : 'group', 'aria-label': !nested && this.label ? this.label : null });
    if (this.hasUpdated && (changed.has('label') || changed.has('value') || changed.has('markIcon'))) notifyItemUpdate(this, 'tanrei-menu-item-update');
  }

  protected override render() {
    const { nested } = this.nesting;
    // MNU-28: the title takes no focus and is not read as an item: the group's name is its label.
    return html`${this.label && !nested ? html`<span part="title" class="title" aria-hidden="true">${this.label}</span>` : nothing}<slot></slot>`;
  }
}

// ── The menu ──────────────────────────────────────────────────────────────────────────────────────────────────────

const ROWS = 'tanrei-menu-item, tanrei-menu-checkbox-item, tanrei-menu-radio-item, tanrei-submenu';
let ids = 0;

/**
 * A node's parent in the flat tree: the slot it is assigned to, else its parent, and a shadow root's host. It is how the
 * menu tells its own content — slotted into it, or forwarded through a slot of a component that holds the menu in its
 * shadow root (a split button, SPB-15) — from anything else, and which surface of its tree an item is in.
 */
const flatParent = (node: Node): Node | null => {
  const slot = (node as Element | Text).assignedSlot;
  if (slot) return slot;
  const parent = node.parentNode;
  return parent instanceof ShadowRoot ? parent.host : parent;
};

/** A surface of the menu's tree: the menu's own, or a submenu's. Each holds its own items and reserves its own columns. */
type Level = TanreiMenu | TanreiSubmenu;

/** How a submenu's closing treats focus: a key returns it to the item with the ring, a pointer without; `stay` moves it only if it was inside. */
type FocusReturn = 'key' | 'pointer' | 'stay';

/**
 * Offers a short set of actions or choices on a temporary surface that opens from the element that asked for it, with
 * further levels in submenus where the set needs them.
 *
 * Contract: specs/menu.spec.json. The surface is a manual popover in the top layer, placed against the anchor (the
 * element whose id is `anchor`) by script: below or above it as `placement` says, flipping and shifting to stay inside
 * the viewport, scrolling when it is taller than the room, following the anchor while it moves. The menu is an operated
 * overlay that is not modal: it moves focus to its first enabled item when it opens and back to the anchor
 * when it closes, never traps focus and draws no scrim. It never closes itself: it fires `close` with a reason — Escape,
 * a press outside the surface and the anchor, Tab, focus leaving it, an item's activation — and you set `open` to false.
 *
 * A `<tanrei-submenu>` among the items opens another level beside its row (MNU-42 … MNU-52), by the WAI-ARIA menu
 * pattern: the arrow key that points to the inline end, Enter, Space, a press or a tap open it and move focus in; the
 * opposite arrow key and Escape close one level and return focus to its item; a pointer that rests on the item opens it
 * after `comp.menu.motion.submenu-delay`, and may then cross other items on its way in. Every surface of the tree is
 * inside the menu: a press in a submenu is not a press outside, and whatever closes the menu closes every level with one
 * `close`.
 *
 * A group is told from what is next to it as `separation` names (MNU-35): a divider, or a gap of
 * `comp.menu.group.gap`; `auto` takes `comp.menu.separation`, which follows the design system's choice.
 *
 * Every visual value comes from `--tanrei-comp-menu-*` tokens, the items' by condition (unselected, selected,
 * current, destructive, expanded) and state. The `inline` attribute, for tests and documentation, draws the open surface in place
 * instead: at its natural size, with its elevation, without an anchor, placement, open motion, focus on opening or light
 * dismiss, each open submenu beside its item.
 *
 * With `trigger="context"` it is the context menu of an area — the element whose id is `anchor` (MNU-60 … MNU-63): a
 * secondary click, a touch or a pen held still for the long-press duration, Shift+F10 or the ContextMenu key on the
 * element of the area that has focus, or the context-menu command of assistive technology fires `contextrequest` with
 * the point, and the browser's own context menu is cancelled unless you cancel the request. You set `open` to true; the
 * surface opens with a corner on the point (against the focused element for a key), flipping away from the window's
 * edges, and focus returns, when it closes, to the element that had it. The area gets no popup state.
 *
 * A component that holds a menu in its shadow root may forward its own children into it: a `<slot>` child of the menu
 * stands for the elements assigned to it, each forwarded child in a slot of its own (the split button, SPB-15).
 *
 * @tag tanrei-menu
 * @slot - The items: `<tanrei-menu-item>`, `<tanrei-menu-checkbox-item>`, `<tanrei-menu-radio-item>`, `<tanrei-submenu>` and `<tanrei-menu-group>` children.
 * @csspart surface - The floating sheet: its color, corners, elevation and width.
 * @csspart scroll - The padded box inside the surface that scrolls the items.
 * @csspart divider - A line between a group and what is next to it, while the separation is divider.
 * @csspart tile - A group, or a run of items outside any group: a sheet of its own while the separation is gap (MNU-36), a box with no look while it is divider.
 * @fires {CustomEvent<TanreiMenuContextRequestDetail>} contextrequest - With `trigger="context"`: a person asked for the context menu in the area. `detail` is `{ x, y, element, input }` — client coordinates, the element under the pointer or with focus, and `pointer`, `long-press` or `keyboard`. Set `open` to true; cancel it to leave the request to the browser's own context menu.
 * @fires {CustomEvent<TanreiMenuCloseDetail>} close - The menu asks to be closed, every open submenu with it: `detail.reason` is `escape`, `outside`, `tab`, `focus-out` or `item`. Set `open` to false.
 */
export class TanreiMenu extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'menu');
  /** MNU-35, MNU-38: where a browser has no style queries, the choices are read when the menu renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);
  static override styles = [menuStyles, hiddenHost];

  // The menu places each child in a slot of its own, so that a divider or a gap can be drawn between two of them (MNU-23, MNU-36).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    placement: { type: String, reflect: true },
    trigger: { type: String, reflect: true },
    separation: { type: String, reflect: true },
    iconSpace: { type: String, attribute: 'icon-space', reflect: true },
    anchor: { type: String, reflect: true },
    inline: { type: Boolean, reflect: true },
    blocks: { state: true },
  };

  /** Whether the menu is shown. Open it from its anchor; set it to false when the menu fires `close`. */
  open = false;

  /**
   * Where the surface goes against the anchor: below or above it, with its start or end edge aligned to the anchor's.
   * For a context menu opened at a point, which of its corners is on the point (MNU-61).
   */
  placement: TanreiMenuPlacement = 'bottom-start';

  /**
   * What opens the menu (MNU-60). `anchor` (the default): you open it from its anchor, and the surface is placed against
   * the anchor. `context`: the anchor is an area, and a person asks for the menu at a point in it — a secondary click, a
   * long press, Shift+F10 or the ContextMenu key on the element that has focus; the menu fires `contextrequest`, you set
   * `open`, and the surface opens at that point.
   */
  trigger: TanreiMenuTrigger = 'anchor';

  /**
   * How a group is told from what is next to it: `divider` draws a line between them, `gap` leaves empty space and no
   * line. `auto` takes `comp.menu.separation`, the design system's answer (divider in the default system). It applies to
   * the menu and to every submenu of it.
   */
  separation: TanreiMenuSeparation = 'auto';

  /**
   * Whether a row keeps the room of the mark column and of the leading icon column where it draws nothing there, so that
   * the labels of a section — a group, or a run of items outside any group — start on one line (MNU-59). `auto` (the
   * default): while another item of its section draws in that column (a checkbox or radio item its mark, an item its
   * leading icon), so a section without marks or icons draws its labels where the row's content starts. `always`: every
   * row keeps both. `never`: only a row that draws in a column has it. It applies to the menu and to every submenu of it.
   */
  iconSpace: TanreiMenuIconSpace = 'auto';

  /** The id of the anchor element, in the menu's own document or shadow root (as the HTML `anchor` attribute). */
  anchor = '';

  /** For tests and documentation: draws the open surface in place (MNU-19), each open submenu beside its item, without the overlay's behaviour. */
  inline = false;

  /**
   * The element the surface is placed against, when it is not the anchor: a split button places its menu against its
   * whole row and returns focus to, and names the menu by, its trailing half (the anchor, SPB-15). Internal between
   * Tanrei elements.
   * @internal
   */
  positionAnchor: Element | null = null;

  /**
   * Presents the menu without moving focus into it: no move to the first item when it opens (in place of MNU-1) and none
   * to an item under the pointer, which still draws it hovered (in place of MNU-8); a press on an item activates it
   * without focusing it. A split button's menu that is open from hover (SPB-22). Internal between Tanrei elements.
   * @internal
   */
  focusless = false;

  /**
   * The menubar that shows this menu, and what it tells it (MBR-9, MBR-13, MBR-14, MBR-22, MBR-29). Internal between
   * Tanrei elements.
   * @internal
   */
  bar: TanreiMenuBarChannel | null = null;

  /** The menu's children, each in a slot of its own. */
  private blocks: Element[] = [];
  /** MNU-7: the arrow keys and the typeahead of each surface; each remembers what was typed in it. */
  private readonly keys = new WeakMap<Level, RovingKeys>();
  private closeRequested = false;
  private shown = false;
  /** The menu has been presented (in the top layer or in place) since it was last closed: closing it closes its submenus (MNU-49). */
  private live = false;
  private lastLayout = '';
  /** The rows of each surface, read when first asked after a change. */
  private levels: Map<Level, TanreiMenuRowBase[]> | null = null;
  /**
   * The re-read of the items (`sync()`), once per turn however many items said they changed in it: a menu of N items
   * built, or N labels changed at once, re-reads its N items once — not once per item, which made the build O(N²).
   */
  private readonly syncs = new CoalescedSync(() => this.sync());
  /** What reads the items' context in the task it runs in reads it re-read (a key press, a press, focus). */
  private readonly flushSyncs = () => this.syncs.flush();
  private readonly children$ = new MutationObserver(() => this.readChildren());
  private unregister: (() => void) | null = null;
  /** MNU-44: where the pointer is now — the item under it. */
  private pointerItem: TanreiMenuRowBase | null = null;
  /** MNU-44: the submenu item a resting pointer is about to open. */
  private resting: { item: TanreiSubmenu; timer: ReturnType<typeof setTimeout> } | null = null;
  /** MNU-45: the pointer's last position on the item of an open submenu — the corner of the triangle it may move in. */
  private apex: { submenu: TanreiSubmenu; x: number; y: number } | null = null;
  /** MNU-45: the items the pointer crossed on its way, which are not drawn hovered, and the pause that ends the way. */
  private readonly crossed = new Set<TanreiMenuRowBase>();
  private pause: ReturnType<typeof setTimeout> | null = null;
  /** MNU-47: the click of a press that closed a covering submenu activates nothing. */
  private swallowClick = false;
  /** The menu itself is placing focus (MNU-1, MNU-43): that is not the person moving it to another item (MNU-48). */
  private placing = false;
  /**
   * MNU-61: where the last context request was made, since the menu was last closed — a point held in the area's own
   * coordinates, so that it moves with the area, or the element a key was pressed on.
   */
  private asked: { area: Element; dx: number; dy: number } | { element: Element } | null = null;
  /** MNU-62: the element that had focus when the context menu was asked for, which focus returns to. */
  private returnTo: HTMLElement | null = null;
  /** MNU-62: the element that had focus as the last press in the area began. */
  private pressedFrom: HTMLElement | null = null;
  /** MNU-60: a touch or a pen pressed in the area, which a long press makes a request of. */
  private held: { pointerId: number; x: number; y: number; element: Element; timer: ReturnType<typeof setTimeout>; answered: 'menu' | 'platform' | null } | null = null;
  /**
   * MNU-60: a key asked for the menu, and is still down: a context menu event the key makes too is the menu's to cancel.
   * It is over at that event, when the key comes up, or at a press or another key — never on a timer, which the
   * browser may run after later tasks: a separate request (the command of assistive technology) would be swallowed.
   */
  private keyed: (() => void) | null = null;
  /** The document or shadow root whose events a context menu's area is listened in. */
  private listenedRoot: Document | ShadowRoot | null = null;
  /** MNU-63: the element the menu wrote the popup state on, which it takes back from when it no longer opens from it. */
  private ariaWritten: HTMLElement | null = null;

  constructor() {
    super();
    // Before every handler below: an item that changed in this task is read as it is now.
    for (const type of ['keydown', 'keyup', 'pointerdown', 'pointermove', 'mousedown', 'click', 'focusin', 'focusout']) this.addEventListener(type, this.flushSyncs, { capture: true });
    this.addEventListener('keydown', this.onKeyDown, { capture: true });
    this.addEventListener('pointerdown', this.onPointerDown, { capture: true });
    this.addEventListener('click', this.onClickCapture, { capture: true });
    this.addEventListener('click', this.onClick);
    this.addEventListener('pointermove', this.onPointerMove);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('mousedown', this.onMouseDown);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    this.addEventListener('tanrei-menu-item-update', this.syncs.request);
    // Forwarded content (a <slot> child) changed what is assigned to it: the blocks' kinds (dividers) and the items.
    this.addEventListener('slotchange', () => {
      this.requestUpdate();
      this.syncs.request();
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, subtree: true });
    this.readChildren();
    // POP-24: what it was opened from, wherever it stands in the document — a press or focus in a menu opened from a
    // control inside a popover is inside that popover (src/primitives/dismiss.ts). The popover closing takes focus back
    // to its own opener, which closes the menu by its own rule (MNU-5: focus leaving).
    this.unregister = registerOverlay(this, { openers: () => [this.positionAnchor, this.anchorElement], open: () => this.open && !this.inline });
    // MNU-60: the requests are heard where the area is — the menu's own document or shadow root, the anchor being found
    // by its id there — so an area that is added, replaced or given its id later is heard as it is.
    const root = this.getRootNode() as Document | ShadowRoot;
    this.listenedRoot = root;
    root.addEventListener('contextmenu', this.onContextMenu as EventListener);
    root.addEventListener('keydown', this.onContextKey as EventListener);
    root.addEventListener('pointerdown', this.onAreaPress as EventListener);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.unregister?.();
    this.unregister = null;
    this.stopFollowing();
    this.forgetPointer();
    const root = this.listenedRoot;
    root?.removeEventListener('contextmenu', this.onContextMenu as EventListener);
    root?.removeEventListener('keydown', this.onContextKey as EventListener);
    root?.removeEventListener('pointerdown', this.onAreaPress as EventListener);
    this.listenedRoot = null;
    this.letGo();
  }

  private readChildren() {
    const now = [...this.children];
    if (now.length !== this.blocks.length || now.some((child, i) => child !== this.blocks[i])) this.blocks = now;
    this.syncs.request();
  }

  private get surface() {
    return this.renderRoot?.querySelector<HTMLElement>('.surface') ?? null;
  }

  private get scrollBox() {
    return this.renderRoot?.querySelector<HTMLElement>('.scroll') ?? null;
  }

  /** The menu's content: its children, a forwarding `<slot>` child standing for what is assigned to it. */
  private get content(): Element[] {
    return [...this.children].flatMap(resolved);
  }

  /** The elements of the content that match `selector`, in document order, that belong to this menu (not a nested one). */
  private find(selector: string): Element[] {
    // A <slot> child of a submenu stands for what is assigned to it, as one of the menu's does (a folded menu of a
    // menubar forwards its items into the submenu item it draws, MBR-22).
    const forwarded = (el: Element): Element[] =>
      [...(el instanceof TanreiSubmenu ? [el] : []), ...el.querySelectorAll('tanrei-submenu')].flatMap((submenu) => [...submenu.children].filter((child) => child instanceof HTMLSlotElement).flatMap(resolved).flatMap(under));
    const under = (el: Element): Element[] => [...(el.matches(selector) ? [el] : []), ...el.querySelectorAll(selector), ...forwarded(el)];
    return this.content.flatMap(under).filter((el) => this.owns(el));
  }

  /** Whether `node` is this menu's, in the flat tree: slotted or forwarded into it or into a submenu of it, or in a shadow root of theirs. */
  private owns(node: Node | null): boolean {
    for (let at = node; at; at = flatParent(at)) {
      if (at === this) return true;
      if (at instanceof TanreiMenu) return false;
    }
    return false;
  }

  /** The surface `node` is in: the submenu that holds it, through that submenu's groups, or the menu itself (MNU-52). */
  private levelOf(node: Node): Level {
    for (let at = flatParent(node); at && at !== this; at = flatParent(at)) if (at instanceof TanreiSubmenu) return at;
    return this;
  }

  /** Whether `node` is inside the submenu `submenu`: an item of its surface or of a surface opened from it. */
  private within(node: Node | null, submenu: TanreiSubmenu): boolean {
    for (let at = node && node !== submenu ? flatParent(node) : null; at && at !== this; at = flatParent(at)) if (at === submenu) return true;
    return false;
  }

  /** Every row of the tree by its surface, in focus order (MNU-7: never across levels). */
  private tree(): Map<Level, TanreiMenuRowBase[]> {
    if (this.levels) return this.levels;
    const levels = new Map<Level, TanreiMenuRowBase[]>();
    for (const row of this.find(ROWS)) {
      if (!(row instanceof TanreiMenuRowBase)) continue;
      const level = this.levelOf(row);
      const rows = levels.get(level);
      if (rows) rows.push(row);
      else levels.set(level, [row]);
    }
    return (this.levels = levels);
  }

  /** The rows of one surface. */
  private rowsOf(level: Level): TanreiMenuRowBase[] {
    return this.tree().get(level) ?? [];
  }

  /** The submenus of `level` whose surface is drawn now — at most one (MNU-48). */
  private openIn(level: Level): TanreiSubmenu[] {
    return this.rowsOf(level).filter((row): row is TanreiSubmenu => row instanceof TanreiSubmenu && row.presentation !== 'hidden');
  }

  /** The chain of open submenus, from the menu's own surface inward. */
  private openChain(from: Level = this): TanreiSubmenu[] {
    const chain: TanreiSubmenu[] = [];
    for (let next = this.openIn(from)[0]; next; next = this.openIn(next)[0]) chain.push(next);
    return chain;
  }

  private get groups(): TanreiMenuGroup[] {
    return this.find('tanrei-menu-group').filter((el): el is TanreiMenuGroup => el instanceof TanreiMenuGroup);
  }

  /** The element whose id is `anchor`. */
  private get anchorElement(): HTMLElement | null {
    if (!this.anchor) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return (root.getElementById?.(this.anchor) as HTMLElement | null) ?? null;
  }

  /** Where the anchor's ARIA states go: the anchor, or the button a custom element anchor draws in its open shadow root. */
  private get anchorTarget(): HTMLElement | null {
    const anchor = this.anchorElement;
    return anchor?.shadowRoot?.querySelector<HTMLElement>('button, [role="button"]') ?? anchor;
  }

  /** MNU-14: a placement the menu does not define is drawn as `bottom-start`. */
  private get effectivePlacement(): TanreiMenuPlacement {
    return PLACEMENTS.includes(this.placement) ? this.placement : 'bottom-start';
  }

  /**
   * The outermost group of the item's own surface that holds `item` (MNU-29: a group in a group is drawn as its outer
   * group; MNU-52: a group's value reaches only the radio items of its own surface).
   */
  private groupOf(item: Element): TanreiMenuGroup | null {
    let group: TanreiMenuGroup | null = null;
    for (let at = flatParent(item); at && at !== this && !(at instanceof TanreiSubmenu); at = flatParent(at)) if (at instanceof TanreiMenuGroup) group = at;
    return group;
  }

  /**
   * Where an event came from: the item it is on, and the surface it is in — a submenu's surface around its items is
   * that submenu's level, its row an item of the level that holds it.
   */
  private locate(event: Event): { item: TanreiMenuRowBase | null; level: Level | null } {
    const path = event.composedPath();
    for (let i = 0; i < path.length; i += 1) {
      const node = path[i];
      if (node === this) return { item: null, level: this };
      if (!(node instanceof TanreiMenuRowBase) || !this.owns(node)) continue;
      if (node instanceof TanreiSubmenu && node.surfaceElement && path.lastIndexOf(node.surfaceElement, i) >= 0) return { item: null, level: node };
      return { item: node, level: this.levelOf(node) };
    }
    return { item: null, level: null };
  }

  /** The item an event came from. */
  private itemOf(event: Event): TanreiMenuRowBase | null {
    return this.locate(event).item;
  }

  /**
   * Tells every item and group what it is now (MNU-18, MNU-19, MNU-24, MNU-28, MNU-29, MNU-52), each surface by itself,
   * reports what it should, and draws the submenus that are open (MNU-43, MNU-48).
   */
  private sync() {
    countWork('menu.sync');
    this.levels = null;
    const tree = this.tree();
    for (const group of this.groups) {
      let nested = false;
      for (let at = flatParent(group); at && at !== this && !(at instanceof TanreiSubmenu); at = flatParent(at)) if (at instanceof TanreiMenuGroup) nested = true;
      if (nested) report(this, 'MNU-29', `the group "${group.label}" is inside another group; its items are drawn as the outer group's, without its title or a divider`);
      group.setMenuContext({ nested });
    }
    // MNU-31: the form the shortcuts are drawn in, as the cascade gives it now — never cached, so a system switch is seen
    // the next time the menu opens or changes.
    // Read for the first row there is: a menu without rows (the overflow menu of a breadcrumb trail that fits, drawn
    // with every trail of a page) asks the cascade nothing.
    let variant: string | null = null;
    const shortcut = () => (variant ??= getComputedStyle(this).getPropertyValue(SHORTCUT_VARIANT).trim() || DEFAULT_SHORTCUT_VARIANT);
    // MNU-59: an unknown value is auto.
    const space: TanreiMenuIconSpace = ICON_SPACES.includes(this.iconSpace) ? this.iconSpace : 'auto';
    const marks = (row: TanreiMenuRowBase) => row instanceof TanreiMenuCheckboxItem || row instanceof TanreiMenuRadioItem;
    for (const [level, rows] of tree) {
      // MNU-59: the mark and leading icon columns are decided for each section of the surface — a group (its outermost,
      // MNU-29), or a run of adjacent rows outside any group: the tiles of MNU-36 — each column by itself.
      const sections: TanreiMenuRowBase[][] = [];
      const sectionOf = new Map<TanreiMenuRowBase, TanreiMenuRowBase[]>();
      let previous: TanreiMenuGroup | null | undefined;
      for (const row of rows) {
        const group = this.groupOf(row);
        if (!sections.length || group !== previous) sections.push([]);
        previous = group;
        const section = sections[sections.length - 1];
        section.push(row);
        sectionOf.set(row, section);
      }
      const columns = new Map<TanreiMenuRowBase[], { mark: boolean; icon: boolean }>();
      for (const section of sections) {
        columns.set(section, {
          mark: space === 'always' || (space === 'auto' && section.some(marks)),
          icon: space === 'always' || (space === 'auto' && section.some((row) => !!row.leadingIcon)),
        });
      }
      // MNU-55: a link item's mark reserves the column as a trailing icon does.
      const trailingIconColumn = rows.some((row) => row instanceof TanreiSubmenu || (row instanceof TanreiMenuItemBase && !!row.trailingIcon) || row.linkMarked);
      // MNU-29: which radio items each group checks, and what a debug build reports about them.
      const radios = new Map<TanreiMenuGroup | null, TanreiMenuRadioItem[]>();
      for (const row of rows) {
        if (!(row instanceof TanreiMenuRadioItem)) continue;
        const group = this.groupOf(row);
        const members = radios.get(group);
        if (members) members.push(row);
        else radios.set(group, [row]);
      }
      for (const [group, members] of radios) {
        if (!group) {
          for (const radio of members) report(this, 'MNU-29', `the radio item "${radio.label}" is not inside a group, so it is never checked`);
          continue;
        }
        const values = members.map((radio) => radio.value);
        if (group.value !== null && group.value !== undefined && !values.includes(group.value)) report(this, 'MNU-29', `the group "${group.label}" has the value "${group.value}", which none of its radio items has`);
        for (const value of new Set(values)) if (values.filter((each) => each === value).length > 1) report(this, 'MNU-29', `two radio items of the group "${group.label}" share the value "${value}"`);
      }
      rows.forEach((row, index) => {
        const group = this.groupOf(row);
        const radioChecked = row instanceof TanreiMenuRadioItem && !!group && group.value !== null && group.value !== undefined && group.value === row.value;
        // The row's own mark or icon is always drawn in its column (renderRow); the section decides the others' room.
        const { mark: markColumn, icon: iconColumn } = columns.get(sectionOf.get(row)!)!;
        row.setMenuContext({ position: index + 1, size: rows.length, markColumn, iconColumn, trailingIconColumn, radioChecked, shortcutVariant: shortcut(), groupMarkIcon: group?.markIcon ?? '' });
        row.syncMark();
      });
      if (level instanceof TanreiSubmenu) syncSeparation(level, level.scrollElement);
    }
    // MNU-52: what a debug build says about the submenus — a third level, and one that holds no item.
    for (const submenu of this.find('tanrei-submenu')) {
      if (!(submenu instanceof TanreiSubmenu)) continue;
      let depth = 1;
      for (let level = this.levelOf(submenu); level instanceof TanreiSubmenu; level = this.levelOf(level)) depth += 1;
      // MBR-22: the level a menubar's overflow item adds is not the product's, and an empty menu of the bar is the bar's to report (MBR-20).
      const fold = !!this.bar?.fold;
      if (fold) depth -= 1;
      if (fold && depth === 0) {
        if (!tree.get(submenu)?.length) syncSeparation(submenu, submenu.scrollElement);
        continue;
      }
      if (depth > 2) report(this, 'MNU-52', `the submenu "${submenu.label}" is ${depth} levels below the menu; keep to one level of submenus where possible and never more than two — a set that needs more belongs in a dialog, a sheet or a page`);
      if (!tree.get(submenu)?.length) {
        report(this, 'MNU-52', `the submenu "${submenu.label}" holds no item, so it opens nothing; give it items or remove it`);
        syncSeparation(submenu, submenu.scrollElement);
      }
    }
    syncSeparation(this, this.scrollBox);
    this.presentSubmenus();
  }

  // ── Submenus (MNU-42 … MNU-52) ──

  /** Sets a submenu item's `open`; the person's own opening or closing fires its `toggle`, the product's and the menu's closing none. */
  private setOpen(submenu: TanreiSubmenu, open: boolean, person: boolean) {
    if (submenu.open === open) return;
    submenu.open = open;
    submenu.openedAt = open ? ++opened : 0;
    if (person) submenu.dispatchEvent(new CustomEvent<TanreiSubmenuToggleDetail>('toggle', { bubbles: true, detail: { open } }));
  }

  /**
   * Draws what the items' `open` say (MNU-43, MNU-48, MNU-52): in each surface that is shown, the submenu that is open —
   * the one opened last, where the product opened two — unless it is disabled or holds no item; nothing for a submenu
   * whose own surface is not shown. A submenu that is drawn is placed and grows in; one that no longer is fades out, and
   * focus that was inside it moves to its item.
   */
  private presentSubmenus() {
    const tree = this.tree();
    const mode: Presentation = !this.open ? 'hidden' : this.inline ? 'inline' : this.shown ? 'overlay' : 'hidden';
    const walk = (level: Level, at: Presentation) => {
      const submenus = (tree.get(level) ?? []).filter((row): row is TanreiSubmenu => row instanceof TanreiSubmenu);
      let keep: TanreiSubmenu | null = null;
      if (at !== 'hidden') {
        for (const submenu of submenus) {
          if (!submenu.open || !tree.get(submenu)?.length) continue;
          if (submenu.disabled) {
            // MNU-51: a disabled submenu item's submenu is closed; one that was open says so.
            this.setOpen(submenu, false, submenu.presentation !== 'hidden');
            continue;
          }
          if (!keep || submenu.openedAt > keep.openedAt) keep = submenu;
        }
        // MNU-48: at most one submenu open in each surface.
        for (const submenu of submenus) if (submenu !== keep && submenu.open && !!tree.get(submenu)?.length) this.setOpen(submenu, false, false);
      }
      for (const submenu of submenus) {
        const own: Presentation = submenu === keep ? at : 'hidden';
        // MNU-48: focus that was inside a submenu that closes alone moves to its item.
        if (own === 'hidden' && submenu.presentation !== 'hidden' && at !== 'hidden' && this.within(deepActive(), submenu)) submenu.focusFromPointer();
        const changed = submenu.present(own, !!this.bar?.quick);
        if (own === 'overlay' && changed) {
          this.placeSubmenu(submenu);
          // MOT-4: a submenu written open in a menu the page's markup opens is there at once, before the first paint.
          if (!this.bar?.quick && documentPainted()) submenu.enter();
          this.following.request();
        }
        walk(submenu, own);
      }
      // MNU-19's verify: an inline surface lets the submenu drawn beside it show outside its own box.
      this.surfaceOf(level)?.classList.toggle('cascading', at === 'inline' && !!keep);
    };
    walk(this, mode);
  }

  private surfaceOf(level: Level): HTMLElement | null {
    return level === this ? this.surface : (level as TanreiSubmenu).surfaceElement;
  }

  private scrollOf(level: Level): HTMLElement | null {
    return level === this ? this.scrollBox : (level as TanreiSubmenu).scrollElement;
  }

  /**
   * MNU-43: opens a submenu item's submenu — any other of its surface closes — and, for a key, a press or a tap, moves
   * focus to its first enabled item (its first item where none is enabled), with the ring only for a key. One that is
   * already open only takes focus. A disabled submenu item and one without items open nothing (MNU-51, MNU-52).
   */
  private openSubmenu(submenu: TanreiSubmenu, focus: FocusReturn) {
    const rows = this.rowsOf(submenu);
    if (submenu.disabled || rows.length === 0) return;
    for (const other of this.openIn(this.levelOf(submenu))) if (other !== submenu) this.closeSubmenu(other, true, 'stay');
    this.setOpen(submenu, true, true);
    this.presentSubmenus();
    if (focus === 'stay') return;
    const first = rows.find((row) => !row.disabled) ?? rows[0];
    this.placeFocus(() => (focus === 'key' ? first.focus() : first.focusFromPointer()));
  }

  /** Moves focus as the menu's own doing (MNU-1, MNU-43), which closes no submenu of the surface focus lands in. */
  private placeFocus(move: () => void) {
    this.placing = true;
    try {
      move();
    } finally {
      this.placing = false;
    }
  }

  /**
   * MNU-48: closes a submenu and every submenu opened from it, and nothing else; focus returns to its item — always for
   * a key (with the ring) or a press (without), and otherwise when it was inside.
   */
  private closeSubmenu(submenu: TanreiSubmenu, person: boolean, focus: FocusReturn) {
    if (this.apex?.submenu === submenu) this.endAim();
    if (focus === 'key') submenu.focus();
    else if (focus === 'pointer' || this.within(deepActive(), submenu)) {
      // Focus the pointer moved back draws no ring, even where it was a keyboard's before.
      if (submenu.matches(':focus')) submenu.blur();
      submenu.focusFromPointer();
    }
    for (const each of [...this.openChain(submenu)].reverse()) this.setOpen(each, false, person);
    this.setOpen(submenu, false, person);
    this.presentSubmenus();
  }

  /** MNU-46, MNU-47: places a submenu's surface against its item, in viewport coordinates. */
  private placeSubmenu(submenu: TanreiSubmenu) {
    const own = submenu.surfaceElement;
    const row = submenu.rowElement;
    const level = this.levelOf(submenu);
    const parent = this.surfaceOf(level);
    if (!own || !row || !parent || submenu.presentation !== 'overlay') return;
    // The lengths are read through real properties (a custom property holds an expression).
    const style = getComputedStyle(own);
    const offset = Number.parseFloat(style.scrollMarginBlockStart) || 0;
    const margin = Number.parseFloat(style.scrollMarginBlockEnd) || 0;
    const touch = Number.parseFloat(style.scrollMarginInlineStart) || 0;
    const minWidth = Number.parseFloat(style.scrollMarginInlineEnd) || 0;
    // The height is measured as the surface stands, never by lifting the cap (MNU-2's place() says why): uncapped, the
    // list would not scroll, and a scrolled submenu placed again — its item moving, the window resizing — would be sent
    // back to its top. Its width is measured free of the narrowing a last placement gave it: wider, its items may take
    // fewer lines and the list be shorter than its offset for a moment, so the offset is put back once it is placed.
    const scroll = submenu.scrollElement;
    const scrolled = scroll?.scrollTop ?? 0;
    own.style.inlineSize = '';
    const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    const rtl = getComputedStyle(submenu).direction === 'rtl';
    // MNU-46: a submenu opened from a surface placed on the other side tries that side first.
    const prefer = level instanceof TanreiSubmenu ? level.side : null;
    const first = this.rowsOf(submenu)[0];
    const input = { parent: parent.getBoundingClientRect(), row: row.getBoundingClientRect(), viewport, offset, margin, minWidth, touch, rtl, prefer };
    const lead = () => (first ? first.getBoundingClientRect().top - own.getBoundingClientRect().top + (submenu.scrollElement?.scrollTop ?? 0) : 0);
    // The surface's size as laid out, fractional (layoutSize): a snapped width would end it up to a pixel off its edge.
    const free = layoutSize(own).width;
    let at = placeSubmenu({ ...input, surface: { width: free, height: naturalHeight(own, scroll) }, lead: lead() });
    if (at.width < free) {
      // Narrowed, its items wrap: it is placed again at the height that gives.
      own.style.inlineSize = `${at.width}px`;
      at = placeSubmenu({ ...input, surface: { width: layoutSize(own).width, height: naturalHeight(own, scroll) }, lead: lead() });
    }
    own.style.top = `${at.top}px`;
    own.style.left = `${at.left}px`;
    own.style.maxBlockSize = `${at.maxHeight}px`;
    if (scroll && scroll.scrollTop !== scrolled) scroll.scrollTop = scrolled;
    own.classList.toggle('side-left', at.side === 'left');
    submenu.side = at.side;
    submenu.overlap = at.overlap;
  }

  /** MNU-44: `comp.menu.motion.submenu-delay`, read through a real property of the menu's (a duration token is an expression). */
  private get submenuDelay(): number {
    const scroll = this.scrollBox;
    return scroll ? (Number.parseFloat(getComputedStyle(scroll).transitionDelay) || 0) * 1000 : 0;
  }

  /** MNU-45: the pointer is no longer on its way to a submenu — the items it crossed answer hover again. */
  private endAim() {
    if (this.pause !== null) clearTimeout(this.pause);
    this.pause = null;
    this.apex = null;
    for (const item of this.crossed) item.suppressHover(false);
    this.crossed.clear();
  }

  private stopResting() {
    if (this.resting) clearTimeout(this.resting.timer);
    this.resting = null;
  }

  private forgetPointer() {
    this.stopResting();
    this.endAim();
    this.pointerItem = null;
    this.swallowClick = false;
  }

  /**
   * MNU-8, MNU-44, MNU-48: the pointer is on `item` — focus follows it without the ring, another submenu of its surface
   * closes, and a submenu item it rests on for `submenu-delay` opens, focus staying on the item.
   */
  private hover(item: TanreiMenuRowBase) {
    if (!this.focusless) item.focusFromPointer();
    for (const other of this.openIn(this.levelOf(item))) if (other !== item) this.closeSubmenu(other, true, 'stay');
    if (!(item instanceof TanreiSubmenu) || item.disabled || item.presentation !== 'hidden') {
      this.stopResting();
      return;
    }
    if (this.resting?.item === item) return;
    this.stopResting();
    const timer = setTimeout(() => {
      this.resting = null;
      if (this.open && this.pointerItem === item) this.openSubmenu(item, 'stay');
    }, this.submenuDelay);
    this.resting = { item, timer };
  }

  /** MNU-5: asks the product to close the menu, once, with the reason. Nothing is asked of a closed menu. */
  private requestClose(reason: TanreiMenuCloseReason) {
    if (!this.open || this.closeRequested) return;
    this.closeRequested = true;
    this.dispatchEvent(new CustomEvent<TanreiMenuCloseDetail>('close', { detail: { reason } }));
  }

  /**
   * MNU-5, MNU-7, MNU-43, MNU-48, MNU-51: Escape closes the innermost level — the submenu that holds focus, else the
   * innermost open one, else the menu — and Tab the whole menu; the arrow keys along the line open a submenu item's
   * submenu and close the submenu that holds focus, and do nothing else; the vertical arrows, Home, End and typeahead
   * move focus within the surface that holds it, wrapping.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.open) return;
    const { item, level } = this.locate(event);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      const submenu = level instanceof TanreiSubmenu ? level : this.openChain().at(-1);
      if (submenu) this.closeSubmenu(submenu, true, 'key');
      else this.requestClose('escape');
      return;
    }
    if (event.key === 'Tab') {
      // Focus goes to the anchor first, so that the Tab's own move goes on from there, as it would have from the anchor.
      this.requestClose('tab');
      if (!this.inline) this.focusReturn?.focus();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (!item || !level || !item.isTargetOf(event)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      // MNU-51: the key is the menu's whatever it does — it never scrolls or acts on what is behind.
      event.preventDefault();
      event.stopPropagation();
      const towardsEnd = (event.key === 'ArrowRight') !== (getComputedStyle(item).direction === 'rtl');
      if (towardsEnd) {
        if (item instanceof TanreiSubmenu) this.openSubmenu(item, 'key');
        else this.bar?.inlineKey(true);
      } else if (level instanceof TanreiSubmenu) this.closeSubmenu(level, true, 'key');
      else this.bar?.inlineKey(false);
      return;
    }
    const rows = this.rowsOf(level);
    const current = rows.indexOf(item);
    let keys = this.keys.get(level);
    if (!keys) this.keys.set(level, (keys = new RovingKeys({ wrap: true })));
    const target = keys.target(
      event.key,
      current,
      rows.map((each) => ({ focusable: true, label: each.label })),
    );
    if (target === null) return;
    event.preventDefault();
    event.stopPropagation();
    if (target !== current) rows[target].focus();
  };

  /**
   * MNU-47: while a submenu covers part of the surface it opened from, a press on what is left of that surface closes
   * the submenu — the way back for a person with no keyboard — and activates nothing.
   */
  private readonly onPointerDown = (event: PointerEvent) => {
    this.swallowClick = false;
    if (!this.open) return;
    const { level } = this.locate(event);
    const covering = level ? this.openIn(level).find((submenu) => submenu.overlap) : undefined;
    if (!covering) return;
    event.preventDefault();
    event.stopPropagation();
    this.swallowClick = true;
    // The click of this press follows its pointerup at once; a press that ends elsewhere has none to swallow.
    const settle = () => setTimeout(() => (this.swallowClick = false));
    window.addEventListener('pointerup', settle, { once: true, capture: true });
    window.addEventListener('pointercancel', settle, { once: true, capture: true });
    this.closeSubmenu(covering, true, 'pointer');
  };

  private readonly onClickCapture = (event: MouseEvent) => {
    if (!this.swallowClick) return;
    this.swallowClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  /**
   * MNU-6, MNU-43: an item's activation — its click — does what its kind does, then asks to close (a Space keeps a
   * checkbox or radio item's menu open); a submenu item's opens its submenu and closes nothing.
   */
  private readonly onClick = (event: MouseEvent) => {
    const item = this.itemOf(event);
    // A disabled item swallows its clicks before they get here (MNU-9).
    if (!item || item.disabled) return;
    const via = item.activation;
    if (item instanceof TanreiSubmenu) {
      this.stopResting();
      this.openSubmenu(item, this.focusless ? 'stay' : via === 'pointer' ? 'pointer' : 'key');
      return;
    }
    if (item instanceof TanreiMenuCheckboxItem) {
      item.checked = !item.checked;
      item.dispatchEvent(new CustomEvent<TanreiMenuCheckboxItemChangeDetail>('change', { bubbles: true, detail: { checked: item.checked } }));
    } else if (item instanceof TanreiMenuRadioItem) {
      const group = this.groupOf(item);
      // A radio item that is already checked emits no change.
      if (group && group.value !== item.value) {
        group.value = item.value;
        this.syncs.now();
        group.dispatchEvent(new CustomEvent<TanreiMenuGroupChangeDetail>('change', { bubbles: true, detail: { value: group.value } }));
      }
    }
    // MNU-54: a link item's click that the browser opens elsewhere — a modifier key, another button — is not an
    // activation of the menu's: nothing is prevented, no close is asked and the menu stays open, focus where it was.
    if (item instanceof TanreiMenuItem && item.isLink && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    if (item instanceof TanreiMenuItem || via !== 'space') this.requestClose('item');
  };

  /**
   * MNU-8, MNU-44, MNU-45: a pointer moving onto an item moves focus there, without the ring, so that the arrow keys
   * continue from it — except while it is on its way to an open submenu: inside the triangle between its last position
   * on the submenu's item and the two corners of the submenu's surface that face the item, the items it crosses take
   * neither hover nor focus, until it leaves the triangle or pauses in it for `submenu-delay`.
   */
  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.open || event.pointerType === 'touch') return;
    const { item, level } = this.locate(event);
    this.pointerItem = item;
    const aimed = level ? this.openIn(level)[0] : undefined;
    if (aimed && item === aimed) {
      // The triangle is taken anew each time the pointer leaves the submenu's item: from where it was last on it.
      this.endAim();
      this.apex = { submenu: aimed, x: event.clientX, y: event.clientY };
    } else if (aimed && this.apex?.submenu === aimed && this.#onTheWay(event, aimed)) {
      if (item) {
        item.suppressHover(true);
        this.crossed.add(item);
      }
      this.stopResting();
      if (this.pause !== null) clearTimeout(this.pause);
      this.pause = setTimeout(() => {
        this.endAim();
        if (this.open && this.pointerItem) this.hover(this.pointerItem);
      }, this.submenuDelay);
      return;
    } else if (this.apex) this.endAim();
    if (item) this.hover(item);
    else this.stopResting();
  };

  /** MNU-45: whether the pointer is inside the triangle to `submenu`'s surface, which follows the side it is placed on. */
  #onTheWay(event: PointerEvent, submenu: TanreiSubmenu): boolean {
    const surface = submenu.surfaceElement;
    const row = submenu.rowElement;
    if (!surface || !row || !this.apex) return false;
    const box = surface.getBoundingClientRect();
    // The side that faces the item: the nearer edge of the submenu's surface, wherever it was placed (or drawn in place).
    const at = row.getBoundingClientRect();
    const near = Math.abs(box.left - (at.left + at.width / 2)) <= Math.abs(box.right - (at.left + at.width / 2)) ? box.left : box.right;
    const facing = submenu.presentation === 'overlay' ? (submenu.overlap ? near : submenu.side === 'right' ? box.left : box.right) : near;
    return inTriangle({ x: event.clientX, y: event.clientY }, this.apex, { x: facing, y: box.top }, { x: facing, y: box.bottom });
  }

  /** MNU-44: a pointer that leaves the menu opens nothing; where it was on its way to a submenu its pause still ends the way. */
  private readonly onPointerLeave = () => {
    this.pointerItem = null;
    this.stopResting();
  };

  /** A focusless menu (SPB-22): a press on an item leaves focus where it was; the item's click still activates it. */
  private readonly onMouseDown = (event: MouseEvent) => {
    if (this.open && this.focusless && this.itemOf(event)) event.preventDefault();
  };

  /**
   * MNU-1's move, when a focusless menu becomes an ordinary one while open (SPB-24): focus to the first enabled item.
   * @internal
   */
  focusFirstItem() {
    this.syncs.flush();
    const items = this.rowsOf(this);
    // MBR-9: a menubar's menu opened with Up Arrow takes focus on its last enabled item, and one opened by a pointer without the ring.
    const { end, quiet } = this.bar?.entry ?? { end: 'first', quiet: false };
    const item = end === 'last' ? ([...items].reverse().find((each) => !each.disabled) ?? items.at(-1)) : (items.find((each) => !each.disabled) ?? items[0]);
    this.placeFocus(() => (quiet ? item?.focusFromPointer() : item?.focus()));
  }

  /**
   * MNU-48: focus moving to another item of a surface (MNU-7, and whatever else moves it there) closes the submenu
   * that is open in it — not the focus the menu places itself when it opens or opens a submenu.
   */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (!this.open || this.placing) return;
    const { item, level } = this.locate(event);
    if (!item || !level || !item.isTargetOf(event)) return;
    for (const other of this.openIn(level)) if (other !== item) this.closeSubmenu(other, true, 'stay');
  };

  /** MNU-5, MNU-49: focus moving out of the menu and all of its submenus — anywhere but the anchor, whose own press decides — asks to close. */
  private readonly onFocusOut = (event: FocusEvent) => {
    if (!this.open || this.inline) return;
    const to = event.relatedTarget as Node | null;
    if (!to || this.owns(to)) return;
    // MNU-62: the area of a context menu is outside it.
    const anchor = this.isContext ? null : this.anchorElement;
    if (anchor && (anchor === to || anchor.contains(to))) return;
    // MBR-14: focus that stays in the menubar has not left it.
    for (let at: Node | null = this.bar ? to : null; at; at = flatParent(at)) if (at === this.bar?.ground) return;
    this.requestClose('focus-out');
  };

  /** MNU-5, MNU-49: a press outside every surface and the anchor asks to close; the press also reaches what is under it. */
  private readonly onOutsidePress = (event: PointerEvent) => {
    const path = event.composedPath();
    if (path.includes(this)) return;
    // MNU-62: a press in the area of a context menu is a press outside; a secondary one then asks for it again.
    const anchor = this.isContext ? null : this.anchorElement;
    if (anchor && path.includes(anchor)) return;
    // MBR-14: a press on the menubar is the bar's to answer.
    if (this.bar && path.includes(this.bar.ground)) return;
    this.requestClose('outside');
  };

  // ── The context menu (MNU-60 … MNU-63) ──

  /** MNU-60: a context menu — an unknown trigger is `anchor`. */
  private get isContext(): boolean {
    return this.trigger === 'context';
  }

  /**
   * MNU-60: the area, when an event of `path` is a request made in it: the anchor while the menu is a context menu,
   * never from inside the menu's own surfaces.
   */
  private areaOf(path: EventTarget[]): HTMLElement | null {
    if (!this.isContext || this.inline || path.includes(this)) return null;
    const area = this.anchorElement;
    return area && path.includes(area) ? area : null;
  }

  /**
   * MNU-60: asks the product to open the menu at the point, about the element; true unless the product cancelled. The
   * point is held in the area's own coordinates (a key's request holds its element), and the element that has focus is
   * where focus returns to (MNU-62). A menu that is open already is placed again at the new point.
   */
  private request(area: HTMLElement, x: number, y: number, element: Element, input: TanreiMenuContextInput): boolean {
    const detail: TanreiMenuContextRequestDetail = { x, y, element, input };
    if (!this.dispatchEvent(new CustomEvent<TanreiMenuContextRequestDetail>('contextrequest', { cancelable: true, detail }))) return false;
    const box = area.getBoundingClientRect();
    this.asked = input === 'keyboard' ? { element } : { area, dx: x - box.x, dy: y - box.y };
    // A press that took focus away to nothing (WebKit blurs the focused element on a press that focuses none) did not
    // move it: the element that had it before the press is the one it returns to.
    const active = deepActive();
    const had = active instanceof HTMLElement && active !== document.body ? active : this.pressedFrom;
    if (!this.owns(had)) this.returnTo = had?.isConnected ? had : null;
    this.pressedFrom = null;
    if (this.open && this.shown) {
      this.lastLayout = '';
      this.place();
    }
    return true;
  }

  /**
   * MNU-60: a secondary click, Android's long press, the context-menu command of assistive technology — and the event a
   * key makes after its own request, which is cancelled with nothing asked. One an element inside took is left to it;
   * one the product's request was cancelled for is left to the browser.
   */
  private readonly onContextMenu = (event: MouseEvent) => {
    if (this.keyed) {
      event.preventDefault();
      this.keyed();
      return;
    }
    if (event.defaultPrevented) return;
    const held = this.held;
    if (held?.answered) {
      if (held.answered === 'menu') event.preventDefault();
      return;
    }
    const path = event.composedPath();
    const area = this.areaOf(path);
    if (!area) return;
    const type = (event as PointerEvent).pointerType;
    const input: TanreiMenuContextInput = held || type === 'touch' || type === 'pen' ? 'long-press' : 'pointer';
    if (held) clearTimeout(held.timer);
    const asked = this.request(area, event.clientX, event.clientY, (path[0] as Element) ?? area, input);
    if (held) held.answered = asked ? 'menu' : 'platform';
    if (!asked) return;
    event.preventDefault();
    if (input === 'long-press') swallowRelease();
  };

  /**
   * MNU-60: Shift+F10 or the ContextMenu key, with no other modifier, on the area or an element inside it asks for the
   * menu against that element; the key's own context menu event is the menu's to cancel — on Windows the ContextMenu
   * key makes it as the key comes up.
   */
  private readonly onContextKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat) return;
    const other = event.ctrlKey || event.altKey || event.metaKey;
    const menuKey = event.key === 'ContextMenu' && !other && !event.shiftKey;
    const shiftF10 = event.key === 'F10' && event.shiftKey && !other;
    if (!menuKey && !shiftF10) return;
    const path = event.composedPath();
    const area = this.areaOf(path);
    if (!area) return;
    const element = (path[0] as Element) ?? area;
    const box = element.getBoundingClientRect();
    const rtl = getComputedStyle(element).direction === 'rtl';
    if (!this.request(area, rtl ? box.right : box.left, box.bottom, element, 'keyboard')) return;
    event.preventDefault();
    this.keyed?.();
    const key = event.key;
    // The context menu event a key makes is the default of its keydown, or on Windows of its keyup: both are
    // cancelled, so that none is made — one an engine makes all the same comes while the key is down.
    const up = (next: KeyboardEvent) => {
      if (next.key !== key) return;
      next.preventDefault();
      over();
    };
    // Another key is a new act; the key's own repeats are not.
    const down = (next: KeyboardEvent) => {
      if (next !== event && !(next.repeat && next.key === key)) over();
    };
    const over = () => {
      window.removeEventListener('keyup', up, true);
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('pointerdown', over, true);
      if (this.keyed === over) this.keyed = null;
    };
    this.keyed = over;
    window.addEventListener('keyup', up, true);
    window.addEventListener('keydown', down, true);
    // A pointer is a new request, whatever became of the key's.
    window.addEventListener('pointerdown', over, true);
  };

  /**
   * MNU-60: a touch or a pen pressed in the area asks for the menu once it has been held within the touch slop for the
   * long-press duration — WebKit on iOS makes no context menu event of it — unless the browser's own event comes first.
   */
  private readonly onAreaPress = (event: PointerEvent) => {
    const path = event.composedPath();
    const area = this.areaOf(path);
    if (!area) return;
    // MNU-62: what had focus as the press began, before the press moved it.
    const active = deepActive();
    this.pressedFrom = active instanceof HTMLElement && active !== document.body ? active : null;
    if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return;
    this.letGo();
    const held: NonNullable<TanreiMenu['held']> = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      element: (path[0] as Element) ?? area,
      answered: null,
      timer: setTimeout(() => {
        if (this.held !== held || held.answered) return;
        const asked = this.request(area, held.x, held.y, held.element, 'long-press');
        held.answered = asked ? 'menu' : 'platform';
        if (asked) swallowRelease();
      }, LONG_PRESS),
    };
    this.held = held;
    window.addEventListener('pointermove', this.onHeldMove, true);
    window.addEventListener('pointerup', this.onHeldEnd, true);
    window.addEventListener('pointercancel', this.onHeldEnd, true);
  };

  /** MNU-60: a touch that moves past the slop before it is answered is a scroll or a drag, and asks for nothing. */
  private readonly onHeldMove = (event: PointerEvent) => {
    const held = this.held;
    if (!held || event.pointerId !== held.pointerId || held.answered) return;
    if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > TOUCH_SLOP) this.letGo();
  };

  private readonly onHeldEnd = (event: PointerEvent) => {
    if (this.held && event.pointerId === this.held.pointerId) this.letGo();
  };

  /** Forgets a touch held in the area. */
  private letGo() {
    if (this.held) clearTimeout(this.held.timer);
    this.held = null;
    window.removeEventListener('pointermove', this.onHeldMove, true);
    window.removeEventListener('pointerup', this.onHeldEnd, true);
    window.removeEventListener('pointercancel', this.onHeldEnd, true);
  }

  /** MNU-62: where focus returns when the menu closes — the anchor, or for a context menu the element that had focus. */
  private get focusReturn(): HTMLElement | null {
    if (!this.isContext) return this.anchorElement;
    return this.returnTo?.isConnected ? this.returnTo : null;
  }

  /**
   * MNU-2, MNU-61: what the surface is placed against — the anchor; for a context menu the point it was asked for at,
   * which moves with its area, or the element a key asked about, and the area itself where nothing was asked.
   */
  private placedAgainst(): { box: MenuBox; point: boolean } | null {
    const asked = this.isContext ? this.asked : null;
    if (asked && 'element' in asked) return { box: asked.element.getBoundingClientRect(), point: false };
    if (asked) {
      const area = asked.area.getBoundingClientRect();
      return { box: { x: area.x + asked.dx, y: area.y + asked.dy, width: 0, height: 0 }, point: true };
    }
    const anchor = this.positionAnchor ?? this.anchorElement;
    return anchor ? { box: anchor.getBoundingClientRect(), point: false } : null;
  }

  /** The element whose moves move the surface (FollowController). */
  private get followedElement(): Element | null {
    const asked = this.isContext ? this.asked : null;
    if (asked) return 'element' in asked ? asked.element : asked.area;
    return this.positionAnchor ?? this.anchorElement;
  }

  /** MNU-2, MNU-61: places the surface against the anchor, or at the point a context menu was asked for, in viewport coordinates. */
  private place() {
    const surface = this.surface;
    const scroll = this.scrollBox;
    if (!surface || !scroll || this.inline || !this.shown) return;
    const style = getComputedStyle(surface);
    const offset = Number.parseFloat(style.scrollMarginBlockStart) || 0;
    const margin = Number.parseFloat(style.scrollMarginBlockEnd) || 0;
    // The surface's size as laid out, fractional and untouched by the enter motion's scale (layoutSize): a snapped
    // one would put an end-aligned or top-side surface up to a pixel off its anchor.
    const size = { width: layoutSize(surface).width, height: naturalHeight(surface, scroll) };
    const against = this.placedAgainst() ?? { box: { x: margin, y: margin, width: 0, height: 0 }, point: false };
    const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
    const rtl = getComputedStyle(this).direction === 'rtl';
    const placement = this.effectivePlacement;
    const at = against.point
      ? placeAtPoint({ point: against.box, surface: size, viewport, placement, margin, rtl })
      : placeMenu({ anchor: against.box, surface: size, viewport, placement, offset, margin, rtl });
    surface.style.top = `${at.top}px`;
    surface.style.left = `${at.left}px`;
    surface.style.maxBlockSize = `${at.maxHeight}px`;
    surface.classList.toggle('side-top', at.side === 'top');
  }

  /**
   * MNU-2, MNU-46: follows the anchor while it moves (scrolling, layout, the viewport) for as long as it is open, and
   * each open submenu its item; a submenu whose item is scrolled out of the visible part of its surface closes. Asked
   * by FollowController when something can have moved, frame by frame only while something does.
   */
  private readonly follow = (): boolean => {
    let changed = false;
    const box = this.placedAgainst()?.box;
    const scroll = this.scrollBox;
    const direction = getComputedStyle(this).direction;
    const viewport = `${document.documentElement.clientWidth},${document.documentElement.clientHeight}`;
    // MNU-32: the layout direction is part of where the surface goes — a change of it places the surface again.
    const layout = `${box?.x},${box?.y},${box?.width},${box?.height},${viewport},${scroll?.scrollHeight},${scroll?.scrollWidth},${direction}`;
    if (layout !== this.lastLayout) {
      this.lastLayout = layout;
      this.place();
      changed = true;
    }
    for (const submenu of this.openChain()) {
      if (submenu.presentation !== 'overlay') continue;
      const level = this.levelOf(submenu);
      const row = submenu.rowElement?.getBoundingClientRect();
      const held = this.scrollOf(level);
      const parent = this.surfaceOf(level)?.getBoundingClientRect();
      const own = submenu.scrollElement;
      if (!row || !held || !parent) continue;
      const view = held.getBoundingClientRect();
      // Only where the surface is drawn at its own size: while it grows in, its boxes are still being scaled.
      if (view.height >= held.clientHeight - 1 && held.scrollHeight > held.clientHeight && (row.bottom <= view.top || row.top >= view.bottom)) {
        this.closeSubmenu(submenu, true, 'stay');
        changed = true;
        break;
      }
      const placed = `${row.x},${row.y},${row.width},${row.height},${parent.x},${parent.y},${parent.width},${parent.height},${viewport},${own?.scrollHeight},${own?.scrollWidth},${direction}`;
      if (placed === submenu.lastLayout) continue;
      submenu.lastLayout = placed;
      this.placeSubmenu(submenu);
      changed = true;
    }
    return changed;
  };

  /** What is followed: the anchor, and the item of each submenu open as an overlay; sized: every surface and what scrolls in it. */
  private readonly following = new FollowController(this, {
    followed: () => [this.followedElement, ...this.overlaid().map((submenu) => submenu.rowElement)],
    sized: () => [this.surface, this.scrollBox, ...this.overlaid().flatMap((submenu) => [submenu.surfaceElement, submenu.scrollElement])],
    check: this.follow,
  });

  private overlaid(): TanreiSubmenu[] {
    return this.openChain().filter((submenu) => submenu.presentation === 'overlay');
  }

  private stopFollowing() {
    this.following.stop();
    this.lastLayout = '';
    document.removeEventListener('pointerdown', this.onOutsidePress, true);
  }

  /**
   * MNU-24: the anchor says it opens a menu, whether it is open, and which. MNU-63: the area of a context menu says
   * nothing of it — what the menu wrote on an element it no longer opens from is taken back, a product's own is kept.
   */
  private syncAnchor() {
    const target = this.isContext ? null : this.anchorTarget;
    if (this.ariaWritten && this.ariaWritten !== target) hostAria(this.ariaWritten, { 'aria-haspopup': null, 'aria-expanded': null, 'aria-controls': null });
    this.ariaWritten = target;
    if (!target) return;
    if (!this.id) this.id = `tanrei-menu-${++ids}`;
    hostAria(target, {
      'aria-haspopup': 'menu',
      'aria-expanded': String(this.open),
      'aria-controls': target.getRootNode() === this.getRootNode() ? this.id : null,
    });
  }

  /** MNU-1, MNU-4: into the top layer, placed, growing in; focus to the first enabled item. */
  private show() {
    const surface = this.surface;
    if (!surface) return;
    this.live = true;
    surface.classList.toggle('inline', this.inline);
    if (this.inline) return;
    surface.classList.remove('leaving');
    if (!surface.matches(':popover-open')) surface.showPopover();
    this.shown = true;
    this.place();
    this.following.start();
    document.addEventListener('pointerdown', this.onOutsidePress, true);
    surface.classList.remove('entering');
    // MBR-29: no open motion where it takes the place of another menu of a menubar. MOT-4: none for a menu the page's
    // markup opens, before the document's first paint — there is nothing it could have grown from.
    if (!this.bar?.quick && documentPainted()) {
      void surface.offsetWidth; // restart the animation
      surface.classList.add('entering');
    }
    if (!this.focusless) this.focusFirstItem();
  }

  /** MNU-1, MNU-4, MNU-49: focus back to the anchor if it was inside; every submenu closed with it; fading out, then out of the top layer. */
  private hide() {
    const surface = this.surface;
    this.stopFollowing();
    this.forgetPointer();
    if (!surface) return;
    surface.classList.remove('inline', 'entering', 'cascading');
    if (this.live) {
      this.live = false;
      // MNU-49: every open submenu closes with the menu, its `open` set without a `toggle`.
      for (const rows of this.tree().values()) for (const row of rows) if (row instanceof TanreiSubmenu) this.setOpen(row, false, false);
    }
    if (!this.shown) return;
    this.shown = false;
    // Not :focus-within: it does not match the host while a slotted item has focus inside the top-layer surface. The
    // focused element, through shadow roots: a forwarded item is not in the menu's own tree. MNU-49: from whatever level.
    // MNU-62: a context menu's to the element that had focus when it was asked for; where none had, out of the menu.
    const active = deepActive();
    if (this.owns(active)) {
      const back = this.focusReturn;
      if (back) back.focus();
      else (active as HTMLElement).blur?.();
    }
    this.asked = null;
    this.returnTo = null;
    // MBR-29: no close motion where it gives its place to another menu of a menubar.
    if (this.bar?.quick) {
      surface.classList.remove('leaving');
      if (surface.matches(':popover-open')) surface.hidePopover();
      return;
    }
    surface.classList.add('leaving');
    const finish = () => {
      if (this.open || !surface.classList.contains('leaving')) return;
      surface.classList.remove('leaving');
      if (surface.matches(':popover-open')) surface.hidePopover();
    };
    const running = surface.getAnimations();
    if (running.length === 0) finish();
    else void Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // MNU-14: a placement the menu does not define is drawn as bottom-start; a debug build says so.
    if (changed.has('placement') && !PLACEMENTS.includes(this.placement)) {
      report(this, 'MNU-14', `placement "${this.placement}" is not a value the menu defines; it is drawn as "bottom-start"`);
    }
    // MNU-60: a trigger the menu does not define is anchor; a debug build says so.
    if (changed.has('trigger') && !TRIGGERS.includes(this.trigger)) {
      report(this, 'MNU-60', `trigger "${this.trigger}" is not a value the menu defines; it is treated as "anchor"`);
    }
    // MNU-35: a separation the menu does not define is auto (no rule matches the attribute); a debug build says so.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'MNU-35', `separation "${this.separation}" is not a value the menu defines; it is drawn as "auto"`);
    }
    // MNU-59: an iconSpace the menu does not define is auto; a debug build says so.
    if (changed.has('iconSpace') && !ICON_SPACES.includes(this.iconSpace)) {
      report(this, 'MNU-59', `iconSpace "${this.iconSpace}" is not a value the menu defines; it is drawn as "auto"`);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // Each child in its own slot (MNU-23, MNU-36: the divider and the gap are drawn between the slots).
    assignBlocks(this.renderRoot, this.blocks);
    const anchor = this.anchorElement;
    // MNU-24: the menu role while open, named by its anchor.
    hostAria(this, {
      role: this.open ? 'menu' : null,
      // MNU-63: a context menu is not named by its area; it keeps the name the product gives it.
      'aria-labelledby': this.open && !this.isContext && anchor?.id && anchor.getRootNode() === this.getRootNode() ? anchor.id : null,
    });
    this.syncAnchor();
    if (changed.has('open') || changed.has('inline')) {
      this.closeRequested = false;
      if (this.open) this.show();
      else this.hide();
    }
    if ((changed.has('placement') || changed.has('trigger')) && this.open) this.place();
    this.syncs.now();
  }

  protected override render() {
    return html`
      <div part="surface" class="surface" data-tanrei-shape popover=${this.inline ? nothing : 'manual'} role="none">
        <div part="scroll" class="scroll">${blocksTemplate(this.blocks)}</div>
      </div>
    `;
  }
}

if (!customElements.get('tanrei-menu-item')) customElements.define('tanrei-menu-item', TanreiMenuItem);
if (!customElements.get('tanrei-menu-checkbox-item')) customElements.define('tanrei-menu-checkbox-item', TanreiMenuCheckboxItem);
if (!customElements.get('tanrei-menu-radio-item')) customElements.define('tanrei-menu-radio-item', TanreiMenuRadioItem);
if (!customElements.get('tanrei-submenu')) customElements.define('tanrei-submenu', TanreiSubmenu);
if (!customElements.get('tanrei-menu-group')) customElements.define('tanrei-menu-group', TanreiMenuGroup);
if (!customElements.get('tanrei-menu')) customElements.define('tanrei-menu', TanreiMenu);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-menu': TanreiMenu;
    'tanrei-menu-item': TanreiMenuItem;
    'tanrei-menu-checkbox-item': TanreiMenuCheckboxItem;
    'tanrei-menu-radio-item': TanreiMenuRadioItem;
    'tanrei-submenu': TanreiSubmenu;
    'tanrei-menu-group': TanreiMenuGroup;
  }
  interface HTMLElementEventMap {
    'tanrei-menu-item-update': Event;
  }
}
