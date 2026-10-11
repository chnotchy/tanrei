// resolveLinkData() and resolveSiteIcons() (REQUIREMENTS.md, LKD-14 to LKD-30), over the one fetcher, the one lock file
// and the one directory of pictures. The functions here take the fetcher's seam as their last argument; the public
// ones (index.js) are these with the seam fixed to PRODUCTION.
import fs from 'node:fs';
import path from 'node:path';
import { isExternal } from '../index.js';
import { withoutWww } from './address.js';
import { readAddress } from './fetcher.js';
import { decodePage, fieldsOf, headIsComplete } from './head.js';
import { orderedLink, readLock, writeLock } from './lock.js';
import { readOptions, sayOnce } from './options.js';
import { groundFor, pngInsideIcon, readPngPixels, reencode, sizeIsKept, sniffPicture, storePicture, storedPictureIsWhole } from './pictures.js';

const NEEDS_IMAGE_STEP =
  'pictures and site icons need the site\'s image step: nothing a destination serves is written until options.transform has decoded it and encoded it anew, so no picture and no icon was read. Give options.transform (and run the refresh command), or set options.pictures to "none"';
const REMOTE_PICTURES = 'options.pictures is "remote": pictures and icons stay at their destinations, and every reader\'s browser will ask those destinations for them';

const day = (date) => date.toISOString().slice(0, 10);
const sameWords = (a, b) => JSON.stringify(orderedLink({ ...a, read: undefined })) === JSON.stringify(orderedLink({ ...b, read: undefined }));

async function readPage(address, env) {
  const { settings } = env;
  const page = await readAddress(address, { kind: 'page', limit: settings.limits.markup, complete: headIsComplete }, { options: settings, internals: env.internals });
  if (!page.ok) return page;
  return { ok: true, url: page.url, fields: fieldsOf(decodePage(page.bytes, page.contentType), { from: page.url.href, asked: address, limits: settings.limits, iconSide: settings.iconSize }) };
}

/** LKD-18 to LKD-22 for a page's picture: its record for the lock file, or the reason it was dropped. */
async function keepImage(address, env) {
  const { settings } = env;
  const got = await readAddress(address, { kind: 'picture', limit: settings.limits.picture }, { options: settings, internals: env.internals });
  if (!got.ok) return { reason: got.reason };
  const found = sniffPicture(got.bytes);
  if (!found) return { reason: 'not-a-picture' };
  if (!sizeIsKept(found, settings.limits.pixels)) return { reason: 'picture-too-large' };
  const made = await reencode(got.bytes, { type: found.type, width: found.width, height: found.height, role: 'image' }, { transform: settings.transform, pixels: settings.limits.pixels, limit: settings.limits.picture });
  if (made.reason) return { reason: made.reason };
  const { file, digest } = storePicture(made.bytes, made.found.extension, settings.pictureDirectory);
  return { record: { file, digest, width: made.found.width, height: made.found.height, type: made.found.type } };
}

/** LKD-29 and LKD-30: an origin's icon read, re-encoded as the small PNG and stored; its record, or the reason. */
async function keepIcon(address, env) {
  const { settings } = env;
  const got = await readAddress(address, { kind: 'icon', limit: settings.limits.icon }, { options: settings, internals: env.internals });
  if (!got.ok) return { reason: got.reason };
  const found = sniffPicture(got.bytes, { icon: true, side: settings.iconSize });
  if (!found) return { reason: 'not-a-picture' };
  if (!sizeIsKept(found, settings.limits.pixels)) return { reason: 'picture-too-large' };
  // An icon file that holds its chosen picture as a PNG gives the image step that PNG; otherwise the file as it is.
  const inner = found.type === 'image/x-icon' ? pngInsideIcon(got.bytes, found) : null;
  const given = inner ?? got.bytes;
  const described = inner ? sniffPicture(inner) : found;
  const info = { type: described.type, width: described.width, height: described.height, role: 'siteIcon', size: settings.iconSize };
  const make = async (extra) => {
    const made = await reencode(given, { ...info, ...extra }, { transform: settings.transform, pixels: settings.limits.pixels, limit: settings.limits.icon });
    if (made.reason) return made;
    // LKD-30: a small PNG of the side asked for, and nothing else.
    return made.found.type === 'image/png' && made.found.width === settings.iconSize && made.found.height === settings.iconSize ? made : { reason: 'image-step-failed' };
  };
  let made = await make({});
  if (made.reason) return { reason: made.reason };
  const pixels = readPngPixels(made.bytes);
  const ground = pixels ? groundFor(pixels.rgba) : null;
  if (ground) {
    made = await make({ ground: settings.iconGround[ground] });
    if (made.reason) return { reason: made.reason };
  }
  const { file, digest } = storePicture(made.bytes, 'png', settings.pictureDirectory);
  return { record: { ok: true, file, digest, width: made.found.width, height: made.found.height, type: 'image/png' } };
}

