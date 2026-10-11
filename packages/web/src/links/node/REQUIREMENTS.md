# Link data — the build-time helper's contract

`resolveLinkData()` reads what a page says of itself **where a site is built**, and returns plain data in the shape the link card takes. It is part of `@tanrei/web/links`, the Node module that also holds `markExternalLinks()` and `resolveSiteIcons()`; the three share one fetcher, one lock file, one directory of pictures and one `site` option.

This file is the helper's specification. It is not part of `link-card.spec.json`, because a spec's behaviours are what every platform implements and tests, and the helper is one platform's tool. It stands beside the module it specifies, and the module's tests cite its ids: each requirement has at least one test whose title begins with its id (`test/*.test.mjs`; `pnpm --filter @tanrei/web test:node`). What the module settled where this text left a choice is under "As built", at the end.

Every requirement below holds for every function of the module: `resolveSiteIcons()` and `markExternalLinks()` are held to the same rules as `resolveLinkData()`, and LKD-29 to LKD-31 are what is the site icon's and the marking step's own.

## What it is for, and what it is not

- **For:** a static site, a documentation site, a blog — any product whose pages are made ahead of time by a build its authors control.
- **Not for:** answering requests while a product runs. Nothing here is a server, and none of it may be imported by code that runs in a browser (LKD-1). A product that looks destinations up while people use it writes its own service to the contract at the end of this file.

## Shape

```ts
// @tanrei/web/links (Node)
function resolveLinkData(href: string, options: LinkDataOptions): Promise<LinkDataResult>;

// @tanrei/web/links — pure; also what the element itself uses
function linkCardToNodes(data: LinkData, options?: { variant?: string; target?: 'same' | 'new'; targetLabel?: string; externalLabel?: string }): Node[];
function displayHost(href: string): string; // LKC-8 and LKC-9: the host as a link card draws it, or '' where href has none

type LinkDataResult =
  | { ok: true; data: LinkData }
  | { ok: false; href: string; reason: LinkDataFailure };

interface LinkData {
  href: string;           // exactly the address that was asked about; never a redirect's end
  title: string;          // plain text, cleaned (LKD-15); never empty in a result that is ok
  description?: string;   // plain text
  siteName?: string;      // plain text
  image?: Picture;        // a picture among the site's own files, unless options.pictures says otherwise
  siteIcon?: Picture;
  external: 'on' | 'off'; // from options.site: whether href is outside the product's own origins
  read: string;           // the day it was read, YYYY-MM-DD
}
interface Picture { src: string; width: number; height: number; type: string }

type LinkDataFailure =
  | 'not-in-lock'      // frozen mode and no entry
  | 'address-refused'  // LKD-3, LKD-4
  | 'address-private'  // LKD-5
  | 'redirect-refused' // LKD-8, LKD-9
  | 'timeout' | 'too-large' | 'not-a-page' | 'unreachable'
  | 'no-title';

interface LinkDataOptions {
  site: string[];                  // the product's own origins (shared with markExternalLinks and resolveSiteIcons)
  lock: string;                    // path of link-data.lock.json
  mode?: 'frozen' | 'update' | 'refresh'; // default 'frozen' (LKD-24)
  allow?: string[];                // hosts that may be read; '*.example.com' takes subdomains; absent means any public host
  deny?: string[];                 // hosts that may not; wins over allow
  redirects?: string[];            // hosts allowed to forward to another host (LKD-9)
  pictures?: 'store' | 'remote' | 'none'; // default 'store' (which needs `transform`, LKD-21)
  pictureDirectory?: string;       // where stored pictures are written; required for 'store'
  picturePath?: (file: string) => string; // the address a page uses for a stored file
  transform?: (bytes: Uint8Array, info: { type: string; width: number; height: number; role: 'image' | 'siteIcon' }) => Promise<Uint8Array> | Uint8Array; // the site's codec; without it nothing is stored (LKD-21)
  userAgent?: string;              // how the build introduces itself
  limits?: { time?: number; request?: number; markup?: number; picture?: number; icon?: number; pixels?: number; redirects?: number; title?: number; description?: number; siteName?: number };
  report?: (message: string) => void;
}
```

`LinkData` is also what a product's own service returns (the contract at the end). It has **no host field**: the link card computes the host from `href` (LKC-8), so no helper, service or author can put another in its place.

