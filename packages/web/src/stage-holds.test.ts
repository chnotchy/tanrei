// A fixture's baseline holds the whole fixture. A `snapshot:` test records the stage a fixture is mounted in
// (`[data-fixture]`), cut at the stage's box: whatever the component draws outside that box — its shadow, an outline,
// a part it places outside its own host — is missing from the picture, and a change to it is never seen.
//
// Every fixture that has a baseline of its stage — its component's own, and each preset's — is mounted, and what it
// paints outside its stage is read from the pixels: the other stages are hidden, the area around the stage is
// captured, and any pixel there that is not the page's surface, by however little, is the fixture's. There must be
// none, but for a component's defect listed in `KNOWN`. A stage that is too small is given room by its staging
// (test/harness.ts): for a shadow, the reach of the component's elevation in the system it is drawn under.
//
// Not checked: a fixture whose baseline is its whole window (`WINDOW`) — what is outside a window is drawn nowhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures } from '../test/harness.js';
import { motionEnded } from '../test/motions.js';
import { decodePng } from '../test/png.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOTS = path.join(pkg, 'snapshots');

type Pick = (fixture: Fixture) => boolean;
const all: Pick = () => true;
/** The fixtures whose baseline is the window they are drawn in, by spec, with the reason. */
const WINDOW: Record<string, { pick: Pick; reason: string }> = {
  'app-shell': { pick: all, reason: 'APS-2: a page frame, drawn alone in its window' },
  'bottom-sheet': { pick: all, reason: 'its stage stands for the window, and the modal sheet is in the top layer' },
  dialog: { pick: all, reason: 'DLG-7: a modal dialog and its scrim, in the top layer of its window' },
  'image-preview': { pick: all, reason: 'IMP-7: a modal dialog, in the top layer of its window' },
  'modal-layer': { pick: all, reason: 'a scrim over the whole window' },
  'side-sheet': { pick: all, reason: 'its stage stands for the window, and the modal sheet is in the top layer' },
  tooltip: { pick: all, reason: 'TIP-8: one tooltip, alone in a window as large as its stage' },
  popover: { pick: (f) => f.id.startsWith('compact'), reason: 'POP-39: a compact popover is placed against its window' },
  'navigation-drawer': { pick: (f) => f.props.responsive === true || ((f.props.variant === 'modal' || f.id === 'responsive-narrow') && f.props.open === true), reason: 'NVD-53: a responsive drawer is what its window makes it; an open modal one is in the top layer' },
  'date-time-picker': { pick: (f) => f.props.presentation !== 'docked', reason: 'DTM-1: a modal picker is in the top layer of its window' },
};

/**
 * Fixtures that paint outside their stage for a reason no stage should make room for — a defect of the component —
 * by `[<system>/]<spec>/<fixture>`, with what is painted. Each must still be found: once it is not, the test fails
 * until it leaves the list. The list only shrinks.
 */
const SEARCH_VIEW_RING =
  "the docked view's box (`.view`, position: fixed) is 0 × 0 at the stage's start corner while the full-screen or dialog view is shown, and still paints its elevation's 1 px ring there";
const KNOWN: Record<string, string> = Object.fromEntries(
  ['full-screen', 'full-screen-results', 'dialog-results', 'dialog-results-rtl', 'dialog-loading', 'dialog-none', 'dialog-error'].map((id) => [`search/${id}`, SEARCH_VIEW_RING]),
);

/** How far around a stage is looked at, in CSS pixels: a fixture that paints as far as this is reported as reaching it. */
const AROUND = 64;

/**
 * Every spec with baselines of its stages, and its fixtures that have one: its own (`snapshots/<spec>/<fixture>.png`,
 * drawn under the system of its layer) and each preset's (`snapshots/systems/<system>/<spec>/<fixture>.png`).
 */
const baselined = (dir: string, system?: string) =>
  fs
    .readdirSync(dir)
    .filter((name) => fs.existsSync(path.join(pkg, '../../specs', `${name}.spec.json`)))
    .sort()
    .map((name) => {
      const spec = loadSpec(name);
      const windowed = WINDOW[name]?.pick ?? (() => false);
      return { spec, system, fixtures: spec.fixtures.filter((f) => !windowed(f) && fs.existsSync(path.join(dir, name, `${f.id}.png`))) };
    })
    .filter((s) => s.fixtures.length);
const SYSTEMS = path.join(SNAPSHOTS, 'systems');
const SUBJECTS = [...baselined(SNAPSHOTS), ...fs.readdirSync(SYSTEMS).sort().flatMap((system) => baselined(path.join(SYSTEMS, system), system))];

