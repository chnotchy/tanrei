// The numeric half of the rule language. Closed and declarative:
//   mul    { of: "{id}", by: n, exp?: "{id}" | n,    → max(min, round(of × by^exp × times, to the step `round`))
//            times?: "{id}", round?: "{id}",            (exp defaults to 1, so by^1 = by exactly; times is a number
//            min?: "{id}" }                              token, absent = 1; round is the step, absent = 0.25px / 1ms;
//                                                        min is a floor applied after rounding, absent = none)
//   scale  { base: "{id}", ratio: n, step: n }       → base × ratio^step
//   clamp  { of: "{id}", min: n, max: n }
//   pad    { of: "{id}", height: "{id}", by?: n }    → max(0, of × by + (height − height₁) / 2), on 0.25px: the block
//                                                       padding of a box whose height follows a density — it gives up
//                                                       half of what the height lost and takes half of what it gained,
//                                                       so the box stays 2 × padding + one line. height₁ is the height
//                                                       with every `times` read as 1 and no `min` (`unscaledLookup`);
//                                                       by (absent = 1) is what a layer's `scale` multiplies
//   sub    { of: "{id}", by: "{id}" }                → max(0, of − by), in of's unit: an inner corner inside an outer
//                                                       one at an inset (the concentric radius); never below zero
//   em     { by: n }                                  → this token's fontSize × by   (typography.letterSpacing only)
//   pick   { by: "{id}", values: { <name>: v, … } }   → the value named by the choice of kind `by` names now; `v` is
//                                                       a literal of this token's type or "{id}" (one entry per name)
//   fixed  { fixed: "reason" }                        → keep the literal; dials do not move it
// The color half — tone, alpha, mix, contrast-pick — lives in palette.js (color roles) and states.js (per-state
// component tokens); together they are the ten functions, and the language has no others. `pick` is the one table
// in it: a token whose value is set by a choice of kind (`sys.behavior.appearance` sets how far a surface that appears
// is scaled), so that a layer that makes the choice gets the values that go with it, and a layer that pins one of
// those values keeps its pin.
// Rounding happens here, once. Emitters format; they never round.
export const DERIVE = 'dev.tanrei.derive';
export const VOCABULARY = 'dev.tanrei.vocabulary';
/** Usage guidance for AI agents and tools: `{ usage: string, rules?: string[] }`, inherited from the nearest group. */
export const LLM = 'dev.tanrei.llm';
/** A choice of kind: `{ values: string[] }` on a `number` token whose value is an index into it. */
export const ENUM = 'dev.tanrei.enum';
/** The name a choice-of-kind token currently has, or undefined when the token is not one. */
export const enumName = (token) => token?.$extensions?.[ENUM]?.values?.[token.$value];

const ROUND = { dimension: 0.25, duration: 1, number: 0.0001, tracking: 0.0001 };
export function roundTo(value, step) {
  const inverse = 1 / step; // 4, 1, 10000 — exact in binary, unlike 0.0001
  return Math.round(value * inverse) / inverse;
}

const isRef = (v) => typeof v === 'string' && /^\{[^}]+\}$/.test(v);
const refId = (v) => v.slice(1, -1);

/**
 * Round to the nearest multiple of `step`, ties upward — CSS `round(nearest, value, step)`. The quotient is cleaned of
 * binary noise first, so 4 × 10 × 0.95 (38, a tie on a 4px grid) gives 40 and not 36.
 */
export function roundToStep(value, step) {
  const n = Math.round(Number((value / step).toFixed(9)));
  return Number((n * step).toFixed(9));
}

/** Ids a rule depends on, for ordering and cycle detection. */
export function ruleDependencies(rule) {
  if (!rule || typeof rule !== 'object' || 'fixed' in rule) return [];
  if (!('fn' in rule)) return Object.values(rule).flatMap(ruleDependencies); // composite: keyed by sub-field
  // numeric: of, base, exp · mul { times, round, min } · pad { of, height } (its by is a number) · sub { of, by } · pick { by, values{} } · color: mix { base, with, amount }, alpha { of, amount }, contrast-pick { on, from[] }
  const picked = rule.fn === 'pick' && rule.values && typeof rule.values === 'object' ? Object.values(rule.values) : [];
  return [rule.of, rule.base, rule.exp, rule.by, rule.times, rule.round, rule.min, rule.height, rule.with, rule.amount, rule.on, ...(Array.isArray(rule.from) ? rule.from : []), ...picked].filter(isRef).map(refId);
}

