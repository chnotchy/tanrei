/**
 * Where the items of a carousel are for a width and a scroll offset (CRL-8 – CRL-13, CRL-26, CRL-27), and where the
 * row rests (its resting positions, CRL-12, CRL-13): the spec's geometry, with no DOM. Every length is in CSS px, in the
 * row's inner coordinates — 0 is the inner start edge, after `comp.carousel.layout.padding-inline` — and along the
 * reading direction (a right-to-left row mirrors them). Nothing here is rounded (CRL-10: "Widths SHALL NOT be rounded
 * before the items are placed"): the element rounds what it draws to device pixels, starts first (CRL-40).
 *
 * The one rule the slots keep (CRL-40): every slot starts `gap` beyond the drawn end of the one before it — the edge
 * slots of no width a fluid row ends with (CRL-12) and the smaller slots of a scaled row of fixed widths (CRL-26)
 * included. An item's start and width are interpolated between the two slots around its slot position, so the end of
 * one item and the start of the next are interpolated between points that are `gap` apart at both ends: two neighbours
 * are `gap` apart at every scroll position.
 */

/** Where the item in focus sits (CRL-11). */
export type TanreiCarouselHeroAlignment = 'start' | 'center';

/** What the geometry is computed from: the carousel's width, its tokens and its axes. */
export interface CarouselMetrics {
  /** The carousel's width (its inner width W is this less the padding twice). */
  width: number;
  /** comp.carousel.layout.padding-inline. */
  padding: number;
  /** comp.carousel.layout.gap (g). */
  gap: number;
  /** L: `itemWidth`, or comp.carousel.container.large-width while it is null (CRL-9). */
  largeWidth: number;
  /** comp.carousel.container.small-min-width. */
  smallMin: number;
  /** comp.carousel.container.small-max-width. */
  smallMax: number;
  heroAlignment: TanreiCarouselHeroAlignment;
  /** `fluidWidth` (CRL-9, CRL-10). */
  fluid: boolean;
  /** `scaleOthers` (CRL-26): with fixed widths the slots other than the hero's are narrower and close up. */
  scaleOthers?: boolean;
  /** comp.carousel.container.min-scale (CRL-26); 1 while it is left out. */
  minScale?: number;
  /** `snap` (CRL-14, CRL-17, CRL-18). */
  snap: boolean;
  /** `loop` as set; it is in effect only with two or more items (CRL-27). */
  loop: boolean;
  /** N, the number of items. */
  count: number;
}

/** One slot or item as drawn: its start (inner coordinates) and its width. */
export interface ItemBox {
  start: number;
  width: number;
}

/** An item as placed: its box and its slot position s (CRL-12, CRL-15, CRL-26). */
export interface PlacedItem extends ItemBox {
  s: number;
  /** CRL-12: false at or beyond an edge slot of a fluid row — the item is not drawn (its box has no width). */
  drawn: boolean;
  /** CRL-4: on its way between the last slot and an edge slot, where it is narrower than any slot. */
  transit: boolean;
  /** CRL-26: the scale it is drawn at — 1 unless `scaleOthers`, then down to min-scale by its distance from the hero slot. */
  scale: number;
}

/** A position within this of a whole number counts as whole (a scroll offset is stored in device pixels). */
const WHOLE = 1e-3;

/**
 * How far a looping track reaches, at least, in CSS px (CRL-27): the track is a whole number of turns this long or
 * longer, so that no scroll a person makes between two rests reaches its end. A behaviour of the web's scroller, not a
 * design value.
 */
const LOOP_REACH = 8000;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);
const mod = (value: number, n: number) => ((value % n) + n) % n;

