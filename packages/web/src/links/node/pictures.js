// Pictures and icons (REQUIREMENTS.md, LKD-18 to LKD-22, LKD-30): what kind of file a picture is, told from its first
// bytes; its width and height, read from its own header; the site's image step, without which nothing is kept; and
// the file it is written to. The package has no picture codec: the one thing decoded here is the small PNG the site's
// own step has just made of an icon, read to see whether it would be seen on a dark and on a light surface.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const KINDS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
};

const starts = (bytes, at, ...values) => values.every((value, index) => bytes[at + index] === value);
const ascii = (bytes, at, text) => bytes.length >= at + text.length && [...text].every((char, index) => bytes[at + index] === char.charCodeAt(0));
const be16 = (bytes, at) => (bytes[at] << 8) | bytes[at + 1];
const le16 = (bytes, at) => bytes[at] | (bytes[at + 1] << 8);
const be32 = (bytes, at) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
const le32 = (bytes, at) => (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;

function jpegSize(bytes) {
  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) {
      at += 1;
      continue;
    }
    const marker = bytes[at + 1];
    if (marker === 0xff) at += 1;
    else if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) at += 2;
    else if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: be16(bytes, at + 5), width: be16(bytes, at + 7) };
    else at += 2 + be16(bytes, at + 2);
  }
  return null;
}

