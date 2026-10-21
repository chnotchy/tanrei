import type { PropertyDeclarations, PropertyValues } from 'lit';
import { AvailabilityController, SEPARATIONS, SEPARATION_VALUES, type SeparationProp, compChoice, report, styleQueries } from '../../primitives/index.js';
import { debugBuild } from '../../primitives/report.js';
import type { TanreiDescriptionListDensityRegistry } from '../../registry.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';
import { TanreiLightElement } from '../../primitives/element.js';

/** How a fact is drawn (DSL-3, DSL-5, DSL-6): the term beside its value, above it, or under it as a figure's label. */
export type TanreiDescriptionListLayout = 'inline' | 'stacked' | 'stat';
/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiDescriptionListDensity = keyof TanreiDescriptionListDensityRegistry;
/** How a fact is told from the fact below it (DSL-13): `auto` takes `comp.description-list.separation`. */
export type TanreiDescriptionListSeparation = SeparationProp;

// The text of src/styles/description-list.css — the stylesheet that draws the list — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. A build that wrote nothing
// leaves it empty, and the list is then drawn by the page's own copy of `@tanrei/web/description-list.css` alone.
declare const TANREI_DESCRIPTION_LIST_CSS: string;
const LIST_CSS: string = (() => {
  try {
    return TANREI_DESCRIPTION_LIST_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-description-list';
const PREFIX = '--tanrei-comp-description-list';
const LAYOUTS: readonly string[] = ['inline', 'stacked', 'stat'];
const CORE_DENSITIES: readonly string[] = ['regular', 'compact'];
const DEFAULT_DENSITY = 'regular';
/** The most columns description-list.css reads from the attribute itself; the element writes the rule of a larger number. */
const COLUMNS_IN_SHEET = 6;
/** The members of the density axis (`dev.tanrei.axes.density.members`) as description-list.css names them. */
const DENSITY_MEMBERS: readonly (readonly [string, string])[] = [
  ['--_dl-fact-gap', 'fact-gap-*'],
  ['--_dl-term-gap', 'term-gap-*'],
  ['--_dl-term-font', 'term-typescale-*-font'],
  ['--_dl-term-tracking', 'term-typescale-*-letter-spacing'],
  ['--_dl-value-font', 'value-typescale-*-font'],
  ['--_dl-value-tracking', 'value-typescale-*-letter-spacing'],
  ['--_dl-stat-font', 'stat-value-typescale-*-font'],
  ['--_dl-stat-tracking', 'stat-value-typescale-*-letter-spacing'],
];
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** The list's own terms and values, grouped or not, as description-list.css reaches them. */
const LIST = `:where(${TAG}) > :where(dl)`;

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
      // A browser that cannot construct it: the page's own copy of description-list.css draws the list.
    }
    sheets.set(id, made);
  }
  return made;
}

/** DSL-23: a density a design system added — the default's rules, read from that density's tokens. */
const densityRules = (density: string) =>
  `:where(${TAG}[density='${density}']) { ${DENSITY_MEMBERS.map(
    ([name, token]) => `${name}: var(${PREFIX}-${token.replace('*', density)}, var(${PREFIX}-${token.replace('*', DEFAULT_DENSITY)}));`,
  ).join(' ')} }`;

/** DSL-7: more columns than the stylesheet reads from the attribute. */
const columnsRule = (columns: number) => `:where(${TAG}[columns='${columns}']) { --_dl-columns: ${columns}; }`;

/**
 * DSL-4: an inline list that is narrower than `width` draws every fact as the stacked layout draws it — the term on
 * lines of its own, its values under it — and the two columns again from that width on. A container query of the list
 * itself, so the browser draws the other form as the list is resized, in the same frame and with no script.
 *
 * DSL-24: never while the list is measured (`data-measuring`). The rule puts every value in the term's column, so a
 * list measured while it is stacked would read its longest value as its widest term and write a width it is always
 * narrower than: it would stay stacked whatever room it is given later.
 */
const stackRule = (width: string) => {
  const list = LIST.replace(TAG, `${TAG}[data-stacks-below='${width}']:not([data-measuring])`);
  return `@container (inline-size < ${width}px) {
  ${list} { grid-template-columns: minmax(0, 1fr); }
  ${list} > :where(div) > :where(dd), ${list} > :where(dd) { grid-column: 1; padding-inline-start: 0; }
  ${list} > :where(dd + dt + dd) { margin-block-start: 0; border-block-start-width: 0; padding-block-start: 0; }
}`;
};

/**
 * The sheet of the rules the element writes: one per page, grown as lists need a rule it does not have yet. Its rules
 * are in no cascade layer, so they also win over a copy of description-list.css that a page loads into a layer of its own.
 */
