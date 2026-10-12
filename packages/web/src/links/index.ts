// What a link's address says, as pure functions: the same answer where a page is made (the build step of
// `@tanrei/web/links`, under Node) and where it is read (the Link's script, the link card's element, in a browser).
//
//   isExternal(href, { base, site })   LNK-30's rule for the web: is the destination on another site?
//   displayHost(href)                  LKC-8, LKC-9: the host as a link card draws it, or '' where href has none
//   plainText(value)                   LKC-15: a value a destination wrote, as the plain text a link card draws
//   repeatsHost(siteName, host)        LKC-7: a site name that says only what the host says is not drawn
//   pictureAddress(src)                LKC-14: an address a link card may ask for as a picture, or ''
//   linkCardToNodes(data, options)     LKC-36: the markup of a link card, as plain node descriptions
//
// This module holds NO dependency of a place: no DOM, no Node API, no file, no network, no state. `URL` and the
// regular expressions of the language are all it uses, so a browser entry point and a Node entry may both import it
// (node/REQUIREMENTS.md, LKD-2). Nothing here throws for an address it cannot read: such an
// address is not external, and has no host.

/** What `isExternal()` is told about the page and the product. */
export interface ExternalOptions {
  /**
   * The address of the page the link is on. `href` is read against it (a path, a fragment), and a destination of its
   * origin is never external. Where the page is made its address is often not known: leave it out, and only what
   * `site` names is the product's own.
   */
  base?: string;
  /**
   * The origins that are the product's own site, beside the page's: an origin (`https://docs.example.com`,
   * `https://example.com:8443`), a host name (`docs.example.com`: that host, on any port), or a host with a leading
   * `*.` for its subdomains (`*.example.com`: `docs.example.com` and `a.b.example.com`, not `example.com` itself).
   * An entry that cannot be read names nothing.
   */
  site?: readonly string[];
  /** Whether the anchor asks for a download (it carries `download`): a download is never external. */
  download?: boolean;
}

const WEB = ['http:', 'https:'];

function parse(href: string, base?: string): URL | null {
  try {
    return base === undefined ? new URL(href) : new URL(href, base);
  } catch {
    return null;
  }
}

/** Whether `url` is of the origin, the host or the subdomains `entry` names. */
function names(entry: string, url: URL): boolean {
  const given = entry.trim().toLowerCase();
  if (!given) return false;
  if (given.includes('://')) {
    const own = parse(given);
    return !!own && WEB.includes(own.protocol) && own.origin === url.origin;
  }
  const subdomains = given.startsWith('*.');
  // The host as the address parser writes it (an internationalised name in its ASCII form), so the two compare.
  const own = parse(`https://${subdomains ? given.slice(2) : given}`);
  if (!own || own.pathname !== '/' || own.username || own.search || own.hash) return false;
  if (subdomains) return !own.port && url.hostname.endsWith(`.${own.hostname}`);
  return own.port ? own.host === url.host : own.hostname === url.hostname;
}

/**
 * LNK-30, for the web: whether `href` leads to another site than the one the person is on. Exactly when `href`, read
 * against `base`, has the scheme `http` or `https`, its origin is neither `base`'s nor one `site` names, and the
 * anchor does not ask for a download. A path, a fragment, an address of any other scheme (a mail address, a telephone
 * number), a download and an address that cannot be read are never external.
 *
 * It changes nothing about where or how an address opens: it is what the Link shows and says (LNK-31 to LNK-34).
 */
export function isExternal(href: string, { base, site = [], download = false }: ExternalOptions = {}): boolean {
  if (download) return false;
  const page = base === undefined ? null : parse(base);
  // A base that is no address (or none) resolves no path: a path is then not read, and is not external.
  const url = page ? parse(href, page.href) : parse(href);
  if (!url || !WEB.includes(url.protocol)) return false;
  if (page && page.origin === url.origin) return false;
  return !site.some((entry) => names(entry, url));
}

// ── Punycode (RFC 3492), for one label: no platform gives it to a browser and to Node alike ────────────────────────
const [BASE, T_MIN, T_MAX, SKEW, DAMP, INITIAL_BIAS, INITIAL_N] = [36, 1, 26, 38, 700, 72, 128];

