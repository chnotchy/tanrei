// Every fixture of every spec, made to appear on a page that is already there — the way a single-page product draws a
// view — is drawn in its first frame as it rests (MOT-3, docs/architecture/motion.md): nothing in it fades, slides or
// grows from a state it is not in, and nothing is drawn wrong for a frame. Each fixture is inserted twice: as markup
// alone, and by a task that also reads its layout (a product that measures the view it has just drawn: the browser
// then styles the elements before any of them has updated, which is where a transition from the state before the first
// render begins).
//
// What the first frame is told apart from is the state the change comes to rest in (`expectFirstFrameAtRest`,
// test/frames.ts), read at the same moments on any machine. The page is mounted once for each spec in a worker
// (`mountForAppearing`, test/first-frame.ts) and each fixture is made to appear on it again (`appearAgain`): a mount is
// most of what a fixture costs, and a whole engine's run is minutes.
//
// Four kinds of fixture are held to something else, each by a list here:
// - `ENTERS`: an overlay written open plays its entrance when it is inserted after the page's first paint (MOT-4).
//   Everything but the surface that appears (`data-tanrei-appear`) is at rest in the first frame, and the surface does
//   move: settling leaves it alone. An overlay that does not enter yet, where MOT-4 says it should, is drawn at rest and
//   passes as any fixture; it joins this list when it plays its entrance.
// - `BY_DESIGN`: a fixture whose spec says it changes after it is drawn (an autoplay that advances, a picture that
//   failed). Not run, each with the rule.
// - `ARRIVES`: what is not the element's to draw on time, left out of the comparison: a picture drawn when the browser
//   has decoded it, a code block's colors in the tasks after its code (COD-28).
// - `KNOWN`: a fixture whose first frame is not its rest, a defect not fixed yet, with what it shows. Each is expected
//   to fail (`test.fail`): once it is fixed it fails as passing, and leaves the list. The list only shrinks.
//
// A fixture whose items a step in script hands over after it is mounted (`itemsStagedInScript`) is not drawn by its
// markup alone, and is not run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContextOptions, type Page, test as base, expect } from '@playwright/test';
import { appearAgain, mountForAppearing } from '../test/first-frame.js';
import { type Frames, type Probe, expectFirstFrameAtRest } from '../test/frames.js';
import { type Fixture, type Spec, appShellWindow, dialogWindow, drawerWindow, itemsStagedInScript, loadSpec, pickerWindow } from '../test/harness.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'specs/inventory.json'), 'utf8')) as { components: { name: string }[] };
/** Every component that has a spec and an element here (a spec accepted ahead of its implementation has no element to mount). */
const specs: Spec[] = inventory.components
  .filter((c) => fs.existsSync(path.join(repo, `specs/${c.name}.spec.json`)) && fs.existsSync(path.join(repo, `packages/web/src/components/${c.name}`)))
  .map((c) => loadSpec(c.name));

/** The windows the specs' verifies draw some fixtures in: a responsive drawer or an app shell is what the window's width makes it. */
const WINDOWS: Record<string, (fixture: Fixture) => { width: number; height: number }> = {
  dialog: (f) => dialogWindow(f.id),
  'date-time-picker': pickerWindow,
  'navigation-drawer': (f) => drawerWindow(f.id),
  'app-shell': (f) => appShellWindow(f.id),
};

type Pick = (fixture: Fixture) => boolean;
const opened: Pick = (f) => f.props.open === true;

/** The overlays written open that play their entrance when they appear after the page's first paint (MOT-4). */
const ENTERS: Record<string, Pick> = {
  dialog: opened,
  'date-time-picker': (f) => opened(f) && f.props.presentation !== 'docked',
  'image-preview': opened,
  'modal-layer': opened,
  'navigation-drawer': (f) => f.id === 'modal' || f.id === 'responsive-narrow',
  search: (f) => f.props.expanded === true && (f.props.presentation === 'full-screen' || f.props.presentation === 'dialog'),
  tooltip: opened,
};

/** The fixtures whose spec says they change after they are drawn, each with the rule. */
const BY_DESIGN: { spec: string; pick: Pick; rule: string }[] = [
  { spec: 'carousel', pick: (f) => f.props.autoplay === true, rule: 'CRL-32: it advances by itself' },
  { spec: 'link-card', pick: (f) => f.id === 'image-failed', rule: 'LKC-13: a picture that cannot be loaded leaves a card without one' },
  { spec: 'image-preview', pick: (f) => f.id === 'error', rule: 'IMP-31: the error is drawn when the source has failed to load' },
];

