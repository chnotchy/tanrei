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
// An element marked `data-define-on-use` is left to the script that owns it, with the elements it holds, which it
// defines when it is first used (the site's search: components/frame/Search.astro; the Appearance panel:
// components/frame/Appearance.astro). So is what an example's stage holds while it is away from the
// view (`data-example-pending`, components/visuals/Example.astro): once lib/example.ts takes the mark away, as the
// stage comes near, what it holds is defined as what is added later is, so a page of many examples asks, as it loads,
// only for what the reader is near; right after the page's load, lib/example.ts asks for the rest of what the
// stages hold (`defineAhead`), so that each takes its drawn room before the reader reaches it. An element of a tag
// defined meanwhile for another part of the page is upgraded with it, as the browser does.
//
// The table holds every module of the package, but the site defines only what `@tanrei/web` registers, the default
// system's components: one the default system does not have is defined only where the site shows a system that has
// it on purpose — its own page and a frame pinned to such a system (lib/omitted-elements.ts). Anywhere else it stays
// undefined, as in a product on `@tanrei/web`, and the development server says so in the console.
import { loaders, modules, outside, system } from 'virtual:tanrei-element-modules';
import { leftUndefined, mayDefine, placeOf } from './omitted-elements';

type Load = () => Promise<unknown>;

/** What holds its elements back until it is near the view: an example's stage (components/visuals/Example.astro). */
const PENDING_ATTR = 'data-example-pending';
const PENDING = `[${PENDING_ATTR}]`;
/** What the script that owns it defines when it is first used, with the elements it holds. */
const ON_USE = '[data-define-on-use]';

/** The modules asked for, by their loader (one module defines one or more tags). */
const asked = new Set<Load>();
/** The elements seen before their module was loaded, by tag: their shadow roots are watched once it has been. */
const waiting = new Map<string, Element[]>();
/** The roots watched: the document, and each Tanrei element's shadow root. */
const watched = new WeakSet<Node>();
/** What the watched roots are given later: each element added is scanned as the document was. */
const observer = new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) if (node instanceof Element) scan(node);
    // A part that held its elements back no longer does.
    if (record.type === 'attributes' && record.target instanceof Element && !record.target.hasAttribute(PENDING_ATTR)) scan(record.target);
  }
});

/** The elements left undefined because the default system does not have their component, each reported once. */
const refused = new WeakSet<Element>();

/** Asks for the module of a tag no one has defined yet; a tag of no Tanrei module is left alone, and so is one of a component the default system does not have, where the page does not show a system that has it. */
function want(element: Element) {
  const tag = element.localName;
  const load = loaders[tag];
  if (!load) return;
  if (!mayDefine(outside[tag], placeOf(element))) {
    if (import.meta.env.DEV && !refused.has(element)) console.warn(leftUndefined(tag, outside[tag], system), element);
    refused.add(element);
    return;
  }
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
      if (!element.closest(`${ON_USE}, ${PENDING}`)) want(element);
    }
    else if (element.shadowRoot) watch(element.shadowRoot);
  };
  if (node instanceof Element) each(node);
  for (const element of node.querySelectorAll('*')) each(element);
}

/**
 * Defines the elements a part holds while it still holds them back (`data-example-pending`): what lib/example.ts asks
 * for, right after the page's load, so that a stage away from the view can take the room its elements take drawn
 * before the reader reaches it. An element defined on its first use is still left to its owner.
 */
export function defineAhead(part: Element) {
  for (const element of part.querySelectorAll('*')) {
    if (element.localName.startsWith('tanrei-') && !element.matches(':defined') && !element.closest(ON_USE)) want(element);
  }
}

/**
 * The tags of the elements a part holds that are not defined yet and that this page will define (a Tanrei element of a
 * module it may load, not left to its owner's first use): what lib/example.ts waits for before a stage near the view
 * lets go of the room it holds. An element of a component the page does not show a system of is left undefined, and
 * not waited for.
 */
export function toBeDefined(part: Element): string[] {
  const tags = new Set<string>();
  for (const element of part.querySelectorAll(':not(:defined)')) {
    const tag = element.localName;
    if (loaders[tag] && !element.closest(ON_USE) && mayDefine(outside[tag], placeOf(element))) tags.add(tag);
  }
  return [...tags];
}

function watch(root: Document | ShadowRoot) {
  if (watched.has(root)) return;
  watched.add(root);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: [PENDING_ATTR] });
  scan(root);
}

// Importing this module defines the elements the document holds now, and those it is given later. A module runs once
// for the page, however many of the page's scripts import it.
watch(document);
