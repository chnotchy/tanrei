// Dart / Flutter emitter. Two kinds of output:
//
//   tokens.g.dart            VOCABULARY — the system-independent types: `TanreiSystem` and its parts,
//                            `TanreiPaint`, `TanreiColorRole`. Every constructor parameter is required,
//                            so a product's stale generated system fails to compile instead of silently
//                            missing a token.
//   <system>_system.g.dart   VALUES — one `const TanreiSystem <system>System`. Presets and product systems
//                            are generated the same way with `emitDartSystem(ir, { vocabularyRoles })`.
//
// ONE SHAPE for everything a layer can extend — the shape `TanreiColors` always had: named fields for
// the core vocabulary + an `extra` map (default: empty) for what a layer added + a lookup by key. Component
// axes (`TanreiButtonSizes`, `TanreiButtonVariants`) have open key types and a TOTAL lookup that falls back to
// the axis default; series (`TanreiSpace`, …) answer null for a step the system does not have. A values file
// mentions `extra`, typed accessors or own tokens only when its system extends the vocabulary.
//
// `dart format` is never run over generated files: this emitter's output IS the formatting.
import { CONFIG, GENERATED_HEADER, camel, pascal } from '../model.js';
import { TYPE_FAMILIES } from '../pure.js';

const OUT_DIR = 'packages/flutter/lib/src/generated';
const VOCABULARY_FILE = 'tokens.g.dart';

// ── formatting ──────────────────────────────────────────────────────────
const d = (n) => (Number.isInteger(n) ? `${n}.0` : `${n}`);
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
const color = ({ r, g, b, a }) => `Color(0x${hex2(a * 255)}${hex2(r)}${hex2(g)}${hex2(b)})`;
const bezier = (v) => `TanreiCubicBezier(${v.map(d).join(', ')})`;
const str = (s) => `'${String(s).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

const RESERVED = new Set([
  'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'covariant',
  'default', 'deferred', 'do', 'dynamic', 'else', 'enum', 'export', 'extends', 'extension', 'external', 'factory',
  'false', 'final', 'finally', 'for', 'get', 'if', 'implements', 'import', 'in', 'interface', 'is', 'late', 'library',
  'mixin', 'new', 'null', 'of', 'on', 'operator', 'part', 'required', 'rethrow', 'return', 'set', 'static', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield',
]);
const id = (s) => {
  const name = camel([s]);
  return RESERVED.has(name) ? `${name}_` : name;
};

/** A constructor call printed one argument per line. `args` is a list of [name, value]; a value is text or another call. */
const call = (ctor, args) => ({ ctor, args });
/** A map literal printed one entry per line. `types` is `<K, V>`; `entries` is a list of [key text, value]. */
const map = (types, entries) => ({ map: types, entries });
function print(value, depth = 0) {
  if (typeof value === 'string') return value;
  const pad = '  '.repeat(depth + 1);
  if (value.map) return `${value.map}{\n${value.entries.map(([k, v]) => `${pad}${k}: ${print(v, depth + 1)},\n`).join('')}${'  '.repeat(depth)}}`;
  return `${value.ctor}(\n${value.args.map(([k, v]) => `${pad}${k}: ${print(v, depth + 1)},\n`).join('')}${'  '.repeat(depth)})`;
}

/**
 * An immutable value class: one const constructor, every parameter required, plus `copyWith`.
 *
 * `extra` = `{ key, value, doc }` makes it a HOLDER: the named fields are the core vocabulary, and
 * `extra` — the one parameter with a default, so a system without extensions never mentions it — holds what a
 * layer added.
 */
function dataClass(name, fields, { doc = [], members = [], extra = null } = {}) {
  const types = extra && `<${extra.key}, ${extra.value}>`;
  return [
    ...doc.map((l) => `/// ${l}`),
    '@immutable',
    `class ${name} {`,
    `  const ${name}({`,
    ...fields.map((f) => `    required this.${f.name},`),
    ...(extra ? [`    this.extra = const ${types}{},`] : []),
    '  });',
    '',
    ...fields.flatMap((f) => [...(f.doc ? [`  /// ${f.doc}`] : []), `  final ${f.type} ${f.name};`]),
    ...(extra ? ['', ...extra.doc.map((l) => `  /// ${l}`), `  final Map${types} extra;`] : []),
    '',
    ...(extra
      ? ['  /// A copy with the given tokens replaced. The entries of [extra] are added to the existing ones (and replace', '  /// those with the same key): a copy never loses a value the design system added.']
      : ['  /// A copy with the given tokens replaced.']),
    `  ${name} copyWith({`,
    ...fields.map((f) => `    ${f.type}? ${f.name},`),
    ...(extra ? [`    Map${types}? extra,`] : []),
    `  }) => ${name}(`,
    ...fields.map((f) => `        ${f.name}: ${f.name} ?? this.${f.name},`),
    ...(extra ? [`        extra: extra == null ? this.extra : ${types}{...this.extra, ...extra},`] : []),
    '      );',
    ...(members.length ? ['', ...members] : []),
    '}',
    '',
  ];
}

// ── what is emitted ─────────────────────────────────────────────────────
const STATE_ORDER = ['hovered', 'focused', 'pressed', 'dragged', 'selected', 'disabled'];
const RESTING = 'enabled';

const DART_TYPE = {
  color: 'TanreiPaint',
  typography: 'TanreiTextStyle',
  shadow: 'List<TanreiShadowLayer>',
  cubicBezier: 'TanreiCubicBezier',
  duration: 'int',
  dimension: 'double',
  number: 'double',
};
function dartType(token, owner) {
  const type = DART_TYPE[token.type];
  if (!type) throw new Error(`dart: ${owner}.${token.name} has type "${token.type}", which this emitter cannot represent`);
  return type;
}

/**
 * The identifier of a value on an axis. A key that is not an identifier (`3x`) gets the axis name in front
 * (`size3x`); as a string key it stays `'3x'`.
 */
const axisId = (axis, key) => (/^[a-z]/.test(key) ? id(key) : id(`${axis}-${key}`));

/**
 * The shape of one component's tokens, read from where the IR places each token — never from names:
 *   flat       tokens on no axis and in no state
 *   axes       per axis: its values, its members, and key → state → member → token. An axis whose tokens
 *              have no states (`size`) has the single state `enabled`
 *   perState   per-state tokens of the component itself (`hovered.opacity`); no resting counterpart is assumed
 */
function componentShape(component, tokens, declared = {}) {
  const live = tokens.filter((t) => !t.deprecated);
  const sortStates = (names) => [...names].sort((a, b) => (STATE_ORDER.indexOf(a) + 1 || 99) - (STATE_ORDER.indexOf(b) + 1 || 99) || (a < b ? -1 : 1));

  const axes = Object.entries(declared).map(([axis, def]) => {
    const mine = live.filter((t) => t.axis === axis);
    const byKey = new Map(); // key → state → member → token
    for (const t of mine) {
      const states = byKey.get(t.key) ?? byKey.set(t.key, new Map()).get(t.key);
      const state = t.state ?? RESTING;
      (states.get(state) ?? states.set(state, new Map()).get(state)).set(t.member, t);
    }
    const states = [RESTING, ...sortStates(new Set(mine.filter((t) => t.state).map((t) => t.state)))];
    for (const { key } of def.values) {
      for (const state of states) {
        for (const member of def.members) {
          const t = byKey.get(key)?.get(state)?.get(member.name);
          if (!t) throw new Error(`dart: comp.${component}: ${axis} "${key}" has no ${state === RESTING ? '' : `${state} `}${member.name} token`);
          if (t.type !== member.type) throw new Error(`dart: comp.${component}.${t.name} is a ${t.type}, but the ${axis} axis declares ${member.name} as ${member.type}`);
        }
      }
    }
    return { axis, default: def.default, values: def.values, members: def.members, states, stateful: states.length > 1, tokens: byKey };
  });

  let perState = null;
  const own = live.filter((t) => !t.axis && t.state);
  if (own.length) {
    const byState = new Map(); // state → part → token
    for (const t of own) {
      // The IR names the state; what is left of the name is the part (`hovered-opacity` → `opacity`).
      if (!t.name.startsWith(`${t.state}-`)) throw new Error(`dart: comp.${component}.${t.name} is a "${t.state}" token on no axis, but its name does not start with the state`);
      (byState.get(t.state) ?? byState.set(t.state, new Map()).get(t.state)).set(t.name.slice(t.state.length + 1), t);
    }
    const signatures = new Set([...byState.values()].map((parts) => [...parts].map(([part, t]) => `${part}:${t.type}`).sort().join(',')));
    if (signatures.size > 1) throw new Error(`dart: comp.${component} per-state tokens: states do not share one set of tokens (${[...signatures].join(' | ')})`);
    perState = { states: sortStates(byState.keys()), parts: [...byState.values().next().value.keys()].sort(), tokens: byState };
  }

  return { name: component, flat: live.filter((t) => !t.axis && !t.state), axes, perState };
}

const componentShapes = (ir) => Object.entries(ir.componentTokens).map(([name, tokens]) => componentShape(name, tokens, ir.axes[name]));
const interactionStates = (shapes) => {
  const found = new Set(shapes.flatMap((s) => [...s.axes.flatMap((a) => a.states), ...(s.perState?.states ?? [])]));
  found.delete(RESTING);
  const known = STATE_ORDER.filter((s) => found.has(s));
  return [RESTING, ...known, ...[...found].filter((s) => !known.includes(s)).sort()];
};

