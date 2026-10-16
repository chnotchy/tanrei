// custom-elements.json against the elements themselves: the manifest is made by an analyzer that reads the sources,
// and what an element observes is what Lit made of its `static properties`. Run after the build (`dist/`), by
// `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (relative) => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const manifest = JSON.parse(read('../custom-elements.json'));
const elements = manifest.modules.flatMap((module) => (module.declarations ?? []).filter((d) => d.customElement && d.tagName).map((d) => ({ ...d, path: module.path })));

/** The attributes an element class reads, by name, with the property each one sets: neither state nor `attribute: false`. */
async function observed(element) {
  const module = await import(new URL(`../dist/${element.path.replace(/^src\//, '').replace(/\.ts$/, '.js')}`, import.meta.url));
  const elementClass = module[element.name];
  assert.ok(elementClass, `${element.name} is exported by ${element.path}`);
  elementClass.finalize();
  const attributes = new Map();
  for (const [property, options] of elementClass.elementProperties) {
    if (typeof property !== 'string' || options.state || options.attribute === false) continue;
    attributes.set(typeof options.attribute === 'string' ? options.attribute : property.toLowerCase(), property);
  }
  return attributes;
}

test('every attribute the manifest gives a property is one the element reads, and sets that property', async () => {
  assert.ok(elements.length > 0);
  const problems = [];
  for (const element of elements) {
    const real = await observed(element);
    const listed = (element.attributes ?? []).filter((attribute) => attribute.fieldName);
    // No attribute for internal state, for a property declared `attribute: false`, or under another name than the declared one.
    for (const attribute of listed) if (real.get(attribute.name) !== attribute.fieldName) problems.push(`<${element.tagName}> lists ${attribute.name} for ${attribute.fieldName}, which the element does not read`);
    // And none lost: a property the manifest lists as a member has its attribute there. (A field kept out by `@internal` has neither.)
    const members = new Set((element.members ?? []).filter((member) => member.kind === 'field').map((member) => member.name));
    for (const [name, property] of real) if (members.has(property) && !listed.some((attribute) => attribute.name === name)) problems.push(`<${element.tagName}> reads ${name} for ${property}, which the manifest does not list`);
    for (const member of element.members ?? []) if (member.attribute !== undefined && real.get(member.attribute) !== member.name) problems.push(`<${element.tagName}> ${member.name} names the attribute ${member.attribute}, which the element does not read for it`);
  }
  assert.deepEqual(problems, []);
});

test('an element whose base class is a primitive lists what it inherits: the navigation bar item', () => {
  const item = elements.find((element) => element.tagName === 'tanrei-navigation-bar-item');
  assert.deepEqual(
    item.attributes.map((attribute) => attribute.name).sort(),
    ['badge', 'badge-count', 'badge-label', 'disabled', 'download', 'href', 'icon', 'label', 'rel', 'target', 'target-label', 'value'],
  );
  // Every base class of this package is named with a module the analyzer read (a base that is not exported has no
  // declaration of its own in the manifest; its element still inherits from it).
  const analyzed = new Set(manifest.modules.map((module) => module.path));
  for (const declaration of manifest.modules.flatMap((module) => module.declarations ?? [])) {
    const base = declaration.superclass;
    if (base && !base.package) assert.ok(analyzed.has(base.module), `${declaration.name} extends ${base.name} of ${base.module}, which the analyzer did not read`);
  }
});

test('a primitive adds its base classes to the manifest and nothing else', () => {
  for (const module of manifest.modules.filter((m) => m.path.startsWith('src/primitives/'))) {
    for (const declaration of module.declarations ?? []) {
      assert.equal(declaration.kind, 'class', `${module.path} ${declaration.name}`);
      assert.equal(declaration.tagName, undefined, `${module.path} ${declaration.name} is not an element`);
    }
    assert.ok((module.exports ?? []).every((entry) => entry.kind === 'js'), `${module.path} defines no element`);
  }
});

test('the analyzer\'s sources are written once: in its configuration, which the generate script and the drift check both read', async () => {
  // Written twice — in the script and, as an argument list, in the drift check — a source added to one alone would
  // make the check regenerate another manifest than the committed one.
  const config = (await import('../custom-elements-manifest.config.mjs')).default;
  assert.deepEqual(config.globs, ['src/components/**/*.ts', 'src/primitives/destination.ts', 'src/primitives/composed.ts']);
  assert.deepEqual(config.exclude, ['**/*.test.ts']);
  assert.equal(config.outdir, '.');
  assert.equal(config.litelement, true);
  assert.equal(JSON.parse(read('../package.json')).scripts.generate, 'cem analyze', 'the script names no source of its own');
  // The drift check's generators are a list it exports (packages/tools/src/drift.js), read here as the check runs them.
  const { GENERATORS } = await import('../../tools/src/drift.js');
  const drift = GENERATORS.filter(([cwd, command]) => cwd === 'packages/web' && command === 'node_modules/.bin/cem');
  assert.equal(drift.length, 1, 'the drift check runs the analyzer');
  assert.deepEqual(drift[0][2], ['analyze'], 'and neither does the drift check');
  assert.deepEqual(drift[0][3], ['packages/web/custom-elements.json'], 'and compares the manifest the configuration writes');
  // What the configuration names is what the manifest holds: every module is a component's or one of the two
  // primitives that hold a base class (a navigation destination's; a composed element's).
  for (const module of manifest.modules) assert.ok(module.path.startsWith('src/components/') || ['src/primitives/destination.ts', 'src/primitives/composed.ts'].includes(module.path), module.path);
  assert.ok(!manifest.modules.some((module) => module.path.endsWith('.test.ts')));
});

