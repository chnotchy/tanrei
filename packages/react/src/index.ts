export * from './generated/components.js';
// What an `on…` prop of a wrapper receives: the element's event, with `currentTarget` typed as the element.
export type { TanreiEvent } from './events.js';
// The product's words: Tanrei ships none, and a React product gives its own the same way — once, before it renders.
export { type TanreiWords, type WordKey, missingWords, setWords } from '@tanrei/web/words';
