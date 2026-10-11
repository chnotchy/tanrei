// What the Dart emitter decides on its own, pinned where the Flutter package can see it:
//
//   node --test packages/flutter/tool/emit_dart.test.mjs        (also part of `pnpm --filter @tanrei/flutter test`)
//
// The Dart side of each decision is tested in `packages/flutter/test/`; these tests read the emitter's text.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { resolveSystem } = await import(path.join(repoRoot, 'packages/tokens-build/src/resolve.js'));
const { buildIR } = await import(path.join(repoRoot, 'packages/tokens-build/src/ir.js'));
const { emitDartSystem, emitDartVocabulary } = await import(path.join(repoRoot, 'packages/tokens-build/src/emit/dart.js'));

// One build per system for the whole file: a model is large, and a test that
// changes an IR changes a structuredClone of it, never the shared one.
const irs = new Map();
const irOf = (input) => {
  const key = JSON.stringify(input);
  if (!irs.has(key)) irs.set(key, (async () => buildIR(await (await resolveSystem(input)).model()))());
  return irs.get(key);
};
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(repoRoot, 'packages/tokens-build/test/fixtures', name), 'utf8'));

test('font generics: serif and monospace are themselves; cursive, fantasy, math and emoji are delivered like sans-serif', async () => {
  const ir = await irOf({ system: 'tanrei' });
  const expected = { 'sans-serif': 'sansSerif', serif: 'serif', monospace: 'monospace', cursive: 'sansSerif', fantasy: 'sansSerif', math: 'sansSerif', emoji: 'sansSerif' };
  for (const [generic, dart] of Object.entries(expected)) {
    const changed = structuredClone(ir);
    changed.typefaces.plain = { ...changed.typefaces.plain, families: ['Probe Family'], generic, system: false };
    const text = emitDartSystem(changed);
    assert.ok(text.includes(`TanreiFontStack(families: <String>['Probe Family'], generic: TanreiFontGeneric.${dart}, system: false)`), `${generic} → ${dart}`);
    assert.ok(!text.includes(`'${generic}'`), `the CSS keyword "${generic}" never reaches Dart`);
  }
  const vocabulary = emitDartVocabulary(ir);
  assert.match(vocabulary, /enum TanreiFontGeneric \{\n {2}sansSerif,\n {2}serif,\n {2}monospace,\n\}/);
});

