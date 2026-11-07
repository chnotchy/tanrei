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
//   failed, a file item's picture that takes its glyph's place once it has loaded). Not run, each with the rule.
// - `ARRIVES`: what is not the element's to draw on time, left out of the comparison: a picture drawn when the browser
//   has decoded it, a code block's colors in the tasks after its code (COD-28).
// - `KNOWN`: a fixture whose first frame is not its rest, a defect not fixed yet, with what it shows. Each is expected
//   to fail (`test.fail`): once it is fixed it fails as passing, and leaves the list. The list only shrinks.
//
// A picture arriving is not compared either: when it arrives is the browser's (it decodes the picture at its own pace),
// and what an element draws until then is its spec's — an avatar its fallback (AVT-4), a file item its glyph (FIT-6).
// The sweep holds every picture a fixture shows (each `data:` address the harness writes one as, but the one that
// fails) at an address it answers only once it has read the first frame and the rest, so both are drawn before any
// picture has arrived, in every engine and on any machine.
//
// A fixture whose items a step in script hands over after it is mounted (`itemsStagedInScript`) is not drawn by its
// markup alone, and is not run.
//
// A first frame that is its rest is not yet the fixture: an element that draws nothing once it appears (a container
// that read its children before the browser upgraded them, so it holds none) is the same in every frame. So the rest
// is also told apart from the fixture as the page mounted it (`expectDrawnAsMounted`, test/first-frame.ts): the same
// elements, boxes of the same sizes in the same places in their stage, the same styles, and the same roles, states and
// Tab stops. The mounted page is read once, at rest, before the first fixture appears, its pictures held as they are
// when a fixture appears; and a fixture that appears in a window of its own is mounted again in it. Four lists more:
// - `LATER`: what an element draws by a clock of its own after its rest is read (a loading indicator's show delay), and
//   a live region's words, said after a pause: left out of that comparison.
// - `ALONE`: a fixture its spec draws otherwise among the others on one page (one tooltip open in a window, a modal
//   one above the other, a surface placed against the window): read as mounted from a page that mounts it alone.
// - `PICTURED`: a fixture whose pictures cannot be held once mounted as they are when it appears. Not compared.
// - a fixture a step in script draws more of once it is mounted (`drawnAfterMount`: scrolled, handed files, dragged
//   over) is not compared either.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, type BrowserContextOptions, type Page, type Route, test as base, expect } from '@playwright/test';
import { type Appeared, appearAgain, asStaged, expectDrawnAsMounted, mountForAppearing } from '../test/first-frame.js';
import { type Probe, expectFirstFrameAtRest } from '../test/frames.js';
import { type Fixture, type Spec, appShellWindow, dialogWindow, drawerWindow, drawnAfterMount, itemsStagedInScript, loadSpec, pickerWindow, popoverWindow } from '../test/harness.js';
import { MISSING } from '../test/pictures.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const inventory = JSON.parse(fs.readFileSync(path.join(repo, 'specs/inventory.json'), 'utf8')) as { components: { name: string }[] };
/** Every component that has a spec and an element here (a spec accepted ahead of its implementation has no element to mount). */
const specs: Spec[] = inventory.components
  .filter((c) => fs.existsSync(path.join(repo, `specs/${c.name}.spec.json`)) && fs.existsSync(path.join(repo, `packages/web/src/components/${c.name}`)))
  .map((c) => loadSpec(c.name));

/** The windows the specs' verifies draw some fixtures in: a responsive drawer or an app shell is what the window's width makes it. */
const WINDOWS: Record<string, (fixture: Fixture) => { width: number; height: number } | undefined> = {
  dialog: (f) => dialogWindow(f.id),
  // POP-39: a popover's compact- fixtures are the real overlay in a compact window; the others are drawn on the stage.
  popover: (f) => (f.id.startsWith('compact') ? popoverWindow : undefined),
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
  // POP-26, POP-41: the compact- fixtures are the real overlay (the others are drawn in place, whole at once).
  popover: (f) => opened(f) && f.id.startsWith('compact'),
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
];

/**
 * What an element draws by a clock of its own, later than the rest of a fixture appearing is read: left out of telling
 * that rest apart from the fixture as mounted (`(key, property)`, keyed under the stage). A live region the probe finds
 * (`said`) is left out too: what it says is said once it has stood for a pause (NVD-91).
 */
const LATER: ((key: string, property: string) => boolean)[] = [
  // LDG-14: a loading indicator is shown once its show delay has passed.
  (key) => /tanrei-loading-indicator:\d+($|[/>]|::)/.test(key),
  // SKL-7: so is a skeleton.
  (key) => /tanrei-skeleton:\d+($|[/>]|::)/.test(key),
  // CMB-48: the option a combobox made active itself is named its input's active descendant once typing has paused.
  (key, property) => property === 'aria-activedescendant' && /tanrei-combobox:\d+>/.test(key),
];

