// The reader's appearance (src/lib/appearance.ts): one type, one key of storage, one set of attributes on `<html>`, and
// the head's script made of the same functions. The script is run here against a document and a storage of plain
// objects; what it does in each engine is asked by test/browser/appearance.test.mjs.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const appearance = await import('../src/lib/appearance.ts');
const { ABSENT_ATTR, SYSTEM_ATTR, SYSTEM_ONLY_ATTR, SYSTEM_RULE_ID } = await import('../src/lib/listing.mjs');
const { manifests } = await import('../src/lib/repo.ts');
const { APPEARANCE_KEY, CONTRAST_ATTR, LOOK_ATTR, MODE_ATTR, SHARED_ATTR, TANREI_THEME_ATTR, THEME_ATTR, appearanceBootstrap, attributesOf, bootConfig, linkTo, normalize, sharedFrom, standaloneBootstrap, withoutShared } = appearance;

const read = (file) => fs.readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
const looks = manifests.map((manifest) => manifest.system);
const DEFAULT = JSON.parse(read('../../tanrei.config.json')).namespace;
const SHOWCASE = looks.find((id) => id !== DEFAULT);

/**
 * The head's script, run with a storage that holds `stored` (or throws), an address, and the device's scheme: the
 * attributes it leaves on the root, and the rule it writes.
 */
function boot({ stored = null, search = '', dark = false, script = appearanceBootstrap(bootConfig(looks)) } = {}) {
  const attributes = {};
  const head = [];
  const document = {
    documentElement: { setAttribute: (name, value) => (attributes[name] = String(value)), removeAttribute: (name) => delete attributes[name] },
    createElement: () => ({}),
    head: { appendChild: (node) => head.push(node) },
  };
  const localStorage = { getItem: (key) => (stored instanceof Error ? (() => { throw stored; })() : key === APPEARANCE_KEY ? stored : null) };
  const matchMedia = (query) => ({ matches: query.includes('dark') && dark });
  new Function('document', 'localStorage', 'location', 'matchMedia', 'URLSearchParams', script)(document, localStorage, { search }, matchMedia, URLSearchParams);
  return { attributes, rule: head[0] };
}

