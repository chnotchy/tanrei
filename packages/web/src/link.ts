// `@tanrei/web/link` — the script side of `@tanrei/web/link.css` (specs/link.spec.json), for a page that
// uses `class="tanrei-link"` or `.tanrei-prose` without the components. `@tanrei/web` loads it too.
//
// The Link is a class on the product's own anchor, and the stylesheet alone draws it in every state. This adds what a
// stylesheet cannot, through listeners on the document — no anchor is wrapped, replaced or given a listener of its own:
//
//   - the shared press primitive (LNK-8, LNK-9): `data-pressed` named after `sys.behavior.pressed-feedback` (overlay,
//     ripple, dim, none), on pointer down and on Enter — never Space (LNK-12) — held for press-hold;
//   - `noopener` on a link that opens a new context (LNK-13);
//   - the refusals of LNK-21: an address that is empty, names a script or cannot be read is taken off the anchor, which
//     is then no link at all (no role, no focus); a `target` that is not HTML's `_blank` or `_self` is taken off;
//   - `data-focus-style`, where the browser has no style queries to read `sys.behavior.focus-style` with (LNK-10);
//   - a disabled link that still carries an address opens nothing (LNK-19);
//   - what leaves the site (LNK-30): an anchor that carries no `data-external` and whose address is of another origin
//     than the page's and the ones given to `setSiteOrigins()` is marked `data-external="detected"`, re-read when its
//     address changes; only a value this script wrote is ever changed by it. The stylesheet draws the arrow for it —
//     after the first paint, where the page was not marked when it was made (README, "Link");
//   - the words of an external link (LNK-34): `setExternalLabel()` gives them once for the page, and they are written
//     as `aria-description` on an external link that has none and opens where the person is. Tanrei ships no words;
//   - the site's picture (LNK-32, LNK-35): `alt=""` and `referrerpolicy="no-referrer"` where the markup left them out,
//     and `data-failed` on a picture that could not be loaded, so that nothing is drawn in its room. It asks for
//     nothing itself: no address is derived from `href`, and no request is made;
//   - `data-underline-system` and `data-external-marks-system` on the document's root, where the browser has no style
//     queries to read `comp.link.underline.visibility` and `comp.link.external.marks` with (LNK-27, LNK-33);
//   - the label's own direction as `dir` on a standalone link the page gave no `dir` (LNK-26), so that its glyphs and
//     mark stand at the ends of its label in that direction;
//   - every debug report (LNK-13, LNK-15, LNK-19, LNK-21, LNK-29, LNK-32, LNK-34, LNK-35).
//
// What the browser gives an anchor stays the browser's (LNK-1, LNK-12): Enter fires `click` and then follows the
// address unless the product cancelled the click; a modified or a middle click opens a tab. Nothing here follows a link.
import { isExternal } from './links/index.js';
import { syncFocusStyle } from './primitives/focus-ring.js';
import { LINK_KEYS, linkRel, readDestination } from './primitives/link.js';
import { PressController } from './primitives/press.js';
import { debugBuild, report } from './primitives/report.js';
import { styleQueries } from './primitives/separation.js';
import { setWords, watchWords, wordFor, wordLacking } from './primitives/words.js';

const LINK = 'tanrei-link';
const PROSE = 'tanrei-prose';
const NOT_PROSE = 'tanrei-not-prose';
/** A pagination's landmark (pagination.css): a component of classes, whose anchors are its own as an element's are. */
const PAGINATION = 'tanrei-pagination';
/** The variants the spec defines; a design system may add one, which is known by its tokens. */
const VARIANTS = ['standard', 'inverse'];
/** `comp.link.underline.visibility` and the `data-underline` of one link (LNK-27): the first is the fallback. */
const UNDERLINES = ['always', 'hover', 'never'];
/** `comp.link.external.marks` (LNK-33): the first is the fallback. */
const MARKS = ['all', 'arrow', 'none'];
/** What `data-external` may hold: the product's word (`true`, or the bare attribute; `false`) and this script's. */
const DETECTED = 'detected';
const EXTERNALS = ['', 'true', 'false', DETECTED];
const SITE_ICON = 'tanrei-link-site-icon';
const UNDERLINE_TOKEN = '--tanrei-comp-link-underline-visibility';
const MARKS_TOKEN = '--tanrei-comp-link-external-marks';
/** What the observer re-reads an anchor for. */
const ATTRIBUTES = ['href', 'target', 'rel', 'download', 'class', 'role', 'aria-disabled', 'aria-current', 'aria-label', 'aria-labelledby', 'aria-description', 'aria-describedby', 'data-variant', 'data-underline', 'data-external', 'data-standalone'];

