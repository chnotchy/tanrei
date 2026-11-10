// Every fixture written open — `open` or `expanded` true on the element or on an item it holds — in the page's markup,
// read by a navigation, moves nothing as the page loads (MOT-3, MOT-4, docs/architecture/motion.md): an overlay is there
// in the document's first frame without its entrance, and nothing around it fades, slides or grows into the state it
// was written in. Where the harness draws an open surface in place (the `inline` test attribute: a menu's, a select's,
// a search's view), the fixture is also loaded as the real overlay it stands for (`inline: false`, and an anchor where
// the overlay needs one), which is how a product writes it.
//
// What is counted is every `transitionrun` and `animationstart` in the document and in every shadow root, from before
// the first element is defined until every element has updated, the document's first paint has been counted and
// nothing moves any more (`loadOpen`, test/mounted-open.ts). A fixture whose markup alone is not the fixture (its items
// are handed over by a step in script) is not run.
//
// Two lists hold what is let through:
// - `ALLOWED`: a motion that is not a transition into the state the page was written in — a cycle that runs while its
//   element is shown, a change that comes after the page has settled — each with its rule. It only shrinks.
// - `KNOWN`: a fixture that moves at load, a defect not fixed yet, with what it shows. Each is expected to fail
//   (`test.fail`): once it is fixed it fails as passing, and leaves the list. The list only shrinks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, type Spec, fixtureWindow, itemsStagedInScript, loadSpec, stageMarkup } from '../test/harness.js';
import { type MotionRun, loadOpen } from '../test/mounted-open.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'specs/inventory.json'), 'utf8')) as { components: { name: string }[] };
/** Every component that has a spec and an element here (a spec accepted ahead of its implementation has no element to mount). */
const specs: Spec[] = inventory.components
  .filter((c) => fs.existsSync(path.join(repo, `specs/${c.name}.spec.json`)) && fs.existsSync(path.join(repo, `packages/web/src/components/${c.name}`)))
  .map((c) => loadSpec(c.name));

const writtenOpen = (props: FixtureItem['props']) => props.open === true || props.expanded === true;
const holdsOpen = (items: FixtureItem[] | undefined): boolean => !!items?.some((item) => writtenOpen(item.props) || holdsOpen(item.items));

/**
 * The real overlay a fixture drawn in place stands for: `inline: false` on the element and on every item written open,
 * and, where the harness draws a surface in place unless it names an anchor (a menu, a popover, a docked picker), an
 * anchor the staging draws a button for.
 */
function asOverlay(spec: Spec, fixture: Fixture): Fixture {
  const off = (items: FixtureItem[] | undefined): FixtureItem[] | undefined =>
    items?.map((item) => ({ ...item, props: writtenOpen(item.props) ? { ...item.props, inline: false } : item.props, items: off(item.items) }));
  const anchored = spec.name === 'menu' || (spec.name === 'popover' && !fixture.id.startsWith('compact')) || (spec.name === 'date-time-picker' && fixture.props.presentation === 'docked');
  const props = writtenOpen(fixture.props) ? { ...fixture.props, inline: false, ...(anchored && !fixture.props.anchor ? { anchor: `anchor-${fixture.id}` } : {}) } : fixture.props;
  return { ...fixture, props, items: off(fixture.items) };
}

/** What a fixture written open is loaded as: as written, and — where that is another document — as the real overlay. */
function forms(spec: Spec, fixture: Fixture): { form: string; fixture: Fixture }[] {
  const overlay = asOverlay(spec, fixture);
  const differs = stageMarkup(spec, overlay, '') !== stageMarkup(spec, fixture, '');
  return [{ form: '', fixture }, ...(differs ? [{ form: ', as the real overlay (inline false),', fixture: overlay }] : [])];
}

/**
 * The motions at load that are not a transition into the state the page was written in, each with its rule. A motion
 * is let through when `run` says it is one of them, in the specs `spec` names (every spec where it names none).
 */
const ALLOWED: { spec?: string; run: (run: MotionRun) => boolean; rule: string }[] = [
  // A cycle, not a change of state: it runs for as long as the indicator is shown (a fixture that is loading).
  { run: (run) => run.host === 'tanrei-loading-indicator' && run.name === 'ring-turn', rule: 'LDG-1, LDG-12: a loading indicator turns while it is shown' },
  // So is a skeleton's pulse, which begins once its show delay has passed (an image preview's image that has not loaded).
  { run: (run) => run.on.split('.').includes('tanrei-skeleton-placeholder') && run.name === 'tanrei-skeleton-pulse', rule: 'SKL-8, SKL-12: a skeleton pulses while it is shown' },
  // The image is the browser's to load: where it loads after the controls have settled, what its loading enables is a
  // change of state, and moves (image-preview.test.ts holds that it changes at once where the control still settles).
  // The zoom-in control is disabled until the image has loaded; a preview written zoomed takes its zoom once the image
  // has loaded, and only then is its zoom-out control enabled.
  {
    spec: 'image-preview',
    run: (run) => ['tanrei-button.zoom-in', 'tanrei-button.zoom-out'].includes(run.owner) && ['color', 'background-color'].includes(run.name),
    rule: 'IMP-12, IMP-13, MOT-1: a zoom control enabled by the image loading after the page has settled moves to enabled',
  },
];

/** Fixtures that move at load, by `<spec>/<fixture>` (with `+overlay` for the real overlay), with what they show: a defect, not fixed yet. Only shrinks. */
const KNOWN: Record<string, string> = {};

const allowed = (spec: Spec) => (run: MotionRun) => ALLOWED.some((a) => (a.spec === undefined || a.spec === spec.name) && a.run(run));

for (const spec of specs) {
  for (const written of spec.fixtures.filter((f) => writtenOpen(f.props) || holdsOpen(f.items))) {
    for (const { form, fixture } of forms(spec, written)) {
      test(`${spec.name}: ${fixture.id}${form} written open in the page's markup moves nothing as the page loads (MOT-3, MOT-4)`, async ({ page }) => {
        test.skip(itemsStagedInScript(spec, fixture), 'its items are handed over by a step in script: its markup alone is not the fixture');
        const known = KNOWN[`${spec.name}/${fixture.id}${form ? '+overlay' : ''}`];
        test.fail(!!known, known);
        const window = fixtureWindow(spec, fixture);
        if (window) await page.setViewportSize(window);
        const runs = await loadOpen(page, spec, { icons: true, fixtures: [fixture] });
        expect(runs.filter((run) => !allowed(spec)(run))).toEqual([]);
      });
    }
  }
}
