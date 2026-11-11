// `@tanrei/web/theme-script` as built (`dist/`), in Node: the module can be imported where there is no document (a
// server writing the page), the inline script it gives is small and imports nothing, and run against a document and a
// storage it puts a stored theme on <html>, and nothing else. Run after the build, by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const file = new URL('../dist/theme-script.js', import.meta.url);
const { THEME_COLOR_ATTRIBUTE, THEME_STORAGE_KEY, loadTheme, themeColorMeta, themeScript } = await import(file);

/**
 * Runs the inline script in a context with `stored` in its storage (or a storage that throws) and returns <html>'s
 * attributes; `metas` are theme-color tags ({ scheme, media }) the script may point at the stored theme.
 */
function run(script, stored, { blocked = false, metas = [] } = {}) {
  const attributes = {};
  const storage = { getItem: (key) => (blocked ? (() => { throw new Error('blocked'); })() : (stored[key] ?? null)) };
  const elements = metas.map((meta) => ({ getAttribute: (name) => (name === THEME_COLOR_ATTRIBUTE ? meta.scheme : null), setAttribute: (name, value) => (meta[name] = value) }));
  const document = {
    documentElement: { setAttribute: (name, value) => (attributes[name] = value) },
    querySelectorAll: (selector) => (selector === `meta[${THEME_COLOR_ATTRIBUTE}]` ? elements : []),
  };
  vm.runInNewContext(script, { localStorage: storage, document });
  return attributes;
}

const COLORS = { light: '#ffffff', 'light-medium': '#fefefe', 'light-high': '#fafafa', dark: '#0b0b0b', 'dark-medium': '#0c0c0c', 'dark-high': '#000000' };

test('themeColorMeta() writes a tag per scheme a browser can ask for, the most specific first, each with its media query', () => {
  assert.equal(
    themeColorMeta(COLORS),
    '<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark) and (prefers-contrast: more)" data-tanrei-theme-color="dark-high">' +
      '<meta name="theme-color" content="#fafafa" media="(prefers-contrast: more)" data-tanrei-theme-color="light-high">' +
      '<meta name="theme-color" content="#0b0b0b" media="(prefers-color-scheme: dark)" data-tanrei-theme-color="dark">' +
      '<meta name="theme-color" content="#ffffff" media="all" data-tanrei-theme-color="light">',
  );
  assert.equal(themeColorMeta({ light: '#fff', dark: '#000' }).match(/<meta /g).length, 2, 'a scheme without a color has no tag');
  assert.match(themeColorMeta({ light: '"><script>' }), /content="&quot;>&lt;script>"/, 'a value is written as an attribute, never as markup');
});

test('with a theme stored, the inline script points the theme-color tags at it; with none, it leaves them as written', () => {
  const metas = () => ['dark-high', 'light-high', 'dark', 'light'].map((scheme) => ({ scheme }));
  const media = (stored) => {
    const tags = metas();
    run(themeScript(), stored, { metas: tags });
    return Object.fromEntries(tags.map(({ scheme, media }) => [scheme, media]));
  };
  assert.deepEqual(media({ [THEME_STORAGE_KEY]: 'dark' }), { 'dark-high': '(prefers-contrast: more)', 'light-high': 'not all', dark: 'all', light: 'not all' });
  assert.deepEqual(media({ [THEME_STORAGE_KEY]: 'light' }), { 'dark-high': 'not all', 'light-high': '(prefers-contrast: more)', dark: 'not all', light: 'all' });
  assert.deepEqual(media({}), { 'dark-high': undefined, 'light-high': undefined, dark: undefined, light: undefined });
});

test('the module imports nothing and runs nothing when imported: a server can import it with no document', () => {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
  // Imported above in Node, where there is no document and no storage, without an error.
  assert.equal(typeof themeScript, 'function');
  assert.equal(loadTheme(), 'system', 'no storage: the system');
});

test('the inline script puts a stored light or dark theme on <html>, and nothing for anything else', () => {
  const script = themeScript();
  assert.ok(script.length < 400, `${script.length} bytes`);
  assert.deepEqual(run(script, { [THEME_STORAGE_KEY]: 'dark' }), { 'data-tanrei-theme': 'dark' });
  assert.deepEqual(run(script, { [THEME_STORAGE_KEY]: 'light' }), { 'data-tanrei-theme': 'light' });
  for (const stored of [{}, { [THEME_STORAGE_KEY]: 'system' }, { [THEME_STORAGE_KEY]: 'sepia' }, { [THEME_STORAGE_KEY]: '"><script>' }]) assert.deepEqual(run(script, stored), {});
  // Storage that is blocked is no error: the page follows the system.
  assert.deepEqual(run(script, {}, { blocked: true }), {});
});

test('a key of the product’s own is read instead, written into the script as a string', () => {
  const script = themeScript({ storageKey: 'acme"theme' });
  assert.deepEqual(run(script, { 'acme"theme': 'dark' }), { 'data-tanrei-theme': 'dark' });
  assert.deepEqual(run(script, { [THEME_STORAGE_KEY]: 'dark' }), {});
});