## Requirements

EARS form, as a spec's behaviours are. "The helper" is `resolveLinkData()` together with the fetcher it shares with `resolveSiteIcons()`.

### Where it runs

- **LKD-1** THE helper SHALL run under Node only and SHALL NOT be reachable from the package's browser entry points: no module a page loads imports it, and it adds no dependency to what a reader's browser downloads.
- **LKD-2** THE helper SHALL answer every address with a result and SHALL NOT throw for anything a network or a destination does; it SHALL throw only for options it cannot read. `isExternal()`, `linkCardToNodes()` and `displayHost()` SHALL be pure — the same answer for the same arguments, no file, no network — and usable in a browser: they live in a module without a Node dependency, which the package's browser entry points and the Node entry both import, so LKD-1 holds for everything that fetches and the element and the build step still share one rule.

### Which addresses it will read

- **LKD-3** IF an address's scheme is not `https`, or it carries a user name or a password, or it names a port that is not its scheme's own, or its host is a numeric address rather than a name, THE helper SHALL refuse it (`address-refused`) without resolving or contacting anything.
- **LKD-4** WHERE `allow` is given THE helper SHALL read only hosts it lists; THE helper SHALL refuse every host `deny` lists, `deny` winning over `allow`; both SHALL be matched against the host of the address before any name is resolved, and again against the host of every redirect.
- **LKD-5** WHEN it has resolved a host's name THE helper SHALL refuse the address (`address-private`) IF any address the name resolves to is not a public one: the machine itself, a private network, a link-local address — among them the address hosting providers keep for a machine's own configuration and credentials — a shared carrier range, an unspecified, multicast, reserved or documentation address, a unique-local or link-local IPv6 address, or an IPv6 form that carries any of those IPv4 addresses inside it.
- **LKD-6** THE helper SHALL connect to the very address it checked under LKD-5, presenting the host's name for the certificate and the request, and SHALL NOT resolve the name a second time for that connection, so that a name which answers differently the second time gains nothing.
- **LKD-7** THE helper SHALL verify a server's certificate as the platform does and SHALL offer no option that turns the verification off.
- **LKD-8** THE helper SHALL NOT let the platform follow a redirect by itself: it SHALL read each redirect's address, hold it to LKD-3 to LKD-7 as a new address — so one that leads from `https` to `http` is refused —, and follow at most 3 (`limits.redirects`) before refusing (`redirect-refused`).
- **LKD-9** IF a redirect leads to another host than the address asked about — other than adding or removing a leading `www.` — THE helper SHALL refuse it, unless the host that forwards is listed in `redirects`; so that a card never shows one site's words under another site's host. WHERE such a redirect is allowed THE result's `href` SHALL still be the address asked about.
- **LKD-10** THE helper SHALL make one `GET` request for a page, with no cookie sent or kept, no credential, no referrer, and the one `userAgent` the options give; it SHALL run at most 4 requests at a time and at most 1 to any one host.

### How much it will read

- **LKD-11** THE helper SHALL give one request 5 seconds (`limits.request`) and one address 10 seconds in all (`limits.time`) — resolving, connecting, every redirect, reading — and SHALL abandon the connection when either has passed (`timeout`).
- **LKD-12** THE helper SHALL read an answer only WHILE its declared type is a page of markup (`not-a-page` otherwise), SHALL count what it reads after decompression, and SHALL stop and close the connection at 512 KiB (`limits.markup`), keeping what it has; it SHALL never hold more than that of one answer in memory.
- **LKD-13** THE helper SHALL read a page's head and nothing after it — it stops at the head's end, at the body's start or at the limit, whichever comes first — with a reader that makes no document of it, runs no script, loads nothing the page refers to other than the one picture and the one icon it chooses, and follows no instruction in the page to go elsewhere.

### What it takes from the page

