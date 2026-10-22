import { type CSSResult, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { BEHAVIOR } from './behavior.js';
import { neighbourTarget } from './target.js';

// The internal channel between a button group and the Buttons in it (BGR-1…4, BGR-7, BGR-11, BGR-12, BGR-16, BGR-22,
// BGR-23; BTN-10: "through an internal channel that is not part of its public surface"). Two halves:
//
//  - CSS custom properties the group sets on its items (`::slotted()`, specs/button-group.spec.json's web note), which
//    the item reads on its container. They follow the cascade — the group's separation is a choice read by a style
//    query — so nothing here is cached in script:
//      `--tanrei-group-start-radius`, `--tanrei-group-end-radius`   the radius of a row item's start and end corners
//      `--tanrei-group-top-radius`, `--tanrei-group-bottom-radius`  the radius of a column item's top and bottom corners
//                                                                   (unset — `initial` — where the item keeps its own)
//      `--tanrei-group-pill`                                        1 where the item's outer corner is a pill (no smoothing)
//      `--tanrei-group-min-width`, `--tanrei-group-min-height`      what a joined item is at least, along the join
//      `--tanrei-group-seam-start` / `-end` / `-top` / `-bottom`    1 on an edge that touches a neighbour under a divider:
//                                                                   the item draws neither outline nor ring along it
//    and one the item sets for itself, which its component's paint reads: `--_own-shadow` (see `groupItemStyles()`).
//      `--tanrei-group-outer-start`, `--tanrei-group-outer-end`     the padding added at a rounded outer end (BGR-23)
//  - Where the item sits (`GroupPlace`), which the group tells the item's `GroupItemController` and the item asks for when
//    it connects. It switches what CSS cannot see from a custom property: the label may wrap (BGR-7), a joined item's own
//    corners are held to half its height and its corners change at once (BGR-2, BGR-11), a standard item's hit area
//    stops at the middle of the gap, along the row or the column (BGR-4), and an item fills the width it is given (a
//    column's, a full-width share: BGR-12, BGR-17).
//
// An item outside a group is told nothing and draws exactly as it always did. None of it is a styling API.
//
// A dialog and a side sheet use the same controller for one thing only (DLG-20, SSH-17, SSH-5): the Button variant they
// give an action whose own variant is not set (`variant`), which the item asks for when it connects (`HOST_VARIANT`)
// and the host tells it when its choice changes (src/primitives/actions.ts) — and, for the side sheet, the variant of
// the close button in its shadow root. The item draws it only while it has no `variant` attribute.
//
// An empty state uses the same channel for one thing only (EMP-6, EMP-11): each Button in its actions is placed as a
// standard item that is both first and last — its hit area and everything it draws are its own — so that its label may
// wrap where its line gives it less than one line needs, and the action does not run past the block.
//
// A toolbar uses the same channel for one thing only (TBR-9): its items are `row` items — not joined, their corners,
// width and label their own — whose hit area stops at the middle of the gap to a neighbour. A toolbar spreads or packs
// its items, so it measures each gap and tells the item how far it may reach on each side (`reachStart`, `reachEnd`),
// along the row's axis.
//
// A component that draws a Button on a colored surface of its own (a status callout's, an inverse or status
// snackbar's) gives it a tone through the same channel (BTN-45): the content color of that surface, and the color of
// a focus indicator's outer stroke there (`Tone`). The item asks for it when it connects (`HOST_TONE`, a child in the
// host's light DOM) and the host tells it when its surface changes (`giveTone()`, a Button in its shadow root). The
// controller marks the item's container `data-tone` and writes the two colors on it as `--_tone` and `--_tone-focus`,
// from the moment the container is made (`toneRef`); the item's styles lay its looks over them (button.styles.ts).
// The colors are known only where the button is drawn, so the states are computed there, from the tone and the
// system's state-layer opacities — a state color valued at the root would hold the root's colors, whatever the button
// is given later.

/**
 * Where a group places one of its items: the group's variant, whether the item is its first or its last in the placed
 * order, the axis the items follow (`block`: a column) and whether the item fills the width it is given (`stretch`: a
 * column's item, a full-width row's). `row` is a toolbar's item (TBR-9), with the reach of its hit area toward each
 * neighbour — half the measured gap, in px; null where it has no neighbour — along `axis` (`block`: a vertical toolbar).
 */
export interface GroupPlace {
  variant: 'standard' | 'connected' | 'row';
  first: boolean;
  last: boolean;
  axis?: 'inline' | 'block';
  stretch?: boolean;
  reachStart?: number | null;
  reachEnd?: number | null;
}

/** The item's controller, under this key on a Tanrei Button or icon button (internal between Tanrei elements). */
export const GROUP_ITEM = Symbol.for('tanrei.group-item');
/** The group's side, under this key on a button group: where it places one of its children (null: not its item). */
export const GROUP_PLACE = Symbol.for('tanrei.group-place');

/**
 * The group's side, under this key on a group that decides which of its items a key can reach (a toolbar's one Tab
 * stop, TBR-10): one of its items was disabled or enabled by the platform — a disabled fieldset around it (BTN-32) —
 * which changes no attribute a group could observe.
 */
export const GROUP_AVAILABILITY = Symbol.for('tanrei.group-availability');

/** A host's side for the variant: the one it gives one of its children whose own is not set (null: none). */
export const HOST_VARIANT = Symbol.for('tanrei.host-variant');

/** A host's side for the tone (BTN-45): the one it gives one of its children (null: none). */
export const HOST_TONE = Symbol.for('tanrei.host-tone');

/**
 * A tone (BTN-45): the content color of the colored surface a host draws the Button on, and the color of a focus
 * indicator's outer stroke on it (left out: the content color). Each is a CSS color expression of the host's own
 * tokens (`var(--tanrei-comp-callout-error-body-color-tonal)`), read where the Button is drawn.
 */
export interface Tone {
  color: string;
  focus?: string;
}

const sameTone = (a: Tone | null, b: Tone | null) => a === b || (!!a && !!b && a.color === b.color && (a.focus ?? null) === (b.focus ?? null));

/** An element that places its children (a button group). */
export interface PlacingGroup {
  [GROUP_PLACE](child: Element): GroupPlace | null;
  [GROUP_AVAILABILITY]?(child: Element): void;
}
/** An element that gives its children a variant (a dialog or a side sheet, to its actions: DLG-20, SSH-17). */
export interface VariantHost {
  [HOST_VARIANT](child: Element): string | null;
}
/** An element that gives its children a tone (BTN-45): a host that draws them on a colored surface of its own. */
export interface ToneHost {
  [HOST_TONE](child: Element): Tone | null;
}
/** An element that can be placed in a group (a Button, an icon button). */
export interface GroupItem {
  readonly [GROUP_ITEM]: GroupItemController;
}

/** Gives `element` the tone its host chose for it (null: none), through the Button's group-item channel (BTN-45). */
export function giveTone(element: Element | null | undefined, tone: Tone | null) {
  (element as (Element & Partial<GroupItem>) | null | undefined)?.[GROUP_ITEM]?.giveTone(tone);
}

/**
 * Added to a measured size before it is written as a length. A zoomed page reports a size divided by its zoom, to a
 * thousandth of a pixel, and the engine multiplies the length back: the product can fall a hair under the layout unit
 * the size really is, and is then cut down to the unit below (1/64 px) — enough to round the far edge of a cut to the
 * pixel before the seam where the seam falls on half a pixel. A thousandth of a pixel is more than that error and far
 * less than a unit.
 */
const SLACK = 0.001;

const same = (a: GroupPlace | null, b: GroupPlace | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.variant === b.variant &&
    a.first === b.first &&
    a.last === b.last &&
    (a.axis ?? 'inline') === (b.axis ?? 'inline') &&
    !!a.stretch === !!b.stretch &&
    (a.reachStart ?? null) === (b.reachStart ?? null) &&
    (a.reachEnd ?? null) === (b.reachEnd ?? null));

/**
 * An item's side: the place its group gave it (null outside a group), as classes on its container (`classes()`), and —
 * while connected — the container's half height as `--_half-block`, so that its own corners are held to a round cap
 * (a pill token is 9999 px, and a box whose corners differ scales ALL of them down together when two meet: the inner
 * corners would vanish), and its size as `--_box-width` and `--_box-height`, which the cut of its shadows at a seam
 * counts from (`groupItemStyles()`).
 */
export class GroupItemController implements ReactiveController {
  place: GroupPlace | null = null;
  /** The variant its host gives it while its own is not set (DLG-20, SSH-17, SSH-5); null outside such a host. */
  variant: string | null = null;
  /** The tone its host gives it (BTN-45); null outside such a host. */
  tone: Tone | null = null;
  private observer: ResizeObserver | null = null;
  private observed: HTMLElement | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly container: () => HTMLElement | null,
  ) {
    host.addController(this);
  }

  hostConnected() {
    // The group may have placed its children before this element was upgraded; ask it.
    const parent = this.host.parentElement as (HTMLElement & Partial<PlacingGroup> & Partial<VariantHost> & Partial<ToneHost>) | null;
    this.set(parent?.[GROUP_PLACE]?.(this.host) ?? null);
    this.give(parent?.[HOST_VARIANT]?.(this.host) ?? null);
    this.giveTone(parent?.[HOST_TONE]?.(this.host) ?? null);
  }

  /** The platform's word that the item is disabled changed (its `formDisabledCallback`): its group is told. */
  availabilityChanged() {
    (this.host.parentElement as (HTMLElement & Partial<PlacingGroup>) | null)?.[GROUP_AVAILABILITY]?.(this.host);
  }

  hostDisconnected() {
    this.set(null);
    this.give(null);
    this.giveTone(null);
    this.watch(null);
  }

  /** The host's variant (DLG-20, SSH-17, SSH-5). */
  give(variant: string | null) {
    if (variant === this.variant) return;
    this.variant = variant;
    this.host.requestUpdate();
  }

  /** The host's tone (BTN-45): written on the container at once — its mark and its two colors together. */
  giveTone(tone: Tone | null) {
    if (sameTone(tone, this.tone)) return;
    this.tone = tone ? { ...tone } : null;
    this.paint(this.container());
  }

  /**
   * BTN-45: bound on the item's container in its template (`ref(controller.toneRef)`), so that the tone is on a
   * container from the moment it is made, before anything computes its style: a style computed without it, even
   * once, starts a transition from the variant's own colors to the tone's.
   */
  readonly toneRef = (element?: Element) => this.paint((element as HTMLElement | undefined) ?? null);

  hostUpdated() {
    this.watch(this.place?.variant === 'connected' ? this.container() : null);
    this.reach();
    this.paint(this.container());
  }

  /** The group's word. */
  set(place: GroupPlace | null) {
    if (same(place, this.place)) return;
    this.place = place ? { ...place } : null;
    this.host.requestUpdate();
  }

  /**
   * The container's classes: `joined` in a button group (standard or connected), then its variant, `first` and `last`,
   * `block` in a column and `stretch` where the item fills the width it is given; a toolbar's item is `row` (and
   * `block` in a column), never `joined`.
   */
  classes(): Record<string, boolean> {
    const place = this.place;
    return {
      joined: place?.variant === 'standard' || place?.variant === 'connected',
      standard: place?.variant === 'standard',
      connected: place?.variant === 'connected',
      row: place?.variant === 'row',
      block: place?.axis === 'block',
      stretch: !!place?.stretch,
      first: !!place?.first,
      last: !!place?.last,
    };
  }

  private reached: HTMLElement | null = null;
  private toned: HTMLElement | null = null;

  /**
   * BTN-45: the tone on the container — `data-tone` and its two colors, `--_tone` and `--_tone-focus`, which the item's
   * styles read under that mark — always together, so that no style is ever computed with the one and not the other.
   */
  private paint(container: HTMLElement | null) {
    const element = this.tone ? container : null;
    if (this.toned && this.toned !== element) {
      this.toned.removeAttribute('data-tone');
      this.toned.style.removeProperty('--_tone');
      this.toned.style.removeProperty('--_tone-focus');
    }
    this.toned = element;
    if (!element || !this.tone) return;
    element.style.setProperty('--_tone', this.tone.color);
    element.style.setProperty('--_tone-focus', this.tone.focus ?? 'var(--_tone)');
    element.setAttribute('data-tone', '');
  }

  /** TBR-9: a row item's reach toward each neighbour, as the caps `neighbourTarget()` reads on the container. */
  private reach() {
    const place = this.place?.variant === 'row' ? this.place : null;
    const element = place ? this.container() : null;
    if (this.reached && this.reached !== element) {
      this.reached.style.removeProperty('--_cap-start');
      this.reached.style.removeProperty('--_cap-end');
    }
    this.reached = element;
    if (!element || !place) return;
    for (const [side, value] of [['start', place.reachStart], ['end', place.reachEnd]] as const) {
      if (value == null) element.style.removeProperty(`--_cap-${side}`);
      else element.style.setProperty(`--_cap-${side}`, `${value}px`);
    }
  }

  private watch(element: HTMLElement | null) {
    if (element === this.observed) return;
    if (this.observed) {
      this.observer?.unobserve(this.observed);
      for (const name of ['--_half-block', '--_box-width', '--_box-height']) this.observed.style.removeProperty(name);
    }
    this.observed = element;
    if (!element) return;
    this.observer ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        const block = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height;
        const style = (entry.target as HTMLElement).style;
        style.setProperty('--_half-block', `${block / 2}px`);
        // The cut of the shadows' box at a seam counts from its top left corner (groupItemStyles): the box's used size,
        // which the container's computed width and height are (it is a border box). Not the observer's own numbers:
        // on a zoomed page they are cut down to a layout unit of the unzoomed size, which is coarser than the layout.
        const used = getComputedStyle(entry.target);
        for (const [name, value] of [['--_box-width', used.width], ['--_box-height', used.height]] as const) {
          const size = Number.parseFloat(value);
          if (Number.isFinite(size)) style.setProperty(name, `${size + SLACK}px`);
          else style.removeProperty(name);
        }
      }
    });
    this.observer.observe(element);
  }
}

