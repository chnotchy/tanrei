import { LitElement, type PropertyDeclarations, css, html, nothing } from 'lit';
import { GROUP_AVAILABILITY, GROUP_PLACE, type GroupPlace, type PlacingGroup, hostAria, parseValues, report } from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import { holdsProductName, nameHost, namedByProduct } from '../../primitives/delegated-aria.js';
import { spaceStyles } from './toolbar.styles.js';

/** Whether a group's toggle Buttons choose (TBR-28): one choice (`single`), a set of choices (`multiple`), or neither. */
export type TanreiToolbarGroupSelection = 'none' | 'single' | 'multiple';

/** What a group's `change` carries: its `value` and `values` after the change, which it already holds (TBR-28). */
export interface TanreiToolbarGroupChangeDetail {
  value: string;
  values: string[];
}

/** A toggle Button among a group's items: a member of its selection (TBR-28). */
type Member = HTMLElement & { toggle: boolean; selected: boolean; value: string };

/**
 * The internal channel between a toolbar and its groups (TBR-22): what the group draws between its items, which the
 * toolbar decides — which item is shown (TBR-18), which space is drawn, and how long its two neighbours are (TBR-16).
 * Not part of the public surface.
 */
export const TOOLBAR_GROUP = Symbol.for('tanrei.toolbar-group');

/** One element the group lays out in the toolbar's line: an item's slot, or the space before it. */
export interface ToolbarGroupUnit {
  kind: 'item' | 'space';
  /** The element of the group's shadow root that stands in the line (the slot, or the space). */
  node: HTMLElement;
  /** For an item: the product's element in the slot. */
  item?: Element;
}

export interface ToolbarGroupChannel {
  /** The group's items, each preceded — from the second on — by a space, in reading order. */
  units(): ToolbarGroupUnit[];
  /** The menus anchored to an item, which the group holds out of the line (TBR-24). */
  menus(): Element[];
  /** TBR-28, BTN-47: whether one of its items is one choice of its single selection. */
  choice(child: Element): boolean;
}

/** What a toolbar is told by a group whose children changed. */
export const TOOLBAR_CHILDREN = Symbol.for('tanrei.toolbar-children');

/**
 * A run of related items in a toolbar (Bold, Italic, Underline), optionally named. It draws nothing of its own: its items
 * are laid out in the toolbar's line as the toolbar's items, and the toolbar sets the group apart from what is next to it
 * as its separation says (TBR-22, TBR-23).
 *
 * Contract: specs/toolbar.spec.json (the item kind `group`). The host is `display: contents`; with a `label` it is a
 * group named by it (`role="group"`, `aria-label`), and without one it is nothing to assistive technology: its items are
 * the toolbar's. The items are each in a slot of their own (manual slot assignment), so that the toolbar can leave one
 * out when it has no room for it (TBR-18) and draw the space between two of them (TBR-16).
 *
 * With `selection`, its toggle Buttons — each with a `value` — choose (TBR-28): `single` makes them one choice, the host
 * a radio group and each member a radio button (BTN-47); `multiple` keeps them toggles whose selected values the group
 * holds. The group holds `value` or `values`, selects its members from them, and fires one `change` of its own for each
 * choice a person makes; a member's own `change` stops at the group. The arrow keys only move focus.
 *
 * @tag tanrei-toolbar-group
 * @slot - The group's items: `<tanrei-button>` and `<tanrei-button-with-menu>` elements, and a `<tanrei-menu anchor>`
 * anchored to one of them, which is not laid out. In a selection group, `<tanrei-button toggle value>` members.
 * @fires {CustomEvent<TanreiToolbarGroupChangeDetail>} change - A person changed the selection of a group whose `selection` is `single` or `multiple`: `detail.value` and `detail.values` after the change, which the group already holds. Never fired when the product sets them.
 */
