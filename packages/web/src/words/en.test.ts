// The English word pack, `@tanrei/web/words/en`: imported for its effect, it gives a word for every key of the product's
// words, so that a product that imports it sees no report of a missing word in any fixture of any component — the
// Field's report of a required mark without words (FLD-24) among them. Applied only by that import: the package's
// entry sets no word. An instance's prop still wins, and the product's own `setWords()` after it overrides a key.
//
// This is the one test that imports the pack (the harness, the fixtures and every other test give their words
// themselves, so that a sample that forgot one shows the gap).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { buildSync } from 'esbuild';
import { loadSpec, missingWords, mountFixtures, setWords } from '../../test/harness.js';
import { wordKeys, wordPlaces } from '../generated/words.js';
import { englishWords } from '../generated/words-en.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const repo = path.resolve(pkg, '../..');

/** Every spec the web implements. */
const NAMES = fs
  .readdirSync(path.join(repo, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(repo, 'specs', file), 'utf8')) as { name: string; platforms?: { web?: { status?: string } } })
  .filter((spec) => spec.platforms?.web?.status && spec.platforms.web.status !== 'planned')
  .map((spec) => spec.name)
  .sort();

/**
 * The built module `@tanrei/web/words/en`, as a classic script a document runs while it is parsed — before the
 * components' module script, as a product's import that comes first in its entry. It is a second copy of the words
 * primitive beside the bundle's, which holds the same sets (src/primitives/words.ts keeps them under a registered symbol).
 */
let pack: string | undefined;
const packScript = () =>
  `<script>${(pack ??= buildSync({ entryPoints: [path.join(pkg, 'dist/words/en.js')], bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } }).outputFiles[0].text).replace(/<\/script/gi, '<\\/script')}</script>`;

/** The debug reports a missing word makes, and those `setWords()` makes of a word's places. */
function wordReports(page: Page) {
  const seen: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'warning' && (text.includes("the product's words have no") || text.includes('setWords()') || text.includes('FLD-24'))) seen.push(text);
  });
  return seen;
}

test('the pack has a word for every key of the product’s words, and each word keeps the places its key needs', () => {
  expect(Object.keys(englishWords).sort()).toEqual([...wordKeys].sort());
  for (const key of wordKeys) expect(englishWords[key].trim(), key).not.toBe('');
  for (const [key, places] of Object.entries(wordPlaces)) for (const place of places ?? []) if (place.required) expect(englishWords[key as keyof typeof englishWords], key).toContain(`{${place.name}}`);
});

for (const name of NAMES) {
  test(`with the pack imported, ${name}: no fixture misses a word, and nothing is reported`, async ({ page }) => {
    const reports = wordReports(page);
    await mountFixtures(page, loadSpec(name), { icons: true, lead: packScript() });
    expect(await missingWords(page)).toEqual([]);
    expect(reports).toEqual([]);
  });
}

test('without the import there are no words: the package’s entry applies no pack, and a required field still lacks its word', async ({ page }) => {
  const reports = wordReports(page);
  await mountFixtures(page, loadSpec('field'), { fixtures: [{ id: 'required', props: { label: 'Volume', requirement: 'required' }, items: [{ kind: 'slider', props: { value: 40 } }] }] });
  expect(await missingWords(page)).toContain('requiredText');
  expect(reports.some((line) => line.includes('requiredText'))).toBe(true);
});

test('the pack is the product’s words set once: an instance’s prop wins, and the product’s own setWords() after the import overrides the keys it names', async ({ page }) => {
  await mountFixtures(page, loadSpec('field'), {
    lead: packScript(),
    fixtures: [
      { id: 'pack', props: { label: 'Volume', requirement: 'required' }, items: [{ kind: 'slider', props: { value: 40 } }] },
      { id: 'own', props: { label: 'Volume', requirement: 'required', requiredText: 'Needed' }, items: [{ kind: 'slider', props: { value: 40 } }] },
    ],
  });
  const tag = (id: string) =>
    page.locator(`[data-fixture="${id}"] > tanrei-field`).evaluate(async (el) => {
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      return el.shadowRoot!.querySelector('.requirement-tag')?.getAttribute('label') ?? null;
    });
  expect(await tag('pack')).toBe(englishWords.requiredText);
  expect(await tag('own')).toBe('Needed');
  await setWords(page, { requiredText: 'Mandatory' });
  expect(await tag('pack')).toBe('Mandatory');
  expect(await tag('own')).toBe('Needed');
});
