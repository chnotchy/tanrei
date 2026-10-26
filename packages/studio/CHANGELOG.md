# @tanrei/studio

## 0.1.0-next.1

### Minor Changes

- d8fb809: **Density is one number, and nothing pressable is drawn below a minimum target — in the tokens. The values do not
  change: at the defaults every resolved value in every system and scheme is what it was, and no picture moves.**
  
  New tokens:
  
  - `tanrei.dial.density`, a number, 1 by default: how much room a product gives its controls and rows. Below 1 they
    are drawn closer, above 1 they get more room. On the web it is `--tanrei-dial-density`, and the heights, paddings
    and gaps that follow it are live CSS, so setting it on `:root` moves them.
  - `tanrei.sys.target.minimum`, 32: the least height (and, for an icon-only control, width) at which anything a person
    presses is drawn. It is fixed: the developer's value, which no dial scales. `sys.target.pointer` (44) and
    `sys.target.touch` (48) keep their values and their rules. The cupertino preset sets the minimum to 28, the least
    height it draws a pressable at.
  - `tanrei.sys.control.height.{extra-small, small, medium, large, extra-large}`: the height ladder, 24 / 32 / 40 / 56 /
    72 — the size unit × 6 / 8 / 10 / 14 / 18 × the density, on the size unit's grid.
  
  Tokens whose rule changes shape (their values do not):
  
  - Every height of a box or a row a person presses (61 component tokens: Button, Button with menu, the input boxes,
    Pagination, Chip medium, Tabs, Segmented button, Menubar, the inline Toolbar, Search's trigger, Main action button,
    the calendar's cells, One-time code input, the date and time picker's range field and wheel row, and the rows of
    tree view, navigation drawer, table of contents, menu, select, combobox, search suggestions, list, list row and
    accordion) follows the density and is never below `sys.target.minimum`; one whose default equals a ladder step
    reads it. Heights nobody presses (Tag, Keyboard shortcut, Badge, the navigation drawer's headings, the plain
    tooltip) follow the density with no minimum.
  - The block paddings of those boxes are derived with `pad` from their box's height (49 tokens); the block paddings of
    boxes sized by their content and the gaps between rows (the table's cells, the description list's facts, the
    timeline's entries, the navigation drawer's items) are multiplied by the density.
  - The gaps that keep a whole target between neighbours — the standard button group's, the docked toolbar's and the
    search bar's — are derived as `sys.target.touch` less the small Button's height, never below zero (16, as before).
  
  What else changes:
  
  - The rule language: `pad` takes an optional `by`, a coefficient on its padding, which a layer's `scale` multiplies;
    a size a layer adds to a component measures its `pad` paddings from its own height. A size a layer adds by scaling
    a floored height keeps the floor (a Button size scaled 0.75 from small is held at the minimum, 32).
  - The build checks the target floor in every system: the three target tokens at WCAG 2.5.8's 24px or more and every
    floored height at the minimum or more (an error in the default system, a warning in a product layer, information
    in an imitation preset), and `pointer` and `touch` at the minimum or more and the density above zero (refused in
    every system, a product build too). `targetFloors` and `TARGET_THRESHOLDS` are exported from the invariants.
  - The native token types gain `density` among the dials and `minimum` among the targets (`TanreiDials`, the target
    struct of each platform): code that constructs them by hand adds the new fields.
  - Theme Studio lists the density among the dials (0.75 to 1.5), and its rule editor keeps and shows a `mul`'s
    `times`, `round` and `min` instead of dropping them when a rule is edited.
  - On the web, a product of the density gains a ten-thousandth of its unit before it is rounded, so a height on a tie
    of its grid (4 × 10 × 0.95 = 38) rounds upward in every browser, as the build rounds it; Firefox, which holds the
    density as a 32-bit float, rounded it down.
  - `sub`-derived gaps get no `-pill` companion in the web's stylesheets; only a `sub` that is a corner inside another
    does.
