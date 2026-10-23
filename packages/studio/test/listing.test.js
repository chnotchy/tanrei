// Theme Studio's list of components follows the specs' `listing` (src/listing.js): by default the
// components every list shows, on request all of them, and a component with no panel of its own opens its members'.
// Read from the specs through the generated status file — the tests
// compare the list with the spec files themselves, so a component listed by hand, or a listing written into the
// code, fails here. Nothing depends on how many components there are.
//
//   pnpm --filter @tanrei/studio test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { catalogOf, componentList } from '../src/listing.js';
import { json, repoRoot, studio } from './studio-node.js';

const specs = fs.readdirSync(path.join(repoRoot, 'specs')).filter((file) => file.endsWith('.spec.json')).map((file) => json(`specs/${file}`));
const status = json('docs/status/status.json');
const model = studio.preview(studio.blank(studio.defaultId)).model;
const declared = Object.keys(model.components);
/** The sets of tokens that are no component's, each with its readers (the input box). */
const shared = model.shared;
const readsOf = (name) => Object.keys(shared).filter((set) => shared[set].includes(name));
const { listed, onRequest } = status.listings;

describe('the catalog the Studio is given', () => {
  test('is the specs’: every spec’s level, listing and members, and no name of its own', () => {
    assert.deepEqual(studio.catalog, catalogOf(status));
    for (const spec of specs) {
      const row = studio.catalog.components.find((entry) => entry.name === spec.name);
      assert.ok(row, `${spec.name}: not in the catalog`);
      assert.deepEqual([row.level, row.listing, row.builtFrom], [spec.level, spec.listing, spec.builtFrom ?? []], spec.name);
    }
  });
  test('and the source of the list writes no component’s name, no level and no listing', () => {
    const source = fs.readFileSync(path.join(repoRoot, 'packages/studio/src/listing.js'), 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    const panel = fs.readFileSync(path.join(repoRoot, 'packages/studio/src/ui/panels.ts'), 'utf8');
    for (const word of [listed, onRequest, ...Object.values(status.levels)]) assert.doesNotMatch(source, new RegExp(`['"\`]${word}['"\`]`), word);
    for (const spec of specs.filter((entry) => entry.listing === onRequest)) {
      assert.doesNotMatch(source, new RegExp(`['"\`]${spec.name}['"\`]`), spec.name);
      assert.doesNotMatch(panel, new RegExp(`['"\`]${spec.name}['"\`]`), spec.name);
    }
    assert.match(panel, /componentList\(Object\.keys\(ctx\.view\(\)\.model\.components as Json\), studio\.catalog, \{ everything: everyComponent\(\), shared: ctx\.view\(\)\.model\.shared \}\)/);
  });
});

describe('the list of components', () => {
  const byDefault = componentList(declared, studio.catalog, { shared });
  const everything = componentList(declared, studio.catalog, { everything: true, shared });
  const listingOf = (name) => specs.find((spec) => spec.name === name)?.listing;

  test('by default leaves out exactly what a spec marks to be shown on request', () => {
    for (const entry of byDefault) assert.notEqual(listingOf(entry.name), onRequest, entry.name);
    const left = everything.filter((entry) => !byDefault.some((shown) => shown.name === entry.name));
    assert.deepEqual(left.map((entry) => listingOf(entry.name)), left.map(() => onRequest));
    assert.ok(left.every((entry) => entry.onRequest));
    // The order is the same with and without them.
    assert.deepEqual(byDefault.map((entry) => entry.name), everything.filter((entry) => !entry.onRequest).map((entry) => entry.name));
  });
  test('on request holds every component the tokens declare, each with a panel of its own', () => {
    for (const name of declared) assert.equal(everything.find((entry) => entry.name === name)?.own, true, name);
    // What the repository has today: at least one spec is shown on request, and it is in the switched list alone.
    const marked = specs.filter((spec) => spec.listing === onRequest && declared.includes(spec.name));
    for (const spec of marked) {
      assert.ok(everything.some((entry) => entry.name === spec.name && entry.onRequest), spec.name);
      assert.ok(!byDefault.some((entry) => entry.name === spec.name), spec.name);
    }
  });
  test('a component with no panel of its own opens its members’ — whatever their listing', () => {
    const without = specs.filter((spec) => !declared.includes(spec.name) && (spec.builtFrom ?? []).some((member) => declared.includes(member)));
    for (const spec of without) {
      const entry = everything.find((row) => row.name === spec.name);
      assert.ok(entry, spec.name);
      assert.equal(entry.own, false);
      // A member that reads a shared set brings the set's panel before its own.
      assert.deepEqual(entry.members, [...new Set(spec.builtFrom.filter((member) => declared.includes(member)).flatMap((member) => [...readsOf(member), member]))]);
    }
    // A listed component built from one shown on request still leads to it by default.
    for (const entry of byDefault.filter((row) => !row.own)) for (const member of entry.members) assert.ok(declared.includes(member), `${entry.name} → ${member}`);
  });
  test('a set of tokens that is no component’s is an item of its own, and every control drawn on it leads to it', () => {
    const sets = Object.keys(shared);
    // What the repository has today: the box of the five input controls.
    assert.ok(sets.length >= 1);
    for (const set of sets) {
      assert.ok(!specs.some((spec) => spec.name === set), `${set} is a component`);
      assert.ok(shared[set].length >= 2, set);
      // Listed by default, with a panel of its own, and with no level: it is no component.
      const entry = byDefault.find((row) => row.name === set);
      assert.deepEqual(entry, { name: set, own: true, members: [], role: undefined, onRequest: false });
      // Its axes are declared: that is where its sizes and its looks are shown and edited.
      assert.ok(Object.keys(model.components[set].axes).length > 0, set);
      for (const reader of shared[set]) {
        // A reader keeps a panel of its own — also where it declares no axis any more — and says what it reads.
        const row = everything.find((each) => each.name === reader);
        assert.ok(row, `${reader}: gone from the list`);
        assert.equal(row.own, true, reader);
        assert.deepEqual(row.reads, [set], reader);
        // A component built around a reader opens the set's panel beside its members'.
        for (const spec of specs.filter((each) => (each.builtFrom ?? []).includes(reader))) assert.ok(everything.find((each) => each.name === spec.name).members.includes(set), `${spec.name} → ${set}`);
      }
    }
    // A component that reads no set says nothing of one.
    assert.equal(everything.find((row) => row.name === 'button').reads, undefined);
    // Made up: a set nobody declared is nobody's panel.
    assert.deepEqual(componentList(['a'], undefined, { shared: { box: ['a', 'b'] } }), [{ name: 'a', own: true, members: [], role: undefined, onRequest: false }]);
    assert.deepEqual(componentList(['box', 'a'], undefined, { shared: { box: ['a', 'b'] } }).map((row) => [row.name, row.reads]), [['box', undefined], ['a', ['box']]]);
  });
  test('says what each component’s level is by the key of its word, which every language has', () => {
    const roles = Object.keys(status.levels);
    for (const entry of everything.filter((row) => specs.some((spec) => spec.name === row.name))) assert.ok(roles.includes(entry.role), entry.name);
    // The words: English names each key, and every language has exactly English's keys (test/strings.test.js; `typecheck`).
    const english = fs.readFileSync(path.join(repoRoot, 'packages/studio/src/strings/en.ts'), 'utf8');
    const levels = /levels: open\(\{([^}]*)\}\)/.exec(english)?.[1] ?? '';
    for (const role of roles) assert.match(levels, new RegExp(`\\b${role}: '`), role);
    for (const key of ['everything', 'advanced', 'members']) assert.match(english, new RegExp(`\\b${key}: '`), key);
  });
  test('a component the catalog does not know is listed, and with no catalog nothing is left out', () => {
    assert.deepEqual(componentList(['own-thing'], studio.catalog).map((entry) => [entry.name, entry.own, entry.onRequest]), [['own-thing', true, false]]);
    assert.deepEqual(componentList(declared, undefined).map((entry) => entry.name), declared);
  });
  test('a made-up catalog: one of two is shown on request, whatever the names are called', () => {
    const catalog = { levels: { single: 'a', completes: 'b' }, listings: { listed: 'x', onRequest: 'y' }, components: [{ name: 'input', level: 'a', listing: 'y', builtFrom: [] }, { name: 'field', level: 'b', listing: 'x', builtFrom: ['input', 'frame'] }] };
    assert.deepEqual(componentList(['input'], catalog), [{ name: 'field', own: false, members: ['input'], role: 'completes', onRequest: false }]);
    assert.deepEqual(componentList(['input'], catalog, { everything: true }).map((entry) => [entry.name, entry.role, entry.onRequest]), [['input', 'single', true], ['field', 'completes', false]]);
  });
});
