// Kotlin / Jetpack Compose emitter (native packages read every token through a system instance).
//
// Two kinds of output:
//   TanreiTokens.kt          the VOCABULARY — system-independent types (`TanreiSystem` and its parts,
//                            `TanreiPaint`, `TanreiColorRole`, per-component token classes). Every
//                            constructor parameter for a CORE token is required, so a product's stale
//                            generated system stops compiling when the vocabulary grows.
//   TanreiSystem<Id>.kt      the VALUES of one system, as `TanreiSystem.Companion.<Id>`. Other systems
//                            (presets, a product's own) are generated the same way into other files.
//
// Extensible vocabulary: core values are named members; what a design system ADDED — a step in a
// series, a value on a component axis — goes into the holder's `extra` map (default: empty), and that system's
// values file gains one section of typed accessors. A layer's own tokens (`acme.*`) become a separate typed
// object in the same file. A system without extensions generates none of this.
import { CONFIG, GENERATED_HEADER, camel, pascal } from '../model.js';

const LIBRARY_PACKAGE = `${CONFIG.packages.mavenGroup}.${CONFIG.namespace}`;
export const KOTLIN_PACKAGE = `${LIBRARY_PACKAGE}.tokens`;
const KOTLIN_DIR = `packages/compose/tanrei/src/main/kotlin/${KOTLIN_PACKAGE.replaceAll('.', '/')}`;

const P = (s) => pascal([s]);
const c = (s) => camel([s]);
const f = (n) => `${n}f`;
const dp = (n) => (n < 0 ? `(${n}).dp` : `${n}.dp`);
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
const color = ({ r, g, b, a }) => `Color(0x${hex2(a * 255)}${hex2(r)}${hex2(g)}${hex2(b)})`;
const bezier = (v) => `TanreiCubicBezier(x1 = ${f(v[0])}, y1 = ${f(v[1])}, x2 = ${f(v[2])}, y2 = ${f(v[3])})`;
// Roles of the vocabulary IR have generated constants; a palette only another system declares is a plain key.
let constantRoles = null;
// The schemes of the IR being emitted: what a per-scheme paint must name.
let paintSchemes = [];
const role = (r) => (!constantRoles || constantRoles.has(r) ? `TanreiColorRole.${P(r)}` : `TanreiColorRole("${r}")`);
// One reading of a font stack: the IR already split the CSS list into named families, a generic class and
// "the platform's own font comes first". The map is TOTAL over what the IR can answer (`GENERIC_KEYWORDS` in ir.js):
// Android has a face for sans-serif, serif, monospace and cursive; it has none for `fantasy`, `math` or `emoji`, which
// are DECIDED here to read as sans-serif (README "Fonts"). A value outside this map is a new IR value nobody decided
// about: the emitter stops with its name instead of guessing a face.
const GENERIC_FONT = { 'sans-serif': 'SansSerif', serif: 'Serif', monospace: 'Monospace', cursive: 'Cursive', fantasy: 'SansSerif', math: 'SansSerif', emoji: 'SansSerif' };
const fontStack = (font) => {
  if (!font || !Array.isArray(font.families) || typeof font.system !== 'boolean') throw new Error('kotlin: a font stack must come from the IR as { families, generic, system }');
  if (!Object.hasOwn(GENERIC_FONT, font.generic)) throw new Error(`kotlin: a font stack has the generic class "${font.generic}", which has no decided platform font (known: ${Object.keys(GENERIC_FONT).join(', ')}) — add it to GENERIC_FONT in emit/kotlin.js and to the README's table`);
  return `TanreiFontStack(families = listOf(${font.families.map((x) => JSON.stringify(x)).join(', ')}), generic = TanreiGenericFontFamily.${GENERIC_FONT[font.generic]}, system = ${font.system})`;
};
// Inside `typescale()` of a values file the distinct stacks are locals (`font1`…); everywhere else they are written out.
let fontLocals = null;
const fontRef = (font) => fontLocals?.get(JSON.stringify([font.families, font.generic, font.system])) ?? fontStack(font);
// The families `sys.typescale.emphasis.*` is set per, in the IR's order — what `TanreiTypeFamily` enumerates.
let typeFamilies = [];
/**
 * The family whose emphasis step a role takes is decided once by the token build and carried on the IR
 * (`ir.typescale[role].family`, from `typeFamily` in pure.js: the first segment of the name when it names a family,
 * `label` otherwise); the emitter never parses a role's key. It stops only when the IR's family is not one the
 * system has an emphasis step for — a shape error, not a naming rule.
 */
function typeFamilyOf(t, key) {
  if (!typeFamilies.includes(t.family)) throw new Error(`kotlin: the type role "${key}" has the family ${JSON.stringify(t.family)}, which has no step in sys.typescale.emphasis (${typeFamilies.join(', ')}) — ir.typescale[role].family must be one of them`);
  return t.family;
}
const textStyle = (t, _pad, key) =>
  `TanreiTextStyle(font = ${fontRef(t.font)}, size = ${t.size}.sp, weight = ${t.weight}, tracking = ${t.tracking}.sp, lineHeight = ${t.lineHeight}.sp, family = TanreiTypeFamily.${P(typeFamilyOf(t, key))})`;
const spring = (s) =>
  `TanreiSpringSpec(damping = ${f(s.damping)}, stiffness = ${f(s.stiffness)}, easing = ${bezier(s.easing)}, durationMs = ${s.duration})`;
const shadowLayers = (layers, pad) =>
  // `elevation.level0` is an empty list: nothing is drawn, and nothing is written.
  !layers.length ? 'emptyList()' : `listOf(\n${layers.map((l) => `${pad}    TanreiShadowLayer(x = ${dp(l.x)}, y = ${dp(l.y)}, blur = ${dp(l.blur)}, spread = ${dp(l.spread)}, role = ${role(l.role)}),`).join('\n')}\n${pad})`;

function paint(p) {
  if (p.kind === 'role') return `TanreiPaint.Role(${role(p.role)})`;
  if (p.kind === 'mix') return `TanreiPaint.Mix(base = ${paint(p.base)}, with = ${paint(p.with)}, amount = ${f(p.amount)})`;
  if (p.kind === 'alpha') return `TanreiPaint.Alpha(of = ${paint(p.of)}, amount = ${f(p.amount)})`;
  if (p.kind === 'none') return 'TanreiPaint.None';
  if (p.kind === 'literal') return `TanreiPaint.Literal(${color(p)})`;
  if (p.kind === 'scheme') {
    // A `tone` / `contrast-pick` rule that answers differently per scheme: one paint per scheme, all of them, by name.
    const lacking = paintSchemes.filter((k) => !p.by?.[k]);
    const unknown = Object.keys(p.by ?? {}).filter((k) => !paintSchemes.includes(k));
    if (lacking.length || unknown.length) throw new Error(`kotlin: a per-scheme paint must name exactly the schemes ${paintSchemes.join(', ')}${lacking.length ? ` — lacking: ${lacking.join(', ')}` : ''}${unknown.length ? ` — unknown: ${unknown.join(', ')}` : ''}`);
    return `TanreiPaint.Scheme(${paintSchemes.map((k) => `${c(k)} = ${paint(p.by[k])}`).join(', ')})`;
  }
  throw new Error(`kotlin: unknown paint kind "${p.kind}"`);
}

// ── component token structure ───────────────────────────────────────────

const STATE_ORDER = ['hovered', 'focused', 'pressed', 'disabled'];
const RESTING = 'enabled';

/** Kotlin type of a component token. */
function kotlinType(t) {
  if (t.type === 'color') return 'TanreiPaint';
  if (t.type === 'typography') return 'TanreiTextStyle';
  if (t.type === 'shadow') return 'List<TanreiShadowLayer>';
  if (t.type === 'dimension') return 'Dp';
  if (t.type === 'duration') return 'Int';
  if (t.type === 'cubicBezier') return 'TanreiCubicBezier';
  if (t.type === 'number') return 'Float';
  throw new Error(`kotlin: token ${t.name} has unsupported type "${t.type}"`);
}

