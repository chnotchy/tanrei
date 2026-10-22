// Where each part of the anatomy is drawn on the web (`platforms.web.parts`): how a value is read, what the schema
// takes, what `validate` holds of a spec that writes it — each rule on a spec written here that fails it — and the
// repository as it is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileSpecSchema, validateWebParts } from '../src/checks.js';
import { loadSpecs } from '../src/conventions.js';
import { draftParts, manifestElements, partsProblems, readPart, withParts } from '../src/parts.js';

const manifest = {
  modules: [
    {
      declarations: [
        { tagName: 'tanrei-thing', cssParts: [{ name: 'container' }, { name: 'label' }], slots: [{ name: '' }, { name: 'icon' }] },
        { tagName: 'tanrei-thing-item', cssParts: [{ name: 'container' }] },
        { tagName: 'tanrei-member', cssParts: [{ name: 'input' }] },
        { tagName: 'tanrei-whole', cssParts: [{ name: 'member' }, { name: 'member-input' }] },
      ],
    },
  ],
};
const tags = manifestElements(manifest);
const web = (parts, rest = {}) => ({ status: 'lagging', name: 'tanrei-thing', props: {}, ...(parts ? { parts } : {}), ...rest });
const spec = (name, anatomy, parts, rest = {}) => ({
  file: `specs/${name}.spec.json`,
  spec: { name, anatomy: anatomy.map((id) => ({ id, description: id })), fixtures: [{ id: 'default', props: {} }], platforms: { web: web(parts, rest.web) }, ...rest.spec },
});

test('a value is a target and an optional aspect, or says why the part has no box', () => {
  assert.deepEqual(readPart('container', tags), { part: 'container', aspect: undefined });
  assert.deepEqual(readPart('container@outline', tags), { part: 'container', aspect: 'outline' });
  assert.deepEqual(readPart('container@focus-ring', tags), { part: 'container', aspect: 'focus-ring' });
  assert.deepEqual(readPart('container@backdrop', tags), { part: 'container', aspect: 'backdrop' });
  assert.deepEqual(readPart('host', tags),{ host: true, aspect: undefined });
  assert.deepEqual(readPart('slot', tags), { slot: '', aspect: undefined });
  assert.deepEqual(readPart('slot:icon', tags), { slot: 'icon', aspect: undefined });
  assert.deepEqual(readPart('.tanrei-link-site-icon', tags), { className: 'tanrei-link-site-icon', aspect: undefined });
  // A first word that is a tag of the manifest is a child element; a part name that looks like a tag is still a part.
  assert.deepEqual(readPart('tanrei-thing-item', tags), { child: ['tanrei-thing-item'], aspect: undefined });
  assert.deepEqual(readPart('tanrei-thing tanrei-thing-item container', tags), { child: ['tanrei-thing', 'tanrei-thing-item'], part: 'container', aspect: undefined });
  assert.deepEqual(readPart('tanrei-thing-item container@focus-ring', tags), { child: ['tanrei-thing-item'], part: 'container', aspect: 'focus-ring' });
  assert.deepEqual(readPart({ noBox: 'The caret is drawn by the browser in the text.' }, tags), { noBox: 'The caret is drawn by the browser in the text.' });
  for (const bad of ['container@border', 'container@outline@focus-ring', 'Container', 'a b', 'tanrei-thing-item a b', 'container tanrei-thing-item', 'slot:', '.']) {
    assert.ok(readPart(bad, tags).problem, bad);
  }
});

test('the schema takes parts on the web only, a value as a string or a reason, and anatomyFixture as a string', () => {
  const validate = compileSpecSchema();
  const { spec: button } = loadSpecs().find(({ spec: each }) => each.name === 'button');
  const withWeb = (parts) => ({ ...button, platforms: { ...button.platforms, web: { ...button.platforms.web, parts } } });
  assert.equal(validate(withWeb({ container: 'container', outline: { noBox: 'Why.' } })), true, JSON.stringify(validate.errors));
  assert.equal(validate(withWeb({ container: '' })), false, 'an empty target');
  assert.equal(validate(withWeb({ container: null })), false, 'null says no why');
  assert.equal(validate(withWeb({ container: { noBox: '' } })), false, 'an empty why');
  assert.equal(validate(withWeb({ container: { noBox: 'Why.', also: 1 } })), false);
  assert.equal(validate(withWeb({ Container: 'container' })), false, 'a key is an anatomy id');
  assert.equal(validate({ ...button, platforms: { ...button.platforms, swiftui: { ...button.platforms.swiftui, parts: { container: 'container' } } } }), false, 'a native platform has no CSS parts');
  assert.equal(validate({ ...button, anatomyFixture: 'default' }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...button, anatomyFixture: 1 }), false);
});

