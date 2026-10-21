#!/usr/bin/env node
// What npm shows of a package beside its name and description — its homepage, where its bugs are reported, the words
// it is found by and, for the MCP server, its name in the MCP registry — written into each package.json by
// `pnpm generate` from tanrei.config.json (`site`, `repository`, `namespace`) and docs/registries/npm-keywords.json.
// No name or address is typed into a package.json: a fork or a renamed site changes one file, and the drift check
// fails while a package.json disagrees with them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, REPO_ROOT } from './conventions.js';

export const REGISTRY = 'docs/registries/npm-keywords.json';

/** The fields this writes, and the field each is placed after (a field a package.json lacks: at the end). */
const PLACES = [
  ['mcpName', 'name'],
  ['keywords', 'description'],
  ['homepage', 'repository'],
  ['bugs', 'homepage'],
];

/** The values for the package in `dir`, from its entry in the registry and the config. */
export function metadata(dir, entry, config = CONFIG) {
  if (!config.site) throw new Error('tanrei.config.json has no "site": the address of the docs site');
  const owner = config.repository.public.split('/')[0];
  const fields = {
    homepage: new URL(entry.docs, config.site).href,
    bugs: { url: `https://github.com/${config.repository.public}/issues` },
    keywords: [...new Set([...entry.keywords, config.namespace])],
  };
  if (entry.mcpServer) fields.mcpName = `io.github.${owner}/${config.namespace}`;
  return fields;
}

/** `manifest` with `fields` set, each in its place, and the fields this writes that `fields` lacks removed. */
export function place(manifest, fields) {
  const rest = Object.fromEntries(Object.entries(manifest).filter(([key]) => !PLACES.some(([field]) => field === key)));
  const out = {};
  const pending = new Map(PLACES.filter(([field]) => field in fields));
  const put = (key) => {
    for (const [field, after] of pending) {
      if (after !== key) continue;
      out[field] = fields[field];
      pending.delete(field);
      put(field);
    }
  };
  for (const [key, value] of Object.entries(rest)) {
    out[key] = value;
    put(key);
  }
  for (const [field] of pending) out[field] = fields[field];
  return out;
}

/** The address of a page of the docs site as its source file, or null where the site has no such page. */
function docsPage(address) {
  const base = path.join(REPO_ROOT, 'apps/docs/src/content/docs', address.replace(/^\/|\/$/g, ''));
  return [`${base}.mdx`, `${base}.md`, path.join(base, 'index.mdx')].find((file) => fs.existsSync(file)) ?? null;
}

/** Every package.json of the registry, as `pnpm generate` writes it: path → text. */
export function npmMetadataFiles() {
  const { packages } = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, REGISTRY), 'utf8'));
  return Object.fromEntries(
    Object.entries(packages).map(([dir, entry]) => {
      const rel = `packages/${dir}/package.json`;
      if (!fs.existsSync(path.join(REPO_ROOT, rel))) throw new Error(`${REGISTRY}: "${dir}" has no ${rel}`);
      if (!docsPage(entry.docs)) throw new Error(`${REGISTRY}: "${dir}".docs is ${entry.docs}, a page the docs site does not have`);
      const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
      if (manifest.private) throw new Error(`${REGISTRY}: "${dir}" is private, and is never published`);
      return [rel, `${JSON.stringify(place(manifest, metadata(dir, entry)), null, 2)}\n`];
    }),
  );
}

/** The package.json files this writes: the drift check compares them. */
export const npmMetadataOutputs = () => Object.keys(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, REGISTRY), 'utf8')).packages).map((dir) => `packages/${dir}/package.json`);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [rel, text] of Object.entries(npmMetadataFiles())) fs.writeFileSync(path.join(REPO_ROOT, rel), text);
  console.log(`✔ npm metadata: ${npmMetadataOutputs().join(', ')}`);
}
