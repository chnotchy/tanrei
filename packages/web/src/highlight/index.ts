// The highlighter the code block brings (specs/code-block.spec.json, COD-19 and COD-27 to COD-33): given
// code and the name of its language, the runs — which piece of the code is a comment, a keyword, a string. It is small
// on purpose. It is meant for a code DISPLAY with nine roles, not for an editor: where a language is hard it is wrong
// quietly — a run in another color, never a missing character, never a page that hangs.
//
//   - No dependency and no DOM: the same file in a browser, in a worker and in Node, so the function a build calls
//     (`highlightToHtml`) is the function the element calls, and the two cannot disagree.
//   - A grammar is DATA: named states, each an ordered list of rules — a pattern, the role of what it matches, and the
//     state to enter or leave. One interpreter (`tokenize`) reads every grammar. A pattern is read at the reading
//     position only (sticky) and may not nest one repetition in another, so the time to read a text grows with its
//     length (`checkGrammar` refuses the forms that would not).
//   - Each grammar is a module of its own, imported the first time its language is asked for. Until then `highlight`
//     answers with a promise; after, in the same task.
//
// The roles are the values of the token axis `comp.code-block.syntax`; a design system may add one, and a
// grammar may name any role the active system has.

import { type TanreiCodeLinesOptions, furnish } from '../components/code-block/code-block.lines.js';

export type { TanreiCodeLinesOptions } from '../components/code-block/code-block.lines.js';

/** A piece of the code and what it is. The runs' texts, joined in order, are the code. `syntax` is absent for plain. */
export interface TanreiSyntaxRun {
  text: string;
  syntax?: string;
}

/**
 * One rule of a state. `match` is the source of a regular expression, read at the reading position. `role` is the role
 * of what it matched — or one role per capture group, where the pattern is made of groups that follow one another and
 * cover the whole match (`''` is plain). `push` enters a state, `pop` leaves the current one, `next` replaces it.
 * `include` reads another state's rules here.
 */
export interface TanreiGrammarRule {
  match?: string;
  role?: string | readonly string[];
  push?: string;
  pop?: boolean;
  next?: string;
  include?: string;
}

/** A grammar: its states by name. Reading begins in `start`, or in the first state. `ignoreCase` reads every pattern without regard to case. */
export interface TanreiGrammar {
  start?: string;
  ignoreCase?: boolean;
  states: Readonly<Record<string, readonly TanreiGrammarRule[]>>;
}

/** A grammar, or a function that imports one (a module whose default export is the grammar will do). */
export type TanreiGrammarSource = TanreiGrammar | (() => TanreiGrammar | Promise<TanreiGrammar | { default: TanreiGrammar }>);

/** A highlighter: the runs of `code` read as `language` — at once or later — or null for "I do not know this language". */
export type TanreiHighlighter = (code: string, language: string, signal?: AbortSignal) => readonly TanreiSyntaxRun[] | null | Promise<readonly TanreiSyntaxRun[] | null>;

interface State {
  re: RegExp;
  rules: TanreiGrammarRule[];
  /** The capture group each rule begins at. */
  at: number[];
}
interface Compiled {
  start: string;
  states: Record<string, State>;
}
interface Entry {
  source: TanreiGrammarSource;
  grammar?: Compiled;
  loading?: Promise<Compiled>;
}

const registry = new Map<string, Entry>();
const compiled = new WeakMap<TanreiGrammar, Compiled>();
let custom: TanreiHighlighter | null | undefined;

const key = (language: string) => language.trim().toLowerCase();
const groups = (source: string) => new RegExp(`${source}|`).exec('')!.length - 1;

/**
 * What a grammar holds that the interpreter refuses, as sentences; empty when it holds none. Refused: a state that is
 * named and missing; a pattern that is not a regular expression; a repetition inside a repeated group (the form whose
 * time can grow out of proportion to the text); a reference back to a group; a look behind the reading position.
 */
