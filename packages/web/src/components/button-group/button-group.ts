import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  ACTION_COLUMN,
  ACTION_ROW,
  ActionPlacement,
  AvailabilityController,
  GROUP_ITEM,
  GROUP_PLACE,
  type GroupItem,
  type GroupPlace,
  type PlacingGroup,
  SEPARATION_VALUES,
  type SeparationProp,
  SystemWatchController,
  assignSlot,
  hostAria,
  report,
  syncSeparation,
} from '../../primitives/index.js';
import { styles } from './button-group.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** How the buttons are laid out: spaced apart, or joined into one shape. A closed set (the two differ in structure). */
export type TanreiButtonGroupVariant = 'standard' | 'connected';
/** One row, or one column. */
export type TanreiButtonGroupOrientation = 'horizontal' | 'vertical';
/** How a connected group is joined: `auto` takes the design system's answer, `divider` and `gap` say it for this group. */
export type TanreiButtonGroupSeparation = SeparationProp;

const VARIANTS: readonly TanreiButtonGroupVariant[] = ['standard', 'connected'];
const ORIENTATIONS: readonly TanreiButtonGroupOrientation[] = ['horizontal', 'vertical'];
/** The elements a group places (BGR-10): the Tanrei Button. */
const ITEMS = ['tanrei-button'];

const sameOrder = (a: readonly Element[], b: readonly Element[]) => a.length === b.length && a.every((element, i) => element === b[i]);

/** BGR-24: what of an item decides the fill it rests on — the attributes a Button reflects them to. */
const LOOK_ATTRIBUTES = ['variant', 'toggle', 'selected'];
/** BGR-24: the variants whose selected toggle rests on an emphasis fill (a text toggle has no fill, selected or not). */
const EMPHASIS_WHEN_SELECTED: readonly string[] = ['filled', 'tonal', 'elevated', 'outlined'];
/** A Button's default variant: what one without the attribute draws, and what a variant the system lacks falls back to. */
const DEFAULT_ITEM_VARIANT = 'filled';
/** BGR-24: what a seam carries — no line, the line, or the line between two emphasis fills. */
type SeamLine = 'none' | 'line' | 'on-fill';
/** A container without a fill: two of them rest on the same (BGR-24). */
const NO_FILL = 'none';

/** Whether a computed color draws nothing: its alpha is zero (`rgba(…, 0)`, or `… / 0)` in the other notations). */
const clear = (color: string) => /^rgba\(.*,\s*0(\.0+)?\s*\)$/.test(color) || /\/\s*0(\.0+)?%?\s*\)$/.test(color);

/**
 * Lays out a few related Buttons in one row or one column, spaced apart or joined into one shape, places the confirming
 * and the dismissive ones by the orientation, and names them as a group.
 *
 * Contract: specs/button-group.spec.json. Every value it reads is a `--tanrei-comp-button-group-*` token: the gap of each
 * variant, the connected corners, the divider and the padding at a joined row's outer ends. Its items are
 * `<tanrei-button>` children, labelled or icon-only, each drawn from its own tokens, with its own states, events,
 * semantics and Tab stop (BGR-5). The group takes no focus, handles no key and keeps no selection; a toggle Button in it
 * stays independent. It draws nothing of its own but the dividers of a connected group.
 *
 * Order (BGR-13, BGR-14): a child with the `confirming` attribute (OK, Save, Next, Delete) is placed at the end of a row
 * and at the top of a column; one with `dismissive` (Cancel, Back) at the start of a row and at the bottom of a column;
 * the others between them, each run in the order given. The children are not moved in your DOM: each is assigned to a
 * slot of its own, in the placed order, so focus and assistive technology follow that order (BGR-15).
 *
 * In a connected group the items are joined as `separation` names (BGR-21): under `divider` they touch, with square
 * corners where they meet, and no item draws its outline or its elevation's ring along a seam; a seam carries a line
 * only while the two items it joins rest on the same fill (BGR-24) — between a selected toggle and an unselected one the
 * edge of the fill already marks it — in `connected.divider.color`, or `connected.divider.on-fill.color` between two
 * emphasis fills (filled Buttons, selected toggles);
 * under `gap` they stand `connected.gap` apart with `connected.inner-shape` corners. `auto` — the default — takes
 * `comp.button-group.connected.separation`, which follows the design system's `sys.behavior.separation`. The group
 * gives its items their corners, minimum size, seams and outer padding through custom properties the items read
 * (`--tanrei-group-*`): an internal contract between Tanrei elements, not a styling API.
 *
 * @tag tanrei-button-group
 * @slot - The items: `<tanrei-button>` elements, with `confirming` or `dismissive` on the ones the group should place. Anything else is still laid out, and reported in debug builds (BGR-10).
 * @csspart divider - The line on a seam of a connected group under `divider` (decoration: not exposed, takes no press). A seam between two items that rest on different fills carries none (BGR-24).
 */
