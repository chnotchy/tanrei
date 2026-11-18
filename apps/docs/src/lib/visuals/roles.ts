// The color roles a component's role map draws: each color token it reads, the chain of aliases it is written as —
// from the component's token through any other component token to the system's color role — and what every shipped
// system resolves it to. The chain is the core's, as written in `tokens/comp/` (a layer may alias the same token to
// another role, and its resolved value says so); the values are each system's own. A role map (below) reads each
// system's own chain instead, as that system writes it, states and derivations included.
import { anatomyOf, blueprintStageOf, webPartsOf, webPartTargets, type BlueprintStage, type PartTarget } from './anatomy';
import { below, componentTokens } from './groups';
import { PSEUDO_STATES, withAttributes } from './states';
import { getSpec, webAttribute } from '../repo';
import { ns, sharedSetsOf, shippedSystems, sourceAlias, systemValue, tokensIn, writtenIn, type Token } from '../tokens';

export interface Role {
  /** The component's color token, dotted. */
  token: string;
  /** The anatomy part its path names, or null. */
  part: string | null;
  /** The aliases after the token, in order, as written; the last is a value's token or a role. */
  chain: string[];
  /** The first color role of the system in the chain (`tanrei.sys.color.primary`), or null where the token is a literal. */
  role: string | null;
  /** System id → the value it resolves the token to, as text (`#6750a4`). */
  values: Record<string, string>;
}

function chainOf(token: string): string[] {
  const chain: string[] = [];
  for (let at = sourceAlias(token); at && !chain.includes(at); at = sourceAlias(at)) chain.push(at);
  return chain;
}

/** Every color token of a component; with `keys`, those whose path holds every key (`['filled', 'selected']`). */
export function rolesOf(name: string, keys: string[] = []): Role[] {
  const parts = new Set(anatomyOf(name).map((part) => part.id));
  const sys = `${ns}.sys.color.`;
  return componentTokens(name)
    .filter((token) => token.type === 'color' && keys.every((key) => below(token, name).includes(key)))
    .map((token) => {
      const chain = chainOf(token.name);
      return {
        token: token.name,
        part: below(token, name).find((key) => parts.has(key)) ?? null,
        chain,
        role: chain.find((alias) => alias.startsWith(sys)) ?? null,
        values: Object.fromEntries(shippedSystems.map((system) => [system.id, systemValue(system, token.name)])),
      };
    });
}

// ── A component's color role map (components/visuals/ColorRoleMap.astro) ────────────────────────────────────────────

/** How a part shows its color: as its fill (`background-color`), as its text and glyphs (`color`), or as its edge (`border-color`). */
export type Paint = 'fill' | 'text' | 'edge';

/** What one system makes of a part's color token: the color role it is drawn in, and whether it is that role itself. */
export interface RoleIn {
  /** The first color role of the system in the token's chain, or null where it reaches none (a fixed value). */
  role: string | null;
  /** The tokens on the way, after the token itself, as the system writes them. */
  chain: string[];
  /** Where the token is not the role itself but made from it in this state: the derivation (`mix`, `alpha`), or `fixed`. */
  derived: string | null;
}

/** One row of a role map: a part of the anatomy, the color token it is drawn with, and the role each system draws it in. */
export interface RoleRow {
  /** The anatomy part, as `platforms.web.parts` names it (`container`, `text-input.outline`). */
  part: string;
  target: PartTarget;
  token: string;
  /** The token's custom property, which a swatch is drawn with. */
  cssVar: string;
  paint: Paint;
  /** The token's value in the default system's light scheme, as hexadecimal digits (eight where it is translucent). */
  hex: string;
  /** System id → the role it draws the part in. */
  roles: Record<string, RoleIn>;
}

/** A DTCG color as a number sign and six or eight hexadecimal digits. */
const hexOf = (value: { hex: string; alpha?: number }) => `${value.hex}${(value.alpha ?? 1) < 1 ? Math.round((value.alpha ?? 1) * 255).toString(16).padStart(2, '0') : ''}`;

export interface RoleMapOptions {
  variant?: string;
  /** A state of the spec's (`enabled` by default). */
  state?: string;
  selected?: boolean;
  destructive?: boolean;
  fixture?: string;
}

export interface RoleMap {
  stage: BlueprintStage;
  /** The stage's markup with the figure's props set on the component's web element. */
  html: string;
  rows: RoleRow[];
  /** The state the figure's script holds the element in (hovered, focused, pressed), or null. */
  held: string | null;
}

/** A part's paint, by the last word of its token's part: text and glyphs by `color`, an edge by its border, the rest by its fill. */
export function paintOf(key: string, target: PartTarget): Paint {
  if (target.aspect === 'outline' || /(^|-)outline$/.test(key)) return 'edge';
  if (/(^|-)(label|text|icon|mark|input|affix|counter|asterisk|title|placeholder)$/.test(key)) return 'text';
  return 'fill';
}

/** What a system makes of a token: its aliases followed to the first color role, through a derivation's source. */
export function roleIn(system: string, token: string): RoleIn {
  const sys = `${ns}.sys.color.`;
  const chain: string[] = [];
  let derived: string | null = null;
  for (let at: string | undefined = token; at && !at.startsWith(sys); ) {
    const written = writtenIn(system, at);
    let next = written?.alias;
    if (!next && written?.derive) {
      const derive = written.derive;
      derived ??= typeof derive.fn === 'string' ? derive.fn : 'fixed';
      const from = derive.of ?? derive.base;
      next = typeof from === 'string' && from.startsWith('{') ? from.slice(1, -1) : undefined;
    }
    if (!next || chain.includes(next)) break;
    chain.push(next);
    at = next;
  }
  const role = chain.find((alias) => alias.startsWith(sys)) ?? null;
  return { role, chain, derived: role ? derived : (derived ?? 'fixed') };
}

