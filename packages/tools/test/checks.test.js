import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkParity, compileSpecSchema, implementationProblems, specProblems, systemAvailability, unknownTokenIdsInProse, validateAvailability, validateSpecs, wordsProblems } from '../src/checks.js';
import { CONFIG, DOCS_PAGES, OVERRIDES, PLATFORMS, exists, loadSpecs, read } from '../src/conventions.js';
import { buildStatus, docsAddress } from '../src/status.js';

test('every spec in the repository is valid', () => {
  assert.deepEqual(validateSpecs(), []);
});

test('a behaviour sentence that names a token the vocabulary does not have is a problem, in that sentence', () => {
  const vocabulary = new Set(['tanrei.sys.motion.duration.press-hold', 'tanrei.comp.button.container.shape']);
  const spec = {
    behavior: [
      { id: 'X-1', text: 'WHEN pressed THE x SHALL hold for sys.motion.duration.press-hold and round by comp.button.container.shape.' },
      { id: 'X-2', text: 'THE x SHALL ease by sys.shape.corner-smoothing (a token that is not in this vocabulary).' },
      { id: 'X-3', text: 'A bare word like sys.shape or ref alone is not an id.' },
    ],
  };
  assert.deepEqual(unknownTokenIdsInProse(spec, vocabulary, 'tanrei'), [{ id: 'X-2', name: 'sys.shape.corner-smoothing' }]);
});

test('the repository is at parity with its own specs', () => {
  assert.deepEqual(checkParity(), []);
});

test('conventions cover every configured platform', () => {
  for (const platform of CONFIG.platforms) {
    const paths = PLATFORMS[platform];
    assert.ok(paths, platform);
    for (const key of ['implementation', 'test']) assert.equal(typeof paths[key]('radio-button'), 'string');
    assert.match(paths.snapshot('radio-button', 'selected-medium'), /selected-medium/);
  }
});

