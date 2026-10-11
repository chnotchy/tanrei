// Every rule that keeps text from selection writes both names: Safari reads `-webkit-user-select` and not
// `user-select`. What a press
// then does in the engine is held in the browsers by `src/primitives/press.test.ts`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

/**
 * The declarations that write the standard name alone, as `<file>: <how many>`.
 * - The date-time picker's `.entry` is a native input, and Safari gives an input it applies to no text (DTM-43).
 */
const ALONE = {
  'components/date-time-picker/date-time-picker.styles.ts': 1,
};

const files = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(file);
    return /\.(ts|css)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [file] : [];
  });

test('a rule that says user-select: none says -webkit-user-select: none beside it', () => {
  const alone = {};
  for (const file of files(src)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').map((line) => line.trim());
    lines.forEach((line, at) => {
      const value = /^user-select:\s*([\w-]+);$/.exec(line)?.[1];
      if (!value) return;
      const prefixed = `-webkit-user-select: ${value};`;
      if (lines[at - 1] === prefixed || lines[at + 1] === prefixed) return;
      const name = path.relative(src, file).split(path.sep).join('/');
      alone[name] = (alone[name] ?? 0) + 1;
    });
  }
  assert.deepEqual(alone, ALONE);
});
