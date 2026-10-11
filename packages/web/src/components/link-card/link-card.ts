import { type PropertyDeclarations, type PropertyValues, ReactiveElement } from 'lit';
import { type TanreiLinkCardNode, displayHost, hostNodes, isExternal, pictureAddress, plainText, repeatsHost } from '../../links/index.js';
import { AvailabilityController, LINK_KEYS, PressController, linkRel, readDestination, readTarget, report, syncFocusStyle, watchWords, wordFor } from '../../primitives/index.js';
import type { TanreiLinkCardVariantRegistry } from '../../registry.js';
import { adopt, adoptUnlessDrawn } from '../../primitives/sheets.js';

/** The core looks (outlined, filled), plus any a design system's generated `.d.ts` registers. */
export type TanreiLinkCardVariant = keyof TanreiLinkCardVariantRegistry;
/** Where the destination opens: where the person is, or a new context. HTML's `_self` and `_blank` are read as the two. */
export type TanreiLinkCardTarget = 'same' | 'new';
/** Whether the destination is on another site: `auto` decides as the Link does (LNK-30). */
export type TanreiLinkCardExternal = 'auto' | 'on' | 'off';

// The text of src/styles/link-card.css — the stylesheet that draws the card — written in by the build
// (scripts/build.js), so the element can add it to whichever root it is connected to. A build that wrote nothing
// leaves it empty, and the card is then drawn by the page's own copy of `@tanrei/web/link-card.css` alone.
declare const TANREI_LINK_CARD_CSS: string;
const LINK_CARD_CSS: string = (() => {
  try {
    return TANREI_LINK_CARD_CSS;
  } catch {
    return '';
  }
})();

const TAG = 'tanrei-link-card';
const PREFIX = '--tanrei-comp-link-card';
const CORE_VARIANTS: readonly string[] = ['outlined', 'filled'];
const DEFAULT_VARIANT = 'outlined';
const EXTERNALS: readonly string[] = ['auto', 'on', 'off'];
/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
/** What a look paints, at rest and in each state (the names link-card.css reads). */
const PAINTS = ['container', 'outline', 'title', 'description', 'site'];
const STATES = ['', 'hovered-', 'focused-', 'pressed-'];
/** The one value `data-external` holds when this element found the destination external; only it is ever taken back. */
const DETECTED = 'detected';
/** LKC-35: what takes focus or is pressed by itself. */
const INTERACTIVE = 'a, button, input, select, textarea, summary, iframe, object, embed, audio[controls], video[controls], [tabindex], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"]';
/** The parts of the body and of the site line, in the order they stand. */
const BODY_ORDER = ['title', 'description', 'image-alt', 'site', 'words'];
const SITE_ORDER = ['site-icon', 'site-name', 'address'];

type Root = Document | ShadowRoot;

const sheets = new Map<string, CSSStyleSheet>();
/** A stylesheet of the page, made once and shared by every root that needs it. */
function sheet(id: string, text: () => string): CSSStyleSheet | null {
  if (typeof CSSStyleSheet === 'undefined') return null;
  let made = sheets.get(id);
  if (!made) {
    made = new CSSStyleSheet();
    try {
      made.replaceSync(text());
    } catch {
      // A browser that cannot construct it: the page's own copy of link-card.css draws the card.
    }
    sheets.set(id, made);
  }
  return made;
}

/**
 * LKC-27: a look a design system added — each paint from that look's tokens, falling back to the default's.
 * In no cascade layer, so that it also wins over a copy of link-card.css a page loads into a layer of its own.
 */
const variantRules = (variant: string) =>
  `:where(${TAG}[variant='${variant}']) { ${STATES.flatMap((state) => PAINTS.map((paint) => `--_lc-${state}${paint}: var(${PREFIX}-${variant}-${state}${paint}-color, var(${PREFIX}-${DEFAULT_VARIANT}-${state}${paint}-color));`)).join(' ')} }`;

/** Writes an attribute only when it differs: what is written here is observed, and must settle. */
function mark(element: Element, name: string, value: string | null) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Writes text only when it differs — as a text node, never as markup (LKC-15). */
function say(element: Element, text: string) {
  if (element.textContent !== text) element.textContent = text;
}

/**
 * What the product said once for every link of the page: the origins that are its own site (`setSiteOrigins()` of
 * `@tanrei/web/link`, LNK-30). The Link's script keeps them under a registered symbol so that two copies of a module
 * hold one answer; the link card reads them where they are kept and has no declaration of its own (LKC-24). The words
 * of an external link and of a new context are the product's words (`setWords()`), read with `wordFor()`.
 */