// Steps of `typescale` / `elevation` the system being emitted ADDED: they live in `extra`, not in a field.
let addedSteps = null;
const stepRef = (series, key) => (addedSteps?.[series]?.has(key) ? `${series}.extra.getValue("${key}")` : `${series}.${c(key)}`);

function kotlinValue(t) {
  if (t.type === 'color') return paint(t.paint);
  if (t.type === 'typography') return stepRef('typescale', t.typescale);
  if (t.type === 'shadow') return stepRef('elevation', t.elevation);
  if (t.type === 'dimension') return dp(t.value);
  if (t.type === 'duration') return `${t.value}`;
  if (t.type === 'cubicBezier') return bezier(t.value);
  return f(t.value);
}

/** Every interaction state any component declares, resting state first. */
function allStates(ir) {
  const found = new Set(Object.values(ir.componentTokens).flatMap((ts) => ts.filter((t) => t.state).map((t) => t.state)));
  return [RESTING, ...STATE_ORDER.filter((s) => found.has(s)), ...[...found].filter((s) => !STATE_ORDER.includes(s)).sort()];
}

/**
 * The Kotlin identifier of an axis value. A key that is not an identifier (`3x`) is prefixed with its axis
 * (`size3x` / `Size3x`); as a KEY it stays the plain string.
 */
const axisIdent = (axis, key) => {
  const clean = key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return /^[A-Za-z]/.test(clean) ? clean : `${axis}-${clean}`;
};
const RESERVED_MEMBERS = new Set(['extra', 'keys']);

/**
 * A component's tokens, placed by the IR (`axis` / `key` / `member` / `state` — names are never parsed):
 *   on an axis        → axes[axis].byKey[key][state][member]   (`sizes[size]`, `variants[variant][state]`)
 *   per state, shared → perState[state][part]                  (resting value: the flat token `<part>`, when it exists)
 *   everything else   → a flat member.
 */
function structure(component, tokens, declaredAxes = {}) {
  const byName = new Map(tokens.map((t) => [t.name, t]));
  const perState = new Map(); // state → part → token
  const flat = [];
  const axes = Object.entries(declaredAxes).map(([axis, d]) => ({
    axis,
    default: d.default,
    values: d.values,
    members: d.members.map((m) => m.name),
    sample: new Map(), // member → a token of it (for its type)
    byKey: new Map(d.values.map((v) => [v.key, new Map()])), // key → state → member → token
  }));
  const at = (map, key) => map.get(key) ?? map.set(key, new Map()).get(key);
  for (const t of tokens) {
    if (t.axis) {
      const byState = axes.find((a) => a.axis === t.axis)?.byKey.get(t.key);
      if (!byState) throw new Error(`kotlin: ${component}.${t.name} is placed on ${t.axis}/${t.key}, which the component's axes do not declare`);
      at(byState, t.state ?? RESTING).set(t.member, t);
    } else if (t.state) {
      if (!t.name.startsWith(`${t.state}-`)) throw new Error(`kotlin: ${component}.${t.name} does not name its state "${t.state}"`);
      at(perState, t.state).set(t.name.slice(t.state.length + 1), t);
    } else flat.push(t);
  }
  const states = STATE_ORDER.filter((s) => perState.has(s) || axes.some((a) => [...a.byKey.values()].some((byState) => byState.has(s))));
  for (const a of axes) {
    a.stateful = [...a.byKey.values()].some((byState) => [...byState.keys()].some((s) => s !== RESTING));
    if (!a.values.some((v) => v.key === a.default && v.core)) throw new Error(`kotlin: ${component}.${a.axis} defaults to "${a.default}", which is not a core value`);
    for (const v of a.values) {
      if (v.core && RESERVED_MEMBERS.has(c(axisIdent(a.axis, v.key)))) throw new Error(`kotlin: ${component}.${a.axis} value "${v.key}" collides with a member of the generated holder`);
      for (const st of a.stateful ? [RESTING, ...states] : [RESTING]) {
        const have = a.byKey.get(v.key).get(st) ?? new Map();
        const lacking = a.members.filter((m) => !have.has(m));
        if (lacking.length || have.size !== a.members.length) throw new Error(`kotlin: ${component} ${a.axis} "${v.key}" (${st}) does not have exactly the axis members; lacking: ${lacking.join(', ') || '—'}`);
        for (const [m, t] of have) if (!a.sample.has(m)) a.sample.set(m, t);
      }
    }
  }
  const stateParts = (() => {
    const sets = [...perState.values()].map((m) => [...m.keys()].sort().join(' '));
    if (new Set(sets).size > 1) throw new Error(`kotlin: ${component} states do not all have the same tokens: ${[...new Set(sets)].join(' | ')}`);
    return perState.size ? [...perState.values().next().value.keys()].sort() : [];
  })();
  return { component, flat, byName, states, axes, perState, stateParts };
}

/** The generated names of one axis of one component. */
function axisNames(s, a) {
  const C = `Tanrei${P(s.component)}`;
  return { key: `${C}${P(a.axis)}`, group: `${C}${P(a.axis)}Tokens`, stateGroup: `${C}${P(a.axis)}StateTokens`, holder: `${C}${P(a.axis)}s`, member: `${c(a.axis)}s` };
}

const rolesOf = (expr, t) => (t.type === 'color' ? `addAll(${expr}.roles())` : t.type === 'shadow' ? `${expr}.forEach { add(it.role) }` : null);

function axisClasses(s, a, everyState) {
  const n = axisNames(s, a);
  const core = a.values.filter((v) => v.core);
  const members = a.members.map((m) => ({ name: c(m), token: a.sample.get(m) }));
  const memberRoles = members.map((m) => rolesOf(m.name, m.token)).filter(Boolean);
  const readsRoles = memberRoles.length > 0;
  const referenced = (lines) => (readsRoles ? [') {', '    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {', ...lines.map((l) => `        ${l}`), '    }', '}', ''] : [')', '']);
  const out = [
    '/**',
    ` * A ${a.axis} of ${s.component}: the key of one entry of [${n.holder}]. The set is OPEN — the constants are the core`,
    ` * values every design system has, and a system may add more, so this is a string key, not an enum.`,
    ` * A key the current system does not have draws as [${P(axisIdent(a.axis, a.default))}].`,
    ' */',
    '@JvmInline',
    `public value class ${n.key}(public val key: String) {`,
    '    override fun toString(): String = key',
    '',
    '    public companion object {',
    ...core.map((v) => `        public val ${P(axisIdent(a.axis, v.key))}: ${n.key} = ${n.key}("${v.key}")`),
    '    }',
    '}',
    '',
  ];
  if (a.stateful) {
    const present = [RESTING, ...s.states];
    out.push(
      `/** What one ${a.axis} of ${s.component} draws in one interaction state. */`,
      '@Immutable',
      `public data class ${n.stateGroup}(`,
      ...members.map((m) => `    public val ${m.name}: ${kotlinType(m.token)},`),
      ...referenced(memberRoles),
      `/** One ${a.axis} of ${s.component}: a full set of tokens per interaction state. */`,
      '@Immutable',
      `public data class ${n.group}(`,
      ...present.map((st) => `    public val ${c(st)}: ${n.stateGroup},`),
      ') {',
      `    public operator fun get(state: TanreiInteractionState): ${n.stateGroup} = when (state) {`,
      ...everyState.map((st) => `        TanreiInteractionState.${P(st)} -> ${c(present.includes(st) ? st : RESTING)}`),
      '    }',
      ...(readsRoles ? ['', `    public fun referencedRoles(): Set<TanreiColorRole> = ${present.map((st) => `${c(st)}.referencedRoles()`).join(' + ')}`] : []),
      '}',
      '',
    );
  } else {
    out.push(`/** The tokens of one ${a.axis} of ${s.component}. */`, '@Immutable', `public data class ${n.group}(`, ...members.map((m) => `    public val ${m.name}: ${kotlinType(m.token)},`), ...referenced(memberRoles));
  }
  const fields = core.map((v) => c(axisIdent(a.axis, v.key)));
  out.push(
    '/**',
    ` * Every ${a.axis} of ${s.component}: a named member per core value, plus [extra] for the values a design system added.`,
    ' */',
    '@Immutable',
    `public data class ${n.holder}(`,
    ...fields.map((name) => `    public val ${name}: ${n.group},`),
    `    /** Values a design system added to the vocabulary, by key. */`,
    `    public val extra: Map<${n.key}, ${n.group}> = emptyMap(),`,
    ') {',
    '    /** Every key this system has, core values first. */',
    `    public val keys: Set<${n.key}> get() = linkedSetOf(${core.map((v) => `${n.key}.${P(axisIdent(a.axis, v.key))}`).join(', ')}) + extra.keys`,
    '',
    `    public operator fun contains(key: ${n.key}): Boolean = find(key) != null`,
    '',
    '    /** The tokens of [key], or null when this system does not have it. */',
    `    public fun find(key: ${n.key}): ${n.group}? = when (key) {`,
    ...core.map((v) => `        ${n.key}.${P(axisIdent(a.axis, v.key))} -> ${c(axisIdent(a.axis, v.key))}`),
    '        else -> extra[key]',
    '    }',
    '',
    `    /** TOTAL: a key this system does not have reads the default value, [${c(axisIdent(a.axis, a.default))}]. Components report such a key in debuggable apps. */`,
    `    public operator fun get(key: ${n.key}): ${n.group} = find(key) ?: ${c(axisIdent(a.axis, a.default))}`,
    ...(readsRoles ? ['', '    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {', ...fields.map((name) => `        addAll(${name}.referencedRoles())`), '        extra.values.forEach { addAll(it.referencedRoles()) }', '    }'] : []),
    '}',
    '',
  );
  return { lines: out, readsRoles };
}