- **LKD-14** THE helper SHALL take five fields from the head and no others — a title, a description, a picture's address, the site's name, an icon's address — each from the first source that has one, in the order the technical notes below list.
- **LKD-15** THE helper SHALL take the title, the description and the site's name as text: character references decoded once; no tag ever interpreted, so that a tag inside a value stays the characters it was written with; runs of white space made one space; control characters dropped; the characters that embed, override or isolate the direction of text (U+202A to U+202E, U+2066 to U+2069) dropped; composed to one normal form; and cut, at a boundary between characters as a reader counts them and with nothing added, to 200, 300 and 60 characters (`limits.title`, `limits.description`, `limits.siteName`). A value that is empty after that SHALL be absent.
- **LKD-16** IF the site's name reads as a host or an address — it has no space and holds a dot between letters — and is not the host of the address asked about, THE helper SHALL leave it out: a name that looks like a host must not stand beside another host.
- **LKD-17** THE helper SHALL resolve a picture's or an icon's address against the address the page was finally read from, and SHALL take it only WHILE the result is an `https` address; inline data, a script, `http` and every other scheme SHALL be absent.

### Pictures

- **LKD-18** WHILE `pictures` is `store` THE helper SHALL fetch the picture and the icon under LKD-3 to LKD-11 — every rule an address of a page is held to — and SHALL stop at 5 MiB for a picture and 256 kB for an icon (`limits.picture`, `limits.icon`), dropping one that is larger.
- **LKD-19** THE helper SHALL decide what kind of file a picture is from its first bytes alone, never from its name or from what the server calls it, and SHALL keep only a PNG, a JPEG, a GIF, a WebP or an AVIF picture — for an icon, also an ICO — dropping everything else: a vector drawing, which is a document that can carry script, above all. It SHALL NOT rasterise a vector drawing in order to keep it: that would run a renderer over a document someone else wrote, on the machine that builds.
- **LKD-20** THE helper SHALL read a picture's width and height from the file's own header before anything decodes it, and SHALL drop one wider or higher than 4096 (`limits.pixels`) or with a side of 0; for an icon it SHALL choose, among those a page offers, the smallest that is at least 32 a side, and failing that the largest.
- **LKD-21** THE helper SHALL write no picture and no icon that has not been decoded and encoded anew: WHERE `transform` is given it SHALL pass every kept picture through it and store what it returns, held again to LKD-19 and LKD-20 — this is where a site connects its own image step, which re-encodes a picture, drops whatever else its file carried and gives it the sizes the site serves. WHERE it is not given THE helper SHALL store nothing and return no picture and no icon, and SHALL say once in its report that pictures need the site's image step; it SHALL never write bytes as they were fetched. The package gains no picture codec of its own.
- **LKD-22** THE helper SHALL write a kept picture into `pictureDirectory` under a name made from a digest of its bytes and the extension of the kind LKD-19 found — never a name, a path or an extension the destination gave — and SHALL return the site's own address for it (`picturePath`) with its width and height. WHILE `pictures` is `remote` it SHALL fetch nothing and return the address of LKD-17 as it is, and say once in its report that every reader's browser will ask the destination for it; WHILE `pictures` is `none` it SHALL return no picture and no icon.

### The lock file

- **LKD-23** THE helper SHALL keep everything it has read in one file, `link-data.lock.json`, that the site commits: one entry per address asked about, holding the `LinkData` or the failure and the digests of its pictures, with its entries and their keys in a fixed order and nothing that changes from one run to the next, so that reading the same addresses twice writes the same file.
- **LKD-24** WHILE `mode` is `frozen` — the default, and what a build uses — THE helper SHALL answer from the lock file alone and SHALL NOT resolve a name, open a connection or write a file; an address with no entry is `not-in-lock`. WHILE `mode` is `update` it SHALL read only the addresses that have no entry; WHILE `mode` is `refresh` it SHALL read every address again. Only a command a person runs uses the last two.
- **LKD-25** THE helper SHALL record a failure in the lock file with its reason, and in `frozen` and `update` SHALL answer it from there without trying again, so that a build with the network and one without draw the same page.
- **LKD-26** IF a picture an entry names is missing from `pictureDirectory`, or its bytes do not match the entry's digest, THE helper SHALL answer the entry without that picture and report it; it SHALL NOT fetch it in `frozen`.

### The site icon and the marking step

