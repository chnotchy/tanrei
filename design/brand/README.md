# design/brand/ — the marks

Tanrei has two marks, used one at a time:

| Mark | File | Where it goes |
|---|---|---|
| The symbol: the T of Shippori Mincho, its corners eased | `symbol.svg` (512 × 512 frame) | where the name is not read: an app icon, a favicon, the docs' header, a file thumbnail |
| The wordmark: "Tanrei" in Shippori Mincho Bold, tracking −1.44 % | `wordmark.svg` (658 × 200) | where the name is read: a cover, a page title, a document header, a shared link's image |

The design of both lives in the Figma library (the file and the nodes are in `figma.json`). The files here are their
source for everything else in the repository, and are never edited by hand.

## Rules

- **One at a time.** There is no lockup of the symbol and the wordmark; do not build one, and do not set the name as
  text beside the symbol.
- **One color, from a token.** Both are drawn in `sys.color.on-surface`, so they follow light, dark and the contrast
  schemes. Do not recolor them, and do not add a gradient, an outline, a shadow or a background shape (an app icon's
  opaque square is the platform's, not the mark's).
- **Size.** The symbol's frame is at least 24 px; the wordmark's cap height is at least 24 px. (A browser's 16 px
  favicon is the one exception: it is the platform's size.)
- **Clear space.** Around the symbol, a quarter of its height on every side; around the wordmark, half its x-height.
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
