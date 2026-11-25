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
// (hit-testing is the layout's and the same in every engine; the components' own tests press in all three). Each stage
// is pressed as if it stood alone on the page, whatever the others open over it (`overreaching()`), and the test
// checks that every stage was pressed and that each that draws a pressable pressed at least one. Two
// Buttons a product lays out side by side itself, outside any Tanrei row, are pressed the same way, with and without the
// caps the product may set on its row (BTN-5).
// affected: each component — each test names in its title the component it draws; the ones that name none hold the walk together.
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

/** What the walk found, and what it pressed in each stage. */
interface Reach {
  /** `<fixture>: …` for each pressable whose visible bounds take a press of a neighbour's, and each gap a press in whose nearer half goes to the farther side. */
  found: string[];
  /**
   * By fixture, in the order the stages were pressed: how many of its pressables are drawn (in the window, at least 4 px
   * each way, visible, not at no opacity, not inert) and how many of those a press at their middle (at the middle of
   * one of their lines, for an inline one that wraps) reaches, which are the ones pressed. A stage that draws a
   * pressable and presses none was not checked at all.
   */
  reached: Record<string, { drawn: number; pressed: number }>;
}

/**
 * Runs in the page: presses every pressable of every stage, each stage as if it stood alone on the page.
 *
 * The stages share one document, and what one of them opens in the top layer lies over the others: an open popover or
 * menu over the stages beside it, a modal dialog's backdrop over the whole window, which also makes every other part of
 * the document inert. A pressable under another stage's surface is not reached by a press at its middle, so it would not
 * be pressed: a page of a navigation drawer's fixtures pressed only the modal one opened last. So:
 *
 *  - every other stage is `inert` while a stage is pressed: a press passes through what it draws, its popovers too
 *    (hit-testing skips an inert element). That changes no layout and no style of the stage pressed.
 *  - an open modal dialog is not made inert by `inert` (nor is its backdrop), and the one opened last blocks every other
 *    one. The stages that hold one are pressed first, the one whose dialog the window's presses reach first, and each
 *    is taken out of the document once it has been pressed, which takes its dialog out of the top layer and lets the
 *    next one, and at last the rest of the document, take presses.
 */
