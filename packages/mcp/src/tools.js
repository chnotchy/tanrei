// The tools. Each has a JSON Schema for its input and returns one compact JSON object; lists are always
// paginated (`total`, `offset`, `limit`, `nextOffset`) so an agent never receives the whole vocabulary unasked.
import fs from 'node:fs';
import path from 'node:path';
import { ENUM, cannot, enumName, extensionRecipes as engineRecipes, legalOperations as engineOperations, matchingRules, operationFor, ruleDependencies } from '@tanrei/token-engine';
import { idToVar as cssVar } from '@tanrei/tokens-build/emit/css';
import { PRESET_CRITERIA_NOTE, isCriterionFinding, leadWithStructure } from '@tanrei/tokens-build/invariants';
import { CONFIG, DEFAULT_SYSTEM, DERIVE, NS, REPO_ROOT, ROOT_SYSTEM, SCHEMES, SEGMENT, STATE, ToolError, declaredExtensions, isPlaceholder, isRef, listedSystems, loadContext, readLayers, shippedLayer, shippedSystems, trialBuild, validateLayer } from './systems.js';

// Names come from tanrei.config.json; the engine is a pure library and takes the namespace as a parameter.
const legalOperations = (descriptor) => engineOperations(descriptor, { namespace: NS });
const extensionRecipes = (descriptor, layerId) => engineRecipes(descriptor, layerId, { namespace: NS });
const CANNOT = cannot(NS);

const TIERS = ['dial', 'ref', 'sys', 'comp'];
const SYS_COLOR = `${NS}.sys.color.`;

// ── shared input fragments ───────────────────────────────────────────────
const systemProperties = {
  system: { type: 'string', description: `A shipped system id (default "${DEFAULT_SYSTEM}"), or the path of a product's <id>.system.json.` },
  layerFile: { type: 'string', description: "Path of a product's <id>.system.json (absolute, or relative to the server's working directory). Wins over `system`." },
};
const schemeProperty = { type: 'string', enum: SCHEMES, default: 'light', description: 'Theme × contrast. Only colors differ between schemes.' };
const pagination = (limit, max) => ({
  limit: { type: 'integer', minimum: 1, maximum: max, default: limit },
  offset: { type: 'integer', minimum: 0, default: 0 },
});

function page(items, { offset = 0, limit }) {
  const slice = items.slice(offset, offset + limit);
  return { total: items.length, offset, limit, nextOffset: offset + slice.length < items.length ? offset + slice.length : null, items: slice };
}

