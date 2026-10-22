// `tanrei audit`, end to end, on the files of test/fixtures/audit/ copied into a directory that is not the Tanrei
// repository — the way a product runs it after a change, or in CI. What the default system leaves out, and what it
// offers instead, is read from its layer file, the source of truth, never written here.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after);

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const bin = path.join(pkg, 'bin/tanrei.js');
const fixtures = path.join(pkg, 'test/fixtures/audit');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8'));
const { namespace } = readJson('tanrei.config.json');
const omittedByDefault = readJson(`tokens/systems/${namespace}.system.json`).components.omit;

/** A copy of the fixtures, and a way to run the CLI in it; `layer`, if given, makes it a product's repository. */
function workspace(layer) {
  const dir = tempDir('audit');
  fs.cpSync(fixtures, dir, { recursive: true });
  if (layer) {
    fs.mkdirSync(path.join(dir, 'design'));
    fs.writeFileSync(path.join(dir, `design/${layer.id}.system.json`), JSON.stringify(layer, null, 2));
    fs.writeFileSync(path.join(dir, 'tanrei.json'), JSON.stringify({ system: `design/${layer.id}.system.json`, outputs: { tokens: 'design/tokens' } }));
  }
  const run = (...args) => spawnSync(process.execPath, [bin, 'audit', ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, TANREI_CLI_FROM_SOURCE: '1' } });
  const json = (...args) => {
    const result = run(...args, '--format', 'json');
    return { status: result.status, stderr: result.stderr, report: result.stdout ? JSON.parse(result.stdout) : null };
  };
  return { dir, run, json };
}

const where = (finding) => [finding.file, finding.line, finding.column, finding.kind, finding.component ?? finding.found];
const at = (report, file, line, column) => report.findings.find((f) => f.file === file && f.line === line && f.column === column);

test('audit: on the default system, every element, import, selector and variant it does not have, where it is', () => {
  const { json } = workspace();
  const { status, report } = json('src');
  assert.equal(status, 1, 'something was found');
  assert.equal(report.system, namespace);
  assert.equal(report.checked, 4, 'the directory’s script, markup and stylesheets');
  assert.deepEqual(report.findings.map(where), [
    ['src/page.html', 6, 11, 'import', 'segmented-button'],
    ['src/page.html', 10, 3, 'selector', 'segmented-button'],
    ['src/page.html', 11, 11, 'selector', 'fab-menu'],
    ['src/page.html', 14, 20, 'variant', 'text-field'],
    ['src/page.html', 15, 2, 'element', 'segmented-button'],
    ['src/page.tsx', 3, 9, 'import', '@tanrei/web/m3-like'],
    ['src/page.tsx', 4, 18, 'import', 'fab-menu'],
    ['src/page.tsx', 5, 10, 'import', 'chip'],
    ['src/page.tsx', 14, 14, 'variant', 'text-field'],
    ['src/page.tsx', 15, 8, 'element', 'fab-menu'],
    ['src/page.tsx', 16, 10, 'element', 'fab-menu'],
    ['src/page.tsx', 22, 8, 'element', '<tanrei-widget>'],
    ['src/styles.css', 3, 1, 'selector', 'fab-menu'],
    ['src/styles.css', 5, 15, 'selector', 'segmented-button'],
  ]);
  assert.equal(report.errors, report.findings.length);
  // What is not code is not read as code: the comments of every kind, a part name, an attribute's value, and the
  // lines a URL in a string, a regular expression or an apostrophe in JSX text might have turned into a comment.
  for (const [file, line] of [['src/page.tsx', 1], ['src/page.tsx', 2], ['src/page.tsx', 13], ['src/page.html', 2], ['src/page.html', 4], ['src/page.html', 9], ['src/page.html', 12], ['src/styles.css', 2]]) {
    assert.equal(report.findings.some((f) => f.file === file && f.line === line), false, `${file}:${line}`);
  }
});

