// The options of the links helper, read once and strictly (REQUIREMENTS.md, LKD-2: the helper throws only for options
// it cannot read). A key that is not an option is refused too — so nothing can be handed to the fetcher under a name
// of its own, and a misspelled limit is not silently the default.
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_LIMITS } from './fetcher.js';

const KEYS = new Set([
  'site',
  'lock',
  'mode',
  'allow',
  'deny',
  'redirects',
  'pictures',
  'pictureDirectory',
  'picturePath',
  'transform',
  'userAgent',
  'limits',
  'report',
  'iconSize',
  'iconOutput',
  'iconGround',
]);

const fail = (message) => {
  throw new TypeError(`links: ${message}`);
};
const hosts = (value, name) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((host) => typeof host === 'string' && /^(\*\.)?[^\s/:*@]+$/.test(host))) fail(`options.${name} is a list of hosts ("example.com", "*.example.com")`);
  return value;
};
const choice = (value, name, values) => {
  if (value === undefined) return values[0];
  if (!values.includes(value)) fail(`options.${name} is one of ${values.map((entry) => `"${entry}"`).join(', ')}`);
  return value;
};

/** How the build introduces itself where the options give no words: the package's own name and version. */
function ownName() {
  try {
    const manifest = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
    return `${manifest.name}/${manifest.version} (links; reads a page's head where a site is built)`;
  } catch {
    return 'links (reads a page\'s head where a site is built)';
  }
}

const toStandardError = (message) => {
  process.stderr.write(`links: ${message}\n`);
};

/** The options as the module uses them, or a TypeError that says which one cannot be read. */
export function readOptions(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) fail('the options are an object: at least { site, lock }');
  for (const key of Object.keys(options)) if (!KEYS.has(key)) fail(`options.${key} is not an option of the links helper`);
  // The one `site` option (LKD-31): the entries isExternal() reads — an origin, a host, a host with a leading `*.`.
  const site = options.site;
  if (!Array.isArray(site) || site.length === 0 || !site.every((entry) => typeof entry === 'string' && entry.trim() !== '')) fail('options.site is the list of the product\'s own origins, at least one ("https://docs.example")');
  if (typeof options.lock !== 'string' || options.lock === '') fail('options.lock is the path of the lock file (link-data.lock.json)');
  const pictures = choice(options.pictures, 'pictures', ['store', 'remote', 'none']);
  if (pictures === 'store' && (typeof options.pictureDirectory !== 'string' || options.pictureDirectory === '')) fail('options.pictureDirectory is where stored pictures are written; it is required while options.pictures is "store"');
  if (options.pictureDirectory !== undefined && typeof options.pictureDirectory !== 'string') fail('options.pictureDirectory is a path');
  for (const name of ['picturePath', 'transform', 'report']) if (options[name] !== undefined && typeof options[name] !== 'function') fail(`options.${name} is a function`);
  if (options.userAgent !== undefined && (typeof options.userAgent !== 'string' || /[^\x20-\x7e]/.test(options.userAgent) || options.userAgent.trim() === '')) fail('options.userAgent is a line of printable ASCII');
  const limits = { ...DEFAULT_LIMITS };
  if (options.limits !== undefined) {
    if (options.limits === null || typeof options.limits !== 'object') fail('options.limits is an object');
    for (const [name, value] of Object.entries(options.limits)) {
      if (!Object.hasOwn(DEFAULT_LIMITS, name)) fail(`options.limits.${name} is not a limit of the links helper`);
      if (value === undefined) continue;
      if (!Number.isFinite(value) || value < (name === 'redirects' ? 0 : 1) || !Number.isInteger(value)) fail(`options.limits.${name} is a whole number${name === 'redirects' ? ', 0 or more' : ' above 0'}`);
      limits[name] = value;
    }
  }
  const iconSize = options.iconSize ?? 32;
  if (!Number.isInteger(iconSize) || iconSize < 1 || iconSize > 512) fail('options.iconSize is the side of a stored site icon in pixels, 1 to 512');
  const ground = options.iconGround ?? {};
  if (ground === null || typeof ground !== 'object' || Object.keys(ground).some((key) => key !== 'light' && key !== 'dark') || Object.values(ground).some((value) => typeof value !== 'string')) fail('options.iconGround is { light, dark }: the two plain grounds, as the image step reads a color');
  const directory = options.pictureDirectory === undefined ? undefined : path.resolve(options.pictureDirectory);
  return Object.freeze({
    site: Object.freeze([...site]),
    lock: path.resolve(options.lock),
    mode: choice(options.mode, 'mode', ['frozen', 'update', 'refresh']),
    allow: hosts(options.allow, 'allow'),
    deny: hosts(options.deny, 'deny') ?? [],
    redirects: hosts(options.redirects, 'redirects') ?? [],
    pictures,
    pictureDirectory: directory,
    picturePath: options.picturePath ?? ((file) => `/${path.basename(directory ?? '')}/${file}`),
    transform: options.transform,
    userAgent: options.userAgent ?? ownName(),
    limits: Object.freeze(limits),
    report: options.report ?? toStandardError,
    iconSize,
    iconOutput: choice(options.iconOutput, 'iconOutput', ['file', 'data']),
    iconGround: { light: ground.light ?? '#ffffff', dark: ground.dark ?? '#000000' },
  });
}

const SAID = new WeakMap();

/** LKD-28: a line of the report, said once for each `report` function however often it is found again. */
export function sayOnce(settings, message) {
  const said = SAID.get(settings.report) ?? SAID.set(settings.report, new Set()).get(settings.report);
  if (said.has(message)) return;
  said.add(message);
  try {
    settings.report(message);
  } catch {
    // a report that fails is not the helper's failure, and never a failed build
  }
}

/** For the command a person runs, which reports each run anew. */
export function forgetWhatWasSaid(report) {
  SAID.delete(report);
}
