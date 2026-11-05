// FollowController (src/primitives/follow.ts) at rest, in every engine, on a page of its own: an overlay placed against
// an anchor by a check the page counts. Its promise (TIP-9, MNU-2, MNU-46, FBM-13, SRC-7, DTM-2 follow by it): it asks
// only when something can have moved, frame by frame only while something does, and once nothing moves no check runs.
//
// The sizes it watches are told by a ResizeObserver, in the observer's own box and precision; a size read from the page
// another way (`getBoundingClientRect()`, transformed, and at another precision in Firefox) is never the same report, so
// a size compared across the two counted as a change in every frame, for as long as the overlay was open.
//
// How many frames "at rest" is: the design ends a run QUIET (3) frames after the last change, and observes the sized
// elements again one frame after a resize, so a page is at rest a handful of frames after it was last placed. The test
// lets SETTLE frames go by — many times that — and then counts the checks over WATCH frames, which must be none: the
// fault this guards against made one check in every frame, so any length of watch tells the two apart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** The module as it is built: it imports nothing (the host's type alone), so a page can load it alone. */
const MODULE = fs.readFileSync(path.join(pkg, 'dist/primitives/follow.js'), 'utf8');
const PAGE = 'http://follow.test/';

/** Frames after the overlay was last placed before it is taken to be at rest: far more than the design's few. */
const SETTLE = 60;
/** Frames over which a page at rest is watched: one second at 60 Hz. */
const WATCH = 60;

/**
 * `<x-overlay>`: a surface in its shadow root, `position: fixed`, placed under `#anchor` by a check that counts itself
 * (`window.checks`) and places only when the anchor's box changed. The surface's look is the subject's (`style`), and
 * `cap` makes the placement cap the surface's height, as a menu's does: the placement resizes what is sized.
 */
const ELEMENTS = `
import { FollowController } from '/follow.js';
window.checks = 0;
customElements.define('x-overlay', class extends HTMLElement {
  constructor() {
    super();
    this.controllers = [];
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>.surface { position: fixed; inset: 0 auto auto 0; margin: 0; inline-size: 120px; overflow: hidden; } .content { block-size: 300px; }</style><div class="surface"><div class="content"></div></div>';
    this.surface = root.querySelector('.surface');
    this.surface.style.cssText += this.getAttribute('surface-style') ?? '';
    this.last = '';
    this.follow = new FollowController(this, {
      followed: () => [document.getElementById('anchor')],
      sized: () => [this.surface],
      check: () => {
        window.checks++;
        const box = document.getElementById('anchor').getBoundingClientRect();
        const key = box.left + ',' + box.bottom;
        if (key === this.last) return false;
        this.last = key;
        this.surface.style.left = box.left + 'px';
        this.surface.style.top = box.bottom + 'px';
        if (this.hasAttribute('cap')) this.surface.style.maxBlockSize = '200px';
        return true;
      },
    });
  }
  addController(controller) { this.controllers.push(controller); }
  removeController() {}
  requestUpdate() {}
  get updateComplete() { return Promise.resolve(true); }
  connectedCallback() { this.follow.start(); }
  disconnectedCallback() { this.follow.stop(); }
});
`;

interface Subject {
  name: string;
  /** Attributes of `<x-overlay>`. */
  attributes: string;
}

const SUBJECTS: Subject[] = [
  // A width that is not a whole number of pixels: Firefox reports it to the observer at another precision than to
  // getBoundingClientRect() (101.01667022705078 against 101.01666259765625, a plain tooltip's surface).
  { name: 'a surface whose width is a fraction of a pixel', attributes: `surface-style="inline-size: 101.0166px"` },
  // A transform at rest: the observer reports the box before it, getBoundingClientRect() after it.
  { name: 'a surface drawn scaled', attributes: `surface-style="scale: 0.5"` },
  // The placement caps the surface's height, so placing resizes what is sized.
  { name: 'a surface whose placement caps its height', attributes: 'cap' },
];

async function open(page: Page, subject: Subject) {
  await page.route(PAGE, (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>follow</title><style>body { margin: 0; } #anchor { margin: 40px; inline-size: 80px; block-size: 24px; }</style></head><body><div id="spacer"></div><div id="anchor"></div><x-overlay ${subject.attributes}></x-overlay><script type="module">${ELEMENTS}</script></body></html>`,
    }),
  );
  await page.route(`${PAGE}follow.js`, (route) => route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: MODULE }));
  await page.goto(PAGE);
  await page.waitForFunction(() => customElements.get('x-overlay') !== undefined);
}

/** The checks over `watch` frames, after `settle` frames have gone by. */
const checksAtRest = (page: Page) =>
  page.evaluate(
    ([settle, watch]) =>
      new Promise<number>((resolve) => {
        const w = window as unknown as { checks: number };
        let frames = 0;
        let from = 0;
        const frame = () => {
          frames++;
          if (frames === settle) from = w.checks;
          if (frames === settle + watch) resolve(w.checks - from);
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    [SETTLE, WATCH] as const,
  );

const surfaceTop = (page: Page) => page.locator('x-overlay').evaluate((el) => el.shadowRoot!.querySelector('.surface')!.getBoundingClientRect().top);

for (const subject of SUBJECTS) {
  test(`TIP-9, MNU-2, MNU-46, FBM-13, SRC-7, DTM-2: an overlay followed by events — ${subject.name} — runs no check while nothing moves, and still follows its anchor when it does`, async ({ page }) => {
    await open(page, subject);
    // Placed once against the anchor, and then at rest.
    await expect.poll(() => page.evaluate(() => (window as unknown as { checks: number }).checks)).toBeGreaterThan(0);
    expect(await checksAtRest(page), 'checks while nothing moves').toBe(0);
    // It still follows: the anchor moved by the page's layout, with no event of its own, takes the surface with it.
    const before = await surfaceTop(page);
    await page.evaluate(() => ((document.getElementById('spacer') as HTMLElement).style.blockSize = '24px'));
    await expect.poll(async () => Math.round((await surfaceTop(page)) - before)).toBe(24);
    // …and is at rest again.
    expect(await checksAtRest(page), 'checks while nothing moves, after the move').toBe(0);
    // A size of what is sized that really changes is still a change: the surface made wider is checked again.
    const checks = await page.evaluate(() => (window as unknown as { checks: number }).checks);
    await page.locator('x-overlay').evaluate((el) => ((el.shadowRoot!.querySelector('.surface') as HTMLElement).style.inlineSize = '160px'));
    await expect.poll(() => page.evaluate(() => (window as unknown as { checks: number }).checks)).toBeGreaterThan(checks);
    expect(await checksAtRest(page), 'checks while nothing moves, after the resize').toBe(0);
  });
}
