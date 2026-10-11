// Per-state component tokens.
//
// A component declares WHICH states it has; a system's pattern rules decide HOW each state looks.
// That makes the style of interaction feedback a value-level choice: a state-layer mix (Tanrei, M3),
// explicit colors (Fluent, Primer), an opacity dim or nothing at all (Apple has no hover) — all with
// the same vocabulary, so components never branch on which design system is active.
//
// Declaration, on a component group in tokens/comp/*.tokens.json:
//   "$extensions": { "dev.tanrei.states": {
//     "variants": ["filled", …], "states": ["hovered", "focused", "pressed", "disabled"],
//     "perVariant": { "container.color": "color", … },   → tanrei.comp.<c>.<variant>.<state>.<part>
//     "perComponent": { "opacity": "number" } } }         → tanrei.comp.<c>.<state>.<part>
//
// Rules, in a system layer:  { "match": "tanrei.comp.*.*.hovered.container.color", <operation> }
//   operation = { "$value": "{…$1…}" }  alias (captures $1, $2… are the wildcard segments)
//             | { "$value": <literal> }
//             | { "derive": { "fn": "mix", "base": ref, "with": ref, "amount": ref|n|[std, medium, high]|{ light, dark } } }
//             | { "derive": { "fn": "alpha", "of": ref, "amount": ref|n|[std, medium, high]|{ light, dark } } }
//                 an amount is 0–1; a context map (contexts.js) is read for the scheme being generated, as a role's is
//             | { "derive": { "fn": "tone", "palette": "<name>", "tone": n | [std, medium, high] | { light, dark } } }
//                 an explicit tone of a declared palette per state — a ramp that is not monotonic (Fluent: rest 80,
//                 hover 70, pressed 40) cannot be said with a mix
//             | { "derive": { "fn": "contrast-pick", "on": ref, "from": [ref, ref, …] } }
//                 the candidate with the highest WCAG contrast against `on`, decided per scheme; the first wins a tie
// An explicit entry in `tokens` beats a pattern; among patterns the one with fewer wildcards wins.
//
// A RESTING color of a component that declares states may take one of the four color rules too, as an explicit entry
// in `tokens` (a checked row's fill is its content color at 16 %). It is valued here, per scheme, and
// written into the same document without a `dev.tanrei.state`; the state rules that mix it read the rule's value. A
// child layer that sets the token by `$value` replaces the rule, and the authored value is in force again.
import { inContext } from './contexts.js';
import { SystemError } from './errors.js';
import { DERIVE, VOCABULARY, walkTokens } from './rules.js';

export const STATES = 'dev.tanrei.states';
/** The rules that value a color from other colors. A layer may give one to a component's RESTING color too. */
export const COLOR_RULES = new Set(['mix', 'alpha', 'tone', 'contrast-pick']);
/** Does this layer operation value a color by a color rule? Such a color is valued per scheme, with the state tokens. */
export const isColorRule = (op) => Boolean(op && !('$value' in op) && COLOR_RULES.has(op.derive?.fn));
const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const refId = (v) => v.slice(1, -1);
const clone = (v) => JSON.parse(JSON.stringify(v));

/** Expand every component's state declaration into the token ids it implies. */
export function expandStateVocabulary(compDocuments) {
  const out = [];
  const visit = (node, path) => {
    const decl = node.$extensions?.[STATES];
    if (decl) {
      const component = path.join('.');
      const rationale = node.$extensions?.[VOCABULARY]?.rationale;
      for (const state of decl.states) {
        for (const variant of decl.variants ?? []) {
          for (const [part, type] of Object.entries(decl.perVariant ?? {})) out.push({ id: `${component}.${variant}.${state}.${part}`, type, component, variant, state, part, enabled: `${component}.${variant}.${part}`, rationale });
        }
        for (const [part, type] of Object.entries(decl.perComponent ?? {})) out.push({ id: `${component}.${state}.${part}`, type, component, state, part, rationale });
      }
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object' && !('$value' in child)) visit(child, [...path, key]);
  };
  for (const doc of compDocuments) visit(doc, []);
  return out;
}

// A pattern's segments, split once: every state token of every scheme is matched against every rule.
const patternSegments = new Map();
function matchPattern(pattern, id, s = id.split('.')) {
  let p = patternSegments.get(pattern);
  if (!p) patternSegments.set(pattern, (p = pattern.split('.')));
  if (p.length !== s.length) return null;
  const captures = [];
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') captures.push(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return captures;
}

const substitute = (value, captures) =>
  typeof value === 'string'
    ? value.replace(/\$(\d)/g, (_, n) => captures[n - 1] ?? `$${n}`)
    : Array.isArray(value) // a list stays a list: a context map's [standard, medium, high], a contrast-pick's candidates
      ? value.map((v) => substitute(v, captures))
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, captures)]))
        : value;

