import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, OpenAxesController, Settle, documentPainted, parseValues, report } from '../../primitives/index.js';
import type { TanreiTagGroupSpacingRegistry } from '../../registry.js';
import { AXES, DEFAULT_SPACING, styles } from './tag-group.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core spacings (tags, chips), plus any a design system's generated `.d.ts` registers. */
export type TanreiTagGroupSpacing = keyof TanreiTagGroupSpacingRegistry;

/** Whether the group holds the selection of its filter chips, and how many may be on (TGR-17). A closed set. */
export type TanreiTagGroupSelection = 'none' | 'single' | 'multiple';

/** What `change` carries: the group's `value` after the change (single), or its `values` (multiple). */
export type TanreiTagGroupChangeDetail = { value: string | null } | { values: string[] };

const SELECTIONS: readonly string[] = ['none', 'single', 'multiple'];
/** The kind of chip that holds a selection (CHP-11). */
const FILTER = 'filter';

/** The members a tag group is for (TGR-11). */
const MEMBERS = ['tanrei-tag', 'tanrei-chip'];
/** The spacing of static tags, whose lines stand too close for a chip's touch target (TGR-4). */
const TAGS = 'tags';
/** The member that takes input (TGR-4). */
const CHIP = 'tanrei-chip';
/** Native elements that say nothing of their own: one of them, like a custom element, can be made an item of the list (TGR-7). */
const GENERIC = ['div', 'span'];
const ITEM_ROLE = 'listitem';

const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;
/** What the group holds: its element children, and text that is more than the white space between them. */
const isContent = (node: Node) => node.nodeType === Node.ELEMENT_NODE || (isText(node) && node.data.trim() !== '');
const sameOrder = (a: readonly Node[], b: readonly Node[]) => a.length === b.length && a.every((node, i) => node === b[i]);

/** Whether motion is reduced for this person (TGR-10). */
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** TGR-10: where a member was laid out at the last look, from the list's corner and without its move, and the line it stood on. */
interface Place {
  x: number;
  y: number;
  line: readonly Element[];
}

/**
 * Whether the group may give this member the list item role: it has no `role` of its own, and it is an element that
 * says nothing by itself — a custom element (a tag, a chip: their semantics are inside their shadow roots) or a `div`
 * or `span`. A native link, button or heading keeps what it is; the role would take it away.
 */
const takesItemRole = (member: Element) => !member.hasAttribute('role') && (member.localName.includes('-') || GENERIC.includes(member.localName));

type ChipLike = HTMLElement & { kind?: string; value?: string; selected?: boolean; disabled?: boolean };
/** A chip's kind and value, read from the element where it is defined and from its attributes where it is not yet. */
const kindOf = (chip: ChipLike) => chip.kind ?? chip.getAttribute('kind') ?? 'action';
const valueOf = (chip: ChipLike) => (typeof chip.value === 'string' ? chip.value : (chip.getAttribute('value') ?? ''));
/** TGR-20: a chip takes focus unless it is disabled. */
const takesFocus = (chip: ChipLike) => !(chip.disabled ?? chip.hasAttribute('disabled'));

/** Whether focus is on `member` or inside it, its shadow root included: what its own tree calls the active element. */
function holdsFocus(member: Element): boolean {
  const active = (member.getRootNode() as Document | ShadowRoot).activeElement;
  return !!active && member.contains(active);
}

