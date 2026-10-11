// TypeScript / React Native: two kinds of generated file.
//   vocabulary.ts        system-independent TYPES: `TanreiSystem` and its parts, every member required,
//                        so a product's stale generated system stops type-checking when vocabulary moves.
//   systems/<id>.ts      one system's VALUES: `export const <id> = { … } as const satisfies TanreiSystem`.
// Colors are structured `{ r, g, b, a }` and component colors are paints (see ir.js `paintOf`); the
// platform evaluates paints against the current scheme at runtime and formats a color string at the edge.
//
// Open vocabulary has ONE shape here, the one color roles already had: the core keys are named in
// the vocabulary types, a value a layer added is an OPTIONAL key that the layer's generated file declares by
// module augmentation, and the library looks keys up with a fallback. So a system without extensions emits
// nothing about them, and a system with extensions gains one marked `declare module` section (plus, for its
// own namespace, one typed object that is not part of `TanreiSystem`).
import { CONFIG, GENERATED_HEADER, camel, pascal } from '../model.js';
import { TYPE_FAMILIES } from '../pure.js';

const OUT_DIR = 'packages/react-native/src/generated';
// Where a system file finds the vocabulary types: next to it in the library, the published package in a product.
let vocabularyModule = '../vocabulary';
// Where a system file that ADDED series steps finds the runtime lookup (`seriesStep`). A system without such steps imports no runtime.
let runtimeModule = '../../theme/lookup';

const c = (s) => camel([s]);
const keyed = (obj, fn = (v) => v) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [c(k), fn(v)]));
const isIdentifier = (s) => /^[A-Za-z_$][\w$]*$/.test(s);
const prop = (s) => (isIdentifier(s) ? s : JSON.stringify(s));

const isLive = (t) => !t.deprecated;

function paint(p) {
  switch (p.kind) {
    case 'role':
      return { kind: 'role', role: c(p.role) };
    case 'mix':
      return { kind: 'mix', base: paint(p.base), with: paint(p.with), amount: p.amount };
    case 'alpha':
      return { kind: 'alpha', of: paint(p.of), amount: p.amount };
    case 'none':
      return { kind: 'none' };
    case 'literal':
      return { kind: 'literal', r: p.r, g: p.g, b: p.b, a: p.a };
    case 'scheme':
      // Decided per scheme at build time (a palette tone, a contrast pick): the platform evaluates the paint of the scheme it draws in.
      return { kind: 'scheme', by: keyed(p.by, paint) };
    default:
      throw new Error(`ts emitter: unknown paint kind "${p.kind}"`);
  }
}

const COMPONENT_TYPES = {
  color: 'TanreiPaint',
  typography: 'TanreiTypescaleRole',
  shadow: 'TanreiElevationLevel',
  dimension: 'number',
  duration: 'number',
  number: 'number',
  cubicBezier: 'TanreiCubicBezier',
};

function componentType(token) {
  const type = COMPONENT_TYPES[token.type];
  if (!type) throw new Error(`ts emitter: component token "${token.name}" has unsupported type "${token.type}"`);
  return type;
}

function componentValue(token) {
  if (token.type === 'color') return paint(token.paint);
  if (token.type === 'typography') return c(token.typescale);
  if (token.type === 'shadow') return c(token.elevation);
  return token.value;
}

const liveMeasure = (ir) =>
  Object.fromEntries(
    Object.entries(ir.measure).map(([group, entries]) => [group, Object.fromEntries(Object.entries(entries).filter(([k]) => !ir.deprecatedMeasures.includes(`${group}-${k}`)))]),
  );

/** JSON, but leaves (objects and arrays of primitives: a color, a bezier, a flat paint) stay on one line. */
function literal(value, indent = '') {
  const flat = (v) => v === null || typeof v !== 'object';
  if (flat(value)) return JSON.stringify(value);
  const entries = Array.isArray(value) ? value.map((v) => [null, v]) : Object.entries(value);
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  if (!entries.length) return open + close;
  const item = (k, v, pad) => (k === null ? '' : `${prop(k)}: `) + literal(v, pad);
  if (entries.every(([, v]) => flat(v))) return `${open}${Array.isArray(value) ? '' : ' '}${entries.map(([k, v]) => item(k, v, indent)).join(', ')}${Array.isArray(value) ? '' : ' '}${close}`;
  const inner = `${indent}  `;
  return `${open}\n${entries.map(([k, v]) => `${inner}${item(k, v, inner)},`).join('\n')}\n${indent}${close}`;
}

const header = (lines) => [...GENERATED_HEADER.map((l) => `// ${l}`), ...lines.map((l) => `// ${l}`), ''];

const numberInterface = (name, obj, doc) => [
  ...(doc ? [`/** ${doc} */`] : []),
  `export interface ${name} {`,
  ...Object.keys(obj).map((k) => `  readonly ${prop(c(k))}: number;`),
  '}',
  '',
];

