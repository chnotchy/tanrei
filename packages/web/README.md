# @tanrei/web

<!-- tanrei:status -->
<!-- Written by `pnpm generate` (packages/tools/src/readme.js) from the specs and tanrei.config.json: edit those, not this block. -->
> **Prerelease.** `0.1.0-next.0` is published under the npm dist-tag `next`: until `0.1.0`, install `@tanrei/web@next`. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, with no deprecation period first, and its changeset says what broke.

**Components:** 10 alpha · 83 lagging (*alpha*: implemented and tested; the API may change · *lagging*: an implementation exists but has not caught up with the current spec). The [component status matrix](https://github.com/chnotchy/tanrei/blob/main/docs/status/STATUS.md) has each one, computed from the repository.

<!-- /tanrei:status -->

Tanrei on the web: the design tokens as CSS custom properties, and Web Components built with Lit that read nothing
else. No framework is required; [`@tanrei/react`](https://www.npmjs.com/package/@tanrei/react) wraps the same elements
for React.

**Documentation: <https://tanrei.chnotchy.com/getting-started/web/>** — and a page for every component, with its
props, states, keyboard and accessibility, in six languages.

## Install

```sh
npm install @tanrei/web
```

## Use

```js
import '@tanrei/web/tokens.css';   // the default system's tokens, once, as early as possible
import '@tanrei/web';              // the elements the default system ships; or one at a time: '@tanrei/web/components/button'
// on a preset, its entry instead: '@tanrei/web/<id>' (m3-like, m3-expressive-like, cupertino);
// every element of the package: '@tanrei/web/all'
```

```html
<tanrei-button variant="filled">Deploy</tanrei-button>
<tanrei-button variant="outlined" size="small" disabled>Cancel</tanrei-button>
```

The tokens are in a cascade layer (`tanrei.tokens`), so your own styles always win. The `@tanrei/web/…` specifiers
are the package's `exports`, resolved by a bundler (Vite, webpack, esbuild). Without one, serve the package's `dist/`
and link the files by path; `tanrei.bundle.js` is one self-contained module, Lit included, that registers every
element:

```html
<link rel="stylesheet" href="/node_modules/@tanrei/web/dist/tokens.css" />
<script type="module" src="/node_modules/@tanrei/web/dist/tanrei.bundle.js"></script>
```

**Your product's words.** Tanrei ships no interface text of its own: the text of a requirement tag, the name of a close
button and the like are yours. Give them once, per language, or on each element.

```js
import { setWords } from '@tanrei/web';

setWords({ requiredText: 'Required', optionalText: 'Optional', closeLabel: 'Close' });
```

## Systems, themes and contrast

The default system is `tanrei`. Three presets ship beside it — `m3-like`, `m3-expressive-like` and `cupertino` — and a
product's own design system, built from one layer file with [`@tanrei/cli`](https://www.npmjs.com/package/@tanrei/cli)
(`tanrei build`), works the same way: one more stylesheet, scoped to `[data-tanrei-system="<id>"]`. Put the attribute
on `<html>` or on any subtree; several systems can live on one page.

```js
import '@tanrei/web/systems/m3-like.css';
```

```html
<section data-tanrei-system="m3-like">…</section>
```

What each shipped system ships is listed in `@tanrei/web/systems/<id>.components.json` (`tanrei` for the default): its
components, each with its element or class and the module that registers it, and those it does not have, with what to
use instead.

`data-tanrei-theme="light|dark"` and `data-tanrei-contrast="medium|high"` choose the scheme the same way, on the root
or on a subtree. Every color pair of every scheme is checked for contrast when the tokens are built.

## Stylesheets for your own markup

Some components are your own HTML with a class or a light-DOM element around it, so they are drawn before any script
runs. Import the stylesheet of each one you use (or link `dist/<name>.css`):

| Stylesheet | Draws |
|---|---|
| `icons.css` | `.tanrei-icon`, an icon from the system's icon font |
| `text.css` | `.tanrei-text-<role>`, the sixteen text styles |
| `prose.css` | `.tanrei-prose`, long-form text (rendered Markdown, a CMS's content) |
| `link.css` | `.tanrei-link`, a text link on your own `<a>` |
| `shape.css` | corner smoothing on your own boxes |
| `code.css` | `.tanrei-code`, `<tanrei-code-block>` and `<tanrei-copy-button>` |
| `steps.css`, `timeline.css`, `previous-next-links.css` | your own ordered lists and `nav` |
| `table.css`, `description-list.css`, `figure.css`, `accordion.css`, `tree-view.css`, `table-of-contents.css` | the element around your own `<table>`, `<dl>`, `<figure>`, `<details>` and lists |
| `app-shell.css`, `page-header.css`, `breadcrumbs.css`, `link-card.css` | a page's frame, its header, its trail and its cards |
| `avatar.css`, `callout.css`, `empty-state.css`, `skeleton.css`, `menu.css`, `menubar.css` | those components, before their elements are defined |

`tanrei.css` is every stylesheet of the package in one file — the default system's tokens, these, and `base.css` (the
page on the surface, its text on-surface in the body face, no margin on `<body>`); a preset's `systems/<id>.css` is not
in it.

## Fonts

Tanrei references fonts by name and bundles none. Make the families your system names available, with `@font-face`
or a font service, under exactly those names; `tanrei build` lists them. For the default system: `Inter`,
`Noto Sans JP`, `Noto Sans`, `Roboto Mono`, and `Material Symbols Rounded` for icons (use `font-display: block` for
the icon font, so that an icon never flashes as its name).

## Editors and tools

The package ships its [custom elements manifest](https://custom-elements-manifest.open-wc.org/)
(`custom-elements.json`, the `customElements` field of `package.json`): editors and tools read every element's
attributes, properties, events, slots and CSS parts from it.

## How it is built

The record of how each element is built and why — every element's behaviour in detail, the web's limits, the
builder's guides for a new component, the tests — is
[`IMPLEMENTATION.md`](https://github.com/chnotchy/tanrei/blob/main/packages/web/IMPLEMENTATION.md) in the repository.
It is not part of the package.

## License

Apache-2.0. The package carries its `LICENSE` and `NOTICE`.
