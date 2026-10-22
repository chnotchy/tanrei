import { type PropertyDeclarations, type PropertyValues, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, SHEET_FLING_VELOCITY, SheetDrag, choiceAttribute, compChoice, findInteractive, hostAria, report } from '../../primitives/index.js';
import { type LinkedTabView, type TanreiTab, TanreiTabPanel, TanreiTabs, type TanreiTabsSize, type TanreiTabsVariant } from '../tabs/tabs.js';
import { tabViewStyles } from './tab-view.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** What `change` carries: the value of the panel the user selected or swiped to, which the view's `value` (and its tabs') now holds. */
export interface TanreiTabViewChangeDetail {
  value: string;
}

/** `comp.tab-view.motion.transition` (TBV-22): a choice's name. The first is what an unknown name is. */
const FORMS = ['slide', 'fade', 'none'] as const;
type Form = (typeof FORMS)[number];
/** The view's `transition` prop: `auto` takes the component token, and so does a value the view does not define. */
const TRANSITION_VALUES = ['auto', ...FORMS] as const;
/** The form in which the shown panel gives way to the next (TBV-22): `auto` takes the design system's answer, `comp.tab-view.motion.transition`. */
export type TanreiTabViewTransition = (typeof TRANSITION_VALUES)[number];
const FORM_TOKEN = '--tanrei-comp-tab-view-motion-transition';

/** How a switch looks at its fullest and how it moves, as the tokens say now (read through the probe's real properties). */
interface Look {
  /** TBV-22: the form the switch is drawn in. Under `none` nothing of it is drawn: it only says where a swipe goes. */
  form: Form;
  /** comp.tab-view.transition.distance, in px (0 where motion is reduced). */
  distance: number;
  /** comp.tab-view.transition.distance-fraction (0 where motion is reduced). */
  fraction: number;
  /** comp.tab-view.transition.opacity. */
  opacity: number;
  /** comp.tab-view.transition.blur, in px (0 where motion is reduced). */
  blur: number;
  /** motion.switch-duration (motion.fade-duration where motion is reduced), in ms. */
  duration: number;
  /** motion.switch-easing (motion.fade-easing where motion is reduced). */
  easing: string;
}

/**
 * A switch from panel A (`from`) to panel B (`to`), drawn at a progress (TBV-5). `sign` is the physical direction A
 * leaves by: −1 toward the left, 1 toward the right. Either panel may be missing (a selected tab without a panel).
 */
interface Switch {
  from: TanreiTabPanel | null;
  to: TanreiTabPanel | null;
  sign: -1 | 1;
  look: Look;
  /** The view's width when the switch started, in px. */
  width: number;
  /** The progress drawn now: the travel's, eased (it may overshoot); the fade and the blur take it clamped. */
  p: number;
}

/** A drag on the shown panel, before and after the view takes it (TBV-3, TBV-4). */
interface Drag {
  gesture: SheetDrag;
  taken: boolean;
  rtl: boolean;
  width: number;
  /** The enabled tab the drag goes toward now, and its direction among the tabs: 1 the next, −1 the previous. */
  target: TanreiTab | null;
  toward: -1 | 0 | 1;
  /** The drag's progress, 0…1. */
  p: number;
  /** The switch it draws, while it has a target. */
  switch: Switch | null;
}

/** What a sideways drag belongs to when it starts on it (TBV-8): controls and components that take sideways drags. */
const TAKES_SIDEWAYS_DRAGS = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="slider"]',
  '[role="scrollbar"]',
  'tanrei-slider',
  'tanrei-carousel',
  'tanrei-text-field',
  'tanrei-text-input',
  'tanrei-chip-field',
  'tanrei-color-field',
  'tanrei-color-input',
  'tanrei-search',
  'tanrei-tab-view',
  'tanrei-tabs',
].join(', ');

const px = (n: number) => `${Math.round(n * 100) / 100}px`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Shows the view of the selected tab under its own row of tabs, or linked to a row of `<tanrei-tabs>` placed elsewhere,
 * and lets a person swipe from view to view with the tabs' indicator following the finger.
 *
 * Contract: specs/tab-view.spec.json. The view's `<tanrei-tab-panel>` children are its panels. By default (`tabs` empty)
 * the view draws its own row (TBV-16): a `<tanrei-tabs>` it places as its first light-DOM child, in its `tabs` slot above
 * the panels, with one `<tanrei-tab>` per panel made from the panel's `value`, `label`, `icon`, `label-hidden` and
 * `disabled`; the row's `variant`, `size`, `track`, `full-width` and `label` are the view's. The product does not edit that row. Linked
 * (TBV-17): `tabs` is the id of a `<tanrei-tabs>` in the same tree (as `popovertarget` is), and the `tabsElement` property
 * sets the element itself; either one set means the view draws no row, even while that element is missing. Either way
 * the panels are matched to the tabs by `value` and take the place of the row's own panels (TAB-13), and the selected
 * panel is the view's `value`, kept equal to the tabs' `value` in both directions without an event.
 *
 * Every selection is announced once. With its own row the view fires `change` for a tab and for a swipe; the row's own
 * `change` never fires (TBV-18). Linked, a selection on the tabs is announced by the tabs' `change`, and a swipe by the
 * view's. The view sets its `value` (and the tabs') before `change` fires, as a native control does.
 *
 * A switch — from the tabs, the product, or the rest of a released swipe — runs over `motion.switch-duration`: the old
 * panel moves `transition.distance` (plus `transition.distance-fraction` of the width) toward the edge it leaves by,
 * fading toward `transition.opacity` and blurring toward `transition.blur`, while the new one arrives from the other side.
 * Where motion is reduced only the fade is left, over `motion.fade-duration`. A drag by touch or pen that goes further
 * sideways than up or down holds the switch under the finger and sets the tabs' `indicatorOffset` in every frame; it
 * commits past half the width or on a fling toward the tab. Mouse, trackpad and wheel never swipe: the tabs are the way.
 *
 * `transition` names the form of a switch: `slide` as above, `fade` — the two panels crossfade in place, over
 * `motion.fade-duration` — and `none`, which shows the new panel whole in the frame the selection is made and gives the
 * row the view draws the tabs' `transition="none"`, so that its indicator is on the new tab in that frame too; a swipe
 * is still taken, the panel staying at rest under it while the indicator follows the finger. `auto`, the default, is
 * the design system's answer (`--tanrei-comp-tab-view-motion-transition`).
 *
 * A drag across the row — the view's own, or the linked one — is the tabs' (TAB-28): their indicator follows the pointer
 * and the view takes no drag meanwhile. The shown panel stays at rest for its whole length, because no tab is selected
 * before the release; the release switches to the chosen tab's panel as any selection does, and with its own row the
 * view announces it, once.
 *
 * @tag tanrei-tab-view
 * @slot - `<tanrei-tab-panel>` children: the panels, one per tab, each with the value of its tab.
 * @slot tabs - The view's own row, which it places there itself (a `<tanrei-tabs>`); not for the product.
 * @csspart container - The region that holds the panels and clips them to its corners.
 * @fires {CustomEvent<TanreiTabViewChangeDetail>} change - The user selected another panel — by a tab of the view's own row, or by a swipe: `detail.value` (and the view's and the tabs' `value`) is its value.
 */
