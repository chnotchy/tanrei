# @tanrei/studio

## 0.1.0-next.1

### Minor Changes

- 64de2c3: **Breaking: the default system's control height is 36, was 40.** `tanrei.dial.control.height` is 36 in the core, and
  the minimum target `sys.target.minimum` stays 36. The ladder `sys.control.height.*` is 20 / 28 / 36 / 52 / 68 (was
  24 / 32 / 40 / 56 / 72), and every height that reads it moves with it in the default system and in every product built
  on it that does not set the dial:
  
  - **Controls and rows of the default size are 36 tall, were 40**: the Button, the button with menu, the segmented
    button, the input boxes (stacked, filled, outlined), the search bar and its trigger, the one-time code cells, the
    calendar's view toggle, days and years, the date-time picker's range fields, menu items, select and combobox options,
    search suggestions, tabs, navigation drawer rows and collapsed cells, tree rows, table-of-contents rows, list items
    and one-line list rows, accordion headers, table rows, pagination items, the menubar, an inline toolbar's items, the
    carousel's playback control, and the round state layers of the checkbox, the radio button, the switch and the
    slider's handle.
  - **The minimum target is the least area a press is taken from**, no longer the least height anything pressable is
    drawn at. A control that stands alone reads the step of its size with no floor: a small Button, button with menu,
    segmented button, input box, pagination item or tab is drawn at the small step, **28** (was 36, held at the
    minimum), and its hit area reaches the 36 target past what it draws. The icon-only Button is 28 / 36 / 52 (was
    36 / 40 / 56). A row that touches its neighbours — a menu's, a select's or a combobox's option, a search suggestion,
    a list item, a tree row, an accordion header, a navigation drawer row, a table-of-contents row — cannot reach over
    them and is still held at 36 at its small size.
  - **The gaps that keep a target whole follow**: a standard button group's gap, a docked toolbar's, the search bar's
    container gap and the snackbar's controls gap are the touch target less a small Button, 36 − 28 = 8 (were 0, and 4
    for the snackbar); two small Buttons a floating or an inline toolbar lays out stand 8 apart, and the search bar's
    small clear button 4 from the next. m3-like and cupertino keep their snackbar gap.
  - **Large is 52, was 56**; the main action button is 36 / 52 / 92 (was 40 / 56 / 96); list rows of two and three
    lines are 56 and 76 (were 60 and 80); a small table row is 28 (was 32).
  - **A tag and a keyboard shortcut keep heights of their own**: their medium size is six size units (24), where it read
    the ladder's extra-small step, which would have been 20 at 36, as low as their small size and too low for a key cap's
    text; both are sized by their text and are no control. No value of theirs changes.
  - **Block paddings give up half of what a box loses below the control height's reference of 40** (unchanged rule), so
    one line still fits: e.g. a Button's padding-block is 4 at medium and large (was 6), a list row's 6 (was 8), a
    table cell's 7 and 4 (were 9 and 6). The button with menu's trailing padding now follows the height of each size as
    its block padding does (4, 6 and 14 in the default system), so the trailing half stays a square of its
    height; so does the main action button's start padding beside its icon, and a small tab's indicator padding (0).
  - **Every hit area is at least 36**: `sys.target.minimum`, `.touch` and `.pointer` are 36. Under a 48 target medium
    icon-only Buttons stand 12 apart (were 8) and small ones 20. The search view's back button now stops its hit area
    at the middle of the gap toward the input, as SRC-25 says, and keeps the query leading-icon.gap from its glyph
    (SRC-1).
  - **An outlined color input draws its swatch inside the box of its icon's size**, no taller than its container less the
    floated label's text and the focused edge (22 at 36), so that the label it floats onto the edge never stands over it
    (CLI-15, CLI-25); the value starts where it did.
  - **Theme Studio's Essentials raises the control height** past the one it scales in proportion with spacing until every
    height holds its padding and its line (type 17 and spacing 10 give 47, not 45), and its Size row shows the heights a
    control of each size is drawn at (28 / 36 / 52).
  - **What keeps its own size does not move**: icons, tags and key caps, the calendar's cell, a wheel's row, a tab with its icon above its
    label, the chip, bars (app bar, navigation bar, toolbars), avatars.
  - **The presets keep their originals**: m3-like and cupertino set `tanrei.dial.control.height` to 40 in their own
    layers, so no token value of either changes.
  - The native platforms' generated systems carry the new values; their implementations follow the previous revision
    of these components, and their CI is paused.
  - **Web baselines of the default system move widely** with this change; they are not recorded in it.
  - The docs pages that state default sizes say the new values in all six languages.
