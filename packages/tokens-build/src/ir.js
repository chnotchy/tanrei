// Resolved, unit-free view of the model for native-language emitters
// (TypeScript/React Native, Swift, Kotlin, Dart). Lengths are density-independent
// units (px = dp = pt = logical px), durations are milliseconds.
import { CONFIG, REPO_ROOT, rgba } from './model.js';
import { typeFamily } from './pure.js';
import { colorVocabulary } from './scheme.js';

const NS = CONFIG.namespace;
const SYS_COLOR = `${NS}.sys.color.`;
const SYS_TYPE = `${NS}.sys.typescale.`;
const SYS_ELEVATION = `${NS}.sys.elevation.`;
/**
 * The `sys` groups whose steps are plain lengths and are carried together as `ir.measure.<group>`: strokes, the focus
 * indicator, minimum targets, icon sizes, and the window widths at which a layout changes (`sys.breakpoint`).
 * Closed: a group that is not here reaches no platform's system.
 */
export const MEASURE_GROUPS = ['border', 'focus', 'target', 'icon', 'breakpoint'];

// A role's key is its own name (no emphasized twins — emphasis is a weight step in `ir.typeEmphasis`).
const typeName = (path) => path[0];

// One interpretation of a CSS-style font stack for every platform (instead of one per emitter):
//   families — the NAMED families, in order, that a product may install or register;
//   generic  — what to fall back to when none of them is available, AS WRITTEN: any CSS generic keyword
//              (sans-serif, serif, monospace, cursive, fantasy, math, emoji). The web uses it as it is;
//   genericClass — the same decision for a platform that only has the three classes of platform font:
//              'sans-serif' | 'serif' | 'monospace'. `cursive`, `fantasy`, `math` and `emoji` have no native face that
//              is the same everywhere, so they read as 'sans-serif' (the platform's default text face) — decided here
//              once, not in each emitter. An emitter whose platform does have a face for one of them (Android:
//              cursive) may still read `generic`; every other native emitter reads `genericClass` and never sees a
//              value it has no font for;
//   system   — the stack asks for the platform's own UI (or monospace) font before or instead of a named one;
//   fallback — the stack itself names a system or generic fallback. When it does not, text set in it disappears
//              into the platform's default wherever the named families are missing (`tanrei validate` warns).
const SYSTEM_KEYWORDS = new Set(['system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded']);
const GENERIC_KEYWORDS = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji']);
/** The classes of platform font every native platform has; `fontStack().genericClass` is always one of them. */
export const NATIVE_GENERIC_CLASSES = ['sans-serif', 'serif', 'monospace'];
export function fontStack(stack) {
  const list = Array.isArray(stack) ? stack : [stack];
  const lower = list.map((name) => name.toLowerCase());
  const named = list.filter((_, i) => !SYSTEM_KEYWORDS.has(lower[i]) && !GENERIC_KEYWORDS.has(lower[i]));
  const firstSystem = lower.findIndex((name) => SYSTEM_KEYWORDS.has(name));
  const firstNamed = lower.findIndex((name) => !SYSTEM_KEYWORDS.has(name) && !GENERIC_KEYWORDS.has(name));
  const generic = lower.find((name) => GENERIC_KEYWORDS.has(name)) ?? (lower.some((name) => name === 'ui-monospace') ? 'monospace' : lower.includes('ui-serif') ? 'serif' : 'sans-serif');
  const genericClass = NATIVE_GENERIC_CLASSES.includes(generic) ? generic : NATIVE_GENERIC_CLASSES[0];
  return { stack: list, families: named, generic, genericClass, system: firstSystem !== -1 && (firstNamed === -1 || firstSystem < firstNamed), fallback: lower.some((name) => SYSTEM_KEYWORDS.has(name) || GENERIC_KEYWORDS.has(name)) };
}

export { TYPE_FAMILIES, typeFamily } from './pure.js';

function typography(v, role) {
  return {
    ...(role ? { family: typeFamily(role) } : {}),
    families: v.fontFamily,
    // Prefer this over `families`: the same stack, interpreted once. `families` stays until every emitter reads it.
    font: fontStack(v.fontFamily),
    size: v.fontSize.value,
    weight: v.fontWeight,
    tracking: v.letterSpacing.value,
    lineHeight: Math.round(v.fontSize.value * v.lineHeight * 100) / 100,
  };
}

