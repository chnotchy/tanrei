// The controls a component's playground offers, one for each of its props, from the spec: which kind of control sets
// it, the values it offers and where it starts. A choice of a few values is a row of them, all in sight; a longer one
// is a list that opens; a flag is a switch; a number and a text are fields. A prop whose value is a list of texts has
// no control: what a reader would type into one is the markup. Which attribute of the web build each control writes
// is the playground's to ask of the build's manifest, so that it never writes one the element does not read.
import { getSpec, type SpecProp } from '../repo';

/** The most values a choice shows side by side; a choice with more opens as a list. */
export const SIDE_BY_SIDE = 4;

export type ControlKind = 'segmented' | 'select' | 'switch' | 'number' | 'text';

export interface Control {
  prop: string;
  kind: ControlKind;
  /** The values a choice offers, in the spec's order; empty for the other kinds. */
  values: string[];
  default: SpecProp['default'];
  /** The member it is from (`"<member>.<name>"`), where the component takes it from one. */
  from?: string;
}

export function kindOf(prop: SpecProp): ControlKind | null {
  switch (prop.type) {
    case 'enum':
      return (prop.values?.length ?? 0) <= SIDE_BY_SIDE ? 'segmented' : 'select';
    case 'boolean':
      return 'switch';
    case 'number':
      return 'number';
    case 'string':
      return 'text';
    default:
      return null;
  }
}

export function controlsOf(name: string): Control[] {
  return getSpec(name).props.flatMap((prop) => {
    const kind = kindOf(prop);
    return kind ? [{ prop: prop.name, kind, values: kind === 'segmented' || kind === 'select' ? [...(prop.values ?? [])] : [], default: prop.default, ...(prop.from ? { from: prop.from } : {}) }] : [];
  });
}