interface LinkSettings {
  site?: readonly string[];
  reread?: Set<() => void>;
}
const SETTINGS = Symbol.for('tanrei.link-settings');
function linkSettings(): LinkSettings {
  const holder = globalThis as { [SETTINGS]?: LinkSettings };
  return (holder[SETTINGS] ??= { site: [], reread: new Set() });
}

let cards = 0;

/**
 * One link drawn as a block: the destination's title, a sentence about it, its picture and the site it is on — from
 * values the card is given and never loads. The host under the text is always computed from `href`.
 *
 * Contract: specs/link-card.spec.json. The element has **no shadow root**: it is the box around the product's own
 * anchor, which stays in the document — a link before any script runs, for a crawler, a reader mode and the browser's
 * own menu (LKC-1).
 *
 * ```html
 * <tanrei-link-card>
 *   <a href="https://example.com/articles/designing-with-tokens">
 *     <span data-part="body">
 *       <span data-part="title" dir="auto">Designing with tokens</span>
 *       <span data-part="description" dir="auto">How a handful of dials becomes a whole system.</span>
 *       <span data-part="site">
 *         <img data-part="site-icon" src="/link-pictures/icon.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
 *         <span data-part="site-name"><span dir="auto">Example Journal</span></span>
 *         <span data-part="address"><bdi data-part="host" dir="ltr">example.com</bdi></span>
 *       </span>
 *     </span>
 *     <img data-part="media" src="/link-pictures/picture.png" alt="" width="1200" height="630" loading="lazy" decoding="async" referrerpolicy="no-referrer">
 *   </a>
 * </tanrei-link-card>
 * ```
 *
 * That markup is what `linkCardToNodes()` / `linkCardToHtml()` of `@tanrei/web/links/node` write where a site is built;
 * `@tanrei/web/link-card.css` draws all of it before and without this script, so a page of link cards does not move
 * when the script arrives (LKC-36). The script adds what a document cannot hold: the host computed anew from `href`
 * (one written in the document that differs is replaced, and reported), the title as the link's name and the other
 * parts as its description, `data-external` where the page was not marked, a picture that fails taken away, the
 * shared press primitive, and the debug reports.
 *
 * **A card the element builds.** A `<tanrei-link-card>` that holds no anchor is given one from its attributes —
 * `href`, `headline`, `description`, `image`, `image-alt`, `site-name`, `site-icon`, `target`, `target-label`,
 * `external`, `external-label` — each value cleaned and written as text, never as markup (LKC-15). That form is drawn
 * when the element is defined, not before. Where the element holds the product's own anchor, an attribute that is
 * given is written over that anchor's part and one that is not leaves the markup as it is.
 *
 * **It requests nothing about the destination** (LKC-14): no address is derived from `href`, and the only requests are
 * the two pictures it was given, each an `<img>` asked for without the page's address.
 *
 * @tag tanrei-link-card
 * @slot - The product's own anchor, holding the parts (`data-part`: `body` around `title`, `description`, `image-alt`, `site` and `words`; then `media`). A child in the document, not a slotted node: the element has no shadow root. Nothing in it is pressed by itself (LKC-35).
 * @fires click - The anchor's own `click`, before the destination opens; cancelling it cancels the navigation (a client-side router takes it).
 */
export class TanreiLinkCard extends ReactiveElement {
  private readonly availability = new AvailabilityController(this, 'link-card');

  static override properties: PropertyDeclarations = {
    href: { type: String },
    target: { type: String },
    targetLabel: { type: String, attribute: 'target-label' },
    external: { type: String },
    externalLabel: { type: String, attribute: 'external-label' },
    headline: { type: String },
    description: { type: String },
    image: { type: String },
    imageAlt: { type: String, attribute: 'image-alt' },
    siteName: { type: String, attribute: 'site-name' },
    siteIcon: { type: String, attribute: 'site-icon' },
    // The default is not reflected: a card that is defined is the card that was written.
    variant: { type: String, reflect: true, useDefault: true },
  };

  /** The destination, as an anchor takes it: a URL, a path or a fragment. It is also the one thing the host is read from. Empty, a script, or unreadable: the card is not a link and is not drawn as a card. */
  href = '';

  /** Where the destination opens: `same` (where the person is) or `new` (a new tab or window, marked with open_in_new and said through `targetLabel`). HTML's `_blank` and `_self` are read as the two. */
  target: TanreiLinkCardTarget = 'same';

  /** What assistive technology reads at the end of the card's description while `target` is `new` ("opens in a new tab"), in the product's language. Tanrei ships no words. */
  targetLabel = '';

