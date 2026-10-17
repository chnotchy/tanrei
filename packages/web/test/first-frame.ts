// A fixture that appears on a page that is already there, sampled frame by frame (test/frames.ts) — the way a
// single-page product draws a view: every element defined, every face loaded, and the fixture's markup inserted at
// once. Its first frame is then what the person sees first, and `expectFirstFrameAtRest` says whether anything in it
// is drawn in a state it then leaves (a selected row that fades in from unselected, a label that floats up off the
// chips it was drawn over, a disabled button that fades from enabled, a drawer that widens to the width it was
// mounted at).
import type { Page } from '@playwright/test';
import { type Frames, type SampleOptions, sampleFrames } from './frames.js';
import { type DocumentOptions, type Spec, fixturesDocument, mountFixtures } from './harness.js';

/** The stages of a fixtures document, as a page that is already there would be given them (no script, no holder). */
const stagesOf = (document: string) =>
  document.slice(document.indexOf('<body>') + '<body>'.length, document.indexOf('<script type="module">', document.indexOf('<body>'))).replace(/^<(main|div)[^>]*>|<\/(main|div)>$/g, '');

/**
 * Mounts the fixture `id` of `spec` (its faces, its icons, its definition), takes it off the page, waits for the
 * empty page to be drawn, and samples the frames of inserting it again. With `measured`, the task that inserts it also
 * reads its layout, as a product that measures the view it has just drawn does (a layout effect): the browser styles
 * the elements then, before any of them has updated. A fixture whose staging runs a script step after it is mounted
 * (`Staging.after` in test/harness.ts) is not drawn by its markup alone: give another one.
 */
export async function appearingFixture(page: Page, spec: Spec, id: string, options: DocumentOptions & { sample?: SampleOptions; measured?: boolean } = {}): Promise<Frames> {
  const { sample, measured = false, ...document } = options;
  const fixture = spec.fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`appearingFixture: ${spec.name} has no fixture ${id}`);
  const written = { icons: true, ...document, fixtures: [fixture] };
  await mountFixtures(page, spec, written);
  const markup = stagesOf(await fixturesDocument(spec, written));
  const holder = page.locator('body > main, body > div.stages');
  await holder.evaluate((el) => el.replaceChildren());
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return sampleFrames(
    holder,
    () =>
      holder.evaluate(
        (el, { html, measured }) => {
          el.insertAdjacentHTML('beforeend', html);
          if (measured) void el.getBoundingClientRect();
        },
        { html: markup, measured },
      ),
    sample,
  );
}
