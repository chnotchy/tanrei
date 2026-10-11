// Item kinds, proven on small in-memory specs: each rule passes a spec that keeps it and fails one that breaks it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileSpecSchema, implementationProblems, itemProblems, specProblems } from '../src/checks.js';
import { CONFIG, read } from '../src/conventions.js';
import { LEVELS, LISTINGS } from '../src/levels.js';

const validate = compileSpecSchema();
const vocabulary = new Set();
const FILE = 'specs/sample-tabs.spec.json';

/** A tabs-like spec: one component prop, a `tab` kind and a `group` container kind, mapped on every platform. */
function sample() {
  const mapping = () => ({
    status: 'planned',
    name: 'SampleTabs',
    props: { selected: 'selected' },
    events: { change: 'onChange' },
    items: {
      tab: { name: 'SampleTab', props: { value: 'value', label: 'label', emphasis: 'emphasis' }, events: { reselect: 'onReselect' } },
      group: { name: 'SampleTabGroup', props: { title: 'title' } },
    },
  });
  return {
    name: 'sample-tabs',
    title: 'Sample tabs',
    summary: 'A synthetic spec for the item checks.',
    category: 'navigation',
    level: LEVELS.single,
    listing: LISTINGS.listed,
    anatomy: [{ id: 'container', description: 'The row of tabs.' }],
    props: [{ name: 'selected', type: 'string', default: null, description: 'The value of the selected tab.' }],
    events: [{ name: 'change', description: 'The selection changed.' }],
    items: [
      {
        name: 'tab',
        summary: 'One tab.',
        props: [
          { name: 'value', type: 'string', default: null, description: 'What selects it.' },
          { name: 'label', type: 'string', default: '', description: 'Its text.' },
          { name: 'emphasis', type: 'enum', values: ['plain', 'strong-accent'], default: 'plain', description: 'How it stands out.' },
        ],
        events: [{ name: 'reselect', description: 'The selected tab was activated again.' }],
      },
      { name: 'group', summary: 'A titled group of tabs.', container: true, props: [{ name: 'title', type: 'string', default: '', description: 'Its title.' }] },
    ],
    states: ['enabled'],
    behavior: [{ id: 'STB-1', text: 'WHEN a tab is activated THE sample tabs SHALL select it.' }],
    accessibility: { role: 'tablist', keyboard: [], labeling: 'Each tab by its label.', minimumTarget: true },
    tokens: 'comp.button',
    fixtures: [
      {
        id: 'three-tabs',
        props: { selected: 'inbox' },
        items: [
          { kind: 'tab', props: { value: 'inbox', label: 'Inbox' }, content: 'inbox' },
          { kind: 'tab', props: { value: 'sent', label: 'Sent', emphasis: 'strong-accent' } },
          { kind: 'group', props: { title: 'More' }, items: [{ kind: 'tab', props: { value: 'trash', label: 'Trash' } }] },
        ],
      },
    ],
    platforms: Object.fromEntries(CONFIG.platforms.map((p) => [p, mapping()])),
  };
}
const problems = (spec) => specProblems(FILE, spec, { validate, vocabulary });
const has = (list, pattern) => assert.ok(list.some((p) => pattern.test(p)), `expected a problem matching ${pattern}, got:\n${list.join('\n') || '(none)'}`);

test('a spec with item kinds, fixture items and item mappings is valid', () => {
  assert.deepEqual(problems(sample()), []);
});

test('a spec without items is unchanged: no item kinds, no fixture items, no item mappings', () => {
  const spec = sample();
  delete spec.items;
  delete spec.fixtures[0].items;
  for (const p of CONFIG.platforms) delete spec.platforms[p].items;
  assert.deepEqual(problems(spec), []);
});

test('schema: an item kind needs a kebab-case name, a summary and props, and takes nothing else', () => {
  const spec = sample();
  spec.items[0].name = 'Tab';
  delete spec.items[1].summary;
  spec.items[1].variant = 'x';
  const found = problems(spec);
  has(found, /\/items\/0\/name must match pattern/);
  has(found, /\/items\/1 must have required property 'summary'/);
  has(found, /\/items\/1 must NOT have additional properties/);
});

test('schema: an item prop has the shape of a component prop but never an axis', () => {
  const spec = sample();
  spec.items[0].props[2].axis = 'tanrei.comp.button.size';
  has(problems(spec), /\/items\/0\/props\/2\/axis boolean schema is false/);
  const enumWithoutValues = sample();
  delete enumWithoutValues.items[0].props[2].values;
  has(problems(enumWithoutValues), /\/items\/0\/props\/2 must have required property 'values'/);
});