- a25945b: **Theme Studio: Export, and the banner of a shared layer.**
  
  - **Export**, in the bar, opens a side sheet. Its first line says whether the schema, the token engine and the build's
    checks accept the file (problems stop the download; warnings lead to Accessibility). A layer on an example of the
    theme gallery (m3-like, cupertino, m3-expressive-like) **depends on the example** by default, and can instead
    **write every value**: the file then holds what the example gives as well as what you changed, extends what the
    example extends, and builds to the same stylesheet, documents and warnings as the file that depends on it. A component
    that lives in the example (the FAB menu) is still included from it. Three tabs follow: **File** (copy, or download as
    `<id>.system.json`), **CSS** (the declarations of the stylesheet `tanrei build` writes for the web that differ from
    the base system's, as the build writes them, and the whole `<id>.css` to download) and **What next** (the commands,
    each one the CLI takes as it is, and a link to the layer to copy).
  - **No one-line command.** The CLI takes no layer in a command (`tanrei init` takes an id and a shipped system), so
    Export shows none: What next runs `tanrei init`, then puts the downloaded file in place of the one it writes.
  - **The banner of a shared layer** replaces the earlier notice. It says which layer came with the link and what it is
    built on, names the visitor's own layer, and keeps it until they keep the link's layer, edit it, or go back to theirs;
    it offers Export, so a layer that was sent can be taken as a file without replacing anything. A link opened where
    nothing was kept now shows the banner too, which may be closed.
  - The file under every panel keeps its id, name and checks, with Export and Start over; its JSON, copy, download and
    next steps moved to Export. `mountStudio` takes `links.start` (the page that takes a product from a layer to every
    platform), and the page's API has `openExport(tab)` and `closeExport()`.
