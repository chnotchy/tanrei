// The lengths a component's measure figure draws: each dimension token it reads, with the anatomy part its path names,
// the length it is (the key after the part: `height`, `padding-inline-start`, `gap`, …), the size and the variant its
// path is for, and its value in pixels in the default system. A figure draws a line for each length it can show on one
// fixture (`measureLinesOf`) and labels it with the token, so the drawing and the tokens cannot disagree: the browser
// test measures each drawn line against the value its token resolves to.
import { getSpec } from '../repo';
import { anatomyOf, webPartsOf, type PartTarget } from './anatomy';
import { below, componentTokens } from './groups';
import notDrawn from './lengths-not-drawn.json';

export interface Measure {
  /** The token, dotted (`tanrei.comp.button.container.height.large`). */
  token: string;
  /** Its custom property (`--tanrei-comp-button-container-height-large`). */
  cssVar: string;
  /** The anatomy part its path names, or null where it names none (a length of the whole component). */
  part: string | null;
  /** What length it is: the key after the part, or the path's last key that is neither a size nor a variant. */
  kind: string;
  /** The value of the spec's `size` prop its path is for, or null where it is the same at every size. */
  size: string | null;
  /** The value of the spec's `variant` prop its path is for, or null. */
  variant: string | null;
  /** The keys of its path besides the part, the kind, the size and the variant (a state's: `pressed`), in order. */
  qualifiers: string[];
  px: number;
}

const valuesOf = (name: string, prop: string): string[] => getSpec(name).props.find((p) => p.name === prop)?.values ?? [];

/** Every dimension token of a component; with `size` or `variant`, those for that value and those for every value. */
export function measuresOf(name: string, { size, variant }: { size?: string; variant?: string } = {}): Measure[] {
  const parts = new Set(anatomyOf(name).map((part) => part.id));
  const sizes = new Set(valuesOf(name, 'size'));
  const variants = new Set(valuesOf(name, 'variant'));
  return componentTokens(name)
    .filter((token) => token.type === 'dimension' && token.value?.unit === 'px')
    .map((token) => {
      const path = below(token, name);
      const tokenSize = path.find((key) => sizes.has(key)) ?? null;
      const tokenVariant = path.find((key) => variants.has(key)) ?? null;
      const rest = path.filter((key) => key !== tokenSize && key !== tokenVariant);
      const at = rest.findIndex((key) => parts.has(key));
      const part = at >= 0 ? rest[at] : null;
      const kindAt = at >= 0 && at + 1 < rest.length ? at + 1 : rest.length - 1;
      const kind = rest[kindAt] ?? '';
      const qualifiers = rest.filter((_, index) => index !== at && index !== kindAt);
      return { token: token.name, cssVar: token.cssVar, part, kind, size: tokenSize, variant: tokenVariant, qualifiers, px: token.value.value as number };
    })
    .filter((measure) => (!size || measure.size === null || measure.size === size) && (!variant || measure.variant === null || measure.variant === variant));
}

// ── The lines a measure figure draws ─────────────────────────────────────────────────────────────────────────────────

/**
 * How a line shows its length on the drawn fixture, measured from the boxes of the parts the browser draws:
 * - `block`: the part's box from its top to its bottom (`height`, and `size`, a square's side);
 * - `inline`: the part's box from its start edge to its end edge (`width`);
 * - `padding-start`, `padding-end`: from the part's start (end) edge to the nearest edge of the parts drawn inside it;
 * - `gap`: between the first two parts drawn side by side inside it.
 * The start and the end are the writing direction's: in a right-to-left stage, the start is the right edge.
 */
export type LineAxis = 'block' | 'inline' | 'padding-start' | 'padding-end' | 'gap';

/** The lengths a figure can draw, by the kind its token names (the kind less a `-with-…` or `-without-…` condition). */
const AXES: Record<string, LineAxis> = {
  height: 'block',
  size: 'block',
  width: 'inline',
  'padding-inline-start': 'padding-start',
  'padding-inline-end': 'padding-end',
  'padding-inline': 'padding-start',
  gap: 'gap',
};

/** The order of a part's lines: along the inline axis from the start edge, then across it. */
const ALONG: LineAxis[] = ['inline', 'padding-start', 'gap', 'padding-end', 'block'];

export interface MeasureLine extends Measure {
  axis: LineAxis;
  target: PartTarget;
}

/**
 * The parts a fixture fills, read from the web package's own stage of it: each slot its markup fills (`slot="icon"`), and
 * the label where it has a label (a `label` prop) or text of its own in the default slot.
 */