function componentClasses(s, everyState) {
  const C = `Tanrei${P(s.component)}`;
  const out = [];
  const axisRoles = [];
  for (const a of s.axes) {
    const { lines, readsRoles } = axisClasses(s, a, everyState);
    out.push(...lines);
    if (readsRoles) axisRoles.push(axisNames(s, a).member);
  }
  if (s.perState.size) {
    const parts = s.perState.values().next().value;
    out.push(
      `/** What every variant of ${s.component} shares in one interaction state. */`,
      '@Immutable',
      `public data class ${C}StateTokens(`,
      ...s.stateParts.map((p) => `    public val ${c(p)}: ${kotlinType(parts.get(p))},`),
      ')',
      '',
    );
  }

  const members = [
    ...s.flat.map((t) => `    public val ${c(t.name)}: ${kotlinType(t)},`),
    ...s.states.filter((st) => s.perState.has(st)).map((st) => `    public val ${c(st)}: ${C}StateTokens,`),
    ...s.axes.map((a) => `    public val ${axisNames(s, a).member}: ${axisNames(s, a).holder},`),
  ];
  const body = [];
  for (const part of s.stateParts) {
    const t = s.perState.values().next().value.get(part);
    const base = s.byName.get(part);
    // WORKAROUND: the vocabulary has no resting `opacity` token (the web leaves the property unset).
    // "Not dimmed" is the identity, not a design value, so the accessor supplies it.
    if (!base && part !== 'opacity') throw new Error(`kotlin: ${s.component}.${part} has per-state tokens but no resting token`);
    const resting = base ? c(part) : '1f';
    body.push(
      `    /** \`${part}\` of [state]${base ? '' : '; the resting state has no such token and is never dimmed'}. */`,
      `    public fun ${c(part)}(state: TanreiInteractionState): ${kotlinType(t)} = when (state) {`,
      ...everyState.map((st) => `        TanreiInteractionState.${P(st)} -> ${s.perState.has(st) ? `${c(st)}.${c(part)}` : resting}`),
      '    }',
      '',
    );
  }
  const flatRoles = s.flat.map((t) => rolesOf(c(t.name), t)).filter(Boolean);
  body.push(
    '    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {',
    ...flatRoles.map((l) => `        ${l}`),
    ...axisRoles.map((m) => `        addAll(${m}.referencedRoles())`),
    '    }',
  );
  out.push(
    `/** \`comp.${s.component}\`. Members are flat tokens, then per-state tokens, then one holder per axis (${s.axes.map((a) => `\`${axisNames(s, a).member}[${c(a.axis)}]\``).join(', ')}). */`,
    '@Immutable',
    `public data class ${C}Tokens(`,
    ...members,
    ') {',
    ...body,
    '}',
    '',
  );
  return out;
}

/** The constructor call of one axis value's token group. */
function axisGroupValue(s, a, key, pad) {
  const n = axisNames(s, a);
  const byState = a.byKey.get(key);
  if (!a.stateful) return `${n.group}(${a.members.map((m) => `${c(m)} = ${kotlinValue(byState.get(RESTING).get(m))}`).join(', ')})`;
  const lines = [`${n.group}(`];
  for (const st of [RESTING, ...s.states]) {
    lines.push(`${pad}    ${c(st)} = ${n.stateGroup}(`);
    for (const m of a.members) lines.push(`${pad}        ${c(m)} = ${kotlinValue(byState.get(st).get(m))},`);
    lines.push(`${pad}    ),`);
  }
  lines.push(`${pad})`);
  return lines.join('\n');
}

function componentValue(s, pad) {
  const C = `Tanrei${P(s.component)}`;
  const lines = [`${C}Tokens(`];
  for (const t of s.flat) lines.push(`${pad}    ${c(t.name)} = ${kotlinValue(t)},`);
  for (const st of s.states.filter((x) => s.perState.has(x))) {
    const parts = s.perState.get(st);
    lines.push(`${pad}    ${c(st)} = ${C}StateTokens(${s.stateParts.map((p) => `${c(p)} = ${kotlinValue(parts.get(p))}`).join(', ')}),`);
  }
  for (const a of s.axes) {
    const n = axisNames(s, a);
    const added = a.values.filter((v) => !v.core);
    lines.push(`${pad}    ${n.member} = ${n.holder}(`);
    for (const v of a.values.filter((x) => x.core)) lines.push(`${pad}        ${c(axisIdent(a.axis, v.key))} = ${axisGroupValue(s, a, v.key, `${pad}        `)},`);
    if (added.length) {
      lines.push(`${pad}        extra = mapOf(`);
      for (const v of added) lines.push(`${pad}            ${n.key}("${v.key}") to ${axisGroupValue(s, a, v.key, `${pad}            `)},`);
      lines.push(`${pad}        ),`);
    }
    lines.push(`${pad}    ),`);
  }
  lines.push(`${pad})`);
  return lines.join('\n');
}

// ── vocabulary ──────────────────────────────────────────────────────────

const SUPPORT = `
/**
 * A color role: the key of one color in a scheme. The set is OPEN — every system has the core roles, and
 * a system may declare more palettes (for example \`tertiary\`), so a role is a string key, not an enum.
 * The constants are the roles of the default system.
 */
@JvmInline
public value class TanreiColorRole(public val key: String) {
    override fun toString(): String = key

    public companion object {
__ROLE_CONSTANTS__
    }
}

/** One scheme: theme × contrast. [key] is its name in the token files. */
public enum class TanreiScheme(public val key: String) {
__SCHEME_ENTRIES__
}

/**
 * Every color role of one scheme (theme × contrast). It knows WHICH scheme it is ([scheme]), so that a paint whose
 * rule answers differently from scheme to scheme ([TanreiPaint.Scheme]) evaluates against it like any other paint.
 */
@Immutable
public class TanreiColors(public val scheme: TanreiScheme, private val values: Map<TanreiColorRole, Color>) {
    public val roles: Set<TanreiColorRole> get() = values.keys

    public operator fun contains(role: TanreiColorRole): Boolean = role in values

    /**
     * The color of [role]. A role this scheme does not have (a component token of another system naming
     * a palette this system never declared) falls back to the matching slot of the \`primary\` palette,
     * so content stays readable on its container — and, in a debuggable app, is reported once per scheme through
     * [TanreiDiagnostics.missingRole], as the other platforms do. [TanreiSystem.unknownRoles] is the check
     * \`TanreiTheme\` runs ahead of time. A scheme without even \`primary\` draws nothing (transparent).
     */
    public operator fun get(role: TanreiColorRole): Color = values[role] ?: missing(role)

    private fun missing(role: TanreiColorRole): Color {
        val fallback = fallbackOf(role)
        TanreiDiagnostics.missingRole(scheme.key, role.key, fallback.key)
        return values[fallback] ?: values[TanreiColorRole.Primary] ?: Color.Transparent
    }

    /** This scheme with some roles replaced or added. It stays the same [scheme]. */
    public fun copy(vararg overrides: Pair<TanreiColorRole, Color>): TanreiColors = TanreiColors(scheme, values + overrides)

    override fun equals(other: Any?): Boolean = other is TanreiColors && other.scheme == scheme && other.values == values

    override fun hashCode(): Int = 31 * scheme.hashCode() + values.hashCode()

    override fun toString(): String = "TanreiColors($scheme, $values)"

    private fun fallbackOf(role: TanreiColorRole): TanreiColorRole {
        val on = role.key.startsWith("on-")
        val container = role.key.endsWith("-container")
        return when {
            on && container -> TanreiColorRole.OnPrimaryContainer
            container -> TanreiColorRole.PrimaryContainer
            on -> TanreiColorRole.OnPrimary
            else -> TanreiColorRole.Primary
        }
    }
}

/**
 * How a component color is described WITHOUT resolving the scheme. It is evaluated at runtime against
 * the current scheme's [TanreiColors], so component tokens are scheme-independent.
 */
@Immutable
public sealed interface TanreiPaint {
    public fun resolve(colors: TanreiColors): Color

    /** Every role this paint reads. */
    public fun roles(): Set<TanreiColorRole>

    /** A color role of the current scheme. */
    public data class Role(public val role: TanreiColorRole) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = colors[role]

        override fun roles(): Set<TanreiColorRole> = setOf(role)
    }

    /** Premultiplied interpolation from [base] to [with] — identical to CSS \`color-mix(in srgb, base, with amount)\`. */
    public data class Mix(public val base: TanreiPaint, public val with: TanreiPaint, public val amount: Float) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color {
            val from = base.resolve(colors)
            val to = with.resolve(colors)
            val t = amount.coerceIn(0f, 1f)
            val alpha = from.alpha * (1f - t) + to.alpha * t
            if (alpha == 0f) return Color.Transparent
            fun channel(a: Float, b: Float): Float = (a * from.alpha * (1f - t) + b * to.alpha * t) / alpha
            return Color(channel(from.red, to.red), channel(from.green, to.green), channel(from.blue, to.blue), alpha)
        }

        override fun roles(): Set<TanreiColorRole> = base.roles() + with.roles()
    }

    /** [of] with its alpha multiplied by [amount]. */
    public data class Alpha(public val of: TanreiPaint, public val amount: Float) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = of.resolve(colors).let { it.copy(alpha = it.alpha * amount) }

        override fun roles(): Set<TanreiColorRole> = of.roles()
    }

    /** Nothing is drawn. */
    public data object None : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = Color.Transparent

        override fun roles(): Set<TanreiColorRole> = emptySet()
    }

    /** A fixed color, the same in every scheme. */
    public data class Literal(public val color: Color) : TanreiPaint {
        override fun resolve(colors: TanreiColors): Color = color

        override fun roles(): Set<TanreiColorRole> = emptySet()
    }

    /**
     * One paint per scheme: a component color whose rule (\`tone\`, \`contrast-pick\`) answers with a different role or
     * literal from scheme to scheme, so no single paint describes it. Evaluated as the paint of [TanreiColors.scheme];
     * it composes — a [Mix] or [Alpha] of it follows the scheme too.
     */
    public data class Scheme(
__SCHEME_PAINT_MEMBERS__
    ) : TanreiPaint {
        /** The paint of [scheme]. */
        public fun of(scheme: TanreiScheme): TanreiPaint = when (scheme) {
__SCHEME_PAINT_CASES__
        }

        override fun resolve(colors: TanreiColors): Color = of(colors.scheme).resolve(colors)

        override fun roles(): Set<TanreiColorRole> = buildSet { TanreiScheme.entries.forEach { addAll(of(it).roles()) } }
    }
}