/**
 * What the product said once for every link of the page. It is kept under a registered symbol, not in this module, so
 * that two copies of the module on one page (two bundles) hold one answer — as they share one observation of a root.
 */
interface Settings {
  site: readonly string[];
  /** Every observed root reads its anchors again. */
  reread: Set<() => void>;
}
const SETTINGS = Symbol.for('tanrei.link-settings');
function settings(): Settings {
  const holder = globalThis as { [SETTINGS]?: Settings };
  return (holder[SETTINGS] ??= { site: [], reread: new Set() });
}

/**
 * Declares the origins that are the product's own site, beside the page's (LNK-30): a link to one of them is not
 * external. An origin (`https://docs.example.com`), a host name, or a host with a leading `*.` for its subdomains —
 * the same list the build step takes as `site`. Every link the script has marked is read again; a `data-external`
 * the page was given where it was made is never changed.
 */
export function setSiteOrigins(origins: readonly string[]): void {
  settings().site = [...origins];
  for (const reread of settings().reread) reread();
}

/**
 * Sets, once for the page, the words read after the name of a link that leaves the site and opens where the person is
 * ("external link", in the product's language — LNK-34). They are written as `aria-description` on every such link
 * that carries none of its own; an empty string takes back what was written. Tanrei ships no words: until the product
 * gives some, here or on each link, nothing is said, and a debug build says so once.
 */
export function setExternalLabel(words: string): void {
  // One store: the words of an external link are the key `externalLabel` of the product's
  // words. This is `setWords({ externalLabel: words })`, kept under its first name; every observed root reads its
  // anchors again because a set of words changed (below).
  setWords({ externalLabel: words });
}

/** The words of an external link for `anchor`: the product's words for its language, else the document's (`setWords()`). */
const externalWords = (anchor: Element) => wordFor(anchor, 'externalLabel').trim();

// A changed set of words — by `setWords()` or by `setExternalLabel()` — is read again by every observed root. Once for
// the page's copies of this module: the listener is kept with the settings.
{
  const held = settings() as Settings & { watching?: boolean };
  if (!held.watching) {
    held.watching = true;
    watchWords(() => {
      for (const reread of settings().reread) reread();
    });
  }
}

/**
 * Whether `anchor` is one of prose's own (PRS-16): inside a `.tanrei-prose` and not inside an island of it — a part
 * marked `tanrei-not-prose`, a pagination's landmark, or one of Tanrei's elements, whose content is that component's.
 * The nearest of them decides, as in prose.css (a prose inside an island is prose again).
 */
function inProse(anchor: Element): boolean {
  for (let parent = anchor.parentElement; parent; parent = parent.parentElement) {
    if (parent.classList.contains(NOT_PROSE) || parent.classList.contains(PAGINATION) || parent.localName.startsWith('tanrei-')) return false;
    if (parent.classList.contains(PROSE)) return true;
  }
  return false;
}

/** The anchor a node is in, when it is a Link: an anchor with the class, or one of prose's own. */
function linkOf(node: EventTarget | null): HTMLAnchorElement | null {
  const anchor = node instanceof Element ? node.closest('a') : null;
  return anchor instanceof HTMLAnchorElement && (anchor.classList.contains(LINK) || inProse(anchor)) ? anchor : null;
}

const disabled = (anchor: Element) => anchor.getAttribute('aria-disabled') === 'true';
/** A link that can be followed now: it has an address and is not disabled. */
const live = (anchor: HTMLAnchorElement) => anchor.hasAttribute('href') && !disabled(anchor);

/**
 * What an anchor carries is read once it is seen and again when it changes (LNK-13, LNK-15, LNK-19, LNK-21): the
 * refusals are made and a debug build is told what the link survived.
 */
