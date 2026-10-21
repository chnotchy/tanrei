// Motion by role: how long a change takes and how it eases come from what moves (`sys.motion.role.*`,
// `sys.motion.easing.{enter,exit,state,spatial}`), and where a surface that appears starts from is one appearance
// (`sys.motion.appear.*`), set by the choice `sys.behavior.appearance`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSystem } from '../src/resolve.js';

const ROLE = 'tanrei.sys.motion.role.';
const APPEAR = 'tanrei.sys.motion.appear.';
const EASING = 'tanrei.sys.motion.easing.';
const CHOICE = 'tanrei.sys.behavior.appearance';
const ms = (value) => ({ value, unit: 'ms' });
const px = (value) => ({ value, unit: 'px' });
const STANDARD = [0.2, 0, 0, 1];
const STANDARD_ACCELERATE = [0.3, 0, 1, 1];

const tokensOf = async (input) => (await resolveSystem(input, { model: false })).tokens('light');
const layer = (id, tokens, parent = 'tanrei') => ({ id, name: id, extends: parent, tokens });
const value = (tokens, id) => {
  assert.ok(tokens[id], `${id} exists`);
  return tokens[id].$value;
};

// The default system's roles. The owner set direct controls at 200–250 ms, anchored surfaces at 300, modal ones at
// 350 and sheets at 400; the others are derived from those (a role's exit is one step of the motion unit shorter).
const TANREI_ROLES = {
  'state.compact': 200,
  'state.default': 250,
  'state.large': 250,
  'selection.mark': 250,
  'selection.travel': 250,
  'resize.default': 300,
  'resize.large': 400,
  disclosure: 400,
  'appear.hint.enter': 250,
  'appear.hint.exit': 200,
  'appear.anchored.enter': 300,
  'appear.anchored.exit': 250,
  'appear.modal.enter': 350,
  'appear.modal.exit': 300,
  'appear.sheet.enter': 400,
  'appear.sheet.exit': 350,
  'appear.toast.enter': 350,
  'appear.toast.exit': 300,
  feedback: 450,
  'show-delay': 300,
  reduced: 100,
};

// m3-like's roles are Material 3's durations: the ones its components draw (checked against them below).
const M3_ROLES = {
  'state.compact': 150,
  'state.default': 150,
  'state.large': 150,
  'selection.mark': 150,
  'selection.travel': 350,
  'resize.default': 200,
  'resize.large': 500,
  disclosure: 350,
  'appear.hint.enter': 200,
  'appear.hint.exit': 150,
  'appear.anchored.enter': 200,
  'appear.anchored.exit': 100,
  'appear.modal.enter': 300,
  'appear.modal.exit': 200,
  'appear.sheet.enter': 300,
  'appear.sheet.exit': 200,
  'appear.toast.enter': 250,
  'appear.toast.exit': 150,
  feedback: 450,
  'show-delay': 300,
  reduced: 100,
};

// What each appearance sets: the opacity, scale, distance and blur a surface starts from.
const LANGUAGES = {
  'fade-scale': { opacity: 0, scale: 0.96, distance: px(0), blur: px(0) },
  fade: { opacity: 0, scale: 1, distance: px(0), blur: px(0) },
  'fade-slide': { opacity: 0, scale: 1, distance: px(8), blur: px(0) },
  'blur-slide': { opacity: 0, scale: 1, distance: px(8), blur: px(4) },
  unfold: { opacity: 0, scale: 0, distance: px(0), blur: px(0) },
};
const appearOf = (tokens) => Object.fromEntries(Object.keys(LANGUAGES['fade-scale']).map((key) => [key, value(tokens, `${APPEAR}${key}`)]));

const tanrei = await tokensOf({ system: 'tanrei' });