const written = new Set<string>();
function writtenSheet(id: string, rule: () => string): CSSStyleSheet | null {
  const made = sheet('written', () => '');
  if (!made || written.has(id)) return made;
  try {
    made.insertRule(rule(), made.cssRules.length);
    written.add(id);
  } catch {
    // A browser that cannot read the rule draws the list as a page without the script does.
  }
  return made;
}

/** Writes an attribute only when it differs: what is written here is observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/**
 * Presents what is known about one thing as named facts — a quiet term and the value that answers it — with the terms
 * in one column beside their values, above them, or under a large figure. An order, a file, an account, a component;
 * the few numbers a screen opens with. It is laid out by its own width and is never a control.
 *
 * Contract: specs/description-list.spec.json. The element has **no shadow root**: it is the box around the product's
 * own native `<dl>`, which stays in the document and is never given a role — the description list a screen reader, a
 * crawler and a page without script meet is the browser's own.
 *
 * ```html
 * <tanrei-description-list layout="stacked" columns="3">
 *   <dl>
 *     <div><dt>Category</dt><dd>Actions</dd></div>
 *     <div><dt>Owners</dt><dd>Aiko Tanaka</dd><dd>Samir Haddad</dd></div>
 *     <div><dt>Status</dt><dd><tanrei-tag size="small" status="success" label="Stable"></tanrei-tag></dd></div>
 *   </dl>
 * </tanrei-description-list>
 * ```
 *
 * A fact is a `<div>` around one `<dt>` and its `<dd>`s. The term and each value hold text or any view of the
 * product's; a fact may have several values, and a value may be empty. A `<dl>` without groups — `<dt>` and `<dd>` as
 * its children, as some Markdown renderers write it — is drawn in one column, inline or stacked; `columns` and the
 * stat layout need the groups.
 *
 * Everything drawn is `@tanrei/web/description-list.css` — every value a `--tanrei-comp-description-list-*` token —
 * which draws the list before and without this script; the element adds the same sheet to the root it is connected
 * to, so it also works inside another component's shadow root. The script adds the one thing a stylesheet cannot say:
 * an inline list whose values would be left less than `comp.description-list.column.min-width` draws its terms above
 * their values. The element measures the widest term and writes that width as a container query of the list, so the
 * browser itself draws the other form as the list is resized. Without the script such a list wraps its terms instead.
 * The list takes no input and emits no event.
 *
 * @tag tanrei-description-list
 * @slot - The native `<dl>`: one `<div>` per fact around a `<dt>` and its `<dd>`s. It is a child in the document, not a slotted node: the element has no shadow root.
 */
export class TanreiDescriptionList extends TanreiLightElement {
  private readonly availability = new AvailabilityController(this, 'description-list');

  static override properties: PropertyDeclarations = {
    // The defaults are not reflected: a list that is defined is the list that was written.
    layout: { type: String, reflect: true, useDefault: true },
    columns: { type: Number, reflect: true, useDefault: true },
    density: { type: String, reflect: true, useDefault: true },
    separation: { type: String, reflect: true, useDefault: true },
  };

  /**
   * How a fact is drawn. `inline`: the term beside its value, every term in one column as wide as the widest term; the
   * list draws its terms above their values by itself while it is too narrow for that. `stacked`: the term above its
   * value, for long values or long terms, and for facts in several columns. `stat`: the value first, as a large
   * figure, with the term under it as its label.
   */
  layout: TanreiDescriptionListLayout = 'inline';

  /** The most columns of facts the list draws in the stacked and stat layouts; it draws fewer while it is too narrow for that many, and never more than it has facts. An inline list is one column. */
  columns = 1;

  /** How close the facts are and how large their text is: regular for facts a person reads, compact for facts a person scans. A design system may add values. */
  density: TanreiDescriptionListDensity = 'regular';

  /** How a fact is told from the fact below it: `divider` is one hairline, `gap` empty space and no line; `auto` takes `comp.description-list.separation`, the design system's answer. */
  separation: TanreiDescriptionListSeparation = 'auto';