- 19c402d: **Theme Studio previews the layer on five screens built from Tanrei's components.** The preview no longer shows a
  button and a few samples: it draws an **overview** of every kind of component (with the system's own text styles,
  icons, intents, steps and the layer's own tokens), a **dashboard**, a **settings form**, a **list and its detail**, and
  a **documentation page**, chosen from the preview's bar. Every component on them follows the layer, and the overview
  draws one sample per variant and size a component declares — buttons, cards, tabs, chips, tags, callouts — a variant
  or a size the layer adds included. The screens' text is a product's, in each of the Studio's six languages, with
  numbers, money and dates formatted for the language.
  
  - **How it is seen.** Light, dark, or the two side by side (one large pane by default), and the three contrast levels as
    the documentation's header offers them. None of it is the layer's: it is remembered in this browser and never saved
    in the file. A screen is drawn once, and switching screens or modes moves what exists.
  - **What a setting reaches.** `highlight(ids)` outlines, for a moment, the parts of the screen that read any of these
    tokens or a token that follows one of them, and says how many there are; `clearHighlight()` takes the outline off.
    It is there for the Studio's controls to call while one is hovered or focused (`ctx.highlight`), and for a script
    (`window.tanreiStudio.highlight`).
  - The host loads `@tanrei/web/table.css` and `@tanrei/web/prose.css` with the Studio's other stylesheets: the screens
    hold a table and a page of text (the standalone app and the docs page do).
  
  **Breaking (Studio dictionaries).** A language file gains `screens` and loses the old card sample's words
  (`sample.cardTitle`, `cardBody`, `link`, `cancel`, `save`).
- 0c59e32: **Theme Studio is a tool of its own page.** On the docs site it moves to `/studio/` (and `/<language>/studio/` in each
  translation): the whole window, with the Studio's own bar and none of the documentation's header or navigation. The
  page that held it, Foundations › Theme Studio, is now a short page about the tool that links to it.
  
  - **The frame.** A bar across the top — the host's brand and items, **undo** and **redo**, the file's state — and under
    it the rail of levels, a large preview and, on the right, the panel of what the level edits. Each column scrolls by
    itself. The panel is resized by a handle (Tanrei's Handle: dragged, or from the keyboard — the arrow keys, Home and
    End, Enter to its least and back), and the width is kept in the browser, for each level apart: Every token and
    Source keep their wider start. In a narrow window the three stand in one
    column. The controls are the ones the Studio had; they moved into the frame as they were.
  - **Undo and redo** step through what was committed, from the bar or with ⌘Z and ⇧⌘Z (Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y
    elsewhere); in a field that holds text the keys stay the field's. With a file behind the Studio (`tanrei studio`),
    each step is saved like any other edit.
  - **The layer is in the address.** On the docs site the layer is written into the page's fragment (`#layer=…`, the
    layer file's text compressed and in base64url), so a link copied from the address bar opens the Studio on the same
    layer, in any browser. A link never writes over the layer a browser kept: the Studio shows the link's layer under a
    notice, keeps the visitor's own until they edit the link's or choose **Keep this layer**, and **Back to my layer**
    returns to theirs.
  
  **Breaking (`mountStudio`).** The Studio now takes the whole page it is mounted in and draws its own bar; a host gives
  its items to that bar with the new `bar: { start, end }` option instead of drawing a bar of its own (the standalone
  app's brand, file, language and theme are now in the Studio's bar). `address: true` keeps the layer in the page's
  address. The Studio no longer writes `data-ts-mounted` on the document's root, and its stylesheet no longer sets
  `--sl-content-width`: a host gives it a page of its own.
- 6224e55: **Theme Studio: a rail of the look, the panel it opens, and Inspect.** The four levels (Essentials, Groups, Every
  token, Source) are gone.
  
  - **The rail** lists what a layer holds. First the nine rows of the look, in the order of how much of it they change:
    brand color, gray, typeface, size (density and the size unit, with the least target), corners, corner smoothing,
    icons, press feedback and focus. Each says what it holds now and draws a small sample in the layer itself. Then the
    rest: the base system, the eight dials, every palette, each component, every behaviour, your vocabulary, the layer's
    own words, and accessibility. Pressing a row shows its controls in the panel on the right, where Groups' panels now
    stand, each with its row. The row the panel shows is marked as the current one. The file (its id, the checks, copy
    and download) stays at the foot of every panel, and the preview's warnings count opens Accessibility.
  - **Lock and shuffle.** Each row has a lock. The bar's **Shuffle** gives every row that is not locked another of its
    usual values, written as that row's own controls write them, in one step to undo. The locks are kept in the browser.
  - **Inspect** opens over the panel, wider, at **Tokens** (the token tree and the chosen token's editor, then the
    pattern rules) or **Source** (the layer file). It is a toggle in the bar, and opens at the tab it was last at. A link
    to a token, such as a component's "Every token of it" or a token named in a warning, opens Inspect at that token.
    The panel's width is kept apart for the sections and for each tab of Inspect.
  - In a narrow window each list of the rail is one line that scrolls by itself, above the preview and the panel.
  - The words are in the six languages.
  
  **Breaking (`mountStudio`'s API).** `setLevel` is gone: `show({ section })` shows a section (`color`, `neutral`,
  `typeface`, `size`, `radius`, `smoothing`, `icons`, `press`, `focus`, `base`, `dials`, `palettes`, `components`,
  `behavior`, `vocabulary`, `about`, `a11y`), and `show({ inspect: 'tokens' | 'source' })` opens Inspect. `getState()`
  reports `section`, `inspect` and `locks` in place of `level`, and `shuffle()` shuffles. The Studio's root says
  `data-section` and `data-pane` in place of `data-level`. What the browser keeps changes shape: a section, Inspect's
  tab, the locks and a width for each pane.
- 4c0a9a6: **Theme Studio: the start point, first in the bar.** It names what the layer starts from, and its menu offers the
  others: **Tanrei**, the default system; **Core**, Tanrei's root layer, listed and not offered yet — it still holds the
  default system's values, and becomes a blank start once they are neutral — with that reason on the item; and, under
  **Theme gallery examples**, m3-like, cupertino and m3-expressive-like, each marked as an example, not an official
  design. Another start keeps the layer's id, name and description on that system's defaults.
  
  - **Import a file…**, the menu's last item, loads a `<id>.system.json` in the layer's place through the browser's own
    picker. A file that is not JSON, that the schema refuses, or that extends a system the Studio does not have is not
    loaded, and the top of the panel says why, problem by problem. A file the schema accepts is loaded, and what the
    token engine and the build's checks find in it is listed there.
  - A layer that holds changes asks before a new start or a file replaces them, and each is one step to undo. The Base
    system panel asks by the same rule (a choice of components is a change too).
  - The page's API has `startFrom(id)`; `studio.startPoints()` and `studio.holdsChanges(layer)` are the core's.
  - The docs' Theme Studio page says where a layer starts, in every language.

### Patch Changes

- 908d897: A `contrast-pick` on a color role whose candidates are `ref.palette` tones no longer fails the build with
  `unknown color role`. The role aliases the tone it picks, and the per-state component colors that read the role (a
  filled button's label on `on-primary`, for one) now follow that alias into the palette. Before, they looked the tone
  up as a role. In Theme Studio, a layer that sets such a pick now previews instead of reporting the error.
- cf6aeb9: Theme Studio's stylesheets are loaded by the page that hosts the Studio, not by its entry module.
  
  - `@tanrei/studio` no longer imports its stylesheets from its entry. The host loads them with the page that mounts the
    Studio: `@tanrei/web/icons.css`, `tree-view.css`, `accordion.css` and `description-list.css`, and
    `@tanrei/studio/studio.css`. The standalone app does this in `app/main.ts`, and its built stylesheet is unchanged.
  - Documentation site: the Studio's stylesheet is linked by the six Theme Studio pages only (21.8 KB). Before, a 101 KB
    sheet was linked from 755 of the 845 pages. The Theme Studio page draws exactly as before.
- 4570f3f: **Theme Studio: the shuffle and the open lock draw as icons on the docs site.** The site's icon font is cut down to the
  glyphs its sources declare, and the bar's `shuffle`, the rail's `lock_open` and the focus row's fallback were written
  where the glyph list is not read, so until the full icon file loaded they drew as their letters. Each glyph the Studio
  draws is now declared in a constant, and a test refuses a glyph the Studio draws that no list has.
- 3f33ea8: **Theme Studio: the Base system panel shows the base of a layer with every value written out.** Such a layer extends
  Tanrei's root layer, `core`, which is not offered as a base, so the panel showed no choice selected and no description.
  The layer's own base is now always among the panel's choices, selected, with its description; the root is listed for
  that layer only.
- 7459f5b: **Theme Studio: a pasted layer is loaded as a file is.** The layer pasted under the file panel (**Import a layer**)
  goes the way of the start point's **Import a file…**, through the same function: over a layer that holds changes it asks
  first; what is not JSON, what the schema refuses, or a layer on a system the Studio does not have is not loaded, and the
  callout at the top of the panel says why; a layer the schema accepts is loaded, and what the token engine and the build's
  checks find in it is listed there. Before, it replaced a layer with changes without asking, said what kept a layer out
  under the field, and said nothing of what the engine found in one it loaded.
  
  - A new start, a loaded layer and a shuffle are each a step of their own to undo, however soon they follow another
    commit: two loads half a second apart were one step.
  - The page's API: `importLayer(input)` loads the layer the same way, without asking, and throws what kept it out.
  - The import's "Layer loaded." is gone from the dictionaries: a pasted layer is announced as a loaded file is.
- Updated dependencies [50a3f0e]
- Updated dependencies [2cf22e1]
- Updated dependencies [73d9b8e]
- Updated dependencies [a03d145]
- Updated dependencies [132b7ce]
- Updated dependencies [4e905c9]
- Updated dependencies [bf5b6de]
- Updated dependencies [f1e78ee]
- Updated dependencies [8d0e2b0]
- Updated dependencies [f799b0a]
- Updated dependencies [f6a47af]
- Updated dependencies [9fd3a23]
- Updated dependencies [02031c4]
- Updated dependencies [2b1b8a9]
- Updated dependencies [98e34cc]
- Updated dependencies [48873d6]
- Updated dependencies [930031d]
- Updated dependencies [6b01d3e]
- Updated dependencies [08d45b6]
- Updated dependencies [bf096fd]
- Updated dependencies [68c45ed]
- Updated dependencies [d5e0409]
- Updated dependencies [d0d5136]
- Updated dependencies [5c2597b]
- Updated dependencies [16bbd73]
- Updated dependencies [6d5fe67]
- Updated dependencies [01640f4]
- Updated dependencies [f535d8f]
- Updated dependencies [671b2ee]
- Updated dependencies [c96a911]
- Updated dependencies [6636594]
- Updated dependencies [16608f6]
- Updated dependencies [90e6108]
- Updated dependencies [88c14f0]
- Updated dependencies [de75588]
- Updated dependencies [d97b53b]
- Updated dependencies [aae9ddd]
- Updated dependencies [908d897]
- Updated dependencies [90c0631]
- Updated dependencies [fda53ad]
- Updated dependencies [78932fb]
- Updated dependencies [d8fb809]
- Updated dependencies [2e4a5ab]
- Updated dependencies [3b0cc7e]
- Updated dependencies [0dd718d]
- Updated dependencies [108305a]
- Updated dependencies [aacef9e]
- Updated dependencies [3bbfeaf]
- Updated dependencies [0a98a97]
- Updated dependencies [25dd0d0]
- Updated dependencies [8405fc9]
- Updated dependencies [7e694f4]
- Updated dependencies [a3f8151]
- Updated dependencies [0a27acd]
- Updated dependencies [e690d47]
- Updated dependencies [db60c6c]
- Updated dependencies [e9038b1]
- Updated dependencies [991095d]
- Updated dependencies [bbd7afb]
- Updated dependencies [654a435]
- Updated dependencies [8d5a636]
- Updated dependencies [66ad9dd]
- Updated dependencies [74c9435]
- Updated dependencies [f744584]
- Updated dependencies [b0e55fb]
- Updated dependencies [8c13679]
- Updated dependencies [61cebf8]
- Updated dependencies [6d89bfe]
- Updated dependencies [377bc4a]
- Updated dependencies [41aabb3]
- Updated dependencies [f4248ab]
- Updated dependencies [3990b23]
- Updated dependencies [df119df]
- Updated dependencies [b921047]
- Updated dependencies [c3e2126]
- Updated dependencies [d418520]
- Updated dependencies [e711cc1]
- Updated dependencies [a72bfbb]
- Updated dependencies [2dd0327]
- Updated dependencies [da87128]
- Updated dependencies [397cd93]
- Updated dependencies [aaba9dc]
- Updated dependencies [abc8133]
- Updated dependencies [0a27acd]
- Updated dependencies [6e9bc90]
- Updated dependencies [1a22c3c]
- Updated dependencies [16c656e]
- Updated dependencies [5287d31]
- Updated dependencies [7536862]
- Updated dependencies [7495506]
- Updated dependencies [72469f9]
- Updated dependencies [3188580]
- Updated dependencies [4d18319]
- Updated dependencies [a0f001b]
- Updated dependencies [71dad17]
- Updated dependencies [073a8bd]
- Updated dependencies [712e7d2]
- Updated dependencies [d1611cc]
- Updated dependencies [c13331a]
- Updated dependencies [0a27acd]
- Updated dependencies [727c99d]
- Updated dependencies [58937c0]
- Updated dependencies [2fe1f5a]
- Updated dependencies [c9d76e2]
- Updated dependencies [45ca156]
- Updated dependencies [19e74c3]
- Updated dependencies [25ecc35]
- Updated dependencies [fb1ce26]
- Updated dependencies [66f1b1c]
- Updated dependencies [07507aa]
- Updated dependencies [8e7e057]
- Updated dependencies [1c85b08]
- Updated dependencies [17a9754]
- Updated dependencies [dd76e41]
- Updated dependencies [9fd9aba]
- Updated dependencies [b1fb04c]
- Updated dependencies [7072d6a]
- Updated dependencies [75a89b5]
- Updated dependencies [dda6ec1]
- Updated dependencies [2a2437f]
- Updated dependencies [6016e87]
- Updated dependencies [bc9b8bd]
- Updated dependencies [14c4ed6]
- Updated dependencies [fba98d4]
- Updated dependencies [db7055c]
- Updated dependencies [aa0133e]
- Updated dependencies [2087222]
- Updated dependencies [155b5de]
- Updated dependencies [6e23003]
- Updated dependencies [5368526]
- Updated dependencies [afb26f3]
- Updated dependencies [c927a0a]
- Updated dependencies [b1ddfd8]
- Updated dependencies [590e070]
- Updated dependencies [615f0c9]
- Updated dependencies [05e39e7]
- Updated dependencies [0424ae9]
- Updated dependencies [fefe825]
- Updated dependencies [d31aedb]
- Updated dependencies [ca2160c]
- Updated dependencies [b1ba89f]
- Updated dependencies [cb29df6]
- Updated dependencies [d0de4b8]
- Updated dependencies [7139c1d]
- Updated dependencies [59c520f]
- Updated dependencies [9bd59f4]
- Updated dependencies [cd48cda]
- Updated dependencies [e0810e9]
- Updated dependencies [1f0c823]
- Updated dependencies [77b361c]
- Updated dependencies [0a27acd]
- Updated dependencies [0646d07]
- Updated dependencies [0a27acd]
- Updated dependencies [b9c5fbe]
- Updated dependencies [348b6be]
- Updated dependencies [e088124]
- Updated dependencies [d43dd75]
- Updated dependencies [2442137]
- Updated dependencies [754642a]
- Updated dependencies [3589b98]
- Updated dependencies [552dad2]
- Updated dependencies [d6814f1]
- Updated dependencies [37db622]
- Updated dependencies [2d1369b]
- Updated dependencies [afb4e69]
- Updated dependencies [26e14d1]
- Updated dependencies [07c7d78]
- Updated dependencies [f669310]
- Updated dependencies [11e9c59]
- Updated dependencies [f421db8]
- Updated dependencies [bd70c47]
- Updated dependencies [669cd45]
- Updated dependencies [0f0e1eb]
- Updated dependencies [1e0fe14]
- Updated dependencies [b787a0c]
- Updated dependencies [5029351]
  - @tanrei/token-engine@0.1.0-next.1
  - @tanrei/tokens-build@0.1.0-next.1
  - @tanrei/web@0.1.0-next.1

## 0.1.0-next.0

### Patch Changes

- Updated dependencies [f181fc2]
  - @tanrei/web@0.1.0-next.0
  - @tanrei/token-engine@0.1.0-next.0
  - @tanrei/tokens-build@0.1.0-next.0
