# @tanrei/web

<!-- tanrei:status -->
<!-- Written by `pnpm generate` (packages/tools/src/readme.js) from the specs and tanrei.config.json: edit those, not this block. -->
> **Prerelease.** `0.1.0-next.0` is published under the npm dist-tag `next`: until `0.1.0`, install `@tanrei/web@next`. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, with no deprecation period first, and its changeset says what broke.

**Components:** 13 alpha · 83 lagging (*alpha*: implemented and tested; the API may change · *lagging*: an implementation exists but has not caught up with the current spec). The [component status matrix](https://github.com/chnotchy/tanrei/blob/main/docs/status/STATUS.md) has each one, computed from the repository.

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

### ARIA on a component

A control whose role is carried by a native element inside it (`tanrei-button`, `tanrei-checkbox`,
`tanrei-text-input`, `tanrei-select` and the others whose spec says so) takes the `aria-*` attributes you put on it and
exposes them on that element. To keep the control one node for assistive technology, it **moves** each of them to the
`data-aria-*` attribute of the same name:

```html
<tanrei-button aria-current="page" aria-describedby="hint">Inbox</tanrei-button>
<!-- becomes -->
<tanrei-button data-aria-current="page" data-aria-describedby="hint">Inbox</tanrei-button>
```

- Select it by the moved name: `tanrei-button[data-aria-current="page"]`. `getAttribute('aria-current')` on it is
  `null`, and so is the `ariaCurrent` property; read `data-aria-current`.
- Removing the `aria-*` attribute you set (`removeAttribute`, `toggleAttribute`, or a React, Vue or Lit binding set to
  nothing) takes the moved value away, and so does setting its ARIA property to `null` (`el.ariaLabel = null`,
  `el.ariaDescribedByElements = null`, Lit's `.ariaLabel=${nothing}`); you may also remove `data-aria-*` yourself.
- An id reference (`aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-details`, `aria-errormessage`) must
  name an element in the same tree as the control, or in a tree around it (the shadow root of a component that holds
  it), never inside another component's shadow root. It follows the element as it is added, removed or changed.
- `aria-errormessage` is read with the description while the control is invalid (`aria-invalid="true"`).
- `aria-hidden` stays on the control: it hides the whole control.
- What the control says itself — a toggle's `aria-pressed`, a checkbox's `aria-checked`, a destination's
  `aria-current`, `aria-disabled` — moves too and is not exposed; each spec names them. A debug build reports each one
  you set, once (`console.warn`, citing the spec's sentence of this rule). A composed field (`tanrei-text-field`,
  `tanrei-select-field` and the others) passes the rest on to its control, and a checkbox group or a radio group to
  the group of its field group, but its name is its `label`: `aria-label` and `aria-labelledby` on it are reported and
  not exposed. So it is for a field group, a chat composer and a file upload, on their group. An embedded text input
  takes its name, its description and its states as props alone.
- A navigation drawer exposes what you write on it on its navigation landmark, or on its dialog while it is a modal
  drawer that is shown; a tab view on the tab list of the row it draws. A tab view linked to tabs placed elsewhere
  draws no row, so what you write on it reaches nothing and is reported: write it on the linked `tanrei-tabs`.
- The surfaces expose it on their dialog, or their region while they are not modal: the dialog, the modal layer, the
  image preview, the side sheet, the bottom sheet, the date-time picker and the popover. The breadcrumbs, the
  pagination and the table of contents expose it on their navigation landmark, a tag group on its list, and a handle
  on its separator or its button (its `aria-disabled` and `aria-expanded` are its own). A calendar, a code block and a
  file picker expose it on their group, which each one becomes while it has a name: its `label`, or the one you give.
- Where a control's `label` is empty, the `aria-label` or the `aria-labelledby` you give it is its name, and a debug
  build does not report it as unnamed. Where its `label` is set (or the label of the Field that frames it), that label
  is its whole name: your `aria-label` and `aria-labelledby` are kept out, on the controls named by their content (a
  chip, a main action button) too.
- An item whose host has a role of its own keeps what it says there: a navigation destination is a list item, so its
  `aria-posinset` and `aria-setsize` stay on its host, and what you write moves to its link or its button. A tab's
  host is the tab itself, so nothing written on a `tanrei-tab` is moved.
- Playwright sees the name and the description: `getByRole({ name })`, `getByLabel()`, `ariaSnapshot()` and
  `toHaveAccessibleDescription()`. Its own computation does not follow the element references a shadow root needs, so
  the control also gives its native element the name's text and keeps a hidden copy of the description's text in its
  shadow root. `toHaveAccessibleErrorMessage()` reads nothing: the error message is part of the description.

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