function read(anchor: HTMLAnchorElement) {
  const own = anchor.classList.contains(LINK);
  // LNK-21: what is not a place to go is not a destination, and a link without one is not a link.
  const given = anchor.getAttribute('href');
  if (given === null) {
    // In prose an anchor without an address is the content's own (a named place in the text), not a broken link.
    if (own && !disabled(anchor) && !refused.has(anchor)) report(anchor, 'LNK-21', 'it has no href, so it is not a link and is drawn as text; a press that does something on the page is a button’s');
  } else {
    const { href, refusal } = readDestination(given);
    if (href === null) {
      refused.add(anchor);
      anchor.removeAttribute('href');
      report(
        anchor,
        'LNK-21',
        refusal === 'script'
          ? 'href names a script to run, not a place to go; it is taken off and the anchor is not a link'
          : refusal === 'unreadable'
            ? `href "${given}" cannot be read as an address; it is taken off and the anchor is not a link`
            : 'href is empty; it is taken off and the anchor is not a link',
      );
    }
  }
  // LNK-19: a disabled link is the anchor without an address, with the link role.
  if (disabled(anchor)) {
    if (anchor.hasAttribute('href')) report(anchor, 'LNK-19', 'it is disabled and still carries href: a disabled link has no destination (write the anchor without href); the address is not opened');
    if (anchor.getAttribute('role') !== 'link') report(anchor, 'LNK-19', 'it is disabled and has no role: an anchor without href is not a link to assistive technology; give it role="link"');
  }
  // LNK-13, LNK-21: where it opens, in HTML's spelling.
  const target = (anchor.getAttribute('target') ?? '').trim().toLowerCase();
  if (target === '_blank') {
    const rel = linkRel(anchor.getAttribute('rel'), 'new');
    if (rel !== null && rel !== anchor.getAttribute('rel')) anchor.setAttribute('rel', rel);
    if (live(anchor) && !(anchor.getAttribute('aria-description') ?? '').trim() && !anchor.hasAttribute('aria-describedby')) {
      report(anchor, 'LNK-13', 'it opens a new context and aria-description is empty, so nothing says so to people who cannot see the mark; give it the words ("opens in a new tab")');
    }
  } else if (target !== '' && target !== '_self') {
    report(anchor, 'LNK-21', `target "${anchor.getAttribute('target')}" is not a value it defines ("_blank" for a new context, or none); it is taken off and the link opens where the person is`);
    anchor.removeAttribute('target');
  }
  // LNK-21: a variant neither the spec nor the active design system has is drawn as the default one.
  const variant = anchor.getAttribute('data-variant');
  if (variant !== null && !VARIANTS.includes(variant) && !getComputedStyle(anchor).getPropertyValue(`--tanrei-comp-link-${variant}-label-color`).trim()) {
    report(anchor, 'LNK-21', `data-variant "${variant}" is not a variant it or the active design system defines; it is drawn as "standard"`);
  }
  // LNK-15: a glyph alone is named by aria-label; a link with a label of text is named by that text.
  const glyph = anchor.querySelector(':scope > .tanrei-icon');
  if (glyph) {
    const text = [...anchor.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim());
    const named = !!(anchor.getAttribute('aria-label') ?? '').trim() || anchor.hasAttribute('aria-labelledby');
    if (!text && !named) report(anchor, 'LNK-15', 'it is a glyph alone and has no accessible name; give it aria-label, which also draws it as the glyph-alone form');
    if (text && anchor.hasAttribute('aria-label')) report(anchor, 'LNK-15', 'it has a label of text and aria-label: the text names a link, and aria-label is for a glyph alone (it replaces the name and draws the link as a glyph alone); take it off');
  }
  // LNK-21, LNK-27: an underline that is none of the three is auto — no rule of the stylesheet names it.
  const underline = anchor.getAttribute('data-underline');
  if (underline !== null && underline !== 'auto' && !UNDERLINES.includes(underline)) {
    report(anchor, 'LNK-21', `data-underline "${underline}" is not a value it defines ("always", "hover" or "never", or none for the design system’s choice); it is underlined as the design system chooses`);
  }
  readExternal(anchor);
  readSiteIcon(anchor);
  readDirection(anchor);
}

/** The standalone links whose `dir` this script wrote: the one value of `dir` it writes, changes and takes back. */
const ownDirection = new WeakSet<Element>();