/** What a font stack falls back to when none of its named families is available: a class of platform font. */
public enum class TanreiGenericFontFamily { SansSerif, Serif, Monospace, Cursive }

/**
 * A font stack, read ONCE by the token build instead of being parsed as CSS on every platform.
 * Tanrei names fonts and never bundles them: [families] are the NAMED families, in order, that a product may
 * install or register; [generic] is the class of platform font to use when none of them is available; [system]
 * says the stack asks for the platform's own font of that class BEFORE any named family.
 */
@Immutable
public data class TanreiFontStack(
    public val families: List<String>,
    public val generic: TanreiGenericFontFamily,
    public val system: Boolean,
)

/** The named typefaces of a design system (\`ref.typeface.*\`), each as one [TanreiFontStack]. */
@Immutable
public data class TanreiTypefaces(
__TYPEFACE_MEMBERS__
)

/** The families of the type scale. \`emphasis\` is a weight step per family. */
public enum class TanreiTypeFamily { __TYPE_FAMILIES__ }

/**
 * \`sys.typescale.emphasis.*\`: how much weight \`emphasized\` text gains, per family. There are no
 * emphasized roles — [TanreiTextStyle.emphasized] adds the step of the style's [TanreiTextStyle.family].
 */
@Immutable
public data class TanreiTypeEmphasis(
__TYPE_EMPHASIS_MEMBERS__
) {
    /** The weight step of [family]. */
    public operator fun get(family: TanreiTypeFamily): Int = when (family) {
__TYPE_EMPHASIS_CASES__
    }
}

@Immutable
public data class TanreiTextStyle(
    public val font: TanreiFontStack,
    public val size: TextUnit,
    /** Numeric weight on the 1–1000 axis (variable fonts may use in-between values such as 450). */
    public val weight: Int,
    public val tracking: TextUnit,
    public val lineHeight: TextUnit,
    /** The family whose \`emphasis\` step this role takes: decided by the token build, not by the name here. */
    public val family: TanreiTypeFamily,
) {
    /** This style stressed: the same role at [weight] plus its family's step of [emphasis]. */
    public fun emphasized(emphasis: TanreiTypeEmphasis): TanreiTextStyle = copy(weight = weight + emphasis[family])
}

/**
 * How icons are drawn. An icon SET is a font family per selection state: a variable icon font
 * (Material Symbols) names the same family twice and tells the states apart with its \`FILL\` axis; a static set
 * (Material Icons Outlined / Material Icons) names two families, and the axes are harmless. The fonts are named,
 * not bundled. Read a state through [family] and [fill]; icon sizes are in [TanreiMeasure].
 */
@Immutable
public data class TanreiIconStyle(
    /** The family that draws an icon whose subject is NOT selected. */
    public val unselected: TanreiFontStack,
    /** The family that draws an icon whose subject is selected. */
    public val selected: TanreiFontStack,
    /** Numeric weight on the font's \`wght\` axis. */
    public val weight: Int,
    /** Numeric weight of a control's own mark (\`sys.icon.mark.weight\`): a checkbox's check, the glyph on a switch's handle. */
    public val markWeight: Int,
    public val fillUnselected: Float,
    public val fillSelected: Float,
    /** The smallest \`opsz\` the icon font draws (\`sys.icon.optical-size.min\`); a smaller box is drawn at it. */
    public val opticalSizeMin: Float,
    /** The largest \`opsz\` the icon font draws (\`sys.icon.optical-size.max\`); a larger box is drawn at it. */
    public val opticalSizeMax: Float,
) {
    /** The icon font of an icon whose subject is [selected] or not. */
    public fun family(selected: Boolean): TanreiFontStack = if (selected) this.selected else unselected

    /** The \`FILL\` of an icon whose subject is [selected] or not. */
    public fun fill(selected: Boolean): Float = if (selected) fillSelected else fillUnselected
}

@Immutable
public data class TanreiCubicBezier(public val x1: Float, public val y1: Float, public val x2: Float, public val y2: Float)

@Immutable
public data class TanreiSpringSpec(
    public val damping: Float,
    public val stiffness: Float,
    /** Fallback for contexts without spring animation. */
    public val easing: TanreiCubicBezier,
    public val durationMs: Int,
)