export class CarouselGeometry {
  /** W, the inner width. */
  readonly inner: number;
  readonly padding: number;
  readonly gap: number;
  readonly count: number;
  readonly center: boolean;
  /** Whether the row is laid out with fluid widths: `fluidWidth`, unless the row is too narrow for side slots (CRL-9). */
  readonly fluid: boolean;
  /** `fluidWidth` as set (CRL-17, CRL-18 read the prop, not the fallback). */
  readonly fluidSet: boolean;
  readonly snap: boolean;
  /** CRL-26: whether the others are scaled, and the least scale. */
  readonly scaled: boolean;
  readonly minScale: number;
  /** Whether loop is in effect: set, and two or more items (CRL-27). */
  readonly loop: boolean;
  /** H, the hero slot's width, and the width every item's content is laid out at (CRL-9, CRL-15). */
  readonly hero: number;
  /** h, where the hero slot starts (CRL-11). */
  readonly heroStart: number;
  /** CRL-9: fluid widths whose cap is less than the greatest small width — laid out as fixed widths, H being W. */
  readonly oneSlot: boolean;
  /** CRL-10: the widths of the slots on a side where items follow the hero, going outward (empty for fixed widths). */
  readonly side: readonly number[];
  /** The slots after the hero, slot 0 first and the edge slot (no width, CRL-12) last (fluid widths). */
  private readonly after: readonly ItemBox[];
  /** The slots before the hero, slot 0 first and the edge slot (no width) last (fluid widths). */
  private readonly before: readonly ItemBox[];
  /** With fixed widths, the width of every slot but the hero's: H, or H × min-scale while the others are scaled (CRL-13, CRL-26). */
  private readonly other: number;
  /** The resting positions in order, while loop is not in effect (CRL-12, CRL-13). */
  private readonly resting: readonly number[];
  /** While loop is in effect: how many turns the track is long, and the first position of the middle one. */
  readonly turns: number;
  readonly middle: number;

  constructor({ width, padding, gap: g, largeWidth: l, smallMin, smallMax, heroAlignment, fluid, scaleOthers = false, minScale = 1, snap, loop, count }: CarouselMetrics) {
    const w = Math.max(0, width - 2 * padding);
    this.inner = w;
    this.padding = padding;
    this.gap = g;
    this.count = count;
    this.center = heroAlignment === 'center';
    this.fluidSet = fluid;
    this.snap = snap;
    this.scaled = scaleOthers;
    this.minScale = scaleOthers ? minScale : 1;
    this.loop = loop && count >= 2;

    // CRL-9: the hero's width.
    let hero: number;
    let oneSlot = false;
    if (!fluid) {
      hero = Math.min(l, w);
    } else {
      const floor = this.center ? (w - 4 * g - 2 * smallMax) / 3 : (w - 2 * g - smallMax) / 2;
      const cap = this.center ? w - 2 * (g + smallMax) : w - g - smallMax;
      if (cap < smallMax) {
        oneSlot = true;
        hero = w;
      } else {
        hero = clamp(l, floor, cap);
      }
    }
    this.hero = Math.max(0, hero);
    this.oneSlot = oneSlot;
    // CRL-9: a row too narrow for side slots is laid out as it is with fixed widths.
    this.fluid = fluid && !oneSlot;
    // CRL-11: the hero slot at the inner start edge, or with its middle at the middle of W.
    this.heroStart = this.center ? (w - this.hero) / 2 : 0;
    // CRL-13, CRL-26: with fixed widths every other slot is H wide, or H × min-scale while the others are scaled.
    this.other = this.hero * this.minScale;

    // CRL-10: the width each side where items follow leaves, filled going outward.
    let side: number[] = [];
    if (this.fluid) {
      const e = this.center ? (w - this.hero) / 2 - g : w - this.hero - g;
      if (e - g < 2 * smallMin) {
        side = [e];
      } else {
        let s = clamp((e - g) / 3, smallMin, smallMax);
        let m = e - g - s;
        if (m > this.hero) {
          m = this.hero;
          s = e - g - this.hero;
        }
        side = [m, s];
      }
    }
    this.side = side;

    // CRL-11, CRL-12: the slots, each g beyond the one before it going outward, and beyond the last on each side an edge
    // slot of no width, g beyond that slot — before a hero at the start, g before the hero slot itself.
    const heroSlot = { start: this.heroStart, width: this.hero };
    const after: ItemBox[] = [heroSlot];
    for (const slot of side) {
      const previous = after[after.length - 1];
      after.push({ start: previous.start + previous.width + g, width: slot });
    }
    const before: ItemBox[] = [heroSlot];
    if (this.center) {
      for (const slot of side) {
        const previous = before[before.length - 1];
        before.push({ start: previous.start - g - slot, width: slot });
      }
    }
    const [lastAfter, lastBefore] = [after[after.length - 1], before[before.length - 1]];
    after.push({ start: lastAfter.start + lastAfter.width + g, width: 0 });
    before.push({ start: lastBefore.start - g, width: 0 });
    this.after = after;
    this.before = before;

    // CRL-12, CRL-13: the range of p and its resting positions.
    // CRL-13: a start-aligned row of fixed widths ends where its last item ends at the inner end edge — only while the
    // others are not scaled: scaled slots close up, and the unscaled formula would leave the row short of the edge.
    const endsEarly = !this.fluid && !this.center && !this.scaled;
    const end = this.loop ? 0 : endsEarly ? Math.max(0, (count * this.step - g - w) / this.step) : Math.max(0, count - 1);
    const resting: number[] = [];
    if (!this.loop && count > 0) {
      const whole = Math.floor(end + WHOLE);
      for (let i = 0; i <= whole; i++) resting.push(i);
      if (end - whole > WHOLE) resting.push(end);
    }
    this.resting = resting;
    // CRL-27: a looping track is several turns long, whole turns, an odd number so that there is a middle one.
    const turn = count * this.step;
    let turns = this.loop && turn > 0 ? Math.max(3, Math.ceil(LOOP_REACH / turn)) : 1;
    if (turns % 2 === 0) turns += 1;
    this.turns = turns;
    this.middle = this.loop ? Math.floor(turns / 2) * count : 0;
  }

