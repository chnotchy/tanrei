// A fixture that appears on a page that is already there, sampled frame by frame (test/frames.ts) — the way a
// single-page product draws a view: every element defined, every face loaded, and the fixture's markup inserted at
// once. Its first frame is then what the person sees first, and `expectFirstFrameAtRest` says whether anything in it
// is drawn in a state it then leaves (a selected row that fades in from unselected, a label that floats up off the
// chips it was drawn over, a disabled button that fades from enabled, a drawer that widens to the width it was
// mounted at).
//
// A first frame that is its rest is not yet the fixture: an element that draws nothing once it appears (a container
// that read its children before the browser upgraded them, and so holds none) is the same in every frame. So the rest
// is also told apart from the fixture as `mountFixtures` drew it (`expectDrawnAsMounted`), when the page was mounted
// with `{ asMounted: true }`.
import { type Page, expect } from '@playwright/test';
import { type ElementFrame, type Frame, type Frames, type SampleOptions, frameAtRest, sampleFrames } from './frames.js';
import { type DocumentOptions, type Spec, fixturesDocument, mountFixtures } from './harness.js';

/** The stages of a fixtures document, as a page that is already there would be given them (no script, no holder). */
const stagesOf = (document: string) =>
  document.slice(document.indexOf('<body>') + '<body>'.length, document.indexOf('<script type="module">', document.indexOf('<body>'))).replace(/^<(main|div)[^>]*>|<\/(main|div)>$/g, '');

/**
 * Mounts the fixture `id` of `spec` (its faces, its icons, its definition), takes it off the page, waits for the
 * empty page to be drawn, and samples the frames of inserting it again. With `measured`, the task that inserts it also
 * reads its layout, as a product that measures the view it has just drawn does (a layout effect): the browser styles
 * the elements then, before any of them has updated. A fixture whose staging runs a script step after it is mounted
 * (`Staging.after` in test/harness.ts) is not drawn by its markup alone: give another one.
 */
export async function appearingFixture(page: Page, spec: Spec, id: string, options: DocumentOptions & AppearOptions = {}): Promise<Frames> {
  const { sample, measured, ...document } = options;
  const fixture = spec.fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`appearingFixture: ${spec.name} has no fixture ${id}`);
  await mountForAppearing(page, spec, { ...document, fixtures: [fixture] });
  return appearAgain(page, id, { sample, measured });
}

export interface AppearOptions {
  sample?: SampleOptions;
  /** The task that inserts the fixture also reads its layout (see `appearingFixture`). */
  measured?: boolean;
}

/** The page's copy of the stages as they were written: parsed into a template, so nothing in it is upgraded. */
interface Written {
  __tanreiStages?: DocumentFragment;
}

/** An element of a stage at rest, keyed under the stage (`stage/…`), with its box's place in the stage as well. */
export interface StagedElement extends ElementFrame {
  /** Its box's `x` and `y` from the stage's own, or null where it paints nothing. */
  place: [number, number] | null;
}

/** A fixture's stage at rest: its elements by their keys under it, without the ids a mount numbers (`tanrei-tab-3`). */
export type DrawnStage = Record<string, StagedElement>;

/**
 * What each element of a stage says to assistive technology and to focus (`semanticsOf`), by its key under the stage;
 * an element that says nothing of it is not in it.
 */
export type StageSemantics = Record<string, Record<string, string>>;

/**
 * Runs in the page: what each element in `root` (and in every shadow root inside it) says to assistive technology and
 * to focus — its role, its `aria-*` attributes, its tabindex, `hidden`, `inert` and `slot` — by its key as
 * test/frames.ts names it. An attribute that names other elements by their ids (`aria-controls`, `aria-labelledby`…)
 * names them by their keys (`@<key>`): the ids a mount numbers differ from one mount to the next, the elements do not.
 */
