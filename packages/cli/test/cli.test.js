// The CLI, end to end, in a directory that is not the Tanrei repository — the way a product uses it.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(pkg, 'bin/tanrei.js');

// What the default system gives Button is read from the token file, the source of truth, never written here: a change
// that moves a size then moves these expectations with it.
const button = JSON.parse(fs.readFileSync(path.resolve(pkg, '../../tokens/comp/button.tokens.json'), 'utf8')).tanrei.comp.button;
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The CSS custom property an alias such as `{tanrei.sys.space.space200}` is written as. */
const cssVarOf = (alias) => `var(--${alias.slice(1, -1).replaceAll('.', '-')})`;
const mediumPadding = button.container['padding-inline-start'].medium.$value;
const largeHeight = button.container.height.large.$extensions['dev.tanrei.derive'];

function product(layer, outputs = { tokens: 'out/tokens', web: 'out/web', swiftui: 'out/ios', compose: 'out/android', flutter: 'out/flutter', 'react-native': 'out/rn', tailwind: 'out/web', shadcn: 'out/web' }) {
  const dir = tempDir('product');
  fs.mkdirSync(path.join(dir, 'design'));
  fs.writeFileSync(path.join(dir, `design/${layer.id}.system.json`), JSON.stringify(layer, null, 2));
  fs.writeFileSync(path.join(dir, 'tanrei.json'), JSON.stringify({ system: `design/${layer.id}.system.json`, kotlinPackage: 'com.acme.design', outputs }));
  const run = (args, env = {}) => spawnSync(process.execPath, [bin, ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, TANREI_CLI_FROM_SOURCE: '1', ...env } });
  const read = (file) => fs.readFileSync(path.join(dir, file), 'utf8');
  return { dir, run, read };
}

const acme = {
  id: 'acme',
  name: 'Acme',
  extends: 'tanrei',
  palettes: { correct: { description: 'A right answer in a quiz.', source: { seed: '#0f766e' }, roles: 'intent' } },
  tokens: {
    'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' }, reason: 'Read at arm’s length.' },
    'tanrei.comp.button.container.padding-inline-start.medium': { scale: 2 },
    'tanrei.comp.button.container.gap.medium': { $value: '{tanrei.sys.space.space50}' },
    'tanrei.sys.typescale.label-small': { $value: { fontSize: { value: 11, unit: 'px' } }, reason: 'Contractual footnote size.' },
  },
};

