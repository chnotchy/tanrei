// The shell (sh, bash, zsh). A line is a command and its arguments: the command's name is a function — it is what is
// called — an option is a property, a quoted text a string, a number a constant, the shell's own words keywords;
// variables and the signs between commands are plain. It reads two states in turn: where a command is expected, and
// its arguments, which end at the line's end or at a sign that begins another command.
//
// What it does not know: a here-document's text is read as commands, and a command that follows an assignment on the
// same line is read as an argument.
import type { TanreiGrammar, TanreiGrammarRule } from '../index.js';

const VARIABLE = '\\$\\{[^}\\n]*\\}?|\\$[A-Za-z_]\\w*|\\$[\\d@*#?$!-]';
const common: TanreiGrammarRule[] = [
  { match: '[ \\t]+' },
  { match: '\\\\\\n?' },
  { match: '#[^\\n]*', role: 'comment' },
  { match: "'[^']*'?", role: 'string' },
  { match: '\\$?"', role: 'string', push: 'double' },
  { match: '`[^`]*`?', role: 'string' },
  { match: '\\$\\(|\\(', role: 'punctuation', push: 'command' },
  { match: '\\)', role: 'punctuation', pop: true },
  { match: VARIABLE },
];

const shell: TanreiGrammar = {
  states: {
    command: [
      { match: '\\n+' },
      ...common,
      { match: '(?:if|then|else|elif|fi|do|done|while|until|esac|time)(?![\\w.-])', role: 'keyword' },
      { match: '(?:for|case|in|function|select|return|exit|export|local|readonly|declare|typeset|unset|source|alias|break|continue|shift|eval|exec|trap|set)(?![\\w.-])', role: 'keyword', next: 'arguments' },
      { match: '([A-Za-z_][\\w-]*)(\\(\\))', role: ['function', 'punctuation'] },
      { match: '([A-Za-z_]\\w*)(\\+?=)', role: ['', ''], next: 'arguments' },
      { match: '[;&|!{}]+' },
      { match: '[^\\s|&;()<>"\'`$#=]+', role: 'function', next: 'arguments' },
      { match: '[<>=]+' },
    ],
    arguments: [
      { match: '\\n', next: 'command' },
      ...common,
      { match: ';;?', role: 'punctuation', next: 'command' },
      { match: '\\|\\|?|&&', next: 'command' },
      { match: 'in(?![\\w.-])', role: 'keyword' },
      { match: '--?[A-Za-z][\\w-]*', role: 'property' },
      { match: '\\d+(?![\\w.:/-])', role: 'constant' },
      { match: '[<>&=]+' },
      { match: '[^\\s|&;()<>"\'`$=]+' },
    ],
    double: [
      { match: '[^"\\\\$`]+', role: 'string' },
      { match: '\\\\[\\s\\S]', role: 'constant' },
      { match: '\\$\\(', role: 'punctuation', push: 'command' },
      { match: VARIABLE },
      { match: '"', role: 'string', pop: true },
      { match: '[$`]', role: 'string' },
    ],
  },
};
export default shell;
