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

  test('the staging alone is the document’s rules less the package’s stylesheets, each of which every page of the site loads after Starlight’s layers', () => {
    const docs = fileURLToPath(new URL('../', import.meta.url));
    const imported = (text) => [...text.matchAll(/@import '@tanrei\/web\/([a-z-]+\.css)'/g)].map((m) => m[1]);
    // Every page loads Starlight's `customCss`, and the site's own sheets import the package's into the docs' layers.
    const everywhere = new Set([
      ...[.../customCss:\s*\[([^\]]*)\]/.exec(fs.readFileSync(`${docs}astro.config.mjs`, 'utf8'))[1].matchAll(/@tanrei\/web\/([a-z-]+\.css)/g)].map((m) => m[1]),
      ...['prose.css', 'frame.css'].flatMap((name) => imported(fs.readFileSync(`${docs}src/styles/${name}`, 'utf8'))),
    ]);
    for (const name of documentedComponents()) {
      const document = fixtureDocument(name);
      for (const sheet of document.sheets) {
        const text = fs.readFileSync(`${docs}../../packages/web/dist/${sheet}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        assert.ok(document.styles.includes(text) && !document.staging.includes(text.trim()), `${name}: ${sheet} is in its styles and not in its staging`);
        assert.ok(everywhere.has(sheet), `${name}: every page of the site loads ${sheet}`);
      }
    }
    assert.deepEqual(fixtureDocument('steps').sheets.sort(), ['icons.css', 'prose.css', 'steps.css']);
    assert.ok(fixtureDocument('button').staging.length < 1000, 'a button’s staging is a few rules');
  });

  test('the step in script is taken apart into its source and the fixtures it reads', () => {
    const { step, after } = fixtureDocument('file-upload');
    assert.ok(after.includes(step.source) && after.includes(step.fixtures));
    assert.match(step.source, /^async \(element, fixture\) =>/);
    assert.ok(JSON.parse(step.fixtures)['own-one'], 'the fixtures, by id');
  });

  test('a stage’s markup, as the copy action gives it, holds no inlined picture', () => {
    const card = fixtureDocument('link-card').stages.find((stage) => stage.html.includes('data:image'));
    assert.ok(card, 'a link card stage inlines its picture');
    assert.doesNotMatch(stageMarkup(card.html), /data:/);
    assert.match(stageMarkup(fixtureDocument('steps').stages[0].html), /^<ol class="tanrei-steps"/);
  });
});