/**
 * One layer of an elevation level, with CSS \`box-shadow\` semantics: [blur] is the CSS blur radius —
 * the Gaussian's standard deviation is blur / 2 — and [spread] grows the shadow's shape on every side before it is
 * blurred. The library converts both to what Android draws in ONE place (\`primitives/TanreiElevation.kt\`).
 */
@Immutable
public data class TanreiShadowLayer(public val x: Dp, public val y: Dp, public val blur: Dp, public val spread: Dp, public val role: TanreiColorRole)
`;

const dataClass = (name, members, doc) => [...(doc ? [`/** ${doc} */`] : []), '@Immutable', `public data class ${name}(`, ...members.map((m) => `    public val ${m},`), ')', ''];

let externalPackage = null;
const fileHeader = (imports) => [
  ...GENERATED_HEADER.map((l) => `// ${l}`),
  '@file:Suppress("unused", "MagicNumber", "MaxLineLength", "LongParameterList", "LargeClass", "LongMethod")',
  '',
  `package ${externalPackage ?? KOTLIN_PACKAGE}`,
  '',
  ...[...imports, ...(externalPackage ? [`${KOTLIN_PACKAGE}.*`] : [])].map((i) => `import ${i}`),
];

/**
 * How icons are drawn (`ref.typeface.icon`, `sys.icon.weight`, `sys.icon.fill.*`): core vocabulary, so every
 * member is required. Icon SIZES stay in `measure` (`iconSmall`…).
 */
const ICON_MEMBERS = ['weight', 'mark-weight', 'fill-unselected', 'fill-selected', 'optical-size-min', 'optical-size-max'];
function iconStyle(ir) {
  const lacking = [...ICON_MEMBERS.filter((k) => ir.icon?.[k] === undefined), ...['unselected', 'selected'].filter((k) => !ir.iconFamilies?.[k]).map((k) => `family.${k}`)];
  if (lacking.length) throw new Error(`kotlin: system "${ir.system}" lacks icon style tokens: ${lacking.join(', ')}`);
  // `ir.icon.family` repeats iconFamilies.unselected for an emitter that reads one icon family.
  const unknown = Object.keys(ir.icon).filter((k) => k !== 'family' && !ICON_MEMBERS.includes(k));
  if (unknown.length) throw new Error(`kotlin: sys.icon has number tokens this emitter does not place: ${unknown.join(', ')}`);
  if (!Number.isInteger(ir.icon.weight) || !Number.isInteger(ir.icon['mark-weight'])) throw new Error('kotlin: icon weight must be an integer');
  return [
    'TanreiIconStyle(',
    `    unselected = ${fontStack(ir.iconFamilies.unselected)},`,
    `    selected = ${fontStack(ir.iconFamilies.selected)},`,
    `    weight = ${ir.icon.weight},`,
    `    markWeight = ${ir.icon['mark-weight']},`,
    `    fillUnselected = ${f(ir.icon['fill-unselected'])},`,
    `    fillSelected = ${f(ir.icon['fill-selected'])},`,
    `    opticalSizeMin = ${f(ir.icon['optical-size-min'])},`,
    `    opticalSizeMax = ${f(ir.icon['optical-size-max'])},`,
    ')',
  ];
}

/**
 * Choices of kind (`sys.behavior.*`): one enum per choice, named after the token, and one holder. The
 * number the token carries in DTCG never reaches Kotlin. The names are vocabulary: a layer chooses, it does not add.
 */
const behaviorEnum = (key) => `Tanrei${P(key)}`;
function behaviorClasses(ir) {
  const entries = Object.entries(ir.behavior);
  if (!entries.length) throw new Error('kotlin: the IR has no sys.behavior choices');
  return [
    ...entries.flatMap(([key, b]) => [
      `/** \`sys.behavior.${key}\`. The first value is the default, and what a platform that cannot draw a choice falls back to. */`,
      `public enum class ${behaviorEnum(key)} { ${b.values.map(P).join(', ')} }`,
      '',
    ]),
    ...dataClass('TanreiBehavior', entries.map(([key]) => `${c(key)}: ${behaviorEnum(key)}`), 'Choices of kind: what no amount can express. Components read them and never branch on a system\'s id.'),
  ];
}
function behaviorValue(ir) {
  return `TanreiBehavior(${Object.entries(ir.behavior).map(([key, b]) => `${c(key)} = ${behaviorEnum(key)}.${P(b.value)}`).join(', ')})`;
}

const measureEntries = (ir) =>
  Object.entries(ir.measure).flatMap(([group, values]) =>
    Object.entries(values).map(([key, value]) => [`${group}-${key}`, value]),
  );

/**
 * Spring sets (`sys.motion.spring.<scheme>.<name>`) are a series too: core names are members, added names
 * go to `extra`. The IR lists an added SET once per scheme: `extensions.series.spring = [{ key, scheme, declaredBy, value }]`.
 */
function springAdded(ir, scheme) {
  return new Map((ir.extensions.series.spring ?? []).filter((e) => e.scheme === scheme).map((e) => [e.key, e.declaredBy]));
}
function springKeys(ir) {
  const sets = Object.keys(ir.spring).map((scheme) => Object.keys(ir.spring[scheme]).filter((n) => !springAdded(ir, scheme).has(n)));
  if (new Set(sets.map((names) => names.join(' '))).size > 1) throw new Error('kotlin: spring schemes do not share one set of core names');
  if (sets[0]?.some((k) => ['extra', 'scheme'].includes(c(k)))) throw new Error('kotlin: a spring is named "extra" or "scheme", which the generated holder uses');
  return sets[0] ?? [];
}
function springsClass(ir) {
  const core = springKeys(ir);
  return [
    '/** One spring set. [scheme] is its token key (`standard`, `expressive`). */',
    '@Immutable',
    'public data class TanreiSprings(',
    '    public val scheme: String,',
    ...core.map((k) => `    public val ${c(k)}: TanreiSpringSpec,`),
    '    /** Springs a design system added to the vocabulary, by token key. */',
    '    public val extra: Map<String, TanreiSpringSpec> = emptyMap(),',
    ') {',
    '    /** The spring with this token key — core or added — or null when this system does not have it. */',
    '    public operator fun get(key: String): TanreiSpringSpec? = when (key) {',
    ...core.map((k) => `        "${k}" -> ${c(k)}`),
    '        else -> extra[key]',
    '    }',
    '}',
    '',
  ];
}
function springsValue(ir, scheme, pad) {
  const added = springAdded(ir, scheme);
  const entries = Object.entries(ir.spring[scheme]);
  const lines = [`${pad}scheme = "${scheme}",`, ...entries.filter(([k]) => !added.has(k)).map(([k, v]) => `${pad}${c(k)} = ${spring(v)},`)];
  if (added.size) lines.push(`${pad}extra = mapOf(`, ...entries.filter(([k]) => added.has(k)).map(([k, v]) => `${pad}    "${k}" to ${spring(v)},`), `${pad}),`);
  return lines;
}

/**
 * The per-step holders of the system tiers. Each keeps a named member per CORE step and takes the steps a design
 * system added in `extra`, read through the keyed lookup or the typed accessors of that system's file.
 */
const MEASURE_GROUPS = ['border', 'focus', 'target', 'icon', 'breakpoint'];
const plainSeries = (group) => ({ entries: (ir) => Object.entries(ir[group]), added: (ir) => new Set((ir.extensions.series[group] ?? []).map((e) => e.key)) });
/**
 * A holder's members that are NOT steps of the series: required like every core token, after the steps and before
 * `extra`, outside the keyed lookup. `{ name, type, doc, value(ir) }`.
 */