/** The names an axis has in Dart: key type, per-value group, per-state group, holder, and the field on the component. */
const axisNames = (component, axis) => {
  const Base = `Tanrei${pascal([component])}${pascal([axis])}`;
  return { key: Base, tokens: `${Base}Tokens`, stateTokens: `${Base}StateTokens`, holder: `${Base}s`, field: id(`${axis}s`) };
};

/** Series steps a layer ADDED: they are values of `extra`, never named fields. */
const addedSteps = (ir, series) => new Set((ir.extensions.series[series] ?? []).map((e) => e.key));
const coreSteps = (ir, series, obj) => Object.keys(obj).filter((k) => !addedSteps(ir, series).has(k));

const measureFields = (ir) =>
  Object.entries(ir.measure).flatMap(([group, values]) =>
    Object.keys(values)
      .filter((k) => !ir.deprecatedMeasures.includes(`${group}-${k}`))
      .map((k) => ({ group, key: k, name: camel([group, k]), step: `${group}-${k}`, added: addedSteps(ir, group).has(k) })),
  );

/**
 * A font stack as the IR read it: the named families in order, the generic class to fall back to, and
 * whether the platform's own font comes first. CSS keywords never reach Dart.
 *
 * The IR's `generic` is one of `sans-serif | serif | monospace | cursive | fantasy | math | emoji` (`fontStack()` in
 * `ir.js`). `TanreiFontGeneric` has three values because those are the classes an operating system ships a text
 * font for and Flutter can be pointed at by family name. `cursive`, `fantasy` and `math` have no platform font
 * anywhere Flutter runs, and `emoji` needs no entry (the engine falls back to the OS emoji font for emoji code
 * points by itself) — so all four map to `sansSerif`, which adds NO family: the named families are tried, then the
 * platform's UI font. That is decided here, deliberately; `packages/flutter/tool/emit_dart.test.mjs` pins it.
 */
const FONT_GENERIC = { 'sans-serif': 'sansSerif', serif: 'serif', monospace: 'monospace', cursive: 'sansSerif', fantasy: 'sansSerif', math: 'sansSerif', emoji: 'sansSerif' };
const fontStackValue = (font) =>
  `TanreiFontStack(families: <String>[${font.families.map(str).join(', ')}], generic: TanreiFontGeneric.${FONT_GENERIC[font.generic] ?? FONT_GENERIC['sans-serif']}, system: ${font.system})`;

/**
 * How icons are drawn: the icon family of each selection state (`sys.icon.family.*`) and the numbers of
 * `sys.icon`, every one under its own name (`fill-unselected` → `fillUnselected`). The icon SIZES are measures
 * (`measure.iconSmall` …).
 */
const ICON_ORDER = ['weight', 'mark-weight', 'fill-unselected', 'fill-selected'];
const ICON_FAMILY_ORDER = ['unselected', 'selected'];
function iconFields(ir) {
  for (const state of ICON_FAMILY_ORDER) if (!ir.iconFamilies?.[state]?.families.length) throw new Error(`dart: system "${ir.system}" names no icon font family for "${state}" (sys.icon.family.${state})`);
  // A fixed order, not the order a resolver happens to return tokens in; numbers this emitter does not know yet follow by name.
  const order = (k) => ICON_ORDER.indexOf(k) + 1 || ICON_ORDER.length + 1;
  const numbers = Object.entries(ir.icon).filter(([k]) => k !== 'family').sort(([x], [y]) => order(x) - order(y) || (x < y ? -1 : 1));
  for (const [k, v] of numbers) if (typeof v !== 'number') throw new Error(`dart: sys.icon.${k} is not a number`);
  return [
    ...ICON_FAMILY_ORDER.map((state) => ({
      name: id(`family-${state}`),
      type: 'TanreiFontStack',
      doc: `\`sys.icon.family.${state}\`: the icon font of ${state === 'selected' ? 'a selected' : 'an unselected'} icon, by family name. The font is not bundled.`,
      value: fontStackValue(ir.iconFamilies[state]),
    })),
    ...numbers.map(([k, v]) => ({ name: id(k), type: 'double', doc: `\`sys.icon.${k.replace(/-(?=[^-]*$)/, '.')}\``, value: d(v) })),
  ];
}

// ── emphasis as a weight step, corner smoothing as an amount ──────────────
/** The family of a type role (core or added by a layer) is decided once by the token build and read from the IR (`ir.typescale[role].family`); the emitter never parses a role's name. */
function typeFamilyOf(t, role) {
  if (!TYPE_FAMILIES.includes(t.family)) throw new Error(`dart: typescale role "${role}" has no family in the IR (${JSON.stringify(t.family)}); ir.typescale[role].family is one of ${TYPE_FAMILIES.join(', ')}`);
  return t.family;
}
/** `sys.typescale.emphasis.<family>`: the weight `emphasized` text ADDS to a role's weight. Core vocabulary: every system has all four, as integers (weights are). */
function typeEmphasisFields(ir) {
  const lacking = TYPE_FAMILIES.filter((f) => typeof ir.typeEmphasis?.[f] !== 'number');
  if (lacking.length) throw new Error(`dart: system "${ir.system}" lacks the emphasis step of ${lacking.join(', ')} (sys.typescale.emphasis.*)`);
  const unknown = Object.keys(ir.typeEmphasis).filter((f) => !TYPE_FAMILIES.includes(f));
  if (unknown.length) throw new Error(`dart: sys.typescale.emphasis has families this emitter does not know: ${unknown.join(', ')}`);
  const fractional = TYPE_FAMILIES.filter((f) => !Number.isInteger(ir.typeEmphasis[f]));
  if (fractional.length) throw new Error(`dart: sys.typescale.emphasis.${fractional[0]} is not a whole number of weight (${ir.typeEmphasis[fractional[0]]})`);
  return TYPE_FAMILIES.map((f) => ({ name: f, type: 'int', doc: `\`sys.typescale.emphasis.${f}\``, value: `${ir.typeEmphasis[f]}` }));
}
/** `sys.shape.corner-smoothing`: 0–1 with Figma's meaning (0 circular, 0.6 the iOS continuous corner, 1 the most eased). */
function cornerSmoothingValue(ir) {
  const v = ir.cornerSmoothing;
  if (typeof v !== 'number' || !(v >= 0 && v <= 1)) throw new Error(`dart: system "${ir.system}" has no sys.shape.corner-smoothing in [0, 1] (got ${JSON.stringify(v)})`);
  return d(v);
}
/** The member of `TanreiTypescale` that is not a role, and of `TanreiShape` that is not a radius (both required; a layer cannot add a step under either name). */
const TYPESCALE_EMPHASIS = { name: 'emphasis', type: 'TanreiTypeEmphasis', doc: '`sys.typescale.emphasis.*`: the weight `emphasized` text adds, per family. Not a role: [operator []] does not find it.' };
const SHAPE_CORNER_SMOOTHING = {
  name: 'cornerSmoothing',
  type: 'double',
  doc: "`sys.shape.corner-smoothing`: 0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous corner, 1 the most eased. Not a radius: [operator []] does not find it.",
};

/** Choices of kind, in a fixed order; choices this emitter does not know yet follow by name. */
const BEHAVIOR_ORDER = ['pressed-feedback', 'focus-style'];
function behaviorChoices(ir) {
  const order = (k) => BEHAVIOR_ORDER.indexOf(k) + 1 || BEHAVIOR_ORDER.length + 1;
  return Object.entries(ir.behavior)
    .sort(([x], [y]) => order(x) - order(y) || (x < y ? -1 : 1))
    .map(([key, choice]) => ({ key, name: id(key), type: `Tanrei${pascal([key])}`, values: choice.values, value: choice.value }));
}

/** The typefaces of `ref.typeface.*`, in a fixed order; others follow by name. */
const TYPEFACE_ORDER = ['brand', 'plain', 'mono', 'icon'];
const typefaceKeys = (ir) => Object.keys(ir.typefaces).sort((x, y) => (TYPEFACE_ORDER.indexOf(x) + 1 || 99) - (TYPEFACE_ORDER.indexOf(y) + 1 || 99) || (x < y ? -1 : 1));

/**
 * The spring sets a layer ADDED, as `scheme/name` → who declared it. The IR lists one entry per added
 * set and scheme (`ir.extensions.series.spring = [{ key: name, scheme, declaredBy, value }]`).
 */
function addedSprings(ir) {
  const out = new Map();
  for (const e of ir.extensions.series.spring ?? []) out.set(`${e.scheme}/${e.key}`, e.declaredBy);
  return out;
}
const coreSprings = (ir, scheme) => Object.keys(ir.spring[scheme]).filter((name) => !addedSprings(ir).has(`${scheme}/${name}`));
/** Spring schemes with at least one core spring are vocabulary (`springStandard`); a scheme a layer added is a value of `TanreiMotion.extra`. */
const coreSpringSchemes = (ir) => Object.keys(ir.spring).filter((scheme) => coreSprings(ir, scheme).length);

