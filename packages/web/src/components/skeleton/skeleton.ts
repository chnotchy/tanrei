import { type PropertyDeclarations, type PropertyValues, ReactiveElement } from 'lit';
import { AvailabilityController, SystemWatchController, VisibilityController, WordsController, report, styleQueries } from '../../primitives/index.js';
import { debugBuild } from '../../primitives/report.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';

// The text of src/styles/skeleton.css — the stylesheet that draws the skeleton — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. A build that wrote nothing
// leaves it empty, and the skeleton is then drawn by the page's own copy of `@tanrei/web/skeleton.css` alone.
declare const TANREI_SKELETON_CSS: string;
const SKELETON_CSS: string = (() => {
  try {
    return TANREI_SKELETON_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-skeleton';
const PLACEHOLDER = 'tanrei-skeleton-placeholder';
const PREFIX = '--tanrei-comp-skeleton';
/** The three shapes (SKL-25: any other is drawn as text). */
const SHAPES: readonly string[] = ['text', 'block', 'circle'];
/** The manners of `comp.skeleton.motion.animation`. The first is the default, and what an unknown name falls back to. */
const MANNERS = ['pulse', 'wave', 'none'] as const;
type Manner = (typeof MANNERS)[number];
/** The names of skeleton.css's animations: the wait that is the show delay, and the two that stir. */
const WAIT = 'tanrei-skeleton-wait';
const STIRS: readonly string[] = ['tanrei-skeleton-pulse', 'tanrei-skeleton-wave'];
/** The most lines skeleton.css reads from `data-lines` itself, and the shadows it holds for them. */
const LINES_IN_SHEET = 24;
/** A text placeholder, as skeleton.css reaches it. */
const TEXT = `.${PLACEHOLDER}:not([data-shape='block'], [data-shape='circle'])`;
/** What the element exposes itself with (SKL-15), and leaves alone where the page wrote it. */
const EXPOSURE = ['role', 'aria-busy', 'aria-label', 'aria-hidden'] as const;

/** SKL-9: an attribute that is empty or does not parse as a finite number is not a number (and is reported). */
const milliseconds = {
  fromAttribute: (value: string | null) => (value === null ? null : value.trim() === '' ? Number.NaN : Number(value)),
};
const usable = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

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
      // A browser that cannot construct it: the page's own copy of skeleton.css draws the skeleton.
    }
    sheets.set(id, made);
  }
  return made;
}

/**
 * The sheet of the rules the element writes: one per page, grown as placeholders need a rule it does not have yet. Its
 * rules are in no cascade layer, so they also win over a copy of skeleton.css that a page loads into a layer of its own.
 */
const written = new Set<string>();
function writtenSheet(id: string, rules: () => string[]): CSSStyleSheet | null {
  const made = sheet('written', () => '');
  if (!made || written.has(id)) return made;
  try {
    for (const rule of rules()) made.insertRule(rule, made.cssRules.length);
    written.add(id);
  } catch {
    // A browser that cannot read the rule draws the placeholder as a page without the script does.
  }
  return made;
}