export function buildIR(model) {
  const ir = {
    schemes: model.schemes,
    roles: Object.keys(model.colors.light),
    colors: {},
    typescale: {},
    // Weight a platform adds for `emphasized` text, per family: { display, heading, body, label }.
    typeEmphasis: {},
    shape: {},
    // How a corner's curve eases, 0–1 with Figma's meaning (0 circular, 0.6 iOS).
    cornerSmoothing: 0,
    space: {},
    state: {},
    measure: {},
    duration: {},
    easing: {},
    spring: {},
    elevation: {},
    system: model.system,
    dials: {},
    intents: [],
    axes: {},
    // How icons are drawn: { family: [...], weight, 'fill-unselected', 'fill-selected' }. Sizes stay in `measure.icon`.
    // `family` is iconFamilies.unselected.stack (for an emitter that reads one icon family).
    icon: {},
    // The icon font by selection state: { unselected: fontStack, selected: fontStack }.
    iconFamilies: {},
    // Named typefaces of the system, interpreted: { brand, plain, mono, icon } → fontStack().
    typefaces: {},
    // Choices of kind: { 'pressed-feedback': { id, value: 'ripple', index: 1, values: [...] }, … }.
    behavior: {},
    // What this system ADDED to the vocabulary. Empty for a system without extensions, and then no
    // emitter may mention extensions at all: complexity is paid only by those who extend.
    //   series[<name>] = [{ key, id, declaredBy, value }] — `key` is the step's key in the IR map of that series
    //     (`ir.space`, `ir.shape`, `ir.typescale`, `ir.duration`, `ir.easing`, `ir.elevation`, `ir.state`,
    //     `ir.measure.<group>`), `id` the token, and `value` exactly what that map holds for the key IN THIS SYSTEM:
    //     the fallback a generated accessor returns under a system that lacks the step (it never throws).
    //   series.spring = [{ key: '<name>', scheme: 'standard' | 'expressive', id: '<the set's group id>', declaredBy,
    //     value: { damping, stiffness, easing, duration } }] — one entry per added spring SET and scheme; the set
    //     is also in `ir.spring[scheme][key]` like every core set.
    extensions: { series: {}, roles: [], own: {} },
    coreRoles: [],
    declaredRoles: [],
    componentTokens: {},
  };

  const added = []; // sys tokens a layer declared; they become `ir.extensions.series` once every map is filled
  for (const scheme of model.schemes) {
    ir.colors[scheme] = {};
    for (const [role, token] of Object.entries(model.colors[scheme])) ir.colors[scheme][role] = rgba(token.value);
  }

  for (const token of Object.values(model.tokens)) {
    if (token.namespace !== NS) {
      // A layer's own tokens are not part of TanreiSystem's typed shape: platforms generate them as a separate
      // typed object in the product's module, from entries shaped like component tokens.
      (ir.extensions.own[token.namespace] ??= []).push({ ...componentToken(model, token, token.path), id: token.id, path: token.path, declaredBy: token.vocabulary?.declaredBy });
      continue;
    }
    const [tier, group, ...rest] = token.path;
    if (tier === 'sys' && token.vocabulary?.extension && group !== 'color') added.push({ token, group, rest });
    if (tier === 'sys') {
      if (group === 'typescale' && rest[0] === 'emphasis') ir.typeEmphasis[rest[1]] = token.value;
      else if (group === 'typescale') ir.typescale[typeName(rest)] = typography(token.value, typeName(rest));
      else if (group === 'shape' && rest[0] === 'corner-smoothing') ir.cornerSmoothing = token.value;
      else if (group === 'shape') ir.shape[rest.slice(1).join('-')] = token.value.value;
      else if (group === 'space') ir.space[rest[0]] = token.value.value;
      else if (group === 'state') ir.state[rest[0]] = token.value;
      else if (group === 'icon' && token.type === 'number') ir.icon[rest.join('-')] = token.value;
      else if (group === 'icon' && token.type === 'fontFamily') ir.iconFamilies[rest[1]] = fontStack(token.value);
      else if (group === 'behavior') {
        const values = token.enum?.values;
        if (!values || !Number.isInteger(token.value) || !values[token.value]) throw new Error(`${token.id}: ${JSON.stringify(token.value)} is not an index into dev.tanrei.enum.values (${values?.join(', ')})`);
        ir.behavior[rest[0]] = { id: token.id, value: values[token.value], index: token.value, values };
      }
      else if (MEASURE_GROUPS.includes(group)) {
        (ir.measure[group] ??= {})[rest[0]] = token.value.value;
      } else if (group === 'motion' && rest[0] === 'duration') ir.duration[rest[1]] = token.value.value;
      else if (group === 'motion' && rest[0] === 'easing') ir.easing[rest[1]] = token.value;
      else if (group === 'motion' && rest[0] === 'spring') {
        const [, scheme, name, field] = rest;
        const spring = ((ir.spring[scheme] ??= {})[name] ??= {});
        spring[field] = token.type === 'duration' ? token.value.value : token.value;
      } else if (group === 'elevation') {
        ir.elevation[rest[0]] = token.value.map((layer, i) => ({
          x: layer.offsetX.value,
          y: layer.offsetY.value,
          blur: layer.blur.value,
          spread: layer.spread.value,
          role: token.partialAlias[i].color.slice(SYS_COLOR.length),
        }));
      }
    } else if (tier === 'dial') {
      ir.dials[[group, ...rest].join('-')] = typeof token.value === 'number' ? token.value : token.value.value;
    } else if (tier === 'comp') {
      const entry = { ...componentToken(model, token, rest), ...placeOnAxes(model.components?.[group], rest, token) };
      // The states a part declares for itself (`dev.tanrei.states` on a group inside the component — a table's row)
      // are not the component's own state shape: no axis holds them and their name does not begin with the state. The
      // typed platform shapes carry them as plain tokens, by their whole name (`row-selected-hovered-container-color`).
      if (entry.state && entry.axis === null && rest[0] !== entry.state) entry.state = null;
      (ir.componentTokens[group] ??= []).push(entry);
    }
  }
  for (const { token, group, rest } of added) {
    const declaredBy = token.vocabulary.declaredBy;
    if (group === 'motion' && rest[0] === 'spring') {
      // A spring set is four tokens; emitters want the set.
      const [, scheme, name] = rest;
      const list = (ir.extensions.series.spring ??= []);
      if (!list.some((entry) => entry.scheme === scheme && entry.key === name)) list.push({ key: name, scheme, id: token.id.split('.').slice(0, -1).join('.'), declaredBy, value: ir.spring[scheme][name] });
      continue;
    }
    const series = group === 'motion' ? rest[0] : group;
    const key = seriesKey(group, rest);
    // `sys.icon` holds two kinds of step: sizes (dimensions, in `ir.measure.icon`) and the numbers of how icons are
    // drawn — `weight`, `fill.*` (in `ir.icon`). An added number step is looked up where the core ones are.
    const map = group === 'motion' ? ir[rest[0]] : group === 'icon' && token.type === 'number' ? ir.icon : MEASURE_GROUPS.includes(group) ? ir.measure[group] : ir[group];
    (ir.extensions.series[series] ??= []).push({ key, id: token.id, declaredBy, value: map?.[key] });
  }
  ir.extensions.roles = Object.entries(model.colors.light).filter(([, t]) => t.vocabulary?.extension).map(([role, t]) => ({ key: role, declaredBy: t.vocabulary.declaredBy, ...(t.vocabulary.onRole ? { onRole: t.vocabulary.onRole.slice(SYS_COLOR.length) } : {}) }));
  for (const [id, token] of Object.entries(model.tokens)) if (id.startsWith(`${NS}.ref.typeface.`) && token.type === 'fontFamily') ir.typefaces[id.split('.').at(-1)] = fontStack(token.value);
  if (ir.iconFamilies.unselected) ir.icon.family = ir.iconFamilies.unselected.stack;
  for (const [component, declaration] of Object.entries(model.components ?? {})) ir.axes[component] = axesOf(declaration, ir.componentTokens[component] ?? []);
  // Intents = roles that come as a set of four (`x`, `on-x`, `x-container`, `on-x-container`), core or
  // palette-declared. Every native emitter lists them on the system value; no component prop names one.
  ir.intents = ir.roles.filter((r) => [`on-${r}`, `${r}-container`, `on-${r}-container`].every((k) => ir.roles.includes(k)));
  // Core roles are vocabulary: every system values them, so platforms name them in their types. Declared roles
  // come from the palettes one system declares: platforms treat them as open keys.
  const vocabulary = colorVocabulary(REPO_ROOT);
  const core = new Set([...Object.keys(vocabulary.intents).flatMap((name) => vocabulary.sets.intent.roles.map((r) => r.replace('{name}', name))), ...Object.keys(vocabulary.roles)]);
  ir.coreRoles = ir.roles.filter((r) => core.has(r));
  ir.declaredRoles = ir.roles.filter((r) => !core.has(r));
  const lacking = [...core].filter((r) => !ir.roles.includes(r));
  if (lacking.length) throw new Error(`system "${ir.system}" lacks core color roles: ${lacking.join(', ')}`);
  return ir;
}

