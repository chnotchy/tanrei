// The glyph lists (src/glyphs.js) and the icon font cut down to them (src/icon-font.js): the lists are what the
// sources name, drift sees a list that fell behind, and every listed name is drawn by the cut-down font as the full
// font draws it — one glyph, both fills, the same outline — in a file a page can afford.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GENERATORS, regenerate } from '../src/drift.js';
import { axisCuts, fontFiles } from '../src/font-faces.js';
import { COMPONENT_GLYPHS, DOCS_GLYPHS, glyphLists, iconAxes, namingFont, serialize, specWords, writtenWords } from '../src/glyphs.js';
import { iconFont, subsetIconFont } from '../src/icon-font.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after);

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = path.join(REPO, 'packages/tools/src/glyphs.js');
const web = path.join(REPO, 'packages/web');
const read = (root, rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null);
const listed = (rel) => JSON.parse(read(REPO, rel)).glyphs;

describe('which words are glyph names', () => {
  test('a declared glyph constant: every string of its value, never an object’s key', () => {
    const words = writtenWords(`
      const CLOSE_GLYPH = 'close';
      const GLYPHS = { up: 'arrow_upward', 'down': "arrow_downward", back: \`arrow_back\` } as const;
      export const KIND_GLYPH: Readonly<Record<Kind, string>> = { pdf: 'picture_as_pdf', other: 'description' };
      static readonly GROUP_ICONS = ['home', 'settings'];
      const TOGGLE_GLYPH = open ? 'expand_less' : 'expand_more';
      const GLYPH_COUNT = 'numbers'; const ICON_SPACE = 'start'; const SHAPES = ['circle', 'square'];
    `);
    for (const word of ['close', 'arrow_upward', 'arrow_downward', 'arrow_back', 'picture_as_pdf', 'description', 'home', 'settings', 'expand_less', 'expand_more']) assert.ok(words.has(word), word);
    for (const word of ['up', 'down', 'back', 'pdf', 'other', 'numbers', 'start', 'circle', 'square']) assert.ok(!words.has(word), word);
  });
  test('a glyph prop or attribute, the text of a glyph slot or of a bare icon, generated content', () => {
    const words = writtenWords(`
      <tanrei-button icon="favorite" label="Like"></tanrei-button> <tanrei-option leading-icon='light_mode'>Light</tanrei-option>
      <tanrei-button><span slot="icon">more_vert</span></tanrei-button> <span slot="leading-icon">public</span>
      <tanrei-empty-state><span slot="media">explore_off</span></tanrei-empty-state> <span class="tanrei-icon" aria-hidden="true">home</span>
      const look = { status: 'warning', icon: 'schedule' }; result.leadingIcon = 'article'; Object.assign(el, { trailingIcon: "chevron_right" });
      css\`.box::before { content: 'check' / ''; }\`;
    `);
    for (const word of ['favorite', 'light_mode', 'more_vert', 'public', 'explore_off', 'home', 'schedule', 'article', 'chevron_right', 'check']) assert.ok(words.has(word), word);
    for (const word of ['warning', 'Like', 'Light']) assert.ok(!words.has(word), word);
  });
  test('nothing else: a word the icon set also draws is no glyph because code writes it as a string or a text', () => {
    // The earlier scan read every whole-word string and element text, and took about 80 such words into each list.
    const words = writtenWords(`
      const docs = await getCollection('docs');
      export default { plugins: [{ name: 'x', apply: 'build' }], head: [{ tag: 'script', attrs: { src } }] };
      if (event.pointerType === 'mouse' && typeof f === 'function') this.sync('start', \`select\`);
      html\`<span class="label">label</span><p>search</p><slot>expand_more</slot>\`;
      // const NOTE_GLYPH = 'commented_out';
      /* <span slot="icon">blocked_out</span> */
      <!-- <tanrei-button icon="markup_comment"> -->
    `);
    assert.deepEqual([...words], []);
  });
  test('in a spec: the values of glyph props, slots and content, in fixtures and defaults', () => {
    const words = specWords({
      props: [{ name: 'leadingIcon', type: 'string', default: 'search' }, { name: 'variant', type: 'enum', default: 'start' }],
      items: { option: { props: [{ name: 'markIcon', default: 'check' }] } },
      fixtures: [{ id: 'f', props: { variant: 'filled', trailingIcon: 'chevron_right', label: 'home' }, slots: { icon: 'add', actions: ['share', 'more_vert'] }, items: [{ content: 'arrow_back', props: { openIcon: 'folder_open', value: 'train' } }] }],
    });
    assert.deepEqual([...words].sort(), ['add', 'arrow_back', 'check', 'chevron_right', 'folder_open', 'more_vert', 'search', 'share']);
  });
});