const keysInterface = (name, keys, type, doc) => [...(doc ? [`/** ${doc} */`] : []), `export interface ${name} {`, ...keys.map((k) => `  readonly ${prop(c(k))}: ${type};`), '}', ''];

// ── font stacks, icon sets, choices of kind ────────────────────
// React Native has platform fonts of three classes. Which class a stack falls back to is decided ONCE, in the IR
// (`fontStack().genericClass`: a CSS generic outside the three — cursive, fantasy, math, emoji — reads as
// 'sans-serif', the platform's default text face). The IR's `generic` (the keyword as written) is for the web, and its
// `fallback` flag is for `tanrei validate`; neither is delivered here (the package README says so).
const FONT_GENERICS = ['sans-serif', 'serif', 'monospace'];
/** `fontStack()` of the IR, delivered as it is: the emitter and the platform never read CSS keywords themselves. */
function fontStackValue(font, what) {
  if (!font || !Array.isArray(font.stack) || !Array.isArray(font.families) || typeof font.system !== 'boolean' || !FONT_GENERICS.includes(font.genericClass)) throw new Error(`ts emitter: ${what} is not a font stack of the IR (fontStack())`);
  return { stack: font.stack, families: font.families, generic: font.genericClass, system: font.system };
}

/**
 * How icons are drawn: the icon font BY SELECTION STATE (`ir.iconFamilies`) plus the numbers of `sys.icon` that are
 * not sizes (`weight`, `fill-unselected`, `fill-selected`). Sizes stay in `measure.icon`. Core vocabulary: all required.
 */
// `optical-size-min/max`: the range of the icon font's `opsz` axis (a fact of the font the system names, not a design value).
const ICON_NUMBERS = ['weight', 'mark-weight', 'fill-unselected', 'fill-selected', 'optical-size-min', 'optical-size-max'];
const ICON_STATES = ['unselected', 'selected'];
function iconStyle(ir) {
  const lacking = [...ICON_STATES.filter((k) => ir.iconFamilies?.[k] === undefined).map((k) => `family.${k}`), ...ICON_NUMBERS.filter((k) => ir.icon?.[k] === undefined)];
  if (lacking.length) throw new Error(`ts emitter: system "${ir.system}" lacks icon style tokens: ${lacking.join(', ')}`);
  // `ir.icon.family` repeats iconFamilies.unselected for an emitter that reads one icon family: not a member of its own.
  const unknown = [...Object.keys(ir.icon).filter((k) => k !== 'family' && !ICON_NUMBERS.includes(k)), ...Object.keys(ir.iconFamilies).filter((k) => !ICON_STATES.includes(k)).map((k) => `family.${k}`)];
  if (unknown.length) throw new Error(`ts emitter: sys.icon has members this emitter does not know: ${unknown.join(', ')}`);
  return { family: Object.fromEntries(ICON_STATES.map((k) => [k, fontStackValue(ir.iconFamilies[k], `sys.icon.family.${k}`)])), ...Object.fromEntries(ICON_NUMBERS.map((k) => [c(k), ir.icon[k]])) };
}

// ── emphasis as a weight step, corner smoothing as an amount ──────────────
/** The family of a type role is decided once by the token build and read from the IR (`ir.typescale[role].family`); the emitter never parses a role's name. */
function typeFamilyOf(t, role) {
  if (!TYPE_FAMILIES.includes(t.family)) throw new Error(`ts emitter: typescale role "${role}" has no family in the IR (${JSON.stringify(t.family)}); ir.typescale[role].family is one of ${TYPE_FAMILIES.join(', ')}`);
  return t.family;
}
/** `sys.typescale.emphasis.<family>`: the weight `emphasized` text ADDS to a role's weight. Core vocabulary: every system has all four. */
function typeEmphasisValue(ir) {
  const lacking = TYPE_FAMILIES.filter((f) => typeof ir.typeEmphasis?.[f] !== 'number');
  if (lacking.length) throw new Error(`ts emitter: system "${ir.system}" lacks the emphasis step of ${lacking.join(', ')} (sys.typescale.emphasis.*)`);
  const unknown = Object.keys(ir.typeEmphasis).filter((f) => !TYPE_FAMILIES.includes(f));
  if (unknown.length) throw new Error(`ts emitter: sys.typescale.emphasis has families this emitter does not know: ${unknown.join(', ')}`);
  return Object.fromEntries(TYPE_FAMILIES.map((f) => [f, ir.typeEmphasis[f]]));
}
/** `sys.shape.corner-smoothing`: 0–1 with Figma's meaning (0 circular, 0.6 the iOS continuous corner, 1 the most eased). */
function cornerSmoothingValue(ir) {
  const v = ir.cornerSmoothing;
  if (typeof v !== 'number' || !(v >= 0 && v <= 1)) throw new Error(`ts emitter: system "${ir.system}" has no sys.shape.corner-smoothing in [0, 1] (got ${JSON.stringify(v)})`);
  return v;
}
/** The member of `TanreiTypescale` that is not a role, and of `TanreiShape` that is not a radius. A layer cannot add a step under either name. */
const TYPESCALE_EMPHASIS = 'emphasis';
const SHAPE_CORNER_SMOOTHING = 'cornerSmoothing';

