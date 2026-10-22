// The frame of a field — the label, the requirement, the help and the error around a control — is one frame: the
// Field's. No component draws it from tokens of its own: a text field, a number field, a
// color field, a select field and a combobox field are each a Field around one control, and
// have no token. One comparison is left here, resolved, in every scheme of every shipped system:
//
//   the field group   draws the frame around a set from tokens of its own: every one of them that has the name of a
//                     frame token equals the Field's (`frameAlone`).
//
// The box of a text input, a select, a combobox, a number input and a color input is not compared: it is one set of
// tokens, `comp.input-box`, that the five read, and there is no copy to hold equal. What keeps a copy
// from coming back is a rule of `validate` (`validateSharedSets` in packages/tools/src/checks.js): no reader's group
// holds a name of the set. What is counted here is what each of the five keeps as its own.
//
// The names are still the ones the text field had before its split (tokens.md, "The rule"):
// `reference()` says where each is now. A rule or a preset pin the reference has and a group lacks fails here, by name.
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_SYSTEM, shippedSystems } from '../src/bundle.js';
import { CONFIG, REPO_ROOT, buildModel } from '../src/model.js';

const NS = `${CONFIG.namespace}.comp`;
const TEXT_INPUT = `${NS}.text-input`;
const INPUT_BOX = `${NS}.input-box`;
const FIELD = `${NS}.field`;

// Where a name of the text field before its split is now (tokens.md, "The rule"). The names a component
// of FRAMES is held by are still those: its own split renames them.
const LOOKS = new Set(['stacked', 'filled', 'outlined']);
const STATES = new Set(['hovered', 'focused', 'disabled']);
// The requirement tag is no row of the frame's: it is a Tag, drawn from the Tag's tokens.
const ROW = new Set(['label-icon', 'supporting-text', 'error-text', 'counter']);
const ROW_ABOVE_A_STACKED_BOX = new Set(['label', 'required-asterisk']);
const ROW_WITHOUT_A_LOOK = [/^label-icon\.(gap|size)$/, /^label\.gap$/, /^requirement\.(gap|mark)$/, /^supporting-text\.(gap|typescale)$/];
const FRAME_READ = [
  [/^label\.typescale\.(medium|large)$/, 'label.typescale'],
  [/^motion\.state-(duration|easing)$/, 'motion.state-$1'],
  [/^requirement\.asterisk-gap$/, 'requirement.asterisk-gap'],
];
/**
 * The token a text field's name is read from since the split: the Field's for a row outside the box, the box's
 * (`comp.input-box`) for everything else — the text input's own group holds only what a text input
 * alone draws, under names no text field had. A row has one look now (`standard`): a name written for a filled or an outlined look is held
 * to the same token of the Field as the stacked one — the label glyph of those two looks included, which no look ever
 * drew and which the split removed from the text field.
 */
export function reference(name, frameAlone = false) {
  // What the frame read of a name that moved with the box: a component that is a frame and no box is held to it.
  const ofTheFrame = frameAlone && FRAME_READ.find(([from]) => from.test(name));
  if (ofTheFrame) return `${FIELD}.${name.replace(ofTheFrame[0], ofTheFrame[1])}`;
  const [look, ...rest] = name.split('.');
  if (LOOKS.has(look) && rest.length > 1) {
    const state = STATES.has(rest[0]) ? rest.shift() : null;
    const error = rest[0] === 'error' ? (rest.shift(), 'error.') : '';
    // The Field answers no hover (FLD-12): a hovered name of a row is held to the resting token.
    const row = `${FIELD}.standard.${state && state !== 'hovered' ? `${state}.` : ''}${error}${rest.join('.')}`;
    if (ROW.has(rest[0])) return row;
    if (ROW_ABOVE_A_STACKED_BOX.has(rest[0]) && look === 'stacked') return row;
    return `${INPUT_BOX}.${name}`;
  }
  if (ROW_WITHOUT_A_LOOK.some((re) => re.test(name))) return `${FIELD}.${name}`;
  return `${INPUT_BOX}.${name}`;
}

/**
 * How a component's frame names map onto the names the text field had. `looks` names the text field's variant each
 * of the component's looks is the frame of; `rename` rewrites what is left of a token's name where the two differ,
 * first match only; `own` lists the tokens that share a name with such a token and are not the frame (a component's
 * own container, say), which are left out by name so that nothing is left out by accident. `pairs` is how many of
 * its tokens have a reference: the numbers are those the comparison held before the split, so that
 * none left it unseen.
 */