/**
 * Lays out a set of tags or chips in lines that wrap, spaced for what it holds, and exposes the set as one named list.
 *
 * Contract: specs/tag-group.spec.json. It reads four tokens (`--tanrei-comp-tag-group-gap-*` and `-row-gap-*`, one pair
 * per `spacing`) and draws nothing of its own: no container, no fill, no edge, no padding, and not its `label`. Its
 * members are `<tanrei-tag>` and `<tanrei-chip>` children, which stay in your DOM where you wrote them, drawn from
 * their own tokens at their own size, with their own states, events, names and Tab stops (TGR-6). The group itself never
 * takes focus. With the default `selection="none"` it handles no key, keeps no selection, does not make filter chips
 * exclusive and fires no event.
 *
 * It is a list (TGR-7): the shadow root holds one element with the list role, named by `label`, around the slot, and
 * each member is given `role="listitem"` while it is in the group — the attribute is written on your element where it
 * has no `role` of its own, and taken back when it leaves. A chip's button or link, with its state, is inside its item.
 *
 * `spacing` says what the set holds. Lines of tags stand as close as the tags along a line; lines of chips stand far
 * enough apart that each chip keeps its whole touch target, and a chip in a group ends its hit area at the middle of
 * the gap to its neighbour — along a line, and between two lines while the set wraps (TGR-5). A set of chips wants
 * `spacing="chips"`.
 *
 * When a member leaves while focus is on it — on a chip or on its remove action — focus goes to the chip that followed
 * it, or to the one before where none follows (TGR-9). The group removes nothing itself: on a chip's `remove` you take
 * the element out. When the last member that takes focus has gone the group has nowhere to put it; move it yourself to
 * the control the set belongs to. A group with no member draws nothing, takes no space and exposes nothing (TGR-8).
 *
 * `selection="single"` or `"multiple"` makes the group hold the selection of its filter chips (TGR-17 to TGR-21), named
 * by each chip's `value`: `value` is the one that is on (single; `null` for none), `values` the ones that are on
 * (multiple). The group sets each filter chip's `selected` from them, and when a person switches a chip it sets `value`
 * or `values`, stops the chip's own `change` and fires its own. A single selection can be emptied by switching its chip
 * off, because each chip is a toggle. The set is then one Tab stop — the chip that last had focus, else the first chip
 * that is on, else the first — and the arrow keys (the way they point, in right-to-left too), Home and End move between
 * its chips without switching anything; Space switches the focused filter chip, Backspace or Delete removes an input chip.
 *
 * When a member is added, removed or changes its size, the members whose place that changes move there from where
 * they were drawn, over `--tanrei-comp-tag-group-motion-move-duration` with `-move-easing`, along a line and from one
 * line to another (TGR-10). A line that keeps the same members follows the change at once: a chip that grows with its
 * own motion carries the chips after it. A member that is added appears and one that is removed leaves at once; with
 * reduced motion, or when the group's width changes, every member is placed at once. The motion is a `translate` added
 * to the member's own, so a member keeps focus, and its focus indicator, while it moves.
 *
 * It supplies no words: the name of the set is yours, in `label`.
 *
 * @tag tanrei-tag-group
 * @fires {CustomEvent<TanreiTagGroupChangeDetail>} change - While `selection` is single or multiple, a person switched a filter chip: `detail.value` (single) or `detail.values` (multiple) after the change, which the group already holds. The chip's own `change` stops at the group.
 * @slot - The members: `<tanrei-tag>` and `<tanrei-chip>` elements. Anything else is still laid out, and reported in debug builds (TGR-11).
 */