function filledParts(fixture: { props: Record<string, unknown> }, html: string): Set<string> {
  const filled = new Set([...html.matchAll(/\sslot="([a-z][a-z0-9-]*)"/g)].map((match) => match[1]));
  const text = html
    .replace(/<([a-z][\w-]*)[^>]*\sslot="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  if (fixture.props.label || text) filled.add('label');
  return filled;
}

/** The parts that hold a component's content, whose padding and gap a figure measures to the parts drawn in them. */
const HOLDERS = ['container', 'surface'];

/**
 * The parts a component draws where a length of a set it shares names another part as its condition, by component:
 * the part of its own, and the part of the condition it stands for. A color input's swatch stands where a text input's
 * leading icon stands (its spec's layout: the swatch at `comp.input-box.container.padding-inline-with-icon` from the
 * start edge), so the box's padding with an icon holds wherever the swatch is drawn.
 */
const IN_PLACE_OF: Record<string, Record<string, string>> = {
  'color-input': { swatch: 'icon' },
};

/** The record's entry for a component, where it has one (`lengths-not-drawn.json`, `lengthsNotDrawnOf`). */
interface NotDrawn {
  fixture: string;
  /** The parts the fixture does not draw (no box, `display: none`, not rendered in its state): their lengths are not listed. */
  parts?: string[];
  /** The lengths the component draws otherwise, in pixels, or null where the figure finds nothing to measure. */
  lengths?: Record<string, number | null>;
}
const recordOf = (name: string): NotDrawn | undefined => (notDrawn as Record<string, NotDrawn>)[name];

/** The parts a fixture does not draw, as the record says them (the browser test holds the record to what is drawn). */
export function partsNotDrawnOf(name: string, fixture: string): Set<string> {
  const record = recordOf(name);
  return new Set(record?.fixture === fixture ? (record.parts ?? []) : []);
}

/**
 * The lines a component's measure figure draws over one of its fixtures: each length of a part the web draws as a box
 * (`platforms.web.parts`) that the figure can show (`AXES`), for the fixture's size and variant, the same in every state
 * (a token of a state is not drawn), and where the token holds for the fixture — one that holds with a part the fixture
 * fills, or without one it leaves out, in place of the plain length of the same kind — and of a part the fixture draws:
 * none of a part it leaves out, nor of one the record says it does not draw in its state (`partsNotDrawnOf`). A padding
 * the same at both ends is measured at the start, or at the end where one with a part holds at the start in its place.
 * In the spec's order of parts. `html` is the web package's stage of the fixture (lib/visuals/anatomy.ts,
 * `blueprintStageOf`), which says what it fills.
 */
export function measureLinesOf(name: string, fixtureId: string, html: string): MeasureLine[] {
  const spec = getSpec(name);
  const fixture = spec.fixtures.find((candidate) => candidate.id === fixtureId);
  const parts = webPartsOf(name);
  if (!fixture || !parts) return [];
  const filled = filledParts(fixture, html);
  const optional = new Set(parts.filter((part) => part.optional).map((part) => part.id));
  const own = (part: string) => filled.has(part) || (fixture.props[part] !== undefined && fixture.props[part] !== false && fixture.props[part] !== '');
  const standsIn = Object.entries(IN_PLACE_OF[name] ?? {});
  // A part is filled where the fixture fills it, or where a part drawn in its place is drawn (one always drawn, or filled).
  const fills = (part: string) => own(part) || standsIn.some(([drawn, place]) => place === part && (!optional.has(drawn) || own(drawn)));
  const skipped = partsNotDrawnOf(name, fixtureId);
  const sizeProp = spec.props.find((prop) => prop.name === 'size');
  const variantProp = spec.props.find((prop) => prop.name === 'variant');
  const size = (fixture.props.size as string | undefined) ?? (typeof sizeProp?.default === 'string' ? sizeProp.default : undefined);
  const variant = (fixture.props.variant as string | undefined) ?? (typeof variantProp?.default === 'string' ? variantProp.default : undefined);
  const boxes = new Map(parts.filter((part) => part.target && (!part.target.aspect || part.target.aspect === 'outline')).map((part) => [part.id, part.target!]));
  const measures = measuresOf(name, { size, variant });
  const kindsOf = (part: string) => new Set(measures.filter((measure) => measure.part === part).map((measure) => measure.kind));
  const chosen = new Map<string, { measure: Measure; axis: LineAxis; conditional: boolean }>();
  /** The paddings the same at both ends (`padding-inline`), by part: the plain one, and how many with a part hold. */
  const both = new Map<string, { plain?: Measure; held: number }>();
  for (const measure of measures) {
    if (!measure.part || measure.qualifiers.length || measure.px <= 0 || !boxes.has(measure.part)) continue;
    // An optional part the fixture leaves out has no box to measure, nor has a part the fixture does not draw in its
    // state (a closed list's options, an unchecked box's mark).
    if (optional.has(measure.part) && !fills(measure.part)) continue;
    if (skipped.has(measure.part)) continue;
    const condition = /^(.+?)-(with|without)-(.+)$/.exec(measure.kind);
    const base = condition ? condition[1] : measure.kind;
    const axis = AXES[base];
    if (!axis) continue;
    // The width of a part's box, and not of the stroke it draws (a ring's, a divider's, a mark's): a width beside a
    // height of the same part, or the container's where it is no square of one size.
    if (base === 'width' && !kindsOf(measure.part).has('height') && !(measure.part === 'container' && !kindsOf(measure.part).has('size'))) continue;
    // The edge a part draws is not a box of its own to measure.
    if (boxes.get(measure.part)!.aspect === 'outline') continue;
    // A padding and a gap are of the box that holds the component's content, measured to the parts drawn in it; a gap
    // only where the fixture fills two of them (a label and an icon), so that there are two to measure between.
    if ((axis === 'padding-start' || axis === 'padding-end' || axis === 'gap') && !HOLDERS.includes(measure.part)) continue;
    if (axis === 'gap' && filled.size < 2) continue;
    if (condition && fills(condition[3]) !== (condition[2] === 'with')) continue;
    if (base === 'padding-inline') {
      const entry = both.get(measure.part) ?? { held: 0 };
      if (condition?.[2] === 'with') entry.held += 1;
      else if (!condition) entry.plain = measure;
      both.set(measure.part, entry);
    }
    // A padding with a part holds on the side the part stands on: its `<part>Position` (`leading` by default).
    if (condition?.[2] === 'with' && (axis === 'padding-start' || axis === 'padding-end') && base !== 'padding-inline') {
      const position = spec.props.find((prop) => prop.name === `${condition[3]}Position`);
      const side = (fixture.props[`${condition[3]}Position`] ?? position?.default ?? 'leading') === 'trailing' ? 'padding-end' : 'padding-start';
      if (position && side !== axis) continue;
    }
    const key = `${measure.part} ${base}`;
    const held = chosen.get(key);
    // A length that holds for this fixture's parts stands in place of the plain one.
    if (held && (held.conditional || !condition)) continue;
    chosen.set(key, { measure, axis, conditional: Boolean(condition) });
  }
  // A padding the same at both ends is measured at the start; where one with a part holds there in its place (a
  // leading icon's), the plain one is measured at the end, where no part stands — unless a part stands at the end too
  // (two with a part hold), or the part has a padding of its own at the end.
  for (const [part, { plain, held }] of both) {
    if (plain && held === 1 && chosen.get(`${part} padding-inline`)?.conditional && !chosen.has(`${part} padding-inline-end`)) {
      chosen.set(`${part} padding-inline-end`, { measure: plain, axis: 'padding-end', conditional: false });
    }
  }
  const order = new Map(parts.map((part, index) => [part.id, index]));
  return [...chosen.values()]
    .map(({ measure, axis }) => ({ ...measure, axis, target: boxes.get(measure.part!)! }))
    .sort((a, b) => order.get(a.part!)! - order.get(b.part!)! || ALONG.indexOf(a.axis) - ALONG.indexOf(b.axis));
}

// ── The lengths a figure does not draw ───────────────────────────────────────────────────────────────────────────────

/**
 * The lengths of a figure's table that the component does not draw as its token says, and what it draws instead (in
 * pixels, under the system the figure is drawn under), or `null` where the figure finds nothing to measure: the record
 * `lengths-not-drawn.json`, by component, of the fixture its figure is drawn over. The same record names the parts that
 * fixture does not draw (`partsNotDrawnOf`), whose lengths the table does not list.
 *
 * The figure finds these in the browser, measuring what the component draws (lib/visuals/blueprint.ts), and says each
 * in its table's row. The page says them before that, from this record, so that the table is laid out at its drawn size
 * before any script has run: a note written in only once the figure was drawn grew the table in the reader's view (the
 * Japanese Select's at a phone's width from 260 px to 1020 px, its lengths' column pushed wide by the note and its
 * tokens' column broken a few letters to a line). The browser test of every figure (test/browser/blueprint-pages.test.mjs)
 * holds the record to what each figure finds: a length that comes to be drawn as its token says, one that comes to be
 * drawn otherwise, or a part recorded as not drawn that comes to be drawn, fails it until the record says so.
 */
export function lengthsNotDrawnOf(name: string, fixture: string, lines: readonly Measure[]): Map<string, number | null> {
  const record = recordOf(name);
  if (!record) return new Map();
  if (record.fixture !== fixture) throw new Error(`lengths-not-drawn.json: ${name}'s lengths are recorded over the fixture ${record.fixture}, and its figure is drawn over ${fixture}`);
  const ids = new Set(anatomyOf(name).map((part) => part.id));
  const strayParts = (record.parts ?? []).filter((part) => !ids.has(part));
  if (strayParts.length) throw new Error(`lengths-not-drawn.json: ${name} has no part ${strayParts.join(', ')}`);
  const lengths = record.lengths ?? {};
  const tokens = new Set(lines.map((line) => line.token));
  const stray = Object.keys(lengths).filter((token) => !tokens.has(token));
  if (stray.length) throw new Error(`lengths-not-drawn.json: ${name}'s figure has no length ${stray.join(', ')}`);
  return new Map(Object.entries(lengths));
}
