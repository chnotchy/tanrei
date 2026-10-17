// What a composed component takes from its members: a prop, an event or a slot that is
// a member's is written once, in the member's spec, and named in the composed spec (`from`); a fixture names the fixture
// of a member that is the same thing made by hand, one level down (`twin`); and a member's prop that the component sets
// itself, from state it coordinates, is named in `fills`. An item kind as a whole may be a member's too, and a twin's item that is another component holds that component's items
// and fills its slots. Everything here is a plain function of what it is given — no file is read — in the manner of
// `levels.js`, so each check can be tested on specs written in the test.

/** `"<component>.<name>"` → its two halves. A component's name has no dot and a prop's, an event's or a slot's has none. */
export const source = (from) => {
  const at = from.indexOf('.');
  return { component: from.slice(0, at), name: from.slice(at + 1) };
};

/** The three lists of a spec that may hold a forwarded entry, and what an entry of each is called. */
const LISTS = [
  ['props', 'prop'],
  ['events', 'event'],
  ['slots', 'slot'],
];

/** Whether a spec forwards anything: whether any entry of its three lists, or any of its item kinds, is a member's. */
export const forwards = (spec) => LISTS.some(([list]) => (spec?.[list] ?? []).some((entry) => entry.from)) || (spec?.items ?? []).some((kind) => kind.from);

/**
 * A spec with every forwarded entry written out: each `{ name, from, note? }` becomes the member's own entry — its
 * type, values, axis, default, description and words key; an event's or a slot's description and `fixture` — under the
 * name the composed spec gives it, keeping `from` (and `note`) so that what reads the result can still say where the
 * entry is from. A member's entry that is itself forwarded is followed to its end. An entry that cannot be resolved is
 * left as it is: `fromProblems` says why. An item kind that is a member's (`{ name, from, note? }` in `items`)
 * becomes the member's own kind — its summary, props, `component`, `container`, slots and events — the same way.
 *
 * `byName` is a `Map` of every spec by its name. What reads a spec's props, events or slots for what they are — the
 * cross-references of `specProblems`, the parity check, a table of props — reads the resolved spec. Two things read the
 * spec as written, on purpose: the schema, which knows the forwarded form; and the list of the product's words
 * (`words.js`), because a composed component reads no key itself — its member does. Nothing writes a resolved spec to
 * disk.
 */
export function resolveFrom(spec, byName, seen = new Set()) {
  if (!forwards(spec)) return spec;
  const resolved = { ...spec };
  for (const [list] of LISTS) {
    if (!spec[list]) continue;
    resolved[list] = spec[list].map((entry) => {
      if (!entry.from) return entry;
      const { component, name } = source(entry.from);
      const member = byName.get(component);
      if (!member || component === spec.name || seen.has(component)) return entry;
      const theirs = (resolveFrom(member, byName, new Set([...seen, spec.name]))[list] ?? []).find((e) => e.name === name);
      if (!theirs || !('description' in theirs)) return entry;
      const { from: _theirFrom, note: _theirNote, ...own } = theirs;
      return { ...own, name: entry.name, from: entry.from, ...(entry.note ? { note: entry.note } : {}) };
    });
  }
  if ((spec.items ?? []).some((kind) => kind.from)) {
    resolved.items = spec.items.map((kind) => {
      if (!kind.from) return kind;
      const { component, name } = source(kind.from);
      const member = byName.get(component);
      if (!member || component === spec.name || seen.has(component)) return kind;
      const theirs = (resolveFrom(member, byName, new Set([...seen, spec.name])).items ?? []).find((k) => k.name === name);
      if (!theirs || !('summary' in theirs)) return kind;
      const { from: _theirFrom, note: _theirNote, ...own } = theirs;
      return { ...own, name: kind.name, from: kind.from, ...(kind.note ? { note: kind.note } : {}) };
    });
  }
  return resolved;
}

/** Every spec of `specs` (`[{ file, spec }]`) resolved against the others. */
export function resolveAll(specs) {
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  return specs.map(({ file, spec }) => ({ file, spec: resolveFrom(spec, byName) }));
}

/**
 * Every problem of `from` and of `fills` that a spec can be held to without reading its sentences:
 *
 *   1. the component a forwarded entry names is a member (`builtFrom`), never one of `uses` and never the component
 *      itself;
 *   2. that member has a prop, an event or a slot of that name (in the list the entry stands in);
 *   3. no two entries of a spec are from the same source, and no name is written twice in one list;
 *   4. a forwarded entry says nothing else: `name`, `from` and at most a `note` (the schema holds this too);
 *   5. an item kind's props, events and slots are written in full: none is forwarded. A kind is forwarded whole or
 *      written whole: a kind that is a member's names a member and one of its kinds, says nothing
 *      else, and no two kinds are from one source;
 *   6. each name in `fills` is a prop of a member, and no entry forwards it: the component sets it or the product
 *      does, not both.
 *
 * `specs` is `[{ file, spec }]`.
 */