const typeEmphasisMember = {
  name: 'emphasis', type: 'TanreiTypeEmphasis',
  doc: '`sys.typescale.emphasis.*`: the weight step `emphasized` text gains, per family.',
  value: (ir) => `TanreiTypeEmphasis(${typeFamilies.map((k) => `${c(k)} = ${ir.typeEmphasis[k]}`).join(', ')})`,
};
const cornerSmoothingMember = {
  name: 'cornerSmoothing', type: 'Float',
  doc: '`sys.shape.corner-smoothing`: how a corner eases into the edge, 0–1 with Figma\'s meaning — 0 a quarter circle, 0.6 the iOS continuous corner, 1 the most eased. The radius does not change.',
  value: (ir) => {
    if (typeof ir.cornerSmoothing !== 'number' || !(ir.cornerSmoothing >= 0 && ir.cornerSmoothing <= 1)) throw new Error(`kotlin: sys.shape.corner-smoothing must be a number in [0, 1], got ${JSON.stringify(ir.cornerSmoothing)}`);
    return f(ir.cornerSmoothing);
  },
};
const SERIES = [
  { id: 'typescale', cls: 'TanreiTypescale', type: 'TanreiTextStyle', fmt: textStyle, doc: 'Text styles by level: `display`, `heading1`…`heading6` (h1–h6), `bodyLarge` / `body` / `bodySmall`, `label` / `labelSmall` / `caption`, `code` / `codeSmall`, `eyebrow`. Emphasis is [emphasis], a weight step, not a role.', members: [typeEmphasisMember], ...plainSeries('typescale') },
  { id: 'shape', cls: 'TanreiShape', type: 'Dp', fmt: dp, doc: 'Corner radii, and how every corner eases ([cornerSmoothing]).', members: [cornerSmoothingMember], ...plainSeries('shape') },
  { id: 'space', cls: 'TanreiSpace', type: 'Dp', fmt: dp, ...plainSeries('space') },
  { id: 'state', cls: 'TanreiState', type: 'Float', fmt: f, doc: 'State opacities. Systems use them as amounts in paints; components never read them.', ...plainSeries('state') },
  {
    id: 'measure', cls: 'TanreiMeasure', type: 'Dp', fmt: dp,
    entries: measureEntries,
    added: (ir) => new Set(MEASURE_GROUPS.flatMap((g) => (ir.extensions.series[g] ?? []).map((e) => `${g}-${e.key}`))),
  },
  { id: 'duration', cls: 'TanreiDuration', type: 'Int', fmt: (v) => `${v}`, doc: 'Milliseconds.', ...plainSeries('duration') },
  { id: 'easing', cls: 'TanreiEasing', type: 'TanreiCubicBezier', fmt: bezier, ...plainSeries('easing') },
  {
    id: 'elevation', cls: 'TanreiElevation', type: 'List<TanreiShadowLayer>', fmt: (layers, pad) => shadowLayers(layers, pad),
    doc: 'A level may start with a ring — a layer with no offset, no blur and a positive spread: render that one as a border, the rest as shadows. Not every system has one.',
    ...plainSeries('elevation'),
  },
];
const EXTENSIBLE_SERIES = new Set(['typescale', 'shape', 'space', 'state', ...MEASURE_GROUPS, 'duration', 'easing', 'spring', 'elevation']);

function seriesClass(s, ir) {
  const added = s.added(ir);
  const core = s.entries(ir).map(([k]) => k).filter((k) => !added.has(k));
  const members = s.members ?? [];
  const taken = new Set(['extra', ...members.map((m) => m.name)]);
  const clash = s.entries(ir).map(([k]) => k).find((k) => taken.has(c(k)));
  if (clash) throw new Error(`kotlin: a step of ${s.id} is named "${clash}", which the generated holder uses for something else`);
  return [
    ...(s.doc ? [`/** ${s.doc} */`] : []),
    '@Immutable',
    `public data class ${s.cls}(`,
    ...core.map((k) => `    public val ${c(k)}: ${s.type},`),
    ...members.flatMap((m) => [`    /** ${m.doc} */`, `    public val ${m.name}: ${m.type},`]),
    '    /** Steps a design system added to the vocabulary, by token key. */',
    `    public val extra: Map<String, ${s.type}> = emptyMap(),`,
    ') {',
    '    /** The step with this token key — core or added — or null when this system does not have it. */',
    `    public operator fun get(key: String): ${s.type}? = when (key) {`,
    ...core.map((k) => `        "${k}" -> ${c(k)}`),
    '        else -> extra[key]',
    '    }',
    '}',
    '',
  ];
}

function emitVocabulary(ir, structures, states) {
  for (const needed of ['primary', 'on-primary', 'primary-container', 'on-primary-container']) {
    if (!ir.roles.includes(needed)) throw new Error(`kotlin: the fallback role "${needed}" is not in the vocabulary`);
  }
  const keys = (obj) => Object.keys(obj);
  const out = [
    ...fileHeader([
      'androidx.compose.runtime.Immutable',
      'androidx.compose.ui.graphics.Color',
      'androidx.compose.ui.unit.Dp',
      'androidx.compose.ui.unit.TextUnit',
      `${LIBRARY_PACKAGE}.primitives.TanreiDiagnostics`,
    ]),
    SUPPORT.replace('__ROLE_CONSTANTS__', ir.coreRoles.map((r) => `        public val ${P(r)}: TanreiColorRole = TanreiColorRole("${r}")`).join('\n'))
      .replace('__SCHEME_ENTRIES__', ir.schemes.map((k) => `    ${P(k)}("${k}"),`).join('\n'))
      .replace('__SCHEME_PAINT_MEMBERS__', ir.schemes.map((k) => `        public val ${c(k)}: TanreiPaint,`).join('\n'))
      .replace('__SCHEME_PAINT_CASES__', ir.schemes.map((k) => `            TanreiScheme.${P(k)} -> ${c(k)}`).join('\n'))
      .replace('__TYPEFACE_MEMBERS__', keys(ir.typefaces).map((k) => `    public val ${c(k)}: TanreiFontStack,`).join('\n'))
      .replace('__TYPE_FAMILIES__', typeFamilies.map(P).join(', '))
      .replace('__TYPE_EMPHASIS_MEMBERS__', typeFamilies.map((k) => `    public val ${c(k)}: Int,`).join('\n'))
      .replace('__TYPE_EMPHASIS_CASES__', typeFamilies.map((k) => `        TanreiTypeFamily.${P(k)} -> ${c(k)}`).join('\n')),
    '/** The interaction state a component draws. A component reads THAT state\'s tokens; it never computes how a state looks. */',
    `public enum class TanreiInteractionState { ${states.map(P).join(', ')} }`,
    '',
    ...dataClass('TanreiColorSchemes', ir.schemes.map((s) => `${c(s)}: TanreiColors`), 'One [TanreiColors] per scheme (theme × contrast).').slice(0, -2),
    ') {',
    '    /** The colors of [scheme]. */',
    '    public operator fun get(scheme: TanreiScheme): TanreiColors = when (scheme) {',
    ...ir.schemes.map((k) => `        TanreiScheme.${P(k)} -> ${c(k)}`),
    '    }',
    '}',
    '',
    ...dataClass('TanreiDials', keys(ir.dials).map((k) => `${c(k)}: Float`), 'The dials the values were derived from. Informational: derivation happens at build time.'),
    ...['typescale', 'shape', 'space', 'state', 'measure', 'duration', 'easing'].flatMap((id) => seriesClass(SERIES.find((s) => s.id === id), ir)),
    ...springsClass(ir),
    ...dataClass('TanreiMotion', ['duration: TanreiDuration', 'easing: TanreiEasing', ...keys(ir.spring).map((k) => `${c(k)}Spring: TanreiSprings`)]),
    ...seriesClass(SERIES.find((s) => s.id === 'elevation'), ir),
    ...behaviorClasses(ir),
  ];
  for (const s of structures) out.push(...componentClasses(s, states));

  out.push(
    '/**',
    ' * One design system: every token a component or primitive reads. `TanreiTheme(system = …)` provides it.',
    ' * Instances are generated (one file per system); construct with named arguments only.',
    ' */',
    '@Immutable',
    'public data class TanreiSystem(',
    '    public val id: String,',
    '    public val dials: TanreiDials,',
    '    /** Roles that come as a set of four (`x`, `on-x`, `x-container`, `on-x-container`). */',
    '    public val intents: List<TanreiColorRole>,',
    '    public val colors: TanreiColorSchemes,',
    '    /** The named typefaces (`ref.typeface.*`); every text style already carries its own stack. */',
    '    public val typefaces: TanreiTypefaces,',
    '    public val typescale: TanreiTypescale,',
    '    public val shape: TanreiShape,',
    '    public val space: TanreiSpace,',
    '    public val state: TanreiState,',
    '    public val measure: TanreiMeasure,',
    '    /** How icons are drawn; their sizes are in [measure]. */',
    '    public val icon: TanreiIconStyle,',
    '    public val motion: TanreiMotion,',
    '    public val elevation: TanreiElevation,',
    '    /** Choices of kind: how a press is answered and how keyboard focus is drawn. How corners ease is an amount, `shape.cornerSmoothing`. */',
    '    public val behavior: TanreiBehavior,',
    ...structures.map((s) => `    public val ${c(s.component)}: Tanrei${P(s.component)}Tokens,`),
    ') {',
    '    /** Every role a component token or an elevation level of this system reads. */',
    '    public fun referencedRoles(): Set<TanreiColorRole> = buildSet {',
    `        (listOf(${keys(ir.elevation).map((k) => `elevation.${c(k)}`).join(', ')}) + elevation.extra.values).forEach { level -> level.forEach { add(it.role) } }`,
    ...structures.map((s) => `        addAll(${c(s.component)}.referencedRoles())`),
    '    }',
    '',
    '    /**',
    '     * Debug check: roles this system reads (plus [alsoRequired]) that one of its schemes does not define.',
    '     * Such a role still draws — see [TanreiColors.get] — but with a fallback color.',
    '     */',
    '    public fun unknownRoles(alsoRequired: Set<TanreiColorRole> = emptySet()): Set<TanreiColorRole> {',
    `        val schemes = listOf(${ir.schemes.map((s) => `colors.${c(s)}`).join(', ')})`,
    '        return (referencedRoles() + alsoRequired).filterNotTo(linkedSetOf()) { role -> schemes.all { role in it } }',
    '    }',
    '',
    '    /** Generated systems attach here: `TanreiSystem.Tanrei`, a preset, a product\'s own. */',
    '    public companion object',
    '}',
    '',
  );
  return out.join('\n');
}

