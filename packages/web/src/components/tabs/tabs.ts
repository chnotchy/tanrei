import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { hiddenHost } from '../../primitives/hidden.js';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  CoalescedSync,
  GlyphMirrorController,
  OpenAxesController,
  PressController,
  type PressedBy,
  RovingKeys,
  SHEET_FLING_VELOCITY,
  type SharedChoice,
  SheetDrag,
  answersPress,
  choiceAttribute,
  compChoice,
  countWork,
  findInteractive,
  hostAria,
  keepInPlace,
  layoutScale,
  notifyItemUpdate,
  remember,
  remembered,
  report,
  sharedChoice,
  styleQueries,
  syncFocusStyle,
} from '../../primitives/index.js';
import type { TanreiTabsSizeRegistry, TanreiTabsVariantRegistry } from '../../registry.js';
import { ownDirection } from '../../styles/product-text.js';
import { TanreiTooltip } from '../tooltip/tooltip.js';
import { AXES, ICON_PLACEMENT, INLINE_VARIANTS, TRACK_CHOICE, TRACK_PROPERTY, TRANSITION_CHOICE, TRANSITION_PROPERTY, TRANSITION_VALUES, panelStyles, tabStyles, tabsStyles } from './tabs.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants (primary, secondary, tonal), plus any a design system's generated `.d.ts` registers. */
export type TanreiTabsVariant = keyof TanreiTabsVariantRegistry | (string & {});
/** The core sizes (small, medium), plus any a design system's generated `.d.ts` registers. */
export type TanreiTabsSize = keyof TanreiTabsSizeRegistry | (string & {});
/** How a row draws a new selection (TAB-43): `auto` takes the design system's answer, `comp.tabs.motion.transition`. */
export type TanreiTabsTransition = (typeof TRANSITION_VALUES)[number];

/** What `change` carries: the value of the tab the user selected, which the row's `value` now holds. */
export interface TanreiTabsChangeDetail {
  value: string;
}

/**
 * @internal What a linked `<tanrei-tab-view>` offers the row it is linked to (TAB-13, TBV-2, TBV-9): its panel of a
 * value, and a call when the row's selection, its tabs or its panels may have changed. The view links itself with
 * `linkView()`; nothing else implements it.
 */
export interface LinkedTabView extends HTMLElement {
  /** The view's panel of `value` — the first with it — or null. */
  panelFor(value: string): HTMLElement | null;
  /**
   * The row's selection, its tabs or its connection changed: the view follows (TBV-1, TBV-2) — `atOnce` when the row
   * took its group's choice, or one restored from storage, so that the view shows the panel without a switch (TBV-20).
   */
  followTabs(atOnce?: boolean): void;
  /**
   * TBV-18: the user selected `value` on the row the view draws itself. The row has set its own `value` and fires no
   * `change`: the view announces the selection instead, once.
   */
  rowSelected(value: string): void;
  /**
   * TBV-23: the row the view draws itself is about to draw a selection a person made on it; the view gives it the
   * transition its own form asks for first.
   */
  rowWillSelect(): void;
}

/** A row that follows its group's choice with others, waiting to be measured and drawn together with them (TAB-41). */
interface Following {
  row: TanreiTabs;
  tabs: TanreiTab[];
  from: TanreiTab | null;
  selected: TanreiTab;
}

/** What the row tells each of its tabs. */
interface TabContext {
  selected: boolean;
  tabStop: boolean;
  position: number;
  size: number;
  /** The secondary structure (icon before the label, the underline as wide as the tab): secondary's and tonal's; anything else is primary's. */
  secondary: boolean;
  /** The row fills (`fullWidth`): the indicator's box is the tab's whole share (TAB-16). */
  fill: boolean;
  /** The selected tab is disabled, so the indicator is drawn in its disabled color wherever it passes (TAB-6). */
  pillDisabled: boolean;
}

/** A box in a tab's own coordinates (or the row's), in CSS px. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the indicator and the underline are, in the row's track coordinates (TAB-16). */
interface Mark {
  pill: Box;
  line: { x: number; w: number };
}

/** What the row measures of a tab to place the indicator: the tab, its container (the indicator's box) and its plain content. */
interface TabParts {
  tab: HTMLElement;
  box: HTMLElement;
  content: HTMLElement;
  /** The probe of the indicator's width in a row that hugs: the content plus active-indicator.padding-inline on each side. */
  plate: HTMLElement;
}

/** TAB-16: what a tab read of itself to size its container — the indicator's height, and its width in a row that hugs. */
interface BoxSize {
  height: number;
  width: number;
  /** The tab's own width (at least the indicator's height, which is its least width, TAB-14). */
  tab: number;
  /** TAB-14: the indicator is a circle in a row that hugs, so the tab is that circle and no wider (but for the minimum target). */
  round: boolean;
  /**
   * TAB-34: how much more than the track's inset such a tab is wider than its circle on each side (0: no more). At an
   * end of the row the tab ends at the track's edge by that much less of itself, so that the circle still lies the
   * inset from the track's end.
   */
  over: number;
}

/**
 * How much larger the row is drawn than laid out (`layoutScale`): 1 at rest, and the scale of a surface growing in around
 * the row. Everything the row measures is read on the page and divided by it, so that every box it keeps and writes — the
 * indicator's, the clips', a tab's widths — is in the row's own pixels.
 */
type Scale = { x: number; y: number };
const UNSCALED: Scale = { x: 1, y: 1 };

/** Where the indicator is along the row: between two enabled tabs (the same one twice at an end), `p` of the way (TAB-28). */
interface Place {
  from: TanreiTab;
  to: TanreiTab;
  p: number;
  mark: Mark;
}

/** A drag across the row, before and after the row takes it (TAB-28…30). */
interface RowDrag {
  gesture: SheetDrag;
  /** The tab the press landed on, whose pressed state ends when the drag is taken. */
  pressed: TanreiTab | null;
  /** `taken`: the indicator follows the pointer. `cancelled`: it has returned, and the pointer is still down. */
  state: 'pending' | 'taken' | 'cancelled';
  /** The pointer's place along the row at its last move (clientX). */
  x: number;
  /** TAB-28: the catch-up from where the indicator rested to the pointer's place, while it runs. */
  catchUp: { animation: Animation; from: Mark } | null;
  /** Where the indicator was last drawn. */
  place: Place | null;
  /** The time of the last frame, for the scroll that keeps the indicator in view. */
  frameTime: number;
}

/**
 * TAB-28: how fast the tabs scroll to keep a dragged indicator in view, in px per ms. The spec names no speed; this is
 * the gesture's own constant, as the slop and the fling velocity are.
 */
const DRAG_SCROLL_SPEED = 0.6;

/** How many frames a row drawn at a scale that does not change is looked at before it is taken to rest at it (TAB-16). */
const SCALE_STILL_FRAMES = 30;

/** TAB-14, TAB-16: how much wider than tall a content may measure and still be as wide as it is tall, in px at rest. */
const CIRCLE_SLACK = 0.05;

/** Twice what a written length is rounded to (`px()`), in px: less than this is no overlap at all. */
const HAIR = 0.02;

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Whether two places of the indicator are one, to what a length is written to. */
const sameMark = (a: Mark, b: Mark) =>
  (['x', 'y', 'w', 'h'] as const).every((k) => Math.abs(a.pill[k] - b.pill[k]) < 0.01) && Math.abs(a.line.x - b.line.x) < 0.01 && Math.abs(a.line.w - b.line.w) < 0.01;
const between = (a: Mark, b: Mark, p: number): Mark => ({
  pill: { x: lerp(a.pill.x, b.pill.x, p), y: lerp(a.pill.y, b.pill.y, p), w: lerp(a.pill.w, b.pill.w, p), h: lerp(a.pill.h, b.pill.h, p) },
  line: { x: lerp(a.line.x, b.line.x, p), w: lerp(a.line.w, b.line.w, p) },
});

let ids = 0;
/** Whether `node` is inside `ancestor`, through shadow roots. */
function composedContains(ancestor: Element, node: Node): boolean {
  for (let each: Node | null = node; each; each = each instanceof ShadowRoot ? each.host : each.parentNode) if (each === ancestor) return true;
  return false;
}
const px = (n: number) => `${Math.round(n * 100) / 100}px`;
/**
 * Whether `element` is laid out right to left, asked of the document (`:dir()`, answered from the `dir` attributes
 * around it) and not of the cascade, so that asking styles nothing; an engine that cannot answer is asked for the
 * computed value.
 */
function rtlOf(element: Element): boolean {
  try {
    return element.matches(':dir(rtl)');
  } catch {
    return getComputedStyle(element).direction === 'rtl';
  }
}
const num = (n: number) => Math.round(n * 100) / 100;

/** A tab's box and its plain content's box within it, as the row read them, in the row's own pixels. */
interface TabFrame {
  size: { w: number; h: number };
  content: Box;
}

/**
 * TAB-16, TAB-24: what one tab draws of the indicator at `pill` and of the underline at `line`, both in the tab's own
 * coordinates (they may reach beyond it: the rest is drawn by its neighbours): the covered layer's clip, the same shape
 * cut out of the plain content, and the underline's clip — and whether the indicator reaches the tab at all, and its
 * content. Every number of the three is linear in the indicator's place while its corner stays (`radius` in px, taken
 * as the browser clamps it: at most half of either side), so a browser that interpolates two of these draws what this
 * function gives for the place in between: a slide's frames (TAB-17) are a drag's (TAB-28).
 */
function pieces(pill: Box, line: { x: number; w: number }, { size, content }: TabFrame, radius: number) {
  // Reaching it by less than what a length is written to (a hundredth of a pixel: two boxes that meet, measured apart)
  // is not reaching it — it would be a hairline of the indicator's color drawn beside the indicator, on its neighbour.
  const reaches = pill.w > HAIR && pill.h > HAIR && pill.x < size.w - HAIR && pill.x + pill.w > HAIR && pill.y < size.h - HAIR && pill.y + pill.h > HAIR;
  const r = Math.max(0, Math.min(radius, pill.w / 2, pill.h / 2));
  const [x, y, w, h] = [pill.x - content.x, pill.y - content.y, pill.w, pill.h];
  return {
    reaches,
    meets: reaches && x < content.w - HAIR && x + w > HAIR && y < content.h - HAIR && y + h > HAIR,
    cover: `inset(${px(pill.y)} ${px(size.w - pill.x - pill.w)} ${px(size.h - pill.y - pill.h)} ${px(pill.x)} round ${px(r)})`,
    plain: `path(evenodd, "M-99999 -99999H99999V99999H-99999Z M${num(x + r)} ${num(y)}H${num(x + w - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w)} ${num(y + r)}V${num(y + h - r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + w - r)} ${num(y + h)}H${num(x + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x)} ${num(y + h - r)}V${num(y + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + r)} ${num(y)}Z")`,
    underline: `inset(0 ${px(size.w - line.x - line.w)} 0 ${px(line.x)} round var(--_us) var(--_us) 0 0)`,
  };
}

/**
 * What the row has read of its layout in one go (`TanreiTabs.reading`): every box it asked for once, the strip's box,
 * computed style and scale, the indicator's timing and its corner. Nothing the row writes in between moves a box — a
 * clip, the visibility of a copy, an animation — except what `boxes()` writes and a scroll, after which it is read
 * afresh.
 */
interface Reading {
  rects: Map<Element, DOMRect>;
  strip?: { rect: DOMRect; style: CSSStyleDeclaration; scale: Scale };
  motion?: { duration: number; easing: string };
  radius?: number;
}

/** The slide's own name on every animation of it: the row's clock on the strip, and each tab's pieces (TAB-17). */
const SLIDE = 'tanrei-tabs-slide';

/**
 * One tab of a row — the spec's item kind `tab`: a label, an optional icon, and the value that selects it.
 * Placed as a child of `<tanrei-tabs>`, as `<option>` in a `<select>`; the row decides whether it is selected, which tab
 * is the Tab stop, and answers its activation.
 *
 * The host carries the tab's semantics — the tab role, its selected state, its position, the number of tabs and its
 * name, its label whether or not the label is drawn — and takes focus itself.
 *
 * A label that does not fit its tab (a row that fills) is truncated with an ellipsis and shown whole in a plain tooltip on
 * hover and keyboard focus; it stays the tab's whole accessible name, and the tooltip is not exposed a second time.
 *
 * @tag tanrei-tab
 * @csspart container - The tab's state layer: hover, focus and press and the ripple, drawn in the box the active indicator has on this tab (a capsule, a circle, or the tab's share in a row that fills), never on the tab's rectangle. The whole tab answers the pointer.
 * @csspart icon - The glyph (hidden from assistive technology).
 * @csspart label - The tab's text.
 * @csspart active-indicator - The indicator's piece on this tab, carrying the covered copy of the icon and label, clipped to where the indicator is (hidden from assistive technology).
 * @csspart underline - The underline's piece on the tab's bottom edge, clipped to where the underline is (hidden from assistive technology).
 */
export class TanreiTab extends TanreiElement {
  static override styles = [tabStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    value: { type: String, reflect: true },
    label: { type: String },
    icon: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    disabled: { type: Boolean, reflect: true },
    context: { state: true },
    truncated: { state: true },
  };

  /** Identifies the tab: the row's `value` names the selected tab by it, and `change` carries it. Unique within the row; required. */
  value = '';

  /** The tab's text and its accessible name. Required, even when `labelHidden` is true. */
  label = '';

  /** The name of a glyph of the system's icon set. Give every tab of a row an icon, or none. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. */
  icon = '';

  /** Draws the icon alone and keeps `label` as the accessible name (an icon-only tab). */
  labelHidden = false;

  /** Prevents selecting the tab; the arrow keys skip it and it is never the Tab stop. */
  disabled = false;

  /** What the row says about this tab. */
  private context: TabContext = { selected: false, tabStop: false, position: 0, size: 0, secondary: false, fill: false, pillDisabled: false };

  /** TAB-23: whether a row has told this tab what it is since the tab was last connected. */
  private told = false;

  /** TAB-25: the drawn label does not fit its tab, so it is truncated and the tooltip shows it whole. */
  private truncated = false;

