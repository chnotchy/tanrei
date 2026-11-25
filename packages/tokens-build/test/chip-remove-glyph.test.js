// The glyph of an input chip's remove action is held 3:1 against its round container (WCAG 1.4.11), in its plain look
// and in its destructive one, whose glyph takes the error color while it is hovered, focused or pressed (CHP-20,
// CHP-27, CHP-28). Measured as drawn — the round container of the state over the chip's container at rest, over every
// surface role where that container is clear — at rest, hovered, focused and pressed, in every scheme.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditInvariants, checkInvariants, isCriterionFinding } from '../src/invariants.js';
import { buildModel } from '../src/model.js';

const CHIP = 'tanrei.comp.chip';
const RULE = /the remove glyph of an input chip/;
const about = (failures) => failures.filter((f) => RULE.test(f));
const model = await buildModel();

/** The default system's model with a color token re-pointed at another color role. */
function repointed(id, role) {
  const changed = structuredClone(model);
  changed.tokens[id].alias = `tanrei.sys.color.${role}`;
  delete changed.tokens[id].aliasFinal;
  return changed;
}

test('the default system holds the remove glyph 3:1 apart from its round container, in both looks, every variant, scheme and state', () => {
  assert.equal(model.tokens[`${CHIP}.outlined.destructive-remove.state-layer.color`].alias, 'tanrei.sys.color.error');
  assert.deepEqual(about(checkInvariants(model)), []);
});

test('each scheme counts one pair per variant, look and state: 2 × 2 × 4', () => {
  const withChip = auditInvariants(model).checked;
  const without = structuredClone(model);
  for (const id of Object.keys(without.tokens)) if (id.startsWith(`${CHIP}.`) && /\.(remove|destructive-remove)\.icon\.color$/.test(id)) delete without.tokens[id];
  const withoutChip = auditInvariants(without).checked;
  for (const scheme of model.schemes) assert.equal(withChip[scheme].componentPairs - withoutChip[scheme].componentPairs, 16, scheme);
});

test('a hovered destructive glyph in the hairline color fails, on the surface where it is weakest, as a criterion finding', () => {
  const failures = about(checkInvariants(repointed(`${CHIP}.outlined.hovered.destructive-remove.icon.color`, 'outline-variant')));
  assert.ok(failures.length > 0);
  for (const f of failures) {
    assert.ok(isCriterionFinding(f), `a contrast pair is a criterion finding: ${f}`);
    assert.match(f, /^\[[a-z-]+\] comp\.chip\.outlined\.hovered\.destructive-remove\.icon\.color on comp\.chip\.outlined\.hovered\.destructive-remove\.container\.color: \d\.\d\d:1 < 3:1 \(the remove glyph of an input chip against its round container over sys\.color\.surface[a-z-]* — WCAG 1\.4\.11\)$/);
  }
  // Only the state that was changed: the others keep the error color.
  assert.ok(!failures.some((f) => /\.(focused|pressed)\./.test(f)));
});

test('an elevated chip is judged on its own opaque container, and a disabled chip is exempt', () => {
  const elevated = about(checkInvariants(repointed(`${CHIP}.elevated.pressed.remove.icon.color`, 'surface-container-lowest')));
  assert.ok(elevated.length > 0);
  for (const f of elevated) assert.match(f, /comp\.chip\.elevated\.pressed\.remove\.icon\.color on .* over comp\.chip\.elevated\.container\.color — /);
  const disabled = repointed(`${CHIP}.outlined.disabled.destructive-remove.icon.color`, 'surface');
  assert.deepEqual(about(checkInvariants(disabled)), []);
});
