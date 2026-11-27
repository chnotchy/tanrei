// The layer schema's validator, as the Studio's Vite plugin makes it for a host: one module that imports nothing.
//
// A dev server serves a file it did not pre-bundle as it is, so a CommonJS helper the validator imported by its path
// (Ajv's `equal`, which requires fast-deep-equal) threw at load under `astro dev` — "does not provide an export named
// 'default'" — and the documentation's Studio page never mounted, while every build worked. The module holds what it
// runs, and it validates as the schema says.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tanreiStudio } from '../vite-plugin.js';

test('the validator module requires and imports nothing, and validates a layer', async () => {
  const code = tanreiStudio().load.call({ addWatchFile() {} }, '\0virtual:tanrei-studio/validate-layer');
  // (What a helper says of itself for generated code is a string: `equal.code = 'require("ajv/dist/runtime/equal").default'`.)
  assert.doesNotMatch(code.replace(/'require\([^']*'/g, ''), /\brequire\(/);
  assert.doesNotMatch(code, /^\s*import\s/m);
  const { default: validate } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  assert.equal(validate({ id: 'acme', extends: 'tanrei' }), true);
  assert.equal(validate({ id: 3, extends: 'tanrei' }), false);
});
