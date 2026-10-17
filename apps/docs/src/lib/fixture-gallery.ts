// The Specs tab's gallery of fixtures (components/fixtures/FixtureGallery.astro), read from the spec alone: which
// fixtures stand together, and what stage each one is given. Nothing here runs in a browser.
//
// Every fixture gets a stage of its own, sized to what it draws, named by its id and captioned with the props that make
// it — the way a component workshop's canvas shows one story (Storybook's Canvas block), and not a row of a table, whose
// columns cannot give a drawing the room it needs at a phone's width. There are two kinds of stage:
//
// - `inline`: the fixture is drawn in the page's own document, on a stage as wide as the fixture. A fixture that is as
//   wide as its layout (the renderer gives it the width of the web harness's stage) takes that width as its stage's
//   starting width, fills the stage, and can be made narrower or wider with the stage's handle.
// - `window`: a presented fixture (a modal dialog, an open menu, a docked picker, a tooltip) is drawn presented, alone,
//   in a window of its own — an `iframe` of the fixture's document (src/pages/fixtures/[component].astro), which draws
//   it from the web package's own document of it, at the size of the stage its baseline was taken of. What it puts in
//   the top layer or places against the window stays in that window, and what reads the window's width (a drawer's
//   breakpoints) reads the stage's. A window is drawn scaled down where the column is narrower than it. Every fixture
//   of a spec this site's own renderer cannot draw is drawn the same way.
import fs from 'node:fs';
import path from 'node:path';
import { fixtureDocument, stageMarkup } from './fixture-documents';
import { drawsFixture, liveFixture } from './fixtures';
import type { Spec, SpecProp } from './repo';

type Fixture = Spec['fixtures'][number] & { slots?: Record<string, string | string[]>; direction?: 'ltr' | 'rtl' };
type Value = string | boolean | number | null | undefined;

export interface Size {
  width: number;
  height: number;
}

export interface Stage {
  id: string;
  /** The fixture's props as the caption shows them, in the spec's order of props: `variant: filled`. */
  facts: string[];
  /** What the fixture holds besides its props: items, slots, content — counted, for the caption. */
  holds: { items: number; slots: string[] };
  /** Not drawn here: the fixture gives what the installed web build does not read, or the renderer does not know its markup. */
  drawn: boolean;
  kind: 'inline' | 'window';
  /** For an inline stage: the element's HTML, its width rewritten to fill the stage where the stage takes it. */
  html?: string;
  /** For an inline stage that is as wide as its layout: the CSS width the stage starts at. */
  width?: string;
  /** For a window stage: the window's size in CSS pixels. */
  window?: Size;
  /** The fixture as a product writes it, for the copy action. */
  markup?: string;
  /** Presentation, as `liveFixture` decides it: what the page's tests leave out. */
  presentation?: string;
  /** A step in script the stage takes once defined (`data-fixture-files`), so it is not compared with a copy of its markup. */
  staged?: boolean;
  /**
   * For an inline stage: the room its fixture is held before it is drawn — the size of what the web package's baseline
   * of it shows inside its stage's padding — where it has a baseline.
   */
  reserve?: Size;
}

export interface Group {
  /** The axis the stages are grouped by and this group's value of it, where the spec has an axis that tells its fixtures apart. */
  axis?: { name: string; value: string };
  stages: Stage[];
}

const effective = (fixture: Fixture, prop: SpecProp): Value => (prop.name in fixture.props ? fixture.props[prop.name] : prop.default);
const isAxis = (prop: SpecProp) => Boolean((prop as SpecProp & { axis?: string }).axis);

/**
 * The prop the stages are grouped by: the first of the spec's props that selects a token axis (`variant`, then `size`,
 * as the spec orders them) and that tells at least two of its fixtures apart. None where no axis does.
 */
export function groupingAxis(spec: Spec): SpecProp | undefined {
  return spec.props.filter(isAxis).find((prop) => new Set(spec.fixtures.map((f) => String(effective(f as Fixture, prop)))).size > 1);
}

