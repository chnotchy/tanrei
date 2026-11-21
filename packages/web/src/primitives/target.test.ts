// The minimum target is centred on its control to the layout's own unit (BTN-5, and every control that composes
// `minimumTarget()`, src/primitives/target.ts): its reach past the control is the same before and after, on both axes,
// in either direction. A hit area centred by an inset of 50% and a translation of -50% is not. The inset is rounded to
// the layout's unit (1/64 px; 1/60 in Firefox) and the translation is not, so on a control an odd number of units high
// the hit area stands a unit toward one side (Chromium, WebKit); and Firefox hit-tests a translated box at a whole
// pixel, so on a control at a fraction of a pixel the hit area stands up to half a pixel toward one side (0.3 px here).
// A press a pixel short of the middle of the gap to a neighbour then goes to the neighbour. Laid out by its insets,
// each side is the same length: (target - size) / 2.
//
// Each control here is drawn 2047/64 px (31.984375) high — an odd number of layout units, the case a line height or a
// size token gives — 0.3 px past where its stage places it, under targets of 48. Its hit area is found by hit-testing
// along the line through its middle, and its own edges by the same probes on a plain box laid over the page at its
// bounds, so that how an engine turns a point into its unit cancels out, and so does how it hit-tests a rounded shape.
// affected: each component — each test names in its title the component it draws.
import { type Page, expect, test } from '@playwright/test';
import { loadSpec, mountFixtures, rootTokens } from '../../test/harness.js';

/** An odd number of layout units: its half is not one. */
const SIZE = `${2047 / 64}px`;
const TARGET = 48;

type Axis = 'block' | 'inline';
interface Case {
  /** The spec, and the behaviour that gives the control its minimum target. */
  name: string;
  id: string;
  fixture: string;
  /**
   * What draws the hit area as its `::before`, in the shadow root of the fixture's element (the first that matches), or
   * of `holder`, an element the fixture's element holds; `:host` for that element itself.
   */
  part: string;
  holder?: string;
  /** The tokens that draw the part 2047/64 px high (`SIZE`), with any that would otherwise hold it at another. */
  tokens: Record<string, string>;
  /**
   * The axes along which the hit area reaches past the part, centred. Not one along which the part is at least the
   * target (the hit area is then the part, and what would be measured is how the engine hit-tests the part's own rounded
   * shape), nor one the component caps toward a neighbour by design.
   */
  axes: Axis[];
}
const CASES: Case[] = [
  // The primitive alone, on a square control: both axes.
  { name: 'checkbox', id: 'CHK-7', fixture: 'unselected', part: '.control', tokens: { '--tanrei-comp-checkbox-container-size': SIZE }, axes: ['block', 'inline'] },
  { name: 'radio-button', id: 'RAD-9', fixture: 'unselected', part: '.control', tokens: { '--tanrei-comp-radio-button-container-size': SIZE }, axes: ['block', 'inline'] },
  // A component that gives the hit area a size of its own (TGR-5's caps, unset outside a set); with no padding, the
  // height is the container height's alone. Its label makes it wider than the target.
  { name: 'chip', id: 'CHP-5', fixture: 'action-outlined', part: '.container', tokens: { '--tanrei-comp-chip-container-height-medium': SIZE, '--tanrei-comp-chip-container-padding-block-medium': '0px' }, axes: ['block'] },
  // One whose inline sides stop at its neighbours (FIT-18): its block axis is centred.
  { name: 'file-item', id: 'FIT-18', fixture: 'row-error-retryable', part: '.action', tokens: { '--tanrei-comp-file-item-action-size': SIZE }, axes: ['block'] },
  // Hit areas a component draws of its own, centred the same way along the block axis: a chip's remove action (CHP-21),
  // a menu bar's title (MBR-17), and the lines of an embedded text input (ETI-12), whose height is a line height times a
  // font size.
  { name: 'chip', id: 'CHP-21', fixture: 'input', part: '.remove', tokens: { '--tanrei-comp-chip-remove-container-size-medium': SIZE }, axes: ['block'] },
  { name: 'menubar', id: 'MBR-17', fixture: 'default', holder: 'tanrei-menubar-menu', part: '.title.p', tokens: { '--tanrei-comp-menubar-container-height': SIZE }, axes: ['block'] },
  {
    name: 'embedded-text-input',
    id: 'ETI-12',
    fixture: 'single-line',
    part: ':host',
    tokens: { '--tanrei-comp-embedded-text-input-input-typescale-font-size': '16px', '--tanrei-comp-embedded-text-input-input-typescale-line-height': `${2047 / 1024}` },
    axes: ['block'],
  },
];

