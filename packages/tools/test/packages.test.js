// What a published package carries besides its code: the repository's LICENSE and NOTICE, a `files` list that ships
// the NOTICE, the repository it was published from — and, beside anything a build bundled, the licences of that.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { validatePackages } from '../src/checks.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';
import { bundledPackages, thirdPartyLicenses, writeThirdPartyLicenses } from '../src/third-party.js';

leavesNothingBehind(after);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REPOSITORY = 'https://github.com/chnotchy/tanrei.git';

/** A repository in memory: path → text. */
function check(files) {
  return validatePackages({ dirs: ['pkg'], exists: (rel) => rel in files, read: (rel) => files[rel], repository: REPOSITORY });
}
const good = () => ({
  LICENSE: 'the licence',
  NOTICE: 'the notice',
  'packages/pkg/LICENSE': 'the licence',
  'packages/pkg/NOTICE': 'the notice',
  'packages/pkg/package.json': JSON.stringify({ name: '@x/pkg', files: ['dist', 'NOTICE'], repository: { type: 'git', url: REPOSITORY, directory: 'packages/pkg' } }),
});

test('a publishable package carries the LICENSE and the NOTICE, ships the NOTICE, and names its repository', () => {
  assert.deepEqual(check(good()), []);

  const noNotice = good();
  delete noNotice['packages/pkg/NOTICE'];
  assert.deepEqual(check(noNotice), ["packages/pkg: publishable, but has no NOTICE file (copy the repository's)"]);

  const staleNotice = { ...good(), 'packages/pkg/NOTICE': 'an older notice' };
  assert.deepEqual(check(staleNotice), ["packages/pkg/NOTICE differs from the repository's NOTICE"]);

  const noLicense = good();
  delete noLicense['packages/pkg/LICENSE'];
  assert.deepEqual(check(noLicense), ["packages/pkg: publishable, but has no LICENSE file (copy the repository's)"]);

  // npm always ships LICENSE, but NOTICE only when `files` lists it.
  const unlisted = { ...good(), 'packages/pkg/package.json': JSON.stringify({ ...JSON.parse(good()['packages/pkg/package.json']), files: ['dist'] }) };
  assert.deepEqual(check(unlisted), ['packages/pkg/package.json: "files" does not list NOTICE, so npm would not ship it']);

  const elsewhere = { ...good(), 'packages/pkg/package.json': JSON.stringify({ ...JSON.parse(good()['packages/pkg/package.json']), repository: { url: 'https://github.com/someone/fork.git', directory: 'packages/pkg' } }) };
  assert.deepEqual(check(elsewhere), [`packages/pkg/package.json: "repository" must be { "url": "${REPOSITORY}", "directory": "packages/pkg" }`]);

  // A private package is never published: nothing is asked of it.
  const unpublished = { 'packages/pkg/package.json': JSON.stringify({ name: '@x/pkg', private: true }) };
  assert.deepEqual(check(unpublished), []);
});

test('every package of the repository passes', () => {
  assert.deepEqual(validatePackages(), []);
  // The premise: the five npm packages are among those checked.
  for (const dir of ['web', 'react', 'token-engine', 'cli', 'mcp']) assert.ok(!JSON.parse(fs.readFileSync(path.join(repo, 'packages', dir, 'package.json'), 'utf8')).private, dir);
});

test('the licences of what a build bundles: one entry per installed package, the workspace left to LICENSE and NOTICE', () => {
  const web = createRequire(path.join(repo, 'packages/web/package.json'));
  const lit = fs.realpathSync(web.resolve('lit'));
  const own = path.join(repo, 'packages/web/src/index.ts');
  const found = bundledPackages([lit, lit, own, '\0virtual:module']);
  assert.deepEqual(found.map((p) => p.name), ['lit']);
  assert.equal(found[0].license, 'BSD-3-Clause');
  assert.match(found[0].licenseText, /Copyright \(c\) 2017 Google LLC/);

  const { text, packages } = thirdPartyLicenses([own, lit], { what: 'The bundle', notes: { lit: 'A note about lit.' } });
  assert.equal(packages.length, 1);
  assert.match(text, /^# Third-party licences\n\nThe bundle includes/);
  assert.match(text, /\n## lit 3\.\d+\.\d+ \(BSD-3-Clause\)\n\nA note about lit\.\n\n```\n/);

  // Nothing third-party: no file, and a stale one is removed.
  const out = tempDir('third-party');
  fs.writeFileSync(path.join(out, 'THIRD_PARTY_LICENSES.md'), 'stale');
  assert.deepEqual(writeThirdPartyLicenses(out, [own], { what: 'x' }), []);
  assert.ok(!fs.existsSync(path.join(out, 'THIRD_PARTY_LICENSES.md')));
  assert.equal(writeThirdPartyLicenses(out, [lit], { what: 'x' }).length, 1);
  assert.match(fs.readFileSync(path.join(out, 'THIRD_PARTY_LICENSES.md'), 'utf8'), /## lit /);

  // A bundled package with no licence file to reproduce stops the build; its NOTICE is printed when it has one.
  const bare = path.join(out, 'node_modules/bare');
  fs.mkdirSync(bare, { recursive: true });
  fs.writeFileSync(path.join(bare, 'package.json'), JSON.stringify({ name: 'bare', version: '1.0.0', license: 'MIT' }));
  fs.writeFileSync(path.join(bare, 'index.js'), '');
  assert.throws(() => bundledPackages([path.join(bare, 'index.js')]), /bare@1\.0\.0 \(MIT\) is bundled but carries no licence file/);
  fs.writeFileSync(path.join(bare, 'LICENSE'), 'Apache licence text');
  fs.writeFileSync(path.join(bare, 'NOTICE'), 'Bare\nCopyright Someone');
  assert.match(thirdPartyLicenses([path.join(bare, 'index.js')], { what: 'x' }).text, /NOTICE of bare:\n\n```\nBare\nCopyright Someone\n```/);
});