- **LKD-29** `resolveSiteIcons(origins, options)` SHALL find the icon of each origin as LKD-14 finds a page's — the page at the origin's root, read under LKD-3 to LKD-13, and failing that the origin's `/favicon.ico` — SHALL hold it to every rule a picture is held to (LKD-18 to LKD-22), and SHALL record it in the same lock file and the same directory under the same modes (LKD-23 to LKD-26), so that an origin's icon is read once whichever function asks first and a build reads none. It SHALL answer each origin with `{ src, width, height }` or with nothing, and a failure SHALL be a line of the report and never a failed build (LKD-27, LKD-28).
- **LKD-30** THE helper SHALL write a site icon as a small PNG, 32 a side by default — twice the size the text draws it —, made by the site's codec (LKD-21) and named by the digest of its bytes (LKD-22). WHERE the picture has transparent pixels and what is drawn of it would not be seen on a dark or on a light surface THE helper SHALL put a plain ground under it in the file, because the component draws none (LNK-32). WHERE the options ask for it THE helper SHALL return that same PNG as a `data:` URL instead of a file's address, for a page that must be one file.
- **LKD-31** `markExternalLinks(tree, options)` SHALL walk the tree it is given and parse nothing; SHALL decide what is external by `isExternal()` from the one `site` option; SHALL write on each external anchor `data-external="true"`, the words the options give as its description where the anchor has none, and — where an icon is recorded for its origin — an `img` as the anchor's first child with the class `tanrei-link-site-icon`, an empty `alt`, its width and height, `loading="lazy"`, `decoding="async"` and `referrerpolicy="no-referrer"`; SHALL leave an anchor that already carries `data-external` as it is; and SHALL open no connection and write no file.

### Failing

