// The product's words: `@tanrei/web/words` is the two functions alone, without defining an element.
// Tanrei ships no words; a product gives its own once — `setWords({ requiredText: 'Required', closeLabel: 'Close' })`,
// per language with `{ lang }` — or on an instance, by its prop.
export { type TanreiWords, type WordKey, missingWords, setWords } from './primitives/words.js';
export { type WordPlace, wordKeys, wordPlaces, wordReaders } from './generated/words.js';