// ── vocabulary ──────────────────────────────────────────────────────────
const SUPPORT = `
/// Receives the lookups that named a value the active design system does not have.
typedef TanreiUnknownValueReporter = void Function(String kind, String key, String fallback);

/// Called — in debug builds only — when a total lookup (\`system.button.sizes[size]\`,
/// \`system.button.variants[variant]\`) is asked for a value the active design system does not have and
/// answers with the default value instead (spec BTN-7). Release builds never call it and never fail.
///
/// The default reports each unknown value once through [FlutterError.reportError]. Replace it to collect
/// the reports, for example in tests.
TanreiUnknownValueReporter debugTanreiReportUnknownValue = tanreiReportUnknownValueOnce;

final Set<String> _reportedUnknownValues = <String>{};

/// The default [debugTanreiReportUnknownValue].
void tanreiReportUnknownValueOnce(String kind, String key, String fallback) {
  if (!_reportedUnknownValues.add('\$kind/\$key')) {
    return;
  }
  FlutterError.reportError(
    FlutterErrorDetails(
      exception: FlutterError(
        'Unknown \$kind "\$key": the active design system does not have it. '
        'Rendering with "\$fallback" instead.',
      ),
      library: 'tanrei',
      context: ErrorDescription('while looking up a \$kind'),
    ),
  );
}

/// The key of a color role (\`sys.color.<name>\`). Components bind to roles, never to literal colors.
///
/// The set is open: a design system may declare palettes of its own (\`tertiary\`, \`correct\`, ...), and
/// names them with \`const TanreiColorRole('tertiary')\`. The constants below are the roles of the
/// default system. [TanreiColors.operator []] resolves a key against one scheme.
extension type const TanreiColorRole(String name) {
__ROLE_CONSTANTS__
}

/// How a component color is described without resolving the scheme. A paint is evaluated at runtime
/// against the current scheme's [TanreiColors] (\`resolve\` in \`theme/paint.dart\`), so component tokens
/// stay scheme-independent and a re-pointed role just works.
@immutable
sealed class TanreiPaint {
  const TanreiPaint();

  /// A color role of the current scheme.
  const factory TanreiPaint.role(TanreiColorRole role) = TanreiRolePaint;

  /// [base] interpolated towards [other] by [amount], premultiplied: CSS \`color-mix(in srgb, ...)\`.
  const factory TanreiPaint.mix(TanreiPaint base, TanreiPaint other, double amount) = TanreiMixPaint;

  /// [of] with its alpha multiplied by [amount].
  const factory TanreiPaint.alpha(TanreiPaint of, double amount) = TanreiAlphaPaint;

  /// Nothing is drawn.
  const factory TanreiPaint.none() = TanreiNoPaint;

  /// A fixed color, the same in every scheme.
  const factory TanreiPaint.literal(Color color) = TanreiLiteralPaint;

  /// A paint per scheme: what a \`tone\` or \`contrast-pick\` rule gives when its result differs between schemes.
  /// Evaluate it through the theme (\`TanreiThemeData.paint\`), which knows the scheme it draws in.
  const factory TanreiPaint.scheme({
__SCHEME_PARAMS__
  }) = TanreiSchemePaint;
}

/// See [TanreiPaint.role].
final class TanreiRolePaint extends TanreiPaint {
  const TanreiRolePaint(this.role);
  final TanreiColorRole role;

  @override
  bool operator ==(Object other) => other is TanreiRolePaint && other.role == role;
  @override
  int get hashCode => Object.hash(TanreiRolePaint, role);
  @override
  String toString() => 'TanreiPaint.role(\${role.name})';
}

/// See [TanreiPaint.mix].
final class TanreiMixPaint extends TanreiPaint {
  const TanreiMixPaint(this.base, this.other, this.amount);
  final TanreiPaint base;
  final TanreiPaint other;
  final double amount;

  @override
  bool operator ==(Object other) =>
      other is TanreiMixPaint && other.base == base && other.other == this.other && other.amount == amount;
  @override
  int get hashCode => Object.hash(TanreiMixPaint, base, other, amount);
  @override
  String toString() => 'TanreiPaint.mix(\$base, \$other, \$amount)';
}

/// See [TanreiPaint.alpha].
final class TanreiAlphaPaint extends TanreiPaint {
  const TanreiAlphaPaint(this.of, this.amount);
  final TanreiPaint of;
  final double amount;

  @override
  bool operator ==(Object other) => other is TanreiAlphaPaint && other.of == of && other.amount == amount;
  @override
  int get hashCode => Object.hash(TanreiAlphaPaint, of, amount);
  @override
  String toString() => 'TanreiPaint.alpha(\$of, \$amount)';
}

/// See [TanreiPaint.none].
final class TanreiNoPaint extends TanreiPaint {
  const TanreiNoPaint();

  @override
  bool operator ==(Object other) => other is TanreiNoPaint;
  @override
  int get hashCode => (TanreiNoPaint).hashCode;
  @override
  String toString() => 'TanreiPaint.none()';
}

/// See [TanreiPaint.literal].
final class TanreiLiteralPaint extends TanreiPaint {
  const TanreiLiteralPaint(this.color);
  final Color color;

  @override
  bool operator ==(Object other) => other is TanreiLiteralPaint && other.color == color;
  @override
  int get hashCode => Object.hash(TanreiLiteralPaint, color);
  @override
  String toString() => 'TanreiPaint.literal(\$color)';
}

/// The class of font a [TanreiFontStack] falls back to when none of its named families is available.
///
/// Three values: the classes every operating system ships a text font for. A token stack that ends in another CSS
/// generic (\`cursive\`, \`fantasy\`, \`math\`, \`emoji\`) arrives as [sansSerif]: no platform has a font to name for
/// those, so such a stack falls through to the platform's UI font after its named families.
enum TanreiFontGeneric {
  sansSerif,
  serif,
  monospace,
}

/// A font stack, read once for every platform. Fonts are names, never files: a product installs or
/// registers the [families] it wants to see; what is not available falls through to the platform's font.
@immutable
class TanreiFontStack {
  const TanreiFontStack({
    required this.families,
    required this.generic,
    required this.system,
  });

  /// The named families, in order of preference.
  final List<String> families;

  /// The platform font class that ends the stack.
  final TanreiFontGeneric generic;

  /// Whether the platform's own font of class [generic] comes BEFORE [families] (the stack starts with
  /// \`system-ui\` / \`ui-monospace\`), not only after them.
  final bool system;
}

/// See [TanreiPaint.scheme].
final class TanreiSchemePaint extends TanreiPaint {
  const TanreiSchemePaint({
__SCHEME_INIT__
  });
__SCHEME_FIELDS__

  /// The paint of [scheme].
  TanreiPaint of(TanreiScheme scheme) => switch (scheme) {
__SCHEME_CASES__
      };

  @override
  bool operator ==(Object other) =>
      other is TanreiSchemePaint && TanreiScheme.values.every((TanreiScheme s) => other.of(s) == of(s));
  @override
  int get hashCode => Object.hashAll(<Object>[TanreiSchemePaint, for (final TanreiScheme s in TanreiScheme.values) of(s)]);
  @override
  String toString() => 'TanreiPaint.scheme(\${TanreiScheme.values.map((TanreiScheme s) => '\${s.name}: \${of(s)}').join(', ')})';
}

/// The family a type role belongs to: which step of [TanreiTypeEmphasis] \`emphasized\` text adds.
/// Decided by the token build: the first segment of the role's name when it names a family; \`caption\`, \`code*\`,
/// \`eyebrow\` and any other role take [label].
enum TanreiTypeFamily {
__TYPE_FAMILIES__
}

/// The weight \`emphasized\` text adds to a role's weight, per family (\`sys.typescale.emphasis.*\`).
/// Emphasis is a weight step, not a role: size, tracking and line height do not change.
@immutable
class TanreiTypeEmphasis {
  const TanreiTypeEmphasis({
__TYPE_EMPHASIS_INIT__
  });

__TYPE_EMPHASIS_FIELDS__

  /// The step of one family.
  int operator [](TanreiTypeFamily family) => switch (family) {
__TYPE_EMPHASIS_CASES__
      };

  /// A copy with the given steps replaced.
  TanreiTypeEmphasis copyWith({
__TYPE_EMPHASIS_COPY_PARAMS__
  }) => TanreiTypeEmphasis(
__TYPE_EMPHASIS_COPY_ARGS__
      );

  @override
  bool operator ==(Object other) =>
      other is TanreiTypeEmphasis && TanreiTypeFamily.values.every((TanreiTypeFamily f) => other[f] == this[f]);
  @override
  int get hashCode => Object.hashAll(<Object>[for (final TanreiTypeFamily f in TanreiTypeFamily.values) this[f]]);
}

@immutable
class TanreiTextStyle {
  const TanreiTextStyle({
    required this.font,
    required this.size,
    required this.weight,
    required this.tracking,
    required this.lineHeight,
    required this.family,
  });

  /// The font stack. Convert the whole style with \`toTextStyle()\` (\`theme/text_style.dart\`).
  final TanreiFontStack font;
  final double size;

  /// Numeric weight on the 1–1000 axis (variable fonts may use in-between values such as 450).
  final int weight;
  final double tracking;
  final double lineHeight;

  /// The family the role belongs to: which step of [TanreiTypeEmphasis] [emphasized] adds to [weight].
  final TanreiTypeFamily family;

  /// This style with the emphasis step of its [family] added to [weight]: the same size, tracking
  /// and line height, heavier. \`system.typescale.emphasis\` is the [emphasis] to pass; the theme's
  /// \`textStyle(token, emphasized: true)\` does it for you.
  TanreiTextStyle emphasized(TanreiTypeEmphasis emphasis) => TanreiTextStyle(
        font: font,
        size: size,
        weight: weight + emphasis[family],
        tracking: tracking,
        lineHeight: lineHeight,
        family: family,
      );

  @override
  bool operator ==(Object other) =>
      other is TanreiTextStyle &&
      other.font == font &&
      other.size == size &&
      other.weight == weight &&
      other.tracking == tracking &&
      other.lineHeight == lineHeight &&
      other.family == family;
  @override
  int get hashCode => Object.hash(font, size, weight, tracking, lineHeight, family);
}

@immutable
class TanreiCubicBezier {
  const TanreiCubicBezier(this.x1, this.y1, this.x2, this.y2);
  final double x1, y1, x2, y2;
}

@immutable
class TanreiSpringSpec {
  const TanreiSpringSpec({
    required this.damping,
    required this.stiffness,
    required this.easing,
    required this.durationMs,
  });
  final double damping;
  final double stiffness;

  /// Fallback for contexts without spring animation.
  final TanreiCubicBezier easing;
  final int durationMs;
}

/// One layer of an elevation level, with CSS \`box-shadow\` semantics: [blur] is the CSS blur radius
/// (the Gaussian's standard deviation is \`blur / 2\`), NOT a Flutter \`BoxShadow.blurRadius\`. The one conversion is
/// \`tanreiBlurRadiusFromCss\` in \`primitives/elevation.dart\`.
@immutable
class TanreiShadowLayer {
  const TanreiShadowLayer(this.x, this.y, this.blur, this.spread, this.role);
  final double x, y, blur, spread;
  final TanreiColorRole role;
}
`;