/** Right-to-left scripts' letters (Hebrew, Arabic, Syriac, Thaana, N'Ko and their presentation forms). */
const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
const LETTER = /\p{L}/u;

/** The direction of the label's first strong character — its words, not a glyph's name — or null where it has none. */
function labelDirection(anchor: HTMLAnchorElement): 'ltr' | 'rtl' | null {
  const walker = anchor.ownerDocument.createTreeWalker(anchor, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement?.closest('.tanrei-icon') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const char of node.textContent ?? '') {
      if (RTL_LETTER.test(char)) return 'rtl';
      if (LETTER.test(char)) return 'ltr';
    }
  }
  return null;
}

/**
 * LNK-26, LNK-14: a standalone link is text of its own direction — its label's first strong character's, a glyph's
 * name aside — and its glyphs and mark stand at the ends of its label in that direction. This script writes that
 * direction as `dir` on a standalone link the page gave no `dir`, changes it with the label, and takes it back when the
 * label has no strong character or the link stops standing by itself. A `dir` the page wrote is never changed: on a
 * phrase in a sentence it is how the page says the phrase has a direction of its own.
 */
function readDirection(anchor: HTMLAnchorElement) {
  const standalone = anchor.hasAttribute('data-standalone') && anchor.getAttribute('data-standalone') !== 'false';
  if (anchor.hasAttribute('dir') && !ownDirection.has(anchor)) return;
  const direction = standalone ? labelDirection(anchor) : null;
  if (direction) {
    if (anchor.getAttribute('dir') !== direction) anchor.setAttribute('dir', direction);
    ownDirection.add(anchor);
  } else if (ownDirection.has(anchor)) {
    ownDirection.delete(anchor);
    anchor.removeAttribute('dir');
  }
}

/**
 * LNK-30: whether the link leaves the site. The product's word stands (`data-external` that is `true`, bare, or
 * `false`); an anchor without one is read — its address against the page's origin and the origins the product
 * declared — and marked `detected`, the one value this script writes, changes and takes back.
 */
function readExternal(anchor: HTMLAnchorElement) {
  let given = anchor.getAttribute('data-external');
  if (given !== null && !EXTERNALS.includes(given)) {
    // LNK-21: a value it does not define is auto. The stylesheet draws the marks for anything but "false", so the
    // value is taken off, as an unknown target is.
    report(anchor, 'LNK-21', `data-external "${given}" is not a value it defines ("true" or "false", or none for the address to decide); it is taken off and the address decides`);
    anchor.removeAttribute('data-external');
    given = null;
  }
  if (given !== null && given !== DETECTED) return;
  // A disabled link has no address to read (LNK-19): what was found while it had one stands.
  if (!anchor.hasAttribute('href')) {
    if (given === DETECTED && !disabled(anchor)) anchor.removeAttribute('data-external');
    return;
  }
  const page = anchor.ownerDocument.location?.href;
  // `anchor.href` is the address as the browser will follow it, read against the document's base.
  const found = isExternal(anchor.href, { ...(page ? { base: page } : {}), site: settings().site, download: anchor.hasAttribute('download') });
  if (found && given === null) anchor.setAttribute('data-external', DETECTED);
  else if (!found && given === DETECTED) anchor.removeAttribute('data-external');
}

/** Whether the link is external by what it carries now (the stylesheet's own condition). */
const external = (anchor: Element) => anchor.hasAttribute('data-external') && anchor.getAttribute('data-external') !== 'false';

/** Whether the link has a label: text of its own, outside a glyph — and not the glyph-alone form, which `aria-label` draws. */
function labelled(anchor: HTMLAnchorElement): boolean {
  if (anchor.hasAttribute('aria-label') && anchor.querySelector(':scope > .tanrei-icon')) return false;
  return [...anchor.childNodes].some((node) => (node.nodeType === Node.TEXT_NODE || (node instanceof Element && !node.classList.contains('tanrei-icon'))) && !!node.textContent?.trim());
}

/**
 * LNK-32, LNK-35: the site's picture is the product's own `<img class="tanrei-link-site-icon">`, the anchor's first
 * child. It is decoration, loaded exactly as given and without the page's address — what the markup left out is
 * written here, and a debug build is told, because the first request may have left before this script ran.
 */
