// Swift emitter. Two kinds of output:
//
//   1. Vocabulary types — `TanreiSystem` and its parts. System-independent: every design system
//      has the same shape. Each struct has exactly ONE public memberwise initializer with every
//      label required, so a product's stale generated system file stops compiling when the
//      vocabulary grows. (The one default is `extra: [:]`, below.)
//   2. System values — `extension TanreiSystem { public static let <id> = … }`, one file per system.
//
// Everything a layer may EXTEND has one shape, the shape color roles have: named fields for the core
// values, an `extra` map for what a system added, a lookup by key. That is every `sys` series and every
// component axis (`ir.axes`); axis keys are open `RawRepresentable` types like `TanreiColorRole`.
// `extra` defaults to empty, so the values file of a system without extensions has no trace of any of
// this. A system WITH extensions fills `extra` and gains ONE marked section at the end of its values
// file: typed accessors for what it declared, and its own namespace's tokens as a separate typed object.
//
// Colors of component tokens are `TanreiPaint`s: scheme-independent descriptions that the
// package evaluates at runtime against the current scheme's `TanreiColors`.
import { CONFIG, GENERATED_HEADER, camel, pascal } from '../model.js';
import { TYPE_FAMILIES } from '../pure.js';

const DIR = 'packages/swiftui/Sources/Tanrei/Generated';
const c = (s) => camel([s]);
const num = (n) => `${n}`;
const str = (s) => JSON.stringify(s);

/** The state a token without `dev.tanrei.state` belongs to. Matches the spec's `states` list. */
const REST_STATE = 'enabled';

// ── identifiers ─────────────────────────────────────────────────────────────────────────────────
// A token key is any `[a-z0-9][a-z0-9-]*`; a Swift member name is not. A key that does not make an identifier
// (`3x`, `default`) is prefixed with what it is a value of: `size3x`, `variantDefault`.
const SWIFT_WORDS = new Set(['as', 'break', 'case', 'catch', 'class', 'continue', 'default', 'defer', 'do', 'else', 'enum', 'extension', 'extra', 'fallthrough', 'false', 'for', 'func', 'guard', 'if', 'import', 'in', 'init', 'internal', 'is', 'let', 'nil', 'operator', 'private', 'protocol', 'public', 'repeat', 'rethrows', 'return', 'self', 'static', 'struct', 'subscript', 'super', 'switch', 'throw', 'throws', 'true', 'try', 'typealias', 'var', 'where', 'while']);
const ident = (key, prefix) => (/^[a-z]/.test(key) && !SWIFT_WORDS.has(c(key)) ? c(key) : camel([prefix, key]));
// A component's property of `TanreiSystem` keeps the component's name even when it is a Swift keyword (`switch`): the
// declaration escapes it (`public var \`switch\``), and `system.switch` still reads as a member (SE-0071).
const memberName = (name) => (SWIFT_WORDS.has(c(name)) ? `\`${c(name)}\`` : c(name));

// ── value formatting ────────────────────────────────────────────────────────────────────────────
const colorValue = ({ r, g, b, a }) =>
  `TanreiColorValue(red: ${+(r / 255).toFixed(4)}, green: ${+(g / 255).toFixed(4)}, blue: ${+(b / 255).toFixed(4)}, opacity: ${a})`;
const bezier = (v) => `TanreiCubicBezier(${v.join(', ')})`;
// A font stack as the IR read it: named families, the generic class, whether the platform font leads.
// The CSS spelling (`stack`) is not delivered: nothing on this platform may parse it.
const GENERIC = { 'sans-serif': '.sansSerif', serif: '.serif', monospace: '.monospace' };
function fontStackLiteral(f) {
  // `genericClass` is the IR's reading of `generic` for platforms with three font classes (cursive, fantasy, math and
  // emoji are sans-serif there): one decision for every native emitter.
  const generic = GENERIC[f.genericClass ?? f.generic];
  if (!generic) throw new Error(`swift emitter: font stack [${f.stack.join(', ')}] has the generic class "${f.genericClass ?? f.generic}"; SwiftUI can carry ${Object.keys(GENERIC).join(', ')}`);
  return `TanreiFontStack(families: [${f.families.map(str).join(', ')}], generic: ${generic}, system: ${f.system})`;
}
// A stack that IS one of the system's typefaces is written as that typeface, so the alias stays visible.
let typefaceNames = () => null;
const fontStack = (f) => typefaceNames(f) ?? fontStackLiteral(f);
// The family of a type role is decided once, in the IR (`ir.typescale[role].family`, from `typeFamily` in
// pure.js): the emitter never parses a role's name. `emphasized` text adds `sys.typescale.emphasis.<family>` to the
// role's weight, so the family travels with the style.
function typeFamilyOf(t, key) {
  if (!TYPE_FAMILIES.includes(t.family)) throw new Error(`swift emitter: typescale role "${key}" has no family in the IR (${JSON.stringify(t.family)}); ir.typescale[role].family is one of ${TYPE_FAMILIES.join(', ')}`);
  return t.family;
}
const textStyle = (t, key) =>
  `TanreiTextStyle(font: ${fontStack(t.font)}, size: ${num(t.size)}, weight: ${t.weight}, tracking: ${num(t.tracking)}, lineHeight: ${num(t.lineHeight)}, family: .${typeFamilyOf(t, key)})`;
function typeEmphasisValue(ir, pad) {
  const lacking = TYPE_FAMILIES.filter((f) => typeof ir.typeEmphasis?.[f] !== 'number');
  if (lacking.length) throw new Error(`swift emitter: system "${ir.system}" lacks the emphasis step of ${lacking.join(', ')} (sys.typescale.emphasis.*)`);
  const unknown = Object.keys(ir.typeEmphasis).filter((f) => !TYPE_FAMILIES.includes(f));
  if (unknown.length) throw new Error(`swift emitter: system "${ir.system}" has an emphasis step for ${unknown.join(', ')}, which is not a family (${TYPE_FAMILIES.join(', ')})`);
  return construct('TanreiTypeEmphasis', TYPE_FAMILIES.map((f) => [f, num(ir.typeEmphasis[f])]), pad);
}
function cornerSmoothingValue(ir) {
  const v = ir.cornerSmoothing;
  if (typeof v !== 'number' || !(v >= 0 && v <= 1)) throw new Error(`swift emitter: system "${ir.system}" has corner smoothing ${JSON.stringify(v)}; it is a number in [0, 1]`);
  return num(v);
}
const spring = (s) =>
  `TanreiSpringSpec(damping: ${s.damping}, stiffness: ${s.stiffness}, easing: ${bezier(s.easing)}, durationMs: ${s.duration})`;
const shadowLayers = (layers, pad) =>
  !layers.length ? '[]' : `[\n${layers.map((l) => `${pad}  TanreiShadowLayer(x: ${l.x}, y: ${l.y}, blur: ${l.blur}, spread: ${l.spread}, role: ${role(l.role)}),`).join('\n')}\n${pad}]`;

// Core roles have generated constants; a role from a palette one system declares is an open key.
let coreRoles = new Set();
const role = (r) => (coreRoles.has(r) ? `.${c(r)}` : `TanreiColorRole(rawValue: ${str(r)})`);

function paint(p) {
  switch (p.kind) {
    case 'role':
      return `.role(${role(p.role)})`;
    case 'mix':
      return `.mix(base: ${paint(p.base)}, with: ${paint(p.with)}, amount: ${num(p.amount)})`;
    case 'alpha':
      return `.alpha(of: ${paint(p.of)}, amount: ${num(p.amount)})`;
    case 'none':
      return '.none';
    case 'literal':
      return `.literal(${colorValue(p)})`;
    case 'scheme':
      // Decided per scheme at build time (a palette tone, a contrast pick): evaluated by the scheme it is drawn in.
      return `.scheme(by: [${Object.entries(p.by).map(([scheme, inner]) => `.${c(scheme)}: ${paint(inner)}`).join(', ')}])`;
    default:
      throw new Error(`swift emitter: unknown paint kind ${JSON.stringify(p)}`);
  }
}

