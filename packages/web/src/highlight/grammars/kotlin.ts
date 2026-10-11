// Kotlin. A name that begins with a capital is a type (and so a call that makes one, or a composable); a name that is
// called is a function; a member is a property; annotations are keywords. Braces are counted, so that the one that
// ends a template in a string is found.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';
import { BLOCK_COMMENT, CONSTANT, LINE_COMMENT, PUNCTUATION, SPACE, comment, number, quoted, words } from './shared.js';

const NAME = '[A-Za-z_]\\w*';
const TEMPLATE: TanreiGrammarRule[] = [
  { match: '\\$\\{', role: 'punctuation', push: 'main' },
  { match: `\\$${NAME}` },
];

const kotlin: TanreiGrammar = {
  states: {
    main: [
      SPACE,
      LINE_COMMENT,
      BLOCK_COMMENT,
      { match: '"""', role: 'string', push: 'raw' },
      { match: '"', role: 'string', push: 'string' },
      { match: "'(?:[^'\\\\\\n]|\\\\.)*'?", role: 'string' },
      number('[fFLuU]*'),
      { match: '@[A-Za-z_][\\w:.]*', role: 'keyword' },
      { match: `(\\??\\.|::)(${NAME})(?=\\s*[({])`, role: ['punctuation', 'function'] },
      { match: `(\\??\\.|::)(${NAME})`, role: ['punctuation', 'property'] },
      { match: '(package|import)([ \\t]+)([\\w.*]+)', role: ['keyword', '', ''] },
      { match: `(fun)(\\s+)(${NAME})(?=\\s*[(<])`, role: ['keyword', '', 'function'] },
      { match: `(class|interface|object|typealias)(\\s+)(${NAME})`, role: ['keyword', '', 'type'] },
      { match: words('true|false|null'), role: 'constant' },
      {
        match: words(
          'abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|do|else|enum|expect|external|final|finally|for|fun|if|import|in|infix|init|inline|inner|interface|internal|is|lateinit|noinline|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|super|suspend|tailrec|this|throw|try|typealias|val|var|vararg|when|where|while',
        ),
        role: 'keyword',
      },
      { match: '(?:data|value)(?=\\s+(?:class|object))', role: 'keyword' },
      CONSTANT,
      { match: '[A-Z]\\w*', role: 'type' },
      // Called — with arguments, or with a lambda alone.
      { match: `${NAME}(?=\\s*[({])`, role: 'function' },
      { match: NAME },
      { match: '\\{', role: 'punctuation', push: 'main' },
      { match: '\\}', role: 'punctuation', pop: true },
      ...PUNCTUATION,
      { match: '[=+\\-*/%!&|^~?<>]+' },
    ],
    comment: comment(true),
    string: quoted('"', TEMPLATE, '$'),
    // A raw string: no escapes, several lines.
    raw: [{ match: '[^"$]+', role: 'string' }, ...TEMPLATE, { match: '"""', role: 'string', pop: true }, { match: '["$]', role: 'string' }],
  },
};
export default kotlin;
