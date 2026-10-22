// What measures text measures it again once the face it asked for has arrived (src/primitives/faces.ts), even where the
// set of fonts never says so. WebKit on Linux fires no `loadingdone` for a face that was already loading when the
// listener was added; there a marquee text kept the width of its fallback face. The race is played here the same in
// every engine:
//   - a face starts loading before the components are connected, and its file is held back until the test lets it go;
//   - the `loadingdone` that names it is stopped before any listener of the package hears it — the event WebKit leaves
//     out, left out everywhere;
//   - the components are connected, and measure their text in the fallback face — the same font drawn 1.4 times as
//     large (`size-adjust`), embedded and loaded first, so that the two widths differ alike on every machine (a
//     system's own monospace face was 256 px where Inter drew 251 on Linux);
//   - the face is let go: `document.fonts.ready` resolves, and every measurement must be the face's.
// The face (Inter) covers letters only, so a line of digits — the breadcrumbs' own probe of a line, which an observer of
// sizes watches — is drawn in the fallback face throughout and cannot report the face's arrival on its own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The address the test's page is served at, and its late face's file. */
const PAGE = 'http://faces.test/';
const FACE_FILE = `${PAGE}late.woff2`;
const FAMILY = 'Tanrei Late';
/** The fallback: the same font, embedded and loaded before the race, drawn 1.4 times as large. */
const WIDE = 'Tanrei Wide';
/** Latin letters only: no digit is drawn in the face. */
const LETTERS = 'U+0041-005A, U+0061-007A';

function interFile() {
  const dir = path.join(pkg, 'node_modules/@fontsource-variable/inter/files');
  const file = fs.readdirSync(dir).find((f) => f.includes('latin-wght-normal') && f.endsWith('.woff2'));
  if (!file) throw new Error('Inter variable font not found; run pnpm install');
  return fs.readFileSync(path.join(dir, file));
}

/** Stops every `loadingdone` that names the late face, before any later listener of the set of fonts hears it. */
const SWALLOW_LOADINGDONE = (family: string) => {
  document.fonts.addEventListener('loadingdone', (event) => {
    const faces = (event as Event & { fontfaces?: readonly FontFace[] }).fontfaces ?? [];
    if (faces.some((face) => face.family.replace(/["']/g, '') === family)) event.stopImmediatePropagation();
  });
};

const MARKUP = `
  <tanrei-marquee-text id="marquee" style="inline-size: 160px">Sideways scrolling headline text</tanrei-marquee-text>
  <tanrei-description-list id="list"><dl><div><dt>Shipping address</dt><dd>Kyoto</dd></div><div><dt>Order</dt><dd>Open</dd></div></dl></tanrei-description-list>
  <tanrei-breadcrumbs id="trail"><a href="#home">Home</a><a href="#library">Library</a><span>Typography</span></tanrei-breadcrumbs>`;

test.describe('FacesWatch', () => {
  test('a text measured while its face loads is measured again once the faces are ready, though no loadingdone says so', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((done) => (release = done));
    const font = interFile();
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style>
      <style>@font-face { font-family: "${WIDE}"; src: url(data:font/woff2;base64,${font.toString('base64')}) format("woff2"); size-adjust: 140%; }
      :root { --tanrei-ref-typeface-plain: "${FAMILY}", "${WIDE}"; } body { font-family: "${FAMILY}", "${WIDE}"; line-height: 1.5; }</style></head>
      <body><main id="host"></main><script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
    await page.addInitScript(SWALLOW_LOADINGDONE, FAMILY);
    await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await page.route(FACE_FILE, async (route) => {
      await held;
      await route.fulfill({ contentType: 'font/woff2', body: font });
    });
    await page.goto(PAGE);

    const before = await page.evaluate(
      async ({ markup, family, wide, url, letters }) => {
        await document.fonts.load(`16px "${wide}"`, 'a0');
        await document.fonts.ready;
        await Promise.all(['tanrei-marquee-text', 'tanrei-description-list', 'tanrei-breadcrumbs'].map((tag) => customElements.whenDefined(tag)));
        const face = new FontFace(family, `url(${url})`, { unicodeRange: letters });
        document.fonts.add(face);
        void face.load();
        const status = document.fonts.status;
        document.getElementById('host')!.innerHTML = markup;
        const hosts = ['marquee', 'list', 'trail'].map((id) => document.getElementById(id) as unknown as { updateComplete: Promise<unknown> });
        await Promise.all(hosts.map((host) => host.updateComplete));
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        return { status, faceStatus: face.status, statusAfter: document.fonts.status };
      },
      { markup: MARKUP, family: FAMILY, wide: WIDE, url: FACE_FILE, letters: LETTERS },
    );
    expect(before, 'the components were connected and measured while the face was loading').toEqual({ status: 'loading', faceStatus: 'loading', statusAfter: 'loading' });

    /** What each component measured, and what the same component measures when it is connected now. */
    const readings = () =>
      page.evaluate(async () => {
        const marquee = document.getElementById('marquee')! as HTMLElement & { textWidth: number };
        const text = marquee.shadowRoot!.querySelector('.text')!;
        const list = document.getElementById('list')!;
        const trail = document.getElementById('trail')!;
        const sizer = (el: Element) => (el.shadowRoot!.querySelector('.sizer') as SVGElement).style.inlineSize;
        // The same list and trail, connected now: what they measure is what the face draws.
        const fresh = document.createElement('div');
        fresh.innerHTML = list.outerHTML.replace('id="list"', '') + trail.outerHTML.replace('id="trail"', '');
        document.body.append(fresh);
        await Promise.all([...fresh.children].map((el) => (el as unknown as { updateComplete: Promise<unknown> }).updateComplete));
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        const freshList = fresh.children[0]!;
        const freshTrail = fresh.children[1]!;
        const out = {
          marquee: { measured: Math.round(marquee.textWidth * 10) / 10, drawn: Math.round(text.getBoundingClientRect().width * 10) / 10 },
          list: { measured: list.getAttribute('data-stacks-below'), drawn: freshList.getAttribute('data-stacks-below') },
          trail: { measured: sizer(trail), drawn: sizer(freshTrail) },
        };
        fresh.remove();
        return out;
      });

    const fallback = await readings();
    // The race happened: what was measured is the fallback face's, not the face's (the face is not there yet, so the
    // fresh copies measure the fallback too — compared after the face arrives below).
    release();
    await page.evaluate(async (family) => {
      await Promise.all([...document.fonts].filter((face) => face.family.replace(/["']/g, '') === family).map((face) => face.loaded));
      await document.fonts.ready;
      // The components measure again in the `ready` callback, and a list or a trail writes what differs in a frame.
      await new Promise((done) => setTimeout(done, 0));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    }, FAMILY);
    const after = await readings();

    // The face draws the text narrower than the fallback did: each component had a fallback measurement to replace.
    expect(after.marquee.drawn, 'the face draws the marquee text narrower than its fallback').toBeLessThan(fallback.marquee.measured - 10);
    expect(after.list.drawn, 'the face draws the widest term narrower than its fallback').not.toBe(fallback.list.measured);
    expect(after.trail.drawn, 'the face draws the trail narrower than its fallback').not.toBe(fallback.trail.measured);
    // And every component measured it again.
    expect(after.marquee.measured, 'the marquee text measured its text in the face').toBe(after.marquee.drawn);
    expect(after.list.measured, 'the description list measured its widest term in the face').toBe(after.list.drawn);
    expect(after.trail.measured, 'the breadcrumbs measured their levels in the face').toBe(after.trail.drawn);
  });
});