function semanticsOf(root: Element): Record<string, Record<string, string>> {
  const SAID = /^(role|tabindex|hidden|inert|slot|aria-.+)$/;
  const REFERS = new Set(['aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'aria-flowto']);
  const keys = new Map<Element, string>();
  const name = (el: Element, at: number) => `${el.localName}${el.id ? `#${el.id}` : ''}:${at}`;
  const visit = (el: Element, key: string) => {
    if (el.localName === 'style' || el.localName === 'script' || el.localName === 'template') return;
    keys.set(el, key);
    if (el.shadowRoot) [...el.shadowRoot.children].forEach((child, at) => visit(child, `${key}>${name(child, at)}`));
    [...el.children].forEach((child, at) => visit(child, `${key}/${name(child, at)}`));
  };
  visit(root, name(root, 0));
  const said: Record<string, Record<string, string>> = {};
  for (const [el, key] of keys) {
    const scope = el.getRootNode() as Document | ShadowRoot;
    const named = (id: string) => {
      const target = scope.getElementById(id);
      return target && keys.has(target) ? `@${keys.get(target)}` : '@outside';
    };
    const values = [...el.attributes].filter((a) => SAID.test(a.name));
    if (values.length) said[key] = Object.fromEntries(values.map((a) => [a.name, REFERS.has(a.name) ? a.value.split(/\s+/).filter(Boolean).map(named).join(' ') : a.value]));
  }
  return said;
}

/** `semantics` (read under the holder) of the stage `stage`, keyed under it as `stageIn` keys its elements. */
function semanticsIn(semantics: Record<string, Record<string, string>>, stage: string): StageSemantics {
  const inStage = (key: string) => key === stage || key.startsWith(`${stage}/`) || key.startsWith(`${stage}>`);
  const staged = (key: string) => unnumbered(inStage(key) ? `stage${key.slice(stage.length)}` : key);
  const said: StageSemantics = {};
  for (const [key, values] of Object.entries(semantics)) {
    if (!inStage(key)) continue;
    said[staged(key)] = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value.replace(/@(\S+)/g, (_, named: string) => `@${named === 'outside' ? named : staged(named)}`)]));
  }
  return said;
}

/** What the page was drawn as when `mountForAppearing` mounted it with `asMounted`. */
interface Mounted {
  /** The window it was drawn in: a stage drawn in another lays out otherwise. */
  viewport: { width: number; height: number } | null;
  stages: Map<string, { drawn: DrawnStage; semantics: StageSemantics }>;
}
const mounted = new WeakMap<Page, Mounted>();

/** The holder of the stages in a fixtures document (see `fixturesDocument`). */
const holderOf = (page: Page) => page.locator('body > main, body > div.stages');

