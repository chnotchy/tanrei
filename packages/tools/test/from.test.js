// What a composed component takes from its members: `from` on a prop, an event and a
// slot, `fills`, and a fixture's `twin`. Each check on specs written here that fail it, the resolver on its own, and
// all of them on the repository as it is — where the first composed field is the one-time-code field.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileSpecSchema, implementationProblems, loadResolvedSpecs, specProblems, validateFrom, validateSpecs } from '../src/checks.js';
import { loadSpecs, read } from '../src/conventions.js';
import { forwards, fromProblems, hasOwnParts, placedMembers, resolveAll, resolveFrom, source, twinItemProblems, twinProblems } from '../src/from.js';
import { LEVELS, LISTINGS } from '../src/levels.js';
import { productWords } from '../src/words.js';

/** A frame: a label, a `requiredText` that reads the product's words, a slot a fixture can fill, and its control as an item kind. */
const frame = (rest = {}) => ({
  name: 'frame',
  level: LEVELS.single,
  props: [
    { name: 'label', type: 'string', default: '', description: 'The frame\'s label.' },
    { name: 'error', type: 'boolean', default: false, description: 'The frame is in error.' },
    { name: 'requiredText', type: 'string', default: '', description: 'What "required" is called.', words: 'requiredText' },
    { name: 'valueText', type: 'string', default: '', description: 'The value in words, at the end of the label row.' },
  ],
  slots: [{ name: 'label-icon', description: 'A glyph before the label.', fixture: 'glyph' }],
  items: [{ name: 'box', summary: 'The control.', component: 'box', props: [{ name: 'value', type: 'string', default: '', description: 'As the box\'s.' }, { name: 'size', type: 'enum', values: ['small', 'large'], default: 'small', description: 'As the box\'s.' }, { name: 'label', type: 'string', default: '', description: 'As the box\'s.' }] }],
  fixtures: [
    { id: 'plain', props: { label: 'Name' }, items: [{ kind: 'box', props: { value: 'Ada' } }] },
    { id: 'plain-rtl', direction: 'rtl', props: { label: 'Name' }, items: [{ kind: 'box', props: { value: 'Ada' } }] },
    { id: 'valued', props: { label: 'Name', valueText: 'Ada' }, items: [{ kind: 'box', props: { value: 'Ada' } }] },
    { id: 'glyph', props: { label: 'Name' }, slots: { 'label-icon': 'person' }, items: [{ kind: 'box', props: { value: 'Ada' } }] },
  ],
  ...rest,
});
/** A bare control: a value, an enum, a label of its own, one event. */
const box = (rest = {}) => ({
  name: 'box',
  level: LEVELS.single,
  props: [
    { name: 'value', type: 'string', default: '', description: 'What it holds.' },
    { name: 'size', type: 'enum', values: ['small', 'large'], default: 'small', description: 'How large it is.' },
    { name: 'label', type: 'string', default: '', description: 'Its own name, where no frame names it.' },
  ],
  events: [{ name: 'change', description: 'The value changed.' }],
  fixtures: [{ id: 'empty', props: {} }],
  ...rest,
});
/** The two as one: every part a member, every entry forwarded. */
const pair = (rest = {}) => ({
  name: 'pair',
  level: LEVELS.completes,
  builtFrom: ['frame', 'box'],
  anatomy: [{ id: 'frame', description: 'The frame.' }, { id: 'box', description: 'The control.' }],
  props: [
    { name: 'label', from: 'frame.label', note: 'Always given.' },
    { name: 'requiredText', from: 'frame.requiredText' },
    { name: 'value', from: 'box.value' },
    { name: 'size', from: 'box.size' },
  ],
  events: [{ name: 'change', from: 'box.change' }],
  slots: [{ name: 'label-icon', from: 'frame.label-icon' }],
  fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'Ada' } }],
  ...rest,
});
const filed = (...specs) => specs.map((spec) => ({ file: `specs/${spec.name}.spec.json`, spec }));
const byName = (...specs) => new Map(specs.map((spec) => [spec.name, spec]));
const from = (...specs) => fromProblems(filed(...specs)).join('\n');
const twins = (...specs) => twinProblems(filed(...specs)).join('\n');

test('`from` names a component and one of its entries', () => {
  assert.deepEqual(source('one-time-code-input.groupSize'), { component: 'one-time-code-input', name: 'groupSize' });
  assert.deepEqual(source('field.label-icon'), { component: 'field', name: 'label-icon' });
});