function adapt(delta: number, points: number, first: boolean): number {
  let d = first ? Math.floor(delta / DAMP) : delta >> 1;
  d += Math.floor(d / points);
  let k = 0;
  for (; d > ((BASE - T_MIN) * T_MAX) >> 1; k += BASE) d = Math.floor(d / (BASE - T_MIN));
  return k + Math.floor(((BASE - T_MIN + 1) * d) / (d + SKEW));
}

const threshold = (k: number, bias: number) => (k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias);
const digitOf = (code: number) => (code >= 0x30 && code <= 0x39 ? code - 22 : code >= 0x61 && code <= 0x7a ? code - 0x61 : -1);
const charOf = (digit: number) => String.fromCharCode(digit < 26 ? digit + 0x61 : digit + 22);

/** The code points `encoded` (a label without its `xn--`) stands for, or null where it is not Punycode. */
function decode(encoded: string): number[] | null {
  const split = encoded.lastIndexOf('-');
  const output = split > 0 ? [...encoded.slice(0, split)].map((c) => c.charCodeAt(0)) : [];
  if (output.some((code) => code >= 0x80)) return null;
  let [n, i, bias] = [INITIAL_N, 0, INITIAL_BIAS];
  for (let at = split > 0 ? split + 1 : 0; at < encoded.length; ) {
    const before = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (at >= encoded.length) return null;
      const digit = digitOf(encoded.charCodeAt(at++));
      if (digit < 0 || digit > Math.floor((0x7fffffff - i) / w)) return null;
      i += digit * w;
      const t = threshold(k, bias);
      if (digit < t) break;
      if (w > Math.floor(0x7fffffff / (BASE - t))) return null;
      w *= BASE - t;
    }
    bias = adapt(i - before, output.length + 1, before === 0);
    n += Math.floor(i / (output.length + 1));
    if (n > 0x10ffff) return null;
    i %= output.length + 1;
    output.splice(i++, 0, n);
  }
  return output;
}

/** The Punycode of `points`, without `xn--`. */
function encode(points: number[]): string {
  let output = points.filter((code) => code < 0x80).map((code) => String.fromCharCode(code)).join('');
  const basic = output.length;
  let handled = basic;
  if (basic) output += '-';
  let [n, delta, bias] = [INITIAL_N, 0, INITIAL_BIAS];
  while (handled < points.length) {
    const next = Math.min(...points.filter((code) => code >= n));
    delta += (next - n) * (handled + 1);
    n = next;
    for (const code of points) {
      if (code < n) delta += 1;
      if (code !== n) continue;
      let q = delta;
      for (let k = BASE; ; k += BASE) {
        const t = threshold(k, bias);
        if (q < t) break;
        output += charOf(t + ((q - t) % (BASE - t)));
        q = Math.floor((q - t) / (BASE - t));
      }
      output += charOf(q);
      bias = adapt(delta, handled + 1, handled === basic);
      delta = 0;
      handled += 1;
    }
    delta += 1;
    n += 1;
  }
  return output;
}

// ── LKC-9: when a host may be drawn in its own script ──────────────────────────────────────────────────────────────
/**
 * The scripts a label may be written in: the ones in present use for names (Unicode's recommended scripts). A label
 * in any other is drawn in its ASCII form — "cannot tell the script of a character" is the ASCII form (LKC-9).
 */
const SCRIPTS = ['Latin', 'Han', 'Hiragana', 'Katakana', 'Hangul', 'Bopomofo', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Oriya', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Thai', 'Lao', 'Tibetan', 'Myanmar', 'Khmer', 'Georgian', 'Armenian', 'Ethiopic', 'Thaana'];
/**
 * The sets of scripts a single writing system uses together (LKC-9 c): Japanese, Korean, Chinese with its phonetic
 * letters — each with the ASCII letters (`ASCII`), and no other Latin one: a Latin letter with a mark beside Han is
 * not how any of the three writes a name, and is how one name is dressed as another (the rule Chromium keeps too).
 */
