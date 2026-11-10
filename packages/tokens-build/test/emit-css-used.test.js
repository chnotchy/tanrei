// The CSS emitter's `used` option: a sheet of only the custom properties a page reads from it, and what their values
// read, to the end. Off by default, and then the sheet is the one the build has always written, byte for byte.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { emitCss } from '../src/emit/css.js';
import { heldComponents, layerChain, outsideStandIns, sheetAvailability } from '../src/layers.js';
import { listSystems } from '../src/bundle.js';
import { loadSystem } from '../src/scheme.js';
import { resolveSystem } from '../src/resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '../../..');
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/tone-per-state.system.json'), 'utf8'));
const PRESSED = '--tanrei-comp-button-filled-pressed-container-color';
const FILLED = '--tanrei-comp-button-filled-container-color';
const BRAND = '--tanrei-sys-color-brand';

/** `[{ selector, declarations: Map }]`, in the sheet's order (an @media block's rule keeps its own selector). */
function rules(css) {
  return [...css.matchAll(/^\s*([^{}\n]+?) \{\n((?:\s+[^{}\n]+;\n)+)\s*\}/gm)].map(([, selector, body]) => ({
    selector,
    declarations: new Map([...body.matchAll(/^\s*([^:\s]+): (.*);$/gm)].map(([, name, value]) => [name, value])),
  }));
}
const names = (css) => new Set(rules(css).flatMap((rule) => [...rule.declarations.keys()]));

const read = (id) => loadSystem(REPO_ROOT, id);
const availability = (id) => sheetAvailability(layerChain(id, read), heldComponents(listSystems(REPO_ROOT), read), outsideStandIns(listSystems(REPO_ROOT), read));

test('off by default: the default system’s sheet and a preset’s are the files the build writes, byte for byte', async () => {
  const model = await (await resolveSystem({ system: 'tanrei' })).model();
  const sheet = emitCss(model, availability('tanrei'));
  assert.equal(sheet, fs.readFileSync(path.join(REPO_ROOT, 'packages/web/src/generated/tokens.css'), 'utf8'));
  assert.equal(emitCss(model, { ...availability('tanrei'), used: undefined }), sheet, 'an absent `used` is no option');

  const preset = 'cupertino';
  const presetModel = await (await resolveSystem({ system: preset })).model();
  const written = fs.readFileSync(path.join(REPO_ROOT, `packages/web/src/generated/systems/${preset}.css`), 'utf8');
  // The preset's file may open with a note on the measurements that do not apply to it (src/cli.js); the sheet follows it.
  assert.ok(written.endsWith(emitCss(presetModel, { scope: preset, ...availability(preset) })));
});

test('on: the properties named and what their values read, in the rules that declare them, and nothing else', async () => {
  const model = await (await resolveSystem({ layers: [fixture] })).model();
  const whole = emitCss(model, { scope: fixture.id });
  const some = emitCss(model, { scope: fixture.id, used: [FILLED, PRESSED] });
  const kept = names(some);
  // FILLED is `var(BRAND)`: the brand role comes with it, and what the brand role reads (nothing: a color).
  assert.equal(rules(whole).find((rule) => rule.declarations.has(FILLED)).declarations.get(FILLED), `var(${BRAND})`);
  for (const name of [FILLED, PRESSED, BRAND]) assert.ok(kept.has(name), `${name} is kept`);
  const customProperties = [...kept].filter((name) => name.startsWith('--'));
  assert.ok(customProperties.length < 10, `a few properties are kept, not the sheet's ${names(whole).size} (${customProperties.join(', ')})`);
  // Each kept declaration is the whole sheet's, in the same rule.
  const byRule = new Map(rules(whole).map((rule) => [rule.selector, rule.declarations]));
  for (const rule of rules(some)) for (const [name, value] of rule.declarations) assert.equal(byRule.get(rule.selector)?.get(name), value, `${name} in ${rule.selector}`);
  // PRESSED differs per scheme and per contrast level: it is declared again where the whole sheet declares it again.
  const declaring = (css) => rules(css).filter((rule) => rule.declarations.has(PRESSED)).map((rule) => rule.selector);
  assert.deepEqual(declaring(some), declaring(whole));
  // A rule left with no property is not written; a declaration that is not a custom property is kept.
  assert.ok(rules(some).every((rule) => rule.declarations.size > 0));
  assert.ok(rules(some).some((rule) => rule.declarations.get('color-scheme') === 'dark'), 'the forced schemes stay');
});

test('on, with nothing used: only what is not a token', async () => {
  const model = await (await resolveSystem({ layers: [fixture] })).model();
  const none = emitCss(model, { used: [] });
  assert.deepEqual([...names(none)].filter((name) => name.startsWith('--')), []);
  assert.deepEqual(new Set(rules(none).map((rule) => rule.selector)), new Set([':root', '[data-tanrei-theme="light"]', '[data-tanrei-theme="dark"]']));
});

test('a value that reads a value that reads another: the whole chain is kept', async () => {
  const model = await (await resolveSystem({ layers: [fixture] })).model();
  const whole = rules(emitCss(model));
  const reads = new Map(whole.flatMap((rule) => [...rule.declarations]).map(([name, value]) => [name, [...value.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1])]));
  // A property two steps from a value of its own: it reads one that reads another.
  const deep = [...reads].find(([, first]) => first.some((name) => (reads.get(name) ?? []).length));
  assert.ok(deep, 'the sheet has a chain of two');
  const kept = names(emitCss(model, { used: [deep[0]] }));
  const closure = new Set();
  const walk = (name) => !closure.has(name) && (closure.add(name), (reads.get(name) ?? []).forEach(walk));
  walk(deep[0]);
  for (const name of closure) if (reads.has(name)) assert.ok(kept.has(name), `${name}, read through ${deep[0]}, is kept`);
});
