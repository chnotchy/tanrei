// The English word pack: `@tanrei/web/words/en`. Importing it sets the product's words, once for the document, to a
// word for every key in plain English; it also exports the same words, for a product that starts from them.
//
//   import '@tanrei/web/words/en';                              every key, in English
//   setWords({ requiredText: 'Mandatory' });                    after it: a product's own word for a key wins
//
// These are the product's words set once, written by Tanrei for a product that chooses them: not a fallback, and
// nothing imports this module on a product's behalf — not the package's entry, not a component, not a stylesheet, not
// the element's `lang`. A component that is given no word behaves as it does without the pack. An instance's own prop
// still wins. The words are generated from `specs/words/en.json`, which has a word for every key the specs declare.
import { englishWords } from '../generated/words-en.js';
import { setWords } from '../primitives/words.js';

export { englishWords };

setWords(englishWords);
