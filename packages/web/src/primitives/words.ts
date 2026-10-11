import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { type TanreiWords, type WordKey, wordKeys, wordPlaces } from '../generated/words.js';
import { placeFaults } from './places.js';
import { debugBuild } from './report.js';

// The product's words. Tanrei ships no words: a word a component draws or exposes is the
// instance's own prop, else what the product said once for every component — here — else nothing. The keys are the
// specs' (`words` on a prop), generated into `src/generated/words.ts`; nothing in this file names one.
//
//   setWords({ requiredText: 'Required', closeLabel: 'Close' })        the document's set
//   setWords({ requiredText: '必須', closeLabel: '閉じる' }, { lang: 'ja' })   the set of the elements under lang="ja"
//
// The lookup one element makes, key by key: its own prop; else the set of its nearest `lang` attribute (the calendar
// finds its locale the same way: through shadow roots, `ja-JP` reading the set given for `ja` where none was given for
// `ja-JP`); else the document's set; else nothing. A word nobody gave is recorded (`missingWords()`) and, in a debug
// build, reported once per key and page.
//
// A word with places a component fills (`wordPlaces` of the generated file) is read once when it is given, in
// a debug build: a mistyped place (`{entri}`), a brace that opens or closes nothing and a needed place that is absent
// are reported there, so that a product's own test finds them without drawing the component. The word is kept as it
// was given all the same, and is not missing: `missingWords()` knows nothing of places.
//
// What is missing is a fact about the page, so only an element that stands in it records one. An element out of the
// page — removed with an update still waiting, or not placed yet — still looks its words up, through whatever is
// around it and then in the document's set, so that what it draws is the best answer there is; but out of the page it
// may no longer be under the `lang` its words were given for, and what it does not find there is recorded by nobody.
// When it is placed, it looks again where it now stands (`WordsController.hostConnected()`).
//
// Nothing here runs at rest. A changed set tells the connected elements once, and each draws itself again; no attribute
// or style of the document is written, so nothing outside those elements is restyled.

export type { TanreiWords, WordKey };

type Host = ReactiveControllerHost & Element;
type WordSet = Map<WordKey, string>;

/**
 * Kept under a registered symbol, not in this module, so that two copies of the module on one page (the bundle and a
 * component imported by its path) hold one set of words.
 */
interface Store {
  /** The document's set. */
  page: WordSet;
  /** The sets by language, each under its tag in lower case. */
  byLang: Map<string, WordSet>;
  /** The connected elements that read words. */
  hosts: Set<Host>;
  /** What is told when a set changes, beside the elements (the link's script). */
  listeners: Set<() => void>;
  /** The keys that were needed and given by nobody. */
  missing: Set<WordKey>;
  /** The keys already reported on this page. */
  reported: Set<WordKey>;
  /** What `setWords()` already said of a word's places on this page; absent in a store an older copy of the module made. */
  placesReported?: Set<string>;
  /** Counts the changes of the sets: what an element found for an earlier count is looked for again. */
  version: number;
}
const STORE = Symbol.for('tanrei.words');
function store(): Store {
  const holder = globalThis as { [STORE]?: Store };
  return (holder[STORE] ??= { page: new Map(), byLang: new Map(), hosts: new Set(), listeners: new Set(), missing: new Set(), reported: new Set(), version: 0 });
}

const KEYS: ReadonlySet<string> = new Set(wordKeys);
const given = (text: string | null | undefined): text is string => typeof text === 'string' && text.trim() !== '';

/**
 * Gives the product's words: once, for every component that reads them. Without `lang` they are the document's set;
 * with it, the set of the elements whose nearest `lang` attribute is that language (`ja` also answers `ja-JP`). A
 * second call for the same set merges key by key, and a key given as the empty string is taken away. Connected
 * elements draw themselves again. An instance's own prop always wins.
 */
