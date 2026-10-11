// What the docs' lists of dated and staged things say to Tanrei's timeline and to the page header's meta line
// (specs/timeline.spec.json, specs/page-header.spec.json): a stage's status, a date in the page's language with its
// machine-readable form, and the order of dated entries. Plain functions, so that Node can test them without the site
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

/** A date as a `<time>` element says it: `datetime` for a machine, `text` for a reader of `lang`. The day is UTC's. */
export function dateParts(date: Date, lang: string): { datetime: string; text: string } {
  return {
    datetime: date.toISOString().slice(0, 10),
    text: new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date),
  };
}

/**
 * Dated entries, newest first. Two entries of one day carry a time in their date; the id only makes the order of an
 * exact tie deterministic. An entry without a date comes last.
 */
export function newestFirst<T extends { id: string; data: { date?: Date } }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0) || b.id.localeCompare(a.id));
}