export interface GroupItemStyleOptions {
  /** The container: the element that carries the shape (`data-tanrei-shape`), the states, the ring and the ripple. */
  on: string;
  /**
   * The custom property the ripple is inset by (the outline width), as `rippleStyles({ inset })` names it: on a seam,
   * where there is no outline, the ripple is not inset, and the border forced colors draw for the outline is left out.
   */
  rippleInset?: `--${string}`;
}

/** Every custom property a group may set on an item: a component that is no group item resets them on its own boxes. */
export const GROUP_ITEM_PROPERTIES = [
  '--tanrei-group-start-radius',
  '--tanrei-group-end-radius',
  '--tanrei-group-top-radius',
  '--tanrei-group-bottom-radius',
  '--tanrei-group-pill',
  '--tanrei-group-min-width',
  '--tanrei-group-min-height',
  '--tanrei-group-seam-start',
  '--tanrei-group-seam-end',
  '--tanrei-group-seam-top',
  '--tanrei-group-seam-bottom',
  '--tanrei-group-outer-start',
  '--tanrei-group-outer-end',
] as const;

/** The declarations that take a box out of whatever group is around it: every group property back to `initial`. */
export const groupItemReset = GROUP_ITEM_PROPERTIES.map((property) => `${property}: initial;`).join('\n    ');

