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
export async function appearingFixture(page: Page, spec: Spec, id: string, options: DocumentOptions & AppearOptions = {}): Promise<Frames> {
  const { sample, measured, ...document } = options;
  const fixture = spec.fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`appearingFixture: ${spec.name} has no fixture ${id}`);
  await mountForAppearing(page, spec, { ...document, fixtures: [fixture] });
  return appearAgain(page, id, { sample, measured });
}

export interface AppearOptions {
  sample?: SampleOptions;
  /** The task that inserts the fixture also reads its layout (see `appearingFixture`). */
  measured?: boolean;
}

/** The page's copy of the stages as they were written: parsed into a template, so nothing in it is upgraded. */
interface Written {
  __tanreiStages?: DocumentFragment;
}

/**
 * Mounts `spec`'s fixtures (all of them, or `options.fixtures`) with their faces, icons and definitions, and keeps
 * their stages' markup in the page as it was written, for `appearAgain`. A page that makes many fixtures appear in turn
 * is mounted once: a mount is most of what one fixture's appearing costs, and the faces are then loaded for all of them.
 */
export async function mountForAppearing(page: Page, spec: Spec, options: DocumentOptions = {}): Promise<void> {
  const written = { icons: true, ...options };
  await mountFixtures(page, spec, written);
  const markup = stagesOf(await fixturesDocument(spec, written));
  await page.evaluate((html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    (window as Written).__tanreiStages = template.content;
  }, markup);
}

/**
 * On a page `mountForAppearing` mounted: takes everything off the stages' holder, waits for the empty page to be
 * drawn, and samples the frames of inserting the stage of the fixture `id` as it was written.
 */
export async function appearAgain(page: Page, id: string, { sample, measured = false }: AppearOptions = {}): Promise<Frames> {
  const holder = page.locator('body > main, body > div.stages');
  const found = await holder.evaluate((el, id) => {
    el.replaceChildren();
    return !!(window as Written).__tanreiStages?.querySelector(`[data-fixture="${CSS.escape(id)}"]`);
  }, id);
  if (!found) throw new Error(`appearAgain: the page has no stage of the fixture ${id} (mountForAppearing first)`);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return sampleFrames(
    holder,
    () =>
      holder.evaluate(
        (el, { id, measured }) => {
          el.insertAdjacentHTML('beforeend', (window as Written).__tanreiStages!.querySelector(`[data-fixture="${CSS.escape(id)}"]`)!.outerHTML);
          if (measured) void el.getBoundingClientRect();
        },
        { id, measured },
      ),
    sample,
  );
}
