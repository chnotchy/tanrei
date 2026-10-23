import type { PropertyDeclarations, PropertyValues } from 'lit';
import { AvailabilityController, SEPARATIONS, SEPARATION_VALUES, type SeparationProp, compChoice, report, styleQueries } from '../../primitives/index.js';
import { debugBuild } from '../../primitives/report.js';
import type { TanreiFigureVariantRegistry } from '../../registry.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';
import { TanreiLightElement } from '../../primitives/element.js';

/** The core looks (outlined, filled, plain), plus any a design system's generated `.d.ts` registers. */
export type TanreiFigureVariant = keyof TanreiFigureVariantRegistry;
/** How the parts inside the frame are told apart (FIG-12): `auto` takes `comp.figure.separation`. */
export type TanreiFigureSeparation = SeparationProp;
/** The ground pattern behind what is shown (FIG-26). */
export type TanreiFigurePattern = 'none' | 'grid' | 'dots' | 'grid-fade' | 'checkerboard';
const PATTERNS: readonly string[] = ['none', 'grid', 'dots', 'grid-fade', 'checkerboard'];
/** The figures that draw a pattern, as figure.css selects them. */
const PATTERNED = `:is(${PATTERNS.slice(1).map((pattern) => `[pattern='${pattern}']`).join(', ')})`;

// The text of src/styles/figure.css — the stylesheet that draws the figure — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. A build that wrote nothing
// leaves it empty, and the figure is then drawn by the page's own copy of `@tanrei/web/figure.css` alone.
declare const TANREI_FIGURE_CSS: string;
const FIGURE_CSS: string = (() => {
  try {
    return TANREI_FIGURE_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-figure';
const PREFIX = '--tanrei-comp-figure';
const CORE_VARIANTS: readonly string[] = ['outlined', 'filled', 'plain'];
const DEFAULT_VARIANT = 'outlined';
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** What stands in a figure in place of a stage element, and is then its own stage. */
const PICTURES = 'img, picture, video, svg, canvas';
/** Children of the element that are not content: the figure itself, and what a page or a framework writes beside it. */
const UNDRAWN = ['figure', 'style', 'script', 'template', 'link', 'meta'];
/** The parts a child of the element names with `slot`, for a figure the element builds. */
const SLOTS = ['title', 'actions', 'caption', 'attachment'] as const;
type Slot = (typeof SLOTS)[number];
/** What is left to scroll below this is none: boxes are laid out on fractions of a pixel. */
const SLACK = 1;

type Root = Document | ShadowRoot;

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
      // A browser that cannot construct it: the page's own copy of figure.css draws the figure.
    }
    sheets.set(id, made);
  }
  return made;
}

/**
 * FIG-24: a look a design system added — the default's rules with that look's fill, which is also the ground a
 * pattern is drawn on (FIG-26), read on the stage. In no cascade layer, so that it also wins over a copy of figure.css
 * a page loads into a layer of its own.
 */
const variantRules = (variant: string) => {
  const fill = `var(${PREFIX}-${variant}-container-color, var(${PREFIX}-${DEFAULT_VARIANT}-container-color))`;
  const stages = `:is([data-part='stage'], img, picture, video, svg, canvas)`;
  return `:where(${TAG}[variant='${variant}']) { --_figure-fill: ${fill}; }
:where(${TAG}[variant='${variant}']${PATTERNED}) > :where(figure) > :where([data-part='frame']) > :where(${stages}),
:where(${TAG}[variant='${variant}']${PATTERNED}) > :where(figure) > :where(${stages}) { --_figure-ground: ${fill}; }`;
};

