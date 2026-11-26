// `@tanrei/web/keyboard-convention` as built (`dist/`), in Node: the module can be imported where there is no document
// (a server writing the page); the inline script it gives puts on <html> the convention the element's own test of the
// platform gives, and nothing else; and the content holds the element's legends, in its order, in both conventions,
// escaped. Run after the build, by `pnpm --filter @tanrei/web test:node`. (That keyboard-shortcut.css draws the content
// where the element then draws its keys is keyboard-shortcut.test.ts.)
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

const { KEYBOARD_PLATFORM_ATTRIBUTE, keyboardPlatformScript, keyboardShortcutContent } = await import(new URL('../dist/keyboard-convention.js', import.meta.url));

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
  assert.equal(KEYBOARD_PLATFORM_ATTRIBUTE, 'data-tanrei-keyboard-platform');
  for (const [navigator, convention] of PLATFORMS) {
    assert.deepEqual(run(keyboardPlatformScript(), navigator), { [KEYBOARD_PLATFORM_ATTRIBUTE]: convention }, JSON.stringify(navigator));
  }
  assert.deepEqual(run(keyboardPlatformScript(), undefined), { [KEYBOARD_PLATFORM_ATTRIBUTE]: 'standard' }, 'no navigator');
});

test('the script imports nothing and stays small', () => {
  const script = keyboardPlatformScript();
  assert.doesNotMatch(script, /\bimport\b|\brequire\(/);
  assert.ok(script.length < 600, `${script.length} characters`);
});

/** Each convention's face of the content: the text read, and each chord's legends and separators. */
function faces(html) {
  return Object.fromEntries(
    [...html.matchAll(/<span data-tanrei-keys="(\w+)"><span data-tanrei-keys-spoken>(.*?)<\/span><span data-tanrei-keys-sequence aria-hidden="true">(.*?)<\/span><\/span>/g)].map(([, convention, spoken, sequence]) => [
      convention,
      { spoken, chords: [...sequence.matchAll(/<kbd data-tanrei-keys-chord>(.*?)<\/kbd>(?=<kbd data-tanrei-keys-chord>|$)/g)].map(([, chord]) => [...chord.matchAll(/>([^<]+)</g)].map(([, text]) => text).join('')) },
    ]),
  );
}

test('the content holds the element’s legends, chord by chord, in each convention’s order, and the text read in their place', () => {
  assert.deepEqual(faces(keyboardShortcutContent('mod+shift+k', { label: 'Shift Command K' })), {
    apple: { spoken: 'Shift Command K', chords: ['⇧⌘K'] },
    standard: { spoken: 'Shift Command K', chords: ['Ctrl+Shift+K'] },
  });
  assert.deepEqual(faces(keyboardShortcutContent('arrow-up arrow-down')), {
    apple: { spoken: 'ArrowUp ArrowDown', chords: ['↑', '↓'] },
    standard: { spoken: 'ArrowUp ArrowDown', chords: ['↑', '↓'] },
  });
  assert.deepEqual(faces(keyboardShortcutContent(['mod+enter'])), {
    apple: { spoken: 'Meta+Enter', chords: ['⌘↩'] },
    standard: { spoken: 'Control+Enter', chords: ['Ctrl+Enter'] },
  }, 'without a label, the notation of aria-keyshortcuts in each convention');
  assert.deepEqual(faces(keyboardShortcutContent('ctrl+mod+a')).standard.chords, ['Ctrl+A'], 'a modifier written like another is drawn once');
  assert.equal(keyboardShortcutContent(''), '', 'no keys write nothing');
});

test('the content is markup with its text escaped', () => {
  const html = keyboardShortcutContent('shift+<', { label: '"Shift" & <' });
  assert.doesNotMatch(html.replace(/<\/?(span|kbd)\b[^>]*>/g, ''), /[<>"]/);
  assert.match(html, /<kbd data-tanrei-keys-key data-tanrei-shape>&lt;<\/kbd>/);
  assert.match(html, /<span data-tanrei-keys-spoken>&quot;Shift&quot; &amp; &lt;<\/span>/);
});