describe('the appearance', () => {
  test('one shape: anything stored or asked for that is not an allowed value is the default’s', () => {
    assert.deepEqual(normalize(null, looks, DEFAULT), { mode: 'system', contrast: 'standard', look: DEFAULT });
    assert.deepEqual(normalize({ mode: 'dark', contrast: 'high', look: SHOWCASE }, looks, DEFAULT), { mode: 'dark', contrast: 'high', look: SHOWCASE });
    assert.deepEqual(normalize({ mode: 'dim', contrast: 'max', look: 'not-a-system' }, looks, DEFAULT), { mode: 'system', contrast: 'standard', look: DEFAULT });
    assert.deepEqual(normalize('"]{}*{display:none}', looks, DEFAULT), { mode: 'system', contrast: 'standard', look: DEFAULT });
  });

  test('the attributes of the root: the scheme drawn twice, the mode chosen, the contrast only when it is not standard, the look', () => {
    const names = bootConfig(looks).names;
    assert.deepEqual(attributesOf({ mode: 'system', contrast: 'standard', look: DEFAULT }, true, names), { [THEME_ATTR]: 'dark', [TANREI_THEME_ATTR]: 'dark', [MODE_ATTR]: 'system', [CONTRAST_ATTR]: null, [LOOK_ATTR]: DEFAULT });
    assert.deepEqual(attributesOf({ mode: 'light', contrast: 'medium', look: SHOWCASE }, true, names), { [THEME_ATTR]: 'light', [TANREI_THEME_ATTR]: 'light', [MODE_ATTR]: 'light', [CONTRAST_ATTR]: 'medium', [LOOK_ATTR]: SHOWCASE });
    assert.equal(LOOK_ATTR, SYSTEM_ATTR, 'the look is the attribute every frame and list already follows');
  });

  test('the address shares an appearance: ?look=&mode=&contrast=, and leaves the rest of the address alone', () => {
    assert.equal(sharedFrom('?q=1'), null);
    assert.deepEqual(sharedFrom(`?look=${SHOWCASE}&mode=dark`), { look: SHOWCASE, mode: 'dark' });
    const link = linkTo('https://example.com/components/button/?tab=specs#anatomy', { mode: 'dark', contrast: 'high', look: SHOWCASE });
    assert.equal(link, `https://example.com/components/button/?tab=specs&look=${SHOWCASE}&mode=dark&contrast=high#anatomy`);
    assert.equal(withoutShared(link), 'https://example.com/components/button/?tab=specs#anatomy');
  });

  test('the head’s script: the default on a first visit, a blocked storage, an older key or a broken value; the stored one otherwise', () => {
    for (const stored of [null, new Error('blocked'), '{', 'dark']) {
      const { attributes } = boot({ stored });
      assert.equal(attributes[LOOK_ATTR], DEFAULT, String(stored));
      assert.equal(attributes[MODE_ATTR], 'system');
      assert.equal(attributes[THEME_ATTR], 'light', 'the device’s scheme');
      assert.equal(attributes[CONTRAST_ATTR], undefined);
    }
    assert.equal(boot({ dark: true }).attributes[THEME_ATTR], 'dark');
    const { attributes, rule } = boot({ stored: JSON.stringify({ mode: 'dark', contrast: 'high', look: SHOWCASE }) });
    assert.deepEqual(attributes, { [THEME_ATTR]: 'dark', [TANREI_THEME_ATTR]: 'dark', [MODE_ATTR]: 'dark', [CONTRAST_ATTR]: 'high', [LOOK_ATTR]: SHOWCASE });
    assert.equal(rule.id, SYSTEM_RULE_ID);
    assert.equal(rule.textContent, `[${ABSENT_ATTR}~="${SHOWCASE}"],[${SYSTEM_ONLY_ATTR}]:not([${SYSTEM_ONLY_ATTR}="${SHOWCASE}"]){display:none}`);
  });

  test('the head’s script shows what the address shares over what is stored, and marks it shared', () => {
    const stored = JSON.stringify({ mode: 'light', contrast: 'medium', look: DEFAULT });
    const { attributes } = boot({ stored, search: `?look=${SHOWCASE}&mode=dark` });
    assert.deepEqual(attributes, { [THEME_ATTR]: 'dark', [TANREI_THEME_ATTR]: 'dark', [MODE_ATTR]: 'dark', [CONTRAST_ATTR]: 'medium', [LOOK_ATTR]: SHOWCASE, [SHARED_ATTR]: '' });
    assert.equal(boot({ search: '?look=not-a-system' }).attributes[LOOK_ATTR], DEFAULT, 'an unknown look is the default');
    assert.equal(boot({ stored }).attributes[SHARED_ATTR], undefined);
  });

  test('a document outside the frame reads the same key: the scheme the reader forced, and the contrast', () => {
    assert.deepEqual(boot({ script: standaloneBootstrap, stored: JSON.stringify({ mode: 'dark', contrast: 'high', look: SHOWCASE }) }).attributes, { [TANREI_THEME_ATTR]: 'dark', [CONTRAST_ATTR]: 'high' });
    assert.deepEqual(boot({ script: standaloneBootstrap, stored: JSON.stringify({ mode: 'system' }) }).attributes, {}, 'the device’s mode: the tokens follow the device');
    assert.deepEqual(boot({ script: standaloneBootstrap, stored: new Error('blocked') }).attributes, {});
  });

  test('is the head’s one script of the appearance, in place of the framework’s, and the only reader of its key', () => {
    assert.match(read('astro.config.mjs'), /ThemeProvider: '\.\/src\/components\/frame\/ThemeProvider\.astro'/);
    assert.doesNotMatch(read('astro.config.mjs'), /localStorage/);
    assert.match(read('src/components/StudioPage.astro'), /<script is:inline set:html=\{standaloneBootstrap\} \/>/);
    // No other key of an appearance is read anywhere in the site.
    const sources = fs.readdirSync(fileURLToPath(new URL('../src/', import.meta.url)), { recursive: true }).filter((file) => /\.(astro|ts|mjs)$/.test(file));
    for (const file of sources) assert.doesNotMatch(read(`src/${file}`), /starlight-theme|tanrei-docs-contrast|tanrei-docs-tabs-system/, file);
  });
});