/**
 * A paint is how a component color is described WITHOUT resolving the scheme: platforms evaluate it
 * against the current scheme's roles at runtime, so component tokens stay scheme-independent and a
 * re-pointed palette just works.
 *   { kind: 'role', role }                       a sys.color role
 *   { kind: 'mix', base, with, amount }          premultiplied interpolation (= CSS color-mix in srgb)
 *   { kind: 'alpha', of, amount }                `of` with its alpha multiplied by amount
 *   { kind: 'none' }                             nothing is drawn
 *   { kind: 'literal', r, g, b, a }              a fixed color (0–255, a 0–1), the same in every scheme
 */
function paintOf(model, id) {
  // Two rules are decided per scheme at build time — `tone` (a palette tone) and `contrast-pick` (a choice among
  // tokens) — and a `mix` or `alpha` may take its amount per scheme. Where the schemes agree the paint is an ordinary one; where they differ it is
  //   { kind: 'scheme', by: { light: <paint>, 'light-medium': <paint>, …, 'dark-high': <paint> } }
  // and a platform evaluates the paint of the scheme it is drawing in.
  const flags = { perScheme: false };
  const light = paintIn(model, 'light', id, [], flags);
  if (!flags.perScheme) return light;
  const by = Object.fromEntries(model.schemes.map((scheme) => [scheme, scheme === 'light' ? light : paintIn(model, scheme, id, [], flags)]));
  return model.schemes.every((scheme) => JSON.stringify(by[scheme]) === JSON.stringify(light)) ? light : { kind: 'scheme', by };
}