// ── struct helpers ──────────────────────────────────────────────────────────────────────────────
const docLines = (doc, pad = '') => (doc ? doc.split('\n').map((l) => `${pad}///${l ? ` ${l}` : ''}`) : []);

/**
 * A vocabulary struct: mutable stored properties (a product may adjust a system at runtime) and the
 * one memberwise initializer. Every label is required — except `extra` of a keyed struct, which
 * defaults to empty so that a system without extensions never mentions it.
 * @param {{ name: string, type: string, doc?: string, default?: string }[]} fields
 * @param {string[]} [members] further members, already indented
 */
function struct(name, fields, doc, members = []) {
  return [
    ...docLines(doc),
    `public struct ${name}: Sendable, Equatable {`,
    ...fields.flatMap((f) => [...docLines(f.doc, '  '), `  public var ${f.name}: ${f.type}`]),
    '',
    '  public init(',
    fields.map((f) => `    ${f.name}: ${f.type}${f.default ? ` = ${f.default}` : ''}`).join(',\n'),
    '  ) {',
    ...fields.map((f) => `    self.${f.name} = ${f.name}`),
    '  }',
    ...(members.length ? ['', ...members] : []),
    '}',
    '',
  ].join('\n');
}

/**
 * `TanreiSystem`: the system-wide groups as stored properties, and each component's tokens behind a copy-on-write box
 * (`TanreiBox`), read and written through a property of the component's name. A copy of a system is then the system
 * groups and one pointer per component, not every component's tokens: SwiftUI copies the theme through the environment,
 * and in a debug build whole copies of a vocabulary this size overflow a secondary thread's stack. The public surface is
 * a plain struct's: the same properties and the one memberwise initializer.
 */
function systemStruct(fields, components, doc) {
  const stored = (f) => `_${f.name.replaceAll('`', '')}`;
  return [
    ...docLines(doc),
    'public struct TanreiSystem: Sendable, Equatable {',
    ...fields.flatMap((f) => [...docLines(f.doc, '  '), `  public var ${f.name}: ${f.type}`]),
    ...components.flatMap((f) => [
      `  public var ${f.name}: ${f.type} {`,
      `    get { ${stored(f)}.value }`,
      `    set { ${stored(f)}.value = newValue }`,
      '  }',
    ]),
    ...components.map((f) => `  private var ${stored(f)}: TanreiBox<${f.type}>`),
    '',
    '  public init(',
    [...fields, ...components].map((f) => `    ${f.name}: ${f.type}`).join(',\n'),
    '  ) {',
    ...fields.map((f) => `    self.${f.name} = ${f.name}`),
    ...components.map((f) => `    self.${stored(f)} = TanreiBox(${f.name})`),
    '  }',
    '}',
    '',
    '/// Copy-on-write storage of one component\'s tokens in `TanreiSystem`: copying it copies a reference.',
    'struct TanreiBox<Value: Sendable & Equatable>: Sendable, Equatable {',
    '  private var storage: [Value]',
    '',
    '  init(_ value: Value) {',
    '    storage = [value]',
    '  }',
    '',
    '  var value: Value {',
    '    get { storage[0] }',
    '    set { storage[0] = newValue }',
    '  }',
    '}',
    '',
  ].join('\n');
}

/**
 * The ONE shape of everything a layer may extend, the shape color roles already have: named
 * fields for the core values, an `extra` map for what a design system added, and a lookup by key.
 * @param {{ name: string, key: string, doc?: string }[]} core `key` as written in Swift (a string literal or `.constant`)
 * @param {{ keyType: string, valueType: string, what: string, fallback?: { name: string, label: string }, more?: { name: string, type: string, doc?: string }[] }} o
 *   with `fallback` the subscript is TOTAL (an axis: unknown → the default value, reported in debug builds);
 *   without, it returns an optional (a series has no default step). `more` are fields of the series that are not
 *   steps (they are not in the lookup): named and required like every core token.
 */
function keyedStruct(name, core, { keyType, valueType, what, fallback, more = [] }, doc) {
  const cases = core.map((f) => `    case ${f.key}: return ${f.name}`);
  const lookup = (signature) => [signature, '    switch key {', ...cases, '    default: return extra[key]', '    }', '  }'];
  const members = fallback
    ? [
        `  /// The tokens of one ${what}, core or added; \`nil\` when this design system does not have it.`,
        ...lookup(`  public func value(for key: ${keyType}) -> ${valueType}? {`),
        '',
        `  /// Total lookup: a ${what} this design system does not have reads the tokens of \`${fallback.label}\`, the`,
        '  /// default, and is reported in debug builds only (`TanreiDiagnostics`).',
        `  public subscript(key: ${keyType}) -> ${valueType} {`,
        '    if let value = value(for: key) { return value }',
        `    TanreiDiagnostics.report("Tanrei: the current design system has no ${what} \\"\\(key.rawValue)\\"; using \\"${fallback.label}\\"")`,
        `    return ${fallback.name}`,
        '  }',
        '',
        `  /// Every ${what} of this design system: the core ones, then what it added.`,
        `  public var keys: [${keyType}] { ${keyType}.core + extra.keys.sorted { $0.rawValue < $1.rawValue } }`,
      ]
    : [`  /// One ${what} by its token key, core or added; \`nil\` when this design system does not have it.`, ...lookup(`  public subscript(key: ${keyType}) -> ${valueType}? {`)];
  return struct(
    name,
    [
      ...core.map((f) => ({ name: f.name, type: valueType, doc: f.doc })),
      // What belongs to the series but is not a step of it (the emphasis steps of the typescale, the corner smoothing of
      // the shape): named, required, outside the keyed lookup.
      ...more,
      { name: 'extra', type: `[${keyType}: ${valueType}]`, default: '[:]', doc: `What a design system added, by key. Empty in a system that adds nothing.` },
    ],
    doc,
    members,
  );
}

/** An open key type, exactly like `TanreiColorRole`: constants for the core values, any other key from a string. */
function keyType(name, values, fallback, doc) {
  return [
    ...docLines(doc),
    `public struct ${name}: RawRepresentable, Hashable, Sendable, CustomStringConvertible {`,
    '  /// The token key of the value, for example `"medium"`.',
    '  public let rawValue: String',
    '  public init(rawValue: String) { self.rawValue = rawValue }',
    '  public var description: String { rawValue }',
    '',
    ...values.map((v) => `  public static let ${v.name} = ${name}(rawValue: ${str(v.key)})`),
    '',
    '  /// The values every design system has, in the order the component declares them.',
    `  public static let core: [${name}] = [${values.map((v) => `.${v.name}`).join(', ')}]`,
    '  /// The default: what a value the current design system does not have falls back to.',
    `  public static let fallback = ${name}.${fallback}`,
    '}',
    '',
  ].join('\n');
}

/** `Type(\n  label: value,\n …)` with nested values indented. */
function construct(type, pairs, pad = '') {
  return `${type}(\n${pairs.map(([k, v]) => `${pad}  ${k}: ${v}`).join(',\n')}\n${pad})`;
}

/** `[\n  key: value,\n …]` */
const dictionary = (pairs, pad = '') => `[\n${pairs.map(([k, v]) => `${pad}  ${k}: ${v},`).join('\n')}\n${pad}]`;

/** Named core pairs, then `extra` — only when there is something in it. `pad` is the pad of the enclosing `construct`. */
const withExtra = (corePairs, extraPairs, pad) => [...corePairs, ...(extraPairs.length ? [['extra', dictionary(extraPairs, `${pad}  `)]] : [])];

