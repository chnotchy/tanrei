// The product's words: `@tanrei/web/words` is the two functions alone, without defining an element.
// No component has words of its own; a product gives its own once — `setWords({ requiredText: 'Required', closeLabel: 'Close' })`,
// per language with `{ lang }` — or on an instance, by its prop, or imports the English word pack, `@tanrei/web/words/en`.
export { type TanreiWords, type WordKey, missingWords, setWords } from './primitives/words.js';
export { type WordPlace, wordKeys, wordPlaces, wordReaders } from './generated/words.js';
