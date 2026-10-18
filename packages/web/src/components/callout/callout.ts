import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  BUTTON_VARIANTS,
  GROUP_ITEM,
  GROUP_PLACE,
  GlyphDrawnController,
  GlyphMirrorController,
  type GroupItem,
  type GroupPlace,
  OpenAxesController,
  type PlacingGroup,
  type Tone,
  compChoice,
  focusWithin,
  giveTone,
  giveVariant,
  hostAria,
  report,
  returnFocus,
  WordsController,
} from '../../primitives/index.js';
import type { TanreiCalloutSizeRegistry, TanreiCalloutVariantRegistry } from '../../registry.js';
import '../button/button.js';
import { AXES, STATUSES, styles } from './callout.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core variants (tonal, outlined), plus any a design system's generated `.d.ts` registers. */
export type TanreiCalloutVariant = keyof TanreiCalloutVariantRegistry;
/** The core sizes (medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiCalloutSize = keyof TanreiCalloutSizeRegistry;
/** What the notice is, in the snackbar's and the tag's names. A closed set. */
export type TanreiCalloutStatus = 'default' | 'info' | 'warning' | 'error' | 'success';

/** CLO-5: each status's glyph from the system's icon set, the ones a snackbar draws. */
const GLYPHS: Record<(typeof STATUSES)[number], string> = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' };

/**
 * CLO-9, CLO-23: what an action is told through the Button's internal channel (src/primitives/group-item.ts) — the one
 * thing a button group's standard item has that a Button alone has not: its label may wrap when its line gives it less
 * than one line needs. First and last, so its hit area reaches as far as it would alone. (As the empty state: EMP-6.)
 */
const ACTION_PLACE: GroupPlace = { variant: 'standard', first: true, last: true };

const isStatus = (status: string): status is (typeof STATUSES)[number] => (STATUSES as readonly string[]).includes(status);

const PREFIX = '--tanrei-comp-callout';

/**
 * CLO-10: the tone the close button is drawn in on a filled look (BTN-45) — the body color of the callout's form, the
 * content color of the fill it stands on. A look a layer adds falls back to the tonal look's color of the form, as every
 * part of such a look does (callout.styles.ts). The outlined look has no fill: no tone.
 */
const toneOf = (variant: string, form: TanreiCalloutStatus): Tone | null => {
  if (variant === 'outlined') return null;
  const name = (look: string) => `${PREFIX}-${form === 'default' ? '' : `${form}-`}body-color-${look}`;
  // Only a token name is written into a custom property; anything else is drawn as the default look (CLO-30).
  const look = /^[a-z0-9][a-z0-9-]*$/.test(variant) ? variant : 'tonal';
  return { color: look === 'tonal' ? `var(${name('tonal')})` : `var(${name(look)}, var(${name('tonal')}))` };
};

/**
 * `open` is a boolean that defaults to true, and its attribute says so: absent is true, `open` (or any other value) is
 * true, and `open="false"` is false — the one way markup starts a callout closed.
 */
const openConverter = {
  fromAttribute: (value: string | null): boolean => value === null || value.trim().toLowerCase() !== 'false',
  toAttribute: (value: unknown): string | null => (value === false ? 'false' : null),
};

/** Text as it is read: one run, its white space collapsed. */
const spoken = (text: string | null | undefined) => (text ?? '').replace(/\s+/gu, ' ').trim();

let titles = 0;

