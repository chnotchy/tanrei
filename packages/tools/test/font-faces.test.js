// Our own sites register the fonts the SHIPPED systems name — from
// development-only packages, under the names the tokens use, and never as part of a published library.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FONT_PACKAGES, PLATFORM_FAMILIES, axisCuts, fontFacesCss, missingFamilies, registeredFamilies, shippedFamilies, subsetFileName } from '../src/font-faces.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// packages/web depends (for its tests) on a package for every family in the table except Noto Sans JP and Noto Sans
// Arabic (the Theme Studio app's face for Arabic).
const web = path.join(repo, 'packages/web');
const json = (file) => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));

test('every family a shipped system names has a package in the table, or a stated reason to have none', async () => {
  const systems = await shippedFamilies();
  assert.deepEqual(Object.keys(systems).sort(), fs.readdirSync(path.join(repo, 'tokens/systems')).map((f) => f.replace('.system.json', '')).sort());
  assert.ok(systems['m3-like'].includes('Roboto') && systems['m3-like'].includes('Material Symbols Outlined'), 'the premise: a preset names its own faces');
  for (const [system, families] of Object.entries(systems)) for (const family of families) assert.ok(family in FONT_PACKAGES || family in PLATFORM_FAMILIES, `${system}: "${family}"`);
  for (const family of Object.keys(PLATFORM_FAMILIES)) assert.ok(!(family in FONT_PACKAGES), `${family} is in both tables`);

  // An app that lacks a package is told which one; a family nobody decided about is told apart from that.
  const none = path.join(repo, 'packages/tools'); // depends on no font package
  assert.deepEqual(registeredFamilies(none), []);
  const problems = missingFamilies({ 'm3-like': systems['m3-like'], made: ['Comic Neue'] }, none);
  assert.ok(problems.some((p) => /"m3-like" names "Roboto": add @fontsource-variable\/roboto/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /"made" names "Comic Neue", and nobody has decided/.test(p)), problems.join('\n'));
  // packages/web registers what m3-like needs (its tests draw that preset's glyphs).
  assert.deepEqual(missingFamilies({ 'm3-like': systems['m3-like'] }, web), []);
});

test('faces are registered under the token names; icons block instead of flashing their ligature text', () => {
  const css = fontFacesCss(path.join(web, 'fonts.css'), web, { families: ['Roboto', 'Material Symbols Outlined'] });
  assert.match(css, /font-family: 'Roboto';/);
  assert.match(css, /font-family: 'Material Symbols Outlined';/);
  assert.ok(!/Variable'/.test(css), 'no "<Family> Variable" name is left');
  const faces = css.match(/@font-face\s*\{[^}]*\}/g);
  assert.equal(faces.length, 10, 'nine Roboto subsets and one icon font');
  for (const face of faces) assert.match(face, new RegExp(`font-display: ${face.includes("'Material Symbols Outlined'") ? 'block' : 'swap'};`));
  // URLs point at the package's files, relative to the stylesheet; they exist.
  const urls = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 2);
  for (const url of urls) assert.ok(fs.existsSync(path.resolve(web, url)), url);

  const latin = fontFacesCss(path.join(web, 'fonts.css'), web, { families: ['Roboto'], subsets: ['latin'], embed: true });
  assert.equal(latin.split('@font-face').length - 1, 1, 'latin, not latin-ext');
  assert.match(latin, /url\(data:font\/woff2;base64,[A-Za-z0-9+/]+=*\) format\('woff2-variations'\)/);
  assert.throws(() => fontFacesCss('x.css', web, { families: ['Comic Neue'] }), /no package is known for "Comic Neue"/);
  // A face added for one script is registered for that script's subset alone: it never takes Latin, digits or symbols
  // from the faces before it in the stack.
  const studio = path.join(repo, 'packages/studio/app');
  const arabic = fontFacesCss(path.join(studio, 'fonts.css'), path.join(repo, 'packages/studio'), { families: ['Noto Sans Arabic'] });
  assert.equal(arabic.split('@font-face').length - 1, 1, 'the arabic subset, not math or symbols');
  assert.match(arabic, /font-family: 'Noto Sans Arabic';[\s\S]*unicode-range: U\+0600-06FF/);
  assert.throws(() => fontFacesCss('x.css', path.join(repo, 'packages/tools'), { families: ['Roboto'] }), /needs @fontsource-variable\/roboto/);
});