test('build: one layer in, every platform out, and the philosophy’s three edits hold', () => {
  const { run, read, dir } = product(acme);
  const result = run(['build']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"acme" \(tanrei → acme\): \d+ tokens → tokens, web,/);

  const css = read('out/web/acme.css');
  assert.match(css, /\[data-tanrei-system="acme"\]/);
  assert.match(css, /--tanrei-dial-type-base: 1\.125rem;/);
  assert.match(mediumPadding, /^\{tanrei\.sys\.space\.space\d+\}$/, 'the default medium padding is a step of the spacing scale');
  assert.match(css, new RegExp(escaped(`--tanrei-comp-button-container-padding-inline-start-medium: round(nearest, calc(${cssVarOf(mediumPadding)} * 2), 0.25px);`)), 'scale: twice the default, still following the spacing dial');
  assert.match(css, /--tanrei-comp-button-container-gap-medium: var\(--tanrei-sys-space-space50\);/, 're-pointed alias');
  assert.match(css, /--tanrei-sys-color-on-correct-container:/, 'a declared palette yields its four roles');

  const swift = read('out/ios/TanreiSystem+Acme.swift');
  assert.match(swift, /^import Tanrei$/m, 'a product file imports the library');
  assert.match(swift, /labelSmall: TanreiTextStyle\([^)]*size: 11,/, 'pinned: exempt from the type dial');
  assert.match(swift, /bodyLarge: TanreiTextStyle\([^)]*size: 18,/, 'derived: follows the type dial');
  assert.match(read('out/android/TanreiSystemAcme.kt'), /^package com\.acme\.design$[\s\S]*^import io\.github\.chnotchy\.tanrei\.tokens\.\*$/m);
  assert.match(read('out/flutter/acme_system.g.dart'), /import 'package:tanrei\/tanrei\.dart';/);
  assert.match(read('out/rn/acme.ts'), /declare module '@tanrei\/react-native' \{[\s\S]*correct: true;/);
  assert.match(read('out/web/acme.tailwind.css'), /@theme inline \{[\s\S]*--color-correct: var\(--tanrei-sys-color-correct\);/);
  assert.match(read('out/web/acme.shadcn.css'), /--primary: var\(--tanrei-sys-color-primary\);/);
  for (const file of ['out/ios/TanreiSystem+Acme.swift', 'out/web/acme.css']) assert.match(read(file), /Source: acme\.system\.json \(extends tanrei\)\. Regenerate with `tanrei build`\./);

  // The shared artifact is plain DTCG 2025.10, with the recipe inside.
  const dial = JSON.parse(read('out/tokens/dial/dial.tokens.json'));
  assert.deepEqual(dial.$extensions['dev.tanrei.system'].chain, ['tanrei', 'acme']);
  // Larger type alone no longer fits the small button, nor the segmented button and the button with menu that share its 32px:
  // the product is told, in the log and in the report. Other components whose heights 18px type outgrows are reported the same way; how many they are
  // follows the components that exist, so the test holds the kind of every warning and these three, not a count.
  const report = JSON.parse(read('out/tokens/a11y-report.json'));
  assert.equal(report.count, report.warnings.length);
  // What was checked, in each of the six schemes: the totals are the sums of the schemes'.
  const schemes = Object.values(report.checked.schemes);
  assert.equal(schemes.length, 6);
  assert.ok(schemes.every((n) => n.rolePairs > 0 && n.componentPairs > 0), 'both kinds of pair are counted in every scheme');
  assert.equal(report.checked.rolePairs, schemes.reduce((sum, n) => sum + n.rolePairs, 0));
  assert.equal(report.checked.componentPairs, schemes.reduce((sum, n) => sum + n.componentPairs, 0));
  for (const warning of report.warnings) assert.match(warning, /^tanrei\.comp\.[a-z0-9-]+\.container\.height\.[a-z0-9-]+: [\d.]+px cannot hold its content/, 'the larger type is all this layer is warned about');
  for (const component of ['button', 'button-with-menu', 'segmented-button']) {
    assert.ok(report.warnings.some((w) => w.startsWith(`tanrei.comp.${component}.container.height.small: 32px cannot hold its content`)), component);
  }
  assert.ok(!report.warnings.some((w) => w.startsWith('tanrei.comp.chip.')), 'the chip’s label is the pinned 11px label-small, which still fits');
  assert.match(result.stderr, /cannot hold its content/);
  assert.ok(!fs.existsSync(path.join(dir, 'out/ios/TanreiTokens.swift')), 'the vocabulary types come from the library, never from a product build');
});

test('build --check: fails when a committed output is stale, writes nothing', () => {
  const { run, read, dir } = product(acme, { web: 'out/web' });
  assert.equal(run(['build']).status, 0);
  assert.equal(run(['build', '--check']).status, 0);
  const layerFile = path.join(dir, 'design/acme.system.json');
  fs.writeFileSync(layerFile, fs.readFileSync(layerFile, 'utf8').replace('"value": 18', '"value": 20'));
  const before = read('out/web/acme.css');
  const check = run(['build', '--check']);
  assert.equal(check.status, 1);
  assert.match(check.stderr, /out of date[\s\S]*out\/web\/acme\.css/);
  assert.equal(read('out/web/acme.css'), before);
});

test('a layer gives a reason for what it pins and for what it adds; nothing is written when it does not', () => {
  const cases = [
    [{ ...acme, tokens: { 'tanrei.sys.color.brand-glow': { $value: '{tanrei.sys.color.primary}' } } }, /brand-glow.*not a color role|unknown token/is],
    [{ ...acme, tokens: { 'acme.sys.space.huge': { scale: 2 } } }, /unknown token.*declare it under "vocabulary"/s],
    [{ ...acme, tokens: { 'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' } } } }, /reason/],
    [{ ...acme, vocabulary: { 'tanrei.sys.space.space1200': { $type: 'dimension', derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 12 } } } }, /rationale/],
    [{ ...acme, vocabulary: { 'other.comp.thing.size': { $type: 'dimension', rationale: 'Not my namespace at all.', $value: '{tanrei.sys.space.space100}' } } }, /its own namespace/],
    [{ ...acme, thresholds: {} }, /additional properties/],
  ];
  for (const [layer, expected] of cases) {
    const { run, dir } = product(layer, { web: 'out/web' });
    const result = run(['build']);
    assert.equal(result.status, 1, JSON.stringify(layer.tokens ?? layer.vocabulary ?? layer.thresholds));
    assert.match(result.stderr, expected);
    assert.ok(!fs.existsSync(path.join(dir, 'out')), 'nothing is written when the layer is invalid');
  }
});

