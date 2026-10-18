// `@tanrei/web/theme-script` as built (`dist/`), in Node: the module can be imported where there is no document (a
// server writing the page), the inline script it gives is small and imports nothing, and run against a document and a
// storage it puts a stored theme on <html>, and nothing else. Run after the build, by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const file = new URL('../dist/theme-script.js', import.meta.url);
const { THEME_STORAGE_KEY, loadTheme, themeScript } = await import(file);

/** Runs the inline script in a context with `stored` in its storage (or a storage that throws) and returns <html>'s attributes. */
function run(script, stored, { blocked = false } = {}) {
  const attributes = {};
  const storage = { getItem: (key) => (blocked ? (() => { throw new Error('blocked'); })() : (stored[key] ?? null)) };
  const context = { localStorage: storage, document: { documentElement: { setAttribute: (name, value) => (attributes[name] = value) } } };
  vm.runInNewContext(script, context);
  return attributes;
}

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