test('schema: a fixture item needs a kind and props; a platform item mapping needs a name and props', () => {
  const spec = sample();
  delete spec.fixtures[0].items[0].props;
  spec.fixtures[0].items[1].label = 'Sent';
  delete spec.platforms.web.items.tab.name;
  const found = problems(spec);
  has(found, /\/fixtures\/0\/items\/0 must have required property 'props'/);
  has(found, /\/fixtures\/0\/items\/1 must NOT have additional properties/);
  has(found, /\/platforms\/web\/items\/tab must have required property 'name'/);
});

test('item kind names are unique', () => {
  const spec = sample();
  spec.items.push({ ...spec.items[1] });
  has(problems(spec), /item kind "group" is declared twice/);
});

test('an item enum prop defaults to one of its values', () => {
  const spec = sample();
  spec.items[0].props[2].default = 'loud';
  has(problems(spec), /item "tab" prop "emphasis" default "loud" is not one of its values/);
});

test('a fixture item names a declared kind', () => {
  const spec = sample();
  spec.fixtures[0].items[0].kind = 'destination';
  has(problems(spec), /fixture "three-tabs" item 1 has kind "destination", which the spec's items do not declare/);
  const none = sample();
  delete none.items;
  for (const p of CONFIG.platforms) delete none.platforms[p].items;
  has(problems(none), /fixture "three-tabs" item 1 has kind "tab", which the spec's items do not declare/);
});

test('a fixture item sets only its kind’s props, and only declared enum values', () => {
  const spec = sample();
  spec.fixtures[0].items[0].props.badge = 3;
  spec.fixtures[0].items[1].props.emphasis = 'loud';
  spec.fixtures[0].items[2].items[0].props.selected = true;
  const found = problems(spec);
  has(found, /fixture "three-tabs" item 1 \(tab\) uses unknown prop "badge"/);
  has(found, /fixture "three-tabs" item 2 \(tab\) sets emphasis="loud", not a declared value/);
  has(found, /fixture "three-tabs" item 3 → item 1 \(tab\) uses unknown prop "selected"/);  // nested items are checked too
});

test('only a container kind holds nested items', () => {
  const spec = sample();
  spec.fixtures[0].items[0].items = [{ kind: 'tab', props: {} }];
  has(problems(spec), /fixture "three-tabs" item 1 \(tab\) holds items, but "tab" is not a container kind/);
  const nested = sample();
  nested.fixtures[0].items[2].items[0].kind = 'section';
  has(problems(nested), /item 3 → item 1 has kind "section"/);
});

test('every platform maps every item kind, every prop and event of it, and nothing else', () => {
  const missingKind = sample();
  delete missingKind.platforms.compose.items.group;
  has(problems(missingKind), /platforms\.compose\.items is missing the item kind "group"/);

  const noItems = sample();
  delete noItems.platforms.flutter.items;
  const found = problems(noItems);
  has(found, /platforms\.flutter\.items is missing the item kind "tab"/);
  has(found, /platforms\.flutter\.items is missing the item kind "group"/);

  const props = sample();
  delete props.platforms.swiftui.items.tab.props.emphasis;
  props.platforms.swiftui.items.tab.props.badge = 'badge';
  has(problems(props), /platforms\.swiftui\.items\.tab\.props is missing emphasis/);
  has(problems(props), /platforms\.swiftui\.items\.tab\.props maps unknown prop\(s\) badge/);

  const events = sample();
  delete events.platforms['react-native'].items.tab.events;
  events.platforms['react-native'].items.group.events = { collapse: 'onCollapse' };
  has(problems(events), /platforms\.react-native\.items\.tab\.events is missing "reselect"/);
  has(problems(events), /platforms\.react-native\.items\.group\.events maps unknown event\(s\) collapse/);

  const unknownKind = sample();
  unknownKind.platforms.web.items.section = { name: 'x', props: {} };
  has(problems(unknownKind), /platforms\.web\.items maps unknown item kind "section"/);
});

test('behaviour prose is still checked for token ids with items present', () => {
  const spec = sample();
  spec.behavior[0].text = 'WHEN a tab is activated THE sample tabs SHALL move its indicator over sys.motion.duration.nowhere.';
  has(problems(spec), /STB-1 names "sys\.motion\.duration\.nowhere"/);
});

test('parity: the implementation mentions each mapped item name, item prop and item event', () => {
  const spec = sample();
  const mapping = spec.platforms.web;
  const at = { where: 'x [web]', impl: 'x.ts' };
  const complete = 'SampleTabs selected onChange SampleTab value label emphasis onReselect SampleTabGroup title plain strong_accent';
  assert.deepEqual(implementationProblems(spec, mapping, complete, at), []);

  const found = implementationProblems(spec, mapping, complete.replace('SampleTabGroup', '').replace('onReselect', '').replace('emphasis', ''), at);
  assert.deepEqual(found, [
    'x [web]: "emphasis" from the spec does not appear in x.ts',
    'x [web]: "onReselect" from the spec does not appear in x.ts',
    'x [web]: "SampleTabGroup" from the spec does not appear in x.ts',
  ]);
});

test('parity: every enum value of an item prop appears in the implementation', () => {
  const spec = sample();
  const at = { where: 'x [web]', impl: 'x.ts' };
  const source = 'SampleTabs selected onChange SampleTab value label emphasis onReselect SampleTabGroup title plain';
  assert.deepEqual(implementationProblems(spec, spec.platforms.web, source, at), ['x [web]: tab.emphasis value "strong-accent" does not appear in x.ts']);
});

test('parity: a spec without items checks what it checked before', () => {
  const spec = sample();
  delete spec.items;
  const mapping = { ...spec.platforms.web };
  delete mapping.items;
  const at = { where: 'x [web]', impl: 'x.ts' };
  assert.deepEqual(implementationProblems(spec, mapping, 'SampleTabs selected onChange', at), []);
  assert.deepEqual(implementationProblems(spec, mapping, 'SampleTabs onChange', at), ['x [web]: "selected" from the spec does not appear in x.ts']);
});

test('a kind that is another component maps to that component\'s platform name, and parity does not look for it in the host', () => {
  const withAction = () => {
    const spec = sample();
    spec.items.push({ name: 'action', summary: 'An icon-only button in the trailing slot.', component: 'button', props: [{ name: 'label', type: 'string', default: '', description: 'Its name.' }] });
    const button = JSON.parse(read('specs/button.spec.json'));
    for (const p of CONFIG.platforms) spec.platforms[p].items.action = { name: button.platforms[p].name, props: { label: button.platforms[p].props.label } };
    return spec;
  };
  assert.deepEqual(problems(withAction()), []);
  const wrongName = withAction();
  wrongName.platforms.web.items.action.name = 'my-action';
  has(problems(wrongName), /platforms\.web\.items\.action\.name is "my-action", but "button" is "tanrei-button" on web/);
  const unknown = withAction();
  unknown.items.at(-1).component = 'not-a-component';
  has(problems(unknown), /item kind "action" is component "not-a-component", which is not in specs\/inventory\.json/);
  // The host's source names its own kinds; the button is checked in its own spec.
  const spec = withAction();
  const source = 'SampleTabs selected onChange SampleTab value label emphasis onReselect SampleTabGroup title plain strong-accent';
  assert.deepEqual(implementationProblems(spec, spec.platforms.web, source, { where: 'web', impl: 'x.ts' }), []);
});

test('a strings prop takes a list of strings in a fixture; no other prop takes a list', () => {
  const spec = sample();
  spec.props.push({ name: 'values', type: 'strings', default: [], description: 'The values selected in a multiple selection.' });
  for (const p of CONFIG.platforms) spec.platforms[p].props.values = 'values';
  spec.fixtures[0].props.values = ['inbox', 'sent'];
  assert.deepEqual(problems(spec), []);
  spec.fixtures[0].props.values = 'inbox';
  has(problems(spec), /sets values: a strings prop takes a list of strings/);
  spec.fixtures[0].props.values = ['inbox'];
  spec.fixtures[0].props.selected = ['inbox'];
  has(problems(spec), /sets selected: a string prop does not take a list/);
});

// A fixture fills a named slot only where the slot says what its strings become.
test('a fixture fills slots that declare what a string becomes, and only those', () => {
  const spec = sample();
  spec.slots = [
    { name: 'icon', description: 'A glyph.', fixture: 'glyph' },
    { name: 'actions', description: 'Buttons.', fixture: 'button' },
    { name: 'extra', description: 'Anything; fixtures cannot fill it.' },
  ];
  spec.fixtures[0].slots = { icon: 'delete', actions: ['Cancel', 'Delete'] };
  assert.deepEqual(problems(spec), []);

  spec.fixtures[0].slots = { missing: 'x' };
  has(problems(spec), /fills unknown slot "missing"/);
  spec.fixtures[0].slots = { extra: 'x' };
  has(problems(spec), /slot "extra", which declares no `fixture`/);
  spec.fixtures[0].slots = { icon: ['a', 'b'] };
  has(problems(spec), /a glyph slot takes one string/);
  spec.fixtures[0].slots = { actions: 3 };
  assert.ok(problems(spec).length > 0, 'a slot value that is neither a string nor a list of strings is a schema error');
});

// ── An item that is another component holds that component's items and fills its slots ────────────────

test('an item of a kind that is another component holds that component\'s items and fills its slots, checked against that component', () => {
  // The repository's own specs are the other components: a Field's item that is a List holds the List's items.
  const others = () => new Map([
    ['chooser', {
      name: 'chooser',
      props: [],
      slots: [{ name: 'leading-icon', description: 'A glyph.', fixture: 'glyph' }, { name: 'footer', description: 'The product\'s own.' }],
      items: [
        { name: 'option', summary: 'One choice.', props: [{ name: 'value', type: 'string', default: '', description: 'What it stands for.' }, { name: 'tone', type: 'enum', values: ['plain', 'strong'], default: 'plain', description: 'How it stands out.' }] },
        { name: 'option-group', summary: 'A group.', container: true, props: [] },
      ],
    }],
    ['plain-control', { name: 'plain-control', props: [] }],
  ]);
  const host = () => {
    const spec = sample();
    spec.items.push({ name: 'chooser', summary: 'A chooser among the tabs.', component: 'chooser', props: [] }, { name: 'plain', summary: 'A control with no items.', component: 'plain-control', props: [] });
    for (const platform of CONFIG.platforms) Object.assign(spec.platforms[platform].items, { chooser: { name: 'Chooser', props: {} }, plain: { name: 'Plain', props: {} } });
    return spec;
  };
  const of = (item) => {
    const spec = host();
    spec.fixtures[0].items.push(item);
    return itemProblems(FILE, spec, others).filter((problem) => /item 4/.test(problem));
  };
  assert.deepEqual(of({ kind: 'chooser', props: {}, slots: { 'leading-icon': 'search' }, items: [{ kind: 'option', props: { value: 'a' } }, { kind: 'option-group', props: {}, items: [{ kind: 'option', props: { tone: 'strong' } }] }] }), []);
  // The items are held to the other component's kinds, props and values, at any depth.
  has(of({ kind: 'chooser', props: {}, items: [{ kind: 'tab', props: {} }] }), /item 4 \(chooser\) → item 1 has kind "tab", which the items of "chooser" do not declare/);
  has(of({ kind: 'chooser', props: {}, items: [{ kind: 'option', props: { label: 'A' } }] }), /item 4 \(chooser\) → item 1 \(option\) uses unknown prop "label"/);
  has(of({ kind: 'chooser', props: {}, items: [{ kind: 'option-group', props: {}, items: [{ kind: 'option', props: { tone: 'loud' } }] }] }), /item 4 \(chooser\) → item 1 → item 1 \(option\) sets tone="loud", not a declared value/);
  // The slots are the other component's, and a fixture fills only one that says what its strings become.
  has(of({ kind: 'chooser', props: {}, slots: { 'trailing-icon': 'x' } }), /item 4 \(chooser\) fills the slot "trailing-icon", which "chooser" does not have/);
  has(of({ kind: 'chooser', props: {}, slots: { footer: 'x' } }), /item 4 \(chooser\) fills the slot "footer", which declares no `fixture`/);
  has(of({ kind: 'chooser', props: {}, slots: { 'leading-icon': ['a', 'b'] } }), /gives the slot "leading-icon" a list, but a glyph slot takes one string/);
  // A kind of the spec's own fills no slots; a component with no item kinds holds none.
  has(of({ kind: 'tab', props: {}, slots: { 'leading-icon': 'x' } }), /item 4 \(tab\) fills slots, but "tab" is not a kind that is another component/);
  has(of({ kind: 'plain', props: {}, items: [{ kind: 'tab', props: {} }] }), /item 4 \(plain\) holds items, but "plain" is not a container kind, and its component has no item kinds of its own/);
});
