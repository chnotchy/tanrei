import type { PropertyDeclarations, PropertyValues } from 'lit';
import { AvailabilityController, report } from '../../primitives/index.js';
import { debugBuild } from '../../primitives/report.js';
import type { TanreiPageHeaderSizeRegistry } from '../../registry.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';
import { TanreiLightElement } from '../../primitives/element.js';

/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiPageHeaderSize = keyof TanreiPageHeaderSizeRegistry;
/** Where the actions stand (PGH-10): beside the title at the end edge while the head is wide, or below the text at every width. */
export type TanreiPageHeaderActionsPlacement = 'end' | 'below';

// The text of src/styles/page-header.css — the stylesheet that draws the head — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. A build that wrote nothing
// leaves it empty, and the head is then drawn by the page's own copy of `@tanrei/web/page-header.css` alone.
declare const TANREI_PAGE_HEADER_CSS: string;
const HEADER_CSS: string = (() => {
  try {
    return TANREI_PAGE_HEADER_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-page-header';
const PREFIX = '--tanrei-comp-page-header';
const CORE_SIZES: readonly string[] = ['small', 'medium', 'large'];
const DEFAULT_SIZE = 'medium';
const PLACEMENTS: readonly string[] = ['end', 'below'];
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const TITLE = `:scope > :is(${HEADINGS}, [data-part="title"])`;
const DESCRIPTION = ':scope > :is(p:not([data-part]), [data-part="description"])';
const EYEBROW = ':scope > [data-part="eyebrow"]';
/** The mark of a part the element wrote from an attribute: the product's own part takes its place. */
const WRITTEN = 'data-written';

type Root = Document | ShadowRoot;
type Part = 'eyebrow' | 'title' | 'description';

const sheets = new Map<string, CSSStyleSheet>();
/** A stylesheet of the page, made once and shared by every root that needs it. */
function sheet(id: string, text: () => string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === 'undefined') return null;
  let made = sheets.get(id);
  if (!made) {
    made = new CSSStyleSheet();
    try {
      made.replaceSync(text());
    } catch {
      // A browser that cannot construct it: the page's own copy of page-header.css draws the head.
    }
    sheets.set(id, made);
  }
  return made;
}

/**
 * PGH-23: a size a design system added — the default's rules, read from that size's tokens. As the large
 * size does, it is drawn whole at every width: only the core's large size steps down in a narrow head (PGH-12).
 */
const sizeRules = (size: string) => {
  const token = (name: string) => `var(${PREFIX}-${name.replace('*', size)}, var(${PREFIX}-${name.replace('*', DEFAULT_SIZE)}))`;
  return `:where(${TAG}[size='${size}']) { --_pgh-title-font: ${token('title-typescale-*-font')}; --_pgh-title-tracking: ${token('title-typescale-*-letter-spacing')}; --_pgh-title-line: calc(${token('title-typescale-*-font-size')} * ${token('title-typescale-*-line-height')}); --_pgh-description-font: ${token('description-typescale-*-font')}; --_pgh-description-tracking: ${token('description-typescale-*-letter-spacing')}; --_pgh-description-gap: ${token('description-gap-*')}; --_pgh-end: ${token('container-padding-block-end-*')}; }`;
};

/**
 * The sheet of the rules the element writes: one per page, grown as heads need a rule it does not have yet. Its rules
 * are in no cascade layer, so they also win over a copy of page-header.css that a page loads into a layer of its own.
 */
const written = new Set<string>();
function writtenSheet(id: string, rule: () => string): CSSStyleSheet | null {
  const made = sheet('written', () => '');
  if (!made || written.has(id)) return made;
  try {
    made.insertRule(rule(), made.cssRules.length);
    written.add(id);
  } catch {
    // A browser that cannot read the rule draws the head as a page without the script does.
  }
  return made;
}

/**
 * The head of a page's content: the page's title as its heading, with a sentence that says what the page is, a line of
 * facts about it, the actions for the whole page and the way back up above it — in the content, scrolling with it,
 * laid out by its own width, and never a control.
 *
 * Contract: specs/page-header.spec.json. The element has **no shadow root**: it is the box around the page's own
 * elements, which stay in the document. The title is the page's own heading — the `h1` a crawler, a reader mode, a page
 * without script and a screen reader all find — and is never hidden, repeated or given another level.
 *
 * ```html
 * <tanrei-page-header divider>
 *   <tanrei-breadcrumbs label="Breadcrumbs">…</tanrei-breadcrumbs>
 *   <p data-part="eyebrow">Announcements</p>
 *   <h1>Tokens are derived, and design systems are layers</h1>
 *   <p>One value changes in one place, and everything built on it follows.</p>
 *   <div data-part="meta">
 *     <time datetime="2026-09-20">20 September 2026</time>
 *     <span><tanrei-avatar size="small" decorative src="…"></tanrei-avatar> The Tanrei team</span>
 *     <span>4 min read</span>
 *   </div>
 *   <div data-part="actions"><tanrei-button variant="outlined">Edit</tanrei-button><tanrei-button>Share</tanrei-button></div>
 * </tanrei-page-header>
 * ```
 *
 * Parts are found by what they are, among the element's children, and are written in the order they are read
 * (PGH-11): `tanrei-breadcrumbs` or `[data-part="breadcrumbs"]`; `[data-part="eyebrow"]`; the title — the heading
 * (`h1` to `h6`), or `[data-part="title"]` for one that is not a heading; the description — the first `p` without a
 * `data-part`, or `[data-part="description"]`; `[data-part="meta"]`, each of whose element children is one item; and
 * `[data-part="actions"]`.
 *
 * Everything drawn is `@tanrei/web/page-header.css` — every value a `--tanrei-comp-page-header-*` token — which draws
 * the head before and without this script; the element adds the same sheet to the root it is connected to, so it also
 * works inside another component's shadow root. Nothing is shown differently before the element is defined. The
 * script adds two things a reader does not see on a content page: the parts of a head **built by script** —
 * `headline`, `description` and `eyebrow` each write their element where the children have none, the heading at
 * `level` — and the debug reports of PGH-23 and PGH-24. The head takes no input and emits no event.
 *
 * @tag tanrei-page-header
 * @slot - The page's own elements, in reading order: the breadcrumbs, `[data-part="eyebrow"]`, the heading, the description's `p`, `[data-part="meta"]` and `[data-part="actions"]`. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export class TanreiPageHeader extends TanreiLightElement {
  private readonly availability = new AvailabilityController(this, 'page-header');

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    description: { type: String },
    eyebrow: { type: String },
    // The defaults are not reflected: a head that is defined is the head that was written.
    size: { type: String, reflect: true, useDefault: true },
    level: { type: Number },
    actionsPlacement: { type: String, attribute: 'actions-placement', reflect: true, useDefault: true },
    divider: { type: Boolean, reflect: true },
  };

  /** The page's title as plain text, for a head built by script: the element writes the heading where its children have none. A content page writes the heading itself. (HTML's global `title` would show a tooltip over the whole head.) */
  headline = '';

  /** One or two sentences under the title, for a head built by script: the element writes the paragraph where its children have none. */
  description = '';

  /** A few words above the title that say what the page belongs to, written as ordinary words: the head draws the capitals. For a head built by script. */
  eyebrow = '';

  /** What the head opens: `medium` a page, `small` a part of a page, `large` a landing page. It sets the title's and the description's text styles and the spaces that go with them. A design system may add values. */
  size: TanreiPageHeaderSize = 'medium';

  /** The level of the heading the element writes from `headline`, 1 to 6; 0 takes it from the size (1, or 2 for small). A heading the page wrote keeps its own level. */
  level = 0;

  /** Where the actions stand: `end`, beside the title at the end edge while the head is at least `comp.page-header.wide.container-width` wide and below the text while it is narrower; `below`, under the text at every width. */
  actionsPlacement: TanreiPageHeaderActionsPlacement = 'end';

  /** Draws one hairline under the head, for a head above content that is not text. */
  divider = false;

  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  /** PGH-10: watches the actions box, whose rows decide whether the actions wrap. */
  private readonly actionsSize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.readWrap());
  private observedActions: Element | null = null;
  private awaitingParse = false;

  /** No shadow root: the heading is the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('head', () => HEADER_CSS), '--_pgh-title-font');
    this.mutations?.observe(this, { childList: true });
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutations?.disconnect();
    this.actionsSize$?.disconnect();
    this.observedActions = null;
  }

  /**
   * PGH-10: whether the actions wrap onto more than one row, as the `data-actions-wrapped` state attribute: one row
   * stays centred on the title's first line however tall it is; more than one starts at its top and grows the head.
   * Written only when it changes, so a head whose actions are one row is left as it was written.
   */
  private readWrap() {
    const box = this.observedActions;
    const shown = box ? [...box.children].filter((child) => child.getClientRects().length > 0) : [];
    const first = shown[0]?.getBoundingClientRect().top ?? 0;
    const wrapped = shown.some((child) => Math.abs(child.getBoundingClientRect().top - first) > 1);
    if (wrapped !== this.hasAttribute('data-actions-wrapped')) this.toggleAttribute('data-actions-wrapped', wrapped);
  }

  protected override updated(changed: PropertyValues) {
    // PGH-23: an actions placement the spec does not have is `end` (no rule names it); a debug build says so.
    if (changed.has('actionsPlacement') && !PLACEMENTS.includes(this.actionsPlacement)) {
      report(this, 'PGH-23', `actions-placement "${this.actionsPlacement}" is not a value the page header defines; it is drawn as "end"`);
    }
    if (changed.has('size')) this.readSize();
    this.read();
  }

  /**
   * PGH-23: a size the core does not have was added by a design system — its rules are added to the root, falling back
   * to the default's tokens — or is unknown to the active one, which a debug build says.
   */
  private readSize() {
    const size = String(this.size ?? '');
    if (CORE_SIZES.includes(size)) return;
    const known = KEY.test(size);
    if (known) adopt(this.getRootNode() as Root, writtenSheet(`size:${size}`, () => sizeRules(size)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-title-typescale-${size}-font`).trim() === '') {
      report(this, 'PGH-23', `size "${size}" is not a value of the active design system; it is drawn as "${DEFAULT_SIZE}"`);
    }
  }

  /** PGH-2: the level of the heading the element writes: `level`, or the size's — 2 for a part of a page, else 1. */
  private get headingLevel(): number {
    const level = Number(this.level);
    if (level === 0) return this.size === 'small' ? 2 : 1;
    if (Number.isInteger(level) && level >= 1 && level <= 6) return level;
    report(this, 'PGH-23', `level "${String(this.getAttribute('level') ?? this.level)}" is not 0 or a whole number from 1 to 6; the heading takes the level of its size`);
    return this.size === 'small' ? 2 : 1;
  }

  /** The part the page wrote, if it wrote one: the element's own (marked) is not it. */
  private own(selector: string): Element | null {
    return [...this.querySelectorAll(selector)].find((element) => !element.hasAttribute(WRITTEN)) ?? null;
  }

  private writtenPart(part: Part): HTMLElement | null {
    return this.querySelector<HTMLElement>(`:scope > [${WRITTEN}="${part}"]`);
  }

  /**
   * A part named by an attribute, where the page wrote no element for it: written as the element the page would have
   * written, in its place in the reading order (PGH-11), and kept in step with the attribute (PGH-17: at once). The
   * page's own part takes its place, and an empty attribute writes nothing — never an empty heading (PGH-24).
   */
  private write(part: Part, text: string, selector: string, name: string, before: string[]) {
    const existing = this.writtenPart(part);
    const wanted = text !== '' && !this.own(selector);
    if (!wanted) {
      existing?.remove();
      return;
    }
    let element = existing;
    if (!element || element.localName !== name) {
      element = document.createElement(name);
      element.setAttribute(WRITTEN, part);
      if (part === 'eyebrow') element.setAttribute('data-part', 'eyebrow');
      if (existing) existing.replaceWith(element);
      else this.insertBefore(element, before.map((next) => this.querySelector(next)).find(Boolean) ?? null);
    }
    if (element.textContent !== text) element.textContent = text;
  }

  /**
   * Reads what the head holds: writes the parts its attributes name (above), and says what a debug build says of a
   * head it still draws (PGH-24). Called when a property or a child changes; it writes only what differs, so it settles.
   */
  private read() {
    if (!this.isConnected) return;
    const [eyebrow, headline, description] = [this.eyebrow, this.headline, this.description].map((text) => String(text ?? '').trim());
    const META = ':scope > [data-part="meta"]';
    const ACTIONS = ':scope > [data-part="actions"]';
    this.write('eyebrow', eyebrow, EYEBROW, 'p', [TITLE, DESCRIPTION, META, ACTIONS]);
    this.write('title', headline, TITLE, `h${this.headingLevel}`, [DESCRIPTION, META, ACTIONS]);
    this.write('description', description, DESCRIPTION, 'p', [META, ACTIONS]);
    // PGH-10: the actions box is watched for its rows.
    const box = this.querySelector(ACTIONS);
    if (box !== this.observedActions) {
      if (this.observedActions) this.actionsSize$?.unobserve(this.observedActions);
      if (box) this.actionsSize$?.observe(box);
      this.observedActions = box;
      if (!box && this.hasAttribute('data-actions-wrapped')) this.removeAttribute('data-actions-wrapped');
    }
    // What was written here is not a change of the page's: the observer is not told.
    this.mutations?.takeRecords();
    if (!debugBuild()) return;
    // A head that is still being parsed is read again when it is whole.
    if (document.readyState === 'loading') {
      if (!this.awaitingParse) document.addEventListener('DOMContentLoaded', () => ((this.awaitingParse = false), this.read()), { once: true });
      this.awaitingParse = true;
      return;
    }
    if (!this.firstElementChild) return;
    const title = this.querySelector(TITLE);
    if (!title || !title.textContent?.trim()) report(this, 'PGH-24', 'the page header has no title: a head without a title names nothing; write the page’s heading (an h1) among its children');
    else if (!title.matches(`${HEADINGS}, [role="heading"]`)) report(this, 'PGH-24', 'the title is not a heading: it is drawn as the title, and nothing exposes it as one; write it as the page’s heading element (h1 to h6)');
  }
}

if (!customElements.get('tanrei-page-header')) customElements.define('tanrei-page-header', TanreiPageHeader);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-page-header': TanreiPageHeader;
  }
}