/** A choice of kind → its type name: `pressed-feedback` → `TanreiPressedFeedback`. */
const behaviorType = (key) => `Tanrei${pascal([key])}`;
/** The NAME each choice has in this system. The index the token file stores never leaves the pipeline. */
function behaviorValue(ir) {
  if (!Object.keys(ir.behavior ?? {}).length) throw new Error(`ts emitter: system "${ir.system}" has no sys.behavior tokens`);
  return keyed(ir.behavior, (choice) => choice.value);
}

const MEASURE_GROUPS = ['border', 'focus', 'target', 'icon', 'breakpoint'];
const measureInterface = (group) => `Tanrei${pascal([group])}Measure`;
/**
 * A series a layer may add a step to (key of `ir.extensions.series`) → the interface the step joins, a step's type,
 * and where the series sits on the system object (springs sit one level deeper: per spring scheme).
 */
const SERIES = {
  typescale: ['TanreiTypescale', 'TanreiTypography', ['typescale']],
  shape: ['TanreiShape', 'number', ['shape']],
  space: ['TanreiSpace', 'number', ['space']],
  state: ['TanreiState', 'number', ['state']],
  elevation: ['TanreiElevation', 'readonly TanreiElevationLayer[]', ['elevation']],
  duration: ['TanreiDuration', 'number', ['motion', 'duration']],
  easing: ['TanreiEasing', 'TanreiCubicBezier', ['motion', 'easing']],
  spring: ['TanreiSpringSet', 'TanreiSpring', ['motion', 'spring']],
  ...Object.fromEntries(MEASURE_GROUPS.map((group) => [group, [measureInterface(group), 'number', ['measure', c(group)]]])),
};

/**
 * The steps this system ADDED to a series (`ir.extensions.series`): `{ series, key, path }` — `path` is where the
 * series holding the step sits on the system object. A spring entry is one added SET in one spring scheme.
 */
function addedSteps(ir) {
  const out = [];
  for (const [series, steps] of Object.entries(ir.extensions.series)) {
    if (!SERIES[series]) throw new Error(`ts emitter: a layer added a step to "${series}", a series this emitter cannot extend (${Object.keys(SERIES).join(', ')})`);
    const path = SERIES[series][2];
    for (const step of steps) {
      // Two members of a series holder are not steps: `typescale.emphasis` (the weight steps) and `shape.cornerSmoothing`.
      if ((series === 'typescale' && c(step.key) === TYPESCALE_EMPHASIS) || (series === 'shape' && c(step.key) === SHAPE_CORNER_SMOOTHING)) throw new Error(`ts emitter: a layer added a ${series} step "${step.key}", the name of a member that is not a step`);
      out.push({ series, key: step.key, path: series === 'spring' ? [...path, c(step.scheme)] : path });
    }
  }
  return out;
}

// ── component axes ─────────────────────────────────────────────
// Interaction states are closed (bound to platform behaviour), in precedence-free reading order.
const STATE_ORDER = ['hovered', 'focused', 'pressed', 'disabled'];
const RESTING = 'enabled';

/** The axes of one component as the emitter needs them: type names, the field of the token object, its states. */
function axesOf(ir, component) {
  const tokens = ir.componentTokens[component].filter(isLive);
  const base = `Tanrei${pascal([component])}`;
  return Object.entries(ir.axes[component] ?? {}).map(([axis, def]) => {
    const own = tokens.filter((t) => t.axis === axis);
    const found = new Set(own.map((t) => t.state).filter((s) => s !== null));
    const states = [...STATE_ORDER.filter((s) => found.has(s)), ...[...found].filter((s) => !STATE_ORDER.includes(s)).sort()];
    const type = `${base}${pascal([axis])}`;
    return { axis, def, own, states, field: `${c(axis)}s`, key: type, core: `TanreiCore${pascal([component])}${pascal([axis])}`, registry: `${type}Registry`, tokens: `${type}Tokens`, stateTokens: `${type}StateTokens`, holder: `${type}s` };
  });
}

