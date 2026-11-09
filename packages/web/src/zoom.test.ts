// A surface placed against its anchor by script stands against it under an ancestor's CSS `zoom`. The surface is in
// the top layer, where no transform of the page reaches it, but it takes the zoom of its ancestors in the page: its
// box, its offset from the anchor and its margin from the window's edges are drawn that much larger, as the anchor is.
// So the arrangement is the one at no zoom, scaled: each surface of every family that places itself — the anchored
// surface the popover, the select's list and the combobox's list share (src/primitives/anchored.ts), the tooltip, the
// menu and a submenu, the docked date-time picker, the search's docked view, the FAB menu's items and the slider's value
// indicator — is drawn at its anchor, the edges it holds to the anchor's twice as far apart under a zoom of 2, twice its
// size, and still inside the window. (Text is laid out again at the zoom and is not exactly twice as wide, so what is
// compared is the edges the placement holds — lengths of the system — not the boxes' corners.)
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type Spec, loadSpec, mountFixtures } from '../test/harness.js';

type Box = { x: number; y: number; width: number; height: number };
/** An element in the stage: a selector in the document, then one in each shadow root below it. */
type Path = [string, ...string[]];

interface Subject {
  /** What it is, and the behaviour ids of its placement. */
  name: string;
  spec: Spec;
  /** One fixture, open at load and presented in the top layer (not drawn in place). */
  fixture: Fixture;
  anchor: Path;
  surface: Path;
  /** The placed element whose `scroll-margin-block-end` holds its margin from the window's edges, where it keeps one. */
  margin?: Path;
  /** The stage's own width, where the component is as wide as its place. */
  width?: number;
  /**
   * Measured in documents after the page's first: what it measures by script is measured once, as it opens, and a
   * page's first document can lay its text out before the text face has arrived.
   */
  warm?: boolean;
}

const ANCHOR = 'zoom-anchor';
const fixture = (spec: Spec, id: string, props: Fixture['props'] = {}): Fixture => {
  const found = spec.fixtures.find((f) => f.id === id);
  if (!found) throw new Error(`${spec.name} has no fixture ${id}`);
  return { ...found, id: 'zoomed', props: { ...found.props, ...props } };
};

const tooltip = loadSpec('tooltip');
const popover = loadSpec('popover');
const select = loadSpec('select');
const combobox = loadSpec('combobox');
const menu = loadSpec('menu');
const picker = loadSpec('date-time-picker');
const search = loadSpec('search');
const fabMenu = loadSpec('fab-menu');
const slider = loadSpec('slider');

