// The landing page's specimen (components/Hero.astro): a component's fixtures, as the web package's own document of
// them draws each one (lib/fixture-documents.ts) — the site has no renderer of fixtures of its own.
import { fixtureDocument } from './fixture-documents';
import type { Spec } from './repo';

type Fixture = Spec['fixtures'][number] & { direction?: 'ltr' | 'rtl' };

/** Props of a fixture that the landing page's specimen leaves out: see `specimenFixtures`. */
const NOT_IN_A_SPECIMEN = ['size', 'href', 'toggle', 'width'];

/** The custom property a specimen's element is given its width in (components/Hero.astro). */
export const SPECIMEN_INLINE_SIZE = '--docs-specimen-inline-size';

/**
 * What a specimen's element is given past the width its baseline gives it, in CSS pixels. A baseline is a picture of
 * the stage clipped to the whole pixels around it, drawn by the web package's harness in its own copy of the face, so
 * the width it gives is up to a pixel off the width the page draws the element at, either way (a Button labelled
 * «Create» with its icon is drawn 104.58 px wide, and its baseline gives 104; «Next» 91.33, and 92). The element holds
 * this much more, before it is defined and after, so that its box is the same length either way.
 */
const ROUNDED_AWAY = 1;

/** One fixture of a specimen: what its stage holds, and the width its element takes. */
export interface SpecimenFixture {
  /** The HTML of what the fixture's stage holds in the web package's document. */
  html: string;
  /**
   * The width the element takes, from its baseline (the room the Specs tab's gallery holds for the same stage,
   * lib/fixture-gallery.ts): the stage's width less the staging's padding on each side, and `ROUNDED_AWAY` — or, for
   * an element that takes the whole width its container gives it (`fullWidth`), the whole width of its place. Nothing
   * where the fixture has no baseline.
   */
  inlineSize?: string;
}

/** The staging's padding around every stage, in CSS pixels: the document's `.stage { padding: <n>px }`. */
function stagePadding(staging: string, name: string): number {
  const padding = staging.match(/(?:^|\n)\s*\.stage\s*\{[^}]*?\bpadding:\s*([\d.]+)px\s*;/)?.[1];
  if (padding === undefined) throw new Error(`specimen: the fixture document of ${name} gives its stage no padding of one length, from which the specimen reads its elements' widths off their baselines`);
  return Number(padding);
}

/**
 * The fixtures of a spec that the landing page's specimen draws, each as the HTML of what its stage holds in the web
 * package's document — its props as the element's own attributes, and its slots (a Button's icon is a slot) — with the
 * width its element takes.
 *
 * A specimen shows what the component looks like at rest, once: the fixtures at the default size that are no link (a
 * button of a specimen goes nowhere — a link fixture's address is a placeholder's), hold no toggle state, take the
 * default width and the page's own direction. A specimen is markup alone: a component whose document takes a step in
 * script has none, since a fixture would be drawn without what the step gives it.
 */
export function specimenFixtures(spec: Spec): SpecimenFixture[] {
  const document = fixtureDocument(spec.name);
  if (!document || document.step) return [];
  const held = new Map(document.stages.map((stage) => [stage.id, stage.html.slice(stage.html.indexOf('>') + 1, stage.html.lastIndexOf('</div>'))]));
  const fixtures = (spec.fixtures as Fixture[]).filter((fixture) => !NOT_IN_A_SPECIMEN.some((name) => name in fixture.props) && !fixture.direction && held.has(fixture.id));
  const padding = fixtures.length ? stagePadding(document.staging, spec.name) : 0;
  return fixtures.map((fixture) => {
    const size = document.sizes[fixture.id];
    const inlineSize = fixture.props.fullWidth === true ? '100%' : size ? `${size.width - 2 * padding + ROUNDED_AWAY}px` : undefined;
    return { html: held.get(fixture.id)!, ...(inlineSize ? { inlineSize } : {}) };
  });
}

/** A specimen fixture's HTML, its element given its width in `SPECIMEN_INLINE_SIZE`. */
export function specimenMarkup({ html, inlineSize }: SpecimenFixture): string {
  if (!inlineSize) return html;
  const end = html.search(/[\s>]/);
  if (!/^<[a-z]/.test(html) || end < 0) throw new Error(`specimen: a fixture's stage does not hold its element first: ${html.slice(0, 80)}`);
  return `${html.slice(0, end)} style="${SPECIMEN_INLINE_SIZE}: ${inlineSize}"${html.slice(end)}`;
}