// ── component analysis ──────────────────────────────────────────────────────────────────────────
const SWIFT_TYPE = { dimension: 'CGFloat', duration: 'Double', number: 'Double', cubicBezier: 'TanreiCubicBezier', typography: 'TanreiTextStyle', shadow: '[TanreiShadowLayer]', color: 'TanreiPaint' };
const STATE_ORDER = ['hovered', 'focused', 'pressed', 'disabled'];
/**
 * The cases of `TanreiInteraction` (hand-written, packages/swiftui/Sources/Tanrei/Primitives/TanreiInteraction.swift):
 * the closed set of interaction states a component resolves one of and then draws from that state's
 * tokens. The generated `subscript(state:)` lookups switch over it; a state the IR places that is not one of these
 * is refused by name, and a case added there without being added here fails to compile (the switches are exhaustive).
 */
const INTERACTION = [REST_STATE, 'hovered', 'focused', 'pressed', 'disabled'];

/**
 * `subscript(state:)`: the one switch from `TanreiInteraction` to a component's per-state token groups, generated
 * from the states the IR places, so no component writes it by hand. `groups` are the states that HAVE a group; the lookup is optional when a state of `TanreiInteraction` has
 * none (the rest state of per-component values, a state the component does not declare) and total otherwise.
 * @param {string} valueType the type of one group
 * @param {string[]} groups the states with a group, as IR state names (`enabled` for rest)
 * @param {string} what for the doc comment
 */
