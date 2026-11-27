// A product's brand color is a palette named `primary`: declared by a layer, it is what the primary roles are drawn
// in — the filled button, the selected controls, links — in every scheme, with contrast held, whatever the system
// it extends drew them from before.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSystem } from '../src/resolve.js';
import { SCHEMES } from '../src/scheme.js';

const NS = 'tanrei';
// What a role resolves to, and a palette's tone, in one scheme: colors, compared by their hex.
const role = (resolved, scheme, name) => resolved.tokens(scheme)[`${NS}.sys.color.${name}`].$value.hex;
const tone = (resolved, scheme, palette, t) => resolved.tokens(scheme)[`${NS}.ref.palette.${palette}.${t}`].$value.hex;
// The tones a core intent's roles take from a palette of its name (the palette engine's template), and those of
// inverse-primary: [light, light-medium, light-high, dark, dark-medium, dark-high].
const TEMPLATE = {
  primary: [45, 38, 30, 72, 80, 87],
  'on-primary': [100, 100, 100, 10, 10, 10],
  'primary-container': [93, 91, 89, 22, 22, 22],
  'on-primary-container': [20, 15, 10, 88, 92, 96],
  'inverse-primary': [80, 85, 90, 40, 30, 20],
};
const brand = (extra = {}) => ({ id: 'acme', name: 'Acme', extends: 'tanrei', palettes: { primary: { source: { seed: '#2563eb' } } }, ...extra });

test('a product on the default system that declares `primary` has its primary roles drawn from it, in every scheme, and its links follow', async () => {
  const resolved = await resolveSystem({ layers: [brand()] });
  for (const [name, tones] of Object.entries(TEMPLATE)) {
    SCHEMES.forEach((scheme, i) => assert.equal(role(resolved, scheme, name), tone(resolved, scheme, 'primary', tones[i]), `${name} ${scheme}`));
  }
  const plain = await resolveSystem({ system: 'tanrei' });
  for (const scheme of SCHEMES) {
    assert.equal(role(resolved, scheme, 'link'), role(resolved, scheme, 'primary'), `link ${scheme}`);
    // Tanrei's own choices stay: the focus ring is the accent's, the status containers are quiet.
    for (const name of ['focus-ring', 'error-container', 'info-container']) assert.equal(role(resolved, scheme, name), role(plain, scheme, name), `${name} ${scheme}`);
  }
  const warnings = await resolved.warnings();
  assert.deepEqual(warnings.filter((w) => /primary/.test(typeof w === 'string' ? w : JSON.stringify(w))), [], 'contrast held for every primary pair');
});

test('the other way to set it stays: a rule the product writes itself wins over its palette', async () => {
  const own = { derive: { fn: 'tone', palette: 'neutral', tone: { light: [10, 6, 0], dark: [93, 96, 100] } } };
  const resolved = await resolveSystem({ layers: [brand({ tokens: { [`${NS}.sys.color.primary`]: own } })] });
  assert.equal(role(resolved, 'light', 'primary'), tone(resolved, 'light', 'neutral', 10));
  assert.equal(role(resolved, 'light', 'primary-container'), tone(resolved, 'light', 'primary', 93), 'the roles it does not write follow the palette');
});

test('a system that gave the intent its palette keeps its own rules: a preset re-seeded, a status color changed', async () => {
  const m3 = await resolveSystem({ layers: [{ id: 'acme', name: 'Acme', extends: 'm3-like', palettes: { primary: { source: { seed: '#2563eb' } } } }] });
  // m3-like's own tones for its primary (40 in the light scheme, 80 in the dark), not the template's (45, 72).
  const M3 = [40, 30, 20, 80, 85, 90];
  SCHEMES.forEach((scheme, i) => assert.equal(role(m3, scheme, 'primary'), tone(m3, scheme, 'primary', M3[i]), `m3-like primary ${scheme}`));

  const error = await resolveSystem({ layers: [{ id: 'acme', name: 'Acme', extends: 'tanrei', palettes: { error: { source: { seed: '#c2185b' } } } }] });
  const plain = await resolveSystem({ system: 'tanrei' });
  for (const scheme of SCHEMES) {
    // The status color takes the new seed; the default system's quiet container, valued from its own palette after
    // the root declared `error`, stays.
    assert.notEqual(role(error, scheme, 'error'), role(plain, scheme, 'error'), `error ${scheme}`);
    for (const name of ['error-container', 'on-error-container']) assert.equal(role(error, scheme, name), role(plain, scheme, name), `${name} ${scheme}`);
    assert.equal(role(error, scheme, 'primary'), role(plain, scheme, 'primary'), `primary ${scheme}`);
  }
});

test('dropping the palette again gives the roles back to the system they came from', async () => {
  const plain = await resolveSystem({ system: 'tanrei' });
  const dropped = await resolveSystem({ layers: [brand(), { id: 'plain', name: 'Plain', extends: 'acme', palettes: { primary: null } }] });
  for (const scheme of SCHEMES) for (const name of Object.keys(TEMPLATE)) assert.equal(role(dropped, scheme, name), role(plain, scheme, name), `${name} ${scheme}`);
});
