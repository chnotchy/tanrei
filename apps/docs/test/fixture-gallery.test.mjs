// The gallery of fixtures (src/lib/fixture-gallery.ts), read by Node: which stage each fixture of every spec takes,
// how the stages are grouped, what each draws, and what the copy action hands a reader. No browser, no build.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, test } from 'node:test';

register('./vite-shim.mjs', import.meta.url);
const { galleryOf, groupingAxis, presented, stageOf, windowOf, fixtureWindowHref, stagesScript, stagingStyle, stepScript } = await import('../src/lib/fixture-gallery.ts');
const { fixtureDocument } = await import('../src/lib/fixture-documents.ts');
const { specs } = await import('../src/lib/repo.ts');
const { tanreiContent } = await import('../src/lib/markdown-content.mjs');

const implemented = Object.values(specs).filter((spec) => spec.platforms.web && spec.platforms.web.status !== 'planned');
const words = { kind: (name) => name, code: { copy: 'Copy', copied: 'Copied', copyFailed: 'Failed', highlighted: 'Highlighted', added: 'Added', removed: 'Removed' }, externalLink: 'External' };

describe('the gallery of fixtures', () => {
  test('every fixture of every spec has one stage, in a group of the grouping axis’s value', () => {
    for (const spec of Object.values(specs)) {
      const groups = galleryOf(spec);
      const ids = groups.flatMap((group) => group.stages.map((stage) => stage.id));
      assert.deepEqual([...ids].sort(), spec.fixtures.map((f) => f.id).sort(), spec.name);
      const axis = groupingAxis(spec);
      for (const group of groups) {
        if (!axis) assert.equal(group.axis, undefined, spec.name);
        else assert.equal(group.axis?.name, axis.name, spec.name);
      }
    }
  });

  test('every fixture of every component the web implements is drawn', () => {
    const missing = implemented.flatMap((spec) => galleryOf(spec).flatMap((group) => group.stages).filter((stage) => !stage.drawn).map((stage) => `${spec.name}/${stage.id}`));
    assert.deepEqual(missing, []);
  });

  test('the stages are grouped by the first axis that tells the fixtures apart, in the order of its values', () => {
    const button = galleryOf(specs.button);
    assert.equal(groupingAxis(specs.button)?.name, 'variant');
    assert.deepEqual(button.map((group) => group.axis?.value), ['filled', 'tonal', 'elevated', 'outlined', 'text']);
    // A spec none of whose axes tells two fixtures apart has one group, without a heading.
    assert.equal(galleryOf(specs.dialog).length, 1);
  });

  test('an inline stage draws the stage of the web package’s document, at its baseline’s size', () => {
    for (const spec of implemented) {
      const document = fixtureDocument(spec.name);
      for (const fixture of spec.fixtures) {
        const stage = stageOf(spec, fixture);
        if (stage.kind !== 'inline') continue;
        assert.equal(stage.html, document.stages.find((each) => each.id === fixture.id).html, `${spec.name}/${fixture.id}`);
        assert.deepEqual(stage.reserve, document.sizes[fixture.id], `${spec.name}/${fixture.id}`);
      }
    }
    // The components whose fixtures only a window drew while the site had a renderer of its own are drawn in the page
    // (all but the app shell, whose fixtures are each a whole page's frame).
    for (const name of ['code-block', 'inline-code', 'link', 'navigation-drawer', 'previous-next-links', 'steps', 'timeline']) {
      assert.ok(galleryOf(specs[name]).some((group) => group.stages.some((stage) => stage.kind === 'inline')), name);
    }
  });

  test('a presented fixture, and a whole page’s frame, is drawn alone in a window; every other one in the page', () => {
    for (const spec of implemented) {
      const page = fixtureDocument(spec.name).page;
      for (const fixture of spec.fixtures) {
        const stage = stageOf(spec, fixture);
        assert.equal(stage.kind, page || presented(spec, fixture) ? 'window' : 'inline', `${spec.name}/${fixture.id}`);
        if (stage.kind === 'window') assert.ok(stage.window.width >= 40 && stage.window.height >= 40, `${spec.name}/${fixture.id}`);
      }
    }
    assert.equal(stageOf(specs['app-shell'], specs['app-shell'].fixtures[0]).kind, 'window');
    assert.equal(presented(specs.dialog, specs.dialog.fixtures[0]), true);
    assert.equal(presented(specs.button, specs.button.fixtures[0]), false);
  });

  test('a window without a baseline is the one the web harness draws the fixture in', () => {
    const byId = (name, id) => specs[name].fixtures.find((f) => f.id === id);
    assert.deepEqual(windowOf(specs.dialog, { id: 'compact-basic', props: {} }), { width: 360, height: 640 });
    assert.deepEqual(windowOf(specs.dialog, byId('dialog', 'basic')), { width: 640, height: 640 });
    assert.deepEqual(windowOf(specs['date-time-picker'], { id: 'x', props: { layout: 'horizontal' } }), { width: 800, height: 640 });
    assert.deepEqual(windowOf(specs.tooltip, { id: 'x', props: {} }), { width: 320, height: 200 });
  });

  test('the copied markup is what the document’s stage holds, without its inlined pictures', () => {
    for (const spec of implemented) {
      for (const fixture of spec.fixtures) {
        const { markup } = stageOf(spec, fixture);
        assert.doesNotMatch(markup, /data:image|class="stage"/, `${spec.name}/${fixture.id}`);
        assert.ok(markup.startsWith('<'), `${spec.name}/${fixture.id}`);
      }
    }
    // A presented fixture's markup is presented, as its window draws it.
    assert.match(stageOf(specs.dialog, specs.dialog.fixtures[0]).markup, /^<tanrei-dialog[^>]* open[\s>]/);
  });

  test('a window’s document is addressed with its fixture’s id', () => {
    assert.equal(fixtureWindowHref('dialog', 'basic'), '/fixtures/dialog/?id=basic');
    assert.equal(fixtureWindowHref('menu', 'a b&c'), '/fixtures/menu/?id=a+b%26c');
  });
});

