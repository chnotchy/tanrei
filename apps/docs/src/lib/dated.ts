// What the docs' lists of staged things say to Tanrei's timeline, and what a page's head says of when it last changed
// (specs/timeline.spec.json, specs/page-header.spec.json): a stage's status, and a date in the page's language with
// its machine-readable form. Plain functions, so that Node can test them without the site
// (test/dated.test.mjs).

/** A status of a timeline's event that has one (TML-7). */
export type StageStatus = 'done' | 'current' | 'upcoming';

/** What the repository can count about one stage of the roadmap. */
export interface StageCounts {
  /** Component × platform cells of the stage. */
  cells: number;
  /** Cells that have an implementation of the current spec. */
  implemented: number;
  /** Cells that are stable. */
  stable: number;
  /** Components of the stage that have a spec. */
  specified: number;
}

/**
 * Where a stage stands: done once every one of its cells is stable, under way once anything of it exists (a spec, an
 * implementation), still ahead otherwise. A stage with no cells is never done: nothing proves it.
 */
export function stageStatus({ cells, implemented, stable, specified }: StageCounts): StageStatus {
  if (cells > 0 && stable === cells) return 'done';
  return implemented > 0 || specified > 0 ? 'current' : 'upcoming';
}

/** The item of a list of stages that is its current one: the only stage under way, or none (TML-12). */
export function currentStage(statuses: readonly StageStatus[]): number {
  const under = statuses.flatMap((status, index) => (status === 'current' ? [index] : []));
  return under.length === 1 ? under[0] : -1;
}

/**
 * When a page last changed, as the page header's meta line says it in a `<time>` element: `datetime` is the date as it
 * was given (the sitemap's value, ISO 8601 with its offset), and `text` its day, written for a reader of `lang`. The day
 * is the one the date names in its own offset, so the page and its sitemap name one day.
 */
export function updatedParts(iso: string, lang: string): { datetime: string; text: string } {
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!day || Number.isNaN(Date.parse(iso))) throw new Error(`not an ISO 8601 date: ${iso}`);
  const [, year, month, date] = day.map(Number);
  return {
    datetime: iso,
    text: new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(Date.UTC(year, month - 1, date)),
  };
}