function axisTypes(component, a) {
  const core = a.def.values.filter((v) => v.core).map((v) => c(v.key));
  const members = a.def.members.map((m) => `  readonly ${prop(c(m.name))}: ${componentType({ ...m, name: `${component}.${m.name}` })};`);
  const lines = [
    '/**',
    ` * Every value of \`comp.${component}\`'s \`${a.axis}\` axis. The core values are listed here; a system that adds one`,
    ' * declares it by module augmentation — its generated file does that. At runtime a value the active system',
    ` * does not have falls back to \`${c(a.def.default)}\` (with a dev-only warning).`,
    ' */',
    `export interface ${a.registry} {`,
    ...core.map((k) => `  ${prop(k)}: true;`),
    '}',
    `export type ${a.key} = keyof ${a.registry};`,
    `export type ${a.core} = ${core.map((k) => JSON.stringify(k)).join(' | ')};`,
    '',
  ];
  if (a.states.length) {
    lines.push(
      `/** What one \`${a.axis}\` of \`comp.${component}\` is drawn from in ONE interaction state. */`,
      `export interface ${a.stateTokens} {`,
      ...members,
      '}',
      `/** One \`${a.axis}\`: the resting state (\`${RESTING}\`) and every interaction state. States are not extensible. */`,
      `export interface ${a.tokens} {`,
      ...[RESTING, ...a.states].map((s) => `  readonly ${prop(c(s))}: ${a.stateTokens};`),
      '}',
    );
  } else {
    lines.push(`/** The tokens of one \`${a.axis}\` of \`comp.${component}\`. */`, `export interface ${a.tokens} {`, ...members, '}');
  }
  lines.push(
    '/** Core values are required; a value a system added is present only in that system. */',
    `export type ${a.holder} = { readonly [Key in ${a.core}]: ${a.tokens} } & { readonly [Key in ${a.key}]?: ${a.tokens} };`,
    '',
  );
  return lines;
}

function axisValues(component, a) {
  const group = (key, state) =>
    Object.fromEntries(
      a.def.members.map((m) => {
        const token = a.own.find((t) => t.key === key && t.member === m.name && t.state === state);
        if (!token) throw new Error(`ts emitter: comp.${component} has no "${m.name}" for ${a.axis} "${key}"${state ? ` in state "${state}"` : ''}`);
        return [c(m.name), componentValue(token)];
      }),
    );
  return Object.fromEntries(
    a.def.values.map(({ key }) => [c(key), a.states.length ? Object.fromEntries([[RESTING, group(key, null)], ...a.states.map((s) => [c(s), group(key, s)])]) : group(key, null)]),
  );
}

// ── what a system ADDED ────────────────────────────────────────
/** `interface → member lines` for everything this system adds to the open vocabulary. Empty for a system without extensions. */
function addedVocabulary(ir) {
  const added = new Map();
  const add = (name, line) => added.set(name, [...(added.get(name) ?? []), line]);
  for (const { key } of ir.extensions.roles) add('TanreiColorRoleRegistry', `${prop(c(key))}: true;`);
  for (const { series, key } of addedSteps(ir)) {
    const [name, type] = SERIES[series];
    const line = `readonly ${prop(c(key))}?: ${type};`;
    // A spring added to both spring schemes is still ONE member of the set type.
    if (!added.get(name)?.includes(line)) add(name, line);
  }
  for (const component of Object.keys(ir.componentTokens)) {
    for (const a of axesOf(ir, component)) for (const v of a.def.values.filter((x) => !x.core)) add(a.registry, `${prop(c(v.key))}: true;`);
  }
  return added;
}

/** A layer's own tokens (`acme.*`): one typed object per namespace, nested by token path. Not part of `TanreiSystem`. */
function ownTokens(namespace, entries) {
  const types = {};
  const values = {};
  for (const token of entries) {
    const path = token.id.split('.').slice(1).map(c);
    let [t, v] = [types, values];
    for (const segment of path.slice(0, -1)) [t, v] = [(t[segment] ??= {}), (v[segment] ??= {})];
    t[path.at(-1)] = componentType(token);
    v[path.at(-1)] = componentValue(token);
  }
  const shape = (node, indent) => (typeof node === 'string' ? node : `{\n${Object.entries(node).map(([k, n]) => `${indent}  readonly ${prop(k)}: ${shape(n, `${indent}  `)};`).join('\n')}\n${indent}}`);
  const name = `${pascal([namespace])}Tokens`;
  return [
    `/** The "${namespace}" layer's own tokens (\`${namespace}.*\`). They are not part of \`TanreiSystem\`: read them next to it. */`,
    `export interface ${name} ${shape(types, '')}`,
    '',
    '/** Colors are paints (evaluate with `useTanrei().paint()`); type styles and elevations name a step of the system. */',
    `export const ${c(namespace)}Tokens = ${literal(values)} as const satisfies ${name};`,
    '',
  ];
}

/**
 * Typed accessors for the series steps a system added. A step is an OPTIONAL key of the vocabulary (only its system
 * is known to have it), so product code that reads it under another system would get `undefined`. The accessor is
 * total instead: the active system's value when it has the step, else the value the DECLARING system gave it — which
 * the generator knows — reported once in development builds and never thrown (the spirit of Button BTN-7).
 * The accessor object mirrors the system object: `acmeSteps.space.space1200(system)`.
 */
