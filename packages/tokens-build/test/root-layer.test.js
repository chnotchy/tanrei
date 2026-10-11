// The default system is read from tokens/ as it is written: tokens/systems/tanrei.system.json values only what is
// generated from it. A line there for any other token would change every system that extends the root and leave
// the default system as it was, without a word: the choice `link-underline: hover`, which the default system's own
// invariants refuse 18 times, would validate clean.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';
import { ROOT_SYSTEM, buildBundle, listSystems, shippedLayerProblems } from '../src/bundle.js';
import { REPO_ROOT, TOKENS_DIR } from '../src/model.js';
import { loadSystem, sourceFiles } from '../src/scheme.js';

leavesNothingBehind(after);

const CHOICE = 'tanrei.sys.behavior.link-underline';
const DIAL = 'tanrei.dial.type.base';
const withLines = (lines) => {
  const root = loadSystem(REPO_ROOT);
  return { ...root, tokens: { ...root.tokens, ...lines } };
};
const read = (root) => (id) => (id === ROOT_SYSTEM ? root : loadSystem(REPO_ROOT, id));

test('the shipped layers have no such line, and the root layer’s bundle is the vocabulary as written', () => {
  assert.deepEqual(shippedLayerProblems(REPO_ROOT), []);
  // What the refusal protects: built as a layer, the root gives exactly the documents the default system is read from.
  const { files } = buildBundle(REPO_ROOT, [loadSystem(REPO_ROOT)]);
  for (const [name, doc] of Object.entries(sourceFiles(REPO_ROOT))) {
    const built = name === 'dial/dial.tokens.json' ? (({ $extensions, ...rest }) => rest)(files[name]) : files[name];
    assert.deepEqual(built, doc, name);
  }
});

test('a choice of kind written in the root layer is refused, and the message says where the default system’s choice is set', () => {
  const problems = shippedLayerProblems(REPO_ROOT, read(withLines({ [CHOICE]: { $value: 'hover', reason: 'The default system shows the line under the pointer only.' } })));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /^tanrei\.sys\.behavior\.link-underline: the root layer "tanrei" cannot set this token/);
  assert.match(problems[0], /tokens\/sys\/behavior\.tokens\.json/);
  assert.match(problems[0], /"always"/);
});

test('a plain value written in the root layer is refused the same way', () => {
  const problems = shippedLayerProblems(REPO_ROOT, read(withLines({ [DIAL]: { $value: { value: 18, unit: 'px' }, reason: 'A larger default text size.' } })));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /^tanrei\.dial\.type\.base: the root layer "tanrei" cannot set this token/);
  assert.match(problems[0], /tokens\/dial\/dial\.tokens\.json/);
});

// The other door: a declaration under "vocabulary".
const STEP = 'tanrei.sys.space.space1200';
const declaration = { $type: 'dimension', rationale: 'One product needs a wider gap between the sections of a long page.', derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 12 } };

test('a step declared in the root layer’s vocabulary is refused: the schema allows it, every system that extends the root would ship it, and the default system would not', () => {
  const root = { ...loadSystem(REPO_ROOT), vocabulary: { [STEP]: declaration } };
  // What the refusal prevents: the chain [root] holds the step, and the documents the default system is read from do not.
  const { files } = buildBundle(REPO_ROOT, [root]);
  assert.deepEqual(files['sys/space.tokens.json'].tanrei.sys.space.space1200.$value, { value: 96, unit: 'px' });
  assert.equal(sourceFiles(REPO_ROOT)['sys/space.tokens.json'].tanrei.sys.space.space1200, undefined);

  const problems = shippedLayerProblems(REPO_ROOT, read(root));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /^tanrei\.sys\.space\.space1200: the root layer "tanrei" cannot declare this token under "vocabulary"/);
  assert.match(problems[0], /tokens\/sys\/space\.tokens\.json/);
  assert.match(problems[0], /with its one-product rationale/);
  assert.match(problems[0], /An extension belongs to a layer that extends "tanrei"/);
});

test('the shipped presets declare vocabulary and are not named: the refusal is the root layer’s alone', () => {
  const others = listSystems(REPO_ROOT).filter((id) => id !== ROOT_SYSTEM);
  assert.ok(others.some((id) => Object.keys(loadSystem(REPO_ROOT, id).vocabulary ?? {}).some((token) => !token.startsWith('tanrei.sys.color.'))), 'a shipped preset declares a token that is not a color role');
  assert.equal(loadSystem(REPO_ROOT).vocabulary, undefined, 'and the shipped root layer declares nothing');
  assert.deepEqual(shippedLayerProblems(REPO_ROOT), []);
});

test('only the root layer is held to it: every other shipped layer sets such tokens, and is not named', () => {
  const others = listSystems(REPO_ROOT).filter((id) => id !== ROOT_SYSTEM);
  assert.ok(others.some((id) => Object.keys(loadSystem(REPO_ROOT, id).tokens ?? {}).some((token) => token.startsWith('tanrei.dial.'))), 'a shipped preset sets a dial');
  assert.deepEqual(shippedLayerProblems(REPO_ROOT), []);
});

test('validate refuses the line (it does not print "tokens valid" and exit 0), and writes nothing', () => {
  // A copy of the vocabulary without its generated documents: the check runs before anything is generated.
  const dir = tempDir('root-layer');
  fs.cpSync(TOKENS_DIR, path.join(dir, 'tokens'), { recursive: true, filter: (source) => path.relative(TOKENS_DIR, source).split(path.sep)[0] !== 'generated' });
  const file = path.join(dir, 'tokens/systems/tanrei.system.json');
  const root = JSON.parse(fs.readFileSync(file, 'utf8'));
  root.tokens[CHOICE] = { $value: 'hover', reason: 'The default system shows the line under the pointer only.' };
  fs.writeFileSync(file, JSON.stringify(root, null, 2));
  const cli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/cli.js');
  for (const command of ['validate', 'generate']) {
    const result = spawnSync(process.execPath, [cli, command], { encoding: 'utf8', env: { ...process.env, TANREI_VOCABULARY_ROOT: dir } });
    assert.equal(result.status, 1, `${command}: ${result.stdout}${result.stderr}`);
    assert.match(result.stderr, /1 system layer problem\(s\):\n\s+- tanrei\.sys\.behavior\.link-underline: the root layer "tanrei" cannot set this token/, command);
    assert.doesNotMatch(result.stdout, /tokens valid/, command);
    assert.ok(!fs.existsSync(path.join(dir, 'tokens/generated')), `${command} writes nothing`);
  }
});
