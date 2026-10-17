// The components a design system ships, for an agent that writes UI with them. Every answer comes from two sources and
// nothing else: the system's components manifest — tokens/generated/<id>/components.json for a shipped system, worked
// out from the component catalog and the product's own chain for a product layer, exactly as `tanrei build` writes it
// into the product's tokens output — and the component specs (specs/*.spec.json). Nothing is read from the
// documentation site, and nothing here decides which components a system has or which module registers one: the
// manifest does (`importOf` in @tanrei/tokens-build).
import fs from 'node:fs';
import path from 'node:path';
import { heldComponents, listSystems as layerIds } from '@tanrei/tokens-build/bundle';
import { REACT_ALL, componentsManifest, manifestFile, readComponentCatalog } from '@tanrei/tokens-build/components-manifest';
import { loadSystem } from '@tanrei/tokens-build/scheme';
import { resolveFrom } from '../../tools/src/from.js';
import { CONFIG, DEFAULT_SYSTEM, REPO_ROOT, ROOT_SYSTEM, ToolError, listedSystems, readValidLayers } from './systems.js';

const PREFIX = `${CONFIG.web.tagPrefix}-`;
const SCOPE = CONFIG.packages.npmScope;
const WEB = `${SCOPE}/web`;
const REACT = `${SCOPE}/react`;
const pascal = (name) => name.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join('');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// ── the sources ──────────────────────────────────────────────────────────
// The vocabulary of a spec, as the spec schema and the inventory state it: what list_components filters on.
const schema = readJson(path.join(REPO_ROOT, 'specs/component.schema.json'));
export const PLATFORMS = Object.keys(schema.properties.platforms.properties);
export const STATUSES = schema.$defs.platform.properties.status.enum;
export const LEVELS = schema.properties.level.enum;
export const LISTINGS = schema.properties.listing.enum;
export const CATEGORIES = [...new Set(readJson(path.join(REPO_ROOT, 'specs/inventory.json')).components.map((row) => row.category))].sort();

let sources;
/**
 * The specs (as written, and with what a composed component takes from its members written out), the inventory's
 * categories, the catalog, and the names each component has on the web and in React — its own element and wrapper,
 * and the elements it draws among its children (`platforms.web.items`) with their wrappers.
 */
function readSources() {
  if (sources) return sources;
  const catalog = readComponentCatalog(REPO_ROOT);
  if (!catalog) throw new ToolError('The component catalog is missing: run `pnpm generate` in the Tanrei repository.');
  const inventory = readJson(path.join(REPO_ROOT, 'specs/inventory.json')).components;
  const written = new Map(catalog.components.map(({ name }) => [name, readJson(path.join(REPO_ROOT, 'specs', `${name}.spec.json`))]));
  const specs = new Map([...written].map(([name, spec]) => [name, resolveFrom(spec, written)]));
  const categories = new Map(inventory.map((row) => [row.name, row.category]));

  // A component's own element is that component's alone; any other element is the components' that draw it among their children.
  const byTag = new Map();
  for (const component of catalog.components) if (component.web?.tag) byTag.set(component.web.tag, { components: [component.name], own: true });
  for (const [name, spec] of specs) {
    for (const item of Object.values(spec.platforms?.web?.items ?? {})) {
      if (!item?.name?.startsWith(PREFIX) || byTag.get(item.name)?.own) continue;
      const at = byTag.get(item.name) ?? { components: [], own: false };
      if (!at.components.includes(name)) at.components.push(name);
      byTag.set(item.name, at);
    }
  }
  // React wraps every element under the PascalCase of its name without the prefix (packages/react/scripts/generate.js).
  const byReactName = new Map([...byTag].map(([tag, at]) => [pascal(tag.slice(PREFIX.length)), { ...at, tag }]));
  // The web modules that register components: a component's own module, a layer's entry, a stylesheet of a class.
  const byWebModule = new Map();
  const register = (specifier, name) => byWebModule.set(specifier, [...new Set([...(byWebModule.get(specifier) ?? []), name])]);
  for (const component of catalog.components) {
    if (component.web?.module) register(component.web.module, component.name);
    if (component.web?.stylesheet) register(component.web.stylesheet, component.name);
    if (component.layer !== ROOT_SYSTEM) register(`${WEB}/${component.layer}`, component.name);
  }
  sources = { catalog, specs, written, categories, byTag, byReactName, byWebModule };
  return sources;
}