/**
 * A notice that is part of the content and stays there, as a quiet fill or an outline, in a status's colors with its glyph.
 * A note, a caution, the reason for something or a summary of what is wrong, in the flow of the page, with an optional
 * title, actions and a close button.
 *
 * Contract: specs/callout.spec.json. `<tanrei-callout status="warning">…</tanrei-callout>`: the body is the element's
 * own content (text, or the product's blocks — long-form blocks in a `<div class="tanrei-prose" data-measure="false">`),
 * the title is the `headline` attribute or the `title` slot, a glyph of the icon set goes in the `icon` slot, and the
 * product's Buttons or links in the `actions` slot. Every visual value is a `--tanrei-comp-callout-*` token, one set per
 * variant and status; how far its corners ease is the system's amount (`--tanrei-sys-shape-corner-smoothing`). Its close
 * button is a small icon-only `<tanrei-button>` in the variant `--tanrei-comp-callout-close-button-variant` names, drawn
 * on a filled look in the body color of the callout's form (a tone): its container that color made translucent, its
 * glyph that color, its states the Button's own.
 *
 * It is a note (`role="note"`), read where it stands and never announced. With `live` it is a live region instead: it
 * is announced once when it is shown after the page was presented and when its title, body or status changes — politely
 * (`role="status"`), or assertively for warning and error (`role="alert"`). It never takes focus.
 *
 * A status is never told by color alone: a status form draws the status's glyph, and the title says it or
 * `statusLabel` adds it in words for assistive technology ("Warning, …") without drawing it.
 *
 * `title` is the `headline` property and attribute, because HTML's global `title` would show a tooltip over the block.
 * `open` defaults to true; `open="false"` is how markup starts a callout closed.
 *
 * @tag tanrei-callout
 * @slot - The body: text, or the product's own blocks (paragraphs, lists, a table, a code block, any component). Text placed directly takes the callout's text style and color; long-form blocks go in a `<div class="tanrei-prose" data-measure="false">` (with `data-size="large"` in a large callout).
 * @slot icon - A glyph of the system's icon set (its ligature text, in an element), drawn in place of the status glyph, or as the glyph of a callout without a status. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot title - The product's own title content in place of `headline`: text with inline content, or a heading of the level the page's outline needs. It is drawn in the title's style; its role and its level are not changed.
 * @slot actions - The product's own Buttons or links, one or two, laid out in a row below the text.
 * @csspart container - The block: its fill, its edge in the outlined look, its corners and paddings.
 * @csspart icon - The box the glyph is drawn in (hidden from assistive technology).
 * @csspart title - The title.
 * @csspart body - The body.
 * @csspart actions - The row of actions.
 * @csspart close-button - The close button, an icon-only `<tanrei-button>`.
 * @fires dismiss - The person closed the callout with its close button. Fired once, after `open` became false; never when the product sets `open`.
 */
