// What the docs' lists of dated and staged things say to Tanrei's timeline and to the page header's meta line
// (src/lib/dated.ts): a stage's status, the list's current item, a date in the page's language and the order of dated entries.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, test } from 'node:test';

register('./vite-shim.mjs', import.meta.url);
const { currentStage, dateParts, newestFirst, stageStatus } = await import('../src/lib/dated.ts');
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');

describe('a stage of the roadmap', () => {
  test('is done only when every one of its cells is stable', () => {
    assert.equal(stageStatus({ cells: 50, implemented: 50, stable: 50, specified: 10 }), 'done');
    assert.equal(stageStatus({ cells: 50, implemented: 50, stable: 49, specified: 10 }), 'current');
  });
  test('is under way once a spec or an implementation exists', () => {
    assert.equal(stageStatus({ cells: 50, implemented: 0, stable: 0, specified: 1 }), 'current');
    assert.equal(stageStatus({ cells: 50, implemented: 1, stable: 0, specified: 0 }), 'current');
  });
  test('is still ahead while nothing of it exists, and is never done with no cells', () => {
    assert.equal(stageStatus({ cells: 50, implemented: 0, stable: 0, specified: 0 }), 'upcoming');
    assert.equal(stageStatus({ cells: 0, implemented: 0, stable: 0, specified: 0 }), 'upcoming');
  });
  test('is the current item of its list only while it is the one stage under way', () => {
    assert.equal(currentStage(['done', 'current', 'upcoming']), 1);
    assert.equal(currentStage(['current', 'current', 'upcoming']), -1);
    assert.equal(currentStage(['done', 'done']), -1);
    assert.equal(currentStage([]), -1);
  });
  test('has its status in words in every language of the site', () => {
    for (const lang of [source, ...translations].map((language) => language.lang)) {
      const t = strings(lang);
      for (const key of ['done', 'inProgress', 'notStarted', 'published']) assert.ok(t[key]?.trim(), `${lang}: ${key}`);
    }
  });
});

describe('a date', () => {
  const date = new Date('2026-09-21T18:00:00Z');
  test('is a day for a machine, whatever time the post gives', () => {
    assert.equal(dateParts(date, 'en').datetime, '2026-09-21');
    assert.equal(dateParts(new Date('2026-09-19'), 'ja').datetime, '2026-09-19');
  });
  test('is written in the language of the page', () => {
    assert.equal(dateParts(date, 'en').text, 'September 21, 2026');
    assert.equal(dateParts(date, 'ja').text, '2026年9月21日');
    assert.equal(dateParts(date, 'es').text, '21 de septiembre de 2026');
    assert.equal(dateParts(date, 'zh-CN').text, '2026年9月21日');
    assert.match(dateParts(date, 'hi').text, /सितंबर/);
    assert.match(dateParts(date, 'ar').text, /سبتمبر/);
  });
  test("is UTC's day, not the build machine's", () => {
    assert.equal(dateParts(new Date('2026-09-21T23:30:00Z'), 'en').text, 'September 21, 2026');
    assert.equal(dateParts(new Date('2026-09-21T00:10:00Z'), 'en').text, 'September 21, 2026');
  });
});

describe('dated entries', () => {
  const entry = (id, date) => ({ id, data: { date: date && new Date(date) } });
  test('are listed newest first, a time parting two of one day', () => {
    const listed = newestFirst([entry('a', '2026-09-19'), entry('c', '2026-09-21T18:00:00Z'), entry('b', '2026-09-21'), entry('d', '2026-09-22')]);
    assert.deepEqual(listed.map((e) => e.id), ['d', 'c', 'b', 'a']);
  });
  test('keep one order for an exact tie, and an entry without a date last', () => {
    const listed = newestFirst([entry('x'), entry('a', '2026-09-21'), entry('b', '2026-09-21')]);
    assert.deepEqual(listed.map((e) => e.id), ['b', 'a', 'x']);
  });
  test('do not reorder the list they were given', () => {
    const given = [entry('a', '2026-09-19'), entry('b', '2026-09-22')];
    newestFirst(given);
    assert.deepEqual(given.map((e) => e.id), ['a', 'b']);
  });
});