// A system's pattern rules, indexed once by segment count (a pattern matches only ids of its own length), and the rule
// each state token was given, remembered: every scheme values the same state tokens with the same rules, so matching
// every token against every rule once per scheme would be most of a Theme Studio edit. Keyed on the rules array itself; a list that grew since is indexed again.
const ruleIndexes = new WeakMap();
function ruleIndex(rules) {
  let index = ruleIndexes.get(rules);
  if (!index || index.count !== rules.length) {
    const byLength = new Map();
    for (const rule of rules) {
      const p = rule.match.split('.');
      if (!byLength.has(p.length)) byLength.set(p.length, []);
      byLength.get(p.length).push({ rule, p });
    }
    index = { count: rules.length, byLength, chosen: new Map() };
    ruleIndexes.set(rules, index);
  }
  return index;
}

/** The operation that values one state token in this system. */
export function operationFor(id, system) {
  if (system.tokens[id]) return system.tokens[id];
  if (!system.rules?.length) return null;
  const index = ruleIndex(system.rules);
  let best = index.chosen.get(id);
  if (best === undefined) {
    // Fewer wildcards win; later layers were appended later, so among equally specific patterns the last one wins.
    best = null;
    const s = id.split('.');
    for (const { rule, p } of index.byLength.get(s.length) ?? []) {
      const captures = [];
      let hit = true;
      for (let i = 0; i < p.length && hit; i++) {
        if (p[i] === '*') captures.push(s[i]);
        else hit = p[i] === s[i];
      }
      if (hit && (!best || captures.length <= best.captures.length)) best = { rule, captures };
    }
    index.chosen.set(id, best);
  }
  if (!best) return null;
  const { match, ...operation } = best.rule;
  return substitute(clone(operation), best.captures);
}

/**
 * Every pattern rule of a layer chain (root first) that matches `id`, in the order they were written, and which one
 * values the token — the same precedence `operationFor` applies: an explicit entry under "tokens" beats every
 * pattern; among patterns the one with fewer wildcards wins; the later one (a later layer, or later in the same
 * layer) wins a tie.
 * @returns {{ explicit: { layer: string } | null, rules: { layer: string, index: number, match: string, wildcards: number, wins: boolean, because: string }[] }}
 */
export function matchingRules(id, layers) {
  const hits = [];
  for (const layer of layers) {
    (layer.rules ?? []).forEach((rule, index) => {
      const captures = matchPattern(rule.match, id);
      if (captures) hits.push({ layer: layer.id, index, match: rule.match, wildcards: captures.length });
    });
  }
  const explicit = [...layers].reverse().find((layer) => layer.tokens?.[id]);
  const fewest = Math.min(...hits.map((h) => h.wildcards));
  const winner = explicit ? null : hits.filter((h) => h.wildcards === fewest).at(-1);
  const rules = hits.map((hit) => {
    if (explicit) return { ...hit, wins: false, because: `an explicit entry under "tokens" (layer "${explicit.id}") beats every pattern` };
    if (hit === winner) {
      const tied = hits.filter((h) => h !== hit && h.wildcards === fewest);
      const why = hits.length === 1 ? 'the only pattern that matches' : !tied.length ? `fewest wildcards (${hit.wildcards})` : `${hits.some((h) => h.wildcards > fewest) ? `fewest wildcards (${hit.wildcards}), and ` : ''}written after ${tied.map((h) => `"${h.layer}" rules[${h.index}]`).join(', ')}, which ${tied.length === 1 ? 'is' : 'are'} equally specific — the later one wins a tie`;
      return { ...hit, wins: true, because: why };
    }
    return { ...hit, wins: false, because: hit.wildcards > fewest ? `more wildcards (${hit.wildcards}) than "${winner.layer}" rules[${winner.index}] (${winner.wildcards})` : `equally specific, but "${winner.layer}" rules[${winner.index}] was written later` };
  });
  return { explicit: explicit ? { layer: explicit.id } : null, rules };
}

