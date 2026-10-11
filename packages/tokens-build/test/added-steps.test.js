// What the IR hands every emitter for a step a layer ADDED, where the step's shape is decided once:
// a type role's family and a number under `sys.icon`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emitCss } from '../src/emit/css.js';
import { emitDart } from '../src/emit/dart.js';
import { emitKotlin } from '../src/emit/kotlin.js';
import { emitSwift } from '../src/emit/swift.js';
import { emitTs } from '../src/emit/ts.js';
import { TYPE_FAMILIES, buildIR, typeFamily } from '../src/ir.js';
import { resolveSystem } from '../src/resolve.js';

const layer = (id, extra) => ({ id, name: id, extends: 'tanrei', ...extra });
const style = { fontFamily: '{tanrei.ref.typeface.plain}', fontSize: { value: 18, unit: 'px' }, fontWeight: 500, letterSpacing: { value: 0, unit: 'px' }, lineHeight: 1.4 };

test('the family rule lives in pure.js: the first segment when it names a family, label otherwise', () => {
  assert.deepEqual(TYPE_FAMILIES, ['display', 'heading', 'body', 'label']);
  for (const [role, family] of [['display', 'display'], ['heading-3', 'heading'], ['body-callout', 'body'], ['label-small', 'label'], ['caption', 'label'], ['code-small', 'label'], ['eyebrow', 'label'], ['subhead', 'label'], ['quote-large', 'label']]) assert.equal(typeFamily(role), family, role);
});

test('an added type role of an unknown first segment builds on every emitter with the family the IR decided (label)', async () => {
  const subheaded = layer('subheaded', { vocabulary: { 'tanrei.sys.typescale.subhead': { $type: 'typography', rationale: 'One product sets a subhead between a heading and its body.', $value: style } } });
  const resolved = await resolveSystem({ layers: [subheaded] });
  const model = await resolved.model();
  const ir = buildIR(model);
  assert.equal(ir.typescale.subhead.family, 'label', 'decided in the IR, not by an emitter');
  for (const role of Object.keys(ir.typescale)) assert.ok(TYPE_FAMILIES.includes(ir.typescale[role].family), `${role} carries its family`);
  assert.deepEqual(ir.extensions.series.typescale.map((e) => e.key), ['subhead']);

  const text = (files) => Object.values(files).join('\n');
  const swift = text(emitSwift(ir, { external: true }));
  assert.match(swift, /subheadedTypescaleSubhead: TanreiTextStyle = TanreiTextStyle\([^\n]*family: \.label\)/);
  const kotlin = text(emitKotlin(ir, { externalPackage: 'com.example.design' }));
  assert.match(kotlin, /"subhead" to TanreiTextStyle\([^\n]*family = TanreiTypeFamily\.Label\)/);
  const dart = text(emitDart(ir, { external: true }));
  assert.match(dart, /_typescaleSubhead = TanreiTextStyle\([^\n]*family: TanreiTypeFamily\.label\)/);
  const ts = text(emitTs(ir, { external: true }));
  assert.match(ts, /subhead: \{[\s\S]*?family: "label"/, 'React Native receives the family with the style, so its runtime need not guess it from the name');
  assert.match(text(emitTs(ir)), /readonly family\?: TanreiTypeFamily;/, 'the vocabulary file declares it (optional, so a hand-written style stays valid)');
  for (const role of ['display', 'heading1', 'body', 'label', 'caption', 'eyebrow']) assert.match(ts, new RegExp(`\\n {4}${role}: \\{[\\s\\S]*?family: "${typeFamily(role.replace(/(\\d)/, '-$1'))}"`), role);
  const css = emitCss(model, { scope: 'subheaded' });
  assert.ok(css.includes('--tanrei-sys-typescale-subhead-font-weight-emphasized: calc(var(--tanrei-sys-typescale-subhead-font-weight) + var(--tanrei-sys-typescale-emphasis-label));'));
});

test('an emitter stops by name on an IR role without a family, instead of parsing the key', async () => {
  const ir = buildIR(await (await resolveSystem({ system: 'tanrei' })).model());
  const { family, ...bare } = ir.typescale.body;
  const broken = { ...ir, typescale: { ...ir.typescale, quote: bare } };
  assert.throws(() => emitSwift(broken, { external: true }), /swift emitter: typescale role "quote" has no family in the IR/);
  assert.throws(() => emitKotlin(broken, { externalPackage: 'com.example.design' }), /kotlin: the type role "quote" has the family undefined/);
  assert.throws(() => emitDart(broken, { external: true }), /dart: typescale role "quote" has no family in the IR/);
  assert.throws(() => emitTs(broken, { external: true }), /ts emitter: typescale role "quote" has no family in the IR/);
});

test('an added number under sys.icon is looked up where the core icon numbers are, so its fallback value is the value', async () => {
  const drawn = layer('drawn', { vocabulary: { 'tanrei.sys.icon.weight-selected': { $type: 'number', rationale: 'One product draws a selected icon one weight heavier than the rest.', $value: 500 } } });
  const ir = buildIR(await (await resolveSystem({ layers: [drawn] })).model());
  assert.equal(ir.icon['weight-selected'], 500, 'next to sys.icon.weight and sys.icon.fill.*');
  assert.equal(ir.measure.icon['weight-selected'], undefined, 'not a size');
  assert.deepEqual(ir.extensions.series.icon, [{ key: 'weight-selected', id: 'tanrei.sys.icon.weight-selected', declaredBy: 'drawn', value: 500 }]);
});
