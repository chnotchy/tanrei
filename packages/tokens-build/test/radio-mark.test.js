// The center of a radio's mark is held 3:1 against the color it meets (WCAG 1.4.11): the ring where the fill meets it,
// the gap where fill.inset leaves one. Measured as drawn — the fill at its opacity, ring and fill over the state layer
// of each enabled state, over every surface role (the menu's sheet for a menu's radio item) — in every scheme.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkInvariants, isCriterionFinding } from '../src/invariants.js';
import { buildModel } from '../src/model.js';

const RADIO = 'tanrei.comp.radio-button';
const MENU = 'tanrei.comp.menu';
const RULE = /the (fill|dot) of a radio/;
const about = (failures) => failures.filter((f) => RULE.test(f));
const model = await buildModel();

/** The default system's model with one number token set to a value. */
function withNumber(id, value) {
  const changed = structuredClone(model);
  changed.tokens[id].value = value;
  delete changed.tokens[id].alias;
  return changed;
}

test('the default system holds the fill 3:1 apart from the ring it meets, in every scheme, state and surface', () => {
  assert.equal(model.tokens[`${RADIO}.fill.opacity`].value, 0.16);
  assert.equal(model.tokens[`${RADIO}.fill.inset`].value.value, 0);
  assert.equal(model.tokens[`${MENU}.control.fill.opacity`].value, 0.16);
  assert.deepEqual(about(checkInvariants(model)), []);
});

test('the fill at half opacity — the value before — fails, the error form in light worst of all', () => {
  const failures = about(checkInvariants(withNumber(`${RADIO}.fill.opacity`, 0.5)));
  assert.ok(failures.length > 0);
  for (const f of failures) {
    assert.ok(isCriterionFinding(f), `a contrast pair is a criterion finding: ${f}`);
    assert.match(f, /^\[[a-z-]+\] comp\.radio-button\.(error-)?selected\.([a-z]+\.)?fill\.color on comp\.radio-button\.(error-)?selected\.([a-z]+\.)?ring\.color: \d\.\d\d:1 < 3:1 \(the fill of a radio against the ring it meets/);
  }
  // Neither a disabled option (exempt, as WCAG exempts an inactive control) nor an unselected one, whose fill draws nothing.
  assert.ok(!failures.some((f) => /\.disabled\.|\.unselected\./.test(f)));
  const ratio = (f) => Number(f.match(/: (\d\.\d\d):1 </)[1]);
  const worst = failures.reduce((a, b) => (ratio(a) <= ratio(b) ? a : b));
  assert.match(worst, /^\[light\] comp\.radio-button\.error-selected\.(focused|pressed)\.fill\.color .*: 1\.91:1 < 3:1 .*surface-container-highest/);
});

test('a menu radio item is held the same way on the menu\'s sheet, and only while radio items are marked as radios', () => {
  const half = withNumber(`${MENU}.control.fill.opacity`, 0.5);
  const failures = about(checkInvariants(half));
  assert.ok(failures.some((f) => /^\[dark\] comp\.menu\.selected\.(focused\.)?control\.color on comp\.menu\.selected\.(focused\.)?control\.color: /.test(f)), failures.join('\n'));
  assert.ok(failures.every((f) => f.includes('comp.menu.surface.color')));
  // Marked with a check, the menu draws no ring and no fill: nothing to hold.
  const check = structuredClone(half);
  check.tokens[`${MENU}.radio-item.mark`].value = check.tokens[`${MENU}.radio-item.mark`].enum.values.indexOf('check');
  assert.deepEqual(about(checkInvariants(check)).filter((f) => f.includes('comp.menu.')), []);
});

test('where fill.inset leaves a gap, the dot is held against the gap, which shows what the radio stands on', () => {
  const gap = structuredClone(model);
  gap.tokens[`${RADIO}.fill.inset`].value = { value: 3, unit: 'px' };
  // At 16 % the dot is nearly the surface it stands on: as a dot it cannot be seen.
  const failures = about(checkInvariants(gap));
  assert.ok(failures.length > 0);
  for (const f of failures) assert.match(f, /^\[[a-z-]+\] comp\.radio-button\.(error-)?selected\.([a-z]+\.)?fill\.color on sys\.color\.surface[a-z-]*: \d\.\d\d:1 < 3:1 \(the dot of a radio against the gap/);
  // An opaque dot of the ring's color, as Material draws it, stands apart from every surface.
  gap.tokens[`${RADIO}.fill.opacity`].value = 1;
  assert.deepEqual(about(checkInvariants(gap)), []);
});
