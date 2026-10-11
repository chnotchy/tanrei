// `@tanrei/web/links/node` — the build-time helper's types. The contract is REQUIREMENTS.md, beside this file.
// Node only (LKD-1). Written by hand: the module is JavaScript, because the package has no types for Node's own
// modules; src/links/node/test/surface.test.mjs holds this file to what index.js exports.

// The pure functions the element and the build step share (LKD-2).
export * from '../index.js';

/** A picture among the site's own files (or, while `pictures` is `remote`, at its destination: width, height 0 and no type). */
export interface Picture {
  src: string;
  width: number;
  height: number;
  type: string;
}

/** What a link card is given. It has no host: the card computes it from `href`. */
export interface LinkData {
  /** Exactly the address that was asked about; never a redirect's end. */
  href: string;
  /** Plain text, cleaned (LKD-15); never empty. */
  title: string;
  description?: string;
  siteName?: string;
  image?: Picture;
  siteIcon?: Picture;
  /** From `options.site`: whether `href` is outside the product's own origins. */
  external: 'on' | 'off';
  /** The day its words were read, YYYY-MM-DD. */
  read: string;
}

export type LinkDataFailure = 'not-in-lock' | 'address-refused' | 'address-private' | 'redirect-refused' | 'timeout' | 'too-large' | 'not-a-page' | 'unreachable' | 'no-title';

export type LinkDataResult = { ok: true; data: LinkData } | { ok: false; href: string; reason: LinkDataFailure };

/** What the site's image step is told about the bytes it is given. */
export interface PictureInfo {
  /** The kind the bytes are, told from the bytes: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/avif`, or for an icon `image/x-icon`. */
  type: string;
  width: number;
  height: number;
  role: 'image' | 'siteIcon';
  /** For a site icon: the side of the PNG to return, in pixels (`iconSize`). The step returns exactly that square. */
  size?: number;
  /** For a site icon, on a second call: the plain ground to put under the picture (`iconGround.light` or `.dark`). */
  ground?: string;
}

export interface LinkDataLimits {
  /** Milliseconds for one address in all: resolving, connecting, every redirect, reading. Default 10000. */
  time?: number;
  /** Milliseconds for one request. Default 5000. */
  request?: number;
  /** Bytes of markup read, after decompression. Default 524288. */
  markup?: number;
  /** Bytes of a picture. Default 5242880. */
  picture?: number;
  /** Bytes of an icon. Default 256000. */
  icon?: number;
  /** The longest side of a picture or an icon, in pixels. Default 4096. */
  pixels?: number;
  /** Redirects followed. Default 3. */
  redirects?: number;
  /** Characters, as a reader counts them. Defaults 200, 300, 60. */
  title?: number;
  description?: number;
  siteName?: number;
}

/** The options of every function that reads. An option that cannot be read, and a key that is not an option, throw a TypeError. */
export interface LinkDataOptions {
  /** The product's own origins, as `isExternal()` reads them; at least one. */
  site: readonly string[];
  /** The path of `link-data.lock.json`. */
  lock: string;
  /** `frozen` (the default; what a build uses) answers from the lock file and touches no network. */
  mode?: 'frozen' | 'update' | 'refresh';
  /** Hosts that may be read; `*.example.com` takes subdomains; absent means any public host. */
  allow?: readonly string[];
  /** Hosts that may not; wins over `allow`. */
  deny?: readonly string[];
  /** Hosts allowed to forward to another host (LKD-9). */
  redirects?: readonly string[];
  /** Default `store`, which keeps a picture only through `transform` (LKD-21). */
  pictures?: 'store' | 'remote' | 'none';
  /** Where stored pictures are written; required while `pictures` is `store`. */
  pictureDirectory?: string;
  /** The address a page uses for a stored file. Default: `/<the directory's name>/<file>`. */
  picturePath?: (file: string) => string;
  /** The site's image step: decodes the bytes and returns them encoded anew. Without it nothing is stored (LKD-21). */
  transform?: (bytes: Uint8Array, info: PictureInfo) => Promise<Uint8Array> | Uint8Array;
  /** How the build introduces itself. Default: the package's name and version. */
  userAgent?: string;
  limits?: LinkDataLimits;
  /** Each refusal and failure, once. Default: a line on standard error. */
  report?: (message: string) => void;
  /** The side of a stored site icon, in pixels. Default 32 — twice the size the text draws it (LKD-30). */
  iconSize?: number;
  /** `data` answers a site icon as a `data:` URL of the stored PNG, for a page that must be one file (LKD-30). Default `file`. */
  iconOutput?: 'file' | 'data';
  /** The plain grounds put under an icon that would not be seen on a dark surface (`light`) or on a light one (`dark`), as the image step reads a color. Defaults `#ffffff`, `#000000`. */
  iconGround?: { light?: string; dark?: string };
}

/** A site's icon, as `markExternalLinks()` writes it. */
export interface SiteIcon {
  src: string;
  width: number;
  height: number;
}

/** LKD-1 to LKD-28. Never rejects for what a network or a destination does. */
export function resolveLinkData(href: string, options: LinkDataOptions): Promise<LinkDataResult>;

/** LKD-29, LKD-30. Answers origin → icon; an origin without one is absent. */
export function resolveSiteIcons(origins: readonly string[], options: LinkDataOptions): Promise<Record<string, SiteIcon>>;

/** A node of the element tree a renderer has: `{ type: 'element', tagName, properties, children }`, and whatever stands around it. */
export interface TreeNode {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: TreeNode[];
  [key: string]: unknown;
}

export interface MarkExternalLinksOptions {
  /** The product's own origins: the same list the other functions take. */
  site: readonly string[];
  /** The address of the page the tree is of, where it is known: paths are read against it. */
  base?: string;
  /** The words that say a link leaves the site; written as `aria-description` where the anchor has none. */
  description?: string;
  /** What `resolveSiteIcons()` answered. */
  icons?: Record<string, SiteIcon>;
}

/** LKD-31. Walks the tree, parses nothing, opens no connection, writes no file; returns the tree it was given. */
export function markExternalLinks<Tree extends TreeNode>(tree: Tree, options: MarkExternalLinksOptions): Tree;

export interface RefreshRequest {
  options: LinkDataOptions;
  /** The addresses drawn as link cards. */
  links?: readonly string[];
  /** The origins whose icons external links show. */
  origins?: readonly string[];
  /** `update` (the default) reads what has no entry; `refresh` reads everything again; `frozen` reads nothing. */
  mode?: 'update' | 'refresh' | 'frozen';
}

export interface RefreshSummary {
  /** The lock file's path. */
  lock: string;
  /** Whether the lock file's text changed. */
  changed: boolean;
  /** The addresses that have data. */
  links: string[];
  failed: { href: string; reason: LinkDataFailure }[];
  /** The origins that have an icon. */
  icons: string[];
}

/** What a person runs to write the lock file (also the `tanrei-links` command). A build never calls it. */
export function refreshLinkData(request: RefreshRequest): Promise<RefreshSummary>;