test('the schema takes a forwarded prop, event and slot in a component\'s own lists, and nothing beside name, from and a note', () => {
  const validate = compileSpecSchema();
  const { spec: field } = loadSpecs().find(({ spec }) => spec.name === 'one-time-code-field');
  assert.equal(validate(field), true, JSON.stringify(validate.errors));
  const withProp = (prop) => ({ ...field, props: [prop, ...field.props.slice(1)] });
  assert.equal(validate(withProp({ name: 'label', from: 'field.label' })), true);
  assert.equal(validate(withProp({ name: 'label', from: 'field.label', note: 'Always given.' })), true);
  // It is written once: a forwarded entry gives no type, default or description of its own.
  assert.equal(validate(withProp({ name: 'label', from: 'field.label', description: 'Its label.' })), false);
  assert.equal(validate(withProp({ name: 'label', from: 'field.label', default: 'Code' })), false);
  // `from` is "<component>.<name>", and a prop's name is a prop's.
  for (const bad of ['field', 'Field.label', 'field.', '.label', 'field.label.text']) assert.equal(validate(withProp({ name: 'label', from: bad })), false, bad);
  assert.equal(validate(withProp({ name: 'Label', from: 'field.label' })), false);
  assert.equal(validate({ ...field, events: [{ name: 'input', from: 'one-time-code-input.input', description: 'Typed.' }] }), false);
  assert.equal(validate({ ...field, slots: [{ name: 'label-icon', from: 'field.label-icon', fixture: 'glyph' }] }), false);
  // An item kind's entries are written in full: the forwarded form is a component's own lists' alone.
  const { spec: host } = loadSpecs().find(({ spec }) => spec.name === 'field');
  const kind = host.items[0];
  assert.equal(validate(host), true);
  assert.equal(validate({ ...host, items: [{ ...kind, props: [{ name: 'value', from: 'slider.value' }] }, ...host.items.slice(1)] }), false);
  assert.equal(validate({ ...host, items: [{ ...kind, events: [{ name: 'change', from: 'slider.change' }] }, ...host.items.slice(1)] }), false);
  // A fixture's twin is "<member>.<fixture id>"; `fills` is a list of "<member>.<prop>", each once, never empty.
  const withTwin = (twin) => ({ ...field, fixtures: [{ ...field.fixtures[0], twin }, ...field.fixtures.slice(1)] });
  assert.equal(validate(withTwin('field.code-supporting')), true);
  for (const bad of ['code-supporting', 'field.', 'field.Code', 3]) assert.equal(validate(withTwin(bad)), false, String(bad));
  assert.equal(validate({ ...field, fills: ['field.valueText'] }), true);
  for (const bad of [[], ['field'], ['field.valueText', 'field.valueText'], ['field.value-text'], 'field.valueText']) assert.equal(validate({ ...field, fills: bad }), false, JSON.stringify(bad));
});

test('resolveFrom writes a forwarded entry out from its member, under the composed spec\'s name, and keeps where it is from', () => {
  const written = pair();
  const resolved = resolveFrom(written, byName(written, frame(), box()));
  assert.deepEqual(resolved.props[0], { name: 'label', type: 'string', default: '', description: 'The frame\'s label.', from: 'frame.label', note: 'Always given.' });
  assert.deepEqual(resolved.props[1], { name: 'requiredText', type: 'string', default: '', description: 'What "required" is called.', words: 'requiredText', from: 'frame.requiredText' });
  assert.deepEqual(resolved.props[3], { name: 'size', type: 'enum', values: ['small', 'large'], default: 'small', description: 'How large it is.', from: 'box.size' });
  assert.deepEqual(resolved.events, [{ name: 'change', description: 'The value changed.', from: 'box.change' }]);
  assert.deepEqual(resolved.slots, [{ name: 'label-icon', description: 'A glyph before the label.', fixture: 'glyph', from: 'frame.label-icon' }]);
  // The spec given is not changed, and a spec that forwards nothing is returned as it is.
  assert.deepEqual(written, pair());
  const plain = box();
  assert.equal(resolveFrom(plain, byName(plain)), plain);
  assert.equal(forwards(plain), false);
  assert.equal(forwards(written), true);
});

test('resolveFrom gives an entry another name, follows a member\'s own forwarded entry to its end, and leaves what it cannot resolve', () => {
  // The control's `label` under another name, as a field whose own `label` is the frame's forwards it.
  const renamed = pair({ props: [...pair().props, { name: 'endLabel', from: 'box.label' }] });
  assert.deepEqual(resolveFrom(renamed, byName(renamed, frame(), box())).props.at(-1), { name: 'endLabel', type: 'string', default: '', description: 'Its own name, where no frame names it.', from: 'box.label' });
  // Depth is not a level: a composition of a composition takes the entry from where it is written, and its own note.
  const outer = { name: 'outer', level: LEVELS.completes, builtFrom: ['pair'], props: [{ name: 'label', from: 'pair.label' }, { name: 'text', from: 'pair.value', note: 'The outer one\'s text.' }] };
  const all = byName(outer, pair(), frame(), box());
  assert.deepEqual(resolveFrom(outer, all).props, [
    { name: 'label', type: 'string', default: '', description: 'The frame\'s label.', from: 'pair.label' },
    { name: 'text', type: 'string', default: '', description: 'What it holds.', from: 'pair.value', note: 'The outer one\'s text.' },
  ]);
  // No member of that name, no entry of that name, and two specs that forward to each other: each is left as written.
  const lost = pair({ props: [{ name: 'label', from: 'nothing.label' }, { name: 'value', from: 'box.nothing' }] });
  assert.deepEqual(resolveFrom(lost, byName(lost, frame(), box())).props, lost.props);
  const a = { name: 'a', props: [{ name: 'x', from: 'b.x' }] };
  const b = { name: 'b', props: [{ name: 'x', from: 'a.x' }] };
  assert.deepEqual(resolveFrom(a, byName(a, b)).props, a.props);
  const self = { name: 'self', props: [{ name: 'x', from: 'self.x' }] };
  assert.deepEqual(resolveFrom(self, byName(self)).props, self.props);
  assert.deepEqual(resolveAll(filed(pair(), frame(), box()))[0].spec.props[2].type, 'string');
});