export function setWords(words: TanreiWords, options: { lang?: string } = {}): void {
  const held = store();
  const tag = (options.lang ?? '').trim().toLowerCase();
  let set = tag ? held.byLang.get(tag) : held.page;
  if (!set) held.byLang.set(tag, (set = new Map()));
  let changed = false;
  for (const [key, text] of Object.entries(words ?? {}) as [WordKey, unknown][]) {
    if (!KEYS.has(key)) {
      if (debugBuild()) console.warn(`[tanrei] setWords(): "${key}" is not a key of the product's words; it is ignored`);
      continue;
    }
    if (given(text as string)) {
      if (set.get(key) === text) continue;
      checkPlaces(held, key, text as string);
      set.set(key, text as string);
      // Given now: it is missing again only if an element still finds nothing.
      held.missing.delete(key);
    } else if (!set.delete(key)) continue;
    changed = true;
  }
  if (tag && set.size === 0) held.byLang.delete(tag);
  if (!changed) return;
  held.version++;
  for (const host of held.hosts) host.requestUpdate();
  for (const listener of [...held.listeners]) listener();
}

/**
 * In a debug build, what of a given sentence does not fit the places of its key — an unknown place, a
 * brace that opens or closes nothing, a needed place it is without — in one warning, once per key and fault on a page.
 * A key without places is not read at all: its braces are plain text.
 */
function checkPlaces(held: Store, key: WordKey, sentence: string): void {
  const declared = wordPlaces[key];
  if (!declared || !debugBuild()) return;
  const { written, absent } = placeFaults(sentence, declared);
  const faults = [...written, ...absent.map((name) => `is without the place {${name}}, which it needs`)];
  if (faults.length === 0) return;
  const message = `[tanrei] setWords(): ${key} ${faults.join('; and ')}; it is used as it is written`;
  const seen = (held.placesReported ??= new Set());
  if (seen.has(message)) return;
  seen.add(message);
  console.warn(message);
}

/**
 * The keys that were needed since the page loaded and were given by nobody — not by the instance, not by the product's
 * words — in alphabetical order. For a product's own test: `expect(missingWords()).toEqual([])`.
 */
export function missingWords(): WordKey[] {
  return [...store().missing].sort();
}

/** The nearest `lang` attribute around `element`, through shadow roots, in lower case; empty where there is none. */
function nearestLang(element: Element): string {
  for (let at: Node | null = element; at; ) {
    if (at instanceof Element && at.hasAttribute('lang')) return at.getAttribute('lang')!.trim().toLowerCase();
    const root: Node = at.getRootNode();
    at = at instanceof Element && at.parentElement ? at.parentElement : root instanceof ShadowRoot ? root.host : null;
  }
  return '';
}

/** The set given for the language of `element`: for its tag, else for the tag without its last subtags (`ja-jp` → `ja`). */
function langSet(element: Element): WordSet | null {
  const sets = store().byLang;
  if (sets.size === 0) return null;
  for (let tag = nearestLang(element); tag; tag = tag.includes('-') ? tag.slice(0, tag.lastIndexOf('-')) : '') {
    const set = sets.get(tag);
    if (set) return set;
  }
  return null;
}

/**
 * The word `element` draws or exposes for `key`: `own` — its prop — where that is not empty; else the product's words
 * for its language; else the document's; else the empty string. For a script that describes the product's own markup
 * (the link's); a component uses `WordsController`.
 */
export function wordFor(element: Element, key: WordKey, own = ''): string {
  if (given(own)) return own;
  return langSet(element)?.get(key) ?? store().page.get(key) ?? '';
}

/** `fooBarLabel` as the attribute a product writes: `foo-bar-label`. */
const attributeOf = (prop: string) => prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export interface MissingWord {
  /** The prop that reads the key, where its name differs from the key's (a copy button's `label` reads `copyLabel`). */
  prop?: string;
  /** The behaviour id of the sentence that says what happens without the word. */
  id: string;
  /** What is drawn or exposed without it, for the developer: "the asterisk is drawn in the tag's place". */
  effect?: string;
}

/**
 * Records that `key` was needed by `element` and given by nobody (`missingWords()`), and in a debug build reports it —
 * once per key and page, naming the prop. Call it only after `wordFor()` returned nothing, and only
 * where the part that needs the word is drawn. An element that is not in the page records and reports nothing.
 */
export function wordMissing(element: Element, key: WordKey, { prop = key, id, effect }: MissingWord): void {
  if (!element.isConnected) return;
  const held = store();
  held.missing.add(key);
  if (held.reported.has(key) || !debugBuild()) return;
  held.reported.add(key);
  console.warn(`[tanrei] <${element.localName}>: ${attributeOf(prop)} is empty and the product's words have no ${key}${effect ? `: ${effect}` : ''}; give the word on the element, or once with setWords() (${id})`, element);
}