test('a product extends the vocabulary: a step, a button size in one line, and its own tokens', () => {
  const extended = { ...acme, vocabulary: {
    'tanrei.sys.space.space1200': { $type: 'dimension', rationale: 'Hero sections need a 96px rhythm step.', derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 12 } },
    'tanrei.comp.button.size.3x': { from: 'large', scale: 1.5, rationale: 'A hero call-to-action on the landing screen.' },
    'acme.comp.rating.star.size': { $type: 'dimension', rationale: 'The rating component’s star.', derive: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 5 } },
  } };
  const { run, read } = product(extended, { web: 'out/web', tokens: 'out/tokens', swiftui: 'out/ios', compose: 'out/android', flutter: 'out/flutter', 'react-native': 'out/rn' });
  const result = run(['build']);
  assert.equal(result.status, 0, result.stderr);
  const css = read('out/web/acme.css');
  assert.match(css, /--tanrei-sys-space-space1200: round\(nearest, calc\(var\(--tanrei-dial-space-unit\) \* 12\), 0\.25px\);/);
  assert.deepEqual({ fn: largeHeight.fn, of: largeHeight.of }, { fn: 'mul', of: '{tanrei.dial.size.unit}' }, 'the large height is a multiple of the size unit');
  assert.match(css, new RegExp(escaped(`--tanrei-comp-button-container-height-3x: round(nearest, calc(${cssVarOf(largeHeight.of)} * ${largeHeight.by * 1.5}), 0.25px);`)), 'the added size is 1.5 × large, whatever large is');
  assert.match(css, /--acme-comp-rating-star-size:/);
  const recipe = JSON.parse(read('out/tokens/dial/dial.tokens.json')).$extensions['dev.tanrei.system'];
  assert.deepEqual(recipe.extensions.map((e) => e.id).sort(), ['acme.comp.rating.star.size', 'tanrei.comp.button.size.3x', 'tanrei.sys.space.space1200']);
  assert.ok(JSON.parse(read('out/tokens/ext/acme.tokens.json')).acme.comp.rating.star.size);
  // Every platform gets the values, typed accessors for what was added, and the layer's own tokens as a typed object.
  assert.match(read('out/ios/TanreiSystem+Acme.swift'), /size3x[\s\S]*space1200[\s\S]*AcmeTokens|space1200[\s\S]*size3x[\s\S]*AcmeTokens/);
  assert.match(read('out/android/TanreiSystemAcme.kt'), /Size3x/);
  assert.match(read('out/android/TanreiSystemAcme.kt'), /AcmeTokens/);
  assert.match(read('out/flutter/acme_system.g.dart'), /size3x[\s\S]*acmeTokens|acmeTokens[\s\S]*size3x/);
  assert.match(read('out/rn/acme.ts'), /"3x": true;/);
  assert.match(read('out/web/acme.d.ts'), /declare module '@tanrei\/web\/registry' \{\s+interface TanreiButtonSizeRegistry \{\s+"3x": true;/);
});

test('a product can stack its own layers and start from a shipped preset', () => {
  const { run, read, dir } = product({ id: 'acme-kids', name: 'Acme Kids', extends: 'acme-base', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 6, unit: 'px' }, reason: 'Rounder for children.' } } }, { web: 'out/web' });
  fs.writeFileSync(path.join(dir, 'design/acme-base.system.json'), JSON.stringify({ id: 'acme-base', name: 'Acme base', extends: 'cupertino', tokens: {} }));
  const result = run(['build']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /tanrei → cupertino → acme-base → acme-kids/);
  assert.match(result.stderr, /accessibility\/structure warning\(s\)/, 'a product layer on a preset is warned about what it inherits: reported, not hidden');
  assert.match(read('out/web/acme-kids.css'), /--tanrei-dial-shape-unit: 6px;/);
});

