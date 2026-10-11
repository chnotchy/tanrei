import { type PropertyDeclarations, type PropertyValues, ReactiveElement } from 'lit';
import {
  AvailabilityController,
  PendingGlyphs,
  PressController,
  SEPARATIONS,
  SEPARATION_VALUES,
  type SeparationProp,
  compChoice,
  isGlyphProbe,
  report,
  styleQueries,
  syncFocusStyle,
} from '../../primitives/index.js';
import { debugBuild } from '../../primitives/report.js';
import { WordsController } from '../../primitives/words.js';
import type { TanreiTableDensityRegistry } from '../../registry.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';

/** The core densities (regular, compact), plus any a design system's generated `.d.ts` registers. */
export type TanreiTableDensity = keyof TanreiTableDensityRegistry;
/** How a row is told from the row next to it (TBL-9): `auto` takes `comp.table.separation`. */
export type TanreiTableSeparation = SeparationProp;
/** The order a sortable column's header asks for (TBL-34). */
export type TanreiTableSortDirection = 'ascending' | 'descending';
/** Whether rows can be chosen (TBL-42): `multiple` draws a checkbox before the first column of every row that has a value. */
export type TanreiTableSelection = 'none' | 'multiple';
/** What `selectionchange` carries: the values of the chosen rows after the change, in row order. */
export interface TanreiTableSelectionChangeDetail {
  values: string[];
}
/** What the `sort` event carries: the column's `data-value` (empty where it has none), its place among the columns of data, from 0, and the direction asked for. */
export interface TanreiTableSortDetail {
  column: string;
  index: number;
  direction: TanreiTableSortDirection;
}

// The text of src/styles/table.css — the stylesheet that draws the table — written in by the build (scripts/build.js),
// so the element can add it to whichever root it is connected to. Read once; a build that wrote nothing leaves it empty,
// and the table is then drawn by the page's own copy of `@tanrei/web/table.css` alone.
declare const TANREI_TABLE_CSS: string;
const TABLE_CSS: string = (() => {
  try {
    return TANREI_TABLE_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-table';
const PREFIX = '--tanrei-comp-table';
const CORE_DENSITIES: readonly string[] = ['regular', 'compact'];
const DEFAULT_DENSITY = 'regular';
/** The members of the density axis (`dev.tanrei.axes.density.members`) as table.css names them. */
const DENSITY_MEMBERS: readonly (readonly [string, string])[] = [
  ['--_table-pad-block', 'cell-padding-block-*'],
  ['--_table-pad-inline', 'cell-padding-inline-*'],
  ['--_table-cell-font', 'cell-text-typescale-*-font'],
  ['--_table-cell-tracking', 'cell-text-typescale-*-letter-spacing'],
  ['--_table-cell-emphasized', 'cell-text-typescale-*-font-weight-emphasized'],
  ['--_table-header-font', 'header-text-typescale-*-font'],
  ['--_table-header-tracking', 'header-text-typescale-*-letter-spacing'],
];
/** The height of a line of a header's label at a density a design system added: its two tokens, multiplied (table.css). */
const DENSITY_LEADING = (density: string) =>
  `--_table-header-leading: calc(var(${PREFIX}-header-text-typescale-${density}-line-height, var(${PREFIX}-header-text-typescale-${DEFAULT_DENSITY}-line-height)) * var(${PREFIX}-header-text-typescale-${density}-font-size, var(${PREFIX}-header-text-typescale-${DEFAULT_DENSITY}-font-size)));`;
/** The control of a sortable column's header, from anything inside it (TBL-32): the product's button, or its anchor. */
const SORT_CONTROL = 'th[aria-sort] > button, th[aria-sort] > a[href]';
/** The same, from its header cell. */
const OWN_CONTROL = ':scope > button, :scope > a[href]';
/** What this element, or a primitive it uses, puts into the table for a moment: a ripple's layer, the box a glyph is measured in. Its coming and going is no change of the table. */
const passing = (node: Node) => isGlyphProbe(node) || (node instanceof Element && node.classList.contains('ripple'));
const passes = (record: MutationRecord) => record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(passing);
/** The glyph whose drawing says that the icon set can draw a sort mark (TBL-56). */
const SORT_GLYPH = 'swap_vert';
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** The sections of a table and their rows, as table.css reaches them. */
const ROWS = ':where(tanrei-table) > :where(table) > :where(thead, tbody, tfoot) > :where(tr)';
/** What the observer re-reads the table for, besides its children. */
const ATTRIBUTES = ['data-align', 'data-wrap', 'align', 'colspan', 'id', 'aria-label', 'aria-labelledby', 'aria-sort', 'data-part', 'data-value', 'data-selected', 'data-placeholder'];
/** The cell that holds a row's checkbox (TBL-42), and the checkbox in it: Tanrei's, or the browser's own. */
const SELECTION_CELL = '[data-part="selection"]';
const CHECKBOX = ':scope > tanrei-checkbox, :scope > input[type="checkbox"]';
/** A checkbox of either kind, as far as the table reads and writes it. */
type Checkbox = HTMLElement & { checked?: boolean; indeterminate?: boolean; disabled?: boolean; label?: string; labelHidden?: boolean };
const isNative = (box: Checkbox): box is HTMLInputElement => box.localName === 'input';
/** Whether a checkbox is checked: its property, or — for an element that is not defined yet — its attribute. */
const checkedOf = (box: Checkbox) => box.checked ?? box.hasAttribute('checked');
/** A Markdown renderer's `align`, read by the layout direction: left and right are start and end. */
const RENDERED_ALIGN: Record<string, string | undefined> = { left: 'start', center: 'center', right: 'end' };
/** A scroll offset, or what is left to scroll, below this is none: boxes are laid out on fractions of a pixel. */
const SLACK = 1;
/** TBL-36: for how long after keyboard focus came to a sort button a scroll is taken for the engine's own, in ms. */
const REVEAL_AGAIN = 250;

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
      // A browser that cannot construct it: the page's own copy of table.css draws the table.
    }
    sheets.set(id, made);
  }
  return made;
}

// The rules the element writes — a density a design system added, a column's alignment by position, the surplus cells
// — are in NO cascade layer: a page may load a copy of table.css into a layer of its own that comes after
// `tanrei.components` (a site whose framework's reset is layered does), and a later layer wins whatever the order of
// the rules, so the copy's `text-align: start` on every cell would undo a column's alignment. They keep no
// specificity, so one class of the product's, outside any layer, still wins. (The description list and the figure
// write theirs the same way.) Each names the cells it styles (`th, td`), so that an engine restyles the cells when the
// wrapper's attribute changes, not everything inside them.

/** TBL-31: a density a design system added — the default's rules, read from that density's tokens. */
const densityRules = (density: string) =>
  `:where(${TAG}[density='${density}']) { ${DENSITY_MEMBERS.map(
    ([name, token]) => `${name}: var(${PREFIX}-${token.replace('*', density)}, var(${PREFIX}-${token.replace('*', DEFAULT_DENSITY)}));`,
  ).join(' ')} ${DENSITY_LEADING(density)} }`;

/**
 * The rules of one column position (TBL-3, TBL-7): its cells take the alignment and the wrapping the column's header
 * cell names — which the element writes on the wrapper as lists of positions — unless a cell names its own.
 */
const columnRules = (position: number) => [
  `:where(${TAG}[data-columns-center~='${position}']) > :where(table) > :where(thead, tbody, tfoot) > :where(tr) > :where(th, td):where(:nth-child(${position}):not([data-align], [align])) { text-align: center; }`,
  `:where(${TAG}[data-columns-end~='${position}']) > :where(table) > :where(thead, tbody, tfoot) > :where(tr) > :where(th, td):where(:nth-child(${position}):not([data-align], [align])) { text-align: var(--_table-end); }`,
  `:where(${TAG}[data-columns-nowrap~='${position}']) > :where(table) > :where(thead, tbody, tfoot) > :where(tr) > :where(th, td):where(:nth-child(${position}):not([data-wrap])) { white-space: nowrap; }`,
];