function stateLookup(component, valueType, groups, what) {
  const unknown = groups.filter((st) => !INTERACTION.includes(st));
  if (unknown.length) throw new Error(`swift emitter: ${component} declares the state(s) ${unknown.join(', ')}, which TanreiInteraction does not have (${INTERACTION.join(', ')}); SwiftUI can only draw the closed set of interaction states`);
  const total = INTERACTION.every((st) => groups.includes(st));
  const missing = INTERACTION.filter((st) => !groups.includes(st));
  return [
    `  /// The ${what} of one interaction state: the state a component resolved with \`TanreiInteraction.resolve\`.`,
    ...(total ? [] : [`  /// \`nil\` for ${missing.map((st) => `\`${st}\``).join(', ')}, which ${component} has no group for.`]),
    `  public subscript(state state: TanreiInteraction) -> ${valueType}${total ? '' : '?'} {`,
    '    switch state {',
    ...INTERACTION.map((st) => `    case .${c(st)}: return ${groups.includes(st) ? c(st) : 'nil'}`),
    '    }',
    '  }',
  ];
}

/**
 * A component's tokens by where the IR places them (`axis` / `key` / `member` / `state`):
 *   plain        no axis, no state                           → properties of Tanrei<C>Tokens
 *   axes         one group of members per axis value          → Tanrei<C>Tokens.<axis>s[key].<member>
 *                (per state when the axis has state tokens)     Tanrei<C>Tokens.<axis>s[key].<state>.<member>
 *   perComponent no axis, one value per state                 → Tanrei<C>Tokens.<state>.<part>
 */
function componentShape(component, ir) {
  const C = pascal([component]);
  const tokens = ir.componentTokens[component];
  // Canonical order: the interaction states by precedence, then disabled; anything else after.
  const states = [...new Set(tokens.filter((t) => t.state !== null).map((t) => t.state))].sort((a, b) => (STATE_ORDER.indexOf(a) + 1 || 99) - (STATE_ORDER.indexOf(b) + 1 || 99) || (a < b ? -1 : 1));
  const axes = Object.entries(ir.axes[component] ?? {}).map(([axis, def]) => {
    const A = pascal([axis]);
    const own = tokens.filter((t) => t.axis === axis);
    return {
      axis,
      field: `${c(axis)}s`,
      keyType: `Tanrei${C}${A}`,
      valueType: `Tanrei${C}${A}Tokens`,
      stateType: `Tanrei${C}${A}StateTokens`,
      holderType: `Tanrei${C}${A}s`,
      default: def.default,
      values: def.values.map((v) => ({ ...v, name: ident(v.key, axis) })),
      members: def.members,
      stateful: own.some((t) => t.state !== null),
      get(key, member, state) {
        const t = own.find((x) => x.key === key && x.member === member && x.state === state);
        if (!t) throw new Error(`swift emitter: ${component} has no token for ${axis} "${key}", member "${member}"${state ? `, state "${state}"` : ''}`);
        return t;
      },
    };
  });
  const free = tokens.filter((t) => t.axis === null);
  // The IR gives a per-component state token no `member`; its part is the name after the state.
  const perComponent = free.filter((t) => t.state !== null).map((t) => ({ ...t, part: t.name.slice(t.state.length + 1) }));
  const componentParts = new Map(perComponent.map((t) => [t.part, t.type]));
  return { C, states, axes, plain: free.filter((t) => t.state === null), perComponent, componentParts };
}

function componentTypes(component, ir) {
  const s = componentShape(component, ir);
  const out = [];
  for (const a of s.axes) {
    const members = a.members.map((m) => ({ name: c(m.name), type: SWIFT_TYPE[m.type] }));
    out.push(keyType(a.keyType, a.values.filter((v) => v.core), ident(a.default, a.axis), `A value of ${component}'s \`${a.axis}\` axis.\n\nThe set is open: the constants are the values every design system has; a value one system\nadds is \`${a.keyType}(rawValue: "…")\`, or the typed constant generated with that system.`));
    if (a.stateful) {
      out.push(struct(a.stateType, members, `How one ${a.axis} of ${component} is drawn in one state.`));
      const groups = [REST_STATE, ...s.states];
      out.push(
        struct(
          a.valueType,
          groups.map((st) => ({ name: c(st), type: a.stateType })),
          `One ${a.axis} of ${component}: a complete set of values per state. A component draws a state from that\nstate's tokens and never computes how a state looks. Read one with \`[state: …]\`.`,
          stateLookup(component, a.stateType, groups, `tokens of this ${a.axis}`),
        ),
      );
    } else {
      out.push(struct(a.valueType, members, `Everything of ${component} that depends on its ${a.axis}.`));
    }
    out.push(
      keyedStruct(
        a.holderType,
        a.values.filter((v) => v.core).map((v) => ({ name: v.name, key: `.${v.name}` })),
        { keyType: a.keyType, valueType: a.valueType, what: `${component} ${a.axis}`, fallback: { name: ident(a.default, a.axis), label: a.default } },
        `The ${a.axis}s of ${component}: named fields for the core values, \`extra\` for what a design system added.\nRead one with \`${a.field}[key]\`.`,
      ),
    );
  }
  if (s.componentParts.size) {
    out.push(struct(`Tanrei${s.C}StateTokens`, [...s.componentParts].map(([part, type]) => ({ name: c(part), type: SWIFT_TYPE[type] })), `Values of ${component} that depend on the state but not on the variant.`));
  }
  out.push(
    struct(
      `Tanrei${s.C}Tokens`,
      [
        ...s.plain.map((t) => ({ name: c(t.name), type: SWIFT_TYPE[t.type] })),
        ...s.axes.map((a) => ({ name: a.field, type: a.holderType })),
        ...(s.componentParts.size ? s.states.map((st) => ({ name: c(st), type: `Tanrei${s.C}StateTokens`, doc: `Values of the ${st} state shared by every variant.` })) : []),
      ],
      `Component tokens of ${component} (comp.${component}).`,
      // Per-component state values: the rest state never has a group (no resting opacity).
      s.componentParts.size ? stateLookup(component, `Tanrei${s.C}StateTokens`, s.states, 'values shared by every variant') : [],
    ),
  );
  return out.join('\n');
}

/** The Swift expression of one component-shaped token (also a layer's own tokens). */
function tokenValue(t, names) {
  if (t.type === 'color') return paint(t.paint);
  if (t.type === 'typography') return names.typescale(t.typescale);
  if (t.type === 'shadow') return names.elevation(t.elevation);
  if (t.type === 'cubicBezier') return bezier(t.value);
  return num(t.value);
}

function componentValue(component, ir, pad, names) {
  const s = componentShape(component, ir);
  const value = (t) => tokenValue(t, names);
  const p1 = `${pad}  `;
  const pairs = s.plain.map((t) => [c(t.name), value(t)]);
  for (const a of s.axes) {
    const one = (key, at) => {
      const group = (state, p) => construct(a.stateful ? a.stateType : a.valueType, a.members.map((m) => [c(m.name), value(a.get(key, m.name, state))]), p);
      if (!a.stateful) return group(null, at);
      return construct(a.valueType, [REST_STATE, ...s.states].map((st) => [c(st), group(st === REST_STATE ? null : st, `${at}  `)]), at);
    };
    const core = a.values.filter((v) => v.core).map((v) => [v.name, one(v.key, `${p1}  `)]);
    const extra = a.values.filter((v) => !v.core).map((v) => [`${a.keyType}(rawValue: ${str(v.key)})`, one(v.key, `${p1}    `)]);
    pairs.push([a.field, construct(a.holderType, withExtra(core, extra, p1), p1)]);
  }
  if (s.componentParts.size) {
    for (const st of s.states) {
      pairs.push([c(st), construct(`Tanrei${s.C}StateTokens`, [...s.componentParts.keys()].map((part) => [c(part), value(s.perComponent.find((t) => t.state === st && t.part === part))]), p1)]);
    }
  }
  return construct(`Tanrei${s.C}Tokens`, pairs, pad);
}

// ── sys groups ──────────────────────────────────────────────────────────────────────────────────
// Springs are a series of series: scheme → name → spec. Both levels have the one shape of everything a layer
// may extend (named core fields, `extra`, a keyed lookup). The IR lists what a layer added as one entry per
// spring SET and scheme: `ir.extensions.series.spring = [{ key, scheme, id, declaredBy, value }]`.
const SPRING_FIELDS = ['damping', 'stiffness', 'easing', 'duration'];
function springsOf(ir) {
  const added = ir.extensions.series.spring ?? [];
  const declaredBy = (scheme, name) => added.find((e) => e.scheme === scheme && e.key === name)?.declaredBy;
  const schemes = Object.entries(ir.spring).map(([scheme, set]) => {
    const springs = Object.entries(set).map(([name, value]) => {
      const lacking = SPRING_FIELDS.filter((f) => value[f] === undefined);
      if (lacking.length) throw new Error(`swift emitter: spring "${scheme}.${name}" of system "${ir.system}" lacks ${lacking.join(', ')}`);
      const by = declaredBy(scheme, name);
      return { scheme, name, value, added: Boolean(by), declaredBy: by, constant: camel([ir.system, 'spring', scheme, name]) };
    });
    // A scheme a layer added has nothing but added springs (a core scheme always has the core ones).
    const isAdded = springs.length > 0 && springs.every((x) => x.added);
    return { scheme, springs, added: isAdded, declaredBy: isAdded ? springs[0].declaredBy : undefined, constant: camel([ir.system, 'springs', scheme]) };
  });
  const coreNames = [...new Set(schemes.filter((x) => !x.added).flatMap((x) => x.springs.filter((y) => !y.added).map((y) => y.name)))];
  for (const x of schemes) {
    const lacking = coreNames.filter((n) => !x.springs.some((y) => y.name === n));
    if (lacking.length) throw new Error(`swift emitter: spring scheme "${x.scheme}" of system "${ir.system}" lacks the core springs ${lacking.join(', ')}; a scheme values every core spring (it may add more)`);
  }
  return { schemes, coreNames };
}

/**
 * Every series of `sys` a layer may add a step to. `fields` are the core steps (named in the vocabulary
 * struct), `added` the steps this system added (they go into `extra`).
 */
function seriesOf(ir) {
  const known = ['typescale', 'shape', 'space', 'state', 'duration', 'easing', 'spring', 'elevation', ...Object.keys(ir.measure)];
  const unknown = Object.keys(ir.extensions.series).filter((g) => !known.includes(g));
  if (unknown.length) throw new Error(`swift emitter: system "${ir.system}" adds steps to ${unknown.map((g) => `"${g}"`).join(', ')}, which SwiftUI cannot carry yet (known series: ${known.join(', ')})`);
  const declared = (group, key) => (ir.extensions.series[group] ?? []).find((e) => e.key === key);
  const series = (id, structName, valueType, format, entries, doc, more = []) => {
    const all = entries.map(([group, key, value]) => {
      const added = declared(group, key);
      // The key in Swift: the series' own key; measure flattens several groups into one struct.
      const swiftKey = id === 'measure' ? `${group}-${key}` : key;
      return { group, key: swiftKey, name: ident(swiftKey, id), value, added: Boolean(added), declaredBy: added?.declaredBy };
    });
    return { id, struct: structName, valueType, format, doc, more, fields: all.filter((e) => !e.added), added: all.filter((e) => e.added) };
  };
  const of = (group, values) => Object.entries(values).map(([k, v]) => [group, k, v]);
  return {
    typescale: series('typescale', 'TanreiTypescale', 'TanreiTextStyle', textStyle, of('typescale', ir.typescale), 'The type roles: `display`, `heading1`…`heading6` (h1…h6), `bodyLarge` / `body` / `bodySmall` (lead, p, small),\n`label` / `labelSmall` / `caption` (text in and next to controls), `code` / `codeSmall`, `eyebrow`. `emphasis` holds the\nweight step `emphasized` text adds per family.', [
      { name: 'emphasis', type: 'TanreiTypeEmphasis', doc: '`sys.typescale.emphasis.*`: the weight `emphasized` text adds, per family.' },
    ]),
    shape: series('shape', 'TanreiShape', 'CGFloat', num, of('shape', ir.shape), 'Corner radii, in points, and how their curve eases (`cornerSmoothing`).', [
      { name: 'cornerSmoothing', type: 'Double', doc: '`sys.shape.corner-smoothing`: 0–1 with Figma\'s meaning — 0 a quarter circle, 0.6 the iOS continuous corner,\n1 the most eased. SwiftUI has only the OS\'s curve: `roundedCornerStyle` draws `.circular` at 0 and `.continuous` above.' },
    ]),
    space: series('space', 'TanreiSpace', 'CGFloat', num, of('space', ir.space)),
    state: series('state', 'TanreiState', 'Double', num, of('state', ir.state), 'State opacities. How a component state looks is decided by its own per-state tokens.'),
    measure: series('measure', 'TanreiMeasure', 'CGFloat', num, Object.entries(ir.measure).flatMap(([group, values]) => of(group, values)), 'Borders, the focus indicator, minimum targets, icon sizes and the window widths at which a layout changes, in points.'),
    duration: series('duration', 'TanreiDuration', 'Double', num, of('duration', ir.duration), 'Milliseconds.'),
    easing: series('easing', 'TanreiEasing', 'TanreiCubicBezier', bezier, of('easing', ir.easing)),
    elevation: series('elevation', 'TanreiElevation', '[TanreiShadowLayer]', (layers) => shadowLayers(layers, '  '), of('elevation', ir.elevation), 'A level may start with a ring — a layer with no offset, no blur and a positive spread: render that one as a border, the rest as shadows. Not every system has one.'),
  };
}

// ── icon style ──────────────────────────────────────────────────────────────────────────────────
// How icons are drawn (`ref.typeface.icon`, `sys.icon.weight`, `sys.icon.fill.*`): core tokens, so every
// label is required like everywhere else. Icon SIZES are steps of `measure`. Closed: a layer revalues it.
const ICON_FIELDS = [
  { key: 'weight', name: 'weight', type: 'CGFloat', format: num, doc: 'The `wght` axis every icon is drawn with.' },
  { key: 'mark-weight', name: 'markWeight', type: 'CGFloat', format: num, doc: 'The `wght` axis a control draws its own mark with (a checkbox\'s check, the glyph on a switch\'s handle).' },
  { key: 'fill-unselected', name: 'fillUnselected', type: 'Double', format: num, doc: 'The `FILL` axis of an icon for something that is NOT selected.' },
  { key: 'fill-selected', name: 'fillSelected', type: 'Double', format: num, doc: 'The `FILL` axis of the same icon in its selected state.' },
  { key: 'optical-size-min', name: 'opticalSizeMin', type: 'CGFloat', format: num, doc: 'The smallest `opsz` the icon font draws; a box smaller than this is drawn at it.' },
  { key: 'optical-size-max', name: 'opticalSizeMax', type: 'CGFloat', format: num, doc: 'The largest `opsz` the icon font draws; a box larger than this is drawn at it.' },
];

const ICON_STATES = ['unselected', 'selected'];

function iconValue(ir, pad) {
  const lacking = [...ICON_FIELDS.filter((f) => ir.icon?.[f.key] === undefined).map((f) => f.key), ...ICON_STATES.filter((st) => !ir.iconFamilies?.[st]).map((st) => `family.${st}`)];
  if (lacking.length) throw new Error(`swift emitter: system "${ir.system}" lacks icon style tokens: ${lacking.join(', ')}`);
  // `ir.icon.family` repeats iconFamilies.unselected for an emitter that reads one icon family: not a member of its own.
  const unknown = Object.keys(ir.icon).filter((k) => k !== 'family' && !ICON_FIELDS.some((f) => f.key === k));
  if (unknown.length) throw new Error(`swift emitter: sys.icon has number tokens this emitter does not place: ${unknown.join(', ')}`);
  const families = construct('TanreiIconFamilies', ICON_STATES.map((st) => [st, fontStack(ir.iconFamilies[st])]), `${pad}  `);
  return construct('TanreiIconStyle', [['families', families], ...ICON_FIELDS.map((f) => [f.name, f.format(ir.icon[f.key])])], pad);
}

// ── typefaces ────────────────────────────────────────────────────────────────────────
// The named typefaces every system has (`ref.typeface.*`). Closed: a layer re-points a stack, it does not add one.
const TYPEFACES = ['brand', 'plain', 'mono', 'icon'];
function typefacesValue(ir, pad) {
  const lacking = TYPEFACES.filter((k) => !ir.typefaces?.[k]);
  if (lacking.length) throw new Error(`swift emitter: system "${ir.system}" lacks typefaces: ${lacking.join(', ')}`);
  return construct('TanreiTypefaces', TYPEFACES.map((k) => [k, fontStackLiteral(ir.typefaces[k])]), pad);
}

// ── choices of kind ──────────────────────────────────────────────────────────────────
// `sys.behavior.*`: a closed list of names per choice. Platforms get an enum and never the index.
const behaviorType = (key) => `Tanrei${pascal([key])}`;
const BEHAVIOR_DOC = {
  'pressed-feedback': 'How a control answers a press (BTN-9). The pressed tokens still decide colors and opacity.',
  'focus-style': 'How keyboard focus is drawn from the two focus colors and the focus measures (BTN-10).',
};
// Sorted: the vocabulary and every values file must list the choices in one order, whatever order a layer's tokens come in.
const behaviorEntries = (ir) => Object.entries(ir.behavior).sort(([a], [b]) => (a < b ? -1 : 1));
function behaviorTypes(ir) {
  const out = [];
  for (const [key, choice] of behaviorEntries(ir)) {
    out.push(
      ...docLines(`${BEHAVIOR_DOC[key] ?? `The choice \`${choice.id}\`.`}\nA design system chooses among these; it cannot add one. The first is the default.`),
      `public enum ${behaviorType(key)}: String, Sendable, Hashable, CaseIterable {`,
      ...choice.values.map((v) => `  case ${ident(v, key)}${ident(v, key) === v ? '' : ` = ${str(v)}`}`),
      '}',
      '',
    );
  }
  out.push(struct('TanreiBehavior', behaviorEntries(ir).map(([key, choice]) => ({ name: c(key), type: behaviorType(key), doc: `\`${choice.id}\`` })), 'Choices of kind: what a design system does, where the other tokens say how much.'));
  return out.join('\n');
}
const behaviorValue = (ir, pad) => construct('TanreiBehavior', behaviorEntries(ir).map(([key, choice]) => [c(key), `.${ident(choice.value, key)}`]), pad);