export const FRAMES = {
  'field-group': {
    // A frame around a set, with no box: every name is held to the Field's.
    frameAlone: true,
    looks: { standard: 'stacked' },
    rename: [
      [/^label\.typescale$/, 'label.typescale.medium'],
      // The group's error text and its description in error are held to the Field's tokens of the same names since the
      // Field keeps its help in error and draws its error text below it: no rename is left for them.
    ],
    // The distance from the last control to the error text is the group's own arrangement; the Field's token of this
    // name is the distance between its help and its error text.
    own: ['error-text.gap'],
    // 41 before the requirement tag became the Tag's: its 20 ids left the group.
    pairs: 21,
  },
};

/** The parts every frame must have, by the text field's names: a component that drops one is not a field. */
const REQUIRED = [
  'label.typescale.medium', 'label.gap', 'requirement.mark', 'requirement.gap', 'requirement.asterisk-gap',
  'supporting-text.typescale', 'supporting-text.gap',
  ...['', 'error.', 'disabled.', 'disabled.error.'].flatMap((condition) =>
    ['label', 'supporting-text', 'required-asterisk'].map((part) => `stacked.${condition}${part}.color`)),
];

const systems = [DEFAULT_SYSTEM, ...shippedSystems(REPO_ROOT).filter((id) => id !== DEFAULT_SYSTEM)];
const models = new Map();
const modelOf = async (system) => {
  if (!models.has(system)) models.set(system, await (system === DEFAULT_SYSTEM ? buildModel() : buildModel(path.join(REPO_ROOT, 'tokens/generated', system), system)));
  return models.get(system);
};
/** A token's value as drawn in a scheme: a color of that scheme, anything else as the model resolved it. */
const inScheme = (model, scheme, id) => JSON.stringify(model.tokens[id].type === 'color' ? model.componentColors[scheme][id].value : model.tokens[id].value);

/** The pairs of one component: [its token id, the token it is held to, the name the text field had for it]. */
export function framePairs(model, component, frame = FRAMES[component]) {
  const prefix = `${NS}.${component}.`;
  const pairs = [];
  for (const id of Object.keys(model.tokens)) {
    if (!id.startsWith(prefix)) continue;
    let name = id.slice(prefix.length);
    if (frame.own.some((own) => (own instanceof RegExp ? own.test(name) : own === name))) continue;
    const [look, ...rest] = name.split('.');
    if (frame.looks[look]) name = [frame.looks[look], ...rest].join('.');
    const rule = frame.rename.find(([from]) => from.test(name));
    if (rule) name = name.replace(rule[0], rule[1]);
    const to = reference(name, frame.frameAlone);
    if (model.tokens[to]) pairs.push([id, to, name]);
  }
  return pairs;
}

for (const [component, frame] of Object.entries(FRAMES)) {
  test(`${component}: every token with a name the text field had equals the Field's that the name is now, in every scheme of every shipped system`, async () => {
    for (const system of systems) {
      const model = await modelOf(system);
      const pairs = framePairs(model, component);
      assert.equal(pairs.length, frame.pairs, `${system}: ${component} has ${pairs.length} frame tokens, ${frame.pairs} were expected — a token that joined or left the frame is named in FRAMES`);
      const compared = new Set(pairs.map(([, , name]) => name));
      // What a component without a part of the frame (a group has no focused state and no label glyph) does not have
      // is not required of it; what every frame has is.
      assert.deepEqual(REQUIRED.filter((name) => !compared.has(name)), [], `${system}: ${component} lacks a part of the frame`);
      const differing = [];
      for (const scheme of model.schemes) {
        for (const [mine, held] of pairs) {
          const [a, b] = [inScheme(model, scheme, mine), inScheme(model, scheme, held)];
          if (a !== b) differing.push(`[${system} ${scheme}] ${mine} ${a} ≠ ${held} ${b}`);
        }
      }
      assert.deepEqual(differing, []);
    }
  });
}

test('the comparison is not vacuous: a token whose value moves away from its reference is found, by name', async () => {
  const model = structuredClone(await modelOf(DEFAULT_SYSTEM));
  const [mine, held] = framePairs(model, 'field-group').find(([id]) => id.endsWith('.label.gap'));
  assert.equal(held, `${FIELD}.label.gap`);
  model.tokens[mine].value = { value: 12, unit: 'px' };
  assert.notEqual(inScheme(model, 'light', mine), inScheme(model, 'light', held));
  // The rule that says where a name of a row is now still holds of every look and state, for a layer that brings a
  // component of its own into the family: a row to the Field's token, whichever look it is written for, and a name
  // of the box to the one set every input box is drawn from.
  assert.equal(reference('stacked.disabled.required-asterisk.color'), `${FIELD}.standard.disabled.required-asterisk.color`);
  assert.equal(reference('outlined.hovered.supporting-text.color'), `${FIELD}.standard.supporting-text.color`);
  assert.equal(reference('outlined.focused.outline.color'), `${INPUT_BOX}.outlined.focused.outline.color`);
  assert.equal(reference('container.height.medium'), `${INPUT_BOX}.container.height.medium`);
  assert.equal(reference('filled.disabled.error.supporting-text.color'), `${FIELD}.standard.disabled.error.supporting-text.color`);
  assert.ok(framePairs(model, 'field-group').some(([id, to]) => id === `${NS}.field-group.standard.error-text.color` && to === `${FIELD}.standard.error-text.color`));
  assert.ok(framePairs(model, 'field-group').some(([id, to]) => id === `${NS}.field-group.label.typescale` && to === `${FIELD}.label.typescale`));
});

