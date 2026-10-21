import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { ROOT_SYSTEM, availabilityOf, componentChoiceProblems, heldComponents, layerChain, outsideComponents, outsideStandIns, standInProblems } from '../../tokens-build/src/layers.js';
import { CONFIG, DOCS_PAGES, PLATFORMS, REPO_ROOT, exists, loadSpecs, read } from './conventions.js';
import { forwards, fromProblems, resolveAll, resolveFrom, twinProblems } from './from.js';
import { levelProblems, listingProblems } from './levels.js';
import { partsProblems } from './parts.js';
import { placesProblems } from './places.js';

const IMPLEMENTED = new Set(['alpha', 'beta', 'stable', 'deprecated']);
/** An implementation that exists but has not caught up with the current spec. */
const LAGGING = 'lagging';

/** Every token id of a DTCG document, added to `into`. */
function tokenIds(doc, into = new Set()) {
  const walk = (node, trail) => {
    if ('$value' in node) return void into.add(trail.join('.'));
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object') walk(child, [...trail, key]);
  };
  walk(doc, []);
  return into;
}

/** Every token id of the hand-authored vocabulary (tokens/, the files the default resolver names), read once. */
let ids = null;
function vocabularyIds() {
  if (ids) return ids;
  ids = new Set();
  const resolver = JSON.parse(read(`tokens/${CONFIG.namespace}.resolver.json`));
  for (const set of Object.values(resolver.sets)) for (const { $ref } of set.sources) if (!$ref.startsWith('generated/')) tokenIds(JSON.parse(read(`tokens/${$ref}`)), ids);
  return ids;
}

/** Where a component's token document is: in the core (`tokens/comp/`), or next to the layer it lives in. */
export const componentTokenFile = (spec) => (spec.layer && spec.layer !== ROOT_SYSTEM ? `tokens/systems/${spec.layer}/comp/${spec.tokens.split('.')[1]}.tokens.json` : `tokens/comp/${spec.tokens.split('.')[1]}.tokens.json`);

/**
 * The token ids a spec's behaviour prose names (`sys.motion.duration.press-hold`, `comp.button.container.shape`, …)
 * that are not tokens of the vocabulary. A sentence may read a system-wide token the component has no alias for —
 * a choice of kind, a shape amount, a duration — so the prose is the binding, and this is what
 * keeps it true: a renamed or removed token fails `validate` here, in the spec that still names it.
 */
export function unknownTokenIdsInProse(spec, vocabulary, namespace = CONFIG.namespace) {
  const unknown = [];
  for (const { id, text } of spec.behavior) {
    for (const [name] of text.matchAll(/\b(?:sys|comp|ref|dial)\.[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/g)) {
      if (!vocabulary.has(`${namespace}.${name}`)) unknown.push({ id, name });
    }
  }
  return unknown;
}

/** The compiled spec schema (specs/component.schema.json). */
export function compileSpecSchema() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(JSON.parse(read('specs/component.schema.json')));
}

/** A `strings` prop takes a list of strings; no other prop takes a list. */
function shapeProblem(prop, value) {
  const list = Array.isArray(value);
  if (prop.type === 'strings') return list && value.every((v) => typeof v === 'string') ? null : 'a strings prop takes a list of strings';
  return list ? `a ${prop.type} prop does not take a list` : null;
}

/** Schema + cross-reference validation of every spec. Returns a list of problems. */
export function validateSpecs() {
  const validate = compileSpecSchema();
  const vocabulary = vocabularyIds();
  const specs = loadSpecs();
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  return [...specs.flatMap(({ file, spec }) => specProblems(file, spec, { validate, vocabulary, byName })), ...validateLevels(), ...validateListing(), ...validateFrom(specs), ...validatePlaces(specs), ...validateWebParts(specs), ...validateSharedSets()];
}

/**
 * The places of the product's words, held across every spec as written: a word's places are
 * declared on a string prop, its description and every fixture write only those, and one key and one name mean one
 * thing everywhere. See `placesProblems` (rules P1 to P7).
 */
export function validatePlaces(specs = loadSpecs()) {
  return placesProblems(specs);
}

/**
 * What a composed component takes from its members, held across every spec: a
 * forwarded prop, event or slot is a member's, a member's prop the component fills itself is named and not forwarded,
 * and a fixture's twin sets the same values one level down. See `fromProblems` and `twinProblems`.
 */
