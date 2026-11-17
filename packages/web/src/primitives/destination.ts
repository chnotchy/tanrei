import { type CSSResult, type PropertyValues, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { iconGlyph } from '../styles/icons.js';
import { cornerRadius, shape } from '../styles/shape.js';
import { namedByProduct } from './delegated-aria.js';
import { focusRing } from './focus-ring.js';
import { pressHold } from './press.js';
import { rippleStyles } from './ripple.js';
import { report } from './report.js';
import { conditionBlock } from './selection.js';
import { stateRules } from './states.js';
import { reducedMotion } from '../styles/motion.js';

/**
 * The destinations of a navigation region (a navigation bar, NVB-*; a navigation drawer, NVD-*): places a person goes
 * to, of which the region's `value` names the current one. On the web a destination is a
 * link (with an `href`: src/primitives/link.ts) or a button, inside a navigation landmark, the current one
 * `aria-current="page"`; its host is a list item of the region's list, so its position among the destinations is read
 * ("2 of 4").
 *
 * `DestinationsController` is the region's side: which destination is selected, what each one is told, the activation
 * (`change` or `reselect`, after the region has set its own `value` — which it never does for a link: NVB-31, NVD-60)
 * and the debug reports. `NavigationDestination` (src/primitives/navigation-destination.ts) is
 * the item of a bar — an icon in an item container that is also the active indicator, a label under it and an optional
 * badge on the icon — drawn from the component's own tokens by `destinationStyles()`. The drawer draws its own cells
 * (their two forms), and takes only the region's side from here.
 */

/** What the region tells each destination. */
export interface DestinationContext {
  selected: boolean;
  /** 1-based position among the destinations, and how many there are. */
  position: number;
  size: number;
  /** Whether its label is drawn (the region's label visibility). */
  labelShown: boolean;
  /** The region's variant, as a class of the cell (`filled` for a filled bar); empty for the core look. */
  variant?: string;
}

/** What the region needs from a destination element. */
export interface Destination extends HTMLElement {
  value: string;
  label: string;
  disabled: boolean;
  setDestinationContext(context: DestinationContext): void;
}

/**
 * What `change` and `reselect` carry: the destination's value — which the region's `value` now holds, unless the
 * destination is a link the region does not select by itself (NVD-60); then `href` is the link's address as it was given.
 */
export interface TanreiNavigationChangeDetail {
  value: string;
  href?: string;
}

/**
 * What a region says of one activation of a link destination it does not select by a press (NVD-60): the address the
 * link carries, and whether the activation follows it in place — a plain one, on a link that opens where the person is.
 */
export interface LinkActivation {
  href: string;
  counted: boolean;
}

/** Which label a destination draws: all of them, only the selected one's, or none (NVB-13, NVD-33). */
export type TanreiLabelVisibility = 'always' | 'selected' | 'never';

/** The event a destination fires when a prop the region depends on changes. */
export const DESTINATION_UPDATE = 'tanrei-destination-update';

/** The event a destination fires before its first render, while its region has told it nothing yet. */
export const DESTINATION_ARRIVE = 'tanrei-destination-arrive';

/**
 * Tells the destination's region that a prop it reads changed (every change but the region's own `context`; the first
 * render's too, whose props the region may have read before they were given). An internal event: dispatched here,
 * outside the components the manifest is made from, so it never becomes part of a destination's public API
 * (custom-elements.json, the React wrappers). The region answers every such event of one batch of updates with one sync.
 */
export function notifyDestinationUpdate(destination: HTMLElement & { hasUpdated: boolean }, changed: PropertyValues): void {
  if (destination.hasUpdated && [...changed.keys()].some((key) => key !== 'context')) destination.dispatchEvent(new Event(DESTINATION_UPDATE, { bubbles: true }));
}

/**
 * A destination that its region has told nothing asks for what it is before it renders for the first time (call it
 * from `willUpdate` while untold): the region answers at once, in the same call, so the first render draws the
 * destination as it is — selected, collapsed — and never as a destination at rest that then changes over a motion.
 * Elements are defined, and so first rendered, in an order the region does not choose: without this the first
 * destination of a region defined after its destinations rendered before the region had synced once. Internal, as
 * `DESTINATION_UPDATE` is.
 */
export function askDestinationContext(destination: HTMLElement): void {
  destination.dispatchEvent(new Event(DESTINATION_ARRIVE, { bubbles: true }));
}

export interface DestinationsOptions<T extends Destination> {
  /** The region's destinations, in reading order. */
  items: () => T[];
  /** The behaviour ids its debug reports cite. */
  ids: { unknownValue: string; emptyLabel: string; duplicate: string; count?: string };
  /** How many destinations the region is made for; fewer or more are reported (`ids.count`). */
  range?: readonly [number, number];
  /** Whether a destination's label is drawn, given whether it is selected (default: always). */
  labelShown?: (selected: boolean) => boolean;
  /** The region's variant, which each destination draws its conditions from (`destinationStyles()`'s `variants`). */
  variant?: () => string;
  /** Called at the end of every sync, with the selected destination and all of them (a bar slides its indicator from it). */
  synced?: (selected: T | null, items: T[]) => void;
  /**
   * What a destination is told, from what every region tells it (`base`): a region whose destinations know more — the
   * drawer's form, their nesting — adds it here, and may count their positions its own way.
   */
  context?: (item: T, base: DestinationContext) => DestinationContext;
  /**
   * NVD-60 — a region whose link destinations are followed, not selected: asked at every click on a destination. Null:
   * the destination is no link, and the region selects it as ever. Otherwise the region never writes its `value` for
   * it: an activation that is `counted` fires `change` or `reselect` — cancelable, carrying `href`, before the browser
   * follows the link, which a cancelled event stops (`preventDefault()` on the click) — and one that is not fires
   * nothing. The navigation bar passes it too (NVB-31). Without this option a link destination is selected like a
   * button.
   */
  link?: (item: T, event: MouseEvent) => LinkActivation | null;
  /**
   * Whether a click that reached `item` is an activation of it (default: every click). A region whose destination
   * holds a control of its own — the chevron of a drawer's group that is a destination, NVD-67 — or other cells, says
   * no for a click that came from those.
   */
  activates?: (item: T, event: MouseEvent) => boolean;
}

/** The region: a Lit element with a `value`. */
export type DestinationsHost = ReactiveControllerHost & HTMLElement & { value: string };

/**
 * The region's side of its destinations (NVB-1…3, NVB-17, NVB-19, NVB-20, NVB-22 and the drawer's same sentences), as a Lit controller: the selected destination is the FIRST whose value equals the region's `value`; a
 * destination's activation — its click, from a pointer, Enter, Space or `element.click()` — selects it, sets the region's
 * `value` and fires `change`, or fires `reselect` when it already was the selected one; a disabled one does nothing.
 * Call `sync()` whenever the region renders or its destinations change (it listens for `DESTINATION_UPDATE`,
 * `DESTINATION_ARRIVE` and child changes itself).
 */
export class DestinationsController<T extends Destination> implements ReactiveController {
  private readonly children$ = new MutationObserver(() => this.sync());
  private readonly reported = new Set<string>();
  /** Whether a sync is already asked for in this batch of updates. */
  private scheduled = false;

  constructor(
    private readonly host: DestinationsHost,
    private readonly options: DestinationsOptions<T>,
  ) {
    host.addController(this);
    host.addEventListener('click', this.onClick);
    host.addEventListener(DESTINATION_UPDATE, this.schedule);
    // A destination about to render for the first time is told what it is before it does.
    host.addEventListener(DESTINATION_ARRIVE, () => this.sync());
  }

  /**
   * One sync for every destination that updated in this batch: a region of many destinations (a drawer of 77 cells)
   * hears one event from each as they first render, and each sync tells all of them. The microtask runs after the
   * updates already queued and before anything that awaited a destination's `updateComplete`.
   */
  private readonly schedule = () => {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      if (!this.scheduled) return;
      this.sync();
    });
  };

  hostConnected() {
    this.children$.observe(this.host, { childList: true, subtree: true });
  }

  hostDisconnected() {
    this.children$.disconnect();
  }

  hostUpdated() {
    this.sync();
  }

  get items(): T[] {
    return this.options.items();
  }

  /** The destination the region's value selects: the first with that value (NVB-22), or none. */
  get selected(): T | null {
    const value = this.host.value;
    if (!value) return null;
    return this.items.find((item) => item.value === value) ?? null;
  }

  /** The destination an event came from. */
  itemOf(event: Event): T | null {
    const items = new Set<Element>(this.items);
    for (const node of event.composedPath()) {
      if (node === this.host) return null;
      if (items.has(node as Element)) return node as T;
    }
    return null;
  }

  private readonly onClick = (event: MouseEvent) => {
    const item = this.itemOf(event);
    if (!item || (this.options.activates && !this.options.activates(item, event))) return;
    const link = this.options.link?.(item, event) ?? null;
    if (!link) {
      this.activate(item);
      return;
    }
    // NVD-60: opened elsewhere (a modified or a middle click, a new context, a download), it is not an activation of
    // the region's; followed in place, the region says so first and the product may take the navigation.
    if (item.disabled || !link.counted) return;
    const type = item === this.selected ? 'reselect' : 'change';
    const notice = new CustomEvent<TanreiNavigationChangeDetail>(type, { bubbles: true, cancelable: true, detail: { value: item.value, href: link.href } });
    if (!this.host.dispatchEvent(notice)) event.preventDefault();
  };

  /** NVB-1, NVB-2: the activation of `item`. Returns what it fired, or null for a disabled destination. */
  activate(item: T): 'change' | 'reselect' | null {
    if (item.disabled) return null;
    const type = item === this.selected ? 'reselect' : 'change';
    if (type === 'change') {
      this.host.value = item.value;
      this.sync();
    }
    this.host.dispatchEvent(new CustomEvent<TanreiNavigationChangeDetail>(type, { bubbles: true, detail: { value: item.value } }));
    return type;
  }

  /** A debug report, once per problem while it lasts (it is reported again after it went away and came back). */
  private reportOnce(seen: Set<string>, id: string, message: string) {
    seen.add(message);
    if (this.reported.has(message)) return;
    this.reported.add(message);
    report(this.host, id, message);
  }

  /** Tells every destination what it is now, and reports what a debug build should (NVB-3, NVB-17, NVB-20, NVB-22). */
  sync() {
    this.scheduled = false;
    const items = this.items;
    const selected = this.selected;
    const shown = this.options.labelShown ?? (() => true);
    const variant = this.options.variant?.();
    const context = this.options.context;
    items.forEach((item, index) => {
      const isSelected = item === selected;
      const base: DestinationContext = { selected: isSelected, position: index + 1, size: items.length, labelShown: shown(isSelected), ...(variant ? { variant } : {}) };
      item.setDestinationContext(context ? context(item, base) : base);
    });
    const { ids, range } = this.options;
    const seen = new Set<string>();
    const value = this.host.value;
    if (value && !selected && items.length) this.reportOnce(seen, ids.unknownValue, `value "${value}" names no destination; none is drawn selected`);
    const values = items.map((item) => item.value);
    for (const repeated of new Set(values.filter((v, i) => v && values.indexOf(v) !== i))) {
      this.reportOnce(seen, ids.duplicate, `the value "${repeated}" is given to more than one destination; the first of them is the one it selects`);
    }
    for (const item of items) {
      if (!item.label.trim() && !namedByProduct(item)) this.reportOnce(seen, ids.emptyLabel, `a destination (value "${item.value}") has an empty label, so it has no accessible name; give it a label`);
    }
    if (range && ids.count && items.length && (items.length < range[0] || items.length > range[1])) {
      this.reportOnce(seen, ids.count, `it holds ${items.length} destinations; it is made for ${range[0]} to ${range[1]}`);
    }
    for (const message of this.reported) if (!seen.has(message)) this.reported.delete(message);
    this.options.synced?.(selected, items);
  }
}

