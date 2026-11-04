// The gallery of fixtures (src/lib/fixture-gallery.ts), read by Node: which stage each fixture of every spec takes,
// how the stages are grouped, what each draws, and what the copy action hands a reader. No browser, no build.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, test } from 'node:test';

register('./vite-shim.mjs', import.meta.url);
const { closed, drawnInPlace, galleryOf, groupingAxis, presented, stageOf, windowOf, stagesScript, stagingStyle, stepScript, windowScript } = await import('../src/lib/fixture-gallery.ts');
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

  test('a stage in the page draws the stage of the web package’s document, at its baseline’s size; an opener’s closed', () => {
    for (const spec of implemented) {
      const document = fixtureDocument(spec.name);
      for (const fixture of spec.fixtures) {
        const stage = stageOf(spec, fixture);
        if (stage.kind === 'window') continue;
        const html = document.stages.find((each) => each.id === fixture.id).html;
        assert.equal(stage.html, stage.kind === 'opener' ? closed(spec, html, stage.presence) : html, `${spec.name}/${fixture.id}`);
        assert.deepEqual(stage.reserve, document.sizes[fixture.id], `${spec.name}/${fixture.id}`);
      }
    }
    // The components whose fixtures only a window drew while the site had a renderer of its own are drawn in the page
    // (all but the app shell, whose fixtures are each a whole page's frame).
    for (const name of ['code-block', 'inline-code', 'link', 'navigation-drawer', 'previous-next-links', 'steps', 'timeline']) {
      assert.ok(galleryOf(specs[name]).some((group) => group.stages.some((stage) => stage.kind === 'inline')), name);
    }
  });

  test('a presented fixture is drawn in the page where its document draws it in place, closed with an opener where its surface stands beside its anchor in the top layer, and alone in a window where it is modal', () => {
    const kinds = {};
    for (const spec of implemented) {
      const { page, windowed, stages } = fixtureDocument(spec.name);
      for (const fixture of spec.fixtures) {
        const stage = stageOf(spec, fixture);
        const html = stages.find((each) => each.id === fixture.id).html;
        // A whole page's frame and a stage the size of the window are drawn in a window; what is not presented, or is
        // drawn in place, in the page.
        if (page || windowed.includes(fixture.id)) assert.equal(stage.kind, 'window', `${spec.name}/${fixture.id}`);
        else if (!presented(spec, fixture) || drawnInPlace(spec, html)) assert.equal(stage.kind, 'inline', `${spec.name}/${fixture.id}`);
        else (kinds[`${spec.name} ${stage.kind}`] ??= []).push(fixture.id);
        if (stage.kind === 'window') assert.ok(stage.window.width >= 40 && stage.window.height >= 40, `${spec.name}/${fixture.id}`);
      }
    }
    // Every presented fixture not drawn in place, by component and how it is shown.
    assert.deepEqual(Object.keys(kinds).sort(), [
      'bottom-sheet inline', 'bottom-sheet window', 'button-with-menu opener', 'date-time-picker window', 'dialog window', 'image-preview window', 'modal-layer window', 'navigation-drawer inline', 'navigation-drawer window', 'popover window', 'side-sheet inline', 'side-sheet window', 'snackbar inline', 'table-of-contents inline', 'tooltip opener',
    ]);
    // A drawer, a sheet: modal in a window, standard in the page.
    assert.deepEqual(kinds['navigation-drawer window'].sort(), ['modal', 'modal-collapsible-open']);
    assert.ok(kinds['side-sheet inline'].includes('standard') && kinds['side-sheet window'].includes('modal'));
    // An anchored surface its document draws in place is in the page: an open menu, a select's list, a popover beside its anchor.
    for (const [name, id] of [['menu', 'actions'], ['select', 'stacked-open'], ['popover', 'basic'], ['fab-menu', 'filled-open'], ['date-time-picker', 'docked-date']]) {
      assert.equal(stageOf(specs[name], specs[name].fixtures.find((f) => f.id === id)).kind, 'inline', `${name}/${id}`);
    }
    assert.equal(stageOf(specs['app-shell'], specs['app-shell'].fixtures[0]).kind, 'window');
    // A responsive drawer's stage is as wide as the window (`inline-size: 100vw`): it is drawn in one.
    assert.deepEqual(fixtureDocument('navigation-drawer').windowed.sort(), ['responsive-medium', 'responsive-narrow', 'responsive-wide']);
    assert.equal(presented(specs.dialog, specs.dialog.fixtures[0]), true);
    assert.equal(presented(specs.button, specs.button.fixtures[0]), false);
  });

  test('an opener’s stage is its fixture closed, and names the attribute that presents it', () => {
    const tooltip = stageOf(specs.tooltip, specs.tooltip.fixtures.find((f) => f.id === 'plain'));
    assert.equal(tooltip.kind, 'opener');
    assert.equal(tooltip.presence, 'open');
    assert.doesNotMatch(tooltip.html, /<tanrei-tooltip[^>]*\sopen[\s>]/);
    assert.match(tooltip.markup, /^<tanrei-tooltip[^>]*\sopen[\s>]/, 'the code a reader copies is the fixture as it is written: open');
    assert.throws(() => closed(specs.tooltip, '<div class="stage"><tanrei-tooltip text="x"></tanrei-tooltip></div>', 'open'), /without the attribute open/);
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

});

describe('what the gallery writes into the page', () => {
  test('the stages’ markup is data the page’s rewriting of its content leaves as it is, and that reads back whole', () => {
    for (const spec of implemented) {
      const groups = galleryOf(spec);
      const script = stagesScript(groups);
      assert.equal(tanreiContent(script, words), script, spec.name);
      assert.doesNotMatch(script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script>')), /</, spec.name);
      const read = JSON.parse(script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script>')));
      for (const stage of groups.flatMap((group) => group.stages).filter((each) => each.drawn)) assert.equal(read[stage.id], stage.html, `${spec.name}/${stage.id}`);
    }
  });

  test('what a window writes into its document besides its stage is data the rewriting leaves as it is', () => {
    for (const spec of implemented) {
      const document = fixtureDocument(spec.name);
      const script = windowScript(document);
      assert.equal(tanreiContent(script, words), script, spec.name);
      const read = JSON.parse(script.slice(script.indexOf('>') + 1, script.lastIndexOf('</script>')));
      assert.deepEqual(read, { staging: document.staging, page: document.page }, spec.name);
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
    assert.deepEqual(stepped.map((spec) => spec.name).sort(), ['chat-composer', 'drop-zone', 'embedded-text-input', 'file-upload', 'scroll-area']);
    for (const spec of stepped) {
      const script = stepScript(spec.name, fixtureDocument(spec.name).step);
      assert.equal(tanreiContent(script, words), script, spec.name);
      assert.doesNotMatch(script.slice('<script type="module">'.length, -'</script>'.length), /<\/script/i, spec.name);
      assert.match(script, new RegExp(`docsFixtureSteps \\?\\?= \\{\\}\\)\\[${JSON.stringify(spec.name)}\\]`), spec.name);
    }
  });
});
