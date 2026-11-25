// `@tanrei/web/keyboard-convention` as built (`dist/`), in Node: the module can be imported where there is no document
// (a server writing the page); the inline script it gives puts on <html> the convention the element's own test of the
// platform gives, and nothing else; and the legends are the element's, in its order. Run after the build, by
// `pnpm --filter @tanrei/web test:node`. (That the element draws these legends is keyboard-shortcut.test.ts.)
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

const { KEYBOARD_PLATFORM_ATTRIBUTE, keyboardPlatformScript, shortcutLegends } = await import(new URL('../dist/keyboard-convention.js', import.meta.url));

/** Runs the inline script with `navigator` (or none) and returns <html>'s attributes. */
function run(script, navigator) {
  const attributes = {};
  const document = { documentElement: { setAttribute: (name, value) => (attributes[name] = value) } };
  vm.runInNewContext(script, navigator === undefined ? { document } : { document, navigator });
  return attributes;
}

const PLATFORMS = [
  [{ platform: 'MacIntel' }, 'apple'],
  [{ platform: 'iPhone' }, 'apple'],
  [{ platform: 'iPad' }, 'apple'],
  [{ platform: 'Win32' }, 'standard'],
  [{ platform: 'Linux x86_64' }, 'standard'],
  [{ platform: '', userAgentData: { platform: 'macOS' } }, 'apple'],
  [{ platform: 'MacIntel', userAgentData: { platform: 'Windows' } }, 'standard'],
  [{}, 'standard'],
];

test('the inline script puts the platform convention on <html>, as the element tells it', () => {
  for (const [navigator, convention] of PLATFORMS) {
    assert.deepEqual(run(keyboardPlatformScript(), navigator), { [KEYBOARD_PLATFORM_ATTRIBUTE]: convention }, JSON.stringify(navigator));
  }
  assert.deepEqual(run(keyboardPlatformScript(), undefined), { [KEYBOARD_PLATFORM_ATTRIBUTE]: 'standard' }, 'no navigator');
  assert.deepEqual(run(keyboardPlatformScript({ attribute: 'data-docs-keys' }), { platform: 'MacIntel' }), { 'data-docs-keys': 'apple' }, 'another attribute');
});

test('the script imports nothing and stays small', () => {
  const script = keyboardPlatformScript();
  assert.doesNotMatch(script, /\bimport\b|\brequire\(/);
  assert.ok(script.length < 600, `${script.length} characters`);
});

test('the legends are the element’s, chord by chord, in the convention’s order', () => {
  assert.deepEqual(shortcutLegends('mod+shift+k', 'apple'), [['⇧', '⌘', 'K']]);
  assert.deepEqual(shortcutLegends('mod+shift+k', 'standard'), [['Ctrl', 'Shift', 'K']]);
  assert.deepEqual(shortcutLegends(['shift+tab'], 'apple'), [['⇧', '⇥']]);
  assert.deepEqual(shortcutLegends('arrow-up arrow-down arrow-left arrow-right', 'standard'), [['↑'], ['↓'], ['←'], ['→']]);
  assert.deepEqual(shortcutLegends('enter', 'standard'), [['Enter']]);
  assert.deepEqual(shortcutLegends('ctrl+mod+a', 'standard'), [['Ctrl', 'A']], 'a modifier written like another is drawn once');
  assert.deepEqual(shortcutLegends('', 'apple'), [], 'no keys draw nothing');
});
