// What a component lays out side by side never takes a press meant for its neighbour (BTN-5, BGR-4 and every row after
// them: SNK-4, CAL-5, IMP-8, the actions of a dialog, a side sheet and a popover, CCM-2, FIG-9, TXI-71, SEL-72,
// CMB-20). A hit area that reaches past what is drawn (src/primitives/target.ts) stops toward a neighbour at the middle
// of the gap between them, so that:
//
//  - a press on any pressable's visible bounds goes to that pressable (or to one it holds, or one that holds it), never
//    to a neighbour whose hit area reaches over it;
//  - a press in the gap between two goes to the nearer one, or to neither — never to the farther.
//
// Every fixture of every component with a web implementation is mounted and every pressable in it is pressed, in four
// settings: the default system (targets 36: only what is drawn smaller reaches), the m3-like preset (a 48 touch and a
// 44 pointer target over 32-high controls), every gap of every component 2 px wide under targets of 48 (`2px apart`:
// Buttons laid out 2 px apart, the closest a layer can set them, where every reach that does not stop overlaps), and
// every gap 8 px wide under targets of 48 (`8px apart`, where a press a quarter of the gap from either side shows which
// way it goes). A press is `elementFromPoint` through the shadow roots: the hit-testing a pointer gets, in Chromium
// (hit-testing is the layout's and the same in every engine; the components' own tests press in all three). Two
// Buttons a product lays out side by side itself, outside any Tanrei row, are pressed the same way, with and without the
// caps the product may set on its row (BTN-5).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loadSpec, mountFixtures, rootTokens } from '../test/harness.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
/** Every spec the web implements. */
const NAMES = fs
  .readdirSync(path.join(repo, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(repo, 'specs', file), 'utf8')) as { name: string; platforms?: { web?: { status?: string } } })
  .filter((spec) => spec.platforms?.web?.status && spec.platforms.web.status !== 'planned')
  .map((spec) => spec.name)
  .sort();

