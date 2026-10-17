// The site's search without a browser: what `src/lib/search.mjs` makes of the search index's answers before
// `components/frame/Search.astro` gives them to Tanrei's Search, and the search's words in the six languages
// (`src/lib/i18n.ts`, `search`).
//
// The shapes under test are the index's own: a page as its `data()` returns it (`url`, `meta.title`, `excerpt`,
// `sub_results` with `title`, `url`, `excerpt` and `locations`), an excerpt as escaped text with `<mark>` elements.
//
// And what the docs do for the index before it is written (`src/lib/index-text.mjs`, and the ignore marks the docs'
// own components carry): the index reads the built pages' text, so what it must read apart is parted in the markup,
// and what is not text of the page — a live example's stage, a glyph's name — is marked as not to be read.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { answersAsTyped, countWords, exactQuestions, excerptRuns, fillWords, pageGroup, wordsOf } from '../src/lib/search.mjs';
import { indexSeparated } from '../src/lib/index-text.mjs';
import { close, indexReads } from './index-reads.mjs';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');

/** A sentence as it is read, without the isolates `fillWords` puts around each value. */
const plain = (sentence) => sentence.replace(/[⁨⁩]/g, '');

describe('an excerpt of the index as the runs a result takes (SRC-43)', () => {
  test('plain text and matches alternate, beginning with plain text', () => {
    assert.deepEqual(excerptRuns('Tokens are <mark>design</mark> decisions'), ['Tokens are ', 'design', ' decisions']);
    assert.deepEqual(excerptRuns('a <mark>b</mark> c <mark>d</mark> e'), ['a ', 'b', ' c ', 'd', ' e']);
  });
  test('a passage that begins with a match begins with an empty run, and one that ends with a match ends with it', () => {
    assert.deepEqual(excerptRuns('<mark>Button</mark> is a control'), ['', 'Button', ' is a control']);
    assert.deepEqual(excerptRuns('press the <mark>button</mark>'), ['press the ', 'button']);
  });
  test('a passage without a match is one run, and no passage is no run', () => {
    assert.deepEqual(excerptRuns('nothing marked here'), ['nothing marked here']);
    assert.deepEqual(excerptRuns(''), []);
    assert.deepEqual(excerptRuns(undefined), []);
    assert.deepEqual(excerptRuns('<mark></mark>'), []);
  });
  test('escaped text is the text it stands for, and is never markup again', () => {
    assert.deepEqual(excerptRuns('write &lt;tanrei-<mark>button</mark>&gt; &amp; &quot;label&quot; it&#39;s &#x7e;'), ['write <tanrei-', 'button', '> & "label" it\'s ~']);
    // A reference the reader does not know stays as written; an escaped `&amp;lt;` is the text `&lt;`, read once.
    assert.deepEqual(excerptRuns('&bogus; &amp;lt;'), ['&bogus; &lt;']);
  });
  test('any tag but the mark is dropped and its text kept; the marks stay matches', () => {
    assert.deepEqual(excerptRuns('<b>bold</b> <mark class="x">hit</mark> <img src=x onerror=alert(1)>tail'), ['bold ', 'hit', ' tail']);
    for (const run of excerptRuns('<script>alert(1)</script><mark>a</mark><a href="javascript:x">b</a>')) assert.doesNotMatch(run, /[<>]/);
  });
});

/** A page as the index's `data()` returns it. */
const page = {
  url: '/components/button/',
  meta: { title: 'Button' },
  excerpt: 'A <mark>button</mark> starts an action.',
  sub_results: [
    { title: 'Button', url: '/components/button/', excerpt: 'A <mark>button</mark> starts an action.', locations: [3] },
    { title: 'Overview', url: '/components/button/#overview', excerpt: 'Five variants of the <mark>button</mark>.', locations: [40, 52] },
    { title: 'Specs', url: '/components/button/#specs', excerpt: 'The <mark>button</mark> is 40 high.', locations: [90] },
    { title: 'Guidelines', url: '/components/button/#guidelines', excerpt: 'One filled <mark>button</mark> in a view; a <mark>button</mark> says what it does; no <mark>button</mark> without a label.', locations: [120, 130, 140] },
    { title: 'Accessibility', url: '/components/button/#accessibility', excerpt: 'A <mark>button</mark> has a name.', locations: [200, 210] },
  ],
};