async function overreaching(): Promise<Reach> {
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // What a person presses: a native control or link, or what takes focus or has a pressable role.
  const PRESSABLE =
    'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="radio"], [role="checkbox"], [role="switch"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="gridcell"], [role="slider"], [role="spinbutton"], [role="treeitem"], [tabindex]:not([tabindex="-1"])';
  const flatParent = (el: Element): Element | null => (el.assignedSlot as Element | null) ?? el.parentElement ?? (((el.getRootNode() as ShadowRoot).host as Element | undefined) || null);
  // The slot that draws a text the host holds at a point. Over a text node slotted straight into a shadow root (a label
  // written as the element's text), a shadow root's `elementFromPoint` gives the host, the text's parent, and not the
  // slot that places it: a press on a Button's own text would go to no pressable.
  const slottedText = (host: Element, x: number, y: number) => {
    const range = document.createRange();
    for (const node of host.childNodes) {
      const slot = node.nodeType === Node.TEXT_NODE ? (node as Text).assignedSlot : null;
      if (!slot) continue;
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return slot;
    }
    return null;
  };
  const hit = (x: number, y: number) => {
    let at = document.elementFromPoint(x, y);
    while (at?.shadowRoot) {
      const inner = at.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === at) {
        at = slottedText(at, x, y) ?? at;
        break;
      }
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
  const reached: Reach['reached'] = {};
  // Every pressable a stage holds, through its shadow roots.
  const pressablesOf = (stage: HTMLElement) => {
    const all: Element[] = [];
    const walk = (root: ParentNode) => {
      for (const el of root.querySelectorAll('*')) {
        if (el.matches(PRESSABLE)) all.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(stage);
    return all;
  };
  // Pressed where each box rests, not in a frame of a motion: a narrowed gap starts some (a chat composer's
  // attachments resize to it, over many frames where motion plays slowly). Where a box moved over the two frames after
  // a stage scrolled into view, the boxes are read once they have stood still for three frames in a row; frames are
  // counted, not time, so this holds at any playback rate. The boxes read are those of every stage the window shows
  // then, and the stages after it that stand wholly in the window, every pressable of theirs too, are pressed where
  // they stand, at rest, with no scroll and no frames of their own: a field has hundreds of stages, a dozen and more
  // to a window, and two frames for each of them were most of its time. A scroll and two frames cost more than all of
  // a field stage's presses.
  let atRest = new Set<HTMLElement>();
  const settle = async (stage: HTMLElement, after: HTMLElement[]) => {
    stage.scrollIntoView({ block: 'start' });
    const watched = [stage, ...after.filter((other) => {
      const r = other.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    })];
    const all = watched.flatMap(pressablesOf);
    const boxes = () =>
      all
        .map((el) => {
          const b = el.getBoundingClientRect();
          return `${b.x} ${b.y} ${b.width} ${b.height}`;
        })
        .join();
    const scrolled = boxes();
    await frame();
    let frames = 0;
    if (boxes() !== scrolled) {
      for (let last = boxes(), same = 0; same < 3 && frames < 600; frames++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const now = boxes();
        same = now === last ? same + 1 : 0;
        last = now;
      }
    }
    if (frames === 600) out.push(`${stage.dataset.fixture}: its pressables, or those of a stage in the window with it, did not stand still in ${frames} frames`);
    const within = (r: DOMRect) => r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    const whole = (other: HTMLElement) => within(other.getBoundingClientRect()) && pressablesOf(other).every((el) => [...el.getClientRects()].every((r) => (r.width === 0 && r.height === 0) || within(r)));
    atRest = new Set([stage, ...watched.slice(1).filter(whole)]);
  };
  const press = async (stage: HTMLElement, after: HTMLElement[]) => {
    if (!atRest.has(stage)) await settle(stage, after);
    const all = pressablesOf(stage);
    const pressables = new Set(all);
    // The boxes a pressable is drawn in: its box, or each line of an inline one that wraps (a link in running text),
    // whose box takes in the ends of the lines around it.
    const boxesOf = (el: Element) => {
      const lines = [...el.getClientRects()];
      return lines.length > 1 ? lines.filter((r) => r.width >= 4 && r.height >= 4) : [el.getBoundingClientRect()];
    };
    // A slider's handle takes no pointer events itself: a press on the track, a handle or the space around them lands on
    // what holds them, and moves the handle nearer the press (SLD-2). So a press that lands on the nearest holder that
    // takes pointer events goes to the nearer handle. Filled in once the drawn pressables are known; each holder is
    // mapped to the handles it takes presses for.
    const passes = new Map<Element, Element[]>();
    const distance = (r: DOMRect, x: number, y: number) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    // The pressable a press at (x, y) that lands on `el` goes to: `el` itself or what holds it, or, on the holder of
    // pressables that take no pointer events, the one of them nearest the press.
    const owner = (el: Element | null, x: number, y: number) => {
      for (let at = el; at; at = flatParent(at)) {
        if (pressables.has(at)) return at;
        const passed = passes.get(at);
        if (passed) return passed.reduce((a, b) => (Math.min(...boxesOf(b).map((r) => distance(r, x, y))) < Math.min(...boxesOf(a).map((r) => distance(r, x, y))) ? b : a));
      }
      return null;
    };
    const pressedAt = (x: number, y: number) => owner(hit(x, y), x, y);
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
    // What draws `el` at no opacity, itself or what holds it, while it still takes presses (a carousel's previous and
    // next controls until it is hovered, a time picker's dial numbers between hours and minutes); none when it is drawn.
    const veil = (el: Element) => {
      for (let at: Element | null = el; at; at = flatParent(at)) if (Number(getComputedStyle(at).opacity) === 0) return at as HTMLElement | SVGElement;
      return null;
    };
    // What a press at a point goes to once what is drawn there at no opacity lets it through: what a person sees there.
    // Not whatever lies under a veil — a time picker's faded numbers lie over its own dial, which hides what is under
    // the dialog. Each veil takes presses again before this returns.
    const seen = (x: number, y: number) => {
      const lifted: [HTMLElement | SVGElement, string][] = [];
      let at = hit(x, y);
      for (let over = at && veil(at); over && lifted.length < 8; over = at && veil(at)) {
        lifted.push([over, over.style.pointerEvents]);
        over.style.pointerEvents = 'none';
        at = hit(x, y);
      }
      for (const [el, value] of lifted.reverse()) el.style.pointerEvents = value;
      return at;
    };
    const onScreen = (r: DOMRect) => r.width >= 4 && r.height >= 4 && r.bottom >= 0 && r.top <= innerHeight && r.right >= 0 && r.left <= innerWidth;
    // Inert, itself or by what holds it in the stage, it takes no press (a bottom sheet's handle while the sheet has one
    // height): it is not a pressable a person can reach.
    const inert = (el: Element) => {
      for (let at: Element | null = el; at && at !== stage; at = flatParent(at)) if ((at as HTMLElement).inert) return true;
      return false;
    };
    const drawn = all.filter((el) => {
      if (inert(el) || !boxesOf(el).some(onScreen)) return false;
      const s = getComputedStyle(el);
      return s.visibility === 'visible' && Number(s.opacity) !== 0;
    });
    for (const el of drawn) {
      if (!el.matches('[role="slider"]') || getComputedStyle(el).pointerEvents !== 'none') continue;
      let holder = flatParent(el);
      while (holder && holder !== stage && getComputedStyle(holder).pointerEvents === 'none') holder = flatParent(holder);
      if (holder && holder !== stage) passes.set(holder, [...(passes.get(holder) ?? []), el]);
    }
    // Each pressable, with the boxes of it that a press at their middle reaches: only those are pressed, and a pressable
    // under another surface is not. A surface drawn at no opacity hides nothing: what is seen through it is pressed too,
    // and is a neighbour whose gap is measured (a carousel's items, under its previous and next controls until it is
    // hovered).
    const rects = new Map<Element, DOMRect[]>();
    for (const el of drawn) {
      const reaches = boxesOf(el).filter((r) => {
        if (!onScreen(r)) return false;
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const middle = pressedAt(x, y);
        if (middle && kin(el, middle)) return true;
        const through = owner(seen(x, y), x, y);
        return !!through && kin(el, through);
      });
      if (reaches.length) rects.set(el, reaches);
    }
    const shown = [...rects.keys()];
    reached[stage.dataset.fixture!] = { drawn: drawn.length, pressed: shown.length };
    for (const p of shown) {
      for (const r of rects.get(p)!) {
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
          const o = pressedAt(x, y);
          if (o && !kin(p, o)) {
            const q = o.getBoundingClientRect();
            // Drawn there is the layout's, not a reach; a part drawn inside this pressable (a chip's remove action, a
            // file item's action) is the pressable's own business, and so is a control drawn at no opacity over it (a
            // carousel's previous and next controls over the items that scroll under them): it lies on it, not beside it.
            const part = q.left >= r.left - 0.5 && q.right <= r.right + 0.5 && q.top >= r.top - 0.5 && q.bottom <= r.bottom + 0.5;
            const over = !!veil(o) && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top;
            if (!boxesOf(o).some((box) => drawnAt(box, x, y)) && !part && !over) out.push(`${stage.dataset.fixture}: ${describe(p)}, ${side} edge: a press there goes to ${describe(o)}`);
          }
          // The gap beyond this edge, to the first pressable drawn that way within 24 px.
          const from = dx ? (dx > 0 ? r.right : r.left) : dy > 0 ? r.bottom : r.top;
          let neighbour: Element | undefined;
          let n: DOMRect | undefined;
          for (let d = 1; d <= 24 && !neighbour; d += 1) {
            const ax = dx ? from + dx * d : cx;
            const ay = dy ? from + dy * d : cy;
            for (const other of shown) {
              n = kin(p, other) ? undefined : rects.get(other)!.find((box) => inside(box, ax, ay));
              if (n) {
                neighbour = other;
                break;
              }
            }
          }
          if (!neighbour || !n) continue;
          const gap = dx ? (dx > 0 ? n.left - r.right : r.left - n.right) : dy > 0 ? n.top - r.bottom : r.top - n.bottom;
          if (gap < 4) continue;
          const near = pressedAt(dx ? from + (dx * gap) / 4 : cx, dy ? from + (dy * gap) / 4 : cy);
          if (near && kin(neighbour, near) && !kin(p, near)) out.push(`${stage.dataset.fixture}: a press in the gap at the ${side} of ${describe(p)}, nearer it, goes to ${describe(neighbour)}`);
        }
      }
    }
  };

  const stages = [...document.querySelectorAll<HTMLElement>('.stage[data-fixture]')];
  const stageOf = (el: Element | null) => {
    for (let at = el; at; at = flatParent(at)) if (at instanceof HTMLElement && stages.includes(at)) return at;
    return null;
  };
  // The open modal dialogs a stage holds, through its shadow roots.
  const modals = (stage: HTMLElement) => {
    const open: Element[] = [];
    const walk = (root: ParentNode) => {
      for (const el of root.querySelectorAll('*')) {
        if (el.matches(':modal')) open.push(el);
        if (el.shadowRoot) walk(el.shadowRoot);
      }
    };
    walk(stage);
    return open;
  };
  // `after`: the stages pressed after it, in order, which may be pressed at rest where they stand with it.
  const alone = async (stage: HTMLElement, after: HTMLElement[] = []) => {
    for (const other of stages) other.inert = other !== stage;
    await press(stage, after);
  };
  // The stages that hold an open modal dialog, the one the window's presses reach first (the dialog opened last, whose
  // backdrop lies over the others) first; where a press reaches none of them (a dialog drawn outside the window), the
  // last in the document.
  for (let held = stages.filter((stage) => modals(stage).length); held.length; held = held.filter((stage) => stage.isConnected && modals(stage).length)) {
    const reachedFirst = held
      .flatMap(modals)
      .map((dialog) => {
        const r = dialog.getBoundingClientRect();
        return stageOf(hit(r.left + r.width / 2, r.top + r.height / 2));
      })
      .find((stage) => stage && held.includes(stage));
    const stage = reachedFirst ?? held[held.length - 1];
    await alone(stage);
    stage.remove();
    stages.splice(stages.indexOf(stage), 1);
  }
  for (const [at, stage] of stages.entries()) await alone(stage, stages.slice(at + 1));
  for (const stage of stages) stage.inert = false;
  return { found: [...new Set(out)], reached };
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
  combobox: [CHEVRON],
  'combobox-field': [CHEVRON],
  field: [CHEVRON],
  'navigation-drawer': [
    {
      settings: ALL,
      line: /: a press in the gap at the right of tanrei-navigation-drawer-(item|group) › (button|a) ".*", nearer it, goes to tanrei-handle › div /,
      reason:
        'NVD-96 lays the resize handle’s target from the drawer’s end edge outward, so that a row keeps the drawer’s full width (NVD-6), with the handle’s container at the target’s middle: the target takes the whole gap between a row’s end (the drawer’s edge) and the container, the half nearer the row too. Keeping that half from the handle is a change to NVD-96: start the target (target − container breadth) / 2 beyond the end edge, so that the half of the gap nearer the row is no one’s, and move what the app shell reads from data-resize (where its content starts) with it. That moves the main content of an app shell beside a resizable drawer that much further from the drawer (6 px under the default system, 12 under targets of 48), which changes APS-5, APS-8 and APS-24 and every picture of such a shell: a change of the layout, not of a hit area alone, so it waits for the maintainers.',
    },
  ],
  menubar: [
    {
      settings: ALL,
      line: /goes to a "/,
      reason: 'A link item’s visible bounds are its title’s container, wider than the anchor this check measures: the anchor’s hit area (MBR-17) is the title’s, and covers the title’s own padding, which the check counts as gap.',
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
        const { found, reached } = await page.evaluate(overreaching);
        // Every stage was pressed, and each that draws a pressable pressed at least one: none was left under another
        // stage's surface.
        expect(Object.keys(reached).sort()).toEqual(spec.fixtures.map((f) => f.id).sort());
        expect(Object.entries(reached).filter(([, { drawn, pressed }]) => drawn > 0 && pressed === 0).map(([fixture, { drawn }]) => `${fixture}: draws ${drawn} pressables and presses none`)).toEqual([]);
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
        const { found, reached } = await page.evaluate(overreaching);
        expect(reached).toEqual({ 'product-row': { drawn: 2, pressed: 2 } });
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