  /** How far the row scrolls for one position: the hero slot plus the gap (CRL-12). */
  get step(): number {
    return this.hero + this.gap;
  }

  /** The greatest p: the end of the range, or the end of a looping track. */
  get maxPosition(): number {
    return this.loop ? this.turns * this.count : (this.resting[this.resting.length - 1] ?? 0);
  }

  /** The scroll range in px: the track is the carousel's width plus this. */
  get range(): number {
    return this.maxPosition * this.step;
  }

  /** D, the number of resting positions (CRL-12): N while loop is in effect. */
  get restingCount(): number {
    return this.loop ? this.count : this.resting.length;
  }

  /**
   * CRL-17, CRL-18: whether the resting item is the item at slot 0 and focus brings an item there — fluid widths, a
   * centred hero or a row that snaps; otherwise (fixed widths at the start, free scroll) the first item wholly in view.
   */
  get toSlot(): boolean {
    return this.fluidSet || this.center || this.snap;
  }

  /** The scroll position p for a scroll offset: within the range, and whole when it is within a hair of it. */
  position(offset: number): number {
    const step = this.step;
    const p = step > 0 ? clamp(offset / step, 0, this.maxPosition) : 0;
    const whole = Math.round(p);
    return Math.abs(p - whole) < WHOLE ? whole : p;
  }

  /** The scroll offset of a position. */
  offset(position: number): number {
    return clamp(position, 0, this.maxPosition) * this.step;
  }

  /** p as the ring sees it while loop is in effect (0 up to N), else p itself. */
  logical(position: number): number {
    return this.loop ? mod(position, this.count) : position;
  }

  /**
   * CRL-12, CRL-27: item `index`'s slot position s at `position`: i − p, or, while loop is in effect, the one value that
   * differs from it by a whole number of turns and lies above −N / 2 and at most N / 2 (centred) or above −1 and at
   * most N − 1 (at the start).
   */
  slotPosition(index: number, position: number): number {
    const s = index - position;
    if (!this.loop) return s;
    const low = this.center ? -this.count / 2 : -1;
    let t = mod(s - low, this.count);
    if (t < WHOLE) t = this.count;
    return low + t;
  }

