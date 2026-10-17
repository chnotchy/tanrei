// The gallery of fixtures (src/lib/fixture-gallery.ts), read by Node: which stage each fixture of every spec takes,
// how the stages are grouped, and what the copy action hands a reader. No browser, no build.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, test } from 'node:test';

register('./vite-shim.mjs', import.meta.url);
const { galleryOf, groupingAxis, stageOf, windowOf, fixturePageHref } = await import('../src/lib/fixture-gallery.ts');
const { drawsLive, liveFixture } = await import('../src/lib/fixtures.ts');
const { definedTags, specs } = await import('../src/lib/repo.ts');

const live = (spec) => definedTags.has(spec.platforms.web?.name) && drawsLive(spec);

describe('the gallery of fixtures', () => {
  test('every fixture of every spec has one stage, in a group of the grouping axis’s value', () => {
    for (const spec of Object.values(specs)) {
      const groups = galleryOf(spec, live(spec));
      const ids = groups.flatMap((group) => group.stages.map((stage) => stage.id));
      assert.deepEqual([...ids].sort(), spec.fixtures.map((f) => f.id).sort(), spec.name);
      const axis = groupingAxis(spec);
      for (const group of groups) {
        if (!axis) assert.equal(group.axis, undefined, spec.name);
        else assert.equal(group.axis?.name, axis.name, spec.name);
      }
    }
  });

  test('the stages are grouped by the first axis that tells the fixtures apart, in the order of its values', () => {
    const button = galleryOf(specs.button, live(specs.button));
    assert.equal(groupingAxis(specs.button)?.name, 'variant');
    assert.deepEqual(button.map((group) => group.axis?.value), ['filled', 'tonal', 'elevated', 'outlined', 'text']);
    // A spec none of whose axes tells two fixtures apart has one group, without a heading.
    assert.equal(galleryOf(specs.dialog, live(specs.dialog)).length, 1);
  });

  test('a presented fixture is drawn alone in a window; every other one in the page', () => {
    for (const spec of Object.values(specs).filter(live)) {
      for (const fixture of spec.fixtures) {
        const stage = stageOf(spec, fixture, true);
        if (!stage.drawn) continue;
        const presented = liveFixture(spec, fixture).presentation !== 'none';
        assert.equal(stage.kind, presented ? 'window' : 'inline', `${spec.name}/${fixture.id}`);
        if (presented) assert.ok(stage.window.width >= 300 && stage.window.height >= 200, `${spec.name}/${fixture.id}`);
      }
    }
  });

  test('a window is the one the web harness draws the fixture in', () => {
    const byId = (name, id) => specs[name].fixtures.find((f) => f.id === id);
    assert.deepEqual(windowOf(specs.dialog, { id: 'compact-basic', props: {} }), { width: 360, height: 640 });
    assert.deepEqual(windowOf(specs.dialog, byId('dialog', 'basic')), { width: 640, height: 640 });
    assert.deepEqual(windowOf(specs['date-time-picker'], { id: 'x', props: { layout: 'horizontal' } }), { width: 800, height: 640 });
    assert.deepEqual(windowOf(specs.tooltip, { id: 'x', props: {} }), { width: 320, height: 200 });
  });

  test('a fixture as wide as its layout starts its stage at that width and fills it', () => {
    const stage = stageOf(specs['text-field'], specs['text-field'].fixtures[0], live(specs['text-field']));
    assert.equal(stage.width, '17.5rem');
    assert.match(stage.html, /^<tanrei-text-field[^>]* style="inline-size: 100%; max-inline-size: 100%"/);
    // One that is as wide as what it draws keeps its own size, and its stage has no handle.
    assert.equal(stageOf(specs.button, specs.button.fixtures[0], true).width, undefined);
  });

  test('the copied markup is the element as a product writes it', () => {
    for (const spec of Object.values(specs).filter(live)) {
      for (const fixture of spec.fixtures) {
        const { markup, drawn } = stageOf(spec, fixture, true);
        if (!drawn) continue;
        assert.doesNotMatch(markup, /not-content|tanrei-not-prose|data-fixture-files|data:image/, `${spec.name}/${fixture.id}`);
        assert.ok(markup.startsWith('<'), `${spec.name}/${fixture.id}`);
      }
    }
    // A presented fixture's markup is presented, as its window draws it.
    assert.match(stageOf(specs.dialog, specs.dialog.fixtures[0], true).markup, /^<tanrei-dialog[^>]* open[\s>]/);
  });

  test('a fixture’s own page is addressed with its id and scheme', () => {
    assert.equal(fixturePageHref('button'), '/fixtures/button/');
    assert.equal(fixturePageHref('dialog', 'basic', 'dark'), '/fixtures/dialog/?id=basic&theme=dark');
  });
});
