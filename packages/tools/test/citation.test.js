// CITATION.cff (src/citation.js): a Citation File Format 1.2.0 document made from tanrei.config.json alone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import YAML from 'yaml';
import { CITATION, citation } from '../src/citation.js';
import { CONFIG, REPO_ROOT } from '../src/conventions.js';

const config = { name: 'Acme', version: '1.0.0', license: 'MIT', site: 'https://design.example.com', repository: { public: 'someone/acme' } };

test('the file is CFF 1.2.0 with the keys the format requires, every value from the config', () => {
  const cff = YAML.parse(citation(config));
  for (const key of ['cff-version', 'message', 'title', 'authors']) assert.ok(key in cff, key);
  assert.equal(cff['cff-version'], '1.2.0');
  assert.equal(cff.type, 'software');
  assert.equal(cff.title, 'Acme');
  assert.equal(cff['repository-code'], 'https://github.com/someone/acme');
  assert.equal(cff.url, 'https://design.example.com');
  assert.equal(cff.license, 'MIT');
  // A version that looks like a number stays a string.
  assert.equal(cff.version, '1.0.0');
  assert.ok(cff.keywords.length >= 5);
});

test("the one author is the repository's owner, by alias, and nothing else names a person", () => {
  const cff = YAML.parse(citation(config));
  assert.deepEqual(cff.authors, [{ alias: 'someone', website: 'https://github.com/someone' }]);
});

test('a config without a site is refused', () => {
  assert.throws(() => citation({ ...config, site: undefined }), /no "site"/);
});

test('CITATION.cff is what `pnpm generate` writes now, for the version of tanrei.config.json', () => {
  const text = fs.readFileSync(path.join(REPO_ROOT, CITATION), 'utf8');
  assert.equal(text, citation(), `${CITATION} is stale: run pnpm generate`);
  assert.equal(YAML.parse(text).version, CONFIG.version);
});