test('no lookup of an open key asserts or throws: color roles report and fall back', async () => {
  const vocabulary = emitDartVocabulary(await irOf({ system: 'tanrei' }));
  assert.ok(!/assert\(false/.test(vocabulary), 'the vocabulary has no assert(false)');
  assert.ok(!/\bthrow\b/.test(vocabulary), 'the vocabulary never throws');
  assert.match(vocabulary, /debugTanreiReportUnknownValue\('color role', role\.name,/);

  // The typed accessor of an added role: this system's color of the same scheme, through the reporting helper.
  const acme = emitDartSystem(await irOf({ layers: [fixture('acme.system.json')] }), { vocabularyRoles: (await irOf({ system: 'tanrei' })).coreRoles });
  assert.match(acme, /Color get brandGlow => extra\[AcmeColorRoles\.brandGlow\] \?\? _acmeDeclared\('color role', 'brand-glow', acmeSystem\.schemes\.of\(scheme\)\.extra\[AcmeColorRoles\.brandGlow\]!\);/);
  for (const scheme of ['light', 'lightMedium', 'lightHigh', 'dark', 'darkMedium', 'darkHigh']) assert.ok(acme.includes(`scheme: TanreiScheme.${scheme},`), `TanreiColors of ${scheme} says which scheme it is`);
  // The spring accessor documents which scheme its fallback comes from.
  assert.match(acme, /That value is the one of the `\w+` spring scheme — the first scheme of "acme" that declares the spring/);
});

test('a component color that differs per scheme is emitted as TanreiPaint.scheme with all six schemes', async () => {
  const layer = fixture('tone-per-state.system.json');
  const resolved = await resolveSystem({ layers: [layer] });
  const ir = buildIR(await resolved.model());
  const text = emitDartSystem(ir, { vocabularyRoles: (await irOf({ system: 'tanrei' })).coreRoles });
  const dart = (hex) => `TanreiPaint.literal(Color(0xFF${hex.slice(1).toUpperCase()}))`;
  const camel = (s) => s.replace(/-(.)/g, (_, c) => c.toUpperCase());
  for (const state of ['hovered', 'pressed']) {
    const id = `tanrei.comp.button.filled.${state}.container.color`;
    const expected = `TanreiPaint.scheme(${ir.schemes.map((scheme) => `${camel(scheme)}: ${dart(resolved.tokens(scheme)[id].$value.hex)}`).join(', ')})`;
    assert.ok(text.includes(`containerColor: ${expected},`), `${state}: ${expected}`);
  }
  assert.equal(text.split('TanreiPaint.scheme(').length - 1, 2, 'only the two colors that differ');
});

test('typescale by level: 16 role fields, a family on every text style, emphasis as four integer weight steps', async () => {
  const ir = await irOf({ system: 'tanrei' });
  const vocabulary = emitDartVocabulary(ir);
  const roles = ['display', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'bodyLarge', 'body', 'bodySmall', 'label', 'labelSmall', 'caption', 'code', 'codeSmall', 'eyebrow'];
  for (const role of roles) assert.ok(vocabulary.includes(`  final TanreiTextStyle ${role};`), role);
  const typescale = vocabulary.slice(vocabulary.indexOf('class TanreiTypescale {'), vocabulary.indexOf('class TanreiShape {'));
  assert.equal((typescale.match(/ {2}final TanreiTextStyle \w+;/g) ?? []).length, roles.length, 'exactly 16 role fields');
  for (const old of ['headlineLarge', 'titleMedium', 'labelLarge', 'bodyMedium', 'displayMedium', 'codeMedium', 'Emphasized']) assert.ok(!vocabulary.includes(old), `no ${old}`);
  assert.match(vocabulary, /enum TanreiTypeFamily \{\n {2}display,\n {2}heading,\n {2}body,\n {2}label,\n\}/);
  assert.ok(vocabulary.includes('  final TanreiTypeEmphasis emphasis;'), 'typescale.emphasis is a required member');
  assert.ok(vocabulary.includes('  TanreiTextStyle emphasized(TanreiTypeEmphasis emphasis) =>'), 'TanreiTextStyle.emphasized');
  assert.ok(!vocabulary.includes("'emphasis' => emphasis"), 'the keyed lookup does not find emphasis: it is not a role');

  const system = emitDartSystem(ir);
  assert.ok(system.includes('    emphasis: TanreiTypeEmphasis(\n      display: 100,\n      heading: 100,\n      body: 100,\n      label: 100,\n    ),'), 'integer steps');
  // The family of a role: its first name segment; caption, code and eyebrow take label — added roles too.
  const family = (constant) => system.match(new RegExp(`const TanreiTextStyle _typescale${constant} = .*family: TanreiTypeFamily\\.(\\w+)\\)`))?.[1];
  assert.deepEqual({ h3: family('Heading3'), d: family('Display'), bs: family('BodySmall'), c: family('Caption'), code: family('CodeSmall'), e: family('Eyebrow') }, { h3: 'heading', d: 'display', bs: 'body', c: 'label', code: 'label', e: 'label' });
  const cupertino = emitDartSystem(await irOf({ system: 'cupertino' }));
  assert.equal(cupertino.match(/const TanreiTextStyle _typescaleBodyCallout = .*family: TanreiTypeFamily\.(\w+)\)/)?.[1], 'body');
  assert.equal(cupertino.match(/const TanreiTextStyle _typescaleCaptionSmall = .*family: TanreiTypeFamily\.(\w+)\)/)?.[1], 'label');
  const m3 = emitDartSystem(await irOf({ system: 'm3-like' }));
  assert.ok(m3.includes('      label: 200,\n    ),'), 'm3-like adds 200 to labels');

  // A fractional or missing step is refused: weights are integers and every system has all four.
  const fractional = structuredClone(ir);
  fractional.typeEmphasis.body = 50.5;
  assert.throws(() => emitDartVocabulary(fractional), /not a whole number/);
  const lacking = structuredClone(ir);
  delete lacking.typeEmphasis.label;
  assert.throws(() => emitDartSystem(lacking), /lacks the emphasis step of label/);
});

test('corner smoothing is an amount on shape: a required double in [0, 1], no choice of kind for corners', async () => {
  const ir = await irOf({ system: 'tanrei' });
  const vocabulary = emitDartVocabulary(ir);
  assert.ok(vocabulary.includes('  final double cornerSmoothing;'), 'TanreiShape.cornerSmoothing');
  assert.ok(!vocabulary.includes("'cornerSmoothing' =>") && !vocabulary.includes("'corner-smoothing' =>"), 'not a radius step');
  assert.ok(!/TanreiCornerStyle|cornerStyle/.test(vocabulary), 'no corner choice of kind');
  assert.match(vocabulary, /class TanreiBehavior \{\n {2}const TanreiBehavior\(\{\n {4}required this\.pressedFeedback,\n {4}required this\.focusStyle,\n {2}\}\);/);
  assert.ok(emitDartSystem(ir).includes('    cornerSmoothing: 0.0,'));
  assert.ok(emitDartSystem(await irOf({ system: 'cupertino' })).includes('    cornerSmoothing: 0.6,'));
  const out = structuredClone(ir);
  out.cornerSmoothing = 1.5;
  assert.throws(() => emitDartSystem(out), /corner-smoothing in \[0, 1\]/);
});