/** The file-scope constant that holds the value of a step this system added (`acmeSpaceSpace1200`). */
const addedConstant = (ir, s, e) => camel([ir.system, s.id, e.key]);

const seriesStruct = (s) => keyedStruct(s.struct, s.fields.map((e) => ({ name: e.name, key: str(e.key) })), { keyType: 'String', valueType: s.valueType, what: `${s.id} step`, more: s.more }, s.doc);
/** `more` values the series carries besides its steps, in the order `seriesOf` declares them. */
const seriesMore = (ir, s, pad) => (s.id === 'typescale' ? [['emphasis', typeEmphasisValue(ir, `${pad}  `)]] : s.id === 'shape' ? [['cornerSmoothing', cornerSmoothingValue(ir)]] : []);
const seriesValue = (ir, s, pad) => construct(s.struct, withExtra([...s.fields.map((e) => [e.name, s.format(e.value, e.key)]), ...seriesMore(ir, s, pad)], s.added.map((e) => [str(e.key), addedConstant(ir, s, e)]), pad), pad);

const SUPPORT = `
/// The name of a color role. Components bind to roles, never to literal colors.
///
/// The set is open: every design system has the core roles, and a system may declare further
/// palettes (an M3-like preset has \`tertiary\`, a product may have \`correct\`). The constants
/// below are the roles of the default system; a role another system declares is
/// \`TanreiColorRole(rawValue: "tertiary")\` (an open key: no constant is generated for it).
public struct TanreiColorRole: RawRepresentable, Hashable, Sendable, CustomStringConvertible {
  /// The token name of the role, for example \`"on-primary"\`.
  public let rawValue: String
  public init(rawValue: String) { self.rawValue = rawValue }
  public var description: String { rawValue }
}

/// One sRGB color, components 0–1, alpha not premultiplied.
public struct TanreiColorValue: Sendable, Hashable {
  public var red: Double
  public var green: Double
  public var blue: Double
  public var opacity: Double

  public init(red: Double, green: Double, blue: Double, opacity: Double) {
    self.red = red
    self.green = green
    self.blue = blue
    self.opacity = opacity
  }
}

/// How a component color is described without resolving the scheme. Closed: a design system chooses
/// among these, it cannot add a kind. Evaluate with \`resolve(in:)\` against the current \`TanreiColors\`.
public indirect enum TanreiPaint: Sendable, Equatable {
  /// A color role of the current scheme.
  case role(TanreiColorRole)
  /// Premultiplied interpolation, identical to CSS \`color-mix(in srgb, base, with amount)\`.
  case mix(base: TanreiPaint, with: TanreiPaint, amount: Double)
  /// \`of\` with its alpha multiplied by \`amount\`.
  case alpha(of: TanreiPaint, amount: Double)
  /// Nothing is drawn.
  case none
  /// A fixed color, the same in every scheme.
  case literal(TanreiColorValue)
  /// A paint per scheme, decided at build time where the six schemes disagree (a palette tone, a contrast
  /// pick). Evaluated by the scheme of the \`TanreiColors\` it is resolved in.
  case scheme(by: [TanreiScheme: TanreiPaint])
}

/// Every color role of one scheme (theme × contrast). Look roles up with \`colors[role]\`.
public struct TanreiColors: Sendable, Equatable {
  /// Which of the six schemes this is: what a \`TanreiPaint.scheme\` is evaluated by.
  public var scheme: TanreiScheme
  public var values: [TanreiColorRole: TanreiColorValue]

  public init(scheme: TanreiScheme, values: [TanreiColorRole: TanreiColorValue]) {
    self.scheme = scheme
    self.values = values
  }
}

/// The generic class of a font stack: what the platform falls back to when no named family is available.
public enum TanreiFontGeneric: String, Sendable, Hashable, CaseIterable {
  case sansSerif = "sans-serif"
  case serif
  case monospace
}

/// A font stack, read once for every platform. Tanrei never bundles a font: a product installs or
/// registers the \`families\` it wants drawn.
public struct TanreiFontStack: Sendable, Equatable {
  /// The named families, in order of preference. The first one registered with the process is used.
  public var families: [String]
  /// The platform font to fall back to when none of \`families\` is available.
  public var generic: TanreiFontGeneric
  /// The stack asks for the platform's own font BEFORE any named family: then \`families\` are not consulted.
  public var system: Bool

  public init(families: [String], generic: TanreiFontGeneric, system: Bool) {
    self.families = families
    self.generic = generic
    self.system = system
  }
}

/// The families of the type scale. A role's family is decided by the token build (the first segment of its
/// name when it names a family; \`caption\`, \`code\`, \`code-small\`, \`eyebrow\` and any other role belong to \`label\`).
/// Closed: a design system re-values the roles and may add one to a family; it cannot add a family.
public enum TanreiTypeFamily: String, Sendable, Hashable, CaseIterable {
  case display
  case heading
  case body
  case label
}

/// The weight \`emphasized\` text adds to a role's weight, per family (\`sys.typescale.emphasis.*\`).
/// Emphasis is a weight step, not a role: size, tracking and line height do not change.
public struct TanreiTypeEmphasis: Sendable, Equatable {
  public var display: CGFloat
  public var heading: CGFloat
  public var body: CGFloat
  public var label: CGFloat

  public init(display: CGFloat, heading: CGFloat, body: CGFloat, label: CGFloat) {
    self.display = display
    self.heading = heading
    self.body = body
    self.label = label
  }

  /// The step of one family.
  public subscript(family: TanreiTypeFamily) -> CGFloat {
    switch family {
    case .display: return display
    case .heading: return heading
    case .body: return body
    case .label: return label
    }
  }
}

public struct TanreiTextStyle: Sendable, Equatable {
  public var font: TanreiFontStack
  public var size: CGFloat
  /// Numeric weight on the 1–1000 axis (variable fonts may use in-between values such as 450).
  public var weight: CGFloat
  public var tracking: CGFloat
  public var lineHeight: CGFloat
  /// The family the role belongs to: which step of \`TanreiTypeEmphasis\` \`emphasized\` text adds to \`weight\`.
  public var family: TanreiTypeFamily

  public init(font: TanreiFontStack, size: CGFloat, weight: CGFloat, tracking: CGFloat, lineHeight: CGFloat, family: TanreiTypeFamily) {
    self.font = font
    self.size = size
    self.weight = weight
    self.tracking = tracking
    self.lineHeight = lineHeight
    self.family = family
  }
}

public struct TanreiCubicBezier: Sendable, Equatable {
  public var x1: Double, y1: Double, x2: Double, y2: Double
  public init(_ x1: Double, _ y1: Double, _ x2: Double, _ y2: Double) {
    self.x1 = x1; self.y1 = y1; self.x2 = x2; self.y2 = y2
  }
}

public struct TanreiSpringSpec: Sendable, Equatable {
  /// Damping ratio.
  public var damping: Double
  public var stiffness: Double
  /// Fallback for contexts without spring animation.
  public var easing: TanreiCubicBezier
  public var durationMs: Double

  public init(damping: Double, stiffness: Double, easing: TanreiCubicBezier, durationMs: Double) {
    self.damping = damping
    self.stiffness = stiffness
    self.easing = easing
    self.durationMs = durationMs
  }
}

/// One layer of an elevation level, with the meaning of a CSS \`box-shadow\`: the container's silhouette grown
/// by \`spread\`, moved by \`x\` / \`y\` and blurred. \`blur\` is the CSS blur radius — a Gaussian with
/// σ = blur / 2. \`TanreiShadowBlur\` converts it to what SwiftUI draws with; nothing else may.
public struct TanreiShadowLayer: Sendable, Equatable {
  public var x: CGFloat, y: CGFloat, blur: CGFloat, spread: CGFloat
  public var role: TanreiColorRole

  public init(x: CGFloat, y: CGFloat, blur: CGFloat, spread: CGFloat, role: TanreiColorRole) {
    self.x = x; self.y = y; self.blur = blur; self.spread = spread
    self.role = role
  }
}
`;