test('a forwarded entry is a member\'s: from a component that builtFrom does not list, from one of uses, or from itself is a problem', () => {
  assert.equal(from(pair(), frame(), box()), '');
  assert.match(from(pair({ builtFrom: ['frame'] }), frame(), box()), /specs\/pair\.spec\.json: prop "value" is from "box", which builtFrom does not list: only a member's prop is forwarded/);
  assert.match(from(pair({ builtFrom: ['frame'], uses: ['box'] }), frame(), box()), /event "change" is from "box", which builtFrom does not list/);
  assert.match(from(pair({ props: [{ name: 'label', from: 'pair.label' }] }), frame(), box()), /prop "label" is from the component itself/);
});

test('a forwarded entry names an entry its member has, in the list it stands in', () => {
  assert.match(from(pair({ props: [{ name: 'label', from: 'frame.title' }] }), frame(), box()), /prop "label" is from frame\.title, and "frame" has no prop "title"/);
  // An event is not a prop, and a slot is not an event.
  assert.match(from(pair({ props: [{ name: 'change', from: 'box.change' }] }), frame(), box()), /"box" has no prop "change"/);
  assert.match(from(pair({ events: [{ name: 'label-icon', from: 'frame.label-icon' }] }), frame(), box()), /"frame" has no event "label-icon"/);
  assert.match(from(pair({ slots: [{ name: 'icon', from: 'box.icon' }] }), frame(), box()), /"box" has no slot "icon"/);
  // A member's own forwarded entry counts as its entry.
  const outer = { name: 'outer', level: LEVELS.completes, builtFrom: ['pair'], props: [{ name: 'label', from: 'pair.label' }] };
  assert.equal(from(outer, pair(), frame(), box()), '');
});

test('an entry is written once: two from one source, a name twice in a list, or a forwarded entry that says more, is a problem', () => {
  assert.match(from(pair({ props: [{ name: 'label', from: 'frame.label' }, { name: 'title', from: 'frame.label' }] }), frame(), box()), /two props are from frame\.label/);
  assert.match(from(pair({ props: [{ name: 'label', from: 'frame.label' }, { name: 'label', from: 'box.label' }] }), frame(), box()), /prop "label" is written twice/);
  assert.match(from(pair({ props: [{ name: 'label', from: 'frame.label', default: 'Name' }] }), frame(), box()), /prop "label" is from frame\.label and also says default: a forwarded prop is written once, in its member's spec/);
  // The same name in two lists is two things (a prop and an event of one name), and so is one source in two lists.
  assert.equal(from(pair({ props: [...pair().props, { name: 'change', type: 'boolean', default: false, description: 'Its own.' }] }), frame(), box()), '');
});

test('an item kind\'s props, events and slots are written in full: a forwarded one is a problem', () => {
  const host = frame({ items: [{ name: 'box', summary: 'The control.', component: 'box', props: [{ name: 'value', from: 'box.value' }], events: [{ name: 'change', from: 'box.change' }] }] });
  assert.match(from(host, box()), /specs\/frame\.spec\.json: item kind "box" prop "value" is from box\.value: an item kind's props are written in full/);
  assert.match(from(host, box()), /item kind "box" event "change" is from box\.change/);
});

test('`fills` names a prop of a member that no entry forwards', () => {
  assert.equal(from(pair({ fills: ['frame.valueText'] }), frame(), box()), '');
  assert.match(from(pair({ fills: ['slider.value'] }), frame(), box()), /fills names slider\.value, and "slider" is not a member \(builtFrom\)/);
  assert.match(from(pair({ fills: ['frame.nothing'] }), frame(), box()), /fills names frame\.nothing, and "frame" has no prop "nothing"/);
  assert.match(from(pair({ fills: ['frame.label'] }), frame(), box()), /fills names frame\.label, which a prop also forwards: the component sets it itself or the product does, not both/);
});

test('a twin is a fixture of a member, drawn in the same direction', () => {
  assert.equal(twins(pair(), frame(), box()), '');
  const withTwin = (twin, rest = {}) => pair({ fixtures: [{ id: 'plain', twin, props: { label: 'Name', value: 'Ada' }, ...rest }] });
  assert.match(twins(withTwin('frame.nothing'), frame(), box()), /fixture "plain" names the twin frame\.nothing, which is not a fixture of "frame"/);
  assert.match(twins(withTwin('other.plain'), frame(), box(), { name: 'other', fixtures: [{ id: 'plain', props: {} }] }), /names the twin other\.plain, and "other" is not a member/);
  assert.match(twins(withTwin('frame.plain-rtl'), frame(), box()), /fixture "plain" and its twin frame\.plain-rtl are drawn in different directions/);
  assert.equal(twins(withTwin('frame.plain-rtl', { direction: 'rtl' }), frame(), box()), '');
});

test('a fixture and its twin set the same values: on the twin for its own component\'s props, on its item for the other member\'s', () => {
  const withProps = (props, twin = 'frame.plain') => pair({ fixtures: [{ id: 'plain', twin, props }] });
  // A value that differs, on the twin itself and on its item.
  assert.match(twins(withProps({ label: 'Title', value: 'Ada' }), frame(), box()), /fixture "plain" sets label to "Title", and its twin frame\.plain has frame\.label at "Name"/);
  assert.match(twins(withProps({ label: 'Name', value: 'Bob' }), frame(), box()), /sets value to "Bob", and its twin frame\.plain has box\.value at "Ada"/);
  // A prop the twin does not set is at its member's default there: setting it to anything else here is a difference.
  assert.match(twins(withProps({ label: 'Name', value: 'Ada', size: 'large' }), frame(), box()), /sets size to "large", and its twin frame\.plain has box\.size at "small"/);
  assert.equal(twins(withProps({ label: 'Name', value: 'Ada', size: 'small' }), frame(), box()), '');
  // And the twin sets nothing more: a value here that the composed fixture does not set.
  assert.match(twins(withProps({ label: 'Name' }), frame(), box()), /the twin frame\.plain sets box\.value to "Ada", and fixture "plain" does not/);
  // A member's prop the composed component never forwards (the control's own label) is caught the same way.
  const named = frame({ fixtures: [{ id: 'plain', props: { label: 'Name' }, items: [{ kind: 'box', props: { value: 'Ada', label: 'Its own' } }] }] });
  assert.match(twins(pair(), named, box()), /the twin frame\.plain sets box\.label to "Its own", and fixture "plain" does not/);
  // A prop under another name is compared with the member's prop it is from.
  const renamed = pair({ props: [...pair().props, { name: 'endLabel', from: 'box.label' }], fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'Ada', endLabel: 'Its own' } }] });
  assert.equal(twins(renamed, named, box()), '');
  // The slots they fill are the same: a slot the twin fills and the fixture does not, and one filled with another thing.
  assert.match(twins(withProps({ label: 'Name', value: 'Ada' }, 'frame.glyph'), frame(), box()), /the twin frame\.glyph fills frame\.label-icon, and fixture "plain" does not/);
  assert.match(twins(pair({ fixtures: [{ id: 'plain', twin: 'frame.glyph', props: { label: 'Name', value: 'Ada' }, slots: { 'label-icon': 'star' } }] }), frame(), box()), /fixture "plain" fills label-icon with "star", and its twin frame\.glyph has frame\.label-icon at "person"/);
  assert.match(twins(pair({ fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'Ada' }, slots: { 'label-icon': 'person' } }] }), frame(), box()), /fills label-icon with "person", and its twin frame\.plain has frame\.label-icon at undefined/);
  assert.equal(twins(pair({ fixtures: [{ id: 'plain', twin: 'frame.glyph', props: { label: 'Name', value: 'Ada' }, slots: { 'label-icon': 'person' } }] }), frame(), box()), '');
});

