// What a layer may legally do to a token — one answer for every tool that offers edits: the MCP server
// (`explain_token`), the CLI (`tanrei explain`) and Theme Studio ("Every token"). Pure; no I/O.
//
// A tool describes the token it is looking at with a neutral descriptor:
//   { id, type, value, alias: '<id>' | null, rule: <dev.tanrei.derive> | null, state: boolean, choices?: string[] }
// (`choices`: the names of a choice of kind, from `$extensions["dev.tanrei.enum"].values`)
// and gets back the operations with a ready-to-edit JSON snippet each.
//
// The engine has no file access, so the vocabulary's namespace is a parameter: `{ namespace }`, 'tanrei' by default.
// Tools that read tanrei.config.json pass `CONFIG.namespace`.
import { ruleDependencies, walkTokens, DERIVE } from './rules.js';

const DEFAULT_NAMESPACE = 'tanrei';
const REASON = '<why this product needs it — 8+ characters>';
const RATIONALE = '<why this design system or product needs it — 8+ characters>';

/** What no layer can do, whatever the token. */
export const cannot = (namespace = DEFAULT_NAMESPACE) => [
  'remove or retype a core token — extensions are additive only',
  'add an interaction state — hovered, focused, pressed and disabled are bound to platform behaviour',
  'add a name to a choice of kind (pressed-feedback, focus-style) — the list of names is vocabulary; a layer chooses among them',
  `reference a layer’s own token from a ${namespace}.* token — the core never depends on a layer’s namespace`,
  'change an accessibility threshold — they are constants; a violation in a product layer is a warning printed by every build, and an imitation preset is held to fidelity to its original instead',
];
export const CANNOT = cannot();

const tierOf = (id) => id.split('.')[1];
const isPaletteIn = (NS) => (id) => id.startsWith(`${NS}.ref.palette.`) || id.startsWith(`${NS}.ref.alpha.`);

/** dial | alias | derived | fixed */
export function tokenKind({ id, alias, rule }, { namespace: NS = DEFAULT_NAMESPACE } = {}) {
  if (alias) return 'alias';
  if (id.startsWith(`${NS}.sys.color.`) || isPaletteIn(NS)(id)) return 'derived';
  if (rule && 'fixed' in rule) return 'fixed';
  if (rule) return 'derived';
  return tierOf(id) === 'dial' ? 'dial' : 'fixed';
}

const sample = (type) =>
  type === 'fontFamily' ? ['<Family a product installs>', 'system-ui', 'sans-serif'] : type === 'number' ? 1 : type === 'dimension' ? { value: 12, unit: 'px' } : type === 'duration' ? { value: 200, unit: 'ms' } : type === 'color' ? { colorSpace: 'srgb', components: [0.9, 0.1, 0.1], hex: '#e61a1a' } : '<a literal of this $type>';

/**
 * The operations a layer may write for this token, most natural first.
 * @param {object} descriptor
 * @param {{ namespace?: string }} [options]
 * @returns {{ op: string, write?: object, effect: string, choices?: string[], current?: string }[]}
 */