test('the default system times a change by its role: the owner’s durations and the ones derived from them', () => {
  assert.deepEqual(Object.keys(tanrei).filter((id) => id.startsWith(ROLE)).sort(), Object.keys(TANREI_ROLES).map((key) => ROLE + key).sort(), 'every role, and no other');
  for (const [key, duration] of Object.entries(TANREI_ROLES)) assert.deepEqual(value(tanrei, ROLE + key), ms(duration), key);
  assert.deepEqual(value(tanrei, `${ROLE}appear.modal.enter`), ms(350));
  for (const kind of ['hint', 'anchored', 'modal', 'sheet', 'toast']) {
    assert.ok(value(tanrei, `${ROLE}appear.${kind}.exit`).value < value(tanrei, `${ROLE}appear.${kind}.enter`).value, `a ${kind} surface leaves faster than it appears`);
  }
});

test('the default system eases a surface in on the standard curve and out on the accelerating one', () => {
  assert.deepEqual(value(tanrei, `${EASING}enter`), STANDARD);
  assert.deepEqual(value(tanrei, `${EASING}exit`), STANDARD_ACCELERATE);
  assert.deepEqual(value(tanrei, `${EASING}state`), STANDARD);
  assert.deepEqual(value(tanrei, `${EASING}spatial`), STANDARD);
  assert.equal(tanrei[`${EASING}exit`].aliasOf, `${EASING}standard-accelerate`, 'the exit names the curve of the scale, not a copy of it');
});

test('the default system’s appearance is fade-scale: a surface fades in and grows from 0.96, from its anchor', () => {
  assert.equal(value(tanrei, CHOICE), 0);
  assert.deepEqual(appearOf(tanrei), LANGUAGES['fade-scale']);
  assert.equal(value(tanrei, `${APPEAR}origin`), 0, 'anchor');
});

test('each of the five appearances sets the values that go with it', async () => {
  for (const [name, expected] of Object.entries(LANGUAGES)) {
    const tokens = await tokensOf({ layers: [layer('chooses', { [CHOICE]: { $value: name, reason: 'The product chooses how its surfaces appear.' } })] });
    assert.deepEqual(appearOf(tokens), expected, name);
  }
});

test('a pinned value keeps its pin whatever the appearance, and a distance the appearance names follows the space dial', async () => {
  const pinned = layer('pinned', { [`${APPEAR}scale`]: { $value: 0.9, reason: 'The product grows its surfaces further.' } });
  const slides = layer('slides', { [CHOICE]: { $value: 'fade-slide', reason: 'The product slides its surfaces into place.' } }, 'pinned');
  const tokens = await tokensOf({ layers: [pinned, slides] });
  assert.equal(value(tokens, `${APPEAR}scale`), 0.9, 'the pin holds under a child’s choice');
  assert.deepEqual(value(tokens, `${APPEAR}distance`), px(8), 'the choice still sets what was not pinned');
  const airy = await tokensOf({ layers: [layer('airy', { [CHOICE]: { $value: 'fade-slide', reason: 'The product slides its surfaces into place.' }, 'tanrei.dial.space.unit': { $value: px(10), reason: 'Airy marketing pages.' } })] });
  assert.deepEqual(value(airy, `${APPEAR}distance`), px(10), 'fade-slide travels one step of the space scale');
});

test('the motion dial re-times every role', async () => {
  const slower = await tokensOf({ layers: [layer('slower', { 'tanrei.dial.motion.unit': { $value: ms(60), reason: 'A calmer product.' } })] });
  for (const [key, duration] of Object.entries(TANREI_ROLES)) assert.deepEqual(value(slower, ROLE + key), ms(duration * 1.2), key);
});