- 435ebe9: **One control height: `tanrei.dial.control.height`.** A product sets the height its controls and rows are drawn at in
  their default size once — `{ "$value": { "value": 32, "unit": "px" }, "reason": "…" }`, or `--tanrei-dial-control-height`
  at runtime — and every height that reads it follows.
  
  - The ladder `sys.control.height.*` is whole size units from it (`add`): extra-small H − 4u, small H − 2u, medium H,
    large H + 4u, extra-large H + 8u — 24, 32, 40, 56 and 72 at the default of 40, as before. **No value moves in any
    shipped system or scheme**, and no picture changes. The size unit is now the distance between the sizes and the scale
    of icons; it no longer sets the default height.
  - Drawn at the control height today: the Button, the button with menu, the stacked input box, the menu bar's titles,
    pagination, the search trigger, the inline toolbar and the calendar's days — marked
    `"dev.tanrei.aligned": "control"`. The menus, options, tabs, navigation items, tree, list and table rows, accordions,
    the other fields and the selection controls follow in changes of their own; until then they keep their heights.
  - A block padding measures its box from the control height at 40 (`dev.tanrei.reference`): under it, the box gives up
    half of what it lost from each padding; above it, the box grows and its paddings keep their values.
  - The build refuses a `sys.target.minimum` above the control height in every system, a product layer's too, and holds
    the marks: a marked height reads the medium step, and every pressable height of the core reads a step of the ladder,
    save those it lists as not on it yet.
  - Theme Studio's Size row leads with the control height (24 to 64), with the heights it gives and a Button, a field, a
    menu row and a tab drawn at it; a control height set under the minimum takes the minimum down with it, and moving the
    spacing in the essentials moves the control height in proportion. `tanrei init`, the CLI's and the MCP server's texts
    and the docs name it, and the dial tables list eight dials.
  - A product that gives its controls more air than the default (a larger `dial.space.unit`) raises the control height
    with it; the heights not yet on the ladder still follow the size unit.
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
- be82919: **`tanrei.dial.density` is removed, and `mul` has no `times` term.** This breaks a layer that sets the density: it no
  longer validates. One control height, set once, follows in the next change; until then the heights follow the ladder
  `sys.control.height.*` (the size unit × a step) and the minimum target.
  
  - The density multiplied bases of different sizes (10, 12 and 14 size units), so no one value lined controls and rows
    up, and rounding each base apart drew some rows taller at a lower density. Every height, block padding and gap that
    was multiplied by it now takes its value at the default density of 1: **no value moves in any shipped system or
    scheme** — every resolved token of core, tanrei, m3-like, m3-expressive-like and cupertino, in all six schemes, is
    what it was. No picture changes.
  - The gaps between rows (a description list's facts, a timeline's events, a navigation drawer's cells) and a table's
    block paddings follow the spacing dial, `dial.space.unit`, as every other gap does.
  - `mul` is `{ of, by, exp?, round?, min? }`: a rule that writes `times` is refused. `pad` measures its box's change from
    the height without its `min`.
  - The web loses `--tanrei-dial-density`; set `--tanrei-dial-size-unit` or `--tanrei-sys-target-minimum` to move the
    heights at runtime. The native platforms' `TanreiDials` and the React Native `dials` lose `density`.
  - Theme Studio's Size row holds the size unit, with the heights it gives, and the minimum target; the shuffle picks
    another size unit. `tanrei init`, `tanrei validate`, the MCP server's philosophy and `validate_layer` no longer name
    the density, and no longer refuse a density of zero.
  - The docs' "Size and density" page shows the heights at several size units, and the dial tables list seven dials.
- c79ff06: **The standalone Theme Studio (`tanrei studio`) has a bar of one line**, wide and on a phone, as the documentation's
  Studio page has. Its language and its theme are chosen in one menu, a glyph at the end of the bar (it was a select and a
  button). The line beside the brand that repeated the file's path, what it extends and its targets is read, not drawn —
  Inspect bears the file's name — unless it says there is no file behind the Studio, or why the session could not be read.
  On a phone the brand, a link to the same page, is left out; the file's state is its dot (its word is read), and Build
  shows its glyph alone, named by its label and shown its name by its tooltip. Build is made once now, so a build that is
  running keeps its button disabled while the file's state changes.
- 3a7e8b2: **Theme Studio: Export has a Command tab.** Between File and CSS, it shows the commands that take the layer into a
  product as one block to copy — `npm install --save-dev @tanrei/cli`, `npx tanrei init --from <id>.system.json` with
  the downloaded file, `npx tanrei build` — and says what to run instead in a product that already has `tanrei.json`.
  With a file behind the Studio (`tanrei studio`) it shows `npx tanrei build` alone. What next runs the same
  `init --from` step instead of `tanrei init <id> --extends …` followed by saving the file over the starter; the step
  that put the file in place by hand is gone. The command takes the file, never the link. The page's API takes
  `openExport('command')`.
- f9df398: **Theme Studio's Export sheet says what the checks found in one line, and keeps its actions at its foot.** The line is a
  glyph in the status's color and a sentence (with warnings, the way to Accessibility at its end; with problems, the first
  of them under it), where it was a callout. **Download** and **Copy link** are the sheet's actions, at its foot whichever
  tab is shown, where each tab had its own buttons: Download saves the file as it is exported, named with the file it
  saves, and waits while the file has problems; Copy link is offered where the page's address holds the layer. What
  either did is said in a snackbar over the sheet. The What next tab no longer holds a download or a share section. The
  documentation's Theme Studio page says where the two actions are.
