// Exactness, measured. A preset that reproduces a published design system carries a fidelity map
// (tokens/fidelity/<system>.fidelity.json) from the REFERENCE's tokens to what Tanrei resolves. Every
// reference token of a covered component must be mapped-and-equal, covered by another mapping, or listed as
// unmapped with the mimicry gap that explains it. The result is a number, published next to the preset.
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, rgba } from './model.js';
import { typeFamily } from './pure.js';

const DIR = 'tokens/fidelity';
const REM = 16;

export const fidelityMaps = (repoRoot = REPO_ROOT) =>
  fs.existsSync(path.join(repoRoot, DIR)) ? fs.readdirSync(path.join(repoRoot, DIR)).filter((f) => f.endsWith('.fidelity.json')).map((f) => f.replace('.fidelity.json', '')).sort() : [];

export function loadFidelityMap(system, repoRoot = REPO_ROOT) {
  const map = JSON.parse(fs.readFileSync(path.join(repoRoot, DIR, `${system}.fidelity.json`), 'utf8'));
  const reference = JSON.parse(fs.readFileSync(path.join(repoRoot, DIR, map.reference), 'utf8'));
  return { map, reference };
}

const hex = ({ r, g, b, a }) => `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}${a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''}`;
const parseHex = (raw) => {
  const text = String(raw).trim().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3');
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(text);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
};
/** `source` over `backdrop`, both straight-alpha 0–255 colors. */
const over = (source, backdrop, opacity) => {
  const sa = source.a * opacity;
  const a = sa + backdrop.a * (1 - sa);
  const ch = (k) => (a === 0 ? 0 : (source[k] * sa + backdrop[k] * backdrop.a * (1 - sa)) / a);
  return { r: ch('r'), g: ch('g'), b: ch('b'), a };
};
const px = (text) => (/rem$/.test(text) ? parseFloat(text) * REM : parseFloat(text));

/**
 * @returns {{ system, reference, total, equal, covered, different: object[], unmapped: object[], unaccounted: string[], fidelity: number }}
 */
