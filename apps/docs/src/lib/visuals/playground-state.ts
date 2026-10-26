// What a playground's controls hold, and how it is written: on the web element (its attributes as a product writes them,
// or its properties once it is defined), and in the page's address, so that a link to the page opens the playground as
// it was left. Nothing here reads the repository or a document: the page's script (lib/playground.ts) and the Node
// tests (test/visuals.test.mjs) run the same functions.
//
// The address keeps what differs from where the playground started, and nothing else, as Storybook's `args` does: one
// entry for each playground of the page, `#play-<component>=<prop>:<value>,<prop>:<value>` (`&` between two
// playgrounds), each value written as a URL component. A value the control would not offer (a word not in its list, a
// number that is not one) is read as nothing, so an address written by hand sets only what the controls can.

/** The kinds of control: a row of a few values, a list that opens, a switch, a number and a text. */
export type ControlKind = 'segmented' | 'select' | 'switch' | 'number' | 'text';

/** A prop's value as a control holds it; `null` for a number or a text the component leaves unset. */
export type Value = string | number | boolean | null;

/** One control of a playground: which prop it sets and how the web element takes it. */
export interface Control {
  /** The spec's prop. */
  prop: string;
  kind: ControlKind;
  /** The values a choice offers, in the spec's order; empty for the other kinds. */
  values: string[];
  /** The spec's default: what the element is when the attribute is not written. */
  default: Value;
  /** The member it is from (`"<member>.<name>"`), where the component takes it from one. */
  from?: string;
  /** The attribute the web element reads, as HTML writes it (`full-width`). */
  attribute: string;
  /** The element's property behind it (`fullWidth`, `noWrap`). */
  property: string;
  /** A switch whose attribute says the opposite of its property: the property defaults to true, and the attribute turns it off (`flush` for `inset`). */
  inverse: boolean;
  /** A switch whose property says the opposite of the spec's prop: the spec's `wrap`, the element's `noWrap`. */
  negated: boolean;
}

/** What a playground's controls hold, by prop. */
export type State = Record<string, Value>;

/** The word a boolean attribute is written with in the code the frame shows: the code drops it (lib/example-code.ts). */
export const PRESENT = 'true';

const sameValue = (a: Value, b: Value) => a === b || ((a === null || a === '') && (b === null || b === ''));

/** Whether a value is where the component starts without its attribute: the attribute is not written. */
export function isDefault(control: Control, value: Value): boolean {
  if (control.kind === 'switch') return Boolean(value) === Boolean(control.default);
  return sameValue(value, control.default);
}

/**
 * The attribute a value is written as on the web element, as a product writes it: nothing (`null`) where the value is
 * the spec's default, the empty string for a switch's attribute that is written, and the value's text otherwise.
 */
export function attributeOf(control: Control, value: Value): string | null {
  if (control.kind === 'switch') {
    const property = control.negated ? !value : Boolean(value);
    return (control.inverse ? !property : property) ? '' : null;
  }
  if (isDefault(control, value) || value === null || value === '') return null;
  return String(value);
}

/** What the defined element's property is set to for a value. */
export function propertyOf(control: Control, value: Value): Value {
  if (control.kind === 'switch') return control.negated ? !value : Boolean(value);
  // A number left empty is the component's own: its default.
  if (control.kind === 'number') return value === null || value === '' ? control.default : Number(value);
  if (value === null) return control.default;
  return value;
}

/** A value read from an attribute of the element as written: what a page's markup starts the playground at. */
export function fromAttribute(control: Control, written: string | null): Value {
  if (control.kind === 'switch') {
    if (written === null) return Boolean(control.default);
    const property = !control.inverse;
    return control.negated ? !property : property;
  }
  if (written === null) return control.default;
  if (control.kind === 'number') return written.trim() === '' || !Number.isFinite(Number(written)) ? control.default : Number(written);
  return written;
}

/** A value read from the address; nothing (`undefined`) where the control would not hold it. */
export function parseValue(control: Control, written: string): Value | undefined {
  switch (control.kind) {
    case 'segmented':
    case 'select':
      return control.values.includes(written) ? written : undefined;
    case 'switch':
      return written === 'true' ? true : written === 'false' ? false : undefined;
    case 'number':
      if (written === '') return null;
      return Number.isFinite(Number(written)) ? Number(written) : undefined;
    default:
      return written;
  }
}

const KEY = 'play-';

/** The entry of the address that holds a playground's state. */
export const hashKey = (component: string) => `${KEY}${component}`;

/** Every playground's entry of an address (`#play-button=…&play-tabs=…`), by component; what else it holds is left out. */
export function hashEntries(hash: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const part of hash.replace(/^#/, '').split('&')) {
    const at = part.indexOf('=');
    if (at < 0 || !part.startsWith(KEY)) continue;
    entries.set(part.slice(KEY.length, at), part.slice(at + 1));
  }
  return entries;
}

/** What an address sets of a playground: the values its controls would hold, over where it starts. */
export function stateFromHash(controls: Control[], written: string | undefined, start: State): State {
  const state: State = { ...start };
  if (!written) return state;
  for (const pair of written.split(',')) {
    const at = pair.indexOf(':');
    if (at < 0) continue;
    const control = controls.find((each) => each.prop === pair.slice(0, at));
    if (!control) continue;
    let text: string;
    try {
      text = decodeURIComponent(pair.slice(at + 1));
    } catch {
      continue;
    }
    const value = parseValue(control, text);
    if (value !== undefined) state[control.prop] = value;
  }
  return state;
}

/** A playground's entry of the address: what differs from where it started, in the controls' order; empty where nothing does. */
export function hashOf(controls: Control[], state: State, start: State): string {
  return controls
    .filter((control) => !(control.kind === 'switch' ? Boolean(state[control.prop]) === Boolean(start[control.prop]) : sameValue(state[control.prop] ?? null, start[control.prop] ?? null)))
    .map((control) => `${control.prop}:${encodeURIComponent(String(state[control.prop] ?? ''))}`)
    .join(',');
}

/** An address with every playground's entry as given: the entries joined, or no hash where every playground is where it started. */
export function writeHash(entries: Map<string, string>): string {
  const parts = [...entries].filter(([, written]) => written).map(([component, written]) => `${hashKey(component)}=${written}`);
  return parts.length ? `#${parts.join('&')}` : '';
}
