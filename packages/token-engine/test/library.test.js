// The engine as a pure library: the namespace is a parameter, choices of kind are chosen by name, a typeface is set
// rather than scaled, a spring set is cloned whole, and the two color rules of the language — `contrast-pick`
// everywhere colors are computed, `tone` also per state.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CANNOT, SystemError, cannot, collectVocabulary, contrastRatio, extensionRecipes, generateStateDocument, legalOperations, matchingRules, materializeVocabulary, mergeLayers, mixColors, pickByContrast, resolveNumericTokens, ruleDependencies, toDtcgColor, tokenKind, walkTokens } from '../src/index.js';

const voc = { 'dev.tanrei.vocabulary': { rationale: 'One product needs this distinction.' } };
const white = { r: 1, g: 1, b: 1, a: 1 }, black = { r: 0, g: 0, b: 0, a: 1 }, grey = { r: 0.5, g: 0.5, b: 0.5, a: 1 };

test('the namespace is a parameter with "tanrei" as its default', () => {
  const corner = (ns) => ({ id: `${ns}.sys.shape.corner.small`, type: 'dimension', value: { value: 6, unit: 'px' }, alias: null, rule: { fn: 'mul', of: `{${ns}.dial.shape.unit}`, by: 3 }, state: false });
  assert.deepEqual(legalOperations(corner('tanrei')), legalOperations(corner('tanrei'), { namespace: 'tanrei' }), 'every existing call keeps working');
  const role = { id: 'kumo.sys.color.primary', type: 'color', alias: null, rule: null };
  assert.equal(tokenKind(role), 'fixed', 'under the default namespace this id is nobody’s color role');
  assert.equal(tokenKind(role, { namespace: 'kumo' }), 'derived');
  const operations = legalOperations(role, { namespace: 'kumo' });
  assert.ok(operations.some((o) => o.op === 'declare a palette'));
  assert.ok(!JSON.stringify(operations).includes('tanrei.'), 'no id of another namespace leaks into the snippets');
  assert.ok(!JSON.stringify(extensionRecipes(corner('kumo'), 'acme', { namespace: 'kumo' })).includes('tanrei.'));
  assert.match(cannot('kumo').join('\n'), /from a kumo\.\* token/);
  assert.deepEqual(CANNOT, cannot());

  // Layers, vocabulary and rules of a vocabulary with another name.
  const sources = { 'sys/space.tokens.json': { kumo: { dial: { $extensions: voc, space: { unit: { $type: 'dimension', $value: { value: 8, unit: 'px' } } } }, sys: { space: { $type: 'dimension', $extensions: voc, space100: { $value: { value: 8, unit: 'px' }, $extensions: { 'dev.tanrei.derive': { fn: 'mul', of: '{kumo.dial.space.unit}', by: 1 } } } } } } } };
  const layers = [{ id: 'kumo' }, { id: 'acme', extends: 'kumo', vocabulary: { 'kumo.sys.space.space300': { $type: 'dimension', rationale: 'A wider gutter for tables.', derive: { fn: 'mul', of: '{kumo.dial.space.unit}', by: 3 } }, 'acme.comp.card.gap': { $type: 'dimension', rationale: 'The card’s own gap.', $value: '{kumo.sys.space.space300}' } } }];
  const system = mergeLayers(layers, { namespace: 'kumo' });
  assert.equal(system.namespace, 'kumo');
  const docs = resolveNumericTokens(sources, system);
  assert.deepEqual(docs['sys/space.tokens.json'].kumo.sys.space.space300.$value, { value: 24, unit: 'px' });
  assert.ok(docs['ext/acme.tokens.json'].acme.comp.card.gap);
  assert.throws(() => mergeLayers(layers), /a layer's own tokens live in its own namespace — "acme\.…", not "kumo\.…"/, 'with the default namespace, kumo.* is a foreign namespace');
  assert.equal(Object.keys(collectVocabulary(layers, { namespace: 'kumo' })).length, 2);
});

test('a choice of kind is chosen by NAME: legalOperations offers "choose", the engine accepts name or index and refuses anything else', () => {
  const pressed = { id: 'tanrei.sys.behavior.pressed-feedback', type: 'number', value: 0, alias: null, rule: { fixed: 'A choice of kind; no dial scales it.' }, state: false, choices: ['overlay', 'ripple', 'dim', 'none'] };
  const [choose, ...rest] = legalOperations(pressed);
  assert.equal(rest.length, 0, 'nothing else is legal: no scale, no derive, no re-point');
  assert.equal(choose.op, 'choose');
  assert.deepEqual(choose.choices, ['overlay', 'ripple', 'dim', 'none']);
  assert.equal(choose.current, 'overlay');
  assert.deepEqual(choose.write.tokens[pressed.id].$value, 1, 'the layer file keeps the index');
  assert.match(choose.effect, /overlay \(0\), ripple \(1\), dim \(2\), none \(3\).*It is "overlay" now; this example chooses "ripple"/);
  assert.deepEqual(extensionRecipes(pressed, 'acme'), [], 'a layer does not add a name');

  const sources = { 'sys/behavior.tokens.json': { tanrei: { sys: { behavior: { $type: 'number', $extensions: voc, 'pressed-feedback': { $value: 0, $extensions: { 'dev.tanrei.enum': { values: pressed.choices }, 'dev.tanrei.derive': { fixed: 'A choice of kind.' } } } } } } } };
  const value = (op) => resolveNumericTokens(sources, mergeLayers([{ id: 'tanrei' }, { id: 'acme', extends: 'tanrei', tokens: { [pressed.id]: op } }]))['sys/behavior.tokens.json'].tanrei.sys.behavior['pressed-feedback'].$value;
  assert.equal(value({ $value: 'dim', reason: 'This product dims on press.' }), 2);
  assert.equal(value({ $value: 3, reason: 'This product gives no press feedback.' }), 3);
  for (const bad of [4, -1, 1.5, 'bounce']) {
    assert.throws(() => value({ $value: bad, reason: 'An out-of-range choice.' }), (error) => error instanceof SystemError && /is not one of its choices \(layer "acme"\)\. Allowed: "overlay" \(0\), "ripple" \(1\), "dim" \(2\), "none" \(3\)/.test(error.message), String(bad));
  }
  assert.throws(() => value({ scale: 2 }), /a choice of kind is neither scaled nor derived/);
  assert.throws(() => value({ $value: 'dim' }), /needs a "reason"/);
});

test('a typeface is set or re-pointed, never scaled', () => {
  const brand = { id: 'tanrei.ref.typeface.brand', type: 'fontFamily', value: ['Inter', 'system-ui', 'sans-serif'], alias: null, rule: { fixed: 'A typeface is a choice.' }, state: false };
  const operations = legalOperations(brand);
  assert.deepEqual(operations.map((o) => o.op), ['set the font stack', 're-point alias']);
  assert.ok(Array.isArray(operations[0].write.tokens[brand.id].$value) && operations[0].write.tokens[brand.id].reason);
  assert.match(operations[0].effect, /It is \["Inter","system-ui","sans-serif"\] now\..*referenced by NAME and never bundled/);
  const icon = { id: 'tanrei.sys.icon.family.selected', type: 'fontFamily', value: ['Material Symbols Rounded'], alias: 'tanrei.ref.typeface.icon', rule: null, state: false };
  assert.deepEqual(legalOperations(icon).map((o) => o.op), ['set the font stack', 're-point alias']);
  assert.ok(!JSON.stringify(legalOperations(icon)).includes('"scale"'));
});

test('contrast: WCAG reference values; a translucent candidate is composited first; the first candidate wins a tie', () => {
  assert.equal(Math.round(contrastRatio(black, white) * 100) / 100, 21);
  assert.equal(contrastRatio(white, white), 1);
  assert.ok(Math.abs(contrastRatio({ ...black, a: 0.5 }, white) - contrastRatio({ r: 0.5, g: 0.5, b: 0.5, a: 1 }, white)) < 1e-9);
  assert.equal(pickByContrast(black, [{ ref: '{a}', color: grey }, { ref: '{b}', color: white }]).ref, '{b}');
  assert.equal(pickByContrast(white, [{ ref: '{a}', color: grey }, { ref: '{b}', color: white }]).ref, '{a}');
  assert.equal(pickByContrast(white, [{ ref: '{a}', color: black }, { ref: '{b}', color: black }]).ref, '{a}');
  assert.deepEqual(ruleDependencies({ fn: 'contrast-pick', on: '{x.on}', from: ['{x.a}', '{x.b}'] }), ['x.on', 'x.a', 'x.b']);
  assert.deepEqual(ruleDependencies({ fn: 'mix', base: '{x.base}', with: '{x.with}', amount: '{x.amount}' }), ['x.base', 'x.with', 'x.amount']);
});

// A one-component vocabulary, so the state rules are tested without the repository's tokens.
const chip = { 'comp/chip.tokens.json': { tanrei: { comp: { chip: { $extensions: { ...voc, 'dev.tanrei.states': { variants: ['filled'], states: ['hovered', 'pressed'], perVariant: { 'container.color': 'color', 'label.color': 'color' } } }, filled: { container: { color: { $type: 'color', $value: '{tanrei.sys.color.primary}' } }, label: { color: { $type: 'color', $value: '{tanrei.sys.color.on-primary}' } } } } } } } };
const roles = { light: { primary: { r: 0.1, g: 0.1, b: 0.4, a: 1 }, 'on-primary': white, ink: black, paper: white }, dark: { primary: { r: 0.8, g: 0.8, b: 1, a: 1 }, 'on-primary': black, ink: black, paper: white } };
const tones = { brand: (t) => ({ r: t / 100, g: t / 100, b: t / 100, a: 1 }) };
const stateDocument = (rules, scheme = 'light', tokens = {}) =>
  generateStateDocument({
    system: { id: 'test', tokens, rules },
    documents: chip,
    note: 'test',
    roleColor: (role) => roles[scheme.split('-')[0]][role],
    toneColor: (palette, tone) => tones[palette](typeof tone === 'object' ? tone[scheme.split('-')[0]][0] : tone),
    scheme,
  }).tanrei.comp.chip.filled;
const rest = [{ match: 'tanrei.comp.*.*.*.label.color', $value: '{tanrei.comp.$1.$2.label.color}' }];

test('the tone rule values a per-state color: a ramp that is not monotonic (rest 80, hover 70, pressed 40)', () => {
  const rules = [...rest, { match: 'tanrei.comp.chip.filled.hovered.container.color', derive: { fn: 'tone', palette: 'brand', tone: 70 } }, { match: 'tanrei.comp.chip.filled.pressed.container.color', derive: { fn: 'tone', palette: 'brand', tone: { light: [40], dark: [90] } } }];
  const light = stateDocument(rules), dark = stateDocument(rules, 'dark');
  assert.equal(light.hovered.container.color.$value.hex, '#b3b3b3');
  assert.equal(light.pressed.container.color.$value.hex, '#666666', 'darker than hover, which is darker than rest: not a mix of anything');
  assert.equal(dark.pressed.container.color.$value.hex, '#e6e6e6', 'a context map follows the scheme');
  assert.deepEqual(light.pressed.container.color.$extensions['dev.tanrei.derive'], rules[2].derive, 'the rule travels with the value');
  assert.throws(() => stateDocument([...rest, { match: 'tanrei.comp.*.*.*.container.color', derive: { fn: 'tone', tone: 40 } }]), /"tone" needs "palette"/);
  assert.throws(() => stateDocument([...rest, { match: 'tanrei.comp.*.*.*.container.color', derive: { fn: 'scale', base: '{x}', ratio: 2, step: 1 } }]), /state tokens support the "mix", "alpha", "tone" and "contrast-pick" rules, not "scale"/);
});

test('contrast-pick on a state token: decided per scheme, written as the alias it chose', () => {
  const rules = [{ match: 'tanrei.comp.*.*.*.container.color', $value: '{tanrei.comp.$1.$2.container.color}' }, { match: 'tanrei.comp.*.*.*.label.color', derive: { fn: 'contrast-pick', on: '{tanrei.comp.$1.$2.$3.container.color}', from: ['{tanrei.sys.color.ink}', '{tanrei.sys.color.paper}'] } }];
  assert.equal(stateDocument(rules).hovered.label.color.$value, '{tanrei.sys.color.paper}', 'white on the dark container');
  assert.equal(stateDocument(rules, 'dark').hovered.label.color.$value, '{tanrei.sys.color.ink}', 'black on the light container');
  assert.equal(stateDocument(rules).hovered.label.color.$extensions['dev.tanrei.derive'].fn, 'contrast-pick');
  assert.throws(() => stateDocument([rules[0], { match: 'tanrei.comp.*.*.*.label.color', derive: { fn: 'contrast-pick', on: '{tanrei.sys.color.ink}', from: ['{tanrei.sys.color.paper}'] } }]), /"contrast-pick" needs "from": two or more/);
  assert.match(JSON.stringify(legalOperations({ id: 'tanrei.comp.chip.filled.hovered.label.color', type: 'color', value: null, alias: null, rule: null, state: 'hovered' }).map((o) => o.op)), /derive \(tone\).*derive \(contrast-pick\)/);
});

test('a mix or alpha amount may be a context map, read for the scheme like a role\'s; a bad amount is refused by name, never NaN', () => {
  const rules = [
    ...rest,
    { match: 'tanrei.comp.*.*.hovered.container.color', derive: { fn: 'mix', base: '{tanrei.comp.$1.$2.container.color}', with: '{tanrei.comp.$1.$2.label.color}', amount: [0.1, 0.2, 0.5] } },
    { match: 'tanrei.comp.*.*.pressed.container.color', derive: { fn: 'alpha', of: '{tanrei.comp.$1.$2.container.color}', amount: { light: [0.5], dark: [0.25, 0.75] } } },
  ];
  const mixed = (scheme, amount) => toDtcgColor(mixColors(roles[scheme.split('-')[0]].primary, roles[scheme.split('-')[0]]['on-primary'], amount)).hex;
  assert.equal(stateDocument(rules).hovered.container.color.$value.hex, mixed('light', 0.1), 'standard contrast: the first value');
  assert.equal(stateDocument(rules, 'light-medium').hovered.container.color.$value.hex, mixed('light-medium', 0.2));
  assert.equal(stateDocument(rules, 'dark-high').hovered.container.color.$value.hex, mixed('dark-high', 0.5), 'the theme does not pick from a bare list; the contrast does');
  assert.equal(stateDocument(rules).pressed.container.color.$value.alpha, 0.5);
  assert.equal(stateDocument(rules, 'dark').pressed.container.color.$value.alpha, 0.25);
  assert.equal(stateDocument(rules, 'dark-high').pressed.container.color.$value.alpha, 0.75, 'the last value repeats for a contrast the list does not reach — here it does');
  assert.equal(stateDocument(rules, 'light-high').pressed.container.color.$value.alpha, 0.5);
  for (const scheme of ['light', 'light-medium', 'light-high', 'dark', 'dark-medium', 'dark-high']) assert.match(stateDocument(rules, scheme).hovered.container.color.$value.hex, /^#[0-9a-f]{6}$/, `${scheme}: a real color`);
  // The rule travels with the amount of the scheme it is written into, so that an emitter that restates it (CSS
  // color-mix, a native paint) restates that scheme's; the rest of the rule as written.
  assert.deepEqual(stateDocument(rules).hovered.container.color.$extensions['dev.tanrei.derive'], { fn: 'mix', base: '{tanrei.comp.chip.filled.container.color}', with: '{tanrei.comp.chip.filled.label.color}', amount: 0.1 });
  assert.equal(stateDocument(rules, 'light-medium').hovered.container.color.$extensions['dev.tanrei.derive'].amount, 0.2);
  assert.equal(stateDocument(rules, 'dark-high').pressed.container.color.$extensions['dev.tanrei.derive'].amount, 0.75);
  const refuse = (amount, pattern, scheme = 'light') => assert.throws(() => stateDocument([...rest, { match: 'tanrei.comp.*.*.*.container.color', derive: { fn: 'mix', base: '{tanrei.comp.$1.$2.container.color}', with: '{tanrei.comp.$1.$2.label.color}', amount } }], scheme), (error) => error instanceof SystemError && /^tanrei\.comp\.chip\.filled\.hovered\.container\.color: the "mix" rule's amount/.test(error.message) && pattern.test(error.message));
  refuse('lots', /must be a number from 0 to 1, a "\{…\}" reference to one, or a context map of those .* — not "lots"/);
  refuse([0.1, 'x'], /not \[0\.1,"x"\]/, 'light-medium');
  refuse({ light: [0.1] }, /cannot be read for scheme "dark": context map has no "dark" entry/, 'dark');
  // Without a scheme the engine cannot read a context map: it says so instead of computing NaN.
  assert.throws(() => generateStateDocument({ system: { id: 'test', tokens: {}, rules: [...rest, { match: 'tanrei.comp.*.*.*.container.color', derive: { fn: 'alpha', of: '{tanrei.comp.$1.$2.container.color}', amount: [0.1] } }] }, documents: chip, note: 'test', roleColor: (role) => roles.light[role] }), (error) => error instanceof SystemError && /the "alpha" rule's amount \[0\.1\] is a context map, and generateStateDocument was called without a scheme/.test(error.message));
});

test('an entry of a context map may name a token: a fill withheld at standard contrast and given at the others, by the system\'s own opacity', () => {
  const documents = { ...chip, 'sys/state.tokens.json': { tanrei: { sys: { state: { fill: { $type: 'number', $value: 0.3, $extensions: voc } } } } } };
  const rules = [...rest, { match: 'tanrei.comp.*.*.*.container.color', derive: { fn: 'alpha', of: '{tanrei.comp.$1.$2.container.color}', amount: [0, '{tanrei.sys.state.fill}'] } }];
  const at = (scheme) => generateStateDocument({ system: { id: 'test', tokens: {}, rules }, documents, note: 'test', roleColor: (role) => roles[scheme.split('-')[0]][role], scheme }).tanrei.comp.chip.filled.hovered.container.color;
  assert.equal(at('light').$value.alpha, 0, 'standard: none');
  assert.equal(at('light-medium').$value.alpha, 0.3, 'medium: the token it names');
  assert.equal(at('dark-high').$value.alpha, 0.3);
  // Each scheme's document carries that scheme's amount: a number, or the reference itself.
  assert.equal(at('light').$extensions['dev.tanrei.derive'].amount, 0);
  assert.equal(at('light-high').$extensions['dev.tanrei.derive'].amount, '{tanrei.sys.state.fill}');
});

test('a text style declared with "derive" alone is refused where it is declared, with what to write', () => {
  const dial = { $type: 'dimension', $value: { value: 16, unit: 'px' } };
  const body = { $value: { fontFamily: 'Inter', fontSize: { value: 14, unit: 'px' }, fontWeight: 400, letterSpacing: { value: 0, unit: 'px' }, lineHeight: 1.5 }, $extensions: { 'dev.tanrei.derive': { fontSize: { fn: 'mul', of: '{tanrei.dial.type.base}', by: 0.875 } } } };
  const sources = () => ({ 'sys/typescale.tokens.json': { tanrei: { dial: { type: { base: dial } }, sys: { typescale: { $type: 'typography', $extensions: voc, body } } } } });
  const declare = (definition) => mergeLayers([{ id: 'tanrei' }, { id: 'acme', extends: 'tanrei', vocabulary: { 'tanrei.sys.typescale.subhead': { $type: 'typography', rationale: 'A subhead between a heading and its body.', ...definition } } }]);
  const fontSize = { fn: 'mul', of: '{tanrei.dial.type.base}', by: 1.125 };
  assert.throws(() => resolveNumericTokens(sources(), declare({ derive: { fontSize } })), (error) => error instanceof SystemError && /^tanrei\.sys\.typescale\.subhead: a text style declared with "derive" alone has no fontFamily, fontWeight or lineHeight[\s\S]*Write "\$value" with the whole style, e\.g\. \{ "fontFamily": "\{tanrei\.ref\.typeface\.plain\}"[\s\S]*or alias an existing style with "\$value": "\{tanrei\.sys\.typescale\.<role>\}"/.test(error.message));
  // The same declaration with the style written out: the rule values fontSize from the dial.
  const whole = resolveNumericTokens(sources(), declare({ $value: { ...body.$value, fontWeight: 500 }, derive: { fontSize } }))['sys/typescale.tokens.json'].tanrei.sys.typescale.subhead;
  assert.deepEqual(whole.$value.fontSize, { value: 18, unit: 'px' });
  assert.equal(whole.$value.fontWeight, 500);
  // A source token in that shape (a style of null with field rules) is refused by the evaluator as a SystemError too.
  const broken = sources();
  broken['sys/typescale.tokens.json'].tanrei.sys.typescale.broken = { $value: null, $extensions: { 'dev.tanrei.derive': { fontSize } } };
  assert.throws(() => resolveNumericTokens(broken, mergeLayers([{ id: 'tanrei' }])), (error) => error instanceof SystemError && /^tanrei\.sys\.typescale\.broken: a text style's "derive" values its fontSize and letterSpacing, and this one has no style to write them into \(null\)/.test(error.message));
});

test('resolving a system does not rewrite it: a choice stays the name the layer wrote, and an adopted declaration adds no entry', () => {
  const pressed = 'tanrei.sys.behavior.pressed-feedback';
  const sources = { 'sys/behavior.tokens.json': { tanrei: { sys: { behavior: { $type: 'number', $extensions: voc, 'pressed-feedback': { $value: 0, $extensions: { 'dev.tanrei.enum': { values: ['overlay', 'ripple', 'dim', 'none'] }, 'dev.tanrei.derive': { fixed: 'A choice of kind.' } } } } } } } };
  const system = mergeLayers([{ id: 'tanrei' }, { id: 'acme', extends: 'tanrei', tokens: { [pressed]: { $value: 'dim', reason: 'This product dims on press.' } } }]);
  const before = JSON.stringify(system.tokens);
  assert.equal(resolveNumericTokens(sources, system)['sys/behavior.tokens.json'].tanrei.sys.behavior['pressed-feedback'].$value, 2, 'the documents keep the index');
  assert.equal(system.tokens[pressed].$value, 'dim', 'the merged system keeps the name — what explain_token and Theme Studio show as authored');
  assert.equal(JSON.stringify(system.tokens), before);

  const space = { 'sys/space.tokens.json': { tanrei: { dial: { space: { unit: { $type: 'dimension', $value: { value: 8, unit: 'px' } } } }, sys: { space: { $type: 'dimension', $extensions: voc, space100: { $value: { value: 8, unit: 'px' }, $extensions: { 'dev.tanrei.derive': { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 1 } } }, space300: { $value: { value: 24, unit: 'px' }, $extensions: { 'dev.tanrei.derive': { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 3 } } } } } } } };
  const adopted = mergeLayers([{ id: 'tanrei' }, { id: 'acme', extends: 'tanrei', vocabulary: { 'tanrei.sys.space.space300': { $type: 'dimension', rationale: 'A wider gutter for tables.', derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 4 } } } }]);
  const docs = resolveNumericTokens(space, adopted);
  assert.match(adopted.notices[0], /now a core token; this declaration can be deleted \(its value still applies\)/);
  assert.deepEqual(docs['sys/space.tokens.json'].tanrei.sys.space.space300.$value, { value: 32, unit: 'px' }, 'the declaration\'s value still applies');
  assert.ok(!('tanrei.sys.space.space300' in adopted.tokens), 'without an operation appearing under "tokens" that no layer wrote');
});

test('which pattern rule wins, and why: explicit entry > fewer wildcards > later layer', () => {
  const id = 'tanrei.comp.chip.filled.hovered.container.color';
  const base = { id: 'tanrei', rules: [{ match: 'tanrei.comp.*.*.hovered.container.color', $value: '{a}' }, { match: 'tanrei.comp.*.*.pressed.container.color', $value: '{x}' }] };
  const preset = { id: 'preset', rules: [{ match: 'tanrei.comp.*.*.hovered.container.color', $value: '{b}' }] };
  const product = { id: 'product', rules: [{ match: 'tanrei.comp.chip.*.hovered.container.color', $value: '{c}' }] };
  const one = matchingRules(id, [base]);
  assert.deepEqual(one.rules.map((r) => [r.layer, r.index, r.wins, r.because]), [['tanrei', 0, true, 'the only pattern that matches']]);
  const two = matchingRules(id, [base, preset]);
  assert.deepEqual(two.rules.map((r) => r.wins), [false, true]);
  assert.match(two.rules[1].because, /written after "tanrei" rules\[0\], which is equally specific — the later one wins a tie/);
  assert.match(two.rules[0].because, /equally specific, but "preset" rules\[0\] was written later/);
  const three = matchingRules(id, [base, preset, product]);
  assert.deepEqual(three.rules.map((r) => r.wins), [false, false, true]);
  assert.equal(three.rules[2].because, 'fewest wildcards (1)');
  assert.match(three.rules[0].because, /more wildcards \(2\) than "product" rules\[0\] \(1\)/);
  const explicit = matchingRules(id, [base, preset, { ...product, tokens: { [id]: { $value: '{d}' } } }]);
  assert.deepEqual(explicit.explicit, { layer: 'product' });
  assert.ok(explicit.rules.every((r) => !r.wins && /an explicit entry under "tokens" \(layer "product"\) beats every pattern/.test(r.because)));
});

test('a named spring set is a step that is a group: cloned whole, additive, then changed like any token', () => {
  const fixed = { 'dev.tanrei.derive': { fixed: 'Spring physics do not scale with the speed dial.' } };
  const set = (damping) => ({ damping: { $type: 'number', $value: damping, $extensions: fixed }, stiffness: { $type: 'number', $value: 700, $extensions: fixed } });
  const sources = { 'sys/motion.tokens.json': { tanrei: { sys: { motion: { $extensions: voc, spring: { standard: { 'default-spatial': set(0.9), 'fast-spatial': set(0.8) } } } } } } };
  const layer = (vocabulary, tokens) => mergeLayers([{ id: 'tanrei' }, { id: 'acme', extends: 'tanrei', vocabulary, tokens }]);
  const declared = { 'tanrei.sys.motion.spring.standard.bouncy': { from: 'default-spatial', rationale: 'The stars land with a bounce.' } };
  const system = layer(declared, { 'tanrei.sys.motion.spring.standard.bouncy.damping': { $value: 0.5, reason: 'A visible bounce.' } });
  assert.equal(system.vocabulary['tanrei.sys.motion.spring.standard.bouncy'].kind, 'group');
  const spring = resolveNumericTokens(sources, system)['sys/motion.tokens.json'].tanrei.sys.motion.spring.standard;
  assert.equal(spring.bouncy.damping.$value, 0.5);
  assert.equal(spring.bouncy.stiffness.$value, 700, 'what was not changed is the clone');
  assert.equal(spring['default-spatial'].damping.$value, 0.9, 'the source is untouched');
  assert.deepEqual(spring.bouncy.stiffness.$extensions['dev.tanrei.vocabulary'], { rationale: 'The stars land with a bounce.', declaredBy: 'acme', extension: true });
  const ids = [...walkTokens(resolveNumericTokens(sources, system)['sys/motion.tokens.json'])].map((t) => t.id);
  assert.ok(ids.includes('tanrei.sys.motion.spring.standard.bouncy.stiffness'));

  const refuse = (vocabulary, pattern) => assert.throws(() => resolveNumericTokens(sources, layer(vocabulary)), (error) => error instanceof SystemError && pattern.test(error.message));
  refuse({ 'tanrei.sys.motion.spring.standard.bouncy': { from: 'nope', rationale: 'The stars land with a bounce.' } }, /"from" must be an existing step of tanrei\.sys\.motion\.spring\.standard \(default-spatial, fast-spatial\), not "nope"/);
  refuse({ 'tanrei.sys.motion.spring.standard.bouncy': { from: 'default-spatial', scale: 2, rationale: 'The stars land with a bounce.' } }, /"scale" does not apply to a cloned step/);
  refuse({ 'tanrei.sys.motion.spring.bouncy': { from: 'standard', rationale: 'The stars land with a bounce.' } }, /"standard" is not a step but a group of steps/);
  assert.throws(() => layer({ 'acme.sys.spring.bouncy': { from: 'default-spatial', rationale: 'The stars land with a bounce.' } }), /a step cloned with "from" belongs to a series of the core vocabulary/);
  assert.match(extensionRecipes({ id: 'tanrei.sys.motion.spring.standard.default-spatial.damping', type: 'number', rule: { fixed: 'x' }, alias: null }, 'acme')[0].effect, /cloned whole from "default-spatial"/);
  // materializeVocabulary reports a step core has since adopted, instead of failing.
  const adopted = JSON.parse(JSON.stringify(sources));
  adopted['sys/motion.tokens.json'].tanrei.sys.motion.spring.standard.bouncy = set(0.6);
  assert.match(materializeVocabulary(adopted, system)[0], /"bouncy" is now a core step/);
});

test('a variant cloned with "from" carries references into its source variant over to itself', () => {
  const voc = { 'dev.tanrei.vocabulary': { rationale: 'x' } };
  const color = (v) => ({ $type: 'color', $value: v });
  const sources = {
    'comp/chip.tokens.json': {
      tanrei: {
        comp: {
          chip: {
            $extensions: { ...voc, 'dev.tanrei.states': { variants: ['filled'], states: ['hovered'], perVariant: { 'label.color': 'color', 'state-layer.color': 'color' } }, 'dev.tanrei.axes': { variant: { default: 'filled', from: 'states' } } },
            filled: { label: { color: color('{tanrei.sys.color.on-primary}') }, 'state-layer': { color: color('{tanrei.comp.chip.filled.label.color}') } },
          },
        },
      },
    },
  };
  const system = mergeLayers([{ id: 'tanrei' }, { id: 'acme', extends: 'tanrei', vocabulary: { 'tanrei.comp.chip.variant.danger': { from: 'filled', rationale: 'A destructive chip.' } } }]);
  const chip = resolveNumericTokens(sources, system)['comp/chip.tokens.json'].tanrei.comp.chip;
  assert.equal(chip.danger['state-layer'].color.$value, '{tanrei.comp.chip.danger.label.color}');
  assert.equal(chip.danger.label.color.$value, '{tanrei.sys.color.on-primary}', 'a reference outside the source variant is kept');
  assert.equal(chip.filled['state-layer'].color.$value, '{tanrei.comp.chip.filled.label.color}', 'the source is untouched');
});

// A layer may value a component's RESTING color by a color rule, as it may a state color. The fill of
// a checked row is its own content color at an amount, so it differs from whatever it lies on by the same step.
test('a resting component color takes a color rule: valued per scheme, mixed by its states, replaced by a child layer\'s $value', () => {
  const id = 'tanrei.comp.chip.filled.container.color';
  const layered = { derive: { fn: 'alpha', of: '{tanrei.comp.chip.filled.label.color}', amount: 0.16 } };
  const rules = [...rest, { match: 'tanrei.comp.*.*.hovered.container.color', derive: { fn: 'mix', base: '{tanrei.comp.$1.$2.container.color}', with: '{tanrei.comp.$1.$2.label.color}', amount: 0.08 } }, { match: 'tanrei.comp.*.*.pressed.container.color', $value: '{tanrei.comp.$1.$2.container.color}' }];

  // 1. It builds, in the document of each scheme, as a color of that scheme, with its rule and without a state.
  const light = stateDocument(rules, 'light', { [id]: layered }), dark = stateDocument(rules, 'dark', { [id]: layered });
  assert.deepEqual([light.container.color.$value.hex, light.container.color.$value.alpha], ['#ffffff', 0.16], 'the label color (on-primary: white in light) at 16%');
  assert.deepEqual([dark.container.color.$value.hex, dark.container.color.$value.alpha], ['#000000', 0.16], 'the same rule follows the scheme');
  assert.deepEqual(light.container.color.$extensions['dev.tanrei.derive'], layered.derive, 'the rule travels with the value');
  assert.ok(!('dev.tanrei.state' in light.container.color.$extensions), 'a resting color names no state');
  assert.equal(light.hovered.label.color.$extensions['dev.tanrei.state'], 'hovered', 'a state token still names its state');

  // 2. Its hovered state mixes the layered value, not the authored alias: 16% and 8% of the same color are 22.72%.
  const over = mixColors({ ...white, a: 0.16 }, white, 0.08);
  assert.equal(light.hovered.container.color.$value.hex, '#ffffff');
  assert.ok(Math.abs(light.hovered.container.color.$value.alpha - over.a) < 0.001 && Math.abs(over.a - 0.2272) < 0.0001, `1 − 0.84 × 0.92, got ${light.hovered.container.color.$value.alpha}`);
  assert.equal(light.pressed.container.color.$value, `{${id}}`, 'a state that aliases the resting color points at the token, whose value in this document is the rule\'s');

  // The numeric pass leaves the authored value where it is (it refused the rule before: unknown rule function "alpha").
  const parent = { id: 'layered', tokens: { [id]: layered }, rules };
  const numeric = resolveNumericTokens(chip, mergeLayers([parent]));
  assert.equal(numeric['comp/chip.tokens.json'].tanrei.comp.chip.filled.container.color.$value, '{tanrei.sys.color.primary}');

  // 3. A child layer's `$value` pin replaces the rule: nothing resting is written, and the states mix the pin.
  const pinned = mergeLayers([parent, { id: 'pinned', extends: 'layered', tokens: { [id]: { $value: '{tanrei.sys.color.ink}', reason: 'This system draws the fill as a tone.' } } }]);
  assert.equal(resolveNumericTokens(chip, pinned)['comp/chip.tokens.json'].tanrei.comp.chip.filled.container.color.$value, '{tanrei.sys.color.ink}');
  const doc = generateStateDocument({ system: pinned, documents: resolveNumericTokens(chip, pinned), note: 'test', roleColor: (role) => roles.light[role], toneColor: () => black, scheme: 'light' }).tanrei.comp.chip.filled;
  assert.equal(doc.container, undefined, 'no resting value in the scheme\'s document: the pin is in the component\'s own');
  assert.equal(doc.hovered.container.color.$value.hex, toDtcgColor(mixColors(black, white, 0.08)).hex, 'ink with 8% of the label color');
  assert.equal(doc.hovered.container.color.$value.alpha ?? 1, 1, 'opaque');

  // 4. A component that declares no states has no document to carry the value: refused, by name — also when no
  // component of the vocabulary declares states at all.
  const plain = { tanrei: { comp: { plain: { $extensions: voc, container: { color: { $type: 'color', $value: '{tanrei.sys.color.primary}' } } } } } };
  const refuse = (documents) => assert.throws(
    () => generateStateDocument({ system: { id: 'test', tokens: { 'tanrei.comp.plain.container.color': layered }, rules }, documents, note: 'test', roleColor: (role) => roles.light[role], scheme: 'light' }),
    (error) => error instanceof SystemError && /^tanrei\.comp\.plain\.container\.color: a resting color takes a color rule only in a component that declares states$/.test(error.message),
  );
  refuse({ ...chip, 'comp/plain.tokens.json': plain });
  refuse({ 'comp/plain.tokens.json': plain });
  // A rule that is not a color rule is still the numeric pass's to refuse, and a color outside the components is too.
  assert.throws(() => resolveNumericTokens(chip, mergeLayers([{ id: 'x', tokens: { [id]: { derive: { fn: 'scale', base: '{x}', ratio: 2, step: 1 } } }, rules }])), SystemError);
});

// A component that declares its looks and NO interaction state (a code block: `states: []`) expands
// to no state token, and may still value a resting color by a color rule — a syntax color is a tone of a palette.
test('a resting color takes a color rule in a component that declares its looks and no interaction state', () => {
  const id = 'tanrei.comp.listing.syntax.color.keyword';
  const listing = { tanrei: { comp: { listing: {
    $extensions: { ...voc, 'dev.tanrei.states': { variants: ['filled'], states: [], perVariant: { 'container.color': 'color' } } },
    filled: { container: { color: { $type: 'color', $value: '{tanrei.sys.color.paper}' } } },
    syntax: { color: { keyword: { $type: 'color', $value: '{tanrei.sys.color.ink}' } } },
  } } } };
  const toned = { derive: { fn: 'tone', palette: 'brand', tone: { light: [40, 30, 20], dark: [80, 85, 90] } } };
  const build = (documents, scheme, tokens = { [id]: toned }) =>
    generateStateDocument({ system: { id: 'test', tokens, rules: [...rest, { match: 'tanrei.comp.*.*.*.container.color', $value: '{tanrei.comp.$1.$2.container.color}' }] }, documents, note: 'test', roleColor: (role) => roles[scheme][role], toneColor: (palette, tone) => tones[palette](tone[scheme][0]), scheme });

  // Alone (no component of the vocabulary has a state) and beside a component that has states: the document holds
  // the role's color per scheme, with its rule, without a state — and nothing else of the component.
  for (const documents of [{ 'comp/listing.tokens.json': listing }, { ...chip, 'comp/listing.tokens.json': listing }]) {
    const light = build(documents, 'light').tanrei.comp.listing, dark = build(documents, 'dark').tanrei.comp.listing;
    assert.deepEqual(Object.keys(light), ['syntax'], 'no state token is written for a component without states');
    assert.equal(light.syntax.color.keyword.$value.hex, toDtcgColor(tones.brand(40)).hex);
    assert.equal(dark.syntax.color.keyword.$value.hex, toDtcgColor(tones.brand(80)).hex, 'the same rule follows the scheme');
    assert.deepEqual(light.syntax.color.keyword.$extensions['dev.tanrei.derive'], toned.derive, 'the rule travels with the value');
    assert.ok(!('dev.tanrei.state' in light.syntax.color.keyword.$extensions), 'a resting color names no state');
    assert.equal(light.syntax.color.keyword.$extensions['dev.tanrei.vocabulary'].rationale, voc['dev.tanrei.vocabulary'].rationale, 'the component\'s own rationale');
  }
  // With no rule there is still nothing to write: a system that gives such a component no rule builds no document.
  assert.equal(build({ 'comp/listing.tokens.json': listing }, 'light', {}), null);
  // The numeric pass leaves the authored value where it is.
  const numeric = resolveNumericTokens({ 'comp/listing.tokens.json': listing }, mergeLayers([{ id: 'x', tokens: { [id]: toned }, rules: [] }]));
  assert.equal(numeric['comp/listing.tokens.json'].tanrei.comp.listing.syntax.color.keyword.$value, '{tanrei.sys.color.ink}');
  // A component that declares nothing about states is still refused (the test above), and so is a color the
  // component does not author.
  assert.equal(build({ 'comp/listing.tokens.json': listing }, 'light', { 'tanrei.comp.listing.syntax.color.operator': toned }), null, 'a token the component does not author is not a resting color');
});