  /** Slot `k`'s box in a fluid row, k from the edge slot before the hero to the edge slot after it. */
  private slot(k: number): ItemBox {
    return k >= 0 ? this.after[k] : this.before[-k];
  }

  /**
   * Slot `k`'s box in a row of fixed widths (CRL-13, CRL-26): the hero slot H wide at h, every other slot `other` wide —
   * H, or H × min-scale while the others are scaled — each g beyond the drawn edge of the one before it going outward,
   * without end.
   */
  private fixedSlot(k: number): ItemBox {
    if (k === 0) return { start: this.heroStart, width: this.hero };
    const pitch = this.other + this.gap;
    if (k > 0) return { start: this.heroStart + this.hero + this.gap + (k - 1) * pitch, width: this.other };
    return { start: this.heroStart + k * pitch, width: this.other };
  }

  /** CRL-26: the scale of an item at slot position `s`: 1 at the hero slot, min-scale a whole slot away and beyond. */
  scale(s: number): number {
    return this.scaled ? 1 - (1 - this.minScale) * Math.min(1, Math.abs(s)) : 1;
  }

  /**
   * Item `index` at `position` (CRL-12, CRL-13, CRL-26): its start and width are the linear interpolation between those
   * of the two slots around its slot position. With fluid widths an item at or beyond an edge slot is not drawn: its box
   * is the edge slot's, of no width. With fixed widths the slots go on beyond the carousel's edges, where the items are
   * clipped.
   */
  item(index: number, position: number): PlacedItem {
    const s = this.slotPosition(index, position);
    const scale = this.scale(s);
    if (!this.fluid) {
      // Unscaled, every slot is H + g from the next: the start is h + s × (H + g) exactly.
      if (!this.scaled) return { start: this.heroStart + s * this.step, width: this.hero, s, drawn: true, transit: false, scale };
      const at = Math.floor(s);
      const f = s - at;
      const [a, b] = [this.fixedSlot(at), this.fixedSlot(at + 1)];
      return { start: a.start + (b.start - a.start) * f, width: a.width + (b.width - a.width) * f, s, drawn: true, transit: false, scale };
    }
    const high = this.after.length - 1;
    const low = -(this.before.length - 1);
    if (s >= high) return { start: this.slot(high).start, width: 0, s, drawn: false, transit: false, scale };
    if (s <= low) return { start: this.slot(low).start, width: 0, s, drawn: false, transit: false, scale };
    const at = Math.floor(s);
    const f = s - at;
    const [a, b] = [this.slot(at), this.slot(at + 1)];
    return { start: a.start + (b.start - a.start) * f, width: a.width + (b.width - a.width) * f, s, drawn: true, transit: s > high - 1 || s < low + 1, scale };
  }

