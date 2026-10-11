// A component color that differs per scheme (a `tone` or `contrast-pick` rule — IR paint kind 'scheme') reaches every
// platform with all six values, each stated for its own scheme. An emitter that
// cannot draw a paint kind throws; none may fall back to the light value.
// One fixture for every emitter: test/fixtures/tone-per-state.system.json — the filled Button's hovered and pressed
// container colors are explicit tones of a brand ramp, different in light, dark and at each contrast level.
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildIR } from '../src/ir.js';
import { TARGETS, buildProductSystem } from '../src/product.js';
import { resolveSystem, validateSystem } from '../src/resolve.js';

const layerFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/tone-per-state.system.json');
const HOVERED = 'tanrei.comp.button.filled.hovered.container.color';
const PRESSED = 'tanrei.comp.button.filled.pressed.container.color';
const hex = ({ r, g, b }) => [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');

/** What the fixture resolves to: { [tokenId]: { [scheme]: 'rrggbb' } }, read from the IR (never written down here). */
async function expected() {
  const resolved = await resolveSystem({ layerFile });
  const ir = buildIR(await resolved.model());
  const out = {};
  for (const token of ir.componentTokens.button.filter((t) => t.paint?.kind === 'scheme')) {
    assert.deepEqual(Object.keys(token.paint.by), ir.schemes);
    assert.ok(Object.values(token.paint.by).every((paint) => paint.kind === 'literal'));
    out[token.id] = Object.fromEntries(Object.entries(token.paint.by).map(([scheme, paint]) => [scheme, hex(paint)]));
  }
  return out;
}

test('the fixture: a valid layer without warnings whose two state colors differ per scheme — and only those two', async () => {
  assert.deepEqual(validateSystem({ layerFile }), []);
  assert.deepEqual(await (await resolveSystem({ layerFile })).warnings(), []);
  const colors = await expected();
  assert.deepEqual(Object.keys(colors).sort(), [HOVERED, PRESSED]);
  assert.notEqual(colors[HOVERED].light, colors[HOVERED].dark, 'follows the theme');
  assert.equal(new Set(['light', 'light-medium', 'light-high'].map((scheme) => colors[PRESSED][scheme])).size, 3, 'and the contrast level');
  assert.notEqual(colors[HOVERED].light, colors[PRESSED].light, 'each state its own tone');
});

// Per target: is THIS color stated for THIS scheme in the platform's output? (Not merely present somewhere.)
const camel = (scheme) => scheme.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
const unit = (c) => String(Math.round((c / 255) * 1e4) / 1e4);
const DRAWS = {
  // light-dark(<light>, <dark>) at the normal level, and again inside the medium and high contrast blocks.
  web: (text, id, by) => {
    const name = `--${id.replaceAll('.', '-')}`;
    const pair = (level) => `${name}: light-dark(#${by[`light${level}`]}, #${by[`dark${level}`]});`;
    const blocks = text.split(/\n {2}(?=\[data-|@media)/);
    const holds = (selector, level) => blocks.some((block) => selector.test(block.split('\n')[0]) && block.includes(pair(level)));
    const same = (level) => pair(level) === pair('');
    return text.includes(pair('')) && (same('-medium') || holds(/data-tanrei-contrast="medium"/, '-medium')) && (same('-high') || (holds(/data-tanrei-contrast="high"/, '-high') && holds(/prefers-contrast: more/, '-high')));
  },
  flutter: (text, id, by, scheme) => new RegExp(`\\b${camel(scheme)}: TanreiPaint\\.literal\\(Color\\(0xFF${by[scheme]}\\)\\)`, 'i').test(text),
  compose: (text, id, by, scheme) => new RegExp(`\\b${camel(scheme)} = TanreiPaint\\.Literal\\(Color\\(0xFF${by[scheme]}\\)\\)`, 'i').test(text),
  swiftui: (text, id, by, scheme, { r, g, b }) => text.includes(`.${camel(scheme)}: .literal(TanreiColorValue(red: ${unit(r)}, green: ${unit(g)}, blue: ${unit(b)}, opacity: 1))`),
  'react-native': (text, id, by, scheme, { r, g, b }) => new RegExp(`\\b${camel(scheme)}: \\{ kind: "literal", r: ${r}, g: ${g}, b: ${b}, a: 1 \\}`).test(text),
};
const CODE_TARGETS = TARGETS.filter((t) => !['tokens', 'tailwind', 'shadcn'].includes(t));

for (const target of CODE_TARGETS) {
  test(`${target}: every scheme's value of both state colors is stated for that scheme — never the light value shipped to dark mode`, async () => {
    const colors = await expected();
    const built = await buildProductSystem({ layerFile, targets: [target], kotlinPackage: 'com.acme.design' });
    const text = Object.values(built.files[target]).join('\n');
    for (const [id, byScheme] of Object.entries(colors)) {
      for (const [scheme, color] of Object.entries(byScheme)) {
        const rgb = { r: parseInt(color.slice(0, 2), 16), g: parseInt(color.slice(2, 4), 16), b: parseInt(color.slice(4, 6), 16) };
        assert.ok(DRAWS[target](text, id, byScheme, scheme, rgb), `${target}: ${id} in ${scheme} (#${color}) is not stated for that scheme`);
      }
    }
  });
}

test('the tokens output says it exactly, whatever the code targets can do', async () => {
  const colors = await expected();
  const built = await buildProductSystem({ layerFile, targets: ['tokens'] });
  for (const scheme of ['light', 'dark']) {
    const doc = JSON.stringify(built.files.tokens[`generated/comp.states.${scheme}.tokens.json`]).toLowerCase();
    assert.ok(doc.includes(`#${colors[PRESSED][scheme]}`), `${scheme}: #${colors[PRESSED][scheme]}`);
  }
});