export function validateFrom(specs = loadSpecs()) {
  return [...fromProblems(specs), ...twinProblems(specs)];
}

/** Every spec with its forwarded props, events and slots written out (`resolveFrom`): what reads them for what they are reads these. */
export function loadResolvedSpecs() {
  return resolveAll(loadSpecs());
}

/** A component's web stylesheets, read: its implementation where that is a stylesheet, and the stylesheet beside its element. */
const webStylesheets = (name) =>
  [PLATFORMS.web.implementation(name), PLATFORMS.web.stylesheet(name)].filter((file) => file?.endsWith('.css') && exists(file)).map(read).join('\n');

/**
 * Where each part of the anatomy is drawn on the web, held for every spec that writes it against the element manifest
 * and the light-DOM stylesheets: see `partsProblems`.
 */
export function validateWebParts(specs = loadSpecs()) {
  return partsProblems(specs, JSON.parse(read('packages/web/custom-elements.json')), webStylesheets);
}

/** The levels of the components, held across every spec and the inventory: see `levelProblems`. */
export function validateLevels() {
  return levelProblems(loadSpecs(), JSON.parse(read('specs/inventory.json')).components);
}

/** Whether a component is listed by default, held across every spec and the inventory: see `listingProblems`. */
export function validateListing() {
  return listingProblems(loadSpecs(), JSON.parse(read('specs/inventory.json')).components);
}

/** The extension by which a group of `tokens/comp/` says it is a set several components read, and no component. */
export const SHARED_SET = `dev.${CONFIG.namespace}.shared`;

/** Every written name of a token group: the paths of its leaves. */
function writtenNames(node, trail = [], out = new Set()) {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !child || typeof child !== 'object') continue;
    if ('$value' in child) out.add([...trail, key].join('.'));
    else writtenNames(child, [...trail, key], out);
  }
  return out;
}

/**
 * The token groups that are no component, as a rule on what it is given: a group of `tokens/comp/` is
 * a component of the inventory (or a retired one a lagging platform still reads), or it says which components read it
 * (`dev.<namespace>.shared.readers`: two or more, each in the inventory), and then no reader's own group repeats one of
 * its names — but those the set lists under `alsoIn` for that reader, which the reader keeps for a part of its own.
 * This is what replaces "held equal by a test": a copy of the set cannot come back without failing `validate`, by name.
 * @param {Map<string, { group: object, file: string }>} groups every group of the component tier, by name
 * @param {Set<string>} inventory the names of the components
 * @param {Set<string>} retired the retired terms
 */
export function sharedSetProblems(groups, inventory, retired = new Set()) {
  const problems = [];
  for (const [name, { group, file }] of groups) {
    const shared = group.$extensions?.[SHARED_SET];
    if (!shared) {
      if (!inventory.has(name) && !retired.has(name)) problems.push(`${file}: comp.${name} is not a component of specs/inventory.json and does not say which components read it (${SHARED_SET})`);
      continue;
    }
    if (inventory.has(name)) problems.push(`${file}: comp.${name} is a component of the inventory and a shared set at once`);
    if (!Array.isArray(shared.readers) || shared.readers.length < 2) problems.push(`${file}: a shared set names the two or more components that read it`);
    const mine = writtenNames(group);
    for (const reader of Array.isArray(shared.readers) ? shared.readers : []) {
      if (!inventory.has(reader)) { problems.push(`${file}: reader "${reader}" is not in specs/inventory.json`); continue; }
      const kept = new Set(shared.alsoIn?.[reader] ?? []);
      const repeated = groups.has(reader) ? [...writtenNames(groups.get(reader).group)].filter((id) => mine.has(id) && !kept.has(id)) : [];
      for (const id of repeated) problems.push(`${file}: comp.${reader}.${id} repeats comp.${name}.${id}: a reader draws that part from the shared set alone`);
    }
    for (const reader of Object.keys(shared.alsoIn ?? {})) if (!(shared.readers ?? []).includes(reader)) problems.push(`${file}: alsoIn names "${reader}", which is not one of the set's readers`);
  }
  return problems;
}

