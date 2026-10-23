// The docs' figures drawn from the repository: what `src/lib/visuals/` makes of the specs and the tokens — the parts an
// anatomy figure numbers and its text alternative, the lengths a measure figure draws, the motions a demo plays, the
// color roles a role map draws, the grid of a state matrix and the controls of a playground — each compared with the
// repository read from disk; the figures' words in the six languages; and the frame and its system switch, read from
// their sources.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { anatomyOf, anatomyAlt } = await import('../src/lib/visuals/anatomy.ts');
const { measuresOf } = await import('../src/lib/visuals/measure.ts');
const { motionsOf } = await import('../src/lib/visuals/motion.ts');
const { rolesOf } = await import('../src/lib/visuals/roles.ts');
const { drawnMatrixOf, drawsStateMatrix, matrixOf, PSEUDO_STATES } = await import('../src/lib/visuals/states.ts');
const { holdSelector, holdSelectorList, wordsOf } = await import('../src/lib/visuals/pseudo-states.ts');
const { fixtureDocument } = await import('../src/lib/fixture-documents.ts');
const { CODE_FLAVORS, controlsAndGaps, controlsOf, NATIVE_CODE, playgroundOf, SIDE_BY_SIDE } = await import('../src/lib/visuals/playground.ts');
const { attributeOf, fromAttribute, hashEntries, hashKey, hashOf, isDefault, propertyOf, stateFromHash, writeHash } = await import('../src/lib/visuals/playground-state.ts');
const { strings } = await import('../src/lib/i18n.ts');
const { specs } = await import('../src/lib/repo.ts');
const { shippedSystems } = await import('../src/lib/tokens.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const read = (file) => fs.readFileSync(here(`../${file}`), 'utf8');
const json = (file) => JSON.parse(fs.readFileSync(here(`../../../${file}`), 'utf8'));
const config = json('tanrei.config.json');
const NS = config.namespace;
const light = json(`design/tokens/${NS}.light.tokens.json`);
/** A resolved token of the default system's light context, read from disk. */
const resolved = (dotted) => dotted.split('.').reduce((node, key) => node?.[key], light);
const languages = [source, ...translations].map(({ lang }) => lang);
/** The names of every spec the docs read, the default system's and a layer's. */
const names = Object.keys(specs).sort();
/** A component that lives in a layer has its resolved tokens in that layer's system only. */
const inDefault = (name) => !specs[name].layer;

describe('the figures’ words', () => {
  const keys = (lang) => Object.keys(strings(lang).visuals).sort();
  test('every language has the same words, none empty', () => {
    for (const lang of languages) {
      assert.deepEqual(keys(lang), keys('en'), `${lang}: the figures’ words are the English ones`);
      for (const [key, value] of Object.entries(strings(lang).visuals)) {
        for (const text of typeof value === 'string' ? [value] : Object.values(value)) assert.ok(text.trim(), `${lang}: visuals.${key}`);
      }
    }
  });
  test('the text of an anatomy figure has a sentence for every plural form a count of parts takes, each with the component and its parts', () => {
    for (const lang of languages) {
      const forms = strings(lang).visuals.anatomyAlt;
      assert.ok(forms.other, `${lang}: anatomyAlt.other`);
      const rules = new Intl.PluralRules(lang);
      for (let count = 1; count <= 40; count++) {
        const form = rules.select(count);
        assert.ok(form in forms || form === 'other', `${lang}: no sentence for ${count} parts (${form}), and none may be read from another form`);
      }
      for (const [form, text] of Object.entries(forms)) {
        assert.match(text, /\{component\}/, `${lang}: anatomyAlt.${form} names the component`);
        assert.match(text, /\{list\}/, `${lang}: anatomyAlt.${form} lists the parts`);
      }
    }
  });
});

describe('anatomy', () => {
  test('a part’s number is its place in the spec', () => {
    for (const name of names) {
      assert.deepEqual(
        anatomyOf(name).map(({ n, id, optional }) => [n, id, optional]),
        specs[name].anatomy.map((part, index) => [index + 1, part.id, part.optional ?? false]),
        name,
      );
    }
  });
  test('the text alternative is never empty: in every language, for every spec, it names the component and every part', () => {
    for (const lang of languages) {
      const forms = strings(lang).visuals.anatomyAlt;
      for (const name of names) {
        const text = anatomyAlt(name, forms, lang);
        assert.ok(text.trim(), `${lang}: ${name}`);
        assert.ok(text.includes(specs[name].title), `${lang}: ${name} names its title`);
        for (const part of specs[name].anatomy) assert.ok(text.includes(part.id), `${lang}: ${name} names ${part.id}`);
        assert.doesNotMatch(text, /\{\w+\}/, `${lang}: ${name}: every place is filled`);
      }
    }
    assert.equal(anatomyAlt('button', strings('en').visuals.anatomyAlt, 'en'), 'Button: 5 parts — container, label, icon, outline, and focus-ring.');
  });
});

describe('measurements', () => {
  test('every length is a dimension token of the component, at its resolved value in pixels', () => {
    for (const name of names.filter(inDefault)) {
      for (const measure of measuresOf(name)) {
        const token = resolved(measure.token);
        assert.equal(token?.$type, 'dimension', `${name}: ${measure.token}`);
        assert.deepEqual({ value: measure.px, unit: 'px' }, token.$value, `${name}: ${measure.token}`);
        assert.equal(measure.cssVar, `${config.web.cssPrefix}-${measure.token.split('.').slice(1).join('-')}`);
        if (measure.part) assert.ok(specs[name].anatomy.some((part) => part.id === measure.part), `${name}: ${measure.token} names the part ${measure.part}`);
      }
    }
  });
  test('the button at the medium size: its container’s height, and no length of another size', () => {
    const medium = measuresOf('button', { size: 'medium' });
    const height = medium.find((measure) => measure.part === 'container' && measure.kind === 'height');
    assert.deepEqual(height, { token: `${NS}.comp.button.container.height.medium`, cssVar: `${config.web.cssPrefix}-comp-button-container-height-medium`, part: 'container', kind: 'height', size: 'medium', variant: null, px: resolved(`${NS}.comp.button.container.height.medium`).$value.value });
    assert.ok(medium.every((measure) => measure.size === null || measure.size === 'medium'));
    assert.ok(medium.some((measure) => measure.size === null), 'a length the same at every size is kept');
    assert.ok(medium.some((measure) => measure.kind === 'padding-inline-start' && measure.part === 'container'));
  });
  test('a component that reads a shared set measures it too', () => {
    assert.ok(measuresOf('text-input').some((measure) => measure.token.startsWith(`${NS}.comp.input-box.`)), 'the text input reads the input box’s lengths');
  });
});

describe('motion', () => {
  test('every duration of a component’s motion is one motion, at its resolved milliseconds, with the easing of its name', () => {
    for (const name of names.filter(inDefault)) {
      const group = resolved(`${NS}.${specs[name].tokens}.motion`) ?? {};
      const durations = Object.keys(group).filter((key) => group[key].$type === 'duration' && /-(duration|delay)$/.test(key));
      const motions = motionsOf(name).filter((motion) => motion.duration.startsWith(`${NS}.${specs[name].tokens}.motion.`));
      assert.deepEqual(motions.map((motion) => motion.duration.split('.').at(-1)).sort(), durations.sort(), name);
      for (const motion of motions) {
        const key = motion.duration.split('.').at(-1);
        assert.deepEqual({ value: motion.ms, unit: 'ms' }, group[key].$value, `${name}: ${key}`);
        const easing = group[`${motion.id}-easing`];
        assert.deepEqual(motion.bezier, easing ? easing.$value : null, `${name}: ${motion.id}`);
      }
    }
  });
  test('the menu opens and closes on curves of its own, and waits before a submenu', () => {
    const motions = Object.fromEntries(motionsOf('menu').map((motion) => [motion.id, motion]));
    assert.equal(motions.open.easing, `${NS}.comp.menu.motion.open-easing`);
    assert.equal(motions.close.easing, `${NS}.comp.menu.motion.close-easing`);
    assert.equal(motions.submenu.delay, true);
    assert.equal(motions.submenu.easing, null);
    assert.equal(motions.state.ms, resolved(`${NS}.comp.menu.motion.state-duration`).$value.value);
  });
});

describe('color roles', () => {
  test('the filled button’s container is the system’s primary role, resolved by every shipped system', () => {
    const role = rolesOf('button', ['filled']).find((entry) => entry.token === `${NS}.comp.button.filled.container.color`);
    assert.equal(role.part, 'container');
    assert.deepEqual(role.chain, [`${NS}.sys.color.primary`]);
    assert.equal(role.role, `${NS}.sys.color.primary`);
    assert.deepEqual(Object.keys(role.values), shippedSystems.map((system) => system.id));
    assert.equal(role.values[NS], resolved(`${NS}.comp.button.filled.container.color`).$value.hex);
  });
  test('an alias of another component token is followed to the role', () => {
    const icon = rolesOf('button', ['filled']).find((entry) => entry.token === `${NS}.comp.button.filled.icon.color`);
    assert.deepEqual(icon.chain, [`${NS}.comp.button.filled.label.color`, `${NS}.sys.color.on-primary`]);
    assert.equal(icon.role, `${NS}.sys.color.on-primary`);
  });
  test('every color token of every component is one entry, and a chain ends where no alias goes on', () => {
    for (const name of names.filter(inDefault)) {
      for (const role of rolesOf(name)) {
        assert.equal(resolved(role.token)?.$type, 'color', `${name}: ${role.token}`);
        assert.equal(new Set(role.chain).size, role.chain.length, `${name}: ${role.token} has no loop`);
      }
    }
  });
});

describe('the state matrix', () => {
  test('the button: a row for each variant, the rest and the browser’s states as columns, disabled by its prop, each row selected and not', () => {
    const matrix = matrixOf('button');
    assert.deepEqual(matrix.rows, { prop: 'variant', values: specs.button.props.find((prop) => prop.name === 'variant').values });
    assert.deepEqual(matrix.columns, [
      { state: 'enabled', by: 'rest' },
      { state: 'disabled', by: 'prop', prop: 'disabled' },
      { state: 'hovered', by: 'pseudo' },
      { state: 'focused', by: 'pseudo' },
      { state: 'pressed', by: 'pseudo' },
    ]);
    assert.equal(matrix.twice, 'selected');
    assert.deepEqual(matrix.notShown, ['loading']);
  });
  test('every state of every spec is a column, the doubled rows or said not to be shown — once', () => {
    for (const name of names) {
      const matrix = matrixOf(name);
      const shown = [...matrix.columns.map((column) => column.state), ...(matrix.twice ? ['selected'] : []), ...matrix.notShown];
      assert.deepEqual(shown.sort(), [...specs[name].states].sort(), name);
      for (const column of matrix.columns) {
        if (column.by === 'pseudo') assert.ok(PSEUDO_STATES.includes(column.state));
        if (column.by === 'prop') assert.ok(specs[name].props.some((prop) => prop.name === column.prop && prop.type === 'boolean'), `${name}: ${column.prop}`);
      }
      if (matrix.rows) assert.ok(specs[name].props.some((prop) => prop.name === matrix.rows.prop && prop.type === 'enum'), name);
    }
  });
  test('rows by another choice, and a choice the spec does not have is refused', () => {
    assert.equal(matrixOf('button', 'size').rows.prop, 'size');
    assert.throws(() => matrixOf('button', 'no-such-choice'), /no choice named "no-such-choice"/);
  });
  test('the button drawn: each variant at rest and selected, every cell the first fixture’s element with the row’s and the column’s props, in the room of its baseline', () => {
    const matrix = drawnMatrixOf('button');
    const variants = specs.button.props.find((prop) => prop.name === 'variant').values;
    assert.deepEqual(
      matrix.drawn.map((row) => [row.value, row.also]),
      variants.flatMap((variant) => [
        [variant, []],
        [variant, ['toggle', 'selected']],
      ]),
    );
    const content = specs.button.fixtures[0].content;
    for (const row of matrix.drawn) {
      assert.deepEqual(
        row.cells.map((cell) => [cell.state, cell.held]),
        matrix.columns.map((column) => [column.state, column.by === 'pseudo' ? column.state : null]),
      );
      for (const cell of row.cells) {
        const open = /^<tanrei-button([^>]*)>(.*)<\/tanrei-button>$/.exec(cell.html);
        assert.ok(open, cell.html);
        assert.equal(open[2], content);
        const attributes = open[1].trim().split(/\s+/).sort();
        const wanted = [`variant="${row.value}"`, ...row.also, ...(cell.state === 'disabled' ? ['disabled'] : [])].sort();
        assert.deepEqual(attributes, wanted, cell.html);
        assert.ok(cell.room && cell.room.width > 0 && cell.room.height > 0, `${row.value}: the room of its baseline`);
      }
    }
  });
  test('every component whose first fixture’s document holds its web element draws its matrix, each cell holding that element; the others are refused', () => {
    const drawable = names.filter((name) => drawsStateMatrix(name));
    assert.ok(drawable.includes('button'));
    for (const name of drawable) {
      const matrix = drawnMatrixOf(name);
      assert.equal(matrix.tag, specs[name].platforms.web.name, name);
      assert.ok(matrix.drawn.length > 0, name);
      for (const row of matrix.drawn) {
        assert.equal(row.cells.length, matrix.columns.length, name);
        for (const cell of row.cells) assert.ok(cell.html.includes(`<${matrix.tag}`), `${name}: ${cell.html.slice(0, 60)}`);
      }
    }
    for (const name of names.filter((each) => fixtureDocument(each) && !drawsStateMatrix(each))) assert.throws(() => drawnMatrixOf(name), /holds no .* element/, name);
  });
  test('every state a column of any spec shows has a name in every language', () => {
    const shown = new Set(names.flatMap((name) => matrixOf(name).columns.map((column) => column.state)));
    for (const lang of languages) for (const state of shown) assert.ok(strings(lang).visuals.stateNames[state]?.trim(), `${lang}: visuals.stateNames.${state}`);
    for (const lang of languages) assert.match(strings(lang).visuals.statesNotShown, /\{states\}/, `${lang}: statesNotShown names the states`);
  });
});

describe('holding a state', () => {
  test('a condition is taken out of the selector and required of the host, at the same specificity', () => {
    const cases = [
      // At the top level: the host is required in `:where()`, and `:host` weighs what the condition did.
      ['button:hover:where(:not(.busy))', ':host(:where([data-docs-state~="hovered"])) button:where(:not(.busy))'],
      ['button:focus-visible::after', ':host(:where([data-docs-state~="focused"])) button::after'],
      // In the host's own argument, or after a host that says something of itself: required there, one attribute for one.
      [':host([variant="filled"]) button:hover', ':host([variant="filled"][data-docs-state~="hovered"]) button'],
      [':host(:hover)', ':host([data-docs-state~="hovered"])'],
      [':host(:focus-within) .ring', ':host([data-docs-state~="focused"]) .ring'],
      [':host .x:focus-visible', ':host([data-docs-state~="focused"]) .x'],
      // A press: each feedback a state of its own, and "any feedback" weighing the two attributes it is written with.
      ['button[data-pressed="overlay"]', ':host(:where([data-docs-state~="pressed-overlay"])) button'],
      [":host(:not([variant])) button[data-pressed]:not([data-pressed='none'])", ':host(:not([variant])[data-docs-state~="pressed"][data-docs-state]) button'],
      // A condition that was a compound of its own leaves the universal selector.
      ['.list :hover', ':host(:where([data-docs-state~="hovered"])) .list *'],
    ];
    for (const [selector, held] of cases) assert.equal(holdSelector(selector), held, selector);
  });
  test('a list keeps the selectors that name a condition; one inside :not() or :has(), or none at all, is not held', () => {
    assert.equal(holdSelectorList('button[data-pressed="ripple"], button[data-pressed="dim"]'), ':host(:where([data-docs-state~="pressed-ripple"])) button, :host(:where([data-docs-state~="pressed-dim"])) button');
    assert.equal(holdSelectorList(':host(:focus-within) .ring, .a'), ':host([data-docs-state~="focused"]) .ring');
    assert.equal(holdSelectorList('button:not(:hover)'), null);
    assert.equal(holdSelectorList('.cell:has(> .container[data-pressed="overlay"]) .label'), null);
    assert.equal(holdSelectorList(':host([disabled]) button'), null);
  });
  test('a press is drawn as the system answers one: a ripple as the overlay it ends as, nothing for none', () => {
    assert.deepEqual(wordsOf('pressed', 'overlay'), ['pressed', 'pressed-overlay']);
    assert.deepEqual(wordsOf('pressed', 'ripple'), ['pressed', 'pressed-overlay']);
    assert.deepEqual(wordsOf('pressed', 'dim'), ['pressed', 'pressed-dim']);
    assert.deepEqual(wordsOf('pressed', 'none'), []);
    assert.deepEqual(wordsOf('hovered', 'none'), ['hovered']);
    assert.deepEqual(wordsOf('', 'overlay'), []);
  });
});

describe('the playground', () => {
  /** The web build's manifest, read from disk: each element's attributes by name. */
  const manifest = json('packages/web/custom-elements.json');
  const declared = new Map(manifest.modules.flatMap((module) => (module.declarations ?? []).filter((each) => each.tagName).map((each) => [each.tagName, new Map((each.attributes ?? []).map((attribute) => [attribute.name, attribute]))])));
  const lacking = json('docs/status/status.json').unavailable?.[NS]?.variants ?? {};
  const SETTABLE = ['enum', 'boolean', 'number', 'string'];

  test('a control for each prop a reader can set on the web element, of the kind its type and its number of values ask for', () => {
    let counted = 0;
    for (const name of names) {
      const { controls, unwritable } = controlsAndGaps(name);
      const settable = specs[name].props.filter((prop) => SETTABLE.includes(prop.type)).map((prop) => prop.name);
      const order = (list) => list.sort((a, b) => settable.indexOf(a) - settable.indexOf(b));
      assert.deepEqual(order([...controls.map((control) => control.prop), ...unwritable.map((gap) => gap.prop)]), settable, `${name}: every settable prop has a control or a reason for none`);
      for (const control of controls) {
        const prop = specs[name].props.find((entry) => entry.name === control.prop);
        const values = prop.type === 'enum' ? prop.values.filter((value) => prop.name !== 'variant' || !(lacking[name] ?? []).includes(value)) : [];
        const expected = { enum: values.length <= SIDE_BY_SIDE ? 'segmented' : 'select', boolean: 'switch', number: 'number', string: 'text' }[prop.type];
        assert.equal(control.kind, expected, `${name}.${control.prop}`);
        assert.deepEqual(control.values, values, `${name}.${control.prop}`);
        assert.equal(control.default, prop.default, `${name}.${control.prop}`);
        counted++;
      }
    }
    assert.ok(counted > 1000, `${counted} controls in all: fewer than the specs' settable props`);
    const button = controlsOf('button');
    assert.equal(button.find((control) => control.prop === 'variant').kind, 'select', 'five variants open as a list');
    assert.equal(button.find((control) => control.prop === 'size').kind, 'segmented', 'three sizes stand side by side');
  });

  test('every control writes only an attribute the web element reads, the attribute of the property it sets', () => {
    for (const name of names) {
      const tag = specs[name].platforms.web?.name;
      const { controls, unwritable } = controlsAndGaps(name);
      for (const control of controls) {
        const attribute = declared.get(tag)?.get(control.attribute);
        assert.ok(attribute, `${name}.${control.prop}: ${tag} reads no attribute "${control.attribute}" (custom-elements.json)`);
        assert.equal(attribute.fieldName, control.property, `${name}.${control.prop}: "${control.attribute}" is the attribute of ${attribute.fieldName}, not of ${control.property}`);
        if (control.kind === 'switch') assert.equal(attribute.type?.text?.replace(/ \| null$/, ''), 'boolean', `${name}.${control.prop}: a switch writes a boolean attribute`);
        // A switch that is on where nothing is written must have an attribute that turns it off.
        if (control.kind === 'switch' && control.default === true) assert.ok(control.inverse || control.negated, `${name}.${control.prop}: on by default, and nothing turns it off`);
      }
      for (const gap of unwritable) {
        const prop = specs[name].props.find((entry) => entry.name === gap.prop);
        if (gap.reason === 'cannot-turn-off') assert.ok(prop.type === 'boolean' && prop.default === true, `${name}.${gap.prop}`);
        else {
          const property = specs[name].platforms.web?.props?.[gap.prop] ?? gap.prop;
          assert.ok(![...(declared.get(tag)?.values() ?? [])].some((attribute) => attribute.fieldName === property), `${name}.${gap.prop}: ${tag} has an attribute for it`);
        }
      }
    }
  });

  test('a value is written as a product writes it, and read back as the same value', () => {
    for (const name of names) {
      for (const control of controlsOf(name)) {
        const label = `${name}.${control.prop}`;
        assert.equal(isDefault(control, control.default), true, label);
        if (control.kind !== 'switch') assert.equal(attributeOf(control, control.default), null, `${label}: the default is not written`);
        const other =
          control.kind === 'switch' ? !control.default : control.kind === 'number' ? (Number(control.default) || 0) + 3 : control.kind === 'text' ? 'Any words & "quotes"' : control.values.find((value) => value !== control.default);
        if (other === undefined) continue;
        const written = attributeOf(control, other);
        assert.notEqual(written === null, attributeOf(control, control.default) === null, `${label}: a value other than the default is written differently`);
        assert.deepEqual(fromAttribute(control, written), other, `${label}: read back`);
        assert.deepEqual(fromAttribute(control, attributeOf(control, control.default)), control.kind === 'switch' ? Boolean(control.default) : control.default, `${label}: the default read back`);
      }
    }
    const field = controlsOf('text-field').find((control) => control.prop === 'wrap');
    assert.deepEqual([field.attribute, field.property, field.negated, attributeOf(field, false), attributeOf(field, true), propertyOf(field, false)], ['no-wrap', 'noWrap', true, '', null, true], 'the spec’s wrap is the element’s no-wrap');
    const inset = names.flatMap((name) => controlsOf(name)).find((control) => control.inverse);
    assert.ok(inset, 'some switch is turned off by its attribute');
    assert.deepEqual([attributeOf(inset, false), attributeOf(inset, true), propertyOf(inset, false)], ['', null, false]);
  });

  test('the address keeps what differs from the start, and gives back only what the controls would hold', () => {
    for (const name of ['button', 'text-field', 'slider', 'tabs']) {
      const { controls, start } = playgroundOf(name);
      const changed = { ...start };
      for (const control of controls.slice(0, 6)) {
        changed[control.prop] = control.kind === 'switch' ? !start[control.prop] : control.kind === 'number' ? 7 : control.kind === 'text' ? 'a, b: c & d' : control.values.at(-1);
      }
      const written = hashOf(controls, changed, start);
      assert.deepEqual(stateFromHash(controls, written, start), changed, `${name}: ${written}`);
      assert.equal(hashOf(controls, start, start), '', `${name}: nothing differs, nothing is written`);
    }
    const controls = controlsOf('button');
    const start = playgroundOf('button').start;
    assert.deepEqual(stateFromHash(controls, 'variant:tonal,size:huge,busy:yes,unknown:1,disabled:true', start), { ...start, variant: 'tonal', disabled: true }, 'a value no control offers is read as nothing');
    const entries = hashEntries('#play-button=variant:tonal&props&play-tabs=size:small');
    assert.deepEqual([...entries], [['button', 'variant:tonal'], ['tabs', 'size:small']]);
    assert.equal(writeHash(new Map([['button', 'variant:tonal'], ['tabs', '']])), '#play-button=variant:tonal');
    assert.equal(writeHash(new Map([['button', '']])), '');
    assert.equal(hashKey('button'), 'play-button');
  });

  test('a playground starts at the web package’s own stage of the spec’s first fixture, its controls’ attributes as the playground writes them', () => {
    for (const name of ['button', 'text-field', 'slider', 'tabs']) {
      const playground = playgroundOf(name);
      const document = fixtureDocument(name);
      const first = specs[name].fixtures[0];
      assert.equal(playground.fixture, first.id, name);
      assert.ok(document.stages.some((stage) => stage.id === first.id && stage.html.startsWith(playground.stage.slice(0, playground.stage.indexOf('>') + 1))), `${name}: the document's stage`);
      assert.ok(playground.stage.includes(playground.markup), `${name}: the markup is what the stage holds`);
      assert.ok(playground.markup.startsWith(`<${playground.tag}`), name);
      for (const control of playground.controls) {
        const written = attributeOf(control, playground.start[control.prop]);
        const open = playground.markup.slice(0, playground.markup.indexOf('>'));
        const found = new RegExp(`\\s${control.attribute}(?:="([^"]*)")?(?=[\\s>]|$)`).exec(open);
        assert.equal(found ? (found[1] ?? '') : null, written === null ? null : written, `${name}.${control.prop}`);
      }
      // Each fixture's own props are where it starts.
      for (const [prop, value] of Object.entries(first.props)) if (prop in playground.start) assert.equal(playground.start[prop], value, `${name}.${prop}`);
      assert.ok(playground.room && playground.room.height >= document.sizes[first.id].height, `${name}: holds at least its baseline's room`);
    }
    assert.throws(() => playgroundOf('dialog'), /not drawn in the page/, 'a presented fixture is drawn in a window, not in a playground');
  });

  test('the code is the web’s until a native platform ships the component at the current spec, and then that platform needs its generator', () => {
    assert.deepEqual([...CODE_FLAVORS], ['html', 'react']);
    const pages = fs.readdirSync(here('../src/content/docs/components')).filter((file) => file.endsWith('.mdx'));
    const placed = pages.flatMap((file) => [...read(`src/content/docs/components/${file}`).matchAll(/<Playground name="([\w-]+)"/g)].map(([, name]) => name));
    assert.ok(placed.length >= 4, `${placed.length} playgrounds on the pages`);
    const status = json('docs/status/status.json').components;
    for (const name of placed) {
      const shipped = Object.entries(status.find((each) => each.name === name).platforms).filter(([platform, state]) => platform !== 'web' && !['planned', 'lagging', 'deprecated'].includes(state));
      assert.deepEqual(playgroundOf(name).native, shipped.map(([platform]) => platform), name);
      for (const [platform] of shipped) assert.ok(platform in NATIVE_CODE, `${name} ships on ${platform}: the playground needs a generator of its code`);
    }
  });

  test('every language’s page of a component places the same playgrounds', () => {
    const placedIn = (base) => {
      const dir = here(`../src/content/docs/${base}components`);
      return Object.fromEntries(fs.readdirSync(dir).filter((file) => file.endsWith('.mdx')).map((file) => [file, [...fs.readFileSync(`${dir}/${file}`, 'utf8').matchAll(/<Playground name="([\w-]+)"/g)].map(([, name]) => name)]));
    };
    const english = placedIn('');
    for (const { lang, dir } of translations) {
      const translated = placedIn(`${dir}/`);
      for (const [file, names] of Object.entries(english)) if (names.length && file in translated) assert.deepEqual(translated[file], names, `${lang}: ${file}`);
    }
  });
});

describe('the one frame', () => {
  /** What an `.astro` file draws: its template, without the front matter, the scripts, the styles and the comments. */
  const template = (text) =>
    text
      .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
      .replace(/<script\b[\s\S]*?<\/script>/g, '')
      .replace(/<style\b[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  const frame = read('src/components/visuals/Example.astro');
  const script = read('src/lib/example.ts');

  test('every live thing the docs draw stands in it: a page’s example, a stage of the gallery, a figure', () => {
    const sources = fs.readdirSync(fileURLToPath(new URL('../src/', import.meta.url)), { recursive: true }).map((file) => String(file).replaceAll('\\', '/'));
    assert.ok(!sources.some((file) => /(^|\/)(DemoFrame|VisualFrame|SystemSwitch|ContrastSwitch)\.astro$/.test(file)), 'one frame, and no switch of its own');
    assert.match(read('src/components/fixtures/FixtureGallery.astro'), /<Example\b/);
    assert.match(read('src/components/visuals/StateMatrix.astro'), /<Example label=\{t\.visuals\.statesTitle\} reserve=/);
  });
  test('it is Tanrei’s Figure in its native parts, named by its title before any script runs, its stage left out of the search', () => {
    const text = template(frame);
    assert.match(text, /<tanrei-figure class:list=\{\['docs-example not-content', className\]\}[^>]*\bdata-tanrei-demo data-example\b[^>]*>\s*<figure aria-labelledby=\{`\$\{id\}-title`\}/);
    assert.match(text, /<div data-part="frame">\s*<header>\s*<p data-part="title" id=\{`\$\{id\}-title`\}/);
    assert.match(text, /<div\s+data-part="stage"[^>]*\bdata-example-stage\s+data-example-pending\s+data-pagefind-ignore\b/);
    assert.match(text, /<div class="docs-example-overlay" aria-hidden="true" data-example-overlay \/>/);
    assert.match(text, /<div data-part="attachment" id=\{`\$\{id\}-legend`\}>/);
  });
  test('a figure holds its room in tokens, in one row that does not wrap, and lays its overlay over it without taking room', () => {
    const css = frame.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.match(css, /\.docs-example-canvas \{[^}]*min-block-size: var\(--docs-example-block\);[^}]*\}/);
    assert.match(css, /\.docs-example-canvas \{[^}]*flex-wrap: nowrap;[^}]*\}/);
    assert.match(css, /\.docs-example-overlay \{[^}]*position: absolute;[^}]*inset: 0;[^}]*\}/);
    assert.doesNotMatch(css, /content-visibility/, 'a stage is laid out: an element that measures its place once keeps what it chose');
  });
  test('it follows the design system the reader chose for the page, unless a page pins it to a preset', () => {
    // No switch of its own: the root's attribute, which the header's menu writes (lib/listing.mjs), and every change of it.
    assert.doesNotMatch(template(frame), /<tanrei-tabs\b(?![^>]*data-example-flavors)/);
    assert.match(script, /import \{ SYSTEM_ATTR \} from '\.\/listing\.mjs';/);
    assert.match(script, /observe\(document\.documentElement, \{ attributes: true, attributeFilter: \[SYSTEM_ATTR\] \}\)/);
    assert.match(script, /if \(frame\.dataset\.pinned\) return;/);
    // A pinned preset's stylesheet is linked with the frame; the one the reader chose is loaded once, by the script.
    assert.match(template(frame), /\{stylesheet && <link rel="stylesheet" href=\{stylesheet\} \/>\}/);
    assert.match(frame, /const pinned = system && system !== ns \? system : undefined;/);
  });
  test('its code is what the stage held as the page was built: one inline script, the same in every frame', () => {
    assert.match(frame, /const SNAPSHOT = '\(window\.docsExampleSources \?\?= new WeakMap\(\)\)\.set\(document\.currentScript\.previousElementSibling, document\.currentScript\.previousElementSibling\.innerHTML\)';/);
    assert.match(frame, /code && !source && <script is:inline set:html=\{SNAPSHOT\}><\/script>/);
    // Closed until a reader opens it; the React names are fetched only then.
    assert.match(frame, /aria-expanded="false" data-example-code>/);
    assert.match(script, /setAttribute\('aria-controls', `\$\{stage\.id\}-code`\)/);
    assert.match(script, /import\('virtual:tanrei-react-names'\)/);
    assert.doesNotMatch(script, /^import .*virtual:tanrei-react-names/m);
  });
  test('its words are the page’s, in the six languages', () => {
    for (const lang of ['en', 'ja', 'zh-CN', 'es', 'hi', 'ar']) {
      const words = strings(lang).example;
      for (const key of ['live', 'code', 'codeOf', 'flavor', 'copy', 'copied', 'copyFailed', 'width']) assert.ok(String(words[key] ?? '').trim(), `${lang}: example.${key}`);
      assert.ok(words.direction.ltr.trim() && words.direction.rtl.trim(), `${lang}: example.direction`);
      assert.match(words.codeOf, /\{title\}/, `${lang}: example.codeOf names the frame`);
      assert.match(words.width, /\{title\}/, `${lang}: example.width names the frame`);
    }
  });
});

