// The controls a component's playground offers, one for each of its props a reader can set on the web element, from
// the spec: which kind of control sets it, the values it offers and where it starts. A choice of a few values is a row
// of them, all in sight; a longer one is a list that opens; a flag is a switch; a number and a text are fields. A prop
// whose value is a list of texts or a function has no control: what a reader would type into one is the markup.
//
// Which attribute of the web build each control writes is asked of the build's manifest (`webAttribute`), so that a
// playground never writes one the element does not read: a prop the element takes by property alone, or that a boolean
// attribute cannot say (a switch that is on by default with no attribute to turn it off), has no control. And what the
// playground draws is the web package's own fixture document's stage of the spec's first fixture — the one every
// platform's baseline is compared with — so that the site never writes a component's markup a second time.
import { fixtureDocument } from '../fixture-documents';
import { stageOf } from '../fixture-gallery';
import { getSpec, statusOf, isImplemented, unavailable, webAttribute, webPropertyDefault, type Spec, type SpecProp } from '../repo';
import { ns } from '../tokens';
import { attributeOf, fromAttribute, type Control, type ControlKind, type State } from './playground-state';

export type { Control, ControlKind } from './playground-state';

/** The most values a choice shows side by side; a choice with more opens as a list. */
export const SIDE_BY_SIDE = 4;

/** The prop types a control can set. */
const SETTABLE = ['enum', 'boolean', 'number', 'string'];

