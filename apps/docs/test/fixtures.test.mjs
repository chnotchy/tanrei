// The Specs tab's live fixtures (src/lib/fixtures.ts), rendered by Node: every fixture of every spec, read against the
// custom elements manifest of the web package — no browser, no build.
//
// `fixtures.ts` is TypeScript that Vite reads when the site is built; test/vite-shim.mjs gives Node the four things
// the module and `repo.ts` ask of Vite, so the renderer under test is the file the site imports, unchanged.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { STAGED_FILES, drawsFixture, drawsLive, liveFixture, specimenFixtures } = await import('../src/lib/fixtures.ts');
const { definedTags, specs, webAttribute } = await import('../src/lib/repo.ts');

const repo = (file) => fileURLToPath(new URL(`../../../${file}`, import.meta.url));
const specFiles = fs.readdirSync(repo('specs')).filter((file) => file.endsWith('.spec.json'));

// The manifest, read here on its own: tag → attribute name → its declaration.
const manifest = JSON.parse(fs.readFileSync(repo('packages/web/custom-elements.json'), 'utf8'));
const declared = new Map(manifest.modules.flatMap((module) => (module.declarations ?? []).filter((declaration) => declaration.tagName).map((declaration) => [declaration.tagName, new Map((declaration.attributes ?? []).map((attribute) => [attribute.name, attribute]))])));

/** What any element may carry and no manifest lists: the renderer's own staging (`class`, `style`, `dir`, `lang`), a child's `slot`, and the two open families. */
const isGlobal = (name) => ['class', 'style', 'dir', 'lang', 'slot'].includes(name) || name.startsWith('data-') || name.startsWith('aria-');
/** The values of an attribute whose type is a closed list of strings (`'filled' | 'tonal'`), or nothing. */
const closedValues = (attribute) => {
  const pieces = (attribute.type?.text ?? '').split('|').map((piece) => piece.trim()).filter((piece) => piece !== 'undefined' && piece !== 'null');
  return pieces.length && pieces.every((piece) => /^'[^']*'$/.test(piece)) ? pieces.map((piece) => piece.slice(1, -1)) : undefined;
};