export class TanreiTabView extends TanreiElement implements LinkedTabView {
  private readonly availability = new AvailabilityController(this, 'tab-view');
  static override styles = tabViewStyles;

  static override properties: PropertyDeclarations = {
    value: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    track: { reflect: true, converter: choiceAttribute },
    fullWidth: { type: Boolean, attribute: 'full-width', reflect: true },
    label: { type: String },
    tabs: { type: String },
    noSwipe: { type: Boolean, attribute: 'no-swipe', reflect: true },
    transition: { type: String, reflect: true },
    group: { type: String },
    rememberAs: { type: String, attribute: 'remember-as' },
    swipes: { state: true },
  };

  /**
   * The value of the selected tab, whose panel is shown — kept equal to the linked tabs' `value`: setting either sets the
   * other, without an event. `null` shows the panel of the tab the tabs select while theirs is `null` (the first enabled
   * tab). A swipe sets it (and the tabs') before `change` fires.
   */
  value: string | null = null;

  /**
   * The variant of the row the view draws itself, with the tabs' meaning (TBV-16): primary for the main views of a screen,
   * secondary for views within one of them, tonal for the quiet row of a sample or a setting, or a value the system
   * adds to the tabs. Unused while linked (TBV-17).
   */
  variant: TanreiTabsVariant = 'primary';

  /** The size of the row the view draws itself, with the tabs' meaning (TBV-16): `medium`, or `small` for a row in a header. Unused while linked (TBV-17). */
  size: TanreiTabsSize = 'medium';

  /**
   * Whether the row the view draws itself draws its track, with the tabs' meaning (TBV-16): false draws none, true
   * draws it, and null, the default, takes the system's choice. The attribute: absent is null, `track` is true,
   * `track="false"` is false. Unused while linked (TBV-17).
   */
  track: boolean | null = null;

  /**
   * How the view's own row lays out its tabs, with the tabs' meaning: false (hug) sizes each tab to its label and scrolls
   * the row; true (fill) shares the row's width. Unused while linked (TBV-17).
   */
  fullWidth = false;

  /** The accessible name of the view's own row: what the views are views of. Unused while linked (TBV-17). */
  label = '';

  /**
   * Empty (the default): the view draws its own row of tabs from its panels (TBV-16). Set: the id of the `<tanrei-tabs>`
   * this view is linked to, in the same tree, which names its panels and moves between them; the view draws no row, even
   * while that element is missing (TBV-17).
   */
  tabs = '';

  /**
   * The spec's `swipeable`, inverted (an HTML boolean attribute defaults to false): turns the swipe off, leaving the
   * switch to the tabs alone, for panels whose content is itself dragged sideways (a map, a drawing surface).
   */
  noSwipe = false;

  /**
   * The form in which the shown panel gives way to the next. `slide`: the panels travel, fading and blurring on the
   * way as the system's transition values say, and follow a swipe. `fade`: the two crossfade in place. `none`: the new
   * panel is shown whole in one frame, and the row the view draws puts its indicator on the new tab in that frame.
   * `auto` (the default, and what any other value is taken as) takes the design system's answer (`motion.transition`,
   * slide in the default system). Where motion is reduced slide is drawn as fade, and nothing is added to fade or none.
   * A row the view is linked to keeps its own `transition`.
   */
  transition: TanreiTabViewTransition = 'auto';

  /**
   * The group of the row the view draws itself, with the tabs' meaning (TBV-16): Tab views and rows of tabs in the
   * document that name the same group show the same choice, and a view that has no panel of that value keeps its own. A
   * view that follows shows its panel at once, without a switch, and fires nothing. Empty (the default): the view's
   * choice is its own. Unused while linked (TBV-17): the linked row names its own group.
   */
  group = '';

  /**
   * The key of the origin's `localStorage` under which the row the view draws itself keeps a person's choice and from
   * which it restores it before the view is first drawn, with the tabs' meaning. Empty (the default): nothing is read
   * or written. Unused while linked (TBV-17): the linked row names its own key.
   */
  rememberAs = '';