test('the text field has no group of its own: the box is the one set, the text input has what it alone draws, the Field the rows', async () => {
  const model = await modelOf(DEFAULT_SYSTEM);
  const count = (group) => Object.keys(model.tokens).filter((id) => id.startsWith(`${NS}.${group}.`)).length;
  assert.equal(count('text-field'), 0);
  // 364 were the text input's (361 at the split, and three for the entries place): 330 are the box's
  // now, 26 went with the resize grip (its handle is a Handle, comp.handle.*), and 8 are its own — a segment, the code
  // face, the entries place, the motion of a height.
  assert.equal(count('text-input'), 8);
  // The box: the text input's 330, the ten of the small size, which the select alone offered, and its state duration
  // per size (three in place of one), and the stacked look's own height and block padding per size (six), which make a
  // stacked box as tall as a Button of its size.
  const box = Object.keys(model.tokens).filter((id) => id.startsWith(`${INPUT_BOX}.`));
  assert.equal(box.length, 348);
  // Every name of the box is its own reference, but the stacked look's label and asterisk, which the Field draws above a stacked box.
  assert.equal(box.filter((id) => reference(id.slice(INPUT_BOX.length + 1)) !== id).length, 16);
  // No name of the text input's own group is a name a text field had for the box or a row.
  assert.deepEqual(Object.keys(model.tokens).filter((id) => id.startsWith(`${TEXT_INPUT}.`) && model.tokens[`${INPUT_BOX}.${id.slice(TEXT_INPUT.length + 1)}`]), []);
  // 70 with the count's three, and eight for the value text: four written, and the
  // focused and disabled values of its two colors. Four more for the error text (its gap, and its color
  // at rest, focused and disabled), 28 fewer since the requirement tag is the Tag's, and one for where the error text
  // stands beside the help (error-text.placement).
  assert.equal(count('field'), 55);
});

test('a split field has no group of its own: the box is the one set, its input has what it alone draws, the Field the rows', async () => {
  const model = await modelOf(DEFAULT_SYSTEM);
  const count = (group) => Object.keys(model.tokens).filter((id) => id.startsWith(`${NS}.${group}.`)).length;
  // The number field: 438 ids were its own, then 283 the number input's; five are — where the
  // steppers stand and how a hold repeats.
  assert.equal(count('number-field'), 0);
  assert.equal(count('number-input'), 5);
  // The color field: 391, then 236 the color input's; three are — the swatch's shape and its hairline.
  assert.equal(count('color-field'), 0);
  assert.equal(count('color-input'), 3);
  // The select: 739, then 548 for the box and the list; 206 were — the list (with its greatest width), the rows' own state
  // motion and opacity, and the status row —, and 213 are since seven measures of a row are one per density (regular, compact).
  assert.equal(count('select'), 213);
  assert.equal(count('select-field'), 0);
  // The combobox: 765, then 574; 206 were — the list, the matched letters, the status row, the gap of its two actions —,
  // and 213 are since seven measures of a row are one per density.
  assert.equal(count('combobox'), 213);
  assert.equal(count('combobox-field'), 0);
});

test('no box is drawn pressed: no reader holds a part of the box in a pressed state, and the rows keep their own', async () => {
  for (const system of systems) {
    const model = await modelOf(system);
    const ids = Object.keys(model.tokens);
    assert.deepEqual(ids.filter((id) => id.startsWith(`${INPUT_BOX}.`) && id.split('.').includes('pressed')), [], system);
    for (const group of ['select', 'combobox']) {
      assert.deepEqual(ids.filter((id) => id.startsWith(`${NS}.${group}.`) && /\.pressed\.(error\.)?(container|outline|active-indicator|label|input|placeholder|leading-icon|trailing-icon|caret|required-asterisk|state-layer)\.(color|width)$/.test(id) && !/option/.test(id)), [], `${system}: ${group}`);
      assert.ok(model.tokens[`${NS}.${group}.pressed.opacity`], `${system}: the rows of the ${group}'s list keep their pressed opacity`);
    }
  }
});