/** `sharedSetProblems` over the repository: every document of the resolver's `comp` set, the inventory, the retired terms. */
export function validateSharedSets() {
  const inventory = new Set(JSON.parse(read('specs/inventory.json')).components.map((c) => c.name));
  const retired = new Set(exists('docs/governance/retired-terms.json') ? JSON.parse(read('docs/governance/retired-terms.json')).terms.map((t) => t.term) : []);
  const resolver = JSON.parse(read(`tokens/${CONFIG.namespace}.resolver.json`));
  const groups = new Map();
  for (const { $ref } of resolver.sets.comp.sources) for (const [name, group] of Object.entries(JSON.parse(read(`tokens/${$ref}`))[CONFIG.namespace]?.comp ?? {})) groups.set(name, { group, file: `tokens/${$ref}` });
  return sharedSetProblems(groups, inventory, retired);
}

/**
 * The values a prop bound to an axis must list. An axis is listed whole — but the axis of a set several components
 * read has every value any of them offers, and a reader's prop lists the ones its component offers,
 * in the axis's order.
 */
export function offeredValues(group, core, values) {
  return group.$extensions?.[SHARED_SET] ? core.filter((value) => values.includes(value)) : core;
}

/** Enum props whose default is not one of their values. `owner` prefixes the message ("prop", "item "tab" prop"). */
const enumDefaultProblems = (file, props, owner) =>
  props.filter((p) => p.type === 'enum' && !p.values.includes(p.default)).map((p) => `${file}: ${owner} "${p.name}" default "${p.default}" is not one of its values`);

/**
 * No component has words of its own: a string prop has no default but the empty one, so no component can say a word the
 * product did not give; and a prop that reads the product's words (`words`) is a string.
 */
export const wordsProblems = (file, props, owner) => [
  ...props.filter((p) => p.type === 'string' && p.default !== '' && p.default !== null).map((p) => `${file}: ${owner} "${p.name}" has the default "${p.default}": a component supplies no words`),
  ...props.filter((p) => p.words !== undefined && p.type !== 'string').map((p) => `${file}: ${owner} "${p.name}" reads the product's words but is not a string`),
];

/**
 * Every problem of one spec: the schema, then the cross-references the schema cannot express. The schema reads the
 * spec as written; the cross-references read it with each forwarded prop, event and slot written out from its member's
 * spec (`resolveFrom`; `byName` is every spec by name, read from the repository where it is not given), so that a
 * fixture of a composed component is held to its members' types and values. An entry that cannot be resolved is
 * `fromProblems`' to report.
 */
export function specProblems(file, written, { validate = compileSpecSchema(), vocabulary = vocabularyIds(), byName } = {}) {
  const problems = [];
  if (!validate(written)) return validate.errors.map((e) => `${file}: ${e.instancePath || '/'} ${e.message}`);
  const others = () => (byName ??= new Map(loadSpecs().map(({ spec: each }) => [each.name, each])));
  const spec = forwards(written) ? resolveFrom(written, others()) : written;
  if (`specs/${spec.name}.spec.json` !== file) problems.push(`${file}: "name" must equal the file name`);

  const tokenFile = componentTokenFile(spec);
  if (!exists(tokenFile)) problems.push(`${file}: tokens "${spec.tokens}" has no ${tokenFile}`);
  // A component that lives in a layer reads the core's tokens and its own, which that layer holds.
  const own = tokenFile.startsWith('tokens/systems/') && exists(tokenFile) ? tokenIds(JSON.parse(read(tokenFile)), new Set(vocabulary)) : vocabulary;
  for (const { id, name } of unknownTokenIdsInProse(spec, own)) problems.push(`${file}: ${id} names "${name}", which is not a token of the vocabulary (tokens/)`);

  const propNames = spec.props.map((p) => p.name);
  problems.push(...enumDefaultProblems(file, spec.props, 'prop'));
  problems.push(...wordsProblems(file, spec.props, 'prop'));
  for (const fixture of spec.fixtures) {
    for (const [key, value] of Object.entries(fixture.props)) {
      const prop = spec.props.find((p) => p.name === key);
      if (!prop) problems.push(`${file}: fixture "${fixture.id}" uses unknown prop "${key}"`);
      else if (prop.type === 'enum' && !prop.values.includes(value)) {
        problems.push(`${file}: fixture "${fixture.id}" sets ${key}="${value}", not a declared value`);
      } else if (shapeProblem(prop, value)) problems.push(`${file}: fixture "${fixture.id}" sets ${key}: ${shapeProblem(prop, value)}`);
    }
    // A fixture fills only slots that say what its strings become.
    for (const [name, value] of Object.entries(fixture.slots ?? {})) {
      const slot = (spec.slots ?? []).find((s) => s.name === name);
      if (!slot) problems.push(`${file}: fixture "${fixture.id}" fills unknown slot "${name}"`);
      else if (!slot.fixture) problems.push(`${file}: fixture "${fixture.id}" fills slot "${name}", which declares no \`fixture\``);
      else if (Array.isArray(value) && (slot.fixture === 'glyph' || slot.fixture === 'text' || slot.fixture === 'mark')) problems.push(`${file}: fixture "${fixture.id}" gives slot "${name}" a list, but a ${slot.fixture} slot takes one string`);
    }
  }
  const ids = spec.behavior.map((b) => b.id);
  if (new Set(ids).size !== ids.length) problems.push(`${file}: duplicate behavior ids`);

  for (const platform of CONFIG.platforms) {
    const mapping = spec.platforms[platform];
    const unmapped = propNames.filter((p) => !(p in mapping.props));
    const unknown = Object.keys(mapping.props).filter((p) => !propNames.includes(p));
    if (unmapped.length) problems.push(`${file}: platforms.${platform}.props is missing ${unmapped.join(', ')}`);
    if (unknown.length) problems.push(`${file}: platforms.${platform}.props maps unknown prop(s) ${unknown.join(', ')}`);
    for (const event of spec.events ?? []) {
      if (!mapping.events?.[event.name]) problems.push(`${file}: platforms.${platform}.events is missing "${event.name}"`);
    }
  }
  problems.push(...itemProblems(file, spec, others));
  return problems;
}