export function legalOperations(descriptor, { namespace: NS = DEFAULT_NAMESPACE } = {}) {
  const { id, type, value, alias, rule, state, choices } = descriptor;
  const SYS_COLOR = `${NS}.sys.color.`;
  const isPalette = isPaletteIn(NS);
  const kind = tokenKind(descriptor, { namespace: NS });
  const entry = (op, write, effect) => ({ op, write: { tokens: { [id]: write } }, effect });
  const literal = sample(type);

  // A choice of kind: the value is a NAME. The layer file keeps the index (DTCG has no string type); the
  // engine accepts either, and no tool shows the number without its name.
  if (Array.isArray(choices) && choices.length) {
    const current = typeof value === 'number' ? choices[value] : value;
    const other = choices.find((name) => name !== current) ?? choices[0];
    return [{
      ...entry('choose', { $value: choices.indexOf(other), reason: REASON }, `One of: ${choices.map((name, i) => `${name} (${i})`).join(', ')}. It is "${current}" now; this example chooses "${other}". Write the index — or the name, which the engine accepts too: { "$value": "${other}" }. The names are part of the vocabulary: a layer chooses among them and cannot add one. Nothing scales or derives a choice.`),
      choices,
      current,
    }];
  }

  if (tierOf(id) === 'dial') return [entry('set the dial', { $value: value, reason: REASON }, 'Every token derived from this dial follows, on every platform. Tokens a layer pinned do not. This is the first thing to reach for.')];
  if (isPalette(id)) {
    const palette = id.split('.')[3];
    return [{ op: 'change the palette', write: { palettes: { [palette]: { source: { seed: '#rrggbb' } } } }, effect: `ref.palette tones are generated. Re-declare "${palette}" under "palettes" (a seed, or hue + chroma); every role that uses it follows in all six schemes.` }];
  }
  if (id.startsWith(SYS_COLOR)) {
    const role = id.slice(SYS_COLOR.length);
    return [
      { op: 'change the palette', write: { palettes: { '<palette>': { source: { seed: '#rrggbb' } } } }, effect: 'Usually what you want: the role keeps its tone rule and takes the new hue. `rule.palette` names the palette this role reads.' },
      entry('derive', { derive: { fn: 'tone', palette: rule?.palette ?? '<palette>', tone: { light: [40, 30, 20], dark: [80, 85, 90] } } }, 'Pick tones per theme; the three numbers are standard, medium and high contrast (one number applies to all three). A role also accepts `{"fn": "alpha", "of": "black", "amount": {…}}` and "contrast-pick" (below).'),
      entry('derive (contrast-pick)', { derive: { fn: 'contrast-pick', on: `{${SYS_COLOR}<the role it is drawn on>}`, from: [`{${SYS_COLOR}<candidate>}`, `{${SYS_COLOR}<another candidate>}`] } }, 'The role aliases whichever candidate has the highest WCAG contrast against `on`, decided per scheme (the first wins a tie). Candidates are color roles or palette tones ("{' + NS + '.ref.palette.<palette>.<tone>}").'),
      entry('re-point alias', { $value: `{${SYS_COLOR}<another-role>}` }, `"${role}" takes another role's color in every scheme.`),
      { op: 'declare a palette', write: { palettes: { '<name>': { description: '<why this product needs this color family>', source: { seed: '#rrggbb' }, roles: 'intent' } } }, effect: 'For a brand or domain color: generates <name>, on-<name>, <name>-container, on-<name>-container with contrast checks. A literal hex on a role is not accepted.' },
      { op: 'declare a single role', write: { vocabulary: { [`${SYS_COLOR}<new-role>`]: { $type: 'color', rationale: RATIONALE, derive: { fn: 'tone', palette: '<palette>', tone: { light: [90], dark: [30] } }, onRole: `${SYS_COLOR}<role drawn on it>` } } }, effect: 'For one more role rather than a family of four (a reference system’s `primary-fixed`). `onRole` registers the pair with the contrast checks.' },
    ];
  }
  if (state) {
    // comp.<component>.<variant>.<state>.<part…> or comp.<component>.<state>.<part>: generalise over component and variant.
    const parts = id.split('.');
    const pattern = parts.map((part, i) => (i === 2 || (i === 3 && parts[4] === state) ? '*' : part)).join('.');
    return [
      entry('re-point alias', { $value: `{${NS}.comp.<component>.<variant>.<part>}` }, 'This state looks like another token (for example its resting value: a system without hover).'),
      ...(type === 'color'
        ? [
            entry('derive', { derive: { fn: 'mix', base: `{${NS}.comp.…container.color}`, with: `{${NS}.comp.…state-layer.color}`, amount: `{${NS}.sys.state.hover-state-layer-opacity}` } }, 'A state layer ("mix") or a dim ("alpha": { "of": "{…}", "amount": n }), computed from this system’s colors in every scheme.'),
            entry('derive (tone)', { derive: { fn: 'tone', palette: '<palette>', tone: { light: [70, 60, 50], dark: [70, 80, 90] } } }, 'An explicit tone of a declared palette for this one state — for ramps that are not monotonic (rest 80, hover 70, pressed 40), which no mix can express. The three numbers are standard, medium and high contrast; one number applies everywhere.'),
            entry('derive (contrast-pick)', { derive: { fn: 'contrast-pick', on: `{${NS}.comp.…container.color}`, from: [`{${SYS_COLOR}<candidate>}`, `{${SYS_COLOR}<another candidate>}`] } }, 'Whichever candidate is most readable (highest WCAG contrast) on `on`, decided per scheme; the first wins a tie. State tokens accept mix, alpha, tone and contrast-pick. Nothing else.'),
          ]
        : []),
      entry('pin $value', { $value: literal, reason: REASON }, 'An explicit value for this one state.'),
      { op: 'pattern rule', write: { rules: [{ match: pattern, $value: '{…$1…$2…}' }] }, effect: 'Value the same state of every component/variant at once. `*` matches one segment and is available as $1, $2…. An explicit entry in "tokens" beats a pattern; fewer wildcards beat more; the later layer wins a tie.' },
    ];
  }

  const operations = [];
  if (type === 'typography' && alias) {
    // An alias of a text style (a component's label) has nothing of its own to scale or pin.
    return [
      entry('re-point alias', { $value: `{${alias.split('.').slice(0, -1).join('.')}.<another-role>}` }, `Use a different text style. It is "{${alias}}" now. To change the style itself, edit {${alias}}.`),
    ];
  }
  if (type === 'fontFamily') {
    // A typeface is a named thing, not an amount: it is set or re-pointed, never scaled.
    const stack = Array.isArray(value) ? value : value ? [value] : null;
    return [
      entry('set the font stack', { $value: literal, reason: REASON }, `Named families first, in order of preference, then a system or generic fallback (system-ui, ui-monospace, sans-serif, serif, monospace) so text still renders where the font is missing.${stack ? ` It is ${JSON.stringify(stack)} now.` : ''} Fonts are referenced by NAME and never bundled: the product installs or registers each named family on every platform it ships (\`tanrei build\` lists them).`),
      entry('re-point alias', { $value: `{${NS}.ref.typeface.<brand|plain|mono|icon>}` }, `Follow one of the system’s typefaces${alias ? ` — it is "{${alias}}" now` : ''}. Every text style that uses that typeface follows with it.`),
    ];
  }
  if (type === 'typography') {
    operations.push(entry('scale', { scale: { fontSize: 1.125 } }, 'Multiply the inherited rule of the named fields; the token still follows dial.type.base.'));
    operations.push(entry('pin $value', { $value: { fontSize: { value: 11, unit: 'px' } }, reason: REASON }, 'Pins only the named fields (fontSize, lineHeight, fontWeight, …); the others keep following their rules.'));
    operations.push(entry('derive', { derive: { fontSize: { fn: 'mul', of: `{${NS}.dial.type.base}`, by: 1.25 } } }, 'Replace the rule of a field. Closed rule language: mul, scale, clamp, em.'));
    return operations;
  }
  if (kind === 'alias') {
    operations.push(entry('re-point alias', { $value: `{${alias.split('.').slice(0, -1).join('.')}.<another-step>}` }, `Use a different step of the same scale. It is "{${alias}}" now. The target must exist and be of the same $type.`));
    if (['dimension', 'duration', 'number'].includes(type)) operations.push(entry('scale', { scale: 2 }, 'N × the inherited alias target, still following its dial.'));
  }
  if (kind === 'derived' && rule?.fn === 'pick') operations.push({ op: 'note', effect: `This value follows the choice ${rule.by}: each of its names sets its own value (${Object.entries(rule.values ?? {}).map(([name, v]) => `${name}: ${typeof v === 'object' && v !== null ? `${v.value}${v.unit ?? ''}` : v}`).join(', ')}). Choose another name there to change it with the others it sets, or pin this one.` });
  if (kind === 'derived' && rule?.fn === 'mul') operations.push(entry('scale', { scale: 1.5 }, `N × the inherited rule (${rule.of} × ${rule.by}); still follows the dial. Composes with a parent layer's scale.`));
  if (kind === 'derived' || kind === 'fixed') operations.push(entry('re-point alias', { $value: `{${NS}.sys.<scale>.<step>}` }, 'Make it follow another token instead of its own rule.'));
  operations.push(entry('derive', { derive: { fn: 'mul', of: `{${NS}.dial.<family>.unit}`, by: 3 } }, 'Replace the rule. Closed language: mul, scale, clamp, sub (max(0, of − by): a corner inside another at an inset), and pick (a value set by a choice of kind) for numbers. No other arithmetic, conditionals or functions of your own.'));
  operations.push(entry('pin $value', { $value: literal, reason: REASON }, 'A literal that no longer follows any dial. Last resort; the reason is mandatory and is written into the generated tokens.'));
  if (kind === 'fixed') operations.unshift({ op: 'note', effect: `This token is fixed${rule?.fixed ? ` ("${rule.fixed}")` : ''}: "scale" is not legal on it — pin another $value (with a reason) or give it a rule.` });
  return operations;
}