/** Writes an attribute only when it differs: what is written here is observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

const filled = (element: Element | null | undefined): element is HTMLElement => !!element && (element.childElementCount > 0 || (element.textContent ?? '').trim() !== '');

let ids = 0;
const idOf = (element: Element, part: string) => (element.id ||= `tanrei-figure-${part}-${++ids}`);

/**
 * Sets one thing to look at — a picture, a chart, a specimen, a live example — on a stage of its own, framed or not,
 * with a caption that says what it shows, and optionally a title with the product's controls above and a joined block
 * beneath. It is never pressed and has no state; what stands in it stays as operable as it is anywhere else.
 *
 * Contract: specs/figure.spec.json. The element has **no shadow root**: it is the box around a native `<figure>`,
 * which stays in the document — read without script, by a crawler and by a reader mode.
 *
 * ```html
 * <tanrei-figure>
 *   <figure>
 *     <div data-part="frame">
 *       <header>
 *         <p data-part="title">Variants</p>
 *         <div data-part="actions"><tanrei-button variant="text" label="Open in a new tab"><span slot="icon">open_in_new</span></tanrei-button></div>
 *       </header>
 *       <div data-part="stage"><tanrei-button>Save</tanrei-button></div>
 *       <div data-part="attachment">…a code block, a table, a description list…</div>
 *     </div>
 *     <figcaption>A filled button, as the default system draws it.</figcaption>
 *   </figure>
 * </tanrei-figure>
 * ```
 *
 * Every part but the stage is optional. The title is any element with `data-part="title"` — a `<p>`, or the heading
 * the page's outline needs, whose role and level are kept — and the attachment any element with
 * `data-part="attachment"`, the product's own component included. A lone `<img>`, `<picture>`, `<video>`, `<svg>` or
 * `<canvas>` in place of the stage element is its own stage, and one written as a child of the `<figure>` itself —
 * `<figure><img …><figcaption>…</figcaption></figure>`, as a Markdown renderer writes it — is its own frame.
 *
 * Everything drawn is `@tanrei/web/figure.css` — every value a `--tanrei-comp-figure-*` token — which draws the figure
 * before and without this script, so a page of figures does not move when the script arrives; the element adds the
 * same sheet to the root it is connected to, so it also works inside another component's shadow root. The script adds
 * what a stylesheet cannot: the title as the figure's name and the caption as its description where it has both, the
 * caption as its name where it has no title (a browser does not name a figure by its `<figcaption>`), and `label` as
 * its name where it draws neither; while the stage scrolls sideways it is a focus stop and a group with the
 * figure's name, and Home and End take it to either end; and the debug reports.
 *
 * **A figure the element builds.** A `<tanrei-figure>` that holds no `<figure>` is given one: its children become the
 * stage, except those that name a part with `slot` (`title`, `actions`, `caption`, `attachment`), and `headline` and
 * `caption` are written as the title and the caption. That form is drawn when the element is defined, not before; and
 * a framework that owns the element's children (React) must write the parts itself, because the element moves them.
 *
 * @tag tanrei-figure
 * @slot - The native `<figure>` — a frame (`data-part="frame"`) around an optional `<header>`, the stage (`data-part="stage"`) and an optional attachment, then an optional `<figcaption>` — or, for a figure the element builds, what is shown. A child in the document, not a slotted node: the element has no shadow root.
 * @slot title - For a figure the element builds: the product's own title content in place of `headline` (text with inline content, or a heading of the level the page's outline needs). In the native form it is the element with `data-part="title"`.
 * @slot actions - For a figure the element builds: the controls at the end of the header. In the native form they are the children of the element with `data-part="actions"`.
 * @slot caption - For a figure the element builds: the product's own caption content in place of `caption`. In the native form it is the `<figcaption>`.
 * @slot attachment - For a figure the element builds: the block joined under the stage. In the native form it is the element with `data-part="attachment"`.
 */
export class TanreiFigure extends TanreiLightElement {
  private readonly availability = new AvailabilityController(this, 'figure');

  static override properties: PropertyDeclarations = {
    headline: { type: String },
    caption: { type: String },
    label: { type: String },
    // The defaults are not reflected: a figure that is defined is the figure that was written.
    variant: { type: String, reflect: true, useDefault: true },
    // An HTML boolean attribute cannot default to true: the attribute is the inverse, `flush` (the spec's web notes).
    inset: {
      attribute: 'flush',
      reflect: true,
      converter: { fromAttribute: (value: string | null) => value === null, toAttribute: (value: boolean) => (value ? null : '') },
    },
    separation: { type: String, reflect: true, useDefault: true },
    pattern: { type: String, reflect: true, useDefault: true },
  };

