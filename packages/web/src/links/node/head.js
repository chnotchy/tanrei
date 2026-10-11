// What the links helper takes from a page (REQUIREMENTS.md, LKD-13 to LKD-17): a reader of a head that makes no
// document, runs nothing and follows nothing, and the cleaning of the text it finds. The names of the `meta` and
// `link` elements below are data this reader looks for; nothing in the design refers to them.
import { bareHost, readableAddress, withoutWww } from './address.js';

/** The elements a head may hold. The first start tag of any other name is where the body begins (LKD-13). */
const IN_HEAD = new Set(['html', 'head', 'title', 'base', 'link', 'meta', 'style', 'script', 'noscript', 'template']);
/** Elements whose content is not read at all: it is skipped to their own end tag. */
const SKIPPED = new Set(['style', 'script', 'noscript', 'template']);

// The named character references a title is commonly written with. One that is not here stays as it was written.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•', times: '×', deg: '°', euro: '€',
  pound: '£', yen: '¥', cent: '¢', sect: '§', para: '¶', rarr: '→', larr: '←', uarr: '↑', darr: '↓', ensp: '\u2002', emsp: '\u2003',
  thinsp: '\u2009', shy: '\u00ad', iexcl: '¡', iquest: '¿', szlig: 'ß', agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä',
  aring: 'å', aelig: 'æ', ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
};

/** Character references, decoded once (LKD-15): what a reference decodes to is never read as a reference again. */
export function decodeReferences(text) {
  return text.replace(/&(?:#[xX]([0-9a-fA-F]{1,8})|#(\d{1,8})|([a-zA-Z][a-zA-Z0-9]{1,31}));?/g, (whole, hex, decimal, name) => {
    if (name !== undefined) return Object.hasOwn(NAMED, name) ? NAMED[name] : whole;
    const point = hex !== undefined ? Number.parseInt(hex, 16) : Number(decimal);
    if (point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) return '\ufffd';
    return String.fromCodePoint(point);
  });
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * A value a destination wrote, as text (LKD-15): white space made one space, control characters and the characters
 * that embed, override or isolate direction dropped, one normal form, cut between characters as a reader counts them.
 * Returns undefined for a value that is empty after that. References are decoded before this, by the head's reader.
 */
export function cleanText(value, limit) {
  if (typeof value !== 'string') return undefined;
  const text = value
    .toWellFormed()
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\t\n\v\f\r\u0085\u2028\u2029]/g, ' ')
    .replace(/\p{Cc}/gu, '')
    .replace(/[\ufffe\uffff]/g, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .normalize('NFC');
  let out = '';
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (count === limit) break;
    out += segment;
    count += 1;
  }
  out = out.trim();
  return out === '' ? undefined : out;
}

/** LKD-16: a site's name that reads as a host or an address — no space, and a dot between letters. */
export function readsAsHost(name) {
  return !/\s/u.test(name) && /[\p{L}\p{N}]\.[\p{L}\p{N}]/u.test(name);
}

/** LKD-16: such a name is kept only while it is the host of the address that was asked about. */
export function siteNameFor(name, asked) {
  if (name === undefined || !readsAsHost(name)) return name;
  let host;
  try {
    host = bareHost(new URL(asked).hostname);
  } catch {
    return undefined;
  }
  const written = name.normalize('NFKC').toLowerCase().replace(/\.$/, '');
  return written === host || written === withoutWww(host) ? name : undefined;
}

