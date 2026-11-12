// The published CLI carries its own copy of the vocabulary (scripts/vocabulary.js), without what it never reads. This
// file proves the copy is enough the only way that holds for a path built at run time: it runs one fixed set of
// commands in two identical products, once against the repository and once against the copy.
//   1. Every path the run against the repository touches (traced, packages/tools/src/read-trace.js) is in the copy.
//   2. Every command prints the same, exits the same, and writes the same files, byte for byte.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UNREAD_TOKEN_ENTRIES } from '../../tools/src/packed-vocabulary.js';
import { readTrace } from '../../tools/src/read-trace.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';
import { writeVocabulary } from '../scripts/vocabulary.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const bin = path.join(pkg, 'bin/tanrei.js');
const tracer = pathToFileURL(path.join(repo, 'packages/tools/src/read-trace.js')).href;
/**
 * A path under the repository that is code, not vocabulary: run from the sources, the CLI loads its modules, its
 * packages' manifests and tanrei.config.json (a JSON import, which the bundle inlines) from there.
 */
const isCode = (relative) => /\.[cm]?js$/.test(relative) || path.basename(relative) === 'package.json' || relative === 'tanrei.config.json' || relative.split(path.sep).includes('node_modules');

const work = tempDir('cli-packed');
const copy = path.join(work, 'vocabulary');
const OUTPUTS = { tokens: 'out/tokens', web: 'out/web', swiftui: 'out/ios', compose: 'out/android', flutter: 'out/flutter', 'react-native': 'out/rn', tailwind: 'out/web', shadcn: 'out/web' };
const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'packages/tokens-build/generated/component-catalog.json'), 'utf8')).components;

/** A product in `dir`: a layer that leaves a component out, the pipeline's fixture that extends the vocabulary in every way, and a page to audit. */
function writeProduct(dir) {
  fs.mkdirSync(path.join(dir, 'design'), { recursive: true });
  const acme = { id: 'acme', name: 'Acme', extends: 'tanrei', palettes: { correct: { description: 'A right answer in a quiz.', source: { seed: '#0f766e' }, roles: 'intent' } }, tokens: { 'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' }, reason: 'Read at arm’s length.' } }, components: { omit: { 'text-field': { reason: 'The product only shows text, it never asks for any.', insteadUse: ['button'] } } } };
  fs.writeFileSync(path.join(dir, 'design/acme.system.json'), JSON.stringify(acme, null, 2));
  fs.writeFileSync(path.join(dir, 'tanrei.json'), JSON.stringify({ system: 'design/acme.system.json', kotlinPackage: 'com.acme.design', outputs: OUTPUTS }));
  fs.mkdirSync(path.join(dir, 'extended'));
  fs.copyFileSync(path.join(repo, 'packages/tokens-build/test/fixtures/acme.system.json'), path.join(dir, 'extended/acme.system.json'));
  fs.writeFileSync(path.join(dir, 'extended/tanrei.json'), JSON.stringify({ system: 'acme.system.json', kotlinPackage: 'com.acme.design', outputs: OUTPUTS }));
  fs.writeFileSync(path.join(dir, 'page.html'), `${catalog.map(({ name }) => `<tanrei-${name} variant="outlined"></tanrei-${name}>`).join('\n')}\n<tanrei-nope></tanrei-nope>\n`);
  fs.mkdirSync(path.join(dir, 'fresh'));
}

/** The commands, each with the directory it runs in (relative to the product). */
const COMMANDS = [
  ['.', ['help']],
  ['.', ['systems']],
  ['.', ['validate']],
  ['.', ['build']],
  ['.', ['build', '--check']],
  ['.', ['explain', 'tanrei.comp.button.container.height.medium']],
  ['.', ['explain', 'tanrei.dial.type.base']],
  ['.', ['explain', 'tanrei.sys.color.primary']],
  ['.', ['audit', 'page.html']],
  ['.', ['audit', 'page.html', '--format', 'json']],
  ['.', ['audit', 'page.html', '--system', 'cupertino', '--format', 'json']],
  ['.', ['audit', 'page.html', '--system', 'm3-expressive-like']],
  ['extended', ['validate']],
  ['extended', ['build']],
  ['extended', ['explain', 'acme.comp.rating.gap']],
  ['fresh', ['init', 'shop', '--extends', 'cupertino']],
  ['fresh', ['build']],
];

