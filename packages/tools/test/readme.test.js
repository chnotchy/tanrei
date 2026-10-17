// The READMEs: what their status blocks say (src/readme.js), and what every README a registry shows holds to — short
// enough for npm to show it whole, and never saying that a published package is not published.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { CONFIG, REPO_ROOT } from '../src/conventions.js';
import { BEGIN, END, READMES, block, counts, readmeFiles, release, splice } from '../src/readme.js';
import { buildStatus } from '../src/status.js';

/** npm shows the first 65,536 characters of a README; a README stays well under that. */
const LIMIT = 60 * 1024;

/** Words a README of a published package must not say of it. */
const UNRELEASED = [/not on npm/i, /not on a registry/i, /nothing has been released/i, /until the first release/i];

/**
 * READMEs of published packages not yet rewritten, each with what is missing. The list only shrinks: a README rewritten
 * and still listed fails as surely as a new one that breaks the rules.
 */
const NOT_YET = {
  'packages/react/README.md':
    'still opens with the paragraph that says the package is not on npm, and carries no status block; it is rewritten with the next change to packages/react',
};

const paused = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages/tools/paused-platforms.json'), 'utf8')).paused;

/** The README of every package a release publishes: not `private`, and not of a paused platform (release.yml's rule). */
function publishedReadmes() {
  return fs
    .readdirSync(path.join(REPO_ROOT, 'packages'))
    .filter((dir) => fs.existsSync(path.join(REPO_ROOT, 'packages', dir, 'package.json')))
    .filter((dir) => !JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages', dir, 'package.json'), 'utf8')).private && !paused.includes(dir))
    .map((dir) => `packages/${dir}/README.md`);
}

const status = (totals) => ({ platforms: Object.keys(totals), totals });
const zero = { planned: 0, lagging: 0, alpha: 0, beta: 0, stable: 0, deprecated: 0 };

test('a version is a release, or a prerelease of one under its dist-tag', () => {
  assert.deepEqual(release('0.1.0-next.0'), { version: '0.1.0-next.0', prerelease: true, tag: 'next', release: '0.1.0' });
  assert.deepEqual(release('0.1.0'), { version: '0.1.0', prerelease: false, tag: 'latest', release: '0.1.0' });
  assert.deepEqual(release('1.2.0-rc.3'), { version: '1.2.0-rc.3', prerelease: true, tag: 'rc', release: '1.2.0' });
});

test('a count names each status a platform has, the most finished first, and none it has not', () => {
  assert.equal(counts({ ...zero, lagging: 83, alpha: 7 }), '7 alpha · 83 lagging');
  assert.equal(counts({ ...zero, stable: 2, planned: 1 }), '2 stable · 1 planned');
});

test('a prerelease says what to install until the release; a release says nothing of it', () => {
  const s = status({ web: { ...zero, alpha: 3 } });
  const pre = block({ kind: 'package' }, { status: s, paused: [], pkg: '@x/cli', version: '0.1.0-next.4' });
  assert.match(pre, /`0\.1\.0-next\.4` is published under the npm dist-tag `next`: until `0\.1\.0`, install `@x\/cli@next`/);
  const done = block({ kind: 'package' }, { status: s, paused: [], pkg: '@x/cli', version: '0.1.0' });
  assert.doesNotMatch(done, /Prerelease|@next/);
});

test("the repository's block has every platform's counts, the meaning of each status it shows, and which platforms are paused", () => {
  const s = status({ web: { ...zero, alpha: 7, lagging: 83 }, swiftui: { ...zero, lagging: 29, planned: 61 } });
  const text = block({ kind: 'repository' }, { status: s, paused: ['swiftui'], pkg: null, version: '0.1.0' });
  assert.match(text, /\| Web Components \| .* \| 7 alpha · 83 lagging \|/);
  assert.match(text, /\| SwiftUI \(paused\) \| .* \| 29 lagging · 61 planned \|/);
  for (const name of ['alpha', 'lagging', 'planned']) assert.match(text, new RegExp(`\\*${name}\\*: `));
  assert.doesNotMatch(text, /\*stable\*/, 'a status no platform has is not explained');
  assert.match(text, /\*\*Paused:\*\* SwiftUI — not built by CI and not published until it catches up/);
  assert.doesNotMatch(block({ kind: 'repository' }, { status: s, paused: [], pkg: null, version: '0.1.0' }), /Paused/);
});

test('a block is written between its markers, and a README without them is refused', () => {
  assert.equal(splice(`# x\n\n${BEGIN}\nold\n\n${END}\n\ntext\n`, 'new'), `# x\n\n${BEGIN}\nnew\n\n${END}\n\ntext\n`);
  assert.throws(() => splice('# x\n', 'new', 'packages/x/README.md'), /packages\/x\/README\.md: no status block/);
});

test("every README's status block is what `pnpm generate` writes now", () => {
  for (const [rel, text] of Object.entries(readmeFiles(buildStatus()))) {
    assert.equal(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'), text, `${rel} is stale: run pnpm generate`);
  }
});

test('the README of every published package, and the repository\'s, is short enough for npm to show whole and never says it is unreleased', () => {
  const readmes = ['README.md', ...publishedReadmes()];
  // The premise: the npm packages are among them.
  for (const dir of ['web', 'react', 'cli', 'mcp', 'token-engine']) assert.ok(readmes.includes(`packages/${dir}/README.md`), dir);
  for (const rel of readmes) {
    if (rel in NOT_YET) continue;
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    assert.ok(Buffer.byteLength(text) < LIMIT, `${rel}: ${Buffer.byteLength(text)} bytes, over ${LIMIT}`);
    for (const words of UNRELEASED) assert.doesNotMatch(text, words, rel);
    assert.ok(rel in READMES, `${rel} has no status block: add it to READMES in src/readme.js`);
  }
  for (const [rel, missing] of Object.entries(NOT_YET)) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const fixed = Buffer.byteLength(text) < LIMIT && UNRELEASED.every((words) => !words.test(text)) && rel in READMES;
    assert.ok(!fixed, `${rel} is rewritten: take it out of NOT_YET (it was listed because it ${missing})`);
  }
});

test('the status block names the packages from tanrei.config.json', () => {
  const text = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
  for (const name of [`${CONFIG.packages.npmScope}/web`, CONFIG.packages.swiftPackage, `${CONFIG.packages.mavenGroup}:${CONFIG.packages.mavenArtifactPrefix}`, CONFIG.packages.pubPackage]) {
    assert.ok(text.includes(`\`${name}\``), name);
  }
});
