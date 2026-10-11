// `@tanrei/web/highlight`, the highlighter the code block brings (specs/code-block.spec.json, COD-19 and COD-27 to
// COD-33). It has no DOM, so these tests need no page: they run in Node, against the built module — the file
// a build imports for `highlightToHtml`, which is the file the element imports.
//
// The corpus (test/highlight-corpus.json) is code and the runs expected for it, per language, read and corrected by
// hand: each case is the code and the same code `marked` — a run with a role written ‹role:text›, by the two letters
// of ROLE below, and plain text as it is. It is data so that the interpreters of the other platforms can be held to it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { expect, test } from '@playwright/test';
import { transform } from 'esbuild';
import { loadSpec } from '../../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const H = (await import(path.join(pkg, 'dist/highlight/index.js'))) as typeof import('./index.js');
const corpus = JSON.parse(fs.readFileSync(path.join(pkg, 'test/highlight-corpus.json'), 'utf8')) as Record<string, { code: string; marked: string }[]>;
const spec = loadSpec('code-block');

const ROLE: Record<string, string> = { comment: 'co', keyword: 'kw', string: 'st', constant: 'cn', function: 'fn', type: 'ty', tag: 'tg', property: 'pr', punctuation: 'pn' };
const marked = (runs: readonly { text: string; syntax?: string }[]) => runs.map((run) => (run.syntax ? `‹${ROLE[run.syntax] ?? `?${run.syntax}`}:${run.text}›` : run.text)).join('');
const joined = (runs: readonly { text: string }[] | null) => (runs ?? []).map((run) => run.text).join('');
/** The core languages (COD-27), each with its other names, and the module its grammar is. */
const CORE: Record<string, { names: string[]; module: string }> = {
  markup: { names: ['markup', 'html', 'xml', 'svg'], module: 'markup' },
  css: { names: ['css'], module: 'css' },
  javascript: { names: ['javascript', 'js', 'mjs', 'cjs', 'jsx'], module: 'javascript' },
  typescript: { names: ['typescript', 'ts', 'tsx'], module: 'typescript' },
  json: { names: ['json', 'jsonc'], module: 'json' },
  shell: { names: ['shell', 'sh', 'bash', 'zsh'], module: 'shell' },
  swift: { names: ['swift'], module: 'swift' },
  kotlin: { names: ['kotlin', 'kt'], module: 'kotlin' },
  dart: { names: ['dart'], module: 'dart' },
};
const ALL = Object.values(CORE).flatMap((language) => language.names);
/** A generator of the same numbers every run. */
const random = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

