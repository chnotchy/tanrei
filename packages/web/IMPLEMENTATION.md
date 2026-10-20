# @tanrei/web — how it is built

> The implementation notes of `@tanrei/web`: how each element is built and why, the web's limits, the builder's guides and the tests. The package's users read [`README.md`](README.md) and the documentation site; this file stays in the repository and is not published. A comment in the source that cites "README" and a section name means a section of this file.

Tanrei on the web: the design tokens as CSS custom properties, and Web Components (Lit) that read nothing else.
React bindings are generated from this package's custom elements manifest (`@tanrei/react`).

```js
import '@tanrei/web/tanrei.css';   // every stylesheet below in one file, with the page's base; or one by one:
import '@tanrei/web/tokens.css';   // the default system, on :root
import '@tanrei/web/base.css';     // optional: the page on the surface, its text on-surface in the body face, no margin on <body>
import '@tanrei/web';              // the elements the default system ships; or one at a time: '@tanrei/web/components/button'
// on a preset, its entry instead: '@tanrei/web/<id>' (m3-like, m3-expressive-like, cupertino);
// every element of the package: '@tanrei/web/all'
import '@tanrei/web/icons.css';    // optional: .tanrei-icon
import '@tanrei/web/text.css';     // optional: .tanrei-text-<role>
import '@tanrei/web/prose.css';    // optional: .tanrei-prose — long-form text (rendered Markdown, CMS content)
import '@tanrei/web/link.css';     // optional: .tanrei-link — a text link, a class on your own <a>
import '@tanrei/web/shape.css';    // optional: corner smoothing on your own boxes
```

```html
<tanrei-button variant="tonal">Deploy</tanrei-button>
```

Those specifiers are the package's `exports`, resolved by a bundler. A browser does not resolve a bare specifier in
`<link href>` or `<script src>`: without a bundler, serve `node_modules/@tanrei/web/dist/` and reference the files
by path — `dist/tokens.css`, `dist/icons.css`, `dist/text.css`, `dist/prose.css`, `dist/link.css`, `dist/table.css`, `dist/app-shell.css`, `dist/page-header.css`, `dist/shape.css`, `dist/callout.css`, `dist/empty-state.css`, `dist/menu.css`, `dist/menubar.css`, `dist/skeleton.css`, `dist/avatar.css`,
`dist/systems/<id>.css`, and `dist/tanrei.bundle.js`, a self-contained ES module (Lit included) that registers every
element:

```html
<link rel="stylesheet" href="/node_modules/@tanrei/web/dist/tokens.css" />
<script type="module" src="/node_modules/@tanrei/web/dist/tanrei.bundle.js"></script>
```

A preset (or a product's own layer, built with `tanrei build`) is one more stylesheet, scoped to
`[data-tanrei-system="<id>"]`. Put the attribute on `<html>` or on any subtree; several systems can live on one page.
`data-tanrei-theme="light|dark"` and `data-tanrei-contrast="medium|high"` work the same way.

```js
import '@tanrei/web/systems/m3-like.css';
```

```html
<section data-tanrei-system="m3-like">…</section>
```

What each shipped system ships is listed in `@tanrei/web/systems/<id>.components.json` (`tanrei` for the default): its
components, each with its element or class and the module that registers it, and those it does not have, with what to
use instead. A tool that suggests a component reads that list.

### A page that changes its tokens at run time

A change of theme, contrast or system on the root styles the whole page again: every element inherits the ten thousand
custom properties `tokens.css` declares there. That costs a few tens of milliseconds for 2,000 elements in every engine
(`src/styles/restyle.perf.test.ts` holds it) — unless the document has a **registered custom property** (an `@property`
rule, or `CSS.registerProperty()`: one is enough, used or not) AND the page's own stylesheet has one of two shapes
(1,000 plain elements, in ms):

| The page's own sheet has | Chromium | Firefox | WebKit |
|---|---|---|---|
| nothing of the kind | 12 | 9 | 9 |
| `* { transition-duration: 0.01ms !important }` (the usual reduced-motion reset), and a property is registered | 694 | 28 | 676 (where it inherits; 14 where none does) |
| the same reset, and no property is registered | 31 | 25 | 17 |
| the same with `0s`, and a property is registered | 12 | 12 | 676 (where it inherits) |
| `* { transition: color 1s }` (a transition starts on every element), and a property is registered | 689 | 18 | 8 |
| the same, and no property is registered | 24 | 17 | 11 |

**What the package registers.** `tokens.css` registers nothing, and no element a shadow root draws needs a registered
name — the Switch draws its progress by real properties, the Calendar writes its own — so a page of the tokens and the
elements has none (`src/styles/registered-properties.test.ts` holds it in three engines): the reset costs it nothing,
and neither does a transition that starts on every part (300 buttons at a change of contrast: 44 ms in Chromium, 278
while the tokens registered properties). The stylesheets that draw a component where no script runs register nothing
either — the link's, prose's, the accordion's and the tree view's did, twelve names, and a page of prose is most pages:
a change of contrast on 2,000 elements of mixed components with links and prose took Chromium 370 ms where motion is
not reduced, and takes 46; the same page with ten trees of 21 rows on it took 584 ms, and takes 85. So **no
stylesheet of the package has an `@property` rule and no script of it registers a property**
(`src/styles/registered-properties.test.ts`). What a registered name did is done without one:

| It was registered for | Now |
|---|---|
| a line's height as a length, so that a part whose font is its own (a glyph, a task's mark, a trailing text) can centre itself on the first line of its parent's text | the part says `1lh` in its own `line-height` — there the unit is the PARENT's line, as a length — and reads it back as its own `1lh`; a glyph's one line of text, then taller than its box, is centred on the box by a flex container |
| a state's color changing over the state motion under a held press (LNK-11) | the background's own transition |
| the hold of a press that no script answers (LNK-8, ACC-21, TOC-20, BRC-18, TBL-37, PNL-10) | the pressed color is an image of one color, and the state's color under it is clipped away (`background-clip: border-box, text`), both said by two unregistered names that step back after press-hold (`transition-behavior: allow-discrete`); the two properties have no transition, so nothing fades while the press is held. The hold ends in a step |
| the accordion's clock, whose transition the element hears | an unregistered name that changes in one step over the disclosure motion |
| the tree view's depth as a length, computed once where it is set | the sum as it is written, one `calc()` longer a level, handed down in two unregistered names (a list adds an indent, an item hands it on) and computed where a real property reads it |
| a length the tree view's element reads from script (the indent of a level, the least width of a chevron's hit area) | said in a real property that draws nothing on the tree — `object-position`, which places the content of a replaced element and of no other — and read from its computed value |

**Chromium pays for any registered property**, and WebKit for one that inherits: a page that registers a property of
its own, or loads another library that does, is in the first table's second and fifth rows. So, for such a page:

- **Do not give a duration to a transition of every property on elements wholesale.** `transition-property` is `all`
  until a rule says otherwise, so the usual reduced-motion reset — a duration alone, on `*` — makes every element one
  that transitions everything, and Chromium then goes through each such element's custom properties at every restyle
  (WebKit too, where a registered property inherits): 0.7 ms an element, 70 s for a page of 9,000. Say which
  properties end instead — in a reset, `transition-property: none !important` (9,000 elements: 0.09 s in Chromium,
  0.05 s in Firefox, 0.23 s in WebKit) — and name the properties of any other transition (`transition: opacity …`,
  never `transition: all …`). No stylesheet of the package has such a rule, and the components end their own motion
  under `prefers-reduced-motion` themselves: a reset has nothing to add inside them, and does not reach into a shadow
  root.
- **A transition that starts costs the same once**, in Chromium: an element whose colour is transitioned starts one
  when the theme changes. The components' own state transitions do (a change of contrast on 2,000 elements of mixed
  components on a page with a registered property: 0.3 s in Chromium where motion is not reduced, 0.02 s where it is;
  0.04 s on a page with none), which is why such a page should not add a colour transition to everything it draws.
- **Register no custom property that inherits**, if you register any: hand a computed value down in a second,
  unregistered name (`--line: 1lh; --line-for-children: var(--line)`).

A page that has no registered property needs none of the three — but they cost nothing to follow, and the day a
library registers one, the page that follows them does not notice.

And in every engine, whatever is registered:

- **A single token set on the root from script is slow in WebKit** — `documentElement.style.setProperty('--tanrei-…', v)`
  takes 2 to 10 s for 1,000 to 2,000 elements when the token is one the root already declared: the root's set of custom properties is compared
  with the one before, element by element, until the first value that differs. A set of another size is not compared.
  So change the number of names with the write — add a name of your own if it is absent, remove it if it is there:

  ```js
  const root = document.documentElement.style;
  root.setProperty('--tanrei-comp-menu-surface-min-width', '20rem');
  if (root.getPropertyValue('--changed')) root.removeProperty('--changed');
  else root.setProperty('--changed', '1');
  ```

  `setTokens(tokens, { on })` of `@tanrei/web` (`src/set-tokens.ts`) writes the tokens this way: each write also adds or
  takes off names of its own (`--tanrei-tokens-written-<n>`), so the number of names always changes and an element holds
  a few at most. 2,000 elements: 0.08 s with it, 9.9 s without. (A write that itself adds a name the root did not declare, or takes
  one off, changes the number already: toggling a second name with it can leave the number as it was. The package's
  own tests set every root token through one helper, `rootTokens()` in `test/harness.ts`, which adds a new name of its
  own with each write, and one more for each name it takes off.) A component token can also be set one element lower
  (`body`, a wrapper), which is twenty times cheaper there; a system token cannot, because the component tokens that
  read it are computed on the root. A change of `data-tanrei-theme`, `-contrast` or `-system` needs none of this: many values
  differ, and the first is met at once.

A system may leave components, or values of a component's `variant`, out: Tanrei's default leaves out
`<tanrei-segmented-button>`, the presets the navigation bar's `filled`. They still render and
work under it; in a debug build (see `report()` below) each element that system leaves out warns once, when it connects
and when its `variant` changes (AVL-1, the shared sentences of docs/architecture/overview.md). The system's stylesheet
carries the list as `--tanrei-unavailable: "<component> <component>:<variant> …"`, read from the cascade at the
element, so it follows `data-tanrei-system` like every token. The warning names the system from
`--tanrei-system: "<id>"` when the sheet declares it, otherwise from the nearest `data-tanrei-system`, and what the
system uses instead from `--tanrei-unavailable-replacement: "<entry>=<replacement>,… …"` (AVL-2), which the build
writes from the `insteadUse` of the system's components manifest (`fab-menu=main-action-button,bottom-sheet
segmented-button=tabs,radio-button,button-group` in the default system's). A product's sheet from `tanrei build` declares the same three lists in its own scope, worked
out from its layers, so an element under the product's `data-tanrei-system` never reads the default system's from
`:root`. An element another component draws in its shadow root is reported under the element the product wrote, by
its name: `<tanrei-text-field variant="outlined">` reports `variant "outlined" of text-field`, not its text input's.
Every use is recorded (`unavailableUses()`, below), and `setAvailabilityMode('error')` reports it at error level
(AVL-3).

A component that lives in a layer is another matter: `<tanrei-fab-menu>` lives in the m3-like layer, and a system that
does not descend from it (the default, cupertino) has none of its tokens. `@tanrei/web` does not register it; the
entries of the m3-like systems do (`@tanrei/web/m3-like`). Its sheet names it in `--tanrei-unavailable-layer: "<component>=<layer> …"`, and an element
used there warns once in a debug build that it lives in that layer, which the system does not extend. A product on
another system takes it in its own layer with `"components": { "include": [{ "name": "fab-menu", "from": "m3-like" }] }`:
its sheet then carries the FAB menu's tokens, valued with the product's own, and it imports the element's own module
(`@tanrei/web/components/fab-menu`).

What each entry registers is what a system ships: `@tanrei/web` (src/index.ts) the default system's components and
no other, `@tanrei/web/<id>` system `<id>`'s (the main entry and the components only it ships), and
`@tanrei/web/all` every element. The build writes the last two from the systems' components manifests
(scripts/entries.js), with `dist/custom-elements/<id>.json`, custom-elements.json without the modules of the
components system `<id>` does not ship; test/entries.test.mjs holds every entry to its manifest. custom-elements.json
itself lists the public surface: no private or protected member, and no styles' text (custom-elements-manifest.config.mjs).

## Choices of kind (`sys.behavior.*`)

A choice of kind reaches CSS as its **name**, never as the index the token file stores:

```css
--tanrei-sys-behavior-pressed-feedback: overlay | ripple | dim | none;
--tanrei-sys-behavior-focus-style:      ring | glow;
--tanrei-sys-behavior-separation:       divider | gap;
```

They are ordinary inherited custom properties, declared wherever the active system is declared, so they cross shadow
boundaries, follow a runtime switch of `data-tanrei-system`, and do not leak between two systems on a page. Your own
components can read them the way `<tanrei-button>` does:

| How | Use it for | Support |
|---|---|---|
| `@container style(--tanrei-sys-behavior-focus-style: glow) { … }` | anything static — no script, always live | Chromium 111+, Safari 18+, current Firefox (behind `layout.css.style-queries.enabled` before it shipped) |
| `getComputedStyle(element).getPropertyValue('--tanrei-sys-behavior-pressed-feedback').trim()` at the moment of the interaction | anything that already needs script (a ripple needs the point of contact) | everywhere |

Never cache the value and never branch on a system's id. An unknown name is treated as the first value.

### What `<tanrei-button>`, an interactive `<tanrei-card>`, `<tanrei-main-action-button>`, the toggle and items of `<tanrei-fab-menu>`, `<tanrei-chip>`, the days, years and view toggle of `<tanrei-calendar>`, the rows of `<tanrei-list>` and `<tanrei-menu>`, the tabs of `<tanrei-tabs>`, the selectors of `<tanrei-date-time-picker>`, the destinations of the navigation bar and the destinations and group rows of the drawer, the bar and the suggestions of `<tanrei-search>`, the segments of `<tanrei-segmented-button>`, the halves of `<tanrei-button-with-menu>`, the drag handle of `<tanrei-bottom-sheet>` and `<tanrei-handle>` draw

| Choice | Value | On the web |
|---|---|---|
| `pressed-feedback` | `overlay` | the pressed tokens on the whole container at once |
| | `ripple` | the pressed container color (of the current look, for a toggle) as a layer that grows from the point of contact (the center for Enter / Space) over `comp.<name>.motion.feedback-duration` with `motion.state-easing`, clipped to the container shape, inside the outline. It fades over `motion.state-duration` once the press has ended and press-hold has passed — still growing, if the press was short. Label (an icon-only button's icon), outline, elevation, shape and opacity take their pressed tokens at once; the container underneath keeps the color of the state under the press (resting, hovered or focused). Under `prefers-reduced-motion: reduce` the layer appears whole and leaves at once — an overlay |
| | `dim` | the pressed opacity (and pressed label / outline / elevation / shape) on the whole control; the container keeps the color of the state under the press (resting, hovered or focused), no layer is drawn |
| | `none` | nothing changes: every part stays with the state under the press |
| `focus-style` | `glow` | the same two focus colors (`focus-ring-inner`, `focus-ring`) as a soft halo after `sys.focus.offset`, each blurred by its own width; never animated. A transparent outline stays underneath, so forced-colors mode still shows a ring. Read by a style query, and — for browsers without style queries — from the computed value when focus arrives |

### Separation (`sys.behavior.separation`)

How parts that sit side by side inside one component are told apart: by a line where they touch (`divider`, the default)
or by empty space (`gap`). One choice for the whole system, which a component and an instance can each leave:

| Level | Where | On the web |
|---|---|---|
| System | `sys.behavior.separation` | `--tanrei-sys-behavior-separation: divider \| gap`, wherever the system is declared |
| Component | `comp.button-group.connected.separation`, `comp.button-with-menu.container.separation`, `comp.progress-indicator.track.separation`, `comp.meter.track.separation`, `comp.menu.separation` | `--tanrei-comp-<…>-separation`, whose value is `var(--tanrei-sys-behavior-separation)` until a layer (or your own CSS) sets it to a name |
| Instance | the `separation` attribute: `auto` (the default), `divider`, `gap` | the attribute wins over both tokens; any other value is `auto` and is reported in debug builds |

| Component | `divider` | `gap` |
|---|---|---|
| `<tanrei-button-group variant="connected">` | the items touch, square where they meet, a line on each seam; no item draws its outline or its elevation's ring along a seam | the items `connected.gap` apart, `connected.inner-shape` where they face each other |
| `<tanrei-button-with-menu>` | the same, between its two halves | the same |
| `<tanrei-progress-indicator>` | the indicator is drawn on the track, touching it | `track.gap` between the indicator and the track (on a ring at both ends of the arc); the stop indicator on a bar is drawn by its size under either |
| `<tanrei-meter>` | the same as the progress indicator's determinate form | the same |
| `<tanrei-menu>` (and its submenus) | a line of `divider.thickness` between a group and what is next to it, `divider.space` above and below, a separator | `group.gap` of empty space there, no line and no separator |

Each component reads the choice with a style container query on a private property of its host
(`src/primitives/separation.ts`: `separationHost()`, `whenGap()`), so the attribute, a layer that sets the component token
and a system switched on any ancestor are followed at once, with no script and no animation. Its divider form is its
plain rules — divider is the first value, and so what an unknown name draws. Both values are drawn in every browser: one
without style container queries is given the name by the element's script when it renders (`data-separation` on the
element the rules name), which follows a system switched on the document's root (`SystemWatchController`) and the
attribute, but not a token changed on some other ancestor without a render.

### Corner smoothing (`sys.shape.corner-smoothing`; the web's curve)

Not a choice but an amount, `--tanrei-sys-shape-corner-smoothing`, 0–1 with Figma's meaning: 0 a quarter circle, 0.6
the iOS continuous corner (`cupertino`), 1 the most eased. The web has no Bézier corner on a box, only
`corner-shape: superellipse(k)`, and a superellipse at the token's radius is never nearer Apple's corner than a plain
circle is — Apple's curve is as deep as the circle on the diagonal but runs 1.53 r along the edges. So the amount `s`
moves two things at once, both linear and both the identity at 0 (`src/styles/shape.ts`, one rule for every component):

| | at `s` | at 0.6 |
|---|---|---|
| superellipse exponent | `2 + s` → `corner-shape: superellipse(log(2 + s, 2))` | 2.6 |
| radius | `r · (1 + 0.4 s)` | 1.24 r |

Measured in Chromium at 8× on the 180×80 r20 box, at 0.6 the symmetric difference is **9.5 px² from Figma's
three-Bézier construction** (what the amount means, and what Compose and Flutter draw; the floor of the whole
superellipse family is 9.3, a circle is 15.9 away) and **5.7 px² from CoreGraphics'**
`RoundedRectangle(style: .continuous)` (`packages/flutter/tool/continuous_corner_reference.swift`; a circle: 18.2,
Figma's construction itself: 4.6), and 1.4 px² from CoreGraphics on 180×80 r10 and 180×36 r10 (cupertino's button).
Above 0.6 the superellipse family drifts from Figma's construction (22 px² at 0.8, 60 at 1). The tool is
`scripts/measure-corner-smoothing.mjs`. **Progressive
enhancement**: eased where `corner-shape` and `log()` exist (Chromium 139+, WebKit 26.6 — the tests run both);
Firefox has neither and draws the amount at 0, a circle at the token's radius — its test project runs exactly that
branch. **Pills are round.** A radius of at least half the short side is clamped by the browser, so a superellipse
could only change its exponent and would flatten the caps where Figma's construction draws a circle. The build knows
which shape tokens are the full step: next to every comp shape token the CSS emitter writes a companion
`--tanrei-comp-<…>-shape-pill` — `1` when its alias chain reaches `sys.shape.corner.full`, else `0` — and the rule draws
a box whose `--tanrei-corner-pill` is 1 at smoothing 0 (round, radius unscaled) whatever the amount. It follows the
token files; a runtime override of the radius custom property alone does not move it.

`<tanrei-button>` puts `data-tanrei-shape` on its container and names its shape token per state with
`cornerRadius(token)` (`--tanrei-corner-radius` and `--tanrei-corner-pill`); the focus ring and the ripple scale theirs
by the same `--_corner-scale` and inherit the curve, so the shadow, the ring and the ripple follow. `shape.css` is the
same rule for a box of your own (a pill of your own also sets `--tanrei-corner-pill: 1`):

```html
<div data-tanrei-shape style="--tanrei-corner-radius: var(--tanrei-sys-shape-corner-large)">…</div>
```

**Press-hold (BTN-8).** The pressed state is `data-pressed="<feedback>"` on the inner button (`::part(container)`), set on
pointer down and on Enter / Space, with no transition in. It stays for at least `sys.motion.duration.press-hold`
(100 ms by default; it follows the motion dial) even when the press ends within a frame — which a key press and a tap do.
A pointer press lasts as long as the pointer is down, whatever happens to focus (Safari takes focus away from a focused
button on mouse down); a key press also ends when focus leaves, because its key-up will arrive somewhere else.

### A control with a destination is a link

`<tanrei-button>`, `<tanrei-card>`, an action `<tanrei-chip>` and `<tanrei-list-item>` take `href`, `target` and
`target-label` (and, on the web only, `rel` and `download`) — and so do a destination of the navigation drawer and of
the navigation bar and an action of the menu, each with what is its own (their sections: a region does not select a
link by a press; a link item of a menu keeps the menu item role and answers Space). With `href` the element's shadow root holds an `<a href>` in
place of its native button (or of its element with the button role): **the same part, drawn from the same tokens in
every state** — there is no link look — with the link role, so everything a browser gives a link is there: the context
menu, a new tab, the address to copy or drag, the status bar, a crawler that follows it.

```html
<tanrei-button href="/getting-started/">Get started</tanrei-button>
<tanrei-button variant="outlined" href="https://example.com/tanrei" target="new" target-label="opens in a new tab">View source</tanrei-button>
<tanrei-card href="/getting-started/" label="Getting started">…</tanrei-card>
<tanrei-list><tanrei-list-item href="/components/button/">Button</tanrei-list-item></tanrei-list>
```

- **Keys.** Enter activates; Space does what it does on any link (it scrolls the page) and shows no pressed state. A
  modified or a middle click is the browser's.
- **`click`, then the navigation.** `click` fires once, then the browser follows the address — at once, not after
  press-hold. `event.preventDefault()` cancels the navigation: that is how a client-side router takes it.
  `element.click()` follows the link.
- **`target="new"`** is `target="_blank"` with `noopener` added to `rel` (never `noreferrer`: add it through `rel`). A
  control that lays out its own content marks it with the icon set's `open_in_new` — after a Button's label, at a chip's
  inline end, as a list item's trailing icon — mirrored in right-to-left, hidden from assistive technology, and not drawn
  where your own glyph stands there (a Button's trailing icon, an item's `trailing-icon`), on an icon-only Button, or on
  a card. `target-label` is the link's description either way; Tanrei ships no words, and an empty one is reported.
- **Disabled.** The anchor without `href`, with `role="link"` and `aria-disabled="true"`: nothing to follow, copy or
  drag, no `click`. As focusable as the component's disabled form — not at all, or by the arrow keys in a list.
- **No destination.** A toggle Button, a filter or an input chip and an option of a listbox ignore the three props
  (reported). White space is no destination; a `javascript:` address, or one the URL parser rejects, is refused
  (reported) and the control is what it would be without one. A path or a fragment is an address wherever the page was
  loaded from.

### An icon, an icon alone, and toggles

Icon button is a form of Button: a `<tanrei-button>` with an icon in the `icon` slot and no label.

```html
<tanrei-button variant="text" label="Share"><span slot="icon">share</span></tanrei-button>
<tanrei-button variant="filled"><span slot="icon">add_shopping_cart</span>Add to cart</tanrei-button>
<tanrei-button icon-position="trailing"><span slot="icon">arrow_forward</span>Next</tanrei-button>
<tanrei-button variant="text" toggle label="Favorite"><span slot="icon">favorite</span></tanrei-button>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `iconPosition` / `icon-position` | `leading` \| `trailing` | `leading` | the icon's side of the label, in the reading direction; reflected |
| `width` | `default` \| `narrow` \| `wide` | `default` | how wide an icon-only button is: as wide as it is high (32 / 40 / 56), its glyph and `container.padding-inline-narrow` on each side of it — 28 / 32 / 32 in the default system, whose inset is 4 at every size — or `container.width-wide` (40 / 52 / 72) of its size. Ignored with a label; anything else is `default` and reported (BTN-21); reflected |
| `toggle` | boolean | `false` | a two-state button: activation switches `selected` and fires `change`; reflected |
| `selected` | boolean | `false` | whether a toggle is on — ignored unless `toggle`; reflected |
| `label` | string | `""` | the accessible name: required for an icon-only button; beside a drawn label it is the whole name in place of the drawn text, which it must contain (BTN-16; see "The name") |
| `href` | string | `""` | the destination — a URL, a path or a fragment. Not empty, the button is a link and not a button: an `<a href>` in place of the `<button>`, Enter and not Space (BTN-22; see "A control with a destination is a link"); ignored while `toggle`. White space is none; a `javascript:` address or one that cannot be read is refused and reported (BTN-26) |
| `target` | `same` \| `new` | `same` | where it opens: here, or a new tab or window (`target="_blank"` with `noopener`). `_self` and `_blank` are read as those two; anything else is `same`, reported. Ignored without `href` |
| `targetLabel` / `target-label` | string | `""` | what is read after the link's name while `target` is `new` ("opens in a new tab") — your words; empty is reported (BTN-24). Ignored otherwise |
| `rel`, `download` | string \| `null` | `null` | web only: forwarded to the anchor (`target="new"` adds `noopener` to `rel`). Ignored without `href` |
| `type` | `button` \| `submit` \| `reset` | `button` | web only: what a press does to the button's form — nothing, ask it to submit, ask it to reset (BTN-27, BTN-28). Anything else is `button`, reported; a toggle and a link ignore it, reported (BTN-33). Reflected, the default not |
| `name`, `value` | string | `""` | web only: the pair sent with the form when this button submitted it; nothing while `name` is empty (BTN-31) |
| `form` (attribute) | a form's id | — | web only: the form the button belongs to where it stands outside it; the platform's own attribute. The `form` property is read-only and returns the form (BTN-29) |

`change` is a `CustomEvent<{ selected: boolean }>`, bubbling: `selected` switches first — a `click` listener already sees
the new value — then `click` goes through the page, then `change` fires (the order of a native checkbox's; `afterClick()`).

**The icon** is the ligature text of a glyph of the system's icon set, drawn in the `::part(icon)` box at `icon.size`
beside a label and `icon.size-without-label` alone, in the family and fill of the selection (filled only when `toggle`
and `selected` are both true), at `sys.icon.weight`. A slotted `.tanrei-icon` follows the same size, family and fill; a
slotted `<svg>` or `<img>` fills the box. In a right-to-left layout a glyph the icon set flags (`arrow_forward`,
`chevron_right`) is mirrored in its own box, `data-mirror` on the slotted element deciding for one use, and an `<svg>` or
`<img>` never (BTN-19; see Icons). Alone, the icon takes the variant's `icon.color`, and the button is as wide as
`width` names: as wide as it is high by default, so `corner.full` draws a circle, and a capsule at the narrow and the
wide width (a radius is capped at half the shorter side). The height never changes with the width, and the hit area
still reaches the minimum target: a narrow button is not drawn wider for it (BTN-12, BTN-21). The narrow width is the
glyph's box (`icon.size-without-label`) and `container.padding-inline-narrow` on each side of it, and nothing more: the
button has no narrow width token, so a narrow button follows its glyph wherever a design system re-sizes it, and the
container, its state layer, its ripple and its outline are a capsule of that width. In the default system the inset is
`sys.space.space50` (4) at every size, the least room that keeps the glyph clear of the capsule's edge — 28 / 32 / 32;
a design system that wants its narrow buttons to differ more by size gives a size a larger inset (the presets keep the
28 / 32 / 48 they drew).

**Padding (BTN-11).** Beside a label, the padding on the icon's side is its own token —
`container.padding-inline-start-with-icon` for a leading icon, `-end-with-icon` for a trailing one — a step tighter than
the plain padding in the default system (12 / 12 / 16 against 16 / 16 / 24); the label's side keeps the plain padding.

**Semantics.** `aria-label` from `label` whenever it is not empty, and `aria-pressed="true|false"` only
when `toggle`. The look follows `aria-pressed`: no attribute paints the variant's own parts, `false` its `unselected.*`
parts, `true` its `selected.*` parts, so what is drawn and what is announced cannot disagree. An icon-only button with an
empty `label`, and a button with neither label nor icon, are reported in debug builds (BTN-16, BTN-17).

**The name (BTN-16).** `label` is the whole accessible name whenever it is given, on the one native
element (`aria-label`): beside a drawn label the text stays drawn exactly as without it and is not exposed a second time.
That changes a page that exists: a Button that draws a label and also carries `label` was named by its text and is now
named by `label`. The name must contain the drawn text — compared with the ends trimmed, runs of white space as one and
without case — so that a person who says the word they see is heard; a debug build reports one that does not, once, and
that report is all the button does: the name stays what was given, never the drawn text and never the two joined.

```html
<tanrei-button variant="text" size="small" label="Reset: Spacing">Reset</tanrei-button>
```

**In a form (BTN-27 … BTN-33).** The element is form-associated: it is listed in `form.elements` at its
place whatever its `type` (being listed sends nothing), its `form` is the platform's — the form around it, or the one
the `form` attribute names by id — and a `<fieldset disabled>` around it disables it (not a link button). The fieldset's
part is read from the platform where the button renders (`:disabled`, less the element's own attribute, which follows the
property one step late), so a Button enabled by its property is enabled by that one update and can take focus after it;
`formDisabledCallback` (through `takeFormDisabled()`) only asks for the next render.

- **Disabled while it holds focus.** The `disabled` attribute is the platform's word that a form-associated element is
  disabled, and Chromium takes focus from such an element inside the call that writes it — a `focusout` with no related
  target, before any code of the page could have moved focus on — where the other engines, and every engine for the
  platform's own `<button>`, take it at the next frame. So the attribute alone waits (`waitsWhileFocused()` in
  `src/primitives/disabled-while-focused.ts`): while the Button holds focus, writing `disabled` — the property's
  reflection, the page's `setAttribute()` or `toggleAttribute()`, a template's `?disabled` — is put off until focus has
  left the Button, and no longer than the next frame. Nothing else waits: the property is true at once, the native
  button inside is disabled at once, so the Button emits nothing, takes no key, is passed by Tab and is drawn and exposed
  as disabled from that update on. A page or a container that moves focus on within the turn hears that move and nothing
  else, in every engine; one that does not hears focus leave at the next frame, as from a `<button>`. For that frame, and
  only for a Button that held focus, `hasAttribute('disabled')` and the host's `:disabled` are still false: read
  `element.disabled`. A Button enabled again before the frame never carried the attribute. Not covered: a `<fieldset>`
  disabled around a focused Button is the platform's alone. Every other form-associated element does the same
  (`disabledWaitsWhileFocused(Class)`, and `FocusedStop` for a stop that is a `tabindex` of the element's own: the
  select's container, the slider's handle, the radio button's input); `src/primitives/form-disabled.test.ts` holds a row
  for each.

```html
<form id="profile">
  <tanrei-text-field label="Name" name="name" required></tanrei-text-field>
  <tanrei-button type="reset" variant="text">Clear</tanrei-button>
  <tanrei-button type="submit" name="intent" value="save">Save</tanrei-button>
</form>
<tanrei-button type="submit" form="profile" name="intent" value="publish">Publish</tanrei-button>
```

- **The press.** `click` goes through the page first (`afterClick()`); cancelled, nothing more happens. Then a submit
  button appends a hidden `<button type="submit">` of the platform's own to itself — a child in a slot the Button does
  not have, so it is drawn nowhere, naming the same form where the Button names one — with its `name` and `value`, calls
  `form.requestSubmit()` with it and removes it before returning — also when a listener throws — so the validation, the
  `submit` event, `event.submitter` and `new FormData(form, event.submitter)` are the platform's, and the pair is sent
  at the Button's own place among the form's entries, as the platform's own button's is. For the length of that
  dispatch the form has one control more, and `event.submitter` is that button, not the Tanrei element. A reset button
  calls `form.reset()`. The submission is not held for the press-hold time. Without a form, a submit or a reset button
  emits `click` and is reported at that press (BTN-29).
- **The default button** of a form is its first submit button in document order — the platform's own or a
  `<tanrei-button type="submit">`, never a toggle or a link that carries the type. Enter in a control of the form
  presses it (`pressDefaultButton()` in `src/primitives/default-button.ts`, which the text field, the number field, the
  color field, the combobox, the one-time-code input, the search and the selection primitive of the checkbox, the radio
  button and the switch call in place of `form.requestSubmit()`): its `click`, then the submission with its
  name and value; while it is disabled, nothing. Only a form with no submit button is asked directly.
- **The platform's own controls** know only the platform's buttons, and what each does with Enter is its engine's own:
  which controls submit (a `<select>` and a range input in Chromium and WebKit, not in Firefox), with which modifier
  keys (Alt, Control and the command key in Firefox only), never for the Enter that ends an input method's composition
  or takes a suggestion, and always after the field has committed what was typed — `change`, then the button's
  `click`, then `submit`. None of that is listed in Tanrei: the browser is left to decide. While a form holds a Tanrei
  submit Button, its tree has one `keydown` listener in the capture phase (`watchNativeInputs()`; on the window for a
  document, on the shadow root for a form inside one). When Enter goes down in a native control of such a form —
  inside it, or naming it by the `form` attribute from outside — and the form's default button is Tanrei's, that
  Button holds, for the length of the key, a hidden `<button type="submit">` of the platform's own in a slot it does
  not have: the form's first submit button exactly when the Button is, disabled while the Button is. The browser
  presses it exactly where, when and whether it would press a default button of its own, and not at all while it is
  disabled — in a form of one field too. That press is stopped at the window before a listener of the page hears it,
  its own submission is cancelled, the hidden button is removed, and the Button's `click()` is called: its `click`,
  then its own submission. So a page hears, in every engine, what it hears with the platform's own default button:
  the same events in the same order, the same entries, the same value read from the field in a `submit` listener
  (`src/primitives/default-button.test.ts` holds each against a twin form). A hidden button the browser did not press
  is removed at the key's `keyup`; one is held again for each repeat of a key kept down. What a page can still see of
  it: `form.elements` holds one control more between that `keydown` and the press (or the `keyup`), a
  `MutationObserver` on the Button sees a child come and go, and a capture listener the page added to the window
  before the form's first Tanrei submit Button was connected hears the stopped press as a click on a hidden button
  (for a form in a closed shadow root, any capture listener outside the root hears a click on the root's host).
- **Not read:** `formaction`, `formmethod`, `formenctype`, `formtarget`, `formnovalidate`. The native `<button>` in the
  shadow root stays `type="button"`: no form can own it there.
- **React.** `type`, `name` and `value` are properties. `form` is the id of a form and is written as the attribute: the
  element's `form` property has only a getter, which neither `@lit/react` nor React can assign.

The web is `lagging` on this revision of the spec: the fixtures, tests and baselines of the icon-only form and the toggle
are not built yet.

## Composed elements (W1 to W14)

A composed component — a text field, a select field, a one-time-code field — is on the web **a custom element whose
shadow root holds its members' own custom elements**, by their tags. It copies nothing a member draws, writes none of
a member's custom properties and reads none of its tokens. Its rules are the clauses W1 to W14 (tests cite them; the
table below names where each is kept); this section is how to build one without reading
`<tanrei-one-time-code-field>`, the first. `<tanrei-file-upload>` is the second that is built: two kinds of member —
one file picker, and a list of file items — and no value member, so it extends `ComposedElement` and is
form-associated by its own `ElementInternals`.

**What to call** (`src/primitives/composed.ts`, `forward.ts`, `form-says.ts`, `default-button.ts`):

| | What it is | Clause |
|---|---|---|
| `ComposedElement` | The base class of every composed element. Gives: `focus()` and `blur()` passed to `control`; a click that arrives on the host itself (a page's `<label for>`) focusing the control; `autofocus` on the host; `pass(name)` for a slot passed on; `updateComplete` that waits for the members; the frame's "ask again" passed to the members (`FIELD_CONTROL`); the debug report for an ARIA name on the host (`hostNameSentence`). The subclass says `control`. Styles: `[composedHost, hiddenHost]` — the host is a block | W1, W7, W8, W9 |
| `ComposedControl<V>` | `ComposedElement` with a value member. Gives: `memberValue(initial)` and `giveValue(value)` for the `value` accessor; `name`; `form`, `validity`, `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()`; reset (`firstValue()`: the `value` attribute), restore passed to the member, `formDisabled` (a disabled fieldset, or the host's own attribute). It repeats on its own `ElementInternals` what the value member tells its own. The subclass says `valueMember` and writes `static formAssociated = true` | W5, W6 |
| `forward(this, NAMES)` | A directive on a member's tag: each named property of the element set on that member, as a property, on every render | W2 |
| `exported(Member, collisions?)` | `{ attribute, names }`: the member's `exportparts` and the names `::part()` can then use, made from the member's `static parts`. For a part name two members share: `{ label: { as: 'field-label', bare: true } }` — the prefixed name always, the bare one only where the spec has the sentence by which the two are never drawn at once | W4 |
| `FormSays` | What a form-associated **member** calls where it called `internals.setFormValue()` and `internals.setValidity()`: `says.value(value, state)`, `says.validity(flags, message, anchor)`. Each does that call, and tells the element composed around it | W6, items 2 and 3 |
| `formOf(this, this.form)` | What a **member** that submits on Enter asks for its form: its own, or — in the shadow root of a form-associated element — that element's | W6, item 7 |
| `memberUpdated()` | A hook of `ComposedControl`, called after each word the value member tells its form — after each of its updates. An element whose spec has `fills` sets the other member's property there, from what the value member holds (the text field: `field.countText = input.countText`) | W14, `fills` |

**What a member must offer** — three small changes to its element, and none to its spec; outside a composed element
it behaves exactly as before:

1. `static readonly parts: readonly string[]` — its documented parts, once, marked `@internal`, equal to its `@csspart`
   lines (`src/primitives/composed.test.ts` holds the two equal for every class that has the list).
2. Where it is form-associated: `private readonly says = new FormSays(this, this.internals)`, and every
   `setFormValue` / `setValidity` through it. Its `value` is a property a reader can read back at once, and it holds
   its new value **before** it dispatches (W5 rests on that: the element's `value` is the member's at every moment).
3. Where it submits on Enter: `pressDefaultButton(formOf(this, this.form))`.

Its events are composed, bubbling `CustomEvent`s already (every Tanrei control's are): they leave the composed
element's shadow root by themselves, with the composed element as their target. A control inside a frame asks with
`tanrei-field-connect` as it does in a product's markup; the frame member answers and stops it. The composed element
takes no part in that exchange.

**The element**, in full, for a frame and one control:

```ts
const FIELD = ['label', 'labelHidden', /* … every prop from the Field, but `disabled` */] as const;
const INPUT = ['value', /* … every prop from the control */] as const;
const FIELD_PARTS = exported(TanreiField);
const INPUT_PARTS = exported(TanreiTextInput);

/**
 * First paragraph: what it is, and that it is built from `<tanrei-field>` and `<tanrei-text-input>`.
 *
 * @tag tanrei-text-field
 * @slot label-icon - => tanrei-field
 * @csspart field - The frame: the `<tanrei-field>` it is built from.
 * @csspart text-input - The control: the `<tanrei-text-input>` it is built from.
 * @exportparts tanrei-field
 * @exportparts tanrei-text-input
 * @attr {string} form - …
 * @fires input - => tanrei-text-input
 */
export class TanreiTextField extends ComposedControl<string> {
  static formAssociated = true;
  /** @internal */
  static readonly parts: readonly string[] = ['field', 'text-input', ...FIELD_PARTS.names, ...INPUT_PARTS.names];

  // In place, exactly as the member declares each: the same attribute, type and reflection.
  static override properties: PropertyDeclarations = { label: { type: String }, /* … */ value: { type: String } };

  /** @from tanrei-field.label */
  label = '';
  /** @from tanrei-field.disabled */
  disabled = false;

  /** @from tanrei-text-input.value */
  get value(): string { return this.memberValue(''); }
  set value(value: string) { this.giveValue(value); }

  protected override readonly hostNameSentence = 'TXF-1';
  protected override get valueMember() { return this.renderRoot?.querySelector<TanreiTextInput>('tanrei-text-input') ?? null; }

  protected override render() {
    return html`<tanrei-field part="field" exportparts=${FIELD_PARTS.attribute} ${forward(this, FIELD)} .disabled=${this.disabled || this.formDisabled}
      >${this.pass('label-icon')}<tanrei-text-input part="text-input" exportparts=${INPUT_PARTS.attribute} ${forward(this, INPUT)}></tanrei-text-input
    ></tanrei-field>`;
  }
}
```

**The checklist.**

- [ ] The module imports each member's module, so where the element is defined its members are (W1). The shadow root
      holds the members' tags and the component's own parts; no text stands between a frame and its control (the
      frame's control is its one child without a slot).
- [ ] Every prop of the spec with `from` is in `static properties` **in place** with the member's own options, has a
      field with the member's default and `/** @from <member tag>.<property> */`, and is in the list `forward()` is
      given for that member (W2). `disabled` is not in the frame's list: the frame is given `disabled || formDisabled`
      (W6, item 6). A property with no attribute is declared `attribute: false`, as the member declares it.
- [ ] The member's own `label`, `error` and `disabled` are never set where the frame says them (W2).
- [ ] `value` is the accessor above, never a field (W5). A first value that is not the `value` attribute: override
      `firstValue()` (W6, item 4).
- [ ] `static formAssociated = true` is written in the element's class — `src/primitives/form-disabled.test.ts` and
      the React wrappers' test find form-associated elements by it — and the element has an entry in that test's
      `SUBJECTS` and in the list of `packages/react/test/marks.test.mjs`.
- [ ] `part` on each member's tag, named for its component; `exportparts` from `exported()`; `static parts` on the
      element; `@exportparts <member tag>` in the class comment — with the same renames where two members share a
      name: `@exportparts tanrei-field label: field-label, label` (W4).
- [ ] Each event and each slot passed on is in the class comment as `@fires <name> - => <member tag>` and
      `@slot <name> - => <member tag>`; each slot is `${this.pass('<name>')}` among that member's children (W9, W11).
      An event of a member that is not in the spec is stopped at the shadow root, and the spec says so (W5).
- [ ] The shadow root does not delegate focus where the element holds text a press must not act on (W7): leave
      `shadowRootOptions` alone. The host takes no `tabindex`, no role and no ARIA attribute (W8).
- [ ] The element dispatches no event, holds no `FieldProviderController` or `FieldControlController`, writes no
      custom property (W3, W5, W8).
- [ ] `pnpm --filter @tanrei/web generate` — the analyzer's plugin (`custom-elements-manifest.config.mjs`,
      `tanrei-composed-from`) puts each member's own description, type and default in the manifest and stops on a
      source it cannot find (W11); the React wrapper is generated from that (W12), and the member's detail types are
      re-exported from the element's module (`export type { … }`).
- [ ] `test/harness.ts`: a `STAGING` entry that gives the stage the width its twins are drawn at. One entry in
      `DRIVEN` of `src/primitives/composed.test.ts`: how a person causes each event, a value the member changes, an
      instance in which every part is drawn. The tests W13-1 to W13-8 then run for the element — the twins among them:
      the same pixels as the fixture each `twin` names, and the same control to assistive technology, in three engines.
- [ ] The element's own test file cites its own sentences and repeats no test of a member.

**Where the members that hold the value are the product's own children** — a set of checkboxes, of radio buttons —
the element extends `ComposedElement`, not `ComposedControl`: the frame member's own element stands in the shadow
root around a `<slot>`, the value is the element's own, and the form is the element's to tell. Which clauses fit as
written and which were read for that case is "`<tanrei-checkbox-group>`", below; its `DRIVEN` entry gives the product's children as
`children` and carries `placed` (the props that are properties only, the events the web note adds, the part its
member's host is named by, and — `light` — a member that stands among the product's children alone and so is no part
of the element: a radio group's radio buttons). Where such an element's fixtures name twins, W13-7 compares the set
and not one control: what the frame's own element says of the set — its role, the texts that name and describe it,
required, invalid, orientation, disabled — and what each control of the set says of itself, in order, with its checked
state, its position and whether it is the stop; in Chromium the two accessibility trees line by line
(`test/ax-tree.ts`), which hold exactly one group or radio group. `<tanrei-radio-group>` is the first that has them.

**What the three engines do** (Chromium, Firefox, WebKit; each is held by a
test):

- **`autofocus`.** The browser focuses nothing for `autofocus` on a host that is not focusable, and nothing for the
  attribute copied to a control inside a shadow root when the page first loads (a native input in a shadow root is
  focused by one engine of three). So the element gives its control focus itself, once, when it first renders, where
  nothing else has focus — on first load and on insertion alike.
- **The validity anchor.** `setValidity(flags, message, anchor)` takes the native element inside the member, two shadow
  roots down, in all three; `reportValidity()` returns false, fires `invalid` on the element and focuses that native
  element; the form is not submitted. Where the bubble is drawn cannot be read from script.
- **`<label for>`.** A click arrives on the host itself (trusted, its first target the host); the browser focuses
  nothing; the element's listener focuses the control, once.
- **`exportparts` twice.** `label, label: field-label` exports one part under both names in all three.
- **A disabled host.** No `mousedown` and no `click` is dispatched on a disabled form-associated host, whatever is
  pressed inside it; `formDisabledCallback` is called for the host's own `disabled` attribute and for a fieldset's
  alike, and unsetting the one leaves the other (`takeFormDisabled`).

**Splitting a field that draws its own frame: the guide** (the text field, the number field, the color field, the
select and the combobox are built this way). Do it in four steps, each green before the next:

1. **Move, and change nothing drawn.** `git mv` the element's files to `components/<name>-input/`, rename the class
   and the tag, keep the old tag defined for this step (`class TanreiXField extends TanreiXInput {}`), and re-point
   every token the styles read: the box's to `--tanrei-comp-<name>-input-*`, a row's to `--tanrei-comp-field-*` (one
   look, `standard`; a hovered row reads the resting token). `textFieldReference()` in `test/harness.ts` and
   `reference()` in `packages/tokens-build/test/field-frame.test.js` are the mapping. **Prove it with pictures, not by
   reading**: draw every fixture with the bundle and the tokens of the commit before the split and with yours, in
   one browser process, and compare pixel by pixel in three engines (over a copy of the earlier `dist/`; a recorded
   baseline is never updated for it).
2. **The Field's side first**, if your control says something the Field does not hear yet. What exists:
   `FieldSays { drawsLabel, inset, refusal, drawnFocused }` upward (`FieldControlOptions.says`, read by the Field whenever it draws,
   said again through `FieldConnection.said`), `labelHidden` and `requiredMark` downward. A new value is a sentence of
   the Field's spec first (W8's three conditions), then one member of `FieldSays` or `FieldState`, optional, so that a
   control and a frame that do not know it keep working.
3. **Take the frame out of the input.** Delete the label row, the tag, the help, the error text and the drawn count
   from its template and its styles; the host becomes `display: block`. Then:
   - `new FieldControlController(this, { errorCondition: true, named: () => !!this.label.trim(), says: () => … })` in
     place of the one that said `framed: true`; the name is `frame.name(this.label)`, the description
     `frame.description()` after its own, `frame.required`, `frame.invalid`, `frame.disabled`, and for a floating
     label `frame.labelHidden` and `frame.requiredMark`.
   - `inset` as **lengths of your own tokens** (a `var()` or a `calc()` of them resolves where the Field reads it:
     custom properties inherit) — the same sums your box is laid out by. Nothing is measured.
   - The description: what was `aria-describedby` to your own rows becomes hidden elements of your shadow root for
     what you still say yourself (a count) and for what the Field gives; ids cannot cross the roots.
   - `static readonly parts`, `FormSays`, `formOf()`, and `says.value(disabled ? null : value, value)`.
   - **The value before the event.** If your `input` is the browser's own composed event of a native text element, a
     capturing listener on an ancestor hears it before your listener: make `value` an accessor that reads what the
     person has just done to the native element until you have taken it (the text input's `value`, `nativeSeen`,
     `afterEdit()`). If you dispatch your own event, set the value first.
   - `focus()` goes where a press on the box goes — the Field calls it for a press on its label row (FLD-12).
   - `OpenAxesController` and `AvailabilityController` ask for the input's name; `registry.ts` has the input's
     registries (the generated `.d.ts` of a layer names them so).
4. **The composed field**: the template of this section, with `memberUpdated()` where the spec has `fills`. Two
   members with a part of one name: `exported(Member, { label: { as: 'field-label', bare: true } })` on both, the
   same renames in `@exportparts`, `static parts` through a `Set`; the manifest then has the bare name once, with both
   descriptions.

What moves with it, every time: `test/harness.ts` (staging of the input, of the field, and of the Field's item kind —
`itemProps` / `itemContent`; **stage the twins exactly as the composed fixtures are staged**, down to a `lang`
attribute, or the twin test fails on text set for another language); one entry in `DRIVEN` (`allParts` may be several
instances where two parts are never drawn at once); `SUBJECTS` of `form-disabled.test.ts`; the list of
`packages/react/test/marks.test.mjs`; `systems.test.ts`; the ids of `playwright.config.ts`; `tab-view.ts`'s list of
what takes sideways drags; the token-equality tests of the fields not yet split (`textFieldReference`).

The tests: the old file moves with the input and keeps its numbers. A test of a sentence that was retired to the
Field (the label above, the tag, the help, an announced error) is deleted — the Field's own tests hold it, and the
twins hold that the composed field is the pair. A test of a sentence that says something of "the Field that frames it"
puts a Field around the input (`frame()` in `text-input.test.ts`). The composed field's file has only its own
sentences. `field.test.ts` gains a test for each sentence the Field gained.

What to know (each is held by a test):

- A report the Field makes about its control must wait for a control that has not drawn itself: a composed field's
  inner Field asks only after the composed field rendered (`hasUpdated === false` → look again).
- A control that changes what it says in the same event in which focus leaves it (an entry error on blur) is heard by
  the Field before the Field's own `focusout` listener: the Field asks `:focus-within` before it announces.
- A press on text that is not a control, while the input has focus, takes focus from the input (the platform's, as
  for any text of the page). "Does nothing" (FLD-12) is: no focus arrives.
- The Field's requirement tag is a `<tanrei-tag>`, whose label clips what overhangs its box: one device pixel column
  of a Hebrew or an Arabic word at each end. The tag draws as a tag draws: what is left is the Tag's own, for every
  tag.

## `<tanrei-divider>`

A thin line between groups of content, solid, dotted, dashed or wavy (`specs/divider.spec.json`, DIV-1…14).

```html
<tanrei-divider></tanrei-divider>
<tanrei-divider inset="start"></tanrei-divider>
<tanrei-divider inset="start" inset-length="72"></tanrei-divider>
<tanrei-divider thickness="2"></tanrei-divider>
<tanrei-divider line-style="dotted" line-cap="round" thickness="4"></tanrei-divider>
<tanrei-divider line-style="dashed" line-cap="round"></tanrei-divider>
<tanrei-divider line-style="wavy" amplitude="4" wavelength="24"></tanrei-divider>
<div style="display: flex"><span>Bold</span><tanrei-divider orientation="vertical" decorative="false"></tanrei-divider><span>Italic</span></div>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `orientation` | `horizontal` \| `vertical` | `horizontal` | reflected |
| `inset` | `none` \| `start` \| `both` | `none` | shortens the line by `insetLength` (else `comp.divider.line.inset`) at its start (the inline-start of a horizontal divider — the right end in RTL — or the top of a vertical one), or at both ends; reflected |
| `lineStyle` / `line-style` | `solid` \| `dotted` \| `dashed` \| `wavy` | `solid` | reflected |
| `lineCap` / `line-cap` | `butt` \| `round` | `butt` | round ends every dot, dash and line end in a half-disc inside its length (DIV-13); it shows only on a line thicker than a hairline; reflected |
| `insetLength` / `inset-length` | number (CSS px) \| `null` | `null` | the inset's length while `inset` is `start` or `both`; null takes `line.inset` |
| `thickness` | number (CSS px) \| `null` | `null` | how thick this divider's line is; null takes `line.thickness`. It stands in for the token wherever the thickness is read (the line, a dot's side, a dash's width and least length, the wave's stroke, a round cap, the divider's own cross size), and the pattern lengths that come from tokens are scaled by it over the token, so the pattern keeps its proportions (DIV-16); the inset is not scaled |
| `dashLength` / `dash-length` | number (CSS px) \| `null` | `null` | one dash, round caps included, never shorter than the thickness; null takes `line.dash.length`; dashed only |
| `gap` | number (CSS px) \| `null` | `null` | the least space between dots or dashes; null takes `line.dot.gap` / `line.dash.gap`; dotted and dashed only |
| `amplitude` | number (CSS px) \| `null` | `null` | the crest's distance from the midline to the stroke's center; null takes `line.wave.amplitude`; wavy only |
| `wavelength` | number (CSS px) \| `null` | `null` | one crest and one trough before the wave is fitted to the line; null takes `line.wave.wavelength`; wavy only |
| `decorative` | boolean | `true` | a boolean that defaults to true: turn it off with `decorative="false"` or the property |

The six lengths are used as given, in CSS px, and not scaled by any dial (DIV-14). Null (or no attribute) takes the
token. A value that is not a finite, non-negative number, or a `thickness`, `dashLength` or `wavelength` of 0, takes the
token and is reported in debug builds — only while the current style (or, for `insetLength`, the inset) draws it; the
thickness is drawn by every style.

**Layout.** The divider has no margin or padding of its own (DIV-2): put the space around it in the layout. It takes
exactly `line.thickness` across — a wavy one twice its amplitude (the amplitude asked for, not the capped one) plus the
thickness; along the line it spans its container — a horizontal one in block flow, a flex column
or a grid (it stretches), a vertical one in a flex row or a grid. Elsewhere give a vertical divider a block size.

**The line** is a border of `line.thickness` in `line.color` on an absolutely positioned child (`::part(line)`), so an
inset shortens what is drawn, never what the layout sees. A border because engines snap its width to whole device
pixels (never less than one) and its edges to the device pixel grid (DIV-8): a 1px line on a 2× screen is two device
rows wherever the layout puts it. Firefox snaps a border's edges only on a transformed box, so the line carries an
identity `translate`. A hairline thinner than a device pixel is drawn one device pixel thick by WebKit and one CSS pixel
thick by Chromium and Firefox. In forced colors the border is repainted in the system's text color.

**Dotted and dashed** (DIV-10, DIV-11) are the same border under a mask, so they keep the pixel grid across the line
and forced colors. Not `border-style: dotted | dashed`, whose lengths each engine chooses. The component lays the dashes
out itself (a dot is a dash `line.thickness` long): as many as fit at least the gap apart, the first at the start and
the last at the end, every gap widened alike; one that fits alone is centered. It writes them as one mask image the
size of the line. It does not use a repeated tile: WebKit spaces `mask-repeat: space` by whole CSS pixels only (the last
dash falls short of the end), and every engine rounds a fractional tile to device pixels (the pitch drifts). Square
ends are one `linear-gradient`. Round ends are an SVG image of round-capped strokes, shortened by half the thickness so
the caps stay inside each dash. Firefox and WebKit draw nothing from an image under a device pixel tall, so round caps
are drawn only where the line is at least two device pixels thick; below that a cap cannot be seen, and the dashes are
square. The ends of a dash along the line are not snapped to the grid (DIV-8): the widened gap is rarely whole pixels.

**Wavy** (DIV-12) is an SVG path of circular arcs in the shadow root (`::part(line)`), laid out again on resize: a whole
number of waves (the nearest to `wavelength`, at least one), each crest `amplitude` from the midline but never more than
a quarter of the fitted wavelength. The first arc rises toward the top (horizontal) or the left (vertical). In RTL a
horizontal wave is mirrored, so it starts at the right end (DIV-4). The stroke is `line.color` at `line.thickness`,
at least one device pixel, antialiased, and `CanvasText` in forced colors. A solid line with round caps is the border
under a mask of two discs and the rectangle between them. The dashes and the wave are laid out when a prop or the
divider's size changes; a change to a pattern token alone (not to the thickness, which resizes the divider) is not
seen until then.

**Semantics** (DIV-5, DIV-6). Not an `<hr>`: decorative, the host is `aria-hidden="true"`; with `decorative="false"` it
is `role="separator"` with `aria-orientation` and no name. It is never focusable. The line's style carries nothing to
assistive technology. An `orientation`, `inset`, `lineStyle` or `lineCap` the divider does not define draws the default
and is reported in debug builds (DIV-7).

## `<tanrei-badge>`

A dot or a small count on an anchor's top-end corner (`specs/badge.spec.json`, BDG-1…14).

```html
<tanrei-badge label="New messages"><tanrei-button variant="text" label="Chat"><span slot="icon">chat</span></tanrei-button></tanrei-badge>
<tanrei-badge count="3" label="3 unread"><tanrei-button variant="text" label="Inbox"><span slot="icon">inbox</span></tanrei-button></tanrei-badge>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `count` | number \| null | `null` | no attribute (null) draws the dot; `0` draws nothing; above 0 draws the number. A negative count draws as 0, a fraction is rounded down, a count that is not a number draws as 0 — each reported in debug builds (BDG-14) |
| `max` | number | `999` | a larger count shows as `max` followed by `+` (`999+`); below 1, 999 is used and reported |
| `label` | string | `""` | read after the anchor's own name ("Inbox, button, 3 unread"). Without it the displayed count is read; a dot without it is reported (BDG-9) |

**The anchor** is the default slot; its first element is the one the badge describes. The host is an inline flex box
exactly the anchor's size, and the badge is absolutely positioned on it (`pointer-events: none`), so it never moves or
resizes the anchor and never takes input (BDG-7). Placement is logical, so RTL takes the top-left corner and grows the
pill to the left (BDG-11). The dot — a circle of `dot.size` whatever `container.shape` is — has its center `dot.offset`
inside the corner; the pill's leading circle (a square of the pill's drawn height at its start) has its center
`container.offset` inside it, so a longer count grows away from the anchor. The pill grows with its text (BDG-13): a
ResizeObserver measures its height, so the leading circle stays on the corner however large the text is. The outline
is a spread shadow outside the edge (BDG-6); in forced colors the badge is drawn in the system's text color.

**Semantics** (BDG-8, BDG-10). The badge is not in the accessibility tree: its drawing is `aria-hidden`, and it sets
`aria-description` on the anchor (an ID reference could not cross the shadow root), restoring the anchor's own
description when it stops. `<tanrei-button>` passes a host's `aria-description` on to their
native button (`FORWARDED_DESCRIPTION`), so a Tanrei anchor is announced with it. A change of `count` or `label` updates
the description and announces nothing; a product that must announce a change uses a live region.

**Digits** (BDG-12): the nearest `lang`'s digits, no grouping separator (`Intl.NumberFormat`, `useGrouping: false`),
tabular figures; the label is an isolated LTR run, so `999+` keeps its plus sign after the digits in an RTL page.

## `<tanrei-tag>`

A static label for a category or a status: a word in the layout, inline with the text beside it, that never answers a
pointer, a key or focus (`specs/tag.spec.json`, TAG-1…20). A label that is pressed, switched or removed is a
`<tanrei-chip>`; a dot or a count on another element is a `<tanrei-badge>`.

```html
<tanrei-tag label="Beta"></tanrei-tag>
<tanrei-tag variant="outlined" label="Design"><span slot="icon">sell</span></tanrei-tag>
<tanrei-tag status="error" status-label="Error" label="3 builds"></tanrei-tag>
<tanrei-tag size="small" variant="outlined" status="warning" label="Degraded"></tanrei-tag>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the tag's text, drawn and read. Empty (or only white space) draws nothing, takes no space and is reported (TAG-20) |
| `variant` | `tonal` \| `outlined` \| `filled` (open) | `tonal` | a quiet fill, no fill and one hairline, or a full fill; reflected |
| `status` | `default` \| `info` \| `warning` \| `error` \| `success` | `default` | the status whose color roles the look is drawn in — colors only; reflected. Another value is drawn as `default` and reported |
| `statusLabel` / `status-label` | string | `""` | the status in words, read before the label ("Error, 3 builds") and never drawn; ignored (and reported) while `status` is `default`; reflected |
| `size` | `small` \| `medium` (open) | `medium` | small (20 high, 12 text) in a line of body text or a table cell; medium (24, 14) beside a heading; reflected |
| `dot` | boolean | `false` | a filled circle of `dot.size` before the label, in the look's mark color; reflected. An outlined tag with a status draws it whatever this says (TAG-8) |

Slot `icon`: a glyph of the icon set by name (or an `<svg>` / `<img>`), 16 in both sizes; it takes the dot's place.
Parts: `container`, `icon`, `dot`, `label`. No events.

**It is text (TAG-9…12).** The host has no `role`, no `tabindex` and no listener of a pointer or a key, and leaves
`pointer-events` as they are: inside a link, a button or a row, input over the tag reaches that element, which draws
its own states, and the tag's text is part of its content. The shadow root is spans of text: the label, and before it —
only while the tag has a status — `statusLabel` followed by a comma and a space, visually hidden. The glyph and the dot
are `aria-hidden`. Nothing is transitioned or animated, and a change is not announced: a product that must announce one
uses a live region.

**Drawing (TAG-1…8, TAG-13).** Each variant paints its container, label and mark from its own tokens, and from the
tokens prefixed with the status where it has one (`--tanrei-comp-tag-tonal-error-icon-color`). The outlined edge is an
inset ring of `outline.width`, so it changes neither the box nor the place of the content, and a status never colors it.
The container is at least its size's height, a pill through the shared corner rule, and grows with enlarged text; the
glyph box and the dot keep their sizes. The host is `inline-flex` on the baseline: the label and the mark share one
baseline, the label's, so a tag sits on the baseline of the text beside it with or without a mark, and the mark is
centred on the label's line whichever of the two is taller. A label that does not fit is cut with an ellipsis; the
paddings and the mark do not shrink. A size or variant a layer adds gets its styles on demand; one the active
system lacks is drawn as the default and reported (TAG-19).

**Right to left (TAG-15…18).** The order and the paddings are logical, and follow the `dir` the tag inherits — it has
no direction setting of its own. A glyph the icon set marks (or `data-mirror="always"`) is mirrored in its own box by
the icon helper; `data-mirror="never"` forbids it. The label is text of its own direction: it carries `dir="auto"` when
it has a letter, so the box that cuts it has the label's direction and the ellipsis is at the label's own end in every
engine (`unicode-bidi: plaintext` alone orders the text, but WebKit then cuts it at the layout's end and Firefox draws
no ellipsis). A label with no letter (a number, a date) carries no `dir` and takes the layout's.

**Forced colors (TAG-14).** Every look gains a `CanvasText` border of `outline.width`, which the paddings give room for
so nothing moves; the label and the glyph take `CanvasText` (the glyph without the mode's backplate, which would cover
the edge at a round end) and the dot is filled with it.

**Without script.** The label is an attribute, so an element that is never defined shows nothing. A page that must read
without script gives it a fallback of its own: `tanrei-tag:not(:defined)::before { content: attr(label); }`, and hides
the slotted glyph name (`tanrei-tag:not(:defined) > [slot] { display: none; }`).

## `<tanrei-tag-group>`

A set of `<tanrei-tag>` or `<tanrei-chip>` children laid out in lines that wrap, spaced for what it holds, and exposed
as one named list (`specs/tag-group.spec.json`, TGR-1…16). It draws nothing of its own, takes no focus, handles no key,
keeps no selection and fires no event; it supplies no words — the name of the set is the instance's `label`.

```html
<tanrei-tag-group spacing="tags" label="Tags">
  <tanrei-tag label="Design tokens"></tanrei-tag>
  <tanrei-tag label="Accessibility"></tanrei-tag>
</tanrei-tag-group>

<tanrei-tag-group label="Filters">
  <tanrei-chip kind="filter" label="Open" selected></tanrei-chip>
  <tanrei-chip kind="filter" label="Blocked"></tanrei-chip>
</tanrei-tag-group>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `spacing` | `tags` \| `chips` (open) | `chips` | what the set holds, which decides the gap along a line and between two lines (`--tanrei-comp-tag-group-gap-<spacing>`, `-row-gap-<spacing>`); reflected. The default is the safe side: tags at `chips` only stand further apart, chips at `tags` lose part of their touch targets. A value a layer adds gets its styles on demand; one the active system lacks is drawn as `chips` and reported (TGR-16) |
| `label` | string | `""` | the accessible name of the list; never drawn. Empty, the list is exposed unnamed |

Default slot: the members. No parts, no events, no custom properties of its own.

**The form: a shadow root around the slot.** The members are custom elements the product writes as children; they stay
in the product's DOM with their attributes, events and styles, and the group moves none of them. The shadow root holds
one element — `<div role="list" aria-label="…">` — around the default slot: a flex row that wraps, `align-items:
center`, `column-gap` and `row-gap` from the tokens of `spacing`. The host is `display: block` and has no role.

**List items across two shadow trees (TGR-7).** A browser builds the accessibility tree from the flattened tree, where
a slotted child's parent is the slot's parent — the list. So each member needs only to be an item itself: the group
writes `role="listitem"` on every member that has no `role` attribute and says nothing by itself — a custom element (a
tag and a chip keep their semantics inside their own shadow roots) or a `div` or `span` — and removes the attribute
when the member leaves, if it is still the one the group wrote. A chip's `<button>` or `<a>`, with `aria-pressed`, and
an input chip's remove button are then inside the item; a tag's text is the item's text. Chromium's tree, read over CDP
in the tests, is `list "Filters" > listitem > button "Open" (pressed)`. A native element with a meaning of its own (an
anchor, a button) or one with its own `role` keeps it, is not an item, and is reported (TGR-11); so is text written
straight into the group, which cannot carry a role.

**Empty (TGR-8).** With no element and no text but white space, the shadow root renders nothing and the host is
`display: none` through the custom state `:state(empty)`, set in the same task the last member leaves.

**Hit areas (TGR-5).** The group hands its distances to its members as inherited properties — an internal contract
between Tanrei elements, like a button group's `--tanrei-group-*`, not a styling API: `--tanrei-set-gap` always, and
`--tanrei-set-row-gap` only while the members stand on more than one line (the custom state `wrapped`, read by a
`ResizeObserver` on the list when its box changes; nothing is measured at rest). A chip bounds its hit area with them:
no further than half the gap past its visible edge along the line, and half the row gap above and below; its remove
action's area likewise. Two areas that would overlap therefore meet at the middle of the gap and never lie over a
neighbour's visible bounds. With `spacing="chips"` in the default system a medium chip keeps its whole 48 between two
lines (32 + 8 + 8); a small chip on wrapped lines has 40, and on one line its whole 48. A chip outside a group has
neither property and is unchanged. What is not exact: on a wrapped set the bound also applies above the first line and
below the last, where no neighbour stands.

**Focus after a removal (TGR-9).** The group listens to `focusin` and `focusout` on itself to know which member holds
focus, and observes its child list. When that member is among the removed nodes and the document's active element has
fallen to the body, it calls `focus()` on the members that followed, then on those before, until one takes it: a chip
takes it on its own button or link (the first focusable thing in its shadow root, never the remove action), a tag and a
disabled chip do not. If the product has already moved focus, or nothing takes it, the group does nothing. Two cases
beyond the spec's words: a member that was only moved inside the group is focused again; and where the product wrote
the whole set again (no former member is left), the member that now stands at the removed one's place is tried first —
chips written a moment ago are waited for (`updateComplete`).

**Debug reports.** A `tanrei-chip` while `spacing` is `tags` (TGR-4); content that is not a tag or a chip (TGR-11); an
unknown `spacing` (TGR-16). An empty group reports nothing.

**Before the element is defined** the members are inline elements in source order, separated by the white space
between them. A page that wants the layout from the first paint adds
`tanrei-tag-group:not(:defined) { display: flex; flex-wrap: wrap; align-items: center; gap: var(--tanrei-comp-tag-group-row-gap-chips) var(--tanrei-comp-tag-group-gap-chips); }` (the `-tags` tokens for a set of tags).

## `<tanrei-keyboard-shortcut>`

The keys that perform a command, drawn as keys or as text for the keyboard the person is using, and read aloud by name
(`specs/keyboard-shortcut.spec.json`, KBS-1…18).

```html
<p>Search with <tanrei-keyboard-shortcut keys="mod+k" size="small"></tanrei-keyboard-shortcut>.</p>
<tanrei-keyboard-shortcut keys="mod+k mod+c"></tanrei-keyboard-shortcut>
<tanrei-keyboard-shortcut keys="mod+shift+k" variant="plain" label="Befehl Umschalt K"></tanrei-keyboard-shortcut>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `keys` | string[] | `[]` | one chord per string, pressed in order; a chord is key names joined by `+` (`mod+shift+k`). The attribute holds the chords separated by spaces (`keys="mod+k mod+c"`; a JSON array is read too). Modifiers `mod` (Command on Apple platforms, Control elsewhere), `ctrl`, `alt`, `shift`; named keys `enter`, `escape`, `tab`, `backspace`, `delete`, `space`, `arrow-up`/`-down`/`-left`/`-right`, `home`, `end`, `page-up`, `page-down`, `caps-lock`, `f1`…`f24`, `plus`; any other single character is that character's key. Names ignore case |
| `variant` | `keycap` \| `plain` (open) | `keycap` | each key in its own cap, or the shortcut as a line of text; reflected |
| `size` | `small` \| `medium` (open) | `medium` | small (20 caps, 12 text) sits in a line of body text or a menu row; medium (24, 14) beside larger text; reflected |
| `convention` | `auto` \| `apple` \| `standard` | `auto` | whose keyboard the keys are written for; reflected. Another value is read as `auto` and reported |
| `label` | string | `""` | what is read in place of the drawn keys: the shortcut in the product's own words ("Shift Command K"); without it the notation of `aria-keyshortcuts` is read |
| `disabled` | boolean | `false` | fades the legends; the keys still show, and no disabled state is exposed (KBS-9); reflected |
| `ariaKeyShortcuts` | string \| null | (read-only) | the shortcut in `aria-keyshortcuts`' form (`Meta+Shift+K`, `Control+K Control+C`), for a component that hosts it (KBS-12). The element sets no `aria-keyshortcuts` of its own: it only shows keys |

**The convention (KBS-2).** Under `auto`, the nearest ancestor's `data-tanrei-keyboard-convention` (`apple` or
`standard`; any other value sets nothing), looked up across shadow roots, when the element connects and whenever that
attribute changes anywhere above it (one `MutationObserver` for the page, observing the document and each shadow root a
shortcut is in). Without one, `apple` where `navigator.userAgentData.platform` or `navigator.platform` names macOS, iOS
or iPadOS (visionOS and iPadOS report a Mac), `standard` elsewhere. Never the design system: the keys follow the keyboard,
not the look. Apple writes ⌃ ⌥ ⇧ ⌘ in that order and no separator (⇧⌘K, ⌥⌘⎋); standard writes Ctrl, Alt, Shift in that
order joined by `+` (Ctrl+Shift+K). A letter is its capital and adds no shift (KBS-5).

**Drawing (KBS-6…8, KBS-15…17).** The shadow root draws a `<kbd>` per chord holding a `<kbd>` per key (`chord` and
`container` parts), the legend in the `label` part and the `+` in the `separator` part. A cap is at least its size's
`container.height` tall and as wide as tall, padded by `container.padding-inline`, filled with `container.color`, edged
with `outline.width` on its top and sides and `outline.bottom-width` at its bottom — a border inside the cap's box; a
width of 0 (both, in the default system) is no border at all, with no least width, so the cap is its fill alone — and
cornered by its size's `container.shape` through the shared corner rule (eased by the smoothing). The chords are
`sequence.gap` apart and the keys of a chord `chord.gap` apart, the separator with the gap on each side. `plain` draws no
cap, fill or edge and nothing between the keys. The host is `inline-flex` on the baseline, so the legends sit on the
surrounding text's baseline; a chord never breaks (`white-space: nowrap`) and a sequence wraps only between chords (the
wrapped rows are `chord.gap` apart — the spec names no row gap). The whole is an LTR run isolated from the page's direction
(KBS-16). The legends are text in the size's typescale, whose family list ends in a generic family, so a symbol the brand
face lacks (⌘, ⎋) is drawn by the browser from a system face at the same size and baseline (KBS-17). A size or variant a
layer adds gets its styles on demand (a variant a layer adds is drawn in caps); one the active system lacks is
drawn as the default and reported. In forced colors an edge a system gives the caps is `CanvasText` (the default
system's cap has none, and its fill is the mode's: only the legend shows), and a disabled legend is `GrayText`.

**Semantics (KBS-10…12, KBS-14).** The drawing is `aria-hidden`; one visually hidden text is read where the shortcut
sits: `label`, the shortcut in the product's own words ("Shift Command K", "Control K, then Control C") — and, without
it, the notation of `aria-keyshortcuts` (`Meta+Shift+K`, `Control+K Control+C`), which is a standard's and the same in
every language, with one debug report (KBS-11). **The shortcut has no names for keys**: the legends it
draws are what the keys carry, and nothing spells them out. Inside a `<button>` it is part of the button's name. It takes no focus and no input, and does not listen for the keys it shows: the product binds them.
Debug builds report what KBS-18 lists (an empty chord, only modifiers, two keys, a key named twice once written, an
unknown name), drawn as it can be.

**Hosted (KBS-13).** A component that draws the shortcut in one of its own parts (the menu's item) sets the internal
`hosted` property: the legends and separators inherit the element's `font`, `letter-spacing` and `color` (the host styles
the element from its own tokens), the caps keep the shortcut's own, nothing is exposed (`aria-hidden` on the element), and
the host exposes `ariaKeyShortcuts` as its own `aria-keyshortcuts`. When the convention changes without the host, the
shortcut tells it with an internal, non-composed event, so the host re-reads the form.

## `<tanrei-progress-indicator>`

How far a task has come, as a bar or a ring; indeterminate when that is unknown (`specs/progress-indicator.spec.json`,
PRG-1…17).

```html
<tanrei-progress-indicator value="0.4" label="Uploading report.pdf"></tanrei-progress-indicator>
<tanrei-progress-indicator value="3" max="10" value-text="3 of 10 files" label="Uploading"></tanrei-progress-indicator>
<tanrei-progress-indicator variant="circular" label="Syncing"></tanrei-progress-indicator>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `linear` \| `circular` | `linear` | drawn by the component (a design system cannot add a form); reflected |
| `size` | `small` \| `medium` \| `large` (+ values a layer adds) | `medium` | the bar's thickness or the ring's square; reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | how a determinate indicator is told from the rest of its track (PRG-17, see Separation): `auto` takes `comp.progress-indicator.track.separation`, the system's answer; anything else is `auto` and reported (PRG-12); reflected |
| `value` | number \| null | `null` | as `<progress>`: no attribute (or `null`) is indeterminate |
| `min`, `max` | number | `0`, `1` | a value outside is drawn and exposed clamped; `max` not above `min` draws the track only (PRG-11) |
| `label` | string | `""` | the accessible name, required (PRG-15) |
| `valueText` / `value-text` | string | `""` | read instead of the percentage |

**The bar** fills the inline size its layout gives it (block flow, a flex column, a grid), from the inline-start (the
right in RTL). Its track and indicator are rounded by `track.shape`, which the browser clamps to half the thickness.
Under `gap` (m3-like's choice, or `separation="gap"`), a value strictly between min and max leaves `track.gap` after the
indicator (on a ring, at both ends of its arc). Under `divider` (Tanrei's choice) the track runs on under the
indicator, whatever `track.gap` says. Under either, a determinate bar draws the stop indicator — a dot of
`stop-indicator.size`, never larger than the bar is thick, concentric with the track's rounded end — unless that size is
0 (Tanrei's) or the value is at max, where the indicator covers it (PRG-5). The
track is two elements, both `::part(track)` — the whole track, and what is left of it after the gap — and the separation
shows one, so a change of separation shows the other form at once, with no value motion to run. Indeterminate, a two-fifths segment crosses once per `motion.cycle-duration`
with `motion.cycle-easing`, clipped to the track.

**The ring** is SVG: its outer edge fills `circular.size`, stroked at `circular.thickness`, starting at the top and
running clockwise in every direction. Caps are round unless `track.shape` is `sys.shape.corner.none` — decided in CSS
alone: a round-capped copy of the dashes is revealed through a box whose width is `min(100%, track.shape × 100000)`.
Dashes are shortened by their caps, so what is drawn — caps included — covers exactly its arc. Indeterminate, a quarter
arc turns once per cycle at constant speed (`sys.motion.easing.linear`).

**Motion.** A value change eases over `motion.value-duration` with `motion.value-easing`; switching between determinate
and indeterminate is a new drawing, at once. Under `prefers-reduced-motion: reduce` a value change shows at once and the
indeterminate form stands still: the indicator over the whole track, its opacity pulsing 1 → 0 → 1 once per cycle. Off
screen (an IntersectionObserver) the animation is paused.

**Semantics.** The host is the progressbar: `role`, `aria-label`, and — determinate — `aria-valuemin`, `-max`, `-now`
(clamped) and `aria-valuetext`; indeterminate, `aria-busy="true"` and no value. Never focusable, never a live region.
A size the active system lacks draws medium, a variant the component does not define draws linear and a separation it
does not define is `auto`; each is reported (PRG-12). Parts: `track`, `indicator`, `stop-indicator`.

## `<tanrei-meter>`

Where a known value stands in a known range, as a bar or a ring (`specs/meter.spec.json`, MTR-1…15).

```html
<tanrei-meter value="0.62" label="Storage used" value-text="9.3 GB of 15 GB"></tanrei-meter>
<tanrei-meter value="0.85" status="warning" label="Storage used" value-text="Almost full: 12.8 GB of 15 GB"></tanrei-meter>
<tanrei-meter variant="circular" value="0.62" label="Battery"></tanrei-meter>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `linear` \| `circular` | `linear` | drawn by the component; reflected |
| `size` | `small` \| `medium` \| `large` (+ values a layer adds) | `medium` | the bar's thickness or the ring's square; reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | as the progress indicator's (see Separation): `auto` takes `comp.meter.track.separation`; reflected |
| `status` | `default` \| `info` \| `success` \| `warning` \| `error` | `default` | the indicator's color, and nothing else (MTR-3, MTR-9); the product decides it — no thresholds; reflected |
| `value` | number | `0` | clamped to the range; not a finite number is drawn and exposed as `min` (MTR-10) |
| `min`, `max` | number | `0`, `1` | `max` not above `min` draws the track only and exposes 0 of 0…1 (MTR-10) |
| `label` | string | `""` | the accessible name, required (MTR-14) |
| `valueText` / `value-text` | string | `""` | read instead of the percentage; say what the status means here |

**The drawing is the progress indicator's determinate form** (`src/primitives/range-track.ts`: `rangeTrackStyles()`,
`renderRangeBar()`, `renderRangeRing()`, `rangeOf()`, `rangeAxes()`), read from `--tanrei-comp-meter-*`, which alias
the progress indicator's tokens by default: the two match side by side, and a layer can set either apart. The meter
never runs an indeterminate motion. Its own parts: the indicator and the stop indicator are drawn in `--_indicator`,
the color of the `status` attribute (`comp.meter.<status>.indicator.color`, `comp.meter.indicator.color` for default
and for an unknown status).

**Motion.** A change of value moves the end, and a change of status fades the indicator's color, over
`motion.value-duration` with `motion.value-easing` (MTR-6); the first frame has nothing to transition from. Under
`prefers-reduced-motion: reduce` the end moves at once and the color still fades. A change of the direction around
it is drawn at once (MTR-13): the bar's ends are logical insets, and a flip of direction moves a physical one from
one value to another (the track after a gap goes from `right: 0` to its start), which the value's transition would
run — so a `DirectionController` finishes the transitions the flip started, in the ResizeObserver callback of the
same frame, before it is painted.

**Forced colors** (MTR-15): the track is an inset edge of `sys.border.hairline` in `CanvasText` over `Canvas` (on a
ring, a hairline stroke), and the indicator is filled in `CanvasText`, whatever the status.

**Semantics.** The host is the meter: `role="meter"`, `aria-label`, `aria-valuemin`, `-max`, `-now` (clamped) and
`aria-valuetext` while `value-text` is set — never a progressbar, never `aria-busy`. The native `<meter>` is not
drawn: what of it can be styled differs by engine (the pseudo-elements are WebKit's own). Never focusable, never a live
region; nothing of `status` is exposed. A size the active system lacks draws medium; a variant, separation or status
the meter does not define draws linear, auto or default; each is reported (MTR-11). Parts: `track`, `indicator`,
`stop-indicator`.

## `<tanrei-loading-indicator>`

A short wait of unknown length (`specs/loading-indicator.spec.json`, LDG-1…16).

```html
<tanrei-loading-indicator label="Loading messages"></tanrei-loading-indicator>
<tanrei-loading-indicator contained size="large" label="Refreshing"></tanrei-loading-indicator>
<tanrei-loading-indicator size="small" label="Saving" show-delay="0" entrance="grow"></tanrei-loading-indicator>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `size` | `small` \| `medium` \| `large` (+ values a layer adds) | `medium` | the indicator's square (and, contained, the container's); reflected |
| `contained` | boolean | `false` | a raised, filled circle behind the arc, for waits over content; reflected |
| `label` | string | `""` | the accessible name, required (LDG-10) |
| `showDelay` / `show-delay` | number (ms) \| null | `null` | the wait from insertion before it is drawn and exposed; null takes `motion.show-delay`, 0 is at once |
| `entrance` | `auto` \| `fade` \| `grow` | `auto` | how it enters once shown; auto takes `motion.entrance` |
| `enterDuration` / `enter-duration` | number (ms) \| null | `null` | how long the entrance lasts; null takes `motion.enter-duration`, 0 is at once |

**Insert it when the wait starts and remove it when the wait ends.** The show delay starts as it is inserted
(`connectedCallback`) and is cancelled when it is removed, so moving it within the document starts a new delay; hiding
it (`hidden`, CSS, scrolling) neither restarts nor pauses it, and reduced motion keeps it (LDG-15, LDG-16). During the
delay the host keeps its box, its parts are `visibility: hidden`, nothing runs, and it carries no `role`, name or busy
state and is `aria-hidden="true"` (LDG-11). Then it enters with `motion.enter-easing` — fade, or grow from its center —
over the whole component, drawn only (the box keeps its size); under reduced motion grow enters as fade (LDG-13). A time
that is empty, negative or not a finite number, or an unknown `entrance`, takes the token and is reported (LDG-14). The
props are read at insertion: a change applies from the next one.

A quarter arc with round caps and no track, turning clockwise once per `motion.cycle-duration` at constant speed, in
every direction. Contained, the component is the container's square (`container.size`, `container.shape`,
`contained.container.color` and `.elevation`) with the arc centered in `contained.indicator.color`. Under reduced motion
it stops turning and the whole circle pulses with `sys.motion.easing.standard`; the container stays still. Off screen
the animation is paused. The host is a progressbar with `aria-label` and `aria-busy="true"` and no value; it is never
focusable and never announces itself — mark the region being loaded `aria-busy` in the product. Parts: `container`,
`indicator`.

## Selection controls: what `<tanrei-checkbox>`, `<tanrei-radio-button>` and `<tanrei-switch>` share

They are **form-associated** (`ElementInternals`): with a `name` they take part in a `<form>` — `FormData`, submission,
`form.reset()` (back to the `checked` attribute, which is the default, as on a native control; the
property is not reflected), state restoration, and a disabled `<fieldset>`. Their semantics are a **native `<input>`**
in the shadow root (axe cannot see `ElementInternals` roles), named by `label`
(`aria-label`, so the name is the same visible or not); the drawn label is hidden from assistive technology so it is not
read twice. Everything is wrapped in a `<label>`: a click on the label's text, on the control, or anywhere on the
minimum target around it activates the input, once — a listener hears **one** `click` per activation. A light-DOM
`<label for>` naming the element, a click dispatched on it and `element.click()` activate it too. They switch their own
value **before** they fire `input` (composed) and `change` (a `CustomEvent`, bubbling); setting the property from script
fires nothing. **Space** activates and presses; **Enter** does not activate — inside a form it submits the form, as on a
native checkbox. **A capturing listener on an ancestor hears `input` twice**:
the native control's own `input` is composed and crosses the shadow root on its way down — retargeted to the element,
`isTrusted`, before the element has taken the new value — and then the element's; a listener in the bubble phase hears
the element's alone, and `change` is heard once in either phase.

**Conditions are state variants**. The condition drawn is read from the native input (`:checked`,
`:indeterminate`), so what is drawn and what is announced cannot disagree. Hover, focus and press show on the
**container**, a round state layer (`::part(container)`) behind the box / ring or around the switch's handle; the other
parts read their own state tokens and keep them unless a system says otherwise. Hover covers the label (the root is the
`<label>`); focus and disabled are the input's; pressed is `data-pressed` on the container. The press, press-hold, the
four `pressed-feedback` answers, ring or glow and corner smoothing are Button's primitives; a press **outside** the
round container (on the label, on a switch's track away from the handle) grows the ripple from the container's center.
A part a state recolors changes over `motion.state-*`; the same part changes over `motion.selection-*` when the
condition changes — the element marks that moment with `data-condition-change` on its root for two frames, since CSS
alone cannot tell the two changes apart. The label is at the inline end, `label.gap` away, in `label.typescale`,
wrapping; the control is centered on its **first line** (the root carries the label's text style, so `1lh` is the
label's line height on the control too). `label-hidden` keeps the name without drawing it; an empty `label` renders and
is reported in a debug build. Reduced motion: every change shows at once. Forced colors: system colors throughout.

**Text size.** The specs say the control does not grow with text. On the web every size derives from `dial.size.unit`
(0.25rem), so a larger root text size scales the control with its label.

## `<tanrei-checkbox>`

One independent choice, a partly-on parent, or a required choice left unmade (`specs/checkbox.spec.json`, CHK-1…19).

```html
<tanrei-checkbox label="Email me updates" name="updates"></tanrei-checkbox>
<tanrei-checkbox label="Select all" indeterminate></tanrei-checkbox>
<tanrei-checkbox label="I accept the terms" name="terms" required error></tanrei-checkbox>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `checked` | boolean | `false` | whether it is on; the attribute is the form's default |
| `indeterminate` | boolean | `false` | partly on: wins over `checked` for what is drawn and announced (`mixed`); activation clears it and checks the box (CHK-2); reflected |
| `error` | boolean | `false` | the `error-` form of the condition, and `aria-invalid`; reflected |
| `disabled` | boolean | `false` | reflected |
| `label` | string | `""` | the name, drawn next to the box |
| `labelHidden` / `label-hidden` | boolean | `false` | no visible label, the name kept |
| `name`, `value`, `required` | web only | `""`, `"on"`, `false` | form participation and native constraint validation |

| Event | When |
|---|---|
| `input`, `change` | the user switched it; `change` is `CustomEvent<{ checked: boolean }>` |

Six conditions — `unselected`, `selected`, `indeterminate` and their `error-` forms — each with its container, box,
mark, outline and label color per state. The box (`box.size`, `box.shape`) sits centered in the round container
(`container.size`); its outline is `outline.width` wide inside the box's edge and its fill is inside the outline, never
under it.

**One shape (CHK-22).** The outline and the fill are two layers of the box (its `::before` and `.fill`), each the whole
box with a padding of `outline.width` and each cut by a mask along the same edge, the content box: the outline is
everything but the content box, the fill is the content box. The fill is added to the outline
(`mix-blend-mode: plus-lighter` inside the box's `isolation: isolate`), so on a pixel that edge crosses the two shares
sum to the whole: nothing behind the box shows between them at a zoomed page's fractional device pixel ratio, and neither
is painted over the other, so a translucent box is nowhere darker than its token. Both masks have two layers (the fill's
second one is empty): that is the one form Chromium, Firefox and WebKit all cut from the same rasterized edge — a fill
clipped with `background-clip` overlaps a masked outline in Chromium, and a fill behind a one-layer mask leaves a seam in
Firefox (measured at device pixel ratios 1 to 3, `test/one-shape.ts`). In forced colors the box is a border and a
background in system colors.

**The mark** is a glyph of the system's icon set, drawn with the icon helper (`iconGlyph()`, see Icons): `check` while
selected, `remove` while indeterminate, in a glyph box of `mark.size` centered on the box and not clipped by it, in the
selected family and fill (CHK-12). Its weight is its own, `mark.weight` (`--tanrei-comp-checkbox-mark-weight`), not
`sys.icon.weight`: 500 in the default system, where the icons are 300, because a 20 glyph at the icons' weight is a
stroke one pixel wide. The weight changes the stroke only; the glyph box stays `mark.size`. A preset pins it
to its icon weight and draws what it drew. The checkbox draws no path of its own; a system that wants another check
chooses another icon set. Both glyphs are always laid out (`::part(mark)`, hidden from assistive
technology); the one that is not the condition's is transparent and scaled to `motion.mark-enter-scale`.

**The motion** (CHK-13). A change of condition recolors the box, its outline and the glyph over `motion.selection-*`,
fades the glyph in or out over the same, and grows it from, or shrinks it to, `motion.mark-enter-scale` about the box's
center over `motion.mark-scale-*` (the CSS `scale` property). Checked ↔ indeterminate runs both glyphs at once; an
`error` change only recolors. The first drawing does not animate (a CSS transition needs a previous style). A change
during a change continues from what is drawn (CHK-18): a CSS transition that is replaced starts from the current value.
Under reduced motion there is no transition at all, so the new condition is whole in the first frame, and removing the
transitions ends any that were running (CHK-17).

**A missing icon font** (CHK-19). Fonts are named, not bundled: until the icon font can draw the ligature, the
browser would spell `check` in a fallback face. The checkbox draws nothing in the glyph's place until then
(`GlyphDrawnController`, `src/primitives/glyph.ts`): a ligature is one glyph, about an em wide, so a glyph counts as
drawn while its text is at most 1.5 × its glyph box (`DRAWN_WIDTH`), and a ResizeObserver on the text hears the font
arrive — or a system switch to another icon set — before the frame is painted. The glyph then appears whole, without
the motion. The box, its fill and the state stay throughout. An icon font whose ligatures are wider than 1.5 em would
be taken for a missing one. Parts: `container`, `box`, `mark`, `label`.

## `<tanrei-radio-button>`

One option of a group; exactly one is chosen (`specs/radio-button.spec.json`, RAD-1…27).

```html
<div role="radiogroup" aria-labelledby="freq-label">
  <span id="freq-label">Frequency</span>
  <tanrei-radio-button name="frequency" value="daily" label="Daily"></tanrei-radio-button>
  <tanrei-radio-button name="frequency" value="weekly" label="Weekly" checked></tanrei-radio-button>
</div>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `checked` | boolean | `false` | whether it is the one chosen, as a native radio's; the attribute is the form's default |
| `value` | string | `""` | what it stands for: carried by `change`, submitted with the form |
| `name` | string | `""` | the group; reflected |
| `disabled` | boolean | `false` | skipped by Tab and the arrow keys; reflected |
| `error` | boolean | `false` | draws the error form of its condition (RAD-26); reflected. For options grouped without a frame: a field, a field group or a radio group in error puts its radio buttons there itself. It exposes no invalid state |
| `label`, `labelHidden` / `label-hidden` | | | as the checkbox's |

| Event | When |
|---|---|
| `input`, `change` | the user selected this option; `change` is `CustomEvent<{ value: string }>`. The option it replaced fires nothing; a selected option activated again fires nothing (RAD-2) |

**The group** is the options with one `name` in the same form — or, outside a form, in the same document or shadow root
— as for a native radio; an option without a name is a group of its own. The options keep the group themselves (each
native radio is alone in its shadow root): selecting one, by the user or by script, clears the others silently (RAD-3);
Down / Right and Up / Left move to the next or previous enabled option, wrapping, and select it — Left and Right swap in
RTL (RAD-4); the group has one tab stop, the selected option or else the first enabled one (RAD-5); each option carries
`aria-posinset` / `aria-setsize` (RAD-16). The group's name is the product's: a `role="radiogroup"` element with
`aria-labelledby`, or a `<fieldset>` with a `<legend>`.

**In error** (RAD-26, RAD-27). `error`, or the frame the option stands in — it asks with
`errorCondition`, as the checkbox does (`src/primitives/field.ts`), and reads the frame's `invalid` for this alone —
puts `data-error` on `.root`, and the two error forms of the condition (`error-unselected`, `error-selected`) are then
its state variants: the ring in the error form's color, the fill in its own, in every state. Nothing but color
changes: the stroke says the selection in error as out of it. A disabled option reads the error form's disabled
tokens, which resolve to the plain form's — disabled wins, by value. The error coming or going is a change of condition
(the selection motion; at once where motion is reduced), by the prop or by the frame. The native radio is never given
`aria-invalid`: the radio role has no invalid state, and a group says it (RGP-10). In forced colors the ring is drawn
in system colors whatever the condition, so the error forms are the pixels of the same condition out of error.

**The ring and the fill** (RAD-14, RAD-19, RAD-24). The ring is a circle of `ring.size` in both conditions, stroked
inward. Ring and fill are one shape, built as the checkbox's box is (CHK-22): two layers of the ring's box (its
`::before` and `.fill`) with one padding, the stroke, the ring masked to everything but the content box and the fill to
the content box, the fill added with `plus-lighter` in an isolated group — so no gap opens between them at any zoom, and
one transitioned property, `padding`, moves the edge they share (they cannot drift apart mid-motion). `fill.inset` is a
margin of the fill's layer alone; above 0 (m3-like's dot) the space between shows what is behind. The stroke is
`ring.width` while unselected; while selected, `ring.selected-width-share` of the radius, or `ring.width`
where that is wider (0.5 in the default system: a 5 stroke on the 20 ring). There is no dot. The fill is drawn in both
conditions: the disc inside the ring's inner edge at that moment, less `fill.inset`, never under the ring, in the
condition's `fill.color` at `fill.opacity` (clear while unselected in the default system). A selection change
(`motion.selection-*`, RAD-15) moves the stroke, the ring's color and the fill's color together; the fill's edge follows
the stroke, so it never scales from the center, and its color fades in from the unselected fill color (interpolated
premultiplied, so a transparent end never shows as black). A change that comes mid-motion turns back from where it is
(RAD-20); reduced motion shows the new condition at once. Forced colors draw the ring in system colors, thicker when
selected, and no fill.

**Layout** (RAD-21). Each option is at least `option.min-height` tall (`sys.target.touch`, 48, by default), the
container centered in it — on the label's first line when the label wraps — so options stacked with no gap keep whole,
separate targets. A layer that lowers the token packs them tighter, down to `container.size`, and accepts shared
target area.

Parts: `container`, `ring`, `fill`, `label`. (Each native radio has a name of its own: WebKit's Tab otherwise skips from
one nameless radio in a shadow root to the next.)

## `<tanrei-switch>`

A setting that takes effect at once, with a handle that follows a finger dragged along the track
(`specs/switch.spec.json`, SWT-1…21).

```html
<tanrei-switch label="Wi-Fi" checked></tanrei-switch>
<tanrei-switch label="Dark mode" checked-icon="check" unchecked-icon="close"></tanrei-switch>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `checked` | boolean | `false` | whether it is on; the attribute is the form's default |
| `disabled` | boolean | `false` | reflected |
| `label`, `labelHidden` / `label-hidden` | | | as the checkbox's |
| `checkedIcon` / `checked-icon`, `uncheckedIcon` / `unchecked-icon` | string | `""` | a glyph name of the system's icon set, shown in the handle while on / off; empty shows none |
| `name`, `value` | web only | `""`, `"on"` | form participation (submits `value` while on) |

| Event | When |
|---|---|
| `input`, `change` | the user switched it — by a tap, Space, or the release of a drag; `change` is `CustomEvent<{ checked: boolean }>` |

A native checkbox with `role="switch"` — announced on / off, never as a checkbox. The layout box is the track
(`track.width` × `track.height`, `track.shape`, an inset outline and the fill inside it). The handle's center runs on the
track's midline, half the track height from the inline-start end when off and from the inline-end end when on — the
left in RTL (`:dir(rtl)`). The handle is a circle with its condition's color, size and elevation in each state (the
default and m3-like grow it under a press, at once; cupertino raises it), at least `handle.size-with-icon` while it
shows a glyph; the round container (`container.size`) is centered on the handle, moves with it, and takes no room. A
glyph is drawn with `iconGlyph()` at `icon.size` in the family and fill of its own condition, both glyphs at
`icon.weight` (`--tanrei-comp-switch-icon-weight`, the weight of a control's own mark: 500 in the default system, where
the icons are 300, so the mark holds up beside its track; the glyph box stays `icon.size`, SWT-12, and the weight is the same through a drag's
cross-fade, SWT-19); its optical size is the box's, clamped to `sys.icon.optical-size` (see Icons). Parts: `track`, `handle`, `container`, `icon` (one per glyph prop that is set), `label`.

**One progress draws it (SWT-13, SWT-19).** `--_tanrei-switch-progress` is a custom property of the shadow `.root`
that no one registers: 0 while off, 1 while on. Both conditions' tokens of the current state are there at once, and
every part that differs between them is drawn at the progress by a REAL property that is linear in it:

- the handle's place is the thumb's `translate`;
- the track's fill and outline, the handle's color and the container's are each two layers (`.fill`, `.paint`, `.tint`:
  `.off` in the unselected condition's color at an opacity of 1 − progress, `.on` in the selected one's at an opacity of
  progress), added in a group of their own (`mix-blend-mode: plus-lighter`): the sum is the linear interpolation of
  the two colors, premultiplied, in sRGB — what `color-mix(in srgb, …)` computes — whatever their alphas;
- the two elevations and the two glyphs are layers likewise (the unselected one under the selected one);
- the handle's size is the unselected size and a share of two rulers — as tall as the selected size is more than it,
  and less (`.sizer`) — so that it is `unselected + (selected − unselected) × progress` with no arithmetic a
  transition would have to redo;
- the label, one element, is `color-mix()` of its two colors (one color in every system the package ships).

A change of `checked` changes the progress in one step, and each of those properties transitions over
`motion.selection-*` (the fast spatial spring) — one duration and one curve, so every frame is one progress. A state
changes a layer's own color, or a ruler's own length, over `motion.state-*`, and a press at once. The two motions are
on different properties, so neither restarts the other: a moment of a tap's transition, under whatever state, is
exactly what a drag held at that place draws, and nothing has a threshold. A product that styles `::part(track)` or
`::part(handle)` styles the part's box: its color is its two layers'.

Why not a registered `<number>` that transitions (which it was): one registered custom property in a document makes
every transition that starts on a page of the tokens cost Chromium 0.7 ms an element ("A page that changes its tokens
at run time", above), and a switch is on many pages.

**The drag (SWT-19 to SWT-21).** Pointer Events on the control — the track, the handle and the minimum target around
them, not the label — with touch, a pen or the primary mouse button. Past 8 px along the track, further than across it
(`SheetDrag`, the sheets' slop and their 0.5 px/ms fling), the switch takes the drag: it captures the pointer, stays
pressed (so the handle is at its pressed size: 28 in the default and m3-like), and writes the progress in the frame of
each move, the handle's center under the pointer and kept between its two positions (mirrored in RTL). Taken away from
the handle, the handle comes to the pointer over `motion.state-*`, following it meanwhile. `touch-action: pan-y` leaves
a vertical drag to the page. Until the release nothing but the drawing changes: `checked`, `aria-checked`, the form
value and the events wait. The release chooses the side a fling is toward, else the nearer side (the other condition
from the middle on); a change sets `checked` and fires one `input` and one `change`, and either way the progress goes
from where the pointer left it to the condition's over `motion.selection-*`. The `click` that follows a taken drag is
swallowed. Escape (spent on the drag: it does not reach the page), `pointercancel`, a lost capture, `disabled` and a
`checked` set by the product cancel: the look returns and nothing fires. With reduced motion the handle still follows
the pointer, without the catch-up, and lands at once.

**Fallbacks.** Nothing is registered, and nothing needs to be: the switch is the same on a page whose tokens came from
somewhere else. A browser without `mix-blend-mode: plus-lighter` draws the selected layer over the unselected one:
the same at rest, and a little thinner than the mix on the way. In forced colors the system
colors switch with the condition, not with the progress (the track and the handle draw them themselves, and the layers
are not drawn); the handle still travels.

## `<tanrei-card>`

A group of related content set apart from its background, which can also be one action that opens what it shows
(`specs/card.spec.json`, CRD-1…17).

```html
<tanrei-card>
  <h3 class="tanrei-text-heading-5">Quarterly report</h3>
  <p class="tanrei-text-body">Revenue grew 12% over the previous quarter.</p>
  <tanrei-button variant="text">Share</tanrei-button>
</tanrei-card>

<tanrei-card variant="elevated" interactive label="Quarterly report">…</tanrei-card>
<tanrei-card flush><img src="cover.jpg" alt="" /><div style="padding: var(--tanrei-comp-card-container-padding)">…</div></tanrei-card>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `elevated` \| `filled` \| `outlined` (+ values a layer adds) | `outlined` | how the card separates from its background: depth, tone or an edge — pick by the background; reflected |
| `interactive` | boolean | `false` | the whole card is one action with the button role, and emits `click`; reflected |
| `disabled` | boolean | `false` | an interactive card takes no action, leaves the focus order and dims as a whole; ignored unless `interactive`; reflected |
| `inset` / `flush` | boolean | `true` | insets the content by `comp.card.container.padding`. An HTML boolean attribute cannot default to true, so the attribute is the inverse: `flush` (`inset = false`) lets the content reach the edges; content that bleeds pads its own text with `--tanrei-comp-card-container-padding` |
| `label` | string | `""` | the accessible name: of the action when interactive (normally its heading's text), of a named group otherwise |
| `href` | string | `""` | the destination — a URL, a path or a fragment. Not empty, the whole card is one link — an `<a href>` around the slot — whether `interactive` is set or not; no mark is drawn for `target="new"`, the content is yours (CRD-19; see "A control with a destination is a link"). White space is none; a `javascript:` address or one that cannot be read is refused and reported (CRD-23) |
| `target` | `same` \| `new` | `same` | where it opens: here, or a new tab or window (`target="_blank"` with `noopener`). `_self` and `_blank` are read as those two; anything else is `same`, reported. Ignored without `href` |
| `targetLabel` / `target-label` | string | `""` | what is read after the link's name while `target` is `new` ("opens in a new tab") — your words; empty is reported (CRD-21). Ignored otherwise |
| `rel`, `download` | string \| `null` | `null` | web only: forwarded to the anchor (`target="new"` adds `noopener` to `rel`). Ignored without `href` |
| `type` | `button` \| `submit` \| `reset` | `button` | web only: what a press does to the button's form — nothing, ask it to submit, ask it to reset (BTN-27, BTN-28). Anything else is `button`, reported; a toggle and a link ignore it, reported (BTN-33). Reflected, the default not |
| `name`, `value` | string | `""` | web only: the pair sent with the form when this button submitted it; nothing while `name` is empty (BTN-31) |
| `form` (attribute) | a form's id | — | web only: the form the button belongs to where it stands outside it; the platform's own attribute. The `form` property is read-only and returns the form (BTN-29) |

| Event | When |
|---|---|
| `click` | an interactive, enabled card was activated: a pointer press anywhere on it, **Enter** on key-down, **Space** on key-up (as a native button; a Space released after focus left does nothing), assistive technology, or `element.click()` — once each. A disabled interactive card swallows every click that reaches it |

**Content.** The default slot, laid out by the product: the card insets it (logical padding, so RTL mirrors), clips it to
its corners, and hands it the variant's and state's `content.color` as the inherited `color`. It sets no text style:
text in a card takes the page's, so set it with the text utilities (`.tanrei-text-body` for running text, `heading-5`
for a title — CRD-13's "plain text takes `sys.typescale.body`" is for platforms that must style a bare string; the
web's baselines stage their text in `.tanrei-text-body`). The outline of the outlined variant is a layer above the
content (`::part(outline)`), so media that bleeds to the edges, even one that stacks itself with `z-index`, never covers
it. The card has no height of its own.

**Semantics.** Not interactive: no role and no focus handling at all — the content keeps its own semantics and its own
tab stops — or `role="group"` named by `label`. Interactive: a shadow `<div role="button" tabindex="0">` around the slot
(a `<button>` cannot hold block content), `aria-label` from `label`, `aria-disabled="true"` and no tab stop while
disabled. The host delegates focus to it, so `element.focus()` focuses an interactive card and does nothing on a plain
one (the delegate is only ever searched in the shadow tree, never in the slotted content). Without a `label` the name is
the whole content, merged, and a debug build reports it (CRD-14). **Nothing interactive may be nested in an interactive
card** (assistive technology cannot reach it and its press would activate the card too): on every `slotchange` a debug
build inspects the slotted content — native controls, links, anything with a `tabindex` or editable, widget roles, and
custom elements whose shadow tree holds one (a `<tanrei-button>`) — and reports the first it finds (CRD-15). Content
added deeper than the slot's own children, after the fact, is not seen.

**Clicks on a card that is not interactive.** The card itself never produces one: Enter and Space do nothing and
`element.click()` does nothing. A click on its content is the content's own DOM event and bubbles through the card, as
it would through any element.

**Everything else is Button's**: the state precedence (only while interactive — a plain card answers no state), the
minimum target, press-hold, the four `pressed-feedback` answers (the ripple grows under the content and the outline),
ring or glow (never clipped: the clip is a box inside the container), corner smoothing on the container with the clip,
the outline and the ring concentric with it, and the state motion of the colors, the elevation and the opacity, from
the same primitives and the `comp.card.*` tokens. Parts: `container`, `content`, `outline`. Forced colors: a system-color
edge on every variant.

## `<tanrei-carousel>` and `<tanrei-carousel-item>`

A row of visual items that scrolls sideways around one item in focus, each item opening what it shows
(`specs/carousel.spec.json`, CRL-1…38 and CRL-40).

The carousel is as wide as its parent (CRL-8). In a parent that is as wide as its content — a table cell, an inline
block, a flex item that is not stretched — it has a width of its own, which no item changes: one hero (`item-width`, or
`comp.carousel.container.large-width`) and `comp.carousel.layout.padding-inline` on each side. That is also its least
width as a flex or grid item; give it `min-width: 0` (or a width) where the row may be narrower.

```html
<tanrei-carousel label="Walks near you">
  <tanrei-carousel-item label="Coast path, 12 photos"><img src="coast.jpg" alt="" /></tanrei-carousel-item>
  <tanrei-carousel-item label="Old forest, 8 photos"><img src="forest.jpg" alt="" /></tanrei-carousel-item>
  …
</tanrei-carousel>
<tanrei-carousel loop scale-others label="Featured walks">…</tanrei-carousel>
<tanrei-carousel hero-alignment="start" fixed-width free-scroll item-width="160" label="Recently played">…</tanrei-carousel>
<tanrei-carousel indicator autoplay autoplay-progress label="Today's picks"
  play-label="Play the slideshow" pause-label="Pause the slideshow">…</tanrei-carousel>
<style>
  tanrei-carousel-item img { inline-size: 100%; block-size: 100%; object-fit: cover; }
</style>
```

| `<tanrei-carousel>` | Type | Default | |
|---|---|---|---|
| `heroAlignment` / `hero-alignment` | `start` \| `center` | `center` | where the hero (the item in focus) sits: centred with the others on both sides, or at the inner start edge with the others after it. An unknown value is drawn as `center` and reported (CRL-24); reflected. |
| `itemWidth` / `item-width` | number (CSS px) \| `null` | `null` | the width the hero is laid out at; `null` takes `comp.carousel.container.large-width`. Fluid: the hero is kept between a floor and a cap (CRL-9); fixed: every item is this wide, at most W. Not a positive number is `null`, reported (CRL-24) |
| `fluidWidth` (attribute `fixed-width`, inverted) | boolean | `true` | the others narrow toward the edges and grow as they come into the hero's slot (CRL-10); `false` makes every item the hero's width, the last one cut by the edge |
| `contentAlignment` / `content-alignment` | `center` \| `toward-hero` | `center` | fluid only: where a narrowed item's content is anchored — its middle, or the edge toward the hero (CRL-15). Unknown: `center`, reported; reflected |
| `scaleOthers` / `scale-others` | boolean | `false` | draws the items other than the hero smaller, down to `container.min-scale`, following the scroll (CRL-26): less tall, centred on the row, the content at that scale, the corners at the token radius. With fixed widths the smaller items are also narrower and close up, one gap from their neighbours; with fluid widths the widths stay |
| `snap` (attribute `free-scroll`, inverted) | boolean | `true` | a scroll ends at a resting position (CRL-14); `false` lets it rest wherever it ends |
| `loop` | boolean | `false` | the row has no end: past the last item comes the first (CRL-27); with two or more items |
| `indicator` | boolean | `false` | draws the controls row with one dot per resting position, the current one stretched as the row scrolls (CRL-29 – CRL-31) |
| `autoplay` | boolean | `false` | the row moves on by itself, one resting position every interval (CRL-32 – CRL-34); draws the controls row with the playback control |
| `autoplayInterval` / `autoplay-interval` | number (ms) \| `null` | `null` | how long the row rests before autoplay moves on; `null` takes `comp.carousel.autoplay.interval`. Not a positive number: `null`, reported (CRL-24) |
| `paused` | boolean | `false` | autoplay paused, by the person (the playback control, which fires `pausedchange`) or by you (which fires nothing); reflected |
| `playbackControl` (attribute `no-playback-control`, inverted) | boolean | `true` | draws the playback control while autoplay is on (CRL-35). Keep it: without it a person cannot stop the motion (WCAG 2.2.2) |
| `autoplayProgress` / `autoplay-progress` | boolean | `false` | fills the current dot with the time until autoplay moves on (CRL-36); needs `indicator` |
| `playLabel` / `play-label`, `pauseLabel` / `pause-label` | string | `""` | the playback control's accessible name while paused and while playing; required while it can be drawn (CRL-20) |
| `label` | string | `""` | names the list and the indicator ("Recently played"); required — empty is reported (CRL-20) |

`fluidWidth`, `snap` and `playbackControl` default to true, and an HTML boolean attribute cannot, so their attributes are
the inverses. A single large hero is
`hero-alignment="start"` with an `item-width` at least as wide as the carousel (the hero takes its cap); an uncontained
row is `hero-alignment="start" fixed-width free-scroll`.

| `<tanrei-carousel-item>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the item's accessible name — what its content shows; the content itself is not read. Required (CRL-20) |

| Event | When |
|---|---|
| `click` (on the item) | the item was activated: pointer, touch, Enter (key-down), Space (key-up), `item.click()`. A touch that turns into a scroll activates nothing: the browser cancels the pointer (CRL-1) |
| `pausedchange` (on the carousel) | the person paused or played autoplay with the playback control; `event.detail.paused` is the new value. Not fired when you set `paused`, nor for a hold |

**Geometry (CRL-8 – CRL-13, CRL-15).** The carousel is as wide as its parent and `layout.height` tall, plus
`controls.height` when it has a controls row (size it with CSS `block-size` to change the row's height; it is never less
tall than the target). W is its width less `layout.padding-inline` twice. With fluid widths the hero's slot is H — the
item width held between a floor and a cap — and the rest of W is filled by a medium and a small slot, or by one small
one (CRL-10's closed formula), on the side the hero leaves free: on both sides centred, after it at the start. A row too
narrow for that is laid out as fixed widths, every item W wide. Each
item's content is laid out at the hero's width and the item's height, clipped to its corners, so a narrow item shows
part of it and the content glides as the item grows: give an image `inline-size: 100%; block-size: 100%;
object-fit: cover`. The content's box is placed physically, so a right-to-left row never flips it.

**One gap at every scroll position (CRL-12, CRL-13, CRL-26, CRL-40).** Every slot starts `layout.gap` beyond the drawn
end of the one before it, and an item's start and width are interpolated between the two slots around its position, so
two neighbours are one gap apart wherever the row is — at rest, in a drag, a settle, an advance. Three things keep that:
beyond the last slot on each side of a fluid row lies an edge slot of **no width**, one gap further (before a hero at the
start, one gap before the hero slot), so an item grows from nothing as it comes in and is not drawn at or beyond it (it
stays in the list for assistive technology, and takes focus); with `scale-others` and fixed widths the smaller slots are
narrower and closed up, and the item's box **is** the drawn container (nothing shrinks inside an unscaled box); and every
item is placed in one pass from one scroll position, with no timing of its own. Nothing is rounded before the items are
placed; then each drawn start is rounded to a device pixel (`devicePixelRatio`) and each end is the next start less the
gap as that ratio rounds it, so the rounding falls on a width and never on a gap (8 CSS px is 9 device pixels in every
gap at a ratio of 1.1, not 8 in one and 9 in the next). `zoom` set in CSS on an ancestor is not part of that ratio.

**Scrolling (CRL-12 – CRL-14, CRL-21, CRL-23, CRL-27).** A native horizontal scroller (the `row` part, no scroll bar)
whose track is as long as the scroll range: wheel, trackpad, touch and pen scroll as the platform does, and Shift turns
a vertical wheel sideways. Every item is placed from the scroll offset on a stage that stays in view, so items change
width as they pass the slots. With `snap`, a scroll that ends settles at a resting position over
`motion.scroll-duration` / `-easing` — at once under `prefers-reduced-motion: reduce`; fixed widths rest at every step
and at the end. A touch released faster than 0.5 px/ms (measured over the scroll offsets of its last 80 ms) is a fling
and goes on to the next position; otherwise the nearest wins. The end of a scroll is `scrollend`, or 100 ms without a
scroll event where an engine sends none (Firefox after a wheel). A wheel, a touch or a press takes over from a running
settle, and so does any other scroll (yours, the browser's). With `loop` the track is several turns long and is moved
back by whole turns while the row is at rest, so no end is ever reached and each item is drawn once. A new width, new
items or a new axis keep the item in the hero's slot where it was, at once. Right-to-left mirrors the row and the
scroll direction (`scrollLeft` goes negative). The direction is the one the carousel inherits — `dir` on any ancestor —
and a change of it while the page runs arranges the row again, the resting item kept (`DirectionController`,
`src/primitives/direction.ts`: a hidden probe whose width depends on `:dir()`, watched by a ResizeObserver, tells a
script what CSS follows by itself; the slider places its value indicators again the same way).

**Keyboard and semantics (CRL-17 – CRL-19, CRL-30, CRL-31).** The `list` part is `role="list"` named by `label`; each
item's host is a `listitem` with `aria-posinset` / `aria-setsize`, around a shadow element with the button role named by
the item's `label`, its content `aria-hidden`. Out-of-view items stay exposed, in order. The row itself is no Tab stop
(`tabindex="-1"`: Firefox makes a scroller one). The items are one Tab stop (a
roving `tabindex` on the items' buttons): the item that last had focus — a click focuses an item too — or else the
hero. Right / Left Arrow (mirrored in right-to-left) move to the next and previous item, wrapping only with `loop`, Home
and End to the first and last; focus shown as keyboard focus (`:focus-visible`) brings the item to the hero's slot — as
near as the range allows — over the scroll motion. A pointer's focus scrolls nothing. The indicator is a second Tab stop:
one `slider` named by `label`, whose value is the current resting position ("3 of 5"); the arrows (Up and Down too), Home
and End move the row, and a press or a drag moves it to the nearest dot, focus staying on the indicator. The playback
control comes first in Tab order, a native button named by `pause-label` or `play-label`.

**Autoplay (CRL-32 – CRL-36).** While `autoplay` is on and not `paused`, the row rests for the interval and then moves
to the next resting position over `autoplay.motion-duration` / `-easing` (from the last to the first, or on round the
ring with `loop`). The time holds while the pointer is over the carousel, while focus is within it, while it is pressed
or touched and while the page is hidden, and goes on from where it held; a person's scroll starts it from zero once the
row is at rest again. Pressing play lifts the hover and focus holds until the pointer or focus leaves. Where motion is
reduced autoplay does not run (it resumes if the preference changes). With `autoplay-progress` the current dot fills
over the interval and stops with every hold: one animation of the interval's length on the fill (its scale along the
row, at an even pace), which the browser runs — the carousel puts it at the time its clock has counted when the clock
starts or stops, and writes nothing while it fills. A screenshot that finishes animations shows the dot full.

**States (CRL-2 – CRL-7, CRL-16, CRL-22).** Because an item's content usually covers it, hover, focus and press are a
**state layer over the content** (the `state-layer` part): `item.<state>.state-layer.color` at
`sys.state.hover- / focus- / pressed-state-layer-opacity`, clipped to the corners; the container under the content keeps
the resting `item.container.color`. The content color (`item.<state>.content.color`, inherited), opacity and corner shape
are the state's. Everything else is Button's, from the same primitives: the precedence, press-hold, the four
`pressed-feedback` answers — overlay draws the pressed layer; **ripple grows the pressed layer over the content** and dim
applies the pressed opacity, both leaving the layer with the state under the press; none changes nothing — ring or glow
**drawn inside the item** over the content (the row would clip one outside), corner smoothing on the container with the
clip, the layer, the ripple and the ring concentric with it, and the state motion. The indicator and the playback
control take the same states from `controls.<state>.*`, with the ring outside, and `controls.shape` for their corners.
Under cupertino, which draws no state layer elsewhere, a hovered or focused item shows its layer.

**Targets (CRL-4, CRL-37).** An item's hit area is its drawn container with half of `layout.gap` on each side — `sys.target.touch` for
the narrowest small item with the default tokens — and never less than `sys.target.pointer` (`touch` for a coarse
pointer) for an item that fills a slot; an item on its way to or from an edge slot is narrower than any slot and gets no
more than that, so it never covers its neighbour's. The content takes no pointer events, so a press anywhere on the item is the item's. The playback control's hit
area is at least the target, centred on it; the indicator's is as tall as the controls row and at least
`sys.target.touch` wide.

**Glyphs (CRL-38).** The playback control draws `pause` and `play_arrow` from the icon set (`dist/icons.css`). Until
the icon font can draw them it keeps its box and shows nothing — never the glyph's name — and keeps its accessible name.

**Text size (CRL-25).** The carousel holds no text: the type dial (a product's text size) leaves its height, slots and
items as they are. Its sizes derive from `dial.size.unit` (0.25rem), as every component's do, so a larger root font size
scales the whole row with the rest of the page.

**Content (CRL-20).** An item is one action: its content holds nothing interactive. A debug build reports an interactive
element in it on every slot change, an item without a label, a carousel without one, a playback control without its
labels and an indicator whose dots do not fit. Parts: `row`, `list`, `controls`, `indicator`, `dot`, `playback`
(carousel); `container`, `content`, `state-layer` (item).

## `<tanrei-text-input>`

The box people type in, and everything typed in it: one line of text, or several that follow the text or are resized by
a grip, or a date or a time entered unit by unit in the locale's form — or code, held exactly as it is written — with
icons, a prefix and a suffix, a picker button, and, in the two looks that have one, the label that floats inside the
box (`specs/text-input.spec.json`, TXI-1…63; `listing: advanced`). **It draws no label row, no requirement tag, no
help, no error text and no count** (TXI-63): those are the rows of the `<tanrei-field>` that frames it — and
`<tanrei-text-field>`, below, is the two as one element, which is what a form uses. The bare input is for a place
whose label stands elsewhere: a filter in a toolbar, a cell of a table, a row with its label beside it.

```html
<!-- Bare: its own label is its accessible name (a stacked input draws none; a filled or an outlined one floats it). -->
<tanrei-text-input name="q" type="search" label="Filter tokens" placeholder="Filter">
  <span slot="leading-icon">search</span>
</tanrei-text-input>

<!-- Framed by hand — what <tanrei-text-field> is, one level down. The Field names it, describes it and marks it. -->
<tanrei-field label="Email" required supporting-text="We never share your address.">
  <tanrei-text-input name="email" type="email" autocomplete="email"></tanrei-text-input>
</tanrei-field>

<!-- A count by hand: the input keeps it (countText), the Field draws it (count-text), the product carries it. -->
<tanrei-field id="f" label="Display name" count-text="0/40"><tanrei-text-input id="i" counter maxlength="40"></tanrei-text-input></tanrei-field>
<script>i.addEventListener('input', () => (f.countText = i.countText));</script>
```

- **A block as wide as its place**, framed and bare alike (`display: block`, TXI-63). It has no width of its own: a narrower box is a narrower
  place. The one width it keeps is the one a person gives it with the resize grip (`resize-axis="both"`, TXI-39).
- **What it says to its Field, and takes from it** (TXI-62) goes through the Field's own connection
  (`src/primitives/field.ts`; see `<tanrei-field>`): it says `drawsLabel` while its variant floats a label, `inset` —
  where its text starts and the padding it keeps at its end, as lengths of its own size tokens (`INSET()` in its
  styles: the same sums the box is laid out by) — and `refusal`, a date's or a time's entry error with `invalidText`
  or `unavailableText`. It takes the name, the description, required, invalid and disabled, and `labelHidden` and
  `requiredMark` (`asterisk` | `none`) for a floating label. No Field, or one that answers none of the new values: it
  is drawn as a bare input.
- **The name** is its own `label`, else its Field's; **the description** is its own — the prefix and the suffix while
  shown, the count — and then its Field's, in one `aria-describedby` (the count and the Field's words are hidden
  elements of its shadow root); the words of an entry error are part of it while no Field frames the input (TXI-30).
- **Required** is its Field's to say (TXI-23): it has no `required`. A bare input that must be required is framed by
  a Field with `label-hidden`.
- **`countText`** (read-only) is the count it keeps while `counter` is set — `12/40`, or `12` without `maxlength` —
  new in its own `input` event and at once for a value or a `maxlength` the product sets. It is described and announced
  (after a one-second pause) by the input, and drawn by nobody but a Field that is given it (TXI-19, FLD-27).
- **`value` is the person's at every moment** (W5): the browser's own `input` event is composed and
  reaches a capturing listener on an ancestor before the element's own listener has run, so `value` reads what the
  person has just done to the native element — cut to `maxlength` as the element is about to cut it — until the element
  has taken it. `event.target.value` is the new value in every listener, of this element and of one composed around it.
- **A member of a composed element**: `static parts`, `FormSays` for what it tells its form, `formOf()` for Enter,
  `focus()` that goes where a press goes (the input; in a date field the segment TXI-43 names). A disabled input
  submits nothing — its own `disabled`, a fieldset's, or its Field's.

> In the paragraphs below, "the field" means this control, as the spec's sentences do; where one speaks of the supporting row, the error text or the
> requirement, read the Field's section — the input says and takes what is listed above.

In a box that scrolls, the field's parts — its live region too — are laid out against the field (`.field` is
`position: relative`), so the box cuts them and the page does not scroll sideways to reach them.

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `stacked` \| `filled` \| `outlined` (+ values a layer adds) | `stacked` | reflected. The default system ships `stacked` only: `filled` and `outlined` still work there, with a development warning; the Material presets and cupertino ship all three. A value a layer adds is laid out as `stacked`, with its own tokens (TXI-9) |
| `size` | `medium` \| `large` (+ values a layer adds) | `medium` | minimum height `comp.input-box.container.height.*` (48 / 56 in the default system); reflected |
| `type` | `text` \| `email` \| `password` \| `number` \| `search` \| `tel` \| `url` \| `code` \| `date` \| `time` \| `date-time` | `text` | the keyboard and semantics (below); an unknown type behaves as `text` and is reported; reflected, except the default: a field written without `type` is not given `type="text"` |
| `value` | string | `""` | the text; for `date`, `time` and `date-time` the ISO 8601 form of what the segments give (`2026-09-27`, `14:30`, `2026-09-27T14:30`), or empty while a segment is empty or the value is not available. Setting it shows it and fires nothing; setting it to what it already is leaves a half-filled row alone (TXI-46). The `value` **attribute** is what a form reset returns to |
| `label`, `labelHidden` / `label-hidden` | string, boolean | `""`, `false` | the accessible name, drawn or not; an empty label renders and is reported |
| `placeholder` | string | `""` | shown only while the label is not in the input line (above a stacked field, floated, or not drawn) — never the name. Ignored (and reported) by a date or time field, whose empty segments each show their own: `yyyy`, `mm`, `dd`, `hh`, `mm`, and the locale's name for the morning |
| `error` | boolean | `false` | the error parts, `aria-invalid`; validation is the product's; reflected |
| `disabled`, `readOnly` / `readonly` | boolean | `false` | reflected |
| `multiline`, `minRows` / `min-rows`, `maxRows` / `max-rows` | boolean, number, number | `false`, `2`, `0` | a `<textarea>` of `minRows` to `maxRows` lines (0: no limit; a `minRows` below 1 is 1); ignored (and reported) for `password`, `date`, `time` and `date-time` |
| `resize` | `auto` \| `manual` \| `fixed` | `auto` | `auto`: the height follows the lines, with an animated change, and scrolls past `maxRows`; `manual`: it starts at `minRows` and is resized with the grip, between `minRows` and `maxRows`; `fixed`: `minRows` lines. An unknown value is `auto`, reported |
| `resizeAxis` / `resize-axis`, `resizeLabel` / `resize-label` | `vertical` \| `both`, string | `vertical`, `""` | what the grip resizes, and its accessible name: the instance's, else the product's words; without it the grip is drawn, works and has no name (TXI-41) |
| `noWrap` / `no-wrap` | boolean | `false` | the spec's `wrap: false` (an HTML boolean cannot default to true): every line of a multi-line code field stays on one row and scrolls sideways inside the container. Read only while `type` is `code` and `multiline` is set; set anywhere else it is ignored and reported once; reflected |
| `maxLength` / `maxlength` | number | `0` | the most **user-perceived characters** (grapheme clusters, `Intl.Segmenter`) the user can enter — not the native attribute, which counts UTF-16 units. Ignored for the date types |
| `counter` | boolean | `false` | keeps the count (`12/40` with `maxLength`): described, announced and read as `countText`; a Field draws it |
| `prefixText` / `prefix-text`, `suffixText` / `suffix-text` | string | `""` | fixed text around the value, shown while the label is not in the input line |
| `autocomplete` | string | `""` | the autofill hint (an HTML autofill field name), passed to the native element |
| `locale` | string | `""` | BCP 47; how a date or time is read and written. Empty: the nearest `lang` attribute (through shadow roots), then `navigator.language`. An unknown tag uses `en-US` and is reported |
| `min`, `max` | string (ISO 8601) | `""` | the range a date or time field accepts from the person; a malformed limit is treated as empty and reported, and so is `min` later than `max` |
| `disabledDates` / `disabled-dates` | string[] (the attribute: a space-separated list or a JSON array) | `[]` | dates a date or date-time field does not accept from the person — the list the product gives its date-time picker. An entry that is not an ISO date is ignored and reported |
| `invalidText` / `invalid-text`, `unavailableText` / `unavailable-text` | string | `""` | the entry error's text: a half-filled row, or a value before `min`, after `max` or listed |
| `segmentEmptyText` / `segment-empty-text` | string | `""` | what assistive technology reads as the value of an empty segment: the instance's, else the product's words; without it an empty segment has no value text (TXI-52) |
| `picker`, `pickerLabel` / `picker-label` | boolean, string | `false`, `""` | the picker button of a date or time field and its accessible name (required while shown; an empty one is reported). Ignored, and reported, for other types |
| `name` | web only | `""` | form participation |

| Slot | |
|---|---|
| `leading-icon`, `trailing-icon` | an icon at the start or end: a glyph name of the system's icon set, an `<svg>` or `<img>`, or (trailing) the product's own icon-only `<tanrei-button>`, which keeps its size and is its own tab stop after the input |

| Event | When |
|---|---|
| `input` | every user edit — typing, deleting, pasting, dictation, autofill, an input method — once, after `value` changed; the native composed event (`InputEvent`, `isComposing` during a composition). A date or time field fires it (a plain `Event`) only when its value changes — its last segment is filled, a filled row is edited, or it is emptied — not for a segment that leaves the value empty. Never for a value the product sets |
| `change` | the user committed a changed value: focus left the field (a date or time field: its segments and its picker button), or Enter in a single-line field (composed, bubbling) |
| `action` | Enter in a single-line field, after `change`: `CustomEvent<{ value }>`, cancelable. Inside a form the field then calls `form.requestSubmit()`, as a native input does — unless `action` was cancelled |
| `pickerrequest` | the picker button was activated: `CustomEvent<{ value, type, min, max }>` — the empty value while the row is half-filled or not available, with nothing committed and no entry error raised for it. The product presents a picker (a DateTimePicker in the matching mode, docked to the field) and sets `value` to the picked value; the field presents nothing and moves no focus |
| `entryerror` | a date or time field was committed half-filled (`invalid`) or with a value that is not available (`unavailable`): `CustomEvent<{ reason: 'invalid' \| 'unavailable', text }>` with the row's text as drawn, after the `change` (if the value changed) |

**Resize (TXI-37–TXI-41).** The `<textarea>` keeps `resize: none` and shows `--_rows` lines of its text style, which the
element writes: the lines of the text (auto), the lines the person gave it (manual), or `minRows` (fixed). **Auto** is
measured from the textarea's own `scrollHeight` — after every edit and value the product sets (animated: the element
marks the textarea `data-resizing` for that one change, continuing from the height then shown), and when its width or
its line height changes (a ResizeObserver; at once). What moves over `motion.resize-*` is the room the textarea takes,
never its text (TXI-38, TXI-51): the textarea's box is the new number of lines at once — a box as tall as its text has
nothing to scroll, so the browser cannot scroll the first line away to show the caret — and `--_lag`, the lines the
room shown still differs by, goes to 0 as a bottom margin and as a `clip-path` that uncovers a new line from its top
while the container's bottom edge passes it. It
shows no scrollbar while every line fits. **Manual** draws the grip: a `role="separator"` focus stop
(`aria-orientation="horizontal"`, `aria-valuenow|min|max` in lines, `aria-controls` the textarea) holding `drag_handle`
or `drag_indicator`, never mirrored, hidden until the icon font can draw it. Its hit area is the minimum target, centred
on the glyph and reaching past the container. A drag (pointer capture; the press never reaches the text) follows the
pointer; Down / Up Arrow add and remove a line, Home and End go to `minRows` and `maxRows` (without one: every line of
the text), Enter, Space or a click that ends where it began fit the height to the text and back. With
`resize-axis="both"` a drag and the horizontal arrows (the one toward the end edge widens) set the **host's inline
size** — never narrower than its paddings, its icons and `sys.target.touch`; the host also gets `max-inline-size: 100%`
while it has none of its own, so it is no wider than its containing block. The size the person gave lasts until
`resize`, `resizeAxis`, `minRows` or `maxRows` changes (the host's own inline styles are then put back).

**Dates and times: the row of segments (TXI-28–TXI-33, TXI-42–TXI-47).** The stated exception to the native element: a
`role="group"` named by the label, `dir="ltr"` in every layout direction, holding one `role="spinbutton"` per unit in
the locale's order (`Intl.DateTimeFormat#formatToParts`) with the locale's separators between them (`aria-hidden`).
Each segment is `contenteditable` with `inputmode="numeric"` so that a touch keyboard opens, but its text is the field's
alone: every `beforeinput` is cancelled and read — a digit is typed, several characters at once are a whole text
(dictation, autofill) — and a composition, which cannot be cancelled, is read when it commits and then painted over.
Names are `Intl.DisplayNames(locale, { type: 'dateTimeField' })` + the label ("month, Start date"); the value text is
"9 – September", "2 PM", the period's name, or `segmentEmptyText`. Tab visits every segment; Left / Right move, Up / Down
step and wrap (an empty segment takes the device's clock), Page Up / Down step further, Home / End go to the range's
ends, Backspace removes a digit and then moves back; `copy`, `cut` and `paste` take and give the whole row. The focused
segment is drawn in `selection.color`, its number or placeholder in `selection.content.color`, with no caret. A filled segment is as wide as its digits (set at one width,
`tabular-nums`) plus `segment.padding-inline`, and keeps that width half typed and empty — except that an empty segment
whose placeholder is wider than its digits ("mm" in most faces) is as wide as the placeholder, so the row shifts by
that difference when such a segment takes its first digit; and an hour is written as the locale writes it, one digit or
two, so a filled hour is as wide as itself. In constraint validation a half-filled row is `badInput`, a value outside
`min`–`max` `rangeUnderflow` / `rangeOverflow`, a listed date a `customError`, and a required field without a value
`valueMissing`.

**The native element.** An `<input>` (a `<textarea>` while `multiline`) in the shadow root edits the text, so
input methods, autofill, selection, spelling and the clipboard are the browser's. It carries the semantics: `aria-label`
from `label` (the drawn label is `aria-hidden` so it is not read twice, and a `<label for>` so a click on it focuses the
input), `aria-describedby` → the prefix and suffix while they are shown, the supporting or error text and the counter,
`aria-invalid`, `required`, `readonly`, `disabled`. The host **delegates focus** to it and is **form-associated**:
`FormData`, submission, `form.reset()`, state restoration, a disabled `<fieldset>`, and `required` in constraint
validation (`validity`, `checkValidity()`, `reportValidity()`). **Types**: `number` is `type=text inputmode=decimal`
(nothing parsed), `email` and `url` are `type=text` with `inputmode=email|url`, no autocapitalization, autocorrection or
spelling — the native `email` / `url` types would trim the value and validate it, and validation is the product's —
`password` is `type=password`, `search` is `type=search` with `enterkeyhint=search` (a search box), `tel` is `type=tel`.
`date`, `time` and `date-time` render no native element — never the native date and time inputs, which draw the
browser's own picker and format — but a row of segments (below). The browser's own search-cancel and password-reveal
buttons are hidden. In a right-to-left field, `email`, `url`, `tel`, `number` and `password` values are laid out left to
right at the start (right) edge; a date or a time is one left-to-right row there too; other text takes its own
direction (`dir=auto`).

**Input methods (TXI-4).** While a composition is in progress the field writes nothing into the element, cuts nothing and
commits nothing: a value the product sets meanwhile — a controlled field echoing `value` back on every `input` — is kept
and applied when the composition ends; `maxLength` applies to the committed text; and a commit always produces an
`input` that is not composing (Chromium sends its last one before `compositionend`, so the field sends one more).

**States and looks.** Every part — container, active indicator, outline, label, label icon, input, placeholder, prefix
and suffix, icons, supporting text, counter, caret — and the edge widths come from the state's tokens of the current look
(plain, or `error.` while `error` or an entry error): hover is the container's, focus the input's by pointer as by
keyboard (a field shows where typing goes), disabled over all. There is no press: a press anywhere on the field outside
a slotted control and the picker button — a stacked label and its glyph included — focuses the input, and nothing is
drawn for it. **Focus is the field's own edge** — no focus ring ever; under `focus-style: glow` the container
also glows (`focusGlow()`). Selected text is highlighted in `comp.input-box.selection.color` and drawn in
`comp.input-box.selection.content.color` (`::selection`). The
minimum target extends the container vertically (a 48 container already is the touch target).

**Stacked (TXI-26).** The label above a stacked input is its Field's row (FLD-2); the input draws none. The
container has no edge at rest (`stacked.outline.color` is transparent); focused, a line of the focused outline color
and width is drawn **inside** the container's edge — an absolutely placed box with a border, following the corners
(`corner-shape: inherit`), so nothing inside moves as it appears; in error the same line is drawn at rest in
`stacked.error.outline.color` at `outline.width`. Hover is the state layer on the container. The placeholder and the
affixes show whenever the value is empty, because the label is never in the input line.

**Code (`type="code"`, TXI-53 … TXI-61).** A field whose value is written for a machine: a pattern, a
key, a snippet of JSON. It is the same field — frame, variants, sizes, states, form behaviour — with another input line.

- *One left-to-right row.* The prefix, the native element and the suffix stand in a `dir="ltr"` row (`.body`), and the
  native element carries `dir="ltr"` with `text-align: left`, so the value, its caret and its placeholder begin at the
  left in every layout direction and whatever the first strong character is — empty, holding `{` alone, or beginning
  with an Arabic string. It never takes the `dir="auto"` path of prose, also when `type` changes on a live element.
  Everything outside the row mirrors as usual: the label, the icons (the row keeps `container.gap` from each, written
  from the layout's side), the supporting row, the grip. An `email`, `url`, `tel`, `number` or `password` value is not
  changed: left to right at the field's start edge, the right.
- *The face.* `font-family`, `font-weight` and `letter-spacing` from `--tanrei-comp-text-input-code-typescale-*` on the
  row, at the input's own `font-size` and `line-height` — so no height moves — with `font-variant-ligatures: none` and
  `tab-size` from `--tanrei-comp-text-input-code-tab-size`.
- *Left alone.* On the native element itself: `spellcheck="false"`, `autocorrect="off"`, `autocapitalize="none"`,
  `translate="no"`, and `autocomplete="off"` only while the product gives no `autocomplete`. `autocorrect` and
  `autocapitalize` are read by touch keyboards (iOS Safari, Android Chrome) and cannot be observed on a desktop; no
  attribute turns off a device's text replacements or its curved quotation marks apart from `autocorrect`. A text area
  takes the plain text of a paste by itself, with each line break as one. No key is handled for code: Tab moves focus.
- *Wrapping.* By default `white-space: pre-wrap; overflow-wrap: anywhere`. With `no-wrap`, `wrap="off"` and
  `white-space: pre; overflow-x: auto`: the text area scrolls inside the container, whose width its content never sets
  (a text area's own width comes from its layout), and an auto-resized field is `--_bar` taller — what the box holds
  beyond its content and padding, which is a sideways scrollbar where the browser draws one that takes room, and
  nothing where it draws it over the content. A headless browser draws none, so that room is tested with a stand-in
 .
- *The grip in right-to-left.* A code field resized by hand has `padding-block-end` of `resize-grip.size` and
  `resize-grip.inset` on the text area: scrolling room after the last line, in the corner where a line of code begins.
  The box is the lines the field gives it, so the field is as tall as in a left-to-right layout.
- *What the browsers differ in.* A read-only field whose lines do not wrap is scrolled from the keyboard as each
  browser scrolls text it does not edit: with the caret in Firefox, with the arrow keys in Chromium (which draws no
  caret there), with Option and the arrow keys in WebKit. Firefox lays a text area out anew when the direction above it changes and
  returns it to its left edge.

**Multi-line: set from the top (TXI-51).** A multi-line field's first line stands at a fixed distance from the
container's top edge — where a single-line field of the same variant, size, label and text size draws its line (`--_first`:
half of `container.height` less half a line, or `padding-block` where enlarged text makes the field taller; under the
floated label's band in a filled field) — and the icons, a slot's Button, the prefix, the suffix and an outlined field's
resting label are centred on that line; every further line, the room `min-rows` asks for and the height given with the
grip lie below it, down to `padding-block`. Nothing above moves when the height changes; the grip and the supporting
row keep their distance from the bottom edge. A single-line field is not affected.

**Filled and outlined: the floating label (TXI-13).** It rests centred in the container (in a multi-line field: an
outlined one's on the first line, a filled one's where a single-line filled field rests it) and floats while the input is focused, the text is not empty, or the browser marks the field
`:autofill` — before script sees an autofilled value. Outlined: onto the top edge, centred on the line, with a gap of
`outline.notch-padding` on each side — the outline is three pieces, and the gap's width is a hidden copy of the label in
the floated style, so it follows the label's own width; beside a leading icon it floats to `padding-inline`, over the
icon. Filled: to the top of the container, at the input text. The label moves over `motion.label-*`; colors and widths
change over `motion.state-*`; both at once under reduced motion. A label that does not fit on one line in the width it
is given wraps and is never cut: two copies of the label that are never drawn, laid out as it is resting and floated,
give its line counts and the widest floated line (the element marks the field `data-label-wraps`). A resting label's
lines are centred in the container, which grows to hold them (from the first line of a multi-line field); a filled
field's band above the input line holds every floated line; an outlined field's last floated line sits on the top edge,
the room for the lines above it is reserved above the container, and the gap opens by the widest line. That room is kept
while the label rests, so no field changes height when its label floats. A label that fits is not affected. The
geometry is chosen by name (`data-layout` on the root): `filled` and `outlined`, and `stacked` for every other value.

**Dates and times (TXI-28–TXI-31).** The value is ISO 8601 with no time zone; the text is the locale's numeric form
("09/27/2026", "2026/09/27", "27.09.2026"; "2:30 PM", "14:30"; "09/27/2026, 2:30 PM"), from `Intl.DateTimeFormat`
(`formatToParts`, the Gregorian calendar, the locale's digits, a four-digit year). The narrow no-break space recent CLDR
puts before a day period is written as a plain space, because the person edits the text. While the person types the
text is never rewritten; after each change it is read (`src/primitives/locale-date.ts`): a date is three digit groups in
the locale's order (year first when the first group has four digits), a four-digit year and a day that exists; a time is
hours and minutes, 0–23, or 1–12 with the locale's day-period word or a / p / am / pm before or after; a date-time is a
date, then white space, a comma or `T`, then a time. Each `input` carries the available value the text reads as, or
empty, and a product that echoes it back keeps the typing. On commit (blur, Enter or the picker button) a readable,
available text is rewritten in the locale's form; any other non-empty text stays as typed, the value empties, `change`
(if the value changed) and `entryerror` fire once, and an **entry error** lasts until the next edit or until the product
sets `value`: drawn and exposed exactly as `error`, showing `invalidText` or `unavailableText` (else `errorText`),
announced when the field has focus, and reported to the form as `badInput`, `rangeUnderflow` or `rangeOverflow`. A value
the product sets is written in the locale's form and never checked against `min` and `max`.

**The picker button (TXI-32, TXI-33).** With `picker`, a date, time or date-time field that is not read-only shows a
`<tanrei-button variant="text">` (part `picker-button`) in the shadow root, after the trailing slot's content and
`container.gap` from it, showing `calendar_month` (date, date-time) or `schedule` (time) in its `icon` slot, at the
Button size with the field's size name (Button's `medium` for a size Button does not have). It reads Button's own tokens,
press, focus ring and target. Its glyph is centred where a trailing icon's would be: it stands in an icon-sized box and
overflows it evenly. Its native button carries `aria-haspopup="dialog"`; it is named by `pickerLabel`, disabled with the
field, and a focus stop after the input and any slotted button. Activating it commits the typed text, then fires
`pickerrequest`.

**Layout.** At least the size's height; a filled field that draws its label is at least `2 × padding-block-with-label +
one floated-label line + one input line` tall from the start. Icons are the named slots `leading-icon` and
`trailing-icon`: a glyph name of the system's icon set is drawn at `icon.size` in the unselected family and fill; an
`<svg>` or `<img>` fills the icon box. The label's start and end beside the icons are computed from `icon.size`
. The supporting row sits `supporting-text.gap` below the container,
aligned with the input text, the counter at its end at least `container.gap` away. Without a width of its own the field
takes its native element's intrinsic width. Announcements (an error that appears while focused, the count one second
after typing pauses) go through a polite live region in the shadow root. Parts: `container`, `outline` (a stacked
field's inner line), `active-indicator`, `label`, `label-icon`, `input`, `prefix`, `suffix`, `leading-icon`,
`trailing-icon`, `picker-button`, `supporting-text`, `counter`.

**A place for what was entered already** (TXI-64…66). The slot `entries` — `part="entries"`, a box of
none (`display: contents`) — stands in the row of the input, before the prefix and the native element. While it holds
content (`data-entries`, from the slot's `slotchange`), the row wraps: `entries.gap` between two items and before the
typing part, `entries.row-gap` between two lines, every item centred on its line and never wider than one
(`::slotted([slot='entries'])`: no shrinking, `max-inline-size: 100%`); the typing part's flex basis is
`entries.typing-min-width`, so it takes what is left of the last line while that is as much, and a line of its own
otherwise. The row's block padding is then `--_first` — where a single-line input draws its one line — so one line of
items is exactly the height of the size and each further line adds itself and `entries.row-gap`. The input counts as
not empty for its label (a floating label floats) and gives its native element no placeholder. It gives the items no
role, no tabindex and no key; a press on the container outside every item focuses the typing part, as any press on
the box does (TXI-8). The two distances are handed to the items as a set's are (`--tanrei-set-gap`,
`--tanrei-set-row-gap`: the Chip's hit areas then end at the middle of the gap to a neighbour, CHF-30). A prefix or a
suffix beside entries, entries in a multi-line input and in a row of segments are not specified.

## `<tanrei-text-field>`

Lets people enter and edit text as one complete field: a `<tanrei-text-input>` under a `<tanrei-field>`'s label — or,
in the filled and the outlined look, with the label floating in the box — with the Field's help, its error and the
count (`specs/text-field.spec.json`, TXF-62…67). It is a **composed** element: its shadow root is the two
members' own elements and nothing else, and everything it does is "Composed elements", above.

```html
<tanrei-text-field name="email" label="Email" type="email" autocomplete="email" required
                   supporting-text="We never share your address." maxlength="80" counter></tanrei-text-field>
<tanrei-text-field label="Start date" type="date" locale="en-US" picker picker-label="Choose date"
                   invalid-text="Finish the date."></tanrei-text-field>
<tanrei-text-field variant="outlined" label="Notes" multiline resize="manual" resize-label="Resize">
  <span slot="leading-icon">notes</span>
</tanrei-text-field>
```

- **Thirty-seven properties, none its own**: ten are the Field's (`label`, `label-hidden`, `supporting-text`,
  `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`, `required-text`, `optional-text`), twenty-seven
  the input's. The input's own `label`, `labelHidden`, `error` and `disabled` are never set: the Field says each to
  its control.
- **One thing it does that the pair by hand does not** (`fills`, TXF-67): while `counter` is set it gives its Field the
  count its input keeps, after each of the input's updates (`memberUpdated()`).
- **A block as wide as its place**, and its box fills it (TXF-62). A page that wants a narrower field gives it a narrower place.
- **No token, no part of its own.** `--tanrei-comp-field-*` (the rows), `--tanrei-comp-input-box-*` (the box) and
  `--tanrei-comp-text-input-*` (what a text input alone draws) reach the members by inheritance; there is no `comp.text-field`. Parts: `field` and `text-input` (the members), and
  theirs. `label` and `requirement-label` are parts of both members: each is exported as `field-label`,
  `text-input-label`, `field-requirement-label`, `text-input-requirement-label`, **and under the bare name from
  both** — the two are never drawn at once (FLD-25: the Field draws no label row while its control floats the label;
  a stacked input draws neither), so `::part(label)` is the drawn label.
- **`value` is the input's at every moment**, and `input`, `change`, `action`, `pickerrequest` and `entryerror` are
  the input's own events with the element as their target; it dispatches none. The detail types are the input's
  (`TanreiTextInputActionDetail`, `…PickerRequestDetail`, `…EntryErrorDetail`).
- **It is the form's control**: `name`, `form`, the value (nothing while disabled), reset to the `value` attribute,
  restore, a disabled fieldset, `valueMissing` while `required` and empty, a date's entry error.
- **Focus is not delegated**: `focus()` goes to the input; a press on the label row focuses it (FLD-12), and so does a
  press on the box or on a floating label (TXI-8); **a press on the help, the error text, the count or the gap between
  a row and the box does nothing**.
- In a Field it is reported as a field already, with the bare control named (FLD-15, TXF-65).

## `<tanrei-field>` and `<tanrei-field-group>`

The frame a form gives every control — a label that can say the control is required or optional, a line of help, the
reason a value was refused — for a control that cannot draw it itself (`specs/field.spec.json`, FLD-1…31), and for a
set of controls under one name (`specs/field-group.spec.json`, FGR-1…23). Neither is a control: neither is
form-associated, holds a value, emits an event, takes focus or handles a key. The controls are the elements of the
default slot and stay in the product's light DOM, with their place in a `<form>`, their `name`, `value` and events.

```html
<tanrei-field label="Volume" supporting-text="Applies to alerts and media." optional>
  <tanrei-slider name="volume" value="40"></tanrei-slider>
</tanrei-field>

<tanrei-field-group label="Notify me by" supporting-text="Choose all that apply." required
                    error error-text="Choose at least one way to reach you.">
  <tanrei-checkbox name="notify" value="email" label="Email"></tanrei-checkbox>
  <tanrei-checkbox name="notify" value="push" label="Push notification"></tanrei-checkbox>
</tanrei-field-group>
```

Both are shadow-root elements: the label, the requirement tag, the help and the error are the
component's own markup, and only the controls are the product's. The host is `display: block` and as wide as its layout.

| Property / attribute | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the name: of the control (a field), of the set (a group). A field's may be empty for a control that names itself |
| `labelHidden` / `label-hidden` | boolean | `false` | draws no label row; the label stays the name; reflected |
| `supportingText` / `supporting-text` | string | `""` | a field: help below the control. A group: the description under the label, before the controls, staying while in error |
| `errorText` / `error-text` | string | `""` | a field: while `error`, in the help's place — the row's first line — or below the help, which then stays, where `--tanrei-comp-field-error-text-placement` is `append` (FLD-7, FLD-31). A group: a row of its own below the last control |
| `error` | boolean | `false` | the error condition; the product's to set; reflected |
| `disabled` | boolean | `false` | disables the control, or every control, and draws the frame as disabled; reflected |
| `required` | boolean | `false` | the form asks for an answer: the required mark and the required state; reflected |
| `optional` | boolean | `false` | the optional tag, and `optionalText` in the description; ignored while `required` is set, which is reported (FLD-32, FGR-26); reflected |
| `requiredMark` / `required-mark` | `auto` \| `tag` \| `asterisk` \| `none` | `auto` | `auto` is the system's `--tanrei-comp-field-requirement-mark` (`-field-group-` for a group), which follows `--tanrei-sys-behavior-requirement-mark` unless a layer sets it apart; reflected. Another value behaves as `auto` and is reported |
| `requiredText` / `required-text`, `optionalText` / `optional-text` | string | `""` | the tag's text, also what assistive technology is told where there is no state for it: the instance's, else the product's words. Without `requiredText` the asterisk stands in the tag's place; without `optionalText` no tag is drawn and nothing is said (FLD-24, FGR-24) |
| `orientation` (group) | `vertical` \| `horizontal` | `vertical` | a column, or a row that wraps; reflected |
| `spacing` (group) | `controls` \| `fields` (open) | `controls` | the distance between two members (`gap.controls`, `gap.fields`); `fields` also lets each member fill the width; reflected |
| `kind` (group) | `group` \| `radio-group` | `group` | what the set is to assistive technology: a group of controls that each answer for themselves, or the radio group of the radio buttons it holds (FGR-25, below). It changes what is exposed and nothing that is drawn; another value is a group and is reported; reflected |

Slots: the default slot (the control; the controls) and, on a field, `label-icon`. Parts: `label`, `label-icon` (field),
`requirement-label`, `value-text` and `counter` (field), `supporting-text`, `error-text`. No events.

**A field's supporting row** (FLD-7, FLD-27, FLD-31) is a flex row of one column of texts and the
count. The column holds the help (`part="supporting-text"`) and the error text (`part="error-text"`), rendered only
while the field is in error and has words — `error-text`, or the words of its control's own refusal (FLD-28). Where the
error text stands is the design system's choice, `--tanrei-comp-field-error-text-placement`, read by name from the
cascade at each render (and again when the system is switched): `replace`, the first value and the default, does not
render the help while the error text is there, which is then the column's first line; `append` keeps the help and
draws the error text below it, `--tanrei-comp-field-error-text-gap` away. A product that sets the token on an element
of its own after the fields have drawn calls `requestUpdate()` on them. With no help the error text is the column's
first line under both. The count is aligned to the first line and does not move when the error text comes or goes.
Nothing is animated: the error text comes and goes with the layout. The description given to the control is what the
row draws — the help, the error text, or the two in that order — and the optional text; the live region is given the
error text alone. `::part(supporting-text)` does not reach the error text: use `::part(error-text)`.

The requirement tag is a `<tanrei-tag size="small">` (`filled` for required, `tonal` for optional, `disabled` while the
frame is) with nothing else of the frame's set on it: it reads `--tanrei-comp-tag-*` as every tag where the frame stands
does, so what restyles small tags restyles it. It is the same in a focused and an erroneous frame, and in a disabled one
it is drawn from the Tag's disabled tokens (`--tanrei-comp-tag-<variant>-disabled-*`, TAG-21), so it fades with the
label. The
frame lays out a box one label line high around it (`.requirement-box`), in which the tag is centred: its height is
never read, and a tag taller than the label's line reaches equally above and below it. Under
`required-mark="auto"` the tag and the asterisk are both in the row and a style query on the component's
`requirement-mark` draws one of them; where a browser has no style queries the element writes the name it read into
`data-required-mark` (FLD-6, FGR-6).

### How a control gets its name, description and states (`src/primitives/field.ts`)

An id cannot be referenced across a shadow root, and three trees are involved (the field's shadow root, the product's
light DOM, the control's own shadow root), so nothing is tied with `aria-labelledby` or `aria-describedby`. The frame
gives values:

1. **A control asks.** When it is connected it dispatches `tanrei-field-connect` on itself — a composed, bubbling
   `CustomEvent` whose `detail` is `{ control, takes, errorCondition, framed, named(), update(state) }`.
2. **The nearest frame answers.** It stops the event, keeps the connection and calls `update()` at once, again after
   every change of its own, and with `null` when the control leaves it. `state` is
   `{ label, description, invalid, required, requiredText, disabled }`.
3. **The control writes** them on the element that carries its semantics, its own `label` winning.

**Both ways (FLD-25 to FLD-28).** `state` also carries `labelHidden` and `requiredMark` (`asterisk` |
`none`), for a control that draws the label itself. And a control may say of itself what only it knows: `detail.says()`
returns `{ drawsLabel, inset: { start, end }, refusal: { text } }`, read by the frame whenever it draws, and the
control calls `detail.said()` — which the frame that keeps the connection sets — when any of it changed
(`FieldControlOptions.says`; the controller compares after each of its host's updates). `<tanrei-field>` then draws no
label row while `drawsLabel` (and gives the asterisk FLD-6 names, read from the cascade under `auto`), pads its
supporting row by `inset` (CSS lengths: `--_inset-start` / `--_inset-end` on the row), and is in its error condition
with the control's words while `refusal`. A fifth thing a control may say (FLD-13): `drawnFocused` —
a select says it for as long as its list is open, whether or not it has focus — and the field then draws its rows
from their focused tokens for as long, as while focus is inside it. Every member is optional in both directions: a control that says nothing is
framed as usual, and a frame that answers the six values alone leaves a control drawn as a bare one. The count is
**not** in the exchange: `count-text` is the field's own attribute, drawn in `part="counter"` at the end of the
supporting row (`aria-hidden`, one line, tabular figures, `comp.field.counter.gap`, `standard.counter.color`), given by
the product or by the composed element that holds the field (FLD-27).

`FieldControlController` is the control's side (`name(own)`, `description(own)`, `invalid`, `required`, `disabled`).
It is in `<tanrei-slider>`, in `<tanrei-text-input>`, in `<tanrei-color-input>`, in `<tanrei-select>`, in the selection controls through `SelectionController`
(`selection.field`), and in `<tanrei-field>` and `<tanrei-field-group>` themselves with `takes: 'disabled'`: a component
that names, describes and marks itself follows only the `disabled` of a group around it. A frame that is defined after
its controls has them ask again, so the order of definition does not matter (`index.ts` defines the frames first).

| What the control says | Meaning | Who |
|---|---|---|
| `takes: 'all'` | it has no frame of its own: give it everything | slider, switch, checkbox, radio button |
| `takes: 'disabled'`, `framed: true` | it is a field or a group itself; a `<tanrei-field>` around it reports FLD-15 | text field, select field, combobox field, number field, color field, field, field group (and radio group) |
| `errorCondition: true` | it draws an error form: a field group marks only these invalid (FGR-8) | checkbox, text input, select, combobox, number input, color input |
| `requiredState: false` | its role has no required state: `requiredText` joins its description instead of `aria-required` | slider, radio button |

**An element that does not ask** — a native `<input>`, a control the product built — is given attributes by
`giveAttributes()`: `aria-label` only where it has neither `aria-label`, `aria-labelledby` nor a `<label>` of the page;
`aria-description` after its own; `aria-invalid`; `aria-required` where its role has that state (the required text
joins the description where it has not); and `disabled` where it has the property and the product did not set it.
`takeBack()` restores exactly what was there, attribute by attribute, and only while the value is still the frame's. An
element that is not defined yet is given nothing until it is. A product's own custom element may speak the protocol
instead of receiving attributes: dispatch the event from `connectedCallback` and keep `update`.

A field group gives each control `disabled`; the error condition only to a control that says `errorCondition` (or a
native checkbox) — with the error text as a description for a checkbox, and with no description for a radio button,
which is drawn in its error form and exposes no invalid state (FGR-8, FGR-10, FGR-11) —; and never a name or a
requirement.

Limits: the description is
`aria-description`, a string; an element that has an `aria-describedby` of its own is not given the field's text, since
browsers prefer the reference.

### A component that is a field itself (`src/primitives/field-frame.ts`)

No control draws the frame as part of itself: the select, the combobox, the number input and the color
input are bare controls, and their fields are a `<tanrei-field>` around one. A product's own
component that must draw the frame from its own tokens of the frame's names composes the same module the
field is built from — it is imported by its path, not through `primitives/index.ts`, because it draws the requirement tag with
`<tanrei-tag>`:

```ts
import { frameColors, frameStyles, frameLabelRow, frameLabelIcon, frameText, frameAnnouncer, frameAnnounce,
         frameShownText, frameOptionalText, frameRequirement, reportFrame, syncFrameMark } from '../../primitives/field-frame.js';

static styles = css`
  ${frameColors(PREFIX, 'stacked', { rest: '.field', error: '.field[data-error]', focused: '.field[data-focused]',
      focusedError: '.field[data-focused][data-error]', disabled: '.field[data-disabled]', disabledError: '.field[data-disabled][data-error]' })}
  ${frameStyles({ prefix: PREFIX, glyph: true, disabled: '.field[data-disabled]' })}
`;
// render(): the rows around the component's own container, every id in the same shadow root.
html`${frameLabelRow({ ...the ten props…, glyph: frameLabelIcon(this.onLabelIconSlotChange), hasGlyph, labelId: 'label', onPress: this.focusControl })}
     <div class="container">…<input aria-labelledby="label" aria-describedby="supporting requirement" …></div>
     ${frameText(frameShownText(this), { id: 'supporting' })} ${frameAnnouncer()}`;
```

- `frameColors(prefix, variant, selectors)` writes the current color of every part as `--_frame-<part>` from
  `<prefix>-<variant>-[focused-|disabled-][error-]<part>-color`; call it once per variant. Its last argument, `fallback`, names the
  variant whose token is read where the active system has none for `variant` (a value a layer added).
- `frameStyles({ prefix, label?, motion?, glyph?, disabled })` reads every length, text style and choice from the
  prefix by the frame's names. `label` overrides the label's text style for a component whose label follows its size.
- Their control is in their own shadow root, so they name and describe it with ids (`labelId`, the supporting row's
  `id`) and need no connection for that; they take a `FieldControlController` with `takes: 'disabled', framed: true`
  for a field group's `disabled`.
- Validity is theirs: a form-associated component reports `valueMissing` and the like through its own
  `ElementInternals`. The frame never validates (FLD-4); `error` and `errorText` stay the product's.

`src/primitives/field-group-frame.ts` is the same for a set: `groupFrameStyles({ prefix })`, `groupRows(props)` (the
label row, the description, the error row, the requirement in words and the announcer, with fixed ids) and
`groupDescribedBy(props)`. `<tanrei-field-group>` is the one element that draws it: a radio group and a checkbox group
hold that element itself, and no other element calls this module.

### The field group as a radio group: `kind="radio-group"` (FGR-25)

A set of radio buttons is required and invalid as a whole, which a group cannot say. `kind="radio-group"` makes the
field group's own element the radio group of the radio buttons it holds — the one group, never a radio group inside a
group:

```html
<tanrei-field-group kind="radio-group" label="Delivery" required required-text="Required">
  <tanrei-radio-button name="delivery" value="standard" label="Standard, 3 to 5 days"></tanrei-radio-button>
  <tanrei-radio-button name="delivery" value="express" label="Express, next day" checked></tanrei-radio-button>
</tanrei-field-group>
```

- **The same `<fieldset>`, with the role.** In this kind the fieldset carries `role="radiogroup"`,
  `aria-labelledby` its `<legend>` (which stays in the tree while `label-hidden`), `aria-required` while
  `required`, `aria-invalid` while `error`, `aria-orientation` as `orientation` says and `aria-disabled`
  — attributes, not `ElementInternals` states, which axe cannot see. The hidden text for `required-text` is not rendered
  and is left out of `aria-describedby`: the state says it (`groupRows(props, { requiredState: true })`). Nothing else
  in the shadow root differs, so the two kinds are the same pixels (a test draws each `radio-buttons-*` fixture in
  both kinds and compares them).
- **Why a `fieldset` and not a `div` for this kind.** The role is one a fieldset may take (the checks for an allowed
  role pass), Chromium's accessibility tree has one `radiogroup` node for it and no `group` — with the radios inside
  it, the name computed from the legend through `aria-labelledby` with the label drawn and not drawn, the description,
  and `required`, `invalid`, `orientation` and `disabled` as the attributes say — and the legend keeps laying out the
  label row as it does in the other kind, which a `div` in its place would not without a second set of rules. Firefox
  and WebKit give a test no accessibility tree of their own: there the same DOM is held (the role, the attributes, the
  texts they refer to) together with the tree Playwright computes from it by the ARIA rules. What a screen reader says
  in those two engines is not verified.
- **`aria-orientation` is accepted** by the accessibility checks on a radio group (`aria-allowed-attr` passes), so the
  clause of FGR-25 and RGP-10 stands.
- **Nothing a set of radio buttons needs is added but the role and its states**: the group still holds no value, takes
  no part in a form, moves no focus, handles no key and fires no event. Exclusion, the arrow keys, the one tab stop and
  each position are the radio buttons' own, by their `name` (RAD-25) or by the `<tanrei-radio-group>` they stand in. A
  radio button is given `disabled` and, while the group is in error, its error form (FGR-8, RAD-26) — never a name,
  a description or an invalid state: the fieldset carries those.
- **Reported in a debug build** (FGR-25): a control that is not a radio button, radio buttons of more than one group
  (two names), and a `spacing` other than `controls`. While `kind` is `group`, radio buttons are reported
  (FGR-15), naming this kind as the way to write the set by hand. With no required word, a radio group's missing
  word is reported as a tag that is not drawn — the required state is kept — and not as a requirement nobody says.

## `<tanrei-radio-group>`

One question with exactly one answer among a few options shown all at once: the field group itself, in its radio-group
kind, around the product's own `<tanrei-radio-button>` elements, whose chosen value the group holds under one name
(`specs/radio-group.spec.json`, RGP-1…19; the field group's FGR-25; the radio button's RAD-25). It is a **composed**
element, in the construction of `<tanrei-checkbox-group>`: the members that hold the value are the
product's own children.

```html
<tanrei-radio-group label="Delivery" name="delivery" value="standard" required required-text="Required"
                    supporting-text="You can change this until the order ships.">
  <tanrei-radio-button value="standard" label="Standard, 3 to 5 days"></tanrei-radio-button>
  <tanrei-radio-button value="express" label="Express, next day"></tanrei-radio-button>
  <tanrei-radio-button value="pickup" label="Pick up in store"></tanrei-radio-button>
</tanrei-radio-group>

<!-- One level down, the same picture and the same radio group, by hand: without the one value, the one change and the place in a form as one control. -->
<tanrei-field-group kind="radio-group" label="Delivery" required required-text="Required"
                    supporting-text="You can change this until the order ships.">
  <tanrei-radio-button name="delivery" value="standard" label="Standard, 3 to 5 days" checked></tanrei-radio-button>
  …
</tanrei-field-group>
```

**The construction:**

```
<tanrei-radio-group>                            host: form-associated, no role, not focusable; extends ComposedElement
  #shadow-root
    <tanrei-field-group part="field-group" kind="radio-group" spacing="controls" exportparts="label, …">   the eleven props, forwarded
      <slot></slot>                                                                    the product's radio buttons pass through
  <tanrei-radio-button value="standard" …>      the product's light DOM
```

It has **no tokens and no stylesheet of its own** but the composed host's (`display: block`): the frame is the field
group's element, so a design system that restyles the field group restyles every radio group, `--tanrei-comp-field-group-*`
set on the radio group is inherited by the field group inside, and each radio button is drawn from
`--tanrei-comp-radio-button-*`.

| Property / attribute | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | the value of the selected radio button; `""` is none. The attribute is the first value and what a form reset returns to; the property is the live one |
| `name` | string | `""` | the name `value` is submitted under (a web attribute, not a spec prop); reflected |
| `label`, `labelHidden` / `label-hidden`, `supportingText` / `supporting-text`, `errorText` / `error-text`, `error`, `disabled`, `required`, `optional`, `requiredMark` / `required-mark`, `requiredText` / `required-text`, `optionalText` / `optional-text`, `orientation` | | | the field group's own, declared in place as it declares them and set on it unchanged (`forward()`); there is no `spacing` and no `kind` — the group sets both |

Slot: the default slot (the radio buttons). Parts: `field-group` (the frame), and the field group's own under its
names — `label`, `requirement-label`, `supporting-text`, `error-text`, the names this element's parts had before.
Events: `input`, then `change` — a bubbling `CustomEvent` whose `detail.value` is the new value, which `value` already
holds — once per selection by a person; never when the product sets `value` or `checked`, never for the option that is
already selected. Methods: `focus()` (moves focus to the radio button that is the stop), `blur()`, `checkValidity()`,
`reportValidity()`; `form`, `validity`, `validationMessage`, `willValidate`.

- **The radio group for assistive technology is the field group's element** — its name, its description, required,
  invalid, disabled and its orientation, once (FGR-25). The host has no role and nothing is tied across a shadow root;
  an `aria-label` on the host names nothing and is reported.
- **`disabled` reaches each radio button from the field group**, by the `tanrei-field-connect` event it already answers:
  a slotted radio button's event passes the field group on its composed path before the host. A radio button's own
  `disabled` attribute is never written, so an enabled group cannot enable what the product disabled.
- **A radio button may ask before its frame is drawn**, as a checkbox does in a checkbox group: one whose nearest radio
  group is not defined yet does not ask (`FieldControlOptions.waits`), the host stops a question from its children
  that nobody inside answered, and after each render it has them ask again.
- **The host takes `disabled` from outside itself** — a field group around it (its own `FieldControlController`,
  `takes: 'disabled'`), a disabled `<fieldset>` — and gives the field group inside the three together. **The inner
  field group's own question to a group around it is stopped at the host**, so that an outer field group counts one
  member, the radio group (FGR-15). This is the one departure from W8, where a frame's question leaves the element.
- **One value.** `value` decides which radio button is `checked`; the first of two with one value, none for a value no
  radio button has (it is kept: the option may arrive later). `checked` set on a radio button by the product becomes the
  group's value; taken off the chosen one, it is shown selected again at once. A radio button that arrives marked
  `checked` gives the group its value only while the group has none: where both are given, `value` decides. A radio
  button without a `value` is never selected, and activating it changes and emits nothing. Each of these is reported.
- **One change.** Inside a radio group a radio button fires no `input` and no `change` of its own: where it would, it
  tells the group (`optionSelected()`), which sets `value` and fires its own. So no listener — on the group or on an
  ancestor, in either phase — hears a `change` twice. A listener set on a radio button inside a group hears nothing.
  (The native control's own `input` is composed and crosses the radio button's shadow root on its way down, inside a
  group as outside one: a capture listener on an ancestor sees it; a listener in the bubble phase never does.)
- **Keys and focus.** The arrow keys are heard on the host: Down and Right select the next enabled radio button in the
  order given, Up and Left the previous, wrapping; Left and Right exchange in a right-to-left layout, read at the key;
  nothing happens while only one is enabled. One radio button is in the focus order: the selected one while it is
  enabled, else the first enabled one. The host is no stop and does not delegate focus, and a press on the frame's
  texts selects nothing and moves no focus into the group.
- **A form control.** `static formAssociated = true`: it submits `value` under `name` while `value` is not empty and
  the group is not disabled — also while the radio button of that value is one the product disabled by itself — is
  reset to its `value` attribute, is restored on navigation, follows `<fieldset disabled>` and reports `valueMissing`
  while `required` and `value` is empty, in the browser's own words for a set of radio buttons left
  unanswered (where a browser has none: `error-text`, else the required text, else `label`), anchored on the native
  radio of the radio button that is the stop (`validationAnchor`): `reportValidity()` then focuses it. (Anchored on the
  radio button's own element, which takes no focus, nothing was focused.) It never sets `error`. Its radio buttons
  submit nothing.

**How the radio buttons and the group find each other** (RAD-25). A radio button looks for a group with
`closest('tanrei-radio-group')` and, where there is one, takes its group from it: the members (and so the tab stop and
each `aria-posinset` / `aria-setsize`) are the group's `options`, its `name` is ignored, it sets no form value, leaves a
form's reset and restoration to the group, leaves the arrow keys to the group, fires no event of its own, and tells the
group when a person selected it (`optionSelected()`) and when its `checked`, `value` or `disabled` changes
(`optionChanged()`; the interface is `TanreiRadioButtonOwner`) — or its disabled state as its frame or a disabled
fieldset gives it, which changes no property: a radio button sets its group's stop again whenever it is disabled or
enabled by any way (RAD-5), in a radio group or by its name. The group's radio buttons are those among its
descendants whose nearest radio group it is, found again when a child list changes. Radio buttons with one `name` and
no radio group still form a group by themselves; inside a `<tanrei-field-group kind="radio-group">` they are this
component one level down; one with neither a group nor a name is a group of one and is reported.

**Built on the field group's element.** The element with the role is the field group's `<fieldset>`, two
shadow roots down (a selector for `[role="radiogroup"]` in the radio group's own shadow root finds nothing);
the label row stands in a `<legend>`, whose box is as wide as the label and its mark, not as wide as the group
(`::part(label)` reaches it; a rule that relies on the label's box filling the row does not hold); and the debug
reports about the frame's own props — an unknown `required`, `optional`, `required-mark` or `orientation`, missing words, an
empty label — are the field group's, under its ids (FGR-22, FGR-24, FGR-10).

**What the three engines do** (each is held by a test of `primitives/composed.test.ts`, `W13-7 the twin`, or of
`radio-group.test.ts`): the nineteen fixtures are the same pixels as their twins among the field group's
`radio-buttons-*` fixtures, and say the same of the set and of each radio button — role, name, description, required,
invalid, orientation, disabled, checked, position and tab stop — in Chromium, Firefox and WebKit; in Chromium the two
accessibility trees are equal line by line, with one `radiogroup` and no `group`. Chromium's tree gives the host a
node of its own — `generic`, with no name, marked invalid while the form's validation refuses the group — because it
is a form-associated element that is validated; the radio group inside it is the field group's `fieldset`, once.

Limits: `aria-*` attributes the product writes on the host do not reach the element with the role; a radio button
inside a shadow root of the product's own, inside the group, is not found (`closest()` and `querySelectorAll()` stop
at the root).

## `<tanrei-select>`, `<tanrei-option>` and `<tanrei-option-group>`

One value chosen from a closed list: a trigger that looks and measures like a text input's box and shows the chosen
option, and a list of options, optionally grouped, that opens from it (`specs/select.spec.json`). It is **the bare
control**: it draws no label row, no requirement mark, no help and no error text. In a form
it stands in a `<tanrei-field>` — that pair as one element is [`<tanrei-select-field>`](#tanrei-select-field) —
and alone it is for a place where its label stands elsewhere: a theme or a language in a bar, a toolbar, a column of a
table. The pattern is the select-only combobox: focus stays on the trigger and one option is the active one.

```html
<!-- The box alone: named by its own label, which a stacked select does not draw. -->
<tanrei-select size="small" label="Theme" value="dark">
  <tanrei-option value="light" leading-icon="light_mode">Light</tanrei-option>
  <tanrei-option value="dark" leading-icon="dark_mode">Dark</tanrei-option>
</tanrei-select>

<!-- In a field, by hand: the field names it, describes it and marks it. -->
<tanrei-field label="Time zone" required supporting-text="Times are shown in this time zone.">
  <tanrei-select name="zone" value="Europe/Lisbon">
    <span slot="leading-icon">public</span>
    <tanrei-option-group label="Asia"><tanrei-option value="Asia/Tokyo" supporting-text="UTC+9">Tokyo</tanrei-option></tanrei-option-group>
    <tanrei-option-group label="Europe"><tanrei-option value="Europe/Lisbon">Lisbon</tanrei-option></tanrei-option-group>
  </tanrei-select>
</tanrei-field>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `stacked` \| `filled` \| `outlined` (open) | `stacked` | the text input's three looks; reflected. The default system ships `stacked` only (the others still work, and say so in a debug build). A value the select does not know by name is laid out as stacked, from that value's own tokens (SEL-60) |
| `size` | `small` \| `medium` \| `large` (open) | `medium` | the container's minimum height; reflected |
| `value` | string | `""` | the chosen option's value. The attribute is what a form reset returns to; the property is not reflected |
| `name` | string | `""` | the name the value is submitted under; reflected |
| `label` | string | `""` | the accessible name where no field frames the select, or its visible label is elsewhere — it then wins over the field's. A filled or an outlined select also draws it, floating in its box; a stacked select draws no label |
| `labelHidden` / `label-hidden` | boolean | `false` | a filled or an outlined select draws no floating label; the label stays the name; reflected. It changes nothing on a stacked select |
| `placeholder` | string | `""` | shown while nothing is chosen and the label is not in the line; never a value and never a name |
| `error` | boolean | `false` | the error condition of the box; the product's to set, or its field's; reflected. The select has no error text |
| `disabled` | boolean | `false` | not focusable, never open, left out of the form; reflected |
| `readOnly` / `readonly` | boolean | `false` | focusable and submitted, never open, no chevron; reflected |
| `open` | boolean | `false` | whether the list is shown; reflected. Ignored while disabled, read-only or without options |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | what parts two groups; `auto` is `--tanrei-comp-select-separation`; reflected |
| `inline` | boolean | `false` | tests and fixtures: the open list is drawn in place, inside its positioned ancestor, and answers no dismissal |

| Event | |
|---|---|
| `change` | the person chose an option whose value differs. A composed, bubbling `Event`, as a native select's; `value` is already the new one. Never for a value the product set, the chosen option chosen again, or a move through the list |
| `toggle` | the person opened or closed the list: `CustomEvent<{ open: boolean; reason?: 'select' \| 'escape' \| 'outside' \| 'focus-out' \| 'anchor-hidden' \| 'press' \| 'tab' }>`, **composed and not bubbling** — heard on the select and on an element composed around it, and by no ancestor (a `<details>` listens for its own `toggle`). `open` is already the new one; after a choice it follows `change`. Never for an `open` the product set. The web has no back of its own, so it never sends `back` |

Slots: the default slot (the option elements — read, not drawn in place) and `leading-icon` (a glyph that stands for
the field whatever is chosen; it takes the place of the chosen option's own). Parts: `container`, `outline`,
`active-indicator`, `label` (the floating label), `requirement-label` (its asterisk), `value`, `placeholder`,
`leading-icon`, `chevron`, `list`, `option`, `option-label`, `option-supporting-text`, `option-leading-icon`, `mark`,
`group`, `group-title`, `divider`.

**What is the field's, not the select's**: the attributes `supporting-text`, `error-text`,
`required`, `optional`, `required-mark`, `required-text` and `optional-text`, the `label-icon` slot, the parts `label-icon` and
`supporting-text`, and the label row of the stacked look. Each is the field's, and so the select field's. On a select
they draw nothing, and a debug build says so once for the element and names `<tanrei-select-field>` (SEL-64). **One
case is silent:** `<tanrei-select label="Country">` draws no label — `label` alone is a correct bare select, named
by it. A select in a form that shows its label is a select field.

**What the select says to its field, and takes from it** (SEL-63; `src/primitives/field.ts`): upward — `drawsLabel`
while its look floats one, so the field draws no label row (FLD-25); `inset`, how far its value stands from its start
edge and the padding it keeps at its end, as lengths of its own tokens, so the field's supporting row starts and ends
there (FLD-26); and `drawnFocused` while its list is open, whether or not it has focus, so the field draws its rows
focused for as long (FLD-13). Downward — the name, the description, the required, invalid and disabled states, whether
the label is hidden, and whether an asterisk follows a floating label (SEL-7: the field names the mark; a tag named
there reaches a floating label as the asterisk, and a bare select draws none).

**Width** (SEL-49). Bare and given no width, the select is an inline box as wide as its widest option, and choosing
never changes its width. A field's select is a block that fills the field: the element says the state `framed` on
itself the moment a field answers it (`:host(:state(framed))`), so the field reads its control's display as it is.

**The option elements** (`src/components/option/option.ts`) are data, and one pair for the select and the combobox:

| Element | Attributes (each a reflecting property) | |
|---|---|---|
| `<tanrei-option>` | `label`, `value`, `supporting-text` (`supportingText`), `leading-icon` (`leadingIcon`), `disabled` | the label is the `label` attribute or, without one, the element's text, as `<option>`. A disabled option stays reachable with the arrow keys |
| `<tanrei-option-group>` | `label` | the title, as `<optgroup label>` (a `title` attribute would also draw the browser's tooltip). A group inside a group gives its options to the outer one |

Neither draws anything or takes focus. The select observes its children (elements added, removed or moved, the five
attributes, `lang` and `dir`, a text that is a label) and renders the rows itself, in its own shadow root, so that the
combobox, its `aria-controls` list box and its `aria-activedescendant` option are in one tree.

**The options may reach the select through a slot** (clauses O1 to O9; `readOptions()` and
`OptionsController` in `src/primitives/option-list.ts`, for the combobox too). A `<slot>` among the select's children
that has no `slot` attribute stands for the elements assigned to it, flattened, in order — to any depth, with the
slot's own fallback children where nothing is assigned. That is how a select field's options, which stay the product's
children of `<tanrei-select-field>`, reach the select inside it, and how a product's own element passes options on:

```html
<!-- the shadow root of the product's <plan-picker> -->
<tanrei-select label="Plan"><slot></slot></tanrei-select>
```

An element that arrived through a slot is not a descendant of the select, so the one observer on the select does not
see it: the controller also hears `slotchange` (which bubbles to the select from the slot among its children, and
from a slot assigned to that one) and observes each such element with the same options, a set it makes again at each
reading. Every change a select with options as direct children answers is answered alike through a slot — one list of
cases, run twice (`select-field.test.ts`). A slot that carries a `slot` attribute (a glyph passed on) is not followed,
and a `<slot>` inside a group is not: a group is data.

**An option in another language** says so as any element does — `<tanrei-option value="ja" lang="ja">日本語</tanrei-option>`
— and so may a group, for its title and its options. The option is never drawn, so nothing would inherit the
attribute from it: the field gives it to what it draws from the option's words. The row (`role="option"`) carries
the option's `lang` (or its group's), and so does the value a closed select shows (`part="value"`) and a combobox's
input for as long as its text is the chosen option's label — what a screen reader chooses its voice by, and a browser
its face. A `dir` on the option (or its group) is the direction of its words where their first letter does not tell
it: the words are a run of that direction inside the text's box (`<span class="said" dir>`), which stays placed and
aligned by the layout — the row itself is never turned, and its check stays at the layout's end; the value shown, a
box that can be cut, takes the `dir` as its own. Without either attribute nothing changes: the field's language, and
each text's own direction (SEL-59, CMB-55). The lookup covers the option and its groups and nothing above them, so an
option that reached the select through a slot is read alike; the owner's own `lang` and `dir`, and the page's, reach
what the select draws by inheritance. Both fields share this (`readOptions()`, `OptionListController`). An option is a
value, never a destination: it takes no `href`, and a list of places to go is a menu or links.

**The trigger** is a `<div role="combobox" tabindex="0">` that carries `aria-label` (its own `label`, else its field's
— a value, written here: an id cannot be referenced across the roots), `aria-describedby` (a hidden element of its own
shadow root that holds what its field gives), `aria-invalid`, `aria-required`, `aria-readonly`, `aria-disabled`,
`aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` and — while the list is open — `aria-activedescendant`. Its
value is what it holds that is not hidden: the chosen option's label. It measures as the text input of the same variant
and size (a test compares a select field and a text field side by side, and every token of the same name). In a
`<tanrei-field-group>` a bare select follows the group's `disabled` and takes its error condition.

**Opening and choosing.** A press on the container (a mouse as it goes down; a touch, a pen and assistive technology
with their click), Enter, Space, Down or Up Arrow, or a printable character open the list; nothing on a closed select
changes the value. In the open list the arrow keys move the active option by one and stop at the ends, Home and End go
to the ends, Page Down and Page Up move by ten, and typing looks for the next option whose label begins with what was
typed within a second (one character typed again moves on; a Space within that second is a character). Enter, or a
Space that is not part of a search, or a press chooses. Escape (which goes no further: a dialog around the select stays
open), Tab (focus moves on at once), a press outside, a press on the container and focus leaving close the list and
choose nothing.

**The list** (`src/primitives/option-list.ts`, shared with the combobox) is the anchored surface a popover is drawn on
(`src/primitives/anchored.ts`): a `popover="manual"` element in the top layer, placed as a popover whose placement is
bottom-start — `list.offset` below the container, above it where below has no room, limited to the room where neither
has, following the container by events. It is as wide as its options need unwrapped (`inline-size: max-content`), never
narrower than the container or `list.min-width` and never wider than `list.max-width` past a narrower container — so a
long label or a supporting text reads in fewer lines without the container changing width — and at most
`list.max-height` tall. A long list, which draws only the rows near the box that scrolls, takes its width from the rows
it draws as it opens and holds it (`--_list-content`) while it scrolls. Its rows are the menu's (`itemRowStyles()`; a token test holds every value equal to the menu's):
the conditions `option` and `selected-option`, hover, the focused state and the ring inside the row for the option that
is active by the keyboard, the four pressed-feedback answers with press-hold, and the check of the icon set for the
chosen option.

**The rows are drawn while the list is shown, and at no other time.** A closed select or combobox holds the placed
box, the sheet and an empty list box (the element `aria-controls` names) and no row, so the number of elements in its
shadow root does not grow with its options: the rows are made by the render that opens the list and taken away when the
list has closed and faded out. What a closed field says of its options — the chosen one's label and glyph, the form's
value, the option a typed character finds, a select's own width (one hidden text with a line for each label, not an
element for each) — is read from the data. **A list that shows more than a hundred options** (`OPTION_WINDOW_FROM`)
draws only the rows near the box that scrolls — the rows in it and as much again before and after — and the active
option with a page of rows on each side; what is not drawn is room of the rows' heights (`.skipped`, hidden from
assistive technology), measured from the rows that were drawn, so the box scrolls over the whole list and every option
is reached by scrolling, by the arrow, page, Home and End keys and by typing. Every drawn option says its position and
the number of options (`aria-posinset`, `aria-setsize`), the active option is always an element, and a group that draws
any of its options draws its title. A shorter list draws every row. Do not look for an option's row in the shadow root
of a closed field, or of a long one far from its scroll position: read the `<tanrei-option>` children.

**Forms.** `static formAssociated = true`: `name`, the submitted `value` (none while disabled), `formResetCallback`
(the `value` attribute), `formStateRestoreCallback`, `formDisabledCallback` (a disabled fieldset), and `valueMissing`
while the field that frames it says it is required and `value` is empty — also when an option stands for the empty
value. A bare select has no requirement of its own and reports no missing value. `form`, `validity`,
`validationMessage`, `willValidate`, `checkValidity()` and `reportValidity()` are the element's. What it tells its
form it says through `FormSays` (`src/primitives/form-says.ts`), where an element composed around it hears it.

What the web does in its own way, and what it cannot do:

- **A press outside also reaches the element under it** (SEL-27): the list is not modal and draws no scrim, so the
  button that was pressed is pressed.
- **A floating label is part of the container** (SEL-13). A filled or outlined select's label rests inside the
  container, so a press on it is a press on the container and opens the list; the label row above a stacked select is
  its field's, and a press there focuses without opening (FLD-12).
- **The divider between two groups is hidden from assistive technology** (`aria-hidden`): a list box holds options and
  groups only, and the groups already say where one ends.
- **A read-only select reports no missing value** to the form, as a native read-only control is barred from
  validation: nobody could put it right.
- **Before the element is defined** its options are running text in the page: hide `tanrei-select:not(:defined) > *` and reserve the block size.
- **Choices of kind** are read from the cascade: the separation by a style query, with `data-separation` written by the
  element where a browser has none; the focus style when focus arrives (`data-focus-style`, on the field and on the
  active option's row). The required mark is the field's to read: the select is told `asterisk` or `none`.
- **Typing compares labels with `toLowerCase()`**, not by the label's language (the roving primitive's rule).

## `<tanrei-select-field>`

One value chosen from a closed list as one complete field of a form (`specs/select-field.spec.json`, SEF-1 to SEF-5):
**composed** — a `<tanrei-field>` around one `<tanrei-select>`, built as "Composed elements" above says.
It takes every attribute, property, event and child a framed select takes, under the same names: a select in a form
is this tag.

```html
<tanrei-select-field name="country" label="Country" required required-text="Required"
  placeholder="Choose a country" supporting-text="Where your invoices are addressed.">
  <tanrei-option value="jp">Japan</tanrei-option>
  <tanrei-option value="ke">Kenya</tanrei-option>
</tanrei-select-field>

<!-- One level down: the same picture, the same name, description and states. -->
<tanrei-field label="Country" required required-text="Required" supporting-text="Where your invoices are addressed.">
  <tanrei-select name="country" placeholder="Choose a country">
    <tanrei-option value="jp">Japan</tanrei-option>
    <tanrei-option value="ke">Kenya</tanrei-option>
  </tanrei-select>
</tanrei-field>
```

The shadow root, and nothing else in it:

```html
<tanrei-field part="field" exportparts="…">
  <slot name="label-icon" slot="label-icon"></slot>           <!-- only while the host has such a child (W9) -->
  <tanrei-select part="select" exportparts="…">
    <slot></slot>                                             <!-- always: the product's options (O2) -->
    <slot name="leading-icon" slot="leading-icon"></slot>     <!-- only while the host has such a child -->
  </tanrei-select>
</tanrei-field>
```

| | For this element (the list W14 asks for) |
|---|---|
| Members | `tanrei-field` holding `tanrei-select`; the product places none, and gives the options |
| Value member | `tanrei-select` |
| Props from the field | `label`, `labelHidden`, `supportingText`, `errorText`, `error`, `disabled`, `required`, `optional`, `requiredMark`, `requiredText`, `optionalText` |
| Props from the select | `variant`, `size`, `value`, `placeholder`, `readOnly`, `open`, `separation` — and the `inline` attribute, for tests and fixtures, which is no prop: the element has no property for it, watches the attribute and gives its select what it says |
| Props of one name on both | `label`, `labelHidden`, `error`, `disabled`: the field's. The select's own are never set |
| Read through, never copied | `value` (W5) and `open`, by an accessor of the same kind: what was last set until the select has taken it, then what the select holds. Both are new in every listener of `change` and `toggle`, and when the select takes `open` back with no event; the reflected `open` attribute follows the select |
| Events | `change` (composed, bubbling) and `toggle` (composed, **not bubbling**), the select's own, with the host as their target. None is stopped, none is copied |
| Slots | `label-icon` to the field, `leading-icon` and the default slot to the select |
| Parts | `field`, `select`; from the field `label-icon`, `supporting-text`, `counter` (never drawn: a select keeps no count); from the select every part of its own. `label` and `requirement-label` are on both members: each is exported as `field-label` / `select-label` and `field-requirement-label` / `select-requirement-label`, always, and under the bare name from both, because the two are never drawn at once (FLD-25) |
| Form | the host is the form's element: `name`, the value and its state, `valueMissing` anchored on the select's trigger, reset to the `value` attribute, restore, a disabled fieldset. The members take no part |
| Focus | the shadow root does not delegate: `focus()` goes to the trigger; a press on the label row focuses and opens nothing; a press on the help does nothing |
| Reports of its own | an ARIA name on the host (it has no role), and a child that is neither an option, a group nor a glyph for one of its two slots, which is not drawn (SEF-1) |
| Tokens and parts of its own | none. `--tanrei-comp-field-*`, `--tanrei-comp-input-box-*` (the trigger) and `--tanrei-comp-select-*` (the list) reach the members by inheritance, and one select field is set apart by setting any of them on the element |

It is a block as wide as its place and its select fills it (SEF-1, SEL-49): where a labelled select of before the
split was as wide as its widest option, a select field with no width given is as wide as its column. Give it a
narrower place for a narrower box.

### Building a field that opens a list of options (the combobox)

`src/primitives/option-list.ts` is everything about the options and their list that does not depend on the field
(the options are the field's children — or reach it through a `<slot>` among them, which `OptionsController` follows:
the select's section above):

```ts
import { OptionsController, OptionListController, anchoredOptionList, optionListStyles, optionVariantRules,
         filterOptions, optionId, OPTION_GLYPHS, OPTION_MIRRORED } from '../../primitives/option-list.js';
import '../option/option.js'; // defines tanrei-option and tanrei-option-group, once

static styles = css`… ${optionListStyles({ prefix: '--tanrei-comp-combobox', variants: ['stacked', 'filled', 'outlined'] })}`;

private readonly options$ = new OptionsController(this);                       // .model: entries, options, hasIcons, nested
private readonly list = new OptionListController(this, {
  model: () => filterOptions(this.options$.model, (option) => matches(option)),  // what is drawn now
  chosen: () => this.chosen,                                                     // drawn with the fill and the check
  choose: (option, event) => this.choose(option, event),                         // a press, Enter or Space; never a disabled option
});
private readonly anchored = anchoredOptionList(this, { anchor: () => this.container, inline: () => this.inline, gone: () => this.close('anchor-hidden') });

// render(): this.list.render({ labelledBy: 'name', inline: this.inline, text: (option) => html`…<mark>…</mark>…` })
// on the field's element: aria-controls="list" aria-activedescendant=${this.list.activeId ?? nothing}
// opening: this.list.start(byKeyboard) → this.anchored.show() → this.list.reveal();  closing: this.anchored.hide(), this.list.stop()
// keys:    this.list.key(event.key) (arrows, Home, End, the page keys, typing), this.list.activate(event) (Enter)
```

- The component's token prefix supplies every value by the names both fields have (`list.*`, `option.*`, `group.*`,
  `divider.*`, `motion.*`, `separation`, and per variant `<variant>.[<state>.]option.*` and `.selected-option.*`).
  `minWidth` is passed only by a field whose list has a least width (the select's `list.min-width`).
- The markup it renders: `.surface` > `.motion` > `.list` > `.scroll[role=listbox]#list` > `.row[role=option]#option-<index>`
  (in `.group[role=group]` under a `.group-title`), with `.divider` and `.gap` between groups. Name the glyph boxes to
  `GlyphDrawnController` (`OPTION_GLYPHS`) and `GlyphMirrorController` (`OPTION_MIRRORED`).
- The rules that differ are the field's own: whether an option may have the empty value, what typing does (a combobox
  does not call `key()` for printable characters: they go to its input), and what is drawn while nothing matches.
- What a combobox adds to the list, each an option of the primitive: `replacement` (the option that becomes active
  when the active one is no longer drawn, or while none is — none where Enter keeps the text), `setActive(option | null,
  keyboard)` (typing makes the first match active), `started`, `start(keyboard, active)` (a list opened by typing), and
  in `render()` `after` with `tail` (the status row: in the sheet under the box that scrolls, outside the list box,
  which holds options and groups only) and `busy` (`aria-busy` on the list box).
- The field's box is shared too (`src/primitives/field-trigger.ts`), and so are its tokens: the box of a text input,
  a select, a combobox, a number input and a color input is drawn from one set, `comp.input-box`
  (`--tanrei-comp-input-box-*`). The module owns that prefix (`INPUT_BOX`) and no caller gives one: the
  component's own prefix is for what it alone draws (the list above, steppers, a swatch). `triggerTokens(parts)` gives
  the token blocks of a variant, a size, a look and a state; `triggerOn` where each state is read; `floatingLabelStyles()`,
  `floatingLabel()`, `floatingAsterisk()` and `FloatingLabelController` the label of a filled or outlined field;
  `triggerEdgeStyles()` and `triggerEdges()` the stacked line, the outline's three pieces and the active indicator.
  The component writes its own container, its line (a value, or an input) and its glyphs.
  `triggerTokens()` takes, as its third argument, the members of the size axis the field has: a number field holds no
  glyph in its container and has neither `icon.size` nor `container.padding-inline-with-icon`.

### The input box: one set of tokens for five controls

`<tanrei-text-input>`, `<tanrei-select>`, `<tanrei-combobox>`, `<tanrei-number-input>` and `<tanrei-color-input>` draw
their box — the container and its corners, the edges, the floating label, the value's line, the glyphs, the paddings
and the height of a size, and the colors of each in a look and a state — from `--tanrei-comp-input-box-*`. None of
them has a custom property of its own for any of it.

```css
/* every input box of the product */
:root { --tanrei-comp-input-box-container-shape: var(--tanrei-sys-shape-corner-extra-small); }
/* one kind: every combobox, a combobox inside a combobox field included (custom properties inherit) */
tanrei-combobox { --tanrei-comp-input-box-container-shape: var(--tanrei-sys-shape-corner-none); }
```

```html
<!-- one instance -->
<tanrei-select style="--tanrei-comp-input-box-container-height-medium: 44px" label="Country">…</tanrei-select>
```

A design system sets the box in its layer, once (`tanrei.comp.input-box.*`); it cannot give one kind of control a
different box as its default. What each control keeps under its own name: the text input its resize grip, segments,
code face and entries place; the select and the combobox their list and options (and the rows' own `motion-state-*`
and `<state>-opacity`); the number input where its steppers stand and how a hold repeats; the color input its swatch's
shape and hairline (its size is the box's `icon-size-*`). `size` and `variant` of the five are the box's
(`TanreiInputBoxSizeRegistry`, `TanreiInputBoxVariantRegistry` in `@tanrei/web/registry`): a layer that adds a look or
a size adds it to the box and all five take it; the select offers `small`, the four others do not.

## `<tanrei-combobox>`

One value found by typing: a box that looks and measures like a text input, with a list of options that narrows as
the person types and that they choose from, or, where the product allows it, a value of their own
(`specs/combobox.spec.json`, CMB-1…62; `listing: advanced`). **The bare control**: it draws no label
row, no requirement tag, no help and no error text — those are the rows of the `<tanrei-field>` that frames it, and
`<tanrei-combobox-field>`, below, is the two as one element, which is what a form uses. The bare combobox is for a
place whose label stands elsewhere: a filter in a toolbar, a cell of a table, a row of an editor. The pattern is the
editable combobox with a list box: focus stays in the input and one option at most is the active one. The options are
the select's elements.

```html
<!-- Bare: named by its own label, which a stacked combobox does not draw. Its place gives it its width. -->
<tanrei-combobox label="Token" placeholder="Find a token" no-chevron style="inline-size: 16rem">
  <tanrei-option value="primary">primary</tanrei-option>
</tanrei-combobox>

<!-- Framed by hand — what <tanrei-combobox-field> is, one level down. The Field names it, describes it and marks it. -->
<tanrei-field label="City" required supporting-text="Where the order is sent.">
  <tanrei-combobox name="city" value="tokyo" clearable clear-label="Clear city">
    <tanrei-option value="kyoto">Kyoto</tanrei-option>
    <tanrei-option value="tokyo">Tokyo</tanrei-option>
  </tanrei-combobox>
</tanrei-field>

<!-- The options are suggestions: a text that names none becomes the value. -->
<tanrei-combobox label="Font family" value="Recursive" allow-custom-value>
  <tanrei-option value="Inter">Inter</tanrei-option>
</tanrei-combobox>

<!-- The product filters, on input, and says what its source is doing. -->
<tanrei-combobox label="Assignee" filter="none" no-chevron status="loading" status-text="Loading people">
  <span slot="leading-icon">person_search</span>
</tanrei-combobox>

<!-- A product's own element passes its children on as the options: a <slot> among the combobox's children. -->
<!-- (in the shadow root of <plan-picker>) -->
<tanrei-combobox label="Plan"><slot></slot></tanrei-combobox>
```

**What is the field's, not the combobox's**: the seven properties `supportingText`, `errorText`, `required`,
`optional`, `requiredMark`, `requiredText` and `optionalText` with their attributes, the `label-icon` slot, the parts `label-icon`
and `supporting-text`, and the type `TanreiFieldRequiredMark`.
`<tanrei-combobox label="City" supporting-text="…" required>` renders and works, and silently draws none
of the three: that is `<tanrei-combobox-field>` with the same attributes, children and listeners. A bare combobox is
never required by itself; the host is a block as wide as its place; and `toggle` is composed.

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `stacked` \| `filled` \| `outlined` (+ values a layer adds) | `stacked` | the text input's three looks: `stacked` draws no label (the label above is its Field's row), `filled` and `outlined` float it in the box; a value the combobox does not know by name is laid out as stacked; reflected |
| `size` | `medium` \| `large` (+ values a layer adds) | `medium` | the container's minimum height (48 / 56 in the default system): the text input's sizes; reflected |
| `value` | string | `""` | the committed choice: the chosen option's value, or with `allowCustomValue` a text that names no option. The attribute is what a form reset returns to |
| `inputValue` / `input-value` | string | `""` | the text in the input: written by the combobox as the person types and when a value is chosen or restored; the product may set it |
| `name` | string | `""` | the name `value` is submitted under; reflected |
| `label` | string | `""` | its own accessible name, for a combobox no Field frames or one whose visible label is elsewhere; a filled or an outlined one draws it floating. Inside a Field leave it empty: its own would win over the Field's |
| `labelHidden` / `label-hidden` | boolean | `false` | does not draw the floating label, which stays the name; reflected |
| `placeholder` | string | `""` | a hint while the input is empty and the label is not in the input line |
| `error` | boolean | `false` | the error condition of a bare combobox: the box drawn from its error parts, exposed as invalid. The combobox never sets it itself and has no error text. Inside a Field, set it on the Field; reflected |
| `disabled`, `readOnly` / `readonly` | boolean | `false` | disabled: no focus, no editing, not submitted (inside a Field, disable the Field, so that the label follows). Read-only: focusable, selectable and submitted, never changed; no chevron, no clear button |
| `open` | boolean | `false` | whether the list is shown; ignored while disabled, read-only or with nothing to show; reflected |
| `allowCustomValue` / `allow-custom-value` | boolean | `false` | a text that names no option becomes the value as typed; otherwise it is given up when the person leaves; reflected |
| `filter` | `contains` \| `none` | `contains` | who decides which options answer the text: the combobox, or the product on `input`; reflected |
| `noChevron` / `no-chevron` | boolean | `false` | the spec's `chevron`, inverted (a boolean attribute cannot default to true): draws no chevron; reflected |
| `clearable`, `clearLabel` / `clear-label` | boolean, string | `false`, `""` | a clear button while the text is not empty, and its accessible name |
| `status`, `statusText` / `status-text` | `idle` \| `loading` \| `error`, string | `idle`, `""` | what the product's source is doing, and the status row's text |
| `emptyText` / `empty-text` | string | `""` | shown while the text matches nothing, no custom value is allowed and no status is set: the instance's, else the product's words; without them no such row is drawn (CMB-32) |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | what parts the groups; reflected |
| `inline` | boolean | `false` | for fixtures: the open list in place below the field, not in the top layer |

| Event | When |
|---|---|
| `input` | the person changed the text: the native, composed `input` of the text element (typing, deleting, pasting, an input method committing), and one more when the clear button empties the text and when Escape restores it. `inputValue` is already the new text. Never when the product sets `inputValue` or `value`, or when a choice writes its label |
| `change` | the committed value changed by the person. A composed, bubbling `CustomEvent`; `detail.value`, `detail.inputValue`; `value` is already the new one |
| `toggle` | the list was opened or closed by the person, or closed by having nothing left to show. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. A `CustomEvent` that is composed and does not bubble, as the platform's own `toggle`: heard on the element, and on an element whose shadow root holds it, and by no ancestor |
| `action` | Enter with no option active, after the text was committed and after any `change` it caused. Cancelable: unless cancelled, the form is asked to submit (`requestSubmit()`) |

Slots: the default slot (the options, read and not drawn in place), `leading-icon`. Parts: `container`, `outline`,
`active-indicator`, `label` and `requirement-label` (the floating label and its asterisk), `input`, `leading-icon`,
`clear-button`, `chevron`, `list`, `option`, `option-label`, `option-supporting-text`, `option-leading-icon`, `mark`,
`group`, `group-title`, `divider`, `status`. Methods: `focus()`, `blur()`, `select()`, and the form's (`form`,
`validity`, `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()`).

**With its Field (CMB-61, CMB-12; `src/primitives/field.ts`).** The combobox takes the Field's name, its description
— the help, the error text while the Field is in error and the optional text —, its required, invalid and disabled states, whether the
label is hidden and whether an asterisk follows a floating label (the Field reads the design system's required mark,
and a chip named there reaches a floating label as the asterisk: CMB-7). They are written on the native input as
`aria-label`, `aria-describedby` to a hidden text of the combobox's own shadow root, `aria-invalid` and
`aria-required`; an id cannot cross a shadow root. It says three things back (`FieldSays`): `drawsLabel` while its
look floats one, so that the Field draws no label row (FLD-25); `inset`, where its input text starts — past a leading
glyph — and the padding it keeps at its end, as lengths of its own tokens (`INSET` in `combobox.styles.ts`), so that
the Field's supporting row starts and ends there (FLD-26); and `drawnFocused` for as long as its list is open, whether
or not it has focus, so that the Field's rows are drawn focused with it (FLD-13) — a value the text input never
needed, which the select says too. It keeps no count and reports no refusal. The label row is outside the combobox:
a press on it while the list is open closes the list with the reason `outside`, and FLD-12 gives the input focus.

**The options through a slot (clauses O1 to O9; `src/primitives/option-list.ts`).** A child
that is a `<slot>` with no `slot` attribute stands for the elements assigned to it, flattened, in its place: each is
read as though it were the combobox's own child there. That is how `<tanrei-combobox-field>` — and a product's own
element — gives the combobox the options written as *its* children, which are never moved or copied. The reader hears
`slotchange` on the host (it bubbles from a slot among its children, and from a slot assigned to that one, at any
depth) and observes each assigned element as it observes its own children, so every change a combobox with options as
children answers is answered alike through a slot. A `<slot>` that names one of the combobox's own slots
(`leading-icon`, passed on) is not read for options. An option's own `lang` and `dir` are looked for up to its owner —
the element it is a child of in the page — and no further; the owner's and the page's are inherited.

**Width (CMB-49, CMB-62).** A block exactly as wide as its place and exactly as tall as its container, framed and bare
alike. It has no width of its own: never a native text element's default, never its options' or its value's.

**Two things, never confused (CMB-17).** `value` is the committed choice and `inputValue` the text. While the person is
not editing, the text is the chosen option's label (also when the options that name it arrive later); a value that
names no option shows itself where a custom value is allowed and an empty input otherwise, and is kept. The value
changes only by a choice (a press on an option, Enter on the active one), a commit (Enter with none active, or
leaving the field: an empty text empties it, a whole label chooses its option, any other text becomes the value where
`allowCustomValue` is true and is given up otherwise) or the clear button. An option whose value is the empty string is
drawn and never chosen: the empty value means that nothing is chosen (a select allows it; the combobox refuses it).

**Typing (CMB-16, CMB-25, CMB-26, CMB-38).** The text is edited in a native `<input type="text" role="combobox">` in the
shadow root with `autocomplete="off"`, `autocapitalize="none"`, `autocorrect="off"` and `spellcheck="false"`
(`NativeTextController`, as the text field's). Under `filter="contains"` the list shows the options whose label
contains the text, compared letter by letter in compatibility form, without marks and in lower case — so `TO`, `ｔｏ`
and `to` find the same options and `bogota` finds `Bogotá`; the two sound marks of kana are kept, so `か` does not find
`が`. The first run of each label that matched is a `<mark>` with no fill, in the label's color, its weight raised by
`option.match.emphasis`; the option is named by the whole label. Typing makes the first shown option that is not
disabled the active one, and none where a custom value is allowed, so that Enter commits what the field shows as about
to be committed. The combobox never fetches, waits, debounces, sorts or ranks.

**An input method (CMB-16).** While one composes (`compositionstart` … `compositionend`, `event.isComposing`, key code
229) every key is its own: the combobox prevents none and acts on none — the Enter that confirms a conversion chooses
nothing, commits nothing and submits nothing. The list is filtered by the text the element reports, no option is
active, and nothing is written into the element; a text the product sets meanwhile is applied when the composition
ends. One `input` that is not composing ends it, and then the first match is active.

**Keys.** Down or Up Arrow (also with Alt) open a closed list with every option, the chosen one active; open, they move
the active option and stop at the ends (Up Arrow on the first leaves none where a custom value is allowed); Page Down
and Page Up move by ten. Home, End, Left and Right Arrow are the text's. Enter chooses the active option and does
nothing else; with none active it commits and fires `action`. Escape closes an open list and goes no further; closed,
over an edited text, it writes the committed value's text back (one `input`) and stops; otherwise it passes on. Tab
leaves: the text is resolved, the active option is not chosen, the list closes with `tab`.

**The list (CMB-22 … CMB-45).** The option list a select draws (`src/primitives/option-list.ts`), exactly as wide as
the container, with no least width. The status row stands in the sheet under the options: `statusText` in a
`role="status"` element while idle (the empty text too), in a `role="alert"` element while `status="error"`, and while
loading a small `<tanrei-loading-indicator>` named by `statusText`, both live regions empty and the list box
`aria-busy`. The regions are there from the moment the list opens.

**Forms (CMB-59).** `static formAssociated = true`: `name`, the submitted `value` — never the text of an edit that was
not committed — `formResetCallback` (the `value` attribute, and the text with it), `formStateRestoreCallback`,
`formDisabledCallback`, and `valueMissing` while the Field that frames it says it is required and `value` is empty,
anchored on the input. Its two calls on `ElementInternals` go through `FormSays` and its form for Enter through
`formOf()` (`src/primitives/form-says.ts`, `default-button.ts`), so that an element composed around it is the form's
control in its place. `inputValue` is an accessor: the native `input` is the browser's own composed event, which a
capturing listener on an ancestor hears before the combobox has taken the text, so what the person has just typed is
read from the native element until then — `event.target.inputValue` is the new text in every listener.

What the web does in its own way, and what it cannot do:

- **The input names itself** (`aria-label`): its own label, else its Field's. The description its Field gives is a
  hidden text of the combobox's own shadow root that the input points at (`aria-describedby`), as the text input's
  is, where the spec's web note lists `aria-description`. The list box
  and the chevron's button are named by the same name.
- **An `open` the product sets over nothing to show stays `true`** on the property and shows no list (CMB-57): it is
  taken back only for a list that was shown and has nothing left (`toggle`, reason `empty`). Its Field is told
  `drawnFocused` only while a list is shown.
- **The status row does not scroll with the options**: it stands under the box that scrolls, so that the list box
  holds options and groups only, the box that scrolls is the list box (which a keyboard moves through by its active
  option), and a count or a failure stays in view above a long list.
- **A press outside also reaches the element under it** (CMB-30): the list is not modal and draws no scrim. A press
  that takes focus resolves the text; the input does not take focus back.
- **Focus that leaves the window resolves nothing**: the text is resolved when focus goes elsewhere in the page.
- **The divider between two groups is hidden from assistive technology**: a list box holds options and groups only.
- **A read-only combobox reports no missing value**, as a native read-only control is barred from validation.
- **The comparison knows no language**: it folds width, marks and case for every script alike (the kana sound marks
  excepted), and does not match a Hangul syllable by its first consonant or kana by its reading.
- **A placeholder's own direction** (CMB-55) is drawn where the engine styles a placeholder's bidi (Chromium,
  WebKit); Firefox applies no `unicode-bidi` to it, and lays a hint out by the input's direction.
- **The keyboard's top edge** (CMB-58) is the visual viewport's lower edge, where a browser reports one
  (`keyboardCover()`, as a popover's).
- **Before the element is defined** its options are running text in the page: hide `tanrei-combobox:not(:defined) > *` and reserve the block size.
- **Choices of kind** are read from the cascade: the separation by a style query, with `data-separation` written by
  the element where a browser has none; the focus style when focus arrives (`data-focus-style`, on the box and on the
  active option's row). The required mark is its Field's to read (FLD-25).
- **The active option on the web is `aria-activedescendant`**: no announcement of the combobox's own is made for it
  (CMB-48's fallback is for platforms whose assistive technology cannot follow it).

## `<tanrei-combobox-field>`

Lets people find one value by typing as one complete field: a `<tanrei-combobox>` under a `<tanrei-field>`'s label —
or, in the filled and the outlined look, with the label floating in the box — with the Field's requirement mark, its
help and its error (`specs/combobox-field.spec.json`, CBF-1…7). It is a **composed** element: its shadow
root is the two members' own elements and nothing else, it draws nothing of its own and has no token. It takes the
attributes, children and listeners of a framed combobox, name for name.

```html
<tanrei-combobox-field name="city" label="City" required supporting-text="Where the order is sent."
                       value="tokyo" clearable clear-label="Clear city">
  <tanrei-option value="kyoto">Kyoto</tanrei-option>
  <tanrei-option value="tokyo">Tokyo</tanrei-option>
</tanrei-combobox-field>

<!-- its shadow root -->
<tanrei-field part="field" exportparts="…">
  <slot name="label-icon" slot="label-icon"></slot>           <!-- only while the element has such a child -->
  <tanrei-combobox part="combobox" exportparts="…">
    <slot></slot>                                              <!-- the product's options: always -->
    <slot name="leading-icon" slot="leading-icon"></slot>      <!-- only while the element has such a child -->
  </tanrei-combobox>
</tanrei-field>
```

Built as "Composed elements" above says (`ComposedControl`; W1 to W13); what follows is what differs (W14).

| | |
|---|---|
| To the Field (10) | `label`, `labelHidden`, `supportingText`, `errorText`, `error`, `disabled` (joined with a disabled fieldset's), `required`, `optional`, `requiredMark`, `requiredText`, `optionalText` |
| To the combobox (16) | `variant`, `size`, `value`, `inputValue`, `placeholder`, `readOnly`, `open`, `allowCustomValue`, `filter`, `noChevron`, `clearable`, `clearLabel`, `status`, `statusText`, `emptyText`, `separation` — and `inline`, its test attribute, which is no prop of the spec and is kept out of the manifest |
| Never set | the combobox's own `label`, `labelHidden`, `error`, `disabled`: they reach it through the Field's connection |
| Events | `input`, `change`, `action` leave by themselves, composed and bubbling; `toggle` is composed and does not bubble (heard on the element, by no ancestor). None is stopped, none is copied |
| Slots | `label-icon` to the Field and `leading-icon` to the combobox (`pass()`), and **the default slot to the combobox, always rendered**: the options stay the element's own children (CBF-2) |
| Parts | `field`, `combobox`; the Field's without `counter`; the combobox's nineteen. `label` and `requirement-label` collide: `field-label`, `combobox-label`, `field-requirement-label`, `combobox-requirement-label` always, and the bare names from both — the two are never drawn at once (FLD-25) |
| Methods | `focus()`, `blur()`, `select()` go to the combobox; the form's are the element's own |

**Three props the combobox writes itself (CBF-3; W5).** `value`, `inputValue` and `open` are at every moment the
combobox's: `value` by `memberValue()` / `giveValue()`, and `inputValue` and `open` by accessors of the same form —
what the product has just set until the next render has given it to the combobox, and from then on what the combobox
holds. So each is the new one in every listener, and where no event reports it: a text given up on leaving is written
back with no event, and the element's `inputValue` is the value's text again. `open` is reflected on the host: the
combobox opens and closes its list itself, so the host's attribute follows after each of the combobox's updates
(`memberUpdated()`).

**The form (CBF-4).** The element is the form's one control: it repeats what its combobox tells its own internals —
the committed value, never the text of an edit; nothing while disabled; `valueMissing` while `required` is
set and the value is empty, anchored on the combobox's input. Enter with no option active presses the default
button of the element's own form; an Enter that chooses an option submits nothing.

**Focus, and the label row (CBF-5).** Not delegated. A press on the Field's label row focuses the input and opens
nothing; while the list is open it is a press outside the combobox, so the list closes with the reason `outside`,
choosing nothing, and focus stays in the input. While the list is open the Field's rows are drawn focused, because
the combobox says so to its Field: the element arranges nothing for it.

What to know:

- **It is a block as wide as its place** and its box fills it (CBF-1), where `<tanrei-combobox>` was an inline box as
  wide as a native text input.
- **An open list is not drawn in place by a documented attribute**: `inline` is the combobox's test attribute, passed
  on for the fixtures and kept out of the manifest, so a page that lists fixtures draws an open combobox field closed
  with an opener (the docs' Specs tab), while the Field's twin — which holds the combobox itself — is drawn open.
- **In a Field it is reported** (FLD-15) with the bare control named, `<tanrei-combobox>`; in a field group it follows
  the group's `disabled` through its own Field (CBF-6).
- **Before the element is defined** its options are running text: hide `tanrei-combobox-field:not(:defined) > *`.

## `<tanrei-number-input>`

The box of a number: typed in the locale's form or stepped by a key or a button, kept within limits when it is
committed, with its unit beside it — a box that looks and measures like a text input, with no row around it
(`specs/number-input.spec.json`, NMI-1 to NMI-46; `listing: advanced`). It is `<tanrei-number-field>` without the frame: the label above, the requirement mark, the help and the error are the rows
of the `<tanrei-field>` that frames it, or it is bare and named by its own `label`. It stands on the box a select and a
combobox share (`src/primitives/field-trigger.ts`); its steppers are `<tanrei-button>`s.

```html
<!-- Bare, beside a slider under a row title the product draws: each one's input written into the other's value. -->
<tanrei-slider id="scale" label="Scale" min="0.25" max="4" step="0.05" value="1.5"></tanrei-slider>
<tanrei-number-input id="scale-number" label="Scale" min="0.25" max="4" step="0.05" value="1.5"
                     suffix-text="×" value-text="1.5 times" align="end" no-steppers></tanrei-number-input>

<!-- In a Field, by hand: the twin of a number field. -->
<tanrei-field label="Quantity" required supporting-text="Up to 99 per order.">
  <tanrei-number-input name="quantity" min="1" max="99" invalid-text="Enter a number."></tanrei-number-input>
</tanrei-field>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `stacked` \| `filled` \| `outlined` (+ values a layer adds) | `stacked` | the text input's three looks: `stacked` draws no label (it is its Field's row), `filled` and `outlined` float it in the box; a value the number input does not know by name is laid out as stacked; reflected |
| `size` | `medium` \| `large` (+ values a layer adds) | `medium` | the container's minimum height (48 / 56 in the default system); reflected |
| `value` | number \| null | `null` | the committed number. The attribute is a plain decimal string (`"12.5"`), and what a form reset returns to |
| `name` | string | `""` | the name the value is submitted under; reflected |
| `label` | string | `""` | its own name, for an input no Field frames or one whose visible label is elsewhere; it wins over the Field's, and is what a floating look draws. Empty and unframed is reported (NMI-12) |
| `labelHidden` / `label-hidden` | boolean | `false` | a filled or an outlined input draws no label; it stays the name |
| `placeholder` | string | `""` | a hint while the input is empty and the label is not in the input line |
| `error` | boolean | `false` | the error condition of the box — the product's; the Field sets the same through the connection. No error text: the words are the Field's row |
| `invalidText` / `invalid-text` | string | `""` | the words of the refusal of a text that is not a number: reported to the Field, which shows them (FLD-28: its `errorText` while they are empty, then its help in the error color); the input's description while no Field frames it |
| `disabled`, `readOnly` / `readonly` | boolean | `false` | disabled: no focus, no editing, no stepping, not submitted. Read-only: focusable and copyable, no key steps it, no steppers, submitted |
| `min`, `max` | number \| null | `null` | what a commit keeps the number within; `min` is also where the steps are counted from. A `max` below `min` is no limit (reported) |
| `step` | number | `1` | how far an arrow key and a stepper move; the page keys ten times as far. Not a limit on what is typed. 0 or less steps by 1 (reported) |
| `noSteppers` / `no-steppers` | boolean | `false` | draws no steppers (the spec's `steppers`, inverted); the keys still step |
| `incrementLabel` / `increment-label`, `decrementLabel` / `decrement-label` | string | `""` | the steppers' accessible names: the instance's, else the product's words. A stepper without one is still drawn and steps for a pointer, and is kept from assistive technology, where the spin button steps by itself (NMI-44) |
| `prefixText` / `prefix-text`, `suffixText` / `suffix-text` | string | `""` | fixed text before and after the number: a currency sign, a unit. Not part of the value |
| `valueText` / `value-text` | string | `""` | the value in words, for assistive technology, in place of the number with its prefix and suffix |
| `align` | `start` \| `end` | `start` | where the number stands in the input: `start` is the field's start edge, `end` the end of the number's run — where the suffix stands or would stand, the right for a left-to-right run in every layout direction (NMI-29); reflected |
| `minFractionDigits` / `min-fraction-digits`, `maxFractionDigits` / `max-fraction-digits` | number | `0`, `3` | the fewest digits shown after the separator, and the most a commit keeps (0 to 20) |
| `locale` | string | `""` | a BCP 47 tag for the digits and the separator; empty reads the nearest `lang` attribute, then `navigator.language` |

No slot. Parts (`static parts`): `container`, `outline`, `active-indicator`, `label` (the floating label),
`requirement-label` (its asterisk), `input`, `prefix`, `suffix`, `stepper` (two). Methods: `focus()`, `blur()`, `select()`, and the
constraint validation's `form`, `validity`, `validationMessage`, `willValidate`, `checkValidity()`, `reportValidity()`.

| Event | | When |
|---|---|---|
| `input` | `CustomEvent<{ value: number \| null }>`, composed, bubbling | the person changed the text (the number it reads as, not clamped and not rounded; `null` for no value and for what is not a number), and once for each step. The native input's own `input` stops at the shadow root |
| `change` | `Event`, composed, bubbling | a commit changed `value`: focus left, Enter, a key stepped it, or a pressed stepper was released. `value` is already the new one |
| `action` | `Event`, composed, bubbling, cancelable | Enter, after any `change`; unless cancelled the form is asked to submit (`requestSubmit()`) |
| `entryerror` | `CustomEvent<{ reason: 'invalid', text }>` | a text that is not a number was committed; `text` is the input's `invalidText`, empty where none was given |

None of them fires when the product sets `value`, and `value` is set — and the form's value with it — before `change`.

**With its Field** (NMI-45; `FieldControlController` with `says`, `src/primitives/field.ts`). It says `drawsLabel`
while its variant floats a label, so the Field draws no label row (FLD-25); `inset` — `INSET(size)` in its styles: its
inline padding at both ends, as a `var()` of its own token that the Field resolves where it stands, the same with and
without steppers (FLD-26: a line of help is aligned with the text above it, not with a button); and `refusal`, with
`invalidText`, while an entry error lasts (FLD-28). It takes the Field's name, description, `invalid`, `required` and
`disabled`, and `labelHidden` and `requiredMark`: the asterisk after a floating label is drawn exactly while the Field
says `asterisk` — no control reads the design system's required mark, and `floatingLabelStyles()` writes no rule
about one. It is described by a hidden text of its own shadow root (`#description`): what the Field gives, or
`invalidText` while it is bare and in an entry error. It draws no announcer: the Field announces (FLD-9, FLD-28).
`resetTo(value)` is internal: a form's reset, which the composed number field calls with its own first value.

**The number as text** is `number-text.ts`, beside the element, with no page in it: a decimal held exactly as a
`BigInt` and a scale (`decimalOf(0.1)` is one tenth: the digits of the number's shortest text, not its binary
fraction), `stepped()`, `clamp()`, `round()` (a half away from zero), `format()` and `read()`, and `numberForm(locale)`
— the locale's ten digits, decimal separator, grouping separator and minus sign, asked of `Intl.NumberFormat` once.
`Intl` formats nothing else: the field writes the digits itself, so a number is rounded as its decimal digits say and
never written with an exponent.

- **Reading** (NMI-18). Spaces and marks of direction are dropped; a hyphen-minus, a minus sign (and their full-width
  forms) or a plus sign before the digits — before or after the prefix — is the sign; `prefixText` and `suffixText`
  are dropped where they were typed, without regard to case; digits are ASCII, the locale's, full-width, and the
  decimal digits of the scripts a keyboard gives (Arabic-Indic and its eastern form, Devanagari, Bengali and the other
  Indic scripts, Thai, Lao, Tibetan, Myanmar, Khmer, Mongolian) in every locale; the separator is the locale's — and
  an ASCII or full-width period wherever the locale does not group with a period; the locale's grouping separator
  says nothing between two digits before the separator. Everything else is not a number. In German `1.500` is 1500
  and `1.5` is 15; in French and in Egyptian Arabic `1.5` is 1.5.
- **Writing** (NMI-17). The locale's digits and separator, `minFractionDigits` to `maxFractionDigits` digits, no
  grouping, no exponent. The minus sign is the locale's without the mark of direction some locales put before it
  (Arabic, Hebrew, Persian): the input lays its text out left to right in every layout direction (NMI-39), and with
  the mark the sign would be drawn after the digits. A value the product set with more digits than
  `maxFractionDigits` is shown rounded and is not changed (`value` stays what the product gave; a field that is
  entered and left without an edit commits nothing).
- **A step** (NMI-22) starts from what the text reads as where the person changed it, and from `value` otherwise; goes
  to the next number that is `min` (or zero) plus a whole multiple of the amount — the amount of a page key is ten
  steps, so Page Up from 42 with a step of 2 gives 60; is held within the limits and rounded to `maxFractionDigits`,
  as a commit is.
- **A hold** (NMI-27) reads its three waiting times from the `transition-delay` of the steppers' box (a duration token
  is an expression), when the press begins. A press steps on `pointerdown` and says `change` when the pointer is
  released, leaves the stepper, or the value reaches the limit; the container's `mousedown` is cancelled, so no press
  on a stepper moves focus. A `click` that no press of a pointer began (assistive technology, `element.click()`) steps
  once and says `input` and `change`.
- **An input method** (NMI-16) is left alone: while it composes nothing is read, nothing is said and no key is the
  field's; the text is read once when the composition ends, and a value the product set meanwhile is written then.
- **The form** (NMI-35): through `FormSays` (`says.value()`, `says.validity()`), with the plain decimal string, at
  once on a commit; `valueMissing` while its Field says it is required and it has no value, `badInput` while an entry
  error lasts (its message is `invalidText`, else what its Field shows), anchored on the input. A read-only or
  disabled input is not validated. Enter asks `formOf(this, this.form)`: its own form, or the form of the element
  composed around it.
- **Width** (NMI-36): the host is block-level (`display: flex`), as wide as its place, with
  `min-inline-size: min-content`; the input is `inline-size: 100%` and `min-inline-size: 3ch` — a text input given a
  percentage width counts as nothing in its container's least width, so the least width is the paddings, the affixes,
  three digits and the steppers. It has no width of its own: the native input's default width is never the host's.
- **The run** (NMI-39): the prefix, the number and the suffix are one run of writing, and the box that
  holds the three (`.body`) has the run's direction as its own `dir` in every layout direction — `runDirection()` of
  `src/styles/product-text.ts`: the first strong character of `prefixText`, then of `suffixText` (a letter, or one of
  the marks U+200E, U+200F and U+061C), and left-to-right where they have none. It is read from the two props alone.
  So `.body` places nothing of its own by a logical side: the paddings are the container's and the gap before the
  steppers is the steppers' margin, both the layout's, and the affixes' margins are logical in the run's direction.
  The native input is `direction: ltr` and aligned physically (NMI-29): left, right under the host's `:dir(rtl)`,
  right for `align="end"`, and left for `align="end"` in a right-to-left run (`data-run` on the field). The Text input
  does the same for one line of email, url, tel, number or password (TXI-67), where the gap an icon keeps from the row
  is written from the layout's side while the row runs against it, as a code field's is; a row that holds entries
  (TXI-64) keeps the layout's direction, because its lines begin at the field's start edge.
- **The steppers** are `<tanrei-button variant="text">` with `.outsideFocusOrder=${true}` (an internal property of the
  Button, `src/primitives/focus-order.ts`: `tabindex="-1"` on its native button) and `KeptLengths` + `keptLength()`
  between them. The length the pair takes is written on the field as `--_steppers`, for a floating label to end before.
- **A press that reaches the limit** (NMI-26) does not disable the stepper it is on before the `mousedown` of that
  press has been heard — at once for a mouse, at the release for a touch: the step is taken at `pointerdown`, the
  field keeps focus where it is from the container's `mousedown`, and a stepper disabled between the two left focus
  on the page instead of in the input. Held by `src/components/button/disabled-while-focused.test.ts`.

What a browser does differently:

- **Chromium's accessibility tree takes the value text of a text input from the text in it** and passes over
  `aria-valuetext` on an input that is a spin button: the number is read, the unit and `valueText` are not (the
  attributes are set as the spec says, with a test that fails the run when the browser honors it).
- Firefox applies no `unicode-bidi` to a placeholder: there it follows the input's direction, which is left to right.
- Home and End move the caret where the platform's text input gives them that (not in Firefox and Safari on macOS);
  the field takes neither.
- `inputmode` is `decimal` (`numeric` while `maxFractionDigits` is 0), and `text` on iOS and iPadOS while a negative
  number may be typed: their decimal keypad has no minus sign.
- A change of an ancestor's `lang` is not observed: the number is written in the new form at the next commit, step or
  set value.
- Before the element is defined it has no size and shows nothing.

## `<tanrei-number-field>`

A number as one complete field of a form: a composed element ("Composed elements", above) whose shadow root
holds a `<tanrei-field>` around a `<tanrei-number-input>` and nothing else (`specs/number-field.spec.json`, NUM-47 to
NUM-51). The tag, the class, the React name, the 29 properties, the 4 events and the slot are what they were before the
split; it draws nothing, holds no state and has no token.

```html
<tanrei-number-field label="Corner radius" name="radius" value="8" min="0" step="0.25" suffix-text="px"></tanrei-number-field>
<tanrei-number-field label="Amount" value="120" prefix-text="$" suffix-text="USD" min-fraction-digits="2" max-fraction-digits="2"></tanrei-number-field>
```

| | |
|---|---|
| To the Field (10) | `label`, `label-hidden`, `supporting-text`, `error-text`, `error`, `disabled` (joined with a disabled fieldset's), `required`, `optional`, `required-mark`, `required-text`, `optional-text` |
| To the number input (19) | `variant`, `size`, `value`, `placeholder`, `readonly`, `min`, `max`, `step`, `no-steppers`, `increment-label`, `decrement-label`, `prefix-text`, `suffix-text`, `value-text`, `align`, `min-fraction-digits`, `max-fraction-digits`, `locale`, `invalid-text`. The input's own `label`, `labelHidden`, `error` and `disabled` are never set |
| Value | `number \| null`, at every moment the input's (`ComposedControl<number \| null>`); `firstValue()` reads the `value` attribute as the input does, and a reset calls the input's `resetTo()` so that the same value is still a new one |
| Events | `input`, `change`, `action`, `entryerror`: the input's own, with the element as their target; none is dispatched or stopped |
| Slot | `label-icon`, passed to the Field |
| Parts | `field`, `number-input`; from the Field `label`, `label-icon`, `requirement-label`, `supporting-text` (not `counter`: a number keeps no count; nor `value-text`: its value is read in the input); from the input `container`, `outline`, `active-indicator`, `label`, `requirement-label`, `input`, `prefix`, `suffix`, `stepper`. `label` and `requirement-label` are exported bare from both and always as `field-label`, `number-input-label`, `field-requirement-label`, `number-input-requirement-label` (FLD-25 holds that the two are never drawn at once). `stepper` is a `<tanrei-button>` that is a part of the input: it is exported through two shadow roots, one level at each step, and nothing inside the Button is |
| Focus | not delegated; `focus()` goes to the input; one stop; a press on a stepper moves none |
| Types | the members': `TanreiNumberInputVariant`, `…Size`, `…Align`, `…InputDetail`, `…EntryErrorDetail`, `TanreiFieldRequiredMark` (re-exported by the module) |

It is a block as wide as its place; a long label in a place that gives no width widens it to the row; `entryerror`'s
`detail.text` is the input's `invalidText`; `::part(label)` reaches the drawn one of two; it has no tokens of its own
— the box reads `--tanrei-comp-input-box-*`, the rows `--tanrei-comp-field-*`, the steppers `--tanrei-comp-button-*`,
and one instance is set apart by a member's property on it. Each of its 46 fixtures is the same picture as its twin,
the Field's `number-<id>`, pixel for pixel, in three engines and under each preset.

## `<tanrei-color-input>`

The box in which people set one color: a sample of it, the value as text they read, type and paste, a button that asks
for a picker and, in the two looks that have one, the label that floats inside the box — a box that looks and measures
like a text input's (`specs/color-input.spec.json`, CLI-1…44; `listing: advanced`). **It draws no label row, no
requirement tag, no help and no error text** (CLI-44): those are the rows of the `<tanrei-field>` that frames it —
and `<tanrei-color-field>`, below, is the two as one element, which is what a form uses. The bare input is for a
place that already names the color: a row of a palette's tones, a cell of a table. It stands on the box a select, a
combobox and a number field share (`src/primitives/field-trigger.ts`); its picker button is a `<tanrei-button>`. It
draws no picker surface of its own: the picker is the browser's, or the product's.

```html
<!-- Bare: its own label is its accessible name (a stacked input draws none; a filled or an outlined one floats it). -->
<tanrei-color-input label="Primary, tone 40" value="#0f766e" picker picker-label="Choose the color of Primary, tone 40"></tanrei-color-input>

<!-- Framed by hand — what <tanrei-color-field> is, one level down. The Field names it, describes it and marks it. -->
<tanrei-field label="Brand color" required supporting-text="Six hexadecimal digits, like #0f766e.">
  <tanrei-color-input name="brand" value="#0f766e" invalid-text="Enter six hexadecimal digits, like #0f766e."
                      picker picker-label="Choose color"></tanrei-color-input>
</tanrei-field>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `stacked` \| `filled` \| `outlined` (+ values a layer adds) | `stacked` | the text input's three looks: `stacked` draws no label, `filled` and `outlined` float it in the box; a value the color input does not know by name is laid out as stacked; reflected |
| `size` | `medium` \| `large` (+ values a layer adds) | `medium` | the container's minimum height (48 / 56 in the default system); reflected |
| `value` | string | `""` | `#` and six lowercase hexadecimal digits — an opaque sRGB color — or empty for no color. Never a half-typed text. The attribute is also what a form reset returns to |
| `name` | string | `""` | the name the value is submitted under; reflected |
| `label` | string | `""` | the accessible name where no Field frames it, and what a filled or an outlined input floats; inside a Field leave it empty |
| `labelHidden` / `label-hidden` | boolean | `false` | a filled or an outlined input draws no floating label; it stays the name; reflected |
| `error` | boolean | `false` | the error condition, where no Field frames it (a Field says its own through the connection); reflected |
| `invalidText` / `invalid-text` | string | `""` | the words for a committed text that is not a color: given to the Field, which shows them (FLD-28: its own `errorText` while this is empty); the description of a bare input while the error lasts |
| `disabled` | boolean | `false` | no focus, no editing, no picker, not submitted; inside a Field, disable the Field; reflected |
| `picker` | boolean | `false` | shows the picker button; reflected |
| `pickerLabel` / `picker-label` | string | `""` | the picker button's accessible name — required while `picker` is set |

No slot. Parts: `container`, `outline`, `active-indicator`, `label` (the floating label), `requirement-label` (its
asterisk), `swatch`, `input`, `picker-button`. Methods: `focus()` (the input, never the picker button), `blur()`,
`select()`, and the constraint validation's `form`, `validity`, `validationMessage`, `willValidate`,
`checkValidity()`, `reportValidity()`. It has no `required`: it is required when its Field says so.

| Event | | When |
|---|---|---|
| `input` | `Event`, composed, bubbling | the person changed `value`: an edit made the text a color, another color or no color, or a color was picked in the browser's picker. Not for an edit that leaves `value` as it was. The native input's own `input` stops at the shadow root |
| `change` | `Event`, composed, bubbling | the person committed a changed value: focus left the input, Enter, or the browser's picker closed |
| `pickerrequest` | `CustomEvent<{ value }>`, composed, bubbling, cancelable | the picker button was activated. `preventDefault()` keeps the browser's picker closed: the product presents its own surface and sets `value` |
| `entryerror` | `CustomEvent<{ text, message }>`, composed, bubbling | a text that is not empty and is not a color was committed: the text as typed, and `invalidText` — empty where the product gave none |

None of them fires when the product sets `value`, and `value` is set — and the form's value with it — before the event.

**With a Field** (CLI-43; `src/primitives/field.ts`). It takes the Field's name, description, `required`, `invalid` and
`disabled`, whether the label is hidden and an asterisk or none for a floating label (CLI-7). It says `drawsLabel`
while its look floats one; `inset` — `calc(padding-inline-with-icon + swatch.size + gap)` at the start and
`padding-inline` at the end, with or without the picker button, written from the size's own tokens (`INSET()` in the
styles; nothing is measured); and `refusal: { text: invalidText }` while an entry error lasts. The description is a
hidden element of its own shadow root (`#description`): what the Field gives, or `invalidText` where nothing frames it.

**The notation** is `color-text.ts`, beside the element (`components/color-input/`), with no page in it: `read(text)` — `empty`, a `color` in the
value's own form, or `invalid` — and what follows from it (`valueOf`, `isValue`, `sameColor`, `given` for what the
product sets, `picked` for what the browser's picker reports, `channels` / `fromChannels`).

- **Reading** (CLI-18). The white space around the text is left out (`String.prototype.trim()`: the Unicode spaces, a
  full-width space too); what remains is a color when it is exactly six hexadecimal digits in either case, with or
  without one number sign. Nothing else is: three digits (the text passes through them on the way to six), eight
  (an alpha), a name, `rgb()`, `hsl()`, `oklch()`, full-width digits, a mark of direction inside the text. There is
  no alpha and no wide gamut, so there is no checkered ground under the swatch either: both come with a picker surface
  that can edit them.
- **The value** (CLI-16) has one form, so two values are the same color exactly when they are the same string: `change`
  compares strings, and `0F766E` committed over `#0f766e` changes nothing.
- **Typing** (CLI-17) is free: no pattern, no maximum length, no rewriting under the person's hands. The text is
  rewritten in the value's own form at a commit, never before.
- **A commit** (CLI-19, CLI-20) is the input's `blur` or Enter. A text the person did not change since the last commit
  commits nothing, so Enter and then leaving raise one `entryerror`, not two. A text of white space alone is no text:
  it is cleared and raises no error. Inside a form Enter then calls `requestSubmit()`.
- **What the product sets** (CLI-21) is read by the same rule: `0F766E` is held as `#0f766e`, `teal` as empty (reported
  in a debug build). A value that is what `value` already is — the empty value echoed back while a person is half-way
  through a color — leaves the text alone.
- **An input method** (CLI-17) is left alone: while it composes nothing is read and nothing is said; the text is read
  once when the composition ends, and a value the product set meanwhile is written then.
- **The swatch** (CLI-25, CLI-26) is a `<span aria-hidden="true">` whose `background-color` is the value, through a
  custom property the element writes (`--_value`); a border in a border box is its edge, which the fill runs under.
  It has no transition, no layer of its own and no pointer answer (`pointer-events: none`: a press on it is a press on
  the container). Disabled, its fill is `color-mix()`ed with nothing at `sys.state.disabled-content-opacity`, so the
  edge keeps its strength (CLI-31).
- **Forced colors** (CLI-35): `forced-color-adjust: none` on the swatch and on nothing else — its fill is the content
  the field shows — with a `CanvasText` border. Everything else takes the person's colors.
- **The picker** (CLI-27 … CLI-29). The shadow root holds an `<input type="color" tabindex="-1" aria-hidden="true">`
  under the picker button, `visibility: hidden`, so that the browser anchors its picker there. Activation fires
  `pickerrequest` and then sets that input's value (black while the field is empty) and calls `showPicker()` in the
  same user activation — `click()` where a browser has no `showPicker()`; where neither presents a picker nothing
  happens. Its `input` events are the picks, its `change` the closing; where a browser gives no sign of the closing
  the page's next focus counts as one (the window's, or any element's). Focus returns to the picker button only while
  nothing else in the page has it. The picker button carries `aria-haspopup="dialog"` on its native button.
- **The form** (CLI-11, CLI-20, CLI-31): the value — an empty string while empty — at once on every edit that changes
  it; `valueMissing` while its Field says it is required and `value` is empty (a half-typed text is no value),
  `badInput` while an entry error lasts, anchored on the input. The message of an entry error is `invalidText`, else
  what its Field shows for it, else the browser's own words (read from a native input that is never drawn); of a
  missing value, the browser's. Said through `FormSays`, so that an element composed around it repeats it; Enter
  asks `formOf()` for the form.
- **No words** (CLI-42). The element supplies no text of its own and reads none of the product's:
  `invalidText`, `pickerLabel` and `label` are empty until the product gives them. An entry error without words still
  marks the input, and is reported in a debug build — by the Field when one frames it (FLD-28).
- **`disabled` unset** is drawn at once: the platform's `formDisabledCallback` answers the element's own attribute too,
  in the middle of the update that writes it, and is taken after that update — `takeFormDisabled()`
  (`src/primitives/form-disabled.ts`), which every form-associated element of the package calls from its
  `formDisabledCallback` (`src/primitives/form-disabled.test.ts` lists them and fails when one is added without it).

What a browser does differently:

- **The picker is each browser's own**: a popup of the page in Chromium (it reports picks as they are made and
  `change` when it closes), the system's color window in Firefox and Safari on macOS (their reports differ: a pick may
  arrive only when the window closes, and is then taken as one pick and the closing). Its look, its placement, its
  keys and its dismissal are the browser's.
- A browser that reports nothing when its picker closes without a pick gives no `change`; the input then counts the
  page's next focus as the closing, and has nothing to say for it (no value changed).
- Safari moves no focus to a button a pointer presses: when its picker closes, focus is put on the picker button.
- Before the element is defined it has no size and shows nothing: a
  page that must work before its scripts load reserves the room, or renders a native `<input>` in its place.

## `<tanrei-color-field>`

Lets people set one color as one complete field of a form: a `<tanrei-color-input>` under a `<tanrei-field>`'s label —
or, in the filled and the outlined look, with the label floating in the box — with the Field's help and its error
(`specs/color-field.spec.json`, CLF-43…47). It is a **composed** element: its shadow root is the two
members' own elements and nothing else, and everything it does is "Composed elements", above.

```html
<tanrei-color-field name="brand" label="Brand color" value="#0f766e" required
                    supporting-text="Six hexadecimal digits, like #0f766e."
                    invalid-text="Enter six hexadecimal digits, like #0f766e."
                    picker picker-label="Choose color"></tanrei-color-field>
```

- **Sixteen properties, none its own**: ten are the Field's (`label`, `label-hidden`, `supporting-text`,
  `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`, `required-text`, `optional-text`), six the
  input's (`variant`, `size`, `value`, `invalid-text`, `picker`, `picker-label`). The input's own `label`,
  `labelHidden`, `error` and `disabled` are never set: the Field says each to its control. It does nothing the pair by
  hand does not (no `fills`).
- **A block as wide as its place**, and its box fills it (CLF-43).
- **No token, no part of its own.** `--tanrei-comp-field-*` (the rows), `--tanrei-comp-input-box-*` (the box) and
  `--tanrei-comp-color-input-*` (the swatch)
  reach the members by inheritance; there is no `comp.color-field`. Parts: `field` and `color-input` (the members), and
  theirs — the Field's `counter` left out, since a color has no count. `label` and `requirement-label` are parts of
  both members: each is exported as `field-label`, `color-input-label`, `field-requirement-label`,
  `color-input-requirement-label`, **and under the bare name from both** — the two are never drawn at once (FLD-25),
  so `::part(label)` is the drawn label.
- **`value` is the input's at every moment** — a value set as `0F766E` is read back as `#0f766e`, one that is not a
  color as empty, with no event — and `input`, `change`, `pickerrequest` and `entryerror` are the input's own events
  with the element as their target; it dispatches none, and `pickerrequest` stays cancelable from outside (the input
  reads the result of its own dispatch before it opens the browser's picker, two shadow roots down). The detail types
  are the input's (`TanreiColorInputPickerRequestDetail`, `…EntryErrorDetail`). **`entryerror`'s `detail.message` is
  `invalidText`**, empty where there is none.
- **It is the form's control**: `name`, `form`, the value (nothing while disabled), reset to the `value` attribute,
  restore, a disabled fieldset, `valueMissing` while `required` and empty, `badInput` while a committed
  text is not a color. Enter in the input presses the default button of the element's form.
- **Focus is not delegated, and there are two stops**: the input, then the picker button. `focus()` goes to the input,
  never the button (CLF-45); a press on the label row focuses it (FLD-12), and so does a press on the box, the swatch
  or a floating label (CLI-24); a press on the help or the error text does nothing. **The Field's rows take their
  focused colors while either stop has focus** (FLD-13); the box takes
  its own only while its input has focus (CLI-22).
- In a Field it is reported as a field already, with the bare control named (FLD-15, CLF-46).

## `<tanrei-one-time-code-input>`

A short code sent to the person — a sign-in or verification code — as one text value drawn in separate cells
(`specs/one-time-code-input.spec.json`, OTC-1…30). It is a control a Field frames: it has no label, help or error of
its own, and asks the nearest `<tanrei-field>` for its name, description and states (`src/primitives/field.ts`).

```html
<tanrei-field label="Verification code" supporting-text="Enter the 6-digit code we sent to your phone."
              error-text="That code is not right. Check the message and try again.">
  <tanrei-one-time-code-input name="code" group-size="3"></tanrei-one-time-code-input>
</tanrei-field>

<!-- Where the visible label is elsewhere (a dialog's headline): alone, named by `label`, which is never drawn. -->
<tanrei-one-time-code-input label="Verification code" length="4"></tanrei-one-time-code-input>
```

- **One native input, never one per cell.** The shadow root holds exactly one `<input>` laid over the row
  (`type="password"` while `mask`), its text, selection and caret not drawn, and under it the cells, the caret and
  the group marks as an `aria-hidden` drawing of the value. It carries `autocomplete="one-time-code"`,
  `inputmode="numeric"` (`text` with `autocapitalize="characters"` for `alphanumeric`), `autocorrect="off"`,
  `spellcheck="false"`, `enterkeyhint="done"` and the ARIA name, description and states. It has no `maxlength` and no
  `pattern`: a code pasted as "123 456" would be cut before it is read.
- **The element edits, not the input.** `code-text.ts` holds the reading (OTC-4, OTC-11) and the edits (OTC-6, OTC-9,
  OTC-10) as pure functions of `{ value, active, all }`. Every native edit is stopped in `beforeinput` and applied to
  that state; what cannot be stopped or is not announced (autofill, a composition) is read from the element in
  `input`. After every change the native value is written back and its insertion point put at the active cell
  (OTC-5): collapsed before the active cell's character, or the whole value selected after select all.
- **An input method.** While it composes nothing is written to the native element; the cells draw the value as it
  would be if the composing text were committed, underlined. The commit is read from `compositionend` alone, and for
  the rest of that turn nothing the native element sends is an edit or the action key — so the three engines' orders
  of `compositionend`, `input` and `keydown` give one result (the test file lists them).
- **A press** is the element's: it cancels the native answer (a caret by the unseen text, a selection by dragging),
  makes the pressed cell active while it is filled, and focuses the input itself.
- **The layout is CSS alone.** The row is a wrapping flex row of groups whose flex basis is their narrowest width, so
  cells become narrower before the row breaks; a group is a grid of equal columns that folds when it alone does not
  fit. The mark hangs before its group in a margin every group has; the row starts that margin outside the field, so
  every row starts at the field's edge (`.field` is `contain: layout`, so nothing outside it counts for a scrolling
  ancestor). The one thing script reads from the layout: whether a group begins a row (`data-row-start`, by a
  ResizeObserver), to hide its mark.
- **Events.** `input` (composed, bubbling CustomEvent, `detail.value`; the native input's own is stopped in the shadow
  root), then `complete` when the value is `length` long; `change` on blur or Enter when the value differs from the
  last commit; `action` on Enter (cancelable: cancelling keeps the form from being submitted with `requestSubmit()`).
- **Form.** `static formAssociated`: submits the code under `name` (an empty string while empty, nothing while
  disabled), resets to the `value` attribute, takes `formStateRestoreCallback`, follows `<fieldset disabled>`, and
  reports `valueMissing` while its Field says it is required and it is empty — in the browser's own words
  (`src/primitives/missing-value.ts`).
- **What the web cannot do as written**: an input method's
  window of candidates stands by the native text, at the row's start, not by the active cell; the caret's blink is a
  constant of the element (`CARET_BLINK_MS`) and its width the hairline; undo does nothing; with the root's text size
  at 200% the default system's paddings and gaps double too, so six cells in two groups stand in two rows of three at
  288.
- **Not heard, not held.** What screen readers say, a real input method in Firefox and Safari, and phones are checks
  by hand (`-input-methods-by-hand`, `-touch-devices-by-hand`).
- Before the element is defined it has no size and shows nothing.

## `<tanrei-one-time-code-field>`

Asks for a short code as one complete field: a `<tanrei-one-time-code-input>` under a `<tanrei-field>`'s label, with
the Field's help and its error (`specs/one-time-code-field.spec.json`, OTF-1…8). It is the first **composed** element
: its shadow root is the two members' own elements and nothing else, and everything it does is "Composed
elements", above.

```html
<tanrei-one-time-code-field name="code" label="Verification code" group-size="3"
                            supporting-text="Enter the 6-digit code we sent to your phone."
                            error-text="That code is not right. Check the message and try again."></tanrei-one-time-code-field>

<!-- One level down, the same picture and the same text box, by hand: for something of the product's own inside the frame. -->
<tanrei-field label="Verification code" supporting-text="Enter the 6-digit code we sent to your phone.">
  <tanrei-one-time-code-input name="code" group-size="3"></tanrei-one-time-code-input>
</tanrei-field>
```

- **Sixteen properties, none its own**: ten are the Field's (`label`, `label-hidden`, `supporting-text`,
  `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`, `required-text`, `optional-text`), six the
  input's (`value`, `length`, `type`, `group-size`, `mask`, `readonly`). The input's own `label`, `error` and
  `disabled` are never set: the Field says each to its control.
- **No token, no part of its own.** `--tanrei-comp-field-*` and `--tanrei-comp-one-time-code-input-*` reach the
  members by inheritance; one instance is set apart by setting such a property on the element. Parts: `field` and
  `one-time-code-input` (the members), and theirs — `label`, `label-icon`, `requirement-label`, `supporting-text`;
  `input`, `cell`, `character`, `caret`, `separator`.
- **`value` is the input's at every moment**, and `input`, `change`, `complete` and `action` are the input's own
  events with the element as their target; it dispatches none.
- **It is the form's control**: `name`, `form`, the code submitted alone (nothing while disabled), reset to the
  `value` attribute, restore, a disabled fieldset, `valueMissing` while `required` and empty. Enter in
  the cells presses the default button of the element's form.
- **It is as wide as its place** (`display: block`), and the control fills the frame; it has no size of its own.
- **Not focusable itself, no role**: `focus()` goes to the cells; name it with `label` (`label-hidden` where it is not
  drawn), never `aria-label` (reported in a debug build).
- One slot, `label-icon`, the Field's; no default slot — a second control is not drawn.
- Before the element is defined it has no size and shows nothing but a `label-icon` child, which a page hides with
  `tanrei-one-time-code-field:not(:defined) > *`.

## `<tanrei-checkbox-group>`

One question with a list for an answer: the field group's label, requirement, description and one error around the
product's own `<tanrei-checkbox>` elements, whose checked values the group holds under one name, and — with
`select-all-label` — one more checkbox that checks them all (`specs/checkbox-group.spec.json`, CKG-1…14; the
checkbox's CHK-23). It is a **composed** element and the first whose value members are **the product's own
children**: what "Composed elements", above, says of a member in the shadow root is read for that case below.

```html
<tanrei-checkbox-group name="notify" label="Notify me by" supporting-text="Choose all that apply."
                       required required-text="Required"
                       error-text="Choose at least one way to reach you." select-all-label="All of these">
  <tanrei-checkbox value="email" label="Email" checked></tanrei-checkbox>
  <tanrei-checkbox value="text" label="Text message"></tanrei-checkbox>
  <tanrei-checkbox value="push" label="Push notification"></tanrei-checkbox>
</tanrei-checkbox-group>

<!-- One level down, the same picture and the same group, by hand: for checkboxes that each have a name of their own. -->
<tanrei-field-group label="Notify me by" supporting-text="Choose all that apply." required required-text="Required">
  <tanrei-checkbox name="notify" value="email" label="Email" checked></tanrei-checkbox>
  …
</tanrei-field-group>
```

**The construction** — the one a group of the product's own controls is built on (`<tanrei-radio-group>` is the
second, with the field group in its radio-group kind):

```
<tanrei-checkbox-group>                         host: form-associated, no role, not focusable; extends ComposedElement
  #shadow-root
    <tanrei-field-group part="field-group" spacing="controls" exportparts="label, …">   the eleven props, forwarded
      <tanrei-checkbox part="select-all" exportparts="box: select-all-box, …">         only while select-all-label is given
      <slot></slot>                                                                    the product's checkboxes pass through
  <tanrei-checkbox value="email" …>             the product's light DOM
```

- **The field group reads its controls through two slots.** Its own `assignedElements({ flatten: true })` gives the
  select-all checkbox and then the product's checkboxes; a slotted checkbox's `tanrei-field-connect` passes the field
  group's host on its composed path before it reaches the group's, so `disabled`, the error condition and the error
  text arrive exactly as they do one level down, and the group forwards nothing. `:focus-within` on the field group
  holds while a slotted checkbox has focus, so its announcement of an error (FGR-9) is unchanged.
- **A checkbox may ask before its frame is drawn.** The field group exists only once the group has rendered, and a
  checkbox is connected before that — when the page is upgraded, the checkbox's definition comes before the group's,
  and a field group around the group would take the question for its own. Two things keep the checkboxes for the
  inner field group: a checkbox whose nearest set is a checkbox group that is not defined yet does not ask
  (`FieldControlOptions.waits`, `primitives/field.ts`), and the group stops, at its host, a question from its own
  children that nobody inside answered; after each render it has them ask again (`FIELD_CONTROL`). The questions of
  the group itself and of its field group, to a frame around the group, pass (FGR-15: `disabled` and nothing else).
- **The group holds the value; a checkbox is told and tells** (`TanreiCheckboxOwner`, `components/checkbox`): a
  checkbox finds its group with `closest()` — the nearest set of controls around it, where that is a checkbox group;
  the select-all checkbox, in the group's shadow root, finds the host — and from then on takes `checked` from the
  group, submits nothing, does not read `required`, and where it would fire `input` and `change` calls
  `memberSwitched()`. Where its `checked`, value or `disabled` changes it calls `memberChanged()`: a `checked` the
  group did not give it is the product's own word and joins the list (CKG-3).
- **`value` is a property only** (`attribute: false`), an accessor over the list: copied in and out, each entry once,
  given back in the order of the checkboxes followed by the entries no checkbox stands for. Set by the product it
  decides; until then `checked` on a child that arrives adds its value. A checkbox's entry is its `value` — the
  attribute, or a property that is not the bare "on".
- **The form is the host's own** — it has no value member to repeat (`ComposedControl` is not its base):
  `setFormValue(FormData, state)` with one entry per value under `name`, `null` while disabled, empty or unnamed;
  reset to the list given before the first render, else to the children's `checked` attributes; restore from the
  state; `takeFormDisabled`; `valueMissing` while required and empty, with `error-text`, else the required text (the
  instance's or the product's words), else `label`, anchored on the first enabled checkbox's native element. Inside a
  field group it also follows that group's `disabled` (its own `FieldControlController`, `takes: 'disabled'`), because
  what a form is told is the host's to say.
- **Parts.** `field-group` and `select-all` are the members; the field group's parts keep their names (`label`,
  `requirement-label`, `supporting-text`, `error-text`), and the select-all checkbox's are exported with its name
  before them (`select-all-container`, `-box`, `-mark`, `-label`): the two members both have a `label`, drawn at
  once, and a bare `box` would read as every box of the set. The product's checkboxes are styled as anywhere.
- **Focus.** The shadow root does not delegate and the host is no stop: every checkbox is its own. `focus()` goes to
  the first enabled checkbox — the select-all checkbox where drawn — and `blur()` blurs the one that has focus, in the
  light DOM too. Enter in a checkbox presses the default button of the group's form; in the select-all checkbox,
  which stands in no form, through `formOf()`.

**What the three engines do** (each is held by a test of `checkbox-group.test.ts`): the twenty-one fixtures are the
same pixels and the same accessibility tree as their twins among the field group's fixtures, in Chromium, Firefox and
WebKit; a real submission sends `notify=email&notify=push`, byte for byte what native checkboxes of one name send.
Chromium's accessibility tree gives the host a node of its own — `generic`, with no name, marked invalid while the
form's validation refuses the group — because it is a form-associated element that is validated; the group inside it
is the field group's `fieldset`, once. The native checkbox's own `input` event is composed and passes a capturing
listener on an ancestor before the checkbox stops it, in a group or out of one; nothing a checkbox dispatches does.

## `<tanrei-chip-field>`

Collects a list of short texts — e-mail addresses, telephone numbers, keywords — typed one after another: a
`<tanrei-field>` around a `<tanrei-text-input>`, with a small input `<tanrei-chip>` for each entry in the Text input's
`entries` slot (`specs/chip-field.spec.json`, CHF-1…30). A **composed** element ("Composed elements" above)
that differs from a composed field in five things, which are all of what its own file holds: its
value is a list of its own, its chips are made from that value, it dispatches three events itself, it reads the typed
text for separators, and it has one live region.

```html
<tanrei-chip-field name="to" label="Recipients" type="email" separators='[",", ";", " "]'
                   remove-label="Remove {entry}" added-text="{entry} added" removed-text="{entry} removed"
                   invalid-text="Enter a full address, such as name@example.com."></tanrei-chip-field>
<script>
  // The product's check, answered before the event returns: preventDefault() refuses, detail.reason gives the words.
  field.addEventListener('check', (event) => { if (!/^\S+@\S+\.\S+$/.test(event.detail.text)) event.preventDefault(); });
</script>

<!-- One level down, the same picture, by hand: every chip is then a Tab stop of its own. -->
<tanrei-field label="Recipients">
  <tanrei-text-input type="email">
    <tanrei-chip slot="entries" kind="input" size="small" label="ada@example.com" remove-label="Remove ada@example.com"></tanrei-chip>
  </tanrei-text-input>
</tanrei-field>
```

- **Twenty-seven properties**: ten are the Field's, seven the Text input's (`variant`, `size`, `type`, `placeholder`,
  `readonly`, `autocomplete`, and `input-value`, the Text input's `value`), ten its own (`value`, `separators`,
  `max-entries`, `invalid-text`, `duplicate-text`, `limit-text`, `remove-label`, `added-text`, `added-count-text`,
  `removed-text`). Four forwarded props are joined, each by a sentence of the spec: `disabled` with a fieldset's (W6),
  `error` and `errorText` with the entry error (CHF-6; W2 as settled for 0139), `placeholder` given only while the list
  is empty (CHF-17), `type` given as `text` unless it is `text`, `email`, `tel` or `url` (CHF-26).
- **`value` is an array property** (assign a new array); the `value` attribute is read once, as a JSON array, and is
  what a reset returns to — a list first given as a property is what a reset returns to where there is no attribute.
  A list the product sets is not checked and fires nothing.
- **An entry is made** by Enter, by a separator the product lists (none by default), by focus leaving the element, and
  from pasted or dropped text that holds a separator or a line break (read in `beforeinput`, before the single line
  loses its line breaks). A separator is found in what an edit added to the text (`input`), never by the key, and not
  while an input method composes. Each candidate is trimmed; refused as `duplicate`, then as `limit`, then asked with
  `check`. A refused text stays in the typing part, and the Field is in error with its words while that lasts.
- **Enter on text is stopped before the Text input hears it** (a capturing `keydown` listener on the member), so no
  `action` is fired and no form submitted; a bubbling `keydown` listener outside does not hear that press. Enter on an
  empty typing part is the Text input's own. The Text input's `change` (of its text) is stopped at the member: a
  capturing listener on an ancestor still hears it, with this element as its target, when focus leaves a text that was
  refused.
- **One Tab stop.** Each chip has `tabindex="-1"` — a host that delegates focus, so its remove action leaves the Tab
  order with it — and the element moves focus itself: Backspace or the start-pointing arrow at the start of the text
  to the last entry; arrows, Home and End among the entries; Backspace and Delete remove (the Chip asks, the element
  removes and moves focus first, while the chip is still there); Enter, Space or a press takes the entry back into
  the typing part; Escape, Tab and a character return to the typing part.
- **The list and the live region are drawn nowhere**: `role="list"` with `aria-label` around `role="listitem"`
  wrappers, all `display: contents`, in the `entries` slot; one hidden `aria-live="polite"` element for `addedText`,
  `addedCountText` and `removedText`, each the product's sentence with `{entry}` or `{count}` filled.
- **It is the form's control**: one value per entry under `name` (a `FormData`), nothing while empty or disabled and
  never the typed text; reset, restore, a disabled fieldset; `valueMissing` while `required` and the
  list is empty, anchored to the typing part.
- **No token, no part of its own.** Parts: `field`, `text-input`, `chip` (the members); the Field's and the Text
  input's under their own names (`label` and `requirement-label` also as `field-…` and `text-input-…`); the Chip's as
  `entry-container`, `entry-label`, `entry-remove`. Parts it never draws are not exported.
- Before the element is defined it has no size and shows nothing.

## `<tanrei-slider-field>`

Lets people choose a value, or a range, as one complete field: a `<tanrei-slider>` under a `<tanrei-field>`'s label,
with the value in words at the end of the label row, the Field's help and its error (`specs/slider-field.spec.json`,
SLF-1…13). **Composed**: its shadow root is the two members' own elements and nothing else, and everything
it does is "Composed elements", above — plus the one thing it fills itself.

```html
<tanrei-slider-field name="text-size" label="Text size" supporting-text="Applies to every page."
                     min="50" max="200" step="10" value="120"></tanrei-slider-field>
<script>
  document.querySelector('tanrei-slider-field').formatValue = (value) => percent.format(value / 100);
</script>

<!-- One level down, the same picture and the same slider, by hand: the product keeps the Field's value text in step. -->
<tanrei-field label="Text size" supporting-text="Applies to every page." value-text="120 %">
  <tanrei-slider name="text-size" min="50" max="200" step="10" value="120"></tanrei-slider>
</tanrei-field>
<script>
  slider.formatValue = (value) => percent.format(value / 100);
  slider.addEventListener('input', () => (field.valueText = slider.shownValueText));
</script>
```

- **Twenty-five properties, one its own**: ten are the Field's (`label`, `label-hidden`, `supporting-text`,
  `error-text`, `error`, `disabled`, `required`, `optional`, `required-mark`, `required-text`, `optional-text`), fourteen the
  Slider's (`value`, `start-value`, `range`, `min`, `max`, `step`, `origin`, `stops`, `size`, `value-indicator`,
  `value-text`, `start-value-text`, `start-label`, and `end-label`, which is the Slider's `label` and is given to it
  only while `range` is set), and `value-hidden` is its own. `formatValue` is a property of the element, never an
  attribute, handed to the Slider. The Slider's own `disabled` and `orientation` are never set.
- **It fills the Field's `value-text`** (`fills`; `memberUpdated()` and its own `updated()`): the words the Slider
  gives its handle (`shownValueText`), and for a range the start's (`shownStartValueText`), an en dash with a space on
  each side, and the end's — each of the two wrapped in a first-strong isolate (U+2068 … U+2069), because the Field's
  value text is one string and cannot hold two `<bdi>` elements. A run that is a plain number (`$100`, `3,400,000`,
  `40%`: one left-to-right run in either direction already) is written as it is, so that the text is what a product
  writes by hand; WebKit sets the glyphs of a text that is cut into isolates a fraction of a pixel apart from the
  same text uncut, and the twins are compared pixel for pixel. Nothing while `value-hidden` is set. It writes no
  number, unit or word.
- **`value` and `startValue` are the Slider's at every moment** (`startValue` by an accessor of the element's own, on
  the pattern of `memberValue()` / `giveValue()`), and `input` and `change` are the Slider's own events with the
  element as their target; it dispatches none.
- **It is the form's control**: `name`, `form`, what the Slider submits — one entry, or for a range the start value
  and then the value under the one name; nothing while disabled —, reset to the `value` and `start-value` attributes,
  restore, a disabled fieldset. The Slider inside is given the element's `name` as a property, because a range's two
  entries are said under a name; it stands in a shadow root, outside every form, and submits nothing itself. A slider
  always has a value, so the element is always valid.
- **It is as wide as its place** (`display: block`, `min-inline-size: 0`), and the track fills it.
- **Not focusable itself, no role**: `focus()` goes to the handle, a range's start handle; name it with `label`,
  never `aria-label` (reported in a debug build). A range whose `end-label` is empty is reported too (SLF-5); the
  Slider reports an empty `start-label` itself (SLD-19).
- No token, no part of its own. Parts: `field` and `slider` (the members), and theirs — `label`, `label-icon`,
  `requirement-label`, `value-text`, `supporting-text`; `track`, `active-track`, `stop-indicator`, `container`,
  `handle`, `value-indicator`. One slot, `label-icon`, the Field's.

**What the two members gained for it.** The Field: `value-text` (`valueText`) and `part="value-text"` (FLD-29,
FLD-30) — beside a value text the label row stands in a `.label-line` with it, a line that wraps: the row never has
less than half of it, and a value text that would leave it less takes a line of its own. A value text with no letter
takes the layout's direction (`unicode-bidi: isolate`); one with a letter its own (`data-own-direction`, the frame's
`plaintext`). A composed field that gives its Field no value text leaves the part out of its `exportparts`
(`exported(TanreiField, …, ['value-text'])`), as it does `counter`. The Slider: `formatValue` and the read-only
`shownValueText` / `shownStartValueText` (SLD-18); `static parts`; `FormSays`; the platform's `validity`,
`validationMessage`, `willValidate`, `checkValidity()` and `reportValidity()`; a `change` that is composed, as its
`input` is; its locale read through the shadow roots it stands in; and under a Field's label a range's own `label`
names its end handle and is not reported as a second label of the control (FLD-10).

## `<tanrei-file-item>`

Shows one file: a glyph that says its format, or a small picture of it; its name; a second line with what the product
says of it; a bar while it is sent; and the actions to take it back and to try it again
(`specs/file-item.spec.json`, FIT-1…33). **It never reads, keeps or sends the file** (FIT-7, FIT-33): what it shows is
what its props say, it removes nothing and it changes no status — whoever holds it does. It stands alone, in a list of
the product's own, or as a row of a `<tanrei-file-upload>`: one element, one drawing.

```html
<tanrei-file-item value="a" name="brief.pdf" format-text="PDF" size-text="820 KB" remove-label="Remove"></tanrei-file-item>
<tanrei-file-item value="b" name="scan.png" status="uploading" status-text="Uploading" progress="0.4" remove-label="Remove"></tanrei-file-item>
<tanrei-file-item value="c" name="notes.txt" status="error" error-text="The connection was lost." retryable
                  remove-label="Remove" retry-label="Try again"></tanrei-file-item>

<!-- A tile of a strip of pictures; a file that is only shown, as a link that saves it. -->
<tanrei-file-item form="tile" preview width="160" height="90" name="floor-plan.png" remove-label="Remove"></tanrei-file-item>
<tanrei-file-item readonly name="contract.pdf" href="/files/contract.pdf" download></tanrei-file-item>
```

```js
item.file = file;                                             // a property, never an attribute: the browser's own handle
item.addEventListener('remove', ({ detail }) => drop(detail.value));
item.addEventListener('retry', ({ detail }) => send(detail.value));
item.addEventListener('click', (event) => { event.preventDefault(); open(event.detail.value); }); // a link is then not followed
```

| `<tanrei-file-item>` | Type | Default | |
|---|---|---|---|
| `form` | `row` \| `tile` | `row` | one line across the width its layout gives, or a box with the texts beneath it; anything else is `row` (reported); reflected |
| `value` | string | `""` | given back by `click`, `remove` and `retry` (`detail.value`) |
| `name` | string | `""` | the file's name, and the element's name for assistive technology in every form; empty, it is read from `file.name` |
| `mediaType` / `media-type` | string | `""` | what the glyph is chosen from; empty, it is read from `file.type`, then from the end of `name` |
| `glyph` | string | `""` | a name of the icon set in place of the format's glyph; the `icon` slot holds a glyph the set does not have |
| `formatText` / `format-text`, `sizeText` / `size-text` | string | `""` | the second line's first two texts, in the product's words; the element writes neither |
| `status` | `pending` \| `uploading` \| `done` \| `error` | `pending` | anything else is `pending` (reported); reflected |
| `statusText` / `status-text`, `errorText` / `error-text` | string | `""` | the status in words; the error, drawn in its place while `status="error"`, never cut |
| `progress` | number \| null | `null` | 0 to 1 while uploading, clamped; null (no attribute) draws the bar as under way |
| `retryable` | boolean | `false` | a failed file offers retry; reflected |
| `preview`, `previewSrc` / `preview-src`, `fit` | boolean, string, `cover` \| `contain` | `false`, `""`, `cover` | a picture in the glyph's place: the one at the address, or — for an image — one of `file`; how it fills its box |
| `nameHidden` / `name-hidden` | boolean | `false` | in a tile that draws a picture the name is not drawn; it stays the accessible name; reported in a row |
| `width`, `height` | number \| null | `null` | a tile's box, in CSS pixels; a number that is not above zero is as if not given (reported) |
| `interactive` | boolean | `false` | the body is one button that emits `click` |
| `href`, `target`, `targetLabel` / `target-label`, `rel`, `download` | string | `""`, `same`, `""`, null, null | the body is a link; `rel` and `download` are the web's own, forwarded to the anchor |
| `removeLabel` / `remove-label`, `retryLabel` / `retry-label` | string | `""` | the names of the two actions; else `setWords({ removeLabel, retryLabel })` |
| `disabled` | boolean | `false` | the actions and the body cannot be pressed; what is shown stays; reflected |
| `readOnly` / `readonly` | boolean | `false` | no action is drawn; the body can still be pressed; reflected |
| `file` | `File` \| null | `null` | a property, never an attribute; no byte of it is read |

What is the web's own:

- **Two forms** (FIT-2, FIT-3). A row is as wide as its layout gives it: the glyph or the picture in a leading box, the
  name drawn whole and wrapping, the second line, the actions at the end, and the bar below. A tile is exactly as wide
  as its box (`data-tile` on the host): `width` by `height`; `height` alone is a square; `width` alone takes the
  token's height, which the element reads as pixels from a real property (`scroll-margin-block-start` of `.item`) only
  when a tile is drawn so; where its layout gives less room the box narrows and keeps its proportion. The box is never
  narrower than its two actions with their insets. The tile's name is one line cut in its middle — two spans in one
  `<bdi>`, the start, which gives way with an ellipsis, and the ending, which stays (`nameParts()`, FIT-9).
- **The shadow root** is `.item`, holding the body (`part="container"`), then the bar, then the actions; in a tile the
  bar and the actions lie over the box and still come after the body, so the order of focus is the order read. The
  body holds `media` (the box) with `icon` (the glyph's box, and the `icon` slot) and — while there is an address —
  `<img part="preview" alt="" decoding="async">`, then `headline` and `supporting-text`. The nine parts: `container`,
  `media`, `icon`, `preview`, `headline`, `supporting-text`, `status-icon`, `progress`, `action` (each action is also
  `retry` or `remove`).
- **The glyph by format** (FIT-5) is `fileKind(mediaType, name)` in `src/primitives/file-format.ts`: the media type
  first — without regard to case, without a parameter — and, where it is empty, is `application/octet-stream` or is on
  no list, the ending of the name after its last dot. Ten kinds in the order of matching (pdf, spreadsheet,
  presentation, archive, code, image, video, audio, document, other), each a closed list of media types and of endings
  that is the spec's own, so `text/csv` is a spreadsheet before `text/` makes it a document. The element builds no
  word from the format (FIT-20): `format-text` is the product's.
- **The second line** (FIT-4) is `format-text`, `size-text`, then `status-text` — or `error-text` in its place while
  the status is `error` — with a middle dot between two that are drawn. While the status is `done` or `error` a mark
  (`part="status-icon"`, `aria-hidden`) stands **before the status's words**, after the format and the size: the words
  tell the status and the mark never does alone. A status with no words still draws, the mark alone, and is reported.
- **The picture** (FIT-6, FIT-7). With `preview-src` the address is drawn for a file of any format. Without it the
  element makes **one object URL per item**, and only when all four hold: `preview`, a kind that is image, a `file`,
  and no `preview-src` — and only once an `IntersectionObserver` (half a viewport of margin) says the item is near
  what is in view. It is given to the element's own `<img>` and to nothing else, and revoked when the item is
  disconnected, when `file` is set again, and when one of the four no longer holds; put back into the page, a new one
  is made when it is next in view. No `FileReader`, no stream, no canvas: nothing of the file is read. The glyph
  stands in the box until the picture has loaded and where it cannot be drawn — with no sign of loading or failure,
  no event and no change of status; a `preview-src` that fails is reported. Without `preview` an item costs what its
  texts cost.
- **A picture that moves is the browser's to play.** FIT-23 forbids the file item to run a moving picture: a platform
  that can hold one still draws its first frame, and one that cannot — the web's image element — leaves the picture to
  the platform and says so in its README. This is that statement: an animated picture, at `preview-src` or as `file`,
  plays as the browser's `<img>` plays it, and the element does not hold it still. A strip that must not move is given
  a still `preview-src`.
- **The body** is `<div part="container">`; with `interactive` a `<button>`; with `href` an `<a href>` through the
  shared link primitive (`src/primitives/link.ts`), whether `interactive` is set or not — followed by Enter
  and not by Space, `rel` and `download` forwarded, `noopener` added for `target="new"`, and in a row a mark after the
  texts for a new context (a tile has no place for it; `target-label` says it to assistive technology in both). A
  pressable body is named by `name` and described by the second line's texts.
- **The two actions** are native buttons beside the body, never inside it — retry before remove — each with
  `aria-label` from its word and `aria-description` from the file's name, so "Remove" is heard with the file it
  removes. When the retry action leaves while focus is on it, focus goes to the remove action, or to a pressable body
  where there is none (FIT-30).
- **Events.** `click` (cancelable), `remove` and `retry` are bubbling, composed `CustomEvent`s with `detail.value`.
  `click` comes from the body alone, once for any input, before the browser follows a link: `preventDefault()` keeps
  it from being followed. An action emits its own event once and is no click of the element's. The native clicks
  never leave: the body's, the actions' and a press on what is neither are stopped in the shadow root, so a `click`
  heard on the element is always its own.
- **The host's role.** Alone it writes `role="group"` and `aria-label` from the name on itself, and leaves a role or a
  name the product wrote. A component that holds it as an item of its list says so through the internal channel
  (`src/primitives/file-item-holder.ts`, below under the file upload), and the host is then `role="listitem"` with no
  `aria-label` (FIT-19). It has no live region and announces nothing.
- **Read-only and disabled.** `readonly` draws no action and leaves the body as it is. `disabled` — its own, or its
  holder's — disables both actions and a button body, and a link body keeps its place with `aria-disabled="true"` and
  no address; texts, glyph and picture stay as they are.
- **Words** (FIT-20). `removeLabel` and `retryLabel` are the instance's prop, else the product's words through
  `WordsController`; with neither the action is drawn and works without a name, described by the file's name, and the
  missing word is reported once.
- **What a debug build is told**: FIT-2 (`name-hidden` in a row), FIT-4 (`done` without `status-text`, `error` without
  `error-text`), FIT-6 (a `preview-src` that could not be drawn), FIT-8 (no name), FIT-13 (the link primitive: an
  address that is no destination, an unknown `target`, a new context without `target-label`), FIT-20 (a missing
  word), FIT-29 (an unknown `form`, `status` or `fit`, a `width` or `height` that is not above zero, a `glyph` the
  icon set does not draw) and FIT-32 (content that is not the `icon` slot's glyph; it is not drawn).
- **Tokens** are `--tanrei-comp-file-item-…`, by the token axis `form`: `row-…` and `tile-…` for the gaps, the icon
  size, the media height and each state's container and action colors; the texts, the status mark, the action size
  and `motion-state-*` are shared. The bar is a `<tanrei-progress-indicator>` given `progress-*`,
  `motion-progress-*` and `motion-cycle-*` in the place of its own tokens. State colors change over
  `motion-state-duration`, at once where motion is reduced; nothing else moves.
- **Not form-associated.** A file item submits nothing: what holds it does. Without script, and until the element is
  defined, nothing is drawn — the name is an attribute.

## `<tanrei-file-picker>`

Lets people choose files through the browser's own picker — from the product's Button and, where there is room, from a
place files can also be dragged onto — says the limits in words before the choice, judges what was chosen against
them, and hands over what passed and what was refused (`specs/file-picker.spec.json`, FPK-1…31). **It keeps nothing,
lists nothing and takes no part in a form** (FPK-7): a second choice is judged as if it were the first, and whoever
holds the files shows them.

```html
<tanrei-field label="Photo" supporting-text="We show it on your profile.">
  <tanrei-file-picker accept="image/*" max-size="5000000" constraints-text="An image, up to 5 MB" selection-text="No file chosen">
    <tanrei-button slot="trigger" variant="outlined">Choose a file</tanrei-button>
  </tanrei-file-picker>
</tanrei-field>

<tanrei-file-picker layout="drop-area" multiple label="Documents" drop-text="Drag files here, or choose them">
  <tanrei-button slot="trigger" variant="outlined">Choose files</tanrei-button>
</tanrei-file-picker>
```

```js
picker.addEventListener('select', ({ detail }) => { picker.selectionText = detail.files.map((file) => file.name).join(', '); });
picker.addEventListener('reject', ({ detail }) => { /* [{ file, reason: 'type' | 'size' | 'count' }] — say it in your words */ });
const { accepted, refused } = picker.judge(event.clipboardData.files); // files that came another way; emits nothing
```

| `<tanrei-file-picker>` | Type | Default | |
|---|---|---|---|
| `layout` | `button` \| `drop-area` | `button` | the trigger alone, or a bounded area around it that also takes a drop and opens the picker when pressed; anything else is `button` (reported); reflected |
| `multiple` | boolean | `false` | one file, or any number; several where one is asked are refused whole (`count`); reflected |
| `accept` | string[] (attribute: a comma-separated list) | `[]` | extensions with their dot and media types (`image/*` for a family); the picker is asked for them, and anything else is refused (`type`); an entry that is neither is ignored and reported |
| `maxSize` / `max-size` | number \| null | `null` | bytes; a larger file is refused (`size`) |
| `maxFiles` / `max-files` | number \| null | `null` | the most files **one** choice or drop may bring, while `multiple`; nothing is counted across choices; `0` refuses every file |
| `label` | string | `""` | the group's accessible name; not drawn; left empty inside a field |
| `constraintsText` / `constraints-text` | string | `""` | the limits in words: drawn, and the trigger's description |
| `dropText` / `drop-text` | string | `""` | the area's prompt; ignored in the button layout |
| `selectionText` / `selection-text` | string | `""` | beside the trigger in the button layout: what is chosen now; written by whoever holds the files, never by the element |
| `disabled`, `error`, `required` | boolean | `false` | reflected; a field gives all three |

Method: `judge(files: Iterable<File>): { accepted: File[], refused: { file, reason }[] }`. Events: `select`
(`detail.files`: `File[]`), then `reject` (`detail.files`: `{ file, reason }[]`); both bubble and neither is composed.

- **The trigger is the product's own**, in its light DOM, and is found through slots: the elements with
  `slot="trigger"`, and — where such a child is itself a `<slot>` that a composed element passes on — what is assigned
  to it (`assignedElements({ flatten: true })`). The first is the trigger; a second, an element that is not a
  `<tanrei-button>` and a stray child are reported, and an empty slot is reported as an error. Any element in the slot
  opens the picker when it is clicked. The `icon` slot is read the same way.
- **The picker** is a real `<input type="file">` in the shadow root — `tabindex="-1"`, `aria-hidden`, not drawn. The
  trigger's `click` and a press on the area call its `click()`, after `multiple` and `accept` are written on it; never
  a second while one is open (an input the person makes afterwards says the first is gone). Its value is cleared after
  each choice, so the same file can be chosen twice, and its own `change` and `cancel` do not leave. A press on the
  area also moves focus to the trigger and answers a pointer alone: Enter and Space are the trigger's. A click gives a
  button no focus in Safari, so after a choice made by pointer there the focus is where it was.
- **A drag** (FPK-13, FPK-14) is heard on the area alone — `dragenter`, `dragover`, `dragleave`, `drop`, with enters
  counted against leaves so that a child does not end the condition; the button layout takes no drop. A drag tells
  kinds and a count before the drop, never names or sizes, so the area refuses while it is held only what it can know:
  nothing that is a file, several where one is asked, or — where `accept` lists media types alone — only kinds it does
  not list. An extension is the end of a name: with one in `accept`, a file of another kind is refused at the drop. A
  refusing or disabled area names the effect `none`, and a browser then delivers no `drop`: `reject` for a refused
  drag is heard only for what could not be known before. A drop that does arrive is always taken, so the browser never
  opens the file; a folder — told by its entry, which is not read — is refused as `type`.
- **Judging** (FPK-9) is one rule for a choice, a drop and `judge()`: in the order given, by what the browser reports
  — more than one where one is asked refuses all (`count`); then per file `type`, `size`, and `count` once the room of
  `max-files` is used. `max-files="0"` with `multiple` refuses every file and reports nothing (FPK-27): zero is the
  room a full list has left. `judge(files)` (FPK-31) answers with `{ accepted, refused }`, emits nothing, keeps
  nothing and works while disabled — disabled stops the person, not the product.
- **One arrival** is `select` where a file passed, `reject` where one was refused, and then one internal event
  (`tanrei-file-picker-arrival`, `FILE_PICKER_ARRIVAL`; it bubbles, is not composed, and is not in the manifest) by
  which a component that holds the picker answers the two as one. Nothing is emitted when the person leaves the
  picker without choosing. The hidden input's own `input`, `change` and `cancel` stay inside the element: a file
  picker has no value, so no event of a control with one leaves it.
- **A group only while it is named** (FPK-17). `role="group"` and `aria-label` are on an element of the shadow root,
  and only while `label` or a field gives a name; with neither there is no group and no role, and nothing is reported
  — the trigger is the button it is. The host takes no role.
- **What the trigger is given**, as a field gives a control it does not know (`FieldProviderController`,
  `giveAttributes()`), and gets back when it leaves the slot: a description — `constraints-text`, then
  `selection-text` while it is drawn, then what a field gave — `aria-invalid` and `disabled`, never a name. A
  `<tanrei-button>` carries them to its native button. A button's role has no required state: `required` is said by
  a field's `required-text` in that description. The trigger is also told that its label may wrap (the button
  group's channel, FPK-22), so a long label never widens a narrow page.
- **The Field's connection** (FPK-21). The picker asks its nearest `<tanrei-field>` as every control does and takes
  the label as its group's name while it has none, the shown help or error as the last part of the trigger's
  description, and the invalid, required and disabled states. A press on the field's label focuses the trigger and
  opens nothing (`focus()` goes to the trigger). A component that holds the picker answers the same question in the
  field's place.
- **Not form-associated** (FPK-7): no `name`, no value, no validity, nothing to reset or restore.
- **The edge** of the area is dashed by the stroke of an SVG rectangle, so its dashes are `outline.dash-length` long
  and follow the corners. A dash cannot follow an eased corner: where the browser draws `corner-shape` and the
  system's corner smoothing is above 0, the edge is drawn solid (FPK-4's fallback). `outline.style` is read by a style
  query, and written by the element as `data-outline` where a browser has none.
- **What a debug build is told**: FPK-5 (the trigger slot is empty — an error — or holds several), FPK-18 (`accept`,
  `max-size` or `max-files` sets a limit and `constraints-text` is empty), FPK-27 (an unknown `layout`, a `max-size`
  that is not above zero, a `max-files` that is not a whole number of zero or more, an entry of `accept` that says no
  kind) and FPK-30 (a trigger that is not a `<tanrei-button>`; content that is neither the trigger nor the glyph).
  What is said of the content is said a task after the first render, once it has all been written.
- **Parts**: `container` (the area), `icon`, `label` (the prompt), `supporting-text` (the limits), `selection-text`.
  **Tokens** are `--tanrei-comp-file-picker-…`: the area's states under `standard-…` (and `receiving-…`,
  `refusing-…` while something is dragged over it), `outline-*`, `container-*`, `trigger-gap`, `supporting-text-gap`
  and `motion-state-*`.
- **Without script**, and until the element is defined, the trigger is a button that opens nothing. A page that must
  take files where script does not run writes a native `<input type="file">` in its own form.

## `<tanrei-drop-zone>`

Wraps any part of a screen so that files can be dropped anywhere on it, while what it holds is used exactly as without
it (`specs/drop-zone.spec.json`, DRZ-1…21): **it draws nothing at rest and adds no hover, no press, no focus stop and
no role**. While files are dragged over it, one overlay covers it — the scrim, an edge inside its box and a panel with
the upload glyph and the product's message — and on the drop it judges the files by the File picker's rule and emits
the File picker's `select` and `reject`. It keeps nothing, and **it is never the only way to add a file**: the screen
also has a `<tanrei-file-picker>` or a `<tanrei-file-upload>` (a debug build reports a page with neither, DRZ-13).

```html
<tanrei-drop-zone multiple accept="video/*" max-size="2000000000" drop-text="Drop videos to upload them" silent>
  <tanrei-file-upload id="uploads" multiple accept="video/*" max-size="2000000000" constraints-text="Videos, up to 2 GB each">
    <tanrei-button slot="trigger" variant="outlined">Upload videos</tanrei-button>
  </tanrei-file-upload>
  <tanrei-table>…the channel's videos…</tanrei-table>
</tanrei-drop-zone>
```

```js
zone.addEventListener('select', ({ detail }) => uploads.add(detail.files)); // the File upload judges, lists and says them
zone.addEventListener('reject', ({ detail }) => { /* [{ file, reason: 'type' | 'size' | 'count' }] — say it in your words */ });
```

| `<tanrei-drop-zone>` | Type | Default | |
|---|---|---|---|
| `multiple` | boolean | `false` | one file per drop, or any number; several where one is asked are refused whole (`count`); reflected |
| `accept` | string[] (attribute: a comma-separated list) | `[]` | extensions with their dot and media types (`image/*` for a family); anything else is refused (`type`) |
| `maxSize` / `max-size` | number \| null | `null` | bytes; a larger file is refused (`size`) |
| `maxFiles` / `max-files` | number \| null | `null` | the most files one drop may bring, while `multiple`; `0` refuses every file |
| `dropText` / `drop-text` | string | `""` | the overlay's message; empty reads `setWords({ dropZoneText })` |
| `refusingText` / `refusing-text` | string | `""` | the message while the zone refuses what is dragged; empty reads `dropZoneRefusingText` |
| `droppedText` / `dropped-text` | string | `""` | said after a drop, `{count}` files passed; empty reads `filesDroppedText` |
| `refusedText` / `refused-text` | string | `""` | said after a drop, `{count}` files refused; empty reads `filesRefusedText` |
| `silent` | boolean | `false` | says nothing after a drop: for a zone whose files go to a component that says them itself; reflected |
| `disabled` | boolean | `false` | no overlay, no event; the content is neither disabled nor dimmed; reflected |

Method: `judge(files: Iterable<File>): { accepted: File[], refused: { file, reason }[] }`, the File picker's own rule,
emits nothing (DRZ-15). Events: `select` (`detail.files`: `File[]`), then `reject` (`detail.files`: `{ file, reason }[]`);
both bubble and neither is composed.

- **The content is the product's**, in its light DOM, in the default slot (`display: contents`): the host is its layout
  box. It is `display: block` by default — style it as any wrapper (`display: grid`, a height, `overflow`). It is
  `position: relative` and `isolation: isolate`, one stacking context of its own, so the overlay, at the greatest
  z-index, stands above everything the content stacks and inside the host's box; content that must stand above it is
  in the top layer (a dialog, a popover, a menu), as Tanrei's overlays are. Do not set `position: static` on it.
- **The overlay** takes no pointer (`pointer-events: none`), so a press, a wheel or a scroll during a drag reaches
  the content beneath it, and it is `aria-hidden`. Its panel is placed in the part of the host's box that is in view —
  the box cut by the window and by every ancestor that clips or scrolls, measured on each `dragenter` and `dragover` —
  so a zone taller than its scrolling area (a whole page, an app shell's main region) shows its message where the
  person looks.
- **A drag** (DRZ-3, DRZ-7, DRZ-8) is heard on the host in the bubbling phase. It answers only a drag whose
  `dataTransfer.types` includes `Files`: text and links are left to the content. An event whose default a target
  inside already prevented — a nested zone, a File picker's drop area, a target of the product's — is that target's.
  Enters and leaves are counted so that a child of the content does not end the condition; a `dragleave` toward an
  element outside ends it at once, and while a drag is within, the window's `dragenter` outside the host, `drop`,
  `dragend` and `pointermove` end it too. As for the File picker, a drag tells kinds and a count, never names or
  sizes: the overlay refuses only what it can know (several where one is asked, or only kinds a media-type-only
  `accept` does not list), and the rest is judged at the drop. A disabled zone with no enabled zone around it still
  takes a drop of files, so the browser never opens one let go by mistake.
- **Judging** is the File picker's, from one shared module (`src/primitives/file-judge.ts`), not a copy.
- **One live region**, polite: after a drop, `dropped-text` and then `refused-text`, with `{count}` filled; nothing for
  the drag itself. `silent` says nothing — set it where the files go to a `<tanrei-file-upload>` that keeps its own
  rows, which says each one.
- **Not form-associated** (DRZ-10): no `name`, no value; no file is read, copied or kept.
- **What a debug build is told**: DRZ-11 and DRZ-12 (a word that is needed and given by nobody), DRZ-13 (no file
  input anywhere on the page, at the first drag), DRZ-20 (a `max-size` or `max-files` that sets no limit, an entry of
  `accept` that says no kind).
- **Parts**: `overlay`, `panel`, `icon`, `label`. **Tokens** are `--tanrei-comp-drop-zone-…`: `scrim-color`,
  `outline-*`, `panel-*`, `icon-*`, `label-*`, `refusing-*` and `motion-*`.
- **Without script**, and until the element is defined, the content is drawn as it is and a drop of files is the
  browser's.

## `<tanrei-file-upload>`

Lets people choose files and lists what was chosen (`specs/file-upload.spec.json`, FUP-1…58). It is a
**composed** element ("Composed elements", above): it draws nothing of its own and arranges two kinds
of member, a `<tanrei-file-picker>` above and `<tanrei-file-item>`s below, and adds the state that ties them — which
files are kept, the room that is left, one form for every row, one message for many changes, where focus goes after a
removal, and the form's value. **It never uploads**: it opens no connection and reads no byte of a file (FUP-7). Who
holds the rows is `rows`, and the product says which (FUP-42):

- **`rows="own"`, the default** — the element keeps the chosen files and makes a file item for each itself. A plain
  form works by placing it: choose, see the list, remove, submit, with nothing written.
- **`rows="given"`** — the product gives the rows, as `<tanrei-file-item>` children, and the element keeps no file:
  for a product that sends each file itself and shows its status, its progress and a retry.

**In a form** — markup alone:

```html
<form method="post" enctype="multipart/form-data">
  <tanrei-file-upload name="attachments" multiple accept=".pdf,image/png" max-size="10000000" label="Attachments"
                      constraints-text="PDF or PNG, up to 10 MB each" remove-label="Remove"
                      type-error-text="Only PDF and PNG files can be added." size-error-text="Larger than 10 MB.">
    <tanrei-button slot="trigger" variant="outlined">Choose files</tanrei-button>
  </tanrei-file-upload>
  <button type="submit">Send</button>
</form>
```

With `multiple` a second choice adds, and `max-files` counts the files kept; without it a file that passes takes the
place of the one kept, and a refused choice replaces nothing. The same file — equal `name`, `size` and `lastModified` —
is kept once: not kept twice, not refused, in no event (FUP-43). A refused file is a failed row with the product's
sentence for its reason; it is not kept, not submitted and not counted, and leaves when it is removed, when files next
arrive or on `clear()` (FUP-45). The remove action removes, and focus goes on to the next row (FUP-46).

```js
upload.formatSize = (bytes) => megabytes.format(bytes / 1e6); // a property: the product's words for a size; without it none is drawn
upload.addEventListener('change', ({ detail }) => { /* detail.files: the File[] now kept */ });
upload.files;        // File[], a new array on each read
upload.add(files);   // an arrival, judged as a choice is, with no event; returns [{ file, reason }] for the refused
upload.clear();      // every file and every row; no event, nothing announced
```

For one choice or one drop the events are `select` (the files newly kept), `reject`, `change` — in that order, with the
rows already drawn — and a removal of a kept file is `change` alone. None is emitted for what the product did itself:
`add()`, `clear()`, a form reset, a change of `rows` (FUP-47). `files`, `add()`, `clear()` and `formatSize` work while
`disabled`. While `rows` is `given`, `files` is empty, `add()` does nothing and is reported, and `clear()` does nothing.

**Sending files yourself** — `rows="given"`, and the product's own file items:

```html
<tanrei-field label="Attachments" supporting-text="We keep them for a year.">
  <tanrei-file-upload rows="given" layout="drop-area" multiple accept=".pdf,image/png" max-size="10000000"
                      drop-text="Drag files here, or choose them" constraints-text="PDF or PNG, up to 10 MB each"
                      remove-label="Remove" retry-label="Try again">
    <tanrei-button slot="trigger" variant="outlined">Choose files</tanrei-button>
    <tanrei-file-item value="a" name="brief.pdf" size-text="820 KB" status="uploading" progress="0.4"
                      status-text="Uploading"></tanrei-file-item>
  </tanrei-file-upload>
</tanrei-field>
```

```js
upload.addEventListener('select', ({ detail }) => {
  for (const file of detail.files) {
    const row = Object.assign(document.createElement('tanrei-file-item'), { value: crypto.randomUUID(), name: file.name, sizeText: format(file.size), file });
    upload.append(row); // the product adds the row — and sends the file
  }
});
upload.addEventListener('reject', ({ detail }) => { /* [{ file, reason: 'type' | 'size' | 'count' }] — say it in your words */ });
upload.addEventListener('remove', (event) => event.target.remove()); // focus moves on to the next row by itself (FUP-30)
```

A `<tanrei-file-item>` child while `rows` is `own` is not drawn and is reported, naming `rows`.

| `<tanrei-file-upload>` | Type | Default | |
|---|---|---|---|
| `layout`, `multiple`, `accept`, `maxSize` / `max-size`, `constraintsText` / `constraints-text`, `dropText` / `drop-text`, `disabled`, `error`, `required` | | | the file picker's, given to it unchanged: see its table |
| `maxFiles` / `max-files` | number \| null | `null` | the upload's own: the most rows — while `rows` is `own`, the most files kept — while `multiple`; files beyond the room that is left are refused (`count`); a number that is not above zero sets no limit and is reported |
| `label` | string | `""` | the group's accessible name — the picker and the list together; not drawn; left empty inside a field |
| `emptyText` / `empty-text` | string | `""` | beside the trigger while there is no row, in the button layout; else `setWords({ noFileText })` |
| `itemForm` / `item-form`, `itemPreview` / `item-preview`, `itemFit` / `item-fit`, `itemNameHidden` / `item-name-hidden`, `itemWidth` / `item-width`, `itemHeight` / `item-height` | | | the file item's `form`, `preview`, `fit`, `nameHidden`, `width` and `height`, for every row at once: see its table |
| `removeLabel` / `remove-label`, `retryLabel` / `retry-label` | string | `""` | the names of every row's actions; else `setWords({ removeLabel, retryLabel })` |
| `announcement` | string | `""` | said through the one live region when it is set or changed, in place of what the rows of that turn would have said |
| `name` | string | `""` | web only: what the kept files — or, while `rows` is `given`, the rows' files — are submitted under; reflected |
| `rows` | `own` \| `given` | `own` | who holds the rows; absent and unknown are `own` (unknown is reported); reflected |
| `typeErrorText` / `type-error-text`, `sizeErrorText` / `size-error-text`, `countErrorText` / `count-error-text` | string | `""` | while `rows` is `own`: the sentence on the row of a file refused for that reason; else `setWords({ fileTypeErrorText, fileSizeErrorText, fileCountErrorText })`; with neither the row is drawn without one and the missing word is reported once |
| `formatSize` | `((bytes: number) => string)` \| null | `null` | a property, never an attribute: while `rows` is `own`, writes each row's size; null draws none; one that throws draws none and is reported |
| `files` | `File[]` | | read-only: the kept files, a new array on each read; empty while `rows` is `given` |

Methods: `add(files: Iterable<File>): { file: File, reason: 'type' | 'size' | 'count' }[]`, `clear(): void`. Events:
`select`, `reject`, and — while `rows` is `own` — `change` (`detail.files`); all bubble, none is composed.

How it is built:

- **The shadow root** (`ComposedElement`, `src/primitives/composed.ts`) holds one group: one real
  `<tanrei-file-picker part="file-picker">`; the list, `<div part="list" role="list">`, hidden while it has no row;
  and the live region. While `rows` is `own` the list holds the element's own real
  `<tanrei-file-item part="file-item">`s, one per kept file and then one per refused file; while `rows` is `given` it
  holds the default slot, and the rows are the product's items in its light DOM. A column, or with
  `item-form="tile"` a strip that wraps.
- **What is forwarded.** Nine props go to the picker by `forward()`, as properties, on every render: `layout`,
  `multiple`, `accept`, `maxSize`, `constraintsText`, `dropText`, `disabled`, `error`, `required` (FUP-56). The
  picker's `selection-text` is filled from `empty-text` (else the product's `noFileText`) while the list holds no row,
  and is empty otherwise. `max-files` and `label` are **not** set on the picker: the room that is left is measured
  against what the upload holds, and the upload names the whole. The `trigger` and `icon` slots are passed on by
  `pass()` — a `<slot name slot>` among the picker's children, rendered only while the upload has such a child — so
  the trigger stays the product's own Button in the product's light DOM, and is the upload's `focus()`.
- **The internal channel** (`src/primitives/file-item-holder.ts`) is how every row is told what the rows share —
  never through the item's props or attributes, so a product's own item keeps every attribute the product wrote, and
  none of it is in the manifest. `giveFileItem(item, gift)` keeps the gift beside the item (a `WeakMap`) and has it
  draw again; the item reads it with `fileItemGiven(item)`, each key in place of its own prop. The gift: `form`,
  `preview`, `fit`, `nameHidden`, `width`, `height`, `removeLabel`, `retryLabel`; `disabled` while the upload is;
  `listItem` (the host becomes `role="listitem"`, FUP-25); `made` (the upload made the item, so a missing error
  sentence is the upload's to report); and `between`, the distance to the next row, which bounds an action's hit
  area. `giveFileItem(item, null)` hands it all back when an item leaves. `FILE_ITEM_TAKE_FOCUS` is the symbol under
  which an item moves focus to its remove action, or to a pressable body where it has none; `FILE_ITEM_UPDATE` the
  event by which an item says it arrived or changed, which the upload stops; `FILE_PICKER_ARRIVAL` the event that
  ends one arrival. A product's own item that says a shared prop otherwise is overruled — drawn as the upload says —
  and reported (FUP-58); everything else of an item stays the row's own.
- **Exported parts.** The picker's five leave under their own names (`container`, `icon`, `label`,
  `supporting-text`, `selection-text`); a made item's nine under the prefix `item-` (`item-container`, `item-media`,
  `item-icon`, `item-preview`, `item-headline`, `item-supporting-text`, `item-status-icon`, `item-progress`,
  `item-action`), since three would collide with the picker's; with `file-picker`, `file-item` and `list`. A
  product's own item is styled as itself.
- **Events that do not leave.** The picker's `select` and `reject` are heard on the member and stopped (FUP-57), as
  is its arrival event: the product hears the upload's own `select`, `reject` and `change`, which tell what the upload
  did with the choice, so one choice is told once. A made item's `remove` is answered inside, and its `click` and
  `retry` are stopped: none leaves the shadow root. A product's own items' `click`, `remove` and `retry` are composed
  and bubble out of the light DOM as they are — the upload removes no row of the product's.
- **Who judges what.** The picker judges one arrival: kind, size, and several where one is asked. The upload judges
  only what the picker cannot know — the room `max-files` leaves beside what the list already holds, and, while
  `rows` is `own`, a file it already keeps. `reject` lists the picker's refusals first, then those refused for want of
  room. `add()` calls the picker's `judge()` with the upload's current `multiple`, `accept` and `maxSize` (before the
  first render, on a picker that is nowhere) and then treats the result as an arrival.
- **Form participation is the upload's alone** (`static formAssociated`, its own `ElementInternals`; it extends
  `ComposedElement`, not `ComposedControl`, as it has no value member). The value is a `FormData`: one entry per kept
  file while `rows` is `own` (FUP-49), one per row that has a `file` while it is `given` (FUP-31); nothing while
  disabled or unnamed. No state is kept with the form, so nothing is restored after a navigation. `required` reports
  `valueMissing` with the browser's own message for a file input, anchored on the trigger. A reset does what `clear()`
  does while `rows` is `own`, and changes nothing while it is `given`. A native file input with no file submits one
  empty entry and this element submits none: a server that reads the field checks for both.
- **The Field.** The upload is the field's control. Its picker asks for the connection too, and the upload answers
  in the field's place with the description and the three states and **no name**, so the picker exposes no second
  group inside this one (FUP-24, FPK-21).
- **Its own rows** are drawn in the same task as the choice, before `select` is emitted: a pending item given the
  file's handle, name and media type for a kept file; a failed item with the product's sentence, no handle and never
  retryable for a refused one. Neither is pressable. A row's picture is made and revoked by its file item, never by
  the upload (FUP-51). Changing `rows` while it is shown lets go of every kept file and emits nothing (FUP-52); focus
  that a leaving row held goes to the trigger.
- **Focus after a removal** (FUP-30, FUP-46). When a row that held focus leaves — removed by the upload, or taken out
  by the product — focus goes to the remove action of the row that followed, else of the one before, else to the
  trigger; a row with no remove action takes it on a pressable body. Where the product already put focus somewhere,
  nothing is done.
- **One arrival is one message** through the live region (`aria-live="polite"`): each newly kept file's name, then
  each refused file's name and its sentence, a line each (FUP-50); for the product's rows, each row added, finished or
  failed in that task (FUP-26). `announcement` set in the same task — in a `change` listener — is said alone. A
  removal, `clear()`, a reset and the rows it was first presented with say nothing.
- **What a debug build is told**: FUP-17 (an unknown `item-form`), FUP-24 (no `label` and no field; an ARIA name on
  the host), FUP-27 (`max-files` sets a limit and `constraints-text` is empty — the picker says the same of `accept`
  and `max-size`, FPK-18), FUP-38 (two rows with one `value`; a `max-files` that is not above zero), FUP-41 (content
  that is neither the trigger, the glyph nor a file item), FUP-42 (an unknown `rows`, file item children while `rows`
  is `own`, `add()` while it is `given`), FUP-44 (`formatSize` threw), FUP-45 (a refused file's row without its
  sentence) and FUP-58 (a product's item that says a shared prop otherwise).
- **The styles read two tokens**, `--tanrei-comp-file-upload-list-gap` and `-list-item-gap`, and write no custom
  property: `--tanrei-comp-file-picker-…` and `--tanrei-comp-file-item-…` set on the upload or above it reach the
  members by inheritance.
- **What does not belong** — text or an element that is neither the trigger, the glyph nor a file item — is not
  drawn, takes no room and is not read (FUP-41). The box that holds the rows has no font size for that, and the rule
  that makes a file item visible again gives it one that is a length of the root's: Safari does not carry a change of
  the root's font size into the shadow tree of an element slotted into a box whose own font size stays, unless the
  slotted element's size follows the root — without it, rows drawn before the reader enlarges the text kept their old
  sizes there (FUP-33). It draws nothing differently:
  every text of a file item sets its own role.
- **A fixture that keeps its own files** (`rows` `own` with `file` items) cannot be markup alone: the test harness
  (`Staging.after` in `test/harness.ts`), the review gallery — which is served the harness's document — and the
  documentation's Specs tab set `formatSize` and call `add()` once, after the element is defined, with one `File` per
  item: named by the item, as many zero bytes long as its place among the items, with one fixed time of last change
  and, in the harness, the media type its ending stands for.
- **Without script**, and until the element is defined, the trigger is a button that opens nothing and no row is drawn.
  A page that must take files where script does not run writes a native `<input type="file">` in its own form.

**One level down** — the two members, arranged by the product, for a list of its own, an order people change, or
files that are only shown:

```html
<tanrei-field label="Attachments">
  <tanrei-file-picker multiple accept=".pdf" max-files="5"
      constraints-text="PDF, 5 files at most" selection-text="No file chosen">
    <tanrei-button slot="trigger" variant="outlined">Choose files</tanrei-button>
  </tanrei-file-picker>
</tanrei-field>
<ul class="my-files" aria-label="Attachments">
  <li><tanrei-file-item value="a" name="brief.pdf" size-text="820 KB" status="uploading" status-text="Uploading" progress="0.4"
        remove-label="Remove" retry-label="Try again"></tanrei-file-item></li>
</ul>
```

A file's row is the same element alone and inside a file upload, and the picker is tied to its field by hand exactly
as it is tied inside the upload. What the hand-made version does not get is the state the upload holds: one polite
message for many changes (FUP-26); focus that goes on to the next file after a removal (FUP-30); the form's value,
reset and validation (FUP-31, FUP-49); passing over a file chosen twice (FUP-43); one form for every file. It also
writes the list itself (the `<ul>`; inside an upload each item is told it is a list item), and its picker's
`max-files` counts one choice, not the list: the product gives the picker the room that is left.

## `<tanrei-embedded-text-input>`

The typing alone, for a box that something else draws (specs/embedded-text-input.spec.json, ETI-1 to ETI-28). A
form-associated element with a shadow root that delegates focus (every point of it is its text) and renders one
`<textarea>` while `multiline` and one `<input>` otherwise, with no box of the browser's or of Tanrei's.

**It is half of a control.** It draws no container, edge, padding, label or message and no focus indication, whatever
`sys.behavior.focus-style` is. Whatever holds it owes the rest (the holder's contract, H1 to H7): a
visible box; the focus indication on the box for as long as the input has focus (`:focus-within` — from the holder's
own shadow root, `:host(:focus-within)`, or a state set from the input's `focusin` and `focusout` where other controls
of the holder take focus too, as the chat composer does); the mark of an error and the look of a disabled box; padding,
and a press on that padding passed on with `focusAt(clientX, clientY)`; the name (`label`) and what its messages say
(`description`); what `action` means; and, in forced colors, an edge. The harness's sample holder (`sampleHolderCss`
in `test/harness.ts`) is the contract as markup; the fixtures whose id begins `held-` are drawn in it.

| What | How |
|---|---|
| The height (ETI-7 to ETI-10) | `src/primitives/auto-height.ts`: the native element is given its end height at once (`--_rows` lines) and a box around it — `.box`, which the host is as tall as — moves from the height shown to the new one (`[data-resizing]`, a transition of `block-size` over `motion.resize-*`). So the first line never moves, a change mid-motion goes on from the height then shown, and the host's own height in the layout is the animated one. At once: the first fit, a changed width or line (a `ResizeObserver` of the native element), `min-rows`, `max-rows`, a pointer held down in the text, reduced motion |
| `rowschange`, `rows` | Emitted once when first fitted and once for each change of the number of lines, before the motion begins |
| Enter (ETI-4, ETI-6) | Read at the window, the last place a `keydown` reaches, so that every listener of a holder has run first; one whose default was prevented is not read. An input method's Enter is told by `isComposing`, key code 229, and a `keydown` in the task of a `compositionend`. Where `(pointer: coarse) and (hover: none)` holds, Enter in a multi-line input is the return key of an on-screen keyboard: a guess |
| `focusAt(x, y)` | `document.caretPositionFromPoint()` at the nearest point of the text's box, in the three engines; where it answers nothing, the start of the text for a point above or before it and the end otherwise |
| The name and the states (ETI-13) | `label`, `description` (`aria-description`), `error`, `required`, `readonly`, `disabled`, written on the native element. It dispatches no `tanrei-field-connect` |
| A form (ETI-19) | Its own `ElementInternals`, through `FormSays`. In the shadow root of a holder it has no form and does nothing of it |
| Without script (ETI-27) | A `<textarea>` or `<input>` child is the control until the element is defined; then its text is the first value where `value` was not given, and it is `hidden` and `disabled` |

The Text input's own height routine was not moved onto `auto-height.ts` in this build.

## `<tanrei-chat-composer>`

A feature (specs/chat-composer.spec.json, CCM-1 to CCM-44), built the web's way of composing (W1 to W14): its shadow
root holds the capsule — `part="container"`, its own — and in it the strip (`part="strip"`: a default slot for the
product's `<tanrei-file-item>`s while `attachments="given"`, or the file items it draws itself while it is `own`), a
`<tanrei-file-picker>` around its trigger, a `<tanrei-embedded-text-input multiline>`, the counter
(`part="counter"`), a `<tanrei-button>` for send or stop, and one live region.

| | |
|---|---|
| The value member | None: it is a feature. `value` is the typing area's at every moment (an accessor over the member), and the form value is its own — a `FormData` with the text under `name` and each kept file under `files-name` |
| Focus (W7) | Not delegated. `focus()` goes to the typing area; a `mousedown` on the capsule's own ground is passed to it with `focusAt()` and its default prevented |
| The layouts (CCM-2 to CCM-4) | The typing area and the send button never move in the DOM. The attach button with the leading slot, and the counter with the trailing slot, are drawn before and after the typing area (`inline`) or in `.row` beneath (`stacked`), so that the Tab order is the drawn order (CCM-29). Which it is — `layout`, or a capsule narrower than `layout.inline-min-width` — is read by a `ResizeObserver` of the capsule against a probe of that length: a CSS container query could not move the focus order |
| No custom property (W3) | The capsule holds its members, and a custom property on it would be inherited by each. Every state is written out from its own tokens; the corner and the glow come from `heldShape()` and `heldFocusGlow()` (`src/styles/shape.ts`, `src/primitives/focus-ring.ts`); and the one length the stylesheet cannot know — a line of the typing area's text, read from the member's `input` part — is written as a rule of a constructed stylesheet of the element's own (`measured()`), after its static sheet and in no cascade layer |
| Focus on the capsule (CCM-42) | `data-focused`, set from the typing area's `focusin` and `focusout` — not `:focus-within`, which also holds while a Button or a File item's action has focus |
| What can be sent (CCM-9) | `reasons()`, read on demand; `sendablechange` after each update in which the answer or the reasons changed. The element's own `disabled` is read with the platform's present answer (`:disabled`), so that unsetting it says one change and not two |
| Files (CCM-21 to CCM-24) | The file picker's `select` and `reject` are stopped and answered once, at its arrival event; a drop on the host and a paste into the typing area are judged with `judge()`. `own`: `kept` and `refused`, drawn with `repeat()`; each file item is given `file`, `form`, `preview` and `nameHidden` as properties and the rest through the file-item channel |
| Stopped at the shadow root (W5) | The embedded text input's `action`, `change` and `rowschange`; the file picker's `select` and `reject`; `remove`, `retry` and `click` of a file item it drew. The typing area's `input` leaves as it is |
| Parts (W4) | `embedded-text-input`, `file-picker`, `file-item`, `button` (each Button it brings; also `attach-button`, `send-button`, `stop-button`); every member's part under the member's name: `input-input`, `picker-…`, `item-…`, `attach-…`, `send-…` |

A file chosen in the file picker fires the browser's own composed `input` on the picker's native file input: the picker
stops it where it bubbles, and a capturing listener on an ancestor still hears an `input` whose target is the chat
composer.

## `<tanrei-main-action-button>`

The screen's single most important action on a raised container that floats above the content, showing its icon and
its label (extended) or collapsing to its icon alone (`specs/main-action-button.spec.json`, MAB-1…20). It replaces the
FAB and the extended FAB: a FAB is a collapsed main action button, an extended FAB an extended one.

```html
<tanrei-main-action-button label="Compose"><span slot="icon">edit</span></tanrei-main-action-button>
<tanrei-main-action-button label="Compose" collapsed><span slot="icon">edit</span></tanrei-main-action-button>
<tanrei-main-action-button label="Next" icon-position="trailing"><span slot="icon">arrow_forward</span></tanrei-main-action-button>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `variant` | `filled` \| `tonal` \| `surface` (+ values a layer adds) | `filled` | emphasis: the screen's main action at full strength, a quieter one, or a neutral container over colored content (a map, a photo); reflected |
| `size` | `small` \| `medium` \| `large` (+ values a layer adds) | `medium` | the height (40 / 48 / 64 in the default system), which is also the collapsed square's side, and the corner, paddings, gap, label role and icon size; reflected |
| `extended` / `collapsed` | boolean | `true` | shows the label beside the icon. An HTML boolean attribute cannot default to true, so the attribute is the inverse: `collapsed` (`extended = false`) collapses it to its icon. Not a toggle |
| `iconPosition` / `icon-position` | `leading` \| `trailing` | `leading` | the side of the label the icon is on, in the reading direction; reflected. Collapsed, the icon is centered either way |
| `disabled` | boolean | `false` | no events, not focusable, exposed as disabled; reflected. Hiding it when its action is unavailable is usually better |
| `label` | string | `""` | the visible text while extended **and** the accessible name in either form — required |

| Event | When |
|---|---|
| `click` | the native click of the inner `<button>` (pointer, Enter, Space, assistive technology), once each; none while disabled. `element.click()` activates it the same way |

**Placement (MAB-18).** The element positions nothing: it is `inline-flex`, exactly as large as its container, and draws
no scrim. The page puts it where it belongs — normally the inline-end bottom corner, clear of a navigation bar:

```css
tanrei-main-action-button.primary-action { position: fixed; inset-inline-end: var(--tanrei-sys-space-space400); inset-block-end: var(--tanrei-sys-space-space400); }
```

Which edge stays put while it collapses is the layout's decision too: anchored at the inline end, it collapses toward it.

**Layout (MAB-11, MAB-12).** Extended: at least `container.height.<size>` high with `container.shape.<size>` corners
(full in the default system: a pill), the icon's side padded by `padding-inline-start-with-icon` (leading) or
`padding-inline-end-with-icon` (trailing), a side without an icon by `padding-inline-start` / `padding-inline-end`,
`container.gap` between the icon and the label, and as wide as the content. The label is set in `label.typescale.<size>`
and never truncates: it stays on one line while it fits, wraps when the layout gives it less width (`max-inline-size:
100%` on the host), and the container grows; a wrapping label keeps the icon centered on its **first** line. The icon is
the `icon` slot (a glyph's ligature text, or a `.tanrei-icon`, `<svg>` or `<img>`), drawn in the label color at
`icon.size.<size>`, unselected, at `sys.icon.weight`, with the optical size of its box, clamped to `sys.icon.optical-size`.

**Collapsing (MAB-13…16).** `collapsed` with an icon draws a square of the size's height with the icon centered,
whichever side it is on (a circle in the default system). The label stays in the button, faded and zero-wide, so it is
still the accessible name and the role is still `button`. The change runs over
`comp.main-action-button.motion.resize-duration` with `motion.resize-easing` (the standard spatial spring): the label's
column narrows from `1fr` to `0fr` (a grid track transition) and fades, and the paddings move to half of what the icon
leaves; while it runs the label keeps one line, so it is clipped rather than broken into a tall column of words. Under
reduced motion it changes at once. A change of direction is not a resize and does not animate. The content decides
what it can be: **without an icon** it stays extended whatever `collapsed` says (reported in debug builds while it is
collapsed, MAB-15), and collapses once it is given one; **without a label** it draws the collapsed form whatever
`collapsed` says, and reports that it has no accessible name (MAB-16) — with neither, an empty square.

**Never a toggle (MAB-20).** The button has no `aria-pressed`, `aria-selected`, `aria-checked` or `aria-expanded`, on the
host or the native button; collapsing and extending change no role, name or focus and announce nothing (no live
region). Pressing it performs the action and never changes its form: the product collapses it from outside (a scroll
offset, a narrow window).

**Elevation (MAB-17).** Each variant and state has its own `container.elevation` token, drawn as the container's
`box-shadow` in either form and while it changes between them, never clipped by the element (nothing between it and the
page has `overflow` or `contain`); give its own container room for it if that container clips. In the default system it
rests at level3, rises to level4 under hover, keeps level3 under focus and press, and is flat when disabled. The colors,
the elevation and the opacity change over `comp.main-action-button.motion.state-duration.<size>` with `motion.state-easing`, at
once under reduced motion.

**Everything else is Button's**: a native `<button>` named by its content, the state precedence, the minimum target (the
small one is below `sys.target.pointer`; also in RTL), press-hold, the four `pressed-feedback` answers (under ripple and
dim the label, icon, elevation and opacity take their pressed tokens, the container keeps the state under the press),
ring or glow, corner smoothing (cupertino's full corners stay round), RTL (MAB-19: a leading icon at the right, a
trailing one at the left, logical paddings, the glyph itself not mirrored, the ripple from the point of contact) and
unknown values (MAB-7). Parts: `container` (the native button), `icon` (the glyph box), `label`. Text size scales the
extended container with its label and the collapsed square with its icon, keeping it square (every Tanrei size is rem on
the web). Forced colors: a `ButtonText` edge, since the shadow is dropped.

## `<tanrei-fab-menu>` and `<tanrei-fab-menu-item>`

A floating action button that opens a short list of related actions, and turns into the list's close button while they
show (`specs/fab-menu.spec.json`, FBM-1…24). It lives in the m3-like layer: `import '@tanrei/web/m3-like'` registers it,
and its tokens are in the m3-like systems' sheets (`@tanrei/web/systems/m3-like.css`, `m3-expressive-like.css`) and in
the sheet of a product that includes it.

```html
<tanrei-fab-menu label="Create">
  <span slot="icon">add</span>
  <tanrei-fab-menu-item label="Document" icon="description"></tanrei-fab-menu-item>
  <tanrei-fab-menu-item label="Folder" icon="create_new_folder"></tanrei-fab-menu-item>
  <tanrei-fab-menu-item label="Upload" icon="upload"></tanrei-fab-menu-item>
</tanrei-fab-menu>
<script type="module">
  const menu = document.querySelector('tanrei-fab-menu');
  menu.addEventListener('toggle', (e) => (menu.open = e.detail.open)); // the toggle asks; you set open
  menu.addEventListener('close', () => (menu.open = false)); // the menu asks, with detail.reason
  menu.querySelector('[label="Upload"]').addEventListener('click', upload);
</script>
```

| `<tanrei-fab-menu>` | Type | Default | |
|---|---|---|---|
| `variant` | `filled` \| `tonal` \| `surface` (+ values a layer adds) | `filled` | emphasis, as the main action button's: it colors the toggle and the items; unknown is drawn as filled and reported (FBM-7); reflected |
| `size` | `small` \| `medium` \| `large` (+ values a layer adds) | `medium` | the toggle's side, corner and icon (40 / 48 / 64, a collapsed main action button's); the items keep one size; reflected |
| `open` | boolean | `false` | whether the items are shown; reflected. **The FAB menu never opens or closes itself**: set it from `toggle` and to false from `close` |
| `label` | string | `""` | the accessible name of the toggle and of the list ("Create"). Required (empty is reported, FBM-23) |
| `disabled` | boolean | `false` | no `toggle` or `close`, not focusable, exposed as disabled, drawn closed with no items whatever `open` says (FBM-2, FBM-6); reflected |
| `inline` | boolean | `false` | for tests and documentation only: the open items are drawn in place above the toggle, with their elevation, without the top layer, open motion, focus on opening or light dismiss (the fixtures, FBM-13) |

| `<tanrei-fab-menu-item>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the item's text and accessible name. Required |
| `icon` | string | `""` | the name of the item's glyph in the system's icon set (`upload`), drawn before the label. Required |

Slots: `icon` (the toggle's glyph while closed — a glyph's ligature text, or a `.tanrei-icon`, `<svg>` or `<img>`) and
the default slot (the `<tanrei-fab-menu-item>` children, two to six; fewer or more still render and are reported,
FBM-23). Parts: `container` (the toggle's native button), `icon` (its glyph box), `list` (the column, which draws nothing);
on an item `container`, `icon` and `label`.

| Event | When |
|---|---|
| `toggle` | `CustomEvent<{ open }>`, not bubbling: the toggle asks for `!open` (pointer, Enter, Space), or Down / Up Arrow on it asks for `true` while closed (FBM-1). It is not the popover's `ToggleEvent`, which never leaves the shadow root. The toggle's own native click stops at the shadow root: a `click` that reaches listeners on the element is an item's |
| `close` | `CustomEvent<{ reason }>`, not bubbling: the menu asks to be closed — `escape`, `outside` (a press outside the items and the toggle), `tab` (Tab or Shift+Tab on an item), `focus-out` or `item` (FBM-15, FBM-16). A press on the toggle while open is a `toggle` with `false`, never an outside press. The web never sends `back`: Escape is its close request |
| `click` (on an item) | the item was activated (pointer, Enter, Space, assistive technology, `element.click()`); it bubbles, through the FAB menu. `close` with `item` follows once the click has gone through the page, so every `click` listener — on the item or above it — runs first |

**The toggle (FBM-3…11, FBM-21).** A native `<button>` drawn as a collapsed main action button of the variant and size from the FAB menu's own
tokens (`comp.fab-menu.*`, not `<tanrei-main-action-button>`'s): the square, the size's corners, the elevation (level3,
level4 under hover in the default system), the state precedence, the minimum target, press-hold, the four
`pressed-feedback` answers, ring or glow and corner smoothing. While open it takes the variant's **open look** (the
`open.` parts: filled and surface open to the tonal look, tonal to the filled one), `container.shape-open` (round) and the
icon set's `close` glyph (FBM-11: drawn by the icon helper, never mirrored — no mark of its own); the change runs over
`motion.open-duration` / `-easing` when opening and `motion.close-duration` / `-easing` when closing, the two glyphs
cross-fading (FBM-19), and at once under reduced motion. Until the icon set can draw `close`, the open toggle's icon box
is empty — never the word "close" — and keeps its size, colors, corners, name and expanded state (FBM-24,
`GlyphDrawnController`); the glyph then appears without the cross-fade. The round corner is held to
half the side, so it turns round over the motion rather than at its first frame. It keeps its name while open: its
`aria-expanded` says it now closes the menu. `aria-haspopup="menu"` and `aria-controls` name the list.

**The items (FBM-13, FBM-17…19, FBM-22).** The children are presented in a manual popover — the top layer, so nothing
clips them and no content moves — with role `menu` named by `label`. The column sits `comp.fab-menu.list.offset` above the
toggle's top edge, `list.gap` apart, the first item at the top and every item's end edge on the toggle's end edge (its
left edge in right-to-left); it is placed by script against the toggle and follows it while open, by events (as
`<tanrei-menu>` is, `FollowController`; the CSS anchor positioning the spec's web note mentions is not used, as the menu does not). Each item
is a raised container at least `item.height` and the minimum target tall and as wide as its content: the icon, then the
label `item.gap` apart, padded by `item.padding-inline-start` / `-end` (logical, so right-to-left mirrors them), its corners
`item.shape` eased by the smoothing, the label in `item.label.typescale`, wrapping rather than truncating. Each item has
its own hover, focus ring, press and ripple from the item parts of the variant, which it inherits from the FAB menu (so a
variant a layer adds colors its items too). Opening grows the items in from their end edge, the one nearest the toggle
first, each next `motion.stagger` later, over `motion.open-duration`; closing fades them out together over
`motion.close-duration`; at once under reduced motion.

**Focus and dismissal (FBM-13…17).** An operated overlay that is not modal: opening moves focus to the first
item (to the last, the one nearest the toggle, when Up Arrow opened it), closing returns it to the toggle if it was in
the items. Up / Down Arrow move through the items, wrapping, Home / End reach the ends; there is no typeahead. The items
are never Tab stops (`tabindex="-1"`): Tab or Shift+Tab on an item asks to close and moves on from the toggle as it would
have from it. There is no focus trap, nothing is made inert and there is no scrim; a press outside asks to close **and
also reaches what is under it** (the web's answer to FBM-15's platform question, as the menu's).

**Placement (FBM-12).** The element positions nothing: it is `inline-flex`, exactly as large as its toggle. The page
puts it where a main action button goes, and the items follow the toggle:

```css
tanrei-fab-menu.create { position: fixed; inset-inline-end: var(--tanrei-sys-space-space400); inset-block-end: var(--tanrei-sys-space-space400); }
```

**Differences from the other platforms.** The web can tell the input type, so the toggle's hit area reaches
`sys.target.pointer` under a fine pointer and `touch` under a coarse one, and each item is at least that tall. Semantics
are real ARIA roles: `menu` and `menuitem` with `aria-posinset` / `aria-setsize` on the items' hosts. The web has no
gallery app; the fixtures are drawn by the test harness (`test/harness.ts`) on a 320 × 320 stage with the toggle 16 in
from the inline-end bottom corner, the open ones with `inline`.

## `<tanrei-chip>`

A compact choice, a suggested action or an item the user entered, as a small labelled control
(`specs/chip.spec.json`, CHP-1…28).

```html
<tanrei-chip label="Add to calendar"><span slot="icon">event</span></tanrei-chip>
<tanrei-chip kind="filter" label="Vegetarian" selected></tanrei-chip>
<tanrei-chip kind="input" label="Ada Lovelace" remove-label="Remove Ada Lovelace"><img slot="avatar" src="ada.jpg" alt="" /></tanrei-chip>
<tanrei-chip kind="input" label="report.pdf" remove-label="Remove report.pdf" destructive-remove></tanrei-chip>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `kind` | `action` \| `filter` \| `input` | `action` | what the chip does — its role and parts, not its look (a closed set; an unknown kind is an action chip, reported in debug builds, CHP-7); reflected |
| `variant` | `outlined` \| `elevated` (+ values a layer adds) | `outlined` | the look: flat with an edge, or raised over media and busy backgrounds; reflected |
| `size` | `small` \| `medium` (+ values a layer adds) | `medium` | the minimum height (24 / 32 in the default system), paddings, gap, label role, icon, avatar and remove sizes; reflected |
| `selected` | boolean | `false` | whether a filter chip is on — ignored unless `kind="filter"`; reflected |
| `disabled` | boolean | `false` | no events; neither the chip nor its remove action is focusable; exposed as disabled; reflected |
| `label` | string | `""` | the visible text and the accessible name |
| `removeLabel` / `remove-label` | string | `""` | an input chip's remove action's accessible name; name the item ("Remove Ada Lovelace"). Required for `kind="input"` |
| `href` | string | `""` | the destination — a URL, a path or a fragment. Not empty, an action chip is a link and not a button, with the `open_in_new` mark at its inline end for `target="new"` (CHP-33; see "A control with a destination is a link"); ignored for a filter or an input chip. White space is none; a `javascript:` address or one that cannot be read is refused and reported (CHP-37) |
| `target` | `same` \| `new` | `same` | where it opens: here, or a new tab or window (`target="_blank"` with `noopener`). `_self` and `_blank` are read as those two; anything else is `same`, reported. Ignored without `href` |
| `targetLabel` / `target-label` | string | `""` | what is read after the link's name while `target` is `new` ("opens in a new tab") — your words; empty is reported (CHP-35). Ignored otherwise |
| `rel`, `download` | string \| `null` | `null` | web only: forwarded to the anchor (`target="new"` adds `noopener` to `rel`). Ignored without `href` |
| `type` | `button` \| `submit` \| `reset` | `button` | web only: what a press does to the button's form — nothing, ask it to submit, ask it to reset (BTN-27, BTN-28). Anything else is `button`, reported; a toggle and a link ignore it, reported (BTN-33). Reflected, the default not |
| `name`, `value` | string | `""` | web only: the pair sent with the form when this button submitted it; nothing while `name` is empty (BTN-31) |
| `form` (attribute) | a form's id | — | web only: the form the button belongs to where it stands outside it; the platform's own attribute. The `form` property is read-only and returns the form (BTN-29) |
| `destructiveRemove` / `destructive-remove` | boolean | `false` | whether an input chip's remove action reads as destructive: the same at rest, the error color while hovered, keyboard-focused or pressed (CHP-27). Set it where removing loses something that cannot be put back in a step (an attachment, a recipient already invited); leave it off where the item comes back in one step (an applied filter). Color only — name, glyph, size, hit area and behaviour are the same either way (CHP-28). Ignored unless `kind="input"`; reflected |
| `removable` / `not-removable` | boolean | `true` | whether an input chip draws its remove action (CHP-38). `not-removable`: no remove action, no stop for one, no `remove` from Backspace or Delete, and the padding of a chip without one — an entry that cannot be taken away now (a read-only field's). Ignored unless `kind="input"`; reflected |

| Event | When |
|---|---|
| `click` | the chip itself was activated (pointer, Enter, Space, assistive technology, `element.click()`), once each. **Never** from the remove action: its native click stops inside the shadow root |
| `change` | a filter chip was activated: `CustomEvent<{ selected: boolean }>`, bubbling, fired **after** `click`, as a native checkbox does (CHP-11). `selected` has already switched when `click` listeners run. `change` is fired when the click has finished its way through the page (from a listener on `window`); if a listener stopped the click, `change` still comes, in the next task. Setting `selected` from script fires nothing |
| `remove` | an input chip's removal was asked for — its remove action (pointer, Enter, Space) or Backspace / Delete on the focused chip (CHP-19). An `Event`, bubbling. **The chip stays**: remove it and move focus to a neighbour or to the field yourself (CHP-22) |

**Structure.** Two sibling native buttons in the shadow root: the chip (`::part(container)`) and, for an input chip,
the remove action (`::part(remove)`) drawn over the chip's trailing room. They are siblings because buttons cannot nest,
and so each keeps its own states: while the pointer or a press is on the remove action, the chip is neither hovered nor
pressed (CHP-20), and hovering the chip leaves the remove action at rest. Every chip is one Tab stop, an input chip
too: the remove action has `tabindex="-1"` (CHP-18, CHP-23) — pressable by pointer and assistive technology, focusable
by `focus()`, passed by Tab — and the keyboard removes with Backspace or Delete on the chip (CHP-19), which its button
announces as `aria-keyshortcuts="Delete Backspace"` while the chip removes (not while disabled or `not-removable`). The
chip handles no arrow keys — a row of chips is the page's (a future chip group).

**Looks (CHP-12).** A filter chip announces `aria-pressed`, and the look follows it: `true` paints the variant's
`selected.*` parts, anything else the variant's own. A filter chip that is on shows a check in the leading position, in
place of its icon (CHP-13); without an icon the leading column opens (`0fr → 1fr`) so the chip widens over
`comp.chip.motion.selection-duration` / `-easing`, and the colors of a change of condition take that motion too (the
selection controls' `markConditionChange`), while a change of state takes the state motion (CHP-24). At once under
reduced motion.

**Layout (CHP-16, CHP-17).** At least `container.height.<size>` high, one row: leading icon, check or avatar; the label;
the remove glyph. The corner is `container.shape` through the shared corner rule; in the default system that is
`sys.shape.corner.full`, drawn as round caps, so the chip stays a pill at any height it grows to. An end that holds an
icon or the check is padded by `padding-inline-with-icon`, one that holds an avatar by `padding-inline-with-avatar`, the
end that holds the remove glyph by `padding-inline-with-remove` (CHP-32: in the default system that puts the remove
action's round container the same distance from the chip's end as from its top and bottom — 2 at medium, the round end
itself at small — concentric with the end; m3-like and cupertino pin it to their `with-icon` padding), the label's by
`padding-inline`, with `container.gap` between; `padding-block` is around the row's tallest item — the label's line or
a glyph's box (the remove glyph's too: the trailing room is as tall as it). The outline is an inset ring
of `outline.width` inside the edge, under the elevation. The label is one line in `label.typescale.<size>`, truncated
with an ellipsis only when the layout gives the chip less width (`max-inline-size: 100%` on the host); the full label is
still the name. All logical, so RTL mirrors: the remove action sits at the left (CHP-25).

**Glyphs (CHP-13, CHP-14, CHP-18).** The icon (`icon` slot), the check and the remove glyph are drawn at
`icon.size.<size>`, at the optical size of their box: the icon and the remove glyph with `sys.icon.weight`, the check —
a control's own mark — with `check.weight` (`sys.icon.mark.weight` in the default system). The icon and the check take the family and
fill of the chip's selection (selected only on a filter chip that is on); the remove glyph is always filled, in
`sys.icon.family.selected` / `sys.icon.fill.selected`. The check and the remove mark are the glyphs the spec names,
`check` and `cancel`, written as ligature text for the system's icon font — the chip draws no path of its own; a system
that wants other marks chooses another icon set. The avatar (`avatar` slot, input chips only — elsewhere ignored and
reported, CHP-15) is clipped to `avatar.shape` at `avatar.size.<size>`, hidden from assistive technology, and drawn at
`sys.state.disabled-content-opacity` when disabled.

**The remove action (CHP-18, CHP-20, CHP-21, CHP-27, CHP-28).** The `cancel` glyph centered on a round container of
`remove.container.size` at the inline end; not a Tab stop (above). The container is larger than the glyph (the state layer shows as a ring
around the filled disc) and out of flow: it reaches into the gap and the end padding — on a small chip to its top and
bottom — without changing the chip's size. It has its own hover, focus and press, its own focus ring, press-hold and
ripple (within the round container; from its center for a press in the hit area outside it). By default it paints
from the variant's `remove.*` parts; with `destructive-remove` it paints from its `destructive-remove.*` parts, which
rest at the `remove.*` values and, in the default system, take `sys.color.error` for the glyph and mix error into the
round container while hovered, focused or pressed. Disabled, the two look alike. Only colors
differ: the role, the name `removeLabel`, the glyph, the size and the hit area are the same. Its hit area is at least
`sys.target.pointer` (`touch` for a coarse pointer) on both axes around the glyph: toward the label it reaches no
further than the gap before the glyph — never over the label — and it extends outward, past the chip's edge, as far as
it needs. The rest of the chip's hit area (at least the minimum target too) activates the chip. Under `dim` a press of
the chip dims the remove action with it.

**Everything else is Button's**: the state precedence, press-hold, the four `pressed-feedback` answers, ring or glow,
corner smoothing (cupertino's chip is a capsule and stays round), unknown values (CHP-7), and the empty-name reports
(CHP-26: an empty `label`, and an input chip's empty `removeLabel`). Parts: `container`, `icon`, `check`, `avatar`,
`label`, `remove`.

**Held in a set with one stop** (CHP-23). A component that holds chips as a set and gives the set one
Tab stop — `<tanrei-chip-field>` — sets `tabindex="-1"` on each chip, as the toolbar does on its Buttons: the chip's
shadow root delegates focus, so the chip's own button and its remove action leave the Tab order together and stay
focusable by `focus()`, by a pointer and by assistive technology. The chip itself does nothing for it.

## `<tanrei-list>`

A box that holds your own items — rows, tiles, cards, files — in one column, one line, or lines that wrap into a grid; people read them, open them one by one, choose from them, or drag them into another order (`specs/list.spec.json`, LST-1…49).

```html
<tanrei-list gap="small" dividers>
  <tanrei-list-item>…your row…</tanrei-list-item>
  <tanrei-list-item>…</tanrei-list-item>
</tanrei-list>

<tanrei-list orientation="horizontal" wrap gap="medium">…tiles…</tanrei-list>

<tanrei-list>
  <tanrei-list-item interactive>Wi-Fi</tanrei-list-item>
  <tanrei-list-item href="/components/button/">Button</tanrei-list-item>
</tanrei-list>

<tanrei-list selection="single" label="Theme" value="light">
  <tanrei-list-item value="light">Light</tanrei-list-item>
  <tanrei-list-item value="dark">Dark</tanrei-list-item>
</tanrei-list>
<tanrei-list selection="multiple" label="Labels" values='["bug","docs"]'>…</tanrei-list>
```

| `<tanrei-list>` | Type | Default | |
|---|---|---|---|
| `orientation` | `vertical` \| `horizontal` | `vertical` | a column from the top, or a line from the start edge (closed; unknown is `vertical`, reported, LST-6); reflected |
| `wrap` | boolean | `false` | the items run onto further lines and form a grid (a vertical list wraps where the height you give it ends, LST-2); reflected |
| `gap` | `none` \| `small` \| `medium` \| `large` | `none` | the space between two items and between two lines: `comp.list.gap.*` (LST-1); reflected |
| `dividers` | boolean | `false` | a hairline between every two neighbouring items, in the middle of the gap; ignored, and reported, while `wrap` (LST-3); reflected |
| `selection` | `none` \| `single` \| `multiple` | `none` | `single` and `multiple` make the list a listbox and every item an option (LST-18); reflected |
| `label` | string | `""` | the list's accessible name; required for a listbox and a reorderable list |
| `value` | string \| `null` | `null` | the selected option's value while `selection="single"` |
| `values` | `string[]` | `[]` | the selected options' values while `selection="multiple"`. The attribute takes a JSON array or space-separated values; the property is not reflected. Assign a **new** array to change it |
| `reorderable` | boolean | `false` | people can put the items in another order while `selection` is `none`: a handle in every item, the whole item draggable, a menu of moves, the keyboard from the handle, and `move` (LST-31); reflected |
| `dragHandleLabel` / `drag-handle-label` | string | `""` | every handle's name, with the place `{label}` the list fills with the item's name ("Reorder {label}") |
| `dragHandleHint` / `drag-handle-hint` | string | `""` | every handle's description: how to move an item with the keyboard |
| `moveToStartLabel`, `moveBeforeLabel`, `moveAfterLabel`, `moveToEndLabel` (`move-to-start-label` …) | string | `""` | the four items of the handle's menu ("Move to top", "Move up", "Move down", "Move to bottom"; in a line "Move left", "Move right") |
| `liftedText`, `movedText`, `cancelledText` (`lifted-text` …) | string | `""` | the sentences announced when the keyboard lifts an item, when an item reaches another place, and when a keyboard move is cancelled, with the places `{label}`, `{position}` (from 1) and `{count}` |

Every word is yours: the attribute, or once for the page with `setWords({ dragHandleLabel, … })`. A missing one is reported once (LST-47).

| `<tanrei-list-item>` | Type | Default | |
|---|---|---|---|
| (children) | — | — | the item's content, in its default slot: yours |
| `label` | string | `""` | the item's name: an action, a link or an option is named by it in place of its content's text, and the list calls every item by it in the handle's name and what it announces. Empty: the content's text |
| `interactive` | boolean | `false` | the item is one action with the button role and fires `click` (ignored in a listbox or a reorderable list); reflected |
| `href` | string | `""` | the destination: the item is a link item, an `<a href>` in the list's arrow-key order; `target="new"` draws `open_in_new` at its end (LST-26…30; see "A control with a destination is a link") |
| `target` | `same` \| `new` | `same` | where it opens; `_self` and `_blank` are read as those two. Ignored without `href` |
| `targetLabel` / `target-label` | string | `""` | read as the link's description while `target` is `new` ("opens in a new tab") — your words; empty is reported (LST-28) |
| `rel`, `download` | string \| `null` | `null` | web only: forwarded to the anchor (`target="new"` adds `noopener` to `rel`) |
| `value` | string | `""` | identifies an option; unique within the list |
| `disabled` | boolean | `false` | an action, a link or an option does nothing and is exposed as disabled, but the arrow keys still reach it; ignored for a static item; reflected |

| Event | When |
|---|---|
| `click` (on the item) | an interactive or link item was activated: pointer, **Enter** on key-down, **Space** on key-up (not on a link), `element.click()` — once each |
| `change` (on the list) | the user changed the selection: `CustomEvent<{ value }>` (single) or `<{ values }>` (multiple), bubbling. The list already holds the new value |
| `move` (on the list) | a move was asked for — from the menu, the keyboard or a drag: `CustomEvent<{ from, to }>`, both indexes from 0, bubbling, not cancelable, once per move. **The list has moved nothing** |

**Four kinds of item (LST-7, LST-8, LST-18).** A **static** item (the default) is a `listitem` that draws nothing, adds no
space and takes no focus: its content is the item, and a control in it keeps its own tokens, semantics and tab stop. An
**interactive** item draws one shadow `<div role="button">` inside its `listitem`; a **link item** an `<a href>`; in a
**listbox** every item's host is an `option` with `aria-selected`. Those three are padded boxes
(`container.padding-*`, at least `container.height` and the minimum target), hand their content `content.color` and
`content.typescale`, answer every state as Button does — the ring or glow drawn inside the box — and hold nothing
interactive (reported on every `slotchange`, LST-20). The list sets `aria-posinset` / `aria-setsize` on every item. A
selected option draws the icon set's `check` glyph in a box reserved at the end of every option (LST-21, LST-22).

**Keyboard (LST-17).** A list with actions, links or options is one tab stop (a roving `tabindex`). The arrow keys of the
arrangement move focus without wrapping — Up and Down in a column, Left and Right in a line (mirrored in right-to-left),
and in a wrapping list the arrows across the lines go to the nearest item of the next or previous line — with Home, End
and typeahead on the items' names. Moving focus never selects; Enter and Space activate.

**Layout (LST-1…5).** The list draws nothing and adds no space around its items, does not scroll and does not virtualize:
put it in your own scroll container. A line wider than the list goes past its end. Parts: `items` on the list;
`container`, `content`, `handle`, `mark`, `new-context`, `divider` on an item.

**Reordering (LST-31…47).**

```html
<tanrei-list id="fonts" reorderable label="Typefaces" drag-handle-label="Reorder {label}"
  drag-handle-hint="Space lifts, arrow keys move, Space drops, Escape cancels; Enter opens the moves"
  move-to-start-label="Move to top" move-before-label="Move up" move-after-label="Move down" move-to-end-label="Move to bottom"
  lifted-text="{label} lifted: {position} of {count}" moved-text="{label}: {position} of {count}" cancelled-text="{label} returned to {position} of {count}">
  <tanrei-list-item label="Inter">Inter <tanrei-button variant="text" label="Remove Inter"><span slot="icon">close</span></tanrei-button></tanrei-list-item>
  <tanrei-list-item label="Noto Sans JP">…</tanrei-list-item>
</tanrei-list>
<script type="module">
  const list = document.querySelector('#fonts');
  list.addEventListener('move', ({ detail: { from, to } }) => {
    const items = [...list.children];
    list.insertBefore(items[from], items[to > from ? to + 1 : to] ?? null);
  });
</script>
```

- **Every way.** The handle — an icon-only `<tanrei-button>` in each item's shadow root (part `handle`), drawn from
  Button's tokens — opens a `<tanrei-menu>` of four moves (Enter, Down Arrow, a press); Space on it lifts the item for the
  keyboard, the arrow keys carry it, Home and End take it to an end, Space or Enter drop it, Escape puts it back (and so
  does focus leaving the handle). A pointer drags the whole item: a mouse after a few pixels of movement, a touch or a pen
  at once from the handle or after a long press elsewhere, so that a swipe still scrolls. A press on a control in the
  content is that control's.
- **The order is yours.** Every way fires `move` and the list waits for your order. It has *taken effect* once the item
  at `to` is the moved element, or carries the moved item's name on an element that did not stand there. The list then
  sets every position anew, announces `moved-text` and, where focus was on the handle or in its menu, puts focus on the
  handle of the item now at `to`. An order not given within `--tanrei-comp-list-motion-reorder-duration` is refused:
  nothing is announced, and what was dropped goes back.
- **Motion.** While an item is carried it is lifted (`dragged.container.color`, `dragged.container.elevation`) and the
  other items slide aside by transforms over `motion.reorder-duration`; dropped, it settles into its place; any later
  change of the order is animated from where each item was drawn (FLIP, the Web Animations API). Under
  `prefers-reduced-motion` every motion is at once; a dragged item still follows the pointer.
- **The live region** is one visually hidden `role="status"` element in the list's shadow root; while the list is
  reorderable its `list` role is carried by the `items` box around the slot. The name is put in as a `<bdi>`; the numbers
  are `Intl.NumberFormat`'s for the nearest `lang`.
- **Removal (LST-46).** When you remove the item that holds focus, focus goes to the handle of the item now standing
  there, else of the one before it; with no item left, it is yours. Nothing is announced.

## `<tanrei-list-row>`

`specs/list-row.spec.json` (LRW-1 to LRW-15): one row of text with something before it and something after it — an
overline, a headline and a line or two of supporting text; a glyph, an avatar, a picture or a control at its start; a
short value, a control and a glyph at its end. Put it as the direct child of a `<tanrei-list-item>`, or on its own. It
draws no fill, edge or state and is never pressable: a row that opens something is the content of an `interactive` or
`href` item, a row that is chosen the content of an option.

```html
<tanrei-list dividers>
  <tanrei-list-item interactive>
    <tanrei-list-row leading-icon="wifi" headline="Wi-Fi" supporting-text="Connected to Harbour" trailing-icon="chevron_right"></tanrei-list-row>
  </tanrei-list-item>
  <tanrei-list-item>
    <tanrei-list-row headline="Bluetooth">
      <tanrei-switch slot="trailing" label="Bluetooth" label-hidden></tanrei-switch>
    </tanrei-list-row>
  </tanrei-list-item>
</tanrei-list>
<tanrei-list-row overline="Shared" headline="Harbour photos" supporting-text="48 items" trailing-text="2.4 GB"></tanrei-list-row>
```

| `<tanrei-list-row>` | Type | Default | |
|---|---|---|---|
| `headline` | string | `''` | the row's name, one line, cut with an ellipsis (whole in the tooltip); the item it is in is named by it |
| `overline` | string | `''` | a short line above the headline, one line |
| `supporting-text` (`supportingText`) | string | `''` | the text under the headline, cut on its last line |
| `supporting-lines` (`supportingLines`) | number | `1` | 1 or 2 lines of supporting text; another number is the nearer, reported |
| `leading-icon` (`leadingIcon`) | string | `''` | a glyph of the icon set at the start, decorative; the `leading` slot's content replaces it |
| `trailing-text` (`trailingText`) | string | `''` | a short value at the end, never more than half of the row |
| `trailing-icon` (`trailingIcon`) | string | `''` | a glyph at the very end (`chevron_right`), decorative, mirrored where the icon set says |
| `density` | `regular` \| `compact` | `regular` | 56, 72, 88 or 40, 56, 72 for one, two, three lines under the default system; reflected; open |

Slots: `leading` (an avatar, a picture, or in a static row a control), `trailing` (a badge, or in a static row a control).
Parts: `container`, `leading`, `leading-icon`, `text`, `overline`, `headline`, `supporting-text`, `trailing-text`,
`trailing`, `trailing-icon`. No events.

The seam with the List (LST-48, LST-49): a `<tanrei-list-item>` sets an internal `listItemFrame` property on each
direct child that has one — whether the item is an action, a link or an option (it pads the row, so the row draws no
padding of its own and keeps its height), whether it draws a reorderable list's handle (the row drops its start
padding), whether it is a selected option (the row takes the item's content color) and whether it is disabled — and
reads `listItemName` (the headline) and `listItemDescription` (the other texts) from it, for its name, its handle's
name, typeahead, announcements and the description of an action, a link or an option. A row nested deeper in the
item's content is told nothing and draws itself as standing alone. The row tells its item when its texts change with an
internal `tanrei-list-item-content` event.

## `<tanrei-menu>`

A short set of actions or choices on a temporary surface that opens from the element that asked for it, with further
levels in submenus (`specs/menu.spec.json`, MNU-1…57).

```html
<tanrei-button variant="text" id="more" label="More"><span slot="icon">more_vert</span></tanrei-button>
<tanrei-menu anchor="more">
  <tanrei-menu-item label="Copy" leading-icon="content_copy" shortcut="mod+c"></tanrei-menu-item>
  <tanrei-menu-group label="View">
    <tanrei-menu-checkbox-item label="Show grid" checked></tanrei-menu-checkbox-item>
  </tanrei-menu-group>
  <tanrei-menu-group label="Sort by" value="name">
    <tanrei-menu-radio-item label="Name" value="name"></tanrei-menu-radio-item>
    <tanrei-menu-radio-item label="Date modified" value="date"></tanrei-menu-radio-item>
  </tanrei-menu-group>
  <tanrei-submenu label="Open recent" leading-icon="history">
    <tanrei-menu-item label="Report.pdf"></tanrei-menu-item>
    <tanrei-menu-item label="Notes.txt"></tanrei-menu-item>
  </tanrei-submenu>
  <tanrei-menu-item label="Delete" leading-icon="delete" destructive></tanrei-menu-item>
</tanrei-menu>
<script type="module">
  const menu = document.querySelector('tanrei-menu');
  document.querySelector('#more').addEventListener('click', () => (menu.open = !menu.open));
  menu.addEventListener('close', () => (menu.open = false));
</script>
```

| `<tanrei-menu>` | Type | Default | |
|---|---|---|---|
| `open` | boolean | `false` | whether the menu is shown; reflected. **The menu never closes itself**: set it to false when it fires `close` |
| `placement` | `bottom-start` \| `bottom-end` \| `top-start` \| `top-end` | `bottom-start` | the side and edge against the anchor (closed; unknown is `bottom-start`, reported, MNU-14); reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | how a group is told from what is next to it: a line, or `comp.menu.group.gap` of empty space. `auto` takes `comp.menu.separation`, which follows `sys.behavior.separation` (divider in the default system and cupertino; m3-like sets the system's choice to gap and the menu's back to divider). The menu's and every submenu's; an unknown value is `auto`, reported (MNU-35); reflected |
| `anchor` | string | `""` | the id of the anchor element, in the menu's own document or shadow root (as the HTML `anchor` attribute) |
| `inline` | boolean | `false` | for tests and documentation: the open surface drawn in place (MNU-19's fixtures), each open submenu beside its item — no popover, placement, open motion, focus on opening or light dismiss; the items work as usual |

Items: `<tanrei-menu-item>` (an action: `label`, `supporting-text`, `leading-icon`, `trailing-icon`, `trailing-text`,
`shortcut`, `destructive`, `disabled`; with `href` a link item, which also reads `target`, `target-label` and the
web-only `rel` and `download` — below), `<tanrei-menu-checkbox-item>` (the same without `destructive`, plus `checked`,
reflected, and `mark-icon`), `<tanrei-menu-radio-item>` (plus `value` and `mark-icon`), `<tanrei-submenu>` (`label`,
`supporting-text`, `leading-icon`, `trailing-text`, `disabled`, and `open`, reflected; its children are the submenu's
items, of any kind) and `<tanrei-menu-group>` (`label`, its title — as `<optgroup label>`, because a `title` attribute
would also draw the browser's tooltip — `value`, the checked radio item's value, and `mark-icon`).

| Event | When |
|---|---|
| `close` (on the menu) | `CustomEvent<{ reason }>`, not bubbling: `escape`, `outside` (a press outside the surface and the anchor), `tab`, `focus-out` (focus moved elsewhere, except to the anchor) or `item`. Once per request; a closed menu asks nothing. The web menu does not listen for the platform's close request (Android's back gesture), so `back` is never sent |
| `click` (on an action) | the action was activated (pointer, Enter on key-down, Space on key-up, `element.click()`); `close` with `item` follows. On a link item it is the anchor's own click, before `close` and before the link is followed: `preventDefault()` stops the navigation and not the `close` (MNU-54) |
| `change` (on a checkbox item) | `CustomEvent<{ checked }>`, bubbling; the item already holds the new value |
| `change` (on a group) | `CustomEvent<{ value }>`, bubbling: a radio item was chosen; the group already holds the new value. A checked radio item emits nothing |
| `toggle` (on a submenu item) | `CustomEvent<{ open }>`, bubbling: the person opened or closed the submenu; the item already holds the new `open`. Your own change of `open`, and the whole menu closing, fire none. Never `close` |

**A menu of links (MNU-53…57).** An action with `href` is a link item: its row in the shadow root is an
`<a href role="menuitem" tabindex="-1">` in place of the row's `<div>` — the same part (`container`), drawn from the same
tokens in every state, with no look of a link and none for a visited one — so the address, the browser's context menu,
a new tab by a modified or a middle click and the status bar are the browser's own.

```html
<tanrei-menu anchor="more">
  <tanrei-menu-item label="Guides" href="/guides/"></tanrei-menu-item>
  <tanrei-menu-item label="Source" href="https://example.com/tanrei" target="new" target-label="opens in a new tab"></tanrei-menu-item>
  <tanrei-menu-item label="Archive" href="/archive/" disabled></tanrei-menu-item>
</tanrei-menu>
```

- **A menu item, not a link.** A menu is read by its items — how many, which one, the arrow keys — so the anchor carries
  the menu item role with the item's name, description, position and shortcut, and the host carries nothing (no role, no
  `tabindex`): the item is exposed once. Focus is the anchor's; `item.focus()` and `item.click()` go to it. The arrow
  keys, Home, End, typed characters and focus following the pointer treat it as any item, and Tab closes the menu.
- **Activation.** A click with the primary button and no modifier key, a touch, Enter, `item.click()` — and **Space,
  which activates every row of a menu and scrolls nothing here** (the one link form that answers it) — fire the item's
  `click` once, then the menu's `close` (`item`), and then the browser follows the link, at once and not after
  press-hold. A router cancels the `click`: the menu still closes and nothing opens. Enter is the browser's own on the
  anchor; Space calls the anchor's `click()`.
- **Left to the browser.** A click or Enter with a modifier key, a middle click and the context menu: nothing is
  prevented, no `close` is fired and the menu stays open at every level with focus on the item, so several of its links
  can be opened in tabs one after another. Its address can be dragged (an action's row starts no drag).
- **`target="new"`** is `target="_blank"` with `noopener`, marked with the icon set's `open_in_new` in the trailing icon
  column (parts `trailing-icon link-mark`: the trailing icon's size and its color of the item's condition and state,
  mirrored in right-to-left, hidden, nothing drawn until the icon set can draw it) unless `trailing-icon` names a glyph;
  a shortcut or trailing text keeps its own column before it, and the mark reserves the column for its surface.
  `target-label` ends the item's description either way; an empty one is reported (MNU-55).
- **`current`** (boolean, reflected): the link item of the page the person is on — `aria-current="page"` on its anchor,
  the row drawn from the `selected` condition (the fill and colors of a checked row) with no mark and its label's own
  weight; in forced colors a line of `sys.border.thick` in `LinkText` inside the row marks it. The menu never sets it;
  without `href` it is ignored and reported (MNU-58).
- **Disabled.** The anchor without `href`, with `aria-disabled="true"` and the menu item role: reached by the arrow keys
  as any disabled item, no `click`, no `close`, nothing to follow (MNU-56).
- **No destination.** An `href` attribute on a checkbox item, a radio item or a submenu item is ignored and reported;
  white space is no destination, and a `javascript:` or unreadable address makes the item an action, reported; an unknown
  `target` is `same`, reported (MNU-57).
- **Forced colors.** The mode draws what is inside a link in the person's link color, whatever a stylesheet says: a link
  item's label and mark are left to it. A disabled row — a link or not — is drawn in the mode's disabled color.

**The overlay (MNU-1…5, MNU-25).** The surface is a `popover="manual"` element in the menu's shadow root, shown in the
top layer. It is placed **by script**, not with CSS anchor positioning (the spec's web note names that, with a script
fallback; one placement function everywhere keeps the flip, the shift and the room-limited height identical in every
engine): `surface.offset` from the anchor on the placement's side, flipped when
that side has less room than the surface within `surface.viewport-margin` and the other has more, shifted along the
anchor to stay inside that margin, its height limited to the room left (the items scroll), and followed while open —
by events, frame by frame only while something moves (`FollowController`, below). It fades in and grows from the edge facing the anchor over `motion.open-duration` / `-easing`, and fades out
over `motion.close-duration` / `-easing` (at once under reduced motion). Opening focuses the first enabled item; closing
returns focus to the anchor when it was inside the menu. It is not modal: no focus trap, nothing inert, no scrim. **A press
outside also reaches the element under it** (the menu listens in the capture phase and prevents nothing). Tab asks to
close and moves focus to the anchor first, so the Tab itself goes on from the anchor. A press on the anchor is the
anchor's own: it neither closes the menu nor counts as outside, so your anchor handler decides (toggle it).

**Semantics (MNU-24).** The menu host has the `menu` role while open, named by its anchor (`aria-labelledby`); on the
anchor the menu sets `aria-haspopup="menu"`, `aria-expanded` and (in the same root) `aria-controls`, giving the menu an
id if it has none. A custom element anchor with an open shadow root (an icon-only `<tanrei-button>`) gets these on the button it
draws, where they belong (`aria-controls` and the menu's name cannot cross a
shadow boundary). Items are `menuitem`, `menuitemcheckbox` and `menuitemradio` hosts (a link item's anchor is the
`menuitem`, above) with `aria-checked`,
`aria-posinset` / `aria-setsize`, named by `aria-label` (the label) and described by `aria-description` (the supporting
text, then the trailing text the item draws). An item's `shortcut` is its `aria-keyshortcuts`, in the form the keyboard
shortcut gives (`Meta+C` for the Apple keyboard, `Control+C` elsewhere, KBS-12); trailing text is never read as a
shortcut, whatever it holds — a product that typed `⌘C` there keeps the text, as a description, until it moves the keys
to `shortcut`. A group is a `group` named by its label; its
title is drawn `aria-hidden`. The dividers the menu draws between a group and what is next to it are `role="separator"`
elements in its shadow root, between one slot per child (`slotAssignment: 'manual'`). A component that holds a menu in its
shadow root may forward its own children into it: a `<slot>` child of the menu stands for what is assigned to it (the
button with menu forwards each `slot="menu"` child through a slot of its own), and the menu reads its items, groups and
dividers through it. Such a component may also place the surface against another element than the anchor (an internal
`positionAnchor`: the button with menu's whole row).

**Keyboard and pointer (MNU-6…8).** Down / Up Arrow wrap through every item, groups included; Home, End and typeahead on
the labels; disabled items are reached but do nothing. Enter activates on key-down and closes; Space activates on key-up
and keeps the menu open after a checkbox or radio item. Every item has `tabindex="-1"`: none is a Tab stop. A pointer
moving onto an item focuses it without the ring (the item marks that focus, since `:focus-visible` would follow the
keyboard's), and the arrow keys continue from there.

**The shortcut (MNU-31).** `shortcut` holds the keys in the keyboard shortcut's names (`["mod+c"]`; the attribute holds
the chords separated by spaces, `shortcut="mod+c"`). The item draws it in its trailing column with
`<tanrei-keyboard-shortcut>` (the `shortcut` part), hosted (KBS-13): size `small`, the form
`--tanrei-comp-menu-shortcut-variant` names (read from the cascade each time the menu opens or changes — `keycap` in the
default system, `plain` in m3-like, m3-expressive-like and cupertino; an empty value is `keycap`), convention `auto` (set
`data-tanrei-keyboard-convention` on the menu or any ancestor to choose it), disabled with its item; its legends and
separators in `comp.menu.trailing-text.typescale` and the trailing-text color of the item's condition and state (painted
and moved with the state motion like the trailing text), its caps the keyboard shortcut's own tokens. An item with both a
shortcut and trailing text draws the shortcut, not the text (nor reads it), and a debug build reports the item.

**Submenus (MNU-42…52).** `<tanrei-submenu>` is an item whose row ends in the icon set's `chevron_right` (the
`submenu-indicator` part, mirrored in right-to-left by the icon helper) and whose children are another level. Its
surface is a `popover="manual"` of its own in its shadow root, `role="menu"` named by its label, placed by script
`comp.menu.submenu.offset` from the inline-end edge of the surface that holds the item, its first row level with the
item's row; on the other side where this one has no room and that one has (a submenu opened from a flipped one tries
that side first), shifted and height-limited like the menu, followed as the menu is, and closed when its item is
scrolled out of sight. **Narrow windows (MNU-47):** where neither side has room for `surface.min-width` it is laid over
its parent against the window's margin, as wide as leaves `sys.target.touch` of the parent uncovered and never narrower
than the minimum; a press on what is left of the parent closes the submenu and activates nothing (a pointer that hovers
closes it by moving onto another item, MNU-48). The menu never drills in. **Keys:** the arrow to the inline end, Enter
and Space open it and focus its first enabled item; the arrow to the inline start and Escape close the level that holds
focus (and what was opened from it) and return focus to its item; Escape closes the menu only when no submenu is open;
Tab, a press outside every surface, focus leaving them all and an action at any level close everything with **one**
`close`, each submenu's `open` set to false without a `toggle`. The vertical arrows, Home, End and typeahead stay in the
surface that holds focus. The arrows along the line that do nothing are still the menu's: they never reach the page.
**Pointer:** a press opens at once (focus inside, no ring); resting on the item for
`--tanrei-comp-menu-motion-submenu-delay` opens it with focus left on the item (the delay also applies under reduced
motion); then, inside the triangle between the pointer's last position on the item and the two near corners of the
submenu's surface, the items it crosses are neither hovered nor focused, until it leaves the triangle or pauses for the
same delay. While open, the item is drawn from the `expanded` condition. At most one submenu is open in a surface (of two
you open, the later stays); `open` on an item whose own surface is not shown shows nothing until it is; a disabled
submenu item and one without items open nothing. Each surface reserves its own columns and counts its own positions, and
a group's value reaches only the radio items of its own surface. Debug builds report a third level and a submenu without
items. Not possible on the web: `aria-controls` from the item to its surface — an id cannot be referenced into the
item's own shadow root; the surface is the item's descendant in the accessibility tree instead.

**Separation (MNU-23, MNU-35, MNU-36).** Between a group and what is next to it the surface holds both forms — the
divider (`role="separator"`) and the gap — and the cascade answers which is rendered: `--_separation` on the host is the
`separation` attribute, else `--tanrei-comp-menu-separation`, read with a style container query (and, where a browser has
none, by script when the menu renders or the system is switched). Under gap the divider is not rendered at all, so no
separator is exposed, and each group — and each run of items outside a group — is a `.tile` (part `tile`) drawn as a sheet
of its own (the surface's color, corners, padding, and its elevation with the ring inside the edge), the surface itself
drawing no sheet around them; under divider the tiles are `display: contents`. Submenus inherit their menu's.

**Items (MNU-10…22, MNU-26…30, MNU-37).** Four conditions — `unselected`, `selected` (a checked checkbox or radio item),
`destructive`, `expanded` (a submenu item whose submenu is open) — each color the row and every part in every state. A
checked row is filled with the selected container color, drawn over the sheet and under the row's content, and always
carries its mark. In the default system that color is not opaque: it is a layer of the checked row's own content color
(`on-secondary-container` at 16 %), so the sheet shows through it and the fill is a step stronger than a hovered row on
any sheet, light or dark — unchecked at rest, unchecked hovered, checked, checked hovered are four colors in that order,
each at least 1.1:1 from the one before, and the content keeps 4.5:1 on all of them. m3-like and cupertino draw no fill,
by their pins. The item whose submenu is open is filled with the hover layer over the sheet — the color of a plain row
under the pointer — and keeps it while the pointer is on it; focused or pressed it takes the plain row's focused and
pressed colors, so it never looks like a checked row. The mark column opens while the surface holds a checkbox
or radio item, the leading-icon column while any item has an icon, and the trailing-icon column while any has a trailing
icon or is a submenu item; an empty column keeps its width, so labels and trailing texts align.
Each column is centered on the label's first line. A group's title is inset from the rows' edges by
`--tanrei-comp-menu-group-title-padding-inline` (at the default values, where each row's first column starts — the
check, the icon or the label — whichever columns the menu draws), and mirrors in right-to-left.

**The mark (MNU-22, MNU-30, MNU-38…41).** What marks a checkbox or radio item is, in order: the glyph its `mark-icon`
names, the glyph its group's `mark-icon` names, else the design system's choice —
`--tanrei-comp-menu-checkbox-item-mark` (`checkbox` \| `check`) and `--tanrei-comp-menu-radio-item-mark` (`radio` \|
`check`), read with a style container query (by script where a browser has none); an unknown name is the first value.
`mark-icon="check"` is the plain check under every system. The **control looks** are drawings in the `mark` part, never
controls (no role, focus or press of their own; the item stays `menuitemcheckbox` / `menuitemradio` with
`aria-checked`): a box of `control.box.size` and `control.box.shape` — outlined in the condition's `control` color, or
filled in it with the icon set's check at `control.mark.size` and `control.mark.weight` (the checkbox's own weight, CHK-12; the check of the glyph look keeps `sys.icon.weight`) in the `control-mark` color — and a ring of
`control.ring.size`, stroked at `control.ring.width`, or — checked — at `control.ring.selected-width-share` of its
radius with its inside filled at `control.fill.opacity`. Both are drawn in both conditions and change over the state
motion without moving. A **glyph mark** is drawn at `--tanrei-comp-menu-mark-size`, in the selected family and fill, in
the mark color; the check is never mirrored, a named glyph by the icon set's list; the
menu draws no mark of its own. A change of `checked` fades it in or out over the state motion (at once under reduced
motion), without moving or scaling it — also during a Space's press-hold — and while the item is not checked nothing is
drawn (the glyph is hidden, not transparent). The same holds for the check on a box and for the submenu indicator: Written as a ligature, the check is the word
`check` until the icon face can draw it: the item measures the word's width (`GlyphDrawnController`) and, while it is
wider than the glyph's box (the face is loading, failed to load, or the family is not installed), draws nothing in its place, keeps the column,
still exposes `aria-checked`, and shows the check without the fade once the face draws it. Everything else is
the list's and Button's: the state precedence, press-hold, the four `pressed-feedback` answers, ring or glow inside the
row, corner smoothing, the state motion, and the minimum target as row height. Debug builds report an item without a
label, a radio item outside a group, a group value that names none of its radio items, two radio items sharing a value,
and a group inside a group (drawn as its outer group's items, without its title or a divider). Parts: `surface`,
`scroll`, `divider` (menu and submenu item); `container`, `mark`, `leading-icon`, `label`, `supporting-text`,
`trailing-text`, `shortcut`, `trailing-icon`, `submenu-indicator` (items); `title` (group).

**Drawn in place, before the elements are defined (`@tanrei/web/menu.css`).** `inline` is for tests and documentation:
it draws the open surface where the menu stands. Its rows are child elements whose words are attributes, so until the
elements are defined nothing of it is laid out — a page that draws a menu in place moves by the menu's whole height
when the script arrives. The stylesheet gives `tanrei-menu[inline][open]:not(:defined)` the block size its surface
will have: the surface's padding, each row at the container's height or the pointer's target with a line of the label
(and a line of the supporting text where it has one), a group's title, and the divider's space or the group's gap
between a group and what is next to it, by `separation` or `comp.menu.separation`. Every in-place fixture of the spec
is as tall at definition as before it, in three engines (`menu.test.ts`). It draws nothing, and it does not know the
surface's inline size, a text that wraps onto more lines, or a submenu's own surface. A menu that opens in the top
layer has no size to hold.


## `<tanrei-menubar>`, `<tanrei-menubar-menu>` and `<tanrei-menubar-item>`

An application's commands in one persistent row of named menus (`specs/menubar.spec.json`, MBR-1…46). It is for an
application's commands and not for a site's navigation: a row of links to pages is navigation, and belongs in a
navigation landmark. A title opens a menu; beside the titles the row takes the one or two entries that act by
themselves — an action, or a link (`<tanrei-menubar-item>`, below). Moving along the bar runs nothing.

```html
<tanrei-menubar label="Application menu" overflow-label="More menus">
  <tanrei-menubar-menu label="File">
    <tanrei-menu-item label="New" shortcut="mod+n"></tanrei-menu-item>
    <tanrei-submenu label="Open recent"><tanrei-menu-item label="Report.pdf"></tanrei-menu-item></tanrei-submenu>
  </tanrei-menubar-menu>
  <tanrei-menubar-menu label="View">
    <tanrei-menu-checkbox-item label="Ruler" checked></tanrei-menu-checkbox-item>
  </tanrei-menubar-menu>
  <tanrei-menubar-menu label="Format" disabled>…</tanrei-menubar-menu>
</tanrei-menubar>
```

| `<tanrei-menubar>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the bar's accessible name ("Application menu"). Never drawn. Required: empty is reported (MBR-20). Not read from the product's words |
| `overflow-label` (`overflowLabel`) | string | `""` | the overflow item's accessible name ("More menus"); empty takes the product's word `menubarOverflowLabel` (`setWords()`); with neither the item is drawn, works, is unnamed and the missing word is reported once (MBR-22) |
| `inline` | boolean | `false` | for tests and documentation: an open menu is drawn in place below its title, as the menu's own `inline` does — no placement, open motion, focus on opening or light dismiss; reflected |

| `<tanrei-menubar-menu>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the title's text, and the name of the title and of the menu it opens. Required: empty is reported (MBR-20) |
| `open` | boolean | `false` | whether this menu is shown. The bar sets it and fires `toggle`; you may set it to open or close the menu (no `toggle` then). At most one menu of a bar is open; reflected |
| `disabled` | boolean | `false` | the menu does not open; its title stays in the row and reachable with the arrow keys; reflected |

`toggle` is a `CustomEvent<{ open: boolean }>` on the `<tanrei-menubar-menu>`, bubbling, for the person's own opening
and closing. The items' `click`, `change` and `toggle` are theirs and bubble through the bar, so one listener on the
bar takes them all (a submenu's `toggle` and a bar menu's are told apart by their target). Parts: `bar`,
`overflow-item`, `container` and `icon` on the bar; `container` and `label` on a menu; `container`, `label` and
`mark` on a bar item.

**Entries that act (`<tanrei-menubar-item>`, MBR-32 … MBR-46).** Use one sparingly: it is drawn exactly as a title
is, so only its word says that a press runs something instead of opening a menu. Not for a command that cannot be
undone (it asks nothing and has no destructive look), not for a choice that is switched (a title has no place for a
mark: put it in a menu), and not as the whole bar — a row of actions alone is a toolbar and a row of links alone is
navigation, drawn, working and reported (MBR-44).

```html
<tanrei-menubar label="Application menu" overflow-label="More">
  <tanrei-menubar-menu label="File">…</tanrei-menubar-menu>
  <tanrei-menubar-item label="Run"></tanrei-menubar-item>
  <tanrei-menubar-item><a href="/docs/">Documentation</a></tanrei-menubar-item>
  <tanrei-menubar-item target-label="opens in a new tab"><a href="https://example.com/source" target="_blank">Source</a></tanrei-menubar-item>
  <tanrei-menubar-item><a href="/history/" aria-current="page">History</a></tanrei-menubar-item>
  <tanrei-menubar-item disabled><a>Archive</a></tanrei-menubar-item>
</tanrei-menubar>
```

| `<tanrei-menubar-item>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | an action's text and name ("Run"). A link item's label is its anchor's text: the property reads and writes it, and the attribute is ignored on an element that holds an anchor. Empty is reported (MBR-44) |
| `disabled` | boolean | `false` | no activation; the entry stays in the row and reachable with the arrow keys. A disabled link item's anchor is written without `href` (MBR-39); reflected |
| `target-label` (`targetLabel`) | string | `""` | what is read after a link item's name while it opens a new context; empty takes the product's word `targetLabel`; with neither it is reported (MBR-37). Written as the anchor's `aria-description` unless you wrote one there |
| `href` | string (property only) | `""` | a link item's destination: its anchor's `href`, read and written there. No attribute: one on the element is ignored and reported, so that the link exists before the element is defined |
| `target` | `same` \| `new` (property only) | `same` | the anchor's `target`: `_blank` is `new`; anything else is `same` and is reported (MBR-44) |
| `current` | boolean (property only) | `false` | the anchor's `aria-current="page"`: the page the person is on. The bar never sets it |

- **An action** is the host: `role="menuitem"` with neither `aria-haspopup` nor `aria-expanded`, the roving
  `tabindex`, its position among the bar's entries. `click` is the host's own click — a press, Enter (on key down),
  Space (on key up, as a button's) and assistive technology produce it once; a disabled host swallows it.
- **A link item** is the element around your own anchor, which stays in the document and is the
  entry: the element writes `role="menuitem"`, the roving `tabindex`, the position and `aria-disabled` on it,
  `role="none"` on the host, and `noopener` into `rel` while `target` is `_blank`. It draws the title around the
  anchor and gives the anchor the whole of the title's hit area, so what a browser gives a link it gives anywhere on
  the title. `click` is the anchor's: `preventDefault()` cancels the navigation (a router's own link component as
  the child needs nothing more); a click with a modifier key or the middle button and Enter with a modifier key are
  the browser's; Space follows the link as Enter does (MBR-36). The current page is drawn from the `selected`
  condition — the fill and colors of the menu's selected row, at the label's own weight (MBR-38). While the bar holds
  both menus and bar items, each menu's title ends in the icon set's `expand_more` (part `indicator`, MBR-47).
- **Two orders, on purpose.** In the row the menu that is open is another entry's: it closes, with its `toggle`,
  before the bar item's `click` reaches you. Folded, the bar item is an item of the overflow item's menu: `click`
  first, while that menu is shown, then it closes. In both, focus rests where your handler put it (MBR-33, MBR-43).
- **Keys.** A bar item is a stop of the bar like a title. Down Arrow and Up Arrow on it are taken and do nothing
  (MBR-34). From a menu the inline arrow keys land on it: the menu closes with one `toggle`, nothing opens or runs,
  and the bar keeps no memory that a menu was open (MBR-40). A pointer on it while a menu is open only hovers it
  (MBR-41).
- **Folded** it is assigned to a slot of the overflow `<tanrei-menu>` and draws a `<tanrei-menu-item>` in its own
  shadow root — a link item with the same `href`, `target`, words and current state. A plain activation of that row
  is one `click` on your own element: the host's for an action; for a link item the row's own click goes no further
  and follows nothing, and the element calls your anchor's `click()`, which you hear once, may cancel, and which
  navigates. A modified or a middle click is left to the row's own anchor, and leaves the menu open.
- **Without script (`@tanrei/web/menubar.css`, MBR-45).** `tanrei-menubar:not(:defined)` is a row of the link
  items' anchors alone, in a title's text style, height and paddings, each a plain link reached with Tab; menus and
  actions show nothing there. When the bar runs it takes the same anchor nodes where they stand.
- **Your own rules for `a` reach a link item's anchor.** The element styles it with `::slotted(a)`, which a rule of
  the page for anchors overrides (color, underline, outline), as it overrides any slotted rule. Prose leaves it
  alone (it is inside a Tanrei element); a global `a { … }` of yours does not.
- **Forced colors (MBR-46).** An action is `ButtonText`, a link item's label and mark `LinkText`, a disabled bar
  item `GrayText`.

**The form.** Shadow roots. The bar's host is `role="menubar"`; each `<tanrei-menubar-menu>` host is its
title — `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, `aria-disabled`, its position, and the roving
`tabindex` — and holds the menu's own item elements as its children, exactly as `<tanrei-menu>` does. It forwards
them, each in a slot of its own and none of them moved, into a `<tanrei-menu>` in its shadow root: a manual popover
in the top layer, placed below the title's container with their start edges together, named by `aria-label` from the
title's label. The bar and the Menu speak through an internal channel that is no part of either element's public
surface (the Menu hands back the two inline arrow keys it has no use for, comes and goes without its motion when it
replaces a neighbour, and does not count the fold's level in the depth it reports).

**Keys (MBR-9, MBR-12 … MBR-15).** The WAI-ARIA menubar pattern, whole. The bar is one Tab stop: the entry focused
or activated last or whose menu was opened last, else the first. On a title the inline arrow keys (mirrored in right-to-left),
Home, End and one typed character move along the titles — disabled ones included — and open nothing; Enter, Space
and Down Arrow open the menu with focus on its first enabled item, Up Arrow on its last. In a menu the inline-end key
opens a submenu item's submenu and, on any other item at any depth, goes on to the next enabled title's menu; the
inline-start key closes a submenu and, in the menu's own surface, goes to the previous one. Escape closes one level
and then returns focus to the title; Tab closes the menu and leaves the bar. With no menu open the bar does not
handle Escape. It binds no shortcut and defines no access key (MBR-16).

**The pointer (MBR-10, MBR-11).** A press opens; a press on the open title closes. While a menu is open, a mouse or
a pen that enters another enabled title opens that one at once, with neither menu's motion (MBR-29). After an item's
activation the menu closes once the item's own `click` has gone through the page, and focus returns to the title
unless your handler moved it (MBR-15).

**The fold (MBR-21, MBR-22).** What fits is measured — a `ResizeObserver` on the row, on a hidden copy of every
title and of the overflow item, and on the gap, so that deciding it asks for no layout of its own — and decided again
when the bar's size, its menus, a label, the text size or the direction changes. Menus fold whole from the end into
the overflow item (`more_horiz`), whose `<tanrei-menu>` is in the bar's shadow root. A folded
`<tanrei-menubar-menu>` is assigned to a slot of that menu and draws itself there as a `<tanrei-submenu>` in its own
shadow root, with its children forwarded into it: the product's elements stay where the product wrote them, and
`open` and `toggle` mean what they mean in the row. In a place sized by its content the bar is as long as all its
titles (the copies give it that size), and at least as long as its longest one.

**Targets (MBR-17).** A title keeps at least the minimum target's length in the row (`sys.target.pointer`, and
`sys.target.touch` for a coarse pointer), its container centred in it; its hit area is as tall as the target and
reaches half of `comp.menubar.bar.gap` toward each neighbour, so two hit areas meet in the middle of the gap.

**What a browser cannot draw, and other limits.**
- Without script, and before the elements are defined, the titles and the actions are not drawn — their words are
  attributes — and only the link items are, with `menubar.css`. Reserve the bar's height so the page does not move:
  `tanrei-menubar:not(:defined) { display: block; min-block-size: calc(var(--tanrei-comp-menubar-container-height) + 2 * var(--tanrei-comp-menubar-bar-padding-block)); }`.
- The fold is measured from copies drawn from the tokens. A title restyled through `::part()` so that its width
  changes is not measured as restyled.
- A listener in the capture phase above a folded link item hears two clicks for one activation: the row's own, which
  the element stops inside itself, and the one on your anchor. A listener in the bubble phase — on the anchor, the
  bar item, the bar or the document — hears one.
- Following a link item to a place in the same page moves focus as the browser does for any such link: out of the bar.
- A folded menu that holds no item is a submenu item that opens nothing, as the Menu says of an empty submenu
  (MNU-52), where a menu in the row opens an empty surface.
- `:focus-visible`, corner smoothing and the focus style fall back as every Tanrei control's do: a browser without
  `corner-shape` draws circular corners, and one without style container queries reads the focus style when focus
  arrives (`data-focus-style`).

**Debug reports (MBR-10, MBR-20, MBR-22).** An empty `label` on the bar or on a menu; a bar with no menu; a menu
with no item; a child that is not a `<tanrei-menubar-menu>`; `open` set on several menus at once; and the missing
word for the overflow item, once per page.

## `<tanrei-tabs>`

Switches between views of one subject with a row of labelled tabs on a track, above the view it shows
(`specs/tabs.spec.json`, TAB-1…30). The selected tab is marked by the active indicator alone — the thumb on the track,
which slides to a newly selected tab and follows a finger, a pen or a mouse dragged across the row. The default system
draws no underline and no divider (both are drawn, transparent); m3-like colors them and makes the track and the thumb
transparent, which is Material's row. The row shows its own panels, or belongs to a [`<tanrei-tab-view>`](#tanrei-tab-view) — drawn by it as its
own row, or linked to it — whose panels take their place.

```html
<tanrei-tabs value="overview" label="Project">
  <tanrei-tab value="overview" label="Overview" icon="dashboard"></tanrei-tab>
  <tanrei-tab value="activity" label="Activity" icon="history"></tanrei-tab>
  <tanrei-tab value="billing" label="Billing" icon="payments" disabled></tanrei-tab>
  <tanrei-tab-panel value="overview">…</tanrei-tab-panel>
  <tanrei-tab-panel value="activity">…</tanrei-tab-panel>
</tanrei-tabs>
<script type="module">
  document.querySelector('tanrei-tabs').addEventListener('change', (e) => console.log(e.detail.value));
</script>
```

| `<tanrei-tabs>` | Type | Default | |
|---|---|---|---|
| `variant` | `primary` \| `secondary` \| `tonal` (or a value the system adds; `TanreiTabsVariantRegistry`) | `primary` | primary switches a screen's main views (icon above the label); secondary switches within one (icon before the label); tonal is the quiet row of a sample or a setting — its indicator a translucent layer of the selected content color under a darker label, its structure secondary's (TAB-50). The track and the indicator's shape and width are the same in both; their indicator colors differ (`primary` and `secondary` in the default system), and the underline spans the content (primary) or the tab (secondary). Unknown: drawn as `primary`, reported (TAB-7); reflected |
| `fullWidth` / `full-width` | boolean | `false` | false (hug) sizes each tab to its content plus `container.padding-inline`, never truncating its label, and scrolls the tabs sideways inside the track when they do not fit; the indicator is then as wide as the selected tab's content plus its padding, and a circle where that content is not wider than it is tall. True (fill) shares the row's width, less the track's padding, equally, each tab at least the minimum target, and truncates a label that does not fit its share with an ellipsis (shown whole in a tooltip, TAB-25); the indicator is then as wide as the tab; reflected |
| `size` | `small` \| `medium` (or a value the system adds; `TanreiTabsSizeRegistry`) | `medium` | the row's height (32 / 48) with its size's tab padding, indicator margins and glyph (TAB-44); a small row puts the icon before the label in every variant. Unknown: drawn as `medium`, reported (TAB-7); reflected |
| `track` | boolean \| `null` | `null` | whether the track is filled (TAB-49): the attribute is absent for null (the system's choice, `--tanrei-comp-tabs-track-visible`), bare for true and `track="false"` for false. Off fills nothing and changes nothing else |
| `transition` | `auto` \| `slide` \| `none` | `auto` | how a new selection is drawn (TAB-43): `none` whole in one frame; `auto` — and any other value, reported — takes `--tanrei-comp-tabs-motion-transition`; reflected |
| `value` | string \| `null` | `null` | the selected tab's value, as a `<select>`'s; `null` selects the first enabled tab. A value naming no tab selects none and shows no panel (reported, TAB-11). Not reflected |
| `label` | string | `""` | the tab list's accessible name |
| `indicatorOffset` | number | `0` | property only, no attribute (TAB-26): draws the indicator and the underline between the selected tab (0) and the next (1) or previous (−1) enabled tab, each edge interpolated, clamped to 1, in the frame it is set and without a slide; on the selected tab where there is no enabled tab in that direction. A linked Tab view writes it while it is swiped; leave it at 0 otherwise. While it is not 0 the row follows no drag of its own. A drag across the row does not pass through this property |
| `group` | string | `""` | names a choice this row shares with every other `<tanrei-tabs>` of the document that names the same group, compared exactly — placed by the product or drawn by a `<tanrei-tab-view>`, in shadow trees too (TAB-36). Empty: the row's choice is its own. Not reflected |
| `rememberAs` / `remember-as` | string | `""` | the key of the origin's `localStorage` under which a person's choice on this row is kept, and from which it is restored before the row is first drawn (TAB-39). Used exactly as given; only the tab's value is stored. Empty: no storage is read or written. Not reflected |

| `<tanrei-tab>` | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | identifies the tab; the first tab with a value is the one it selects (empty and repeated values are reported, TAB-11) |
| `label` | string | `""` | the text and the accessible name, also when hidden (an empty one is reported, TAB-22) |
| `icon` | string | `""` | a glyph name of the system's icon set, outlined, and filled while selected |
| `labelHidden` / `label-hidden` | boolean | `false` | draws the icon alone; without an icon the label is drawn anyway (reported, TAB-19) |
| `disabled` | boolean | `false` | never selected, skipped by the arrow keys, never the Tab stop, not focusable by a press |

`<tanrei-tab-panel value="…">` holds a view; the row shows the panel whose `value` is the selected tab's. Where the row
belongs to a `<tanrei-tab-view>` (its own row, or a linked one), each tab controls the view's panel of its value instead,
and the row's own panels stay hidden (TAB-13; the view reports them). A panel's `label`, `icon`, `label-hidden` and
`disabled` are read only by a Tab view that draws its own row; the tabs ignore them.

| Event | When |
|---|---|
| `change` (on the row) | `CustomEvent<{ value }>`, bubbling: the user selected another tab — pointer, Enter (key-down), Space (key-up), an arrow key, Home or End, `tab.click()`, or a drag across the row released on another tab (once, at the release; never for the tabs the indicator passes). The row already holds the new `value`; setting it from script fires nothing, and the selected tab emits nothing |

**Semantics (TAB-13).** The row draws a `role="tablist"` element in its shadow root, named by `label`, which holds only
the tabs (their slot); the panels are slotted after it, so the list owns nothing but tabs. Each tab's host is a `tab` with
`aria-selected`, `aria-posinset` / `aria-setsize`, `aria-label` (its label, drawn or not), `aria-disabled` and
`aria-controls` (its panel). Each panel's host is a `tabpanel` named by its tab (`aria-labelledby`); the others are
`hidden`. A panel with nothing focusable gets `tabindex="0"`. Tabs and panels without an id get one. The icon, the
container, the indicator with its covered copy of the label and icon, the focus ring's box, the underline and the divider
are `aria-hidden`, and the track is the scroller's own background, so each label is exposed once.

**A truncated label (TAB-25).** While a tab's drawn label is cut short (`text-overflow: ellipsis`, measured as its
`scrollWidth` exceeding its box, again whenever the label's box resizes), the tab holds a plain `<tanrei-tooltip>` over
its whole box with the whole label: it opens by itself on hover (after the tooltip's show delay) and on a touch long-press,
and the tab opens it on keyboard focus. It is `aria-hidden` and `no-describe` — the label is already the tab's name, so it
adds no `aria-describedby` or description. A label that fits has no tooltip.

**Keyboard (TAB-12).** One Tab stop: the selected tab, or the first enabled tab while the selected one is disabled or
there is none. Right / Left Arrow move to the next / previous enabled tab, wrapping (mirrored in right-to-left), Home and
End to the first and last, and each move selects the tab (automatic activation). Tab goes on into the panel.

**The track (TAB-27).** The scroller is the track (parts `scroller` and `track`, one element): `<variant>.track.color`,
corners `track.shape` (with corner smoothing, TAB-10), no outline, as tall as the row. In a row that hugs it is as wide as
its tabs plus `track.padding` at each end (`fit-content`, never wider than the row), so it ends with its last tab and
starts at the start edge (the right one in RTL); in a row that fills it is the row. It is the same whichever tab is
selected and whatever state a tab is in. When the tabs do not fit it stays still, the tabs scroll inside it, and its
shape clips them. The divider is outside it and spans the whole row.

**Layout (TAB-14, TAB-18, TAB-20, TAB-21, TAB-34, TAB-35).** The tabs are placed by the indicator: the first tab's
starts `track.padding` in from the track's start and the last one's ends the same distance before its end, so the
thumb's end and the track's are concentric at every row height. A tab whose indicator is a circle (an icon alone, one
character) takes no inline padding: it is as wide as the larger of that circle and the minimum target (44 / 48 in the
default system, not its content plus the padding). Where such a tab is the first or the last, it reaches into the
track's inset by half of what it is wider than its circle and no further than the track's edge (the row's padding at
that end is less by that much), and what is left of the inset beside an end tab is that tab's hit area. A row of two
icon-only tabs is 92 × 48 under a fine pointer and 96 × 48 under touch, two 40 circles concentric with the ends. A tab lays its content out on one line (a primary tab stacks its icon above a drawn label, `gap`
apart; a secondary one puts it before the label, centred on its line), centred. Every tab is as tall as the row: at least
`container.height` (`container.height-with-icon` where a primary tab stacks an icon), at least `sys.target.pointer`
(`touch` for a coarse pointer), and tall enough to keep `active-indicator.padding-block` between the tallest content and
the indicator's edge, plus `track.padding` (or the underline's thickness, if that is more) above and below. A tab is at
least the minimum target wide and never narrower than its indicator is tall. A label never wraps: a tab that hugs grows,
a tab that fills truncates it at its end (the left one in RTL) with an ellipsis, and the icon never shrinks. The tabs
scroll sideways when they do not fit and the scroll bar is hidden (a wheel, a trackpad, a drag from a tab that is not
selected, or the arrow keys scroll them); a tab brought into view keeps `track.padding` beside it.
`active-indicator.height` is read by nothing.

**The indicator's box (TAB-16, TAB-18).** Each tab has one box, centred in it: `track.padding` in from the row's top and
bottom, so the same height on every tab (40 in a 48 row, 56 with stacked icons, in the default system). In a row that hugs
it is as wide as the tab's content plus `active-indicator.padding-inline` on each side (the tab itself, by the default
alias), never wider than the tab and never narrower than it is tall — and exactly as wide as it is tall where the
content is not wider than it is tall (an icon alone, one full-width character, a one-letter label): a circle. In a row
that fills it is the tab's whole share. The tab measures it (the content's box against its line's height, again whenever
the content, the row's height or the padding changes) and writes the width as a private custom property; the whole tab
is drawn until then. That box is three things:

- **the active indicator** on the selected tab, its corners `active-indicator.shape`;
- **the container** (part `container`): hover, focus and press are drawn in it on every tab, selected or not, its corners
  `container.shape`, above the track and under the indicator, never on the tab's rectangle. The whole tab still answers
  the pointer (the container takes no pointer events), and a ripple is drawn in the container and clipped to it wherever
  on the tab the press lands (`PressController`'s `rippleHost`). On the selected tab the indicator covers it exactly, so
  hover and press are not seen there;
- **the focus ring's box**: the ring or the glow surrounds it in its shape, `sys.focus.offset` outside it, above the
  neighbouring tabs and the indicator, and held inside the track: where `track.padding` is less than the ring reaches it
  is drawn further in by the difference (`focusRing(on, { within })`). In the default system the reach is the padding,
  so the ring meets the track's edge; in m3-like the padding is nothing, so the ring is wholly inside the tab, square.

**The indicator and the underline (TAB-16, TAB-17, TAB-24).** The underline spans the content (primary) or the tab
(secondary) on the row's bottom edge, above the divider, `underline.thickness` thick with the corners away from the
divider rounded by `underline.shape`. Each tab draws its own piece of both: a covered layer (part `active-indicator`) in
the indicator's color, holding a second copy of the tab's icon and label in its look's covered colors, clipped with
`clip-path: inset(… round …)` to the indicator's box in the tab's coordinates; the same rounded box is cut out of the
plain content (`clip-path: path(evenodd, …)`), so under a translucent indicator (m3-like's transparent one, the faded
disabled one) nothing is drawn twice. A tab the indicator does not reach hides its copy. The indicator's color is the
selected tab's wherever it is drawn: that tab's state, and on the other tabs its resting (or, while it is disabled, its
disabled) color. The clip is circular: corner smoothing does not reach it (`tabs-indicator-clip-no-corner-smoothing`).

**Motion (TAB-15, TAB-17, TAB-23, TAB-24).** When the selection changes, the indicator and the underline move as one box,
measured on the page (so the slide mirrors in RTL), from the old tab — or from where a running slide, an offset or a
released drag has left them — to the new one over `motion.indicator-duration` / `-easing`. The browser runs the slide:
the row writes once, where everything rests, and hands every tab its pieces — the covered layer's clip, the cut in the
plain content, the underline's clip — as animations between the slide's stops, all named `tanrei-tabs-slide`, on the
document's timeline from the same moment as the row's own keyframe-less `KeyframeEffect` on its strip, which draws
nothing and is the slide's clock. Each clip is linear in the box's place, so the indicator and each inversion move in the
same frame; the newly selected label is wholly covered as it lands. No script runs while it slides: where the indicator
has got to is worked out from the clock when something asks — a choice made meanwhile, a drag, an offset — and a row
that changes size under a slide gives the pieces their new places on the same clock. (Holding a slide in a browser's
animation inspector means holding all of them: the clock alone moves nothing.) Every frame is a look a drag draws: from a tab at rest the indicator passes over the enabled
tabs between the two as a drag does, taking each one's box on the way (a circle widening into a capsule), so a slide's
frame and a drag held at the same place are the same thing. The first draw, and a change of size or place without a new
selection (a font arriving, the text size, the row resizing, a `ResizeObserver` on the strip and each tab), put them in
place at once; the panel changes at once, and the colors change over the state motion. The row brings the selected tab
into view at once when it first appears or is resized, and over the indicator's motion when a tab is selected or reached
with the arrow keys (the scroll follows the token's curve, read the same way). Focus moved by the Tab key is the
browser's: it scrolls a focused element into view at once. All of it is at once under `prefers-reduced-motion: reduce`.

**The drag (TAB-28…30).** Pointer Events, with touch, a pen and a mouse. A press on the row is watched on the window; once
it has moved 8 px (the sheets' `SheetDrag`) further sideways than up or down, the row takes it: `setPointerCapture`, the
pressed tab's pressed state ends as any press does, and the click that follows is swallowed. One that went up or down
first is the page's. From then on the indicator and the underline are drawn where the pointer is: on an enabled tab at
its centre, halfway between two neighbouring enabled tabs where they meet (the middle of any disabled tabs between them),
each edge interpolated in between, and on the first or last enabled tab beyond its centre. The same clips a slide writes
are written in each move, so the place, the width (a circle widening into a capsule) and each label's and icon's covered
color change continuously, with no threshold. Taken with the pointer away from the indicator, it comes to the pointer over
`motion.state-duration` / `-easing` (`tanrei-tabs-catch-up`), following the pointer meanwhile. Nothing else changes
while it lasts: not `value`, `aria-selected`, the Tab stop, focus or the panel.

- **Release.** The tab the indicator is nearer to of the two it lies between (the later one from halfway on), or the one a
  fling is toward (0.5 px/ms, over the last 80 ms of the events' own time stamps). Another tab than the selected one: the
  row sets `value`, fires `change` once and the indicator settles from where it is over the indicator's motion; where a
  tab of the row had the focus, it moves to the chosen tab. The selected tab: the indicator returns, nothing is fired.
- **Cancel.** `pointercancel`, `lostpointercapture`, Escape (heard on the window while the drag lasts, and not passed
  on), `value` set meanwhile, `indicatorOffset` set meanwhile, or a tab the indicator lies between removed or disabled:
  the indicator returns to the selected tab over the indicator's motion and nothing is fired. The pointer, still down,
  is ignored until it is released.
- **A row whose tabs scroll.** Only a drag that starts on the selected tab is taken; the row scrolls the tabs to keep the
  indicator in view (at most 0.6 px/ms; the spec names no speed). Any other sideways drag is the browser's scroll.
- **`touch-action`.** `pan-y pinch-zoom` on the track of a row that fits, and on the selected tab always; a track whose
  tabs scroll has `auto`. Vertical drags and zoom stay the browser's.
- **Reduced motion.** The indicator still follows the pointer; it is taken without the catch-up and lands at once.
- **No drag** while `indicatorOffset` is not 0, while no tab is selected, or with a secondary mouse button. A wheel or a
  trackpad only scrolls.

**Between two tabs (TAB-26).** While `indicatorOffset` is not 0 the row draws the indicator and the underline at the
linear interpolation between the selected tab's box and its enabled neighbour's (disabled tabs are skipped), every tab's
piece and covered copy included, in the frame the property is set; it stops a running slide and ends a drag. A selection
made while the offset is not 0 (a Tab view's swipe committing: the next tab selected and the offset −(1 − p) in one frame)
is placed at once, and a slide that later starts from a box an offset left begins where the indicator is drawn, not on
the old tab.

**A shared choice (TAB-36…41, TBV-20, TBV-21).** Rows that name the same `group` show the same choice, matched by the
tab's `value` (never its label):

```html
<tanrei-tab-view group="platform" remember-as="docs-platform" variant="secondary" label="Platform">
  <tanrei-tab-panel value="web" label="Web">…</tanrei-tab-panel>
  <tanrei-tab-panel value="flutter" label="Flutter">…</tanrei-tab-panel>
</tanrei-tab-view>
<!-- further down, and on every other page -->
<tanrei-tab-view group="platform" remember-as="docs-platform" variant="secondary" label="Platform">…</tanrei-tab-view>
<script type="module">
  // One listener hears each choice once: only the row the person used fires `change`.
  document.addEventListener('change', (e) => e.target.group === 'platform' && console.log(e.detail.value));
</script>
```

- **Who follows.** A member with an enabled tab of the choice's value has it selected; one without keeps its own and
  follows again as soon as the choice is one it has (or it gains the tab, has it enabled, or is given the group). A group
  holds no choice until a person selects a tab on a member, the product sets `value` on a member after it is drawn, or a
  stored value is restored; the `value` a row is first drawn with is its own. The groups and their members are kept by
  the module in one registry for the document (`src/primitives/shared-choice.ts`), never in the DOM; a member that
  leaves the document leaves its group, and the group keeps its choice while the document lasts.
- **What moves.** Only the row the person used slides (and, in a Tab view, switches) and fires `change`. Every other
  member is written in the same task — `value`, `aria-selected`, its panels' `hidden` — with no slide, no color
  transition (`data-still` on the two tabs that change, for the frame that draws it), no switch, no focus and no
  scrolling outside its own track. The followers are measured together and then written together, and one
  `ResizeObserver` serves every row, so sixty rows that follow cost three or four layouts, not one each.
- **The page does not jump (TAB-40, TBV-21).** The row a person used (the view's container for a committed swipe) is
  measured before the members are written and once after, and its scrolling ancestors — the nearest first, then the
  document's — are moved by what is left of the difference with `behavior: 'instant'`. A browser that anchors scrolling
  has by then moved some or all of the way; where scroll positions are whole pixels (WebKit) the row ends within half a
  pixel. Nothing is corrected for a choice the product set or one restored.
- **Remembering (TAB-39).** `remember-as` is a key of the origin's `localStorage`, used exactly as given: nothing is
  prefixed, so the product can read it itself (a script in the page's head), name it in its privacy notice and clear
  it. It is read once for a key in the life of a document, synchronously, before the row's first render, and written
  once for a choice a person makes — by the row itself or, through its group, any member that names a key and whose tab
  changed. A stored value is only compared with the tabs' values. A storage that is missing, blocked or full, or that
  throws, is the same as nothing stored: the choice then lasts as long as the document, and nothing is thrown or logged.
  `localStorage` is shared by everything on the origin, so the key is the product's to namespace. Whether a remembered
  preference needs consent is the product's judgement, which is why there is no default key.
- **Before the elements are defined** the page shows what its markup and stylesheet say: a row cannot restore a choice
  it has not been upgraded to read. A page that is rendered on a server guards that as it guards any element not yet
  defined (the docs site hides every panel but the first until `tanrei-tab-view` is defined).

**States (TAB-3…10).** Two looks per variant, the plain one and `selected.`, each colors the container, label, icon,
covered label and icon, active indicator and underline in every state; the row declares its variant's values on its
slotted tabs (`::slotted(tanrei-tab)`), so a tab takes the row's variant, and its track color on itself. Everything else
is Button's: the state precedence, press-hold, the four `pressed-feedback` answers (the ripple grows inside the
container, under the indicator), ring or glow around the container and held inside the track, corner smoothing on the
container, the ring and the track (fully rounded in the default system, which no amount changes), and the state motion.
Parts: `tablist`, `scroller` / `track`, `divider` (row); `container`, `icon`, `label`, `active-indicator`, `underline`
(tab).

**Variants, sizes, the track and the transition (TAB-5, TAB-42…45, TAB-49, TAB-50).** The row declares
each size's five tokens on its slotted tabs as private properties (`--_size-height`, `-padding-inline`,
`-indicator-padding-inline`, `-indicator-padding-block`, `-icon`), as it declares a variant's parts; a size or a variant
a layer adds gets its block on demand, falling back to the default's tokens. A tab stacks its icon above its label only
in a variant with primary's structure at a size other than `small`. The track's choice and the transition's are each
one private property on the host (`--_tabs-track`, `--_tabs-transition`): the component token's name, or the
attribute's. The track is filled by a style query on `on` — `off`, the first value, is what an unknown name draws — and
under `none` a second query gives the two properties the row reads its motions through (the scroller's
`animation-duration`, the strip's `transition-duration`) no time, which is what reduced motion gives them: the slide,
the reveal, the catch-up of a drag and its settle all take the path they take there, while a tab's own state
transitions stay. The two tabs of a new selection are marked for the frame that draws it (`data-still`, as a row that
follows its group marks them), so their colors do not fade. Where the browser answers no style query the row reads both
names from the cascade when it is drawn and at every selection and writes them on its `.row` (`data-track`,
`data-transition`) for the same rules; a system switched on an ancestor is then seen at the row's next update or
selection, not at once.

**The hit area of a row lower than the target (TAB-5).** A tab is at least the minimum target wide in layout. Its height
is not raised to the target: a small row stays 32 high. The tabs scroll inside a box that clips them, so no part of a
tab can reach beyond the row, and an element laid beside the row would lie over the controls next to it — so there is no
hit-area element. One `click` listener on the window, shared by every row of the page, hears a press that no tab took
and that nothing prevented: where it lies in line with an enabled tab and no further above the row's top edge or below
its bottom edge than half of what the row lacks to the target (`sys.target.touch` for touch and a pen, and where the
input is not told on a device whose pointer is coarse; `sys.target.pointer` for a mouse), the row selects that tab and
fires `change`, as a press on the tab does. It yields to whatever answers a press itself (`answersPress()`: a control, a
link, a field, a label, a Tab stop, anything under the pointer cursor), to a press that ends a selection of text, to a
surface in the top layer that the row is not inside, and to a row that is covered where the press is nearest to it.
What this leaves out: the band shows no hover and no press feedback, a drag cannot start in it, and the tab is not
focused by the press.

**Presets.** A tonal row is left out of m3-like and m3-expressive-like (its `components.variants`, reported in debug builds); drawn
there it has the default's layer on the preset's trackless, square row. m3-like and m3-expressive-like draw what they drew before this revision, by value, with one recorded
difference (mimicry gap `tabs-state-layer-follows-indicator`): in a row that hugs, a tab whose content is not wider than
it is tall (an icon alone, a one-letter label) draws its state layer and focus ring as wide as the row is tall, and is
itself never narrower than that (a one-letter tab is 48 wide where it was 44). cupertino inherits the default's track
and thumb.

## `<tanrei-tab-view>`

Shows the view of the selected tab under its own row of tabs, or linked to a row of `<tanrei-tabs>` placed elsewhere,
and lets a person swipe from view to view with the tabs' indicator following the finger (`specs/tab-view.spec.json`,
TBV-1…23). `size` and `track` are the row's, forwarded as `variant` is (TBV-16). `transition` (`auto` \| `slide` \|
`fade` \| `none`, TBV-22) is the form of a switch: `auto` reads `--tanrei-comp-tab-view-motion-transition` from the
cascade when a switch or a swipe begins; `fade` takes the distance, its share, the blur and the opacity's end as 0 and
the fade's motion (the probe's inert `animation-duration`); `none` starts no switch at all — the path of a choice that
came from the group — and paints nothing during a swipe. While the form is none the view writes `transition="none"` on
the row it draws (TBV-23), when the view names the form itself and otherwise when something begins on the view (a
press, a key on the row, `value` set by the product), and `auto` again when it is not; a linked row is never written.

```html
<!-- Its own row (the default): each panel declares its tab. -->
<tanrei-tab-view label="Project">
  <tanrei-tab-panel value="overview" label="Overview" icon="dashboard">…</tanrei-tab-panel>
  <tanrei-tab-panel value="activity" label="Activity" icon="history">…</tanrei-tab-panel>
  <tanrei-tab-panel value="billing" label="Billing" icon="payments" disabled>…</tanrei-tab-panel>
</tanrei-tab-view>

<!-- Linked, for tabs placed elsewhere (an app bar, a sticky header): the view draws no row. -->
<tanrei-tabs id="project-tabs" label="Project">
  <tanrei-tab value="overview" label="Overview"></tanrei-tab>
  <tanrei-tab value="activity" label="Activity"></tanrei-tab>
</tanrei-tabs>
<tanrei-tab-view tabs="project-tabs">
  <tanrei-tab-panel value="overview">…</tanrei-tab-panel>
  <tanrei-tab-panel value="activity">…</tanrei-tab-panel>
</tanrei-tab-view>
<script type="module">
  // One change per selection. Own row: the view's, for a tab and for a swipe. Linked: the tabs' for a tab, the view's
  // for a swipe.
  document.addEventListener('change', (e) => console.log(e.target.localName, e.detail.value));
</script>
```

| `<tanrei-tab-view>` | Type | Default | |
|---|---|---|---|
| `value` | string \| `null` | `null` | the shown panel's value, kept equal to its tabs' `value` (its own row's or the linked row's) — setting either sets the other, without an event; `null` shows the panel of the tab the tabs select while theirs is `null` (the first enabled tab). Not reflected |
| `variant` | `primary` \| `secondary` (or a value the system adds to the tabs) | `primary` | its own row's variant, with the tabs' meaning (the tabs' axis, `comp.tabs.variant`); unused while linked. Reflected |
| `fullWidth` / `full-width` | boolean | `false` | its own row's layout: hug (false) or fill (true), with the tabs' meaning; unused while linked. The view itself is always as wide as its parent. Reflected |
| `label` | string | `""` | its own row's accessible name (the tab list's); unused while linked, where the linked row's own `label` names it |
| `tabs` | string | `""` | empty: the view draws its own row. Set: the id of the `<tanrei-tabs>` in the same tree (document or shadow root) it is linked to, as `popovertarget` is; the view draws no row, even while that element is missing. Tabs added after the view are found when they arrive |
| `tabsElement` | `TanreiTabs \| null` | — | property only: links that element itself (it wins over `tabs`, and the view draws no row); `null` gives the view its own row back while `tabs` is empty. Reads back the tabs the view is linked to — its own row included |
| `noSwipe` / `no-swipe` | boolean | `false` | the spec's `swipeable`, inverted (an HTML boolean defaults to false): no drag is taken and the browser keeps every touch gesture; the tabs switch the panels. Reflected |
| `group` | string | `""` | its own row's group, with the tabs' meaning: views and rows that name it show one choice, and a view that follows shows its panel at once, without a switch, and fires nothing (TBV-20). Unused while linked (reported), where the linked row names its own |
| `rememberAs` / `remember-as` | string | `""` | its own row's key, with the tabs' meaning: a person's choice is stored under it and restored before the view is first drawn. Unused while linked (reported) |

`<tanrei-tab-panel>` children are the panels (the same element as the tabs' own panels), one per tab. For the view's own
row each panel also carries its tab:

| `<tanrei-tab-panel>` | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | the value of the tab that shows the panel; unique within the view, required |
| `label` | string | `""` | its tab's text, and the accessible name of the tab and (through it) of the panel; required for the own row, even when `label-hidden` is set |
| `icon` | string | `""` | a glyph name of the system's icon set for its tab; give every panel one, or none |
| `labelHidden` / `label-hidden` | boolean | `false` | its tab shows the icon alone, `label` still its name. Reflected |
| `disabled` | boolean | `false` | its tab cannot be selected, and a swipe skips the panel. Reflected |

A linked view, and a `<tanrei-tabs>`, ignore a panel's `label`, `icon`, `label-hidden` and `disabled`: the linked row's
own tabs say what they show.

| Event | When |
|---|---|
| `change` (on the view) | `CustomEvent<{ value }>`, bubbling: the user selected another panel. With its own row: a tab tapped or clicked, reached with an arrow key, Home or End, or a swipe — every selection, once (TBV-18). Linked: a swipe only; a selection on the linked tabs is announced by their own `change`. The view's and the tabs' `value` already hold it. A value set from script fires nothing |

**Its own row (TBV-16, TBV-18).** While `tabs` is empty (and `tabsElement` is not set), the view creates a `<tanrei-tabs>`
of its own and places it as its first light-DOM child, with `slot="tabs"` — a slot above the container in its shadow
root. It is a real Tabs, drawn from the tabs' tokens with every TAB behaviour. It holds one `<tanrei-tab>` per panel
shown (TBV-15: the first panel with each non-empty value), in the panels' order, whose `value`, `label`, `icon`,
`labelHidden` and `disabled` are the panel's; its `variant`, `fullWidth` and `label` are the view's. The view keeps a
panel's tab for as long as the panel is there and changes it in place, so a change of a panel's props, or panels added,
removed or reordered, reach the row within the same frame (Lit updates, before the next paint) without recreating any
panel. The row is in the light DOM, not the shadow root, so that each tab's `aria-controls` and each panel's
`aria-labelledby` point within one tree. The product does not edit it. The view is linked to it as to any row. A
selection on it does not fire the row's `change` at all — not even to a capturing listener — and the view fires its own,
after it has set its `value`.

**The link (TBV-1, TBV-2, TBV-14, TBV-17).** While `tabs` or `tabsElement` is set, the view is linked to that row and
draws none of its own; setting both is not an error: the link wins, and a debug build reports a `variant`, `full-width`
or `label` left off their defaults. On linking — to a row elsewhere, or to its own row again — a non-null `value` of the
view is given to the tabs, else the view takes theirs, and the selected panel is shown at once without a switch; the own
row is removed from the view, or placed again, in the same update. The view calls into the row (`linkView()`): the tabs
then control the view's panels (`aria-controls`), hide their own, and tell the view when their selection changes; a
selection on the tabs, or by the product on either, runs a switch. While `tabs` names a row that is not in the tree, the
view draws no row, shows the panel whose `value` is its own (the first panel while `null`), takes no drag, gives no
panel the `tabpanel` role, and reports it in a debug build.

**The switch (TBV-5, TBV-6).** The old panel moves p × D toward the edge it leaves by (the start edge when the new tab
comes after it among the tabs), with D = `transition.distance` + `transition.distance-fraction` × the view's width, fades
to 1 − p × (1 − `transition.opacity`) and blurs by p × `transition.blur`; the new one arrives from the other side, over
it (`z-index`). The travel is `translate`, the fade `opacity` and the blur `filter: blur()`, written on the two panels
only while a switch runs and removed at rest. A switch from a selection runs p from 0 to 1 over `motion.switch-duration`
/ `-easing`; its easing's progress is read from a keyframe-less `KeyframeEffect` on the container (the view's animation
`tanrei-tab-view-switch`), so the travel follows the curve's overshoot while the fade and the blur clamp. A new
selection, or a drag, ends a running switch at once as if it had finished; the first appearance, and panels added,
removed or given other values, show the panel at once. The look and the timing are read when a switch or a drag starts,
through the real properties of an inert probe in the shadow root (the distance as a width, the blur as a height, the share
as `flex-grow`, the opacity as itself, the motion as a transition that names no property), so a token is never parsed
and a layer's bare `0` dimension reads as 0. The container clips both panels (`overflow: clip`) to its corners,
`container.shape`.

**The swipe (TBV-3, TBV-4, TBV-8, TBV-13).** Pointer Events, touch and pen only; the container has `touch-action:
pan-y pinch-zoom` (the own row, outside it, keeps the tabs' own), so vertical scrolling and zoom stay the browser's. After the touch slop (8 px, the sheets' `SheetDrag`),
a drag that went further sideways than up or down is the view's (the pointer is captured); one that went up or down first
is scrolling for its whole length. p is the sideways distance over the container's width, toward the next enabled tab when the
finger moves toward the start edge (left, or right in RTL) and the previous one otherwise; every move draws the switch at
p and sets the tabs' `indicatorOffset` to ±p (0, and the panel at rest, where there is no enabled tab that way). A
release commits at p ≥ 0.5 or on a fling toward the tab (0.5 px/ms, measured over the last 80 ms of the events' own time
stamps), and a fling away always cancels. A commit sets the tabs' and the view's `value`, sets the offset to −(1 − p) from
the new tab, moves focus out of the panel it hides, and fires `change` — all in the release's task — and then runs the
rest of the switch and the offset to 0 over the switch's motion; a cancel runs both back to 0. A `pointercancel` cancels.
Not taken: a mouse, trackpad or wheel; a drag that starts on an `input`, `textarea`, `select`, editable content, a
`slider` or `scrollbar` role, a `<tanrei-slider>`, `<tanrei-carousel>`, `<tanrei-text-field>`, `<tanrei-search>`, the
view's own row (the drag is the row's: its indicator follows it, TAB-28), a nested Tab view or tabs, an element that scrolls sideways or sets its own `touch-action` (`none`, `pan-x`), or selected
text; and any drag while `no-swipe` is set.

**A drag across the row (TBV-2, TBV-3, TBV-8, TBV-18).** The tabs follow it themselves (TAB-28…30), on the view's own row
or the linked one, with touch, a pen or a mouse. Only one gesture runs at a time: while the tabs follow a drag the view
takes none (it asks the row), and while the view's swipe has set `indicatorOffset` the tabs take none. The shown panel
stays at rest for the whole drag — no tab is selected before the release, so there is no panel to switch to — and the
release switches to the chosen tab's panel over the switch's motion, as any selection does. With its own row the view
fires the one `change`; linked, the tabs do. A drag that returns or is cancelled switches and fires nothing.

**Reduced motion (TBV-7).** Under `prefers-reduced-motion: reduce` the distance, its share and the blur are 0, so a drag
crossfades the two panels with the finger and a switch (or the rest of a released one) fades over
`motion.fade-duration` / `-easing`. The offset still follows the finger and goes back to 0 at once on release.

**Semantics and focus (TBV-9, TBV-10).** With its own row or linked, every panel has `role="tabpanel"` and `aria-labelledby` its tab; the
shown one is exposed, and `tabindex="0"` while it holds nothing focusable. The others are `hidden` and `inert`; a panel a
switch or a drag still draws loses `hidden` for the drawing but stays `inert` and `aria-hidden="true"`. The exposure
moves when the selection does, not when the drawing ends. A switch that hides the panel holding focus moves focus to the
tabs' selected tab. A focused empty panel draws the system's ring (or glow) **inside** its edge, in
`container.shape`'s corners (`focusRing(on, { inside: true })` on the panel's `.panel`), for keyboard focus only and never
animated; where style queries are missing the panel reads the focus style when focus arrives (`data-focus-style`).

**Size and state (TBV-11, TBV-12).** The view is a flex column: its own row at the top edge across its whole width, at
the row's own height, and the container directly below it with no gap. The container is a one-cell grid: the view is
as wide as its parent and as tall as its row (none while linked) plus the shown panel, the taller of two panels while a
switch draws both, and the new panel's height once the switch ends (a height is not animated). A view the product sizes
(`block-size` on the host) keeps its row at the top and makes the container fill the rest; each panel fills it and
scrolls up and down inside it (`overflow-y: auto`). Hidden panels stay in the DOM with their state (typed values, scroll
positions); none is recreated, nor when its tab changes. The row is outside the container, so a switch never moves,
fades, blurs or clips it.

**Reports (TBV-14, TBV-15, TBV-17).** In a debug build: `tabs` naming no row in the tree; the selected tab (or the view's
`value`) without a panel; an own row with no panel; a panel with an empty value or a repeated value (only the first is
shown, and only it has a tab of the own row), or, linked, the value of no tab; linked tabs that hold panels of their
own; `variant`, `full-width` or `label` set on a linked view.

Part: `container`. Slots: the default one (the panels) and `tabs` (the view's own row, which the view places there itself).

## `<tanrei-toolbar>`

A set of related controls held as one Tab stop: inline where its content needs it (the default), docked across the bottom
edge, or floating over the content (`specs/toolbar.spec.json`, TBR-1…25). Its items are your own `<tanrei-button>` and
`<tanrei-button-with-menu>` children, alone or in `<tanrei-toolbar-group>`s, with `<tanrei-divider>` separators.

```html
<tanrei-toolbar label="Formatting" overflow-label="More formatting">
  <tanrei-toolbar-group label="Text style">
    <tanrei-button variant="text" toggle selected label="Bold"><span slot="icon">format_bold</span></tanrei-button>
    <tanrei-button variant="text" toggle label="Italic"><span slot="icon">format_italic</span></tanrei-button>
  </tanrei-toolbar-group>
  <tanrei-toolbar-group>
    <tanrei-button variant="text" label="Insert link"><span slot="icon">link</span></tanrei-button>
    <tanrei-button variant="text" id="insert" label="Insert"><span slot="icon">add</span></tanrei-button>
    <tanrei-menu anchor="insert">…</tanrei-menu>
  </tanrei-toolbar-group>
  <tanrei-divider></tanrei-divider>
  <tanrei-button-with-menu label="Save" menu-label="More save options">…</tanrei-button-with-menu>
  <tanrei-button toolbar-overflow="never">Publish</tanrei-button>
</tanrei-toolbar>
<tanrei-toolbar variant="docked" label="Message actions">…</tanrei-toolbar>
<tanrei-toolbar variant="floating" orientation="vertical" label="Map controls">…</tanrei-toolbar>
```

| `<tanrei-toolbar>` | Type | Default | |
|---|---|---|---|
| `variant` | `inline` \| `docked` \| `floating` \| a value a design system adds | `inline` | inline stands in place, as long as its items and never longer than its container, with no surface of its own in the default system; docked spans its parent's width at the bottom edge; floating is a rounded, raised surface as long as its items. A value a layer adds is drawn with the inline structure and its own values; a value the active system lacks is drawn as inline and reported (TBR-13); reflected |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | vertical stacks an inline or a floating toolbar's items top to bottom. A docked toolbar is always horizontal (reported, TBR-6); anything else is horizontal (reported, TBR-13); reflected |
| `label` | string | `""` | the toolbar's accessible name ("Formatting"). Never drawn. Required: empty is reported (TBR-12) |
| `overflow` | `menu` \| `scroll` | `menu` | what happens when the items do not fit: menu hides items from the end into the overflow menu (TBR-18); scroll scrolls them (TBR-8); anything else is menu (reported); reflected |
| `overflow-label` (`overflowLabel`) | string | `""` | the overflow button's accessible name ("More actions"); empty takes the product's word `toolbarOverflowLabel` (`setWords()`); with neither the button is drawn, works, is unnamed and the missing word is reported once (TBR-18) |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | how two groups, or a separator, set items apart; auto takes `comp.toolbar.separation`, which follows `sys.behavior.separation`; anything else is auto (reported); reflected |

| `<tanrei-toolbar-group>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | names the group (`role="group"`, `aria-label`); empty leaves it unexposed, its items the toolbar's (TBR-22) |

An item's own attribute `toolbar-overflow="never"` keeps it when space runs out (Send, Done); the toolbar hides the items
before it instead.

It fires no event of its own: the items keep their own `click`, `change` and `toggle`, props, states, target and
semantics, and are never restyled (TBR-9). Parts: `container` (the surface), `separator` (each line), `overflow-button`
and `overflow-menu`. The item kinds: `action` (an icon-only `<tanrei-button>`; a toggle is one with `toggle`), `button`
(a labelled one, which may be a toggle), `menu-button` (a `<tanrei-button id>` with a `<tanrei-menu anchor="<id>">`
beside it, in the toolbar or the same group: the menu is held out of the line and not counted, TBR-24),
`button-with-menu`, `group` and `separator`.

**Structure.** The toolbar assigns each child to a slot of its own (manual slot assignment), and a group each of its items
to one of the group's (`display: contents`): the toolbar draws the spaces between items and the lines between groups as
elements of its own shadow root and the group's, never as a margin on the product's element, and leaves a hidden item's
slot undrawn while the item stays in the page with its listeners and state. A `<tanrei-divider>` separator is not
drawn: the toolbar draws its line in its place.

**Semantics (TBR-11, TBR-22, TBR-23).** The host is `role="toolbar"` with `aria-label` from `label` and
`aria-orientation`; a labelled group is a named group; each line is `role="separator"` across the axis. Each item keeps
its own name, role and state; the toolbar adds nothing to them but the roving `tabindex` below.

**Keyboard (TBR-10, TBR-21, TBR-24, TBR-25).** The WAI-ARIA toolbar pattern: one Tab stop, the stop focused last, or else
the first enabled one. The stops are the items shown, a group's included, each half of a Button with menu (told which
half is the stop through the internal channel, SPB-33), and the overflow button last; separators are none. Right / Left
Arrow (mirrored in right-to-left) in a horizontal toolbar and Down / Up Arrow in a vertical one move to the next and
previous enabled stop, wrapping; Home and End go to the first and last. Moving never activates; Enter and Space are the
focused item's own. The Tab stop is the items' `tabindex`: 0 on the stop, -1 on the other enabled items, none on a
disabled one (disabled by itself or by a `<fieldset disabled>`, `isDisabledControl()`, which the item tells the toolbar
through the group channel). An item that leaves the toolbar, or is hidden, gets its `tabindex` back. While a Menu
anchored to an item is open its keys are the Menu's; it returns focus to its anchor. An item hidden while it is the stop
or has focus hands both to the overflow button.

**Layout (TBR-1…7, TBR-14, TBR-16, TBR-17).** Inline: `display: inline-flex`, `container.padding-inline.inline` at each
end, neighbours `container.gap.inline` apart or as much more as each needs to keep `sys.target.touch` along the axis
(medium Buttons 8 apart), at least `container.size.inline` across, filled, raised, rounded and edged by the inline tokens
(nothing in the default system); it never positions itself or reads an inset. Docked: the parent's full width, at least
`container.size.docked` high above the bottom inset, the items spread with equal space between them and never less than
`container.gap.docked`, one item centred; the top edge is an inset line; its color reaches under
`env(safe-area-inset-*)` while the items stay inside (TBR-3). Floating: as inline with the floating tokens (gap 0),
rounded with the shared corner rule and edged all round. The spaces are elements of the toolbar's (or the group's): the
toolbar measures each pair of neighbours and writes their lengths on the space, whose rule computes
`max(gap, lack + lack)` from the tokens, so a system switch is followed by the cascade. Vertical stacks the items top to
bottom whatever the direction. The size across is a minimum (TBR-14).

**Groups and separators (TBR-22, TBR-23).** Two neighbouring groups, or a group and an item outside any group, are set
apart by a line `divider.thickness` thick and `divider.length` long, in `divider.color`, `group.gap` on each side; under
gap separation by twice `group.gap` of empty space (a style query on the host's `--_separation`, `data-separation` where a
browser has none). No line at either end, never two side by side; docked, the line's space grows with the other spaces.

**Too many items (TBR-8, TBR-18…20).** With `overflow="menu"` the toolbar hides items from the end, one at a time,
skipping `toolbar-overflow="never"`, until what remains and the overflow button fit — an icon-only text medium Button,
`more_horiz` (`more_vert` in a column), a button that opens a menu with its expanded state. What is hidden is decided
once every item has rendered (microtasks, before the frame) and again in the observer's callback when a length changes —
the container's, a shown item's or the parent's, whose length is the room an inline or a floating toolbar may take — so
no item is drawn and then hidden, and nothing is animated. After a change made in the callback the observation is laid
down and taken up again in the next frame, so that a resize it causes is no loop error. The overflow button opens a
`<tanrei-menu>` placed bottom-end, built when it opens: an action is a menu item with its label and icon, a toggle a
checkbox item, a menu button a submenu holding copies of its menu's items, a Button with menu its main action and a
submenu named by `menuLabel`, each run between two lines a menu group. A row activates the hidden item itself (its
native button's click, or the original menu item's), once, and the menu's own events stay in the shadow root. With
`overflow="scroll"`, or where what is never hidden still does not fit, the container becomes a scroll container along its
axis with no visible scrollbar, and an item that takes focus is brought fully into view at once.

**Targets (TBR-9).** Between two items the hit areas meet at the middle of the gap and never overlap (as BGR-4): the
toolbar measures each gap and tells each Button through the button group's internal channel (`GroupItemController`, a
`row` place) how far its hit area may reach toward each neighbour. On the sides without a neighbour, and across the row,
an item keeps its whole target.

**Debug reports (TBR-6, TBR-12, TBR-13, TBR-18).** An empty label, a toolbar with no item, a child (or a group's child)
that is none of the item kinds (still laid out: a field or a slider would take the arrow keys), a docked toolbar asked to
be vertical, an unknown variant, orientation, overflow or separation, and an overflow button with no name.

**Differences from the other platforms.** The web has the toolbar role, as React Native does (SwiftUI, Compose and
Flutter expose a named group). The natives are lagging: no inline variant, groups, separators or overflow menu yet. The
docked inset is `env(safe-area-inset-*)`, which needs `viewport-fit=cover` in the page's viewport meta to be non-zero. The
Menu has no side placement, so a vertical toolbar's overflow menu opens below its button. The room of an inline or a
floating toolbar is watched on its parent element: a toolbar whose room is set by its siblings in a flex row decides
again only when its parent, its container or its items change size. The web has no gallery app; the fixtures are drawn
by the test harness (`test/harness.ts`): inline at the start of a 360 × 56 stage (240 wide for the overflow fixtures),
docked on 360 × 64, floating centred on 360 × 96, vertical on 96 × 240 (96 × 288 with groups).

## `<tanrei-tooltip>`

Describes an element in a few words when a person points at it, focuses it with the keyboard or long-presses it,
without taking focus or blocking anything (`specs/tooltip.spec.json`, TIP-1…29).

```html
<tanrei-tooltip text="Move to trash">
  <tanrei-button variant="text" label="Delete"><span slot="icon">delete</span></tanrei-button>
</tanrei-tooltip>
<tanrei-tooltip variant="rich" headline="Storage" text="Trash still counts toward storage." placement="bottom">
  <tanrei-button variant="text" label="About storage"><span slot="icon">info</span></tanrei-button>
</tanrei-tooltip>
<!-- The text repeats the anchor's name: do not read it twice. -->
<tanrei-tooltip text="Share" no-describe><tanrei-button variant="text" label="Share"><span slot="icon">share</span></tanrei-button></tanrei-tooltip>
<!-- A dense toolbar: this one's name comes sooner than the system's delay. -->
<tanrei-tooltip text="Bold" show-delay="150"><tanrei-button variant="text" label="Bold"><span slot="icon">format_bold</span></tanrei-button></tanrei-tooltip>
<!-- The command's keys after its name; the anchor carries them as aria-keyshortcuts. -->
<tanrei-tooltip text="Bold" shortcut="mod+b"><tanrei-button variant="text" label="Bold"><span slot="icon">format_bold</span></tanrei-button></tanrei-tooltip>
<!-- A hint the product opens itself: below the control, lined up with its start edge, pointing at it, on a surface. -->
<tanrei-tooltip text="New: filters" placement="bottom-start" arrow inverse="false" open>
  <tanrei-button variant="text" label="Filter"><span slot="icon">filter_list</span></tanrei-button>
</tanrei-tooltip>
```

| `<tanrei-tooltip>` | Type | Default | |
|---|---|---|---|
| `variant` | `plain` \| `rich` | `plain` | plain: one phrase, by default on the inverse surface; rich: an optional title and a few sentences, by default on a raised surface. A structure drawn by code, not a token axis (anything else is plain); reflected |
| `text` | string | `""` | the description; required — without it the tooltip never opens and describes nothing (reported, TIP-16) |
| `headline` | string | `""` | the spec's `title`: a rich tooltip's heading; a plain one ignores it (reported). A `title` attribute is the browser's own (it draws a native tooltip), and the element does not read it |
| `shortcut` | string[] | `[]` | the keys of the anchor's command, in `<tanrei-keyboard-shortcut>`'s key names, one chord per string; the attribute holds the chords separated by spaces (`shortcut="mod+k mod+c"`). A plain tooltip writes them after its text; a rich one ignores them (reported). It does not make the keys work (TIP-27) |
| `placement` | `top` \| `top-start` \| `top-end` \| `bottom` \| `bottom-start` \| `bottom-end` \| `start` \| `start-top` \| `start-bottom` \| `end` \| `end-top` \| `end-bottom` \| `auto` | `top` | the side it prefers and how it lines up along it: alone, centred on the anchor; with `-start` / `-end` (above or below) or `-top` / `-bottom` (beside), that edge on the anchor's. `auto` is the first of top, bottom, end, start with room. Start and end follow the layout direction. Anything else is `top` (reported, TIP-22); reflected |
| `offset` | number \| `null` | `null` | CSS pixels between the anchor's edge and the tooltip (its arrow's tip while it has one); `0` lets them touch; `null` takes the token `offset`. A negative or non-finite value, or an empty attribute, takes the token (reported, TIP-24) |
| `crossOffset` / `cross-offset` | number | `0` | CSS pixels it moves along its side: towards the end above or below the anchor, towards the bottom beside it. Never so far that less than `arrow.width` of it stays beside the anchor. Not a finite number is `0` (reported) |
| `arrow` | boolean \| `null` | `null` | whether it draws an arrow that points at the anchor; `null` takes the system's choice `arrow.visible` (off in the default system). Attribute: absent is `null`, `arrow` is true, `arrow="false"` is false; reflected |
| `inverse` | boolean \| `null` | `null` | drawn in the opposite scheme's colors (true) or on a surface of the scheme (false); `null` takes its form's choice, `plain.container.inverse` (on) or `rich.container.inverse` (off). Attribute as `arrow`'s; reflected. Colors and elevation only |
| `describes` | boolean | `true` | the text is the anchor's accessible description. Its attribute is the inverse, `no-describe` (an HTML boolean cannot default to true) |
| `open` | boolean | `false` | whether it shows; reflected. It opens and closes itself; set it to show one on your own (a first-run hint) |
| `showDelay` | number \| `null` | `null` | attribute `show-delay`: ms a mouse or pen rests on the anchor before it opens; `0` opens it at once; `null` takes `motion.show-delay`. Hover alone (TIP-17, TIP-18) |
| `hideDelay` | number \| `null` | `null` | attribute `hide-delay`: ms it waits after the pointer has left the anchor, the gap and the tooltip; `0` closes it at once and it stays hoverable (the gap counts as hover); `null` takes `motion.hide-delay` |
| `touchTimeout` | number \| `null` | `null` | attribute `touch-timeout`: ms a long-pressed tooltip stays after the finger lifts; `0` closes it as the finger lifts (it has shown for the whole press); `null` takes `timeout.touch` |

| Event | When |
|---|---|
| `toggle` | `CustomEvent<{ open }>`, not bubbling: it opened or closed by itself — hover, keyboard focus, long-press, Escape, an activation, the touch timeout, another tooltip opening, its anchor going out of sight. Setting `open` fires nothing |

**The overlay (TIP-13).** The drawn tooltip is a `popover="manual"` element in the shadow root, shown in the top layer —
above a modal `<dialog>` that is already open (it is shown again whenever it opens, so it is the newest layer). That
element is the **placed box**: it paints nothing and is never transformed. Inside it a wrapper holds the arrow and the
container (`part="container"`), and the wrapper is what moves. It takes no focus, holds nothing focusable, makes nothing
inert; a press on it closes it and goes no further (not to what is under it, nor to the tooltip's ancestors — the release
and the click of that same press included).

**Placement (TIP-9, TIP-20, TIP-22…24).** It is placed **by script** (`tooltip-placement.ts`: `placeTooltip()`, geometry
alone), as the menu is: on the side and with the alignment `placement` names,
`offset` from the anchor's edge and moved along the side by `crossOffset`; then, in this order, flipped to the opposite
side — keeping the alignment — when its side has no room within `window-margin` and the other has, on the roomier of the
two when neither has, shifted along the side as far as the margin asks, and, where the room on its side is still smaller
than the container, standing in the margin and — rather than leave the window — moved back over the anchor, top and
start edges first, without an arrow. It keeps the side it is on for as long as that side has room (so scrolling does not
throw it from side to side), follows the anchor while open (by events, `FollowController`), and takes a new place at once: its position is
never animated. It closes when its anchor is removed, hidden, scrolled out of the window, or scrolled out of sight inside
an ancestor that clips its content. In right-to-left, start and end, `-start` and `-end` and the direction of a
`crossOffset` above or below the anchor mirror; top, bottom, `-top`, `-bottom` and `auto`'s order of names do not.

**The arrow (TIP-25).** A triangle `arrow.width` wide and `arrow.height` tall (`part="arrow"`, hidden from assistive
technology) on the container's edge that faces the anchor. Its tip points at the middle of the part of the anchor's edge
the container stands beside — for `top-start` on a small anchor that is near the container's start, not its middle — and
its base keeps `arrow.inset`, and the corner's radius, from each end of the edge. The container stands the arrow's height
farther away, so the tip keeps the offset. **One shape with the container:** while an arrow is drawn the container gives
up its own `box-shadow`, and the elevation — read from the token as the browser resolves it — is drawn round the
container and the arrow together by an SVG filter in the shadow root (each layer the shape grown by its spread, blurred,
moved and colored, and cut where the shape is), so its ring and shadows run round both with no line between them. What
that costs: a spread grows the shape squarely, so a ring is a little thicker along the arrow's slanted edges and flat
under its tip; an inset layer of the elevation is not drawn while an arrow is; and under forced colors the arrow is a
plain `CanvasText` triangle on the container's border. A tooltip without an arrow is drawn with `box-shadow`.

**The two looks (TIP-26).** Each form is drawn inverse or on a surface: a plain tooltip from `plain-*` (its inverse look)
or `plain-surface-*`; a rich one from `rich-*` (its surface look) or `rich-inverse-*`. The choice is the `inverse`
attribute's, or the form's token — a choice's NAME, read from the cascade by a style container query, and by
`data-inverse` on the placed box where the browser has no style queries (read again when the root's system changes). An
unknown name is the first value, off.

**The shortcut (TIP-27).** A plain tooltip draws `shortcut` with `<tanrei-keyboard-shortcut>` (`part="shortcut"`: its
plain form at size small, hosted — KBS-13 — so its legends and separators take the tooltip's text style and
`plain.shortcut.color`) after the text, `plain.container.gap` away, on the text's first line; the keys stay whole on one
line while a long text wraps beside them, and the convention is the keyboard's (`data-tanrei-keyboard-convention` on an
ancestor, else the platform's). The keys reach the anchor as `aria-keyshortcuts` in KBS-12's form (`Control+B`,
`Meta+K Meta+C`) **on the element that takes focus** — for a Tanrei component, the native control in its shadow root —
whether or not `describes` is set. An anchor that states `aria-keyshortcuts` itself keeps its own; the tooltip's keys are
then added to the end of the description in that same notation (`Saves a copy, Control+Shift+S`) while `describes` is
true — the text KBS-10 gives for a shortcut without a label; no key is spelled out in any language.

**Motion (TIP-15, TIP-28, TIP-29).** It comes out of the anchor's side: it fades in over `motion.enter-duration` /
`-easing` while it grows from `motion.enter-scale` and travels `motion.enter-offset` from nearer the anchor, the growth
fixed at the point of its edge where an arrow points or would point, and goes back the same way over
`motion.exit-duration` / `-easing`. These are transitions on the wrapper, so a motion that is interrupted turns round
from the opacity, size and place it has reached. The placed box, the hover gap and the following never see them. A
tooltip that is closed or leaving takes no pointer (`pointer-events: none`), and a closed one is out of the top layer.
Under `prefers-reduced-motion: reduce` it fades and neither grows nor travels. **Warm tooltips:** one that opens while
another is open or still fading out, or within `motion.warm-duration` after one closed because the pointer or the
keyboard focus left its anchor, appears whole at once — no show delay for a pointer, no motion — and the other
disappears at once. A tooltip closed by Escape, an activation or a press on it starts no warm time. The time is kept per
window (it is a wait, kept under reduced motion), beside the one showing tooltip.

**Triggers (TIP-1…8).** A mouse or pen resting on the anchor opens it after the show delay (at once while tooltips are
warm: at most one is open in a window, and one opening — by itself or by `open` — closes the other at once).
It stays while the pointer is over the anchor, the gap between the anchor and the tooltip, or the tooltip, and closes the
hide delay after the pointer has left all three. The gap is the strip between the anchor's edge and the container — the
offset deep, and the arrow's height deeper while one is drawn — as wide as the container; it is measured by the
document's `pointermove` listener, not drawn, so a press there reaches what is under it. That listener also sees the
pointer leave when the browser sends no `pointerleave`. Keyboard focus (`:focus-visible`) opens it at once and blur closes it; focus from a
press does not. A touch long-press — the platform's `contextmenu` with `pointerType: 'touch'`, whose menu and callout it
prevents — opens it; after the finger lifts it stays for the touch timeout, and a touch elsewhere closes it sooner.

**Delays (TIP-17, TIP-18).** The show delay, hide delay and touch timeout are `show-delay`, `hide-delay` and
`touch-timeout` in milliseconds, used as written (the motion dial scales the tokens, not these), or
`motion.show-delay`, `motion.hide-delay` and `timeout.touch` (a reading time, not a motion token) while unset. A
negative value, one that is not a finite number, or an empty attribute (`show-delay=""` is not 0) takes the token and is
reported in development. Each value is read as its wait starts, so a change mid-wait applies the next time. They are
waits, not motion: reduced motion keeps them. They govern hover and the time after a long-press alone — keyboard focus,
another tooltip being open and setting `open` do not wait. iOS Safari fires no
`contextmenu` on a long-press, so there it does not open by touch. Escape closes it
without moving focus and is consumed (`preventDefault` and `stopImmediatePropagation` in the window's capture phase), so
an enclosing dialog stays open. Escape, an activation of the anchor (a click, Enter or Space) and a press on the tooltip
keep it closed until the pointer comes back or focus arrives again. No time limit while hovered or focused.

**Semantics (TIP-14).** While `describes` is true and there is text, the text — after the title, for a rich tooltip
(`Storage, Trash still counts…`) — is `aria-description` on the anchor's focusable element: the first slotted element that
is, holds or draws one (a Tanrei component takes it on its host and forwards it to its native element), whether or not the tooltip is open. The drawn tooltip is `role="tooltip"` and
`aria-hidden` then. With `no-describe` nothing is added to the anchor and the drawn tooltip is not hidden. The anchor's
name and role are never touched. Parts: `container`, `arrow`, `title`, `supporting-text`, `shortcut`.

## `<tanrei-popover>`

Shows content a person can read and operate on a small surface that opens beside the control they pressed and stays
with it, without dimming or blocking the rest of the page (`specs/popover.spec.json`, POP-1…38).

```html
<tanrei-button id="share" variant="outlined">Share</tanrei-button>
<tanrei-popover id="panel" anchor="share" headline="Share this page" closable close-label="Close sharing">
  Anyone with the link can read it.
  <tanrei-button slot="actions" dismissive>Stop sharing</tanrei-button>
  <tanrei-button slot="actions" confirming>Copy link</tanrei-button>
</tanrei-popover>
<!-- Under a field: as wide as it, focus stays in it, the list reaches the edges. -->
<tanrei-popover anchor="city" label="Suggestions" width="anchor" initial-focus="anchor" no-inset>…</tanrei-popover>
<script type="module">
  const [opener, panel] = [document.querySelector('#share'), document.querySelector('#panel')];
  opener.addEventListener('click', () => (panel.open = !panel.open)); // the product toggles it (POP-18)
  panel.addEventListener('close', () => (panel.open = false)); // …and closes it, whatever the reason (POP-21)
</script>
```

| `<tanrei-popover>` | Type | Default | |
|---|---|---|---|
| `open` | boolean | `false` | whether it is shown; reflected. Controlled: it never opens or closes itself |
| `anchor` | string | `""` | the id of the element it stands beside, in the popover's own tree (its document or shadow root). That element is also the opener unless `opener` names one. No anchor found when `open` becomes true: it stays closed, reported (POP-29) |
| `anchorElement` | `HTMLElement` \| `null` | `null` | the anchor as an element, for one an id cannot reach (another shadow root); it wins over `anchor`. A property only |
| `opener` / `openerElement` | string / `HTMLElement` \| `null` | `""` / `null` | the element that is pressed, carries the ARIA states and takes focus back, where it is not the anchor (a field anchors, a button in it opens) |
| `placement` | the tooltip's thirteen values | `bottom-start` | the side it prefers and how it lines up along it; `auto` is the first of bottom, top, end, start with room, start edges (top edges, beside the anchor) together. Anything else is `bottom-start` (reported, POP-37); reflected |
| `offset` | number \| `null` | `null` | CSS pixels between the anchor's edge and the popover (its arrow's tip while it has one); `0` lets them touch; `null` takes the token `offset`. A negative or non-finite value, or an empty attribute, takes the token (reported, POP-4) |
| `crossOffset` / `cross-offset` | number | `0` | CSS pixels it moves along its side: towards the end above or below the anchor, towards the bottom beside it; never so far that less than `arrow.width` of it stays beside the anchor. Not a finite number is `0` (reported) |
| `arrow` | boolean \| `null` | `null` | whether it draws an arrow that points at the anchor; `null` takes the system's choice `arrow.visible` (off in the default system). Attribute: absent is `null`, `arrow` is true, `arrow="false"` is false; reflected |
| `width` | `content` \| `anchor` | `content` | as wide as its content between `container.min-width` and `container.max-width`, or as wide as the anchor (at least the least width). Anything else is `content` (reported); reflected |
| `inset` | boolean | `true` | insets the content by the container's paddings. Its attribute is the inverse, `no-inset` |
| `initialFocus` / `initial-focus` | `popover` \| `anchor` | `popover` | where focus is when it has opened: in it, or left where it is. Anything else is `popover` (reported) |
| `headline` | string | `""` | drawn in the header (an `<h2>`), and the dialog's accessible name |
| `label` | string | `""` | the dialog's name where it draws no headline; never drawn. Neither given: it still opens, reported (POP-29) |
| `closable` | boolean | `false` | draws the close button at the end of the header; reflected |
| `closeLabel` / `close-label` | string | `""` | the close button's accessible name; empty while `closable` is reported (POP-13) |
| `dividerVisibility` / `divider-visibility` | `auto` \| `always` \| `scroll` | `auto` | when the dividers are drawn while the content scrolls: `always` for as long as it scrolls, at its top included; `scroll` below the header only once scrolled and above the actions only while more lies below; `auto` takes `comp.popover.divider.visibility` (always in the default system, scroll in cupertino and m3-like). Anything else is `auto`, reported (POP-38); reflected |
| `inline` | boolean | `false` | **for tests**: draws the open container in place — inside its positioned ancestor, which stands for the window — not in the top layer. It then answers no dismissal and moves no focus |

| Slot | |
|---|---|
| default | the content: it inherits `content.color`, and plain text takes the body role |
| `actions` | `<tanrei-button>` children, `confirming` or `dismissive` where each is one. A Button without a `variant` attribute draws `actions.variant` (BTN-10's channel) |

| Event | When |
|---|---|
| `close` | `CustomEvent<{ reason }>`, not bubbling: `escape`, `outside`, `focus-out`, `close` (the close button) or `anchor-hidden`. Once for one act of the person (a press outside that also moves focus is one). Set `open` to false; a product that declines is asked again at the next act. The web has no back of its own, so `back` is never sent |

Parts: `container` (the dialog), `arrow`, `header`, `headline`, `close-button`, `content`, `divider`, `actions`.

**The overlay (POP-1, POP-25, POP-27).** The element itself has no box (`display: contents`): closed, it takes no room.
The drawn popover is a `popover="manual"` element in the shadow root, in the top layer — above a modal `<dialog>` when
the element is a descendant of that dialog, which it must be to be operable there. `manual`, not `auto`: the popover
implements its own light dismiss, so that `close` carries a reason and an overlay opened from inside it is not closed by
the browser's rule. That element is the **placed box**: it paints nothing and is never transformed. Inside it a wrapper
holds the arrow and the container (`role="dialog"`, no `aria-modal`, `tabindex="-1"`), and the wrapper is what moves.
The placed box itself carries `role="none"`: a popover element without a role is exposed as an unnamed group, and the box
is only a box (so too the menu's surface, the select's and the combobox's list surface and the search view;
`src/overlay-tree.test.ts` reads each in Chromium's computed tree).
Nothing else in the window is made inert, unscrollable or hidden, and there is no scrim.

**Placement (POP-2…5, POP-34, POP-36).** Placed **by script** — `placeAnchored()` (`src/primitives/placement.ts`), the
geometry the tooltip reads too — not by CSS anchor positioning (as the menu).
In order: the side and alignment `placement` names; `offset`, then `crossOffset`; flipped to the opposite side when the
preferred one has no room; **limited to the room** of the side with more where neither has enough (the content then
scrolls; a tooltip is never limited); shifted along its side to stay `window-margin` inside the window; and, where the
room is less than its least size (its least width; its header and actions), moved back over the anchor, still inside the
margin, with no arrow. The window is less its safe-area insets and less the part the on-screen keyboard covers (the
visual viewport), and what has focus is scrolled into the room left. It follows its anchor with `FollowController` — by
events, no frame at rest — and keeps the side it is on while that side has room. The anchor removed, hidden or wholly
out of sight (also inside a scrolling ancestor): `close`, reason `anchor-hidden`, once each time it goes.

**Size (POP-7, POP-8).** The container is as wide as its widest part — its actions counted as one row at their own
widths, also while they are a column — between the least and greatest width, and never wider than the window less the
margins. As tall as its parts, up to `container.max-height` and the room. Beyond that the header and the actions stay
and the content scrolls between them, a Tab stop while it does; the dividers (`part="divider"`) are drawn below the
header and above the actions — for as long as it scrolls under `always`, and under `scroll` the first only while it is
scrolled from its top and the second only while more lies below (POP-38). Where the header and the actions alone leave
no room for the content, the whole container scrolls instead, with no divider.

**Focus (POP-19, POP-20, POP-22).** Opening moves focus to the slotted element marked `autofocus`, else to the
container; the container shows its focus indicator only when the popover was opened from the keyboard (a press leaves
it quiet, whatever the browser decides for a focus a script moved). A popover mounted with `open` moves no focus. The
top layer does not change the tab order, so the popover keeps it at its two ends: Tab on the opener goes to its first
tabbable element, Shift+Tab from that element (or from the container) to the opener, and Tab from its last element to
what follows the opener — focus goes to the opener and the key's own move goes on from there, with the popover skipped
(the element is `inert` for that one task). Closing returns focus to the opener if it was inside the popover or an
overlay opened from inside it, or was lost with it (a press outside on nothing focusable); it stays where the person
put it otherwise. The opener's own indicator is the browser's `:focus-visible`: it shows after a key, not after a press.

**Dismissal (POP-21, POP-23, POP-24).** A press on the opener or the anchor is never outside: the product's handler
toggles. **A press outside also reaches the element under it.** Escape is answered by the topmost popover alone, and only
when the key reaches the popover's edge: a menu, a tooltip or a field inside it that takes the key keeps it; the popover
then stops it, so a dialog it stands in stays open. An overlay opened from inside — a menu or another popover anywhere in
the document whose anchor is inside, a tooltip, a modal dialog opened after the person acted inside — is the popover's
own: `registerOverlay()` (`src/primitives/dismiss.ts`) records what opened what. When the popover closes, a tooltip
inside closes at once, a popover opened from inside fires its own `close` (reason `anchor-hidden`), and a menu closes by
its own rule as focus returns to the popover's opener (`focus-out`). A docked picker or a search view opened from inside
is not closed with it yet.

**The opener (POP-18).** The popover writes `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` (its own id,
generated when it has none, and only where the opener is in the popover's tree) on the opener — on the `<button>` a
`<tanrei-button>` draws — and removes them when it is disconnected.

## `<tanrei-callout>`

A notice that is part of the content and stays there — a note, a caution, the reason for something, a summary of what
is wrong — in the flow of the page, as a quiet fill or an outline, in a status's colors with its glyph
(`specs/callout.spec.json`, CLO-1…31). What just happened, above the content and briefly, is a `<tanrei-snackbar>`; a
question that must be answered is a `<tanrei-dialog>`; a banner is a callout placed above a region's content.

```html
<tanrei-callout status="info"><p slot="title">Note</p>Text styles are named by level, never by size.</tanrei-callout>
<tanrei-callout status="warning" status-label="Warning" headline="Accessibility">A preset is held to its original.</tanrei-callout>
<tanrei-callout headline="Tip"><span slot="icon">lightbulb</span>Keep an action enabled.</tanrei-callout>
<tanrei-callout live open="false" status="error" headline="Three fields need attention" closable close-label="Close">
  Enter a name, choose a start date, and give an address that can receive mail.
  <tanrei-button slot="actions" variant="outlined">Go to the first field</tanrei-button>
</tanrei-callout>
```

In a box that scrolls, no part of the callout widens the page: its two live regions, which are in no positioned box
(the callout is not positioned, CLO-22), stand at the start corner of what they are laid out against
(`src/scroll-box.test.ts` puts every component at the far end of a row a 300 wide box scrolls, and the page must not
scroll sideways).

| Property / attribute | Type | Default | |
|---|---|---|---|
| `headline` | string | `""` | the spec's `title` (HTML's own `title` would be a tooltip over the block): a few words above the body, plain text, never a heading. The `title` slot takes its place |
| `status` | `default` \| `info` \| `warning` \| `error` \| `success` | `default` | the status whose colors and glyph the look is drawn in, and how a live callout is announced; reflected. Another value is drawn as `default` and reported |
| `statusLabel` / `status-label` | string | `""` | the status in words, read before the title and the body ("Warning, …") and never drawn; ignored (and reported) while `status` is `default` |
| `variant` | `tonal` \| `outlined` (open) | `tonal` | a quiet fill, or no fill and the one hairline; reflected |
| `size` | `medium` \| `large` (open) | `medium` | prose's two sizes: the title's and the body's text styles only; reflected |
| `live` | boolean | `false` | a live region in place of a note (CLO-21); it changes nothing that is drawn; reflected |
| `closable` | boolean | `false` | draws the close button; reflected |
| `closeLabel` / `close-label` | string | `""` | the close button's accessible name; required while `closable` (reported) |
| `open` | boolean | `true` | whether it is shown. The attribute: absent is true, `open="false"` is false — how markup starts a callout closed; the property reflects as `open="false"` or no attribute |

Slots: the default slot is the body; `icon` (a glyph of the icon set by name, in an element — or an `<svg>` / `<img>`),
`title` (your own title content, or a heading of the level the page needs), `actions` (your Buttons or links).
Parts: `container`, `icon`, `title`, `body`, `actions`, `close`. Event: `dismiss` (bubbles; the person closed it with
the close button — once, after `open` became false, never when the product sets `open`).

**The content is yours, in the document (CLO-7…9).** The body, the title slot and the actions are light-DOM children:
found by search in the page, translated, selectable, readable without script. Text placed directly in the element takes
the body's text style and color by inheritance. Long-form blocks are prose: wrap rendered Markdown in
`<div class="tanrei-prose" data-measure="false">` (with `data-size="large"` in a large callout) — the callout styles
nothing inside its body, and bare `<p>` elements there keep the browser's margins. The only rules on slotted content
are the title's (`::slotted([slot='title'])`: no margin, the title's text style and color — a heading keeps its role
and level) and the glyph's box. Those are the shadow root's, so a rule of the page on the same element wins: keep page
styles for headings out of a callout's title (a `.tanrei-prose` already leaves a Tanrei element's content alone). The
actions are laid out in a wrapping row and are otherwise untouched: use `outlined` or `text` Buttons (a `tonal` Button
has the fill of the tonal callout without a status). An action alone on its line is never wider than that line
(`::slotted([slot='actions']) { max-inline-size: 100% }`), and the callout tells its Buttons their label may wrap, through
the channel a button group uses (`[GROUP_PLACE]`, `src/primitives/group-item.ts`): at 320 wide with text at 200 %
"Reload from disk" takes the text column's width on two lines (CLO-23). A Button that fits is not touched. A Button
whose longest word and paddings are wider than the column keeps the word whole and is as wide as that needs
(`min-inline-size: min-content`), so it can still run past the column; a popover does the same for its actions (POP-30).

**Layout (CLO-1, CLO-22, CLO-23).** The host is `display: block` with no margin, no minimum, no maximum and no measure:
it fills its container. In a `.tanrei-prose` that keeps a measure it is kept to the measure like a text block (PRS-18).
The glyph and the close button are centred on the first line of the text — each in a box one line (`1lh`) of the first
line's font tall, falling back to the text role's own line height — so they stay there however tall the text grows and
whatever the reader's text size; the close button, taller than a line, overlaps the padding instead of growing the row.

**A note, or a live region (CLO-20, CLO-21).** The host carries `role="note"` and is named by its title: `aria-label`
for `headline`, `aria-labelledby` for an element in the `title` slot (which is given an `id` if it has none), or
`aria-label` from `statusLabel` where there is no title. With `live` the role is `status`, or `alert` for warning and
error, with `aria-live="off"` on the host: the announcement is made once by one of two visually hidden live regions in
the shadow root (polite and assertive, present from the first render), written a frame after both were emptied — when
`open` becomes true, when `headline`, `status`, `statusLabel` or the light-DOM title or body change (a
`MutationObserver`, only while `live`; changes inside the `icon` and `actions` slots are not the notice's), and when a
live callout is created by script after the document has loaded. One that is in the page's markup (upgraded in place,
or parsed while the document loads) is part of the first presentation and is not announced. **Limit:** the element
cannot tell a callout added in answer to something from one added with a new view of a single-page application; both
are announced. It never takes or moves focus, except to give
it back: closed while focus is inside it, focus returns to the element that had it before it entered the callout, or
the focused element is blurred where that one is gone (CLO-12).

**The close button (CLO-10, CLO-11)** is a `<tanrei-button size="small">` with the `close` glyph in its `icon` slot,
in the shadow root (part `close-button`). After each update the callout gives it, through the Button's internal channel,
the variant `--tanrei-comp-callout-close-button-variant` names (`giveVariant()`) and, in every look but `outlined`, the
tone of its form (`giveTone()`, BTN-45): `var(--tanrei-comp-callout-[<status>-]body-color-<variant>)`, so that the Button
draws its container as that color made translucent and its glyph in it. Its states, press answer, focus ring and
minimum target are the Button's; the callout adds no style to it. A callout connected again asks for an update, because
a Button that reconnects lets go of what its host gave it. No Escape, no timeout, no motion.

**Glyphs (CLO-5, CLO-6, CLO-27, CLO-29).** A status draws `info`, `warning`, `error` or `check_circle` unless the `icon`
slot holds a glyph; without a status and without one there is no glyph and no room for one. The glyph's opacity is a mix
of its color with transparent, never the element's `opacity`. A slotted glyph the icon set marks is mirrored in
right-to-left by the icon helper. Until the icon font can draw a glyph its box draws nothing (the slot is the ink
`GlyphDrawnController` measures, so the product's glyph name is not spelled either).

**Forced colors (CLO-24).** Every look gains a `CanvasText` border of `outline.width`, which the paddings give room
for; the title, the body and the glyph take `CanvasText`; the close button is a Button, drawn as every Button is there.

**Before the element is defined (`@tanrei/web/callout.css`).** `tanrei-callout:not(:defined)` is a block with the
callout's paddings and the body's text style, room at the start for a status's or the `icon` slot's glyph (whose name
is hidden) and at the end for the close button, the title slot in the title's style, and `display: none` for
`open="false"` — so server-rendered content keeps its place and nothing moves at definition (measured in
`callout.test.ts`). Not covered: a `headline` attribute (drawn by the element: content pages use the title slot), the
row of the `actions` slot (its Buttons are not defined yet either), and a title slot with no body (the title's gap
below it goes at definition).

## `<tanrei-empty-state>`

What stands in the place of content that is not there — a search with no results, a list nobody has added to, a page
before its first item: what is missing, why or what to do, and the action that does it. Quiet and flat: no fill, no
edge, no elevation (`specs/empty-state.spec.json`, EMP-1…18). A notice beside content that is there is a
`<tanrei-callout>`; a failure to load is a callout with the error status in the same place.

```html
<tanrei-empty-state headline="No projects yet">
  <span slot="media">folder_open</span>
  A project keeps the layers, the exports and the people of one design system together.
  <tanrei-button slot="actions">New project</tanrei-button>
</tanrei-empty-state>
<tanrei-empty-state size="large"><h1 slot="title">This page does not exist</h1>The address may be mistyped.</tanrei-empty-state>
<tanrei-empty-state live hidden align="start" headline="No entries match these filters">Three filters are on.</tanrei-empty-state>
```

| Attribute / property | Type | Default | Notes |
|---|---|---|---|
| `headline` | string | `""` | the spec's `title`: what is missing, in a few words; plain text, never a heading. (HTML's global `title` would show a tooltip over the block.) The `title` slot takes its place |
| `size` | `medium` \| `large` (open) | `medium` | the room above and below, the glyph's box and the text styles; reflected. A value the active system lacks is drawn as `medium` and reported |
| `align` | `center` \| `start` | `center` | where the parts stand; reflected. Another value is drawn as `center` and reported. The styles read a class the element writes, not the attribute: HTML compares the value of an attribute called `align` without regard to case, and `START` is not a value |
| `live` | boolean | `false` | announced once, politely, when it is shown after the page was presented and when its title or description changes; reflected. It changes nothing that is drawn |

| Slot | Content |
|---|---|
| (default) | the description: text, with the product's links |
| `media` | a glyph of the icon set — its ligature name in an element — drawn at the media size of the size in `media.color`; or a picture or view of the product's own, which keeps its size and colors |
| `title` | the product's own title in place of `headline`: a heading of the level the page needs, or text with inline content |
| `actions` | the product's Buttons or links, one or two |

Parts: `container`, `media`, `title`, `description`, `actions`. No events. **No words:** the element draws and exposes
only what the product gave it; its one text of its own is what a debug build writes to the console.

**Glyph or picture (EMP-3).** What the `media` slot holds is a glyph when its whole text is one ligature name
(`glyphName()`, the rule that decides mirroring); anything else — an `<img>`, an `<svg>`, a custom element, an element
with other content — is a picture: `max-inline-size: 100%`, and for `img`, `svg`, `video` and `canvas` a height that
follows the width. A `<picture>` is held to the block but its `<img>` is the product's to size
(`picture > img { max-inline-size: 100% }`), since a rule of the element reaches only what is slotted. A view of the
product's whose whole text is one word reads as a glyph's name: give such a view an element child. The glyph draws
nothing until the icon set can draw it (`GlyphDrawnController`), and is mirrored by the icon helper alone (EMP-15).

**The measure (EMP-2)** is `max-inline-size: min(100%, calc(var(--tanrei-comp-empty-state-content-measure) * 1em))` on
the box that carries the description's font, so it grows with the text; the title is inside it. The actions are not
held to it.

**Actions (EMP-6, EMP-11).** A wrapping flex row; nothing of an action is styled but `max-inline-size: 100%`, which
matters only to an action that is alone on its line and wider than it. So that such a Button does not run past the
block, the element tells each `<tanrei-button>` in the slot, through the Button's internal group channel
(`src/primitives/group-item.ts`), that it stands as a button group's standard item that is both first and last: the
one thing that changes is that its label may wrap when its line gives it less than one line needs (BGR-7's "as a
Button's label does when its layout gives it less width"). A Button that fits is the Button it is alone, to the pixel
(tested). The label then wraps down to its longest word; a single word longer than the line still overflows. A link
wraps as text does.

**Live (EMP-9).** With `live` the shadow root holds one visually hidden `role="status"` region (`aria-atomic`),
rendered from the first render and filled a frame after it was emptied — the title and the description as two blocks,
the product's own words with nothing added between them, never the actions. The host has no role. It is filled when:
the element is created by script after the document has loaded (not when it is upgraded in the page's markup); the
block is laid out after it was not (the product's `hidden`, or a hidden ancestor — a `ResizeObserver` on the host,
which exists only while `live` is set); the element is put back into the document; the headline, the title slot's
content or the description changes (a `MutationObserver` on the element's own content, which also keeps the parts
right when text is patched in place). A change inside the media or an action is not one. Like the callout it cannot
tell an element added in answer to something from one added with a new view of a single-page application. The region keeps what it last said, so a screen reader that reads the
block in order meets the words again after the actions.

**Nothing to say (EMP-18).** With no title and no description the host is `display: none` through the custom state
`:state(empty)`; where custom states are missing the container is `hidden` and the block has no height.

**Before the element is defined (`@tanrei/web/empty-state.css`).** `tanrei-empty-state:not(:defined)` is a block with
the paddings of its size, the description's text style and color, `text-align` by `align`, the title slot in the
title's style, a glyph's name hidden and a picture shown. With a title slot and a description the block is exactly as
tall at definition as before it, less the glyph it then draws (measured in `empty-state.test.ts`). Not covered: a
`headline` attribute, the measure, and the row of the `actions` slot.

## `<tanrei-snackbar>` and `<tanrei-snackbar-host>`

Tells a person briefly, at the bottom of the window, what the app just did or what happened (neutrally, or as
information, a warning, an error or a success), on a raised surface of the scheme or as a bar of the opposite scheme,
with at most one action, without taking focus (`specs/snackbar.spec.json`, SNK-1…33).

```html
<!-- Last on the page: the host's place in the focus order is where a snackbar's controls are. -->
<tanrei-snackbar-host></tanrei-snackbar-host>
<script type="module">
  const snackbars = document.querySelector('tanrei-snackbar-host');
  const { result } = await snackbars.show({ message: 'Conversation archived', action: 'Undo' });
  if (result === 'action') restore();
  await snackbars.show({ status: 'error', statusLabel: 'Error', title: 'Message not sent', message: 'Check your connection and try again.', action: 'Retry' });
</script>
```

| `<tanrei-snackbar>` / `show()` option | Type | Default | |
|---|---|---|---|
| `message` | string | `""` | what happened; with a title, the description; required (an empty one is reported, SNK-20) |
| `headline` (`show()`: `title`) | string | `""` | the title above the message; `headline` because HTML's global `title` would show a tooltip over the bar |
| `action` | string | `""` | the one action's label, drawn as a tonal button; empty draws none |
| `status` | `default` \| `info` \| `warning` \| `error` \| `success` | `default` | a status form: the bar in that status's colors (its tinted container or, drawn inverse, its filled color) with its glyph (`info`, `warning`, `error`, `check_circle`); an unknown value is the default; reflected |
| `statusLabel` / `status-label` | string | `""` | the status in words ("Error"), announced first; required in a status form (reported, SNK-20) |
| `inverse` | `true` \| `false` \| `null` | `null` | drawn inverse — the opposite scheme's colors, a dark bar in a light scheme — or on a surface of the scheme; `null` takes the system's choice, `comp.snackbar.container.inverse` (off in the default system, on in `m3-like`). The attribute: absent is `null`, `inverse` is `true`, `inverse="false"` is `false`; reflected. Colors only (SNK-30) |
| `closable` | boolean | `false` | draws a close button; reflected |
| `closeLabel` / `close-label` | string | `""` | the close button's name, required while closable (reported, SNK-20) |
| `expanded` | boolean | `false` | shows the whole title and message; no effect while they fit their line limits; reflected (not a `show()` option) |
| `expandLabel` / `expand-label` | string | `""` | the expand button's name ("Show full message"), the same in both states; required while it is drawn (reported, SNK-20) |
| `duration` | `auto` \| `short` \| `long` \| `indefinite` | `auto` | auto is `short` without an action and `indefinite` with one (WCAG 2.2.1); short and long close after `timeout.short` / `timeout.long` (a timed action is reported: offer it elsewhere too); reflected |

| `<tanrei-snackbar-host>` | |
|---|---|
| `show(options): Promise<{ result: 'action' } \| { result: 'dismiss', reason }>` | asks for a snackbar; it resolves when that snackbar closes (at the moment it is closed; its fade-out follows) |
| `dismissCurrent()` | closes the showing snackbar (reason `host`); the next waiting one shows after its fade-out |
| `clear()` | also drops every waiting one, each resolved with reason `host` |
| `snackbar` | the `<tanrei-snackbar>` being shown, or `null` (set its `expanded` to expand it from the product) |

| Event (on `<tanrei-snackbar>`) | When |
|---|---|
| `action` | `CustomEvent`, bubbling: the action was activated (pointer, Enter, Space) |
| `dismiss` | `CustomEvent<{ reason }>`, bubbling: `close`, `escape` (Escape with focus inside), `timeout` or `host` |
| `expandedchange` | `CustomEvent<{ expanded }>`, bubbling: the person toggled the expand button (the spec's `toggle`; a popover already fires a native `toggle` when shown and hidden). Not fired when the product sets `expanded` |

**The host (SNK-8…13, SNK-17).** One snackbar at a time, in the order asked for; a snackbar not yet shown waits while a
`<tanrei-dialog>` is open modally (`src/primitives/modal.ts`). The host appends each as a `<tanrei-snackbar popover="manual">`
child and shows it in the top layer, fixed at the bottom of the window, centred, `container.margin` above the bottom edge
(plus the safe area, `env(safe-area-inset-bottom)`, and the on-screen keyboard, measured from `visualViewport`) and at
least that far from the sides; a dialog opened later is above it. It rises in from below by its own height plus its
margin while fading in (`motion.enter-*`), fades out in place (`motion.exit-*`), and only fades where motion is reduced.
The timeout runs only while the snackbar is not hovered, holds no focus, is not expanded, the page is visible and focused
(`visibilityState`, `document.hasFocus()`) and no Tanrei modal dialog is open; each time those hold again it starts from its
whole length. The web cannot tell that a screen reader is running and has no platform accessibility timeout, so neither
lengthens it here: `auto` (indefinite with an action) is what keeps an action reachable. **Announcements (SNK-10)**: the host
draws two visually hidden live regions in its shadow root from the start — `role="status"` `aria-live="polite"` for the
default, info and success forms, `role="alert"` `aria-live="assertive"` for warning and error — and writes statusLabel, the
title, the whole message and the action's label into one of them once per snackbar; the snackbar itself is not a live
region, and nothing moves focus. **Focus (SNK-11)**: the scrolling text (while it scrolls), the action, the expand button and
the close button are reached by Tab, in that order, where the host is in the document; Escape inside dismisses; closing with
focus inside returns it to the element that had it before, or blurs it when that is gone.

**The ten forms (SNK-21, SNK-30).** A snackbar's form is its status — default, info, warning, error, success — on a surface
of the scheme or drawn inverse, and each form reads tokens of its own by a one-word prefix: none, `<status>`, `inverse`,
`inverse-<status>` (`container-color`, `info-container-color`, `inverse-container-color`, `inverse-info-container-color`;
inside a control `action-<state>-<form>-container-color`). In the default system the default form is `surface-bright` with
`on-surface` text, a status form a faint tint of its status (`<status>-container`), the inverse form `inverse-surface`, an
inverse status the same pair the other way round (`on-<status>-container`, deep in a light scheme and pale in a dark one);
the tonal action is a quiet step off whichever bar it is on. A form changes colors and nothing else: the elevation,
the corners, the sizes, the layout, the edge's width, the four opacities below, the motion, the timing, the announcement
and the keys are the same. Whether it is
drawn inverse is one private property on the host, `--_inverse`: the `inverse` attribute's answer, or — unset — the name
`--tanrei-comp-snackbar-container-inverse` carries where the snackbar is; the inverse forms' rules sit in a style container
query on it, so a change of the prop, of a layer or of the system on any ancestor redraws the snackbar at once, with no
script, and keeps its open state, its timeout and its focus. An unknown name is `off`. **Without style container queries**
the element reads the same property when it renders and writes `data-inverse` on the bar, which the same rules match; it
renders again when the document's root switches the system (`data-tanrei-system`, `data-tanrei-theme`, `class`, `style`),
so a choice changed on an inner ancestor alone is drawn only at the snackbar's next render there.

**Status colors (SNK-21, SNK-31…33).** Four parts are drawn at an opacity of the component's, each applied to that part's
color — `color-mix(in srgb, <color> calc(<opacity> * 100%), transparent)` — and never as an element's `opacity`, so
nothing else fades with it: not the focus indicator, a ripple, a child or the bar. At 1 the part is its color; at 0 it
draws nothing (`m3-like` and `cupertino` set the four so that nothing new is drawn).

| Part | Color | Opacity | How it is drawn |
|---|---|---|---|
| a status form's edge (SNK-31) | `<form>-outline-color` | `outline-opacity` | the first layer of the bar's `box-shadow`, `outline-width` of spread with no offset and no blur, before `container-elevation`'s layers: outside the bar, on its corners, over the elevation's ring and above its shadows. A shadow takes no room, and a control's focus indicator, a child's outline, is above it. The default and the inverse form have no such layer |
| the status glyph (SNK-21) | `<form>-icon-color` | `icon-opacity` | the glyph's `color` |
| the message under a title (SNK-32) | `<form>-supporting-text-color` | `supporting-text-under-title-opacity` | the message's `color` while `headline` is not blank; whole without one, and the title always whole |
| the action's tonal layer (SNK-33) | the action's content color of its form and state (`currentColor`) | `action-tonal-layer-opacity` | the `::before` of the action's label, filling the action to its corners one step under the content of the action's stacking context: above the container color of the state and — later in the same order — above a ripple, under the label; `pointer-events: none`. Not on the expand or the close button; hidden where colors are forced |

The action's container color is its bar's (`action-<state>-<form>-container-color` at rest), so the state layers mix
into the bar's color and the tonal layer lies over the result.

**Aligned to the top (SNK-29).** The first line of the text — the title's, or the message's without one — is centred half
of `container.min-height` below the bar's top edge, or lower where `container.padding-block` plus half that line is more
(enlarged text): that is the bar's padding above the text, `max(padding-block, (min-height − line) / 2)`. The status glyph
and the first row's controls are centred on that line; everything else follows below, `padding-block` under the text, and
any height the bar has beyond its content lies below it. A one-line bar is therefore what it was — its line and its
controls in the middle of a `min-height` bar — and nothing in the first row depends on the bar's height, so nothing of it
moves while the bar expands or collapses. An action on its own row is held to the bar's bottom edge through the motion (the
text's row takes the height in between).

**The bar (SNK-14…16, SNK-18, SNK-21…23).** A grid of the status glyph, the text (the status label, visually hidden, then
the title and the message) and the controls: at least `container.min-height`, as wide as its content between
`container.min-width` and `container.max-width` and never wider than the space it has (the window less the margins, or its
container when drawn in place), on `container.color` — or its form's — with its elevation and corners; the
glyph or the text after `padding-inline-start`, `padding-block` below the text and at least as much above it (SNK-29), and `padding-inline-end` — or
`padding-inline-end-with-controls` after the last control. A status form draws its glyph (`icon.size`, `icon.gap` before the
text, unselected, never mirrored, `aria-hidden`), its title, message and glyph in its form's `title` / `supporting-text` /
`icon.color`, the action from `action-<state>-<form>-*`, and gives the expand and close buttons its tone (SNK-34). The title is
`title.typescale`, `title.gap` above the message. Collapsed, the title and the message each end with an ellipsis at
`title.max-lines` / `supporting-text.max-lines` (`-webkit-line-clamp`, which every engine draws); the whole text stays in the
accessibility tree. The controls come `container.gap` after the text, `controls.gap` apart, centred on the text's first line
(the title's when there is one; their margins overlap the padding rather than growing the row). When the title and the
message together would need more than two lines beside them, or the action's label would not fit, the action moves to its own
row: end-aligned, `container.gap` below the text, with `padding-inline-end-with-controls` below it (measured with the action
inline and the text collapsed, on every resize); the expand and close buttons stay on the first row. The label never wraps.
Everything is logical, so RTL mirrors.

**Expanding and scrolling (SNK-23…25).** The expand button is drawn while the title or the message is cut at its limit
(measured as drawn, collapsed), holding `expand_more`, or `expand_less` while expanded; it is named by `expand-label`, and
the native button the Button draws carries `aria-expanded` and names the text by `ariaControlsElements` (an id cannot be
named across the Button's shadow root). Activating it toggles `expanded`, fires `expandedchange` and
keeps focus. The bar grows or shrinks from its previous height over `motion.expand-duration` / `-easing` (a Web Animation of
`block-size`, what is outside clipped meanwhile; at once where motion is reduced); in a host its bottom edge stays in place,
drawn in place its top does. Expanded, the bar is at most the height it has — the window less the margin above and below,
the safe area and the keyboard in a host, the height it is given in place — and the text scrolls inside it under the glyph,
the controls and an action on its own row. While it scrolls, the text is a tab stop (`tabindex="0"`, the inside focus ring;
the browser scrolls it by the arrow keys, Page Up and Page Down), a `role="group"` named by the title when there is one.

**The action (SNK-2…7).** A native `<button>` in the shadow root: its label (`controls.label.typescale`,
`controls.padding-inline`, at least `controls.height` — a small Button's height, so that it is as tall as the Buttons beside
it — a tonal pill on `action.container.color`), on `controls.shape` corners and from its own tokens per state (`action-*`).
Everything else is Button's: the state precedence, press-hold, the four `pressed-feedback` answers, ring or glow around the
control, corner smoothing (the action is a pill, which no smoothing eases), the minimum target as `::before`. It is centred
on the text's first line by its height or, under enlarged text, its label's line, whichever is taller.

**The expand and close buttons (SNK-34).** `<tanrei-button size="small">` elements in the shadow root, each holding its glyph
in a `.glyph` box in the icon slot. The snackbar gives them, through the Button's internal channel, the variant
`--tanrei-comp-snackbar-close-button-variant` names (read with `compChoice()` at each layout, so a system switch is seen at
the next one) and one tone, `{ color: 'var(--_button-tone)', focus: 'var(--_button-tone-focus)' }`: each form's block sets
those two properties on the bar to its own message and focus colors, so a change of form recolors the Buttons with no word
to them. A Button draws its glyph, its circle and its states in the tone (BTN-45); everything else is its own.

**The focus indicator (SNK-3)** is drawn on the bar, so the bar names its color: the outer stroke — around the action,
inside the scrolling text, and the halo's outer color under `glow` — is the form's `focus-ring-color`
(`--tanrei-comp-snackbar-focus-ring-color`, `-info-…`, `-inverse-…`, `-inverse-info-…`), handed to `focusRing()` as its
`color`, and the same color is the tone's focus color, which the Buttons draw their own indicator in; the widths, the offset
and an inner stroke stay the system's. **Glyphs (SNK-26)**: until the icon set can draw a glyph's ligature — its face loading, failed to
load, or never registered — its box is kept and drawn empty (`GlyphDrawnController`), never as the glyph's name; the glyph
appears once the face draws it.

**Drawn in place (SNK-19).** A `<tanrei-snackbar>` that is not a host's child is drawn where it is, at rest: no popover,
timeout, queue, entrance or announcement. It still fires `action`, `dismiss` and `expandedchange` (and stays: there is no host
to close it). Parts: `container`, `icon`, `text`, `title`, `supporting-text`, `action`, `expand`, `close`.

## `<tanrei-calendar>`

Shows one month as a grid of days, in the page or inside a picker, lets a person choose one date or one range of
dates from it, and moves from month to month as one column of weeks that follows a scroll and a drag
(`specs/calendar.spec.json`, CAL-1…34).

```html
<tanrei-calendar id="check-in" label="Check-in date" value="2026-09-17" min="2026-09-01"></tanrei-calendar>
<tanrei-calendar id="stay" mode="range" label="Stay" show-adjacent-days></tanrei-calendar>

<script type="module">
  const checkIn = document.querySelector('#check-in');
  checkIn.isDateDisabled = (iso) => bookedDays.has(iso); // a rule no list can hold
  checkIn.addEventListener('change', (e) => save(e.detail.value)); // checkIn.value is already the new date
  document.querySelector('#stay').addEventListener('change', (e) => show(e.detail.start, e.detail.end)); // end "" after a start alone
</script>
```

| `<tanrei-calendar>` | Type | Default | |
|---|---|---|---|
| `mode` | `single` \| `range` | `single` | one date in `value`, or one span from `start` to `end`; reflected |
| `value`, `start`, `end` | string | `""` | ISO 8601 calendar dates ("2026-09-17"), no time and no time zone. The calendar sets them itself before it fires `change`; a date you set outside the displayed month shows that month. `value` in range mode, `start`/`end` in single mode, an end before its start and anything that is not a calendar date are ignored and reported (CAL-27) |
| `min`, `max` | string | `""` | the earliest and latest dates that can be chosen, and the ends of the year list (1900–2100 without them); min after max ignores both (reported) |
| `disabled-dates` (`disabledDates`) | string[] | `[]` | dates that cannot be chosen: a space-separated list or a JSON array |
| `isDateDisabled` | `(iso: string) => boolean` | `null` | property only: a rule no list can hold (every weekend); a day is unavailable when either says so |
| `today` | string | `""` | the date drawn as today; empty reads the device's date in its own time zone, and again at the next local midnight |
| `first-day-of-week` (`firstDayOfWeek`) | `locale` \| `sunday` … `saturday` | `locale` | the weekday in the first column; `locale` asks `Intl.Locale`'s week information, or CLDR's weekData for the locale's region where the browser has none (Firefox) |
| `locale` | string | `""` | a BCP 47 tag for month and weekday names, digits and the first day of the week, all from `Intl`; empty: the nearest `lang` attribute (through shadow roots), then the browser's language. Always the Gregorian calendar |
| `start-view` (`startView`) | `day` \| `year` | `day` | whether it first shows a month or the list of years (a birthday) |
| `show-adjacent-days` (`showAdjacentDays`) | boolean | `false` | fills the spare cells with the neighbouring months' days, drawn quieter; they can be chosen without turning the month |
| `label` | string | `""` | the name of the whole calendar (a group); a picker that holds it names it itself |

**The calendar has no words of its own (CAL-35).** Its six are the product's — each the instance's attribute, else
the [product's words](#the-products-words-setwords) of the same name: `start-label` and `end-label` (a
range's start and end days' descriptions), `previous-month-label`, `next-month-label`, `year-view-label` (the view
toggle's description) and `today-label` (read after the current year; today's date is `aria-current="date"`). Without
them the navigation buttons and a range's ends are still drawn and work, unnamed and undescribed, and each is reported
once; the view toggle has no description; and the present day's word is the locale's own, from the browser
(`Intl.RelativeTimeFormat`: "today", "今日") — the one word the calendar takes from anywhere else.

| Event | When |
|---|---|
| `change` | the person chose a day that changes the choice (a range's start, then its end). `CustomEvent<{ value, start, end }>`; the element already holds them. Bubbles; not composed (as a native `change`) |

**Drawing (CAL-1…7, CAL-15, CAL-16, CAL-18…22, CAL-25, CAL-26).** No surface and no padding: the host is seven cells of
`cell.size` (never under the minimum target: `sys.target.pointer`, or `sys.target.touch` under a coarse pointer) wide,
and never wider than its container, where the columns narrow equally and the numbers keep their size. Six week rows are
always drawn, so the height does not change with the month. A day is a gridcell holding a circle of `day.container.size`;
its condition (selected, in-range, today, adjacent, unselected, by precedence) and its state (hover, keyboard focus,
press, unavailable) pick every color and the opacity from the tokens, over the state motion. An in-range day's container
is the band across its whole cell, and a range's start and end draw the half of their cell toward the other; a press of
an in-range day answers on its band, the focus ring stays around the circle. The view toggle (the month and year and the
`expand_more` chevron, turned in the year view) is drawn with the unselected condition, a year like a day of its
condition. The press is the Button's (press-hold, and `sys.behavior.pressed-feedback`: see "Choices of kind"), and so are
the ring or glow and the corner smoothing of the containers. The previous and next buttons are `<tanrei-button
variant="text" size="medium">` with a glyph of the icon set and no label, drawn with their own tokens. Right to left
mirrors the grid and the navigation row.

**The axis (CAL-5, CAL-11, CAL-14).** `comp.calendar.navigation.axis` is read from the cascade whenever the calendar renders
and at each wheel or drag (a system switched on the document's root renders it again: `SystemWatchController`).
Vertical (the default): the buttons draw `arrow_upward` and `arrow_downward`, a wheel's `deltaY` and a vertical drag
move the month, and the grid keeps `touch-action: pan-x pinch-zoom` so the page keeps its horizontal pan.
Horizontal: `arrow_back` and `arrow_forward` (the same names right to left: each Button's icon helper mirrors its glyph, BTN-19), `deltaX` and horizontal drags, `pan-y`. A scroll
across the axis, and one that zooms (`ctrlKey`), is left to the page. The day and year views cross-fade. The keys are the
same on either axis.

**One column of weeks, one progress (CAL-14, CAL-29).** A month is a window of six rows on an unbroken column of week
rows. While a change plays, a scroll is followed or a drag lasts, the grid holds more than one view — the displayed month's and the ones the
days move between, earliest first — and everything in between is drawn from ONE custom property on the grid,
`--_tanrei-calendar-progress` (0 at the first view, 1 at the next; the element writes it, and no one registers it),
with no threshold:

- **Vertical:** the rows of every view are one keyed list (a week two months share is one element, which travels), offset
  by the progress times the rows between the views (four or five; six for months that are not neighbours) and clipped to
  the grid's six rows. A day a view does not draw (a row outside its six, an empty cell without `show-adjacent-days`) has
  the progress, or its complement, as its opacity; a day that is a neighbouring month's in one view and the month's own
  in the other paints `color-mix()` of the adjacent and the unselected tokens of the state it is in. A day both views
  draw alike — today's ring, a chosen day, a range's band — only travels.
- **Horizontal:** each view is a page, side by side in order (a later month toward the end: the left, right to left),
  travelling together by the progress.

A scroll and a drag **write** the progress where the hand is; a button, a key, a step of a detented wheel or a chosen
neighbouring day **sends** it there over `motion.page-duration` with `motion.page-easing` — by a clock of the
element's (an animation of the grid with no effect, whose `id` is the property's name) and one write in each frame,
since what is drawn from it are steps and clamps of it that no transition of a real property could follow, and a
registered property that could transition would make every transition of the page dear ("A page that changes its
tokens at run time", above). Every way of moving the month moves
this one progress, and one that begins while the days are moving — a change after a change, a scroll during a change, a
button or a drag during a scroll — keeps the views on screen and goes on from the value drawn, so nothing jumps. At rest the grid holds the displayed month alone and the progress is 0: nothing at rest is
drawn differently. Where motion is reduced a month changes at once.

**Following a scroll (CAL-33, CAL-34).** A `wheel` event over the day grid along the axis is the calendar's (prevented,
also at `min`'s or `max`'s month, where the days stop). One reported in pixels (`deltaMode` 0: a trackpad, and a wheel
the browser reports so) moves the days by that distance in the same task — no factor, no least amount — through month
after month: when the days reach a neighbouring month's view that month is the displayed one (the title, the grid's
name, the active day and focus as any month change; no announcement yet) and the scroll carries on with what is left.
One reported in lines or pages (`deltaMode` 1 or 2: a detented wheel, in Firefox) moves one month a step, as the next
button does. The web is told neither a scroll's end nor its momentum, so the end is read from the events: 150 ms without
one, or the scroll having slowed below 0.1 px per ms over its events of the last 100 ms. Three things about that second
rule are the web's reading of it and are tested: the speed is the distance of the last 100 ms' events over 100 ms; a
scroll that never was that fast has not slowed, and is followed until it is quiet (a slow, deliberate scroll is not cut
short); and once it has ended by slowing, later events move nothing until one is half as fast again as the threshold
(0.15 px per ms) or 150 ms pass — a momentum tail's speed, read from whole pixels, wavers about the threshold as it falls
through it. When the scroll ends the days settle over the page motion on the neighbour from a quarter of the way on
(about one week row), and otherwise return; the month is announced once, if it is not the one shown when the scroll
began. A `value` set meanwhile and the year view cancel it (the days return; what is left of the scroll is ignored).
Known limit: a wheel the browser reports in pixels a few at a time (macOS, turned slowly) returns after each notch
.

**Following a drag (CAL-30…32).** A press of touch, a pen or the primary mouse button on the day grid that moves past
8 px, further along the axis than across it, is the calendar's (`setPointerCapture`, so the pointer is followed outside
the grid too; another mouse button takes none, a press that ends inside the 8 px is still a click that chooses the day,
and a drag across the axis stays the page's for its whole length). While it lasts the calendar carries `data-dragging`:
nothing in it is hit, so no day is drawn hovered, and a fine pointer shows `cursor: grabbing` over it (outside the
calendar the cursor is the page's own); the grid is `user-select: none` and cancels `dragstart`, so nothing is selected
or picked up. The day under it lets go of its pressed state, no day is chosen, and from then on each pointer move
**writes** the progress in the same task — the days are where the pointer is, measured from the press — at most to the
neighbouring month's view and never past `min`'s or `max`'s month. Nothing the calendar exposes changes meanwhile: the
view toggle, the grid's name, the active day, focus and `value` stay, and what is coming into view is `inert` and
`aria-hidden`. The release chooses the neighbour from a quarter of the way on, as the end of a scroll does, or the one a
fling of 0.5 px per ms is toward (a mouse flings as a finger does); another month is shown as any month change is — the day number carried, one polite announcement — and the
progress transitions there from where the pointer left it; the displayed month has the days return, and announces
nothing. A cancelled pointer, Escape (spent on the drag), a `value` set meanwhile and the year view return them too.
Where motion is reduced the days still follow the pointer and land at once. A drag never emits `change`.

**A month button that reaches the first or the last month (CAL-13)** is disabled under the focus it holds, and a
disabled button holds none. Focus stays in the calendar: it goes to the other month button — the one that leads back —
within the turn, once that button has drawn itself enabled, so focus is never on nothing and a docked picker around the
calendar hears nothing leave; where the other one is disabled too, to the active day. The sentence says "keep focus
where it was", which a disabled button cannot.

**A chosen day of a neighbouring month (CAL-13, CAL-15).** With `show-adjacent-days`, pressing an available day of the
previous or next month chooses it — `change` first — and then shows its month with the same motion; the chosen day is
the active day and takes focus if focus was in the grid. An unavailable one does nothing.

**Keys (CAL-10…13).** The grid is one Tab stop (the active day): the arrows move by a day in the direction they point
(mirrored right to left) or a week, Home and End to the ends of the week row, Page Up and Page Down by a month and with
Shift by a year, never past `min` or `max`; unavailable days are reached, never chosen. The year list is one Tab stop
too (arrows by a year or a row, Home and End). Every month change keeps focus where it was and announces the new month
once, politely (a live region in the shadow root); a focused day that leaves the view hands the focus to the new active day. `focus()` moves focus to the active day, or to the displayed year in the
year view.

**Differences from the other platforms.** A year's selected state is `aria-current="true"` on its `<button>`, which has
no `aria-selected`. Parts: `navigation`, `view-toggle`, `grid`, `day`
(`data-date`, `data-adjacent`), `years`, `year` (`data-year`). The fixtures are drawn by the test harness
(`test/harness.ts`) at their natural size, centred on a 400 × 440 stage of the surface color.

## `<tanrei-date-time-picker>`

Lets a person choose a date, a time, or a date and time — or a span of any of them — from a Calendar and time wheels or
a clock dial, in a dialog or in a surface that drops down from a field (`specs/date-time-picker.spec.json`, DTM-1…47).

```html
<!-- A modal picker for a time, opened from any button. -->
<tanrei-button id="alarm-button" variant="outlined">Alarm</tanrei-button>
<tanrei-date-time-picker id="alarm" mode="time" value="07:30" minute-step="5" label="Alarm"></tanrei-date-time-picker>

<!-- A docked picker below a text field, opened by the field's picker button (TXF-32, TXF-33). -->
<tanrei-text-field id="due" label="Due date" type="date" picker picker-label="Choose date"></tanrei-text-field>
<tanrei-date-time-picker id="due-picker" presentation="docked" anchor="due"></tanrei-date-time-picker>

<script type="module">
  const alarm = document.querySelector('#alarm');
  document.querySelector('#alarm-button').addEventListener('click', () => (alarm.open = true));
  alarm.addEventListener('change', (e) => save(e.detail.value)); // "07:35": alarm.value is already the new one
  alarm.addEventListener('close', () => (alarm.open = false)); // e.detail.reason: escape, outside, cancel, confirm…

  const field = document.querySelector('#due');
  const due = document.querySelector('#due-picker');
  field.addEventListener('pickerrequest', (e) => {
    due.value = e.detail.value;
    due.open = true;
  });
  due.addEventListener('change', (e) => (field.value = e.detail.value));
  due.addEventListener('close', () => (due.open = false));
</script>
```

| `<tanrei-date-time-picker>` | Type | Default | |
|---|---|---|---|
| `open` | boolean | `false` | whether it is shown; reflected. **The picker never closes itself**: set it to false when it fires `close` |
| `presentation` | `modal` \| `docked` | `modal` | `modal`: a dialog over a scrim with a title row, Cancel and OK, committed by OK. `docked`: below `anchor`; a date alone is committed by choosing it, anything with a time by OK. Reflected |
| `mode` | `date` \| `time` \| `date-time` | `date` | what is chosen; reflected |
| `range` | boolean | `false` | a span from `start` to `end` instead of one `value`; a time range's end at or before its start is on the next day; reflected |
| `value`, `start`, `end` | string | `""` | the strings of `<input type=date>`, `type=time` and `type=datetime-local`: "2026-09-17", "19:30", "2026-09-17T19:30". The picker sets them itself before it fires `change`. Anything not in the mode's form, `value` with a range, `start`/`end` without one and a date-time end before its start are ignored and reported (DTM-40) |
| `min`, `max`, `disabled-dates`, `isDateDisabled`, `today`, `first-day-of-week`, `start-view`, `show-adjacent-days` | | | passed to the calendar (see `<tanrei-calendar>`); times are not bounded |
| `locale` | string | `""` | a BCP 47 tag for names, digits, date and time forms, the separator between hours and minutes, the period names and the preferred clock, all from `Intl` (`formatToParts`, `resolvedOptions().hourCycle`); empty: the nearest `lang`, then the browser's language |
| `hour-cycle` (`hourCycle`) | `locale` \| `h12` \| `h23` | `locale` | h12: 1–12 with a period (AM, PM: the period wheel or the period selector); h23: 00–23, no period; locale: the locale's clock (0–11 as h12, 1–24 as h23). The web does not report a device-wide 12/24-hour choice, so the locale decides (DTM-16) |
| `minute-step` (`minuteStep`) | `1` \| `5` \| `10` \| `15` \| `30` | `1` | the minutes offered; a time off the step is rounded down (DTM-8). Another number behaves as 1 (reported, DTM-17) |
| `entry-mode` (`entryMode`) | `wheels` \| `dial` | `wheels` | how the time is set when it opens (not HTML's `inputmode`); ignored while the system offers one mode |
| `unit` | `hour` \| `minute` | `hour` | dial mode: the unit shown, and the selector focused, when it opens |
| `layout` | `auto` \| `vertical` \| `horizontal` | `auto` | the calendar above the time section or beside it; `auto` is horizontal only when the window is too short for vertical and wide enough for horizontal, decided again when the window changes; reflected |
| `anchor` | string | `""` | docked: the id of the element the surface is placed below, in the picker's own document or shadow root |
| `opener` | string | `""` | docked: the id of the element that opens it, when it is not the anchor. The element (or, for a component with a shadow root, the control inside it that says it opens a dialog — a text field's picker button — else its first button) gets `aria-haspopup="dialog"` and `aria-expanded`, and `aria-controls` where it is in the picker's own tree |
| `inline` | boolean | `false` | for tests and documentation: the open surface drawn in place, without the overlay's behaviour |

**The picker has no words of its own (DTM-48).** `label` is required and this instance's alone — what is being chosen
("Check-in", "Meeting time"): the surface's name and the title; empty, the title row draws no words and keeps its
height, the surface has no name, and it is reported. The other eighteen are each the instance's attribute, else the
[product's words](#the-products-words-setwords) of the same name: `date-label` (what the header writes for a date not chosen yet: a single value's, and either end's
of a range), `start-label`, `end-label` (never drawn: the accessible names of the two range fields and the calendar's
start and end descriptions), `confirm-label`, `cancel-label`, `hour-label`, `minute-label` (the spin buttons' names),
`wheels-label`, `dial-label` (the accessible names of the two entry-mode tabs, which draw glyphs alone),
`entry-mode-label` (the tab list's name), `period-label` (the period spin button's name), `range-label` (the range
display's name),
`next-day-label`, `range-error-text`, and the calendar's `previous-month-label`, `next-month-label`, `year-view-label`
and `today-label`. Without a word that is drawn, a mark without words stands in its place where one says the same —
icon-only Buttons with `close` and `check` for Cancel and OK (the same variant, size and place), `+1` in the locale's
digits for "next day" — and otherwise nothing is drawn and the place keeps its height (a date not chosen yet, the
error line). The hour's, the minute's and the period's names and the present day's word are the locale's own, from
the browser (`Intl.DisplayNames`, `Intl.RelativeTimeFormat`). Every control is still drawn and works without its name;
each missing word is reported once.

| Event | When |
|---|---|
| `change` | a committed choice that differs from the one it opened with — OK, or choosing a date in a docked picker for a date only. `CustomEvent<{ value, start, end }>`; the element already holds them. Always before the `close` it causes. Bubbles and is composed |
| `close` | the picker asks to be closed: `detail.reason` is `escape`, `back` (modal: a close request without a key, Android's back, which arrives as the `<dialog>`'s `cancel`), `outside` (the scrim, or a press outside a docked picker and its anchor), `tab` or `focus-out` (docked), `cancel`, `confirm` or `select` |

**The overlays (DTM-1…5, DTM-35).** A modal picker is a native `<dialog>` in the shadow root opened with `showModal()`,
as `<tanrei-dialog>` is: the top layer, `::backdrop` as the scrim, everything else inert, the page's scroll held, focus
trapped, centred at least `modal.container.margin` from the edges and above the on-screen keyboard; it fades in and grows
from `modal.motion.enter-scale` and fades out, only fading where motion is reduced. A docked picker is a manual popover
placed by script with the menu's `placeMenu`: `docked.offset` below its
anchor with the start edges aligned, flipped above when there is more room there, shifted to stay
`docked.viewport-margin` inside the viewport, its height limited to the room, following the anchor (by events, `FollowController`); it
grows from the edge that faces the anchor and fades out (at once where motion is reduced). It traps nothing: Tab out of
it asks to close (`tab`) and focus goes on from its anchor; focus moving elsewhere asks to close (`focus-out`); a press
outside it and its anchor asks to close (`outside`) **and also reaches the element under it**, as the menu's does. Both
move focus in when they open — to the calendar's active day (or year), the hour wheel, or the selector of `unit` — with
the ring only when the picker was opened from the keyboard, and give it back when they close.

**Choosing (DTM-6…8, DTM-11, DTM-33).** Every picker but a docked one for a date only holds a pending choice from opening
to OK — a `value` you set meanwhile does not move it — and OK is disabled while it is incomplete or a date-time range's
end is before its start (the error line then shows `range-error-text`, announced once, and the end's range field is
described by it; a `<button>` has no invalid state, so none is set). An empty time starts at the device's time, rounded
down to the step. In a date-time range, choosing a start in the calendar selects the start's range field and an end the
end's.

**Layout (DTM-9, DTM-10, DTM-12, DTM-34, DTM-36, DTM-39).** The title row — the label at the start, the entry-mode tabs
at the end — and, in a modal picker with a date, the pending value ("Thu, Sep 17, 7:30 PM"; "Sep 10 – Sep 16"; a date
not chosen yet is `date-label`, for either end: "Sep 10 – Date") and a divider; then the body (the calendar and the time section, `container.gap` apart, stacked or side by side; on a phone the
calendar above the time, scrolling — no steps), the error line and the actions. The time section is at least the dial's
width, top to bottom: the range display across its whole width, the time display (dial) and the wheels or the dial — the
time display is always the row next to the dial, and there is no row of tabs in the section. Where the system offers both
entry modes the section is as wide in the one as in the other — the wider of what the two need, measured with a copy of
the other mode's rows that is never drawn (`.other-mode`: no height, `visibility: hidden`, `aria-hidden`) — so switching
does not change the picker's width. With `layout="horizontal"` and mode `time` the range display spans both columns, the
time display is the start column and the dial the end column, each centred on the other; the wheels mode has one row
below the range display and is drawn as the vertical layout is, in the width the dial mode's two columns take. The
picker's only tabs are the entry-mode tabs, `<tanrei-tabs variant="secondary">`: two icon-only tabs that hug
(`icon="keyboard"` named `wheels-label` first, `icon="schedule"` named `dial-label`; `label-hidden`). Cancel and OK are `<tanrei-button
size="medium">`s in the variant `comp.date-time-picker.actions.variant` names, placed as a full-width Button group
places a dismissive and a confirming item (`ActionPlacement`): a row they share (`fill`) or at their own widths at the
end (`end`), a column with OK on top when a label does not fit. On a short window the body scrolls between the header and
the actions, and everything scrolls when they would leave it less than a wheel row. Right to left mirrors the title row,
the columns, the tabs, the side the period stands on, the range display and the actions, never the hour–minute order
or the dial.

**The period (DTM-14, DTM-46, DTM-47).** With the 12-hour clock the period is a part of the time (`part="period"`),
`period.gap` after the minute — or before the hour where `Intl.DateTimeFormat.formatToParts` puts the `dayPeriod` first
(ja, ko, zh). The hour, the separator and the minute are one left-to-right run (`.digits`, `dir="ltr"`) and the period
is its sibling, so in a right-to-left layout "after the minute" is at the left. In the wheels mode it is the **period
wheel**: two rows, the name before noon above the one after, that do not run on, at least `period.container.width` wide,
in `period.label.typescale`, on its own selection container or on the joined band; a drag or a scroll moves it to its
first or last name and no further, a press on the other name's row settles it, and so does a press on the middle row — a
period is not typed, so its control is a `<div role="spinbutton">`, not an input. In the dial mode it is the **period
selector**: a cell at least `period.container.width` wide and as tall as the selectors that shows the pending name and
changes to the other on a press, Enter or Space; it is a selector of the `unselected` condition in every state (hover,
focus, press, ring, target) and never takes `selected`, which marks the unit the dial sets. Both hold the two names in
one place, so the part is as wide as the wider needs whichever it shows. Either is one spin button named `period-label`
with `aria-valuemin="0"`, `aria-valuemax="1"` and the name as `aria-valuetext`: Up and Down change it (Right and Left too
on the period selector, in every layout direction), Home is before noon, End after, Enter and Space change it, a digit
or a letter is ignored. It is one Tab stop where it is drawn; opening still focuses the hour. A change keeps the hour's
number and the minute, leaves the handle where it is, never changes the unit the dial shows, and commits nothing by
itself. The 24-hour clock draws none.

**The range display (DTM-15, DTM-27…32, DTM-42).** A range that has a time shows its two ends as two range fields joined
by an en dash — "9:00 AM – 5:30 PM" — in a `role="group"` named `range-label`; no word says start or end. Each field is a
`<button part="range-field">` holding its end's time (a `<bdi>`, and `next-day-label` after an overnight end), named
"Start, 9:00 AM" by `start-label` or `end-label`; the display is the first row of the time section and as wide as it
(both columns of mode time's horizontal layout), the two fields equally wide and filling it, and they narrow equally and
wrap in a narrow picker. The one the wheels, the time display, the period and the dial set is `aria-pressed="true"` and drawn from
the `selected` selector tokens, the other from `unselected`, in every state, with the Button's press and the ring. A
press, Enter or Space on the other selects it (ending a typed entry first); focus alone does not, so Tab passes the end's
field on its way to the wheels. The dash is `aria-hidden`. Right to left the start's field is at the right of the dash.

**The wheels (DTM-18…20, DTM-43…45).** Each wheel's control is its middle row: an `<input inputmode="numeric"
role="spinbutton">` (`aria-valuenow`, `-min`, `-max`, `-text`: "7 AM") that is read-only until a number is typed into it,
so that a drag raises no on-screen keyboard; the rows are `aria-hidden`. Each wheel's chosen value stands on a selection
container of its own; where `comp.date-time-picker.wheel.selection.span` is `joined` (cupertino) one band lies behind
both and the separator — and behind the period wheel, with the 12-hour clock. The rows are drawn around the value and run on past the list's ends; a drag (pointer capture,
`touch-action: none`, past 8 px) moves them with the pointer, and on release the nearest row — carried on by the
release's velocity — settles over `motion.wheel-duration` and its value is taken once settled; a press on a row above or
below settles that row; a wheel scroll moves them and settles when it stops. Up and Down, Page Up and Page Down (five
minutes, step 1), Home and End change the value and the rows follow over the same motion. A wheel draws no hover or press
state; its ring (or glow) is inside its selection container, for focus that came from the keyboard — the wheel says so
itself (`data-ring`), since a text input matches `:focus-visible` however it was focused. Focus that typing moves
on to the minute wheel is keyboard focus, and a wheel a press focused becomes keyboard-focused once a key or typed text
works it (a digit, a key that moves it or ends its entry): the wheel that has focus then shows the ring, so that where
the next digit goes is always drawn.

**Typing a number (DTM-22, DTM-43…45).** A press on a wheel's middle row that ends without a drag, or a digit typed while
the wheel has focus, begins a typed entry: the input takes text (the number keyboard on a touch device), and the wheel's
container, value and outline are the `selected` selector's for as long as it lasts. Digits — ASCII or the locale's — are
shown in place of the value. A second digit joins the first where the two make a value; where they do not (1 3 on the
12-hour clock) the hour ends with the first and the second begins the minute. An entry ends by two digits or by one that
none could join, by Enter (which presses no OK), Tab, focus leaving, a press elsewhere, a drag or a scroll of the wheel,
and the keyboard being dismissed (`visualViewport`); an hour's that ends by its digits, or by the separator, a colon, a
full stop or a space, moves focus to the minute wheel, whose input goes on taking text so that the keyboard stays up. What
was read becomes the pending value — a minute rounded down to `minute-step`, an hour of the 12-hour clock in the pending
period — or, when nothing was typed or it is no value, the wheel keeps the one it had. Escape ends the entry with the
value before it and closes nothing; a second Escape closes. Backspace removes the last digit; other characters are
ignored; text from an on-screen keyboard or a paste is read from the input's `input` event, character by character. The
dial mode's selectors read digits from a keyboard by the same rules, shown as the selector's text, with no input and so
no on-screen keyboard. Nothing is emitted: OK commits the time.

**The dial (DTM-21…26).** The hour and minute selectors are spin buttons (Up and Right the next value, Down and Left the
previous) drawn from their conditions' state tokens, with the Button's press (see "Choices of kind"); focusing or pressing
one shows its unit on the dial. The dial is drawn in HTML (`aria-hidden`), `direction: ltr` so it runs clockwise in every
direction; a press or drag sets the value under the pointer at once (the nearer ring for 24 hours, a minute of the
step), and the end of a press on the hour dial shows the minutes and moves focus to the minute selector if it was on the
hour's. The handle turns along the shorter arc over the dial motion (a copy of the numbers inside it, turned back).

**Choices of kind.** `comp.date-time-picker.time.entry-modes`, `wheel.selection.span`, `actions.variant` and `actions.arrangement` are read from
the cascade whenever the picker renders or lays out (and again when a system is switched on the document's root:
`SystemWatchController`); the arrangement is drawn from `data-arrangement` on the surface. Parts: `container` (and its
`::backdrop`), `header`, `calendar`, `time`, `range-display`, `range-field` (`data-end`), `range-separator`, `wheel`,
`selector`, `period`, `separator`, `dial`, `handle`, `error`, `actions`. The
fixtures are drawn by the test harness: a modal one in a 480 × 720 window (800 × 640 for a horizontal layout) on a
`surface` page, the baseline being the window; a docked one in place on a stage of that size.

## `<tanrei-dialog>`

Stops a person for a decision the task cannot go on without, in a surface that dims and blocks everything behind it
(`specs/dialog.spec.json`, DLG-1…24).

```html
<tanrei-button id="discard">Discard</tanrei-button>
<tanrei-dialog headline="Discard draft?" supporting-text="The message you were writing will be deleted from this device.">
  <tanrei-button slot="actions" variant="text" autofocus onclick="this.closest('tanrei-dialog').open = false">Cancel</tanrei-button>
  <tanrei-button slot="actions" variant="text" onclick="discard(); this.closest('tanrei-dialog').open = false">Discard</tanrei-button>
</tanrei-dialog>
<script type="module">
  document.querySelector('#discard').addEventListener('click', () => (document.querySelector('tanrei-dialog').open = true));
</script>
```

| `<tanrei-dialog>` | Type | Default | |
|---|---|---|---|
| `open` | boolean | `false` | whether it is presented; reflected. Actions never close it: set it to false from their handlers |
| `headline` | string | `""` | the question or statement; the accessible name (an empty one is reported, DLG-14) |
| `supportingText` / `supporting-text` | string | `""` | what will happen; the accessible description |
| `alert` | boolean | `false` | an `alertdialog`, read as soon as it opens; reflected |
| `closedBy` / `closedby` | `any` \| `none` | `any` | the spec's `dismissible`, as HTML's own attribute: `none` ignores Escape, back and the scrim (any other value is `any`); reflected |
| `dividerVisibility` / `divider-visibility` | `auto` \| `always` \| `scroll` | `auto` | when the dividers are drawn while the supporting text and the content scroll: `always` for as long as they scroll, at their top included; `scroll` below the headline only once scrolled and above the actions only while more lies below; `auto` takes `comp.dialog.divider.visibility` (always in the default system, scroll in cupertino and m3-like). Anything else is `auto`, reported (DLG-24); reflected |

Slots: default (custom content: it gets `content.color`, and plain text the body role), `icon` (a glyph's ligature text,
drawn at `icon.size` in `icon.color`, unselected; with it the icon and the headline are centred), `actions` (Tanrei
Buttons, confirming last; laid out, never restyled).

| Event | When |
|---|---|
| `cancel` | the spec's `dismiss`: Escape, the platform's back or a press that starts and ends on the scrim, while `closedby` is not `none`. Cancelable, not bubbling: unless you `preventDefault()` the dialog closes itself, as a native `<dialog>` does |
| `close` | after every close (a dismissal, or `open = false`) |

**The overlay (DLG-1…5, DLG-13, DLG-15).** A native `<dialog>` in the shadow root is the container, opened with
`showModal()`: the top layer, `::backdrop` as the scrim (`comp.dialog.scrim.color`, one role as drawn), everything else
inert, and the page's scroll held (`overflow: hidden` on the root while any Tanrei dialog is open). Focus goes to the
slotted element marked `autofocus`, or to the dialog itself (`tabindex="-1"`, so the headline is read first), stays inside
(Tab from the last focusable element — through shadow roots and slots — wraps to the first, Shift+Tab from the first or
from the dialog to the last), and returns on closing to where it was (or is dropped when that element is gone). Escape is
answered on `keydown` — the browser's own close request, with its limit on repeated cancels, never runs — and only by the
topmost dialog; a close request without a key (Android's back) arrives as the native `cancel`, which the dialog turns into
its own. A dialog opened from another stacks above it with its own scrim; the first becomes inert. It fades in and grows
from `motion.enter-scale` over `motion.enter-*` (`@starting-style` transitions), and fades out over `motion.exit-*`, kept
in the top layer by `transition-behavior: allow-discrete` on `display` and `overlay`; where motion is reduced it only
fades. Firefox has no `overlay` transition, so there it leaves the top layer at once, without the fade. Focus moves when it opens and closes, not when the motion ends. A snackbar waits for, and
pauses under, an open dialog (`src/primitives/modal.ts`).

**Layout (DLG-7…12, DLG-16).** Centred in the window (above the on-screen keyboard, measured from `visualViewport`), at
least `container.margin` from every edge and the safe area, as wide as its content between `container.min-width` and
`container.max-width`, on `container.color` with its elevation and corners (eased by the smoothing). Its parts are inset
by `container.padding` and `container.gap` apart, an empty part left out, the actions `actions.margin-block-start` below.
The actions are a row at the end, `actions.gap` apart, and a column at the end when their widths do not fit the row. When
the dialog is taller than the window less the margins, the supporting text and the content scroll between the headline and
the actions, with a `divider.width` line in `divider.color` across the container below the headline and another above the
actions — both for as long as that part scrolls under `always`, and under `scroll` the first only once scrolled and the
second only while more lies below (DLG-24); when the scrolled part would have less than a line of room, the whole dialog
scrolls instead, with no divider. Everything is logical, so RTL mirrors. Parts: `container`, `icon`, `headline`, `supporting-text`, `content`,
`actions`.

## `<tanrei-bottom-sheet>`

Supplementary content or a short task in a surface that rises from the bottom edge: `standard`, over the lower part of
its parent while the content above stays usable (a layout region), or `modal`, a modal step over a scrim
(`specs/bottom-sheet.spec.json`, BSH-1…30).

```html
<tanrei-button id="share">Share</tanrei-button>
<tanrei-bottom-sheet label="Share photo" handle-label="Resize sheet">
  <tanrei-list>…</tanrei-list>
  <tanrei-button variant="text" onclick="this.closest('tanrei-bottom-sheet').open = false">Done</tanrei-button>
</tanrei-bottom-sheet>
<script type="module">
  const sheet = document.querySelector('tanrei-bottom-sheet');
  document.querySelector('#share').addEventListener('click', () => (sheet.open = true));
  sheet.addEventListener('close', () => (sheet.open = false)); // e.detail.reason: close, drag, scrim, escape or back
</script>
```

| `<tanrei-bottom-sheet>` | Type | Default | |
|---|---|---|---|
| `variant` | `modal` \| `standard` | `modal` | modal: over a scrim, everything else inert; standard: over the bottom of its parent, no scrim. Any other value is `modal`, reported (BSH-25); reflected |
| `open` | boolean | `false` | whether it is shown. Controlled: set it to false in answer to `close`; reflected |
| `detent` | `partial` \| `full` | `partial` | the height it rests at while its content is taller than its partial height. The element sets it when the person moves the sheet (and fires `detentchange`); setting it moves the sheet without an event. Any other value is `partial`, reported |
| `closedBy` / `closedby` | `any` \| `none` | `any` | the spec's `dismissible`, as HTML's own attribute (as on `<tanrei-dialog>`): `none` ignores a drag below the lowest height, Escape, back and the scrim; reflected |
| `handle` | boolean | `true` | draws the drag handle; its attribute is the inverse, `no-handle` |
| `handleLabel` / `handle-label` | string | `""` | the handle's accessible name while it is a button (an empty one is reported, BSH-11) |
| `inset` | boolean | `true` | insets the content by `container.padding`; its attribute is the inverse, `flush` |
| `label` | string | `""` | names the modal dialog or the standard sheet's region; where it is empty the headline does (with neither, it is reported, BSH-22) |
| `headline` | string | `""` | drawn in the header, an `<h2>` (BSH-28) |
| `closable` | boolean | `false` | draws the close button at the end of the header (BSH-29); reflected |
| `closeLabel` / `close-label` | string | `""` | the close button's accessible name (an empty one is reported while `closable`) |
| `dividerVisibility` / `divider-visibility` | `auto` \| `always` \| `scroll` | `auto` | when the divider below the header is drawn; `auto` takes `comp.bottom-sheet.divider.visibility` (an unknown value is `auto`, reported); reflected |

Slot: default (the content: it gets `content.color` as its color, and plain text the body role; it is laid out as you
lay it out). Mark the element that should take focus when the sheet opens with `autofocus`.

| Event | When |
|---|---|
| `close` | the sheet asks to be closed: `detail.reason` is `close` (its close button, whatever `closedby` says), `drag` (a release below half its lowest height, or a downward fling from it), `scrim`, `escape` or `back` (a close request without a key: Android's back). Only while `closedby` is not `none`; a standard sheet asks only by a drag. Not bubbling. The sheet never closes itself: set `open` to false, or leave it open and it settles back (BSH-20) |
| `detentchange` | the person moved the sheet to its other height, by a drag or with the handle: `detail.detent` (and `detent`) is the new one. Not fired when you set `detent` |

**Modal (BSH-1…3, BSH-5, BSH-23).** A native `<dialog>` in the shadow root opened with `showModal()`: the top layer,
`::backdrop` as the scrim (`scrim.color`), everything else inert, the page's scroll held and a snackbar waiting
(`src/primitives/modal.ts`, shared with the dialog and the modal drawer). Focus goes to the slotted element marked
`autofocus`, else the sheet itself (`tabindex="-1"`, so its label is read first) — also when it is mounted open — stays
inside (Tab wraps), and returns on closing to where it was (or is dropped when that element is gone). Escape is answered
on `keydown` and only by the topmost overlay; a native `cancel` becomes `close` with `escape` when an Escape key was just
pressed and `back` otherwise; the browser's own close is always cancelled, and should it close the dialog anyway the
sheet asks and shows itself again unless you close it. It slides up from below the bottom edge over `motion.enter-*`
(`@starting-style`) with the scrim fading in, and down over `motion.exit-*`, kept in the top layer by
`transition-behavior: allow-discrete` (Firefox has no `overlay` transition, so there it leaves at once, as the dialog
does). Where motion is reduced it fades in place. Mounted open, it appears in place without motion.

**Standard (BSH-3, BSH-4).** A `<section>` named by `label` (a region landmark). The host fills its nearest
positioned ancestor (`position: absolute; inset: 0`, letting every press through), so give the parent that holds the
sheet and the content it covers `position: relative`; the sheet is docked to that parent's bottom edge and never resizes
or pads the content (pad a scrolling content by the sheet's partial height yourself if it must stay visible). Nothing is
inert, Tab leaves it without closing it, Escape is ignored. Opening it moves focus in as a modal sheet does; closing it
with focus inside gives focus back; mounted open, it leaves focus where it is. Closed, it slides down out of view and is
inert (then `visibility: hidden`); a drag below its lowest height asks to close.

**The header (BSH-28…30).** While `headline` is not empty or `closable`, a row at least `header.height` high below the
handle's row (or at the top without one): the headline (`headline.typescale`, `headline.color`, an `<h2>`, wrapping) from
`container.padding`, and the close button — an icon-only `<tanrei-button>` of the small size showing the `close` glyph,
given `close-button.variant` through the Button's channel (`giveVariant()`, at every update) and otherwise never
restyled — `header.gap` after it and `header.padding-inline-end` from the end edge; then a `divider.width` hairline in
`divider.color` across the full width, always or only while the content is scrolled from its top (`divider-visibility`,
the shared style query of `src/primitives/divider-visibility.ts`). The header is outside the scrolling content, counts
in the sheet's heights, and a drag on it is the sheet's. The close button fires `close` with `close` in either form and
whatever `closedby` says. A sheet with no handle, no close button and `closedby` other than `none` is reported (BSH-30).

**Heights and the drag (BSH-6, BSH-9…11, BSH-20, BSH-21).** The sheet is as tall as its handle's row, its header and its content, up
to `container.partial-fraction` of the area (partial) or the area less `container.margin-block-start` (full). The area is
the window below `env(safe-area-inset-top)` (modal) or the parent (standard), ending at the on-screen keyboard
(`visualViewport`: the part of the layout viewport below the visual viewport). Content taller than that scrolls inside the
container, below the handle's row, and is then a Tab stop. The sheet has two heights only while its content is taller
than its partial height; then the handle is a `<button>` named by `handle-label` with `aria-expanded` (true at full), and
a pointer, Enter or Space moves it to its other height; at one height the handle is drawn at rest and hidden from
assistive technology and focus. A drag (pointer events, followed through the window) starts past an 8 px slop along the
vertical axis and follows the pointer, never above the full height; on release the sheet settles at the next height in
the direction of a fling (0.5 px/ms) or else the nearest one, over the enter motion (a Web Animation from where it is
drawn; at once where motion is reduced). A drag on the content first raises the sheet to full and then scrolls the
content, and first scrolls the content to its top and then lowers the sheet — within one drag for a mouse or a pen; for
touch the browser decides who takes a gesture when it begins (`touch-action`: the sheet's below its full height, the
content's at it — up to scroll, and down once it is at its top), so the hand-off takes a second gesture there. A drag that asks to close holds for a frame; the sheet then slides out from where it is
if you closed it, or settles back. A height the person chose stays until you set `detent`.

**Layout and the handle (BSH-7, BSH-8, BSH-12…19, BSH-24, BSH-26).** The container is as wide as the area but no wider
than `container.max-width`, centred, on `container.color` with `container.elevation`, its top corners `container.shape`
(eased by the smoothing) and its bottom corners square; its color reaches under `env(safe-area-inset-bottom)`, which is
its own bottom padding (none while the keyboard is shown). The content is inset by `container.padding` at the start, end
and bottom (and the top without a handle), or reaches the edges with `flush`, clipped to the container's corners. The
handle's row is `handle.margin-block`, the box (`handle.container-*`) and `handle.margin-block` again; the grip
(`handle.grip-*`) is centred in the box. The box's hit area is its whole row, at least `sys.target.pointer` wide and high
(`touch` for a coarse pointer), without changing its drawn size. Its states, press-hold, answers to a press and focus ring
are the Button's (the `drag-handle` control's tokens, see "Choices of kind"); a drag that starts on it does not leave it
pressed. Everything is logical, so right-to-left keeps it centred and the content follows the direction. Parts:
`container` (and its `::backdrop`), `handle`, `grip`, `content`. The web has no gallery app; the fixtures are drawn by the
test harness (`test/harness.ts`) in a 400 × 720 window on a `surface` page.

## `<tanrei-handle>`

The mark a person drags, or moves from the keyboard, to change the size of what it stands on: a short capsule for one
axis, a quarter-circle arc for two (`specs/handle.spec.json`, HDL-1…25). It sizes nothing: it reports the drag, the
step a key asks for and an activation, and its owner keeps the size and gives it back as `value`.

```html
<tanrei-handle label="Resize notes" value="4" min="2" max="12" value-text="4 lines"></tanrei-handle>
<script type="module">
  const handle = document.querySelector('tanrei-handle');
  handle.addEventListener('resize', (e) => resizeBy(e.detail.block)); // the distance from the press, in px
  handle.addEventListener('step', (e) => step(e.detail)); // { axis, direction, amount: one | large | limit }
  handle.addEventListener('activate', () => toggleSize()); // a press without a drag, Enter, Space
</script>
```

| `<tanrei-handle>` | Type | Default | |
|---|---|---|---|
| `axis` | `vertical` \| `horizontal` \| `both` | `vertical` | the size it changes: a height (a horizontal capsule), a width (an upright one), both (an arc). Any other value is `vertical`, reported (HDL-20); reflected |
| `corner` | `bottom-end` \| `bottom-start` \| `top-end` \| `top-start` | `bottom-end` | the corner an arc bows toward, logical; ignored for one axis. Any other value is `bottom-end`, reported; reflected |
| `size` | `small` \| `medium` (open) | `medium` | `small` for a text field's corner. A size a layer adds is drawn from its tokens; one the active system lacks is `medium`, reported; reflected |
| `value` | number \| null | `null` | the owner's size, in its unit. Set: a focusable `role="separator"` with `aria-valuenow`. Null: a `<button>` |
| `min` / `max` | number | `0` / `100` | `aria-valuemin` / `aria-valuemax` while `value` is set |
| `valueText` / `value-text` | string | `""` | `aria-valuetext` where it is not empty |
| `expanded` | boolean \| null | `null` | the button's `aria-expanded` while `value` is null; the attribute takes `true` and `false`, no attribute is null |
| `label` | string | `""` | the accessible name, the instance's own (no product words: HDL-21). An empty one is reported (HDL-8) |
| `disabled` | boolean | `false` | disabled tokens, no focus, no press, no event, no resize cursor; `aria-disabled` / `disabled`; reflected |
| `revealed` | boolean | `false` | draws the line at rest (HDL-23 to HDL-25); reflected |

| Event | When |
|---|---|
| `resizestart` | a press moved past the 8 px slop: `detail.pointerType` (`mouse`, `touch`, `pen`) |
| `resize` | each pointer move of the drag: `detail.inline` (toward the end edge: to the left in right-to-left) and `detail.block` (downward), from the press |
| `resizeend` | once: on release, or cancelled (`pointercancel`, the capture taken away, the element removed or disabled mid-drag) with `detail.cancelled` |
| `step` | a key of HDL-9 while `value` is set: `detail.axis` (`inline`, `block`), `detail.direction` (1, −1), `detail.amount` (`one`, `large`, `limit`) |
| `activate` | a press released within the slop, Enter or Space, or assistive technology's click |

Every event bubbles within the tree the handle stands in and is not composed: an element that puts a handle in its own
shadow root hears it on the handle and says what it means in its own events.

**Drawing (HDL-1…4, HDL-13).** The box (part `container`) is `container.length × container.breadth` of the size,
turned for a width, a square of `container.breadth` for an arc, its corners `container.shape` through the corner rule.
The capsule (part `line`) is a box with round ends (`sys.shape.corner.full`, a pill whatever the smoothing). The arc
(part `line`) is an SVG `<circle>` whose geometry is CSS (`cx`, `cy`, `r` from the tokens), drawn a quarter of the way
round by `stroke-dasharray` with round caps: the circle's first quarter runs from its right to its bottom, which is the
bottom-end arc in left-to-right; the other corners and right-to-left mirror the SVG with `scale()`. Its centre is
`arc.radius + inset` in from the corner's edges. The states are the Button's (`stateRules`, `PressController`,
`rippleStyles`, `focusRing`); under a fine pointer and a press the line takes `line.active-*` (the arc only its
thickness), and its size, color and the box's color move over `motion.state-*`.

**Out of sight (HDL-23…25).** Under `@media (hover: hover)` and without `revealed`, the line has `opacity: 0` at rest
and 1 while `:hover`, `:focus-visible`, `[data-pressed]` (held for press-hold) or `.dragging`; the box is clear at rest
anyway. The element stays in the focus order, its target and cursor stay. Where the primary pointer cannot hover the
rule does not apply and the line is drawn.

**Drag and keys (HDL-5…10, HDL-17).** The target is `minimumTarget()` (`sys.target.pointer`, `touch` for a coarse
pointer). The cursor is `ns-resize`, `ew-resize`, or the diagonal through the corner (`nwse-resize` for bottom-end in
left-to-right, mirrored in right-to-left). A `pointerdown` refuses its `mousedown` (no focus, no selection, no caret)
and captures the pointer (`setPointerCapture`), so the drag follows it past the window; `touch-action: none` keeps a
touch from scrolling. The capture does not reach into an iframe: an owner that holds one sets `pointer-events: none` on
it between `resizestart` and `resizeend`. The click that a drag's release makes is swallowed. The separator takes Enter
on `keydown` and Space on `keyup`, as a button does. The web has no adjustable action for a custom element: assistive
technology that adjusts a separator sends the arrow keys, which HDL-9 answers, so HDL-10 is HDL-9 here.

**Forced colors (HDL-16).** The line is `ButtonText`, `Highlight` under a fine pointer and a press, `GrayText`
disabled (`forced-color-adjust: none` on the line only); the box is transparent; the focus outline is `Highlight`.

The fixtures are drawn by the test harness (`test/harness.ts`) on a 160 × 96 box whose corners are concentric with the
arc, the handle at its bottom edge, its end edge or its corner.

## `<tanrei-side-sheet>`

Supplementary content or a secondary task in a panel at the end edge, with a headline, an optional close button and
actions: `standard`, beside the content in the layout (a layout region), where actions are optional, or
`modal`, over the content with a scrim, which offers at least one (`specs/side-sheet.spec.json`, SSH-1…23).

```html
<div style="display: flex; block-size: 100dvh">
  <main style="flex: 1; min-inline-size: 0">…</main>
  <tanrei-side-sheet headline="Filters" closable close-label="Close filters">
    <tanrei-list>…</tanrei-list>
    <tanrei-button slot="actions">Reset</tanrei-button>
    <tanrei-button slot="actions" confirming>Apply</tanrei-button>
  </tanrei-side-sheet>
</div>
<script type="module">
  const sheet = document.querySelector('tanrei-side-sheet');
  // On a compact window: sheet.variant = 'modal'. Open it from a button: sheet.open = true.
  sheet.addEventListener('close', () => (sheet.open = false)); // e.detail.reason: close, scrim, escape, back or drag
</script>
```

| `<tanrei-side-sheet>` | Type | Default | |
|---|---|---|---|
| `variant` | `standard` \| `modal` (open: a design system may add values) | `standard` | standard: beside the content, a layout region; modal: over a scrim, everything else inert. A value the active system does not have is drawn from `standard`'s tokens and laid out as standard, reported (SSH-13); only `modal` is presented as an overlay; reflected |
| `open` | boolean | `false` | whether it is shown. Controlled: set it to false in answer to `close`; reflected |
| `headline` | string | `""` | what the sheet is about, in its header; the modal dialog's or the complementary region's name (an empty one is reported, SSH-12) |
| `closable` | boolean | `false` | draws the close button at the end of the header; reflected |
| `closeLabel` / `close-label` | string | `""` | the close button's accessible name (an empty one is reported while `closable`, SSH-5) |
| `dividerVisibility` / `divider-visibility` | `auto` \| `always` \| `scroll` | `auto` | when the divider below the header is drawn: `always` whenever the header is; `scroll` only while the content is scrolled from its top; `auto` takes `comp.side-sheet.divider.visibility` (always in the default system, scroll in cupertino and m3-like). Anything else is `auto`, reported (SSH-23); reflected |

Slots: default (the content: it gets `content.color` as its color, and plain text the body role; it is laid out as you
lay it out) and `actions` (Tanrei Buttons, each marked `confirming` or `dismissive`; at least one in a modal sheet). Mark
the element that should take focus when the sheet opens with `autofocus`. The shadow root assigns its children by hand
(`slotAssignment: 'manual'`): elements without a `slot` and text go to the default slot, `slot="actions"` elements to
the actions, anything else nowhere.

| Event | When |
|---|---|
| `close` | the sheet asks to be closed: `detail.reason` is `close` (its close button, either variant) or, for a modal sheet, `scrim`, `escape`, `back` (a close request without a key: Android's back) or `drag` (a release past half its width toward its end edge, or a fling that way). Not bubbling. The sheet never closes itself: set `open` to false, or leave it open and it slides back (SSH-6) |

**Standard (SSH-1, SSH-3).** An `<aside>` named by the headline (a complementary landmark: place the sheet
beside your `<main>`, not inside it). Put it as the last item of a flex row: it is the full height of that row, and its
width — `container.width` plus `env(safe-area-inset-right)` (left in right-to-left) — goes to zero while closed, over
`motion.enter-*` when opening and `motion.exit-*` when closing (at once where motion is reduced), so the content beside it
resizes while the panel slides in or out at the end edge. Closed, it is inert (then `visibility: hidden`). No scrim,
nothing inert, Tab leaves it without closing it, Escape and drags are ignored; only its close button asks to close.
Opening it moves focus in as a modal sheet does; closing it with focus inside gives focus back; mounted open, it leaves
focus where it is. Only its end side is clipped while it slides, so a layer's elevation still shows toward the content.

**Modal (SSH-2…4, SSH-6, SSH-15).** A native `<dialog>` in the shadow root opened with `showModal()`: the top layer at the
window's end edge, its full height, `::backdrop` as the scrim (`scrim.color`), everything else inert, the page's scroll
held and a snackbar waiting (`src/primitives/modal.ts`, shared with the dialog, the drawer and the bottom sheet). It is
never wider than the window less `sys.target.touch`, so a strip of scrim stays pressable. Focus goes to the slotted
element marked `autofocus`, else the sheet itself (`tabindex="-1"`, so its headline is read first) — also when it is
mounted open — stays inside (Tab wraps), and returns on closing to where it was (or is dropped when that element is gone).
Escape is answered on `keydown` and only by the topmost overlay; a native `cancel` becomes `close` with `escape` when an
Escape key was just pressed and `back` otherwise (`src/primitives/sheet.ts`, shared with the bottom sheet). It slides in
from the end edge over `motion.enter-*` (`@starting-style`) with the scrim fading in, and out over `motion.exit-*` from
wherever it is, kept in the top layer by `transition-behavior: allow-discrete` (Firefox has no `overlay` transition, so
there it leaves at once, as the dialog does); where motion is reduced it fades in place. A drag (pointer events, followed
through the window) starts past an 8 px slop along the horizontal axis (a vertical move first is the content's scroll)
and follows the pointer toward the end edge, never past where the sheet rests; released past half its width, or flung
that way (0.5 px/ms), it asks to close, holds for a frame and then slides out from there if you closed it, or slides back
over the enter motion (at once where motion is reduced). The click that ends a drag activates nothing.

**Layout (SSH-5, SSH-7…11, SSH-14).** The panel is on its variant's `container.color` with its `container.elevation`, its
start corners `container.shape` (eased by the smoothing) and its end corners square, and edged at its start by
`outline.width` of its variant's `outline.color` (following the corners); its color reaches under
`env(safe-area-inset-*)` at the end, top and bottom, and its parts stay inside them. The header is a row at least
`header.height` high: the headline (`headline.typescale`, `headline.color`, an `<h2>`, wrapping and growing the row)
from `container.padding-inline`, and the close button — an icon-only `<tanrei-button>` of the small size showing the
`close` glyph, placed and otherwise never restyled, drawn unless `closable` is false (the `not-closable` attribute) —
`header.gap` after it and `header.padding-inline-end` from the end
edge. The close button carries no `variant` attribute: the sheet gives it the variant `close-button.variant` names (tonal
in the default system, text under m3-like) through the Button's internal group-item channel (`GROUP_ITEM`, BTN-10), and
the Button draws that variant from its own tokens and states (SSH-5). The content is inset by `container.padding-inline`,
starts below the header (or `container.padding-block` below the top without one), ends `container.padding-block` above
the bottom without actions, and scrolls between the header and the actions; while it scrolls it is a Tab stop, so the
keyboard can scroll it. A `divider.width` hairline in `divider.color` is drawn across the full width below the header:
whenever the header is, under `always`, as the one above the actions is; only while the content is scrolled away from
its top, at once, under `scroll` (SSH-19, SSH-23); none without a header. Enlarged text grows the header, scrolls
the content and stacks the actions; the width and the close button stay. Everything is logical, so right-to-left puts
the sheet at the left edge, mirrored. Parts: `container` (and its `::backdrop`), `outline`, `header`, `headline`,
`close-button`, `content`, `divider` (both hairlines), `actions`. The fixtures are drawn by the test harness in a
720 × 480 window on a `surface` page, a standard sheet at the end of a row whose other child fills the rest, its actions
`tanrei-button slot="actions"` children.

**Actions (SSH-11, SSH-16…18, SSH-20).** While the sheet has an action, a `divider.width` hairline in `divider.color`
crosses the full width above them whether or not the content scrolls (hidden from assistive technology), and the actions
follow `container.padding-inline` from both edges, `actions.gap` apart, `actions.padding-block` above and below, placed
as the dialog places its own (`src/primitives/actions.ts`, shared with `<tanrei-dialog>`): dismissive at the start and
confirming at the end of a row, unflagged ones between them in the order given; confirming on top of a column. Each run
is assigned to one of three slots in that order, so focus and the accessibility tree follow the placed order (BGR-15);
right-to-left mirrors the row. `actions.arrangement` is a choice of kind read from the cascade (a style query, and
`data-arrangement` on the panel where style queries are missing): `fill` (the default system) makes them a full-width
group, the actions sharing the row equally, each Button's container stretched across its share — a column, each as wide
as the inner width, once a label no longer fits its share on one line; `start` (m3-like) keeps them at their own widths
from the start edge — a column as wide as the widest action, at the start, once the row does not fit. The row or column
is re-decided when the sheet's width or the text changes. A Button without a `variant` attribute draws the variant
`actions.variant` names (tonal in the default system) from its own tokens and states; a `variant` you write wins, and
removing it gives the sheet's back (SSH-17). The sheet never changes an action's size or tokens, never looks at
`confirming` or `dismissive` for its look, and never answers an action itself: its `click` is yours, and you close the
sheet from its handler (SSH-18). A modal sheet that opens with no action still opens, and a debug build reports it as a
`console.error` each time it opens (SSH-16); a standard sheet may have none, and then draws neither the divider nor the
actions. While the on-screen keyboard covers the bottom of the sheet — the part below the `visualViewport` — the
divider and the actions sit directly above it, the header stays, the content scrolls in the room left and the focused
element in the content is scrolled into it; they return to the bottom when it hides, at once (SSH-20). The variant and
arrangement tokens are read when the sheet opens and whenever it lays out (a resize of the sheet, its content or an
action), not on a system switch alone.

## `<tanrei-app-bar>`

Names the current screen at its top edge and holds the way back and the screen's most used actions, its bottom edge
drawn as the edge of a region that stays — or, under `divider-visibility="scroll"`, only once content scrolls under it
(`specs/app-bar.spec.json`, APB-1…18).

```html
<tanrei-app-bar headline="Inbox">
  <tanrei-button variant="text" slot="navigation" label="Back"><span slot="icon">arrow_back</span></tanrei-button>
  <tanrei-button variant="text" slot="actions" label="Search"><span slot="icon">search</span></tanrei-button>
  <tanrei-button variant="text" slot="actions" label="More options"><span slot="icon">more_vert</span></tanrei-button>
</tanrei-app-bar>

<!-- A large title that collapses as #inbox scrolls. -->
<div style="display: flex; flex-direction: column; block-size: 100dvh">
  <tanrei-app-bar size="large" headline="Inbox" scroll-target="inbox">
    <tanrei-button variant="text" slot="navigation" label="Menu"><span slot="icon">menu</span></tanrei-button>
  </tanrei-app-bar>
  <main id="inbox" style="flex: 1; overflow: auto">…</main>
</div>
```

| `<tanrei-app-bar>` | Type | Default | |
|---|---|---|---|
| `size` | `small` \| `large` (or a value the system adds) | `small` | small: one row; large: a larger title row of its own under the top row, which collapses as the content scrolls. A size a layer adds (Material's `medium`) is drawn as one that collapses, from its own tokens. Unknown: drawn as `small`, reported (APB-14); reflected |
| `headline` | string | `""` | the spec's `title` (HTML's global `title` attribute would put a tooltip over the whole bar): the screen's name and heading. Empty draws no title block and exposes no heading (APB-13) |
| `subtitle` | string | `""` | one line under the title; empty draws none |
| `titleAlignment` / `title-alignment` | `start` \| `center` | `start` | where the top row's title sits (anything else is `start`); a large bar's own title row always starts at the start; reflected |
| `scrolled` | boolean | `false` | whether content lies under the bar: the scrolled look, and a large bar drawn collapsed. A connected scrolling element sets it; reflected |
| `dividerVisibility` / `divider-visibility` | `auto` \| `always` \| `scroll` | `auto` | when the bottom edge is drawn: `always` at rest and while content is under the bar, in `scrolled.outline.color`; `scroll` in each condition's own outline color (none at rest in the default system); `auto` takes `comp.app-bar.outline.visibility` (always in the default system, scroll in cupertino and m3-like). Anything else is `auto`, reported (APB-18); reflected |
| `scrollTarget` / `scroll-target` | string | `""` | web only: the scrolling element the bar follows — empty for the document's scrolling element, an id (looked up in the bar's own document or shadow root, once more on the next frame if it is not there yet; reported if it never is), or `none` |
| `headingLevel` / `heading-level` | number | `1` | web only: the title's heading level, 1–6 |

Slots: `navigation` (one icon-only `<tanrei-button>`, the spec's `navigation` item), `actions` (up to three
icon-only `<tanrei-button>`s, its `action` items, in reading order). The bar has no events: the buttons are yours.

**Scrolling (APB-8, APB-9).** The bar listens (passively) to its scrolling element's `scroll` events. A small bar is
`scrolled` while that element's `scrollTop` is above 0. A large bar shrinks by the distance scrolled, one for one, until
only its top row is left: its title row is pulled up under the top row and clipped there, and the top row's title fades in
with the part of the expanded title that is covered; it is `scrolled` only once it has fully collapsed. A connected bar
overrides a `scrolled` you set on the next scroll (and when it connects). Without a connection, `scrolled` draws a large
bar collapsed and its absence expanded. Where the bar sits is yours: a bar that collapses belongs above a scrolling
element (`scroll-target="<id>"`) or in a fixed header. A bar in the document's own flow with `position: sticky` moves the
content up by its collapse as well, so it scrolls twice as fast while the bar collapses.

**Layout (APB-4…7, APB-10, APB-15).** The parent's full width. The top row is at least `container.height.small`: the
navigation item `container.padding-inline` from the start edge, the title block, the actions `container.padding-inline`
from the end edge, `container.gap` between them and `actions.gap` between two actions, all centred in the row. Without a
navigation item the title starts `title.inset` from the start edge; without actions it ends `title.inset` from the end
edge. Each item sits in a cell of at least the minimum target it answers to (`sys.target.pointer`, `touch` for a coarse
pointer; BTN-5), its own box centred in it, so the row is at least that high (cupertino's 44 row is 48 under a coarse
pointer). A centred title is centred on the row: the element measures the
distance from each edge to the title area (a `ResizeObserver` on the row and both slots) and pads the nearer side by the
difference. Titles and subtitles are one line each, cut with an ellipsis; the rows grow with the text (the heights are
minimums). A large bar's title row is at least `container.height.large` less the top row, starts and ends `title.inset`
from the edges, and ends `container.padding-block-end` above the bottom edge. The color reaches under
`env(safe-area-inset-top)`, `-left` and `-right`; the content stays inside them. Everything is logical, so RTL mirrors.
The web's sizes follow `rem`, like every Tanrei size: a larger root font size grows the icon-only Buttons with the text (a
change of the type dial alone does not).

**Condition (APB-1…3).** `flat` or `scrolled`: the container color, its elevation and the bottom edge (`outline.width`,
drawn inside the bar so it never changes its height) move over `motion.condition-duration` / `-easing`, at once where
motion is reduced; a forced-colors bar draws its scrolled edge in `CanvasText`.

**Semantics (APB-11…13).** No role, never focusable; Tab moves from the navigation item through the actions, which keep
their own names and roles. The title is `role="heading"` with `aria-level` (`heading-level`), the subtitle is text read
after it. A large bar exposes one title: the expanded one while any of it is visible (the top row's copy is
`aria-hidden`), the top row's once collapsed. More than one navigation item or three actions still render, and are
reported. The bar is not a landmark: wrap it in your own `<header>` if it is the page's banner. Parts: `container`,
`top-row`, `title`, `subtitle`, `expanded`, `outline`.

## `<tanrei-navigation-bar>`

Three to five top-level destinations along the bottom edge of a compact window, one of them the current screen
(`specs/navigation-bar.spec.json`, NVB-1…33). It is the tabs' model: every destination's indicator is its whole equal
share of the bar, hover, press and focus are drawn in that box, and a drag carries the indicator.

```html
<tanrei-navigation-bar label="Main" value="inbox">
  <tanrei-navigation-bar-item value="inbox" label="Inbox" icon="inbox" badge badge-count="3" badge-label="3 unread"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item value="chat" label="Chat" icon="chat" badge badge-label="New messages"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item value="starred" label="Starred" icon="star"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item value="settings" label="Settings" icon="settings"></tanrei-navigation-bar-item>
</tanrei-navigation-bar>
<script type="module">
  const bar = document.querySelector('tanrei-navigation-bar');
  bar.addEventListener('change', (e) => showScreen(e.detail.value)); // bar.value already holds it
  bar.addEventListener('reselect', () => scrollTo({ top: 0 }));
</script>
```

| `<tanrei-navigation-bar>` | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | the selected destination's value; empty selects none. A value naming no destination selects none (reported, NVB-3); of two destinations with one value the first is selected (reported, NVB-22). The bar sets it when a button destination is activated and never for a link — a page sets it to its own destination (NVB-31). Not reflected |
| `variant` | `tonal` \| `filled` | `tonal` | how the active indicator is filled: a soft container with its content in that container's color, or the strong color with the content inverted on it (anything else is `tonal`); reflected |
| `labelVisibility` / `label-visibility` | `always` \| `selected` \| `never` | `always` | which labels are drawn (anything else is `always`); a label not drawn is still the name, and no item container changes size with it; reflected |
| `label` | string | `""` | names the navigation landmark |

| `<tanrei-navigation-bar-item>` | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | identifies the destination; given none, a link's `href` stands for it, as written (NVB-30). The attribute is the value as it was given |
| `label` | string | `""` | the label and the accessible name (an empty one is reported, NVB-20) |
| `icon` | string | `""` | a glyph name of the system's icon set: outlined, filled while selected |
| `disabled` | boolean | `false` | keeps its place and its disabled look, emits nothing, leaves the focus order; reflected |
| `badge` | boolean | `false` | draws a `<tanrei-badge>` on the icon; reflected |
| `badgeCount` / `badge-count` | number \| `null` | `null` | no attribute: the dot; 0: nothing; above 0 the number (999+) |
| `badgeLabel` / `badge-label` | string | `""` | read after the name and state ("3 unread"); a dot needs one |
| `href` | string | `""` | the address: not empty, the destination is an `<a href>` and not a button (NVB-30), activated by Enter and not by Space. White space is no address; `javascript:` and an address that cannot be read are refused and reported (NVB-33) |
| `target` | `same` \| `new` | `same` | where a link opens; `new` is a new tab with `noopener`. A cell has no place for a mark, so none is drawn: `target-label` says it (NVB-32). `_self` and `_blank` are read as those; anything else is `same`, reported (NVB-33) |
| `targetLabel` / `target-label` | string | `""` | read at the end of a link's description while `target` is `new`, after the badge's ("opens in a new tab"); required then (reported when empty), ignored otherwise |
| `rel`, `download` | string \| `null` | `null` | web only, forwarded to the anchor; `new` adds `noopener` to `rel`. A link that asks for a download fires nothing on the bar |

| Event (on the bar) | When |
|---|---|
| `change` | `CustomEvent<{ value }>`, bubbling: another destination was activated — pointer, Enter, Space (not on a link), `item.click()` — or a drag of the active indicator was released on it. The bar has already set `value`; setting it from script fires nothing. **A link:** `CustomEvent<{ value, href }>`, **cancelable**, fired from the anchor's click before the browser follows it, and only for a plain activation — the primary button, no modifier key, a click not already cancelled, `target` `same`, no `download`; `value` is not written; `preventDefault()` stops the navigation (a router then goes to `detail.href`). A link opened somewhere else fires nothing (NVB-31) |
| `reselect` | `CustomEvent<{ value }>`, bubbling: the selected destination was activated again; for a link, as `change`. A drag that returns the indicator to it does not fire it |

**Semantics (NVB-19).** The host is `role="navigation"` named by `label`; its shadow root holds a `role="list"` whose
items are the destinations' hosts (`role="listitem"` with `aria-posinset` / `aria-setsize`, so "2 of 4" is read). Each
destination is a native `<button>` in its shadow root — or an `<a href>` — named by `aria-label` (its label, drawn or not),
`aria-current="page"` while selected, `aria-description` from its badge (`badge-label`, else the count as drawn); the icon
and the drawn label are `aria-hidden`. A disabled one is a disabled `<button>` (a link loses its `href` and gets
`role="link"` and `aria-disabled`). Every destination is a Tab stop, as the links of a navigation region are; there are no arrow keys (the
tablist pattern would promise panels).

**A bar of links (NVB-30…33).** Give every destination an `href` and the bar the page's own address as
`value`: a link without a `value` takes its `href`, so nothing else names the current page.

```html
<tanrei-navigation-bar label="Main" value="/search/">
  <tanrei-navigation-bar-item href="/" label="Home" icon="home"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item href="/search/" label="Search" icon="search"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item href="/library/" label="Library" icon="video_library"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item href="https://example.com/tanrei/help" label="Help" icon="help" target="new" target-label="opens in a new tab"></tanrei-navigation-bar-item>
</tanrei-navigation-bar>
```

The cell is then an `<a href>` through the shared link primitive (`src/primitives/link.ts`): the same part, drawn from the
same tokens in every state and both variants, with its hit area — and the browser's own link: its context menu, a new
tab by a modified or a middle click, its address shown on hover. One thing of a link the bar takes: it is not dragged as
a link (`draggable="false"`), because a sideways drag moves the active indicator. **A link is followed, not selected.**
A plain activation fires `change` (or `reselect` on the selected one) with `detail.href`, cancelable, before the browser
follows the link — at once, not after press-hold — and the bar does not write `value`: the active indicator stays on the
destination `value` selects and moves only when `value` changes, which the next page does, or a router in its listener
(`event.preventDefault(); router.push(event.detail.href); bar.value = event.detail.value`). The selected destination is
the current page, `aria-current="page"`: one state, no second mark. `target="new"` opens a new tab and fires nothing; a
cell is an icon over a label, so no mark is drawn and `target-label` says it. In forced colors the mode draws an
unselected link's icon and label in the person's link color; the selected one keeps the system's highlight.

**Layout (NVB-6, NVB-11…13, NVB-18, NVB-21).** The parent's full width, at least `container.height`, on
`container.color` with its elevation and an `outline.width` top edge in `outline.color` — one constant ground, whichever
destination is selected and while the indicator moves. The width, less `container.padding` at its start and at its end,
is divided into equal cells in reading order (a grid, so RTL mirrors). Each cell is the destination's native element —
the whole hit area, the bar's full height, the first and the last reaching the bar's two edges, never below
`sys.target.touch` high. The item container is the cell less `container.padding` above and below: the same box for every
destination of a bar, whatever it holds (88 × 56 for four destinations in a 360 bar), with corners
`item.container.shape` (a capsule in the default system). It is never sized to its content. Inside it a column is
centred: the icon indicator (`item.icon-indicator.width` × `height`, its corners, the icon centred in it) and the label
`item.gap` below it on one line, keeping `item.container.padding-block` from the box's top and bottom (the bar grows to
keep it) and cut with an ellipsis `item.container.padding-inline` inside its sides. A label that is not drawn collapses,
and the icon indicator comes to the middle of the same box. Every part is laid out in every system: the default leaves
the icon indicator transparent at the icon's own size; m3-like and cupertino set `container.padding` to nothing and make
the item container transparent, so their bars draw no shape around a destination. The color reaches under `env(safe-area-inset-bottom)`, `-left` and `-right`. Text grows the bar and
every item container with it (its height is a minimum); the icon indicators and icons keep their tokens' size (the web's
sizes follow `rem`, so a larger root font size grows them too).

**States and motion (NVB-3…5, NVB-7…10, NVB-15).** `variant` chooses the conditions: tonal draws from unselected and
selected, filled from filled-unselected and filled-selected, each coloring the item container (the state layer's box,
and the active indicator while selected), the icon indicator, the icon, the label and their covered copies in every
state. Hover and focus are read on the whole cell and the press on the item container, and all three are drawn in the
item container — the box the indicator has on that destination, or would have — never on the cell's rectangle and never
as a shape around the icon and label alone. Everything else is Button's: the precedence, press-hold, the four
`pressed-feedback` answers (the ripple is clipped to the item container and grows from its centre for a key or a press
outside it), corner smoothing, the state motion. The focus ring (or glow) surrounds the item container, concentric and
in its shape, and is held inside the bar (`focusRing()`'s `within`: `container.padding`): in the default system it
reaches exactly the bar's edge; where a system leaves less room (m3-like: none) it is drawn further in by the
difference. The focused destination is drawn above its neighbours.
When the selection changes, one layer of the bar (part `indicator`) slides from the previous item container to the new
one at its full size, in the new destination's selected color, over `motion.selection-*`. Its progress is an effect
without keyframes on that layer (`tanrei-navigation-bar-slide`), and each frame reads the new item container as it is
then. Where nothing was selected before it fades in on the new item container at its full size, and to none it fades
out: it never grows or shrinks in width. The new icon indicator — which only a system that marks the selection behind
the glyph fills — grows in width from its centre (a Web Animation on its `inset-inline`), the old one fades, and icon and
label recolor over the same motion. At rest the bar's layer is not drawn: the selected item container is the indicator.
The first draw, a destination that arrives selected, and every change of size without a new selection are drawn at once,
as is all of it under `prefers-reduced-motion: reduce`.

**The drag (NVB-27…29).** A press on the bar with touch, a pen or a mouse that moves 8 px, further sideways than up or
down, while a destination is selected, is taken as a drag of the indicator (`IndicatorDragController`,
`src/primitives/indicator-drag.ts`: Pointer Events, the pointer followed on the window, captured once the drag is taken;
`touch-action: pan-y` leaves vertical drags to the page). The pressed destination leaves its pressed state, and the
bar's layer is drawn where the pointer is: on an enabled destination at its cell's centre, halfway between two
neighbours where their cells meet (the middle of any disabled ones between them), linear in between, and on the first or
last one before or beyond its centre — in the frame the pointer moves, except that it first comes from where it rested
over `motion.state-*` (`tanrei-navigation-bar-catch-up`). Nothing else changes: `value`, `aria-current`, focus, each
icon's fill, the icon indicator and which label is drawn stay with the selected destination. A release chooses the
nearer of the two destinations the indicator lies between (the one after it from halfway on), or the one of the two a
fling is toward (0.5 px/ms). Another than the selected one is activated with its own `click()` — `value`, one `change` —
and the indicator settles from where the release left it; the selected one gets the indicator back and
nothing is fired, `reselect` included. A release on a link is a plain press on that link: one `change` with its `href`,
the link followed, `value` not written — so the indicator returns to the destination `value` selects, and goes on to
the chosen one from where it is when your listener sets `value`; a link to a new context opens and fires nothing. The click the browser sends after a taken drag is swallowed. Escape, a cancelled
pointer, a lost capture, `value` set meanwhile, or a destination under the indicator removed or disabled return the
indicator and fire nothing. A destination that is a link is not draggable as a link (`draggable="false"`). With reduced
motion the indicator still follows the pointer, without the catch-up, and lands at once. A wheel or a trackpad moves
nothing, and with no destination selected no drag is taken. The drag is never the only way: a tap, a click, Enter and
Space remain. Under m3-like and cupertino the item container is transparent, so nothing is seen moving and the release
still chooses (mimicry gap `navigation-bar-indicator-drag`).

**The covered copy (NVB-23).** Each destination draws its icon and label twice. The second copy (part `covered-content`,
`aria-hidden`) is in its condition's covered colors. At rest the selected destination draws it whole — its icon and
label wholly in their covered colors, the plain ones under it not drawn — and every other destination none of it. While
the indicator moves (a slide, a drag) the element clips every covered copy to the bar's layer with
`clip-path: inset(… round …)` and cuts the same shape out of the plain copy (`path(evenodd, …)`), written in the same
frame, so a destination the indicator passes over inverts exactly where it is covered and nothing is painted twice; the
selected destination's own fill is not drawn meanwhile. A fading indicator cross-fades the two copies instead. No blend
mode is used. Each copy has its own badge (the covered one hidden), so the badge is above both. The clip's corners are
round; they follow corner smoothing only for a capsule, which is round whatever the amount.

The badge is the badge component, anchored to the glyph (NVB-16). Fewer than three or more than five destinations still
render (reported, NVB-17). Parts: `container`, `outline`, `indicator`, `list` (bar); `cell`, `container`,
`active-indicator`, `icon-indicator`, `icon`, `label`, `covered-content` (item). The selection logic is shared with the
drawer (`src/primitives/destination.ts`); the drag's gesture and arithmetic are a primitive of their own, written so
that the tabs' row can move onto it.

## `<tanrei-navigation-drawer>`

A panel of destinations at the start edge, in two variants — `standard`, a layout region beside the content,
and `modal`, a modal overlay over a scrim that closes itself after a destination is chosen — and, while `collapsible`, in
two forms: expanded, and collapsed to a column of icons (what other systems call a navigation rail), which is the
expanded drawer with its labels gone — every row cut after its icon, at the same height and with the same corners —
moving between them with every icon exactly in place. With `responsive` the window's width chooses which of them it is.
A destination with `href` is a link, and the drawer is then a site's sidebar: the page says which destination is the
current one, the selection is in view when the drawer appears, and a long tree keeps its place from page to page by
the site's hand (`specs/navigation-drawer.spec.json`, NVD-1…64).

```html
<tanrei-navigation-drawer label="Mail" value="inbox" open collapsible expanded="false" style="block-size: 100dvh">
  <tanrei-button slot="header-button" variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button>
  <tanrei-main-action-button slot="main-action" label="Compose"><span slot="icon">edit</span></tanrei-main-action-button>
  <span slot="header">Mail</span>
  <tanrei-navigation-drawer-section headline="Mail">
    <tanrei-navigation-drawer-item value="inbox" label="Inbox" icon="inbox" trailing-text="24" badge badge-count="3" badge-label="3 unread"></tanrei-navigation-drawer-item>
    <tanrei-navigation-drawer-item value="sent" label="Sent" icon="send"></tanrei-navigation-drawer-item>
  </tanrei-navigation-drawer-section>
  <tanrei-navigation-drawer-group label="Projects" short-label="Projects" icon="folder" open>
    <tanrei-navigation-drawer-item value="tanrei" label="Tanrei"></tanrei-navigation-drawer-item>
    <tanrei-navigation-drawer-item label="Help center" href="/help" target="new" target-label="opens in a new tab"></tanrei-navigation-drawer-item>
  </tanrei-navigation-drawer-group>
</tanrei-navigation-drawer>
<script type="module">
  const drawer = document.querySelector('tanrei-navigation-drawer');
  drawer.addEventListener('change', (e) => showFolder(e.detail.value));
  drawer.addEventListener('expandedchange', (e) => savePreference(e.detail.expanded)); // the drawer has already set `expanded`
</script>
```

| `<tanrei-navigation-drawer>` | Type | Default | |
|---|---|---|---|
| `variant` | `standard` \| `modal` (or a value the system adds) | `standard` | standard: beside the content, in the layout; modal: over it, with a scrim. Unknown: drawn from standard's tokens and presented as standard, reported (NVD-26); reflected |
| `open` | boolean | `false` | standard: whether it takes its place; modal: whether it is presented (a collapsible modal drawer: whether it is widened over the content). A modal drawer sets it to false itself when it closes; reflected |
| `collapsible` | boolean | `false` | gives it the collapsed form; reflected |
| `expanded` | boolean | `true` | the form of a collapsible standard drawer (`expanded="false"` collapses it; absence is true); ignored while not collapsible and by a modal drawer, whose form follows `open`; reflected. The menu button sets it |
| `collapsedLabels` / `collapsed-labels` | `never` \| `selected` \| `always` | `never` | which cells draw their short label under the icon while collapsed (anything else is `never`). The default draws none: a collapsed cell shows its name in a tooltip instead (NVD-56). `always` is for a product or a system whose column is labelled — a product on m3-like sets it; reflected |
| `responsive` | boolean | `false` | lets the window's width choose the presentation (NVD-53): `variant` is then ignored; reflected |
| `presentation` | `standard` \| `column` \| `modal` \| `null`, read-only | | what a responsive drawer is at the window's width (`null` while not responsive), reflected as the `presentation` attribute for styling. Derived from the width alone; never written to `variant`, `open` or `expanded` |
| `collapsed` | boolean, read-only | | the form it is in (NVD-30), reflected as the `collapsed` attribute for styling |
| `value` | string | `""` | the selected destination's value, in a section, in a group or neither (the first in reading order, NVD-29; one naming none is reported, NVD-3). The selected destination is the place being shown: the one `aria-current="page"`. The drawer sets it when a button destination is activated and never for a link — a page sets it to its own destination (NVD-23, NVD-60) |
| `revealSelected` / `reveal-selected` | boolean | `false` | opens the groups that hold the selected destination when the drawer first appears (in its first frame, without motion) and whenever `value` changes, whatever their `open` said; each fires `toggle`. A group the user closes afterwards stays closed until `value` changes (NVD-58) |
| `scrollOffset` / `scroll-offset` | number | `0` | how far the items are scrolled, in CSS pixels: the getter is the scroller's present `scrollTop`, the setter writes it at once, held inside the range. The attribute is read once, for the first frame. No event while the user scrolls; nothing is stored (NVD-61, NVD-62) |
| `label` | string | `""` | names the navigation landmark and, while modal and open, the dialog (empty on a modal drawer is reported, NVD-24) |

| `<tanrei-navigation-drawer-item>` | Type | Default | |
|---|---|---|---|
| `value`, `label`, `icon`, `disabled` | | | as the bar's destination; `icon` empty draws none (give every destination an icon, or none — and every top-level one an icon in a collapsible drawer, NVD-49). A link without a `value` reads its `href`, as written |
| `href` | string | `""` | the address: not empty, the destination is an `<a href>` and not a button (NVD-59). White space is no address; `javascript:` and an address that cannot be read are refused and reported (NVD-64) |
| `target` | `same` \| `new` | `same` | `new` opens a new tab (`target="_blank"`, `rel` gains `noopener`), ends the expanded row with the icon set's `open_in_new` unless the row has trailing text or slot content, and says `targetLabel`. `_self` and `_blank` are read as the two; anything else is `same` and is reported (NVD-63, NVD-64) |
| `targetLabel` / `target-label` | string | `""` | what is read at the end of the link's description while `target` is `new` ("opens in a new tab"): your words. Empty then, it is reported |
| `rel`, `download` | string | | web only, forwarded to the anchor. A link with `download` is the browser's: the drawer fires nothing for it |
| `shortLabel` / `short-label` | string | `""` | what the collapsed drawer draws under the icon where `collapsed-labels` draws labels, on one line, cut with an ellipsis ("Files" for "My files"); empty draws the label. The label stays the accessible name; a short label that is not part of it is reported (NVD-34) |
| `trailingText` / `trailing-text` | string | `""` | a count or a word at the end of the expanded row ("24", "New"), on one line, quieter than the label |
| `badge`, `badgeCount` / `badge-count`, `badgeLabel` / `badge-label` | | | a `<tanrei-badge>` on the icon in both forms, as the bar's destination's |
| slot `trailing` | | | content at the end of the expanded row in place of `trailing-text`: one glyph of the icon set (drawn at `item.trailing-icon.size` in the trailing icon color), a badge, a short text. It is inert (kept out of the focus order; a focusable element in it is reported) and its text — an element's `aria-label`, else its text, skipping `aria-hidden` ones — is part of the destination's description |

| `<tanrei-navigation-drawer-group>` | Type | Default | |
|---|---|---|---|
| `label`, `shortLabel` / `short-label`, `icon`, `disabled` | | | as a destination's (an empty label is reported, NVD-46) |
| `open` | boolean | `false` | whether its items are shown under its row while the drawer is expanded; reflected. The drawer sets it on activation, and when `reveal-selected` opens it |

| `<tanrei-navigation-drawer-section>` | Type | Default | |
|---|---|---|---|
| `headline` | string | `""` | the spec's `title`: a heading row above its items; empty draws none |
| `divider` | boolean | `false` | a `<tanrei-divider>` before the section; reflected |
| `headingLevel` / `heading-level` | number | `2` | web only: the heading's level |

| Event | When |
|---|---|
| `change` / `reselect` (drawer) | a button destination: as the bar's (`value` is already set). A link: `CustomEvent<{ value, href }>`, **cancelable**, fired from the anchor's click before the browser follows it, and only for a plain activation — the primary button, no modifier key, a click not already cancelled, `target` `same`, no `download`; `value` is not written; `preventDefault()` stops the navigation (a router then goes to `detail.href`). A modal drawer closes after either (NVD-21); a link opened somewhere else fires nothing and leaves it open (NVD-60) |
| `close` (drawer) | a modal drawer closed: the scrim, Escape, back (the native `cancel`), a drag toward its start edge past half its width or a fling (0.5 px/ms, after an 8 px slop), its menu button, or a destination. `open` is already false. A standard drawer never fires it |
| `expandedchange` (drawer) | `CustomEvent<{ expanded }>`, bubbling: the user asked a collapsible drawer for its other form — its menu button, or a group's cell while collapsed (`true`). The drawer has already set `expanded` (a modal one: `open`) |
| `presentationchange` (drawer) | `CustomEvent<{ presentation }>`, bubbling: a responsive drawer decided its presentation for the first time, or the window's width changed it. A product shows its own menu button while it is `modal` |
| `toggle` (group) | `CustomEvent<{ open }>`, bubbling: the user opened or closed the group — its row, the arrow keys, or its cell while collapsed — or the drawer opened it to show the selection (`reveal-selected`). `open` is already set |

**A site's sidebar (NVD-57…64).** Give every destination an `href` and the drawer the page's own address as `value`:

```html
<tanrei-navigation-drawer label="Documentation" value="/components/button/" reveal-selected responsive open>
  <tanrei-navigation-drawer-group label="Components">
    <tanrei-navigation-drawer-item label="Button" href="/components/button/"></tanrei-navigation-drawer-item>
    <tanrei-navigation-drawer-item label="Tabs" href="/components/tabs/" trailing-text="New"></tanrei-navigation-drawer-item>
  </tanrei-navigation-drawer-group>
  <tanrei-navigation-drawer-item label="Source code" href="https://example.com/tanrei" target="new" target-label="opens in a new tab"></tanrei-navigation-drawer-item>
</tanrei-navigation-drawer>
```

- *Links are the browser's.* The anchor is in the item's shadow root (as `<tanrei-button href>`'s is): the
  context menu, a control-, command-, shift- or middle click, dragging and the address on hover are untouched, Enter
  follows it and Space does not. The link is drawn exactly as a button destination, in every state; there is no visited
  look. The drawer's part is `change` (above): a client-side router listens for it, calls `preventDefault()` and goes
  to `detail.href`; a site of separate documents does nothing and the next page says `value`.
- *The selection is shown on arrival.* When the drawer first appears and whenever `value` changes, the row that shows
  the selection (the destination, or the closed group's row that stands for it) is centred in the scroller if it was
  not wholly in view — as far as the range allows — and not moved at all if it was; a write to `scrollTop`, never
  `scrollIntoView()`, without motion and without moving focus. When a group has to open first (after the first frame,
  with its motion), the row is brought into view once it has. The first frame is built in order — the groups as their
  `open` says, what `reveal-selected` opens, `scroll-offset`, then the selection — without motion (the host carries
  `data-arriving` until that frame is drawn, and the disclosure, selection and state motions take no time while it
  does), and is run again while the drawer's children are still being parsed.
- *The scroll is the drawer's own.* `overscroll-behavior: contain` and `scroll-behavior: auto` on the scroller; a group
  that opens or closes keeps its own row where it is; keyboard focus on a cell that is not wholly in view scrolls it by
  the least distance (the drawer undoes a browser's own answer to the focus where it differs — one centres, one leaves a
  half-shown cell alone).
- *Nothing is stored.* Keeping a long tree where the reader left it is the site's, about twenty lines after the
  drawer's markup (an inline script runs before the first frame, whether the elements are upgraded by then or not, so
  that frame is already right):

```html
<script>
  {
    const drawer = document.currentScript.previousElementSibling; // the <tanrei-navigation-drawer> just above
    const groups = [...drawer.querySelectorAll('tanrei-navigation-drawer-group')];
    const key = 'sidebar:' + groups.map((group) => group.getAttribute('label')).join('|'); // dropped when the tree changes
    let kept = {};
    try { kept = JSON.parse(sessionStorage.getItem(key) ?? '{}'); } catch {}
    // Properties, which an element takes as its own whether it is upgraded yet or not.
    groups.forEach((group, index) => {
      if (kept.open?.[index] !== undefined) group.open = kept.open[index];
    });
    if (kept.offset) drawer.scrollOffset = kept.offset;
    const keep = () => {
      // Until a group is upgraded it has no `open` to read: a page left before the module arrived keeps what was kept.
      if (!groups.every((group) => typeof group.open === 'boolean')) return;
      try { sessionStorage.setItem(key, JSON.stringify({ open: groups.map((group) => group.open), offset: drawer.scrollOffset ?? 0 })); } catch {}
    };
    drawer.addEventListener('toggle', keep);
    addEventListener('pagehide', keep);
  }
</script>
```

  A group kept closed still opens if it holds the page (`reveal-selected` wins over a state given back — whether the
  script ran before the elements were upgraded, when the group takes the property only at its first update, or after:
  until the first frame is drawn the group that holds the page is open whatever it is told, with its one `toggle`,
  and afterwards it is as its `open` says until `value` changes), and an offset kept from a page whose destination is out of view there gives
  way to the selection, centred.

**The header (NVD-37…39).** Header buttons are icon-only `<tanrei-button slot="header-button">`s, stacked on the icon
column (centred half of `collapsed.container.width` from the start edge) `header.item-gap` apart. While `collapsible`, the
first is the menu button: the drawer sets `ariaExpanded` and `ariaControlsElements` (the drawer's host) on its native
button, and its click — after the button's own — sets `expanded` (or `open`) and fires `expandedchange`, or closes an
open modal drawer; a collapsible drawer without one is reported. The `header` slot sits `item.gap` after the first header
button, in its row (at `container.padding-inline` without one), and is drawn only while expanded (inert and hidden while
collapsed; its row keeps its height). The main action is a `<tanrei-main-action-button slot="main-action">`
`header.item-gap` below: the drawer sets its `extended` from its own form, and starts it where its collapsed square is
centred in the icon column; only the first is drawn (the others are reported). The header comes first in reading and focus
order, wherever those children stand, and stays in place while the items scroll. The first header button's width and the
main action's height are measured (a `ResizeObserver`): the header lays them out, it does not restyle them.

**One layout for both forms (NVD-30…35).** Everything inside the drawer is laid out for the expanded drawer, and the
panel — whose width alone follows the form — clips it at its end edge: so no icon, header button or main action glyph
moves between the forms. Each cell is the destination's (or group row's) native element, the drawer's full width, with its
hit area (`::before`) half of `container.gap` above and below and at least `sys.target.pointer` (`touch` for a coarse
pointer). While collapsible every cell has one height in both forms: its icon line is the larger of half the expanded row
and `collapsed.item.container.padding-block` plus half the icon indicator below its top, and it reaches the larger of half
the expanded row and half the icon indicator plus — unless `collapsed-labels` is `never` — `collapsed.item.gap` and one
line of the short label, and the padding below it. In the default system that is the row's own 48, with the icon line 24
below the top. Expanded, the item container is the row: from `container.padding-inline` inside the start edge — and
`item.nest-indent` further for each level of a group, so a nested destination's fill, state layer and focus ring hang
under its group and its label starts under its group's label — to `container.padding-inline` inside the end edge, at
least `item.container.height` (a menu item's 48), with the icon on the icon column (the same indent further per level),
the label `item.gap` after it (wrapping; `item.padding-inline` from the item container's start without an icon), the
trailing content `item.padding-inline` from the end. The hit area is the drawer's full width however far the item
container is indented. Collapsed, the item container is `collapsed.item.container.width` wide, centred in the icon
column, from `collapsed.item.container.padding-block` above the icon indicator to the same below it (or below the short
label where one is drawn), with `collapsed.item.container.shape`. The default system's values make that the expanded row
cut after its icon — 48 × 48, the row's corners, the same start and top, the selection filled exactly as the row's — so
between the forms only its end edge moves; m3-like keeps Material's column by value (a 56 × 32 indicator behind the
glyph, the label under it with `collapsed-labels="always"`). Collapsed, the drawer draws top-level cells only: a group is
one cell, drawn selected while it holds the selection (NVD-47), and its items (the one exception to "nothing moves")
collapse away.

**A collapsed cell's name (NVD-56).** A collapsed cell that draws no short label holds a plain `<tanrei-tooltip>`
(`placement="end"`, `no-describe`, `aria-hidden`) over its item container, which the cell opens: after the tooltip's own
show delay while a fine pointer rests on the cell, at once on keyboard focus, never for a touch; it closes when the
pointer leaves, on activation and when focus leaves. It answers no pointer itself (the cell is the one hit target) and
adds nothing to the cell's name or description, which already hold the label.

**The change of form (NVD-35, NVD-36).** Over `motion.expand-*`: the host's and the panel's width (a standard drawer's
content resizes with it), each item container's geometry and corners, and — while the host carries `data-form-change` —
every color the form recolors (the cells inherit `--_nvd-recolor-*`). Where the two forms give the item container the
same height and corners, as the default system does, its end edge alone moves. A header button is the Button it is on
the way: never stretched, reshaped or recolored. The labels, trailing content, headings' text and the
header slot fade out over the first half of a collapse and in over the second half of an expansion (a delayed opacity
transition); the short labels the other way. `prefers-reduced-motion: reduce` changes the form at once. Focus stays where
it is; focus on what the collapsed form does not draw (the header slot, an item in a group) moves to the menu button.

**Responsive (NVD-53…55).** With `responsive` the element reads its system's `breakpoint.expanded` and
`breakpoint.collapsed` from its computed style (the generated CSS carries them in rem: 1024 and 600 px at the default
text size) and listens to both with `matchMedia`; without it it reads no width. At least the first: `standard` — a
standard drawer, shown whatever `open` says, collapsible in the form `expanded` chooses. At least the second, while
`collapsible`: `column` — a collapsible modal drawer, its column in the layout, widening over the content while `open`.
Otherwise: `modal` — a modal drawer that is not collapsible. `variant` is ignored; each presentation draws and behaves as
the drawer it stands for. The styles read what the drawer is drawn as from state attributes the element writes
(`data-as`, `data-collapsible`, `data-open`, `collapsed`, `presentation`), never from the props. The presentation is
decided as the element connects, before its first render, so the first frame is the right one, without motion and
without `close`; before the element is upgraded (markup from a server, the React wrapper included) there is no shadow
root, so no dialog is open and nothing is inert. When the width changes the presentation it is drawn at once (the host
carries `data-instant` for two frames: the open, close and form motions take no time, and what was on its way stops), it
is entered closed (an open overlay comes down, `open` is false and `close` fires once), `expanded`, `value` and every
group's `open` are kept, and `presentationchange` fires once. Focus that was in the drawer stays on what the new
presentation still shows, moves to the menu button from what it does not, and is left to the platform where the drawer
shows nothing. In the `modal` presentation the drawer's own menu button closes the open overlay and otherwise does
nothing: the product opens it from a menu button of its own. The element stores nothing: a product that wants the
user's choice of form remembered keeps what `expandedchange` carries and sets `expanded` from it.

**Standard (NVD-18, NVD-28).** A `<nav>` named by `label` in the shadow root. While `open` the host is its form's width
(plus the start inset) and the full height of its parent; closed, it is 0 wide and `visibility: hidden`. Opening slides
over `motion.enter-*` (the host carries `data-sliding` until the next change of form), closing over `motion.exit-*`; a
change of form over `motion.expand-*`. Opening it moves focus to the selected destination (or the group row that shows
it), else the first focusable element; closing it with focus inside gives focus back to where it was (or drops it). Tab and
Shift+Tab leave it without closing it. No scrim, no trap, no `close`.

**Modal (NVD-19…22, NVD-40).** A native `<dialog>` in the shadow root opened with `showModal()`: the top layer,
`::backdrop` as the scrim (`scrim.color`), everything else inert, the page's scroll held (`holdPageScroll()`), a snackbar
waiting (`modalLayer`). It slides in from its start edge (`translate`, `@starting-style`) over the enter motion and out over
the exit motion (kept in the top layer by `transition-behavior: allow-discrete`; Firefox has no `overlay` transition, so
there it leaves at once). Focus goes to the selected destination (or the group row
that shows it), Tab wraps inside (`trapFocus()`), and returns on closing. A drag follows the pointer toward the start edge
once past the slop; a release past half the width, or a fling, closes it. A collapsible modal drawer keeps its column in
the host's layout box — a `<nav>` in the standard variant's look, collapsed — and, while open, replaces it with the dialog
placed over the column's box (measured when it opens), which widens from the column's width over `motion.expand-*` in the
modal look, its scrim fading over the same time; closing narrows it back, and the column takes its place once it has.
Focus returns then (the element that had it — its menu button, usually — is drawn in the closing dialog until then).

**Groups (NVD-44…48).** A group's row is drawn as a destination's, with the icon set's `expand_more` at
`item.trailing-icon.size` in place of trailing content, turned half a turn while open. Its items are revealed and hidden
(a `grid-template-rows` transition) over `motion.disclosure-*`. The row is a `<button aria-expanded aria-controls>` named
by the label; its items are a list labelled by it, inert and hidden while closed or while the drawer is collapsed. Enter,
Space or a click sets `open` and fires `toggle`; the arrow toward the end of the line opens a closed group, the one toward
the start closes an open one, and on an item inside an open group moves focus to its row (mirrored in right-to-left).
Groups hold destinations and groups; a section inside a group draws its items in its place (reported, NVD-17), and groups
deeper than three levels are drawn and reported (NVD-48).

**Layout (NVD-11…13, NVD-16, NVD-17, NVD-25, NVD-27).** The panel is on its variant's color and elevation, its end corners
rounded by its variant's shape (start corners square, eased by the smoothing), with its variant's `outline.width` end
edge. The header sits `container.padding-block` below the top; the items `header.gap` below it (`container.padding-block`
without a header) and `container.padding-block` above the bottom, measured to the first and last cell, `container.gap`
apart, scrolling while the header stays. A section draws the divider component across the inner width (in either form),
then its heading (`heading.typescale`, `heading.color`, at least `heading.height`, starting where labels without an icon
start; collapsed, its row keeps its height, its text fades and it is `aria-hidden`), then its cells. The color reaches
under `env(safe-area-inset-top)`, `-bottom` and the start side's. Enlarged text grows every cell alike in both forms and
keeps both widths; the short label stays on one line. Logical throughout, so right-to-left mirrors.

**Semantics (NVD-15, NVD-23, NVD-42, NVD-46).** The destinations are `<button>`s (or `<a href>`) named by their labels in
both forms, the selected one `aria-current="page"`, their badge's description and then their trailing content their
`aria-description`; each host is a list item with `aria-posinset` / `aria-setsize` counted among the items of its level
(top-level cells across sections; a group's own items). A section is a list item holding its heading (`role="heading"`)
and a list of its cells. The cells' states, press and focus are the bar's (NVD-4…10), read from `unselected` and `selected`
while expanded and from `collapsed-unselected` and `collapsed-selected` while collapsed. A new selection changes the item
containers' colors in place over `motion.state-*`, at their full size and shape: nothing grows, shrinks or slides to show
it. The icon indicator — transparent in the default system, filled by a system that marks the selection behind the
glyph — grows in width from its centre over `motion.selection-*` (NVD-41). Parts: `container`, `outline`,
`header`, `content` (drawer); `cell`, `container`, `active-indicator`, `icon-indicator`, `icon`, `label`, `short-label`,
`trailing-text` (item); the same with `chevron` and `items` (group); `heading` (section).

## `<tanrei-segmented-button>`

Two to five related options drawn side by side as the joined segments of one control, for one choice or several
(`specs/segmented-button.spec.json`, SEG-1…25).

```html
<tanrei-segmented-button label="Range" value="week">
  <tanrei-segment value="day" label="Day"></tanrei-segment>
  <tanrei-segment value="week" label="Week"></tanrei-segment>
  <tanrei-segment value="month" label="Month" disabled></tanrei-segment>
</tanrei-segmented-button>
<tanrei-segmented-button label="Text style" selection="multiple" values='["bold"]'>
  <tanrei-segment value="bold" label="Bold" icon="format_bold" label-hidden></tanrei-segment>
  <tanrei-segment value="italic" label="Italic" icon="format_italic" label-hidden></tanrei-segment>
</tanrei-segmented-button>
<script type="module">
  document.querySelector('tanrei-segmented-button').addEventListener('change', (e) => console.log(e.detail.value));
</script>
```

| `<tanrei-segmented-button>` | Type | Default | |
|---|---|---|---|
| `selection` | `single` \| `multiple` | `single` | single is a radio group (one value, never cleared by its own segment); multiple switches each segment on and off (none is allowed). Anything else is single; reflected |
| `value` | string \| `null` | `null` | the selected segment's value while single; `null` selects none. Attribute and property, not reflected |
| `values` | string[] | `[]` | the selected segments' values while multiple. A property (assign a new array); the `values` attribute is read as a JSON array or as whitespace-separated values, as the list's |
| `size` | `small` \| `medium` \| `large` (or a value the system adds) | `medium` | 32 / 36 / 40 in the default system, Button's heights. Unknown: drawn as `medium`, reported (SEG-8); reflected |
| `label` | string | `""` | the set's accessible name: the question its options answer (an empty one is reported, SEG-22) |

| `<tanrei-segment>` | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | identifies the segment; the first segment with a value is the one it selects (empty and repeated values are reported, SEG-12); reflected |
| `label` | string | `""` | the text and the accessible name, also when hidden (an empty one is reported, SEG-22) |
| `icon` | string | `""` | a glyph name of the system's icon set: outlined, filled while selected. Give every segment an icon, or none |
| `labelHidden` / `label-hidden` | boolean | `false` | draws the icon alone; without an icon the label is drawn anyway (reported, SEG-22); reflected |
| `disabled` | boolean | `false` | never selected or cleared, skipped by the arrow keys, never the Tab stop, not focusable by a press; reflected |

| Event (on the set) | When |
|---|---|
| `change` | `CustomEvent<{ value } \| { values }>`, bubbling: the user changed the selection — pointer, Enter, Space, `segment.click()`, or (single) an arrow key, Home or End. The set already holds the new `value` or `values`; setting them from script fires nothing, and a single set's selected segment fires nothing. There is no `click` API: a segment is a choice |

**Semantics (SEG-20).** Single: the host is `role="radiogroup"` named by `label` (`aria-label`), and each segment's native
`<button>` in its shadow root is `role="radio"` with `aria-checked`, `aria-posinset` / `aria-setsize` and `aria-label` (its
label, drawn or not). Multiple: the host is `role="group"`, its row is a `role="list"` whose items are the segments' hosts
(`role="listitem"` with `aria-posinset` / `aria-setsize` — a button has no position of its own), and each `<button>` is a
toggle button with `aria-pressed`. A disabled segment is a disabled `<button>`. The icon, the check, the dividers and the
outline are `aria-hidden` or drawn by pseudo-elements. It is not form-associated: copy `value` into a
hidden input to post it. `ElementInternals` carries no role; it holds two custom
states, `:state(selected)` and `:state(focus-visible)`, which only lift the segment in the set's stacking order.

**Keyboard (SEG-18, SEG-19).** One Tab stop: the selected segment, or the first enabled one (single); the segment that had
focus last, else the first selected, else the first enabled (multiple). Right / Down Arrow go to the next enabled segment,
Left / Up Arrow to the previous one, wrapping (Left and Right mirrored in right-to-left), Home and End to the first and
last; with single selection each move also selects. Enter and Space activate the focused segment (a native button's
Enter on key-down, Space on key-up).

**Layout (SEG-6, SEG-13, SEG-14, SEG-17, SEG-21, SEG-24).** The set is a grid of equal columns,
`minmax(<target>, 1fr)`: at its natural width every column is the widest segment's content — measured as if selected,
through a hidden sizer that holds the leading glyph (the icon, or the check where one would be drawn), the gap and the
label on one line — plus `container.padding-inline` on each side, so selecting never changes a width. More room is shared
equally; less room is shared equally too, and labels wrap (never truncate) while every segment grows to the tallest, with
`container.padding-block` above and below. The set is at least `container.height` tall, fills with `set.color`, has
`set.shape` corners and insets its segments by `set.padding`; its outline (`outline.width` in `outline.color`) is the
set's `::after`, inside its edge and over the segments. Columns are `divider.width` apart; each segment after the first
draws the line in that gap (`divider.color`), from the set's top padding to its bottom padding, outside its button, so no
state or opacity reaches it. The first segment's inline-start corners and the last one's inline-end corners are
`set.shape` less `set.padding` (concentric; a pill set draws them as caps), every other corner the state's
`container.shape`; the ripple and the focus ring follow each corner. Every segment is at least `sys.target.pointer`
(`touch` for a coarse pointer) wide, and its hit area (`::before`) reaches that height above and below the set. A selected
segment is lifted above its neighbours so its elevation shows; the set clips nothing.

**States and motion (SEG-4, SEG-5, SEG-7, SEG-9…11, SEG-15, SEG-16, SEG-23).** Two conditions, `unselected` and
`selected` (the state variants), each coloring the container, its elevation, the label and the icon (and
the check) in every state. Everything else is Button's: the precedence, press-hold, the four `pressed-feedback` answers
(the ripple is clipped to the segment's corners), ring or glow **drawn inside the segment** — a keyboard-focused segment
is lifted above the set's outline, so nothing covers it — corner smoothing, and the state motion for colors, elevation
and opacity. A selected segment whose label is drawn shows the icon set's `check` glyph (SEG-16: always in the selected
family and fill at `check.weight`, a control's own mark, never mirrored — no mark of its own) in its leading position at `check.size`, in place of its icon,
fading in and out; until the icon set can draw it nothing is drawn in its place — never the word "check" — and the room
SEG-14 measured is kept, so no width changes when the font arrives (SEG-25, `GlyphDrawnController`; it then appears
without the selection motion); an icon-only segment keeps its icon, filled, and shows no check. The set
measures `check.size` (a hidden probe watched by a `ResizeObserver`, so a system switch is seen): at 0 (`cupertino`) no
check is drawn and no room is kept. A change of condition recolors over `motion.selection-*`, and the leading glyph's
column opens or closes over the same motion (`grid-template-columns` 0fr ↔ 1fr), so the content re-centres. The first
condition a segment is told is drawn without motion. All of it is at once under `prefers-reduced-motion: reduce`.
Fewer than two or more than five segments still render (reported, SEG-22). Parts: `set` (set); `container`, `icon`,
`check`, `label`, `divider` (segment).

**Differences from the other platforms.** None in behaviour. The web has no gallery app; the fixtures are drawn by the
test harness (`test/harness.ts`) on a 400 × 96 stage.

## `<tanrei-button-group>`

A few related Buttons, labelled or icon-only, in one row or one column, spaced apart (`standard`) or joined into one
shape (`connected`), the confirming and the dismissive ones placed by the orientation, named as a group when it has a
label (`specs/button-group.spec.json`, BGR-1…23).

```html
<tanrei-button-group>
  <tanrei-button variant="outlined" dismissive>Cancel</tanrei-button>
  <tanrei-button variant="tonal">Save draft</tanrei-button>
  <tanrei-button confirming>Publish</tanrei-button>
</tanrei-button-group>
<tanrei-button-group variant="connected" label="Text style">
  <tanrei-button variant="tonal" toggle selected label="Bold"><span slot="icon">format_bold</span></tanrei-button>
  <tanrei-button variant="tonal" toggle label="Italic"><span slot="icon">format_italic</span></tanrei-button>
  <tanrei-button variant="tonal" toggle label="Underline"><span slot="icon">format_underlined</span></tanrei-button>
</tanrei-button-group>
<tanrei-button-group orientation="vertical" full-width>
  <tanrei-button variant="tonal" dismissive>Not now</tanrei-button>
  <tanrei-button variant="tonal" confirming>Allow</tanrei-button>
</tanrei-button-group>
```

| `<tanrei-button-group>` | Type | Default | |
|---|---|---|---|
| `variant` | `standard` \| `connected` | `standard` | standard spaces the items `comp.button-group.standard.gap` apart; connected joins them into one shape with rounded outer ends, by a divider or by a gap (`separation`). Anything else is drawn as standard and reported (BGR-9); reflected |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | one row, or one column in which every item is as wide as the column. Anything else is horizontal and reported (BGR-9); reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | how a connected group is joined (BGR-21, see Separation): `auto` takes `comp.button-group.connected.separation`, the system's answer. Ignored while standard. Anything else is `auto` and reported (BGR-9); reflected |
| `fullWidth` / `full-width` | boolean | `false` | the group takes its container's width and its items share it equally (in a column each is that wide); reflected |
| `label` | string | `""` | the group's accessible name ("Text style"). Optional: a row of actions each named by its own label needs none |

| On a `<tanrei-button>` child | |
|---|---|
| `confirming` | the Button completes the task (OK, Save, Next, Delete): placed at the end of a row and at the top of a column |
| `dismissive` | the Button backs out of it (Cancel, Back): placed at the start of a row and at the bottom of a column |

It fires no event of its own; its one part is `divider`. Its items are ordinary `<tanrei-button>` children, with their
own props, states, `click` and `change`, semantics and Tab stop (BGR-5). The group takes no focus, handles no key and
keeps no selection; a toggle Button in it stays independent (one choice among several is a `<tanrei-segmented-button>`).

**Order (BGR-13…15, BGR-18, BGR-19).** A row is the dismissive items, then the unflagged, then the confirming; a column
the confirming, the unflagged, the dismissive; each run in the order given. The two attributes are read from the
children (a `MutationObserver` re-places them when one changes, BGR-11); the Button draws nothing for them, and a child
with both is placed among the unflagged and reported. The children are **not moved in your DOM**: the shadow root has one
slot per child, in the placed order, and each child is assigned to its slot by hand (`slotAssignment: 'manual'`), so
focus and the accessibility tree — which walk the flat tree — follow the placed order, and CSS `order` is not used. The
runs are read by the same primitive a dialog and a side sheet place their actions with (`ActionPlacement`,
`src/primitives/actions.ts`).

**Semantics (BGR-6).** With a label the host is `role="group"` with `aria-label`; without one it has no role and no name,
so assistive technology sees only its items. `ElementInternals` carries no role.

**Layout (BGR-1, BGR-7, BGR-8, BGR-12, BGR-17).** The host is an `inline-flex` box at its natural width, never wider than
its container (`max-inline-size: 100%`); its one child, `.row`, is the flex row (or column) of the slots, in the inline
direction (a row starts at the right in right-to-left; a column is top to bottom in either). Standard: the items centred
on the row's middle, each at its own height. Connected: every item stretched to the tallest. A row that does not fit
narrows its Buttons (flex shrink, so each gives up the same share of its own width) down to their longest word: inside a
group a Button's label may wrap, centred. Icon-only Buttons keep their size. The row never wraps or scrolls; one that
still does not fit overflows its end, and a debug build reports it. A column is as wide as its widest item, and narrower
than that its labels wrap. Full-width: the host is a block-level flex box of its container's width, each item
`flex: 1 1 0` — equal shares, and an item that cannot be as narrow as its share (its longest word, an icon-only Button's
width) keeps its minimum while the others share the rest (reported, BGR-17).

**What a connected group gives its items (BGR-2, BGR-3, BGR-11, BGR-16, BGR-22, BGR-23; BTN-10).** Through CSS custom
properties it sets on its slotted children, by the slot's place, and that Button reads on its container — an internal
contract between Tanrei elements, not a styling API:

| Property | |
|---|---|
| `--tanrei-group-start-radius`, `--tanrei-group-end-radius` | a row item's start and end corners: `connected.horizontal.outer-shape` at the row's two ends, and where two items face each other `connected.inner-shape` under gap and `0` under divider |
| `--tanrei-group-top-radius`, `--tanrei-group-bottom-radius` | a column item's top and bottom corners: `connected.vertical.outer-shape` at the column's two ends, the same inner corners |
| `--tanrei-group-pill` | whether the item's outer corner is a pill, which corner smoothing leaves round |
| `--tanrei-group-min-width`, `--tanrei-group-min-height` | the target (`sys.target.pointer`, `sys.target.touch` for a coarse pointer) along the join: wide in a row, high in a column |
| `--tanrei-group-seam-start`, `-end`, `-top`, `-bottom` | `1` on an edge that touches a neighbour under divider |
| `--tanrei-group-outer-start`, `--tanrei-group-outer-end` | `connected.horizontal.outer-inset`, the padding added at a joined row's first start and last end (not in a column, not for a single item) |

Each radius is held to half the item's measured height by the item (a pill's 9999 px radius beside a small inner radius
would otherwise scale every corner of the box down together), and the fill, the outline, the ripple and the ring or
glow follow each corner, concentric. They change with the slot's place and with the separation, at once: a joined item's
corners never transition. Each item also learns where it sits (`GroupItemController`, `src/primitives/group-item.ts`) —
the group tells it, and it asks its parent when it connects — which lets its label wrap, caps its hit area along the row
or the column, and lets an icon-only item fill a column's or a share's width.

**The divider (BGR-22, BGR-24).** Under divider the group draws the line of a seam itself: an empty `::part(divider)`
element between two slots — it takes no space, no press (`pointer-events: none`) and is `aria-hidden` — whose `::before`
is `connected.divider.thickness` thick, centred on the seam and `connected.divider.inset` short of each end. A seam
carries a line only while the two items it joins **rest on the same fill**: the group reads the color each item renders
its container from at rest (`comp.button.<variant>.container.color`, and a toggle's `selected.` or `unselected.` part)
from the cascade, resolves it in a hidden probe and compares — two containers without a fill count as the same — and
writes the answer on the divider (`data-line`). Between a selected toggle and an unselected one, or a filled Button and
an outlined one, there is no line: the edge of the fill already marks the seam. The line is `connected.divider.color` —
the hairline in the default system, the color of an outlined Button's edge — and `connected.divider.on-fill.color`
between two emphasis fills (filled Buttons that are no toggles; selected toggles of the filled, tonal, elevated or
outlined variant). The comparison is of resting, enabled looks, so hover, focus, press and disabling move no line; a
changed `selected`, `toggle` or `variant` is followed in the same frame (a MutationObserver), and a system or theme
switched on the root when the group renders again. A hairline centred on a whole-pixel seam is drawn on the pixel after it. **No outline and no ring
along a seam:** Button's outline and its elevation's ring are rings around its whole box, and a ring cannot leave one
side out — so under a divider the item's container does not draw them. Its box ends at the seam and paints the fill alone:
two fills that touch are two neighbouring boxes, which an engine snaps to the same device pixel, so no fill is painted
twice at a seam (a translucent one — a disabled filled or tonal Button's — would show it as a darker strip) and nothing
of the page shows between two. The outline and the elevation are drawn by the container's `::after`: a box of the
container's shape that reaches a little past each seam (`sys.space.space50`) and is cut at the seam with `clip: rect()`,
so the ring's seam side is outside the cut and the rings of the other sides run straight to the seam and end there — the
outline of the row is one line of one color through every seam. The cut is a rectangle, which engines snap as they snap a
box; a `clip-path` there is antialiased where layout puts it (Chromium) or rounded on its own (Firefox, WebKit), and two
of them meeting at one seam overlap or leave a line. `rect()` counts from the box's top left corner in lengths, so the
item measures its container (`--_box-width`, `--_box-height`, a ResizeObserver) for the right and the bottom edge of the
cut. Every other side is left `sys.target.touch` of room for the elevation's blurred layers. While an item has keyboard
focus its `::after` is the focus ring: it then draws its shadows itself, whole, over its neighbours, so its focus ring is
whole around its own shape (its own outline then shows on its seam sides too, under the ring). What is not exact: at a
fractional device pixel ratio an engine antialiases or rounds the edge between any two neighbouring boxes, these too;
and an elevation's blurred layers are cut where two items meet, a little lighter there than under the middle of an item.

**Standard targets (BGR-4).** An item's hit area (`::before`) still reaches the target, but toward a neighbour no further
than half `standard.gap` — along the row, or along the column — so a press on an item's visible bounds is always that
item's and a press in the gap goes to the nearer item; the first item's start and the last one's end reach as far as
they would alone.

**Debug reports.** A row that still does not fit (BGR-7), a full-width row that cannot be shared equally (BGR-17), an
unknown variant, orientation or separation (BGR-9), fewer than two children, a child that is not a `<tanrei-button>`
(it is still laid out, but gets no corners or width; BGR-10) and a child that is both confirming and dismissive
(BGR-18) are reported once each.

**Differences from the other platforms.** The web can tell the input type, so a connected icon-only Button is
`sys.target.pointer` wide under a fine pointer (44 in the default system) and `touch` under a coarse one; the fixture
baselines are drawn under the harness's fine pointer, where the other platforms draw the touch width. Corner smoothing is
one amount per box on the web: an end item whose outer corner is a pill is drawn at smoothing 0 whole — its inner
corners are circular rather than eased under gap — while a middle item's inner corners are eased. The fixtures are drawn by the test harness (`test/harness.ts`) on a 400 × 96
stage, and the vertical ones on a 400 × 240 stage.

## `<tanrei-stepper>` and `<tanrei-stepper-step>`

Where a person is in a flow the product runs in a fixed order of steps: the current step, the complete ones, one with an
error, the ones to come — and, where the product allows it, the steps they can press to go back to
(`specs/stepper.spec.json`, SPR-1…27).

```html
<tanrei-stepper label="Checkout progress" value="payment" pressable="visited"
  completed-text="Completed" error-text="Has an error" position-text="Step {position} of {count}">
  <tanrei-stepper-step value="account" label="Account"></tanrei-stepper-step>
  <tanrei-stepper-step value="shipping" label="Shipping" status="error" description="Postcode missing"></tanrei-stepper-step>
  <tanrei-stepper-step value="payment" label="Payment"></tanrei-stepper-step>
  <tanrei-stepper-step value="review" label="Review"></tanrei-stepper-step>
</tanrei-stepper>
<script type="module">
  const stepper = document.querySelector('tanrei-stepper');
  stepper.addEventListener('select', (e) => (stepper.value = e.detail.value));
</script>
```

| `<tanrei-stepper>` | Type | Default | |
|---|---|---|---|
| `label` | string | `""` | the list's accessible name, not drawn (an empty one is reported, SPR-21) |
| `value` | string | `""` | the current step's value; empty, or a value no step has, makes none current. Never set by the element |
| `layout` | `horizontal` \| `vertical` \| `compact` | `horizontal` | horizontal turns compact by itself below the number of steps × `step.min-width` (SPR-6); reflected |
| `pressable` | `none` \| `visited` \| `all` | `none` | which steps are buttons: none; the complete and error ones that are not current; every one that is not current (SPR-9); reflected |
| `completedText` / `completed-text` | string | `""` | heard after a complete step's label; empty reads the product's words (`stepCompletedText`) |
| `errorText` / `error-text` | string | `""` | heard after the label of a step with an error; empty reads `stepErrorText` |
| `positionText` / `position-text` | string | `""` | the compact form's line, with `{position}` and `{count}`; empty reads `stepPositionText` |

| `<tanrei-stepper-step>` | Type | Default | |
|---|---|---|---|
| `value` | string | `""` | identifies the step (empty and repeated values are reported); reflected |
| `label` | string | `""` | the step's name |
| `description` | string | `""` | a second line under the label |
| `status` | `auto` \| `incomplete` \| `complete` \| `error` | `auto` | auto is complete before the current step and incomplete after it; error is kept on the current step (SPR-1); reflected |
| `disabled` | boolean | `false` | while `pressable` is not none: drawn disabled and a disabled button; ignored on the current step; reflected |

| Event (on the stepper) | When |
|---|---|
| `select` | `CustomEvent<{ value }>`, bubbling and composed: a pressable step was pressed — pointer, Enter, Space or `step.click()`. `value` is not changed |

**Semantics (SPR-19).** The host is `role="list"` named by `aria-label`; each step's host is `role="listitem"`, the
current one with `aria-current="step"`. A pressable step draws a native `<button>` in its shadow root around its marker and
text; a step that is not pressable the same parts in a `<div>`. The word for a condition is a visually hidden span after
the label. The marker, the connector and the bar are `aria-hidden`. In the compact form the steps are assigned to no slot
(not drawn, not exposed) and the host becomes `role="group"`, reading the position and the current step's label.

**Layout (SPR-4, SPR-5, SPR-6, SPR-8, SPR-18).** Horizontal: the steps are equal flex columns, each container
`container.padding` in, the marker at its start and the text under it `marker.gap` below. Vertical: one column, the text
beside the marker, the marker centred on the label's first line. Every container is at least the minimum target. The
connector is each step's absolutely placed `part="connector"`, from `connector.gap` after its marker to the same before
the next one, above every container. The width threshold of the compact form is measured with a `ResizeObserver` against
a probe of `step.min-width`.

**Motion (SPR-17).** Colors move over `motion.state-*`. When a step's container changes element (a button becomes plain
when the step becomes current), the old colors are carried over and run out with the Web Animations API over the same
motion. Parts: `steps`, `compact`, `bar`, `position` (stepper); `container`, `marker`, `label`, `description`,
`connector` (step).

## `<tanrei-search>`, `<tanrei-search-suggestion>`, `<tanrei-search-result>` and `<tanrei-search-result-group>`

Lets people search the product from a bar or a compact trigger, and offers suggestions and results while they type in a
view under the bar, in a dialog or over the whole screen (`specs/search.spec.json`, SRC-1…51). The field with its
suggestions comes first below; the site search — a trigger, a dialog view, results that are links, a status row — is
under "A site search".

```html
<tanrei-search label="Search mail" placeholder="Search mail" clear-label="Clear search" back-label="Back">
  <tanrei-button variant="text" slot="leading" label="Menu"><span slot="icon">menu</span></tanrei-button>
  <tanrei-button variant="text" slot="trailing" label="Voice search"><span slot="icon">mic</span></tanrei-button>
  <tanrei-search-suggestion value="invoices" headline="invoices" leading-icon="history"></tanrei-search-suggestion>
  <tanrei-search-suggestion value="folder:invoices" headline="Invoices" supporting-text="Folder · 24 messages" leading-icon="folder"></tanrei-search-suggestion>
</tanrei-search>
<script type="module">
  const search = document.querySelector('tanrei-search');
  search.addEventListener('input', () => updateSuggestions(search.value)); // your own suggestions for the query
  search.addEventListener('select', (e) => (search.value = e.detail.value)); // or open the result
  search.addEventListener('submit', (e) => runSearch(e.detail.value));
</script>
```

| `<tanrei-search>` | Type | Default | |
|---|---|---|---|
| `presentation` | `docked` \| `dialog` \| `full-screen` | `docked` | where the view opens: under the bar (a large screen), in a modal dialog hung from the top of the window (a large screen, from a trigger), or over the whole window with its own header (a small screen). You choose it by your own breakpoints. Unknown is docked (reported, SRC-27); reflected |
| `bar` | `field` \| `button` \| `icon` | `field` | what stands where the search is placed: the bar with its input, a trigger shaped like the bar, or an icon-only Button. A trigger opens a modal view. Unknown is `field` (reported); reflected |
| `shortcut` | chords separated by spaces (`mod+k`); the property is `string[]` | `[]` | the shortcut that opens the search: drawn as a hint and exposed as `aria-keyshortcuts`. It works only with `bind-shortcut` |
| `bind-shortcut` (`bindShortcut`) | boolean | `false` | the search listens for `shortcut` on the window while it is connected and enabled |
| `status` | `idle` \| `loading` \| `error` | `idle` | what your search is doing. Unknown is `idle` (reported); reflected |
| `status-text` (`statusText`) | string | `""` | the status row's text, announced when it changes |
| `value` | string | `""` | the query. Setting it shows it and fires nothing; the `value` attribute is what a form reset returns to |
| `label` | string | `""` | names the field, the suggestions' listbox and the full-screen view ("Search mail"). Never drawn, never the placeholder. Required: empty is reported (SRC-27) |
| `placeholder` | string | `""` | the hint while the value is empty |
| `expanded` | boolean | `false` | whether the view is open; reflected. **The element sets it itself** before it fires `toggle`; set it to open or close the view without an event |
| `disabled` | boolean | `false` | not focusable, editable or expandable; no events, no clear button; exposed disabled. A `<fieldset disabled>` does the same |
| `clear-label` (`clearLabel`) | string | `""` | the clear button's name, in your language ("Clear search"); empty is reported while the button shows (SRC-10) |
| `back-label` (`backLabel`) | string | `""` | the name of the back button in a modal view's header, dialog or full-screen ("Back"); empty is reported while the view is open (SRC-11) |
| `name` | string | `""` | form-associated: it submits `value` under this name |
| `inline` | boolean | `false` | for tests and documentation: the open view drawn in place — the docked view under the bar, the full-screen view filling the element — without the overlay's behaviour |

`<tanrei-search-suggestion>` (the spec's item kind `suggestion`): `value` (what `select` carries; unique), `headline` (its
text and name), `supporting-text` (a second line, and its description), `leading-icon` (a glyph of the icon set). It is
data, as an `<option>` in a `<datalist>`: it draws nothing itself; the search draws the rows in its shadow root, so that
they are in the same tree as the input its `aria-activedescendant` points from. Every other child without a slot is the
view's own content, after the suggestions (results, a "no results" message), handed the headline color and — for plain
text — `sys.typescale.body` (SRC-29). Slots: `leading` (an icon-only Button in place of the search glyph), `trailing` (up to
two icon-only Buttons after the clear button; more are laid out and reported). Parts: `container` (the bar), `input`, `view`,
`dialog`, `listbox`.

`element.focus()` sends focus to the input it belongs to now: the header's while a modal view (dialog or full-screen) is
open, the bar's while the view is docked or closed, and the trigger while a search drawn as a button or an icon is
closed. It opens and closes nothing, and a disabled search takes none. It is how the product's own content in the view
gives focus back when it removes the element that held it — an empty state's "clear the search" button that goes with
the empty state — as the search's own clear button does (SRC-10); there is no need to reach into the shadow root.

| Event (on `<tanrei-search>`) | When |
|---|---|
| `input` | the person changed the value — typing, deleting, pasting, an input method (once, when the composition is committed as well as while it runs), the clear button, Escape. The native event, composed; `value` is already the new one. Never when you set `value` |
| `submit` | `CustomEvent<{ value }>`, not bubbling, cancelable: Enter (the keyboard's Search key) with no suggestion active. The view then closes; inside a `<form>` the form's submission is requested unless you cancelled it |
| `select` | `CustomEvent<{ value }>`, not bubbling: a suggestion was chosen (a press, or Enter while it is active). The view then closes. **The value is not changed**: set the value you want |
| `toggle` | `CustomEvent<{ expanded, reason }>`, not bubbling: the view opened (`reason: null`) or closed — `escape`, `back`, `select`, `submit`, `outside`, `tab` or `focus-out`. `expanded` is already the new value. Once per change |

**Opening and closing (SRC-5, SRC-6).** A press on the bar (not on a slot's button or the clear button), typing, or Down
Arrow opens the view. Focus alone never does: tabbing onto the input, or focus coming back from the full-screen view,
leaves it closed. Escape closes it anywhere in the search; choosing, submitting and — in a modal view — the back button (or the
browser's own close request, which reaches the `<dialog>` as `cancel`: reason `back`) close it; docked, so do a press
outside the bar and the view (**which also reaches the element under it**: the search listens in the capture phase and
prevents nothing), Tab and Shift+Tab (focus then moves on as it would have), and focus moving out of the search. The
docked view does not listen for the platform's close request (as the menu).

**The docked view (SRC-7, SRC-8, SRC-23).** A `popover="manual"` element in the shadow root, in the top layer, placed **by
script** (as the menu's, not with CSS anchor positioning):
`view.offset` below the bar, exactly as wide and aligned with it, flipped above when the room below (within
`view.viewport-margin` of the viewport and of the on-screen keyboard, read from `visualViewport`) is less than it needs
and the room above is more; its height limited to the room left (the content scrolls), and followed while open (by events,
`FollowController`). It is drawn only while it has content: expanded with no suggestion and no content, nothing shows and the search
stays expanded. Focus stays in the input the whole time (a press on the view or a suggestion is prevented from taking
it); nothing is inert and there is no scrim. It fades in and grows from the edge facing the bar over `motion.open-*`, and
fades out over `motion.close-*` (at once under reduced motion).

**The full-screen view (SRC-9, SRC-11).** A `<dialog>` opened with `showModal()`, over the whole window in
`view.container.color` (no backdrop): the rest of the page is inert and hidden from assistive technology, the page's
scroll is held, and Tab wraps inside it. Its header — a medium icon-only text Button showing the icon set's `arrow_back` (mirrored
in right-to-left), the input with the same value and a medium clear button — sits inside `env(safe-area-inset-*)` (which
needs `viewport-fit=cover` to be non-zero), a divider under it, then the suggestions and your content, above the
on-screen keyboard. Opening focuses the header's input with the caret at the end; closing returns focus to the bar's
input, which does not reopen it. A press on the view that would take focus nowhere keeps it inside. It fades in and out
over the open and close motion. The slots are not drawn in the header.

**Keyboard (SRC-12…15).** The WAI-ARIA combobox pattern: Down / Up Arrow move the active suggestion while focus stays in
the input (Down from none is the first; it stays on the last; Up on the first leaves none); typing, deleting, moving the
caret or new suggestions leave none active; the active row is scrolled into view. Enter chooses the active suggestion, or
submits. Escape closes the view; closed, it empties a value (one `input`), and with none it does nothing and passes on.

**Semantics (SRC-24).** The input is a native `type="search"` (a searchbox) with `enterkeyhint="search"` and `dir="auto"`,
named by `aria-label` from `label`, never by the placeholder. While the view shows suggestions it is a `combobox` with
`aria-autocomplete="list"`, `aria-expanded="true"`, `aria-controls` naming the `listbox` (named by `label`) and
`aria-activedescendant` naming the active `option` (`aria-selected="true"`); each option is named by its headline
(`aria-labelledby`) and described by its supporting text (`aria-describedby`). The spec names the combobox for the docked
view; the web's full-screen header input is one too, so the active suggestion is announced there as well. Icons and the divider are hidden; the full-screen view is a modal `dialog` named by
`label`; the clear and back buttons are icon-only Tanrei Buttons named by `clearLabel` and `backLabel`.

**The bar and its states (SRC-1…3, SRC-16…22).** One row at least `container.height` high: the glyph (or the leading
button) `container.padding-inline` (`-with-button`) from the start, `container.gap` between elements — the action
buttons (the clear button, then the trailing slot's) `container.button-gap` from one another, 0 in the default system,
and two of them further apart only as far as each needs to keep `sys.target.touch` of length along the row (SRC-34: the
small clear button and a medium Button 12 apart, two medium Buttons 8, two of 48 or more touching; the search measures
its buttons and lays the space before each trailing button as an element of its own trailing box,
`src/primitives/kept-length.ts`, writing nothing on the product's buttons, so a page's reset leaves it) — the last one
`container.padding-inline-with-button` from the end when it is a button, `container.padding-inline` when it is the input;
mirrored in right-to-left. Its edge is a border inside the bar in the state's outline color and width — clear at rest in
the default system, the focused outline under focus by pointer or keyboard (never a ring; a glow as well under
`focus-style: glow`). Hover, focus and press read their own `standard` tokens (pressed > focused > hovered, disabled over
all), with press-hold and the four `pressed-feedback` answers on the bar (by pointer only) and on a row (by pointer or
Enter). The active suggestion takes the focused tokens and the ring (or glow) inside its row, without animation; a pointer
over a row never makes it active. The input's selection is the text field's pair, `comp.text-field.selection.color` behind
`comp.text-field.selection.content.color`; the browser's own cancel
button is hidden. The bar's hit area reaches the minimum target vertically; the rows are at least the target tall.
Editing follows the text field (TXF-1, TXF-4, TXF-24) through the same primitive (`NativeTextController`).

**Glyphs (SRC-2, SRC-10, SRC-11, SRC-30).** The search draws three glyphs of the icon set and no mark of its own: `search`
at `leading-icon.size` in the unselected family and fill (never mirrored), `close` in the clear Buttons (never mirrored)
and `arrow_back` in the back Button (mirrored in right-to-left). Until the icon set can draw one of them, nothing is drawn
in its box — never its name — and every box keeps its size, so the bar's layout does not change; the clear and back
Buttons stay operable and named (`GlyphDrawnController`: the Buttons' glyph is the slotted `.button-glyph`, sized by the
Button's icon box).

**Debug reports (SRC-10, SRC-11, SRC-27).** An empty label, clearLabel or backLabel; an unknown presentation; a suggestion
with an empty or repeated value or an empty headline; more than two trailing elements.

### A site search (SRC-35…51)

```html
<tanrei-search bar="button" presentation="dialog" label="Search the docs" placeholder="Search" shortcut="mod+k" bind-shortcut clear-label="Clear search">
  <tanrei-search-result-group value="/tokens/" headline="Design tokens" href="/tokens/" leading-icon="article">
    Colors, sizes and motion as <mark>tokens</mark>, in three tiers.
    <tanrei-search-result value="/tokens/#layers" headline="Layers" href="/tokens/#layers" leading-icon="tag">
      A layer changes the value of a <mark>token</mark> and may add its own.
    </tanrei-search-result>
  </tanrei-search-result-group>
  <tanrei-button variant="text">Load more results</tanrei-button>
</tanrei-search>
<script type="module">
  const search = document.querySelector('tanrei-search');
  let asked = 0;
  search.addEventListener('input', async () => {
    const mine = ++asked; // the search never queries, waits or debounces (SRC-51): that is yours
    search.status = 'loading';
    search.statusText = 'Searching';
    const found = await query(search.value);
    if (mine !== asked) return; // a newer question was asked: drop this answer
    show(found); // replace the <tanrei-search-result> children
    search.status = 'idle';
    search.statusText = `${found.length} results for ${search.value}`; // once per answer: it is announced
  });
  search.addEventListener('select', (event) => { /* a result was activated in place; event.preventDefault() hands it to your router */ });
</script>
```

**The trigger (SRC-35, SRC-36).** `bar="button"` draws one native `<button>` in the bar's place — the bar's fill,
elevation and shape at `trigger.container.height` (40), the search glyph at `trigger.leading-icon.size`, the placeholder
(or the label) on one line in `trigger.label.typescale`, cut with an ellipsis, and the hint — and `bar="icon"` a medium
icon-only text `<tanrei-button>` (the host is then `inline-block`). It is named by `label`, says `aria-haspopup="dialog"`
and `aria-expanded` (for the icon form the search writes them on the Button's native button), shows keyboard focus by
the bar's focused outline and never focus by pointer, and is pressed as the bar is. It opens a **modal** view:
`presentation="docked"` with a trigger opens as the dialog and is reported when it opens. The input, and the value, are
in the view's header only. Closing returns focus to the trigger.

**The shortcut (SRC-37…39).** The hint is a hosted `<tanrei-keyboard-shortcut>` in its `plain` variant (a line of
text as a menu or a tooltip writes it — ⌘K, Ctrl+K — with no keycap; small, the ambient convention — KBS-2), in
`shortcut.typescale` and `shortcut.color`: at the end of a button trigger, and in
the bar after the input while the value is empty and the input is not focused. It takes no press (`pointer-events:
none`). The keys are `aria-keyshortcuts` on the trigger, or on the bar's input. With `bind-shortcut` the search adds
**one `keydown` listener on `window`** (bubble phase, so a press something else cancelled is left alone), removed when it
is disconnected, disabled or unbound: the chord opens it and closes it again (reason `shortcut`) and is then cancelled.
`mod` is read in the convention the hint is written in — Command under `apple`, Control otherwise. It binds exactly one
chord of modifiers and one key; a chord without mod, ctrl or alt is ignored while focus is in an input, a textarea, a
select or editable content. Of two searches that name one chord the one shown first keeps it; the other is reported and
takes it when the first goes.

**The dialog view (SRC-40, SRC-41).** The same `<dialog>`, opened with `showModal()`: centred, `view.dialog.offset`
below the top, `min(view.dialog.max-width, the window less view.viewport-margin at each side)` wide, as tall as its
content up to the room left (its content scrolls under the header), its top fixed while its content changes. The scrim
is its `::backdrop` in `view.scrim.color`; **a press on it closes the view (reason `outside`) and reaches nothing under
it** — the page is inert. Its header starts with the back button of the full-screen header, in the
search glyph's place and named by `back-label`: Tab reaches it and Enter or Space on it closes the view (reason `back`),
so a person with neither Escape nor a pointer can leave. Both fade over the open and close motion; where `overlay` and
`transition-behavior: allow-discrete` are missing the view leaves at once.

**Results (SRC-42…46, SRC-49, SRC-50).** `<tanrei-search-result>` draws a suggestion's row from the suggestion tokens in
its own shadow root, because the row is its own `<a href>` (a `<button>` without `href`, or with a `javascript:` one).
The browser follows the link: Enter and a press activate it, a modifier key or the middle button opens a tab, the context
menu and the status bar are its own; `target="new"` is `target="_blank"` with `noopener` in `rel` (`rel` and `download`
are forwarded), and `target-label` is read after the excerpt. **The excerpt is the element's child content** — text
with `<mark>` around the matches, styled through `::slotted(mark)`; putting an engine's HTML there is your act — or,
while it has none, the `excerpt` runs (the property is `string[]`, every second run a match; the attribute is a JSON
array). A match is `result.mark.color` with its weight raised by `result.mark.emphasis`, over `result.mark.container.color`.
`<tanrei-search-result-group>` is a quiet title over its results, or — with `href` — a result's row with its results
inset by `group.indent`; its own excerpt is its child content besides its results (the group assigns its slots by
hand, so a `slot` attribute on its children is not read). The search places results after the status row whatever the
children's order, by giving them `slot="result"`. A result holds no listener: the search answers every row from its own
(`click`, `pointerdown`, `keydown`, `focusin` on the host), so a page of a hundred results adds none.

Activated in place — a primary press, a touch or Enter, no modifier, `target` same — a result fires `select`
(**cancelable**: cancelling it keeps the link from being followed) and the view closes with the reason `select`. Opened
any other way, nothing is fired and the view stays open. Down Arrow in the input, with no suggestion left to go to, moves
**real focus** to the first result and on through them, across groups; Up Arrow comes back, to the input from the first.
Typing a character, Backspace, Delete or pasting on a result moves focus to the input, where the key then acts. Tab goes
through the links in a modal view; docked, it closes the view and moves on from the input. A result is a `listitem` of a
`list` named by `label`, a group a `group` named by its headline holding its own `list`; a result is never an option,
and the input is a combobox only while the view shows suggestions.

**The status row (SRC-47, SRC-48).** Always in the view, and empty until there is something to say: a `role="status"`
element that holds `status-text` while idle and a `role="alert"` one that holds it while `status="error"` (drawn in
`status.error.color`). While `loading` both are empty, a small `<tanrei-loading-indicator>` named by `status-text`
stands at the row's start after its own show delay, and the results' list carries `aria-busy="true"`.

**Enter in the input (SRC-13).** `submit` is fired; the view then closes only when it shows no result, no group and no
status row.

**Differences from the other platforms.** The web has the combobox and listbox roles, so its suggestions are options of a
listbox the input controls, where the other platforms expose buttons with their position. The element sets its own
`expanded` (as SwiftUI's binding and Flutter's controller do). The web has no gallery app; the fixtures are drawn by the
test harness (`test/harness.ts`): a bar 328 wide centred on a 360 × 72 stage, the docked view in place under the bar on
360 × 320, and the full-screen view filling a 360 × 480 stage.

## `<tanrei-slider>`

A value, or a range of two, chosen along a track (`specs/slider.spec.json`, SLD-1…24).

```html
<tanrei-slider name="volume" label="Volume" value="40" value-indicator="active"></tanrei-slider>
<tanrei-slider label="Brightness" value="30" step="10" stops></tanrei-slider>
<tanrei-slider label="Balance" min="-50" max="50" origin="0" value="20"></tanrei-slider>
<tanrei-slider name="price" range min="0" max="500" step="10" start-value="100" value="300"
  label="Maximum price" start-label="Minimum price" value-text="$300" start-value-text="$100"></tanrei-slider>
<tanrei-slider orientation="vertical" label="Volume" value="60" style="block-size: 12rem"></tanrei-slider>
```

| Property / attribute | Type | Default | |
|---|---|---|---|
| `size` | `small` \| `medium` \| `large` (open) | `small` | the track's thickness and corners, the handle's height and the stop dots' size; a size the system lacks is drawn small and reported (SLD-23); reflected |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | anything else is drawn horizontal and reported; reflected |
| `value`, `startValue` / `start-value` | number | `0`, `0` | the only (or end) handle's value, and a range's start; the attributes are the form's defaults |
| `range` | boolean | `false` | two handles, from `startValue` to `value` |
| `min`, `max`, `step` | number | `0`, `100`, `0` | `step` 0 is continuous; above 0 the values are `min` plus whole multiples of `step` up to `max` |
| `origin` | number \| null | null (no attribute) | where the active track starts; a value inside the range makes a centered slider; ignored for a range |
| `stops` | boolean | `false` | a dot at every step (ignored while `step` is 0) |
| `valueIndicator` / `value-indicator` | `none` \| `active` \| `always` | `none` | the value beside the handle: never, while pressed or keyboard-focused, or always |
| `disabled` | boolean | `false` | reflected; a disabled `<fieldset>` disables it too |
| `label`, `startLabel` / `start-label` | string | `""` | the handles' accessible names; never drawn — put your visible label beside the slider, in the same words |
| `valueText` / `value-text`, `startValueText` / `start-value-text` | string | `""` | the value as words ("40 %"), read and shown in place of the number |
| `name` | web only | `""` | form participation: submits `value`; a range submits `start-value`, then `value`, under the same name |

| Event | When |
|---|---|
| `input` | every change the person makes (each value during a drag, each key); `CustomEvent<{ value, startValue? }>`, bubbles and is composed, so React's `onInput` sees it |
| `change` | the change is finished (the press ended with a new value, or a key changed it), after its `input`; `CustomEvent<{ value, startValue? }>` |

The element sets its own `value` (and `startValue`) before it fires either; a value you set fires neither, and the handle
moves to it over `motion.value-*`.

**Semantics (SLD-19).** Each handle is an element with `role="slider"` in the shadow root — not `<input type="range">`
(one handle, no gap, no dots, and parts no two engines style alike) and not `ElementInternals` — with `aria-label`, `aria-valuemin` / `-max` (in a range, bounded by the other handle),
`aria-valuenow`, `aria-valuetext` and `aria-orientation`, and `aria-disabled` while disabled. Each is its own Tab stop,
the start handle first; the host delegates focus to the first. The tracks, dots, state layer and value indicator are
`aria-hidden`. The value text is `value-text`, or the value in the locale of the nearest `lang` with as many fraction
digits as the keyboard step has, at most two (SLD-18).

**Pointer, touch and keys (SLD-2, SLD-3).** The whole slider is the hit area, reaching `sys.target.pointer` across the
track (`touch` for a coarse pointer). A pointer press moves the nearer handle there at once (in a range whose handles
meet, the one that can move toward the press), focuses it without the ring, and a drag follows with the pointer
captured. On touch the handle moves when the press has travelled 8 px along the track (Android's touch slop: the web
does not expose the platform's), or when a press that did not move ends; the host has `touch-action: pan-y`
(`pan-x` when vertical), so a press that travels across the track scrolls the page and changes nothing. The arrow
keys move one keyboard step (Right and Left swapped in a right-to-left horizontal slider), Page Up / Down ten, Home /
End to the ends the handle can reach.

**Geometry (SLD-7 … SLD-10, SLD-21).** A horizontal slider is `display: block`, as wide as its layout and as tall as the
larger of `container.size` and the handle's height; a vertical one is `inline-block`, as tall as its layout
(`block-size: 100%`: give it a height) and runs from the bottom up in either direction. The track is inset by half the
container size from each end, and a handle's center travels between the two points half the track's thickness in from
its ends. The tracks are three pieces between points of that travel (a fraction and an offset in tokens), rounded by
`track.shape` at the track's ends (SLD-8). While `track.gap` is 0 the pieces run under each handle and meet square at
its center, hidden by its fill, so the active track runs into the handle's outline with nothing between them; above 0
they stop `track.gap` beyond the handle's edge (its half width in its own state, so they follow a pressed bar that
narrows) and are rounded there, which is Material's bar in m3-like. Each piece's dots lie along the whole travel and are
clipped to the piece (`clip-path: inset()` in the same percentages), so a dot is drawn only on its piece, in that
piece's dot color, `stop-indicator.size.<size>` across (SLD-9), and never in a handle's gap (with no gap, a dot under a
handle lies under its fill).

**Handle (SLD-24).** The handle's background is its fill (`standard.handle.color`) and its `::before` draws the
outline: a border of `handle-outline.width` in `standard.handle-outline.color` at `inset: 0` with `box-sizing:
border-box`, over the fill and inside the handle's edge, so the outline never changes the handle's size, its travel, its
focus ring or the value indicator's place (0 draws none). The outline is not the handle's own border because the focus
ring's `::after` is placed from the handle's padding box. The fill stops a quarter of the outline's width inside the
edge (`padding`, `background-clip: content-box`): a fill reaching the edge is anti-aliased there together with the
outline and shows through the outline's soft outer edge as a light seam across the active track. Without an outline the
fill reaches the edge.

**States (SLD-11 … SLD-14, SLD-20).** Each handle's container, fill, outline, width and elevation come from its own state; the
tracks, dots and opacity from the highest state of any handle. Hover is the handle a fine pointer would move
(`data-hovered`), focus is keyboard focus only, pressed is `data-pressed` on the pressed handle's container
(`PressController`, one per handle), with press-hold and the ripple grown from the handle's center.

**Value indicator (SLD-17).** Absolutely positioned `value-indicator.offset` beyond the handle's outer edge across the
axis — half `handle.height` from the midline, the outline included, since it is drawn inside the edge (18 above the
midline in the default system, clear of the 16 radius of the state layer) — above the handle (at its inline start when
vertical), centered on it, `z-index: 1` over the handle and its container, no pointer events, `aria-hidden`; it is shifted along the axis to stay inside the window (measured from the handle's
settled place on each update and on resize), and fades over `motion.state-duration`.

**Differences from the other platforms.** Assistive technology on the web adjusts an ARIA slider through the arrow keys
the browser dispatches to it, so SLD-4 is SLD-3's path, and a value cannot be set directly. The value indicator is not
in the top layer: an ancestor with `overflow: hidden` clips it, and a later positioned sibling with a `z-index` above 1
covers it. The web has no gallery app; the fixtures are drawn by the test
harness on a 320 × 96 stage (the vertical one on 96 × 240). Parts: `track`, `active-track`, `stop-indicator`,
`container`, `handle` (the outline is `::part(handle)::before`), `value-indicator`.

## `<tanrei-button-with-menu>`

A main action with one press, and related actions in a menu from a second, joined button beside it
(`specs/button-with-menu.spec.json`, SPB-1…32).

```html
<tanrei-button-with-menu label="Save" menu-label="More save options">
  <span slot="icon">save</span>
  <tanrei-menu-item slot="menu" label="Save as…"></tanrei-menu-item>
  <tanrei-menu-item slot="menu" label="Save a copy"></tanrei-menu-item>
</tanrei-button-with-menu>
<script type="module">
  const button = document.querySelector('tanrei-button-with-menu');
  button.addEventListener('click', save); // the leading half only
  button.addEventListener('toggle', (e) => (button.open = e.detail.open)); // the trailing half asks; you set open
  button.addEventListener('close', () => (button.open = false)); // the menu asks, with detail.reason
  button.querySelector('[label="Save as…"]').addEventListener('click', saveAs);
</script>
```

| `<tanrei-button-with-menu>` | Type | Default | |
|---|---|---|---|
| `variant` | `filled` \| `tonal` \| `elevated` \| `outlined` | `filled` | emphasis, as Button's variants of the same names; a layer may add values; unknown is drawn as filled and reported (SPB-8); reflected |
| `size` | `small` \| `medium` \| `large` | `medium` | Button's heights (32 / 40 / 56 in the default system); open as `variant`; reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | how the two halves are joined (SPB-30, see Separation): `auto` takes `comp.button-with-menu.container.separation`, the system's answer. Anything else is `auto` and reported (SPB-8); reflected |
| `trailing-width` (`trailingWidth`) | `default` \| `narrow` | `default` | the trailing half holds the chevron in a square of the height, or — narrow — between `trailing.padding-inline-narrow`, then the outer padding at its end (32 / 36 / 36 wide in the default system: a narrow icon-only Button's width and the outer padding, from its own tokens, SPB-32). Anything else is `default` and reported (SPB-8); reflected |
| `label` | string | `""` | the leading half's text and accessible name. Required (empty is reported, SPB-20) |
| `menu-label` (`menuLabel`) | string | `""` | the trailing half's accessible name ("More save options"). Required: the chevron alone is not a name |
| `open` | boolean | `false` | whether the menu is shown; reflected. **The button with menu never opens or closes it**: set it from `toggle` and to false from `close` |
| `disabled` | boolean | `false` | both halves disabled and out of the focus order, no menu and the closed form whatever `open` says (SPB-3, SPB-7); reflected |

Slots: `icon` (a glyph's ligature text, drawn with the system's icon set at the size's icon size, or a `.tanrei-icon`,
`<svg>` or `<img>`) and `menu` (the menu's own item elements — `tanrei-menu-item`, `-checkbox-item`, `-radio-item`,
`tanrei-menu-group` — each with `slot="menu"`). Parts: `container` (both halves), `leading`, `trailing`, `icon`,
`label`, `chevron`, `divider`.

| Event | When |
|---|---|
| `click` | the leading half was activated (pointer, Enter, Space, assistive technology, `element.click()`), once each (SPB-1). **Only the leading half's click reaches listeners on the element**: the trailing half's click, a menu item's click and a press between the halves stop at the button with menu's shadow root |
| `toggle` | `CustomEvent<{ open }>`, not bubbling: the trailing half asks for `!open` (pointer, Enter, Space), or Down Arrow on it asks for `true` while closed (SPB-2). It is not the popover's `ToggleEvent`, which never leaves the shadow root |
| `close` | `CustomEvent<{ reason }>`, not bubbling: the menu asks to be closed — `escape`, `outside`, `tab`, `focus-out` or `item` (after the item's own click, SPB-16). A press on the trailing half while open is a `toggle` with `false`, never an outside press. The web never sends `back` (as the menu) |

The items' own events are the menu's: an action's `click` on the item, a checkbox item's `change`, a group's `change`
(bubbling, so they also reach the button with menu and its ancestors — except the item's `click`, above: listen on the item).

**Two halves (SPB-4…6, SPB-9…14, SPB-18).** Each half is a native `<button>` that is its own container: its own hover,
focus ring, press (press-hold, the four `pressed-feedback` answers, a ripple from the point of contact) and elevation,
painted from the variant's tokens in ITS state, so the other half never shows a state that is not its own. They sit in
one row and are never stacked; the trailing half is as tall as the leading one (the label wraps when the layout gives it
less width, and both grow together). The leading half's start padding is `leading.padding-inline-start`, or — with an
icon — `-start-with-icon`, a step tighter in the default system as Button's is; the trailing half holds the chevron
between `trailing.padding-inline`, or `trailing.padding-inline-narrow` while `trailing-width="narrow"`. The outer corners
are the state's `container.shape` — each corner of the fill, ripple and ring concentric, through the joined corners of a
connected group item (`GroupItemController`, `groupItemStyles()`), which also holds a pill's corners to half the measured
height.

**Joined by a divider or by a gap (SPB-26, SPB-30…32).** Under divider (the default system's choice) the halves touch,
the corners where they meet are square, and an empty `::part(divider)` element between them draws the rule:
`divider.thickness` thick in the variant's `divider.color` (the disabled one while disabled), centred on the seam and
`divider.inset` short of its top and its bottom, taking no space and no press. Neither half draws its outline or its
elevation's ring along the seam: each half's box ends at the seam and paints its fill, and its outline and elevation are
its `::after`'s, which reaches a little past the seam and is cut there, as a connected button group's items are (see
`<tanrei-button-group>`); the half that has keyboard focus is whole and drawn over the other. Under gap they
stand `container.inner-gap` apart with `container.inner-shape` where they face each other, each half's outline and ring
inside its own edge: the elevation is read as its `-inset-ring` companion, so the rings of the two halves never meet in
the gap — an elevation overridden by hand needs its companion overridden too (see Elevation). Under either,
`container.outer-inset` is added to the leading half's start padding and to the trailing half's end padding, at
either trailing width, so content beside a rounded outer end looks as far from it as from the tighter corner on its
other side: the trailing half is that much wider, its chevron half of it nearer the seam. **A narrow trailing half takes
it too (SPB-32):** it is the chevron's box, `trailing.padding-inline-narrow` on each side and the outer padding at its
end (16 from the seam, or from the gap, and 20 from the end edge at the medium size), under either separation and
mirrored in right-to-left. Where the two components' tokens agree, as in the default system, that is a narrow icon-only
Button's width and the outer padding (32 / 36 / 36); a system that sets the outer padding to 0 gets exactly the Button's
width. The leading half is the same at either trailing width.

**Targets (SPB-6).** Each hit area reaches the target above, below and outward, and toward the other half stops at the
middle of the gap, or at the seam (`neighbourTarget()`); what a half cannot reach toward the other it reaches outward,
so a narrow trailing half has its whole target without being drawn wider: at the medium size it reaches 12 past its
end edge for a coarse pointer (48 − 36), so leave that much room beside it, as beside a narrow icon-only Button.

**Open (SPB-13, SPB-15, SPB-20, SPB-21).** While open, the chevron (`expand_more`, never mirrored) is turned half a
turn, over `motion.open-duration` / `-easing` (at once under reduced motion). The trailing half's inner corners are
`container.inner-shape-open` while open: in the default system that token has `inner-shape`'s value, so the trailing half
keeps its shape and the chevron alone shows the open state; a system whose token differs (m3-like sets it to
`container.shape`) rounds the open half under gap, the corners moving with the chevron — the only time a corner
animates. Under divider those corners are square, open or not. The menu is a
`<tanrei-menu>` in the shadow root, `placement="bottom-end"`, placed against the whole row, with the trailing half as its
anchor: focus goes to the first enabled item when it opens and back to the trailing half when it closes, the menu is named
by the trailing half, and the trailing half gets `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`. Each
`slot="menu"` child is forwarded into the menu through a slot of its own (`slotAssignment: 'manual'`), so the menu draws
its dividers between groups as it does anywhere. With no item in the menu slot the trailing half still asks with `toggle` and
draws its open form while `open`, no menu is presented (`aria-expanded` stays false), and a debug build reports the empty
slot once the children have settled, and again each time it becomes empty (never on every render).

**Semantics (SPB-17).** Two buttons in reading order, two Tab stops, and no element of their own around them: the host
and the row have no role. The icon and the chevron are `aria-hidden`. `element.focus()` focuses the leading half
(`delegatesFocus`). In a toolbar each half is a stop of the toolbar's arrow keys (TBR-25): the toolbar tells the button
with menu which half is its one Tab stop through an internal channel (SPB-33), and the other half is at `tabindex=-1`;
out of a toolbar both halves are Tab stops again.

**Differences from the other platforms.** Item clicks do not reach listeners above the button with menu (the web note's
rule): listen on the item. In React this is what the generated `MenuItem`, `MenuCheckboxItem` and `MenuRadioItem` do —
their `onClick` is a listener on the element (it receives the native `MouseEvent`), so it fires inside a `ButtonWithMenu`,
and `ButtonWithMenu`'s own `onClick` stays the leading half's. The web can tell the input type, so
the hit areas reach `sys.target.pointer` under a fine pointer and `touch` under a coarse one. The web has no gallery app;
the fixtures are drawn by the test harness (`test/harness.ts`) on a 320 × 96 stage, where an `open` fixture shows the open
form without a menu (a fixture cannot fill the menu slot).

## What the system does not have: `setAvailabilityMode()`, `unavailableUses()`

```js
import { setAvailabilityMode, unavailableUses } from '@tanrei/web'; // or '@tanrei/web/availability': the two functions, no element

setAvailabilityMode('error'); // in a product's test setup, before the first element connects
// …render the screens of the product…
expect(unavailableUses()).toEqual([]);
```

| | |
|---|---|
| `setAvailabilityMode(mode)` | `'warn'` (the default) or `'error'`: the level a debug build reports a use of what the active system does not have at (AVL-3). A mode that is not one is refused with a warning, and the mode stays. |
| `unavailableUses()` | The uses since the page loaded, each once, in alphabetical order: `component` for a component the system leaves out or that lives in a layer it does not extend, `component:variant` for a `variant` value it leaves out — named as the product wrote it (`text-field:outlined`). Recorded in either mode; empty in a production build, which reads nothing. |
| `AvailabilityMode` | `'warn' \| 'error'`. |

The mode and the record are kept under a registered symbol, as the words are, so `@tanrei/web/availability` imported
beside the bundle shares them (the test harness's `setAvailabilityMode(page, …)` and `unavailableUses(page)` do this).

## The product's words: `setWords()`

**No element has words of its own.** No element has a default text in any language: a word a component draws or exposes is the
instance's own attribute, else what the product said once for every component, else — for locale data only — the
browser's, else nothing.

**The English word pack** is one such set the product may choose: `import '@tanrei/web/words/en'` gives a word in plain
English for every key (`specs/words/en.json`, generated into `src/generated/words-en.ts`; `pnpm validate` and `pnpm drift`
fail while a key has no word there), as one `setWords()` call, and exports them as `englishWords`. Nothing imports it on
a product's behalf — not this package's entry, a component, the harness or a fixture — so a page that does not import it
has no words it did not give.

```js
import { setWords, missingWords } from '@tanrei/web'; // or '@tanrei/web/words': the two functions, no element

setWords({ requiredText: 'Required', optionalText: 'Optional', closeLabel: 'Close', targetLabel: 'opens in a new tab' });
setWords({ requiredText: '必須', optionalText: '任意', closeLabel: '閉じる' }, { lang: 'ja' });
```

| | |
|---|---|
| `setWords(words, { lang? })` | Without `lang`, the document's set; with it, the set of the elements whose nearest `lang` attribute is that language (found through shadow roots; `ja` also answers `ja-JP` where no set was given for `ja-JP`). A second call for the same set merges key by key; a key given as the empty string is taken away. Connected elements draw themselves again — one notification, no attribute or style of the document written. |
| `missingWords()` | The keys that were needed since the page loaded and given by nobody, in alphabetical order: `expect(missingWords()).toEqual([])` in a product's own test. |
| `TanreiWords`, `WordKey`, `wordKeys`, `wordReaders` | The type of a set, its keys, and which props read each (`src/generated/words.ts`, generated from the `words` field of the specs' props; `docs/status/words.json` is the same list). 42 keys, read by 80 props. |

**The lookup one element makes**, key by key: its own prop → the set of its nearest `lang` → the document's set →
nothing. An instance's prop always wins (`close-label="Close filters"` on one sheet). Three keys differ from their
prop: a copy button's `label` and `failedLabel` read `copyLabel` and `copyFailedLabel`, and the breadcrumbs'
`overflowLabel` reads `breadcrumbsOverflowLabel`.

**Without a word**: it is not drawn; a mark without words stands in its place where one says the same
(the asterisk for the required tag, `close` and `check` for a picker's Cancel and OK, `+1` for "next day"); a control
that needs a name is still drawn and still works; and a debug build reports it once per key and page, naming the
attribute — `<tanrei-field>: required-text is empty and the product's words have no requiredText … (FLD-24)`.

**What it is not**: a translation system. It holds a few dozen strings: no plural rule, no interpolation, no fallback
chain between languages beyond a region's tag reading its language's set. A product with a localization library
hands the strings from it. Components drawn in the light DOM by a stylesheet alone (link, previous and next links, steps, prose)
have no element to read the words: theirs are the product's own markup, and the link's script reads `externalLabel`
for the anchors it describes (`setExternalLabel()` is the same set, under its first name).

**Building a component** (`src/primitives/words.ts`): `private readonly words = new WordsController(this)`, then
`this.words.get('closeLabel', this.closeLabel)` where it renders, and — only where the part that needs the word is
drawn, and only after `get()` found nothing — `this.words.missing('closeLabel', { id: 'XXX-n', effect: '…' })`
(recorded for `missingWords()`, reported once per key and page), or `this.words.lacks(key, own)` beside a report of the
component's own. Only an element that stands in the page records a missing word: one that is out of it (removed
with an update still waiting, or not placed yet) still looks its words up, but may no longer be under the `lang` they
were given for, so what it does not find is kept and asked again when it is placed — and it is drawn again there if
the set it stands under is another, or changed while it was away. A script without elements reads with
`wordFor(element, key, own)` and is told of a change by `watchWords(listener)`. Never list a key by hand, and never write a word into `src/`: `src/primitives/words.test.ts`
looks for the 45 defaults the specs lost and finds none. The message of a required control left empty is the
browser's (`missingValueMessage()` in `src/primitives/missing-value.ts`), else the element's own `errorText`,
`requiredText` or `label`.

## Building a component: the primitives

**Read with the others, never in your own turn.** An element updates in a microtask of its own, after writing its own
shadow tree: a box or a computed style read there has the browser style and lay out the page once for that element,
and a page that draws fifty of them pays fifty times (and a product that writes anything wide afterwards, in the same
script, pays for its whole page twice). So a first measurement is left to an observer that reports after the frame's
layout — one for the page where it can be (`GlyphDrawnController` with `firstInFrame`, `KeptLengths`, the tabs' rows) —
or collected for the turn and taken in one microtask that reads every host before it writes any (`GlyphDrawnController`,
the text fields' heights, the lists' stacked controls); a direction is asked with `:dir()`, which styles nothing
(`DirectionController`). `src/primitives/passes.test.ts` counts the style passes and layouts of fifty instances appended
at once, with the engine's own counters: the count is a small constant, and a component that measures gets a line there.

Every interactive component composes the same pieces from `src/primitives/` (and `src/styles/shape.ts`), each with its
own selectors and its own `--tanrei-comp-<name>-*` tokens — nothing in them knows which component uses them:

| Piece | What it gives | The component supplies |
|---|---|---|
| `stateRules(on, paints)` | hovered, focused, pressed (`overlay` / `ripple`+`dim` / `none`) and disabled, in precedence order, pressed without a transition in | `on(state)` → the selector that paints it (`` (s) => `button${s}` ``), and each state's declarations from that state's tokens |
| `PressController` + `pressHold(selector)` | `data-pressed="<feedback>"` on pointer down and on its keys, held for `sys.motion.duration.press-hold`, the ripple's lifecycle | the container, the element that carries press-hold, `disabled`, the keys (default Enter and Space), and optionally where the ripple grows from (`origin`); optionally `rippleHost`, the element the ripple is drawn in when that is not the pressed element (a tab's container, TAB-9) |
| `rippleStyles(tokens)` | the `.ripple` layer, its growth, fade and reduced-motion overlay | the custom property NAMES of its color, inset, growth, fade and easing |
| `focusRing(on)` + `syncFocusStyle()` | the ring (`outline` + `::after`), or the glow under `focus-style: glow`, never animated | `on(focus)` → the indicator's selector |
| `focusGlow(on)` | the glow alone, for a control whose own edge is its focus indicator (a text field): no ring, the halo under `focus-style: glow` | `on(focus)` → the indicator's selector under the control's own focus condition |
| `hiddenHost` (`hidden.ts`) | the host with the `hidden` attribute has no box: a host that names its `display` beats the browser's own rule for the attribute, so every element composes this one rule, last — `static override styles = [styles, hiddenHost]` (`src/hidden.test.ts` asks every tag of the manifest) | nothing |
| `minimumTarget(selector)` | the centered `::before` hit area (`sys.target.pointer` / `touch`), mirrored in RTL | the selector |
| `neighbourTarget(selector, { axis })` (`target.ts`) | after `minimumTarget()`: an element in a row beside others (a button group's standard item, a button with menu's half, a toolbar's item) whose hit area reaches the target except toward a neighbour, where it stops at the cap; `axis: 'block'` caps above and below instead (a vertical toolbar) | `--_cap-start` / `--_cap-end` on the element (half the gap; `initial` for none) |
| `shape`, `cornerRadius(token)` | the one corner rule and a pill's round caps | `data-tanrei-shape` on the box, `cornerRadius()` per state shape token |
| `iconGlyph(on, tokens)` (`src/styles/icons.ts`) | a component's own icon, drawn with the declarations `icons.css` is written from: size, family and fill of the selection, weight, optical size, the fill's transition | the glyph box's selector, its size property, the selector of the selected condition, the state duration and easing; `weight`, the property of the glyph's weight, only for a control's own mark (`comp.checkbox.mark.weight`, `comp.switch.icon.weight`, `comp.menu.control.mark.weight`): left out, the glyph is drawn at `sys.icon.weight` |
| `adoptUnlessDrawn(element, sheet, mark)`, `adopt(root, sheet)` (`sheets.ts`) | the stylesheet of an element that is drawn in the document, added to the root the element stands in — once, and only where that root does not draw the element already: a page that loaded `@tanrei/web/<name>.css` is handed no second copy (a sheet added to the document has the browser style the page again), a page that did not and a product's shadow root are handed one for all their instances. The cascade is asked once for a root and a sheet, while the root's own stylesheets stay as many as they were — not once for each element, nor once for each turn, since the question is a read of computed style inside the script that connected the element — and an element inside one of its own kind is answered by the outermost of them | the sheet (one constructed sheet for the page) and `mark`: a private custom property the sheet sets on every element of the kind and no shadow style of the element sets (`test/light-dom.ts` lists each element with its sheet and its mark, for `src/primitives/sheets.test.ts`, which counts the writes, and `src/primitives/passes.test.ts`, which counts the questions and the style passes: add yours) |
| `OpenAxesController` | sizes and variants a layer adds (one sheet per value for the page, adopted on demand, falling back to the default's tokens) and the debug report of a value the active system lacks | per axis: its core values, default, the block builder and the probe token; the behaviour id |
| `report(host, id, message)` | a debug-build `console.warn`, once per element and problem | the behaviour id and the message |
| `AvailabilityController` (`availability.ts`) | the debug report and the record of a component, or a value of its `variant`, the active system does not have, read from `--tanrei-unavailable`, `--tanrei-unavailable-layer` and `--tanrei-unavailable-replacement` on connect and when `variant` changes, and made under the element the product wrote (AVL-1 to AVL-3) | its spec name (`new AvailabilityController(this, 'fab-menu')`), in every component with a spec |
| `hostAria(host, attributes)` | semantics a non-interactive component carries on its host (divider, progress, loading), written only when they change | the attributes, `null` to remove |
| `GlyphMirrorController` (`glyph-mirror.ts`) | `data-tanrei-mirrored` on each glyph whose name the active icon set mirrors in right-to-left, or whose `data-mirror` says `always` (never with `never`): after each render, on `slotchange`, when a slotted glyph's text or `data-mirror` changes, when the root switches the system. `iconGlyph()` draws the mark under `:dir(rtl)`; the component mirrors nothing itself (BTN-19) | `drawn`: a selector for the `iconGlyph()` boxes whose name the component writes; `slots`: a selector for the slots that take the product's glyph (each inside an `iconGlyph()` box) |
| `GlyphDrawnController` (`glyph.ts`) | `data-drawn` on each glyph box while the icon set can draw its ligature (its text is at most `DRAWN_WIDTH` × the box), re-read when the text's width changes (the font arrives, a system switch) and after each render; running transitions end when a glyph becomes drawable (CHK-19) | the glyph boxes (styled by `iconGlyph()`, each holding one inline-block text element); hide a glyph box without `data-drawn` |
| `VisibilityController` | `visible`: false while the host is scrolled out of view or hidden, so a running animation pauses | render `animation-play-state: paused` while it is false |
| `placeAnchored()`, `anchorGone()`, `numericAttribute` / `crossOffsetAttribute` / `choiceAttribute` (`placement.ts`) | where a surface that opens beside a control goes, as numbers: the thirteen placements, the offsets, flipping, shifting, holding, the side kept, the arrow's point, `fits` and `room` for a surface that can be limited (TIP-9, TIP-22…25, POP-2…5); whether an anchor is removed, hidden or out of sight; the attributes of `offset`, `cross-offset` and a true / false / unset choice | the boxes, the placement, what an unknown one falls back to, `auto`'s order and alignment |
| `AnchoredSurfaceController`, `anchoredSurfaceStyles()` (`anchored.ts`) | a surface presented in the top layer (or in place), placed with `placeAnchored()`, limited to the room or moved back over its anchor, following it (`FollowController`), with the arrow's point, the elevation's layers for the shade, the one appearance (`appearStyles()` with role `anchored` and origin `anchor`, its `AppearController`: grown from the middle of the edge that faces the anchor, left the same way back, a surface still leaving put back into the top layer where its exit had got to — `keep()` — and one just placed started from the side it was placed on — `drawAtOnce()`; in place for a fixture it is whole at once), and the on-screen keyboard as an edge (POP-1…5, POP-7, POP-8, POP-26, POP-27, POP-36). It writes `--_anchored-max-inline`, `--_anchored-max-block` and `--_anchored-anchor-inline`, `data-side` and `data-held` on the placed box, and the arrow's elevation filter there (`shadeOn()`), never on what moves | the placed box, the wrapper that moves and the painted box; the anchor; the props; the component's tokens as CSS expressions; `gone()` for an anchor out of sight; `least()`, `arrange()` |
| `arrowStyles()`, `shadowLayers()`, `shadeFilter()`, `shadeOn()`, `arrowOutlineStyles()` (`arrow.ts`) | the arrow of an anchored surface on the edge that faces the anchor, one shape with the painted box under one elevation (an SVG filter made from the resolved `box-shadow`, set on the placed box by `shadeOn()`: the element that moves keeps `filter` for the appearance's blur), and its outline in forced colors (TIP-25, POP-10, POP-32) | the selectors, the arrow's measures, the fill and the elevation |
| `DismissController`, `registerOverlay()`, `logicalAncestors()`, `overlayDepth()` (`dismiss.ts`) | Escape (the topmost surface alone, at the surface's edge, after everything inside heard the key), a press outside and focus leaving ask the host to close, once for one act; an overlay knows what opened it, so that "inside" follows the opener and not the document (POP-21, POP-23, POP-24) | the anchor and opener (`related`), `request(reason)`, `tab(event)`; each overlay's `openers`, `open`, `close` |
| `focusOverlay()`, `tabThroughOverlay()`, `returnOverlayFocus()`, `keepOverlayFocusAfterPress()`, `quietFocus()`, `watchInput()` (`overlay-focus.ts`) | focus into an operated overlay that is not modal, through it as if it stood directly after its opener, and back to the opener when it closes; no indicator of its own when it was opened by a press (POP-19, POP-20, POP-22) | the focusable box, the host, the opener |
| `FollowController` (`follow.ts`) | an overlay placed by script follows what it is placed against without asking in every frame: it checks on a scroll (captured, any scroller), a resize of the window or the visual viewport, a size (`ResizeObserver` on what is followed, what is sized and the root), a place that changed with no event (an `IntersectionObserver` cut down to the followed element's box, set again after each move), a transition or animation beginning on an ancestor, an attribute changed on an ancestor (`dir`, a theme), the colour scheme, and the host's own render — and then in every frame for as long as a check finds a change (and three frames more). At rest it asks for no frame. Not seen until the next of those: a move of less than a pixel with no event, a move while wholly outside the viewport or without area, an inherited value changed by a replaced style sheet alone, the anchor moved to another parent | `followed()` (the anchor; a submenu's item), `sized()` (the surface, what scrolls in it), and `check()`: read what the placement depends on, place again if it differs, return whether it did; `start()` when shown and placed, `stop()` when hidden, `request()` after a change of its own it cannot see |
| `appearStyles({ motion, open, role, origin })`, `AppearController` (`motion.ts`) | the one appearance of a surface (`docs/architecture/motion.md`): closed, the motion element stands at `sys.motion.appear.*` (opacity, scale toward its origin, distance toward its anchor's or edge's side, blur), open it is whole, between the two it moves on the role's enter or exit duration and curve and, turned round, goes on from the value shown (MOT-2); its first frame is the start (`@starting-style`), `display` and `overlay` change with `allow-discrete`; under `unfold` it scales along the one axis that leaves the anchor (a style query; a browser without them scales both), a sheet slides by its own size, and reduced motion is a cross-fade over `role.reduced` (MOT-6). The controller skips the entrance before the document's first paint (`documentPainted()`: the second frame after `DOMContentLoaded`, MOT-4) — until then the motion element starts no transition at all, from the update that renders it — marks the motion element `data-tanrei-appear` (settling leaves it alone), and `exit()` resolves true when the exit's transitions have finished — waiting for those that replace them — or false as soon as it is opened again; no timer | the motion element's selector and the open condition (keep it apart from `:popover-open`: leave the top layer after `exit()` resolves); the role and the origin (`anchor` reads the placed box's `data-side` and `data-held`; `center`; an edge); optionally the component's own timing tokens and its `appear` prefix. `enter()` / `exit()` in the update that writes the open state; `enter(true)` / `exit(true)` at once (a surface drawn in place, one taken away with its host); `drawAtOnce()` for a surface placed by script before it opens (it starts from the side it was placed on); `keep(during)` for one taken out of the top layer and put back while it leaves (it goes on from the value shown). It owns the motion element's `opacity`, `scale`, `translate`, `filter`, `transform-origin` and transition |
| `AnimatedSize` (`motion.ts`) | MOT-5: a box whose size follows its content as one motion, in its layout, clipped with `overflow: clip` (never `hidden`: a box that is a scroll container is scrolled by a caret), its content fixed to the start, the end or — `auto` — the edge that stays; it moves from the size the last frame drew (a resize observer of the box: by the time it is told, a box at rest already stands at its new size), and a change mid-motion goes on from the size shown; the end of a motion is its own transitions' `finished`, matched to its run, so a replaced transition's late `transitioncancel` ends nothing; at once for `fit(false)`, `still()`, reduced motion, a role of zero. The successor of the text inputs' `AutoHeight` box, whose users have not moved to it | the box, the content element (for the end anchor and the inline axis), the axis, the anchor, the role's duration and curve as CSS values (by default `role.resize.default` and `easing.spatial`); `fit(true)` after the content changed. It writes the box's inline size, `overflow`, transition and `data-resizing` only while it moves |
| `TanreiElement`, `TanreiLightElement` (`element.ts`) | the base of every element: `TanreiElement` for one with a shadow root, `TanreiLightElement` for one that draws in the light DOM (a tree view, a table). Each settles (`Settle`, below) from each connection; `TanreiElement` composes `settleStyles` after the element's own styles, and the build writes `settleRule('<tag>')` at the end of a light-DOM element's stylesheet (`scripts/build.js`). `test/settling.test.mjs` refuses a class that extends `LitElement` or `ReactiveElement` itself, and a light-DOM stylesheet without the rule | nothing: extend the base |
| `Settle` (`motion.ts`), `settleStyles`, `settleRule(host)` (`src/styles/motion.ts`) | MOT-3: `data-tanrei-settling` on the host from each connection until the second frame after its first update, and no transition in it meanwhile — `transition-property: none`, so a delayed transition does not start either and the press-hold carrier keeps its delay — except on the element that appears (`data-tanrei-appear`: an overlay's surface, so an overlay mounted open, or opened, right after it was connected still enters) | nothing beyond the base class; `data-tanrei-appear` on the element a surface's entrance moves, until `AppearController` writes it. It makes a late state arrive without a motion, not on time: the first state is still written where the element renders. `src/first-frame-all.test.ts` holds every fixture of every spec to its first frame at rest |
| `arcStyles` | a ring of SVG circles: center, radius `(ring − stroke) / 2`, stroke, `--_c` (circumference), turned to start at the top; `ring-turn` and `pulse` | `--_ring` and `--_stroke` on an ancestor of the `<svg>` |
| `FORWARDED_DESCRIPTION` | the host's `aria-description` as a property, to render on the native element (a badge's anchor, a tooltip's) | `aria-description=${this.forwardedDescription ?? nothing}` on the native element |
| `OUTSIDE_FOCUS_ORDER` | a control a host places and acts for by keys of its own is no stop in the focus order: an internal property without an attribute (`outsideFocusOrder`), set by the host (a number input's steppers, NMI-25) | `tabindex=${this.outsideFocusOrder ? '-1' : nothing}` on the native element, which stays a named control for a pointer and for assistive technology |
| `focusRing(on, { inside: true })` | the ring or glow drawn inside the element (its outer stroke on the element's edge), for a row a parent would clip (LST-10, MNU-11) | as `focusRing` |
| `focusRing(on, { within: '<length>' })` | the ring or glow around an element with that much room before something clips it: drawn around it where the room holds its reach, and further in by what is missing, on every side alike (TAB-4) | as `focusRing`, and the room as a CSS length expression |
| `focusRing(on, { color: '<color>' })` | the same ring or glow with its outer stroke (the halo's outer color) in a color the component names, for an indicator drawn on a surface the system's focus color is not held against (a snackbar's bar, SNK-3); left out, it is `sys.color.focus-ring`. Combines with `inside` and `within` | as `focusRing`, a CSS color expression |
| `conditionStates(prefix, parts, { container, root, on })` (`selection.ts`) | the state rules of any component whose conditions are its state variants: every part, opacity and shape per state, on `root` | the parts, the root, where each state is read (equal specificity) |
| `itemRowStyles()`, `rowTarget()` (`item-row.ts`) | a row of a column of items (list, menu): condition blocks, state rules, paints and their motion, the ripple; the minimum target as row height | the prefix, parts, condition selectors, where states are read, which element paints which part |
| `RovingKeys` (`roving.ts`) | Up / Down Arrow (wrapping or not), Home, End and typeahead (one second) over a column of items; a Space continues a search; with `repeat`, one character typed again moves on to the next item that begins with it (SEL-33) | the items' focusability and labels; the component moves focus |
| `parseValues(attribute)` (`values.ts`) | the `values` attribute of a selection of several values (list, segmented button): a JSON array or whitespace-separated values | `converter: { fromAttribute: parseValues }` on the `values` property |
| `GroupItemController`, `groupItemStyles({ on, rippleInset })`, `groupItemReset`, `GROUP_ITEM` / `GROUP_PLACE` (`group-item.ts`) | the internal channel between a button group and its items: where the item sits (told by the group, asked of the parent on connect), its container's classes (`joined`, `standard`, `connected`, `block`, `stretch`, `first`, `last`), the joined corners of a row or a column from `--tanrei-group-*-radius` with the ripple and ring following each corner and a pill's corners held to half the measured height, the minimum size, a seam (`--tanrei-group-seam-*`: the box reaches past it and is clipped there, so no outline or ring is drawn along it; whole again under keyboard focus), what the group adds to each side as `--_add-start` / `-end` / `-top` / `-bottom` (the bleed and `--tanrei-group-outer-*`), and a standard item's hit area capped at half the gap along the row or the column. A toolbar's items are `row` items of it; a button with menu's halves are joined by it; `groupItemReset` takes a box out of any group around it | the container selector and the ripple's inset property; the component adds `--_add-*` to its paddings (and a fixed width or minimum height) and defines them as 0 outside a connected group |
| `separationHost(token)`, `whenGap(element, rules)`, `separationOf(host)`, `syncSeparation(host, element)` (`separation.ts`) | `sys.behavior.separation` as a component reads it: the instance's attribute over the component token, as `--_separation` on the host; the gap form's rules under a style container query (and `data-separation` where a browser has none); the name the host draws now | the component token's custom property, the element the rules name, the gap form's rules — the divider form is the component's plain rules — and a call to `syncSeparation()` when it has rendered |
| `ActionPlacement`, `actionBoxStyles(box, gap)`, `whenChosen()`, `compChoice()`, `giveVariant()` (`actions.ts`) | the actions at the foot of a dialog or a side sheet, placed as a full-width Button group places its items: runs by `confirming` / `dismissive` (both: unflagged, reported, BGR-18), three hand-assigned slots in the order of a row or a column (BGR-15), measured at their own widths to decide a row or a column (`fill`: every label fits its equal share; `packed`: the row fits), each action given the host's variant through the group-item channel; the box's row, column and measuring rules; a comp choice of kind drawn by a style query with a `data-*` fallback | the host's `slotAssignment: 'manual'` shadow root, its box of three slots (`actions-first`, `actions-between`, `actions-last`), its gap token and its variant token (DLG-10, DLG-20, SSH-11, SSH-17) |
| `LinkController`, `linkAttributes(form)`, `readDestination()`, `readTarget()`, `linkRel()`, `LINK_MARK`, `DISABLED`, `styledAsAnchorToo()` (`link.ts`) | a control with a destination is a link: what is a destination (white space, `javascript:` and unreadable addresses are not; a path is, whatever the document's address), the two targets and HTML's two spellings, the anchor's attributes (`_blank` + `noopener`, the forwarded `rel` and `download`, the disabled anchor: no `href`, `role="link"`, `aria-disabled`), the keys that press a link (`pressKeys`: Enter alone, for `PressController`'s `keys`), the role the anchor keeps where its container's role fixes its children's (`role: 'menuitem'` — a link item of a menu, which also keeps the menu's keys and passes no `pressKeys`), the description (`describe()`), the debug reports, and — for a stylesheet that names its native element by tag — every rule naming the anchor too. It listens to nothing: activation is the anchor's own | its tag (`literal`: `a` in place of its native element, one template), the behaviour ids of its reports, which of its forms hold a state and take no destination, where its mark stands |
| `afterClick(fire)` (`after-click.ts`) | runs `fire` once the click being dispatched has gone through the page (a one-time window listener, or the next task when the click was stopped): `change` after `click`, as a native checkbox (CHP-11, BTN-14) | the dispatch of `change` |
| `pressDefaultButton(form)`, `defaultButton(form)`, `watchNativeInputs()`, `SUBMIT_BUTTON` (`default-button.ts`) | a form's default button — its first submit button, the platform's own or a Tanrei Button of type `submit` — pressed for Enter in a control of the form: its `click()`, nothing while it is disabled, `form.requestSubmit()` only where the form has none (BTN-30). Every control that submits its form on Enter calls it in place of `form.requestSubmit()`; a Button answers `[SUBMIT_BUTTON]` with whether it submits and whether it is disabled, and registers its form for Enter in the platform's own controls, where the browser presses a hidden submit button the Button holds for the length of the key | the element's own event for the key (`action`), and whether it was cancelled |
| `ComposedElement`, `ComposedControl`, `exported()`, `composedHost` (`composed.ts`), `forward()` (`forward.ts`) | a composed element ("Composed elements", above): its members' own elements in its shadow root — focus passed to the control without delegating it, a slot passed on while it is filled, the value that is the value member's at every moment, the form's control repeating what the member tells its own internals, each forwarded property set on its member on every render, the members' parts exported from each member's own list | the members, the lists of forwarded names, the `value` accessor, the template |
| `FormSays`, `formSaysOf()` (`form-says.ts`), `formOf()` (`default-button.ts`) | what a form-associated control tells its form — `setFormValue` and `setValidity` — said where an element composed around it hears it, and the form a control submits on Enter where it stands in such an element's shadow root (W6) | the value, the state, the flags, the message and the anchor |
| `fileKind(mediaType, name)`, `KIND_GLYPH`, `nameParts(name)`, `acceptList()`, `acceptConverter` (`file-format.ts`, imported by its path) | what is known of a file without reading it: the kind of its format in ten kinds, by its media type and then by the ending of its name, from the closed lists of FIT-5, and each kind's glyph; where a tile's name is cut (FIT-9); `accept` read and written one way, as the comma-separated list a native file input takes (FPK-9) | the media type and the name; the `accept` value |
| `giveFileItem(item, gift)`, `fileItemGiven(item)`, `FILE_ITEM_TAKE_FOCUS`, `FILE_ITEM_UPDATE`, `FILE_PICKER_ARRIVAL`, `notifyArrival()` (`file-item-holder.ts`, imported by its path) | the internal channel between a component that holds file items and each of them (FIT-19, FUP-25, FUP-58): what every row shares, kept beside the item and never on it, so none of it is a prop, an attribute or in the manifest; the way a holder moves focus into an item after a row left (FUP-30); the item's word that it arrived or changed; and the event a file picker ends one arrival with (FUP-57) | the holder: the gift, or `null` when it holds the item no longer; the item: reading each key in place of its own prop |
| `waitsWhileFocused(host, write)`, `endsWaiting(host)` (`disabled-while-focused.ts`) | a form-associated element disabled while it holds focus gives focus up when the platform's own control does, at the next frame in every engine: its `disabled` attribute — the platform's word, which one engine answers by taking focus inside the call — is written when focus has left, a frame later at most; the property and the native control are disabled at once (BTN-2) | `setAttribute`, `toggleAttribute` and `removeAttribute` overridden to ask it for `disabled` |
| `disabledWaitsWhileFocused(Class)`, `FocusedStop` (`disabled-while-focused.ts`) | the same for every other form-associated element: the three overrides given to a class in one call, and — for an element whose focus stop is a part with a `tabindex` it writes — that `tabindex` kept for one frame where the part held focus, since one engine takes focus inside the call that removes it | the class; `stop.keeps(disabled)` in `render()` |
| `focusedAtFirst(Class)`, `wantsAutofocus(host)` (`autofocus.ts`) | `autofocus` on an element that is not focusable itself (a delegating shadow root, or a `focus()` of its own) gives it focus when the page first loads: the browser looked before the element was defined, so the element focuses itself when it first renders, where nothing but the body has focus | the class |
| `focusGlowEnds(on, radius)` (`focus-ring.ts`) | under focus-style glow, the halo of a box whose block-end corners have a radius of their own (a filled input box's `container.shape-bottom`) follows those corners | the box in that look, and the radius |
| `isDisabledControl(control)` (`form-disabled.ts`) | whether a control a container walks is disabled now: by its own `disabled` or by a disabled fieldset around it (a Button answers for itself: a link button is disabled by none) — what a toolbar's one Tab stop and a dialog's count of enabled actions read (TBR-10, DLG-19); `GROUP_AVAILABILITY` (`group-item.ts`) is how an item tells its group that the platform's word changed | which items it walks |
| `NativeTextController` (`native-text.ts`) | a component's `value` and its native text element kept in step around an input method (TXF-1, TXF-4, SRC-4): the element's own `input` is the component's, nothing is written into a composition, a value set meanwhile waits for its end, and a committed composition always ends with one `input` that is not composing | the element, the value's getter and setter; optional `commit` (what a composition may leave: the text field's limit) and `settled` hooks; `composingInput(event)` first in the `input` listener, `show()` from `updated()` |
| `CompositionEnd`, `isCompositionInput()`, `COMPOSITION_INPUT_TYPES` (`composition-end.ts`) | what an engine still reports for an input method's composition once it has ended, told by what it is and never by a timer (a timer runs after input on a busy page, so a key or a digit typed next was lost): an `input` whose inputType names a composition (Firefox's last one comes after the end), and the committing key WebKit reports after the end — key code 229, or pressed no later than the end (TXI-45, ETI-4, OTC-6, OTC-13) | `ended(event)` from `compositionend`, `tookKey(event)` in a `keydown` listener, `reset()` when the element leaves |
| `modalLayer` (`modal.ts`) | the Tanrei modal overlays open in the window: a dialog adds and removes itself; a snackbar host waits for them and pauses under them | `add(el)` / `delete(el)`, `covered`, `subscribe(fn)` |
| `deepActive()`, `tabbables()`, `trapFocus()`, `holdPageScroll()` (`modal.ts`) | what every modal overlay does (dialog, modal drawer): the focused element through shadow roots, the Tab order through shadow roots and slots, Tab wrapping inside, the page's scroll held while any holder is open | the container; the holder |
| `DestinationsController`, `NavigationDestination`, `destinationStyles(prefix, { lines })` (`destination.ts`) | the destinations of a navigation region: the first destination with the region's value is selected, an activation sets `value` and fires `change` (or `reselect`), the context each destination is told, the debug reports; a bar's destination (a `<button>` or `<a href>` cell, the item container that is the state layer and the indicator, the grow of a new indicator, label visibility, badge and description) | the items, the behaviour ids, the range, which labels show, what more each destination is told (`context`: the drawer's form and nesting); a subclass with its tag and prefix |
| `FieldControlController`, `FieldProviderController`, `giveAttributes()` / `takeBack()`, `FIELD_CONNECT` (`field.ts`) | a field and the control it frames, in different trees: the control asks its nearest frame with the composed `tanrei-field-connect` event and is told the name, the description, invalid, required and disabled (and of every change, and `null` when it leaves); the frame answers the controls inside it, gives plain attributes to an element that does not ask and takes back exactly what it gave (FLD-8, FLD-10, FLD-11, FLD-14, FLD-23, FGR-8, FGR-14) | the control: what it is (`takes`, `errorCondition`, `framed`, `requiredState`, `named`) and where it renders `name()`, `description()`, `invalid`, `required`, `disabled`; the frame: its controls, and what it gives each |
| `frameStyles()`, `frameColors()`, `frameLabelRow()`, `frameLabelIcon()`, `frameText()`, `frameAnnouncer()` / `frameAnnounce()`, `frameMark()`, `frameErrorText()`, `reportFrame()`, `syncFrameMark()` (`field-frame.ts`, imported by its path) | the field frame for ONE control (FLD-2 … FLD-13): the label row with its glyph, the asterisk and the requirement tag (a `<tanrei-tag size="small">` with nothing of the frame's set on it, in a box one label line high), a row of the frame's small text (the help; the error text), the announcer, the system's required mark by a style query or `data-required-mark`, forced colors and reduced motion | its token prefix (`--tanrei-comp-<name>`), the selectors of its looks and states for `frameColors()`, and the rows where it wants them |
| `groupFrameStyles()`, `groupRows()`, `groupDescribedBy()`, `groupOrientation()` (`field-group-frame.ts`, imported by its path) | the frame for a SET (FGR-1 … FGR-9, FGR-13): the label row, the description under it, the controls' column or wrapping row, the error row below, the requirement in words, and the ids its description refers to | a root with the class `group` and its state attributes, a `.controls` box with `data-orientation` and `data-spacing`, and the prefix |
| `OptionsController`, `readOptions()`, `filterOptions()`, `OptionListController`, `optionListStyles()`, `optionVariantRules()`, `anchoredOptionList()` (`option-list.ts`, imported by its path) | a field that opens a list of options (select, combobox): the `<tanrei-option>` / `<tanrei-option-group>` children read as data and read again when they change; the list rendered in the field's own shadow root on the anchored surface, with the menu's rows; the active option and the keys, pointer and press that act on it, focus staying on the field (SEL-24 … SEL-45) | the token prefix and variants; which options are drawn, which is chosen, what choosing does |
| `labelLines(copy)` (`label-lines.ts`) | the lines a never-drawn copy of a floating label takes, and the widest, for a field that gives a wrapped label its room (TXF-13, SEL-15) | the copy, laid out as the label is in one position |
| `findInteractive()`, `slottedInteractive()` (`interactive.ts`) | what counts as interactive content (CRD-15, LST-20) | the element or the slot |
| `SelectionController` + `selectionStates()`, `conditionBlock()`, `selectionLabel()`, `selectionRippleOrigin()`, `markConditionChange()` (`src/primitives/selection.ts`) | a form-associated selection control: form value, validity, fieldset-disabled, a click on the host, Enter submits; the condition blocks and state rules on `.root`, the label and first-line alignment, the ripple from the container's center for a press outside it, the state-vs-selection motion | the anatomy `.root` / `.control` / `input.native` / `.container`, its parts and the comp prefix |

The box that draws the ring and holds the ripple is a positioning container with `isolation: isolate`; its `::before` is
the target and its `::after` the ring. `button.styles.ts` and `button.ts` are the reference: a condition on top of the variant axis
(a toggle's looks) and its own icon.

## Icons

`icons.css` is written by the build from `src/styles/icons.ts`, the same declarations a component's own icon uses
(`iconGlyph()`). It draws `.tanrei-icon` with the icon set of the active system: `sys.icon.family.unselected` and
`sys.icon.family.selected`, plus `sys.icon.weight` and `sys.icon.fill.*`. A selected icon (from `aria-pressed`,
`aria-selected`, `aria-checked`, `aria-current` or `data-selected` on the icon or an ancestor) switches **both** the
family and the fill: a variable font (Material Symbols — the default, and `m3-like`'s Outlined at 400) has one family
and uses the `FILL` axis; a static set (e.g. Material Icons Outlined / Material Icons) has two families and ignores the
axes. A bare `.tanrei-icon` is drawn at `sys.icon.medium`, the default size; `data-size="extra-small"`, `"small"`,
`"medium"` or `"large"` picks a step of `sys.icon` (16, 20, 24 and 32 in the default system). Optical size is the box's, clamped to `sys.icon.optical-size.min/max`, and written into `font-variation-settings`
by hand, as the other platforms set it: `font-optical-sizing: auto` alone is not drawn everywhere (WebKit on Linux draws
the font's default `opsz`, 24, at every size). The box size becomes a number through `tan(atan2(<length>, 1px))`, never
`calc(<length> / 1px)` — where that is missing (Firefox) the whole declaration, fill and weight included, would be
dropped — and only under `@supports` for that arithmetic; an engine without it keeps `font-optical-sizing: auto`.
Grade is 0. Icon names belong to the product.

One weight is not `sys.icon.weight`: a control's own mark — the check and the dash of a checkbox, the glyph on a switch's
handle, the check in the box of a menu's checkbox item — is drawn at the weight its component token names, which aliases
`sys.icon.mark.weight` (500 in the default system, the preset's icon weight under a preset). `iconGlyph()`
takes that token as `weight`; `.tanrei-icon` and every other icon a component draws keep `sys.icon.weight`.

### Right to left: which glyphs mirror

A glyph that shows a direction along the line — `arrow_back`, `chevron_right`, `send`, `undo`, `menu_open` — is drawn
mirrored in a right-to-left layout, in its own box, where it already stands; `check`, `close`, `search`, `play_arrow`
and everything vertical are not. Which names mirror is a fact about the icon set, shipped as data
(`tokens/icon-sets/<id>.icon-set.json`, Google's `autoMirrored` flag for Material Symbols; emitted as
`src/generated/icon-sets.ts`). The active set is the one of the design system around the glyph (the nearest
`data-tanrei-system`, the default system where there is none); for a system Tanrei does not ship it is the set whose
`families` hold the first font family the glyph is drawn with, and where no set describes it nothing mirrors by itself.

| Where the glyph is | What mirrors it |
|---|---|
| a component's own glyph (search's back arrow) and a glyph in a component's icon slot (`<span slot="icon">arrow_forward</span>`, a `.tanrei-icon`) | the component: it reads the name and marks the element (`data-tanrei-mirrored`); its icon styles mirror the mark under `:dir(rtl)` |
| a bare `<span class="tanrei-icon">arrow_back</span>` | the observer `@tanrei/web` installs when it loads — `import '@tanrei/web/icons'` is that script alone, for a page that uses `icons.css` without the components. `observeIcons(root)` does the same for a shadow root of your own, which the document's observer cannot see into |
| a page with no script at all | nothing reads the names: write `data-mirror="always"` yourself on each glyph that shows a direction |
| an `<svg>`, an `<img>` or any element of yours in a slot | never mirrored for you — Tanrei cannot know what a picture shows. `data-mirror="always"` on it mirrors it |

Decide for one use with `data-mirror="auto | always | never"` (default `auto`, by the list) on the `.tanrei-icon` or on
the element in the slot: `never` for a physical direction or a mark that must not change (`format_align_left` in a text
editor, a question mark in Hebrew), `always` for a name the list does not have. The glyph's name is the element's text
without the white space around it; text that is not one name (letters, digits, underscores) is not a glyph. A change of
`dir` on any ancestor, at any time, is followed by CSS alone; a changed name, a changed `data-mirror` and a design system
switched on the document's root are followed by script. Not followed: `data-tanrei-system` changed on an element other
than the root while the page runs, and a glyph given as a bare text node in a slot (give it in an element).

## Text styles (`text.css`, `prose.css`)

`sys.typescale` has sixteen roles by level, each a whole style (`--tanrei-sys-typescale-<role>-{font-family,font-size,
font-weight,letter-spacing,line-height,font}`; `-font` is the shorthand without the tracking):

| Role | HTML | Role | HTML |
|---|---|---|---|
| `display` | a hero, not a heading level | `label`, `label-small`, `caption` | text in and next to controls |
| `heading-1` … `heading-6` | `h1` … `h6` | `code`, `code-small` | `code`, `pre` |
| `body-large`, `body`, `body-small` | lead, `p`, `small` | `eyebrow` | a section's kicker (uppercase is yours) |

**Emphasis is a weight, not a role.** `--tanrei-sys-typescale-emphasis-{display,heading,body,label}` are the weight
steps a system adds for emphasized text (100 each by default; `m3-like`: 200 on labels), and every role carries the
result ready to use: `--tanrei-sys-typescale-<role>-font-weight-emphasized` = the role's weight + its family's step.
A role's family is the first segment of its name; `caption`, `code*` and `eyebrow` take the `label` step. The button's
label keeps its plain weight.

`text.css` — one utility per role, setting every field, tracking included, and `.tanrei-text-emphasized`, which
switches to the emphasized weight of the role it is in (on the same element, or on a descendant):

```html
<h2 class="tanrei-text-heading-2">Section</h2>
<p class="tanrei-text-body">Text with <strong class="tanrei-text-emphasized">stress</strong>.</p>
```

`prose.css` — **Prose** (`specs/prose.spec.json`, PRS-1 to PRS-30): long-form text you did not lay out by
hand — rendered Markdown, content from a CMS — set in the system's text styles by level, with one vertical rhythm and a
limit on line length. A class, not an element, and it parses nothing:

```html
<article class="tanrei-prose">…h1, p, ul, blockquote, hr…</article>
<article class="tanrei-prose" data-size="large">…</article>      <!-- a page whose purpose is the text: body-large -->
<article class="tanrei-prose" data-measure="false">…</article>   <!-- text blocks fill the container -->
```

| Class | What it is |
|---|---|
| `tanrei-prose` | The container. `data-size="medium"` (default; `body`, 14) or `"large"` (`body-large`, 16); any other value is the default. `data-measure="false"` lifts the limit of `comp.prose.measure` (36 ems of the running text) from the text blocks and from a `<tanrei-callout>`, which is a block of text in a box of its own (PRS-18). |
| `tanrei-prose-lead` | A paragraph the author marks as the lead (`comp.prose.lead.typescale`). |
| `tanrei-prose-heading`, `tanrei-prose-anchor` | A heading with its anchor: `<div class="tanrei-prose-heading"><h2 id="x">…</h2><a class="tanrei-prose-anchor" href="#x" aria-label="Link to: …">…</a></div>`. The wrapper is spaced as the heading — also one that holds the heading alone, with no anchor; a wrapper without this class is a block like any other (below). The anchor follows the end of the text on its last line, never alone on a line, hidden from sight until the heading or the anchor is hovered or the anchor is focused, and always shown where there is no hover. |
| `tanrei-not-prose` | A part prose leaves alone: it is spaced as a block, and nothing inside it is styled. Every Tanrei element is one already. A `.tanrei-prose` inside such a part is prose again, at any depth (a callout's body in a card in a tab's panel on a page of prose). |

`--tanrei-prose-scroll-offset` (on the container or above it) is the height of what you keep fixed at the top of the
view: a heading that is navigated to keeps its own space before below it.

What it does, all from `--tanrei-comp-prose-*`: `h1`–`h6` are `heading-1…6` and running text the container's style;
`small`, footnotes and their references the secondary style; `strong`/`b`/`dt` the emphasized weight of the style they
sit in. Exactly one space separates two neighbours — the block gap, or a heading's own before and after, or a rule's —
and the first and last blocks have none. Lists are set in by `list.indent` with markers by depth (dot, ring, square;
number, letter, roman numeral), numbers in figures of equal width; a task item's disabled checkbox is drawn as the
glyph `check_box` / `check_box_outline_blank` **where `icons.css` is loaded** and is the browser's own box otherwise. A
quote has a line along its start edge; an `hr` is the divider's line; links are underlined as the Link's choice says
(at rest in the default system; under forced colors always — PRS-17, PRS-28) and marked where they leave the site;
`code` and `pre`
keep the code role until the Code block exists. Prose sets **no text color**: it reads on whatever surface it is put
(a link is the Link, below: `prose.css` carries its rules for prose's own anchors, so rendered Markdown needs no class).
Japanese and Chinese break by their own rules (`line-break: strict`), emphasis in Chinese, Japanese and Korean is
upright at the emphasized weight, and their headings have no tracking. Direction is the place's (`dir` on an ancestor);
a block that states none is laid out by its first strong character, with its lines at the layout's start edge.

Not prose's: the anchor's look (the Link's: `.tanrei-prose-anchor` is the link that is a glyph alone), a
table (the Table's, below: wrap it in `<tanrei-table>`, which prose spaces as a block and leaves alone as it does any
Tanrei element; a bare `<table>` is spaced and not drawn, and one wider than the prose still overflows it), and what
is inside any component. A renderer that writes a task item's checkbox without a name leaves it unnamed: give it an `aria-label`.
A picture in a paragraph — what Markdown writes — is as wide as the paragraph may be; put it in a `figure` (or mark it
`tanrei-not-prose`) to let it take the prose's width. Markers by depth are written nine levels deep. What a browser
cannot do falls back quietly: without `text-wrap: balance / pretty` lines wrap as usual, and without the `lh` unit
(Firefox before 120) a task mark stands at the top of its line, not on its centre. (`prose.css` registers no custom
property: "A page that changes its tokens at run time", above.)

**What it costs, and what that asks of you.** Prose is written so that a browser styles a long page of it in a few
times the time the page takes without it, and so that a component that writes an attribute restyles itself and not the
page (`src/styles/prose.perf.test.ts` measures both in Chromium: 12 000 elements with 300 islands, 51 ms against 13 ms
— every anchor asks its parent one style query for the Link's underline —;
0.03 ms a write; and a write inside a table of 2 400 elements in prose restyles 3 of them, with every stylesheet of
the package on the page and a `:has()` of the product's own on its root). Four things follow from how:

- *What is prose's own is an inherited value, read by a style query.* `--_prose-own` is 1 on a `.tanrei-prose` and 0 on
  an island, and every element rule stands in `@container style(--_prose-own: 1)`: an element is prose's own when its
  parent holds 1. So prose needs **style container queries** (Chromium 111, Safari 18, and the Firefox that ships
  them — the version this package is tested in does); a browser without them draws the container's text style and no
  element rule, with nothing overflowing or hidden. There is no script fallback: prose runs no script.
- *A pseudo-element asks its own element.* A list item or an anchor that is ITSELF marked `tanrei-not-prose` is still
  spaced and set as prose's block, but its marker, its task glyph and a link's mark are not drawn by prose. Mark a
  wrapper around it instead.
- *A heading's wrapper is named.* `<div class="tanrei-prose-heading"><h2>…</h2></div>` is spaced as the heading, with
  or without an anchor. A wrapper with no class around a single heading (`<div><h2>…</h2></div>`) is a block: a block
  gap before and after it. Telling it apart needs `:has()` on any element whatever, and that one selector made each
  attribute a component wrote restyle a tenth of a long page — or, beside a product's own `:has()` rules, the whole
  document.
- *`:has()` is asked of the element a rule styles.* Whether a list holds an item of several blocks is asked of the
  list and handed to its items as a value; a block after a paragraph in an item is said from the block's side
  (`li > p ~ *`). No stylesheet of the package asks one element for the sake of another, except on an element that
  holds a few inline things (a link and its glyph, a heading's wrapper): a browser keeps the element it asked as one
  whose subtree it restyles when something inside changes, and restyles it WHOLE where any rule of the page of that
  shape styles an element it cannot name — your stylesheet's rules count with Tanrei's. If a table, a list or a
  section of yours is slow to style while components inside it are defined, look for `X:has(…) > …` and `X:has(…) Y`
  in your own CSS, and for a `:has()` on the root: `:root:has(.menu-open)` is asked again of the whole document every
  time something changes that any `:has()` asks about. A class on the root, set by the script that opens the menu,
  costs nothing.

**In a box that scrolls.** A heading's wrapper, a task item and the notes' section are `position: relative`: the
anchor, the task glyph and the notes' hidden label are laid out against them, so a scroll box the prose stands in cuts
them (against nothing, they would stand outside it and widen the page).

Every rule has no specificity (`:where()`), in `@layer tanrei.components`: one class of yours wins. The shipped file
names every Tanrei tag as an island; the build writes them from `custom-elements.json`.

Both stylesheets follow `data-tanrei-system`, the dials and a re-valued role, because every rule reads the custom
properties; under `m3-like` an `h1` is still `heading-1` (32 px, Roboto) — `display-large` is a role the preset *adds*,
and a role a preset adds has no utility class (write its two declarations from its properties).

## `<tanrei-table>` (`table.css`)

`specs/table.spec.json`: data that has rows and columns, with named columns, optional row headers, a caption and
footer rows. It scrolls in its own box when it does not fit. A column's header can ask for the rows in its order, a
table without rows shows your Empty state, and a status line under the rows holds your sentence and your pagination
(below: "Sorting, no rows, the status line"); rows can be chosen by a checkbox each, and a table that is waiting for
its rows says that it is busy (below: "Rows that are chosen, a loading body") — the table itself never sorts, filters,
fetches or pages: it draws the rows it is given, in the order it is given them.

**Its form is unlike the others': an element with no shadow root around your own native element.** `<tanrei-table>` is the
scroll box; the `<table>` inside it stays in the document and is never given another `display`, so its semantics, a
crawler's reading, copy and paste as a table and a screen reader's table navigation are the browser's own. One
stylesheet, `@tanrei/web/table.css`, draws everything — before and without script, since an element that is not yet
defined is still an element — and the element adds what a stylesheet cannot. The element also adds the same sheet to
the root it is connected to (the document, or another component's shadow root), so the script alone draws a table too,
a moment later; load the stylesheet where the table should be drawn in the first frame.

```html
<link rel="stylesheet" href="@tanrei/web/table.css" />
<tanrei-table density="compact" striped row-headers sticky-first-column>
  <table>
    <caption>Visits by region</caption>
    <thead><tr><th scope="col">Region</th><th scope="col" data-align="end" data-wrap="false">January</th></tr></thead>
    <tbody><tr><th scope="row">Islands</th><td data-align="end">212</td></tr></tbody>
    <tfoot><tr><th scope="row">All regions</th><td data-align="end">6,846</td></tr></tfoot>
  </table>
</tanrei-table>
```

| Attribute | Values | Default | |
|---|---|---|---|
| `density` | `regular` \| `compact` (open) | `regular` | a row of one line is 46 or 32 in the default system; a row has no height of its own; reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | a hairline between rows, or `comp.table.row.gap` of space and no line; `auto` is `comp.table.separation`, which follows `sys.behavior.separation`; reflected |
| `striped` | boolean | `false` | every second body row that is shown is filled with `comp.table.stripe.container.color` |
| `row-headers` (`rowHeaders`) | boolean | `false` | the first column names its rows: write its cells as `<th scope="row">`. Where they are plain `<td>` (rendered Markdown) they are drawn as row headers and the element gives them `role="rowheader"` |
| `sticky-header` (`stickyHeader`) | boolean | `false` | the header row stays at the top of the box while rows scroll in it — where you limit the height (`max-block-size` on the element). It does not follow the page |
| `sticky-first-column` (`stickyFirstColumn`) | boolean | `false` | the first column stays at the start edge while columns scroll under it; released where it is wider than half of the box |
| `caption` | text | — | a convenience that writes the table's `<caption>`; a `<caption>` in the markup is the same thing and is drawn before the element is defined |
| `label` | text | — | the accessible name where no caption is drawn: the element writes it as the table's `aria-label`. Ignored where the table has a caption. Without script, write `aria-label` on the `<table>` |
| `status` | text | — | a convenience that writes the status line's paragraph (below); a `<div data-part="status">` in the markup is the same thing, is drawn before the element is defined, and is then the one that is read |
| `selection` | `none` \| `multiple` | `none` | `multiple`: the rows that have a `data-value` and a checkbox in their selection cell can be chosen (below). `none` draws no selection cell, whatever the markup holds, and ignores `data-selected`; reflected |
| `select-all-label` (`selectAllLabel`) | text | — | the accessible name of the header row's checkbox ("Select all products"); from your words (`setWords({ selectAllLabel })`) where the instance gives none. Tanrei ships no word: without either the checkbox is drawn, has no name, and the missing word is reported |
| `loading` | boolean | `false` | you are fetching rows: the element writes `aria-busy="true"` on the table, and the empty row is not drawn. Nothing is dimmed or disabled; reflected |
| `sorted-ascending-label`, `sorted-descending-label` | text | — | accepted and not read: the header cell's `aria-sort` says the order on the web |

| Event | `detail` | |
|---|---|---|
| `sort` | `{ column, index, direction }` | a sortable column's header was pressed: the cell's `data-value` (empty where it has none), its place among the columns of data from 0, and the direction asked for. Bubbles; cancelable where the control is an anchor |
| `selectionchange` | `{ values }` | the user changed which rows are chosen, by a row's checkbox or the header's: the `data-value` of every chosen row after the change, in row order. Bubbles; not emitted for what you write. It is a `CustomEvent` — see the note on the browser's own event of that name below |

A **column** is a `<th scope="col">` in the one `<thead>` row: `data-align="start | center | end"` and
`data-wrap="false"` on it are the column's. The element writes the positions of such columns on itself
(`data-columns-end="2 3"`, `-center`, `-nowrap`) and one rule per position, in a sheet it adds, places their cells —
**no cell is written to**, so a table of several hundred rows costs what its header row costs. Without script (or to
have the first frame right), write the same two attributes on each cell; a cell's own attribute always wins. A
Markdown renderer's `align="left | center | right"` is read too, left and right as start and end. A **row** is a
`<tr>`, a footer row a `<tr>` in `<tfoot>`, a **cell** a `<td>` holding text, any element of yours, or nothing. A
header row whose every cell is empty is not drawn. A row with more cells than the table has columns draws only as many
(and is reported); one with fewer leaves the rest of its row empty, without the row's line there.

What the script adds, as attributes of the element (never of a row): while the box scrolls, `tabindex="0"`,
`role="region"` and `aria-labelledby` (the caption) or `aria-label` — all taken off again when it no longer does, and
left alone where you wrote them yourself; `data-more-start`, `data-more-end` (columns beyond that inline edge: a
hairline at the edge) and `data-more-above` (rows under a header that stays: its line under the gap form);
`data-first-column-released`; `data-columns` (the number of columns). It keeps the column a person was looking at in
view when a `dir` above it changes. The keys are the browser's own for a focused scroll box: arrows, Page Up and
Page Down, Home and End. One scroll listener and one observer of changes per table, one observer of sizes for every
table of the page (the boxes and the tables) and one observer of `dir` per root; nothing per row, and nothing at rest.

### Sorting, no rows, the status line

Everything here is your own markup inside the same table, drawn by `table.css` before and without script. Load
`@tanrei/web/icons.css` and the icon face as well: the sort marks are glyphs of the system's icon set, and the
stylesheet draws them only where `icons.css` is.

```html
<tanrei-table>
  <table>
    <caption>Products</caption>
    <thead><tr>
      <th scope="col" aria-sort="ascending" data-value="name"><button type="button">Name</button></th>
      <th scope="col" aria-sort="none" data-value="price" data-align="end" data-wrap="false"><button type="button">Price</button></th>
      <th scope="col">Note</th>
    </tr></thead>
    <tbody>…</tbody>
  </table>
  <div data-part="status"><p role="status">1–20 of 132</p><tanrei-pagination variant="compact" size="small" …></tanrei-pagination></div>
</tanrei-table>
```

**A column that can be sorted** is a header cell that names the order the rows are in — `aria-sort="none"`,
`"ascending"` or `"descending"` — and holds your `<button type="button">` around the header's text. The stylesheet
makes the whole cell the button (its container is the button's `::before`, laid over the cell, so the cell keeps its
paddings and the label stays where a plain header's is) and draws the mark from the attribute: `swap_vert`,
`arrow_upward` or `arrow_downward`, after the label, and before it in a column whose `data-align` is `end`. You write
no glyph. The table **never sorts**: a press emits `sort` with the direction asked for — `ascending`, or `descending`
where the rows ascend by that column — and changes nothing. You order your rows and write `aria-sort`:

```js
table.addEventListener('sort', ({ detail }) => {
  rows.sort(by(detail.column, detail.direction));         // or ask your server
  tbody.replaceChildren(...rows.map(toRow));
  for (const th of headerCells) th.setAttribute('aria-sort', th.dataset.value === detail.column ? detail.direction : 'none');
});
```

Keyboard focus stays on the button through the press, and comes back to the button of the same column where you
replaced the header row with the rows. One column at a time is sorted (a second is drawn as given and reported in a
debug build); a header cell with `aria-sort` and no button is a plain header — do not write the attribute there; a
button without text is not drawn (and is reported). A header row with a sort button is at least `sys.target.pointer`
high at the regular density, as high as a compact header row at the compact one, and `sys.target.touch` high for a
coarse pointer at both.

**A table ordered by the server** holds an anchor in place of the button — `<a href="?sort=price&order=asc">Price</a>`,
to the same table in the other order — which works without script. `sort` is then emitted before the browser follows
the link and is cancelable: `event.preventDefault()` keeps the page. Space does not activate it, as it activates no
link.

**No rows**: one row of one cell that spans the columns, holding your Empty state — or your sentence, in an element.

```html
<tbody><tr data-part="empty"><td colspan="3"><tanrei-empty-state headline="No products match these filters">…</tanrei-empty-state></td></tr></tbody>
```

The table gives it `comp.table.empty.padding-block` above and below, the box's width at most, and keeps it in view
while the columns scroll sideways — which is said of the element the cell holds: text written straight into the cell
has no box to keep, and scrolls with the columns. The element puts a `colspan` right that is not the number of
columns. The row is drawn only while it is the only row of its `<tbody>`; it adds no word and no role, and announces
nothing (an Empty state that answers a search is live by itself). With no such row a table without rows is its header
alone.

**The status line** is a `<div data-part="status">` after the table, inside the element: your sentence in a
`<p role="status">` — told politely to assistive technology when its text changes, and not when it is first drawn —
and whatever stands at the end edge: one element, usually a `<tanrei-pagination size="small">` — compact where you do
not page by number — or your own group of a `<tanrei-select>` for the rows per page and that pagination. The range of
rows shown ("1–20 of 132") is your sentence, not the pagination's. Previous and next links do not belong here: they
lead to titled pages, not to the rows of one list. The table places
the two (the sentence at the start, the pagination at the end; one under the other where they do not fit), keeps the
line out of the sideways scroll and at the bottom of a box that scrolls its rows, filled with
`--tanrei-comp-table-sticky-container-color`, and does nothing else: it counts nothing, writes no word, and neither
styles nor listens to the pagination. Change the paragraph's text, or set `status` where you let the element write
it; keep the paragraph in the page while it is empty (it then takes no room), so that the next text is told.

What the script adds for these: the `sort` event; the answer to a press the system names (`data-pressed`, a ripple's
layer in the button) and the focus style where the browser has no style queries (`data-focus-style`); focus kept
through a change of rows, and a button focused by keyboard brought out from under a first column or a status line
kept in view; the `colspan` of the empty row; `data-more-below` (rows lie under the status line: its line is drawn
whatever the separation); `data-glyphs="pending"` while the icon set cannot draw a mark (none is drawn, its box is
kept). It listens for presses only while the table has a sort button; a table without one keeps its one scroll
listener. **Without script** the sort buttons, their marks, hover, focus and a press (the overlay, held for
press-hold), the empty content and the status line are drawn all the same, an anchor works, and the status line stays
at the bottom of its box; the event, the ripple and dim answers, and the corrections above are what is absent.

### Rows that are chosen, a loading body

```html
<tanrei-table selection="multiple" row-headers select-all-label="Select all products">
  <table>
    <caption>Products</caption>
    <thead><tr>
      <td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td>
      <th scope="col">Name</th><th scope="col" data-align="end">Price</th>
    </tr></thead>
    <tbody>
      <tr data-value="kettle" data-selected>
        <td data-part="selection"><tanrei-checkbox label-hidden checked></tanrei-checkbox></td>
        <th scope="row">Kettle</th><td data-align="end">38.00</td>
      </tr>
      <tr data-value="scale">
        <td data-part="selection"><tanrei-checkbox label-hidden label="Select the scale"></tanrei-checkbox></td>
        <th scope="row">Scale</th><td data-align="end">29.50</td>
      </tr>
    </tbody>
    <tfoot><tr><td data-part="selection"></td><th scope="row">Total</th><td data-align="end">67.50</td></tr></tfoot>
  </table>
  <div data-part="status"><p role="status">1 of 2 selected</p></div>
</tanrei-table>
```

**The selection column is your markup**: with `selection="multiple"`, every row begins with a
`<td data-part="selection">` — a cell, not a header cell, in the header row too (a header without text is announced as
an empty one). In the header row it holds the checkbox for every row; in a body row that has a `data-value` it holds
that row's; in a footer row, a placeholder row and a row that cannot be chosen it is empty. **A body row without a
`data-value` cannot be chosen**: that is how you mark such a record, and a checkbox written in its cell is not drawn.
The checkbox is a `<tanrei-checkbox label-hidden>` or a native `<input type="checkbox">`; the table moves, wraps and
replaces neither. The column is as wide as the checkbox and a cell's paddings, the checkbox stands on the cell's first
line and makes its row no taller, and the column is no column of data: `row-headers` and `sticky-first-column` mean
the column after it (the two stay in view together, and are released together), and a `sort` event's `index` does not
count it.

**The table holds the selection, row by row.** A chosen row carries `data-selected`: the stylesheet fills it with
`comp.table.row.selected.container.color` across its whole width, in place of a stripe, and draws its text in
`comp.table.row.selected.text.color`; what a cell holds beside text (a link, a tag, code) keeps its own colors. When a
person changes a row's checkbox the element writes `data-selected` on that row and emits `selectionchange` once, with
the values of every chosen row in row order. When **you** write or remove `data-selected` the element checks or
unchecks the row's checkbox and emits nothing. There is no list of values on the element: each row is chosen by what
it says of itself, so rows given again in another order stay as they were, and nothing is carried over to a row you
did not give. A press anywhere in the selection cell is the checkbox's.

**A press anywhere on a row that can be chosen is its checkbox's**, for a pointer (TBL-58): a click on the row's text,
its padding or its row header changes the checkbox, with the same `selectionchange`. It does not where the press lands
on what a cell holds that answers a press itself (a link, a button, a field, a label, anything with a tab index or a
widget role, a custom element that takes focus, or an element you gave the pointer cursor), where the pointer moved
more than 8 px, where the release ends a text selection in the row (text stays selectable and copyable), with Control,
Command, Shift or Alt held, on the second click of a double click, or where your own click handler called
`preventDefault()` — the element decides a task after the click, so your handler is heard first. The header row, a
footer row, a placeholder row, a row without a `data-value` and a row whose checkbox is disabled take no such press. The
row gets no role, tab index or `aria-selected`: the keyboard and assistive technology use its checkbox, as before.
Under a fine pointer the row is drawn hovered as one target (`data-tanrei-hit`, with the pointer cursor) and pressed as
one (`data-pressed` on the `<tr>`), from `comp.table.row.unselected.*` or `comp.table.row.selected.*` (TBL-59): the
fill is laid over the stripe or the chosen fill and changes at once; `ripple`, which has no one box across the cells of
a row, is drawn as `overlay`, and `dim` dims the row. Over a link or a button in a cell the row is drawn at rest.

```js
table.addEventListener('selectionchange', (event) => {
  if (!(event instanceof CustomEvent)) return;              // the browser's own event of this name (below)
  table.status = `${event.detail.values.length} of ${total} selected`;   // your sentence, in your language
});
```

**The header's checkbox** is kept in step by the element: checked while every row that can be chosen is, mixed
(`indeterminate`) while some are, unchecked while none is, and disabled while there is no such row. Activating it
while it is unchecked or mixed chooses every such row, and while it is checked clears them all, with one
`selectionchange`. "Every row" is every row the table was given: it never claims the rows of other pages — a product
that offers "all 132" says so with a control of its own.

**Names.** The header's checkbox is named by `select-all-label`, or by your words. A row's checkbox is named by its
own `label` (`aria-label` on a native one); where it has none, the element names it by the text of the row's header
cell — so a table with row headers needs no words for its rows — and with neither it has no name, which a debug build
reports once per table. The element also writes `label-hidden` on a `<tanrei-checkbox>` that lacks it.

**It is still a table.** No role is replaced, no row gets a selected state, and no key moves focus from cell to cell:
each checkbox is a Tab stop of its own, after the header's controls, row by row, and says by its checked state that
its row is chosen. That is also what is left in forced colors, where the fill is gone. A row that holds a checkbox is
at least `sys.target.pointer` high at the regular density, as high as a compact row at the compact one, and
`sys.target.touch` high — its selection cell that wide — for a coarse pointer at both. Keyboard focus stays on a
checkbox through a change of rows (the checkbox of the row with the same `data-value` takes it), and a checkbox that
takes focus under a header row or a status line kept in view is brought out from under it.

**A count of what is chosen** is your sentence in the status line; bulk actions are your Buttons, above the table.

**Loading.** Set `loading` while you fetch — the first rows, another page, the same rows in another order. The
element writes `aria-busy="true"` on the table (a server may write it itself) and otherwise the table **draws what it
is given**: the rows it had, which is the better answer to a change of order or of page, or placeholder rows, for a
first load. Nothing is dimmed, nothing spins and nothing is disabled — a second press on a header is a wish you may
honour. Say "Loading" in the status line, and say when it is over.

```html
<tanrei-table loading selection="multiple">
  <table>
    <thead>…</thead>
    <tbody>
      <tr data-placeholder aria-hidden="true">
        <td data-part="selection"></td>
        <td><span class="tanrei-skeleton-placeholder"></span></td>
        <td data-align="end"><span class="tanrei-skeleton-placeholder" style="inline-size: 3rem; margin-inline-start: auto"></span></td>
      </tr>
    </tbody>
  </table>
  <div data-part="status"><p role="status">Loading</p></div>
</tanrei-table>
```

**A placeholder row** is `<tr data-placeholder aria-hidden="true">`: a body row — striped and lined as one — at least
one line of text tall however little its cells hold. Leave its cells empty, or put the Skeleton's placeholder in them
(`class="tanrei-skeleton-placeholder"`, `@tanrei/web/skeleton.css`): a text placeholder is one line of the cell's own
text style, so the row is as tall as the row that will replace it. The class alone is enough — the table's busy state
is the one wait that is said, so no `<tanrei-skeleton>` is needed around it. A placeholder row has no checkbox, is no
row for the header's checkbox or for the empty row, and is hidden from assistive technology (the element writes
`aria-hidden` where you did not). One left in a table that is not loading is drawn all the same and reported. While
the table is loading the empty row is not drawn, even with no body row.

**Without script** the selection column, a chosen row and placeholder rows are drawn from the markup alone: write
`data-selected` on the rows that are chosen — or use native checkboxes, whose row is drawn as chosen while its
checkbox is `checked` (and which work in your form: give them a `name` and a `value`) — and `aria-busy="true"` on a
table that loads. What needs the script: `<tanrei-checkbox>` itself, the header's checkbox kept in step and choosing
every row, the event, `data-selected` kept in step, the names taken from row headers, a press beside a native checkbox
in its cell, a press on the row outside its selection cell and the row's hover and press (without script a row shows
neither a state nor the pointer cursor, so it promises nothing it does not do), and the selection column kept in view with a first column that stays (the element measures where it ends:
`data-selection-kept` and `--_table-selection-size` on the element; until then the selection column scrolls with the
others and the first column is kept at the edge).

Good to know about these:

- **`selectionchange` is also the browser's name** for a change of the text selection, and that event bubbles from a
  text field: a text field in a cell sends one through the table. The table's is a `CustomEvent` with `detail.values`;
  the browser's is a plain `Event`. Tell them apart as above.
- **The Checkbox's container is taller than a compact row** (40 in a row of 32 in the default system): what it draws
  beyond its row — the round state layer under the pointer — is cut at the row's edges. Its focus indicator is around
  the box and inside the row at both densities.
- **A tonal tag and tonal inline code lose their own fill on a chosen row in the default system**: their containers
  are within 1.15:1 of `secondary-container` in all six schemes. Their text keeps its contrast; a tag in a table whose rows are chosen reads best
  outlined.
- The cost of a selection is the rows': the element reads every row that can be chosen when the table changes, and
  only while `selection` is `multiple`. It listens for `change`, `click`, `focusin` and `focusout` only then.

Markdown: a renderer writes a bare `<table>`. Wrap it at build time — Tanrei does not move your content at run time
:

```js
import { visit, SKIP } from 'unist-util-visit';
export function rehypeTanreiTable() {
  return (tree) =>
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || parent?.tagName === 'tanrei-table') return;
      parent.children[index] = { type: 'element', tagName: 'tanrei-table', properties: {}, children: [node] };
      return SKIP;
    });
}
```

Good to know:

- **The box takes its width from its layout, never from its table** (it is a size container, so that the caption can
  be as wide as the box): it is `inline-size: 100%`. In a parent that shrinks to its content, give the element a width.
  It is also the containing block of a `position: fixed` element inside a cell; what Tanrei opens from a cell is in
  the top layer and is not affected.
- **The table needs its sections** (`<thead>`, `<tbody>`, `<tfoot>`, as the HTML parser writes them): rules reach rows
  and cells by child selectors only, so a table inside a cell is yours and is not drawn.
- A table on a surface other than the page's that keeps its header or first column sets
  `--tanrei-comp-table-sticky-container-color` to that surface's color.
- **Without script** the table is fully drawn, scrolls in its box and keeps its sticky parts. It lacks the two edge
  lines, the line along a first column that stays, the release of that column, a column's alignment taken from its
  header cell, the row header role on plain cells, and — in a browser that does not focus a scroll box by itself — the
  focus stop.
- **A browser without style container queries** draws the separation the tokens name when the element reads the
  table (it writes `data-separation` on the `<table>`); a system switched later is seen at its next reading. The
  attribute `separation` is exact everywhere.
- **A density a design system adds** gets its rules from the element, falling back to `regular`'s tokens;
  without script it is drawn as `regular`.
- **The rules the element writes are in no cascade layer** — a column's alignment and wrapping by position, the cells
  after the last column, an added density — so that they win over a copy of the stylesheet you load into a layer of
  your own (a later layer wins whatever the rules are, and the copy says `text-align: start` of every cell). Unlayered
  CSS of yours still wins by one class.
- **What the element writes, it writes once, and every table of a page together.** Its attributes (`data-columns`,
  the positions, the name) are written when it is defined and when its table changes, and the layout is read once for
  all the tables that wrote in that task, then `role`, `tabindex` and the edge lines are written for all of them. A
  server that knows them may write `data-columns="4"` (the number of columns) and the positions itself: an attribute
  that already says the same is not written again, and its cells are not styled a second time.
- **`:has()` is asked of the table for itself only** (whether footer rows follow, handed to the last body row as a
  value), so a table is never an element whose cells a browser restyles because something inside one of them changed
  — a table of live components costs each of them its own restyle, not the table's.
- **A sort mark stands at the end of its button's box, not of its label's last word**, where a header's label wraps:
  the label is one box beside the mark, so the mark is on the last line and at the far edge of the column.
- Not drawn: the caption staying in view while rows scroll up and down (it stays sideways only), and a header that
  follows the page's scroll. Spanning cells and a second header row work as
  HTML does and take the cell styles; alignment by position does not account for spans.
- Figures are tabular in every cell (`font-variant-numeric: tabular-nums`); in a face whose tabular figures also widen
  punctuation, a hyphen in an identifier is wider than in running text.

## `<tanrei-description-list>` (`description-list.css`)

`specs/description-list.spec.json` (DSL-1 to DSL-23): what is known about one thing as named facts — a quiet term and
the value that answers it — with the terms beside their values, above them, or under a large figure. It is laid out by
its own width and takes no input.

It has the table's form: an element with no shadow root around your own native `<dl>`, which stays in the document and
is given no role, and one stylesheet, `@tanrei/web/description-list.css`, that draws everything before and without
script. The element adds the same sheet to the root it is connected to.

```html
<link rel="stylesheet" href="@tanrei/web/description-list.css" />
<tanrei-description-list layout="stacked" columns="3">
  <dl>
    <div><dt>Category</dt><dd>Actions</dd></div>
    <div><dt>Owners</dt><dd>Aiko Tanaka</dd><dd>Samir Haddad</dd></div>
    <div><dt>Status</dt><dd><tanrei-tag size="small" status="success" label="Stable"></tanrei-tag></dd></div>
  </dl>
</tanrei-description-list>
```

| Attribute | Values | Default | |
|---|---|---|---|
| `layout` | `inline` \| `stacked` \| `stat` | `inline` | the term beside its value in a column all terms share; the term above its value; the first value first, as a figure, with the term under it. Any other value is `inline` and is reported; reflected |
| `columns` | a whole number | `1` | the most columns of facts in `stacked` and `stat`: each is at least `comp.description-list.column.min-width` wide, so the list draws fewer when narrow, and never more than it has facts. `inline` is one column. Reflected |
| `density` | `regular` \| `compact` (open) | `regular` | the text styles and the space between facts; reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | one hairline between a fact and the fact below it, or `fact.gap` of space and no line; `auto` is `comp.description-list.separation`, which follows `sys.behavior.separation`; reflected |

A **fact** is a `<div>` around one `<dt>` and its `<dd>`s. A term and a value hold text or any element of yours; a
fact may have several values, each on a line of its own, and a value may be empty (it keeps its line; write `<dd></dd>`
so that the fact is exposed with an empty value). A second `<dt>` in one group works as HTML does and is drawn under
the first. A `<dl>` **without groups** — `<dt>` and `<dd>` as its children — is drawn in one column, inline or stacked,
with the line above each term that follows a value; `columns` and `stat` need the groups (reported).

**The one thing the script adds: an inline list stacks by its own width (DSL-4).** A stylesheet cannot compare the
widest term with the list's width. The element measures the widest term (for the length of one call the list is laid
out with no term wrapped, `data-measuring`; nothing is painted in between), adds the space between the columns and the
least width, and writes the sum on itself — `data-stacks-below="256"` — with one rule in a sheet it adds:
`@container (inline-size < 256px)`. From then on **the browser draws the other form itself** as the list is resized,
in the same frame and with no script running. The terms are measured again when the list's content changes, when a
face arrives, and when the list changes size (a reader's text size, a system switched above it); a width that changed
there is written in the next frame. One observer of sizes and one of changes per list; nothing at rest.

Good to know:

- **Without script** an inline list that is too narrow wraps its terms beside its values, which keep the least width;
  nothing is cut. Everything else — the term column, columns of facts, the stat layout, lines, densities — is the
  stylesheet's, and defining the element moves nothing.
- **The list is a size container** (`container-type: inline-size`), so it takes its width from its layout, never from
  its facts: in a parent that shrinks to its content, give the element a width.
- **A list in columns clips above its first row.** Every fact keeps its line above itself, and the list is moved up by
  as much, because a stylesheet cannot know which facts are in the first row. What is clipped (`clip-path` on the
  `<dl>`) is the first row's line; half of the padding under it is left, so a focus ring of yours at the top of a
  value is drawn. An element of yours that is positioned out of a value towards the top of the list — and is not in
  the top layer — is clipped there. A list of one column (`inline`, or no `columns`) clips nothing, and neither does
  `separation="gap"`.
- **The rules the element writes are in no cascade layer**, so that they win over a copy of the stylesheet you load
  into a layer of your own. Unlayered CSS of yours still wins by one class.
- **A browser without style container queries** draws the separation the tokens name when the element reads the list
  (`data-separation` on the `<dl>`); a system switched later is seen at its next reading. The attribute `separation`
  is exact everywhere.
- **`columns` above 6** gets its rule from the element; without script such a list draws one column.
- **A density a design system adds** gets its rules from the element, falling back to `regular`'s tokens.
- **In prose** the element is an island (PRS-16): prose spaces it as a block and styles nothing inside it, while a
  bare `<dl>` beside it stays prose's reading form (PRS-13). Nothing turns the one into the other.
- An empty `<dl>` is not drawn and not exposed (`display: none`). A fact with no `<dd>` keeps one line of the value's
  height; it cannot be exposed with an empty value, which needs the `<dd>`.
- `1lh` sizes an empty value's line: Chromium 109, Firefox 120, Safari 16.4. Subgrid aligns the term column:
  Chromium 117, Firefox 71, Safari 16.

## `<tanrei-figure>` (`figure.css`)

`specs/figure.spec.json` (FIG-1 to FIG-26): one thing to look at — a picture, a chart, a specimen, a live example — on
a stage of its own, framed or not, with a caption below, and optionally a title with your controls above and a block
joined beneath. It is never pressed and has no state.

It has the table's form too: an element with no shadow root around a native `<figure>`, and one stylesheet,
`@tanrei/web/figure.css`, that draws everything before and without script — a page of figures does not move when the
script arrives. The element adds the same sheet to the root it is connected to.

```html
<link rel="stylesheet" href="@tanrei/web/figure.css" />
<tanrei-figure variant="filled" separation="divider">
  <figure>
    <div data-part="frame">
      <header>
        <p data-part="title">Variants</p>
        <div data-part="actions"><tanrei-button variant="text" label="Open in a new tab"><span slot="icon">open_in_new</span></tanrei-button></div>
      </header>
      <div data-part="stage"><tanrei-button>Save</tanrei-button></div>
      <tanrei-code-block data-part="attachment">…</tanrei-code-block>
    </div>
    <figcaption>A filled button and its markup.</figcaption>
  </figure>
</tanrei-figure>
```

Every part but the stage is optional. The title is any element with `data-part="title"` (a `<p>`, or the heading the
page's outline needs: its role and level are kept, and it is drawn in the title's style); the attachment any element
with `data-part="attachment"`. A lone `<img>`, `<picture>`, `<video>`, `<svg>` or `<canvas>` in place of the stage
element is its own stage, and a stage or such a picture that is a child of the `<figure>` itself — the
`<figure><img><figcaption>` a Markdown renderer writes — is its own frame.

| Attribute | Values | Default | |
|---|---|---|---|
| `variant` | `outlined` \| `filled` \| `plain` (open) | `outlined` | the surface inside one hairline; a quiet tone and no edge; no fill, edge, padding or line. Reflected |
| `flush` (`inset`) | boolean | not set (`inset` is `true`) | the stage is not padded, so what is shown reaches the frame's edges and is clipped by its corners. The inverse of the spec's `inset`, as the card's |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | a line under the header and above the attachment, which is flush with the frame; or no line, and the attachment set in by `comp.figure.attachment.gap`. `auto` is `comp.figure.separation`. The plain look draws neither. Reflected |
| `pattern` | `none` \| `grid` \| `dots` \| `grid-fade` \| `checkerboard` | `none` | the ground behind what is shown, across the stage: hairlines every `comp.figure.pattern.spacing`; a dot at every crossing of that grid; the grid, clear around the centre and growing toward the corners (the documentation's live examples); squares for a picture that may be transparent. Decoration only, in `comp.figure.pattern.color`. The plain look and forced colors draw none; any other value draws none and is reported. Reflected |
| `label` | text | — | the accessible name of a figure that draws neither a title nor a caption: the element writes it as the figure's `aria-label`. Ignored where there is one |
| `headline` | text | — | the spec's `title` (HTML's own `title` would show a tooltip): the element writes it as a `<p data-part="title">`. A title in the markup wins |
| `caption` | text | — | the element writes it as the `<figcaption>`. A `<figcaption>` in the markup wins |

What the script adds, and takes off again when it no longer holds: on the `<figure>`, `aria-labelledby` (the title)
and — where it has both — `aria-describedby` (the caption), or `aria-label` from `label`; a figure with a caption
alone is named by the browser and nothing is written. On the stage, while its content is wider than it,
`tabindex="0"`, `role="group"` and the figure's name; the arrow keys are the browser's own for a focused scroll box,
and the element takes Home and End to the stage's start and end (a browser gives them to the page). `data-empty` on
the element while the stage holds only white space. Attributes you wrote yourself are left alone. One observer of
sizes (the stage and its children) and one of changes per figure; nothing at rest.

**A figure the element builds.** A `<tanrei-figure>` with no `<figure>` in it is given one: its children are the
stage, those with `slot="title | actions | caption | attachment"` go to that part, and children added later go the
same way. This is the short form for a figure made by script. It is drawn when the element is defined, not before,
and **a framework that owns the element's children (React) must write the parts itself**, because the element moves
them: with `@tanrei/react`, `<Figure><figure>…</figure></Figure>`.

Good to know:

- **The frame's edge is an outline set inside it**, not a border: it takes no room, so the three looks place what
  they hold alike, it is drawn over a joined block's own fill, and forced colors keep it (in the text color, on the
  filled look too). `outline` on the frame is therefore the figure's.
- **The stage is a flex column** (`align-items: safe center`): what you put in it shrinks to its content and is
  centred, or starts at the start edge in the plain look. For a block that should fill the stage, give it
  `inline-size: 100%` or `align-self: stretch`. A row of several examples is one element of yours in the stage.
  In a browser without `safe` alignment, content wider than the stage is centred on it and its start
  cannot be scrolled to.
- **The stage is the scroll box** (`overflow-x: auto`) and clips what reaches past its padding box: the default
  padding leaves room for a focus ring and a level 2 shadow; a flush or plain stage does not.
- **The pattern is the stage's own background** (`background-color` the look's fill, `background-image` the
  pattern's gradients): it takes no element and no input, stays in place while the stage scrolls, shows through a
  transparent lone picture, and is read on the stage — so a stage scoped to another system (`data-tanrei-system`)
  draws that system's pattern on its fill. A `background` you set on the stage replaces it.
- **The attachment is placed, never styled**: a margin in the gap form and nothing else. A block with corners of its
  own (a code block) shows its upper corners under the divider form's line; a block that joins
  squarely is not drawn yet.
- **Without script** everything is drawn. A browser does not name a figure by its `<figcaption>` in the tree it
  gives assistive technology, so the element writes the name — `aria-labelledby` naming the title, or the caption
  where there is no title — and until it is defined a figure has none (write `aria-labelledby` yourself to have it
  from the first frame; a label you write on the `<figure>` is left alone), `label` is not
  applied (write `aria-label` on the `<figure>`), a scrolling stage is a focus stop only in a browser that focuses
  scroll boxes by itself, and a stage that holds only white space is still drawn (an empty one is not).
- **A browser without style container queries** draws the separation the tokens name when the element reads the
  figure (`data-separation` on the `<figure>`); the attribute is exact everywhere.
- **A variant a design system adds** gets its fill from the element (`comp.figure.<variant>.container.color`),
  with the outlined look's edge; without script it is drawn as `outlined`.
- **In prose** the element is an island: prose spaces it as a block at its full width, and keeps its caption — and a
  bare `<figure>`'s — to the measure (PRS-18).
- Corner smoothing follows `sys.shape.corner-smoothing` through the shared rule; the stage's focus ring takes the
  frame's radius where the stage meets its corners.

## `<tanrei-accordion>` (`accordion.css`)

Content that a row shows and hides in place (`specs/accordion.spec.json`, ACC-1 to ACC-35). The element has **no shadow root**: its items are your own native `<details>` elements, which open and close, take focus, carry the expanded state and keep their closed content in the document before any script runs and without it.

```html
<link rel="stylesheet" href="@tanrei/web/icons.css" />
<link rel="stylesheet" href="@tanrei/web/accordion.css" />

<tanrei-accordion variant="outlined" density="compact" separation="gap" exclusive>
  <details open>
    <summary>
      <span class="tanrei-icon" aria-hidden="true">palette</span>
      Colors
      <span data-supporting-text>Roles, palettes and the six schemes</span>
      <span data-trailing-text>48 roles</span>
    </summary>
    <p>Every color a component reads is a role.</p>
  </details>
  <details>
    <summary><h3>A label that is a heading</h3></summary>
    <p>…</p>
  </details>
  <details>
    <summary aria-disabled="true" tabindex="-1">A disabled item</summary>
    <p>…</p>
  </details>
</tanrei-accordion>
```

| Spec | Web |
| --- | --- |
| `variant`, `density`, `separation`, `exclusive` | attributes (and properties) of `<tanrei-accordion>` |
| an item | a `<details>` child; `open` is its own attribute and property |
| `label` | the text of its `<summary>` |
| the label slot | ONE element in the text's place: a heading, or a `<span>` around text with inline content |
| `supportingText`, `trailingText` | an element with `data-supporting-text`, `data-trailing-text` inside the summary |
| `icon` | a `<span class="tanrei-icon" aria-hidden="true">` first in the summary |
| `disabled` | `<summary aria-disabled="true" tabindex="-1">` |
| `toggle` | the item's own `toggle` (it does not bubble; `event.newState`) |

**What the stylesheet draws alone**, before the element is defined and without script: both looks, both densities, each separation, every part of a header, hover, the focus ring, a press (the overlay, held for press-hold), the disabled look, forced colors, right to left, and — in a browser that can move a height to `auto` in CSS (`calc-size()`) — the height motion. Nothing moves when the element is defined.

**What the script adds**: the system's answer to a press (`data-pressed`: overlay, ripple, dim, none); the arrow keys; `exclusive`, as a `name` of the accordion's own on its items (a `name` you wrote is left alone); the height motion where the browser cannot move a height to `auto`; the pressed header kept in place while an item above it closes; focus given to the header when its item closes around it; the supporting and the trailing text as the header's description instead of part of its name (`aria-describedby`, with the two parts hidden from the name) and `dir="auto"` on each; `tabindex="-1"` on a disabled summary that lacks it, and a disabled summary's click refused; the debug reports.

How it is built, and what follows from it:

- **The header is a grid**, and a label of text is its anonymous item. A label of several nodes (text and a `<code>`) would be several items: put it in one `<span>`. A debug build says so.
- **The edge and the lines take no room.** They are drawn over the items (`::after`, `::before` of each `<details>`), so `plain` and `outlined`, `divider` and `gap` lay everything out alike. Those two pseudo-elements of an item are the accordion's.
- **The content's box is the browser's `::details-content`.** Its inset, the space under it and its height motion are set there, so nothing wraps your content. Open, it is not clipped; it is clipped only while its height moves.
- **The height motion.** Where `calc-size()` exists (Chromium today) it is CSS alone: `block-size` from 0 to `calc-size(auto, size)`, with `content-visibility` held to the end of closing and `interactivity: inert` from its start. Elsewhere (Firefox, WebKit) the element measures the content once, before the first frame, and the stylesheet moves the box between 0 and that length (`--_acc-size`); the content is drawn, clipped and `inert` while it closes. A change of `open` on the way reverses the transition from where it is. No script runs from frame to frame, with one exception: while an item above the pressed header is closing, the header's place is read once a frame and the scroll is moved by what it lost (ACC-14).
- **`toggle` is the browser's.** It is sent for every change of `open`: the user's, the browser's own for `name`, a fragment or a search, and yours — including a `<details open>` that was just parsed. Several changes in one task are sent as one event.
- **Find-in-page and fragment links** are the browser's too: a link to a place inside a closed item opens it in Chromium, Firefox and WebKit, and the element draws that change at once. A match of the browser's own search opens the item where the engine reveals a details element for it; that reveal cannot be told from any other change of `open`, so it moves as one.
- **A heading in a summary** keeps its role and its level in the document. What a screen reader does with a heading inside a button differs; see the docs page.
- **A label of bare text takes the layout direction.** A stylesheet cannot give a text node a direction of its own: wrap a label that may be written in the other direction in a `<span>`.
- **A density or a variant a design system adds** gets its rules from the element, read from that value's tokens with the default's as fallbacks.
- **Without `::details-content`** an item opens and closes at once, inset by the item's own padding.

## `<tanrei-table-of-contents>` (`table-of-contents.css`)

The headings of the page being read as links to them, the one being read marked, and a compact form — one row that names the current section and opens the same list — for a window with no room beside the text (`specs/table-of-contents.spec.json`, TOC-1 to TOC-40). The items are **your own nested list of anchors, in the document**: before the element is defined, and with scripting off, the page holds a plain list of links that work. The element keeps a small shadow root for what you did not write — a `<nav>` named by `label`, the title, and the compact form's block and row — and one stylesheet draws your list.

```html
<link rel="stylesheet" href="@tanrei/web/table-of-contents.css" />

<tanrei-table-of-contents label="On this page" density="compact">
  <ul>
    <li><a href="#top">Overview</a></li>
    <li><a href="#install">Install</a>
      <ul>
        <li><a href="#npm">npm</a></li>
      </ul>
    </li>
    <li><a href="#configure">Configure</a></li>
  </ul>
</tanrei-table-of-contents>
```

| Spec | Web |
| --- | --- |
| `label`, `labelHidden`, `presentation`, `density`, `open`, `current`, `tracking` | attributes `label`, `label-hidden`, `presentation` (`list`, `compact`), `density` (`regular`, `compact`), `open`, `current`, `tracking` (`auto`, `manual`), and properties |
| an item | an `<li>` whose first child is its `<a href>`; the label is the anchor's text |
| an item's own items | a `<ul>` after the anchor, inside the same `<li>` |
| the `title` slot | a child with `slot="title"`: a heading of the level your outline needs |
| the current item | `aria-current="location"` on its anchor, written by the element (or by you, with `tracking="manual"`) |
| `currentChange` | `currentchange`, `detail.href` |
| `select` | `select`, `detail.href`; cancelable, and cancelling it cancels the anchor's click |
| `toggle` | `toggle`, `detail.open` |

**What the stylesheet draws alone**, before the element is defined and without script: the title (from the `label` attribute), the rows of both densities, the indent of every level, the rail, an item you marked `aria-current` yourself with its marker and heavier label, hover, the focus ring, a press (the overlay, held for press-hold), forced colors and right to left. The list presentation does not move when the element is defined. The compact presentation shows its whole list until then (there is no row yet): a layout that must not show that for a moment hides `tanrei-table-of-contents[presentation="compact"]:not(:defined)`.

**What the script adds**: which item is current; the landmark, and the list role on your lists; the compact form; the system's answer to a press (`data-pressed`: overlay, ripple, dim, none); the row kept as high for its label at the current item's weight as at its own (`data-tanrei-label` on each `<li>`); each label's own direction (`dir="auto"` on an anchor whose label has a letter); the debug reports.

**Which item is current** (`tracking="auto"`). The last item, in the page's order, whose target has reached *the line*: where the browser itself rests a target it is sent to. The element reads it from your CSS and is never told a number:

```css
html { scroll-padding-top: 4rem; }          /* what you keep fixed at the top */
h2, h3 { scroll-margin-top: 1.5rem; }       /* the space a heading keeps above itself (prose.css sets it) */
```

- The view is the nearest ancestor of the targets that scrolls, else the window.
- An item whose `href` is `#top` or `#` is the item for what comes before the first heading: it has always reached the line.
- At the end of a view that has room to scroll, the last item is current.
- An item that was chosen, or that the address names (on load, `hashchange`, back and forward), is current at once and stays current until the person scrolls by their own hand — a wheel, a touch drag, a scrolling key, a press on the scroll bar — after the view has come to rest.
- A target that is not drawn (inside a closed fold or a tab that is not shown) is passed over; one that does not exist is reported in a debug build.

How it is built, and what follows from it:

- **Nothing runs at rest.** One passive `scroll` listener on the view, coalesced to a frame; `resize`; a `ResizeObserver` on what the view scrolls and on the boxes the targets stand in; a `MutationObserver` on your list. `src/idle.test.ts` holds it to no frame and no layout while the page is still.
- **The element never scrolls the view** and never writes the address or the history. A chosen item is followed by the browser as any link is; whether the page glides or jumps is your `scroll-behavior`. The only thing it scrolls is the region that holds the list — its own in the compact form, or a scrolling column you put it in — to keep the current row in view, and not while the pointer is over the list or focus is inside it.
- **A row is the anchor's own box**, from the rail to the list's end edge at every level: only the label is set in (a padding computed from the nesting), so the state layer, the focus ring and the marker of every level start at one edge. The rail (`::before` of the first list) and the marker (`::before` of an anchor) are borders drawn over the rows' first pixels; they take no room. Those pseudo-elements, the anchor's `::after` (the focus ring's inner stroke) and an item's `::before` are the component's.
- **The list does not move when the current item changes.** Each `<li>` draws its label once more, unseen, at the current item's weight, in the anchor's own cell, so a row is as high as the taller of the two. A label that needs one line more at the heavier weight therefore has that line's room under it while it is not current. Before the element is defined that copy is not there: such a row is one line lower until the script loads.
- **`display`** of the element is the stylesheet's (`block`, and a flex column in the compact presentation once defined): what the document says of an element wins over what its shadow root says.
- **The compact form's height** is its layout's: give the element a `max-block-size` (or hold it in a flex or grid track) and the list scrolls inside while the row stays.
- **`select` and focus in the compact form.** The list closes after the browser has taken the navigation, and nothing is focused: the next Tab continues from the chosen heading, as after any link to a place on the page.
- **A density a design system adds** gets its rules from the element, read from that density's tokens with the default's as fallbacks.
- **Inside a shadow root** the element adds the stylesheet to that root. Targets are looked up in the document.

## `<tanrei-app-shell>` (`app-shell.css`)

`specs/app-shell.spec.json` (APS-1 to APS-30): the frame of a page or an app. It places a header, the navigation, the
main content, an aside and a footer, decides from the window's width how each is shown, and lets a keyboard reach the
content in one step. It draws the frame and none of what stands in it.

It has the table's form: an element with no shadow root around your own regions, which stay in the document
and keep their semantics, and one stylesheet, `@tanrei/web/app-shell.css`, that lays the whole frame out before and
without script. The element adds the same sheet to the root it is connected to.

```html
<link rel="stylesheet" href="@tanrei/web/app-shell.css" />
<tanrei-app-shell aside-order="before" aside-label="On this page">
  <a class="tanrei-link" data-standalone slot="skip-link" href="#main">Skip to content</a>
  <div slot="announcement"><tanrei-callout status="info">…</tanrei-callout></div>
  <header slot="header">
    <tanrei-app-bar headline="Tanrei">
      <tanrei-button slot="navigation" data-app-shell-menu variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button>
    </tanrei-app-bar>
  </header>
  <tanrei-navigation-drawer slot="navigation" responsive collapsible label="Documentation">…</tanrei-navigation-drawer>
  <aside slot="aside">…</aside>
  <main id="main" tabindex="-1">…</main>
  <footer slot="footer">…</footer>
  <tanrei-navigation-bar slot="navigation-bar" label="Sections">…</tanrei-navigation-bar>
</tanrei-app-shell>
```

A **region** is a child with a `slot` attribute — the region's name; no shadow root reads it — and the main region is
the one `<main>` child without one. **Write them in the order a keyboard walks them** (APS-22): the skip link, the
announcement, the header, the navigation, the aside while `aside-order` is `before`, the main region, the aside while
it is `after`, the footer, the navigation bar. The stylesheet places them on a grid by name and never reorders focus.
A region you leave out takes no space and adds no landmark.

| Attribute | Values | Default | |
|---|---|---|---|
| `scroll` | `page` \| `main` | `page` | the window scrolls the page, with a sticky header and the navigation and the aside kept in view; or the frame is exactly the window and only `<main>` scrolls. The **property is `scrolls`** — every element already has a `scroll()` method; the attribute is the spec's name. Reflected |
| `header-position` | `sticky` \| `static` | `sticky` | whether the header stays at the top of the window; ignored while `scroll` is `main`. Reflected |
| `main-width` | `contained` \| `full` | `contained` | the main region's content no wider than `comp.app-shell.main.max-width` and centred, or all the room inside the gutters. Reflected |
| `aside-order` | `after` \| `before` | `after` | the side of the main content a stacked aside is drawn on: write the `<aside>` on that side of the `<main>` too. Reflected |
| `separation` | `auto` \| `divider` \| `gap` | `auto` | the hairline above the footer, at the aside's start edge and between the main content and a stacked aside; `auto` is `comp.app-shell.separation`. Reflected |
| `navigation-open` | boolean | off | the navigation is presented over the content, while it has no place in the layout (or only its column). Reflected |
| `aside-label` | text | | the aside's accessible name, where its element has none |

| Event | `detail` | |
|---|---|---|
| `windowclasschange` | `{ windowClass }` | the class was decided for the first time, or the window's width changed it: `compact`, `medium`, `expanded`. The read-only `windowClass` property and `data-window-class` hold it |
| `navigationopenchange` | `{ navigationOpen }` | the menu button asked for the navigation (true); it closed, or the class changed (false) |

**The window's class** is three media conditions, in rem, so a reader's zoom (and, in Chromium, a larger default text
size) moves the frame to a narrower class before its columns are too narrow to read:

| Class | Width (default system) | Navigation | Aside | Menu button | Navigation bar | Gutter |
|---|---|---|---|---|---|---|
| `compact` | under 600 | over the content, when opened | above or below `<main>` | shown | shown | 16 |
| `medium` | 600 to 1023 | its column where the drawer is `collapsible`; else as compact | above or below | shown unless the column is | not shown | 24 |
| `expanded` | 1024 and wider | beside the content | beside it, at the end edge | not shown | not shown | 32 |

What the frame holds follows the class without script: it inherits `--tanrei-app-shell-window-class`
(`@container style(--tanrei-app-shell-window-class: compact) { … }`).

**The widths are tokens, and a stylesheet cannot read a token in a media condition.** The source names them —
`@media (width >= token(comp.app-shell.breakpoint.expanded))` — and the build (`scripts/build.js`,
`scripts/conditions.js`) writes each token's resolved value, in rem, in its place: in the conditions and in the two
properties the element reads them back from, so its two `matchMedia` listeners and the layout cannot part. A shipped
system that moves a width gets `dist/systems/<id>.app-shell.css` (`@tanrei/web/systems/<id>.app-shell.css`) written
the same way; none of the three presets does. **A product layer that sets `sys.breakpoint.*` must have the stylesheet
written for it** (`writeConditions(source, declarations(layerCss, defaults))`); a debug build reports a frame whose
stylesheet and tokens disagree. `<tanrei-page-header>`'s wide width is written the same way.

**What the script adds** (and nothing a reader sees move):

- the class as a property, a state attribute and an event (above); no resize listener and no frame loop;
- **the menu button** — the one icon-only `<tanrei-button data-app-shell-menu>` in the header. The stylesheet shows it
  only while the navigation has no place in the layout; the element answers its press (`navigationOpen` and the drawer's
  `open` become true, the drawer takes focus), follows the drawer's `close` (false again, focus back on the button),
  and writes `aria-expanded` — and the drawer as what it controls — on the button it draws;
- **the scroll offset**: the header's height as `--tanrei-app-shell-scroll-offset` on `<html>`, measured again when it
  changes; the stylesheet sets the root's `scroll-padding-block-start` from it, so a link to a heading and a focused
  element rest below the header. The navigation bar's height is `--tanrei-app-shell-scroll-offset-end`. Your own sticky
  parts read the same properties. **Inside a frame leave `--tanrei-prose-scroll-offset` at 0.** Until the element is
  defined the offset is a small app bar's height;
- `role="banner"`, `contentinfo` or `complementary` on a region whose element is not a `<header>`, a `<footer>` or an
  `<aside>`; `aria-label` from `aside-label` on an aside without a name; `tabindex="-1"` on a `<main>` that lacks it;
- the skip link's move at once, whatever the page's `scroll-behavior`; without script the anchor does the same;
- debug reports: a navigation that is not a navigation drawer in a narrow window (APS-4), no main region or two, an
  aside without a name (APS-21), an unknown value (APS-29).

Good to know:

- **The navigation is a `<tanrei-navigation-drawer responsive>`.** It draws its own three presentations at the same
  two widths (its tokens and the frame's alias the same `sys.breakpoint.*`). Anything else in the region stands beside
  the content in an expanded window and is not shown in a narrower one.
- **The skip link's box is the anchor's `::after`**, drawn under its text only while the link has keyboard focus
  (`:focus-visible`); otherwise the link is clipped to nothing, never `display: none`. The Link keeps its color, its
  underline and its focus ring; its state container color is under the box and is not seen. These rules have an
  attribute's specificity (not none), because link.css says `position: relative` of the same anchor.
- **A sticky part stays inside the frame, not inside its row** (every engine): the navigation and the aside would run
  over the footer at the end of the page. The element measures the footer and the stylesheet takes that much off what
  they may reach; without script the footer is drawn over their end, on the frame's own fill.
- **Until the page is scrolled past an announcement or a static header**, the navigation and the aside are as tall as
  the window less the sticky header, so their last lines are below the window's bottom edge by what stands above them.
- **`scroll="main"` with a stacked aside** (compact, medium): the aside keeps its place above or below the scrolling
  `<main>`; it does not scroll with it.
- **A browser without style container queries** shows and hides the menu button, and draws the separation, by the
  element's word (`data-menu`, `data-separation`); without script it shows the button in every class.
- **A side sheet as the aside** (`<tanrei-side-sheet slot="aside">`) keeps its own width, edge and insets. Switch its
  `variant` from `windowclasschange`.
- **System insets** are `env(safe-area-inset-*)`: the main region, a stacked aside and the footer keep their content
  inside the start, end and bottom ones; the header, the drawer and the navigation bar inset themselves.
- **Print** draws the header, the main region, the aside and the footer in the flow, and neither navigation.
- Range media conditions (`width >= 64rem`): Chromium 104, Firefox 63, Safari 16.4. `dvh`: Chromium 108, Firefox 101,
  Safari 15.4 (`vh` before).

## `<tanrei-page-header>` (`page-header.css`)

`specs/page-header.spec.json` (PGH-1 to PGH-24): the head of a page's content — the page's title as its heading, with
a sentence that says what the page is, a line of facts, the page's actions and the way back up above it. In the
content, scrolling with it, laid out by its own width, and never a control.

The same form: an element with no shadow root around the page's own elements, and one stylesheet,
`@tanrei/web/page-header.css`, that draws everything before and without script. **The title is your own heading**:
the `h1` a crawler, a reader mode and a page without script find, never hidden, repeated or given another level.

```html
<link rel="stylesheet" href="@tanrei/web/page-header.css" />
<tanrei-page-header divider>
  <tanrei-breadcrumbs label="Breadcrumbs">…</tanrei-breadcrumbs>
  <p data-part="eyebrow">Announcements</p>
  <h1>Tokens are derived, and design systems are layers</h1>
  <p>One value changes in one place, and everything built on it follows.</p>
  <div data-part="meta">
    <time datetime="2026-09-20">20 September 2026</time>
    <span><tanrei-avatar size="small" decorative src="…"></tanrei-avatar> The Tanrei team</span>
    <span>4 min read</span>
  </div>
  <div data-part="actions"><tanrei-button variant="outlined">Edit</tanrei-button><tanrei-button>Share</tanrei-button></div>
</tanrei-page-header>
```

**Parts are found by what they are**, among the element's children, written in the order they are read (which is the
focus order at every width, PGH-11):

| Part | Markup |
|---|---|
| breadcrumbs | `tanrei-breadcrumbs`, or `[data-part="breadcrumbs"]` around a Link or your own trail |
| eyebrow | `[data-part="eyebrow"]`, written as ordinary words: the capitals are drawn |
| title | the heading, `h1` to `h6` (or `[data-part="title"]` for one that is not a heading, which a debug build reports) |
| description | the first `p` without a `data-part` (or `[data-part="description"]`) |
| meta | `[data-part="meta"]`; each element child is one item — a `time`, a `span`, a Link, a Tag, a list of tags |
| actions | `[data-part="actions"]` around your Buttons and Links |

| Attribute | Values | Default | |
|---|---|---|---|
| `size` | `small` \| `medium` \| `large` (open) | `medium` | the title's and the description's text styles and their spaces: a part of a page, a page, a landing page. Reflected |
| `actions-placement` | `end` \| `below` | `end` | beside the title at the end edge while the head is at least `comp.page-header.wide.container-width` (480) wide, and below the text while narrower; or below at every width. Reflected |
| `divider` | boolean | off | one hairline under the head. Reflected |
| `headline`, `description`, `eyebrow`, `level` | text, text, text, 0 to 6 | | **for a head built by script**: each writes its element where the children have none — the heading at `level`, or 1 (2 for `small`). A content page writes the elements |

Good to know:

- **The head is a size container** (`container-type: inline-size`): it follows its own width, never the window's, and
  takes that width from its layout — in a parent that shrinks to its content, give it one. The wide width is a token
  written into the container condition by the build, in rem, so it grows with the reader's text (see the app shell).
- **Beside the title the actions are a box one line of the title high**, in the title's first row, with their row
  centred in it: a Button taller than that line (a medium Button beside a `small` title) stands 4 above the head's top
  and stays centred on the line. Actions that wrap beside the title are centred on that line as a block.
- **A large head narrower than the wide width** draws the medium title and the medium space under it (PGH-12).
- **The dot between two meta items** is each item's `::before` (so an item is `position: relative`), and the row is
  cut short of the dot at its start edge (`clip-path`), which hides the dot of an item that begins a row. An item of
  text (`span`, `time`, `data`, `li`, `div`) that holds an element — an avatar, a glyph — centres it with its text;
  a Tag, a Link or any other component as an item is placed and not styled.
- **No tracking in scripts a tracked word falls apart in** (PGH-4): the title and the eyebrow take `letter-spacing: 0`
  under `:lang()` of Japanese, Chinese, Korean, Arabic, Persian, Urdu, Hindi and the like — set `lang`.
- **An empty head** (no element child) is `display: none`; one built by script appears when its parts are written.
- **A size a design system adds** gets its rules from the element, falling back to `medium`'s tokens.
- **In prose** the element is an island (PRS-16): prose's heading and paragraph rules do not reach its `h1` and `p`.
- `text-wrap: balance`: Chromium 114, Firefox 121, Safari 17.5 (lines break as usual before). Container queries:
  Chromium 105, Firefox 110, Safari 16.

## `<tanrei-avatar>` and `<tanrei-avatar-group>` (`avatar.css`)

`specs/avatar.spec.json` (AVT-1 to AVT-23): a person, or a team or a project, as a small picture — initials or a glyph
where there is no picture — in a circle or a rounded square of three sizes; several as one overlapping group that
counts the ones it does not draw. A picture, never a control: no hover, focus, press or event.

```html
<tanrei-avatar label="Ada Lovelace" initials="AL" src="/people/ada.jpg"></tanrei-avatar>
<p><tanrei-avatar decorative size="small" initials="AL" src="/people/ada.jpg"></tanrei-avatar> Ada Lovelace</p>
<tanrei-avatar label="Build service" shape="square"><span slot="icon">smart_toy</span></tanrei-avatar>
<a href="/people/ada"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar></a>
<tanrei-badge count="3" label="3 unread"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar></tanrei-badge>
<tanrei-avatar-group label="Reviewers" max="4" overflow-label="and 3 more">
  <tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar>
  …
</tanrei-avatar-group>
```

Two elements, each with a shadow root: an avatar has no content of its own to keep in the document but its glyph. The
spec's group form is the second element; its members are `<tanrei-avatar>` children, which stay in the document.

| `<tanrei-avatar>` | Type | Default | |
|---|---|---|---|
| `src` | string | `''` | the picture's address. Empty (or white space) asks for nothing |
| `label` | string | `''` | the name in full, not drawn: the accessible name while not `decorative` |
| `initials` | string | `''` | what is drawn where there is no picture: at most two characters, as written |
| `decorative` | boolean | `false` | hides it from assistive technology, beside the same name in text; reflected |
| `size` | `small` \| `medium` \| `large` | `medium` | 24, 40, 56 under the default system; reflected; open |
| `shape` | `circle` \| `square` | `circle` | a person, or what is not one person; reflected; open |
| `loading` | `eager` \| `lazy` | unset | HTML's `loading`, passed to the picture |
| `referrerpolicy` (`referrerPolicy`) | string | unset | HTML's `referrerpolicy`, passed to the picture as written. Unset, the page's own policy applies: the avatar chooses none |
| `crossorigin` (`crossOrigin`) | string | unset | HTML's `crossorigin`, passed to the picture as written |

| `<tanrei-avatar-group>` | Type | Default | |
|---|---|---|---|
| `label` | string | `''` | the group's name ("Reviewers") |
| `max` | number | `0` | the most boxes drawn, the overflow box included; 0 draws every member |
| `total` | number \| null | `null` | how many members there are, where fewer are given than exist |
| `overflow-label` (`overflowLabel`) | string | `''` | what is read for the overflow box ("and 3 more"); empty reads the drawn "+3" |
| `size`, `shape` | as the avatar's | | given to every member, and to the overflow box; reflected |

Slot `icon` (the avatar's): a glyph of the icon set, in an element. Parts: `container`, `image`, `label`, `icon` on
the avatar; `overflow` and `label` on the group. No events.

**What is drawn** (AVT-2): the picture once it has loaded, else the initials, else the glyph of the `icon` slot, else
the system's own glyph (`person` for a circle, `category` for a square). **The avatar never makes initials from
`label`**: which characters stand for a name depends on its writing system and its order. It draws the first two
characters of `initials` as a reader counts them — grapheme clusters, by `Intl.Segmenter` (code points where the
platform has none), so a letter with its marks, a syllable of Devanagari or a flag is never cut in half — as written,
and reports a longer value in debug builds.

**The picture** (AVT-3, AVT-4) is an `<img alt="" decoding="async" draggable="false">` in the shadow root, laid over
the whole box and out of the flow, `object-fit: cover`. Until it has loaded it has its box and draws nothing
(`visibility: hidden` — no broken-picture mark, no alternative text, and a `loading="lazy"` picture can still be asked
for when its box nears the window); the fallback is drawn under it at full size, so nothing changes place when the
picture arrives. It replaces the fallback once it can be painted (`decode()`), without a motion. On `error` the element
is removed, the fallback stays, the address is reported in debug builds and nothing asks again; setting `src` to
another address starts again from the fallback. `srcset` and `sizes` are not passed: give
`src` a picture of twice the box's side for dense screens.

**Named or decorative** (AVT-9): the host carries `role="img"` and `aria-label` while it is named, and
`aria-hidden="true"` while it is decorative or has no label (reported, unless decorative). Everything drawn is in an
`aria-hidden` box, so the initials, the glyph's name and the address are never read. Inside a link or a Button the
label is that element's name (AVT-8); a `<tanrei-badge>` around it adds its label as the avatar's description (AVT-12).

**The group** (AVT-16 to AVT-23) is `role="group"` with `aria-label`. It sets `size` and `shape` on every member it draws — a
member's own are overwritten — and a member is named whatever its `decorative` says. It draws the members it shows by
assigning them to its slot itself (`slotAssignment: 'manual'`): the ones past the limit, and any child that is not a
`<tanrei-avatar>`, are assigned nowhere, so they are neither drawn nor exposed, and nothing is written on them (this needs
`HTMLSlotElement.assign()`, which every current engine has; without it every member given would be drawn). The
overflow box is in the group's shadow root: "+3" (`aria-hidden` where `overflow-label` is read in its place, from a
visually hidden run inside the box), in the locale's digits (the nearest `lang`), "999+" above 999, one left-to-right
run. The gap around each box is a spread `box-shadow` in `--tanrei-comp-avatar-group-outline-color`: set that token
where a group stands on another surface. A group with no members is `display: none` (`:state(empty)`).

**Before the elements are defined**, `@tanrei/web/avatar.css` gives `tanrei-avatar:not(:defined)` the box of its
`size` and `shape` attributes in the container color and hides its children, and `tanrei-avatar-group:not(:defined)`
is the row of those boxes, so a page of avatars does not move when the script arrives. No picture, initials or name
show until then — a byline writes the name as text beside a decorative avatar. What the stylesheet cannot do: ease the
square's corners, know a size or a shape a design system added, or count — a group that will draw an overflow box
shows every member given until it is defined. A page that must not move gives a group the members it draws and the
rest as `total`.

**Enlarged text** (AVT-11): the box and the glyph are lengths of the size dial and do not grow with the text dial. The
initials' text role does; they are held to the glyph's box of the same size (`min(font-size, icon.size)`), so two
letters still stand inside the avatar. **Forced colors** (AVT-13): a
fallback gains a hairline edge in `CanvasText` inside its box; a picture is left alone. **Right to left**: a group
starts at the right; a picture and initials are never mirrored; a slotted glyph mirrors as the icon set says
(`data-mirror` decides for one use).

Not here: a color per person, presence, a press. An avatar that leads somewhere is inside a link — whose focus
indicator is a rectangle around the circle.

## `<tanrei-swatch>`

`specs/swatch.spec.json` (SWC-1 to SWC-19): a color shown as a sample with its name beside it — a small square or dot
of exactly that color, over a checkerboard where the color lets what is behind it through, edged so that a color close
to the surface still shows where it ends. A sample to look at, never a control and never a picker: no hover, focus,
press or event.

```html
<tanrei-swatch color="#0f766e" label="Teal 700" supporting-text="#0f766e"></tanrei-swatch>
<tanrei-swatch color="var(--tanrei-sys-color-primary)" label="Primary" size="small"></tanrei-swatch>
<tanrei-swatch color="#e11d48" label="Bug" shape="circle" size="small" label-hidden></tanrei-swatch>
<td><tanrei-swatch decorative size="small" color="#0f766e"></tanrei-swatch> #0f766e</td>
```

| `<tanrei-swatch>` | Type | Default | |
|---|---|---|---|
| `color` | string | `''` | the color: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` (the notation every platform reads), or any CSS color, a custom property included. Empty draws the edge alone |
| `label` | string | `''` | the color's name, drawn beside the sample and read; with `label-hidden`, the sample's accessible name |
| `supporting-text` (`supportingText`) | string | `''` | a line under the name: the value, a token, where it is used; with `label-hidden`, the accessible description |
| `label-hidden` (`labelHidden`) | boolean | `false` | draws the sample alone; reflected |
| `decorative` | boolean | `false` | draws the sample alone and hides the swatch, beside the same name in text; reflected |
| `size` | `small` \| `medium` \| `large` | `medium` | 16, 24, 32 under the default system; the text follows; reflected; open |
| `shape` | `square` \| `circle` | `square` | a tile or a dot; reflected; open |

Parts: `sample`, `label`, `supporting-text`. No slots, no events.

**The sample** (SWC-1 to SWC-5) is one `span` in the shadow root, `aria-hidden`, with the shared corner rule. Its
background is two layers: the color as a `linear-gradient` of one color, over a `conic-gradient` checkerboard tiled at
twice `--tanrei-comp-swatch-checkerboard-size` (the top-left square is `checkerboard-color` in every direction). An
opaque color covers the checkerboard; a translucent one shows it. The edge is an inset `box-shadow`, drawn over the
background, so a white sample on a white surface still has its outline. Nothing else is mixed in: no state, no opacity,
no change with the scheme — a product that wants the current scheme's color gives a role's custom property.

**The color** (SWC-6) is set as the sample's own custom property through the style API, so any CSS color resolves where
the swatch stands and nothing else can be written. A value `CSS.supports('color', …)` refuses is drawn as empty and
reported in debug builds. A custom property the page does not define resolves to nothing, and the sample is then drawn
as empty without a report: the element cannot tell.

**Named, hidden or decorative** (SWC-9 to SWC-12): with its text drawn the host has no role and its text is read where
it stands; with `label-hidden` the host is `role="img"` with `aria-label` (the label, else the supporting text) and
`aria-description` (the supporting text, where the label names it); decorative, or with neither text, the host is
`aria-hidden="true"` (the second is reported). Inside a link or a Button what it exposes is that element's content
(SWC-13). The color is never turned into words: a color's name is the product's.

**Layout** (SWC-7, SWC-8, SWC-15, SWC-17): the host is an inline flex row, the sample and the column of text centred on
each other, `gap` of the size between them, as wide as its content and no wider; a text wraps at word boundaries (and a
word longer than the line breaks), the sample stays whole. Each text is isolated in its own direction (`unicode-bidi:
plaintext`), so `#0f766e` keeps its order in a right-to-left layout. The sample does not grow with enlarged text; the
text does. **Forced colors** (SWC-16): the sample keeps `forced-color-adjust: none` (the color is content) and its edge
becomes `CanvasText`.

Not built: a swatch picker (a set of swatches of which one is chosen, with a value and the keys of a radio group or a
listbox), and a stylesheet that holds the swatch's box before the element is defined.

## `<tanrei-breadcrumbs>` (`breadcrumbs.css`)

`specs/breadcrumbs.spec.json` (BRC-1 to BRC-29): where a page sits in a hierarchy of pages — the levels above as links,
in order from the top, the page itself last. On the web it is **an element around your own anchors**, which stay in the
document: they are links before any script runs, and a crawler, a router that works on the page's anchors and a
router's own link component all find them.

```html
<link rel="stylesheet" href="@tanrei/web/tokens.css" />
<link rel="stylesheet" href="@tanrei/web/icons.css" />
<link rel="stylesheet" href="@tanrei/web/breadcrumbs.css" />

<tanrei-breadcrumbs label="Breadcrumbs" overflow-label="Show hidden levels">
  <a href="/" data-icon="home">Home</a>
  <a href="/components/">Components</a>
  <span aria-current="page">Button</span>
</tanrei-breadcrumbs>
```

| The spec's | On the web |
| --- | --- |
| `label` | the `label` attribute: the name of the navigation landmark. Required |
| `overflow` | `overflow="collapse"` (the default) or `"wrap"` |
| `overflowLabel` | `overflow-label`: the name of the overflow button. Required while `overflow` is `collapse` |
| `underline` | `underline="always"`, `"hover"` or `"never"`; without it (`auto`) the trail follows its token |
| a level with a destination | an `<a href>` child |
| a level without one | a `<span>` child (an anchor without `href` is the same) |
| `label` of a level | its text |
| `current` | `aria-current="page"` on the last child |
| `icon`, `iconOnly` | `data-icon="home"`, `data-icon-only` (the text stays the level's name) |
| `click` | the anchor's own `click`; cancel it and nothing is followed |

**Two parts.** `breadcrumbs.css` draws the levels in the document: the text style, the underline of a level that is a
link, its glyph, and every state of it. The element's shadow root holds what you did not write: the `<nav>` named by
`label`, the ordered list with one item for each level (each child is assigned to its item's slot by the element), the
separators and the overflow button with its menu. The element adds the stylesheet to the root it is connected to, so a
trail inside another component's shadow root is drawn too. Parts: `nav`, `list`, `separator`, `overflow-button`,
`overflow-icon`.

**Before the element is defined**, and with scripting off, the stylesheet draws the children as the wrap form: every
level, with the separators (they and a level's glyph wait for `icons.css`; their room is kept without it). A trail that
fits its width does not move when the element is defined. What only the element gives: the landmark and the list, the
folding, and the hit area extended to the minimum target.

**Folding (`overflow="collapse"`).** The trail is measured by its own width: every entry at its own width, in one
task. Levels go behind the overflow button from the one next to the first, only as many as the width asks for; then the
first; and the last label is cut only when the button and it alone do not fit. It is measured again when its width, a
level, the text size, a face that arrives, the design system or the direction changes — by observers; at rest it runs
nothing. A level taken out is not drawn and its anchor is still in the document (`document.links` holds the whole
trail).

**The menu.** The overflow button opens a `<tanrei-menu>` of the levels taken out. A row is a menu item with the
level's `href` (the menu's link item, MNU-53), so the address, a new tab and the browser's own menu are the row's. A
plain activation of a row — a click, Enter, Space — is handed to your own anchor as **one `click` on that anchor**,
which the browser then follows unless you cancelled it: a router's link component that listens on its anchor takes the
navigation exactly as it does in the trail. A click with a modifier key, a middle click, the context menu and a drag
are the browser's own, on the row's anchor: the level opens in another tab and the menu stays open (MNU-54). A level
without a destination is a disabled row, with no link in it.

**The underline (BRC-30).** When a level that is a link is underlined is a choice at three places
: `sys.behavior.link-underline` for every text link, `comp.breadcrumbs.underline.visibility` for the trail,
and the `underline` attribute for one trail. The token arrives as the choice's name (`always`, `hover`, `never`) and
`breadcrumbs.css` reads it on the element with a style container query; where the browser has none, the element reads
it when it renders (and again when the system is switched on the page's root) and writes `data-tanrei-underline` on
itself. The attribute is read by the stylesheet alone, so a trail set to `never` shows no line before the element is
defined either. `hover` draws the line while a level is hovered, focused from the keyboard or pressed; the line takes
no room. The current page is never underlined, nor is a row of the overflow menu. Forced colors draw the line at rest
whatever was chosen (BRC-24). Without the script and without style queries, `auto` is `always`.

**The width it asks for.** In a block layout the trail is as wide as its container. Where a layout gives it the width
of its content (an item of a flex row, an inline block), it asks for the width of the whole trail on one line and for
no least width, so it folds when the row is narrower and unfolds when there is room again.

**What this element does not draw as the spec says**:

- A label that wraps (under `wrap`, longer than a line) is one box: the focus ring is around the box, not around its
  part of each line (BRC-17).
- A level with a glyph is laid out in the layout's direction, so that the glyph stands at the layout's start: its label
  is isolated, but does not take the direction of its first strong character, and is cut at the layout's end (BRC-28).
- Along the trail a hit area reaches halfway to the entry beside it whatever the level's own width, so that a press
  on a separator always reaches the nearer neighbour (BRC-23's verify); at the trail's two ends it ends with the level,
  so a level narrower than the target is not extended there.
- A level marked current that is not the last is drawn as any other level and keeps the `aria-current` you wrote
  (BRC-4).
- Without `icons.css`, a level's glyph is not drawn (its room is kept).
- Before the element is defined a level takes presses on its own box only, and a separator is its `::after`, hidden
  from assistive technology by the alternative text of `content` where the browser has it.

## Pagination (`<tanrei-pagination>`)

`specs/pagination.spec.json` (PGN-1 to PGN-24): moves through the numbered pages of one list (search results, the
posts of a blog, the rows of a table). It draws a row of page numbers with the current page marked. The pages that do
not fit are left out behind an ellipsis. Previous and next stand on either side, with first and last where you ask for
them. A short form says which page of how many. For the page before and after in a sequence of titled pages, use the
previous and next links (below) instead.

```html
<tanrei-pagination label="Pages" page="3" count="10" previous-label="Previous page" next-label="Next page" page-label="Page {page}"></tanrei-pagination>

<!-- Pages with addresses of their own: every page and control is a link. -->
<tanrei-pagination label="Search results pages" page="3" count="12" href="/results/?page={page}" previous-label="Previous page" next-label="Next page" page-label="Page {page}"></tanrei-pagination>
```

```js
import '@tanrei/web/components/pagination';
pagination.addEventListener('change', (event) => {
  // event.detail.page: the page asked for. Fired before the page changes and before a link is followed.
  // event.preventDefault() keeps the page and follows nothing: your router takes it from here.
});
```

| The spec's | On the web |
| --- | --- |
| `label` | `label`: the name of the navigation landmark. Required |
| `page` | `page` (from 1). The element sets it itself after an uncancelled `change` |
| `count` | `count`. Below 1, or a value that is not a number, draws nothing and takes no room |
| `siblings`, `boundaries` | `siblings`, `boundaries` (both 1 by default) |
| `variant` | `variant="numbered"` (the default) or `"compact"` |
| `size` | `size="medium"` (the default) or `"small"`, or a size your design system adds |
| `firstLast` | `first-last` |
| `href` | `href`, with the place `{page}` |
| `previousLabel`, `nextLabel`, `firstLabel`, `lastLabel` | `previous-label`, `next-label`, `first-label`, `last-label`; words `previousPageLabel`, `nextPageLabel`, `firstPageLabel`, `lastPageLabel` |
| `pageLabel` | `page-label`, with the place `{page}`; word `pageLabel` |
| `countText` | `count-text`, with the places `{page}` and `{count}`; word `pageCountText` |
| `change` | `change`: a cancelable `CustomEvent`, `detail: { page }` |

React: `import { Pagination } from '@tanrei/react'` and `<Pagination … onChange={(e) => setPage(e.detail.page)} />`.

**What it draws.** The shadow root holds a `<nav>` named by `label` around one `<ol>`. Its items are, in order: first,
previous, the pages and ellipses, next and last. In the compact form, the sentence takes the place of the pages. The
current page carries `aria-current="page"` and the current tokens' fill. The arrows are the icon set's `first_page`,
`chevron_left`, `chevron_right` and `last_page`. They are hidden from assistive technology and mirrored in a
right-to-left layout where the icon set marks them. The controls are icon-only and named by their labels. A page is
named by `page-label` with its number filled in, and by its number alone where no label is given. The numbers are
drawn in the digits of the language of the nearest `lang` (`Intl.NumberFormat`), in figures of one width. Parts:
`nav`, `list`, `item` (with `current` or `control`), `label`, `icon`, `ellipsis`, `count`.

**Which pages are shown (PGN-2).** The same algorithm as MUI's `usePagination`. The row always shows the first and
last `boundaries` pages, and the current page with `siblings` pages on each side of it. Every other run of pages becomes
an ellipsis, except one that would stand for a single page: that page is shown instead. Near an end, the row shows more
pages on the far side. So whenever `count` is large enough, the row holds 2 × boundaries + 2 × siblings + 3 places on
every page, and its width stays put.

**Links or buttons.** Give `href`, with the place `{page}`, when each page has an address of its own: a page someone
can bookmark, share or open in a tab. Every page and every enabled control is then the browser's own `<a href>`, with
`{page}` filled in Western digits whatever the language. Previous carries `rel="prev"` and next `rel="next"`. Middle
clicks, modified clicks, the context menu and the status bar all stay the browser's. Leave `href` empty when the list
changes page in place (the rows of a table, a dialog's list): the items are then `<button>`s. An `href` without
`{page}`, or one that runs a script, draws buttons, and a debug build reports it. Enter activates both forms. Space
activates a button; on a link it scrolls the page, as on any link. A disabled control is a disabled `<button>`, or an
`<a>` without `href` that carries `role="link"` and `aria-disabled="true"`. It stays in its place and is not a Tab stop.

**`change`.** It fires once for each page asked for. The current page fires nothing. For a link, the page is taken
after the browser has read the address, so a link to the same document (`#page={page}`) updates the element too, and
a link to another page leaves this one as usual. Once a page has been activated, focus is on the page now current, or
stays on the control that was activated while that control is enabled. When a control becomes disabled (next on the
last page), focus moves to the current page; in the compact form, which draws no pages, it moves to the nearest
enabled control. The element takes no arrow key: each enabled item is one Tab stop.

**The compact form and the narrow fallback (PGN-11).** `variant="compact"` draws the controls and the sentence (`Page
3 of 10`). The sentence is text: not a control and not a live region, so tell the reader of the change where the
content changes. Where no sentence is given, the two numbers are drawn with a slash between them (`3 / 10`), and a
debug build reports it. `variant="numbered"` draws the compact form whenever its row is wider than the width the layout
gives it. It decides this by its own width, never the window's. The element keeps a copy of its numbered row in its
layout, at no height, clipped and unseen. A layout that sizes it by its content (a flex item, an inline block, a grid
`auto` track) therefore gives it the width of that row, and asks for no least width. A ResizeObserver compares the row
with the element's width, so the numbers return when the room comes back, and when enlarged text no longer fits, the
compact form is drawn. The element is `display: block` by default, as wide as its container.

**What differs on the web**:

- The current page fills its item from the current tokens. A page change draws the new row at once, with no
  transition, and every other change of state takes the state motion.
- Along the row, a hit area reaches toward each neighbour by half the gap at most, so the hit areas never overlap. At
  the row's two ends it reaches the whole target. With the touch target of the default system (48) and the gap (4), a
  small item's hit area is the full target high but only 4 wider than the item.
- Until the icon font can draw an arrow, its box keeps its room and shows nothing.
- The narrow fallback keeps a second, unseen copy of the row in the shadow root. It is `inert` and `aria-hidden`.

## `<tanrei-tree-view>` (`tree-view.css`)

`specs/tree-view.spec.json` (TRV-1 to TRV-42): a hierarchy of items that open and close — rows that begin further in
at each level, a chevron at the start of every row that holds others; read and opened only, or with one item or
several chosen; one stop in the focus order, moved through with the arrow keys of the tree pattern.

The same form: an element with no shadow root around **your own nested lists**, and one stylesheet,
`@tanrei/web/tree-view.css`, that draws everything before the script runs. Where script does not run the page shows
the whole hierarchy as the nested list it is, every level shown and no chevron drawn.

```html
<link rel="stylesheet" href="@tanrei/web/icons.css" />
<link rel="stylesheet" href="@tanrei/web/tree-view.css" />
<tanrei-tree-view label="Project files" selection="single" value="src/index.ts" density="compact" guides>
  <ul>
    <li data-value="src" data-open>
      <span>
        <span class="tanrei-icon" aria-hidden="true">folder</span>
        <bdi>src<small data-supporting-text>what is published</small></bdi>
        <span data-trailing><tanrei-tag>new</tanrei-tag></span>
        <span data-trailing-text>12 files</span>
      </span>
      <ul>
        <li data-value="src/index.ts"><span><bdi>index.ts</bdi></span></li>
      </ul>
    </li>
    <li data-value="node_modules" data-expandable><span><bdi>node_modules</bdi></span></li>
  </ul>
</tanrei-tree-view>
```

| Attribute / property | Values | Default | |
| --- | --- | --- | --- |
| `label` | text | `''` | the tree's accessible name; required |
| `selection` | `none` \| `single` \| `multiple` | `none` | whether items are chosen |
| `value` | text \| `null` | `null` | the chosen item's `data-value` (single); set by the tree at a choice, with `change` |
| `values` | a JSON array (attribute), `string[]` (property) | `[]` | the chosen items' values (multiple) |
| `density` | `regular` \| `compact` (a design system may add values) | `regular` | 48 rows with the body text, or 32 rows with the small one |
| `guides` | boolean | off | a hairline down from each open parent beside the rows it holds |
| `loading-label` / `loadingLabel` | text | `''` | the words of a loading row |

**An item** is an `<li>`; its first child element is its **row** (a `<span>` or a `<div>`) and a `<ul>` after the row
holds its items. On the `<li>`: `data-value`, `data-open` (the element sets and removes it when the user opens or
closes the parent), `data-expandable` (it will hold items: give them at `toggle`), `data-loading`, `data-disabled`.
In the row: a `.tanrei-icon` (the icon), **the label in one element — a `<bdi>`** — with an element marked
`data-supporting-text` after the label's text inside it, an element marked `data-trailing` (your own content, placed
and not styled) and one marked `data-trailing-text`. The label may also be the row's own text, with no element
around it; that form has two limits a stylesheet cannot lift: a supporting text beside it is set apart by the space you
wrote and not by the row's gap, and in Firefox a name whose direction is not the layout's is not laid out in its own
(an unnamed box does not take `unicode-bidi: plaintext` there). So write the `<bdi>`. Inside that `<bdi>` a supporting
text goes on at the end of the NAME's direction (a left-to-right file name in a right-to-left tree has its note at its
right); where the note must stand on the layout's side whatever the name's direction, the label's element is a
`<span>` and the name has a `<bdi>` of its own in it: `<span><bdi>tokens/</bdi><small data-supporting-text>…</small></span>`.

Events: `change` on the tree (`detail.value` or `detail.values`, after the change; only for the user's choice) and
`toggle` on the `<li>` (bubbles; `detail.open`; for the user's act and for the browser's find-in-page, not for a
`data-open` you write).

What the element settles that the spec left to it:

- **The row is the tree item.** `role="treeitem"`, `tabindex`, `aria-selected`, `aria-expanded`, `aria-disabled`,
  `aria-busy` and the focus are on the row; the `<li>` is `role="none"` and a nested list `role="group"`, so the level
  comes from the nesting. An `<li>` holds every row under it, and an engine told that an `<li>` changed goes through
  them all: with the states on the `<li>`, an arrow key onto an open parent of 100 rows styled 709 elements again; on
  the row it styles 12. A server that draws the selection in the first frame writes `aria-selected="true"` on the row.
- **Only the rows that are shown are read.** A closed parent's items get their roles when it first opens, so a tree
  costs what it shows. A closed list is `hidden="until-found"` where the browser has it (find-in-page opens the
  parents, TRV-14) and `display: none` elsewhere.
- **The height motion is one Web Animations run** on the list (`block-size` between nothing and its measured size,
  clipped), in every engine; the time and the curve are the tokens', read from the list's own `transition`. A change
  on the way goes on from where the height is.
- **The loading row** is an `<li data-tanrei-loading>` the element appends to the parent's list (to a list of its own
  where the parent has none yet), so it is revealed, hidden and run beside by the guide with the rows. It is kept from
  assistive technology whole — a tree may hold tree items alone — and the parent is `aria-busy`.
- **The trailing text** takes at most half of the width the chevron and the icon leave (not half of the row's inner
  width), so the label keeps as much as it takes however narrow the row.
- **The stylesheet is not added twice.** The element adds `tree-view.css` to its root only where that root does not
  draw the tree yet; a second copy made the browser style every row again.

A tree of 5,050 items (`tree-view.perf.test.ts`, Chromium, every stylesheet of the package and a `:has()` of the
product's on the root; the engine's own counters): defined with every row shown, 11 ms of script and about two and a
half times the style time of the lists alone (470 ms against 190) (the roles and `aria-selected="false"` the element writes on every row
style each row once more); defined with 150 rows shown, the cost of those 150; one parent of 100 rows opened, 702
elements; one arrow key, 12; one choice, 18. What moves no row but its own is held by that test.

Fallbacks: without `round()` the deepest level of a narrow tree begins at half of the width, not at the last whole
indent before it; without `corner-shape` the corners are circular; without style queries the focus style is read when
focus arrives; without `hidden="until-found"` closed rows are not found by find-in-page.

## `<tanrei-skeleton>` (`skeleton.css`, `class="tanrei-skeleton-placeholder"`)

`specs/skeleton.spec.json` (SKL-1 to SKL-26): what stands where content will be while it loads — quiet placeholders in
the shape of what is coming, which keep the box the content will take, in a region that says once that it is busy. A
short wait with no shape to hold is a `<tanrei-loading-indicator>`, a wait that can be measured a
`<tanrei-progress-indicator>`, and a place where nothing will come a `<tanrei-empty-state>`.

```html
<link rel="stylesheet" href="@tanrei/web/skeleton.css" />

<tanrei-skeleton label="Loading the author">
  <div class="byline">
    <span class="tanrei-skeleton-placeholder" data-shape="circle" style="block-size: 40px"></span>
    <div>
      <p><span class="tanrei-skeleton-placeholder" style="inline-size: 10rem"></span></p>
      <p><span class="tanrei-skeleton-placeholder" data-lines="2"></span></p>
    </div>
  </div>
</tanrei-skeleton>
```

The element has **no shadow root**, and a placeholder is the product's own empty element — a `<span>`, or a
`<div>` where it is a block's child — with a class. **The stylesheet is the whole component before any script**: a
skeleton is what a page shows before its script has run, so the shapes, the show delay, the pulse, stillness under
reduced motion and the outlines of forced colors are all `skeleton.css`, with selectors of no specificity that start
at the element's name or at the class. The element carries the same text and adds it to the root it is connected to
(a product's shadow root too), unless that root draws it already.

| The spec's | On the web |
| --- | --- |
| `label` | the `label` attribute; empty, the product's words (`setWords({ loadingLabel: … })`). Never drawn. |
| `decorative` | the `decorative` attribute. |
| `showDelay` | the `show-delay` attribute, in milliseconds. `show-delay="0"` is read by the stylesheet; any other number is the element's (before it is defined the token's delay runs, and what is left of the number is counted on from there). |
| a placeholder's `shape` | `data-shape="text"` (the default, and what a missing or unknown value draws), `block` or `circle`. |
| `lines` | `data-lines`. The stylesheet reads 1 to 24; the element writes the rule of any other value (more lines, or a value that is not a whole number of at least 1). |
| `inlineSize`, `blockSize` | the CSS properties `inline-size` and `block-size`, in the element's `style` or by a rule of yours: a number of the spec is that many CSS pixels; any other length, a percentage, a share of a row or an `aspect-ratio` is a size your layout gives. |

**The box (SKL-1, SKL-6).** The skeleton is a plain block with no padding, edge or fill: what stands in it is laid out
as it would be without it, margins collapsing through it, so the box it holds is the box the content takes — the test
swaps real content of the same style in and reads a shift of zero. Two placeholders that are both its own children
are `container.gap` apart (a margin); everything else is your layout. It is the same box from insertion, through the
delay, to removal, measured in every frame.

**Text (SKL-3).** A text placeholder is one element `data-lines` × `1lh` high in the inherited `font`, so it goes where
the text will be: in the heading, the paragraph, the cell. Its height is `!important` — the one in the sheet — because
it is its lines and nothing else. **The bars are drawn from CSS alone, with real corners, in three engines**: the
first bar is the placeholder's `::before` and the last of two or more its `::after` (shorter, from the start edge), each
`1em` high with the text shape's `border-radius`; every bar between them is a `box-shadow` of the first, one line box
further down — a shadow has the box's size and corners and is drawn once, so a translucent fill stays even (a shadow
that is not needed stands under the bar, where none is drawn). Measured from the pixels in Chromium, Firefox and
WebKit: three lines of the body style are bars 14 high and 8 apart, the third 180 of 300 long. No child element is
written, so the box and the look are the same before the element is defined.

**Block and circle (SKL-4, SKL-5).** Each has a strut — a `::before` one line box long, never painted — that gives it
its size where nothing else does and yields to a size that is given or that a layout gives (a stretched cell, a
ratio). A circle is `aspect-ratio: 1` and `inline-size: fit-content`, so one size is both and a place narrower than
its side makes it smaller and keeps it square. Not covered: a circle whose side is written as `block-size` in a place
narrower than that keeps the height it was given — CSS cannot take a height back — and is drawn as the circle that
fits in the box (`clip-path`), never as an oval; write the side as `inline-size` where that can happen.

**The show delay (SKL-7 to SKL-11).** Before the element is defined it is an animation: `tanrei-skeleton-wait` holds
`visibility: hidden` for `motion.show-delay`, so the box is kept and nothing is drawn or exposed (a role the page
wrote itself is hidden with it), and the pulse begins when it ends. Once defined, the element counts the delay itself
(`data-clocked`, `data-waiting`), so that it is also counted in a view that is not rendered and ends at one moment for
what is drawn and what is exposed. A skeleton the stylesheet is still holding back is counted on from where its
animation is; one it has already shown is left exactly as it is — the test compares every box and every running
animation before and after the definition. Not covered without the script: a skeleton in a `display: none` view
starts its delay when the view is shown, since a browser runs no animation there.

**The manner (SKL-12 to SKL-14).** `pulse` is an animation of each placeholder's `opacity` alone, which a browser runs
without layout and without a frame of script (`src/idle.test.ts`). The element keeps placeholders in step: one that is
added later is given the others' start time. `none` is read by a style query, and where a browser has none the element
writes `data-animation`. `wave` has to be measured, so it is the element's: it writes the skeleton's width
(`--_skl-wave-size`) and each placeholder's distance from the skeleton's left edge (`--_skl-wave-offset`), and one mask
as wide as the skeleton, placed in each placeholder where the skeleton's edge is, moves by one width a pulse — from the
right in a right-to-left layout. **Before the element is defined, and where script never runs, a wave is drawn as a
pulse.** Not covered: the band's fall and return are straight (a mask is a gradient, and a gradient cannot take
`motion.dim-easing`); the depth, the length and the direction are the tokens'. Reduced motion draws every manner
still and keeps the delay; out of view the animation is held (`data-paused`).

**Forced colors (SKL-20).** No fill and no animation; a block and a circle are an `outline` inside their box and each
bar of a text placeholder a `border`, one hairline in `CanvasText`. A shadow is not drawn in this mode, and a copy of a
filled box would be a filled bar, so the lines between the first and the last are copies of the first bar's outline
(`filter: drop-shadow()`, five of them, each doubling what is there): up to 32 lines. Their step is a whole number of
pixels where the browser can round, so two copies of one line are one line.

**What the element adds (SKL-15 to SKL-19, SKL-24 to SKL-26).** When the delay ends: `role="progressbar"`,
`aria-busy="true"` and `aria-label`; `aria-hidden="true"` instead while `decorative` or inside another skeleton. An
attribute of those the page wrote itself is left as it is found. Every child of the skeleton is made `inert` — the
children and not the skeleton, because an inert element is itself kept from assistive technology, and Chromium exposes
what stands in a progressbar. A skeleton that holds no placeholder is `display: none` (the stylesheet's) and exposes
nothing. Debug builds report a `showDelay` that is no time, a shape, a `data-lines` or a size that is ignored, a
manner the tokens name that the skeleton does not know, a skeleton with no placeholder, and — once for the page — a
skeleton with no name.

Where script never runs a skeleton never ends unless the server replaces it: content that arrives only by script
needs a `<noscript>` beside its skeleton. In React, `Skeleton` of `@tanrei/react` renders the element around its
children; the placeholders are the same elements with the same class.

## Link (`link.css`, `class="tanrei-link"`)

`specs/link.spec.json` (LNK-1 to LNK-35): text that leads somewhere — a phrase in a sentence, a line by
itself, a glyph alone — in the text style of where it sits, underlined as the design system chooses (at rest, in the
default system) and marked where it leaves the site. On the web it is **a class on your own anchor**,
not an element: the anchor is in the document, so it is a link before any script runs and for whatever reads the page
as built (a crawler, a search index, a router that works on the page's anchors, a router's own link component, which
takes the class). It is not in `custom-elements.json`.

```html
<a class="tanrei-link" href="/guides/">the guides</a>
<a class="tanrei-link" data-standalone href="/start/">Getting started</a>
<a class="tanrei-link" href="https://example.com/" target="_blank" aria-description="opens in a new tab">the source</a>
<a class="tanrei-link" data-standalone href="/tokens.zip"><span class="tanrei-icon" aria-hidden="true">download</span>Download</a>
<a class="tanrei-link" data-standalone data-icon-position="trailing" href="/next/">Next<span class="tanrei-icon" aria-hidden="true">arrow_forward</span></a>
<a class="tanrei-link" href="#install" aria-label="Link to Installation"><span class="tanrei-icon" aria-hidden="true">link</span></a>
<a class="tanrei-link" data-standalone href="/components/" aria-current="page">Components</a>
<a class="tanrei-link" data-standalone role="link" aria-disabled="true">Previous page</a>
<a class="tanrei-link" data-variant="inverse" href="/changes/">what changed</a>
<a class="tanrei-link" data-standalone data-underline="hover" href="/about/">About</a>
<a class="tanrei-link" href="https://example.com/" data-external="true" aria-description="external link">the standard</a>
<a class="tanrei-link" href="https://example.com/" data-external="true" aria-description="external link"><img
  class="tanrei-link-site-icon" src="/icons/3f9a….png" alt="" width="32" height="32" loading="lazy" decoding="async"
  referrerpolicy="no-referrer">the standard</a>
```

| Spec prop | On the anchor |
|---|---|
| `href` | `href`. Without one — or with an empty one, a `javascript:` one, or one the URL parser rejects — the anchor is not a link: it is drawn as the text around it (LNK-21). |
| `target: new` | `target="_blank"` (HTML's spelling; any other value but `_self` is taken off and reported). The mark `open_in_new` is drawn after the label, unless your glyph stands at the trailing side or the link is a glyph alone — whether or not the link is external, and then no arrow. |
| `targetLabel` | `aria-description`. Tanrei ships no words. |
| `underline` | `data-underline="always \| hover \| never"`; without it (or with any other value) the link follows `--tanrei-comp-link-underline-visibility`. |
| `external: on`, `off` | `data-external="true"` (or the bare attribute), `data-external="false"`. Without the attribute the address decides (`auto`): the script writes `data-external="detected"`, see below. Any other value is taken off by the script and reported. |
| `externalLabel` | `aria-description`, while `target` is not `_blank` (a link has one description: for a new context it is `targetLabel`'s). Where the anchor has none, the words set once for the page are written (`setExternalLabel()`, or `externalLabel` of the build step). Tanrei ships no words. |
| `siteIcon` | your own `<img class="tanrei-link-site-icon" src="…" alt="" width="…" height="…" loading="lazy" decoding="async" referrerpolicy="no-referrer">`, **the anchor's first child, written against the label's text**. |
| `variant: inverse` | `data-variant="inverse"`, on `sys.color.inverse-surface` only. An unknown value is the default. |
| `standalone` | `data-standalone`: the hit area reaches `sys.target.pointer` (`sys.target.touch` for a coarse pointer) on both axes, and nothing a person sees changes. |
| `iconPosition: trailing` | `data-icon-position="trailing"`, with the `.tanrei-icon` written after the text. |
| `current` | `aria-current` (any value but `false`): no underline, the emphasized weight (`--tanrei-text-emphasized-weight`, which `text.css` and `prose.css` set for the text they style; `bolder` where nothing sets it). |
| `disabled` | `role="link" aria-disabled="true"` and **no `href`**. |
| `label` | `aria-label`, with a `.tanrei-icon` as the only content: that pair is what draws the glyph-alone form. |

`rel` and `download` are the anchor's own. The glyph is a `.tanrei-icon` (`icons.css`) **written against the label's
text, with no white space between them** (a space there is drawn, and widens the gap). The mark and a glyph need
`icons.css`; where it is not loaded the mark is not drawn and takes no room.

**The stylesheet alone** draws the whole look and every state, including the press: `:active` is the overlay, held for
`sys.motion.duration.press-hold`. **The script** — `@tanrei/web` loads it; `@tanrei/web/link` is the script alone;
`observeLinks(root)` for a shadow root of your own — adds, through listeners on the document, what a stylesheet
cannot: the shared press primitive (`data-pressed`: overlay, ripple, dim, none — on pointer down and Enter, never
Space), `noopener` on a link that opens a new context, the refusals of LNK-21 (the address is taken off the anchor, so
it has no role and takes no focus), `data-focus-style` where the browser has no style queries, a disabled link that
still carries an address opening nothing, what leaves the site and the words for it (below), and the debug reports
(LNK-13, LNK-15, LNK-19, LNK-21, LNK-29, LNK-32, LNK-34, LNK-35). It follows no link: Enter, a modified click, the
context menu and the status bar are the browser's. It asks for nothing either: it derives no address from an `href`
and makes no request (LNK-35).

**When the underline is drawn** (LNK-27, LNK-28) is a choice at three levels, and a fourth the web gives
for free:

| Level | Where | |
|---|---|---|
| the design system, or your layer | `--tanrei-sys-behavior-link-underline` | every text link: the Link, prose's links, the levels of a breadcrumb trail |
| the Link | `--tanrei-comp-link-underline-visibility` (it follows the system's) | sets the Link apart from the trail |
| a region | the same custom property on any element — a footer, a list of navigation | every link inside it, with no attribute on each |
| one link | `data-underline` | wins over all three |

`always` (the default system's, and the fallback) draws the line at rest and in every state; `hover` draws it while
the link is hovered — under `(hover: hover)`: a touch screen has no hover, so there `hover` looks like `never` but for
the length of a press —, focused from the keyboard (with the focus ring) or pressed; `never` draws none, and hover,
focus and press are still shown by the container, the label color and the ring. The line is never taken away: its
color is transparent where the choice hides it, so it arrives over the state's motion and no text moves. The current
link and a glyph alone have no line under any choice; **forced colors draw it under every choice** (LNK-22).
Use `hover` and `never` on links that stand by themselves. Inside a sentence a link that is not underlined at rest
must stand 3:1 apart from the text beside it: the build holds that for the system's and the component's choice, and
for one link set apart a debug build reports it (LNK-29) — in the default system the link color is the text color,
1.00:1.

**A link that leaves the site** (LNK-30 to LNK-35) shows an arrow (`arrow_outward`) after its label and, where you
give one, the site's picture before it, and says so in words. The stylesheet computes nothing about an address: it
draws the marks for `data-external` that is not `false`. Who writes the attribute:

1. **Where the page is made** — the build step of `@tanrei/web/links` (`markExternalLinks()`, from your `site`
   origins), or your own templates. The marks are in the first paint.
2. **The script**, for an anchor that carries no `data-external`: an `http` or `https` address whose origin is not
   the page's and not one given to `setSiteOrigins([…])`, on an anchor without `download`, is marked
   `data-external="detected"`. It is read again when `href` changes, and only a value the script wrote is ever
   changed by it. These marks arrive **after the first paint and take room**: each moves what follows it on its line
   by the text's size and the gap (18 px in the default system's body text). A page with neither shows no external
   mark — a missing mark, never a wrong one.

```js
import { setSiteOrigins, setExternalLabel } from '@tanrei/web/link';
setSiteOrigins(['https://docs.example.com', '*.example-cdn.com']); // an origin, a host, or a host with *. for its subdomains
setExternalLabel('external link');                                 // in your language; written where an anchor has no aria-description
// The same words are the key `externalLabel` of the product's words: setWords({ externalLabel: 'external link' }, { lang: 'en' })
```

A site of several origins declares them in both places — `site` of the build step and `setSiteOrigins()` — or the
script marks the links between them that the build left alone. With no words on the link and none set for the page,
nothing is said, and a debug build reports it once for the page (LNK-34).

The arrow shares its place with the mark of a new context — one pseudo-element, so never both — and gives way to your
own trailing glyph. The picture gives way to your own leading glyph, is not drawn on a link that is not external, and
is decoration: `alt=""`, no role, never the only mark. Its box is the text's font size square, the whole picture
fitted inside with the corners of `comp.link.site-icon.shape`; its room is the anchor's, so nothing moves when it
arrives, and one that cannot be loaded leaves the room empty (the script marks it `data-failed` and hides it; without
the script Chromium draws nothing for a broken picture whose `alt` is empty, and Firefox and WebKit draw their own
outline of a broken picture, which no stylesheet can name). It is an `<img>` and nothing else, so
a vector file is drawn and never run. **The link never fetches a picture**: give one your site serves itself
(`resolveSiteIcons()` of `@tanrei/web/links` makes them when the site is built) or a `data:` URL; a debug build
reports a picture of another origin, and one without `referrerpolicy="no-referrer"`, which the script then writes
(the first request may already have left). `--tanrei-comp-link-external-marks` — `all` (the default), `arrow` (no
picture and no room for one), `none` (neither, and the script writes no words) — turns the marks off for the product
or for a region; `data-external="false"` for one link.

**In prose** every anchor that is prose's own is drawn by the same rules with no class (`prose.css` carries them — the
build writes the rules of `link.css` under prose's anchors, so the two cannot differ), and `.tanrei-prose-anchor` is
the glyph-alone form. So a link written in Markdown follows the underline choice, takes `data-underline`, and is
marked external by `data-external` and the `<img class="tanrei-link-site-icon">` your content pipeline writes
(`markExternalLinks()`), or by the script; prose decides nothing about a link (PRS-17), and its rule for pictures
leaves the site's picture to the link.

What the web draws differently, and what a browser cannot do:

- **The container** is the inline box of the link's text — the font's own ascent and descent (17 for the 14/22 body
  text) — not the line's height: CSS cannot size an inline box's background to its line without knowing the font's
  metrics. LNK-17's "22 high" is the line; the container is the text's box inside it.
- **Per line.** A link with no glyph and no mark has its container, with all four corners, and its ring on every line
  (`box-decoration-break: clone`). A link that keeps room for a glyph or the mark is one box cut at the line ends
  (`slice`): the room is padding at one end of the link, which cloning would repeat on every line. The focus ring is
  the anchor's `outline`, which each engine draws for the link's parts line by line (Chromium joins them into one
  contour that follows each line's extent).
- **The inner focus stroke** (`sys.focus.inner-width`, 0 in the default system) is drawn from the container out to
  the outer stroke: an inline box has no second ring to draw it with.
- **A glyph, the picture and the mark** are placed out of the line, in room the anchor keeps (so no line break parts
  them from the word beside them, and no underline runs under them), from where the text's own order puts them. A
  standalone link takes the direction of its label's first strong character (LNK-26) through `dir`, which the script
  writes from that character where the page gave the anchor none; without the script, a standalone link with a glyph, the mark
  or the marks of an external link lays its label out in the layout's direction (`unicode-bidi: isolate`), and one
  without any of them by its own first strong character (`plaintext`).
  In a right-to-left layout they stand at the edge of the link's own box instead (the browsers do not agree on the
  place an out-of-line element would have had there). At the link's start — a leading glyph, the picture — that edge
  is where every engine says it is. At its end — a trailing glyph, the mark — it is not, for a link that begins late
  on a line and ends early on a later one (CSS gives the box of such a link a width below nothing; Blink and Gecko
  give it none, and the glyph was drawn where the link's first line began, apart from its label). No one rule is
  right in the three engines, so `link.css` gives each its own: WebKit the edge of the box, which it keeps as CSS
  defines it; Blink (`@supports (-webkit-app-region: none)`) the place the glyph would have had in the line; Gecko
  (`@supports (-moz-appearance: none)`) the glyph IN the line, taking no room, where it parts no word from what
  follows it. A browser that is none of the three has the first. The glyph is then beside the last line of the
  label at every width, in either direction of the layout and whatever the direction of the label's own words. The
  link's own direction says which side that is (LNK-14): a standalone link's label's, and a phrase's in a sentence
  the sentence's — unless the page marked the phrase with a `dir` of its own. So a left-to-right standalone label in
  a right-to-left paragraph has its glyphs at the ends of its own words (its mark at the right of its last line,
  unmirrored), placed from the edges of the link in WebKit and Gecko and where it would have stood in Blink; a
  left-to-right phrase in a right-to-left sentence, not marked, has its mark at the left of its last line. In Gecko the label must not end in white space
  inside the anchor (`…Group </a>`): a line could then break before the glyph.
- **Ripple** (LNK-9's fallback): a link that runs over several lines has no one box to grow a ripple in and answers
  with the overlay. Without the script every press is the overlay.
- **The hit area** of a standalone link that wraps is extended above its first line and below its last, over the box
  from its start to the end of its last line.
- **Text size.** The underline's offset and the gap are space tokens, which are `rem` lengths on the web: they follow
  the reader's text size, as every space of the system does. The underline's thickness does not.
- **The two choices without style queries** (LNK-27, LNK-33). `comp.link.underline.visibility` and
  `comp.link.external.marks` are read by style container queries, from the link's parent: one question for every
  anchor (the underline's; 3 ms on a page of 12 000 elements), and the marks' for external links alone. Where a
  browser has none, the script writes the two names on the document's root (`data-underline-system`,
  `data-external-marks-system`), read again when the root's attributes or the page's content change: the design
  system's choice is drawn, a value a region set for itself is not, and a link without marks that wraps is cut at
  the line ends instead of having every corner on every line. With neither queries nor the script each choice is its first value — `always`, `all`.
  `data-underline` and `data-external` on an anchor need neither.
- **The picture's corners** are eased by the anchor's own curve. A design system whose `comp.link.site-icon.shape` is
  the full step and whose corner smoothing is above 0 gets a slightly flattened round.
- **An unknown `data-external`** is taken off by the script, and the address decides (LNK-21); without the script the
  stylesheet draws the marks for any value but `false`.
- Without the `lh` unit (Firefox before 120) a glyph is not centred on its line; without
  `transition-behavior: allow-discrete` (Firefox before 129) a script-less press ends when the pointer is lifted.
- **A press that no script answers** is the pressed container at once and for press-hold after, and then the state
  under it at once: the hold ends in a step, where a state otherwise leaves over the state motion (LNK-11). With the
  package's script every press is answered by it, and leaves as every state does.
  Without `:has()` a glyph beside a label, and the picture, have no room. Without `corner-shape` the corners are
  circular.

## Steps (`steps.css`, `class="tanrei-steps"`)

`specs/steps.spec.json` (STP-1 to STP-20): a procedure to read and carry out somewhere else — each step a ring with
its number, an optional title and a body of your content, joined to the next by a hairline. On the web it is **a class
on your own ordered list**, not an element: the list is the document's list before any script runs, a Markdown
renderer's `<ol>` needs one class and no wrapper, and without the stylesheet it is the browser's numbered list. It is
not in `custom-elements.json`.

```html
<ol class="tanrei-steps" role="list">
  <li>Save the file in the folder that holds the project's settings.</li>
  <li><p class="tanrei-steps-title">Build</p><p>Commit what the build writes.</p></li>
  <li><h3>Use it</h3><p>Each platform reads the file written for it.</p><pre>…</pre></li>
</ol>
<ol class="tanrei-steps" role="list" data-size="large" start="4" aria-label="The workflow, continued">…</ol>
```

| Spec prop | On the list |
|---|---|
| `label` | `aria-label`, or `aria-labelledby` naming the heading before it. |
| `start` | the list's own `start`. |
| `size: large` | `data-size="large"`. An unknown value is the default. |
| a step | `<li>`. |
| a step's `title` | the item's first child with `class="tanrei-steps-title"` (a `<p>`). |
| the title slot | a heading (`h2` to `h6`) as the item's first child: drawn as any title, its role and level kept. |

Write `role="list"`: one engine drops the list semantics of a list whose markers are removed.

- **How it is drawn.** An item is a block in the flow, so whatever is written in it — text directly, with its links
  and code, or paragraphs and blocks — is laid out as it is anywhere. The item keeps room at its start for the marker
  column and the gap; the marker is its `::before`, showing the list's own counter (`list-item`, so `start`, `reversed`
  and a nested set are the browser's), and the connector its `::after`. Nothing is a grid, and nothing has a state.
- **In prose.** The list is not an island: prose's rules reach the paragraphs, lists, links and code of each step. What
  the steps draw themselves (no inset, no list marker, their own gaps, the title's text style, the prose's full width)
  is in `steps.css`, and the build writes the same rules at the end of `dist/prose.css` — so `prose.css` alone draws a
  set of steps, and loading `steps.css` before or after it changes nothing.
- **`@tanrei/web/steps`** (loaded by `@tanrei/web` too) adds the debug reports of STP-9, STP-19 and STP-20, takes off a
  `start` that is not a whole number, and does the two things below that a stylesheet cannot.

What the stylesheet alone cannot do:

- **Numbers of three digits and more.** Such a marker is a pill, and the marker column of the set has to be as wide
  as its widest marker (STP-1). A stylesheet cannot measure that; the script does and hands it over
  (`--_steps-measured` on the list). Without the script the column stays the marker's height and a pill reaches into
  the gap beside it.
- **A change of `start` at run time.** Chromium and WebKit do not draw `counter(list-item)` again when the attribute
  changes; the script makes the list's boxes again when it does.
- **Text written directly in an item** is not an element, so no rule reaches it: directly after a title it has no
  title gap above it, directly before a code block there is no gap between them (a list under an item's text does
  get it), and in a prose with a measure it is kept to the measure only where the step holds nothing but text. A step
  that begins with a block that is not text has its marker's top on that block's top (STP-3), which the stylesheet
  tells from the item's first ELEMENT. In each of these, write the text in a `<p>`.
- **The connector's lower end** is placed for a next step that begins as this one does (a title, or none). Where two
  neighbours differ and the marker is shorter than a line, it ends a pixel or two off.

## Timeline (`timeline.css`, `class="tanrei-timeline"`)

`specs/timeline.spec.json` (TML-1 to TML-22): events in the order of time — each a marker at the start edge, its
time, a title and a body of your content, joined to the next by a hairline — and, where the events have one, a status
told by the marker's shape and in words. A list to read, never a control. On the web it is **a class on your own
ordered list**, the steps' form: the list is the document's list, with its `<time>` elements, before any script runs,
and without the stylesheet it is the browser's numbered list of dated paragraphs. It is not in `custom-elements.json`.

```html
<ol class="tanrei-timeline" role="list" aria-label="Release history">
  <li>
    <time class="tanrei-timeline-time" datetime="2026-09-19">19 September 2026</time>
    <p class="tanrei-timeline-title">Development begins</p>
    <p>The token pipeline, the spec schema and the first spec exist.</p>
  </li>
</ol>
<ol class="tanrei-timeline" role="list" data-size="large" data-density="compact" aria-label="Roadmap">
  <li data-status="done" data-status-label="Done"><p class="tanrei-timeline-time">Wave 1</p><h3>Controls</h3></li>
  <li data-status="current" data-status-label="In progress">…</li>
  <li data-status="upcoming" data-status-label="Not started">…</li>
  <li><span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">flag</span>…</li>
</ol>
```

| Spec prop | On the list and its items |
|---|---|
| `label` | `aria-label`, or `aria-labelledby` naming the heading before it. |
| `size: large` | `data-size="large"`. An unknown value is the default. |
| `density: compact` | `data-density="compact"`. An unknown value is the default. |
| an event | `<li>`. |
| `time`, `datetime` | `<time class="tanrei-timeline-time" datetime="…">` with the words you write as its text; a `<p class="tanrei-timeline-time">` where the time is not a moment ("Wave 1"). Nothing formats, translates or updates it. |
| `title` | an element with `class="tanrei-timeline-title"` (a `<p>`). |
| the title slot | a heading (`h2` to `h6`) that begins the event or follows its time: drawn as any title, its role and level kept. |
| `status` | `data-status="done | current | upcoming"`. Anything else is an event with no status. |
| `statusLabel` | `data-status-label="Done"`. |
| `icon` | `<span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">flag</span>` as the item's first child. |

Write `role="list"`: one engine drops the list semantics of a list whose markers are removed. Everything else in an
item is the event's body; write its text in elements (`<p>`).

- **How it is drawn.** An item is a block in the flow that keeps room at its start for the marker column and the gap.
  The marker is its `::before` — a dot, a ring holding the icon set's `check` (done), the whole box filled holding a
  dot (current), an empty ring (upcoming) — unless the item holds a `.tanrei-timeline-marker`, which then is the
  marker: a ring holding your glyph, filled for the event under way. The connector is the item's `::after`. The marker
  and the connector have the steps' sizes, hairline and gaps (the two components' tokens are compared by a test).
  Nothing has a state.
- **The status in words** (TML-12) is the alternative text of the marker's generated content,
  `content: … / attr(data-status-label) ', '`: the marker stands before the time, so a screen reader is given "Done, "
  first, as a phrase of its own, and nothing is drawn. Read back from Chromium's accessibility tree by the tests;
  Firefox and WebKit take the same syntax, and what they hand to assistive technology cannot be read by a test
 . Where an engine does not take the syntax
  (`CSS.supports`), the script writes the words as `<span class="tanrei-timeline-status">Done, </span>` at the event's
  start, drawn nowhere. You may write that element yourself in place of `data-status-label`: it is then read in every
  engine, with or without the script.
- **In prose.** The list is not an island: prose's rules reach the paragraphs, lists, links and code of each body.
  What a timeline draws itself is in `timeline.css`, and the build writes the same rules into `dist/prose.css` after
  prose's own — so `prose.css` alone draws a timeline, and loading `timeline.css` before or after it changes nothing.
  Outside a prose a body's blocks are laid out as they are anywhere, the body gap apart.
- **`@tanrei/web/timeline`** (loaded by `@tanrei/web` too) sets `aria-current="true"` on the item while exactly one
  event of a timeline has `data-status="current"` (an `aria-current` you wrote is left alone), writes the status
  element where it must, and adds the debug reports of TML-15, TML-21 and TML-22. It listens for nothing and formats
  no time.

What the stylesheet alone cannot do:

- **The current item** is the script's: without it no item carries `aria-current`, and the words still say it.
- **A size or a density a design system adds** is known to the script by its tokens and is not reported,
  but a stylesheet cannot read a token whose name comes from an attribute: it is drawn as the default until the layer
  ships its own rule (`.tanrei-timeline[data-size='small'] { --_timeline-marker: … }` is private today).
- **The check of a done event** needs `icons.css` and the icon face. Without the stylesheet the ring is empty, as an
  upcoming event's is; the words still differ.
- **The dot inside the marker of the event under way** is a gradient with a hard stop, which Chromium and WebKit do
  not smooth: at one device pixel a point its edge is stepped. A real box would be smooth, and the item has no third
  generated box.
- **Text written directly in an item** is not an element: it gets no gap after a time or a title, and no measure in a
  prose. Write it in a `<p>`.
- **The connector's lower end** is placed for a next event that begins as this one does. Where a design system's
  marker is shorter than a line of text and two neighbours begin with lines of different heights (one has a time, the
  next does not), it ends a pixel or two off.
- **A long-form body outside a prose** is not set as prose (TML-5): give the list a `.tanrei-prose` ancestor, as a
  page of text has.

## Previous and next links (`previous-next-links.css`, `class="tanrei-previous-next-links"`)

`specs/previous-next-links.spec.json` (PNL-1 to PNL-22): the page before and the page after the one a person is on — two links,
each pressed as a whole and drawn as an outlined container with the title of where it leads and the component's own
arrow. On the web it is **classes on your own `nav` and anchors**, not an element: the anchors are in the document, so
they are links before any script runs. It is not in `custom-elements.json`.

```html
<nav class="tanrei-previous-next-links" aria-label="Pages">
  <a class="tanrei-previous-next-links-item" data-direction="previous" rel="prev" href="/getting-started/installation/">
    <span class="tanrei-previous-next-links-label">Previous</span>
    <span class="tanrei-previous-next-links-title">Installation</span>
  </a>
  <a class="tanrei-previous-next-links-item" data-direction="next" rel="next" href="/foundations/tokens/">
    <span class="tanrei-previous-next-links-label">Next</span>
    <span class="tanrei-previous-next-links-title">Design tokens</span>
  </a>
</nav>
```

| Spec prop | On the web |
|---|---|
| `label` | `aria-label` on the `nav`. Tanrei ships no words. |
| an item's `direction` | `data-direction="previous"` or `"next"` (none is `next`), with `rel="prev"` or `rel="next"`. Any other value is not drawn. |
| an item's `label`, `title` | `<span class="tanrei-previous-next-links-label">`, then `<span class="tanrei-previous-next-links-title">`. An empty span is not drawn. |
| `href` | `href`. Without one — or with an empty one or a `javascript:` one — the item is not drawn (PNL-3), so both items can always be written. |
| `click` | the anchor's own `click`; cancel it to route yourself. |

- **The row** is a grid whose columns are counted from the width the `nav` has: two where two items of
  `comp.previous-next-links.container.min-width` and the gap fit, one where they do not (PNL-5). The previous item takes the
  first column and the next item the last, so next keeps its place when it is alone (PNL-4), and in one column the
  second goes to the next row. The tokens are read where they are used, which a container query's condition cannot do
  in every engine — so there is none, and no media query either.
- **The arrows** are `::before` (previous) and `::after` (next) in the icon set's font, so they need `icons.css`;
  without it none is drawn and none takes room. Under `:dir(rtl)` each is mirrored in its own box.
- **States** are the stylesheet's: hover, keyboard focus (ring, or glow by a style query), and `:active` as the
  overlay, held for press-hold by a delayed step of a custom property that no one registers
  (`transition-behavior: allow-discrete`; where the browser does not know it, the press ends with the pointer).
- **`@tanrei/web/previous-next-links`** (loaded by `@tanrei/web` too) adds the shared press primitive (ripple, dim, none), puts
  items given next-first in previous-first order, adds a missing `rel`, takes off an address that is white space, a
  script or unreadable, writes `data-focus-style` where the browser has no style queries, takes the mirroring off
  (`data-tanrei-unmirrored`) where the active icon set marks neither arrow, and makes every debug report.

What differs, and what the stylesheet alone cannot do:

- Items given next-first are DRAWN previous-first by the stylesheet, and stay next-first in the focus order until the
  script moves them. Write the previous item first.
- An address that is only white space is drawn until the script takes it off.
- A stylesheet cannot ask the icon set which names mirror: both arrows are mirrored in a right-to-left layout, which is
  what every shipped system's icon set says. For a set that marks neither, the script says so; without it, write
  `data-mirror="never"` on the items.
- Inside a `.tanrei-prose` the previous and next links are an island, as a Tanrei element is: prose spaces the `nav` as a block and
  leaves its anchors to the component — they are not drawn as prose's links, and the Link's script does not answer
  their presses — whichever of `prose.css` and `previous-next-links.css` is loaded last.

## Code (`code.css`, `class="tanrei-code"`, `<tanrei-code-block>`, `<tanrei-copy-button>`, `@tanrei/web/highlight`)

Three components: **inline code** is a class on your own `code` element, the **code block**
is an element around your own `<pre><code>` that highlights the code by itself, and the **copy button** is a Button
that copies. One optional stylesheet, `@tanrei/web/code.css`, holds the class and what draws a code block before its
element is defined; one module, `@tanrei/web/highlight`, is the highlighter the code block brings.

```html
<link rel="stylesheet" href="@tanrei/web/tokens.css" />
<link rel="stylesheet" href="@tanrei/web/code.css" />

<p>Run <code class="tanrei-code" translate="no" spellcheck="false">npm install</code> first.</p>

<tanrei-code-block headline="sizes.js" language="js" language-label="JavaScript" copy copy-label="Copy" copied-label="Copied" copy-failed-label="Could not copy">
  <pre><code>const sizes = ['small', 'medium', 'large'];</code></pre>
</tanrei-code-block>

<tanrei-copy-button text="npm install @tanrei/web" label="Copy" copied-label="Copied" failed-label="Could not copy"></tanrei-copy-button>
```

### Inline code (specs/inline-code.spec.json)

`class="tanrei-code"`, and every `code` that is prose's own and not in a `pre` when `prose.css` is loaded (the build
writes the same rules there, as it does the link's). Its size is the surrounding text's times
`comp.inline-code.label.scale`, so a heading's size is followed with no rule per level; `line-height: 0` keeps it
from making its line taller.

| Spec | On the web |
| --- | --- |
| `text` | the element's own content |
| `variant: tonal \| plain` | `data-variant="tonal \| plain"` on the `code` |
| `variant: auto` (the default) | no attribute: what the nearest ancestor with `data-tanrei-code="plain \| tonal"` chooses, and tonal where none does |

What a stylesheet cannot do, and what this one draws differently:

- **`translate="no"` and `spellcheck="false"` are your attributes** (ICD-7), or your renderer's.
- **An unknown `data-variant` is drawn as auto and nothing is reported** (ICD-16): no script watches the class
 .
- **A line break inside the run** is one space only where the browser has `white-space-collapse: preserve-spaces`
  (Firefox); elsewhere it is drawn as a break. A Markdown renderer already writes a code span on one line.
- **A hyphen in the code is a place a line may end**, before the run is broken between any two characters: the
  browser's line breaking knows no way to keep the spaces as the only first choice.
- **WebKit draws the fill and the corners of every piece of a run that wraps, and not the padding**: the pieces
  after the first begin at the fill's edge. The engine clones the padding of an inline box, but not of one that has a
  `unicode-bidi` of its own, and the run is isolated (ICD-8).
- **In Chromium a piece of a run that wraps may pass the end of its line by its padding, at most**: the engine keeps
  room for the padding at a piece's start and none for the one at its end when it breaks the line, so where the
  characters and one padding fit and both do not, the fill reaches up to `container.padding-inline` past the text
  beside it. No character does.
- **The fill is the face's own text box** — from its ascent to its descent at the drawn size — which is what an
  inline box's background is.
- **Forced colors**: the mode removes the fill and the shadow; the optional edge is then an outline in the text color.

### `<tanrei-code-block>` (specs/code-block.spec.json)

The code is the light-DOM `<pre><code>`: it is in the document without script. The shadow root draws the frame —
container, header, copy button, the scrolling body and its focus indicator — and slots the `pre`. What is in the
document is styled from outside the shadow root, by `code-block.light.ts`: the element adopts those rules into the
document (or the shadow root) that holds it, and `code.css` carries the same text for a block that is not upgraded —
and draws that block where the element will, so nothing moves when it is defined ("Before the element is defined").

| Prop | Attribute | |
| --- | --- | --- |
| `code` | `code` | For a block built by script: the element writes the `<pre><code>`. Leave it out when the code is in the document. |
| `variant`, `size` | same | `filled \| outlined`, `small \| medium`; a design system may add values. |
| `title`, `label` | same | `title` is read and then removed from the element, so the browser draws no tooltip of its own. |
| `language` | `language` | The identifier the block highlights by (`tsx`, `css`, `sh`), read trimmed and without regard to case. Not drawn. |
| `languageLabel` | `language-label` | The words drawn in the header ("TypeScript"). |
| `highlight` | `highlight` | True by default, so the attribute is written to turn it off: `highlight="false"`. The property takes a boolean. |
| `wrap`, `lineNumbers`, `startLine`, `maxLines` | `wrap`, `line-numbers`, `start-line`, `max-lines` | |
| `highlightedLines`, `addedLines`, `removedLines` and their labels | `highlighted-lines`, … `highlighted-label`, … | `"3, 7-9"`, counted from `start-line`. |
| `prompt` | `prompt` | |
| `copy`, `copyLabel`, `copiedLabel`, `copyFailedLabel` | `copy`, `copy-label`, `copied-label`, `copy-failed-label` | |
| run (item) | `<span data-syntax="comment \| keyword \| string \| constant \| function \| type \| tag \| property \| punctuation">` in the `<code>` | Text outside a span is plain. |

Events: `copied` (`detail.text`) and `copyfailed` (`detail.reason`). Parts: `container`, `header`, `title`, `language`,
`copy-button`, `body`. Custom property: `--tanrei-code-block-ground`.

- **Lines.** The element needs one box per line. It wraps each line in `<span data-line>` holding
  `<span data-line-code>`, moving nodes and splitting text nodes and runs at line breaks; the text of the `<code>` is
  unchanged but for a marked line's label (below). `[data-line]` children a highlighter already wrote are used as
  they are, and lines that already hold what the element would write — the box of their code, the gutter, the
  prompt (`highlightToHtml` or `highlightToNodes` with the block's props as `lines`) — are left exactly as they are:
  defining such a block writes nothing into the document. It does this again when the code changes in the document. **A framework that owns the `<code>`'s
  children** (it would write them again over the lines) should set `code` instead, or render `[data-line]` itself.
- **Numbers, signs and the prompt are generated content** of empty elements (`data-line-gutter`,
  `data-line-prompt`), with an empty alternative text, `aria-hidden` and `user-select: none`: drawn, not text.
- **A marked line's label** is a `<span data-line-label>` before the line's code: read, never drawn, not
  selectable. It is in the `<code>`'s `textContent`; the copy button and a copied selection leave it out.
- **Copying a selection** (COD-12): the element answers the document's `copy` event for a selection inside its own
  code, with the selected characters of the code and its own line breaks. A selection that reaches outside the block
  is the browser's.
- **The body** is the scroll container: `dir="ltr"` always, `role="group"` with the block's name, and `tabindex="0"`
  only while it overflows (a `ResizeObserver` on the body and the `pre` decides). The focus indicator is a box over
  the container that does not scroll.
- **The gutter** is `position: sticky; left: 0`, filled with the block's ground so code scrolls under it. **The
  outlined look has no ground of its own** (its fill is transparent, and a stylesheet cannot know what it is placed
  on): the gutter and the copy button's patch use `--tanrei-code-block-ground` where you set it and
  `sys.color.surface` otherwise.
- **The copy button's patch** covers whole lines at the top end corner, so no line is half hidden; where the
  browser has no `round()` it is as tall as the button. Wrapped, no code passes under the button and there is no patch.
- **Right to left**: the frame mirrors by `:dir()`; without a header the copy button is at the top left and the
  padding before the lines is widened there. With a gutter as well, the gutter's numbers move right with it and the
  bars of the first lines are under the button's patch.
- **A band and a bar** are the line's and the gutter's backgrounds; in forced colors the gutter is drawn in system
  colors by name (`forced-color-adjust: none`), because the mode removes a gradient.
- **It highlights by itself** (COD-19, COD-27 to COD-33). Three sources of color, in order: runs the
  document gives; the block's own highlighter; plain.
  - *Runs the document gives* are a `<code data-syntax-of="…">` (what `highlightToHtml` writes where a page is made)
    or any `[data-syntax]` the element did not write itself. They are drawn as they are and never read again,
    whatever `language` and `highlight` say, and `code` is ignored beside them (COD-29).
  - *Its own highlighter* is `@tanrei/web/highlight`, which the element does **not** import: a block that needs it —
    `highlight` true, a `language` that is not empty, `text`, `plain` or `plaintext`, no runs of the document's — asks
    for it with `import()` the first time, and each grammar is a module of its own, imported the first time its
    language is asked for. A page whose code was highlighted where it was made loads none of it. (The single-file
    `tanrei.bundle.js` holds the module and its grammars inside it.)
  - *When.* The code is drawn at once, plain. The first colors of a block are owed to a later task, and the blocks
    of a page are colored a few milliseconds at a time, in tasks of their own (never a frame callback), each block
    whole: one pass that replaces the children of each line whose runs changed and touches no other line, so a
    block's colors arrive in one frame and — a role being color and weight alone — move nothing (COD-28). A
    selection inside a line that is written again is put back by its characters. A block that is shown and whose
    `code`, `language` or `highlight` changes is read again in the task of the change, and where its highlighter
    answers at once (Tanrei's does, once a grammar is loaded) the new code is drawn with its colors in that task;
    otherwise the lines before the first changed line keep their colors and the rest is plain until the answer
    (COD-30). An answer for code that is no longer the block's is dropped.
  - *The limit* is `--tanrei-comp-code-block-syntax-max-length`, read from the cascade at the block when it is about
    to highlight (the web has no generated module of token values to read it from): longer code is plain, whole
    (COD-31). The limit is also what bounds the work: tokenizing costs about 0.1 ms per thousand characters, and
    writing the runs is the larger part — see "How long it takes" below.
  - *Marked lines* (COD-33): with `added-lines` or `removed-lines` the highlighter is asked twice — for the lines
    that are not removed, whose answer colors those lines, and for the lines that are not added, whose answer
    colors the removed ones.
  - *Failures* (COD-32): a module or a grammar that cannot be loaded, a highlighter that throws or whose promise is
    refused, runs whose texts do not join to the code — the code is plain, everything else works, and it is reported
    once. An unknown language is reported once for each name (COD-27).
  - *Roles* are the values of the token axis `comp.code-block.syntax`: `SYNTAX_ROLES` in `code-block.light.ts` is
    held to the roles `src/generated/tokens.css` names by the build (it refuses to write `code.css` while they
    differ), and each is one rule from `--tanrei-comp-code-block-syntax-color-<role>` and `…-emphasis-<role>`. A role
    a design system **adds** to the axis is recognized by its color token in the cascade and gets the
    same rule in the adopted sheet the first time a run names it; a role no token carries is drawn plain and
    reported (COD-19). Where constructed stylesheets are missing, an added role needs its rule in the product's own
    stylesheet.
  - *The seam.* `TanreiCodeBlock.highlighter` is undefined by default (Tanrei's module). A function
    `(code, language, signal) => runs | null | Promise<…>` set there is asked instead and the module is never
    loaded; `null` turns every block's own highlighting off. Set it in the task that defines the element. `signal`
    is aborted when the code or the language changes or the block leaves the document.
- **Before the element is defined**, `code.css` draws `tanrei-code-block:not(:defined)` *where the element will draw
  it*, so that nothing moves when it is defined — in both layout directions, at every size and look, wrapped or not:
  - the fill, the corners, the paddings, the face, the runs' colors, `overflow-x: auto` on the `pre`;
  - the header's row, with the title and the language label drawn from the `title` and `language-label` attributes
    (generated content of the element, in their text styles; the title is cut with an ellipsis in its own direction);
  - the room of the copy button — at the end of the header's row, or beside the lines without a header (at the left
    in a right-to-left layout, where the lines begin) — and the block's least height with one. The button itself
    arrives with the element;
  - **lines written where the page was made** — `highlightToHtml(code, language, { lines: { prompt, lineNumbers,
    startLine, highlightedLines, addedLines, removedLines, …Label } })`, the block's own props — are drawn whole:
    numbers, signs, the prompt, the bars and the bands. The rules that draw a line do not ask whether the element is
    defined. Give the element the same attributes; it then finds its work done.
  - **code that is text** (`<pre><code>npm install</code></pre>`) cannot be given its prompt or its numbers by a
    stylesheet — a line's generated content cannot read the block's attribute, and a number's column is as wide as
    the last number. Their room is kept as nearly as the attributes say: a prompt of one character and its space, a
    gutter of one-digit numbers and of signs. A longer prompt, or numbers of two digits or more, move the code by the
    difference when the element is defined: write such a block's lines where the page is made.
  - `max-lines` cuts the block before the element is defined too: read from the attribute as a number where the
    browser reads attributes so in CSS, and counted otherwise — 1 to 50; a greater value shows every line until the
    element is defined.
- **A bare `pre` in prose** (`prose.css`) is drawn as a filled block of the medium size and scrolls in its own box.

### `@tanrei/web/highlight`

The highlighter: no dependency, no DOM, the same file in a browser, in a worker and in Node. `src/highlight/index.ts`
is the interpreter, the registry and the fold; `src/highlight/grammars/*.ts` are the nine grammars, one module each
(`typescript` imports `javascript`: tsx and jsx are those two grammars with markup switched on).

```ts
import { highlight, highlightToHtml, highlightToLines, highlightToNodes, registerLanguage, loadLanguage, setHighlighter, languages, foldScope, tokenize, checkGrammar } from '@tanrei/web/highlight';

await highlight('const a = 1;', 'js'); // [{ text: 'const', syntax: 'keyword' }, { text: ' a = ' }, { text: '1', syntax: 'constant' }, …]
highlight('let b;', 'js'); // the same language again: answered at once, not with a promise
await highlightToHtml(source, 'tsx', { lines: true }); // the inner HTML of <code data-syntax-of="tsx">
await highlightToHtml(source, 'sh', { lines: { prompt: '$', lineNumbers: true } }); // …with what the block draws beside its lines
highlightToLines('let b;\nb = 1;', 'js'); // [[{ text: 'let', syntax: 'keyword' }, { text: ' b' }, …, { text: '\n' }], [{ text: 'b = ' }, …]]
highlightToNodes(source, 'tsx', { lines: true }); // [{ name: 'span', attributes: { 'data-line': '' }, children: [{ name: 'span', attributes: { 'data-line-code': '' }, children: […] }] }, …]
registerLanguage(['ini', 'conf'], { states: { main: [{ match: ';[^\\n]*', role: 'comment' }] } });
registerLanguage('sql', () => import('./sql-grammar.js')); // loaded the first time it is asked for
setHighlighter((code, language, signal) => myHighlighter(code, language)); // null: off; undefined: Tanrei's again
```

| Export | |
| --- | --- |
| `highlight(code, language, signal?)` | The runs — `{ text, syntax? }`, their texts joined being the code — or null for a language that is not known. At once where the grammar is loaded, a promise the first time. |
| `highlightToHtml(code, language, { lines? })` | Escaped text and `<span data-syntax>` runs; with `lines`, one `<span data-line>` per line holding its code in a `<span data-line-code>` — the boxes the element would make. `lines` may be the block's props that say what stands beside a line (`lineNumbers`, `startLine`, `highlightedLines`, `addedLines`, `removedLines`, their three labels, `prompt`): the lines then carry the gutter, the prompt, the marks and the labels as the element writes them. Unknown language, or runs that do not join to the code: the code escaped and plain. |
| `highlightToLines(code, language)` | The runs grouped by line, as plain data (`TanreiSyntaxRun[][]`): a line's break is the last character of its last run, a run that spans lines is one piece in each, every text joined is the code. For a build step that makes nodes of its own. At once where the grammar is loaded, a promise the first time — as `highlight` and `highlightToHtml`. |
| `highlightToNodes(code, language, { lines? })` | What `highlightToHtml` writes, as plain nodes — a string, or `{ name: 'span', attributes, children }` — for a build step whose page is a tree (a Markdown engine's, MDX). `highlightToHtml` is these nodes written out. |
| `registerLanguage(names, grammar)` | Adds or replaces. `grammar` is a grammar, or a function that returns or imports one (a module's default export will do). |
| `loadLanguage(language)` | Loads a grammar ahead of time; false for an unknown name. Not in the spec's list: added so that a caller can have `highlight` answer at once. |
| `setHighlighter(fn \| null \| undefined)` | Replaces the highlighter whole, for the element and for `highlightToHtml`. |
| `languages()` | Every name, sorted. |
| `foldScope(scopes, text?)` | The role of a token whose grammar names it by dotted scopes: `scopes` is one scope or a token's scopes from the outermost to the most specific. |
| `tokenize(grammar, code)`, `checkGrammar(grammar)` | The interpreter, and what it refuses, for testing a grammar. |

**A grammar is data**: `{ start?, ignoreCase?, states: { name: Rule[] } }`, a rule being `{ match, role?, push?, pop?,
next?, include? }`. `match` is the source of a regular expression, read at the reading position only (sticky,
multiline); `role` is the role of the match, or one role per capture group where the groups follow one another and
cover the match (`''` is plain; groups that do not cover it make the match one run, so no character is lost). The
rules of a state are compiled into one expression and tried in order. Where no rule reads, a word, a stretch of
space or one character is plain.

**No text can stall a page.** `checkGrammar` refuses a repetition inside a repeated group, a reference back to a
group and a look behind, and the grammars are written so that a pattern that reads far cannot fail after it has
(a string's closing quote is optional; a comment and a template are states, not one pattern). The test reads fifty
thousand characters of some hundred hard repetitions through every grammar and holds the slowest to a bound and to
proportion; two patterns failed it while the grammars were written, at seconds each.

**What the grammars do not know** — wrong quietly, a run in another color: whether a slash begins a regular
expression is decided by what stands before it; whether `<` opens a tag (jsx, tsx) by what follows it, and a generic
component (`<Box<T>>`) is not seen; an object's keys and a function's parameters are plain; what a `script` or a
`style` element holds is plain; a shell here-document is read as commands; a name in capitals is a type, and one in
capitals with an underscore a constant.

**Sizes** (minified and gzip-compressed; held by `src/highlight/highlight.test.ts` at 3 kB for the module and 3 kB for
each grammar with what it imports): the module 2.6 kB; what the grammars share 0.5 kB; javascript 1.4 kB (typescript
adds 0.1 kB); swift, kotlin, dart 0.8 kB each; shell, css 0.6 kB; markup 0.5 kB; json 0.3 kB — 8.6 kB for all nine.
The element's own module does not import any of it.

**How long it takes** (this package's development bundle, a desktop machine): reading 50,000 characters takes 2 to
8 ms in every grammar, 500 lines under 2 ms. Drawing costs more than reading: a block of 500 lines of TSX (14,000
characters, 2,250 runs) takes about 15 ms more than the same block drawn plain in Chromium (15 to 18 ms in Firefox
and WebKit), in one task; at the limit — 50,000 characters, 1,760 lines, 7,900 runs — about 50 ms in Chromium and 65
ms in Firefox and WebKit. That one write is not divided, because a block's colors arrive in one frame (COD-28); what
is divided is the page: blocks are colored one after another, and the queue lets the page answer every 8 ms. A line
appended to a block that has its colors costs 5 ms at 500 lines and 14 to 20 ms at the limit.

**The corpus** is `test/highlight-corpus.json`: code and the runs expected for it, per language, as data — the form
in which the other platforms' interpreters can be held to the same answers.

### `<tanrei-copy-button>` (specs/copy-button.spec.json)

Its shadow root holds a `<tanrei-button>` (part `button`) of the `variant` and `size` you name — so every Button
token, state and choice of kind applies unchanged — two visually hidden live regions (`role="status"`,
`role="alert"`) and nothing else. It has one token of its own, `comp.copy-button.confirmation.duration`.

| Prop | Attribute |
| --- | --- |
| `text`, `label`, `variant`, `size`, `disabled` | same |
| `copiedLabel`, `failedLabel` | `copied-label`, `failed-label` |
| `iconOnly` (default true) | `icon-only="false"` for the labelled form |

- **The clipboard** is `navigator.clipboard.writeText(text)`: it needs a secure page and the person's press. Where
  the API is missing (a page that is not secure) or the promise rejects (a denied permission, a permissions policy),
  that is the failed form and `copyfailed`. There is no `document.execCommand` fallback.
- **The events are `copied` and `copyfailed`**, not `copy`, which is the document's own clipboard event. They bubble
  and do not cross a shadow root; the code block emits its own for its button's.
- **The announcement**: both regions are emptied on every activation and the answer's words are written when the
  browser answers, so the same words are announced again.
- **The labelled form** stacks the three texts in one grid cell, two of them `visibility: hidden`: the box is as
  wide as the widest, and the accessible name is the text shown.
- **While the icon font is missing** the glyph is hidden (`GlyphDrawnController`), not spelled out.
- **A variant or size the active system's Button does not have** is drawn as the copy button's own default (`text`,
  `medium`), not the Button's.

## `<tanrei-link-card>` (`link-card.css`)

One link drawn as a block: the destination's title, a sentence about it, its picture and the site it is on. Contract: `specs/link-card.spec.json` (LKC-1 to LKC-36). **It loads nothing about the destination**: it draws the values it is given, and the only requests it makes are the two pictures it was handed.

**The form**: an element with no shadow root around the product's own anchor, and one stylesheet, `@tanrei/web/link-card.css`, which draws all of it before the element is defined and with scripting off. Upgrade moves nothing.

```html
<tanrei-link-card>
  <a href="https://example.com/articles/designing-with-tokens">
    <span data-part="body">
      <span data-part="title" dir="auto">Designing with tokens</span>
      <span data-part="description" dir="auto">How a handful of dials becomes a whole system.</span>
      <span data-part="image-alt">A wall of color swatches</span>
      <span data-part="site">
        <img data-part="site-icon" src="/link-pictures/icon.png" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        <span data-part="site-name"><span dir="auto">Example Journal</span></span>
        <span data-part="address"><bdi data-part="host" dir="ltr"><span>example.</span><span>com</span></bdi></span>
      </span>
      <span data-part="words">external link</span>
    </span>
    <img data-part="media" src="/link-pictures/picture.png" alt="" width="1200" height="630" loading="lazy" decoding="async" referrerpolicy="no-referrer">
  </a>
</tanrei-link-card>
```

Every part but the title is optional. Nobody writes this by hand: `linkCardToNodes(data, options)` and `linkCardToHtml(data, options)` of `@tanrei/web/links` (pure, usable in a browser and under Node; the Node entry `@tanrei/web/links/node` gives them again) write it from `LinkData`, with every value cleaned and escaped. The same module holds what the element itself uses: `displayHost()`, `plainText()` (LKC-15), `repeatsHost()` (LKC-7), `pictureAddress()` (LKC-14), `isExternal()`.

**A card the element builds.** A `<tanrei-link-card>` with no anchor writes one from its attributes: `href`, `headline` (the spec's `title`: HTML's own would be a tooltip), `description`, `image`, `image-alt`, `site-name`, `site-icon`, `target` (`same` | `new`; `_blank` is read as `new`), `target-label`, `external` (`auto` | `on` | `off`), `external-label`, `variant` (`outlined` | `filled`). Each value is written as a text node. That form is drawn when the element is defined, not before. Where the element holds the product's own anchor, an attribute that is given is written over that anchor's part, and one that is not leaves the markup as it is. React's `LinkCard` is this form.

**What the element adds to the document's markup**, and nothing else:

- the host, computed from the anchor's `href` by `displayHost()`; one written in the markup that differs is replaced and reported (LKC-8);
- `data-undrawn` on a site name that only repeats the host (LKC-7);
- `data-external="detected"` on the anchor, by the Link's rule and from the same `setSiteOrigins()`, where the markup carries no `data-external` of its own (LKC-24). On a page that was not marked where it was made the arrow therefore appears after the first paint;
- the words of an external link from `setExternalLabel()`, where the card has none of its own (LKC-24);
- `aria-labelledby` (the title) and `aria-describedby` (the description, the picture's alternative text once the picture has loaded, the site's name, the host, the words) on the anchor, with ids it writes (LKC-25). Before that the anchor is named by all of its text in reading order;
- `rel="noopener"` for `target="_blank"`; `alt=""`, `referrerpolicy="no-referrer"`, `loading="lazy"` and `decoding="async"` on a picture whose markup left them out (a missing referrer policy is reported: the first request may have left before the script ran);
- a picture that fails is removed, and is not asked for again until the product gives its address anew (LKC-10, LKC-13);
- `data-pressed` through the shared press primitive, and `data-focus-style` where the browser has no style queries;
- `inert` on an interactive element found inside the card (LKC-35);
- the debug reports.

**Layout.** The element is the query container (`container-type: inline-size`): the picture stands beside the text from `comp.link-card.layout.beside-min-width` of the card's own width, written into the `@container` condition by the build in rem (`scripts/conditions.js`), so the boundary grows with the text size. A system that changes that token gets `dist/systems/<id>.link-card.css`. Because the element is a size container it has no width of its own: in a flex row or a grid cell, give it one.

**What this platform cannot do, or does differently.**

- LKC-9: a host's Unicode form needs the engine to tell a character's script (Unicode property escapes). Where it cannot, the ASCII form is drawn always.
- LKC-14: "only once the card is near what is shown" is `loading="lazy"`, the browser's own judgement. A picture given as a `data:` URL is in the page itself and is not put off.
- LKC-18: without the script a press is `:active` alone — the pressed tokens at once, and no hold. The hold, the ripple and the dim need the element.
- LKC-20: `corner-shape` is drawn where the browser has it; elsewhere the corners are round. The glow needs style queries or the script.
- LKC-23: the marks need `icons.css`. Without it no mark is drawn and none takes room.
- LKC-29: the size dial is a length in rem, so a page that enlarges its root text enlarges the paddings, the gaps and `media.width` with it; a browser's own text-only zoom leaves them.
- A picture that fails without the script keeps its box (its fill, no broken-picture mark where `alt=""` draws none). Taking it away is the script's.

## `<tanrei-image-preview>` and `<tanrei-image-preview-item>`

Shows one picture of a set over the whole window, to be looked at closely: enlarged and back, moved about while
enlarged, moved on to the next picture or back, until it is closed. Contract: `specs/image-preview.spec.json`
(IMP-1 to IMP-43). A **feature**: its stage and its pager are its own; its five controls are real
`<tanrei-button>` elements and its placeholder a real `<tanrei-skeleton>`, as small parts (R1) — it has no member, so
no prop is forwarded, there is no `from` and no twin, and it takes no part in a form.

```html
<button type="button" aria-haspopup="dialog" aria-label="Enlarge: a bedroom with a window onto a garden" id="open-room">
  <img src="room-small.jpg" alt="" width="320" height="200" />
</button>

<tanrei-image-preview label="Photos of the room" close-label="Close" zoom-in-label="Zoom in" zoom-out-label="Zoom out"
  previous-label="Previous image" next-label="Next image" count-text="{position} of {count}"
  loading-label="Loading image" error-text="This image could not be loaded">
  <tanrei-image-preview-item src="room-large.jpg" thumbnail-src="room-small.jpg" width="1600" height="1000"
    alt="A bedroom with a window onto a garden" caption="The east bedroom in the morning."></tanrei-image-preview-item>
  <tanrei-image-preview-item src="desk-large.jpg" alt="The desk beside the window"></tanrei-image-preview-item>
</tanrei-image-preview>

<script type="module">
  const preview = document.querySelector('tanrei-image-preview');
  document.querySelector('#open-room').addEventListener('click', () => Object.assign(preview, { index: 0, open: true }));
  preview.addEventListener('close', () => (preview.open = false));
</script>
```

**The opener is the product's** (the spec's accessibility notes): a button around its own picture, named for what it
does and which picture, that sets `index` and `open`. The element ships no opener. Focus returns to it when the
preview closes (IMP-4). **The preview never closes itself**: it fires `close` with `detail.reason` (`button`,
`escape`, `back`, `swipe`) and the product sets `open` to false. Every word is the product's (`setWords()`, or the
props); the eight keys are in `src/generated/words.ts`.

**The modal layer** is the shared primitive (`primitives/modal.ts`, `sheet.ts`, `overlay-focus.ts`), not a
`<tanrei-dialog>`: a native `<dialog>` opened with `showModal()` that fills the window (`100dvh`), `::backdrop` clear
— nothing is left uncovered, so there is no scrim (IMP-1). Focus goes to the stage when it opens (also mounted open),
Tab is kept inside in the order zoom out, zoom in, close, previous, the stage, next, the scrolling caption (IMP-3), and
`holdPageScroll()` holds the page. The `<dialog>` itself carries `tabindex="-1"`: one engine counts a dialog among
its own tab stops. No history entry is written (IMP-7).

**Parts.** `container`, `bar`, `count`, `stage`, `image`, `placeholder`, `error`, `caption`; each control's host under
its name (`zoom-out`, `zoom-in`, `close`, `previous`, `next`), and each Button's own parts under the control's name
before theirs (`close-container`, `next-icon`) — made with `exported()` from the Button's `static parts`, as a
composed element's are (W4). The Buttons read `comp.button.*` and the Skeleton `comp.skeleton.*` by inheritance; the
element writes none of their custom properties. The variant of each goes through the Button's channel (BTN-10,
`giveVariant()`): `comp.image-preview.bar.button.variant` and `comp.image-preview.navigation.button.variant`, read
when it opens and at each update while it is open.

**The stage and the pager** are written together, in the element (`image-preview.ts`):

| What | By a gesture | By one pointer, without a path | By a key |
|---|---|---|---|
| Enlarge and back | two presses within 300 ms (pointer events: `dblclick` does not come on touch); two fingers; `wheel` with Ctrl or Command, which is also how a trackpad pinch arrives; a `gesturechange` where an engine tells a trackpad pinch that way | the zoom controls | `+` or `=`, `-`, `0` |
| Move about an enlarged picture | a drag; a wheel (Shift, or a sideways wheel, sideways) | — | the arrow keys, a quarter of the fit area |
| Next and previous | a sideways drag at fit, or one that begins at the picture's edge (IMP-19) | previous, next | Left and Right at fit; Page Up, Page Down, Home, End |
| Close | a downward drag by touch at fit | close | Escape |
| Hide and show the controls | one press on the picture | the same | any key shows them |

The stage has `touch-action: none`, so the browser's own pinch and scroll do not take its gestures; the browser's
page zoom (Ctrl or Command with `+`) is left to the browser. Its `wheel` listener is not passive and is on the stage,
which has a box only while the preview is presented: **a closed preview takes no wheel of the page's**. A wheel
without Ctrl does nothing at fit and is not prevented.

- **The image is placed by a transform** the element writes (`translate() scale()` on an `<img>` at its fit size). A
  step of the zoom is a transition of that `transform` (`motion.zoom-*`); a change of image and a released drag are a
  transition of the pages' `translate` (`motion.page-*`); the entrance is `@starting-style` on the dialog's `opacity`
  and the pages' `scale`. **No custom property is registered** (`src/styles/registered-properties.test.ts`): the
  private names (`--_at`, `--_drag-x`, `--_presence`, `--_fit-x`) are plain values a real property is computed from.
- **`zoom`, `index` and `controlsHidden`** are plain values the element writes itself on a person's change, before the
  event; a value the product sets is taken at once and fires nothing. A pinch and a wheel write `zoom` when they end
  (a wheel has no end: 160 ms of stillness is one).
- **Three sources and no more** (IMP-32): the element holds `<img>` elements for the image shown and its two
  neighbours. `<tanrei-image-preview-item>` is data — never an `<img>` — so the browser asks for nothing the preview
  has not asked for. A closed preview asks for nothing.
- **An item without `src` is asked for nothing and waits** (drawn as loading). The spec says `src` is required and no
  more; this is how the fixtures' `fixtures/pending.png` — the picture that never arrives — is given on the web
  (`test/pictures.ts`): a request that is never answered would also keep the document's `load` from ever coming.
- **Hidden controls** are `opacity: 0` with `pointer-events: none`: they stay in the focus order and exposed, and a
  press where one stands meets the picture — a person presses nothing they cannot see. A mouse that moves shows them
  first.
- **Focus that would be on nothing is on the stage.** One engine gives a button no focus for a press and takes it
  from where it was; the keys would then reach no part of the preview.

**What a browser cannot do, and what it does instead.**

- **The exit fade** (IMP-33) needs a closed dialog held in the top layer (`overlay`, with `transition-behavior:
  allow-discrete`). Where the engine has no `overlay` property the preview is gone at once when it closes, as a
  `<tanrei-dialog>` is; focus and the page are given back at the same moment either way.
- **`forced-color-adjust`** is written on the images (IMP-41); an engine without the property recolors no picture.
- **Android's back** arrives as the dialog's own `cancel` and is reported as `back` unless an Escape key was seen
  within the last second (`closeRequestReason()`); a browser that closes the dialog itself is asked once more and the
  preview stays unless the product closed it.

**Fixtures' pictures.** `test/fixtures/image-preview-*.png` are drawn by a script (flat bands, an edge, two
diagonals, corner marks and the picture's own size in a bitmap face): nothing a font or a codec draws differently.

## Reading a destination where the site is built (`@tanrei/web/links/node`)

No component loads anything about a destination: a link's site icon and a link card's title, description and
picture are values the product gives. `@tanrei/web/links/node` is the tool that reads them — **once, on the machine that
builds the site**, into a file the site commits. It is a Node module: the package names it under the `node` condition
alone, no browser entry point imports it, and it adds no dependency. Its contract and its 31 requirements are
[`src/links/node/REQUIREMENTS.md`](src/links/node/REQUIREMENTS.md) (LKD-1 to LKD-31); each has a test that begins with
its id.

```js
import { markExternalLinks, resolveLinkData, resolveSiteIcons, refreshLinkData, isExternal, displayHost } from '@tanrei/web/links/node';
```

| Function | What it does |
|---|---|
| `resolveLinkData(href, options)` | what a page says of itself, as the values a link card takes: `{ ok: true, data }` or `{ ok: false, href, reason }`. It never rejects for what a network or a destination does |
| `resolveSiteIcons(origins, options)` | origin → `{ src, width, height }`: each site's icon as a small PNG among the site's own files; an origin without one is absent |
| `markExternalLinks(tree, options)` | walks the element tree your renderer has and writes, on each external anchor, `data-external="true"`, the description, and the site's icon as its first child. It parses nothing, opens no connection and writes no file |
| `refreshLinkData({ options, links, origins, mode })` | what a person runs to write the lock file — also the command `tanrei-links` |
| `isExternal()`, `displayHost()` | the pure rules the elements use too, given again here |

### A build never reads the network

`options.mode` is `frozen` unless you say otherwise: every answer comes from `link-data.lock.json`, no name is resolved,
no connection is opened and no file is written. An address with no entry is `not-in-lock`, and the page draws an
ordinary link. So a build is the same with the network and without it, and the words on a published page are words a
person saw in a diff.

The lock file is written by a command a person runs:

```sh
tanrei-links update    # read the addresses that have no entry
tanrei-links refresh   # read every address again
tanrei-links check     # read nothing; exit 1 if the lock file lacks an address (for CI)
```

It reads `links.config.mjs` (or `--config <file>`), a module of the site's own:

```js
// links.config.mjs
export default {
  options: {
    site: ['https://docs.example'],                 // the product's own origins: the same list everywhere
    lock: new URL('./src/content/link-data.lock.json', import.meta.url).pathname,
    pictureDirectory: new URL('./public/link-pictures', import.meta.url).pathname,
    picturePath: (file) => `/link-pictures/${file}`, // the address a page uses for a stored file
    allow: ['example.org', '*.example.net'],        // optional: the only hosts that may be read
    transform: reencode,                            // the site's image step — see below
  },
  links: ['https://example.org/article'],           // addresses drawn as link cards (a list, or a function that finds them)
  origins: ['https://example.org'],                 // origins whose icons external links show
};
```

Commit the lock file and the picture directory together. A refresh is a pull request like any other: each new title is
a line, each new picture a file. Reading the same addresses again to the same words changes nothing.

### In a content pipeline

Where the page is made — every call here answers from the lock file:

```js
const options = { site, lock, pictureDirectory, picturePath };           // no mode: frozen
const icons = await resolveSiteIcons(externalOrigins, options);           // 1. the icons that are recorded
markExternalLinks(tree, { site, base: pageAddress, icons, description }); // 2. mark the tree; nothing moves after first paint
const card = await resolveLinkData(href, options);                        // 3. for an address drawn as a card
if (card.ok) { /* draw the link card from card.data */ } else { /* draw the ordinary link; card.reason says why */ }
```

`description` is the words that say a link leaves the site, in the page's language; it is written as
`aria-description` where the anchor has none. `markExternalLinks()` leaves an anchor that already carries
`data-external` as it is, so an author can turn the marks off for one link.

### What it will read, and how much

| | |
|---|---|
| Which addresses | `https` only, a named host on the scheme's own port, no credentials; `allow` and `deny` are matched before a name is resolved and again for every redirect |
| Never the machine or its network | every address a name resolves to must be public — not the machine itself, a private network, a link-local address (the one that serves a machine its credentials among them), a shared carrier range, nor an IPv6 form that carries one — and the connection is made to the address that was checked, under the host's name; the name is not resolved a second time |
| Certificates | verified as the platform does; there is no option that turns that off |
| Redirects | followed by hand, at most 3, each held to everything above; never down to `http`; to another host only from a forwarder listed in `redirects` (adding or removing `www.` is not another host) |
| The request | one `GET`; no cookie sent or kept, no credential, no referrer; at most 4 at a time and 1 to a host |
| Time and size | 5 s a request and 10 s an address; 512 KiB of markup, counted after decompression; only the head is read, no script is run, nothing the page refers to is loaded |
| Text | a title, a description and a site's name, as text: references decoded once, no tag interpreted, control characters and the characters that override direction dropped, cut to 200, 300 and 60 characters. A site's name that reads as another host is left out |
| Pictures | told from their first bytes (PNG, JPEG, GIF, WebP, AVIF; for an icon also ICO), never from a name or a header; **a vector drawing is always refused**; at most 5 MiB (256 kB for an icon) and 4096 pixels a side, read from the file's own header |

Every limit is in `options.limits`. A refusal or a failure is recorded in the lock file with its reason and reported
once through `options.report` (by default a line on standard error) — the address and the reason, never anything the
destination sent. A build does not fail for it.

### Pictures need the site's image step

The package has no picture codec, and nothing a destination serves is written as it was fetched. `options.transform`
is where the site connects its own image step: it is given the bytes and `{ type, width, height, role }`, decodes them,
and returns them encoded anew. What it returns is checked again and stored under a name made from the digest of its
bytes — never a name the destination gave.

- For a link card's picture (`role: 'image'`) return any of the kinds above, at the size the site serves.
- For a site icon (`role: 'siteIcon'`) the info also holds `size` (32 unless `iconSize` says otherwise): return a PNG
  of exactly that square. Where the icon has transparent pixels and would not be seen on a dark or on a light surface,
  the step is called a second time with `ground` — a color to lay under the picture — because the Link draws no ground
  of its own.

**Without `transform`, a card has no picture and a link has no site icon** — the arrow alone — and the report says so
once. `pictures: 'none'` says the same on purpose; `pictures: 'remote'` returns the destination's own addresses
unread, and every reader's browser then asks the destination for them. `iconOutput: 'data'` answers a site icon as a
`data:` URL of the stored PNG, for a page that must be one file.

### What it does not do

It is not a server, and nothing in the package calls one: a product that looks destinations up while people use it
does that in a service of its own, held to the same rules (the contract is at the end of `REQUIREMENTS.md`). It does
not judge a destination: a page may describe itself falsely, and the host beside the description — which the link card
computes from the address, and which no value can replace — is the reader's check.

## Fonts

Tanrei references fonts **by name and bundles none**. On the web a font stack is delivered as it is written —
`--tanrei-ref-typeface-{brand,plain,mono,icon}` are CSS `font-family` lists, keywords (`system-ui`, `ui-monospace`,
generics) included — so there is nothing to interpret: the browser walks the list.

A product must make the **named** families of its system available, with `@font-face` or a font service, under exactly
the names the tokens use. `tanrei build` lists them. For the default system: `Inter`, `Noto Sans JP`, `Noto Sans`,
`Roboto Mono`, and `Material Symbols Rounded` (with its `FILL`, `wght`, `GRAD`, `opsz` axes) for icons; for `m3-like`:
`Roboto`, `Roboto Mono`, `Material Symbols Outlined`. Note that `@fontsource-variable/*` registers `"Inter Variable"`
and so on — re-register the same files under the token's name. This repository does that for its own sites and tests with
`packages/tools/src/font-faces.js`, from development-only `@fontsource-variable/*` packages (for the default system and
for `m3-like`'s `Roboto` and `Material Symbols Outlined`); none of them is a dependency of this package, and no font is
in its `files`. Icons should use `font-display: block`, so a ligature never flashes as text.

## Elevation

`--tanrei-sys-elevation-*` are `box-shadow` lists. `level0` has no layers and is emitted as `0 0 0 0 transparent`
rather than `none`, because an elevation token is composed into lists (`box-shadow: inset …, var(--tanrei-sys-elevation-level0)`,
Tailwind's shadow stack) where `none` would invalidate the whole declaration.

**The `-inset-ring` companion.** Next to every shadow token — `--tanrei-sys-elevation-level*` and every comp
`…-elevation` — the CSS emitter writes `<name>-inset-ring`: the same layers, with the elevation's ring (the layer with no
offset, no blur and a positive spread) drawn `inset` instead of outside the box. CSS cannot rewrite one layer of a
shadow held in a custom property, so a component that sits two shapes a narrow gap apart reads the companion, where the
rings would otherwise meet through the gap: the button with menu's halves (SPB-26) read
`--tanrei-comp-button-with-menu-<variant>[-<state>]-container-elevation-inset-ring`. An alias's companion reads its target's,
so both follow a step re-valued by a layer (`tanrei build`, a preset). The companion is part of the web's token
surface, like a shape token's `-pill` mark: **a product that overrides an elevation custom property by hand overrides
its companion with it**, or the components that read the companion keep drawing the old value:

```css
.my-product {
  --tanrei-sys-elevation-level1: 0 0 0 1px var(--my-ring), 0 1px 2px var(--my-shadow);
  --tanrei-sys-elevation-level1-inset-ring: inset 0 0 0 1px var(--my-ring), 0 1px 2px var(--my-shadow);
}
```

A value given through a layer and built with `tanrei build` gets its companion from the emitter.

## Tailwind CSS v4 and shadcn/ui

The `tailwind` and `shadcn` outputs of `tanrei build` are mappings onto the custom properties above (no copied values). The
Tailwind theme carries `text-<role>` for the sixteen roles (size, line height, tracking and weight together),
`--text-emphasis-*` (the weight steps), `--corner-smoothing`, `font-icon` / `font-icon-selected`, `duration-press-hold`,
`shadow-level0`, and one variant per choice of kind — `pressed-feedback-ripple:`, `focus-style-glow:` … — built on the
same style container queries.

## Tests

`pnpm --filter @tanrei/web build && pnpm --filter @tanrei/web test` (Playwright; `npx playwright install chromium firefox webkit`
once). The build-time helper `@tanrei/web/links/node` has no page to run in: its tests are Node's own
(`pnpm --filter @tanrei/web test:node`, `src/links/node/test/*.test.mjs`, against the built module). They reach a server on the
machine itself through the fetcher's one seam and never the network. The same script runs `test/*.test.mjs` (the custom
elements manifest against the built elements). The root `pnpm test` runs `test:node` before the Playwright suite
(`turbo.json`), and CI runs it on the first Chromium shard; arguments given to `pnpm --filter @tanrei/web test` reach
Playwright alone. Four projects (`playwright.config.ts`):

| Project | Runs | Why |
|---|---|---|
| `chromium` | everything, including the pixel baselines (`snapshot: …`) | the only engine baselines are recorded and compared in |
| `firefox`, `webkit` | everything except the baselines | behaviour outside one engine: press-hold, the ripple, focus, icons — and, in Firefox, the circular fallback where `corner-shape` is missing |
| `firefox-no-style-queries` | the BTN-10, CHK-11, RAD-13, SWT-9, CRD-10, TXF-7, MAB-10, CHP-10, LST-10, MNU-17, TAB-10 and SNK-7 tests, with `layout.css.style-queries.enabled: false` | the only way left to BE a browser without style container queries: `focus-style: glow` is then drawn through `data-focus-style`, which the element writes on focus |

Tests are driven by the spec's fixtures (`test/harness.ts`) and cite every behavior id. `acmeSystemCss()` builds the
`acme` fixture system, which gives hovered / focused / pressed three different strengths (BTN-3), chooses
`focus-style: glow` (BTN-10) and draws a static icon set. `tab()` / `tabTo()` move keyboard focus the way each browser's
user does (Safari on macOS: Option+Tab). `presetFontFaces()` registers a preset's own faces for tests that draw its
glyphs. `src/per-scheme.test.ts` draws a component color that differs per scheme (a `tone` rule on a Button state) in
light, dark and every contrast level. `src/systems.test.ts` draws every component under every preset — one
`subject('<name>', pick)` line in `SUBJECTS` each; its baselines are `snapshots/systems/<system>/<component>/<fixture>.png`.
`src/shape.test.ts` proves a pill's round caps. A component whose fixtures need a sized container (a divider, a bar), an
anchor element (a badge: the spec's content is the anchor's icon name) or a wrapper (a radio button: each fixture its own
group, in a form and a named radiogroup) gets one entry in `STAGING` in the harness, used by every suite that mounts it;
a fixture's props reach the element under the web's names (`platforms.web.props`: a tab view's `swipeable` is
`noSwipe`); a fixture's `items` become child elements named by `platforms.web.items.<kind>.name`, a group
holding its own, with `itemContent` staging what an item holds (a list avatar's monogram); a list of strings (`values`) is
a JSON array attribute; `test/png.ts` decodes a screenshot for tests that must see pixels (DIV-8) and gives
the color a translucent token is painted as. `mountFixtures(…, { reducedMotion: true })` records a moving component's
still form (LDG-4, PRG-7). `mountFixtures(…, { icons: true })` (and `subject(…, pick, { icons: true })`)
registers the icon faces the mounted system names, so fixtures whose content is a glyph draw it rather than its ligature
text. A page that draws a glyph without asking is given the faces all the same, and `mountFixtures` returns only when
every glyph on the page, in every shadow tree, is one glyph of a face the page loaded (`glyphsDrawn`): never its name in
a fallback face, nor a copy of the font installed on the machine — the Linux recorder has none. A glyph that stays its
name (a name the icon set does not have) fails the mount, naming it. Baselines: `snapshots/`; record with
`TANREI_SNAPSHOT_REASON="…" pnpm --filter @tanrei/web test:update` and look at the images. They are recorded and
verified on Linux, in Microsoft's Playwright image pinned to the lockfile's Playwright (CI's `web` job): an image
recorded on macOS does not match, so record with the **Record baselines** workflow, or in that image
(`../../CONTRIBUTING.md#recording-baselines`).