  /** TAB-25: the label's box changes with the row's width and the text's (a font arriving, the text size). */
  private readonly labelSize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measureTruncation());
  private observedLabel: Element | null = null;

  /**
   * TAB-32: the tab's glyph, in both of its copies (TAB-24), is marked when the icon set mirrors its name in
   * right-to-left (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark.
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  /** TAB-8 / TAB-9: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('.tab') ?? null,
    // TAB-9, TAB-18: the ripple is drawn in the container (the indicator's box) and clipped to it, wherever the press lands.
    rippleHost: () => this.renderRoot?.querySelector<HTMLElement>('.box') ?? null,
    holdCarrier: () => this.renderRoot.querySelector('.content'),
    disabled: () => this.disabled,
  });

  private spaceDown = false;

  constructor() {
    super();
    // TAB-2: a disabled tab swallows every click that reaches it, from its content or dispatched on it.
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
    this.addEventListener('focus', this.onFocus);
    this.addEventListener('blur', this.onBlur);
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.id) this.id = `tanrei-tab-${++ids}`;
    if (this.observedLabel) this.labelSize$?.observe(this.observedLabel);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.labelSize$?.disconnect();
    this.told = false;
  }

  /**
   * @internal The row's side. Answers whether this is the first the tab is told since it was connected: the tab is
   * appearing, and what it is told is no change of state (TAB-23).
   */
  setTabsContext(context: TabContext): boolean {
    const first = !this.told;
    this.told = true;
    const now = this.context;
    if ((Object.keys(context) as (keyof TabContext)[]).every((key) => context[key] === now[key])) return first;
    this.context = context;
    return first;
  }

  /** @internal Whether the row draws this tab as its selected one. */
  get isSelected(): boolean {
    return this.context.selected;
  }

  /** `element.click()` selects the tab as a pointer would; a disabled tab does nothing (TAB-2). */
  override click() {
    if (this.disabled) return;
    super.click();
  }

  /** @internal What the row measures to place the indicator (TAB-16, TAB-17). */
  get indicatorParts(): TabParts | null {
    const root = this.renderRoot;
    const tab = root?.querySelector<HTMLElement>('.tab');
    const box = root?.querySelector<HTMLElement>('.box');
    const content = root?.querySelector<HTMLElement>('.tab > .content');
    const plate = root?.querySelector<HTMLElement>('.plate');
    return tab && box && content && plate ? { tab, box, content, plate } : null;
  }

  /**
   * @internal TAB-23, TAB-38: while `on`, the tab's colors change at once — the tab is appearing, or the row follows its
   * group's choice, or one restored from storage, and a follower shows no motion. The row takes it off again once the
   * change is drawn.
   */
  still(on: boolean) {
    this.renderRoot?.querySelector('.tab')?.toggleAttribute('data-still', on);
  }

  /** @internal TAB-28: the drag was taken, so the pointer's press on this tab ends as any press by the pointer does (TAB-8). */
  releasePress(by?: Event | PressedBy) {
    this.press.release(by);
  }

  /**
   * @internal TAB-16, TAB-18: reads what sizes the container, which is the indicator's box on this tab. Its height is the
   * tab's (the row's) less track.padding above and below — the box's own, by its insets. In a row that hugs its width
   * is the content plus active-indicator.padding-inline on each side (the probe), never wider than the tab and never
   * narrower than its height — and exactly its height where the content is not wider than it is tall: a circle.
   * Everything is in the tab's own pixels: what is read on the page is divided by the row's `scale`, so a row first
   * drawn while its surface scales in sizes its tabs as it does at rest (the padding and what is written are never
   * scaled).
   */
  readBox(scale: Scale = UNSCALED): BoxSize | null {
    const parts = this.indicatorParts;
    if (!parts) return null;
    const height = parts.box.getBoundingClientRect().height / scale.y;
    // The tab's own width is what it has before an end of the row takes some of it back (TAB-34): what is drawn, and
    // what was taken.
    const tab = Math.max(parts.tab.getBoundingClientRect().width / scale.x + this.trimmed, height);
    const drawn = parts.content.getBoundingClientRect();
    const content = { width: drawn.width / scale.x, height: drawn.height / scale.y };
    const padding = getComputedStyle(parts.content);
    const tall = content.height - (Number.parseFloat(padding.paddingTop) || 0) - (Number.parseFloat(padding.paddingBottom) || 0);
    // What the page rounds a box to, read through the scale, is the measurement's and not the content's: a glyph as
    // wide as it is tall is a circle at any scale.
    const circle = content.width <= tall + CIRCLE_SLACK / Math.min(1, scale.x, scale.y);
    // In a row that fills the box is the tab's whole share (the stylesheet's), whatever the tab holds.
    const fill = this.context.fill;
    const width = fill ? tab : circle ? height : Math.min(tab, Math.max(height, parts.plate.getBoundingClientRect().width / scale.x));
    const round = circle && !fill;
    // The track's inset is the box's own, above and below (the stylesheet's).
    const over = round ? (tab - width) / 2 - (Number.parseFloat(getComputedStyle(parts.box).top) || 0) : 0;
    return { height, width, tab, round, over: over > 0.01 ? over : 0 };
  }

  /** TAB-34: how much narrower than its own width the tab is laid out now, in px: what its ends of the row took back. */
  private trimmed = 0;

  /**
   * @internal TAB-14, TAB-16, TAB-34: writes what `readBox()` read — the container's width, the tab's least width,
   * whether the tab is its circle (no inline padding), and how much wider than its indicator the tab is at each side
   * (`--_wider`: what is left of the track's inset beside an end tab is that tab's hit area). Returns whether what it
   * wrote changes the tab's own width, so that the row reads the tabs again.
   */
  writeBox(size: BoxSize | null): boolean {
    const tab = this.renderRoot?.querySelector<HTMLElement>('.tab');
    if (!tab || !size) return false;
    const least = px(size.height);
    if (this.style.getPropertyValue('--_th') !== least) this.style.setProperty('--_th', least);
    const resized = tab.hasAttribute('data-round') !== size.round;
    if (resized) tab.toggleAttribute('data-round', size.round);
    const wider = px(Math.max(0, (size.tab - size.width) / 2));
    if (this.style.getPropertyValue('--_wider') !== wider) this.style.setProperty('--_wider', wider);
    // TAB-34: at an end of the row a circle's tab that is wider than the circle by more than the track's inset ends at
    // the track's edge: it is laid out that much narrower on that side, and its content, its container and its ring
    // lean the same way, so that the circle lies the inset from the track's end and one tab's width from its
    // neighbour's. (The track clips what would reach beyond it; the row answers a press there, `tabBeside()`.)
    const { position, size: count } = this.context;
    const [start, end] = [position === 1 ? size.over : 0, position > 0 && position === count ? size.over : 0];
    const trim = start + end;
    const both = Math.min(start, end);
    const set = (name: string, value: number) => {
      const text = value > 0 ? px(value) : '';
      if (this.style.getPropertyValue(name) === text) return false;
      if (text) this.style.setProperty(name, text);
      else this.style.removeProperty(name);
      return true;
    };
    const trimmedNow = set('--_trim', trim);
    set('--_lean-start', end - both);
    set('--_lean-end', start - both);
    this.trimmed = trim > 0 ? Math.round(trim * 100) / 100 : 0;
    // A box as wide as the tab is the tab's own width (the stylesheet's 100%), not a number that could lag behind it.
    const width = size.width >= size.tab - 0.01 ? '' : px(size.width);
    if (tab.style.getPropertyValue('--_bw') !== width) {
      if (width) tab.style.setProperty('--_bw', width);
      else tab.style.removeProperty('--_bw');
    }
    return resized || trimmedNow;
  }

  /**
   * @internal TAB-16, TAB-24: draws the indicator's and the underline's pieces on this tab. `pill` and `line` are in the
   * tab's own coordinates (they may reach beyond it: the rest is drawn by its neighbours), `size` is the tab's box and
   * `content` its plain content's box, `radius` the indicator's corner in px. The covered layer — the indicator's color
   * and the covered copy — is clipped to the indicator; the plain content has the same shape cut out, so nothing is
   * drawn twice under a translucent indicator. `null` draws neither.
   */
  paintIndicator(pill: Box | null, line: { x: number; w: number } | null, size: { w: number; h: number }, content: Box, radius: number) {
    const root = this.renderRoot;
    const cover = root?.querySelector<HTMLElement>('.cover');
    const underline = root?.querySelector<HTMLElement>('.underline');
    const plain = root?.querySelector<HTMLElement>('.tab > .content');
    if (!cover || !underline || !plain) return;
    const piece = pill && line ? pieces(pill, line, { size, content }, radius) : null;
    // A tab the indicator does not reach draws no copy at all: hidden, not only clipped away, so that nothing reads it as
    // text on the indicator's color (an accessibility checker does not see a clip).
    cover.style.visibility = piece?.reaches ? '' : 'hidden';
    cover.style.clipPath = piece?.cover ?? '';
    plain.style.clipPath = piece?.meets ? piece.plain : '';
    underline.style.clipPath = piece?.underline ?? '';
  }

  /**
   * @internal TAB-17, TAB-24: this tab's pieces of a slide — the covered layer's clip, the cut in the plain content and
   * the underline's clip, each moved by the browser through what `pieces()` gives at every one of `stops` (the
   * indicator's places along the slide, at equal parts of it, in the tab's own coordinates), over `timing` from `start`
   * on the document's timeline. What the tab is given to draw at rest (`paintIndicator`, the slide's end) is under them
   * and shows when they are over; while they run the covered layer is drawn on every tab the indicator passes.
   * Returns the animations: the row holds them.
   */
  slideIndicator(stops: { pill: Box; line: { x: number; w: number } }[], frame: TabFrame, radius: number, timing: KeyframeEffectOptions, start: number | null): Animation[] {
    const root = this.renderRoot;
    const cover = root?.querySelector<HTMLElement>('.cover');
    const underline = root?.querySelector<HTMLElement>('.underline');
    const plain = root?.querySelector<HTMLElement>('.tab > .content');
    if (!cover || !underline || !plain) return [];
    const drawn = stops.map((stop) => pieces(stop.pill, stop.line, frame, radius));
    // Everything the indicator passes between its stops: the box around them all.
    const [left, right] = [Math.min(...stops.map((stop) => stop.pill.x)), Math.max(...stops.map((stop) => stop.pill.x + stop.pill.w))];
    const [top, bottom] = [Math.min(...stops.map((stop) => stop.pill.y)), Math.max(...stops.map((stop) => stop.pill.y + stop.pill.h))];
    const passed = pieces({ x: left, y: top, w: right - left, h: bottom - top }, stops[0].line, frame, 0);
    // Every tab is given the indicator's and the underline's clip — each draws its piece of one box, wherever the box
    // is — and the tabs the indicator passes draw their covered layer while it slides, with its shape cut out of their
    // plain content.
    const moved: [HTMLElement, PropertyIndexedKeyframes][] = [
      [cover, passed.reaches ? { clipPath: drawn.map((piece) => piece.cover), visibility: drawn.map(() => 'visible') } : { clipPath: drawn.map((piece) => piece.cover) }],
      [underline, { clipPath: drawn.map((piece) => piece.underline) }],
    ];
    if (passed.meets) moved.push([plain, { clipPath: drawn.map((piece) => piece.plain) }]);
    return moved.map(([element, keyframes]) => {
      const animation = new Animation(new KeyframeEffect(element, keyframes, timing));
      animation.id = SLIDE;
      if (start === null) animation.play();
      else animation.startTime = start;
      return animation;
    });
  }

  /** @internal The indicator's corner as drawn on this tab, in px (TAB-16). The row reads it once for each reading. */
  get indicatorRadius(): number {
    const plate = this.renderRoot?.querySelector('.plate');
    return plate ? Number.parseFloat(getComputedStyle(plate).borderTopLeftRadius) || 0 : 0;
  }

  /** TAB-41: the row measures this tab's label with every other row's (`measureLabel()`), so its next draw does not. */
  private labelDeferred = false;

  /** @internal TAB-41: the tab's next draw leaves its label unmeasured; the row has it measured with the others. */
  deferLabel() {
    this.labelDeferred = true;
  }

  /** @internal TAB-25, TAB-41: measures the label now, for the row. */
  measureLabel() {
    this.labelDeferred = false;
    this.measureTruncation();
  }

  /** TAB-25: whether the drawn label is cut short by its tab. */
  private measureTruncation() {
    const text = this.renderRoot?.querySelector<HTMLElement>('.tab > .content > .label > .text');
    this.truncated = !!text && text.scrollWidth > text.clientWidth;
    return this.truncated;
  }

  private get tooltip(): TanreiTooltip | null {
    return this.renderRoot?.querySelector<TanreiTooltip>('.tip') ?? null;
  }

  /**
   * TAB-14, TAB-25: whether what the row told the tab may cut its label anew: the first the tab is told, its structure
   * (secondary), whether the row fills — or, in a row that fills, its selection, whose heavier weight (TAB-50) may not
   * fit the share where the lighter one did. A row that hugs never cuts a label, so a selection that moves along it
   * measures none.
   */
  private labelRoomChanged(changed: PropertyValues<this>): boolean {
    if (!changed.has('context' as keyof TanreiTab)) return false;
    const before = changed.get('context' as keyof TanreiTab) as TabContext | undefined;
    const now = this.context;
    return !before || before.secondary !== now.secondary || before.fill !== now.fill || (now.fill && before.selected !== now.selected);
  }

  /** TAB-1: Enter activates on key-down and Space on key-up, as a native button does; the activation is a click. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.composedPath()[0] !== this) return;
    if (event.key === ' ') event.preventDefault(); // Space would scroll the page.
    if (this.disabled) return;
    this.press.onKeyDown(event);
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) super.click();
    } else if (event.key === ' ') this.spaceDown = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    if (event.composedPath()[0] !== this) return;
    this.press.onKeyUp(event);
    if (event.key !== ' ' || !this.spaceDown) return;
    this.spaceDown = false;
    if (!this.disabled) super.click();
  };

  /**
   * TAB-10: where style queries are missing, the focus style is read when focus arrives. TAB-25: keyboard focus on a
   * truncated tab shows its whole label (the tooltip opens by itself on hover; focus is on this host, outside it).
   */
  private readonly onFocus = () => {
    syncFocusStyle(this, this);
    if (!this.matches(':focus-visible') || !this.measureTruncation()) return;
    void this.updateComplete.then(() => {
      const tip = this.tooltip;
      if (tip && this.matches(':focus-visible')) tip.open = true;
    });
  };

  private readonly onBlur = () => {
    this.spaceDown = false;
    this.press.onBlur();
    const tip = this.tooltip;
    if (tip) tip.open = false;
  };

  /** TAB-19: the label is drawn unless it is hidden and there is an icon to draw instead. */
  private get drawsLabel(): boolean {
    return !this.labelHidden || !this.icon;
  }

  protected override updated(changed: PropertyValues<this>) {
    // TAB-25: watch the drawn label (a new element when it is drawn again), and measure it after a change of text.
    const label = this.renderRoot.querySelector('.tab > .content > .label');
    // A label that is watched from this update on is measured when the observer first reports it — after the layout
    // of the frame it is first drawn in, with every other tab's — and not here, in this tab's own turn, where the read
    // would have the page laid out once for each tab.
    let reported = false;
    if (label !== this.observedLabel) {
      if (this.observedLabel) this.labelSize$?.unobserve(this.observedLabel);
      if (label) this.labelSize$?.observe(label);
      this.observedLabel = label;
      reported = !!label && !!this.labelSize$;
    }
    if (!label) this.truncated = false;
    else if (reported) {
      // Measured in the coming frame.
    } else if (['label', 'icon', 'labelHidden'].some((key) => changed.has(key as keyof TanreiTab)) || (this.labelRoomChanged(changed) && !this.labelDeferred)) this.measureTruncation();
    const { selected, tabStop, position, size } = this.context;
    // TAB-2, TAB-12, TAB-13: the tab role, its selection, position and name; one Tab stop per row; a disabled tab takes
    // no focus at all, so a pointer cannot focus it either.
    hostAria(this, {
      role: 'tab',
      'aria-selected': String(selected),
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-label': this.label || null,
      'aria-posinset': position ? String(position) : null,
      'aria-setsize': size ? String(size) : null,
      tabindex: this.disabled ? null : tabStop ? '0' : '-1',
    });
    // TAB-22: a tab without a label still renders; a debug build says it has no name.
    if (changed.has('label') && !this.label.trim()) report(this, 'TAB-22', 'label is empty, so the tab has no accessible name; give it a label');
    // TAB-19: an icon-only tab needs an icon; without one the label is drawn anyway.
    if ((changed.has('labelHidden') || changed.has('icon')) && this.labelHidden && !this.icon) {
      report(this, 'TAB-19', 'label-hidden is set but the tab has no icon, so its label is drawn anyway; give it an icon');
    }
    if (changed.has('disabled') && this.disabled) this.spaceDown = false;
    // The row re-reads its tabs when a prop it depends on changes (values, disabled, labels); an internal event, kept out
    // of the tab's public API.
    if (this.hasUpdated && [...changed.keys()].some((key) => key !== 'context' && key !== 'truncated')) {
      notifyItemUpdate(this, 'tanrei-tab-update');
    }
  }

  protected override render() {
    const { selected, secondary, fill, pillDisabled, position, size } = this.context;
    // TAB-18: where style queries are missing, the size's icon placement is read here for the same rules.
    const placement = styleQueries() ? null : compChoice(this, '--_size-icon-placement', ICON_PLACEMENT);
    const label = this.drawsLabel;
    const icon = !!this.icon;
    const glyph = (named: boolean) => (icon ? html`<span part=${named ? 'icon' : nothing} class="icon" aria-hidden="true">${this.icon}</span>` : nothing);
    // TAB-33, TAB-21: the box that cuts the label has the label's own direction, so it is cut at its own end in every engine.
    // TAB-16, TAB-50: the label keeps the width it needs at the selected weight (the copy its ::after draws, unseen).
    const text = (named: boolean) => (label ? html`<span part=${named ? 'label' : nothing} class="label" dir=${ownDirection(this.label)} data-label=${this.label}><span class="text">${this.label}</span></span>` : nothing);
    // TAB-13, TAB-24, TAB-25: the tab is named by its host's aria-label; the covered copy and the tooltip are hidden from
    // assistive technology, so each label is exposed once.
    return html`
      <div
        class=${classMap({ tab: true, p: true, d: this.disabled, selected, wide: secondary, fill, first: position === 1, last: position > 0 && position === size, 'pill-disabled': pillDisabled, stacked: !secondary && icon && label })}
        data-placement=${placement ?? nothing}
        @pointerdown=${this.press.onPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.press.release}
      >
        <span part="container" class="box" data-tanrei-shape aria-hidden="true"></span>
        <span class="content"><span class="plate"></span>${glyph(true)}${text(true)}</span>
        <span part="active-indicator" class="cover" aria-hidden="true"><span class="content">${glyph(false)}${text(false)}</span></span>
        <span class="ring" data-tanrei-shape aria-hidden="true"></span>
        <span part="underline" class="underline" aria-hidden="true"></span>
        ${label && this.truncated ? html`<tanrei-tooltip class="tip" no-describe aria-hidden="true" .text=${this.label}></tanrei-tooltip>` : nothing}
      </div>
    `;
  }
}

