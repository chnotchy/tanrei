// The day under a page's title as its reader sees it (src/lib/reader-day.mjs): the build writes the UTC day, and the
// page's inline script writes the day of the reader's time zone in its place. Here the script's function is given a
// time zone and a stand-in for the `<time>` element; test/browser/last-updated.test.mjs runs it in three engines.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dayText, readerDay, readerDayScript } from '../src/lib/reader-day.mjs';

/** A `<time>` as the head writes it, in a document of `lang`. */
function time(datetime, lang, sentence = 'Last updated {date}') {
  const day = dayText(datetime, lang, 'UTC');
  const attributes = new Map([['datetime', datetime], ['data-day', day]]);
  return {
    textContent: sentence.replace('{date}', day),
    getAttribute: (name) => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    closest: (selector) => (selector === '[lang]' ? { getAttribute: (name) => (name === 'lang' ? lang : null) } : null),
  };
}

// Late in the evening of 22 October in UTC: already 23 October in Tokyo, still the 22nd's morning in Los Angeles.
const EVENING = '2026-10-22T20:00:00.000Z';
// Early on 22 October in UTC: still the 21st in Los Angeles.
const MORNING = '2026-10-22T03:00:00.000Z';

describe('the day a page last changed, for its reader', () => {
  test('is the day of the reader’s time zone: one instant, two days', () => {
    const tokyo = time(EVENING, 'en');
    readerDay(tokyo, 'Asia/Tokyo');
    assert.equal(tokyo.textContent, 'Last updated October 23, 2026');
    const losAngeles = time(EVENING, 'en');
    readerDay(losAngeles, 'America/Los_Angeles');
    assert.equal(losAngeles.textContent, 'Last updated October 22, 2026');
    const before = time(MORNING, 'en');
    readerDay(before, 'America/Los_Angeles');
    assert.equal(before.textContent, 'Last updated October 21, 2026');
  });
  test('keeps the words around the day, in the page’s language', () => {
    const ja = time(EVENING, 'ja', '最終更新日：{date}');
    readerDay(ja, 'Asia/Tokyo');
    assert.equal(ja.textContent, '最終更新日：2026年10月23日');
    const es = time(EVENING, 'es', 'Actualizado el {date}');
    readerDay(es, 'Asia/Tokyo');
    assert.equal(es.textContent, 'Actualizado el 23 de octubre de 2026');
  });
  test('is written as the build writes the UTC day: the same options, in every zone and language', () => {
    for (const lang of ['en', 'ja', 'zh-CN', 'es', 'hi', 'ar']) {
      for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
        for (const iso of [EVENING, MORNING, '2026-09-30T20:00:00.000Z']) {
          const element = time(iso, lang, '{date}');
          readerDay(element, zone);
          assert.equal(element.textContent, dayText(iso, lang, zone), `${lang}, ${zone}, ${iso}`);
          assert.equal(element.getAttribute('data-day'), element.textContent);
        }
      }
    }
  });
  test('may take more or fewer characters than the UTC day (the month changes)', () => {
    const element = time('2026-09-30T20:00:00.000Z', 'en');
    readerDay(element, 'Asia/Tokyo');
    assert.equal(element.textContent, 'Last updated October 1, 2026');
  });
  test('changes nothing where the reader’s day is the UTC day, or where there is nothing to read', () => {
    const element = time(EVENING, 'en');
    const text = element.textContent;
    readerDay(element, 'Europe/London');
    assert.equal(element.textContent, text);
    readerDay(null);
    readerDay(undefined);
    const broken = time(EVENING, 'en');
    broken.setAttribute('datetime', 'yesterday');
    readerDay(broken, 'Asia/Tokyo');
    assert.equal(broken.textContent, text);
    const unnamed = time(EVENING, 'en');
    unnamed.setAttribute('data-day', '');
    readerDay(unnamed, 'Asia/Tokyo');
    assert.equal(unnamed.textContent, text);
    const unknownZone = time(EVENING, 'en');
    readerDay(unknownZone, 'Not/A_Zone');
    assert.equal(unknownZone.textContent, text);
  });
  test('the build writes the UTC day, and refuses what is no date', () => {
    assert.equal(dayText(EVENING, 'en', 'UTC'), 'October 22, 2026');
    assert.equal(dayText('2026-10-23T05:00:00+09:00', 'en', 'UTC'), 'October 22, 2026');
    assert.throws(() => dayText('yesterday', 'en', 'UTC'), /ISO 8601/);
  });
  test('the inline script is the function itself, self-contained, called on the head before it', () => {
    assert.ok(readerDayScript.startsWith(`(${readerDay})(`));
    assert.match(readerDayScript, /document\.currentScript\.previousElementSibling/);
    // It names nothing of the module it comes from.
    assert.doesNotMatch(String(readerDay), /\bdayText\b|\bDAY_FORMAT\b/);
    // And runs on its own: a script with nothing around it.
    const run = new Function('document', readerDayScript);
    const element = time(EVENING, 'en');
    const head = { querySelector: (selector) => (selector === ':scope > [data-part="meta"] > time' ? element : null) };
    run({ currentScript: { previousElementSibling: head } });
    assert.equal(element.textContent, `Last updated ${dayText(EVENING, 'en')}`);
  });
});
