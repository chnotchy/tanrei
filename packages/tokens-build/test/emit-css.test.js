// The CSS emitter and a component color that differs per scheme (IR paint kind 'scheme'). Driven through the emitter's own entry point, `emitCss(model, { scope })`, with the
// model of a fixture layer — the way `buildProductSystem` calls it for the `web` target.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { emitCss } from '../src/emit/css.js';
import { buildIR } from '../src/ir.js';
import { resolveSystem } from '../src/resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/tone-per-state.system.json'), 'utf8'));
const PRESSED = 'tanrei.comp.button.filled.pressed.container.color';
const HOVERED = 'tanrei.comp.button.filled.hovered.container.color';
const cssVar = (id) => `--${id.split('.').join('-')}`;

/** `{ selector → { property → value } }` of the one @layer the emitter writes (the @media block's rule keeps its selector). */
function blocks(css) {
  const out = {};
  for (const [, selector, body] of css.matchAll(/^\s*([^{}\n]+?) \{\n((?:\s+[^{}\n]+;\n)+)\s*\}/gm)) {
    out[selector] = Object.fromEntries([...body.matchAll(/^\s*([^:\s]+): (.*);$/gm)].map(([, name, value]) => [name, value]));
  }
  return out;
}

test('a tone rule on a Button state: light-dark() in the base block, re-declared where a contrast level changes it', async () => {
  const resolved = await resolveSystem({ layers: [fixture] });
  const model = await resolved.model();
  const hex = (scheme, id) => resolved.tokens(scheme)[id].$value.hex;

  // The premise: the IR says these two — and only these two — differ per scheme.
  const perScheme = buildIR(model).componentTokens.button.filter((t) => t.paint?.kind === 'scheme').map((t) => t.id);
  assert.deepEqual(perScheme.sort(), [HOVERED, PRESSED]);

  const css = emitCss(model, { scope: fixture.id });
  const S = `[data-tanrei-system="${fixture.id}"]`;
  const rules = blocks(css);
  const base = rules[`${S}, ${S} [data-tanrei-contrast]`];
  const at = (level, id) => `light-dark(${hex(`light${level}`, id)}, ${hex(`dark${level}`, id)})`;

  assert.notEqual(hex('light', PRESSED), hex('dark', PRESSED), 'the fixture differs between light and dark');
  assert.equal(base[cssVar(PRESSED)], at('', PRESSED));
  assert.equal(base[cssVar(HOVERED)], at('', HOVERED));
  assert.equal(css.split(`${cssVar(PRESSED)}:`).length - 1, 4, 'declared once per block that needs it: base, prefers-contrast, medium, high');

  // pressed is [20, 15, 10] in light: both contrast levels move it. hovered is [35] / [80]: no level does.
  const medium = rules[`${S}[data-tanrei-contrast="medium"], ${S} [data-tanrei-contrast="medium"], [data-tanrei-contrast="medium"] ${S}:not([data-tanrei-contrast])`];
  const high = rules[`${S}[data-tanrei-contrast="high"], ${S} [data-tanrei-contrast="high"], [data-tanrei-contrast="high"] ${S}:not([data-tanrei-contrast])`];
  const osHigh = rules[`${S}:not([data-tanrei-contrast])`];
  assert.equal(medium[cssVar(PRESSED)], at('-medium', PRESSED));
  assert.equal(high[cssVar(PRESSED)], at('-high', PRESSED));
  assert.equal(osHigh[cssVar(PRESSED)], at('-high', PRESSED), 'prefers-contrast: more delivers the high level');
  assert.notEqual(medium[cssVar(PRESSED)], base[cssVar(PRESSED)]);
  for (const block of [medium, high, osHigh]) assert.equal(block[cssVar(HOVERED)], undefined, 'a level that changes nothing declares nothing');

  // What reads such a token keeps reading it through var(), so it follows the scheme and the level by itself.
  assert.equal(base['--tanrei-comp-button-filled-container-color'], 'var(--tanrei-sys-color-brand)');
  assert.ok(!/light-dark/.test(base['--tanrei-comp-button-filled-focused-container-color']), 'a mix stays one expression');
});