/** TBL-14: a row draws only as many cells as the table has columns. */
const surplusRule = (columns: number) => `${ROWS.replace(TAG, `${TAG}[data-columns='${columns}']`)} > :where(th, td):where(:nth-child(n + ${columns + 1})) { display: none; }`;

/** The sheet of the rules by position: one per page, grown as tables need a position it does not have yet. */
const positions = { columns: 0, surplus: new Set<number>() };
function positionSheet(columns: number, count: number): CSSStyleSheet | null {
  const made = sheet('positions', () => '');
  if (!made) return null;
  try {
    for (; positions.columns < columns; positions.columns++) for (const rule of columnRules(positions.columns + 1)) made.insertRule(rule, made.cssRules.length);
    if (count > 0 && !positions.surplus.has(count)) {
      made.insertRule(surplusRule(count), made.cssRules.length);
      positions.surplus.add(count);
    }
  } catch {
    // A browser that cannot read a rule draws every cell at the start, as a page without the script does.
  }
  return made;
}

let captions = 0;

/**
 * TBL-26: nothing tells a script that the layout direction it inherits changed, and no engine agrees on what becomes
 * of a scroll offset when it does. The direction comes from a `dir` on an ancestor, so each root a table
 * is in — the document, and every shadow root between it and the document — is watched for that one attribute, by one
 * observer for all its tables.
 */
const turns = new Map<Node, { observer: MutationObserver; tables: Set<TanreiTable> }>();
function rootsOf(element: Element): Node[] {
  const roots: Node[] = [];
  for (let root = element.getRootNode(); ; ) {
    roots.push(root);
    if (!(root instanceof ShadowRoot)) break;
    root = root.host.getRootNode();
  }
  return roots;
}
function watchTurns(table: TanreiTable, roots: Node[]) {
  if (typeof MutationObserver === 'undefined') return;
  for (const root of roots) {
    let watch = turns.get(root);
    if (!watch) {
      const tables = new Set<TanreiTable>();
      const observer = new MutationObserver(() => {
        for (const each of tables) each.turned();
      });
      observer.observe(root, { attributes: true, attributeFilter: ['dir'], subtree: true });
      turns.set(root, (watch = { observer, tables }));
    }
    watch.tables.add(table);
  }
}
function unwatchTurns(table: TanreiTable, roots: Node[]) {
  for (const root of roots) {
    const watch = turns.get(root);
    if (!watch) continue;
    watch.tables.delete(table);
    if (!watch.tables.size) {
      watch.observer.disconnect();
      turns.delete(root);
    }
  }
}

/**
 * What the sizes say is read for every table at once and written for every table after (TBL-19 to TBL-22). A table
 * that measured as soon as it had written made the browser style and lay out the page once per table — and, with the
 * rules by position added to the page's sheet in between, restyle every cell of every table each time: a page of
 * forty tables, forty times. So a table that has written asks for a measure, and the one that asks first starts it:
 * it runs as a microtask, which is after every table that is updated in the same task has written — elements that
 * are defined together, or parsed together, are — and before anything waiting for one of them (`updateComplete`).
 * One observer of sizes serves every table, for the same reason: its entries arrive together.
 */
const unmeasured = new Set<TanreiTable>();
function measureAll(tables: Iterable<TanreiTable>) {
  const read = [...tables].filter((table) => table.isConnected).map((table) => [table, table.sizes()] as const);
  for (const [table, sizes] of read) table.sized(sizes);
}
function measureSoon(table: TanreiTable) {
  if (!unmeasured.size) {
    queueMicrotask(() => {
      const all = [...unmeasured];
      unmeasured.clear();
      measureAll(all);
    });
  }
  unmeasured.add(table);
}
const observed = new WeakMap<Element, TanreiTable>();
const resizes =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        measureAll(new Set(entries.map((entry) => observed.get(entry.target)).filter((table): table is TanreiTable => !!table)));
      });
function observeSize(element: Element, table: TanreiTable) {
  observed.set(element, table);
  resizes?.observe(element);
}
function unobserveSize(element: Element) {
  observed.delete(element);
  resizes?.unobserve(element);
}

/** What a table's box and the table say, read from the layout in one go (`sizes()`), for `sized()` to write. */
interface Sizes {
  scrolls: boolean;
  released: boolean;
  direction: string;
  range: number;
  offset: number;
  top: number;
  /** How far the rows can still scroll down: what lies under a status line (TBL-51). */
  below: number;
  /** The width of the selection column where it is kept in view with the first column (TBL-42); -1 where it is not. */
  selection: number;
}

const list = (positions: number[]) => positions.join(' ');
/** Writes an attribute only when it differs: what is written here is observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/**
 * Presents data that has rows and columns, with named columns, optional row headers, a caption and footer rows.
 * A price list, a comparison, a list of settings, a status of many things. It scrolls in its own box when it does not
 * fit. A column's header can ask for the rows in its order (`sort`); the table itself never sorts, filters, fetches or
 * pages: it draws the rows it is given, in the order it is given them.
 *
 * Contract: specs/table.spec.json. The element has **no shadow root**: it is the scroll box around the product's own
 * native table, which stays in the document and is never given another `display` — its semantics, a crawler's reading,
 * copy and paste as a table and a screen reader's table navigation are the browser's own.
 *
 * ```html
 * <tanrei-table density="compact" row-headers sticky-first-column>
 *   <table>
 *     <caption>Visits by region</caption>
 *     <thead><tr><th scope="col">Region</th><th scope="col" data-align="end" data-wrap="false">January</th></tr></thead>
 *     <tbody><tr><th scope="row">Islands</th><td>212</td></tr></tbody>
 *     <tfoot><tr><th scope="row">All regions</th><td>6,846</td></tr></tfoot>
 *   </table>
 * </tanrei-table>
 * ```
 *
 * A column is a `<th scope="col">` of the `<thead>` row: its text is the header, `data-align="start | center | end"`
 * says where the column's cells sit and `data-wrap="false"` keeps them on one line. A row is a `<tr>`; a footer row is
 * a `<tr>` in `<tfoot>`. A cell is a `<td>`, or a `<th scope="row">` for the header of its row, and holds text, any
 * view of the product's, or nothing. A cell may name its own `data-align` and `data-wrap`; a Markdown renderer's
 * `align` is read as well (left and right as start and end).
 *
 * Everything drawn is `@tanrei/web/table.css` — every value a `--tanrei-comp-table-*` token — which draws the table
 * before and without this script; the element adds the same sheet to the root it is connected to, so it also works
 * inside another component's shadow root. The script adds what a stylesheet cannot: while the box scrolls it is a
 * focus stop and a region with the table's name (`tabindex`, `role`, `aria-labelledby` or `aria-label`), and the
 * arrow keys, Page Up, Page Down, Home and End scroll it as the browser scrolls a region; a hairline along an inline
 * edge of the box says that columns lie beyond it; a column's alignment reaches its cells; a first column that is kept
 * in view lets go where it would take more than half of the box.
 *
 * A column that can be sorted: its header cell says the order the rows are in — `aria-sort="none"`, `"ascending"` or
 * `"descending"` — and holds the product's own `<button type="button">` around the header's text; `data-value` on the
 * cell is the name the event carries. The stylesheet makes the whole cell the button and draws the mark from the
 * attribute. A press emits `sort` with the direction asked for and changes nothing: the product orders its rows and
 * writes `aria-sort`. A table ordered by the server holds an `<a href>` to the same table in the other order in place of
 * the button; it works without script, and `sort` is then cancelable.
 *
 * ```html
 * <th scope="col" aria-sort="ascending" data-value="name"><button type="button">Name</button></th>
 * ```
 *
 * No rows: `<tbody><tr data-part="empty"><td colspan="3">…</td></tr></tbody>`, holding the product's Empty state (or
 * its sentence, in an element). The status line: `<div data-part="status"><p role="status">1–20 of 132</p>…</div>`
 * after the table, inside the element, holding the product's sentence and its pagination; the `status` attribute is a
 * convenience that writes the paragraph.
 *
 * Rows that can be chosen: `selection="multiple"`, and a first cell `<td data-part="selection">` in every row — in the
 * header row holding the checkbox for every row, in a body row that has a `data-value` holding that row's checkbox
 * (`<tanrei-checkbox label-hidden label="Select Kettle">`, or a native `<input type="checkbox" aria-label="…">`), and
 * empty in a footer row, a placeholder row and a row that cannot be chosen. A chosen row carries `data-selected`. The
 * table holds the selection: a change of a checkbox writes `data-selected` on its row and emits `selectionchange`
 * with the values of the chosen rows; the product writes `data-selected` to choose a row itself, and nothing is
 * emitted for it. The header's checkbox is kept checked, mixed or unchecked, disabled with no row to choose, and named
 * by `select-all-label` or the product's words (`selectAllLabel`). A row's checkbox that has no name of its own is
 * named by the row's header cell. The table stays a table: no grid, no selected state on a row.
 *
 * ```html
 * <tanrei-table selection="multiple" row-headers select-all-label="Select all products">
 *   <table>
 *     <thead><tr><td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td><th scope="col">Name</th></tr></thead>
 *     <tbody><tr data-value="kettle" data-selected>
 *       <td data-part="selection"><tanrei-checkbox label-hidden checked></tanrei-checkbox></td><th scope="row">Kettle</th>
 *     </tr></tbody>
 *   </table>
 * </tanrei-table>
 * ```
 *
 * Loading: `loading` says that the product is fetching rows. The table is exposed as busy (`aria-busy` on the table)
 * and draws what it is given — the rows it had, or rows `<tr data-placeholder aria-hidden="true">` whose cells are empty
 * or hold a Skeleton's placeholder (`<span class="tanrei-skeleton-placeholder"></span>`). Nothing is dimmed or disabled.
 *
 * Without a sortable column and with `selection` none the table takes no input and emits no event.
 *
 * A table inside a cell is the product's content and is not drawn by this one. Cells that span (`colspan`, `rowspan`)
 * and a second header row work as HTML does and take the same cell styles.
 *
 * @tag tanrei-table
 * @fires sort - The user pressed the header of a sortable column. `detail`: `{ column, index, direction }` — the header cell's `data-value`, its place among the columns of data (from 0) and the direction asked for (`ascending`, or `descending` where the rows ascend by it). The table changes nothing. Cancelable where the control is an anchor: cancelled, the link is not followed.
 * @fires selectionchange - The user changed which rows are chosen, by a row's checkbox or by the header's. `detail`: `{ values }` — the `data-value` of every chosen row after the change, in row order. Not emitted for what the product writes.
 * @slot - The native `<table>`: an optional `<caption>`, a `<thead>` of one row of `<th scope="col">`, one or more `<tbody>`, an optional `<tfoot>`. It is a child in the document, not a slotted node: the element has no shadow root.
 * @cssprop --tanrei-comp-table-sticky-container-color - The fill of a header row and a first column that are kept in view: the color of the surface the table sits on. Set it on a table inside a card, a dialog or a sheet.
 */
