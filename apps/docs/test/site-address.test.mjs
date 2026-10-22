// The site's address is `site` of tanrei.config.json, and no code of the docs writes it again: the build's `site` (the
// canonical URLs, the sitemap, robots.txt) and the origin the link step counts as the site's own are read from it. A
// page's prose that gives the address gives that one.
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

/** Every file of the docs that may hold an address, relative to the docs' root. */
function docsFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.astro'].includes(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(astro|mjs|js|ts|json|md|mdx|txt|css|html|yml|toml)$/.test(entry.name)) out.push(path.relative(docsRoot, file));
    }
  };
  walk(docsRoot);
  return out;
}
/** The pages' prose: text a reader reads or copies whole (the AGENTS.md block of the AI agents guide names the site). */
const isContent = (file) => file.startsWith(`src${path.sep}content${path.sep}`);
const read = (file) => fs.readFileSync(path.join(docsRoot, file), 'utf8');

test('no code or configuration of the docs writes the address itself', () => {
  const host = new URL(site).host;
  assert.deepEqual(docsFiles().filter((file) => !isContent(file) && read(file).includes(host)), []);
});

test('a page that names the site names tanrei.config.json’s site', () => {
  // A page's prose may give the address in words a reader copies; then it is the configured one, so a change of
  // `site` fails here until the pages follow. An address is the site's when its host carries the namespace.
  const { namespace } = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tanrei.config.json', import.meta.url)), 'utf8'));
  const found = [];
  for (const file of docsFiles().filter(isContent)) {
    for (const [address] of read(file).matchAll(/https?:\/\/[a-z0-9.-]+/gi)) {
      const { host, origin } = new URL(address);
      if (host.split('.').includes(namespace) && origin !== new URL(site).origin) found.push(`${file}: ${address}`);
    }
  }
  assert.deepEqual(found, []);
});
