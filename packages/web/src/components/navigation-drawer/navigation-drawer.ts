import { LitElement, type PropertyDeclarations, type PropertyValues, type TemplateResult, html, nothing } from 'lit';
import { type ClassInfo, classMap } from 'lit/directives/class-map.js';
import { type StyleInfo, styleMap } from 'lit/directives/style-map.js';
import {
  AvailabilityController,
  BOUND_CHORDS,
  type Binding,
  type Destination,
  type DestinationContext,
  DestinationsController,
  GlyphMirrorController,
  LINK_MARK,
  LinkController,
  OpenAxesController,
  PressController,
  badgeDescription,
  deepActive,
  hasFocusVisibleOption,
  delegatedAria, namedByProduct,
  delegatesAria,
  findInteractive,
  containedWheel,
  holdPageScroll,
  lineArrow,
  linkAttributes,
  markConditionChange,
  notifyDestinationUpdate,
  readDestination,
  report,
  stoppedBefore,
  syncFocusStyle,
  tabbables,
  trapFocus,
  hostAria,
  type KeyboardConvention,
  WAITING_FOR_CHORDS,
  ambientConvention,
  chordPressed,
  chordsConverter,
  chordsOf,
  platformConvention,
  readBinding,
  takesText,
  documentPainted,
  closeModal,
  isLeaving,
  openModal,
  type ModalMoves,
} from '../../primitives/index.js';
import { FILTER_SETTLE_MS, filterWords, holdsWords } from '../../primitives/filter.js';
import { WordsController } from '../../primitives/words.js';
import { fillPlaces } from '../../primitives/places.js';
// Not re-exported by the primitives' index: internal to a region and its destinations.
import { askDestinationContext } from '../../primitives/destination.js';
import { type CutTextContent, CutTextTip, isCut } from '../../primitives/cut-text.js';
import { flatParent } from '../../primitives/flat-tree.js';
import { ownDirection } from '../../styles/product-text.js';
import { TanreiBadge } from '../badge/badge.js';
import { TanreiDivider } from '../divider/divider.js';
import { TanreiTooltip } from '../tooltip/tooltip.js';
import '../loading-indicator/loading-indicator.js';
// NVD-79, NVD-87, NVD-89: the filter field is a Text input, its key hint the keyboard shortcut, its clear button a Button.
import '../text-input/text-input.js';
import '../keyboard-shortcut/keyboard-shortcut.js';
import '../button/button.js';
// NVD-96: the resize handle on the end edge is the Handle.
import '../handle/handle.js';
import type { TanreiHandleResizeDetail, TanreiHandleStepDetail } from '../handle/handle.js';
import type { TanreiTextInput } from '../text-input/text-input.js';
import { AXES, cellStyles, drawerStyles, groupStyles, sectionStyles } from './navigation-drawer.styles.js';
import { TanreiElement } from '../../primitives/element.js';
import { startFromNextFrame, statesFromNextFrame } from '../../primitives/motion.js';
import { cancelPhaseRead, readInPhase, readTogether } from '../../primitives/read-phase.js';

export type { TanreiNavigationChangeDetail } from '../../primitives/index.js';

/** The core variants (standard, modal), plus any a design system adds: only `modal` is presented as a modal overlay. */
export type TanreiNavigationDrawerVariant = 'standard' | 'modal' | (string & {});

/** The core densities (regular, compact), plus any a design system adds (NVD-65). */
export type TanreiNavigationDrawerDensity = 'regular' | 'compact' | (string & {});

/** Which cells draw their short label while the drawer is collapsed: all of them, only the selected one's, or none. */
export type TanreiNavigationDrawerCollapsedLabels = 'always' | 'selected' | 'never';

/**
 * What a responsive drawer is at the window's current width (NVD-53): `standard`, beside the content; `column`, its
 * collapsed column beside the content, widening over it while open; `modal`, over the content alone while open.
 */
export type TanreiNavigationDrawerPresentation = 'standard' | 'column' | 'modal';

/** What `presentationchange` carries: the presentation the window's width has just chosen (which `presentation` already holds). */
export interface TanreiNavigationDrawerPresentationChangeDetail {
  presentation: TanreiNavigationDrawerPresentation;
}

/** What `expandedchange` carries: the form asked for, true to expand and false to collapse. */
export interface TanreiNavigationDrawerExpandedChangeDetail {
  expanded: boolean;
}

/** What `widthchange` carries: the width a person gave the expanded drawer beside the content, in CSS pixels (which `width` already holds). */
export interface TanreiNavigationDrawerWidthChangeDetail {
  width: number;
}

/** NVD-100: how far one key's step and a large step change the width, in CSS pixels. */
const RESIZE_STEP = 10;
const RESIZE_LARGE_STEP = 100;

/** The lengths a resize is reckoned in, in CSS pixels, as the drawer is drawn now (NVD-97, NVD-99). */
interface ResizeMetrics {
  /** The least width beside the content. */
  least: number;
  /** The greatest: maxWidth or container.max-width, and the room the parent gives, never below the least. */
  most: number;
  /** The collapsed column's width, for the drawer's density. */
  column: number;
  /** container.width, held between the least and the greatest: the width while `width` is null. */
  fallback: number;
  /** The room the parent gives, where it is less than the width drawn beside the content asks for; null for room enough. */
  narrowed: number | null;
}

/** A number, or nothing where it is null or not a number. */
const given = (value: number | null | undefined): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
/** NVD-97: held between the least and the greatest, the least winning. */
const hold = (value: number, least: number, most: number) => Math.max(least, Math.min(value, most));

/** What a group's `toggle` carries: its new open state (which its `open` already holds). */
export interface TanreiNavigationDrawerToggleDetail {
  open: boolean;
}

/** What `filterchange` carries: the filter text the person left in the field (which `filterValue` already holds). */
export interface TanreiNavigationDrawerFilterChangeDetail {
  value: string;
}

/** How far a drag toward the start edge must go before the drawer follows it (NVD-20: no platform value on the web). */
const TOUCH_SLOP = 8;
/** A release at least this fast toward the start edge is a fling (NVD-20), in px per ms. */
const FLING_VELOCITY = 0.5;
/** Groups nested deeper than this are reported (NVD-48). */
const DEEPEST = 3;
/**
 * NVD-40: what a collapsible modal drawer's dialog moves between its column and its full width besides its place — its
 * width, container color, elevation and corners (the styles' `dialog.drawer.widening`), by the names the engines give
 * their transitions — held as shown where it changes hands (closeModal, openModal).
 */
const WIDENING: ModalMoves = ['width', 'background-color', 'box-shadow', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];

const ITEM = 'tanrei-navigation-drawer-item';
const GROUP = 'tanrei-navigation-drawer-group';
const SECTION = 'tanrei-navigation-drawer-section';
const DRAWER = 'tanrei-navigation-drawer';
/** The drawer's cells: its destinations and its groups' rows. */
const CELLS = `${ITEM}, ${GROUP}`;

/** What the drawer selects (NVD-3, NVD-66): an item, or a group that is a destination. */
type DrawerDestination = TanreiNavigationDrawerItem | TanreiNavigationDrawerGroup;

/** A duration as the browser computes it ("0.5s"), in ms. */
const ms = (value: string) => (Number.parseFloat(value) || 0) * (value.trim().endsWith('ms') ? 1 : 1000);

/** Whether an update changed `key` (a private or protected reactive property, which `PropertyValues<this>` does not name). */
/**
 * NVD-56: when a box waited for is first seen. \`isIntersecting\` is true also for a box that only touches the window's
 * edge, of which nothing is seen, and a tooltip counts such an anchor out of sight and closes at once
 * (src/primitives/placement.ts): the wait goes on until part of it is seen. The second threshold makes the observer call
 * again when that happens; a single threshold of 0 would not, the box still intersecting.
 */
const SIGHT: IntersectionObserverInit = { threshold: [0, 1e-6] };
const seen = (entries: IntersectionObserverEntry[]) => entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0);

const has = (changed: PropertyValues, key: string) => (changed as Map<PropertyKey, unknown>).has(key);

/** The groups that hold `cell`, outermost first (within its drawer). */
function groupsOf(cell: Element): TanreiNavigationDrawerGroup[] {
  const groups: TanreiNavigationDrawerGroup[] = [];
  for (let at = cell.parentElement; at && at.localName !== DRAWER; at = at.parentElement) if (at instanceof TanreiNavigationDrawerGroup) groups.unshift(at);
  return groups;
}

/** What the drawer tells each of its cells (a destination, or a group's row). */
export interface DrawerCellContext extends DestinationContext {
  /** The drawer is collapsed (NVD-30): the cell is drawn from the collapsed conditions, as the collapsed cell. */
  collapsed: boolean;
  /** The drawer is collapsible: the cell keeps one height and icon line in both forms (NVD-31). */
  collapsible: boolean;
  /** Its short label is drawn while the drawer is collapsed (NVD-33). */
  shortShown: boolean;
  /** collapsedLabels is not `never`: the cell keeps room for a short label (NVD-31). */
  labels: boolean;
  /** How many groups hold it (NVD-13, NVD-44: its item container starts item.nest-indent further in per level). */
  level: number;
  /** It is the selected destination itself, not a group's row that shows it (NVD-47): the current page. */
  current: boolean;
  /** A group: it is a destination as well (selectableGroups and a value or an href, NVD-66). A destination: always. */
  destination: boolean;
  /** Where a group's chevron is drawn (NVD-68): the drawer's `chevron`, start drawn as end while it is collapsible. */
  chevron: 'start' | 'end' | 'none';
  /** How much further than the drawer's padding the row begins, a CSS length (NVD-69). */
  inset: string;
  /** The row keeps the icon's room: it has an icon, or iconSpace keeps it (NVD-71). */
  iconRoom: boolean;
  /** How far the row's fill and state layers reach (NVD-70). */
  highlight: 'indented' | 'full';
  /** Groups open and close at all (NVD-72). */
  expandable: boolean;
  /** A group's guide line (NVD-73): how it is drawn, and where (a CSS length from the cell's start); its items' inset. */
  guides: 'none' | 'shown' | 'hover';
  guideAt: string;
  childInset: string;
  /** The label and the supporting text wrap instead of being cut (NVD-75). */
  labelWrap: boolean;
  supportingWrap: boolean;
  /** NVD-82: a filter hides the row (and what it holds). */
  filterHidden: boolean;
  /** NVD-84: a group drawn open for the filter, its `open` untouched. */
  filterOpen: boolean;
  /** NVD-86: the active match, drawn as the row with keyboard focus while focus stays in the filter field. */
  filterActive: boolean;
}

const REST: DrawerCellContext = {
  selected: false,
  position: 0,
  size: 0,
  labelShown: true,
  collapsed: false,
  collapsible: false,
  shortShown: false,
  labels: false,
  level: 0,
  current: false,
  destination: false,
  chevron: 'end',
  inset: '0px',
  iconRoom: false,
  highlight: 'indented',
  expandable: true,
  guides: 'none',
  guideAt: '0px',
  childInset: '0px',
  labelWrap: false,
  supportingWrap: false,
  filterHidden: false,
  filterOpen: false,
  filterActive: false,
};

/**
 * What a destination and a group's row share: the cell — the drawer's full width, the hit area — with its row laid out
 * for the expanded drawer (the icon on the icon column, the label, the trailing content), the item container that is the
 * row while expanded and the row cut after its icon while collapsed, the short label where collapsedLabels draws one, the
 * tooltip that names a collapsed cell without one, and the states, press and focus (NVD-4…10, NVD-31…35, NVD-56).
 */
abstract class DrawerCell extends TanreiElement {
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    shortLabel: { type: String, attribute: 'short-label' },
    icon: { type: String },
    disabled: { type: Boolean, reflect: true },
    supportingText: { type: String, attribute: 'supporting-text' },
    supportingPosition: { type: String, attribute: 'supporting-position' },
    trailingText: { type: String, attribute: 'trailing-text' },
    context: { state: true },
    trailing: { state: true },
  };

  /** A few words about the row, under its label (`below`, the default) or after it (`inline`), read as its description (NVD-74). */
  supportingText = '';

  /** Where the supporting text stands: `below` (the default) or `inline`. */
  supportingPosition: 'below' | 'inline' = 'below';

  /** Short text at the end of the expanded row ("24", "New"), quieter than the label; the trailing slot's content wins. */
  trailingText = '';

  /** What the trailing slot holds: whether anything, whether one glyph, and what it says. */
  protected trailing = { filled: false, glyph: false, text: '' };


  /** Its name, drawn beside the icon while the drawer is expanded and always its accessible name. Required. */
  label = '';

  /** What the collapsed drawer draws under the icon, on one line ("Files" for "My files"), where the drawer's `collapsedLabels` draws labels. Empty draws the label, truncated. */
  shortLabel = '';

  /** The name of a glyph of the system's icon set: outlined while unselected, filled while selected. Empty draws none. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. */
  icon = '';

  /** Unavailable: it keeps its place and its disabled look, cannot be activated and leaves the focus order. */
  disabled = false;

  protected context: DrawerCellContext = { ...REST };
  /** Whether the drawer has told it anything yet: the first selection is drawn, not animated. */
  protected told = false;
  protected grow = false;

  /**
   * NVD-51: a destination's and a group's glyph, and a glyph the product put in the trailing slot, are marked when the
   * icon set mirrors their names in right-to-left (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark. A
   * group's chevron (`expand_more`, NVD-44) is not named here.
   */
  protected readonly mirror = new GlyphMirrorController(this, { drawn: '.icon, .link-mark, .chevron.start', slots: 'slot[name="trailing"]' });

  /** NVD-8, NVD-9: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  protected readonly press = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.container') ?? null,
    holdCarrier: () => this.renderRoot?.querySelector('.hold') ?? null,
    disabled: () => this.disabled,
    keys: () => this.pressKeys,
    // A press outside the item container (elsewhere in the cell) grows the ripple from its centre.
    origin: (at) => {
      const box = this.renderRoot?.querySelector('.container')?.getBoundingClientRect();
      return box && at.x >= box.left && at.x <= box.right && at.y >= box.top && at.y <= box.bottom ? at : null;
    },
  });

  constructor() {
    super();
    // A disabled cell swallows every click that reaches it, from its content or dispatched on it.
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

  /** The keys that press the cell: Enter and Space (undefined), and Enter alone for a destination that is a link (NVD-1). */
  protected get pressKeys(): readonly string[] | undefined {
    return undefined;
  }

  /** @internal The drawer's side. */
  setDrawerContext(context: DrawerCellContext) {
    const now = this.context;
    if ((Object.keys(context) as (keyof DrawerCellContext)[]).every((key) => context[key] === now[key]) && this.told) return;
    this.grow = this.told && context.selected && !now.selected && context.collapsed === now.collapsed;
    this.told = true;
    this.context = context;
  }

  /** @internal The native button or link: the cell. */
  get cell(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.cell') ?? null;
  }

  /** The group that holds it, if any. */
  protected get parentGroup(): TanreiNavigationDrawerGroup | null {
    return (this.parentElement?.closest(GROUP) as TanreiNavigationDrawerGroup | null) ?? null;
  }

  /** NVD-10: where style queries are missing, the focus style is read when focus arrives. NVD-56: keyboard focus names a collapsed cell, without the hover's delay. */
  protected readonly onFocus = () => {
    syncFocusStyle(this, this.cell);
    const keyboard = !!this.cell?.matches(':focus-visible');
    if (!this.unnamed) {
      // NVD-75: the cut text's tooltip, once the row is seen (as NVD-56's name).
      if (keyboard) this.whenInView(this.cell, () => this.cutTip.focus(!!this.cell?.matches(':focus-visible')));
      else this.cutTip.focus(false);
      return;
    }
    if (keyboard) this.nameWhenInView();
  };

  /**
   * NVD-75: the tooltip that shows a cut label or supporting text whole (the tree view's, src/primitives/cut-text.ts): one
   * tooltip of the cell's, made when first wanted and laid over the row's item container (the styles' \`.cut-tip\`).
   */
  private readonly cutTip = new CutTextTip({
    // The tooltip where there is one; it is made and laid over the row only to open (`place`).
    tip: () => this.cutTipElement,
    place: () => void this.placeCutTip(),
    content: () => this.cutContent(),
    clock: () => this.renderRoot?.querySelector('.tip-clock') ?? null,
  });

  private cutTipElement: TanreiTooltip | null = null;

  private placeCutTip(): TanreiTooltip | null {
    const row = this.renderRoot?.querySelector('.row');
    let tip = this.cutTipElement;
    if (!row) return tip;
    if (!tip) {
      tip = document.createElement('tanrei-tooltip') as TanreiTooltip;
      tip.className = 'cut-tip';
      tip.setAttribute('no-describe', '');
      tip.setAttribute('aria-hidden', 'true');
      tip.placement = 'end';
      this.cutTipElement = tip;
    }
    if (tip.parentElement !== row) {
      if (tip.open) tip.open = false;
      row.append(tip);
    }
    return tip;
  }

  /** NVD-75: what is cut in the expanded row — its label, or the label and its supporting text below it — or null. */
  private cutContent(): CutTextContent | null {
    if (this.context.collapsed) return null;
    const label = this.renderRoot?.querySelector('.label');
    const supporting = this.renderRoot?.querySelector('.supporting');
    const below = !!supporting && this.supportingPosition !== 'inline';
    if (!isCut(label) && !(below && isCut(supporting))) return null;
    return this.supportingText ? { title: this.label, text: this.supportingText } : { text: this.label };
  }

  /**
   * Runs \`then\` once part of \`element\` is first seen in the window (at once where it is; a box that only touches the
   * window's edge is not seen, \`seen()\`): a tooltip whose anchor is out of sight closes at once (NVD-56). NVD-75's wait
   * is its own: the collapsed name's hide (after the pointer left) ends the name's wait, never this one.
   */
  private whenInView(element: Element | null, then: () => void) {
    this.cutSightline?.disconnect();
    if (!element || typeof IntersectionObserver !== 'function') {
      then();
      return;
    }
    this.cutSightline = new IntersectionObserver((entries) => {
      if (!seen(entries)) return;
      this.cutSightline?.disconnect();
      this.cutSightline = null;
      then();
    }, SIGHT);
    this.cutSightline.observe(element);
  }

  /** NVD-75: waits for a focused cell to be seen before its cut text's tooltip is opened (\`whenInView()\`). */
  private cutSightline: IntersectionObserver | null = null;

  /**
   * NVD-56: keyboard focus opens the name once the cell can be seen. A tooltip whose anchor lies wholly outside the
   * window closes again at once, and the browser brings a focused cell into view in its own time — WebKit sometimes a
   * few frames after the focus, after the next frame has been drawn. So the name is opened when the tooltip's box is
   * first seen in the window (at once where it already is), for as long as the cell keeps keyboard focus.
   */
  private nameWhenInView() {
    const tip = this.tip;
    this.sightline?.disconnect();
    if (!tip) return;
    if (typeof IntersectionObserver !== 'function') {
      this.showName(true);
      return;
    }
    this.sightline = new IntersectionObserver((entries) => {
      if (!seen(entries)) return;
      this.sightline?.disconnect();
      this.sightline = null;
      if (this.cell?.matches(':focus-visible') && this.unnamed) this.showName(true);
    }, SIGHT);
    this.sightline.observe(tip);
  }

  /** NVD-56: waits for a focused cell to be seen before its name is opened (`nameWhenInView()`). */
  private sightline: IntersectionObserver | null = null;

  /** NVD-56: whether this cell is one the collapsed drawer draws without a label, so that its name is shown beside it. */
  protected get unnamed(): boolean {
    return this.context.collapsed && !this.context.shortShown && this.context.level === 0 && !!this.label;
  }

  private get tip(): TanreiTooltip | null {
    return this.renderRoot?.querySelector<TanreiTooltip>('.tip') ?? null;
  }

  private tipTimer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;

  /** NVD-56: shows or hides the cell's name beside it. The tooltip is the tooltip component's plain one, opened by the cell. */
  private showName(shown: boolean) {
    clearTimeout(this.tipTimer);
    if (!shown) {
      this.sightline?.disconnect();
      this.sightline = null;
    }
    const tip = this.tip;
    if (tip && tip.open !== shown) tip.open = shown;
  }

  /** The tooltip's waits, as its tokens resolve now, in ms. */
  private tipWaits(): { show: number; hide: number } {
    const clock = this.renderRoot?.querySelector('.tip-clock');
    const style = clock ? getComputedStyle(clock) : null;
    return { show: ms(style?.transitionDelay ?? ''), hide: ms(style?.transitionDuration ?? '') };
  }

  /** NVD-56: a fine pointer resting on the cell shows its name after the tooltip's show delay; a touch does not. */
  protected readonly onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || this.disabled) return;
    if (!this.unnamed) {
      this.cutTip.pointerEnter(event.pointerType);
      return;
    }
    this.hovered = true;
    clearTimeout(this.tipTimer);
    this.tipTimer = setTimeout(() => {
      if (this.hovered && this.unnamed) this.showName(true);
    }, this.tipWaits().show);
  };

  protected readonly onPointerLeave = (event: PointerEvent) => {
    this.press.release(event);
    if (event.pointerType === 'touch') return;
    this.cutTip.pointerLeave(event.pointerType);
    this.hovered = false;
    clearTimeout(this.tipTimer);
    // It stays while the cell has keyboard focus, as a tooltip does.
    if (this.cell?.matches(':focus-visible')) return;
    this.tipTimer = setTimeout(() => this.showName(false), this.tipWaits().hide);
  };

  /** An activation closes the tooltip, and so does focus leaving the cell. */
  protected readonly hideName = () => {
    this.hovered = false;
    this.showName(false);
    this.cutTip.press();
  };

  protected readonly onBlur = () => {
    this.press.onBlur();
    this.cutTip.blur();
    if (!this.hovered) this.showName(false);
  };

  /** Whether `key` is the arrow toward the end of the line (Right in a left-to-right layout), or toward its start. */
  protected arrow(key: string): 'end' | 'start' | null {
    return lineArrow(key, this);
  }

  /** NVD-45: on an item inside an open group, the arrow toward the start moves focus to the group's row. */
  protected leaveToGroup(event: KeyboardEvent): boolean {
    if (this.context.collapsed || this.arrow(event.key) !== 'start') return false;
    const group = this.parentGroup;
    if (!group || group.disabled) return false;
    event.preventDefault();
    // The row itself: focusing the group's host would not move focus from an item inside it (it already holds it).
    group.cell?.focus();
    return true;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.tipTimer);
    this.cutTip.hide();
    this.sightline?.disconnect();
    this.sightline = null;
    this.cutSightline?.disconnect();
    this.cutSightline = null;
    this.hovered = false;
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // The first render draws the cell as what it is: the drawer tells it before, whatever order the elements were defined in.
    if (!this.told) askDestinationContext(this);
    const before = (changed as Map<PropertyKey, unknown>).get('context') as DrawerCellContext | undefined;
    if (before && before.selected !== this.context.selected && before.collapsed === this.context.collapsed) markConditionChange(this.cell);
    // NVD-56: a cell that draws its label again, or leaves the collapsed form, has no tooltip to leave open; NVD-75: nor
    // does a cut row that collapses.
    if (!this.unnamed) clearTimeout(this.tipTimer);
    if (before && !before.collapsed && this.context.collapsed) this.cutTip.hide();
  }

  protected override updated(changed: PropertyValues<this>) {
    const { position, size, filterHidden, filterActive } = this.context;
    // NVD-23: a list item of its level's list, its position among the items of its level (NVD-95: among those a filter
    // shows).
    this.setAttribute('role', 'listitem');
    if (position) this.setAttribute('aria-posinset', String(position));
    if (size) this.setAttribute('aria-setsize', String(size));
    // NVD-82: a row a filter hides is not drawn, takes no space, takes no focus and is not exposed (the styles' display);
    // NVD-86: the active match, for a product's styles and for a test.
    this.toggleAttribute('data-filter-hidden', filterHidden);
    this.toggleAttribute('data-filter-active', filterActive);
    // NVD-10: where style queries are missing, the focus style is read for the active match as for a focused cell.
    if (filterActive) syncFocusStyle(this, this.cell);
    if (this.grow) {
      this.grow = false;
      this.growIndicator();
    }
    // NVD-34: the short label should be a part of the label, which stays the accessible name.
    if ((changed.has('shortLabel') || changed.has('label')) && this.shortLabel && !this.label.toLowerCase().includes(this.shortLabel.toLowerCase())) {
      report(this, 'NVD-34', `shortLabel "${this.shortLabel}" is not a part of label "${this.label}", so the visible name is not part of the accessible name; make it a part of the label`);
    }
  }

  /**
   * NVD-41: the newly selected cell's icon indicator — which only a system that marks the selection behind the glyph
   * fills — grows in width from its centre, at its full height, over the selection motion. The item container is never
   * resized to show a selection: it changes color in place (the styles).
   */
  protected growIndicator() {
    const indicator = this.renderRoot.querySelector<HTMLElement>('.icon-indicator');
    if (!indicator || typeof indicator.animate !== 'function') return;
    const style = getComputedStyle(indicator);
    const duration = ms(style.animationDuration);
    for (const running of indicator.getAnimations()) if (running.id === 'tanrei-drawer-grow') running.cancel();
    if (duration <= 0) return;
    const animation = indicator.animate([{ inlineSize: '0px' }, { inlineSize: style.inlineSize }], { duration, easing: style.animationTimingFunction || 'ease' });
    animation.id = 'tanrei-drawer-grow';
  }

  /** The cell's classes: its condition, its state and its form. */
  protected cellClasses(extra: ClassInfo = {}): ClassInfo {
    const { selected, collapsed, collapsible, shortShown, labels, chevron, iconRoom, highlight, labelWrap, supportingWrap, filterActive } = this.context;
    return {
      cell: true,
      selected,
      // NVD-86: drawn as the row with keyboard focus (its focused tokens and its focus ring).
      'filter-active': filterActive,
      d: this.disabled,
      collapsed,
      collapsible,
      'short-shown': shortShown,
      'no-labels': !labels,
      'no-icon': !this.icon,
      // NVD-68, NVD-70, NVD-71, NVD-74, NVD-75: the row model's geometry.
      'chevron-start': chevron === 'start',
      'icon-room': iconRoom,
      'highlight-full': highlight === 'full',
      'label-wrap': labelWrap,
      'supporting-wrap': supportingWrap,
      ...extra,
    };
  }

  /** NVD-69: how much further than the drawer's padding the row begins. */
  protected cellStyle(): StyleInfo {
    return { '--_inset': this.context.inset || '0px' };
  }

  /** The glyph's name: the icon (a group draws its openIcon while open, NVD-68). */
  protected get glyphName(): string {
    return this.icon;
  }

  /** The glyph (hidden from assistive technology); a destination puts its badge on it. */
  protected glyph(): TemplateResult {
    return html`<span part="icon" class="icon" aria-hidden="true">${this.glyphName}</span>`;
  }

  /**
   * NVD-68: an end chevron's room, kept empty after a destination's trailing content so that the trailing content of a
   * level stands in one column. A row with nothing at its end keeps none: its label has that room. `mark`: the row ends
   * with the mark of a link that opens a new context (NVD-63).
   */
  protected endRoom(mark: boolean): TemplateResult | typeof nothing {
    const trailing = this.trailing.filled || !!this.trailingText || mark;
    return trailing && this.context.chevron === 'end' && !this.context.collapsed ? html`<span class="chevron end room" aria-hidden="true"></span>` : nothing;
  }

  /** NVD-68: what the start chevron's box holds — nothing on a destination's row, which keeps the room. */
  protected startChevron(): TemplateResult | typeof nothing {
    return nothing;
  }

  /** NVD-15, NVD-43: what the trailing slot holds, and what it says as part of the description. */
  #onTrailingChange(event: Event) {
    const assigned = (event.target as HTMLSlotElement).assignedElements({ flatten: true });
    const text = assigned
      .filter((element) => element.getAttribute('aria-hidden') !== 'true')
      .map((element) => element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    // One plain element holding text only is a glyph of the icon set (a ligature), drawn at trailing-icon.size.
    const glyph = assigned.length === 1 && !assigned[0].localName.includes('-') && !assigned[0].children.length && !!assigned[0].textContent?.trim();
    this.trailing = { filled: assigned.length > 0, glyph, text };
    if (assigned.some((element) => findInteractive(element))) report(this, 'NVD-43', 'the trailing slot holds a focusable element; trailing content is not interactive, so it is kept out of the focus order');
  }

  /**
   * NVD-43: the trailing slot's content, or else the trailing text; inert, and part of the description (NVD-15). `mark`:
   * a link that opens a new context ends its row with the icon set's `open_in_new` where the product put neither there
   * (NVD-63). `after`: what stands after the trailing content at the very end of the row (a group's end chevron, NVD-68).
   */
  protected trailingContent(mark = false, after: TemplateResult | typeof nothing = nothing) {
    const { filled, glyph } = this.trailing;
    const text = !filled && !!this.trailingText;
    const marked = mark && !filled && !text;
    return html`<span class=${classMap({ trailing: true, filled: filled || text || marked || after !== nothing })} aria-hidden="true" inert>
      <span class=${classMap({ 'trailing-slot': true, filled, glyph })}><slot name="trailing" @slotchange=${this.#onTrailingChange}></slot></span>
      ${text ? html`<span part="trailing-text" class="trailing-text">${this.trailingText}</span>` : nothing}
      ${marked ? html`<span part="link-mark" class="link-mark">${LINK_MARK}</span>` : nothing}
      ${after}
    </span>`;
  }

  /** NVD-15, NVD-74: what the row says after its name: its supporting text, then its trailing content's text. */
  protected get rowDescription(): string[] {
    const trailing = this.trailing.filled ? this.trailing.text : this.trailingText;
    return [this.supportingText, trailing].filter((part): part is string => !!part);
  }

  /**
   * The row: the item container (the active indicator, the state layer's box), the icon indicator with the icon on the
   * icon column, the label, the trailing content, the short label under the icon — and, for a collapsed cell that draws
   * no label, the plain tooltip that shows its name beside it (NVD-56). Everything but the cell itself is hidden from
   * assistive technology: the cell is named by the label, and the tooltip says nothing a second time.
   */
  protected row(trailing: TemplateResult | typeof nothing) {
    const inline = this.supportingPosition === 'inline';
    const tip = this.unnamed ? this.label : null;
    return html`
      <span class="row">
        <span part="container" class="container" data-tanrei-shape><span part="active-indicator" class="indicator" aria-hidden="true"></span></span>
        ${this.context.chevron === 'start' && !this.context.collapsed ? html`<span class="start-chevron" aria-hidden="true">${this.startChevron()}</span>` : nothing}
        <span class="lead" aria-hidden="true">
          <span part="icon-indicator" class="icon-indicator" data-tanrei-shape></span>
          ${this.icon ? this.glyph() : nothing}
        </span>
        <span class=${classMap({ text: true, inline })} aria-hidden="true"
          ><span part="label" class="label">${this.label}</span>${this.supportingText ? html`<span part="supporting-text" class="supporting">${this.supportingText}</span>` : nothing}</span
        >
        ${trailing}
        <span part="short-label" class="short" aria-hidden="true"><span class="short-text" dir=${ownDirection(this.shortLabel || this.label)}>${this.shortLabel || this.label}</span></span>
        ${tip ? html`<tanrei-tooltip class="tip" no-describe aria-hidden="true" placement="end" .text=${tip}></tanrei-tooltip>` : nothing}
      </span>
      <span class="hold"></span><span class="tip-clock"></span>
    `;
  }
}