export class TanreiCallout extends TanreiElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'callout');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    status: { type: String, reflect: true },
    statusLabel: { type: String, attribute: 'status-label' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    live: { type: Boolean, reflect: true },
    closable: { type: Boolean, reflect: true },
    closeLabel: { type: String, attribute: 'close-label' },
    open: { reflect: true, converter: openConverter },
    hasIcon: { state: true },
    hasTitle: { state: true },
    hasBody: { state: true },
    hasActions: { state: true },
  };

  /** A few words above the body that name the notice ("Not published yet"): the spec's `title`. Plain text, never a heading. Empty draws the body alone; the `title` slot takes its place. */
  headline = '';

  /** What the notice is: default (a neutral aside, no glyph unless the product gives one), info, warning, error or success, each in its colors with its glyph. A live callout is announced assertively for warning and error. */
  status: TanreiCalloutStatus = 'default';

  /** The status in words ("Warning"), read by assistive technology before the title and the body and not drawn. For a callout whose title does not itself say the status. Ignored while `status` is default. */
  statusLabel = '';

  /** How much the callout weighs: tonal is a quiet fill; outlined has no fill and one hairline, for a tinted surface or many callouts close together. */
  variant: TanreiCalloutVariant = 'tonal';

  /** The size of the text: medium sets it in the interface's text style, large in the style for long reading. Paddings, the glyph and the close button are the same at both. */
  size: TanreiCalloutSize = 'medium';

  /** Whether the callout is announced: false is a note, read where it stands; true is a live region, announced once when it is shown after the page was presented and when its content changes. It changes nothing that is drawn. */
  live = false;

  /** Draws a close button, for a notice the person may put away. */
  closable = false;

  /** The close button's accessible name, in the product's language ("Close"). Required while `closable` is set. */
  closeLabel = '';

  /** Whether the callout is shown. The close button sets it to false. The attribute: absent is true, `open="false"` is false. */
  open = true;

  /** Whether the icon slot has content. */
  protected hasIcon = false;
  /** Whether the title slot has content. */
  protected hasTitle = false;
  /** Whether the default slot has content: an element, or text that is not white space. */
  protected hasBody = false;
  /** Whether the actions slot has content. */
  protected hasActions = false;
  /** CLO-23: the actions that were told their place. */
  private placed = new Set<Element>();

  /** CLO-30: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'callout', behavior: 'CLO-30', axes: AXES });

  /**
   * CLO-27: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so; the callout's own glyphs go through the same rule, which marks none of them under the
   * default icon set. `iconGlyph()` draws the mark. The callout mirrors nothing itself.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.icon.own' });

  /** CLO-29: each glyph box carries `data-drawn` while the icon set can draw its ligature; until then it draws nothing. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.icon') ?? []);

  /** CLO-31: the custom state the styles read to take an empty callout out of the layout. */
  private readonly internals: ElementInternals | null = typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  /** CLO-12: the element that had focus before focus entered the callout. */
  private cameFrom: Element | null = null;
  private focusInside = false;

  /**
   * CLO-21: whether this callout was already in the document when its element was made — written in the page's markup
   * and upgraded — which is being drawn with the page's first presentation.
   */
  private readonly upgraded = this.isConnected;
  /** CLO-21: whether its first render is announced: it was added by the product after the page was presented. */
  private announceFirst = false;
  /** Whether it has been drawn once: what changes after that is a change. */
  private presented = false;
  private pending = 0;
  /** CLO-21: hears the title and the body change while it is live. */
  private content$: MutationObserver | null = null;

  constructor() {
    super();
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  /** CLO-30: a status this spec does not have is `default`. */
  private get form(): TanreiCalloutStatus {
    return isStatus(this.status) ? this.status : 'default';
  }

  /** CLO-21: warning and error are announced assertively, as a snackbar's. */
  private get assertive(): boolean {
    return this.form === 'warning' || this.form === 'error';
  }

  private get titled(): boolean {
    return this.hasTitle || this.headline.trim() !== '';
  }

  /** CLO-31: neither a title nor a body — a glyph, actions or a close button alone are not a notice. */
  private get empty(): boolean {
    return !this.titled && !this.hasBody;
  }

  /** The element in the title slot, if any. */
  private get slottedTitle(): Element | null {
    return [...this.children].find((child) => child.slot === 'title') ?? null;
  }

  /** @internal What a live callout announces (CLO-21): statusLabel in a status form, the title, then the whole body. */
  get announcement(): string {
    const status = this.form === 'default' ? '' : this.statusLabel;
    const title = this.hasTitle ? [...this.children].filter((child) => child.slot === 'title').map((child) => child.textContent).join(' ') : this.headline;
    const body = [...this.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE || (node instanceof Element && !node.slot))
      .map((node) => node.textContent)
      .join(' ');
    return [status, title, body]
      .map(spoken)
      .filter(Boolean)
      .reduce((said, part) => (said ? `${said}${/[.!?。！？]$/u.test(said) ? ' ' : '. '}${part}` : part), '');
  }

  /** What the light DOM holds for each slot, read from the children: they are there before a slot says so. */
  private scan() {
    let icon = false;
    let title = false;
    let actions = false;
    let body = false;
    for (const node of this.childNodes) {
      if (node instanceof Element) {
        if (node.slot === 'icon') icon = true;
        else if (node.slot === 'title') title ||= spoken(node.textContent) !== '' || node.childElementCount > 0;
        else if (node.slot === 'actions') actions = true;
        else if (!node.slot) body = true;
      } else if (node.nodeType === Node.TEXT_NODE && spoken(node.textContent) !== '') body = true;
    }
    this.hasIcon = icon;
    this.hasTitle = title;
    this.hasActions = actions;
    this.hasBody = body;
    this.place();
  }

  /** @internal CLO-23: where an action stands, for the Button that asks when it connects (src/primitives/group-item.ts); null for anything else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    return child.parentElement === this && child.slot === 'actions' ? ACTION_PLACE : null;
  }

  /** CLO-23: every action is told its place, and one that is an action no more is told it has none. */
  private place() {
    const actions = new Set([...this.children].filter((child) => child.slot === 'actions'));
    for (const gone of this.placed) if (!actions.has(gone) && gone.parentElement === this) (gone as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(null);
    for (const action of actions) (action as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(ACTION_PLACE);
    this.placed = actions;
  }

  private readonly onSlotChange = () => this.scan();

  /** Whether `node` is in the callout: its own content or its shadow root. */
  private holds(node: Node): boolean {
    return this.contains(node) || !!this.shadowRoot?.contains(node);
  }

  /** CLO-12: where focus was before it entered the callout. */
  private readonly onFocusIn = (event: FocusEvent) => {
    if (!this.focusInside) this.cameFrom = event.relatedTarget instanceof Element && !this.holds(event.relatedTarget) ? event.relatedTarget : null;
    this.focusInside = true;
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    const to = event.relatedTarget;
    if (to instanceof Node && this.holds(to)) return;
    this.focusInside = false;
  };

  /**
   * CLO-11: the close button, by pointer, touch, Enter or Space (the native button's click): `open` becomes false,
   * focus goes back where it was before it entered the callout (CLO-12), and `dismiss` says the person closed it — once.
   */
  private readonly onClose = () => {
    if (!this.open) return;
    const inside = focusWithin(this);
    const from = this.cameFrom;
    this.open = false;
    if (inside) returnFocus(from, this);
    this.cameFrom = null;
    this.dispatchEvent(new CustomEvent('dismiss', { bubbles: true }));
  };

  /**
   * CLO-21: announced once — through the live region of its politeness, a frame after both were emptied, so that a text
   * equal to the last one is announced again. Nothing is announced while it is not live, not open or empty. The two
   * regions carry `aria-live` and no role: the role is the host's, and a note must not hold an empty alert.
   */
  private announce() {
    cancelAnimationFrame(this.pending);
    const regions = [...(this.renderRoot?.querySelectorAll('.announce') ?? [])];
    for (const region of regions) region.textContent = '';
    if (!this.live || !this.open || this.empty) return;
    this.pending = requestAnimationFrame(() => {
      const region = this.renderRoot.querySelector(this.assertive ? '.announce[aria-live="assertive"]' : '.announce[aria-live="polite"]');
      if (region && this.live && this.open && !this.empty) region.textContent = this.announcement;
    });
  }

  /** CLO-21: a change of the title or the body while it is shown; what changes inside a glyph or an action is not one. */
  private readonly onContent = (records: MutationRecord[]) => {
    const SLOTS = '[slot="icon"], [slot="actions"]';
    const apart = (element: Element | null) => {
      const mark = element?.closest(SLOTS);
      return !!mark && mark !== this && this.contains(mark);
    };
    const touched = (record: MutationRecord) => {
      if (apart(record.target instanceof Element ? record.target : record.target.parentElement)) return false;
      if (record.type !== 'childList' || record.target !== this) return true;
      return [...record.addedNodes, ...record.removedNodes].some((node) => !(node instanceof Element && (node.slot === 'icon' || node.slot === 'actions')));
    };
    if (this.presented && records.some(touched)) this.announce();
  };

  private watchContent() {
    if (this.live && this.isConnected && typeof MutationObserver !== 'undefined') {
      if (this.content$) return;
      this.content$ = new MutationObserver(this.onContent);
      this.content$.observe(this, { childList: true, characterData: true, subtree: true });
    } else {
      this.content$?.disconnect();
      this.content$ = null;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    // CLO-21: one written in the page's markup, or made while the page is still being read, is part of its first
    // presentation and is not announced then; one the product adds later is.
    if (!this.presented) this.announceFirst = !this.upgraded && document.readyState === 'complete';
    if (this.presented) this.watchContent();
    // CLO-10: a close button connected again (the callout was moved) has let go of what it was given; an update gives it
    // its variant and its tone again, after it has connected.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.pending);
    this.content$?.disconnect();
    this.content$ = null;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the right parts: the light-DOM children are there before a slot says so.
    if (!this.hasUpdated) this.scan();
    // CLO-12: closed by the product while focus is inside it (the close button's own path has already moved it).
    if (changed.has('open') && !this.open && this.hasUpdated && focusWithin(this)) {
      returnFocus(this.cameFrom, this);
      this.cameFrom = null;
    }
    // CLO-31: neither a title nor a body, no callout.
    try {
      if (this.empty) this.internals?.states.add('empty');
      else this.internals?.states.delete('empty');
    } catch {
      // A browser without custom states: the empty callout is a block of no height.
    }
  }

  protected override updated(changed: PropertyValues) {
    const has = (name: string) => changed.has(name);
    const shown = this.open && !this.empty;
    const title = this.hasTitle ? this.slottedTitle : null;
    // CLO-7, CLO-20: the product's title names the callout from where it is; it needs an id to be named by.
    if (title && !title.id) title.id = `tanrei-callout-title-${++titles}`;
    const statusLabel = this.form !== 'default' ? this.statusLabel.trim() : '';
    // CLO-20, CLO-21: a note, or — live — a live region by its status. The announcement is made by the live region in
    // the shadow root, once (announce()), so the host's own role does not announce a second time. Named by its title,
    // or by statusLabel without one. Closed or empty it exposes nothing (CLO-13, CLO-31).
    hostAria(this, {
      role: shown ? (this.live ? (this.assertive ? 'alert' : 'status') : 'note') : null,
      'aria-live': shown && this.live ? 'off' : null,
      'aria-labelledby': shown && title ? title.id : null,
      'aria-label': shown && !title ? this.headline.trim() || statusLabel || null : null,
    });
    this.watchContent();

    // CLO-21: shown after its first presentation, or its title, body or status changed while shown.
    if (this.live) {
      const first = !this.presented;
      const opened = has('open') && this.open && !first;
      const altered = !first && (has('headline') || has('status') || has('statusLabel') || has('hasTitle') || has('hasBody'));
      if ((first && this.announceFirst) || opened || altered) this.announce();
    }
    if (has('open') && !this.open) this.announce();
    this.presented = true;

    // CLO-10: the close button's variant, as the system names it now (a system switch is seen at the next update), and on
    // a filled look the tone of the form — given through the Button's channel; everything else is the Button's own.
    const button = this.renderRoot.querySelector('tanrei-button.close');
    if (button) {
      giveVariant(button, compChoice(this, `${PREFIX}-close-button-variant`, BUTTON_VARIANTS));
      giveTone(button, toneOf(this.variant, this.form));
    }

    // CLO-30: a status this spec does not have is drawn as default. (An unknown size or variant is the axes' to report.)
    if (has('status') && this.status !== 'default' && !isStatus(this.status)) {
      report(this, 'CLO-30', `status "${this.status}" is not a status of a callout; it is drawn as "default"`);
    }
    // CLO-31: what a debug build tells the product.
    if (this.empty && (has('headline') || has('hasTitle') || has('hasBody'))) {
      report(this, 'CLO-31', 'the callout has no title and no body, so it draws nothing; a glyph, actions or a close button alone are not a notice');
    }
    if (!this.empty && this.form !== 'default' && !this.titled && !this.statusLabel.trim()) {
      report(this, 'CLO-31', `status is "${this.form}" but the callout has no title and status-label is empty, so the status is not given in words; give it a title that says it, or a status-label`);
    }
    if ((has('closable') || has('closeLabel')) && this.closable && this.words.lacks('closeLabel', this.closeLabel)) {
      report(this, 'CLO-31', 'closable is set but close-label is empty, so the close button has no accessible name; give it a close-label');
    }
    if ((has('statusLabel') || has('status')) && this.statusLabel.trim() && this.form === 'default') {
      report(this, 'CLO-31', `status-label "${this.statusLabel}" is ignored while status is default; give the callout a status, or put the words in its title`);
    }
  }

  protected override render() {
    const form = this.form;
    const empty = this.empty;
    const headline = this.headline.trim();
    // CLO-5, CLO-6: the status's glyph, unless the product gave one; none without a status.
    const own = form !== 'default' && !this.hasIcon ? GLYPHS[form] : '';
    // CLO-20: the status in words, then the title and the body — phrases of one text ("Warning, …"). Not while status is default.
    const statusLabel = form !== 'default' ? this.statusLabel.trim() : '';
    return html`
      <div
        part="container"
        class="container ${classMap({ 'has-lead': !!own || this.hasIcon, titled: this.titled, 'has-body': this.hasBody, 'has-actions': this.hasActions, closable: this.closable })}"
        data-tanrei-shape
        ?hidden=${empty}
        @slotchange=${this.onSlotChange}
      >
        <span class="lead" aria-hidden="true">
          <span part="icon" class="icon ${classMap({ own: !!own })}">${own ? html`<span class="ink">${own}</span>` : nothing}<slot name="icon"></slot></span>
        </span>
        <div class="text">
          ${statusLabel ? html`<span class="status-label">${statusLabel}, </span>` : nothing}
          <div part="title" class="title">${headline && !this.hasTitle ? html`<span class="headline">${this.headline}</span>` : nothing}<slot name="title"></slot></div>
          <div part="body" class="body"><slot></slot></div>
          <div part="actions" class="actions"><slot name="actions"></slot></div>
        </div>
        ${this.closable
          ? html`<span class="end"
              ><tanrei-button part="close-button" class="close" size="small" label=${this.words.get('closeLabel', this.closeLabel).trim()} @click=${this.onClose}
                ><span slot="icon">close</span></tanrei-button
              ></span
            >`
          : nothing}
      </div>
      <div class="announce" aria-live="polite" aria-atomic="true"></div>
      <div class="announce" aria-live="assertive" aria-atomic="true"></div>
    `;
  }
}

if (!customElements.get('tanrei-callout')) customElements.define('tanrei-callout', TanreiCallout);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-callout': TanreiCallout;
  }
}
