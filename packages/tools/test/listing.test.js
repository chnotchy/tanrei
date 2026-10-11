// `listing`: whether a component
// is shown where components are listed. What `validate` holds of it, each check on specs written here that fail it,
// and all of them on the repository as it is.
//
// Nothing here writes a value's name: a test asks the tools' constant (src/levels.js) for the value of a component
// that is listed by default and of one that is listed only on request.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileSpecSchema, validateListing } from '../src/checks.js';
import { loadSpecs, read } from '../src/conventions.js';
import { LEVELS, LISTINGS, listingCounts, listingProblems } from '../src/levels.js';
import { buildStatus, listingLine, statusFiles } from '../src/status.js';

const schema = () => JSON.parse(read('specs/component.schema.json'));

/** A spec as far as `listing` reads it. */
const spec = (name, level, listing, rest = {}) => ({ file: `specs/${name}.spec.json`, spec: { name, level, listing, ...rest } });
/** An inventory of the specs given, each at its own listing. */
const listed = (specs) => specs.map(({ spec: { name, level, listing } }) => ({ name, level, listing }));
const problemsOf = (specs, components = listed(specs)) => listingProblems(specs, components);

test('the two names are written in the schema and in one constant, and the two agree', () => {
  assert.deepEqual(Object.values(LISTINGS), schema().properties.listing.enum);
  assert.deepEqual(Object.keys(LISTINGS), ['listed', 'onRequest']);
  assert.equal(new Set(Object.values(LISTINGS)).size, 2);
  assert.ok(schema().required.includes('listing'), 'every spec has a listing');
});

test('a spec without a listing, or with one that is neither value, fails the schema', () => {
  const validate = compileSpecSchema();
  const { spec: button } = loadSpecs().find(({ spec: each }) => each.name === 'button');
  assert.equal(validate(button), true);
  const { listing: _listing, ...without } = button;
  assert.equal(validate(without), false);
  assert.ok(validate.errors.some((e) => e.params.missingProperty === 'listing'), JSON.stringify(validate.errors));
  assert.equal(validate({ ...button, listing: 'hidden' }), false);
  assert.equal(validate({ ...button, listing: true }), false);
  for (const listing of Object.values(LISTINGS)) assert.equal(validate({ ...button, listing }), true, listing);
});

test('the listing of the repository holds: every check, on every spec and the inventory', () => {
  assert.deepEqual(validateListing(), []);
});

test('a spec whose listing is not the inventory\'s is a problem, and so is an inventory row with none', () => {
  const specs = [spec('a', LEVELS.single, LISTINGS.listed)];
  assert.deepEqual(problemsOf(specs), []);
  assert.deepEqual(problemsOf(specs, [{ name: 'a', listing: LISTINGS.onRequest }]), [`specs/a.spec.json: listing is "${LISTINGS.listed}", but specs/inventory.json says "${LISTINGS.onRequest}"`]);
  assert.match(problemsOf(specs, [{ name: 'a' }]).join('\n'), /specs\/inventory\.json: "a" has no listing \(one of .+, .+\)/);
  assert.match(problemsOf(specs, [{ name: 'a', listing: 'hidden' }]).join('\n'), /specs\/inventory\.json: "a" has no listing/);
});

test('a component left out of the default list is a single part: one put together, or one that coordinates, is a problem', () => {
  const input = spec('input', LEVELS.single, LISTINGS.onRequest);
  const field = spec('field', LEVELS.completes, LISTINGS.listed, { builtFrom: ['input'] });
  assert.deepEqual(problemsOf([input, field]), []);
  // A composition left out, though a listed component is built from it.
  const outer = spec('outer', LEVELS.completes, LISTINGS.listed, { builtFrom: ['inner'] });
  assert.match(problemsOf([spec('inner', LEVELS.completes, LISTINGS.onRequest, { builtFrom: ['input'] }), outer, input, field]).join('\n'), /specs\/inner\.spec\.json: listing is ".+", and the component is of the level ".+": only a component of the level ".+" is left out of the default list/);
  const larger = spec('larger', LEVELS.coordinates, LISTINGS.listed, { builtFrom: ['whole'] });
  assert.match(problemsOf([spec('whole', LEVELS.coordinates, LISTINGS.onRequest), larger]).join('\n'), /specs\/whole\.spec\.json: listing is ".+", and the component is of the level/);
});