const ICONS_BEING_READ = new Map();
const ICONS_READ_AGAIN = new Map();

/** A new run of the refresh command in the same process reads every icon again, once. */
export function beginRun(lock) {
  ICONS_READ_AGAIN.delete(lock);
}

/**
 * Makes sure the lock file has an entry for an origin's icon, reading it where the mode says so (LKD-29): once for an
 * origin, whichever function asks first. `page` is a page of that origin whose head has just been read, where there
 * is one; without it the page at the origin's root is read.
 */
function ensureIcon(origin, page, env) {
  const { settings } = env;
  const key = `${settings.lock}\n${origin}`;
  const running = ICONS_BEING_READ.get(key);
  if (running) return running;
  const again = ICONS_READ_AGAIN.get(settings.lock) ?? ICONS_READ_AGAIN.set(settings.lock, new Set()).get(settings.lock);
  const recorded = readLock(settings.lock).icons[origin];
  const reads = settings.mode === 'refresh' ? !again.has(origin) : settings.mode === 'update' && !recorded;
  if (!reads || settings.pictures === 'none') return Promise.resolve();
  if (settings.pictures === 'store' && !settings.transform) {
    sayOnce(settings, NEEDS_IMAGE_STEP);
    return Promise.resolve();
  }
  const work = (async () => {
    let candidate = page?.icon;
    if (!page) {
      const root = await readPage(`${origin}/`, env);
      if (root.ok && withoutWww(root.url.hostname) === withoutWww(new URL(origin).hostname)) candidate = root.fields.icon;
    }
    const address = candidate ?? `${origin}/favicon.ico`;
    let entry;
    if (settings.pictures === 'remote') {
      sayOnce(settings, REMOTE_PICTURES);
      entry = { ok: true, remote: address };
    } else {
      const kept = await keepIcon(address, env);
      entry = kept.record ?? { ok: false, reason: kept.reason };
    }
    again.add(origin);
    writeLock(settings.lock, (data) => {
      data.icons[origin] = entry;
    });
  })().finally(() => ICONS_BEING_READ.delete(key));
  ICONS_BEING_READ.set(key, work);
  return work;
}

/** An icon's entry as an answer: `{ src, width, height, type }`, or nothing — and why, once, where that is a failure. */
function iconAnswer(origin, env, { saysMissing }) {
  const { settings } = env;
  const entry = readLock(settings.lock).icons[origin];
  if (settings.pictures === 'none') return undefined;
  if (!entry) {
    if (saysMissing) sayOnce(settings, `${origin}: site icon: not-in-lock`);
    return undefined;
  }
  if (!entry.ok) {
    sayOnce(settings, `${origin}: site icon: ${entry.reason}`);
    return undefined;
  }
  if (entry.remote !== undefined) return settings.pictures === 'remote' ? { src: entry.remote, width: 0, height: 0, type: '' } : undefined;
  if (settings.pictures !== 'store') return undefined;
  if (!storedPictureIsWhole(entry.file, entry.digest, settings.pictureDirectory)) {
    sayOnce(settings, `${origin}: site icon: its file is missing from the picture directory, or is not the file that was recorded`); // LKD-26
    return undefined;
  }
  const src = settings.iconOutput === 'data' ? `data:image/png;base64,${fs.readFileSync(path.join(settings.pictureDirectory, entry.file)).toString('base64')}` : settings.picturePath(entry.file);
  return { src, width: entry.width, height: entry.height, type: entry.type };
}

function imageAnswer(href, record, env) {
  const { settings } = env;
  if (!record || settings.pictures === 'none') return undefined;
  if (record.remote !== undefined) return settings.pictures === 'remote' ? { src: record.remote, width: 0, height: 0, type: '' } : undefined;
  if (settings.pictures !== 'store') return undefined;
  if (!storedPictureIsWhole(record.file, record.digest, settings.pictureDirectory)) {
    sayOnce(settings, `${href}: picture: its file is missing from the picture directory, or is not the file that was recorded`); // LKD-26
    return undefined;
  }
  return { src: settings.picturePath(record.file), width: record.width, height: record.height, type: record.type };
}

const originOf = (href) => {
  try {
    return new URL(href).origin;
  } catch {
    return undefined;
  }
};

