// The product's words: `setWords()` and `missingWords()` of `@tanrei/web`, and the lookup
// every element makes — its own prop, else the set of its nearest `lang`, else the document's, else nothing. The
// subject is a field around a slider (its requirement tag is the plainest word a component draws); the components'
// own tests hold what each one draws without words.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, missingWords, mountFixtures, setWords, rootTokens } from '../../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..');
const repo = path.resolve(src, '../../..');
const spec = loadSpec('field');
type P = Page;

const field = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Volume', required: true, ...props }, items: [{ kind: 'slider', props: { value: 40 } }], ...extra });
const mount = (page: P, fixtures: Fixture[]) => mountFixtures(page, spec, { icons: true, fixtures });
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > tanrei-field`);
/** What the field draws as its requirement: the tag's text, else the asterisk, else nothing. */
const drawn = (page: P, id: string) =>
  host(page, id).evaluate(async (el) => {
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    const row = el.shadowRoot!.querySelector('.label-row')!;
    const tag = row.querySelector('.requirement-tag');
    if (tag && getComputedStyle(tag).display !== 'none') return tag.getAttribute('label');
    const asterisk = row.querySelector('.asterisk');
    return asterisk && getComputedStyle(asterisk).display !== 'none' ? '*' : '';
  });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** Gives `stage` (a fixture's own box) a `lang`, as a product writes it on a part of its page. */
const lang = (page: P, id: string, tag: string) => page.locator(`[data-fixture="${id}"]`).evaluate((el, t) => el.setAttribute('lang', t), tag);

test.describe('the product’s words', () => {
  test('nothing is given: the element draws its mark without words, missingWords() names the key, and the debug build reports it once per key and page, naming the prop', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('one'), field('two'), field('optional', { required: false, optional: true })]);
    expect(await drawn(page, 'one')).toBe('*');
    expect(await drawn(page, 'two')).toBe('*');
    expect(await drawn(page, 'optional')).toBe('');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    // Two fields lack the same word: one report, which names the attribute, the key and where to give it.
    const reports = seen.filter((line) => line.includes('the product\'s words have no'));
    expect(reports).toHaveLength(2);
    const required = reports.find((line) => line.includes('requiredText'))!;
    expect(required).toContain('<tanrei-field>');
    expect(required).toContain('required-text is empty');
    expect(required).toContain('setWords()');
    expect(reports.find((line) => line.includes('optionalText'))).toContain('optional-text is empty');
  });

  test('setWords() without lang is the document’s set: connected elements draw the words at once, a second call merges key by key, and a key given as the empty string is taken away', async ({ page }) => {
    await mount(page, [field('required'), field('optional', { required: false, optional: true })]);
    await setWords(page, { requiredText: 'Mandatory' });
    expect(await drawn(page, 'required')).toBe('Mandatory');
    expect(await drawn(page, 'optional')).toBe('');
    // A second call merges: the first key stands.
    await setWords(page, { optionalText: 'If you like' });
    expect(await drawn(page, 'required')).toBe('Mandatory');
    expect(await drawn(page, 'optional')).toBe('If you like');
    // The control is told too (FLD-11): the optional word is part of its description.
    expect(await host(page, 'optional').evaluate((el) => el.querySelector('tanrei-slider')!.shadowRoot!.querySelector('[role="slider"]')!.getAttribute('aria-description'))).toBe('If you like');
    // A changed word replaces; an empty one takes the key away.
    await setWords(page, { requiredText: 'Needed', optionalText: '' });
    expect(await drawn(page, 'required')).toBe('Needed');
    expect(await drawn(page, 'optional')).toBe('');
    // An element connected after the words were given reads them too.
    await page.evaluate(() => {
      const added = document.createElement('tanrei-field');
      added.id = 'late';
      added.setAttribute('label', 'Late');
      added.setAttribute('required', '');
      document.body.append(added);
    });
    expect(await page.locator('#late').evaluate(async (el) => (await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete, el.shadowRoot!.querySelector('.requirement-tag')?.getAttribute('label')))).toBe('Needed');
  });

  test('an instance’s own prop always wins over the product’s words, and is read first', async ({ page }) => {
    await mount(page, [field('own', { requiredText: 'This one' }), field('plain')]);
    await setWords(page, { requiredText: 'Required' });
    await setWords(page, { requiredText: '必須' }, { lang: 'en' });
    expect(await drawn(page, 'own')).toBe('This one');
    expect(await drawn(page, 'plain')).toBe('必須');
    // The prop is taken away: the product's words stand in; it comes back: it wins again.
    await host(page, 'own').evaluate((el) => ((el as HTMLElement & { requiredText: string }).requiredText = ''));
    expect(await drawn(page, 'own')).toBe('必須');
    await host(page, 'own').evaluate((el) => el.setAttribute('required-text', 'Again'));
    expect(await drawn(page, 'own')).toBe('Again');
  });

  test('setWords() with lang is the set of the elements whose nearest lang attribute is that language — a region’s tag reads its language’s set, through shadow roots — and a key that set lacks is the document’s', async ({ page }) => {
    await mount(page, [field('document'), field('japanese'), field('region'), field('nested'), field('french'), field('optional', { required: false, optional: true }), field('shadow')]);
    await lang(page, 'japanese', 'ja');
    await lang(page, 'region', 'ja-JP');
    await lang(page, 'french', 'fr');
    await lang(page, 'optional', 'ja');
    // The nearest `lang` decides: a French part of a Japanese part is French.
    await page.locator('[data-fixture="nested"]').evaluate((el) => {
      el.setAttribute('lang', 'ja');
      const inner = document.createElement('div');
      inner.lang = 'fr';
      inner.append(...el.childNodes);
      el.append(inner);
    });
    // Through a shadow root: the field stands in the shadow tree of an element under lang="ja".
    await page.locator('[data-fixture="shadow"]').evaluate((el) => {
      el.setAttribute('lang', 'ja');
      const outer = document.createElement('div');
      const moved = el.firstElementChild!;
      el.append(outer);
      outer.attachShadow({ mode: 'open' }).append(moved);
    });
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    await setWords(page, { requiredText: '必須' }, { lang: 'ja' });
    expect(await drawn(page, 'document'), 'the document (lang="en") has no set of its own').toBe('Required');
    expect(await drawn(page, 'japanese')).toBe('必須');
    expect(await drawn(page, 'region'), 'ja-JP reads the set given for ja').toBe('必須');
    expect(await drawn(page, 'french'), 'no set for fr: the document’s').toBe('Required');
    expect(await page.locator('[data-fixture="nested"] tanrei-field').evaluate((el) => el.shadowRoot!.querySelector('.requirement-tag')?.getAttribute('label')), 'the nearest lang is fr').toBe('Required');
    expect(await page.locator('[data-fixture="shadow"] > div').evaluate((el) => el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('.requirement-tag')?.getAttribute('label')), 'through the shadow root').toBe('必須');
    // Key by key: the Japanese set has no optionalText, so the document's is read.
    expect(await drawn(page, 'optional')).toBe('Optional');
    // A set for the region is nearer than the language's.
    await setWords(page, { requiredText: '必須項目' }, { lang: 'ja-JP' });
    expect(await drawn(page, 'region')).toBe('必須項目');
    expect(await drawn(page, 'japanese')).toBe('必須');
    // The tag is matched whatever its case.
    await setWords(page, { requiredText: 'Obligatoire' }, { lang: 'FR' });
    expect(await drawn(page, 'french')).toBe('Obligatoire');
  });

  test('missingWords() lists what was needed and given by nobody, in alphabetical order; a key given later leaves the list, and a word an instance gave was never missing', async ({ page }) => {
    await mount(page, [field('required'), field('optional', { required: false, optional: true }), field('own', { requiredText: 'Required' }), field('none', { required: false, optional: false }), field('asterisk', { requiredMark: 'asterisk' })]);
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    await setWords(page, { requiredText: 'Required' });
    expect(await drawn(page, 'required')).toBe('Required');
    expect(await missingWords(page)).toEqual(['optionalText']);
    await setWords(page, { optionalText: 'Optional' });
    expect(await drawn(page, 'optional')).toBe('Optional');
    expect(await missingWords(page)).toEqual([]);
    // Taken away again while an element still needs it: missing again.
    await setWords(page, { requiredText: '' });
    expect(await drawn(page, 'required')).toBe('*');
    expect(await missingWords(page)).toEqual(['requiredText']);
  });

  // A product that draws a part of its page again
  // removes fields whose update has not run yet. Out of the page such a field is no longer under the `lang` its words
  // were given for; what it finds there says nothing about the page.
  test('an element taken out of the page with an update pending records nothing as missing — its words were given for a lang it no longer stands under — and a word that is really missing is recorded once the element stands in the page again', async ({ page }) => {
    const seen = warnings(page);
    const reports = () => seen.filter((line) => line.includes('the product\'s words have no'));
    await mount(page, [field('studio', { required: false, optional: false })]);
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' }, { lang: 'en-x-studio' });
    await lang(page, 'studio', 'en-x-studio');
    // A field frame (the field) and a field that reports by itself (the text field), both under the lang.
    await page.locator('[data-fixture="studio"]').evaluate(async (stage) => {
      const text = document.createElement('tanrei-text-field') as HTMLElement & { label: string; required: boolean; updateComplete: Promise<unknown> };
      text.label = 'Name';
      text.required = true;
      stage.append(text);
      const field = stage.querySelector('tanrei-field') as HTMLElement & { required: boolean; updateComplete: Promise<unknown> };
      field.required = true;
      await Promise.all([field.updateComplete, text.updateComplete]);
    });
    expect(await drawn(page, 'studio')).toBe('Required');
    expect(await missingWords(page), 'while the fields stand under their lang').toEqual([]);

    // A property set and the element removed in the same task: the update runs out of the page.
    const removed = await page.locator('[data-fixture="studio"]').evaluate(async (stage) => {
      type Field = HTMLElement & { label: string; required: boolean; optional: boolean; updateComplete: Promise<unknown> };
      const fields = [...stage.querySelectorAll<Field>('tanrei-field, tanrei-text-field')];
      for (const each of fields) {
        each.label = 'Changed';
        each.remove();
      }
      await Promise.all(fields.map((each) => each.updateComplete));
      // The same with the other word, asked for the first time out of the page.
      for (const each of fields) (each.required = false), (each.optional = true);
      await Promise.all(fields.map((each) => each.updateComplete));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      (globalThis as unknown as { removedFields: Field[] }).removedFields = fields;
      return fields.map((each) => each.isConnected);
    });
    expect(removed).toEqual([false, false]);
    expect(await missingWords(page), 'an element that is not in the page records nothing').toEqual([]);
    expect(reports()).toEqual([]);

    // Put back where its words are: nothing is missing, and the words are drawn.
    await page.locator('[data-fixture="studio"]').evaluate(async (stage) => {
      const fields = (globalThis as unknown as { removedFields: (HTMLElement & { updateComplete: Promise<unknown> })[] }).removedFields;
      stage.append(...fields);
      await Promise.all(fields.map((each) => each.updateComplete));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    expect(await drawn(page, 'studio')).toBe('Optional');
    expect(await missingWords(page), 'back under its lang').toEqual([]);

    // Put where nobody gave the words, with nothing of its own changed: what is really missing is recorded and
    // reported, by the element that stands in the page.
    await page.evaluate(async () => {
      const fields = (globalThis as unknown as { removedFields: (HTMLElement & { updateComplete: Promise<unknown> })[] }).removedFields;
      for (const each of fields) each.remove();
      await Promise.all(fields.map((each) => each.updateComplete));
      const elsewhere = document.createElement('div');
      elsewhere.lang = 'fr';
      document.body.append(elsewhere);
      elsewhere.append(...fields);
      await Promise.all(fields.map((each) => each.updateComplete));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    });
    expect(await missingWords(page), 'connected where no set answers').toEqual(['optionalText']);
    expect(reports()).toHaveLength(1);
  });

  test('a word that is not needed is not missing: a field that draws the asterisk by its own prop, or by the design system’s answer, asks for no required word', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('asterisk', { requiredMark: 'asterisk' }), field('none', { requiredMark: 'none' }), field('unasked', { required: false, optional: false })]);
    expect(await drawn(page, 'asterisk')).toBe('*');
    expect(await missingWords(page)).toEqual([]);
    // The system's own mark is the asterisk: a field that does not say (`auto`) needs no word either.
    await rootTokens(page, { '--tanrei-comp-field-requirement-mark': 'asterisk' });
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.dataset.fixture = 'auto';
      stage.innerHTML = '<tanrei-field label="Volume" required><tanrei-slider value="40"></tanrei-slider></tanrei-field>';
      document.body.append(stage);
    });
    expect(await drawn(page, 'auto')).toBe('*');
    expect(await missingWords(page)).toEqual([]);
    expect(seen.filter((line) => line.includes('the product\'s words have no'))).toEqual([]);
  });

  test('a key that is not one of the product’s words is ignored and reported; a value that is not text is no word', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('required')]);
    await setWords(page, { requiredTxt: 'Required' });
    expect(seen.some((line) => line.includes('"requiredTxt" is not a key'))).toBe(true);
    expect(await drawn(page, 'required')).toBe('*');
    await setWords(page, { requiredText: '   ' });
    expect(await drawn(page, 'required'), 'white space is no word').toBe('*');
  });

  test('setWords() reads a word with places against the places of its key in a debug build: a mistyped place is reported with the places the key has, and the word is kept as it was given', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('required')]);
    const about = (key: string) => seen.filter((line) => line.startsWith('[tanrei] setWords():') && line.includes(`${key} `));
    await setWords(page, { movedText: '{label}: {position} of {count}', imageCountText: '{count}枚中{position}枚目', entryRemoveLabel: 'Remove {entry}', entryAddedText: 'Added', entriesAddedText: '{{{count}}} {{added}}' });
    expect(seen.filter((line) => line.startsWith('[tanrei] setWords():')), 'sentences that fit, a place left out and doubled braces: nothing').toEqual([]);
    await setWords(page, { movedText: '{label}: {place} of {count}' });
    expect(about('movedText')).toHaveLength(1);
    expect(about('movedText')[0]).toContain('movedText holds {place}, which is not a place of it ({label}, {position}, {count})');
    expect(about('movedText')[0]).toContain('it is used as it is written');
    // Given again in another language's set: the same fault of the same key is said once on a page.
    await setWords(page, { movedText: '{label}: {place} of {count}' }, { lang: 'ja' });
    expect(about('movedText')).toHaveLength(1);
    // The word was given: it is kept, and it is not missing.
    expect(await missingWords(page)).not.toContain('movedText');
  });

  test('setWords() reports a brace that opens or closes nothing in a word with places, each fault of one sentence in one warning', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('required')]);
    await setWords(page, { imageCountText: '{position} of {count} }' });
    await setWords(page, { entryRemovedText: '{entri} { removed' });
    const reports = seen.filter((line) => line.startsWith('[tanrei] setWords():'));
    expect(reports).toHaveLength(2);
    expect(reports[0]).toContain('imageCountText holds a brace that opens or closes nothing');
    expect(reports[1]).toContain('entryRemovedText holds {entri}, which is not a place of it ({entry})');
    expect(reports[1]).toContain('a brace that opens or closes nothing');
  });

  test('setWords() reports a word without the place its key needs — the name of an entry’s remove action without {entry} — and no place that may be left out', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('required')]);
    await setWords(page, { entryRemoveLabel: 'Remove', entryRemovedText: 'Removed', movedText: 'Moved' });
    const reports = seen.filter((line) => line.startsWith('[tanrei] setWords():'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toContain('entryRemoveLabel is without the place {entry}, which it needs');
    // A doubled brace is not the place.
    await setWords(page, { entryRemoveLabel: 'Remove {{entry}}' });
    expect(seen.filter((line) => line.startsWith('[tanrei] setWords():'))).toHaveLength(1);
    await setWords(page, { entryRemoveLabel: 'Remove {entry}' });
    expect(seen.filter((line) => line.startsWith('[tanrei] setWords():'))).toHaveLength(1);
  });

  test('a key without places is not read for braces: its word is a whole string, and whatever stands in it is plain text', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [field('required')]);
    await setWords(page, { requiredText: 'Required {count} { }} {place}', closeLabel: '{', copyLabel: '{entry}' });
    expect(seen.filter((line) => line.startsWith('[tanrei] setWords():'))).toEqual([]);
    expect(await drawn(page, 'required')).toBe('Required {count} { }} {place}');
  });

  test('a changed set tells the elements once and nothing else: no attribute or style of the document is written, every element is rendered once, and a call that changes nothing renders nothing', async ({ page }) => {
    await mount(page, [field('one'), field('two'), field('three')]);
    await page.evaluate(() => {
      const w = window as unknown as { __written: string[]; __renders: number };
      w.__written = [];
      w.__renders = 0;
      // What is written outside the elements that read words: the document's root, its body and the stages.
      new MutationObserver((records) => {
        for (const record of records) if (!(record.target as Element).closest?.('tanrei-field')) w.__written.push(`${(record.target as Element).localName}.${record.attributeName ?? record.type}`);
      }).observe(document.documentElement, { attributes: true, childList: true, subtree: true });
      for (const el of document.querySelectorAll('tanrei-field')) {
        const element = el as HTMLElement & { requestUpdate: (...args: unknown[]) => void };
        const request = element.requestUpdate.bind(element);
        // A request without a property is one somebody made of the element (a property's own carries its name).
        element.requestUpdate = (...args: unknown[]) => {
          if (args.length === 0) w.__renders++;
          return request(...args);
        };
      }
    });
    const counts = () => page.evaluate(() => ({ written: (window as unknown as { __written: string[] }).__written.filter((name) => name !== 'head.childList' && name !== 'body.childList'), renders: (window as unknown as { __renders: number }).__renders }));
    await setWords(page, { requiredText: 'Required' });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await drawn(page, 'three')).toBe('Required');
    expect(await counts()).toEqual({ written: [], renders: 3 });
    // The same words again: nothing is told.
    await setWords(page, { requiredText: 'Required' });
    expect((await counts()).renders).toBe(3);
    // An element that left the page is not told.
    await host(page, 'three').evaluate((el) => el.remove());
    await setWords(page, { requiredText: 'Needed' });
    expect((await counts()).renders).toBe(5);
  });

  test('at rest the words cost nothing: after a set was given and drawn, no frame is asked for', async ({ page }) => {
    await mount(page, [field('one'), field('optional', { required: false, optional: true })]);
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    await setWords(page, { requiredText: '必須' }, { lang: 'ja' });
    expect(await drawn(page, 'one')).toBe('Required');
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number };
      w.__frames = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => (w.__frames++, raf(callback));
    });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as unknown as { __frames: number }).__frames)).toBe(0);
  });
});

test.describe('Tanrei ships no words', () => {
  /** Every source file of the package that is not a test, a generated list of keys or the sample data of a test page. */
  const sources = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(full);
      return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [full] : [];
    });
  /** The code of a file: its comments (where the old words may be told as examples to a developer) are not what a person reads. */
  const code = (file: string) =>
    fs
      .readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s\/\/ .*$/gm, '');
  /**
   * Words a component could fall back to: the labels of ten specs, the six titles of the picker, the messages of a missing value and
   * the period names — every one that is not also what a key event calls a key (`End`), which the test below it holds.
   */
  const OLD_WORDS = [
    'Required', 'Optional', 'No matches', 'Increase', 'Decrease', 'Resize', 'Empty', 'Start date', 'End date', 'Previous month', 'Next month', 'Choose a year', 'Today', 'Date', 'Start', 'OK', 'Cancel',
    'Hour', 'Minute', 'Wheels', 'Dial', 'Time input', 'Period', 'Range', 'next day', 'End must be after start', 'Select date', 'Select time', 'Select date and time', 'Select dates', 'Select times', 'Select dates and times',
    'Please fill out this field.', 'Please select an item in the list.', 'Please select one of these options.', 'AM', 'PM', 'AM/PM',
  ];
  /**
   * The names the keyboard shortcut spelled its keys with and the word that joined two chords (KBS-11) — every one that
   * is not also a legend a key carries (`Backspace`, `Caps Lock`) or the notation of `aria-keyshortcuts` (`Escape`, `Plus`).
   */
  const KEY_NAMES = ['Command', 'Option', 'Return', 'Forward Delete', 'Up Arrow', 'Down Arrow', 'Left Arrow', 'Right Arrow', 'Page Up', 'Page Down', 'Comma', 'Slash', 'Backslash', 'Semicolon', 'Quote', 'Left Bracket', 'Right Bracket', 'Minus', 'Equals', 'Backtick', ', then '];

  test('no source file of the package holds one of the defaults the specs lost, a title of the picker, a message for a missing value, a period name or a spoken name of a key', () => {
    const found: string[] = [];
    for (const file of sources(src)) {
      const text = code(file);
      // As a string a person would read: the whole literal, in any quote.
      for (const word of [...OLD_WORDS, ...KEY_NAMES]) for (const quote of ["'", '"', '`']) if (text.includes(`${quote}${word}${quote}`)) found.push(`${path.relative(src, file)}: ${quote}${word}${quote}`);
    }
    expect(found).toEqual([]);
  });

  test('no element gives a text prop a default: every field whose name ends in Label or Text starts empty', () => {
    const found: string[] = [];
    for (const file of sources(path.join(src, 'components'))) {
      for (const match of code(file).matchAll(/^ {2}(\w+(?:Label|Text)) = (['"`])(.+)\2;$/gm)) found.push(`${path.relative(src, file)}: ${match[1]} = ${match[3]}`);
    }
    expect(found).toEqual([]);
  });

  test('every key of the product’s words is one a spec declares, and the package lists them nowhere by hand', () => {
    const status = JSON.parse(fs.readFileSync(path.join(repo, 'docs/status/words.json'), 'utf8')) as { keys?: { key: string }[] } | { key: string }[];
    const generated = fs.readFileSync(path.join(src, 'generated/words.ts'), 'utf8');
    const keys = [...generated.matchAll(/^ {2}(\w+)\?: string;$/gm)].map((match) => match[1]);
    expect(keys.length).toBeGreaterThan(0);
    const listed = (Array.isArray(status) ? status : (status.keys ?? [])).map((entry) => entry.key);
    if (listed.length) expect(listed.sort()).toEqual([...keys].sort());
    // The primitive reads the generated list and names no key itself.
    const primitive = code(path.join(src, 'primitives/words.ts'));
    for (const key of keys) expect(primitive.includes(`'${key}'`), key).toBe(false);
  });
});