/** Every gap token of every component: what lays a row's items apart. */
const GAPS = [...new Set(fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8').match(/--tanrei-comp-[a-z0-9-]*-gap(?:-[a-z0-9-]+)?(?=:)/g) ?? [])];
const apart = (px: number) => ({ '--tanrei-sys-target-pointer': '48px', '--tanrei-sys-target-touch': '48px', ...Object.fromEntries(GAPS.map((name) => [name, `${px}px`])) });

type Setting = 'default' | 'm3-like' | '2px apart' | '8px apart';
const SETTINGS: Record<Setting, { system?: string; tokens?: Record<string, string> }> = {
  default: {},
  'm3-like': { system: 'm3-like' },
  '2px apart': { tokens: apart(2) },
  '8px apart': { tokens: apart(8) },
};

/**
 * Runs in the page: for each stage, each pressable whose visible bounds take a press of a neighbour's, and each gap a
 * press in whose nearer half goes to the farther side — `<fixture>: …`.
 */
async function overreaching(): Promise<string[]> {
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // What a person presses: a native control or link, or what takes focus or has a pressable role.
  const PRESSABLE =
    'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="gridcell"], [role="slider"], [role="spinbutton"], [role="treeitem"], [tabindex]:not([tabindex="-1"])';
  const flatParent = (el: Element): Element | null => (el.assignedSlot as Element | null) ?? el.parentElement ?? (((el.getRootNode() as ShadowRoot).host as Element | undefined) || null);
  const hit = (x: number, y: number) => {
    let at = document.elementFromPoint(x, y);
    while (at?.shadowRoot) {
      const inner = at.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === at) break;
      at = inner;
    }
    return at;
  };
  const describe = (el: Element) => {
    const host = (el.getRootNode() as ShadowRoot).host;
    const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
    return `${host ? `${host.localName} › ` : ''}${el.localName}${text ? ` "${text}"` : ''}`;
  };
  const out: string[] = [];
  for (const stage of document.querySelectorAll<HTMLElement>('.stage[data-fixture]')) {
    const all: Element[] = [];
    const walk = (root: ParentNode) => {
      for (const el of root.querySelectorAll('*')) {
        if (el.matches(PRESSABLE)) all.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(stage);
    const pressables = new Set(all);
    const owner = (el: Element | null) => {
      for (let at = el; at; at = flatParent(at)) if (pressables.has(at)) return at;
      return null;
    };
    const holds = (a: Element, b: Element) => {
      for (let at: Element | null = b; at; at = flatParent(at)) if (at === a) return true;
      return false;
    };
    const kin = (a: Element, b: Element) => a === b || holds(a, b) || holds(b, a);
    const inside = (r: DOMRect, x: number, y: number) => x >= r.left - 0.5 && x <= r.right + 0.5 && y >= r.top - 0.5 && y <= r.bottom + 0.5;
    // Where a box is drawn, as Chromium hit-tests a point between whole pixels: it may give a point less than a pixel
    // short of a box's edge to the box (measured: a point 0.9 px before an icon-only Button's drawn start, where its hit
    // area does not reach, is the Button's). A press that close to what a neighbour draws is a press on its drawing.
    const drawnAt = (r: DOMRect, x: number, y: number) => x > r.left - 1 && x < r.right + 1 && y > r.top - 1 && y < r.bottom + 1;
    stage.scrollIntoView({ block: 'start' });
    await frame();
    const shown = all.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
      const s = getComputedStyle(el);
      if (s.visibility !== 'visible' || Number(s.opacity) === 0) return false;
      // Only what a press at its middle reaches: a pressable under another surface is not pressed here.
      const middle = owner(hit(r.left + r.width / 2, r.top + r.height / 2));
      return !!middle && kin(el, middle);
    });
    const rects = new Map(shown.map((el) => [el, el.getBoundingClientRect()]));
    for (const p of shown) {
      const r = rects.get(p)!;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Its visible bounds, a pixel and a half inside each edge (a seam on a half pixel is the engine's to round).
      const edges: [string, number, number, number, number][] = [
        ['left', r.left + 1.5, cy, -1, 0],
        ['right', r.right - 1.5, cy, 1, 0],
        ['top', cx, r.top + 1.5, 0, -1],
        ['bottom', cx, r.bottom - 1.5, 0, 1],
      ];
      for (const [side, x, y, dx, dy] of edges) {
        const o = owner(hit(x, y));
        if (o && !kin(p, o)) {
          const q = o.getBoundingClientRect();
          // Drawn there is the layout's, not a reach; a part drawn inside this pressable (a chip's remove action, a
          // file item's action) is the pressable's own business.
          const part = q.left >= r.left - 0.5 && q.right <= r.right + 0.5 && q.top >= r.top - 0.5 && q.bottom <= r.bottom + 0.5;
          if (!drawnAt(q, x, y) && !part) out.push(`${stage.dataset.fixture}: ${describe(p)}, ${side} edge: a press there goes to ${describe(o)}`);
        }
        // The gap beyond this edge, to the first pressable drawn that way within 24 px.
        const from = dx ? (dx > 0 ? r.right : r.left) : dy > 0 ? r.bottom : r.top;
        let neighbour: Element | undefined;
        for (let d = 1; d <= 24 && !neighbour; d += 1) {
          const ax = dx ? from + dx * d : cx;
          const ay = dy ? from + dy * d : cy;
          neighbour = shown.find((n) => !kin(p, n) && inside(rects.get(n)!, ax, ay));
        }
        if (!neighbour) continue;
        const n = rects.get(neighbour)!;
        const gap = dx ? (dx > 0 ? n.left - r.right : r.left - n.right) : dy > 0 ? n.top - r.bottom : r.top - n.bottom;
        if (gap < 4) continue;
        const near = owner(hit(dx ? from + (dx * gap) / 4 : cx, dy ? from + (dy * gap) / 4 : cy));
        if (near && kin(neighbour, near) && !kin(p, near)) out.push(`${stage.dataset.fixture}: a press in the gap at the ${side} of ${describe(p)}, nearer it, goes to ${describe(neighbour)}`);
      }
    }
  }
  return [...new Set(out)];
}

/**
 * What still reaches over a neighbour, by component, each with what it is and what would fix it; this list only
 * shrinks. An entry that no longer matches fails too, so it is taken out with the fix.
 */
const ALL: Setting[] = ['default', 'm3-like', '2px apart', '8px apart'];
const CHEVRON = {
  settings: ALL,
  // What stands at the end of the input's line: the input, or, while several values are chosen, the chip that ends a line
  // of entries (CMB-74) — in either direction, at whatever place the fonts of the machine wrap the entries.
  line: /(tanrei-combobox › input|tanrei-chip › button) .*goes to tanrei-combobox › button/,
  reason:
    'CMB-19 gives the chevron the whole gap to the input’s end and at least the minimum target’s width, which reaches over the end of the input where the room is less, and in the same way over the end of a chip that ends a line of entries there, or the nearer half of the gap to it (CMB-74). The neighbour clause for a chevron with a hit part of its own is a change to CMB-19: stop at the middle of container.gap toward the input and the entries.',
};
const KNOWN: Record<string, { settings: Setting[]; line: RegExp; reason: string }[]> = {
  calendar: [
    {
      settings: ['2px apart', '8px apart'],
      line: /year: a press in the gap at the top of tanrei-calendar › button "\d+"/,
      reason: 'The view toggle’s hit area (CAL-5) reaches down past the middle of the gap to the first row of years when that gap is narrowed: the toggle stops toward nothing below it.',
    },
  ],
  carousel: [
    {
      settings: ['m3-like', '2px apart', '8px apart'],
      line: /a press in the gap at the bottom of tanrei-carousel-item/,
      reason: 'CRL-37 gives the indicator the whole height of the controls row, which reaches up past the middle of the gap to the items when the controls row is taller than the indicator.',
    },
  ],
  combobox: [CHEVRON],
  'combobox-field': [CHEVRON],
  field: [CHEVRON],
  'file-item': [
    {
      settings: ['m3-like', '8px apart'],
      line: /tanrei-file-item › (a|button) "[^"]*",? .*goes to tanrei-file-item › button "(Remove|Retry)/,
      reason: 'FIT-18 lets a row’s last action reach toward the texts as far as row.container-gap; where the item’s body is pressable, that reaches over the body’s end. It should stop at the middle of the gap to the body.',
    },
  ],
  'file-upload': [
    {
      settings: ['2px apart', '8px apart'],
      line: /tiles[a-z-]*: /,
      reason: 'Between tiles the actions’ caps are FIT-18’s own (tile.action-inset) and the reorder Button is placed by the upload, not in a row the upload caps: with the gaps narrowed they reach past the middle.',
    },
  ],
  menubar: [
    {
      settings: ALL,
      line: /goes to a "/,
      reason: 'A link item’s visible bounds are its title’s container, wider than the anchor this check measures: the anchor’s hit area (MBR-17) is the title’s, and covers the title’s own padding, which the check counts as gap.',
    },
  ],
  search: [
    {
      settings: ['2px apart'],
      line: /bar-slots: .*goes to tanrei-button › button "mic"/,
      reason: 'The trailing slot’s first Button stops toward the clear button where there is one (SRC-34 keeps their lengths); with no clear button and container.gap at 2 px, it reaches over the end of the input.',
    },
  ],
  toolbar: [
    {
      settings: ['2px apart'],
      line: /inline-(overflow-pinned|separation-gap): a press in the gap/,
      reason: 'The toolbar measures each gap (TBR-9); where a separator or the pinned overflow button stands between two items, at 2 px the measured half is not the middle of what the check sees as the gap.',
    },
  ],
};

/**
 * Two narrow icon-only Buttons (32 wide, under targets of 48: each side lacks 8) that a product lays out itself, `gap` px
 * apart in a row of its own, outside any Tanrei row; `capped`: with the caps the product sets on that row (BTN-5), half
 * the gap toward each other, inherited by both. Every fixture's stage is taken out first, so the row is all the check
 * presses.
 */
function productRow([gap, capped]: [number, boolean]) {
  for (const stage of document.querySelectorAll('.stage[data-fixture]')) stage.remove();
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.dataset.fixture = 'product-row';
  const row = document.createElement('div');
  row.style.cssText = `display: flex; gap: ${gap}px`;
  if (capped) {
    row.style.setProperty('--tanrei-target-cap-start', `calc(${gap}px / 2)`);
    row.style.setProperty('--tanrei-target-cap-end', `calc(${gap}px / 2)`);
  }
  for (const label of ['First', 'Second']) {
    const button = document.createElement('tanrei-button');
    button.setAttribute('variant', 'tonal');
    button.setAttribute('width', 'narrow');
    button.setAttribute('label', label);
    button.innerHTML = '<span slot="icon">add</span>';
    row.append(button);
  }
  stage.append(row);
  document.body.append(stage);
  return Promise.all([...row.children].map((button) => (button as unknown as { updateComplete: Promise<unknown> }).updateComplete));
}

test.describe('targets', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'hit-testing is the layout’s, the same in every engine; the components’ own tests press in all three');
  for (const name of NAMES) {
    for (const setting of Object.keys(SETTINGS) as Setting[]) {
      const { system, tokens } = SETTINGS[setting];
      test(`BTN-5: in ${name}, ${setting}, no hit area takes a press on a neighbour’s visible bounds or in the nearer half of the gap to it`, async ({ page }) => {
        const spec = loadSpec(name);
        await page.setViewportSize({ width: 1280, height: 900 });
        await mountFixtures(page, spec, { icons: true, ...(system ? { system } : {}) });
        if (tokens) await rootTokens(page, tokens);
        const found = await page.evaluate(overreaching);
        const known = (KNOWN[name] ?? []).filter((entry) => entry.settings.includes(setting));
        expect(found.filter((line) => !known.some((entry) => entry.line.test(line)))).toEqual([]);
        for (const entry of known) expect(found.some((line) => entry.line.test(line)), `${name} (${setting}) no longer matches ${entry.line}: take it out of KNOWN`).toBe(true);
      });
    }
  }

  // Buttons a product lays out beside each other itself: no Tanrei row caps them, so their hit areas reach the whole
  // target and the later one takes a press on the earlier one's end (2 px apart) or in the nearer half of the gap to it
  // (8 px apart), until the product sets the caps on its row.
  for (const setting of ['2px apart', '8px apart'] as const) {
    const gap = setting === '2px apart' ? 2 : 8;
    for (const capped of [false, true]) {
      test(`BTN-5: two Buttons a product places side by side, ${setting}, ${capped ? 'stop at the middle of the gap with the caps it sets on their row' : 'reach over each other without caps'}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await mountFixtures(page, loadSpec('button'), { icons: true });
        await rootTokens(page, SETTINGS[setting].tokens!);
        await page.evaluate(productRow, [gap, capped] as [number, boolean]);
        const found = await page.evaluate(overreaching);
        if (capped) expect(found).toEqual([]);
        else
          expect(found).toEqual([
            gap === 2
              ? 'product-row: tanrei-button › button "First", right edge: a press there goes to tanrei-button › button "Second"'
              : 'product-row: a press in the gap at the right of tanrei-button › button "First", nearer it, goes to tanrei-button › button "Second"',
          ]);
      });
    }
  }
});