/** A link's entry as the result (LKD-27): the data with its pictures joined, or the address and the reason. */
function linkAnswer(href, entry, env) {
  const { settings } = env;
  if (!entry || !entry.ok) {
    const reason = entry ? entry.reason : 'not-in-lock';
    sayOnce(settings, `${href}: ${reason}`); // LKD-28: the address and the reason, and nothing a destination sent
    return { ok: false, href, reason };
  }
  const data = { href, title: entry.title };
  if (entry.description !== undefined) data.description = entry.description;
  if (entry.siteName !== undefined) data.siteName = entry.siteName;
  const image = imageAnswer(href, entry.image, env);
  if (image) data.image = image;
  const origin = originOf(href);
  const siteIcon = origin ? iconAnswer(origin, env, { saysMissing: false }) : undefined;
  if (siteIcon) data.siteIcon = siteIcon;
  data.external = isExternal(href, { site: settings.site }) ? 'on' : 'off';
  data.read = entry.read;
  return { ok: true, data };
}

/** Reads one address anew: its entry for the lock file. The origin's icon is recorded beside it. */
async function readLink(href, env) {
  const { settings } = env;
  const page = await readPage(href, env);
  if (!page.ok) return { ok: false, reason: page.reason };
  const { fields } = page;
  if (fields.title === undefined) return { ok: false, reason: 'no-title' };
  const entry = { ok: true, title: fields.title, description: fields.description, siteName: fields.siteName, read: day(env.internals.now()) };
  if (fields.image !== undefined && settings.pictures === 'remote') {
    sayOnce(settings, REMOTE_PICTURES);
    entry.image = { remote: fields.image };
  } else if (fields.image !== undefined && settings.pictures === 'store') {
    if (!settings.transform) sayOnce(settings, NEEDS_IMAGE_STEP);
    else {
      const kept = await keepImage(fields.image, env);
      if (kept.record) entry.image = kept.record;
      else sayOnce(settings, `${href}: picture: ${kept.reason}`);
    }
  }
  const origin = originOf(href);
  // The page's own icon is its origin's only while the page was read from that host: a forwarder's is its own.
  const ofThisHost = withoutWww(page.url.hostname) === withoutWww(new URL(href).hostname);
  if (origin) await ensureIcon(origin, ofThisHost ? { icon: fields.icon } : undefined, env);
  return entry;
}

const LINKS_BEING_READ = new Map();

/** resolveLinkData(), with the fetcher's seam as an argument. */
export async function resolveLinkDataWith(href, options, internals) {
  const settings = readOptions(options);
  if (typeof href !== 'string') throw new TypeError('links: resolveLinkData(href, options) takes the address as a string');
  const env = { settings, internals };
  const recorded = readLock(settings.lock).links[href];
  // LKD-24: frozen answers from the lock file alone; update reads only what has no entry; refresh reads again.
  const reads = settings.mode === 'refresh' || (settings.mode === 'update' && !recorded);
  if (!reads) return linkAnswer(href, recorded, env);
  const key = `${settings.lock}\n${href}`;
  let work = LINKS_BEING_READ.get(key);
  if (!work) {
    work = (async () => {
      let entry;
      try {
        entry = await readLink(href, env);
      } catch (error) {
        // LKD-2: whatever a network or a destination did, it is an answer. What the site's own files do is not.
        if (error instanceof TypeError && String(error.message).startsWith('links: ')) throw error;
        entry = { ok: false, reason: 'unreachable' };
      }
      writeLock(settings.lock, (data) => {
        // LKD-23: an address read again to the same words keeps the day it was first read, so the file does not change.
        const before = data.links[href];
        if (before?.ok && entry.ok && sameWords(before, entry)) entry.read = before.read;
        data.links[href] = entry;
      });
    })().finally(() => LINKS_BEING_READ.delete(key));
    LINKS_BEING_READ.set(key, work);
  }
  await work;
  return linkAnswer(href, readLock(settings.lock).links[href], env);
}

/** resolveSiteIcons(), with the fetcher's seam as an argument. */
export async function resolveSiteIconsWith(origins, options, internals) {
  const settings = readOptions(options);
  if (!Array.isArray(origins) || !origins.every((origin) => typeof origin === 'string')) throw new TypeError('links: resolveSiteIcons(origins, options) takes a list of origins ("https://example.org")');
  const env = { settings, internals };
  const wanted = [...new Set(origins.map((origin) => originOf(origin) ?? origin))];
  const out = {};
  await Promise.all(
    wanted.map(async (origin) => {
      if (!/^https:\/\//.test(origin)) {
        sayOnce(settings, `${origin}: site icon: address-refused`);
        return;
      }
      try {
        await ensureIcon(origin, undefined, env);
      } catch (error) {
        if (error instanceof TypeError && String(error.message).startsWith('links: ')) throw error;
        writeLock(settings.lock, (data) => {
          data.icons[origin] = { ok: false, reason: 'unreachable' };
        });
      }
      const icon = iconAnswer(origin, env, { saysMissing: true });
      if (icon) out[origin] = { src: icon.src, width: icon.width, height: icon.height };
    }),
  );
  return Object.fromEntries(Object.keys(out).sort().map((origin) => [origin, out[origin]]));
}
