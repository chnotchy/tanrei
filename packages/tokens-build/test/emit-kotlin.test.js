// The Kotlin emitter: a component color that differs per scheme (IR paint kind 'scheme') and the one reading of a font stack's generic class. Driven through the emitter's own
// entry point, `emitKotlin(ir, { externalPackage })`, the way `buildProductSystem` calls it for the `compose` target.
// What the emitted Kotlin DRAWS is tested in packages/compose (TanreiPaintTest, TanreiButtonPerSchemeTest).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { emitDart } from '../src/emit/dart.js';
import { emitKotlin } from '../src/emit/kotlin.js';
import { emitSwift } from '../src/emit/swift.js';
import { emitTs } from '../src/emit/ts.js';
import { buildIR, fontStack } from '../src/ir.js';
import { buildModel } from '../src/model.js';
import { resolveSystem } from '../src/resolve.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/tone-per-state.system.json'), 'utf8'));
const kotlinColor = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;
// Built once: resolving a layer and building the shipped model are the slow parts.
let fixtureSystem = null;
const resolveFixture = () => (fixtureSystem ??= resolveSystem({ layers: [fixture] }));
let shippedModel = null;
const shipped = () => (shippedModel ??= buildModel());
/** A checked row's fill, per contrast scheme in the default system, and every state that lays a layer over it. */
const CHECKED_FILL = /^tanrei\.comp\.(menu\.selected(\.(hovered|focused|pressed|disabled))?\.container|(select|combobox)\.(stacked|filled|outlined)(\.(hovered|focused|pressed|disabled))?\.selected-option\.container)\.color$/;
const only = (files) => { const texts = Object.values(files); assert.equal(texts.length, 1); return texts[0]; };

test('a tone rule on a Button state becomes TanreiPaint.Scheme with the bundle\'s value of every scheme, by name', async () => {
  const resolved = await resolveFixture();
  const ir = buildIR(await resolved.model());
  const kotlin = only(emitKotlin(ir, { externalPackage: 'com.example.design' }));
  const member = { light: 'light', 'light-medium': 'lightMedium', 'light-high': 'lightHigh', dark: 'dark', 'dark-medium': 'darkMedium', 'dark-high': 'darkHigh' };
  for (const state of ['hovered', 'pressed']) {
    const id = `tanrei.comp.button.filled.${state}.container.color`;
    const expected = `TanreiPaint.Scheme(${ir.schemes.map((scheme) => `${member[scheme]} = TanreiPaint.Literal(${kotlinColor(resolved.tokens(scheme)[id].$value.hex)})`).join(', ')})`;
    assert.ok(kotlin.includes(`containerColor = ${expected},`), `${state}: ${expected}`);
  }
  // Of the Button's colors, only the two whose schemes disagree. (The file also holds the default system's own per-scheme
  // colors — the snackbar's inverse status forms and the code block's syntax hues —
  // which the fixture inherits.)
  assert.equal(ir.componentTokens.button.filter((token) => token.paint?.kind === 'scheme').length, 2, 'only the two colors whose schemes disagree');
  assert.deepEqual(Object.entries(ir.componentTokens).filter(([component, tokens]) => !['button', 'snackbar', 'code-block'].includes(component) && tokens.some((token) => token.paint?.kind === 'scheme' && !CHECKED_FILL.test(token.id))).map(([component]) => component), []);
  // Every scheme's colors say which scheme they are: that is what a per-scheme paint is evaluated against.
  for (const scheme of ir.schemes) assert.match(kotlin, new RegExp(`fun ${member[scheme]}Colors\\(\\): TanreiColors = TanreiColors\\(\\n\\s+TanreiScheme\\.${member[scheme][0].toUpperCase()}${member[scheme].slice(1)},`));
});