export function fromProblems(specs) {
  const problems = [];
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  const has = (component, list, name) => (resolveFrom(byName.get(component) ?? {}, byName)[list] ?? []).some((e) => e.name === name);
  for (const { file, spec } of specs) {
    const members = spec.builtFrom ?? [];
    const sources = new Set();
    for (const [list, word] of LISTS) {
      const names = new Set();
      for (const entry of spec[list] ?? []) {
        if (names.has(entry.name)) problems.push(`${file}: ${word} "${entry.name}" is written twice`);
        names.add(entry.name);
        if (!entry.from) continue;
        const { component, name } = source(entry.from);
        const extra = Object.keys(entry).filter((key) => !['name', 'from', 'note'].includes(key));
        if (extra.length) problems.push(`${file}: ${word} "${entry.name}" is from ${entry.from} and also says ${extra.join(', ')}: a forwarded ${word} is written once, in its member's spec`);
        if (component === spec.name) problems.push(`${file}: ${word} "${entry.name}" is from the component itself`);
        else if (!members.includes(component)) problems.push(`${file}: ${word} "${entry.name}" is from "${component}", which builtFrom does not list: only a member's ${word} is forwarded`);
        else if (!has(component, list, name)) problems.push(`${file}: ${word} "${entry.name}" is from ${entry.from}, and "${component}" has no ${word} "${name}"`);
        const key = `${list}:${entry.from}`;
        if (sources.has(key)) problems.push(`${file}: two ${word}s are from ${entry.from}`);
        sources.add(key);
      }
    }
    for (const kind of spec.items ?? []) {
      for (const [list, word] of LISTS) {
        for (const entry of kind[list] ?? []) if (entry.from) problems.push(`${file}: item kind "${kind.name}" ${word} "${entry.name}" is from ${entry.from}: an item kind's ${word}s are written in full`);
      }
      if (!kind.from) continue;
      const { component, name } = source(kind.from);
      const extra = Object.keys(kind).filter((key) => !['name', 'from', 'note'].includes(key));
      if (extra.length) problems.push(`${file}: item kind "${kind.name}" is from ${kind.from} and also says ${extra.join(', ')}: a forwarded kind is written once, in its member's spec`);
      if (component === spec.name) problems.push(`${file}: item kind "${kind.name}" is from the component itself`);
      else if (!members.includes(component)) problems.push(`${file}: item kind "${kind.name}" is from "${component}", which builtFrom does not list: only a member's kind is forwarded`);
      else if (!has(component, 'items', name)) problems.push(`${file}: item kind "${kind.name}" is from ${kind.from}, and "${component}" has no item kind "${name}"`);
      const key = `items:${kind.from}`;
      if (sources.has(key)) problems.push(`${file}: two item kinds are from ${kind.from}`);
      sources.add(key);
    }
    for (const filled of spec.fills ?? []) {
      const { component, name } = source(filled);
      if (!members.includes(component)) problems.push(`${file}: fills names ${filled}, and "${component}" is not a member (builtFrom)`);
      else if (!has(component, 'props', name)) problems.push(`${file}: fills names ${filled}, and "${component}" has no prop "${name}"`);
      if (sources.has(`props:${filled}`)) problems.push(`${file}: fills names ${filled}, which a prop also forwards: the component sets it itself or the product does, not both`);
    }
  }
  return problems;
}

/** Whether a composed spec has a part of its own: an anatomy part that is not named for one of its members. */
export const hasOwnParts = (spec) => (spec.anatomy ?? []).some((part) => !(spec.builtFrom ?? []).includes(part.id));

/**
 * Every problem of a fixture's `twin` that the two specs can be held to:
 *
 *   1. `twin` names a fixture of a member: `"<member>.<fixture id>"`;
 *   2. the two fixtures are drawn in the same direction;
 *   3. every prop the composed fixture sets is set to the same value in the twin — on the twin itself where the prop is
 *      from the twin's component, and on the twin's item of that member's kind where it is from another member — and
 *      the twin sets nothing more, but a prop the composed spec says it sets itself (`fills`): the component fills
 *      that one, so the product writing the same thing by hand must set it. A prop at its default counts as not set.
 *      On the twin's item of a member's kind only a prop that is a prop of that member's component counts:
 *      a prop the item kind has and the member has not — the entries a Field's fixture reads from its text
 *      input item to place the chips a product writes by hand — can never be forwarded, so no composed fixture can
 *      set it; the picture test of each platform holds it;
 *   4. where a composed spec forwards props and has no part of its own (every anatomy part is named for a member),
 *      every fixture has a twin;
 *   5. the slots a composed fixture fills are the twin's own slots where the slot is from the twin's component, and
 *      the slots of the twin's one item of that kind where it is from another member; neither side
 *      fills one more;
 *   6. where the composed spec's item kinds are a member's, the composed fixture's items are that member's items in
 *      the twin — the twin's own where the member is the twin's component, its item's where it is another — and equal;
 *   7. a member the product places on both sides is compared item by item: see `twinItemProblems`.
 *      Rule 3's "first item of a kind" does not apply to it.
 *
 * What it cannot hold is that the two are the same picture: that is the twin test of each platform, which is also
 * what holds a filled prop equal to what the component fills it with.
 */