/**
 * One destination of a navigation drawer — the spec's item kind `destination`: an icon, a label (a short label
 * while the drawer is collapsed), optional trailing content at the end of its row and an optional badge on its icon. A
 * child of `<tanrei-navigation-drawer>`, of one of its sections or of one of its groups, in order.
 *
 * It is a button, or with `href` a link (NVD-59): an `<a href>` in the shadow root, drawn exactly as the button
 * is, whose context menu, new-tab clicks, drag and address are the browser's own; Enter follows it and Space does not.
 * A link is not selected by a press (NVD-60): a plain activation makes the drawer fire `change` (or `reselect`) —
 * cancelable, with `detail.href`, before the browser follows the link — and the page shown next sets the drawer's
 * `value`; a modified or a middle click, a link whose `target` is `new` and a download fire nothing. Without a `value`
 * a link's `href` is its value. `target="new"` opens a new tab, safely (`noopener`), ends the expanded row with the icon
 * set's `open_in_new` unless the row has trailing content, and says `targetLabel` (NVD-63).
 *
 * Either is named by its label in both forms, the selected one `aria-current="page"`; its badge's description, then its
 * trailing content and then, for a link that opens a new context, `targetLabel` are its description. Its host is a
 * list item, its position counted among the items of its level.
 *
 * @tag tanrei-navigation-drawer-item
 * @slot trailing - Content at the end of the expanded row, in place of `trailing-text`: a glyph of the icon set (drawn at comp.navigation-drawer.item.trailing-icon.size, e.g. `open_in_new`), a short text. Not interactive. A count belongs in `trailing-text`, and a badge on the icon (`badge`): a badge needs an anchor, and the end of the row has none.
 * @csspart cell - The whole cell: the native button or link, the hit area.
 * @csspart container - The item container: the row while expanded (starting `item.nest-indent` further in per level of nesting), and while collapsed the row cut after its icon, with the row's height and corners in the default system; the state layer's box, the focus ring's and the ripple's.
 * @csspart active-indicator - The fill of the item container (the active indicator while selected): it changes color in place and is never resized to show a selection.
 * @csspart icon-indicator - The box behind the icon alone (transparent in the default system).
 * @csspart icon - The glyph (hidden from assistive technology).
 * @csspart label - The label beside the icon (hidden from assistive technology: the cell is named by it).
 * @csspart short-label - The short label under the icon while collapsed, where the drawer's `collapsed-labels` draws one (hidden from assistive technology).
 * @csspart trailing-text - The trailing text.
 * @csspart link-mark - The `open_in_new` glyph that ends a link which opens a new context, where the row has no trailing content (hidden from assistive technology).
 */
export class TanreiNavigationDrawerItem extends DrawerCell implements Destination {
  static override styles = cellStyles;

  static override properties: PropertyDeclarations = {
    // Its own accessor (below): a link without a value reads its href. Reflected by hand, as it was given.
    value: { type: String, noAccessor: true },
    badge: { type: Boolean, reflect: true },
    badgeCount: { type: Number, attribute: 'badge-count' },
    badgeLabel: { type: String, attribute: 'badge-label' },
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    rel: { type: String },
    download: { type: String },
  };

  private given = '';

  /**
   * What identifies the destination: the drawer's `value` selects it by this, and `change` / `reselect` carry it. While
   * it is given none, a link's `href` stands for it, as written (NVD-59) — so a page sets the drawer's `value` to its
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

  /** Draws a Tanrei badge on the icon, in both forms, from `badgeCount` and `badgeLabel`. */
  badge = false;

  /** The badge's count: null (no attribute) draws the dot, 0 nothing, above 0 the number (999+ above 999). */
  badgeCount: number | null = null;

  /** What assistive technology reads after the destination's name and state ("3 unread"). A dot needs one. */
  badgeLabel = '';

  /** The address the destination leads to: a URL, a path or a fragment. Not empty, the destination is a link and not a button (NVD-59), and the drawer does not select it by a press (NVD-60). White space is no address; a `javascript:` address or one that cannot be read is refused and reported (NVD-64). */
  href = '';

  /** Where a link opens: `same` (here) or `new` (a new tab or window, with `noopener`), which the expanded row marks with `open_in_new` and says through `targetLabel` (NVD-63). HTML's `_self` and `_blank` are read as those; anything else is `same` and is reported (NVD-64). Ignored without `href`. */
  target = 'same';

  /** What assistive technology reads at the end of the link's description while `target` is `new` ("opens in a new tab"): your words, in your language. Required then; ignored otherwise. */
  targetLabel = '';

  /** Web only: the anchor's `rel`. `noopener` is added while `target` is `new`; `noreferrer` is yours to add. */
  rel: string | null = null;

  /** Web only: the anchor's `download`. A link that asks for a download is the browser's: the drawer fires nothing for it (NVD-60). */
  download: string | null = null;

  /**
   * NVD-59, NVD-63, NVD-64: the link the destination is while it has an address, what its anchor carries, and what a
   * debug build is told (src/primitives/link.ts).
   */
  private readonly link = new LinkController(this, { ids: { refused: 'NVD-64', newContext: 'NVD-63' }, disabled: () => this.disabled });

  /** NVD-1, NVD-59: a link is pressed by Enter alone; Space is the browser's, and shows no pressed state. */
  protected override get pressKeys(): readonly string[] | undefined {
    return this.link.pressKeys;
  }

  /**
   * @internal NVD-60: what the drawer is told of a click on this destination — null while it is a button; for a link
   * its address, and whether the click follows it in place: the primary button, no modifier key, not already
   * cancelled, on a link that opens where the person is and asks for no download.
   */
  linkActivation(event: MouseEvent): { href: string; counted: boolean } | null {
    const form = this.link.form;
    if (!form) return null;
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
    return { href: this.href, counted: plain && !form.disabled && !form.opensNew && this.download === null };
  }

  /** @internal The drawer's side (`DestinationsController`). */
  setDestinationContext(context: DestinationContext) {
    this.setDrawerContext({ ...REST, ...context });
  }

  /** Whether the drawer draws this destination as its selected one. */
  get selected(): boolean {
    return this.context.selected;
  }

  /** `element.click()` activates the destination as a person would; a disabled one does nothing. */
  override click() {
    if (this.disabled) return;
    this.cell?.click();
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (this.leaveToGroup(event)) return;
    this.press.onKeyDown(event);
  };

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    // NVD-43: the slot's content is drawn; trailingText beside it is not.
    if ((changed.has('trailingText') || has(changed, 'trailing')) && this.trailing.filled && this.trailingText) {
      report(this, 'NVD-43', `the trailing slot has content and trailingText is "${this.trailingText}" as well; the slot's content is drawn`);
    }
    // The value as it was given, for a selector or a product that reads it; a link's href is not written back as one.
    if (changed.has('value')) {
      if (this.given) {
        if (this.getAttribute('value') !== this.given) this.setAttribute('value', this.given);
      } else if (this.hasAttribute('value')) this.removeAttribute('value');
    }
    // Tells the drawer a prop it reads changed; an internal event, kept out of the item's public API.
    notifyDestinationUpdate(this, changed);
  }

  /** NVD-42: the glyph, inside the badge when there is one — the badge is drawn above the icon indicator. */
  protected override glyph() {
    const glyph = super.glyph();
    if (!this.badge) return glyph;
    return html`<tanrei-badge .count=${this.badgeCount ?? null} label=${this.badgeLabel}>${glyph}</tanrei-badge>`;
  }

  protected override render() {
    const { selected } = this.context;
    const classes = this.cellClasses();
    // NVD-15, NVD-42: the badge's description, and then the trailing content, after the name and the state.
    // NVD-59: with an address it is a link — the anchor's address, target, rel and disabled form are the link
    // primitive's. NVD-63: one that opens a new context says so last, whether its mark is drawn or not. NVD-74: the
    // supporting text first, then the badge's description, then the trailing content.
    const link = this.link.form;
    const [supporting, ...rest] = this.supportingText ? this.rowDescription : ['', ...this.rowDescription];
    // The product's aria-description on the host comes first (src/primitives/delegated-aria.ts).
    const description = this.link.describe(this.getAttribute('data-aria-description'), supporting, badgeDescription(this.badge, this.badgeCount, this.badgeLabel), ...rest);
    const content = this.row(this.trailingContent(!!link?.opensNew, this.endRoom(!!link?.opensNew)));
    if (link) {
      return html`<a
        part="cell"
        class=${classMap(classes)}
        style=${styleMap(this.cellStyle())}
        ${linkAttributes(link)}
        ${delegatedAria(this, { 'aria-current': selected && 'page', 'aria-label': this.label, 'aria-description': description })}
        @click=${this.hideName}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerenter=${this.onPointerEnter}
        @pointerleave=${this.onPointerLeave}
        @keydown=${this.onKeyDown}
        @keyup=${this.press.onKeyUp}
        @blur=${this.onBlur}
        @focus=${this.onFocus}
        >${content}</a
      >`;
    }
    return html`<button
      part="cell"
      class=${classMap(classes)}
      style=${styleMap(this.cellStyle())}
      type="button"
      ?disabled=${this.disabled}
      ${delegatedAria(this, { 'aria-current': selected && 'page', 'aria-label': this.label, 'aria-description': description })}
      @click=${this.hideName}
      @pointerdown=${this.press.onPointerDown}
      @pointerup=${this.press.release}
      @pointercancel=${this.press.release}
      @pointerenter=${this.onPointerEnter}
      @pointerleave=${this.onPointerLeave}
      @keydown=${this.onKeyDown}
      @keyup=${this.press.onKeyUp}
      @blur=${this.onBlur}
      @focus=${this.onFocus}
    >
      ${content}
    </button>`;
  }
}

/**
 * A group of a drawer's destinations — the spec's item kind `group`: a row that opens and closes it (an icon,
 * a label, a short label for the collapsed drawer, and the icon set's `expand_more` turned half a turn while open), and
 * under it, indented one level further, its `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>`
 * children. A collapsed drawer draws it as one cell; activating that cell expands the drawer with the group open.
 *
 * Its row is a `<button aria-expanded aria-controls>` named by its label, and its items a nested list labelled by it.
 * Activating the row sets `open` and then fires `toggle`; with focus on the row, the arrow toward the end of the line
 * opens it and the one toward the start closes it (NVD-45).
 *
 * A destination as well (NVD-66, NVD-67): while the drawer's `selectable-groups` is set and the group has a `value` or
 * an `href`, its row is that destination — a `<button>`, or with `href` an `<a href>`, `aria-current="page"` while
 * selected — which the drawer selects and fires `change` or `reselect` for as it does for an item, and its chevron is a
 * second `<button aria-expanded aria-controls>` over the end of the row, named by its label, that alone opens and closes
 * it. Collapsed, its cell is the destination alone.
 *
 * @tag tanrei-navigation-drawer-group
 * @slot - `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children.
 * @csspart cell - The row: the native button (or, for a group that is a link, the anchor), the hit area.
 * @csspart toggle - The chevron's own button, while the group is a destination (hidden from nothing: it is named by the group's label and carries its expanded state).
 * @csspart container - The item container (the state layer's box, the focus ring's and the ripple's).
 * @csspart active-indicator - The fill of the item container (drawn selected while the group shows the selection, NVD-47).
 * @csspart icon-indicator - The box behind the icon alone.
 * @csspart icon - The glyph (hidden from assistive technology).
 * @csspart label - The label (hidden from assistive technology: the row is named by it).
 * @csspart short-label - The short label under the icon while collapsed.
 * @csspart chevron - The expand_more glyph (hidden from assistive technology).
 * @csspart items - The list of its items.
 * @fires {CustomEvent<TanreiNavigationDrawerToggleDetail>} toggle - The user opened or closed the group from its row, or from its cell in the collapsed drawer, or the drawer opened it to show the selected destination (`reveal-selected`, NVD-58): `detail.open` (and `open`) is its new state. Bubbles.
 */
export class TanreiNavigationDrawerGroup extends DrawerCell {
  static override styles = [cellStyles, groupStyles];

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    // Its own accessor (below): a link without a value reads its href. Reflected by hand, as it was given.
    value: { type: String, noAccessor: true },
    href: { type: String },
    openIcon: { type: String, attribute: 'open-icon' },
    loading: { type: Boolean, reflect: true },
    pin: { state: true },
  };

  /** Whether its items are shown under its row while the drawer is expanded. Reflected; the drawer sets it on activation. */
  open = false;

  /** A second glyph, drawn in the icon's place while the group is open (`folder_open` beside `folder`, NVD-68). */
  openIcon = '';

  /** The product is fetching the group's items: while open, a loading row is drawn under them and the list is busy (NVD-76). */
  loading = false;

  /** NVD-77: where the row is pinned (its distance from the top of the space the items scroll in), and whether it is the last pinned row; null while it is not. */
  private pin: { top: number; last: boolean } | null = null;

  /** @internal NVD-77: the drawer pins the row, or lets it go. */
  setPinned(pin: { top: number; last: boolean } | null) {
    const now = this.pin;
    if (now === pin || (now && pin && now.top === pin.top && now.last === pin.last)) return;
    this.pin = pin;
  }

  /** @internal NVD-77: the row is pinned now. */
  get isPinned(): boolean {
    return !!this.pin;
  }

  /** @internal NVD-77: the row's height, for the rows pinned under it. */
  get rowHeight(): number {
    const row = this.renderRoot?.querySelector<HTMLElement>('.split, .cell, .static');
    return row?.offsetHeight ?? 0;
  }

  /** @internal The row the drawer measures and pins: the row's own box (the split of a destination group). */
  get rowBox(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.split, .cell, .static') ?? null;
  }

  /** NVD-68: while open (and drawn so), a group draws its openIcon where it has one. */
  protected override get glyphName(): string {
    return this.drawnOpen && this.openIcon && !this.context.collapsed && this.context.expandable ? this.openIcon : this.icon;
  }

  /** @internal NVD-84: drawn open — its `open`, or opened for the filter while its `open` says nothing of it. */
  get drawnOpen(): boolean {
    return this.open || this.context.filterOpen;
  }

  /** NVD-68: the start chevron, chevron_right turned a quarter turn while open (the icon set mirrors it in right-to-left). */
  protected override startChevron() {
    return html`<span part="chevron" class="chevron start">chevron_right</span>`;
  }

  private given = '';

  /**
   * What identifies the group as a destination while the drawer's `selectable-groups` is set (NVD-66): the drawer's
   * `value` selects it by this, and `change` / `reselect` carry it. While it is given none, its `href` stands for it, as
   * written. Ignored while the drawer's groups are not selectable.
   */
  get value(): string {
    return this.given || (readDestination(this.href).href ?? '');
  }

  set value(value: string) {
    const before = this.value;
    this.given = value ?? '';
    this.requestUpdate('value', before);
  }

  /** The address the group leads to as a destination (NVD-66): its row is then a link, opened where the person is. Ignored while the drawer's groups are not selectable. */
  href = '';

  /** @internal A group's link always opens where the person is: these are not props of a group. */
  readonly target = 'same';
  /** @internal */
  readonly targetLabel = '';
  /** @internal */
  readonly rel: string | null = null;
  /** @internal */
  readonly download: string | null = null;

  /** NVD-59, NVD-64: the link the row is while the group is a destination with an address (src/primitives/link.ts). */
  private readonly link = new LinkController(this, { ids: { refused: 'NVD-64', newContext: 'NVD-63' }, disabled: () => this.disabled });

  /** The link the row is now: only while the group is a destination. */
  private get linkForm() {
    return this.context.destination ? this.link.form : null;
  }

  /** NVD-1, NVD-59: the row of a group that is a link is pressed by Enter alone. */
  protected override get pressKeys(): readonly string[] | undefined {
    return this.linkForm ? this.link.pressKeys : undefined;
  }

  /** @internal The drawer's side (`DestinationsController`), while the group is a destination. */
  setDestinationContext(context: DestinationContext) {
    this.setDrawerContext({ ...REST, ...context });
  }

  /** @internal NVD-60: as an item's, for the row of a group that is a link. */
  linkActivation(event: MouseEvent): { href: string; counted: boolean } | null {
    const form = this.linkForm;
    if (!form) return null;
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
    return { href: this.href, counted: plain && !form.disabled && !form.opensNew };
  }

  /** @internal NVD-67: whether a click came from the group's row (the destination), and not from its chevron or its items. */
  activatedBy(event: Event): boolean {
    const path = event.composedPath();
    return !!this.cell && path.includes(this.cell);
  }

  private get toggle(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.toggle') ?? null;
  }

  /** @internal NVD-36: the chevron's own button has focus (the collapsed form does not draw it). */
  get toggleFocused(): boolean {
    const toggle = this.toggle;
    return !!toggle && this.shadowRoot?.activeElement === toggle;
  }

  /** @internal Opens or closes the group as its user did, and fires `toggle` (NVD-45, NVD-47). */
  setOpenByUser(open: boolean) {
    if (this.disabled) return;
    // NVD-84: opened or closed by the person while a filter is applied — the filter stops opening it until its text
    // changes; a group the filter had opened that the person closes changes no `open`, and nothing is emitted for it.
    this.drawer?.filterToggled(this, open);
    if (this.open === open) return;
    this.open = open;
    this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerToggleDetail>('toggle', { bubbles: true, detail: { open } }));
  }

  /**
   * @internal NVD-58: the drawer opens the group to show the selected destination inside it — a disabled group too —
   * and the group fires `toggle`. In the drawer's first frame it is drawn open without the motion of NVD-44 (the
   * drawer's `data-arriving`); afterwards with it.
   */
  openForSelection(firstFrame = false) {
    if (firstFrame) this.shownInFirstFrame = true;
    if (this.open) return;
    this.open = true;
    this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerToggleDetail>('toggle', { bubbles: true, detail: { open: true } }));
  }

  /** NVD-58: the drawer opened this group to show the selection while building its first frame. */
  private shownInFirstFrame = false;

  protected override willUpdate(changed: PropertyValues<this>) {
    // NVD-58, NVD-62: until the drawer's first frame is drawn, a group it opened for the selection is open whatever
    // its `open` is told — a state the product gave back loses to `reveal-selected`. A property set on the element
    // before it was upgraded is given to it only at its first update, after the drawer has looked at it and opened
    // it; and a page's script may run after the upgrade and still before the frame. The drawer has said that the
    // group is open (its one `toggle`): nothing is said again.
    if (this.shownInFirstFrame && !this.open && this.drawer?.arriving) this.open = true;
    super.willUpdate(changed);
  }

  /** @internal Resolves once the motion that opens or closes the group has ended (at once where there is none). */
  async settled(): Promise<void> {
    await this.updateComplete;
    const fold = this.renderRoot?.querySelector('.items');
    const running = typeof fold?.getAnimations === 'function' ? fold.getAnimations() : [];
    await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
  }

  private get drawer(): TanreiNavigationDrawer | null {
    return (this.closest(DRAWER) as TanreiNavigationDrawer | null) ?? null;
  }

  private readonly onClick = () => {
    this.hideName();
    if (this.disabled) return;
    // NVD-66, NVD-67: the row of a group that is a destination chooses it — the drawer's own click listener does, as for
    // an item — and neither opens nor closes it, in either form.
    if (this.context.destination) return;
    // NVD-72: a group that does not open and close has nothing to do; collapsed, its cell still expands the drawer.
    if (!this.context.expandable && !this.context.collapsed) return;
    // NVD-47: a group's cell in the collapsed drawer expands the drawer with the group open.
    if (this.context.collapsed) {
      this.drawer?.expandToGroup(this);
      return;
    }
    this.setOpenByUser(!this.drawnOpen);
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const arrow = this.arrow(event.key);
    if (arrow && !this.context.collapsed && this.context.expandable) {
      // NVD-45: toward the end opens a closed group; toward the start closes an open one, or leaves for the group above.
      if (arrow === 'end' && !this.drawnOpen) {
        event.preventDefault();
        this.setOpenByUser(true);
        return;
      }
      if (arrow === 'start' && this.drawnOpen) {
        event.preventDefault();
        this.setOpenByUser(false);
        return;
      }
      if (this.leaveToGroup(event)) return;
    }
    this.press.onKeyDown(event);
  };

  /** NVD-67: the chevron's own button opens and closes the group, and chooses nothing. */
  private readonly onToggle = () => {
    if (this.disabled) return;
    this.setOpenByUser(!this.drawnOpen);
  };

  /** NVD-67: on the chevron, Enter and Space press it (shown on the item container); the arrows open and close as on the row. */
  private readonly onToggleKeyDown = (event: KeyboardEvent) => {
    const arrow = this.arrow(event.key);
    if (arrow === 'end' && !this.drawnOpen) {
      event.preventDefault();
      this.setOpenByUser(true);
      return;
    }
    if (arrow === 'start' && this.drawnOpen) {
      event.preventDefault();
      this.setOpenByUser(false);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) this.press.press(null);
  };

  private readonly onToggleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') this.press.release(event);
  };

  private readonly onToggleFocus = () => syncFocusStyle(this, this.toggle);

  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    // NVD-68: without a chevron, a group that has no icon shows nothing on screen of being open or closed.
    if (this.context.chevron === 'none' && this.context.expandable && !this.icon && !this.openIcon && this.hasUpdated) report(this, 'NVD-68', `the group "${this.label}" has no icon and no openIcon while chevron is none, so nothing on screen shows whether it is open; give it an icon`);
    // NVD-46: a group without a label is a button and a list without a name.
    if (changed.has('label') && !this.label.trim() && !namedByProduct(this)) report(this, 'NVD-46', 'label is empty, so the group has no accessible name; give it a label');
    // The value as it was given, for a selector or a product that reads it; an href is not written back as one.
    if (changed.has('value')) {
      if (this.given) {
        if (this.getAttribute('value') !== this.given) this.setAttribute('value', this.given);
      } else if (this.hasAttribute('value')) this.removeAttribute('value');
    }
    notifyDestinationUpdate(this, changed);
  }

  /** NVD-72: the items are shown: open (or every group open while groups do not open and close), and the drawer expanded. */
  private get shown(): boolean {
    return (this.drawnOpen || !this.context.expandable) && !this.context.collapsed;
  }

  /** NVD-68: where the group's own toggle stands while its row is a destination: over its chevron, or its icon (none). */
  private get toggleAt(): 'start' | 'end' | 'icon' | null {
    const { chevron, expandable, collapsed } = this.context;
    if (!expandable || collapsed) return null;
    if (chevron === 'none') return this.icon ? 'icon' : null;
    return chevron;
  }

  /** NVD-77: the pinned row's place and its edge. */
  private pinStyle(): StyleInfo {
    return this.pin ? { '--_pin-top': `${this.pin.top}px` } : {};
  }

  private pinClasses(): ClassInfo {
    return { pinned: !!this.pin, 'pinned-last': !!this.pin?.last };
  }

  protected override render() {
    const shown = this.shown;
    const { destination, expandable, collapsed } = this.context;
    if (destination) return this.renderDestination(shown);
    // NVD-72: a group that does not open and close is not a control while the drawer is expanded: its row names the list.
    if (!expandable && !collapsed) {
      return html`<div
          id="row"
          class=${classMap({ ...this.cellClasses({ open: true, static: true }), ...this.pinClasses() })}
          style=${styleMap({ ...this.cellStyle(), ...this.pinStyle() })}
          aria-hidden="true"
          ${delegatedAria(this, { 'aria-label': this.label })}
          @pointerenter=${this.onPointerEnter}
          @pointerleave=${this.onPointerLeave}
        >
          ${this.row(this.trailingContent(false))}
        </div>
        ${this.fold(shown)}`;
    }
    const description = this.described();
    return html`<button
        part="cell"
        id="row"
        class=${classMap({ ...this.cellClasses({ open: shown }), ...this.pinClasses() })}
        style=${styleMap({ ...this.cellStyle(), ...this.pinStyle() })}
        type="button"
        ?disabled=${this.disabled}
        ${delegatedAria(this, { 'aria-label': this.label, 'aria-description': description })}
        aria-expanded=${expandable || collapsed ? String(shown) : nothing}
        aria-controls="items"
        @click=${this.onClick}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerenter=${this.onPointerEnter}
        @pointerleave=${this.onPointerLeave}
        @keydown=${this.onKeyDown}
        @keyup=${this.press.onKeyUp}
        @blur=${this.onBlur}
        @focus=${this.onFocus}
      >
        ${this.row(this.trailingContent(false, this.endChevron()))}
      </button>
      ${this.fold(shown)}`;
  }

  /** The row's description: the product's aria-description on the host first (src/primitives/delegated-aria.ts), then its own. */
  private described(): string {
    return [this.getAttribute('data-aria-description'), ...this.rowDescription].filter(Boolean).join(', ');
  }

  /** NVD-44, NVD-68: the chevron at the very end of the row, after its trailing content, while chevron is end. */
  private endChevron() {
    const { chevron, expandable } = this.context;
    if (!expandable || (chevron !== 'end' && !this.context.collapsed)) return nothing;
    return html`<span part="chevron" class="chevron end">expand_more</span>`;
  }

  /**
   * NVD-44, NVD-46, NVD-73, NVD-76: the items, revealed and hidden under the row, a list named by the group's label, busy
   * while the group is loading; the guide line beside them; and the loading row after them.
   */
  private fold(shown: boolean) {
    const { guides, guideAt, childInset, highlight } = this.context;
    const loading = this.loading && shown;
    const loadingLabel = this.drawer?.loadingLabel ?? '';
    return html`<div class=${classMap({ items: true, shown })} ?inert=${!shown}>
      <div class=${classMap({ fold: true, [`guides-${guides}`]: true })} style=${styleMap({ '--_guide-at': guideAt, '--_child-inset': childInset })}>
        <div part="items" id="items" class="list" role="list" aria-labelledby="row" aria-busy=${this.loading ? 'true' : nothing}><slot></slot></div>
          ${loading
            ? html`<div class=${classMap({ 'loading-row': true, 'highlight-full': highlight === 'full' })} role="none" aria-hidden=${loadingLabel ? nothing : 'true'}>
                <span class="loading-box"><tanrei-loading-indicator size="small" label=${loadingLabel}></tanrei-loading-indicator></span>
                ${loadingLabel ? html`<span class="loading-label" aria-hidden="true">${loadingLabel}</span>` : nothing}
              </div>`
            : nothing}
      </div>
    </div>`;
  }

  /**
   * NVD-66, NVD-67: a group that is a destination. Its row is the destination — the link or the button an item is, with
   * `aria-current` while it is the selected one — and, while the drawer is expanded and its groups open and close, its
   * own toggle is a button of its own laid over its chevron (start or end) or, without a chevron, over its icon, after the
   * row in the focus order, which alone opens and closes the group.
   */
  private renderDestination(shown: boolean) {
    const { current } = this.context;
    const classes = classMap(this.cellClasses({ open: shown }));
    const style = styleMap(this.cellStyle());
    const form = this.linkForm;
    const content = this.row(this.trailingContent(false, this.endChevron()));
    const description = this.described();
    const row = form
      ? html`<a
          part="cell"
          id="row"
          class=${classes}
          style=${style}
          ${linkAttributes(form)}
          ${delegatedAria(this, { 'aria-current': current && 'page', 'aria-label': this.label, 'aria-description': description })}
          @click=${this.onClick}
          @pointerdown=${this.press.onPointerDown}
          @pointerup=${this.press.release}
          @pointercancel=${this.press.release}
          @pointerenter=${this.onPointerEnter}
          @pointerleave=${this.onPointerLeave}
          @keydown=${this.onKeyDown}
          @keyup=${this.press.onKeyUp}
          @blur=${this.onBlur}
          @focus=${this.onFocus}
          >${content}</a
        >`
      : html`<button
          part="cell"
          id="row"
          class=${classes}
          style=${style}
          type="button"
          ?disabled=${this.disabled}
          ${delegatedAria(this, { 'aria-current': current && 'page', 'aria-label': this.label, 'aria-description': description })}
          @click=${this.onClick}
          @pointerdown=${this.press.onPointerDown}
          @pointerup=${this.press.release}
          @pointercancel=${this.press.release}
          @pointerenter=${this.onPointerEnter}
          @pointerleave=${this.onPointerLeave}
          @keydown=${this.onKeyDown}
          @keyup=${this.press.onKeyUp}
          @blur=${this.onBlur}
          @focus=${this.onFocus}
        >
          ${content}
        </button>`;
    const at = this.toggleAt;
    const toggle = at
      ? html`<button
          part="toggle"
          class=${classMap({ toggle: true, [`toggle-${at}`]: true })}
          type="button"
          data-tanrei-shape
          ?disabled=${this.disabled}
          aria-label=${this.label || nothing}
          aria-expanded=${String(shown)}
          aria-controls="items"
          @click=${this.onToggle}
          @pointerdown=${this.press.onPointerDown}
          @pointerup=${this.press.release}
          @pointercancel=${this.press.release}
          @keydown=${this.onToggleKeyDown}
          @keyup=${this.onToggleKeyUp}
          @focus=${this.onToggleFocus}
          @blur=${this.press.onBlur}
        ></button>`
      : nothing;
    return html`<div class=${classMap({ split: true, ...this.pinClasses() })} style=${styleMap({ ...this.cellStyle(), ...this.pinStyle() })}>${row}${toggle}</div>
      ${this.fold(shown)}`;
  }
}