- **LKD-27** THE helper SHALL answer `ok` only WHILE it has a title; with anything less — a refusal, a timeout, a page without a title — it SHALL answer with the address and the reason, and the page SHALL then draw an ordinary link whose text is the address (or the author's own words where the author gave some), never a card with invented text.
- **LKD-28** THE helper SHALL report each refusal and failure once, naming the address and the reason through `report`, and SHALL NOT print, log or return anything a destination sent other than the cleaned fields.

## Technical notes

**What is read from a head (LKD-14).** These names are data the helper looks for; nothing in Tanrei's design refers to them.

| Field | Sources, first that has a value |
|---|---|
| Title | `meta` with `property="og:title"`; the `title` element |
| Description | `meta` with `property="og:description"`; `meta` with `name="description"` |
| Picture | `meta` with `property="og:image:secure_url"`; `property="og:image"` |
| Site's name | `meta` with `property="og:site_name"`; `meta` with `name="application-name"` |
| Icon | `link` whose `rel` holds `icon`, by its `sizes` (LKD-20); else `/favicon.ico` of the origin |

A `base` element in the head changes what relative addresses are resolved against, as it does for a browser. The character encoding is the response header's, else a byte-order mark's, else a `meta` declaration in the first 1024 bytes, else UTF-8; bytes that are not valid in it become the replacement character.

**Public addresses (LKD-5).** A test fixes the list as data: 0.0.0.0/8, 10/8, 100.64/10, 127/8, 169.254/16, 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4; ::, ::1, ::ffff:0:0/96, 64:ff9b::/96, 2001:db8::/32, fc00::/7, fe80::/10, ff00::/8, and the forms of 2002::/16 that carry one of the IPv4 ranges.

**The lock file's place.** Beside the site's content, committed. A refresh is a pull request like any other: the reviewer sees each new title and description as a line and each new picture as a file.

**Tests the implementation owes.** An `http` address, refused before anything is resolved. A local server that: redirects to a private address; resolves to a public address first and a private one next; redirects four times; forwards to another host; answers without end; answers one byte a second; declares a page and sends a picture, and the reverse; serves a vector drawing named `.png`; serves a picture whose header claims 60000 pixels a side; puts markup, a direction override and 5000 characters in its title; gives no title. And: `frozen` with the network unplugged draws the same nodes as the run that wrote the lock.

## The contract for a product's own service

A product that looks destinations up while people use it does so in a service of its own. Tanrei ships none. The service returns `LinkData` — text, never markup; pictures at the product's own origin; no host — and is held to what LKD-3 to LKD-13 and LKD-15 to LKD-20 hold the helper to, with two things a build does not need: it must limit how often any one asker may call it, and it must not let an asker learn, from an answer or from how long it took, anything about addresses the asker could not reach itself.

## As built

These are the points the requirements above leave open, and how the module settles them.

**Where it is imported from.** The Node entry is `@tanrei/web/links/node`, named in the package's `exports` under the `node` condition alone, so a bundler for a browser cannot resolve it (LKD-1). It gives the functions that read — `resolveLinkData()`, `resolveSiteIcons()`, `markExternalLinks()`, `refreshLinkData()` — and gives again everything the pure module `src/links/index.ts` exports (`isExternal()`, `displayHost()`; LKD-2). "`@tanrei/web/links` (Node)" in the text above is this entry.

**Options the text above does not name.**

| Option | What it is |
|---|---|
| `limits.time`, `limits.request` | milliseconds (10000 and 5000) |
| `iconSize` | the side of a stored site icon, 32 by default (LKD-30) |
| `iconOutput` | `file` (the default) or `data`: the stored PNG answered as a `data:` URL (LKD-30) |
| `iconGround` | `{ light, dark }`, the two plain grounds, `#ffffff` and `#000000` by default (LKD-30) |
| `picturePath` | by default `/<the picture directory's own name>/<file>` |
| `report` | by default a line on standard error |

A key that is not an option is refused with a `TypeError`, as an option that cannot be read is (LKD-2). `site` takes what `isExternal()` takes, and at least one entry.

**The image step (`transform`, LKD-21 and LKD-30).** It is called with the bytes and `{ type, width, height, role }`. For a site icon `role` is `siteIcon` and the info also holds `size`: the step returns a PNG of exactly that square, or the icon is dropped. The helper then reads the pixels of that small PNG — the only decoding it does, of a file the site's own step has just written — and where LKD-30 asks for a ground it calls the step a second time with `ground` (the color to lay under the picture) and stores that answer. So everything stored is the step's own output. A picture is seen on a surface while it stands 3 to 1 against it, and an icon is seen while at least a tenth of what it draws is. An icon file that holds its chosen picture as a PNG gives the step that PNG; one that holds a bitmap gives the step the whole file, with the type `image/x-icon`.

**With no image step** nothing is fetched for a picture or an icon, none is recorded, and the report says so once. After a step is connected, `refresh` reads the pictures of addresses that already have an entry.

**Reasons.** A redirect whose address fails LKD-3 or LKD-4, that leads to another host, or that is one too many is `redirect-refused`; a redirect to a name that resolves to an address that is not public is `address-private`. A status other than 200, a coding the helper did not ask for, a certificate that is not verified and a connection that fails are `unreachable`. A picture or an icon that is dropped is a line of the report and never a failure of the address: `picture: <reason>` or `site icon: <reason>`, with the fetcher's reasons and `not-a-picture`, `picture-too-large`, `image-step-failed`. A report names the address that was asked about and a reason from these lists — never a redirect's address, a picture's address or anything else a destination sent (LKD-28).

**The lock file.** `{ version, links, icons }`: `links` by the address asked about, `icons` by origin, both in the order of their keys. A stored picture is recorded as its file's name, the digest of its bytes, its width, height and type; its address is `picturePath` of the name, asked when an entry is answered, so a site may move its directory. `external` is not recorded: it is computed from `site` when an entry is answered. `read` is the day an entry's words were first read: an address read again to the same words keeps it, so the file does not change (LKD-23). A file that is not a lock file this version wrote is refused as an option that cannot be read.

**One icon for an origin (LKD-29).** A link's page gives its own origin's icon only where the page was read from that host (with or without `www.`); a link that a listed forwarder sent elsewhere has the forwarder's icon found as any origin's is.

**Named character references (LKD-15).** Numeric references and the common named ones are decoded; a named reference the reader does not know stays as it was written.

**`markExternalLinks()` (LKD-31)** takes a tree of elements `{ type: 'element', tagName, properties, children }` and writes properties under their attributes' names (`data-external`, `aria-description`, `class`, `referrerpolicy`). It refuses a string: it parses nothing.

**The seam for tests.** The fetcher takes what it asks of the machine — the resolver, the check of an address, where a connection goes, the authorities — as one argument, `PRODUCTION` in `fetcher.js`. The public functions always pass it and take no option that changes it; the package's `exports` reach no other function. The module's tests import the files beside the entry by path and pass a seam that leads to a server on the machine itself; `test/surface.test.mjs` holds that the default check refuses 127.0.0.1 and that no specifier and no option reaches the seam.

**The command.** `tanrei-links update | refresh | check [--config <file>]` (the package's `bin`), over `refreshLinkData({ options, links, origins, mode })`. The config is a module whose default export is `{ options, links, origins }`. `check` reads nothing and exits 1 where the lock file lacks an address.
