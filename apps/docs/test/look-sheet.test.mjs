// The stylesheet of each look that is a shipped system other than the default (src/lib/look-sheets.mjs), applied on the
// root after the default system's (the web package's tokens.css), draws the root as a product that ships that system
// draws it: `<html data-tanrei-system="<id>">` under tokens.css and the system's own scoped sheet
// (`@tanrei/web/systems/<id>.css`). Every property either way gives the root — every custom property, and
// `color-scheme` — is the same, in every state of the root a reader can be in: the scheme forced or the device's, each
// contrast level, the device asking for more contrast, and for reduced motion, as a product's root or the device asks.
// The cascade is worked out here as a browser works it out on `<html>`, which has no ancestor: the rules whose
// selectors match it, the most specific, then the last.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scopedSheet, sheetRules, shippedLayers } from '@tanrei/studio/sheet-node';
import { lookFileName, lookSheets, sheetLooks } from '../src/lib/look-sheets.mjs';

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const config = JSON.parse(fs.readFileSync(here('../../../tanrei.config.json'), 'utf8'));
const NS = config.namespace;
const generated = (file) => fs.readFileSync(here(`../../../packages/web/src/generated/${file}`), 'utf8');
const tokensCss = generated('tokens.css');
const manifests = fs.readdirSync(here('../../../tokens/generated'), { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(here(`../../../tokens/generated/${entry.name}/components.json`))).map((entry) => entry.name);

const sheets = await lookSheets(NS);

/** The compound selectors of one complex selector, split at its descendant combinators. */
function compounds(selector) {
  const out = [];
  let depth = 0;
  let quoted = false;
  let current = '';
  for (const char of selector.trim()) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === '[' || char === '(')) depth += 1;
    else if (!quoted && (char === ']' || char === ')')) depth -= 1;
    if (char === ' ' && !depth && !quoted) {
      if (current) out.push(current);
      current = '';
    } else current += char;
  }
  if (current) out.push(current);
  if (out.some((part) => /^[>+~]$/.test(part))) throw new Error(`a combinator this test does not know: ${selector}`);
  return out;
}