// ── a system's manifest ──────────────────────────────────────────────────
const shippedManifests = new Map();
/** The manifest of a shipped system, as the repository generates it (pnpm drift keeps it current). */
function shippedManifest(id) {
  if (!shippedManifests.has(id)) {
    const file = path.join(REPO_ROOT, manifestFile(id));
    if (!fs.existsSync(file)) throw new ToolError(`No components manifest for "${id}" (${manifestFile(id)}): run \`pnpm generate\` in the Tanrei repository.`);
    const { $comment, ...manifest } = readJson(file);
    shippedManifests.set(id, manifest);
  }
  return shippedManifests.get(id);
}

let held;
/**
 * The components manifest of the system a tool is asked about: a shipped id (default: the default system), or a
 * product's layer file — worked out from its own chain the way `tanrei build` does, so it keeps what the system it
 * extends leaves out and lists what it includes from another layer.
 */
export function manifestOf({ system, layerFile } = {}) {
  if (!layerFile && (system === undefined || !system.endsWith('.system.json'))) {
    const id = system ?? DEFAULT_SYSTEM;
    if (id === ROOT_SYSTEM) throw new ToolError(`"${ROOT_SYSTEM}" is the root layer every system extends; it ships no components of its own. Pick a system: ${listedSystems().join(', ')}, or pass "layerFile" (a product's <id>.system.json).`);
    if (listedSystems().includes(id)) return { product: false, manifest: shippedManifest(id) };
  }
  const { reference, chain } = readValidLayers({ system, layerFile });
  if (reference.kind === 'shipped') return { product: false, manifest: shippedManifest(reference.id) };
  held ??= heldComponents(layerIds(REPO_ROOT), (id) => loadSystem(REPO_ROOT, id));
  return { product: true, manifest: componentsManifest(chain, readSources().catalog, held) };
}

let entries;
/** Each React entry the shipped manifests name, with the components it holds (`@tanrei/react/all` holds every one). */
const reactEntries = () => {
  if (entries) return entries;
  entries = new Map();
  for (const id of listedSystems()) for (const { name, react } of shippedManifest(id).components) if (react) entries.set(react.import, (entries.get(react.import) ?? new Set()).add(name));
  return entries;
};

/** The shipped systems that list a component. */
const shippedWith = (name) => listedSystems().filter((id) => shippedManifest(id).components.some((c) => c.name === name));

/** A component of the manifest, compact: what an agent needs to write it. */
function briefComponent(entry) {
  return { name: entry.name, title: entry.title, ...(entry.web ? { web: entry.web } : {}), ...(entry.react ? { react: entry.react } : {}) };
}

/**
 * What to do about a component the system does not have: why (the layer that left it out, with its reason, or the
 * layer it lives in), the components the system ships for the same job (`insteadUse`, with their names), the shipped
 * systems that have it, and — for a product — the line of its own layer that would take it.
 */
export function standInsFor(manifest, name, product) {
  const omitted = manifest.omitted.find((o) => o.name === name);
  if (!omitted) return null;
  const listed = new Map(manifest.components.map((c) => [c.name, c]));
  const { title, ...why } = omitted;
  const take = omitted.providedBy ? { name, from: omitted.providedBy } : name;
  return {
    ...why,
    ...(omitted.insteadUse ? { insteadUse: omitted.insteadUse.filter((other) => listed.has(other)).map((other) => briefComponent(listed.get(other))) } : {}),
    availableIn: shippedWith(name),
    // A layer that left it out itself takes it back by no longer leaving it out; a later layer includes it.
    howToInclude:
      product && omitted.omittedBy === manifest.system
        ? { note: `Remove "${name}" from components.omit in ${manifest.system}.system.json.` }
        : { ...(product ? {} : { note: `A shipped system is not edited: a product layer that extends "${manifest.system}" may take it.` }), write: { components: { include: [take] } } },
  };
}

/** The variant values a system offers for a component, and those it leaves out. */
const variantsOf = (manifest, name) => ({ values: manifest.components.find((c) => c.name === name)?.variants, omitted: manifest.omittedVariants[name] ?? [] });

/** The component a name refers to: its name, its element, or its React wrapper. */
function componentNamed(name) {
  const { catalog, byTag, byReactName } = readSources();
  if (catalog.components.some((c) => c.name === name)) return name;
  const at = byTag.get(name) ?? byReactName.get(name);
  return at ? at.components[0] : null;
}