describe('the lists', () => {
  test('are the files the generator writes now: a stale list fails here and in pnpm drift', async () => {
    for (const [rel, doc] of Object.entries(await glyphLists(REPO))) assert.equal(read(REPO, rel), serialize(doc), `${rel} is stale: run pnpm generate`);
  });
  test('hold the glyphs the components draw by themselves and the docs’ own', () => {
    const components = listed(COMPONENT_GLYPHS);
    for (const name of ['expand_more', 'chevron_right', 'close', 'check', 'arrow_back', 'drag_indicator', 'more_horiz', 'calendar_month', 'open_in_new', 'content_copy']) assert.ok(components.includes(name), name);
    assert.deepEqual(components, [...components].sort(), 'sorted, one name each');
    // The Theme Studio's preview (packages/studio) draws `favorite` and `edit`, the docs' pages theirs.
    for (const name of ['favorite', 'edit']) assert.ok(listed(DOCS_GLYPHS).includes(name), name);
  });
  test('miss no glyph the components’ code spells outside a declared constant', async () => {
    // Every whole-word string and every element's whole text of the web components' code that the icon set draws is
    // on the list — or is one of these words, which the code writes for something else (a value, an event, a part, a
    // CSS property, a file ending) and never draws. A glyph a component draws is written in a constant (`const
    // CLOSE_GLYPH = 'close'`), a glyph prop's default or its spec; a word added here is one that is never drawn.
    const NOT_DRAWN = new Set(['2d', 'anchor', 'asterisk', 'attachment', 'autoplay', 'badge', 'box', 'bubble', 'cast', 'chips', 'circle', 'comment', 'commit', 'css', 'csv', 'cut', 'done', 'expand', 'extension', 'eyebrow', 'face', 'filter', 'forward', 'function', 'gif', 'glyphs', 'height', 'highlight', 'host', 'html', 'iframe', 'input', 'list', 'more', 'mouse', 'move', 'moving', 'navigation', 'note', 'numbers', 'ods', 'odt', 'opacity', 'pages', 'password', 'pattern', 'pending', 'php', 'pill', 'pinch', 'place', 'preview', 'radio', 'resize', 'script', 'segment', 'select', 'shift', 'skeleton', 'sort', 'spellcheck', 'sql', 'square', 'start', 'step', 'steppers', 'steps', 'style', 'swipe', 'switch', 'tab', 'tabs', 'target', 'today', 'toolbar', 'tooltip', 'travel', 'tsv', 'upcoming', 'visibility', 'width']);
    const names = (await iconFont(namingFont())).names();
    const components = new Set(listed(COMPONENT_GLYPHS));
    const spelled = new Map();
    const walk = (rel) => {
      for (const entry of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) {
          if (!['generated', 'links', 'highlight'].includes(entry.name)) walk(child);
          continue;
        }
        if (!/\.(ts|css)$/.test(entry.name) || /\.test\.ts$|\.d\.ts$/.test(entry.name)) continue;
        const code = fs.readFileSync(path.join(REPO, child), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;,{}()])\/\/.*$/gm, '$1');
        for (const m of code.matchAll(/'([a-z0-9_]+)'|"([a-z0-9_]+)"|`([a-z0-9_]+)`|>\s*([a-z0-9_]+)\s*</g)) {
          const word = m[1] || m[2] || m[3] || m[4];
          if (names.has(word) && !components.has(word) && !NOT_DRAWN.has(word)) spelled.set(word, child);
        }
      }
    };
    walk('packages/web/src');
    assert.deepEqual([...spelled].map(([word, file]) => `${word} (${file})`), [], 'glyph names the code spells that the list leaves out: declare each one drawn in a constant (then pnpm generate), or add a word never drawn to NOT_DRAWN');
    assert.deepEqual([...NOT_DRAWN].filter((word) => components.has(word)), [], 'a word on the list is drawn: take it out of NOT_DRAWN');
  });
  test('name the icon axes of the shipped systems, read from the resolved tokens', () => {
    assert.deepEqual(iconAxes(REPO), { FILL: [0, 1], wght: [300, 500], GRAD: [0, 0], opsz: [20, 48] });
    assert.deepEqual(JSON.parse(read(REPO, COMPONENT_GLYPHS)).axes, iconAxes(REPO));
  });
  test('are generated by pnpm generate and compared by pnpm drift', () => {
    const entry = GENERATORS.find(([, , args]) => args.includes('packages/tools/src/glyphs.js'));
    assert.ok(entry, 'drift runs the glyph generator');
    assert.deepEqual(entry[3], [COMPONENT_GLYPHS, DOCS_GLYPHS]);
    assert.ok(GENERATORS.indexOf(entry) > GENERATORS.findIndex(([, , args]) => args.includes('packages/tokens-build/src/cli.js')), 'after the tokens it reads the axes from');
    assert.match(JSON.parse(read(REPO, 'package.json')).scripts.generate, /node packages\/tools\/src\/glyphs\.js/);
  });
});

