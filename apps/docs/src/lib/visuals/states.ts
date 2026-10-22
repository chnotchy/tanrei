// The grid a component's state matrix draws, from its spec: a row for each value of one of its choices (`variant`
// where it has one), a column for each of its states the docs can show, and, for a component that is selected or not,
// each row twice. A state is shown one of two ways. The pointer and focus states are the browser's own (`:hover`,
// `:focus-visible`, a press), which nothing of the component's public surface can set: the docs restyle them on their
// side, and no attribute is added to the component for the docs' sake. A state the component's own props make
// (`disabled`) is drawn by that prop. A state neither can make (an error a form decides, a drag in progress) is said
// and not drawn.
import { fixtureDocument, stageMarkup } from '../fixture-documents';
import { HARNESS_STAGE_PADDING } from '../fixture-gallery';
import { getSpec, unavailable, webAttribute, type Spec } from '../repo';
import { ns } from '../tokens';

/** The states the docs show by restyling the browser's own pseudo-classes. */
export const PSEUDO_STATES = ['hovered', 'focused', 'pressed'] as const;

export type StateColumn = { state: string; by: 'rest' } | { state: string; by: 'pseudo' } | { state: string; by: 'prop'; prop: string };

export interface StateMatrix {
  /** The choice the rows are the values of, or null where the component has none (one row). */
  rows: { prop: string; values: string[] } | null;
  columns: StateColumn[];
  /** The boolean prop each row is drawn twice for, off and on (`selected`, `checked`), or null. */
  twice: string | null;
  /** The spec's states that no column shows, in the spec's order. */
  notShown: string[];
}

/** The props that make a state of the same name, by state. */
const BY_PROP: Record<string, string[]> = { disabled: ['disabled'], selected: ['selected', 'checked'] };

export function matrixOf(name: string, rowsBy?: string): StateMatrix {
  const spec = getSpec(name);
  const enums = spec.props.filter((prop) => prop.type === 'enum' && prop.values?.length);
  const row = (rowsBy ? enums.find((prop) => prop.name === rowsBy) : undefined) ?? enums.find((prop) => prop.name === 'variant') ?? null;
  if (rowsBy && row?.name !== rowsBy) throw new Error(`${name}: no choice named "${rowsBy}" to draw the rows of its state matrix by`);
  const boolean = (state: string) => (BY_PROP[state] ?? []).find((candidate) => spec.props.some((prop) => prop.name === candidate && prop.type === 'boolean'));
  const columns: StateColumn[] = [];
  const notShown: string[] = [];
  let twice: string | null = null;
  for (const state of spec.states) {
    if (state === 'enabled') columns.push({ state, by: 'rest' });
    else if ((PSEUDO_STATES as readonly string[]).includes(state)) columns.push({ state, by: 'pseudo' });
    else if (state === 'selected' && boolean(state)) twice = boolean(state)!;
    else if (boolean(state)) columns.push({ state, by: 'prop', prop: boolean(state)! });
    else notShown.push(state);
  }
  return { rows: row ? { prop: row.name, values: row.values! } : null, columns, twice, notShown };
}

/** One cell of a drawn state matrix: its state, the markup it draws, and the room it holds before that is defined. */
export interface StateCell {
  state: string;
  /** The state the figure's script holds the element in (lib/visuals/pseudo-states.ts); null where its props draw it, or at rest. */
  held: string | null;
  html: string;
  /** The room of the drawn element, in CSS pixels, from the web package's baseline of the fixture it is made from. */
  room: { width: number; height: number } | null;
}

export interface StateRow {
  /** The value of the rows' choice, or null where the component has none. */
  value: string | null;
  /** The props this row sets besides the value (the doubled row's: `toggle`, `selected`). */
  also: string[];
  cells: StateCell[];
}

export interface DrawnStateMatrix extends StateMatrix {
  /** The web element each cell draws and holds (`tanrei-button`); a cell's markup may stand it in what its fixture stands it in. */
  tag: string;
  drawn: StateRow[];
}

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Where the first start tag of an element named `tag` is in a piece of markup. */
const startTagOf = (html: string, tag: string) => new RegExp(`<${tag}(?=[\\s/>])([^>]*)>`).exec(html);