export function kindOf(prop: SpecProp, values = prop.values ?? []): ControlKind | null {
  switch (prop.type) {
    case 'enum':
      return values.length <= SIDE_BY_SIDE ? 'segmented' : 'select';
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

/** The web element's property a spec's prop is, as the spec's web block names it (`wrap` → `noWrap`), else the prop's own name. */
const propertyName = (spec: Spec, prop: string) => (spec.platforms.web as { props?: Record<string, string> } | undefined)?.props?.[prop] ?? prop;

/** Why a prop a reader could set has no control: the web element has no attribute for it, or its attribute cannot say its value. */
export type Unwritable = { prop: string; reason: 'no-attribute' | 'cannot-turn-off' };

/** A component's controls, and the props of a settable type that have none, with the reason. */
export function controlsAndGaps(name: string): { controls: Control[]; unwritable: Unwritable[] } {
  const spec = getSpec(name);
  const tag = spec.platforms.web?.name;
  const lacking = unavailable[ns]?.variants?.[name] ?? [];
  const controls: Control[] = [];
  const unwritable: Unwritable[] = [];
  for (const prop of spec.props) {
    if (!SETTABLE.includes(prop.type)) continue;
    const property = propertyName(spec, prop.name);
    const attribute = tag ? webAttribute(tag, property) : undefined;
    if (!attribute) {
      unwritable.push({ prop: prop.name, reason: 'no-attribute' });
      continue;
    }
    // A value of `variant` the default system does not ship is not offered: the frame draws under it unless the
    // reader chose another system.
    const values = prop.type === 'enum' ? (prop.values ?? []).filter((value) => prop.name !== 'variant' || !lacking.includes(value)) : [];
    const kind = kindOf(prop, values)!;
    let negated = false;
    if (kind === 'switch' && prop.default === true && !attribute.inverse) {
      // On by default: the element's property is the prop's opposite (`noWrap` for `wrap`), or no attribute turns it off.
      negated = property !== prop.name && webPropertyDefault(tag!, property) === 'false';
      if (!negated) {
        unwritable.push({ prop: prop.name, reason: 'cannot-turn-off' });
        continue;
      }
    }
    controls.push({ prop: prop.name, kind, values, default: prop.default, ...(prop.from ? { from: prop.from } : {}), attribute: attribute.name, property, inverse: attribute.inverse, negated });
  }
  return { controls, unwritable };
}

export function controlsOf(name: string): Control[] {
  return controlsAndGaps(name).controls;
}

/** The first start tag of an element named `tag` in a piece of markup, and its attributes as written. */
function startTag(html: string, tag: string) {
  const open = new RegExp(`<${tag}(?=[\\s/>])([^>]*)>`).exec(html);
  if (!open) return undefined;
  const attributes = new Map<string, string | null>();
  for (const found of open[1].matchAll(/\s([^\s"'>/=]+)(?:="([^"]*)")?/g)) attributes.set(found[1].toLowerCase(), found[2] === undefined ? null : found[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  return { index: open.index, length: open[0].length, attributes };
}

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Where a playground starts, and what it draws. */
export interface Playground {
  /** The web element it draws and sets (`tanrei-button`). */
  tag: string;
  /** The fixture it starts from. */
  fixture: string;
  controls: Control[];
  /** The values it starts at: the fixture's, and the spec's default for every prop the fixture does not set. */
  start: State;
  /** The fixture document's stage it draws (`<div class="stage" data-fixture="…">…</div>`), the element's attributes written as `start` writes them. */
  stage: string;
  /** The element as a product writes it at `start`: the stage's content. */
  markup: string;
  /** The room the stage holds before it is defined: its baseline's width, and the tallest of its baselines at each size. */
  room: { width: number; height: number } | null;
  /** The native platforms that ship the component at the current spec (above lagging): each needs a generator of its code. */
  native: string[];
}

/** The ways the frame writes a playground's code: the web element in HTML, and in React with the React package's wrappers. */
export const CODE_FLAVORS = ['html', 'react'] as const;

/**
 * The generators of a native platform's code, by platform: none yet, since every native platform is lagging behind
 * the specs. A platform is added here, and its code offered, once a component it ships rises above lagging; until
 * then the playground links to the spec's name mapping.
 */
export const NATIVE_CODE: Record<string, never> = {};

/** A component's playground, from the fixture it starts at (the spec's first, else the one named). */
export function playgroundOf(name: string, fixtureId?: string): Playground {
  const spec = getSpec(name);
  const tag = spec.platforms.web?.name;
  const fixture = fixtureId ? spec.fixtures.find((each) => each.id === fixtureId) : spec.fixtures[0];
  if (!fixture) throw new Error(`${name}: no fixture ${fixtureId ? `"${fixtureId}"` : ''} to start a playground at`);
  const stage = stageOf(spec, fixture);
  if (!stage.drawn || stage.kind !== 'inline' || !stage.html) throw new Error(`${name}: the fixture "${fixture.id}" is not drawn in the page (lib/fixture-gallery.ts), so a playground cannot start at it`);
  const open = tag ? startTag(stage.html, tag) : undefined;
  if (!tag || !open) throw new Error(`${name}: the fixture "${fixture.id}" holds no ${tag ?? 'web'} element for a playground to set`);
  const controls = controlsOf(name);
  const start: State = Object.fromEntries(controls.map((control) => [control.prop, fromAttribute(control, open.attributes.has(control.attribute) ? (open.attributes.get(control.attribute) ?? '') : null)]));
  // The element's start tag, its controls' attributes written as the playground writes them.
  const owned = new Set(controls.map((control) => control.attribute));
  const kept = [...open.attributes].filter(([attribute]) => !owned.has(attribute));
  const written = controls.flatMap((control) => {
    const value = attributeOf(control, start[control.prop]);
    return value === null ? [] : [[control.attribute, value] as [string, string]];
  });
  const attributes = [...kept, ...written].map(([attribute, value]) => (value === null || value === '' ? ` ${attribute}` : ` ${attribute}="${escapeAttribute(value)}"`)).join('');
  const html = `${stage.html.slice(0, open.index)}<${tag}${attributes}>${stage.html.slice(open.index + open.length)}`;
  const markup = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</div>')).trim();
  // The room: the baseline of the fixture, and of each fixture that is it at another size.
  const document = fixtureDocument(name)!;
  const size = (id: string) => document.sizes[id];
  const sizes = spec.props.find((prop) => prop.name === 'size' && prop.type === 'enum');
  const sameBut = (other: (typeof spec.fixtures)[number]) =>
    other.content === fixture.content && [...new Set([...Object.keys(fixture.props), ...Object.keys(other.props)])].every((key) => key === 'size' || fixture.props[key] === other.props[key]);
  const heights = [fixture, ...(sizes ? spec.fixtures.filter((other) => other !== fixture && sameBut(other)) : [])].map((each) => size(each.id)?.height ?? 0);
  const base = size(fixture.id);
  const native = Object.entries(statusOf(name)?.platforms ?? {})
    .filter(([platform, status]) => platform !== 'web' && isImplemented(status))
    .map(([platform]) => platform);
  return { tag, fixture: fixture.id, controls, start, stage: html, markup, room: base ? { width: base.width, height: Math.max(...heights) } : null, native };
}