function readSiteIcon(anchor: HTMLAnchorElement) {
  const picture = anchor.querySelector(`:scope > img.${SITE_ICON}`);
  if (!(picture instanceof HTMLImageElement)) return;
  let before = picture.previousSibling;
  while (before && before.nodeType !== Node.ELEMENT_NODE && !before.textContent?.trim()) before = before.previousSibling;
  if (before) report(anchor, 'LNK-32', 'its site icon is not its first child: the picture stands before the label, so write the <img class="tanrei-link-site-icon"> first, against the label’s text');
  if (picture.getAttribute('alt') !== '') {
    report(anchor, 'LNK-32', 'its site icon has no empty alt: the picture is decoration and the label names the link (LNK-15); alt="" is written for it — write it in the markup');
    picture.setAttribute('alt', '');
  }
  const policy = picture.getAttribute('referrerpolicy');
  if (policy === null) {
    report(anchor, 'LNK-35', 'its site icon has no referrerpolicy: a picture is loaded without the page’s address; referrerpolicy="no-referrer" is written for it, but the first request may already have carried the address — write it in the markup');
    picture.setAttribute('referrerpolicy', 'no-referrer');
  } else if (policy.trim().toLowerCase() !== 'no-referrer') {
    report(anchor, 'LNK-35', `its site icon has referrerpolicy="${policy}": a picture is loaded without the page’s address — write referrerpolicy="no-referrer"`);
  }
  const given = picture.getAttribute('src');
  if (!given?.trim()) return;
  try {
    const src = new URL(picture.currentSrc || picture.src, anchor.baseURI);
    const page = anchor.ownerDocument.location;
    if (['http:', 'https:'].includes(src.protocol) && page && src.origin !== page.origin) {
      report(anchor, 'LNK-35', `its site icon is loaded from ${src.origin}, not from this site: every reader’s browser then tells that party which page is being read. Give a picture the product serves itself (resolveSiteIcons() of @tanrei/web/links makes one when the site is built), or a data: URL`);
    }
  } catch {
    // An address that cannot be read loads nothing, and fails below.
  }
  // A picture that failed before this script could hear it.
  if (picture.complete && picture.naturalWidth === 0) failed(anchor, picture);
}

/** LNK-32: a picture that cannot be loaded or decoded keeps its room and draws nothing. */
function failed(anchor: HTMLAnchorElement, picture: HTMLImageElement) {
  if (!picture.hasAttribute('data-failed')) picture.setAttribute('data-failed', '');
  const src = picture.getAttribute('src') ?? '';
  report(anchor, 'LNK-32', `its site icon "${src.length > 96 ? `${src.slice(0, 96)}…` : src}" cannot be loaded or decoded: its room is kept and nothing is drawn in it`);
}

/** What the cascade says to a link, read for every link of a batch together and before anything more is written. */
interface Looked {
  /** `comp.link.external.marks` as the link's parent holds it, where the link's description depends on it; null otherwise. */
  marks: string | null;
  /** LNK-29: the contrast of the label against the text the link sits in, where a debug build has to judge it; null otherwise. */
  contrast: number | null;
}

/** A link that leaves the site, opens where the person is and has a label: the one that is described as external (LNK-34). */
const describedAsExternal = (anchor: HTMLAnchorElement) => live(anchor) && external(anchor) && (anchor.getAttribute('target') ?? '').trim().toLowerCase() !== '_blank' && labelled(anchor);

function look(anchor: HTMLAnchorElement): Looked {
  const parent = anchor.parentElement ?? anchor;
  // The two choices are read where the stylesheet reads them: from the link's parent by a style query, and from the
  // document's root where the browser has none (`syncSystem`) — so what is said agrees with what is drawn.
  const chooser = styleQueries() ? parent : anchor.ownerDocument.documentElement;
  const debug = debugBuild();
  let marks: string | null = null;
  // Read only where something follows from it: words to write or to take back, or a report to make.
  if (describedAsExternal(anchor) && (debug || externalWords(anchor) || written.has(anchor))) {
    const named = getComputedStyle(chooser).getPropertyValue(MARKS_TOKEN).trim();
    marks = MARKS.includes(named) ? named : MARKS[0];
  }
  let contrast: number | null = null;
  // LNK-29: a phrase in running text that is not underlined at rest is told from the words beside it by color alone.
  if (debug && live(anchor) && anchor.parentElement && !standalone(anchor) && !current(anchor) && labelled(anchor)) {
    const own = anchor.getAttribute('data-underline') ?? '';
    const named = UNDERLINES.includes(own) ? own : getComputedStyle(chooser).getPropertyValue(UNDERLINE_TOKEN).trim();
    if (named === 'hover' || named === 'never') contrast = contrastOf(getComputedStyle(anchor).color, getComputedStyle(parent).color);
  }
  return { marks, contrast };
}