const sameUnit = (fn, field, rule, term, of) => {
  if ((term.unit ?? null) !== (of.unit ?? null)) throw new Error(`"${fn}" ${field} ${rule[field]} (${term.unit ?? 'no unit'}) is not in the unit of ${rule.of} (${of.unit ?? 'no unit'})`);
};

/** The optional terms of `mul`: the factor `times`, the step `round` and the floor `min` (undefined when absent). */
function mulTerms(rule, of, lookup, ctx) {
  for (const field of ['times', 'round', 'min']) if (rule[field] !== undefined && !isRef(rule[field])) throw new Error(`"mul" ${field} must be a token, as "{id}"`);
  let times = 1;
  if (rule.times !== undefined && !ctx.unscaling) {
    const factor = lookup(refId(rule.times));
    if (factor.unit !== undefined) throw new Error(`"mul" times ${rule.times} must be a number token; it is in ${factor.unit}`);
    times = factor.value;
  }
  let step;
  if (rule.round !== undefined) {
    const grid = lookup(refId(rule.round));
    sameUnit('mul', 'round', rule, grid, of);
    if (!(grid.value > 0)) throw new Error(`"mul" round ${rule.round} must be above zero; it is ${grid.value}`);
    step = grid.value;
  }
  let min;
  if (rule.min !== undefined && !ctx.unscaling) {
    const floor = lookup(refId(rule.min));
    sameUnit('mul', 'min', rule, floor, of);
    min = floor.value;
  }
  return [times, step, min];
}

/**
 * Evaluate one numeric rule.
 * @param {object} rule
 * @param {(id: string) => {value: number, unit?: string, names?: string[]}} lookup resolved value of another token;
 *   for a choice of kind, `value` is its index and `names` its list (`dev.tanrei.enum.values`)
 * @param {{ type: string, fontSize?: number, unscaled?: (id: string) => {value: number, unit?: string}, unscaling?: boolean }} ctx
 *   `unscaled`: a token's value with every `times` read as 1 and no `min` (`unscaledLookup`), which `pad` measures a
 *   height's change from; `unscaling`: this evaluation is one of those (set by `unscaledLookup`)
 */