export function checkGrammar(grammar: TanreiGrammar): string[] {
  const problems: string[] = [];
  for (const [name, rules] of Object.entries(grammar.states)) {
    for (const rule of rules) {
      for (const state of [rule.include, rule.push, rule.next]) if (state && !grammar.states[state]) problems.push(`${name}: the state "${state}" does not exist`);
      const source = rule.match;
      if (source === undefined) continue;
      const say = (what: string) => problems.push(`${name}: /${source}/ ${what}`);
      try {
        new RegExp(source);
      } catch {
        say('is not a regular expression');
        continue;
      }
      // Whether each open group holds a repetition without a bound.
      const open: boolean[] = [false];
      for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (char === '\\') {
          if (/[1-9k]/.test(source[++i])) say('refers back to a group');
        } else if (char === '[') {
          while (++i < source.length && source[i] !== ']') if (source[i] === '\\') i++;
        } else if (char === '(') {
          if (/^\?<[=!]/.test(source.slice(i + 1))) say('looks behind the reading position');
          open.push(false);
        } else if (char === ')' || char === '*' || char === '+' || (char === '{' && /^\d+,\}/.test(source.slice(i + 1)))) {
          const inner = char === ')' && open.length > 1 ? open.pop()! : false;
          const repeated = char === ')' ? /^(?:[*+]|\{\d+,\})/.test(source.slice(i + 1)) : true;
          if (inner && repeated) say('repeats a group that holds a repetition');
          if (inner || repeated) open[open.length - 1] = true;
        }
      }
    }
  }
  return problems;
}

function compile(grammar: TanreiGrammar): Compiled {
  let done = compiled.get(grammar);
  if (done) return done;
  const problems = checkGrammar(grammar);
  if (problems.length) throw new Error(`grammar refused — ${problems.join('; ')}`);
  const states: Record<string, State> = {};
  const rulesOf = (name: string, seen: string[]): TanreiGrammarRule[] => (seen.includes(name) ? [] : grammar.states[name].flatMap((rule) => (rule.include ? rulesOf(rule.include, [...seen, name]) : rule.match === undefined ? [] : [rule])));
  for (const name of Object.keys(grammar.states)) {
    const rules = rulesOf(name, []);
    const at: number[] = [];
    let group = 1;
    for (const rule of rules) {
      at.push(group);
      group += 1 + groups(rule.match!);
    }
    states[name] = { rules, at, re: new RegExp(rules.map((rule) => `(${rule.match})`).join('|') || '(?!)', grammar.ignoreCase ? 'imy' : 'my') };
  }
  done = { start: grammar.start ?? Object.keys(grammar.states)[0], states };
  compiled.set(grammar, done);
  return done;
}

/** Where no rule reads: a word, a stretch of space, or one character — plain, and never one character of a long word at a time. */
const REST = /[\w$]+|\s+|[^]/y;

function read({ start, states }: Compiled, code: string): TanreiSyntaxRun[] {
  const runs: TanreiSyntaxRun[] = [];
  const stack = [start];
  let last: TanreiSyntaxRun | undefined;
  const emit = (text: string, role: string | undefined) => {
    if (!text) return;
    const syntax = role || undefined;
    if (last && last.syntax === syntax) last.text += text;
    else runs.push((last = syntax ? { text, syntax } : { text }));
  };
  let pos = 0;
  // Rules that match nothing may only change the state; a grammar that turns in place is stopped by reading on.
  let still = 0;
  while (pos < code.length) {
    const state = states[stack[stack.length - 1]];
    state.re.lastIndex = pos;
    const m = state.re.exec(code);
    if (!m || (!m[0] && ++still > 8)) {
      REST.lastIndex = pos;
      emit(REST.exec(code)![0], undefined);
      pos = REST.lastIndex;
      still = 0;
      continue;
    }
    let i = 0;
    while (m[state.at[i]] === undefined) i++;
    const rule = state.rules[i];
    if (m[0]) {
      still = 0;
      const role = rule.role;
      if (typeof role === 'object') {
        const parts = role.map((_, n) => m[state.at[i] + 1 + n] ?? '');
        // Groups that do not cover the match would lose characters: the whole match is then one run.
        if (parts.join('') === m[0]) parts.forEach((text, n) => emit(text, role[n]));
        else emit(m[0], role.find(Boolean));
      } else emit(m[0], role);
      pos += m[0].length;
    }
    if (rule.pop && stack.length > 1) stack.pop();
    if (rule.next) stack[stack.length - 1] = rule.next;
    if (rule.push) stack.push(rule.push);
  }
  return runs;
}