/**
 * The item's styles inside a group, on its container (`on`). Outside a group none of these selectors match.
 *
 * - Connected (BGR-2, BGR-3, BGR-11, BGR-16): in a row the start corners (inline-start, mirrored in right-to-left) take
 *   `--tanrei-group-start-radius` and the end corners `--tanrei-group-end-radius`; in a column the top corners take
 *   `--tanrei-group-top-radius` and the bottom ones `--tanrei-group-bottom-radius`; else the item's own container shape
 *   of the state. Each is held to half the container's height; the ripple and the focus ring (ring or glow) follow each
 *   corner, concentric; the container is at least `--tanrei-group-min-width` wide; a corner that changes because an
 *   item came, went or moved changes at once (no transition on the corners). `--tanrei-group-pill` says whether the
 *   box's outer corner is a pill, which the smoothing leaves round (styles/shape.ts).
 * - A seam (BGR-22, SPB-26): on an edge whose `--tanrei-group-seam-*` is 1 the container draws neither its outline nor
 *   its elevation's ring. Both are rings around a whole box (inset shadows, or a spread shadow), and a ring cannot
 *   leave one side out — so the container does not draw them itself. Its box ends at the seam and paints the fill
 *   alone: two fills that touch are two neighbouring boxes, which every engine snaps to the same device pixel, so
 *   nothing of the page shows between them and nothing is painted twice, however translucent the fills are. The rings
 *   — everything the state's `box-shadow` holds, which the component hands over as `--_shadow` — are drawn by the
 *   container's `::after`, a box of the container's shape that reaches `--_bleed` past each seam and is cut at the seam
 *   by `clip: rect()`: the ring's seam side is outside the cut, and the rings of the other sides run straight to the
 *   seam and end there (the corners at a seam are square). The cut is a rectangle in the engine's own pixel snapping,
 *   as a box's edge is — unlike `clip-path`, which Chromium antialiases at the place layout gives it and Firefox and
 *   WebKit round on their own, so that two clip paths that meet at one seam leave a line between them or overlap by
 *   one. It leaves `--_reach` of room on every other side for the blurred layers of the elevation. `rect()` counts
 *   from the box's top left corner in lengths, so its right and bottom edges need the container's size:
 *   `GroupItemController` measures it (`--_box-width`, `--_box-height`). While the container has keyboard focus its
 *   `::after` is the focus ring, and it draws its shadows itself, whole, over its neighbours and the dividers beside it:
 *   the focus ring follows the item's own shape.
 * - What the group adds to the container's size is `--_add-start`, `--_add-end`, `--_add-top` and `--_add-bottom` — at
 *   an outer end of a row `--tanrei-group-outer-start` / `-end` (BGR-23), nothing anywhere else. The component adds
 *   each to its padding on that side (and to a fixed width or a minimum height of its own); outside a connected group
 *   it defines them as 0.
 * - Standard (BGR-4): the hit area (`::before`, `minimumTarget()` then `neighbourTarget()`) still reaches the target,
 *   but toward a neighbour no further than half the gap, so a press between two items goes to the nearer one and never
 *   over a neighbour's visible bounds; the first item's start and the last one's end reach as far as they would alone.
 *   Along the row, or — `block` — along the column.
 * - Row (TBR-9, a toolbar's item): the same, with the caps the toolbar measured (`reachStart`, `reachEnd`, set on the
 *   container by the controller), along the inline axis or — in a vertical toolbar — the block axis.
 */