let externalModule = false;
const header = (note) => [...GENERATED_HEADER.map((l) => `// ${l}`), ...note.map((l) => `// ${l}`), '// swiftlint:disable all', '', 'import SwiftUI', ...(externalModule ? [`import ${CONFIG.packages.swiftPackage}`] : []), ''];

function emitVocabulary(ir) {
  const out = header(['Vocabulary types: the shape every design system has. System values live in TanreiSystem+<Id>.swift.']);
  out.push(SUPPORT.trimStart());

  out.push(
    'extension TanreiColorRole {',
    ...ir.coreRoles.map((r) => `  public static let ${c(r)} = TanreiColorRole(rawValue: ${str(r)})`),
    '}',
    '',
  );

  const series = seriesOf(ir);
  out.push(
    '/// The six schemes of every design system: theme (light / dark) × contrast (standard / medium / high).',
    'public enum TanreiScheme: String, Sendable, Hashable, CaseIterable {',
    ...ir.schemes.map((sch) => `  case ${c(sch)}${c(sch) === sch ? '' : ` = ${str(sch)}`}`),
    '}',
    '',
  );
  out.push(struct('TanreiColorSchemes', ir.schemes.map((s) => ({ name: c(s), type: 'TanreiColors' })), 'The six schemes of a system: light / dark × standard / medium / high contrast.'));
  out.push(seriesStruct(series.typescale), seriesStruct(series.shape), seriesStruct(series.space), seriesStruct(series.state), seriesStruct(series.measure), seriesStruct(series.duration), seriesStruct(series.easing));
  const springs = springsOf(ir);
  out.push(keyedStruct('TanreiSpringSet', springs.coreNames.map((k) => ({ name: ident(k, 'spring'), key: str(k) })), { keyType: 'String', valueType: 'TanreiSpringSpec', what: 'spring' }, 'The springs of one scheme.'));
  out.push(keyedStruct('TanreiSprings', springs.schemes.filter((x) => !x.added).map((x) => ({ name: ident(x.scheme, 'springs'), key: str(x.scheme) })), { keyType: 'String', valueType: 'TanreiSpringSet', what: 'spring scheme' }, 'Spring schemes: how lively motion is.'));
  out.push(struct('TanreiMotionTokens', [{ name: 'duration', type: 'TanreiDuration' }, { name: 'easing', type: 'TanreiEasing' }, { name: 'spring', type: 'TanreiSprings' }]));
  out.push(seriesStruct(series.elevation));
  out.push(struct('TanreiIconFamilies', ICON_STATES.map((st) => ({ name: st, type: 'TanreiFontStack', doc: `The icon font of something that is ${st === 'selected' ? '' : 'NOT '}selected.` })), 'An icon set is a family per selection state: a variable font names one family twice and tells the\nstates apart with `FILL`; a static set names two families.'));
  out.push(struct('TanreiIconStyle', [{ name: 'families', type: 'TanreiIconFamilies', doc: 'The icon font of each selection state. Tanrei does not bundle it.' }, ...ICON_FIELDS.map(({ name, type, doc }) => ({ name, type, doc }))], 'How icons are drawn: the icon font of each selection state and the axis values a variable font is drawn with.\nThe sizes are `TanreiMeasure.icon…`. Hand-written helpers on this type (`drawing(size:selected:)`) turn it into\na family, variation axes and a `Font`.'));
  out.push(struct('TanreiTypefaces', TYPEFACES.map((k) => ({ name: k, type: 'TanreiFontStack' })), 'The named typefaces of a design system (`ref.typeface.*`). Text styles already carry their stack; this is for\na product that needs the face itself, and it lists what a product must install.'));
  out.push(behaviorTypes(ir));

  for (const name of Object.keys(ir.componentTokens)) out.push(componentTypes(name, ir));

  out.push(
    systemStruct(
      [
        { name: 'id', type: 'String', doc: 'The id of the system layer this value was generated from.' },
        { name: 'intents', type: '[TanreiColorRole]', doc: 'The roles that come as a set of four (`x`, `on-x`, `x-container`, `on-x-container`), core or palette-declared.' },
        { name: 'colors', type: 'TanreiColorSchemes' },
        { name: 'typescale', type: 'TanreiTypescale' },
        { name: 'shape', type: 'TanreiShape' },
        { name: 'space', type: 'TanreiSpace' },
        { name: 'state', type: 'TanreiState' },
        { name: 'measure', type: 'TanreiMeasure' },
        { name: 'typefaces', type: 'TanreiTypefaces' },
        { name: 'icon', type: 'TanreiIconStyle' },
        { name: 'behavior', type: 'TanreiBehavior' },
        { name: 'motion', type: 'TanreiMotionTokens' },
        { name: 'elevation', type: 'TanreiElevation' },
      ],
      Object.keys(ir.componentTokens).map((name) => ({ name: memberName(name), type: `Tanrei${pascal([name])}Tokens` })),
      'One design system: every token a component or primitive reads. `TanreiTheme` carries the instance;\nnothing in the package reads a token any other way.',
    ),
  );
  return out.join('\n');
}