/** A fixture that shows a picture of the package's own (`fixtures/<name>.png`, not one that fails or never arrives). */
const showsPicture: Pick = (f) => /fixtures\/(?!missing\.png|pending\.png)[\w-]+\.png/.test(JSON.stringify(f));

/**
 * The fixtures not told apart from themselves as mounted, each with the rule: their pictures are held when they appear
 * (`holdPictures`), and holding a picture a mounted element has already drawn is not what never arriving is.
 */
const PICTURED: { spec: string; pick: Pick; rule: string }[] = [
  { spec: 'image-preview', pick: showsPicture, rule: 'IMP-30: a source changed after its picture has loaded keeps that picture until the new one has' },
];

/**
 * The fixtures whose spec makes them draw otherwise among the others on one page, each with the rule: what they are as
 * mounted is read from a page that mounts them alone, where they stand where they appear.
 */
const ALONE: { spec: string; pick: Pick; rule: string }[] = [
  { spec: 'tooltip', pick: opened, rule: 'TIP-8: at most one tooltip is open in a window' },
  { spec: 'image-preview', pick: opened, rule: 'IMP-7: an open image preview is a modal dialog, one above the other' },
  { spec: 'date-time-picker', pick: (f) => opened(f) && f.props.presentation !== 'docked', rule: 'DTM-1: a modal picker is a modal overlay, one above the other' },
  { spec: 'popover', pick: (f) => opened(f) && f.id.startsWith('compact'), rule: "POP-39, POP-5: a compact popover is placed against the window, and its anchor lies where its stage does" },
  { spec: 'navigation-drawer', pick: (f) => f.props.filterable === true, rule: 'NVD-87: of the drawers shown that bind one chord, the first keeps it' },
  { spec: 'app-shell', pick: (f) => f.id.startsWith('compact'), rule: 'APS-13: a compact window keeps the navigation bar at its bottom edge' },
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
  const said: string[] = [];
  const visit = (scope: ParentNode) => {
    for (const el of scope.querySelectorAll('*')) {
      if (el.hasAttribute('data-tanrei-appear')) {
        found.push(keyOf(el));
        for (const slot of el.querySelectorAll('slot')) for (const slotted of slot.assignedElements({ flatten: true })) found.push(keyOf(slotted));
      }
      if (el.getAttribute('role') === 'status' || el.hasAttribute('aria-live')) said.push(keyOf(el));
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(root);
  return { appear: found.join('\n'), said: said.join('\n') };
};

const within = (keys: string[]) => (key: string) => keys.some((k) => key === k || key.startsWith(`${k}/`) || key.startsWith(`${k}>`) || key.startsWith(`${k}::`));

/** Where the sweep's held pictures are asked for: an address of no page, which it answers only once a fixture is sampled. */
const HELD = 'https://held-picture.tanrei.test/';

/**
 * Gives every picture the stage of the fixture `id` shows — each attribute holding a `data:` picture, but the one that
 * fails at once (`MISSING`) — an address of its own under `HELD`, new each time it appears, so that no engine has it
 * already: it does not arrive before the sweep has read the first frame and the rest.
 */
const holdPictures = (page: Page, id: string) =>
  page.evaluate(
    ({ id, held, missing }) => {
      const w = window as unknown as { __tanreiStages?: DocumentFragment; __tanreiHeldPictures?: WeakMap<Element, string[]>; __tanreiHeldCount?: number };
      const stage = w.__tanreiStages?.querySelector(`[data-fixture="${CSS.escape(id)}"]`);
      if (!stage) return;
      const pictures = (w.__tanreiHeldPictures ??= new WeakMap());
      for (const el of [stage, ...stage.querySelectorAll('*')]) {
        let names = pictures.get(el);
        if (!names) {
          names = [...el.attributes].filter((a) => a.value.startsWith('data:image/') && a.value !== missing).map((a) => a.name);
          pictures.set(el, names);
        }
        for (const name of names) el.setAttribute(name, `${held}${(w.__tanreiHeldCount = (w.__tanreiHeldCount ?? 0) + 1)}.png`);
      }
    },
    { id, held: HELD, missing: MISSING },
  );

/**
 * Holds every picture the mounted stages show, as `holdPictures` does for a stage that appears, so that the fixtures
 * as mounted are read with their pictures not arrived either: what an element draws until one has is its spec's (an
 * avatar its fallback, AVT-4), and a picture arrives at the browser's pace.
 */
const holdMountedPictures = (page: Page) =>
  page.evaluate(
    ({ held, missing }) => {
      const w = window as unknown as { __tanreiHeldCount?: number };
      for (const el of document.querySelectorAll('body > main *, body > div.stages *'))
        for (const a of [...el.attributes])
          if (a.value.startsWith('data:image/') && a.value !== missing) el.setAttribute(a.name, `${held}${(w.__tanreiHeldCount = (w.__tanreiHeldCount ?? 0) + 1)}.png`);
    },
    { held: HELD, missing: MISSING },
  );

/** Lets every picture held go: each is answered as one that cannot be loaded. */
const releasePictures = async (stage: Stage) => {
  stage.held.open = false;
  await Promise.all(stage.held.routes.map((route) => route.abort().catch(() => undefined)));
};

/**
 * A context for each worker, and in it one page for a spec at a time: a spec's fixtures are made to appear on the page
 * that mounted them, and the next spec gets a new page. (One page given every spec's documents in turn grew until it
 * crashed in the Linux container: five crashes in a run of five thousand.)
 */
interface Stage {
  context: BrowserContext;
  page: Page | null;
  /** The pictures asked for while the fixture appearing is sampled: answered once it has been. */
  held: { open: boolean; routes: Route[] };
  /** What the page is mounted with: the spec's name, or `<spec>/<fixture>` for a fixture mounted alone (`ALONE`). */
  spec: string | null;
  viewport: { width: number; height: number };
}

const test = base.extend<{ appear: (spec: Spec, fixture: Fixture, measured: boolean) => Promise<Appeared> }, { stage: Stage }>({
  stage: [
    async ({ browser }, use, workerInfo) => {
      const u = workerInfo.project.use as BrowserContextOptions;
      const viewport = u.viewport ?? { width: 1280, height: 720 };
      const context = await browser.newContext({ viewport, deviceScaleFactor: u.deviceScaleFactor, userAgent: u.userAgent, isMobile: u.isMobile, hasTouch: u.hasTouch, colorScheme: u.colorScheme });
      await use({ context, page: null, held: { open: false, routes: [] }, spec: null, viewport });
      await context.close();
    },
    { scope: 'worker' },
  ],
  appear: async ({ stage }, use, testInfo) => {
    await use(async (spec, fixture, measured) => {
      if (stage.spec?.split('/')[0] !== spec.name || !stage.page) {
        stage.spec = null;
        await stage.page?.close();
        stage.page = await stage.context.newPage();
        // A held picture is asked for while the fixture is sampled and answered after; one asked for later, at once.
        await stage.page.route(`${HELD}**`, (route) => {
          if (stage.held.open) stage.held.routes.push(route);
          else void route.abort().catch(() => undefined);
        });
      }
      const { page } = stage;
      const window = WINDOWS[spec.name]?.(fixture) ?? stage.viewport;
      const size = page.viewportSize();
      // The fixtures as mounted are read in the window the page is mounted in: one that appears in another is mounted
      // again in its own.
      if (size?.width !== window.width || size?.height !== window.height) {
        await page.setViewportSize(window);
        stage.spec = null;
      }
      // A fixture drawn otherwise among the others is mounted alone; the next one mounts the spec's fixtures again.
      const mount = ALONE.some((a) => a.spec === spec.name && a.pick(fixture)) ? `${spec.name}/${fixture.id}` : spec.name;
      if (stage.spec !== mount) {
        stage.held = { open: true, routes: [] };
        try {
          await mountForAppearing(page, spec, mount === spec.name ? {} : { fixtures: [fixture] }, { asMounted: true, beforeReading: () => holdMountedPictures(page) });
        } finally {
          await releasePictures(stage);
        }
        stage.spec = mount;
      }
      stage.held = { open: true, routes: [] };
      await holdPictures(page, fixture.id);
      try {
        return await appearAgain(page, fixture.id, { measured, sample: { probe: appearing } });
      } finally {
        await releasePictures(stage);
      }
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
        // A fixture that draws nothing once it appears is at rest in its first frame too: its rest is the fixture as
        // the page mounted it — but where a step in script drew more of it once it was mounted.
        if (drawnAfterMount(spec, fixture) || PICTURED.some((p) => p.spec === spec.name && p.pick(fixture))) return;
        const said = within(String(seen.rest.probe.said ?? '').split('\n').filter(Boolean).map(asStaged));
        expectDrawnAsMounted(seen, { ignore: (key, property) => said(key) || LATER.some((later) => later(key, property)) || ARRIVES.some((arrives) => arrives(key, property, spec)) });
      });
    }
  }
}