/**
 * A group of a drawer's destinations and groups under an optional heading — the spec's item kind `section`:
 * the divider component before it while `divider` is set, its heading (a heading, level 2 unless `heading-level` says
 * otherwise) and its children. Sections do not nest and do not go inside a group: such a section draws only its items,
 * in its place, and a debug build says so (NVD-17). Collapsed, its heading keeps its row and draws no text (NVD-16).
 *
 * @tag tanrei-navigation-drawer-section
 * @slot - `<tanrei-navigation-drawer-item>` and `<tanrei-navigation-drawer-group>` children.
 * @csspart heading - The heading row.
 */
export class TanreiNavigationDrawerSection extends TanreiElement {
  static override styles = sectionStyles;

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    divider: { type: Boolean, reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level' },
    nested: { state: true },
    collapsed: { state: true },
  };

  /** The text that names the items under it (the spec's `title`), exposed as a heading. Empty draws no heading row. */
  headline = '';

  /** Draws a divider (the divider component) before the section. */
  divider = false;

  /** Web only: the heading's level, 1 to 6. */
  headingLevel = 2;

  private nested = false;
  private collapsed = false;

  override connectedCallback() {
    super.connectedCallback();
    const outer = this.parentElement?.closest(`${SECTION}, ${GROUP}`);
    this.nested = !!outer;
    if (outer?.localName === SECTION) report(this, 'NVD-17', 'a section holds a section; sections do not nest, so the inner one draws only its items, in its place');
    else if (outer) report(this, 'NVD-17', 'a group holds a section; sections do not go inside a group, so it draws only its items, in its place');
  }

  /** @internal The drawer's side: the drawer's form, and whether a filter leaves the section no row to show (NVD-82). */
  setDrawerContext({ collapsed, filterHidden = false }: { collapsed: boolean; filterHidden?: boolean }) {
    this.collapsed = collapsed;
    // NVD-82: hidden with its heading and its divider (the styles' display), not a property of the product's.
    this.toggleAttribute('data-filter-hidden', filterHidden);
  }

  protected override updated() {
    // NVD-23: a list item of the drawer's list (a nested one is nothing: its items are its parent's).
    this.setAttribute('role', this.nested ? 'none' : 'listitem');
    this.toggleAttribute('data-nested', this.nested);
  }

  protected override render() {
    if (this.nested) return html`<slot></slot>`;
    const level = Math.min(6, Math.max(1, Math.round(Number(this.headingLevel) || 2)));
    return html`<div class=${classMap({ section: true, collapsed: this.collapsed })}>
      ${this.divider ? html`<tanrei-divider></tanrei-divider>` : nothing}
      ${this.headline
        ? html`<div part="heading" class="heading" role="heading" aria-level=${level} aria-hidden=${this.collapsed ? 'true' : nothing}><span class="heading-text">${this.headline}</span></div>`
        : nothing}
      <div class="items" role="list"><slot></slot></div>
    </div>`;
  }
}

/** Where a cell stands: how many groups hold it, and its position among the cells of its level. */
interface Place {
  level: number;
  position: number;
  size: number;
  /** NVD-69: where the row begins, past the drawer's padding (a CSS length), and where its items' rows begin. */
  inset: string;
  childInset: string;
  /** NVD-71: it keeps the icon's room. */
  iconRoom: boolean;
  /** NVD-73: a group's guide line, from the cell's start edge (a CSS length). */
  guideAt: string;
}

/** The lengths the row model is reckoned in, as the cells read them (the drawer's density, NVD-65). */
const LEN = {
  pad: 'var(--tanrei-comp-navigation-drawer-container-padding-inline)',
  itemPad: 'var(--_nvd-pad)',
  gap: 'var(--tanrei-comp-navigation-drawer-item-gap)',
  icon: 'var(--_nvd-icon)',
  chevron: 'var(--_nvd-trailing-icon)',
  nest: 'var(--_nvd-indent)',
  /** NVD-69, NVD-97: the expanded width the rows are laid out at (the person's beside the content). */
  width: 'var(--_nvd-w, var(--tanrei-comp-navigation-drawer-container-width))',
  /** Where a row's first part begins when it is a chevron or an icon: the icon on the icon column (NVD-13). */
  first: 'calc(var(--_nvd-column) / 2 - var(--tanrei-comp-navigation-drawer-container-padding-inline) - var(--_nvd-icon) / 2)',
} as const;

/** NVD-81…86: what a filter does at a sync. */
interface FilterState {
  /** A filter is applied: filterable, a word typed, and the drawer expanded (NVD-79, NVD-81). */
  applied: boolean;
  /** The rows that match. */
  matches: Set<DrawerCell>;
  /** The rows (and sections) a filter hides (NVD-82). */
  hidden: Set<Element>;
  /** The closed groups drawn open for the filter (NVD-84). */
  opened: Set<TanreiNavigationDrawerGroup>;
  /** The first row shown that matches and is not disabled (NVD-86). */
  active: DrawerCell | null;
}

const NO_FILTER: FilterState = { applied: false, matches: new Set(), hidden: new Set(), opened: new Set(), active: null };

/** What the drawer knows at a sync: what shows the selection, its top-level cells, and where every cell stands. */
interface Snapshot {
  /** The selected destination: an item, or a group that is a destination (NVD-66). */
  selected: DrawerCell | null;
  /** The cell drawn selected: the selected destination, or the group that shows it (NVD-47). */
  shower: DrawerCell | null;
  top: DrawerCell[];
  /**
   * Every cell's place, from one walk of the drawer's children: a sync tells each of a long drawer's cells what it is
   * (a site's sidebar has some eighty), and asking the document once per cell made that walk quadratic.
   */
  places: Map<Element, Place>;
}

/**
 * A panel of destinations at the start edge, in two variants — `standard`, a layout region beside the content,
 * and `modal`, a modal overlay over a scrim that closes itself after a destination is chosen — and, while `collapsible`,
 * in two forms: expanded, and collapsed to a column of icons, which is the expanded drawer with its labels gone: every
 * row is the same row cut after its icon, at the same height and with the same corners, and every icon exactly in place
 * while the drawer moves between the two. A collapsed cell shows its name in a plain tooltip on hover and keyboard focus;
 * `collapsed-labels` draws short labels under the icons instead, for a product or a system whose column is labelled.
 *
 * Contract: specs/navigation-drawer.spec.json. `<tanrei-navigation-drawer-item>`, `<tanrei-navigation-drawer-group>` and
 * `<tanrei-navigation-drawer-section>` children, in order; header buttons (icon-only `<tanrei-button>`s) with
 * `slot="header-button"`, the main action (`<tanrei-main-action-button>`) with `slot="main-action"`, and the `header`
 * slot. The drawer's `value` is the selected destination's value; the drawer sets it when a button destination is
 * activated and fires `change`, or `reselect` for the selected one.
 *
 * A site's sidebar (NVD-57…64): a destination with `href` is a link, and the selected destination is the current page
 * (`aria-current="page"`) — one state, which in a site of separate pages the page says, through `value` (a link without
 * a `value` takes its `href`). The drawer never writes `value` for a link: a plain activation fires `change` or
 * `reselect` with `detail.href`, cancelable, before the browser follows the link (a router cancels it and goes to
 * `detail.href` itself), and then closes a modal drawer; a modified or a middle click, a link whose `target` is `new`
 * and a download fire nothing and close nothing. The row that shows the selection is brought into view when the drawer
 * first appears and whenever `value` changes — centred if it was not wholly in view, untouched if it was, without motion
 * and without moving focus — and `reveal-selected` opens the groups that hold it (each fires `toggle`). `scrollOffset`
 * reads and writes how far the items are scrolled; the scroll does not chain to the page. Nothing is stored: a site keeps
 * each group's `open` (from `toggle`) and `scrollOffset` (read on `pagehide`) itself and gives them back as attributes.
 *
 * Forms (NVD-30): not collapsible, always expanded. Collapsible and standard: `expanded` chooses. Collapsible and modal:
 * collapsed — its column in the layout, drawn as a standard drawer's — while closed, and expanded over the content while
 * open. The first header button is then the menu button: the drawer sets `aria-expanded` and `aria-controls` on its
 * native button (`ariaExpanded`, `ariaControlsElements`), and its activation asks for the other form: the drawer sets
 * `expanded` (or `open`) and fires `expandedchange`. The main action's `collapsed` follows the form. The read-only
 * `collapsed` attribute reflects the form.
 *
 * Standard: a `<nav>` named by `label`, taking its form's width in the layout while `open` and none while closed (sliding
 * while the content beside it resizes). Opening it moves focus in; closing it with focus inside returns focus to where it
 * was; Tab leaves it without closing it.
 *
 * Modal: a native `<dialog>` in the shadow root, opened with `showModal()` while `open` — in the top layer over its
 * `::backdrop` (the scrim), everything else inert, the page held from scrolling, focus kept inside. Escape, the platform's
 * back, a press on the scrim, a drag toward the start edge past half its width (or a fling), the menu button and a
 * destination's activation close it: the drawer sets `open` to false itself and fires `close`. Focus returns to where it
 * was.
 *
 * Responsive (NVD-53…55): with `responsive`, the window's width chooses what the drawer is, and `variant` is ignored —
 * a standard drawer, shown whatever `open` says in the form `expanded` gives it (one that is not collapsible is hidden
 * while `expanded` is false), from `comp.navigation-drawer.breakpoint.expanded` (1024 px at the default text size); its
 * column, widening over the content while `open`, from `breakpoint.collapsed` (600 px) while `collapsible`; a modal
 * drawer below that. The read-only `presentation` says which (and the `presentation` attribute, for styling);
 * `presentationchange` fires when it is first decided and whenever the width changes it. A change between the column
 * and the modal presentations keeps `open`; the standard presentation ends the one over the content (`open` is false
 * and `close` fires once). Every change keeps `expanded`, `value` and every group's `open`. The presentation is derived
 * from the width alone: it is never written to `variant`, `open` or `expanded`, and the element stores nothing — a
 * product that wants the user's choice of form remembered keeps what `expandedchange` carries and sets `expanded` from
 * it. Outside an app shell a change of presentation is drawn at once.
 *
 * Held by an app shell whose header slot is filled (NVD-19, NVD-23, NVD-54): the drawer is one `<nav>` in every
 * presentation, never a `<dialog>`. Open over the content it is drawn below the header with a scrim of its own that
 * covers only what lies below the header, keeps no focus inside it and makes nothing inert itself — the shell makes the
 * regions under the scrim inert and holds the page's scroll — and stays the navigation landmark. A change of
 * presentation moves that one panel to its new place and form over `motion.expand`.
 *
 * Resizable (NVD-96…104), on by default: where the drawer stands beside the content it has a resize handle on its end
 * edge — a `<tanrei-handle reach="edge">`, out of sight until a fine pointer comes over the edge or it has focus, and one
 * Tab stop after the drawer's content: a window splitter (`role="separator"`) named by `resize-label` or else `label`,
 * whose value is the width drawn and which controls the navigation. A drag changes the width, following the press; a
 * collapsible drawer folds to its column past halfway between its column and its least width, and unfolds again past
 * it. The arrow keys change it by 10 (with Shift, or Page Up and Page Down, by 100), Home and End give the least and the
 * greatest width, and Enter, Space or a press without a drag fold and unfold a collapsible drawer, or give another its
 * default width and back. The drawer then writes `width` (and `expanded`) and fires `widthchange` (and
 * `expandedchange`); it stores nothing: a product keeps what `widthchange` carries and gives it back as `width` — and, in
 * a page rendered before the element is defined, as `--tanrei-navigation-drawer-width` on the element, which the drawer
 * writes itself from `width` once defined and which an app shell reads. A drawer over the content keeps
 * container.width. `resizable="false"` leaves the handle out.
 *
 * Every visual value comes from `--tanrei-comp-navigation-drawer-*` tokens. The color reaches under
 * `env(safe-area-inset-*)` at the start, top and bottom.
 *
 * @tag tanrei-navigation-drawer
 * @slot - `<tanrei-navigation-drawer-item>`, `<tanrei-navigation-drawer-group>` and `<tanrei-navigation-drawer-section>` children.
 * @slot header-button - Icon-only `<tanrei-button>`s stacked in the icon column; the first is the menu button while the drawer is collapsible.
 * @slot main-action - A `<tanrei-main-action-button>` below the header buttons, collapsed to its icon with the drawer. Only the first is drawn.
 * @slot header - Content beside the first header button while the drawer is expanded (a title, an account switcher). Its box gives what it holds the header's inherited text style and color (`comp.navigation-drawer.header.typescale` and `.color`): plain text is drawn in them, and an element that sets its own keeps it.
 * @csspart container - The panel: the `<nav>` of a standard drawer (or a collapsible modal drawer's column), the `<dialog>` of a modal one.
 * @csspart outline - The end edge.
 * @csspart header - The header, which stays in place.
 * @csspart content - The list of items, which scrolls.
 * @csspart filter - The filter field (NVD-79): a `<tanrei-text-input type="search">` between the header and the items, while `filterable` and expanded.
 * @csspart resize-handle - The resize handle on the end edge (NVD-96): a `<tanrei-handle>`, while the drawer is resizable and stands beside the content.
 * @csspart filter-status - The line at the top of the results while a filter is applied (NVD-90): how many rows match, or the words for none. Hidden from assistive technology (the drawer's status says the same).
 * @fires {CustomEvent<TanreiNavigationChangeDetail>} change - The user activated another destination: `detail.value` (and, for a button destination, the drawer's `value`) is its value. For a link it is fired before the link is followed, only for a plain activation of a link that opens in place, carries `detail.href`, leaves `value` to the page, and is cancelable: `preventDefault()` stops the browser's navigation.
 * @fires {CustomEvent<TanreiNavigationChangeDetail>} reselect - The user activated the selected destination again; for a link, as `change`.
 * @fires close - A modal drawer closed: the scrim, Escape, back, a drag, the menu button, or after a destination was activated. `open` is already false.
 * @fires {CustomEvent<TanreiNavigationDrawerExpandedChangeDetail>} expandedchange - The user asked for the drawer's other form — a collapsible drawer's (its menu button or an app shell's, its resize handle, or a group's cell while collapsed), or the standard presentation of a responsive drawer with no collapsed form shown or hidden (an app shell's menu button): `detail.expanded`. `expanded` (or, for a modal drawer, `open`) already holds it.
 * @fires {CustomEvent<TanreiNavigationDrawerFilterChangeDetail>} filterchange - The person changed the filter text (typing, deleting, pasting, an input method, the clear button, Escape): `detail.value` (and `filterValue`) is the new text. Not fired when the product sets `filterValue`.
 * @fires {CustomEvent<TanreiNavigationDrawerWidthChangeDetail>} widthchange - A person changed the width of the drawer beside the content — a drag that ended at a new width, a key, a press on the edge: `detail.width` (and `width`) in CSS pixels. Not fired when the product sets `width`, nor for a drag that only folds or unfolds the drawer.
 * @fires {CustomEvent<TanreiNavigationDrawerPresentationChangeDetail>} presentationchange - A responsive drawer decided its presentation for the first time, or the window's width changed it: `detail.presentation` (and `presentation`) is `standard`, `column` or `modal`. A product shows its own menu button while it is `modal`.
 */