interface Outside {
  top: number;
  right: number;
  bottom: number;
  left: number;
  /** The largest difference from the surface among the pixels outside, of 255. */
  most: number;
}

test.describe('every fixture is drawn inside the stage its baseline records', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the baselines are recorded in Chromium alone');

  for (const { spec, system, fixtures } of SUBJECTS) {
    const where = system ? `${system}/${spec.name}` : spec.name;
    test(`${where}: what each fixture paints lies inside its stage`, async ({ page }) => {
      test.setTimeout(30_000 + fixtures.length * 1_000);
      await page.setViewportSize({ width: 1280, height: 900 });
      await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures, ...(system ? { system } : {}) });
      await page.mouse.move(0, 0);
      // Room around every stage, above and before the first one too, for what it paints outside.
      await page.addStyleTag({ content: `body { padding: ${AROUND}px; }` });
      // What still moves (but what never ends) comes to rest first.
      await motionEnded(page);
      const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const [sr, sg, sb] = surface.match(/\d+(\.\d+)?/g)!.map(Number);
      const hide = await page.addStyleTag({ content: '/* the other stages, hidden */' });
      const found: Record<string, Outside> = {};
      for (const f of fixtures) {
        await hide.evaluate((el, id) => {
          el.textContent = `.stage:not([data-fixture="${CSS.escape(id)}"]) { visibility: hidden !important; opacity: 0 !important; }`;
        }, f.id);
        const box = await page.evaluate(async (id) => {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const r = document.querySelector(`[data-fixture="${CSS.escape(id)}"]`)!.getBoundingClientRect();
          const doc = document.documentElement;
          return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, pageWidth: doc.scrollWidth, pageHeight: doc.scrollHeight };
        }, f.id);
        const clip = {
          x: Math.max(0, Math.floor(box.x - AROUND)),
          y: Math.max(0, Math.floor(box.y - AROUND)),
          right: Math.min(box.pageWidth, Math.ceil(box.x + box.width + AROUND)),
          bottom: Math.min(box.pageHeight, Math.ceil(box.y + box.height + AROUND)),
        };
        const shot = decodePng(await page.screenshot({ fullPage: true, animations: 'disabled', clip: { x: clip.x, y: clip.y, width: clip.right - clip.x, height: clip.bottom - clip.y } }));
        const scale = shot.width / (clip.right - clip.x);
        const stage = {
          left: Math.floor((box.x - clip.x) * scale),
          top: Math.floor((box.y - clip.y) * scale),
          right: Math.ceil((box.x + box.width - clip.x) * scale),
          bottom: Math.ceil((box.y + box.height - clip.y) * scale),
        };
        const out: Outside = { top: 0, right: 0, bottom: 0, left: 0, most: 0 };
        for (let y = 0; y < shot.height; y++) {
          for (let x = 0; x < shot.width; x++) {
            if (x >= stage.left && x < stage.right && y >= stage.top && y < stage.bottom) continue;
            const i = (y * shot.width + x) * 4;
            const d = Math.max(Math.abs(shot.data[i] - sr), Math.abs(shot.data[i + 1] - sg), Math.abs(shot.data[i + 2] - sb));
            if (!d) continue;
            out.most = Math.max(out.most, d);
            out.top = Math.max(out.top, (stage.top - y) / scale);
            out.left = Math.max(out.left, (stage.left - x) / scale);
            out.bottom = Math.max(out.bottom, (y + 1 - stage.bottom) / scale);
            out.right = Math.max(out.right, (x + 1 - stage.right) / scale);
          }
        }
        if (out.most) found[f.id] = out;
      }
      const lines = Object.entries(found).map(
        ([id, o]) => `${where}/${id}: ${(['top', 'right', 'bottom', 'left'] as const).filter((side) => o[side] > 0).map((side) => `${side} ${o[side]}${o[side] >= AROUND ? '+' : ''}`).join(', ')} px outside (up to ${o.most}/255 from the surface)`,
      );
      const known = fixtures.map((f) => `${where}/${f.id}`).filter((key) => KNOWN[key]);
      expect(lines.filter((line) => !known.some((key) => line.startsWith(`${key}:`)))).toEqual([]);
      for (const key of known) expect(lines.some((line) => line.startsWith(`${key}:`)), `${key} is drawn inside its stage now: take it out of KNOWN`).toBe(true);
    });
  }
});
