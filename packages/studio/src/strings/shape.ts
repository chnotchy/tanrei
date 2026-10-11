// The shape of a dictionary of the Theme Studio. English (./en.ts) is the source: its keys are the keys, and the two
// types below are read off it — one for a language's file, one for the code that reads the words.
//
// A leaf is a string, a pair of strings (a name and its note), or a function: a sentence that holds a number or a
// name is a function of it, so that each language puts the value where its grammar wants it and chooses its own
// plural form. A string may hold `{place}` marks that the caller fills (`.replace('{id}', …)`); every language keeps
// the same marks.

declare const OPEN: unique symbol;
type Pair = readonly [string, string];
type Sentence = (...values: never[]) => string;
type Leaf<V> = V extends Sentence ? V : V extends Pair ? [string, string] : string;
type Named<T> = Exclude<keyof T, typeof OPEN>;

/** A map the code reads by a key it computes (a dial's key, an operation's name, a save state). */
export type OpenMap<T> = T & { readonly [OPEN]: true };
/**
 * Marks such a map in English. The code may ask it for any key (and falls back when there is none), but a language
 * still has to give exactly the keys English gives.
 */
export const open = <const T extends Record<string, string | Pair>>(map: T) => map as unknown as OpenMap<{ -readonly [K in keyof T]: Leaf<T[K]> }>;

/**
 * What a language's file must be: exactly the keys of English, at every depth, each of the same kind. A missing key
 * and a key English does not have are both type errors (`pnpm --filter @tanrei/studio typecheck`).
 */
export type Exactly<T> = { [K in Named<T>]: T[K] extends string | Sentence | Pair ? Leaf<T[K]> : Exactly<T[K]> };

/** What the Studio's code reads: the same tree, with the marked maps open to any key. */
export type Reading<T> = {
  [K in keyof T]: T[K] extends string | Sentence | Pair ? Leaf<T[K]> : typeof OPEN extends keyof T[K] ? Record<string, Leaf<T[K][Named<T[K]>]>> : Reading<T[K]>;
};