function colorsClass(ir) {
  const fallback = ['primary', 'on-primary', 'primary-container', 'on-primary-container'];
  const missing = fallback.filter((r) => !ir.roles.includes(r));
  if (missing.length) throw new Error(`dart: the unknown-role fallback needs the roles ${missing.join(', ')}`);
  return [
    '/// Every color role for one scheme (theme × contrast).',
    '///',
    '/// The named roles are the vocabulary; [extra] holds the roles of palettes a design system declares on',
    '/// top of it. Look a role up with `colors[role]`.',
    '@immutable',
    'class TanreiColors {',
    '  const TanreiColors({',
    '    required this.scheme,',
    ...ir.coreRoles.map((r) => `    required this.${id(r)},`),
    '    this.extra = const <TanreiColorRole, Color>{},',
    '  });',
    '',
    '  /// Which of the six schemes of its design system these colors are. The typed accessor of a role another',
    '  /// design system added reads it, to answer with that system\'s color of the SAME scheme.',
    '  final TanreiScheme scheme;',
    '',
    ...ir.coreRoles.map((r) => `  final Color ${id(r)};`),
    '',
    '  /// Roles the design system has beyond the core vocabulary: the roles of palettes it declares',
    '  /// and roles a layer added. Empty unless the system says otherwise.',
    '  final Map<TanreiColorRole, Color> extra;',
    '',
    '  /// The color of [role] in this scheme.',
    '  ///',
    '  /// The lookup is total, like every lookup of an open key: a role this scheme does not have',
    '  /// resolves to the `primary` slot of the same kind (`on-x` → `on-primary`, `x-container` →',
    '  /// `primary-container`), so that a container and its content stay a readable pair. Debug builds report it',
    '  /// through [debugTanreiReportUnknownValue]; it never throws and never asserts. The typed accessor generated',
    '  /// next to the design system that added a role (`colors.brandGlow`) answers better: with that system\'s',
    '  /// color of the same [scheme].',
    '  Color operator [](TanreiColorRole role) => switch (role.name) {',
    ...ir.coreRoles.map((r) => `        ${str(r)} => ${id(r)},`),
    '        _ => extra[role] ?? _fallback(role),',
    '      };',
    '',
    '  /// Whether this scheme defines [role].',
    '  bool has(TanreiColorRole role) => _names.contains(role.name) || extra.containsKey(role);',
    '',
    '  Color _fallback(TanreiColorRole role) {',
    "    final bool on = role.name.startsWith('on-');",
    "    final bool container = role.name.endsWith('-container');",
    '    assert(() {',
    "      debugTanreiReportUnknownValue('color role', role.name, '${on ? 'on-' : ''}primary${container ? '-container' : ''}');",
    '      return true;',
    '    }());',
    '    return on ? (container ? onPrimaryContainer : onPrimary) : (container ? primaryContainer : primary);',
    '  }',
    '',
    '  static const Set<String> _names = <String>{',
    ...ir.coreRoles.map((r) => `    ${str(r)},`),
    '  };',
    '',
    '  /// A copy with the given roles replaced. The entries of [extra] are added to the existing ones (and replace',
    '  /// those with the same key): a copy never loses a role the design system declared.',
    '  TanreiColors copyWith({',
    '    TanreiScheme? scheme,',
    ...ir.coreRoles.map((r) => `    Color? ${id(r)},`),
    '    Map<TanreiColorRole, Color>? extra,',
    '  }) => TanreiColors(',
    '        scheme: scheme ?? this.scheme,',
    ...ir.coreRoles.map((r) => `        ${id(r)}: ${id(r)} ?? this.${id(r)},`),
    '        extra: extra == null ? this.extra : <TanreiColorRole, Color>{...this.extra, ...extra},',
    '      );',
    '',
    '  /// Interpolates every role (used by theme animations). The [scheme] steps at the midpoint.',
    '  static TanreiColors lerp(TanreiColors a, TanreiColors b, double t) => TanreiColors(',
    '        scheme: t < 0.5 ? a.scheme : b.scheme,',
    ...ir.coreRoles.map((r) => `        ${id(r)}: Color.lerp(a.${id(r)}, b.${id(r)}, t)!,`),
    '        extra: <TanreiColorRole, Color>{',
    '          for (final TanreiColorRole role in <TanreiColorRole>{...a.extra.keys, ...b.extra.keys})',
    '            role: Color.lerp(a.extra[role] ?? b.extra[role], b.extra[role] ?? a.extra[role], t)!,',
    '        },',
    '      );',
    '}',
    '',
  ];
}

/** `T? operator [](String key)` over the named steps of a series, then `extra`. `steps` is a list of [key, field]. */
const seriesLookup = (type, steps, what) => [
  `  /// The ${what} named [key] (${steps.length ? `\`${steps[0][0]}\`` : 'a token key'}, or a step the design system added), or null when this`,
  '  /// system does not have it.',
  `  ${type}? operator [](String key) => switch (key) {`,
  ...steps.map(([key, field]) => `        ${str(key)} => ${field},`),
  '        _ => extra[key],',
  '      };',
];
const seriesExtra = (type) => ({ key: 'String', value: type, doc: ['What a design system added to the core vocabulary, by token key.'] });

/**
 * A series of `sys.*` steps: named fields for the core steps, `extra` for added ones, and a keyed lookup. `also` are
 * required members of the holder that are NOT steps (`typescale.emphasis`, `shape.cornerSmoothing`): the lookup does
 * not see them.
 */
function seriesClass(ir, name, series, obj, type, { doc, what, also = [] }) {
  const steps = coreSteps(ir, series, obj);
  for (const f of also) if (steps.some((k) => id(k) === f.name)) throw new Error(`dart: sys.${series} has a step named like the member "${f.name}"`);
  return dataClass(name, [...steps.map((k) => ({ name: id(k), type })), ...also], {
    doc,
    extra: seriesExtra(type),
    members: seriesLookup(type, steps.map((k) => [k, id(k)]), what),
  });
}

function axisClasses(shape, a, states) {
  const names = axisNames(shape.name, a.axis);
  const core = a.values.filter((v) => v.core);
  const fallback = axisId(a.axis, a.default);
  const memberFields = a.members.map((m) => ({
    name: id(m.name),
    type: dartType({ ...m, name: m.name }, `comp.${shape.name}`),
    doc: a.stateful ? `\`comp.${shape.name}.<${a.axis}>.<state>.${m.name}\`` : `\`comp.${shape.name}.${m.name}.<${a.axis}>\``,
  }));
  const out = [
    `/// The key of a ${a.axis} of ${shape.name} (\`comp.${shape.name}\`, axis \`${a.axis}\`).`,
    '///',
    `/// The set is open: the constants are the core values, and a design system may add its own —`,
    `/// \`const ${names.key}('…')\`, or the typed constants generated next to a system that extends. A value the`,
    `/// active system does not have renders as [${fallback}].`,
    `extension type const ${names.key}(String name) {`,
    ...core.map((v) => `  static const ${axisId(a.axis, v.key)} = ${names.key}(${str(v.key)});`),
    '',
    '  /// The core values, in the order the component declares them.',
    `  static const List<${names.key}> core = <${names.key}>[${core.map((v) => axisId(a.axis, v.key)).join(', ')}];`,
    '}',
    '',
  ];
  if (a.stateful) {
    out.push(...dataClass(names.stateTokens, memberFields, { doc: [`What one ${a.axis} of ${shape.name} looks like in one interaction state.`] }));
    out.push(
      ...dataClass(names.tokens, a.states.map((s) => ({ name: id(s), type: names.stateTokens })), {
        doc: [`The per-state tokens of one ${shape.name} ${a.axis}. How a state looks is a value of the design system;`, 'the widget only selects the state.'],
        members: [
          '  /// The tokens of [state]; a state this component does not have resolves to `enabled`.',
          `  ${names.stateTokens} of(TanreiInteractionState state) => switch (state) {`,
          ...states.map((s) => `        TanreiInteractionState.${id(s)} => ${a.states.includes(s) ? id(s) : id(RESTING)},`),
          '      };',
        ],
      }),
    );
  } else {
    out.push(...dataClass(names.tokens, memberFields, { doc: [`The tokens of one ${shape.name} ${a.axis}.`] }));
  }
  out.push(
    ...dataClass(names.holder, core.map((v) => ({ name: axisId(a.axis, v.key), type: names.tokens, doc: `\`comp.${shape.name}\` ${a.axis} \`${v.key}\`` })), {
      doc: [
        `Every ${a.axis} of ${shape.name}: the core values by name, the values a design system added in [extra].`,
        `Look one up with \`${names.field}[key]\`; the lookup is total.`,
      ],
      extra: { key: names.key, value: names.tokens, doc: [`The ${a.axis}s a design system added to the core vocabulary.`] },
      members: [
        `  /// The tokens of [${a.axis}].`,
        '  ///',
        `  /// A ${a.axis} this design system does not have resolves to [${fallback}], the default; debug builds report it`,
        '  /// through [debugTanreiReportUnknownValue] and release builds stay silent.',
        `  ${names.tokens} operator [](${names.key} ${id(a.axis)}) => switch (${id(a.axis)}.name) {`,
        ...core.map((v) => `        ${str(v.key)} => ${axisId(a.axis, v.key)},`),
        `        _ => extra[${id(a.axis)}] ?? _fallback(${id(a.axis)}),`,
        '      };',
        '',
        `  /// Whether this design system has [${a.axis}].`,
        `  bool has(${names.key} ${id(a.axis)}) => ${names.key}.core.contains(${id(a.axis)}) || extra.containsKey(${id(a.axis)});`,
        '',
        `  /// Every ${a.axis} this design system has: the core values, then the added ones.`,
        `  List<${names.key}> get keys => <${names.key}>[...${names.key}.core, ...extra.keys];`,
        '',
        `  ${names.tokens} _fallback(${names.key} ${id(a.axis)}) {`,
        '    assert(() {',
        `      debugTanreiReportUnknownValue(${str(`${shape.name} ${a.axis}`)}, ${id(a.axis)}.name, ${str(a.default)});`,
        '      return true;',
        '    }());',
        `    return ${fallback};`,
        '  }',
      ],
    }),
  );
  return out;
}