/**
 * Item kinds, checked like the component's own props: kind names are unique; a fixture's items name a
 * declared kind, set only that kind's props and only declared enum values; only a `container` kind (a group) holds
 * nested items of the spec's own kinds; an item of a kind that is another component may hold that component's items,
 * checked against its kinds, and fill its named slots, checked against its slots; every platform maps every kind, and every prop and event of it, and nothing else. `spec` is read
 * resolved; `others` gives every spec by name (read from the repository where it is not given).
 */
export function itemProblems(file, spec, others = () => new Map(loadSpecs().map(({ spec: each }) => [each.name, each]))) {
  const problems = [];
  const kinds = new Map();
  for (const kind of spec.items ?? []) {
    if (kinds.has(kind.name)) problems.push(`${file}: item kind "${kind.name}" is declared twice`);
    kinds.set(kind.name, kind);
    // A kind that is a member's and could not be resolved has no props here: `fromProblems` says why.
    problems.push(...enumDefaultProblems(file, kind.props ?? [], `item "${kind.name}" prop`));
    problems.push(...wordsProblems(file, kind.props ?? [], `item "${kind.name}" prop`));
  }

  /** The spec of the component a kind is, resolved, or nothing. */
  const componentOf = (kind) => {
    const other = kind.component && kind.component !== spec.name ? others().get(kind.component) : undefined;
    return other ? resolveFrom(other, others()) : undefined;
  };
  const walk = (items, where, kinds, owner) =>
    items.forEach((item, i) => {
      const at = `${where} item ${i + 1}`;
      const kind = kinds.get(item.kind);
      if (!kind) {
        problems.push(`${file}: ${at} has kind "${item.kind}", which ${owner ? `the items of "${owner}"` : "the spec's items"} do not declare`);
        return;
      }
      const theirs = componentOf(kind);
      if (item.slots) {
        if (!theirs) problems.push(`${file}: ${at} (${item.kind}) fills slots, but "${item.kind}" is not a kind that is another component`);
        else {
          for (const [name, value] of Object.entries(item.slots)) {
            const slot = (theirs.slots ?? []).find((s) => s.name === name);
            if (!slot) problems.push(`${file}: ${at} (${item.kind}) fills the slot "${name}", which "${kind.component}" does not have`);
            else if (!slot.fixture) problems.push(`${file}: ${at} (${item.kind}) fills the slot "${name}", which declares no \`fixture\``);
            else if (Array.isArray(value) && (slot.fixture === 'glyph' || slot.fixture === 'text' || slot.fixture === 'mark')) problems.push(`${file}: ${at} (${item.kind}) gives the slot "${name}" a list, but a ${slot.fixture} slot takes one string`);
          }
        }
      }
      for (const [key, value] of Object.entries(item.props)) {
        const prop = kind.props.find((p) => p.name === key);
        if (!prop) problems.push(`${file}: ${at} (${item.kind}) uses unknown prop "${key}"`);
        else if (prop.type === 'enum' && !prop.values.includes(value)) problems.push(`${file}: ${at} (${item.kind}) sets ${key}="${value}", not a declared value`);
        else if (shapeProblem(prop, value)) problems.push(`${file}: ${at} (${item.kind}) sets ${key}: ${shapeProblem(prop, value)}`);
      }
      if (item.items) {
        if (kind.container) walk(item.items, `${at} →`, kinds, owner);
        else if (theirs?.items) walk(item.items, `${at} (${kind.component}) →`, new Map(theirs.items.map((k) => [k.name, k])), theirs.name);
        else {
          problems.push(`${file}: ${at} (${item.kind}) holds items, but "${item.kind}" is not a container kind${kind.component ? ', and its component has no item kinds of its own' : ''}`);
          walk(item.items, `${at} →`, kinds, owner);
        }
      }
    });
  for (const fixture of spec.fixtures) if (fixture.items) walk(fixture.items, `fixture "${fixture.id}"`, kinds);

  // A kind that is another component: that component must be in the inventory, and where its spec exists
  // each platform maps the kind to that component's own platform name.
  const inventory = JSON.parse(read('specs/inventory.json'));
  const inventoryNames = new Set((inventory.components ?? inventory).map((c) => c.name));
  for (const [name, kind] of kinds) {
    if (!kind.component) continue;
    if (!inventoryNames.has(kind.component)) problems.push(`${file}: item kind "${name}" is component "${kind.component}", which is not in specs/inventory.json`);
    else if (exists(`specs/${kind.component}.spec.json`)) {
      const other = JSON.parse(read(`specs/${kind.component}.spec.json`));
      for (const platform of CONFIG.platforms) {
        const mapped = spec.platforms[platform].items?.[name];
        const expected = other.platforms[platform]?.name;
        if (mapped && expected && mapped.name !== expected) problems.push(`${file}: platforms.${platform}.items.${name}.name is "${mapped.name}", but "${kind.component}" is "${expected}" on ${platform}`);
      }
    }
  }

  for (const platform of CONFIG.platforms) {
    const mapped = spec.platforms[platform].items ?? {};
    const at = `platforms.${platform}.items`;
    for (const name of Object.keys(mapped)) if (!kinds.has(name)) problems.push(`${file}: ${at} maps unknown item kind "${name}"`);
    for (const [name, kind] of kinds) {
      const mapping = mapped[name];
      if (!mapping) {
        problems.push(`${file}: ${at} is missing the item kind "${name}"`);
        continue;
      }
      const propNames = (kind.props ?? []).map((p) => p.name);
      const unmapped = propNames.filter((p) => !(p in mapping.props));
      const unknown = Object.keys(mapping.props).filter((p) => !propNames.includes(p));
      if (unmapped.length) problems.push(`${file}: ${at}.${name}.props is missing ${unmapped.join(', ')}`);
      if (unknown.length) problems.push(`${file}: ${at}.${name}.props maps unknown prop(s) ${unknown.join(', ')}`);
      const eventNames = (kind.events ?? []).map((e) => e.name);
      for (const event of eventNames) if (!mapping.events?.[event]) problems.push(`${file}: ${at}.${name}.events is missing "${event}"`);
      const unknownEvents = Object.keys(mapping.events ?? {}).filter((e) => !eventNames.includes(e));
      if (unknownEvents.length) problems.push(`${file}: ${at}.${name}.events maps unknown event(s) ${unknownEvents.join(', ')}`);
    }
  }
  return problems;
}