/**
 * Runs in the page: how far the hit area of `part` (in the shadow root of the fixture's element `tag`) reaches past the
 * part before and after it along `axis`, and the part's size along it. Each edge is found by halving, to well under a
 * unit, between a point that hits and one that does not.
 */
function reach([fixture, tag, holder, part, axis]: [string, string, string, string, Axis]) {
  const host = document.querySelector(`[data-fixture="${fixture}"] ${tag}${holder ? ` ${holder}` : ''}`);
  // A press on a host's `::before` is a press on the host, as the document sees it.
  const root = part === ':host' ? document : host?.shadowRoot;
  const el = part === ':host' ? host : root?.querySelector(part);
  if (!root || !el) throw new Error(`no ${part} in ${tag} ${holder} of ${fixture}`);
  const r = el.getBoundingClientRect();
  const block = axis === 'block';
  // The line through the part's middle, across the axis.
  const across = block ? r.left + r.width / 2 : r.top + r.height / 2;
  const middle = block ? r.top + r.height / 2 : r.left + r.width / 2;
  const at = (scope: DocumentOrShadowRoot, along: number) => (block ? scope.elementFromPoint(across, along) : scope.elementFromPoint(along, across));
  const edge = (hits: (along: number) => boolean, inside: number, outside: number) => {
    if (!hits(inside)) throw new Error(`a press at the middle of ${part} in ${tag} misses it`);
    for (let step = 0; step < 24; step += 1) {
      const half = (inside + outside) / 2;
      if (hits(half)) inside = half;
      else outside = half;
    }
    return (inside + outside) / 2;
  };
  const far = 4 * Math.max(r.width, r.height, 48);
  // The part's own edges: a plain box at its bounds, over everything, alone in the page while it is there.
  const box = document.createElement('div');
  box.style.cssText = `position: fixed; z-index: 2147483647; margin: 0; left: ${r.left}px; top: ${r.top}px; width: ${r.width}px; height: ${r.height}px`;
  document.body.append(box);
  const onBox = (along: number) => at(document, along) === box;
  const [boxStart, boxEnd] = [edge(onBox, middle, middle - far), edge(onBox, middle, middle + far)];
  box.remove();
  const onPart = (along: number) => {
    const found = at(root, along);
    return !!found && (found === el || el.contains(found));
  };
  const [hitStart, hitEnd] = [edge(onPart, middle, middle - far), edge(onPart, middle, middle + far)];
  return { before: boxStart - hitStart, after: hitEnd - boxEnd, size: block ? r.height : r.width };
}

async function mount(page: Page, c: Case, dir: 'ltr' | 'rtl') {
  const spec = loadSpec(c.name);
  const fixture = spec.fixtures.find((f) => f.id === c.fixture);
  if (!fixture) throw new Error(`${c.name} has no fixture ${c.fixture}`);
  await mountFixtures(page, spec, { icons: true, dir, fixtures: [fixture] });
  await rootTokens(page, {
    '--tanrei-sys-target-pointer': `${TARGET}px`,
    '--tanrei-sys-target-touch': `${TARGET}px`,
    ...c.tokens,
  });
  const tag = spec.platforms.web.name;
  // At a fraction of a pixel along both axes.
  await page.locator(`[data-fixture="${c.fixture}"] ${tag}`).evaluate((host: HTMLElement) => {
    host.style.marginBlockStart = '0.3px';
    host.style.marginInlineStart = '0.3px';
  });
  return tag;
}

test.describe('minimum target', () => {
  for (const c of CASES) {
    for (const dir of ['ltr', 'rtl'] as const) {
      test(`BTN-5, ${c.id}: the hit area of ${c.name}'s ${c.part} is centred on a control an odd number of layout units high at a fraction of a pixel, ${dir}`, async ({ page }) => {
        const tag = await mount(page, c, dir);
        for (const axis of c.axes) {
          const { before, after, size } = await page.evaluate(reach, [c.fixture, tag, c.holder ?? '', c.part, axis] as [string, string, string, string, Axis]);
          // The part is drawn at the size given, to the engine's unit (Firefox's is 1/60 px), and the hit area reaches past it.
          expect(Math.abs(size - 2047 / 64), `${c.name} ${axis} size: ${size}`).toBeLessThan(1 / 32);
          expect(before, `${c.name} reaches past its ${axis} start`).toBeGreaterThan(1);
          // The same reach on both sides, to well under the unit (1/64 px), the least by which the centring by a translation missed.
          expect(Math.abs(before - after), `${c.name} ${axis}: ${before} before, ${after} after`).toBeLessThan(1 / 256);
        }
      });
    }
  }
});