/** An attribute's value inside a double-quoted string of a selector. */
const quoted = (value: string) => value.replace(/["\\\n\r\f]/g, (char) => `\\${char.codePointAt(0)!.toString(16)} `);

/**
 * SKL-3, SKL-25: the rules of a `data-lines` that skeleton.css does not read — more lines than it holds, or a value
 * that is not a whole number of at least 1, which is drawn as the whole number below it, and as 1 where there is none.
 */
function linesRules(value: string, lines: number): string[] {
  const at = `[data-lines="${quoted(value)}"]`;
  const rules = [`:where(.${PLACEHOLDER}${at}) { --_skl-lines: ${lines}; }`];
  if (lines > LINES_IN_SHEET) {
    const shadows = Array.from({ length: lines - 2 }, (_, k) => `0 calc(${k + 1}lh * clamp(0, var(--_skl-lines) - ${k + 2}, 1)) 0 0 var(--_skl-fill)`);
    // Not in forced colors, where a shadow is not drawn and skeleton.css copies the outline instead.
    rules.push(`@media not (forced-colors: active) { :where(${TEXT}${at})::before { box-shadow: ${shadows.join(', ')}; } }`);
  }
  return rules;
}

/** The lines a `data-lines` is drawn as (SKL-25): the whole number below it, and 1 where it is less than 1 or no number. */
const linesOf = (value: string): number => {
  const lines = value.trim() === '' ? Number.NaN : Number(value);
  return Number.isFinite(lines) && lines >= 1 ? Math.floor(lines) : 1;
};

/** Writes an attribute only when it differs: what is written here is observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Writes a custom property of an element's own style only when it differs. */
function write(element: HTMLElement, name: string, value: string | null) {
  if (value === null) {
    if (element.style.getPropertyValue(name) !== '') element.style.removeProperty(name);
  } else if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
}

/** A hundredth of a pixel is as fine as a layout is. */
const px = (value: number) => `${Math.round(value * 100) / 100}px`;

const cssAnimations = (element: Element, names: readonly string[]) =>
  typeof element.getAnimations === 'function' ? element.getAnimations().filter((animation): animation is CSSAnimation => 'animationName' in animation && names.includes((animation as CSSAnimation).animationName)) : [];

/** True while the element is being defined: the skeletons connected then were in the page before the script. */
let defining = false;

/**
 * Stands where content will be while it loads: quiet placeholders in the shape of what is coming — lines of text, a
 * block, a circle — that keep the box the content will take, in a region that says once that it is busy.
 *
 * Contract: specs/skeleton.spec.json. The element has **no shadow root**: it is the box around the product's own
 * layout, and a placeholder is the product's own empty element with the class `tanrei-skeleton-placeholder`.
 *
 * ```html
 * <tanrei-skeleton label="Loading the author">
 *   <div class="byline">
 *     <span class="tanrei-skeleton-placeholder" data-shape="circle" style="block-size: 40px"></span>
 *     <div>
 *       <p><span class="tanrei-skeleton-placeholder" style="inline-size: 10rem"></span></p>
 *       <p><span class="tanrei-skeleton-placeholder" data-lines="2"></span></p>
 *     </div>
 *   </div>
 * </tanrei-skeleton>
 * ```
 *
 * A placeholder: `data-shape` (`text`, the default and what an unknown value draws; `block`; `circle`), `data-lines`
 * (text: how many lines) and the CSS properties `inline-size` and `block-size` for its sizes. A text placeholder takes
 * the text style of where it stands — the inherited `font` — so it goes where the text will be, and is exactly its
 * lines high. Placeholders that are the skeleton's own children are stacked, `container.gap` apart; anything else is
 * the product's own layout inside the skeleton.
 *
 * Everything drawn is `@tanrei/web/skeleton.css` — every value a `--tanrei-comp-skeleton-*` token — which draws the
 * skeleton before and without this script: the shapes, the show delay (the skeleton is hidden for its length, with its
 * box kept), the pulse, stillness under reduced motion, outlines in forced colors. The element adds the same sheet to
 * the root it is connected to, and what a stylesheet cannot say: once the delay has passed it is a progressbar with no
 * value (`role="progressbar"`, `aria-busy="true"`, `aria-label` from `label`, else from the product's words,
 * `loadingLabel`) — unless `decorative`, or inside another skeleton, when it is kept from assistive technology
 * (`aria-hidden="true"`); what it holds is `inert`; its animation is held while it cannot be seen; a wave, which has to
 * be measured, is drawn (before the element is defined a wave is a pulse); and a debug build reports what it ignored.
 * A page that must be right before its script runs writes `role`, `aria-busy` and `aria-label` itself, and the element
 * leaves what it finds.
 *
 * Insert it when the wait starts and remove it when the wait ends. It takes no input and emits no event.
 *
 * @tag tanrei-skeleton
 * @slot - The placeholders — empty elements with `class="tanrei-skeleton-placeholder"` — alone or inside a layout of the product's own. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export class TanreiSkeleton extends ReactiveElement {
  private readonly availability = new AvailabilityController(this, 'skeleton');

  static override properties: PropertyDeclarations = {
    label: { type: String },
    decorative: { type: Boolean, reflect: true },
    showDelay: { attribute: 'show-delay', converter: milliseconds },
  };

  /**
   * What is loading, in the product's language ("Loading projects"): the name assistive technology is given for the
   * whole skeleton, once. Never drawn. Left empty, it reads the product's words (`loadingLabel`). Not read while
   * `decorative` is true.
   */
  label = '';

  /**
   * Whether something else already says this wait: a loading indicator beside it, a status text, a region the product
   * itself exposes as busy and names. True keeps the whole skeleton from assistive technology; it changes nothing that
   * is drawn.
   */
  decorative = false;

  /**
   * How long, in milliseconds, it waits from its insertion before it is drawn and exposed; 0 shows it as it is
   * inserted. Null takes `motion.show-delay`, as does a negative or non-finite value (reported). A page that is drawn
   * before its script runs writes `show-delay="0"`, which the stylesheet reads; any other number is the element's.
   */
  showDelay: number | null = null;

  private readonly words = new WordsController(this);
  /** SKL-14: the placeholders stir only while the skeleton can be seen. */
  private readonly visibility = new VisibilityController(this);
  /** SKL-12: the manner is read again when the document's root switches the design system. */
  private readonly system = new SystemWatchController(this);

  /** SKL-7, SKL-8: false during the show delay. */
  private shown = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** The attributes of `EXPOSURE` the page wrote itself: found at the first insertion, and never touched. */
  private authored: Set<string> | null = null;
  /** The attributes of `EXPOSURE` the element wrote. */
  private readonly exposed = new Set<string>();
  /** The children the element made inert (SKL-19). */
  private readonly inerted = new WeakSet<Element>();
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.changed(records));
  /** A wave is measured again when the skeleton or a placeholder changes size. */
  private readonly sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());
  private waving = false;

  /** No shadow root: what the skeleton holds is the document's. */
  protected override createRenderRoot() {
    return this;
  }

  /** The skeletons inserted in this turn (`beginTogether`), and those whose manner is read after their update (`stirTogether`). */
  private static readonly beginning = new Set<TanreiSkeleton>();
  private static readonly stirring = new Set<TanreiSkeleton>();

  /**
   * Every skeleton of one turn in ONE microtask after it: what each asks of the cascade is read for them all, and only
   * then does each write what follows. A skeleton that read in its own insertion and in its own update — its delay,
   * the stylesheet's wait, the manner — after the attributes the one before it had just written had the page styled
   * for itself, twice (fifty inserted at once: about a hundred style passes).
   */
  private static together(due: Set<TanreiSkeleton>, each: TanreiSkeleton, run: (all: TanreiSkeleton[]) => void) {
    if (!due.size) {
      queueMicrotask(() => {
        const all = [...due].filter((skeleton) => skeleton.isConnected);
        due.clear();
        run(all);
      });
    }
    due.add(each);
  }

  override connectedCallback() {
    clearTimeout(this.timer);
    this.timer = undefined;
    const atOnce = usable(this.showDelay) && this.showDelay <= 0;
    if (atOnce) {
      // SKL-8: no delay — shown at once, and nothing is asked of the cascade for it.
      TanreiSkeleton.beginning.delete(this);
      this.setAttribute('data-clocked', '');
    } else {
      // SKL-7: it waits from this moment — nothing is drawn — and how long is read with every other skeleton inserted
      // in this turn, before the element's own first update (which `super` asks for) and before any frame.
      // Not a skeleton that was in the page before the element was defined: the stylesheet has been counting its
      // wait and may have shown it, and nothing it draws may change (SKL-6) — it is only read.
      this.shown = false;
      if (!defining) this.setAttribute('data-waiting', '');
      TanreiSkeleton.together(TanreiSkeleton.beginning, this, (all) => {
        const read = all.map((skeleton) => skeleton.beginning());
        all.forEach((skeleton, index) => skeleton.begin(read[index]));
      });
    }
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('skeleton', () => SKELETON_CSS), '--_skl-gap');
    this.authored ??= new Set(EXPOSURE.filter((name) => this.hasAttribute(name)));
    if (atOnce) this.show();
    else if (!defining) this.expose();
    this.mutations?.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-shape', 'data-lines', 'style'] });
    this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // SKL-11: removed during the delay, it has shown nothing; removed while shown, it is gone at once.
    clearTimeout(this.timer);
    this.timer = undefined;
    this.shown = false;
    TanreiSkeleton.beginning.delete(this);
    TanreiSkeleton.stirring.delete(this);
    this.mutations?.disconnect();
    this.wave(false);
    this.expose();
  }

  /**
   * SKL-7, SKL-9, SKL-11: every insertion waits its whole delay, with the value of that moment. The element counts it
   * (`data-clocked`), so that it is also counted where the skeleton is not rendered (SKL-10) and ends at the same
   * moment for what is drawn and for what is exposed. A skeleton that was in the page before the element was defined
   * has been waiting by the stylesheet's animation: what is left of that wait is counted on, and a skeleton the
   * stylesheet has already shown stays as it is — nothing it draws changes when the element is defined.
   */
  private begin({ token, elapsed, drawn, manner }: ReturnType<TanreiSkeleton['beginning']>) {
    clearTimeout(this.timer);
    this.timer = undefined;
    const delay = usable(this.showDelay) ? this.showDelay : token;
    if (elapsed === null && delay > 0 && drawn) {
      // The stylesheet's wait has run out: the skeleton is drawn, and its placeholders are stirring.
      this.shown = true;
      this.removeAttribute('data-waiting');
      this.expose();
      this.step();
      return;
    }
    this.setAttribute('data-clocked', '');
    if (delay - (elapsed ?? 0) <= 0) {
      this.show(manner);
      return;
    }
    this.shown = false;
    this.setAttribute('data-waiting', '');
    this.expose();
    // SKL-10: a wait, not motion — kept under reduced motion, and counted while the skeleton cannot be seen.
    this.timer = setTimeout(() => this.show(), delay - (elapsed ?? 0));
  }

  /**
   * The reading half of `begin()`: the delay the tokens name, how long the stylesheet's wait has run (null: there is
   * none, or the element counts already), whether a skeleton that has no wait is drawn, and the manner. It writes nothing.
   */
  private beginning(): { token: number; elapsed: number | null; drawn: boolean; manner: Manner } {
    const style = getComputedStyle(this);
    const token = (Number.parseFloat(style.transitionDelay) || 0) * 1000;
    const [wait] = this.hasAttribute('data-clocked') ? [] : cssAnimations(this, [WAIT]);
    const elapsed = wait ? Number(wait.currentTime) || 0 : null;
    // Asked only of a skeleton that waits and has no wait of the stylesheet's: it needs a layout.
    const delay = usable(this.showDelay) ? this.showDelay : token;
    const drawn = !wait && !this.hasAttribute('data-clocked') && delay > 0 && this.getClientRects().length > 0;
    return { token, elapsed, drawn, manner: this.manner(style) };
  }

  /** SKL-8: shown — drawn at once, exposed, and stirring from the beginning of a pulse. */
  private show(manner?: Manner) {
    this.timer = undefined;
    this.shown = true;
    this.removeAttribute('data-waiting');
    this.expose();
    // The manner: as it was read with the delay, or read with every other skeleton shown or updated in this turn.
    if (manner) this.stir(manner);
    else this.stirTogether();
  }

  private stirTogether() {
    TanreiSkeleton.together(TanreiSkeleton.stirring, this, (all) => {
      const manners = all.map((skeleton) => skeleton.manner());
      all.forEach((skeleton, index) => skeleton.stir(manners[index]));
    });
  }

  /** Whether this skeleton stands inside another (SKL-17), through shadow roots. */
  private nested(): boolean {
    for (let at: Node | null = this.parentNode; at; at = at instanceof ShadowRoot ? at.host : at.parentNode) {
      if (at instanceof Element && at.localName === TAG) return true;
    }
    return false;
  }

  /**
   * SKL-15, SKL-17, SKL-18: once shown, one busy progressbar with no value, named by `label` or by the product's
   * words; kept from assistive technology while decorative or nested; and nothing while it waits, when it is hidden,
   * or while it holds no placeholder (SKL-26).
   * An attribute the page wrote itself is left as it was found.
   */
  private expose() {
    const silent = this.decorative || this.nested();
    // SKL-26: a skeleton that holds no placeholder exposes nothing (the stylesheet draws nothing of it).
    const said = this.shown && !silent && this.querySelector(`.${PLACEHOLDER}`) !== null;
    const name = said ? this.words.get('loadingLabel', this.label) : '';
    this.give('role', said ? 'progressbar' : null);
    this.give('aria-busy', said ? 'true' : null);
    this.give('aria-label', name || null);
    this.give('aria-hidden', this.shown && silent ? 'true' : null);
    // SKL-18: still drawn and still exposed, without a name. (A page that named it itself has named it.)
    if (said && !name && !this.authored?.has('aria-label') && this.isConnected) {
      this.words.missing('loadingLabel', { prop: 'label', id: 'SKL-18', effect: 'the skeleton is exposed as a progressbar without a name' });
    }
  }

  private give(name: (typeof EXPOSURE)[number], value: string | null) {
    if (this.authored?.has(name)) return;
    if (value === null) {
      if (this.exposed.delete(name)) this.removeAttribute(name);
    } else {
      this.exposed.add(name);
      if (this.getAttribute(name) !== value) this.setAttribute(name, value);
    }
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SKL-9: a value it cannot use takes the token, and is reported.
    const value = this.showDelay;
    if (changed.has('showDelay') && value !== null && value !== undefined && !usable(value)) {
      const attribute = this.getAttribute('show-delay');
      const given = Number.isNaN(value) && attribute !== null ? `"${attribute}"` : String(value);
      report(this, 'SKL-9', `showDelay ${given} is not a finite, non-negative number of milliseconds; it takes comp.skeleton.motion.show-delay`);
    }
  }

  protected override updated() {
    // SKL-24: a new label or `decorative` is exposed at once; neither the delay nor the animation starts again.
    if (this.isConnected) this.expose();
    mark(this, 'data-paused', this.visibility.visible ? null : '');
    // The manner is read for every skeleton updated in this turn, after their updates, and then written.
    this.stirTogether();
  }

  /** SKL-12, SKL-25: the manner the tokens name now, read from the cascade; a name the skeleton does not know is a pulse. */
  private manner(style = getComputedStyle(this)): Manner {
    const named = style.getPropertyValue(`${PREFIX}-motion-animation`).trim();
    if ((MANNERS as readonly string[]).includes(named)) return named as Manner;
    if (named !== '') report(this, 'SKL-25', `comp.skeleton.motion.animation "${named}" is not pulse, wave or none; the skeleton pulses`);
    return MANNERS[0];
  }

  /** What the stylesheet cannot read or measure of the manner: its name where there are no style queries, and the wave. */
  private stir(manner = this.manner()) {
    if (!this.isConnected) return;
    // Where the browser answers style queries the stylesheet reads `none` itself, and nothing is written.
    mark(this, 'data-animation', styleQueries() || manner === 'pulse' ? null : manner);
    this.wave(manner === 'wave' && this.shown);
  }

  /** SKL-12, wave: the placeholders are measured against the skeleton, and measured again when a size changes. */
  private wave(on: boolean) {
    if (on === this.waving) {
      if (on) this.measure();
      return;
    }
    this.waving = on;
    this.sizes?.disconnect();
    if (on) {
      this.sizes?.observe(this);
      for (const placeholder of this.placeholders()) this.sizes?.observe(placeholder);
      this.measure();
      this.setAttribute('data-wave', '');
      this.step();
    } else {
      this.removeAttribute('data-wave');
      write(this, '--_skl-wave-size', null);
      for (const placeholder of this.placeholders()) write(placeholder, '--_skl-wave-offset', null);
    }
  }

  /**
   * The skeleton's inline size, and each placeholder's distance from the skeleton's left edge: where the one mask of
   * the wave stands in each of them. Written only where it differs, so it settles; nothing is asked for at rest.
   */
  private readonly measure = () => {
    if (!this.waving || !this.isConnected) return;
    const box = this.getBoundingClientRect();
    if (box.width === 0) return;
    const placeholders = this.placeholders();
    const offsets = placeholders.map((placeholder) => placeholder.getBoundingClientRect().left - box.left);
    write(this, '--_skl-wave-size', px(box.width));
    placeholders.forEach((placeholder, i) => write(placeholder, '--_skl-wave-offset', px(offsets[i])));
  };

  /** The placeholders this skeleton draws: every one in it, those of a skeleton inside it too (it is silent, SKL-17). */
  private placeholders(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(`.${PLACEHOLDER}`)];
  }

  /**
   * SKL-12, SKL-24: every placeholder in step. Placeholders that were there when the skeleton was shown began together;
   * one that was added since, or parsed in a later piece of the page, began when it arrived, and is given the others'
   * beginning. Nothing is restarted.
   */
  private step() {
    if (!this.shown) return;
    const stirring = this.placeholders().flatMap((placeholder) => cssAnimations(placeholder, STIRS));
    if (stirring.length < 2) return;
    void Promise.all(stirring.map((animation) => animation.ready.catch(() => undefined))).then(() => {
      const starts = stirring.map((animation) => animation.startTime).filter((start): start is number => typeof start === 'number');
      if (starts.length < 2) return;
      const first = Math.min(...starts);
      for (const animation of stirring) if (typeof animation.startTime === 'number' && animation.startTime !== first) animation.startTime = first;
    });
  }

  private changed(records: MutationRecord[]) {
    const added = records.some((record) => record.type === 'childList' && record.addedNodes.length > 0);
    this.read();
    // SKL-24, SKL-26: the first placeholder, or the last one gone, is exposed at once.
    if (records.some((record) => record.type === 'childList')) this.expose();
    if (this.waving) {
      for (const placeholder of this.placeholders()) this.sizes?.observe(placeholder);
      this.measure();
    }
    if (added) this.step();
  }

  /**
   * Reads what the skeleton holds and writes what follows from it: `inert` on each of its children (SKL-19), the rule
   * of a `data-lines` the stylesheet does not read (SKL-3), and in a debug build what it ignored (SKL-25, SKL-26).
   * Called when it is inserted and when what it holds changes; it writes only what differs, so it settles.
   */
  private read() {
    if (!this.isConnected) return;
    // SKL-19: nothing the skeleton holds takes focus or input, or is read. On the children, not on the skeleton: an
    // inert element is itself kept from assistive technology, and the skeleton is what is exposed.
    for (const child of this.children) {
      if (child.hasAttribute('inert')) continue;
      child.setAttribute('inert', '');
      this.inerted.add(child);
    }
    const placeholders = this.placeholders();
    for (const placeholder of placeholders) {
      const lines = placeholder.getAttribute('data-lines');
      if (lines === null) continue;
      const drawn = linesOf(lines);
      const inSheet = String(drawn) === lines && drawn <= LINES_IN_SHEET;
      if (!inSheet) adopt(this.getRootNode() as Root, writtenSheet(`lines:${lines}`, () => linesRules(lines, drawn)));
    }
    if (!debugBuild()) return;
    // A skeleton that is still being parsed is read again when it is whole.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.read(), { once: true });
    else this.check(placeholders);
  }

  /** What a debug build says about a skeleton it still draws (SKL-25, SKL-26). */
  private check(placeholders: HTMLElement[]) {
    if (placeholders.length === 0) {
      report(this, 'SKL-26', `the skeleton holds no placeholder (an element with class="${PLACEHOLDER}"), so it draws nothing and exposes nothing; a wait whose shape is not known is a loading indicator's`);
      return;
    }
    for (const placeholder of placeholders) {
      const shape = placeholder.getAttribute('data-shape');
      if (shape !== null && !SHAPES.includes(shape)) report(this, 'SKL-25', `data-shape "${shape}" is not text, block or circle; the placeholder is drawn as text`);
      const lines = placeholder.getAttribute('data-lines');
      if (lines !== null && String(linesOf(lines)) !== lines.trim()) report(this, 'SKL-25', `data-lines "${lines}" is not a whole number of at least 1; the placeholder is drawn with ${linesOf(lines)}`);
      // A size the browser does not take (a negative length, a word that is no size) is left out by its parser: the
      // placeholder is drawn as if none was given.
      const style = placeholder.getAttribute('style') ?? '';
      for (const [, property, given] of style.matchAll(/(?:^|;)\s*(inline-size|block-size)\s*:\s*([^;]+)/g)) {
        if (!CSS.supports(property, given.replace(/!\s*important\s*$/, '').trim())) report(this, 'SKL-25', `${property} "${given.trim()}" is not a size; the placeholder is drawn as if none was given`);
      }
    }
  }
}

if (!customElements.get('tanrei-skeleton')) {
  // The skeletons that are in the page already are upgraded inside this call (`connectedCallback` reads `defining`).
  defining = true;
  try {
    customElements.define('tanrei-skeleton', TanreiSkeleton);
  } finally {
    defining = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-skeleton': TanreiSkeleton;
  }
}