/**
 * What one platform's implementation source must mention: the component's and each item kind's mapped name, prop and
 * event names, and every value of an enum prop that no token axis supplies. Returns the problems, prefixed by `where`.
 */
export function implementationProblems(spec, mapping, source, { where, impl }) {
  const problems = [];
  // A kind that is another component is that component's implementation, checked in its own spec; and so is a kind
  // that is a member's: the composed implementation passes the items on and names nothing of them.
  const own = new Set((spec.items ?? []).filter((kind) => !kind.component && !kind.from).map((kind) => kind.name));
  const items = Object.entries(mapping.items ?? {}).filter(([kind]) => own.has(kind)).map(([, item]) => item);
  const names = [
    mapping.name,
    ...Object.values(mapping.props),
    ...Object.values(mapping.events ?? {}),
    ...items.flatMap((item) => [item.name, ...Object.values(item.props), ...Object.values(item.events ?? {})]),
  ];
  for (const name of new Set(names)) {
    if (!source.includes(name)) problems.push(`${where}: "${name}" from the spec does not appear in ${impl}`);
  }
  // A prop bound to a token axis takes its values from the generated tokens (checked once, in checkParity), not from
  // literals in the component: that is what lets a design system add a size or a variant. An item prop is
  // never axis-bound (the schema forbids it), so all of its enum values are literals of the implementation.
  // A forwarded prop's values are its member's literals: the composed implementation passes the prop
  // on and names none of them.
  const enums = [
    ...spec.props.filter((p) => p.type === 'enum' && !p.axis && !p.from).map((p) => [p.name, p]),
    ...(spec.items ?? []).filter((kind) => !kind.component && !kind.from).flatMap((kind) => kind.props.filter((p) => p.type === 'enum' && !p.axis).map((p) => [`${kind.name}.${p.name}`, p])),
  ];
  for (const [label, prop] of enums) {
    for (const value of prop.values) {
      if (!new RegExp(value.replace(/-/g, '[-_]?'), 'i').test(source)) {
        problems.push(`${where}: ${label} value "${value}" does not appear in ${impl}`);
      }
    }
  }
  return problems;
}