export function measureFidelity(model, { map, reference }) {
  const schemes = ['light', 'dark'];
  const refValue = (id, scheme) => { const v = reference.tokens[id]; return v && typeof v === 'object' ? v[scheme] : v; };
  const tokenIn = (id, scheme) => (id.startsWith('tanrei.sys.color.') ? model.colors[scheme][id.slice('tanrei.sys.color.'.length)] : (model.componentColors[scheme][id] ?? model.tokens[id]));
  const stateEntries = Object.entries(map.states ?? {});
  const unmapped = new Map((map.unmapped ?? []).map((u) => [u.ref, u]));
  const result = { system: map.system, reference: reference.reference, scope: map.scope, total: 0, equal: 0, covered: 0, different: [], unmapped: [], unaccounted: [] };

  // Every color role the reference publishes, by name (extensions included: `primary-fixed`, `background`…).
  if (map.colors) {
    const skipped = new Map((map.colors.unmapped ?? []).map((u) => [u.ref, u]));
    for (const id of Object.keys(reference.tokens).filter((k) => k.startsWith('md.sys.color.'))) {
      const role = id.slice('md.sys.color.'.length);
      result.total += 1;
      if (skipped.has(role)) { result.unmapped.push({ ref: id, ...skipped.get(role) }); continue; }
      const tanrei = `tanrei.sys.color.${map.colors.rename?.[role] ?? role}`;
      const problems = [];
      for (const scheme of schemes) {
        const token = tokenIn(tanrei, scheme);
        const expected = hex(parseHex(refValue(id, scheme)));
        const actual = token ? hex(rgba(token.value)) : `no role ${tanrei}`;
        if (expected !== actual) problems.push({ scheme, expected, actual });
      }
      if (problems.length) result.different.push({ ref: id, tanrei, problems });
      else result.equal += 1;
    }
  }

  // Every text style the reference publishes, field by field (`md.sys.typescale.<role>-<field>`), against the
  // Tanrei role `map.typescale.roles[<role>]` names (levels, not Material's names). `emphasized` roles
  // compare weight only, against the base role's weight plus the family's `emphasis.*` step.
  if (map.typescale) {
    const FIELDS = { font: 'fontFamily', size: 'fontSize', 'line-height': 'lineHeight', tracking: 'letterSpacing', weight: 'fontWeight' };
    const skipped = new Map((map.typescale.unmapped ?? []).map((u) => [u.ref, u]));
    for (const id of Object.keys(reference.tokens).filter((k) => k.startsWith('md.sys.typescale.'))) {
      const rest = id.slice('md.sys.typescale.'.length);
      const m = /^(.*)-(font|size|line-height|tracking|weight)$/.exec(rest);
      if (!m) continue;
      const [, refRole, refField] = m;
      result.total += 1;
      if (skipped.has(refRole) || skipped.has(rest)) { result.unmapped.push({ ref: id, ...(skipped.get(refRole) ?? skipped.get(rest)) }); continue; }
      const emphasized = refRole.endsWith('-emphasized');
      const baseRole = emphasized ? refRole.slice(0, -'-emphasized'.length) : refRole;
      const tanreiRole = map.typescale.roles[baseRole];
      if (!tanreiRole) { result.unaccounted.push(id); continue; }
      if (emphasized && refField !== 'weight') { result.covered += 1; continue; } // same style as the base role but for weight
      const token = model.tokens[`tanrei.sys.typescale.${tanreiRole}`];
      if (!token) { result.different.push({ ref: id, tanrei: tanreiRole, problems: [{ scheme: 'light', expected: refValue(id, 'light'), actual: `no role ${tanreiRole}` }] }); continue; }
      const field = FIELDS[refField];
      const expectedRaw = refValue(id, 'light');
      let expected, actual;
      if (field === 'fontFamily') { expected = String(expectedRaw).replaceAll(/['"]/g, ''); actual = Array.isArray(token.value.fontFamily) ? token.value.fontFamily[0] : token.value.fontFamily; }
      else if (field === 'fontWeight') {
        // The step a role takes: named by the map where the reference decides otherwise, else the one rule (pure.js).
        const family = map.typescale.families?.[tanreiRole] ?? typeFamily(tanreiRole);
        expected = Number(expectedRaw); actual = token.value.fontWeight + (emphasized ? (model.tokens[`tanrei.sys.typescale.emphasis.${family}`]?.value ?? 0) : 0);
      } else if (field === 'lineHeight') { expected = px(expectedRaw); actual = Math.round(token.value.fontSize.value * token.value.lineHeight * 100) / 100; }
      else { expected = Math.round(px(expectedRaw) * 1000) / 1000; actual = Math.round(token.value[field].value * 1000) / 1000; }
      if (String(expected) !== String(actual)) result.different.push({ ref: id, tanrei: `tanrei.sys.typescale.${tanreiRole}`, problems: [{ scheme: 'light', expected, actual }] });
      else result.equal += 1;
    }
  }

  // A reference keyed by SIZE (one token object per size): `{size}` in the target is the Tanrei size it maps to.
  if (map.sizes) {
    const skipped = new Map((map.sizes.unmapped ?? []).map((u) => [u.ref, u]));
    for (const [object, size] of Object.entries(map.sizes.objects)) {
      const prefix = `androidx.${object}.`;
      for (const id of Object.keys(reference.tokens).filter((k) => k.startsWith(prefix))) {
        const key = id.slice(prefix.length);
        result.total += 1;
        if (skipped.has(key)) { result.unmapped.push({ ref: id, ...skipped.get(key) }); continue; }
        const rule = map.sizes.map.find((r) => r.ref === key);
        if (!rule) { result.unaccounted.push(id); continue; }
        const tanrei = rule.tanrei.replaceAll('{size}', size);
        const token = model.tokens[tanrei];
        const raw = reference.tokens[id];
        let expected, actual;
        if (!token) { expected = raw; actual = `no token ${tanrei}`; }
        else if (rule.kind === 'shape') { expected = raw.split('.').at(-1).replace(/^Corner/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(); actual = (token.aliasFinal ?? token.alias ?? '').split('.').at(-1); }
        else { expected = parseFloat(raw); actual = token.value.value; }
        if (expected !== actual) result.different.push({ ref: id, tanrei, problems: [{ scheme: 'all', expected, actual }] });
        else result.equal += 1;
      }
    }
  }

  for (const [component, variant] of Object.entries(map.components ?? {})) {
    const prefix = `md.comp.${component}.`;
    const keys = Object.keys(reference.tokens).filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
    // Expand `{state}` rules once per state; a literal rule wins over an expanded one.
    const rules = new Map();
    for (const rule of map.map) {
      const variants = rule.ref.includes('{state}') ? stateEntries : [[null, null]];
      for (const [refState, state] of variants) {
        const fill = (text) => text?.replaceAll('{state}', text === rule.tanrei ? state : refState).replaceAll('{state-ref}', refState).replaceAll('{variant}', variant);
        const key = rule.ref.replaceAll('{state}', refState);
        if (!rules.has(key) || !rule.ref.includes('{state}')) rules.set(key, { ...rule, ref: key, tanrei: fill(rule.tanrei), with: rule.with?.replaceAll('{state}', refState), opacity: rule.opacity?.replaceAll('{state}', refState), 'covered-by': rule['covered-by']?.replaceAll('{state}', refState) });
      }
    }
    for (const key of keys) {
      const id = `${prefix}${key}`;
      result.total += 1;
      if (unmapped.has(id) || unmapped.has(key)) { result.unmapped.push({ ref: id, ...(unmapped.get(id) ?? unmapped.get(key)) }); continue; }
      const rule = rules.get(key);
      if (!rule) { result.unaccounted.push(id); continue; }
      if (rule['covered-by']) {
        if (keys.includes(rule['covered-by'])) { result.covered += 1; continue; }
        result.unaccounted.push(`${id} (its covering token ${rule['covered-by']} is absent)`); continue;
      }
      const problems = [];
      for (const scheme of schemes) {
        const token = tokenIn(rule.tanrei, scheme);
        if (!token) { problems.push({ scheme, expected: refValue(id, scheme), actual: `no token ${rule.tanrei}` }); continue; }
        const expectedRaw = refValue(id, scheme);
        let expected, actual;
        if (rule.kind === 'level') {
          const level = (token.aliasFinal ?? token.alias ?? '').split('.').at(-1);
          expected = String(expectedRaw); actual = String(refValue(`md.sys.elevation.${level}`, scheme) ?? `alias ${token.alias}`);
        } else if (rule.kind === 'state-layer') {
          const base = keys.includes(rule.over) ? parseHex(refValue(`${prefix}${rule.over}`, scheme)) : { r: 0, g: 0, b: 0, a: 0 };
          expected = hex(over(parseHex(expectedRaw), base, Number(refValue(`${prefix}${rule.opacity}`, scheme)))); actual = hex(rgba(token.value));
        } else if (rule.field) {
          const field = token.value[rule.field];
          if (rule.field === 'fontFamily') { expected = expectedRaw.replaceAll(/['"]/g, ''); actual = (Array.isArray(field) ? field[0] : field); }
          else if (rule.field === 'fontWeight') { expected = Number(expectedRaw); actual = field; }
          else if (rule.field === 'lineHeight') { expected = px(expectedRaw); actual = Math.round(token.value.fontSize.value * field * 100) / 100; }
          else { expected = Math.round(px(expectedRaw) * 1000) / 1000; actual = Math.round(field.value * 1000) / 1000; }
        } else if (token.type === 'color') {
          const color = parseHex(String(expectedRaw));
          if (!color) { problems.push({ scheme, expected: expectedRaw, actual: 'the reference value is not a color this harness reads' }); continue; }
          const opacity = rule.with && keys.includes(rule.with) ? Number(refValue(`${prefix}${rule.with}`, scheme)) : 1;
          expected = hex({ ...color, a: color.a * opacity }); actual = hex(rgba(token.value));
        } else if (token.type === 'dimension') { expected = px(expectedRaw); actual = token.value.value; }
        else { expected = Number(expectedRaw); actual = token.value; }
        if (expected !== actual) problems.push({ scheme, expected, actual });
      }
      if (problems.length) result.different.push({ ref: id, tanrei: rule.tanrei, problems });
      else result.equal += 1;
    }
  }
  const measured = result.total - result.covered;
  result.fidelity = measured ? Math.round((result.equal / measured) * 1000) / 1000 : 1;
  return result;
}