describe('a page the index found as a result group (SRC-44)', () => {
  const group = pageGroup(page);
  test('the page is the heading, a link to it, with what matched above its first heading as its excerpt', () => {
    assert.equal(group.headline, 'Button');
    assert.equal(group.href, '/components/button/');
    assert.equal(group.value, '/components/button/');
    assert.deepEqual(group.excerpt, ['A ', 'button', ' starts an action.']);
  });
  test('its sections that matched are its results, each a link to that section; the page itself is not among them', () => {
    for (const result of group.results) {
      assert.match(result.href, /^\/components\/button\/#/);
      assert.equal(result.value, result.href);
      assert.ok(result.headline);
      assert.ok(result.excerpt.length > 1, `the result "${result.headline}" has a marked excerpt`);
    }
  });
  test('of many sections the three that matched most are shown, in the page’s order', () => {
    assert.deepEqual(group.results.map((result) => result.headline), ['Overview', 'Guidelines', 'Accessibility']);
    assert.deepEqual(pageGroup(page, { parts: 1 }).results.map((result) => result.headline), ['Guidelines']);
    assert.deepEqual(pageGroup(page, { parts: 0 }).results, []);
  });
  test('every value in a group is its own (the search tells rows apart by it)', () => {
    const twice = { ...page, sub_results: [...page.sub_results, { ...page.sub_results[1] }] };
    const values = [pageGroup(twice).value, ...pageGroup(twice, { parts: 9 }).results.map((result) => result.value)];
    assert.equal(new Set(values).size, values.length);
  });
  test('a page found only in its sections has no excerpt of its own; one with no part at all shows the page’s', () => {
    const sectionsOnly = pageGroup({ ...page, sub_results: page.sub_results.slice(1, 3) });
    assert.deepEqual(sectionsOnly.excerpt, []);
    assert.equal(sectionsOnly.results.length, 2);
    const bare = pageGroup({ url: '/status/', meta: { title: 'Status' }, excerpt: 'the <mark>matrix</mark>' });
    assert.deepEqual(bare.excerpt, ['the ', 'matrix']);
    assert.deepEqual(bare.results, []);
  });
  test('the part at the page’s own title — the page’s address with the title’s anchor — is the page’s own, not a section under it', () => {
    const anchored = pageGroup({
      url: '/foundations/design-tokens/',
      meta: { title: 'Design tokens' },
      sub_results: [
        { title: 'Design tokens', url: '/foundations/design-tokens/#_top', excerpt: 'A <mark>token</mark> is a decision.', locations: [1] },
        { title: 'Tiers', url: '/foundations/design-tokens/#tiers', excerpt: 'Three tiers of <mark>token</mark>.', locations: [9] },
      ],
    });
    assert.equal(anchored.href, '/foundations/design-tokens/');
    assert.deepEqual(anchored.excerpt, ['A ', 'token', ' is a decision.']);
    assert.deepEqual(anchored.results.map((result) => result.href), ['/foundations/design-tokens/#tiers']);
    // A section that only shares the page's name elsewhere on the site is not it.
    const other = pageGroup({ url: '/a/', meta: { title: 'Tokens' }, sub_results: [{ title: 'Tokens', url: '/b/#tokens', excerpt: 'x' }] });
    assert.equal(other.results.length, 1);
  });
  test('a page without a title is named by its address, a section without one by its page', () => {
    assert.equal(pageGroup({ url: '/x/' }).headline, '/x/');
    assert.equal(pageGroup({ url: '/x/', meta: { title: 'X' }, sub_results: [{ url: '/x/#a', excerpt: 'a' }] }).results[0].headline, 'X');
  });
});

describe('the sentences', () => {
  test('a place is filled with its value as text, isolated from the sentence’s direction; an unknown place stays', () => {
    assert.equal(fillWords('No results for “{query}”', { query: 'tokne' }), 'No results for “⁨tokne⁩”');
    assert.equal(fillWords('{count} of {total}', { count: 2 }), '⁨2⁩ of {total}');
    assert.equal(plain(fillWords('“{query}”', { query: '<b>&amp;' })), '“<b>&amp;”');
  });
  test('the count takes the form the language’s plural rule asks for', () => {
    const { results } = strings('en').search;
    assert.equal(plain(countWords(results, 1, 'tab', 'en')), '1 result for tab');
    assert.equal(plain(countWords(results, 12, 'tab', 'en')), '12 results for tab');
    const arabic = strings('ar').search.results;
    assert.equal(plain(countWords(arabic, 1, 'تبويب', 'ar')), 'نتيجة واحدة عن تبويب');
    assert.equal(plain(countWords(arabic, 2, 'تبويب', 'ar')), 'نتيجتان عن تبويب');
    assert.equal(plain(countWords(arabic, 3, 'تبويب', 'ar')), '3 نتائج عن تبويب');
    assert.equal(plain(countWords(arabic, 11, 'تبويب', 'ar')), '11 نتيجة عن تبويب');
    assert.equal(plain(countWords(arabic, 100, 'تبويب', 'ar')), '100 نتيجة عن تبويب');
    assert.equal(plain(countWords(strings('ja').search.results, 3, 'タブ', 'ja')), '「タブ」の検索結果 3 件');
    assert.equal(plain(countWords(strings('zh-CN').search.results, 3, '标签页', 'zh-CN')), '“标签页”共 3 条结果');
    assert.equal(plain(countWords(strings('es').search.results, 1, 'pestaña', 'es')), '1 resultado para pestaña');
    assert.equal(plain(countWords(strings('hi').search.results, 3, 'टैब', 'hi')), 'टैब के लिए 3 नतीजे');
  });
  test('a language tag the runtime does not know reads the general form', () => {
    assert.equal(plain(countWords({ one: 'one', other: '{count} many' }, 1, 'q', 'not a tag')), '1 many');
  });
});

describe('the search’s words in every language of the site (Tanrei ships no words)', () => {
  const languages = [source, ...translations].map(({ lang }) => lang);
  const english = strings('en').search;
  const keys = Object.keys(english);

  test('the site has six languages, and each has a dictionary of its own', () => {
    assert.deepEqual(languages, ['en', 'ja', 'zh-CN', 'hi', 'es', 'ar']);
    for (const lang of languages.slice(1)) assert.notEqual(strings(lang), strings('en'), `${lang} reads English`);
  });
  for (const lang of languages) {
    const words = strings(lang).search;
    test(`${lang}: every word is there, and none is left in English`, () => {
      assert.deepEqual(Object.keys(words), keys);
      for (const key of keys) {
        const value = words[key];
        if (key === 'results') continue;
        assert.equal(typeof value, 'string');
        assert.ok(value.trim(), `${lang}.search.${key} is empty`);
        if (lang !== 'en') assert.notEqual(value, english[key], `${lang}.search.${key} is the English word`);
      }
    });
    test(`${lang}: the count has a sentence for each plural form of the language, each with the query, and the number wherever the form is of several numbers`, () => {
      const forms = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
      // A form that only the numbers of millions take (Spanish `many`) reads the general sentence; nothing found has
      // a sentence of its own (`none`), so no result is never counted.
      const needed = forms.filter((form) => [1, 2, 3, 5, 11, 21, 100, 101, 102, 103, 111].some((count) => new Intl.PluralRules(lang).select(count) === form));
      for (const form of needed) assert.ok(words.results[form], `${lang}.search.results.${form} is missing`);
      assert.ok(words.results.other);
      for (const [form, sentence] of Object.entries(words.results)) {
        assert.match(sentence, /\{query\}/, `${lang}.search.results.${form}`);
        // "One result" and "two results" may be said in words; every other form says the number.
        if (form !== 'one' && form !== 'two') assert.match(sentence, /\{count\}/, `${lang}.search.results.${form}`);
      }
    });
    test(`${lang}: the sentence for nothing found holds the query, quoted, and no other place`, () => {
      assert.match(words.none, /\{query\}/);
      assert.match(words.none, /[“"«「]\{query\}[”"»」]/);
      for (const key of keys.filter((key) => key !== 'results' && key !== 'none')) assert.doesNotMatch(words[key], /\{\w+\}/, `${lang}.search.${key}`);
    });
  }
  test('Arabic: the field’s label is a verbal noun and its placeholder an imperative', () => {
    const { label, placeholder } = strings('ar').search;
    assert.equal(label, 'البحث في التوثيق');
    assert.equal(placeholder, 'ابحث');
  });
});

describe('the framework’s own search is not drawn', () => {
  const read = (file) => fs.readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
  test('the header draws the site’s Search, and no source of the site names the framework’s search element or the index’s interface', () => {
    const header = read('src/components/frame/Header.astro');
    assert.match(header, /import Search from '\.\/Search\.astro'/);
    assert.doesNotMatch(header, /@astrojs\/starlight\/components\/Search/);
    for (const file of ['src/styles/tanrei-theme.css', 'src/styles/frame.css', 'src/components/frame/Search.astro']) {
      assert.doesNotMatch(read(file), /site-search|starlight__search|pagefind-ui|default-ui/, file);
    }
  });
  test('every word the search element is given comes from the dictionary', () => {
    const search = read('src/components/frame/Search.astro');
    for (const attribute of ['label', 'placeholder', 'clear-label', 'back-label']) assert.match(search, new RegExp(`\\s${attribute}=\\{words\\.\\w+\\}`), attribute);
    assert.match(search, /data-words=\{JSON\.stringify\(\{ searching, results, none, noneHint, noneAction, more, unavailable \}\)\}/);
  });
});

describe('an answer for the words as they were typed', () => {
  /** A page the index found, with the words it marked. */
  const found = (...excerpts) => ({ url: '/p/', excerpt: excerpts[0], sub_results: excerpts.slice(1).map((excerpt, i) => ({ title: `s${i}`, url: `/p/#s${i}`, excerpt })) });

  test('the words of a text: runs of letters and digits, lower case, without the marks over a letter', () => {
    assert.deepEqual(wordsOf('Tanrei-Button, aria-pressed!', 'en'), ['tanrei', 'button', 'aria', 'pressed']);
    assert.deepEqual(wordsOf('{"label":"City","inputValue":"zz"}', 'en'), ['label', 'city', 'inputvalue', 'zz']);
    assert.deepEqual(wordsOf('botón Menú', 'es'), ['boton', 'menu']);
    assert.deepEqual(wordsOf('زرّ', 'ar'), ['زر']);
    assert.deepEqual(wordsOf(' … “” ', 'en'), []);
    assert.deepEqual(wordsOf(undefined, 'en'), []);
  });
  test('a language that writes no space between its words is read by its own rules', () => {
    // (A word is compared without the marks over its letters, as the index folds it: the same on both sides.)
    const fold = (word) => word.normalize('NFD').replace(/\p{M}/gu, '');
    assert.deepEqual(wordsOf('ボタンコントラスト', 'ja'), ['ボタン', 'コントラスト'].map(fold));
    // A language tag the runtime does not know leaves each run whole.
    assert.deepEqual(wordsOf('two words', 'not a tag'), ['two', 'words']);
  });
  test('a marked word that begins with a typed word is an answer for it: the word itself, a longer form, a part of a name', () => {
    assert.equal(answersAsTyped('button', [found('A <mark>button</mark> starts an action.')], 'en'), true);
    assert.equal(answersAsTyped('butt', [found('Two <mark>buttons,</mark> side by side')], 'en'), true);
    assert.equal(answersAsTyped('Button', [found('write <mark>&lt;tanrei-button</mark> variant')], 'en'), true);
    assert.equal(answersAsTyped('tanrei-button', [found('write <mark>&lt;tanrei-button</mark> variant')], 'en'), true);
    assert.equal(answersAsTyped('boton', [found('Un <mark>botón</mark> inicia una acción.')], 'es'), true);
    assert.equal(answersAsTyped('زر', [found('<mark>زرّ </mark>ممتلئ')], 'ar'), true);
    assert.equal(answersAsTyped('ボタン', [found('2 つの<mark>ボタン</mark>をつなげた')], 'ja'), true);
  });
  test('one typed word that is matched is enough: the pages hold a word that was asked for', () => {
    assert.equal(answersAsTyped('status zzqq', [found('the <mark>status</mark> text')], 'en'), true);
    assert.equal(answersAsTyped('ボタン ヌヌ', [found('<mark>ボタン</mark>グループ')], 'ja'), true);
  });
  test('a match in a section of a page counts as one in the page', () => {
    assert.equal(answersAsTyped('skeleton', [found('', 'no match here', 'a <mark>skeleton</mark> holds the place')], 'en'), true);
  });
  test('a shorter beginning of the typed word is not an answer for it: what the index gives for a word it does not have', () => {
    assert.equal(answersAsTyped('jjjjjj', [found('between <mark>j</mark> and <mark>j</mark> + 1'), found('the key <mark>"j",</mark>')], 'en'), false);
    assert.equal(answersAsTyped('carousle', [found('a speaker, a <mark>car</mark> or a pair of headphones')], 'en'), false);
    assert.equal(answersAsTyped('buttonz', [found('A <mark>button</mark> starts an action.')], 'en'), false);
    assert.equal(answersAsTyped('زرررر', [found('<mark>زر</mark> الإجراء الرئيسي')], 'ar'), false);
    // A run of one script with no word of the language in it is one word, as the index's own script takes it.
    assert.equal(answersAsTyped('ボタンヌヌ', [found('<mark>ボタン</mark>グループ')], 'ja'), false);
  });
  test('nor is another form of it: only the index can say that it is one, and is asked', () => {
    assert.equal(answersAsTyped('comboboxes', [found('A <mark>combobox</mark> is a field')], 'en'), false);
    assert.deepEqual(exactQuestions('comboboxes', 'en'), ['"comboboxes"']);
  });
  test('pages with nothing marked say nothing, and a query of signs alone asks for nothing that could be replaced', () => {
    assert.equal(answersAsTyped('button', [found('nothing marked'), { url: '/q/' }], 'en'), false);
    assert.equal(answersAsTyped('button', [], 'en'), false);
    assert.equal(answersAsTyped('…', [found('<mark>x</mark>')], 'en'), true);
  });
  test('the index is asked for each typed word alone, once, between quotation marks', () => {
    assert.deepEqual(exactQuestions('Status zzqq status', 'en'), ['"status"', '"zzqq"']);
    assert.deepEqual(exactQuestions('tanrei-button', 'en'), ['"tanrei"', '"button"']);
    assert.deepEqual(exactQuestions('ボタン コントラスト', 'ja'), wordsOf('ボタン コントラスト', 'ja').map((word) => `"${word}"`));
    assert.equal(exactQuestions('ボタン コントラスト', 'ja').length, 2);
    assert.deepEqual(exactQuestions('“”', 'en'), []);
  });
  test('the search asks so before it draws, and draws the empty state where the index has none of the words', () => {
    const search = fs.readFileSync(fileURLToPath(new URL('../src/components/frame/Search.astro', import.meta.url)), 'utf8');
    assert.match(search, /if \(!answersAsTyped\(query, first, lang\)\) \{/);
    assert.match(search, /exactQuestions\(query, lang\)\.map\(\(question\) => loaded\.search\(question\)\)/);
    assert.match(search, /if \(exact\.every\(\(answer\) => answer\.results\.length === 0\)\) left = \[\];/);
  });
});

describe('what the search index reads of a page', () => {
  const read = (file) => fs.readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');

  test('a term and its description, and the cells of a row, are parted by a space', () => {
    // The facts under a component page's head, as the build writes them: no white space between tags.
    const facts = '<dl><div><dt>Category</dt><dd>Actions</dd></div><div><dt>Level</dt><dd>Base</dd></div><div><dt>Tokens</dt><dd><code>comp.button</code></dd></div></dl>';
    // (No space before the end of a fact's `div`: the index ends a sentence there, and reads «Category Actions. Level Base.».)
    assert.equal(indexSeparated(facts), '<dl><div><dt>Category</dt> <dd>Actions</dd></div><div><dt>Level</dt> <dd>Base</dd></div><div><dt>Tokens</dt> <dd><code>comp.button</code></dd></div></dl>');
    assert.equal(indexSeparated('<dl><dt>Role</dt><dd>button</dd></dl><p>Next</p>'), '<dl><dt>Role</dt> <dd>button</dd> </dl><p>Next</p>');
    const table = '<table><thead><tr><th scope="col">Fixture</th><th scope="col">Properties</th></tr></thead><tbody><tr><td><code>filled</code></td><td>{}</td></tr></tbody></table>';
    assert.equal(indexSeparated(table), '<table><thead><tr><th scope="col">Fixture</th> <th scope="col">Properties</th> </tr></thead><tbody><tr><td><code>filled</code></td> <td>{}</td> </tr></tbody></table>');
    // Several descriptions of one term, and the panels of a set of samples.
    assert.equal(indexSeparated('<dt>Palettes</dt><dd>a</dd><dd>b</dd>'), '<dt>Palettes</dt> <dd>a</dd> <dd>b</dd>');
    assert.equal(indexSeparated('<tanrei-tab-panel value="web">a</tanrei-tab-panel><tanrei-tab-panel value="react">b</tanrei-tab-panel>'), '<tanrei-tab-panel value="web">a</tanrei-tab-panel> <tanrei-tab-panel value="react">b</tanrei-tab-panel>');
  });
  test('the text of the page then reads as words: no term is joined to its description', () => {
    // As the index reads it: the end of a `div` ends a sentence, every other tag is nothing.
    const text = (html) => indexSeparated(html).replace(/<\/div>/g, '. ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(text('<dl><div><dt>Minimum target</dt><dd>The hit area meets the minimum</dd></div><div><dt>Level</dt><dd>Base</dd></div></dl>'), 'Minimum target The hit area meets the minimum. Level Base.');
    assert.equal(text('<tr><th>الفئة</th><td>الإجراءات</td></tr>'), 'الفئة الإجراءات');
  });
  test('the index itself reads it so: joined as the build writes it, apart once it is parted', async () => {
    // Asked of the index's own program (test/index-reads.mjs), not of the model above.
    after(close);
    const facts = '<dl><div><dt>Minimum target</dt><dd>The hit area meets the minimum</dd></div><div><dt>Level</dt><dd>Base</dd></div></dl>';
    const row = '<table><tbody><tr><th scope="row">Fixture</th><td>Properties</td><td>Live</td></tr></tbody></table>';
    const [joinedFacts, joinedRow, facts2, row2] = await indexReads([facts, row, indexSeparated(facts), indexSeparated(row)]);
    assert.match(joinedFacts, /targetThe hit area/);
    assert.match(joinedFacts, /LevelBase/);
    assert.match(facts2, /Minimum target The hit area meets the minimum\. Level Base\./);
    assert.match(row2, /Fixture\.? Properties\.? Live/);
    assert.doesNotMatch(row2, /FixtureProperties|PropertiesLive/);
    assert.ok(joinedRow.length > 0);
  });
  test('what is already parted, and what is not markup, stays as written', () => {
    assert.equal(indexSeparated('<td>a</td>\n<td>b</td>'), '<td>a</td>\n<td>b</td>');
    assert.equal(indexSeparated('<td>last</td>'), '<td>last</td>');
    assert.equal(indexSeparated('<p>a</p><p>b</p><span>c</span><span>d</span>'), '<p>a</p><p>b</p><span>c</span><span>d</span>');
    const kept = '<pre><code>&lt;td&gt;a&lt;/td&gt;</code></pre><script>const row = "<td>a</td><td>b</td>";</script><style>td{}</style><textarea><td>a</td><td>b</td></textarea>';
    assert.equal(indexSeparated(kept), kept);
    assert.equal(indexSeparated(`<td>a</td><td>b</td>${kept}<th>c</th><td>d</td>`), `<td>a</td> <td>b</td> ${kept}<th>c</th> <td>d</td>`);
  });
  test('it is done to the main region of every page, which is what the index reads', () => {
    assert.match(read('src/components/frame/TwoColumnContent.astro'), /indexSeparated\(await Astro\.slots\.render\('default'\)\)/);
  });
  test('the stage of a live example is not read: what an example draws is sample text, not the page’s', () => {
    assert.match(read('src/components/DemoFrame.astro'), /<div data-part="stage"[^>]*\sdata-pagefind-ignore>/);
    assert.match(read('src/components/DemoFrame.astro'), /<div data-part="actions" data-pagefind-ignore>/);
    assert.match(read('src/components/fixtures/FixtureGallery.astro'), /<div data-part="stage"[^>]*\sdata-tanrei-demo data-pagefind-ignore>/);
    assert.match(read('src/components/fixtures/FixtureGallery.astro'), /<div data-part="actions" data-pagefind-ignore>/);
    for (const file of ['src/components/Hero.astro', 'src/components/SystemGallery.astro']) assert.match(read(file), /<div data-part="stage"[^>]*\sdata-pagefind-ignore>/, file);
  });
  test('a glyph’s name, written as text where the docs draw a glyph, is not read', () => {
    // Every element of the docs' own components and renderers that holds a glyph's name: a slotted icon, the icon helper's span, an empty state's media.
    const sources = fs
      .readdirSync(fileURLToPath(new URL('../src/', import.meta.url)), { recursive: true })
      .filter((file) => /^(components|lib)\//.test(String(file).replaceAll('\\', '/')) && /\.(astro|mjs|ts)$/.test(String(file)) && !/(^|\/)fixtures\.ts$/.test(String(file).replaceAll('\\', '/')))
      .map((file) => `src/${String(file).replaceAll('\\', '/')}`);
    // The frame's bar and drawer stand outside the main region, which is all the index reads; a heading's anchor
    // carries the mark itself, around its glyph.
    const outside = new Set(['src/components/frame/Header.astro', 'src/components/frame/Sidebar.astro', 'src/lib/markdown-content.mjs']);
    assert.match(read('src/lib/markdown-content.mjs'), /<a class="tanrei-prose-anchor"[^>]* data-pagefind-ignore><span class="tanrei-icon"/);
    let seen = 0;
    for (const file of sources) {
      if (outside.has(file)) continue;
      for (const [tag] of read(file).matchAll(/<span\b[^>]*(?:slot="(?:icon|media)"|class="tanrei-icon")[^>]*>(?=[^<\s])/g)) {
        seen += 1;
        assert.match(tag, /\sdata-pagefind-ignore\b/, `${file}: ${tag}`);
      }
    }
    assert.ok(seen >= 6, `only ${seen} glyphs were found: the test no longer reads the sources`);
  });
});