test('explain, systems, init, help', () => {
  const { run, dir } = product(acme, { web: 'out/web' });
  assert.match(run(['explain', 'tanrei.comp.button.container.gap.medium']).stdout, /acme:\n\s+\{"\$value":"\{tanrei\.sys\.space\.space50\}"\}/);
  assert.match(run(['explain', 'tanrei.comp.button.filled.hovered.container.color']).stdout, /tanrei:\n\s+✔ rule tanrei\.comp\.\*\.\*\.hovered\.container\.color .*\(wins: fewest wildcards \(2\)\)/);
  assert.match(run(['systems']).stdout, /cupertino[\s\S]*m3-like[\s\S]*tanrei/);
  const help = run(['--help']).stdout;
  assert.match(help, /tanrei build/);
  // The help names every system this version ships, the default first, and each of them is one `init` takes
  // (the list was a literal and fell behind tokens/systems/).
  const shipped = fs.readdirSync(path.resolve(pkg, '../../tokens/systems')).filter((f) => f.endsWith('.system.json')).map((f) => f.replace('.system.json', '')).sort();
  const offered = /tanrei init <id> \[--extends ([^\]]+)\]/.exec(help)?.[1].split('|') ?? [];
  assert.ok(shipped.length > 1, 'more than the default system ships');
  assert.deepEqual([...offered].sort(), shipped);
  assert.equal(offered[0], 'tanrei');
  assert.match(run(['systems']).stdout, new RegExp(shipped.map((id) => `^${id} `).join('[\\s\\S]*'), 'm'));
  const refused = spawnSync(process.execPath, [bin, 'init', 'fresh', '--extends', 'nope'], { cwd: tempDir('init-refused'), encoding: 'utf8', env: { ...process.env, TANREI_CLI_FROM_SOURCE: '1' } });
  assert.equal(refused.status, 1);
  assert.equal(/Try one of: (.+)$/m.exec(refused.stderr)?.[1], offered.join(', '));
  assert.equal(run(['frobnicate']).status, 2);
  fs.rmSync(path.join(dir, 'tanrei.json'));
  const init = spawnSync(process.execPath, [bin, 'init', 'fresh', '--extends', 'm3-like'], { cwd: tempDir('init'), encoding: 'utf8', env: { ...process.env, TANREI_CLI_FROM_SOURCE: '1' } });
  assert.equal(init.status, 0, init.stderr);
});

test('fonts: build and systems list the named families a system references; validate warns about a stack without a fallback', () => {
  const branded = { ...acme, tokens: { ...acme.tokens, 'tanrei.ref.typeface.brand': { $value: ['Acme Sans', 'system-ui', 'sans-serif'], reason: 'The brand typeface of this product.' }, 'tanrei.sys.icon.family.selected': { $value: ['Acme Icons Filled'], reason: 'A static icon set: the filled family when selected.' } } };
  const { run } = product(branded, { web: 'out/web' });
  const built = run(['build']);
  assert.equal(built.status, 0, built.stderr);
  assert.match(built.stdout, /fonts "acme" names:\n\s+text: {2}brand "Acme Sans" · plain "Inter", "Noto Sans JP", "Noto Sans" · mono "Roboto Mono", "Noto Sans JP"\n\s+icons: unselected "Material Symbols Rounded" · selected "Acme Icons Filled"\n\s+Fonts are referenced by name, never bundled: the product installs or registers these families on every platform it ships\./);
  assert.doesNotMatch(built.stderr, /fallback/);
  const valid = run(['validate']);
  assert.equal(valid.status, 0, valid.stderr);
  assert.doesNotMatch(valid.stderr, /fallback/, 'an icon font needs no generic fallback');

  const bare = product({ ...acme, tokens: { ...acme.tokens, 'tanrei.ref.typeface.brand': { $value: ['Acme Sans'], reason: 'The brand typeface of this product.' } } }, { web: 'out/web' });
  const warned = bare.run(['validate']);
  assert.equal(warned.status, 0, 'a warning, not a failure');
  assert.match(warned.stderr, /⚠ typeface "brand": the font stack \["Acme Sans"\] has no system or generic fallback/);
  assert.match(warned.stdout, /is a valid layer \(tanrei → acme\)/);
  assert.match(bare.run(['build']).stderr, /⚠ typeface "brand": the font stack/);

  const listed = run(['systems']).stdout;
  assert.match(listed, /cupertino\s+Cupertino[^\n]*\n\s+text: {2}brand "Inter" \(the platform’s own font first\)/);
  assert.match(listed, /m3-like[^\n]*\n\s+text: {2}brand "Roboto" · plain "Roboto" · mono "Roboto Mono"\n\s+icons: unselected "Material Symbols Outlined" · selected "Material Symbols Outlined"/);
  assert.match(listed, /\nFonts are referenced by name, never bundled/);
});