const ASCII = 'ASCII';
const TOGETHER = [
  [ASCII, 'Han', 'Hiragana', 'Katakana'],
  [ASCII, 'Han', 'Hangul'],
  [ASCII, 'Han', 'Bopomofo'],
];
/** The scripts whose letters are taken for Latin ones: a whole word of them under an ASCII ending stays ASCII (LKC-9 d). */
const LOOKALIKE = ['Cyrillic', 'Greek'];

const tests = new Map<string, RegExp | null>();
/** Whether every character of `letters` is of one of `scripts` — by a character's script extensions, so the marks a script shares with another (the long vowel mark of kana) count as its own. Null: this engine cannot tell. */
function written(letters: string, scripts: readonly string[]): boolean | null {
  const key = scripts.join(' ');
  if (!tests.has(key)) {
    try {
      tests.set(key, new RegExp(`^[${scripts.map((script) => (script === ASCII ? 'A-Za-z' : `\\p{Script_Extensions=${script}}`)).join('')}]*$`, 'u'));
    } catch {
      tests.set(key, null);
    }
  }
  return tests.get(key)?.test(letters) ?? null;
}

let allowed: RegExp | null | undefined;
let letter: RegExp | null | undefined;
function classes(): boolean {
  if (allowed === undefined) {
    try {
      // LKC-9 b: letters, combining marks, the digits 0 to 9 and the hyphen.
      allowed = /^[\p{L}\p{M}0-9-]+$/u;
      letter = /\p{L}/gu;
    } catch {
      allowed = letter = null;
    }
  }
  return !!allowed && !!letter;
}

/** The Unicode form of the label `ascii` (it begins `xn--`), or null where LKC-9 a to c keep it in its ASCII form. */
function unicodeLabel(ascii: string): { text: string; letters: string } | null {
  const points = decode(ascii.slice(4));
  // (a) It decodes, and encodes back to exactly the label it was — and it encodes something: a label of ASCII alone
  // under `xn--` is a name dressed as another.
  if (!points || !points.some((code) => code >= 0x80) || `xn--${encode(points)}` !== ascii) return null;
  let text: string;
  try {
    text = String.fromCodePoint(...points);
  } catch {
    return null;
  }
  // (b)
  if (!classes() || !allowed!.test(text)) return null;
  // (c) All its letters in one script, or in one of the sets a single writing system uses together.
  const letters = (text.match(letter!) ?? []).join('');
  const sets = [...SCRIPTS.map((script) => [script]), ...TOGETHER];
  return sets.some((set) => written(letters, set) === true) ? { text, letters } : null;
}

/**
 * LKC-8, LKC-9: the host of `href` as a link card draws it — the host name the address parser reads, in lower case,
 * with a colon and the port where `href` names one that is not its scheme's own; never a user name, a password, a
 * path, a query or a fragment. `''` where `href` has no host of its own: a path, a fragment, an address relative to
 * the page, a scheme that has none (a mail address), an address that cannot be read.
 *
 * A host with a label in the ASCII form of an internationalised name (`xn--…`) is given whole in its Unicode form
 * only while every such label (a) decodes and encodes back to exactly what it was, (b) holds nothing but letters,
 * combining marks, the digits 0 to 9 and the hyphen, (c) has all its letters in one script or in one of the sets one
 * writing system uses together (the ASCII letters with Han, Hiragana and Katakana; with Han and Hangul; with Han and Bopomofo),
 * and (d) is not written wholly in Cyrillic or wholly in Greek under a last label that is ASCII. In every other case —
 * and on an engine that cannot tell a character's script — the whole host is the ASCII form, never a part in each.
 *
 * The answer is text: whoever draws it writes it as a text node, as one left-to-right run (LKC-9).
 */