  /** Whether a drag can be taken now: linked, swipeable (TBV-8, TBV-14). */
  private swipes = false;

  /** The tabs set through `tabsElement`, which win over `tabs`. */
  private explicitTabs: TanreiTabs | null = null;
  /** The tabs this view is linked to now: its own row, or the row `tabs` names (TBV-14: null while that is missing). */
  private link: TanreiTabs | null = null;
  /** TBV-16: the row the view draws itself, kept while the view is linked elsewhere so that it can be drawn again. */
  private ownRow: TanreiTabs | null = null;
  /** TBV-16: the tab of the own row that each panel makes, kept while the panel is (TBV-12: nothing is recreated). */
  private readonly rowTabs = new WeakMap<TanreiTabPanel, TanreiTab>();
  /** The panels and their values at the last sync: a change of either shows the selected panel at once (TBV-6). */
  private synced: [TanreiTabPanel, string][] = [];
  /** The panel exposed as the selected tab's (TBV-9), which is drawn at rest once a switch ends. */
  private shown: TanreiTabPanel | null = null;
  /** Whether the view has shown a panel since it appeared or was linked: the first one is shown at once (TBV-6). */
  private appeared = false;
  /** The switch drawn now, from a selection or the rest of a released drag (TBV-4, TBV-6). */
  private switching: { switch: Switch; animation: Animation | null; from: number; to: number; offset: number } | null = null;
  private switchFrame = 0;
  private drag: Drag | null = null;

  private readonly children$ = new MutationObserver(() => this.panelsChanged());
  /** While `tabs` names nothing in the tree, the tree is watched for it to appear. */
  private readonly tree$ = new MutationObserver(() => this.resolve());
  private reportFrame = 0;

  constructor() {
    super();
    this.addEventListener('tanrei-tab-update', (event) => {
      if (event.target instanceof TanreiTabPanel && event.target.parentElement === this) this.panelsChanged();
    });
    // TBV-23: a press on the view — which may become a drag across its row, or a swipe — finds the row's transition as
    // the view's form says now. (A selection made on the row any other way asks first: `rowWillSelect()`.)
    this.addEventListener('pointerdown', () => this.giveRowTransition(), { capture: true });
    this.addEventListener('pointerdown', this.onPointerDown);
    this.addEventListener('pointermove', this.onPointerMove);
    this.addEventListener('pointerup', this.onPointerUp);
    this.addEventListener('pointercancel', this.onPointerCancel);
  }

  /**
   * The `<tanrei-tabs>` this view is linked to — the row `tabs` names, or the view's own row; setting it links that
   * element instead (TBV-17), and `null` gives the view its own row back while `tabs` is empty.
   */
  get tabsElement(): TanreiTabs | null {
    return this.link;
  }

  set tabsElement(element: TanreiTabs | null) {
    this.explicitTabs = element instanceof TanreiTabs && element !== this.ownRow ? element : null;
    this.resolve();
  }

  /** TBV-17: whether the view is linked to a row placed elsewhere (it then draws none), rather than drawing its own. */
  private get linkedElsewhere(): boolean {
    return !!this.tabs || !!this.explicitTabs;
  }

  /** The view's panels, in order. */
  private get panels(): TanreiTabPanel[] {
    return [...this.children].filter((child): child is TanreiTabPanel => child instanceof TanreiTabPanel);
  }

  private get container(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.container') ?? null;
  }

  /** The linked tabs, while they are connected. */
  private get linked(): TanreiTabs | null {
    return this.link?.isConnected ? this.link : null;
  }

