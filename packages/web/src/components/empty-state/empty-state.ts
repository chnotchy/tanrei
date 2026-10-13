import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import {
  AvailabilityController,
  GROUP_ITEM,
  GROUP_PLACE,
  GlyphDrawnController,
  GlyphMirrorController,
  type GroupItem,
  type GroupPlace,
  OpenAxesController,
  type PlacingGroup,
  glyphName,
  report,
} from '../../primitives/index.js';
import type { TanreiEmptyStateSizeRegistry } from '../../registry.js';
import { ALIGNMENTS, AXES, styles } from './empty-state.styles.js';

/** The core sizes (medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiEmptyStateSize = keyof TanreiEmptyStateSizeRegistry;
/** Where the parts stand on the inline axis. A closed set. */
export type TanreiEmptyStateAlign = (typeof ALIGNMENTS)[number];

/** Text as it is read: one run, its white space collapsed. */
const spoken = (text: string | null | undefined) => (text ?? '').replace(/\s+/gu, ' ').trim();

/**
 * EMP-6, EMP-11: what an action is told through the Button's internal channel (src/primitives/group-item.ts) — the one
 * thing a button group's standard item has that a Button alone has not: its label may wrap when its line gives it less
 * than one line needs. First and last, so its hit area reaches as far as it would alone.
 */
const ACTION_PLACE: GroupPlace = { variant: 'standard', first: true, last: true };

/**
 * What stands in the place of content that is not there — a search with no results, a list nobody has added to, a page
 * before its first item: what is missing, why or what to do, and the action that does it. Quiet and flat: no fill, no
 * edge, no elevation.
 *
 * Contract: specs/empty-state.spec.json. `<tanrei-empty-state headline="No projects yet">…</tanrei-empty-state>`: the
 * description is the element's own content (text, with the product's links), the title is the `headline` attribute or
 * the `title` slot, a glyph of the icon set or a picture of the product's own goes in the `media` slot, and the
 * product's Buttons or links in the `actions` slot. Every visual value is a `--tanrei-comp-empty-state-*` token.
 *
 * It is content, read where it stands: no role, no name, no focus, no state. With `live` it is announced once, politely,
 * when it is shown after its page was presented and when its title or description changes — for an empty place that
 * answers what the person just did (a search, a filter). It is never an alert.
 *
 * Every word it draws or exposes is the product's: the element has none of its own.
 *
 * `title` is the `headline` property and attribute, because HTML's global `title` would show a tooltip over the block.
 * The element neither shows nor hides itself: the product puts it there and takes it away.
 *
 * @tag tanrei-empty-state
 * @slot - The description: text, with the product's own links and inline content. Empty draws the title alone.
 * @slot media - A glyph of the system's icon set (its ligature text, in an element), drawn at the media size of the element's size; or a picture or a view of the product's own (an `<img>`, an `<svg>`, any other element), which keeps its own size and colors. Decorative: hidden from assistive technology. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @slot title - The product's own title content in place of `headline`: a heading of the level the page's outline needs, or text with inline content. It is drawn in the title's style; its role and its level are not changed.
 * @slot actions - The product's own Buttons or links, one or two, the main one first, laid out in a row below the text.
 * @csspart container - The block: its paddings and its column.
 * @csspart media - The box the glyph or the picture is drawn in (hidden from assistive technology).
 * @csspart title - The title.
 * @csspart description - The description.
 * @csspart actions - The row of actions.
 */