// ── words ────────────────────────────────────────────────────────────────
const STOP = new Set('a an and are as at be by can do for from has have i in into is it its let lets me my need of on one or our people show so some that the their them this to use user users want we what when where which with without you your'.split(' '));
/** A word stripped of its usual English endings, so "dates", "picker" and "picking" meet "date" and "pick". */
function stem(word) {
  for (const ending of ['ings', 'ing', 'ers', 'er', 'ies', 'es', 'ed', 's']) if (word.length - ending.length >= 3 && word.endsWith(ending)) return ending === 'ies' ? `${word.slice(0, -3)}y` : word.slice(0, -ending.length);
  return word;
}
const words = (text) => (String(text ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => !STOP.has(word)).map(stem);

// ── list_components ──────────────────────────────────────────────────────
const clip = (text, max = 200) => (typeof text === 'string' && text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function listComponents({ listing, category, level, platform = 'web', status, limit = 100, offset = 0, ...reference }) {
  const { manifest, product } = manifestOf(reference);
  const { specs, categories } = readSources();
  const rows = manifest.components
    .map((entry) => {
      const spec = specs.get(entry.name);
      const variant = spec.props?.find((prop) => prop.name === 'variant');
      return {
        name: entry.name,
        title: entry.title,
        category: categories.get(entry.name),
        level: entry.level,
        listing: entry.listing,
        summary: clip(spec.summary, 140),
        ...(entry.web ? { web: entry.web } : {}),
        ...(entry.react ? { react: entry.react } : {}),
        ...(entry.variants ? { variants: entry.variants, ...(variant?.default !== undefined ? { defaultVariant: variant.default } : {}) } : {}),
        status: spec.platforms?.[platform]?.status,
        ...(entry.layer !== ROOT_SYSTEM ? { layer: entry.layer } : {}),
      };
    })
    .filter((row) => (!listing || row.listing === listing) && (!category || row.category === category) && (!level || row.level === level) && (!status || row.status === status));
  const slice = rows.slice(offset, offset + limit);
  return {
    system: manifest.system,
    chain: manifest.chain,
    ...(product ? { product: true } : {}),
    rule: `Write UI with these components only. Anything this list does not have is not part of "${manifest.system}" — omitted names it, with what to use instead.`,
    total: rows.length,
    offset,
    limit,
    nextOffset: offset + slice.length < rows.length ? offset + slice.length : null,
    components: slice,
    omitted: manifest.omitted.map(({ name, title }) => ({ name, title, ...standInsFor(manifest, name, product) })),
    omittedVariants: manifest.omittedVariants,
  };
}

// ── get_component ────────────────────────────────────────────────────────
export const SECTIONS = ['props', 'events', 'slots', 'items', 'states', 'behavior', 'accessibility', 'example', 'anatomy', 'tokens', 'platforms', 'fixtures'];
export const DEFAULT_SECTIONS = ['props', 'events', 'slots', 'items', 'states', 'behavior', 'accessibility', 'example'];

/** A prop as an agent writes it, with `variant` narrowed to the values the system offers. */
function shownProp(prop, variants) {
  const { words: _words, ...rest } = prop;
  if (prop.name !== 'variant' || !variants.values) return rest;
  return { ...rest, values: variants.values, ...(variants.omitted.length ? { notInThisSystem: variants.omitted } : {}) };
}

/** The first fixture the system can draw: one whose variant it offers. Its props, slots, content and items, as the spec writes them. */
function exampleOf(spec, variants) {
  const usable = (fixture) => !variants.values || fixture.props?.variant === undefined || variants.values.includes(fixture.props.variant);
  const fixture = (spec.fixtures ?? []).find(usable);
  if (!fixture) return null;
  const { twin: _twin, ...shown } = fixture;
  return shown;
}

export function getComponent({ name, sections = DEFAULT_SECTIONS, ...reference }) {
  const { manifest, product } = manifestOf(reference);
  const { specs, categories } = readSources();
  const found = componentNamed(name);
  if (!found) throw new ToolError(`"${name}" is not a Tanrei component. Pass a component's name ("text-field"), its element ("${PREFIX}text-field") or its React name ("TextField"); find_component looks one up by what it is for.`, { near: nearestNames(manifest, name, 5) });
  const spec = specs.get(found);
  const entry = manifest.components.find((c) => c.name === found);
  const head = { name: found, title: spec.title, system: manifest.system, category: categories.get(found), level: spec.level, listing: spec.listing, summary: spec.summary };
  if (!entry) return { ...head, available: false, ...standInsFor(manifest, found, product) };
  const variants = variantsOf(manifest, found);
  const out = { ...head, available: true, ...(entry.web ? { web: entry.web } : {}), ...(entry.react ? { react: entry.react } : {}), ...(spec.builtFrom ? { builtFrom: spec.builtFrom } : {}) };
  const want = new Set(sections);
  if (want.has('props')) out.props = (spec.props ?? []).map((prop) => shownProp(prop, variants));
  if (want.has('events') && spec.events) out.events = spec.events;
  if (want.has('slots') && spec.slots) out.slots = spec.slots;
  if (want.has('items') && spec.items) out.items = spec.items;
  if (want.has('states') && spec.states) out.states = spec.states;
  // EARS, each with its stable id — what the component guarantees. The ids are the spec's own.
  if (want.has('behavior')) out.behavior = (spec.behavior ?? []).map(({ id, text }) => ({ id, text }));
  if (want.has('accessibility') && spec.accessibility) out.accessibility = spec.accessibility;
  if (want.has('anatomy') && spec.anatomy) out.anatomy = spec.anatomy;
  if (want.has('tokens') && spec.tokens) out.tokens = { group: `${CONFIG.namespace}.${spec.tokens}`, find: `search_tokens { "query": "${CONFIG.namespace}.${spec.tokens}.**" }` };
  if (want.has('platforms')) out.platforms = spec.platforms;
  if (want.has('example')) {
    const example = exampleOf(spec, variants);
    if (example) out.example = { ...example, note: 'One of the fixtures the spec is tested with: the props, slots, content and items to set. "fixtures" lists them all; "platforms" names each prop on each platform.' };
  }
  if (want.has('fixtures') && spec.fixtures) out.fixtures = spec.fixtures.map(({ twin: _twin, ...fixture }) => ({ ...fixture, ...(variants.values && fixture.props?.variant !== undefined && !variants.values.includes(fixture.props.variant) ? { notInThisSystem: true } : {}) }));
  return out;
}

// ── find_component ───────────────────────────────────────────────────────
let index;
/** Per component, its words by field: the name and title weigh most, then the summary, then the props. */
function wordIndex() {
  if (index) return index;
  const { specs, categories } = readSources();
  index = new Map(
    [...specs].map(([name, spec]) => [
      name,
      {
        name: new Set([...words(name.replace(/-/g, ' ')), ...words(spec.title)]),
        summary: new Set([...words(spec.summary), ...words(categories.get(name)), ...words(spec.accessibility?.role)]),
        props: new Set((spec.props ?? []).flatMap((prop) => [...words(prop.name.replace(/([a-z])([A-Z])/g, '$1 $2')), ...words(prop.description)])),
      },
    ]),
  );
  return index;
}

/** The edit distance of two names: how a name that is almost one is told apart from a name that is none. */
function distance(a, b) {
  let row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/** The components whose name is nearest to one that is none: spelled almost alike, or meeting its words. */
function nearestNames(manifest, name, limit, { availableOnly = false } = {}) {
  const plain = name.replace(new RegExp(`^${PREFIX}`), '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const spelled = readSources().catalog.components.map((c) => [c.name, distance(plain, c.name)]).filter(([, d]) => d <= 2).sort((a, b) => a[1] - b[1]).map(([n]) => n);
  const names = [...new Set([...spelled, ...findIn(manifest, plain.replace(/-/g, ' '), limit).map((hit) => hit.name)])];
  return (availableOnly ? names.filter((other) => manifest.components.some((c) => c.name === other)) : names).slice(0, limit);
}

/** Components by how well their words meet the words of `need`, best first. */
function findIn(manifest, need, limit) {
  const asked = [...new Set(words(need))];
  if (!asked.length) return [];
  const meets = (set, word) => set.has(word) || (word.length >= 4 && [...set].some((other) => other.length >= 4 && (other.startsWith(word) || word.startsWith(other))));
  const hits = [];
  for (const [name, fields] of wordIndex()) {
    let score = 0;
    const matched = [];
    for (const word of asked) {
      const weight = meets(fields.name, word) ? 5 : meets(fields.summary, word) ? 2 : meets(fields.props, word) ? 1 : 0;
      if (weight) matched.push(word);
      score += weight;
    }
    if (score) hits.push({ name, score, matched, available: manifest.components.some((c) => c.name === name) });
  }
  return hits.sort((a, b) => b.score - a.score || b.matched.length - a.matched.length || a.name.localeCompare(b.name)).slice(0, limit);
}

export function findComponent({ need, limit = 5, ...reference }) {
  const { manifest, product } = manifestOf(reference);
  const { specs } = readSources();
  const hits = findIn(manifest, need, 40);
  const listed = new Map(manifest.components.map((c) => [c.name, c]));
  const available = hits.filter((hit) => hit.available).slice(0, limit);
  const elsewhere = hits.filter((hit) => !hit.available && (!available.length || hit.score >= available.at(-1).score));
  return {
    system: manifest.system,
    need,
    components: available.map(({ name, score, matched }) => ({ ...briefComponent(listed.get(name)), summary: clip(specs.get(name).summary), score, matched })),
    ...(elsewhere.length ? { notInThisSystem: elsewhere.map(({ name, score }) => ({ name, title: specs.get(name).title, score, ...standInsFor(manifest, name, product) })) } : {}),
    ...(available.length ? { next: 'get_component gives the props, events, slots, the EARS rules and an example of one.' } : { next: 'No component of this system matches these words: try others, or list_components for the whole list.' }),
  };
}

// ── check_usage ──────────────────────────────────────────────────────────
const MAX_FILES = 50;
const MAX_BYTES = 1024 * 1024;

/** Line and column (1-based) of each offset in a text. */
function positions(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (at) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= at) low = mid;
      else high = mid - 1;
    }
    return { line: low + 1, column: at - starts[low] + 1 };
  };
}

/** The end of an opening tag that starts at `from`: the first `>` outside quotes and braces. */
function openingTagEnd(text, from) {
  let quote = null;
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    else if (c === '>' && depth === 0) return i;
  }
  return text.length;
}

