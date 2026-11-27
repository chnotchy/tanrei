// The rules by column position (TBL-3, TBL-7, TBL-14). The element writes on itself which columns its header cells
// align or keep on one line (`data-columns-center`, `-end`, `-nowrap`: lists of positions) and how many columns the
// table has (`data-columns`); a rule per position reaches that position's cells. No cell is written to.
//
// The rules of the first SHIPPED_POSITIONS positions are in table.css itself — the build writes them at the
// `table:positions` mark (`shippedPositionRules()`), the last rules of its layer, so that they come after every other
// rule of the table that styles a cell and win over it, as a rule of the column always has — and the element adds no
// rule to the page for them. A rule added to a page has the engine build the page's rules again: WebKit took about a
// quarter of a second for one on a long page, and each new position or column count of a table was one more. Only a
// table wider than that adds the rules of the positions beyond it (table.ts, `positionSheet`).
//
// Every selector names the cells it styles (`th, td`), so that an engine restyles the cells when the wrapper's
// attribute changes, not everything inside them, and has no specificity: one class of the product's still wins.

const TAG = 'tanrei-table';

/** How many column positions — and column counts, for the surplus cells — table.css has rules for. */
export const SHIPPED_POSITIONS = 16;

/** The cells of a table's rows, under a wrapper that carries `wrapper` (an attribute selector). */
const cells = (wrapper: string) => `:where(${TAG}${wrapper}) > :where(table) > :where(thead, tbody, tfoot) > :where(tr) > :where(th, td)`;

/**
 * The rules of one column position (TBL-3, TBL-7): its cells take the alignment and the wrapping the column's header
 * cell names — which the element writes on the wrapper as lists of positions — unless a cell names its own.
 */
export const columnRules = (position: number): string[] => [
  `${cells(`[data-columns-center~='${position}']`)}:where(:nth-child(${position}):not([data-align], [align])) { text-align: center; }`,
  `${cells(`[data-columns-end~='${position}']`)}:where(:nth-child(${position}):not([data-align], [align])) { text-align: var(--_table-end); }`,
  `${cells(`[data-columns-nowrap~='${position}']`)}:where(:nth-child(${position}):not([data-wrap])) { white-space: nowrap; }`,
];

/** TBL-14: a row draws only as many cells as the table has columns. */
export const surplusRule = (columns: number): string => `${cells(`[data-columns='${columns}']`)}:where(:nth-child(n + ${columns + 1})) { display: none; }`;

/** The rules table.css holds: every position and every column count up to SHIPPED_POSITIONS (scripts/build.js). */
export function shippedPositionRules(): string {
  const rules: string[] = [];
  for (let position = 1; position <= SHIPPED_POSITIONS; position++) rules.push(...columnRules(position));
  for (let columns = 1; columns <= SHIPPED_POSITIONS; columns++) rules.push(surplusRule(columns));
  return rules.join('\n');
}
