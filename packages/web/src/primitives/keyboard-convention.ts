// Whose keyboard a keyboard shortcut is written for (KBS-2), and the channel between a keyboard shortcut and the
// component that hosts it (KBS-12, KBS-13: a menu item). It lives here, outside `src/components/**` — the files
// custom-elements.json is made from — so neither the watcher nor the internal event becomes part of a public API.

import type { ComplexAttributeConverter } from 'lit';

/** The two conventions a keyboard is written in (KBS-3, KBS-4). */
export type KeyboardConvention = 'apple' | 'standard';

/** The attribute an ancestor sets to choose the convention of every keyboard shortcut under it (`apple` or `standard`). */
export const KEYBOARD_CONVENTION = 'data-tanrei-keyboard-convention';

/** What a keyboard shortcut tells its host, bubbling but not composed, when the keys it writes change without the host. */
export const SHORTCUT_UPDATE = 'tanrei-keyboard-shortcut-update';

const SETS = `[${KEYBOARD_CONVENTION}='apple'], [${KEYBOARD_CONVENTION}='standard']`;

/**
 * KBS-2: the convention the nearest ancestor of `element` sets, across shadow roots (a menu item's shortcut is in the
 * item's shadow root; the attribute is on the page), or null. An attribute with another value sets nothing.
 */
export function ambientConvention(element: Element): KeyboardConvention | null {
  let scope: Element | null = element.parentElement?.closest(SETS) ?? null;
  for (let node: Element = element; !scope; ) {
    const root = node.getRootNode();
    if (!(root instanceof ShadowRoot)) break;
    node = root.host;
    scope = node.closest(SETS);
  }
  return (scope?.getAttribute(KEYBOARD_CONVENTION) as KeyboardConvention | undefined) ?? null;
}

/** KBS-2: `apple` where the platform is macOS, iOS, iPadOS or visionOS (which reports itself as a Mac), else `standard`. */
export function platformConvention(): KeyboardConvention {
  if (typeof navigator === 'undefined') return 'standard';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const name = nav.userAgentData?.platform || nav.platform || '';
  return /^(mac|iphone|ipad|ipod|ios)/i.test(name) ? 'apple' : 'standard';
}

/** Something that re-reads its ambient convention. */
export interface ConventionReader {
  conventionChanged(): void;
}

const readers = new Set<ConventionReader>();
const watched = new WeakSet<Node>();
let observer: MutationObserver | undefined;

/**
 * KBS-2: `reader` is told whenever the attribute changes on any element of the document or of a shadow root `element`
 * is inside — one observer for the page, each root observed once. Call `unwatchConvention()` when it disconnects.
 */
export function watchConvention(reader: ConventionReader, element: Element) {
  if (typeof MutationObserver === 'undefined') return;
  readers.add(reader);
  observer ??= new MutationObserver(() => {
    for (const each of readers) each.conventionChanged();
  });
  for (let root: Node = element.getRootNode(); ; ) {
    if (!watched.has(root)) {
      observer.observe(root, { attributes: true, attributeFilter: [KEYBOARD_CONVENTION], subtree: true });
      watched.add(root);
    }
    if (!(root instanceof ShadowRoot)) break;
    root = root.host.getRootNode();
  }
}

export function unwatchConvention(reader: ConventionReader) {
  readers.delete(reader);
}

/** Splits an attribute of chords: the chords separated by white space (`mod+k mod+c`), or a JSON array of them. */
export function parseChords(value: string | null): string[] {
  const text = (value ?? '').trim();
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every((chord) => typeof chord === 'string')) return parsed;
    } catch {
      // Not JSON: a chord that starts with the key [ — read below as white-space separated.
    }
  }
  return text.split(/\s+/).filter(Boolean);
}

/** The attribute converter of a list of chords (a keyboard shortcut's `keys`, a menu item's `shortcut`). */
export const chordsConverter: ComplexAttributeConverter<string[]> = {
  fromAttribute: (value) => parseChords(value),
  toAttribute: (value) => (Array.isArray(value) ? value.join(' ') : String(value ?? '')),
};

/** A list of chords as given to the property: an array, or a string as the attribute writes it. */
export function chordsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((chord) => String(chord));
  if (typeof value === 'string') return parseChords(value);
  return [];
}