  /** CRL-17: the resting item — the item at slot 0, or the first item wholly in view (fixed widths at the start, free). */
  restingIndex(position: number): number {
    if (this.count === 0) return 0;
    if (this.toSlot) {
      const nearest = Math.round(position);
      return this.loop ? mod(nearest, this.count) : clamp(nearest, 0, this.count - 1);
    }
    let found = -1;
    let first = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.count; i++) {
      const { start, width } = this.item(i, position);
      if (start >= -this.padding - 0.5 && start + width <= this.inner + this.padding + 0.5 && start < first) {
        first = start;
        found = i;
      }
    }
    return found >= 0 ? found : this.loop ? mod(Math.round(position), this.count) : clamp(Math.floor(position), 0, this.count - 1);
  }

  /**
   * CRL-18: the position that brings item `index` into place — slot 0, or where the range ends first the resting
   * position nearest it, the shorter way round while loop is in effect; or, for fixed widths at the start with free
   * scroll, wholly between the inner edges with the least scroll.
   */
  revealPosition(index: number, position: number): number {
    if (this.toSlot) {
      if (this.loop) return position + this.shorter(index - position);
      return clamp(index, 0, this.maxPosition);
    }
    const { start, width } = this.item(index, position);
    const step = this.step;
    let target = position;
    if (start < 0) target = position + start / step;
    else if (start + width > this.inner) target = position + (start + width - this.inner) / step;
    return clamp(target, 0, this.maxPosition);
  }

  /** The shortest signed distance around the ring equal to `delta` modulo N. */
  private shorter(delta: number): number {
    const n = this.count;
    let d = mod(delta, n);
    if (d > n / 2) d -= n;
    return d;
  }

  /**
   * CRL-14: where a row that snaps comes to rest from `position`: the next resting position in the direction of a fling
   * (`direction` 1 toward the end, −1 toward the start), or else the nearest one.
   */
  settlePosition(position: number, direction: -1 | 0 | 1): number {
    if (this.loop) {
      const target = direction > 0 ? Math.ceil(position - WHOLE) : direction < 0 ? Math.floor(position + WHOLE) : Math.round(position);
      return clamp(target, 0, this.maxPosition);
    }
    const resting = this.resting;
    if (!resting.length) return 0;
    if (direction > 0) return resting.find((r) => r >= position - WHOLE) ?? resting[resting.length - 1];
    if (direction < 0) return [...resting].reverse().find((r) => r <= position + WHOLE) ?? resting[0];
    return this.restingPosition(this.nearestResting(position));
  }

  /**
   * CRL-29: the indicator's position q for `position` — between resting positions j and j + 1 it runs linearly from j
   * to j + 1; while loop is in effect it is p less a whole number of turns, from 0 up to N.
   */
  indicatorPosition(position: number): number {
    if (this.loop) return mod(position, this.count);
    const resting = this.resting;
    if (resting.length < 2) return 0;
    for (let j = 0; j < resting.length - 1; j++) {
      if (position <= resting[j + 1] + WHOLE) return j + clamp((position - resting[j]) / (resting[j + 1] - resting[j]), 0, 1);
    }
    return resting.length - 1;
  }

  /** CRL-29: how far q is from dot j, around the ring while loop is in effect. */
  dotDistance(q: number, j: number): number {
    const d = Math.abs(q - j);
    return this.loop ? Math.min(d, this.count - d) : d;
  }

  /** CRL-31: the index of the resting position nearest `position` (a dot's index), 0 up to D − 1. */
  nearestResting(position: number): number {
    const q = this.indicatorPosition(position);
    return this.loop ? mod(Math.round(q), this.count) : clamp(Math.round(q), 0, Math.max(0, this.resting.length - 1));
  }

  /**
   * The position of resting position `j` (a dot): the resting position itself, or, while loop is in effect, the whole
   * position of that ring value nearest `from` (the shorter way round).
   */
  restingPosition(j: number, from = 0): number {
    if (this.loop) return clamp(from + this.shorter(j - from), 0, this.maxPosition);
    return this.resting[clamp(j, 0, this.resting.length - 1)] ?? 0;
  }

  /**
   * CRL-30, CRL-32: the resting position one step from `position`'s nearest (`direction` 1 or −1): beyond the ends it
   * wraps while `wrap` is true — forward round the ring while loop is in effect, else to the other end — and otherwise
   * stays at the end.
   */
  stepResting(position: number, direction: 1 | -1, wrap: boolean): number {
    if (this.loop) {
      const nearest = Math.round(position);
      const target = nearest + direction;
      return clamp(target, 0, this.maxPosition);
    }
    const d = this.resting.length;
    const at = this.nearestResting(position);
    let next = at + direction;
    if (next < 0 || next >= d) next = wrap ? mod(next, d) : clamp(next, 0, d - 1);
    return this.resting[next] ?? 0;
  }

  /**
   * CRL-27: while loop is in effect, the same place on the ring in the middle turn of the track, when `position` has
   * come within a turn of either end; otherwise `position` itself. Moving by whole turns draws nothing new.
   */
  recentre(position: number): number {
    if (!this.loop) return position;
    const n = this.count;
    if (position >= n && position <= this.maxPosition - n) return position;
    return this.middle + mod(position, n);
  }
}