const VARIANT = /\bvariant\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`)\s*\})/g;
const IMPORT = /\b(?:import|export)\s*(?:type\s+)?([\w$*\s{},]*?)\s*from\s*(['"])([^'"]+)\2|\bimport\s*\(?\s*(['"])([^'"]+)\4|\brequire\s*\(\s*(['"])([^'"]+)\6/g;

/** The findings in one text. */
function checkText(text, file, manifest, product) {
  const { byTag, byReactName, byWebModule } = readSources();
  const at = positions(text);
  const listed = new Map(manifest.components.map((c) => [c.name, c]));
  const findings = [];
  const add = (offset, finding) => findings.push({ ...(file ? { file } : {}), ...at(offset), ...finding });
  const unavailable = (names) => names.filter((name) => !listed.has(name));
  const missing = (offset, kind, found, names) => {
    for (const name of names) add(offset, { kind, found, component: name, problem: `"${manifest.system}" does not have ${name}`, ...standInsFor(manifest, name, product) });
  };

  // Imports: a web module that registers only components the system does not have, a React wrapper it does not have,
  // or a wrapper taken from another entry than the one the manifest names for this system.
  const local = new Map(); // a local name bound to a React wrapper → { component, imported }
  for (const match of text.matchAll(IMPORT)) {
    const specifier = match[3] ?? match[5] ?? match[7];
    const offset = match.index + match[0].lastIndexOf(specifier);
    if (specifier === WEB || specifier.startsWith(`${WEB}/`)) {
      const names = byWebModule.get(specifier);
      if (names && unavailable(names).length === names.length) missing(offset, 'import', specifier, names);
      continue;
    }
    if (specifier !== REACT && !specifier.startsWith(`${REACT}/`)) continue;
    const named = /\{([^}]*)\}/.exec(match[1] ?? '')?.[1];
    if (!named) continue;
    let cursor = match.index + match[0].indexOf('{');
    for (const part of named.split(',')) {
      const [, typeOnly, imported, alias] = /^\s*(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?\s*$/.exec(part) ?? [];
      const partAt = text.indexOf(imported ?? part.trim(), cursor);
      cursor = partAt + part.length;
      const wrapper = imported && byReactName.get(imported);
      if (!wrapper) continue;
      if (!typeOnly) local.set(alias ?? imported, { components: wrapper.components, imported });
      const names = unavailable(wrapper.components);
      if (names.length === wrapper.components.length) missing(partAt, 'import', imported, names);
      else {
        const owner = listed.get(wrapper.components.find((name) => listed.has(name)));
        const expected = owner.react?.import;
        if (!expected || specifier === expected) continue;
        // An entry that does not hold the wrapper at all fails to import; another entry that does hold it types it for another system.
        const holds = specifier === REACT_ALL || reactEntries().get(specifier)?.has(owner.name);
        add(partAt, { kind: 'import', found: `${imported} from '${specifier}'`, component: owner.name, problem: holds ? `in "${manifest.system}", ${imported} is imported from '${expected}'` : `'${specifier}' does not export ${imported}`, use: expected, ...(holds ? { severity: 'warning' } : {}) });
      }
    }
  }

  // Elements: markup (HTML, lit templates, JSX of the elements themselves), a tag named in a string (createElement), and
  // the React wrappers imported above.
  const element = (offset, found, components, own, end) => {
    const names = unavailable(components);
    if (names.length === components.length) return missing(offset, 'element', found, names);
    if (!own) return;
    const name = components[0];
    const { values, omitted } = variantsOf(manifest, name);
    if (!values) return;
    const attributes = text.slice(offset, end);
    for (const value of attributes.matchAll(VARIANT)) {
      const chosen = value.slice(1).find((v) => v !== undefined);
      if (values.includes(chosen)) continue;
      const gone = omitted.includes(chosen);
      add(offset + value.index, { kind: 'variant', found: `variant="${chosen}"`, component: name, problem: gone ? `"${manifest.system}" leaves the ${chosen} ${name} out` : `${name} has no variant "${chosen}"`, insteadUse: values });
    }
  };
  for (const match of text.matchAll(new RegExp(`<(${PREFIX}[a-z0-9]+(?:-[a-z0-9]+)*)(?![\\w-])`, 'g'))) {
    const tag = match[1];
    const known = byTag.get(tag);
    if (known) element(match.index + 1, `<${tag}>`, known.components, known.own, openingTagEnd(text, match.index));
    else add(match.index + 1, { kind: 'element', found: `<${tag}>`, problem: `Tanrei has no element <${tag}>`, near: nearestNames(manifest, tag, 3, { availableOnly: true }) });
  }
  for (const match of text.matchAll(new RegExp(`(['"\`])(${PREFIX}[a-z0-9]+(?:-[a-z0-9]+)*)\\1`, 'g'))) {
    const known = byTag.get(match[2]);
    if (known) element(match.index + 1, `'${match[2]}'`, known.components, false, match.index);
  }
  if (local.size) {
    for (const match of text.matchAll(/<([A-Z][\w$]*)(?![\w$])/g)) {
      const bound = local.get(match[1]);
      if (bound) element(match.index + 1, `<${match[1]}>`, bound.components, byTag.get(byReactName.get(bound.imported).tag).own, openingTagEnd(text, match.index));
    }
  }
  return findings.sort((a, b) => a.line - b.line || a.column - b.column);
}

