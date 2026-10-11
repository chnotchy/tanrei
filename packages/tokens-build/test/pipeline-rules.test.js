// Through the real pipeline: the two color rules that are decided per scheme, choices of kind, font stacks, added
// spring sets, and what the IR hands the emitters for them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SystemError } from '@tanrei/token-engine';
import { emitFigmaPlan } from '../src/emit/figma.js';
import { FONT_NOTE, fontLines, fontReport } from '../src/fonts.js';
import { checkInvariants, contrast, leadWithStructure } from '../src/invariants.js';
import { buildIR, fontStack } from '../src/ir.js';
import { buildProductSystem } from '../src/product.js';
import { resolveSystem } from '../src/resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const acme = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/acme.system.json'), 'utf8'));
const layer = (extra) => ({ id: 'fluentish', name: 'Fluent-ish', extends: 'tanrei', ...extra });
const hexOf = (token) => token.$value.hex;

test('tone per state: an explicit, non-monotonic ramp (rest 80, hover 70, pressed 40) per scheme — Fluent’s model', async () => {
  const ramp = layer({
    palettes: { brand: { description: 'The product’s brand ramp, used tone by tone.', source: { seed: '#0f6cbd' }, roles: 'intent' } },
    tokens: { 'tanrei.comp.button.filled.container.color': { $value: '{tanrei.sys.color.brand}' } },
    rules: [
      { match: 'tanrei.comp.button.filled.hovered.container.color', derive: { fn: 'tone', palette: 'brand', tone: { light: [35], dark: [80] } } },
      { match: 'tanrei.comp.button.filled.pressed.container.color', derive: { fn: 'tone', palette: 'brand', tone: { light: [20, 15, 10], dark: [90] } } },
    ],
  });
  const resolved = await resolveSystem({ layers: [ramp] });
  const at = (scheme, state) => resolved.tokens(scheme)[`tanrei.comp.button.filled.${state}.container.color`];
  const tone = (scheme, t) => hexOf(resolved.tokens(scheme)[`tanrei.ref.palette.brand.${t}`] ?? { $value: {} });
  assert.notEqual(hexOf(at('light', 'hovered')), hexOf(at('light', 'pressed')), 'each state has its own tone');
  assert.notEqual(hexOf(at('light', 'hovered')), hexOf(at('dark', 'hovered')), 'the tone follows the theme');
  assert.equal(hexOf(at('light', 'pressed')), tone('light', 20));
  assert.equal(hexOf(at('dark', 'pressed')), tone('dark', 90));
  assert.notEqual(hexOf(at('light', 'pressed')), hexOf(at('light-high', 'pressed')), '…and the contrast level');
  assert.equal(at('light', 'pressed').$extensions['dev.tanrei.derive'].fn, 'tone');

  // The IR says it per scheme, with ordinary paints inside; where the schemes agree nothing new appears.
  const ir = buildIR(await resolved.model());
  const paint = ir.componentTokens.button.find((t) => t.id === 'tanrei.comp.button.filled.pressed.container.color').paint;
  assert.equal(paint.kind, 'scheme');
  assert.deepEqual(Object.keys(paint.by), ir.schemes);
  assert.ok(Object.values(paint.by).every((p) => p.kind === 'literal'));
  assert.ok(ir.componentTokens.button.filter((t) => !t.id.includes('.filled.')).every((t) => t.paint?.kind !== 'scheme'));
  // Every code target draws it (test/per-scheme-paints.test.js checks each scheme's value on each platform).
  const built = await buildProductSystem({ layers: [ramp], targets: ['tokens', 'web', 'react-native'] });
  assert.ok(built.files.tokens['generated/comp.states.dark.tokens.json']);
  assert.match(Object.values(built.files['react-native']).join('\n'), /kind: "scheme"/);
  assert.match(built.files.web['fluentish.css'], /--tanrei-comp-button-filled-pressed-container-color: light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\);/);

  await assert.rejects(resolveSystem({ layers: [layer({ rules: [{ match: 'tanrei.comp.button.filled.hovered.container.color', derive: { fn: 'tone', palette: 'nope', tone: 40 } }] })] }), (error) => error instanceof SystemError && /unknown palette "nope"\. Declared: /.test(error.message));
  await assert.rejects(resolveSystem({ layers: [layer({ rules: [{ match: 'tanrei.comp.button.filled.hovered.container.color', derive: { fn: 'tone', palette: 'neutral' } }] })] }), /must have required property 'tone'/);
});

