// Palettes and the color half of the rule language (`tone`, `alpha`, `contrast-pick`).
//   tone           { palette: "<name>", tone: n | [std, medium, high] | { light: […], dark: […] } }
//   alpha          { of: "black" | "white", amount: <percent, same context forms> }
//   contrast-pick  { on: "{color token}", from: ["{color token}", "{color token}", …] }
//                  → per scheme, the candidate with the highest WCAG contrast against `on`; the first wins a tie.
//                  On a color role the candidates are roles or ref.palette tones, and the role ALIASES the winner.
// material-color-utilities is injected because its package cannot be imported
// the same way in Node and in a bundler; the engine itself stays environment-free.
import { SCHEMES, inContext } from './contexts.js';
import { SystemError } from './errors.js';
import { checkContrastPick, generateStateDocument, pickByContrast } from './states.js';

const STANDARD_TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100];
const argbToRgb = (argb, a = 1) => ({ r: ((argb >> 16) & 0xff) / 255, g: ((argb >> 8) & 0xff) / 255, b: (argb & 0xff) / 255, a });

export function hexToArgb(hex) {
  return (0xff000000 | Number.parseInt(hex.slice(1), 16)) >>> 0;
}

export function argbToColor(argb, alphaValue) {
  const r = (argb >> 16) & 0xff;
  const g = (argb >> 8) & 0xff;
  const b = argb & 0xff;
  const round = (n) => Math.round((n / 255) * 10000) / 10000;
  const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  const value = { colorSpace: 'srgb', components: [round(r), round(g), round(b)] };
  if (alphaValue !== undefined) value.alpha = alphaValue;
  value.hex = hex;
  return value;
}