function paintIn(model, scheme, id, trail, flags) {
  if (trail.includes(id)) throw new Error(`paint cycle: ${[...trail, id].join(' → ')}`);
  if (id.startsWith(SYS_COLOR)) return { kind: 'role', role: id.slice(SYS_COLOR.length) };
  const token = model.componentColors?.[scheme]?.[id] ?? model.tokens[id];
  if (!token) throw new Error(`${trail.at(-1) ?? '?'}: paint references unknown token ${id}`);
  const next = [...trail, id];
  const ref = (v) => paintIn(model, scheme, v.slice(1, -1), next, flags);
  const rule = token.derive;
  const amount = (v) => {
    if (typeof v !== 'string') return v;
    const target = model.tokens[v.slice(1, -1)];
    if (!target) throw new Error(`${id}: the "${rule.fn}" rule's amount references unknown token ${v}`);
    return target.value;
  };
  if (rule?.fn === 'tone' || rule?.fn === 'contrast-pick') flags.perScheme = true;
  // A mix or alpha whose amount is a context map is written into each scheme with that scheme's amount: where they
  // differ, so does the paint.
  if ((rule?.fn === 'mix' || rule?.fn === 'alpha') && model.schemes.some((s) => model.componentColors?.[s]?.[id] && model.componentColors[s][id].derive?.amount !== rule.amount)) flags.perScheme = true;
  if (rule?.fn === 'mix') return { kind: 'mix', base: ref(rule.base), with: ref(rule.with), amount: amount(rule.amount) };
  if (rule?.fn === 'alpha') return { kind: 'alpha', of: ref(rule.of), amount: amount(rule.amount) };
  if (token.alias) return paintIn(model, scheme, token.alias, next, flags);
  const c = rgba(token.value);
  return c.a === 0 ? { kind: 'none' } : { kind: 'literal', ...c };
}