/**
 * Spec ↔ implementation parity. A platform that claims a status above `planned`
 * must actually have the implementation, tests, a baseline per fixture, and docs —
 * and the implementation must mention every mapped name (the component's and its
 * item kinds') and every behavior id must be covered by a test. The reverse also holds: an implementation
 * file for a platform still marked `planned` is a lie in the other direction.
 */
export function checkParity() {
  const problems = [];
  // A component that lives in a layer keeps its tokens next to that layer.
  const layerOf = new Map(JSON.parse(read('specs/inventory.json')).components.map((row) => [row.name, row.layer]));
  for (const { file, spec } of loadResolvedSpecs()) {
    // An axis-bound prop and the token axis it selects must list the same core values, and the same default.
    // (A forwarded prop is read as its member's, so a composed component's axis-bound prop is held to the same axis.)
    for (const prop of spec.props.filter((p) => p.axis)) {
      const [ns, tier, component, axis] = prop.axis.split('.');
      const layer = tier === 'comp' ? layerOf.get(component) : undefined;
      const source = layer && layer !== ROOT_SYSTEM ? `tokens/systems/${layer}/${tier}/${component}.tokens.json` : `tokens/${tier}/${component}.tokens.json`;
      const group = exists(source) ? JSON.parse(read(source))[ns]?.[tier]?.[component] : undefined;
      const declared = group?.$extensions?.['dev.tanrei.axes']?.[axis];
      if (!declared) { problems.push(`${file}: prop "${prop.name}" names the axis ${prop.axis}, which ${source} does not declare`); continue; }
      const core = declared.from === 'states' ? group.$extensions['dev.tanrei.states'].variants : declared.values;
      if (JSON.stringify(offeredValues(group, core, prop.values)) !== JSON.stringify(prop.values)) problems.push(`${file}: prop "${prop.name}" lists ${prop.values.join(', ')} but the axis ${prop.axis} has ${core.join(', ')}`);
      if (declared.default !== prop.default) problems.push(`${file}: prop "${prop.name}" defaults to "${prop.default}" but the axis ${prop.axis} defaults to "${declared.default}"`);
    }
    let anyImplemented = false;
    for (const platform of CONFIG.platforms) {
      const mapping = spec.platforms[platform];
      const paths = PLATFORMS[platform];
      const impl = paths.implementation(spec.name);
      const where = `${file} [${platform}]`;

      // Lagging: the older implementation must still be there, and its docs page; it has not caught up with the current
      // spec, so the surface, the behaviour ids and the baselines are not compared.
      if (mapping.status === LAGGING) {
        anyImplemented = true;
        if (!exists(impl)) problems.push(`${where}: status "lagging" but ${impl} is missing — a platform without an implementation is "planned"`);
        continue;
      }
      // A component drawn by an element and a light-DOM stylesheet is implemented by both files.
      const sheet = paths.stylesheet?.(spec.name);
      if (!IMPLEMENTED.has(mapping.status)) {
        for (const file of [impl, sheet]) if (file && exists(file)) problems.push(`${where}: ${file} exists but status is "${mapping.status}" — update the spec`);
        continue;
      }
      anyImplemented = true;
      if (!exists(impl)) {
        problems.push(`${where}: status "${mapping.status}" but ${impl} is missing`);
        continue;
      }
      if (sheet && !exists(sheet)) {
        problems.push(`${where}: status "${mapping.status}" but its stylesheet ${sheet} is missing`);
        continue;
      }
      problems.push(...implementationProblems(spec, mapping, sheet ? `${read(impl)}\n${read(sheet)}` : read(impl), { where, impl: sheet ? `${impl} or ${sheet}` : impl }));

      const test = paths.test(spec.name);
      if (!exists(test)) problems.push(`${where}: test file ${test} is missing`);
      else {
        const testSource = read(test);
        for (const { id } of spec.behavior) {
          if (!testSource.includes(id)) problems.push(`${where}: behavior ${id} is not referenced by ${test}`);
        }
      }
      for (const fixture of spec.fixtures) {
        const snapshot = paths.snapshot(spec.name, fixture.id);
        if (!exists(snapshot)) problems.push(`${where}: baseline for fixture "${fixture.id}" is missing (${snapshot})`);
      }
    }
    if (anyImplemented) {
      for (const page of DOCS_PAGES(spec.name)) {
        if (!exists(page)) problems.push(`${file}: docs page ${page} is missing`);
      }
    }
  }
  return problems;
}

