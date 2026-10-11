// A link that is not underlined at rest is told from the text beside it by color alone,
// so where a component's underline choice is `hover` or `never` its link color is held 3:1 apart from that text's
// color in every scheme. The default system's link color is its text color, so its choice can only be `always`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkInvariants } from '../src/invariants.js';
import { buildModel } from '../src/model.js';
import { resolveSystem } from '../src/resolve.js';

const SYS = 'tanrei.sys.behavior.link-underline';
const LINK = 'tanrei.comp.link.underline.visibility';
const TRAIL = 'tanrei.comp.breadcrumbs.underline.visibility';
const PAIRS = [
  'comp.link.standard.label.color against sys.color.on-surface',
  'comp.link.inverse.label.color against sys.color.inverse-on-surface',
  'comp.breadcrumbs.item.content.color against comp.breadcrumbs.label.color',
];
const RULE = 'a link not underlined at rest is told from text by color alone';
const about = (failures) => failures.filter((f) => f.includes(RULE));
const model = await buildModel();

/** The default system's model with one choice set to a name. A component token that is set stops aliasing. */
function withChoice(id, name) {
  const changed = structuredClone(model);
  const token = changed.tokens[id];
  token.value = token.enum.values.indexOf(name);
  delete token.alias;
  delete token.aliasFinal;
  return changed;
}

test('the default system underlines its links at rest, and the rule then holds it to nothing', () => {
  assert.deepEqual(model.tokens[SYS].enum.values, ['always', 'hover', 'never']);
  assert.equal(model.tokens[SYS].value, 0);
  for (const id of [LINK, TRAIL]) {
    assert.equal(model.tokens[id].alias, SYS, `${id} follows the system's choice`);
    assert.deepEqual(model.tokens[id].enum.values, model.tokens[SYS].enum.values);
  }
  assert.deepEqual(about(checkInvariants(model)), []);
});

for (const name of ['hover', 'never']) {
  test(`the default system set to ${name} fails: three pairs in each of the six schemes`, () => {
    const failures = about(checkInvariants(withChoice(SYS, name)));
    assert.equal(failures.length, 18, failures.join('\n'));
    for (const pair of PAIRS) {
      const ofPair = failures.filter((f) => f.includes(pair));
      assert.deepEqual(ofPair.map((f) => f.match(/^\[([a-z-]+)\]/)[1]).sort(), [...model.schemes].sort(), pair);
      for (const f of ofPair) assert.match(f, new RegExp(`< 3:1 \\(.*while comp\\.(?:link|breadcrumbs)\\.underline\\.visibility is "${name}"`));
    }
    // The default system's link color is its text color: no hue to tell them apart at all.
    for (const f of failures.filter((f) => f.includes(PAIRS[0]))) assert.match(f, /: 1\.00:1 < 3:1/);
  });
}

test('a hover is held exactly as a never is: the same pairs, the same ratios', () => {
  const ratios = (name) => about(checkInvariants(withChoice(SYS, name))).map((f) => f.replace(/ \(.*$/, ''));
  assert.deepEqual(ratios('hover'), ratios('never'));
});

test('one component set apart is held alone', () => {
  const trail = about(checkInvariants(withChoice(TRAIL, 'never')));
  assert.equal(trail.length, 6, trail.join('\n'));
  assert.ok(trail.every((f) => f.includes(PAIRS[2]) && f.includes('comp.breadcrumbs.underline.visibility is "never"')));
  const link = about(checkInvariants(withChoice(LINK, 'hover')));
  assert.equal(link.length, 12, link.join('\n'));
  assert.ok(link.every((f) => (f.includes(PAIRS[0]) || f.includes(PAIRS[1])) && f.includes('comp.link.underline.visibility is "hover"')));
});

test('a link color that stands 3:1 from the text beside it may go without its line', () => {
  const apart = withChoice(SYS, 'never');
  const grey = { colorSpace: 'srgb', components: [0.46, 0.46, 0.46], alpha: 1, hex: '#757575' };
  for (const scheme of apart.schemes) {
    apart.colors[scheme].link.value = grey;
    apart.colors[scheme]['inverse-link'].value = grey;
  }
  // The Link's two pairs are satisfied; what such a grey costs on the surfaces is the role pairs' to say, not this
  // rule's. The trail is still held: a level that is text is the secondary text color there, which a mid grey is near.
  const left = about(checkInvariants(apart));
  assert.deepEqual(left.filter((f) => f.includes('comp.link.')), []);
  assert.ok(left.length > 0 && left.every((f) => f.includes(PAIRS[2])), left.join('\n'));
});

test('a product layer that drops the underline is warned, never refused', async () => {
  const product = { id: 'unlined', name: 'Unlined', extends: 'tanrei', tokens: { [SYS]: { $value: 'hover', reason: 'This product shows the line under the pointer only.' } } };
  const resolved = await resolveSystem({ layers: [product] });
  assert.equal(resolved.tokens()[SYS].$value, 1);
  assert.equal(resolved.tokens()[LINK].$value, 1, 'the Link follows the system');
  // The layer resolves and builds; what the default system's build refuses is a list of warnings here.
  const warnings = about(await resolved.warnings());
  assert.equal(warnings.length, 18, warnings.join('\n'));
});