function stepAccessors(ir, value) {
  const steps = addedSteps(ir);
  if (!steps.length) return { lines: [], types: [] };
  const tree = {};
  const types = new Set();
  for (const { series, key, path } of steps) {
    const type = SERIES[series][1];
    for (const name of type.match(/Tanrei\w+/g) ?? []) types.add(name);
    const declared = [...path, c(key)].reduce((node, segment) => node?.[segment], value);
    if (declared === undefined) throw new Error(`ts emitter: system "${ir.system}" declares the ${series} step "${key}" but has no value for it`);
    let node = tree;
    for (const segment of path) node = node[segment] ??= {};
    node[c(key)] = { type, holder: `system${path.map((segment) => (isIdentifier(segment) ? `.${segment}` : `[${JSON.stringify(segment)}]`)).join('')}`, declared, what: path.join('.') };
  }
  const render = (node, indent) =>
    Object.entries(node).map(([k, n]) =>
      n.holder
        ? `${indent}${prop(k)}: (system: TanreiSystem): ${n.type} => seriesStep<${n.type}>(${n.holder}, ${JSON.stringify(k)}, ${literal(n.declared, indent)}, ${JSON.stringify(n.what)}),`
        : `${indent}${prop(k)}: {\n${render(n, `${indent}  `).join('\n')}\n${indent}},`,
    );
  return {
    types: [...types],
    lines: [
      '/**',
      ` * The series steps "${ir.system}" ADDED, readable under ANY system: the active system's own value when it`,
      ` * has the step, else the value "${ir.system}" gives it — reported once in development builds, never thrown.`,
      ' */',
      `export const ${c(ir.system)}Steps = {`,
      ...render(tree, '  '),
      '} as const;',
      '',
    ],
  };
}

