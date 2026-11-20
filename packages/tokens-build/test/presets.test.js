// What the shipped presets promise. Read from the committed bundles, the way any DTCG consumer would.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_SYSTEM, shippedSystems } from '../src/bundle.js';
import { auditInvariants, isCriterionFinding, presetAccessibilityReport } from '../src/invariants.js';
import { REPO_ROOT, buildModel } from '../src/model.js';
import { loadSystem } from '../src/scheme.js';

const presets = shippedSystems(REPO_ROOT).filter((id) => id !== DEFAULT_SYSTEM);
const bundle = (id) => path.join(REPO_ROOT, 'tokens/generated', id);
const gaps = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs/governance/mimicry-gaps.json'), 'utf8')).gaps;

test('the shipped presets are the two imitations', () => {
  assert.deepEqual(presets.sort(), ['cupertino', 'm3-like']);
});

for (const id of presets) {
  test(`${id}: says what it imitates and that it is unofficial`, () => {
    const { name, attribution } = loadSystem(REPO_ROOT, id);
    assert.ok(attribution?.inspiredBy && attribution?.disclaimer, 'attribution.inspiredBy and .disclaimer');
    assert.match(attribution.disclaimer, /not affiliated/i);
    assert.match(name, /-inspired\)$/, 'the display name never claims to be the original');
    assert.ok(fs.readFileSync(path.join(REPO_ROOT, 'NOTICE'), 'utf8').includes(`  ${id} — `), 'listed in NOTICE');
  });

  test(`${id}: the committed accessibility report is current, and says the criteria do not apply`, async () => {
    // Tanrei's accessibility criteria do not apply to an imitation preset in any contrast scheme:
    // its contrast is measured with the fixed ruler and kept as information, never as a warning or a mimicry gap.
    // A structural or functional finding is not a measurement: it fails the build in every system.
    const report = JSON.parse(fs.readFileSync(path.join(bundle(id), 'a11y-report.json'), 'utf8'));
    const { failures: findings, checked } = auditInvariants(await buildModel(bundle(id), id));
    assert.deepEqual(findings.filter((f) => !isCriterionFinding(f)), [], 'structural and functional invariants hold in every system');
    assert.deepEqual(report, presetAccessibilityReport(id, findings, checked));
    assert.ok(!('severity' in report) && !('warnings' in report), 'a preset\'s measurements are not warnings');
  });

  test(`${id}: no accessibility criterion is filed as a mimicry gap`, () => {
    assert.deepEqual(gaps.filter((g) => g.systems.includes(id) && /a11y/.test(g.kind)).map((g) => g.id), []);
  });
}

test('m3-like: tertiary is a declared palette, accent is gone, corners are full', async () => {
  const model = await buildModel(bundle('m3-like'), 'm3-like');
  const { light } = model.colors;
  assert.ok(light.tertiary && light['on-tertiary-container']);
  assert.ok(!('accent' in light) && !('on-accent' in light));
  assert.equal(model.tokens['tanrei.dial.shape.unit'].value.value, 4);
  assert.equal(model.tokens['tanrei.comp.button.container.shape'].aliasFinal ?? model.tokens['tanrei.comp.button.container.shape'].alias, 'tanrei.sys.shape.corner.full');
});

test('cupertino: no hover, a dimmed press, white on the tint', async () => {
  const model = await buildModel(bundle('cupertino'), 'cupertino');
  const token = (id) => model.tokens[`tanrei.comp.button.${id}`];
  assert.equal(token('filled.hovered.container.color').alias, 'tanrei.comp.button.filled.container.color', 'hover is the resting value');
  assert.equal(token('pressed.opacity').value, 0.7);
  assert.equal(model.colors.light['on-primary'].value.hex.toLowerCase(), '#ffffff');
  assert.equal(model.colors.light.surface.value.hex.toLowerCase(), '#ffffff');
  assert.equal(model.colors.dark.surface.value.hex.toLowerCase(), '#000000');
  assert.ok(!('accent' in model.colors.light) && !('tertiary' in model.colors.light));
});