// ── color math: premultiplied interpolation, identical to CSS color-mix(in srgb, base, with amount) ──
export function mixColors(base, over, amount) {
  const t = Math.min(1, Math.max(0, amount));
  const a = base.a * (1 - t) + over.a * t;
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const ch = (k) => (base[k] * base.a * (1 - t) + over[k] * over.a * t) / a;
  return { r: ch('r'), g: ch('g'), b: ch('b'), a };
}

export function toDtcgColor({ r, g, b, a }) {
  const byte = (c) => Math.round(Math.min(1, Math.max(0, c)) * 255);
  const [R, G, B] = [byte(r), byte(g), byte(b)];
  const round = (n) => Math.round((n / 255) * 10000) / 10000;
  const value = { colorSpace: 'srgb', components: [round(R), round(G), round(B)] };
  const alpha = Math.round(a * 10000) / 10000;
  if (alpha !== 1) value.alpha = alpha;
  value.hex = `#${[R, G, B].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return value;
}

// ── WCAG 2.x contrast, on the engine's own color shape ({ r, g, b, a } in 0–1) ──
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ({ r, g, b }) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
/** Contrast ratio of `fg` on `bg`. A translucent foreground is composited over the background first; the background counts as opaque. */
export function contrastRatio(fg, bg) {
  const a = fg.a ?? 1;
  const over = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
  const [hi, lo] = [luminance(over), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The `contrast-pick` rule: of `candidates` ([{ ref, color }]), the one most readable on `on`. The first wins a tie,
 * so the order of `from` is the author's preference.
 */
export function pickByContrast(on, candidates) {
  let best = null;
  for (const candidate of candidates) {
    const ratio = contrastRatio(candidate.color, on);
    if (!best || ratio > best.ratio) best = { ...candidate, ratio };
  }
  return best;
}

/** Shape problems of a `contrast-pick` rule, in the words of the person who wrote it. */
export function checkContrastPick(rule, id) {
  if (!isRef(rule.on)) throw new SystemError(`${id}: "contrast-pick" needs "on": the color token the result must be readable on, as "{…}"`);
  if (!Array.isArray(rule.from) || rule.from.length < 2 || !rule.from.every(isRef)) throw new SystemError(`${id}: "contrast-pick" needs "from": two or more color tokens to choose among, each as "{…}"`);
}

// What the schemes of one system have in common: which tokens are valued here, what is authored, the operation that
// values each, and what each token says whatever the scheme. A system is generated for six schemes; five of them
// share all of this, so it is worked out once. It lives in the object the caller passes as
// `across` — for as long as the caller generates the schemes of that one system, and no longer.
function statePlan(system, documents, NS, across) {
  if (across?.plan) return across.plan;
  const comp = Object.entries(documents).filter(([name]) => name.startsWith('comp/')).map(([, doc]) => doc);
  const vocabulary = expandStateVocabulary(comp);

  const authored = new Map();
  const authoredColors = new Set();
  for (const doc of Object.values(documents)) for (const entry of walkTokens(doc)) (authored.set(entry.id, entry.token), entry.type === 'color' && authoredColors.add(entry.id));
  // A resting component color a layer values by a color rule (a fill that is a layer of its content
  // color) is valued here, per scheme, like a state token. resolveNumericTokens left the authored value alone; the
  // resolver reads this document after the component's own, so this value is the one in force.
  const rationales = new Map(vocabulary.map((v) => [v.component, v.rationale]));
  // A component that declares its looks and no interaction state (a code block: `states: []`) expands to no state
  // token, and may still value a resting color by a color rule (a syntax color is a tone of a palette).
  const declaring = (node, path) => {
    if (node.$extensions?.[STATES] && !rationales.has(path.join('.'))) rationales.set(path.join('.'), node.$extensions[VOCABULARY]?.rationale);
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$') && child && typeof child === 'object' && !('$value' in child)) declaring(child, [...path, key]);
  };
  for (const doc of comp) declaring(doc, []);
  const resting = Object.entries(system.tokens)
    .filter(([id, op]) => id.startsWith(`${NS}.comp.`) && authoredColors.has(id) && isColorRule(op))
    .map(([id]) => ({ id, type: 'color', state: null, rationale: rationales.get(id.split('.').slice(0, 3).join('.')) }));
  for (const entry of resting) if (!entry.rationale) throw new SystemError(`${entry.id}: a resting color takes a color rule only in a component that declares states`);
  vocabulary.push(...resting);
  const said = new Map();
  const plan = {
    vocabulary,
    declared: new Map(vocabulary.map((v) => [v.id, v])),
    authored,
    operations: new Map(),
    written: new Map(),
    /** One `dev.tanrei.vocabulary` entry per rationale: a component's tokens say the same thing. */
    rationale: (text) => said.get(text) ?? said.set(text, Object.freeze({ rationale: text })).get(text),
  };
  if (across) across.plan = plan;
  return plan;
}

const fromDtcgColor = (v) => ({ r: v.components[0], g: v.components[1], b: v.components[2], a: v.alpha ?? 1 });

/**
 * Value every state token of a system for one scheme.
 * @param {object} args
 * @param {object} args.system            merged layers (tokens + rules)
 * @param {Record<string, object>} args.documents  this system's numeric/alias documents (already resolved)
 * @param {(role: string) => {r,g,b,a}} args.roleColor  concrete color of a sys.color role in this scheme
 * @param {(palette: string, tone: number|number[]|object) => {r,g,b,a}} [args.toneColor]  a tone of a declared palette
 *   in this scheme (`tone` may be a context map); needed by the `tone` rule and by references to ref.palette tokens
 * @param {string} [args.scheme]  the scheme being generated (`light`, `dark-high`, …): what a context map in a
 *   `mix` or `alpha` amount is read for. Without it such an amount is refused, never NaN.
 * @param {object} [args.across]  an empty object the caller keeps while it generates the schemes of ONE system from
 *   the same `system` and `documents`: what the schemes have in common is worked out once and kept in it, and the
 *   documents then share what they say alike (an alias token, a token's `$extensions`) — frozen, because shared.
 * @returns {object|null} a DTCG document, or null when no component declares states
 */
export function generateStateDocument({ system, documents, roleColor, toneColor, note, scheme, across }) {
  const NS = system.namespace ?? 'tanrei';
  const NS_PATTERN = NS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const SYS_COLOR = `${NS}.sys.color.`;
  const REF_PALETTE = `${NS}.ref.palette.`;
  const plan = statePlan(system, documents, NS, across);
  const { vocabulary, declared, authored } = plan;
  if (!vocabulary.length) return null;
  const resolved = new Map();
  const picked = new Map(); // id → the reference a contrast-pick chose in this scheme

  const operation = (id) => {
    if (!plan.operations.has(id)) plan.operations.set(id, operationFor(id, system));
    return plan.operations.get(id);
  };
  // The amount of a `mix` or `alpha` rule: a reference, a number, or a context map ([standard, medium, high] or
  // { light, dark }) read for this scheme — the same forms a color role's `alpha` amount takes (palette.js).
  const amount = (id, rule, trail) => {
    const v = rule.amount;
    if (isRef(v)) return resolve(refId(v), trail);
    const isMap = Array.isArray(v) || (v !== null && typeof v === 'object');
    if (isMap && !scheme) throw new SystemError(`${id}: the "${rule.fn}" rule's amount ${JSON.stringify(v)} is a context map, and generateStateDocument was called without a scheme to read it for`);
    let n;
    try {
      n = isMap ? inContext(v, scheme) : v;
    } catch (error) {
      throw new SystemError(`${id}: the "${rule.fn}" rule's amount cannot be read for scheme "${scheme}": ${error.message}`);
    }
    if (typeof n !== 'number' || !Number.isFinite(n)) throw new SystemError(`${id}: the "${rule.fn}" rule's amount must be a number from 0 to 1, a "{…}" reference to one, or a context map of numbers ([standard, medium, high] or { "light": […], "dark": […] }) — not ${JSON.stringify(v)}`);
    return n;
  };

  function resolve(id, trail = []) {
    if (trail.includes(id)) throw new Error(`cycle: ${[...trail, id].join(' → ')}`);
    if (resolved.has(id)) return resolved.get(id);
    let result;
    if (id.startsWith(SYS_COLOR)) result = roleColor(id.slice(SYS_COLOR.length));
    else if (id.startsWith(REF_PALETTE) && toneColor) {
      const [palette, tone] = id.slice(REF_PALETTE.length).split('.');
      result = toneColor(palette, Number(tone));
    } else if (declared.has(id)) {
      const op = operation(id);
      if (!op) throw new Error(`${id}: system "${system.id}" gives this state no value. Add a rule such as { "match": "${id.replace(new RegExp(`^(${NS_PATTERN}\\.comp)\\.[^.]+\\.[^.]+`), '$1.*.*')}", … }.`);
      const next = [...trail, id];
      if (op.derive?.fn === 'mix') result = mixColors(resolve(refId(op.derive.base), next), resolve(refId(op.derive.with), next), amount(id, op.derive, next));
      else if (op.derive?.fn === 'alpha') {
        const of = resolve(refId(op.derive.of), next);
        result = { ...of, a: of.a * amount(id, op.derive, next) };
      } else if (op.derive?.fn === 'tone') {
        if (declared.get(id).type !== 'color') throw new SystemError(`${id}: "tone" values a color, and this token is a ${declared.get(id).type}`);
        if (typeof op.derive.palette !== 'string' || op.derive.tone === undefined) throw new SystemError(`${id}: "tone" needs "palette" (a declared palette) and "tone" (0–100; [standard, medium, high]; or { "light": […], "dark": […] })`);
        if (!toneColor) throw new Error(`${id}: the "tone" rule needs the palette engine (generateStateDocument was called without toneColor)`);
        result = toneColor(op.derive.palette, op.derive.tone, id);
      } else if (op.derive?.fn === 'contrast-pick') {
        checkContrastPick(op.derive, id);
        const on = resolve(refId(op.derive.on), next);
        const winner = pickByContrast(on, op.derive.from.map((ref) => ({ ref, color: resolve(refId(ref), next) })));
        picked.set(id, winner.ref);
        result = winner.color;
      } else if (op.derive) throw new SystemError(`${id}: state tokens support the "mix", "alpha", "tone" and "contrast-pick" rules, not "${op.derive.fn}"`);
      else if (isRef(op.$value)) result = resolve(refId(op.$value), next);
      else result = op.$value;
    } else {
      const token = authored.get(id);
      if (!token) throw new Error(`${trail.at(-1) ?? '?'}: references unknown token {${id}}`);
      const v = token.$value;
      result = isRef(v) ? resolve(refId(v), [...trail, id]) : v;
    }
    if (result && typeof result === 'object' && 'colorSpace' in result) result = fromDtcgColor(result);
    resolved.set(id, result);
    return result;
  }

  const root = { $description: note };
  for (const entry of vocabulary) {
    const op = operation(entry.id);
    const value = resolve(entry.id);
    let node = root;
    const parts = (entry.parts ??= entry.id.split('.'));
    for (let i = 0; i < parts.length - 1; i += 1) node = node[parts[i]] ??= {};
    // What a token says in every scheme is said once (`plan.written`): an alias is the same token in all of them,
    // and a color a rule computes differs by its value alone. Shared, so frozen: a scheme's document is read, never edited.
    let written = plan.written.get(entry.id);
    if (!written) {
      const aliasOnly = op && !op.derive && isRef(op.$value);
      const $extensions = { [VOCABULARY]: plan.rationale(entry.rationale), ...(entry.state ? { 'dev.tanrei.state': entry.state } : {}) };
      if (op?.derive) $extensions[DERIVE] = op.derive;
      else if (!aliasOnly) $extensions[DERIVE] = { fixed: op.reason ?? 'Set by the system layer.' };
      Object.freeze($extensions);
      // Aliases stay aliases (re-pointable, and non-color types cannot be computed here).
      written = aliasOnly ? { token: Object.freeze({ $type: entry.type, $value: op.$value, $extensions }) } : { $extensions };
      plan.written.set(entry.id, written);
    }
    // Colors a rule computed are written as concrete values for this scheme. A contrast-pick CHOOSES a token: it is
    // written as the alias it chose in this scheme, with the rule next to it.
    node[parts.at(-1)] = written.token ?? { $type: entry.type, $value: picked.has(entry.id) ? picked.get(entry.id) : entry.type === 'color' ? toDtcgColor(value) : value, $extensions: written.$extensions };
  }
  return root;
}