  /** Whether the destination is on another site: `auto` decides as the Link does (the address against the page's origin and `setSiteOrigins()`), `on` and `off` say so. An external card that opens where the person is draws arrow_outward. */
  external: TanreiLinkCardExternal = 'auto';

  /** What assistive technology reads at the end of the description while the destination is external and `target` is `same` ("external link"). Empty, the words set once with `setExternalLabel()` are read. */
  externalLabel = '';

  /** The destination's title; the card's accessible name. Plain text, on at most `comp.link-card.title.max-lines` lines. Empty, the address is drawn in its place. (`headline`, because HTML's global `title` would show a tooltip over the whole card.) */
  headline = '';

  /** A sentence or two about the destination. Plain text; the first part of the card's description. */
  description = '';

  /** The address of a picture that stands for the destination: beside the text in a wide card, above it in a narrow one. The card asks for this address, as a picture, and for nothing else about the destination. */
  image = '';

  /** What the picture shows, where that is worth saying. Never drawn; read as part of the description. Empty, the picture is decoration. */
  imageAlt = '';

  /** What the destination's site calls itself. Drawn before the host, cut first, never in the host's place; not drawn where it only repeats the host. */
  siteName = '';

  /** The address of the destination site's small icon, given to the card and never looked up by it. */
  siteIcon = '';

  /** How the card is set apart: `outlined` is the surface inside one hairline, `filled` a tone of the surface and no edge. A design system may add values. */
  variant: TanreiLinkCardVariant = 'outlined';