export function twinProblems(specs) {
  const problems = [];
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  const defaultOf = (component, prop) => (byName.get(component) ? (resolveFrom(byName.get(component), byName).props ?? []).find((p) => p.name === prop)?.default : undefined);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const { file, spec: written } of specs) {
    const spec = resolveFrom(written, byName);
    const members = spec.builtFrom ?? [];
    const props = spec.props ?? [];
    const fills = new Set(spec.fills ?? []);
    for (const fixture of spec.fixtures ?? []) {
      if (!fixture.twin) {
        if (members.length && !hasOwnParts(spec) && props.some((p) => p.from)) problems.push(`${file}: fixture "${fixture.id}" has no twin, and the component has no part of its own`);
        continue;
      }
      const { component, name } = source(fixture.twin);
      const member = byName.get(component);
      const twin = (member?.fixtures ?? []).find((f) => f.id === name);
      if (!members.includes(component)) problems.push(`${file}: fixture "${fixture.id}" names the twin ${fixture.twin}, and "${component}" is not a member`);
      if (!twin) {
        problems.push(`${file}: fixture "${fixture.id}" names the twin ${fixture.twin}, which is not a fixture of "${component}"`);
        continue;
      }
      if ((fixture.direction ?? 'ltr') !== (twin.direction ?? 'ltr')) problems.push(`${file}: fixture "${fixture.id}" and its twin ${fixture.twin} are drawn in different directions`);
      // What the twin sets, by the component each value is set on: the twin's own props, and the props of each of its
      // items whose kind is another component (the first item of a kind, where the twin holds several).
      const placed = placedMembers(written, member);
      const expected = new Map([[component, { ...twin.props }]]);
      for (const item of twin.items ?? []) {
        const kind = (member.items ?? []).find((k) => k.name === item.kind);
        // A member the product places on both sides is not read from its first item: rule 7 holds each of its items.
        if (placed.has(kind?.component)) continue;
        if (kind?.component && !expected.has(kind.component)) expected.set(kind.component, { ...item.props });
      }
      for (const [key, value] of Object.entries(fixture.props ?? {})) {
        const from = props.find((p) => p.name === key)?.from;
        if (!from) continue;
        const at = source(from);
        const theirs = expected.get(at.component);
        const has = theirs && at.name in theirs ? theirs[at.name] : defaultOf(at.component, at.name);
        if (!same(has, value)) problems.push(`${file}: fixture "${fixture.id}" sets ${key} to ${JSON.stringify(value)}, and its twin ${fixture.twin} has ${at.component}.${at.name} at ${JSON.stringify(has)}`);
        if (theirs) delete theirs[at.name];
      }
      const isPropOf = (name, prop) => (byName.get(name) ? (resolveFrom(byName.get(name), byName).props ?? []).some((p) => p.name === prop) : true);
      for (const [at, left] of expected) {
        for (const [prop, value] of Object.entries(left)) {
          if (fills.has(`${at}.${prop}`)) continue;
          // What the host reads from an item to place what a product writes by hand is no prop of the member.
          if (at !== component && !isPropOf(at, prop)) continue;
          if (!same(defaultOf(at, prop), value)) problems.push(`${file}: the twin ${fixture.twin} sets ${at}.${prop} to ${JSON.stringify(value)}, and fixture "${fixture.id}" does not`);
        }
      }
      // The slots, by the component each is filled on: the twin's own, and those of each of its items that is another component.
      const kindOf = (item) => (member.items ?? []).find((k) => k.name === item.kind);
      const filled = new Map([[component, { ...(twin.slots ?? {}) }]]);
      for (const item of twin.items ?? []) if (kindOf(item)?.component && !filled.has(kindOf(item).component)) filled.set(kindOf(item).component, { ...(item.slots ?? {}) });
      for (const [slot, value] of Object.entries(fixture.slots ?? {})) {
        const from = (spec.slots ?? []).find((s) => s.name === slot)?.from;
        if (!from) continue;
        const at = source(from);
        const theirs = filled.get(at.component);
        if (!theirs || !same(theirs[at.name] ?? null, value ?? null)) problems.push(`${file}: fixture "${fixture.id}" fills ${slot} with ${JSON.stringify(value)}, and its twin ${fixture.twin} has ${at.component}.${at.name} at ${JSON.stringify(theirs?.[at.name])}`);
        if (theirs) delete theirs[at.name];
      }
      for (const [owner, left] of filled) for (const slot of Object.keys(left)) problems.push(`${file}: the twin ${fixture.twin} fills ${owner}.${slot}, and fixture "${fixture.id}" does not`);
      // The items of a member whose kinds the composed spec forwards.
      for (const owner of new Set((written.items ?? []).filter((kind) => kind.from).map((kind) => source(kind.from).component))) {
        const theirs = owner === component ? twin.items : (twin.items ?? []).find((item) => kindOf(item)?.component === owner)?.items;
        if (!same(fixture.items ?? null, theirs ?? null)) problems.push(`${file}: fixture "${fixture.id}" and its twin ${fixture.twin} do not hold the same items of "${owner}"`);
      }
    }
  }
  return [...problems, ...twinItemProblems(specs)];
}

