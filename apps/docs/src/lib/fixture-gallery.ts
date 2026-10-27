// The Specs tab's gallery of fixtures (components/fixtures/FixtureGallery.astro), read from the spec and from the web
// package's own document of its fixtures (lib/fixture-documents.ts): which fixtures stand together, and what stage each
// one is given. Nothing here runs in a browser.
//
// Every fixture gets a stage of its own, named by its id and captioned with the props that make it — the way a
// component workshop's canvas shows one story (Storybook's Canvas block), and not a row of a table, whose columns
// cannot give a drawing the room it needs at a phone's width. Every stage draws the fixture's stage of the web
// package's document — the one its tests draw every fixture in and take each baseline from — so what a reader sees is
// what every platform's baseline is compared with. There are three kinds of stage:
//
// - `inline`: the fixture is drawn in the page's own document: the document's stage, with the component's staging
//   (`staging`, scoped to the stage), at the size its baseline was taken at. So is a presented fixture whose surface
//   the document draws in place (an open menu, a select's list, a popover beside its anchor, a docked picker: the
//   element's `inline`, which draws it without placing it in the top layer, taking focus or dismissing it), and one
//   that is presented in its own place in the layout (a standard drawer or sheet, an expanded snackbar).
// - `opener`: a presented fixture whose surface stands beside its anchor in the top layer (a tooltip, a button's
//   menu), which the page's own top layer would draw over the whole site, is drawn in the page closed, and its stage
//   has an action that opens it — the real surface, on the page, as a product's opens.
// - `window`: a modal fixture (a dialog, a modal sheet or drawer, a modal picker, an image preview), every fixture
//   that is a whole page's frame (the app shell), and one whose staging sizes it by the window (a responsive drawer)
//   is drawn alone in a window of its own: an `iframe` whose document the page writes itself (`srcdoc`) from the
//   fixture's stage and the component's staging, at the size of the stage its baseline was taken of. What it puts in
//   the top layer or places against the window stays in that window, and what reads the window's width (a drawer's
//   breakpoints) reads the stage's. A window is drawn scaled down where the column is narrower than it. Nothing is
//   fetched for it, so the host's refusal to let any document be framed does not reach it.
import { fixtureDocument, stageMarkup } from './fixture-documents';
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
  /** Not drawn: the web package does not draw the component yet (it has no document of its fixtures). */
  drawn: boolean;
  kind: Kind;
  /**
   * The document's stage, as HTML (`<div class="stage" data-fixture="…">…</div>`): what the page draws in the stage, or
   * writes into its window. An opener's is closed: its element without the attribute that presents it.
   */
  html?: string;
  /** For a window stage: the window's size in CSS pixels. */
  window?: Size;
  /** For a window stage: the fixture is presented (and does not grow its window to hold its document). */
  presented?: boolean;
  /** For an opener: the attribute of its element that presents it (`open`), which the stage's action sets. */
  presence?: string;
  /** The fixture as a product writes it, for the copy action: what the document's stage holds. */
  markup?: string;
  /** For a stage drawn in the page: the room it holds before it is drawn — the size of its baseline, where it has one. */
  reserve?: Size;
}