- a25945b: **Theme Studio: Export, and the banner of a shared layer.**
  
  - **Export**, in the bar, opens a side sheet. Its first line says whether the schema, the token engine and the build's
    checks accept the file (problems stop the download; warnings lead to Accessibility). A layer on an example of the
    theme gallery (m3-like, cupertino) **depends on the example** by default, and can instead
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
- 7600fe2: **Theme Studio, laid out as its approved design.**
  
  - **The bar** reads as a tool's: the start point, undo and redo, the shuffle and Inspect at its start; at its end what
    goes out of the Studio — what the build's checks say of the layer (the count that opens Accessibility, moved here
    from the preview), **Share** and **Export**.
  - **The preview** is a stage: the screens stand on the Studio's own ground, each a page with its edge, light and dark
    side by side as two pages. Its bar is one line where the preview has the room — the screens at its start, and at its
    end how they are seen, said once not to be saved in the file, then the scheme, the contrast and the emphasis.
  - **The rail** is headed "Theme". A row that holds what the start gives says *default* after its value; the Size row
    says the control height and the minimum target (the size unit stays in its panel); a gray with no chroma says
    *neutral*, and no corner smoothing *none*. Each of the rest — the base system, the dials, the palettes and the others
    — has a line under its name that says what it holds. The words are in the six languages.
  - **Nothing is asked before a step that replaces the layer.** A new start (from the bar or the Base system panel) and
    a file loaded are each one step, said in a snackbar whose **Undo** takes it back until the next commit. **Reset**,
    beside undo and redo, takes the layer back to what its start gives, its id kept, the same way. The start point's
    menu lists the examples under **Theme gallery**.
  - **The panel holds the row alone.** The file's card at its foot is gone: the file's id (with `.system.json` after it)
    and its name are in **Export**, under its first line, and the checks are that line. The brand color's and the gray's
    panels no longer name the file's keys in their heads.
  - **Inspect's button bears the file's name** (`<id>.system.json`, or the file behind `tanrei studio`, whose save
    state no longer repeats it), and is named Inspect with it; Inspect opens under a line that says it is the file and
    the tokens it settles.
  - A sentence that names one thing twice (Export's "depends on M3-like … when M3-like changes") shows it in both places.
  - **A narrow window** gives the preview the window: the rail is one line at its foot that scrolls by itself, and a row
    opens its panel between them as a sheet, with the row's name and a button that closes it. The rail then stands after
    the panel in the page, so that the keyboard meets the parts in the order they are drawn.
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
- eb91731: **Theme Studio's preview bar is one line beside the rail and the panel of a window 1440px wide**, in each of its six
  languages: the screens' tabs, then light, dark or side by side, then a button that opens the contrast (three levels)
  and Emphasized in a menu — they were three tabs and a checkbox in the bar, which put the bar on two lines. The note that
  none of this is saved in the file names the group, and is drawn where the preview has the room for it. The Spanish name
  of the documentation screen is «Documentación».
- 9d9eb5c: **Theme Studio, closer to its approved design.**
  
  - **The overview draws each kind of component as a product uses it**, in compact panels, in reading order across
    as many columns as the preview's own width gives each a readable one — the notice's headline on one line, the card's
    sentence in at most two; a form's actions may take a second row — up to three: two beside the rail and the editing
    panel in a window 1440px wide, three from about 1700px, one on a phone. A form's actions (Save,
    Save draft, Cancel, Details) and a row of icon buttons; a field and a select; the selection controls; the period tabs, chips and status tags; a notice with a progress bar and two people; a card; a
    menu. A variant the layer, or the system it starts from, adds is drawn in its component's panel beside them; the
    Button's sizes, one at each size the system declares, stand with what the system is made of under the panels. The
    overview no longer draws every variant of every component.
  - **Each row of the rail, and each item after them, ends in a chevron**: it opens its controls. The Size row draws
    the height glyph, Press feedback and Focus a glyph of their own whatever they hold, and what a row holds is said in
    the Studio's language: the press feedback and the focus style by their words for the vocabulary's choices (オーバーレイ,
    リング…), while the panel where one is chosen lists the vocabulary's names.
  - **A rail row's value is shown whole**: a long one wraps under the row's name instead of being cut, an icon set is
    named by its style beside its weight ("Rounded · 300"), and the brand color's "none" is shorter in Japanese.
  - **The Size and Corners panels name each number by what it does**: the token ids under the names (`dial.control.height`,
    `sys.target.minimum`…) are gone from the panels the rail's rows open, and stay in Dials, Inspect and Export.
  - **The editing panel is as wide as a design tool's property panel**: 20rem at every window (it was 30% of the window,
    up to 30rem), so that a wider window gives its room to the preview; the handle still widens it. At that width a
    number stands under its row's name, token id and note instead of beside them; a palette's choice, reset and
    removal go under its name, a fixed tone's color takes a row of its own, and the button that declares a palette
    goes under its reason. Two hints are shorter so that they fit their fields there: the family field's ("e.g. IBM
    Plex Sans") and the reason a vocabulary addition asks for ("Why this product needs it").
  - **The dashboard's four figures** stand in one row where each has room for its largest amount, else in two rows of
    two (never three and one left alone), else one under another; the three figures under a list's selection in one
    row or in a column. They follow the width of the content they stand in, not the window's. The dashboard's table of
    orders no longer breaks a customer's name one character to a line in a narrow pane: it scrolls sideways in its box.
  - **On a phone the bar is one line**: undo and redo, Inspect, Share and Export show their glyphs alone, named by
    their labels, and the start point the start's name; reset, the shuffle and the checks' count are left out there (the
    checks are Export's first line, and the rail's Accessibility). Every control of the bar that shows a glyph alone has
    a tooltip. The documentation's Studio page puts its link to the page about the tool beside the tool's name, as a
    glyph, and on a phone shows its brand as the mark. The preview no longer grows wider than a phone's window when the
    screens' tabs do not fit it.
  - **Inspect opens as a modal side sheet over the Studio**, as Export does, as the approved design draws it: under its
    head, the line that says it is the file and the tokens it settles, its two tabs — **Tokens** and **JSON** (was
    *Source*) — and at its foot a way on to Export. It is wide enough for the token tree and the editor side by side; the
    panel keeps its row (and its width) under it, and closing it goes back there. The draft's badge says "The JSON has
    invalid edits", and its help no longer speaks of "levels", in the six languages; the hint of a pin's reason is
    shorter, so that it fits the sheet on a phone.
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
- 6631293: **Theme Studio: the Size row sets the minimum target, and shows the heights the density gives.**
  
  - **Minimum target** is a control of its own in the Size row, a number and a slider over `sys.target.minimum`, a whole
    pixel from 24 (WCAG 2.5.8, the least the build holds) to 48. It is written as a dial is: the base's own value writes
    nothing, and a reason is asked once it is changed. A number past either end is brought within them, so the layer
    never holds a minimum the build refuses. On a system whose touch or pointer target is set apart from the minimum
    (m3-like and cupertino: 44), the control ends at that target, because the build refuses a minimum above either.
    The token editor that stood in a fold in its place is gone; Inspect still edits the token.
  - **Density** shows the heights it gives, under its slider: the control ladder's small, medium and large, each read
    through the minimum target, as the token engine works them out, while the value is dragged too. A height the
    minimum holds up says so, with the ladder's own height: "small 36px (32px, raised to the minimum target)".
  - **The size unit no longer takes the targets with it.** Its note says "control heights and icon sizes", and the
    row's help says that neither dial moves the minimum target. The rail's value of the row names the minimum
    (`density 1 · 4px · target 36px`), and the row's reset takes back all three values.
- 4c0a9a6: **Theme Studio: the start point, first in the bar.** It names what the layer starts from, and its menu offers the
  others: **Tanrei**, the default system; **Core**, Tanrei's root layer, listed and not offered yet — its values are
  neutral (grey, no accent), and it becomes a blank start once `tanrei init --extends core` can start a layer from it
  too — with that reason on the item; and, under
  **Theme gallery examples**, m3-like and cupertino, each marked as an example, not an official
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