// ── what a system ADDS ───────────────────────────────────────────────────────────────
// Declarations (typed accessors, the types of a layer's own tokens) are written by the system that DECLARED
// the extension, so two systems of one product never declare the same member twice; values are written by
// every system that has them.

/** Typed accessors for what THIS system declared: series steps, color roles, axis values. */
function accessors(ir, series) {
  const mine = (e) => e.declaredBy === ir.system;
  const out = [];
  for (const s of Object.values(series)) {
    const steps = s.added.filter(mine);
    if (!steps.length) continue;
    out.push(`extension ${s.struct} {`);
    for (const e of steps) {
      out.push(
        `  /// The \`${e.key}\` step "${ir.system}" adds to ${s.id}. Read from a design system that does not have it, this is`,
        `  /// the value "${ir.system}" gives it (reported in debug builds).`,
        `  public var ${e.name}: ${s.valueType} {`,
        `    if let value = self[${str(e.key)}] { return value }`,
        `    TanreiDiagnostics.report("Tanrei: the current design system has no ${s.id} step \\"${e.key}\\"; using the value of \\"${ir.system}\\"")`,
        `    return ${addedConstant(ir, s, e)}`,
        '  }',
      );
    }
    out.push('}', '');
  }
  const springs = springsOf(ir);
  const addedSprings = springs.schemes.filter((x) => !x.added).flatMap((x) => x.springs.filter((y) => y.added && mine(y)));
  const springNames = [...new Set(addedSprings.map((y) => y.name))];
  if (springNames.length) {
    out.push('extension TanreiSpringSet {');
    for (const name of springNames) {
      const first = addedSprings.find((y) => y.name === name);
      out.push(
        `  /// The \`${name}\` spring "${ir.system}" adds. Read from a scheme or a design system that does not have it, this is`,
        `  /// the value "${ir.system}" gives it in \`${first.scheme}\` (reported in debug builds).`,
        `  public var ${ident(name, 'spring')}: TanreiSpringSpec {`,
        `    if let value = self[${str(name)}] { return value }`,
        `    TanreiDiagnostics.report("Tanrei: the current design system has no spring \\"${name}\\"; using the value of \\"${ir.system}\\"")`,
        `    return ${first.constant}`,
        '  }',
      );
    }
    out.push('}', '');
  }
  const addedSchemes = springs.schemes.filter((x) => x.added && mine(x));
  if (addedSchemes.length) {
    out.push('extension TanreiSprings {');
    for (const x of addedSchemes) {
      out.push(
        `  /// The \`${x.scheme}\` spring scheme "${ir.system}" adds. Read from a design system that does not have it, this is`,
        `  /// the value "${ir.system}" gives it (reported in debug builds).`,
        `  public var ${ident(x.scheme, 'springs')}: TanreiSpringSet {`,
        `    if let value = self[${str(x.scheme)}] { return value }`,
        `    TanreiDiagnostics.report("Tanrei: the current design system has no spring scheme \\"${x.scheme}\\"; using the value of \\"${ir.system}\\"")`,
        `    return ${x.constant}`,
        '  }',
      );
    }
    out.push('}', '');
  }
  const roles = ir.extensions.roles.filter(mine);
  if (roles.length) {
    out.push('extension TanreiColorRole {');
    for (const r of roles) out.push(`  /// The \`${r.key}\` role "${ir.system}" adds${r.onRole ? `; content on it uses \`${r.onRole}\`` : ''}.`, `  public static let ${ident(r.key, 'role')} = TanreiColorRole(rawValue: ${str(r.key)})`);
    out.push('}', '');
  }
  for (const component of Object.keys(ir.componentTokens)) {
    for (const a of componentShape(component, ir).axes) {
      const values = a.values.filter((v) => !v.core && mine(v));
      if (!values.length) continue;
      out.push(`extension ${a.keyType} {`);
      for (const v of values) out.push(`  /// The \`${v.key}\` ${a.axis} "${ir.system}" adds to ${component}.`, `  public static let ${v.name} = ${a.keyType}(rawValue: ${str(v.key)})`);
      out.push('}', '');
    }
  }
  return out;
}

/**
 * A layer's own tokens (`acme.comp.rating.star.size`): NOT part of TanreiSystem — a separate typed object
 * named after the namespace, `AcmeTokens`, nested by the token path (`comp` is dropped: `.rating.star.size`).
 * Colors are paints, so they follow the scheme; text styles and elevations are the system's.
 */
