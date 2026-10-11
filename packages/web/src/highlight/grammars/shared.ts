// What the grammars share: small pieces of data, written once. (Patterns are sources of regular expressions, kept to
// what every platform's engine reads alike: no look behind, no reference back to a group, no repetition in a repeated
// group — src/highlight/index.ts, `checkGrammar`.)
import type { TanreiGrammarRule } from '../index.js';

type Rules = readonly TanreiGrammarRule[];

/** One of these words, whole. */
export const words = (list: string) => `(?:${list})(?![\\w$])`;

/** A name, as most languages write one. */
export const NAME = '[A-Za-z_$][\\w$]*';

/** A constant by the way it is written: capitals, with an underscore. */
export const CONSTANT: TanreiGrammarRule = { match: '[A-Z][A-Z\\d]*_[A-Z\\d_]*(?![\\w$])', role: 'constant' };
/** The signs that are punctuation — brackets and separators; a period apart, so that a member's rule is tried at it. */
export const PUNCTUATION: TanreiGrammarRule[] = [{ match: '[()\\[\\],;:]+', role: 'punctuation' }, { match: '\\.', role: 'punctuation' }];

export const SPACE: TanreiGrammarRule = { match: '\\s+' };
export const LINE_COMMENT: TanreiGrammarRule = { match: '//[^\\n]*', role: 'comment' };
/** Where a block comment begins; `comment` is the state that reads it. */
export const BLOCK_COMMENT: TanreiGrammarRule = { match: '/\\*', role: 'comment', push: 'comment' };

/** The state that reads a block comment to its end — or to the end of the code, where it is not closed. `nested`: a comment may hold another. */
export const comment = (nested = false): Rules => [
  ...(nested ? [BLOCK_COMMENT] : []),
  { match: '\\*/', role: 'comment', pop: true },
  { match: '[^*/]+|[*/]', role: 'comment' },
];

/**
 * The state that reads a quoted string to its closing quote — or to the end of its line, where it is not closed: text
 * is a string, an escape is a constant (an escape is a value, not text), and `inside` are the rules for what the
 * language lets a string hold (an interpolation). `stop` are the characters those rules begin with.
 */
export const quoted = (quote: string, inside: Rules = [], stop = ''): Rules => [
  { match: `[^${quote}\\\\\\n${stop}]+`, role: 'string' },
  ...inside,
  { match: '\\\\[\\s\\S]', role: 'constant' },
  { match: quote, role: 'string', pop: true },
  { match: '\\n', pop: true },
  ...(stop ? [{ match: `[${stop}]`, role: 'string' }] : []),
];

/** Numbers as the C family writes them: hexadecimal, binary, octal, decimal with a fraction and an exponent, digits grouped by `_`, and the letters of `suffix` after. */
export const number = (suffix = ''): TanreiGrammarRule => ({
  match: `(?:0[xX][\\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\\d[\\d_]*(?:\\.\\d[\\d_]*)?|\\.\\d[\\d_]*)(?:[eE][+-]?\\d+)?)${suffix}(?![\\w$])`,
  role: 'constant',
});