function webpSize(bytes) {
  if (bytes.length < 30) return null;
  if (ascii(bytes, 12, 'VP8 ') && starts(bytes, 23, 0x9d, 0x01, 0x2a)) return { width: le16(bytes, 26) & 0x3fff, height: le16(bytes, 28) & 0x3fff };
  if (ascii(bytes, 12, 'VP8L') && bytes[20] === 0x2f) {
    const bits = le32(bytes, 21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (ascii(bytes, 12, 'VP8X')) return { width: 1 + (le32(bytes, 24) & 0xffffff), height: 1 + (le32(bytes, 27) & 0xffffff) };
  return null;
}

function avifSize(bytes) {
  // The largest extent the file declares: a picture made of tiles declares each tile's and the whole's.
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
  let width = 0;
  let height = 0;
  for (let at = data.indexOf('ispe', 0, 'latin1'); at !== -1 && at + 16 <= data.length; at = data.indexOf('ispe', at + 4, 'latin1')) {
    width = Math.max(width, be32(data, at + 8));
    height = Math.max(height, be32(data, at + 12));
  }
  return width && height ? { width, height } : null;
}

function isAvif(bytes) {
  if (!ascii(bytes, 4, 'ftyp')) return false;
  const end = Math.min(be32(bytes, 0), bytes.length);
  for (let at = 8; at + 4 <= end; at += at === 8 ? 8 : 4) if (ascii(bytes, at, 'avif') || ascii(bytes, at, 'avis')) return true;
  return false;
}

/** The pictures inside an icon file, as its directory lists them. */
function icoEntries(bytes) {
  const count = le16(bytes, 4);
  const entries = [];
  for (let index = 0; index < count && 6 + (index + 1) * 16 <= bytes.length; index += 1) {
    const at = 6 + index * 16;
    entries.push({ width: bytes[at] || 256, height: bytes[at + 1] || 256, size: le32(bytes, at + 8), offset: le32(bytes, at + 12) });
  }
  return entries;
}

/**
 * LKD-19 and LKD-20: the kind of a file from its first bytes alone, and its width and height from its own header.
 * Returns `{ type, extension, width, height }`, or null for anything that is not a PNG, a JPEG, a GIF, a WebP or an
 * AVIF picture — or, where `icon` is set, an icon file, of whose pictures the one LKD-20 chooses for `side` is
 * described. A vector drawing is a document: it is null here whatever it is called.
 */
export function sniffPicture(bytes, { icon = false, side = 32 } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12) return null;
  let found = null;
  if (starts(bytes, 0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) && bytes.length >= 24 && ascii(bytes, 12, 'IHDR')) found = { type: 'image/png', width: be32(bytes, 16), height: be32(bytes, 20) };
  else if (starts(bytes, 0, 0xff, 0xd8, 0xff)) found = { type: 'image/jpeg', ...jpegSize(bytes) };
  else if (ascii(bytes, 0, 'GIF87a') || ascii(bytes, 0, 'GIF89a')) found = { type: 'image/gif', width: le16(bytes, 6), height: le16(bytes, 8) };
  else if (ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WEBP')) found = { type: 'image/webp', ...webpSize(bytes) };
  else if (isAvif(bytes)) found = { type: 'image/avif', ...avifSize(bytes) };
  else if (icon && starts(bytes, 0, 0x00, 0x00, 0x01, 0x00)) {
    const entries = icoEntries(bytes);
    const enough = entries.filter((entry) => Math.min(entry.width, entry.height) >= side).sort((a, b) => a.width - b.width)[0];
    const chosen = enough ?? entries.sort((a, b) => b.width - a.width)[0];
    if (chosen) found = { type: 'image/x-icon', width: chosen.width, height: chosen.height, entry: chosen };
  }
  if (!found || !Number.isInteger(found.width) || !Number.isInteger(found.height)) return null;
  return { ...found, extension: KINDS[found.type] };
}

/** LKD-20: neither side 0, neither longer than the limit. */
export const sizeIsKept = (found, pixels) => found.width > 0 && found.height > 0 && found.width <= pixels && found.height <= pixels;

/**
 * An icon file's chosen picture, where the file holds it as a PNG of its own: those bytes, which the site's image
 * step can read as any PNG. Otherwise null, and the whole file is what the step is given.
 */
export function pngInsideIcon(bytes, found) {
  const { offset, size } = found.entry ?? {};
  if (!Number.isInteger(offset) || offset + size > bytes.length || size < 24) return null;
  const inner = bytes.subarray(offset, offset + size);
  return sniffPicture(inner)?.type === 'image/png' ? inner : null;
}

/**
 * The pixels of a small PNG — the one the site's image step has just written — as RGBA bytes, or null where this
 * reader does not know the form (it reads 8 bits a channel, not interlaced). Used only to look, never to write.
 */
export function readPngPixels(bytes) {
  try {
    const found = sniffPicture(bytes);
    if (found?.type !== 'image/png') return null;
    const [depth, colour, , , interlace] = bytes.subarray(24, 29);
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
    if (depth !== 8 || !channels || interlace !== 0) return null;
    const { width, height } = found;
    let palette = null;
    let clear = null;
    const data = [];
    for (let at = 8; at + 12 <= bytes.length; ) {
      const length = be32(bytes, at);
      const body = bytes.subarray(at + 8, at + 8 + length);
      if (ascii(bytes, at + 4, 'PLTE')) palette = body;
      else if (ascii(bytes, at + 4, 'tRNS')) clear = body;
      else if (ascii(bytes, at + 4, 'IDAT')) data.push(body);
      at += 12 + length;
    }
    const stride = width * channels;
    const raw = zlib.inflateSync(Buffer.concat(data), { maxOutputLength: (stride + 1) * height });
    if (raw.length !== (stride + 1) * height) return null;
    const lines = new Uint8Array(stride * height);
    for (let y = 0; y < height; y += 1) {
      const filter = raw[y * (stride + 1)];
      for (let x = 0; x < stride; x += 1) {
        const value = raw[y * (stride + 1) + 1 + x];
        const left = x >= channels ? lines[y * stride + x - channels] : 0;
        const up = y > 0 ? lines[(y - 1) * stride + x] : 0;
        const corner = x >= channels && y > 0 ? lines[(y - 1) * stride + x - channels] : 0;
        let predicted = 0;
        if (filter === 1) predicted = left;
        else if (filter === 2) predicted = up;
        else if (filter === 3) predicted = (left + up) >> 1;
        else if (filter === 4) {
          const estimate = left + up - corner;
          const [a, b, c] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - corner)];
          predicted = a <= b && a <= c ? left : b <= c ? up : corner;
        } else if (filter !== 0) return null;
        lines[y * stride + x] = (value + predicted) & 0xff;
      }
    }
    const rgba = new Uint8Array(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
      const at = index * channels;
      let pixel;
      if (colour === 6) pixel = [lines[at], lines[at + 1], lines[at + 2], lines[at + 3]];
      else if (colour === 2) pixel = [lines[at], lines[at + 1], lines[at + 2], 255];
      else if (colour === 4) pixel = [lines[at], lines[at], lines[at], lines[at + 1]];
      else if (colour === 0) pixel = [lines[at], lines[at], lines[at], 255];
      else {
        const entry = lines[at];
        if (!palette || entry * 3 + 2 >= palette.length) return null;
        pixel = [palette[entry * 3], palette[entry * 3 + 1], palette[entry * 3 + 2], clear && entry < clear.length ? clear[entry] : 255];
      }
      rgba.set(pixel, index * 4);
    }
    return { width, height, rgba };
  } catch {
    return null;
  }
}