test('what the component fills itself, the twin sets by hand: only a prop named in `fills` is allowed beyond the fixture', () => {
  const valued = (rest = {}) => pair({ fixtures: [{ id: 'plain', twin: 'frame.valued', props: { label: 'Name', value: 'Ada' } }], ...rest });
  assert.match(twins(valued(), frame(), box()), /the twin frame\.valued sets frame\.valueText to "Ada", and fixture "plain" does not/);
  assert.equal(twins(valued({ fills: ['frame.valueText'] }), frame(), box()), '');
  // The allowance is for that prop alone.
  assert.match(twins(valued({ fills: ['frame.error'] }), frame(), box()), /sets frame\.valueText to "Ada"/);
});

test('a composed component that forwards props and has no part of its own has a twin for every fixture', () => {
  const bare = (rest = {}) => pair({ fixtures: [{ id: 'plain', props: { label: 'Name', value: 'Ada' } }], ...rest });
  assert.match(twins(bare(), frame(), box()), /specs\/pair\.spec\.json: fixture "plain" has no twin, and the component has no part of its own/);
  // A part of its own — an anatomy part not named for a member — and the twin covers what the members draw: not required.
  const own = bare({ anatomy: [...pair().anatomy, { id: 'counter', description: 'Its own.' }] });
  assert.equal(hasOwnParts(own), true);
  assert.equal(hasOwnParts(pair()), false);
  assert.equal(twins(own, frame(), box()), '');
  // A composed component that forwards nothing (a copy button today) is not asked for one, and neither is a single part.
  assert.equal(twins(bare({ props: [{ name: 'own', type: 'boolean', default: false, description: 'Its own.' }], events: [], slots: [] }), frame(), box()), '');
  assert.equal(twins(frame(), box()), '');
});

test('the repository holds: every forwarded entry, every `fills` and every twin, and `validate` runs the check', () => {
  assert.deepEqual(validateFrom(), []);
  assert.match(validateSpecs.toString(), /validateFrom\(specs\)/);
});

test('the one-time-code field is the first composed field: every entry forwarded, read resolved, each fixture with its twin', () => {
  const specs = loadSpecs();
  const { spec: written } = specs.find(({ spec }) => spec.name === 'one-time-code-field');
  assert.equal(written.level, LEVELS.completes);
  assert.equal(written.listing, LISTINGS.listed);
  assert.deepEqual(written.builtFrom, ['field', 'one-time-code-input']);
  assert.equal(written.tokens, 'comp.field');
  assert.equal(hasOwnParts(written), false);
  for (const list of ['props', 'events', 'slots']) for (const entry of written[list]) assert.ok(entry.from && !('description' in entry), `${list}: ${entry.name}`);
  assert.deepEqual(written.fixtures.map((f) => f.twin), ['field.code-supporting', 'field.code-error', 'field.code-disabled', 'field.code-required-rtl']);
  // Resolved, each entry is its member's own.
  const { spec: resolved } = loadResolvedSpecs().find(({ spec }) => spec.name === 'one-time-code-field');
  const member = (name) => specs.find(({ spec }) => spec.name === name).spec;
  for (const list of ['props', 'events', 'slots']) {
    for (const entry of resolved[list]) {
      const at = source(entry.from);
      const { from: _from, note: _note, name: _name, ...rest } = entry;
      const { name: _theirs, ...theirs } = member(at.component)[list].find((e) => e.name === at.name);
      assert.deepEqual(rest, theirs, `${list}: ${entry.name}`);
    }
  }
  // The cross-references read it resolved: its fixtures are held to its members' props.
  assert.deepEqual(specProblems('specs/one-time-code-field.spec.json', written), []);
  const wrong = { ...written, fixtures: [{ ...written.fixtures[0], props: { ...written.fixtures[0].props, requiredMark: 'sometimes' } }, ...written.fixtures.slice(1)] };
  assert.match(specProblems('specs/one-time-code-field.spec.json', wrong).join('\n'), /fixture "supporting" sets requiredMark="sometimes", not a declared value/);
  // The control it frames is listed only on request from this day on: the first. The file picker is the second
  //: a base member of the file upload, which is listed. The text input is the third:
  // the control of the text field, which is listed.
  // The number input is the fourth: the control of the number field.
  // The color input is the fifth.
  // The combobox is the sixth: the bare control of the combobox field.
  // The embedded text input is the seventh: the typing area of the chat composer, which is listed.
  // The modal layer is the eighth: the layer under the dialog and every other modal surface, which are listed.
  assert.deepEqual(specs.filter(({ spec }) => spec.listing === LISTINGS.onRequest).map(({ spec }) => spec.name).sort(), ['color-input', 'combobox', 'embedded-text-input', 'file-picker', 'modal-layer', 'number-input', 'one-time-code-input', 'text-input']);
});

