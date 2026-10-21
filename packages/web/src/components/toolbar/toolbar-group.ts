import { LitElement, type PropertyDeclarations, css, html, nothing } from 'lit';
import { GROUP_AVAILABILITY, GROUP_PLACE, type GroupPlace, type PlacingGroup, hostAria } from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import { spaceStyles } from './toolbar.styles.js';

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
 * @tag tanrei-toolbar-group
 * @slot - The group's items: `<tanrei-button>` and `<tanrei-button-with-menu>` elements, and a `<tanrei-menu anchor>`
 * anchored to one of them, which is not laid out.
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
    laid: { state: true },
  };

  /** Names the group for assistive technology ("Text style"). Never drawn. Empty: the group is not exposed. */
  label = '';

  /** The children laid out in the line, in order (the anchored menus are not). */
  private laid: Element[] = [];
  private held: Element[] = [];
  private readonly children$ = new MutationObserver(() => this.readChildren());

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, attributes: true, attributeFilter: ['anchor'], subtree: true });
    this.readChildren();
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
    // TBR-22: a group with a label is a group named by it; without one it is nothing, and its items are the toolbar's.
    const named = this.label.trim() !== '';
    hostAria(this, { role: named ? 'group' : null, 'aria-label': named ? this.label : null });
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

if (!customElements.get('tanrei-toolbar-group')) customElements.define('tanrei-toolbar-group', TanreiToolbarGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-toolbar-group': TanreiToolbarGroup;
  }
}