// ── values of one system ────────────────────────────────────────────────

/** `name = Cls(core steps…, extra = mapOf(added steps…))` body lines of one series holder. */
function seriesValue(s, ir, pad) {
  const added = s.added(ir);
  const entries = s.entries(ir);
  const lines = entries.filter(([k]) => !added.has(k)).map(([k, v]) => `${pad}${c(k)} = ${s.fmt(v, pad, k)},`);
  for (const m of s.members ?? []) lines.push(`${pad}${m.name} = ${m.value(ir)},`);
  if (added.size) lines.push(`${pad}extra = mapOf(`, ...entries.filter(([k]) => added.has(k)).map(([k, v]) => `${pad}    "${k}" to ${s.fmt(v, `${pad}    `, k)},`), `${pad}),`);
  return lines;
}

/**
 * ONE section of typed accessors for what this system added to the vocabulary: product code writes
 * `space.space1200`, `TanreiButtonSize.Size3x`, `TanreiColorRole.BrandGlow`. Empty for a system without extensions.
 *
 * Accessors are top-level declarations, so two files of ONE package cannot both declare one. The shipped systems
 * share the library's package and every layer of their chain is shipped there too: each file declares only what
 * ITS system added (`declaredBy`), and what it inherited (`m3-expressive-like` ← `m3-like`) is declared by the
 * ancestor's file. A product's file lives in its own package and may stack layers that are generated nowhere
 * else, so it declares everything.
 */
function accessors(ir, structures) {
  const lines = [];
  const here = (declaredBy) => Boolean(externalPackage) || declaredBy === ir.system;
  const stepDeclaredBy = new Map(Object.entries(ir.extensions.series).flatMap(([g, steps]) => steps.map((e) => [MEASURE_GROUPS.includes(g) ? `measure/${g}-${e.key}` : `${g}/${e.key}`, e.declaredBy])));
  for (const s of SERIES) {
    const added = s.added(ir);
    for (const [k, v] of s.entries(ir).filter(([key]) => added.has(key) && here(stepDeclaredBy.get(`${s.id}/${key}`)))) {
      lines.push(`public val ${s.cls}.${c(k)}: ${s.type} get() = extra["${k}"] ?: TanreiDiagnostics.missingStep("${s.id}", "${k}", "${stepDeclaredBy.get(`${s.id}/${k}`)}") { ${s.fmt(v, '', k)} }`);
    }
  }
  // Springs: one accessor per added name; a set that lacks it answers with the declaring system's spring of ITS scheme.
  const springs = new Map(); // name → { declaredBy, byScheme: [[scheme, spec]] }
  for (const scheme of Object.keys(ir.spring)) {
    for (const [name, declaredBy] of springAdded(ir, scheme)) (springs.get(name) ?? springs.set(name, { declaredBy, byScheme: [] }).get(name)).byScheme.push([scheme, ir.spring[scheme][name]]);
  }
  for (const [name, { declaredBy, byScheme }] of springs) {
    if (!here(declaredBy)) continue;
    const value = byScheme.length === 1 ? spring(byScheme[0][1]) : `when (scheme) { ${byScheme.slice(1).map(([scheme, v]) => `"${scheme}" -> ${spring(v)}; `).join('')}else -> ${spring(byScheme[0][1])} }`;
    lines.push(`public val TanreiSprings.${c(name)}: TanreiSpringSpec get() = extra["${name}"] ?: TanreiDiagnostics.missingStep("spring", "${name}", "${declaredBy}") { ${value} }`);
  }
  for (const r of ir.extensions.roles.filter((x) => here(x.declaredBy))) lines.push(`public val TanreiColorRole.Companion.${P(r.key)}: TanreiColorRole get() = TanreiColorRole("${r.key}")`);
  for (const s of structures) {
    for (const a of s.axes) {
      const n = axisNames(s, a);
      for (const v of a.values.filter((x) => !x.core && here(x.declaredBy))) {
        const id = axisIdent(a.axis, v.key);
        lines.push(`public val ${n.key}.Companion.${P(id)}: ${n.key} get() = ${n.key}("${v.key}")`, `public val ${n.holder}.${c(id)}: ${n.group} get() = this[${n.key}("${v.key}")]`);
      }
    }
  }
  if (!lines.length) return [];
  return [
    '',
    `// ── Added to the vocabulary by "${ir.system}" ─────────────────────`,
    '// Typed accessors for the steps, roles and component axis values this design system declares beyond the core.',
    '// Neither kind throws under a system that lacks the value: a step accessor answers with the value THIS system gave',
    '// the step (and a debuggable app reports it), an axis accessor reads the default value, like the component does.',
    ...lines,
  ];
}

/**
 * A layer's OWN tokens (`acme.comp.rating.star.size`) are not part of TanreiSystem: one typed object per
 * namespace, in the same file. Colors are paints, so they follow the scheme; typography and elevation are
 * read from this system.
 */
function ownTokens(ir) {
  const Id = P(ir.system);
  const types = [];
  const values = [];
  for (const [namespace, tokens] of Object.entries(ir.extensions.own)) {
    const N = P(namespace);
    const groups = new Map(); // group → [{ name, token }]
    for (const t of tokens) {
      const [tier, ...rest] = t.id.split('.').slice(1);
      const [group, parts] = tier === 'comp' && rest.length > 1 ? [rest[0], rest.slice(1)] : [tier, rest];
      if (!parts.length) throw new Error(`kotlin: ${t.id} is too short to place in ${N}Tokens`);
      (groups.get(group) ?? groups.set(group, []).get(group)).push({ name: c(parts.join('-')), token: t });
    }
    for (const [group, members] of groups) types.push(...dataClass(`${N}${P(group)}Tokens`, members.map((m) => `${m.name}: ${kotlinType(m.token)}`), `\`${namespace}.*.${group}\`: tokens "${namespace}" declares for itself.`));
    types.push(
      `/** The tokens of the \`${namespace}\` namespace. They are not part of [TanreiSystem]; read them from \`${N}Tokens.${Id}\`. */`,
      '@Immutable',
      `public data class ${N}Tokens(`,
      ...[...groups.keys()].map((g) => `    public val ${c(g)}: ${N}${P(g)}Tokens,`),
      ') {',
      '    public companion object',
      '}',
      '',
      `/** The \`${namespace}\` tokens as the "${ir.system}" design system values them. */`,
      `public val ${N}Tokens.Companion.${Id}: ${N}Tokens get() = ${Id}SystemSource.${c(namespace)}Tokens`,
      '',
    );
    const uses = (type) => tokens.some((t) => t.type === type);
    values.push(
      `    val ${c(namespace)}Tokens: ${N}Tokens by lazy {`,
      ...(uses('typography') ? ['        val typescale = system.typescale'] : []),
      ...(uses('shadow') ? ['        val elevation = system.elevation'] : []),
      `        ${N}Tokens(`,
      ...[...groups].map(([g, members]) => `            ${c(g)} = ${N}${P(g)}Tokens(${members.map((m) => `${m.name} = ${kotlinValue(m.token)}`).join(', ')}),`),
      '        )',
      '    }',
      '',
    );
  }
  return { types, values };
}

