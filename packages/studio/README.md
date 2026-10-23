# @tanrei/studio — Theme Studio

> **Pre-release.** Nothing has been released. Theme Studio runs on the docs site, <https://tanrei.chnotchy.com/studio/>, and locally through `tanrei studio` once `@tanrei/cli` is built from source: <https://tanrei.chnotchy.com/getting-started/your-design-system/>.

Theme Studio is a GUI over **one layer file**, `<id>.system.json` (the file [`tanrei init`](../cli/README.md) writes). Its state *is* that file: every level reads and writes the same JSON object, so switching levels loses nothing and nothing is kept on the side. What it shows is what `tanrei build` will generate — values come from [`@tanrei/token-engine`](../token-engine/README.md), the preview's CSS from the build's own emitter and the warnings from the build's own invariants (`@tanrei/tokens-build`), and the tests build Studio layers with the real pipeline and compare whole sheets.

The package is private: it is not published on its own. It ships two ways —

- as the **standalone app** in `dist-app/`, which `tanrei studio` (`@tanrei/cli`) serves next to its HTTP API;
- as a **module** any Vite-bundled page can mount (`mountStudio`), which is how the docs site hosts it at `/studio/`, the whole page, with the layer kept in the browser and in the page's address.

## The frame

The Studio is the whole page it is mounted in. Across the top stands its bar: the host's own items at its start and end (the docs' brand, the app's file, language and theme), **undo** and **redo**, and the file's state. Under it, in a wide window, three columns that each scroll by themselves: the rail (the levels), the preview, and the panel of what the level edits, with a handle between the preview and the panel that resizes the panel — dragged, or moved from the keyboard as a window splitter is (the arrow keys, Home and End, Enter to its least and back); the width is kept in this browser. In a narrow window they stand in one column, the preview staying under the top while the panel scrolls.

Undo and redo step through the layers that were committed: a step is one commit, and commits closer together than half a second (the letters of a name typed in one go) are one step. ⌘Z and ⇧⌘Z (Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y elsewhere) do the same wherever the focus is in the Studio, except in a field that holds text, where they are the field's own. A layer read again from the file starts a history of its own.

## The preview

The preview draws the layer on five screens built from Tanrei's own components (`src/ui/screens.ts`): an **overview** of every kind of component, with what the system itself is made of — its text styles, icons, intents, steps and the layer's own tokens — a **dashboard**, a **settings form**, a **list and its detail**, and a **documentation page**. The scope they stand in gets the whole sheet `tanrei build` would write, so every component on them follows the layer; the overview draws one sample per variant and size a component declares, a variant or a size the layer adds included. Their text is a product's, in the Studio's language (`screens` in `src/strings/`), with numbers, money and dates formatted for it.

Its bar chooses how they are seen, which is not the layer's and is never saved in the file, only remembered in this browser: the **screen**, **light**, **dark** or the two **side by side**, and the **contrast** (standard, medium, high, as the documentation's header offers them). A screen is drawn once and kept while what it draws stays the same, so switching screens and modes moves elements that exist; each switch is measured on the page's timeline (`tanrei-studio: preview shown`).

**What a setting reaches.** A control that is hovered or focused can say which parts of the screen it changes: `ctx.highlight(ids)` (and `window.<namespace>Studio.highlight(ids)`) outlines, for a moment, every part that reads one of these token ids or a token that follows one of them, and returns how many there are; `ctx.clearHighlight()` takes the outline off. Nothing is listed by hand: what follows a token is the engine's (`followers`) and the sheet's (a custom property written with another), and what a part reads is what it is drawn with — its component's shadow stylesheets and the components inside it, its own `style`, and the page's rules for its classes and its element. A row of the rail calls it with the tokens it writes, on `pointerenter` and `focusin`, and clears it on `pointerleave` and `focusout`:

```ts
row.addEventListener('pointerenter', () => ctx.highlight?.(['tanrei.sys.color.primary']));
row.addEventListener('pointerleave', () => ctx.clearHighlight?.());
```

## Four levels