describe('what the gallery writes into the page', () => {
  test('the stages’ markup is data the page’s rewriting of its content leaves as it is, and that reads back whole', () => {
    for (const spec of implemented) {
      const groups = galleryOf(spec);
      const script = stagesScript(groups);
      assert.equal(tanreiContent(script, words), script, spec.name);
      assert.doesNotMatch(script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script>')), /</, spec.name);
      const read = JSON.parse(script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script>')));
      for (const stage of groups.flatMap((group) => group.stages).filter((each) => each.kind === 'inline')) assert.equal(read[stage.id], stage.html, `${spec.name}/${stage.id}`);
    }
  });

  test('the staging is scoped to the stages’ canvases, and the rewriting leaves it as it is', () => {
    for (const spec of implemented) {
      const style = stagingStyle(fixtureDocument(spec.name).staging);
      assert.match(style, /^<style data-fixture-staging>@scope \(\[data-fixture-scope\]\) \{/, spec.name);
      assert.equal(tanreiContent(style, words), style, spec.name);
    }
  });

  test('a document’s step in script is kept for the gallery, and the rewriting leaves it as it is', () => {
    const stepped = implemented.filter((spec) => fixtureDocument(spec.name).step);
    assert.deepEqual(stepped.map((spec) => spec.name).sort(), ['chat-composer', 'drop-zone', 'embedded-text-input', 'file-upload']);
    for (const spec of stepped) {
      const script = stepScript(spec.name, fixtureDocument(spec.name).step);
      assert.equal(tanreiContent(script, words), script, spec.name);
      assert.doesNotMatch(script.slice('<script type="module">'.length, -'</script>'.length), /<\/script/i, spec.name);
      assert.match(script, new RegExp(`docsFixtureSteps \\?\\?= \\{\\}\\)\\[${JSON.stringify(spec.name)}\\]`), spec.name);
    }
  });
});