/** A key with the ids taken out of it (`div#a:0/span:1` → `div:0/span:1`): an element is found by its place alone. */
const unnumbered = (key: string) => key.replace(/#[^/>]*?(:\d+)(?=$|[/>]|::)/g, '$1');

/**
 * A key of a frame `appearAgain` sampled (`main:0/div:0/…`: the holder, then the one stage in it) as
 * `expectDrawnAsMounted` keys it: under `stage`, without ids.
 */
export const asStaged = (key: string): string => unnumbered(key.replace(/^[^/>]+\/div(#[^/>]*?)?:0(?=$|[/>]|::)/, 'stage'));

/** The elements of the stage `stage` (a key of `frame`) at rest, under `stage/`: their boxes, and their places in it. */
function stageIn(frame: Frame, stage: string): DrawnStage {
  const own = frame.elements[stage];
  if (!own?.rect) throw new Error(`the stage ${stage} paints no box: its elements cannot be placed in it`);
  const [x, y] = own.rect;
  const drawn: DrawnStage = {};
  for (const [key, el] of Object.entries(frame.elements)) {
    if (key !== stage && !key.startsWith(`${stage}/`) && !key.startsWith(`${stage}>`) && !key.startsWith(`${stage}::`)) continue;
    drawn[unnumbered(`stage${key.slice(stage.length)}`)] = { ...el, place: el.rect ? [Math.round((el.rect[0] - x) * 10) / 10, Math.round((el.rect[1] - y) * 10) / 10] : null };
  }
  return drawn;
}

export interface MountForAppearingOptions {
  /**
   * Also reads every stage as `mountFixtures` drew it, at rest, so that `appearAgain` gives it (`Appeared.mounted`) to
   * be told apart from the rest of the fixture appearing (`expectDrawnAsMounted`). Read in the window the page is
   * mounted in: a fixture made to appear in another window has none.
   */
  asMounted?: boolean;
  /** Run on the mounted page before its stages are read (`asMounted`): to hold back what is held back when they appear. */
  beforeReading?: () => Promise<unknown>;
}

/**
 * Mounts `spec`'s fixtures (all of them, or `options.fixtures`) with their faces, icons and definitions, and keeps
 * their stages' markup in the page as it was written, for `appearAgain`. A page that makes many fixtures appear in turn
 * is mounted once: a mount is most of what one fixture's appearing costs, and the faces are then loaded for all of them.
 */
export async function mountForAppearing(page: Page, spec: Spec, options: DocumentOptions = {}, { asMounted = false, beforeReading }: MountForAppearingOptions = {}): Promise<void> {
  mounted.delete(page);
  const written = { icons: true, ...options };
  await mountFixtures(page, spec, written);
  const markup = stagesOf(await fixturesDocument(spec, written));
  // The stages in their order, before anything takes one off: a stage's key is its place among them.
  const order = await page.evaluate((html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    (window as Written).__tanreiStages = template.content;
    return [...document.querySelectorAll('body > main > *, body > div.stages > *')].map((stage) => stage.getAttribute('data-fixture'));
  }, markup);
  if (!asMounted) return;
  await beforeReading?.();
  const holder = holderOf(page);
  const frame = await frameAtRest(holder);
  const semantics = await holder.evaluate(semanticsOf);
  const root = Object.keys(frame.elements)[0]!;
  const stages: Mounted['stages'] = new Map();
  order.forEach((id, at) => {
    if (id !== null) stages.set(id, { drawn: stageIn(frame, `${root}/div:${at}`), semantics: semanticsIn(semantics, `${root}/div:${at}`) });
  });
  mounted.set(page, { viewport: page.viewportSize(), stages });
}

/** What `appearAgain` saw. */
export interface Appeared extends Frames {
  /**
   * The fixture's stage as `mountFixtures` drew it, at rest, where the page was mounted `asMounted` in the window it
   * appeared in; and the stage at the rest of its appearing, keyed the same way.
   */
  mounted?: { drawn: DrawnStage; rest: DrawnStage; semantics: { drawn: StageSemantics; rest: StageSemantics } };
}

/**
 * On a page `mountForAppearing` mounted: takes everything off the stages' holder, waits for the empty page to be
 * drawn, and samples the frames of inserting the stage of the fixture `id` as it was written.
 */
export async function appearAgain(page: Page, id: string, { sample, measured = false }: AppearOptions = {}): Promise<Appeared> {
  const holder = holderOf(page);
  const found = await holder.evaluate((el, id) => {
    el.replaceChildren();
    return !!(window as Written).__tanreiStages?.querySelector(`[data-fixture="${CSS.escape(id)}"]`);
  }, id);
  if (!found) throw new Error(`appearAgain: the page has no stage of the fixture ${id} (mountForAppearing first)`);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const seen: Appeared = await sampleFrames(
    holder,
    () =>
      holder.evaluate(
        (el, { id, measured }) => {
          el.insertAdjacentHTML('beforeend', (window as Written).__tanreiStages!.querySelector(`[data-fixture="${CSS.escape(id)}"]`)!.outerHTML);
          if (measured) void el.getBoundingClientRect();
        },
        { id, measured },
      ),
    sample,
  );
  const reference = mounted.get(page);
  const viewport = page.viewportSize();
  const stage = reference?.stages.get(id);
  if (stage && reference!.viewport?.width === viewport?.width && reference!.viewport?.height === viewport?.height) {
    const root = Object.keys(seen.rest.elements)[0]!;
    const semantics = semanticsIn(await holder.evaluate(semanticsOf), `${root}/div:0`);
    seen.mounted = { drawn: stage.drawn, rest: stageIn(seen.rest, `${root}/div:0`), semantics: { drawn: stage.semantics, rest: semantics } };
  }
  return seen;
}

/** The properties whose numbers are all lengths (a shape cut from a measured box, a move): compared as boxes are. */
const LENGTHS = new Set(['clip-path', 'translate']);

/**
 * A computed value of lengths written out in full: the engine leaves out what repeats — `inset(4px 0px 4px 0px)` is
 * `inset(4px 0px)`, `translate: 3px 0px 0px` is `3px` — so a value a hundredth of a pixel off the even one is written
 * with more numbers than the even one (a tab's indicator cut from a box measured at 3.96px rather than 4px).
 */
const fully = (property: string, value: string): string => {
  if (property === 'translate') {
    const [x, y = '0px', z = '0px'] = value.trim().split(/\s+/);
    return value === 'none' ? value : `${x} ${y} ${z}`;
  }
  return value.replace(/inset\(([^)]*?)(\s+round\s+[^)]*)?\)/g, (_, offsets: string, round = '') => {
    const [top, right = top, bottom = top, left = right] = offsets.trim().split(/\s+/);
    return `inset(${top} ${right} ${bottom} ${left}${round})`;
  });
};

/**
 * Two computed values of `property` are the same: equal, or — for a property of lengths alone — the same but for
 * numbers within `tolerance` px of each other (a ring cut from a box measured a fiftieth of a pixel otherwise).
 */
function sameStyle(property: string, a: string | undefined, b: string | undefined, tolerance: number): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || !LENGTHS.has(property)) return false;
  [a, b] = [fully(property, a), fully(property, b)];
  const number = /-?\d*\.?\d+(?:e-?\d+)?/g;
  if (a.replace(number, '#') !== b.replace(number, '#')) return false;
  const [x, y] = [a.match(number) ?? [], b.match(number) ?? []];
  return x.every((n, i) => Math.abs(Number(n) - Number(y[i])) <= tolerance);
}