/** Where a stage draws its fixture: in the page, in the page closed with an action that opens it, or in a window of its own. */
export type Kind = 'inline' | 'opener' | 'window';

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
 * (packages/web/test/harness.ts — `dialogWindow`, `popoverWindow`, `pickerWindow`, `drawerWindow`, `appShellWindow` and the stages its
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
      return id.startsWith('compact') ? { width: 360, height: 640 } : { width: 480, height: 480 };
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
 * The padding of the web harness's stage around a fixture, on each side, in CSS pixels: a baseline's size less twice
 * this is the room the fixture itself takes (the state matrix's cells hold it, lib/visuals/states.ts).
 */
export const HARNESS_STAGE_PADDING = 16;

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

/** Props whose value is what the spec calls presenting the component. */
const PRESENCE = ['open', 'expanded'];

/** The spec's presence prop: `open` or `expanded`, a boolean that defaults to false. */
const presenceOf = (spec: Spec): SpecProp | undefined => spec.props.find((p) => PRESENCE.includes(p.name) && p.type === 'boolean' && p.default === false);

/** Whether a fixture is presented: the spec's presence prop is true in it. */
export function presented(spec: Spec, fixture: Fixture): boolean {
  const presence = presenceOf(spec);
  return !!presence && effective(fixture, presence) === true;
}

/** The attributes of the first element of `tag` in a stage's markup, as written (`' open inline label="…"'`); nothing where it holds none. */
const openingTag = (html: string, tag: string) => new RegExp(`<${tag}((?:\\s+[^\\s=>]+(?:="[^"]*")?)*)\\s*>`).exec(html)?.[1];

/**
 * Whether the web package's document draws a presented fixture's surface in place: its element carries `inline`, the
 * attribute an anchored surface takes for tests and documentation (an open menu, a select's or a combobox's list, a
 * popover, a docked picker, a search's view), which draws it beside where it stands, without the top layer, an anchor's
 * placement, focus on opening or a light dismiss.
 */
export const drawnInPlace = (spec: Spec, html: string): boolean => /\sinline(?:=""|(?=\s|$))/.test(openingTag(html, spec.platforms.web?.name ?? '') ?? '');

/** The stage's markup with its element closed: the attribute that presents it taken away (an opener draws it so). */
export function closed(spec: Spec, html: string, attribute: string): string {
  const tag = spec.platforms.web?.name ?? '';
  const attributes = openingTag(html, tag);
  if (attributes === undefined) throw new Error(`fixture gallery: ${spec.name}'s stage holds no <${tag}> to close`);
  const without = attributes.replace(new RegExp(`\\s${attribute}(?:="[^"]*")?(?=\\s|$)`), '');
  if (without === attributes) throw new Error(`fixture gallery: ${spec.name}'s <${tag}> is presented without the attribute ${attribute}`);
  return html.replace(`<${tag}${attributes}`, `<${tag}${without}`);
}

type Presentation = 'inline' | 'opener' | 'window';
const modalVariant = (spec: Spec, fixture: Fixture): Presentation => {
  const variant = spec.props.find((p) => p.name === 'variant');
  return variant && effective(fixture, variant) === 'modal' ? 'window' : 'inline';
};

/**
 * How a presented fixture is shown where the web package's document does not draw its surface in place, by component,
 * from what its web element does when it is presented:
 *
 * - `window`: it is modal (`showModal()`: the top layer over a scrim, the rest of the window inert, focus held in it),
 *   or it reads the window (a popover's compact sheet, POP-39). In the page it would cover the site and take its focus.
 * - `opener`: its surface stands beside its anchor in the top layer (`showPopover()`). In the page every one of them
 *   would be drawn over the site at once, the site's header included; each is drawn closed, and opened by its stage's
 *   action, as a product opens it.
 * - `inline`: it is presented in its own place in the layout, as any element is (a standard drawer or sheet, an
 *   expanded snackbar, a compact table of contents' open list).
 *
 * A component that is not named here stops the build (`stageOf`): how a new one is shown is decided, not guessed.
 */
const PRESENTED: Record<string, (spec: Spec, fixture: Fixture) => Presentation> = {
  dialog: () => 'window',
  'modal-layer': () => 'window',
  'image-preview': () => 'window',
  'date-time-picker': () => 'window',
  popover: () => 'window',
  'bottom-sheet': modalVariant,
  'side-sheet': modalVariant,
  'navigation-drawer': modalVariant,
  snackbar: () => 'inline',
  'table-of-contents': () => 'inline',
  tooltip: () => 'opener',
  'button-with-menu': () => 'opener',
};

/** Where a stage draws a fixture the web package's document has: see the head of this file. */
function kindOf(spec: Spec, fixture: Fixture, html: string, document: { page: boolean; windowed: string[] }): Presentation {
  if (document.page || document.windowed.includes(fixture.id)) return 'window';
  if (!presented(spec, fixture) || drawnInPlace(spec, html)) return 'inline';
  const how = PRESENTED[spec.name];
  if (!how) throw new Error(`fixture gallery: ${spec.name}/${fixture.id} is presented and its document does not draw it in place; say in PRESENTED (lib/fixture-gallery.ts) how it is shown`);
  return how(spec, fixture);
}

/** One fixture's stage. */
export function stageOf(spec: Spec, fixture: Fixture): Stage {
  const base = { id: fixture.id, facts: factsOf(spec, fixture), holds: { items: fixture.items?.length ?? 0, slots: Object.keys(fixture.slots ?? {}) } };
  const document = fixtureDocument(spec.name);
  const stage = document?.stages.find((each) => each.id === fixture.id);
  if (!document || !stage) return { ...base, drawn: false, kind: 'inline' };
  const markup = stageMarkup(stage.html);
  const size = document.sizes[fixture.id];
  const kind = kindOf(spec, fixture, stage.html, document);
  if (kind === 'window') {
    if (document.step) throw new Error(`fixture gallery: ${spec.name}/${fixture.id} is drawn in a window, and its document takes a step in script, which no window takes`);
    return { ...base, drawn: true, kind, html: stage.html, window: size ?? windowOf(spec, fixture), presented: presented(spec, fixture), markup };
  }
  if (kind === 'opener') {
    const presence = presenceOf(spec)!.name;
    return { ...base, drawn: true, kind, html: closed(spec, stage.html, presence), presence, markup, reserve: size };
  }
  return { ...base, drawn: true, kind, html: stage.html, markup, reserve: size };
}

/** The spec's fixtures as groups of stages: by the grouping axis's values in the spec's order (then any other), or one group. */
export function galleryOf(spec: Spec): Group[] {
  const stages = (spec.fixtures as Fixture[]).map((fixture) => ({ fixture, stage: stageOf(spec, fixture) }));
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

/** The scope a stage drawn in the page stands in: its canvas, which the component's staging is scoped to. */
export const STAGE_SCOPE = 'data-fixture-scope';

/**
 * The component's staging, scoped to the stages drawn in the page: the document's rules apply to its stages and to
 * nothing else of the page (`@scope`, whose root is each stage's canvas).
 */
export const stagingStyle = (staging: string) => `<style data-fixture-staging>@scope ([${STAGE_SCOPE}]) {\n${staging}\n}</style>`;

/** JSON in a script that is data, every `<` written as an escape: see `stagesScript`. */
const dataScript = (attribute: string, value: unknown) => `<script type="application/json" ${attribute}>${JSON.stringify(value).replaceAll('<', '\\u003c')}</script>`;

/**
 * What the page's stages draw, by fixture id, as JSON in a script that is data: each is drawn — in the page, or in its
 * window — when its stage comes near the view (lib/fixture-stages.ts). Every `<` is written as an escape, so that the
 * page's content, which is rewritten as text once it is rendered (lib/markdown-content.mjs: inline code, links,
 * islands), never reads a fixture's markup as its own, and nothing in it ends the script.
 */
export function stagesScript(groups: Group[]): string {
  const drawn = Object.fromEntries(
    groups
      .flatMap((group) => group.stages)
      .filter((stage) => stage.html)
      .map((stage) => [stage.id, stage.html]),
  );
  return dataScript('data-fixture-stages', drawn);
}

/**
 * What the gallery's windows write into each document besides its stage, as data: the component's staging as the web
 * package's document has it (unscoped: in a window it is the document's own), and whether its stages are a whole
 * page's frame (they stand in a `div`, not in the document's `main`).
 */
export const windowScript = (document: { staging: string; page: boolean }) => dataScript('data-fixture-window', { staging: document.staging, page: document.page });

/**
 * The document's step in script, for the stages drawn in the page: the step's own source and the fixtures it reads,
 * as the document writes them, kept under the component's name (`docsFixtureSteps`) for the gallery's script to run on
 * each stage it draws, once the stage's element is defined.
 */
export function stepScript(component: string, step: { source: string; fixtures: string }): string {
  const name = JSON.stringify(component);
  return `<script type="module">
const after = ${step.source};
const fixtures = ${step.fixtures};
(window.docsFixtureSteps ??= {})[${name}] = (element, id) => (fixtures[id] ? after(element, fixtures[id]) : undefined);
window.dispatchEvent(new CustomEvent('docs-fixture-step', { detail: ${name} }));
</script>`;
}
