// The lock file (REQUIREMENTS.md, LKD-23 to LKD-26): everything the helper has read, in one file the site commits.
// Its entries and their keys are in a fixed order and nothing in it changes from one run to the next, so reading the
// same addresses twice writes the same bytes.
//
//   { "version": 1,
//     "links": { "<address asked about>": { "ok": true, "title", "description"?, "siteName"?, "image"?, "read" }
//                                       | { "ok": false, "reason" } },
//     "icons": { "<origin>": { "ok": true, "file", "digest", "width", "height", "type" }
//                          | { "ok": true, "remote" } | { "ok": false, "reason" } } }
//
// A stored picture is `{ "file", "digest", "width", "height", "type" }`; one left at its destination is `{ "remote" }`.
// A file's address is not recorded: it is the site's `picturePath` of the file's name, asked when an entry is answered.
import fs from 'node:fs';
import path from 'node:path';

export const LOCK_VERSION = 1;
const LINK_KEYS = ['ok', 'reason', 'title', 'description', 'siteName', 'image', 'read'];
const ICON_KEYS = ['ok', 'reason', 'remote', 'file', 'digest', 'width', 'height', 'type'];
const PICTURE_KEYS = ['remote', 'file', 'digest', 'width', 'height', 'type'];

const ordered = (value, keys) => Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, key === 'image' ? ordered(value[key], PICTURE_KEYS) : value[key]]));
/** A link's entry with its keys in the file's order: two entries are the same entry exactly when these are equal. */
export const orderedLink = (entry) => ordered(entry, LINK_KEYS);
const byKey = (entries, keys) =>
  Object.fromEntries(
    Object.keys(entries)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((key) => [key, ordered(entries[key], keys)]),
  );

/** The file's text for what was read: the same text for the same entries, whatever order they were read in. */
export function lockText(data) {
  return `${JSON.stringify({ version: LOCK_VERSION, links: byKey(data.links, LINK_KEYS), icons: byKey(data.icons, ICON_KEYS) }, null, 2)}\n`;
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function parse(text, file) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  const entriesAreRead = (entries) => isRecord(entries) && Object.values(entries).every((entry) => isRecord(entry) && typeof entry.ok === 'boolean');
  if (!isRecord(data) || data.version !== LOCK_VERSION || !entriesAreRead(data.links) || !entriesAreRead(data.icons)) {
    // The lock file is the site's own, named by an option: one that cannot be read is an option that cannot be read.
    throw new TypeError(`links: ${file} is not a lock file this version of the helper wrote (version ${LOCK_VERSION}); restore it, or delete it and run the refresh command`);
  }
  // Without a prototype, so that an address named like a property of every object is an address like any other.
  return { links: Object.assign(Object.create(null), data.links), icons: Object.assign(Object.create(null), data.icons) };
}

const OPEN = new Map();

/** The lock file's entries as they are on disk now. Reading it writes nothing; a file that does not exist is empty. */
export function readLock(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new TypeError(`links: ${file} cannot be read (${error?.code ?? 'unknown'})`);
    text = null;
  }
  const held = OPEN.get(file);
  if (held && held.text === text) return held.data;
  const data = text === null ? { links: Object.create(null), icons: Object.create(null) } : parse(text, file);
  OPEN.set(file, { text, data });
  return data;
}

/**
 * Changes the lock file: `change` is given the entries and edits them; the file is written — whole, under another
 * name first — only when its text differs. Synchronous, so two addresses read at once cannot lose each other's entry.
 */
export function writeLock(file, change) {
  const data = readLock(file);
  change(data);
  const text = lockText(data);
  if (OPEN.get(file).text === text) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const draft = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(draft, text);
  fs.renameSync(draft, file);
  OPEN.set(file, { text, data });
}