/** Every design system layer's id, from tokens/systems/ — the root among them. */
export function systemIds() {
  const dir = path.join(REPO_ROOT, 'tokens/systems');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.system.json')).map((f) => f.slice(0, -'.system.json'.length)).sort();
}

const readLayer = (id) => JSON.parse(read(`tokens/systems/${id}.system.json`));

/**
 * What each shipped design system does not ship, after inheritance: system id → { components, variants, outside }.
 * `outside` names the components that live in a layer the system does not extend, with that layer. The root layer
 * leaves nothing out and has no output of its own, so it has no line.
 */
export function systemAvailability() {
  const held = heldComponents(systemIds(), readLayer);
  return Object.fromEntries(systemIds().filter((id) => id !== ROOT_SYSTEM).map((id) => [id, { ...availabilityOf(layerChain(id, readLayer)), outside: outsideComponents(layerChain(id, readLayer), held) }]));
}

/**
 * Where a component lives, held across the specs, the inventory and the layers. A component lives in the layer every
 * system that ships it descends from: the root (`core`, a spec that names no `layer`) or a layer that declares the
 * component's whole vocabulary under `vocabulary`. So: the spec and its inventory row name the same layer; a layer the
 * spec names exists and declares the component, with its document next to it; one layer at most declares it; a
 * component that lives in a layer has no document in the core — its tokens are that layer's alone; and what the layer
 * names for a system without it (`outside.insteadUse`) are other components of the inventory.
 */
export function layerProblems(specs = loadSpecs(), rows = JSON.parse(read('specs/inventory.json')).components, layers = systemIds(), readOne = readLayer) {
  const problems = [];
  const prefix = `${CONFIG.namespace}.comp.`;
  const declared = new Map();
  const inventory = new Set(rows.map((row) => row.name));
  for (const id of layers) {
    for (const [key, entry] of Object.entries(readOne(id).vocabulary ?? {})) {
      if (!key.startsWith(prefix) || !entry || typeof entry !== 'object' || !('document' in entry)) continue;
      const name = key.slice(prefix.length);
      if (declared.has(name)) problems.push(`tokens/systems/${id}.system.json: "${key}" is declared by "${declared.get(name)}" too — a component lives in one layer`);
      else declared.set(name, id);
      for (const instead of entry.outside?.insteadUse ?? []) {
        if (instead === name) problems.push(`tokens/systems/${id}.system.json: "${key}".outside.insteadUse names the component itself — a system without it uses another component`);
        else if (!inventory.has(instead)) problems.push(`tokens/systems/${id}.system.json: "${key}".outside.insteadUse: "${instead}" is not in specs/inventory.json`);
      }
    }
  }
  const where = (layer) => layer ?? ROOT_SYSTEM;
  const byName = new Map(specs.map(({ file, spec }) => [spec.name, { file, spec }]));
  for (const row of rows) {
    const entry = byName.get(row.name);
    if (entry && where(entry.spec.layer) !== where(row.layer)) problems.push(`${entry.file}: layer is "${where(entry.spec.layer)}", but specs/inventory.json says "${where(row.layer)}"`);
    const layer = where(entry?.spec.layer ?? row.layer);
    const file = `specs/${row.name}.spec.json`;
    if (layer !== ROOT_SYSTEM && !layers.includes(layer)) { problems.push(`${file}: layer "${layer}" is not a design system layer of tokens/systems/`); continue; }
    if (layer === ROOT_SYSTEM && declared.has(row.name)) problems.push(`tokens/systems/${declared.get(row.name)}.system.json: declares the vocabulary of "${row.name}", whose spec and inventory row say it lives in "${ROOT_SYSTEM}" — say "layer": "${declared.get(row.name)}" there`);
    if (layer === ROOT_SYSTEM) continue;
    if (declared.get(row.name) !== layer) problems.push(`${file}: lives in "${layer}", but tokens/systems/${layer}.system.json declares no "${prefix}${row.name}" under "vocabulary" with its document`);
    if (exists(`tokens/comp/${row.name}.tokens.json`)) problems.push(`tokens/comp/${row.name}.tokens.json: "${row.name}" lives in "${layer}"; its tokens are that layer's alone (tokens/systems/${layer}/comp/${row.name}.tokens.json), not the core's`);
    if (entry && !exists(componentTokenFile(entry.spec))) problems.push(`${file}: lives in "${layer}", and tokens/systems/${layer}/comp/${row.name}.tokens.json does not exist`);
  }
  return problems;
}

