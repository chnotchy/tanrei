// Dart. A name that begins with a capital is a type (and so a call that makes one — a widget); a name that is called
// is a function; a member is a property; annotations are keywords. Braces are counted, so that the one that ends an
// interpolation in a string is found.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';
import { BLOCK_COMMENT, CONSTANT, LINE_COMMENT, PUNCTUATION, SPACE, comment, number, quoted, words } from './shared.js';

const NAME = '[A-Za-z_$][\\w$]*';
const INTERPOLATION: TanreiGrammarRule[] = [
  { match: '\\$\\{', role: 'punctuation', push: 'main' },
  { match: '\\$[A-Za-z_]\\w*' },
];
/** A string of several lines. */
const text = (quotes: string, quote: string): TanreiGrammarRule[] => [
  { match: `[^${quote}\\\\$]+`, role: 'string' },
  { match: '\\\\[\\s\\S]', role: 'constant' },
  ...INTERPOLATION,
  { match: quotes, role: 'string', pop: true },
  { match: `[${quote}$]`, role: 'string' },
];

const dart: TanreiGrammar = {
  states: {
    main: [
      SPACE,
      LINE_COMMENT,
      BLOCK_COMMENT,
      // A raw string holds no escape and no interpolation.
      { match: 'r"[^"\\n]*"?|r\'[^\'\\n]*\'?', role: 'string' },
      { match: '"""', role: 'string', push: 'double-text' },
      { match: "'''", role: 'string', push: 'single-text' },
      { match: '"', role: 'string', push: 'double' },
      { match: "'", role: 'string', push: 'single' },
      number(),
      { match: '@[A-Za-z_$][\\w$.]*', role: 'keyword' },
      { match: `(\\??\\.)(${NAME})(?=\\s*\\()`, role: ['punctuation', 'function'] },
      { match: `(\\??\\.)(${NAME})`, role: ['punctuation', 'property'] },
      { match: words('true|false|null'), role: 'constant' },
      {
        match: words(
          'abstract|as|assert|async|await|base|break|case|catch|class|const|continue|covariant|default|deferred|do|dynamic|else|enum|export|extends|extension|external|factory|final|finally|for|get|hide|if|implements|import|in|interface|is|late|library|mixin|new|on|operator|part|required|rethrow|return|sealed|set|show|static|super|switch|sync|this|throw|try|typedef|var|void|when|while|with|yield',
        ),
        role: 'keyword',
      },
      CONSTANT,
      { match: `${words('bool|double|int|num')}|[A-Z][\\w$]*`, role: 'type' },
      { match: `${NAME}(?=\\s*\\()`, role: 'function' },
      { match: NAME },
      { match: '\\{', role: 'punctuation', push: 'main' },
      { match: '\\}', role: 'punctuation', pop: true },
      ...PUNCTUATION,
      { match: '[=+\\-*/%!&|^~?<>]+' },
    ],
    comment: comment(true),
    double: quoted('"', INTERPOLATION, '$'),
    single: quoted("'", INTERPOLATION, '$'),
    'double-text': text('"""', '"'),
    'single-text': text("'''", "'"),
  },
};
export default dart;