/**
 * How a layer ADDS vocabulary next to this token: ready-to-edit `vocabulary` snippets.
 * @param {object} descriptor as above, plus `axis?: { id: 'tanrei.comp.button.size', key: 'large', values: string[] }`
 * @param {string} layerId the layer that would declare it — the namespace of its own tokens
 */
export function extensionRecipes({ id, type, rule, alias, axis, choices }, layerId = '<layer id>', { namespace: NS = DEFAULT_NAMESPACE } = {}) {
  const recipes = [];
  const SYS_COLOR = `${NS}.sys.color.`;
  if (choices?.length) return []; // the names of a choice are vocabulary; there is nothing to add next to one
  const parent = id.split('.').slice(0, -1).join('.');
  if (axis) {
    recipes.push({ op: `add a ${axis.id.split('.').at(-1)}`, write: { vocabulary: { [`${axis.id}.<new-value>`]: { from: axis.key, ...(axis.id.endsWith('.size') ? { scale: 1.5 } : {}), rationale: RATIONALE } } }, effect: `One line values every member of the axis from "${axis.key}"${axis.id.endsWith('.size') ? ', scaled and still following the dials' : '; the system’s pattern rules value its hovered, focused, pressed and disabled tokens'}. Override single members under "tokens". Existing values: ${axis.values.join(', ')}.` });
  } else if (id.startsWith(`${NS}.sys.motion.spring.`)) {
    const [scheme, name] = id.split('.').slice(4);
    recipes.push({ op: 'add a spring set', write: { vocabulary: { [`${NS}.sys.motion.spring.${scheme}.<new-name>`]: { from: name, rationale: RATIONALE } } }, effect: `A named spring is a group of four tokens (damping, stiffness, easing, duration), so it is cloned whole from "${name}" and can never be half a spring; change single fields under "tokens". Declare it in every spring scheme the product uses (standard, expressive).` });
  } else if (tierOf(id) === 'sys' && !id.startsWith(SYS_COLOR)) {
    const definition = type === 'typography' ? { $value: '<a full text style, or an alias to another role>' } : rule?.fn === 'mul' ? { derive: { ...rule, by: '<coefficient>' } } : alias ? { $value: `{${alias}}` } : { $value: sample(type), reason: REASON };
    recipes.push({ op: 'add a step to this series', write: { vocabulary: { [`${parent}.<new-step>`]: { $type: type, rationale: RATIONALE, ...definition } } }, effect: 'A new step next to this one, dial-driven like its neighbours. Platforms keep their named fields for core steps and reach yours through a typed accessor generated with your system.' });
  }
  recipes.push({ op: 'add your own token', write: { vocabulary: { [`${layerId}.comp.<your-component>.<part>`]: { $type: type, rationale: RATIONALE, $value: `{${id}}` } } }, effect: `For your own components: lives in your layer's namespace ("${layerId}.…"), may reference any ${NS}.* token (here: this one), follows dials and schemes, and is generated for every platform as a typed object next to your system.` });
  return recipes;
}

/**
 * Which tokens follow a token: `dependents.get(id)` = ids whose rule or alias reads `id` directly.
 * Transitive closure: call `followers(id)`.
 * @param {Record<string, object>} documents resolved or source DTCG documents
 */
export function dependencyIndex(documents) {
  const dependents = new Map();
  const add = (from, to) => (dependents.get(to) ?? dependents.set(to, new Set()).get(to)).add(from);
  for (const doc of Object.values(documents)) {
    for (const { id, token } of walkTokens(doc)) {
      if (typeof token.$value === 'string' && /^\{[^}]+\}$/.test(token.$value)) add(id, token.$value.slice(1, -1));
      for (const dep of ruleDependencies(token.$extensions?.[DERIVE])) add(id, dep);
    }
  }
  const followers = (id, seen = new Set()) => {
    for (const next of dependents.get(id) ?? []) if (!seen.has(next)) followers(next, seen.add(next));
    return seen;
  };
  return { dependents, followers };
}
