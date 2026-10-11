// The places of the product's words: how a word with places is read, and what `validate`
// holds of the places a spec declares. Plain functions of what they are given (no file is read), in the manner of
// `levels.js`. `readPlaces` is the one algorithm every platform's filling function follows; the web's is
// packages/web/src/primitives/places.ts, and its tests hold the same sentences as packages/tools/test/places.test.js.

const NAME = /^[a-z][a-zA-Z0-9]*$/;

/**
 * A word with places, read once from left to right.
 *
 *   1. `{{` or `}}`                       one literal brace
 *   2. otherwise `{`, and the next brace  the text between them is a place where it is one of `names`; otherwise it
 *      after it is `}`                    is unknown, and is kept as written with its braces
 *   3. any other `{` or `}`               a brace that opens or closes nothing: kept as written
 *
 * The first rule that fits where the reading stands is taken, so `{{count}}` is the text `{count}`, `{count}}}` is
 * the place and one brace, and `{a{count}` is a brace that opens nothing, `a` and the place.
 *
 * Returns the runs in order — `{ text }` for the product's own text, `{ place }` for a place to fill — with what a
 * debug build reports: `unknown` (each text between braces that names no place, once) and `stray` (how many braces
 * open or close nothing). `used` is the set of places the sentence has.
 */
export function readPlaces(sentence, names) {
  const runs = [];
  const unknown = [];
  let stray = 0;
  const used = new Set();
  const text = (piece) => {
    if (!piece) return;
    const last = runs.at(-1);
    if (last && last.text !== undefined) last.text += piece;
    else runs.push({ text: piece });
  };
  for (let at = 0; at < sentence.length; ) {
    const c = sentence[at];
    if (c !== '{' && c !== '}') {
      const next = sentence.slice(at).search(/[{}]/);
      const end = next < 0 ? sentence.length : at + next;
      text(sentence.slice(at, end));
      at = end;
    } else if (sentence[at + 1] === c) {
      text(c);
      at += 2;
    } else if (c === '}') {
      text(c);
      stray += 1;
      at += 1;
    } else {
      const close = sentence.slice(at + 1).search(/[{}]/);
      if (close < 0 || sentence[at + 1 + close] !== '}') {
        // No brace follows, or another opening brace comes first: this one opens nothing.
        text(c);
        stray += 1;
        at += 1;
        continue;
      }
      const name = sentence.slice(at + 1, at + 1 + close);
      if (names.includes(name)) {
        runs.push({ place: name });
        used.add(name);
      } else {
        const written = `{${name}}`;
        text(written);
        if (!unknown.includes(written)) unknown.push(written);
      }
      at += close + 2;
    }
  }
  return { runs, unknown, stray, used };
}

/** The sentence with its places filled from `values` (each already a string): what a test compares with. */
export const fillPlaces = (sentence, values) =>
  readPlaces(sentence, Object.keys(values))
    .runs.map((run) => (run.place === undefined ? run.text : values[run.place]))
    .join('');

/**
 * What `validate` holds of the places of the product's words. `specs` is every spec as written
 * (`{ file, spec }`); forwarded entries (`from`) are skipped, because they take the member's places with everything
 * else (packages/tools/src/from.js).
 *
 *   P1  only a string prop has places
 *   P2  a prop's places have distinct names; `required` is written only where it is true
 *   P3  the prop's description writes each declared place as `{name}`, and writes no other name between braces; a
 *       prop that declares no places writes none in its description
 *   P4  every value a fixture gives the prop — on the component or on an item of the kind — reads without an unknown
 *       place and without a stray brace, and has each place that is `required`
 *   P5  a behaviour's text that writes `{name}` writes only names some prop of the spec declares
 *   P6  props that read one key of the product's words declare the same places (names, kinds, `required`): the
 *       product writes one sentence for the key
 *   P7  one name has one kind in every spec
 */