test('audit: each finding says what to write instead', () => {
  const { report } = workspace().json('src');
  // A component the default system leaves out: why, what it ships for the same job, and who has it.
  const segmented = at(report, 'src/page.html', 15, 2);
  assert.equal(segmented.found, '<tanrei-segmented-button>');
  assert.equal(segmented.omittedBy, namespace);
  assert.equal(segmented.reason, omittedByDefault['segmented-button'].reason);
  assert.deepEqual(segmented.insteadUse.map((c) => c.name), omittedByDefault['segmented-button'].insteadUse);
  assert.ok(segmented.availableIn.includes('m3-like'));
  assert.deepEqual(segmented.howToInclude.write, { components: { include: ['segmented-button'] } });
  // A component of another layer: the layer, and the line of a product layer that takes it from there.
  const fab = at(report, 'src/page.tsx', 15, 8);
  assert.equal(fab.providedBy, 'm3-like');
  assert.deepEqual(fab.howToInclude.write, { components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } });
  // An entry that does not fit: the one that does, and what the other would have registered.
  const entry = at(report, 'src/page.tsx', 3, 9);
  assert.deepEqual([entry.use, entry.notInThisSystem], ['@tanrei/web', ['fab-menu', 'segmented-button']]);
  assert.equal(at(report, 'src/page.tsx', 5, 10).use, '@tanrei/react', 'the entry of every wrapper types the chip for every system');
  // A variant: the values the system offers. Unquoted in markup, or an imported wrapper under another name.
  assert.deepEqual(at(report, 'src/page.html', 14, 20).values, ['stacked']);
  assert.deepEqual([at(report, 'src/page.tsx', 14, 14).found, at(report, 'src/page.tsx', 14, 14).values], ['variant="outlined"', ['stacked']]);
  assert.match(at(report, 'src/page.tsx', 22, 8).problem, /^Tanrei has no element <tanrei-widget>$/);
});

test('audit: the text a person reads names the file, the place and the stand-ins, and sums it up', () => {
  const { run } = workspace();
  const result = run('src');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /^src\/page\.tsx$/m);
  assert.match(result.stdout, /^ {2}15:8 +<tanrei-fab-menu> {2}"tanrei" does not have fab-menu$/m);
  assert.match(result.stdout, /instead: tabs \(<tanrei-tabs>\), radio-button/);
  assert.match(result.stdout, /use: @tanrei\/web$/m);
  assert.match(result.stdout, /✖ "tanrei": 14 finding\(s\) in 3 of 4 file\(s\)/);
});

test('audit: a component the product includes is not reported, and the product is the system its tanrei.json names', () => {
  const layer = { id: 'acme', name: 'Acme', extends: namespace, components: { include: ['segmented-button', { name: 'fab-menu', from: 'm3-like' }] } };
  const { json } = workspace(layer);
  const { status, report } = json('src');
  assert.equal(status, 1);
  assert.deepEqual([report.system, report.product], ['acme', true]);
  const components = new Set(report.findings.filter((f) => f.kind !== 'import').map((f) => f.component));
  assert.equal(components.has('segmented-button'), false, 'included: its element, its module and its selectors are the product’s');
  assert.equal(components.has('fab-menu'), false, 'included from the layer it lives in');
  assert.equal(report.findings.some((f) => f.found === '@tanrei/web/components/segmented-button'), false, 'its own module registers it');
  // What the product has not changed is still checked: the outlined text field, and the entries it imports from.
  assert.deepEqual(at(report, 'src/page.html', 14, 20).values, ['stacked']);
  const m3 = at(report, 'src/page.tsx', 3, 9);
  assert.equal(m3.notInThisSystem, undefined, 'the product has what the m3-like entry adds; the entry is still another system’s');
  assert.equal(m3.use, '@tanrei/web');
  // The same layer named on the command line is the same system.
  assert.deepEqual(json('src', '--system', 'design/acme.system.json').report.findings, report.findings);
});

test('audit: another shipped system, a glob, and a file with nothing to report', () => {
  const { json, run } = workspace();
  const { report } = json('src/**/*.tsx', '--system', 'm3-like');
  assert.equal(report.checked, 1);
  assert.equal(report.findings.some((f) => f.component === 'fab-menu' && f.kind === 'element'), false, 'm3-like has the FAB menu');
  assert.deepEqual(at(report, 'src/page.tsx', 21, 20).values, ['primary', 'secondary'], 'and leaves the tonal tabs out');
  assert.equal(at(report, 'src/page.tsx', 4, 18).use, '@tanrei/react/m3-like');
  const clean = run('src/clean.ts');
  assert.equal(clean.status, 0, clean.stdout);
  assert.match(clean.stdout, /✔ "tanrei": 1 file\(s\), nothing the system does not have/);
  assert.equal(run('src/*.{ts,css}').status, 1, 'a brace in a glob');
});

test('audit: exit 2 when it cannot run — no file, no match, a system or a format it does not know, a layer that is not valid', () => {
  const { run, dir } = workspace();
  for (const args of [[], ['nothing'], ['nothing/*.ts'], ['src', '--system', 'nope'], ['src', '--format', 'xml']]) {
    const result = run(...args);
    assert.equal(result.status, 2, `${args.join(' ')}: ${result.stdout}`);
    assert.match(result.stderr, /^✖ /);
  }
  fs.writeFileSync(path.join(dir, 'broken.system.json'), JSON.stringify({ id: 'broken', extends: 'nowhere' }));
  assert.equal(run('src', '--system', 'broken.system.json').status, 2);
});
