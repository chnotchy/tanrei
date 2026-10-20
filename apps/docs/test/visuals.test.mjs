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
const { matrixOf, PSEUDO_STATES } = await import('../src/lib/visuals/states.ts');
const { controlsOf, SIDE_BY_SIDE } = await import('../src/lib/visuals/playground.ts');
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
});

describe('the playground', () => {
  test('a control for each prop a reader can set, of the kind its type and its number of values ask for', () => {
    for (const name of names) {
      const controls = controlsOf(name);
      const settable = specs[name].props.filter((prop) => ['enum', 'boolean', 'number', 'string'].includes(prop.type));
      assert.deepEqual(controls.map((control) => control.prop), settable.map((prop) => prop.name), name);
      for (const control of controls) {
        const prop = specs[name].props.find((entry) => entry.name === control.prop);
        const expected = { enum: prop.values?.length <= SIDE_BY_SIDE ? 'segmented' : 'select', boolean: 'switch', number: 'number', string: 'text' }[prop.type];
        assert.equal(control.kind, expected, `${name}.${control.prop}`);
        assert.deepEqual(control.values, prop.type === 'enum' ? prop.values : [], `${name}.${control.prop}`);
        assert.equal(control.default, prop.default, `${name}.${control.prop}`);
      }
    }
    const variant = controlsOf('button').find((control) => control.prop === 'variant');
    assert.equal(variant.kind, 'select', 'five variants open as a list');
    assert.equal(controlsOf('button').find((control) => control.prop === 'size').kind, 'segmented', 'three sizes stand side by side');
  });
});

describe('the frame and its system switch', () => {
  /** What an `.astro` file draws: its template, without the front matter, the scripts, the styles and the comments. */
  const template = (text) =>
    text
      .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
      .replace(/<script\b[\s\S]*?<\/script>/g, '')
      .replace(/<style\b[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  const frame = read('src/components/visuals/VisualFrame.astro');
  const toggle = read('src/components/visuals/SystemSwitch.astro');

  test('the frame is Tanrei’s Figure in its native parts, named by its title before any script runs, its stage left out of the search', () => {
    const text = template(frame);
    assert.match(text, /<tanrei-figure class="docs-visual not-content"[^>]*>\s*<figure aria-labelledby=\{`\$\{id\}-title`\}/);
    assert.match(text, /<div data-part="frame">\s*<header>\s*<p data-part="title" id=\{`\$\{id\}-title`\}>\{label\}<\/p>/);
    assert.match(text, /<div data-part="stage"[^>]*\bdata-pagefind-ignore>/);
    assert.match(text, /<div class="docs-visual-overlay" aria-hidden="true" data-docs-visual-overlay><\/div>/);
    assert.match(text, /<div data-part="attachment" id=\{`\$\{id\}-legend`\}>/);
  });
  test('the frame holds its room in tokens, in one row that does not wrap, and lays its overlay over it without taking room', () => {
    const css = frame.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.match(css, /\.docs-visual-canvas \{[^}]*min-block-size: var\(--docs-visual-block\);[^}]*\}/);
    assert.match(css, /\.docs-visual-canvas \{[^}]*flex-wrap: nowrap;[^}]*\}/);
    assert.match(css, /\.docs-visual-overlay \{[^}]*position: absolute;[^}]*inset: 0;[^}]*\}/);
    assert.doesNotMatch(css, /content-visibility/, 'a figure is laid out: an element that measures its place once keeps what it chose');
  });
  test('the system switch is Tabs of the shipped systems, the default first and chosen, its help in a Tooltip, the choice neither shared nor kept', () => {
    const text = template(toggle);
    assert.match(text, /<tanrei-tooltip class="docs-system-switch not-content" text=\{t\.visuals\.systemHelp\} no-describe>/);
    assert.match(text, /<tanrei-tabs class="docs-system-switch-tabs" variant="tonal" track="false" transition="none" size="small" label=\{t\.system\.choice\} value=\{value\} data-docs-visual-system>/);
    assert.match(text, /\{shippedSystems\.map\(\(system\) => <tanrei-tab value=\{system\.id\} label=\{system\.id\} aria-description=\{t\.visuals\.systemHelp\}/);
    assert.match(toggle, /const \{ value = ns \} = Astro\.props;/);
    assert.equal(shippedSystems[0].id, NS, 'the default system is the first tab');
    assert.doesNotMatch(text, /\b(group|remember-as)=/, 'the choice is the figure’s alone');
    assert.doesNotMatch(toggle, /localStorage|sessionStorage/);
    // A preset's stylesheet is loaded when it is chosen, not with the page: its address is written, not linked.
    assert.doesNotMatch(template(toggle), /<link\b/);
    assert.match(toggle, /data-sheet=\{system\.id === ns \? undefined : sheetOf\(system\.id\)\}/);
  });
  test('the frame offers the switch where it is asked for, and starts under the default system', () => {
    assert.match(frame, /const \{ label, reserve, system = ns, controls = 'contrast'/);
    assert.match(template(frame), /\(controls === 'system' \|\| controls === 'both'\) && <SystemSwitch value=\{system\} \/>/);
    assert.match(template(frame), /\{stylesheet && <link rel="stylesheet" href=\{stylesheet\} \/>\}/);
    assert.match(frame, /const stylesheet = system === ns \? undefined :/);
  });
});