function emitVocabulary(ir, core) {
  const measure = liveMeasure(ir);
  const coreRoles = ir.roles.filter((r) => core.has(r));
  const springNames = Object.keys(Object.values(ir.spring)[0] ?? {});
  const springFields = Object.entries(Object.values(Object.values(ir.spring)[0] ?? {})[0] ?? {});
  const lines = header([
    'The Tanrei vocabulary as TypeScript types. System-independent: values live in ./systems/<id>.ts.',
    'Every member is required: a system generated before a vocabulary change no longer type-checks.',
    'Lengths are density-independent pixels, durations are milliseconds.',
  ]);

  lines.push(
    '/** sRGB color: channels 0–255, alpha 0–1. Format it with `formatColor()` at the edge. */',
    'export interface TanreiColor {',
    '  readonly r: number;',
    '  readonly g: number;',
    '  readonly b: number;',
    '  readonly a: number;',
    '}',
    '',
    '/**',
    ' * Every color role a paint may name. The core roles are listed here; a system that declares palettes',
    ' * (e.g. `tertiary`, `correct`) adds its roles by module augmentation — its generated file does that.',
    ' * At runtime a role the active scheme does not have falls back (with a dev-only warning).',
    ' */',
    'export interface TanreiColorRoleRegistry {',
    ...coreRoles.map((r) => `  ${prop(c(r))}: true;`),
    '}',
    'export type TanreiColorRole = keyof TanreiColorRoleRegistry;',
    '',
    '/** The roles every system must value in every scheme. */',
    'export type TanreiCoreColorRole =',
    ...coreRoles.map((r, i) => `  | ${JSON.stringify(c(r))}${i === coreRoles.length - 1 ? ';' : ''}`),
    '',
    '/** Core roles are required; palette-declared roles are present only in the systems that declare them. */',
    'export type TanreiSchemeColors = { readonly [Role in TanreiCoreColorRole]: TanreiColor } & { readonly [Role in TanreiColorRole]?: TanreiColor };',
    '',
    `export type TanreiScheme = ${ir.schemes.map((s) => JSON.stringify(c(s))).join(' | ')};`,
    'export type TanreiColors = { readonly [Scheme in TanreiScheme]: TanreiSchemeColors };',
    '',
    '/**',
    ' * How a component color is described without resolving the scheme. Evaluate with `evaluatePaint()`.',
    ' * `mix` is premultiplied interpolation — identical to CSS `color-mix(in srgb, base, with amount)`.',
    ' * `scheme` is a paint decided per scheme at build time (a palette tone, a contrast pick): one paint per scheme.',
    ' */',
    'export type TanreiPaint =',
    "  | { readonly kind: 'role'; readonly role: TanreiColorRole }",
    "  | { readonly kind: 'mix'; readonly base: TanreiPaint; readonly with: TanreiPaint; readonly amount: number }",
    "  | { readonly kind: 'alpha'; readonly of: TanreiPaint; readonly amount: number }",
    "  | { readonly kind: 'none' }",
    "  | { readonly kind: 'scheme'; readonly by: { readonly [Scheme in TanreiScheme]: TanreiPaint } }",
    "  | { readonly kind: 'literal'; readonly r: number; readonly g: number; readonly b: number; readonly a: number };",
    '',
    '/**',
    ' * A font stack, read ONCE in the token pipeline. `families` are the NAMED families, in order — what a',
    ' * product installs or registers. `generic` is the class of platform font to fall back to. `system` says the stack',
    " * asks for the platform's own font of that class BEFORE any named family. `stack` is the stack as written (CSS),",
    ' * for a renderer that takes one (a web view); never parse it. See `fontFamilyOf()`.',
    ' */',
    `export type TanreiFontGeneric = ${FONT_GENERICS.map((g) => JSON.stringify(g)).join(' | ')};`,
    'export interface TanreiFontStack {',
    '  readonly stack: readonly string[];',
    '  readonly families: readonly string[];',
    '  readonly generic: TanreiFontGeneric;',
    '  readonly system: boolean;',
    '}',
    ...keysInterface('TanreiTypefaces', Object.keys(ir.typefaces), 'TanreiFontStack', 'The named typefaces of the system (`ref.typeface.*`): what a product must make available, per role.'),
    'export interface TanreiTypography {',
    '  readonly font: TanreiFontStack;',
    '  readonly size: number;',
    '  readonly weight: number;',
    '  readonly tracking: number;',
    '  readonly lineHeight: number;',
    '  /**',
    "   * The family the role belongs to: which step of `TanreiTypeEmphasis` `emphasized` text adds. Decided by",
    '   * the token build, so a runtime need not guess it from the name. Optional only so a hand-written style stays valid.',
    '   */',
    '  readonly family?: TanreiTypeFamily;',
    '}',
    '/**',
    " * The weight `emphasized` text ADDS to a role's weight, per family (`sys.typescale.emphasis.*`). A role's",
    ' * family is `TanreiTypography.family`, decided by the token build (the first segment of its name when it names a',
    ' * family; `caption`, `code*`, `eyebrow` and any other role take the `label` step). See `emphasize()`.',
    ' */',
    'export interface TanreiTypeEmphasis {',
    ...TYPE_FAMILIES.map((f) => `  readonly ${f}: number;`),
    '}',
    'export type TanreiTypeFamily = keyof TanreiTypeEmphasis;',
    '',
    '/**',
    ' * The type styles by level: `display`; `heading1`…`heading6` (h1…h6); `bodyLarge` / `body` / `bodySmall`',
    ' * (lead, p, small); `label` / `labelSmall` / `caption` (text in and next to controls); `code` / `codeSmall`;',
    " * `eyebrow`. Every member but `emphasis` is a role; a role a system added is an optional key its generated file declares.",
    ' */',
    'export interface TanreiTypescale {',
    `  readonly ${TYPESCALE_EMPHASIS}: TanreiTypeEmphasis;`,
    ...Object.keys(ir.typescale).map((k) => `  readonly ${prop(c(k))}: TanreiTypography;`),
    '}',
    `export type TanreiTypescaleRole = Exclude<keyof TanreiTypescale, ${JSON.stringify(TYPESCALE_EMPHASIS)}>;`,
    '',
    '/** Corner radii, in dp, and how their curve eases (`cornerSmoothing`). A radius a system added is an optional key. */',
    'export interface TanreiShape {',
    '  /**',
    "   * `sys.shape.corner-smoothing`: 0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous",
    '   * corner, 1 the most eased. React Native has only the OS\'s curve on iOS: `borderCurveOf()` draws `continuous` for',
    '   * any amount above 0; Android is always circular.',
    '   */',
    `  readonly ${SHAPE_CORNER_SMOOTHING}: number;`,
    ...Object.keys(ir.shape).map((k) => `  readonly ${prop(c(k))}: number;`),
    '}',
    '',
    ...numberInterface('TanreiSpace', ir.space),
    ...numberInterface('TanreiState', ir.state),
    ...numberInterface('TanreiDials', ir.dials, 'The dial values this system was derived from (informational at runtime: derivation is build-time).'),
    ...Object.entries(measure).flatMap(([group, entries]) => numberInterface(measureInterface(group), entries)),
    'export interface TanreiMeasure {',
    ...Object.keys(measure).map((group) => `  readonly ${prop(c(group))}: ${measureInterface(group)};`),
    '}',
    '',
    '/**',
    ' * How icons are drawn. An icon SET is a family per selection state: a variable icon font names the',
    ' * same family twice and tells the states apart by the FILL axis (`fillUnselected` / `fillSelected`); a static set',
    ' * names two families. Fonts are referenced by name, not bundled. Sizes are `measure.icon`. See `iconGlyphStyle()`.',
    ' */',
    'export interface TanreiIconFamilies {',
    ...ICON_STATES.map((k) => `  readonly ${prop(c(k))}: TanreiFontStack;`),
    '}',
    'export interface TanreiIconStyle {',
    '  readonly family: TanreiIconFamilies;',
    ...ICON_NUMBERS.map((k) => `  readonly ${prop(c(k))}: number;`),
    '}',
    '',
    '/**',
    ' * Choices of kind: behaviour that is a name, not an amount. The names are vocabulary — a system chooses',
    ' * among them. The first name of each is the default, and what a platform draws when it cannot draw the choice.',
    ' */',
    ...Object.entries(ir.behavior).map(([key, choice]) => `export type ${behaviorType(key)} = ${choice.values.map((v) => JSON.stringify(v)).join(' | ')};`),
    'export interface TanreiBehavior {',
    ...Object.keys(ir.behavior).map((key) => `  readonly ${prop(c(key))}: ${behaviorType(key)};`),
    '}',
    '',
    'export type TanreiCubicBezier = readonly [number, number, number, number];',
    'export interface TanreiSpring {',
    ...springFields.map(([k, v]) => `  readonly ${prop(c(k))}: ${Array.isArray(v) ? 'TanreiCubicBezier' : 'number'};`),
    '}',
    ...keysInterface('TanreiSpringSet', springNames, 'TanreiSpring', 'The springs of one spring scheme. Open like every series: a spring a system added is an optional key its generated file declares.'),
    ...numberInterface('TanreiDuration', ir.duration),
    ...keysInterface('TanreiEasing', Object.keys(ir.easing), 'TanreiCubicBezier'),
    'export interface TanreiMotion {',
    '  readonly duration: TanreiDuration;',
    '  readonly easing: TanreiEasing;',
    `  readonly spring: { ${Object.keys(ir.spring).map((k) => `readonly ${prop(c(k))}: TanreiSpringSet`).join('; ')} };`,
    '}',
    '',
    'export interface TanreiElevationLayer {',
    '  readonly x: number;',
    '  readonly y: number;',
    '  readonly blur: number;',
    '  readonly spread: number;',
    '  readonly role: TanreiColorRole;',
    '}',
    ...keysInterface('TanreiElevation', Object.keys(ir.elevation), 'readonly TanreiElevationLayer[]'),
    'export type TanreiElevationLevel = keyof TanreiElevation;',
    '',
  );

  for (const [name, tokens] of Object.entries(ir.componentTokens)) {
    const axes = axesOf(ir, name);
    for (const a of axes) lines.push(...axisTypes(name, a));
    lines.push(
      '/**',
      ` * \`comp.${name}\`: one member per token that is on no axis (a per-state one carries the state in its name,`,
      ` * \`<state><Part>\`), then one holder per axis${axes.length ? ` (${axes.map((a) => `\`${a.field}\``).join(', ')})` : ''}, keyed by the axis value.`,
      ' */',
      `export interface Tanrei${pascal([name])}Tokens {`,
      ...tokens.filter((t) => isLive(t) && t.axis === null).map((t) => `  readonly ${prop(c(t.name))}: ${componentType(t)};`),
      ...axes.map((a) => `  readonly ${a.field}: ${a.holder};`),
      '}',
      '',
    );
  }
  lines.push(
    'export interface TanreiComponents {',
    ...Object.keys(ir.componentTokens).map((name) => `  readonly ${prop(c(name))}: Tanrei${pascal([name])}Tokens;`),
    '}',
    '',
    '/** One design system: every token a component or primitive reads. Provide it with `<TanreiProvider system={…}>`. */',
    'export interface TanreiSystem {',
    '  readonly id: string;',
    '  readonly dials: TanreiDials;',
    '  /** Roles that come as a set of four (`x`, `onX`, `xContainer`, `onXContainer`): what a `palette` prop may name. */',
    '  readonly intents: readonly TanreiColorRole[];',
    '  readonly colors: TanreiColors;',
    '  readonly typescale: TanreiTypescale;',
    '  readonly shape: TanreiShape;',
    '  readonly space: TanreiSpace;',
    '  readonly state: TanreiState;',
    '  readonly measure: TanreiMeasure;',
    '  readonly typefaces: TanreiTypefaces;',
    '  readonly icon: TanreiIconStyle;',
    '  readonly behavior: TanreiBehavior;',
    '  readonly motion: TanreiMotion;',
    '  readonly elevation: TanreiElevation;',
    '  readonly components: TanreiComponents;',
    '}',
    '',
  );
  // Every interface a system may add keys to, merged ONCE here, from inside the module that owns it. It adds nothing.
  // Why: a product's file augments these through the package name (a re-export), a shipped preset's file augments
  // this module directly, and TypeScript loses the first kind when it is merged before the first of the second kind
  // (program order: e.g. a product that has its own layer AND imports a preset). This block is always merged first.
  const open = [...new Set(['TanreiColorRoleRegistry', ...Object.values(SERIES).map(([name]) => name), ...Object.keys(ir.componentTokens).flatMap((name) => axesOf(ir, name).map((a) => a.registry))])];
  lines.push(
    '// Merge anchor for the open interfaces (adds no member): keeps module augmentation independent of file order.',
    "declare module './vocabulary' {",
    ...open.map((name) => `  interface ${name} {}`),
    '}',
    '',
  );
  return lines.join('\n');
}