const standalone = (anchor: Element) => anchor.hasAttribute('data-standalone') && anchor.getAttribute('data-standalone') !== 'false';
const current = (anchor: Element) => anchor.hasAttribute('aria-current') && anchor.getAttribute('aria-current') !== 'false';

/** The anchors whose `aria-description` is this script's, and the words it wrote. */
const written = new WeakMap<HTMLAnchorElement, string>();

/** LNK-29, LNK-34: what follows from what the cascade said. */
function say(anchor: HTMLAnchorElement, { marks, contrast }: Looked) {
  if (contrast !== null && contrast < 3) {
    report(anchor, 'LNK-29', `it is not underlined at rest and its color stands ${contrast.toFixed(2)}:1 from the text it sits in, under 3:1: people who do not see that difference cannot tell it is a link (WCAG 1.4.1). Underline it (data-underline="always"), or keep unlined links to those that stand by themselves`);
  }
  // LNK-34: one description. The product's own stands; the words set for the page are written where there is none.
  let ours = written.get(anchor);
  const now = anchor.getAttribute('aria-description');
  if (ours !== undefined && now !== ours) {
    // The product wrote over it: it is the product's from here.
    written.delete(anchor);
    ours = undefined;
  }
  const wanted = describedAsExternal(anchor) && marks !== null && marks !== 'none' && !anchor.hasAttribute('aria-describedby');
  const words = externalWords(anchor);
  if (wanted && words && (ours !== undefined || !now?.trim())) {
    if (now !== words) anchor.setAttribute('aria-description', words);
    written.set(anchor, words);
  } else if (ours !== undefined) {
    anchor.removeAttribute('aria-description');
    written.delete(anchor);
  }
  if (wanted && !(anchor.getAttribute('aria-description') ?? '').trim()) {
    // Once for the page, not once for each link; the key is recorded for `missingWords()`.
    wordLacking(anchor, 'externalLabel');
    report(
      anchor.ownerDocument.documentElement,
      'LNK-34',
      'a link of this page leaves the site and nothing says so to people who cannot see the arrow: give each external link aria-description, or set the words once for the page — setWords({ externalLabel }) of @tanrei/web, or externalLabel of markExternalLinks() where the page is made ("external link", in the product’s language; Tanrei ships no words)',
    );
  }
}

/** Reads every anchor of a batch: first what each carries (attributes are written), then every style, then what follows. */
function readAll(anchors: Iterable<HTMLAnchorElement>) {
  const batch = [...anchors];
  for (const anchor of batch) read(anchor);
  const looked = batch.map(look);
  batch.forEach((anchor, index) => say(anchor, looked[index]));
}