const SUBJECTS: Subject[] = [
  {
    name: 'popover (POP-2, POP-4, POP-5)',
    spec: popover,
    fixture: fixture(popover, 'basic', { anchor: ANCHOR, placement: 'bottom-start' }),
    anchor: [`#${ANCHOR}`],
    surface: ['tanrei-popover', '.container'],
    margin: ['tanrei-popover', '.surface'],
  },
  {
    // The arrow's measures and the corner it stays off are lengths of the surface's own too.
    name: 'popover with an arrow (POP-2, POP-4, POP-10)',
    spec: popover,
    fixture: fixture(popover, 'arrow', { anchor: ANCHOR, placement: 'bottom-start' }),
    anchor: [`#${ANCHOR}`],
    surface: ['tanrei-popover', '.arrow'],
    margin: ['tanrei-popover', '.surface'],
  },
  {
    // Its content is short, so the row its actions make (measured by script) is its width: the same row under the zoom.
    name: 'popover with actions (POP-2, POP-7)',
    spec: popover,
    fixture: { ...fixture(popover, 'actions', { anchor: ANCHOR, placement: 'bottom-start' }), content: 'Empty?' },
    warm: true,
    anchor: [`#${ANCHOR}`],
    surface: ['tanrei-popover', '.container'],
    margin: ['tanrei-popover', '.surface'],
  },
  {
    name: 'select (SEL-24)',
    spec: select,
    fixture: fixture(select, 'stacked-open', { inline: false }),
    anchor: ['tanrei-select', '.field > .container'],
    surface: ['tanrei-select', '.list'],
    margin: ['tanrei-select', '.surface'],
    width: 280,
  },
  {
    name: 'combobox (CMB-22)',
    spec: combobox,
    fixture: fixture(combobox, 'stacked-open', { inline: false }),
    anchor: ['tanrei-combobox', '.field > .container'],
    surface: ['tanrei-combobox', '.list'],
    margin: ['tanrei-combobox', '.surface'],
    width: 280,
  },
  {
    name: 'tooltip (TIP-9, TIP-22, TIP-24)',
    spec: tooltip,
    fixture: fixture(tooltip, 'plain-bottom'),
    anchor: ['tanrei-tooltip > tanrei-button'],
    surface: ['tanrei-tooltip', '.bubble'],
    margin: ['tanrei-tooltip', '.surface'],
  },
  {
    name: 'tooltip with an arrow (TIP-9, TIP-24, TIP-25)',
    spec: tooltip,
    fixture: fixture(tooltip, 'plain-arrow', { placement: 'bottom' }),
    anchor: ['tanrei-tooltip > tanrei-button'],
    surface: ['tanrei-tooltip', '.arrow'],
    margin: ['tanrei-tooltip', '.surface'],
  },
  {
    name: 'menu (MNU-2)',
    spec: menu,
    fixture: fixture(menu, 'actions', { anchor: ANCHOR }),
    anchor: [`#${ANCHOR}`],
    surface: ['tanrei-menu', '.surface'],
    margin: ['tanrei-menu', '.surface'],
  },
  {
    // Placed beside the surface that holds its item, its first row level with the item's row.
    name: 'submenu (MNU-46)',
    spec: menu,
    fixture: fixture(menu, 'submenu-open', { anchor: ANCHOR }),
    anchor: ['tanrei-menu tanrei-submenu[open]', '.row'],
    surface: ['tanrei-menu tanrei-submenu[open]', '.surface'],
    margin: ['tanrei-menu tanrei-submenu[open]', '.surface'],
  },
  {
    name: 'docked date-time picker (DTM-2)',
    spec: picker,
    fixture: fixture(picker, 'docked-date', { anchor: ANCHOR, inline: false }),
    anchor: [`#${ANCHOR}`],
    surface: ['tanrei-date-time-picker', 'div.surface.docked'],
    margin: ['tanrei-date-time-picker', 'div.surface.docked'],
  },
  {
    name: 'search’s docked view (SRC-7)',
    spec: search,
    fixture: fixture(search, 'docked', { inline: false }),
    anchor: ['tanrei-search', '.bar'],
    surface: ['tanrei-search', '.view'],
    margin: ['tanrei-search', '.view'],
    width: 360,
  },
  {
    name: 'FAB menu (FBM-13)',
    spec: fabMenu,
    fixture: fixture(fabMenu, 'filled-open', { inline: false }),
    anchor: ['tanrei-fab-menu', 'button.toggle'],
    surface: ['tanrei-fab-menu', '.list'],
  },
  {
    name: 'slider’s value indicator (SLD-17, SLD-28)',
    spec: slider,
    fixture: fixture(slider, 'value-indicator'),
    anchor: ['tanrei-slider', '.handle'],
    surface: ['tanrei-slider', '.value-indicator'],
    width: 320,
  },
];

/** The window: room on every side of the anchor for the surface at either zoom. */
const WINDOW = { width: 1600, height: 1600 };
/** The stage's padding: the anchor stands this far into it (twice as far under a zoom of 2). */
const INSET = 240;

/**
 * Mounts the subject's one fixture with its stage zoomed: the stage is a plain block, the anchor `INSET` into it, the
 * component as wide as `width` where it is as wide as its place.
 */
async function mount(page: Page, subject: Subject, zoom: number) {
  await page.setViewportSize(WINDOW);
  const width = subject.width ? `inline-size: ${subject.width}px !important; box-sizing: content-box !important;` : 'inline-size: auto !important;';
  const lead = `<style>[data-fixture='zoomed'] { zoom: ${zoom}; display: block !important; ${width} block-size: auto !important; padding: ${INSET}px !important; margin: 0 !important; }</style>`;
  await mountFixtures(page, subject.spec, { icons: true, reducedMotion: true, fixtures: [subject.fixture], lead });
}