test.describe('the highlighter', () => {
  // No page is opened: once is enough, and the project that runs everything runs it.
  test.skip(({ browserName }) => browserName !== 'chromium', 'these tests run in Node, not in a browser');

  test('COD-27: it knows the core languages by their names and their other names, without regard to case and to space around a name — and no language beyond them', async () => {
    expect(H.languages()).toEqual([...ALL].sort());
    for (const name of ALL) {
      expect(await H.highlight('a', name), name).not.toBeNull();
      expect(await H.highlight('a', `  ${name.toUpperCase()} `), name).not.toBeNull();
    }
    for (const name of ['', 'text', 'plain', 'plaintext', 'python', 'yaml', 'diff', 'cobol']) expect(await H.highlight('a = 1', name), name).toBeNull();
    // The other names of a language are that language.
    for (const { names } of Object.values(CORE).filter((language) => !['javascript', 'typescript'].includes(language.names[0]))) {
      for (const name of names) expect(await H.highlight(corpus[names.includes('html') ? 'html' : names[0]][0].code, name), name).toEqual(await H.highlight(corpus[names.includes('html') ? 'html' : names[0]][0].code, names[0]));
    }
  });

  for (const [language, cases] of Object.entries(corpus)) {
    test(`COD-19: the corpus — ${language}: each case is read into the runs written for it, and the runs’ texts joined are the code`, async () => {
      expect(cases.length).toBeGreaterThanOrEqual(2);
      for (const { code, marked: expected } of cases) {
        const runs = await H.highlight(code, language);
        expect(joined(runs), code).toBe(code);
        expect(marked(runs!), code).toBe(expected);
        // Neighbouring runs are never of one role (a run is as long as it can be), and none is empty.
        for (const [index, run] of runs!.entries()) {
          expect(run.text.length, code).toBeGreaterThan(0);
          if (index) expect(run.syntax, code).not.toBe(runs![index - 1].syntax);
        }
      }
    });
  }

  test('COD-19: every core language has a corpus, every role of the axis is found by some grammar, and the fixtures the block highlights by itself are read whole', async () => {
    expect(Object.keys(corpus).sort()).toEqual(['css', 'dart', 'html', 'javascript', 'json', 'jsx', 'kotlin', 'shell', 'swift', 'tsx', 'typescript']);
    const found = new Set<string>();
    for (const [language, cases] of Object.entries(corpus)) for (const { code } of cases) for (const run of (await H.highlight(code, language))!) if (run.syntax) found.add(run.syntax);
    expect([...found].sort()).toEqual(Object.keys(ROLE).sort());
    for (const fixture of spec.fixtures.filter((each) => typeof each.props.language === 'string' && ALL.includes(each.props.language))) {
      const code = String(fixture.props.code);
      const runs = await H.highlight(code, String(fixture.props.language));
      expect(joined(runs), fixture.id).toBe(code);
      expect(runs!.some((run) => run.syntax), fixture.id).toBe(true);
    }
  });

  test('COD-32: the runs’ texts joined are the code, whatever the code — every corpus case cut at every length, text that is no code at all, and noise', async () => {
    const next = random(7);
    const alphabet = [...'abcXYZ019 \n\t"\'`/*\\<>{}()[]$#@&|=+-.,:;!?%~^_', '/*', '*/', '//', '<!--', '-->', '${', '"""', "'''", '</', '/>', '=>', 'function ', 'class ', 'return ', '保存', '🙂', '\r\n', ' '];
    for (const name of [...Object.keys(corpus), ...ALL.filter((each) => !corpus[each])]) {
      await H.loadLanguage(name);
      const cases = corpus[name] ?? [];
      for (const { code } of cases) for (let length = 0; length <= code.length; length++) expect(joined(H.highlight(code.slice(0, length), name) as { text: string }[]), `${name} ${length}`).toBe(code.slice(0, length));
      for (let round = 0; round < 60; round++) {
        let text = '';
        for (let length = Math.floor(next() * 400); text.length < length; ) text += alphabet[Math.floor(next() * alphabet.length)];
        expect(joined(H.highlight(text, name) as { text: string }[]), `${name}: ${JSON.stringify(text)}`).toBe(text);
      }
    }
    expect(joined(H.highlight('', 'js') as { text: string }[])).toBe('');
    expect(H.highlight('', 'js')).toEqual([]);
  });

  test('COD-19: once a language’s grammar is loaded the highlighter answers at once — in the task that asks — and the first time with a promise', async () => {
    // (Registered here under a name of its own, so that the first ask is this test's.)
    H.registerLanguage('once', () => import(path.join(pkg, 'dist/highlight/grammars/json.js')));
    const first = H.highlight('[1]', 'once');
    expect(first).toBeInstanceOf(Promise);
    expect(await first).toEqual([{ text: '[', syntax: 'punctuation' }, { text: '1', syntax: 'constant' }, { text: ']', syntax: 'punctuation' }]);
    expect(H.highlight('[2]', 'once')).toEqual([{ text: '[', syntax: 'punctuation' }, { text: '2', syntax: 'constant' }, { text: ']', syntax: 'punctuation' }]);
    expect(await H.loadLanguage('once')).toBe(true);
    expect(await H.loadLanguage('never-heard-of')).toBe(false);
    expect(typeof H.highlightToHtml('[2]', 'once')).toBe('string');
  });

  test('no text can stall a page: the time to read a text grows with its length — fifty thousand characters of what each grammar finds hardest are read in a fraction of a second, and four times the text takes about four times as long', async () => {
    test.setTimeout(120_000);
    const seeds = [
      ...'!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~aA0 \t\n',
      ...['/*', '<!--', '<', '${', '$(', '"\\', 'a<', 'A<', '<a ', '<a b="', '</', '=/', '.a', 'a:', 'a: ', '--', '::', '..', '=>', '?.', '"""', "'''", 'r"', '//', '*/', 'x(', '`${', '\\(', '0x', '1e', '1.', '<!', '<?', '<![CDATA[', '<script', '<style', '&#', 'function', 'class ', 'new ', 'type ', 'return/', 'fun ', 'func ', 'import ', '@a', '#a', '--a', '-a', 'a-', '!a', 'a{', 'in ', 'if ', '- ', '+ ', '*\n'],
    ];
    const text = (seed: string, separator: string, length: number) => (seed + separator).repeat(Math.ceil(length / (seed.length + separator.length))).slice(0, length);
    const time = (code: string, language: string) => {
      const start = performance.now();
      const runs = H.highlight(code, language) as { text: string }[];
      const took = performance.now() - start;
      expect(joined(runs).length).toBe(code.length);
      return took;
    };
    let worst = { ms: 0, of: '' };
    // (tsx holds every rule of javascript, jsx and typescript.)
    for (const name of Object.keys(CORE).map((language) => (language === 'javascript' ? 'jsx' : language === 'typescript' ? 'tsx' : language))) {
      await H.loadLanguage(name);
      for (const seed of seeds) {
        for (const separator of ['', ' ', '\n']) {
          // The limit's length for the seed alone; a fifth of it between spaces and line breaks, scaled to the same measure.
          const ms = separator ? time(text(seed, separator, 10_000), name) * 5 : time(text(seed, separator, 50_000), name);
          if (ms > worst.ms) worst = { ms, of: `${name} ${JSON.stringify(seed + separator)}` };
        }
      }
    }
    // A pattern that looked ahead to the end of the text at every position took seconds here (two did, while the
    // grammars were written); what is read in proportion takes a few milliseconds, tens at the worst.
    expect(worst.ms, `the slowest: ${worst.of}`).toBeLessThan(1000);
    // In proportion: four times the slowest text, in well under sixteen times its time.
    const [name, seed] = [worst.of.slice(0, worst.of.indexOf(' ')), JSON.parse(worst.of.slice(worst.of.indexOf(' ') + 1)) as string];
    const [stem, separator] = /[ \n]$/.test(seed) && seed.length > 1 ? [seed.slice(0, -1), seed.slice(-1)] : [seed, ''];
    const once = Math.min(...[1, 2, 3].map(() => time(text(stem, separator, 50_000), name)));
    const four = Math.min(...[1, 2, 3].map(() => time(text(stem, separator, 200_000), name)));
    expect(four, `${worst.of}: ${once} ms for 50 000 characters, ${four} ms for 200 000`).toBeLessThan(Math.max(once, 1) * 10);
  });

  test('a grammar is data, and the forms that can take time out of proportion are refused: a repetition in a repeated group, a reference back, a look behind, a state that does not exist — in a product’s grammar and in every one of Tanrei’s', async () => {
    const check = (match: string) => H.checkGrammar({ states: { main: [{ match }] } });
    expect(check('(a+)+b')).toEqual(['main: /(a+)+b/ repeats a group that holds a repetition']);
    expect(check('(?:a*|b)*')).toHaveLength(1);
    expect(check('(?:\\s*,\\s*x){2,}')).toHaveLength(1);
    expect(check('(a)\\1')).toEqual(['main: /(a)\\1/ refers back to a group']);
    expect(check('(?<=a)b')).toEqual(['main: /(?<=a)b/ looks behind the reading position']);
    expect(check('(')).toEqual(['main: /(/ is not a regular expression']);
    expect(H.checkGrammar({ states: { main: [{ match: 'a', push: 'gone' }, { include: 'nowhere' }] } })).toEqual(['main: the state "gone" does not exist', 'main: the state "nowhere" does not exist']);
    // What is allowed: one repetition, a bounded one, a repeated group of single things, a look ahead.
    for (const fine of ['"(?:[^"\\\\\\n]|\\\\.)*"?', '\\d[\\d_]*(?:\\.\\d[\\d_]*)?', '[a-z]+(?=\\s*\\()', '(?:ab){0,3}c+', '[)*+(]+']) expect(check(fine), fine).toEqual([]);
    expect(() => H.tokenize({ states: { main: [{ match: '(a+)+b' }] } }, 'aaa')).toThrow(/grammar refused/);
    // Tanrei's own grammars hold none of them.
    for (const file of fs.readdirSync(path.join(pkg, 'dist/highlight/grammars')).filter((each) => each.endsWith('.js') && each !== 'shared.js')) {
      const module = (await import(path.join(pkg, 'dist/highlight/grammars', file))) as Record<string, import('./index.js').TanreiGrammar>;
      for (const [name, grammar] of Object.entries(module)) if (typeof grammar === 'object') expect(H.checkGrammar(grammar), `${file} ${name}`).toEqual([]);
    }
  });

  test('the interpreter: rules in order at the reading position, a role for the match or one for each group, states entered, left and replaced, another state’s rules included — and a grammar that matches nothing, or turns in place, still reads on', async () => {
    const grammar: import('./index.js').TanreiGrammar = {
      states: {
        main: [{ include: 'space' }, { match: '(let)(\\s+)([a-z]+)', role: ['keyword', '', 'function'] }, { match: '"', role: 'string', push: 'string' }, { match: '\\[', role: 'punctuation', push: 'list' }, { match: '[a-z]+' }],
        space: [{ match: '\\s+' }],
        string: [{ match: '[^"]+', role: 'string' }, { match: '"', role: 'string', pop: true }],
        list: [{ match: '\\]', role: 'punctuation', pop: true }, { match: '!', role: 'keyword', next: 'loud' }, { match: '\\d+', role: 'constant' }, { include: 'space' }],
        loud: [{ match: '\\]', role: 'punctuation', pop: true }, { match: '\\d+', role: 'type' }],
      },
    };
    expect(marked(H.tokenize(grammar, 'let x "a b" [1 ! 2] y ]'))).toBe('‹kw:let› ‹fn:x› ‹st:"a b"› ‹pn:[›‹cn:1› ‹kw:!› ‹ty:2›‹pn:]› y ]');
    // Groups that do not cover the match would lose characters: the match is then one run.
    expect(H.tokenize({ states: { main: [{ match: '(a)b(c)', role: ['keyword', 'string'] }] } }, 'abc')).toEqual([{ text: 'abc', syntax: 'keyword' }]);
    // Reading begins in `start`; patterns are read without regard to case where the grammar says so.
    expect(H.tokenize({ start: 'b', ignoreCase: true, states: { a: [{ match: 'x', role: 'keyword' }], b: [{ match: 'x', role: 'string' }] } }, 'Xx')).toEqual([{ text: 'Xx', syntax: 'string' }]);
    // Nothing matches; a rule that matches nothing and changes no state; two states that send each other on forever.
    expect(H.tokenize({ states: { main: [] } }, 'a b')).toEqual([{ text: 'a b' }]);
    expect(H.tokenize({ states: { main: [{ match: '(?=a)' }] } }, 'aa')).toEqual([{ text: 'aa' }]);
    expect(joined(H.tokenize({ states: { a: [{ match: '', next: 'b' }], b: [{ match: '', next: 'a' }] } }, 'x'.repeat(1000)))).toBe('x'.repeat(1000));
    // A state left more often than entered stays where reading began.
    expect(marked(H.tokenize(grammar, ']]"s"'))).toBe(']]‹st:"s"›');
  });

  test('COD-27: a product adds a language — a grammar, or a function that imports one — replaces one, and replaces the highlighter whole; COD-32: a grammar that cannot be loaded is tried again when it is asked for again', async () => {
    const ini: import('./index.js').TanreiGrammar = { states: { main: [{ match: ';[^\\n]*', role: 'comment' }, { match: '[A-Za-z_][\\w.-]*(?=\\s*=)', role: 'property' }] } };
    H.registerLanguage(['INI', ' conf '], ini);
    expect(H.languages()).toEqual(expect.arrayContaining(['ini', 'conf']));
    expect(marked((await H.highlight('; c\na = 1', 'Conf'))!)).toBe('‹co:; c›\n‹pr:a› = 1');
    H.registerLanguage('ini', () => ({ default: { states: { main: [{ match: '=', role: 'punctuation' }] } } }));
    expect(marked((await H.highlight('a = 1', 'ini'))!)).toBe('a ‹pn:=› 1');
    expect(marked((await H.highlight('a = 1', 'conf'))!)).toBe('‹pr:a› = 1');
    // A grammar that cannot be loaded: the answer is refused, and the next ask tries again.
    let tries = 0;
    H.registerLanguage('flaky', () => {
      if (++tries === 1) throw new Error('offline');
      return ini;
    });
    await expect(Promise.resolve(H.highlight('a = 1', 'flaky'))).rejects.toThrow('offline');
    expect(marked((await H.highlight('a = 1', 'flaky'))!)).toBe('‹pr:a› = 1');
    // The highlighter replaced whole: asked for every language, with the name trimmed and in lower case.
    const asked: string[] = [];
    H.setHighlighter((code, language) => (asked.push(language), language === 'mine' ? [{ text: code, syntax: 'type' }] : null));
    try {
      expect(await H.highlight('x', ' MINE ')).toEqual([{ text: 'x', syntax: 'type' }]);
      expect(await H.highlight('x', 'js')).toBeNull();
      expect(asked).toEqual(['mine', 'js']);
      expect(await H.highlightToHtml('a<b', 'mine')).toBe('<span data-syntax="type">a&lt;b</span>');
      // Null turns it off; undefined gives Tanrei's back.
      H.setHighlighter(null);
      expect(H.highlight('const a = 1', 'js')).toBeNull();
      expect(H.highlightToHtml('a<b', 'js')).toBe('a&lt;b');
    } finally {
      H.setHighlighter(undefined);
    }
    expect(marked((await H.highlight('const a = 1', 'js'))!)).toBe('‹kw:const› a = ‹cn:1›');
  });

  test('COD-28, COD-29: highlightToHtml writes the inner HTML of the code where a page is made — escaped text and data-syntax runs, with lines one data-line box per line — and gives a language it does not know, and runs that are not the code, as the code escaped and plain', async () => {
    const text = (html: string) => html.replace(/<[^>]+>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&amp;', '&');
    const code = 'const a = "<b> & \\"c\\"";\n/* two\n   lines */\n';
    const html = await H.highlightToHtml(code, 'js');
    expect(html).toBe('<span data-syntax="keyword">const</span> a = <span data-syntax="string">&quot;&lt;b&gt; &amp; </span><span data-syntax="constant">\\&quot;</span><span data-syntax="string">c</span><span data-syntax="constant">\\&quot;</span><span data-syntax="string">&quot;</span><span data-syntax="punctuation">;</span>\n<span data-syntax="comment">/* two\n   lines */</span>\n');
    expect(text(html)).toBe(code);
    // With lines: one box per line holding the box of its code, the line's break inside it at its end; a run that
    // spans lines is one piece in each. The boxes are the ones the element makes, so that it makes none.
    const lines = await H.highlightToHtml(code, 'js', { lines: true });
    expect(text(lines)).toBe(code);
    expect(lines.match(/<span data-line>/g)).toHaveLength(3);
    expect(lines.match(/<span data-line><span data-line-code>/g)).toHaveLength(3);
    expect(lines).toContain('<span data-line><span data-line-code><span data-syntax="comment">/* two\n</span></span></span><span data-line><span data-line-code><span data-syntax="comment">   lines */</span>\n</span></span>');
    expect(await H.highlightToHtml('a\n\nb', 'text', { lines: true })).toBe('<span data-line><span data-line-code>a\n</span></span><span data-line><span data-line-code>\n</span></span><span data-line><span data-line-code>b</span></span>');
    // The same function in the build and in the element: what it writes is what `highlight` answers.
    for (const [language, cases] of Object.entries(corpus)) for (const each of cases) expect(text((await H.highlightToHtml(each.code, language, { lines: true })) as string), each.code).toBe(each.code);
    // Unknown, and plain names: the code, escaped.
    for (const name of ['', 'text', 'cobol']) expect(await H.highlightToHtml('a < b && c', name)).toBe('a &lt; b &amp;&amp; c');
    // A highlighter whose runs are not the code alters nothing: the code is written plain (COD-32).
    H.setHighlighter((source) => [{ text: source.slice(1), syntax: 'keyword' }]);
    try {
      expect(await H.highlightToHtml('abc', 'js')).toBe('abc');
    } finally {
      H.setHighlighter(undefined);
    }
  });

  test('the fold: a scope name of a grammar that names tokens by dotted scopes is one of the nine roles or plain — the most specific scope first, the rows in order', async () => {
    const rows: [string | string[], string, string?][] = [
      ['comment.line.double-slash', 'comment'],
      ['punctuation.definition.comment', 'comment'],
      ['constant.numeric.decimal', 'constant'],
      ['constant.language.boolean', 'constant'],
      ['keyword.other.unit.px', 'constant'],
      ['variable.other.constant', 'constant'],
      ['variable.other.enummember', 'constant'],
      ['string.quoted.double', 'string'],
      ['punctuation.definition.string.begin', 'string'],
      ['markup.inline.raw', 'string'],
      ['entity.name.tag.html', 'tag'],
      ['support.class.component', 'tag'],
      ['entity.other.attribute-name.html', 'property'],
      ['support.type.property-name.css', 'property'],
      ['meta.object-literal.key', 'property'],
      ['variable.other.property', 'property'],
      ['variable.parameter.option', 'property'],
      ['entity.name.function', 'function'],
      ['support.function.console', 'function'],
      ['meta.function-call.generic', 'function'],
      ['entity.name.type.class', 'type'],
      ['entity.name.namespace', 'type'],
      ['entity.other.inherited-class', 'type'],
      ['support.type.primitive', 'type'],
      ['storage.type.primitive', 'type'],
      ['keyword.operator.new', 'keyword', 'new'],
      ['keyword.operator.expression.typeof', 'keyword', 'typeof'],
      ['keyword.operator.assignment', 'plain', '='],
      ['keyword.operator.arrow', 'plain', '=>'],
      ['keyword.control.flow', 'keyword'],
      ['storage.type.function', 'keyword'],
      ['storage.modifier', 'keyword'],
      ['variable.language.this', 'keyword'],
      ['meta.decorator', 'keyword'],
      ['entity.name.function.decorator', 'keyword'],
      ['markup.heading', 'keyword'],
      ['punctuation.separator.comma', 'punctuation'],
      ['meta.brace.round', 'punctuation'],
      ['variable.other.readwrite', 'plain'],
      ['variable.parameter', 'plain'],
      ['markup.bold', 'plain'],
      ['markup.inserted', 'plain'],
      ['invalid.illegal', 'plain'],
      ['source.ts', 'plain'],
      ['something.nobody.wrote', 'plain'],
      ['', 'plain'],
      // A prefix is whole names: `strings` is not `string`.
      ['stringly.typed', 'plain'],
      // The most specific scope decides: an escape inside a string is a constant; a variable in a template is plain.
      [['source.js', 'string.quoted.double', 'constant.character.escape'], 'constant'],
      [['source.js', 'string.template', 'meta.template.expression', 'variable.other.readwrite'], 'plain'],
      [['source.js', 'comment.block', 'punctuation.definition.comment'], 'comment'],
      // A scope no row names is passed over, and the one around it decides.
      [['source.js', 'string.quoted', 'something.nobody.wrote'], 'string'],
      // In a style sheet a class, an id and a pseudo-class are what the sheet addresses: a tag.
      [['source.css', 'meta.selector', 'entity.other.attribute-name.class'], 'tag'],
      [['source.css', 'meta.selector'], 'tag'],
      [['text.html', 'meta.tag', 'entity.other.attribute-name'], 'property'],
    ];
    for (const [scopes, role, text] of rows) expect(H.foldScope(scopes, text), JSON.stringify(scopes)).toBe(role);
  });

  test('COD-29: highlightToLines gives the runs grouped by line, as plain data — a line’s break ends its last run, a run that spans lines is one piece in each, every text joined is the code — at once after the first use of a language, as highlightToHtml does; and highlightToHtml is built on it', async () => {
    const code = 'const a = 1;\n/* two\n   lines */\n\nb';
    expect(await H.highlightToLines(code, 'js')).toEqual([
      [{ text: 'const', syntax: 'keyword' }, { text: ' a = ' }, { text: '1', syntax: 'constant' }, { text: ';', syntax: 'punctuation' }, { text: '\n' }],
      [{ text: '/* two\n', syntax: 'comment' }],
      [{ text: '   lines */', syntax: 'comment' }, { text: '\n' }],
      [{ text: '\n' }],
      [{ text: 'b' }],
    ]);
    // The same contract as `highlight`: a promise the first time a language is asked for, the answer itself after.
    H.registerLanguage('lines-once', async () => ({ start: 'root', states: { root: [{ match: '\\d+', role: 'constant' }] } }));
    expect(H.highlightToLines('1', 'lines-once')).toBeInstanceOf(Promise);
    await H.loadLanguage('lines-once');
    expect(H.highlightToLines('1\n2', 'lines-once')).toEqual([[{ text: '1', syntax: 'constant' }, { text: '\n' }], [{ text: '2', syntax: 'constant' }]]);
    // No code, no line; a last line break makes no line after it; an unknown language is each line as one plain run.
    expect(H.highlightToLines('', 'text')).toEqual([]);
    expect(H.highlightToLines('a\n', 'cobol')).toEqual([[{ text: 'a\n' }]]);
    expect(H.highlightToLines('a\n\nb', '')).toEqual([[{ text: 'a\n' }], [{ text: '\n' }], [{ text: 'b' }]]);
    // Runs that are not the code are no one's highlighting of it (COD-32).
    H.setHighlighter((source) => [{ text: source.slice(1), syntax: 'keyword' }]);
    try {
      expect(H.highlightToLines('ab\nc', 'js')).toEqual([[{ text: 'ab\n' }], [{ text: 'c' }]]);
    } finally {
      H.setHighlighter(undefined);
    }
    // Every language of the corpus: the lines' runs joined are the code, no run is empty, and a break is only ever
    // the last character of a line; and the HTML with lines is those runs, line by line.
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    for (const [language, cases] of Object.entries(corpus)) {
      for (const each of cases) {
        const lines = await H.highlightToLines(each.code, language);
        expect(lines.flat().map((run) => run.text).join(''), each.code).toBe(each.code);
        for (const line of lines) {
          const whole = line.map((run) => run.text).join('');
          expect(line.every((run) => run.text !== '') && (whole.indexOf('\n') < 0 || whole.indexOf('\n') === whole.length - 1), each.code).toBe(true);
        }
        const html = lines.map((line) => `<span data-line><span data-line-code>${line.map((run) => (run.syntax ? `<span data-syntax="${run.syntax}">${escape(run.text)}</span>` : escape(run.text))).join('')}</span></span>`).join('');
        expect(await H.highlightToHtml(each.code, language, { lines: true }), each.code).toBe(html);
      }
    }
  });

  test('COD-13 to COD-17, COD-29: with the block’s props as `lines`, highlightToHtml and highlightToNodes write the lines as the element draws them — the gutter with its padded number and its sign, the prompt before a line that is not empty, a mark and its label in words — and highlightToNodes gives the same thing as plain nodes', async () => {
    const code = 'ls\n\ncd src\nls -a\n';
    const beside = { lineNumbers: true, startLine: 8, highlightedLines: '8', addedLines: '10', removedLines: '11', highlightedLabel: 'Highlighted', addedLabel: 'Added', removedLabel: 'Removed', prompt: '$' };
    const nodes = await H.highlightToNodes(code, 'text', { lines: beside });
    const pad = ' ';
    const line = (attributes: Record<string, string>, number: string, sign: string, text: string, label?: string) => ({
      name: 'span',
      attributes: { 'data-line': '', ...attributes },
      children: [
        { name: 'span', attributes: { 'data-line-gutter': '', 'aria-hidden': 'true', 'data-number': number, 'data-sign': sign }, children: [] },
        ...(text === '\n' ? [] : [{ name: 'span', attributes: { 'data-line-prompt': '', 'aria-hidden': 'true', 'data-prompt': '$' }, children: [] }]),
        ...(label ? [{ name: 'span', attributes: { 'data-line-label': '' }, children: [label] }] : []),
        { name: 'span', attributes: { 'data-line-code': '' }, children: [text] },
      ],
    });
    expect(nodes).toEqual([
      line({ 'data-highlighted': '' }, `${pad}8`, ' ', 'ls\n', 'Highlighted, '),
      line({}, `${pad}9`, ' ', '\n'),
      line({ 'data-added': '' }, '10', '+', 'cd src\n', 'Added, '),
      line({ 'data-removed': '' }, '11', '−', 'ls -a\n', 'Removed, '),
    ]);
    // The HTML is those nodes, written out: an attribute without a value is its name alone.
    const html = await H.highlightToHtml(code, 'text', { lines: beside });
    expect(html.startsWith(`<span data-line data-highlighted><span data-line-gutter aria-hidden="true" data-number="${pad}8" data-sign=" "></span><span data-line-prompt aria-hidden="true" data-prompt="$"></span><span data-line-label>Highlighted, </span><span data-line-code>ls\n</span></span>`)).toBe(true);
    expect(html.replace(/<span data-line-label>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '')).toBe(code);
    // Without lines the nodes are the runs; a block with none of the props has no gutter, prompt or label.
    expect(await H.highlightToNodes('const a', 'js')).toEqual([{ name: 'span', attributes: { 'data-syntax': 'keyword' }, children: ['const'] }, ' a']);
    expect(await H.highlightToNodes('a', 'text', { lines: {} })).toEqual(await H.highlightToNodes('a', 'text', { lines: true }));
    // A line named as added and as removed is drawn removed; a list that cannot be read marks nothing (COD-14).
    expect(await H.highlightToHtml('a\nb', 'text', { lines: { addedLines: '1, x', removedLines: '1' } })).toBe('<span data-line data-removed><span data-line-gutter aria-hidden="true" data-sign="−"></span><span data-line-code>a\n</span></span><span data-line><span data-line-gutter aria-hidden="true" data-sign=" "></span><span data-line-code>b</span></span>');
  });

  test('the budget: the module without its grammars is at most 3 kB and each grammar at most 3 kB, minified and compressed — and the module holds no DOM and no dependency, so it is the same file in a browser and in Node', async () => {
    const size = async (file: string) => zlib.gzipSync((await transform(fs.readFileSync(path.join(pkg, 'dist/highlight', file), 'utf8'), { minify: true, format: 'esm' })).code, { level: 9 }).length;
    expect(await size('index.js')).toBeLessThanOrEqual(3000);
    const shared = await size('grammars/shared.js');
    let all = (await size('index.js')) + shared;
    for (const { module } of Object.values(CORE)) {
      // A grammar with what it imports: the pieces the grammars share, and typescript's javascript.
      const own = (await size(`grammars/${module}.js`)) + (module === 'typescript' ? await size('grammars/javascript.js') : 0);
      expect(own + (module === 'markup' ? 0 : shared), module).toBeLessThanOrEqual(3000);
      all += await size(`grammars/${module}.js`);
    }
    // All nine, if a page shows them all: about 20 kB is the ceiling.
    expect(all).toBeLessThanOrEqual(20_000);
    for (const file of ['index.js', ...fs.readdirSync(path.join(pkg, 'dist/highlight/grammars')).filter((each) => each.endsWith('.js')).map((each) => `grammars/${each}`)]) {
      const source = fs.readFileSync(path.join(pkg, 'dist/highlight', file), 'utf8');
      expect(source, file).not.toMatch(/\b(?:document|window|customElements|navigator|globalThis)\s*[.[]|\bHTMLElement\b/);
      for (const [, from, asked] of source.matchAll(/^(?:import|export)\b[^'"\n]*\bfrom\s*['"]([^'"\n]+)['"];?$|\bimport\(['"]([^'"\n]+)['"]\)/gm)) expect(from ?? asked, file).toMatch(/^\.{1,2}\//);
    }
    // What the module shares with the element — what stands beside a line — is the same: no DOM, nothing imported.
    const beside = fs.readFileSync(path.join(pkg, 'dist/components/code-block/code-block.lines.js'), 'utf8');
    expect(beside).not.toMatch(/\b(?:document|window|customElements|navigator|globalThis)\s*[.[]|\bHTMLElement\b|^import\b/m);
    const exported = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).exports['./highlight'];
    expect(exported).toEqual({ types: './dist/highlight/index.d.ts', default: './dist/highlight/index.js' });
  });
});