/** The badge text a destination adds to its description: its label, or the displayed count (999+ above 999). */
export function badgeDescription(badge: boolean, count: number | null, label: string): string | null {
  if (!badge) return null;
  const shown = count === null || count === undefined || Number.isNaN(count) ? count : Math.max(0, Math.floor(count));
  if (shown === 0) return null;
  if (label) return label;
  if (shown === null || shown === undefined) return null;
  const format = new Intl.NumberFormat(undefined, { useGrouping: false, maximumFractionDigits: 0 });
  return shown > 999 ? `${format.format(999)}+` : format.format(shown);
}

/** The parts each condition colors in every state: the item container (the active indicator), the icon and the label. */
const PARTS = { c: 'item-container-color', i: 'item-icon-color', l: 'item-label-color' } as const;

/**
 * Where each state is read: hover and keyboard focus on the cell (the native link or button: the whole cell is the hit
 * area), press on the item container (`PressController` writes `data-pressed` there), disabled from `.d`. `:where()`
 * keeps every selector at the same specificity, so the order `stateRules()` writes them in is the precedence.
 */
const on = (state: string) => {
  if (state === ':hover') return '.cell:where(:hover)';
  if (state === ':focus-visible') return '.cell:where(:focus-visible)';
  if (state === ':disabled') return '.cell:where(.d)';
  return `.cell:where(:has(> .container${state}))`;
};

