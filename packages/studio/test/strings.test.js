// The Studio's dictionaries (src/strings/): every language has exactly the keys of English, of the same kinds. The
// type of a language's file says so to the type checker (`pnpm typecheck` — `Dictionary`, src/strings/shape.ts); this
// is the same statement at run time, where an `any` or a cast cannot hide a hole — and what a type cannot say: no
// word is empty, a `{place}` of English is a place of every language, a sentence that takes a value says it, and a
// language whose file is still English is neither spoken nor offered. All six registered languages are translated.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { transformWithOxc } from 'vite';

// The modules are TypeScript that import each other; Node 22 does not read it. Each is transformed and loaded from a
// data: URL, its relative imports replaced by the URLs of the modules they name (the same URL each time: one module).
const dir = new URL('../src/strings/', import.meta.url);
const loaded = new Map();
async function moduleUrl(name) {
  if (!loaded.has(name)) {
    const file = new URL(`${name}.ts`, dir);
    let { code } = await transformWithOxc(fs.readFileSync(file, 'utf8'), file.pathname, { lang: 'ts' });
    const imports = new Map([...code.matchAll(/from\s+['"]\.\/([\w-]+)['"]/g)].map((match) => [match[0], match[1]]));
    for (const [whole, dependency] of imports) code = code.replaceAll(whole, `from ${JSON.stringify(await moduleUrl(dependency))}`);
    loaded.set(name, `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  }
  return loaded.get(name);
}
const { LANGUAGES, offeredLanguages, studioDirection, studioLanguage, studioStrings } = await import(await moduleUrl('index'));

const tags = Object.keys(LANGUAGES);
const english = LANGUAGES.en.strings;
const translated = tags.filter((tag) => LANGUAGES[tag].translated);
const untranslated = tags.filter((tag) => !LANGUAGES[tag].translated);

/** Every path to a leaf, with the leaf's kind: `rail.help.size:string`, `typefaces.names.brand:array(2)`, `tokens.count:function(1)`. */
const shape = (value, prefix = '') =>
  Array.isArray(value)
    ? [`${prefix}:array(${value.length})`]
    : typeof value === 'function'
      ? [`${prefix}:function(${value.length})`]
      : value && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, inner]) => shape(inner, prefix ? `${prefix}.${key}` : key))
        : [`${prefix}:${typeof value}`];
/** `[path, leaf]` for every string, and every string of a pair; `[path, function]` for every sentence. */
const leaves = (value, prefix = '') =>
  typeof value === 'string' || typeof value === 'function' ? [[prefix, value]] : Object.entries(value).flatMap(([key, inner]) => leaves(inner, prefix ? `${prefix}.${key}` : key));
const places = (text) => (text.match(/\{[a-z]+\}/g) ?? []).sort();
/**
 * What a sentence is asked for. One about a count is asked for the numbers a plural rule tells apart (the default);
 * one about names, values or other pieces of text is asked for those — every key whose function does not take one
 * number is listed here, and a function English gains without a line here fails the test below.
 */
const COUNTS = [0, 1, 2, 3, 5, 11, 21, 100, 101].map((count) => [count]);
const ASKED = {
  labelled: [['Reset', 'primary'], ['writes', '{"scale":1.5}']],
  withCount: [['Show more', 0], ['Show more', 1], ['Show more', 12], ['Show more', 417]],
  named: [['primary', 'value'], ['Brand', 'families, in order']],
  listed: [['changed', 'inherited'], ['sys.shape.corner.small', 'every corner']],
  sentences: [['Declared by this layer.', 'Remove the declaration']],
  'color.seedOf': [['primary'], ['brand-red']],
  'color.addedPalette': [['correct'], ['brand-red']],
  'tones.toneOf': [['primary', 0], ['primary', 40], ['brand-red', 100]],
  'tones.added': [['primary', 0], ['primary', 40], ['brand-red', 100]],
  'fonts.added': [['Inter'], ['IBM Plex Sans']],
  'fonts.missing': [['Inter'], ['IBM Plex Sans']],
  'shape.baseSays': [['0'], ['0.6']],
  'behavior.baseSays': [['ripple'], ['ring']],
  'add.fromSource': [['large'], ['large × 1.5']],
  'add.added': [['tanrei.comp.button.size.3x'], ['acme.comp.rating.star.size']],
  'rules.help': [['$1', '$2']],
  'a11y.text': [['≥ 4.5:1'], ['≥ 7:1']],
  'a11y.nonText': [['≥ 3:1']],
  'export.downloaded': [['acme.system.json']],
  'export.put': [['design/acme.system.json']],
  'rail.hueChroma': [['0', '0'], ['265', '16']],
  'rail.size': [['1', '4px'], ['0.85', '4.25px']],
  'rail.lock': [['Brand color'], ['Gray']],
  'exporting.depend': [['M3-like (Material 3-inspired)']],
  'start.open': [['Tanrei'], ['m3-like']],
  'start.exampleNote': [['M3-like (Material 3-inspired)']],
  'start.confirm': [['cupertino']],
  'start.confirmFile': [['acme.system.json']],
  'start.started': [['m3-like']],
  'start.imported': [['acme.system.json']],
  'start.importedProblems': [['acme.system.json', 0], ['acme.system.json', 1], ['acme.system.json', 2], ['acme.system.json', 12]],
  'start.refused': [['acme.system.json']],
  'exporting.dependHelp': [['M3-like (Material 3-inspired)'], ['Cupertino (Apple HIG-inspired)']],
  'exporting.everyHelp': [['M3-like (Material 3-inspired)']],
  'exporting.held': [['fab-menu', 'M3-like (Material 3-inspired)'], ['fab-menu · carousel', 'Cupertino']],
  'exporting.downloadFile': [['acme.system.json'], ['acme.css']],
  'exporting.cssHelp': [['Tanrei'], ['M3-like (Material 3-inspired)']],
  'exporting.cssNone': [['Tanrei']],
  'exporting.init': [['design/acme.system.json']],
  'exporting.saved': [['acme.system.json']],
  'shared.title': [['Acme', 'Cupertino (Apple HIG-inspired)'], ['acme', 'Tanrei']],
  'shared.body': [['Acme'], ['acme-app']],
};

test('the registry lists six languages, all six are translated, and a switch offers each under its own name', () => {
  assert.deepEqual(tags, ['en', 'ja', 'zh-CN', 'hi', 'es', 'ar']);
  assert.deepEqual(translated, tags, 'every registered language has a dictionary of its own');
  assert.deepEqual(untranslated, []);
  // What the standalone app's language select lists (app/main.ts): the tag it stores, and the name in that language.
  assert.deepEqual(offeredLanguages(), [
    { tag: 'en', name: 'English' },
    { tag: 'ja', name: '日本語' },
    { tag: 'zh-CN', name: '简体中文' },
    { tag: 'hi', name: 'हिन्दी' },
    { tag: 'es', name: 'Español' },
    { tag: 'ar', name: 'العربية' },
  ]);
  assert.equal(LANGUAGES.ar.dir, 'rtl');
  for (const tag of tags.filter((tag) => tag !== 'ar')) assert.equal(LANGUAGES[tag].dir, 'ltr', tag);
});

for (const tag of tags) {
  test(`${tag}: exactly the keys of English, of the same kinds`, () => {
    const [en, own] = [shape(english).sort(), shape(LANGUAGES[tag].strings).sort()];
    assert.ok(en.length > 300, `the strings were read (${en.length} leaves)`);
    assert.deepEqual(own.filter((key) => !en.includes(key)), [], `only in ${tag}`);
    assert.deepEqual(en.filter((key) => !own.includes(key)), [], 'only in en');
  });

  test(`${tag}: no word is empty, a place of English is a place here, and a sentence says the value it is given`, () => {
    const own = new Map(leaves(LANGUAGES[tag].strings));
    for (const [key, text] of leaves(english)) {
      const mine = own.get(key);
      if (typeof text === 'function') {
        assert.ok(ASKED[key] || text.length === 1, `${key} takes ${text.length} values: say in ASKED what it is asked for`);
        for (const values of ASKED[key] ?? COUNTS) {
          assert.equal(values.length, text.length, `${key} is asked for as many values as it takes`);
          const said = mine(...values);
          assert.ok(typeof said === 'string' && said.trim(), `${key}(${values}) is empty`);
          // None, one and two may be said in words (a dual, «un solo tono»); from three on the figure is there. A
          // name or a piece of text is always there, whole.
          for (const value of values) if (typeof value !== 'number' || value >= 3) assert.ok(said.includes(String(value)), `${key}(${values}) does not say ${value}: ${said}`);
          assert.doesNotMatch(said, /undefined|NaN|\{[a-z]+\}|\[object/, `${key}(${values})`);
        }
        continue;
      }
      assert.ok(typeof mine === 'string' && mine.trim() && text.trim(), `${key} is empty`);
      assert.deepEqual(places(mine), places(text), `${key}: places differ`);
    }
  });
}

test('a language without a translation is English itself, is not spoken and is not offered', () => {
  const offered = offeredLanguages().map(({ tag }) => tag);
  assert.deepEqual(offered, translated, 'the switch offers the translated languages, in the registry’s order');
  for (const tag of untranslated) {
    assert.equal(LANGUAGES[tag].strings, english, `${tag}: an untranslated file re-exports English — never a part of it`);
    assert.equal(studioLanguage(tag), 'en', `${tag} is hosted in English`);
    assert.equal(studioStrings(tag), english);
    assert.equal(studioDirection(tag), 'ltr', `${tag}: English is not laid out right-to-left`);
    assert.ok(!offered.includes(tag), `${tag} is not offered`);
  }
  for (const { tag, name } of offeredLanguages()) assert.ok(name.trim(), `${tag} has a name for the switch`);
});

test('a translated language is a translation: its file is not English with the mark taken off', () => {
  for (const tag of translated.filter((tag) => tag !== 'en')) {
    const own = new Map(leaves(LANGUAGES[tag].strings));
    const strings = leaves(english).filter(([, text]) => typeof text === 'string');
    const same = strings.filter(([key, text]) => own.get(key) === text).map(([key]) => key);
    // Names that are the same word in both (JSON, Color, Tokens, alias), and specVersion/attribution, stay.
    assert.ok(same.length < strings.length * 0.1, `${tag}: ${same.length} of ${strings.length} strings are English's: ${same.slice(0, 20).join(', ')}`);
    assert.equal(studioLanguage(tag), tag);
    assert.equal(studioStrings(tag), LANGUAGES[tag].strings);
    assert.equal(studioDirection(tag), LANGUAGES[tag].dir);
  }
});

test('the language asked for is found whatever its case and by its primary subtag; anything else is English', () => {
  assert.equal(studioLanguage('JA'), 'ja');
  assert.equal(studioLanguage('ja-JP'), 'ja');
  assert.equal(studioLanguage('es-MX'), 'es');
  assert.equal(studioLanguage(' es '), 'es');
  // The docs pass the folder's spelling; the registry's tag is what comes back when the language is translated.
  assert.equal(studioLanguage('zh-cn'), LANGUAGES['zh-CN'].translated ? 'zh-CN' : 'en');
  assert.equal(studioLanguage('zh-TW'), 'en', 'another Chinese is not Simplified Chinese');
  for (const unknown of [undefined, null, '', 'fr', 'x-studio', 'constructor', '__proto__']) assert.equal(studioLanguage(unknown), 'en', String(unknown));
});

// Counted and named sentences are functions (a count chooses its plural form, a name stands where the language
// wants it): English and Japanese say, to the byte, what a plain concatenation would say.
test('English and Japanese counted and named sentences say what a plain concatenation would', () => {
  const [en, ja] = [studioStrings('en'), studioStrings('ja')];
  assert.equal(en.color.seedOf('primary'), 'primary seed');
  assert.equal(ja.color.seedOf('primary'), 'primary のシード色');
  assert.equal(en.color.fixedTones(3), '3 fixed tones');
  assert.equal(ja.color.fixedTones(3), '固定トーン 3 個');
  assert.equal(en.color.fixedTonesHelp(3), 'This palette fixes 3 tones to exact colors (source.tones); the other tones are generated. The fixed tones belong to this color: choosing another color drops them. Edit them under “Fixed tones”.');
  assert.equal(ja.color.fixedTonesHelp(3), 'このパレットは 3 個のトーンを厳密な色に固定しています（source.tones）。それ以外のトーンは生成されます。固定トーンはこの色に属するため、別の色を選ぶと外れます。「固定トーン」で編集できます。');
  for (const count of [0, 1, 2, 417]) {
    assert.equal(en.tokens.count(count), `${count} tokens`);
    assert.equal(ja.tokens.count(count), `${count} 件のトークン`);
    assert.equal(ja.a11y.warnings(count), `${count} 件の警告`);
    assert.equal(en.export.size(count), `${count} entries written`);
    assert.equal(ja.export.size(count), `${count} 件を書き込み`);
  }
  // The standalone app's bar reads these from the dictionary.
  assert.equal(en.app.noFile, 'No file attached — changes stay in this browser');
  assert.equal(ja.app.noFile, 'ファイル未接続 — ブラウザー内に保存します');
  assert.deepEqual([en.light, en.dark, ja.light, ja.dark], ['Light', 'Dark', 'ライト', 'ダーク']);
  // English has a real singular and plural: «1 warning», never «1 warning(s)».
  assert.deepEqual([0, 1, 2, 417].map((count) => en.a11y.warnings(count)), ['0 warnings', '1 warning', '2 warnings', '417 warnings']);
});

// The Studio's code writes no separator between two pieces of text: `': '`, `' (12)'`, `' — '`,
// `' · '` and the space between two sentences are the dictionary's (labelled, withCount, named, listed, sentences),
// and a label beside a value is a sentence of its own. Each line below is what a plain concatenation would
// produce, written out: English says it to the byte. Japanese writes its own sentences: the full-width colon with no
// space after it, no space between two sentences, and a message that names a thing puts the name first, as Japanese
// word order does (`… を語彙に追加しました`), never a label glued to the tail of a sentence.
test('English says what plain concatenation would, Japanese writes its own sentences: separators, counts in brackets, labels beside values', () => {
  const [en, ja] = [studioStrings('en'), studioStrings('ja')];
  for (const t of [en, ja]) {
    // Three compositions are the same in both.
    assert.equal(t.withCount('a', 12), 'a (12)');
    assert.equal(t.named('a', 'b'), 'a — b');
    assert.equal(t.listed('a', 'b'), 'a · b');
  }
  assert.equal(en.labelled('a', 'b'), 'a: b');
  assert.equal(en.labelled('a', ''), 'a: ', 'a label before elements (Sizes: …) keeps its colon and its space');
  assert.equal(en.sentences('a', 'b'), 'a b');
  assert.equal(ja.labelled('a', 'b'), 'a：b');
  assert.equal(ja.labelled('a', ''), 'a：', 'a label before elements keeps its full-width colon, with no space after it');
  assert.equal(ja.sentences('a。', 'b。'), 'a。b。');
  const same = [
    // [what the dictionary says now, what the code composed before]
    [en.labelled(en.reset, 'Text size'), 'Reset: Text size'],
    [en.labelled(en.editor.writes, en.editor.nothing), 'writes: nothing — the token inherits'],
    [en.labelled(en.import.invalidJson, 'Unexpected token'), 'That is not valid JSON: Unexpected token'],
    [en.withCount(en.tokens.more, 60), 'Show more (60)'],
    [en.withCount(en.a11y.all, 0), 'Everything tanrei build would report (0)'],
    [en.named('Type base', en.dials.value), 'Type base — value'],
    [en.listed(en.color.declared, en.inherited), 'declared palette · inherited'],
    [en.listed(en.changed, en.shape.baseSays('0.6')), 'changed · the base says 0.6'],
    [en.color.addedPalette('correct'), 'correct: added by this layer'],
    [en.color.addedPalette('correct'), `correct: ${en.color.added}`],
    [en.tones.toneOf('primary', 40), 'primary — tone 40'],
    [en.tones.added('primary', 40), 'primary 40: fixed'],
    [en.fonts.added('Inter'), 'Inter: added to the stack'],
    [en.fonts.missing('Inter'), 'Inter is not installed here — the preview shows the fallback; your product must load it.'],
    [en.shape.baseSays('0.6'), 'the base says 0.6'],
    [en.behavior.baseSays('ripple'), 'the base says ripple'],
    [en.add.fromSource('large × 1.5'), 'from large × 1.5'],
    [en.add.fromSource('large'), `${en.add.from} large`],
    [en.add.added('tanrei.comp.button.size.3x'), 'tanrei.comp.button.size.3x: added to the vocabulary'],
    [en.source.line(3), 'Line 3'],
    [en.a11y.text('≥ 4.5:1'), '≥ 4.5:1 text'],
    [en.a11y.nonText('≥ 3:1'), '≥ 3:1 non-text'],
    [en.export.downloaded('acme.system.json'), 'Downloaded acme.system.json'],
    [en.export.put('design/acme.system.json'), 'Save the file as design/acme.system.json'],
    [en.rules.help('$1', '$2'), 'How interaction states look, for every component at once. * matches one id segment and is available as $1, $2… An explicit entry under "tokens" beats a pattern; fewer wildcards beat more; the later layer wins a tie.'],

    [ja.labelled(ja.reset, '文字の大きさ'), 'リセット：文字の大きさ'],
    [ja.labelled(ja.editor.writes, ja.editor.nothing), '書き込み：なし — トークンは継承されます'],
    [ja.labelled(ja.import.invalidJson, 'Unexpected token'), '有効な JSON ではありません：Unexpected token'],
    [ja.withCount(ja.tokens.more, 60), 'さらに表示 (60)'],
    [ja.withCount(ja.a11y.all, 0), 'tanrei build が報告する内容のすべて (0)'],
    [ja.named('文字の基準サイズ', ja.dials.value), '文字の基準サイズ — 値'],
    [ja.listed(ja.color.declared, ja.inherited), '宣言パレット · 継承'],
    [ja.listed(ja.changed, ja.shape.baseSays('0.6')), '変更済み · ベースの値：0.6'],
    [ja.color.addedPalette('correct'), 'correct：このレイヤーで追加'],
    [ja.color.addedPalette('correct'), `correct：${ja.color.added}`],
    [ja.tones.toneOf('primary', 40), 'primary — トーン 40'],
    [ja.tones.added('primary', 40), 'primary 40 を固定しました'],
    [ja.fonts.added('Inter'), 'Inter をスタックに追加しました'],
    [ja.fonts.missing('Inter'), 'Inter はこの環境にインストールされていません。プレビューはフォールバックで表示されます。プロダクト側で読み込んでください。'],
    [ja.shape.baseSays('0.6'), 'ベースの値：0.6'],
    [ja.behavior.baseSays('ripple'), 'ベースの値：ripple'],
    [ja.add.fromSource('large × 1.5'), '複製元 large × 1.5'],
    [ja.add.fromSource('large'), `${ja.add.from} large`],
    [ja.add.added('tanrei.comp.button.size.3x'), 'tanrei.comp.button.size.3x を語彙に追加しました'],
    [ja.source.line(3), '行 3'],
    [ja.a11y.text('≥ 4.5:1'), '≥ 4.5:1 テキスト'],
    [ja.a11y.nonText('≥ 3:1'), '≥ 3:1 非テキスト'],
    [ja.export.downloaded('acme.system.json'), 'acme.system.json をダウンロードしました'],
    [ja.export.put('design/acme.system.json'), 'ファイルの保存先：design/acme.system.json'],
    [ja.rules.help('$1', '$2'), 'インタラクション状態の見え方を、全コンポーネントまとめて決めます。* は id の1セグメントに一致し、$1、$2… として使えます。"tokens" の明示的な指定はパターンに勝ち、ワイルドカードが少ない方が勝ち、同点なら後のレイヤーが勝ちます。'],
  ];
  for (const [now, before] of same) assert.equal(now, before);
  // The key nothing read is gone from every language, and the word that was only ever part of a name with it.
  for (const tag of tags) {
    assert.ok(!('hexOf' in LANGUAGES[tag].strings.color), `${tag}: color.hexOf`);
    assert.ok(!('tone' in LANGUAGES[tag].strings.tones), `${tag}: tones.tone`);
  }
});

test('Spanish counts in the singular and the plural, and puts the name after its noun', () => {
  const es = studioStrings('es');
  assert.equal(es.tokens.count(1), '1 token');
  assert.equal(es.tokens.count(417), '417 tokens');
  assert.equal(es.a11y.warnings(1), '1 advertencia');
  assert.equal(es.a11y.warnings(0), '0 advertencias');
  assert.equal(es.export.size(1), '1 entrada escrita');
  assert.equal(es.export.size(12), '12 entradas escritas');
  assert.equal(es.color.fixedTones(1), '1 tono fijado');
  assert.equal(es.color.fixedTones(4), '4 tonos fijados');
  assert.match(es.color.fixedTonesHelp(1), /^Esta paleta fija 1 tono a un color exacto /);
  assert.match(es.color.fixedTonesHelp(4), /^Esta paleta fija 4 tonos a colores exactos /);
  assert.equal(es.color.seedOf('primary'), 'Semilla de primary');
});

// Wording held in English and Spanish: a count of one, the clause after «escribe:», and the search field's name and hint.
test('one fixed tone is one in English too; Spanish writes one clause after «escribe:»; the search field has a name and a shorter hint', () => {
  const [en, es] = [studioStrings('en'), studioStrings('es')];
  assert.deepEqual([0, 1, 2, 11].map((count) => en.color.fixedTones(count)), ['0 fixed tones', '1 fixed tone', '2 fixed tones', '11 fixed tones']);
  assert.match(en.color.fixedTonesHelp(1), /^This palette fixes 1 tone to an exact color \(source\.tones\); .* The fixed tone belongs to this color: choosing another color drops it\. Edit it under “Fixed tones”\.$/);
  assert.equal(es.labelled(es.editor.writes, es.editor.nothing), 'escribe: nada, ya que el token hereda');
  for (const tag of tags) {
    const t = studioStrings(tag);
    // What follows «writes:» is one clause: no second colon, in any language.
    assert.doesNotMatch(t.editor.nothing, /[:：]/, `${tag} editor.nothing`);
    // The hint is drawn in a field of 320 pixels and is cut where the field ends (test/browser/page.test.js measures
    // it); the name is what a screen reader says, and is not the hint said twice.
    assert.notEqual(t.tokens.search, t.tokens.searchPlaceholder, `${tag}: the search field's name is not its placeholder`);
    assert.ok(t.tokens.searchPlaceholder.length < t.tokens.search.length && t.tokens.searchPlaceholder.length <= 28, `${tag}: the hint is the short one — ${t.tokens.searchPlaceholder}`);
  }
});

// The editor names an operation by the dictionary's word for the engine's key, and falls back to the key itself: a
// key the dictionaries do not have is shown raw, in English, in every language. Every key the engine can offer —
// read from its source, the recipes of the Add panel apart (they are `add.recipes`) — has a name in each.
test('every operation the engine offers has a name in every language', () => {
  const source = fs.readFileSync(new URL('../../token-engine/src/operations.js', import.meta.url), 'utf8');
  const offered = [...new Set([...source.matchAll(/(?:\bop: |\bentry\()'([^']+)'/g)].map((match) => match[1]))].filter((op) => !op.startsWith('add ') && op !== 'revert to inherited');
  for (const op of ['derive', 'derive (tone)', 'derive (contrast-pick)', 'pin $value', 'pattern rule', 'note']) assert.ok(offered.includes(op), `the engine's source still names «${op}» the way this test reads it`);
  for (const tag of tags) {
    const names = LANGUAGES[tag].strings.editor.ops;
    for (const op of offered) assert.ok(typeof names[op] === 'string' && names[op] !== op, `${tag}: editor.ops has a name for «${op}»`);
    // Two rules of one family are told apart by their names.
    assert.equal(new Set([names.derive, names['derive (tone)'], names['derive (contrast-pick)']]).size, 3, `${tag}: three derive operations, three names`);
  }
});

// Simplified Chinese, Hindi and Arabic, each on the thing its translator could not say with a label and a value.
test('Simplified Chinese has one form for every count, full-width separators and no space between sentences', () => {
  const zh = studioStrings('zh-CN');
  assert.equal(zh.tokens.count(0), '0 个令牌');
  assert.equal(zh.tokens.count(1), '1 个令牌');
  assert.equal(zh.tokens.count(417), '417 个令牌');
  assert.equal(zh.source.line(3), '第 3 行');
  assert.equal(zh.labelled(zh.reset, 'primary'), '重置：primary');
  assert.equal(zh.withCount(zh.tokens.more, 60), '显示更多（60）');
  assert.equal(zh.sentences('还需要更多？', zh.rail.moreTitle), `还需要更多？${zh.rail.moreTitle}`, 'no space after a full-width question mark');
  assert.equal(zh.add.fromSource('large × 1.5'), '克隆自 large × 1.5');
  assert.equal(zh.add.from, '克隆自', 'the same words name the select');
});

test('Hindi counts in the singular and the plural, puts the verb last and never writes two colons in a row', () => {
  const hi = studioStrings('hi');
  assert.equal(hi.a11y.warnings(1), '1 चेतावनी');
  assert.equal(hi.a11y.warnings(2), '2 चेतावनियाँ');
  assert.equal(hi.a11y.warnings(0), '0 चेतावनियाँ');
  assert.equal(hi.export.downloaded('acme.system.json'), 'acme.system.json डाउनलोड हो गई');
  assert.equal(hi.export.put('design/acme.system.json'), 'फ़ाइल को design/acme.system.json नाम से सेव करें');
  assert.equal(hi.add.fromSource('large × 1.5'), 'large × 1.5 से क्लोन किया गया');
  assert.equal((hi.labelled(hi.editor.writes, hi.editor.nothing).match(/:/g) ?? []).length, 1, hi.labelled(hi.editor.writes, hi.editor.nothing));
});

test('Arabic counts in its six forms and opens a sentence with an Arabic word, the Latin name inside it', () => {
  const ar = studioStrings('ar');
  assert.equal(ar.tokens.count(0), 'لا رموز');
  assert.equal(ar.tokens.count(1), 'رمز واحد');
  assert.equal(ar.tokens.count(2), 'رمزان');
  assert.equal(ar.tokens.count(3), '3 رموز');
  assert.equal(ar.tokens.count(11), '11 رمزًا');
  assert.equal(ar.tokens.count(100), '100 رمز');
  const arabicFirst = /^[\u0600-\u06FF]/;
  for (const said of [ar.fonts.missing('Inter'), ar.fonts.added('Inter'), ar.add.added('acme.comp.rating.star.size'), ar.color.addedPalette('correct'), ar.tones.added('primary', 40), ar.tones.toneOf('primary', 40), ar.add.fromSource('large × 1.5'), ar.export.downloaded('acme.system.json'), ar.export.put('design/acme.system.json'), ar.source.line(3)]) assert.match(said, arabicFirst, said);
  assert.equal(ar.fonts.missing('Inter'), 'الخط Inter غير مثبَّت هنا: تعرض المعاينة الخط البديل، وعلى منتجك أن يحمّله.');
  assert.equal(ar.add.fromSource('large × 1.5'), 'نسخًا من large × 1.5');
  // The two names of `rules.help` are drawn as isolated left-to-right runs (ui/tokens.ts), so the sentence carries no
  // direction mark for them; the one mark left in the file is before `#0f766e`, in a string a component draws as text.
  assert.doesNotMatch(ar.rules.help('$1', '$2'), /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/);
  const marked = leaves(ar).filter(([, text]) => typeof text === 'string' && /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/.test(text)).map(([key]) => key);
  assert.deepEqual(marked, ['words.invalidColor']);
});

// `rich` and `placed` (src/ui/dom.ts) are how an element stands inside a sentence of the dictionary: the sentence is
// composed with a mark where the element goes, in the order the language chose, and comes back in pieces.
test('an element put into a sentence stands where the language puts it', async () => {
  const file = new URL('../src/ui/dom.ts', import.meta.url);
  let { code } = await transformWithOxc(fs.readFileSync(file, 'utf8'), file.pathname, { lang: 'ts' });
  code = code.replace(/from\s+['"]\.\.\/keys\.js['"]/, `from ${JSON.stringify(new URL('../src/keys.js', import.meta.url).href)}`);
  const { rich, placed } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const [en, zh, hi, ar] = ['en', 'zh-CN', 'hi', 'ar'].map((tag) => studioStrings(tag));
  const [name, link, other] = [{ element: 'name' }, { element: 'link' }, { element: 'other' }];
  assert.deepEqual(rich((at) => en.fonts.missing(at(name))), [name, ' is not installed here — the preview shows the fallback; your product must load it.']);
  assert.deepEqual(rich((at) => ar.fonts.missing(at(name))), ['الخط ', name, ' غير مثبَّت هنا: تعرض المعاينة الخط البديل، وعلى منتجك أن يحمّله.']);
  assert.deepEqual(rich((at) => en.export.put(at(name))), ['Save the file as ', name]);
  assert.deepEqual(rich((at) => hi.export.put(at(name))), ['फ़ाइल को ', name, ' नाम से सेव करें']);
  assert.deepEqual(rich((at) => en.labelled(en.editor.writes, at(name))), ['writes: ', name]);
  assert.deepEqual(rich((at) => zh.labelled(zh.editor.writes, at(name))), ['写入：', name]);
  assert.deepEqual(rich((at) => en.sentences('Need more?', en.listed(en.listed(at(name), at(link)), at(other)))), ['Need more? ', name, ' · ', link, ' · ', other]);
  assert.deepEqual(rich((at) => zh.sentences('还需要更多？', zh.listed(zh.listed(at(name), at(link)), at(other)))), ['还需要更多？', name, ' · ', link, ' · ', other]);
  assert.deepEqual(rich((at) => en.rules.help(at(name), at(link))).slice(1, 4), [name, ', ', link]);
  assert.deepEqual(rich(() => en.a11y.pass), ['All checks pass'], 'a sentence without an element is itself');
  assert.deepEqual(placed('size.unit was set on its own ({size}).', 'size', name), ['size.unit was set on its own (', name, ').']);
  assert.deepEqual(placed('no place', 'size', name), ['no place']);
  // No dictionary holds one of the marks `rich` uses for its elements.
  for (const tag of tags) for (const [key, text] of leaves(LANGUAGES[tag].strings)) if (typeof text === 'string') assert.doesNotMatch(text, /[\uE000-\uF8FF]/, `${tag} ${key}`);
});