/** @param {{ Hct, TonalPalette, namespace?: string }} deps  `namespace` is the vocabulary's (tanrei.config.json); 'tanrei' by default */
export function createPaletteEngine({ Hct, TonalPalette, namespace: NS = 'tanrei' }) {
  const SYS_COLOR = `${NS}.sys.color.`;
  const REF_PALETTE = `${NS}.ref.palette.`;

  function buildPalette(declaration, name) {
    const source = declaration.source ?? {};
    let generated;
    if ('seed' in source) {
      const hct = Hct.fromInt(hexToArgb(source.seed));
      generated = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);
    } else if ('hue' in source && 'chroma' in source) generated = TonalPalette.fromHueAndChroma(source.hue, source.chroma);
    else throw new Error(`palette "${name}": unsupported source ${JSON.stringify(source)}`);
    // `tones` fixes single tones to exact colors: a published ramp that was tuned by hand, or a brand color that
    // must never be recomputed. Every other tone still comes from the seed (or hue and chroma), so roles at any
    // contrast level keep working (exact reproduction is a matter of values).
    const fixed = new Map(Object.entries(source.tones ?? {}).map(([tone, hex]) => [Number(tone), hexToArgb(hex)]));
    if (!fixed.size) return generated;
    return { tone: (t) => fixed.get(t) ?? generated.tone(t) };
  }

  // Default tones for an intent's four roles: the same contrast-safe pattern for every
  // chromatic palette, so declaring a palette is enough to get usable, checked roles.
  const INTENT_TONES = {
    '{name}': { light: [45, 38, 30], dark: [72, 80, 87] },
    'on-{name}': { light: [100], dark: [10] },
    '{name}-container': { light: [93, 91, 89], dark: [22] },
    'on-{name}-container': { light: [20, 15, 10], dark: [88, 92, 96] },
  };

  /**
   * The roles a system must and may value, in output order, each with its one-product rationale:
   * core intents and roles from the vocabulary, then the roles of palettes the system declares.
   */
  function roleTable(system, vocabulary) {
    const table = new Map();
    const pattern = vocabulary.sets.intent.roles;
    const add = (name, palette, rationale, declared) => {
      for (const p of pattern) table.set(p.replace('{name}', name), { rationale, template: palette ? { palette, tone: INTENT_TONES[p] } : null, declared });
    };
    for (const [name, rationale] of Object.entries(vocabulary.intents)) add(name, name in system.palettes ? name : null, rationale, false);
    for (const [role, rationale] of Object.entries(vocabulary.roles)) table.set(role, { rationale, template: null, declared: false });
    for (const [name, decl] of Object.entries(system.palettes)) {
      if (decl.roles !== 'intent') continue;
      if (name in vocabulary.intents) continue; // a core intent valued by a palette of the same name
      if (!decl.description) throw new Error(`palette "${name}": a declared palette with roles needs a "description" — why does this system need it?`);
      add(name, name, decl.description, true);
    }
    // Single roles a layer declares under `vocabulary`, e.g. a reference system's `primary-fixed`.
    for (const [id, decl] of Object.entries(system.vocabulary ?? {})) {
      if (decl.kind !== 'token' || !id.startsWith(SYS_COLOR)) continue;
      const role = id.slice(SYS_COLOR.length);
      if (table.has(role)) continue; // core has adopted it since; system.js reports that
      if (decl.type !== 'color') throw new Error(`${id}: a color role is declared with "$type": "color"`);
      table.set(role, { rationale: decl.rationale, template: null, declared: true, extension: { declaredBy: decl.declaredBy, onRole: decl.onRole } });
    }
    return table;
  }

  /** Resolve every color role of a system for one scheme → `{ role: {p,t} | {alpha,a} | {ref} }`. */
  function rolesFor(system, scheme, vocabulary, palettes = buildPalettes(system)) {
    const table = roleTable(system, vocabulary);
    for (const id of Object.keys(system.tokens)) {
      if (id.startsWith(SYS_COLOR) && !table.has(id.slice(SYS_COLOR.length))) {
        throw new Error(`${id}: not a color role. Core roles are fixed by the vocabulary; for anything else declare a palette with "roles": "intent".`);
      }
    }
    const out = {};
    const picks = [];
    for (const [role, { template }] of table) {
      const id = `${SYS_COLOR}${role}`;
      const op = system.tokens[id];
      // A role is an alias into a palette, so that schemes, contrast levels and Figma all follow it. A brand color
      // that must not be recomputed is a palette with that seed (its tone can be fixed), never a literal on the role.
      if (op && '$value' in op && typeof op.$value !== 'string') {
        throw new Error(`${id}: a color role cannot hold a literal. Alias another role ("{…}"), use a tone or alpha rule, or declare a palette for the color.`);
      }
      const rule = op?.derive ?? (template ? { fn: 'tone', ...template } : undefined);
      if (typeof op?.$value === 'string') out[role] = { ref: op.$value };
      else if (rule?.fn === 'tone') {
        if (!(rule.palette in system.palettes)) throw new Error(`${id}: unknown palette "${rule.palette}"`);
        out[role] = { p: rule.palette, t: inContext(rule.tone, scheme) };
      } else if (rule?.fn === 'alpha') out[role] = { alpha: inContext(rule.of, scheme), a: inContext(rule.amount, scheme) };
      else if (rule?.fn === 'contrast-pick') picks.push({ role, id, rule });
      else if (rule?.fn) throw new SystemError(`${id}: a color role accepts the "tone", "alpha" and "contrast-pick" rules, not "${rule.fn}"`);
      else throw new Error(`${id}: the system gives this core role no value. Add a rule, an alias, or a palette named after its intent.`);
    }
    // contrast-pick chooses among roles (or palette tones), so it is decided once the others are known — and one
    // pick may read another, in dependency order.
    const pending = new Map(picks.map((pick) => [pick.role, pick]));
    const colorOf = (ref, trail) => {
      const target = ref.slice(1, -1);
      if (target.startsWith(REF_PALETTE)) {
        const [p, t] = target.slice(REF_PALETTE.length).split('.');
        if (!palettes[p]) throw new SystemError(`${trail.at(-1)}: {${target}} names the palette "${p}", which this system does not declare`);
        return argbToRgb(palettes[p].tone(Number(t)));
      }
      if (!target.startsWith(SYS_COLOR)) throw new SystemError(`${trail.at(-1)}: "contrast-pick" on a color role chooses among color roles and ${REF_PALETTE}<palette>.<tone> — {${target}} is neither`);
      const role = target.slice(SYS_COLOR.length);
      if (trail.includes(target)) throw new SystemError(`cycle: ${[...trail, target].join(' → ')}`);
      if (pending.has(role)) decide(pending.get(role), trail);
      const def = out[role];
      if (!def) throw new SystemError(`${trail.at(-1)}: unknown color role {${target}}`);
      if (def.ref) return colorOf(def.ref, [...trail, target]);
      if (def.alpha) return { r: def.alpha === 'white' ? 1 : 0, g: def.alpha === 'white' ? 1 : 0, b: def.alpha === 'white' ? 1 : 0, a: def.a / 100 };
      return argbToRgb(palettes[def.p].tone(def.t));
    };
    function decide({ role, id, rule }, trail = []) {
      checkContrastPick(rule, id);
      const next = [...trail, id];
      const winner = pickByContrast(colorOf(rule.on, next), rule.from.map((ref) => ({ ref, color: colorOf(ref, next) })));
      pending.delete(role);
      out[role] = { ref: winner.ref };
    }
    for (const pick of picks) if (pending.has(pick.role)) decide(pick);
    // Keep the vocabulary's order: emitters and the lock file list roles in it.
    return Object.fromEntries([...table.keys()].map((role) => [role, out[role]]));
  }

  const buildPalettes = (system) => Object.fromEntries(Object.entries(system.palettes).map(([name, decl]) => [name, buildPalette(decl, name)]));

  /**
   * Generated DTCG documents for a system's colors: `ref.palette` + `ref.alpha` (only the tones and
   * alphas some role needs, plus a standard set) and one `sys.color` document per scheme, as aliases.
   * @returns {Record<string, object>} file name → DTCG document
   */
  function generateColorFiles(system, { sourcePath, vocabulary, documents }) {
    const table = roleTable(system, vocabulary);
    const palettes = buildPalettes(system);
    const usedTones = Object.fromEntries(Object.keys(palettes).map((name) => [name, new Set(STANDARD_TONES)]));
    const usedAlpha = { black: new Set(), white: new Set() };
    const resolved = {};
    for (const scheme of SCHEMES) {
      resolved[scheme] = rolesFor(system, scheme, vocabulary, palettes);
      for (const def of Object.values(resolved[scheme])) {
        if (def.ref) continue;
        if (def.alpha) usedAlpha[def.alpha].add(def.a);
        else usedTones[def.p].add(def.t);
      }
    }
    // A palette tone some operation NAMES (a contrast-pick candidate, an alias) must exist in ref.palette.
    for (const [, palette, tone] of JSON.stringify([system.tokens, system.rules ?? []]).matchAll(new RegExp(`\\{${REF_PALETTE.replaceAll('.', '\\.')}([a-z0-9-]+)\\.(\\d+)\\}`, 'g'))) usedTones[palette]?.add(Number(tone));

    const note = `Generated by @tanrei/tokens-build from ${sourcePath} (${system.specVersion}). Do not edit.`;
    const files = {};
    const palette = { $type: 'color' };
    for (const [name, tones] of Object.entries(usedTones)) {
      palette[name] = {};
      for (const tone of [...tones].sort((a, b) => a - b)) palette[name][String(tone)] = { $value: argbToColor(palettes[name].tone(tone)) };
    }
    const alphaGroup = { $type: 'color' };
    for (const [base, steps] of Object.entries(usedAlpha)) {
      alphaGroup[base] = {};
      const argb = base === 'black' ? 0xff000000 : 0xffffffff;
      for (const step of [...steps].sort((a, b) => a - b)) alphaGroup[base][String(step)] = { $value: argbToColor(argb, step / 100) };
    }
    files['ref.palette.tokens.json'] = { $description: note, [NS]: { ref: { palette, alpha: alphaGroup } } };

    const across = {}; // what the state tokens of the six schemes have in common (generateStateDocument)
    for (const scheme of SCHEMES) {
      // The usage guidance for agents travels with the generated roles, as it does with every authored group.
      const color = { $type: 'color', ...(vocabulary.llm ? { $extensions: { 'dev.tanrei.llm': vocabulary.llm } } : {}) };
      for (const [role, def] of Object.entries(resolved[scheme])) {
        const value = def.ref ?? (def.alpha ? `{${NS}.ref.alpha.${def.alpha}.${def.a}}` : `{${NS}.ref.palette.${def.p}.${def.t}}`);
        const { rationale, declared, extension } = table.get(role);
        const origin = extension ? { declaredBy: extension.declaredBy, extension: true, ...(extension.onRole ? { onRole: extension.onRole } : {}) } : declared ? { declaredBy: system.id } : {};
        color[role] = { $value: value, $description: rationale, $extensions: { 'dev.tanrei.vocabulary': { rationale, ...origin } } };
      }
      files[`sys.color.${scheme}.tokens.json`] = { $description: note, [NS]: { sys: { color } } };

      // Per-state component colors depend on this scheme's concrete role colors.
      if (documents) {
        const roleColor = (role, trail = []) => {
          const def = resolved[scheme][role];
          if (!def) throw new Error(`unknown color role "${role}"`);
          if (def.ref) return roleColor(def.ref.slice(1, -1).slice(SYS_COLOR.length), [...trail, role]);
          if (def.alpha) return { r: def.alpha === 'white' ? 1 : 0, g: def.alpha === 'white' ? 1 : 0, b: def.alpha === 'white' ? 1 : 0, a: def.a / 100 };
          return argbToRgb(palettes[def.p].tone(def.t));
        };
        const toneColor = (palette, tone, id = '?') => {
          if (!palettes[palette]) throw new SystemError(`${id}: unknown palette "${palette}". Declared: ${Object.keys(palettes).join(', ')}.`);
          const t = inContext(tone, scheme);
          if (typeof t !== 'number' || t < 0 || t > 100) throw new SystemError(`${id}: a tone is a number from 0 to 100, not ${JSON.stringify(t)}`);
          return argbToRgb(palettes[palette].tone(t));
        };
        const states = generateStateDocument({ system: { namespace: NS, ...system }, documents, roleColor, toneColor, note, scheme, across });
        if (states) files[`comp.states.${scheme}.tokens.json`] = states;
      }
    }
    return files;
  }

  return { buildPalette, roleTable, rolesFor, generateColorFiles };
}