/**
 * The window a presented fixture is drawn alone in: the window the web package's harness draws it in
 * (packages/web/test/harness.ts — `dialogWindow`, `pickerWindow`, `drawerWindow`, `appShellWindow` and the stages its
 * staging gives the rest), so that what a reader sees is what each platform's baseline holds. A component whose harness
 * stage is not a window takes a window that holds its stage.
 */
export function windowOf(spec: Spec, fixture: Fixture): Size {
  const id = fixture.id;
  const p = fixture.props;
  switch (spec.name) {
    case 'dialog':
      return id.startsWith('compact') ? { width: 360, height: 640 } : { width: 640, height: 640 };
    case 'modal-layer':
    case 'image-preview':
      return { width: 640, height: 640 };
    case 'date-time-picker':
      return p.layout === 'horizontal' ? { width: 800, height: 640 } : { width: 480, height: 720 };
    case 'bottom-sheet':
      return { width: 400, height: 720 };
    case 'side-sheet':
      return { width: 720, height: 480 };
    case 'navigation-drawer':
      return { width: ({ 'responsive-wide': 1280, 'responsive-medium': 800, 'responsive-narrow': 400 } as Record<string, number>)[id] ?? 480, height: ['site-sidebar-long', 'site-sidebar-restored'].includes(id) ? 800 : 640 };
    case 'app-shell':
      return id === 'compact-narrowest' ? { width: 320, height: 640 } : id.startsWith('expanded') ? { width: 1280, height: 800 } : id.startsWith('medium') ? { width: 800, height: 800 } : { width: 400, height: 800 };
    case 'tooltip':
      return { width: 320, height: 200 };
    case 'popover':
      return { width: 480, height: 480 };
    case 'fab-menu':
      return { width: 352, height: 352 };
    case 'snackbar':
      return { width: 432, height: 272 };
    case 'search':
      return p.presentation === 'dialog' ? { width: 720, height: 480 } : { width: 360, height: id === 'docked' ? 320 : 480 };
    case 'button-with-menu':
      return { width: 360, height: 400 };
    case 'select':
    case 'select-field':
    case 'combobox':
    case 'combobox-field':
      return { width: 312, height: 472 };
    default:
      return { width: 480, height: 480 };
  }
}

/**
 * The width an inline fixture's element is given by the renderer (the first `inline-size` of its own `style`): the
 * width of the harness's stage, which stands for a layout. The stage takes it, and the element fills the stage.
 */
function layoutWidth(html: string): { width: string; html: string } | undefined {
  const end = html.indexOf('>');
  const head = html.slice(0, end);
  const found = /\sstyle="([^"]*)"/.exec(head);
  const width = found && /(?:^|;\s*)inline-size:\s*([^;]+)/.exec(found[1]);
  if (!found || !width) return undefined;
  const style = found[1].replace(width[0], `${width[0].startsWith(';') ? '; ' : ''}inline-size: 100%`);
  return { width: width[1].trim(), html: `${head.replace(found[0], ` style="${style}"`)}${html.slice(end)}` };
}

/** The padding of the web harness's stage around a fixture, on each side, in CSS pixels. */
const HARNESS_STAGE_PADDING = 16;

/**
 * The room a fixture is drawn in, read from its baseline in the web package (packages/web/snapshots/<spec>/<id>.png:
 * a picture of the harness's stage at a device pixel ratio of 2), less the stage's padding. The site is built from the
 * docs' folder, so the folder of baselines is found from there. Nothing where the fixture has no baseline.
 */
function reserveOf(spec: string, id: string): Size | undefined {
  const file = path.resolve(process.cwd(), '../../packages/web/snapshots', spec, `${id}.png`);
  if (!fs.existsSync(file)) return undefined;
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, header, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  // A PNG's first chunk is IHDR: its width and height are the two big-endian words after the signature and its head.
  if (header.toString('ascii', 12, 16) !== 'IHDR') return undefined;
  const less = (pixels: number) => Math.max(0, Math.round(pixels / 2) - 2 * HARNESS_STAGE_PADDING);
  return { width: less(header.readUInt32BE(16)), height: less(header.readUInt32BE(20)) };
}