test('a composed component reads no key of the product\'s words itself: the list of readers is made from the specs as written', () => {
  const readers = productWords().flatMap(({ readers: each }) => each.map((reader) => reader.component));
  assert.ok(readers.includes('field'));
  assert.ok(!readers.includes('one-time-code-field'));
});

test('a forwarded prop\'s values are its member\'s literals: a composed implementation is not asked to name them', () => {
  const { spec } = loadResolvedSpecs().find(({ spec: each }) => each.name === 'one-time-code-field');
  const mapping = spec.platforms.web;
  const sourceText = [mapping.name, ...Object.values(mapping.props), ...Object.values(mapping.events)].join(' ');
  assert.deepEqual(implementationProblems(spec, mapping, sourceText, { where: 'x', impl: 'y' }), []);
  // An enum of its own would still be asked for.
  const own = { ...spec, props: [...spec.props, { name: 'tone', type: 'enum', values: ['calm', 'loud'], default: 'calm', description: 'Its own.' }] };
  assert.match(implementationProblems(own, { ...mapping, props: { ...mapping.props, tone: 'tone' } }, `${sourceText} tone`, { where: 'x', impl: 'y' }).join('\n'), /tone value "calm" does not appear/);
});

test('the name the composed component carries is released from the retired names, and what it does not have stays retired', () => {
  const terms = new Map(JSON.parse(read('docs/governance/retired-terms.json')).terms.map((t) => [t.term, t]));
  const { spec } = loadSpecs().find(({ spec: each }) => each.name === 'one-time-code-field');
  const pascal = spec.name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  for (const living of [spec.name, `Tanrei${pascal}`, `Tanrei${pascal}Element`, pascal, pascal[0].toLowerCase() + pascal.slice(1), spec.name.replaceAll('-', '_'), 'one-time-code field', 'one-time code field']) assert.ok(!terms.has(living), living);
  // It has no detail type, no type for `type` and no tokens of its own: those names, and the token group's, do not come back.
  for (const retired of [`Tanrei${pascal}Detail`, `Tanrei${pascal}Type`, `Tanrei${pascal}Tokens`, `comp.${spec.name}`, `comp-${spec.name}`]) assert.match(terms.get(retired)?.reason ?? '', /the name that returned for the composed component/, retired);
});

// ── An item kind that is a member's, and a twin's item that holds its component's items and slots ──────

/** A control with items of its own (a select and its options) and a slot of its own. */
const chooser = (rest = {}) => ({
  name: 'chooser',
  level: LEVELS.single,
  props: [{ name: 'value', type: 'string', default: '', description: 'What is chosen.' }],
  slots: [{ name: 'leading-icon', description: 'A glyph before the value.', fixture: 'glyph' }, { name: 'footer', description: 'The product\'s own content.' }],
  items: [
    { name: 'option', summary: 'One choice.', props: [{ name: 'value', type: 'string', default: '', description: 'What it stands for.' }, { name: 'tone', type: 'enum', values: ['plain', 'strong'], default: 'plain', description: 'How it stands out.' }] },
    { name: 'option-group', summary: 'A titled group of choices.', container: true, props: [{ name: 'label', type: 'string', default: '', description: 'Its title.' }] },
  ],
  fixtures: [{ id: 'empty', props: {} }],
  ...rest,
});
const OPTIONS = [{ kind: 'option', props: { value: 'a' } }, { kind: 'option-group', props: { label: 'More' }, items: [{ kind: 'option', props: { value: 'b', tone: 'strong' } }] }];
/** A frame whose control is a chooser. */
const chooserFrame = (fixtures) => frame({ items: [{ name: 'chooser', summary: 'The control.', component: 'chooser', props: [{ name: 'value', type: 'string', default: '', description: 'As the chooser\'s.' }] }], fixtures });
/** The two as one: the options are the chooser's, forwarded whole. */
const chooserField = (rest = {}) => ({
  name: 'chooser-field',
  level: LEVELS.completes,
  builtFrom: ['frame', 'chooser'],
  anatomy: [{ id: 'frame', description: 'The frame.' }, { id: 'chooser', description: 'The control.' }],
  props: [{ name: 'label', from: 'frame.label' }, { name: 'value', from: 'chooser.value' }],
  slots: [{ name: 'label-icon', from: 'frame.label-icon' }, { name: 'leading-icon', from: 'chooser.leading-icon' }],
  items: [{ name: 'option', from: 'chooser.option' }, { name: 'option-group', from: 'chooser.option-group', note: 'As in the chooser.' }],
  fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'a' }, slots: { 'leading-icon': 'search' }, items: OPTIONS }],
  ...rest,
});
const twinOf = (item = {}) => chooserFrame([{ id: 'plain', props: { label: 'Name' }, items: [{ kind: 'chooser', props: { value: 'a' }, slots: { 'leading-icon': 'search' }, items: OPTIONS, ...item }] }]);