  /** @internal TAB-13, TBV-15: the view's panel of `value` — the first panel with it — or null. */
  panelFor(value: string): TanreiTabPanel | null {
    if (!value) return null;
    return this.panels.find((panel) => panel.value === value) ?? null;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true });
    this.appeared = false;
    this.resolve();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.tree$.disconnect();
    cancelAnimationFrame(this.reportFrame);
    this.endDrag();
    this.endSwitch();
    const tabs = this.link;
    this.link = null;
    tabs?.unlinkView(this);
  }

  /**
   * Links the view to its tabs (TBV-1, TBV-14, TBV-16, TBV-17): the row `tabsElement` or `tabs` names — drawing none of
   * its own, even while that row is missing — or, while neither is set, the row it draws itself. A new link takes the
   * view's `value` over to the tabs — or, while it is null, takes theirs — and shows its panel at once (TBV-6).
   */
  private resolve() {
    if (!this.isConnected) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    this.tree$.disconnect();
    let tabs: TanreiTabs | null;
    if (this.linkedElsewhere) {
      const named = this.tabs && typeof root.getElementById === 'function' ? root.getElementById(this.tabs) : null;
      const found = this.explicitTabs ?? (named instanceof TanreiTabs ? named : null);
      tabs = found?.isConnected ? found : null;
      // Watch the tree only while the link is missing (the tabs may be added after the view).
      if (!tabs && this.tabs && !this.explicitTabs) this.tree$.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
    } else tabs = this.placeOwnRow();
    if (tabs === this.link) {
      if (!tabs) this.sync('instant');
      this.reports();
      return;
    }
    const old = this.link;
    this.endDrag();
    this.endSwitch();
    this.link = tabs;
    this.appeared = false;
    old?.unlinkView(this);
    // TBV-17: linked elsewhere, the view's own row is removed at once (after it is unlinked, so that it tells nobody).
    if (tabs !== this.ownRow && this.ownRow?.parentElement === this) this.ownRow.remove();
    if (tabs) {
      if (this.value !== null && this.value !== undefined) {
        if (tabs.value !== this.value) tabs.value = this.value;
      } else if (tabs.value !== null && tabs.value !== undefined) this.value = tabs.value;
      // TAB-36, TAB-39, TBV-20: the row's group or its storage may hold a choice, which the row takes before it is
      // drawn — after the view's own selected, so that the view's first frame shows the choice's panel.
      tabs.followGroup();
      if (tabs.value !== null && tabs.value !== undefined && tabs.value !== this.value) this.value = tabs.value;
      tabs.linkView(this);
    }
    this.sync('instant');
  }

  /**
   * TBV-16: places the view's own row — created the first time — as its first light-DOM child in its `tabs` slot, drawn
   * from its panels, and returns it.
   */
  private placeOwnRow(): TanreiTabs {
    let row = this.ownRow;
    if (!row) {
      row = this.ownerDocument.createElement('tanrei-tabs') as TanreiTabs;
      row.slot = 'tabs';
      row.setOwnerView(this);
      this.ownRow = row;
    }
    this.drawRow();
    if (row.parentElement !== this) this.prepend(row);
    return row;
  }

  /**
   * TBV-16: the own row as the panels and the view say now — its variant, fullWidth and label the view's, and one tab for
   * each panel TBV-15 shows (the first with each non-empty value), in the panels' order, whose value, label, icon,
   * labelHidden and disabled are the panel's. A panel keeps its tab; a tab is moved only when the order changed, so a
   * focused tab keeps its focus.
   */
  private drawRow() {
    const row = this.ownRow;
    if (!row || this.linkedElsewhere) return;
    row.variant = this.variant;
    row.size = this.size;
    row.track = this.track;
    // TBV-23: a form the view names itself reaches the row with the row; the system's answer is read when it is needed.
    if (this.namedForm) this.giveRowTransition();
    row.fullWidth = this.fullWidth;
    row.label = this.label;
    row.group = this.group;
    row.rememberAs = this.rememberAs;
    const panels = this.panels;
    const tabs = panels
      .filter((panel, index) => !!panel.value && panels.findIndex((each) => each.value === panel.value) === index)
      .map((panel) => {
        let tab = this.rowTabs.get(panel);
        if (!tab) {
          tab = this.ownerDocument.createElement('tanrei-tab') as TanreiTab;
          this.rowTabs.set(panel, tab);
        }
        tab.value = panel.value;
        tab.label = panel.label;
        tab.icon = panel.icon;
        tab.labelHidden = panel.labelHidden;
        tab.disabled = panel.disabled;
        return tab;
      });
    for (const child of [...row.children]) if (!tabs.includes(child as TanreiTab)) child.remove();
    tabs.forEach((tab, index) => {
      const at = row.children[index] ?? null;
      if (at !== tab) row.insertBefore(tab, at);
    });
  }

  /** TBV-22: the form `transition` names itself, or null while it is auto (or a value the view does not define). */
  private get namedForm(): Form | null {
    return (FORMS as readonly string[]).includes(this.transition) ? (this.transition as Form) : null;
  }

  /**
   * TBV-22: the form a switch is drawn in right now: the one `transition` names, else the system's choice as the
   * cascade gives it at this moment — never cached, and an unknown name is the first value (slide).
   */
  private get form(): Form {
    return this.namedForm ?? compChoice(this, FORM_TOKEN, FORMS);
  }

  /**
   * TBV-23: gives the view's own row the tabs' transition none while the view's form is none, and auto — the tabs' own
   * answer — otherwise. Written as the attribute, so that the row has it in this task. A linked row is never set.
   */
  private giveRowTransition() {
    const row = this.ownRow;
    if (!row || this.linkedElsewhere) return;
    const transition = this.form === 'none' ? 'none' : 'auto';
    if (row.getAttribute('transition') !== transition && (transition === 'none' || row.hasAttribute('transition'))) row.setAttribute('transition', transition);
  }

  /** @internal TBV-23: the view's own row is about to draw a person's selection, in the form the view has now. */
  rowWillSelect() {
    this.giveRowTransition();
  }

  /**
   * @internal TBV-18: the user selected `value` on the view's own row, which has set its `value` (and so the view's,
   * TBV-1) and fires nothing: the view announces it, once, in the same task.
   */
  rowSelected(value: string) {
    if (this.value !== value) this.value = value;
    this.dispatchEvent(new CustomEvent<TanreiTabViewChangeDetail>('change', { bubbles: true, detail: { value } }));
  }

  /**
   * @internal TBV-1, TBV-2: the linked tabs' selection, their tabs or their connection changed. TBV-20: `atOnce` when
   * the tabs took their group's choice, or one restored from storage — the panel is shown at once, with no switch, a
   * swipe in progress ends without committing, and nothing is fired.
   */
  followTabs(atOnce = false) {
    if (this.link && !this.link.isConnected) {
      this.resolve();
      return;
    }
    const tabs = this.linked;
    if (!tabs) return;
    // TBV-1: the view's value follows the tabs' without an event (updated() sees them equal and writes nothing back).
    if (tabs.value !== this.value) this.value = tabs.value;
    this.sync(atOnce ? 'instant' : 'switch');
  }

  /**
   * TBV-6, TBV-16: panels added, removed or given other values redraw the own row and show the selected tab's panel at
   * once; a panel's other tab props (label, icon, labelHidden, disabled) redraw the row only, in the same frame.
   */
  private panelsChanged() {
    const panels = this.panels;
    const moved = panels.length !== this.synced.length || panels.some((panel, index) => this.synced[index][0] !== panel || this.synced[index][1] !== panel.value);
    if (this.link && this.link === this.ownRow) this.drawRow();
    if (moved) this.sync('instant');
    this.linked?.relink();
  }

  /**
   * The panel to show (TBV-1, TBV-14, TBV-15): linked, the panel of the tabs' selected tab — the first panel with its
   * value — or none when it has none; without tabs, the first panel with `value`, or the first panel while it is null.
   */
  private target(): TanreiTabPanel | null {
    const tabs = this.linked;
    if (tabs) {
      const tab = tabs.selectedTab;
      return tab ? this.panelFor(tab.value) : null;
    }
    if (this.value === null || this.value === undefined) return this.panels[0] ?? null;
    return this.panelFor(this.value);
  }

  /**
   * Brings what the view shows in line with the selection (TBV-1, TBV-2, TBV-6): `switch` draws a switch to a newly
   * selected panel once the view has appeared; `instant` ends any switch and shows the panel at once. Then exposes the
   * panels (TBV-9) and reports what it should (TBV-14, TBV-15).
   */
  private sync(mode: 'instant' | 'switch') {
    if (!this.isConnected || !this.hasUpdated) return;
    const tabs = this.linked;
    const target = this.target();
    if (target !== this.shown) {
      const from = this.shown;
      // TBV-6: a new selection ends a running switch (and a drag) at once, as if it had finished, and starts from its panel.
      this.endDrag();
      this.endSwitch();
      this.releaseFocus(from, target);
      this.shown = target;
      // TBV-22: under none the panel is shown at once, as one a group's choice shows is (TBV-20).
      if (mode === 'switch' && this.appeared && tabs && (from || target) && this.form !== 'none') this.startSwitch(from, target);
    } else if (mode === 'instant') {
      this.endDrag();
      this.endSwitch();
    }
    this.appeared = true;
    this.synced = this.panels.map((panel) => [panel, panel.value]);
    this.swipes = !!tabs && !this.noSwipe;
    this.expose();
    this.reports();
  }

  /**
   * TBV-9, TBV-14: the shown panel is the tab panel, named by its tab (the tab controls it, TAB-13), a Tab stop itself
   * while it holds nothing focusable; a panel a switch or a drag still draws is inert and hidden from assistive
   * technology; every other panel is `hidden` and `inert`. Without tabs no panel has the tab panel role.
   */
  private expose() {
    const tabs = this.linked;
    const drawn = new Set<TanreiTabPanel | null>();
    for (const each of [this.switching?.switch, this.drag?.switch]) {
      // TBV-22: under none a swipe draws no second panel.
      if (each && each.look.form !== 'none') drawn.add(each.from).add(each.to);
    }
    for (const panel of this.panels) {
      const shown = panel === this.shown;
      const tab = tabs && panel.value ? (tabs.tabs.find((each) => each.value === panel.value) ?? null) : null;
      // Only the shown panel is a Tab stop, so only it is searched (a page of code samples holds thousands of elements).
      const focusable = shown && [...panel.children].some((child) => findInteractive(child));
      hostAria(panel, {
        role: tabs ? 'tabpanel' : null,
        'aria-labelledby': tabs ? (tab?.id ?? null) : null,
        tabindex: shown && !focusable ? '0' : null,
        hidden: shown || drawn.has(panel) ? null : '',
        inert: shown ? null : '',
        'aria-hidden': !shown && drawn.has(panel) ? 'true' : null,
      });
    }
  }

  /** TBV-10: a switch that hides the panel holding keyboard focus moves focus to the tabs' selected tab. */
  private releaseFocus(from: TanreiTabPanel | null, to: TanreiTabPanel | null) {
    if (!from || from === to || !from.matches(':focus-within')) return;
    this.linked?.selectedTab?.focus({ preventScroll: true });
  }

  /** TBV-14, TBV-15, TBV-17: what a debug build tells the developer, once the tree has had a frame to link the tabs. */
  private reports() {
    cancelAnimationFrame(this.reportFrame);
    this.reportFrame = requestAnimationFrame(() => {
      if (!this.isConnected) return;
      const tabs = this.linked;
      const panels = this.panels;
      const elsewhere = this.linkedElsewhere;
      const hasValue = this.value !== null && this.value !== undefined;
      if (elsewhere) {
        // TBV-17: the row's props are the view's own row's, and a linked view draws none.
        const unused = [this.variant !== 'primary' && 'variant', this.size !== 'medium' && 'size', this.track !== null && 'track', this.fullWidth && 'full-width', this.label && 'label', this.group && 'group', this.rememberAs && 'remember-as'].filter(Boolean);
        if (unused.length) report(this, 'TBV-17', `${unused.join(', ')} apply only to a row the view draws itself; linked to other tabs, the view draws none and they are unused`);
      }
      if (!tabs) {
        report(this, 'TBV-14', `tabs="${this.tabs}" names no <tanrei-tabs> in this tree; its panels have no tabs`);
        if (hasValue && !this.panelFor(this.value!)) report(this, 'TBV-14', `no panel has the value "${this.value}"; none is shown`);
      } else if (!elsewhere) {
        if (!panels.length) report(this, 'TBV-14', 'it holds no <tanrei-tab-panel>, so its own row has no tab');
        else if (hasValue && !tabs.selectedTab) report(this, 'TBV-14', `no panel has the value "${this.value}"; none is shown`);
      } else {
        const selected = tabs.selectedTab;
        if (selected && !this.panelFor(selected.value)) report(this, 'TBV-14', `the selected tab "${selected.value}" has no panel; none is shown`);
        if (tabs.ownPanels.length) report(this, 'TBV-15', `the linked <tanrei-tabs> hold ${tabs.ownPanels.length} panel(s) of their own; they stay hidden and this view's panels take their place`);
      }
      const values = panels.map((panel) => panel.value);
      const ownRow = tabs && !elsewhere;
      panels.forEach((panel, index) => {
        if (!panel.value) report(this, 'TBV-15', `panel ${index + 1} has an empty value; it is never shown${ownRow ? ' and has no tab' : ''}`);
        else if (values.indexOf(panel.value) !== index) report(this, 'TBV-15', `the value "${panel.value}" is given to more than one panel; only the first of them is shown${ownRow ? ' and has a tab' : ''}`);
        else if (tabs && elsewhere && !tabs.tabs.some((tab) => tab.value === panel.value)) report(this, 'TBV-15', `the panel "${panel.value}" has the value of no tab of the linked tabs; it is never shown`);
      });
    });
  }

  /**
   * TBV-4…7: the switch's look and timing, read now through the probe's real properties (never cached, so a change of
   * system or of reduced motion applies to the next switch). TBV-22: under fade the distance, its share, the blur and
   * the opacity's end are 0 and the motion is the fade's, so the two panels crossfade in place; under none there is no
   * motion at all.
   */
  private look(): Look {
    const probe = this.renderRoot?.querySelector<HTMLElement>('.probe');
    const style = probe ? getComputedStyle(probe) : null;
    const number = (value: string | undefined) => {
      const n = Number.parseFloat(value ?? '');
      return Number.isFinite(n) ? n : 0;
    };
    const form = this.form;
    if (form !== 'slide') {
      const fade = form === 'fade';
      return { form, distance: 0, fraction: 0, opacity: fade ? 0 : 1, blur: 0, duration: fade ? number(style?.animationDuration) * 1000 : 0, easing: (fade && style?.animationTimingFunction) || 'linear' };
    }
    return {
      form,
      distance: number(style?.width),
      fraction: number(style?.flexGrow),
      opacity: style ? number(style.opacity) : 1,
      blur: number(style?.height),
      duration: number(style?.transitionDuration) * 1000,
      easing: style?.transitionTimingFunction || 'ease',
    };
  }

  private get rtl(): boolean {
    return getComputedStyle(this).direction === 'rtl';
  }

  /** The physical direction a panel leaves by when the tab it gives way to comes after its own (TBV-5, TBV-13): the start edge. */
  private startSign(rtl: boolean): -1 | 1 {
    return rtl ? 1 : -1;
  }

  /** The index among the linked tabs of the tab of a panel's value. */
  private tabPosition(panel: TanreiTabPanel | null): number {
    const tabs = this.linked?.tabs ?? [];
    return panel ? tabs.findIndex((tab) => tab.value === panel.value) : -1;
  }

  /**
   * TBV-5: draws both panels of a switch at progress `p` in the same place, B over A, over a travel D of
   * transition.distance plus transition.distance-fraction of the width: A moved p × D toward the edge it leaves by, faded
   * to 1 − p × (1 − opacity) and blurred by p × blur; B moved (1 − p) × D from the other side, faded and blurred by
   * (1 − p). The travel follows p as eased (an overshoot included); the fade and the blur follow it clamped.
   */
  private paint(each: Switch, p: number) {
    each.p = p;
    // TBV-22: under none the shown panel stays at rest for the whole of a swipe, and the other is not drawn.
    if (each.look.form === 'none') return;
    const { distance, fraction, opacity, blur } = each.look;
    const travel = distance + fraction * each.width;
    const q = clamp01(p);
    const draw = (panel: TanreiTabPanel | null, x: number, fade: number, over: boolean) => {
      if (!panel) return;
      panel.style.translate = `${px(x)} 0`;
      panel.style.opacity = String(Math.round((1 - fade * (1 - opacity)) * 1000) / 1000);
      panel.style.filter = blur > 0 ? `blur(${px(fade * blur)})` : '';
      panel.style.zIndex = over ? '1' : '';
    };
    draw(each.from, each.sign * p * travel, q, false);
    draw(each.to, -each.sign * (1 - p) * travel, 1 - q, true);
  }

  /** A panel at rest: nothing of a switch is left on it. */
  private rest(panel: TanreiTabPanel | null) {
    if (!panel) return;
    for (const property of ['translate', 'opacity', 'filter', 'z-index']) panel.style.removeProperty(property);
  }

  /** A switch from `from` to `to`: A leaves by the start edge when B's tab comes after A's among the tabs (TBV-5, TBV-13). */
  private makeSwitch(from: TanreiTabPanel | null, to: TanreiTabPanel | null, forward: boolean, rtl = this.rtl): Switch {
    const start = this.startSign(rtl);
    return { from, to, sign: forward ? start : (-start as -1 | 1), look: this.look(), width: this.container?.getBoundingClientRect().width ?? 0, p: 0 };
  }

  /** TBV-2, TBV-6: a selection on the tabs (or by the product) runs a switch from 0 to 1 over the switch's motion. */
  private startSwitch(from: TanreiTabPanel | null, to: TanreiTabPanel | null) {
    const [a, b] = [this.tabPosition(from), this.tabPosition(to)];
    const each = this.makeSwitch(from, to, a < 0 || b < 0 ? true : b > a);
    this.run(each, 0, 1, 0);
  }

  /**
   * Runs a switch from progress `from` to `to` over the look's motion, and the tabs' indicatorOffset from `offset` to 0
   * with it (TBV-4, TBV-6, TBV-7). The progress of the motion's easing is read from an effect without keyframes on the
   * container (it draws nothing), the view's own animation `tanrei-tab-view-switch` on the document's timeline; every
   * frame draws both panels from it.
   */
  private run(each: Switch, from: number, to: number, offset: number) {
    this.endSwitch();
    const container = this.container;
    const { duration, easing } = each.look;
    const animation = duration > 0 && container && typeof KeyframeEffect !== 'undefined' ? new Animation(new KeyframeEffect(container, [], { duration, easing })) : null;
    const running = { switch: each, animation, from, to, offset };
    this.switching = running;
    this.expose();
    if (!animation) {
      this.finishSwitch();
      return;
    }
    animation.id = 'tanrei-tab-view-switch';
    animation.play();
    const step = () => {
      if (this.switching !== running) return;
      const over = animation.playState === 'finished' || animation.playState === 'idle';
      if (over) {
        this.finishSwitch();
        return;
      }
      const e = animation.effect?.getComputedTiming().progress ?? 1;
      this.paint(each, from + (to - from) * e);
      if (offset && this.linked) this.linked.indicatorOffset = offset * (1 - e);
      this.switchFrame = requestAnimationFrame(step);
    };
    // Where frames do not run (a hidden page), the end still comes.
    void animation.finished.then(step, () => {});
    step();
  }

  /**
   * TBV-6: ends the running switch at once, as if it had finished — the panel it goes to at rest, the other hidden, the
   * tabs' indicator on the selected tab.
   */
  private endSwitch() {
    if (!this.switching) return;
    this.finishSwitch();
  }

  private finishSwitch() {
    const running = this.switching;
    if (!running) return;
    cancelAnimationFrame(this.switchFrame);
    this.switching = null;
    running.animation?.cancel();
    const { from, to } = running.switch;
    this.rest(from);
    this.rest(to);
    if (running.offset && this.linked) this.linked.indicatorOffset = 0;
    this.expose();
  }

  /** The next (1) or previous (−1) enabled tab of the linked tabs from the selected one, in reading order, or null. */
  private neighbour(toward: -1 | 1): TanreiTab | null {
    const tabs = this.linked;
    const selected = tabs?.selectedTab;
    if (!tabs || !selected) return null;
    const list = tabs.tabs;
    for (let index = list.indexOf(selected) + toward; index >= 0 && index < list.length; index += toward) {
      if (!list[index].disabled) return list[index];
    }
    return null;
  }

  /**
   * TBV-8: a drag that starts on content that handles sideways drags itself — a region that scrolls sideways, a slider,
   * a carousel, a text field, a control that sets its own touch-action, selected text — is not the view's.
   */
  private handlesSideways(event: PointerEvent): boolean {
    for (const node of event.composedPath()) {
      if (node === this) break;
      if (!(node instanceof Element)) continue;
      if (node.matches(TAKES_SIDEWAYS_DRAGS)) return true;
      const style = getComputedStyle(node);
      if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && node.scrollWidth > node.clientWidth) return true;
      if (style.touchAction === 'none' || style.touchAction.includes('pan-x')) return true;
    }
    const selection = getSelection();
    const target = event.composedPath()[0];
    return !!selection && !selection.isCollapsed && target instanceof Node && selection.containsNode(target, true);
  }

  /** TBV-3, TBV-8: a touch or pen may start a swipe on the shown panel; a mouse, a trackpad or a wheel never does. */
  private readonly onPointerDown = (event: PointerEvent) => {
    if (this.drag || !event.isPrimary || event.button !== 0) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (!this.swipes || !this.linked || this.noSwipe || this.handlesSideways(event)) return;
    // TBV-3, TBV-8: one gesture at a time — while the tabs follow a drag of their own, the view takes none.
    if (this.linked.dragging) return;
    this.drag = { gesture: new SheetDrag(event, 'x'), taken: false, rtl: this.rtl, width: 0, target: null, toward: 0, p: 0, switch: null };
  };

  /**
   * TBV-3: past the touch slop, further sideways than up or down, the view takes the drag (a running switch ends at once,
   * TBV-6) and draws the switch toward the tab the drag goes to at p, setting the tabs' indicatorOffset to ±p, in every
   * move. A drag that went up or down first is the browser's scrolling, for its whole length.
   */
  private readonly onPointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    const step = drag.gesture.move(event);
    if (drag.gesture.rejected) {
      this.drag = null;
      return;
    }
    // TBV-3, TBV-8: the tabs took a drag of their own before this one passed its slop: it is not the view's.
    if (step === 'start' && this.linked?.dragging) {
      this.drag = null;
      return;
    }
    if (step === 'start') {
      this.endSwitch();
      drag.taken = true;
      drag.width = this.container?.getBoundingClientRect().width || 1;
      try {
        this.setPointerCapture(event.pointerId);
      } catch {
        // A pointer the browser does not know (a synthetic one) cannot be captured; its events still come here.
      }
    }
    if (drag.taken) {
      event.preventDefault();
      this.follow(drag, drag.gesture.distance(event));
    }
  };

  /** TBV-3, TBV-13: the drag's distance `dx` (px, rightward) as a progress toward the next or previous enabled tab. */
  private follow(drag: Drag, dx: number) {
    const tabs = this.linked;
    if (!tabs) return;
    const towardStart = drag.rtl ? dx > 0 : dx < 0;
    const toward: -1 | 0 | 1 = dx === 0 ? 0 : towardStart ? 1 : -1;
    const target = toward ? this.neighbour(toward) : null;
    if (target !== drag.target) {
      // The drag turned to the other side: the panel it was bringing in goes back.
      if (drag.switch && drag.switch.to !== this.shown) this.rest(drag.switch.to);
      drag.target = target;
      drag.toward = target ? toward : 0;
      drag.switch = target ? this.makeSwitch(this.shown, this.panelFor(target.value), toward === 1, drag.rtl) : null;
      this.expose();
    }
    drag.p = target ? clamp01(Math.abs(dx) / drag.width) : 0;
    if (drag.switch) this.paint(drag.switch, drag.p);
    else this.rest(this.shown);
    tabs.indicatorOffset = drag.toward * drag.p;
  }

  /**
   * TBV-4: a release commits past half the width or on a fling toward the tab, and cancels otherwise (a fling away always
   * cancels). A commit sets the view's and the tabs' value, re-expresses the offset from the new tab and fires `change`
   * once, in the same frame; the rest of the switch and the offset then run over the switch's motion from where the
   * release left them — the offset back at once where motion is reduced (TBV-7). A cancel runs both back to 0.
   */
  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    this.drag = null;
    if (!drag.taken) return;
    const velocity = drag.gesture.velocity(event);
    const finger = Math.sign(drag.gesture.distance(event));
    const fling = Math.abs(velocity) >= SHEET_FLING_VELOCITY ? (Math.sign(velocity) === finger ? 1 : -1) : 0;
    const commit = !!drag.target && !!drag.switch && (fling === 1 || (fling === 0 && drag.p >= 0.5));
    this.settle(drag, commit);
  };

  /** A drag the browser took back (or that lost its pointer) goes back to rest. */
  private readonly onPointerCancel = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.gesture.id) return;
    this.drag = null;
    if (drag.taken) this.settle(drag, false);
  };

  private settle(drag: Drag, commit: boolean) {
    const tabs = this.linked;
    const each = drag.switch;
    if (!tabs || !each || !drag.target) {
      if (tabs) tabs.indicatorOffset = 0;
      this.rest(this.shown);
      this.expose();
      return;
    }
    // TBV-7: where motion is reduced the offset, which the finger moved, goes back at once.
    // TBV-22: and so it does while the form is none.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || each.look.form === 'none';
    if (commit) {
      const value = drag.target.value;
      const left = this.shown;
      // The selection moves at the release: both values, the exposure (TBV-9), the focus (TBV-10), the offset from the
      // new tab (TAB-26 places the indicator where it is), then the one `change`. TBV-21: the choice is the person's, so
      // the tabs' group follows it and the view's container stays where it is in the window.
      tabs.personSelected(value, this.container ?? this);
      this.value = value;
      const offset = reduced ? 0 : -drag.toward * (1 - drag.p);
      tabs.indicatorOffset = offset;
      this.releaseFocus(left, each.to);
      this.shown = each.to;
      this.run(each, drag.p, 1, offset);
      this.dispatchEvent(new CustomEvent<TanreiTabViewChangeDetail>('change', { bubbles: true, detail: { value } }));
    } else {
      const offset = reduced ? 0 : drag.toward * drag.p;
      tabs.indicatorOffset = offset;
      this.run(each, drag.p, 0, offset);
    }
  }

  /** Drops a drag in progress: its panels back at rest, the indicator on the selected tab. */
  private endDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (!drag.taken) return;
    if (drag.switch) {
      this.rest(drag.switch.from);
      this.rest(drag.switch.to);
    }
    if (this.linked) this.linked.indicatorOffset = 0;
  }

  protected override firstUpdated() {
    this.sync('instant');
  }

  protected override updated(changed: PropertyValues<this>) {
    if (changed.has('tabs') && changed.get('tabs') !== undefined) this.resolve();
    // TBV-16: the own row's variant, fullWidth and label are the view's; TBV-17 reports them while linked elsewhere.
    if (changed.has('variant') || changed.has('size') || changed.has('track') || changed.has('fullWidth') || changed.has('label') || changed.has('group') || changed.has('rememberAs')) {
      this.drawRow();
      if (this.hasUpdated) this.reports();
    }
    if (changed.has('transition')) {
      // TBV-22: a value the view does not define is auto.
      if (this.transition && !(TRANSITION_VALUES as readonly string[]).includes(this.transition)) report(this, 'TBV-22', `transition "${this.transition}" is not a transition of the Tab view; it is taken as "auto"`);
      // TBV-23: a switch that is drawn ends at once, as if it had finished; the next one has the new form. The row
      // follows a form the view names; the system's answer is read when something begins.
      if (changed.get('transition') !== undefined) {
        this.endSwitch();
        this.giveRowTransition();
      }
    }
    if (changed.has('noSwipe')) {
      if (this.noSwipe) this.endDrag();
      this.swipes = !!this.linked && !this.noSwipe;
    }
    if (changed.has('value')) {
      // TBV-1: the view's value, set by the product, is set on the tabs too (which then switch the view, TBV-2).
      const tabs = this.linked;
      if (tabs && tabs.value !== this.value) {
        // TBV-23: the row draws the product's selection in the form the view has now.
        this.giveRowTransition();
        tabs.value = this.value;
      } else if (!tabs) this.sync('instant');
    }
  }

  protected override render() {
    return html`<slot name="tabs"></slot><div part="container" class=${classMap({ container: true, swipe: this.swipes })} data-tanrei-shape><slot></slot><span class="probe" aria-hidden="true"></span></div>`;
  }
}

if (!customElements.get('tanrei-tab-view')) customElements.define('tanrei-tab-view', TanreiTabView);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-tab-view': TanreiTabView;
  }
}
