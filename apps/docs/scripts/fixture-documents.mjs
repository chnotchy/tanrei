#!/usr/bin/env node
// The web package's own fixture documents, written for the site's build: `src/fixture-documents.generated.json`
// (ignored by git, written again before every `dev`, `build`, `validate` and `test:node`).
//
// The web package's tests draw every fixture in a document of its own and take each baseline from it
// (packages/web/test/harness.ts, `fixturesDocument`). The site draws a fixture from that same document where it draws
// it alone, in a window of the fixtures' gallery (components/fixtures/FixtureGallery.astro): so what a reader sees
// there is what every platform's baseline is compared with, the staging included — the width of a stage, the anchor a
// tooltip stands beside, the sample screen a drop zone wraps, the step a file upload takes in script — and a spec the
// site's own renderer cannot draw (src/lib/fixtures.ts) is drawn all the same.
//
// The harness is TypeScript that reads the repository relative to its own file, so it is run here, by Node, and not
// inside the site's build, which bundles the modules it runs. Each document is taken apart into what the fixtures page
// needs — its stylesheets, its stages, its step in script — and the size of each fixture's stage is read from its
// baseline (packages/web/snapshots/<spec>/<id>.png: a picture of the stage at a device pixel ratio of 2).
//
//   node scripts/fixture-documents.mjs        (needs packages/web/dist: `pnpm --filter @tanrei/web build`)
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

register('../test/vite-shim.mjs', import.meta.url);
const docs = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(docs, '../..');
const out = path.join(docs, 'src/fixture-documents.generated.json');
if (!fs.existsSync(path.join(repo, 'packages/web/dist/tokens.css'))) {
  console.error('✖ fixture documents: packages/web/dist is missing; run `pnpm --filter @tanrei/web build` first');
  process.exit(1);
}
const { fixturesDocument, loadSpec } = await import('../../../packages/web/test/harness.ts');

/** The asset addresses the document is written with; none is kept (the fixtures page loads the site's own). */
const NONE = { font: 'about:blank', tokens: 'about:blank', system: () => 'about:blank', icons: () => 'about:blank', bundle: 'about:blank' };

/** A document taken apart: its head's stylesheets, the element that holds the stages, each stage, the step in script. */
function parts(html) {
  const head = html.slice(0, html.indexOf('</head>'));
  const styles = (head.match(/<style>[\s\S]*?<\/style>/g) ?? []).map((style) => style.slice('<style>'.length, -'</style>'.length)).join('\n');
  const page = /<body>[^<]*<div class="stages">/.test(html);
  const open = page ? '<div class="stages">' : '<main>';
  const from = html.indexOf(open) + open.length;
  const to = html.lastIndexOf(page ? '</div><script' : '</main>');
  // Stages are written one to a line; a stage's own markup never begins a line with another stage.
  const stages = html
    .slice(from, to)
    .split(/\n(?=<div class="stage" )/)
    .map((stage) => stage.trim())
    .map((stage) => ({ id: /^<div class="stage" data-fixture="([^"]+)"/.exec(stage)?.[1], html: stage }))
    .filter((stage) => stage.id);
  const after = /<script type="module">\s*(const after = [\s\S]*?)<\/script>/.exec(html.slice(to))?.[1];
  return { styles, page, stages, after };
}

/** The size of a fixture's stage in CSS pixels, read from its baseline's IHDR chunk; nothing where it has none. */
function baseline(spec, id) {
  const file = path.join(repo, 'packages/web/snapshots', spec, `${id}.png`);
  if (!fs.existsSync(file)) return undefined;
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, header, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.toString('ascii', 12, 16) !== 'IHDR') return undefined;
  return { width: Math.round(header.readUInt32BE(16) / 2), height: Math.round(header.readUInt32BE(20) / 2) };
}

const documents = {};
const failed = [];
for (const file of fs.readdirSync(path.join(repo, 'specs')).filter((name) => name.endsWith('.spec.json')).sort()) {
  const name = file.slice(0, -'.spec.json'.length);
  try {
    const spec = loadSpec(name);
    if (!spec.platforms?.web || spec.platforms.web.status === 'planned') continue;
    const document = parts(await fixturesDocument(spec, { assets: NONE }));
    documents[name] = { ...document, sizes: Object.fromEntries(document.stages.map((stage) => [stage.id, baseline(name, stage.id)]).filter(([, size]) => size)) };
  } catch (error) {
    failed.push(`${name}: ${String(error).split('\n')[0]}`);
  }
}
fs.writeFileSync(out, JSON.stringify(documents));
console.log(`✔ fixture documents: ${path.relative(docs, out)} (${Object.keys(documents).length} components)`);
for (const line of failed) console.warn(`  not written: ${line}`);