let probe: CanvasRenderingContext2D | null | undefined;
/** A color as the browser computed it, as sRGB bytes — whatever space it is written in. Null: it cannot be read, or it lets what is behind it through. */
function bytes(color: string): [number, number, number] | null {
  if (probe === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      probe = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      probe = null;
    }
  }
  if (!probe) return null;
  try {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#010203';
    probe.fillStyle = color;
    // A color the canvas cannot read leaves the one before it.
    if (probe.fillStyle === '#010203' && !/^(#010203|rgb\(1, 2, 3\))$/i.test(color.trim())) return null;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return a === 255 ? [r, g, b] : null;
  } catch {
    return null;
  }
}
/** WCAG's relative luminance of an sRGB color. */
function luminance([r, g, b]: [number, number, number]): number {
  const linear = (byte: number) => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
/** WCAG's contrast ratio of two colors, or null where either cannot be read. */
function contrastOf(one: string, other: string): number | null {
  const [a, b] = [bytes(one), bytes(other)];
  if (!a || !b) return null;
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * LNK-27, LNK-33, for a browser without style container queries: the two choices of the design system, by name, on
 * the document's root, where the stylesheet reads them. A value a region set for itself is not seen (README, "Link").
 */
function syncSystem(doc: Document) {
  if (styleQueries()) return;
  const root = doc.documentElement;
  const style = getComputedStyle(root);
  for (const [attribute, token, values] of [
    ['data-underline-system', UNDERLINE_TOKEN, UNDERLINES],
    ['data-external-marks-system', MARKS_TOKEN, MARKS],
  ] as const) {
    const named = style.getPropertyValue(token).trim();
    const value = values.includes(named) ? named : values[0];
    if (root.getAttribute(attribute) !== value) root.setAttribute(attribute, value);
  }
}

/** The anchors whose address was refused and taken off: said once, as a refusal, and not again as a missing href. */
const refused = new WeakSet<Element>();

/**
 * The press is this script's from here: the stylesheet's own answer to `:active` (link.css, for a page without the
 * script) stands down for an anchor that carries `data-pressed`, so the attribute is written before anything reads a
 * style — the press primitive reads the system's feedback from the cascade first, and would otherwise compute the
 * stylesheet's overlay for that one read and hold it. The primitive then names the feedback in its place.
 */
function answered(anchor: HTMLAnchorElement) {
  if (!anchor.hasAttribute('data-pressed')) anchor.dataset.pressed = 'none';
}

const presses = new WeakMap<HTMLAnchorElement, PressController>();
/** The press of one anchor (the shared primitive), made when it is first pressed. */
function pressOf(anchor: HTMLAnchorElement): PressController {
  let press = presses.get(anchor);
  if (!press) {
    press = new PressController(anchor, {
      container: () => anchor,
      // The anchor's first transition is the hold (link.css), so its delay is press-hold as a time.
      holdCarrier: () => anchor,
      disabled: () => !live(anchor),
      keys: LINK_KEYS,
      // LNK-9's fallback: a link that runs over several lines has no one box to grow a ripple in.
      feedback: (named) => (named === 'ripple' && anchor.getClientRects().length > 1 ? 'overlay' : named),
    });
    presses.set(anchor, press);
  }
  return press;
}

/**
 * Where a root keeps the function that stops its observation: on the root itself, under a registered symbol, so that a
 * second copy of this module on the page (two bundles, or a document written again over the same window) takes the
 * first one's place instead of answering every press twice.
 */
const OBSERVING = Symbol.for('tanrei.observe-links');
type Stop = (() => void) & { owner?: object };
type Observed = (Document | ShadowRoot) & { [OBSERVING]?: Stop };
const OWNER = {};

/**
 * Adds the script side of the Link to every `a.tanrei-link` and every anchor of a `.tanrei-prose` under `root`, now
 * and as the page changes. `@tanrei/web` and `@tanrei/web/link` call it for the document when they load; call it
 * yourself for a shadow root of your own, which the document's listeners cannot see into. Calling it twice for one root
 * observes once. Returns a function that stops (what was already written on an anchor stays).
 */
export function observeLinks(root: Document | ShadowRoot = document): () => void {
  const observed = root as Observed;
  const running = observed[OBSERVING];
  if (running?.owner === OWNER) return running;
  if (typeof MutationObserver === 'undefined') return () => {};
  running?.();
  let held: { anchor: HTMLAnchorElement; press: PressController } | null = null;
  const release = () => {
    held?.press.release();
    held = null;
  };
  const onPointerDown = (event: Event) => {
    const anchor = linkOf(event.target);
    if (!anchor || !live(anchor)) return;
    const pointer = event as PointerEvent;
    if (pointer.button !== 0 && pointer.pointerType === 'mouse') return;
    answered(anchor);
    held = { anchor, press: pressOf(anchor) };
    held.press.onPointerDown(pointer);
  };
  // `pointerleave` does not reach the document: the press ends when the pointer goes out of the anchor it holds.
  const onPointerOut = (event: Event) => {
    const to = (event as PointerEvent).relatedTarget;
    if (held && !(to instanceof Node && held.anchor.contains(to))) release();
  };
  const onKeyDown = (event: Event) => {
    const anchor = linkOf(event.target);
    const key = event as KeyboardEvent;
    if (!anchor || !live(anchor) || key.repeat || !LINK_KEYS.includes(key.key)) return;
    answered(anchor);
    pressOf(anchor).onKeyDown(key);
  };
  const onKeyUp = (event: Event) => {
    const anchor = linkOf(event.target);
    if (anchor) presses.get(anchor)?.onKeyUp(event as KeyboardEvent);
  };
  const onFocusIn = (event: Event) => {
    const anchor = linkOf(event.target);
    if (anchor) syncFocusStyle(anchor, anchor);
  };
  const onFocusOut = (event: Event) => {
    const anchor = linkOf(event.target);
    if (anchor) presses.get(anchor)?.onBlur();
  };
  // LNK-19: a disabled link opens nothing and emits no click, even where the product left its address on it.
  const onClick = (event: Event) => {
    const anchor = linkOf(event.target);
    if (!anchor || !disabled(anchor)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  // LNK-32: a picture that cannot be loaded draws nothing in its room; one that arrives after all is drawn. (Neither
  // event bubbles: both are heard on their way down.)
  const pictureOf = (event: Event): [HTMLAnchorElement, HTMLImageElement] | null => {
    const picture = event.target;
    if (!(picture instanceof HTMLImageElement) || !picture.classList.contains(SITE_ICON)) return null;
    const anchor = picture.parentElement instanceof HTMLAnchorElement ? linkOf(picture.parentElement) : null;
    return anchor ? [anchor, picture] : null;
  };
  const onPictureError = (event: Event) => {
    const found = pictureOf(event);
    if (found) failed(...found);
  };
  const onPictureLoad = (event: Event) => {
    pictureOf(event)?.[1].removeAttribute('data-failed');
  };
  const listeners: [string, (event: Event) => void][] = [
    ['error', onPictureError],
    ['load', onPictureLoad],
    ['pointerdown', onPointerDown],
    ['pointerup', release],
    ['pointercancel', release],
    ['pointerout', onPointerOut],
    ['dragstart', release],
    ['keydown', onKeyDown],
    ['keyup', onKeyUp],
    ['focusin', onFocusIn],
    ['focusout', onFocusOut],
    ['click', onClick],
    ['auxclick', onClick],
  ];
  for (const [type, listener] of listeners) root.addEventListener(type, listener, true);

  const links = (anchors: Iterable<Element>) => [...anchors].filter((anchor): anchor is HTMLAnchorElement => anchor instanceof HTMLAnchorElement && anchor.isConnected && linkOf(anchor) === anchor);
  const doc = root instanceof Document ? root : root.ownerDocument;
  const observer = new MutationObserver((records) => {
    syncSystem(doc);
    const anchors = new Set<Element>();
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target instanceof HTMLAnchorElement) anchors.add(record.target);
        continue;
      }
      // A glyph or a text added to an anchor changes what names it.
      const around = record.target instanceof Element ? record.target.closest('a') : null;
      if (around) anchors.add(around);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.localName === 'a') anchors.add(node);
        for (const anchor of node.querySelectorAll('a')) anchors.add(anchor);
      }
    }
    readAll(links(anchors));
  });
  observer.observe(root, { attributes: true, attributeFilter: ATTRIBUTES, childList: true, subtree: true });
  // Where there are no style queries the root's own attributes may name another design system: its choices are read again.
  const systemObserver = styleQueries() ? null : new MutationObserver(() => syncSystem(doc));
  systemObserver?.observe(doc.documentElement, { attributes: true });
  syncSystem(doc);
  const reread = () => readAll(links(root.querySelectorAll('a')));
  settings().reread.add(reread);
  reread();

  const stop = () => {
    observer.disconnect();
    systemObserver?.disconnect();
    settings().reread.delete(reread);
    for (const [type, listener] of listeners) root.removeEventListener(type, listener, true);
    release();
    if (observed[OBSERVING] === stop) delete observed[OBSERVING];
  };
  observed[OBSERVING] = Object.assign(stop, { owner: OWNER });
  return stop;
}

if (typeof document !== 'undefined') observeLinks(document);