test("m3-like keeps Material 3's motion: its durations, its emphasized curves, and menus that unfold", async () => {
  const tokens = await tokensOf({ system: 'm3-like' });
  for (const [key, duration] of Object.entries(M3_ROLES)) assert.deepEqual(value(tokens, ROLE + key), ms(duration), key);
  assert.deepEqual(value(tokens, `${EASING}enter`), value(tokens, `${EASING}emphasized-decelerate`));
  assert.deepEqual(value(tokens, `${EASING}exit`), value(tokens, `${EASING}emphasized-accelerate`));
  assert.deepEqual(value(tokens, `${EASING}state`), value(tokens, `${EASING}standard`));
  assert.deepEqual(value(tokens, `${EASING}spatial`), value(tokens, 'tanrei.sys.motion.spring.standard.fast-spatial.easing'));
  assert.deepEqual(appearOf(tokens), LANGUAGES.unfold);
});

test('m3-like’s roles are the durations its components draw, so a component that takes its role draws the same', async () => {
  const tokens = await tokensOf({ system: 'm3-like' });
  const drawn = {
    'state.compact': 'tanrei.comp.checkbox.motion.state-duration',
    'state.default': 'tanrei.comp.button.motion.state-duration.medium',
    'state.large': 'tanrei.comp.list.motion.state-duration',
    'selection.mark': 'tanrei.comp.checkbox.motion.selection-duration',
    'selection.travel': 'tanrei.comp.switch.motion.selection-duration',
    'resize.default': 'tanrei.comp.text-input.motion.resize-duration',
    'resize.large': 'tanrei.comp.main-action-button.motion.resize-duration',
    disclosure: 'tanrei.comp.accordion.motion.disclosure-duration',
    'appear.hint.enter': 'tanrei.comp.tooltip.motion.enter-duration',
    'appear.hint.exit': 'tanrei.comp.tooltip.motion.exit-duration',
    'appear.anchored.enter': 'tanrei.comp.menu.motion.open-duration',
    'appear.anchored.exit': 'tanrei.comp.menu.motion.close-duration',
    'appear.modal.enter': 'tanrei.comp.dialog.motion.enter-duration',
    'appear.modal.exit': 'tanrei.comp.dialog.motion.exit-duration',
    'appear.sheet.enter': 'tanrei.comp.bottom-sheet.motion.enter-duration',
    'appear.sheet.exit': 'tanrei.comp.bottom-sheet.motion.exit-duration',
    'appear.toast.enter': 'tanrei.comp.snackbar.motion.enter-duration',
    'appear.toast.exit': 'tanrei.comp.snackbar.motion.exit-duration',
    feedback: 'tanrei.comp.button.motion.feedback-duration',
    'show-delay': 'tanrei.comp.loading-indicator.motion.show-delay',
  };
  for (const [key, component] of Object.entries(drawn)) assert.deepEqual(value(tokens, ROLE + key), value(tokens, component), `${key} = ${component}`);
  assert.deepEqual(value(tokens, `${EASING}enter`), value(tokens, 'tanrei.comp.menu.motion.open-easing'));
  assert.deepEqual(value(tokens, `${EASING}exit`), value(tokens, 'tanrei.comp.menu.motion.close-easing'));
});

test('cupertino states no motion of its own: it takes the root’s roles, curves and appearance', async () => {
  const tokens = await tokensOf({ system: 'cupertino' });
  for (const key of Object.keys(TANREI_ROLES)) assert.deepEqual(value(tokens, ROLE + key), value(tanrei, ROLE + key), key);
  for (const key of ['enter', 'exit', 'state', 'spatial']) assert.deepEqual(value(tokens, EASING + key), value(tanrei, EASING + key), key);
  assert.deepEqual(appearOf(tokens), LANGUAGES['fade-scale']);
});

test('a layer cannot add a name to the appearance, and an appearance named by index is the same choice', async () => {
  await assert.rejects(tokensOf({ layers: [layer('bounces', { [CHOICE]: { $value: 'bounce', reason: 'The product bounces its surfaces in.' } })] }), /not one of its choices/);
  const byIndex = await tokensOf({ layers: [layer('by-index', { [CHOICE]: { $value: 4, reason: 'The product unfolds its menus.' } })] });
  assert.deepEqual(appearOf(byIndex), LANGUAGES.unfold);
});