/**
 * The styles of a destination of a bar (`prefix` is `--tanrei-comp-<name>`): the cell, the item container that is both
 * the state layer's box and the active indicator (its corners, the ring or glow around it, the ripple clipped to it),
 * the icon in it — with the badge on it — and the label under it, on one line.
 *
 * `shareWidth`: the cell is an equal share of its bar's width, which narrows below sys.target.touch — and the item
 * container with it — when the bar holds more destinations than its width does, rather than widening the bar (NVB-6).
 * Without it the cell is at least the touch target wide.
 *
 * `parts`: more parts each condition colors in every state (`--_<key>`, read like the icon and the label: from the
 * pressed tokens under ripple and dim too). `variants`: more sets of conditions, `<variant>-unselected` and
 * `<variant>-selected`, drawn while the cell carries the variant's class (the region's `variant`, NVB-3).
 *
 * `focusWithin`: the room the item container has around it before the region's edge (a length expression): the focus
 * indicator is then held inside it, drawn further in by what its reach lacks of that room (`focusRing()`'s `within`,
 * NVB-5). Left out, the indicator is drawn around the item container whatever lies beyond it.
 */
export function destinationStyles(
  prefix: `--${string}`,
  { shareWidth = false, parts: more = {}, variants = [], focusWithin }: { lines: 1; shareWidth?: boolean; parts?: Record<string, string>; variants?: readonly string[]; focusWithin?: string },
): CSSResult {
  const t = (name: string) => `var(${prefix}-${name})`;
  const parts = { ...PARTS, ...more };
  const set = (suffix: string, skip?: string) =>
    Object.keys(parts)
      .filter((key) => key !== skip)
      .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
      .join('');
  const selection = `${t('motion-selection-duration')} ${t('motion-selection-easing')}`;
  const recolor = 'var(--_recolor-duration) var(--_recolor-easing)';
  return unsafeCSS(`
  :host {
    display: flex;
    min-inline-size: 0;
    outline: none;
  }
  :host([hidden]) {
    display: none;
  }
  ${conditionBlock(prefix, 'unselected', parts, '.cell')}
  ${conditionBlock(prefix, 'selected', parts, '.cell.selected')}${variants
    .map((variant) => `\n  ${conditionBlock(prefix, `${variant}-unselected`, parts, `.cell.${variant}`)}\n  ${conditionBlock(prefix, `${variant}-selected`, parts, `.cell.${variant}.selected`)}`)
    .join('')}

  /* The cell: the whole hit area, the native link or button, at least the touch target on both axes (in a bar, across
     only while the bar's equal share holds it: NVB-6); the item container and the label centred in it as a group. */
  .cell {
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-inline-size: ${shareWidth ? '0' : 'var(--tanrei-sys-target-touch)'};
    min-block-size: var(--tanrei-sys-target-touch);
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    ${set('-r')}
    /* A part the states and the selection both recolor takes the state motion, and the selection motion while the
       selection changes (data-condition-change, markConditionChange). */
    --_recolor-duration: ${t('motion-state-duration')};
    --_recolor-easing: ${t('motion-state-easing')};
    transition: opacity ${t('motion-state-duration')} ${t('motion-state-easing')};
  }
  /* The cell is the one hit target: nothing inside it is hit-tested, so a press anywhere in it lands on the native
     link or button itself. Where a clicked button takes focus (WebKit on Linux: GTK, WPE), a press that lands on the
     icon or the label inside the shadow root leaves the sequential focus navigation starting point on that descendant of
     the focused button, and Tab and Shift+Tab then move focus nowhere (NVB-1, NVB-5). */
  .cell * {
    pointer-events: none;
  }
  .cell[data-condition-change] {
    --_recolor-duration: ${t('motion-selection-duration')};
    --_recolor-easing: ${t('motion-selection-easing')};
  }
  .cell.d {
    cursor: default;
  }

  /* The item container: its corners, the icon centred in it; its size is the component's (a bar's is the whole cell less
     its inset). Its own stacking context: the indicator, then the ripple, then the icon. */
  .container {
    box-sizing: border-box;
    position: relative;
    isolation: isolate;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    ${cornerRadius(`${prefix}-item-container-shape`)}
  }
  /* The active indicator and the state layer: the item container's color in the current condition and state. It grows
     from the centre in width when its destination becomes the selected one (the element animates it), and the previous
     one fades out over the selection motion. */
  .indicator {
    position: absolute;
    z-index: -2;
    inset: 0;
    border-radius: calc(var(--tanrei-corner-radius) * var(--_corner-scale));
    corner-shape: inherit;
    background: var(--_c);
    pointer-events: none;
    /* The selection motion, read by the element through real properties (no animation is named here). */
    animation-duration: ${t('motion-selection-duration')};
    animation-timing-function: ${t('motion-selection-easing')};
    transition: background-color ${recolor};
  }
  .cell.selected[data-condition-change] .indicator {
    transition: none;
  }

  ${iconGlyph('.icon', { size: `${prefix}-item-icon-size`, selected: '.cell.selected', duration: `${prefix}-motion-state-duration`, easing: `${prefix}-motion-state-easing` })}
  .icon {
    color: var(--_i);
    transition:
      color ${recolor},
      font-variation-settings ${recolor};
  }

  /* The label under the item container, item.gap away, centred, in item.label.typescale, on one line cut with an ellipsis.
     A label that is not drawn collapses to nothing over the selection motion, so the item container moves to the cell's
     centre as it goes. */
  .label-box {
    display: grid;
    align-self: stretch;
    grid-template-rows: 1fr;
    margin-block-start: ${t('item-gap')};
    min-inline-size: 0;
    transition:
      grid-template-rows ${selection},
      margin-block-start ${selection},
      opacity ${selection};
  }
  .cell.no-label .label-box {
    grid-template-rows: 0fr;
    margin-block-start: 0px;
    opacity: 0;
  }
  .label {
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
    text-align: center;
    font: ${t('item-label-typescale-font')};
    letter-spacing: ${t('item-label-typescale-letter-spacing')};
    color: var(--_l);
    transition: color ${recolor};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  ${stateRules(on, {
    hovered: `${set('-h')}
    opacity: ${t('hovered-opacity')};`,
    focused: `${set('-f')}
    opacity: ${t('focused-opacity')};`,
    pressed: `${set('-p')}
    opacity: ${t('pressed-opacity')};`,
    pressedContent: `${set('-p', 'c')}
    opacity: ${t('pressed-opacity')};`,
    disabled: `
    cursor: default;${set('-d')}
    opacity: ${t('disabled-opacity')};`,
  })}
  .cell:where(:has(> .container[data-pressed]:not([data-pressed='none']))) :is(.indicator, .icon, .label) {
    transition-duration: 0s;
  }

  ${rippleStyles({ color: '--_c-p', grow: `${prefix}-motion-feedback-duration`, fade: `${prefix}-motion-state-duration`, easing: `${prefix}-motion-state-easing` })}

  /* Keyboard focus: the ring (or the glow) around the item container, never animated. */
  ${focusRing((focus) => `.cell${focus} .container`, focusWithin === undefined ? {} : { within: focusWithin })}
  ${shape}
  ${pressHold('.hold')}
  .hold {
    display: none;
  }

  ${reducedMotion(`
    .cell,
    .indicator,
    .icon,
    .label,
    .label-box {
      transition: none;
    }
    .indicator {
      animation-duration: 0s;
    }
  `)}
  @media (forced-colors: active) {
    /* The mode draws everything inside a link in the person's own link color, whatever a stylesheet says: an
       unselected link destination's icon and label are left to it. The selected one and a disabled one (which has no
       address, so it is no link to the mode) are drawn as a button destination's are. */
    .cell.selected .indicator {
      background: Highlight;
    }
    .cell.selected .icon {
      color: HighlightText;
    }
    .cell.d .icon,
    .cell.d .label {
      color: GrayText;
    }
  }
`);
}