/** The key a series step has in the IR maps above (`ir.space`, `ir.shape`, `ir.typescale`, `ir.elevation`, `ir.duration`…). */
function seriesKey(group, rest) {
  if (group === 'typescale') return typeName(rest);
  if (group === 'shape') return rest.slice(1).join('-');
  if (group === 'motion') return rest.slice(1).join('-');
  return rest.join('-');
}

/**
 * Where a component token sits on its component's axes, so emitters never parse names:
 *   container.height.small        → { axis: 'size', key: 'small', member: 'container-height' }
 *   filled.container.color        → { axis: 'variant', key: 'filled', member: 'container-color' }
 *   filled.hovered.container.color→ the same, with `state: 'hovered'` already on the token
 *   hovered.opacity / container.gap → { axis: null }
 *   action.tonal-layer.opacity    → { axis: null }: under a control's name, but not a part declared per state
 */
function placeOnAxes(declaration, rest, token) {
  // Off the axes, `member` is still the token's name without its state: `hovered.opacity` → 'opacity'.
  const none = { axis: null, key: null, member: (token.state && rest[0] === token.state ? rest.slice(1) : rest).join('-') };
  if (!declaration) return none;
  const { axes, states } = declaration;
  for (const [axis, def] of Object.entries(axes)) {
    if (def.from === 'states') {
      if (!states.variants.includes(rest[0])) continue;
      const parts = token.state ? rest.slice(2) : rest.slice(1);
      // A token that stands under a control's name without being one of the parts the component declares per state
      // (`action.tonal-layer.opacity`: one number for every form and state) is off the axis: every value of the axis
      // has every member in every state, and such a token exists once.
      if (states.perVariant && !(parts.join('.') in states.perVariant)) return none;
      return { axis, key: rest[0], member: parts.join('-') };
    }
    const member = def.members.find((m) => rest.slice(0, -1).join('.') === m);
    if (member && def.values.includes(rest.at(-1))) return { axis, key: rest.at(-1), member: member.replaceAll('.', '-') };
  }
  return none;
}

/** The axes of one component: their values (core first, then extensions with who declared them) and members. */
function axesOf({ axes, states }, tokens) {
  const out = {};
  for (const [axis, def] of Object.entries(axes)) {
    const added = new Map((def.extensions ?? []).map((e) => [e.value, e.declaredBy]));
    const keys = def.from === 'states' ? states.variants : def.values;
    // In the order the component declares them, not the order a resolver happens to return tokens in.
    const declared = (def.from === 'states' ? Object.keys(states.perVariant ?? {}) : def.members).map((m) => m.replaceAll('.', '-'));
    const types = new Map(tokens.filter((t) => t.axis === axis && t.state === null).map((t) => [t.member, t.type]));
    const members = [...types.keys()].sort((x, y) => (declared.indexOf(x) + 1 || 99) - (declared.indexOf(y) + 1 || 99)).map((name) => ({ name, type: types.get(name) }));
    out[axis] = { default: def.default, values: keys.map((key) => ({ key, core: !added.has(key), ...(added.has(key) ? { declaredBy: added.get(key) } : {}) })), members };
  }
  return out;
}

function componentToken(model, token, rest) {
  // `state` is set on per-state tokens.
  const entry = { id: token.id, name: rest.join('-'), type: token.type, state: token.state ?? null };
  const final = token.aliasFinal ?? token.alias;
  if (token.type === 'color') entry.paint = paintOf(model, token.id);
  else if (token.type === 'typography') entry.typescale = typeName(final.slice(SYS_TYPE.length).split('.'));
  else if (token.type === 'shadow') entry.elevation = final.slice(SYS_ELEVATION.length);
  else if (token.type === 'dimension' || token.type === 'duration') entry.value = token.value.value;
  else entry.value = token.value;
  return entry;
}
