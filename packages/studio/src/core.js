// Theme Studio — the pure half.
//
// The Studio's state IS the layer file: every level (essentials, groups, every token, source) reads and writes the
// same `<id>.system.json` object, so switching levels cannot lose anything and nothing is "kept as written" on the
// side. This module turns a layer into everything the page shows — the system's documents, its scoped CSS, the
// build's warnings — and offers the edits as pure functions `layer → layer`.
//
// Nothing here touches the DOM or the filesystem. Values are computed by @tanrei/token-engine, the CSS by the
// build's own emitter and the warnings by the build's own invariants (both injected: they live in
// @tanrei/tokens-build), so what the Studio shows is what `tanrei build` will generate. The tests build Studio
// layers with the real pipeline and compare whole sheets.
import { SCHEMES, argbToColor, componentDocumentPath, createPaletteEngine, dependencyIndex, extensionRecipes, legalOperations, mergeLayers, resolveNumericTokens, tokenKind } from '@tanrei/token-engine';
import { composeStack, inferredGeneric, parseStack } from './fonts.js';
import { buildModel } from './model.js';

const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const refId = (v) => v.slice(1, -1);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const MIN_REASON = 8; // the schema's and the engine's minimum for a pin's reason and an extension's rationale
export const DEFAULT_DIAL_REASON = 'Chosen in Theme Studio.';
/** A `$value` pin needs a reason; the system groups ask for ONE per group and start from these (written into the layer, so not translated). */
export const GROUP_REASONS = { typefaces: 'Brand typeface.', icons: 'Brand icon set.', shape: 'How this product rounds its corners.', behavior: 'How this product behaves.' };
/** The slider under Shape: Figma's corner smoothing, 0 a quarter circle, 0.6 the iOS corner, 1 the most eased. */
export const CORNER_SMOOTHING = { min: 0, max: 1, step: 0.05, ios: 0.6 };
/**
 * The family whose `sys.typescale.emphasis.<family>` step emphasized text of a role gains: the role's first
 * name segment for display, headings and body; everything else — labels, caption, code, eyebrow, a role a layer added —
 * takes the label step.
 */
export const emphasisFamily = (role) => {
  const family = String(role).split('-')[0];
  return family === 'display' || family === 'heading' || family === 'body' ? family : 'label';
};
export const TYPEFACES = ['brand', 'plain', 'mono'];
export const LEVELS = ['essentials', 'groups', 'tokens', 'source'];
/** The four controls of the first level, by dial key. */
export const ESSENTIALS = ['type.base', 'space.unit', 'shape.unit', 'type.contrast'];

// Slider ranges are a UI decision, not vocabulary; defaults and units come from the dial tokens.
const DIAL_RANGES = {
  'type.base': { min: 12, max: 22, step: 0.5 },
  'type.contrast': { min: 0.6, max: 1.5, step: 0.05 },
  'space.unit': { min: 4, max: 14, step: 0.5 },
  'size.unit': { min: 3, max: 7, step: 0.25 },
  'shape.unit': { min: 0, max: 8, step: 0.5 },
  'stroke.unit': { min: 0.5, max: 3, step: 0.25 },
  'motion.unit': { min: 0, max: 120, step: 5 },
};
const LAYER_KEYS = ['$schema', 'id', 'name', 'extends', 'description', 'specVersion', 'attribution', 'palettes', 'vocabulary', 'tokens', 'rules'];

/** Top-level keys in the repository's order; blank strings dropped. A section an edit emptied is dropped by that edit. */
export function tidy(layer) {
  const out = {};
  for (const key of [...LAYER_KEYS, ...Object.keys(layer).filter((k) => !LAYER_KEYS.includes(k))]) {
    const value = layer[key];
    if (value === undefined || value === '') continue;
    out[key] = value;
  }
  return out;
}
const withEntry = (layer, section, key, value) => {
  const entries = { ...layer[section] };
  if (value === undefined) delete entries[key];
  else entries[key] = value;
  return tidy({ ...layer, [section]: Object.keys(entries).length ? entries : undefined });
};

export function stringifyLayer(layer) {
  return `${JSON.stringify(layer, null, 2)}\n`;
}

/**
 * One row of the color controls (`paletteRows`). `monochrome`: the base has no primary and the layer gives none;
 * `added`: a palette only this layer has.
 * @typedef {{ name: string, inherited: boolean, changed: boolean, dropped?: boolean, monochrome?: boolean, added?: boolean, source: any, tones: number, base: any, description: string, declared: boolean, droppable: boolean }} PaletteRow
 */

/**
 * @param {object} deps
 * @param {{ namespace: string, web: { cssPrefix: string, tagPrefix: string } }} deps.config   tanrei.config.json
 * @param {Record<string, object>} deps.sources     tokens/ source documents keyed by path relative to tokens/: the ones
 *   the default resolver names, and the documents of the components that live in a layer (`systems/<layer>/comp/…`)
 * @param {object} deps.vocabulary                  tokens/sys/color.vocabulary.json
 * @param {object} deps.resolver                    tokens/tanrei.resolver.json
 * @param {Record<string, object>} deps.layers      shipped system layers by id
 * @param {{ Hct: any, TonalPalette: any }} deps.mcu material-color-utilities, injected (it imports differently in Node and in a bundler)
 * @param {(layer: object) => string[]} [deps.validateSchema]  JSON-Schema problems of a layer
 * @param {(model: object, options: { scope: string, unavailable?: object, outside?: Record<string, string>, replacements?: Record<string, string[]> }) => string} deps.emitCss   tokens-build's src/emit/css.js (no "@" here: TypeScript would read it as a tag and stop listing deps)
 * @param {(ids: string[], read: (id: string) => object) => Map<string, string>} deps.heldComponents   tokens-build's src/layers.js: where each component that lives in a layer lives
 * @param {(ids: string[], read: (id: string) => object) => Map<string, { reason: string, insteadUse: string[] }>} deps.outsideStandIns   the same module: what a system without a component that lives in a layer uses instead, as that layer says
 * @param {(chain: object[], held: Map<string, string>, standIns?: Map<string, { reason: string, insteadUse: string[] }>) => { unavailable: object, outside: Record<string, string>, replacements: Record<string, string[]> }} deps.sheetAvailability   the same module: what a system's sheet says it does not have, and what it uses instead
 * @param {(model: object) => string[]} deps.checkInvariants                      tokens-build's src/invariants.js
 * @param {(fg: object, bg: object) => number} deps.contrast                      the same module's WCAG ratio
 * @param {(id: string) => string} deps.idToVar                                  the emitter's custom property of a token id
 * @param {(color: object) => string} deps.cssColor                              the emitter's way of writing a color (tokens-build's src/pure.js)
 * @param {import('./listing.js').Catalog} [deps.catalog]  what the specs say of each component: level, listing, members (./listing.js, `catalogOf`)
 */