function ownTokens(ir, namespace, tokens, names) {
  const root = { children: new Map() };
  for (const t of tokens) {
    const path = t.id.split('.').slice(1);
    if (path[0] === 'comp' && path.length > 1) path.shift();
    let node = root;
    path.forEach((segment, i) => {
      const last = i === path.length - 1;
      const existing = node.children.get(segment);
      if (existing && (last || existing.token)) throw new Error(`swift emitter: own tokens of "${namespace}" collide at ${t.id}`);
      if (!existing) node.children.set(segment, last ? { token: t } : { children: new Map() });
      node = node.children.get(segment);
    });
  }
  const typeOf = (path) => `${pascal([namespace, ...path])}Tokens`;
  const types = [];
  const fieldName = (segment, path) => ident(segment, path.at(-1) ?? namespace);
  const declare = (node, path) => {
    const fields = [...node.children].map(([segment, child]) => (child.token ? { name: fieldName(segment, path), type: SWIFT_TYPE[child.token.type], doc: `\`${child.token.id}\`` } : { name: fieldName(segment, path), type: typeOf([...path, segment]) }));
    for (const [segment, child] of node.children) if (!child.token) declare(child, [...path, segment]);
    types.push(struct(typeOf(path), fields, path.length ? undefined : `The tokens "${namespace}" declares in its own namespace. They are not part of \`TanreiSystem\`.\nDraw a color with \`colors[paint]\` from \`@TanreiPalette\`, so it follows the scheme.`));
  };
  const valueOf = (node, path, pad) => construct(typeOf(path), [...node.children].map(([segment, child]) => [fieldName(segment, path), child.token ? tokenValue(child.token, names) : valueOf(child, [...path, segment], `${pad}  `)]), pad);
  const out = [];
  if (namespace === ir.system) {
    declare(root, []);
    out.push(...types.reverse());
  }
  out.push(`extension ${typeOf([])} {`, `  /// The values of "${namespace}"'s own tokens in the "${ir.system}" design system.`, `  public static let ${ident(ir.system, 'system')} = ${valueOf(root, [], '  ')}`, '}', '');
  return out;
}

function emitSystem(ir) {
  const id = ir.system;
  const out = header([`System values of "${id}". Generated the same way for every system; the types are in TanreiTokens.swift.`]);
  const series = seriesOf(ir);

  // Steps this system added: file-scope constants, used by `extra`, by aliases and by the typed accessors.
  for (const s of Object.values(series)) for (const e of s.added) out.push(`private let ${addedConstant(ir, s, e)}: ${s.valueType} = ${s.format(e.value, e.key)}`, '');

  // File-scope constants keep alias chains visible: a component token that aliases
  // sys.typescale.label is written `<id>Typescale.label`. (Prefixed: inside the
  // extension a bare `typescale` would name the instance property.)
  const constant = { typescale: `${c(id)}Typescale`, elevation: `${c(id)}Elevation` };
  const reference = (s) => (key) => {
    const e = [...s.fields, ...s.added].find((x) => x.key === key);
    if (!e) throw new Error(`swift emitter: system "${id}" has no ${s.id} step "${key}"`);
    return e.added ? addedConstant(ir, s, e) : `${constant[s.id]}.${e.name}`;
  };
  const names = { typescale: reference(series.typescale), elevation: reference(series.elevation), colors: (scheme) => camel([id, scheme, 'colors']) };
  // The typefaces first: a text style or an icon family whose stack IS one of them is written as that typeface.
  constant.typefaces = `${c(id)}Typefaces`;
  out.push(`private let ${constant.typefaces} = ${typefacesValue(ir, '')}`, '');
  const same = (a, b) => JSON.stringify([a.families, a.genericClass ?? a.generic, a.system]) === JSON.stringify([b.families, b.genericClass ?? b.generic, b.system]);
  typefaceNames = (f) => {
    const key = TYPEFACES.find((k) => same(ir.typefaces[k], f));
    return key ? `${constant.typefaces}.${key}` : null;
  };
  out.push(`private let ${constant.typescale} = ${seriesValue(ir, series.typescale, '')}`, '');
  out.push(`private let ${constant.elevation} = ${seriesValue(ir, series.elevation, '')}`, '');

  for (const scheme of ir.schemes) {
    out.push(`private let ${names.colors(scheme)} = TanreiColors(scheme: .${c(scheme)}, values: [`);
    out.push(...ir.roles.map((r) => `  ${role(r)}: ${colorValue(ir.colors[scheme][r])},`));
    out.push('])', '');
  }

  // Springs: what this system added goes through file-scope constants, like every added step.
  const springSets = springsOf(ir);
  const springSet = (x, pad) => construct('TanreiSpringSet', withExtra(x.springs.filter((y) => !y.added).map((y) => [ident(y.name, 'spring'), spring(y.value)]), x.springs.filter((y) => y.added).map((y) => [str(y.name), y.constant]), pad), pad);
  for (const x of springSets.schemes) for (const y of x.springs.filter((z) => z.added)) out.push(`private let ${y.constant}: TanreiSpringSpec = ${spring(y.value)}`, '');
  for (const x of springSets.schemes.filter((z) => z.added)) out.push(`private let ${x.constant}: TanreiSpringSet = ${springSet(x, '')}`, '');
  const springs = construct('TanreiSprings', withExtra(springSets.schemes.filter((x) => !x.added).map((x) => [ident(x.scheme, 'springs'), springSet(x, '        ')]), springSets.schemes.filter((x) => x.added).map((x) => [str(x.scheme), x.constant]), '      '), '      ');

  // Each component's tokens are a file-scope constant of their own, initialized lazily in a frame of their own: written
  // inline, the one initializer of the system value would hold every component's temporaries at once, and in a debug
  // build that frame does not fit a secondary thread's stack.
  const componentConstant = (name) => camel([id, name, 'tokens']);
  for (const name of Object.keys(ir.componentTokens)) out.push(`private let ${componentConstant(name)} = ${componentValue(name, ir, '', names)}`, '');
  const pairs = [
    ['id', str(id)],
    ['intents', `[${ir.intents.map(role).join(', ')}]`],
    ['colors', construct('TanreiColorSchemes', ir.schemes.map((s) => [c(s), names.colors(s)]), '    ')],
    ['typescale', constant.typescale],
    ['shape', seriesValue(ir, series.shape, '    ')],
    ['space', seriesValue(ir, series.space, '    ')],
    ['state', seriesValue(ir, series.state, '    ')],
    ['measure', seriesValue(ir, series.measure, '    ')],
    ['typefaces', constant.typefaces],
    ['icon', iconValue(ir, '    ')],
    ['behavior', behaviorValue(ir, '    ')],
    ['motion', construct('TanreiMotionTokens', [['duration', seriesValue(ir, series.duration, '      ')], ['easing', seriesValue(ir, series.easing, '      ')], ['spring', springs]], '    ')],
    ['elevation', constant.elevation],
    ...Object.keys(ir.componentTokens).map((name) => [c(name), componentConstant(name)]),
  ];
  out.push(
    'extension TanreiSystem {',
    `  /// The "${id}" design system.`,
    `  public static let ${c(id)} = ${construct('TanreiSystem', pairs, '  ')}`,
    '}',
    '',
  );

  // Only a system that adds vocabulary has anything below this line.
  const added = [...accessors(ir, series), ...Object.entries(ir.extensions.own).flatMap(([namespace, tokens]) => ownTokens(ir, namespace, tokens, names))];
  if (added.length) {
    out.push(
      `// ── Vocabulary extensions of "${id}" ${'─'.repeat(40)}`,
      '// Typed names for what this design system adds to Tanrei: steps, color roles and component values it',
      '// declared, and the tokens of its own namespace. Everything above has the shape of every design system.',
      '',
      ...added,
    );
  }
  return out.join('\n');
}

/** @returns {Record<string, string>} repo-relative path → file text */
/**
 * @param {{ vocabulary?: boolean, external?: boolean }} [options] `vocabulary: false` = only the values of this
 *   system. `external` = the file lives in a product's module and imports the published library.
 */
export function emitSwift(ir, { vocabulary = true, external = false } = {}) {
  coreRoles = new Set(ir.coreRoles);
  externalModule = external;
  try {
    const files = { [`${DIR}/TanreiSystem+${pascal([ir.system])}.swift`]: emitSystem(ir) };
    typefaceNames = () => null;
    if (vocabulary && !external) files[`${DIR}/TanreiTokens.swift`] = emitVocabulary(ir);
    return files;
  } finally {
    externalModule = false;
    typefaceNames = () => null;
  }
}