function emitSystem(ir, structures) {
  const Id = P(ir.system);
  const fn = (name, type, lines) => [`    fun ${name}(): ${type} = ${type}(`, ...lines, '    )', ''];
  const series = (id) => SERIES.find((s) => s.id === id);
  const own = ownTokens(ir);
  const out = [
    '',
    `/** The \`${ir.system}\` design system. Pass it to \`TanreiTheme(system = …)\`. */`,
    `public val TanreiSystem.Companion.${Id}: TanreiSystem get() = ${Id}SystemSource.system`,
    ...accessors(ir, structures),
    '',
    ...own.types,
    `private object ${Id}SystemSource {`,
    '    val system: TanreiSystem by lazy {',
    '        val typefaces = typefaces()',
    '        val typescale = typescale()',
    '        val elevation = elevation()',
    '        TanreiSystem(',
    `            id = "${ir.system}",`,
    `            dials = TanreiDials(${Object.entries(ir.dials).map(([k, v]) => `${c(k)} = ${f(v)}`).join(', ')}),`,
    `            intents = listOf(${ir.intents.map(role).join(', ')}),`,
    '            colors = TanreiColorSchemes(',
    ...ir.schemes.map((s) => `                ${c(s)} = ${c(s)}Colors(),`),
    '            ),',
    '            typefaces = typefaces,',
    '            typescale = typescale,',
    '            shape = shape(),',
    '            space = space(),',
    '            state = state(),',
    '            measure = measure(),',
    ...iconStyle(ir).map((l, i) => `            ${i ? '' : 'icon = '}${l}${l === ')' ? ',' : ''}`),
    '            motion = motion(),',
    '            elevation = elevation,',
    `            behavior = ${behaviorValue(ir)},`,
    ...structures.map((s) => `            ${c(s.component)} = ${c(s.component)}(typescale, elevation),`),
    '        )',
    '    }',
    '',
    ...own.values,
  ];
  for (const scheme of ir.schemes) {
    out.push(
      `    fun ${c(scheme)}Colors(): TanreiColors = TanreiColors(`,
      `        TanreiScheme.${P(scheme)},`,
      '        mapOf(',
      ...ir.roles.map((r) => `            ${role(r)} to ${color(ir.colors[scheme][r])},`),
      '        ),',
      '    )',
      '',
    );
  }
  // The distinct font stacks of the typescale, once each: most styles share one or two.
  const stacks = new Map();
  for (const [, t] of series('typescale').entries(ir)) {
    const key = JSON.stringify([t.font.families, t.font.generic, t.font.system]);
    if (!stacks.has(key)) stacks.set(key, { name: `font${stacks.size + 1}`, font: t.font });
  }
  fontLocals = new Map([...stacks].map(([key, { name }]) => [key, name]));
  const typescaleLines = seriesValue(series('typescale'), ir, '            ');
  fontLocals = null;
  out.push(
    ...fn('typefaces', 'TanreiTypefaces', Object.entries(ir.typefaces).map(([k, v]) => `        ${c(k)} = ${fontStack(v)},`)),
    '    fun typescale(): TanreiTypescale {',
    ...[...stacks.values()].map(({ name, font }) => `        val ${name} = ${fontStack(font)}`),
    '        return TanreiTypescale(',
    ...typescaleLines,
    '        )',
    '    }',
    '',
    ...['shape', 'space', 'state', 'measure'].flatMap((id) => fn(id, series(id).cls, seriesValue(series(id), ir, '        '))),
    ...fn('motion', 'TanreiMotion', [
      '        duration = TanreiDuration(',
      ...seriesValue(series('duration'), ir, '            '),
      '        ),',
      '        easing = TanreiEasing(',
      ...seriesValue(series('easing'), ir, '            '),
      '        ),',
      ...Object.keys(ir.spring).flatMap((scheme) => [`        ${c(scheme)}Spring = TanreiSprings(`, ...springsValue(ir, scheme, '            '), '        ),']),
    ]),
    ...fn('elevation', 'TanreiElevation', seriesValue(series('elevation'), ir, '        ')),
  );
  for (const s of structures) {
    out.push(
      '    @Suppress("UNUSED_PARAMETER")',
      `    fun ${c(s.component)}(typescale: TanreiTypescale, elevation: TanreiElevation): Tanrei${P(s.component)}Tokens =`,
      `        ${componentValue(s, '        ')}`,
      '',
    );
  }
  out.pop();
  out.push('}', '');
  const body = out.join('\n');
  // Only what the body names is imported, so the file of a system without extensions carries no trace of them.
  const imports = [
    ...(body.includes('@Immutable') ? ['androidx.compose.runtime.Immutable'] : []),
    'androidx.compose.ui.graphics.Color',
    ...(/\bDp\b/.test(body) ? ['androidx.compose.ui.unit.Dp'] : []),
    ...(/\bTextUnit\b/.test(body) ? ['androidx.compose.ui.unit.TextUnit'] : []),
    'androidx.compose.ui.unit.dp',
    'androidx.compose.ui.unit.sp',
    ...(body.includes('TanreiDiagnostics.') ? [`${LIBRARY_PACKAGE}.primitives.TanreiDiagnostics`] : []),
  ];
  return [...fileHeader(imports), body].join('\n');
}

/**
 * @param ir the system to emit.
 * @param {{ vocabulary?: boolean, externalPackage?: string }} [options] `vocabulary: false` = only the values of
 *   this system. `externalPackage` = the file lives in a product's module, in that package, and imports the library.
 * @returns {Record<string, string>} repo-relative path → file text
 */
export function emitKotlin(ir, { vocabulary = true, externalPackage: pkg = null } = {}) {
  const unsupported = Object.keys(ir.extensions.series).filter((g) => !EXTENSIBLE_SERIES.has(g));
  if (unsupported.length) throw new Error(`kotlin: a design system cannot add steps to sys.${unsupported.join(', sys.')} on this platform yet`);
  const structures = Object.entries(ir.componentTokens).map(([name, tokens]) => structure(name, tokens, ir.axes[name]));
  constantRoles = new Set(ir.coreRoles);
  paintSchemes = ir.schemes;
  externalPackage = pkg;
  addedSteps = Object.fromEntries(['typescale', 'elevation'].map((id) => [id, SERIES.find((s) => s.id === id).added(ir)]));
  typeFamilies = Object.keys(ir.typeEmphasis ?? {});
  if (!typeFamilies.length) throw new Error('kotlin: the IR has no sys.typescale.emphasis steps');
  if (typeFamilies.some((k) => !Number.isInteger(ir.typeEmphasis[k]))) throw new Error(`kotlin: every sys.typescale.emphasis step must be an integer weight, got ${JSON.stringify(ir.typeEmphasis)}`);
  try {
    const values = { [`${KOTLIN_DIR}/TanreiSystem${P(ir.system)}.kt`]: emitSystem(ir, structures) };
    if (!vocabulary || pkg) return values;
    return { [`${KOTLIN_DIR}/TanreiTokens.kt`]: emitVocabulary(ir, structures, allStates(ir)), ...values };
  } finally {
    constantRoles = null;
    paintSchemes = [];
    externalPackage = null;
    addedSteps = null;
    fontLocals = null;
    typeFamilies = [];
  }
}
