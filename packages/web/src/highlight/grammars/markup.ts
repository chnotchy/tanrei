// Markup: HTML, XML and SVG. An element's name is a tag, an attribute's name a property, its value a string, the
// brackets and the equals sign punctuation, a character reference a constant; the text between tags is plain. What a
// `script` or a `style` element holds is drawn plain — it is another language, and this grammar reads one.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';

const NAME = '[A-Za-z_][\\w:.-]*';
const inTag = (close: TanreiGrammarRule): TanreiGrammarRule[] => [
  { match: '\\s+' },
  { match: '[^\\s"\'<>/=]+', role: 'property' },
  { match: '(=)(\\s*)([^\\s"\'<>=`]+)', role: ['punctuation', '', 'string'] },
  { match: '=', role: 'punctuation' },
  { match: '"[^"]*"?|\'[^\']*\'?', role: 'string' },
  { match: '/>', role: 'punctuation', pop: true },
  close,
  { match: '/' },
  { match: '(?=<)', pop: true },
];
/** The text of an element that holds another language: plain, up to the element's end tag. */
const raw = (name: string): TanreiGrammarRule[] => [{ match: `(?=</${name}(?![\\w:.-]))`, pop: true }, { match: '[^<]+|<' }];

const markup: TanreiGrammar = {
  ignoreCase: true,
  states: {
    main: [
      { match: '<!--', role: 'comment', push: 'comment' },
      { match: '<!\\[CDATA\\[', role: 'punctuation', push: 'cdata' },
      // A document type, a processing instruction: the language's own words.
      { match: '<[!?][^>]*>?', role: 'keyword' },
      { match: '(<)(script)(?![\\w:.-])', role: ['punctuation', 'tag'], push: 'script-tag' },
      { match: '(<)(style)(?![\\w:.-])', role: ['punctuation', 'tag'], push: 'style-tag' },
      { match: `(</?)(${NAME})`, role: ['punctuation', 'tag'], push: 'tag' },
      { match: '&[#\\w]+;', role: 'constant' },
      { match: '[^<&]+|[<&]' },
    ],
    comment: [
      { match: '-->', role: 'comment', pop: true },
      { match: '[^-]+|-', role: 'comment' },
    ],
    cdata: [
      { match: '\\]\\]>', role: 'punctuation', pop: true },
      { match: '[^\\]]+|\\]' },
    ],
    tag: inTag({ match: '>', role: 'punctuation', pop: true }),
    'script-tag': inTag({ match: '>', role: 'punctuation', next: 'script' }),
    'style-tag': inTag({ match: '>', role: 'punctuation', next: 'style' }),
    script: raw('script'),
    style: raw('style'),
  },
};
export default markup;