/** Whether one compound selector matches `<html>` holding `attributes`, and its specificity (attributes and pseudo-classes), or -1. */
function matchCompound(compound, attributes) {
  let rest = compound;
  let weight = 0;
  while (rest) {
    let m;
    if ((m = rest.match(/^:root/))) weight += 1;
    else if ((m = rest.match(/^\[([a-z-]+)(?:="([^"]*)")?\]/))) {
      const [, name, value] = m;
      if (!Object.hasOwn(attributes, name) || (value !== undefined && attributes[name] !== value)) return -1;
      weight += 1;
    } else if ((m = rest.match(/^:not\(([^()]*)\)/))) {
      const inner = matchCompound(m[1], attributes);
      if (inner >= 0) return -1;
      // `:not()` weighs what it holds.
      weight += (m[1].match(/\[|:root/g) ?? []).length;
    } else throw new Error(`a selector this test does not know: ${compound}`);
    rest = rest.slice(m[0].length);
  }
  return weight;
}

/** The specificity of the most specific selector of a list that matches `<html>`, or -1: `<html>` has no ancestor, so a selector of two compounds never matches it. */
function matchList(list, attributes) {
  return Math.max(...list.split(',').map((one) => {
    const parts = compounds(one);
    return parts.length === 1 ? matchCompound(parts[0], attributes) : -1;
  }));
}

/** Whether the at-rules around a rule hold for the device in `media`. */
function holds(atRules, media) {
  return atRules.every((at) => {
    if (at.startsWith('@layer ')) return true;
    if (at === '@media (prefers-contrast: more)') return media.more;
    if (at === '@media (prefers-reduced-motion: reduce)') return media.reduce;
    throw new Error(`an at-rule this test does not know: ${at}`);
  });
}

/** What `<html>` holds for each property under these sheets, applied in order, in one state. */
function computed(css, attributes, media) {
  const winners = new Map();
  let order = 0;
  for (const sheet of css) {
    for (const rule of sheetRules(sheet)) {
      order += 1;
      // An at-rule's own block holds rules, not declarations.
      if (rule.path.at(-1).startsWith('@')) continue;
      const at = rule.path.slice(0, -1);
      // Every sheet here is written in the tokens' cascade layer, and nowhere else.
      assert.equal(at[0], `@layer ${NS}.tokens`, `every rule in the tokens’ layer: ${rule.path.join(' › ')}`);
      if (!holds(at, media)) continue;
      const weight = matchList(rule.path.at(-1), attributes);
      if (weight < 0) continue;
      for (const [property, value] of rule.declarations) {
        const held = winners.get(property);
        if (!held || weight > held.weight || (weight === held.weight && order >= held.order)) winners.set(property, { weight, order, value });
      }
    }
  }
  return new Map([...winners].map(([property, { value }]) => [property, value]));
}

/** Every state of the root: its scheme, contrast and motion attributes, and what the device asks for. */
function* states() {
  for (const theme of [undefined, 'light', 'dark'])
    for (const contrast of [undefined, 'medium', 'high'])
      for (const motion of [undefined, 'reduce'])
        for (const more of [false, true])
          for (const reduce of [false, true]) {
            const attributes = {};
            if (theme) attributes[`data-${NS}-theme`] = theme;
            if (contrast) attributes[`data-${NS}-contrast`] = contrast;
            if (motion) attributes[`data-${NS}-motion`] = motion;
            yield { attributes, media: { more, reduce } };
          }
}

test('a sheet for every shipped system a reader may choose but the default, and none for the default or the root', () => {
  const looks = sheetLooks(shippedLayers(), NS);
  assert.deepEqual(Object.keys(sheets), looks);
  assert.deepEqual(looks, manifests.filter((id) => id !== NS).sort(), 'the systems the site ships a manifest of, less the default');
  assert.ok(!looks.includes(NS));
  assert.ok(looks.length >= 1);
});

for (const [look, css] of Object.entries(sheets)) {
  test(`${look}: the root drawn with tokens.css and the look's sheet is the root of a product that ships ${look}, in every state`, () => {
    const scoped = generated(`systems/${look}.css`);
    for (const { attributes, media } of states()) {
      const product = computed([tokensCss, scoped], { ...attributes, [`data-${NS}-system`]: look }, media);
      const docs = computed([tokensCss, css], attributes, media);
      const what = `${look}, ${JSON.stringify({ ...attributes, ...media })}`;
      const differ = [...new Set([...product.keys(), ...docs.keys()])].filter((property) => product.get(property) !== docs.get(property));
      assert.deepEqual(differ.slice(0, 5).map((property) => `${property}: ${product.get(property)} → ${docs.get(property)}`), [], `${what}: ${differ.length} properties differ (the product's → the docs')`);
    }
  });

  test(`${look}: a product's root that asks for more contrast, or names a level, shows none of the default system's colours for it`, () => {
    // The default system's rule for a level weighs as much as the scope's on the root (`:root:not([data-…-contrast])`
    // under prefers-contrast: more), or the same as its base block (`[data-…-contrast="high"]`): a property the scope's
    // rule for that level left out would show the default system's colour. Each one the default's rules declare, and the
    // system has a token for, is declared again by the system's own rule for the level.
    const scoped = generated(`systems/${look}.css`);
    const declared = (css, pick) => new Set(sheetRules(css).filter(pick).flatMap((rule) => rule.declarations.map(([property]) => property)));
    const own = declared(scoped, (rule) => !rule.path.includes('@media (prefers-contrast: more)') && !rule.path.at(-1).includes('contrast="'));
    const levels = [
      ['more', (rule) => rule.path.includes('@media (prefers-contrast: more)')],
      ['medium', (rule) => rule.path.at(-1).includes('contrast="medium"')],
      ['high', (rule) => rule.path.at(-1).includes('contrast="high"')],
    ];
    for (const [level, pick] of levels) {
      const restated = declared(scoped, pick);
      const leaked = [...declared(tokensCss, pick)].filter((property) => own.has(property) && !restated.has(property));
      assert.deepEqual(leaked, [], `${look}, ${level}: ${leaked.length} of the default system's properties for this level that the system's sheet does not declare again`);
    }
    // And in every state: no property of the product's root takes the value tokens.css alone gives it at a contrast level
    // when the system's own sheet gives it another without one.
    for (const { attributes, media } of states()) {
      if (!media.more && !attributes[`data-${NS}-contrast`]) continue;
      const product = computed([tokensCss, scoped], { ...attributes, [`data-${NS}-system`]: look }, media);
      const alone = computed([tokensCss], attributes, media);
      const docs = computed([tokensCss, css], attributes, media);
      const leaked = [...product.keys()].filter((property) => product.get(property) === alone.get(property) && docs.get(property) !== alone.get(property));
      assert.deepEqual(leaked.slice(0, 5), [], `${look}, ${JSON.stringify({ ...attributes, ...media })}: ${leaked.length} properties in the default system's colour`);
    }
  });

  test(`${look}: the sheet is written in the tokens' layer, on the root, a small part of the system's own sheet`, () => {
    assert.match(css, new RegExp(`^@layer ${NS}\\.tokens \\{`));
    assert.ok(!css.includes(`data-${NS}-system`), 'no scope: the root is the scope');
    const scoped = generated(`systems/${look}.css`);
    assert.ok(css.length < scoped.length / 3, `the sheet (${css.length} characters) is under a third of the system's own (${scoped.length})`);
  });
}

test('a system’s scoped sheet, as a figure that compares systems draws the default system, is the build’s own: every preset’s declares what systems/<id>.css does', () => {
  const flat = (css) => new Set(sheetRules(css).flatMap((rule) => rule.declarations.map(([property, value]) => `${rule.path.join(' › ')} ${property}: ${value}`)));
  for (const look of Object.keys(sheets)) {
    const want = flat(generated(`systems/${look}.css`));
    const got = flat(scopedSheet(look));
    assert.deepEqual([[...want].filter((each) => !got.has(each)).slice(0, 3), [...got].filter((each) => !want.has(each)).slice(0, 3)], [[], []], look);
  }
  const own = scopedSheet(NS);
  assert.match(own, new RegExp(`\\[data-${NS}-system="${NS}"\\] \\{`), 'the default system under its own scope');
  assert.ok(!/(^|\n)\s*:root\b/.test(own), 'and nowhere on the root');
});

test('a look’s file is named by its contents', () => {
  const [look, css] = Object.entries(sheets)[0];
  const name = lookFileName(look, css);
  assert.match(name, new RegExp(`^look-${look}\\.[0-9a-f]{8}\\.css$`));
  assert.equal(lookFileName(look, css), name);
  assert.notEqual(lookFileName(look, `${css} `), name, 'other contents, another name');
});
