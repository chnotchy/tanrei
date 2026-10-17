// The web package's fixture documents as the site's build reads them (scripts/fixture-documents.mjs writes
// src/fixture-documents.generated.json; `test:node` writes it first). No browser, no build.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { documentedComponents, fixtureDocument, stageMarkup } = await import('../src/lib/fixture-documents.ts');
const { specs } = await import('../src/lib/repo.ts');
const snapshots = fileURLToPath(new URL('../../../packages/web/snapshots/', import.meta.url));

describe('the fixture documents', () => {
  test('every component the web implements has its document, with a stage for each fixture of its spec', () => {
    const implemented = Object.values(specs).filter((spec) => spec.platforms.web && spec.platforms.web.status !== 'planned');
    assert.deepEqual(documentedComponents().sort(), implemented.map((spec) => spec.name).sort());
    for (const spec of implemented) {
      const document = fixtureDocument(spec.name);
      assert.deepEqual(document.stages.map((stage) => stage.id), spec.fixtures.map((fixture) => fixture.id), spec.name);
      assert.ok(document.styles.includes('.stage'), `${spec.name}: the stage's own rules`);
    }
  });

  test('a stage’s size is its baseline’s, at a device pixel ratio of 2', () => {
    let read = 0;
    for (const name of documentedComponents()) {
      for (const [id, size] of Object.entries(fixtureDocument(name).sizes)) {
        const header = fs.readFileSync(`${snapshots}${name}/${id}.png`).subarray(16, 24);
        assert.deepEqual(size, { width: Math.round(header.readUInt32BE(0) / 2), height: Math.round(header.readUInt32BE(4) / 2) }, `${name}/${id}`);
        read++;
      }
    }
    assert.ok(read > 2000, `${read} stages have a baseline`);
    assert.deepEqual(fixtureDocument('dialog').sizes.basic, { width: 640, height: 640 });
  });

  test('a stage’s markup, as the copy action gives it, holds no inlined picture', () => {
    const card = fixtureDocument('link-card').stages.find((stage) => stage.html.includes('data:image'));
    assert.ok(card, 'a link card stage inlines its picture');
    assert.doesNotMatch(stageMarkup(card.html), /data:/);
    assert.match(stageMarkup(fixtureDocument('steps').stages[0].html), /^<ol class="tanrei-steps"/);
  });
});
