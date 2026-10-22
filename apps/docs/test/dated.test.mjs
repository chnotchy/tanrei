// What the docs' lists of staged things say to Tanrei's timeline, and what the page header's meta line says of when a
// page last changed (src/lib/dated.ts): a stage's status, the list's current item, and a date in the page's language.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describe, test } from 'node:test';

register('./vite-shim.mjs', import.meta.url);
const { currentStage, stageStatus, updatedParts } = await import('../src/lib/dated.ts');
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
      for (const key of ['done', 'inProgress', 'notStarted', 'updated']) assert.ok(t[key]?.trim(), `${lang}: ${key}`);
    }
  });
});

describe('the date a page last changed', () => {
  test('is, for a machine, the date as the sitemap gives it', () => {
    assert.equal(updatedParts('2026-10-21T19:08:04+09:00', 'en').datetime, '2026-10-21T19:08:04+09:00');
    assert.equal(updatedParts('2026-10-21T00:10:00Z', 'ja').datetime, '2026-10-21T00:10:00Z');
  });
  test('is written in the language of the page', () => {
    const date = '2026-09-21T18:00:00+09:00';
    assert.equal(updatedParts(date, 'en').text, 'September 21, 2026');
    assert.equal(updatedParts(date, 'ja').text, '2026年9月21日');
    assert.equal(updatedParts(date, 'es').text, '21 de septiembre de 2026');
    assert.equal(updatedParts(date, 'zh-CN').text, '2026年9月21日');
    assert.match(updatedParts(date, 'hi').text, /सितंबर/);
    assert.match(updatedParts(date, 'ar').text, /سبتمبر/);
  });
  test('is the day the date names in its own offset, neither UTC’s nor the build machine’s', () => {
    assert.equal(updatedParts('2026-09-22T01:30:00+09:00', 'en').text, 'September 22, 2026');
    assert.equal(updatedParts('2026-09-21T23:30:00-05:00', 'en').text, 'September 21, 2026');
  });
  test('is refused when it is no date', () => {
    assert.throws(() => updatedParts('yesterday', 'en'), /ISO 8601/);
  });
});
