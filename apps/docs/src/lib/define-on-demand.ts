// Defines the Tanrei elements a page draws, and only those (browser only): a script imports it for the elements a part
// of the page may hold (`import '../lib/define-on-demand'`), and a part that always holds its element imports that
// element's module itself.
//
// A page used to import the whole of `@tanrei/web`, so every page fetched and evaluated the modules of all its elements
// (about 2.4 MB, 540 KB compressed), most of which it never drew. Instead, each element the page holds that is not
// defined yet has its module imported, from the table of the package's own manifest (lib/element-modules.mjs): the
// bundler makes each module a chunk of its own, and the page asks for those of its tags at once, side by side.
//
// What comes later is defined the same way: an element a page's script adds or a template stamps, seen by a
// MutationObserver on the document, and an element a component draws in its shadow root, seen by the same observer on
// each Tanrei element's shadow root. A component's module imports the elements it draws, but one that does not would
// otherwise draw an undefined element here, where the whole package no longer stands behind it.
//
// An element marked `data-define-on-use` is left to the script that owns it, which defines it when it is first used
// (the site's search: components/frame/Search.astro).
import { loaders, modules } from 'virtual:tanrei-element-modules';

type Load = () => Promise<unknown>;

/** The modules asked for, by their loader (one module defines one or more tags). */
const asked = new Set<Load>();
/** The elements seen before their module was loaded, by tag: their shadow roots are watched once it has been. */
const waiting = new Map<string, Element[]>();
/** The roots watched: the document, and each Tanrei element's shadow root. */
const watched = new WeakSet<Node>();
/** What the watched roots are given later: each element added is scanned as the document was. */
const observer = new MutationObserver((records) => {
  for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) scan(node);
});

/** Asks for the module of a tag no one has defined yet; a tag of no Tanrei module is left alone. */
function want(element: Element) {
  const tag = element.localName;
  const load = loaders[tag];
  if (!load) return;
  (waiting.get(tag) ?? waiting.set(tag, []).get(tag)!).push(element);
  if (asked.has(load)) return;
  asked.add(load);
  void load().then(() => {
    for (const [other, elements] of waiting) {
      if (loaders[other] !== load) continue;
      waiting.delete(other);
      for (const defined of elements) if (defined.shadowRoot) watch(defined.shadowRoot);
    }
    if (asked.size === modules && !waiting.size) observer.disconnect();
  });
}

/** The Tanrei elements of a node (itself included): each one not defined yet is asked for, and each one's shadow root is watched. */
function scan(node: Element | Document | ShadowRoot) {
  const each = (element: Element) => {
    if (!element.localName.startsWith('tanrei-')) return;
    if (!element.matches(':defined')) {
      if (!element.hasAttribute('data-define-on-use')) want(element);
    }
    else if (element.shadowRoot) watch(element.shadowRoot);
  };
  if (node instanceof Element) each(node);
  for (const element of node.querySelectorAll('*')) each(element);
}

function watch(root: Document | ShadowRoot) {
  if (watched.has(root)) return;
  watched.add(root);
  observer.observe(root, { childList: true, subtree: true });
  scan(root);
}

// Importing this module defines the elements the document holds now, and those it is given later. A module runs once
// for the page, however many of the page's scripts import it.
watch(document);
