// The Studio previews by running the build's pipeline in memory. Its one original part is the model it hands to
// the build's CSS emitter and invariants (src/model.js stands in for the DTCG resolver the build reads the bundle
// back with). So: whole systems, every declaration of the scoped sheet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { assertPreviewIsTheBuild } from './helpers.js';
import { json, repoRoot, shipped, studio } from './studio-node.js';
import { leavesNothingBehind } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // helpers.build() removes its directory; the file fails if one stays

// Shipped systems are whatever tokens/systems/ holds — never a list kept here (the page globs the same folder,
// src/data.ts). A new system is under this comparison the moment its file exists.
test('every file in tokens/systems/ but the root is a system the Studio offers, and each one is compared below', () => {
  const onDisk = fs.readdirSync(path.join(repoRoot, 'tokens/systems')).filter((file) => file.endsWith('.system.json')).map((file) => file.replace('.system.json', ''));
  // The root layer is every chain's first and has no output of its own: it is not offered.
  assert.deepEqual(studio.systems.map((system) => system.id).sort(), onDisk.filter((id) => id !== studio.rootId).sort());
  for (const id of onDisk) assert.equal(shipped[id].id, id, `${id}.system.json declares its own file name as its id`);
  assert.equal(studio.systems[0].id, studio.defaultId, 'the default system comes first');
  // A system on a system (m3-expressive-like on m3-like today) exercises a three-layer chain and a vocabulary a base declared.
  const stacked = studio.systems.filter(({ id }) => ![studio.defaultId, studio.rootId].includes(shipped[id].extends));
  assert.ok(stacked.length > 0, 'at least one shipped system extends another preset');
  for (const { id } of stacked) assert.ok(studio.base(id).chain.length >= 3 && studio.base(id).chain.some((layer) => layer.vocabulary), id);
});

for (const { id } of studio.systems) {
  test(`an empty layer on "${id}": the Studio's sheet, documents and warnings are the build's`, async () => {
    await assertPreviewIsTheBuild({ id: `studio-${id}`, extends: id });
  });
}

test('the acme fixture — every kind of extension — previews exactly as it builds', async () => {
  await assertPreviewIsTheBuild(json('packages/tokens-build/test/fixtures/acme.system.json'));
});