test('a foundation with a spec is placed by its override, and nothing else moves', () => {
  // Prose is a stylesheet on the web and its page is under Foundations; a component keeps the table's places.
  assert.equal(PLATFORMS.web.implementation('prose'), 'packages/web/src/styles/prose.css');
  assert.equal(PLATFORMS.web.test('prose'), 'packages/web/src/styles/prose.test.ts');
  assert.match(PLATFORMS.web.snapshot('prose', 'specimen'), /^packages\/web\/snapshots\/prose\/specimen\.png$/);
  assert.ok(DOCS_PAGES('prose').every((page) => /\/foundations\//.test(page) && exists(page)), DOCS_PAGES('prose').join(', '));
  assert.ok(exists(PLATFORMS.web.implementation('prose')), 'the stylesheet the web is lagging with');
  assert.equal(PLATFORMS.web.implementation('button'), 'packages/web/src/components/button/button.ts');
  assert.deepEqual(DOCS_PAGES('button'), ['apps/docs/src/content/docs/components/button.mdx', 'apps/docs/src/content/docs/ja/components/button.mdx']);
  // The other platforms have no override: prose is planned there and will be a component file like any other.
  for (const platform of CONFIG.platforms.filter((p) => p !== 'web')) assert.match(PLATFORMS[platform].implementation('prose'), /[Pp]rose/);
  // An override names a spec that exists.
  const names = new Set(loadSpecs().map(({ spec }) => spec.name));
  for (const name of Object.keys(OVERRIDES)) assert.ok(names.has(name), name);
});

test('a component that is a class and a stylesheet on the web is placed by its override', () => {
  // The link is a class on the product's anchor: a stylesheet and its test, and a component's docs pages.
  assert.equal(PLATFORMS.web.implementation('link'), 'packages/web/src/styles/link.css');
  assert.equal(PLATFORMS.web.test('link'), 'packages/web/src/styles/link.test.ts');
  assert.match(PLATFORMS.web.snapshot('link', 'in-text'), /^packages\/web\/snapshots\/link\/in-text\.png$/);
  assert.deepEqual(DOCS_PAGES('link'), ['apps/docs/src/content/docs/components/link.mdx', 'apps/docs/src/content/docs/ja/components/link.mdx']);
  for (const platform of CONFIG.platforms.filter((p) => p !== 'web')) assert.match(PLATFORMS[platform].implementation('link'), /[Ll]ink/);
  // Inline code is a class on a `code` element, in the code stylesheet; the code block and the copy button are elements.
  assert.equal(PLATFORMS.web.implementation('inline-code'), 'packages/web/src/styles/code.css');
  assert.equal(PLATFORMS.web.test('inline-code'), 'packages/web/src/styles/code.test.ts');
  assert.deepEqual(DOCS_PAGES('inline-code'), ['apps/docs/src/content/docs/components/inline-code.mdx', 'apps/docs/src/content/docs/ja/components/inline-code.mdx']);
  assert.equal(PLATFORMS.web.implementation('code-block'), 'packages/web/src/components/code-block/code-block.ts');
  assert.equal(PLATFORMS.web.implementation('copy-button'), 'packages/web/src/components/copy-button/copy-button.ts');
  // Steps are a class on the product's own ordered list: a stylesheet and its test, and nothing beside it.
  assert.equal(PLATFORMS.web.implementation('steps'), 'packages/web/src/styles/steps.css');
  assert.equal(PLATFORMS.web.test('steps'), 'packages/web/src/styles/steps.test.ts');
  assert.equal(PLATFORMS.web.stylesheet('steps'), undefined);
  assert.match(PLATFORMS.web.snapshot('steps', 'with-code'), /^packages\/web\/snapshots\/steps\/with-code\.png$/);
  assert.deepEqual(DOCS_PAGES('steps'), ['apps/docs/src/content/docs/components/steps.mdx', 'apps/docs/src/content/docs/ja/components/steps.mdx']);
  for (const platform of CONFIG.platforms.filter((p) => p !== 'web')) assert.match(PLATFORMS[platform].implementation('steps'), /[Ss]teps/);
  // The timeline is a class on the product's own ordered list, as steps are.
  assert.equal(PLATFORMS.web.implementation('timeline'), 'packages/web/src/styles/timeline.css');
  assert.equal(PLATFORMS.web.test('timeline'), 'packages/web/src/styles/timeline.test.ts');
  assert.equal(PLATFORMS.web.stylesheet('timeline'), undefined);
  // The previous and next links are classes on the product's own `nav` and anchors.
  assert.equal(PLATFORMS.web.implementation('previous-next-links'), 'packages/web/src/styles/previous-next-links.css');
  assert.equal(PLATFORMS.web.test('previous-next-links'), 'packages/web/src/styles/previous-next-links.test.ts');
  assert.equal(PLATFORMS.web.stylesheet('previous-next-links'), undefined);
  assert.deepEqual(DOCS_PAGES('previous-next-links'), ['apps/docs/src/content/docs/components/previous-next-links.mdx', 'apps/docs/src/content/docs/ja/components/previous-next-links.mdx']);
  for (const platform of CONFIG.platforms.filter((p) => p !== 'web')) assert.match(PLATFORMS[platform].implementation('previous-next-links'), /[Pp]revious[Nn]ext[Ll]inks|previous_next_links/);
});

/** Components that are, like the table, an element with no shadow root and one light-DOM stylesheet. */
const LIGHT_DOM_ELEMENTS = ['accordion', 'description-list', 'figure', 'app-shell', 'page-header', 'tree-view'];
/** Components that are an element with a shadow root and a light-DOM stylesheet for the product's own markup. */
const SHADOW_ROOT_AND_STYLESHEET = ['table-of-contents'];

test('a component that is an element and a stylesheet on the web names both', () => {
  // The table's element is where every element is; its light-DOM stylesheet is the second file of its implementation.
  assert.equal(PLATFORMS.web.implementation('table'), 'packages/web/src/components/table/table.ts');
  assert.equal(PLATFORMS.web.test('table'), 'packages/web/src/components/table/table.test.ts');
  assert.equal(PLATFORMS.web.stylesheet('table'), 'packages/web/src/styles/table.css');
  assert.equal(PLATFORMS.web.stylesheet('button'), undefined);
  assert.equal(PLATFORMS.web.stylesheet('link'), undefined, 'a class and a stylesheet has one file, its implementation');
  // The two files come together: a component of this form is built when both exist, and planned when neither does.
  assert.equal(exists(PLATFORMS.web.implementation('table')), exists(PLATFORMS.web.stylesheet('table')));
  // The same form, each around the product's own native elements.
  for (const name of LIGHT_DOM_ELEMENTS) {
    assert.equal(PLATFORMS.web.implementation(name), `packages/web/src/components/${name}/${name}.ts`);
    assert.equal(PLATFORMS.web.stylesheet(name), `packages/web/src/styles/${name}.css`);
    assert.equal(exists(PLATFORMS.web.implementation(name)), exists(PLATFORMS.web.stylesheet(name)), `${name} has both files or neither`);
  }
  // An element that keeps a shadow root for what the product did not write, with a light-DOM stylesheet that draws the
  // product's own markup around it, names both files too.
  for (const name of SHADOW_ROOT_AND_STYLESHEET) {
    assert.equal(PLATFORMS.web.implementation(name), `packages/web/src/components/${name}/${name}.ts`);
    assert.equal(PLATFORMS.web.stylesheet(name), `packages/web/src/styles/${name}.css`);
    assert.equal(exists(PLATFORMS.web.implementation(name)), exists(PLATFORMS.web.stylesheet(name)), `${name} has both files or neither`);
  }
  // The names a spec maps may stand in either file.
  const spec = { props: [], platforms: {} };
  const mapping = { name: 'tanrei-thing', props: { density: 'density', align: 'data-align' } };
  assert.deepEqual(implementationProblems(spec, mapping, "customElements.define('tanrei-thing'); density\ntanrei-thing [data-align='end'] {}", { where: 'x', impl: 'a or b' }), []);
  assert.equal(implementationProblems(spec, mapping, "customElements.define('tanrei-thing'); density", { where: 'x', impl: 'a or b' }).length, 1);
});

test('the status matrix lists the whole inventory and never exceeds the specs', () => {
  const status = buildStatus();
  // Every name of the inventory, in its order: no total is written here, so a new component does not touch this test.
  assert.deepEqual(status.components.map((row) => row.name), JSON.parse(read('specs/inventory.json')).components.map((item) => item.name));
  const specs = new Map(loadSpecs().map(({ spec }) => [spec.name, spec]));
  for (const row of status.components) {
    for (const platform of CONFIG.platforms) {
      const claimed = specs.get(row.name)?.platforms[platform].status ?? 'planned';
      assert.equal(row.platforms[platform], claimed, `${row.name}/${platform}`);
    }
  }
});

test('the status matrix names a docs page only where the page exists', () => {
  // The docs site links a component's name from this field alone.
  for (const row of buildStatus().components) {
    if (row.docs === null) continue;
    assert.match(row.docs, /^\/(?:[a-z0-9-]+\/)+$/, row.name);
    assert.ok(exists(`apps/docs/src/content/docs${row.docs.slice(0, -1)}.mdx`), `${row.name}: ${row.docs}`);
  }
  assert.equal(docsAddress('button'), '/components/button/');
  // A foundation with a spec has no page among the components: it is documented under Foundations.
  assert.equal(docsAddress('prose'), '/foundations/typography/');
  assert.equal(docsAddress('a-component-nobody-wrote'), null);
});

test('what every system leaves out names what exists, and a layer changes what its parent ships', () => {
  assert.deepEqual(validateAvailability(), []);
  const availability = systemAvailability();
  assert.ok(availability.tanrei.components.includes('segmented-button'));
  assert.ok(!('core' in availability), 'the root ships no output of its own, and leaves nothing out');
  // m3-like brings back what the default system leaves out and leaves out its own: every component, no filled
  // navigation bar and no tonal tabs.
  assert.deepEqual(availability['m3-like'], { components: [], variants: { 'navigation-bar': ['filled'], tabs: ['tonal'] } });
  assert.deepEqual(availability['m3-expressive-like'], availability['m3-like']);
});

test('a spec platform is lagging by its status alone: the spec names nothing else about what it owes', () => {
  const validate = compileSpecSchema();
  const spec = structuredClone(loadSpecs().find(({ spec }) => spec.name === 'divider').spec);
  const withPlatform = (extra) => validate({ ...spec, platforms: { ...spec.platforms, compose: { ...spec.platforms.compose, ...extra } } });
  assert.equal(withPlatform({ status: 'lagging' }), true);
  assert.equal(withPlatform({ status: 'alpha' }), true);
  assert.equal(withPlatform({ status: 'lagging', owes: 'see elsewhere' }), false, 'no field points a spec at a record kept elsewhere');
});

test('a string prop with a default of words is a problem that names the prop; the empty default is not', () => {
  const props = [
    { name: 'requiredText', type: 'string', default: 'Required', description: 'x' },
    { name: 'optionalText', type: 'string', default: '', description: 'x' },
    { name: 'href', type: 'string', default: null, description: 'x' },
    { name: 'size', type: 'enum', values: ['small', 'medium'], default: 'medium', description: 'x' },
    { name: 'open', type: 'boolean', default: false, description: 'x' },
    { name: 'rows', type: 'number', default: 2, description: 'x' },
  ];
  assert.deepEqual(wordsProblems('specs/x.spec.json', props, 'prop'), ['specs/x.spec.json: prop "requiredText" has the default "Required": a component supplies no words']);
  // A word in any language, and a default that is only a space, are defaults too.
  assert.equal(wordsProblems('f', [{ name: 'label', type: 'string', default: '必須' }], 'prop').length, 1);
  assert.equal(wordsProblems('f', [{ name: 'label', type: 'string', default: ' ' }], 'prop').length, 1);
  // An item kind's prop is named with its kind.
  assert.deepEqual(wordsProblems('f', [{ name: 'closeLabel', type: 'string', default: 'Close' }], 'item "tab" prop'), ['f: item "tab" prop "closeLabel" has the default "Close": a component supplies no words']);
});

test('`words` is a key of the product\'s words on a string prop, and nothing else', () => {
  const validate = compileSpecSchema();
  const spec = structuredClone(loadSpecs().find(({ spec }) => spec.name === 'divider').spec);
  const withProp = (prop) => validate({ ...spec, props: [...spec.props, { name: 'closeLabel', type: 'string', default: '', description: 'The close button\'s name.', ...prop }] });
  assert.equal(withProp({}), true, JSON.stringify(validate.errors));
  assert.equal(withProp({ words: 'closeLabel' }), true, JSON.stringify(validate.errors));
  assert.equal(withProp({ words: 'copyFailedLabel2' }), true);
  // A key is one camel-case name: no path, no kebab case, no capital first, not empty, not a flag or a list.
  for (const words of ['', 'CloseLabel', 'close-label', 'status.warning', 'close label', '2nd', true, ['closeLabel'], null]) assert.equal(withProp({ words }), false, JSON.stringify(words));
  // The key belongs to a string prop: the schema cannot say so, the check does.
  assert.deepEqual(wordsProblems('f', [{ name: 'open', type: 'boolean', default: false, words: 'openLabel' }], 'prop'), ['f: prop "open" reads the product\'s words but is not a string']);
  assert.deepEqual(wordsProblems('f', [{ name: 'closeLabel', type: 'string', default: '', words: 'closeLabel' }], 'prop'), []);
});

test('`validate` holds every spec to it: an English default fails and names the prop, in a spec and in an item kind', () => {
  const load = (name) => structuredClone(loadSpecs().find(({ spec }) => spec.name === name));
  const field = load('field');
  assert.deepEqual(specProblems(field.file, field.spec), [], 'the accepted spec has no default of words');
  field.spec.props.find((p) => p.name === 'requiredText').default = 'Required';
  assert.deepEqual(specProblems(field.file, field.spec), [`${field.file}: prop "requiredText" has the default "Required": a component supplies no words`]);

  const menu = load('menu');
  menu.spec.items.find((kind) => kind.name === 'item').props.find((p) => p.name === 'targetLabel').default = 'opens in a new tab';
  assert.deepEqual(specProblems(menu.file, menu.spec), [`${menu.file}: item "item" prop "targetLabel" has the default "opens in a new tab": a component supplies no words`]);

  // No string prop of any spec in the repository has a default but the empty one.
  // (An item kind that is a member's has no props written here: they are its member's, read there.)
  const props = loadSpecs().flatMap(({ spec }) => [...spec.props, ...(spec.items ?? []).flatMap((kind) => kind.props ?? [])]);
  assert.deepEqual(props.filter((p) => p.type === 'string' && p.default).map((p) => p.name), []);
});
