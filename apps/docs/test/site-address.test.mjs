// The site's address is `site` of tanrei.config.json, and nothing of the docs writes it again: the build's `site` (the
// canonical URLs, the sitemap, robots.txt) and the origin the link step counts as the site's own are read from it.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SITE } from '../links.config.mjs';
import { configure, docsRoot } from './site-pipeline.mjs';

const { site } = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tanrei.config.json', import.meta.url)), 'utf8'));

test('the build’s site is tanrei.config.json’s', async () => {
  const { config } = await configure();
  assert.equal(new URL(config.site).href, new URL(site).href);
});

test('the link step’s own origin is tanrei.config.json’s site', () => {
  assert.deepEqual(SITE, [site]);
});

test('no file of the docs writes the address itself', () => {
  const host = new URL(site).host;
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.astro'].includes(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(astro|mjs|js|ts|json|md|mdx|txt|css|html|yml|toml)$/.test(entry.name) && fs.readFileSync(file, 'utf8').includes(host)) found.push(path.relative(docsRoot, file));
    }
  };
  walk(docsRoot);
  assert.deepEqual(found, []);
});