describe('drift sees a list that fell behind', () => {
  // A tree with what the generator reads: one spec, the resolved tokens, the web's glyph rule and one component.
  function tree() {
    const root = tempDir('glyphs');
    const copy = (rel) => fs.cpSync(path.join(REPO, rel), path.join(root, rel), { recursive: true });
    copy('design/tokens');
    copy('packages/web/src/styles/icons.ts');
    copy('specs/button.spec.json');
    fs.mkdirSync(path.join(root, 'packages/web/src/components/thing'), { recursive: true });
    fs.writeFileSync(path.join(root, 'packages/web/src/components/thing/thing.ts'), "const GLYPH = 'expand_more';\n");
    return root;
  }
  const generators = [['.', process.execPath, [SCRIPT], [COMPONENT_GLYPHS, DOCS_GLYPHS]]];

  test('fresh, nothing is reported; a name taken out by hand is; a glyph a component starts to draw is', () => {
    const root = tree();
    assert.equal(regenerate(root, generators).failure, undefined);
    const names = JSON.parse(read(root, COMPONENT_GLYPHS)).glyphs;
    assert.ok(names.includes('expand_more') && names.includes('add'), names.join(','));
    assert.deepEqual(regenerate(root, generators, { checkOnly: true }).changed, []);

    const edited = read(root, COMPONENT_GLYPHS).replace('    "expand_more",\n', '');
    fs.writeFileSync(path.join(root, COMPONENT_GLYPHS), edited);
    assert.deepEqual(regenerate(root, generators, { checkOnly: true }).changed, [COMPONENT_GLYPHS]);
    assert.equal(read(root, COMPONENT_GLYPHS), edited, '--check leaves the tree as it was');
    assert.deepEqual(regenerate(root, generators).changed, [COMPONENT_GLYPHS]);

    fs.appendFileSync(path.join(root, 'packages/web/src/components/thing/thing.ts'), "const MORE_GLYPH = 'more_vert';\n");
    assert.deepEqual(regenerate(root, generators, { checkOnly: true }).changed, [COMPONENT_GLYPHS]);
  });
  test('a source that names a collection, a build step or a tag adds no glyph: only what is drawn is listed', async () => {
    const root = tree();
    const write = (rel, text) => {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    };
    write('apps/docs/src/pages/index.astro', "---\nimport { getCollection } from 'astro:content';\nconst docs = await getCollection('docs');\n---\n<tanrei-button icon=\"favorite\" label={docs.length}></tanrei-button>\n");
    write('apps/docs/src/lib/head.mjs', "export const plugin = { name: 'head', apply: 'build', head: [{ tag: 'script', attrs: { type: 'module' } }] };\n");
    write('packages/web/src/components/thing/thing.styles.ts', "export const styles = css`:host([layout='list']) .mark::before { content: 'check'; }`;\n");
    const lists = await glyphLists(root);
    assert.deepEqual(lists[DOCS_GLYPHS].glyphs, ['favorite']);
    for (const word of ['docs', 'build', 'script', 'list']) assert.ok(!lists[COMPONENT_GLYPHS].glyphs.includes(word) && !lists[DOCS_GLYPHS].glyphs.includes(word), word);
    assert.ok(lists[COMPONENT_GLYPHS].glyphs.includes('check'));
  });
  test('a word the font draws no glyph for is refused, never cut down to its letters', async () => {
    await assert.rejects(subsetIconFont(fs.readFileSync(fontFiles('Material Symbols Rounded', web)[0]), ['expand_more', 'not_a_glyph_name']), /the font draws no glyph named "not_a_glyph_name"/);
  });
});