export function displayHost(href: string): string {
  // An address that names a host and no scheme (`//example.com/a`) takes the page's scheme and has a host of its own.
  const url = parse(/^\s*\/\//.test(href) ? `https:${href.trim()}` : href);
  if (!url || !url.hostname) return '';
  const ascii = url.hostname.toLowerCase();
  const port = url.port ? `:${url.port}` : '';
  const labels = ascii.split('.');
  if (!labels.some((label) => label.startsWith('xn--'))) return ascii + port;
  const last = labels.filter(Boolean).at(-1) ?? '';
  const out: string[] = [];
  for (const label of labels) {
    if (!label.startsWith('xn--')) {
      out.push(label);
      continue;
    }
    const unicode = unicodeLabel(label);
    if (!unicode) return ascii + port;
    // (d) A whole word of Cyrillic or of Greek under an ASCII ending reads as a Latin name.
    if (!last.startsWith('xn--') && unicode.letters && LOOKALIKE.some((script) => written(unicode.letters, [script]) === true)) return ascii + port;
    out.push(unicode.text);
  }
  return out.join('.') + port;
}

// ── The link card: what it draws from what it is given (specs/link-card.spec.json) ─────────────────────────────────
/** The characters that embed, override or isolate the direction of text: U+202A to U+202E and U+2066 to U+2069. */
const DIRECTION_FORMATTING = /[\u202A-\u202E\u2066-\u2069]/g;
/** What ends a line, and the tab: each run of them is read as one space. */
const LINE_BREAKS = /(?:\r\n|[\t\n\u000B\u000C\r\u0085\u2028\u2029])+/g;
/** Every other control character (C0, DEL, C1). */
const CONTROLS = /[\u0000-\u001F\u007F-\u009F]/g;

/**
 * LKC-15: a value a destination wrote — a title, a description, a site's name, a picture's alternative text — as the
 * plain text a link card draws and exposes. A line break or a tab is one space; every other control character is
 * dropped; the characters that embed, override or isolate direction are dropped, so no value can reorder itself or the
 * text beside it. Everything else is kept: the marks that only state a direction, the joiners a script needs, and
 * every character that would begin markup elsewhere — the answer is written as a text node, never parsed. White space
 * at either end is not part of the value. Anything that is not a string is the empty string.
 */
export function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(LINE_BREAKS, ' ').replace(CONTROLS, '').replace(DIRECTION_FORMATTING, '').trim();
}

/**
 * LKC-7: whether `siteName` says only what `host` says — the same characters without regard to case, with or without
 * a leading `www.` on either. Such a name is not drawn: the host is already there. `host` is `displayHost()`'s answer.
 */
export function repeatsHost(siteName: string, host: string): boolean {
  const bare = (text: string) => text.trim().toLowerCase().replace(/^www\./, '');
  return host !== '' && bare(siteName) === bare(host);
}

/** A base with a hierarchy, against which a path is an address: the element resolves against the page, a build has none. */
const ANY_BASE = 'https://tanrei.invalid/';

/**
 * LKC-14: `src` as an address a link card may ask for as a picture, or `''`. Empty for white space, for an address
 * that names a script to run, for one the address parser cannot read, and for a scheme that is no picture's: what is
 * left is `http`, `https`, a path of the page's own, `blob:` and a `data:` URL of an image type. The address is given
 * back as it was written (trimmed); whoever draws it asks for it as a picture — an `<img>` — and as nothing else.
 */
export function pictureAddress(src: unknown): string {
  const given = typeof src === 'string' ? src.trim() : '';
  if (!given) return '';
  const url = parse(given, ANY_BASE);
  if (!url) return '';
  if (url.protocol === 'data:') return /^data:image\//i.test(given) ? given : '';
  return ['http:', 'https:', 'blob:'].includes(url.protocol) ? given : '';
}

/** LKC-27: whether `href` is a place to go — not empty, not a script to run, and readable as an address. */
function destination(href: string): boolean {
  if (!href.trim()) return false;
  const url = parse(href, ANY_BASE);
  return !!url && url.protocol !== 'javascript:';
}

/** A picture a link card is given: its address, and its size in pixels where that is known (`resolveLinkData()` knows it). */
export interface LinkCardPicture {
  src: string;
  width?: number;
  height?: number;
}

/**
 * What a link card is drawn from: `LinkData` as `resolveLinkData()` of `@tanrei/web/links/node` returns it, or the
 * same values from a service or a file of the product's own. It has no host: the card computes it from `href`.
 */