/** The interpreter: the runs of `code` read by `grammar`. For a product that writes a grammar and tests it. */
export const tokenize = (grammar: TanreiGrammar, code: string): TanreiSyntaxRun[] => read(compile(grammar), code);

/**
 * Adds a language, or replaces one: `names` are its name and its other names, read without regard to case. The
 * grammar may be a function that imports it, so that it is loaded the first time the language is asked for.
 */
export function registerLanguage(names: string | readonly string[], grammar: TanreiGrammarSource): void {
  const entry: Entry = { source: grammar };
  for (const name of typeof names === 'string' ? [names] : names) registry.set(key(name), entry);
}

/** Every name a language is known by. */
export const languages = (): string[] => [...registry.keys()].sort();

function load(entry: Entry): Promise<Compiled> {
  return (entry.loading ??= Promise.resolve()
    .then(() => (typeof entry.source === 'function' ? entry.source() : entry.source))
    .then((grammar) => (entry.grammar = compile('default' in grammar ? grammar.default : grammar)))
    .catch((error: unknown) => {
      // Asked again, it is tried again.
      entry.loading = undefined;
      throw error;
    }));
}

/** Loads a language's grammar ahead of the first code in it; false for a language that is not known. After it, `highlight` answers at once. */
export async function loadLanguage(language: string): Promise<boolean> {
  const entry = registry.get(key(language));
  if (entry) await load(entry);
  return !!entry;
}

/**
 * The runs of `code` read as `language`, or null for a language that is not known (and while the highlighter is turned
 * off). At once where the language's grammar is loaded; a promise the first time, while it is imported.
 */
export function highlight(code: string, language: string, signal?: AbortSignal): TanreiSyntaxRun[] | null | Promise<TanreiSyntaxRun[] | null> {
  if (custom !== undefined) return custom ? (custom(code, key(language), signal) as TanreiSyntaxRun[] | null | Promise<TanreiSyntaxRun[] | null>) : null;
  const entry = registry.get(key(language));
  if (!entry) return null;
  return entry.grammar ? read(entry.grammar, code) : load(entry).then((grammar) => read(grammar, code));
}

/**
 * Replaces the highlighter whole, for every code block of the page and for `highlightToHtml`: a function is asked in
 * its place; null turns automatic highlighting off; undefined gives Tanrei's back.
 */
export function setHighlighter(highlighter: TanreiHighlighter | null | undefined): void {
  custom = highlighter;
}

/** Runs that are not the code are no one's highlighting of it: the code, plain (COD-32). */
const textOf = (runs: readonly TanreiSyntaxRun[]) => runs.map((each) => each.text).join('');
const sound = (code: string, runs: readonly TanreiSyntaxRun[] | null): readonly TanreiSyntaxRun[] => (runs && textOf(runs) === code ? runs : [{ text: code }]);
/** What is made of an answer, at once or when it comes. */
const after = <T, U>(answer: T | Promise<T>, make: (answer: T) => U): U | Promise<U> => (answer instanceof Promise ? answer.then(make) : make(answer));

/** The runs line by line: a line's break is the end of its last run, and a run that spans lines is one piece in each. */
function toLines(code: string, runs: readonly TanreiSyntaxRun[] | null): TanreiSyntaxRun[][] {
  const lines: TanreiSyntaxRun[][] = [];
  let open: TanreiSyntaxRun[] | null = null;
  for (const piece of sound(code, runs)) {
    for (let from = 0, to: number; from < piece.text.length; from = to) {
      to = piece.text.indexOf('\n', from) + 1 || piece.text.length;
      if (!open) lines.push((open = []));
      open.push({ ...piece, text: piece.text.slice(from, to) });
      if (piece.text[to - 1] === '\n') open = null;
    }
  }
  return lines;
}

/**
 * The code's runs, grouped by line — plain data, for a build step that makes nodes of its own (a tree of a Markdown
 * engine, a template's children). Each line is its runs in order, each as the highlighter gave it; a line's break is
 * the last character of its last run, a run that spans lines is one piece in each, and every text joined is the code. A language that is not known
 * gives every line as one plain run. At once where the grammar is loaded, a promise the first time.
 */
