// JavaScript — and, with `types`, TypeScript; with `markup`, the markup both may hold (jsx, tsx). One grammar with two
// switches, not four grammars.
//
// What it does not know, and draws quietly wrong: whether a slash begins a regular expression is decided by what
// stands before it (a sign, a bracket, one of a few words, the start of a line); whether `<` opens a tag by what stands
// after it; an object's keys and a function's parameters are plain, as variables are.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';
import { BLOCK_COMMENT, CONSTANT, LINE_COMMENT, NAME, PUNCTUATION, SPACE, comment, number, quoted, words } from './shared.js';

const REGEX = '/(?![/*\\s])(?:[^/\\\\\\n]|\\\\.)+/[a-z]*';
const TAG = '[A-Za-z_$][\\w$.:-]*';
const BUILT_IN = words('any|bigint|boolean|never|number|object|string|symbol|unknown');
const STRINGS: TanreiGrammarRule[] = [
  { match: '"', role: 'string', push: 'double' },
  { match: "'", role: 'string', push: 'single' },
  { match: '`', role: 'string', push: 'template' },
];
const OPEN: TanreiGrammarRule = { match: '\\{', role: 'punctuation', push: 'main' };

export function script(types: boolean, markup: boolean): TanreiGrammar {
  const tags: TanreiGrammarRule[] = [
    { match: `(<)(${TAG})(?=[\\s/>])`, role: ['punctuation', 'tag'], push: 'tag' },
    { match: '<>', role: 'punctuation', push: 'children' },
  ];
  return {
    states: {
      main: [
        // A regular expression: where a value may begin.
        { match: `(\\n[ \\t]*)(${REGEX})`, role: ['', 'string'] },
        // (Line breaks one at a time, so that the rule above is tried at each.)
        { match: '[^\\S\\n]+|\\n' },
        LINE_COMMENT,
        BLOCK_COMMENT,
        ...STRINGS,
        { match: `([(,;:\\[])(\\s*)(${REGEX})`, role: ['punctuation', '', 'string'] },
        { match: `([=!&|?+\\-*%<>~^]+)(\\s*)(${REGEX})`, role: ['', '', 'string'] },
        { match: `(return|typeof|case|do|else|in|of|void|delete|throw|yield|await)(\\s*)(${REGEX})`, role: ['keyword', '', 'string'] },
        ...(markup ? tags : []),
        number('n?'),
        { match: '@[A-Za-z_$][\\w$.]*', role: 'keyword' },
        { match: '\\.\\.\\.' },
        // A member: called, it is a function; otherwise a property. Before the words, so that `a.delete` is not a keyword.
        ...(types
          ? [
              { match: `(\\??\\.)([A-Z][\\w$]*)(<)`, role: ['punctuation', 'type', ''], push: 'generic' },
              { match: `(\\??\\.)(#?${NAME})(<)(?=[^<>()]{0,60}>\\s*\\()`, role: ['punctuation', 'function', ''], push: 'generic' },
            ]
          : []),
        { match: `(\\??\\.)(#?${NAME})(?=\\s*\\()`, role: ['punctuation', 'function'] },
        { match: `(\\??\\.)(#?${NAME})`, role: ['punctuation', 'property'] },
        // A word that names what follows it.
        { match: `(function)(?![\\w$])(\\s*\\*?\\s*)(${NAME})?`, role: ['keyword', '', 'function'] },
        { match: `(class|extends|instanceof|new${types ? '|interface|enum|namespace|implements' : ''})(\\s+)(${NAME})`, role: ['keyword', '', 'type'] },
        ...(types ? [{ match: `(type)(\\s+)(${NAME})(?=\\s*[=<])`, role: ['keyword', '', 'type'] }] : []),
        { match: words('true|false|null|undefined|NaN|Infinity'), role: 'constant' },
        CONSTANT,
        {
          match: words(
            `async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|static|super|switch|this|throw|try|typeof|var|void|while|with|yield${
              types ? '|abstract|declare|enum|implements|interface|keyof|namespace|override|private|protected|public|readonly|satisfies' : ''
            }`,
          ),
          role: 'keyword',
        },
        ...(types
          ? [
              { match: BUILT_IN, role: 'type' },
              { match: `(${NAME})(<)(?=[^<>()]{0,60}>\\s*\\()`, role: ['function', ''], push: 'generic' },
              { match: '([A-Z][\\w$]*)(<)', role: ['type', ''], push: 'generic' },
            ]
          : []),
        { match: `${NAME}(?=\\s*\\()`, role: 'function' },
        // Words that are the language's only where something follows them.
        { match: `(?:as|from|get|of|set${types ? '|asserts|infer|is|out|type' : ''})(?=\\s+[\\w$\\[{'"*\`])`, role: 'keyword' },
        { match: '[A-Z][\\w$]*', role: 'type' },
        { match: NAME },
        // Braces are counted, so that the one that ends an interpolation is found.
        OPEN,
        { match: '\\}', role: 'punctuation', pop: true },
        ...PUNCTUATION,
        { match: '[=+\\-*/%!&|^~?<>]+' },
      ],
      comment: comment(),
      double: quoted('"'),
      single: quoted("'"),
      template: [
        { match: '[^`\\\\$]+', role: 'string' },
        { match: '\\\\[\\s\\S]', role: 'constant' },
        { match: '\\$\\{', role: 'punctuation', push: 'main' },
        { match: '`', role: 'string', pop: true },
        { match: '\\$', role: 'string' },
      ],
      // The arguments of a generic type: left at the first thing that cannot be one.
      generic: [
        SPACE,
        { match: '>', pop: true },
        { match: '<', push: 'generic' },
        { match: '=>|[|&?]+' },
        { match: '[,:.\\[\\]()]+', role: 'punctuation' },
        { match: words('extends|keyof|typeof|infer|in|readonly|is|new|void'), role: 'keyword' },
        { match: words('true|false|null|undefined'), role: 'constant' },
        ...STRINGS,
        number(),
        OPEN,
        { match: NAME, role: 'type' },
        { match: '(?=[\\s\\S])', pop: true },
      ],
      // Inside a tag: attributes, and values that are strings or code in braces.
      tag: [
        SPACE,
        { match: '[A-Za-z_$][\\w$:-]*', role: 'property' },
        { match: '=', role: 'punctuation' },
        { match: '"[^"]*"?|\'[^\']*\'?', role: 'string' },
        OPEN,
        { match: '/>', role: 'punctuation', pop: true },
        { match: '>', role: 'punctuation', next: 'children' },
      ],
      // Between a tag and its end: text, more tags, and code in braces.
      children: [
        { match: `(</)(${TAG})?(\\s*>)`, role: ['punctuation', 'tag', 'punctuation'], pop: true },
        { match: `(<)(${TAG})`, role: ['punctuation', 'tag'], push: 'tag' },
        { match: '<>', role: 'punctuation', push: 'children' },
        OPEN,
        { match: '&[#\\w]+;', role: 'constant' },
        { match: '[^<{&]+' },
      ],
    },
  };
}

export const javascript = script(false, false);
export const jsx = script(false, true);
