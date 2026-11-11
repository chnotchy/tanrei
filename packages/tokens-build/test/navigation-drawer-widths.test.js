// The navigation drawer's widths: its column is narrower than the least width a person can give it, in every density,
// and the width it opens at lies between that least width and the greatest. A layer that breaks either is told; a
// product layer is warned, as for every other invariant.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layerChain } from '../src/bundle.js';
import { buildProductSystem } from '../src/product.js';
import { auditInvariants } from '../src/invariants.js';
import { REPO_ROOT } from '../src/model.js';
import { resolveChain } from '../src/resolve.js';
import { loadSystem } from '../src/scheme.js';

const NS = 'tanrei';
const px = (value) => ({ value, unit: 'px' });
const REASON = 'A product sets its own value, for the test.';
const productLayer = (tokens) => ({ id: 'widths', name: 'Widths', extends: 'tanrei', tokens });
const chainOf = (tokens) => [...layerChain('tanrei', (id) => loadSystem(REPO_ROOT, id)), productLayer(tokens)];
const set = (rest, value) => ({ [`${NS}.comp.navigation-drawer.${rest}`]: { $value: px(value), reason: REASON } });
const widthFindings = (failures) => failures.filter((f) => f.startsWith('navigation drawer widths: '));

test('the default system: column 72 / 56 < least 200 ≤ width 240 ≤ greatest 400, no finding', async () => {
  const model = await (await resolveChain(chainOf({}))).model();
  const value = (rest) => model.tokens[`${NS}.comp.navigation-drawer.${rest}`].value.value;
  assert.deepEqual(['collapsed.container.width.regular', 'collapsed.container.width.compact', 'container.min-width', 'container.width', 'container.max-width'].map(value), [72, 56, 200, 240, 400]);
  assert.deepEqual(widthFindings(auditInvariants(model).failures), []);
});

test('a least width at or under the column, or a width outside least and greatest: reported, and a warning in a product layer', async () => {
  const under = widthFindings((await (await resolveChain(chainOf(set('container.min-width', 72)))).audit()).failures);
  assert.deepEqual(under, ['navigation drawer widths: comp.navigation-drawer.collapsed.container.width.regular 72px is not below container.min-width 72px — a drag folds a collapsible drawer halfway between its column and its least width, so the column is the narrower of the two in every density']);
  const outside = widthFindings((await (await resolveChain(chainOf(set('container.max-width', 220)))).audit()).failures);
  assert.deepEqual(outside, ['navigation drawer widths: comp.navigation-drawer.container.min-width 200px ≤ container.width 240px ≤ container.max-width 220px does not hold — the drawer opens at its width, between the least and the greatest a person can give it']);
  const built = await buildProductSystem({ layers: [productLayer(set('container.max-width', 220))], targets: ['tokens'] });
  assert.ok(built.warnings.includes(outside[0]), built.warnings.join('\n'));
});