test('a composed element is in the manifest whole: what it takes from a member is there with the member\'s own words, and a source that cannot be found stops the analysis', async () => {
  const field = elements.find((element) => element.tagName === 'tanrei-one-time-code-field');
  const member = (tag) => elements.find((element) => element.tagName === tag);
  // A forwarded property and its attribute: the member's description, type and default.
  const theirs = member('tanrei-field').members.find((m) => m.name === 'supportingText');
  const mine = field.members.find((m) => m.name === 'supportingText');
  assert.ok(theirs.description);
  assert.deepEqual([mine.description, mine.type, mine.default, mine.attribute], [theirs.description, theirs.type, theirs.default, 'supporting-text']);
  assert.equal(field.attributes.find((a) => a.name === 'supporting-text').description, theirs.description);
  // The value is an accessor of the class: it is listed as its own, with the member's words.
  const value = field.members.find((m) => m.name === 'value');
  assert.equal(value.description, member('tanrei-one-time-code-input').members.find((m) => m.name === 'value').description);
  assert.equal(value.inheritedFrom, undefined);
  // Events with the member's detail type; the slot passed on; the member parts and every exported one.
  assert.deepEqual(field.events.map((event) => [event.name, event.type.text]), ['input', 'change', 'complete', 'action'].map((name) => [name, 'CustomEvent<TanreiOneTimeCodeInputDetail>']));
  assert.deepEqual(field.slots, member('tanrei-field').slots.filter((slot) => slot.name === 'label-icon'));
  assert.deepEqual(field.cssParts.map((part) => part.name), ['field', 'one-time-code-input', 'label', 'label-icon', 'requirement-label', 'supporting-text', 'error-text', 'input', 'cell', 'character', 'caret', 'separator']);
  assert.ok(field.attributes.some((a) => a.name === 'form' && !a.fieldName), 'the form attribute');
  // Nothing of the marking is left in the manifest.
  assert.ok(!JSON.stringify(field).includes('=> tanrei-'));
  // The plugin itself, on sources written here: it stops on a source it cannot find, and takes a part renamed for
  // two members that share its name (`label: a-label, label` — the prefixed name, and the bare one named again).
  const config = (await import('../custom-elements-manifest.config.mjs')).default;
  const plugin = config.plugins.find((one) => one.name === 'tanrei-composed-from');
  const { create, ts } = await import('@custom-elements-manifest/analyzer');
  const MEMBER = `/**\n * A member.\n * @tag tanrei-a\n * @csspart label - The label.\n * @csspart help - The help.\n * @fires change - It changed.\n */\nexport class A extends HTMLElement {\n  /** Names it. */\n  label = '';\n}\ncustomElements.define('tanrei-a', A);`;
  const analyze = (composed) => {
    const modules = [ts.createSourceFile('src/a.ts', MEMBER, ts.ScriptTarget.ES2015, true), ts.createSourceFile('src/composed.ts', composed, ts.ScriptTarget.ES2015, true)];
    return create({ modules, plugins: [plugin] }).modules.find((module) => module.path === 'src/composed.ts').declarations[0];
  };
  const made = analyze(`/**\n * Composed.\n * @tag tanrei-b\n * @exportparts tanrei-a label: a-label, label\n * @fires change - => tanrei-a\n */\nexport class B extends HTMLElement {\n  /** @from tanrei-a.label */\n  label = '';\n}`);
  assert.deepEqual(made.cssParts.map((part) => [part.name, part.description]), [['label', 'The label.'], ['a-label', 'The label.'], ['help', 'The help.']]);
  assert.equal(made.members.find((m) => m.name === 'label').description, 'Names it.');
  assert.equal(made.events.find((event) => event.name === 'change').description, 'It changed.');
  assert.throws(() => analyze(`/** Composed. */\nexport class C extends HTMLElement {\n  /** @from tanrei-a.missing */\n  label = '';\n}`), /tanrei-composed-from: C: label is from tanrei-a\.missing, and <tanrei-a> has no property "missing"/);
  assert.throws(() => analyze(`/**\n * Composed.\n * @exportparts tanrei-nowhere\n */\nexport class D extends HTMLElement {}`), /tanrei-composed-from: D: no element <tanrei-nowhere> is declared in this package/);
  assert.throws(() => analyze(`/**\n * Composed.\n * @fires input - => tanrei-a\n */\nexport class E extends HTMLElement {\n  /** @from tanrei-a.label */\n  label = '';\n}`), /tanrei-composed-from: E: the event "input" is from <tanrei-a>, which has no event of that name/);
});
