// The level of a component: a
// single part with one job, components put together for one value or one job, or several controls coordinated by state
// of the component's own. Everything here is a plain function of what it is given — no file is read — so the checks can
// be tested on a spec written in the test, and the docs site can read the same constant the tools do.

/**
 * The three levels, by what each one says. The English names are written here and in the `level` enum of
 * specs/component.schema.json, and nowhere else by hand — a test holds the two equal. Code asks for `LEVELS.single`,
 * `LEVELS.completes` and `LEVELS.coordinates`, never for a name, so that another word for a level is a substitution.
 */
export const LEVELS = Object.freeze({
  /** A single part with one job: no other component holds its value, does its job or frames it. */
  single: 'base',
  /** Components put together to complete one value or one job: at least one member, named in `builtFrom`. */
  completes: 'composed',
  /** Several controls, each with a value or an action of its own, coordinated by state the component itself holds. */
  coordinates: 'feature',
});

/** The fewest events a spec of the third level has: it reports two or more different things. */
export const FEATURE_EVENTS = 2;

/** How many things a spec reports: its own events and those of its item kinds (a row's `retry` is the component's to report). */
export const reportedEvents = (spec) => (spec.events ?? []).length + (spec.items ?? []).reduce((sum, kind) => sum + (kind.events ?? []).length, 0);

/** The first cycle of the relation that passes through `start`, as the list of names from it back to it; null where none does. */
export function builtFromCycle(start, builtFromOf) {
  const path = [];
  const done = new Set();
  const visit = (name) => {
    if (name === start && path.length) return true;
    if (done.has(name)) return false;
    done.add(name);
    path.push(name);
    for (const next of builtFromOf(name)) if (visit(next)) return true;
    path.pop();
    return false;
  };
  return visit(start) ? [...path, start] : null;
}

/** Every component a spec names: its members (`builtFrom`) and what it uses for a small part or lays out for the product (`uses`). */
export const namedComponents = (spec) => [...(spec?.builtFrom ?? []), ...(spec?.uses ?? [])];

/**
 * Every problem of the levels that a spec can be held to without reading its sentences:
 *
 *   1. a spec's level is the inventory's for that component, and the inventory gives every component one;
 *   2. a component of the first level has no `builtFrom`: no member — what it uses for a small part is in `uses`;
 *   3. a component of the second level has a `builtFrom`: it is put together from at least one member;
 *   4. a component of the second level is built from no component of the third: what holds a feature holds its several
 *      controls and is one itself;
 *   5. a component of the third level reports two or more things (its `events` and its item kinds');
 *   6. every name in `builtFrom` and in `uses` is a component of the inventory, none is the component's own, and none
 *      is in both lists;
 *   7. every component an item kind is (`items[].component`) is in one of the two lists — but the component's own name,
 *      for a component whose set form holds its own kind (an avatar group's avatars);
 *   8. the two lists together make no cycle;
 *   9. a spec that names another component's token group is built from that component.
 *
 * `specs` is `[{ file, spec }]` and `inventory` the inventory's `components`. A spec without a level is the schema's
 * to report. What is not here, because no field of a spec says it: whether a named component is a member or a small
 * part (the reviewer's), and whether a feature's state is its own.
 */