/**
 * The members of `spec` that the product places on both sides of a twin in `member`: an item kind of
 * each is that component. A radio group's radio buttons are the product's own children, and so are the radio buttons
 * of the field group that is its twin.
 */
export function placedMembers(spec, member) {
  const mine = new Set((spec.items ?? []).map((kind) => kind.component).filter((component) => (spec.builtFrom ?? []).includes(component)));
  return new Set((member?.items ?? []).map((kind) => kind.component).filter((component) => mine.has(component)));
}

/**
 * Every problem of rule 7 of a twin. Where a composed spec has an item kind whose `component` is a member, and the spec
 * of the twin's component has an item kind of that same component, the member is *placed*: the product writes it on
 * both sides. The two fixtures are then compared item by item, in the order given:
 *
 *   a. they hold the same number of items of that component;
 *   b. every prop a composed item sets, that the twin's item kind has under the same name, is set to the same value on
 *      the twin's item at that place (a prop at its default counts as not set). A prop the twin's kind has not is what
 *      the composed component reads from the item itself — a checkbox group's `value` — and is not compared;
 *   c. the twin's item sets nothing more, but a prop of that member the composed spec says it sets itself (`fills`): a
 *      radio group fills each radio button's `selected` and gives it its group, so one level down the product writes
 *      `selected` and `name` by hand.
 *
 * `specs` is `[{ file, spec }]`, each spec as written.
 */
export function twinItemProblems(specs) {
  const problems = [];
  const byName = new Map(specs.map(({ spec }) => [spec.name, spec]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const { file, spec } of specs) {
    const fills = new Set(spec.fills ?? []);
    for (const fixture of spec.fixtures ?? []) {
      if (!fixture.twin) continue;
      const { component, name } = source(fixture.twin);
      const member = byName.get(component);
      const twin = (member?.fixtures ?? []).find((f) => f.id === name);
      if (!twin) continue; // rule 1 reports it
      for (const placed of placedMembers(spec, member)) {
        const kindsOf = (owner) => new Map((owner.items ?? []).filter((kind) => kind.component === placed).map((kind) => [kind.name, kind]));
        const [mineKinds, theirKinds] = [kindsOf(spec), kindsOf(member)];
        const mine = (fixture.items ?? []).filter((item) => mineKinds.has(item.kind));
        const theirs = (twin.items ?? []).filter((item) => theirKinds.has(item.kind));
        if (mine.length !== theirs.length) {
          problems.push(`${file}: fixture "${fixture.id}" holds ${mine.length} of "${placed}" and its twin ${fixture.twin} holds ${theirs.length}`);
          continue;
        }
        mine.forEach((item, at) => {
          const their = theirs[at];
          const declared = (prop) => theirKinds.get(their.kind).props?.find((p) => p.name === prop);
          for (const [prop, value] of Object.entries(item.props ?? {})) {
            if (!declared(prop)) continue;
            const has = prop in (their.props ?? {}) ? their.props[prop] : declared(prop).default;
            if (!same(has, value)) problems.push(`${file}: fixture "${fixture.id}" item ${at + 1} sets ${prop} to ${JSON.stringify(value)}, and its twin ${fixture.twin} has ${JSON.stringify(has)} there`);
          }
          for (const [prop, value] of Object.entries(their.props ?? {})) {
            if (prop in (item.props ?? {}) || fills.has(`${placed}.${prop}`) || same(declared(prop)?.default, value)) continue;
            problems.push(`${file}: the twin ${fixture.twin} item ${at + 1} sets ${placed}.${prop} to ${JSON.stringify(value)}, and fixture "${fixture.id}" does not`);
          }
        });
      }
    }
  }
  return problems;
}