/** Sets attributes on the first element named `tag` in a piece of markup, replacing any it has of the same name. */
function withAttributes(html: string, tag: string, attributes: Record<string, string>): string {
  const open = startTagOf(html, tag)!;
  let rest = open[1];
  for (const name of Object.keys(attributes)) rest = rest.replace(new RegExp(`\\s${name}(="[^"]*")?(?=[\\s/>]|$)`), '');
  const added = Object.entries(attributes)
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`))
    .join('');
  return `${html.slice(0, open.index)}<${tag}${rest}${added}>${html.slice(open.index + open[0].length)}`;
}

/** The attribute a prop is written as on the web element, from the package's manifest. */
function attributeOf(spec: Spec, tag: string, prop: string): string {
  const attribute = webAttribute(tag, prop);
  if (!attribute) throw new Error(`${spec.name}: the web element ${tag} has no attribute for the prop "${prop}" (custom-elements.json)`);
  return attribute.name;
}

/** Whether a fixture's props are the base fixture's with `changes` made, and nothing else. */
function sameBut(base: Record<string, unknown>, props: Record<string, unknown>, changes: Record<string, unknown>): boolean {
  const wanted: Record<string, unknown> = { ...base, ...changes };
  return [...new Set([...Object.keys(wanted), ...Object.keys(props)])].every((key) => wanted[key] === props[key]);
}

/**
 * The state matrix of a component as it is drawn. Every cell is made from the web package's own fixture document of
 * the spec's first fixture (what every platform's baseline is compared with): the same element in each cell, with the
 * row's value, the row's other props and the column's prop set on it. A row holds the room of the fixture that differs
 * from the first only by the row's value, where the spec has one, else the first fixture's. A value the default
 * system does not ship has no row. The doubled row sets the boolean props of the first fixture that sets the doubling
 * prop (a toggle button's `toggle` and `selected`).
 */
export function drawnMatrixOf(name: string, rowsBy?: string): DrawnStateMatrix {
  const spec = getSpec(name);
  const matrix = matrixOf(name, rowsBy);
  const document = fixtureDocument(name);
  const [base] = spec.fixtures;
  const stage = base && document?.stages.find((candidate) => candidate.id === base.id);
  if (!base || !document || !stage) throw new Error(`${name}: no fixture document of its first fixture to draw a state matrix from (lib/fixture-documents.ts)`);
  const markup = stageMarkup(stage.html);
  const tag = spec.platforms.web?.name;
  if (!tag || !startTagOf(markup, tag)) throw new Error(`${name}: the first fixture's markup holds no ${tag ?? 'web'} element to draw a state matrix with`);
  const roomOf = (id: string) => {
    const size = document.sizes[id];
    return size ? { width: Math.max(0, size.width - 2 * HARNESS_STAGE_PADDING), height: Math.max(0, size.height - 2 * HARNESS_STAGE_PADDING) } : null;
  };
  const booleans = new Set(spec.props.filter((prop) => prop.type === 'boolean').map((prop) => prop.name));
  const doubling = matrix.twice ? spec.fixtures.find((fixture) => fixture.props[matrix.twice!] === true) : undefined;
  const doubled = doubling ? Object.keys(doubling.props).filter((prop) => booleans.has(prop) && doubling.props[prop] === true) : [];
  const lacking = matrix.rows?.prop === 'variant' ? (unavailable[ns]?.variants?.[name] ?? []) : [];
  const values: (string | null)[] = matrix.rows ? matrix.rows.values.filter((value) => !lacking.includes(value)) : [null];
  const drawn = values.flatMap((value): StateRow[] => {
    const changes = value === null || !matrix.rows ? {} : { [matrix.rows.prop]: value };
    const fixture = spec.fixtures.find((candidate) => sameBut(base.props, candidate.props, changes) && candidate.content === base.content);
    const room = roomOf(fixture?.id ?? base.id) ?? roomOf(base.id);
    const valueAttributes: Record<string, string> = value === null || !matrix.rows ? {} : { [attributeOf(spec, tag, matrix.rows.prop)]: value };
    const row = (also: string[]): StateRow => ({
      value,
      also,
      cells: matrix.columns.map((column) => {
        const attributes = { ...valueAttributes, ...Object.fromEntries(also.map((prop) => [attributeOf(spec, tag, prop), ''])) };
        if (column.by === 'prop') attributes[attributeOf(spec, tag, column.prop)] = '';
        return { state: column.state, held: column.by === 'pseudo' ? column.state : null, html: withAttributes(markup, tag, attributes), room };
      }),
    });
    return doubled.length ? [row([]), row(doubled)] : [row([])];
  });
  return { ...matrix, tag, drawn };
}

/** Whether a component's state matrix can be drawn: its first fixture's document holds its web element. */
export function drawsStateMatrix(name: string): boolean {
  const spec = getSpec(name);
  const [base] = spec.fixtures;
  const stage = base && fixtureDocument(name)?.stages.find((candidate) => candidate.id === base.id);
  const tag = spec.platforms.web?.name;
  return !!stage && !!tag && !!startTagOf(stageMarkup(stage.html), tag);
}