test('an icon family is registered from its cut-down file where one is given: same family, still blocking, at the weights it kept', () => {
  const file = path.join(web, 'styles', subsetFileName('Material Symbols Rounded'));
  assert.equal(path.basename(file), 'material-symbols-rounded.subset.generated.woff2');
  const css = fontFacesCss(path.join(web, 'fonts.css'), web, { families: ['Material Symbols Rounded', 'Roboto'], subsets: ['latin'], iconFiles: { 'Material Symbols Rounded': { file, weight: [300, 500] } } });
  const icon = css.match(/@font-face\s*\{[^}]*'Material Symbols Rounded'[^}]*\}/)[0];
  assert.match(icon, /src: url\('\.\/styles\/material-symbols-rounded\.subset\.generated\.woff2'\) format\('woff2-variations'\);/);
  assert.match(icon, /font-weight: 300 500;/);
  assert.match(icon, /font-display: block;/);
  assert.match(css, /roboto-latin-wght-normal\.woff2/, 'the other families keep their package files');
  // Without it, the package's full file, as before.
  assert.match(fontFacesCss(path.join(web, 'fonts.css'), web, { families: ['Material Symbols Rounded'] }), /material-symbols-rounded-latin-full-normal\.woff2'\)/);
});

test('an axis the tokens hold at one value is pinned, a narrower range is cut to, the rest is kept whole', () => {
  const font = { FILL: { min: 0, max: 1 }, GRAD: { min: -50, max: 200 }, opsz: { min: 20, max: 48 }, wght: { min: 100, max: 700 } };
  assert.deepEqual(axisCuts({ FILL: [0, 1], wght: [300, 500], GRAD: [0, 0], opsz: [20, 48] }, font), { pin: { GRAD: 0 }, ranges: { wght: [300, 500] } });
  assert.deepEqual(axisCuts({ wght: [400, 400], slnt: [0, 0] }, font), { pin: { wght: 400 }, ranges: {} }, 'an axis the font does not have is left alone');
  assert.deepEqual(axisCuts({ opsz: [16, 60] }, font), { pin: {}, ranges: {} }, 'a range wider than the font’s cuts nothing');
});

test('development only: no published package depends on a font package or ships a registered stylesheet', () => {
  const fontPackages = new Set(Object.values(FONT_PACKAGES).map(([pkg]) => pkg));
  const manifests = [...fs.readdirSync(path.join(repo, 'packages')).map((dir) => `packages/${dir}/package.json`), ...fs.readdirSync(path.join(repo, 'apps')).map((dir) => `apps/${dir}/package.json`)].filter((file) => fs.existsSync(path.join(repo, file)));
  let users = 0;
  for (const file of manifests) {
    const manifest = json(file);
    const runtime = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies, ...manifest.optionalDependencies }).filter((name) => fontPackages.has(name) || name.startsWith('@fontsource'));
    const dev = Object.keys(manifest.devDependencies ?? {}).filter((name) => name.startsWith('@fontsource'));
    users += runtime.length + dev.length;
    if (manifest.private) continue; // an app may depend on fonts any way it likes: it is never published
    assert.deepEqual(runtime, [], `${file} is published and must not depend on a font package`);
    for (const entry of manifest.files ?? []) assert.ok(!/font/i.test(entry), `${file}: "files" ships ${entry}`);
    assert.ok(Array.isArray(manifest.files), `${file}: a published package lists its "files", so a generated fonts stylesheet cannot slip in`);
  }
  assert.ok(users > 0, 'the check looked at real manifests');
});