export function placesProblems(specs) {
  const problems = [];
  const byKey = new Map();
  const kindOf = new Map();
  const shape = (places) => JSON.stringify((places ?? []).map((p) => [p.name, p.kind, p.required === true]).sort());
  for (const { file, spec } of specs) {
    const declared = new Set();
    const owners = [
      { props: spec.props ?? [], label: 'prop', values: (name) => (spec.fixtures ?? []).map((f) => [f.id, f.props?.[name]]) },
      ...(spec.items ?? [])
        .filter((kind) => !kind.from)
        .map((kind) => ({ props: kind.props ?? [], label: `item "${kind.name}" prop`, values: (name) => (spec.fixtures ?? []).flatMap((f) => itemsOf(f.items, kind.name).map((item) => [f.id, item.props?.[name]])) })),
    ];
    for (const { props, label, values } of owners) {
      for (const prop of props) {
        if (prop.from) continue;
        if (prop.words) {
          const seen = byKey.get(prop.words);
          if (seen && seen.shape !== shape(prop.places)) problems.push(`${file}: ${label} "${prop.name}" reads the key "${prop.words}" with other places than ${seen.where} (P6)`);
          else if (!seen) byKey.set(prop.words, { shape: shape(prop.places), where: `${spec.name}.${prop.name}` });
        }
        if (prop.places === undefined) {
          const written = (prop.description ?? '').match(/\{[a-z][a-zA-Z0-9]*\}/);
          if (written) problems.push(`${file}: ${label} "${prop.name}": its description writes ${written[0]} and the prop declares no places (P3)`);
          continue;
        }
        if (prop.type !== 'string') problems.push(`${file}: ${label} "${prop.name}" has places but is not a string (P1)`);
        const names = prop.places.map((p) => p.name);
        for (const p of prop.places) {
          declared.add(p.name);
          if (!NAME.test(p.name)) problems.push(`${file}: ${label} "${prop.name}": "${p.name}" is not a place's name (P2)`);
          if (names.filter((n) => n === p.name).length > 1) problems.push(`${file}: ${label} "${prop.name}" declares the place "${p.name}" twice (P2)`);
          if (p.required === false) problems.push(`${file}: ${label} "${prop.name}": \`required\` is written only where it is true (P2)`);
          const known = kindOf.get(p.name);
          if (known && known.kind !== p.kind) problems.push(`${file}: ${label} "${prop.name}": the place "${p.name}" is a ${p.kind} here and a ${known.kind} in ${known.where} (P7)`);
          else if (!known) kindOf.set(p.name, { kind: p.kind, where: `${spec.name}.${prop.name}` });
        }
        const said = readPlaces(sample(prop.description), names);
        for (const name of names) if (!said.used.has(name)) problems.push(`${file}: ${label} "${prop.name}": its description does not write the place {${name}} (P3)`);
        for (const written of said.unknown) if (NAME.test(written.slice(1, -1))) problems.push(`${file}: ${label} "${prop.name}": its description writes ${written}, which it does not declare (P3)`);
        for (const [id, value] of values(prop.name)) {
          if (typeof value !== 'string' || value === '') continue;
          const read = readPlaces(value, names);
          for (const written of read.unknown) problems.push(`${file}: fixture "${id}": ${prop.name} writes ${written}, which is not a place of it (${names.map((n) => `{${n}}`).join(', ')}) (P4)`);
          if (read.stray) problems.push(`${file}: fixture "${id}": ${prop.name} has a brace that opens or closes nothing; a brace is written twice (P4)`);
          for (const p of prop.places) if (p.required && !read.used.has(p.name)) problems.push(`${file}: fixture "${id}": ${prop.name} is without the place {${p.name}}, which it needs (P4)`);
        }
      }
    }
    for (const sentence of spec.behavior ?? []) {
      for (const [written, name] of (sentence.text ?? '').matchAll(/\{([a-z][a-zA-Z0-9]*)\}/g)) {
        if (!declared.has(name)) problems.push(`${file}: ${sentence.id} writes ${written}, which no prop of the spec declares as a place (P5)`);
      }
    }
  }
  return [...new Set(problems)];
}

// A description quotes whole example sentences; only the names between braces matter to P3.
const sample = (description) => (description ?? '').replace(/[^{}a-zA-Z0-9]/g, ' ');

function itemsOf(items, kind) {
  return (items ?? []).flatMap((item) => [...(item.kind === kind ? [item] : []), ...itemsOf(item.items, kind)]);
}