test('choices of kind are shown and refused by NAME; validate is a trial build, so what only the engine sees is caught', () => {
  const rippling = { ...acme, tokens: { ...acme.tokens, 'tanrei.sys.behavior.pressed-feedback': { $value: 'ripple', reason: 'This product answers a press like Material.' } } };
  const { run } = product(rippling, { web: 'out/web' });
  const explained = run(['explain', 'tanrei.sys.behavior.pressed-feedback']);
  assert.equal(explained.status, 0, explained.stderr);
  assert.match(explained.stdout, /value: ripple {3}— choice 1 of overlay \(0\), ripple \(1\), dim \(2\), none \(3\)/);
  assert.match(explained.stdout, /a layer may:\n\s+choose {3}\{"tokens":\{"tanrei\.sys\.behavior\.pressed-feedback":\{"\$value":0,/);
  assert.match(run(['build']).stdout, /✔ "acme"/);
  assert.match(run(['explain', 'tanrei.ref.typeface.brand']).stdout, /value: Inter, Noto Sans JP, Noto Sans, system-ui, sans-serif[\s\S]*a layer may:\n\s+set the font stack[^\n]*\n\s+re-point alias/);
  assert.match(run(['explain', 'tanrei.comp.button.container.gap.medium']).stdout, /value: 4px {3}← \{tanrei\.sys\.space\.space50\}/);
  assert.match(run(['explain', 'tanrei.sys.nope']).stderr, /not a token of "acme"/);

  for (const command of ['validate', 'build']) {
    const out = product({ ...acme, tokens: { ...acme.tokens, 'tanrei.sys.behavior.focus-style': { $value: 5, reason: 'A fifth way of showing focus.' } } }, { web: 'out/web' }).run([command]);
    assert.equal(out.status, 1, command);
    assert.match(out.stderr, /focus-style: 5 is not one of its choices \(layer "acme"\)\. Allowed: "ring" \(0\), "glow" \(1\)/);
  }
});

test('"extends" is an id, never a path: validate and build refuse before anything outside the product is read', () => {
  const { dir, run } = product({ id: 'acme', name: 'Acme', extends: '../../outside' }, { tokens: 'out/tokens' });
  fs.writeFileSync(path.join(dir, 'outside.system.json'), 'password=hunter2 not json');
  for (const command of ['validate', 'build']) {
    const result = run([command]);
    assert.notEqual(result.status, 0, command);
    assert.match(result.stderr, /acme\.system\.json "extends": "\.\.\/\.\.\/outside" is not a system id/, command);
    assert.doesNotMatch(result.stdout + result.stderr, /hunter2|Unexpected token/, command);
  }
  assert.ok(!fs.existsSync(path.join(dir, 'out')));
  // A legal id whose file is a link that leaves the directory of the layers.
  fs.writeFileSync(path.join(dir, 'design/acme.system.json'), JSON.stringify({ id: 'acme', name: 'Acme', extends: 'linked' }));
  fs.symlinkSync(path.join(dir, 'outside.system.json'), path.join(dir, 'design/linked.system.json'));
  const linked = run(['validate']);
  assert.notEqual(linked.status, 0);
  assert.match(linked.stderr, /linked\.system\.json: a link that leaves/);
  assert.doesNotMatch(linked.stdout + linked.stderr, /hunter2|Unexpected token/);
});

test('validate and build print the same warnings; a press that shows nothing leads the list', () => {
  const DIM = /pressed-feedback is "dim", but every pressed opacity is 1 .*a press would show nothing/;
  const dimmed = product({ id: 'acme', name: 'Acme', extends: 'm3-like', tokens: { 'tanrei.sys.behavior.pressed-feedback': { $value: 'dim', reason: 'This product dims on press.' } } }, { tokens: 'out/tokens' });
  for (const command of ['validate', 'build']) {
    const result = dimmed.run([command]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /⚠ 1 accessibility\/structure warning\(s\)/, command);
    assert.match(result.stderr, DIM, command);
  }
  assert.match(JSON.parse(dimmed.read('out/tokens/a11y-report.json')).warnings.join('\n'), DIM);
  // A product on cupertino inherits about a hundred contrast warnings; the press is still the first line, not one of "… and N more".
  const undone = product({ id: 'acme', name: 'Acme', extends: 'cupertino', rules: [{ match: 'tanrei.comp.*.pressed.opacity', $value: 1, reason: 'Undoes the preset’s dimming for every component, to prove the check.' }] }, { tokens: 'out/tokens' });
  const lines = undone.run(['validate']).stderr.split('\n');
  assert.match(lines[lines.findIndex((line) => /accessibility\/structure warning/.test(line)) + 1], DIM);
  // Nothing to warn about: nothing printed.
  assert.doesNotMatch(product({ id: 'acme', name: 'Acme', extends: 'm3-like' }, { tokens: 'out/tokens' }).run(['validate']).stderr, /warning\(s\)/);
});

test('the packaged CLI (bundle + its own copy of the vocabulary) produces the same output as the sources', () => {
  execFileSync(process.execPath, [path.join(pkg, 'scripts/build.js')], { cwd: pkg });
  assert.ok(!fs.existsSync(path.join(pkg, 'dist/vocabulary/tokens/generated')), 'build output is not shipped');
  const fromSource = product(acme, { web: 'out/web', swiftui: 'out/ios' });
  const packaged = product(acme, { web: 'out/web', swiftui: 'out/ios' });
  assert.equal(fromSource.run(['build']).status, 0);
  const result = packaged.run(['build'], { TANREI_CLI_FROM_SOURCE: '' });
  assert.equal(result.status, 0, result.stderr);
  for (const file of ['out/web/acme.css', 'out/ios/TanreiSystem+Acme.swift']) assert.equal(packaged.read(file), fromSource.read(file));
  // The glyph list travels with it: the packaged CLI prints the names the sources print.
  const glyphs = (stdout) => stdout.match(/glyphs the components may draw[^\n]*\n\s+([a-z0-9_,]+)\n/)?.[1];
  assert.ok(glyphs(result.stdout));
  assert.equal(glyphs(result.stdout), glyphs(fromSource.run(['build']).stdout));
});

test('build prints the glyph names the components may draw and the axes the system draws icons at, for a product to cut its icon font down to', () => {
  const list = JSON.parse(fs.readFileSync(path.join(pkg, '../web/src/generated/glyphs.json'), 'utf8')).glyphs;
  const heavier = product({ ...acme, tokens: { ...acme.tokens, 'tanrei.sys.icon.weight': { $value: 200, reason: 'A lighter icon stroke for this product.' } } }, { web: 'out/web' });
  const built = heavier.run(['build']);
  assert.equal(built.status, 0, built.stderr);
  const printed = built.stdout.match(/glyphs the components may draw \((\d+)\), at FILL 0–1 · wght (\d+)–(\d+) · GRAD 0 · opsz 20–48:\n\s+([a-z0-9_,]+)\n\s+Cut the icon font down to these names and your product's own/);
  assert.ok(printed, built.stdout);
  assert.equal(Number(printed[1]), list.length);
  assert.deepEqual(printed[4].split(','), list);
  assert.ok(list.includes('expand_more') && list.includes('close'));
  // The axes are the product's own: its icon weight, not the default system's.
  assert.equal(Number(printed[2]), 200);
});