// ── describing a token ───────────────────────────────────────────────────
const tierOf = (id) => id.split('.')[1];
const clip = (text, max = 140) => (typeof text === 'string' && text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** DTCG values, compact: "6px", "200ms", "#1b1b1b", "#000000 / 0.4"; composite values keep their fields. */
export function formatValue(value) {
  if (Array.isArray(value)) return value.map(formatValue);
  if (!value || typeof value !== 'object') return value;
  if ('colorSpace' in value) {
    const hex = value.hex ?? `#${value.components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
    return value.alpha === undefined || value.alpha === 1 ? hex : `${hex} / ${value.alpha}`;
  }
  if ('value' in value && 'unit' in value && Object.keys(value).length === 2) return `${value.value}${value.unit}`;
  return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, formatValue(v)]));
}

/**
 * A choice of kind is stored as an index because DTCG has no string type. No tool shows the number
 * without its name: `value` is the NAME; `choice` adds the index and the names a layer may choose among.
 */
const choiceOf = (token) => {
  const names = token.$extensions?.[ENUM]?.values;
  return names ? { value: enumName(token) ?? token.$value, choice: { name: enumName(token) ?? null, index: token.$value, of: names } } : null;
};
const shownValue = (token) => choiceOf(token)?.value ?? formatValue(token.$value);

/** derived | fixed | alias | dial — and the rule behind a derived value. Color roles are valued by the palette engine. */
function kindAndRule(ctx, token) {
  const id = token.id;
  if (id.startsWith(SYS_COLOR)) {
    const op = ctx.system.tokens[id];
    if (isRef(op?.$value)) return { kind: 'alias' };
    const target = token.aliasChain?.[0]?.split('.') ?? [];
    return { kind: 'derived', rule: op?.derive ?? { fn: 'tone', palette: target[3], note: 'The default tones every intent palette gets; the palette is declared under "palettes".' } };
  }
  if (id.startsWith(`${NS}.ref.palette.`)) {
    const [palette, tone] = id.split('.').slice(3);
    // A palette source may state single tones exactly (`source.tones`); every other tone is generated from the seed.
    const exact = ctx.system.palettes?.[palette]?.source?.tones?.[tone];
    return { kind: 'derived', rule: { palette, tone: Number(tone), ...(exact ? { exact, note: 'An exact color the palette declares under "source.tones" — not generated from the seed. Change the palette under "palettes", not this token.' } : { note: 'A tone of a declared palette. Change the palette under "palettes", not this token.' }) } };
  }
  if (isRef(token.originalValue?.$value)) return { kind: 'alias' };
  const rule = token.$extensions?.[DERIVE];
  if (rule && 'fixed' in rule) return { kind: 'fixed', rule };
  if (rule) return { kind: 'derived', rule };
  return { kind: tierOf(id) === 'dial' ? 'dial' : 'fixed' };
}

function requireToken(ctx, id, scheme = 'light') {
  const token = ctx.tokens(scheme)[id];
  if (token) return token;
  const ids = Object.keys(ctx.tokens('light'));
  let prefix = id.split('.');
  let near = [];
  while (prefix.length > 3 && !near.length) {
    prefix = prefix.slice(0, -1);
    near = ids.filter((other) => other.startsWith(`${prefix.join('.')}.`));
  }
  throw new ToolError(`${id}: not in system "${ctx.id}". If a token with this meaning exists, use it (search_tokens; \`near\` lists its neighbours). To add it, declare it under "vocabulary" with a rationale — see propose_extension.`, { near: near.slice(0, 8) });
}

/** The neutral descriptor the engine's `legalOperations` / `extensionRecipes` take. */
function descriptorOf(ctx, token, { kind, rule }) {
  return { id: token.id, type: token.$type, value: token.$value, alias: kind === 'alias' ? (token.aliasChain?.[0] ?? null) : null, rule: rule ?? null, state: token.$extensions?.[STATE] ?? false, axis: ctx.axisOf(token.id) ?? undefined, choices: token.$extensions?.[ENUM]?.values };
}

/** The layer an edit would be written into: the product's own, when the system is one. */
const editableLayerId = (ctx) => (shippedSystems().includes(ctx.id) ? undefined : ctx.id);
const extensionFlags = (ctx, token) => {
  const extension = ctx.extensionOf(token);
  return extension ? { extension: true, declaredBy: extension.declaredBy } : {};
};

// ── 1. list_systems ──────────────────────────────────────────────────────
/** Extensions of the vocabulary that exist in a system — its own and the ones it inherits. */
function summarizeExtensions(extensions, first = 6) {
  const byKind = {};
  for (const { kind } of extensions) byKind[kind] = (byKind[kind] ?? 0) + 1;
  return { total: extensions.length, ...(extensions.length ? { byKind } : {}), first: extensions.slice(0, first).map(({ id, kind, declaredBy }) => ({ id, kind, declaredBy })) };
}

/**
 * Exactness, measured: a preset that reproduces a published design system carries the report its last
 * build wrote — tokens/generated/<id>/fidelity.json, a committed file the drift check keeps current. Read, not
 * computed; the packaged server carries its own copy of these reports (scripts/build.js). `measured` is what the
 * ratio is taken over: the reference tokens in scope, minus those another mapping covers.
 */
function fidelityOf(id) {
  const file = path.join(REPO_ROOT, 'tokens/generated', id, 'fidelity.json');
  if (!fs.existsSync(file)) return undefined;
  const { equal, total, covered, different, unmapped, reference } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { equal, measured: total - covered, different: different.length, unmapped: unmapped.length, reference: { name: reference.name, version: reference.version, source: reference.source } };
}

function summarizeLayer(layer, chain) {
  const palettes = Object.entries(layer.palettes ?? {});
  return {
    id: layer.id,
    name: layer.name,
    extends: layer.extends ?? null,
    description: layer.description,
    inspiredBy: layer.attribution?.inspiredBy,
    palettes: palettes.filter(([, decl]) => decl).map(([name, decl]) => (decl.roles === 'intent' ? `${name} (intent roles)` : name)),
    droppedPalettes: palettes.filter(([, decl]) => decl === null).map(([name]) => name),
    valueChanges: Object.keys(layer.tokens ?? {}).length,
    patternRules: (layer.rules ?? []).length,
    extensions: summarizeExtensions(declaredExtensions(chain)),
  };
}

async function listSystemsTool({ layerFile, warnings = true }) {
  // The product first: a layer file that cannot be read or built is refused before the shipped systems are built
  // for their warning counts (seconds each), not after.
  const ctx = layerFile ? await loadContext({ layerFile }) : null;
  const shipped = [];
  for (const id of listedSystems()) {
    const summary = summarizeLayer(shippedLayer(id), readLayers({ system: id }).chain);
    const fidelity = fidelityOf(id);
    if (fidelity) summary.fidelity = fidelity;
    if (warnings) {
      const findings = await (await loadContext({ system: id })).warnings();
      // The default system has none (a violation fails its build). An imitation preset is not held to Tanrei's accessibility
      // criteria in any contrast scheme: its contrast findings are measurements, not warnings.
      if (id === DEFAULT_SYSTEM) summary.accessibilityWarnings = findings.length;
      else {
        // A structural or functional finding is not a measurement: it fails the preset's build, so a shipped preset has none.
        const failures = findings.filter((f) => !isCriterionFinding(f));
        summary.accessibility = { criteria: 'not-applied', measurements: findings.length - failures.length, because: PRESET_CRITERIA_NOTE, ...(failures.length ? { failures } : {}) };
      }
    }
    shipped.push(summary);
  }
  const result = { root: ROOT_SYSTEM, default: DEFAULT_SYSTEM, schemes: SCHEMES, shipped };
  if (ctx) {
    const known = new Set(shippedSystems());
    result.product = {
      id: ctx.id,
      chain: ctx.chain.map((l) => l.id),
      layers: ctx.chain.filter((l) => !known.has(l.id)).map((l) => summarizeLayer(l, ctx.chain.slice(0, ctx.chain.indexOf(l) + 1))),
      ...(warnings ? { accessibilityWarnings: (await ctx.warnings()).length } : {}),
    };
  }
  return result;
}

// ── 2. search_tokens ─────────────────────────────────────────────────────
function matcher(query, namespaces = [NS]) {
  if (!query) return () => true;
  if (!query.includes('*')) {
    const needle = query.toLowerCase();
    return (id) => id.toLowerCase().includes(needle);
  }
  // `sys.color.on-*` means the vocabulary; a layer's own tokens are reached by their namespace (`acme.comp.*`).
  const rooted = namespaces.includes(query.split('.')[0]) || query.startsWith('*') ? query : `${NS}.${query}`;
  const segments = rooted.split('.');
  const source = segments
    // `*` stays inside one segment, as in a layer's pattern rules; `**`, or a `*` that ends the glob, takes the rest of the id.
    .map((segment, i) => (segment === '**' || (segment === '*' && i === segments.length - 1 && i > 0) ? '.+' : segment.replace(/[$()+?[\]^{|}\\]/g, '\\$&').replace(/\*/g, '[^.]*')))
    .join('\\.');
  const pattern = new RegExp(`^${source}$`);
  return (id) => pattern.test(id);
}

async function searchTokens({ query, tier, type, kind, extensions, limit = 25, offset = 0, ...reference }) {
  const ctx = await loadContext(reference);
  const all = Object.values(ctx.tokens('light'));
  const matches = matcher(query, [...new Set(all.map((token) => token.id.split('.')[0]))]);
  const found = [];
  for (const token of all) {
    if (!matches(token.id) || (tier && tierOf(token.id) !== tier) || (type && token.$type !== type)) continue;
    const described = kindAndRule(ctx, token).kind;
    if (kind && described !== kind) continue;
    const flags = extensionFlags(ctx, token);
    if (extensions !== undefined && extensions !== Boolean(flags.extension)) continue;
    found.push({ id: token.id, $type: token.$type, kind: described, ...(choiceOf(token) ? { value: choiceOf(token).value, choices: choiceOf(token).choice.of } : {}), ...flags, description: clip(token.$description ?? ctx.meta.get(token.id)?.vocabulary?.rationale) });
  }
  found.sort((a, b) => a.id.localeCompare(b.id));
  const { items, ...rest } = page(found, { offset, limit });
  return { system: ctx.id, ...rest, tokens: items };
}

// ── 3. resolve ───────────────────────────────────────────────────────────
function resolveOne(ctx, id, scheme, raw) {
  const token = requireToken(ctx, id, scheme);
  const { kind, rule } = kindAndRule(ctx, token);
  const tokens = ctx.tokens(scheme);
  const inputs = Object.fromEntries(ruleDependencies(rule).filter((dep) => tokens[dep]).map((dep) => [dep, formatValue(tokens[dep].$value)]));
  return {
    id,
    $type: token.$type,
    value: shownValue(token),
    ...(choiceOf(token) ? { choice: choiceOf(token).choice } : {}),
    ...(raw ? { $value: token.$value } : {}),
    kind,
    ...(token.aliasChain?.length ? { aliasChain: token.aliasChain } : {}),
    ...(rule ? { rule } : {}),
    ...(Object.keys(inputs).length ? { inputs } : {}),
    ...(ctx.system.tokens[id]?.layer ? { setBy: ctx.system.tokens[id].layer } : {}),
    ...extensionFlags(ctx, token),
    cssVar: cssVar(id),
  };
}

async function resolveTool({ token, tokens, scheme = 'light', raw = false, ...reference }) {
  const ids = [...(token ? [token] : []), ...(tokens ?? [])];
  if (!ids.length) throw new ToolError('Pass "token" (one id) or "tokens" (up to 50 ids). Use search_tokens to find ids.');
  const ctx = await loadContext(reference, { scheme });
  return {
    system: ctx.id,
    chain: ctx.chain.map((l) => l.id),
    scheme,
    tokens: ids.map((id) => {
      try {
        return resolveOne(ctx, id, scheme, raw);
      } catch (error) {
        if (!(error instanceof ToolError)) throw error;
        return { id, error: error.message, ...error.details };
      }
    }),
  };
}

// ── 4. explain_token ─────────────────────────────────────────────────────
async function explainToken({ token: id, scheme = 'light', ...reference }) {
  const ctx = await loadContext(reference, { scheme });
  const token = requireToken(ctx, id, scheme);
  const { kind, rule } = kindAndRule(ctx, token);
  const descriptor = descriptorOf(ctx, token, { kind, rule });
  const extension = ctx.extensionOf(token);
  const followers = ctx.followers(id);
  const meta = ctx.meta.get(id) ?? {};
  const palette = id.startsWith(SYS_COLOR) ? (rule?.palette ?? null) : id.startsWith(`${NS}.ref.palette.`) ? id.split('.')[3] : null;

  // Which pattern rule values the token is the engine's decision (explicit entry > fewer wildcards > later layer);
  // every matching rule is listed with whether it wins and why.
  const precedence = matchingRules(id, ctx.chain);
  const touchedBy = [];
  for (const layer of ctx.chain) {
    const operation = layer.tokens?.[id];
    const rules = precedence.rules.filter((r) => r.layer === layer.id).map(({ index, wins, because }) => ({ ...layer.rules[index], index, wins, because }));
    const declares = palette && layer.palettes && palette in layer.palettes ? { [palette]: layer.palettes[palette] } : undefined;
    if (operation || rules.length || declares) touchedBy.push({ layer: layer.id, ...(operation ? { operation } : {}), ...(rules.length ? { rules } : {}), ...(declares ? { palette: declares } : {}) });
  }
  const effective = token.$extensions?.[STATE] ? operationFor(id, ctx.system) : ctx.system.tokens[id];
  const { layer: setBy, ...effectiveOperation } = effective ?? {};

  return {
    id,
    system: ctx.id,
    chain: ctx.chain.map((l) => l.id),
    $type: token.$type,
    kind,
    value: shownValue(token),
    ...(choiceOf(token) ? { choice: choiceOf(token).choice } : {}),
    scheme,
    ...(token.aliasChain?.length ? { aliasChain: token.aliasChain } : {}),
    ...(rule ? { rule } : {}),
    cssVar: cssVar(id),
    description: token.$description,
    // Core vocabulary, or an extension a layer of this system declared — with who declared it and why.
    ...(extension ? { extension: true, ...extension } : {}),
    vocabulary: meta.vocabulary ?? null,
    // Usage guidance for agents, from the token and every group above it (outermost first). Optional metadata.
    llm: meta.llm?.length ? meta.llm : null,
    touchedBy: touchedBy.length ? touchedBy : extension ? `No layer changes ${id} after "${extension.declaredBy}" declared it: it has the value of its declaration.` : `No layer changes ${id}: it has the default the vocabulary gives it.`,
    ...(effective ? { effectiveOperation, ...(setBy ? { setBy } : {}) } : {}),
    // For a per-state token: the ONE pattern rule that values it (or the explicit entry that beats them all), and why.
    ...(precedence.rules.length ? { winningRule: precedence.explicit ? { explicit: true, layer: precedence.explicit.layer, because: `an explicit entry under "tokens" (layer "${precedence.explicit.layer}") beats every pattern` } : (({ layer, index, match, wildcards, because }) => ({ layer, index, match, wildcards, because }))(precedence.rules.find((r) => r.wins)) } : {}),
    usedBy: token.aliasedBy?.length ? { total: token.aliasedBy.length, first: token.aliasedBy.slice(0, 8) } : undefined,
    // What follows this token: every token whose value moves when it does, through aliases and rules (transitively).
    followers: { total: followers.length, first: followers.slice(0, 8) },
    howToChange: legalOperations(descriptor),
    howToExtend: extensionRecipes(descriptor, editableLayerId(ctx)),
    cannot: CANNOT,
    then: 'Every `write` is a fragment of a layer: merge it into the product\'s <id>.system.json ("tokens", "palettes", "rules" or "vocabulary"), check the file with validate_layer, then run `tanrei build`. For a complete, verified `vocabulary` declaration use propose_extension.',
  };
}

// ── 5. diff_systems ──────────────────────────────────────────────────────
const groupOf = (id) => id.split('.').slice(1, 3).join('.');

/** Ids that exist on one side only, told apart: vocabulary a layer declared (with who declared it) vs. what a palette brings. */
function onlyIn(ctx, tokens, ids) {
  const extensions = ids.flatMap((id) => {
    const extension = ctx.extensionOf(tokens[id]);
    return extension ? [{ id, declaredBy: extension.declaredBy }] : [];
  });
  const declared = new Set(extensions.map((e) => e.id));
  const fromPalettes = ids.filter((id) => !declared.has(id));
  return {
    total: ids.length,
    extensions: { total: extensions.length, first: extensions.slice(0, 12) },
    fromPalettes: { total: fromPalettes.length, first: fromPalettes.filter((id) => !id.startsWith(`${NS}.ref.`)).slice(0, 12) },
  };
}

async function diffSystems({ a, b, scheme = 'light', group, limit = 20, offset = 0 }) {
  const [left, right] = await Promise.all([loadContext({ system: a }, { scheme }), loadContext({ system: b }, { scheme })]);
  const [ta, tb] = [left.tokens(scheme), right.tokens(scheme)];
  const changed = [];
  const onlyInA = [];
  const onlyInB = Object.keys(tb).filter((id) => !(id in ta));
  for (const [id, token] of Object.entries(ta)) {
    if (!(id in tb)) onlyInA.push(id);
    else if (JSON.stringify(formatValue(token.$value)) !== JSON.stringify(formatValue(tb[id].$value))) {
      const direct = [left, right].flatMap((ctx) => (ctx.system.tokens[id]?.layer && ctx.system.tokens[id].layer !== ROOT_SYSTEM ? [ctx.system.tokens[id].layer] : []));
      changed.push({ id, a: shownValue(token), b: shownValue(tb[id]), ...(direct.length ? { setBy: [...new Set(direct)] } : {}) });
    }
  }
  changed.sort((x, y) => TIERS.indexOf(tierOf(x.id)) - TIERS.indexOf(tierOf(y.id)) || x.id.localeCompare(y.id));
  const groups = {};
  for (const { id } of changed) groups[groupOf(id)] = (groups[groupOf(id)] ?? 0) + 1;
  const byTier = Object.fromEntries(TIERS.map((tier) => [tier, changed.filter(({ id }) => tierOf(id) === tier).length]));
  const selected = group ? changed.filter(({ id }) => groupOf(id) === group || tierOf(id) === group) : changed;
  const { items, ...rest } = page(selected, { offset, limit });
  return {
    a: left.id,
    b: right.id,
    scheme,
    compared: Object.keys(ta).length - onlyInA.length,
    changed: changed.length,
    byTier,
    byGroup: groups,
    // Token SETS differ for two legitimate reasons: a layer extended the vocabulary, or declared/dropped a palette.
    onlyInA: onlyIn(left, ta, onlyInA),
    onlyInB: onlyIn(right, tb, onlyInB),
    ...(onlyInA.length || onlyInB.length ? { note: 'Ids on one side only are either EXTENSIONS — vocabulary a layer of that system declared, listed with `declaredBy` — or come from declared palettes (their four roles, and the ref.palette tones some role needs). Neither is an error.' } : {}),
    ...(group ? { group } : {}),
    ...rest,
    changes: items,
  };
}

// ── 6. validate_layer ────────────────────────────────────────────────────
async function validateLayerTool({ layer, layerFile, parents, dir, limit = 20 }) {
  if (!layer === !layerFile) throw new ToolError('Pass exactly one of "layer" (the JSON object) or "layerFile" (its path).');
  if (layerFile && (parents || dir)) throw new ToolError('"parents" and "dir" go with "layer". A layer FILE finds its parents next to itself.');
  const result = await validateLayer({ layer, layerFile, parents, dir });
  const { warnings, ...rest } = result;
  if (!result.valid) return { ...rest, next: 'Fix the problems and validate again. Nothing is built from an invalid layer.' };
  return {
    ...rest,
    // Thresholds are constants — for extensions too. In a product layer a violation warns; it is printed by `tanrei build` and stamped into every generated file.
    warnings: { total: warnings.length, severity: 'warning', first: leadWithStructure(warnings).slice(0, limit) },
    next: 'Run `tanrei build` to regenerate every platform from this layer.',
  };
}

// ── 7. propose_extension ─────────────────────────────────────────────────
const RATIONALE = '<why this design system or product needs it — 8+ characters>';
const REASON = '<why this value is pinned — 8+ characters>';
const STAND_IN = 'Stand-in text for a trial build; it is never written anywhere.';
const parentOf = (id) => id.split('.').slice(0, -1).join('.');

function checkNames(id, segments) {
  for (const segment of segments) if (!SEGMENT.test(segment)) throw new ToolError(`${id}: "${segment}" is not a valid name. Every segment is lowercase letters, digits and hyphens, starting with a letter or a digit (${SEGMENT.source}).`);
}

function refuseExisting(ctx, id, token, what) {
  const declaredBy = (token && ctx.extensionOf(token)?.declaredBy) ?? ctx.extensions.find((e) => e.id === id)?.declaredBy;
  throw new ToolError(`${id} already exists in "${ctx.id}" — ${declaredBy ? `layer "${declaredBy}" declared it` : 'it is core vocabulary'}. Declaring it again is an error (extensions are additive, declared once). ${what}`, {
    exists: { id, declaredBy: declaredBy ?? 'core' },
    ...(token ? { howToChange: legalOperations(descriptorOf(ctx, token, kindAndRule(ctx, token))) } : {}),
  });
}

/** One line per new token: scalars as they are, composites named (resolve gives the whole value). */
function briefValue(token) {
  const value = formatValue(token.$value);
  if (typeof value !== 'object' || value === null) return value;
  if (choiceOf(token)) return choiceOf(token).value;
  if (token.$type === 'typography') return `typography ${value.fontSize} / ${value.lineHeight} / ${value.fontWeight}${token.aliasChain?.length ? ` = {${token.aliasChain[0]}}` : ''}`;
  return `${token.$type}${token.aliasChain?.length ? ` = {${token.aliasChain[0]}}` : ' (composite; use resolve)'}`;
}

/** A starting definition for a new token next to `near`: the same kind of value its neighbour has. */
function definitionLike(ctx, near, tokens) {
  const { kind, rule } = kindAndRule(ctx, near);
  if (near.id.startsWith(SYS_COLOR)) {
    const role = near.id.slice(SYS_COLOR.length);
    const onRole = tokens[`${SYS_COLOR}on-${role}`] ? `${SYS_COLOR}on-${role}` : `${SYS_COLOR}on-surface`;
    return { derive: rule?.fn ? rule : { fn: 'tone', palette: rule?.palette ?? '<palette>', tone: { light: [90], dark: [30] } }, onRole };
  }
  if (kind === 'alias') return { $value: `{${near.aliasChain[0]}}` };
  if (kind === 'derived' && rule?.fn === 'mul') return { derive: { ...rule, by: `<coefficient — ${near.id.split('.').at(-1)} is ${rule.by}>` } };
  if (near.$type === 'typography') return { $value: '<a full text style, or an alias to another typescale role>' };
  return { $value: near.$value, reason: REASON };
}

async function proposeExtension({ kind, near, component, axis, from, value, scale, id, $type, definition, layerId, ...reference }) {
  const { reference: described, chain } = readLayers(reference);
  const into = described.kind === 'shipped' ? null : chain.at(-1); // the product layer the fragment is merged into
  if (into && layerId && layerId !== into.id) throw new ToolError(`"layerId" (${layerId}) is not the id of ${reference.layerFile ?? reference.system} (${into.id}). Pass one of them.`);
  const layer = into?.id ?? layerId ?? null;
  if (layer !== null && !into && (shippedSystems().includes(layer) || !/^[a-z][a-z0-9-]*$/.test(layer))) throw new ToolError(`"${layer}" cannot be a product layer's id: lowercase letters, digits and hyphens, and not a shipped system (${shippedSystems().join(', ')}).`);
  const ctx = await loadContext(reference);
  const tokens = ctx.tokens('light');
  const nearToken = near ? requireToken(ctx, near) : null;
  const fragment = { vocabulary: {} };
  const notes = [];
  let declaration;

  if (kind === 'axis-value') {
    const located = nearToken && ctx.axisOf(near);
    if (near && !located) throw new ToolError(`${near} is not on a component axis, so there is no size or variant to add next to it. Pass "component" and "axis", or use kind "step" / "own-token".`, { components: Object.fromEntries(Object.entries(ctx.components).map(([name, c]) => [name, Object.keys(c.axes)])) });
    const [componentName, axisName] = located ? located.id.split('.').slice(-2) : [component, axis];
    const declared = ctx.components[componentName];
    if (!declared) {
      // A component that declares no axis (a divider, a tooltip) is a component of the system: it has nothing a layer
      // could add a value to, which is not the same as not being there.
      const what = !componentName ? 'Pass "component" and "axis" (or "near": a token on the axis)' : ctx.componentNames.includes(componentName) ? `${NS}.comp.${componentName} declares no axis, so there is no size or variant to add a value to; a layer adds VALUES to an axis, not axes` : `"${componentName}" is not a component of this system`;
      throw new ToolError(`${what}. Components with an axis: ${Object.keys(ctx.components).join(', ')}.`);
    }
    const onAxis = declared.axes[axisName];
    if (!onAxis) throw new ToolError(`${declared.id} has no axis "${axisName}". Its axes: ${Object.keys(declared.axes).join(', ')}. Axes are declared by the component; a layer adds VALUES to an axis, not axes.`);
    if (!value) throw new ToolError(`Pass "value": the name of the new ${axisName} (e.g. "3x", "danger").`);
    checkNames(`${declared.id}.${axisName}.${value}`, [value]);
    if (declared.states.includes(value)) throw new ToolError(`"${value}" is an interaction state. States are not extensible: ${declared.states.join(', ')} are bound to platform behaviour, not to values. How a state LOOKS is a value — see explain_token on ${declared.id}.<variant>.${value}.container.color, or a pattern rule.`);
    declaration = `${declared.id}.${axisName}.${value}`;
    if (onAxis.values.includes(value)) refuseExisting(ctx, declaration, null, `Value its tokens under "tokens": search_tokens "${onAxis.members ? `${declared.id}.**.${value}` : `${declared.id}.${value}.**`}".`);
    const source = from ?? located?.key ?? onAxis.default;
    if (!onAxis.values.includes(source)) throw new ToolError(`"from" must be an existing ${axisName} of ${componentName} (${onAxis.values.join(', ')}), not "${source}".`);
    if (scale !== undefined && !onAxis.members) throw new ToolError(`"scale" applies to a size-like axis, whose members are numeric. A ${axisName} is cloned as it is; give its resting tokens values under "tokens".`);
    fragment.vocabulary[declaration] = { from: source, ...(scale !== undefined ? { scale } : {}), rationale: RATIONALE };
    if (onAxis.members) notes.push(`One line values every member of the axis (${onAxis.members.join(', ')}) from "${source}"${scale !== undefined ? ', scaled and still following the dials' : ''}. Override a single member under "tokens", e.g. "${declared.id}.${onAxis.members[0]}.${value}".`);
    else {
      // The resting tokens of the new variant, as cloned: the values an author re-points to make it a distinct emphasis.
      const prefix = `${declared.id}.${source}.`;
      // A part that references its own variant (the state-layer color aliases the label) follows the clone by
      // itself, so it is not offered for re-pointing.
      const resting = Object.values(tokens).filter((t) => t.id.startsWith(prefix) && !t.$extensions?.[STATE] && t.$type === 'color' && t.aliasChain?.length && !t.aliasChain[0].startsWith(prefix));
      if (resting.length) fragment.tokens = Object.fromEntries(resting.map((t) => [`${declared.id}.${value}.${t.id.slice(prefix.length)}`, { $value: `{${t.aliasChain[0]}}` }]));
      notes.push(`"tokens" holds the resting colors of "${value}", as cloned from "${source}": re-point the ones that make it a distinct ${axisName} and delete the rest. Its ${declared.states.join(', ')} tokens are valued by the system's pattern rules.`);
    }
  } else {
    declaration = id ?? (nearToken && value ? `${parentOf(near)}.${value}` : null);
    if (!declaration) throw new ToolError(kind === 'step' ? 'Pass "id" (the full id of the new token), or "near" (a token of the series) with "value" (the name of the new step).' : 'Pass "id": the full id of the new token, in the layer\'s own namespace.');
    const segments = declaration.split('.');
    if (kind === 'own-token') {
      if (!layer) throw new ToolError('A layer\'s own tokens live in the namespace of its id: pass "layerFile" (the product\'s layer) or "layerId".');
      if (segments[0] === NS) throw new ToolError(`${declaration} is inside Tanrei's tree; that is kind "step". A layer's own token is "${layer}.comp.<your-component>.<part>".`);
      if (segments[0] !== layer) throw new ToolError(`${declaration}: a layer's own tokens live in its own namespace — "${layer}.…", not "${segments[0]}.…". Did you mean "${[layer, ...segments.slice(1)].join('.')}"?`);
    } else if (segments[0] !== NS) throw new ToolError(`${declaration}: a step in a series is inside Tanrei's tree ("${NS}.sys.…"). For a token of your own namespace use kind "own-token".`);
    if (!['sys', 'comp'].includes(segments[1]) || segments.length < 4) throw new ToolError(`${declaration}: declare tokens under "${segments[0]}.sys.<group>.…" or "${segments[0]}.comp.<component>.…". Dials and the reference tier are not extensible; a color family is a palette ("palettes" with "roles": "intent").`);
    checkNames(declaration, segments.slice(1));
    if (tokens[declaration]) refuseExisting(ctx, declaration, tokens[declaration], 'Change its value instead — `howToChange` lists the legal operations.');
    const type = $type ?? nearToken?.$type;
    if (!type) throw new ToolError('Pass "$type" (color, dimension, number, duration, typography, shadow, cubicBezier, fontFamily, fontWeight), or "near": a token whose type and rule the new one takes after.');
    if (kind === 'step' && !Object.keys(tokens).some((other) => other.startsWith(`${parentOf(declaration)}.`))) notes.push(`${parentOf(declaration)} has no tokens yet: this starts a NEW group inside Tanrei's tree rather than adding a step to a series. The engine accepts it, but what only your product has is better declared in your own namespace (kind "own-token").`);
    const value_ = definition ?? (nearToken ? (kind === 'own-token' ? { $value: `{${near}}` } : definitionLike(ctx, nearToken, tokens)) : { $value: '<an alias "{tanrei.sys.…}", or a literal with a "reason">' });
    fragment.vocabulary[declaration] = { $type: type, rationale: RATIONALE, ...value_ };
    if (kind === 'own-token') notes.push(`Emitted as ${cssVar(declaration)} on the web and as a typed object next to your system on the native platforms. It may reference any ${NS}.* token; nothing in ${NS}.* may reference it.`);
  }

  // Verify: the base layer + this fragment, through the real build, with stand-ins for the texts only the author can write.
  const fill = [`vocabulary["${declaration}"].rationale — why this design system or product needs it. validate_layer refuses the placeholder; so should you.`];
  const standIn = JSON.parse(JSON.stringify(fragment), (key, v) => ((key === 'rationale' || key === 'reason') && isPlaceholder(v) ? STAND_IN : v));
  if (isPlaceholder(fragment.vocabulary[declaration].reason)) fill.push(`vocabulary["${declaration}"].reason — why the value is pinned.`);
  const open = JSON.stringify(standIn).match(/<[^<>"]*>/g) ?? [];
  fill.push(...open.map((text) => `${text} — replace it`));
  let verified;
  if (open.length) verified = { built: false, because: `The fragment still has ${open.length === 1 ? 'a placeholder' : 'placeholders'} only you can fill (${open.join(', ')}). Pass "definition" ({ "$value" | "derive", "reason"? }) to have the proposal built and its values reported, or fill it and run validate_layer.` };
  else {
    const base = into ?? { id: layer ?? 'proposal', name: 'Proposal', extends: ctx.id };
    const merged = { ...base, vocabulary: { ...base.vocabulary, ...standIn.vocabulary }, ...(standIn.tokens ? { tokens: { ...standIn.tokens, ...base.tokens } } : {}) };
    try {
      const trial = await trialBuild([...(into ? chain.slice(0, -1) : chain), merged]);
      const after = trial.tokens('light');
      const added = Object.keys(after).filter((other) => !(other in tokens)).sort();
      const before = new Set(await ctx.warnings());
      verified = {
        built: true,
        how: `Built "${ctx.id}" + this fragment with the real pipeline (a stand-in for the rationale). Nothing was written.`,
        newTokens: { total: added.length, values: Object.fromEntries(added.slice(0, 40).map((other) => [other, briefValue(after[other])])) },
        // The parent is resolved once per chain digest and kept; the trial's warnings read its light tokens and role colors only.
        newWarnings: (await trial.warnings()).filter((warning) => !before.has(warning)),
      };
    } catch (error) {
      if (!(error instanceof ToolError)) throw error;
      verified = { built: false, error: error.message, ...(error.details ?? {}) };
    }
  }

  return {
    kind,
    declares: declaration,
    system: ctx.id,
    layer: layer ?? '<the product layer that will declare it>',
    write: fragment,
    fill,
    ...(notes.length ? { notes } : {}),
    verified,
    next: `Merge \`write\` into ${into ? reference.layerFile ?? reference.system : "the product's <id>.system.json"}, fill the rationale, run validate_layer, then \`tanrei build\`. \`vocabulary\` says the token exists; change its value later under "tokens", like any core token.`,
  };
}

// ── 8. mimicry_gaps ──────────────────────────────────────────────────────
let registry;
function gapsRegistry() {
  registry ??= JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs/governance/mimicry-gaps.json'), 'utf8'));
  return registry;
}

function mimicryGaps({ status, kind, system, id, limit = 10, offset = 0 }) {
  const { gaps } = gapsRegistry();
  const needle = system?.toLowerCase();
  const found = gaps.filter((gap) => (!id || gap.id === id) && (!status || gap.status === status) && (!kind || gap.kind === kind) && (!needle || gap.systems.some((s) => s.toLowerCase().includes(needle))));
  const count = (key) => found.reduce((acc, gap) => ({ ...acc, [gap[key]]: (acc[gap[key]] ?? 0) + 1 }), {});
  const { items, ...rest } = page(found, { offset, limit });
  return {
    about: 'Traits of other design systems that Tanrei cannot reproduce yet. A shipped preset\'s accessibility measurements are not gaps: Tanrei\'s accessibility criteria do not apply to an imitation preset. MISSING VOCABULARY IS NOT A GAP any more: a size, a variant, a step, a color role or a product\'s own token is declared by the layer under "vocabulary" (propose_extension). What stays here is what no token can express — behaviours and mechanisms (ripple, continuous corners, materials) — each a defect in Tanrei, resolved by a new token TYPE, a small enumerated behaviour token, or a component composition option.',
    byStatus: count('status'),
    byKind: count('kind'),
    ...rest,
    gaps: items,
  };
}

// ── registry ─────────────────────────────────────────────────────────────
const object = (properties, required = []) => ({ type: 'object', additionalProperties: false, properties, required });

export const TOOLS = [
  {
    name: 'list_systems',
    description: "The design systems that ship with Tanrei (the default `tanrei` and the presets; every chain starts at the root layer `core`, which values the vocabulary and is not listed) and, with `layerFile`, a product's own layer chain. A system is a LAYER: it changes values of a small shared core vocabulary, and may EXTEND it under `vocabulary` — each system lists its extensions with the layer that declared them, and a preset measured against the published system it reproduces lists its `fidelity` (equal / measured reference tokens, how many differ or have no counterpart, and the reference). Start here.",
    inputSchema: object({
      layerFile: systemProperties.layerFile,
      warnings: { type: 'boolean', default: true, description: 'Count accessibility/structure warnings per system (builds each system once; cached). For an imitation preset the count is of contrast measurements that do not apply to it, under `accessibility`.' },
    }),
    handler: listSystemsTool,
  },
  {
    name: 'search_tokens',
    description: `Find tokens of the vocabulary by id. \`query\` is a case-insensitive substring, or a glob when it contains \`*\`: \`*\` matches within one segment, \`**\` any number of segments (e.g. \`${NS}.comp.button.*.hovered.*\`, \`sys.color.on-*\`, \`**.opacity\`). A layer's own tokens are found by their namespace (\`acme.comp.*\`). Returns id, $type, kind (derived | fixed | alias | dial), \`extension: true\` + \`declaredBy\` for vocabulary a layer added, and a short description, paginated. A choice of kind (\`sys.behavior.*\`) shows the NAME it has and the names it may take. Search before concluding a token is missing; if it really is, propose_extension adds it.`,
    inputSchema: object({
      query: { type: 'string', description: 'Substring or glob over token ids. Omit to list by tier/type.' },
      tier: { type: 'string', enum: TIERS, description: 'dial < ref < sys < comp. Components read comp tokens; comp aliases sys; sys derives from dials and palettes.' },
      type: { type: 'string', description: 'DTCG $type: color, dimension, number, duration, typography, cubicBezier, shadow, fontFamily, fontWeight…' },
      kind: { type: 'string', enum: ['derived', 'fixed', 'alias', 'dial'] },
      extensions: { type: 'boolean', description: 'true: only vocabulary that a layer of this system declared. false: only core vocabulary.' },
      ...systemProperties,
      ...pagination(25, 200),
    }),
    handler: searchTokens,
  },
  {
    name: 'resolve',
    description: 'The resolved value of one or more tokens in a system and scheme (a choice of kind — `sys.behavior.*` — as its NAME, with `choice: { name, index, of }`), with where it comes from: the alias chain, the derive rule and the current value of its inputs, which layer set it (and, for an extension, which layer declared it), and the CSS custom property name (`--tanrei-…`; `--<namespace>-…` for a layer\'s own tokens).',
    inputSchema: object({
      token: { type: 'string', description: `One token id, e.g. ${NS}.sys.shape.corner.small` },
      tokens: { type: 'array', items: { type: 'string' }, maxItems: 50 },
      ...systemProperties,
      scheme: schemeProperty,
      raw: { type: 'boolean', default: false, description: 'Also return the DTCG $value object (colors as components).' },
    }),
    handler: resolveTool,
  },
  {
    name: 'explain_token',
    description: 'Everything needed to change ONE token correctly: why it exists (the core rationale, or — for an extension — who declared it and why), usage guidance if the vocabulary carries any, which layers and pattern rules touch it (root first; every matching pattern rule says whether it `wins` and `because` — an explicit entry beats patterns, fewer wildcards beat more, the later layer wins a tie — and `winningRule` names the one that values the token), what follows it (`followers`), the operations a layer may legally write for it (`howToChange`; for a choice of kind: "choose", with the names; for a typeface: "set the font stack") and how to add vocabulary next to it (`howToExtend`: a step in its series, a size/variant on its axis, a token of your own). Every `write` is a ready-to-edit fragment of a layer. Call this before editing a layer.',
    inputSchema: object({ token: { type: 'string' }, ...systemProperties, scheme: schemeProperty }, ['token']),
    handler: explainToken,
  },
  {
    name: 'diff_systems',
    description: 'Tokens whose resolved value differs between two systems in one scheme. Counts come first (by tier and by group such as `sys.color`, `comp.button`); details are paginated and can be narrowed with `group`. Ids that exist on one side only are reported apart: extensions (with `declaredBy`) and what declared palettes bring.',
    inputSchema: object(
      {
        a: { type: 'string', description: 'Shipped system id, or path of a <id>.system.json.' },
        b: { type: 'string', description: 'Shipped system id, or path of a <id>.system.json.' },
        scheme: schemeProperty,
        group: { type: 'string', description: 'A tier (`sys`) or a group from `byGroup` (`sys.shape`).' },
        ...pagination(20, 200),
      },
      ['a', 'b'],
    ),
    handler: diffSystems,
  },
  {
    name: 'validate_layer',
    description: 'Check a product layer before it is saved or built: JSON Schema; then every problem at once, with the way out — `vocabulary` declarations as the engine judges them (a rationale, the layer\'s own namespace, declared once, an existing axis and `from`, never an interaction state), ids under `tokens`/`rules` that are neither core nor declared (declare them, or use the token that exists), a pinned literal without a `reason`, a `$type` change, leftover placeholders; then the real build, which is the final authority. If valid, returns the accessibility/structure warnings `tanrei build` would print. Writes nothing.',
    inputSchema: object({
      layer: { type: 'object', description: 'The layer as JSON: { "id", "extends", "vocabulary", "palettes", "tokens", "rules" }. It may extend a shipped system, a layer passed in "parents", or a layer file in "dir".' },
      parents: { type: 'array', items: { type: 'object' }, maxItems: 8, description: 'With "layer": other layers that exist only in this request and that the layer (or another parent) extends — a product that stacks its own layers. Any order; each needs an "id". They are validated too.' },
      dir: { type: 'string', description: 'With "layer": the directory that holds the product\'s other <id>.system.json files, where "extends" is looked up after "parents" and before the shipped systems. The layer itself shadows a file of the same id, so this validates what WOULD be written. "extends" is an id, never a path: only <dir>/<id>.system.json — a regular file inside the directory — is read.' },
      layerFile: systemProperties.layerFile,
      limit: { type: 'integer', minimum: 1, maximum: 200, default: 20, description: 'How many warnings to return.' },
    }),
    handler: validateLayerTool,
  },
  {
    name: 'propose_extension',
    description: `Write the \`vocabulary\` declaration that ADDS something to a system, checked and — where possible — built. Three kinds: "step" (a token inside Tanrei's tree: one more step of a series, or a single color role), "axis-value" (a size or variant of a component: one line values every member, e.g. button size "3x" from "large" × 1.5), "own-token" (a token of the product's own components, in the layer's namespace). Refuses what the engine would refuse — an id that already exists (change its value under \`tokens\` instead), an invalid name, a foreign namespace, an unknown axis or \`from\`, an interaction state — and returns \`write\` (a layer fragment with a rationale placeholder YOU must fill; validate_layer rejects the placeholder) plus \`verified\`: the new token ids and their values from a trial build, and any new warnings. Writes nothing.`,
    inputSchema: object(
      {
        kind: { type: 'string', enum: ['step', 'axis-value', 'own-token'] },
        near: { type: 'string', description: 'An existing token id the new thing sits next to. step: a token of the series (gives the group, $type and the shape of the rule). axis-value: a token on the axis (gives component, axis and `from`). own-token: the token it references.' },
        id: { type: 'string', description: `step / own-token: the full id of the new token, e.g. ${NS}.sys.space.space1200 or acme.comp.rating.star.size. A step may pass "near" + "value" instead.` },
        value: { type: 'string', description: 'axis-value: the name of the new size or variant ("3x", "danger"). step: the name of the new step, next to "near".' },
        component: { type: 'string', description: 'axis-value: the component, e.g. "button".' },
        axis: { type: 'string', description: 'axis-value: the axis, e.g. "size" or "variant".' },
        from: { type: 'string', description: "axis-value: the existing value to clone. Defaults to the value of `near`, or the axis's default." },
        scale: { description: 'axis-value on a size-like axis: multiply the numeric members — a number, or a map of member → number ({"container.height": 1.5}).', oneOf: [{ type: 'number', exclusiveMinimum: 0 }, { type: 'object', additionalProperties: { type: 'number', exclusiveMinimum: 0 } }] },
        $type: { type: 'string', description: 'step / own-token: the DTCG $type. Defaults to the $type of `near`.' },
        definition: { type: 'object', description: 'step / own-token: the value, exactly as the declaration takes it — { "$value": "{tanrei.sys.…}" } | { "$value": <literal>, "reason": "…" } | { "derive": {…} }, plus "onRole" for a color role. Without it the proposal takes after `near` and may leave a placeholder.' },
        ...systemProperties,
        layerId: { type: 'string', description: "The id of the product layer that will declare it, when there is no file yet. It is the namespace of the layer's own tokens." },
      },
      ['kind'],
    ),
    handler: proposeExtension,
  },
  {
    name: 'mimicry_gaps',
    description: "Tanrei's registry of traits it cannot reproduce yet (ripple, continuous corners, backdrop materials…). Missing VOCABULARY is not a gap — a layer declares it (propose_extension). Check this when a trait is a behaviour or a mechanism that no token value can express.",
    inputSchema: object({
      status: { type: 'string', enum: ['open', 'planned', 'resolved', 'wont-fix'] },
      kind: { type: 'string', description: 'behavior | mechanism | vocabulary | anatomy' },
      system: { type: 'string', description: 'Substring of the imitated system, e.g. "Material", "HIG", "cupertino".' },
      id: { type: 'string' },
      ...pagination(10, 100),
    }),
    handler: mimicryGaps,
  },
];
