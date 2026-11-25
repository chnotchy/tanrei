// A system scope's contrast blocks restate what the default system's contrast blocks declare. A product's root names its
// system (`data-tanrei-system`) and is drawn with tokens.css too, whose rule for a level weighs as much as the scope's
// (`:root:not([data-tanrei-contrast])` under prefers-contrast: more) or the same as the scope's base block
// (`[data-tanrei-contrast="high"]`): wherever the scope's rule for a level is silent, the default system's colour for
// that level shows. Driven through `emitCss(model, { scope })`, the way `buildProductSystem` calls it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contrastProperties, emitCss, idToVar } from '../src/emit/css.js';
import { resolveSystem } from '../src/resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/tone-per-state.system.json'), 'utf8'));
const DEFAULT_CONTRAST = JSON.parse(fs.readFileSync(path.join(here, '../generated/default-contrast.json'), 'utf8'));
const S = `[data-tanrei-system="${fixture.id}"]`;
const HOVERED = idToVar('tanrei.comp.button.filled.hovered.container.color');
const PRESSED = idToVar('tanrei.comp.button.filled.pressed.container.color');
const FILLED = idToVar('tanrei.comp.button.filled.container.color');
const ROLE = '--tanrei-sys-color-surface';

/** `{ selector → { property → value } }` of the one @layer the emitter writes (the @media block's rule keeps its selector). */
function blocks(css) {
  const out = {};
  for (const [, selector, body] of css.matchAll(/^\s*([^{}\n]+?) \{\n((?:\s+[^{}\n]+;\n)+)\s*\}/gm)) {
    out[selector] = Object.fromEntries([...body.matchAll(/^\s*([^:\s]+): (.*);$/gm)].map(([, name, value]) => [name, value]));
  }
  return out;
}
const levels = (rules, scope) => {
  const scoped = (level) => `${scope}[data-tanrei-contrast="${level}"], ${scope} [data-tanrei-contrast="${level}"], [data-tanrei-contrast="${level}"] ${scope}:not([data-tanrei-contrast])`;
  return { more: rules[`${scope}:not([data-tanrei-contrast])`], medium: rules[scoped('medium')], high: rules[scoped('high')] };
};

const model = await (await resolveSystem({ layers: [fixture] })).model();

test('a scope restates each property it is given in every contrast block: a level that changes it, a level that does not, and a colour that does not follow the level at all', () => {
  const rules = blocks(emitCss(model, { scope: fixture.id, restate: [HOVERED, ROLE, FILLED, '--tanrei-comp-no-such-color'] }));
  const base = rules[`${S}, ${S} [data-tanrei-contrast]`];
  const without = levels(blocks(emitCss(model, { scope: fixture.id, restate: [] })), S);
  for (const [level, decls] of Object.entries(levels(rules, S))) {
    // hovered is per scheme and no level moves it: restated at its standard value, which is the base block's.
    assert.equal(without[level][HOVERED], undefined, `${level}: not declared when nothing asks for it`);
    assert.equal(decls[HOVERED], base[HOVERED], level);
    // A role, at the level: the same value the level gives wherever it differs.
    assert.ok(decls[ROLE], `${level}: the role is declared`);
    // An alias of a role: one expression in every scheme, restated as the base block writes it — it reads the level's role through var().
    assert.equal(decls[FILLED], 'var(--tanrei-sys-color-brand)', level);
    // What the system has no token for is left to the sheet around it.
    assert.equal(decls['--tanrei-comp-no-such-color'], undefined, level);
    // And what the level changes is declared either way, at the level.
    assert.equal(decls[PRESSED], without[level][PRESSED], level);
  }
});

test('by default a scope restates the default system’s contrast properties, which the build writes from tokens.css’s own', async () => {
  const tanrei = await (await resolveSystem({ system: 'tanrei' })).model();
  assert.deepEqual(DEFAULT_CONTRAST.properties, contrastProperties(tanrei), 'generated/default-contrast.json is the default system’s');
  const rootRules = blocks(emitCss(tanrei));
  const declaredByRoot = new Set([
    ...Object.keys(rootRules[':root:not([data-tanrei-contrast])']),
    ...Object.keys(rootRules['[data-tanrei-contrast="medium"]']),
    ...Object.keys(rootRules['[data-tanrei-contrast="high"]']),
  ]);
  assert.deepEqual([...declaredByRoot].sort(), DEFAULT_CONTRAST.properties, 'what contrastProperties names is what tokens.css’s contrast blocks declare');
  assert.ok(DEFAULT_CONTRAST.properties.some((name) => name.startsWith('--tanrei-comp-')) && DEFAULT_CONTRAST.properties.some((name) => name.startsWith('--tanrei-sys-color-')));

  for (const system of ['cupertino', 'm3-like']) {
    const scoped = await (await resolveSystem({ system })).model();
    const rules = blocks(emitCss(scoped, { scope: system }));
    const base = rules[`[data-tanrei-system="${system}"], [data-tanrei-system="${system}"] [data-tanrei-contrast]`];
    for (const [level, decls] of Object.entries(levels(rules, `[data-tanrei-system="${system}"]`))) {
      const silent = DEFAULT_CONTRAST.properties.filter((name) => name in base && !(name in decls));
      assert.deepEqual(silent, [], `${system}, ${level}: every default contrast property the system has a token for is declared again`);
    }
  }
});

test('a root sheet restates nothing: it is the sheet the scopes restate', () => {
  const plain = emitCss(model);
  assert.equal(emitCss(model, { restate: [HOVERED, FILLED] }), plain);
  const rules = blocks(plain);
  for (const selector of [':root:not([data-tanrei-contrast])', '[data-tanrei-contrast="medium"]', '[data-tanrei-contrast="high"]']) {
    assert.equal(rules[selector][HOVERED], undefined, selector);
    assert.equal(rules[selector][FILLED], undefined, selector);
  }
});

test('the size it costs: a contrast block of a scope holds at most the default system’s properties beyond its own changes', async () => {
  for (const system of ['cupertino', 'm3-like']) {
    const scoped = await (await resolveSystem({ system })).model();
    const own = levels(blocks(emitCss(scoped, { scope: system, restate: [] })), `[data-tanrei-system="${system}"]`);
    const all = levels(blocks(emitCss(scoped, { scope: system })), `[data-tanrei-system="${system}"]`);
    for (const level of Object.keys(all)) {
      const added = Object.keys(all[level]).filter((name) => !(name in own[level]));
      assert.ok(added.every((name) => DEFAULT_CONTRAST.properties.includes(name)), `${system}, ${level}: only the default system's are added`);
      assert.ok(Object.keys(all[level]).length <= Object.keys(own[level]).length + DEFAULT_CONTRAST.properties.length, `${system}, ${level}`);
    }
  }
});
