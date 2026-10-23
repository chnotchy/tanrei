// Whose keyboard a keyboard shortcut is written for (KBS-2), the channel between a keyboard shortcut and the
// component that hosts it (KBS-12, KBS-13: a menu item), and a chord an element binds in the window (SRC-38, SRC-39,
// NVD-87): how it is read and matched, and the one registry that keeps one owner per chord. It lives here, outside `src/components/**` — the files
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

// ── A chord bound in the window (SRC-38, SRC-39, NVD-87) ─────────────────────────────────────────────────────────────

/** One chord as an element listens for it: its modifiers and its one other key, as `KeyboardEvent.key` names it. */
export interface Binding {
  id: string;
  key: string;
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

/** KBS-1: the named keys, as `KeyboardEvent.key` reports them. */
const EVENT_KEYS: Record<string, string> = {
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  space: ' ',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  home: 'Home',
  end: 'End',
  'page-up': 'PageUp',
  'page-down': 'PageDown',
  'caps-lock': 'CapsLock',
  plus: '+',
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`f${i + 1}`, `F${i + 1}`])),
};

/** SRC-38: a chord in the keyboard shortcut's key names (`mod+k`, `/`) as a binding, or null where it is not one chord of modifiers and one key. */
export function readBinding(chord: string): Binding | null {
  const modifiers = new Set<string>();
  const others: string[] = [];
  for (const name of chord.split('+').map((each) => each.trim().toLowerCase())) {
    if (!name) continue;
    if (name === 'mod' || name === 'ctrl' || name === 'alt' || name === 'shift') modifiers.add(name);
    else others.push(name);
  }
  if (others.length !== 1) return null;
  const key = EVENT_KEYS[others[0]] ?? ([...others[0]].length === 1 ? others[0] : null);
  if (key === null) return null;
  const [mod, ctrl, alt, shift] = ['mod', 'ctrl', 'alt', 'shift'].map((name) => modifiers.has(name));
  return { id: [...['mod', 'ctrl', 'alt', 'shift'].filter((name) => modifiers.has(name)), key].join('+'), key, mod, ctrl, alt, shift };
}

/** SRC-38: whether `event` is that chord, read as KBS-1 reads it: mod is Command under the apple convention and Control otherwise. */
export function chordPressed(event: KeyboardEvent, binding: Binding, convention: KeyboardConvention): boolean {
  const meta = binding.mod && convention === 'apple';
  const ctrl = binding.ctrl || (binding.mod && convention !== 'apple');
  if (event.metaKey !== meta || event.ctrlKey !== ctrl || event.altKey !== binding.alt) return false;
  const character = [...binding.key].length === 1 && binding.key !== ' ';
  const letter = character && /[\p{L}\p{N}]/u.test(binding.key);
  // A named key or a letter is pressed with Shift exactly when the chord names it; a sign that a layout writes with
  // Shift (?) is what `key` says it is.
  if (!character || letter ? event.shiftKey !== binding.shift : binding.shift && !event.shiftKey) return false;
  if (event.key.toLowerCase() === binding.key.toLowerCase()) return true;
  // Option on a Mac writes another character for the same key: with alt, the key's place decides.
  return letter && binding.alt && (event.code === `Key${binding.key.toUpperCase()}` || event.code === `Digit${binding.key}`);
}

/** SRC-38: whether `element` takes text, so that a key without a modifier types there. */
export function takesText(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) return !['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit'].includes(element.type);
  return element instanceof HTMLElement && element.isContentEditable;
}

/**
 * SRC-39, NVD-87: the chord each shown element has bound in the window — a search, a navigation drawer — and the elements
 * that wait for a chord another one holds: one owner per chord, the one shown first; a chord set free goes to one that waited.
 */
export const BOUND_CHORDS = new Map<string, Element>();
export const WAITING_FOR_CHORDS = new Set<{ syncShortcut(): void }>();
