// A meter's value is read where its indicator ends against its track (WCAG 1.4.11), so the indicator color of each of
// its five statuses is held 3:1 against the track and against every surface role, in every scheme of every system.
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_SYSTEM, shippedSystems } from '../src/bundle.js';
import { checkInvariants, contrast, isCriterionFinding } from '../src/invariants.js';
import { REPO_ROOT, buildModel } from '../src/model.js';

const METER = 'tanrei.comp.meter';
const INDICATORS = ['indicator.color', 'info.indicator.color', 'success.indicator.color', 'warning.indicator.color', 'error.indicator.color'];
const RULE = "a meter's indicator against";
const about = (failures) => failures.filter((f) => f.includes(RULE));
const model = await buildModel();

/** The color role a component color follows, through its aliases. */
const roleOf = (m, id) => {
  for (let at = m.tokens[id], hops = 0; at?.alias && hops < 16; at = m.tokens[at.alias], hops++) {
    if (at.alias.startsWith('tanrei.sys.color.')) return at.alias.slice('tanrei.sys.color.'.length);
  }
  return undefined;
};

test('the five indicator colors and the track follow color roles: the default, the four statuses, surface-variant', () => {
  assert.deepEqual(
    INDICATORS.map((part) => roleOf(model, `${METER}.${part}`)),
    ['primary', 'info', 'success', 'warning', 'error'],
  );
  assert.equal(roleOf(model, `${METER}.track.color`), 'surface-variant');
});

test('in the default system every indicator stands 3:1 or more from the track, in every scheme', () => {
  assert.deepEqual(about(checkInvariants(model)), []);
  for (const scheme of model.schemes) {
    const track = model.colors[scheme]['surface-variant'].value;
    for (const part of INDICATORS) {
      const ratio = contrast(model.colors[scheme][roleOf(model, `${METER}.${part}`)].value, track);
      assert.ok(ratio >= 3, `[${scheme}] ${part} on the track: ${ratio.toFixed(2)}:1`);
    }
  }
});

test('an indicator that cannot be told from the track fails, in each scheme, and names the pair', () => {
  const faint = structuredClone(model);
  for (const scheme of faint.schemes) faint.colors[scheme].warning.value = structuredClone(faint.colors[scheme]['surface-variant'].value);
  const failures = about(checkInvariants(faint));
  const onTrack = failures.filter((f) => f.includes('comp.meter.warning.indicator.color on comp.meter.track.color'));
  assert.deepEqual(onTrack.map((f) => f.match(/^\[([a-z-]+)\]/)[1]).sort(), [...model.schemes].sort(), failures.join('\n'));
  for (const f of onTrack) {
    assert.match(f, /: 1\.00:1 < 3:1 \(a meter's indicator against its track, where its value is read — WCAG 1\.4\.11\)$/);
    assert.ok(isCriterionFinding(f), 'a contrast pair: a criterion, measured as information on a preset');
  }
  assert.ok(failures.every((f) => f.includes('comp.meter.warning.indicator.color')), 'the other statuses still hold');
});

test('a status color set apart from its role is held against the surfaces as well', () => {
  const apart = structuredClone(model);
  const token = apart.tokens[`${METER}.error.indicator.color`];
  delete token.alias;
  delete token.aliasFinal;
  apart.componentColors ??= {};
  for (const scheme of apart.schemes) {
    apart.componentColors[scheme] ??= {};
    apart.componentColors[scheme][token.id] = { value: structuredClone(apart.colors[scheme].surface.value) };
  }
  const failures = about(checkInvariants(apart));
  for (const scheme of apart.schemes) {
    assert.ok(failures.some((f) => f.startsWith(`[${scheme}] comp.meter.error.indicator.color on sys.color.surface: 1.00:1`)), `${scheme}\n${failures.join('\n')}`);
  }
});

// An imitation preset is held to fidelity to its original, not to this criterion: an indicator of its original's
// color that stands under 3:1 is a measurement (its a11y-report.json, held current by presets.test.js), never a
// structural failure.
for (const id of shippedSystems(REPO_ROOT).filter((each) => each !== DEFAULT_SYSTEM)) {
  test(`${id}: a meter indicator under 3:1 from the track is measured as a criterion, not failed as a structure`, async () => {
    const preset = await buildModel(path.join(REPO_ROOT, 'tokens/generated', id), id);
    const findings = about(checkInvariants(preset));
    assert.deepEqual(findings.filter((f) => !isCriterionFinding(f)), []);
  });
}