export function createStudio({ config, sources, vocabulary, resolver, layers, mcu, validateSchema, emitCss, heldComponents, outsideStandIns, sheetAvailability, checkInvariants, contrast, idToVar, cssColor, catalog }) {
  const NS = config.namespace;
  const PREFIX = config.web.cssPrefix;
  const SYS_COLOR = `${NS}.sys.color.`;
  const DIAL = `${NS}.dial.`;
  const engine = createPaletteEngine(mcu);
  const rootId = Object.values(layers).find((layer) => !layer.extends).id;
  // The system a new layer extends unless it says otherwise: the default one, named like the namespace.
  const defaultId = Object.hasOwn(layers, NS) ? NS : rootId;
  // The systems a layer is offered to extend: the default first, then the presets. The root is every chain's first
  // layer and has no output of its own, so it is not offered.
  const shippedSystems = Object.values(layers)
    .filter((layer) => layer.id !== rootId)
    .sort((a, b) => Number(a.id !== NS) - Number(b.id !== NS) || a.id.localeCompare(b.id))
    .map((layer) => ({ id: layer.id, name: layer.name ?? layer.id, description: layer.description ?? '' }));
  // Where each component that lives in a layer lives, among the shipped layers, as the build reads it for a product's sheet.
  const homes = heldComponents(Object.keys(layers), (id) => layers[id]);
  // What a system without one of them uses instead, as the layer that holds it says: a product's sheet names it.
  const standIns = outsideStandIns(Object.keys(layers), (id) => layers[id]);
  /** Every system a layer may extend: the shipped ones, then the host's local parents. Mutated in place by `setParents`. */
  const systems = [...shippedSystems];

  // Local parent layers: a product may stack its own layers, and the host
  // that holds the files (`tanrei studio`) hands over the ones next to the edited file. Read-only here. Looked up
  // before the shipped systems, as the build does (tokens-build/src/resolve.js).
  let parents = {};
  const find = (id) => (Object.hasOwn(parents, id) ? parents[id] : Object.hasOwn(layers, id) ? layers[id] : undefined);
  const known = () => systems.map((s) => s.id).join(', ');

  const cssVar = (id) => (id.startsWith(`${NS}.`) ? `${PREFIX}-${id.split('.').slice(1).join('-')}` : `--${id.split('.').join('-')}`);
  const roleVar = (role) => `${PREFIX}-sys-color-${role}`;

  // ── from a layer to a whole system ───────────────────────────────────────────────────────────
  function chainOf(layer) {
    const chain = [layer];
    const seen = new Set([layer.id]);
    while (chain[0].extends) {
      const parent = find(chain[0].extends);
      if (!parent) throw new Error(`"extends": "${chain[0].extends}" is not a shipped system (${known()})`);
      if (seen.has(parent.id)) throw new Error(`"extends" cycle at "${parent.id}"`);
      seen.add(parent.id);
      chain.unshift(parent);
    }
    if (chain[0].id !== rootId) throw new Error(`a layer must extend "${rootId}" or a system that does`);
    return chain;
  }

  /** Layers → documents → model → CSS and warnings: the build's pipeline, in memory. Throws what the engine throws. */
  function compute(layer) {
    const chain = chainOf(layer);
    // `lend`: the layer that holds a component a layer of the chain includes from it.
    const system = mergeLayers(chain, { lend: find });
    const documents = resolveNumericTokens(sources, system);
    const generated = engine.generateColorFiles(system, { sourcePath: `tokens/systems/${system.id}.system.json`, vocabulary, documents });
    const files = { ...documents, ...Object.fromEntries(Object.entries(generated).map(([name, doc]) => [`generated/${name}`, doc])) };
    // A component that lives in a layer is one more component document of the systems that have it, as in the build's bundle.
    const held = Object.values(system.vocabulary).filter((decl) => decl.kind === 'component').map((decl) => ({ $ref: componentDocumentPath(decl.component) }));
    const own = held.length ? { ...resolver, sets: { ...resolver.sets, comp: { ...resolver.sets.comp, sources: [...resolver.sets.comp.sources, ...held] } } } : resolver;
    const model = buildModel(files, { id: system.id, namespace: NS, resolver: own });
    return { chain, system, files, model, warnings: checkInvariants(model) };
  }

  const bases = new Map();
  /** A shipped system, computed once: what a layer that extends it inherits. */
  function base(id) {
    if (!bases.has(id)) {
      if (!find(id)) throw new Error(`unknown system "${id}"`);
      const computed = compute(find(id));
      const dials = Object.values(computed.model.tokens)
        .filter((token) => token.id.startsWith(DIAL))
        .map((token) => {
          const key = token.id.slice(DIAL.length);
          const value = typeof token.value === 'number' ? token.value : token.value.value;
          return { id: token.id, key, type: token.type, unit: typeof token.value === 'number' ? '' : token.value.unit, value, ...(DIAL_RANGES[key] ?? { min: 0, max: value * 3 || 10, step: value / 16 || 0.25 }) };
        });
      bases.set(id, { id, ...computed, dials });
    }
    return bases.get(id);
  }
  const usable = new Map();
  /** A parent that cannot be computed (a local layer with a problem of its own) must not take the controls down with it. */
  const computable = (id) => {
    if (!usable.has(id)) {
      try {
        base(id);
        usable.set(id, true);
      } catch {
        usable.set(id, false);
      }
    }
    return usable.get(id);
  };
  const baseOf = (layer) => base(find(layer.extends) && computable(layer.extends) ? layer.extends : defaultId);

  /**
   * The local layers a layer may extend, as the host found them: `[{ id, layer }]`. Replaces the previous list.
   * A local layer that names a shipped id is ignored — a layer file cannot redefine a shipped system.
   */
  function setParents(list = []) {
    parents = Object.fromEntries(list.filter((entry) => entry?.layer && typeof entry.layer === 'object' && ID_PATTERN.test(entry.id ?? '') && entry.layer.id === entry.id && !Object.hasOwn(layers, entry.id)).map((entry) => [entry.id, clone(entry.layer)]));
    systems.splice(0, systems.length, ...shippedSystems, ...Object.values(parents).map((layer) => ({ id: layer.id, name: layer.name ?? layer.id, description: layer.description ?? '', local: true })));
    bases.clear();
    usable.clear();
    droppable.clear();
    cache = { key: '', value: null };
  }

  let cache = { key: '', value: null };
  /**
   * Everything the page shows for one layer. Throws nothing: an invalid layer comes back as `problems`.
   * `css(scope)` is the system's whole scoped sheet, exactly what `tanrei build` writes for the web.
   */
  function preview(layer) {
    const key = JSON.stringify(layer);
    if (cache.key === key) return cache.value;
    const problems = [];
    if (!ID_PATTERN.test(layer.id ?? '')) problems.push(`"id" must be lowercase words joined by hyphens (it becomes the file name <id>.system.json)`);
    else if (layers[layer.id]) problems.push(`"${layer.id}" is a shipped system; give your layer its own id`);
    else if (Object.hasOwn(parents, layer.id)) problems.push(`"${layer.id}" is one of the layers next to this file; give your layer its own id`);
    if (!layer.extends && layer.id !== rootId) problems.push(`the Studio edits layers that extend a shipped system ("extends": ${systems.map((s) => `"${s.id}"`).join(' | ')})`);
    problems.push(...(validateSchema?.(layer) ?? []));
    let value;
    try {
      const computed = compute(layer);
      const { model } = computed;
      const hollow = (v) => v === null || (typeof v === 'number' && Number.isNaN(v)) || (v && typeof v === 'object' && Object.values(v).some(hollow));
      for (const token of Object.values(model.tokens)) if (hollow(token.value)) problems.push(`${token.id}: the engine computed no value for this operation (${JSON.stringify(layer.tokens?.[token.id] ?? token.derive)})`);
      const intents = Object.keys(model.colors.light).filter((r) => [`on-${r}`, `${r}-container`, `on-${r}-container`].every((k) => k in model.colors.light));
      let index;
      value = {
        ok: problems.length === 0,
        layer,
        problems,
        ...computed,
        intents,
        // What the system does not have, as `tanrei build` declares it in the product's sheet: an element in the
        // preview reads the layer's lists, not the default system's from `:root`.
        css: (scope = layer.id) => emitCss(model, { scope, ...sheetAvailability(computed.chain, homes, standIns) }),
        valueOf: (id) => model.tokens[id]?.value,
        /** `followers(id)`: every token whose value moves when this one does. */
        followers: (id) => [...(index ??= dependencyIndex(computed.files)).followers(id)],
      };
    } catch (error) {
      value = { ok: false, layer, problems: [...problems, error.message] };
    }
    cache = { key, value };
    return value;
  }

  /**
   * Where a palette's colors reach the sheet other than as its own `ref.palette` tones, for one computed view: a
   * `contrast-pick` anywhere (it CHOOSES a role or a tone by the colors, so a new color may choose another), and each
   * palette a `tone` rule on a component color reads (that color is written into the sheet as a literal, per scheme).
   */
  const reaches = new WeakMap();
  function reachOf(view) {
    if (!reaches.has(view)) {
      const toned = new Set();
      let picks = Object.values(view.system.tokens).some((op) => op?.derive?.fn === 'contrast-pick');
      for (const tokens of Object.values(view.model.perScheme)) {
        for (const token of Object.values(tokens)) {
          if (token.derive?.fn === 'contrast-pick') picks = true;
          else if (token.derive?.fn === 'tone') toned.add(token.derive.palette);
        }
      }
      reaches.set(view, { picks, toned });
    }
    return reaches.get(view);
  }
  /** The palettes a layer's system declares, as the build merges them: the base's, replaced or dropped by the layer's own. */
  function palettesOf(layer) {
    const palettes = { ...baseOf(layer).system.palettes };
    for (const [name, declaration] of Object.entries(layer.palettes ?? {})) {
      if (declaration === null) delete palettes[name];
      else palettes[name] = declaration;
    }
    return palettes;
  }
  /**
   * While a palette's color is dragged: what changes in the sheet of `view` when its layer becomes `layer`, worked out
   * by the palette engine alone — `{ '--tanrei-ref-palette-primary-40': '#…', … }`, the custom properties of the tones
   * the view's sheet declares, each written as the emitter writes it. `null` when that is not the whole difference, and
   * the layer must be computed: it differs from the view's in anything but the sources of its palettes, or a changed
   * palette reaches the sheet some other way (`reachOf`). The test suite holds the two to the same sheet.
   */
  function paletteProperties(view, layer) {
    if (!view?.model || !view.ok) return null;
    const rest = (l) => JSON.stringify({ ...l, palettes: undefined });
    if (rest(view.layer) !== rest(layer)) return null;
    const [before, after] = [palettesOf(view.layer), palettesOf(layer)];
    const names = Object.keys(after);
    if (!same(Object.keys(before).sort(), [...names].sort())) return null;
    const changed = [];
    for (const name of names) {
      if (!same({ ...before[name], source: undefined }, { ...after[name], source: undefined })) return null;
      if (!same(before[name].source, after[name].source)) changed.push(name);
    }
    const reach = reachOf(view);
    if (changed.length && (reach.picks || changed.some((name) => reach.toned.has(name)))) return null;
    const properties = {};
    for (const name of changed) {
      let palette;
      try {
        palette = engine.buildPalette(after[name], name);
      } catch {
        return null; // a source the engine refuses: computing the layer says why
      }
      const prefix = `${NS}.ref.palette.${name}.`;
      for (const id of Object.keys(view.model.tokens)) {
        if (!id.startsWith(prefix)) continue;
        properties[idToVar(id)] = cssColor(argbToColor(palette.tone(Number(id.slice(prefix.length)))));
      }
    }
    return properties;
  }

  // ── edits: layer → layer ─────────────────────────────────────────────────────────────────────
  function blank(extendsId = defaultId) {
    return { id: 'acme', extends: extendsId };
  }

  /** Identity and prose. Renaming the id renames the layer's own namespace with it, references included. */
  function setMeta(layer, patch) {
    let next = { ...layer, ...patch };
    if ('id' in patch && patch.id !== layer.id && layer.id) {
      const from = `${layer.id}.`;
      const owns = [...Object.keys(layer.vocabulary ?? {}), ...Object.keys(layer.tokens ?? {})].some((id) => id.startsWith(from));
      if (owns) {
        if (!ID_PATTERN.test(patch.id) || patch.id === NS) return { layer, problem: 'own-namespace' };
        const rename = (node) =>
          typeof node === 'string' ? node.replaceAll(`{${from}`, `{${patch.id}.`) : Array.isArray(node) ? node.map(rename) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([k, v]) => [k.startsWith(from) ? patch.id + k.slice(layer.id.length) : k, rename(v)])) : node;
        next = { ...next, vocabulary: rename(layer.vocabulary), tokens: rename(layer.tokens), rules: rename(layer.rules) };
      }
    }
    return { layer: tidy(next) };
  }

  /** Switching the base starts from that base's defaults: operations are relative to what they inherit. */
  function setBase(layer, extendsId) {
    return tidy({ $schema: layer.$schema, id: layer.id, name: layer.name, extends: extendsId, description: layer.description });
  }

  const dialValue = (op) => (op && '$value' in op && !isRef(op.$value) ? (typeof op.$value === 'number' ? op.$value : op.$value?.value) : undefined);
  /** Current value of every dial: the layer's, or the base's. */
  function dials(layer) {
    return baseOf(layer).dials.map((dial) => {
      const op = layer.tokens?.[dial.id];
      const value = dialValue(op);
      return { ...dial, base: dial.value, value: typeof value === 'number' ? value : dial.value, changed: typeof value === 'number', reason: op?.reason && op.reason !== DEFAULT_DIAL_REASON ? op.reason : '' };
    });
  }
  function setDial(layer, id, value, reason) {
    const dial = baseOf(layer).dials.find((d) => d.id === id);
    if (!dial || typeof value !== 'number' || Number.isNaN(value)) return layer;
    if (value === dial.value) return withEntry(layer, 'tokens', id, undefined);
    const previous = layer.tokens?.[id]?.reason;
    const why = (reason ?? previous ?? '').trim();
    return withEntry(layer, 'tokens', id, { $value: dial.type === 'number' ? value : { value, unit: dial.unit }, reason: why.length >= MIN_REASON ? why : DEFAULT_DIAL_REASON });
  }

  // Essentials: spacing moves the size unit with it, because a control's height must hold its padding (the
  // build's height invariant). The link is not stored: it holds while size.unit IS the proportional value.
  const proportionalSize = (layer, space) => {
    const all = baseOf(layer).dials;
    const [spaceDial, sizeDial] = [all.find((d) => d.key === 'space.unit'), all.find((d) => d.key === 'size.unit')];
    return Math.round(((sizeDial.value * space) / spaceDial.value) * 4) / 4;
  };
  function essentials(layer) {
    const current = Object.fromEntries(dials(layer).map((d) => [d.key, d]));
    return { dials: ESSENTIALS.map((key) => current[key]), linked: current['size.unit'].value === proportionalSize(layer, current['space.unit'].value), size: current['size.unit'] };
  }
  function setEssential(layer, key, value) {
    const linked = essentials(layer).linked;
    let next = setDial(layer, `${DIAL}${key}`, value);
    if (key === 'space.unit' && linked) next = setDial(next, `${DIAL}size.unit`, proportionalSize(layer, value));
    return next;
  }

  // ── palettes ─────────────────────────────────────────────────────────────────────────────────
  /** Roles of the base that a dropped palette leaves without a value, re-pointed to `primary`. */
  function repoints(system, name) {
    const ops = {};
    const own = new Set(vocabulary.sets.intent.roles.map((p) => SYS_COLOR + p.replace('{name}', name)));
    for (const [id, op] of Object.entries(system.tokens)) if (id.startsWith(SYS_COLOR) && !own.has(id) && op.derive?.fn === 'tone' && op.derive.palette === name) ops[id] = { $value: `{${SYS_COLOR}primary}` };
    return ops;
  }
  /** A base with a monochrome primary values those roles from `neutral`: a primary palette needs the roles pointed at it. */
  function primaryRoles(system, declaration) {
    const table = engine.roleTable({ ...system, palettes: { ...system.palettes, primary: declaration } }, vocabulary);
    const ops = {};
    for (const pattern of vocabulary.sets.intent.roles) {
      const role = pattern.replace('{name}', 'primary');
      ops[SYS_COLOR + role] = { derive: { fn: 'tone', ...clone(table.get(role).template) } };
    }
    ops[`${SYS_COLOR}inverse-primary`] = { derive: { fn: 'tone', palette: 'primary', tone: { light: [80], dark: [40] } } };
    return ops;
  }
  const withoutOps = (layer, ops) => {
    const tokens = { ...layer.tokens };
    for (const [id, op] of Object.entries(ops)) if (same(tokens[id], op)) delete tokens[id];
    return tidy({ ...layer, tokens: Object.keys(tokens).length ? tokens : undefined });
  };

  const droppable = new Map();
  function canDrop(baseId, name) {
    const key = `${baseId}/${name}`;
    if (!droppable.has(key)) {
      try {
        compute({ id: 'studio-probe', extends: baseId, palettes: { [name]: null }, tokens: repoints(base(baseId).system, name) });
        droppable.set(key, true);
      } catch {
        droppable.set(key, false); // the base values that palette's roles explicitly; a layer cannot remove those operations
      }
    }
    return droppable.get(key);
  }

  /** Palettes as the color controls see them: the base's, then the layer's own. */
  function paletteRows(layer) {
    const { system, id: baseId } = baseOf(layer);
    const core = Object.keys(vocabulary.intents);
    const own = layer.palettes ?? {};
    /** @type {PaletteRow[]} */
    const rows = Object.entries(system.palettes).map(([name, inherited]) => {
      const declaration = own[name] === null ? null : (own[name] ?? inherited);
      const declared = inherited.roles === 'intent' && !core.includes(name);
      return { name, inherited: true, changed: name in own, dropped: own[name] === null, source: declaration?.source ?? inherited.source, tones: Object.keys((declaration?.source ?? inherited.source)?.tones ?? {}).length, base: inherited.source, description: declaration?.description ?? '', declared,
        // Answering computes a whole probe system (`canDrop`): asked only when a control reads it, e.g. not on the
        // first level, which shows the primary palette alone.
        get droppable() {
          return declared && canDrop(baseId, name);
        },
      };
    });
    if (!('primary' in system.palettes)) rows.unshift({ name: 'primary', inherited: true, monochrome: !own.primary, changed: Boolean(own.primary), source: own.primary?.source ?? null, tones: Object.keys(own.primary?.source?.tones ?? {}).length, base: null, description: '', declared: false, droppable: false });
    for (const [name, declaration] of Object.entries(own)) if (declaration && !(name in system.palettes) && name !== 'primary') rows.push({ name, inherited: false, changed: true, added: true, source: declaration.source, tones: Object.keys(declaration.source?.tones ?? {}).length, base: null, description: declaration.description ?? '', declared: declaration.roles === 'intent', droppable: false });
    return rows.sort((a, b) => Number(b.name === 'primary') - Number(a.name === 'primary'));
  }

  /** Why a name cannot be added as a declared palette, or null. */
  function paletteNameProblem(layer, name) {
    if (!ID_PATTERN.test(name)) return 'pattern';
    if (name in baseOf(layer).system.palettes || name in (layer.palettes ?? {}) || name in vocabulary.intents) return 'taken';
    const roles = vocabulary.sets.intent.roles.map((p) => p.replace('{name}', name));
    if (roles.some((role) => role in vocabulary.roles)) return 'taken';
    return null;
  }

  const validSource = (source) => (source && 'seed' in source ? HEX_PATTERN.test(source.seed) : source && typeof source.hue === 'number' && typeof source.chroma === 'number' && source.hue >= 0 && source.hue <= 360 && source.chroma >= 0);
  /** The same color: the same seed, or the same hue and chroma. `source.tones` (exact colors for single tones) is not part of the question. */
  const sameColor = (a, b) => Boolean(a && b) && ('seed' in a && 'seed' in b ? a.seed.toLowerCase() === b.seed.toLowerCase() : !('seed' in a) && !('seed' in b) && a.hue === b.hue && a.chroma === b.chroma);
  const sameSource = (a, b) => sameColor(a, b) && same(a?.tones, b?.tones);
  /**
   * Set a palette's source and/or description. `undefined` removes the layer's entry (back to inherited).
   * `source.tones` fixes single tones to exact colors OF THAT COLOR: a patch that keeps the color keeps them, a patch
   * that changes the color drops them (M3's published purple tones under a red seed would leave the key roles purple).
   * A patch that names `tones` itself is taken as written.
   */
  function setPalette(layer, name, patch) {
    const { system } = baseOf(layer);
    const inherited = system.palettes[name];
    const monochrome = name === 'primary' && !inherited;
    if (patch === undefined) {
      const next = withEntry(layer, 'palettes', name, undefined);
      return monochrome && layer.palettes?.primary ? withoutOps(next, primaryRoles(system, layer.palettes.primary)) : next;
    }
    // A layer's declaration REPLACES the inherited one, so it is edited whole: start from what applies now.
    const current = layer.palettes?.[name] ?? inherited;
    let source = patch.source ?? current?.source;
    if (!validSource(source)) return layer;
    if (patch.source && !('tones' in patch.source)) {
      const fixed = [current?.source, inherited?.source].find((known) => known?.tones && sameColor(known, patch.source));
      if (fixed) source = { ...patch.source, tones: clone(fixed.tones) };
    }
    // The schema wants at least one tone under `tones`: a table emptied by the tone editor is no table.
    if (source.tones && !Object.keys(source.tones).length) source = Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'tones'));
    const description = (patch.description ?? current?.description ?? '').trim();
    const core = name in vocabulary.intents;
    let declaration;
    if (current) {
      declaration = { ...clone(current), source };
      if (description) declaration.description = description;
      else if (core || declaration.roles !== 'intent') delete declaration.description;
    } else if (core) declaration = { source };
    else declaration = { description: description || `A product-specific intent named "${name}".`, source, roles: 'intent' };
    if (inherited && sameSource(inherited.source, source) && same({ ...inherited, source }, declaration)) return withEntry(layer, 'palettes', name, undefined);
    let next = withEntry(layer, 'palettes', name, declaration);
    if (monochrome) next = tidy({ ...next, tokens: { ...primaryRoles(system, declaration), ...next.tokens } });
    return next;
  }
  function dropPalette(layer, name) {
    const { system } = baseOf(layer);
    if (!(name in system.palettes)) return withEntry(layer, 'palettes', name, undefined); // the layer's own: just remove it
    const tokens = { ...repoints(system, name), ...layer.tokens };
    return tidy({ ...layer, palettes: { ...layer.palettes, [name]: null }, tokens: Object.keys(tokens).length ? tokens : undefined });
  }
  function restorePalette(layer, name) {
    return withoutOps(withEntry(layer, 'palettes', name, undefined), repoints(baseOf(layer).system, name));
  }

  // Fixed tones (`source.tones`): exact colors for single tones of a palette — a published ramp, a contractual brand
  // color. They are part of the palette's declaration, so the table is edited through `setPalette`, whole.
  const TONE = /^(100|[1-9]?[0-9])$/;
  /** The fixed tones of a palette as rows, ascending: `[{ tone: 40, hex: '#e60012' }]`. */
  function paletteTones(layer, name) {
    const row = paletteRows(layer).find((r) => r.name === name);
    return Object.entries(row?.source?.tones ?? {}).map(([tone, hex]) => ({ tone: Number(tone), hex })).sort((a, b) => a.tone - b.tone);
  }
  /**
   * Replace a palette's tone table. `tones` is `{ "40": "#e60012" }`; an empty table removes `source.tones`.
   * Rows that are not a tone (0–100, whole) → hex are refused: the layer is returned unchanged.
   */
  function setPaletteTones(layer, name, tones) {
    const row = paletteRows(layer).find((r) => r.name === name);
    if (!row?.source || row.dropped) return layer;
    const entries = Object.entries(tones ?? {});
    if (entries.some(([tone, hex]) => !TONE.test(String(tone)) || !HEX_PATTERN.test(hex))) return layer;
    const sorted = Object.fromEntries(entries.sort(([a], [b]) => Number(a) - Number(b)));
    const { tones: _dropped, ...color } = row.source;
    return setPalette(layer, name, { source: { ...color, tones: sorted } });
  }
  /** The color the palette GENERATES for a tone (what a fixed tone replaces): a sensible start for a new row. */
  function generatedTone(layer, name, tone) {
    const view = preview(layer);
    const token = (view.model ?? baseOf(layer).model).tokens[`${NS}.ref.palette.${name}.${tone}`];
    return token?.value?.hex ?? null;
  }

  // ── typefaces, the icon set, shape, behaviour ──────────────────────────
  // Four groups of the second level. They write nothing special: ordinary operations under "tokens"
  // (`{ $value, reason }`, or an alias), so Every token and Source show and edit the same entries.
  const TYPEFACE = `${NS}.ref.typeface.`;
  const ICON = { family: `${TYPEFACE}icon`, unselected: `${NS}.sys.icon.family.unselected`, selected: `${NS}.sys.icon.family.selected`, weight: `${NS}.sys.icon.weight`, fillUnselected: `${NS}.sys.icon.fill.unselected`, fillSelected: `${NS}.sys.icon.fill.selected` };
  const SMOOTHING = `${NS}.sys.shape.corner-smoothing`;
  const BEHAVIOR = `${NS}.sys.behavior.`;
  const groupIds = {
    typefaces: () => TYPEFACES.map((key) => TYPEFACE + key),
    icons: () => Object.values(ICON),
    shape: () => [SMOOTHING],
    behavior: (layer) => Object.keys(baseOf(layer).model.tokens).filter((id) => id.startsWith(BEHAVIOR)),
  };
  const validReason = (reason) => (typeof reason === 'string' && reason.trim().length >= MIN_REASON ? reason.trim() : undefined);
  const isPin = (op) => Boolean(op) && '$value' in op && !isRef(op.$value);
  /** The value a token has under this layer: the layer's literal, else what the last computable system says. */
  function valueNow(layer, id) {
    const written = layer.tokens?.[id];
    const view = preview(layer);
    const token = (view.model ?? baseOf(layer).model).tokens[id];
    if (isPin(written) && !view.model) return { token, value: token?.type === 'fontFamily' && typeof written.$value === 'string' ? [written.$value] : written.$value };
    return { token, value: token?.value };
  }

  /** The reason the group's pins carry: the first one written, else the group's default. */
  function groupReason(layer, group) {
    const written = groupIds[group](layer).map((id) => layer.tokens?.[id]).find((op) => isPin(op) && validReason(op.reason));
    return written ? written.reason : GROUP_REASONS[group];
  }
  /**
   * Re-word the group's reason. Pins that carried the previous wording follow; a pin someone gave a reason of its own
   * (in Every token, in Source) keeps it. A reason that is too short writes nothing.
   */
  function setGroupReason(layer, group, reason) {
    const next = validReason(reason);
    if (!next) return layer;
    const previous = groupReason(layer, group);
    const tokens = { ...layer.tokens };
    let touched = false;
    for (const id of groupIds[group](layer)) {
      if (isPin(tokens[id]) && (tokens[id].reason === previous || !validReason(tokens[id].reason)) && tokens[id].reason !== next) {
        tokens[id] = { ...tokens[id], reason: next };
        touched = true;
      }
    }
    return touched ? tidy({ ...layer, tokens }) : layer;
  }

  /**
   * Pin one token of a group to a literal. Saying what the base already says removes the entry; a pin that already
   * has a reason keeps it, otherwise it takes `reason` (the group's), otherwise the group's default.
   */
  function pin(layer, group, id, value, reason) {
    const inherited = baseOf(layer).model.tokens[id];
    if (!inherited) return layer;
    if (!inherited.alias && same(inherited.value, value)) return withEntry(layer, 'tokens', id, undefined);
    const existing = layer.tokens?.[id];
    const why = validReason(isPin(existing) ? existing.reason : undefined) ?? validReason(reason) ?? groupReason(layer, group);
    const next = { ...(existing?.$type ? { $type: existing.$type } : {}), $value: value, reason: why };
    return same(existing, next) ? layer : withEntry(layer, 'tokens', id, next);
  }

  /** brand / plain / mono, as the list editor reads them (see fonts.js). */
  function typefaces(layer) {
    const inherited = baseOf(layer).model.tokens;
    return TYPEFACES.filter((key) => inherited[TYPEFACE + key]).map((key) => {
      const id = TYPEFACE + key;
      const { token, value } = valueNow(layer, id);
      const stack = Array.isArray(value) ? value : inherited[id].value;
      const parsed = parseStack(stack);
      return { key, id, stack, ...parsed, fallback: inferredGeneric(parsed), base: inherited[id].value, changed: Boolean(layer.tokens?.[id]), reason: layer.tokens?.[id]?.reason ?? '', description: token?.description ?? '' };
    });
  }
  /** `stack` is a DTCG fontFamily value, or the editor's model of one (`{ families, keywords, system, generic }`). */
  function setTypeface(layer, key, stack, reason) {
    const value = Array.isArray(stack) ? stack : composeStack(stack);
    if (!value.length || value.some((name) => typeof name !== 'string' || !name.trim())) return layer;
    return pin(layer, 'typefaces', TYPEFACE + key, value, reason);
  }

  /**
   * The icon set. `mode` "variable": one family (`ref.typeface.icon`) whose FILL axis tells selected
   * from unselected — both `sys.icon.family.*` follow it. "static": a family per selection state.
   */
  function iconSet(layer) {
    const now = (id) => valueNow(layer, id);
    const follows = (id) => {
      const written = layer.tokens?.[id];
      if (written && '$value' in written) return isRef(written.$value) && refId(written.$value) === ICON.family;
      return now(id).token?.alias === ICON.family;
    };
    const mode = follows(ICON.unselected) && follows(ICON.selected) ? 'variable' : 'static';
    const changed = Object.fromEntries(Object.entries(ICON).map(([name, id]) => [name, Boolean(layer.tokens?.[id])]));
    return {
      ids: ICON,
      mode,
      family: now(ICON.family).value,
      unselected: now(ICON.unselected).value,
      selected: now(ICON.selected).value,
      weight: now(ICON.weight).value,
      fillUnselected: now(ICON.fillUnselected).value,
      fillSelected: now(ICON.fillSelected).value,
      changed,
      anyChanged: Object.values(changed).some(Boolean),
    };
  }
  const familyList = (value) => (Array.isArray(value) ? value : [value]).map((name) => String(name ?? '').trim()).filter(Boolean);
  /**
   * @param {{ mode?: 'variable' | 'static', family?: string[], unselected?: string[], selected?: string[], weight?: number, fillUnselected?: number, fillSelected?: number }} patch
   */
  function setIconSet(layer, patch, reason) {
    let next = layer;
    const current = iconSet(layer);
    const follow = (l, id) => applyOperation(l, id, { $value: `{${ICON.family}}` }).layer;
    if (patch.mode === 'variable' && current.mode !== 'variable') {
      // One family again: the two state families go back to following it.
      next = follow(follow(next, ICON.unselected), ICON.selected);
    } else if (patch.mode === 'static' && current.mode !== 'static') {
      // A family per state, starting from what both show now. (A literal where the base has an alias IS a change.)
      next = pin(next, 'icons', ICON.unselected, current.unselected, reason);
      next = pin(next, 'icons', ICON.selected, current.selected, reason);
    }
    const mode = patch.mode ?? current.mode;
    if (patch.family && familyList(patch.family).length) next = pin(next, 'icons', ICON.family, familyList(patch.family), reason);
    if (mode === 'static') {
      for (const state of ['unselected', 'selected']) if (patch[state] && familyList(patch[state]).length) next = pin(next, 'icons', ICON[state], familyList(patch[state]), reason);
    }
    if (typeof patch.weight === 'number' && patch.weight >= 1 && patch.weight <= 1000) next = pin(next, 'icons', ICON.weight, patch.weight, reason);
    for (const fill of ['fillUnselected', 'fillSelected']) if (typeof patch[fill] === 'number' && patch[fill] >= 0 && patch[fill] <= 1) next = pin(next, 'icons', ICON[fill], patch[fill], reason);
    return next;
  }

  /** Corner smoothing: one number, 0–1, with Figma's meaning. `base` is what the layer inherits. */
  function cornerSmoothing(layer) {
    const inherited = baseOf(layer).model.tokens[SMOOTHING];
    const { token, value } = valueNow(layer, SMOOTHING);
    const amount = typeof value === 'number' ? value : inherited?.value ?? 0;
    return { id: SMOOTHING, value: amount, base: inherited?.value ?? 0, description: token?.description ?? inherited?.description ?? '', changed: Boolean(layer.tokens?.[SMOOTHING]), reason: layer.tokens?.[SMOOTHING]?.reason ?? '' };
  }
  /** Anything outside 0–1 writes nothing; the base's own amount removes the entry. */
  function setCornerSmoothing(layer, amount, reason) {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount < CORNER_SMOOTHING.min || amount > CORNER_SMOOTHING.max) return layer;
    return pin(layer, 'shape', SMOOTHING, Math.round(amount * 1000) / 1000, reason);
  }
  /** The four weight steps emphasized text gains, as the layer resolves them: `{ display, heading, body, label }`. */
  function typeEmphasis(layer) {
    const view = preview(layer);
    const tokens = (view.model ?? baseOf(layer).model).tokens;
    return Object.fromEntries(['display', 'heading', 'body', 'label'].map((family) => [family, tokens[`${NS}.sys.typescale.emphasis.${family}`]?.value ?? 0]));
  }

  /** Choices of kind: the NAMES a layer chooses among. The layer stores the index; nothing else ever shows it. */
  function behaviors(layer) {
    const inherited = baseOf(layer).model.tokens;
    return groupIds.behavior(layer).filter((id) => inherited[id].enum?.values?.length).map((id) => {
      const { value } = valueNow(layer, id);
      const values = inherited[id].enum.values;
      // The engine also accepts the NAME as `$value` (someone typed it in Source); everything here speaks in names anyway.
      const index = Number.isInteger(value) && values[value] ? value : values.includes(value) ? values.indexOf(value) : inherited[id].value;
      return { id, key: id.slice(BEHAVIOR.length), values, index, value: values[index], base: values[inherited[id].value], description: inherited[id].description ?? '', changed: Boolean(layer.tokens?.[id]), reason: layer.tokens?.[id]?.reason ?? '' };
    });
  }
  /** `name` is one of the token's `dev.tanrei.enum` values; anything else writes nothing. */
  function setBehavior(layer, id, name, reason) {
    const values = baseOf(layer).model.tokens[id]?.enum?.values;
    const index = values?.indexOf(name) ?? -1;
    if (index === -1) return layer;
    const existing = layer.tokens?.[id];
    if (isPin(existing) && existing.$value === name) return layer; // written by name: the same choice, kept as written
    return pin(layer, 'behavior', id, index, reason);
  }
  /** Back to what the base says, for a whole group. */
  function resetGroup(layer, group) {
    return groupIds[group](layer).reduce((l, id) => withEntry(l, 'tokens', id, undefined), layer);
  }

  // ── per-token operations ─────────────────────────────────────────────────────────────────────
  /**
   * Write one operation (or `null`: revert to inherited). A literal pin without a reason is NOT written; an
   * operation that says what the base already says writes nothing.
   * @returns {{ layer: object, problem?: 'reason' }}
   */
  function applyOperation(layer, id, op) {
    if (op === null || op === undefined) return { layer: withEntry(layer, 'tokens', id, undefined) };
    const next = clone(op);
    if (same(layer.tokens?.[id], next)) return { layer }; // what is already written stays as written, redundant or not
    const literal = '$value' in next && !isRef(next.$value);
    if (id.startsWith(DIAL) && literal && Object.keys(next).every((k) => k === '$value' || k === 'reason')) {
      const value = dialValue(next);
      if (typeof value === 'number') return { layer: setDial(layer, id, value, next.reason) };
    }
    if (literal && (typeof next.reason !== 'string' || next.reason.trim().length < MIN_REASON)) return { layer, problem: 'reason' };
    if (literal) next.reason = next.reason.trim();
    else delete next.reason;
    const inherited = baseOf(layer).model.tokens[id];
    const only = (key) => Object.keys(next).length === 1 && key in next;
    if (only('scale') && next.scale === 1) return { layer: withEntry(layer, 'tokens', id, undefined) };
    if (only('$value') && isRef(next.$value) && inherited?.alias === refId(next.$value)) return { layer: withEntry(layer, 'tokens', id, undefined) };
    if (only('derive') && inherited?.derive && same(inherited.derive, next.derive)) return { layer: withEntry(layer, 'tokens', id, undefined) };
    return { layer: withEntry(layer, 'tokens', id, next) };
  }

  /**
   * Add vocabulary: `{ vocabulary: { <id>: <declaration> }, tokens?: { <id>: <operation> } }`. Every
   * declaration needs a rationale, and the engine must accept the result — otherwise nothing is written.
   * @returns {{ layer: object, problem?: string }}
   */
  function addExtension(layer, fragment) {
    const declarations = Object.entries(fragment?.vocabulary ?? {});
    if (!declarations.length) return { layer, problem: 'nothing to declare' };
    for (const [id, declaration] of declarations) {
      if (typeof declaration.rationale !== 'string' || declaration.rationale.trim().length < MIN_REASON) return { layer, problem: `${id}: an extension needs a "rationale" of at least ${MIN_REASON} characters — why does this product need it?` };
      if (id.split('.').slice(1).some((segment) => !KEY_PATTERN.test(segment))) return { layer, problem: `${id}: names are lowercase letters, digits and hyphens` };
    }
    const tokens = { ...layer.tokens, ...clone(fragment.tokens ?? {}) };
    const candidate = tidy({ ...layer, vocabulary: { ...layer.vocabulary, ...clone(fragment.vocabulary) }, tokens: Object.keys(tokens).length ? tokens : undefined });
    const schema = validateSchema?.(candidate) ?? [];
    if (schema.length) return { layer, problem: schema.join('\n') };
    try {
      compute(candidate);
    } catch (error) {
      return { layer, problem: error.message };
    }
    return { layer: candidate };
  }

  /** Remove a declaration and the operations that only made sense with it. */
  function removeExtension(layer, id) {
    let next = withEntry(layer, 'vocabulary', id, undefined);
    for (let guard = 0; guard < 200; guard += 1) {
      try {
        compute(next);
        break;
      } catch (error) {
        const orphan = /^(\S+): (unknown token|not a color role)/.exec(error.message)?.[1];
        if (!orphan || !next.tokens?.[orphan]) break;
        next = withEntry(next, 'tokens', orphan, undefined);
      }
    }
    return next;
  }

  /** Edit a declaration in place (its rationale, description, `from`, `scale`, inline value). */
  function setDeclaration(layer, id, declaration) {
    if (!layer.vocabulary?.[id]) return { layer, problem: `${id}: not declared by this layer` };
    if (typeof declaration.rationale !== 'string' || declaration.rationale.trim().length < MIN_REASON) return { layer, problem: 'rationale' };
    return { layer: withEntry(layer, 'vocabulary', id, clone(declaration)) };
  }

  function setRules(layer, rules) {
    return same(layer.rules, rules) ? layer : tidy({ ...layer, rules: rules.length ? rules : undefined });
  }

  // ── looking at one token ─────────────────────────────────────────────────────────────────────
  const matches = (pattern, id) => {
    const [p, s] = [pattern.split('.'), id.split('.')];
    return p.length === s.length && p.every((part, i) => part === '*' || part === s[i]);
  };
  /** Which layer decided this token's value. */
  function setBy(computed, token) {
    const op = computed.system.tokens[token.id];
    if (op?.layer) return { layer: op.layer, how: 'tokens' };
    if (token.state) {
      const hits = computed.chain.flatMap((layer) => (layer.rules ?? []).filter((rule) => matches(rule.match, token.id)).map((rule) => ({ layer: layer.id, rule, wildcards: rule.match.split('.').filter((part) => part === '*').length })));
      const fewest = Math.min(...hits.map((hit) => hit.wildcards));
      const hit = hits.filter((h) => h.wildcards === fewest).at(-1);
      if (hit) return { layer: hit.layer, how: 'rules', match: hit.rule.match };
    }
    if (token.vocabulary?.declaredBy) return { layer: token.vocabulary.declaredBy, how: 'vocabulary' };
    if (token.path[0] === 'ref' && ['palette', 'alpha'].includes(token.path[1])) {
      const owner = [...computed.chain].reverse().find((layer) => layer.palettes?.[token.path[2]]);
      if (owner) return { layer: owner.id, how: 'palettes' };
    }
    return { layer: rootId, how: 'default' };
  }

  function axisOf(computed, id) {
    const [ns, tier, component, ...rest] = id.split('.');
    const declared = ns === NS && tier === 'comp' ? computed.model.components[component] : null;
    if (!declared) return undefined;
    const prefix = `${NS}.comp.${component}`;
    for (const [axis, decl] of Object.entries(declared.axes)) {
      if (decl.from === 'states') {
        if (declared.states?.variants?.includes(rest[0])) return { id: `${prefix}.${axis}`, key: rest[0], values: declared.states.variants };
      } else if (decl.members.includes(rest.slice(0, -1).join('.')) && decl.values.includes(rest.at(-1))) return { id: `${prefix}.${axis}`, key: rest.at(-1), values: decl.values };
    }
    return undefined;
  }

  /** The rule a color role follows: the layer chain's operation, or the tone template its palette gives it. */
  function roleRule(computed, role) {
    const op = computed.system.tokens[SYS_COLOR + role];
    if (op?.derive) return op.derive;
    const template = engine.roleTable(computed.system, vocabulary).get(role)?.template;
    return template ? { fn: 'tone', ...clone(template) } : null;
  }

  /** Everything "Every token" shows for one token, and the only edits it may offer. */
  function describe(view, id) {
    const token = view.model.tokens[id];
    if (!token) return null;
    const role = id.startsWith(SYS_COLOR) ? id.slice(SYS_COLOR.length) : null;
    // `choices`: the names of a choice of kind — the engine then offers "choose", by name.
    const descriptor = { id, type: token.type, value: token.value, alias: token.alias ?? null, rule: role ? roleRule(view, role) : (token.derive ?? null), state: token.state ?? false, axis: axisOf(view, id), choices: token.enum?.values };
    const written = view.layer.tokens?.[id];
    const inherited = baseOf(view.layer).model.tokens[id];
    return {
      token,
      descriptor,
      kind: tokenKind(descriptor, { namespace: NS }),
      setBy: setBy(view, token),
      written,
      declaration: view.layer.vocabulary?.[id],
      inherited,
      operations: [...legalOperations(descriptor, { namespace: NS }), ...(written ? [{ op: 'revert to inherited', write: null, effect: '' }] : [])],
      recipes: extensionRecipes(descriptor, view.layer.id, { namespace: NS }),
      followers: view.followers(id),
      schemes: token.type === 'color' ? Object.fromEntries(SCHEMES.map((scheme) => [scheme, view.model.perScheme[scheme][id]?.value])) : null,
    };
  }

  /** Every token of the system as flat rows, in document order: tier → group → token. */
  function rows(view) {
    return Object.values(view.model.tokens).map((token) => {
      const [tier, ...rest] = token.path;
      const own = token.namespace !== NS;
      const group = own ? `${token.namespace}.${tier}.${rest[0]}` : tier === 'comp' || tier === 'dial' ? rest[0] : tier === 'ref' ? rest.slice(0, 2).join('.') : rest.length > 2 ? rest.slice(0, 2).join('.') : rest[0];
      return { id: token.id, tier: own ? 'own' : tier, group, type: token.type, extension: Boolean(token.vocabulary?.extension), changed: Boolean(view.layer.tokens?.[token.id] || view.layer.vocabulary?.[token.id]) };
    });
  }

  /** Tokens a token of this type may point at: same type, never a higher tier, never itself or what follows it. */
  function aliasTargets(view, id) {
    const token = view.model.tokens[id];
    const TIERS = ['dial', 'ref', 'sys', 'comp'];
    const tier = TIERS.indexOf(token.path[0]);
    const blocked = new Set([id, ...view.followers(id)]);
    return Object.values(view.model.tokens)
      .filter((t) => t.type === token.type && !blocked.has(t.id) && TIERS.indexOf(t.path[0]) <= tier && !(token.namespace === NS && t.namespace !== NS) && !t.state)
      .filter((t) => (id.startsWith(SYS_COLOR) ? t.id.startsWith(SYS_COLOR) : t.path[0] !== 'ref' || token.type !== 'color'))
      .map((t) => t.id);
  }

  /** The series a layer can add a step to: groups of `sys` whose tokens share a type, plus the color roles. */
  function series(view) {
    const groups = new Map();
    for (const token of Object.values(view.model.tokens)) {
      if (token.namespace !== NS || token.path[0] !== 'sys') continue;
      const key = token.path.slice(0, -1).join('.');
      const entry = groups.get(key) ?? groups.set(key, { id: `${NS}.${key}`, type: token.type, steps: [] }).get(key);
      entry.steps.push(token.id);
    }
    return [...groups.values()].filter((group) => group.steps.length > 1);
  }

  /** The key contrast pairs the page shows as cards; the full report is `warnings`, the build's own. */
  function pairs(view, level = 'standard') {
    const suffix = level === 'standard' ? '' : `-${level}`;
    const roles = view.model.colors.light;
    const extension = Object.entries(roles).filter(([, token]) => token.vocabulary?.onRole).map(([role, token]) => [token.vocabulary.onRole.slice(SYS_COLOR.length), role]);
    const list = [...view.intents.map((intent) => [`on-${intent}`, intent]), ['on-surface', 'surface'], ['on-surface-variant', 'surface'], ['link', 'surface'], ['outline', 'surface'], ['focus-ring', 'surface'], ...extension];
    return list
      .filter(([fg, bg]) => roles[fg] && roles[bg])
      .map(([fg, bg]) => {
        const required = ['outline', 'focus-ring'].includes(fg) ? 3 : level === 'high' ? 7 : 4.5;
        return { fg, bg, required, themes: ['light', 'dark'].map((theme) => {
          const colors = view.model.colors[`${theme}${suffix}`];
          const ratio = contrast(colors[fg].value, colors[bg].value);
          return { theme, ratio, pass: ratio >= required, fg: colors[fg].value.hex, bg: colors[bg].value.hex };
        }) };
      });
  }

  /** Import: anything that is a JSON object is a layer the Studio can hold; what is wrong with it is reported, not refused… */
  function fromLayer(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('a layer is a JSON object');
    const schemaProblems = validateSchema?.(input) ?? [];
    if (schemaProblems.length) throw new Error(schemaProblems.join('\n'));
    // …except a layer this Studio cannot compute at all: one that extends something it does not ship.
    if (input.extends && !find(input.extends)) throw new Error(`"extends": "${input.extends}" is not a shipped system (${known()})`);
    if (!input.extends && input.id !== rootId) throw new Error(`the Studio edits layers that extend a shipped system ("extends": ${systems.map((s) => `"${s.id}"`).join(' | ')})`);
    return clone(input);
  }

  return {
    namespace: NS, rootId, defaultId, systems, schemes: SCHEMES, tagPrefix: config.web.tagPrefix,
    // What the specs say of each component — its level, its listing, what it is built from (./listing.js); none where the host gives none.
    catalog,
    cssVar, roleVar, blank, fromLayer, preview, paletteProperties, base, baseOf,
    setMeta, setBase, dials, setDial, essentials, setEssential,
    setParents, paletteRows, paletteNameProblem, setPalette, dropPalette, restorePalette, paletteTones, setPaletteTones, generatedTone,
    typefaces, setTypeface, iconSet, setIconSet, cornerSmoothing, setCornerSmoothing, typeEmphasis, behaviors, setBehavior, groupReason, setGroupReason, resetGroup,
    applyOperation, addExtension, removeExtension, setDeclaration, setRules,
    describe, rows, aliasTargets, series, pairs,
  };
}