test('a contrast-pick rule on a Button state: the alias of each scheme', async () => {
  const picked = structuredClone(fixture);
  picked.rules.push({ match: 'tanrei.comp.button.filled.pressed.label.color', derive: { fn: 'contrast-pick', on: `{${PRESSED}}`, from: ['{tanrei.ref.palette.brand.10}', '{tanrei.ref.palette.brand.99}'] } });
  const css = emitCss(await (await resolveSystem({ layers: [picked] })).model(), { scope: picked.id });
  // Pressed is a dark tone in light mode and a light tone in dark mode, so the readable label flips.
  assert.match(css, /--tanrei-comp-button-filled-pressed-label-color: light-dark\(var\(--tanrei-ref-palette-brand-99\), var\(--tanrei-ref-palette-brand-10\)\);/);
});

test('a system without such a rule: no component color is declared per scheme; the default system\'s only ones are the snackbar\'s inverse status colors and the code block\'s seven syntax colors of six hues, and the contrast blocks raise the fill of a checked menu row and a chosen option', async () => {
  // The default system values four parts of each of the snackbar's four inverse status forms by a `tone` rule in the default
  // system's layer (the tones of the other theme): sixteen component colors that differ per scheme, on purpose. Every
  // other color of those forms follows them by alias and stays one expression. The presets pin all of it back.
  const MIRRORED = /^\s*--tanrei-comp-snackbar-inverse-(info|warning|error|success)-(container|supporting-text|icon|outline)-color: light-dark\(/;
  // The default system values the code block's syntax colors by a `tone` rule on palettes the default system declares for
  // syntax alone; with the owner's scheme seven of the nine, of six hues: seven more, which strengthen with
  // the contrast level. The presets inherit them.
  const SYNTAX = /^\s*--tanrei-comp-code-block-syntax-color-(keyword|constant|tag|string|function|property|type): light-dark\(/;
  // m3-like (and the systems that extend it) values the bands of an added and a removed line by a `tone` rule, a step
  // darker in the high-contrast dark scheme so that its syntax colors keep 7:1 on them: two more there.
  const BANDS = /^\s*--tanrei-comp-code-block-line-(added|removed)-container-color: light-dark\(/;
  // The default system withholds the fill of a checked menu row, and of the chosen option of a select or a combobox, at
  // standard contrast and gives it at medium and high (an `alpha` whose amount is a context map): one expression in the base
  // block, raised in the contrast blocks. The presets pin those fills to none.
  const CHECKED = /^\s*--tanrei-comp-(menu-selected(-disabled)?-container-color|(select|combobox)-(stacked|filled|outlined)(-disabled)?-selected-option-container-color): color-mix\(/;
  for (const system of ['tanrei', 'm3-like', 'cupertino']) {
    const css = emitCss(await (await resolveSystem({ system })).model(), system === 'tanrei' ? {} : { scope: system });
    const base = css.slice(0, css.indexOf('@media (prefers-contrast: more)'));
    const perScheme = base.split('\n').filter((line) => /^\s*--tanrei-comp-[^:]+: light-dark\(/.test(line));
    const contrastBlocks = css.slice(css.indexOf('@media (prefers-contrast: more)'));
    const raised = contrastBlocks.split('\n').filter((line) => /^\s*--tanrei-comp-/.test(line));
    if (system === 'tanrei') {
      assert.equal(perScheme.length, 23, 'four parts of four forms, and seven syntax colors');
      assert.equal(perScheme.filter((line) => SYNTAX.test(line)).length, 7);
      assert.deepEqual(perScheme.filter((line) => !MIRRORED.test(line) && !SYNTAX.test(line)), []);
      // The bar keeps its tone at every contrast level; the text, the glyph and the edge strengthen, as the roles they mirror do —
      // and so does every syntax hue.
      assert.ok(raised.length > 0);
      assert.deepEqual(raised.filter((line) => !SYNTAX.test(line) && !CHECKED.test(line) && (!MIRRORED.test(line) || /-container-color:/.test(line))), []);
      assert.equal(new Set(raised.filter((line) => CHECKED.test(line)).map((line) => line.trim())).size, 14, "the checked row's fill and its disabled one, in the menu and in each select and combobox variant");
      assert.ok(raised.some((line) => SYNTAX.test(line)));
    } else {
      const bands = system === 'm3-like' ? 2 : 0;
      assert.equal(perScheme.length, 7 + bands, system);
      assert.equal(perScheme.filter((line) => BANDS.test(line)).length, bands, system);
      assert.deepEqual(perScheme.filter((line) => !SYNTAX.test(line) && !BANDS.test(line)), [], system);
      assert.deepEqual(raised.filter((line) => !SYNTAX.test(line) && !(bands && BANDS.test(line))), [], `${system}: besides the inherited syntax hues (and m3-like's bands) the contrast blocks hold roles only`);
    }
  }
});

test('emphasis is a weight step: every role gets <role>-font-weight-emphasized = its weight + its family step; aliases forward it', async () => {
  for (const system of ['tanrei', 'm3-like', 'cupertino']) {
    const model = await (await resolveSystem({ system })).model();
    const css = emitCss(model, system === 'tanrei' ? {} : { scope: system });
    const roles = Object.values(model.tokens).filter((t) => t.path[0] === 'sys' && t.path[1] === 'typescale' && t.type === 'typography').map((t) => t.path[2]);
    assert.ok(roles.length >= 16, system);
    const step = (role) => (['display', 'heading', 'body'].includes(role.split('-')[0]) ? role.split('-')[0] : 'label');
    for (const role of roles) {
      const name = `--tanrei-sys-typescale-${role}`;
      assert.ok(css.includes(`${name}-font-weight-emphasized: calc(var(${name}-font-weight) + var(--tanrei-sys-typescale-emphasis-${step(role)}));`), `${system}: ${role}`);
    }
    // The families by name: caption, code and eyebrow are text in and next to controls, and take the label step.
    assert.equal(step('caption'), 'label'); assert.equal(step('code-small'), 'label'); assert.equal(step('eyebrow'), 'label'); assert.equal(step('heading-3'), 'heading');
    if (system === 'm3-like') assert.ok(roles.includes('display-large') && css.includes('--tanrei-sys-typescale-display-large-font-weight-emphasized: calc(var(--tanrei-sys-typescale-display-large-font-weight) + var(--tanrei-sys-typescale-emphasis-display));'), 'an added role takes its family step');
    // The four steps are plain numbers, and the button's label alias forwards the emphasized weight (it does not USE it: the label keeps its weight).
    assert.match(css, /--tanrei-sys-typescale-emphasis-label: \d+;/);
    assert.ok(css.includes('--tanrei-comp-button-label-typescale-medium-font-weight-emphasized: var(--tanrei-sys-typescale-label-font-weight-emphasized);'), system);
    assert.ok(!/--tanrei-sys-typescale-emphasized-/.test(css), `${system}: no emphasized twin roles`);
  }
});

test('every shadow gets an -inset-ring companion (SPB-26): the ring layer inset, the blurred layers as they are; aliases forward it', async () => {
  const model = await (await resolveSystem({ system: 'tanrei' })).model();
  const rules = blocks(emitCss(model));
  const base = rules[':root, [data-tanrei-contrast]'];
  for (const level of [0, 1, 2, 3, 4, 5]) {
    const name = `--tanrei-sys-elevation-level${level}`;
    const layers = base[name].split(/,\s*(?![^(]*\))/);
    const inset = base[`${name}-inset-ring`].split(/,\s*(?![^(]*\))/);
    assert.equal(inset.length, layers.length, name);
    layers.forEach((layer, i) => assert.equal(inset[i], /^0 0 0 [1-9]/.test(layer) ? `inset ${layer}` : layer, `${name} layer ${i}`));
  }
  assert.equal(base['--tanrei-sys-elevation-level0-inset-ring'], '0 0 0 0 transparent', 'no elevation stays a valid empty layer');
  // The button with menu: the property follows the token's name.
  assert.equal(base['--tanrei-comp-button-with-menu-elevated-container-elevation-inset-ring'], 'var(--tanrei-sys-elevation-level2-inset-ring)');
});

test('a zero dimension is written 0px, so calc() and min() over it stay valid', async () => {
  // m3-like values the slider handle's outline width as a literal 0; a bare `0` is a number inside calc().
  const model = await (await resolveSystem({ system: 'm3-like' })).model();
  const css = emitCss(model, { scope: 'm3-like' });
  assert.match(css, /--tanrei-comp-slider-handle-outline-width: 0px;/);
  assert.doesNotMatch(css, /--tanrei-comp-slider-handle-outline-width: 0;/);
});
