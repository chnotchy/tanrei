// An overlay mounted with open true, held to MOT-4 (docs/architecture/motion.md): written open in the page's markup it
// is there in the document's first frame, playing no entrance; mounted open after the document's first paint — a
// product that draws a view in answer to a click — it plays its entrance as if it had just opened.
//
//   expect(entrances(await loadOpen(page, spec, { fixtures: [fixture] }))).toEqual([]);   // in the page's markup
//   await mountOpenAgain(page);                                                          // the same, after the paint
//   expect(entrances(await runsAtRest(page))).not.toEqual([]);
//
// What is counted is what the engine announces: every `transitionrun` and `animationstart` in the document and in every
// shadow root, listened to from before the first element is defined (test/transitions.ts says why an event and not a
// question to the clock). The page is loaded by a navigation, not written into the window with `setContent`, whose
// navigation is over before it: the document's first paint is then the page's own.
import type { Page } from '@playwright/test';
import { type DocumentOptions, type Spec, fixturesDocument } from './harness.js';
import { motionEnded } from './motions.js';

/** One motion the engine started. */
export interface MotionRun {
  /** The element whose shadow root it ran in (its tag), or `document` for the light DOM. */
  host: string;
  /** That element as `localName.class.class` (a control told apart from its siblings by its class), or `document`. */
  owner: string;
  /** The element it runs on, as `localName.class.class`. */
  on: string;
  /**
   * Whether it runs on a surface that appears — the element an appearance moves (`data-tanrei-appear`,
   * src/primitives/motion.ts) or a modal `<dialog>` — or on that surface's `::backdrop` (its scrim).
   */
  appear: boolean;
  /** The transitioned property, or the animation's name. */
  name: string;
  /** The pseudo-element it runs on (`::backdrop`), or an empty string; WebKit names none for a scrim's fade. */
  pseudo: string;
}

/** Records into `window.__motionRuns` from the first element made on: the first thing in the page's body. */
const RECORD = `<script>(() => {
  const runs = (window.__motionRuns = []);
  const listen = (root, host, owner) => {
    const note = (event) => {
      const target = event.target;
      runs.push({
        host,
        owner: owner ? [owner.localName, ...owner.classList].join('.') : 'document',
        on: [target.localName, ...target.classList].join('.'),
        appear: target.hasAttribute('data-tanrei-appear') || target.localName === 'dialog',
        name: event.propertyName || event.animationName,
        pseudo: event.pseudoElement || '',
      });
    };
    root.addEventListener('transitionrun', note);
    root.addEventListener('animationstart', note);
  };
  listen(document, 'document');
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const root = attach.call(this, init);
    listen(root, this.localName, this);
    return root;
  };
})();</script>`;

/** Every motion that has started since the page was loaded, or since `mountOpenAgain`. */
export const motionRuns = (page: Page): Promise<MotionRun[]> => page.evaluate(() => [...(window as unknown as { __motionRuns: MotionRun[] }).__motionRuns]);

/** The motions of a surface that appears: on the surface itself and on its scrim. */
export const entrances = (runs: MotionRun[]): MotionRun[] => runs.filter((run) => run.appear);

/**
 * Loads a page of the spec's fixtures — `options.fixtures`, written as the harness writes them, open where they say so;
 * `options.lead`, markup of the test's own before them; and `options.tail`, markup at the end of the body, after the
 * bundle (a module that asks for something as the page is read) — by a navigation; waits until the spec's element is
 * defined, every element has updated and nothing moves; and returns every motion that started on the way.
 */
export async function loadOpen(page: Page, spec: Spec, { tail = '', ...options }: DocumentOptions & { tail?: string }): Promise<MotionRun[]> {
  const written = await fixturesDocument(spec, { fixtures: [], ...options, lead: `${RECORD}${options.lead ?? ''}` });
  const end = written.lastIndexOf('</body>');
  const markup = `${written.slice(0, end)}${tail}${written.slice(end)}`;
  const url = `http://${spec.name}.mounted-open.test/`;
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: markup }));
  await page.goto(url);
  await page.waitForFunction((tag) => !!customElements.get(tag), spec.platforms.web.name);
  return runsAtRest(page);
}

/**
 * Every motion seen once every element has updated, three frames have been drawn — the document's first paint as the
 * components count it is the second frame callback after the parse (MOT-4, src/primitives/motion.ts), and a motion
 * begun in a frame is announced in the next — and nothing moves any more.
 */
export async function runsAtRest(page: Page): Promise<MotionRun[]> {
  await page.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('*')].map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
    for (let frame = 0; frame < 3; frame++) await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  await motionEnded(page);
  return motionRuns(page);
}

/**
 * Once the document has been painted, makes `selector`'s elements again — each a copy put in its place, as a product
 * draws a view in answer to a click — and forgets the motions seen until then. By default the fixtures' stages
 * (`[data-fixture]`); a copy's stage is `<id>-again`.
 */
export async function mountOpenAgain(page: Page, selector = '[data-fixture]'): Promise<void> {
  await page.evaluate((which) => {
    (window as unknown as { __motionRuns: unknown[] }).__motionRuns.length = 0;
    for (const element of document.querySelectorAll<HTMLElement>(which)) {
      const again = element.cloneNode(true) as HTMLElement;
      if (again.dataset.fixture) again.dataset.fixture = `${again.dataset.fixture}-again`;
      element.replaceWith(again);
    }
  }, selector);
}