export class TanreiToolbarGroup extends TanreiElement implements PlacingGroup {
  static override styles = [
    spaceStyles,
    css`
      :host {
        display: contents;
      }
      :host([hidden]) {
        display: none;
      }
      ::slotted(*) {
        flex: none;
      }
      .menus {
        position: absolute;
        inline-size: 0;
        block-size: 0;
      }
    `,
  ];

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    selection: { type: String, reflect: true },
    value: { type: String },
    values: { attribute: 'values', converter: { fromAttribute: parseValues } },
    laid: { state: true },
  };

  /** Names the group for assistive technology ("Text style"). Never drawn. Empty: the group is not exposed. */
  label = '';

  /**
   * Whether the group's toggle Buttons choose (TBR-28): `none` (the default) leaves each toggle on its own; `single`
   * makes them one choice, exposed as a radio group (text alignment); `multiple` keeps them toggles whose selected
   * values the group holds (formatting). For tools that act on the content: a choice between views, or of one option
   * among a few that is not a tool, is `<tanrei-tabs>`. Anything else is `none`.
   */
  selection: TanreiToolbarGroupSelection = 'none';

  /** The value of the selected member (its Button's `value`) while `selection` is `single`; empty selects none. */
  value = '';

  /**
   * The values of the selected members while `selection` is `multiple`, in reading order. The attribute is a JSON array
   * or whitespace-separated values; assign a new array to change it.
   */
  values: string[] = [];

  /** The children laid out in the line, in order (the anchored menus are not). */
  private laid: Element[] = [];
  private held: Element[] = [];
  private readonly children$ = new MutationObserver(() => this.readChildren());

  constructor() {
    super();
    this.addEventListener('change', this.onMemberChange);
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, attributes: true, attributeFilter: ['anchor', 'toggle', 'value'], subtree: true });
    this.readChildren();
  }

  // ── The selection (TBR-28) ──

  /** The selection it makes: `single` or `multiple` by name; anything else is none. */
  private get mode(): 'single' | 'multiple' | null {
    return this.selection === 'single' || this.selection === 'multiple' ? this.selection : null;
  }

  /** TBR-28: its members — the toggle Buttons among its items, in reading order. */
  private members(): Member[] {
    return this.laid.filter((child): child is Member => child.localName === 'tanrei-button' && !!(child as Member).toggle);
  }

  /**
   * TBR-28: each member's selected state from the group — single: exactly the member whose value is the group's value;
   * multiple: each member whose value the group's values hold. Setting it fires nothing (a toggle's change is a person's).
   */
  private syncMembers() {
    const mode = this.mode;
    if (!mode) return;
    const held = mode === 'single' ? (this.value ? [this.value] : []) : (this.values ?? []);
    for (const member of this.members()) {
      const on = member.value !== '' && held.includes(member.value);
      if (member.selected !== on) member.selected = on;
    }
  }

  /**
   * TBR-28: a member a person switched. Its own change stops at the group, which holds the choice and fires one change
   * of its own: single — the member is now the one selected, every other member unselected; multiple — the values of
   * the members selected now, in reading order.
   */
  private readonly onMemberChange = (event: Event) => {
    const mode = this.mode;
    if (!mode || event.target === this) return;
    const member = this.members().find((each) => each === event.target);
    if (!member) return;
    event.stopPropagation();
    if (mode === 'single') {
      // A member switched off before the toolbar placed it as a choice: the group's value still selects it.
      if (!member.selected) {
        this.syncMembers();
        return;
      }
      this.value = member.value;
      for (const other of this.members()) if (other !== member && other.selected) other.selected = false;
    } else {
      this.values = this.members()
        .filter((each) => each.selected && each.value !== '')
        .map((each) => each.value);
    }
    const detail: TanreiToolbarGroupChangeDetail = { value: this.value, values: [...(this.values ?? [])] };
    this.dispatchEvent(new CustomEvent<TanreiToolbarGroupChangeDetail>('change', { bubbles: true, detail }));
  };

  /** TBR-28: what a selection group holds that cannot be one of its members, reported in debug builds. */
  private checkMembers() {
    const mode = this.mode;
    if (this.selection !== 'none' && !mode) report(this, 'TBR-28', `selection "${this.selection}" is not a value of the toolbar group; it is drawn as "none"`);
    if (!mode) return;
    const seen = new Set<string>();
    for (const child of this.laid) {
      if (child.localName === 'tanrei-menu') continue;
      if (child.localName !== 'tanrei-button' || !(child as Member).toggle) {
        report(this, 'TBR-28', `a group whose selection is ${mode} holds <${child.localName}>${child.localName === 'tanrei-button' ? ' without toggle' : ''}, which cannot be one of its choices; it is laid out as it is`);
        continue;
      }
      const value = (child as Member).value;
      if (!value) report(this, 'TBR-28', `a member of a group whose selection is ${mode} has no value, so the group cannot hold it; give each member a value of its own`);
      else if (seen.has(value)) report(this, 'TBR-28', `two members of a group whose selection is ${mode} have the value "${value}"; give each member a value of its own`);
      seen.add(value);
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
  }

  /** A menu whose anchor is one of the group's or the toolbar's items: held out of the line (TBR-24). */
  private isAnchoredMenu(child: Element) {
    if (child.localName !== 'tanrei-menu') return false;
    const anchor = child.getAttribute('anchor');
    if (!anchor) return false;
    const toolbar = this.parentElement;
    const scope = toolbar ?? this;
    return [...scope.querySelectorAll(`[id="${CSS.escape(anchor)}"]`)].some((element) => element !== child);
  }

  private readChildren() {
    const children = [...this.children];
    const held = children.filter((child) => this.isAnchoredMenu(child));
    const laid = children.filter((child) => !held.includes(child));
    const same = (a: Element[], b: Element[]) => a.length === b.length && a.every((element, i) => element === b[i]);
    if (!same(laid, this.laid) || !same(held, this.held)) {
      this.laid = laid;
      this.held = held;
    }
    // TBR-28: a member that arrived, left, or changed its value or toggle is selected from the group again.
    this.requestUpdate();
    // The toolbar decides again what it shows, and how (TBR-18, TBR-22).
    (this.parentElement as (HTMLElement & { [TOOLBAR_CHILDREN]?: () => void }) | null)?.[TOOLBAR_CHILDREN]?.();
  }

  /** @internal TBR-22: what the toolbar lays out of this group. */
  [TOOLBAR_GROUP]: ToolbarGroupChannel = {
    units: () => {
      const units: ToolbarGroupUnit[] = [];
      const nodes = [...(this.renderRoot?.querySelectorAll<HTMLElement>('slot.unit, .space') ?? [])];
      let n = 0;
      for (const node of nodes) {
        if (node.classList.contains('space')) units.push({ kind: 'space', node });
        else units.push({ kind: 'item', node, item: this.laid[n++] });
      }
      return units;
    },
    menus: () => this.held,
    choice: (child) => this.mode === 'single' && this.members().includes(child as Member),
  };

  /** @internal TBR-9: where the toolbar places one of the group's items. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    if (child.parentElement !== this) return null;
    return (this.parentElement as (HTMLElement & Partial<PlacingGroup>) | null)?.[GROUP_PLACE]?.(child) ?? null;
  }

  /** @internal TBR-10: an item was disabled or enabled by the platform: the toolbar reads its Tab stop again. */
  [GROUP_AVAILABILITY](child: Element) {
    if (child.parentElement === this) (this.parentElement as (HTMLElement & Partial<PlacingGroup>) | null)?.[GROUP_AVAILABILITY]?.(child);
  }

  protected override updated() {
    // TBR-22: a group with a label is a group named by it; without one it is nothing, and its items are the toolbar's —
    // unless the product names it: a group the product names is a named group (TBR-26).
    const own = this.label.trim() !== '' ? this.label : '';
    nameHost(this, own);
    // TBR-28: a group whose selection is single is a radio group, named or not (a radio button belongs in one).
    const single = this.mode === 'single';
    hostAria(this, { role: single ? 'radiogroup' : own || namedByProduct(this) ? 'group' : null });
    if (single && !own && !namedByProduct(this)) report(this, 'TBR-28', 'a group whose selection is single is a radio group, and has no accessible name; give it a label ("Alignment")');
    this.syncMembers();
    this.checkMembers();
    const slots = [...this.renderRoot.querySelectorAll<HTMLSlotElement>('slot.unit')];
    slots.forEach((slot, i) => {
      const child = this.laid[i];
      if (child && (slot.assignedNodes().length !== 1 || slot.assignedNodes()[0] !== child)) slot.assign(child);
    });
    const menus = this.renderRoot.querySelector<HTMLSlotElement>('slot.menus-slot');
    if (menus) menus.assign(...this.held);
    (this.parentElement as (HTMLElement & { [TOOLBAR_CHILDREN]?: () => void }) | null)?.[TOOLBAR_CHILDREN]?.();
  }

  protected override render() {
    return html`${this.laid.map((_, i) => html`${i ? html`<span class="space" aria-hidden="true"></span>` : nothing}<slot class="unit"></slot>`)}<span class="menus"><slot class="menus-slot"></slot></span>`;
  }
}

// TBR-26: the host carries the group role, and holds the product's name while its label names it.
holdsProductName(TanreiToolbarGroup);
if (!customElements.get('tanrei-toolbar-group')) customElements.define('tanrei-toolbar-group', TanreiToolbarGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-toolbar-group': TanreiToolbarGroup;
  }
}