test('the schema takes an item kind that is a member\'s, and a fixture item that holds items and fills slots', () => {
  const validate = compileSpecSchema();
  const { spec: field } = loadSpecs().find(({ spec }) => spec.name === 'one-time-code-field');
  assert.equal(validate({ ...field, items: [{ name: 'option', from: 'select.option' }] }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...field, items: [{ name: 'option-group', from: 'select.option-group', note: 'As in the select.' }] }), true);
  // Forwarded whole or written whole: a forwarded kind says nothing else, and a written one still needs its summary and props.
  assert.equal(validate({ ...field, items: [{ name: 'option', from: 'select.option', summary: 'One choice.' }] }), false);
  assert.equal(validate({ ...field, items: [{ name: 'option', from: 'select.option', props: [] }] }), false);
  assert.equal(validate({ ...field, items: [{ name: 'option' }] }), false);
  assert.equal(validate({ ...field, items: [{ name: 'Option', from: 'select.option' }] }), false);
  // A fixture item may fill slots and hold items; the schema takes the shape, the tools hold whose they are.
  const { spec: host } = loadSpecs().find(({ spec }) => spec.name === 'field');
  const first = host.fixtures.find((fixture) => fixture.items);
  const withItem = (item) => ({ ...host, fixtures: [{ ...first, items: [{ ...first.items[0], ...item }] }, ...host.fixtures.filter((fixture) => fixture !== first)] });
  assert.equal(validate(withItem({ slots: { 'leading-icon': 'search' }, items: [{ kind: 'option', props: {} }] })), true, JSON.stringify(validate.errors));
  assert.equal(validate(withItem({ slots: { 'leading-icon': [] } })), false);
  assert.equal(validate(withItem({ slots: { 'leading-icon': 3 } })), false);
});

test('resolveFrom writes a forwarded item kind out from its member, whole, and keeps where it is from', () => {
  const written = chooserField();
  const resolved = resolveFrom(written, byName(written, frame(), chooser()));
  assert.deepEqual(resolved.items[0], { ...chooser().items[0], from: 'chooser.option' });
  assert.deepEqual(resolved.items[1], { ...chooser().items[1], from: 'chooser.option-group', note: 'As in the chooser.' });
  assert.deepEqual(written, chooserField());
  // A spec that forwards nothing but a kind is one that forwards.
  assert.equal(forwards({ name: 'x', items: [{ name: 'option', from: 'chooser.option' }] }), true);
  // What cannot be resolved is left as written.
  const lost = chooserField({ items: [{ name: 'option', from: 'chooser.nothing' }, { name: 'row', from: 'nothing.row' }] });
  assert.deepEqual(resolveFrom(lost, byName(lost, frame(), chooser())).items, lost.items);
});

test('a forwarded item kind is a member\'s kind, says nothing else, and no two are from one source', () => {
  assert.equal(from(chooserField(), frame(), chooser()), '');
  const withKinds = (items, rest = {}) => chooserField({ items, fixtures: [], ...rest });
  assert.match(from(withKinds([{ name: 'option', from: 'chooser.nothing' }]), frame(), chooser()), /item kind "option" is from chooser\.nothing, and "chooser" has no item kind "nothing"/);
  assert.match(from(withKinds([{ name: 'option', from: 'menu.option' }]), frame(), chooser()), /item kind "option" is from "menu", which builtFrom does not list: only a member's kind is forwarded/);
  assert.match(from(withKinds([{ name: 'option', from: 'chooser-field.option' }]), frame(), chooser()), /item kind "option" is from the component itself/);
  assert.match(from(withKinds([{ name: 'option', from: 'chooser.option', summary: 'One choice.' }]), frame(), chooser()), /item kind "option" is from chooser\.option and also says summary: a forwarded kind is written once, in its member's spec/);
  assert.match(from(withKinds([{ name: 'option', from: 'chooser.option' }, { name: 'choice', from: 'chooser.option' }]), frame(), chooser()), /two item kinds are from chooser\.option/);
  // A kind is forwarded whole or written whole: inside a written kind nothing is forwarded (rule 5, as before).
  assert.match(from(withKinds([{ name: 'option', summary: 'One choice.', props: [{ name: 'value', from: 'chooser.value' }] }]), frame(), chooser()), /item kind "option" prop "value" is from chooser\.value: an item kind's props are written in full/);
});

test('a twin\'s item that is another component fills that component\'s slots and holds its items: the composed fixture has the same', () => {
  assert.equal(twins(chooserField(), twinOf(), chooser()), '');
  // The slot is the chooser's: it is looked for on the twin's item, not on the twin.
  assert.match(twins(chooserField(), twinOf({ slots: undefined }), chooser()), /fixture "plain" fills leading-icon with "search", and its twin frame\.plain has chooser\.leading-icon at undefined/);
  assert.match(twins(chooserField(), twinOf({ slots: { 'leading-icon': 'star' } }), chooser()), /fills leading-icon with "search", and its twin frame\.plain has chooser\.leading-icon at "star"/);
  const bare = chooserField({ fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'a' }, items: OPTIONS }] });
  assert.match(twins(bare, twinOf(), chooser()), /the twin frame\.plain fills chooser\.leading-icon, and fixture "plain" does not/);
  // The items: the same ones, in the same order, with the same props.
  assert.match(twins(chooserField(), twinOf({ items: OPTIONS.slice(0, 1) }), chooser()), /fixture "plain" and its twin frame\.plain do not hold the same items of "chooser"/);
  assert.match(twins(chooserField(), twinOf({ items: undefined }), chooser()), /do not hold the same items of "chooser"/);
  // Where the member whose kinds are forwarded is the twin's own component, the twin's own items are compared.
  const direct = chooserField({ builtFrom: ['chooser'], props: [{ name: 'value', from: 'chooser.value' }], slots: [], anatomy: [{ id: 'chooser', description: 'The control.' }], fixtures: [{ id: 'plain', twin: 'chooser.listed', props: { value: 'a' }, items: OPTIONS }] });
  assert.equal(twins(direct, chooser({ fixtures: [{ id: 'listed', props: { value: 'a' }, items: OPTIONS }] })), '');
  assert.match(twins(direct, chooser({ fixtures: [{ id: 'listed', props: { value: 'a' }, items: [] }] })), /do not hold the same items of "chooser"/);
});