/**
 * The token groups a component's role map reads, each with the prefix its parts take in the component's anatomy: a
 * component built from others (a text field: a field and its text input) names its members' parts `<member>.<part>`,
 * and reads each member's tokens and the shared sets beside them.
 */
function roleGroups(name: string): { group: string; prefix: string; layer?: string }[] {
  const spec = getSpec(name);
  const own = [spec.tokens, ...sharedSetsOf(spec.name)].map((group) => ({ group, prefix: '', layer: spec.layer }));
  const members = (spec.builtFrom ?? []).flatMap((member) => {
    const of = getSpec(member);
    return [of.tokens, ...sharedSetsOf(of.name)].map((group) => ({ group, prefix: `${member}.`, layer: of.layer }));
  });
  return [...members, ...own.filter((entry) => !members.some((member) => member.group === entry.group))];
}

/** The props of the spec's first fixture that sets `selected`, which make a component selected (a button's `toggle`). */
function selectingProps(name: string): string[] {
  const spec = getSpec(name);
  const fixture = spec.fixtures.find((candidate) => candidate.props.selected === true);
  const booleans = new Set(spec.props.filter((prop) => prop.type === 'boolean').map((prop) => prop.name));
  return fixture ? Object.keys(fixture.props).filter((prop) => booleans.has(prop) && fixture.props[prop] === true) : [];
}

/**
 * A component's role map: the web package's stage of one of its fixtures, with the variant, the state and the flags
 * set on its element, and a row for each part of its anatomy that is drawn with a color token — the token the
 * component reads for that variant, state and flags, the most particular one there is (`filled.hovered.label`, else
 * `filled.label`; `unselected.label` where a component writes no plain one), and the role each shipped system draws
 * it in. Null where the component's parts or its fixture cannot stand in the page.
 */
export function roleMapOf(name: string, options: RoleMapOptions = {}): RoleMap | null {
  const spec = getSpec(name);
  const parts = webPartsOf(name);
  const stage = parts ? blueprintStageOf(name, options.fixture) : null;
  if (!parts || !stage) return null;
  const state = options.state ?? 'enabled';
  if (!spec.states.includes(state)) throw new Error(`${name}: "${state}" is not one of its states (${spec.states.join(', ')})`);
  const variants = spec.props.find((prop) => prop.name === 'variant')?.values;
  if (options.variant && !variants?.includes(options.variant)) throw new Error(`${name}: "${options.variant}" is not one of its variants`);
  const wanted = [options.variant, state === 'enabled' ? undefined : state, options.selected ? 'selected' : undefined, options.destructive ? 'destructive' : undefined].filter((key): key is string => Boolean(key));
  const targets = new Map([...webPartTargets(name)].filter(([, target]) => target.aspect !== 'focus-ring' && target.aspect !== 'backdrop'));
  const found = new Map<string, { token: Token; score: number; plain: boolean }>();
  for (const { group, prefix, layer } of roleGroups(name)) {
    const depth = `${ns}.${group}`.split('.').length;
    for (const token of tokensIn(`${ns}.${group}`, 'light', layer)) {
      if (token.type !== 'color' || token.path.at(-1) !== 'color') continue;
      const keys = token.path.slice(depth, -1);
      const key = keys.at(-1);
      if (!key) continue;
      const modifiers = keys.slice(0, -1);
      // A token of another variant, state or flag than the figure's is not one it draws; `standard` names a
      // component's one look, and `unselected` the plain look of a component that writes no other.
      if (!modifiers.every((modifier) => wanted.includes(modifier) || modifier === 'standard' || (modifier === 'unselected' && !options.selected))) continue;
      const part = [`${prefix}${key}`, key].find((id) => targets.has(id));
      if (!part) continue;
      const score = modifiers.filter((modifier) => wanted.includes(modifier)).length;
      const plain = !modifiers.includes('unselected');
      const best = found.get(part);
      if (!best || score > best.score || (score === best.score && plain && !best.plain)) found.set(part, { token, score, plain });
    }
  }
  // In the order the spec lists where the web draws each part: the anatomy's order, its members' parts under each.
  const rows = [...targets.keys()]
    .filter((part) => found.has(part))
    .map((part): RoleRow => {
      const { token } = found.get(part)!;
      const target = targets.get(part)!;
      const key = token.path.at(-2)!;
      return { part, target, token: token.name, cssVar: token.cssVar, paint: paintOf(key, target), hex: hexOf(token.value), roles: Object.fromEntries(shippedSystems.map((system) => [system.id, roleIn(system.id, token.name)])) };
    });
  // The element is drawn with the figure's props, written as the web element's attributes (custom-elements.json).
  const attributes: Record<string, string> = {};
  const attribute = (prop: string) => {
    if (!spec.props.some((each) => each.name === prop)) return undefined;
    const written = webAttribute(stage.tag, prop);
    if (!written) throw new Error(`${name}: the web element ${stage.tag} has no attribute for the prop "${prop}" (custom-elements.json)`);
    return written.name;
  };
  if (options.variant) attributes[attribute('variant')!] = options.variant;
  for (const prop of [...(options.destructive ? ['destructive'] : []), ...(state === 'disabled' ? ['disabled'] : []), ...(options.selected ? selectingProps(name) : [])]) {
    const written = attribute(prop);
    if (written) attributes[written] = '';
  }
  const html = Object.keys(attributes).length ? withAttributes(stage.html, stage.tag, attributes) : stage.html;
  return { stage, html, rows, held: (PSEUDO_STATES as readonly string[]).includes(state) ? state : null };
}