function attributes(text, from) {
  // After a tag's name: `name`, `name=value`, `name="value"`, `name='value'`, until `>`. Returns the attributes (the
  // first of a name wins, as in a browser) and the index after the tag.
  const found = new Map();
  let index = from;
  const length = text.length;
  for (;;) {
    while (index < length && /[\s/]/.test(text[index])) index += 1;
    if (index >= length) return { found, end: length, closed: false };
    if (text[index] === '>') return { found, end: index + 1, closed: true };
    let start = index;
    while (index < length && !/[\s/>=]/.test(text[index])) index += 1;
    // An `=` where a name should begin is part of the name, as a browser reads it; it must not stall the reader.
    if (index === start) index += 1;
    const name = text.slice(start, index).toLowerCase();
    while (index < length && /\s/.test(text[index])) index += 1;
    let value = '';
    if (text[index] === '=') {
      index += 1;
      while (index < length && /\s/.test(text[index])) index += 1;
      const quote = text[index];
      if (quote === '"' || quote === "'") {
        const close = text.indexOf(quote, index + 1);
        if (close === -1) return { found, end: length, closed: false };
        value = text.slice(index + 1, close);
        index = close + 1;
      } else {
        start = index;
        while (index < length && !/[\s>]/.test(text[index])) index += 1;
        value = text.slice(start, index);
      }
    }
    if (!found.has(name)) found.set(name, decodeReferences(value));
  }
}

/**
 * Reads a head (LKD-13, LKD-14). It stops at the head's end tag, at the first tag that is not a head's, or where the
 * text ends; `complete` says the head ended before the text did. What it returns is raw: references decoded once,
 * nothing cleaned, no address resolved.
 */
export function readHead(text) {
  const out = { complete: false, title: undefined, metas: new Map(), icons: [], base: undefined };
  const lower = text.toLowerCase();
  let index = 0;
  for (;;) {
    const open = text.indexOf('<', index);
    if (open === -1) return out;
    if (text.startsWith('<!--', open)) {
      const close = text.indexOf('-->', open + 4);
      if (close === -1) return out;
      index = close + 3;
      continue;
    }
    if (text[open + 1] === '!' || text[open + 1] === '?') {
      const close = text.indexOf('>', open);
      if (close === -1) return out;
      index = close + 1;
      continue;
    }
    const ending = text[open + 1] === '/';
    const nameStart = open + (ending ? 2 : 1);
    const nameMatch = /^[a-zA-Z][^\s/>]*/.exec(text.slice(nameStart, nameStart + 64));
    if (!nameMatch) {
      index = open + 1;
      continue;
    }
    const name = nameMatch[0].toLowerCase();
    // A name that runs to the end of what has arrived may be the start of a longer one: nothing is decided by it.
    if (nameStart + name.length >= text.length) return out;
    if (ending) {
      if (name === 'head' || name === 'html' || name === 'body') {
        out.complete = true;
        return out;
      }
      const close = text.indexOf('>', nameStart);
      if (close === -1) return out;
      index = close + 1;
      continue;
    }
    if (!IN_HEAD.has(name)) {
      out.complete = true; // the body has begun, said or not
      return out;
    }
    const tag = attributes(text, nameStart + name.length);
    if (!tag.closed) return out;
    index = tag.end;
    if (name === 'title' || SKIPPED.has(name)) {
      const close = lower.indexOf(`</${name}`, index);
      if (close === -1) return out; // its end has not arrived: nothing of it is taken
      if (name === 'title' && out.title === undefined) out.title = decodeReferences(text.slice(index, close));
      const after = text.indexOf('>', close);
      if (after === -1) return out;
      index = after + 1;
    } else if (name === 'meta') {
      const key = tag.found.has('property') ? `property:${tag.found.get('property').trim().toLowerCase()}` : tag.found.has('name') ? `name:${tag.found.get('name').trim().toLowerCase()}` : undefined;
      const content = tag.found.get('content');
      if (key && content !== undefined && content.trim() !== '' && !out.metas.has(key)) out.metas.set(key, content);
    } else if (name === 'link') {
      const rel = (tag.found.get('rel') ?? '').toLowerCase().split(/\s+/);
      const href = tag.found.get('href');
      if (rel.includes('icon') && href !== undefined && href.trim() !== '') out.icons.push({ href: href.trim(), sizes: tag.found.get('sizes') ?? '', type: (tag.found.get('type') ?? '').trim().toLowerCase() });
    } else if (name === 'base') {
      const href = tag.found.get('href');
      if (out.base === undefined && href !== undefined) out.base = href.trim();
    }
  }
}