export function checkUsage({ code, files, path: name, ...reference }) {
  if ((code === undefined) === (files === undefined)) throw new ToolError('Pass "code" (the text to check) or "files" (paths of files to read), not both.');
  const { manifest, product } = manifestOf(reference);
  const texts = [];
  if (code !== undefined) texts.push({ file: name, text: code });
  else {
    if (files.length > MAX_FILES) throw new ToolError(`At most ${MAX_FILES} files at a time.`);
    for (const file of files) {
      const full = path.resolve(file);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        throw new ToolError(`${file}: no such file. Pass a path absolute, or relative to the server's working directory (${process.cwd()}).`);
      }
      if (!stat.isFile()) throw new ToolError(`${file}: not a file.`);
      if (stat.size > MAX_BYTES) throw new ToolError(`${file}: larger than ${MAX_BYTES / 1024 / 1024} MB.`);
      texts.push({ file, text: fs.readFileSync(full, 'utf8') });
    }
  }
  const findings = texts.flatMap(({ file, text }) => checkText(text, file, manifest, product));
  const errors = findings.filter((f) => f.severity !== 'warning').length;
  return {
    system: manifest.system,
    checked: texts.length,
    clean: errors === 0,
    errors,
    warnings: findings.length - errors,
    findings: findings.map((f) => (f.severity ? f : { ...f, severity: 'error' })),
    ...(findings.length ? { next: 'Replace each error with what it names (insteadUse), or take the component into the product\'s layer (howToInclude) and run `tanrei build`. A warning names the entry the system\'s manifest gives.' } : {}),
  };
}

// ── the resource ─────────────────────────────────────────────────────────
export const COMPONENTS_URI = /^tanrei:\/\/components\/([a-z0-9-]+)$/;
/** A shipped system's components manifest, as the repository generates it. */
export const componentsResource = (id) => (listedSystems().includes(id) ? shippedManifest(id) : null);
