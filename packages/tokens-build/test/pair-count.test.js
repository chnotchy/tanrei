// The number of contrast pairs the build reports is the number it checked: a pair that is counted and not judged, or
// judged and not counted, fails here. The count is the one the documentation and talks quote, read from the
// committed report, never recounted by hand.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { auditInvariants, checkInvariants, checkedPairs, intentsOf } from '../src/invariants.js';
import { CONFIG, REPO_ROOT, buildModel } from '../src/model.js';

const model = await buildModel();
const report = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tokens/generated/a11y-report.json'), 'utf8'));
const SURFACES = ['surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest'];
// A finding of a pair under its threshold, whatever it concerns (a criterion, or a link told from text by color).
const RATIO_FINDING = /: \d+\.\d+:1 < \d+(\.\d+)?:1 \(/;
const raised = (scheme) => scheme.endsWith('-medium') || scheme.endsWith('-high');

test('the build checks 826 role pairs in the default system, and its report says so', () => {
  const { failures, checked } = auditInvariants(model);
  assert.deepEqual(failures, []);
  const totals = checkedPairs(checked);
  assert.equal(totals.rolePairs, 826);
  for (const scheme of model.schemes) assert.equal(checked[scheme].rolePairs, raised(scheme) ? 143 : 127, scheme);
  // The committed report is this count (the drift check regenerates it).
  assert.equal(report.system, CONFIG.namespace);
  assert.equal(report.criteria, 'enforced');
  assert.deepEqual(report.checked, totals);
});

test('the role pairs counted are the pairs the vocabulary implies, scheme by scheme', () => {
  const { checked } = auditInvariants(model);
  for (const scheme of model.schemes) {
    const roles = model.colors[scheme];
    const intents = intentsOf(roles);
    const statuses = ['info', 'warning', 'error', 'success'].filter((r) => intents.includes(r));
    const surfaces = SURFACES.filter((s) => roles[s]);
    const declared = Object.values(roles).filter((token) => token.vocabulary?.onRole).length;
    const tonal = ['secondary', ...statuses].filter((r) => `${r}-container` in roles).length * 2;
    // Content on each intent's fill and tonal container; each status mark on its container; three inverse pairs; on
    // each surface: three text roles, each intent's text, the outline and the focus indicator; then the hairline and
    // the input's edge on each surface of a raised-contrast scheme.
    const expected = 2 * intents.length + statuses.length + 3 + surfaces.length * (5 + intents.length) + tonal + declared + (raised(scheme) ? 2 * surfaces.length : 0);
    assert.equal(checked[scheme].rolePairs, expected, scheme);
  }
});

// Every role and every component color the same opaque grey: no pair reaches any threshold, so each pair that is
// measured is reported once. The input's edge (the default system's, in a raised-contrast scheme) is the one measured
// pair held not to a threshold but to the hairline beside it, which it equals here — the only difference allowed.
const grey = { colorSpace: 'srgb', components: [0.5, 0.5, 0.5], alpha: 1 };
const flatten = (maps) => Object.fromEntries(Object.entries(maps).map(([scheme, map]) => [scheme, Object.fromEntries(Object.entries(map).map(([id, token]) => [id, { ...token, value: grey }]))]));
const systems = [[CONFIG.namespace, model], ['cupertino', await buildModel(path.join(REPO_ROOT, 'tokens/generated/cupertino'), 'cupertino')]];

for (const [id, each] of systems) {
  test(`${id}: every pair counted is a pair judged — with one color everywhere, each one is a finding`, () => {
    const greyModel = { ...each, colors: flatten(each.colors), componentColors: flatten(each.componentColors) };
    const { failures, checked } = auditInvariants(greyModel);
    assert.deepEqual(failures, checkInvariants(greyModel));
    for (const scheme of greyModel.schemes) {
      const found = failures.filter((f) => f.startsWith(`[${scheme}] `) && RATIO_FINDING.test(f)).length;
      const edges = id === CONFIG.namespace && raised(scheme) ? SURFACES.filter((s) => greyModel.colors[scheme][s]).length : 0;
      assert.ok(checked[scheme].rolePairs > 0 && checked[scheme].componentPairs > 0, `${scheme}: both kinds of pair are counted`);
      assert.equal(found, checked[scheme].rolePairs + checked[scheme].componentPairs - edges, scheme);
    }
  });
}