/**
 * The view a tab shows. Placed as a child of `<tanrei-tabs>` after its tabs, or of a `<tanrei-tab-view>`, and matched to
 * the tab whose `value` is its own. The row (or the view) gives it the tab panel role, names it by its tab, hides it while
 * its tab is not selected, and makes it a Tab stop itself while it holds nothing focusable.
 *
 * In a `<tanrei-tab-view>` that draws its own row (TBV-16), the panel also says what its tab shows: `label`, `icon`,
 * `label-hidden` and `disabled`, as `<tanrei-tab>` has them. A panel of a `<tanrei-tabs>`, or of a view linked to a row
 * placed elsewhere, ignores them.
 *
 * @tag tanrei-tab-panel
 * @slot - The view.
 */
export class TanreiTabPanel extends TanreiElement {
  static override styles = panelStyles;

  static override properties: PropertyDeclarations = {
    value: { type: String, reflect: true },
    label: { type: String },
    icon: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    disabled: { type: Boolean, reflect: true },
    inView: { state: true },
  };

  /** The value of the tab that shows this panel. */
  value = '';

  /**
   * The text of this panel's tab in the row a `<tanrei-tab-view>` draws itself, and the accessible name of the tab and of
   * the panel. Required there, even when `labelHidden` is true.
   */
  label = '';

  /** The name of a glyph of the system's icon set for this panel's tab in the view's own row. Give every panel one, or none. */
  icon = '';

  /** Draws this panel's tab in the view's own row as its icon alone, keeping `label` as its accessible name. */
  labelHidden = false;

  /** Makes this panel's tab in the view's own row disabled: it cannot be selected, and a swipe skips its panel. */
  disabled = false;

  /** TBV-10: a panel of a `<tanrei-tab-view>` draws its focus ring inside the view's edge, following its corners. */
  private inView = false;

  constructor() {
    super();
    // TAB-13, TBV-10: where style queries are missing, the focus style is read when focus arrives.
    this.addEventListener('focus', () => syncFocusStyle(this, this));
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.id) this.id = `tanrei-tab-panel-${++ids}`;
    this.inView = this.parentElement?.localName === 'tanrei-tab-view';
  }

  protected override updated(changed: PropertyValues<this>) {
    // TBV-6, TBV-16: the row (or the view) re-reads its panels when their value — or, for a view's own row, a tab prop —
    // changes; an internal event, kept out of the panel's public API.
    if (this.hasUpdated && (['value', 'label', 'icon', 'labelHidden', 'disabled'] as const).some((key) => changed.has(key))) notifyItemUpdate(this, 'tanrei-tab-update');
  }

  protected override render() {
    return html`<div class=${classMap({ panel: true, inside: this.inView })} data-tanrei-shape><slot></slot></div>`;
  }
}

/**
 * Switches between views of the same subject with a row of labelled tabs, one of them selected, above the view it shows.
 *
 * Contract: specs/tabs.spec.json. `<tanrei-tab>` children are the tabs, in order; `<tanrei-tab-panel>` children after
 * them are the panels, matched to tabs by `value` — or, where a `<tanrei-tab-view tabs="<this row's id>">` is linked to
 * the row, the view's panels take their place (TAB-13), and the view draws the indicator between two tabs while it is
 * swiped (`indicatorOffset`, TAB-26). The row's selected tab is its `value`, as a `<select>`'s: `null`
 * selects the first enabled tab. The row sets it when a tab is activated — by pointer, touch, Enter, Space, or the arrow
 * keys, which select the tab they reach (automatic activation) — and then fires `change`.
 *
 * Three variants say how much the selection weighs — `primary`, `secondary`, and `tonal`, the quiet row whose indicator
 * is a soft layer under a darker label — and are one control in everything else. `size` is the row's height (`medium`,
 * the default, and `small`, which stands in a header beside small controls: it stays as low as it is, and a press just
 * above or below it, on nothing that would answer the press itself, still selects the tab in line with it).
 *
 * The row sits on a track: one constant color per variant, the same whichever tab is selected (a capsule in the
 * default system); `track="false"` fills none and changes nothing else, `track` draws it whatever the design system
 * says, and without the attribute the system decides (`--tanrei-comp-tabs-track-visible`). The tabs hug their content and scroll sideways inside the track (the default), or share the row's
 * width (`full-width`), truncating a label that does not fit. The selected tab's active indicator — the thumb on the
 * track: as tall as the row less the track's padding on every tab, a capsule as wide as the tab's content plus its
 * padding or a circle where that content is not wider than it is tall, and the tab's whole share in a row that fills —
 * slides to a newly selected tab with the underline, and each label and icon it passes over takes its covered colors
 * where it is covered.
 *
 * A drag across the row — by touch, a pen or a mouse, past 8 px and further sideways than up or down — carries the
 * indicator with the pointer, its place, its width and the covered colors changing continuously. Nothing is selected
 * before the release, which chooses the nearer of the two tabs the indicator lies between (or the one a fling is
 * toward), sets `value` and fires `change` once; Escape, a cancelled pointer, or `value` set meanwhile returns it.
 *
 * `transition` says how a new selection is drawn: `slide` as above, `none` whole in one frame — nothing travels and no
 * color fades between selected and not, a tab out of view is brought in at once, and a drag still carries the indicator
 * and lands at once on release — and `auto`, the default, as the design system says
 * (`--tanrei-comp-tabs-motion-transition`). Hover, focus and press are answered the same under each.
 *
 * Every visual value comes from `--tanrei-comp-tabs-*` tokens, per variant, look (selected or not) and state. How a
 * press is answered and how keyboard focus is drawn are the system's choices of kind (`--tanrei-sys-behavior-*`),
 * read from the cascade.
 *
 * @tag tanrei-tabs
 * @slot - `<tanrei-tab>` children (the tabs) and `<tanrei-tab-panel>` children (the panels).
 * @csspart tablist - The row that holds the tabs: the tab list.
 * @csspart scroller - The box that lays the tabs out and scrolls them sideways when they do not fit; it is also the track.
 * @csspart track - The constant background of the whole row (the same element as `scroller`): its color and its corners.
 * @csspart divider - The line along the bottom of the whole row.
 * @fires {CustomEvent<TanreiTabsChangeDetail>} change - The user selected another tab: `detail.value` (and the row's `value`) is its value.
 */