export function levelProblems(specs, inventory) {
  const problems = [];
  const names = Object.values(LEVELS);
  const listed = new Map(inventory.map((item) => [item.name, item]));
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  const namedBy = (name) => namedComponents(byName.get(name));

  for (const item of inventory) {
    if (!names.includes(item.level)) problems.push(`specs/inventory.json: "${item.name}" has no level (one of ${names.join(', ')})`);
  }
  for (const { file, spec } of specs) {
    const builtFrom = spec.builtFrom ?? [];
    const uses = spec.uses ?? [];
    const item = listed.get(spec.name);
    if (item && item.level !== spec.level) problems.push(`${file}: level is "${spec.level}", but specs/inventory.json says "${item.level}"`);

    if (spec.level === LEVELS.single && builtFrom.length) problems.push(`${file}: a single part is built from no other component, and builtFrom names ${builtFrom.join(', ')}: a component it uses for a small part goes in uses, and one that holds its value, does its job or frames it makes it "${LEVELS.completes}"`);
    if (spec.level === LEVELS.completes && !builtFrom.length) problems.push(`${file}: a component put together from others names them, and builtFrom is empty`);
    if (spec.level === LEVELS.completes) {
      for (const name of builtFrom) if (byName.get(name)?.level === LEVELS.coordinates) problems.push(`${file}: it is built from "${name}", which is of the level "${LEVELS.coordinates}": what holds several coordinated controls is of that level itself`);
    }
    if (spec.level === LEVELS.coordinates && reportedEvents(spec) < FEATURE_EVENTS) problems.push(`${file}: a component of the level "${LEVELS.coordinates}" reports ${FEATURE_EVENTS} or more different things, and it has ${reportedEvents(spec)} event(s)`);

    for (const [list, key] of [[builtFrom, 'builtFrom'], [uses, 'uses']]) {
      for (const name of list) {
        if (name === spec.name) problems.push(`${file}: ${key} names the component itself`);
        else if (!listed.has(name)) problems.push(`${file}: ${key} names "${name}", which is not in specs/inventory.json`);
      }
    }
    for (const name of builtFrom) if (uses.includes(name)) problems.push(`${file}: "${name}" is in builtFrom and in uses: a component is a member or a small part, not both`);
    for (const kind of spec.items ?? []) {
      if (kind.component && kind.component !== spec.name && !builtFrom.includes(kind.component) && !uses.includes(kind.component)) problems.push(`${file}: item kind "${kind.name}" is component "${kind.component}", which neither builtFrom nor uses lists`);
    }
    const cycle = namedComponents(spec).includes(spec.name) ? null : builtFromCycle(spec.name, namedBy);
    if (cycle) problems.push(`${file}: builtFrom and uses make a cycle: ${cycle.join(' → ')}`);

    const named = spec.tokens?.split('.')[1];
    if (named && named !== spec.name && !builtFrom.includes(named)) problems.push(`${file}: tokens names "${spec.tokens}", the group of a component that builtFrom does not list`);
  }
  return problems;
}

/**
 * The two values of `listing`, by what each one says. They are written here and in the `listing` enum of
 * specs/component.schema.json, and nowhere else by hand — a test holds the two equal. Code asks for `LISTINGS.listed`
 * and `LISTINGS.onRequest`, never for a name.
 */
export const LISTINGS = Object.freeze({
  /** Shown wherever components are listed: what a product places. */
  listed: 'default',
  /** Listed only when the reader asks for everything: a bare control most products meet inside a higher level. */
  onRequest: 'advanced',
});

/**
 * Every problem of `listing` that the specs and the inventory can be held to:
 *
 *   1. the inventory gives every component a listing, one of the two;
 *   2. a spec's listing is the inventory's for that component;
 *   3. a component that is listed only on request is of the first level: a bare control, not a composition;
 *   4. and it is a member (`builtFrom`) of at least one component that is listed by default — so that its page is
 *      always one link away from a page a reader finds in the list.
 *
 * `specs` is `[{ file, spec }]` and `inventory` the inventory's `components`. A spec without a listing is the schema's
 * to report. What is not here, because no field says it: whether products do meet the component mostly inside the
 * higher one — that is the judgement of the proposal that sets the value.
 */
export function listingProblems(specs, inventory) {
  const problems = [];
  const names = Object.values(LISTINGS);
  const listed = new Map(inventory.map((item) => [item.name, item]));
  for (const item of inventory) {
    if (!names.includes(item.listing)) problems.push(`specs/inventory.json: "${item.name}" has no listing (one of ${names.join(', ')})`);
  }
  for (const { file, spec } of specs) {
    const item = listed.get(spec.name);
    if (item && item.listing !== spec.listing) problems.push(`${file}: listing is "${spec.listing}", but specs/inventory.json says "${item.listing}"`);
    if (spec.listing !== LISTINGS.onRequest) continue;
    if (spec.level !== LEVELS.single) problems.push(`${file}: listing is "${LISTINGS.onRequest}", and the component is of the level "${spec.level}": only a component of the level "${LEVELS.single}" is left out of the default list`);
    const holders = specs.filter(({ spec: other }) => (other.builtFrom ?? []).includes(spec.name));
    if (!holders.some(({ spec: other }) => other.listing === LISTINGS.listed)) {
      problems.push(
        `${file}: listing is "${LISTINGS.onRequest}", and ${holders.length ? `every component built from it (${holders.map(({ spec: other }) => other.name).join(', ')}) is "${LISTINGS.onRequest}" too` : 'no component is built from it'}: a component left out of the default list is a member (builtFrom) of at least one that is "${LISTINGS.listed}", so that its page is one link away`,
      );
    }
  }
  return problems;
}

/** How many components the inventory holds at each listing, in the order of `LISTINGS`. */
export const listingCounts = (components) => Object.values(LISTINGS).map((listing) => ({ listing, count: components.filter((c) => c.listing === listing).length }));

/** How many components the inventory holds at each level, in the order of `LEVELS`. */
export const levelCounts = (components) => Object.values(LEVELS).map((level) => ({ level, count: components.filter((c) => c.level === level).length }));