export class TanreiNavigationDrawer extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'navigation-drawer');
  static override styles = drawerStyles;

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    open: { type: Boolean, reflect: true },
    collapsible: { type: Boolean, reflect: true },
    expanded: {
      type: Boolean,
      reflect: true,
      // True unless the attribute says "false": a boolean that defaults to true cannot be turned off by absence.
      converter: { fromAttribute: (value: string | null) => value !== 'false', toAttribute: (value: boolean) => (value ? '' : 'false') },
    },
    collapsedLabels: { type: String, attribute: 'collapsed-labels', reflect: true },
    density: { type: String, reflect: true },
    chevron: { type: String, reflect: true },
    guides: { type: String, reflect: true },
    indent: {
      // auto (or no attribute) is null; a number is that many pixels.
      converter: {
        fromAttribute: (value: string | null) => (value === null || value.trim() === '' || value.trim() === 'auto' ? null : Number(value)),
        toAttribute: (value: number | null) => (value === null || value === undefined ? null : String(value)),
      },
    },
    highlight: { type: String, reflect: true },
    iconSpace: { type: String, attribute: 'icon-space', reflect: true },
    expandable: {
      type: Boolean,
      reflect: true,
      // True unless the attribute says "false", as expanded.
      converter: { fromAttribute: (value: string | null) => value !== 'false', toAttribute: (value: boolean) => (value ? '' : 'false') },
    },
    labelWrap: { type: Boolean, attribute: 'label-wrap', reflect: true },
    supportingWrap: { type: Boolean, attribute: 'supporting-wrap', reflect: true },
    stickyParents: { type: Boolean, attribute: 'sticky-parents', reflect: true },
    stickyMax: { type: Number, attribute: 'sticky-max' },
    loadingLabel: { type: String, attribute: 'loading-label' },
    filterable: { type: Boolean, reflect: true },
    filterValue: { type: String, attribute: 'filter-value' },
    filterLabel: { type: String, attribute: 'filter-label' },
    filterPlaceholder: { type: String, attribute: 'filter-placeholder' },
    filterEmptyText: { type: String, attribute: 'filter-empty-text' },
    filterCountText: { type: String, attribute: 'filter-count-text' },
    filterCountHidden: { type: Boolean, attribute: 'filter-count-hidden', reflect: true },
    filterClearLabel: { type: String, attribute: 'filter-clear-label' },
    filterShortcut: { converter: chordsConverter, attribute: 'filter-shortcut' },
    filterSaid: { state: true },
    fieldFocused: { state: true },
    responsive: { type: Boolean, reflect: true },
    resizable: {
      type: Boolean,
      reflect: true,
      // True unless the attribute says "false", as expandable.
      converter: { fromAttribute: (value: string | null) => value !== 'false', toAttribute: (value: boolean) => (value ? '' : 'false') },
    },
    width: { type: Number, reflect: true },
    minWidth: { type: Number, attribute: 'min-width' },
    maxWidth: { type: Number, attribute: 'max-width' },
    resizeLabel: { type: String, attribute: 'resize-label' },
    resizeValues: { state: true },
    decided: { state: true },
    value: { type: String },
    revealSelected: { type: Boolean, attribute: 'reveal-selected' },
    selectableGroups: { type: Boolean, attribute: 'selectable-groups' },
    // Its own accessor (below): the scroller's present offset. The attribute is read once, for the first frame.
    scrollOffset: { type: Number, attribute: 'scroll-offset', noAccessor: true },
    label: { type: String },
    hasButtons: { state: true },
    hasTitle: { state: true },
    hasMain: { state: true },
    presented: { state: true },
    narrowing: { state: true },
    measured: { state: true },
    held: { state: true },
  };

  /** Standard sits beside the content; modal lays itself over it with a scrim and holds focus until it closes. Ignored while `responsive`. Reflected. */
  variant: TanreiNavigationDrawerVariant = 'standard';

  /** Whether the drawer is shown: a standard one takes its place in the layout, a modal one is presented. While `responsive` it only opens the presentations that lie over the content: a change between those presentations keeps it, and the drawer's coming to stand beside the content sets it back to false. Reflected. */
  open = false;

  /** Gives the drawer its collapsed form, the icon column. Reflected. */
  collapsible = false;

  /** The form of a collapsible standard drawer: true for the full drawer, false for the icon column (`expanded="false"`). For a responsive drawer that is not collapsible, whether its standard presentation is shown (true) or hidden (false). The user's choice: a change of the window's width never writes it. Reflected. */
  expanded = true;

  /** Which cells draw their short label under the icon while collapsed: `never` (the default: a collapsed drawer is the expanded one with its labels gone), `selected` or `always` (anything else is `never`). */
  collapsedLabels: TanreiNavigationDrawerCollapsedLabels = 'never';

  /**
   * How much room a row takes (NVD-65): `regular`, a menu item's row, for a product used by touch as well as by pointer;
   * `compact`, a tree view's compact row, for a tool used with a pointer whose drawer lists many places. The rows, the
   * headings, the gaps, the nesting indent and the collapsed column follow it; for touch a row is never lower than the
   * touch target. A value a design system added is drawn from its own tokens; one the active system lacks is drawn as
   * `regular` and reported (NVD-26). Reflected.
   */
  density: TanreiNavigationDrawerDensity = 'regular';

  /** Where a group's chevron is drawn (NVD-68): `start` (the default), `end` or `none`. A collapsible drawer draws start as end. Reflected. */
  chevron: 'start' | 'end' | 'none' = 'start';

  /** The guide line beside an open group's items (NVD-73): `none` (the default), `shown` or `hover`. Reflected. */
  guides: 'none' | 'shown' | 'hover' = 'none';

  /** How much further each level begins (NVD-69): null (`indent="auto"`, the default) lines a row up with its group's label; a number of pixels; 0 none. */
  indent: number | null = null;

  /** How far a nested row's fill and state layers reach (NVD-70): `indented` (the default) or `full`. Reflected. */
  highlight: 'indented' | 'full' = 'indented';

  /** Whether a row without an icon keeps the icon's room (NVD-71): `auto` (the default), `always` or `never`. Reflected. */
  iconSpace: 'auto' | 'always' | 'never' = 'auto';

  /** Whether groups open and close at all (NVD-72); `expandable="false"` shows every group open, without chevrons. Reflected. */
  expandable = true;

  /** Lets labels wrap (NVD-75); while false a label is one line, cut, with its full text in a tooltip. Reflected. */
  labelWrap = false;

  /** Lets supporting text wrap, as labelWrap lets labels. Reflected. */
  supportingWrap = false;

  /** Pins the rows of the open groups the top rows belong to while their items scroll under them (NVD-77). Not while collapsed. Reflected. */
  stickyParents = false;

  /** At most how many group rows are pinned, the innermost winning (NVD-77). */
  stickyMax = 2;

  /** What the loading row under a group that is fetching its items says, and its name ("Loading…", NVD-76): your words. */
  loadingLabel = '';

  /**
   * Draws a filter field above the items (NVD-79): what a person types there narrows the drawer to the rows whose label
   * holds it, opening for the time being the groups that hold them, and the drawer comes back as it was when the field
   * is emptied. Off by default: a product that filters on a server, ranks, or matches in another way leaves it off and
   * gives the drawer the items that match. Reflected.
   */
  filterable = false;

  /** The filter text (NVD-80): what the field holds. The drawer sets it as the person types, then fires `filterchange`; set it yourself to give a filter back (no event). Empty, or white space, applies none. */
  filterValue = '';

  /** Names the filter field for assistive technology ("Filter navigation"): your words. Required while `filterable`. */
  filterLabel = '';

  /** The hint the empty field shows ("Filter"): your words, else the product's `filterPlaceholder`. */
  filterPlaceholder = '';

  /** What the drawer draws and says while no row matches ("No matches"): your words, else the product's `filterEmptyText`. */
  filterEmptyText = '';

  /** What the drawer draws at the top of the results and says once they settle, with `{count}` for the number of rows that match ("Matches: {count}"): your words, else the product's `filterCountText`. */
  filterCountText = '';

  /** Does not draw the count at the top of the results; it is still said (NVD-90, NVD-91). Reflected. */
  filterCountHidden = false;

  /** The clear button's name ("Clear"): your words, else the product's `clearLabel`. */
  filterClearLabel = '';

  /**
   * The chord that moves focus to the filter field from anywhere in the window (NVD-87), in the keyboard shortcut's key
   * names: `["/"]` by default (the attribute: chords separated by spaces). Drawn as a hint in the empty field and
   * exposed as its `aria-keyshortcuts`. Empty binds nothing and draws no hint.
   */
  filterShortcut: string[] = ['/'];

  /** NVD-91: what the drawer's status says now. */
  private filterSaid = '';
  /** NVD-87: whether the filter field has focus (the hint is drawn only while it does not). */
  private fieldFocused = false;
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  /** NVD-81…86: the filter as the last sync reckoned it. */
  private filter: FilterState = NO_FILTER;
  /** NVD-84: the words the filter was last reckoned for; the groups the person opened or closed while they held. */
  private filterKey = '';
  private readonly toggledInFilter = new Set<TanreiNavigationDrawerGroup>();
  /** NVD-92: how far the items were scrolled when the filter began; null while none is applied. */
  private filterScroll: number | null = null;
  /** NVD-86, NVD-87: what had focus before the chord moved it to the field. */
  private filterOpener: HTMLElement | null = null;
  /** NVD-88: a closed modal drawer was asked to focus its filter: done when it next opens. */
  private filterFocusOwed = false;
  /** NVD-91: the result that is being waited for, and the timer of its pause. */
  private saidFor = '';
  private sayTimer: ReturnType<typeof setTimeout> | undefined;
  /** NVD-94: the filter's change is drawn at once (the styles' `data-filter-change`), for two frames. */
  private filterFrame = 0;
  /** NVD-87: the chord this drawer listens for now, or null. */
  private binding: Binding | null = null;

  /** Lets the window's width choose the drawer's presentation (NVD-53): standard where it is wide, its column where it is narrower (while `collapsible`), modal where it is narrow. Reflected. */
  responsive = false;

  /**
   * Lets a person change the drawer's width where it stands beside the content (NVD-96…104) — by dragging its end edge,
   * from the keyboard on the resize handle, or by pressing the edge — and fold a collapsible drawer to its column the
   * same way. On by default; `resizable="false"` turns it off. Ignored where the drawer is over the content. Reflected.
   */
  resizable = true;

  /**
   * The width of the expanded drawer beside the content, in CSS pixels (NVD-97). Null (no attribute, the default) takes
   * `comp.navigation-drawer.container.width`. A drag, a key or a press on the edge sets it and then fires `widthchange`;
   * set it yourself to give a person's width back (no event) — before the drawer is defined, write it as
   * `--tanrei-navigation-drawer-width` on the element as well, so that the first frame has it. Nothing is stored.
   * Held between `minWidth` and `maxWidth`, and the room the parent gives. Reflected.
   */
  width: number | null = null;

  /** The least width a person can give the drawer beside the content, in CSS pixels; null takes `comp.navigation-drawer.container.min-width`. */
  minWidth: number | null = null;

  /** The greatest width a person can give the drawer beside the content, in CSS pixels; null takes `comp.navigation-drawer.container.max-width`. The room its parent gives holds it narrower still. */
  maxWidth: number | null = null;

  /** Names the resize handle for assistive technology ("Resize navigation"), your words; empty names it by `label` (NVD-102). */
  resizeLabel = '';

  /**
   * @internal NVD-103: what a page rendered before the element is defined writes beside `width` (the React wrapper's
   * server render): the width as the property the stylesheets read, so that the first frame is drawn at it.
   */
  static serverStyle(props: Record<string, unknown>): Record<string, string> | null {
    const width = typeof props.width === 'number' && Number.isFinite(props.width) ? props.width : null;
    return width === null ? null : { '--tanrei-navigation-drawer-width': `${width}px` };
  }

  /** NVD-102: what the resize handle tells assistive technology — the width drawn, its least and its greatest. */
  private resizeValues = { now: 0, min: 0, max: 0 };
  /** NVD-98, NVD-99: the drag the resize handle holds — where it began, in which form, and the lengths it is reckoned in. */
  private resizeDrag: { from: number; expanded: boolean; width: number; metrics: ResizeMetrics } | null = null;
  /** NVD-98: the width a drag draws while it lasts (the element writes `width` when it ends). */
  private dragWidth: number | null = null;
  /** NVD-101: the width before a press on the edge gave the drawer its default width, until the width changes otherwise. */
  private beforeDefault: number | null = null;
  /** The drawer wrote `width` itself: not the product's change (NVD-101, NVD-103). */
  private ownWidth = false;
  /** NVD-98: what a drag changed on the document, given back when it ends. */
  private documentHold: { select: string; webkitSelect: string; frames: [HTMLElement, string][] } | null = null;
  private resizeFrame = 0;
  /** APS-5: until a person's change of width has stopped moving. */
  private personTimer: ReturnType<typeof setTimeout> | undefined;
  /**
   * NVD-97, NVD-102: the room the parent gives changes the width the rows are laid out at and what the handle says.
   * One observer watches every drawer, so that a frame reports all the drawers that changed in one callback: all of
   * them read, then all of them write. An observer of each drawer's own would have each drawer read after the writes
   * of the one before, and the browser lay the page out again for each.
   */
  private static resizeWatch: ResizeObserver | null = null;
  /** The drawer each watched element belongs to. */
  private static readonly resizeWatched = new WeakMap<Element, TanreiNavigationDrawer>();
  /** What this drawer's resize watch observes now. */
  private resizeTargets: Element[] = [];

  private static watchResize(): ResizeObserver {
    return (TanreiNavigationDrawer.resizeWatch ??= new ResizeObserver((entries) => {
      const drawers = new Set<TanreiNavigationDrawer>();
      for (const entry of entries) {
        const drawer = TanreiNavigationDrawer.resizeWatched.get(entry.target);
        if (drawer) drawers.add(drawer);
      }
      const writes: (() => void)[] = [];
      for (const drawer of drawers) {
        const write = drawer.readResize();
        if (write) writes.push(write);
      }
      for (const write of writes) write();
    }));
  }

  /** NVD-97, NVD-102: watches the drawer while it stands beside the content, and nothing otherwise. */
  private watchResizeTargets() {
    const targets: Element[] = this.beside && this.isConnected ? [this] : [];
    if (targets.length === this.resizeTargets.length && targets.every((target, i) => target === this.resizeTargets[i])) return;
    const watch = TanreiNavigationDrawer.watchResize();
    for (const target of this.resizeTargets) {
      if (targets.includes(target)) continue;
      watch.unobserve(target);
      TanreiNavigationDrawer.resizeWatched.delete(target);
    }
    for (const target of targets) {
      if (this.resizeTargets.includes(target)) continue;
      TanreiNavigationDrawer.resizeWatched.set(target, this);
      watch.observe(target);
    }
    this.resizeTargets = targets;
  }

  /** What the window's width has decided for a responsive drawer; null while it is not responsive, or the width is not known. */
  private decided: TanreiNavigationDrawerPresentation | null = null;

  /**
   * The value of the selected destination, wherever it stands; empty selects none. The selected destination is the place
   * being shown, exposed as the current page. The drawer sets it when a button destination is activated; it never sets
   * it for a link (NVD-60) — in a site of separate pages each page sets it to its own destination (a link's `href`
   * stands as its value while it has none).
   */
  value = '';

  /**
   * Opens the groups that hold the selected destination when the drawer first appears (in its first frame, without
   * motion) and whenever `value` changes, whatever their `open` said; each fires `toggle` (NVD-58). The user may close
   * such a group again: it then stays closed until `value` changes. While false a closed group stays closed and its row
   * shows the selection (NVD-47).
   */
  revealSelected = false;

  /**
   * Lets a group be a destination as well as a row that opens and closes (NVD-66): a setting of the product's, off by
   * default. While set, a group with a `value` or an `href` is selected by `value` and fires `change` or `reselect`
   * from its row, which is a link with an `href`; its chevron becomes a button of its own that alone opens and closes it
   * (NVD-67). A group without either still only opens and closes.
   */
  selectableGroups = false;

  /**
   * The offset the product gave, while it still has work to do: until it has been written (`unwritten` — nothing is
   * laid out yet), and until the first frame is drawn, because the first frame's order may run more than once while the
   * drawer's children are still arriving (NVD-62).
   */
  private givenOffset: number | null = null;
  private unwritten = false;
  /** NVD-61: where the items were scrolled when the drawer last looked — before the browser answered a focus by scrolling. */
  private lastScroll: { scroller: HTMLElement; top: number } | null = null;

  /**
   * How far the items are scrolled from their start, in CSS pixels (NVD-61). Reading it gives the present distance;
   * setting it scrolls there at once, without motion, held inside the scroll range — before the drawer first appears
   * included, when it is where the first frame is drawn (the `scroll-offset` attribute is read once, for that frame).
   * No event is fired while the user scrolls, and nothing is stored (NVD-62): a site reads it when the page is left and
   * gives it back on the next page.
   */
  get scrollOffset(): number {
    if (this.unwritten && this.givenOffset !== null) return this.givenOffset;
    return this.scroller?.scrollTop ?? 0;
  }

  set scrollOffset(offset: number) {
    const to = Number(offset);
    this.givenOffset = Number.isFinite(to) ? Math.max(0, to) : 0;
    this.unwritten = true;
    // Written now where the items are laid out; before that, in the first frame's order (NVD-62).
    this.applyOffset();
  }

  /** Names the navigation landmark and, while modal and open, the dialog ("Mail"). */
  label = '';

  private hasButtons = false;
  private hasTitle = false;
  private hasMain = false;
  /** A collapsible modal drawer's dialog is drawn (open, or narrowing back to its column). */
  private presented = false;
  /** A collapsible modal drawer's dialog is narrowing back to its column, closed (NVD-40), and exposed as the column (NVD-23). */
  private narrowing = false;
  /**
   * NVD-19, NVD-23: an app shell that has a header holds the drawer — its parent is a `<tanrei-app-shell>`, it stands
   * in that frame's navigation region, and the frame's header region is filled. Read from the parent, never written by
   * the product. Held, the drawer is never a top-layer `<dialog>`: it is one `<nav>` in every presentation, drawn over
   * the content below the header with a scrim of its own, and the frame makes the regions under it inert.
   */
  private held = false;
  /** Measured from the product's own elements: the first header button's width, the main action's height. */
  private measured: Record<string, string> = {};
  /** Where a collapsible modal drawer's column is, for its dialog to widen from. */
  private place: Record<string, string> = {};

  /** NVD-26: variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'navigation-drawer', behavior: 'NVD-26', axes: AXES });

  private snapshot: Snapshot = { selected: null, shower: null, top: [], places: new Map() };

  /** NVD-1…3, NVD-24, NVD-29: selection, activation and the debug reports (src/primitives/destination.ts). */
  private readonly destinations = new DestinationsController<DrawerDestination>(this, {
    // NVD-66: a group that is a destination is one of them, in reading order, before the items it holds.
    items: () =>
      [...this.querySelectorAll(CELLS)].filter(
        (cell): cell is DrawerDestination => cell instanceof TanreiNavigationDrawerItem || (cell instanceof TanreiNavigationDrawerGroup && this.isDestinationGroup(cell)),
      ),
    ids: { unknownValue: 'NVD-3', emptyLabel: 'NVD-24', duplicate: 'NVD-29' },
    context: (item, base) => {
      if (base.position === 1) {
        // NVD-62: what is revealed comes before any cell is told what it is, so the first frame draws it settled.
        this.revealSelection();
        // NVD-81…86: the filter, before the places it changes (NVD-95: positions among the rows it shows).
        this.filter = this.reckonFilter();
        this.snapshot = this.takeSnapshot();
      }
      return this.cellContext(item, base.selected);
    },
    synced: (_, items) => {
      this.syncStructure(items);
      this.viewSelection();
      this.schedulePins();
      // NVD-19: items that arrived after the drawer was shown take the focus it could not give.
      this.payOwedFocus();
    },
    // NVD-60: a link is followed, not selected.
    link: (item, event) => item.linkActivation(event),
    // NVD-67: a group that is a destination is chosen by its row alone — not by its chevron, nor by its items' room.
    activates: (item, event) => !(item instanceof TanreiNavigationDrawerGroup) || item.activatedBy(event),
  });

  /** NVD-66: whether a group is a destination as well: selectableGroups, and a value or an href. */
  private isDestinationGroup(group: TanreiNavigationDrawerGroup): boolean {
    return this.selectableGroups && !!group.value;
  }

  /** Where focus was when the drawer opened (NVD-22, NVD-28). */
  private opener: Element | null = null;
  private shown = false;
  private pressedScrim = false;
  private dragged = false;
  private drag: { id: number; x: number; time: number; following: boolean; lastX: number; lastTime: number; velocity: number } | null = null;
  /** The form at the last update; undefined before the first. */
  private wasCollapsed: boolean | undefined = undefined;
  private formTimer: ReturnType<typeof setTimeout> | undefined;
  /** Counts the closes begun: a close whose motion ends finishes only if no other began since, and the drawer did not open again (NVD-22, NVD-40). */
  private leaveRun = 0;
  /**
   * The showing whose focus is still owed — nothing in the drawer could take it yet — or null (NVD-19, `payFocus`): a
   * token each showing makes anew, so focus owed to one moves only if no other began since (`focusAsShown`).
   */
  private focusOwed: object | null = null;
  /** How far a collapsible modal drawer's items were scrolled, carried from its column to its dialog and back (NVD-40). */
  private carriedOffset: number | null = null;
  /** Focus was on what the collapsed form does not draw when the drawer collapsed (NVD-36). */
  private focusLost = false;
  /** Whether focus was inside a standard drawer that is closing (read before the render makes it inert). */
  private closingWithFocus = false;
  /** NVD-54: where focus goes back to when a drawer kept open across a change of presentation closes. */
  private reopener: Element | null = null;
  /** Where focus was before a collapsible modal drawer's dialog took its column's place (NVD-22). */
  private pendingOpener: Element | null = null;
  /** The menu button whose press is opening the drawer, until that update is drawn (NVD-22). */
  private pressedMenu: HTMLElement | null = null;
  /** NVD-22: the drawer closes from a pointer's press on its menu button, and gives focus back as that press would. */
  private pointerReturn = false;
  /** The first header button, as last told it was the menu button. */
  private menuButton: HTMLElement | null = null;
  /** NVD-53: the two widths a responsive drawer listens to, widest first, and what stops listening. */
  private widths: { expanded: MediaQueryList; collapsed: MediaQueryList; text: string } | null = null;
  /** NVD-54: a `presentationchange` owed once the presentation it names is drawn. */
  private announce = false;
  /** NVD-54: the element that had focus when the width changed the presentation, if it was in the drawer. */
  private focusBefore: HTMLElement | null = null;
  private instantFrame = 0;
  private readonly sizes = new ResizeObserver(() => this.measure());
  /** NVD-57, NVD-58: the value whose selection was last shown (null: none was selected); undefined before the first. */
  private shownFor: string | null | undefined = undefined;
  /** NVD-58: the groups just opened to show the selection, until the selection has been brought into view. */
  private revealed: TanreiNavigationDrawerGroup[] = [];
  /** NVD-57: the selection is owed a look: its row is brought into view once the cells are drawn. */
  private viewOwed = false;
  private viewing = false;
  /** The drawer's first frame has been drawn: what it opens afterwards takes its motion (NVD-58), and the first frame's order (NVD-62) is over. */
  private painted = false;
  /** Who asks for the drawer's first frame in the read phase. */
  private readonly firstFrame = {};
  /** NVD-62: the first frame's order is owed: the cells are drawn, and the items wait for the phase to be placed. */
  private firstLook = false;

  /** @internal NVD-62: the drawer's first frame is not drawn yet: its groups read it (a group opened for the selection stays open until then, NVD-58). */
  get arriving(): boolean {
    return !this.painted;
  }

  constructor() {
    super();
    // NVD-21: a destination's activation closes a modal drawer, after change or reselect.
    this.addEventListener('change', this.afterActivation);
    this.addEventListener('reselect', this.afterActivation);
    // NVD-37: the menu button, after its own click.
    this.addEventListener('click', this.onMenuClick);
    // NVD-61: keyboard focus on a cell that is not wholly in view. One listener for every cell.
    this.addEventListener('focusin', this.onFocusIn);
    // NVD-93: Escape on a row empties the filter.
    this.addEventListener('keydown', this.onHostKeyDown);
  }

  /** The drawer's destinations, in reading order, in sections and groups or not (its items: a group that is a destination is not among them). */
  get items(): TanreiNavigationDrawerItem[] {
    return this.destinations.items.filter((item): item is TanreiNavigationDrawerItem => item instanceof TanreiNavigationDrawerItem);
  }

  /** The drawer's groups, in reading order. */
  get groups(): TanreiNavigationDrawerGroup[] {
    return [...this.querySelectorAll(GROUP)].filter((group): group is TanreiNavigationDrawerGroup => group instanceof TanreiNavigationDrawerGroup);
  }

  /** The form the drawer is in (NVD-30): collapsed to the icon column, or not. Read-only; reflected as the `collapsed` attribute. */
  get collapsed(): boolean {
    if (!this.collapses) return false;
    return this.modal ? !this.open : !this.expanded;
  }

  /**
   * NVD-53, NVD-55: what a responsive drawer is at the window's current width — `standard`, `column` or `modal` — or
   * null while it is not responsive. Read-only, derived from the width alone and never stored in a prop; reflected as
   * the `presentation` attribute, for styling.
   */
  get presentation(): TanreiNavigationDrawerPresentation | null {
    return this.responsive ? this.decided : null;
  }

  /** Whether the drawer is drawn as a modal one: its variant, or what a responsive drawer's presentation stands for (NVD-53). */
  private get modal(): boolean {
    if (this.responsive) return this.decided === 'column' || this.decided === 'modal';
    return this.variant === 'modal';
  }

  /** Whether the drawer is drawn with a collapsed form: `collapsible`, unless a responsive drawer's presentation is the modal one (NVD-53). */
  private get collapses(): boolean {
    if (this.responsive && this.decided === 'modal') return false;
    return this.collapsible;
  }

  /**
   * Whether the drawer is shown: `open`; while a responsive drawer is beside the content (NVD-53), always where it has a
   * collapsed form and while `expanded` where it has none (its standard presentation hidden).
   */
  private get isOpen(): boolean {
    // NVD-55: before the width is known nothing is made inert and nothing is opened on a guess.
    if (this.responsive && this.decided === null) return true;
    if (this.responsive && this.decided === 'standard') return this.collapsible || this.expanded;
    return this.open;
  }

  /** NVD-19: the panel that is presented over the content while the drawer is modal: its dialog, or the one `<nav>` of a drawer an app shell holds. */
  private get surface(): HTMLElement | null {
    if (!this.modal) return null;
    return this.held ? this.panel : this.dialog;
  }

  /** NVD-19, NVD-23: whether an app shell that has a header holds the drawer, read from its parent. */
  private readHeld(): boolean {
    const parent = this.parentElement;
    return !!parent && parent.localName === 'tanrei-app-shell' && this.getAttribute('slot') === 'navigation' && !!parent.querySelector(':scope > [slot="header"]');
  }

  /** NVD-37: whether a menu button of an app shell controls the drawer: the frame's header holds one and keeps it there (APS-6). */
  private get shellMenu(): boolean {
    const parent = this.parentElement;
    if (!parent || parent.localName !== 'tanrei-app-shell' || this.getAttribute('slot') !== 'navigation') return false;
    return parent.getAttribute('menu-button-placement') !== 'drawer' && !!parent.querySelector(':scope > [slot="header"] [data-app-shell-menu]');
  }

  /**
   * @internal NVD-19, APS-4: the app shell around the drawer tells it that its regions changed — whether its header
   * region is filled decides whether the drawer is held below the header.
   */
  shellChanged() {
    const held = this.readHeld();
    if (held === this.held) return;
    // An overlay shown one way is taken down at once before it is shown the other way.
    if (this.shown) this.withdraw(false, false);
    this.held = held;
    this.reflectState();
  }

  /**
   * @internal APS-7, MDL-2: the app shell around the drawer holds the page's scroll while the drawer is open over the
   * content below its header — `holder` is the frame — with the modal layer's own code, which this module carries.
   */
  holdShellScroll(holder: Element, hold: boolean) {
    holdPageScroll(holder, hold);
  }

  /**
   * @internal APS-7, NVD-37: the app shell's menu button was activated: the drawer does what its own menu button does,
   * whether or not it is collapsible — closes where it is open over the content, asks for its other form where it
   * stands beside the content (shown or hidden where it has no collapsed form), and opens where it is a column or not
   * shown. `button`: the menu button pressed, where focus goes back to when the press gave it none (NVD-22); `pointer`:
   * a pointer's press, after which the focus given back draws no indicator.
   */
  menuFromShell(button: HTMLElement | null = null, pointer = false) {
    if (this.modal && this.open) {
      this.pointerReturn = pointer;
      this.dismiss();
      return;
    }
    if (!this.modal) {
      if (this.collapses) this.askForm(this.collapsed);
      else {
        // NVD-53: a standard presentation with no collapsed form is shown or hidden: the other form of it.
        const expand = !this.expanded;
        this.expanded = expand;
        this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerExpandedChangeDetail>('expandedchange', { bubbles: true, detail: { expanded: expand } }));
      }
      return;
    }
    // NVD-22: the button whose press opens the drawer is where focus goes back to when the press gave focus to nothing
    // (Safari on macOS does not focus a button that is clicked) — until the update that opens it is drawn.
    this.pressedMenu = button;
    if (this.collapses) this.askForm(true);
    else this.open = true;
    void this.updateComplete.then(() => (this.pressedMenu = null));
  }

  private get labelsMode(): TanreiNavigationDrawerCollapsedLabels {
    return this.collapsedLabels === 'selected' || this.collapsedLabels === 'always' ? this.collapsedLabels : 'never';
  }

  private get panel(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.drawer') ?? null;
  }

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null;
  }

  /** The list of items, which scrolls under the header (NVD-12). */
  private get scroller(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.items') ?? null;
  }

  /** NVD-61: the `scroll-offset` attribute is read once, for the first frame; afterwards the property is the handle. */
  override attributeChangedCallback(name: string, before: string | null, value: string | null) {
    if (name === 'scroll-offset' && this.hasUpdated) return;
    super.attributeChangedCallback(name, before, value);
  }

  // ---- the filter (NVD-79…95) ----

  /** NVD-79: the field is drawn: filterable, and the drawer expanded. */
  private get fieldShown(): boolean {
    return this.filterable && !this.collapsed;
  }

  /** The filter field, where it is drawn. */
  private get filterInput(): TanreiTextInput | null {
    return this.renderRoot?.querySelector<TanreiTextInput>('.filter') ?? null;
  }

  /** NVD-84: a group is drawn open — its open, opened for the filter, or every group while groups do not open and close. */
  private drawsOpen(group: TanreiNavigationDrawerGroup): boolean {
    return group.open || this.filter.opened.has(group) || !this.expandable;
  }

  /** The cells of this drawer (not of a drawer nested in one), in reading order. */
  private ownCells(): DrawerCell[] {
    return [...this.querySelectorAll(CELLS)].filter((cell): cell is DrawerCell => cell instanceof DrawerCell && cell.closest(DRAWER) === this);
  }

  /**
   * NVD-81…86: the filter of filterValue over the cells as they are now — which rows match (every word, anywhere in the
   * label, in any order, without regard to case, width or marks), which a filter hides, which closed groups it draws
   * open, and the active match. It marks no run of a label (NVD-85).
   */
  private reckonFilter(): FilterState {
    const words = this.filterable ? filterWords(this.filterValue ?? '') : [];
    const key = words.join('\u0000');
    if (key !== this.filterKey) {
      this.filterKey = key;
      // NVD-84: a group the person opened or closed is opened for the filter again once the text changes.
      this.toggledInFilter.clear();
    }
    // NVD-79: collapsed, the cells are drawn as though no filter were applied, and filterValue is kept.
    if (!words.length || this.collapsed) return NO_FILTER;
    const cells = this.ownCells();
    const matches = new Set(cells.filter((cell) => holdsWords(cell.label, words)));
    // NVD-82: each match, each group that holds one, and the whole of a group found by its own name.
    const shown = new Set<Element>();
    for (const cell of matches) {
      shown.add(cell);
      for (const group of groupsOf(cell)) shown.add(group);
      if (cell instanceof TanreiNavigationDrawerGroup) for (const inner of cell.querySelectorAll(CELLS)) shown.add(inner);
    }
    const hidden = new Set<Element>(cells.filter((cell) => !shown.has(cell)));
    // NVD-82: a section with no row shown is hidden with its heading and its divider.
    for (const section of this.querySelectorAll(SECTION)) {
      if (!(section instanceof TanreiNavigationDrawerSection) || section.closest(DRAWER) !== this) continue;
      if (![...section.querySelectorAll(CELLS)].some((cell) => shown.has(cell))) hidden.add(section);
    }
    // NVD-84: each closed group that holds a match, drawn open for the filter — unless the person opened or closed it.
    const opened = new Set<TanreiNavigationDrawerGroup>();
    if (this.expandable) {
      for (const cell of matches) for (const group of groupsOf(cell)) if (!group.open && !this.toggledInFilter.has(group)) opened.add(group);
    }
    // NVD-86: the first row shown that matches and is not disabled, and that a press can take (a group's row that does
    // not open and close, and is no destination, is not a control).
    const drawn = (group: TanreiNavigationDrawerGroup) => group.open || opened.has(group) || !this.expandable;
    const takes = (cell: DrawerCell) => !(cell instanceof TanreiNavigationDrawerGroup) || this.expandable || this.isDestinationGroup(cell);
    const active = cells.find((cell) => matches.has(cell) && !cell.disabled && takes(cell) && !hidden.has(cell) && groupsOf(cell).every(drawn)) ?? null;
    return { applied: true, matches, hidden, opened, active };
  }

  /** NVD-90: what the status line at the top of the results says now; empty while it draws none. */
  private lineText(): string {
    const { applied, matches } = this.filter;
    if (!applied) return '';
    if (!matches.size) return this.words.get('filterEmptyText', this.filterEmptyText);
    return this.filterCountHidden ? '' : this.countWords(matches.size);
  }

  /** NVD-90, NVD-91: filterCountText with {count} filled by the number of rows that match. */
  private countWords(count: number): string {
    const sentence = this.words.get('filterCountText', this.filterCountText);
    if (!sentence) return '';
    const number = new Intl.NumberFormat(this.closest('[lang]')?.getAttribute('lang') || undefined).format(count);
    return fillPlaces(sentence, { count: number })
      .runs.map((run) => run.text)
      .join('');
  }

  /** NVD-90: the line drawn at the last render; a sync that reckons another one draws it. */
  private drawnLine = '';
  /** NVD-91, NVD-92, NVD-93: the filter as the last sync left it. */
  private filterBefore: FilterState = NO_FILTER;
  private keyBefore = '';
  /** NVD-93: the row that keeps focus, and its place in the view, while Escape on it empties the filter. */
  private keepInView: DrawerCell | null = null;

  /**
   * After each sync: the line at the top of the results drawn again where it changed (NVD-90), the result said once it
   * has settled (NVD-91), the scroll (NVD-92), focus on a row the filter hid moved to the field (NVD-93), and the
   * change drawn at once (NVD-94).
   */
  private filterSynced() {
    const before = this.filterBefore;
    const after = this.filter;
    const keyChanged = this.filterKey !== this.keyBefore;
    this.filterBefore = after;
    this.keyBefore = this.filterKey;
    if (this.lineText() !== this.drawnLine) this.requestUpdate();
    // NVD-94: what a filter changes is drawn at once.
    if (after !== before && (after.applied || before.applied)) this.drawFilterAtOnce();
    // NVD-91: a changed result is said once it has stayed as it is for the pause; nothing while no filter is applied.
    const result = after.applied ? [this.filterKey, after.matches.size, ...[...after.matches].map((cell) => cell.label)].join('\u0001') : '';
    if (result !== this.saidFor) {
      this.saidFor = result;
      clearTimeout(this.sayTimer);
      this.filterSaid = '';
      if (after.applied) {
        this.sayTimer = setTimeout(() => {
          const count = this.filter.matches.size;
          this.filterSaid = count ? this.countWords(count) : this.words.get('filterEmptyText', this.filterEmptyText);
        }, FILTER_SETTLE_MS);
      }
    }
    // NVD-93: a row the filter came to hide gives focus to the field.
    const focused = this.focusedCell();
    if (focused && after.hidden.has(focused) && this.fieldShown) void this.updateComplete.then(() => this.focusField(false));
    this.filterScrolled(before, after, keyChanged);
  }

  /** The cell that holds focus, where focus is on one of this drawer's rows. */
  private focusedCell(): DrawerCell | null {
    let at: Node | null = deepActive();
    while (at) {
      if (at instanceof DrawerCell && at.closest(DRAWER) === this) return at;
      const root = at.getRootNode();
      at = at.parentNode ?? (root instanceof ShadowRoot ? root.host : null);
    }
    return null;
  }

  /**
   * NVD-92: the filter begins — where the items stood is remembered; its text changes — the items go to their start;
   * it ends — a row with keyboard focus stays where it is in the view, and otherwise the items go back to where they
   * stood when it began. Measured before the cells are drawn again, written once they are.
   */
  private filterScrolled(before: FilterState, after: FilterState, keyChanged: boolean) {
    const scroller = this.scroller;
    if (!scroller) return;
    if (after.applied && !before.applied) this.filterScroll = scroller.scrollTop;
    if (after.applied && keyChanged) {
      void this.cellsDrawn().then(() => {
        this.scrollItemsTo(scroller, 0);
        this.schedulePins();
      });
      return;
    }
    if (after.applied || !before.applied) return;
    const kept = this.keepInView ?? this.focusedCell();
    this.keepInView = null;
    const row = kept?.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
    const box = row?.getBoundingClientRect();
    const offset = box?.height ? box.top - scroller.getBoundingClientRect().top : null;
    const back = this.filterScroll;
    this.filterScroll = null;
    void this.cellsDrawn().then(() => {
      if (row && offset !== null && row.isConnected) this.scrollItemsTo(scroller, scroller.scrollTop + row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - offset);
      else if (back !== null) this.scrollItemsTo(scroller, back);
      this.schedulePins();
    });
  }

  /** NVD-94: until the filter's change is drawn, the groups it opens and closes take no time (the styles' `data-filter-change`). */
  private drawFilterAtOnce() {
    this.setAttribute('data-filter-change', '');
    cancelAnimationFrame(this.filterFrame);
    void this.cellsDrawn().then(() => {
      this.filterFrame = requestAnimationFrame(() => {
        this.filterFrame = requestAnimationFrame(() => this.removeAttribute('data-filter-change'));
      });
    });
  }

  /** @internal NVD-84: the person opened or closed a group while a filter is applied: the filter stops opening it until its text changes. */
  filterToggled(group: TanreiNavigationDrawerGroup, open: boolean) {
    if (!this.filter.applied) return;
    const opened = this.filter.opened.has(group);
    this.toggledInFilter.add(group);
    // A group the filter drew open and the person closes changes no `open`: it is drawn closed now, without a toggle.
    if (opened && !open) this.destinations.sync();
    else void Promise.resolve().then(() => this.destinations.sync());
  }

  /** NVD-80: the person changed the filter text: filterValue first, then filterchange, once; the filter applies at once. */
  private setFilterByPerson(value: string) {
    if (value === (this.filterValue ?? '')) return;
    this.filterValue = value;
    this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerFilterChangeDetail>('filterchange', { bubbles: true, detail: { value } }));
  }

  /** NVD-80: what the field reports — during an input method's composition too (the native input's own value). */
  private readonly onFilterInput = (event: Event) => {
    const native = event.composedPath()[0];
    const value = native instanceof HTMLInputElement ? native.value : ((event.currentTarget as TanreiTextInput).value ?? '');
    this.setFilterByPerson(value);
  };

  /**
   * NVD-86: in the field — Enter takes the active match as Enter on its row would, Down Arrow moves focus to it; Escape
   * empties the field, or, empty, returns focus to where the chord took it from, or passes on (a modal drawer closes).
   * An input method's keys are its own; the clear button's keys are its own.
   */
  private readonly onFilterKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    if (event.composedPath().some((node) => node instanceof Element && node.classList.contains('filter-clear'))) return;
    const plain = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    if ((event.key === 'Enter' || event.key === 'ArrowDown') && plain) {
      const active = this.filter.active;
      if (!active) return;
      event.preventDefault();
      if (event.key === 'ArrowDown') this.focusCell(active);
      else if (active instanceof TanreiNavigationDrawerItem) active.click();
      else active.cell?.click();
      return;
    }
    if (event.key !== 'Escape') return;
    if (this.filterValue) {
      // As a native search field empties itself: the drawer does it, so that it is said once (filterchange).
      event.preventDefault();
      event.stopPropagation();
      this.setFilterByPerson('');
      return;
    }
    const opener = this.filterOpener;
    this.filterOpener = null;
    if (opener?.isConnected && !opener.closest('[inert]')) {
      event.preventDefault();
      event.stopPropagation();
      opener.focus();
    }
  };

  /** NVD-89: the clear button empties the field and gives it focus. */
  private readonly onFilterClear = () => {
    this.setFilterByPerson('');
    this.focusField(false);
  };

  /** NVD-86, NVD-87: whether focus is in the field — the active match is drawn, and the hint hidden, only while it is. */
  private readonly onFilterFocusIn = () => {
    if (!this.fieldFocused) this.fieldFocused = true;
  };

  private readonly onFilterFocusOut = (event: FocusEvent) => {
    const field = this.filterInput;
    const to = event.relatedTarget;
    if (field && to instanceof Node && (field.contains(to) || field.shadowRoot?.contains(to))) return;
    this.fieldFocused = false;
  };

  /** Moves focus to a row (NVD-86's Down Arrow), shown whole in the space the items scroll in. */
  private focusCell(cell: DrawerCell) {
    cell.cell?.focus();
    this.showWhole(cell);
  }

  /** NVD-87, NVD-88: focus to the field, its text selected (`select`). */
  private focusField(select = true) {
    const field = this.filterInput;
    if (!field) return;
    field.focus();
    if (select) field.select();
  }

  /**
   * Moves focus to the filter field (NVD-88), as its chord does (NVD-87): a collapsed drawer expands first; a modal drawer
   * that is closed gives the field focus the next time it opens, in place of its selected destination — so that an app
   * shell, or a key of the product's, opens the drawer and lands in its field. Does nothing while `filterable` is false.
   */
  focusFilter() {
    if (!this.filterable) return;
    if (this.modal && !this.collapsed && !this.shown) {
      this.filterFocusOwed = true;
      return;
    }
    if (!this.modal && !this.isOpen) return;
    this.openFilter();
  }

  /** NVD-87, NVD-88: to the field — expanding a collapsed drawer first, as its menu button does (expandedchange). */
  private openFilter() {
    if (this.collapsed) {
      // A collapsible modal drawer opens over its column: its field takes focus as it is presented (focusInside()).
      if (this.modal) this.filterFocusOwed = true;
      this.askForm(true);
      if (!this.modal) void this.updateComplete.then(() => this.focusField());
      return;
    }
    this.focusField();
  }

  /** NVD-87: whether the drawer is shown, so that its chord is its own: a standard drawer that is open, a modal drawer that is open or keeps its column. */
  private get shownForChord(): boolean {
    return this.modal ? this.open || this.collapses : this.isOpen;
  }

  /** NVD-87, KBS-2: whose keyboard the chord is read for — the nearest ancestor's convention, else the platform's. */
  private get convention(): KeyboardConvention {
    return ambientConvention(this) ?? platformConvention();
  }

  /**
   * NVD-87, SRC-39: the one `keydown` listener on the window, held only while the drawer is connected, filterable and
   * shown, and its chord is exactly one that no search or drawer shown before it holds.
   * @internal
   */
  syncShortcut() {
    const chords = chordsOf(this.filterShortcut);
    let next: Binding | null = null;
    WAITING_FOR_CHORDS.delete(this);
    if (this.isConnected && this.filterable && this.shownForChord) {
      if (chords.length > 1) report(this, 'NVD-87', `filterShortcut holds ${chords.length} chords; a sequence is not bound, so the drawer listens for nothing and draws no hint`);
      else if (chords.length === 1) {
        next = readBinding(chords[0]);
        const owner = next ? BOUND_CHORDS.get(next.id) : undefined;
        if (!next) report(this, 'NVD-87', `the chord "${chords[0]}" of filterShortcut is not modifiers and one key; the drawer listens for nothing`);
        else if (owner && owner !== this) {
          report(this, 'NVD-87', `another navigation drawer or search shown before this one binds the chord "${chords[0]}"; this one binds nothing`);
          WAITING_FOR_CHORDS.add(this);
          next = null;
        }
      }
    }
    if ((next?.id ?? null) === (this.binding?.id ?? null)) return;
    if (this.binding) {
      BOUND_CHORDS.delete(this.binding.id);
      window.removeEventListener('keydown', this.onWindowKeyDown);
      this.binding = null;
      for (const waiting of [...WAITING_FOR_CHORDS]) waiting.syncShortcut();
    }
    if (next) {
      BOUND_CHORDS.set(next.id, this);
      window.addEventListener('keydown', this.onWindowKeyDown);
      this.binding = next;
    }
    // NVD-87: the chord is exposed only by the drawer that holds it.
    this.exposeFilter();
  }

  /**
   * NVD-87: the chord, pressed anywhere in the window, moves focus to the field (a collapsed drawer expands first).
   * Left alone: a press something else has taken, a key repeating while held, an input-method composition, and a chord
   * without mod, ctrl or alt while focus is in an element that takes text, so that it types there.
   */
  private readonly onWindowKeyDown = (event: KeyboardEvent) => {
    const binding = this.binding;
    if (!binding || event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229) return;
    if (!chordPressed(event, binding, this.convention)) return;
    if (!binding.mod && !binding.ctrl && !binding.alt && takesText(deepActive())) return;
    if (!this.filterable || !this.shownForChord) return;
    event.preventDefault();
    const active = deepActive();
    const field = this.filterInput;
    const inField = !!field && !!active && (field === active || field.contains(active) || !!field.shadowRoot?.contains(active));
    this.filterOpener = active instanceof HTMLElement && active !== document.body && !inField ? active : null;
    this.openFilter();
  };

  /** NVD-93: Escape on a row of a standard drawer while a filter is applied empties it; the row keeps focus and its place. */
  private readonly onHostKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.filter.applied || this.modal) return;
    const cell = event.composedPath().find((node): node is DrawerCell => node instanceof DrawerCell);
    if (!cell || cell.closest(DRAWER) !== this) return;
    event.preventDefault();
    this.keepInView = cell;
    // The groups the filter opened around the row are opened as the person would open them (open written, toggle
    // emitted), so that the row stays shown, among its neighbours, once the filter has gone.
    for (const group of groupsOf(cell)) if (this.filter.opened.has(group)) group.setOpenByUser(true);
    this.setFilterByPerson('');
  };

  /** NVD-87, NVD-95: what the field's native input carries — the list it controls and its keyboard shortcut. */
  private exposeFilter() {
    const field = this.filterInput;
    if (!field) return;
    void field.updateComplete.then(() => {
      type Aria = HTMLElement & { ariaControlsElements?: Element[] | null };
      const native = field.shadowRoot?.querySelector<Aria>('input');
      const hint = this.renderRoot.querySelector<HTMLElement & { ariaKeyShortcuts: string | null }>('.filter-hint');
      if (!native) return;
      if ('ariaControlsElements' in native) native.ariaControlsElements = this.scroller ? [this.scroller] : null;
      hostAria(native, { 'aria-keyshortcuts': this.binding ? (hint?.ariaKeyShortcuts ?? null) : null });
    });
  }

  /** NVD-79…95: the debug reports of a field that is drawn. */
  private reportFilter() {
    if (!this.fieldShown) return;
    if (!this.filterLabel.trim()) report(this, 'NVD-95', 'filterable is true and filterLabel is empty, so the filter field has no accessible name; give it one in the product’s language');
    if (!this.words.get('filterPlaceholder', this.filterPlaceholder)) this.words.missing('filterPlaceholder', { id: 'NVD-79', effect: 'the empty filter field shows no hint' });
    if (this.filterValue && this.words.lacks('clearLabel', this.filterClearLabel)) report(this, 'NVD-89', 'filterClearLabel is empty and the product’s words give none, so the clear button has no accessible name; give it one in the product’s language');
    const { applied, matches } = this.filter;
    if (applied && !matches.size && !this.words.get('filterEmptyText', this.filterEmptyText)) this.words.missing('filterEmptyText', { id: 'NVD-90', effect: 'a filter that matches nothing draws and says nothing' });
    if (applied && matches.size && !this.words.get('filterCountText', this.filterCountText)) this.words.missing('filterCountText', { id: 'NVD-91', effect: 'no count of the rows that match is drawn or said' });
  }

  /** NVD-79, NVD-87, NVD-89: the filter field — the search glyph at its start; at its end the key hint while it is empty and has no focus, or the clear button while it holds text. */
  private filterField() {
    if (!this.fieldShown) return nothing;
    const value = this.filterValue ?? '';
    const chords = chordsOf(this.filterShortcut);
    return html`<div class="filter-box">
      <tanrei-text-input
        part="filter"
        class="filter"
        type="search"
        variant="stacked"
        size=${this.density === 'compact' ? 'small' : 'medium'}
        label=${this.filterLabel}
        placeholder=${this.words.get('filterPlaceholder', this.filterPlaceholder)}
        .value=${value}
        @input=${this.onFilterInput}
        @keydown=${this.onFilterKeyDown}
        @focusin=${this.onFilterFocusIn}
        @focusout=${this.onFilterFocusOut}
        ><span slot="leading-icon" aria-hidden="true">search</span
        >${chords.length === 1
          ? html`<tanrei-keyboard-shortcut slot="trailing-icon" class="filter-hint" .keys=${chords} .hosted=${true} variant="plain" size="small" ?hidden=${!!value || this.fieldFocused}></tanrei-keyboard-shortcut>`
          : nothing}${value
          ? html`<tanrei-button slot="trailing-icon" class="filter-clear" variant="text" size="small" label=${this.words.get('clearLabel', this.filterClearLabel)} @click=${this.onFilterClear}
              ><span slot="icon" data-mirror="never">close</span></tanrei-button
            >`
          : nothing}</tanrei-text-input
      >
    </div>`;
  }

  /** NVD-90: the status line at the top of the results (hidden from assistive technology: NVD-91 says the same words). */
  private filterLine() {
    const line = this.lineText();
    this.drawnLine = line;
    return line ? html`<div part="filter-status" class="filter-status" aria-hidden="true">${line}</div>` : nothing;
  }

  // ---- the selection shown, and the scroll (NVD-57, NVD-58, NVD-61, NVD-62) ----

  /**
   * NVD-58: while `revealSelected`, the closed groups that hold the selected destination are opened — when the drawer
   * first appears, and when `value` changes to a destination (or `revealSelected` is turned on). A group the user
   * closes afterwards stays closed: nothing here runs again until the value does change. Whether or not anything is
   * opened, the selection is then owed a look (NVD-57).
   */
  private revealSelection() {
    const selected = this.destinations.selected;
    const key = selected ? this.value : null;
    if (this.shownFor !== undefined && key === this.shownFor) return;
    this.shownFor = key;
    this.viewOwed = true;
    if (!selected || !this.revealSelected) return;
    // NVD-58: and a group that is itself the selected destination, so that the pages of the section shown are drawn.
    const closed = [...groupsOf(selected), ...(selected instanceof TanreiNavigationDrawerGroup ? [selected] : [])].filter((group) => !group.open);
    for (const group of closed) group.openForSelection(!this.painted);
    this.revealed.push(...closed);
  }

  /**
   * NVD-57, NVD-62: the selection is owed a look — its value changed, or the drawer has not drawn its first frame yet.
   * Until that frame the order is run again whenever the drawer's children change: a drawer upgraded before its
   * children were parsed has nothing to scroll yet, and one whose later cells are still to come has a shorter range
   * than it will have.
   */
  private viewSelection() {
    if (this.shownFor === undefined) {
      // No destination yet (the drawer's children are still to come): the first frame's order still runs, for the offset.
      this.shownFor = null;
      this.viewOwed = true;
    }
    if (!this.painted) this.viewOwed = true;
    if (this.viewOwed && !this.viewing) void this.showSelection();
  }

  /** Resolves once the drawer and every cell have nothing left to draw: one wait for a whole burst of updates. */
  private async cellsDrawn() {
    // Bounded: a product that keeps its cells updating forever is looked at as it is.
    for (let turn = 0; turn < 16; turn++) {
      const cells = [...this.querySelectorAll<DrawerCell>(CELLS)];
      await Promise.all(cells.map((cell) => cell.updateComplete));
      await this.updateComplete;
      if (!this.isUpdatePending && !cells.some((cell) => cell.isUpdatePending)) return;
    }
  }

  /**
   * NVD-57, NVD-62: once every cell is drawn — and, after the first frame, the groups just opened have finished
   * opening — the items go to the offset the product gave (in the first frame's order) and the row that shows the
   * selection is brought into view. Before the first frame the cells are waited for in microtasks and the items are
   * placed in the first frame's read phase, after its layout and before its paint, so no frame shows them anywhere
   * else; and it reads the layout once for a whole burst of updates, however many cells there are.
   */
  private async showSelection() {
    this.viewing = true;
    try {
      while (this.viewOwed) {
        this.viewOwed = false;
        const first = !this.painted;
        const opened = this.revealed;
        this.revealed = [];
        await this.cellsDrawn();
        if (!first) await Promise.all(opened.map((group) => group.settled()));
        // Asked again meanwhile (more cells arrived, or the value changed once more): that look replaces this one.
        if (this.viewOwed || !this.isConnected) continue;
        // Before the first frame, its order is the first frame's read phase's (connectedCallback): it reads the layout
        // there for nothing, where a read here had the browser lay out the page that was still being built.
        if (first && !this.painted) {
          this.firstLook = true;
          continue;
        }
        // Each run of the first frame's order starts where the product put the items — at their start, if it said
        // nothing — so that a run made while cells were still arriving leaves no trace in the next.
        if (first) this.applyOffset(true);
        this.bringSelectionIntoView();
      }
    } finally {
      this.viewing = false;
    }
  }

  /** Writes how far the items are scrolled: at once (the scroller's `scroll-behavior` is auto), held inside the range by the browser. */
  private scrollItemsTo(scroller: HTMLElement, top: number) {
    scroller.scrollTop = top;
    this.lastScroll = { scroller, top: scroller.scrollTop };
  }

  /** NVD-61: the user scrolled, or the range changed under the items. No event is fired for it. */
  private readonly onScroll = (event: Event) => {
    const scroller = event.currentTarget as HTMLElement;
    this.lastScroll = { scroller, top: scroller.scrollTop };
    this.schedulePins();
  };

  /** NVD-77: how high the pinned rows stand together, the room above which nothing else is in view. */
  private pinnedHeight = 0;
  /** Who asks for the pinned rows to be reckoned in the read phase. */
  private readonly pinsRead = {};

  /**
   * NVD-77: the pinned rows are reckoned again in the next frame's read phase (src/primitives/read-phase.ts): once per
   * frame, however many scrolls, after its layout, which a frame callback of its own had the browser do for it.
   */
  private schedulePins() {
    readInPhase(this.pinsRead, () => this.reckonPins());
  }

  /** NVD-77: the pinned rows, reckoned and written now. */
  private updatePins() {
    this.reckonPins()();
  }

  /**
   * NVD-77: the rows of the open groups that hold the first row shown below the pinned rows are pinned at the top of the
   * space the items scroll in, at most stickyMax of them, the innermost winning (as VS Code keeps its innermost scopes),
   * each directly under the one above: the row itself, with the platform's sticky position, so that it leaves as its
   * group's last row scrolls past. None while the drawer is collapsed or stickyParents is off. Reads the layout, and
   * returns the write that pins them.
   */
  private reckonPins(): () => void {
    const scroller = this.scroller;
    const groups = this.groups;
    const max = Number.isInteger(this.stickyMax) && this.stickyMax > 0 ? this.stickyMax : 2;
    const pinned: TanreiNavigationDrawerGroup[] = [];
    if (this.stickyParents && !this.collapsed && scroller && scroller.clientHeight && scroller.scrollTop > 0) {
      const top = scroller.getBoundingClientRect().top + scroller.clientTop;
      // The open groups, outermost first, whose items run past the top of the space: each pins under those above it.
      let edge = top;
      const chain: TanreiNavigationDrawerGroup[] = [];
      for (const group of groups) {
        if (!this.drawsOpen(group) || groupsOf(group).some((outer) => !this.drawsOpen(outer))) continue;
        const box = group.getBoundingClientRect();
        const row = group.rowHeight;
        if (box.top < edge - 0.5 && box.bottom > edge + row) {
          chain.push(group);
          edge += row;
        }
      }
      pinned.push(...chain.slice(-max));
    }
    let at = 0;
    // A sticky row is held inside the space's padding: the pinned rows begin at its very top, over the padding (read
    // only where a row is pinned).
    const inset = pinned.length && scroller ? Number.parseFloat(getComputedStyle(scroller).paddingBlockStart) || 0 : 0;
    const pins = new Map<TanreiNavigationDrawerGroup, { top: number; last: boolean }>();
    pinned.forEach((group, index) => {
      pins.set(group, { top: at - inset, last: index === pinned.length - 1 });
      at += group.rowHeight;
    });
    return () => {
      for (const group of groups) group.setPinned(pins.get(group) ?? null);
      this.pinnedHeight = at;
      // NVD-77: the browser's own scrolling into view (a focus, a find) leaves room for the pinned rows too.
      if (scroller) scroller.style.scrollPaddingBlockStart = at ? `${at}px` : '';
    };
  }

  /**
   * NVD-61: keyboard focus that moves to a cell which is not wholly in view scrolls it into view by the least distance
   * that shows it whole. The browsers answer a focus each in its own way — one centres a cell that was out of view,
   * another leaves one that is partly in view where it is — and some before this event, some after it: so the items
   * are put back where they were before the focus, and then moved by the least distance; a browser that answers
   * afterwards finds the cell in view and does nothing. A pointer's focus scrolls nothing.
   */
  private readonly onFocusIn = (event: FocusEvent) => {
    const cell = event.composedPath().find((node): node is DrawerCell => node instanceof DrawerCell);
    if (!cell?.cell?.matches(':focus-visible')) return;
    const scroller = this.scroller;
    const before = this.lastScroll;
    if (scroller && before?.scroller === scroller && scroller.scrollTop !== before.top) scroller.scrollTop = before.top;
    this.showWhole(cell);
  };

  /** Scrolls the items by the least distance that puts `cell`'s row wholly inside the space they scroll in; by nothing if it is. */
  private showWhole(cell: DrawerCell) {
    const scroller = this.scroller;
    const row = cell.renderRoot?.querySelector<HTMLElement>('.container');
    if (!scroller || !row || !scroller.clientHeight) return;
    const box = row.getBoundingClientRect();
    if (!box.height) return;
    // NVD-77: below the pinned rows — a pinned row itself is in view where it stands.
    const pinned = cell instanceof TanreiNavigationDrawerGroup && cell.isPinned;
    const top = scroller.getBoundingClientRect().top + scroller.clientTop + (pinned ? 0 : this.pinnedHeight);
    const bottom = top + scroller.clientHeight;
    // A row taller than the space shows its start.
    if (box.top < top - 0.5 || box.height > scroller.clientHeight) this.scrollItemsTo(scroller, scroller.scrollTop + box.top - top);
    else if (box.bottom > bottom + 0.5) this.scrollItemsTo(scroller, scroller.scrollTop + box.bottom - bottom);
    else this.lastScroll = { scroller, top: scroller.scrollTop };
    this.updatePins();
  }

  /** NVD-61: the items go to the offset the product gave; `orStart`: to their start, the default, where it gave none. */
  private applyOffset(orStart = false) {
    const scroller = this.scroller;
    const offset = this.givenOffset ?? (orStart ? 0 : null);
    // Not laid out (not rendered yet, or a closed drawer): kept until it is.
    if (offset === null || !scroller || !scroller.clientHeight) return;
    this.scrollItemsTo(scroller, offset);
    this.unwritten = false;
    if (this.painted) this.givenOffset = null;
  }

  /**
   * NVD-57: the row that shows the selection — the selected destination, or the group's row NVD-47 names — is centred
   * in the space the items scroll in if it is not wholly inside it, as far as the range allows, and left alone if it
   * is. A write to `scrollTop`: never `scrollIntoView()`, which would scroll the page as well; no focus moves.
   */
  private bringSelectionIntoView() {
    const scroller = this.scroller;
    const { shower } = this.takeSnapshot();
    const row = shower?.renderRoot?.querySelector<HTMLElement>('.container');
    if (!scroller || !row || !scroller.clientHeight) return;
    const space = scroller.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    if (!box.height) return;
    const top = space.top + scroller.clientTop + this.pinnedHeight;
    // Half a pixel of slack: a row that a fractional layout puts a hair past the edge is in view.
    if (box.top >= top - 0.5 && box.bottom <= top + scroller.clientHeight + 0.5) return;
    this.scrollItemsTo(scroller, scroller.scrollTop + box.top + box.height / 2 - (top + scroller.clientHeight / 2));
  }

  private get headerButtons(): HTMLElement[] {
    return [...this.children].filter((child): child is HTMLElement => child.getAttribute('slot') === 'header-button');
  }

  private get mainActions(): HTMLElement[] {
    return [...this.children].filter((child): child is HTMLElement => child.getAttribute('slot') === 'main-action');
  }

  override connectedCallback() {
    // NVD-19: whether an app shell's header stands above it, from its first frame.
    this.held = this.readHeld();
    // The form is drawn from the first style the host is given (a controller reads the cascade as it connects): a drawer
    // that starts collapsed does not narrow into place, and its main action does not collapse into place.
    // NVD-55: so is a responsive drawer's presentation — decided from the window's width before the first frame.
    this.watchWidths();
    this.reflectState();
    this.syncMainAction();
    super.connectedCallback();
    // What the drawer opens after its first frame takes its motion (NVD-58).
    // NVD-62: until then it is drawn as it is given, without motion (the styles' `data-arriving`).
    // The first frame is the read phase's (src/primitives/read-phase.ts), after its layout and before its paint: the
    // first frame's order (NVD-62) is taken there, where the layout it reads costs nothing, and then the frame is the
    // drawer's first.
    if (!this.painted) {
      this.setAttribute('data-arriving', '');
      readInPhase(this.firstFrame, () => {
        // NVD-57, NVD-61, NVD-62: the offset the product gave and the selection in view, in the first frame painted —
        // with the reads, as it reads the layout before anything is written (a scroll moves no box).
        if (this.firstLook) {
          this.firstLook = false;
          this.applyOffset(true);
          this.bringSelectionIntoView();
        }
        return () => this.firstFrameDrawn();
      });
    }
    if (this.hasUpdated && this.open && this.modal) this.present();
  }

  /** NVD-62: the first frame is laid out, its order taken, and about to be painted. */
  private firstFrameDrawn() {
    this.painted = true;
    // The first frame is about to be drawn: an offset that was written into it has done its work, and what was given so
    // far is settled in the styles before the motions are given back (the frame's own style, unless a write of the
    // phase changed it since).
    if (!this.unwritten) this.givenOffset = null;
    // Settled once for every drawer of the phase, after all its writes and before its paint: a drawer that settled the
    // styles itself would have the browser style the page again for each, after the one before gave its motions back.
    const arrived = TanreiNavigationDrawer.arrived;
    if (!arrived.length) {
      queueMicrotask(() => {
        const due = arrived.splice(0);
        void due.find((drawer) => drawer.isConnected)?.offsetHeight;
        for (const drawer of due) drawer.removeAttribute('data-arriving');
      });
    }
    arrived.push(this);
  }

  /** NVD-62: the drawers whose first frame is drawn, given their motions back together once the phase has written. */
  private static readonly arrived: TanreiNavigationDrawer[] = [];

  // ---- what the drawer is drawn as (NVD-30, NVD-53…55) ----

  /** The state attributes the styles read: what the drawer is drawn as, whatever its props say (see the styles' header). */
  private reflectState() {
    this.toggleAttribute('collapsed', this.collapsed);
    this.setAttribute('data-as', this.modal ? 'modal' : 'standard');
    this.toggleAttribute('data-collapsible', this.collapses);
    this.toggleAttribute('data-open', this.isOpen);
    // NVD-19: held below an app shell's header, it is drawn in the frame and not in the top layer.
    this.toggleAttribute('data-held', this.held);
    // NVD-96: it draws its resize handle beside its end edge — read by an app shell, which starts the main content past
    // the handle's target (APS-8).
    this.toggleAttribute('data-resize', this.resizeShown);
    // NVD-39, NVD-68: where the chevrons are drawn moves the icon column's line, which the main action follows.
    this.setAttribute('data-chevron', this.chevronAs);
    const presentation = this.presentation;
    if (presentation) this.setAttribute('presentation', presentation);
    else this.removeAttribute('presentation');
  }

  /**
   * NVD-53: a responsive drawer listens to its system's two widths — `breakpoint.expanded` and `breakpoint.collapsed`,
   * read from its computed style (the generated CSS carries them in rem, so they follow the reader's text size) — with
   * `matchMedia`. While it is not responsive it reads no width and listens to nothing.
   */
  private watchWidths() {
    if (!this.responsive || !this.isConnected || typeof matchMedia !== 'function') {
      this.unwatchWidths();
      if (this.decided !== null) this.decided = null;
      return;
    }
    const style = getComputedStyle(this);
    const [expanded, collapsed] = ['expanded', 'collapsed'].map((name) => style.getPropertyValue(`--tanrei-comp-navigation-drawer-breakpoint-${name}`).trim());
    const text = `${expanded} ${collapsed}`;
    // Before its stylesheet has arrived the system names no widths: nothing is decided on a guess (NVD-55).
    if (!expanded || !collapsed) {
      this.unwatchWidths();
      return;
    }
    if (this.widths?.text !== text) {
      this.unwatchWidths();
      this.widths = { expanded: matchMedia(`(min-width: ${expanded})`), collapsed: matchMedia(`(min-width: ${collapsed})`), text };
      this.widths.expanded.addEventListener('change', this.onWidth);
      this.widths.collapsed.addEventListener('change', this.onWidth);
    }
    this.decide();
  }

  private unwatchWidths() {
    this.widths?.expanded.removeEventListener('change', this.onWidth);
    this.widths?.collapsed.removeEventListener('change', this.onWidth);
    this.widths = null;
  }

  private readonly onWidth = () => this.decide();

  /**
   * NVD-53, NVD-54: the presentation of the window's current width. The first decision is only drawn. A change keeps
   * `open` between the column and the modal presentations — the drawer open over the content stays open, its scrim and
   * focus where they are — and the standard presentation ends the presentation over the content: `open` is false again
   * and `close` fires once, focus kept where the drawer still shows it. `expanded`, `value` and every group's `open`
   * are not touched. Held below an app shell's header, the drawer moves to its new place and form as one surface over
   * motion.expand (`moveHeld`).
   */
  private decide() {
    const widths = this.widths;
    if (!widths) return;
    const next: TanreiNavigationDrawerPresentation = widths.expanded.matches ? 'standard' : widths.collapsed.matches && this.collapsible ? 'column' : 'modal';
    const before = this.decided;
    if (next === before) return;
    const first = before === null;
    if (!first) {
      // Read before anything changes: where focus is, and whether the drawer has it.
      const active = deepActive();
      this.focusBefore = active instanceof HTMLElement && this.hasFocus() ? active : null;
      const wasOpen = this.open;
      const ends = wasOpen && next === 'standard';
      this.removeAttribute('data-sliding');
      if (this.held) {
        this.moveHeld();
        if (ends) {
          // Its scrim fades out over the move, nothing is left inert (the app shell hears `close` first), and focus
          // stays where it is.
          this.open = false;
          if (this.shown) this.withdraw(false, true);
          else this.dispatchEvent(new Event('close'));
        }
      } else {
        // TODO: outside an app shell with a header the drawer still redraws a change of presentation at once: its
        // column and modal presentations are a top-layer <dialog> and its standard one a <nav>, so moving as one surface
        // over motion.expand (NVD-54) needs the dialog to hand over to the panel in the page, as a held drawer's one
        // <nav> does. What it keeps and what it emits already follow NVD-54.
        this.drawAtOnce();
        const opener = this.opener;
        // The overlay comes down at once without a `close`; one that stays open is shown again at once in the new
        // presentation, focus put back where it was (`updated`), and still goes back where it was when it closes.
        if (this.shown) this.withdraw(false, false);
        this.presented = false;
        this.reopener = wasOpen && !ends ? opener : null;
        if (ends) {
          this.open = false;
          this.dispatchEvent(new Event('close'));
        }
      }
    }
    this.decided = next;
    this.announce = true;
    // The first frame is the presentation's (NVD-55): the attributes are written before the first style is read.
    if (!this.hasUpdated) this.reflectState();
  }

  /** NVD-54: until the new presentation is drawn, nothing of the drawer's takes time (the styles' `data-instant`). */
  private drawAtOnce() {
    this.setAttribute('data-instant', '');
    this.removeAttribute('data-form-change');
    clearTimeout(this.formTimer);
    cancelAnimationFrame(this.instantFrame);
    void this.updateComplete.then(() => {
      this.instantFrame = requestAnimationFrame(() => {
        this.instantFrame = requestAnimationFrame(() => this.removeAttribute('data-instant'));
      });
    });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.sizes.disconnect();
    // NVD-98: a drawer taken away ends its drag, and gives the document back.
    this.watchResizeTargets();
    this.finishDrag();
    clearTimeout(this.personTimer);
    this.removeAttribute('data-person-resize');
    this.unwatchWidths();
    cancelPhaseRead(this.firstFrame);
    cancelAnimationFrame(this.instantFrame);
    cancelPhaseRead(this.pinsRead);
    this.removeAttribute('data-instant');
    clearTimeout(this.formTimer);
    if (this.shown) this.withdraw(false, false);
    // NVD-87: removed, it stops listening; NVD-91: nothing is said after it.
    this.syncShortcut();
    clearTimeout(this.sayTimer);
    cancelAnimationFrame(this.filterFrame);
    this.removeAttribute('data-filter-change');
  }

  // ---- the cells: what each is told (NVD-3, NVD-23, NVD-31, NVD-33, NVD-47) ----

  private takeSnapshot(): Snapshot {
    const selected = this.destinations.selected;
    let shower: DrawerCell | null = selected;
    if (selected) {
      const groups = groupsOf(selected);
      if (this.collapsed && groups.length) shower = groups[0];
      else shower = (this.expandable ? groups.find((group) => !group.open && !this.filter.opened.has(group)) : undefined) ?? selected;
    }
    // The cells of each level, in reading order: a group's are those it holds directly or through anything that is not
    // a group (a section inside it draws only its items, NVD-17); the top level's are those no group holds.
    const places = new Map<Element, Place>();
    const top: DrawerCell[] = [];
    this.hasGroups = !!this.querySelector(GROUP);
    this.setAttribute('data-chevron', this.chevronAs);
    const chevronStart = this.chevronAs === 'start';
    const space = this.iconSpace === 'always' || this.iconSpace === 'never' ? this.iconSpace : 'auto';
    const indent = typeof this.indent === 'number' && Number.isFinite(this.indent) && this.indent >= 0 ? this.indent : null;
    /** NVD-71: whether a cell of `level` keeps the icon's room. */
    const room = (cell: DrawerCell, cells: DrawerCell[]) => !!cell.icon || space === 'always' || (space === 'auto' && cells.some((other) => !!other.icon));
    /** NVD-69: one step past a group's row: what it draws before its label, or the nesting indent where it draws nothing. */
    const step = (iconRoom: boolean) => {
      if (indent !== null) return `${indent}px`;
      const parts = [...(chevronStart ? [`${LEN.chevron} + ${LEN.gap}`] : []), ...(iconRoom ? [`${LEN.icon} + ${LEN.gap}`] : [])];
      return parts.length ? parts.join(' + ') : LEN.nest;
    };
    /** NVD-73: under a group's first part — its start chevron, its icon or the icon's room, or its label's start. */
    const guide = (cell: DrawerCell, inset: string, iconRoom: boolean) => {
      const lead = chevronStart ? `${LEN.first} + ${LEN.chevron} / 2` : cell.icon ? `${LEN.first} + ${LEN.icon} / 2` : iconRoom ? `${LEN.first} + ${LEN.icon} + ${LEN.gap}` : LEN.itemPad;
      return `calc(${LEN.pad} + ${inset} + ${lead})`;
    };
    /** NVD-69: where the row's label begins, from where its content begins. */
    const labelAt = (iconRoom: boolean) => {
      if (!chevronStart && !iconRoom) return LEN.itemPad;
      return [LEN.first, ...(chevronStart ? [`${LEN.chevron} + ${LEN.gap}`] : []), ...(iconRoom ? [`${LEN.icon} + ${LEN.gap}`] : [])].join(' + ');
    };
    /** NVD-69: a row's label never begins past half of the drawer's width (a deep row stays readable, at 200 % text too). */
    const held = (inset: string, iconRoom: boolean) => `min(${inset}, max(0px, calc(${LEN.width} / 2 - ${LEN.pad} - (${labelAt(iconRoom)}))))`;
    const place = (all: DrawerCell[], level: number, inset: string) => {
      // NVD-95: a level's positions and size are counted among the rows a filter shows; a hidden row has no place.
      const hidden = this.filter.hidden;
      const cells = hidden.size ? all.filter((cell) => !hidden.has(cell)) : all;
      for (const cell of all) if (hidden.has(cell)) places.set(cell, { level, position: 0, size: 0, inset, childInset: inset, iconRoom: false, guideAt: '0px' });
      cells.forEach((cell, index) => {
        // NVD-71: the icon's room is the level's as given, so that a filter moves no label.
        const iconRoom = room(cell, all);
        const childInset = `calc(${inset} + ${step(iconRoom)})`;
        const shown = level ? held(inset, iconRoom) : inset;
        places.set(cell, { level, position: index + 1, size: cells.length, inset: shown, childInset, iconRoom, guideAt: guide(cell, shown, iconRoom) });
      });
    };
    const walk = (parent: Element, level: number, cells: DrawerCell[], groups: [TanreiNavigationDrawerGroup, DrawerCell[]][]) => {
      for (const child of parent.children) {
        if (child instanceof DrawerCell) cells.push(child);
        if (child instanceof TanreiNavigationDrawerGroup) {
          const inner: DrawerCell[] = [];
          groups.push([child, inner]);
          walk(child, level + 1, inner, groups);
        } else if (child.firstElementChild) walk(child, level, cells, groups);
      }
    };
    const groups: [TanreiNavigationDrawerGroup, DrawerCell[]][] = [];
    walk(this, 0, top, groups);
    place(top, 0, '0px');
    // In reading order a group is placed before the cells it holds, so each takes where its group's items begin.
    for (const [group, inner] of groups) place(inner, (places.get(group)?.level ?? 0) + 1, places.get(group)?.childInset ?? '0px');
    return { selected, shower, top, places };
  }

  private cellContext(cell: DrawerCell, selected: boolean): DrawerCellContext {
    const { shower, places } = this.snapshot;
    const { level, position, size, inset, childInset, iconRoom, guideAt } = places.get(cell) ?? { level: groupsOf(cell).length, position: 0, size: 0, inset: '0px', childInset: '0px', iconRoom: !!cell.icon, guideAt: '0px' };
    const mode = this.labelsMode;
    const group = cell instanceof TanreiNavigationDrawerGroup;
    // A group is drawn selected while it shows the selection (NVD-47) or is it (NVD-66), however it is asked.
    const current = cell === this.snapshot.selected;
    return {
      selected: group ? cell === shower || current : selected,
      current,
      destination: group ? this.isDestinationGroup(cell) : true,
      position,
      size,
      labelShown: true,
      collapsed: this.collapsed,
      collapsible: this.collapses,
      shortShown: mode === 'always' || (mode === 'selected' && cell === shower),
      labels: mode !== 'never',
      level,
      chevron: this.chevronAs,
      inset,
      childInset,
      iconRoom,
      highlight: this.highlight === 'full' ? 'full' : 'indented',
      expandable: this.expandable,
      // NVD-73: no guide is drawn while a level steps by nothing.
      guides: this.indent === 0 ? 'none' : this.guides === 'shown' || this.guides === 'hover' ? this.guides : 'none',
      guideAt,
      labelWrap: this.labelWrap,
      supportingWrap: this.supportingWrap,
      filterHidden: this.filter.hidden.has(cell),
      filterOpen: group && this.filter.opened.has(cell),
      filterActive: this.fieldFocused && cell === this.filter.active,
    };
  }

  /** NVD-68: where a group's chevron is drawn — start drawn as end while the drawer is collapsible, unknown as start. */
  private get chevronAs(): 'start' | 'end' | 'none' {
    // NVD-72: groups that do not open and close draw no chevron and keep no room for one; NVD-68: nor does a drawer that
    // has no group to open.
    if (!this.expandable || !this.hasGroups) return 'none';
    const chevron = this.chevron === 'end' || this.chevron === 'none' ? this.chevron : 'start';
    return chevron === 'start' && this.collapses ? 'end' : chevron;
  }

  /** NVD-68: whether the drawer holds a group (read at each sync: a chevron's room is kept only where there is one). */
  private hasGroups = false;

  /** The groups and sections are told the form and the selection too; and what a debug build reports about the structure. */
  private syncStructure(items: DrawerDestination[]) {
    if (!items.length) {
      this.filter = this.reckonFilter();
      this.snapshot = this.takeSnapshot();
    }
    const { shower, top } = this.snapshot;
    for (const group of this.groups) {
      const context = this.cellContext(group, group === shower);
      group.setDrawerContext(context);
      // NVD-66: a value or an address on a group whose drawer does not make groups destinations is ignored.
      if (!this.selectableGroups && (group.value || group.href)) report(this, 'NVD-66', `the group "${group.label}" has a value or an href and selectableGroups is false, so it only opens and closes; set selectable-groups to make it a destination`);
      // NVD-48: deeper than three levels is still drawn, and reported.
      if (context.level + 1 > DEEPEST) report(this, 'NVD-48', `groups nest ${context.level + 1} levels deep; a drawer is made for at most ${DEEPEST}`);
    }
    for (const section of this.querySelectorAll(SECTION)) if (section instanceof TanreiNavigationDrawerSection) section.setDrawerContext({ collapsed: this.collapsed, filterHidden: this.filter.hidden.has(section) });
    this.filterSynced();
    // NVD-49: a collapsed drawer needs an icon on every top-level destination and group.
    if (this.collapsed && top.some((cell) => !cell.icon)) report(this, 'NVD-49', 'a top-level destination or group has no icon; a collapsible drawer needs an icon on every top-level destination and group');
  }

  // ---- activation, the menu button and the groups (NVD-21, NVD-37, NVD-47) ----

  private readonly afterActivation = (event: Event) => {
    if (event.target !== this || !this.modal || !this.open) return;
    this.dismiss();
  };

  /** NVD-37: the first header button of a collapsible drawer changes its form (or closes an open modal one). */
  private readonly onMenuClick = (event: MouseEvent) => {
    if (!this.collapsible) return;
    const menu = this.headerButtons[0];
    if (!menu || !event.composedPath().includes(menu)) return;
    if (this.modal && this.open) {
      // A press of the pointer moved no focus (onMouseDown): the focus it gives back is drawn as a pointer's would be.
      this.pointerReturn = event.detail > 0;
      this.dismiss();
      return;
    }
    // NVD-53: in the modal presentation the drawer has no other form to ask for.
    if (!this.collapses) return;
    // NVD-22: the button whose press opens the drawer is where focus goes back to when the press itself gave focus to
    // nothing (Safari on macOS does not focus a button that is clicked).
    this.pressedMenu = menu;
    this.askForm(this.collapsed);
    void this.updateComplete.then(() => (this.pressedMenu = null));
  };

  /** Applies the form asked for (expanded for a standard drawer, open for a modal one), then fires `expandedchange`. */
  private askForm(expand: boolean) {
    if (this.modal) this.open = expand;
    else this.expanded = expand;
    this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerExpandedChangeDetail>('expandedchange', { bubbles: true, detail: { expanded: expand } }));
  }

  // ---- the width (NVD-96…104) ----

  /**
   * NVD-96: the drawer has a resize handle while it is resizable and stands beside the content — a standard drawer that
   * is open, or a responsive drawer's standard presentation shown — in either form.
   */
  private get resizeShown(): boolean {
    return this.resizable && this.beside;
  }

  /** NVD-97: the drawer stands beside the content — a standard drawer that is open, or a responsive drawer's standard presentation shown. */
  private get beside(): boolean {
    return !this.modal && this.isOpen;
  }

  /** The lengths a resize is reckoned in, read from the drawer's own probes: the tokens and the widths given, as drawn. */
  private resizeMetrics(): ResizeMetrics {
    const probe = (name: string) => this.renderRoot?.querySelector(`.resize-probes > .${name}`)?.getBoundingClientRect().width ?? 0;
    const least = probe('least');
    const greatest = Math.max(least, probe('most'));
    const intended = hold(this.dragWidth ?? given(this.width) ?? probe('fallback'), least, greatest);
    const room = this.room(intended);
    const most = room === null ? greatest : Math.max(least, Math.min(greatest, room));
    return { least, most, column: probe('column'), fallback: hold(probe('fallback'), least, most), narrowed: room !== null && room < intended - 0.5 ? room : null };
  }

  /** NVD-97: the room the parent gave the drawer when it was last seen at rest, expanded; null for room enough. */
  private lastRoom: number | null = null;

  /**
   * NVD-97: the room the parent gives the drawer — an app shell's limit on the host (the window less a touch target,
   * APS-5), or else what the drawer's own `max-inline-size: 100%` left of `intended` the last time the drawer was seen
   * expanded and at rest (a parent sized by its content gives it all it asks for) — less the start inset. A motion of
   * the host's own is not rest, whether it runs or stands held at its start until the next frame (statesFromNextFrame):
   * an opening's slide is held at a width of none in the task that opens the drawer, which read as rest would have the
   * rows laid out at no room through the slide, and the room coming back at its end draw the host without motion for
   * the frames after it (data-resizing), a close in them included.
   */
  private room(intended: number): number | null {
    const inset = this.panel ? Number.parseFloat(getComputedStyle(this.panel).paddingInlineStart) || 0 : 0;
    const max = getComputedStyle(this).getPropertyValue('max-inline-size').trim();
    if (max.endsWith('px') && Number.isFinite(Number.parseFloat(max))) return Number.parseFloat(max) - inset;
    const moving = this.getAnimations().some((motion) => motion.playState === 'running' || motion.playState === 'paused');
    if (this.collapsed || this.resizeDrag || moving) return this.lastRoom;
    const drawn = this.getBoundingClientRect().width - inset;
    this.lastRoom = drawn < intended - 0.5 ? drawn : null;
    return this.lastRoom;
  }

  /** NVD-97: the expanded width beside the content as it is drawn: the drag's while one lasts, else width, else container.width, held. */
  private expandedWidth(metrics: ResizeMetrics): number {
    return hold(this.dragWidth ?? given(this.width) ?? metrics.fallback, metrics.least, metrics.most);
  }

  /**
   * NVD-97, NVD-103: the widths the styles read, on the host: the person's width (the drag's while one lasts) as
   * `--tanrei-navigation-drawer-width`, which an app shell reads too, and minWidth and maxWidth. Written before the first
   * frame, so that it is drawn at its width from the first.
   */
  private writeWidths() {
    const write = (name: string, value: number | null) => (value === null ? this.style.removeProperty(name) : this.style.setProperty(name, `${value}px`));
    write('--tanrei-navigation-drawer-width', this.dragWidth ?? given(this.width));
    write('--_nvd-min-given', given(this.minWidth));
    write('--_nvd-max-given', given(this.maxWidth));
  }

  /**
   * NVD-97, NVD-102: the width the rows are laid out at, where the parent gives less room than the width; and what the
   * handle says — the width drawn, its least and its greatest.
   */
  private syncResize() {
    this.readResize()?.();
  }

  /** What syncResize reads, returning what it then writes: the reads of many drawers can be made together, before any write. */
  private readResize(): (() => void) | void {
    if (!this.beside) return;
    const metrics = this.resizeMetrics();
    // NVD-97: where the parent gives less room than the width, the rows are laid out at the room (the host is drawn
    // there by its `max-inline-size`, and keeps asking for its width, so that it sees the room come back).
    const narrowed = metrics.narrowed === null ? '' : `${metrics.narrowed}px`;
    const writeRoom = () => {
      if (this.style.getPropertyValue('--_nvd-room') === narrowed) return;
      // As the host, the panel follows the room at once, without the change of form's motion.
      this.setAttribute('data-resizing', '');
      this.settleResize();
      if (narrowed) this.style.setProperty('--_nvd-room', narrowed);
      else this.style.removeProperty('--_nvd-room');
    };
    if (!this.resizeShown) return writeRoom;
    const next = {
      now: Math.round(this.collapsed ? metrics.column : this.expandedWidth(metrics)),
      // NVD-102: from the column's width while the drawer folds to it.
      min: Math.round(this.collapses ? metrics.column : metrics.least),
      max: Math.round(metrics.most),
    };
    return () => {
      writeRoom();
      const was = this.resizeValues;
      if (next.now !== was.now || next.min !== was.min || next.max !== was.max) this.resizeValues = next;
    };
  }

  /** The drawer sets `width` itself — a person's drag, key or press — and fires `widthchange` after. */
  private setOwnWidth(width: number) {
    this.ownWidth = true;
    this.width = width;
  }

  private emitWidth(width: number) {
    this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerWidthChangeDetail>('widthchange', { bubbles: true, detail: { width } }));
  }

  private emitExpanded(expanded: boolean) {
    this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerExpandedChangeDetail>('expandedchange', { bubbles: true, detail: { expanded } }));
  }

  /** NVD-98, NVD-100: a width drawn without a motion is drawn so until its style has settled, and then motion is given back. */
  private settleResize() {
    const run = ++this.resizeFrame;
    void this.updateComplete.then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (run === this.resizeFrame && !this.resizeDrag) this.removeAttribute('data-resizing');
        }),
      ),
    );
  }

  /**
   * APS-5: a person is about to change the width — an app shell around the drawer notes the place being read, and holds
   * it in every frame the width changes while `data-person-resize` says so: for as long as a drag lasts, else as long as
   * the change's motion.
   */
  private personResizes(lasting = false) {
    // Noted once for a change, however many frames it takes: where it stood before the change began.
    const shell = this.parentElement as (HTMLElement & { keepReading?: (drawer: Element) => void }) | null;
    if (!this.hasAttribute('data-person-resize') && shell?.localName === 'tanrei-app-shell' && this.getAttribute('slot') === 'navigation') shell.keepReading?.(this);
    this.setAttribute('data-person-resize', '');
    clearTimeout(this.personTimer);
    if (!lasting) this.personTimer = setTimeout(() => !this.resizeDrag && this.removeAttribute('data-person-resize'), this.expandDuration() + 100);
  }

  /** NVD-98, HDL-6: while a drag lasts nothing on the page is selected, and no frame takes the pointer as it passes. */
  private holdDocument(on: boolean) {
    const root = document.documentElement.style;
    if (on && !this.documentHold) {
      const frames = [...document.querySelectorAll<HTMLElement>('iframe, object, embed')];
      this.documentHold = { select: root.getPropertyValue('user-select'), webkitSelect: root.getPropertyValue('-webkit-user-select'), frames: frames.map((frame) => [frame, frame.style.getPropertyValue('pointer-events')]) };
      root.setProperty('user-select', 'none');
      root.setProperty('-webkit-user-select', 'none');
      for (const frame of frames) frame.style.setProperty('pointer-events', 'none');
    } else if (!on && this.documentHold) {
      const { select, webkitSelect, frames } = this.documentHold;
      this.documentHold = null;
      const put = (style: CSSStyleDeclaration, name: string, value: string) => (value ? style.setProperty(name, value) : style.removeProperty(name));
      put(root, 'user-select', select);
      put(root, '-webkit-user-select', webkitSelect);
      for (const [frame, value] of frames) put(frame.style, 'pointer-events', value);
    }
  }

  /** NVD-98, NVD-99: a drag on the handle begins from the width drawn (the column's while collapsed). */
  private readonly onResizeStart = () => {
    if (!this.resizeShown || this.resizeDrag) return;
    const metrics = this.resizeMetrics();
    const collapsed = this.collapsed;
    const width = this.expandedWidth(metrics);
    this.resizeDrag = { from: collapsed ? metrics.column : width, expanded: this.expanded, width, metrics };
    this.beforeDefault = null;
    this.resizeFrame++;
    this.setAttribute('data-resizing', '');
    this.setAttribute('data-resize-drag', '');
    this.holdDocument(true);
  };

  /**
   * NVD-98: the width follows the press, held between the least and the greatest. NVD-99: a collapsible drawer folds to
   * its column past its fold point — halfway between its column and its least width — and unfolds past it again, at
   * its least width or the width asked where that is more; a drawer that cannot fold stops at its least width.
   */
  private readonly onResize = (event: CustomEvent<TanreiHandleResizeDetail>) => {
    const drag = this.resizeDrag;
    if (!drag) return;
    const { metrics } = drag;
    const asked = drag.from + event.detail.inline;
    this.personResizes(true);
    if (this.collapses) {
      const fold = (metrics.column + metrics.least) / 2;
      if (!this.collapsed && asked < fold) {
        this.dragWidth = null;
        this.expanded = false;
        this.writeWidths();
        return;
      }
      if (this.collapsed) {
        if (asked <= fold) return;
        this.expanded = true;
      }
    }
    this.dragWidth = hold(asked, metrics.least, metrics.most);
    this.writeWidths();
    this.syncResize();
  };

  private readonly onResizeEnd = () => this.finishDrag();

  /**
   * NVD-98, NVD-99: the drag ends — released, cancelled by the platform, or ended by a change of presentation, all as a
   * release at the last width drawn. `expanded` and then `width` are written first, and then `expandedchange` (where the
   * form changed) and `widthchange` (where it ends expanded at another width) are fired, once each.
   */
  private finishDrag() {
    const drag = this.resizeDrag;
    if (!drag) return;
    this.resizeDrag = null;
    // The drag writes `expanded` alone: a change of presentation that ended it changed no form of the person's.
    const folded = this.collapses && !this.expanded;
    const width = folded ? null : Math.round(this.dragWidth ?? drag.width);
    this.dragWidth = null;
    this.removeAttribute('data-resize-drag');
    this.holdDocument(false);
    const widthChanged = width !== null && width !== Math.round(drag.width);
    this.personResizes();
    if (widthChanged) this.setOwnWidth(width);
    this.writeWidths();
    this.settleResize();
    if (this.expanded !== drag.expanded) this.emitExpanded(this.expanded);
    if (widthChanged) this.emitWidth(width);
  }

  /**
   * NVD-100: a key's step changes the width at once, held between the least and the greatest, and never folds the
   * drawer; on the column, a step that widens and Home expand it at its least width and End at its greatest, by the
   * change of form's motion, and a step that narrows changes nothing.
   */
  private readonly onResizeStep = (event: CustomEvent<TanreiHandleStepDetail>) => {
    const { axis, direction, amount } = event.detail;
    if (axis !== 'inline' || this.resizeDrag || !this.resizeShown) return;
    const metrics = this.resizeMetrics();
    const now = Math.round(this.expandedWidth(metrics));
    if (this.collapsed) {
      if (direction === -1 && amount !== 'limit') return;
      const to = Math.round(amount === 'limit' && direction === 1 ? metrics.most : metrics.least);
      this.beforeDefault = null;
      this.personResizes();
      if (to !== now) this.setOwnWidth(to);
      this.expanded = true;
      this.emitExpanded(true);
      if (to !== now) this.emitWidth(to);
      return;
    }
    const by = amount === 'large' ? RESIZE_LARGE_STEP : RESIZE_STEP;
    const to = Math.round(amount === 'limit' ? (direction === 1 ? metrics.most : metrics.least) : hold(now + direction * by, metrics.least, metrics.most));
    if (to === now) return;
    this.beforeDefault = null;
    this.personResizes();
    this.setAttribute('data-resizing', '');
    this.setOwnWidth(to);
    this.settleResize();
    this.emitWidth(to);
  };

  /**
   * NVD-101: a press on the edge without a drag, Enter or Space. A collapsible drawer changes form as its menu button
   * does. Otherwise the drawer takes its default width (container.width), and back to the width it had before when it
   * is pressed again before its width changed otherwise. Over the change's motion; focus stays on the handle.
   */
  private readonly onResizeActivate = () => {
    if (this.resizeDrag || !this.resizeShown) return;
    if (this.collapses) {
      this.personResizes();
      this.askForm(this.collapsed);
      return;
    }
    const metrics = this.resizeMetrics();
    const now = Math.round(this.expandedWidth(metrics));
    const fallback = Math.round(metrics.fallback);
    let to: number;
    if (now !== fallback) {
      to = fallback;
      this.beforeDefault = now;
    } else if (this.beforeDefault !== null) {
      to = this.beforeDefault;
      this.beforeDefault = null;
    } else return;
    this.personResizes();
    this.setOwnWidth(to);
    this.emitWidth(to);
  };

  /** NVD-96, NVD-102: the resize handle beside the end edge, after the drawer's content, and the lengths the width is reckoned in (NVD-97). */
  private resizeHandle() {
    if (!this.beside) return nothing;
    const probes = html`<div class="resize-probes" aria-hidden="true"><span class="least"></span><span class="most"></span><span class="column"></span><span class="fallback"></span></div>`;
    if (!this.resizeShown) return probes;
    const { now, min, max } = this.resizeValues;
    return html`${probes}
      <tanrei-handle
        part="resize-handle"
        class="resize"
        axis="horizontal"
        size="medium"
        reach="edge"
        .value=${now}
        .min=${min}
        .max=${max}
        .label=${this.resizeLabel.trim() || this.label}
        aria-controls="navigation"
        @resizestart=${this.onResizeStart}
        @resize=${this.onResize}
        @resizeend=${this.onResizeEnd}
        @step=${this.onResizeStep}
        @activate=${this.onResizeActivate}
      ></tanrei-handle>`;
  }

  /** @internal NVD-47: a group's cell in the collapsed drawer expands it with the group open, and takes focus to its row. */
  expandToGroup(group: TanreiNavigationDrawerGroup) {
    if (!this.collapsed) return;
    this.askForm(true);
    group.setOpenByUser(true);
    void this.updateComplete.then(() => group.updateComplete).then(() => group.cell?.focus());
  }

  /** NVD-20, NVD-21: a modal drawer closes itself and fires `close` once. */
  private dismiss() {
    if (!this.modal || !this.open) return;
    this.open = false;
  }

  // ---- focus (NVD-19, NVD-22, NVD-28, NVD-36) ----

  /**
   * NVD-19: the cell focus goes to as a modal drawer opens, where it is the selected destination's (or the group row's
   * that shows it), `shower` — not where its filter field is owed focus (NVD-88). `focusInside()` gives it.
   */
  private openingFocus(shower: DrawerCell | null): HTMLElement | null {
    if (this.filterFocusOwed && this.fieldShown) return null;
    return shower && !shower.disabled ? shower.cell : null;
  }

  /**
   * NVD-19, NVD-28: focus to the selected destination (or the group row that shows it), or else the first focusable
   * element. `shown`: the cell that shows the selection, where the caller has just read it (`takeSnapshot()`); read here
   * otherwise.
   */
  private focusInside(shown?: DrawerCell | null) {
    // NVD-88: asked to focus its filter while it was closed: the field, in place of the selected destination.
    if (this.filterFocusOwed) {
      this.filterFocusOwed = false;
      const field = this.filterInput;
      if (this.fieldShown && field && !field.hasUpdated) {
        // A held drawer's column is the same `<nav>` as the drawer open over the content, and draws no field: the field
        // is made by the update that opens it, and takes focus once it has drawn its input (NVD-87: once it is expanded).
        void field.updateComplete.then(() => {
          if (!this.shown || !this.fieldShown || this.filterInput !== field) return;
          this.focusField();
          if (!this.hasFocus()) this.focusInside(shown);
        });
        return;
      }
      if (this.fieldShown) {
        this.focusField();
        if (this.hasFocus()) return;
      }
    }
    const shower = shown === undefined ? this.takeSnapshot().shower : shown;
    if (shower && !shower.disabled) {
      shower.cell?.focus();
      if (this.hasFocus()) {
        // NVD-57, NVD-61: the focus the drawer gives shows its cell whole, whatever the browser does with a focus() call.
        this.showWhole(shower);
        return;
      }
    }
    const panel = this.panel;
    const first = panel ? tabbables(panel)[0] : undefined;
    if (first) first.focus();
    else panel?.focus();
  }

  /**
   * NVD-19: focus inside as the drawer is shown (`focusInside`), and the colors of what takes it from the first frame
   * drawn after this task (statesFromNextFrame, with `also`) — once what is to take it can.
   *
   * A drawer inserted open together with its items into a page already drawn is shown by its first update, before
   * theirs (it connects first, so it updates first): none of them has drawn its cell yet. Focus then moves once they
   * have — their first updates are microtasks of this same task, so still before the frame the drawer is first drawn
   * in. (Written in the page's markup, they update before it: the bundle defines them first.)
   *
   * Where nothing in it could take focus — its items not there yet (a parser that yields between the drawer and its
   * items, a product that adds them after it) — its panel takes it, and the focus is owed (`focusOwed`): it moves to
   * the selected destination, or else the first focusable element, as soon as items arrive and have drawn
   * (`payFocus`), while focus is still on the panel.
   */
  private focusAsShown(shower: DrawerCell | null, also: Element | null = null) {
    const run = (this.focusOwed = {});
    const undrawn = this.undrawn();
    if (!undrawn.length) return this.payFocus(run, also, true, shower);
    // What leaves its rest now (the dialog's states, what focus left) begins in the next frame too.
    statesFromNextFrame([this, also]);
    void Promise.all(undrawn).then(() => this.payFocus(run, also, true));
  }

  /** The first renders of the elements inside the drawer that have not rendered yet (NVD-19: their cells are not drawn). */
  private undrawn(): Promise<boolean>[] {
    return [...this.querySelectorAll('*')].flatMap((element) => ((element as Partial<TanreiElement>).hasUpdated === false ? [(element as TanreiElement).updateComplete] : []));
  }

  /**
   * NVD-19: the focus owed to the showing `run` (`focusAsShown`), given (`focusInside`, `shower` as it takes it, or else
   * the selection read now: the items have told the drawer what they are only now), and the colors of what takes it
   * from the first frame drawn after this task. `first`: the showing's own focus, given wherever focus is; otherwise
   * only while focus is still on the panel, where the showing left it (focus the user or the product moved since is
   * theirs). Still owed where the panel took it.
   *
   * While the document is still parsed and the destination `value` names is not there yet, it may be still to come (a
   * parser that yields between the drawer's items): focus waits on the panel for it — not given to an element before it
   * and then taken again — and is given once the document is parsed if it never comes.
   */
  private payFocus(run: object, also: Element | null, first: boolean, shower?: DrawerCell | null) {
    if (run !== this.focusOwed || !this.shown) return;
    if (!first && deepActive() !== this.panel) {
      this.focusOwed = null;
      return;
    }
    if (document.readyState === 'loading' && this.value && !this.destinations.selected) {
      if (!this.hasFocus()) this.panel?.focus();
      document.addEventListener('DOMContentLoaded', this.payOwedFocus, { once: true });
    } else {
      this.focusInside(shower);
      if (deepActive() !== this.panel) this.focusOwed = null;
    }
    statesFromNextFrame([this, also]);
  }

  /** NVD-19: items arrived (`synced`), or the document is parsed, while focus is owed: given once they have drawn. */
  private readonly payOwedFocus = () => {
    const run = this.focusOwed;
    if (run) void Promise.all(this.undrawn()).then(() => this.payFocus(run, null, false));
  };

  /**
   * NVD-22, NVD-28: focus back where it was when the drawer opened — or dropped, where that element is gone. Closed by a
   * pointer's press on the menu button, which moved no focus (onMouseDown), it is given as that press would have given
   * it: with no focus indicator (`focusVisible: false`; an engine without the option let the press give focus itself).
   */
  private restoreFocus() {
    const opener = this.opener as HTMLElement | null;
    const options = this.pointerReturn ? ({ focusVisible: false } as FocusOptions) : undefined;
    this.opener = null;
    this.pointerReturn = false;
    if (opener && opener.isConnected && typeof opener.focus === 'function' && !opener.closest('[inert]')) opener.focus(options);
    else if (this.hasFocus()) (deepActive() as HTMLElement | null)?.blur();
  }

  /** Whether focus is inside the drawer: its light DOM, its shadow root, or a shadow root inside either (the filter field's input). */
  private hasFocus(): boolean {
    for (let at: Node | null = deepActive(); at; at = at instanceof ShadowRoot ? at.host : at.parentNode) if (at === this) return true;
    return false;
  }

  /** NVD-36: whether focus is on what the collapsed form does not draw — the header slot's content, an item inside a group. */
  private focusOnExpandedOnly(): boolean {
    let at: Element | null = deepActive();
    while (at && !this.contains(at)) {
      const root = at.getRootNode();
      at = root instanceof ShadowRoot ? root.host : null;
    }
    if (!at || at === this) return false;
    if (at.closest('[slot="header"]')) return true;
    // NVD-36: the chevron of a group that is a destination is not drawn collapsed.
    if (at instanceof TanreiNavigationDrawerGroup && at.toggleFocused) return true;
    const cell = at.closest(CELLS);
    return !!cell && groupsOf(cell).length > 0;
  }

  // ---- the modal drawer (NVD-19, NVD-20, NVD-22, NVD-40) ----

  /** NVD-19: the modal drawer in the top layer; the page held; focus inside. */
  private present() {
    if (this.held) {
      this.presentHeld();
      return;
    }
    const dialog = this.dialog;
    if (!dialog || this.shown || !this.isConnected) return;
    // A collapsible drawer's column was just replaced by its dialog: where focus was is read before that (willUpdate).
    // Opened again while it still narrows to its column, focus is where its close gave it back. Kept open across a
    // change of presentation (NVD-54), it gives focus back where it would have, and moves none now (`keepFocus`).
    const reopening = this.reopener !== null;
    this.opener = this.reopener ?? this.pendingOpener ?? deepActive();
    this.reopener = null;
    this.pendingOpener = null;
    this.pointerReturn = false;
    // MOT-4: a drawer opened before the document's first paint (written open in the page's markup) is drawn open at
    // once — it does not slide in, nor its scrim fade in, over the first frames.
    if (!documentPainted()) this.drawAtOnce();
    // NVD-19: the selected destination that has focus already (in the column) keeps it as the drawer is shown — not
    // given to the menu button or the dialog first and back, which in Chromium began a motion of each for a focus it held
    // for no frame (openModal). Focus that comes from elsewhere moves once the dialog is drawn (focusInside, below): WebKit
    // draws a destination shown in the top layer as it is first styled there, so a focus given before would be at once.
    // What shows the selection is read once, for both: nothing on the way changes the selection, the form or the filter.
    const { shower } = this.takeSnapshot();
    const active = this.hasFocus() ? deepActive() : null;
    const focus = active && active === this.openingFocus(shower) ? (active as HTMLElement) : null;
    if (this.collapses) {
      // NVD-40: a collapsible drawer widens from its column with more than the surface's own motion (WIDENING) — or,
      // still narrowing back to it, turns back from where it is (MOT-2). A dialog still sliding out (it was not
      // collapsible when it closed) is gone first.
      if (isLeaving(dialog) && !this.narrowing) void closeModal(dialog, { instant: true });
      this.narrowing = false;
      openModal(dialog, { moves: WIDENING, keep: focus });
    } else {
      // NVD-19, MDL-7: opened modally — or, still leaving, taken back where its slide has got to (MOT-2); the slide and
      // its scrim's fade begin in the first frame drawn after this task (src/primitives/modal-exit.ts).
      openModal(dialog, { keep: focus });
    }
    this.shown = true;
    holdPageScroll(this, true);
    // NVD-40: its items stand where its column's did.
    this.carryOffset();
    // NVD-61: an offset given while it was closed is where it opens; NVD-57: focus then brings the selection into view.
    this.applyOffset();
    // NVD-19, NVD-40: the colors of the cell that took focus and of what focus left (the menu button, outside it), and a
    // collapsible drawer's rows widening from its column, begin in the first frame drawn after this task, as the
    // surface's slide does (statesFromNextFrame).
    if (!reopening) this.focusAsShown(shower, this.opener);
    else statesFromNextFrame([this, this.opener]);
  }

  /**
   * NVD-20, NVD-22, NVD-40: out of the top layer, focus back where it was, the page given back, `close`. Without `notify`
   * (a change of presentation or variant, a removal) it comes down at once.
   *
   * It is no longer modal at once — the page is given back and focus goes back now, not when the motion ends (MDL-5) —
   * and stays drawn in the top layer over its fading scrim until that motion has ended (closeModal, MDL-7), in every
   * engine. A drawer that slides leaves inert, sliding out.
   *
   * A collapsible drawer narrows to its column, its look becoming the column's (WIDENING), and leaves `interactive`:
   * what focus goes back to is often slotted in it (the menu button), and it is becoming the column, which is part of
   * the page — so it takes focus and the pointer as it narrows, and only its scrim takes none. Once its motion has ended
   * (its own transitions' `finished`, the clock that draws it — no timer) its column takes the dialog's place, drawn as
   * the dialog's last frame was, focus kept where it is.
   */
  private withdraw(restore = true, notify = true) {
    if (!this.shown) return;
    if (this.held) {
      this.withdrawHeld(restore, notify);
      return;
    }
    this.shown = false;
    const dialog = this.dialog;
    const run = ++this.leaveRun;
    // A drag the product's close interrupted ends where the drawer is drawn: it leaves from there.
    this.drag = null;
    dialog?.classList.remove('dragging');
    dialog?.style.removeProperty('--_drag');
    holdPageScroll(this, false);
    const widening = !dialog || dialog.classList.contains('widening');
    // What focus goes back to (`restoreFocus`, now or once its column has taken the dialog's place): often outside it.
    const opener = restore ? this.opener : null;
    const left = dialog ? closeModal(dialog, widening ? { instant: !notify, interactive: true, moves: WIDENING } : { instant: !notify }) : null;
    if (widening && !(dialog && isLeaving(dialog))) {
      // Already out of the top layer (no motion to play: reduced motion, or at once): its column takes its place first,
      // in this task's update, and focus goes back once it has — what had it may be slotted in the column.
      this.takeColumn(run, restore);
    } else {
      if (restore) this.restoreFocus();
      else this.opener = null;
      if (widening && left) {
        this.narrowing = true;
        void left.then((done) => done && this.takeColumn(run));
      }
    }
    // NVD-22, NVD-40: a collapsible drawer's rows narrowing to its column, and the colors of what focus left and went
    // back to — inside it or outside — begin in the first frame drawn after this task, as the surface's exit does
    // (statesFromNextFrame).
    statesFromNextFrame([this, opener]);
    if (notify) this.dispatchEvent(new Event('close'));
  }

  /**
   * NVD-40: a collapsible modal drawer out of the top layer: its column takes the dialog's place, its items scrolled as
   * the dialog's were. Then focus goes back (`restore`, as `withdraw` says), or, after a narrowing that gave it back as
   * it began, is kept where it is.
   */
  private takeColumn(run: number, restore?: boolean) {
    if (run !== this.leaveRun || this.shown) return;
    this.narrowing = false;
    const back = () => {
      if (restore) this.restoreFocus();
      else this.opener = null;
    };
    if (!this.collapses || !this.presented) {
      if (restore !== undefined) back();
      return;
    }
    this.carriedOffset = this.scroller?.scrollTop ?? null;
    const focused = restore === undefined && this.hasFocus() ? (deepActive() as HTMLElement | null) : null;
    this.presented = false;
    void this.updateComplete.then(() => {
      if (this.shown) return;
      this.carryOffset();
      if (restore !== undefined) back();
      else if (focused?.isConnected && deepActive() !== focused) focused.focus();
    });
  }

  /** NVD-40: the items of the panel now drawn are scrolled where those of the panel it replaced were. */
  private carryOffset() {
    const offset = this.carriedOffset;
    this.carriedOffset = null;
    const scroller = this.scroller;
    if (offset !== null && scroller && scroller.clientHeight && scroller.scrollTop !== offset) this.scrollItemsTo(scroller, offset);
  }

  // ---- held below an app shell's header (NVD-19, NVD-20, NVD-22, NVD-23, NVD-54) ----

  /** Counts the openings and closings of a held drawer, and its moves, so that only the last one's end is acted on. */
  private overRun = 0;
  private moveRun = 0;
  /** A held drawer is closing (its exit, and its scrim's, still playing) or moving to a new presentation (NVD-22, NVD-54). */
  private leavingHeld = false;
  private moving = false;

  private get scrim(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.scrim') ?? null;
  }

  /**
   * APS-32: a held drawer stands over the main region, the aside, the footer and the navigation bar while it is open over
   * the content, while it closes and while it moves to a new presentation (`data-over`, which the app shell's stylesheet
   * reads). Once its motions have ended it is in a place of its own again — out of the window, or its column — and lying
   * over nothing, it can stand where it stood: nothing is seen to change.
   */
  private syncOver() {
    this.toggleAttribute('data-over', this.held && (this.shown || this.leavingHeld || this.moving));
  }

  /**
   * Resolves with true once the host's, the panel's and the scrim's own motions have ended — what replaces one while it
   * runs is waited for too — or with false as soon as `current()` is false (another run began).
   */
  private async settleOver(current: () => boolean): Promise<boolean> {
    for (;;) {
      if (!current()) return false;
      const running = [this, this.panel, this.scrim].flatMap((element) => element?.getAnimations() ?? []).filter((animation) => animation.playState !== 'finished' && Number(animation.effect?.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY);
      if (!running.length || !this.isConnected) break;
      await Promise.allSettled(running.map((animation) => animation.finished));
    }
    return current();
  }

  /**
   * NVD-19, APS-4: where a held drawer stands over the content — from the header's bottom edge (the window's top edge
   * where a static header has scrolled out of view) to the window's bottom edge, at the start edge of its own box — and,
   * for its column, how far its box is from the window's bottom edge. Read where it opens and where its presentation
   * changes; the page does not scroll under it while it is open.
   */
  private placeHeld() {
    const header = this.parentElement?.querySelector(':scope > [slot="header"]');
    const box = this.getBoundingClientRect();
    const top = Math.max(0, header ? header.getBoundingClientRect().bottom : 0);
    const rtl = getComputedStyle(this).direction === 'rtl';
    const start = rtl ? document.documentElement.clientWidth - box.right : box.left;
    this.style.setProperty('--_top', `${Math.round(top * 100) / 100}px`);
    this.style.setProperty('--_start', `${Math.round(start * 100) / 100}px`);
    this.style.setProperty('--_reach', `${Math.round(Math.max(0, window.innerHeight - box.top) * 100) / 100}px`);
  }

  /**
   * NVD-19: a held drawer opens over the content below the header: it slides in (a collapsible one widens from its
   * column) and its scrim fades in, and focus goes to the selected destination. It keeps no focus inside and makes
   * nothing inert: the app shell makes the regions under the scrim inert and holds the page's scroll (APS-7).
   */
  private presentHeld() {
    const panel = this.panel;
    if (!panel || this.shown || !this.isConnected) return;
    this.placeHeld();
    // Opened by a press on a menu button that gave it no focus (Safari on macOS), focus goes back to that button.
    const active = deepActive();
    this.opener = (!active || active === document.body) && this.pressedMenu?.isConnected ? this.pressedMenu : active;
    this.pointerReturn = false;
    // MOT-4: opened before the document's first paint, it is drawn open at once.
    if (!documentPainted()) this.drawAtOnce();
    const { shower } = this.takeSnapshot();
    this.shown = true;
    this.leavingHeld = false;
    this.overRun++;
    this.syncOver();
    this.applyOffset();
    // NVD-19, NVD-40: the slide (or the widening), the scrim's fade and the colors of the cell that took focus and of
    // what focus left (the app shell's menu button, outside it) begin in the first frame drawn after this task.
    this.heldFromNextFrame(false);
    this.focusAsShown(shower, this.opener);
  }

  /**
   * NVD-19, NVD-22, NVD-54: a held drawer's slide, its move and its scrim's fade, which a held drawer plays by its own
   * state (no AppearController, no dialog: `statesFromNextFrame` leaves what carries `data-tanrei-appear` to those),
   * begin in the first frame drawn after this task (`startFromNextFrame`): WebKit dated them from the frame drawn before
   * it, and where the task took longer than they last drew the drawer in place, or gone, at once. Only those standing
   * at their start: one under way goes on as it is. `leaving`: its close or its move, which `settleOver` waits for.
   */
  private heldFromNextFrame(leaving: boolean) {
    if (!documentPainted()) return;
    const begun = [this.panel, this.scrim].flatMap((element) => element?.getAnimations() ?? []).filter((animation) => Number(animation.currentTime ?? 0) === 0);
    startFromNextFrame(begun, { leaving });
  }

  /**
   * NVD-20, NVD-22: a held drawer closes: everything changes as it begins — `close`, so that the app shell takes its
   * inert away first, then focus back where it was — and the panel slides out (a collapsible one narrows back to its
   * column) as its scrim fades, taking no press. Nothing happens when that motion ends: the scrim has faded to nothing
   * and the panel has left the window or become its column at rest, which is the same element. Without `notify` (the
   * frame's header gone) nothing is emitted and focus stays.
   */
  private withdrawHeld(restore: boolean, notify: boolean) {
    this.shown = false;
    this.drag = null;
    const panel = this.panel;
    panel?.classList.remove('dragging');
    panel?.style.removeProperty('--_drag');
    this.leavingHeld = true;
    const run = ++this.overRun;
    this.syncOver();
    if (notify) this.dispatchEvent(new Event('close'));
    const opener = restore ? this.opener : null;
    if (restore) this.restoreFocus();
    else this.opener = null;
    // NVD-20, NVD-22: its slide, its scrim's fade and the colors of what focus left and went back to (the app shell's
    // menu button, outside it) begin in the first frame drawn after this task.
    this.heldFromNextFrame(true);
    statesFromNextFrame([this, opener]);
    void this.settleOver(() => run === this.overRun && !this.shown).then((done) => {
      if (!done) return;
      this.leavingHeld = false;
      this.syncOver();
    });
  }

  /**
   * NVD-54: a held drawer moves from its place and form in the old presentation to those of the new one over
   * motion.expand, as the one surface it is (`data-moving`: the panel's and the scrim's motions take that duration and
   * curve, and the host's own place in the layout changes at once). It stands over the content while it moves.
   */
  private moveHeld() {
    this.moving = true;
    this.setAttribute('data-moving', '');
    const run = ++this.moveRun;
    this.syncOver();
    void this.updateComplete.then(() => {
      if (run !== this.moveRun) return;
      this.placeHeld();
      // The panel's and the scrim's move, and the rows' new form, begin in the first frame drawn after this task. The
      // move is waited for (settleOver), as a close is: it is played even where a page clock holds frame callbacks.
      this.heldFromNextFrame(true);
      statesFromNextFrame([this]);
      void this.settleOver(() => run === this.moveRun).then((done) => {
        if (!done) return;
        this.moving = false;
        this.removeAttribute('data-moving');
        this.syncOver();
      });
    });
  }

  /** NVD-20: Escape in a held drawer that is open over the content closes it (its own keys, and focus is not kept inside). */
  private readonly onHeldKeyDown = (event: KeyboardEvent) => {
    if (!this.shown || event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.dismiss();
  };

  /** NVD-20: a press on a held drawer's scrim — which covers only what lies below the header — closes it. */
  private readonly onHeldScrim = () => {
    if (this.shown) this.dismiss();
  };

  /** The change of form's duration, read through a real property (0 where motion is reduced). */
  private expandDuration(): number {
    const clock = this.renderRoot?.querySelector('.clock');
    return clock ? ms(getComputedStyle(clock).transitionDelay) : 0;
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    // A collapsible drawer narrowing to its column takes focus, but is no longer modal: its keys are the page's.
    if (!this.shown) return;
    if (event.key === 'Escape') {
      if (event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      this.dismiss();
      return;
    }
    if (event.key === 'Tab' && this.dialog) trapFocus(event, this.dialog);
  };

  /** The platform's back (a close request without a key) arrives as the native cancel. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    this.dismiss();
  };

  #onScrim(event: MouseEvent): boolean {
    const dialog = this.dialog;
    if (!dialog || event.composedPath()[0] !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    this.pressedScrim = this.#onScrim(event);
    if (this.pressedScrim || !this.open) return;
    this.drag = { id: event.pointerId, x: event.clientX, time: event.timeStamp, following: false, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0 };
  };

  /**
   * NVD-22, NVD-37: a press on the menu button of an open modal drawer, which closes it on its click, moves no focus:
   * focus stays where it is until the drawer closes and gives it back (as a pointer's focus: restoreFocus). Left to the
   * engine the press gives focus to the button (Chromium, Firefox) or, where a pressed button takes none, to the dialog
   * itself, which takes focus from script (WebKit) — and the focused destination left its focused color over the state
   * motion before the drawer began to narrow, out of step with the width that the change of form recolors it with
   * (NVD-35, NVD-40).
   *
   * Only where the engine can give focus back as a pointer's (`focusVisible: false`, `hasFocusVisibleOption()`): where it
   * cannot (Chromium before 145, Safari before 18.4) a script's focus after a drawer opened from the keyboard draws the
   * focus indicator, so there the press is left to give focus as it does, and what it gave focus to draws none.
   */
  private readonly onMouseDown = (event: MouseEvent) => {
    const menu = this.headerButtons[0];
    if (!this.collapsible || !this.modal || !this.open || !menu || event.button !== 0 || !event.composedPath().includes(menu)) return;
    if (hasFocusVisibleOption()) event.preventDefault();
  };

  /** The distance dragged toward the start edge (positive), whatever the direction of the text. */
  private towardStart(dx: number): number {
    return getComputedStyle(this).direction === 'rtl' ? dx : -dx;
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    const dialog = this.surface;
    if (!drag || !dialog || event.pointerId !== drag.id) return;
    const distance = this.towardStart(event.clientX - drag.x);
    if (!drag.following) {
      if (distance <= TOUCH_SLOP) return;
      drag.following = true;
      dialog.classList.add('dragging');
      try {
        dialog.setPointerCapture?.(event.pointerId);
      } catch {
        // A pointer the browser no longer counts as active cannot be captured; the dialog still follows its events.
      }
    }
    const dt = event.timeStamp - drag.lastTime;
    if (dt > 0) drag.velocity = this.towardStart(event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    const offset = Math.max(0, distance);
    const rtl = getComputedStyle(this).direction === 'rtl';
    dialog.style.setProperty('--_drag', `${rtl ? offset : -offset}px`);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    const dialog = this.surface;
    this.drag = null;
    if (!drag || !dialog || event.pointerId !== drag.id || !drag.following) return;
    const distance = this.towardStart(event.clientX - drag.x);
    dialog.classList.remove('dragging');
    dialog.style.removeProperty('--_drag');
    // The click that ends a drag is not an activation.
    this.dragged = true;
    setTimeout(() => (this.dragged = false), 0);
    // NVD-20: a fling is the last move's speed, and none where the pointer held still before the release.
    const flung = drag.velocity >= FLING_VELOCITY && !stoppedBefore(drag.lastTime, event.timeStamp);
    if (distance > dialog.getBoundingClientRect().width / 2 || flung) this.dismiss();
  };

  /** Swallows the click that ends a drag, before it reaches a destination. */
  private readonly onClickCapture = {
    capture: true,
    handleEvent: (event: MouseEvent) => {
      if (!this.dragged) return;
      event.stopPropagation();
      event.preventDefault();
    },
  };

  private readonly onClick = (event: MouseEvent) => {
    const scrim = this.pressedScrim && this.#onScrim(event);
    this.pressedScrim = false;
    if (scrim) this.dismiss();
  };

  // ---- the header (NVD-37…39) ----

  #onHeaderButtons() {
    this.hasButtons = this.headerButtons.length > 0;
    this.observeSizes();
    this.syncMenuButton();
  }

  #onHeaderChange(event: Event) {
    this.hasTitle = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).some((node) => node.nodeType === Node.ELEMENT_NODE || (node.textContent ?? '').trim() !== '');
  }

  #onMainAction() {
    const actions = this.mainActions;
    this.hasMain = actions.length > 0;
    // NVD-39: the first is drawn; the rest are reported.
    actions.forEach((action, index) => action.toggleAttribute('data-tanrei-drawer-extra', index > 0));
    if (actions.length > 1) report(this, 'NVD-39', `it holds ${actions.length} main actions; the first is drawn`);
    this.observeSizes();
    this.syncMainAction();
  }

  private observeSizes() {
    this.sizes.disconnect();
    const [button] = this.headerButtons;
    const [main] = this.mainActions;
    if (button) this.sizes.observe(button);
    if (main) this.sizes.observe(main);
    this.measure();
  }

  /**
   * The first header button's width (the header slot starts item.gap after it, NVD-38), and the main action's size
   * (NVD-39): the header names the button's own tokens for that size, which the slotted button inherits and its place
   * is computed from — a size a design system added falls back to medium's tokens where the system lacks it, as the
   * button itself does.
   */
  private measure() {
    const [button] = this.headerButtons;
    const [main] = this.mainActions;
    const next: Record<string, string> = {};
    if (button?.offsetWidth) next['--_lead'] = `calc(var(--_nvd-column) / 2 + ${button.offsetWidth / 2}px)`;
    if (main) {
      const given = main.getAttribute('size') ?? '';
      const size = /^[a-z0-9][a-z0-9-]*$/.test(given) ? given : 'medium';
      const token = (name: string) => `var(--tanrei-comp-main-action-button-${name}-${size}, var(--tanrei-comp-main-action-button-${name}-medium))`;
      next['--_mab-h'] = token('container-height');
      next['--_mab-pad'] = token('container-padding-inline-start-with-icon');
      next['--_mab-icon'] = token('icon-size');
      this.reportMainAction(main);
    }
    // NVD-39: a trailing glyph keeps the collapsed start while expanded.
    this.toggleAttribute('data-main-trailing', main?.getAttribute('icon-position') === 'trailing');
    const now = this.measured;
    if (Object.keys(next).length !== Object.keys(now).length || Object.entries(next).some(([key, value]) => now[key] !== value)) this.measured = next;
  }

  /**
   * NVD-39: what a debug build is told of a main action whose glyph the drawer cannot keep on the icon column inside it:
   * a collapsed square wider than the column (it reaches past the column's start edge), and a trailing glyph (it leaves
   * the column while the drawer is expanded).
   */
  private reportMainAction(main: HTMLElement) {
    const header = this.renderRoot?.querySelector('.header');
    if (this.collapses && header && main.offsetHeight) {
      const column = Number.parseFloat(getComputedStyle(header).gridTemplateColumns);
      if (column && main.offsetHeight > column + 0.5) {
        report(this, 'NVD-39', `the main action's collapsed square is ${main.offsetHeight} wide and the icon column ${column}; its glyph stays on the column's centre line, so the button reaches past the column's start edge; choose a smaller size`);
      }
    }
    if (main.getAttribute('icon-position') === 'trailing') report(this, 'NVD-39', 'the main action has a trailing glyph, which leaves the icon column while the drawer is expanded; give it a leading glyph');
  }

  /** NVD-37: the menu button says whether the drawer is expanded, and that it controls it, on its native button. */
  private syncMenuButton() {
    const first = this.headerButtons[0] ?? null;
    type Aria = HTMLElement & { ariaControlsElements?: Element[] | null };
    const inner = (button: HTMLElement | null) => (button?.shadowRoot?.querySelector('button') as Aria | null) ?? null;
    if (this.menuButton && this.menuButton !== first) {
      const old = inner(this.menuButton);
      if (old) {
        old.ariaExpanded = null;
        if ('ariaControlsElements' in old) old.ariaControlsElements = null;
      }
    }
    this.menuButton = first;
    if (!first) return;
    const button = inner(first);
    if (!button) {
      // Not rendered yet: once it is.
      void (first as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete?.then(() => {
        if (inner(first)) this.syncMenuButton();
      });
      return;
    }
    if (this.collapses) {
      button.ariaExpanded = String(!this.collapsed);
      if ('ariaControlsElements' in button) button.ariaControlsElements = [this];
    } else {
      button.ariaExpanded = null;
      if ('ariaControlsElements' in button) button.ariaControlsElements = null;
    }
  }

  /** NVD-39: the main action is collapsed to its icon while the drawer is, and extended while it is expanded. */
  private syncMainAction() {
    const [main] = this.mainActions;
    // Set before the button is defined too: a Lit element takes a property set before its upgrade as its own.
    if (main && ('collapsed' in main || !customElements.get(main.localName))) (main as HTMLElement & { collapsed: boolean }).collapsed = this.collapsed;
  }

  // ---- updates ----

  protected override willUpdate(changed: PropertyValues<this>) {
    // NVD-97, NVD-103: the widths the styles read, from the first frame. A width the product sets ends what a press on
    // the edge would give back (NVD-101).
    if (!this.hasUpdated || changed.has('width') || changed.has('minWidth') || changed.has('maxWidth')) {
      if (changed.has('width') && !this.ownWidth && this.hasUpdated) this.beforeDefault = null;
      this.ownWidth = false;
      this.writeWidths();
    }
    // NVD-22, NVD-40: a collapsible modal drawer that closes gives focus back as it closes (`withdraw`, in this update).
    // Focus already on the element it goes back to — a destination focused in the column before the drawer opened —
    // stays there: it does not leave, to come back in the same update.
    const focusLeaves = !this.held && changed.has('open') && !changed.has('variant') && !changed.has('collapsible') && !this.open && this.shown && this.dialog?.classList.contains('widening') && this.hasFocus() && deepActive() !== this.opener;
    // NVD-53: `responsive` turned on or off, or `collapsible` changed under it: the widths are listened to, or no longer.
    if ((changed.has('responsive') || changed.has('collapsible')) && this.hasUpdated) {
      if (changed.has('responsive')) this.watchWidths();
      else this.decide();
    } else if (this.responsive && !this.widths) this.watchWidths(); // its system's widths had not arrived yet
    // NVD-65: a change of density is drawn at once, without the motions of a change of form, a selection or a group.
    if (changed.has('density') && this.hasUpdated) this.drawAtOnce();
    const instant = this.hasAttribute('data-instant');
    const collapsed = this.collapsed;
    // NVD-35: a change of form takes the change's motion, for as long as it lasts; the collapsed attribute reflects it.
    // NVD-54: not when the window's width changed the presentation, which is drawn at once.
    const formChange = this.wasCollapsed !== undefined && collapsed !== this.wasCollapsed && !instant;
    if (formChange) {
      this.focusLost = collapsed && !this.modal && this.focusOnExpandedOnly();
      this.removeAttribute('data-sliding');
      this.setAttribute('data-form-change', '');
    }
    // Focus leaves the panel before anything else of this update is styled — a part that the change of form recolors
    // would otherwise begin that motion for the focus it still has, and turn it round in no time when focus goes back —
    // and once the change of form's motion is in force (data-form-change): where the style is brought up to date while
    // focus leaves (Chromium does), the focused cell's recolor starts there, and it takes the change of form's duration
    // and easing, in step with the narrowing, not the state motion's, which ends before it (NVD-35, NVD-40).
    if (focusLeaves) (deepActive() as HTMLElement | null)?.blur();
    if (formChange) {
      clearTimeout(this.formTimer);
      this.formTimer = setTimeout(() => this.removeAttribute('data-form-change'), this.expandDuration());
    }
    this.wasCollapsed = collapsed;
    this.reflectState();
    // NVD-18: a standard drawer that opens slides in over the enter motion.
    if (changed.has('open') && changed.get('open') !== undefined && this.open && !this.modal && !instant && !this.responsive) this.setAttribute('data-sliding', '');
    // NVD-53: …and so does the standard presentation of a responsive drawer with no collapsed form, shown again by expanded.
    const hiddenForm = this.responsive && this.decided === 'standard' && !this.collapsible;
    if (hiddenForm && changed.has('expanded') && changed.get('expanded') === false && this.expanded && !instant && !this.moving) this.setAttribute('data-sliding', '');
    // NVD-18, NVD-97: a width drawn without a motion (a room that changed, a key's step) is drawn so until its style has
    // settled (data-resizing, settleResize); opened or closed in those frames, the drawer slides by its motion.
    if (changed.has('open') && changed.get('open') !== undefined && this.hasAttribute('data-resizing')) {
      this.resizeFrame++;
      this.removeAttribute('data-resizing');
    }
    if (changed.has('open') && changed.get('open') === true && !this.open && !this.modal) this.closingWithFocus = this.hasFocus();
    // NVD-40: a collapsible modal drawer's dialog widens from its column, placed over it (a held drawer's one panel
    // widens in place: presentHeld).
    if (this.modal && this.collapses && this.open && !this.held) {
      if (!this.presented) {
        this.carriedOffset = this.scroller?.scrollTop ?? null;
        const active = deepActive();
        this.pendingOpener = (!active || active === document.body) && this.pressedMenu?.isConnected ? this.pressedMenu : active;
        const box = this.getBoundingClientRect();
        const rtl = getComputedStyle(this).direction === 'rtl';
        this.place = { '--_top': `${box.top}px`, '--_start': `${rtl ? document.documentElement.clientWidth - box.right : box.left}px`, '--_height': `${box.height}px` };
        this.presented = true;
        // MOT-4: a drawer that appears open before the document's first paint never showed its column: it is drawn open
        // at its full width, scrim and all, from its first frame, and does not widen from the column
        // (`@starting-style`). One added open after that widens from its column as one that opens does (NVD-40).
        if (!this.hasUpdated && !documentPainted()) this.drawAtOnce();
      }
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // NVD-98: a drag the drawer no longer has a handle for (its presentation changed, it closed) ends as released.
    if (this.resizeDrag && !this.resizeShown) this.finishDrag();
    // NVD-97, NVD-102: the width the rows are laid out at and what the handle says, kept as the room and the widths change.
    this.watchResizeTargets();
    if (this.beside) {
      // Read with every other host's of the turn (src/primitives/read-phase.ts), once the drawer is drawn: what the
      // handle says follows what it was given. An update that only drew what was read reads nothing again.
      if (!(changed.size === 1 && changed.has('resizeValues' as keyof TanreiNavigationDrawer))) readTogether(() => this.readResize());
      if (this.resizeShown && (changed.has('label') || changed.has('resizeLabel') || changed.has('resizable')) && !this.resizeLabel.trim() && !this.label.trim()) {
        report(this, 'NVD-102', 'resizeLabel and label are empty, so the resize handle has no accessible name; give the drawer a label');
      }
    } else this.style.removeProperty('--_nvd-room');
    // NVD-66: groups become destinations, or stop being ones, at once; nothing is emitted for it.
    if (changed.has('selectableGroups') && changed.get('selectableGroups') !== undefined) this.destinations.sync();
    // NVD-58: turned on, it shows the selection it has.
    if (changed.has('revealSelected') && changed.get('revealSelected') === false && this.revealSelected) {
      this.shownFor = undefined;
      this.destinations.sync();
    }
    // NVD-57, NVD-61: a drawer that takes its place only now is scrolled where it was asked to be, its selection in view.
    if (changed.has('open') && changed.get('open') === false && this.open && !this.modal) {
      this.applyOffset();
      this.bringSelectionIntoView();
    }
    // NVD-87: the chord is listened for while the drawer is filterable and shown; NVD-95: what the field carries.
    this.syncShortcut();
    if (this.fieldShown) this.exposeFilter();
    this.reportFilter();
    // NVD-24: a modal drawer without a label is a dialog without a name.
    if ((changed.has('label') || changed.has('variant')) && this.modal && !this.label.trim() && !namedByProduct(this)) report(this, 'NVD-24', 'label is empty, so the modal drawer is a dialog without a name; give it a label');
    // NVD-37: a collapsible drawer whose user cannot change its form.
    // (An app shell's menu button that controls it is the one its user has: APS-7.)
    if ((changed.has('collapsible') || has(changed, 'hasButtons')) && this.collapsible && !this.headerButtons.length && !this.shellMenu) {
      report(this, 'NVD-37', 'it is collapsible but has no header button, so its user cannot change its form; give it a menu button (slot="header-button")', { once: false });
    }
    const presentationChanged = has(changed, 'decided') || (changed.has('responsive') && changed.get('responsive') !== undefined);
    const variantChanged = (changed.has('variant') && changed.get('variant') !== undefined) || (changed.has('collapsible') && changed.get('collapsible') !== undefined) || presentationChanged;
    // NVD-54: a held drawer open over the content stays shown across a change between the column and the modal
    // presentations: the one surface moves (`moveHeld`).
    const keptOver = this.held && presentationChanged && !changed.has('variant') && !changed.has('collapsible') && this.modal;
    if (variantChanged && this.shown && !keptOver) this.withdraw(false, false);
    if (changed.has('open') || variantChanged || has(changed, 'presented')) {
      const was = changed.has('open') ? changed.get('open') === true : this.open;
      if (this.modal) {
        if (this.open) this.present();
        else if (this.shown) this.withdraw();
      } else if (changed.has('open') && this.hasUpdated && changed.get('open') !== undefined && !this.responsive) {
        // NVD-28: a standard drawer opened moves focus in; closed with focus inside, it gives it back.
        // What focus leaves as it opens, or goes back to as it closes: outside it.
        let back: Element | null = null;
        if (this.open && !was) {
          this.opener = deepActive();
          back = this.opener;
          this.focusInside();
        } else if (!this.open && was && this.closingWithFocus) {
          this.closingWithFocus = false;
          back = this.opener;
          this.restoreFocus();
        }
        // NVD-18, NVD-28: its slide, and the colors of what focus left and went to — inside it, or back where it was
        // when it opened — begin in the first frame drawn after this task (statesFromNextFrame). WebKit dated them from
        // the frame drawn before the task, and where the task took longer than they last drew them over at once.
        statesFromNextFrame([this, back]);
      }
    }
    const form = changed.has('collapsible') || changed.has('open') || changed.has('expanded') || changed.has('variant') || presentationChanged;
    if (form || has(changed, 'hasButtons')) this.syncMenuButton();
    if (form) this.syncMainAction();
    // NVD-39: the column the main action is placed on changed width (the form, the density): told again where it does not fit.
    if (form || changed.has('density')) {
      const [main] = this.mainActions;
      if (main) this.reportMainAction(main);
    }
    // NVD-36: focus on what the collapsed form does not draw goes to the menu button, or else the first focusable element.
    if (this.focusLost) {
      this.focusLost = false;
      const [menu] = this.headerButtons;
      const panel = this.panel;
      const first = menu ?? (panel ? tabbables(panel)[0] : undefined);
      first?.focus();
    }
    // NVD-54: focus that was in the drawer stays where it is while the new presentation still shows it; on something it
    // does not show, it goes to the menu button, or else the first focusable element still shown; and where the drawer
    // shows nothing it is left to the platform.
    const focused = this.focusBefore;
    if (focused && presentationChanged) {
      this.focusBefore = null;
      this.keepFocus(focused);
    }
    // NVD-54, NVD-55: once the presentation it names is drawn — the first decision included.
    if (this.announce && this.presentation) {
      this.announce = false;
      this.dispatchEvent(new CustomEvent<TanreiNavigationDrawerPresentationChangeDetail>('presentationchange', { bubbles: true, detail: { presentation: this.presentation } }));
    }
  }

  /** NVD-54: puts focus back on `element` if the drawer still shows it, or else on what it does show. */
  private keepFocus(element: HTMLElement) {
    const panel = this.panel;
    // Nothing of the drawer is shown (the modal presentation, closed): focus is the platform's.
    if (!panel || panel.matches('[inert]') || (panel instanceof HTMLDialogElement && !panel.open)) return;
    // Inert is inherited through slots and shadow roots: every ancestor in the flat tree is asked.
    const inert = (candidate: Element) => {
      for (let at: Element | null = candidate; at && at !== this; at = flatParent(at)) if (at.hasAttribute('inert')) return true;
      return false;
    };
    const shown = (candidate: HTMLElement) => candidate.isConnected && !inert(candidate) && candidate.getClientRects().length > 0 && getComputedStyle(candidate).visibility !== 'hidden';
    void Promise.all([...this.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>(`${CELLS}, ${SECTION}`)].map((cell) => cell.updateComplete)).then(() => {
      if (shown(element)) {
        if (deepActive() !== element) element.focus();
        if (deepActive() === element) return;
      }
      const first = this.controllingMenu() ?? tabbables(panel)[0];
      first?.focus();
    });
  }

  /** NVD-54: the menu button that controls the drawer — the app shell's while it controls it (APS-7), else its own (NVD-37). */
  private controllingMenu(): HTMLElement | null {
    if (this.shellMenu) {
      const shellButton = this.parentElement?.querySelector<HTMLElement>(':scope > [slot="header"] [data-app-shell-menu]');
      if (shellButton && shellButton.getClientRects().length) return shellButton;
    }
    return this.headerButtons[0] ?? null;
  }

  private body() {
    const collapsed = this.collapsed;
    const filled = this.hasButtons || this.hasTitle || this.hasMain;
    return html`
      <div part="outline" class="edge" aria-hidden="true"></div>
      <div part="header" class=${classMap({ header: true, filled, 'no-buttons': !this.hasButtons })} style=${styleMap(this.measured)}>
        <slot name="header-button" @slotchange=${this.#onHeaderButtons}></slot>
        <div class=${classMap({ title: true, filled: this.hasTitle })} ?inert=${collapsed} aria-hidden=${collapsed ? 'true' : nothing}>
          <slot name="header" @slotchange=${this.#onHeaderChange}></slot>
        </div>
        <div class=${classMap({ main: true, filled: this.hasMain })}><slot name="main-action" @slotchange=${this.#onMainAction}></slot></div>
      </div>
      ${this.filterField()}
      <div part="content" class="items" role="list" @scroll=${this.onScroll} @wheel=${containedWheel}>${this.filterLine()}<slot></slot></div>
      ${this.filterable ? html`<span class="filter-said" role="status" aria-atomic="true">${this.filterSaid}</span>` : nothing}
      <span class="clock"></span>
    `;
  }

  protected override render() {
    const label = this.label || nothing;
    if (this.held) {
      // NVD-19, NVD-23, NVD-54: held below an app shell's header, the drawer is one `<nav>` in every presentation — beside
      // the content, its column, or over the content below the header — never replaced by another element and never a
      // dialog: the navigation landmark named by its label, open or closed. Its scrim is its own, under it, and covers
      // what lies below the header only. Nothing of it is shown, and so it is inert, where it has no place and is not
      // open (a modal presentation that is closed, a standard one that is hidden).
      const hidden = !this.isOpen && !(this.modal && this.collapses);
      return html`<div class="scrim" aria-hidden="true" data-tanrei-appear @click=${this.onHeldScrim}></div>
        <nav
          part="container"
          class="drawer held"
          id="navigation"
          ${delegatedAria(this, { 'aria-label': this.label })}
          ?inert=${hidden}
          data-tanrei-appear
          data-tanrei-shape
          @keydown=${this.onHeldKeyDown}
          @pointerdown=${this.onPointerDown}
          @pointermove=${this.onPointerMove}
          @pointerup=${this.onPointerUp}
          @pointercancel=${this.onPointerUp}
          @click=${this.onClickCapture}
        >
          ${this.body()}
        </nav>
        ${this.resizeHandle()}`;
    }
    if (this.modal && (!this.collapses || this.presented)) {
      // NVD-23: a modal dialog named by the label, holding the navigation landmark. NVD-78: the product's ARIA on the host
      // is the dialog's, the element a person meets first.
      // NVD-23, NVD-40: narrowing back to its column it is closed, and exposed as the column is — the navigation landmark
      // named by the label (the dialog takes the landmark's role, its own `<nav>` none), not a dialog and not focusable
      // itself. It stays the element that is drawn: it holds the menu button that focus went back to, so it cannot be
      // inert, and an engine keeps a dialog's role where it is given none (Chromium, `role="none"`).
      const asColumn = this.narrowing;
      return html`<dialog
        part="container"
        class=${classMap({ drawer: true, widening: this.collapses })}
        data-tanrei-appear
        style=${styleMap(this.collapses ? this.place : {})}
        role=${asColumn ? 'navigation' : nothing}
        ${delegatedAria(this, { 'aria-label': this.label })}
        tabindex=${asColumn ? nothing : '-1'}
        data-tanrei-shape
        @keydown=${this.onKeyDown}
        @cancel=${this.onNativeCancel}
        @pointerdown=${this.onPointerDown}
        @mousedown=${this.onMouseDown}
        @pointermove=${this.onPointerMove}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
        @click=${this.onClick}
      >
        <nav class="landmark" role=${asColumn ? 'none' : nothing} aria-label=${asColumn ? nothing : label} @click=${this.onClickCapture}>${this.body()}</nav>
      </dialog>`;
    }
    // NVD-40: a collapsible modal drawer's column, while it is closed: a layout region, drawn as a standard drawer's.
    if (this.modal) return html`<nav part="container" class="drawer column" ${delegatedAria(this, { 'aria-label': this.label })} data-tanrei-shape>${this.body()}</nav>`;
    // NVD-18: closed, it is out of the focus order and the accessibility tree at once (inert), and hidden once it has slid out.
    return html`<nav part="container" class="drawer standard" id="navigation" ${delegatedAria(this, { 'aria-label': this.label })} ?inert=${!this.isOpen} data-tanrei-shape>${this.body()}</nav>
      ${this.resizeHandle()}`;
  }
}

// A section's divider and a destination's badge are the divider and badge components (NVD-17, NVD-42): they are defined
// wherever a drawer is.
if (!customElements.get('tanrei-divider')) customElements.define('tanrei-divider', TanreiDivider);
if (!customElements.get('tanrei-badge')) customElements.define('tanrei-badge', TanreiBadge);
// NVD-56: a collapsed cell's name is shown by the tooltip component.
if (!customElements.get('tanrei-tooltip')) customElements.define('tanrei-tooltip', TanreiTooltip);
// NVD-78: the product's ARIA on the drawer's host is its dialog's or its navigation landmark's; on an item's or a group's
// host it is its row's (src/primitives/delegated-aria.ts), in both forms of the drawer — whether it is the current page,
// whether a group is open and what it opens, and the disabled state are its own.
delegatesAria(TanreiNavigationDrawer, { sentence: 'NVD-78' });
delegatesAria(TanreiNavigationDrawerItem, { owns: ['aria-current', 'aria-disabled'], sentence: 'NVD-78' });
delegatesAria(TanreiNavigationDrawerGroup, { owns: ['aria-current', 'aria-expanded', 'aria-controls', 'aria-disabled'], sentence: 'NVD-78' });
if (!customElements.get(ITEM)) customElements.define(ITEM, TanreiNavigationDrawerItem);
if (!customElements.get(GROUP)) customElements.define(GROUP, TanreiNavigationDrawerGroup);
if (!customElements.get(SECTION)) customElements.define(SECTION, TanreiNavigationDrawerSection);
if (!customElements.get(DRAWER)) customElements.define(DRAWER, TanreiNavigationDrawer);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-navigation-drawer': TanreiNavigationDrawer;
    'tanrei-navigation-drawer-item': TanreiNavigationDrawerItem;
    'tanrei-navigation-drawer-group': TanreiNavigationDrawerGroup;
    'tanrei-navigation-drawer-section': TanreiNavigationDrawerSection;
  }
}
