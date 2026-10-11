import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildProductSystem } from '@tanrei/tokens-build/product';
import { tempDir } from '../../tools/src/test-tmp.js';
import { studio } from './studio-node.js';

/** Build a layer with the real product pipeline (`tanrei build`), web + tokens. `parents`: the product's own layers next to it. */
export async function build(layer, parents = []) {
  const dir = tempDir('studio-build'); // removed below; were the process to die first, test-tmp.js sweeps on exit
  try {
    const layerFile = path.join(dir, `${layer.id}.system.json`);
    fs.writeFileSync(layerFile, JSON.stringify(layer, null, 2));
    for (const parent of parents) fs.writeFileSync(path.join(dir, `${parent.id}.system.json`), JSON.stringify(parent, null, 2));
    return await buildProductSystem({ layerFile, targets: ['web', 'tokens'] });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** A sheet as `{ selector: { property: value } }`, every rule of it. */
export function parseSheet(css) {
  const rules = {};
  for (const match of css.matchAll(/^\s*([^\n{}]+?) \{\n((?:\s+[\w-]+: .*;\n)*)\s*\}/gm)) {
    const selector = match[1].trim();
    if (selector.startsWith('@')) continue;
    rules[selector] = { ...rules[selector], ...Object.fromEntries([...match[2].matchAll(/^\s*([\w-]+): (.*);$/gm)].map((m) => [m[1], m[2]])) };
  }
  return rules;
}

/**
 * The Studio's preview of a layer ≡ the build of that layer: every declaration of the scoped sheet, every
 * document of the token bundle (values, colors of all six schemes), and the warnings, verbatim.
 */
export async function assertPreviewIsTheBuild(layer, { warnings, parents = [] } = {}) {
  const view = studio.preview(layer);
  assert.deepEqual(view.problems, []);
  const result = await build(layer, parents);

  const [ours, theirs] = [parseSheet(view.css(layer.id)), parseSheet(result.files.web[`${layer.id}.css`])];
  assert.deepEqual(Object.keys(ours), Object.keys(theirs), 'the same rules');
  for (const selector of Object.keys(theirs)) {
    assert.deepEqual(Object.keys(ours[selector]).sort(), Object.keys(theirs[selector]).sort(), `${selector}: the same properties`);
    for (const [name, value] of Object.entries(theirs[selector])) assert.equal(ours[selector][name], value, `${selector} ${name}`);
  }
  assert.ok(Object.keys(theirs[`[data-tanrei-system="${layer.id}"], [data-tanrei-system="${layer.id}"] [data-tanrei-contrast]`]).length > 400, 'a whole system');

  for (const [name, doc] of Object.entries(view.files)) {
    const built = { ...result.files.tokens[name] };
    if (name === 'dial/dial.tokens.json') delete built.$extensions; // the recipe the bundle carries
    assert.deepEqual(doc, built, name);
  }
  assert.deepEqual(Object.keys(view.files).sort(), Object.keys(result.files.tokens).filter((name) => name.endsWith('.tokens.json')).sort());

  assert.deepEqual([...view.warnings].sort(), [...result.warnings].sort());
  if (warnings) warnings(view.warnings);
  return { view, result };
}