export interface LinkCardData {
  /** The destination, as an anchor takes it. */
  href: string;
  title?: string;
  description?: string;
  siteName?: string;
  /** The destination's picture: an address, or an address with its size. */
  image?: LinkCardPicture | string;
  /** What the picture shows, where that is worth saying (LKC-25). */
  imageAlt?: string;
  siteIcon?: LinkCardPicture | string;
  /** `on` and `off` are written into the markup; `auto` (and none) leaves the address to decide, by `options.site` where it is given and by the element's script otherwise. */
  external?: 'auto' | 'on' | 'off';
}

export interface LinkCardOptions {
  /** `outlined` (the default, not written) or `filled`, or a look a design system added. */
  variant?: string;
  /** `new` opens a new context: `target="_blank"`, `rel="noopener"`, and `targetLabel` as the last words of the card. */
  target?: 'same' | 'new';
  /** The product's words for a new context ("opens in a new tab"). Tanrei ships none. */
  targetLabel?: string;
  /** The product's words for a destination on another site that opens where the person is ("external link"). */
  externalLabel?: string;
  /** The product's own origins, as `isExternal()` reads them: with them a card whose `external` is `auto` is decided here. */
  site?: readonly string[];
  /** The address of the page the card is on, where it is known. */
  base?: string;
}

/** A node of a link card's markup: text, or an element with its attributes and children. Text is never markup. */
export type TanreiLinkCardNode = string | { name: string; attributes: Record<string, string>; children: TanreiLinkCardNode[] };

const element = (name: string, attributes: Record<string, string>, children: TanreiLinkCardNode[] = []): TanreiLinkCardNode => ({ name, attributes, children });
const part = (name: string, id: string, children: TanreiLinkCardNode[], attributes: Record<string, string> = {}) => element(name, { 'data-part': id, ...attributes }, children);

/**
 * The host as the nodes of its part: one `span` for each label with the dot after it. The stylesheet lets a line end
 * after each (LKC-7); the text is the host and nothing else — no character is added that would be copied or read.
 */
export function hostNodes(host: string): TanreiLinkCardNode[] {
  const labels = host.split('.');
  // Each label keeps the dot after it; an empty piece (a host that ends in a dot) is not written.
  return labels.map((label, index) => (index < labels.length - 1 ? `${label}.` : label)).filter(Boolean).map((piece) => element('span', {}, [piece]));
}

