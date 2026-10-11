// Style sheets. What a sheet addresses — an element, a class, an id, a pseudo-class — is a tag; a declaration's
// property and a custom property are properties; numbers with their units and color values are constants; at-rules
// are keywords. Rules may be nested: inside braces a name followed by a colon is a declaration's property where a
// semicolon, a closing brace or the end of the line comes before any opening brace, and a selector otherwise.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';
import { BLOCK_COMMENT, SPACE, comment } from './shared.js';

const STRING: TanreiGrammarRule = { match: '"(?:[^"\\\\\\n]|\\\\.)*"?|\'(?:[^\'\\\\\\n]|\\\\.)*\'?', role: 'string' };
const NUMBER: TanreiGrammarRule = { match: '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?(?:%|[A-Za-z]+)?', role: 'constant' };
const IDENT = '-?[A-Za-z_][\\w-]*';

const css: TanreiGrammar = {
  states: {
    main: [
      SPACE,
      BLOCK_COMMENT,
      { match: '@[\\w-]+', role: 'keyword', push: 'prelude' },
      { match: `(--[\\w-]+|${IDENT})(\\s*)(:)(?=[^;{}\\n]{0,200}(?:[;}]|[^,{\\s][ \\t]*$))`, role: ['property', '', 'punctuation'], push: 'value' },
      { match: `[.#]${IDENT}|::?${IDENT}|${IDENT}|[&*]`, role: 'tag' },
      { match: '\\[', role: 'punctuation', push: 'attribute' },
      { match: '\\{', role: 'punctuation', push: 'main' },
      { match: '\\}', role: 'punctuation', pop: true },
      { match: '[(),;]+', role: 'punctuation' },
      NUMBER,
      STRING,
      { match: '[\\w-]+' },
    ],
    comment: comment(),
    // After an at-rule's name, up to its block or its semicolon: a query, a name, a string.
    prelude: [
      SPACE,
      BLOCK_COMMENT,
      STRING,
      NUMBER,
      { match: `${IDENT}(?=\\s*:)|--[\\w-]+`, role: 'property' },
      { match: `${IDENT}(?=\\()`, role: 'function' },
      { match: IDENT },
      { match: '[(),:.]+', role: 'punctuation' },
      { match: ';', role: 'punctuation', pop: true },
      { match: '\\{', role: 'punctuation', next: 'main' },
      { match: '(?=\\})', pop: true },
    ],
    // A declaration's value, up to its semicolon or the brace that ends its block.
    value: [
      SPACE,
      BLOCK_COMMENT,
      STRING,
      { match: '#[\\da-fA-F]{3,8}(?![\\w-])', role: 'constant' },
      NUMBER,
      { match: '![\\w-]+', role: 'keyword' },
      { match: '--[\\w-]+', role: 'property' },
      { match: `${IDENT}(?=\\()`, role: 'function' },
      { match: IDENT },
      { match: '[(),]+', role: 'punctuation' },
      { match: ';', role: 'punctuation', pop: true },
      { match: '(?=[{}])', pop: true },
    ],
    // An attribute selector.
    attribute: [SPACE, STRING, { match: IDENT, role: 'property' }, { match: '\\]', role: 'punctuation', pop: true }, { match: '(?=[{}])', pop: true }],
  },
};
export default css;