test('a per-scheme paint that does not name exactly the six schemes stops the emitter', async () => {
  const resolved = await resolveFixture();
  const model = await resolved.model();
  const lacking = buildIR(model);
  delete lacking.componentTokens.button.find((t) => t.paint?.kind === 'scheme').paint.by['dark-high'];
  assert.throws(() => emitKotlin(lacking, { externalPackage: 'com.example.design' }), /per-scheme paint must name exactly the schemes .*lacking: dark-high/);
  const unknown = buildIR(model);
  unknown.componentTokens.button.find((t) => t.paint?.kind === 'scheme').paint.by.sepia = { kind: 'none' };
  assert.throws(() => emitKotlin(unknown, { externalPackage: 'com.example.design' }), /unknown: sepia/);
});

test('the vocabulary declares the per-scheme paint; the default system uses it for the snackbar\'s inverse status forms and the code block\'s seven syntax colors of six hues, and for the fill of a checked menu row and a chosen option, alone', async () => {
  const files = emitKotlin(buildIR(await shipped()));
  const [vocabulary, values] = [Object.entries(files).find(([file]) => file.endsWith('TanreiTokens.kt'))[1], Object.entries(files).find(([file]) => !file.endsWith('TanreiTokens.kt'))[1]];
  assert.match(vocabulary, /public data class Scheme\(/);
  assert.match(vocabulary, /public enum class TanreiScheme\(public val key: String\) \{\n {4}Light\("light"\),/);
  // The default system values the bar, the message, the glyph and the edge of each inverse status form by a
  // `tone` rule (the other theme's tones), so those sixteen and every color that follows them — the title, the focus
  // indicator and the action in each state — are per-scheme paints: 72 of the snackbar's, no other. (The expand and
  // close buttons have no colors of their own: they are Buttons in the form's tone.)
  const ir = buildIR(await shipped());
  const perScheme = Object.entries(ir.componentTokens).flatMap(([component, tokens]) => tokens.filter((token) => token.paint?.kind === 'scheme').map((token) => [component, token.id]));
  // Seven of the code block's syntax colors are tones of palettes the default system declares for syntax.
  const SYNTAX = /^tanrei\.comp\.code-block\.syntax\.color\.(keyword|constant|tag|string|function|property|type)$/;
  // The fill of a checked menu row and of a select's or a combobox's chosen option, withheld at standard contrast and given
  // at medium and high, and every state that lays a layer over it: 5 of the menu's, 15 each of the select's and the combobox's.
  const checked = perScheme.filter(([, id]) => CHECKED_FILL.test(id));
  assert.deepEqual(checked.map(([component]) => component).reduce((n, c) => ({ ...n, [c]: (n[c] ?? 0) + 1 }), {}), { combobox: 15, menu: 5, select: 15 });
  const [snackbar, code] = [perScheme.filter(([component]) => component === 'snackbar'), perScheme.filter(([component]) => component === 'code-block')];
  assert.deepEqual(perScheme.filter(([component, id]) => component !== 'snackbar' && component !== 'code-block' && !CHECKED_FILL.test(id)), []);
  assert.deepEqual(snackbar.filter(([, id]) => !/\.inverse-(info|warning|error|success)\./.test(id)), []);
  assert.deepEqual(code.filter(([, id]) => !SYNTAX.test(id)), []);
  assert.deepEqual([snackbar.length, code.length], [72, 7]);
  assert.equal(values.match(/TanreiPaint\.Scheme\(/g).length, 114);
});

test('every generic class the IR can answer has a decided platform font; an undecided one stops the emitter by name', async () => {
  const model = await shipped();
  const emitWith = (generic) => {
    const ir = buildIR(model);
    ir.typefaces.plain = { ...ir.typefaces.plain, generic };
    return Object.values(emitKotlin(ir)).join('\n');
  };
  const decided = { 'sans-serif': 'SansSerif', serif: 'Serif', monospace: 'Monospace', cursive: 'Cursive', fantasy: 'SansSerif', math: 'SansSerif', emoji: 'SansSerif' };
  for (const [keyword, face] of Object.entries(decided)) {
    // The IR answers with the keyword itself: the table covers exactly what `fontStack` can return.
    assert.equal(fontStack(['Some Face', keyword]).generic, keyword);
    assert.match(emitWith(keyword), new RegExp(`plain = TanreiFontStack\\(families = listOf\\([^)]*\\), generic = TanreiGenericFontFamily\\.${face},`), keyword);
  }
  assert.equal(fontStack(['Some Face']).generic, 'sans-serif');
  assert.equal(fontStack(['ui-monospace']).generic, 'monospace');
  assert.equal(fontStack(['ui-serif']).generic, 'serif');
  assert.throws(() => emitWith('ui-rounded'), /generic class "ui-rounded", which has no decided platform font/);
  assert.throws(() => emitWith(undefined), /generic class "undefined"/);
});

test('the type scale is sixteen roles with a family each, emphasis is a weight step per family, no twin is emitted', async () => {
  const ir = buildIR(await shipped());
  const files = emitKotlin(ir);
  const vocabulary = Object.entries(files).find(([file]) => file.endsWith('TanreiTokens.kt'))[1];
  const values = Object.entries(files).find(([file]) => !file.endsWith('TanreiTokens.kt'))[1];
  assert.deepEqual(Object.keys(ir.typescale).sort(), ['body', 'body-large', 'body-small', 'caption', 'code', 'code-small', 'display', 'eyebrow', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6', 'label', 'label-small']);
  assert.match(vocabulary, /public enum class TanreiTypeFamily \{ Body, Display, Heading, Label \}/);
  assert.match(vocabulary, /public data class TanreiTypeEmphasis\(\n {4}public val body: Int,\n {4}public val display: Int,\n {4}public val heading: Int,\n {4}public val label: Int,\n\)/);
  assert.match(vocabulary, /public fun emphasized\(emphasis: TanreiTypeEmphasis\): TanreiTextStyle = copy\(weight = weight \+ emphasis\[family\]\)/);
  assert.match(vocabulary, /public val heading1: TanreiTextStyle,[\s\S]*public val emphasis: TanreiTypeEmphasis,\n {4}\/\*\* Steps a design system added[^\n]*\n {4}public val extra: Map<String, TanreiTextStyle> = emptyMap\(\),/);
  assert.match(vocabulary, /"heading-1" -> heading1/);
  assert.doesNotMatch(vocabulary, /Emphasized|headlineLarge|labelLarge|bodyMedium/);
  // The family comes from the IR (ir.typescale[role].family, decided once in pure.js): first segment of the key;
  // caption, code and eyebrow take the label step.
  const family = (role) => new RegExp(`${role} = TanreiTextStyle\\([^\\n]*family = TanreiTypeFamily\\.(\\w+)\\)`).exec(values)?.[1];
  assert.equal(family('display'), 'Display');
  for (const h of [1, 2, 3, 4, 5, 6]) assert.equal(family(`heading${h}`), 'Heading');
  for (const b of ['bodyLarge', 'body', 'bodySmall']) assert.equal(family(b), 'Body');
  for (const l of ['label', 'labelSmall', 'caption', 'code', 'codeSmall', 'eyebrow']) assert.equal(family(l), 'Label');
  assert.match(values, /emphasis = TanreiTypeEmphasis\(body = 100, display = 100, heading = 100, label = 100\),/);
  // The emitter does not parse the key: a role of an unknown first segment builds with the family the IR gives it…
  const stray = buildIR(await shipped());
  stray.typescale.quote = { ...stray.typescale.body, family: 'label' };
  assert.match(only(emitKotlin(stray, { externalPackage: 'com.example.design' })), /quote = TanreiTextStyle\([^\n]*family = TanreiTypeFamily\.Label\)/);
  // …and a role whose IR family has no emphasis step stops the emitter by name.
  stray.typescale.quote = { ...stray.typescale.body, family: 'quote' };
  assert.throws(() => emitKotlin(stray), /type role "quote" has the family "quote", which has no step in sys.typescale.emphasis \(body, display, heading, label\)/);
  const noSteps = buildIR(await shipped());
  noSteps.typeEmphasis = {};
  assert.throws(() => emitKotlin(noSteps), /no sys.typescale.emphasis steps/);
});

test('corner smoothing is a required Float on TanreiShape, 0 for the default system and in [0, 1]; the fallback role is primary', async () => {
  const ir = buildIR(await shipped());
  const files = emitKotlin(ir);
  const vocabulary = Object.entries(files).find(([file]) => file.endsWith('TanreiTokens.kt'))[1];
  const values = Object.entries(files).find(([file]) => !file.endsWith('TanreiTokens.kt'))[1];
  assert.match(vocabulary, /public data class TanreiShape\([\s\S]*public val small: Dp,\n {4}\/\*\* `sys.shape.corner-smoothing`[^\n]*\n {4}public val cornerSmoothing: Float,\n {4}\/\*\* Steps a design system added[^\n]*\n {4}public val extra: Map<String, Dp> = emptyMap\(\),/);
  assert.match(values, /cornerSmoothing = 0f,/);
  assert.doesNotMatch(vocabulary, /TanreiCornerStyle|cornerStyle/);
  // `separation` is the third choice of kind (divider | gap); `link-underline` the fourth
  // (always | hover | never); `appearance` (fade-scale | fade | fade-slide | blur-slide | unfold) sorts first.
  assert.match(vocabulary, /public data class TanreiBehavior\(\n {4}public val appearance: TanreiAppearance,\n {4}public val dividerVisibility: TanreiDividerVisibility,\n {4}public val focusStyle: TanreiFocusStyle,\n {4}public val linkUnderline: TanreiLinkUnderline,\n {4}public val pressedFeedback: TanreiPressedFeedback,\n {4}public val requirementMark: TanreiRequirementMark,\n {4}public val separation: TanreiSeparation,\n\)/);
  const out = buildIR(await shipped());
  out.cornerSmoothing = 1.5;
  assert.throws(() => emitKotlin(out), /corner-smoothing must be a number in \[0, 1\], got 1\.5/);
  // No emphasis role anywhere; an unknown role falls back to the primary slot.
  assert.doesNotMatch(vocabulary + values, /TanreiColorRole\.(On)?Emphasis|EmphasisContainer|"(on-)?emphasis(-container)?"/);
  assert.match(vocabulary, /on && container -> TanreiColorRole\.OnPrimaryContainer\n\s+container -> TanreiColorRole\.PrimaryContainer\n\s+on -> TanreiColorRole\.OnPrimary\n\s+else -> TanreiColorRole\.Primary/);
});

test('sys.icon.mark.weight is a member of every platform\'s icon style — 500 beside the icons\' 300 in the default system; the closed lists stop on a system without it and on a number they do not place', async () => {
  const ir = buildIR(await shipped());
  assert.deepEqual([ir.icon.weight, ir.icon['mark-weight']], [300, 500]);
  const all = (files) => Object.values(files).join('\n');
  const kotlin = all(emitKotlin(ir));
  assert.match(kotlin, /public data class TanreiIconStyle\([\s\S]*?public val weight: Int,\n[^\n]*\n {4}public val markWeight: Int,\n {4}public val fillUnselected: Float,/);
  assert.match(kotlin, /\n\s+weight = 300,\n\s+markWeight = 500,\n\s+fillUnselected = /);
  const swift = all(emitSwift(ir));
  assert.match(swift, /public var weight: CGFloat\n[^\n]*\n {2}public var markWeight: CGFloat\n/);
  assert.match(swift, /weight: 300,\n\s+markWeight: 500,\n\s+fillUnselected: /);
  const ts = all(emitTs(ir));
  assert.match(ts, /export interface TanreiIconStyle \{[^}]*readonly weight: number;\n {2}readonly markWeight: number;\n {2}readonly fillUnselected: number;/);
  assert.match(ts, /weight: 300,\n\s+markWeight: 500,\n\s+fillUnselected: /);
  const dart = all(emitDart(ir));
  assert.match(dart, /weight: 300(\.0)?,\n\s+markWeight: 500(\.0)?,\n\s+fillUnselected: /);
  // A system whose model lacks the member is refused by name; so is a number under sys.icon that no list places.
  const lacking = buildIR(await shipped());
  delete lacking.icon['mark-weight'];
  assert.throws(() => emitKotlin(lacking), /lacks icon style tokens: mark-weight/);
  assert.throws(() => emitSwift(lacking), /mark-weight/);
  assert.throws(() => emitTs(lacking), /mark-weight/);
  const stray = buildIR(await shipped());
  stray.icon['mark-grade'] = 0;
  assert.throws(() => emitKotlin(stray), /sys.icon has number tokens this emitter does not place: mark-grade/);
  assert.throws(() => emitSwift(stray), /mark-grade/);
  assert.throws(() => emitTs(stray), /mark-grade/);
  const fractional = buildIR(await shipped());
  fractional.icon['mark-weight'] = 450.5;
  assert.throws(() => emitKotlin(fractional), /icon weight must be an integer/);
});

test('sys.breakpoint is a group of every platform\'s measures — 600 and 1024 in the default system; the app shell\'s and the navigation drawer\'s widths alias it; a sys group no list places reaches no platform', async () => {
  const model = await shipped();
  const ir = buildIR(model);
  assert.deepEqual(ir.measure.breakpoint, { medium: 600, expanded: 1024 });
  // The component tokens stay, as aliases: one component can still be set apart, and nothing they resolve to moved.
  const aliases = { 'app-shell.breakpoint.medium': 'medium', 'app-shell.breakpoint.expanded': 'expanded', 'navigation-drawer.breakpoint.collapsed': 'medium', 'navigation-drawer.breakpoint.expanded': 'expanded' };
  for (const [id, step] of Object.entries(aliases)) {
    const token = model.tokens[`tanrei.comp.${id}`];
    assert.equal(token.aliasFinal ?? token.alias, `tanrei.sys.breakpoint.${step}`, id);
    assert.equal(token.value.value, ir.measure.breakpoint[step], id);
  }
  const all = (files) => Object.values(files).join('\n');
  const kotlin = all(emitKotlin(ir));
  assert.match(kotlin, /public val breakpointExpanded: Dp,\n(?:[^\n]*\n)? {4}public val breakpointMedium: Dp,/);
  assert.match(kotlin, /breakpointExpanded = 1024\.dp,\n\s+breakpointMedium = 600\.dp,/);
  const swift = all(emitSwift(ir));
  assert.match(swift, /public var breakpointExpanded: CGFloat\n(?:[^\n]*\n)? {2}public var breakpointMedium: CGFloat\n/);
  assert.match(swift, /breakpointExpanded: 1024,\n\s+breakpointMedium: 600,?\n/);
  const ts = all(emitTs(ir));
  assert.match(ts, /export interface TanreiBreakpointMeasure \{\n {2}readonly expanded: number;\n {2}readonly medium: number;\n\}/);
  assert.match(ts, /readonly breakpoint: TanreiBreakpointMeasure;/);
  assert.match(ts, /breakpoint: \{ expanded: 1024, medium: 600 \}/);
  const dart = all(emitDart(ir));
  assert.match(dart, /breakpointExpanded: 1024(\.0)?,\n\s+breakpointMedium: 600(\.0)?,/);
  // The list of measure groups is closed: a length under a sys group it does not name is carried by no platform.
  const stray = structuredClone({ ...model, tokens: undefined });
  stray.tokens = { ...model.tokens, 'tanrei.sys.viewport.tall': { ...model.tokens['tanrei.sys.breakpoint.medium'], id: 'tanrei.sys.viewport.tall', path: ['sys', 'viewport', 'tall'] } };
  const strayIr = buildIR(stray);
  assert.equal(strayIr.measure.viewport, undefined);
  assert.doesNotMatch(all(emitKotlin(strayIr)), /viewportTall/);
});