- d5fbc23: **A product's brand color reaches its primary roles.** A layer that declares a palette named after a core intent gives
  that intent's roles their values: a product on the default system — whose primary is drawn from `neutral` — that
  declares `"palettes": { "primary": { "source": { "seed": "#2563eb" } } }` now has `primary`, `on-primary`,
  `primary-container`, `on-primary-container` and `inverse-primary` drawn from that palette in every scheme and contrast
  level, held by the same contrast checks, and links follow the primary as before. Until now the palette was generated and
  nothing read it: the filled Button, the selected controls and links stayed black. A `tone` rule that a layer before the
  palette wrote for one of those roles from another palette gives way; a rule written by the layer that declares the
  palette, or by a later one, still wins, and a system whose rules already read the intent's palette (m3-like,
  cupertino) keeps its own tones. A system that changes a status color keeps the default system's quiet status
  containers. The merged system records which layer gave the chain each palette (`paletteLayers`), and the palette engine
  exposes the operation a role is valued by (`roleOperation`).
  
  Theme Studio's brand color writes the palette alone — it no longer writes the five primary roles into the file beside
  it — and the swatch beside it in the panel, blank until now, shows the primary the brand gives. A layer loaded, pasted or
  set through the page's API with only a `primary` palette is drawn in its brand color too.
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
- 26a105d: **The rule language can write a step a number of units from another value: `add`.**
  
  - `{ "fn": "add", "of": "{height}", "by": "{unit}", "times": -2, "min"?: "{floor}" }` is `max(min, of + by × times)`
    on the 0.25px grid (1ms for a duration). `times` is a plain number, 1 when absent and below zero for a step down;
    `min` is a floor, left out where a `pad` measures the height it gave up. A ladder written with it from one height
    keeps its distances whatever that height is: −2, 0 and +4 units from 40 are 32, 40 and 56, and from 32 they are 24,
    32 and 48.
  - The web receives it as the same arithmetic in CSS (`max(min, calc(of + by * times))`), so a height set on `:root` at
    runtime moves every step written from it; JSON, Swift, Kotlin, Dart and React Native receive the values. Theme
    Studio follows it live while a dial is dragged and shows it in a token's detail.
  - The layer schema accepts it under `derive`.
  
  No token uses it yet: no value, no generated file and no picture changes.
- 29183eb: **The standalone Theme Studio's bar is one line at 360px**, on the longest start (cupertino) and while the JSON holds
  an edit that does not parse, as the documentation's Studio page is: its menu of language and theme went onto a second
  line there. The app's bar holds Build and that menu besides the documentation's controls, so on a phone it leaves out
  redo; undo stays.
- 4570f3f: **Theme Studio: the shuffle and the open lock draw as icons on the docs site.** The site's icon font is cut down to the
  glyphs its sources declare, and the bar's `shuffle`, the rail's `lock_open` and the focus row's fallback were written
  where the glyph list is not read, so until the full icon file loaded they drew as their letters. Each glyph the Studio
  draws is now declared in a constant, and a test refuses a glyph the Studio draws that no list has.
- 3f33ea8: **Theme Studio: the Base system panel shows the base of a layer with every value written out.** Such a layer extends
  Tanrei's root layer, `core`, which is not offered as a base, so the panel showed no choice selected and no description.
  The layer's own base is now always among the panel's choices, selected, with its description; the root is listed for
  that layer only.
- 3c1551b: **Theme Studio's bar says the checks pass in two words in Spanish** ("Todo correcto"): "Todas las comprobaciones se
  superan" took the bar onto a second line in a window 1280px wide.
- 5e0ed29: **Where the browser refuses the clipboard, Theme Studio's Copy link says where the link is**: the page's own address,
  which holds the layer — copy it from the address bar. It said to select the text and copy it by hand, with no text to
  select. Each of the six languages says it in its own words.
- 36ed44c: **Theme Studio's start point says what Core will be in a few words**: "A blank start (coming soon)", in each of the six
  languages, as a menu item's line, in place of a paragraph of why it cannot be chosen yet (the page about Theme Studio
  says why).
- 8abe8ec: **On a phone, Theme Studio's bar stays one line while the JSON holds an edit that does not parse.** The draft's chip,
  which said it in words, is an icon button there — its glyph alone, named by its label, which says the state, shown it
  by its tooltip, and described by what the draft is — standing in Inspect's place: it opens Inspect at Source. The bar's
  controls stand closer together on a phone, and the documentation's Studio page leaves out its link to the page about
  the tool there (the brand leads to the documentation), so that the bar is one line at 360 px with a long start point
  such as cupertino or m3-like. In a wider window nothing changes.
- 5568c0e: **Theme Studio's overview says the form's second action in one word in Spanish and Japanese** ("Borrador", "下書き"):
  in Spanish "Guardar borrador" pushed "Cancelar" onto a row of its own, where the other languages keep Save, the draft
  and Cancel on one row and Details after them.
- 12e74b5: Theme Studio no longer computes the layer in the middle of a drag on a page that is slow to bring its next frame.
  A palette's color or a dial that is dragged is drawn without computing the layer, and the layer is computed once the
  pointer has rested 150 ms. That rest was counted from the frame that drew the last value, and a move that came after
  it did not stop the count: when the moves of one frame took longer than the rest to handle, the Studio took the
  pointer for one at rest and computed the whole layer while it was still moving. A move now puts the rest off at once.
- 1c87d6c: **In a right-to-left language, Export's id field reads «acme.system.json»**: the id and the suffix after it are one
  left-to-right file name, standing at the field's start edge. It read «.system.json acme», bunched at the field's left.
- d513949: **Theme Studio: a layer comes in from a file only, and the gallery's examples start under "From the gallery".**
  
  - The field to paste a layer into, under the file panel (**Import a layer**), is gone, with its words in every
    language. A layer is loaded from a file, through the start point's **Import a file…**; the page's API
    (`importLayer`) loads one by the same function. Breaks: `.ts-import`, `[data-import]` and `[data-import-apply]` no
    longer exist, and the dictionaries' `import` group is removed (`import.invalidJson` is now `source.invalidJson`).
  - The start point's menu lists the theme gallery's examples under **From the gallery** (Japanese 「ギャラリーから始める」,
    Chinese 「从主题示例开始」, Spanish «Empezar desde la galería», Hindi "गैलरी से शुरू करें", Arabic «ابدأ من المعرض»),
    which reads after the first group's **Start from**. It was **Theme gallery examples**.
  - A layer handed to the API without a file name is called "the layer" in what the panel says.
  - The docs' Theme Studio page names the start the same way, and says a file is the one way in, in every language.
- de514aa: **Theme Studio's start point menu lists the theme gallery as the approved design does**: m3-like first, then cupertino,
  each with a line of a few words that says what it imitates, as an example made after it ("A Material 3–style example",
  "An Apple-style example"), on one line of the menu in every language at 360 px. The line repeated the example's name
  and a sentence, and took two lines.
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
- 9e880f2: Theme Studio sends one save at a time. An edit made while the host had not yet answered the last save was saved
  600 ms later, alongside it, with the etag that answer was about to replace: a host slower than that refused the second
  save as a conflict with the Studio's own write, and the Studio said the file had changed on disk. A save asked for
  meanwhile — the autosave, Build, `api.save` — is now sent once the answer has come. The answer to a save that a later
  edit has overtaken no longer draws the file's state again: that edit has said the file is unsaved already.