export class TanreiTagGroup extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'tag-group');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    spacing: { type: String, reflect: true },
    label: { type: String },
    selection: { type: String, reflect: true },
    value: { type: String },
    values: { attribute: 'values', converter: { fromAttribute: parseValues } },
    empty: { state: true },
  };

  /**
   * What the set holds, which decides the distances between its members: `tags` for static tags, as close as words of
   * one group; `chips` for chips, with lines far enough apart that each chip keeps its whole touch target. A design
   * system may add values; one the active system does not have is drawn as `tags` (reported in debug builds, TGR-16).
   */
  spacing: TanreiTagGroupSpacing = DEFAULT_SPACING;

  /**
   * The accessible name of the set ("Tags", "Filters"), in your words. It is not drawn: a set that needs a visible name
   * stands under your own heading or text, and still takes this. Empty, the list is exposed without a name.
   */
  label = '';

  /**
   * Whether the group holds the selection of its filter chips (TGR-17): `none` (each filter chip holds its own
   * `selected`), `single` (at most one on, named by `value`) or `multiple` (any number, named by `values`). While it is
   * single or multiple the set is one Tab stop and the arrow keys move between its chips (TGR-20). A value the group
   * does not have is `none`, reported in debug builds.
   */
  selection: TanreiTagGroupSelection = 'none';

  /** The value of the filter chip that is on while `selection` is single; `null` for none. The group sets it when a chip is switched. */
  value: string | null = null;

  /** The values of the filter chips that are on while `selection` is multiple. Assign a new array to change it; the group assigns one when a chip is switched. */
  values: string[] = [];

  /** TGR-8: whether the group holds nothing. */
  protected empty = true;

  /** TGR-16: a spacing a design system adds, and one the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'tag-group', behavior: 'TGR-16', axes: AXES });

  /** TGR-8: the custom state the styles read to take an empty group out of the layout. */
  private readonly internals: ElementInternals | null = typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  /** What the group holds, in the order given (TGR-3). */
  private content: Node[] = [];

  /** TGR-7: the members the group gave the list item role, so that it takes back only what it gave. */
  private readonly given = new Set<Element>();

  /** TGR-20: the chips the group took out of the Tab order, so that it gives back only what it took. */
  private readonly unstopped = new Set<HTMLElement>();

  /** TGR-20: the chip that last had focus while the group held a selection: the set's stop while it is here. */
  private stop: HTMLElement | null = null;

  /** TGR-17, TGR-21: a chip whose value, kind or disabled changes is selected and stopped again. */
  private readonly members$ = new MutationObserver((records) => {
    if (!records.some((record) => record.target.parentNode === this)) return;
    this.select();
    this.check();
  });

  /** TGR-9: the member focus is on or inside, as the last `focusin` said. */
  private focused: Element | null = null;

  /**
   * The group reads who is there, gives and takes back the item role, and (TGR-9) sees a member leave while focus was
   * on it. TGR-10: then, once the members that came have rendered — still before the frame is drawn — it places them
   * again, and the members that changed place move from where they were drawn.
   */
  private readonly children$ = new MutationObserver((records) => {
    const before = this.content;
    this.read();
    this.select();
    this.afterLeave(before, records);
    const came = records.flatMap((record) => [...record.addedNodes]).map((node) => (node as Node & { updateComplete?: Promise<unknown> }).updateComplete);
    void Promise.all(came).then(() => this.place(true));
  });

  /**
   * TGR-5, TGR-10: the list's box and each member's are watched while they are in the page, and the members placed
   * again when one of them changes — after its layout, before it is drawn. Nothing is measured at rest.
   */
  private readonly lines$ = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.place()) : null;
  private observed: Element | null = null;
  /** TGR-10: the members whose box is watched. */
  private readonly sized = new Set<Element>();

  /** TGR-5: the list is watched while it is rendered (an empty group has none) and the group is in the page. */
  private watchLines() {
    const rendered = this.renderRoot?.querySelector('.list') ?? null;
    if (rendered === this.observed) return;
    if (this.observed) this.lines$?.unobserve(this.observed);
    if (rendered) this.lines$?.observe(rendered);
    this.observed = rendered;
    if (!rendered) this.place();
  }

  /** TGR-10: each member's box is watched while it is here: a member that changes its size moves the others. */
  private watchMembers() {
    for (const member of this.sized) {
      if (member.parentNode === this) continue;
      this.lines$?.unobserve(member);
      this.sized.delete(member);
    }
    for (const member of this.children) {
      if (this.sized.has(member)) continue;
      this.lines$?.observe(member);
      this.sized.add(member);
    }
  }

  /** TGR-10, MOT-3: no member moves while the group draws its first frames. */
  private readonly settle = new Settle(this);

  /** TGR-10: where each member was laid out at the last look. */
  private places = new Map<Element, Place>();
  /**
   * TGR-10, TGR-14, TGR-16: what laid the members out at the last look besides themselves — the list's direction and its
   * two gaps — and its width. When one of them has changed, every member is placed at once: the width not when a member
   * came or went (a group as wide as its content changes its width with them).
   */
  private placedBy = '';
  private placedWidth = -1;
  /** TGR-10: the motion moving each member to its place, and how far from it the member set out. */
  private readonly moves = new Map<Element, { motion: Animation; x: number; y: number }>();

  /** TGR-10: how far a member's move draws it from where it is laid out, now. */
  private shownOffset(member: Element): { x: number; y: number } {
    const move = this.moves.get(member);
    const progress = move?.motion.effect?.getComputedTiming().progress;
    if (!move || progress === null || progress === undefined) return { x: 0, y: 0 };
    return { x: move.x * (1 - progress), y: move.y * (1 - progress) };
  }

  /** TGR-10: the time and the curve of a move, as the cascade computes them on the list, which carries them (tag-group.styles.ts). */
  private moveTiming(): { duration: number; easing: string } {
    const carrier = this.observed;
    if (!carrier) return { duration: 0, easing: 'ease' };
    const style = getComputedStyle(carrier);
    const duration = Number.parseFloat(style.transitionDuration) * 1000;
    return { duration: duration > 0 ? duration : 0, easing: style.transitionTimingFunction.split(/,(?![^(]*\))/)[0].trim() || 'ease' };
  }

  /** TGR-10: the moves end, each member where it is laid out — all of them, or those `keep` does not keep. */
  private stopMoves(keep: (member: Element) => boolean = () => false) {
    for (const [member, move] of this.moves) {
      if (keep(member)) continue;
      move.motion.cancel();
      this.moves.delete(member);
    }
  }

  /**
   * TGR-5, TGR-10: where the members are laid out now, without their moves, gathered into lines. The group wraps while
   * there is more than one (the custom state `wrapped`, which the styles read). Then each member that was here, stands
   * somewhere else, and is not carried — a line that holds the same members in the same order follows its members'
   * sizes at once — moves from where it is drawn to its new place: a change that comes during a move takes the member
   * on from where it is. A member that came appears at once; one that left is gone. At a new width, direction or gap
   * (TGR-14, TGR-16), while the first frames are drawn, while a font face is loading and where motion is reduced,
   * everything is placed at once.
   */
  private place(byMembers = false) {
    const list = this.observed;
    if (!list || !this.isConnected) {
      this.stopMoves();
      this.places = new Map();
      this.placedBy = '';
      this.placedWidth = -1;
      this.wrap(false);
      return;
    }
    const origin = list.getBoundingClientRect();
    const laid: { member: Element; x: number; y: number; bottom: number; shown: { x: number; y: number } }[] = [];
    for (const member of this.children) {
      const box = member.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      const shown = this.shownOffset(member);
      const y = box.top - origin.top - shown.y;
      laid.push({ member, x: box.left - origin.left - shown.x, y, bottom: y + box.height, shown });
    }
    // A member starts a line when it stands wholly below the line before (TGR-1: each is centred on its line's middle).
    const lines: Element[][] = [];
    let bottom = Number.NEGATIVE_INFINITY;
    for (const one of laid) {
      if (!lines.length || one.y >= bottom - 0.5) {
        lines.push([one.member]);
        bottom = one.bottom;
      } else {
        lines[lines.length - 1]!.push(one.member);
        bottom = Math.max(bottom, one.bottom);
      }
    }
    this.wrap(lines.length > 1);
    const lineOf = new Map(lines.flatMap((line) => line.map((member) => [member, line] as const)));
    const before = this.places;
    const style = getComputedStyle(list);
    const by = [style.direction, style.columnGap, style.rowGap].join(' ');
    const relaid = by !== this.placedBy || (!byMembers && Math.abs(origin.width - this.placedWidth) >= 0.5);
    this.places = new Map(laid.map((one) => [one.member, { x: one.x, y: one.y, line: lineOf.get(one.member)! }]));
    this.placedBy = by;
    this.placedWidth = origin.width;
    const { duration, easing } = this.moveTiming();
    // A face that arrives while the page loads resizes members without anyone's act: they are placed at once (MOT-1).
    const loading = typeof document !== 'undefined' && document.fonts?.status === 'loading';
    if (relaid || !before.size || !duration || loading || this.settle.settling || !documentPainted() || reducedMotion()) {
      this.stopMoves();
      return;
    }
    this.stopMoves((member) => this.places.has(member));
    for (const one of laid) {
      const was = before.get(one.member);
      if (!was || sameOrder(was.line, lineOf.get(one.member)!)) continue;
      const x = was.x + one.shown.x - one.x;
      const y = was.y + one.shown.y - one.y;
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;
      this.moves.get(one.member)?.motion.cancel();
      this.moves.delete(one.member);
      if (typeof one.member.animate !== 'function') continue;
      const frames = [{ translate: `${x}px ${y}px` }, { translate: '0px 0px' }];
      let motion: Animation;
      try {
        motion = one.member.animate(frames, { duration, easing, composite: 'add' });
      } catch {
        motion = one.member.animate(frames, { duration, easing: 'ease', composite: 'add' });
      }
      const move = { motion, x, y };
      this.moves.set(one.member, move);
      const done = () => {
        if (this.moves.get(one.member) === move) this.moves.delete(one.member);
      };
      motion.finished.then(done, done);
    }
  }

  /** TGR-5: whether the members stand on more than one line, kept as the custom state `wrapped`. */
  private wrap(wrapped: boolean) {
    try {
      if (wrapped) this.internals?.states.add('wrapped');
      else this.internals?.states.delete('wrapped');
    } catch {
      // A browser without custom states: the distance between two lines is not handed on (tag-group.styles.ts).
    }
  }

  /** TGR-9: which member has focus. The listeners are on the host: a member's events pass it, and the group handles none of them (TGR-6). */
  private readonly onFocusIn = (event: FocusEvent) => {
    this.focused = this.memberOf(event.target);
    // TGR-20, TGR-21: the chip that has focus is the set's stop.
    if (this.selecting && this.focused?.localName === CHIP) {
      this.stop = this.focused as HTMLElement;
      this.placeStop();
    }
  };

  /** TGR-17: the selection the group holds, or null while it holds none. */
  private get selecting(): 'single' | 'multiple' | null {
    return this.selection === 'single' || this.selection === 'multiple' ? this.selection : null;
  }

  /** The chips of the group, in the order given (TGR-3). */
  private get chips(): ChipLike[] {
    return [...this.children].filter((child): child is ChipLike => child.localName === CHIP);
  }

  /** TGR-17, TGR-18: the filter chips the selection holds — those with a value. */
  private get held(): ChipLike[] {
    return this.chips.filter((chip) => kindOf(chip) === FILTER && valueOf(chip) !== '');
  }

  /**
   * TGR-19: a person switched a filter chip the group holds. The chip has already switched its own `selected`; the
   * group takes the selection from it, puts the others right, stops the chip's `change` — this listener is the host's
   * first, added when the element was made — and fires its own. The group's own `change` passes.
   */
  private readonly onChange = (event: Event) => {
    const mode = this.selecting;
    if (!mode || event.target === this) return;
    const chip = event.target as ChipLike;
    if (chip.parentNode !== this || !this.held.includes(chip)) return;
    event.stopImmediatePropagation();
    const value = valueOf(chip);
    const on = !!(event as CustomEvent<{ selected?: boolean }>).detail?.selected;
    if (mode === 'single') this.value = on ? value : null;
    else {
      const rest = (this.values ?? []).filter((each) => each !== value);
      this.values = on ? [...rest, value] : rest;
    }
    this.select();
    const detail: TanreiTagGroupChangeDetail = mode === 'single' ? { value: this.value } : { values: [...this.values] };
    this.dispatchEvent(new CustomEvent<TanreiTagGroupChangeDetail>('change', { bubbles: true, detail }));
  };

  /**
   * TGR-20: the keys among the chips while the group holds a selection. Each arrow moves the way it points; Home and
   * End go to the ends; nothing is switched or removed here, and focus does not wrap. Up and Down do nothing: the
   * chips are one row in their order. Space, Enter, Backspace and Delete are the chip's own.
   */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.selecting || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const chip = this.memberOf(event.target);
    if (!chip || chip.localName !== CHIP) return;
    const chips = this.chips;
    const at = chips.indexOf(chip as ChipLike);
    const rtl = getComputedStyle(this).direction === 'rtl';
    let candidates: ChipLike[];
    switch (event.key) {
      case rtl ? 'ArrowLeft' : 'ArrowRight':
        candidates = chips.slice(at + 1);
        break;
      case rtl ? 'ArrowRight' : 'ArrowLeft':
        candidates = chips.slice(0, at).reverse();
        break;
      case 'Home':
        candidates = chips;
        break;
      case 'End':
        candidates = [...chips].reverse();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        return;
      default:
        return;
    }
    event.preventDefault();
    this.focusFirst(candidates.filter(takesFocus));
  };

  /**
   * TGR-17: each filter chip the group holds shows the group's selection — on while `value` is its value (single) or
   * `values` holds it (multiple). Chips that share a value go on and off together (TGR-18). Then the stop (TGR-20).
   */
  private select() {
    const mode = this.selecting;
    if (mode) {
      const chosen = new Set(mode === 'multiple' ? (this.values ?? []) : this.value === null || this.value === undefined ? [] : [this.value]);
      for (const chip of this.held) {
        const on = chosen.has(valueOf(chip));
        if (chip.selected !== on) chip.selected = on;
      }
    }
    this.placeStop();
  }

  /**
   * TGR-20, TGR-21: while the group holds a selection the set is one stop — the chip that last had focus while it is
   * here and takes focus, else the first filter chip that is on, else the first chip that takes focus — and every other
   * chip is out of the Tab order: a host that delegates focus with a negative tabindex takes its shadow root with it,
   * remove action and all. A chip that has a tabindex of its own keeps it. Without a selection every chip has its stop
   * back (TGR-6).
   */
  private placeStop() {
    const chips = this.chips;
    for (const chip of this.unstopped) {
      if (chip.parentNode === this && this.selecting) continue;
      if (chip.getAttribute('tabindex') === '-1') chip.removeAttribute('tabindex');
      this.unstopped.delete(chip);
    }
    if (!this.selecting) return;
    const focusable = chips.filter(takesFocus);
    const stop =
      (this.stop && focusable.includes(this.stop) ? this.stop : null) ??
      focusable.find((chip) => kindOf(chip) === FILTER && chip.selected && valueOf(chip) !== '') ??
      focusable[0] ??
      null;
    for (const chip of chips) {
      if (chip === stop) {
        if (this.unstopped.delete(chip) && chip.getAttribute('tabindex') === '-1') chip.removeAttribute('tabindex');
      } else if (!this.unstopped.has(chip) && !chip.hasAttribute('tabindex')) {
        chip.setAttribute('tabindex', '-1');
        this.unstopped.add(chip);
      }
    }
  }

  /**
   * TGR-9: focus that leaves a member which is still here has gone elsewhere, by the person's doing. An engine that
   * says so while it removes the focused element says it of a member that is no longer here: that one is the
   * observer's to follow, so it is kept.
   */
  private readonly onFocusOut = (event: FocusEvent) => {
    const member = this.memberOf(event.target);
    if (!member) return;
    queueMicrotask(() => {
      if (this.focused === member && member.parentNode === this && !holdsFocus(member)) this.focused = null;
    });
  };

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true });
    this.members$.observe(this, { subtree: true, attributes: true, attributeFilter: ['value', 'kind', 'disabled'] });
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focusout', this.onFocusOut);
    // A group put back in the page — or upgraded after its members — reads them again.
    this.read();
    this.select();
    this.watchMembers();
    if (this.hasUpdated) this.watchLines();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.members$.disconnect();
    this.lines$?.disconnect();
    this.observed = null;
    this.sized.clear();
    this.stopMoves();
    this.places = new Map();
    this.placedBy = '';
    this.placedWidth = -1;
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    this.removeEventListener('keydown', this.onKeyDown);
    this.focused = null;
  }

  constructor() {
    super();
    // TGR-19: the host's first listener for `change`, so that the chip's own stops before any of the product's.
    this.addEventListener('change', this.onChange);
  }

  /** The child of the group that `target` is, or is inside. */
  private memberOf(target: EventTarget | null): Element | null {
    let node = target instanceof Node ? target : null;
    while (node && node.parentNode !== this) node = node.parentNode;
    return node instanceof Element ? node : null;
  }

  /** TGR-3, TGR-7, TGR-8, TGR-10: who is in the group now. */
  private read() {
    const content = [...this.childNodes].filter(isContent);
    if (sameOrder(content, this.content) && this.hasUpdated) return;
    this.content = content;
    const members = content.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
    // TGR-7: each member is an item of the list while it is here; one that left is what it was.
    for (const member of this.given) {
      if (member.parentNode === this) continue;
      this.given.delete(member);
      if (member.getAttribute('role') === ITEM_ROLE) member.removeAttribute('role');
    }
    for (const member of members) {
      if (this.given.has(member) || !takesItemRole(member)) continue;
      member.setAttribute('role', ITEM_ROLE);
      this.given.add(member);
    }
    // TGR-8: no member, no list, no space — at once, before the next frame.
    this.empty = content.length === 0;
    try {
      if (this.empty) this.internals?.states.add('empty');
      else this.internals?.states.delete('empty');
    } catch {
      // A browser without custom states: the empty group is an empty block.
    }
    if (this.isConnected) this.watchMembers();
    this.check(members);
  }

  /** TGR-4, TGR-11: what a debug build is told. The group renders either way. An empty group is told nothing (TGR-8). */
  private check(members: Element[] = this.content.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE)) {
    // TGR-4: lines of tags stand closer than a chip's touch target is high.
    if (this.spacing === TAGS && members.some((member) => member.localName === CHIP)) {
      report(this, 'TGR-4', 'it holds a <tanrei-chip> while spacing is "tags"; a set of chips wants spacing="chips", whose lines stand far enough apart for each chip\'s touch target');
    }
    // TGR-11: anything else is laid out and exposed with the others.
    for (const node of this.content) {
      if (isText(node)) report(this, 'TGR-11', 'it holds text of its own, which is laid out as a member but cannot be an item of the list; put it in a <tanrei-tag>');
      else if (!MEMBERS.includes((node as Element).localName)) {
        const name = (node as Element).localName;
        const item = this.given.has(node as Element) ? 'it is laid out and exposed as an item' : 'it is laid out, but keeps its own role and is not an item of the list — wrap it in a <span>';
        report(this, 'TGR-11', `it holds <${name}>, which is not a <tanrei-tag> or a <tanrei-chip>; ${item}`);
      }
    }
    // TGR-17: a selection the group does not have is none.
    if (!SELECTIONS.includes(this.selection)) report(this, 'TGR-17', `selection "${this.selection}" is not none, single or multiple; the group holds no selection`);
    if (!this.selecting || !members.length) return;
    // TGR-18: a filter chip without a value is left out; two with one value are one.
    const seen = new Set<string>();
    for (const chip of this.chips) {
      if (kindOf(chip) !== FILTER) continue;
      const value = valueOf(chip);
      if (!value) report(this, 'TGR-18', `the filter chip "${chip.getAttribute('label') ?? ''}" has no value, so the selection leaves it out; give each filter chip a value`);
      else if (seen.has(value)) report(this, 'TGR-18', `two filter chips have the value "${value}"; they go on and off together — give each its own value`);
      seen.add(value);
    }
  }

  /**
   * TGR-9: a member left while focus was on it — on a chip or on its remove action — and focus is now nowhere: it goes
   * on to the chip that followed, or to the one before where none follows; a member that takes no focus (a tag, a
   * disabled chip) is passed. A member that was only moved inside the group keeps focus (TGR-10). Where the product
   * has already put focus somewhere, or nothing here takes it, the group does nothing.
   */
  private afterLeave(before: readonly Node[], records: MutationRecord[]) {
    const held = this.focused;
    if (!held || !records.some((record) => [...record.removedNodes].includes(held))) return;
    const active = this.ownerDocument.activeElement;
    const nowhere = !active || active === this.ownerDocument.body || active === this.ownerDocument.documentElement;
    if (!nowhere) {
      if (!holdsFocus(held)) this.focused = null;
      return;
    }
    if (held.parentNode === this) {
      if (held instanceof HTMLElement) this.focusFirst([held]);
      return;
    }
    this.focused = null;
    const here = (node: Node) => node.parentNode === this;
    const at = before.indexOf(held);
    // The members that were its neighbours, the following ones first. A product that writes the whole set again leaves
    // none of them: the member that now stands where it stood is the one that followed it.
    const order = before.some(here) ? [...before.slice(at + 1), ...before.slice(0, at).reverse()] : [...this.content.slice(at), ...this.content.slice(0, at).reverse()];
    const candidates = order.filter((node): node is HTMLElement => node instanceof HTMLElement && here(node));
    if (this.focusFirst(candidates)) return;
    // A chip that was written a moment ago has no button to focus until it has rendered.
    const pending = candidates.map((candidate) => (candidate as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete).filter((promise) => !!promise);
    if (!pending.length) return;
    void Promise.all(pending).then(() => {
      const now = this.ownerDocument.activeElement;
      if (this.isConnected && (!now || now === this.ownerDocument.body)) this.focusFirst(candidates.filter(here));
    });
  }

  /**
   * Focus on the first of `candidates` that takes it. A chip takes it on its own control — its button or its link,
   * the first thing in it that can be focused — and never on its remove action, which comes after it and is not a Tab
   * stop (CHP-18).
   */
  private focusFirst(candidates: readonly HTMLElement[]): boolean {
    for (const candidate of candidates) {
      candidate.focus();
      if (holdsFocus(candidate)) {
        this.focused = candidate;
        return true;
      }
    }
    return false;
  }

  protected override updated(changed: PropertyValues<this>) {
    this.watchLines();
    // TGR-4: a set of chips under `tags` is reported when the spacing says so too, not only when a chip arrives.
    if (changed.has('spacing')) this.check();
    // TGR-17, TGR-20: the chips show the selection the group now holds, and the set has its stop. Nothing is fired.
    if (changed.has('selection') || changed.has('value') || changed.has('values')) {
      this.select();
      if (changed.has('selection')) this.check();
    }
  }

  protected override render() {
    // TGR-8: no member, nothing — no empty list and no name.
    if (this.empty) return nothing;
    // TGR-7: one list, named by the label where there is one, around the members where they stand. The host has no role.
    return html`<div class="list" role="list" aria-label=${this.label || nothing}><slot></slot></div>`;
  }
}

if (!customElements.get('tanrei-tag-group')) customElements.define('tanrei-tag-group', TanreiTagGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tag-group': TanreiTagGroup;
  }
}