export const highlightToLines = (code: string, language: string): TanreiSyntaxRun[][] | Promise<TanreiSyntaxRun[][]> => after(highlight(code, language), (runs) => toLines(code, runs));

/** A node of the code as `highlightToNodes` gives it: text, or a `<span>` with its attributes and its children. */
export type TanreiCodeNode = string | { name: 'span'; attributes: Record<string, string>; children: TanreiCodeNode[] };

/** How `highlightToHtml` and `highlightToNodes` write the code. */
export interface TanreiHighlightOutput {
  /**
   * True: one `<span data-line>` per line, holding its code in a `<span data-line-code>` — the boxes the element
   * would make, so that it makes none. The block's own props (`lineNumbers`, `startLine`, `highlightedLines`,
   * `addedLines`, `removedLines` and their labels, `prompt`): the lines also carry what the element draws beside
   * them, so the page is drawn whole by `code.css` before the element is defined, and nothing moves when it is.
   * Give the element the same attributes.
   */
  lines?: boolean | TanreiCodeLinesOptions;
}

/** A span with the attributes that have a value: null and false are left out. */
const span = (attributes: Record<string, string | null | false>, children: TanreiCodeNode[] = []): TanreiCodeNode => ({
  name: 'span',
  attributes: Object.fromEntries(Object.entries(attributes).filter((entry) => typeof entry[1] === 'string')) as Record<string, string>,
  children,
});
const run = ({ text, syntax }: TanreiSyntaxRun): TanreiCodeNode => (syntax && syntax !== 'plain' ? span({ 'data-syntax': syntax }, [text]) : text);

function toNodes(code: string, runs: readonly TanreiSyntaxRun[] | null, lines?: boolean | TanreiCodeLinesOptions): TanreiCodeNode[] {
  if (!lines) return sound(code, runs).filter((each) => each.text).map(run);
  const all = toLines(code, runs);
  const beside = furnish(all.map(textOf), lines).lines;
  // The line as the element writes it (code-block.ts): the gutter, the prompt, the label, the code.
  return all.map((line, index) => {
    const { highlighted, added, removed, gutter, number, sign, prompt, label } = beside[index];
    return span(
      { 'data-line': '', 'data-highlighted': highlighted && '', 'data-added': added && '', 'data-removed': removed && '' },
      [
        gutter && span({ 'data-line-gutter': '', 'aria-hidden': 'true', 'data-number': number, 'data-sign': sign }),
        prompt && span({ 'data-line-prompt': '', 'aria-hidden': 'true', 'data-prompt': prompt }),
        label && span({ 'data-line-label': '' }, [label]),
        span({ 'data-line-code': '' }, line.map(run)),
      ].filter(Boolean) as TanreiCodeNode[],
    );
  });
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ESCAPES[char]);
const serialize = (node: TanreiCodeNode): string =>
  typeof node === 'string'
    ? escape(node)
    : `<span${Object.entries(node.attributes)
        .map(([name, value]) => ` ${name}${value && `="${escape(value)}"`}`)
        .join('')}>${node.children.map(serialize).join('')}</span>`;

/**
 * The code as the children of its `<code>`, highlighted, as plain data: text and `<span data-syntax="…">` runs — and,
 * with `lines`, the lines (see `TanreiHighlightOutput`). What `highlightToHtml` writes, for a build step whose page is
 * a tree and not a string. At once where the grammar is loaded, a promise the first time.
 */
export const highlightToNodes = (code: string, language: string, options: TanreiHighlightOutput = {}): TanreiCodeNode[] | Promise<TanreiCodeNode[]> =>
  after(highlight(code, language), (runs) => toNodes(code, runs, options.lines));

/**
 * The code as the inner HTML of its `<code>`, highlighted: escaped text and `<span data-syntax="…">` runs — and, with
 * `lines`, the lines (see `TanreiHighlightOutput`). For where a page is made (a build, a server, a Markdown step):
 * write it into `<code data-syntax-of="…">` and the element draws it as it is and loads no highlighter (COD-29). A
 * language that is not known gives the code escaped and plain. At once where the grammar is loaded, a promise the
 * first time.
 */