describe('the cut-down font', async () => {
  const names = [...new Set([...listed(COMPONENT_GLYPHS), ...listed(DOCS_GLYPHS)])].sort();
  const axes = JSON.parse(read(REPO, COMPONENT_GLYPHS)).axes;
  for (const family of ['Material Symbols Rounded', 'Material Symbols Outlined']) {
    test(family, async () => {
      const bytes = fs.readFileSync(fontFiles(family, web)[0]);
      const full = await iconFont(bytes);
      const cuts = axisCuts(axes, full.axes());
      // The grade is pinned (no token moves it), the weight cut to the shipped systems' 300–500; fill and optical
      // size are what the tokens use the whole of.
      assert.deepEqual(cuts, { pin: { GRAD: 0 }, ranges: { wght: [300, 500] } });
      const subset = await subsetIconFont(bytes, names, cuts);
      // The budget: the full file is 5.4 MB (Rounded) and 4.0 MB (Outlined); a page of the docs carries this one.
      assert.ok(subset.byteLength < 200 * 1024, `${family}: ${Math.round(subset.byteLength / 1024)} KB for ${names.length} names`);
      const cut = await iconFont(subset);
      const own = cut.axes();
      assert.deepEqual(Object.keys(own).sort(), ['FILL', 'opsz', 'wght']);
      assert.deepEqual([own.wght.min, own.wght.max, own.FILL.min, own.FILL.max, own.opsz.min, own.opsz.max], [300, 500, 0, 1, 20, 48]);
      const drawn = (font, gid) => font.font.glyphToPath(gid).match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      for (const name of names) {
        for (const at of [{ FILL: 0, wght: 300, opsz: 24 }, { FILL: 1, wght: 500, opsz: 20 }]) {
          // Exactly one glyph, not .notdef: the ligature is kept.
          const glyphs = cut.shape(name, at);
          assert.equal(glyphs.length, 1, `${family}: "${name}" at ${JSON.stringify(at)} shapes to ${glyphs.length} glyphs`);
          assert.notEqual(glyphs[0], 0, `${family}: "${name}" is .notdef`);
          // The glyph the full font draws for it, outline for outline (instancing moves a point by a unit or so).
          const a = drawn(full, full.glyphOf(name, at));
          const b = drawn(cut, glyphs[0]);
          assert.equal(b.length, a.length, `${family}: "${name}" at ${JSON.stringify(at)} is another outline`);
          assert.ok(a.every((value, i) => Math.abs(value - b[i]) <= 2), `${family}: "${name}" at ${JSON.stringify(at)} is drawn elsewhere`);
        }
        // Both fills: the filled twin where the full font has one.
        assert.equal(cut.shape(name, { FILL: 1 })[0] !== cut.shape(name, { FILL: 0 })[0], full.glyphOf(name, { FILL: 1 }) !== full.glyphOf(name, { FILL: 0 }), `${family}: "${name}" has lost or gained a filled form`);
      }
      // A name it was not cut down to is drawn as letters, not as a glyph of another name.
      const missing = [...full.names()].find((name) => !names.includes(name) && name.length > 6);
      assert.ok(cut.shape(missing).length > 1, `${family}: "${missing}"`);
    });
  }
});