function emitSystem(ir, core) {
  const extended = new Set(ir.extensions.roles.map((r) => r.key));
  const declared = ir.roles.filter((r) => !core.has(r) && !extended.has(r));
  const value = {
    id: ir.system,
    dials: keyed(ir.dials),
    intents: ir.intents.map(c),
    colors: Object.fromEntries(ir.schemes.map((s) => [c(s), keyed(ir.colors[s])])),
    typescale: { [TYPESCALE_EMPHASIS]: typeEmphasisValue(ir), ...Object.fromEntries(Object.entries(ir.typescale).map(([role, t]) => [c(role), { font: fontStackValue(t.font, 'a type style'), size: t.size, weight: t.weight, tracking: t.tracking, lineHeight: t.lineHeight, family: typeFamilyOf(t, role) }])) },
    shape: { [SHAPE_CORNER_SMOOTHING]: cornerSmoothingValue(ir), ...keyed(ir.shape) },
    space: keyed(ir.space),
    state: keyed(ir.state),
    measure: keyed(liveMeasure(ir), (g) => keyed(g)),
    typefaces: keyed(ir.typefaces, (font) => fontStackValue(font, 'a typeface')),
    icon: iconStyle(ir),
    behavior: behaviorValue(ir),
    motion: { duration: keyed(ir.duration), easing: keyed(ir.easing), spring: keyed(ir.spring, (g) => keyed(g)) },
    elevation: keyed(ir.elevation, (layers) => layers.map((l) => ({ ...l, role: c(l.role) }))),
    components: Object.fromEntries(
      Object.entries(ir.componentTokens).map(([name, tokens]) => [
        c(name),
        { ...Object.fromEntries(tokens.filter((t) => isLive(t) && t.axis === null).map((t) => [c(t.name), componentValue(t)])), ...Object.fromEntries(axesOf(ir, name).map((a) => [a.field, axisValues(name, a)])) },
      ]),
    ),
  };
  const added = addedVocabulary(ir);
  const own = Object.entries(ir.extensions.own);
  const ownUses = new Set(own.flatMap(([, entries]) => entries.map(componentType)).filter((type) => type.startsWith('Tanrei')));
  const accessors = stepAccessors(ir, value);
  const lines = header([`The "${ir.system}" design system as values. Types: ${vocabularyModule === '../vocabulary' ? '../vocabulary.ts' : vocabularyModule}.`, 'Lengths are density-independent pixels, durations are milliseconds.']);
  if (accessors.lines.length) lines.push(`import { seriesStep } from '${runtimeModule}';`);
  lines.push(`import type { ${[...new Set([...ownUses, ...accessors.types, 'TanreiSystem'])].sort().join(', ')} } from '${vocabularyModule}';`, '');
  if (declared.length) {
    lines.push(
      '// Color roles declared by this system\'s palettes (not core vocabulary).',
      `declare module '${vocabularyModule}' {`,
      '  interface TanreiColorRoleRegistry {',
      ...declared.map((r) => `    ${prop(c(r))}: true;`),
      '  }',
      '}',
      '',
    );
  }
  if (added.size) {
    lines.push(
      `// ── Vocabulary "${ir.system}" ADDS to the core ──────────────────────────────────────────────`,
      '// Typed keys for what its layers declare under `vocabulary`, so product code names them with full typing:',
      '// a color role, a step of a series (optional on `TanreiSystem`: only this system is known to have it), a',
      '// value of a component axis. The values themselves are ordinary members of the system object below.',
      `declare module '${vocabularyModule}' {`,
      ...[...added].flatMap(([name, members]) => [`  interface ${name} {`, ...members.map((m) => `    ${m}`), '  }']),
      '}',
      '',
    );
  }
  lines.push(`export const ${c(ir.system)} = ${literal(value)} as const satisfies TanreiSystem;`, '');
  lines.push(...accessors.lines);
  for (const [namespace, entries] of own) lines.push(...ownTokens(namespace, entries));
  return lines.join('\n');
}

/**
 * @param {object} ir
 * @param {{ vocabulary?: boolean }} [options]  pass `vocabulary: false` for every system but the root:
 *   the vocabulary types are emitted once, from the root system.
 * @returns {Record<string, string>} repo-relative path → text
 */
export function emitTs(ir, { vocabulary = true, external = false } = {}) {
  vocabularyModule = external ? `${CONFIG.packages.npmScope}/react-native` : '../vocabulary';
  runtimeModule = external ? `${CONFIG.packages.npmScope}/react-native` : '../../theme/lookup';
  const core = new Set(ir.coreRoles);
  const files = { [`${OUT_DIR}/systems/${ir.system}.ts`]: emitSystem(ir, core) };
  if (vocabulary && !external) files[`${OUT_DIR}/vocabulary.ts`] = emitVocabulary(ir, core);
  return files;
}