test('contrast-pick on a color role: the role aliases the more readable candidate, per scheme', async () => {
  const picked = layer({
    palettes: { brand: { description: 'A mid-tone brand color; what is readable on it changes with the theme.', source: { seed: '#0f6cbd' }, roles: 'intent' } },
    tokens: {
      'tanrei.sys.color.brand': { derive: { fn: 'tone', palette: 'brand', tone: { light: [35], dark: [80] } } },
      'tanrei.sys.color.on-brand': { derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.brand}', from: ['{tanrei.ref.palette.brand.10}', '{tanrei.ref.palette.brand.99}'] } },
      'tanrei.sys.color.link': { derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.surface}', from: ['{tanrei.sys.color.brand}', '{tanrei.sys.color.on-brand}'] } },
    },
  });
  const resolved = await resolveSystem({ layers: [picked] });
  const model = await resolved.model();
  assert.equal(model.colors.light['on-brand'].alias, 'tanrei.ref.palette.brand.99');
  assert.equal(model.colors.dark['on-brand'].alias, 'tanrei.ref.palette.brand.10');
  assert.ok(resolved.tokens('light')['tanrei.ref.palette.brand.99'], 'a tone a rule names exists in ref.palette');
  for (const scheme of model.schemes) {
    const on = model.colors[scheme]['on-brand'].value, brand = model.colors[scheme].brand.value;
    assert.ok(contrast(on, brand) >= 4.5, `${scheme}: ${contrast(on, brand)}`);
  }
  assert.match(model.colors.light.link.alias, /^tanrei\.sys\.color\.(brand|on-brand)$/, 'one pick may read another');
  assert.deepEqual((await resolved.warnings()).filter((w) => /on-brand on brand/.test(w)), []);
  // A role is delivered per scheme on every platform already, so nothing downstream needs to know.
  assert.ok((await buildProductSystem({ layers: [picked], targets: ['web'] })).files.web['fluentish.css'].includes('--tanrei-sys-color-on-brand: light-dark('));

  const refuse = (tokens, pattern) => assert.rejects(resolveSystem({ layers: [layer({ tokens })] }), pattern);
  await refuse({ 'tanrei.sys.color.link': { derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.link}', from: ['{tanrei.sys.color.primary}', '{tanrei.sys.color.link}'] } } }, /cycle: .*tanrei\.sys\.color\.link/);
  await refuse({ 'tanrei.sys.color.link': { derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.surface}', from: ['{tanrei.sys.color.primary}'] } } }, /must NOT have fewer than 2 items/);
  await refuse({ 'tanrei.sys.color.link': { derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.surface}', from: ['{tanrei.sys.color.primary}', '{tanrei.sys.space.space100}'] } } }, /chooses among color roles and tanrei\.ref\.palette/);
  await refuse({ 'tanrei.sys.color.link': { derive: { fn: 'blend', of: '{tanrei.sys.color.primary}' } } }, /must be equal to one of the allowed values/);
});

test('choices of kind: a name or an index in a layer; out of range is refused with the names; glow keeps the focus contrast check', async () => {
  const named = await resolveSystem({ layers: [layer({ tokens: { 'tanrei.sys.behavior.pressed-feedback': { $value: 'ripple', reason: 'This product ripples like Material.' }, 'tanrei.sys.behavior.focus-style': { $value: 1, reason: 'Focus is a glow here.' } } })] });
  const ir = buildIR(await named.model());
  assert.deepEqual([ir.behavior['pressed-feedback'].value, ir.behavior['focus-style'].value, ir.cornerSmoothing], ['ripple', 'glow', 0]);
  assert.equal(named.tokens()['tanrei.sys.behavior.pressed-feedback'].$value, 1, 'the bundle keeps the index: DTCG has no string type');
  await assert.rejects(resolveSystem({ layers: [layer({ tokens: { 'tanrei.sys.behavior.focus-style': { $value: 2, reason: 'A third way of showing focus.' } } })] }), (error) => error instanceof SystemError && /focus-style: 2 is not one of its choices \(layer "fluentish"\)\. Allowed: "ring" \(0\), "glow" \(1\)/.test(error.message));

  // A glow is held to the same ratio as a ring, and the report says what is being drawn.
  const faint = await resolveSystem({ layers: [layer({ tokens: { 'tanrei.sys.behavior.focus-style': { $value: 'glow', reason: 'Focus is a glow here.' }, 'tanrei.sys.color.focus-ring': { $value: '{tanrei.sys.color.outline-variant}' } } })] });
  const warnings = await faint.warnings();
  assert.ok(warnings.some((w) => /^\[light\] focus-ring on surface: .* < 3:1 \(focus indicator, drawn as a glow \(WCAG 2\.4\.13\)\)$/.test(w)), warnings.join('\n'));
  assert.deepEqual(await (await resolveSystem({ layers: [acme] })).warnings(), [], 'the fixture glows and passes');

  // A bundle the engine did not make is still checked.
  const model = structuredClone(await named.model());
  model.tokens['tanrei.sys.behavior.focus-style'].value = 7;
  assert.ok(checkInvariants(model).some((f) => /focus-style: 7 is not one of its choices — ring \(0\), glow \(1\)/.test(f)));
});

// A component's choice follows the system's by aliasing it.
test('a component choice that aliases a system choice: it takes that choice’s value, a layer can set either, and the names must agree', async () => {
  const SYS = 'tanrei.sys.behavior.separation';
  const COMP = ['tanrei.comp.button-group.connected.separation', 'tanrei.comp.button-with-menu.container.separation', 'tanrei.comp.progress-indicator.track.separation'];
  const about = (failures) => failures.filter((f) => /separation/.test(f));

  const base = await (await resolveSystem({ layers: [layer({})] })).model();
  for (const id of COMP) assert.equal(base.tokens[id].alias, SYS, `${id} aliases the system's choice`);
  // The value of an alias is the value at its end, also when that value is 0 (the parser leaves the string then).
  for (const id of COMP) assert.equal(base.tokens[id].value, 0, `${id} has the system's value, not the alias string`);
  assert.deepEqual(about(checkInvariants(base)), [], 'an aliased choice is not a violation');

  // The system's choice set by a layer: the component tokens still alias it, so they follow.
  // (Each resolved system is let go before the next is built: several alive at once outgrow the default heap.)
  await (async () => {
    const gap = await resolveSystem({ layers: [layer({ tokens: { [SYS]: { $value: 'gap', reason: 'This product parts its joined controls by space.' } } })] });
    const gapModel = await gap.model();
    assert.equal(gap.tokens()[SYS].$value, 1);
    assert.equal(buildIR(gapModel).behavior.separation.value, 'gap');
    for (const id of COMP) assert.equal(gapModel.tokens[id].alias, SYS);
    for (const id of COMP) assert.equal(gapModel.tokens[id].value, 1);
    assert.deepEqual(about(checkInvariants(gapModel)), []);
  })();

  // One component set apart: it stops aliasing and is checked as a choice of its own.
  await (async () => {
    const apart = await resolveSystem({ layers: [layer({ tokens: { [COMP[0]]: { $value: 'gap', reason: 'Its button groups stand apart while everything else is ruled.' } } })] });
    const apartModel = await apart.model();
    assert.equal(apart.tokens()[COMP[0]].$value, 1);
    assert.equal(apartModel.tokens[COMP[0]].alias, undefined);
    assert.equal(apartModel.tokens[COMP[1]].alias, SYS);
    assert.deepEqual(about(checkInvariants(apartModel)), []);
  })();

  // A bundle the engine did not make: the alias is followed, so a bad value at its end is reported for each follower,
  const bad = structuredClone(base);
  bad.tokens[SYS].value = 5;
  const badFailures = about(checkInvariants(bad));
  for (const id of [SYS, ...COMP]) assert.ok(badFailures.some((f) => f.startsWith(`${id}: 5 is not one of its choices — divider (0), gap (1)`)), `${id}\n${badFailures.join('\n')}`);
  // a list of names that differs from its target's is refused (the index would name something else),
  const renamed = structuredClone(base);
  renamed.tokens[COMP[0]].enum = { values: ['gap', 'divider'] };
  assert.deepEqual(about(checkInvariants(renamed)), [`${COMP[0]}: aliases ${SYS}, whose choices differ — gap (0), divider (1) here, divider (0), gap (1) there`]);
  // and so is an alias to something that is not a choice.
  const stray = structuredClone(base);
  Object.assign(stray.tokens[COMP[2]], { alias: 'tanrei.sys.state.hover-opacity', aliasFinal: 'tanrei.sys.state.hover-opacity' });
  assert.ok(about(checkInvariants(stray)).some((f) => f.startsWith(`${COMP[2]}: aliases tanrei.sys.state.hover-opacity, which is not a choice of kind`)));
});

test('elevation: an empty list of layers is a value; a layer that exists takes its color from a role', async () => {
  const model = await (await resolveSystem({ system: 'tanrei' })).model();
  assert.deepEqual(model.tokens['tanrei.sys.elevation.level0'].value, []);
  assert.deepEqual(checkInvariants(model), []);
  assert.deepEqual(buildIR(model).elevation.level0, []);
  const broken = structuredClone(model);
  broken.tokens['tanrei.sys.elevation.level1'].partialAlias = undefined;
  assert.ok(checkInvariants(broken).some((f) => /elevation\.level1: shadow layer 1 must take its color from a sys\.color role/.test(f)));
  const plan = emitFigmaPlan(model);
  assert.deepEqual(plan.effectStyles.find((s) => s.name === 'tanrei/elevation/level0').layers, [], 'an effect style with no effects');
});

test('the Figma plan: choices have no scope and say their name; icon families are strings that follow the typeface', async () => {
  const plan = emitFigmaPlan(await (await resolveSystem({ layers: [acme] })).model());
  const find = (collection, name) => plan.collections.find((c) => c.name === collection).variables.find((v) => v.name === name);
  const focus = find('tanrei/sys', 'behavior/focus-style');
  assert.deepEqual([focus.type, focus.scopes, focus.values.value], ['FLOAT', [], 1]);
  assert.match(focus.description, /Choice: "glow" — index 1 of ring \| glow/);
  assert.deepEqual(find('tanrei/sys', 'icon/family/selected'), { ...find('tanrei/sys', 'icon/family/selected'), type: 'STRING', scopes: ['FONT_FAMILY'], values: { value: 'Material Icons' } });
  const defaults = emitFigmaPlan(await (await resolveSystem({ system: 'tanrei' })).model());
  assert.deepEqual(defaults.collections.find((c) => c.name === 'tanrei/sys').variables.find((v) => v.name === 'icon/family/unselected').values.value, { alias: { collection: 'tanrei/ref', name: 'typeface/icon' } });
  assert.equal(defaults.collections.find((c) => c.name === 'tanrei/ref').variables.find((v) => v.name === 'typeface/mono').values.value, 'Roboto Mono');
});

test('the Figma plan: durations are documented numbers (ms, no scope), a component’s alias follows the step; nothing a variable can hold is left out', async () => {
  const model = await (await resolveSystem({ system: 'tanrei' })).model();
  const plan = emitFigmaPlan(model);
  const find = (collection, name) => plan.collections.find((c) => c.name === collection).variables.find((v) => v.name === name);
  const feedback = find('tanrei/comp', 'button/motion/feedback-duration');
  assert.deepEqual([feedback.type, feedback.scopes, feedback.web, feedback.values.value], ['FLOAT', [], 'var(--tanrei-comp-button-motion-feedback-duration)', { alias: { collection: 'tanrei/sys', name: 'motion/duration/long1' } }]);
  assert.match(feedback.description, /Milliseconds\. Motion is not drawn in Figma: documented, not applied\.$/);
  assert.deepEqual([find('tanrei/sys', 'motion/duration/long1').values.value, find('tanrei/sys', 'motion/duration/long1').scopes], [model.tokens['tanrei.sys.motion.duration.long1'].value.value, []]);
  assert.deepEqual(find('tanrei/comp', 'button/motion/state-duration').values.value, { alias: { collection: 'tanrei/sys', name: 'motion/duration/short3' } });
  // Every alias in the plan points at a variable of the plan.
  const names = new Set(plan.collections.flatMap((c) => c.variables.map((v) => `${c.name}|${v.name}`)));
  for (const c of plan.collections) for (const v of c.variables) for (const value of Object.values(v.values)) if (value?.alias) assert.ok(names.has(`${value.alias.collection}|${value.alias.name}`), `${v.name} → ${value.alias.name}`);
  // What is NOT a variable is what Figma has another home for (text and effect styles), or no home at all (easings,
  // springs, font weights). A new token type lands here until someone decides where it goes.
  const covered = new Set(plan.collections.flatMap((c) => c.variables.map((v) => v.web)));
  const left = Object.values(model.tokens).filter((t) => t.namespace === 'tanrei' && !covered.has(`var(--tanrei-${t.path.join('-')})`));
  const homeless = left.filter((t) => !(t.type === 'typography' || t.type === 'shadow' || t.type === 'cubicBezier' || t.type === 'fontWeight' || (t.path[1] === 'motion' && t.path[2] === 'spring')));
  assert.deepEqual(homeless.map((t) => t.id), []);
  assert.equal(plan.textStyles.length, Object.values(model.tokens).filter((t) => t.type === 'typography' && t.path[0] === 'sys').length);
  assert.equal(plan.effectStyles.length, Object.values(model.tokens).filter((t) => t.type === 'shadow' && t.path[0] === 'sys').length);
});

test('extensions in the IR: every series entry carries its id and this system’s value; an added spring is one entry per set and scheme', async () => {
  const ir = buildIR(await (await resolveSystem({ layers: [acme] })).model());
  assert.deepEqual(ir.extensions.series.space, [{ key: 'space1200', id: 'tanrei.sys.space.space1200', declaredBy: 'acme', value: 96 }]);
  for (const entries of Object.values(ir.extensions.series)) for (const entry of entries) assert.ok(entry.id && entry.declaredBy && entry.value !== undefined, JSON.stringify(entry));
  const springs = ir.extensions.series.spring.sort((a, b) => a.scheme.localeCompare(b.scheme));
  assert.deepEqual(springs.map((s) => [s.scheme, s.key, s.id]), [['expressive', 'bouncy', 'tanrei.sys.motion.spring.expressive.bouncy'], ['standard', 'bouncy', 'tanrei.sys.motion.spring.standard.bouncy']]);
  assert.deepEqual(springs[1].value, { damping: 0.5, duration: 500, easing: [0.27, 1.06, 0.18, 1], stiffness: 700 }, 'cloned from default-spatial, damping changed under "tokens"');
  assert.equal(ir.spring.standard.bouncy, springs[1].value, 'the set is in ir.spring like every core set');
  assert.equal(ir.spring.expressive.bouncy.stiffness, 500);
  // A child layer inherits the set and changes a field like any token.
  const child = buildIR(await (await resolveSystem({ layers: [acme, { id: 'kiosk', name: 'Kiosk', extends: 'acme', tokens: { 'tanrei.sys.motion.spring.standard.bouncy.stiffness': { $value: 900, reason: 'The kiosk animates faster.' } } }] })).model());
  assert.deepEqual([child.spring.standard.bouncy.stiffness, child.extensions.series.spring.find((s) => s.scheme === 'standard').declaredBy], [900, 'acme']);
  // A system without extensions still has none (the default); cupertino adds three text styles and nothing else.
  assert.deepEqual(buildIR(await (await resolveSystem({ system: 'tanrei' })).model()).extensions.series, {});
  assert.deepEqual(Object.keys(buildIR(await (await resolveSystem({ system: 'cupertino' })).model()).extensions.series), ['typescale']);
});

test('font stacks: which families a system names, and a warning for a stack without a fallback', async () => {
  assert.deepEqual(fontStack(['Inter', 'system-ui', 'sans-serif']), { stack: ['Inter', 'system-ui', 'sans-serif'], families: ['Inter'], generic: 'sans-serif', genericClass: 'sans-serif', system: false, fallback: true });
  // `generic` stays as written (the web uses it); `genericClass` is the one of three classes a native platform has a font for.
  assert.deepEqual(['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'math', 'emoji'].map((keyword) => [fontStack(['Some Face', keyword]).generic, fontStack(['Some Face', keyword]).genericClass]), [['sans-serif', 'sans-serif'], ['serif', 'serif'], ['monospace', 'monospace'], ['cursive', 'sans-serif'], ['fantasy', 'sans-serif'], ['math', 'sans-serif'], ['emoji', 'sans-serif']]);
  assert.deepEqual([fontStack(['ui-monospace']).genericClass, fontStack(['ui-serif']).genericClass, fontStack(['Some Face']).genericClass], ['monospace', 'serif', 'sans-serif']);
  assert.equal(fontStack(['Acme Sans']).fallback, false);
  const report = (await buildProductSystem({ layers: [acme], targets: ['tokens'] })).fonts;
  assert.deepEqual(report.text.brand.families, ['Inter', 'Noto Sans JP', 'Noto Sans']);
  assert.deepEqual([report.icons.unselected.families, report.icons.selected.families], [['Material Icons Outlined'], ['Material Icons']]);
  assert.deepEqual(report.families, ['Inter', 'Noto Sans JP', 'Noto Sans', 'Roboto Mono', 'Material Icons Outlined', 'Material Icons']);
  assert.deepEqual(report.warnings, [], 'an icon font needs no generic fallback');
  assert.match(fontLines(report).join('\n'), /text: {2}brand "Inter", "Noto Sans JP", "Noto Sans" · plain .* · mono "Roboto Mono", "Noto Sans JP"\n\s+icons: unselected "Material Icons Outlined" · selected "Material Icons"/);
  assert.match(FONT_NOTE, /referenced by name, never bundled/);

  const bare = await resolveSystem({ layers: [layer({ tokens: { 'tanrei.ref.typeface.brand': { $value: ['Acme Sans'], reason: 'The brand typeface of this product.' } } })] });
  const warned = fontReport(buildIR(await bare.model()));
  assert.equal(warned.warnings.length, 1);
  assert.match(warned.warnings[0], /^typeface "brand": the font stack \["Acme Sans"\] has no system or generic fallback/);
  assert.match(fontLines(fontReport(buildIR(await (await resolveSystem({ system: 'cupertino' })).model()))).join('\n'), /brand "Inter" \(the platform’s own font first\)/);
});

test('a choice that draws nothing is reported: pressed-feedback "dim" while every pressed opacity is 1', async () => {
  const DIM = /sys\.behavior\.pressed-feedback is "dim", but every pressed opacity is 1 \([^)]*tanrei\.comp\.button\.pressed\.opacity[^)]*\): a press would show nothing — set the pressed opacity below 1, or choose another feedback/;
  const dim = { 'tanrei.sys.behavior.pressed-feedback': { $value: 'dim', reason: 'This product dims on press.' } };
  const warningsOf = async (input) => (await resolveSystem(input)).warnings();

  // On the default system (and on m3-like) the pressed opacity is 1: choosing `dim` alone answers a press with nothing.
  for (const base of ['tanrei', 'm3-like']) {
    const warnings = await warningsOf({ layers: [{ id: 'dimmed', name: 'Dimmed', extends: base, tokens: dim }] });
    assert.equal(warnings.filter((w) => DIM.test(w)).length, 1, base);
  }
  // The way out the message names: lower the pressed opacity…
  const lowered = { id: 'dimmed', name: 'Dimmed', extends: 'tanrei', tokens: { ...dim, 'tanrei.comp.button.pressed.opacity': { $value: 0.7, reason: 'A press dims the whole button.' } } };
  assert.deepEqual((await warningsOf({ layers: [lowered] })).filter((w) => /pressed-feedback/.test(w)), []);
  // …which is what the shipped preset that chooses `dim` does. No other shipped system chooses it, and none is reported.
  const cupertino = await resolveSystem({ system: 'cupertino' });
  assert.equal((await cupertino.model()).tokens['tanrei.sys.behavior.pressed-feedback'].enum.values[(await cupertino.model()).tokens['tanrei.sys.behavior.pressed-feedback'].value], 'dim');
  assert.ok((await cupertino.model()).tokens['tanrei.comp.button.pressed.opacity'].value < 1);
  for (const system of ['tanrei', 'm3-like', 'cupertino']) assert.deepEqual((await warningsOf({ system })).filter((w) => /pressed-feedback/.test(w)), [], system);
  // Any other feedback with an opacity of 1 is the ordinary case, not a finding.
  assert.deepEqual((await warningsOf({ layers: [{ id: 'rippled', name: 'Rippled', extends: 'tanrei', tokens: { 'tanrei.sys.behavior.pressed-feedback': { $value: 'ripple', reason: 'This product ripples.' } } }] })).filter((w) => /pressed-feedback/.test(w)), []);

  // A product on cupertino that undoes the opacity inherits ~100 contrast warnings; the lists that are cut
  // short (`tanrei build`, `tanrei validate`, validate_layer) lead with what concerns the whole system.
  const undone = await warningsOf({ layers: [{ id: 'undone', name: 'Undone', extends: 'cupertino', rules: [{ match: 'tanrei.comp.*.pressed.opacity', $value: 1, reason: 'Undoes the preset’s dimming for every component, to prove the check.' }] }] });
  assert.ok(undone.findIndex((w) => DIM.test(w)) > 12, 'checkInvariants keeps its order (a11y-report.json is committed)');
  assert.match(leadWithStructure(undone)[0], DIM);
  assert.deepEqual([...leadWithStructure(undone)].sort(), [...undone].sort(), 'nothing is dropped or added');
  assert.deepEqual(leadWithStructure(undone).filter((w) => w.startsWith('[')), undone.filter((w) => w.startsWith('[')), 'contrast findings keep their order');
});

// A component that names its own focus indicator's color is held against its own bar, form by form.
test('a component focus-ring color is held at 3:1 against the container of the same form, in every scheme', async () => {
  const about = (failures) => failures.filter((f) => /focus-ring\.color on /.test(f));
  const FORMS = ['', 'info.', 'warning.', 'error.', 'success.', 'inverse.', 'inverse-info.', 'inverse-warning.', 'inverse-error.', 'inverse-success.'];

  // One resolved system at a time: each holds every scheme of the whole vocabulary (about a gigabyte at 8,000 tokens),
  // and four of them alive at once are more than the default heap.
  await (async () => {
    const base = await resolveSystem({ layers: [layer({})] });
    const model = await base.model();
    for (const form of FORMS) assert.equal(model.tokens[`tanrei.comp.snackbar.${form}focus-ring.color`]?.type, 'color', `the snackbar's ${form || 'default '}form names its indicator's color`);
    assert.deepEqual(about(checkInvariants(model)), [], 'every form of the default system passes');
    assert.deepEqual(about(await base.warnings()), []);
  })();

  // The system's focus color on the inverse bar fails in five schemes: two roles, so every scheme
  // is read from the roles — the light scheme passes (3.07:1) and the five others are caught.
  const found = about(await (await resolveSystem({ layers: [layer({ tokens: { 'tanrei.comp.snackbar.inverse.focus-ring.color': { $value: '{tanrei.sys.color.focus-ring}', reason: 'A product that draws one focus color everywhere.' } } })] })).warnings());
  assert.deepEqual(found.map((f) => /^\[([a-z-]+)\]/.exec(f)[1]), ['light-medium', 'light-high', 'dark', 'dark-medium', 'dark-high'], found.join('\n'));
  assert.match(found[0], /^\[light-medium\] comp\.snackbar\.inverse\.focus-ring\.color on comp\.snackbar\.inverse\.container\.color: \d\.\d\d:1 < 3:1 \(focus indicator on the component's own bar, WCAG 2\.4\.13\)$/);

  // A bar of its own color (not a role) is compared in the schemes whose component colors the model carries.
  const fixed = about(checkInvariants(await (await resolveSystem({ layers: [layer({ tokens: {
    'tanrei.comp.snackbar.inverse.container.color': { $value: { colorSpace: 'srgb', components: [1, 1, 1], alpha: 1, hex: '#ffffff' }, reason: 'A white bar in every scheme.' },
    'tanrei.comp.snackbar.inverse.focus-ring.color': { $value: { colorSpace: 'srgb', components: [0.9, 0.9, 0.9], alpha: 1, hex: '#e6e6e6' }, reason: 'A pale indicator, to be caught.' },
  } })] })).model()));
  assert.equal(fixed.length, 6, 'a full model carries six schemes of component colors');

  // The presets: m3-like draws the inverse bar and stays clean; nothing here adds a warning to a shipped system.
  for (const id of ['m3-like', 'm3-expressive-like', 'cupertino']) assert.deepEqual(about(await (await resolveSystem({ system: id })).warnings()), [], id);
});

// `comp.snackbar.action.tonal-layer.opacity` stands under a control's name and is one number for
// every form and state. Placed on the control axis it would be a member that `close` and every state lack, and the
// TypeScript emitter refuses an axis value without one of its members.
test('a token under a control that is not a part declared per state is off the control axis', async () => {
  const ir = buildIR(await (await resolveSystem({ layers: [layer({})] })).model());
  const token = ir.componentTokens.snackbar.find((t) => t.id === 'tanrei.comp.snackbar.action.tonal-layer.opacity');
  assert.deepEqual({ axis: token.axis, key: token.key, member: token.member, state: token.state }, { axis: null, key: null, member: 'action-tonal-layer-opacity', state: null });
  const { control } = ir.axes.snackbar;
  assert.ok(!control.members.some((m) => m.name === 'tonal-layer-opacity'), 'it is no member of the axis');
  // What the component does declare per state stays on the axis, at rest and in a state.
  const hovered = ir.componentTokens.snackbar.find((t) => t.id === 'tanrei.comp.snackbar.action.hovered.container.color');
  assert.deepEqual({ axis: hovered.axis, key: hovered.key, member: hovered.member, state: hovered.state }, { axis: 'control', key: 'action', member: 'container-color', state: 'hovered' });
  // Every value of the axis has every member in every state: what the emitters rely on.
  for (const { key } of control.values) for (const state of [null, 'hovered', 'focused', 'pressed']) for (const m of control.members) {
    assert.ok(ir.componentTokens.snackbar.some((t) => t.axis === 'control' && t.key === key && t.member === m.name && t.state === state), `${key} ${state ?? 'resting'} ${m.name}`);
  }
});
