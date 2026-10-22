// The contrast thresholds the docs state (src/lib/contrast.ts) are the token build's own constants
// (packages/tokens-build/src/invariants.js), and the pages that state them write none by hand: the Accessibility and
// Color pages, in every language, take each ratio from the constants.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';

register('./vite-shim.mjs', import.meta.url);
const { contrast } = await import('../src/lib/contrast.ts');
const { CONTRAST_THRESHOLDS } = await import('../../../packages/tokens-build/src/invariants.js');
const { source, translations } = await import('../i18n/locales.mjs');

const docs = new URL('../src/content/docs/', import.meta.url);
const PAGES = ['foundations/accessibility.mdx', 'foundations/color.mdx'];
const RATIO = /\d+(?:\.\d+)?\s*:\s*1(?![\d.])/g;

test('each threshold a page states is the build’s constant, written as n:1', () => {
  assert.deepEqual(contrast, {
    text: `${CONTRAST_THRESHOLDS.text}:1`,
    highContrastText: `${CONTRAST_THRESHOLDS.highContrastText}:1`,
    nonText: `${CONTRAST_THRESHOLDS.nonText}:1`,
    hairlineMedium: `${CONTRAST_THRESHOLDS.hairline.medium}:1`,
    hairlineHigh: `${CONTRAST_THRESHOLDS.hairline.high}:1`,
  });
});

for (const dir of [source.dir, ...translations.map((t) => t.dir)]) {
  describe(`the pages that state the thresholds (${dir || 'en'})`, () => {
    for (const page of PAGES) {
      const file = new URL(`${dir ? `${dir}/` : ''}${page}`, docs);
      if (dir && !fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const body = text.replace(/^---[\s\S]*?\n---\n/, '');

      test(`${page} writes no ratio by hand`, () => {
        assert.deepEqual(body.match(RATIO) ?? [], [], 'a ratio comes from {contrast.…} (src/lib/contrast.ts)');
        assert.match(body, /^import \{ contrast \} from '(?:\.\.\/)+lib\/contrast';$/m);
      });

      test(`${page} names only thresholds the build has, the high-contrast text among them`, () => {
        const used = new Set([...body.matchAll(/\{contrast\.(\w+)\}/g)].map((m) => m[1]));
        for (const key of used) assert.ok(key in contrast, `{contrast.${key}} is not a threshold`);
        for (const key of ['text', 'highContrastText', 'nonText']) assert.ok(used.has(key), `the page does not state {contrast.${key}}`);
      });
    }
  });
}