function componentClasses(shape, states) {
  const Comp = `Tanrei${pascal([shape.name])}`;
  const out = [];
  const fields = shape.flat.map((t) => ({ name: id(t.name), type: dartType(t, `comp.${shape.name}`), doc: `\`comp.${shape.name}.${t.name}\`` }));
  const members = [];

  for (const a of shape.axes) {
    out.push(...axisClasses(shape, a, states));
    const names = axisNames(shape.name, a.axis);
    fields.push({ name: names.field, type: names.holder, doc: `The \`${a.axis}\` axis: \`${names.field}[${a.axis}]\`.` });
  }
  if (shape.perState) {
    const sample = shape.perState.tokens.values().next().value;
    out.push(
      ...dataClass(
        `${Comp}StateTokens`,
        shape.perState.parts.map((part) => ({ name: id(part), type: dartType(sample.get(part), `comp.${shape.name}`), doc: `\`comp.${shape.name}.<state>.${part}\`` })),
        { doc: [`The tokens of ${shape.name} that vary by interaction state but not by variant.`] },
      ),
    );
    fields.push(...shape.perState.states.map((s) => ({ name: id(s), type: `${Comp}StateTokens`, doc: `\`comp.${shape.name}.${s}.*\`` })));
    members.push(
      '  /// The variant-independent tokens of [state], or null for a state that has none (`enabled`: the',
      '  /// resting tokens of this class apply).',
      `  ${Comp}StateTokens? stateTokens(TanreiInteractionState state) => switch (state) {`,
      ...states.map((s) => `        TanreiInteractionState.${id(s)} => ${shape.perState.states.includes(s) ? id(s) : 'null'},`),
      '      };',
    );
  }
  out.push(...dataClass(`${Comp}Tokens`, fields, { doc: [`\`comp.${shape.name}.*\``], members }));
  return out;
}

export function emitDartVocabulary(ir) {
  const shapes = componentShapes(ir);
  const states = interactionStates(shapes);
  const measure = measureFields(ir).filter((m) => !m.added);
  const emphasis = typeEmphasisFields(ir);
  const out = [
    ...GENERATED_HEADER.map((l) => `// ${l}`),
    '//',
    '// VOCABULARY: the types every Tanrei design system fills in. The values of a system are generated',
    '// into their own file (`tanrei_system.g.dart` for the default system).',
    '// ignore_for_file: type=lint',
    '',
    "import 'package:flutter/foundation.dart' show ErrorDescription, FlutterError, FlutterErrorDetails, immutable;",
    "import 'package:flutter/painting.dart' show Color;",
    SUPPORT.replace('__ROLE_CONSTANTS__', ir.coreRoles.map((r) => `  static const ${id(r)} = TanreiColorRole(${str(r)});`).join('\n'))
      .replace('__SCHEME_PARAMS__', ir.schemes.map((k) => `    required TanreiPaint ${id(k)},`).join('\n'))
      .replace('__SCHEME_INIT__', ir.schemes.map((k) => `    required this.${id(k)},`).join('\n'))
      .replace('__SCHEME_FIELDS__', ir.schemes.map((k) => `  final TanreiPaint ${id(k)};`).join('\n'))
      .replace('__SCHEME_CASES__', ir.schemes.map((k) => `        TanreiScheme.${id(k)} => ${id(k)},`).join('\n'))
      .replace('__TYPE_FAMILIES__', TYPE_FAMILIES.map((f) => `  ${f},`).join('\n'))
      .replace('__TYPE_EMPHASIS_INIT__', emphasis.map((f) => `    required this.${f.name},`).join('\n'))
      .replace('__TYPE_EMPHASIS_FIELDS__', emphasis.map((f) => `  /// ${f.doc}\n  final ${f.type} ${f.name};`).join('\n\n'))
      .replace('__TYPE_EMPHASIS_CASES__', emphasis.map((f) => `        TanreiTypeFamily.${f.name} => ${f.name},`).join('\n'))
      .replace('__TYPE_EMPHASIS_COPY_PARAMS__', emphasis.map((f) => `    ${f.type}? ${f.name},`).join('\n'))
      .replace('__TYPE_EMPHASIS_COPY_ARGS__', emphasis.map((f) => `        ${f.name}: ${f.name} ?? this.${f.name},`).join('\n')),
    '/// The color schemes of a design system (theme × contrast), by key: the fields of [TanreiSchemes].',
    'enum TanreiScheme {',
    ...ir.schemes.map((k) => `  ${id(k)},`),
    '}',
    '',
    '/// The interaction state a component draws. Precedence is decided by the component (spec), the look of',
    '/// each state by the design system.',
    'enum TanreiInteractionState {',
    ...states.map((s) => `  ${id(s)},`),
    '}',
    '',
    ...colorsClass(ir),
    ...dataClass('TanreiSchemes', ir.schemes.map((s) => ({ name: id(s), type: 'TanreiColors' })), {
      doc: ['The color schemes of a design system: theme × contrast.'],
      members: ['  /// The colors of [scheme].', '  TanreiColors of(TanreiScheme scheme) => switch (scheme) {', ...ir.schemes.map((k) => `        TanreiScheme.${id(k)} => ${id(k)},`), '      };'],
    }),
    ...seriesClass(ir, 'TanreiTypescale', 'typescale', ir.typescale, 'TanreiTextStyle', {
      doc: [
        '`sys.typescale.*`: text styles by level — `display`, `heading1`…`heading6` (h1…h6), `bodyLarge` /',
        '`body` / `bodySmall` (lead, p, small), `label` / `labelSmall` / `caption` (text in and next to controls),',
        '`code` / `codeSmall`, `eyebrow`. [emphasis] holds the weight step `emphasized` text adds per family.',
      ],
      what: 'text style',
      also: [TYPESCALE_EMPHASIS],
    }),
    ...seriesClass(ir, 'TanreiShape', 'shape', ir.shape, 'double', {
      doc: ['`sys.shape.corner.*`: corner radii, in logical pixels, and how their curve eases ([cornerSmoothing]).'],
      what: 'corner radius',
      also: [SHAPE_CORNER_SMOOTHING],
    }),
    ...seriesClass(ir, 'TanreiSpace', 'space', ir.space, 'double', { doc: ['`sys.space.*`, in logical pixels.'], what: 'space step' }),
    ...seriesClass(ir, 'TanreiState', 'state', ir.state, 'double', { doc: ['`sys.state.*`: the opacities a design system may build its states from.'], what: 'state opacity' }),
    ...dataClass('TanreiMeasure', measure.map((m) => ({ name: m.name, type: 'double', doc: `\`sys.${m.group}.${m.key}\`` })), {
      doc: ['Borders, the focus indicator, minimum targets, icon sizes and the window widths at which a layout changes, in logical pixels.'],
      extra: seriesExtra('double'),
      members: seriesLookup('double', measure.map((m) => [m.step, m.name]), 'measure'),
    }),
    ...seriesClass(ir, 'TanreiDuration', 'duration', ir.duration, 'int', { doc: ['`sys.motion.duration.*`, in milliseconds.'], what: 'duration' }),
    ...seriesClass(ir, 'TanreiEasing', 'easing', ir.easing, 'TanreiCubicBezier', { doc: ['`sys.motion.easing.*`'], what: 'easing' }),
    ...dataClass('TanreiIconStyle', iconFields(ir).map(({ name, type, doc }) => ({ name, type, doc })), {
      doc: [
        'How icons are drawn: the icon font of each selection state and the values of its variable axes.',
        'An icon for something unselected is drawn in [familyUnselected] with [fillUnselected], the same icon in its',
        'selected state in [familySelected] with [fillSelected] — everywhere. A variable icon font is one family and',
        'two fills; a static icon set is two families, and the axes do nothing. The icon sizes are measures',
        '([TanreiMeasure.iconSmall], …).',
      ],
    }),
    ...behaviorChoices(ir).flatMap((c) => [
      `/// \`sys.behavior.${c.key}\`: a choice of kind. The first value is the default.`,
      `enum ${c.type} {`,
      ...c.values.map((v) => `  ${id(v)},`),
      '}',
      '',
    ]),
    ...dataClass('TanreiBehavior', behaviorChoices(ir).map((c) => ({ name: c.name, type: c.type, doc: `\`sys.behavior.${c.key}\`` })), {
      doc: ['`sys.behavior.*`: choices between a few named ways of behaving — what no value can express.', 'Components read them; they never branch on the id of a design system.'],
    }),
    ...dataClass('TanreiTypefaces', typefaceKeys(ir).map((k) => ({ name: id(k), type: 'TanreiFontStack', doc: `\`ref.typeface.${k}\`` })), {
      doc: ['`ref.typeface.*`: the typefaces of a design system as font stacks. Text styles carry their own stack', '([TanreiTextStyle.font]); these are for text outside the typescale (code in [mono], …).'],
    }),
    ...dataClass('TanreiSpring', coreSprings(ir, coreSpringSchemes(ir)[0]).map((k) => ({ name: id(k), type: 'TanreiSpringSpec' })), {
      doc: ['One spring scheme of `sys.motion.spring.*`.'],
      extra: seriesExtra('TanreiSpringSpec'),
      members: seriesLookup('TanreiSpringSpec', coreSprings(ir, coreSpringSchemes(ir)[0]).map((k) => [k, id(k)]), 'spring'),
    }),
    ...dataClass(
      'TanreiMotion',
      [
        { name: 'duration', type: 'TanreiDuration' },
        { name: 'easing', type: 'TanreiEasing' },
        ...coreSpringSchemes(ir).map((scheme) => ({ name: camel(['spring', scheme]), type: 'TanreiSpring', doc: `\`sys.motion.spring.${scheme}.*\`` })),
      ],
      {
        doc: ['`sys.motion.*`'],
        extra: { key: 'String', value: 'TanreiSpring', doc: ['The spring schemes a design system added to the core vocabulary, by scheme name.'] },
        members: [
          '  /// The spring scheme named [scheme] (`standard`, or one the design system added), or null when this system',
          '  /// does not have it.',
          '  TanreiSpring? spring(String scheme) => switch (scheme) {',
          ...coreSpringSchemes(ir).map((scheme) => `        ${str(scheme)} => ${camel(['spring', scheme])},`),
          '        _ => extra[scheme],',
          '      };',
        ],
      },
    ),
    ...seriesClass(ir, 'TanreiElevation', 'elevation', ir.elevation, 'List<TanreiShadowLayer>', {
      doc: ['`sys.elevation.*`. A level may start with a ring — a layer with no offset, no blur and a positive spread: render that one as a border, the rest as shadows. Not every system has one.'],
      what: 'elevation level',
    }),
    ...shapes.flatMap((shape) => componentClasses(shape, states)),
    ...dataClass(
      'TanreiSystem',
      [
        { name: 'id', type: 'String', doc: 'The id of the design system (`tokens/systems/<id>.system.json`).' },
        { name: 'intents', type: 'List<TanreiColorRole>', doc: 'The roles that come as a set of four (`x`, `on-x`, `x-container`, `on-x-container`).' },
        { name: 'schemes', type: 'TanreiSchemes' },
        { name: 'typescale', type: 'TanreiTypescale' },
        { name: 'shape', type: 'TanreiShape' },
        { name: 'space', type: 'TanreiSpace' },
        { name: 'state', type: 'TanreiState' },
        { name: 'measure', type: 'TanreiMeasure' },
        { name: 'typefaces', type: 'TanreiTypefaces' },
        { name: 'icon', type: 'TanreiIconStyle' },
        { name: 'behavior', type: 'TanreiBehavior' },
        { name: 'motion', type: 'TanreiMotion' },
        { name: 'elevation', type: 'TanreiElevation' },
        ...shapes.map((s) => ({ name: id(s.name), type: `Tanrei${pascal([s.name])}Tokens` })),
      ],
      {
        doc: [
          'One design system: every token a Tanrei widget reads. The theme carries an instance, so shipped',
          'presets and product-generated systems coexist. All parameters are required: a system',
          'generated against an older vocabulary fails to compile.',
        ],
      },
    ),
  ];
  return `${out.join('\n').trimEnd()}\n`;
}