/** A prop's value as the caption shows it: a long text is cut after its first words (the copied markup holds all of it). */
const LONGEST = 40;
const shown = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > LONGEST ? `${text.slice(0, LONGEST).trimEnd()}…` : text;
};

/** The props of a fixture in the spec's order of props, and any the spec does not list after them. */
function factsOf(spec: Spec, fixture: Fixture): string[] {
  const order = spec.props.map((p) => p.name);
  return Object.entries(fixture.props)
    .sort(([a], [b]) => (order.indexOf(a) + 1 || order.length + 1) - (order.indexOf(b) + 1 || order.length + 1))
    .map(([name, value]) => `${name}: ${shown(value)}`)
    .concat(fixture.direction ? [`direction: ${fixture.direction}`] : []);
}

/** One fixture's stage. `live` says whether the page can draw the spec's fixtures at all (`drawsLive`, a defined element). */
export function stageOf(spec: Spec, fixture: Fixture, live: boolean): Stage {
  const base = { id: fixture.id, facts: factsOf(spec, fixture), holds: { items: fixture.items?.length ?? 0, slots: Object.keys(fixture.slots ?? {}) } };
  // A window draws the fixture from the web package's own document of it (lib/fixture-documents.ts), at the size of the
  // stage its baseline was taken of — or of the window the harness draws it in, where it has no baseline yet.
  const document = fixtureDocument(spec.name);
  const harnessStage = document?.stages.find((stage) => stage.id === fixture.id);
  const window = (): Size => document?.sizes[fixture.id] ?? windowOf(spec, fixture);
  // A spec whose fixtures this site's own renderer cannot draw (lib/fixtures.ts: a class on the product's own
  // elements, items that are native elements or nest two deep, a frame of a whole window) is drawn by the harness,
  // each fixture alone in a window of its own stage's size.
  if (!live) return harnessStage ? { ...base, drawn: true, kind: 'window', window: window(), markup: stageMarkup(harnessStage.html), presentation: 'none' } : { ...base, drawn: false, kind: 'inline' };
  if (!drawsFixture(spec, fixture)) return { ...base, drawn: false, kind: 'inline' };
  const lf = liveFixture(spec, fixture);
  if (lf.presentation !== 'none') return { ...base, drawn: true, kind: 'window', window: window(), markup: harnessStage ? stageMarkup(harnessStage.html) : liveFixture(spec, fixture, { window: true }).markup, presentation: lf.presentation };
  const sized = layoutWidth(lf.html);
  return { ...base, drawn: true, kind: 'inline', html: sized?.html ?? lf.html, width: sized?.width, markup: lf.markup, presentation: lf.presentation, staged: lf.html.includes(' data-fixture-files='), reserve: reserveOf(spec.name, fixture.id) };
}

/** The spec's fixtures as groups of stages: by the grouping axis's values in the spec's order (then any other), or one group. */
export function galleryOf(spec: Spec, live: boolean): Group[] {
  const stages = (spec.fixtures as Fixture[]).map((fixture) => ({ fixture, stage: stageOf(spec, fixture, live) }));
  const axis = groupingAxis(spec);
  if (!axis) return [{ stages: stages.map(({ stage }) => stage) }];
  const values = [...(axis.values ?? [])];
  for (const { fixture } of stages) {
    const value = String(effective(fixture, axis));
    if (!values.includes(value)) values.push(value);
  }
  return values
    .map((value) => ({ axis: { name: axis.name, value }, stages: stages.filter(({ fixture }) => String(effective(fixture, axis)) === value).map(({ stage }) => stage) }))
    .filter((group) => group.stages.length > 0);
}

/** The address of the document a window draws: one fixture of a component, alone. */
export const fixtureWindowHref = (component: string, id: string) => `/fixtures/${component}/?${new URLSearchParams({ id })}`;