  /**
   * One observer of sizes for every list of the page, so that the lists that change size in one frame — every list of
   * a page when it is first laid out, or when a reader changes the text size — are reported, and measured, together.
   */
  private static readonly owners = new WeakMap<Element, TanreiDescriptionList>();
  private static readonly resizes =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          TanreiDescriptionList.resized(new Set(entries.map((entry) => TanreiDescriptionList.owners.get(entry.target)).filter((box): box is TanreiDescriptionList => !!box)));
        });
  /** The lists to read in this turn (`read`), and those to read in the next frame (`resized`) with the frame asked for. */
  private static readonly due = new Set<TanreiDescriptionList>();
  private static readonly later = new Set<TanreiDescriptionList>();
  private static frame = 0;

  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.read());
  /** The list the box holds now, and the one the observer of sizes watches. */
  private list: HTMLDListElement | null = null;
  private watched: HTMLDListElement | null = null;

  /** No shadow root: the list is the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('list', () => LIST_CSS), '--_dl-fact-gap');
    this.mutations?.observe(this, { childList: true, subtree: true, characterData: true });
    document.fonts?.addEventListener?.('loadingdone', this.read);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.watch(null);
    this.mutations?.disconnect();
    document.fonts?.removeEventListener?.('loadingdone', this.read);
    TanreiDescriptionList.due.delete(this);
    TanreiDescriptionList.later.delete(this);
    if (TanreiDescriptionList.frame && !TanreiDescriptionList.later.size) {
      cancelAnimationFrame(TanreiDescriptionList.frame);
      TanreiDescriptionList.frame = 0;
    }
  }

  /** The list whose size is watched: the one the box holds, or none. */
  private watch(list: HTMLDListElement | null) {
    if (list === this.watched) return;
    if (this.watched) {
      TanreiDescriptionList.resizes?.unobserve(this.watched);
      TanreiDescriptionList.owners.delete(this.watched);
    }
    if (list) {
      TanreiDescriptionList.owners.set(list, this);
      TanreiDescriptionList.resizes?.observe(list);
    }
    this.watched = list;
  }

  protected override updated(changed: PropertyValues) {
    // DSL-13: a separation the list does not define is auto (no rule matches the attribute); a debug build says so.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'DSL-13', `separation "${this.separation}" is not a value the description list defines; it is drawn as "auto"`);
    }
    // DSL-23: so is a layout the spec does not have — inline, which no rule needs an attribute for.
    if (changed.has('layout') && !LAYOUTS.includes(this.layout)) {
      report(this, 'DSL-23', `layout "${this.layout}" is not a value the description list defines; it is drawn as "inline"`);
    }
    if (changed.has('density')) this.readDensity();
    if (changed.has('columns') || changed.has('layout')) this.readColumns();
    this.read();
  }

  /**
   * DSL-23: a density the core does not have was added by a design system — its rules are added to the root, falling
   * back to the default's tokens — or is unknown to the active one, which a debug build says.
   */
  private readDensity() {
    const density = String(this.density ?? '');
    if (CORE_DENSITIES.includes(density)) return;
    const known = KEY.test(density);
    if (known) adopt(this.getRootNode() as Root, writtenSheet(`density:${density}`, () => densityRules(density)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-fact-gap-${density}`).trim() === '') {
      report(this, 'DSL-23', `density "${density}" is not a value of the active design system; it is drawn as "${DEFAULT_DENSITY}"`);
    }
  }

  /** DSL-7: the columns the list may draw. One for a number that is less than one or not whole, and for an inline list. */
  private readColumns() {
    const columns = Number(this.columns);
    if (!Number.isInteger(columns) || columns < 1) {
      report(this, 'DSL-7', `columns "${String(this.getAttribute('columns') ?? this.columns)}" is not a whole number of at least 1; the list is drawn in one column`);
      return;
    }
    if (columns > 1 && this.layout !== 'stacked' && this.layout !== 'stat') {
      report(this, 'DSL-7', `an inline list has one column; columns ${columns} is drawn as 1 (the stacked and stat layouts draw columns)`);
      return;
    }
    if (columns > COLUMNS_IN_SHEET) adopt(this.getRootNode() as Root, writtenSheet(`columns:${columns}`, () => columnsRule(columns)));
  }

  /**
   * Reads the list the box holds and writes what follows from it: the separation where the browser cannot query it,
   * and the width under which an inline list stacks. Called when a property changes, when the list's content does
   * (DSL-16) and when a face arrives; it writes only what differs, so it settles.
   *
   * Every list that asks in one turn is read in ONE microtask after it (`readTogether`), still in the task that drew
   * them and before any frame: a list that measured its widest term in its own update had the page styled and laid
   * out for itself, twice (fifty lists appended at once: 153 style passes and 103 layouts).
   */
  private readonly read = () => {
    if (!this.isConnected) return;
    const due = TanreiDescriptionList.due;
    if (!due.size) {
      queueMicrotask(() => {
        const boxes = [...due];
        due.clear();
        TanreiDescriptionList.readTogether(boxes);
      });
    }
    due.add(this);
  };

  /**
   * `read()` for every box of a turn: each finds its list and is laid out for measuring; then everything is read —
   * one style pass and one layout for them all; then everything is written.
   */
  private static readTogether(boxes: TanreiDescriptionList[]) {
    const live = boxes.filter((box) => box.isConnected);
    for (const box of live) {
      box.list = box.querySelector<HTMLDListElement>(':scope > dl');
      box.watch(box.list);
    }
    const held = live.map((box) => box.hold());
    const read = live.map((box) => {
      const list = box.list;
      if (!list) return null;
      if (debugBuild()) {
        // A list that is still being parsed is read again when it is whole.
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', box.read, { once: true });
        else box.check(list);
      }
      // DSL-13: where the browser answers style queries the stylesheet reads the choice itself, and nothing is written.
      return { list, separation: styleQueries() ? null : compChoice(box, '--_dl-separation', SEPARATIONS), width: box.measure(list) };
    });
    live.forEach((box, index) => box.release(held[index]));
    live.forEach((box, index) => {
      const each = read[index];
      if (!each) {
        mark(box, 'data-stacks-below', null);
        return;
      }
      mark(each.list, 'data-separation', each.separation);
      box.write(each.width);
    });
  }

  /** What a debug build says about a list it still draws (DSL-7, DSL-11). */
  private check(list: HTMLDListElement) {
    const grouped = !!list.querySelector(':scope > div');
    if (!grouped && list.firstElementChild && (this.layout === 'stat' || Number(this.columns) > 1)) {
      report(this, 'DSL-7', 'the stat layout and columns need each fact in a group: a <div> around its <dt> and its <dd>s; the list is drawn in one column, its terms above their values');
    }
    const untermed = grouped ? list.querySelector(':scope > div:not(:has(> dt)):has(> dd)') : list.firstElementChild?.localName === 'dd' ? list.firstElementChild : null;
    if (untermed) report(this, 'DSL-11', 'a value has no term; it is drawn where it would be, and nothing names it');
  }

  /**
   * DSL-3, DSL-4: for as long as it is held, an inline list is laid out in its two columns with no term wrapped
   * (`data-measuring`), whatever its width — also while it is stacked by its width, whose rule then does not apply
   * (DSL-24) — so that the widest term can be read from the layout itself. Returns whether this call began it (and
   * `release()` ends it). Nothing is painted in between.
   */
  private hold(): boolean {
    if (!this.list || this.layout === 'stacked' || this.layout === 'stat' || this.hasAttribute('data-measuring')) return false;
    this.setAttribute('data-measuring', '');
    return true;
  }

  private release(held: boolean) {
    if (held) this.removeAttribute('data-measuring');
  }

  /**
   * DSL-3, DSL-4: the width under which this list's values would be left less than `column.min-width` — the widest
   * term set on one line, the space between the columns and that least width — or null where the list is not inline
   * or is not drawn. Read while the list is held (`hold()`); it writes nothing.
   */
  private measure(list: HTMLDListElement): string | null {
    if (this.layout === 'stacked' || this.layout === 'stat') return null;
    const style = getComputedStyle(list);
    const [term] = style.gridTemplateColumns.split(' ').map(Number.parseFloat);
    // A list without groups keeps the space between its columns as its values' own padding.
    const value = list.querySelector(':scope > dd');
    const gap = Number.parseFloat(style.columnGap) || (value ? Number.parseFloat(getComputedStyle(value).paddingInlineStart) : 0) || 0;
    const least = Number.parseFloat(style.scrollPaddingTop);
    // Not drawn (no box, or a browser that lays out no grid here): the stylesheet's own form stays.
    if (!Number.isFinite(term) || !Number.isFinite(least)) return null;
    // A hundredth of a pixel is as fine as a layout is.
    return (Math.ceil((term + gap + least) * 100) / 100).toString();
  }

  private write(width: string | null) {
    if (width !== null) adopt(this.getRootNode() as Root, writtenSheet(`stack:${width}`, () => stackRule(width)));
    mark(this, 'data-stacks-below', width);
  }

  /**
   * Lists changed size (DSL-24): their text may have (a reader's text size, a design system switched above them, a
   * face), and with it the widest term. They are measured again here — all held, then all read, one layout for them
   * all — and a width that differs is written in the next frame: a write inside the observer's own callback would
   * change the size it observes and be reported as a loop. Resizing a list alone changes no term, so nothing is
   * written and no frame is asked for: the list's container query draws the other form at the new width.
   */
  private static resized(boxes: Set<TanreiDescriptionList>) {
    const live = [...boxes].filter((box) => box.isConnected && box.list);
    const held = live.map((box) => box.hold());
    const widths = live.map((box) => box.measure(box.list!));
    live.forEach((box, index) => box.release(held[index]));
    const later = TanreiDescriptionList.later;
    live.forEach((box, index) => {
      if (widths[index] !== box.getAttribute('data-stacks-below')) later.add(box);
    });
    if (!later.size || TanreiDescriptionList.frame) return;
    TanreiDescriptionList.frame = requestAnimationFrame(() => {
      TanreiDescriptionList.frame = 0;
      const changed = [...later];
      later.clear();
      for (const box of changed) box.read();
    });
  }
}

if (!customElements.get('tanrei-description-list')) customElements.define('tanrei-description-list', TanreiDescriptionList);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-description-list': TanreiDescriptionList;
  }
}