export function evaluateNumeric(rule, lookup, ctx) {
  const num = (v) => (isRef(v) ? lookup(refId(v)).value : v);
  switch (rule.fn) {
    case 'mul': {
      const of = lookup(refId(rule.of));
      const exp = rule.exp === undefined ? 1 : num(rule.exp);
      const coefficient = exp === 1 ? rule.by : rule.by ** exp;
      const [times, step, min] = mulTerms(rule, of, lookup, ctx);
      const product = of.value * coefficient * times;
      const rounded = step === undefined ? roundTo(product, ROUND[ctx.type] ?? ROUND.number) : roundToStep(product, step);
      return { value: min === undefined ? rounded : Math.max(min, rounded), unit: of.unit };
    }
    case 'pad': {
      if (!isRef(rule.of) || !isRef(rule.height)) throw new Error('"pad" needs "of" and "height", each a token as "{id}"');
      const of = lookup(refId(rule.of));
      if (rule.by !== undefined && !(typeof rule.by === 'number' && rule.by >= 0)) throw new Error(`"pad" by must be a number of zero or more; it is ${JSON.stringify(rule.by)}`);
      const base = rule.by === undefined ? of.value : roundTo(of.value * rule.by, ROUND[ctx.type] ?? ROUND.number);
      // Where no height has moved, nothing has been given up or taken.
      if (ctx.unscaling) return { value: base, unit: of.unit };
      if (typeof ctx.unscaled !== 'function') throw new Error('"pad" needs the height its rule gives with "times" at 1 and no "min" (ctx.unscaled; see unscaledLookup)');
      const [height, height1] = [lookup(refId(rule.height)), ctx.unscaled(refId(rule.height))];
      sameUnit('pad', 'height', rule, height, of);
      return { value: Math.max(0, roundTo(base + (height.value - height1.value) / 2, ROUND[ctx.type] ?? ROUND.number)), unit: of.unit };
    }
    case 'scale': {
      const base = lookup(refId(rule.base));
      return { value: roundTo(base.value * rule.ratio ** rule.step, ROUND[ctx.type] ?? ROUND.number), unit: base.unit };
    }
    case 'clamp': {
      const of = lookup(refId(rule.of));
      return { value: Math.min(rule.max, Math.max(rule.min, of.value)), unit: of.unit };
    }
    case 'sub': {
      if (!isRef(rule.of) || !isRef(rule.by)) throw new Error('"sub" needs "of" and "by", each a token as "{id}"');
      const [of, by] = [lookup(refId(rule.of)), lookup(refId(rule.by))];
      if ((of.unit ?? null) !== (by.unit ?? null)) throw new Error(`"sub" takes ${rule.by} (${by.unit ?? 'no unit'}) from ${rule.of} (${of.unit ?? 'no unit'}): both need one unit`);
      return { value: roundTo(Math.max(0, of.value - by.value), ROUND[ctx.type] ?? ROUND.number), unit: of.unit };
    }
    case 'em':
      if (ctx.fontSize === undefined) throw new Error('"em" is only valid for typography.letterSpacing');
      return { value: roundTo(ctx.fontSize * rule.by, ROUND.tracking), unit: 'px' };
    case 'pick': {
      if (!isRef(rule.by)) throw new Error('"pick" needs "by": the choice of kind it follows, as "{id}"');
      const choice = lookup(refId(rule.by));
      const names = choice.names;
      if (!Array.isArray(names)) throw new Error(`"pick" follows ${rule.by}, which is not a choice of kind (it has no ${ENUM}.values)`);
      const values = rule.values ?? {};
      const missing = names.filter((name) => !(name in values));
      const unknown = Object.keys(values).filter((name) => !names.includes(name));
      if (missing.length || unknown.length) throw new Error(`"pick" must give one value for each name of ${rule.by} (${names.join(', ')})${missing.length ? `; it gives none for ${missing.join(', ')}` : ''}${unknown.length ? `; ${unknown.join(', ')} is not one of them` : ''}`);
      const chosen = values[names[choice.value]];
      if (isRef(chosen)) return lookup(refId(chosen));
      return typeof chosen === 'number' ? { value: chosen } : { ...chosen };
    }
    default:
      throw new Error(`unknown rule function "${rule.fn}"`);
  }
}

/**
 * The values tokens take with every `times` read as 1 and no `min`: the height a `pad` measures its box's change from.
 * Each token is described by the caller, so the engine, the build and Theme Studio walk their own structures alike.
 * @param {(id: string) => { alias?: string, rule?: object, type?: string, value?: {value: number, unit?: string} }} describe
 *   a token as an alias (`alias`: the id it points at), a numeric rule to evaluate (`rule`, `type`), or its value
 * @returns {(id: string) => {value: number, unit?: string}} memoized
 */
export function unscaledLookup(describe) {
  const memo = new Map();
  const unscaled = (id) => {
    if (memo.has(id)) {
      if (memo.get(id) === null) throw new Error(`cycle through {${id}}`);
      return memo.get(id);
    }
    memo.set(id, null);
    try {
      const { alias, rule, type, value } = describe(id);
      const result = alias ? unscaled(alias) : rule && typeof rule.fn === 'string' ? evaluateNumeric(rule, unscaled, { type, unscaling: true, unscaled }) : value;
      memo.set(id, result);
      return result;
    } catch (error) {
      memo.delete(id);
      throw error;
    }
  };
  return unscaled;
}

/** Walk a DTCG document, yielding leaf tokens with inherited `$type` and vocabulary rationale. */
export function* walkTokens(node, path = [], inherited = {}) {
  const here = {
    type: node.$type ?? inherited.type,
    rationale: node.$extensions?.[VOCABULARY]?.rationale ?? inherited.rationale,
  };
  if ('$value' in node) {
    yield { id: path.join('.'), token: node, type: here.type, rationale: here.rationale };
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || child === null || typeof child !== 'object') continue;
    yield* walkTokens(child, [...path, key], here);
  }
}