export class TanreiEmptyState extends LitElement implements PlacingGroup {
  private readonly availability = new AvailabilityController(this, 'empty-state');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    level: { type: Number },
    size: { type: String, reflect: true },
    align: { type: String, reflect: true },
    live: { type: Boolean, reflect: true },
    hasMedia: { state: true },
    mediaIsGlyph: { state: true },
    hasTitle: { state: true },
    hasDescription: { state: true },
    hasActions: { state: true },
  };

  /** What is missing, in a few words, in the product's language ("No results for tokne"): the spec's `title`. Exposed as a heading of the level `level` gives, since it is drawn as one. The `title` slot takes its place where the product needs inline content or a heading element of its own. */
  headline = '';

  /** EMP-4: the level of the heading `headline` is exposed as, 1 to 6 — 2 by default, for the main region of a view under the page's own title. Ignored where the title slot holds the product's own content. */
  level = 2;

  /** Medium is for an empty region inside a view (a list, a table's body, a card, a panel, a search's results); large for a view that is empty as a whole. It changes the room above and below, the glyph's size and the text styles. */
  size: TanreiEmptyStateSize = 'medium';

  /** Where the parts stand on the inline axis: centred, or at the region's start edge with the text aligned there. */
  align: TanreiEmptyStateAlign = 'center';

  /** Whether the empty state is announced: false is content, read where it stands; true is a polite live region, announced once when it is shown after its view was presented and when its text changes. It changes nothing that is drawn. */
  live = false;

  /** Whether the media slot has content. */
  protected hasMedia = false;
  /** Whether what the media slot holds is a glyph's name (and not a picture or a view of the product's own). */
  protected mediaIsGlyph = false;
  /** Whether the title slot has content. */
  protected hasTitle = false;
  /** Whether the default slot has content: an element, or text that is not white space. */
  protected hasDescription = false;
  /** Whether the actions slot has content. */
  protected hasActions = false;

  /** EMP-17: sizes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'empty-state', behavior: 'EMP-17', axes: AXES });

  /**
   * EMP-15: the glyph in the media slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so; `iconGlyph()` draws the mark. The empty state mirrors nothing itself, and a picture holds no
   * name, so it is never marked by the list.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="media"]' });

  /** The glyph box carries `data-drawn` while the icon set can draw its ligature; until then it draws nothing. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.media.glyph') ?? []);

  /** EMP-18: the custom state the styles read to take an empty state that says nothing out of the layout. */
  private readonly internals: ElementInternals | null = typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  /**
   * EMP-9: whether this element was already in the document when it was made — written in the page's markup and
   * upgraded — which is being drawn with the page's first presentation.
   */
  private readonly upgraded = this.isConnected;
  /** EMP-9: whether its first render is announced: it was added by the product after the page was presented. */
  private announceFirst = false;
  /** Whether it has been drawn once: what changes after that is a change. */
  private presented = false;
  private pending = 0;
  /** EMP-10: hears what the product changes in the element's own content — which parts there are, and (live) what they say. */
  private content$: MutationObserver | null = null;
  /** EMP-9: hears the block being shown after it was not laid out (the product's `hidden`, or a hidden ancestor). */
  private shown$: ResizeObserver | null = null;
  /** EMP-9: whether the block was laid out when last heard of; null before the first word. */
  private laidOut: boolean | null = null;
  /** EMP-6: the actions that were told their place. */
  private placed = new Set<Element>();

  private get titled(): boolean {
    return this.hasTitle || this.headline.trim() !== '';
  }

  /** EMP-18: neither a title nor a description — a glyph or actions alone do not tell a person what is missing. */
  private get empty(): boolean {
    return !this.titled && !this.hasDescription;
  }

  /**
   * @internal What a live empty state announces (EMP-9): the title, then the description — and not the names of its
   * actions. Two runs of the product's own words; the element adds none, and no punctuation, between them.
   */
  get announcement(): string[] {
    const title = this.hasTitle ? [...this.children].filter((child) => child.slot === 'title').map((child) => child.textContent).join(' ') : this.headline;
    const description = [...this.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE || (node instanceof Element && !node.slot))
      .map((node) => node.textContent)
      .join(' ');
    return [title, description].map(spoken).filter(Boolean);
  }

  /** @internal EMP-6: where an action stands, for the Button that asks when it connects (src/primitives/group-item.ts); null for anything else. */
  [GROUP_PLACE](child: Element): GroupPlace | null {
    return child.parentElement === this && child.slot === 'actions' ? ACTION_PLACE : null;
  }

  /** What the light DOM holds for each slot, read from the children: they are there before a slot says so. */
  private scan() {
    let media: Element | null = null;
    let title = false;
    let actions = false;
    let description = false;
    for (const node of this.childNodes) {
      if (node instanceof Element) {
        if (node.slot === 'media') media ??= node;
        else if (node.slot === 'title') title ||= spoken(node.textContent) !== '' || node.childElementCount > 0;
        else if (node.slot === 'actions') actions = true;
        else if (!node.slot) description = true;
      } else if (node.nodeType === Node.TEXT_NODE && spoken(node.textContent) !== '') description = true;
    }
    this.hasMedia = !!media;
    // EMP-3: a glyph is given by its name; anything else is a picture or a view of the product's own.
    this.mediaIsGlyph = !!media && glyphName(media) !== null;
    this.hasTitle = title;
    this.hasActions = actions;
    this.hasDescription = description;
    this.place();
  }

  /** EMP-6, EMP-11: every action is told its place, and one that is an action no more is told it has none. */
  private place() {
    const actions = new Set([...this.children].filter((child) => child.slot === 'actions'));
    for (const gone of this.placed) if (!actions.has(gone) && gone.parentElement === this) (gone as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(null);
    for (const action of actions) (action as Element & Partial<GroupItem>)[GROUP_ITEM]?.set(ACTION_PLACE);
    this.placed = actions;
  }

  private get region(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.announce') ?? null;
  }

  /** Empties the live region and forgets an announcement that was about to be made. */
  private silence() {
    cancelAnimationFrame(this.pending);
    this.pending = 0;
    this.region?.replaceChildren();
  }

  /**
   * EMP-9: announced once — through the polite region in the shadow root, a frame after it was emptied, so that a text
   * equal to the last one is announced again. Nothing is announced while it is not live or says nothing. The host has
   * no live role: its own content is not read a second time.
   */
  private announce() {
    this.silence();
    if (!this.live || this.empty || !this.isConnected) return;
    this.pending = requestAnimationFrame(() => {
      this.pending = 0;
      const region = this.region;
      if (!region || !this.live || this.empty) return;
      region.replaceChildren(
        ...this.announcement.map((text) => {
          const run = document.createElement('div');
          run.textContent = text;
          return run;
        }),
      );
    });
  }

  /**
   * EMP-10: a change of the element's own content. Which parts there are is read again; while it is live, a change of
   * the title or the description is announced (EMP-9) — what changes inside the media or an action is not one.
   */
  private readonly onContent = (records: MutationRecord[]) => {
    this.scan();
    if (!this.live || !this.presented) return;
    const APART = '[slot="media"], [slot="actions"]';
    const apart = (element: Element | null) => {
      const mark = element?.closest(APART);
      return !!mark && mark !== this && this.contains(mark);
    };
    const touched = (record: MutationRecord) => {
      if (apart(record.target instanceof Element ? record.target : record.target.parentElement)) return false;
      if (record.type !== 'childList' || record.target !== this) return true;
      return [...record.addedNodes, ...record.removedNodes].some((node) => !(node instanceof Element && (node.slot === 'media' || node.slot === 'actions')));
    };
    if (records.some(touched)) this.announce();
  };

  /** EMP-9: shown after it was not laid out — and nothing was said since — is announced; no longer laid out, it says nothing. */
  private readonly onLaidOut = (entries: ResizeObserverEntry[]) => {
    const box = entries[entries.length - 1]?.contentRect;
    const laidOut = !!box && (box.width > 0 || box.height > 0);
    const before = this.laidOut;
    this.laidOut = laidOut;
    if (before === null || before === laidOut) return;
    if (!laidOut) this.silence();
    else if (!this.pending && !this.region?.hasChildNodes()) this.announce();
  };

  private watch() {
    if (this.isConnected && typeof MutationObserver !== 'undefined' && !this.content$) {
      this.content$ = new MutationObserver(this.onContent);
      this.content$.observe(this, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['slot'] });
    }
    if (this.live && this.isConnected && typeof ResizeObserver !== 'undefined') {
      if (this.shown$) return;
      this.laidOut = null;
      this.shown$ = new ResizeObserver(this.onLaidOut);
      this.shown$.observe(this);
    } else {
      this.shown$?.disconnect();
      this.shown$ = null;
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    // EMP-9: one written in the page's markup, or made while the page is still being read, is part of its first
    // presentation and is not announced then; one the product adds later is — and one it puts back, each time.
    if (!this.presented) this.announceFirst = !this.upgraded && document.readyState === 'complete';
    else {
      this.scan();
      this.watch();
      this.announce();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.silence();
    this.content$?.disconnect();
    this.content$ = null;
    this.shown$?.disconnect();
    this.shown$ = null;
  }

  protected override willUpdate() {
    // The first render already draws the right parts: the light-DOM children are there before a slot says so.
    if (!this.hasUpdated) this.scan();
    // EMP-18: neither a title nor a description, no empty state.
    try {
      if (this.empty) this.internals?.states.add('empty');
      else this.internals?.states.delete('empty');
    } catch {
      // A browser without custom states: the empty state that says nothing is a block of no height.
    }
  }

  protected override updated(changed: PropertyValues) {
    const has = (name: string) => changed.has(name);
    this.watch();

    // EMP-9: shown after its first presentation, or its title or its description changed while shown.
    if (this.live) {
      const first = !this.presented;
      const altered = !first && (has('headline') || has('hasTitle') || has('hasDescription') || has('live'));
      if ((first && this.announceFirst) || altered) this.announce();
    } else if (has('live')) this.announce();
    this.presented = true;

    // EMP-17: an alignment this spec does not have is drawn as center. (An unknown size is the axes' to report.)
    if (has('align') && !(ALIGNMENTS as readonly string[]).includes(this.align)) {
      report(this, 'EMP-17', `align "${this.align}" is not an alignment of an empty state; it is drawn as "center"`);
    }
    // EMP-4: a level that is not one of a heading's is drawn as 2.
    if (has('level') && this.headingLevel !== Number(this.level)) {
      report(this, 'EMP-4', `level "${String(this.getAttribute('level') ?? this.level)}" is not a whole number from 1 to 6; the title is a heading of level 2`);
    }
    // EMP-18: what a debug build tells the product.
    if (has('headline') || has('hasTitle') || has('hasDescription')) {
      if (this.empty) report(this, 'EMP-18', 'the empty state has no title and no description, so it draws nothing; a glyph or actions alone do not tell a person what is missing');
      else if (!this.titled) report(this, 'EMP-18', 'the empty state has a description and no title; say what is missing in the headline attribute or the title slot');
    }
  }

  /** EMP-4: the level of the heading the title is exposed as: `level`, or 2 where it is not a whole number from 1 to 6. */
  private get headingLevel(): number {
    const level = Number(this.level);
    return Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2;
  }

  protected override render() {
    const headline = this.headline.trim();
    return html`
      <div
        part="container"
        class="container ${classMap({ start: this.align === 'start', 'has-media': this.hasMedia, titled: this.titled, 'has-description': this.hasDescription, 'has-actions': this.hasActions })}"
        ?hidden=${this.empty}
      >
        <div part="media" class="media ${this.mediaIsGlyph ? 'glyph' : 'picture'}" aria-hidden="true"><slot name="media"></slot></div>
        <div class="text">
          <div part="title" class="title">${headline && !this.hasTitle ? html`<span class="headline" role="heading" aria-level=${this.headingLevel}>${this.headline}</span>` : nothing}<slot name="title"></slot></div>
          <div part="description" class="description"><slot></slot></div>
        </div>
        <div part="actions" class="actions"><slot name="actions"></slot></div>
        ${this.live ? html`<div class="announce" role="status" aria-atomic="true"></div>` : nothing}
      </div>
    `;
  }
}

if (!customElements.get('tanrei-empty-state')) customElements.define('tanrei-empty-state', TanreiEmptyState);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-empty-state': TanreiEmptyState;
  }
}
