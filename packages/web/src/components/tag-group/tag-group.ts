import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, OpenAxesController, report } from '../../primitives/index.js';
import type { TanreiTagGroupSpacingRegistry } from '../../registry.js';
import { AXES, DEFAULT_SPACING, styles } from './tag-group.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core spacings (tags, chips), plus any a design system's generated `.d.ts` registers. */
export type TanreiTagGroupSpacing = keyof TanreiTagGroupSpacingRegistry;

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

/**
 * Whether the group may give this member the list item role: it has no `role` of its own, and it is an element that
 * says nothing by itself — a custom element (a tag, a chip: their semantics are inside their shadow roots) or a `div`
 * or `span`. A native link, button or heading keeps what it is; the role would take it away.
 */
const takesItemRole = (member: Element) => !member.hasAttribute('role') && (member.localName.includes('-') || GENERIC.includes(member.localName));

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
 * their own tokens at their own size, with their own states, events, names and Tab stops (TGR-6). The group takes no
 * focus, handles no key, keeps no selection, does not make filter chips exclusive and fires no event.
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
 * It supplies no words: the name of the set is yours, in `label`.
 *
 * @tag tanrei-tag-group
 * @slot - The members: `<tanrei-tag>` and `<tanrei-chip>` elements. Anything else is still laid out, and reported in debug builds (TGR-11).
 */
export class TanreiTagGroup extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'tag-group');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    spacing: { type: String, reflect: true },
    label: { type: String },
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

  /** TGR-9: the member focus is on or inside, as the last `focusin` said. */
  private focused: Element | null = null;

  /**
   * TGR-10: a member that comes or goes is placed at once — the layout is the browser's, in the same frame; the group
   * reads who is there, gives and takes back the item role, and (TGR-9) sees a member leave while focus was on it.
   */
  private readonly children$ = new MutationObserver((records) => {
    const before = this.content;
    this.read();
    this.afterLeave(before, records);
  });

  /**
   * TGR-5: whether the members stand on more than one line, read when the list's box changes — a set that wraps, or
   * stops wrapping, changes its height — and kept as the custom state `wrapped`, which the styles read. Nothing is
   * measured at rest.
   */
  private readonly lines$ = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.readLines()) : null;
  private observed: Element | null = null;

  /** TGR-5: the list is watched while it is rendered (an empty group has none) and the group is in the page. */
  private watchLines() {
    const rendered = this.renderRoot?.querySelector('.list') ?? null;
    if (rendered === this.observed) return;
    if (this.observed) this.lines$?.unobserve(this.observed);
    if (rendered) this.lines$?.observe(rendered);
    else this.readLines();
    this.observed = rendered;
  }

  private readLines() {
    const boxes = [...this.children].map((child) => child.getBoundingClientRect()).filter((box) => box.width > 0 || box.height > 0);
    const first = boxes[0];
    // More than one line: some member stands wholly below the first.
    const wrapped = !!first && boxes.some((box) => box.top >= first.bottom);
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
  };

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
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    // A group put back in the page — or upgraded after its members — reads them again.
    this.read();
    if (this.hasUpdated) this.watchLines();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.lines$?.disconnect();
    this.observed = null;
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    this.focused = null;
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
