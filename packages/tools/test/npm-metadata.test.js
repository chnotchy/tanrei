// What npm shows of each published package beside its name (src/npm-metadata.js): the values, where they stand in a
// package.json, and that every package a release publishes has them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { CONFIG, REPO_ROOT } from '../src/conventions.js';
import { metadata, npmMetadataFiles, place } from '../src/npm-metadata.js';

const config = { namespace: 'acme', site: 'https://design.example.com', repository: { public: 'someone/acme' } };

/**
 * Published packages not yet in docs/registries/npm-keywords.json, each with why. The list only shrinks: a package
 * given its metadata and still listed fails as surely as a new one without it.
 */
const NOT_YET = {
  react: 'its package.json is being changed by another change; its entry is added with the next change to packages/react',
};

const paused = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages/tools/paused-platforms.json'), 'utf8')).paused;
const manifestOf = (dir) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages', dir, 'package.json'), 'utf8'));

/** Every package a release publishes: not `private`, and not of a paused platform (release.yml's rule). */
const published = () =>
  fs
    .readdirSync(path.join(REPO_ROOT, 'packages'))
    .filter((dir) => fs.existsSync(path.join(REPO_ROOT, 'packages', dir, 'package.json')))
    .filter((dir) => !manifestOf(dir).private && !paused.includes(dir));

test('the homepage is the docs page on the site, the bugs are the issues, and the namespace is a keyword once', () => {
  assert.deepEqual(metadata('web', { docs: '/getting-started/web/', keywords: ['design-system', 'acme'] }, config), {
    homepage: 'https://design.example.com/getting-started/web/',
    bugs: { url: 'https://github.com/someone/acme/issues' },
    keywords: ['design-system', 'acme'],
  });
  assert.deepEqual(metadata('web', { docs: '/', keywords: ['a'] }, config).keywords, ['a', 'acme']);
});

test("an MCP server is named in the MCP registry by the repository's owner and the namespace", () => {
  assert.equal(metadata('mcp', { docs: '/', keywords: [], mcpServer: true }, config).mcpName, 'io.github.someone/acme');
  assert.equal(metadata('cli', { docs: '/', keywords: [] }, config).mcpName, undefined);
});

test('a config without a site is refused', () => {
  assert.throws(() => metadata('web', { docs: '/', keywords: [] }, { ...config, site: undefined }), /no "site"/);
});

test('each field stands after the one it belongs with, a stale one is dropped, and placing twice changes nothing', () => {
  const manifest = { name: '@x/a', version: '1.0.0', description: 'd', homepage: 'https://old.example.com', mcpName: 'stale', license: 'MIT', repository: { url: 'u' }, files: ['dist'] };
  const fields = { homepage: 'h', bugs: { url: 'b' }, keywords: ['k'] };
  const placed = place(manifest, fields);
  assert.deepEqual(Object.keys(placed), ['name', 'version', 'description', 'keywords', 'license', 'repository', 'homepage', 'bugs', 'files']);
  assert.equal(placed.homepage, 'h');
  assert.deepEqual(place(placed, fields), placed);
  assert.deepEqual(Object.keys(place({ name: 'x' }, fields)), ['name', 'keywords', 'homepage', 'bugs'], 'a missing anchor puts the field at the end');
});

test('every package.json is what `pnpm generate` writes now', () => {
  for (const [rel, text] of Object.entries(npmMetadataFiles())) {
    assert.equal(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'), text, `${rel} is stale: run pnpm generate`);
  }
});

test('every published package has a homepage on the site, its bugs, and five keywords or more', () => {
  const dirs = published();
  // The premise: the npm packages are among them.
  for (const dir of ['web', 'react', 'cli', 'mcp', 'token-engine']) assert.ok(dirs.includes(dir), dir);
  for (const dir of dirs) {
    const manifest = manifestOf(dir);
    const has = typeof manifest.homepage === 'string' && manifest.homepage.startsWith(CONFIG.site) && manifest.bugs?.url && (manifest.keywords?.length ?? 0) >= 5;
    if (dir in NOT_YET) {
      assert.ok(!has, `packages/${dir} has its metadata: take it out of NOT_YET (it was listed because ${NOT_YET[dir]})`);
      continue;
    }
    assert.ok(has, `packages/${dir}/package.json: no homepage on ${CONFIG.site}, no bugs, or fewer than five keywords — add it to docs/registries/npm-keywords.json`);
  }
  assert.equal(manifestOf('mcp').mcpName, `io.github.${CONFIG.repository.public.split('/')[0]}/${CONFIG.namespace}`);
});

test('the site is an https address with no path', () => {
  const url = new URL(CONFIG.site);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.pathname, '/');
});
