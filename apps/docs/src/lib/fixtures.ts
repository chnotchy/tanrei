// The landing page's specimen (components/Hero.astro): a component's fixtures, as the web package's own document of
// them draws each one (lib/fixture-documents.ts) — the site has no renderer of fixtures of its own.
import { fixtureDocument } from './fixture-documents';
import type { Spec } from './repo';

type Fixture = Spec['fixtures'][number] & { direction?: 'ltr' | 'rtl' };

/** Props of a fixture that the landing page's specimen leaves out: see `specimenFixtures`. */
const NOT_IN_A_SPECIMEN = ['size', 'href', 'toggle', 'width'];

/**
 * The fixtures of a spec that the landing page's specimen draws, each as the HTML of what its stage holds in the web
 * package's document: its props as the element's own attributes, and its slots — a Button's icon is a slot.
 *
 * A specimen shows what the component looks like at rest, once: the fixtures at the default size that are no link (a
 * button of a specimen goes nowhere — a link fixture's address is a placeholder's), hold no toggle state, take the
 * default width and the page's own direction. A specimen is markup alone: a component whose document takes a step in
 * script has none, since a fixture would be drawn without what the step gives it.
 */
export function specimenFixtures(spec: Spec): string[] {
  const document = fixtureDocument(spec.name);
  if (!document || document.step) return [];
  const held = new Map(document.stages.map((stage) => [stage.id, stage.html.slice(stage.html.indexOf('>') + 1, stage.html.lastIndexOf('</div>'))]));
  return (spec.fixtures as Fixture[])
    .filter((fixture) => !NOT_IN_A_SPECIMEN.some((name) => name in fixture.props) && !fixture.direction && held.has(fixture.id))
    .map((fixture) => held.get(fixture.id)!);
}
