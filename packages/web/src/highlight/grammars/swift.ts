// Swift. A name that begins with a capital is a type (a structure, a class, a protocol — and so a call that makes
// one); a name that is called is a function; a member is a property; attributes and compiler directives are keywords.
// Parentheses are counted, so that the one that ends an interpolation in a string is found.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';
import { BLOCK_COMMENT, CONSTANT, LINE_COMMENT, SPACE, comment, number, quoted, words } from './shared.js';

const NAME = '[A-Za-z_]\\w*';
const INTERPOLATION: TanreiGrammarRule = { match: '\\\\\\(', role: 'punctuation', push: 'main' };

const swift: TanreiGrammar = {
  states: {
    main: [
      SPACE,
      LINE_COMMENT,
      BLOCK_COMMENT,
      { match: '"""', role: 'string', push: 'text' },
      { match: '"', role: 'string', push: 'string' },
      number(),
      { match: '[@#][A-Za-z_]\\w*', role: 'keyword' },
      { match: `(\\.)(${NAME})(?=\\s*\\()`, role: ['punctuation', 'function'] },
      { match: `(\\.)(${NAME})`, role: ['punctuation', 'property'] },
      { match: `(func)(\\s+)(${NAME})`, role: ['keyword', '', 'function'] },
      { match: `(class|struct|enum|protocol|extension|actor|typealias|associatedtype|import)(\\s+)(${NAME})`, role: ['keyword', '', 'type'] },
      { match: words('true|false|nil'), role: 'constant' },
      {
        match: words(
          'actor|any|as|associatedtype|async|await|borrowing|break|case|catch|class|consuming|continue|convenience|default|defer|deinit|didSet|do|dynamic|else|enum|extension|fallthrough|fileprivate|final|for|func|get|guard|if|import|in|indirect|infix|init|inout|internal|is|isolated|lazy|let|macro|mutating|nonisolated|nonmutating|open|operator|optional|override|postfix|precedencegroup|prefix|private|protocol|public|repeat|required|rethrows|return|self|Self|set|some|static|struct|subscript|super|switch|throw|throws|try|typealias|unowned|var|weak|where|while|willSet',
        ),
        role: 'keyword',
      },
      CONSTANT,
      { match: '[A-Z]\\w*', role: 'type' },
      { match: `${NAME}(?=\\s*\\()`, role: 'function' },
      { match: NAME },
      { match: '\\(', role: 'punctuation', push: 'main' },
      { match: '\\)', role: 'punctuation', pop: true },
      { match: '[{}\\[\\],;:]+', role: 'punctuation' },
      { match: '\\.', role: 'punctuation' },
      { match: '[=+\\-*/%!&|^~?<>]+' },
    ],
    comment: comment(true),
    string: quoted('"', [INTERPOLATION]),
    // A string of several lines.
    text: [
      { match: '[^"\\\\]+', role: 'string' },
      INTERPOLATION,
      { match: '\\\\[\\s\\S]', role: 'constant' },
      { match: '"""', role: 'string', pop: true },
      { match: '"', role: 'string' },
    ],
  },
};
export default swift;