function picture(given: LinkCardPicture | string | undefined, id: string): TanreiLinkCardNode | null {
  const src = pictureAddress(typeof given === 'string' ? given : given?.src);
  if (!src) return null;
  const size: Record<string, string> = typeof given === 'object' && given && Number.isFinite(given.width) && Number.isFinite(given.height) && given.width! > 0 && given.height! > 0 ? { width: String(Math.round(given.width!)), height: String(Math.round(given.height!)) } : {};
  // Decoration, asked for as a picture, without the page's address, and only once the card is near what is shown (LKC-14).
  return part('img', id, [], { src, alt: '', ...size, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
}

/**
 * The markup of a link card, as plain node descriptions (specs/link-card.spec.json, the web note): what a site's build
 * step writes so that the card is whole in the first paint and with scripting off (LKC-36) — one `<tanrei-link-card>`
 * around one anchor, whose parts are elements marked `data-part`. `@tanrei/web/link-card.css` draws it; the element,
 * once defined, adds what a document cannot hold and moves nothing.
 *
 *   <tanrei-link-card><a href="…"><span data-part="body">
 *     <span data-part="title" dir="auto">…</span><span data-part="description" dir="auto">…</span>
 *     <span data-part="image-alt">…</span>
 *     <span data-part="site"><img data-part="site-icon" …><span data-part="site-name"><span dir="auto">…</span></span>
 *       <span data-part="address"><bdi data-part="host" dir="ltr">…</bdi></span></span>
 *     <span data-part="words">…</span>
 *   </span><img data-part="media" …></a></tanrei-link-card>
 *
 * Every value is cleaned (`plainText()`, LKC-15) and written as a text node: serialise a string by escaping it, never
 * by writing it as markup. The host is `displayHost(data.href)` and nothing else (LKC-8); a site name that only repeats
 * it is left out (LKC-7); a picture's address that is no picture's is left out (LKC-14); without a title the address
 * stands in its place (LKC-5). A destination that is no place to go gives the title alone, in an anchor without an
 * address (LKC-27). Pure: the same answer for the same arguments, no file, no network, no DOM.
 */
export function linkCardToNodes(data: LinkCardData, options: LinkCardOptions = {}): TanreiLinkCardNode[] {
  const href = typeof data?.href === 'string' ? data.href : '';
  const title = plainText(data?.title);
  const variant: Record<string, string> = typeof options.variant === 'string' && options.variant && options.variant !== 'outlined' ? { variant: options.variant } : {};
  if (!destination(href)) {
    // LKC-27: not a link, and not drawn as a card — the title, where it has one, as text.
    return [element('tanrei-link-card', variant, [element('a', {}, title ? [part('span', 'body', [part('span', 'title', [title], { dir: 'auto' })])] : [])])];
  }
  const opensNew = options.target === 'new';
  const description = plainText(data.description);
  const alt = plainText(data.imageAlt);
  const host = displayHost(href);
  const named = plainText(data.siteName);
  const siteName = named && !repeatsHost(named, host) ? named : '';
  const external = data.external === 'on' ? true : data.external === 'off' ? false : options.site ? isExternal(href, { ...(options.base === undefined ? {} : { base: options.base }), site: options.site }) : null;
  const marked = opensNew || external === true;
  const words = plainText(opensNew ? options.targetLabel : external === true ? options.externalLabel : '');
  const media = picture(data.image, 'media');
  const icon = picture(data.siteIcon, 'site-icon');

  const body: TanreiLinkCardNode[] = [
    // LKC-5: without a title the address, as it was given, as one left-to-right run that may break anywhere.
    title ? part('span', 'title', [title], { dir: 'auto' }) : part('span', 'title', [href.trim()], { dir: 'ltr', 'data-address': '' }),
  ];
  if (description) body.push(part('span', 'description', [description], { dir: 'auto' }));
  // LKC-25: what the picture shows is read after the description, and never drawn.
  if (alt && media) body.push(part('span', 'image-alt', [alt]));
  if (host || siteName || marked) {
    const site: TanreiLinkCardNode[] = [];
    if (icon) site.push(icon);
    if (siteName) site.push(part('span', 'site-name', [element('span', { dir: 'auto' }, [siteName])]));
    // The address holds the host and, after its last character, the mark (LKC-7, LKC-23, LKC-24).
    site.push(part('span', 'address', host ? [part('bdi', 'host', hostNodes(host), { dir: 'ltr' })] : []));
    body.push(part('span', 'site', site));
  }
  if (words) body.push(part('span', 'words', [words]));

  const anchor = element(
    'a',
    {
      href,
      ...(opensNew ? { target: '_blank', rel: 'noopener' } : {}),
      ...(external === null ? {} : { 'data-external': String(external) }),
    },
    [part('span', 'body', body), ...(media ? [media] : [])],
  );
  return [element('tanrei-link-card', variant, [anchor])];
}

const escapeText = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttribute = (text: string) => escapeText(text).replaceAll('"', '&quot;');
const VOID = ['img'];

/** `linkCardToNodes()`'s answer as HTML: every text and every attribute value escaped, nothing written as markup. */
export function linkCardToHtml(data: LinkCardData, options: LinkCardOptions = {}): string {
  const write = (node: TanreiLinkCardNode): string => {
    if (typeof node === 'string') return escapeText(node);
    const attributes = Object.entries(node.attributes)
      .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${escapeAttribute(value)}"`))
      .join('');
    return VOID.includes(node.name) ? `<${node.name}${attributes}>` : `<${node.name}${attributes}>${node.children.map(write).join('')}</${node.name}>`;
  };
  return linkCardToNodes(data, options).map(write).join('');
}