export function groupItemStyles({ on, rippleInset }: GroupItemStyleOptions): CSSResult {
  const connected = `${on}.connected`;
  // Corners by their logical name: the block side first (start = top), then the inline side.
  const CORNERS = ['start-start', 'start-end', 'end-start', 'end-end'] as const;
  const radius = (corner: string, plus?: string, minus?: string) => {
    const base = `var(--_group-${corner}) * var(--_corner-scale)`;
    if (minus) return `max(0px, calc(${base} - ${minus}))`;
    return plus ? `calc(${base} + ${plus})` : `calc(${base})`;
  };
  const corners = (plus?: string, minus?: string) => CORNERS.map((corner) => `border-${corner}-radius: ${radius(corner, plus, minus)};`).join('\n    ');
  // A corner's radius as the group gives it: a column's top or bottom, else a row's start or end, else the item's own;
  // held to half the container's height (a pill token is 9999 px, and a box whose corners differ scales ALL of them
  // down together when two meet: the inner corners would vanish).
  const given = (corner: (typeof CORNERS)[number]) => {
    const [block, inline] = corner.split('-');
    const value = `var(--tanrei-group-${block === 'start' ? 'top' : 'bottom'}-radius, var(--tanrei-group-${inline}-radius, var(--tanrei-corner-radius)))`;
    return `--_group-${corner}: min(${value}, var(--_half-block, ${value}));`;
  };
  const glow = corners('var(--tanrei-sys-focus-offset)');
  const half = 'calc(var(--tanrei-comp-button-group-standard-gap) / 2)';
  // The shadows' box (`::after`) reaches the bleed past each seam, and is cut there: `clip: rect(top, right, bottom,
  // left)`, each a distance from the top left corner of that box — the seam where an edge is one, `--_reach` beyond
  // the container's edge where it is not. The cut is physical: the start is the left — mirrored below.
  const near = (side: 'left' | 'top') => `calc(var(--_seam-${side}) * (var(--_bleed) + var(--_reach)) - var(--_reach))`;
  const far = (size: 'width' | 'height', before: 'left' | 'top', side: 'right' | 'bottom') =>
    `calc(var(--_box-${size}, 0px) + var(--_seam-${before}) * var(--_bleed) + (1 - var(--_seam-${side})) * var(--_reach))`;
  const past = (side: 'left' | 'right' | 'top' | 'bottom') => `${side}: calc(var(--_seam-${side}) * var(--_bleed) * -1);`;
  // What stays inside the outline (the ripple) is inset by its width on the sides that have one: not on a seam.
  const inside = (width: string) => (['top', 'right', 'bottom', 'left'] as const).map((side) => `${side}: calc((1 - var(--_seam-${side})) * var(${width}));`).join('\n    ');
  return unsafeCSS(`
  ${connected} {
    ${CORNERS.map(given).join('\n    ')}
    ${corners()}
    --_seam-start: var(--tanrei-group-seam-start, 0);
    --_seam-end: var(--tanrei-group-seam-end, 0);
    --_seam-top: var(--tanrei-group-seam-top, 0);
    --_seam-bottom: var(--tanrei-group-seam-bottom, 0);
    --_bleed: var(--tanrei-sys-space-space50);
    --_reach: var(--tanrei-sys-target-touch);
    --_add-start: var(--tanrei-group-outer-start, 0px);
    --_add-end: var(--tanrei-group-outer-end, 0px);
    --_add-top: 0px;
    --_add-bottom: 0px;
    --_seam-left: var(--_seam-start);
    --_seam-right: var(--_seam-end);
    /* The container paints its fill; its shadows are its ::after's (below). Transparent, not none: a list value. */
    --_own-shadow: 0 0 0 0 transparent;
    min-inline-size: calc(var(--tanrei-group-min-width, 0px) + var(--_add-start) + var(--_add-end));
    transition-property: background-color, color, opacity;
  }
  :host(:dir(rtl)) ${connected} {
    --_seam-left: var(--_seam-end);
    --_seam-right: var(--_seam-start);
  }
  ${connected}:not(:focus-visible)::after {
    content: '';
    position: absolute;
    z-index: -1;
    ${past('top')}
    ${past('right')}
    ${past('bottom')}
    ${past('left')}
    border-radius: inherit;
    box-shadow: var(--_shadow);
    clip: rect(${near('top')}, ${far('width', 'left', 'right')}, ${far('height', 'top', 'bottom')}, ${near('left')});
    pointer-events: none;
    transition-property: box-shadow;
    transition-duration: inherit;
    transition-timing-function: inherit;
  }
  ${connected}:focus-visible,
  :host(:dir(rtl)) ${connected}:focus-visible {
    --_seam-start: 0;
    --_seam-end: 0;
    --_seam-top: 0;
    --_seam-bottom: 0;
    --_own-shadow: initial;
    z-index: 2;
  }
  @supports (corner-shape: superellipse(log(2, 2))) {
    ${connected} {
      --_corner-smoothing: calc(var(--tanrei-sys-shape-corner-smoothing, 0) * (1 - var(--tanrei-group-pill, var(--tanrei-corner-pill, 0))));
    }
  }
  ${connected} .ripple {
    ${corners(undefined, rippleInset ? `var(${rippleInset})` : '0px')}
    ${rippleInset ? inside(rippleInset) : ''}
  }
  ${
    rippleInset
      ? `/* Forced colors replace the outline with a border (the component's rule): none along a seam. */
  @media (forced-colors: active) {
    ${connected} {
      ${(['top', 'right', 'bottom', 'left'] as const).map((side) => `border-${side}-width: calc((1 - var(--_seam-${side})) * var(${rippleInset}));`).join('\n      ')}
    }
  }`
      : ''
  }
  ${connected}:focus-visible::after {
    ${corners('var(--_focus-inner-edge)')}
  }
  @container style(${BEHAVIOR}-focus-style: glow) {
    ${connected}:focus-visible::after {
    ${glow}
    }
  }
  ${connected}[data-focus-style='glow']:focus-visible::after {
    ${glow}
  }

  ${neighbourTarget(`${on}.standard:not(.block)`)}
  ${neighbourTarget(`${on}.standard.block`, { axis: 'block' })}
  ${on}.standard::before {
    --_cap-start: ${half};
    --_cap-end: ${half};
  }
  ${on}.standard.first::before {
    --_cap-start: initial;
  }
  ${on}.standard.last::before {
    --_cap-end: initial;
  }

  ${neighbourTarget(`${on}.row:not(.block)`)}
  ${neighbourTarget(`${on}.row.block`, { axis: 'block' })}
`);
}
