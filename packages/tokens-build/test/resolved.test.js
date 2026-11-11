// Resolved values (emit/resolved.js): every token as one scheme draws it, flat by id in the plain form a program reads
// without a DTCG library, and the theme color of each scheme. The same values the design tools' DTCG holds, in another
// form: `@tanrei/web/systems/<id>.<scheme>.json` is written from those documents, and `tanrei build` writes a product's.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { THEME_COLOR_TOKEN, flatValues, hexColor, plainValue, resolvedDocument, resolvedValues, themeColors } from '../src/emit/resolved.js';
import { CONFIG, REPO_ROOT } from '../src/model.js';
import { buildProductSystem, resolveSystem } from '../src/product.js';

const layerFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/tone-per-state.system.json');
const BUTTON = `${CONFIG.namespace}.comp.button.filled`;
const srgb = (components, alpha) => ({ colorSpace: 'srgb', components, ...(alpha === undefined ? {} : { alpha }) });

test('a color is #rrggbb, or #rrggbbaa when it is not opaque; a dimension and a duration are one string; the rest as they are', () => {
  assert.equal(hexColor(srgb([1, 1, 1])), '#ffffff');
  assert.equal(hexColor(srgb([0, 0.5, 1], 1)), '#0080ff');
  assert.equal(hexColor(srgb([0, 0, 0], 0.08)), '#00000014');
  assert.equal(hexColor(srgb([0, 0, 0], 0)), '#00000000');
  assert.throws(() => hexColor({ colorSpace: 'display-p3', components: [1, 0, 0] }), /not sRGB/);
  assert.equal(plainValue({ value: 16, unit: 'px' }), '16px');
  assert.equal(plainValue({ value: 200, unit: 'ms' }), '200ms');
  assert.deepEqual(plainValue([0.2, 0, 0, 1]), [0.2, 0, 0, 1]);
  assert.equal(plainValue(0.5), 0.5);
  assert.deepEqual(plainValue({ fontFamily: ['Inter', 'sans-serif'], fontSize: { value: 14, unit: 'px' }, fontWeight: 400, lineHeight: 1.5 }), { fontFamily: ['Inter', 'sans-serif'], fontSize: '14px', fontWeight: 400, lineHeight: 1.5 });
  assert.deepEqual(plainValue([{ offsetX: { value: 0, unit: 'px' }, color: srgb([0, 0, 0], 0.5), inset: false }]), [{ offsetX: '0px', color: '#00000080', inset: false }]);
});

test('every token of a resolved document is in the flat values, by its id, and nothing else is', () => {
  const doc = { $description: 'd', [CONFIG.namespace]: { sys: { color: { surface: { $type: 'color', $value: srgb([1, 1, 1]), $description: 'x' } }, space: { space100: { $type: 'dimension', $value: { value: 8, unit: 'px' } } } } } };
  assert.deepEqual(flatValues(doc), { [THEME_COLOR_TOKEN]: '#ffffff', [`${CONFIG.namespace}.sys.space.space100`]: '8px' });
  const file = resolvedValues(doc, { system: 'acme', scheme: 'dark' });
  assert.equal(file.system, 'acme');
  assert.equal(file.scheme, 'dark');
  assert.match(file.$comment, /"acme"[\s\S]*"dark"/);
});

test('the hex of every color the design tools’ documents hold is the one the flat values give it', () => {
  for (const scheme of ['light', 'dark-high']) {
    const doc = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `design/tokens/${CONFIG.namespace}.${scheme}.tokens.json`), 'utf8'));
    const flat = flatValues(doc);
    let colors = 0;
    const walk = (node, id) => {
      if (node.$type === 'color') {
        colors += 1;
        assert.equal(flat[id].slice(0, 7), node.$value.hex, `${scheme}: ${id}`);
        assert.equal(flat[id].length, (node.$value.alpha ?? 1) < 1 ? 9 : 7, `${scheme}: ${id} says its alpha only when it has one`);
      } else for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child, id ? `${id}.${key}` : key);
    };
    walk(doc, '');
    assert.ok(colors > 1000, `${scheme}: ${colors} colors`);
  }
});

test('tanrei build: every scheme’s values in the tokens output and the theme colors in the web output, each scheme’s own', async () => {
  const built = await buildProductSystem({ layerFile, targets: ['tokens', 'web'] });
  const model = await (await resolveSystem({ layerFile })).model();
  const { id } = built;
  const themeColor = built.files.web[`${id}.theme-color.json`];
  assert.deepEqual(Object.keys(themeColor), [...model.schemes].sort(), 'every scheme, by name');
  const by = (token) => Object.fromEntries(model.schemes.map((scheme) => [scheme, built.files.tokens[`${id}.${scheme}.json`].tokens[`${BUTTON}.${token}.container.color`]]));
  for (const scheme of model.schemes) {
    const file = built.files.tokens[`${id}.${scheme}.json`];
    assert.equal(file.scheme, scheme);
    assert.equal(file.system, id);
    assert.deepEqual(Object.keys(file.tokens).sort(), Object.keys(model.tokens).sort(), `${scheme}: every token, and only tokens`);
    assert.deepEqual(file.tokens, flatValues(resolvedDocument(model, scheme)));
    assert.equal(themeColor[scheme], file.tokens[THEME_COLOR_TOKEN], `${scheme}: the theme color is the surface`);
    assert.match(themeColor[scheme], /^#[0-9a-f]{6}$/);
  }
  assert.notEqual(themeColor.light, themeColor.dark);
  // The fixture's two state colors (per-scheme-paints.test.js): one follows the theme, the other the contrast level too.
  assert.notEqual(by('hovered').light, by('hovered').dark, 'each theme its own value');
  assert.equal(new Set(['light', 'light-medium', 'light-high'].map((scheme) => by('pressed')[scheme])).size, 3, 'each contrast level its own value');
});

test('the theme color is opaque, whatever the surface’s alpha, and a scheme without a surface is refused', () => {
  const doc = (alpha) => ({ [CONFIG.namespace]: { sys: { color: { surface: { $type: 'color', $value: srgb([0, 0, 0], alpha) } } } } });
  assert.deepEqual(themeColors({ light: doc(0.5), dark: doc(1) }), { light: '#000000', dark: '#000000' });
  assert.throws(() => themeColors({ light: {} }), /no tanrei\.sys\.color\.surface in scheme "light"/);
});
