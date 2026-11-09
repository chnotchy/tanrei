// A layer's sheet for a page that already holds the default system's (core.pageSheet): applied after the web
// package's tokens.css, in the same cascade layer, the root draws the layer — every custom property the layer's whole
// sheet declares has the layer's value — at every contrast level and under `prefers-contrast`, though the sheet holds
// only what differs. The cascade is worked out here as a browser works it out on `<html>`: the rules that match, the
// most specific, then the last.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { repoRoot, studio } from './studio-node.js';

const NS = studio.namespace;
const tokensCss = fs.readFileSync(path.join(repoRoot, 'packages/web/src/generated/tokens.css'), 'utf8');

/** The rules of a sheet, in order: the selector, whether it stands under `prefers-contrast: more`, and its declarations. */
function rules(css) {
  const out = [];
  const open = [];
  for (const line of css.split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('/*')) continue;
    if (text.endsWith('{')) {
      open.push(text.slice(0, -1).trim());
      out.push({ selector: open.at(-1), media: open.some((at) => at.startsWith('@media')), declarations: [] });
    } else if (text === '}') open.pop();
    else {
      const colon = text.indexOf(':');
      out.findLast((rule) => rule.selector === open.at(-1))?.declarations.push([text.slice(0, colon), text.slice(colon + 1).trim().replace(/;$/, '')]);
    }
  }
  return out.filter((rule) => !rule.selector.startsWith('@'));
}

/** The specificity of one selector the emitter writes when it matches `<html>` in `state`, else -1. */
function specificity(selector, state) {
  const contrast = `[data-${NS}-contrast]`;
  if (selector === ':root') return 10;
  if (selector === contrast) return state.contrast ? 10 : -1;
  if (selector === `:root:not(${contrast})`) return state.contrast ? -1 : 20;
  const level = selector.match(new RegExp(`^\\[data-${NS}-contrast="(\\w+)"\\]$`));
  if (level) return state.contrast === level[1] ? 10 : -1;
  if (selector.startsWith(`[data-${NS}-theme=`)) return -1;
  throw new Error(`a selector this test does not know: ${selector}`);
}

/** What `<html>` holds for each custom property, in `state`, under these sheets applied in order. */
function computed(sheets, state) {
  const winners = new Map();
  let order = 0;
  for (const css of sheets) {
    for (const rule of rules(css)) {
      order += 1;
      if (rule.media && !state.more) continue;
      const weight = Math.max(...rule.selector.split(',').map((one) => specificity(one.trim(), state)));
      if (weight < 0) continue;
      for (const [property, value] of rule.declarations) {
        const held = winners.get(property);
        if (!held || weight > held.weight || (weight === held.weight && order >= held.order)) winners.set(property, { weight, order, value });
      }
    }
  }
  return new Map([...winners].map(([property, { value }]) => [property, value]));
}

const STATES = [{}, { contrast: 'medium' }, { contrast: 'high' }, { more: true }, { more: true, contrast: 'medium' }];
/** Asserts that the page draws the layer: tokens.css then the page sheet give `<html>` the layer's whole sheet. */
function assertDrawsTheLayer(layer, what) {
  const view = studio.preview(layer);
  assert.ok(view.model, `${what}: the layer computes (${view.problems})`);
  const page = studio.pageSheet(view);
  // The layer's whole sheet, unscoped, as `tanrei build` writes it for a product whose system this is.
  const whole = view.css(view.layer.id).replaceAll(`[data-${NS}-system="${view.layer.id}"]`, ':root');
  for (const state of STATES) {
    const want = computed([fixScoped(whole)], state);
    const got = computed([tokensCss, page], state);
    const wrong = [...want].filter(([property, value]) => property.startsWith('--') && got.get(property) !== value);
    assert.deepEqual(wrong.slice(0, 5), [], `${what}, ${JSON.stringify(state)}: ${wrong.length} properties draw another value than the layer's (want → got: ${wrong.slice(0, 5).map(([p, v]) => `${p} ${v} → ${got.get(p)}`).join('; ')})`);
  }
  return { page, whole };
}

/** A scoped sheet's selectors read on `<html>` as the unscoped sheet's: the scope is the root. */
function fixScoped(css) {
  const contrast = `[data-${NS}-contrast]`;
  return css
    .replaceAll(`:root, :root ${contrast}`, `:root, ${contrast}`)
    .replace(/:root\[data-[a-z]+-contrast="(\w+)"\], :root \[data-[a-z]+-contrast="\w+"\], \[data-[a-z]+-contrast="\w+"\] :root:not\(\[data-[a-z]+-contrast\]\)/g, (_, level) => `[data-${NS}-contrast="${level}"]`);
}

test('a layer that changes nothing: the page sheet declares no token', () => {
  const page = studio.pageSheet(studio.preview({ id: 'acme', extends: studio.defaultId }));
  assert.equal(typeof page, 'string');
  assert.deepEqual([...page.matchAll(/^\s*(--[^:]+):/gm)].map((m) => m[1]), []);
});

test('a brand color and a denser size: the root draws the layer at every contrast level, from a sheet a fraction of the whole', () => {
  let layer = studio.setPalette({ id: 'acme', extends: studio.defaultId }, 'primary', { source: { seed: '#0b6e4f' } });
  layer = studio.setEssential(layer, 'space.unit', 3);
  const { page, whole } = assertDrawsTheLayer(layer, 'brand and size');
  assert.ok(page.length < whole.length / 2, `the page sheet (${page.length} characters) is less than half the whole sheet (${whole.length})`);
  assert.match(page, new RegExp(`^@layer ${NS}\\.tokens \\{`), 'in the default sheet’s cascade layer');
});

test('a layer on a showcase system: the root draws it, the components it does not have included', () => {
  const showcase = studio.systems.find((system) => system.id !== studio.defaultId && !system.local);
  assert.ok(showcase, 'a shipped system other than the default');
  const { page } = assertDrawsTheLayer({ id: 'acme', extends: showcase.id }, showcase.id);
  assert.match(page, new RegExp(`--${NS}-unavailable`), 'what the system does not have is the layer’s');
});

test('a layer that cannot be computed has no page sheet', () => {
  assert.equal(studio.pageSheet(studio.preview({ id: 'acme', extends: 'nothing-like-this' })), null);
});