export class TanreiButtonGroup extends TanreiElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'button-group');
  static override styles = styles;

  // The items are assigned by hand, each to a slot of its own in the placed order (BGR-15), with the dividers between
  // the slots (BGR-22).
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    variant: { type: String, reflect: true },
    orientation: { type: String, reflect: true },
    separation: { type: String, reflect: true },
    fullWidth: { type: Boolean, reflect: true, attribute: 'full-width' },
    label: { type: String },
    placed: { state: true },
  };

  /**
   * `standard` spaces the buttons apart; `connected` joins them into one shape with rounded outer ends, by a divider or
   * by a narrow gap (`separation`), for a closely related set (Bold, Italic, Underline; Previous, Today, Next).
   * Anything else is drawn as `standard` (reported in debug builds, BGR-9).
   */
  variant: TanreiButtonGroupVariant = 'standard';

  /**
   * `horizontal` lays the buttons out in one row; `vertical` stacks them in one column, every button as wide as the
   * column. The confirming and dismissive buttons change places with it (BGR-13, BGR-14). Anything else is drawn as
   * `horizontal` (reported in debug builds, BGR-9).
   */
  orientation: TanreiButtonGroupOrientation = 'horizontal';

  /**
   * How a connected group is joined. `divider`: the buttons touch, and a line is drawn on each seam. `gap`: they stand a
   * narrow gap apart, with tighter corners where they face each other. `auto` takes
   * `comp.button-group.connected.separation`, the design system's answer (divider in the default system). Ignored
   * while `variant` is `standard`. Anything else is `auto` (reported in debug builds, BGR-9).
   */
  separation: TanreiButtonGroupSeparation = 'auto';

  /**
   * The group fills its container's width and its buttons share it equally (in a column, each is the container's
   * width): the `full-width` attribute. For the actions at the foot of a dialog, a picker or a side sheet.
   */
  fullWidth = false;

  /**
   * The group's accessible name ("Text style"). When it is set the group is a `role="group"` named by it; when it is
   * empty the group adds nothing to the accessibility tree, only its items (BGR-6).
   */
  label = '';

  /** The children in the placed order (BGR-13, BGR-14): one slot each. */
  protected placed: Element[] = [];

  /** BGR-13, BGR-14, BGR-18: the children by run, as a dialog's and a side sheet's actions are read (src/primitives/actions.ts). */
  private readonly placement = new ActionPlacement(this);

  /** BGR-21: where a browser has no style queries, the separation is read when the group renders — again when the system is switched. */
  private readonly system = new SystemWatchController(this);

  /**
   * BGR-11: a child that comes or goes, or whose `confirming` or `dismissive` changes, is placed again at once. BGR-24:
   * one whose `selected`, `toggle` or `variant` changes has the lines beside it drawn again at once — in the same
   * frame: the observer runs before the next one is drawn.
   */
  private readonly children$ = new MutationObserver((records) => {
    const own = records.filter((record) => record.target === this || (record.type === 'attributes' && (record.target as Element).parentElement === this));
    if (own.some((record) => record.type !== 'attributes' || !LOOK_ATTRIBUTES.includes(record.attributeName ?? ''))) this.read();
    else if (own.length) this.drawSeams();
  });

  private fit: ResizeObserver | null = null;

  /** The variant it draws: an unknown one is standard (BGR-9). */
  private get drawn(): TanreiButtonGroupVariant {
    return VARIANTS.includes(this.variant) ? this.variant : 'standard';
  }

  /** Whether it is a column: an unknown orientation is horizontal (BGR-9). */
  private get vertical(): boolean {
    return this.orientation === 'vertical';
  }

  /** @internal Where the group places one of its children (src/primitives/group-item.ts); null for anything else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    if (child.parentElement !== this) return null;
    const order = this.order();
    return {
      variant: this.drawn,
      first: child === order[0],
      last: child === order[order.length - 1],
      axis: this.vertical ? 'block' : 'inline',
      stretch: this.vertical || this.fullWidth,
    };
  }

  /** BGR-13, BGR-14: the three runs in the order of the orientation, each in the order its items were given. */
  private order(): Element[] {
    return (this.vertical ? ACTION_COLUMN : ACTION_ROW).flatMap((run) => this.placement.runs[run]);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['confirming', 'dismissive', ...LOOK_ATTRIBUTES] });
    // A group put back in the page — or upgraded after its items — reads them and tells them where they are again.
    this.read();
    // BGR-7, BGR-17: a row that does not fit, or cannot be shared equally, is reported in debug builds.
    this.fit ??= new ResizeObserver(() => this.checkFit());
    this.fit.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.fit?.disconnect();
  }

  /** BGR-11: the children are read into their runs and placed again — when they change, and when the orientation does. */
  private read() {
    this.placement.read([...this.children]);
    const order = this.order();
    if (!sameOrder(order, this.placed)) this.placed = order;
    this.place();
    this.checkContent();
    requestAnimationFrame(() => this.checkFit());
  }

  /** BGR-1…4, BGR-11: every item is told its place at once. */
  private place() {
    for (const child of this.children) (child as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(this[GROUP_PLACE](child));
  }

  /**
   * BGR-24: the fill an item rests on, and whether it is an emphasis fill. The color is the one the Button renders its
   * container from at rest — `comp.button.<variant>.container.color`, and for a toggle the selected or the unselected
   * part of its variant (BTN-15) — read from the cascade where the item stands and resolved by the probe, so that two
   * tokens of one color in the active scheme are the same fill and a container that draws no fill is `none`. It is the
   * resting color whatever state the item is in, and the enabled one while it is disabled: hover, focus, press and
   * disabling move no line. Anything that is not a Button has no fill the group knows.
   */
  private restingFill(item: Element, probe: HTMLElement): { fill: string; emphasis: boolean } {
    if (!ITEMS.includes(item.localName)) return { fill: NO_FILL, emphasis: false };
    // The element's own properties once it is defined; its attributes until then (the Button reflects all three).
    const own = item as Element & { variant?: string; toggle?: boolean; selected?: boolean };
    const variant = own.variant ?? item.getAttribute('variant') ?? DEFAULT_ITEM_VARIANT;
    const toggle = own.toggle ?? item.hasAttribute('toggle');
    const selected = toggle && (own.selected ?? item.hasAttribute('selected'));
    const style = getComputedStyle(item);
    const look = toggle ? (selected ? 'selected-' : 'unselected-') : '';
    const token = (name: string) => style.getPropertyValue(`--tanrei-comp-button-${name}-${look}container-color`).trim();
    // A variant the active system does not have is drawn from the default's tokens (BTN-7).
    const value = token(variant) || token(DEFAULT_ITEM_VARIANT);
    probe.style.color = '';
    probe.style.color = value;
    const color = value && probe.style.color ? getComputedStyle(probe).color : '';
    const emphasis = toggle ? selected && EMPHASIS_WHEN_SELECTED.includes(variant) : variant === DEFAULT_ITEM_VARIANT;
    return { fill: !color || clear(color) ? NO_FILL : color, emphasis };
  }

  /**
   * BGR-22, BGR-24: what each seam carries. A line only while the two items it joins rest on the same fill; in the
   * on-fill color while both rest on an emphasis fill. Written on the dividers at once (no render, no animation).
   */
  private drawSeams() {
    const probe = this.renderRoot?.querySelector<HTMLElement>('.probe');
    const dividers = this.renderRoot?.querySelectorAll<HTMLElement>('.divider');
    if (!probe || !dividers?.length) return;
    const rests = this.placed.map((item) => this.restingFill(item, probe));
    dividers.forEach((divider, i) => {
      const [before, after] = [rests[i], rests[i + 1]];
      const line: SeamLine = !before || !after || before.fill !== after.fill ? 'none' : before.emphasis && after.emphasis ? 'on-fill' : 'line';
      if (divider.dataset.line !== line) divider.dataset.line = line;
    });
  }

  /** BGR-10: fewer than two items, or content that is not a Tanrei Button, still renders and is reported. */
  private checkContent() {
    const children = [...this.children];
    const foreign = children.filter((child) => !ITEMS.includes(child.localName));
    if (children.length < 2) report(this, 'BGR-10', `it holds ${children.length} item${children.length === 1 ? '' : 's'}; a button group holds two or more`);
    for (const child of foreign) {
      report(this, 'BGR-10', `it holds <${child.localName}>, which is not a <tanrei-button>; it is laid out, but the group cannot set its corners or width`);
    }
  }

  private checkFit() {
    if (this.vertical || !this.isConnected) return;
    // The items' visible bounds, not the scroll width, which also counts the hit areas they extend past the row's ends.
    const boxes = [...this.children].map((child) => child.getBoundingClientRect()).filter((box) => box.width > 0);
    if (!boxes.length) return;
    const needed = Math.round(Math.max(...boxes.map((box) => box.right)) - Math.min(...boxes.map((box) => box.left)));
    const has = Math.round(this.getBoundingClientRect().width);
    if (needed > has) report(this, 'BGR-7', `the row needs ${needed} px but has ${has} px, even with its Buttons as narrow as their longest word; it overflows its end`);
    // BGR-17: an item that cannot be as narrow as its share keeps its minimum, and the others share the rest.
    else if (this.fullWidth && boxes.some((box) => Math.abs(box.width - boxes[0].width) > 0.5)) {
      report(this, 'BGR-17', 'the row cannot be shared equally: an item is wider than its share even at its minimum width, so it keeps that width and the others share the rest');
    }
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // BGR-13, BGR-14: the runs change places with the orientation.
    if (changed.has('orientation')) {
      const order = this.order();
      if (!sameOrder(order, this.placed)) this.placed = order;
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    // BGR-6: a named group only when it has a label; otherwise no element of its own in the accessibility tree.
    hostAria(this, { role: this.label ? 'group' : null, 'aria-label': this.label || null });
    // BGR-15: each child in the slot of its place, so the flat tree — what focus and assistive technology walk — is the
    // placed order. A child that stays in its slot is not assigned again.
    this.renderRoot.querySelectorAll<HTMLSlotElement>('slot').forEach((slot, i) => assignSlot(slot, this.placed[i] ? [this.placed[i]] : []));
    // BGR-9: an unknown value is drawn as the default (the styles match the defined values alone) and reported.
    if (changed.has('variant') && !VARIANTS.includes(this.variant)) report(this, 'BGR-9', `variant "${this.variant}" is not a value of the button group; it is drawn as "standard"`);
    if (changed.has('orientation') && !ORIENTATIONS.includes(this.orientation)) {
      report(this, 'BGR-9', `orientation "${this.orientation}" is not a value of the button group; it is drawn as "horizontal"`);
    }
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'BGR-9', `separation "${this.separation}" is not a value of the button group; it is drawn as "auto"`);
    }
    this.place();
    // BGR-24: the lines follow the items as they are placed now, and the colors the cascade gives now (a system or a
    // scheme switched on the root renders the group again: SystemWatchController).
    this.drawSeams();
    // BGR-21: without style queries, the name the cascade gives now is written for the styles to match.
    syncSeparation(this, this.renderRoot.querySelector<HTMLElement>('.row'));
    if (changed.has('orientation') || changed.has('fullWidth')) requestAnimationFrame(() => this.checkFit());
  }

  protected override render() {
    // BGR-22: under a divider a connected group draws one line on each seam — an element between two items' slots that
    // takes no space, no press and no place in the accessibility tree. Under a gap the styles draw none. BGR-24: which
    // seams carry it, and in which of the two colors, is written on each divider as data-line (drawSeams); the probe
    // is where a resting color is resolved, and is never drawn.
    const divided = this.drawn === 'connected';
    const last = this.placed.length - 1;
    return html`
      <div class="row">
        ${this.placed.map(
          (_, i) => html`${i > 0 && divided ? html`<span part="divider" class="divider" aria-hidden="true"></span>` : nothing}<slot class=${classMap({ first: i === 0, last: i === last })}></slot>`,
        )}
      </div>
      ${divided ? html`<span class="probe" aria-hidden="true"></span>` : nothing}
    `;
  }
}

if (!customElements.get('tanrei-button-group')) customElements.define('tanrei-button-group', TanreiButtonGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-button-group': TanreiButtonGroup;
  }
}