/**
 * Whether nobody gave `element` the word for `key` — and if so, records it for `missingWords()`. For a script that
 * makes a report of its own about the part (the link's, LNK-34): call it only where the word is needed. An element
 * that is not in the page lacks nothing that can be known: false, and nothing is recorded.
 */
export function wordLacking(element: Element, key: WordKey, own = ''): boolean {
  if (wordFor(element, key, own)) return false;
  if (!element.isConnected) return false;
  store().missing.add(key);
  return true;
}

/** Is told whenever a set of words changes; returns what stops it. For a script without elements of its own. */
export function watchWords(listener: () => void): () => void {
  const { listeners } = store();
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * The words of one component: `get(key, this.prop)` where it renders, `missing(key, …)` where it found none and the
 * part is drawn. The host is rendered again when a set changes; the set of its language is found once per render.
 *
 * A host that is not in the page records nothing as missing. What it would have recorded is kept, and asked again
 * where it stands when it is placed; and a host that was drawn out of the page, or stands under another language's
 * set than it was drawn with, is drawn again.
 */
export class WordsController implements ReactiveController {
  private scope: WordSet | null | undefined;
  /** The count of changes `scope` was found at. */
  private found = -1;
  /** The set the host was last drawn with; undefined while it has read no word. */
  private drawnWith: WordSet | null | undefined;
  /** The count of changes `drawnWith` was found at. */
  private drawnAt = -1;
  /** What the host did not record while it was out of the page: the key, the prop's text then, and what a report says. */
  private readonly unrecorded = new Map<WordKey, { own: string; about?: MissingWord }>();

  constructor(private readonly host: Host) {
    host.addController(this);
  }

  hostConnected() {
    const held = store();
    held.hosts.add(this.host);
    this.scope = undefined;
    // Placed again after it was drawn: a set that changed while it was away told it nothing, and the set of the
    // language it stands under now may be another. It is drawn again only then.
    if (this.drawnAt >= 0 && (this.drawnAt !== held.version || langSet(this.host) !== this.drawnWith)) this.host.requestUpdate();
    if (this.unrecorded.size === 0) return;
    // What it needed and did not find while it was out of the page is asked again, where it stands.
    const asked = [...this.unrecorded];
    this.unrecorded.clear();
    for (const [key, { own, about }] of asked) {
      if (this.get(key, own)) continue;
      if (about) wordMissing(this.host, key, about);
      else held.missing.add(key);
    }
  }

  hostDisconnected() {
    store().hosts.delete(this.host);
  }

  hostUpdate() {
    this.scope = undefined;
  }

  /** The word for `key`: `own` where it is not empty, else the product's (its language's set, then the document's), else ''. */
  get(key: WordKey, own = ''): string {
    const word = given(own) ? own : this.product(key);
    // Given since: no longer something to ask again.
    if (word && this.unrecorded.size) this.unrecorded.delete(key);
    return word;
  }

  /** The product's word for `key`: its language's set, then the document's. */
  private product(key: WordKey): string {
    const held = store();
    if (this.scope === undefined || this.found !== held.version) {
      this.scope = langSet(this.host);
      this.found = held.version;
    }
    this.drawnWith = this.scope;
    this.drawnAt = this.found;
    return this.scope?.get(key) ?? held.page.get(key) ?? '';
  }

  /**
   * Whether nobody gave the word for `key` — and if so, records it for `missingWords()`. For a component that makes a
   * report of its own about the part (an unnamed close button, CLO-31): call it only where the part is drawn.
   */
  lacks(key: WordKey, own = ''): boolean {
    if (this.get(key, own)) return false;
    // Out of the page it lacks nothing that can be known: asked again when it is placed.
    if (!this.host.isConnected) {
      this.unrecorded.set(key, { own });
      return false;
    }
    store().missing.add(key);
    return true;
  }

  /** `wordMissing()` for the host; out of the page nothing is recorded, and the key is asked again when the host is placed. */
  missing(key: WordKey, about: MissingWord): void {
    if (this.host.isConnected) wordMissing(this.host, key, about);
    else this.unrecorded.set(key, { own: '', about });
  }
}