export class TanreiTable extends ReactiveElement {
  private readonly availability = new AvailabilityController(this, 'table');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);

  static override properties: PropertyDeclarations = {
    caption: { type: String },
    label: { type: String },
    // The defaults are not reflected: a table that is defined is the table that was written.
    density: { type: String, reflect: true, useDefault: true },
    separation: { type: String, reflect: true, useDefault: true },
    striped: { type: Boolean, reflect: true },
    rowHeaders: { type: Boolean, reflect: true, attribute: 'row-headers' },
    stickyHeader: { type: Boolean, reflect: true, attribute: 'sticky-header' },
    stickyFirstColumn: { type: Boolean, reflect: true, attribute: 'sticky-first-column' },
    status: { type: String },
    selection: { type: String, reflect: true, useDefault: true },
    selectAllLabel: { type: String, attribute: 'select-all-label' },
    loading: { type: Boolean, reflect: true },
    sortedAscendingLabel: { type: String, attribute: 'sorted-ascending-label' },
    sortedDescendingLabel: { type: String, attribute: 'sorted-descending-label' },
  };

  /**
   * The name of the table, drawn above it ("Response times by region"); it is also what assistive technology calls the
   * table and its scroll region. A convenience that writes the table's `<caption>`: a `<caption>` written in the
   * markup is the same thing, and is drawn before the element is defined.
   */
  caption = '';

  /** The table's accessible name where no caption is drawn, because a heading just above it already says what it is. Not drawn; ignored where the table has a caption. */
  label = '';

  /** How close the rows are: regular for a table a person reads, compact for one a person scans. A design system may add values. */
  density: TanreiTableDensity = 'regular';

  /** How a row is told from the row next to it: `divider` is one hairline, `gap` empty space and no line; `auto` takes `comp.table.separation`, the design system's answer. */
  separation: TanreiTableSeparation = 'auto';

  /** Fills every second body row with a quiet color, for a wide table of many similar rows. */
  striped = false;

  /** Says that the first column names its rows. Write those cells as `<th scope="row">`; where the rows are plain `<td>` (rendered Markdown) the element draws the first cells as row headers and gives them the role. */
  rowHeaders = false;

  /** Keeps the header row at the top of the table's box while its rows scroll under it. It has an effect only where the layout limits the table's height (`max-block-size` on the element). */
  stickyHeader = false;

  /** Keeps the first column at the start edge while the other columns scroll sideways under it. Released by itself where the column would take more than half of the box. */
  stickyFirstColumn = false;

  /**
   * The product's sentence about what the table shows now ("1–20 of 132"), drawn under the last row and told politely to
   * assistive technology when it changes. A convenience that writes the status line's paragraph: a
   * `<div data-part="status"><p role="status">…</p></div>` written in the markup is the same thing, is drawn before
   * the element is defined, and is then the one that is read.
   */
  status = '';

  /**
   * Whether rows can be chosen. `multiple`: every body row that has a `data-value` and a first cell
   * `<td data-part="selection">` holding a checkbox can be chosen, and the header row's selection cell holds the
   * checkbox for every row. `none` draws no selection column and ignores a row's `data-selected`.
   */
  selection: TanreiTableSelection = 'none';

  /** The accessible name of the header row's checkbox ("Select all rows"). Not drawn. From the product's words (`selectAllLabel`) where the instance gives none. */
  selectAllLabel = '';

  /**
   * Says that the product is fetching the rows. The table is exposed as busy and draws the rows it is given meanwhile —
   * the ones it had, or placeholder rows (`<tr data-placeholder>`); it does not draw the empty content, dims and
   * disables nothing, and fetches nothing itself.
   */
  loading = false;

  /** What a platform with no sort state says after the name of the column the rows ascend by. Accepted and not read on the web: the header cell's `aria-sort` says it. */
  sortedAscendingLabel = '';

  /** What a platform with no sort state says after the name of the column the rows descend by. Accepted and not read on the web: the header cell's `aria-sort` says it. */
  sortedDescendingLabel = '';

  private readonly mutations =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver((records) => {
          if (!records.every(passes)) this.read();
        });
  /** The table the box holds now, and the one the observer of sizes watches. */
  private table: HTMLTableElement | null = null;
  private watched: HTMLTableElement | null = null;
  /** The caption this element wrote for the `caption` property, and the name it wrote on the table for `label`. */
  private ownCaption: HTMLTableCaptionElement | null = null;
  private wroteLabel = false;
  /** The first cells this element gave the row header's role (TBL-6). */
  private readonly rowHeaderCells = new Set<Element>();
  /** What this element wrote on itself to be a focus stop and a region (TBL-22): only that is taken off again. */
  private readonly stop = new Set<string>();
  /** The layout direction and the offset along it when the box last scrolled (TBL-26). */
  private direction: string | null = null;
  private offset = 0;
  private roots: Node[] = [];
  /** The status line the box holds now, and the paragraph this element wrote in it for the `status` property (TBL-51). */
  private statusLine: HTMLElement | null = null;
  private ownStatus: HTMLElement | null = null;
  /** Whether the table has a sort button now: only then does the element listen to anything but its scroll (TBL-16). */
  private sorts = false;
  /** TBL-56: whether the icon set can draw a sort mark. */
  private readonly glyphs = new PendingGlyphs(this, SORT_GLYPH);
  private readonly presses = new WeakMap<HTMLElement, PressController>();
  private readonly pressControllers = new Set<PressController>();
  private held: PressController | null = null;
  private heldControl: HTMLElement | null = null;
  /** The sort button that has focus and its column, to give focus back where a change of rows took the button away (TBL-25, TBL-34). */
  private focusedSort: { control: HTMLElement; index: number } | null = null;
  /** Whether rows can be chosen now: only then does the element listen for a checkbox (TBL-16, TBL-42). */
  private chooses = false;
  /** What each row said of itself when it was last read (TBL-44): a row that says something else was written by the product. */
  private readonly chosen = new WeakMap<HTMLTableRowElement, boolean>();
  /** The checkboxes this element named, with the name it gave: only that is written again or taken away (TBL-46). */
  private readonly named = new WeakMap<Checkbox, string>();
  /** The rows this element hid from assistive technology (TBL-50), and whether it wrote the busy state (TBL-49). */
  private readonly hiddenRows = new Set<HTMLTableRowElement>();
  private busied: HTMLTableElement | null = null;
  /** The checkbox that has focus and its row's value, to give focus back where a change of rows took it away (TBL-25). */
  private focusedBox: { box: Checkbox; value: string | null } | null = null;
  /** Whether the element waits for the Checkbox to be defined, to read the checkboxes again. */
  private awaited = false;

  /** No shadow root: the table is the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('table', () => TABLE_CSS), '--_table-pad-block');
    this.addEventListener('scroll', this.readScroll, { passive: true });
    observeSize(this, this);
    this.mutations?.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRIBUTES });
    this.direction = null;
    this.roots = rootsOf(this);
    watchTurns(this, this.roots);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('scroll', this.readScroll);
    unobserveSize(this);
    if (this.watched) unobserveSize(this.watched);
    unmeasured.delete(this);
    this.mutations?.disconnect();
    this.listen(false);
    this.listenChoices(false);
    this.focusedSort = null;
    this.focusedBox = null;
    unwatchTurns(this, this.roots);
    this.roots = [];
    this.watched = null;
  }

  protected override updated(changed: PropertyValues) {
    // TBL-9: a separation the table does not define is auto (no rule matches the attribute); a debug build says so.
    if (changed.has('separation') && !(SEPARATION_VALUES as readonly string[]).includes(this.separation)) {
      report(this, 'TBL-9', `separation "${this.separation}" is not a value the table defines; it is drawn as "auto"`);
    }
    if (changed.has('density')) this.readDensity();
    // TBL-42: a selection the table does not define is none (no rule matches the attribute); a debug build says so.
    if (changed.has('selection') && this.selection !== 'none' && this.selection !== 'multiple') {
      report(this, 'TBL-42', `selection "${String(this.selection)}" is not a value the table defines; it is drawn as "none"`);
    }
    this.read();
  }

  /**
   * TBL-31: a density the core does not have was added by a design system — its rules are added to the root, falling
   * back to the default's tokens — or is unknown to the active one, which a debug build says.
   */
  private readDensity() {
    const density = String(this.density ?? '');
    if (CORE_DENSITIES.includes(density)) return;
    const known = KEY.test(density);
    if (known) adopt(this.getRootNode() as Root, sheet(`density:${density}`, () => densityRules(density)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-cell-padding-block-${density}`).trim() === '') {
      report(this, 'TBL-31', `density "${density}" is not a value of the active design system; it is drawn as "${DEFAULT_DENSITY}"`);
    }
  }

  /**
   * Reads the table the box holds and writes what follows from it: the caption and the name, the columns' alignment,
   * the row headers of a table of plain cells, the separation where the browser cannot query it — then asks for a
   * measure, which every table of the task shares (`measureSoon`). Called when a property changes and when the
   * table's content does (TBL-25); it writes only what differs, so it settles, its cost is the header row's, not the
   * rows', and it reads nothing of the layout: everything it writes is styled once, with what the other tables wrote.
   */
  private read() {
    if (!this.isConnected) return;
    const table = this.querySelector<HTMLTableElement>(':scope > table');
    this.table = table;
    if (table !== this.watched) {
      if (this.watched) unobserveSize(this.watched);
      if (table) observeSize(table, this);
      this.watched = table;
    }
    if (!table) {
      this.listen(false);
      this.listenChoices(false);
      measureSoon(this);
      return;
    }
    this.readName(table);
    this.readStatus();
    this.readColumns(table);
    this.readSort(table);
    this.readRowHeaders(table);
    this.readLoading(table);
    this.readSelection(table);
    // TBL-9: where the browser answers style queries the stylesheet reads the choice itself, and nothing is written.
    mark(table, 'data-separation', styleQueries() ? null : compChoice(this, '--_table-separation', SEPARATIONS));
    if (debugBuild()) {
      // A table that is still being parsed is read again when it is whole: it may not have its caption yet.
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.read(), { once: true });
      else this.check(table);
    }
    measureSoon(this);
  }

  /** TBL-12, TBL-23: the caption the `caption` property asks for, and the name `label` gives a table without one. */
  private readName(table: HTMLTableElement) {
    if (this.ownCaption && this.ownCaption.parentNode !== table) this.ownCaption = null;
    if (this.caption) {
      const caption = table.caption ?? (this.ownCaption = table.createCaption());
      if (caption === this.ownCaption && caption.textContent !== this.caption) caption.textContent = this.caption;
    } else if (this.ownCaption) {
      this.ownCaption.remove();
      this.ownCaption = null;
    }
    const captioned = !!table.caption?.textContent?.trim();
    // The caption is the name; `label` is ignored where there is one, and never drawn.
    if (this.label && !captioned) {
      mark(table, 'aria-label', this.label);
      this.wroteLabel = true;
    } else if (this.wroteLabel) {
      mark(table, 'aria-label', null);
      this.wroteLabel = false;
    }
  }

  /**
   * TBL-51, TBL-52: the status line the box holds, and the paragraph the `status` property asks for — a status, so
   * that a change of its text is told politely. A paragraph the product wrote is the one that is read, and is left as
   * it is. Emptied, this element's paragraph stays, empty and with no room (table.css): a status that is there before
   * its text is one whose text is told.
   */
  private readStatus() {
    let line = this.querySelector<HTMLElement>(':scope > [data-part="status"]');
    if (this.ownStatus && this.ownStatus.parentElement !== line) this.ownStatus = null;
    if (this.status && !this.ownStatus && !line?.querySelector(':scope > [role="status"]')) {
      if (!line) {
        line = document.createElement('div');
        line.setAttribute('data-part', 'status');
        this.append(line);
      }
      this.ownStatus = document.createElement('p');
      this.ownStatus.setAttribute('role', 'status');
      line.prepend(this.ownStatus);
    }
    if (this.ownStatus && this.ownStatus.textContent !== this.status) this.ownStatus.textContent = this.status;
    this.statusLine = line;
  }

  /**
   * TBL-32, TBL-16: whether a column can be sorted — its header cell names an order and holds a control. Only then
   * does the element listen for a press, register the press's property and ask whether the icon set can draw the mark.
   */
  private readSort(table: HTMLTableElement) {
    let sorts = false;
    for (const cell of table.tHead?.rows[0]?.cells ?? []) {
      if (cell.hasAttribute('aria-sort') && cell.querySelector(OWN_CONTROL)) {
        sorts = true;
        break;
      }
    }
    this.listen(sorts);
    if (sorts) this.keepFocus(table);
  }

  private listen(sorts: boolean) {
    if (sorts === this.sorts) return;
    this.sorts = sorts;
    if (sorts) {
      for (const [type, listener] of this.listeners) this.addEventListener(type, listener);
      this.glyphs.connect();
      this.glyphs.read();
    } else {
      for (const [type, listener] of this.listeners) this.removeEventListener(type, listener);
      this.glyphs.disconnect();
      this.removeAttribute('data-glyphs');
      for (const press of this.pressControllers) press.hostDisconnected();
      this.pressControllers.clear();
      this.held = null;
      this.heldControl = null;
    }
  }

  /** The sort control an event came from, in this table's own header row: a table inside a cell is the product's. */
  private controlOf(target: EventTarget | null): HTMLElement | null {
    const control = target instanceof Element ? target.closest<HTMLElement>(SORT_CONTROL) : null;
    return control && control.closest('table') === this.table && control.parentElement?.parentElement?.parentElement?.localName === 'thead' ? control : null;
  }

  /** The press of one sort button (the shared primitive), made when it is first pressed. A link takes Enter alone. */
  private pressOf(control: HTMLElement): PressController {
    let press = this.presses.get(control);
    if (!press) {
      press = new PressController(control, {
        container: () => control,
        // The control's first transition is the hold (table.css), so its delay is press-hold as a time.
        holdCarrier: () => control,
        disabled: () => control.matches(':disabled'),
        keys: () => (control.localName === 'a' ? ['Enter'] : undefined),
      });
      this.presses.set(control, press);
      this.pressControllers.add(press);
    }
    return press;
  }

  /**
   * The press is this script's from here: the stylesheet's own answer to `:active` stands down for a control that
   * carries `data-pressed`, so the attribute is written before anything reads a style.
   */
  private answered(control: HTMLElement) {
    if (!control.hasAttribute('data-pressed')) control.dataset.pressed = 'none';
  }

  private readonly releasePress = () => {
    this.held?.release();
    this.held = null;
    this.heldControl = null;
  };

  private readonly onPointerDown = (event: Event) => {
    const control = this.controlOf(event.target);
    const pointer = event as PointerEvent;
    if (!control || control.matches(':disabled') || (pointer.button !== 0 && pointer.pointerType === 'mouse')) return;
    this.answered(control);
    this.held = this.pressOf(control);
    this.heldControl = control;
    this.held.onPointerDown(pointer);
  };

  // `pointerleave` is not seen from here: the press ends when the pointer goes out of the control it holds.
  private readonly onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    if (this.heldControl && !(to instanceof Node && this.heldControl.contains(to))) this.releasePress();
  };

  private readonly onKeyDown = (event: Event) => {
    const control = this.controlOf(event.target);
    const key = event as KeyboardEvent;
    if (!control || control.matches(':disabled') || key.repeat) return;
    if (key.key === 'Enter' || (key.key === ' ' && control.localName !== 'a')) {
      this.answered(control);
      this.pressOf(control).onKeyDown(key);
    }
  };

  private readonly onKeyUp = (event: Event) => {
    const control = this.controlOf(event.target);
    if (control) this.presses.get(control)?.onKeyUp(event as KeyboardEvent);
  };

  /**
   * TBL-34: a sort button was activated — by pointer, touch, Enter or Space, which the browser makes one click. The
   * table asks, once, and changes nothing: the direction is the one asked for, the order is the product's to set.
   * Where the control is an anchor the event can be cancelled, and the link is then not followed.
   */
  private readonly onClick = (event: Event) => {
    const control = this.controlOf(event.target);
    if (!control) return;
    const cell = control.parentElement as HTMLTableCellElement;
    let index = 0;
    for (let before = cell.previousElementSibling; before; before = before.previousElementSibling) if (before.getAttribute('data-part') !== 'selection') index++;
    const link = control.localName === 'a';
    const detail: TanreiTableSortDetail = { column: cell.getAttribute('data-value') ?? '', index, direction: cell.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending' };
    const followed = this.dispatchEvent(new CustomEvent<TanreiTableSortDetail>('sort', { detail, bubbles: true, composed: true, cancelable: link }));
    if (link && !followed) event.preventDefault();
  };

  private readonly onFocusIn = (event: Event) => {
    const control = this.controlOf(event.target);
    if (!control) return;
    // TBL-39: where the browser has no style queries, the focus style is read when focus arrives.
    if (!styleQueries()) syncFocusStyle(control, control);
    this.focusedSort = { control, index: (control.parentElement as HTMLTableCellElement).cellIndex };
    this.reveal(control);
    // TBL-36: an engine may scroll the box for the focused button only after this (WebKit does, a few frames later),
    // and so put it back under what is kept. A scroll heard within this time of the focus is taken for that one, and
    // answered the same way; after it a scroll is the person's.
    this.revealing = { control, until: performance.now() + REVEAL_AGAIN };
  };

  private readonly onFocusOut = (event: Event) => {
    const control = this.controlOf(event.target);
    if (!control) return;
    this.presses.get(control)?.onBlur();
    if (this.revealing?.control === control) this.revealing = null;
    // Focus that went to something else is no longer the button's. Focus that went nowhere may have been taken away
    // with the button (TBL-25): that is known once the change is over.
    const forget = () => {
      if (this.focusedSort?.control === control) this.focusedSort = null;
    };
    if ((event as FocusEvent).relatedTarget) forget();
    else queueMicrotask(() => control.isConnected && !control.matches(':focus') && forget());
  };

  /**
   * TBL-25, TBL-34: the rows were given again, and the header row with them — the button that had focus is gone and
   * focus with it. The button of the same column takes it, where there is one and focus went nowhere else.
   */
  private keepFocus(table: HTMLTableElement) {
    const kept = this.focusedSort;
    if (!kept || kept.control.isConnected) return;
    this.focusedSort = null;
    const active = (this.getRootNode() as Root).activeElement;
    if (active && active !== document.body) return;
    table.tHead?.rows[0]?.cells[kept.index]?.querySelector<HTMLElement>(OWN_CONTROL)?.focus({ preventScroll: true });
  }

  /**
   * TBL-36: keyboard focus came to a sort button that lies under a first column or a status line kept in view — the
   * browser brought it into the box, not out from under them. The box scrolls by what is covered.
   */
  private revealing: { control: HTMLElement; until: number } | null = null;
  private reveal(control: HTMLElement) {
    if (!control.matches(':focus-visible')) return;
    const cell = control.parentElement as HTMLElement;
    const at = cell.getBoundingClientRect();
    let x = 0;
    let y = 0;
    const row = cell.parentElement as HTMLTableRowElement | null;
    // TBL-42: what is kept is the first column of data — the one after a selection column that is kept with it.
    const first = this.stickyFirstColumn && !this.hasAttribute('data-first-column-released') ? (row?.cells[0]?.matches(SELECTION_CELL) ? row.cells[1] : row?.cells[0]) : null;
    if (first && first !== cell) {
      const kept = first.getBoundingClientRect();
      if (getComputedStyle(this).direction === 'rtl') x = Math.max(0, at.right - kept.left);
      else x = Math.min(0, at.left - kept.right);
    }
    const status = this.statusLine?.getBoundingClientRect();
    if (status && status.height > 0) y = Math.max(0, at.bottom - status.top);
    if (x || y) this.scrollBy(x, y);
  }

  private readonly listeners: [string, (event: Event) => void][] = [
    ['pointerdown', this.onPointerDown],
    ['pointerup', this.releasePress],
    ['pointercancel', this.releasePress],
    ['pointerout', this.onPointerOut],
    ['dragstart', this.releasePress],
    ['keydown', this.onKeyDown],
    ['keyup', this.onKeyUp],
    ['click', this.onClick],
    ['focusin', this.onFocusIn],
    ['focusout', this.onFocusOut],
  ];

  /** How rows are chosen now: a selection the table does not define is none (TBL-42). */
  private get mode(): TanreiTableSelection {
    return this.selection === 'multiple' ? 'multiple' : 'none';
  }

  /**
   * TBL-49: while `loading`, the table is exposed as busy — and only that: what it is given is drawn as it is. A busy
   * state a server wrote is left as it is. TBL-50: a placeholder row is hidden from assistive technology, so that a
   * person hears that the table is busy and not a row of nothing.
   */
  private readLoading(table: HTMLTableElement) {
    if (this.busied && this.busied !== table) this.busied = null;
    if (this.loading) {
      if (table.getAttribute('aria-busy') !== 'true') {
        table.setAttribute('aria-busy', 'true');
        this.busied = table;
      }
    } else if (this.busied) {
      table.removeAttribute('aria-busy');
      this.busied = null;
    }
    for (const row of table.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr[data-placeholder]')) {
      if (row.getAttribute('aria-hidden') === 'true') continue;
      row.setAttribute('aria-hidden', 'true');
      this.hiddenRows.add(row);
    }
    for (const row of this.hiddenRows) {
      if (row.isConnected && row.hasAttribute('data-placeholder')) continue;
      // The record arrived in the row that stood for it: the row is a row again.
      if (!row.hasAttribute('data-placeholder')) row.removeAttribute('aria-hidden');
      this.hiddenRows.delete(row);
    }
  }

  /** The checkbox a row holds in its selection cell: the product's `<tanrei-checkbox>`, or its native one. */
  private boxIn(row: HTMLTableRowElement | null | undefined): Checkbox | null {
    const cell = row?.cells[0];
    return cell?.matches(SELECTION_CELL) ? cell.querySelector<Checkbox>(CHECKBOX) : null;
  }

  /** TBL-42, TBL-45, TBL-50: the body rows that can be chosen — each has a value and a checkbox, and is no placeholder — in row order. */
  private choosable(table: HTMLTableElement): [row: HTMLTableRowElement, box: Checkbox][] {
    const rows: [HTMLTableRowElement, Checkbox][] = [];
    for (const body of table.tBodies) {
      for (const row of body.rows) {
        if (!row.getAttribute('data-value') || row.hasAttribute('data-placeholder')) continue;
        const box = this.boxIn(row);
        if (box) rows.push([row, box]);
      }
    }
    return rows;
  }

  /**
   * TBL-42 to TBL-46: the rows that can be chosen, each drawn chosen or not by what it says of itself, its checkbox in
   * step with it and named; and the header's checkbox in step with all of them. Nothing is emitted here: what is read
   * is what the product wrote. A row is chosen by its own `data-selected` — the table carries no selection over to a
   * row it is not given (TBL-44) — or, the first time it is read, by a checkbox that is already checked (the form a
   * page has without script, TBL-57). Its cost is the rows', and only while rows can be chosen.
   */
  private readSelection(table: HTMLTableElement) {
    const on = this.mode === 'multiple';
    this.listenChoices(on);
    if (!on) return;
    let pending = false;
    let picked = 0;
    const rows = this.choosable(table);
    for (const [row, box] of rows) {
      pending ||= !isNative(box) && !box.matches(':defined');
      const said = row.hasAttribute('data-selected');
      const before = this.chosen.get(row);
      // The row says something else than when it was last read: the product wrote it. Else the checkbox is right.
      const now = before === undefined ? said || checkedOf(box) : said !== before ? said : checkedOf(box);
      this.chosen.set(row, now);
      mark(row, 'data-selected', now ? '' : null);
      if (checkedOf(box) !== now) box.checked = now;
      this.fit(box);
      this.nameRow(row, box);
      if (now) picked++;
    }
    const all = this.boxIn(table.tHead?.rows[0]);
    if (all) {
      pending ||= !isNative(all) && !all.matches(':defined');
      // TBL-45: checked while every row is chosen, mixed while some are, unchecked while none is; disabled with no row.
      const [checked, mixed, disabled] = [rows.length > 0 && picked === rows.length, picked > 0 && picked < rows.length, rows.length === 0];
      if (checkedOf(all) !== checked) all.checked = checked;
      if (!!all.indeterminate !== mixed) all.indeterminate = mixed;
      if (!!all.disabled !== disabled) all.disabled = disabled;
      this.fit(all);
      this.nameAll(all);
    }
    // A checkbox that is not defined yet is written to all the same (it reads its properties when it is), and read
    // again then.
    if (pending && !this.awaited) {
      this.awaited = true;
      void customElements.whenDefined('tanrei-checkbox').then(() => {
        this.awaited = false;
        this.read();
      });
    }
    this.keepBoxFocus(table);
  }

  /** TBL-42: a checkbox of the selection column draws no label. */
  private fit(box: Checkbox) {
    if (!isNative(box) && !box.hasAttribute('label-hidden')) box.setAttribute('label-hidden', '');
  }

  /** A checkbox's own name, as the product gave it: `label` on Tanrei's, `aria-label` on the browser's. */
  private nameOf(box: Checkbox): string {
    return (isNative(box) ? box.getAttribute('aria-label') : (box.label ?? box.getAttribute('label'))) ?? '';
  }

  /** Whether something else names a native checkbox: an element it points at, or a `<label>` of its own. */
  private namedElsewhere(box: Checkbox): boolean {
    return isNative(box) && (!!box.getAttribute('aria-labelledby')?.trim() || !!box.labels?.length);
  }

  /** Writes the name this element gives a checkbox, or takes back the one it gave. */
  private rename(box: Checkbox, name: string) {
    if (name) {
      if (this.nameOf(box) !== name) {
        if (isNative(box)) box.setAttribute('aria-label', name);
        else box.label = name;
      }
      this.named.set(box, name);
    } else if (this.named.has(box)) {
      if (this.nameOf(box) === this.named.get(box)) {
        if (isNative(box)) box.removeAttribute('aria-label');
        else box.label = '';
      }
      this.named.delete(box);
    }
  }

  /**
   * TBL-46: a row's checkbox is named by its own name (the row's `selectLabel`); where it has none, by the text of the
   * row's header cell; with neither it has no name, which a debug build says once per table.
   */
  private nameRow(row: HTMLTableRowElement, box: Checkbox) {
    const own = this.nameOf(box);
    if ((own && own !== this.named.get(box)) || this.namedElsewhere(box)) {
      this.named.delete(box);
      return;
    }
    const lead = row.cells[1];
    const header = lead && (lead.localName === 'th' || this.rowHeaders) ? (lead.textContent ?? '').trim().replace(/\s+/g, ' ') : '';
    this.rename(box, header);
    if (!header) report(this, 'TBL-46', 'a row that can be chosen has a checkbox without a name; give the checkbox a label, or the row a header cell');
  }

  /**
   * TBL-46: the checkbox for every row is named by `select-all-label`, else by the product's words, and by nothing
   * else of the table's. Where neither gives it, a name the product wrote on the checkbox itself stands; without one
   * the checkbox is still drawn and the missing word is recorded.
   */
  private nameAll(box: Checkbox) {
    const name = this.words.get('selectAllLabel', this.selectAllLabel);
    if (name) {
      this.rename(box, name);
      return;
    }
    this.rename(box, '');
    if (!this.nameOf(box) && !this.namedElsewhere(box)) this.words.missing('selectAllLabel', { id: 'TBL-46', effect: 'the checkbox that chooses every row has no name' });
  }

  private listenChoices(chooses: boolean) {
    if (chooses === this.chooses) return;
    this.chooses = chooses;
    for (const [type, listener] of this.choiceListeners) {
      if (chooses) this.addEventListener(type, listener);
      else this.removeEventListener(type, listener);
    }
    if (!chooses) this.focusedBox = null;
  }

  /** The checkbox an event came from, in a selection cell of this table's own rows, and its row: a table inside a cell is the product's. */
  private choiceOf(target: EventTarget | null): { box: Checkbox; row: HTMLTableRowElement } | null {
    const box = target instanceof HTMLElement && (target.localName === 'tanrei-checkbox' || (target.localName === 'input' && (target as HTMLInputElement).type === 'checkbox')) ? (target as Checkbox) : null;
    const cell = box?.parentElement;
    const row = cell?.parentElement;
    if (!box || !cell?.matches(SELECTION_CELL) || !(row instanceof HTMLTableRowElement) || row.cells[0] !== cell || row.parentElement?.parentElement !== this.table) return null;
    return { box, row };
  }

  /**
   * TBL-44, TBL-45: the user changed a checkbox — by a press or by Space, which the checkbox makes one `change`. A
   * row's: the row is chosen as its checkbox now says. The header's: every row that can be chosen is chosen, or — where
   * every one was — none is. Then `selectionchange`, exactly once, with the values after the change in row order.
   */
  private readonly onChange = (event: Event) => {
    const choice = this.choiceOf(event.target);
    const table = this.table;
    if (!choice || !table || this.mode !== 'multiple') return;
    const { box, row } = choice;
    const rows = this.choosable(table);
    if (row.parentElement?.localName === 'thead') {
      const every = rows.length > 0 && rows.every(([each]) => this.chosen.get(each) ?? each.hasAttribute('data-selected'));
      for (const [each, own] of rows) {
        this.chosen.set(each, !every);
        mark(each, 'data-selected', every ? null : '');
        if (checkedOf(own) === every) own.checked = !every;
      }
    } else if (rows.some(([each]) => each === row)) {
      const now = checkedOf(box);
      this.chosen.set(row, now);
      mark(row, 'data-selected', now ? '' : null);
    } else return;
    // The header's checkbox follows at once, not when the change of the rows is observed.
    this.readSelection(table);
    const values = rows.filter(([each]) => this.chosen.get(each)).map(([each]) => each.getAttribute('data-value') ?? '');
    this.dispatchEvent(new CustomEvent<TanreiTableSelectionChangeDetail>('selectionchange', { detail: { values }, bubbles: true, composed: true }));
  };

  /** TBL-47: a checkbox's hit area is its whole selection cell — a press on the cell beside the checkbox is the checkbox's. */
  private readonly onCellClick = (event: Event) => {
    const cell = event.target;
    if (!(cell instanceof HTMLTableCellElement) || !cell.matches(SELECTION_CELL) || cell.parentElement?.parentElement?.parentElement !== this.table) return;
    const row = cell.parentElement as HTMLTableRowElement;
    if (row.cells[0] !== cell || this.mode !== 'multiple') return;
    const head = row.parentElement?.localName === 'thead';
    if (!head && (row.parentElement?.localName !== 'tbody' || !row.getAttribute('data-value') || row.hasAttribute('data-placeholder'))) return;
    const box = this.boxIn(row);
    if (box && !box.disabled) box.click();
  };

  private readonly onBoxFocusIn = (event: Event) => {
    const choice = this.choiceOf(event.target);
    if (!choice) return;
    this.focusedBox = { box: choice.box, value: choice.row.parentElement?.localName === 'thead' ? null : choice.row.getAttribute('data-value') };
    this.revealBox(choice.box);
  };

  private readonly onBoxFocusOut = (event: Event) => {
    const choice = this.choiceOf(event.target);
    if (!choice) return;
    const { box } = choice;
    // As a sort button's (TBL-25): focus that went nowhere may have been taken away with the row.
    const forget = () => {
      if (this.focusedBox?.box === box) this.focusedBox = null;
    };
    // (After the task, not after the event: a row that is moved is taken out and put back in one task, and the change
    // is read — and focus given back — before this looks.)
    if ((event as FocusEvent).relatedTarget) forget();
    else setTimeout(() => box.isConnected && !box.matches(':focus') && forget());
  };

  private readonly choiceListeners: [string, (event: Event) => void][] = [
    ['change', this.onChange],
    ['click', this.onCellClick],
    ['focusin', this.onBoxFocusIn],
    ['focusout', this.onBoxFocusOut],
  ];

  /**
   * TBL-25: the rows were given again — in another order, or others — and the checkbox that had focus went with its
   * row, and focus with it. The checkbox of the row with the same value takes it (the header's, where it was the
   * header's), where there is one and focus went nowhere else.
   */
  private keepBoxFocus(table: HTMLTableElement) {
    const kept = this.focusedBox;
    if (!kept) return;
    const active = (this.getRootNode() as Root).activeElement;
    if (active === kept.box) return;
    this.focusedBox = null;
    if (active && active !== document.body) return;
    const row = kept.value === null ? table.tHead?.rows[0] : this.choosable(table).find(([each]) => each.getAttribute('data-value') === kept.value)?.[0];
    const box = this.boxIn(row);
    if (!box) return;
    // A checkbox that has just been placed takes focus once it has drawn the control that holds it — if focus is
    // still nowhere then.
    const drawn = (box as { updateComplete?: Promise<unknown> }).updateComplete;
    if (!drawn) box.focus({ preventScroll: true });
    else {
      void drawn.then(() => {
        const now = (this.getRootNode() as Root).activeElement;
        if (box.isConnected && (!now || now === document.body)) box.focus({ preventScroll: true });
      });
    }
  }

  /**
   * TBL-36's promise for a checkbox: focus came to one that lies under a header row or a status line kept in view —
   * the browser brought it into the box, not out from under them. The box scrolls by what is covered.
   */
  private revealBox(box: Checkbox) {
    const cell = box.parentElement as HTMLElement;
    if (cell.parentElement?.parentElement?.localName !== 'tbody') return;
    const at = cell.getBoundingClientRect();
    let y = 0;
    const head = this.stickyHeader ? this.table?.tHead?.rows[0]?.cells[0]?.getBoundingClientRect() : null;
    if (head && head.height > 0) y = Math.min(0, at.top - head.bottom);
    const status = this.statusLine?.getBoundingClientRect();
    if (!y && status && status.height > 0) y = Math.max(0, at.bottom - status.top);
    if (y) this.scrollBy(0, y);
  }

  /** The table's name as its scroll region carries it (TBL-22): the caption, else the name the table itself has. */
  private regionName(table: HTMLTableElement): [name: 'aria-labelledby' | 'aria-label', value: string] | null {
    const caption = table.caption;
    if (caption?.textContent?.trim()) {
      if (!caption.id) caption.id = `tanrei-table-caption-${++captions}`;
      return ['aria-labelledby', caption.id];
    }
    const labelledby = table.getAttribute('aria-labelledby')?.trim();
    if (labelledby) return ['aria-labelledby', labelledby];
    const label = table.getAttribute('aria-label')?.trim();
    return label ? ['aria-label', label] : null;
  }

  /**
   * TBL-3, TBL-7: a column's alignment and wrapping, named on its header cell, reach its cells through one rule per
   * position; the positions are written on the wrapper. TBL-14: so is the number of columns, which a row cannot exceed.
   */
  private readColumns(table: HTMLTableElement) {
    const header = table.tHead?.rows[0] ?? null;
    const [center, end, nowrap]: number[][] = [[], [], []];
    let position = 0;
    let columns = 0;
    for (const cell of header?.cells ?? []) {
      position++;
      columns += cell.colSpan;
      const align = cell.getAttribute('data-align') ?? RENDERED_ALIGN[cell.getAttribute('align') ?? ''];
      if (align === 'center') center.push(position);
      else if (align === 'end') end.push(position);
      if (cell.getAttribute('data-wrap') === 'false') nowrap.push(position);
    }
    // A table with no header row has as many columns as its first row has cells.
    if (!header) for (const cell of table.rows[0]?.cells ?? []) columns += cell.colSpan;
    mark(this, 'data-columns-center', center.length ? list(center) : null);
    mark(this, 'data-columns-end', end.length ? list(end) : null);
    mark(this, 'data-columns-nowrap', nowrap.length ? list(nowrap) : null);
    mark(this, 'data-columns', columns ? String(columns) : null);
    // TBL-48: the one cell of the row that stands for no rows spans every column, whatever the product counted.
    for (const body of table.tBodies) {
      const row = body.rows.length === 1 ? body.rows[0] : null;
      const cell = row?.getAttribute('data-part') === 'empty' && row.cells.length === 1 ? row.cells[0] : null;
      if (cell && columns && cell.colSpan !== columns) cell.colSpan = columns;
    }
    adopt(this.getRootNode() as Root, positionSheet(Math.max(0, ...center, ...end, ...nowrap), columns));
  }

  /** TBL-6: where `rowHeaders` is set on a table whose first cells are plain cells, they are exposed as row headers. */
  private readRowHeaders(table: HTMLTableElement) {
    if (this.rowHeaders) {
      // TBL-42: the first column is the first column of data — the one after the selection column.
      for (const cell of table.querySelectorAll(`:scope > :is(tbody, tfoot) > tr > td:first-child:not([role], ${SELECTION_CELL}), :scope > :is(tbody, tfoot) > tr > td${SELECTION_CELL}:first-child + td:not([role])`)) {
        cell.setAttribute('role', 'rowheader');
        this.rowHeaderCells.add(cell);
      }
    } else if (this.rowHeaderCells.size) {
      for (const cell of this.rowHeaderCells) if (cell.getAttribute('role') === 'rowheader') cell.removeAttribute('role');
      this.rowHeaderCells.clear();
    }
  }

  /** What a debug build says about a table it still draws (TBL-13, TBL-14, TBL-23). */
  private check(table: HTMLTableElement) {
    if (!this.regionName(table)) report(this, 'TBL-23', 'the table has no name; give it a caption, or a label where a heading above it already says what it is');
    const foot = table.tFoot;
    if (foot && [...table.tBodies].some((body) => foot.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      report(this, 'TBL-13', 'a body row is given after a footer row; every body row is still drawn before every footer row');
    }
    // TBL-32, TBL-33: a sort button without a label is not drawn; the rows have one order.
    const header = [...(table.tHead?.rows[0]?.cells ?? [])];
    const controls = header.filter((cell) => cell.hasAttribute('aria-sort')).map((cell) => cell.querySelector(OWN_CONTROL));
    if (controls.some((control) => control && !control.textContent?.trim())) {
      report(this, 'TBL-32', 'a sortable column has no header; it is drawn as a column that is not sortable');
    }
    const sorted = header.filter((cell) => ['ascending', 'descending'].includes(cell.getAttribute('aria-sort') ?? '') && cell.querySelector(OWN_CONTROL));
    if (sorted.length > 1) report(this, 'TBL-33', `${sorted.length} columns say that the rows are in their order; the rows have one order, and each header is drawn as it is given`);
    // TBL-50: a placeholder row in a table that is not loading is drawn all the same.
    if (!this.loading && table.getAttribute('aria-busy') !== 'true' && table.querySelector(':scope > tbody > tr[data-placeholder]')) {
      report(this, 'TBL-50', 'a row is a placeholder while the table is not loading; it is drawn all the same, and hidden from assistive technology');
    }
    const columns = Number(this.getAttribute('data-columns') ?? 0);
    if (!columns) return;
    // TBL-14: a row with more cells than the table has columns, and one with fewer — counted until a cell spans rows,
    // after which a row may rightly hold fewer.
    let [more, fewer, spans] = [false, false, false];
    for (const row of table.rows) {
      let held = 0;
      for (const cell of row.cells) {
        held += cell.colSpan;
        spans ||= cell.rowSpan > 1;
      }
      if (!more && row.cells.length > columns) {
        more = true;
        report(this, 'TBL-14', `a row holds ${row.cells.length} cells and the table has ${columns} columns; the cells after the last column are not drawn`);
      } else if (!fewer && !spans && held < columns) {
        fewer = true;
        report(this, 'TBL-14', `a row holds ${held} cells and the table has ${columns} columns; the places of the missing cells are left empty at the row's end`);
      }
      if (more && (fewer || spans)) return;
    }
  }

  /**
   * What the sizes say (TBL-19 to TBL-22), read from the layout and written to nothing: whether the table scrolls in
   * its box — and so is a focus stop and a region — where the scroll is, and whether a first column that stays is
   * narrow enough to stay. `sized()` writes it.
   *
   * @internal
   */
  sizes(): Sizes {
    const table = this.table;
    const range = this.scrollWidth - this.clientWidth;
    // TBL-20: a first column wider than half of the box scrolls with the others.
    const first = this.stickyFirstColumn ? (table?.rows[0]?.cells[0] ?? null) : null;
    // TBL-42: with a selection column the first column is the one after it, and the two are kept — and let go — together.
    const lead = first?.matches(SELECTION_CELL) ? (first.nextElementSibling as HTMLElement | null) : first;
    const select = first && first !== lead && this.mode === 'multiple' ? first : null;
    const released = !!lead && lead.offsetWidth + (select?.offsetWidth ?? 0) > this.clientWidth / 2;
    return {
      scrolls: !!table && (range > SLACK || this.scrollHeight - this.clientHeight > SLACK),
      released,
      selection: select && !released ? select.getBoundingClientRect().width : -1,
      direction: (this.direction ??= getComputedStyle(this).direction),
      range,
      offset: Math.abs(this.scrollLeft),
      top: this.scrollTop,
      below: this.scrollHeight - this.clientHeight - this.scrollTop,
    };
  }

  /**
   * Writes what `sizes()` read, as attributes of the wrapper alone. Called for every table of a measure after every
   * one of them was read, so the layout is computed once for all of them.
   *
   * @internal
   */
  sized(sizes: Sizes) {
    if (!this.isConnected) return;
    const table = this.table;
    mark(this, 'data-first-column-released', sizes.released ? '' : null);
    // TBL-42: where the selection column ends is where the first column is held (table.css).
    const kept = sizes.selection >= 0 ? `${sizes.selection}px` : '';
    mark(this, 'data-selection-kept', kept ? '' : null);
    if (this.style.getPropertyValue('--_table-selection-size') !== kept) {
      if (kept) this.style.setProperty('--_table-selection-size', kept);
      else this.style.removeProperty('--_table-selection-size');
    }
    this.scrolled(sizes);

    // TBL-22: one stop in the focus order and a region with the table's name while it scrolls, and neither otherwise.
    const name = sizes.scrolls && table ? this.regionName(table) : null;
    const wanted: Record<string, string | null> = {
      tabindex: sizes.scrolls ? '0' : null,
      role: sizes.scrolls ? 'region' : null,
      'aria-labelledby': name?.[0] === 'aria-labelledby' ? name[1] : null,
      'aria-label': name?.[0] === 'aria-label' ? name[1] : null,
    };
    for (const [attribute, value] of Object.entries(wanted)) {
      if (value === null) {
        if (this.stop.delete(attribute)) this.removeAttribute(attribute);
      } else if (this.stop.has(attribute) || !this.hasAttribute(attribute)) {
        // What the product wrote on the element itself is left as it is.
        mark(this, attribute, value);
        this.stop.add(attribute);
      }
    }
  }

  /** TBL-19, TBL-21, TBL-51: where the scroll is — rows under the header row or the status line, columns beyond an inline edge of the box. */
  private scrolled({ range, offset, top, below }: Pick<Sizes, 'range' | 'offset' | 'top' | 'below'>) {
    this.offset = offset;
    mark(this, 'data-more-start', range > SLACK && offset > SLACK ? '' : null);
    mark(this, 'data-more-end', range > SLACK && offset < range - SLACK ? '' : null);
    mark(this, 'data-more-above', top > SLACK ? '' : null);
    // TBL-51: rows lie under a status line — the line above it is drawn whatever the separation is.
    mark(this, 'data-more-below', this.statusLine && below > SLACK ? '' : null);
  }
  private readonly readScroll = () => {
    if (this.revealing) {
      if (performance.now() > this.revealing.until) this.revealing = null;
      else this.reveal(this.revealing.control);
    }
    this.direction ??= getComputedStyle(this).direction;
    this.scrolled({ range: this.scrollWidth - this.clientWidth, offset: Math.abs(this.scrollLeft), top: this.scrollTop, below: this.scrollHeight - this.clientHeight - this.scrollTop });
  };

  /**
   * TBL-26: a `dir` changed somewhere above. Where that turned this table, the column a person was looking at is
   * brought back: the same distance from the start, in the new direction.
   *
   * @internal
   */
  turned() {
    if (!this.isConnected || this.direction === null) return;
    const direction = getComputedStyle(this).direction;
    if (direction === this.direction) return;
    this.direction = direction;
    const kept = this.offset;
    if (kept > SLACK) this.scrollLeft = direction === 'rtl' ? -kept : kept;
    this.readScroll();
  }
}

if (!customElements.get('tanrei-table')) customElements.define('tanrei-table', TanreiTable);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-table': TanreiTable;
  }
}