| Level | What it shows |
|---|---|
| **Essentials** | A base, a brand color and four sliders. Enough for a quick setup; everything else follows. |
| **Groups** | All eight dials, every palette, each component, and what the layer adds to the vocabulary. Typefaces, Icons, Shape (the corner-smoothing slider) and Behaviour write pins, each asking for one reason. |
| **Every token** | Every token of the system, in two panes: a tree that only chooses (`<tanrei-tree-view>`, one stop of the Tab key; a group's rows are written when it opens) and, beside it — under it where the panel is narrow — the chosen token's editor. Each token offers exactly the operations a layer may write for it (`legalOperations` of the engine): a choice of kind is picked by name, never typed as a number. |
| **Source** | The layer file itself. The other three levels are views of this JSON. |

A control left at its base value writes nothing, so an untouched Studio exports `{ "id", "extends" }`.

## Run it

**In a product**, from the directory that holds `tanrei.json`:

```sh
npx tanrei studio [--config tanrei.json] [--port <n>] [--no-open]
```

The server binds to `127.0.0.1` on a random free port (or `--port`), prints a link that carries a one-time key, opens it (unless `--no-open`), and edits the layer file in place: saves are atomic, conditional (`If-Match`) and refused when the engine would refuse the layer, so what `tanrei build` would reject is never written. Its **Build** writes the outputs `tanrei.json` names. Ctrl+C stops it. The server is `packages/cli/src/studio-server.js`; the security notes are at the top of that file.

**In this repository:**

```sh
pnpm --filter @tanrei/studio build:app     # → dist-app/ (what the CLI serves; a stale one makes `tanrei studio` show an old Studio)
pnpm --filter @tanrei/studio dev:app       # Vite dev server over app/ — no file attached: the layer stays in browser storage
```

To develop the app against a real file, run the mock server (`test/mock-server.mjs`, the same HTTP contract as the CLI's, without its hardening) and point Vite's `/api` proxy at it:

```sh
node test/mock-server.mjs --file /tmp/acme.system.json --port 4400 --token dev   # creates the file if it is missing
TANREI_STUDIO_API=http://127.0.0.1:4400 pnpm --filter @tanrei/studio dev:app        # then open the Vite URL with `#token=dev`
```

`--app dist-app` makes the mock server serve a built app itself (no Vite), the way the CLI does.

## Mount it in a page

```ts
import { createHttpAdapter, mountStudio, takeToken } from '@tanrei/studio';
import '@tanrei/web/tokens.css';   // the Studio's chrome is drawn with the default system's tokens on :root

mountStudio(document.querySelector('#studio')!, { lang: 'en' });                          // browser storage, import/export
mountStudio(root, { lang: 'ja', adapter: createHttpAdapter({ token: takeToken() }) });    // edits a file through a server
```

`StudioOptions`: `bar` (`{ start, end }`, the host's nodes for the Studio's bar, moved into it), `address` (keep the layer in the page's fragment, `#layer=…`, compressed with the browser's raw DEFLATE and written in base64url, so that a link opens the Studio on that layer; without an adapter only: `src/address.js`), `lang` (a BCP 47 tag, case-insensitive — the Studio speaks `en`, `ja`, `zh-CN`, `hi`, `es` and `ar`, and takes a longer tag by its language (`es-MX` → `es`); any other language is hosted in English; `studioLanguages()` lists the translated ones, each with its own name, and `studioDirection()` says which are written right-to-left — the Studio's root then gets `dir="rtl"` unless its host already is), `adapter` (a `StudioAdapter`; without one the layer lives in `localStorage`), `links.layers` (where the prose links to the design-systems page; a host without that page leaves it out), `saveDelay` (autosave delay in ms, adapter only). The host bundles with Vite and the plugin from `@tanrei/studio/vite`, which compiles the layer schema to a validator at build time (the CLI serves the app under a CSP without `unsafe-eval`) and swaps the build's filesystem-bound imports for their pure halves. The Studio's controls are Tanrei's own components (tree view, color field, number field, combobox, select, radio group, text field, text input, field group, tag group, chips, empty state, callout). A value is shown while it is typed, stepped or picked and saved when it is committed; the steps made with keys on one field or slider (the arrow keys, Page Up and Page Down, a held key's repeats) are one change, committed once the keys have rested for 300 ms, at Enter, or when focus leaves the control. The words those components read come from the same dictionary (`src/strings/`, `words`): the Studio gives them once with `setWords()` for its own language tag (`<lang>-x-studio`, the `lang` of its root), so the host page's words are neither needed nor written over; `window.<namespace>Studio.missingWords()` lists a word a component lacked. The host also supplies the typefaces: the fonts the tokens name, and the face of each further script it shows the Studio in (the standalone app loads Noto Sans Arabic for Arabic); The host loads the Studio's stylesheets too, with the page that mounts it: `@tanrei/web/icons.css`, `tree-view.css`, `accordion.css` and `description-list.css`, and the Studio's own, `@tanrei/studio/studio.css` (the standalone app imports them in `app/main.ts`). The entry module imports none of them, so that a site whose pages share its bundle does not carry them on every page.

The HTTP contract an adapter speaks (`src/adapter-http.js`): `GET /api/session`, `GET|PUT /api/layer` (with `If-Match`; `409` hands back the current file, `422` the problems), `GET /api/parents`, `POST /api/build[?dry=1]`, and an event stream (`POST /api/events/ticket`, then `GET /api/events?ticket=…`) that says when the file, or a layer next to it, changed on disk. The token travels in the `X-Tanrei-Token` header, never in a URL.

## Layout and tests

| Path | What |
|---|---|
| `src/core.js` | the pure half: layer → documents, scoped CSS, warnings; every edit is a function `layer → layer` |
| `src/data.ts` | browser wiring: the repository's own `tokens/` and `tanrei.config.json`, bundled — never a hand-kept copy |
| `src/ui/`, `src/ui.ts` | the page |
| `src/strings/` | its words: one file per language — English (the source), Japanese, Simplified Chinese, Hindi, Spanish, Arabic — each with exactly the keys of `en.ts` (the type check and `test/strings.test.js` hold them to it); `index.ts` is the registry. A leaf is a string, a pair, or a function: a sentence that holds a count, a name or a value is a function of it, and what stands between two pieces of text (`labelled`, `withCount`, `named`, `listed`, `sentences`) is the language's too — the code under `src/ui/` writes no separator of its own, and puts an element into a sentence with `rich()` (`src/ui/dom.ts`). A file that exports `UNTRANSLATED` is still English, and that language is neither spoken nor offered (none is today) |
| `src/adapter-http.js` | the HTTP adapter and the token handling |
| `src/history.js`, `src/address.js` | undo and redo; the layer in the page's address |
| `app/` | the standalone app (`index.html`, `main.ts`, Vite config) |
| `test/*.test.js` | Node tests, including `parity.test.js` (Studio output = `tanrei build` output) and `adapter.test.js` (against `test/mock-server.mjs`) |
| `test/browser/` | the page in a real browser: `pnpm test:browser` builds the app into a temporary directory and starts a mock server per test |

`pnpm --filter @tanrei/studio test` runs both suites. The docs page ([Theme Studio](https://github.com/chnotchy/tanrei/blob/main/apps/docs/src/content/docs/foundations/theme-studio.mdx)) describes what each control writes into the layer.