/** The character encoding of a page: the header's, else a byte-order mark's, else a `meta` declaration in the first 1024 bytes, else UTF-8. */
export function encodingOf(bytes, contentType) {
  const header = /;\s*charset\s*=\s*"?([^\s;"]+)/i.exec(contentType ?? '')?.[1];
  if (header) return header;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
  const start = Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.length, 1024)).toString('latin1');
  const declared = /<meta[^>]*?charset\s*=\s*["']?\s*([a-zA-Z0-9_:.-]+)/i.exec(start)?.[1];
  return declared ?? 'utf-8';
}

/** A page's bytes as text; bytes that are not valid in its encoding become the replacement character. */
export function decodePage(bytes, contentType) {
  let reader;
  try {
    reader = new TextDecoder(encodingOf(bytes, contentType));
  } catch {
    reader = new TextDecoder('utf-8');
  }
  return reader.decode(bytes);
}

/** LKD-13, while a page is still arriving: whether its head has ended in what has been read so far. */
export function headIsComplete(chunks, size) {
  const last = chunks[chunks.length - 1];
  const before = chunks.length > 1 ? chunks[chunks.length - 2] : null;
  const near = (before ? before.subarray(Math.max(0, before.length - 8)).toString('latin1') : '') + last.toString('latin1');
  // A cheap look first; the reader itself decides, so that the words inside a comment or a script end nothing.
  if (!/<\/head|<\/html|<body|<[a-zA-Z]/.test(near)) return false;
  return readHead(Buffer.concat(chunks, size).toString('latin1')).complete;
}

function httpsAddress(value, base) {
  // LKD-17: an address of a picture or an icon, resolved, and taken only while it is one the helper would read.
  if (value === undefined) return undefined;
  let url;
  try {
    url = new URL(value.trim(), base);
  } catch {
    return undefined;
  }
  return readableAddress(url).ok ? url.href : undefined;
}

/** The side a `sizes` value declares (`32x32 64x64` gives 32 and 64); `any` and nothing give none. */
function declaredSides(sizes) {
  return [...sizes.matchAll(/(\d+)[xX](\d+)/g)].map((match) => Math.max(Number(match[1]), Number(match[2]))).filter((side) => side > 0);
}

/**
 * LKD-20, among the icons a page offers: the one whose declared size is the smallest that is at least `side`; failing
 * that one that declares no size; failing that the largest. One that says it is a vector drawing is never chosen —
 * it would be refused by its bytes in any case (LKD-19).
 */
export function chooseIcon(icons, side) {
  const raster = icons.filter((icon) => icon.type !== 'image/svg+xml' && !/\bany\b/i.test(icon.sizes));
  const sized = raster.flatMap((icon) => declaredSides(icon.sizes).map((declared) => ({ icon, declared })));
  const enough = sized.filter((entry) => entry.declared >= side).sort((a, b) => a.declared - b.declared)[0];
  if (enough) return enough.icon;
  const unsized = raster.find((icon) => declaredSides(icon.sizes).length === 0);
  if (unsized) return unsized;
  return sized.sort((a, b) => b.declared - a.declared)[0]?.icon;
}

/**
 * The five fields (LKD-14), each from the first source that has one, cleaned (LKD-15 to LKD-17). `from` is the address
 * the page was finally read from; `asked` the address that was asked about.
 */
export function fieldsOf(markup, { from, asked, limits, iconSide }) {
  const head = readHead(markup);
  let base = from;
  if (head.base !== undefined) {
    try {
      base = new URL(head.base, from).href;
    } catch {
      base = from;
    }
  }
  // "Has one" is judged after cleaning: a value that is empty as text is no value, and the next source is asked.
  const first = (read, values) => values.map(read).find((value) => value !== undefined);
  const text = (limit, ...values) => first((value) => cleanText(value, limit), values);
  const meta = (key) => head.metas.get(key);
  const icon = chooseIcon(head.icons, iconSide);
  return {
    title: text(limits.title, meta('property:og:title'), head.title),
    description: text(limits.description, meta('property:og:description'), meta('name:description')),
    siteName: siteNameFor(text(limits.siteName, meta('property:og:site_name'), meta('name:application-name')), asked),
    image: first((value) => httpsAddress(value, base), [meta('property:og:image:secure_url'), meta('property:og:image')]),
    icon: httpsAddress(icon?.href, base),
  };
}