export class TanreiTabs extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'tabs');
  static override styles = [tabsStyles, hiddenHost];

  // The tabs go into the tab list and the panels after it: the row assigns each child to its slot.
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    track: { reflect: true, converter: choiceAttribute },
    fullWidth: { type: Boolean, attribute: 'full-width', reflect: true },
    value: { type: String },
    transition: { type: String, reflect: true },
    label: { type: String },
    group: { type: String },
    rememberAs: { type: String, attribute: 'remember-as' },
  };

  /**
   * How much the selection weighs. Primary tabs switch the main views of a screen, at the top of its content; secondary
   * tabs switch within one of them; tonal tabs are the quiet row, for a choice that should not compete with what it
   * changes — the language of a code sample, a contrast, a unit, a period. The three are the same control otherwise.
   */
  variant: TanreiTabsVariant = 'primary';

  /**
   * The row's height (small 32 / medium 48) and what shrinks with it: a tab's padding, the active indicator's margins
   * and the icon. A primary tab stacks its icon above its label or puts it before it as the size's
   * `comp.tabs.icon.placement` says (medium stacks and small does not, in the default system), and a small row's tabs
   * still answer a press within the minimum target.
   */
  size: TanreiTabsSize = 'medium';

  /**
   * Whether the row draws its track, the background behind all its tabs. False draws none and changes nothing else.
   * Null, the default, takes the system's choice (`track.visible`, on in the default system). The attribute: absent is
   * null, `track` is true, `track="false"` is false.
   */
  track: boolean | null = null;

  /**
   * False (hug, the default) sizes each tab to its content, never truncating its label, and scrolls the row sideways when
   * the tabs do not fit; true (fill) divides the row's width equally among the tabs and truncates a label that does not
   * fit its share, showing it whole in a tooltip (for two to five short labels).
   */
  fullWidth = false;

  /**
   * The value of the selected tab; `null` selects the first enabled tab. The row sets it when a tab is activated. While
   * the row is a member of a group (`group`), the group's choice selects the tab of that value wherever the row has one.
   */
  value: string | null = null;

  /**
   * How the row draws a new selection. `slide`: the active indicator and the underline slide and resize to the newly
   * selected tab, the labels' colors changing under them. `none`: the new selection is drawn whole in one frame.
   * `auto` (the default, and what any other value is taken as) takes the design system's answer
   * (`motion.transition`, slide in the default system). A drag across the row carries the indicator under each, and
   * hover, focus and press are answered the same; where motion is reduced a selection is drawn as `none` does.
   */
  transition: TanreiTabsTransition = 'auto';

  /**
   * The accessible name of the row: what the views are views of — or, for a row without panels, what is chosen
   * ("Contrast", "Units"). Needed when a screen has more than one row of tabs, and for every row without panels.
   */
  label = '';

  /**
   * Names a choice this row shares with the other rows of tabs in the document — placed by the product or drawn by a
   * `<tanrei-tab-view>` — that name the same group, compared exactly. Selecting a tab in one selects the tab of the same
   * value in every other row that has an enabled one, at once and without moving focus or the page; a row that has no
   * such tab keeps its own. Only the row the person used fires `change`. Empty (the default): the row's choice is its own.
   */
  group = '';

  /**
   * The key of the origin's `localStorage` under which a person's choice on this row is kept across pages and visits,
   * and from which it is restored before the row is first drawn. The key is the product's own and is used exactly as
   * given; only the chosen tab's value is stored. Empty (the default): the row neither reads nor writes any storage. It
   * needs no group, and a group needs no key.
   */
  rememberAs = '';

  /** TAB-36: the group the row is a member of now (null: none, or the row is out of the document). */
  private joined: SharedChoice<TanreiTabs> | null = null;
  /** TAB-37: the `value` the row last saw as its own; another one, once the row is drawn, is one the product set. */
  private known: string | null = null;
  /** TAB-39: whether the row has looked for a remembered choice, which it does once, before it is first drawn. */
  private restored = false;
  /** TAB-39: the remembered value a row without a group selects as soon as it has an enabled tab of it. */
  private restoring: string | null = null;
  /** TAB-38: the selection changed because the row follows (its group, or the storage): the next sync draws it at once. */
  private atOnce = false;
  /** TAB-41: the rows that follow one choice together; the row adds itself instead of measuring alone. */
  private following: Following[] | null = null;
  /** TAB-41: the `value` the row has already drawn as a follower, so that the update its change asks for draws nothing again. */
  private followed: string | null = null;

  /** TAB-26: the offset the indicator is drawn at now (0: on the selected tab). */
  private offset = 0;

  /**
   * Where the active indicator and the underline are drawn while a linked Tab view is swiped, relative to the selected
   * tab: 0 on it, 1 on the next enabled tab and −1 on the previous one in reading order, and in between for values
   * between (TAB-26). They follow it in the frame it is set, without a motion of their own; beyond 1 they stay on the
   * neighbour, and where there is no enabled tab in its direction they stay on the selected tab. The Tab view sets it;
   * a product leaves it at 0 unless it drives the indicator itself. A property only, with no attribute.
   */
  get indicatorOffset(): number {
    return this.offset;
  }

  set indicatorOffset(value: number) {
    const next = Number(value);
    const offset = Number.isFinite(next) ? next : 0;
    if (offset === this.offset) return;
    this.offset = offset;
    if (!this.hasUpdated) return;
    // TAB-26: while the offset is not 0 the swipe that sets it has the indicator, and the row follows no drag of its own.
    if (offset) this.cancelDrag(false);
    // TAB-26: no motion of their own — a running slide (TAB-17) ends where the offset puts them.
    this.stopSliding();
    this.readOnce(() => this.draw(this.at(this.selectedTab)));
  }

  /** TAB-13, TBV-9: the Tab view linked to this row, whose panels take the place of the row's own. */
  private linked: LinkedTabView | null = null;

  /** TBV-16, TBV-18: the Tab view that draws this row as its own, which announces the row's selections itself. */
  private owner: LinkedTabView | null = null;

  /** TAB-7: a variant or a size a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'tabs', behavior: 'TAB-7', axes: AXES });

  private readonly keys = new RovingKeys({ wrap: true });
  /**
   * The re-read of the tabs and panels (`sync()`), once per turn however many of them said they changed in it: a row of
   * N tabs built, or N labels changed at once, re-reads its N tabs once — not once per tab, which made the build O(N²).
   */
  private readonly syncs = new CoalescedSync(() => this.sync());
  /** What reads the tabs' context in the task it runs in reads it re-read (a key press, a press, focus). */
  private readonly flushSyncs = () => this.syncs.flush();
  /**
   * TAB-14, TAB-16: whether what the tabs' containers are sized from may have changed since the row last sized them —
   * a tab, a panel, the row's own props, its link — so that the next re-read sizes them again. A new selection alone
   * changes no tab's size (TAB-50), and is not re-sized: what does change a size later (a font, the text size) is seen
   * by the resize observer.
   */
  private reshaped = true;
  /** A tab or a panel said it changed, or the children did: the row re-reads them, and sizes them again. */
  private readonly itemsChanged = () => {
    this.reshaped = true;
    this.syncs.request();
  };
  private readonly children$ = new MutationObserver(this.itemsChanged);
  /**
   * TAB-15, TAB-17: a change of size or place (a font arriving, the text size, the row resizing) puts things back at
   * once. One observer for every row (TAB-41): the rows that changed in a frame are told together, so that they are
   * all measured and then all written.
   */
  private static readonly watched = new WeakMap<Element, TanreiTabs>();
  private static readonly resize$ =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          const rows = new Set<TanreiTabs>();
          for (const entry of entries) {
            const row = TanreiTabs.watched.get(entry.target);
            if (row?.isConnected) rows.add(row);
          }
          TanreiTabs.placeTogether([...rows]);
        });
  /**
   * What the observer watches for this row now, each with the tab it is a part of (null: the row's own). Emptied when
   * the row leaves the document, and of a tab's parts when the tab leaves the row.
   */
  private readonly observed = new Map<Element, TanreiTab | null>();
  /** The row's first placement is the observer's, and has not been reported yet (`sync`). */
  private awaitsObserver = false;
  /** The tab drawn selected at the last sync (TAB-17 slides the indicator from it). */
  private shownTab: TanreiTab | null = null;
  private scrolling: Animation | null = null;
  private scrollFrame = 0;
  /** Where the indicator and the underline are written to rest, in the track's coordinates (null: nowhere). */
  private rest: Mark | null = null;
  /**
   * TAB-17: the slide running now. `clock` is the row's own animation on the strip (it draws nothing; its progress is
   * the slide's), `parts` every tab's pieces, which the browser moves; `stops` are the indicator's places along the
   * slide, at equal parts of it — where it was, the enabled tabs it passes, where it goes — and `tabs` the tab each
   * stop is measured on (null: a place between tabs, where a slide, an offset or a drag had left it).
   */
  private sliding: { clock: Animation; parts: Animation[]; stops: Mark[]; tabs: (TanreiTab | null)[] } | null = null;

  /**
   * Where the indicator and the underline are drawn now, in the track's coordinates (null: nowhere): where they rest,
   * or the place a running slide has reached — worked out from its clock when it is asked for, never frame by frame.
   */
  private get mark(): Mark | null {
    const sliding = this.sliding;
    if (!sliding) return this.rest;
    const { clock, stops } = sliding;
    const progress = clock.playState === 'finished' || clock.playState === 'idle' ? null : (clock.effect?.getComputedTiming().progress ?? null);
    if (progress === null) return stops[stops.length - 1];
    // As the browser reads keyframes at equal parts: an easing that overshoots goes on along the first or the last part.
    const at = progress * (stops.length - 1);
    const index = Math.min(stops.length - 2, Math.max(0, Math.floor(at)));
    return between(stops[index], stops[index + 1], at - index);
  }
  /** TAB-28…30: the drag across the row, from its press to its release. */
  private drag: RowDrag | null = null;
  private dragFrame = 0;
  /** TAB-28, TAB-29: the click that follows a drag the row took is not a tap. */
  private swallowClick = false;

  constructor() {
    super();
    // Before every handler below: a tab that changed in this task is read as it is now.
    for (const type of ['keydown', 'click', 'pointerdown', 'focusin']) this.addEventListener(type, this.flushSyncs, { capture: true });
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('click', this.onClickCapture, { capture: true });
    this.addEventListener('click', this.onClick);
    this.addEventListener('pointerdown', this.onPointerDown);
    this.addEventListener('lostpointercapture', this.onLostCapture);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('tanrei-tab-update', this.itemsChanged);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, subtree: true });
    TanreiTabs.listenBeside(this, true);
    // A row that comes back (moved in the document, or put into a surface that opens later) is watched again: it left
    // with nothing observed, and what it measured while it was away — or not displayed — is not where it is now.
    if (this.hasUpdated) this.observe(null, this.strip, this.scroller);
    // TAB-36, TAB-39: a row that enters the document joins its group and takes its choice before it is drawn.
    this.followGroup();
    this.reshaped = true;
    this.syncs.now();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    TanreiTabs.listenBeside(this, false);
    this.unobserve(() => true);
    this.awaitsObserver = false;
    // TAB-41: a row that leaves the document leaves its group, which keeps its choice.
    this.enroll();
    cancelAnimationFrame(this.scaleFrame);
    this.scaleFrame = 0;
    this.dropDrag();
    this.stopScrolling();
    this.stopSliding();
    // TBV-14: a linked view that loses its tabs shows its panels without them.
    this.linked?.followTabs();
  }

  /** @internal A `<tanrei-tab-view>` links itself to the row (TAB-13): its panels take the place of the row's own. */
  linkView(view: LinkedTabView) {
    if (this.linked === view) return;
    this.linked = view;
    this.reshaped = true;
    this.syncs.now();
  }

  /** @internal TBV-16: the Tab view that draws this row as its own (null: none); it announces the row's selections (TBV-18). */
  setOwnerView(view: LinkedTabView | null) {
    this.owner = view;
  }

  /** @internal The view is no longer linked to the row: the row's own panels are its panels again. */
  unlinkView(view: LinkedTabView) {
    if (this.linked !== view) return;
    this.linked = null;
    this.reshaped = true;
    this.syncs.now();
  }

  /** @internal The linked Tab view, if it is connected. */
  get linkedView(): LinkedTabView | null {
    return this.linked?.isConnected ? this.linked : null;
  }

  /** @internal The panels the row holds itself (TBV-15: a linked view reports them). */
  get ownPanels(): TanreiTabPanel[] {
    return this.panels;
  }

  /** @internal The panels changed in the linked view: the tabs control them anew (TAB-13). */
  relink() {
    this.reshaped = true;
    this.syncs.now();
  }

  /** The row's tabs, in order. */
  get tabs(): TanreiTab[] {
    return [...this.children].filter((child): child is TanreiTab => child instanceof TanreiTab);
  }

  private get panels(): TanreiTabPanel[] {
    return [...this.children].filter((child): child is TanreiTabPanel => child instanceof TanreiTabPanel);
  }

  private get scroller(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.scroller') ?? null;
  }

  /** @internal TBV-3, TBV-8: whether the row follows a drag of its own now (a Tab view then takes none). */
  get dragging(): boolean {
    return this.drag?.state === 'taken';
  }

  /** The box the tabs are laid out in: it scrolls with them, so positions in it do not change while the row scrolls. */
  private get strip(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.tabs') ?? null;
  }

  /**
   * TAB-11: the tab `value` selects — the first tab with that value — or, while `value` is null, the first enabled tab;
   * `null` when `value` names no tab.
   */
  get selectedTab(): TanreiTab | null {
    const tabs = this.tabs;
    if (this.value === null || this.value === undefined) return tabs.find((tab) => !tab.disabled) ?? null;
    return tabs.find((tab) => tab.value === this.value) ?? null;
  }

  /** The tab an event came from. */
  private tabOf(event: Event): TanreiTab | null {
    for (const node of event.composedPath()) {
      if (node === this) return null;
      if (node instanceof TanreiTab && node.parentElement === this) return node;
    }
    return null;
  }

  /**
   * TAB-1, TAB-12: selects `tab`, and fires `change` once, when it is enabled and not already selected — or, on the row a
   * Tab view draws itself, has the view announce it instead (TBV-18), so that the row's `change` never reaches the product.
   */
  private select(tab: TanreiTab) {
    if (tab.disabled || tab === this.selectedTab) return;
    const owner = this.owner?.isConnected && this.owner === this.linkedView ? this.owner : null;
    owner?.rowWillSelect();
    this.choose(tab.value, this, true);
    if (owner) owner.rowSelected(tab.value);
    else this.dispatchEvent(new CustomEvent<TanreiTabsChangeDetail>('change', { bubbles: true, detail: { value: tab.value } }));
  }

  /**
   * TAB-37 to TAB-41: a person chose the tab of `value` on this row. The row takes it (`now`: and draws it in this
   * task); it becomes the group's choice, so every other member that has an enabled tab of it follows at once, in the
   * same frame, and fires nothing; it is stored once under each key that this row or a member whose tab changed names;
   * and `hold` — the row, or a Tab view's container for a swipe — stays where it is in the window while the members
   * before it change height (TAB-40, TBV-21), measured once before anything is written and once after.
   */
  private choose(value: string, hold: Element, now: boolean) {
    const group = value ? this.joined : null;
    const followers = group ? [...group.members].filter((member) => member !== this && member.wouldFollow(value)) : [];
    const top = followers.length ? hold.getBoundingClientRect().top : null;
    this.restoring = null;
    if (group) group.choice = value;
    this.value = value;
    this.known = value;
    if (now) this.syncs.now();
    // TAB-40: the followers' panels have changed in this task; where `hold` is now is read with everything else the
    // followers read, once, before the frame is drawn. (The row acted on is drawn first: a Tab view that starts its
    // switch measures itself, and does so before anything else is written.)
    TanreiTabs.followTogether(followers, top === null ? null : () => keepInPlace(hold, top));
    const keys = new Set([this, ...followers].map((member) => member.rememberAs).filter(Boolean));
    for (const key of keys) remember(this.ownerDocument, key, value);
  }

  /**
   * @internal TBV-4, TBV-21: a person committed a swipe to the tab of `value` on the Tab view linked to this row. The
   * row takes it as a selection made on itself — the group follows, the choice is remembered — and keeps `hold`, the
   * view's container, in place; the view announces it.
   */
  personSelected(value: string, hold: Element) {
    this.choose(value, hold, false);
  }

  /** TAB-36: whether the group's choice `value` would give this row another selected tab: it has an enabled tab of it. */
  private wouldFollow(value: string): boolean {
    const tab = this.tabs.find((each) => each.value === value);
    return !!tab && !tab.disabled && tab !== this.selectedTab;
  }

  /**
   * TAB-36, TAB-39, TAB-41: brings the row's membership in line with `group` and the document — out of the group it
   * was in, into the one it names — and, once, before the row is first drawn, looks for the choice remembered under
   * its key: a group that holds no choice takes it (whether or not this row has a tab of it), and a row without a
   * group selects its tab of it.
   */
  private enroll() {
    const document = this.ownerDocument;
    const group = this.isConnected && this.group ? sharedChoice<TanreiTabs>(document, this.group) : null;
    if (group !== this.joined) {
      this.joined?.members.delete(this);
      this.joined = group;
      group?.members.add(this);
    }
    if (this.restored || !this.isConnected || !this.rememberAs) return;
    this.restored = true;
    const stored = remembered(document, this.rememberAs);
    if (!stored) return;
    if (!group) this.restoring = stored;
    else if (group.choice === null) {
      group.choice = stored;
      // The members drawn already follow at once, and store nothing (TAB-38, TAB-39).
      TanreiTabs.followTogether([...group.members].filter((member) => member !== this && member.wouldFollow(stored)));
    }
  }

  /**
   * TAB-36, TAB-39: takes the group's choice — or, without a group, the remembered value — while the row has an
   * enabled tab of it: `value` is set, nothing is fired, and the next sync draws it at once (TAB-38). Says whether
   * `value` changed. A row that has no such tab keeps its own, and follows again as soon as it has one.
   */
  private adopt(): boolean {
    const group = this.joined;
    const want = group ? group.choice : this.restoring;
    if (want === null) return false;
    const tabs = this.tabs;
    // A remembered value is for the row as it is first drawn — until then whatever gives the row a selected (a Tab view
    // its own) is before the first frame, and its tabs may still be arriving while the document loads.
    if (!group && this.hasUpdated && tabs.length && this.ownerDocument.readyState !== 'loading') this.restoring = null;
    if (this.value === want) return false;
    const tab = tabs.find((each) => each.value === want);
    if (!tab || tab.disabled) return false;
    this.value = want;
    this.known = want;
    this.atOnce = true;
    return true;
  }

  /**
   * @internal TAB-36, TBV-16: joins the group the row names and takes its choice now, before the row is drawn — a Tab
   * view asks this of the row it draws once it has given it its own selected, so that the view's first frame is the
   * choice's.
   */
  followGroup() {
    this.enroll();
    this.adopt();
  }

  /** TAB-38: this member follows the choice now, to be measured and drawn with the others that do (`together`). */
  private followNow(together: Following[]) {
    if (!this.adopt() || !this.hasUpdated) return;
    this.following = together;
    this.syncs.now();
    this.following = null;
    this.followed = this.value;
  }

  /**
   * TAB-38, TAB-41: every row of `rows` takes the choice in this task — its selection, its tabs' exposure and its panels —
   * and, once their tabs have drawn what they are now, all of them are measured and then all of them written, so that
   * sixty rows that follow cost one layout and not sixty. `keep` (TAB-40) is run where everything is read, after the
   * rows' own sizes are written and before their indicators are.
   */
  private static followTogether(rows: TanreiTabs[], keep: (() => void) | null = null) {
    const together: Following[] = [];
    for (const row of rows) row.followNow(together);
    if (!together.length) {
      keep?.();
      return;
    }
    void Promise.all(together.flatMap((each) => each.tabs.map((tab) => tab.updateComplete))).then(() => {
      const live = together.filter((each) => each.row.isConnected && each.row.selectedTab === each.selected && each.row.drag?.state !== 'taken');
      for (const { row, tabs, from, selected } of live) {
        for (const tab of tabs) row.observeTab(tab);
        row.stopSliding();
        row.stopScrolling();
        // TAB-25: what the two tabs that changed did not measure of their labels when they were drawn is read here,
        // with everything else.
        for (const tab of [from, selected]) tab?.measureLabel();
      }
      // A tab that changes size with its selection (a system whose selected label is heavier) is seen by the observer
      // in this frame, which sizes the tabs then; the followers read their sizes only if that happens.
      TanreiTabs.settleTogether(live, keep, false);
    });
  }

  /** TAB-23, TAB-38: the tabs whose colors change at once now, and the frame that lets them move again. */
  private static readonly stilled = new Set<TanreiTab>();
  private static stillFrame = 0;

  /**
   * TAB-23, TAB-38: `tabs` change their colors without the state motion — for the frame that draws the change; two
   * frames on, when it has been drawn, they answer a pointer with their motion again. One frame for every row.
   */
  private static still(tabs: (TanreiTab | null)[]) {
    for (const tab of tabs) {
      if (!tab) continue;
      tab.still(true);
      TanreiTabs.stilled.add(tab);
    }
    if (TanreiTabs.stillFrame) return;
    TanreiTabs.stillFrame = requestAnimationFrame(() => {
      TanreiTabs.stillFrame = requestAnimationFrame(() => {
        TanreiTabs.stillFrame = 0;
        for (const tab of TanreiTabs.stilled) tab.still(false);
        TanreiTabs.stilled.clear();
      });
    });
  }

  /**
   * TAB-38: what `place()` and `reveal()` do for a row that follows, in two halves — everything is read now, and the
   * function returned writes it — so that many rows are read together and then written together. The indicator and the
   * underline go on `selected` at once (at the current offset), and the tab is brought into view inside the track at
   * once.
   */
  private placing(selected: TanreiTab | null, measured: boolean): () => void {
    const scroller = this.scroller;
    const scrolls = measured && this.scrolls;
    const [draw, to] = this.readOnce(() => [this.drawing(this.at(selected)), this.revealing(selected)] as const);
    return () => {
      if (measured) scroller?.classList.toggle('scrolls', scrolls);
      draw();
      if (to === null || !scroller) return;
      this.stopScrolling();
      scroller.scrollLeft = to;
    };
  }

  /** TAB-1: a tab's activation — its click, from a pointer, Enter, Space or `element.click()` — selects it. */
  private readonly onClick = (event: MouseEvent) => {
    const tab = this.tabOf(event);
    if (tab) this.select(tab);
  };

  /**
   * TAB-12: Right and Left Arrow move to the next and previous enabled tab, wrapping (mirrored in right-to-left), Home and
   * End to the first and last; each move selects the tab it reaches. Disabled tabs are skipped (TAB-2).
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const tab = this.tabOf(event);
    if (!tab || event.composedPath()[0] !== tab) return;
    const rtl = rtlOf(this);
    const keys: Record<string, string> = { ArrowRight: rtl ? 'ArrowUp' : 'ArrowDown', ArrowLeft: rtl ? 'ArrowDown' : 'ArrowUp', Home: 'Home', End: 'End' };
    const key = keys[event.key];
    if (!key) return;
    const tabs = this.tabs;
    const target = this.keys.target(
      key,
      tabs.indexOf(tab),
      tabs.map((each) => ({ focusable: !each.disabled, label: each.label })),
    );
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target];
    // The focus moves without the browser's own jump; the row brings the tab into view over its motion (TAB-15) — as it
    // draws the selection the move makes, from the same reading of the row, where the move selects another tab.
    this.selecting = next === this.selectedTab ? null : next;
    try {
      next.focus({ preventScroll: true });
    } finally {
      this.selecting = null;
    }
    this.select(next);
  };

  /** TAB-12, TAB-15: the tab a key moves focus to and is about to select: its selection brings it into view. */
  private selecting: TanreiTab | null = null;

  /** TAB-15: a tab that receives keyboard focus is brought into view. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const tab = this.tabOf(event);
    if (tab && tab !== this.selecting && tab.matches(':focus-visible')) this.reveal(tab, true);
  };

  /**
   * Tells every tab what it is now and every panel whether it shows (TAB-2, TAB-11, TAB-13), assigns the slots, slides
   * the indicator when the selected tab changed (TAB-17), and reports what it should.
   */
  private sync() {
    if (!this.hasUpdated) return;
    countWork('tabs.sync');
    this.syncChoices();
    // TAB-36: a row that gained a tab of its group's choice, or had one enabled, has it selected in this frame.
    this.adopt();
    const tabs = this.tabs;
    this.unobserve((tab) => !!tab && tab.parentElement !== this);
    const panels = this.panels;
    const [tabSlot, panelSlot] = this.renderRoot.querySelectorAll('slot');
    // Only a changed assignment is written: assigning again re-slots the child, which blurs a focused tab.
    const assign = (slot: HTMLSlotElement | undefined, nodes: Element[]) => {
      if (!slot) return;
      const now = slot.assignedNodes();
      if (now.length !== nodes.length || now.some((node, i) => node !== nodes[i])) slot.assign(...nodes);
    };
    assign(tabSlot, tabs);
    assign(panelSlot, panels);

    const selected = this.selectedTab;
    if (this.value !== null && this.value !== undefined && !selected && tabs.length) report(this, 'TAB-11', `value "${this.value}" names no tab; none is drawn selected`);
    // Each value's first tab and first panel, looked up once each: a row of N tabs is read in O(N), never a search of
    // every tab for each tab or panel.
    const tabOfValue = new Map<string, TanreiTab>();
    const repeated = new Set<string>();
    for (const tab of tabs) {
      if (!tab.value) report(this, 'TAB-11', `the tab "${tab.label}" has an empty value; it cannot be selected by value`);
      else if (tabOfValue.has(tab.value)) repeated.add(tab.value);
      else tabOfValue.set(tab.value, tab);
    }
    for (const value of repeated) report(this, 'TAB-11', `the value "${value}" is given to more than one tab; the first of them is the one it selects`);
    // TAB-2, TAB-12: one Tab stop — the selected tab, or the first enabled tab when that is disabled or there is none.
    const stop = selected && !selected.disabled ? selected : (tabs.find((tab) => !tab.disabled) ?? null);
    const secondary = INLINE_VARIANTS.includes(this.variant);
    const fill = this.fullWidth;
    // TAB-30: the product set the selection, or removed or disabled a tab the indicator lies between: the drag is over
    // and the indicator goes to the selected tab — the one just set — from where it is.
    const drag = this.drag;
    let returns = false;
    if (drag?.state === 'taken') {
      const gone = (tab: TanreiTab | undefined) => !!tab && (tab.disabled || tab.parentElement !== this);
      if (selected !== this.shownTab || gone(drag.place?.from) || gone(drag.place?.to)) {
        this.cancelDrag(false);
        returns = true;
      }
    }
    const pillDisabled = !!selected?.disabled;
    // TAB-13: where a Tab view is linked, each tab controls the view's panel of its value, and the row's own panels are
    // all hidden (TBV-15: the view reports them).
    const view = this.linkedView;
    const panelOfValue = new Map<string, TanreiTabPanel>();
    for (const panel of panels) if (!panelOfValue.has(panel.value)) panelOfValue.set(panel.value, panel);
    const ownPanelOf = (tab: TanreiTab) => (tab.value ? panelOfValue.get(tab.value) : undefined);
    const panelOf = (tab: TanreiTab) => (view ? (tab.value ? (view.panelFor(tab.value) ?? undefined) : undefined) : ownPanelOf(tab));
    const appearing: TanreiTab[] = [];
    tabs.forEach((tab, index) => {
      if (tab.setTabsContext({ selected: tab === selected, tabStop: tab === stop, position: index + 1, size: tabs.length, secondary, fill, pillDisabled })) appearing.push(tab);
      hostAria(tab, { 'aria-controls': panelOf(tab)?.id ?? null });
    });
    // TAB-23: a tab that appears — every tab in the row's first frame, or one added to the row — is drawn as it is at
    // once. It may have been drawn already, before the row told it whether it is selected, whether a disabled tab is
    // under the indicator, or how its variant looks; what it is told then is no change of state, and nothing fades in.
    if (appearing.length) TanreiTabs.still(appearing);
    // TAB-13: the selected tab's panel, named by its tab; the others hidden; a panel with nothing focusable is a Tab stop.
    const shown = selected && !view ? ownPanelOf(selected) : undefined;
    for (const panel of panels) {
      const tab = panel.value ? tabOfValue.get(panel.value) : undefined;
      const focusable = [...panel.children].some((child) => findInteractive(child));
      hostAria(panel, {
        role: 'tabpanel',
        'aria-labelledby': tab?.id ?? null,
        tabindex: focusable ? null : '0',
        hidden: panel === shown ? null : '',
      });
    }
    const changed = selected !== this.shownTab;
    const from = this.shownTab;
    this.shownTab = selected;
    const reshaped = this.reshaped;
    this.reshaped = false;
    // TAB-38: the row follows its group's choice, or one restored from storage: no slide, no color motion, and the
    // tab in view at once. (A drag of its own that the choice ends returns as TAB-30 says.)
    const follows = this.atOnce && changed && !returns;
    this.atOnce = false;
    // TAB-23, TAB-43: so does a new selection of a row whose transition is none, whatever made it — the two tabs take
    // the colors of their new look in the frame that draws it. (The indicator's motion and the scroll read no time
    // then, as where motion is reduced: `motion()`.) A change between states keeps its motion.
    if (follows || (changed && !!from && this.hasNoTransition)) TanreiTabs.still([from, selected]);
    // TAB-41: rows that follow one choice are measured together and then written together.
    if (follows && selected && this.following) {
      for (const tab of [from, selected]) tab?.deferLabel();
      this.following.push({ row: this, tabs, from, selected });
    }
    // TAB-16, TAB-17: once the tabs have drawn what they are now, the indicator slides to a newly selected tab, or is put
    // on the selected one at once (the row appearing, a tab or the variant changing). A re-read that changed neither the
    // selection nor what the tabs are sized from — the update that follows a selection the row drew already — draws
    // nothing again.
    else if (changed || reshaped || returns) {
      void Promise.all(tabs.map((tab) => tab.updateComplete)).then(() => {
        const watched = this.observed.size;
        for (const tab of tabs) this.observeTab(tab);
        if (follows) {
          this.stopSliding();
          this.stopScrolling();
        }
        // The first placement of a row is the observer's: it reports the tabs it was just given after the layout of
        // the frame they are first drawn in, and every row of the page is then measured and written together
        // (`placeTogether`) — before that frame is painted, at once and without motion. Placed here, in the row's own
        // turn, each row had the page styled and laid out for itself, five times over.
        // Until it has, the row leaves every placement to it (a tab's own first update tells the row to look again).
        if (TanreiTabs.resize$ && !this.mark && !this.sliding && (this.awaitsObserver || (!from && this.observed.size > watched))) {
          this.awaitsObserver = true;
          return;
        }
        // TAB-12, TAB-17: a new selection is drawn from one reading of the row — the indicator's slide and the scroll
        // that brings its tab into view read every box once between them.
        this.readOnce(() => {
          if (reshaped) this.boxes();
          // TAB-26: a selection made while the indicator is drawn at an offset is placed at once, without a slide.
          if (!follows && changed && from && selected && from.isConnected && this.mark && this.offset === 0) this.slide(from, selected);
          else if (returns && selected && this.mark && this.offset === 0) this.slide(null, selected);
          else this.place(false);
          if (changed && selected) this.reveal(selected, !!from && !follows);
        });
      });
    }
    // TBV-1, TBV-2: a linked view follows the row's selection — at once where the row itself follows (TBV-20).
    view?.followTabs(follows);
  }

  /** Watches what moves the indicator when its size or place changes (TAB-17). */
  private observe(tab: TanreiTab | null, ...elements: (Element | null | undefined)[]) {
    for (const element of elements) {
      if (!element || this.observed.has(element)) continue;
      this.observed.set(element, tab);
      TanreiTabs.watched.set(element, this);
      TanreiTabs.resize$?.observe(element);
    }
  }

  /** Watches a tab's parts: what the indicator is measured from. */
  private observeTab(tab: TanreiTab) {
    const parts = tab.indicatorParts;
    this.observe(tab, tab, parts?.content, parts?.box, parts?.plate);
  }

  /** Stops watching what `gone` says is no longer the row's: everything when it leaves, a tab's parts when the tab does. */
  private unobserve(gone: (tab: TanreiTab | null) => boolean) {
    for (const [element, tab] of this.observed) {
      if (!gone(tab)) continue;
      this.observed.delete(element);
      TanreiTabs.watched.delete(element);
      TanreiTabs.resize$?.unobserve(element);
    }
  }

  /**
   * TAB-15, TAB-17, TAB-41: `rows` changed size or place in one frame. Each puts its indicator back on its selected tab
   * and that tab in view, at once — one row as `place()` and `reveal()` do, several as they do but all read first and
   * then all written, so that a page of rows costs one layout and not one for each row. A row that slides or follows a
   * drag keeps its own way.
   */
  private static placeTogether(rows: TanreiTabs[]) {
    for (const row of rows) row.awaitsObserver = false;
    const own = (row: TanreiTabs) => rows.length === 1 || !!row.sliding || row.drag?.state === 'taken';
    for (const row of rows) {
      if (!own(row)) continue;
      row.place();
      row.reveal(row.selectedTab, false);
    }
    TanreiTabs.settleTogether(rows.filter((row) => !own(row)).map((row) => ({ row, selected: row.selectedTab })));
  }

  /**
   * TAB-41: puts the indicator of every row of `rows` on its `selected` tab, and that tab in view, at once: every row's
   * tabs are read, then written (`sized`); then every row's place is read — and `keep` run — then written.
   */
  private static settleTogether(rows: { row: TanreiTabs; selected: TanreiTab | null }[], keep: (() => void) | null = null, sized = true) {
    const sizes = sized ? rows.map(({ row }) => row.readBoxes()) : [];
    const resized = rows.filter(({ row }, index) => row.writeBoxes(sizes[index] ?? null));
    // What is written from the tabs' widths is read once more — every row first, then every row written.
    const again = resized.map(({ row }) => row.readBoxes());
    resized.forEach(({ row }, index) => row.writeBoxes(again[index]));
    const writes = rows.map(({ row, selected }, index) => row.placing(selected, !!sizes[index]));
    keep?.();
    for (const write of writes) write();
  }

  /** The indicator's timing (TAB-15, TAB-17): the tokens, read through real properties — 0 where motion is reduced. */
  private motion(): { duration: number; easing: string } {
    if (this.reading?.motion) return this.reading.motion;
    const style = getComputedStyle(this.scroller ?? this);
    const motion = { duration: (Number.parseFloat(style.animationDuration) || 0) * 1000, easing: style.animationTimingFunction || 'ease' };
    if (this.reading) this.reading.motion = motion;
    return motion;
  }

  /**
   * TAB-12, TAB-16, TAB-17: what the row reads of its layout while `run` runs is read once — each box, the strip's style
   * and scale, the indicator's timing and corner — however many of its steps ask for it (a slide measures its two tabs,
   * then every tab, then the scroll the tab it goes to; each used to read them again). Nested, it is the outer one.
   */
  private readOnce<T>(run: () => T): T {
    if (this.reading) return run();
    this.reading = { rects: new Map() };
    try {
      return run();
    } finally {
      this.reading = null;
    }
  }

  /** The reading going on now (`readOnce`), or null: everything is read when it is asked for. */
  private reading: Reading | null = null;

  /** `element`'s box on the page — once for each reading. */
  private rect(element: Element): DOMRect {
    const reading = this.reading;
    if (!reading) return element.getBoundingClientRect();
    let rect = reading.rects.get(element);
    if (!rect) reading.rects.set(element, (rect = element.getBoundingClientRect()));
    return rect;
  }

  /** The strip's box on the page, its computed style and the scale it is drawn at (`layoutScale`), once for each reading. */
  private stripReading(): { rect: DOMRect; style: CSSStyleDeclaration; scale: Scale } | null {
    const strip = this.strip;
    if (!strip) return null;
    const reading = this.reading;
    if (reading?.strip) return reading.strip;
    const rect = this.rect(strip);
    const style = getComputedStyle(strip);
    const read = { rect, style, scale: layoutScale(strip, rect, style) };
    if (reading) reading.strip = read;
    return read;
  }

  /** Something the row wrote may have moved a box (`boxes()`, a scroll): what the reading holds is read afresh. */
  private readAgain() {
    if (this.reading) this.reading = { rects: new Map() };
  }

  /**
   * TAB-14, TAB-16, TAB-18: every tab sizes its container — the indicator's box on it — from the row's height and its own
   * content: all read first, then all written. Also says whether the tabs scroll inside the track (TAB-28).
   */
  private boxes() {
    // A tab that became its circle (or stopped being it) changed its own width: what is written from the tabs' widths
    // is read once more, in the same frame.
    const sizes = this.readBoxes();
    if (!sizes) return;
    this.readAgain();
    if (this.writeBoxes(sizes)) this.writeBoxes(this.readBoxes());
    const scroller = this.scroller;
    scroller?.classList.toggle('scrolls', this.scrolls);
    this.readAgain();
  }

  /** The reading half of `boxes()`: what every tab says of its container now, or null while the row is drawn flat. */
  private readBoxes(): (BoxSize | null)[] | null {
    if (this.flat()) return null;
    const scale = this.scale();
    return this.tabs.map((tab) => tab.readBox(scale));
  }

  /**
   * The writing half of `boxes()`: every tab's container as `sizes` say, and how far the end tabs reach into the track's
   * inset. Says whether a tab changed its own width by it, so that the tabs are read once more.
   */
  private writeBoxes(sizes: (BoxSize | null)[] | null): boolean {
    if (!sizes) return false;
    const resized = this.tabs.map((tab, index) => tab.writeBox(sizes[index] ?? null)).some(Boolean);
    // TAB-34: the first and the last tab reach into the track's inset by half of what they are wider than their
    // indicator, so that the indicator — not the tab's box — lies track.padding from the track's end.
    const strip = this.strip;
    const reach = (size: BoxSize | null | undefined) => (size ? px(Math.max(0, (size.tab - size.width) / 2)) : '0px');
    for (const [name, value] of [['--_reach-start', reach(sizes[0])], ['--_reach-end', reach(sizes[sizes.length - 1])]] as const) {
      if (strip && strip.style.getPropertyValue(name) !== value) strip.style.setProperty(name, value);
    }
    return resized;
  }

  /**
   * TAB-16, TAB-24: how much larger the row is drawn than laid out now — not 1 while an ancestor scales it (a picker's
   * or a dialog's surface growing in over its open motion, which is when a row inside it is first measured). Nothing
   * reports the end of a transform, so the row never keeps a box measured in the page's pixels.
   */
  private scale(): Scale {
    const scale = this.stripReading()?.scale ?? UNSCALED;
    this.watchScale(scale);
    return scale.x && scale.y ? scale : UNSCALED;
  }

  /** The scale the row was last measured at, the frame that looks at it again, and for how many frames it has not changed. */
  private scaleSeen: Scale = UNSCALED;
  private scaleFrame = 0;
  private scaleStill = 0;

  /**
   * TAB-16: a row measured at a scale is measured through it — to the page's precision divided by the scale, so the
   * smaller it is drawn the less exact its boxes are — and nothing reports a transform changing or ending. So while the
   * row is drawn at a scale that changes, it measures again in every frame the scale changed, and what it has drawn when
   * the motion ends was measured at the motion's end. It stops looking once the scale is 1, or has not changed for
   * `SCALE_STILL_FRAMES` frames (a row kept at a scale); a row drawn flat is looked at until it is not, since nothing of
   * it has been measured yet.
   */
  private watchScale(scale: Scale) {
    this.scaleSeen = scale;
    const flat = !scale.x || !scale.y;
    if (this.scaleFrame || (!flat && scale.x === 1 && scale.y === 1)) return;
    this.scaleFrame = requestAnimationFrame(() => {
      this.scaleFrame = 0;
      const strip = this.strip;
      if (!this.isConnected || !strip) return;
      const [seen, now] = [this.scaleSeen, layoutScale(strip)];
      if (now.x === seen.x && now.y === seen.y) {
        // Unchanged: flat still, or resting at a scale — which is looked at a little longer (an easing may start slowly).
        if ((now.x && now.y && ++this.scaleStill >= SCALE_STILL_FRAMES) || (now.x === 1 && now.y === 1)) return;
        this.watchScale(now);
        return;
      }
      this.scaleStill = 0;
      // Measures at the new scale, and watches on from it.
      this.place();
      this.reveal(this.selectedTab, false);
      this.watchScale(layoutScale(strip));
    });
  }

  /**
   * TAB-16: whether the row is drawn flat now — scaled to nothing on an axis, as on the first frame of a surface that
   * grows from its anchor's edge. Nothing of it can be measured then (every box on the page is empty) and nothing of it
   * is seen, so nothing is written; `watchScale()` places the indicator once it is not flat.
   */
  private flat(): boolean {
    const scale = this.stripReading()?.scale ?? UNSCALED;
    if (scale.x && scale.y) return false;
    this.watchScale(scale);
    return true;
  }

  /** TAB-14, TAB-28: whether the tabs do not fit and scroll inside the track. */
  private get scrolls(): boolean {
    const scroller = this.scroller;
    return !!scroller && scroller.scrollWidth - scroller.clientWidth > 0.5;
  }

  /**
   * TAB-16: where the indicator and the underline go on `tab`, in the strip's coordinates. The indicator is the tab's
   * container (its box): as tall as the row less track.padding above and below and, in a row that hugs, as wide as the
   * content plus active-indicator.padding-inline on each side — a circle where the content is not wider than it is tall
   * — or, in a row that fills, as wide as the tab. The underline spans the content (primary) or the tab (secondary).
   */
  private measure(tab: TanreiTab): Mark | null {
    const strip = this.strip;
    const parts = tab.indicatorParts;
    if (!strip || !parts || !tab.isConnected || this.flat()) return null;
    const origin = this.rect(strip);
    const scale = this.scale();
    const [whole, box, content] = [this.rect(parts.tab), this.rect(parts.box), this.rect(parts.content)];
    const wide = parts.tab.classList.contains('wide');
    return {
      pill: { x: (box.left - origin.left) / scale.x, y: (box.top - origin.top) / scale.y, w: box.width / scale.x, h: box.height / scale.y },
      line: wide ? { x: (whole.left - origin.left) / scale.x, w: whole.width / scale.x } : { x: (content.left - origin.left) / scale.x, w: content.width / scale.x },
    };
  }

  /**
   * TAB-16, TAB-24: draws the indicator and the underline at `mark` on every tab at once — each tab its piece, clipped to
   * it, and the covered copy of its content within it — so the indicator and every inversion move in the same frame.
   * Everything is read first, then written.
   */
  private draw(mark: Mark | null) {
    this.drawing(mark)();
  }

  /** `draw()` in two halves: every tab's box is read now, and the function returned writes every tab's piece. */
  private drawing(mark: Mark | null): () => void {
    this.rest = mark;
    const { read, radius } = this.frames();
    return () => {
      for (const each of read) {
        const pill = mark ? { ...mark.pill, x: mark.pill.x - each.x, y: mark.pill.y - each.y } : null;
        const line = mark ? { x: mark.line.x - each.x, w: mark.line.w } : null;
        each.tab.paintIndicator(pill, line, each.size, each.content, radius);
      }
    };
  }

  /** Every tab's box and its content's box, in the strip's coordinates and the row's own pixels, and the indicator's corner. */
  private frames(): { read: ({ tab: TanreiTab; x: number; y: number } & TabFrame)[]; radius: number } {
    const strip = this.strip;
    if (!strip) return { read: [], radius: 0 };
    const origin = this.rect(strip);
    const scale = this.scale();
    const radius = this.radius();
    const read = this.tabs.flatMap((tab) => {
      const parts = tab.indicatorParts;
      if (!parts) return [];
      const [box, content] = [this.rect(parts.tab), this.rect(parts.content)];
      return [
        {
          tab,
          x: (box.left - origin.left) / scale.x,
          y: (box.top - origin.top) / scale.y,
          size: { w: box.width / scale.x, h: box.height / scale.y },
          content: { x: (content.left - box.left) / scale.x, y: (content.top - box.top) / scale.y, w: content.width / scale.x, h: content.height / scale.y },
        },
      ];
    });
    return { read, radius };
  }

  /** The selected tab's indicator corner (TAB-16), once for each reading. */
  private radius(): number {
    const reading = this.reading;
    if (reading?.radius !== undefined) return reading.radius;
    const radius = this.selectedTab?.indicatorRadius ?? 0;
    if (reading) reading.radius = radius;
    return radius;
  }

  /** The tab the indicator was last put on at rest (no offset, no slide, no drag), or null. */
  private markTab: TanreiTab | null = null;

  /**
   * TAB-16, TAB-26: where the indicator and the underline go for `selected` at the current offset — on it at 0, and
   * otherwise each edge interpolated toward the next (above 0) or previous (below 0) enabled tab in reading order by the
   * offset's magnitude, clamped to 1; on `selected` where there is no enabled tab in that direction.
   */
  private at(selected: TanreiTab | null): Mark | null {
    const here = selected ? this.measure(selected) : null;
    this.markTab = here ? selected : null;
    const offset = this.offset;
    if (!here || !selected || !offset) return here;
    const tabs = this.tabs;
    const step = offset > 0 ? 1 : -1;
    let index = tabs.indexOf(selected) + step;
    while (index >= 0 && index < tabs.length && tabs[index].disabled) index += step;
    const there = index >= 0 && index < tabs.length ? this.measure(tabs[index]) : null;
    if (!there) return here;
    this.markTab = null;
    return between(here, there, Math.min(1, Math.abs(offset)));
  }

  /**
   * TAB-17, TAB-26: puts the indicator on the selected tab (at the current offset) at once — or, while it slides, sends
   * the slide there; while a drag carries it (TAB-28), it stays where the pointer is.
   */
  private place(sized = true) {
    this.readOnce(() => this.placeNow(sized));
  }

  private placeNow(sized: boolean) {
    if (sized) this.boxes();
    if (this.drag?.state === 'taken') {
      this.follow(this.drag);
      return;
    }
    const selected = this.selectedTab;
    const sliding = this.sliding;
    const to = this.at(selected);
    if (sliding && to) {
      // The row changed size or place under a slide: the slide goes on, by its own clock, to where the tab is now —
      // every stop that is a tab measured afresh, and the pieces given their new places. Nothing is written where
      // nothing moved (a tab's first measuring after a choice reports the sizes the slide was already made from).
      const stops = sliding.stops.map((stop, index) => (index === sliding.stops.length - 1 ? to : ((sliding.tabs[index] ? this.measure(sliding.tabs[index]) : null) ?? stop)));
      if (stops.every((stop, index) => sameMark(stop, sliding.stops[index]))) return;
      this.slideThrough(stops, sliding.tabs, sliding.clock);
      return;
    }
    this.stopSliding();
    this.draw(to);
  }

  /** Ends a slide where it is: its pieces leave, and what is written under them shows until the caller draws. */
  private stopSliding() {
    const sliding = this.sliding;
    if (!sliding) return;
    this.sliding = null;
    sliding.clock.cancel();
    for (const part of sliding.parts) part.cancel();
  }

  /** The enabled tabs in the order they are drawn along the row, left to right, with each one's box on the page. */
  private stops(): { tab: TanreiTab; left: number; right: number }[] {
    return this.tabs
      .filter((tab) => !tab.disabled)
      .map((tab) => {
        const box = this.rect(tab);
        return { tab, left: box.left, right: box.right };
      })
      .sort((a, b) => a.left - b.left);
  }

  /**
   * TAB-28: where the indicator is drawn while the pointer is at `x` (clientX): on an enabled tab at that tab's centre,
   * halfway between two neighbouring enabled tabs where they meet (the middle of any disabled tabs between them), each
   * edge at the linear interpolation in between, and on the first or last enabled tab before or beyond its centre.
   * Nothing changes at the place where two tabs meet: it is only where `p` passes one half.
   */
  private placeAt(x: number): Place | null {
    const stops = this.stops();
    if (!stops.length) return null;
    const centre = (stop: { left: number; right: number }) => (stop.left + stop.right) / 2;
    let index = 0;
    while (index < stops.length - 1 && x >= centre(stops[index + 1])) index++;
    const [a, b] = [stops[index], stops[Math.min(index + 1, stops.length - 1)]];
    const [from, to] = [this.measure(a.tab), this.measure(b.tab)];
    if (!from || !to) return null;
    let p = 0;
    if (a !== b && x > centre(a)) {
      const meet = (a.right + b.left) / 2;
      p = x <= meet ? (0.5 * (x - centre(a))) / Math.max(meet - centre(a), 0.001) : 0.5 + (0.5 * (x - meet)) / Math.max(centre(b) - meet, 0.001);
      p = Math.min(1, Math.max(0, p));
    }
    return { from: a.tab, to: b.tab, p, mark: between(from, to, p) };
  }

  /**
   * TAB-17, TAB-21, TAB-24: the indicator and the underline slide and resize from where they are drawn — on `old`, or
   * wherever a running slide, an offset or a released drag has left them — to `tab` over the indicator's motion, as one
   * box measured on the page, so the slide mirrors in right-to-left. The old tab is measured afresh: it may have moved
   * without changing size (the layout direction flipping), which nothing reports. At once where motion is reduced.
   *
   * The browser runs it. The row writes once — the end of the slide, where everything rests — and gives every tab the
   * indicator passes its pieces as animations between the slide's stops (`slideIndicator`), all on the document's
   * timeline from the same moment as the row's own animation `tanrei-tabs-slide` on the strip, an effect without
   * keyframes that draws nothing and is the slide's clock. No script runs while it slides; where the indicator has got
   * to is worked out from the clock when something asks (`mark`): a choice made meanwhile, a drag, an offset.
   *
   * Every frame is a look a drag draws (TAB-28): from a tab at rest the indicator passes over the enabled tabs between
   * the two as a drag does, taking each one's box on the way, so its width is always between two neighbouring tabs'.
   * From anywhere else it goes straight to the tab, each edge interpolated.
   */
  private slide(old: TanreiTab | null, tab: TanreiTab) {
    this.readOnce(() => this.slideNow(old, tab));
  }

  private slideNow(old: TanreiTab | null, tab: TanreiTab) {
    const to = this.measure(tab);
    const resting = !!old && !this.sliding && this.markTab === old;
    const from = resting ? (this.measure(old) ?? this.mark) : this.mark;
    this.stopSliding();
    this.markTab = tab;
    const { duration } = this.motion();
    if (!from || !to || !this.strip || sameMark(from, to) || duration <= 0 || typeof KeyframeEffect === 'undefined') {
      this.draw(to);
      return;
    }
    const enabled = this.tabs.filter((each) => !each.disabled);
    const [start, end] = [resting && old ? enabled.indexOf(old) : -1, enabled.indexOf(tab)];
    const step = end > start ? 1 : -1;
    const passed = start >= 0 && end >= 0 && Math.abs(end - start) > 1 ? Array.from({ length: Math.abs(end - start) - 1 }, (_, index) => enabled[start + step * (index + 1)]) : [];
    const marks = passed.map((each) => this.measure(each));
    if (marks.every((mark) => mark)) this.slideThrough([from, ...(marks as Mark[]), to], [resting ? old : null, ...passed, tab], null);
    else this.slideThrough([from, to], [resting ? old : null, tab], null);
  }

  /**
   * TAB-17: writes the slide's end and has the browser move every tab's pieces through `stops` — a new slide, or
   * (`clock`) the one that is running, which goes on from the moment it began.
   */
  private slideThrough(stops: Mark[], tabs: (TanreiTab | null)[], clock: Animation | null) {
    const strip = this.strip;
    if (!strip) return;
    const timing = this.motion();
    const before = this.sliding;
    this.sliding = null;
    for (const part of before?.parts ?? []) part.cancel();
    // Everything is read, then the end is written, then the pieces are handed to the browser.
    const { read, radius } = this.frames();
    const to = stops[stops.length - 1];
    this.rest = to;
    for (const each of read) each.tab.paintIndicator({ ...to.pill, x: to.pill.x - each.x, y: to.pill.y - each.y }, { x: to.line.x - each.x, w: to.line.w }, each.size, each.content, radius);
    // No fill: once finished they leave their elements' animations, and the clock's progress (null) reads as the end.
    const running = clock ?? new Animation(new KeyframeEffect(strip, [], timing));
    const now = strip.ownerDocument.timeline.currentTime;
    if (!clock) {
      running.id = SLIDE;
      if (now === null) running.play();
      else running.startTime = now;
    }
    const started = clock ? clock.startTime : now;
    const parts = read.flatMap((each) =>
      each.tab.slideIndicator(
        stops.map((stop) => ({ pill: { ...stop.pill, x: stop.pill.x - each.x, y: stop.pill.y - each.y }, line: { x: stop.line.x - each.x, w: stop.line.w } })),
        each,
        radius,
        clock ? (clock.effect?.getTiming() ?? timing) : timing,
        typeof started === 'number' ? started : null,
      ),
    );
    // A clock that is held (paused, as a test or a tool holds it) holds its pieces at the same place.
    if (clock && clock.playState === 'paused') {
      for (const part of parts) {
        part.pause();
        part.currentTime = clock.currentTime;
      }
    }
    const sliding = { clock: running, parts, stops, tabs };
    this.sliding = sliding;
    if (!clock) {
      // Over, or cancelled: nothing slides (what was written for the end is what shows).
      const over = () => {
        if (this.sliding?.clock === running) this.stopSliding();
      };
      running.finished.then(over, over);
    }
  }

  /** The state motion (TAB-28's catch-up), read through real properties of the strip — 0 where motion is reduced. */
  private stateMotion(): { duration: number; easing: string } {
    const strip = this.strip;
    const style = strip ? getComputedStyle(strip) : null;
    return { duration: (Number.parseFloat(style?.transitionDuration ?? '') || 0) * 1000, easing: style?.transitionTimingFunction || 'ease' };
  }

  /**
   * TAB-28: a press on the row with touch, a pen or a mouse may become a drag. Not while indicatorOffset is not 0 (the
   * swipe that sets it has the indicator, TAB-26), not without a selected tab to carry the indicator from, and, while the
   * tabs scroll inside the track, only from the selected tab: every other sideways drag scrolls them.
   */
  private readonly onPointerDown = (event: PointerEvent) => {
    this.swallowClick = false;
    // A press whose release never came here (a mouse released outside the window) is over.
    if (this.drag && this.drag.state !== 'taken') this.unwatch(this.drag);
    if (this.drag || !event.isPrimary || event.button !== 0 || this.offset !== 0) return;
    if (!['touch', 'pen', 'mouse'].includes(event.pointerType)) return;
    const scroller = this.scroller;
    if (!scroller || !event.composedPath().includes(scroller)) return;
    const selected = this.selectedTab;
    if (!selected || !this.tabs.some((tab) => !tab.disabled)) return;
    const pressed = this.tabOf(event);
    if (this.scrolls && pressed !== selected) return;
    this.drag = { gesture: new SheetDrag(event, 'x'), pressed, state: 'pending', x: event.clientX, catchUp: null, place: null, frameTime: 0 };
    this.watchPointer(true);
  };

  /**
   * From the press to the release the pointer is followed on the window: before the drag is taken nothing captures it,
   * and it may leave the row (a mouse) and be released anywhere.
   */
  private watchPointer(on: boolean) {
    const listen = on ? window.addEventListener.bind(window) : window.removeEventListener.bind(window);
    listen('pointermove', this.onPointerMove as EventListener, { capture: true });
    listen('pointerup', this.onPointerUp as EventListener, { capture: true });
    listen('pointercancel', this.onPointerCancel as EventListener, { capture: true });
  }

  /**
   * TAB-28: past the touch slop, further sideways than up or down, the row takes the drag: the pointer is captured, the
   * pressed tab leaves its pressed state, and the indicator comes to the pointer over the state motion and then follows
   * it in every move. A drag that went up or down first is the page's, for its whole length.
   */
  private readonly onPointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id || drag.state === 'cancelled') return;
    // A mouse that comes back with no button down was released where nothing heard it.
    if (drag.state === 'pending' && event.pointerType === 'mouse' && event.buttons === 0) {
      this.endDrag(drag);
      return;
    }
    const step = drag.gesture.move(event);
    // Up or down first: the page's. A swipe of the linked view began meanwhile (TAB-26): the view's.
    if (drag.gesture.rejected || (step === 'start' && this.offset !== 0)) {
      this.endDrag(drag);
      return;
    }
    drag.x = event.clientX;
    if (step === 'start') this.takeDrag(drag, event);
    if (drag.state !== 'taken') return;
    event.preventDefault();
    this.follow(drag);
  };

  private takeDrag(drag: RowDrag, event: PointerEvent) {
    drag.state = 'taken';
    try {
      this.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser does not know (a synthetic one) cannot be captured; its events still come here.
    }
    // The press activates no tab when it ends, and the tab under it leaves its pressed state as when a press ends.
    this.swallowClick = true;
    drag.pressed?.releasePress(event);
    // From where the indicator is drawn — a running slide stops there — to the pointer, over the state motion.
    const from = this.mark;
    this.stopSliding();
    this.stopScrolling();
    this.markTab = null;
    const strip = this.strip;
    const { duration, easing } = this.stateMotion();
    if (from && strip && duration > 0 && typeof KeyframeEffect !== 'undefined') {
      const animation = new Animation(new KeyframeEffect(strip, [], { duration, easing }));
      animation.id = 'tanrei-tabs-catch-up';
      animation.play();
      drag.catchUp = { animation, from };
    }
    window.addEventListener('keydown', this.onDragKey, { capture: true });
    drag.frameTime = performance.now();
    const frame = () => {
      if (this.drag !== drag || drag.state !== 'taken') return;
      this.follow(drag);
      this.dragFrame = requestAnimationFrame(frame);
    };
    this.dragFrame = requestAnimationFrame(frame);
  }

  /**
   * TAB-28: draws the indicator and the underline where the pointer is — in the frame it moves, without a motion of their
   * own, except the catch-up that brings them from where they rested — and scrolls the tabs to keep the indicator in view
   * while the drag carries it toward an end of the track.
   */
  private follow(drag: RowDrag) {
    this.readOnce(() => this.followPointer(drag));
  }

  private followPointer(drag: RowDrag) {
    const place = this.placeAt(drag.x);
    if (!place) return;
    drag.place = place;
    let mark = place.mark;
    const catchUp = drag.catchUp;
    if (catchUp) {
      const over = catchUp.animation.playState === 'finished' || catchUp.animation.playState === 'idle';
      if (over) drag.catchUp = null;
      else mark = between(catchUp.from, mark, catchUp.animation.effect?.getComputedTiming().progress ?? 1);
    }
    this.draw(mark);
    const now = performance.now();
    const elapsed = Math.max(0, now - drag.frameTime);
    drag.frameTime = now;
    const scroller = this.scroller;
    const strip = this.strip;
    if (!scroller || !strip || !this.scrolls) return;
    const view = this.rect(scroller);
    // The mark is in the row's own pixels and the view on the page; the scroll is the row's own again.
    const scale = this.scale();
    const left = this.rect(strip).left + place.mark.pill.x * scale.x;
    const right = left + place.mark.pill.w * scale.x;
    const beyond = (right > view.right ? right - view.right : left < view.left ? left - view.left : 0) / scale.x;
    if (beyond) scroller.scrollLeft += Math.sign(beyond) * Math.min(Math.abs(beyond), DRAG_SCROLL_SPEED * elapsed);
    this.readAgain();
  }

  /**
   * TAB-29: a release chooses one enabled tab — the one the indicator is nearer to of the two it lies between (the one
   * after it from halfway on), or the one of the two a fling is toward — and selects it (one `change`, the indicator
   * settling from where the release left it), or returns the indicator when it is the selected tab. It becomes the Tab
   * stop; the click that follows is not a tap.
   */
  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    const taken = drag.state === 'taken';
    if (taken) drag.x = event.clientX;
    const place = taken ? (this.placeAt(drag.x) ?? drag.place) : null;
    const velocity = taken ? drag.gesture.velocity(event) : 0;
    this.endDrag(drag);
    if (!taken || !place) return;
    const fling = Math.abs(velocity) >= SHEET_FLING_VELOCITY;
    // `from` is the tab toward the left and `to` the one toward the right, as they are drawn.
    const chosen = fling ? (velocity > 0 ? place.to : place.from) : place.p >= 0.5 ? place.to : place.from;
    this.settle(chosen);
  };

  /** TAB-30: the platform took the pointer back. */
  private readonly onPointerCancel = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    const taken = drag.state === 'taken';
    this.endDrag(drag);
    if (taken) this.settle(null);
  };

  /** TAB-30: a capture lost while the drag lasts (not by its own release) cancels it. */
  private readonly onLostCapture = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id || drag.state !== 'taken') return;
    this.endDrag(drag);
    this.settle(null);
  };

  /** TAB-30: Escape while a drag lasts cancels it, and nothing else hears that key. */
  private readonly onDragKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || this.drag?.state !== 'taken') return;
    event.preventDefault();
    event.stopPropagation();
    this.cancelDrag(true);
  };

  /**
   * TAB-30: ends a drag the row has taken without a selection — the indicator returns to the selected tab over the
   * indicator's motion (`settle`), or is left to the caller's own placing — and the pointer, still down, is ignored until
   * it is released.
   */
  private cancelDrag(settle: boolean) {
    const drag = this.drag;
    if (!drag) return;
    if (drag.state !== 'taken') {
      if (drag.state === 'pending') this.endDrag(drag);
      return;
    }
    drag.state = 'cancelled';
    this.stopFollowing(drag);
    if (settle) this.settle(null);
  }

  private stopFollowing(drag: RowDrag) {
    cancelAnimationFrame(this.dragFrame);
    drag.catchUp?.animation.cancel();
    drag.catchUp = null;
    window.removeEventListener('keydown', this.onDragKey, { capture: true });
  }

  /** Nothing of the drag is watched any longer. */
  private unwatch(drag: RowDrag) {
    this.stopFollowing(drag);
    this.watchPointer(false);
    if (this.drag === drag) this.drag = null;
  }

  /** The pointer is up (or gone): the drag is over, and the click that may follow it is let through no longer than this task. */
  private endDrag(drag: RowDrag) {
    const pending = drag.state === 'pending';
    this.unwatch(drag);
    if (pending) return;
    setTimeout(() => {
      this.swallowClick = false;
    });
  }

  /** The row is leaving: nothing of a drag is kept. */
  private dropDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.unwatch(drag);
    this.swallowClick = false;
  }

  /**
   * TAB-29, TAB-30: after a drag, the indicator and the underline go from where they are to `chosen` — selecting it, with
   * one `change`, when it is not the selected tab — or back to the selected tab (`null`), over the indicator's motion and
   * at once where motion is reduced.
   */
  private settle(chosen: TanreiTab | null) {
    const selected = this.selectedTab;
    if (chosen && chosen !== selected && !chosen.disabled) {
      // The chosen tab is the Tab stop; where the focus was on another tab of the row it follows the selection.
      const within = this.tabs.find((tab) => tab.matches(':focus'));
      this.select(chosen);
      if (within && within !== chosen) chosen.focus({ preventScroll: true });
      return;
    }
    if (selected && this.mark) this.slide(null, selected);
    else this.place();
  }

  /** TAB-28, TAB-29: the click a taken drag ends with is not a tap — it activates nothing. */
  private readonly onClickCapture = (event: MouseEvent) => {
    if (!this.swallowClick) return;
    this.swallowClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private stopScrolling() {
    cancelAnimationFrame(this.scrollFrame);
    this.scrolling?.cancel();
    this.scrolling = null;
  }

  /**
   * TAB-15: scrolls the tabs inside the track until the whole of `tab` is visible — over the indicator's motion when `animate`, at
   * once when the row first appears (or is resized) and where motion is reduced. The progress of the motion's easing is
   * read from an effect without keyframes on the scroller (it draws nothing), so the scroll follows the token's curve and
   * the motion is the scroller's own animation, `tanrei-tabs-reveal`, on the document's timeline: read, paused or finished
   * like the indicator's slide.
   */
  private reveal(tab: TanreiTab | null, animate: boolean) {
    const scroller = this.scroller;
    const to = this.revealing(tab);
    if (to === null || !scroller) return;
    this.stopScrolling();
    const from = scroller.scrollLeft;
    const { duration, easing } = this.motion();
    if (!animate || duration <= 0 || typeof KeyframeEffect === 'undefined') {
      scroller.scrollLeft = to;
      this.readAgain();
      return;
    }
    // No fill: once finished it leaves the scroller's animations, and its progress (null) reads as the end.
    const timing = new Animation(new KeyframeEffect(scroller, [], { duration, easing }));
    timing.id = 'tanrei-tabs-reveal';
    this.scrolling = timing;
    timing.play();
    const step = () => {
      const progress = timing.effect?.getComputedTiming().progress ?? 1;
      scroller.scrollLeft = from + (to - from) * progress;
      if (timing.playState === 'finished' || timing.playState === 'idle' || this.scrolling !== timing) return;
      this.scrollFrame = requestAnimationFrame(step);
    };
    this.scrollFrame = requestAnimationFrame(step);
  }

  /** The reading half of `reveal()`: where the tabs must scroll to for the whole of `tab` to be visible, or null where it is. */
  private revealing(tab: TanreiTab | null): number | null {
    const scroller = this.scroller;
    if (!tab || !scroller || !tab.isConnected) return null;
    // The whole tab, with the track's padding beside it: the space its focus ring is drawn in (TAB-4), and what brings
    // the first and the last tab to the track's very ends.
    // (What an end tab reaches into the inset is not padding any more, TAB-34: each side has its own.)
    const inset = this.stripReading()?.style ?? null;
    // The boxes are read on the page, where the row may be drawn scaled; the padding and the scroll are its own pixels.
    const scale = this.scale();
    const [padLeft, padRight] = [inset ? (Number.parseFloat(inset.paddingLeft) || 0) * scale.x : 0, inset ? (Number.parseFloat(inset.paddingRight) || 0) * scale.x : 0];
    const bounds = this.rect(scroller);
    const view = { left: bounds.left + padLeft, right: bounds.right - padRight, width: bounds.width - padLeft - padRight };
    // The tab's own box (its host's: the host lays out nothing else), read once with the indicator's.
    const box = this.rect(tab.indicatorParts?.tab ?? tab);
    const rtl = rtlOf(this);
    let delta = 0;
    if (box.width >= view.width) delta = rtl ? box.right - view.right : box.left - view.left;
    else if (box.left < view.left) delta = box.left - view.left;
    else if (box.right > view.right) delta = box.right - view.right;
    delta /= scale.x;
    return Math.abs(delta) < 0.5 ? null : scroller.scrollLeft + delta;
  }

  /**
   * TAB-43: whether the row draws a new selection at once right now: its `transition` when it names one, else the
   * system's choice as the cascade gives it at this moment — never cached, and an unknown name is the first value (slide).
   */
  private get hasNoTransition(): boolean {
    return compChoice(this, TRANSITION_PROPERTY, TRANSITION_CHOICE) === 'none';
  }

  /**
   * TAB-49, TAB-43: where the browser answers no style query, the two choices' names are read from the cascade and
   * written on the row for the same rules (`whenChosen()`); where it does, nothing is written — an attribute could
   * only go stale.
   */
  private syncChoices() {
    const row = this.renderRoot?.querySelector<HTMLElement>('.row');
    if (!row) return;
    if (styleQueries()) {
      delete row.dataset.track;
      delete row.dataset.transition;
      return;
    }
    row.dataset.track = compChoice(this, TRACK_PROPERTY, TRACK_CHOICE);
    row.dataset.transition = compChoice(this, TRANSITION_PROPERTY, TRANSITION_CHOICE);
  }

  /** TAB-5: every row in the page, for the one listener that hears a press beside them. */
  private static readonly rows = new Set<TanreiTabs>();

  /** TAB-5: `row` enters or leaves the document; the window is listened to while there is a row. */
  private static listenBeside(row: TanreiTabs, on: boolean) {
    const rows = TanreiTabs.rows;
    const before = rows.size;
    if (on) rows.add(row);
    else rows.delete(row);
    if (typeof window === 'undefined' || !before === !rows.size) return;
    if (rows.size) window.addEventListener('click', TanreiTabs.onPressBeside);
    else window.removeEventListener('click', TanreiTabs.onPressBeside);
  }

  /**
   * TAB-5: a press that no tab took, and that nothing has answered by the time it reaches the window. Where it lies just
   * above or below a row that is lower than the minimum target, in line with one of its tabs, it is that tab's: the
   * row's hit area reaches as far beyond its top and bottom edges as it takes to make the target, without the row
   * being any taller. It yields to whatever would answer the press itself — a control, a link, a field, a Tab stop,
   * anything that shows the pointer of a link — to a press that ends a selection of text, and to a surface in the top
   * layer that the row is not inside. No element is laid over the page for it: the tabs scroll inside a box that clips
   * them, so nothing of a tab can reach beyond the row, and an element laid beside the row would lie over the controls
   * next to it.
   */
  private static readonly onPressBeside = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const path = event.composedPath();
    const pressed = path[0];
    if (!(pressed instanceof Element) || path.some((node) => node instanceof TanreiTab)) return;
    let asked = false;
    for (const row of TanreiTabs.rows) {
      const tab = row.tabBeside(event);
      if (!tab) continue;
      // Only now is the page asked what the press landed on: nearly every press is beside no row.
      if (!asked) {
        if (answersPress(path) || pressed.ownerDocument.getSelection()?.isCollapsed === false) return;
        asked = true;
      }
      const layer = path.find((node): node is Element => node instanceof Element && ((node.localName === 'dialog' && node.matches(':modal')) || (node.hasAttribute('popover') && node.matches(':popover-open'))));
      if (layer && !composedContains(layer, row)) continue;
      row.select(tab);
      return;
    }
  };

  /**
   * TAB-5, TAB-34: the enabled tab of this row that a press at the event's point belongs to though it missed the row: the
   * point is in line with the tab — or beyond the track's end beside an end tab that ends there, by no more than that
   * tab lacks to the target's width — and no further above the row's top edge or below its bottom edge than half of
   * what the row lacks to the minimum target (sys.target.touch for touch and a pen, and where the input cannot be told on a
   * device whose pointer is coarse; sys.target.pointer for a mouse), and the tab is not covered where the point is
   * nearest to it. Null for a row as tall as the target.
   */
  private tabBeside(event: MouseEvent): TanreiTab | null {
    const scroller = this.scroller;
    const targets = this.renderRoot?.querySelector('.divider');
    if (!scroller || !targets || this.ownerDocument !== (event.target as Node | null)?.ownerDocument) return null;
    const box = scroller.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    const [inX, inY] = [x >= box.left && x < box.right, y >= box.top && y < box.bottom];
    // On the row itself the press is a tab's own (or the track's inset's, which is the end tabs').
    if (!box.height || (inX && inY)) return null;
    const type = (event as PointerEvent).pointerType;
    const coarse = type ? type !== 'mouse' : typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const style = getComputedStyle(targets);
    const scale = layoutScale(scroller);
    const target = Number.parseFloat(coarse ? style.scrollMarginBlockEnd : style.scrollMarginBlockStart) || 0;
    const reach = Math.max(0, (target * scale.y - box.height) / 2);
    if (y < box.top - reach || y >= box.bottom + reach || (!inY && !reach)) return null;
    const tabs = this.tabs;
    let tab: TanreiTab | undefined;
    if (inX) {
      tab = tabs.find((each) => {
        const own = each.getBoundingClientRect();
        return x >= own.left && x < own.right;
      });
    } else {
      // TAB-34: beyond an end of the track, as far as the end tab lacks to the target's width.
      const ends = tabs.length ? [tabs[0], tabs[tabs.length - 1]] : [];
      tab = ends.find((each) => {
        const own = each.getBoundingClientRect();
        const lacks = target * scale.x - own.width;
        if (lacks <= 0 || own.right <= box.left || own.left >= box.right) return false;
        return x < box.left ? own.left <= box.left + 0.5 && x >= own.left - lacks : own.right >= box.right - 0.5 && x < own.right + lacks;
      });
    }
    if (!tab || tab.disabled) return null;
    // The tab itself must be what a press at the nearest point inside the row would land on: a row under something
    // else has no hit area beyond it either.
    const root = this.getRootNode() as Document | ShadowRoot;
    // (Asked at the row's middle height, in line with the press or, beyond an end, at the tab's own middle: the track's
    // rounded corners are not the tab's.)
    const own = tab.getBoundingClientRect();
    const across = inX ? x : Math.min(Math.max((own.left + own.right) / 2, box.left), box.right);
    return root.elementFromPoint?.(across, (box.top + box.bottom) / 2) === tab ? tab : null;
  }

  protected override firstUpdated() {
    this.observe(null, this.strip, this.scroller);
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // TAB-36, TAB-39: the row is in its group, and has looked for its remembered choice, before it is first drawn.
    // A key given later remembers from then on; it restores nothing, since the row has been drawn.
    if (!this.hasUpdated || changed.has('group') || changed.has('rememberAs')) this.enroll();
    this.restored = true;
    // TAB-37: a selected set by the product once the row is drawn, to one of its enabled tabs, is its group's choice —
    // every other member follows at once, nothing is fired and nothing is stored. The selected a row is first drawn
    // with is its own.
    if (this.hasUpdated && changed.has('value') && this.value !== this.known) {
      const value = this.value;
      const tab = value ? this.selectedTab : null;
      this.restoring = null;
      if (value && this.joined && tab && !tab.disabled && this.joined.choice !== value) {
        this.joined.choice = value;
        TanreiTabs.followTogether([...this.joined.members].filter((member) => member !== this && member.wouldFollow(value)));
      }
    }
    this.known = this.value;
    this.adopt();
  }

  protected override updated(changed: PropertyValues<this>) {
    // TAB-41: a row that followed its group has drawn this `value` already, in the task the choice was made in.
    const followed = this.followed;
    this.followed = null;
    if (followed !== null && followed === this.value && changed.size === 1 && changed.has('value')) return;
    if (changed.has('transition')) {
      // TAB-43: a value the tabs do not define is auto.
      if (this.transition && !(TRANSITION_VALUES as readonly string[]).includes(this.transition)) report(this, 'TAB-43', `transition "${this.transition}" is not a transition of the tabs; it is taken as "auto"`);
      // TAB-43: a slide that is running when the row's transition becomes none ends on its tab at once.
      if (this.sliding && this.hasNoTransition) {
        this.stopSliding();
        this.stopScrolling();
        this.place();
        this.reveal(this.selectedTab, false);
      }
    }
    // TAB-13: the tab list, named by the row's label. Anything but a new value may change what the tabs are sized from.
    if ([...changed.keys()].some((key) => key !== 'value')) this.reshaped = true;
    this.syncs.now();
    if (changed.has('fullWidth') && changed.get('fullWidth') !== undefined) void this.selectedTab?.updateComplete.then(() => this.reveal(this.selectedTab, false));
  }

  protected override render() {
    return html`
      <div part="tablist" class="row" role="tablist" aria-label=${this.label || nothing}>
        <div part="divider" class="divider" aria-hidden="true"></div>
        <div part="scroller track" class="scroller" data-tanrei-shape><div class="tabs"><slot></slot></div></div>
      </div>
      <slot></slot>
    `;
  }
}

if (!customElements.get('tanrei-tooltip')) customElements.define('tanrei-tooltip', TanreiTooltip);
if (!customElements.get('tanrei-tab')) customElements.define('tanrei-tab', TanreiTab);
if (!customElements.get('tanrei-tab-panel')) customElements.define('tanrei-tab-panel', TanreiTabPanel);
if (!customElements.get('tanrei-tabs')) customElements.define('tanrei-tabs', TanreiTabs);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tabs': TanreiTabs;
    'tanrei-tab': TanreiTab;
    'tanrei-tab-panel': TanreiTabPanel;
  }
  interface HTMLElementEventMap {
    'tanrei-tab-update': Event;
  }
}
