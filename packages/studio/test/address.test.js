// The layer in the page's address (src/address.js): packed and unpacked to the same layer, short enough for a link,
// next to the fragment's other parameters, and refused when it is not a layer.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_TEXT, layerParam, packLayer, unpackLayer, withLayer } from '../src/address.js';

const layer = {
  id: 'acme',
  extends: 'tanrei',
  name: 'Acme — ＡＣＭＥ',
  palettes: { primary: { source: { seed: '#0f766e' } } },
  tokens: { 'tanrei.dial.shape.unit': { $value: 6, reason: 'Softer corners.' } },
};

test('a layer packs into the characters of a URL and unpacks to the same layer', async () => {
  const text = JSON.stringify(layer, null, 2);
  const code = await packLayer(text);
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'base64url, no padding');
  assert.ok(code.length < text.length, `packed: ${code.length} characters for ${text.length}`);
  assert.deepEqual(await unpackLayer(code), layer);
});

test('the layer is one parameter of the fragment: the others stay, and taking it out leaves them', async () => {
  const code = await packLayer(JSON.stringify(layer));
  const hash = withLayer('#token=abc', code);
  assert.equal(layerParam(hash), code);
  assert.equal(new URLSearchParams(hash.slice(1)).get('token'), 'abc');
  assert.equal(withLayer(hash, null), '#token=abc');
  assert.equal(withLayer(`#layer=${code}`, null), '', 'nothing left: no fragment');
  assert.equal(layerParam(''), null);
  assert.equal(layerParam('#other=1'), null);
});

test('what is not a packed layer is refused: a link cut short, text that is not JSON, more than the limit', async () => {
  const code = await packLayer(JSON.stringify(layer));
  await assert.rejects(unpackLayer(code.slice(0, code.length / 2)));
  await assert.rejects(unpackLayer(await packLayer('not json')));
  await assert.rejects(unpackLayer(await packLayer(`"${'a'.repeat(MAX_TEXT + 10)}"`)), /more than/);
});