// ── What a twin's item carries that is no prop of the member ──────────────────────────────────────────

test('on a twin\'s item of a member\'s kind only a prop of that member counts: what the host reads from the item to place a product\'s own content is not held against the fixture', () => {
  // The frame's item kind for the box has a prop the box has not: the entries a product writes by hand inside it.
  const withEntries = (item) => frame({
    items: [{ name: 'box', summary: 'The control.', component: 'box', props: [{ name: 'value', type: 'string', default: '', description: 'As the box\'s.' }, { name: 'entries', type: 'strings', default: [], description: 'What a product writes by hand inside the box.' }] }],
    fixtures: [{ id: 'plain', props: { label: 'Name' }, items: [{ kind: 'box', props: { value: 'Ada', ...item } }] }],
  });
  const composed = pair({ fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'Ada' } }] });
  assert.equal(twins(composed, withEntries({ entries: ['a@example.com'] }), box()), '');
  // A prop that is the member's is still held: the twin sets nothing more of the member than the fixture does.
  assert.match(twins(composed, withEntries({ entries: ['a@example.com'], label: 'Its own' }), box()), /the twin frame\.plain sets box\.label to "Its own", and fixture "plain" does not/);
  // And on the twin itself every prop counts, as before: the narrowing is for an item of a member's kind alone.
  assert.match(twins(composed, frame({ fixtures: [{ id: 'plain', props: { label: 'Name', error: true }, items: [{ kind: 'box', props: { value: 'Ada' } }] }] }), box()), /the twin frame\.plain sets frame\.error to true, and fixture "plain" does not/);
});

// ── A member the product places on both sides (rule 7) ────────────────────────────────────────────────

/** A set's frame: its label, what kind of set it is, and the choices the product puts in it. */
const setFrame = (fixtures, rest = {}) => ({
  name: 'set-frame',
  level: LEVELS.single,
  props: [
    { name: 'label', type: 'string', default: '', description: 'The frame\'s label.' },
    { name: 'kind', type: 'enum', values: ['group', 'one-of'], default: 'group', description: 'What the set is.' },
  ],
  items: [{
    name: 'choice',
    summary: 'A choice the product places.',
    component: 'choice',
    props: [
      { name: 'selected', type: 'boolean', default: false, description: 'As the choice\'s.' },
      { name: 'name', type: 'string', default: '', description: 'As the choice\'s.' },
      { name: 'label', type: 'string', default: '', description: 'As the choice\'s.' },
      { name: 'disabled', type: 'boolean', default: false, description: 'As the choice\'s.' },
    ],
  }],
  fixtures,
  ...rest,
});
const choice = () => ({
  name: 'choice',
  level: LEVELS.single,
  props: [
    { name: 'selected', type: 'boolean', default: false, description: 'It is the one chosen.' },
    { name: 'name', type: 'string', default: '', description: 'Its group.' },
    { name: 'value', type: 'string', default: '', description: 'What it stands for.' },
    { name: 'label', type: 'string', default: '', description: 'Its label.' },
    { name: 'disabled', type: 'boolean', default: false, description: 'It cannot be chosen.' },
  ],
  fixtures: [{ id: 'plain', props: {} }],
});
/** The set as one component: the frame around the product's choices, with one value. */
const chooserSet = (items, rest = {}) => ({
  name: 'chooser-set',
  level: LEVELS.completes,
  builtFrom: ['set-frame', 'choice'],
  fills: ['set-frame.kind', 'choice.selected', 'choice.name'],
  anatomy: [{ id: 'set-frame', description: 'The frame.' }, { id: 'choice', description: 'A choice.' }],
  props: [{ name: 'label', from: 'set-frame.label' }, { name: 'value', type: 'string', default: '', description: 'The chosen value.' }],
  items: [{
    name: 'choice',
    summary: 'A choice.',
    component: 'choice',
    props: [
      { name: 'value', type: 'string', default: '', description: 'What it stands for.' },
      { name: 'label', type: 'string', default: '', description: 'Its label.' },
      { name: 'disabled', type: 'boolean', default: false, description: 'It cannot be chosen.' },
    ],
  }],
  fixtures: [{ id: 'plain', twin: 'set-frame.choices', props: { label: 'Delivery', value: 'b' }, items }],
  ...rest,
});
const mine = (a = {}, b = {}) => [{ kind: 'choice', props: { value: 'a', label: 'Slow', ...a } }, { kind: 'choice', props: { value: 'b', label: 'Fast', ...b } }];
const theirs = (a = {}, b = {}) => [{ id: 'choices', props: { label: 'Delivery', kind: 'one-of' }, items: [{ kind: 'choice', props: { name: 'delivery', label: 'Slow', ...a } }, { kind: 'choice', props: { name: 'delivery', label: 'Fast', selected: true, ...b } }] }];

