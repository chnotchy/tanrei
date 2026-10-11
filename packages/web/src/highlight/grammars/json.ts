// JSON, and JSON with comments: keys are properties, their values strings and constants, so a configuration file reads
// as plain keys and colored values.
import type { TanreiGrammar } from '../index.js';
import { BLOCK_COMMENT, LINE_COMMENT, SPACE, comment, quoted, words } from './shared.js';

const json: TanreiGrammar = {
  states: {
    main: [
      SPACE,
      { match: '"(?:[^"\\\\\\n]|\\\\.)*"(?=\\s*:)', role: 'property' },
      { match: '"', role: 'string', push: 'string' },
      { match: '-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?', role: 'constant' },
      { match: words('true|false|null'), role: 'constant' },
      { match: '[{}\\[\\],:]+', role: 'punctuation' },
      LINE_COMMENT,
      BLOCK_COMMENT,
    ],
    string: quoted('"'),
    comment: comment(),
  },
};
export default json;