export const highlightToHtml = (code: string, language: string, options: TanreiHighlightOutput = {}): string | Promise<string> =>
  after(highlightToNodes(code, language, options), (nodes) => nodes.map(serialize).join(''));

// The fold: from a grammar's dotted scope names to the roles, for a product that brings a highlighter
// of such names. Rows in order; the first row one of whose prefixes begins the scope decides.
const FOLD: readonly (readonly [string, string])[] = [
  ['comment', 'comment punctuation.definition.comment'],
  ['constant', 'constant.character.escape constant.numeric constant.language constant.other keyword.other.unit support.constant variable.other.constant variable.other.enummember'],
  ['string', 'string punctuation.definition.string markup.inline.raw markup.raw'],
  ['tag', 'entity.name.tag support.class.component meta.selector'],
  ['property', 'entity.other.attribute-name support.type.property-name meta.property-name meta.object-literal.key variable.other.property variable.other.object.property support.type.vendored.property-name variable.parameter.option'],
  // A decorator's name is a keyword, though it is a function's name.
  ['keyword', 'entity.name.function.decorator'],
  ['function', 'entity.name.function support.function variable.function meta.function-call.generic'],
  ['type', 'entity.name.type entity.name.class entity.name.namespace entity.other.inherited-class support.type support.class storage.type.primitive storage.type.built-in keyword.type'],
  ['', 'keyword.operator'],
  ['keyword', 'keyword storage variable.language meta.decorator punctuation.decorator markup.heading'],
  ['punctuation', 'punctuation meta.brace meta.delimiter'],
  ['', 'variable meta source text markup invalid'],
];
const begins = (scope: string, prefixes: string) => prefixes.split(' ').some((prefix) => scope === prefix || scope.startsWith(`${prefix}.`));

/**
 * The role of a token whose grammar names it by dotted scopes: `scopes` is the token's scope or its scopes from the
 * outermost to the most specific, `text` its characters (an operator written as a word is a keyword, one written as a
 * sign is plain). The most specific scope is tried first, then the one around it; `'plain'` where none decides.
 */
export function foldScope(scopes: string | readonly string[], text = ''): string {
  const list = typeof scopes === 'string' ? [scopes] : scopes;
  const sheet = list.some((scope) => /^source\.(?:css|scss|less)\b/.test(scope));
  for (let i = list.length - 1; i >= 0; i--) {
    const scope = list[i];
    // In a style sheet a class, an id and a pseudo-class are what the sheet addresses: a tag, not a property.
    if (sheet && begins(scope, 'entity.other.attribute-name')) return 'tag';
    const row = FOLD.find(([, prefixes]) => begins(scope, prefixes));
    if (!row) continue;
    if (row[1] === 'keyword.operator') return /^[A-Za-z]+$/.test(text) ? 'keyword' : 'plain';
    return row[0] || 'plain';
  }
  return 'plain';
}

// The core languages (COD-27): those a product built with Tanrei writes and documents. tsx and jsx are the typescript
// and javascript grammars with markup switched on, not grammars of their own.
registerLanguage(['markup', 'html', 'xml', 'svg'], () => import('./grammars/markup.js'));
registerLanguage('css', () => import('./grammars/css.js'));
registerLanguage(['javascript', 'js', 'mjs', 'cjs'], () => import('./grammars/javascript.js').then((m) => m.javascript));
registerLanguage('jsx', () => import('./grammars/javascript.js').then((m) => m.jsx));
registerLanguage(['typescript', 'ts'], () => import('./grammars/typescript.js').then((m) => m.typescript));
registerLanguage('tsx', () => import('./grammars/typescript.js').then((m) => m.tsx));
registerLanguage(['json', 'jsonc'], () => import('./grammars/json.js'));
registerLanguage(['shell', 'sh', 'bash', 'zsh'], () => import('./grammars/shell.js'));
registerLanguage('swift', () => import('./grammars/swift.js'));
registerLanguage(['kotlin', 'kt'], () => import('./grammars/kotlin.js'));
registerLanguage('dart', () => import('./grammars/dart.js'));