/** Every command in a new product against the vocabulary at `root`: what each printed, and every file the product holds afterwards. */
function runAll(root, name) {
  const dir = path.join(work, name);
  const log = path.join(work, `${name}.log`);
  writeProduct(dir);
  const env = { ...process.env, TANREI_CLI_FROM_SOURCE: '1', TANREI_VOCABULARY_ROOT: root, TANREI_READ_TRACE: log };
  const printed = COMMANDS.map(([at, args]) => {
    const result = spawnSync(process.execPath, ['--import', tracer, bin, ...args], { cwd: path.join(dir, at), encoding: 'utf8', env });
    return { command: `${at}: tanrei ${args.join(' ')}`, status: result.status, stdout: result.stdout, stderr: result.stderr };
  });
  const files = Object.fromEntries(
    fs
      .readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
      .map((file) => [path.relative(dir, file), fs.readFileSync(file, 'utf8')])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return { printed, files, trace: readTrace(log) };
}

let full;
let packed;
before(() => {
  writeVocabulary(repo, copy);
  full = runAll(repo, 'from-repository');
  packed = runAll(copy, 'from-copy');
});
leavesNothingBehind(after);

test('the copy leaves out what the CLI never reads', () => {
  for (const entry of UNREAD_TOKEN_ENTRIES) {
    assert.ok(fs.existsSync(path.join(repo, 'tokens', entry)), `tokens/${entry} is in the repository`);
    assert.ok(!fs.existsSync(path.join(copy, 'tokens', entry)), `tokens/${entry} is not in the copy`);
  }
});

test('every path the CLI touches in the repository is in the copy', (t) => {
  const touched = full.trace.filter((file) => file.startsWith(`${repo}${path.sep}`)).map((file) => path.relative(repo, file)).filter((file) => !isCode(file));
  assert.ok(touched.some((file) => file.startsWith(`tokens${path.sep}`)), `the trace saw the run (${touched.length} paths)`);
  const missing = touched.filter((file) => fs.existsSync(path.join(repo, file)) && !fs.existsSync(path.join(copy, file)));
  assert.deepEqual(missing, [], 'touched in the repository, absent from the copy');
  for (const entry of UNREAD_TOKEN_ENTRIES) assert.ok(!touched.some((file) => file === path.join('tokens', entry) || file.startsWith(path.join('tokens', entry) + path.sep)), `tokens/${entry} is never touched`);
  const outside = packed.trace.filter((file) => file.startsWith(`${repo}${path.sep}`) && !isCode(path.relative(repo, file)));
  assert.deepEqual(outside, [], 'the copy is read, not the repository');
  const opened = new Set(packed.trace);
  const unopened = fs.readdirSync(copy, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath ?? entry.path, entry.name)).filter((file) => !opened.has(file));
  t.diagnostic(`touched in the repository: ${touched.length} paths; in the copy, not opened by these commands: ${unopened.map((file) => `${path.relative(copy, file)} (${fs.statSync(file).size} B)`).join(', ') || 'none'}`);
});

test('every command prints, exits and writes the same from the copy as from the repository', (t) => {
  for (const [index, ran] of full.printed.entries()) assert.deepEqual(packed.printed[index], ran, ran.command);
  assert.deepEqual(Object.keys(packed.files), Object.keys(full.files));
  for (const [file, text] of Object.entries(full.files)) assert.equal(packed.files[file], text, file);
  // Not a vacuous run: the builds wrote every platform, and the commands meant to succeed did.
  assert.ok(Object.keys(full.files).filter((file) => file.startsWith(`out${path.sep}`)).length > 10, Object.keys(full.files).join(', '));
  t.diagnostic(full.printed.map(({ command, status }) => `${command} → ${status}`).join(' | '));
  t.diagnostic(`${Object.keys(full.files).length} files compared`);
});