  private readonly serial = ++cards;
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.changed(records));
  /** Whether the anchor is one this element wrote (a card built from attributes): then every part is the properties'. */
  private built = false;
  /** What this element wrote on the anchor, so that only that is ever taken off again. */
  private readonly given = new Set<string>();
  private wroteExternal: string | null = null;
  private wroteTarget = false;
  /** The words part and the host part this element wrote: what the document holds otherwise is the product's. */
  private ownWords: string | null = null;
  private productWords = '';
  private ownHost: string | null = null;
  /** The addresses of pictures that could not be loaded: none is asked for again until the product gives it anew. */
  private readonly refused = new Set<string>();
  /** The anchor the press primitive answers for. */
  private pressed: HTMLAnchorElement | null = null;
  private readonly press = new PressController(this, {
    container: () => this.pressed ?? this.anchor(),
    // The body's transition delay is press-hold as a time (link-card.css); nothing of it transitions.
    holdCarrier: () => (this.pressed ?? this.anchor())?.querySelector(':scope > [data-part="body"]') ?? null,
    disabled: () => !(this.pressed ?? this.anchor())?.hasAttribute('href'),
    // LKC-22: Enter, never Space.
    keys: LINK_KEYS,
  });
  private readonly reread = () => this.read();
  /** The product's words changed: the words of a new context and of another site are read again. */
  private unwatchWords: (() => void) | null = null;
  private waiting = false;

  /** No shadow root: the anchor is the document's. */
  protected override createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptUnlessDrawn(this, sheet('link-card', () => LINK_CARD_CSS), '--_lc-container');
    this.mutations?.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'target', 'src', 'data-external'] });
    for (const [type, listener] of this.listeners) this.addEventListener(type, listener, true);
    linkSettings().reread?.add(this.reread);
    this.unwatchWords = watchWords(this.reread);
    if (this.hasUpdated) this.read();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.mutations?.disconnect();
    for (const [type, listener] of this.listeners) this.removeEventListener(type, listener, true);
    linkSettings().reread?.delete(this.reread);
    this.unwatchWords?.();
    this.unwatchWords = null;
    this.pressed = null;
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has('variant')) this.readVariant();
    // LKC-27: an external the card does not define is auto.
    if (changed.has('external') && !EXTERNALS.includes(String(this.external ?? 'auto'))) {
      report(this, 'LKC-27', `external "${this.external}" is not a value the link card defines ("auto", "on" or "off"); the address decides`);
    }
    if (changed.has('target') && !readTarget(this.target).known) {
      report(this, 'LKC-27', `target "${this.target}" is not a value the link card defines ("same" or "new"); it opens where the person is`);
    }
    // LKC-13: a picture whose address changed is a new picture — its box is drawn until it has loaded.
    this.read(changed.has('image'), changed.has('siteIcon'));
  }

  /**
   * LKC-27: a look the core does not have was added by a design system — its rule is added to the root, falling back
   * to the default's tokens — or is unknown to the active one, which a debug build says.
   */
  private readVariant() {
    const variant = String(this.variant ?? '');
    if (CORE_VARIANTS.includes(variant)) return;
    const known = KEY.test(variant);
    if (known) adopt(this.getRootNode() as Root, sheet(`variant:${variant}`, () => variantRules(variant)));
    if (!known || getComputedStyle(this).getPropertyValue(`${PREFIX}-${variant}-container-color`).trim() === '') {
      report(this, 'LKC-27', `variant "${variant}" is not a value of the active design system; it is drawn as "${DEFAULT_VARIANT}"`);
    }
  }

  private anchor(): HTMLAnchorElement | null {
    return this.querySelector<HTMLAnchorElement>(':scope > a');
  }

  /** What changed inside the card: everything is read again, unless it was only the ripple's own layer. */
  private changed(records: MutationRecord[]) {
    const ripple = (node: Node) => node instanceof Element && node.classList.contains('ripple');
    if (records.every((record) => record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(ripple))) return;
    this.read();
  }

  /** A part of `parent` by its name, made in its place among the others where it is missing. */
  private partOf<T extends HTMLElement = HTMLElement>(parent: Element, id: string, order: readonly string[], name = 'span'): T {
    const found = parent.querySelector<T>(`:scope > [data-part="${id}"]`);
    if (found) return found;
    const made = document.createElement(name) as T;
    made.setAttribute('data-part', id);
    const later = order.slice(order.indexOf(id) + 1).map((next) => parent.querySelector(`:scope > [data-part="${next}"]`)).find(Boolean);
    if (later) later.before(made);
    else parent.append(made);
    return made;
  }

  private drop(parent: Element | null, id: string) {
    parent?.querySelector(`:scope > [data-part="${id}"]`)?.remove();
  }

  /**
   * Reads the card and writes what follows from it: the anchor and the parts the properties ask for, then what a
   * document cannot hold — the host, the marks, the name and the description, the pictures' attributes and failures.
   * Called when a property changes and when the card's content does (LKC-34); it writes only what differs, so it
   * settles. It asks the network for nothing (LKC-14): the only addresses it writes are the two pictures it was given.
   */
  private read(newImage = false, newIcon = false) {
    if (!this.isConnected) return;
    let anchor = this.anchor();
    const asked = !!(this.href || this.headline);
    if (!anchor) {
      if (!asked) return;
      // A card that is still being parsed may yet hold the product's own anchor: it is read again when it is whole.
      if (document.readyState === 'loading') {
        if (!this.waiting) {
          this.waiting = true;
          document.addEventListener('DOMContentLoaded', () => ((this.waiting = false), this.read()), { once: true });
        }
        return;
      }
      anchor = this.appendChild(document.createElement('a'));
      this.built = true;
    }
    this.write(anchor, newImage, newIcon);
    this.enhance(anchor);
    // What was written here is not a change to read again.
    this.mutations?.takeRecords();
  }

  /** Whether a property speaks for its part: always in a card the element built, and where it is given otherwise. */
  private speaks(value: string, unset = '') {
    return this.built || (value ?? unset) !== unset;
  }

  /** The properties, written into the anchor and its parts — each value cleaned, each written as text (LKC-15). */
  private write(anchor: HTMLAnchorElement, newImage: boolean, newIcon: boolean) {
    if (this.speaks(this.href)) {
      const { href, refusal } = readDestination(this.href);
      mark(anchor, 'href', href);
      if (href === null && this.href.trim()) {
        report(this, 'LKC-27', refusal === 'script' ? 'href names a script to run, not a place to go: the card is not a link, and its title is drawn as text' : `href "${this.href}" cannot be read as an address: the card is not a link, and its title is drawn as text`);
      }
    }
    if (this.speaks(this.target, 'same') || this.wroteTarget) {
      const opensNew = readTarget(this.target).target === 'new';
      mark(anchor, 'target', opensNew ? '_blank' : null);
      this.wroteTarget = opensNew;
    }
    const wantsBody = this.built || !!(this.headline || this.description || this.siteName || this.siteIcon || this.imageAlt);
    const body = wantsBody ? this.partOf(anchor, 'body', ['body', 'media']) : anchor.querySelector<HTMLElement>(':scope > [data-part="body"]');
    if (body && anchor.firstElementChild !== body && !anchor.firstElementChild?.classList.contains('ripple')) anchor.prepend(body);
    if (body && this.speaks(this.headline)) {
      const title = plainText(this.headline);
      if (title) {
        const made = this.partOf(body, 'title', BODY_ORDER);
        say(made, title);
        mark(made, 'dir', 'auto');
        mark(made, 'data-address', null);
      } else {
        // The address stands in its place (enhance), or — in a card that is no link — nothing does.
        const part = body.querySelector(':scope > [data-part="title"]');
        if (part) say(part, '');
      }
    }
    if (body && this.speaks(this.description)) {
      const description = plainText(this.description);
      if (description) {
        const part = this.partOf(body, 'description', BODY_ORDER);
        say(part, description);
        mark(part, 'dir', 'auto');
      } else this.drop(body, 'description');
    }
    if (this.speaks(this.image)) this.picture(anchor, 'media', ['body', 'media'], this.image, newImage, 'image', 'LKC-14');
    if (body && this.speaks(this.imageAlt)) {
      const alt = plainText(this.imageAlt);
      if (alt && anchor.querySelector(':scope > img[data-part="media"]')) say(this.partOf(body, 'image-alt', BODY_ORDER), alt);
      else this.drop(body, 'image-alt');
    }
    if (body && this.speaks(this.siteName)) {
      const name = plainText(this.siteName);
      if (name) {
        const part = this.partOf(this.partOf(body, 'site', BODY_ORDER), 'site-name', SITE_ORDER);
        const text = part.querySelector<HTMLElement>(':scope > span') ?? part.appendChild(document.createElement('span'));
        say(text, name);
        mark(text, 'dir', 'auto');
      } else this.drop(body.querySelector(':scope > [data-part="site"]'), 'site-name');
    }
    if (body && this.speaks(this.siteIcon)) {
      const site = pictureAddress(this.siteIcon) && !this.refused.has(pictureAddress(this.siteIcon)) ? this.partOf(body, 'site', BODY_ORDER) : body.querySelector(':scope > [data-part="site"]');
      this.picture(site, 'site-icon', SITE_ORDER, this.siteIcon, newIcon, 'siteIcon', 'LKC-14');
    }
  }

  /**
   * LKC-10, LKC-11, LKC-14: a picture the card was given, as an `<img>` and nothing else — asked for without the page's
   * address and only once the card is near what is shown. An address that is no picture's is treated as empty.
   */
  private picture(parent: Element | null, id: string, order: readonly string[], given: string, renew: boolean, prop: string, behavior: string) {
    const src = pictureAddress(given);
    if (!src && given.trim()) report(this, behavior, `${prop} "${given.length > 96 ? `${given.slice(0, 96)}…` : given}" is not the address of a picture (a script, or an address that cannot be read): it is treated as empty and nothing is asked for`);
    if (!parent) return;
    let picture = parent.querySelector<HTMLImageElement>(`:scope > img[data-part="${id}"]`);
    if (!src) {
      picture?.remove();
      return;
    }
    if (renew) this.refused.delete(src);
    // LKC-10, LKC-13: a picture that could not be loaded is not asked for again by the card itself.
    if (this.refused.has(src)) return;
    if (picture && picture.getAttribute('src') === src && !renew) return;
    // LKC-13: a new address is a new picture, so that its box — not the picture before it — is drawn until it loads.
    picture?.remove();
    picture = document.createElement('img');
    picture.setAttribute('data-part', id);
    // Every attribute before the address: the request that the address starts already carries them.
    picture.setAttribute('alt', '');
    picture.setAttribute('loading', 'lazy');
    picture.setAttribute('decoding', 'async');
    picture.setAttribute('referrerpolicy', 'no-referrer');
    picture.setAttribute('src', src);
    const later = order.slice(order.indexOf(id) + 1).map((next) => parent.querySelector(`:scope > [data-part="${next}"]`)).find(Boolean);
    if (later) later.before(picture);
    else if (id === 'site-icon') parent.prepend(picture);
    else parent.append(picture);
  }

  /** What a document cannot hold (LKC-36), written on the product's own anchor and on one this element built alike. */
  private enhance(anchor: HTMLAnchorElement) {
    const id = (element: Element, part: string) => (element.id ||= `tanrei-link-card-${this.serial}-${part}`);
    // LKC-27: what is not a place to go is not a destination, and a card without one is not a link.
    const given = anchor.getAttribute('href');
    if (given !== null && readDestination(given).href === null) {
      anchor.removeAttribute('href');
      if (given.trim()) report(this, 'LKC-27', readDestination(given).refusal === 'script' ? 'href names a script to run, not a place to go; it is taken off and the card is not a link' : `href "${given}" cannot be read as an address; it is taken off and the card is not a link`);
    }
    const body = anchor.querySelector<HTMLElement>(':scope > [data-part="body"]');
    const href = anchor.getAttribute('href');
    if (href === null) {
      // Not a link and not drawn as a card: the title as text. It asks for nothing, so its pictures are taken away.
      for (const picture of anchor.querySelectorAll('img[data-part="media"], img[data-part="site-icon"]')) picture.remove();
      for (const attribute of ['aria-labelledby', 'aria-describedby', 'target', 'rel']) if (this.given.delete(attribute) || attribute === 'target') mark(anchor, attribute, null);
      if (this.wroteExternal !== null) mark(anchor, 'data-external', null);
      this.wroteExternal = null;
      if (this.built && body) for (const part of [...body.children]) if (part.getAttribute('data-part') !== 'title') part.remove();
      if (document.readyState !== 'loading') report(this, 'LKC-27', 'it has no destination, so it is not a link and is not drawn as a card: its title, where it has one, is drawn as text');
      return;
    }

    // LKC-23, LKC-27: where it opens, in HTML's spelling; a new context gets no handle to this page.
    const target = (anchor.getAttribute('target') ?? '').trim().toLowerCase();
    const opensNew = target === '_blank';
    if (opensNew) {
      const rel = linkRel(anchor.getAttribute('rel'), 'new');
      if (rel !== null && rel !== anchor.getAttribute('rel')) anchor.setAttribute('rel', rel);
    } else if (target !== '' && target !== '_self') {
      report(this, 'LKC-27', `target "${anchor.getAttribute('target')}" is not a value the link card defines ("_blank" for a new context, or none); it is taken off and the card opens where the person is`);
      anchor.removeAttribute('target');
    }

    let text = body;
    if (!text) {
      // An anchor that holds only its own text (`<a href="…">Title</a>`): that text is the title.
      const loose = [...anchor.childNodes].filter((node) => !(node instanceof Element && (node.classList.contains('ripple') || node.getAttribute('data-part') === 'media')));
      text = document.createElement('span');
      text.setAttribute('data-part', 'body');
      anchor.prepend(text);
      if (loose.some((node) => (node.textContent ?? '').trim())) this.partOf(text, 'title', BODY_ORDER).append(...loose);
    }
    // LKC-5: without a title the address, as it was given, stands in its place and names the card.
    const title = this.partOf(text, 'title', BODY_ORDER);
    if (title.hasAttribute('data-address') || !(title.textContent ?? '').trim()) {
      say(title, href.trim());
      mark(title, 'dir', 'ltr');
      mark(title, 'data-address', '');
      report(this, 'LKC-5', 'the link card has no title: the address is drawn in its place and names it. Give it the destination’s title');
    }

    // LKC-8, LKC-9: the host, from href and from nothing else.
    const host = displayHost(href);
    let site = text.querySelector<HTMLElement>(':scope > [data-part="site"]');
    let address = site?.querySelector<HTMLElement>(':scope > [data-part="address"]') ?? null;
    let hostPart = address?.querySelector<HTMLElement>(':scope > [data-part="host"]') ?? null;
    const written = hostPart?.textContent ?? '';
    if (hostPart && written !== host && written.trim() && written !== this.ownHost) {
      report(this, 'LKC-8', `the host written in the document, "${written.trim().slice(0, 96)}", is not the host of href, "${host}": it is replaced. The host is computed from href and nothing can set it`);
    }
    // LKC-7: a site name that says only what the host says is not drawn.
    const name = site?.querySelector<HTMLElement>(':scope > [data-part="site-name"]') ?? null;
    const named = (name?.textContent ?? '').trim();
    if (name && !named) name.remove();
    const drawsName = !!named && !repeatsHost(named, host);
    if (name && named) mark(name, 'data-undrawn', drawsName ? null : '');

    // LKC-24: external exactly as the Link decides it (LNK-30) — the product's word, or the address.
    const wanted = EXTERNALS.includes(String(this.external)) ? this.external : 'auto';
    const marked = anchor.getAttribute('data-external');
    const products = marked !== null && marked !== this.wroteExternal && marked !== DETECTED;
    if (wanted === 'on' || wanted === 'off') {
      this.wroteExternal = wanted === 'on' ? 'true' : 'false';
      mark(anchor, 'data-external', this.wroteExternal);
    } else if (!products) {
      const page = this.ownerDocument.location?.href;
      // `anchor.href` is the address as the browser will follow it, read against the document's base.
      const found = isExternal(anchor.href, { ...(page ? { base: page } : {}), site: linkSettings().site ?? [], download: anchor.hasAttribute('download') });
      this.wroteExternal = found ? DETECTED : null;
      mark(anchor, 'data-external', this.wroteExternal);
    }
    const external = anchor.hasAttribute('data-external') && anchor.getAttribute('data-external') !== 'false';
    const shows = opensNew || external;

    // The site line: the address holds the host and, after it, the mark; a line that would hold nothing is not there.
    if (host || shows) {
      site ??= this.partOf(text, 'site', BODY_ORDER);
      address ??= this.partOf(site, 'address', SITE_ORDER);
      if (host) {
        if (!hostPart) {
          hostPart = document.createElement('bdi');
          hostPart.setAttribute('data-part', 'host');
          address.append(hostPart);
        }
        mark(hostPart, 'dir', 'ltr');
        if (written !== host || !hostPart.firstChild) hostPart.replaceChildren(
          ...hostNodes(host).map((node: TanreiLinkCardNode) => {
            if (typeof node === 'string') return document.createTextNode(node);
            const label = document.createElement(node.name);
            label.textContent = node.children.join('');
            return label;
          }),
        );
        this.ownHost = host;
      } else hostPart?.remove();
    } else {
      hostPart?.remove();
      address?.remove();
    }
    if (!host) hostPart = null;
    if (site && !site.firstElementChild) {
      site.remove();
      site = null;
    }

    // LKC-23, LKC-24, LKC-25: the words of a new context, or of another site — the last thing read.
    let words = text.querySelector<HTMLElement>(':scope > [data-part="words"]');
    // Words the document holds that this element did not write are the product's, and stand where no property speaks.
    if (words && (words.textContent ?? '') !== this.ownWords) this.productWords = (words.textContent ?? '').trim();
    const said = plainText(opensNew ? this.targetLabel || this.productWords || wordFor(this, 'targetLabel') : external ? this.externalLabel || this.productWords || wordFor(this, 'externalLabel') : '');
    if (said) {
      words ??= this.partOf(text, 'words', BODY_ORDER);
      say(words, said);
      this.ownWords = said;
    } else if (words) {
      words.remove();
      words = null;
      this.ownWords = null;
    }
    if (opensNew && !said) report(this, 'LKC-23', 'it opens a new context and targetLabel is empty, so nothing says so to people who cannot see the mark; give it the words ("opens in a new tab", in the product’s language)');
    if (external && !opensNew && !said) {
      report(this, 'LKC-24', 'it leaves the site and nothing says so to people who cannot see the arrow: give it externalLabel, or set the words once for the page with setExternalLabel() of @tanrei/web/link ("external link", in the product’s language; Tanrei ships no words)');
    }

    // LKC-10, LKC-11, LKC-13, LKC-14: the pictures — decoration, asked for as pictures, without the page's address.
    const media = this.readPicture(anchor.querySelector<HTMLImageElement>(':scope > img[data-part="media"]'), 'image', 'LKC-13');
    this.readPicture(site?.querySelector<HTMLImageElement>(':scope > img[data-part="site-icon"]') ?? null, 'siteIcon', 'LKC-10');
    // Removing a failed icon may have emptied the site line.
    if (site && !site.firstElementChild) {
      site.remove();
      site = null;
    }
    // LKC-25: what a picture shows is read only for a picture that has arrived.
    const alt = text.querySelector<HTMLElement>(':scope > [data-part="image-alt"]');
    if (alt && !media) alt.remove();
    const shown = !!media && media.complete && media.naturalWidth > 0;

    // LKC-25: the title names the link and nothing is added to it; the rest describes it, in order.
    const description = text.querySelector<HTMLElement>(':scope > [data-part="description"]');
    const describing = [description && (description.textContent ?? '').trim() ? description : null, alt && media && shown ? alt : null, name?.isConnected && drawsName ? name : null, hostPart, words].filter((part): part is HTMLElement => !!part);
    this.give(anchor, {
      'aria-labelledby': id(title, 'title'),
      'aria-describedby': describing.length ? describing.map((part) => id(part, part.getAttribute('data-part') ?? 'part')).join(' ') : null,
    });

    // LKC-35: nothing inside a link card is pressed by itself.
    for (const inner of this.querySelectorAll<HTMLElement>(INTERACTIVE)) {
      if (inner === anchor || inner.hasAttribute('inert')) continue;
      report(this, 'LKC-35', `it holds an interactive element (<${inner.localName}>): a link card is one link and nothing inside it is pressed by itself. The element is made inert; a preview with its own controls is a Card that holds a Link and those controls`);
      inner.setAttribute('inert', '');
    }
  }

  /** Writes `wanted` on the anchor, leaving alone what the product wrote there itself, and takes off only what this element wrote. */
  private give(anchor: Element, wanted: Record<string, string | null>) {
    for (const [attribute, value] of Object.entries(wanted)) {
      if (value === null) {
        if (this.given.delete(attribute)) anchor.removeAttribute(attribute);
      } else if (this.given.has(attribute) || !anchor.hasAttribute(attribute)) {
        mark(anchor, attribute, value);
        this.given.add(attribute);
      }
    }
  }

  /**
   * A picture as the document holds it: what the markup left out is written (the build step writes all of it, so the
   * first request already carries it), an address that is no picture's is taken away, another party's is reported, and
   * one that has already failed is taken away. Returns the picture where it is still there.
   */
  private readPicture(picture: HTMLImageElement | null, prop: string, failure: string): HTMLImageElement | null {
    if (!picture) return null;
    const given = picture.getAttribute('src') ?? '';
    if (!pictureAddress(given)) {
      if (given.trim()) report(this, 'LKC-14', `${prop} "${given.length > 96 ? `${given.slice(0, 96)}…` : given}" is not the address of a picture (a script, or an address that cannot be read): it is treated as empty and nothing is asked for`);
      picture.remove();
      return null;
    }
    if (picture.getAttribute('alt') !== '') picture.setAttribute('alt', '');
    if (!picture.hasAttribute('referrerpolicy')) {
      report(this, 'LKC-14', `its ${prop} has no referrerpolicy: a picture is asked for without the page’s address; referrerpolicy="no-referrer" is written for it, but the first request may already have carried the address — write it in the markup (linkCardToNodes() does)`);
      picture.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (!picture.hasAttribute('loading')) picture.setAttribute('loading', 'lazy');
    if (!picture.hasAttribute('decoding')) picture.setAttribute('decoding', 'async');
    try {
      const src = new URL(given, this.baseURI);
      const page = this.ownerDocument.location;
      if (['http:', 'https:'].includes(src.protocol) && page && src.origin !== page.origin) {
        report(this, 'LKC-14', `its ${prop} is asked of ${src.origin}, not of this site: every reader’s browser then tells that party which page is being read. Give a picture the product serves itself (the build-time helper, @tanrei/web/links/node, keeps one among the site’s own files when the site is built)`);
      }
    } catch {
      // An address that cannot be read against this page loads nothing, and fails below.
    }
    // A picture that failed before this script could hear it.
    if (picture.complete && picture.naturalWidth === 0 && picture.currentSrc !== '') {
      this.failed(picture, prop, failure);
      return null;
    }
    return picture;
  }

  /** LKC-10, LKC-13: a picture that cannot be loaded is taken away — no mark, no text, no box — and not asked for again. */
  private failed(picture: HTMLImageElement, prop: string, behavior: string) {
    const src = picture.getAttribute('src') ?? '';
    this.refused.add(src);
    picture.remove();
    report(this, behavior, `its ${prop} "${src.length > 96 ? `${src.slice(0, 96)}…` : src}" cannot be loaded or decoded: the card is drawn without it`);
  }

  private own(event: Event): HTMLAnchorElement | null {
    const anchor = this.anchor();
    return anchor && event.target instanceof Node && anchor.contains(event.target) ? anchor : null;
  }

  private readonly onPicture = (event: Event) => {
    const picture = event.target;
    if (!(picture instanceof HTMLImageElement) || !this.own(event)) return;
    const part = picture.getAttribute('data-part');
    if (part !== 'media' && part !== 'site-icon') return;
    if (event.type === 'error') this.failed(picture, part === 'media' ? 'image' : 'siteIcon', part === 'media' ? 'LKC-13' : 'LKC-10');
    this.read();
  };

  private readonly release = () => {
    this.press.release();
  };

  /** Listened for on the element, on the way down: the anchor and its parts are the document's, and get no listener of their own. */
  private readonly listeners: [string, (event: Event) => void][] = [
    ['error', this.onPicture],
    ['load', this.onPicture],
    [
      'pointerdown',
      (event) => {
        const anchor = this.own(event);
        if (!anchor?.hasAttribute('href')) return;
        this.pressed = anchor;
        this.press.onPointerDown(event as PointerEvent);
      },
    ],
    ['pointerup', this.release],
    ['pointercancel', this.release],
    // (It does not bubble, and is heard here for every part: the press ends when the pointer leaves the anchor itself.)
    ['pointerleave', (event) => event.target === this.pressed && this.release()],
    ['dragstart', this.release],
    [
      'keydown',
      (event) => {
        const anchor = this.own(event);
        if (!anchor?.hasAttribute('href') || event.target !== anchor) return;
        this.pressed = anchor;
        this.press.onKeyDown(event as KeyboardEvent);
      },
    ],
    ['keyup', (event) => this.press.onKeyUp(event as KeyboardEvent)],
    [
      'focusin',
      (event) => {
        const anchor = this.own(event);
        // LKC-20: sys.behavior.focus-style, read when focus arrives, where the browser has no style queries.
        if (anchor) syncFocusStyle(this, anchor);
      },
    ],
    ['focusout', () => this.press.onBlur()],
  ];
}

if (!customElements.get('tanrei-link-card')) customElements.define('tanrei-link-card', TanreiLinkCard);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-link-card': TanreiLinkCard;
  }
}
