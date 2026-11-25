// A system scope's contrast blocks restate what the default system's contrast blocks declare. A product's root names its
// system (`data-tanrei-system`) and is drawn with tokens.css too, whose rule for a level weighs as much as the scope's
// (`:root:not([data-tanrei-contrast])` under prefers-contrast: more) or the same as the scope's base block
// (`[data-tanrei-contrast="high"]`): wherever the scope's rule for a level is silent, the default system's colour for
// that level shows. Driven through `emitCss(model, { scope, defaultModel })`, the way `buildProductSystem` calls it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contrastProperties, emitCss, idToVar } from '../src/emit/css.js';
import { buildProductSystem } from '../src/product.js';
import { resolveSystem } from '../src/resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/tone-per-state.system.json'), 'utf8'));
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
/** Every property a sheet's contrast rules declare, by level. */
const declaredAt = (rules, scope) => Object.fromEntries(Object.entries(levels(rules, scope)).map(([level, decls]) => [level, Object.keys(decls ?? {})]));

const model = await (await resolveSystem({ layers: [fixture] })).model();
const tanrei = await (await resolveSystem({ system: 'tanrei' })).model();

test('a scope restates each property it is given in every contrast block: a level that changes it, a level that does not, and a colour that does not follow the level at all', () => {
  const rules = blocks(emitCss(model, { scope: fixture.id, restate: [HOVERED, ROLE, FILLED, '--tanrei-comp-no-such-color'] }));
  const base = rules[`${S}, ${S} [data-tanrei-contrast]`];
  const without = levels(blocks(emitCss(model, { scope: fixture.id })), S);
  for (const [level, decls] of Object.entries(levels(rules, S))) {
    // hovered is per scheme and no level moves it: restated at its standard value, which is the base block's.
    assert.equal(without[level][HOVERED], undefined, `${level}: not declared when nothing asks for it`);
    assert.equal(decls[HOVERED], base[HOVERED], level);
    assert.ok(decls[ROLE], `${level}: the role is declared`);
    // An alias of a role: one expression in every scheme, restated as the base block writes it — it reads the level's role through var().
    assert.equal(decls[FILLED], 'var(--tanrei-sys-color-brand)', level);
    // What the system has no token for is left to the sheet around it.
    assert.equal(decls['--tanrei-comp-no-such-color'], undefined, level);
    // And what the level changes is declared either way, at the level.
    assert.equal(decls[PRESSED], without[level][PRESSED], level);
  }
});

test('the default model’s contrast properties are what tokens.css’s contrast blocks declare', () => {
  const root = blocks(emitCss(tanrei));
  const declared = new Set([':root:not([data-tanrei-contrast])', '[data-tanrei-contrast="medium"]', '[data-tanrei-contrast="high"]'].flatMap((selector) => Object.keys(root[selector])));
  assert.deepEqual([...declared].sort(), contrastProperties(tanrei));
  assert.ok(contrastProperties(tanrei).some((name) => name.startsWith('--tanrei-comp-')) && contrastProperties(tanrei).some((name) => name.startsWith('--tanrei-sys-color-')));
});

test('with the default model, a preset’s contrast blocks declare every default contrast property it has a token for, and add nothing else', async () => {
  const wanted = contrastProperties(tanrei);
  for (const system of ['cupertino', 'm3-like']) {
    const scoped = await (await resolveSystem({ system })).model();
    const scope = `[data-tanrei-system="${system}"]`;
    const rules = blocks(emitCss(scoped, { scope: system, defaultModel: tanrei }));
    const base = rules[`${scope}, ${scope} [data-tanrei-contrast]`];
    const own = declaredAt(blocks(emitCss(scoped, { scope: system })), scope);
    for (const [level, names] of Object.entries(declaredAt(rules, scope))) {
      assert.deepEqual(wanted.filter((name) => name in base && !names.includes(name)), [], `${system}, ${level}: every default contrast property the system has a token for is declared again`);
      assert.deepEqual(names.filter((name) => !own[level].includes(name) && !wanted.includes(name)), [], `${system}, ${level}: only the default system's are added`);
    }
  }
});

test('a root sheet restates nothing: it is the sheet the scopes restate', () => {
  assert.equal(emitCss(model, { defaultModel: tanrei, restate: [HOVERED, FILLED] }), emitCss(model));
});

test('`tanrei build` writes the product’s sheet with the default system’s contrast properties restated', async () => {
  const css = (await buildProductSystem({ layers: [fixture], targets: ['web'] })).files.web[`${fixture.id}.css`];
  const want = declaredAt(blocks(emitCss(model, { scope: fixture.id, defaultModel: tanrei })), S);
  const got = declaredAt(blocks(css), S);
  assert.deepEqual(got, want);
  for (const level of Object.keys(got)) assert.ok(contrastProperties(tanrei).filter((name) => name.startsWith('--tanrei-comp-snackbar')).every((name) => got[level].includes(name)), level);
});