const channel = (value) => (value <= 0.04045 * 255 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);

/** A pixel is seen on a surface while it stands 3 to 1 against it: on black from this luminance up, on white from that one down. */
const SEEN_ON_DARK_FROM = 0.1;
const SEEN_ON_LIGHT_TO = 0.3;
/** A picture is seen on a surface while at least this share of what it draws is. */
const SEEN_SHARE = 0.1;

/**
 * LKD-30: the ground a picture needs under it — 'light' where it has transparent pixels and what it draws would not
 * be seen on a dark surface, 'dark' where it would not be seen on a light one, null where it needs none.
 */
export function groundFor(rgba) {
  let transparent = 0;
  let drawn = 0;
  let onDark = 0;
  let onLight = 0;
  for (let at = 0; at + 3 < rgba.length; at += 4) {
    const alpha = rgba[at + 3] / 255;
    if (alpha < 1) transparent += 1;
    if (alpha === 0) continue;
    const luminance = 0.2126 * channel(rgba[at]) + 0.7152 * channel(rgba[at + 1]) + 0.0722 * channel(rgba[at + 2]);
    drawn += alpha;
    if (luminance >= SEEN_ON_DARK_FROM) onDark += alpha;
    if (luminance <= SEEN_ON_LIGHT_TO) onLight += alpha;
  }
  if (transparent === 0 || drawn === 0) return null;
  if (onDark / drawn < SEEN_SHARE) return 'light';
  if (onLight / drawn < SEEN_SHARE) return 'dark';
  return null;
}

export const digestOf = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * LKD-22: writes a kept picture under a name made from the digest of its bytes and the extension of the kind its
 * bytes are — nothing of the name is the destination's. Returns the file's name and the digest.
 */
export function storePicture(bytes, extension, directory) {
  const digest = digestOf(bytes);
  const file = `${digest.slice(0, 32)}.${extension}`;
  const target = path.join(directory, file);
  fs.mkdirSync(directory, { recursive: true });
  if (!fs.existsSync(target)) {
    const draft = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(draft, bytes);
    fs.renameSync(draft, target);
  }
  return { file, digest };
}

/** LKD-26: whether the file an entry names is in the directory with the bytes the entry recorded. */
export function storedPictureIsWhole(file, digest, directory) {
  if (typeof file !== 'string' || file !== path.basename(file) || typeof directory !== 'string') return false;
  try {
    return digestOf(fs.readFileSync(path.join(directory, file))) === digest;
  } catch {
    return false;
  }
}

/**
 * LKD-21: a kept picture through the site's own image step, and what comes back held again to LKD-19 and LKD-20.
 * `info` is what the step is told: `{ type, width, height, role }`, and for an icon the side asked for and, on a
 * second call, the ground to put under it. Returns `{ bytes, found }` or `{ reason }`; it never throws.
 */
export async function reencode(bytes, info, { transform, pixels, limit }) {
  let out;
  try {
    out = await transform(bytes, info);
  } catch {
    return { reason: 'image-step-failed' };
  }
  if (!(out instanceof Uint8Array)) return { reason: 'image-step-failed' };
  const found = sniffPicture(out);
  if (!found || !sizeIsKept(found, pixels) || out.length > limit) return { reason: 'image-step-failed' };
  return { bytes: out, found };
}