test('a component left out of the default list is a member of at least one that is listed: its page is one link away', () => {
  const input = spec('input', LEVELS.single, LISTINGS.onRequest);
  // No component is built from it.
  assert.match(problemsOf([input]).join('\n'), /specs\/input\.spec\.json: listing is ".+", and no component is built from it: .*a member \(builtFrom\) of at least one that is ".+"/);
  // A component that only uses it for a small part, or lays it out for the product, is not built from it.
  assert.match(problemsOf([input, spec('frame', LEVELS.single, LISTINGS.listed, { uses: ['input'] })]).join('\n'), /no component is built from it/);
  // Every component built from it is left out too — which is also a problem of its own, since only a single part is.
  const hidden = spec('hidden', LEVELS.completes, LISTINGS.onRequest, { builtFrom: ['input'] });
  assert.match(problemsOf([input, hidden]).join('\n'), /specs\/input\.spec\.json: listing is ".+", and every component built from it \(hidden\) is ".+" too/);
  // One listed component among several is enough, of the second level or of the third.
  const field = spec('field', LEVELS.completes, LISTINGS.listed, { builtFrom: ['frame', 'input'] });
  const frame = spec('frame', LEVELS.single, LISTINGS.listed);
  assert.deepEqual(problemsOf([input, field, frame]), []);
  assert.deepEqual(problemsOf([input, spec('whole', LEVELS.coordinates, LISTINGS.listed, { builtFrom: ['input'] })]), []);
  // A component that is listed is held to none of this: it may be a member of nothing.
  assert.deepEqual(problemsOf([frame]), []);
});

test('`validate` runs the check: validateListing is part of what validateSpecs returns', async () => {
  const { validateSpecs } = await import('../src/checks.js');
  assert.deepEqual(validateSpecs().filter((problem) => /listing/.test(problem)), []);
  assert.match(validateSpecs.toString(), /validateListing\(\)/);
});

test('the status matrix carries the listing: a column of the table, each row\'s value in the data, and which name is which', () => {
  const status = buildStatus();
  assert.deepEqual(status.listings, LISTINGS);
  const names = Object.values(LISTINGS);
  for (const row of status.components) assert.ok(names.includes(row.listing), row.name);
  for (const { spec: each } of loadSpecs()) assert.equal(status.components.find((r) => r.name === each.name).listing, each.listing, each.name);
  assert.equal(listingCounts(status.components).reduce((sum, { count }) => sum + count, 0), status.components.length);
  assert.equal(listingLine(status), listingCounts(status.components).map(({ listing, count }) => `${count} ${listing}`).join(' · '));
  // The file the docs site reads says the same, and the table has the column.
  const files = statusFiles();
  const written = JSON.parse(files['docs/status/status.json']);
  assert.deepEqual(written.listings, LISTINGS);
  for (const row of written.components) assert.ok(names.includes(row.listing), row.name);
  const table = files['docs/status/STATUS.md'].split('\n');
  const head = table.find((line) => line.startsWith('| Component |'));
  const cells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  assert.equal(cells(head)[2], 'Listing');
  const rows = table.slice(table.indexOf(head) + 2).filter((line) => line.startsWith('| '));
  for (const [at, row] of status.components.entries()) assert.equal(cells(rows[at])[2], row.listing, row.name);
  assert.ok(table.some((line) => line.startsWith(`Listing: ${listingLine(status)}.`)));
});