/** The boxes of the elements at these paths in the stage (null for one that is not there). */
const boxesAt = (page: Page, paths: Path[]) =>
  page.evaluate((all) => {
    return all.map((path) => {
      let at: Element | null = document.querySelector(`[data-fixture='zoomed'] ${path[0]}`);
      for (const step of path.slice(1)) at = at?.shadowRoot?.querySelector(step) ?? null;
      if (!at) return null;
      const r = at.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
  }, paths);

/** The length in `scroll-margin-block-end` of the element at `path` in the stage: its own pixels. */
const marginAt = (page: Page, path: Path) =>
  page.evaluate((steps) => {
    let at: Element | null = document.querySelector(`[data-fixture='zoomed'] ${steps[0]}`);
    for (const step of steps.slice(1)) at = at?.shadowRoot?.querySelector(step) ?? null;
    return at ? Number.parseFloat(getComputedStyle(at).scrollMarginBlockEnd) || 0 : 0;
  }, path);

/** The anchor's and the surface's boxes, once they have stood still for two frames. */
async function placed(page: Page, subject: Subject): Promise<{ anchor: Box; surface: Box }> {
  const read = async () => {
    const [anchor, surface] = await boxesAt(page, [subject.anchor, subject.surface]);
    return { anchor, surface };
  };
  let last = '';
  await expect
    .poll(async () => {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const now = JSON.stringify(await read());
      const still = now === last;
      last = now;
      return still;
    }, { message: `${subject.name}: the surface comes to rest` })
    .toBe(true);
  const { anchor, surface } = JSON.parse(last) as { anchor: Box | null; surface: Box | null };
  expect(anchor, `${subject.name}: the anchor`).not.toBeNull();
  expect(surface, `${subject.name}: the surface`).not.toBeNull();
  return { anchor: anchor!, surface: surface! };
}

type Pair = { anchor: Box; surface: Box };
type Edge = 'starts' | 'centres' | 'ends' | 'after' | 'before';
/**
 * How the surface's edges stand from the anchor's along one axis: its start from the anchor's start, its centre from
 * the anchor's centre, its end from the anchor's end, its start from the anchor's end (beside it, after it) and the
 * anchor's start from its end (beside it, before it).
 */
function edges({ anchor, surface }: Pair, axis: 'x' | 'y'): Record<Edge, number> {
  const size = axis === 'x' ? 'width' : 'height';
  const [a, s] = [anchor[axis], surface[axis]];
  const [aEnd, sEnd] = [a + anchor[size], s + surface[size]];
  return { starts: s - a, centres: s + surface[size] / 2 - (a + anchor[size] / 2), ends: sEnd - aEnd, after: s - aEnd, before: a - sEnd };
}
/** The edges the placement holds on an axis: the pair nearest each other with no zoom (a gap, an alignment, an inset). */
function held(pair: Pair, axis: 'x' | 'y'): Edge {
  const all = edges(pair, axis);
  return (Object.keys(all) as Edge[]).reduce((best, edge) => (Math.abs(all[edge]) < Math.abs(all[best]) ? edge : best));
}
/** The axis the surface stands beside its anchor on: the one whose held edges face each other. */
const across = (pair: Pair): 'x' | 'y' => (['after', 'before'].includes(held(pair, 'y')) ? 'y' : 'x');

test.describe('a surface placed against its anchor under an ancestor’s zoom', () => {
  for (const subject of SUBJECTS) {
    test(`${subject.name}: under zoom 2 it stands at its anchor as it does with none, every distance and its size twice as large, and stays inside the window`, async ({ page }) => {
      if (subject.warm) await mount(page, subject, 1);
      await mount(page, subject, 1);
      const plain = await placed(page, subject);
      await mount(page, subject, 2);
      const zoomed = await placed(page, subject);
      for (const axis of ['x', 'y'] as const) {
        const edge = held(plain, axis);
        const [once, twice] = [edges(plain, axis)[edge], edges(zoomed, axis)[edge]];
        expect(Math.abs(twice - 2 * once), `${subject.name}: on ${axis}, its ${edge} edge ${twice} from the anchor's is twice ${once}`).toBeLessThanOrEqual(1);
        // Its size: twice as large, but for the few pixels its text is laid out differently in.
        const size = axis === 'x' ? 'width' : 'height';
        const want = 2 * plain.surface[size];
        expect(Math.abs(zoomed.surface[size] - want), `${subject.name}: its ${size} ${zoomed.surface[size]} is twice ${plain.surface[size]}`).toBeLessThanOrEqual(Math.max(1.5, 0.02 * want));
      }

      // A window that ends just past the anchor, where the surface (no wider than the window can hold) does not fit from
      // where it stood: it stays inside it, its margin (where it keeps one) drawn at the zoom, on the same side of the
      // anchor and as far from it.
      const margin = subject.margin ? 2 * (await marginAt(page, subject.margin)) : 0;
      const window = { width: Math.ceil(Math.max(zoomed.anchor.x + zoomed.anchor.width + 24, zoomed.surface.width + 2 * margin + 40)), height: WINDOW.height };
      await page.setViewportSize(window);
      const view = await page.evaluate(() => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }));
      await expect
        .poll(async () => {
          const { surface } = await placed(page, subject);
          return surface.x + surface.width <= view.width - margin + 0.5;
        }, { message: `${subject.name}: inside the window's end edge less its margin ×2 (${margin})` })
        .toBe(true);
      const edge = await placed(page, subject);
      expect(edge.surface.x, `${subject.name}: inside the window's start edge`).toBeGreaterThanOrEqual(margin - 0.5);
      expect(edge.surface.y).toBeGreaterThanOrEqual(margin - 0.5);
      expect(edge.surface.y + edge.surface.height).toBeLessThanOrEqual(view.height - margin + 0.5);
      // Beside the anchor, as far from it — on the other side where its own has no room (a submenu turns to the start).
      const axis = across(plain);
      const facing = (pair: Pair) => {
        const all = edges(pair, axis);
        return Math.abs(all.after) <= Math.abs(all.before) ? all.after : all.before;
      };
      expect(Math.abs(facing(edge) - facing(zoomed)), `${subject.name}: beside the anchor on ${axis}, as far from it`).toBeLessThanOrEqual(1);
    });
  }
});
