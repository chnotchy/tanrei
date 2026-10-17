# design/brand/ — the marks

Tanrei has two marks, used one at a time:

| Mark | File | Where it goes |
|---|---|---|
| The symbol: the T of Shippori Mincho, its corners eased | `symbol.svg` (512 × 512 frame) | where the name is not read: an app icon, a favicon, the docs' header, a file thumbnail |
| The wordmark: the symbol's T followed by "anrei" in Outfit SemiBold (tracking −1 %), one drawing | `wordmark.svg` (1536 × 512 frame; the T where the symbol's frame puts it) | where the name is read: a cover, a page title, a document header, a shared link's image |

The design of both lives in the Figma library (the file and the nodes are in `figma.json`). The files here are their
source for everything else in the repository, and are never edited by hand. The rules and drawings for readers are on
the docs site's brand page (`apps/docs/src/content/docs/foundations/brand.mdx`).

In the Figma library the symbol's main component keeps a fixed color, not bound to a variable; its instances, like
every use in code, are bound to `on-surface` for contrast and consistency. The pull takes whatever color the export
has and writes `currentColor`.

## Rules

- **One at a time.** There is no lockup of the symbol and the wordmark; do not build one, and do not set the name as
  text beside the symbol.
- **The symbol's placement.** The symbol sits a little below the centre of its frame on purpose: the T carries its
  weight at the top, and the lower position makes it look centred. Keep it; never recentre it.
- **One color, from a token.** Both are drawn in `sys.color.on-surface`, so they follow light, dark and the contrast
  schemes. Do not recolor them, and do not add a gradient, an outline, a shadow or a background shape (an app icon's
  opaque square is the platform's, not the mark's).
- **Size.** The symbol's frame is at least 24 px; the wordmark's cap height is at least 24 px. The favicon is the one
  exception: a browser draws it at 16 px. It is one SVG; the ICO and PNG files are rasterisations of that same image at
  the sizes browsers ask for, not a second design, and their soft edges at 16 px are accepted.
- **Clear space.** Around the symbol, a quarter of its height on every side, measured from its ink; around the
  wordmark, half its x-height.
- The 端麗 characters on the Figma cover are an ornament of that design, not part of the identity: do not use them as
  a mark.

## What is derived, and by what

Each file here is one flat shape in `currentColor`. Everything else is made from it:

| Use | File | Made by |
|---|---|---|
| The marks painted in the light and the dark scheme's on-surface (an image that cannot inherit a color: this repository's README) | `generated/{symbol,wordmark}.{light,dark}.svg` | `pnpm generate` (`packages/tokens-build/src/emit/brand.js`) |
| The favicon: the symbol, painted by its own stylesheet in the reader's scheme and contrast | `generated/symbol.adaptive.svg` → the docs' `/favicon.svg` | `pnpm generate`; served by `apps/docs/src/pages/favicon.svg.ts` |
| The ICO (16, 32, 48) and the home-screen icon (180): the symbol on the light surface | the docs' `/favicon.ico`, `/apple-touch-icon.png` | the docs build (`apps/docs/src/lib/brand.mjs`) |
| The social image (1200 × 630): the wordmark on the light surface | the docs' `/og.png` | the docs build |
| The docs' header: the symbol inline, painted by `sys.color.on-surface`, as the link to the first page | — | `apps/docs/src/components/frame/Header.astro` |

## When a mark changes in Figma

```sh
FIGMA_TOKEN=<personal access token, scope file_content:read> pnpm brand:pull
```

renders both nodes as SVG through Figma's REST API, writes them here and runs the token pipeline, which rewrites
`generated/`. Without a token, export the components as SVG from Figma (or with an agent's Figma tools) and pass the
files:

```sh
pnpm brand:pull --symbol ~/Downloads/symbol.svg --wordmark ~/Downloads/wordmark.svg
```

The pull refuses an export that is not flat shapes in one color, with what it found: a mark that changes in kind is a
decision, not a refresh. Look at `generated/` and the docs (`pnpm docs:dev`), then commit the marks with what was
derived from them.

## Use of the marks by others

Tanrei's code and documentation are licensed under the Apache License 2.0, whose section 6 grants no permission to use
the licensor's names, trademarks or product names, except to describe the origin of the work and to reproduce the
NOTICE file. You may say in text that your work uses Tanrei or is built with it. The symbol and the wordmark belong to
the Tanrei Authors and are not licensed to others: do not use them in your product, in your package's name or icon, or
in any way that suggests your work is Tanrei or is endorsed by it.