test('validate holds every anatomy id mapped, every key an id, and every target there', () => {
  const ok = spec('thing', ['container', 'label', 'icon', 'focus-ring', 'item', 'caret'], {
    container: 'container',
    label: 'label',
    icon: 'slot:icon',
    'focus-ring': 'container@focus-ring',
    item: 'tanrei-thing-item container',
    caret: { noBox: 'The browser draws it.' },
  });
  assert.deepEqual(partsProblems([ok], manifest), []);
  // A spec that writes no parts is not held to them.
  assert.deepEqual(partsProblems([spec('thing', ['container'], undefined)], manifest), []);

  const problems = (parts, anatomy = ['container', 'label']) => partsProblems([spec('thing', anatomy, parts)], manifest);
  assert.match(problems({ container: 'container' }).join('\n'), /is missing label/);
  assert.match(problems({ container: 'container', label: 'label', extra: 'label' }).join('\n'), /maps "extra", which is not an anatomy id/);
  assert.match(problems({ container: 'container', label: 'nope' }).join('\n'), /tanrei-thing exports no part "nope"/);
  assert.match(problems({ container: 'container', label: 'slot:nope' }).join('\n'), /has no slot "nope"/);
  assert.match(problems({ container: 'tanrei-thing-item label', label: 'label' }).join('\n'), /tanrei-thing-item exports no part "label"/);
  assert.match(problems({ container: 'container@border', label: 'label' }).join('\n'), /aspect "@border"/);
  assert.match(problems({ container: '.tanrei-thing', label: 'label' }).join('\n'), /the class \.tanrei-thing is not in the web stylesheet/);
  assert.deepEqual(partsProblems([spec('thing', ['container'], { container: '.tanrei-thing' })], manifest, () => '.tanrei-thing { color: red }'), []);
  assert.match(partsProblems([spec('thing', ['container'], { container: '.tanrei-thing' })], manifest, () => '.tanrei-thing-x {}').join('\n'), /not in the web stylesheet/);
  // An element the manifest does not have has no parts or slots to name.
  const absent = spec('thing', ['container'], { container: 'container' }, { web: { name: 'tanrei-absent' } });
  assert.match(partsProblems([absent], manifest).join('\n'), /tanrei-absent is not an element/);
});

test("a composed component's parts may map its members' parts, as `<member part>.<member's anatomy id>`", () => {
  const member = spec('member', ['input'], undefined, { web: { name: 'tanrei-member' } });
  const whole = (parts, builtFrom = ['member']) => spec('whole', ['member'], parts, { web: { name: 'tanrei-whole' }, spec: { builtFrom } });
  assert.deepEqual(partsProblems([member, whole({ member: 'member', 'member.input': 'member-input' })], manifest), []);
  assert.match(partsProblems([member, whole({ member: 'member', 'member.label': 'member-input' })], manifest).join('\n'), /member has no anatomy id "label"/);
  assert.match(partsProblems([member, whole({ member: 'member', 'member.input': 'member-input' }, [])], manifest).join('\n'), /not an anatomy id — nor a member's part/);
});

test('anatomyFixture names a fixture of the spec', () => {
  assert.deepEqual(partsProblems([spec('thing', ['container'], undefined, { spec: { anatomyFixture: 'default' } })], manifest), []);
  assert.match(partsProblems([spec('thing', ['container'], undefined, { spec: { anatomyFixture: 'other' } })], manifest).join('\n'), /anatomyFixture "other" is not a fixture/);
});

test('a first parts maps the ids the element exports a part of, and is written just before the notes', () => {
  const { spec: thing } = spec('thing', ['container', 'label', 'focus-ring'], undefined, { web: { notes: 'A note.', items: {} } });
  assert.deepEqual(draftParts(thing, tags), { parts: { container: 'container', label: 'label' }, open: ['focus-ring'] });
  const text = `${JSON.stringify(thing, null, 2)}\n`;
  const written = withParts(text, { container: 'container' });
  assert.deepEqual(Object.keys(JSON.parse(written).platforms.web), ['status', 'name', 'props', 'parts', 'notes', 'items']);
  // Only an insertion: every line of the spec is still there, in order.
  const before = text.split('\n');
  const after = written.split('\n');
  const start = after.findIndex((line) => line.includes('"parts"'));
  assert.deepEqual([...after.slice(0, start), ...after.slice(start + 3)], before);
  assert.equal(withParts(JSON.stringify(thing), {}), null, 'a spec not in canonical form is not rewritten');
});

test('every spec of the repository that writes parts maps every anatomy id to something that exists', () => {
  assert.deepEqual(validateWebParts(), []);
});