  /**
   * The title: a short line above the stage that names what is shown ("Variants", "Revenue by quarter"). Plain text,
   * never a heading; an element with `data-part="title"` in the figure is drawn in its place. It is the figure's
   * accessible name. (`headline`, because HTML's global `title` would show a tooltip over the whole figure.)
   */
  headline = '';

  /** The caption: the text below the frame that says what is shown. A `<figcaption>` written in the figure is drawn in its place. The figure's name where there is no title, and its description where there is one. */
  caption = '';

  /** The accessible name of a figure that draws neither a title nor a caption. Never drawn; ignored where a title or a caption is given. */
  label = '';

  /** How the stage is set apart: `outlined` is the surface inside one hairline, `filled` a quiet tone and no edge, `plain` no fill, no edge, no padding and no line. A design system may add values. */
  variant: TanreiFigureVariant = 'outlined';

  /** Whether the stage is padded inside the frame. False (the `flush` attribute) lets a picture, a chart or a map reach the frame's edges, clipped by its corners. The plain look is never padded. */
  inset = true;

  /** How the parts inside the frame are told apart: `divider` draws a line under the header and above the attachment, `gap` draws none and stands the attachment inside the frame; `auto` takes `comp.figure.separation`, the design system's answer. */
  separation: TanreiFigureSeparation = 'auto';

  /** The ground pattern behind what is shown, across the stage: `none`, `grid` (lines), `dots` (a dot grid), `grid-fade` (the grid, clear around the centre) or `checkerboard` (where a picture may be transparent). Decoration only; the plain look and forced colors draw none. */
  pattern: TanreiFigurePattern = 'none';