// ── system values ───────────────────────────────────────────────────────
const textStyle = (t, role) =>
  `TanreiTextStyle(font: ${fontStackValue(t.font)}, size: ${d(t.size)}, weight: ${t.weight}, tracking: ${d(t.tracking)}, lineHeight: ${d(t.lineHeight)}, family: TanreiTypeFamily.${typeFamilyOf(t, role)})`;
const spring = (s) => `TanreiSpringSpec(damping: ${d(s.damping)}, stiffness: ${d(s.stiffness)}, easing: ${bezier(s.easing)}, durationMs: ${s.duration})`;

/** File name and constant name of a system: `tanrei` → `tanrei_system.g.dart`, `tanreiSystem`. */
export const dartSystemNames = (systemId) => ({
  file: `${systemId.replaceAll('-', '_')}_system.g.dart`,
  constant: `${id(systemId)}System`,
});

/**
 * @param {object} ir
 * @param {{ vocabularyRoles?: string[], vocabularyImport?: string }} [options] `vocabularyRoles` are the roles
 *   the vocabulary names (the default system's); any other role of this system goes into `TanreiColors.extra`.
 */
export function emitDartSystem(ir, { vocabularyRoles = ir.coreRoles, vocabularyImport = VOCABULARY_FILE } = {}) {
  const named = new Set(vocabularyRoles);
  const lacking = vocabularyRoles.filter((r) => !ir.roles.includes(r));
  if (lacking.length) throw new Error(`dart: system "${ir.system}" lacks vocabulary roles: ${lacking.join(', ')}`);
  const declared = ir.roles.filter((r) => !named.has(r));
  const role = (r) => (named.has(r) ? `TanreiColorRole.${id(r)}` : `TanreiColorRole(${str(r)})`);
  const paint = (p) => {
    if (p.kind === 'role') return `TanreiPaint.role(${role(p.role)})`;
    if (p.kind === 'mix') return `TanreiPaint.mix(${paint(p.base)}, ${paint(p.with)}, ${d(p.amount)})`;
    if (p.kind === 'alpha') return `TanreiPaint.alpha(${paint(p.of)}, ${d(p.amount)})`;
    if (p.kind === 'none') return 'TanreiPaint.none()';
    if (p.kind === 'literal') return `TanreiPaint.literal(${color(p)})`;
    if (p.kind === 'scheme') {
      const lacking = ir.schemes.filter((k) => !p.by[k]);
      if (lacking.length) throw new Error(`dart: a per-scheme paint lacks the schemes ${lacking.join(', ')}`);
      return `TanreiPaint.scheme(${ir.schemes.map((k) => `${id(k)}: ${paint(p.by[k])}`).join(', ')})`;
    }
    throw new Error(`dart: unknown paint kind "${p.kind}"`);
  };
  const typescaleRef = (k) => `_typescale${pascal([k])}`;
  const elevationRef = (k) => `_elevation${pascal([k])}`;
  const value = (t) => {
    if (t.type === 'color') return paint(t.paint);
    if (t.type === 'typography') return typescaleRef(t.typescale);
    if (t.type === 'shadow') return elevationRef(t.elevation);
    if (t.type === 'cubicBezier') return bezier(t.value);
    if (t.type === 'duration') return `${t.value}`;
    return d(t.value);
  };
  const { constant } = dartSystemNames(ir.system);
  const System = pascal([ir.system]);
  const springFields = ['damping', 'stiffness', 'easing', 'duration'];
  for (const [scheme, springs] of Object.entries(ir.spring)) {
    for (const [name, s] of Object.entries(springs)) {
      const lacking = springFields.filter((f) => s[f] === undefined);
      if (lacking.length) throw new Error(`dart: sys.motion.spring.${scheme}.${name} lacks ${lacking.join(', ')}`);
    }
  }

  /** One series: core steps by name; steps this system added go into `extra` — which is not mentioned otherwise. */
  const series = (ctor, name, obj, type, fmt, also = []) => {
    const added = Object.keys(obj).filter((k) => addedSteps(ir, name).has(k));
    return call(ctor, [
      ...coreSteps(ir, name, obj).map((k) => [id(k), fmt(obj[k], k)]),
      ...also,
      ...(added.length ? [['extra', map(`<String, ${type}>`, added.map((k) => [str(k), fmt(obj[k], k)]))]] : []),
    ]);
  };
  const measure = measureFields(ir);
  // `ref.typeface.*` is not a series a layer can extend: every system has the vocabulary's typefaces.
  const vocabularyTypefaces = typefaceKeys(ir);

  // Springs: the core names of a scheme by name, what a layer added in `extra` — like every other series.
  // A scheme a layer added is a whole `TanreiSpring`, so it values the core springs too.
  const springNames = coreSprings(ir, coreSpringSchemes(ir)[0]);
  const addedSpringSchemes = Object.keys(ir.spring).filter((scheme) => !coreSpringSchemes(ir).includes(scheme));
  const springScheme = (scheme) => {
    const lacking = springNames.filter((name) => !ir.spring[scheme][name]);
    if (lacking.length) throw new Error(`dart: sys.motion.spring.${scheme} lacks the core springs ${lacking.join(', ')}`);
    const added = Object.keys(ir.spring[scheme]).filter((name) => !springNames.includes(name));
    return call('TanreiSpring', [
      ...springNames.map((name) => [id(name), spring(ir.spring[scheme][name])]),
      ...(added.length ? [['extra', map('<String, TanreiSpringSpec>', added.map((name) => [str(name), spring(ir.spring[scheme][name])]))]] : []),
    ]);
  };

  const shapes = componentShapes(ir);
  /** How this file names the key of an axis value: the vocabulary's constant, or this system's own (see the extensions section). */
  const axisKey = (shape, a, v) => `${v.core ? axisNames(shape.name, a.axis).key : `${System}${pascal([shape.name])}${pascal([a.axis])}`}.${axisId(a.axis, v.key)}`;
  const axisValue = (shape, a, v) => {
    const names = axisNames(shape.name, a.axis);
    const group = (state, ctor) => call(ctor, a.members.map((m) => [id(m.name), value(a.tokens.get(v.key).get(state).get(m.name))]));
    return a.stateful ? call(names.tokens, a.states.map((s) => [id(s), group(s, names.stateTokens)])) : group(RESTING, names.tokens);
  };
  const component = (shape) => {
    const Comp = `Tanrei${pascal([shape.name])}`;
    return call(`${Comp}Tokens`, [
      ...shape.flat.map((t) => [id(t.name), value(t)]),
      ...shape.axes.map((a) => {
        const names = axisNames(shape.name, a.axis);
        const added = a.values.filter((v) => !v.core);
        return [
          names.field,
          call(names.holder, [
            ...a.values.filter((v) => v.core).map((v) => [axisId(a.axis, v.key), axisValue(shape, a, v)]),
            ...(added.length ? [['extra', map(`<${names.key}, ${names.tokens}>`, added.map((v) => [axisKey(shape, a, v), axisValue(shape, a, v)]))]] : []),
          ]),
        ];
      }),
      ...(shape.perState?.states ?? []).map((s) => [id(s), call(`${Comp}StateTokens`, shape.perState.parts.map((part) => [id(part), value(shape.perState.tokens.get(s).get(part))]))]),
    ]);
  };

  const system = call('TanreiSystem', [
    ['id', str(ir.system)],
    ['intents', `<TanreiColorRole>[${ir.intents.map(role).join(', ')}]`],
    [
      'schemes',
      call('TanreiSchemes', ir.schemes.map((scheme) => [
        id(scheme),
        call('TanreiColors', [
          ['scheme', `TanreiScheme.${id(scheme)}`],
          ...vocabularyRoles.map((r) => [id(r), color(ir.colors[scheme][r])]),
          ...(declared.length ? [['extra', `<TanreiColorRole, Color>{${declared.map((r) => `${role(r)}: ${color(ir.colors[scheme][r])}`).join(', ')}}`]] : []),
        ]),
      ])),
    ],
    [
      'typescale',
      series('TanreiTypescale', 'typescale', ir.typescale, 'TanreiTextStyle', (_, k) => typescaleRef(k), [
        [TYPESCALE_EMPHASIS.name, call('TanreiTypeEmphasis', typeEmphasisFields(ir).map((f) => [f.name, f.value]))],
      ]),
    ],
    ['shape', series('TanreiShape', 'shape', ir.shape, 'double', d, [[SHAPE_CORNER_SMOOTHING.name, cornerSmoothingValue(ir)]])],
    ['space', series('TanreiSpace', 'space', ir.space, 'double', d)],
    ['state', series('TanreiState', 'state', ir.state, 'double', d)],
    [
      'measure',
      call('TanreiMeasure', [
        ...measure.filter((m) => !m.added).map((m) => [m.name, d(ir.measure[m.group][m.key])]),
        ...(measure.some((m) => m.added) ? [['extra', map('<String, double>', measure.filter((m) => m.added).map((m) => [str(m.step), d(ir.measure[m.group][m.key])]))]] : []),
      ]),
    ],
    ['typefaces', call('TanreiTypefaces', vocabularyTypefaces.map((k) => [id(k), fontStackValue(ir.typefaces[k])]))],
    ['icon', call('TanreiIconStyle', iconFields(ir).map((f) => [f.name, f.value]))],
    ['behavior', call('TanreiBehavior', behaviorChoices(ir).map((c) => [c.name, `${c.type}.${id(c.value)}`]))],
    [
      'motion',
      call('TanreiMotion', [
        ['duration', series('TanreiDuration', 'duration', ir.duration, 'int', (v) => `${v}`)],
        ['easing', series('TanreiEasing', 'easing', ir.easing, 'TanreiCubicBezier', bezier)],
        ...coreSpringSchemes(ir).map((scheme) => [camel(['spring', scheme]), springScheme(scheme)]),
        ...(addedSpringSchemes.length ? [['extra', map('<String, TanreiSpring>', addedSpringSchemes.map((scheme) => [str(scheme), springScheme(scheme)]))]] : []),
      ]),
    ],
    ['elevation', series('TanreiElevation', 'elevation', ir.elevation, 'List<TanreiShadowLayer>', (_, k) => elevationRef(k))],
    ...shapes.map((shape) => [id(shape.name), component(shape)]),
  ]);

  // ── what this system ADDED to the vocabulary ── nothing below exists for a system that adds nothing.
  // Typed accessors belong to the system that DECLARED the extension. A system that inherits one (a product on a
  // preset, a preset on a preset) imports the declaring system's file for them; emitting them again would give two
  // extensions with the same getter and an ambiguity error wherever both are imported.
  const mine = (e) => !e.declaredBy || e.declaredBy === ir.system;
  const who = () => '';
  const accessors = [];
  for (const shape of shapes) {
    for (const a of shape.axes) {
      const added = a.values.filter((v) => !v.core && mine(v));
      if (!added.length) continue;
      const names = axisNames(shape.name, a.axis);
      const Keys = `${System}${pascal([shape.name])}${pascal([a.axis])}`;
      accessors.push(
        `/// The ${a.axis}s "${ir.system}" adds to ${shape.name}: \`Tanrei${pascal([shape.name])}(${id(a.axis)}: ${Keys}.${axisId(a.axis, added[0].key)})\`.`,
        `abstract final class ${Keys} {`,
        ...added.flatMap((v) => [`  /// \`comp.${shape.name}\` ${a.axis} \`${v.key}\`${who(v)}`, `  static const ${axisId(a.axis, v.key)} = ${names.key}(${str(v.key)});`]),
        '}',
        '',
        `extension ${Keys}s on ${names.holder} {`,
        ...added.flatMap((v) => [`  /// The tokens of the ${a.axis} \`${v.key}\`; in a design system without it, the default ${a.axis}'s.`, `  ${names.tokens} get ${axisId(a.axis, v.key)} => this[${Keys}.${axisId(a.axis, v.key)}];`]),
        '}',
        '',
      );
    }
  }
  const seriesHolders = [
    ['typescale', 'TanreiTypescale', 'TanreiTextStyle', 'typescale'],
    ['shape', 'TanreiShape', 'double', 'shape'],
    ['space', 'TanreiSpace', 'double', 'space'],
    ['state', 'TanreiState', 'double', 'state'],
    ['duration', 'TanreiDuration', 'int', 'motion.duration'],
    ['easing', 'TanreiEasing', 'TanreiCubicBezier', 'motion.easing'],
    ['elevation', 'TanreiElevation', 'List<TanreiShadowLayer>', 'elevation'],
  ];
  // A series accessor NEVER throws (the spirit of spec BTN-7). Read under ANOTHER design system (a preset
  // in one subtree, a product that did not take this layer) the step does not exist: the accessor answers with the
  // value THIS system — the one that declared the step — gives it, and debug builds report the lookup.
  const declaredValue = `_${id(ir.system)}Declared`;
  let declaredUsed = false;
  const step = (holder, path, e, key, name = id(key), what = holder[0], note = []) => {
    declaredUsed = true;
    return [
      `  /// \`${key}\`${who(e)}. In a design system without it: the value "${ir.system}" gives it (reported in debug builds).`,
      ...note.map((l) => `  /// ${l}`),
      `  ${holder[2]} get ${name} => this[${str(key)}] ?? ${declaredValue}(${str(what)}, ${str(key)}, ${constant}.${path}.extra[${str(key)}]!);`,
    ];
  };
  for (const holder of seriesHolders) {
    const added = (ir.extensions.series[holder[0]] ?? []).filter(mine);
    if (added.length) accessors.push(`extension ${System}${holder[1].slice('Tanrei'.length)} on ${holder[1]} {`, ...added.flatMap((e) => step(holder, holder[3], e, e.key)), '}', '');
  }
  if (measure.some((m) => m.added)) {
    const holder = ['measure', 'TanreiMeasure', 'double'];
    accessors.push(`extension ${System}Measure on TanreiMeasure {`, ...measure.filter((m) => m.added).flatMap((m) => step(holder, 'measure', ir.extensions.series[m.group].find((e) => e.key === m.key), m.step, m.name)), '}', '');
  }
  {
    // Springs this system added, by name. One accessor per name: it reads the scheme it is called on, and under a
    // system without the spring answers with this system's value — of the FIRST scheme that declares the name, in
    // the order the IR lists them. A `TanreiSpring` does not know which scheme it is (the same type serves every
    // scheme, and a product may build one by hand), so the fallback cannot follow the scheme; it is a fallback that
    // keeps an animation running, reported in debug builds, and the generated doc comment names the scheme.
    const names = new Map(); // name → { path: scheme path on the constant, scheme }
    for (const [key, declaredBy] of addedSprings(ir)) {
      const [scheme, name] = key.split('/');
      // The core springs of a scheme a layer added are named fields of its `TanreiSpring`, not extensions.
      if (!mine({ declaredBy }) || names.has(name) || springNames.includes(name)) continue;
      names.set(name, { scheme, path: coreSpringSchemes(ir).includes(scheme) ? `motion.${camel(['spring', scheme])}` : `motion.extra[${str(scheme)}]!` });
    }
    const holder = ['spring', 'TanreiSpring', 'TanreiSpringSpec'];
    const note = (scheme) => [
      `That value is the one of the \`${scheme}\` spring scheme — the first scheme of "${ir.system}" that declares the spring —`,
      'whichever scheme this is read from: a [TanreiSpring] does not know which scheme it is.',
    ];
    if (names.size) accessors.push(`extension ${System}Spring on TanreiSpring {`, ...[...names].flatMap(([name, { path, scheme }]) => step(holder, path, {}, name, id(name), holder[0], note(scheme))), '}', '');
  }
  // The typed accessor of a color role follows the same rule as a series step: it NEVER throws and never asserts.
  // Under a design system without the role it answers with the color THIS system gives the role in the SAME scheme
  // (`TanreiColors.scheme`; this file holds all six) and debug builds report the lookup. The untyped lookup
  // (`colors[role]`) cannot know who declared a role; it reports too, and answers with the `primary` slot.
  const addedRoles = ir.extensions.roles.filter(mine);
  if (addedRoles.length) {
    const unplaced = addedRoles.filter((e) => !declared.includes(e.key));
    if (unplaced.length) throw new Error(`dart: system "${ir.system}" adds the roles ${unplaced.map((e) => e.key).join(', ')}, which are vocabulary roles here: they have no place in TanreiColors.extra`);
    declaredUsed = true;
    accessors.push(
      `extension ${System}Colors on TanreiColors {`,
      ...addedRoles.flatMap((e) => [
        `  /// \`sys.color.${e.key}\`${who(e)}${e.onRole ? `; content on it uses \`${e.onRole}\`` : ''}. In a design system without it: the color "${ir.system}" gives it in the`,
        '  /// same scheme (reported in debug builds).',
        `  Color get ${id(e.key)} => extra[${System}ColorRoles.${id(e.key)}] ?? ${declaredValue}('color role', ${str(e.key)}, ${constant}.schemes.of(scheme).extra[${System}ColorRoles.${id(e.key)}]!);`,
      ]),
      '}',
      '',
    );
  }
  if (declaredUsed) {
    accessors.push(
      `T ${declaredValue}<T>(String kind, String key, T value) {`,
      '  assert(() {',
      `    debugTanreiReportUnknownValue(kind, key, ${str(`the value of "${ir.system}"`)});`,
      '    return true;',
      '  }());',
      '  return value;',
      '}',
      '',
    );
  }
  // A layer's OWN tokens are not part of TanreiSystem: one typed object per namespace, in the product's module.
  const own = [];
  for (const [namespace, tokens] of Object.entries(ir.extensions.own)) {
    const Ns = pascal([namespace]);
    const root = { children: new Map() };
    for (const t of tokens.filter((x) => !x.deprecated)) {
      // `acme.comp.rating.star.size` → rating.star.size: the `comp` tier is the default place; other tiers stay a level.
      const segments = t.id.split('.').slice(1);
      const at = segments[0] === 'comp' ? segments.slice(1) : segments;
      let node = root;
      at.forEach((segment, i) => {
        if (node.token) throw new Error(`dart: ${t.id}: "${at.slice(0, i).join('.')}" is both a token and a group`);
        node = node.children.get(segment) ?? node.children.set(segment, { children: new Map(), path: at.slice(0, i + 1), prefix: t.id.split('.').slice(0, t.id.split('.').length - at.length + i + 1).join('.') }).get(segment);
      });
      if (node.children.size || node.token) throw new Error(`dart: ${t.id} is both a token and a group, or is declared twice`);
      node.token = t;
    }
    const className = (node) => `${Ns}${node.path ? pascal(node.path) : ''}Tokens`;
    const classes = [];
    const construct = (node) => {
      const kids = [...node.children].sort(([x], [y]) => (x < y ? -1 : 1));
      classes.unshift(
        ...dataClass(
          className(node),
          kids.map(([k, child]) => (child.token ? { name: id(k), type: dartType(child.token, namespace), doc: `\`${child.token.id}\`` } : { name: id(k), type: className(child) })),
          { doc: [node.path ? `\`${node.prefix}.*\`` : `The tokens "${ir.system}" declares in its own namespace, \`${namespace}.*\`. They are not part of [TanreiSystem]:`, ...(node.path ? [] : [`read them from [${id(namespace)}Tokens]. Colors are [TanreiPaint]s — evaluate them with \`TanreiTheme.of(context).paint(...)\`.`])] },
        ),
      );
      return call(className(node), kids.map(([k, child]) => [id(k), child.token ? value(child.token) : construct(child)]));
    };
    const instance = construct(root);
    own.push(...classes, `/// The \`${namespace}.*\` tokens of "${ir.system}".`, `const ${Ns}Tokens ${id(namespace)}Tokens = ${print(instance)};`, '');
  }

  const out = [
    ...GENERATED_HEADER.map((l) => `// ${l}`),
    '//',
    `// SYSTEM VALUES: the "${ir.system}" design system as one const TanreiSystem.`,
    '// ignore_for_file: type=lint',
    '',
    ...(own.length ? ["import 'package:flutter/foundation.dart' show immutable;"] : []),
    "import 'package:flutter/painting.dart' show Color;",
    '',
    `import ${str(vocabularyImport)};`,
    '',
    '// sys.typescale — component tokens alias these.',
    ...Object.entries(ir.typescale).map(([k, v]) => `const TanreiTextStyle ${typescaleRef(k)} = ${textStyle(v, k)};`),
    '',
    '// sys.elevation — component tokens alias these. CSS box-shadow semantics: `blur` is the CSS blur radius.',
    ...Object.entries(ir.elevation).map(
      ([k, layers]) =>
        // An empty level (`level0`) draws nothing: an empty list, not a layer of zeros.
        layers.length
          ? `const List<TanreiShadowLayer> ${elevationRef(k)} = <TanreiShadowLayer>[\n${layers.map((l) => `  TanreiShadowLayer(${d(l.x)}, ${d(l.y)}, ${d(l.blur)}, ${d(l.spread)}, ${role(l.role)}),`).join('\n')}\n];`
          : `const List<TanreiShadowLayer> ${elevationRef(k)} = <TanreiShadowLayer>[];`,
    ),
    '',
    ...(declared.length
      ? [
          `/// The color roles the "${ir.system}" system declares beyond the vocabulary.`,
          `abstract final class ${pascal([ir.system])}ColorRoles {`,
          ...declared.map((r) => `  static const ${id(r)} = TanreiColorRole(${str(r)});`),
          '}',
          '',
        ]
      : []),
    `/// The "${ir.system}" design system. Pass it to \`TanreiThemeData(system: ...)\`.`,
    `const TanreiSystem ${constant} = ${print(system)};`,
    ...(accessors.length
      ? [
          '',
          '// ── VOCABULARY EXTENSIONS ────────────────────────────────────',
          `// What "${ir.system}" adds to the Tanrei vocabulary, typed. The values are in \`extra\` above; a design system that`,
          '// adds nothing has no such section.',
          '',
          ...accessors,
        ]
      : []),
    ...(own.length ? [...(accessors.length ? [] : ['']), '// ── OWN TOKENS ───────────────────────────────────────────────', '', ...own] : []),
  ];
  return `${out.join('\n').trimEnd()}\n`;
}

/** Both files of the default system, keyed by repo-relative path (the CLI writes each). */
/**
 * @param {{ vocabulary?: boolean, external?: boolean }} [options] `vocabulary: false` = only the values of this
 *   system. `external` = the file lives in a product's package and imports the published library.
 */
export function emitDart(ir, { vocabulary = true, external = false } = {}) {
  const files = { [`${OUT_DIR}/${dartSystemNames(ir.system).file}`]: emitDartSystem(ir, external ? { vocabularyImport: `package:${CONFIG.packages.pubPackage}/${CONFIG.packages.pubPackage}.dart` } : {}) };
  if (vocabulary && !external) files[`${OUT_DIR}/${VOCABULARY_FILE}`] = emitDartVocabulary(ir);
  return files;
}
