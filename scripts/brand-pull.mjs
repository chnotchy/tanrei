#!/usr/bin/env node
// Refreshes the brand marks (design/brand/<mark>.svg) from the Figma library, then regenerates what is derived from
// them. One command for when a mark changes in Figma:
//
//   FIGMA_TOKEN=… pnpm brand:pull
//       renders each node design/brand/figma.json names as SVG through Figma's REST API (GET /v1/images/:key, text
//       outlined), with a personal access token that has the `file_content:read` scope;
//   pnpm brand:pull --symbol <file.svg> --wordmark <file.svg>
//       takes SVG files exported by hand (Figma's Export panel, SVG) or by an agent's Figma tools instead; either
//       flag alone refreshes that mark only.
//
// Each export is made into the repository's source (packages/tokens-build/src/emit/brand.js, `normalizeMark`): its
// paths in `currentColor`, so a token paints it; an export that is not one flat color is refused. `pnpm generate` then
// writes the painted copies and the favicon (design/brand/generated/), and the docs build renders the raster icons
// and the social image from them.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARKS, normalizeMark } from '../packages/tokens-build/src/emit/brand.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const figma = JSON.parse(fs.readFileSync(path.join(root, 'design/brand/figma.json'), 'utf8'));
const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
};
const fail = (message) => {
  console.error(`✖ brand:pull: ${message}`);
  process.exit(1);
};

const local = Object.fromEntries(MARKS.map((mark) => [mark, flag(mark)]).filter(([, file]) => file));
/** @type {Record<string, string>} */
const exports = {};
if (Object.keys(local).length) {
  for (const [mark, file] of Object.entries(local)) exports[mark] = fs.readFileSync(path.resolve(file), 'utf8');
} else {
  const token = process.env.FIGMA_TOKEN;
  if (!token) fail('set FIGMA_TOKEN (a personal access token with file_content:read), or pass --symbol / --wordmark with exported SVG files');
  const ids = MARKS.map((mark) => figma.nodes[mark]);
  const query = new URLSearchParams({ ids: ids.join(','), format: 'svg', svg_outline_text: 'true', svg_include_id: 'false', svg_simplify_stroke: 'true' });
  const response = await fetch(`https://api.figma.com/v1/images/${figma.file}?${query}`, { headers: { 'X-Figma-Token': token } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.err) fail(`Figma answered ${response.status}: ${body.err ?? body.message ?? 'no image'}`);
  for (const mark of MARKS) {
    const url = body.images?.[figma.nodes[mark]];
    if (!url) fail(`Figma rendered no image of ${mark} (node ${figma.nodes[mark]})`);
    const svg = await fetch(url);
    if (!svg.ok) fail(`the render of ${mark} could not be fetched (${svg.status})`);
    exports[mark] = await svg.text();
  }
}

for (const [mark, svg] of Object.entries(exports)) {
  let source;
  try {
    source = normalizeMark(svg, { source: `Figma file ${figma.file}, node ${figma.nodes[mark]}` });
  } catch (error) {
    fail(`${mark}: ${error.message}`);
  }
  const rel = `design/brand/${mark}.svg`;
  const before = fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : null;
  fs.writeFileSync(path.join(root, rel), source);
  console.log(`${before === source ? '·' : '✔'} ${rel}${before === source ? ' (unchanged)' : ''}`);
}

// What is derived from the marks: the painted copies and the favicon (pnpm generate runs the token pipeline).
execFileSync('node', ['packages/tokens-build/src/cli.js', 'generate'], { cwd: root, stdio: 'inherit' });
console.log('Next: look at design/brand/generated/, run the docs (pnpm docs:dev) and commit the marks with what was derived.');