/**
 * Every authored group an agent can land in (dial, sys.<group>, comp.<component>) says how it is meant to be
 * used: `$extensions["dev.tanrei.llm"].usage` on the group or on its tier. A repository policy, kept apart from
 * `checkSources` so the engine can still check any well-formed document.
 * @param {object[]} documents parsed DTCG source documents
 * @returns {string[]} problems
 */
export function checkGuidance(documents) {
  const problems = [];
  for (const doc of documents) {
    for (const [ns, tiers] of Object.entries(doc)) {
      if (ns.startsWith('$')) continue;
      for (const [tier, groups] of Object.entries(tiers)) {
        if (tier.startsWith('$')) continue;
        const guided = (node) => typeof node?.$extensions?.[LLM]?.usage === 'string' && node.$extensions[LLM].usage.length >= 40;
        if (guided(groups)) continue;
        for (const [group, node] of Object.entries(groups)) if (!group.startsWith('$') && !guided(node)) problems.push(`${ns}.${tier}.${group}: no usage guidance — add $extensions["${LLM}"].usage to the group (what it is for, how a product changes it)`);
      }
    }
  }
  return problems;
}

/**
 * Check that every source token is accounted for:
 *  - it has a vocabulary rationale (its own or its group's);
 *  - it is an alias, or carries a rule, or is fixed with a reason;
 *  - a rule evaluated at the dial defaults equals the literal `$value` next to it.
 * @param {object[]} documents parsed DTCG source documents
 * @returns {string[]} problems
 */
export function checkSources(documents) {
  const tokens = new Map();
  for (const doc of documents) for (const entry of walkTokens(doc)) tokens.set(entry.id, entry);
  const lookup = (id) => {
    const target = tokens.get(id);
    if (!target) throw new Error(`references unknown token {${id}}`);
    const v = target.token.$value;
    if (isRef(v)) return lookup(refId(v));
    return typeof v === 'number' ? { value: v, names: target.token.$extensions?.[ENUM]?.values } : v;
  };
  const unscaled = unscaledLookup((id) => {
    const target = tokens.get(id);
    if (!target) throw new Error(`references unknown token {${id}}`);
    const { token, type } = target;
    if (isRef(token.$value)) return { alias: refId(token.$value) };
    const rule = token.$extensions?.[DERIVE];
    return rule && !('fixed' in rule) && type !== 'typography' && id.split('.')[1] !== 'dial' ? { rule, type } : { value: lookup(id) };
  });
  const problems = [];
  for (const { id, token, type, rationale } of tokens.values()) {
    if (!rationale) problems.push(`${id}: no vocabulary rationale — state why one product needs this distinction`);
    const rule = token.$extensions?.[DERIVE];
    const value = token.$value;
    if (isRef(value)) continue; // alias: re-pointable, nothing to evaluate
    if (id.split('.')[1] === 'dial') continue; // dials are the inputs; their literal is the default
    if (!rule) {
      problems.push(`${id}: a literal needs a rule or { "fixed": "<reason>" } in $extensions["${DERIVE}"]`);
      continue;
    }
    if ('fixed' in rule) {
      if (typeof rule.fixed !== 'string' || rule.fixed.length < 8) problems.push(`${id}: "fixed" needs a real reason`);
      continue;
    }
    try {
      if (type === 'typography') {
        const size = evaluateNumeric(rule.fontSize, lookup, { type: 'dimension' });
        const tracking = evaluateNumeric(rule.letterSpacing, lookup, { type: 'dimension', fontSize: size.value });
        if (size.value !== value.fontSize.value) problems.push(`${id}: fontSize rule gives ${size.value}, $value says ${value.fontSize.value}`);
        if (tracking.value !== value.letterSpacing.value) problems.push(`${id}: letterSpacing rule gives ${tracking.value}, $value says ${value.letterSpacing.value}`);
      } else {
        const result = evaluateNumeric(rule, lookup, { type, unscaled });
        const literal = typeof value === 'number' ? value : value.value;
        if (result.value !== literal) problems.push(`${id}: rule gives ${result.value}, $value says ${literal}`);
      }
    } catch (error) {
      problems.push(`${id}: ${error.message}`);
    }
  }
  return problems;
}