  /**
   * One observer of sizes for every figure of the page, so that the figures whose stages change size in one frame —
   * every figure of a page when it is first laid out, or when the window or the text size changes — are reported, and
   * measured, together (`measureDue`).
   */
  private static readonly owners = new WeakMap<Element, TanreiFigure>();
  private static readonly resizes =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          for (const entry of entries) {
            const figure = TanreiFigure.owners.get(entry.target);
            if (figure) TanreiFigure.due.add(figure);
          }
          TanreiFigure.measureDue();
        });
  /** The figures to measure in the next frame (`measureLater`), and the frame asked for. */
  private static readonly due = new Set<TanreiFigure>();
  private static frame = 0;
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  /** The stage the figure has now, and what the observer of sizes watches: the stage and what stands in it. */
  private stage: HTMLElement | null = null;
  private readonly watched = new Set<Element>();
  /** The title and the caption this element wrote for `headline` and `caption`. */
  private ownTitle: HTMLElement | null = null;
  private ownCaption: HTMLElement | null = null;
  /** What this element wrote on the figure to name it, and on the stage to make it a focus stop: only that is taken off again. */
  private readonly named = new Set<string>();
  private readonly stop = new Set<string>();

  /** No shadow root: the figure is the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('figure', () => FIGURE_CSS), '--_figure-fill');
    this.mutations?.observe(this, { childList: true, subtree: true, characterData: true });
    this.addEventListener('keydown', this.keyed);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.keyed);
    // What it watched is let go; what it wrote on its stage stays its own, to be taken off if it is connected again.
    for (const element of this.watched) {
      TanreiFigure.resizes?.unobserve(element);
      TanreiFigure.owners.delete(element);
    }
    this.watched.clear();
    this.mutations?.disconnect();
    TanreiFigure.due.delete(this);
    if (TanreiFigure.frame && !TanreiFigure.due.size) {
      cancelAnimationFrame(TanreiFigure.frame);
      TanreiFigure.frame = 0;
    }
  }

  protected override updated(changed: PropertyValues) {
    // FIG-12: a separation the figure does not define is auto (no rule matches the attribute); a debug build says so.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'FIG-12', `separation "${this.separation}" is not a value the figure defines; it is drawn as "auto"`);
    }
    // FIG-26: a pattern the figure does not define draws none (no rule draws it); a debug build says so.
    if (changed.has('pattern') && !PATTERNS.includes(String(this.pattern ?? ''))) {
      report(this, 'FIG-26', `pattern "${this.pattern}" is not a value the figure defines; no pattern is drawn`);
    }
    if (changed.has('variant')) this.readVariant();
    this.read();
  }

  /**
   * FIG-24: a look the core does not have was added by a design system — its rule is added to the root, falling back
   * to the default's tokens — or is unknown to the active one, which a debug build says.
   */
  private readVariant() {
    const variant = String(this.variant ?? '');
    if (CORE_VARIANTS.includes(variant)) return;
    const known = KEY.test(variant);
    if (known) adopt(this.getRootNode() as Root, sheet(`variant:${variant}`, () => variantRules(variant)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-${variant}-container-color`).trim() === '') {
      report(this, 'FIG-24', `variant "${variant}" is not a value of the active design system; it is drawn as "${DEFAULT_VARIANT}"`);
    }
  }

  private within<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return this.querySelector<T>(`:scope > figure${selector}`);
  }

  /**
   * Reads the figure the box holds and writes what follows from it: the parts of a figure the element builds, the
   * title and the caption the properties ask for, the name, the separation where the browser cannot query it — then
   * asks to be measured. Called when a property changes and when the figure's content does (FIG-17); it writes only
   * what differs, so it settles.
   */
  private read() {
    if (!this.isConnected) return;
    this.build();
    const figure = this.within('');
    if (figure) {
      this.readText(figure);
      // FIG-12: where the browser answers style queries the stylesheet reads the choice itself, and nothing is written.
      mark(figure, 'data-separation', styleQueries() ? null : compChoice(this, '--_figure-separation', SEPARATIONS));
    }
    const stage = this.within(' > [data-part="frame"] > [data-part="stage"]') ?? this.within(' > [data-part="stage"]');
    this.stage = stage;
    this.watch(stage);
    // FIG-25: a stage that holds nothing but white space shows nothing (a stage that is missing or empty is the stylesheet's).
    const shows = filled(stage) || !!this.within(` > :is(${PICTURES})`) || !!this.within(` > [data-part="frame"] > :is(${PICTURES})`);
    mark(this, 'data-empty', shows ? null : '');
    if (figure) this.readName(figure, shows);
    if (debugBuild() && !shows) {
      // A figure that is still being parsed is read again when it is whole.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.read(), { once: true });
      else report(this, 'FIG-25', 'the figure shows nothing: its stage is empty, so nothing is drawn (a title, a caption or an attachment alone is not a figure)');
    }
    this.measureLater();
  }

  /**
   * A figure the element builds: where it holds no `<figure>`, one is written around its children — those that name a
   * part with `slot` go to that part, everything else is the stage — and children added later go the same way.
   */
  private build() {
    const loose = [...this.childNodes].filter((node) =>
      node instanceof Element ? !UNDRAWN.includes(node.localName) : node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
    );
    if (!loose.length) return;
    const figure = this.within('') ?? this.appendChild(document.createElement('figure'));
    const frame = this.frame(figure);
    for (const node of loose) {
      const slot = node instanceof Element ? (node.getAttribute('slot') as Slot | null) : null;
      if (slot === 'caption') ([...figure.querySelectorAll<HTMLElement>(':scope > figcaption')].find((caption) => caption !== this.ownCaption) ?? figure.appendChild(document.createElement('figcaption'))).append(node);
      else if (slot === 'title' || slot === 'actions') this.headerPart(frame, slot).append(node);
      else if (slot === 'attachment') (frame.querySelector<HTMLElement>(':scope > [data-part="attachment"]') ?? frame.appendChild(this.made('div', 'attachment'))).append(node);
      else this.stageOf(frame).append(node);
    }
  }

  private made(name: string, part: string) {
    const element = document.createElement(name);
    element.setAttribute('data-part', part);
    return element;
  }

  /** The frame of a figure, written around its stage where the figure has none and a part needs one. */
  private frame(figure: HTMLElement): HTMLElement {
    const frame = figure.querySelector<HTMLElement>(':scope > [data-part="frame"]');
    if (frame) return frame;
    const made = this.made('div', 'frame');
    const stage = figure.querySelector(`:scope > :is([data-part="stage"], ${PICTURES})`);
    figure.prepend(made);
    if (stage) made.append(stage);
    return made;
  }

  private stageOf(frame: HTMLElement): HTMLElement {
    const stage = frame.querySelector<HTMLElement>(':scope > [data-part="stage"]');
    if (stage) return stage;
    const made = this.made('div', 'stage');
    const attachment = frame.querySelector(':scope > [data-part="attachment"]');
    if (attachment) attachment.before(made);
    else frame.append(made);
    return made;
  }

  /** The header's title or actions, written where the frame has none: the title first, the actions after it. */
  private headerPart(frame: HTMLElement, part: 'title' | 'actions'): HTMLElement {
    const header = frame.querySelector<HTMLElement>(':scope > header') ?? (frame.insertBefore(document.createElement('header'), frame.firstChild) as HTMLElement);
    const existing = header.querySelector<HTMLElement>(`:scope > [data-part="${part}"]`);
    if (existing && existing !== this.ownTitle) return existing;
    const made = this.made('div', part);
    if (part === 'title') header.prepend(made);
    else header.append(made);
    return made;
  }

  /**
   * FIG-8, FIG-10: the title `headline` asks for and the caption `caption` asks for, as text. Where the figure holds
   * a title or a caption of the product's own, that one is drawn and the property ignored.
   */
  private readText(figure: HTMLElement) {
    if (this.ownTitle && !this.ownTitle.isConnected) this.ownTitle = null;
    if (this.ownCaption && !this.ownCaption.isConnected) this.ownCaption = null;
    const titles = [...figure.querySelectorAll<HTMLElement>(':scope > [data-part="frame"] > header > [data-part="title"]')].filter((title) => title !== this.ownTitle);
    if (this.headline && !titles.some(filled)) {
      if (!this.ownTitle) {
        const frame = this.frame(figure);
        const header = frame.querySelector(':scope > header') ?? frame.insertBefore(document.createElement('header'), frame.firstChild);
        this.ownTitle = this.made('p', 'title');
        header.prepend(this.ownTitle);
      }
      if (this.ownTitle.textContent !== this.headline) this.ownTitle.textContent = this.headline;
    } else if (this.ownTitle) {
      this.ownTitle.remove();
      this.ownTitle = null;
    }
    const captions = [...figure.querySelectorAll<HTMLElement>(':scope > figcaption')].filter((caption) => caption !== this.ownCaption);
    if (this.caption && !captions.some(filled)) {
      this.ownCaption ??= figure.appendChild(document.createElement('figcaption'));
      if (this.ownCaption.textContent !== this.caption) this.ownCaption.textContent = this.caption;
    } else if (this.ownCaption) {
      this.ownCaption.remove();
      this.ownCaption = null;
    }
  }

  private titleOf(figure: HTMLElement) {
    return [...figure.querySelectorAll<HTMLElement>(':scope > [data-part="frame"] > header > [data-part="title"]')].find(filled) ?? null;
  }

  private captionOf(figure: HTMLElement) {
    return [...figure.querySelectorAll<HTMLElement>(':scope > figcaption')].find(filled) ?? null;
  }

  /**
   * FIG-16: the name. The title where the figure has one, with the caption as its description; the caption where it
   * has no title — written too: a browser does not name a figure by its `<figcaption>` in the tree it gives assistive
   * technology — unless the product wrote a label on the figure itself, which a labelling element would take the
   * place of; `label` where it draws neither; and a figure with none of the three has no name, which a debug build
   * says.
   */
  private readName(figure: HTMLElement, shows: boolean) {
    const [title, caption] = [this.titleOf(figure), this.captionOf(figure)];
    const labelled = figure.hasAttribute('aria-label') && !this.named.has('aria-label');
    const wanted: Record<string, string | null> = {
      'aria-labelledby': title ? idOf(title, 'title') : caption && !labelled ? idOf(caption, 'caption') : null,
      'aria-describedby': title && caption ? idOf(caption, 'caption') : null,
      // FIG-25: `label` is ignored where a title or a caption is given.
      'aria-label': !title && !caption && this.label ? this.label : null,
    };
    this.give(figure, this.named, wanted);
    if (shows && !title && !caption && !this.label && !figure.hasAttribute('aria-label') && !figure.hasAttribute('aria-labelledby')) {
      report(this, 'FIG-16', 'the figure has no name; give it a title, a caption, or a label where it draws neither');
    }
  }

  /** Writes `wanted` on `element`, leaving alone what the product wrote there itself, and takes off only what `own` says this element wrote. */
  private give(element: Element, own: Set<string>, wanted: Record<string, string | null>) {
    for (const [attribute, value] of Object.entries(wanted)) {
      if (value === null) {
        if (own.delete(attribute)) element.removeAttribute(attribute);
      } else if (own.has(attribute) || !element.hasAttribute(attribute)) {
        mark(element, attribute, value);
        own.add(attribute);
      }
    }
  }

  /** The stage and what stands in it are what the sizes are read from (FIG-5): content can outgrow a stage that stays as it is. */
  private watch(stage: HTMLElement | null) {
    const wanted = new Set<Element>(stage ? [stage, ...stage.children] : []);
    for (const element of this.watched) {
      if (!wanted.has(element)) {
        TanreiFigure.resizes?.unobserve(element);
        TanreiFigure.owners.delete(element);
        this.watched.delete(element);
      }
    }
    for (const element of wanted) {
      if (!this.watched.has(element)) {
        TanreiFigure.owners.set(element, this);
        TanreiFigure.resizes?.observe(element);
        this.watched.add(element);
      }
    }
    if (!stage) this.stop.clear();
  }

  /** Asks for the figure to be measured in the next frame, with every other figure that asks before it. */
  private measureLater() {
    TanreiFigure.due.add(this);
    TanreiFigure.frame ||= requestAnimationFrame(() => {
      TanreiFigure.frame = 0;
      TanreiFigure.measureDue();
    });
  }

  /** Measures every figure that asked to be, now, and leaves none asking. */
  private static measureDue() {
    if (TanreiFigure.frame) {
      cancelAnimationFrame(TanreiFigure.frame);
      TanreiFigure.frame = 0;
    }
    const figures = [...TanreiFigure.due].filter((figure) => figure.isConnected && figure.stage);
    TanreiFigure.due.clear();
    // Every stage is read first — one layout for them all — and then each figure writes.
    const scrolls = figures.map((figure) => figure.stage!.scrollWidth - figure.stage!.clientWidth > SLACK);
    figures.forEach((figure, index) => figure.giveStop(figure.stage!, scrolls[index]));
  }

  /**
   * FIG-6: while the stage scrolls sideways it is one stop in the focus order and a group with the figure's name, and
   * neither otherwise; it writes attributes of the stage alone. Measured once a frame for every figure that was read,
   * or whose stage or what stands in it changed size, all of them together (`measureDue`): a figure that measured
   * itself in its own update, after the figure before it had written its name, had the page laid out for itself.
   */
  private giveStop(stage: HTMLElement, scrolls: boolean) {
    const figure = this.within('');
    const [title, caption] = figure ? [this.titleOf(figure), this.captionOf(figure)] : [null, null];
    const named = title ?? caption;
    const label = figure?.getAttribute('aria-label') ?? null;
    this.give(stage, this.stop, {
      tabindex: scrolls ? '0' : null,
      role: scrolls ? 'group' : null,
      'aria-labelledby': scrolls && named ? idOf(named, named === title ? 'title' : 'caption') : null,
      'aria-label': scrolls && !named && label ? label : null,
    });
  }

  /**
   * FIG-6: the arrow keys scroll a focused stage as the browser scrolls a region; Home and End, which a browser gives
   * to the page's own scroll, take the stage to its start and its end.
   */
  private readonly keyed = (event: KeyboardEvent) => {
    const stage = this.stage;
    if (!stage || event.target !== stage || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'Home' && event.key !== 'End') return;
    const range = stage.scrollWidth - stage.clientWidth;
    if (range <= SLACK) return;
    event.preventDefault();
    const end = getComputedStyle(stage).direction === 'rtl' ? -range : range;
    stage.scrollLeft = event.key === 'Home' ? 0 : end;
  };
}

if (!customElements.get('tanrei-figure')) customElements.define('tanrei-figure', TanreiFigure);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-figure': TanreiFigure;
  }
}