test('a member that is an item kind on both sides is placed, and rule 3 does not read its first item', () => {
  assert.deepEqual([...placedMembers(chooserSet(mine()), setFrame(theirs()))], ['choice']);
  // Not placed: the twin's component has no item kind of it, or it is no member of the composed spec.
  assert.deepEqual([...placedMembers(chooserSet(mine()), setFrame(theirs(), { items: [] }))], []);
  assert.deepEqual([...placedMembers(chooserSet(mine(), { builtFrom: ['set-frame'] }), setFrame(theirs()))], []);
  assert.deepEqual([...placedMembers(pair(), frame())], []);
  // The pair holds: the labels of the first choice and of the second are each held at their own place, and what the
  // set fills — the kind of the frame, `selected` and `name` on a choice — is written by hand in the twin.
  assert.equal(twins(chooserSet(mine()), setFrame(theirs()), choice()), '');
  assert.equal(twinItemProblems(filed(chooserSet(mine()), setFrame(theirs()), choice())).length, 0);
  // A member the composed component brings itself is still read from the twin's first item (rule 3), as before.
  assert.match(twins(pair({ fixtures: [{ id: 'plain', twin: 'frame.plain', props: { label: 'Name', value: 'Bob' } }] }), frame(), box()), /sets value to "Bob", and its twin frame\.plain has box\.value at "Ada"/);
});

test('a placed member is compared item by item: the same number, in the same order, with the same values', () => {
  // a. One more on one side.
  assert.match(twins(chooserSet([...mine(), { kind: 'choice', props: { value: 'c', label: 'Pick up' } }]), setFrame(theirs()), choice()), /fixture "plain" holds 3 of "choice" and its twin set-frame\.choices holds 2/);
  assert.match(twins(chooserSet(mine().slice(0, 1)), setFrame(theirs()), choice()), /fixture "plain" holds 1 of "choice" and its twin set-frame\.choices holds 2/);
  // b. A value that differs at its place — the second item, which rule 3 never read — and the order.
  assert.match(twins(chooserSet(mine({}, { label: 'Faster' })), setFrame(theirs()), choice()), /fixture "plain" item 2 sets label to "Faster", and its twin set-frame\.choices has "Fast" there/);
  assert.match(twins(chooserSet(mine().reverse()), setFrame(theirs()), choice()), /item 1 sets label to "Fast", and its twin set-frame\.choices has "Slow" there/);
  // A prop the twin's item does not set is at its kind's default there.
  assert.match(twins(chooserSet(mine({ disabled: true })), setFrame(theirs()), choice()), /item 1 sets disabled to true, and its twin set-frame\.choices has false there/);
  assert.equal(twins(chooserSet(mine({ disabled: true })), setFrame(theirs({ disabled: true })), choice()), '');
  assert.equal(twins(chooserSet(mine({ disabled: false })), setFrame(theirs()), choice()), '');
  // A prop the twin's kind has not — the value the set reads from the item — is not compared.
  assert.equal(twins(chooserSet(mine({ value: 'anything' })), setFrame(theirs()), choice()), '');
});

test('the twin\'s item of a placed member sets nothing more than what the composed spec fills', () => {
  // c. A prop the composed item does not set and the spec does not fill.
  assert.match(twins(chooserSet(mine()), setFrame(theirs({}, { disabled: true })), choice()), /the twin set-frame\.choices item 2 sets choice\.disabled to true, and fixture "plain" does not/);
  // At its default it counts as not set.
  assert.equal(twins(chooserSet(mine()), setFrame(theirs({ disabled: false })), choice()), '');
  // The allowance is for the props named in `fills` alone: without them, `selected` and `name` by hand are reported.
  const unfilled = twins(chooserSet(mine(), { fills: ['set-frame.kind'] }), setFrame(theirs()), choice());
  assert.match(unfilled, /item 1 sets choice\.name to "delivery", and fixture "plain" does not/);
  assert.match(unfilled, /item 2 sets choice\.selected to true, and fixture "plain" does not/);
  // A twin that does not exist is rule 1's to report, once.
  assert.equal(twinItemProblems(filed(chooserSet(mine(), { fixtures: [{ id: 'plain', twin: 'set-frame.nothing', props: {}, items: mine() }] }), setFrame(theirs()), choice())).length, 0);
});

test('the radio group\'s twenty fixtures each name a twin among the field group\'s, and every pair holds item by item', () => {
  const specs = loadSpecs();
  const radioGroup = specs.find(({ spec }) => spec.name === 'radio-group').spec;
  const fieldGroup = specs.find(({ spec }) => spec.name === 'field-group').spec;
  assert.deepEqual([...placedMembers(radioGroup, fieldGroup)], ['radio-button']);
  // Nineteen, and error-one-disabled.
  assert.equal(radioGroup.fixtures.length, 20);
  for (const fixture of radioGroup.fixtures) {
    assert.equal(fixture.twin, `field-group.radio-buttons-${fixture.id}`);
    const twin = fieldGroup.fixtures.find((f) => f.id === `radio-buttons-${fixture.id}`);
    assert.equal(twin.props.kind, 'radio-group', fixture.id);
    assert.equal(twin.items.length, fixture.items.length, fixture.id);
    // The one the group's value names is the one written selected by hand.
    assert.deepEqual(twin.items.filter((item) => item.props.selected).map((item) => item.props.value), fixture.props.value ? [fixture.props.value] : [], fixture.id);
  }
  assert.deepEqual(twinItemProblems(specs).filter((line) => line.includes('radio-group')), []);
});
