// The grid a component's state matrix draws, from its spec: a row for each value of one of its choices (`variant`
// where it has one), a column for each of its states the docs can show, and, for a component that is selected or not,
// each row twice. A state is shown one of two ways. The pointer and focus states are the browser's own (`:hover`,
// `:focus-visible`, a press), which nothing of the component's public surface can set: the docs restyle them on their
// side, and no attribute is added to the component for the docs' sake. A state the component's own props make
// (`disabled`) is drawn by that prop. A state neither can make (an error a form decides, a drag in progress) is said
// and not drawn.
import { getSpec } from '../repo';

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
