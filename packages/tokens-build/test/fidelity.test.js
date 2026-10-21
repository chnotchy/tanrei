// Exactness is measured, not claimed. A preset with a fidelity map must reproduce every reference
// token of the components it covers — or say, with a mimicry-gap id, why one cannot be reproduced yet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fidelityMaps, loadFidelityMap, measureFidelity } from '../src/fidelity.js';
import { REPO_ROOT, buildModel } from '../src/model.js';
import { loadSystem } from '../src/scheme.js';

const gaps = new Set(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'docs/governance/mimicry-gaps.json'), 'utf8')).gaps.map((g) => g.id));

test('m3-like is measured', () => {
  assert.ok(fidelityMaps().includes('m3-like'));
});

for (const system of fidelityMaps()) {
  test(`${system}: every reference token is reproduced exactly, or accounted for by a registered gap`, async () => {
    const input = loadFidelityMap(system);
    const result = measureFidelity(await buildModel(path.join(REPO_ROOT, 'tokens/generated', system), system), input);
    assert.ok(result.total >= 50, 'the reference snapshot is not empty');
    assert.deepEqual(result.unaccounted, [], 'a reference token is neither mapped nor listed as unmapped');
    assert.deepEqual(result.different.map((d) => `${d.ref} → ${d.tanrei}: ${d.problems.map((p) => `${p.scheme} ${p.expected} ≠ ${p.actual}`).join(', ')}`), []);
    for (const entry of result.unmapped) assert.ok(gaps.has(entry.gap), `${entry.ref}: unmapped entries name a mimicry gap; "${entry.gap}" is not in docs/governance/mimicry-gaps.json`);
    assert.equal(result.equal + result.covered + result.unmapped.length, result.total);
    const committed = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tokens/generated', system, 'fidelity.json'), 'utf8'));
    assert.deepEqual(committed, JSON.parse(JSON.stringify(result)), 'tokens/generated/<system>/fidelity.json is stale — run pnpm generate');
  });

  test(`${system}: what the preset ADDS to the vocabulary exists in its reference`, () => {
    // A shipped preset extends only with evidence: every extension is the target of some mapping.
    const { map } = loadFidelityMap(system);
    const targets = new Set((map.map ?? []).map((rule) => rule.tanrei).filter(Boolean));
    // …or a color role the reference publishes under the same name.
    const { reference } = loadFidelityMap(system);
    for (const id of Object.keys(reference.tokens)) if (map.colors && id.startsWith('md.sys.color.')) targets.add(`tanrei.sys.color.${map.colors.rename?.[id.slice(13)] ?? id.slice(13)}`);
    // …or a text style the reference publishes, mapped to a Tanrei role.
    for (const role of Object.values(map.typescale?.roles ?? {})) targets.add(`tanrei.sys.typescale.${role}`);
    const extensions = Object.keys(loadSystem(REPO_ROOT, system).vocabulary ?? {});
    const evidence = (id) => [...targets].some((t) => t === id || new RegExp(`^${t.replaceAll('.', '\\.').replace(/\{[a-z-]+\}/g, '[a-z0-9-]+')}$`).test(id)) || (map.evidence ?? {})[id];
    for (const id of extensions) assert.ok(evidence(id), `${id}: a shipped preset's extension needs evidence — map it in tokens/fidelity/${system}.fidelity.json (or list it under "evidence" with the reference token it reproduces)`);
  });
}

test('the harness notices a wrong value', async () => {
  const input = loadFidelityMap('m3-like');
  const model = await buildModel(path.join(REPO_ROOT, 'tokens/generated/m3-like'), 'm3-like');
  const id = 'tanrei.comp.button.container.height.small';
  const wrong = { ...model, tokens: { ...model.tokens, [id]: { ...model.tokens[id], value: { value: 41, unit: 'px' } } } };
  const result = measureFidelity(wrong, input);
  assert.equal(result.different.length, 8, "one wrong height is wrong for each of material-web's five button components, for androidx's small button, and for its small icon button's height and default width");
  assert.ok(result.fidelity < 1);
});

test('map.typescale.families: a role whose family is not its first name segment takes the named emphasis step', async () => {
  // A synthetic reference (the shipped one has no `-emphasized` role), on a model whose heading step differs from label's.
  const model = await buildModel();
  const heading = 'tanrei.sys.typescale.emphasis.heading';
  const heavier = { ...model, tokens: { ...model.tokens, [heading]: { ...model.tokens[heading], value: 300 } } };
  const caption = model.tokens['tanrei.sys.typescale.caption'].value.fontWeight;
  assert.equal(model.tokens['tanrei.sys.typescale.emphasis.label'].value, 100);
  const reference = { reference: 'synthetic', tokens: { 'md.sys.typescale.note-weight': caption, 'md.sys.typescale.note-emphasized-weight': caption + 300, 'md.sys.typescale.note-emphasized-size': '11px' } };
  const map = { system: 'tanrei', scope: 'test', typescale: { roles: { note: 'caption' }, families: { caption: 'heading' } } };
  const named = measureFidelity(heavier, { map, reference });
  assert.deepEqual([named.total, named.equal, named.covered, named.different], [3, 2, 1, []], 'the emphasized weight is caption + the heading step; every other emphasized field is covered by the base role');
  // Without `families`, caption is a label role (its first segment names no family) and the emphasized weight differs.
  const byName = measureFidelity(heavier, { map: { ...map, typescale: { roles: map.typescale.roles } }, reference });
  assert.deepEqual(byName.different, [{ ref: 'md.sys.typescale.note-emphasized-weight', tanrei: 'tanrei.sys.typescale.caption', problems: [{ scheme: 'light', expected: caption + 300, actual: caption + 100 }] }]);
});
