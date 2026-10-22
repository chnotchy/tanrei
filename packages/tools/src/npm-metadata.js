#!/usr/bin/env node
// What npm shows of a package beside its name and description — its homepage, where its bugs are reported, the words
// it is found by and, for the MCP server, its name in the MCP registry — written into each package.json by
// `pnpm generate` from tanrei.config.json (`site`, `repository`, `namespace`) and docs/registries/npm-keywords.json.
// For the MCP server it also writes the server.json that `mcp-publisher publish` sends to the MCP registry: the same
// name, the package's version, and how a client runs it. No name, address or version is typed into either file: a
// fork or a renamed site changes one file, a release's version bump is copied by `pnpm version-packages`, and the
// drift check fails while a package.json or a server.json disagrees with them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, REPO_ROOT } from './conventions.js';

export const REGISTRY = 'docs/registries/npm-keywords.json';

/**
 * The server.json format this writes: the MCP registry's latest released schema (its changelog,
 * docs/reference/server-json/CHANGELOG.md in modelcontextprotocol/registry). A copy of it is in
 * packages/tools/test/fixtures/mcp-registry/, which the test validates against; a newer format changes both.
 */
export const MCP_SERVER_SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json';

/** The only npm registry the MCP registry accepts a package from. */
const NPM_REGISTRY = 'https://registry.npmjs.org';

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

/**
 * The server.json of the MCP server in `dir`: its name in the registry (the package's `mcpName`, which the registry
 * checks against the package on npm), the title and description of its registry entry, and one npm package run over
 * stdio at exactly the package's version — a version the registry accepts once, so each npm release is listed anew.
 * The registry (mcp-publisher 1.8.1) refuses a dotted version with an `x` anywhere in it, which it takes for a
 * wildcard range: a `-next.N` prerelease is refused for that reason, and the first version it lists is one whose
 * prerelease tag has no `x` (or a release). `mcp-publisher validate` reports it before a publish.
 */
export function serverJson(dir, entry, manifest, config = CONFIG) {
  const { title, description } = entry.mcpServer;
  if (!title || !description) throw new Error(`${REGISTRY}: "${dir}".mcpServer needs a "title" and a "description"`);
  const { mcpName, homepage } = metadata(dir, entry, config);
  return {
    $schema: MCP_SERVER_SCHEMA,
    name: mcpName,
    title,
    description,
    repository: { url: `https://github.com/${config.repository.public}`, source: 'github', subfolder: `packages/${dir}` },
    websiteUrl: homepage,
    version: manifest.version,
    packages: [{ registryType: 'npm', registryBaseUrl: NPM_REGISTRY, identifier: manifest.name, version: manifest.version, transport: { type: 'stdio' } }],
  };
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

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Every package.json of the registry, and the server.json of each MCP server, as `pnpm generate` writes them: path → text. */
export function npmMetadataFiles() {
  const { packages } = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, REGISTRY), 'utf8'));
  return Object.fromEntries(
    Object.entries(packages).flatMap(([dir, entry]) => {
      const rel = `packages/${dir}/package.json`;
      if (!fs.existsSync(path.join(REPO_ROOT, rel))) throw new Error(`${REGISTRY}: "${dir}" has no ${rel}`);
      if (!docsPage(entry.docs)) throw new Error(`${REGISTRY}: "${dir}".docs is ${entry.docs}, a page the docs site does not have`);
      const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
      if (manifest.private) throw new Error(`${REGISTRY}: "${dir}" is private, and is never published`);
      const files = [[rel, json(place(manifest, metadata(dir, entry)))]];
      if (entry.mcpServer) files.push([`packages/${dir}/server.json`, json(serverJson(dir, entry, manifest))]);
      return files;
    }),
  );
}

/** The package.json and server.json files this writes: the drift check compares them. */
export const npmMetadataOutputs = () =>
  Object.entries(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, REGISTRY), 'utf8')).packages).flatMap(([dir, entry]) => [
    `packages/${dir}/package.json`,
    ...(entry.mcpServer ? [`packages/${dir}/server.json`] : []),
  ]);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [rel, text] of Object.entries(npmMetadataFiles())) fs.writeFileSync(path.join(REPO_ROOT, rel), text);
  console.log(`✔ npm metadata: ${npmMetadataOutputs().join(', ')}`);
}