/**
 * What each layer says about its components holds, judged against what its parent ships: it names components of the
 * inventory and values of their `variant` prop; it leaves out only what its parent ships and brings back only what an
 * ancestor left out; what it names instead of a component is a component the system ships, and so is what the layer
 * that holds a component the system does not have names for it; and the default variant — so at least one — stays: a component a system ships is always drawable in it.
 */
export function validateAvailability() {
  const inventory = new Set(JSON.parse(read('specs/inventory.json')).components.map((c) => c.name));
  const specs = new Map(loadSpecs().map(({ spec }) => [spec.name, spec]));
  const variantsOf = (name) => specs.get(name)?.props.find((p) => p.name === 'variant');
  const held = heldComponents(systemIds(), readLayer);
  const standIns = outsideStandIns(systemIds(), readLayer);
  return systemIds().flatMap((id) => {
    const chain = layerChain(id, readLayer);
    return [...componentChoiceProblems(chain, { inventory, variantsOf, held }), ...standInProblems(chain, held, standIns)].map((problem) => `tokens/systems/${problem}`);
  });
}

/**
 * A package that can be published carries its license and its NOTICE. npm ships the files next to package.json, not
 * the repository's: LICENSE always, NOTICE only when `files` lists it. Apache-2.0 §4(d) requires the NOTICE of a work
 * that has one (the repository's names the Apache-2.0 data the packages reproduce) to travel with every copy. And its
 * `repository` names the public repository and the package's directory: npm's trusted publishing matches them.
 * `dirs`, `exists` and `read` default to the repository's packages; a test passes its own.
 */
export function validatePackages({ dirs, exists: has = exists, read: text = read, repository = `https://github.com/${CONFIG.repository.public}.git` } = {}) {
  const problems = [];
  for (const dir of dirs ?? fs.readdirSync(path.join(REPO_ROOT, 'packages'))) {
    const manifestFile = `packages/${dir}/package.json`;
    if (!has(manifestFile)) continue;
    const manifest = JSON.parse(text(manifestFile));
    if (manifest.private) continue;
    for (const file of ['LICENSE', 'NOTICE']) {
      if (!has(`packages/${dir}/${file}`)) problems.push(`packages/${dir}: publishable, but has no ${file} file (copy the repository's)`);
      else if (text(`packages/${dir}/${file}`) !== text(file)) problems.push(`packages/${dir}/${file} differs from the repository's ${file}`);
    }
    if (Array.isArray(manifest.files) && !manifest.files.includes('NOTICE')) problems.push(`${manifestFile}: "files" does not list NOTICE, so npm would not ship it`);
    if (manifest.repository?.url !== repository || manifest.repository?.directory !== `packages/${dir}`) {
      problems.push(`${manifestFile}: "repository" must be { "url": "${repository}", "directory": "packages/${dir}" }`);
    }
  }
  return problems;
}

/** The list the token pipeline writes of every file it generates, relative to the repository. */
export const GENERATED_MANIFEST = 'packages/tokens-build/generated-manifest.json';

/** Regenerate into memory and compare with what is committed. */
export function generatedFilesOnDisk() {
  const manifest = path.join(REPO_ROOT, GENERATED_MANIFEST);
  if (!fs.existsSync(manifest)) return [];
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).files;
}