/** What is not the element's to draw on time: `(key, property)` of `expectFirstFrameAtRest`'s `ignore`. */
const ARRIVES: ((key: string, property: string, spec: Spec) => boolean)[] = [
  // A picture is drawn when the browser has decoded it, which a page already showing it does at its own pace.
  (key) => /(^|[/>])img(#[^:/>]*)?:\d+(::[a-z-]+)?$/.test(key),
  // COD-28: a code block draws its code at once, plain, and its colors and weights in a task after it.
  (key, _property, spec) => spec.name === 'code-block' && /\/pre:\d+\/code:\d+\//.test(key),
  // FIT-6: a file item's glyph stands in its picture's place until the picture has loaded, and then gives way to it.
  (key, property) => property === 'visibility' && /tanrei-file-item:\d+>/.test(key),
];

/** Fixtures whose first frame is not their rest, by `<spec>/<fixture>`, with what they show: a defect, not fixed yet. Only shrinks. */
const KNOWN: Record<string, string> = {};

/**
 * The probe: the keys (as test/frames.ts names them) of the surfaces that appear (`data-tanrei-appear`, in every shadow
 * root) and of the elements slotted into them, which move with them.
 */
const appearing: Probe = (root) => {
  const name = (el: Element, siblings: Element[]) => `${el.localName}${el.id ? `#${el.id}` : ''}:${siblings.indexOf(el)}`;
  const keyOf = (el: Element): string => {
    if (el === root) return name(el, [el]);
    const parent = el.parentNode;
    if (parent instanceof ShadowRoot) return `${keyOf(parent.host)}>${name(el, [...parent.children])}`;
    return `${keyOf(el.parentElement!)}/${name(el, [...el.parentElement!.children])}`;
  };
  const found: string[] = [];
  const visit = (scope: ParentNode) => {
    for (const el of scope.querySelectorAll('*')) {
      if (el.hasAttribute('data-tanrei-appear')) {
        found.push(keyOf(el));
        for (const slot of el.querySelectorAll('slot')) for (const slotted of slot.assignedElements({ flatten: true })) found.push(keyOf(slotted));
      }
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(root);
  return { appear: found.join('\n') };
};

const within = (keys: string[]) => (key: string) => keys.some((k) => key === k || key.startsWith(`${k}/`) || key.startsWith(`${k}>`) || key.startsWith(`${k}::`));

/** One page for each worker, mounted with one spec's fixtures at a time. */
interface Stage {
  page: Page;
  spec: string | null;
  viewport: { width: number; height: number };
}

const test = base.extend<{ appear: (spec: Spec, fixture: Fixture, measured: boolean) => Promise<Frames> }, { stage: Stage }>({
  stage: [
    async ({ browser }, use, workerInfo) => {
      const u = workerInfo.project.use as BrowserContextOptions;
      const viewport = u.viewport ?? { width: 1280, height: 720 };
      const context = await browser.newContext({ viewport, deviceScaleFactor: u.deviceScaleFactor, userAgent: u.userAgent, isMobile: u.isMobile, hasTouch: u.hasTouch, colorScheme: u.colorScheme });
      await use({ page: await context.newPage(), spec: null, viewport });
      await context.close();
    },
    { scope: 'worker' },
  ],
  appear: async ({ stage }, use, testInfo) => {
    await use(async (spec, fixture, measured) => {
      const { page } = stage;
      const window = WINDOWS[spec.name]?.(fixture) ?? stage.viewport;
      const size = page.viewportSize();
      if (size?.width !== window.width || size?.height !== window.height) await page.setViewportSize(window);
      if (stage.spec !== spec.name) {
        stage.spec = null;
        await mountForAppearing(page, spec);
        stage.spec = spec.name;
      }
      return appearAgain(page, fixture.id, { measured, sample: { probe: appearing } });
    });
    // A test that did not end as expected may have left the page in any state: the next one mounts it anew.
    if (testInfo.status !== testInfo.expectedStatus) stage.spec = null;
  },
});

for (const spec of specs) {
  for (const fixture of spec.fixtures) {
    for (const measured of [false, true]) {
      const how = measured ? ', inserted by a task that reads its layout,' : '';
      const designed = BY_DESIGN.find((d) => d.spec === spec.name && d.pick(fixture));
      const enters = ENTERS[spec.name]?.(fixture) ?? false;
      const title = enters
        ? `${spec.name}: ${fixture.id}${how} plays its entrance, and is drawn at rest around the surface that appears (MOT-3, MOT-4)`
        : `${spec.name}: ${fixture.id}${how} is drawn in its first frame as it rests (MOT-3)`;
      test(title, async ({ appear }) => {
        test.skip(!!designed, designed?.rule);
        test.skip(itemsStagedInScript(spec, fixture), 'its items are handed over by a step in script: its markup alone is not the fixture');
        const known = KNOWN[`${spec.name}/${fixture.id}`];
        test.fail(!!known, known);
        const seen = await appear(spec, fixture, measured);
        const surfaces = enters ? String(seen.rest.probe.appear ?? '').split('\n').filter(Boolean) : [];
        const surface = within(surfaces);
        expectFirstFrameAtRest(seen, { ignore: (key, property) => surface(key) || ARRIVES.some((arrives) => arrives(key, property, spec)) });
        if (enters) {
          expect(surfaces, 'the overlay draws a surface that appears (data-tanrei-appear)').not.toEqual([]);
          expect(seen.frames.some((frame) => surfaces.some((key) => frame.elements[key]?.moving)), 'the surface that appears plays its entrance').toBe(true);
        }
      });
    }
  }
}