- a738e5b: **Theme Studio's overview keeps two columns beside the rail and the panel of a window 1280px wide**, as the approved
  design does (it fell to one): a panel of the overview may be 17.5rem wide now, which gives three columns from about
  1550px.
- 197a050: **On a phone, how Theme Studio's preview is seen is one line under the screens' tabs**, in every language: the scheme,
  the contrast and the emphasis no longer wrap onto a third line in Spanish; what the window has no room for scrolls
  sideways in the line's own box.
- 8c8f82b: **Theme Studio's preview opens in dark where the page around it is drawn in dark because the device is**: the
  documentation's Studio page follows the device until its reader chooses a mode, and its preview opened in light under
  a dark bar and rail. A mode the person chose in the preview's bar is still remembered over it.
- 35c4259: **Theme Studio: a rail value cut with an ellipsis shows whole in a Tanrei tooltip**, pointed at or focused, as the
  bar's controls show theirs, instead of the browser's native title. A value that fits opens none. The row's accessible
  name still holds the whole value, and the tooltip adds nothing to it.
- 82bba18: **Theme Studio: the rail's rows have more room for their values** in a wide window. The rail is inset by half the
  gap at its sides and a row's value sits closer to its sample, as in the approved design, so a value line is 18px
  wider (145 → 163px on the documentation's page at 1440px) while the rail's column keeps its width and the preview
  its columns.
- bf3c5af: **Theme Studio: a rail row's lock says what it does in a Tanrei tooltip**, pointed at or focused, as the shuffle in
  the bar says its own, instead of the browser's native title. The tooltip is the lock's description; its name is still
  "Lock <row>".
- f3dabd0: **Theme Studio: a rail row of the look is marked as one band.** Where the rail is a column, the current row and a row
  pointed at are marked across their words and sample, their lock and their chevron, not only the words and sample.
- 5d8ceac: **A row of Theme Studio's rail says what it holds on one line**, as the approved design draws it: where the line is
  too long for the rail it is cut at its end with an ellipsis — the word «default» after the value first, then the value
  — and the whole value is the line's tooltip and stays in the row's accessible name. It wrapped under the row's name
  before, which made the rows of uneven height in English and Spanish.
- 9691f07: Theme Studio no longer loses an edit made while the host has not answered the last save. An undo saved, then a redo
  before that save's answer, was weighed against the save before the undo: the redo matched it, was drawn saved and was
  never sent, and the file kept the undo. A commit is now weighed against the save on its way, which the file already
  holds: one that differs is unsaved and is sent after the answer; one that matches it is said to be saving, and its
  answer says it is saved.
- 36c0020: **Theme Studio's Size row keeps each length whole in Arabic**: the control height and the minimum target are each a
  left-to-right run of their own inside the sentence, so the minimum's unit no longer stands apart from its digits
  ("36 الأدنىpx"), and the sentence is read from the right.
- d226d81: Theme Studio removes the family whose remove button was pressed, even while a family removed a moment before is still
  leaving the font stack. A removed family stays the list's child, drawn leaving, until its motion has ended, and the
  Studio read the place of the family to remove among all the list's children: a second removal during that motion
  took the next family's place, and removed nothing or the wrong family. The Studio now counts only the list's items,
  as the list asks of a script that reads its children (`tanrei-list-item:not([data-leaving])`).
- 62a959e: Theme Studio can show the documentation in the theme you are making. Its bar has a **Share** menu: the link to the
  Studio with your layer, and **Show the documentation in this theme**, off until you turn it on and kept in this browser
  only. On, the whole documentation — header, navigation and every example — is drawn in the layer this browser keeps,
  and follows it as you edit; the header's choice of design system lists it as **My theme** (in all six languages), and
  choosing Tanrei there goes back in one step. Off, the documentation keeps nothing of it.
  
  - `emitCss(model, { used })` (`@tanrei/tokens-build/emit/css`): an opt-in option that writes only the custom
    properties named and everything their values read. Without it the sheet is unchanged, byte for byte.
  - `@tanrei/studio`: `core.pageSheet(view)`, a layer's sheet for a page whose root already holds the default system's
    (only what differs, declared again where the default sheet would otherwise show through), and
    `@tanrei/studio/page-sheet`, which computes it in a worker. `mountStudio` takes `docs` (`{ kept(), keep(layer) }`) for
    a host that is a documentation. A host that bundles the worker gives Vite's `worker.plugins` the Studio's plugin.
  - The documentation keeps the stylesheet in IndexedDB under the build's key and the layer's hash; while it is not in, a
    page stays hidden for at most three seconds, and a page that could not wait for it is drawn in the default system.
- d297b89: **The documentation's Theme Studio page opens under `astro dev`**: the layer schema's validator, which the Studio's
  Vite plugin compiles at build time, imported one of Ajv's CommonJS helpers by its path, and a dev server served it as
  it is ("does not provide an export named 'default'"), so the Studio never mounted there while every build worked. The
  plugin now inlines each helper with what it requires, and the validator module imports nothing.
- 7cd3d2f: **Theme Studio: Export's What next shows each command whole.** Its commands wrap in the sheet's width, as the Command
  tab's do, instead of being cut at the sheet's edge behind a sideways scroll.
- Updated dependencies [50a3f0e]
- Updated dependencies [2cf22e1]
- Updated dependencies [73d9b8e]
- Updated dependencies [a03d145]
- Updated dependencies [2fd10a8]
- Updated dependencies [132b7ce]
- Updated dependencies [09f8ab7]
- Updated dependencies [d606f50]
- Updated dependencies [4e905c9]
- Updated dependencies [f51b33f]
- Updated dependencies [69afca4]
- Updated dependencies [6e7a404]
- Updated dependencies [1ade52d]
- Updated dependencies [bf5b6de]
- Updated dependencies [f1e78ee]
- Updated dependencies [2f35840]
- Updated dependencies [e8bf9cb]
- Updated dependencies [8d0e2b0]
- Updated dependencies [f799b0a]
- Updated dependencies [b96f9a9]
- Updated dependencies [a9944fa]
- Updated dependencies [a22289a]
- Updated dependencies [a52d722]
- Updated dependencies [1b6a2cc]
- Updated dependencies [635b5e0]
- Updated dependencies [a07c9c2]
- Updated dependencies [d4c7f5f]
- Updated dependencies [dff3650]
- Updated dependencies [4b5c2f1]
- Updated dependencies [43a71a9]
- Updated dependencies [f6a47af]
- Updated dependencies [6f7bedc]
- Updated dependencies [9fd3a23]
- Updated dependencies [6964e39]
- Updated dependencies [02031c4]
- Updated dependencies [9e855aa]
- Updated dependencies [2b1b8a9]
- Updated dependencies [98e34cc]
- Updated dependencies [adf8c4c]
- Updated dependencies [48873d6]
- Updated dependencies [d354925]
- Updated dependencies [d5fbc23]
- Updated dependencies [50815ea]
- Updated dependencies [d4af6fb]
- Updated dependencies [8c92c0e]
- Updated dependencies [930031d]
- Updated dependencies [320f78b]
- Updated dependencies [6b01d3e]
- Updated dependencies [2c75918]
- Updated dependencies [f2dd913]
- Updated dependencies [14c6415]
- Updated dependencies [08d45b6]
- Updated dependencies [1e21adf]
- Updated dependencies [9f8f74b]
- Updated dependencies [bf096fd]
- Updated dependencies [65d622b]
- Updated dependencies [68c45ed]
- Updated dependencies [cbef781]
- Updated dependencies [5b890aa]
- Updated dependencies [e1a3154]
- Updated dependencies [b98cb51]
- Updated dependencies [d5e0409]
- Updated dependencies [17a37da]
- Updated dependencies [8108674]
- Updated dependencies [908fdbd]
- Updated dependencies [0d60deb]
- Updated dependencies [feed7a0]
- Updated dependencies [920682d]
- Updated dependencies [6645c5b]
- Updated dependencies [8c108d1]
- Updated dependencies [7848444]
- Updated dependencies [d0d5136]
- Updated dependencies [5c2597b]
- Updated dependencies [266b875]
- Updated dependencies [16bbd73]
- Updated dependencies [37da571]
- Updated dependencies [50e5977]
- Updated dependencies [2e533ab]
- Updated dependencies [6d5fe67]
- Updated dependencies [01640f4]
- Updated dependencies [c51f733]
- Updated dependencies [f535d8f]
- Updated dependencies [671b2ee]
- Updated dependencies [9aa5a3b]
- Updated dependencies [24b3408]
- Updated dependencies [69cf5e1]
- Updated dependencies [6e7712d]
- Updated dependencies [0f3d3a5]
- Updated dependencies [119663a]
- Updated dependencies [1756f91]
- Updated dependencies [5e0f1dd]
- Updated dependencies [150992d]
- Updated dependencies [b7f17fe]
- Updated dependencies [c96a911]
- Updated dependencies [c3b31b4]
- Updated dependencies [c7d628c]
- Updated dependencies [39cfd08]
- Updated dependencies [8104798]
- Updated dependencies [c7b509e]
- Updated dependencies [d5d3e8f]
- Updated dependencies [b186722]
- Updated dependencies [6636594]
- Updated dependencies [16608f6]
- Updated dependencies [0e36941]
- Updated dependencies [9679aca]
- Updated dependencies [90e6108]
- Updated dependencies [88c14f0]
- Updated dependencies [de75588]
- Updated dependencies [2cc506b]
- Updated dependencies [d97b53b]
- Updated dependencies [ede88e8]
- Updated dependencies [aae9ddd]
- Updated dependencies [908d897]
- Updated dependencies [64de2c3]
- Updated dependencies [2670082]
- Updated dependencies [435ebe9]
- Updated dependencies [e70559b]
- Updated dependencies [bdd731f]
- Updated dependencies [6e97fd7]
- Updated dependencies [38ef509]
- Updated dependencies [d2df5f1]
- Updated dependencies [cc5de51]
- Updated dependencies [c3bf525]
- Updated dependencies [0d23356]
- Updated dependencies [90c0631]
- Updated dependencies [9ca3d46]
- Updated dependencies [c501200]
- Updated dependencies [14b445d]
- Updated dependencies [3bf1ae0]
- Updated dependencies [fcf2ed2]
- Updated dependencies [ebd7bc2]
- Updated dependencies [e58fb5e]
- Updated dependencies [f2c1706]
- Updated dependencies [dcc5d30]
- Updated dependencies [10e0337]
- Updated dependencies [9b175e8]
- Updated dependencies [0c3dc1c]
- Updated dependencies [ac5a597]
- Updated dependencies [99de42c]
- Updated dependencies [f8eb807]
- Updated dependencies [72951c1]
- Updated dependencies [fda53ad]
- Updated dependencies [4fcd85c]
- Updated dependencies [78932fb]
- Updated dependencies [9441956]
- Updated dependencies [9f7ffbd]
- Updated dependencies [d9e7911]
- Updated dependencies [9646c7f]
- Updated dependencies [d8fb809]
- Updated dependencies [be82919]
- Updated dependencies [2e4a5ab]
- Updated dependencies [44976d9]
- Updated dependencies [3b0cc7e]
- Updated dependencies [84946fb]
- Updated dependencies [0dd718d]
- Updated dependencies [108305a]
- Updated dependencies [aacef9e]
- Updated dependencies [5e2e030]
- Updated dependencies [3bbfeaf]
- Updated dependencies [9fa306e]
- Updated dependencies [2198a74]
- Updated dependencies [1cf0f93]
- Updated dependencies [0a98a97]
- Updated dependencies [8c8dec0]
- Updated dependencies [5a4f793]
- Updated dependencies [c95cd4a]
- Updated dependencies [d5dec9e]
- Updated dependencies [25dd0d0]
- Updated dependencies [8405fc9]
- Updated dependencies [11963f3]
- Updated dependencies [3132a46]
- Updated dependencies [b8bdb5f]
- Updated dependencies [7e694f4]
- Updated dependencies [a3f8151]
- Updated dependencies [09a41a2]
- Updated dependencies [cdaabaa]
- Updated dependencies [995d60a]
- Updated dependencies [c8f2fae]
- Updated dependencies [0a27acd]
- Updated dependencies [e690d47]
- Updated dependencies [db60c6c]
- Updated dependencies [4f15a23]
- Updated dependencies [e9038b1]
- Updated dependencies [92acafb]
- Updated dependencies [991095d]
- Updated dependencies [d5f05c8]
- Updated dependencies [32c4e10]
- Updated dependencies [74b5a43]
- Updated dependencies [1b46933]
- Updated dependencies [bbd7afb]
- Updated dependencies [654a435]
- Updated dependencies [8d5a636]
- Updated dependencies [66ad9dd]
- Updated dependencies [31c6e08]
- Updated dependencies [6127ff5]
- Updated dependencies [a323e65]
- Updated dependencies [74c9435]
- Updated dependencies [5fe57e9]
- Updated dependencies [1e500bc]
- Updated dependencies [f744584]
- Updated dependencies [b0e55fb]
- Updated dependencies [8c13679]
- Updated dependencies [34010c9]
- Updated dependencies [1d6594a]
- Updated dependencies [910c7b6]
- Updated dependencies [aa194f8]
- Updated dependencies [ac3b05b]
- Updated dependencies [14aff2c]
- Updated dependencies [5b0a851]
- Updated dependencies [e0eaa64]
- Updated dependencies [6359c60]
- Updated dependencies [61cebf8]
- Updated dependencies [7a1eb3e]
- Updated dependencies [6d89bfe]
- Updated dependencies [377bc4a]
- Updated dependencies [41aabb3]
- Updated dependencies [f4248ab]
- Updated dependencies [38b7cd2]
- Updated dependencies [c348845]
- Updated dependencies [629730e]
- Updated dependencies [3990b23]
- Updated dependencies [df119df]
- Updated dependencies [b921047]
- Updated dependencies [c3e2126]
- Updated dependencies [d418520]
- Updated dependencies [ff0416e]
- Updated dependencies [9b20d9e]
- Updated dependencies [882a0ee]
- Updated dependencies [e711cc1]
- Updated dependencies [ac7293f]
- Updated dependencies [e56ee00]
- Updated dependencies [2709512]
- Updated dependencies [e4fe8c5]
- Updated dependencies [a72bfbb]
- Updated dependencies [f778ab4]
- Updated dependencies [47d90f4]
- Updated dependencies [0918093]
- Updated dependencies [2dd0327]
- Updated dependencies [da87128]
- Updated dependencies [397cd93]
- Updated dependencies [0d787eb]
- Updated dependencies [d211b71]
- Updated dependencies [25340d8]
- Updated dependencies [aaba9dc]
- Updated dependencies [15ff26b]
- Updated dependencies [fb4efc7]
- Updated dependencies [b2eb818]
- Updated dependencies [abc8133]
- Updated dependencies [0a27acd]
- Updated dependencies [3df6fcc]
- Updated dependencies [abc6706]
- Updated dependencies [c5f234a]
- Updated dependencies [9163b6b]
- Updated dependencies [a671621]
- Updated dependencies [6e9bc90]
- Updated dependencies [792e1e6]
- Updated dependencies [8accc02]
- Updated dependencies [8641a2e]
- Updated dependencies [c221654]
- Updated dependencies [1a22c3c]
- Updated dependencies [61c31a6]
- Updated dependencies [ad6f7bd]
- Updated dependencies [95e01e8]
- Updated dependencies [16c656e]
- Updated dependencies [c8f9fe8]
- Updated dependencies [3d373c6]
- Updated dependencies [5287d31]
- Updated dependencies [aba6c70]
- Updated dependencies [7536862]
- Updated dependencies [08f44fd]
- Updated dependencies [7495506]
- Updated dependencies [72469f9]
- Updated dependencies [fe62465]
- Updated dependencies [3db2746]
- Updated dependencies [3188580]
- Updated dependencies [4d18319]
- Updated dependencies [e6068b9]
- Updated dependencies [a0f001b]
- Updated dependencies [71dad17]
- Updated dependencies [9283a03]
- Updated dependencies [073a8bd]
- Updated dependencies [06647d8]
- Updated dependencies [1ecb145]
- Updated dependencies [712e7d2]
- Updated dependencies [d1611cc]
- Updated dependencies [8aa7956]
- Updated dependencies [6b2167e]
- Updated dependencies [c13331a]
- Updated dependencies [801a2ad]
- Updated dependencies [d93ce2b]
- Updated dependencies [0a27acd]
- Updated dependencies [9b30315]
- Updated dependencies [6ee3c72]
- Updated dependencies [7a19510]
- Updated dependencies [55bc61a]
- Updated dependencies [727c99d]
- Updated dependencies [58937c0]
- Updated dependencies [04337f7]
- Updated dependencies [88f6193]
- Updated dependencies [8da3d7b]
- Updated dependencies [1300097]
- Updated dependencies [2fe1f5a]
- Updated dependencies [fc68357]
- Updated dependencies [c9d76e2]
- Updated dependencies [45ca156]
- Updated dependencies [f82c68e]
- Updated dependencies [dfef087]
- Updated dependencies [19e74c3]
- Updated dependencies [d05c5ac]
- Updated dependencies [25ecc35]
- Updated dependencies [ed22865]
- Updated dependencies [6107783]
- Updated dependencies [51771d8]
- Updated dependencies [4e7bdd8]
- Updated dependencies [6c7f52d]
- Updated dependencies [328d945]
- Updated dependencies [927c90a]
- Updated dependencies [ad0773a]
- Updated dependencies [ac7c2d3]
- Updated dependencies [9b9f75d]
- Updated dependencies [d039dcf]
- Updated dependencies [fb1ce26]
- Updated dependencies [531efa4]
- Updated dependencies [66f1b1c]
- Updated dependencies [96d9ffc]
- Updated dependencies [e985d43]
- Updated dependencies [c2ba8d2]
- Updated dependencies [7a4ad4b]
- Updated dependencies [07507aa]
- Updated dependencies [f818941]
- Updated dependencies [d6e301e]
- Updated dependencies [8e7e057]
- Updated dependencies [347da9e]
- Updated dependencies [1c85b08]
- Updated dependencies [17a9754]
- Updated dependencies [dd76e41]
- Updated dependencies [9fd9aba]
- Updated dependencies [5186d65]
- Updated dependencies [c89c4b6]
- Updated dependencies [b1fb04c]
- Updated dependencies [acee0da]
- Updated dependencies [7072d6a]
- Updated dependencies [a532977]
- Updated dependencies [393a0c8]
- Updated dependencies [14712cc]
- Updated dependencies [b8106ad]
- Updated dependencies [75a89b5]
- Updated dependencies [65da5d6]
- Updated dependencies [6641e39]
- Updated dependencies [3d9b015]
- Updated dependencies [dda6ec1]
- Updated dependencies [bf58159]
- Updated dependencies [352aceb]
- Updated dependencies [2a2437f]
- Updated dependencies [6016e87]
- Updated dependencies [93ff352]
- Updated dependencies [bc9b8bd]
- Updated dependencies [14c4ed6]
- Updated dependencies [b0e5f61]
- Updated dependencies [fba98d4]
- Updated dependencies [b9d4879]
- Updated dependencies [a45036e]
- Updated dependencies [ef0af92]
- Updated dependencies [db7055c]
- Updated dependencies [e336a97]
- Updated dependencies [20f3d3a]
- Updated dependencies [aa0133e]
- Updated dependencies [2087222]
- Updated dependencies [bd5c612]
- Updated dependencies [155b5de]
- Updated dependencies [6e23003]
- Updated dependencies [1e459d5]
- Updated dependencies [5368526]
- Updated dependencies [afb26f3]
- Updated dependencies [4428dc8]
- Updated dependencies [26a105d]
- Updated dependencies [c927a0a]
- Updated dependencies [f5c40d8]
- Updated dependencies [9bcae4e]
- Updated dependencies [e6f540c]
- Updated dependencies [b1ddfd8]
- Updated dependencies [590e070]
- Updated dependencies [3b1d8a5]
- Updated dependencies [551ad4c]
- Updated dependencies [01aa43a]
- Updated dependencies [615f0c9]
- Updated dependencies [2eb03ec]
- Updated dependencies [05e39e7]
- Updated dependencies [e668b52]
- Updated dependencies [801acd6]
- Updated dependencies [6c626ae]
- Updated dependencies [0424ae9]
- Updated dependencies [fef5abf]
- Updated dependencies [8ba18ba]
- Updated dependencies [8f27a26]
- Updated dependencies [fefe825]
- Updated dependencies [3178805]
- Updated dependencies [7feeb76]
- Updated dependencies [2482b64]
- Updated dependencies [95126b7]
- Updated dependencies [c794871]
- Updated dependencies [5f70789]
- Updated dependencies [5a20614]
- Updated dependencies [080355f]
- Updated dependencies [6fc8b20]
- Updated dependencies [e9cc3aa]
- Updated dependencies [d31aedb]
- Updated dependencies [ca2160c]
- Updated dependencies [b1ba89f]
- Updated dependencies [cb29df6]
- Updated dependencies [14046b7]
- Updated dependencies [153d122]
- Updated dependencies [4e8cfcc]
- Updated dependencies [7f7e4fb]
- Updated dependencies [2639daf]
- Updated dependencies [3a64e86]
- Updated dependencies [6fb2997]
- Updated dependencies [d0de4b8]
- Updated dependencies [7139c1d]
- Updated dependencies [ccb6524]
- Updated dependencies [abced4a]
- Updated dependencies [265e59c]
- Updated dependencies [b91e6da]
- Updated dependencies [87c2cb9]
- Updated dependencies [8389ef4]
- Updated dependencies [4f12893]
- Updated dependencies [1a4d2b0]
- Updated dependencies [d7cfdcf]
- Updated dependencies [8bc07c7]
- Updated dependencies [59c520f]
- Updated dependencies [c787054]
- Updated dependencies [9bd59f4]
- Updated dependencies [029e299]
- Updated dependencies [52cf232]
- Updated dependencies [cd48cda]
- Updated dependencies [4e480be]
- Updated dependencies [e265070]
- Updated dependencies [e0810e9]
- Updated dependencies [4b8dd96]
- Updated dependencies [1f0c823]
- Updated dependencies [77b361c]
- Updated dependencies [4de753b]
- Updated dependencies [0a27acd]
- Updated dependencies [62a959e]
- Updated dependencies [0646d07]
- Updated dependencies [0a27acd]
- Updated dependencies [8e8ffda]
- Updated dependencies [d821847]
- Updated dependencies [b9c5fbe]
- Updated dependencies [7ce01bf]
- Updated dependencies [348b6be]
- Updated dependencies [e088124]
- Updated dependencies [af6b480]
- Updated dependencies [fb63800]
- Updated dependencies [3becfa7]
- Updated dependencies [d43dd75]
- Updated dependencies [3849719]
- Updated dependencies [77dcdcf]
- Updated dependencies [b3b8ffd]
- Updated dependencies [ec0be00]
- Updated dependencies [2442137]
- Updated dependencies [3952e87]
- Updated dependencies [754642a]
- Updated dependencies [3589b98]
- Updated dependencies [c749f65]
- Updated dependencies [552dad2]
- Updated dependencies [922c42c]
- Updated dependencies [d6814f1]
- Updated dependencies [a42b480]
- Updated dependencies [cbca9e1]
- Updated dependencies [9043138]
- Updated dependencies [d240af2]
- Updated dependencies [37db622]
- Updated dependencies [2d1369b]
- Updated dependencies [a1657e3]
- Updated dependencies [afb4e69]
- Updated dependencies [26e14d1]
- Updated dependencies [07c7d78]
- Updated dependencies [3327c3c]
- Updated dependencies [cc6881d]
- Updated dependencies [f669310]
- Updated dependencies [11e9c59]
- Updated dependencies [b745ced]
- Updated dependencies [6805aba]
- Updated dependencies [828b071]
- Updated dependencies [f421db8]
- Updated dependencies [c1e391d]
- Updated dependencies [fbed093]
- Updated dependencies [ba45429]
- Updated dependencies [c943bb4]
- Updated dependencies [bd70c47]
- Updated dependencies [f31e5d7]
- Updated dependencies [e60bcc3]
- Updated dependencies [8c3d007]
- Updated dependencies [4b57bd1]
- Updated dependencies [fc05aa7]
- Updated dependencies [f31590b]
- Updated dependencies [fa6608b]
- Updated dependencies [669cd45]
- Updated dependencies [218effd]
- Updated dependencies [0f0e1eb]
- Updated dependencies [2220dec]
- Updated dependencies [1d49987]
- Updated dependencies [d250142]
- Updated dependencies [2e77342]
- Updated dependencies [abd05f4]
- Updated dependencies [e889855]
- Updated dependencies [008e413]
- Updated dependencies [69ad27a]
- Updated dependencies [efc3a15]
- Updated dependencies [9e19aca]
- Updated dependencies [1e0fe14]
- Updated dependencies [8ff53f3]
- Updated dependencies [b787a0c]
- Updated dependencies [9da6b0e]
- Updated dependencies [8d0ea21]
- Updated dependencies [cfc0657]
- Updated dependencies [5e0896a]
- Updated dependencies [969d8b2]
- Updated dependencies [6884e96]
- Updated dependencies [e3a2fb2]
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