const TAG = /<(tanrei-[a-z0-9-]+)((?:\s+[^\s=<>"]+(?:="[^"]*")?)*)\s*>/g;
/** Every `tanrei-*` element a piece of HTML opens: its tag and its attributes (a bare one is `undefined`). */
function tanreiElements(html) {
  const found = [...html.matchAll(TAG)].map((tag) => ({ tag: tag[1], attributes: [...tag[2].matchAll(/\s+([^\s=<>"]+)(?:="([^"]*)")?/g)].map((attribute) => [attribute[1], attribute[2]]) }));
  // Nothing escapes the reading: every `<tanrei-` the HTML opens was read as an element.
  assert.equal(found.length, html.split('<tanrei-').length - 1, `an element of this HTML could not be read:\n${html}`);
  return found;
}

/** Every fixture the Specs tab would draw live (components/ComponentSpecs.astro: the element is defined and the renderer knows its markup). */
const drawn = Object.values(specs).filter((spec) => definedTags.has(spec.platforms.web?.name) && drawsLive(spec));
/**
 * The fixtures of a drawn spec that are listed without a drawing, because they give what the installed build does not
 * read yet (`drawsFixture`): each spec's, while its web status is `lagging`. A revision is
 * accepted before the web builds it; the list is what the web owes a drawing for, it is emptied by the
 * build that reads the props, and a fixture that is not on it and is not drawn is a defect of the renderer.
 */
const WAITING = {
  // (The list's fixtures are drawn: the web reads every prop of its current revision.)
  // The list is in the order of the Field's fixtures. (The Field's fixture around a File picker, its
  // ninety around a Text input, and the twenty-one that give it a value text — the twins
  // of the slider field's fixtures — are drawn: all three are built.)
  //
  // (Its one fixture around a Chat composer is drawn: `tanrei-chat-composer` is built.)
  //
  // (The chip field's twenty-seven twins — a Field around a Text input with its entries as chips in
  // the input's entries slot — are drawn: the web built the place and the chip field.)
  //
  // (The twins of the two fields that were split are drawn, both controls being built: the number field's
  // forty-six — `tanrei-number-input` — and the color field's thirty-nine —
  // `tanrei-color-input`.)
  //
  // (The fifty-seven around a select with its options, and the sixty around a combobox with its
  // options — the twins of the select field's and the combobox field's — are drawn: both controls are
  // the bare ones, and the reader writes an item's own items and slots.)
  //
  // So nothing of the Field waits, and it has no entry here.
};
assert.equal(WAITING.field, undefined, 'no fixture of the Field waits');
/** The fixtures of a drawn spec that the page draws. */
const drawnFixtures = (spec) => spec.fixtures.filter((each) => drawsFixture(spec, each));
const fixture = (name, id) => {
  const found = specs[name].fixtures.find((candidate) => candidate.id === id);
  assert.ok(found, `specs/${name}.spec.json has the fixture ${id}`);
  return liveFixture(specs[name], found);
};
const opened = (name, id) => tanreiElements(fixture(name, id).html)[0];

describe('what the renderer reads', () => {
  test('every spec of specs/ is read, and the manifest is the web package\'s', () => {
    assert.deepEqual(Object.keys(specs).sort(), specFiles.map((file) => JSON.parse(fs.readFileSync(repo(`specs/${file}`), 'utf8')).name).sort());
    assert.ok(specFiles.length > 0);
    assert.deepEqual([...definedTags].sort(), [...declared.keys()].sort());
  });

  test('a property\'s attribute is the manifest\'s: HTML\'s own names, kebab-case, and the attribute that says the opposite', () => {
    assert.deepEqual(webAttribute('tanrei-text-field', 'readOnly'), { name: 'readonly', inverse: false });
    assert.deepEqual(webAttribute('tanrei-text-field', 'maxLength'), { name: 'maxlength', inverse: false });
    assert.deepEqual(webAttribute('tanrei-text-field', 'supportingText'), { name: 'supporting-text', inverse: false });
    assert.deepEqual(webAttribute('tanrei-text-input', 'readOnly'), { name: 'readonly', inverse: false });
    assert.deepEqual(webAttribute('tanrei-text-input', 'maxLength'), { name: 'maxlength', inverse: false });
    assert.deepEqual(webAttribute('tanrei-text-input', 'noWrap'), { name: 'no-wrap', inverse: false });
    assert.deepEqual(webAttribute('tanrei-field', 'countText'), { name: 'count-text', inverse: false });
    assert.deepEqual(webAttribute('tanrei-card', 'inset'), { name: 'flush', inverse: true });
    assert.equal(webAttribute('tanrei-card', 'noSuchProperty'), undefined);
    assert.equal(webAttribute('tanrei-no-such-element', 'label'), undefined);
  });

  test('an attribute is the opposite of its property only where the property is a boolean that defaults to true', () => {
    for (const [tag, attributes] of declared) {
      for (const attribute of attributes.values()) {
        if (!attribute.fieldName || !webAttribute(tag, attribute.fieldName)?.inverse) continue;
        assert.equal(attribute.type?.text, 'boolean', `${tag} ${attribute.name}`);
        assert.equal(attribute.default, 'true', `${tag} ${attribute.name}`);
      }
    }
  });
});

describe('every fixture of every spec', () => {
  test('is rendered without a throw, as its component\'s element', () => {
    let count = 0;
    for (const spec of Object.values(specs)) {
      for (const each of spec.fixtures) {
        let live;
        assert.doesNotThrow(() => (live = liveFixture(spec, each)), `${spec.name} / ${each.id}`);
        assert.ok(live.html.startsWith(`<${spec.platforms.web?.name ?? ''}`), `${spec.name} / ${each.id}: ${live.html.slice(0, 80)}`);
        assert.ok(['overlay', 'check', 'none'].includes(live.presentation), `${spec.name} / ${each.id}`);
        count += 1;
      }
    }
    assert.ok(count > 1000, `${count} fixtures were rendered`);
  });

  test('more than forty specs are drawn live, so the checks below read real pages', () => {
    assert.ok(drawn.length > 40, `${drawn.length} specs are drawn live`);
  });

  test('every tanrei-* element a drawn fixture writes is one the build defines', () => {
    const unknown = new Set();
    // The fixtures that are drawn: one that waits (`WAITING`) may write the element of an item kind a revision added
    // and the build does not define yet, and is pinned by name below with the entry that owes it.
    for (const spec of drawn) for (const each of drawnFixtures(spec)) for (const { tag } of tanreiElements(liveFixture(spec, each).html)) if (!declared.has(tag)) unknown.add(`${spec.name} / ${each.id}: <${tag}>`);
    assert.deepEqual([...unknown], []);
  });

  test('every attribute written on a tanrei-* element of a drawn fixture is one the manifest lists for it', () => {
    const unknown = new Map();
    for (const spec of drawn) {
      for (const each of drawnFixtures(spec)) {
        for (const { tag, attributes } of tanreiElements(liveFixture(spec, each).html)) {
          for (const [name] of attributes) {
            if (declared.get(tag)?.has(name) || isGlobal(name)) continue;
            unknown.set(`<${tag} ${name}>`, [...(unknown.get(`<${tag} ${name}>`) ?? []), `${spec.name} / ${each.id}`]);
          }
        }
      }
    }
    assert.deepEqual(Object.fromEntries(unknown), {}, 'an attribute the element does not read draws the fixture as if the prop were not given');
  });

  test('a fixture is listed without a drawing only where the build does not read what it gives, and the web is lagging', () => {
    const waiting = Object.fromEntries(drawn.map((spec) => [spec.name, spec.fixtures.filter((each) => !drawsFixture(spec, each)).map((each) => each.id)]).filter(([, ids]) => ids.length));
    assert.deepEqual(waiting, Object.fromEntries(Object.entries(WAITING).map(([name, { fixtures }]) => [name, fixtures])), 'a fixture that is not drawn and is not owed by an entry is drawn wrongly by the renderer; one that is owed and is drawn has been built');
    for (const name of Object.keys(WAITING)) assert.equal(specs[name].platforms.web.status, 'lagging', `${name}: the web is behind its spec`);
  });

  test('every value written for an attribute whose values are a closed list is one of the list', () => {
    const wrong = [];
    for (const spec of drawn) {
      for (const each of drawnFixtures(spec)) {
        for (const { tag, attributes } of tanreiElements(liveFixture(spec, each).html)) {
          for (const [name, value] of attributes) {
            const values = declared.get(tag)?.has(name) ? closedValues(declared.get(tag).get(name)) : undefined;
            if (values && !values.includes(value)) wrong.push(`${spec.name} / ${each.id}: <${tag} ${name}="${value}"> is not one of ${values.join(', ')}`);
          }
        }
      }
    }
    assert.deepEqual(wrong, []);
  });
});

describe('a prop whose attribute is not the kebab-case of its name', () => {
  for (const id of ['stacked-read-only', 'outlined-read-only']) {
    test(`the text field's ${id} is read-only: readOnly is the attribute readonly`, () => {
      const { tag, attributes } = opened('text-field', id);
      assert.equal(tag, 'tanrei-text-field');
      assert.ok(attributes.some(([name, value]) => name === 'readonly' && value === undefined), JSON.stringify(attributes));
      assert.ok(!attributes.some(([name]) => name === 'read-only' || name === 'readOnly'), JSON.stringify(attributes));
    });
  }

  for (const id of ['stacked-counter', 'outlined-counter']) {
    test(`the text field's ${id} has its limit: maxLength is the attribute maxlength`, () => {
      const { attributes } = opened('text-field', id);
      const limit = specs['text-field'].fixtures.find((each) => each.id === id).props.maxLength;
      assert.ok(Number(limit) > 0);
      assert.deepEqual(attributes.filter(([name]) => /max-?length/i.test(name)), [['maxlength', String(limit)]]);
      assert.ok(attributes.some(([name]) => name === 'counter'));
    });
  }

  test('every fixture that gives readOnly, of any component, writes readonly', () => {
    const seen = [];
    for (const spec of drawn) {
      for (const each of spec.fixtures.filter((candidate) => candidate.props.readOnly === true)) {
        const { attributes } = tanreiElements(liveFixture(spec, each).html)[0];
        assert.ok(attributes.some(([name]) => name === 'readonly'), `${spec.name} / ${each.id}`);
        seen.push(spec.name);
      }
    }
    assert.deepEqual([...new Set(seen)].sort(), ['chip-field', 'combobox', 'combobox-field', 'embedded-text-input', 'file-item', 'number-field', 'number-input', 'one-time-code-input', 'select', 'select-field', 'text-field', 'text-input']);
  });

  test('a boolean that defaults to true and has an attribute for its opposite: false is that attribute, true is none', () => {
    const names = (name, id) => opened(name, id).attributes.map(([attribute, value]) => (value === undefined ? attribute : `${attribute}="${value}"`));
    assert.deepEqual(names('card', 'outlined-flush'), ['variant="outlined"', 'flush']);
    assert.ok(names('bottom-sheet', 'no-handle').includes('no-handle'));
    assert.deepEqual(names('carousel', 'fixed-width').filter((name) => /width|scroll|snap/.test(name)), ['fixed-width', 'free-scroll']);
    assert.ok(names('main-action-button', 'filled-collapsed').includes('collapsed'));
    assert.ok(names('chip', 'input-plain-remove').includes('no-destructive-remove'));
    assert.ok(!names('chip', 'input-destructive-remove').some((name) => name.includes('destructive')), 'true is the default: nothing is written');
  });

  test('a boolean that defaults to true and has no such attribute is turned off by name="false" alone', () => {
    const { attributes } = opened('divider', 'horizontal-separator');
    assert.deepEqual(attributes.filter(([name]) => name === 'decorative'), [['decorative', 'false']]);
  });
});

test('no drawn fixture asks the site for a file: a picture is the page\'s own bytes, and the one that must not exist is bytes no decoder reads', () => {
  for (const spec of drawn) {
    for (const each of drawnFixtures(spec)) {
      const { html } = liveFixture(spec, each);
      assert.doesNotMatch(html, /[\s-](?:src|image|icon-src|poster)="fixtures\//, `specs/${spec.name}.spec.json, fixture ${each.id}: a relative address is requested from the page's own folder`);
    }
  }
  assert.match(fixture('avatar', 'image-failed').html, /src="data:image\/png;base64,AAAA"/);
});
describe("the landing page's specimen (components/Hero.astro)", () => {
  const drawn = specimenFixtures(specs.button);
  const tag = specs.button.platforms.web.name;

  test('draws Buttons, and every attribute it writes is one the element reads', () => {
    assert.ok(drawn.length >= 6, 'the specimen shows at least the variants');
    for (const html of drawn) {
      const [element, ...children] = tanreiElements(html);
      assert.equal(element.tag, tag);
      assert.deepEqual(children, [], `a specimen Button holds no other element: ${html}`);
      for (const [name] of element.attributes) assert.ok(isGlobal(name) || declared.get(tag).has(name), `${tag} reads no attribute ${name}: ${html}`);
    }
  });

  test('an icon button has its icon: a fixture that names an icon slot is drawn with it', () => {
    const iconOnly = drawn.filter((html) => / label="/.test(html));
    assert.ok(iconOnly.length > 0, 'the specimen shows an icon button');
    for (const html of iconOnly) assert.match(html, /<span slot="icon">[a-z_]+<\/span>/, `an icon button without its icon is an empty circle: ${html}`);
    const named = specs.button.fixtures.filter((each) => each.slots?.icon).map((each) => liveFixture(specs.button, each).html);
    for (const html of drawn) if (named.includes(html)) assert.match(html, /slot="icon"/);
  });

  test('goes nowhere and holds no state: no link, no toggle, one size, one width, the page\'s direction', () => {
    for (const html of drawn) assert.doesNotMatch(html, / (href|target|toggle|selected|size|width|dir)(=|[ >])/, html);
  });
});

describe('a fixture that needs a step in script (the file upload that keeps its own files)', () => {
  const spec = specs['file-upload'];
  const staged = spec.fixtures.filter((each) => (each.props.rows ?? 'own') !== 'given' && (each.items ?? []).some((item) => item.kind === 'file'));

  test('the six own-* fixtures and tiles-own are the ones staged in script, and every fixture of the spec is drawn: the element is the one built from a File picker and File items', () => {
    assert.deepEqual(staged.map((each) => each.id), ['own-one', 'own-many', 'own-refused', 'own-disabled', 'own-without-words', 'own-rtl', 'tiles-own']);
    assert.deepEqual(spec.fixtures.filter((each) => !drawsFixture(spec, each)).map((each) => each.id), []);
    assert.equal(WAITING['file-upload'], undefined, 'no fixture of the file upload waits');
  });

  test('the file picker and the file item are drawn live, every fixture of each, at the file upload\'s column — a tile at its own box', () => {
    for (const name of ['file-picker', 'file-item']) {
      assert.ok(definedTags.has(specs[name].platforms.web.name), `the web package defines ${specs[name].platforms.web.name}`);
      assert.ok(drawsLive(specs[name]), name);
      for (const each of specs[name].fixtures) {
        assert.ok(drawsFixture(specs[name], each), `${name} / ${each.id}`);
        const [element] = tanreiElements(liveFixture(specs[name], each).html);
        const style = element.attributes.find(([attribute]) => attribute === 'style')?.[1] ?? '';
        assert.equal(/(^|; )inline-size: 22\.5rem/.test(style), each.props.form !== 'tile', `${name} / ${each.id}: ${style}`);
        assert.equal(element.attributes.find(([attribute]) => attribute === 'dir')?.[1], each.direction, `${name} / ${each.id}: its direction`);
      }
    }
    assert.equal(specs['file-picker'].fixtures.length, 14);
    assert.equal(specs['file-item'].fixtures.length, 46);
    assert.equal(spec.fixtures.length, 25);
  });

  test('a picture a file item is given is the page\'s own bytes, alone and as a row of a file upload', () => {
    const pictured = [...specs['file-item'].fixtures.filter((each) => each.props.previewSrc).map((each) => ['file-item', each]), ...spec.fixtures.filter((each) => (each.items ?? []).some((item) => item.props.previewSrc)).map((each) => ['file-upload', each])];
    assert.ok(pictured.some(([name]) => name === 'file-item') && pictured.some(([name]) => name === 'file-upload'));
    for (const [name, each] of pictured) {
      const { html } = liveFixture(specs[name], each);
      assert.match(html, / preview-src="data:image\/png;base64,/, `${name} / ${each.id}`);
      assert.doesNotMatch(html, /fixtures\//, `${name} / ${each.id}`);
    }
  });

  test('the Field\'s control that is a file picker or a file upload has its trigger: the product\'s own Button in the trigger slot', () => {
    for (const [id, tag] of [['file-picker-required-error', 'tanrei-file-picker'], ['file-upload-required-error', 'tanrei-file-upload']]) {
      const { html } = fixture('field', id);
      assert.deepEqual(tanreiElements(html).map((element) => element.tag), ['tanrei-field', tag, 'tanrei-button'], id);
      assert.match(html, new RegExp(`<${tag}[^>]*><tanrei-button slot="trigger" variant="outlined">Choose a file</tanrei-button></${tag}>`), id);
    }
  });

  test('such a fixture declares its files on the element and writes no row as a child: the element would not draw one (FUP-42)', () => {
    for (const each of staged) {
      const { html } = liveFixture(spec, each);
      const [element, ...children] = tanreiElements(html);
      assert.deepEqual(children.map((child) => child.tag), ['tanrei-button'], `${each.id}: only the trigger is a child`);
      const declaredFiles = element.attributes.find(([name]) => name === STAGED_FILES)?.[1];
      assert.ok(declaredFiles, `${each.id}: ${STAGED_FILES}`);
      const files = JSON.parse(declaredFiles.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
      assert.deepEqual(files, each.items.map((item) => ({ name: item.props.name, sizeText: item.props.sizeText ?? '' })), each.id);
      assert.ok(!specimenFixtures(spec).includes(html), `${each.id}: a specimen is markup alone`);
    }
  });

  test('a fixture whose rows are given writes them as children and declares no step', () => {
    for (const each of spec.fixtures.filter((candidate) => candidate.props.rows === 'given')) {
      const { html } = liveFixture(spec, each);
      assert.ok(!html.includes(STAGED_FILES), each.id);
      // A row is the element the spec's web mapping names for the item kind `file` (the File item).
      assert.equal(tanreiElements(html).filter((element) => element.tag === spec.platforms.web.items.file.name).length, each.items?.length ?? 0, each.id);
      assert.ok(tanreiElements(html)[0].attributes.some(([name, value]) => name === 'rows' && value === 'given'), each.id);
    }
  });
});

describe('a spec that takes its props from its members', () => {
  test('is read resolved by everything on the site: each forwarded prop, event and slot is the member\'s own entry — its type, default and description — under the composed component\'s name, with where it is from and the note kept', () => {
    const written = JSON.parse(fs.readFileSync(repo('specs/one-time-code-field.spec.json'), 'utf8'));
    const spec = specs['one-time-code-field'];
    assert.ok(written.props.every((prop) => prop.from && !('type' in prop)), 'as written, every prop is forwarded and has no type');
    for (const [list, lists] of [['props', written.props], ['events', written.events], ['slots', written.slots]]) {
      for (const entry of lists) {
        const [member, name] = [entry.from.slice(0, entry.from.indexOf('.')), entry.from.slice(entry.from.indexOf('.') + 1)];
        const theirs = specs[member][list].find((one) => one.name === name);
        const mine = spec[list].find((one) => one.name === entry.name);
        assert.ok(theirs?.description, `${entry.from} is written in its member's spec`);
        assert.equal(mine.description, theirs.description, `${list} ${entry.name}`);
        assert.equal(mine.from, entry.from);
        assert.equal(mine.note, entry.note);
        if (list === 'props') assert.deepEqual([mine.type, mine.default, mine.values], [theirs.type, theirs.default, theirs.values], `prop ${entry.name}`);
      }
    }
    // A spec that forwards nothing is the spec as it is written.
    assert.deepEqual(specs.field, JSON.parse(fs.readFileSync(repo('specs/field.spec.json'), 'utf8')));
  });

  test('its fixtures are drawn live from the resolved props: the composed element with its members\' attributes, as the web harness writes them', () => {
    const spec = specs['one-time-code-field'];
    assert.ok(definedTags.has('tanrei-one-time-code-field'), 'the web package defines the element');
    const html = liveFixture(spec, spec.fixtures.find((fixture) => fixture.id === 'error')).html;
    assert.match(html, /^<tanrei-one-time-code-field /);
    for (const attribute of ['label="Verification code"', 'error-text="That code is not right. Check the message and try again."', 'group-size="3"', 'value="123456"', ' error']) assert.ok(html.includes(attribute), `${attribute} in ${html}`);
  });

  test('a composed component whose value members are the product\'s own children (the checkbox group): every fixture is drawn, its checkboxes as the Checkbox\'s element among its children, and its value — a property, no attribute — as checked on each child the list holds', () => {
    const spec = specs['checkbox-group'];
    assert.ok(definedTags.has('tanrei-checkbox-group'), 'the web package defines the element');
    for (const fixture of spec.fixtures) {
      assert.ok(drawsFixture(spec, fixture), fixture.id);
      const elements = tanreiElements(liveFixture(spec, fixture).html);
      assert.equal(elements[0].tag, 'tanrei-checkbox-group', fixture.id);
      assert.ok(!elements[0].attributes.some(([name]) => name === 'value'), `${fixture.id}: no value attribute`);
      const boxes = elements.slice(1).filter((element) => element.tag === spec.platforms.web.items.checkbox.name);
      assert.equal(boxes.length, fixture.items.length, fixture.id);
      const checked = boxes.filter((box) => box.attributes.some(([name]) => name === 'checked')).map((box) => box.attributes.find(([name]) => name === 'value')[1]);
      assert.deepEqual(checked, fixture.items.map((item) => item.props.value).filter((value) => (fixture.props.value ?? []).includes(value)), fixture.id);
    }
  });

  test('a composed component whose twins hold members the product places (the radio group): every fixture is drawn with its radio buttons among its children, and its twin — the field group in its radio-group kind, around radio buttons of one name — at the same width, direction and language, the chosen one checked by hand', () => {
    const [spec, frame] = [specs['radio-group'], specs['field-group']];
    assert.ok(definedTags.has('tanrei-radio-group'), 'the web package defines the element');
    const staged = (element) => ['dir', 'lang', 'style'].map((name) => element.attributes.find(([attribute]) => attribute === name)?.[1]);
    for (const fixture of spec.fixtures) {
      const twin = frame.fixtures.find((candidate) => `field-group.${candidate.id}` === fixture.twin);
      assert.ok(twin, `${fixture.id}: ${fixture.twin}`);
      assert.ok(drawsFixture(spec, fixture) && drawsFixture(frame, twin), fixture.id);
      const [mine, theirs] = [tanreiElements(liveFixture(spec, fixture).html), tanreiElements(liveFixture(frame, twin).html)];
      assert.deepEqual([mine[0].tag, theirs[0].tag], ['tanrei-radio-group', 'tanrei-field-group'], fixture.id);
      assert.equal(theirs[0].attributes.find(([name]) => name === 'kind')?.[1], 'radio-group', fixture.id);
      assert.deepEqual(staged(theirs[0]), staged(mine[0]), `${fixture.id}: one picture — width, direction and language`);
      const radios = (elements) => elements.slice(1).filter((element) => element.tag === 'tanrei-radio-button');
      const said = (radio, name) => radio.attributes.find(([attribute]) => attribute === name)?.[1];
      assert.equal(radios(mine).length, fixture.items.length, fixture.id);
      assert.deepEqual(radios(theirs).map((radio) => [said(radio, 'value'), said(radio, 'label')]), radios(mine).map((radio) => [said(radio, 'value'), said(radio, 'label')]), fixture.id);
      // One level down the product writes the selection and the group by hand: `checked` on the one the value names, one name on all.
      assert.deepEqual(radios(theirs).filter((radio) => radio.attributes.some(([name]) => name === 'checked')).map((radio) => said(radio, 'value')), fixture.props.value ? [fixture.props.value] : [], fixture.id);
      assert.equal(new Set(radios(theirs).map((radio) => said(radio, 'name'))).size, 1, `${fixture.id}: one name`);
      assert.ok(radios(mine).every((radio) => !radio.attributes.some(([name]) => name === 'name' || name === 'checked')), `${fixture.id}: no name and no checked inside a radio group`);
    }
  });
});

describe('the slider field and the field\'s value text', () => {
  const spec = specs['slider-field'];
  const frame = specs.field;

  test('the build defines the element and reads the Field\'s value-text: every fixture of the slider field is drawn, and so is each twin among the Field\'s', () => {
    assert.ok(definedTags.has('tanrei-slider-field'), 'the web package defines the element');
    assert.ok(drawn.includes(spec), 'the slider field is drawn live');
    assert.equal(spec.fixtures.length, 23);
    assert.deepEqual(drawnFixtures(spec).map((each) => each.id), spec.fixtures.map((each) => each.id));
    const twins = spec.fixtures.map((each) => frame.fixtures.find((candidate) => `field.${candidate.id}` === each.twin));
    assert.ok(twins.every(Boolean), 'each twin is a fixture of the Field');
    for (const twin of twins) assert.ok(drawsFixture(frame, twin), `field.${twin.id} is drawn`);
    assert.equal(twins.filter((twin) => twin.props.valueText !== undefined).length, 21);
    assert.equal(frame.fixtures.filter((each) => each.props.valueText !== undefined && !drawsFixture(frame, each)).length, 0, 'no fixture that gives a value text waits');
  });

  test('a fixture is the composed element with its members\' attributes, at the width its twin is drawn at; the twin writes the Field\'s value-text and the Slider\'s own props', () => {
    const range = liveFixture(spec, spec.fixtures.find((fixture) => fixture.id === 'range-words')).html;
    assert.match(range, /^<tanrei-slider-field /);
    for (const attribute of ['label="Price"', ' range', 'start-value="100"', 'value="300"', 'start-value-text="$100"', 'value-text="$300"', 'start-label="Minimum price"', 'end-label="Maximum price"', 'inline-size: 17.5rem']) assert.ok(range.includes(attribute), `${attribute} in ${range}`);
    assert.ok(liveFixture(spec, spec.fixtures.find((fixture) => fixture.id === 'value-hidden')).html.includes(' value-hidden'));
    const twin = liveFixture(frame, frame.fixtures.find((fixture) => fixture.id === 'slider-range-words')).html;
    assert.match(twin, /^<tanrei-field [^>]*value-text="\$100 – \$300"/);
    assert.match(twin, /<tanrei-slider [^>]*start-value-text="\$100"[^>]*>/);
    assert.match(twin, /<tanrei-slider [^>]*label="Maximum price"[^>]*>/);
  });
});

describe('the text input, the text field and the field around a text input', () => {
  const input = specs['text-input'];
  const field = specs['text-field'];
  const frame = specs.field;
  const INPUT = 'tanrei-text-input';
  /** An element's attributes as written: a bare one is its name, another `name="value"`. */
  const written = (element) => element.attributes.map(([name, value]) => (value === undefined ? name : `${name}="${value}"`));
  /** The icons a fixture's `content` names, as the children the element is given. */
  const icons = (content) => (content ?? '').split(/\s+/).filter(Boolean).map((pair) => pair.split('=')).map(([slot, glyph]) => `<span slot="${slot}">${glyph}</span>`).join('');
  const around = frame.fixtures.filter((each) => (each.items ?? []).some((item) => item.kind === 'text-input'));
  // A Field around a text input is the twin of a text field fixture or of a chip field fixture (the
  // suite below): the twins meant here are the text field's.
  const chipTwins = new Set(specs['chip-field'].fixtures.map((each) => each.twin));
  const twins = around.filter((each) => !chipTwins.has(`field.${each.id}`));
  const twinOf = (each) => frame.fixtures.find((candidate) => `field.${candidate.id}` === each.twin);

  test('the build defines both elements, and the three specs are drawn live', () => {
    for (const spec of [input, field, frame]) {
      assert.ok(definedTags.has(spec.platforms.web.name), spec.platforms.web.name);
      assert.ok(drawn.includes(spec), `${spec.name} is drawn live`);
    }
    assert.equal(input.platforms.web.name, INPUT);
    assert.equal(frame.platforms.web.items['text-input'].name, INPUT);
  });

  test('every fixture of the three is drawn: the text input\'s 79, the text field\'s 97 and the field\'s 97 twins, one for each fixture of the text field', () => {
    assert.equal(input.fixtures.length, 79);
    // Ninety, the five with a help and an error text together, the small one and the optional word in an outlined field.
    assert.equal(field.fixtures.length, 97);
    assert.equal(twins.length, 97);
    assert.equal(around.length - twins.length, chipTwins.size, 'every other field around a text input is a twin of the chip field');
    assert.deepEqual(twins.map((each) => `field.${each.id}`), field.fixtures.map((each) => each.twin), 'the twins are the text field\'s, in its order');
    for (const [spec, fixtures] of [[input, input.fixtures], [field, field.fixtures], [frame, twins]]) {
      for (const each of fixtures) assert.ok(drawsFixture(spec, each), `${spec.name} / ${each.id}: the build reads everything it gives`);
    }
  });

  test('a fixture of the text input and of the text field is the one element, at a width, with its icons as children and nothing else inside', () => {
    for (const spec of [input, field]) {
      for (const each of spec.fixtures) {
        const { html } = liveFixture(spec, each);
        const tag = spec.platforms.web.name;
        const elements = tanreiElements(html);
        assert.deepEqual(elements.map((element) => element.tag), [tag], `${spec.name} / ${each.id}`);
        assert.ok(html.endsWith(`>${icons(each.content)}</${tag}>`), `${spec.name} / ${each.id}: ${html.slice(-120)}`);
        assert.match(elements[0].attributes.find(([name]) => name === 'style')?.[1] ?? '', /^inline-size: 17\.5rem; max-inline-size: 100%$/, `${spec.name} / ${each.id}: a block as wide as its place is given a place`);
        assert.equal(elements[0].attributes.find(([name]) => name === 'dir')?.[1], each.direction, `${spec.name} / ${each.id}`);
      }
    }
    assert.ok(input.fixtures.some((each) => each.content) && field.fixtures.some((each) => each.content), 'some fixtures name icons');
  });

  test('a twin is a field around one text input: the field\'s own props on the field, the input\'s on the input, its icons inside the input', () => {
    for (const each of twins) {
      const { html } = liveFixture(frame, each);
      const [outer, inner, ...rest] = tanreiElements(html);
      assert.deepEqual([outer.tag, inner?.tag, rest.length], ['tanrei-field', INPUT, 0], each.id);
      assert.equal(each.items.length, 1, each.id);
      assert.ok(html.endsWith(`>${icons(each.items[0].content)}</${INPUT}></tanrei-field>`), `${each.id}: ${html.slice(-140)}`);
      // Nothing of the frame is written on the input: the field names it, describes it and says its error.
      for (const [name] of inner.attributes) assert.ok(!['label', 'label-hidden', 'supporting-text', 'error-text', 'requirement', 'count-text', 'style', 'class'].includes(name), `${each.id}: ${name} on the input`);
    }
    assert.ok(twins.some((each) => each.items[0].content), 'some twins name icons');
  });

  test('the three spellings that are not the kebab-case of the prop, on the element and on a field\'s input alike: readonly, maxlength, no-wrap', () => {
    const cases = [
      ...input.fixtures.map((each) => [`text-input / ${each.id}`, each.props, tanreiElements(liveFixture(input, each).html)[0]]),
      ...field.fixtures.map((each) => [`text-field / ${each.id}`, each.props, tanreiElements(liveFixture(field, each).html)[0]]),
      ...twins.map((each) => [`field / ${each.id}`, each.items[0].props, tanreiElements(liveFixture(frame, each).html)[1]]),
    ];
    const seen = { readonly: 0, maxlength: 0, 'no-wrap': 0 };
    for (const [where, props, element] of cases) {
      const attributes = written(element);
      assert.equal(attributes.includes('readonly'), props.readOnly === true, `${where}: readonly`);
      assert.deepEqual(attributes.filter((attribute) => /^max-?length/i.test(attribute)), props.maxLength === undefined ? [] : [`maxlength="${props.maxLength}"`], `${where}: maxlength`);
      // `wrap: false` is the bare attribute `no-wrap`; `wrap: true` and no `wrap` write nothing — never `no-wrap="false"`, which a boolean attribute reads as true.
      assert.deepEqual(attributes.filter((attribute) => /wrap/.test(attribute)), props.wrap === false ? ['no-wrap'] : [], `${where}: no-wrap`);
      for (const name of Object.keys(seen)) if (element.attributes.some(([attribute]) => attribute === name)) seen[name] += 1;
    }
    for (const [name, count] of Object.entries(seen)) assert.ok(count >= 3, `${name} is written by fixtures of all three (${count})`);
  });

  test('a twin gives its field what the text field\'s fixture gives the text field, and its input the rest', () => {
    const OF_THE_FIELD = Object.keys(frame.platforms.web.props);
    for (const each of field.fixtures) {
      const twin = twinOf(each);
      assert.ok(twin, `${each.id}: ${each.twin}`);
      const [outer, inner] = tanreiElements(liveFixture(frame, twin).html);
      const whole = tanreiElements(liveFixture(field, each).html)[0];
      const own = (element) => written(element).filter((attribute) => !/^(style|class|dir|lang)(=|$)/.test(attribute));
      // The count is the one thing the pair says in two places: `counter` on the input, the text on the field.
      const together = [...own(outer).filter((attribute) => !attribute.startsWith('count-text=')), ...own(inner)];
      assert.deepEqual(together.sort(), own(whole).sort(), `${each.id}: the pair's attributes are the text field's`);
      assert.equal(outer.attributes.some(([name]) => name === 'count-text'), twin.props.countText !== undefined, each.id);
      for (const [name] of outer.attributes) assert.ok(isGlobal(name) || OF_THE_FIELD.some((prop) => webAttribute('tanrei-field', frame.platforms.web.props[prop])?.name === name), `${each.id}: ${name} on the field`);
      // One picture: the same width, direction and language.
      const staged = (element) => ['dir', 'lang'].map((name) => element.attributes.find(([attribute]) => attribute === name)?.[1]);
      assert.deepEqual(staged(outer), staged(whole), `${each.id}: direction and language`);
      assert.equal(outer.attributes.find(([name]) => name === 'style')?.[1], whole.attributes.find(([name]) => name === 'style')?.[1], `${each.id}: width`);
    }
  });
});

describe('the chip field and the field around a text input with entries', () => {
  const chipField = specs['chip-field'];
  const frame = specs.field;
  const twinOf = (each) => frame.fixtures.find((candidate) => `field.${candidate.id}` === each.twin);
  const attribute = (element, name) => element.attributes.find(([written]) => written === name);

  test('the build defines the element, and every fixture of the chip field and every twin of one is drawn', () => {
    assert.ok(definedTags.has('tanrei-chip-field'));
    assert.ok(drawn.includes(chipField), 'the chip field is drawn live');
    assert.equal(chipField.fixtures.length, 27);
    for (const each of chipField.fixtures) {
      assert.ok(drawsFixture(chipField, each), `chip-field / ${each.id}: the build reads everything it gives`);
      assert.ok(twinOf(each), `${each.id}: ${each.twin}`);
      assert.ok(drawsFixture(frame, twinOf(each)), `field / ${twinOf(each).id}: the build reads everything it gives`);
    }
  });

  test('a fixture of the chip field is the one element, at a width: its list and its separators as JSON arrays, readonly and input-value as the manifest spells them', () => {
    for (const each of chipField.fixtures) {
      const elements = tanreiElements(liveFixture(chipField, each).html);
      assert.deepEqual(elements.map((element) => element.tag), ['tanrei-chip-field'], each.id);
      const [element] = elements;
      const unescape = (text) => text.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
      for (const name of ['value', 'separators']) {
        const written = attribute(element, name)?.[1];
        assert.deepEqual(written === undefined ? undefined : JSON.parse(unescape(written)), each.props[name], `${each.id}: ${name}`);
      }
      assert.equal(Boolean(attribute(element, 'readonly')), each.props.readOnly === true, `${each.id}: readonly`);
      assert.equal(attribute(element, 'input-value')?.[1], each.props.inputValue, `${each.id}: input-value`);
      assert.match(attribute(element, 'style')?.[1] ?? '', /^inline-size: 17\.5rem; max-inline-size: 100%$/, `${each.id}: a block as wide as its place is given a place`);
      assert.equal(attribute(element, 'dir')?.[1], each.direction, each.id);
    }
  });

  test('a twin is a field around one text input that holds a small input chip for each entry in its entries slot — named by the entry, its remove action by the sentence with the entry in it, not removable in a read-only input and disabled in a disabled field — and neither of the two fixture props is written on the input', () => {
    let chips = 0;
    for (const each of chipField.fixtures) {
      const twin = twinOf(each);
      const [outer, inner, ...entries] = tanreiElements(liveFixture(frame, twin).html);
      assert.deepEqual([outer.tag, inner.tag], ['tanrei-field', 'tanrei-text-input'], twin.id);
      assert.deepEqual(entries.map((entry) => entry.tag), (each.props.value ?? []).map(() => 'tanrei-chip'), `${twin.id}: one chip for each entry of the chip field's value`);
      for (const [index, entry] of entries.entries()) {
        const text = each.props.value[index];
        assert.deepEqual(
          ['slot', 'kind', 'size', 'label', 'remove-label'].map((name) => attribute(entry, name)?.[1]),
          ['entries', 'input', 'small', text, each.props.removeLabel.replaceAll('{entry}', text)],
          `${twin.id}: ${text}`,
        );
        assert.equal(Boolean(attribute(entry, 'not-removable')), each.props.readOnly === true, `${twin.id}: not-removable`);
        assert.equal(Boolean(attribute(entry, 'disabled')), each.props.disabled === true, `${twin.id}: disabled`);
        chips += 1;
      }
      for (const [name] of inner.attributes) assert.ok(!['entries', 'entry-remove-label'].includes(name), `${twin.id}: ${name} on the input`);
      // The twin's typed text is the chip field's inputValue, and the two are drawn in one language.
      assert.equal(attribute(inner, 'value')?.[1], each.props.inputValue, `${twin.id}: the typed text`);
      assert.equal(attribute(outer, 'lang')?.[1], attribute(tanreiElements(liveFixture(chipField, each).html)[0], 'lang')?.[1], `${twin.id}: the language`);
    }
    assert.ok(chips > 60, `${chips} chips were written`);
  });
});