/** The keys of `drawn` under `key`:the element itself, its pseudo-elements, its children and its shadow root's. */
export const under = (key: string) => (other: string) => other === key || other.startsWith(`${key}/`) || other.startsWith(`${key}>`) || other.startsWith(`${key}::`);

/**
 * The fixture appearing comes to rest as `mountFixtures` drew it: every element there and nowhere else, each painting
 * or not as it did, its box the same size and in the same place in its stage (or, for a box placed against the window —
 * a surface in the top layer — in the same place in the window), every property of `PROPERTIES` the same, and saying
 * the same to assistive technology and to focus (`semanticsOf`: a container that never told its items their place in
 * the set, or which one is the Tab stop). Boxes are compared within `tolerance` px; `ignore` leaves out a property of
 * a key (`'drawn'`, `'painted'`, an axis, a CSS property, an attribute `semanticsOf` reads), keyed under the stage
 * (`stage/…`, without ids).
 */
export function expectDrawnAsMounted(seen: Appeared, { tolerance = 0.5, ignore }: { tolerance?: number; ignore?: (key: string, property: string) => boolean } = {}): void {
  if (!seen.mounted) throw new Error('expectDrawnAsMounted: the page was not mounted asMounted in the window the fixture appeared in');
  const { drawn, rest } = seen.mounted;
  const differences: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) <= tolerance;
  // What never ends (a spinner's motion) is held wherever it was caught: it, and everything inside it, is left out.
  const endless = [...Object.entries(drawn), ...Object.entries(rest)].filter(([, el]) => el.endless).map(([key]) => under(key.replace(/::(before|after)$/, '')));
  for (const key of new Set([...Object.keys(drawn), ...Object.keys(rest)])) {
    if (endless.some((inside) => inside(key))) continue;
    const a = drawn[key];
    const b = rest[key];
    if (!a || !b) {
      if (!ignore?.(key, 'drawn')) differences.push(`${key}: ${a ? 'drawn as mounted, not once it has appeared' : 'not drawn as mounted, drawn once it has appeared'}`);
      continue;
    }
    if (a.rect && b.rect && a.place && b.place) {
      if (!ignore?.(key, 'width') && !near(a.rect[2], b.rect[2])) differences.push(`${key} width: ${a.rect[2]} → ${b.rect[2]}`);
      if (!ignore?.(key, 'height') && !near(a.rect[3], b.rect[3])) differences.push(`${key} height: ${a.rect[3]} → ${b.rect[3]}`);
      ['x', 'y'].forEach((axis, i) => {
        if (ignore?.(key, axis) || near(a.place![i]!, b.place![i]!) || near(a.rect![i]!, b.rect![i]!)) return;
        differences.push(`${key} ${axis}: ${a.place![i]} → ${b.place![i]} in the stage (${a.rect![i]} → ${b.rect![i]} in the window)`);
      });
    } else if (!a.rect !== !b.rect && !ignore?.(key, 'painted')) differences.push(`${key}: ${a.rect ? 'paints' : 'paints nothing'} as mounted, ${b.rect ? 'paints' : 'paints nothing'} once it has appeared`);
    for (const property of new Set([...Object.keys(a.style), ...Object.keys(b.style)]))
      if (!sameStyle(property, a.style[property], b.style[property], tolerance) && !ignore?.(key, property)) differences.push(`${key} ${property}: ${a.style[property]} → ${b.style[property]}`);
  }
  const said = seen.mounted.semantics;
  for (const key of new Set([...Object.keys(said.drawn), ...Object.keys(said.rest)])) {
    if (endless.some((inside) => inside(key))) continue;
    const a = said.drawn[key] ?? {};
    const b = said.rest[key] ?? {};
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)]))
      if (a[name] !== b[name] && !ignore?.(key, name)) differences.push(`${key} [${name}]: ${a[name] ?? '(none)'} → ${b[name] ?? '(none)'}`);
  }
  // A container that holds nothing differs in every element inside it: the first ones say what it is.
  const shown = differences.length > 80 ? [...differences.slice(0, 80), `… and ${differences.length - 80} more`] : differences;
  expect(shown, 'the fixture appearing comes to rest otherwise than mountFixtures drew it (as mounted → once it has appeared)').toEqual([]);
}
