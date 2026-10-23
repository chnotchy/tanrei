# @tanrei/tokens-build

## 0.1.0-next.1

### Minor Changes

- 50a3f0e: **Breaking — design system layers.** Every design system now descends from one root layer, `core`
  (`tokens/systems/core.system.json`): it values the vocabulary — the palettes, the color roles and the per-state rules —
  and leaves no component out. The default system `tanrei` extends it and keeps only its choice of components; the presets
  extend `tanrei` as before, and a product extends any of them. No resolved value moved: every token of `tanrei`, the
  presets and a product resolves as it did, in every scheme, and every generated stylesheet, bundle value and native
  constant is unchanged (a test holds it). The bundles' recipe and a product's chain name `core` first
  (`core → tanrei → acme`). `core` has no output of its own and is not offered where a system is chosen (`tanrei init
  --extends`, `tanrei systems`, Theme Studio, the MCP server's `list_systems`, whose `root` is now `core` and whose new
  `default` is `tanrei`).
  
  **Breaking — a layer's `unavailable` is replaced by `components`**, which changes what the parent ships instead of
  restating the whole list: `omit` leaves a component out (with a `reason`, and `insteadUse` naming what the system ships
  for the same job), `include` brings back a component an ancestor left out, and `variants.<component>.omit|include` does
  the same for the values of its `variant` prop. An ancestor's choice stays unless a layer undoes it by name, so a product
  that leaves one more component out keeps everything its parent left out, and a product on `tanrei` that wants the
  segmented button writes `"components": { "include": ["segmented-button"] }` and draws it with the default system's
  tokens. A layer that still writes `unavailable` is refused by the schema: rewrite it as `components`. What each shipped
  system leaves out is unchanged (`--tanrei-unavailable` holds the same list).
- 9fd3a23: **New — a product's tests can fail on a component its system does not have.** `@tanrei/web` exports
  `setAvailabilityMode('warn' | 'error')` and `unavailableUses()` (and `@tanrei/web/availability` the two alone, without
  registering an element), shaped like `missingWords()`:
  
  ```js
  setAvailabilityMode('error'); // in the test setup, before anything renders
  // …render the screens of the product…
  expect(unavailableUses()).toEqual([]);
  ```
  
  In a debug build every use of a component, or a `variant` value, that the active system leaves out, or of a component
  that lives in a layer the system does not extend, is recorded once, in either mode (`segmented-button`,
  `text-field:outlined`), and the error mode reports it with `console.error` instead of `console.warn`. A production
  build reads and records nothing.
  
  **The report names what the system uses instead.** Every system's stylesheet now declares
  `--tanrei-unavailable-replacement`, written from the `insteadUse` of its components manifest (the default system's:
  `segmented-button=tabs,radio-button,button-group`); a product's sheet from `tanrei build` declares it too, with its own
  `components.omit` entries, and Theme Studio's preview declares the same. A component that lives in another layer names its replacement as soon as its manifest entry
  carries one.
  
  **A use is reported under the component the product wrote.** `<tanrei-text-field variant="outlined">` under the default
  system reports `variant "outlined" of text-field` on `<tanrei-text-field>`, not the text input it draws inside.
- 671b2ee: **New — `tanrei audit` checks code against the system's components.**
  `tanrei audit <file|dir|glob…> [--system <id|layer file>] [--format text|json]` reports what the code uses that the
  system does not have, each at its file, line and column, with what to write instead:
  
  - an element of a component the system does not have — in HTML, a lit template, JSX or a string, an imported React
    wrapper, or a CSS selector (a stylesheet, `<style>`, lit's css``) — with the components the system ships for the
    same job, the shipped systems that have it and the line of a product's layer that takes it in;
  - an import from an entry that does not fit the system — another system's (`@tanrei/web/m3-like` in a product of the
    default system) or the entry of every component (`@tanrei/react/all`) — with the entry that does, and an import of a
    component's module or wrapper the system does not have;
  - a static `variant="…"` the system leaves out, with the values it offers.
  
  The system is `--system` (a shipped id or a layer file), else the product's (`tanrei.json`), else the default system.
  A directory is read for script, markup and stylesheets, without `node_modules` and hidden directories; a quoted glob is
  expanded by the CLI. Comments (`//`, `/* */`, `<!-- -->`) are skipped; it reads text, not a syntax tree, so a variant
  held in a variable is not seen. It exits 0 when nothing is found, 1 when something is (for CI), 2 when it cannot run.
  
  The MCP server's `check_usage` runs the same check, from one module both packages bundle.
  
  The component catalog names the elements each component draws among its children (`web.items`).
- de75588: **New — a components manifest for every system.** What a system ships is one generated list, for whatever suggests or
  checks a component (a coding agent, an editor, a lint, the documentation):
  
  - each shipped system's is `@tanrei/web/systems/<id>.components.json` (`tanrei` for the default system), and
    `tokens/generated/<id>/components.json` in the repository;
  - `tanrei build` writes a product's into its `tokens` output, as `components.json`.
  
  It lists the components the system ships — each with its level and listing, the layer it lives in, its element (or
  class) with the module that registers it (`@tanrei/web`, or a system's own entry such as `@tanrei/web/m3-like`) and its
  own module, its React name, and the `variant` values the system has, those a layer adds included — and, under
  `omitted`, the components it does not have: with the layer that left each out, why and what to use instead, or the
  layer it lives in (`providedBy`). `omittedVariants` lists the variant values it leaves out, for a composed component
  too (the default system's text field has only `stacked`, as its text input). It is worked out from the system's layers:
  the default system lists neither the FAB menu nor the segmented button, m3-like lists both, cupertino the segmented
  button only, a product keeps what the system it extends leaves out, and a product that includes a component from
  another layer has it listed.
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
- 991095d: **Breaking — the FAB menu lives in the m3-like layer.** A component lives in the layer every system that ships it
  descends from; the FAB menu is shipped by `m3-like` and `m3-expressive-like` only, so it lives in `m3-like`. Its name,
  its element (`<tanrei-fab-menu>`, `<tanrei-fab-menu-item>`) and its behaviour do not change. What breaks:
  
  - `import '@tanrei/web'` no longer registers it. Import the entry of a system that ships it
    (`@tanrei/web/m3-like`), or the component's own module (`@tanrei/web/components/fab-menu`).
  - Its 226 tokens (282 declarations) are no longer in the default `tokens.css` nor in `systems/cupertino.css`; they stay,
    unchanged, in `systems/m3-like.css` and `systems/m3-expressive-like.css`. The default system and cupertino no longer
    list it in `--tanrei-unavailable`: they do not have it, and their sheets say where it lives
    (`--tanrei-unavailable-layer: "fab-menu=m3-like"`). Used there, the element warns in a debug build that its tokens are
    not in the system's stylesheet.
  - `tokens/comp/fab-menu.tokens.json` is now `tokens/systems/m3-like/comp/fab-menu.tokens.json`, declared by m3-like's
    `vocabulary`. `tokens/vocabulary.lock.json` lists its ids under `layers.m3-like`. cupertino's own values and rules for
    the FAB menu are gone with it.
  
  **New — a layer can hold the whole vocabulary of a component that lives in it**, the fourth way a layer extends the
  vocabulary: `"tanrei.comp.<component>": { "document": "comp/<component>.tokens.json", "rationale": "…", "rules": [ … ] }`,
  its document kept next to the layer. A spec and its inventory row say `"layer": "<layer>"` (absent: `core`), and
  `pnpm validate` holds the three together.
  
  **New — a product on another system can include such a component** from the layer that holds it, and draw it with its
  own tokens: `"components": { "include": [{ "name": "fab-menu", "from": "m3-like" }] }`. The component's document and
  the rules of its states come; none of m3-like's values do. A product on the default system that includes the FAB menu
  gets exactly the 282 declarations the default stylesheet had before this change. `tanrei build`, `tanrei validate`,
  Theme Studio and the MCP server's `validate_layer` take the new form; a component that lives in another layer, named
  alone under `include`, is refused with the form to write instead.
  
  The native outputs still type every system with the whole vocabulary: the default system's are unchanged, and
  cupertino's values for the FAB menu are now those its own tokens give the component. The FAB menu's baselines are
  drawn under `m3-like`, where it lives (an intended change of nine images).
- f744584: Navigation drawer and tree view: a filter field. `filterable` draws a search field above the rows (the drawer's below
  its header, the tree's pinned at the top of its scrolling box); what a person types narrows them to the rows whose label
  holds every word, in any order, without regard to case, width or marks, and the groups that hold a match open for as
  long as the filter is there — `open` is not written and no `toggle` fires, so emptying the field puts everything back.
  What does not match is hidden, and nothing in the rows that are left is marked: they are the answer, as in a code
  review's file tree and a documentation site's sidebar, each drawn as it is without a filter, and the tree never touches
  the product's own text in its labels. As in the search, the first row that matches is ready to take while focus stays in
  the field: Enter takes it as Enter on its row would, and Down Arrow moves focus to it. It is drawn as the focused row
  and not read out until the person moves to it: the field names no active descendant. "/" reaches the field — from
  anywhere in the window for the drawer, from a row for the tree (`filterShortcut` changes or removes the key); Escape
  empties the field. A quiet line at the top of the results draws how many rows match (`filterCountText`) or that none
  does (`filterEmptyText`), and a status says it once typing pauses; `filterCountHidden` leaves the count undrawn and
  still said. The words are the product's: `filterLabel`, and `filterPlaceholder`, `filterCountText`, `filterEmptyText`
  and `filterClearLabel` (the product's `clearLabel`), with three new keys in the English word pack. `filterValue` and
  `filterchange` keep the text; `focusFilter()` moves focus to the field. The app shell opens a narrow window's closed
  drawer for its chord and puts focus in its field. New tokens: `comp.navigation-drawer.filter.{gap,status.*,shortcut.*}`,
  `comp.tree-view.filter.{gap,status.*}`, and how a match is marked in the combobox.
  
  A match is now marked the same way in the search and the combobox: the stronger text color, a raised weight and a quiet
  fill behind the matched letters. The combobox's matched run, which was heavier only, gains its color and fill
  (`comp.combobox.option.match.color`, `.container.color`, and `.selected.color` and `.selected.container.color` for the
  chosen option, whose own fill is the quiet one), and is drawn in the platform's marked-text colors under forced colors.
  Its look changes in every filtered list.
  
  The filter is on the web; the spec names its props on every platform, and SwiftUI, Compose, Flutter and React Native
  have not implemented it yet.
- 6d89bfe: **Breaking — the text input's resize grip and the bottom sheet's grip are Handles.** A size is changed with one mark
  everywhere: a Handle's line, or its arc at a corner. A glyph of dots read as "move this", which is a reorder handle's
  sign.
  
  - Text input and text field: a field with `resize="manual"` places a `<tanrei-handle size="small">` in its bottom end
    corner, a line for `resize-axis="vertical"` and an arc for `both`, out of sight until a pointer is over the field or the
    field has focus. It is drawn, targeted, focused and pressed as every Handle is, and is drawn alike in every look and in
    error. The part `resize-grip` is renamed `resize-handle`. Page Up and Page Down (and Shift with an arrow) now move it by
    `minRows` lines, and while `maxRows` is 0 its separator's greatest value is the lines the text needs.
  - New event `resizeend` on the text input and the text field (React `onResizeend`), fired once when the person has
    changed the size: at the end of a drag, or after a key or an activation that changed it. `detail` is `{ lines, width }`
    (`width` is null unless `resize-axis` is both), so a product can keep the size a person chose.
  - Bottom sheet: the drag handle is a `<tanrei-handle>` given the sheet's own tokens; the parts `handle` and `grip` are
    its `container` and `line`. Its hit area and its vertical resize cursor are the Handle's, it grows its grip under a
    pointer, and a drag that starts on it keeps it pressed while the sheet follows. At rest it is drawn as before.
  - Tokens removed: `comp.text-input.resize-grip.size`, `comp.text-input.resize-grip.inset`, every
    `comp.text-input.<look>[.<state>][.error].resize-grip.color` (26 in all), and `comp.bottom-sheet.handle.grip-shape` (a
    Handle's line always has round ends). `comp.bottom-sheet.handle.*`, `comp.bottom-sheet.drag-handle.*` and the sheet's
    state motion now alias `comp.handle.*`, and the sheet's hovered and pressed grip colors are the Handle's line colors.
  - Baselines: the text input's manual-resize fixtures change (the glyph is gone; the handle is out of sight at rest).
- 1a22c3c: Marquee text, a new component: one line of text that does not fit its place rests cut with an ellipsis and, while its
  trigger holds, moves sideways at a steady pace to show all of it. It moves only while the text overflows, never where
  motion is reduced, and is read once, whole.
  
  - Web: `<tanrei-marquee-text>` (`trigger`, `loop`, `speed`, `start-pause`, `end-pause`, `iterations`, `paused`,
    `playback-control`, `play-label`, `pause-label`; event `pausedchange`); React: `MarqueeText`. SwiftUI, Compose,
    Flutter and React Native are planned: their generated tokens carry `comp.marquee-text`, and no component yet.
  - `trigger`: `hover-or-focus` (the default), `hover`, `focus` or `always`. Focus is that of the control the line stands
    in; the line is never a focus stop. `loop`: `repeat` (a copy follows a gap behind) or `bounce`.
  - The defaults can conflict with WCAG 2.2.2 Pause, Stop, Hide, and the docs say how to meet it: `always` draws no
    playback control unless `playback-control` is set (or the page's own pause control sets `paused`; a debug build
    reports a moving line with neither), and a hover or a focus plays passes until it ends unless `iterations` is set.
  - Tokens: `comp.marquee-text` — `speed` (30 px/s), `motion.start-pause` and `motion.end-pause` (1200 ms, fixed: a speed
    and reading times the motion dial does not change), `motion.start-delay` (`sys.motion.role.show-delay`),
    `motion.easing` (`easing.linear`), `motion.return-duration` and `motion.return-easing` (`role.state.default`,
    `easing.state`), `gap`, `fade.extent`, `playback.gap`. No new sys token.
  - The product's words gain `marqueePlayLabel` and `marqueePauseLabel` ("Play scrolling text", "Pause scrolling text" in
    the English pack): the carousel's `playLabel` and `pauseLabel` name a slideshow.
  - Nothing is removed or renamed.
  - Baselines: new images for the marquee text's 7 fixtures, and one per preset — new, not changed.
- 5287d31: Menu: a checked row is told by its mark, and the one filled row is the page the person is on.
  
  - **A checked checkbox or radio item has no fill at standard contrast** in the default system. It already shows its
    box, ring or check, as the menus of macOS, iOS and Fluent 2 show theirs. At medium and high contrast, where a person
    has asked for stronger cues, it keeps the fill it had (a layer of the row's content color, twice the hover layer).
    The menu reads `comp.menu.selected.container.color` in the scheme it is drawn in and decides nothing by the scheme
    itself; a design system values that token for each contrast scheme. A disabled checked row follows it: no fill at
    standard contrast, the neutral disabled fill at medium and high.
  - **The current link item has a condition of its own**, `current`, with tokens `comp.menu.current.*`. It has no mark,
    so it keeps its fill, `comp.menu.current.container.color`, in every contrast scheme. The menubar's current link item
    aliases these tokens, so the place the person is on is drawn the same in the bar and in a menu. In m3-like and
    cupertino, which give a checked row no fill, the current link item now has the default system's fill instead of none.
  - **The select's and the combobox's chosen option** follows the menu's checked row: it carries the check, and has no
    fill at standard contrast in the default system.
  - **Tokens: a context map may name a token.** The amount of a `mix` or `alpha` rule may be a context map whose entries
    are numbers or references (`[0, "{tanrei.sys.state.disabled-container-opacity}"]`). Each scheme's document writes
    the rule with that scheme's amount, and every platform states such a color per scheme.
  
  Vocabulary: the menu's state variants gain `current` (ten color parts, each in four states). Snapshot baselines change
  where a checked menu row, or a select's or combobox's chosen option in an open list, is drawn at standard contrast.
- d1611cc: Meter, a new component: where a known value stands in a known range — storage used, a battery's charge, a quota, a
  password's strength — as a bar or a ring that looks like the progress indicator, without saying that anything is under
  way.
  
  - Web: `<tanrei-meter>` (`variant`, `size`, `separation`, `status`, `value`, `min`, `max`, `label`, `value-text`);
    React: `Meter`. The host is a meter (`role="meter"`, `aria-valuemin`, `-max`, `-now`, `aria-valuetext`), never a
    progressbar and never busy. SwiftUI, Compose, Flutter and React Native are planned: their generated tokens carry
    `comp.meter`, and no component yet.
  - `status` (`default`, `info`, `success`, `warning`, `error`) changes the indicator's color and nothing else. The meter
    has no thresholds: the product decides what a value means, and says it in `valueText` too.
  - Tokens: `comp.meter`. Its sizes, track, separation, stop indicator, default indicator color and motion alias the
    progress indicator's, so the two match side by side and a layer can set either apart; the four status colors are the
    status roles.
  - The token build holds every meter indicator color — the default and the four statuses — 3:1 against the meter's track
    and against every surface role, in every scheme (WCAG 1.4.11).
  - The progress indicator's determinate drawing is now a shared web primitive; nothing it draws changes.
  - Baselines: new images for the meter's 18 fixtures, and one per preset — new, not changed.
- 2fe1f5a: **Motion by role, one appearance, and an accelerating exit.** New core tokens name how long a change takes and how it
  eases by what moves, and where everything that appears starts from. Nothing drawn changes yet: no component reads them
  in this release.
  
  - `tanrei.sys.motion.role.*` (21 durations, following `dial.motion.unit`): `state.{compact,default,large}` 200 / 250 /
    250 ms, `selection.{mark,travel}` 250 / 250, `resize.{default,large}` 300 / 400, `disclosure` 400,
    `appear.{hint,anchored,modal,sheet,toast}.{enter,exit}` 250/200, 300/250, 350/300, 400/350, 350/300, `feedback` 450,
    `show-delay` 300, `reduced` 100. A component's duration token is to alias its role, so a product re-times every
    component of a role in one line.
  - `tanrei.sys.motion.easing.{enter,exit,state,spatial}`: the default system enters, changes state and moves on the
    standard curve, `cubic-bezier(0.2, 0, 0, 1)`, and leaves on the accelerating one, `cubic-bezier(0.3, 0, 1, 1)`.
  - `tanrei.sys.behavior.appearance` — `fade-scale` (the default system: fade in, grow from 0.96), `fade`, `fade-slide`,
    `blur-slide`, `unfold` — sets `tanrei.sys.motion.appear.{opacity,scale,distance,blur}`; `appear.origin` (`anchor` |
    `center`) says where an anchored surface grows from. A layer chooses the appearance, or pins one of the values.
  - The rule language has a ninth function, `pick`: one value per name of a choice of kind, and the token takes the one
    the system's choice names. A pin holds against it as it does against a dial.
  - `m3-like` (and so `m3-expressive-like`) states Material 3's durations and emphasized curves for every role and
    chooses `unfold`, so it draws the same when its components take their roles. `cupertino` takes the root's.
  - The vocabulary grows by 31 ids (`tokens/vocabulary.lock.json`). The Figma plan documents the role durations and the
    appear values as numbers without a scope. The native platforms' generated system types gain `appearance` and the four
    easing roles.
  - `docs/architecture/motion.md` states the principles every component's motion is held to (MOT-1 to MOT-6).
- 07507aa: Number ticker, a new component: a number that changes — a count, a price, a score, a dashboard's figure — shown by
  moving each changed digit to its new value, so that a person sees that it changed, which way and roughly by how much,
  while assistive technology is told only the value it settles on.
  
  - Web: `<tanrei-number-ticker>` (`value`, `number-style`, `currency`, `unit`, `notation`, `fraction-digits`,
    `sign-display`, `locale`, `trend`, `animation`, `start-value`, `duration`, `live`, `label`; event `settle`); React:
    `NumberTicker` (`onSettle`). The number is written by `Intl.NumberFormat` in the locale (its digits, separators,
    symbols and short forms), in the text style of where it stands, in tabular figures. SwiftUI, Compose, Flutter and
    React Native are planned: their generated tokens carry `comp.number-ticker`, and no component yet.
  - `trend`: `auto` by default — every changed digit moves the way the whole number moved, so 19 to 20 moves both digits
    up — or `digit`, `up`, `down`. `animation`: `slide` (the default system's), `blur`, `blur-slide`, `flip` or `none`;
    `auto` reads `comp.number-ticker.animation`.
  - The width moves with the digits (the shared size transition); a change during another goes on from what is drawn;
    under reduced motion the new number is there at once. Not a live region by default; `live="polite"` tells the
    settled value once per change.
  - Tokens: `comp.number-ticker` — `animation`, `motion.duration` (the large resize role), `motion.easing` (spatial),
    `motion.stagger`, `motion.reduced-duration` (the reduced role), `blur.radius`, `blur-slide.distance`. No new `sys`
    token.
  - Glyph list: `flip` and `percent` join the names the components may draw, as values of the ticker's props.
  - Baselines: new images for the ticker's 7 fixtures, and one per preset — new, not changed.
- 1c85b08: **A system that does not have a component of another layer is told what to use instead.** The layer that holds a
  component's whole vocabulary now says what a system without it uses for its job, beside the declaration:
  `"outside": { "reason": "…", "insteadUse": [ … ] }`. Every components manifest of a system without the component —
  each shipped system's and the one `tanrei build` writes for a product — lists it under `omitted` with the layer it lives
  in (`providedBy`), that `reason`, and the components of `insteadUse` the system ships. The FAB menu, which lives in the
  m3-like layer, names the main action button and the bottom sheet: the default system's and cupertino's manifests name
  them; a product that includes the FAB menu has no entry for it. The stylesheet of each such system, a product's
  from `tanrei build` among them, names the same stand-ins in `--tanrei-unavailable-replacement`, so a debug build's report
  of a `<tanrei-fab-menu>` under the default system names the main action button and the bottom sheet.
  
  `pnpm validate` refuses a stand-in that is not a component of the inventory, or is the component itself, and a shipped
  system without the component that does not ship one of its stand-ins (the manifest would drop it unseen). A product
  that leaves a stand-in out is not refused: its manifest names the others.
- 75a89b5: **Breaking — the presets extend `core`.** `m3-like` and `cupertino` now extend the root layer `core` directly, not the
  default system `tanrei` (`m3-expressive-like` still extends `m3-like`). A preset no longer inherits the default
  system's choice of components: each says for itself what it leaves out. `m3-like` leaves out the `filled` navigation
  bar and the `tonal` tabs; `cupertino` leaves out the `filled` navigation bar and the FAB menu, with its reason and what
  to use instead (`toolbar`, `button-with-menu`). The `include` lines that only undid the default system's omissions are
  gone. What each preset ships is unchanged (`--tanrei-unavailable` holds the same list), and no resolved value moved:
  every token of every preset, and of a product built on one, resolves as it did, in every scheme, and every generated
  stylesheet, design-tool export, native constant, accessibility report and fidelity report is unchanged (a test holds
  it). What changes is the chain: a preset's bundle recipe, `tanrei build`, `tanrei validate`, Theme Studio and the MCP
  server's `list_systems`, `resolve` and `validate_layer` now say `core → m3-like → acme` where they said
  `core → tanrei → m3-like → acme`, and a preset's `extends` is `core`.
- bc9b8bd: **Breaking — `@tanrei/react` has one entry per design system, and its main entry is the default system's.** What a
  product can import is what its system has, so an editor offers, and a type check accepts, only that:
  
  | Entry | What it exports |
  |---|---|
  | `@tanrei/react` | the default system's components (Tanrei) |
  | `@tanrei/react/m3-like`, `@tanrei/react/m3-expressive-like`, `@tanrei/react/cupertino` | that preset's components |
  | `@tanrei/react/advanced` | the components listed as advanced, the building blocks of others, in every system |
  | `@tanrei/react/all` | every wrapper, whichever system has its component: for a product's own system and for building one |
  
  What breaks:
  
  - `FabMenu` and `FabMenuItem` are no longer exported by `@tanrei/react`: the FAB menu lives in the m3-like layer, and
    the default system does not descend from it. Import them from `@tanrei/react/m3-like` or
    `@tanrei/react/m3-expressive-like` (or `/all`).
  - `SegmentedButton` and `Segment` are no longer exported by `@tanrei/react`: the default system leaves the segmented
    button out. Import them from `@tanrei/react/m3-like`, `/m3-expressive-like` or `/cupertino` (or `/all`).
  - `TextInput`, `NumberInput`, `ColorInput`, `OneTimeCodeInput`, `EmbeddedTextInput`, `Combobox`, `FilePicker` and
    `ModalLayer` — the advanced components — are no longer exported by `@tanrei/react`: import them from
    `@tanrei/react/advanced`. A product usually writes the component built from one instead (`TextField`, `NumberField`,
    `ColorField`, `OneTimeCodeField`, `ChatComposer`, `ComboboxField`, `FileUpload`, `Dialog` and the other surfaces), and
    each one's doc comment now names them.
  - In `@tanrei/react`, `variant` takes none of the values the default system leaves out: `<TextField variant="outlined">`
    (and `filled`) is a type error, for the text field, the chip, color, number, select and combobox fields, and the
    select. The preset entries take their own values (`/m3-like`'s `TextField` takes `outlined`); `/all`
    and `/advanced` take every value. This is a type only: the wrapper is the same component in every entry, so a
    bundler still keeps only what is imported, from any entry.
  - The package's main module is `dist/entries/generated/index.js` (was `dist/index.js`); a deep import of `dist/index.js`
    no longer resolves. Every entry exports `setWords`, `missingWords` and `TanreiEvent`.
  
  The entries are generated from the components manifests (`scripts/entries.js`), and the manifests now name each
  component's React entry (`react.import`): the system's own entry, `@tanrei/react/advanced` for an advanced component,
  and `@tanrei/react/all` in a product's manifest (`tanrei build`), where the system has no entry of its own.
  
  The React generator now reads the tag prefix and the npm scope from `tanrei.config.json` instead of writing them.
- c927a0a: **The rule language can write a height that follows a density, on a grid, never below a floor, and the padding of
  its box.**
  
  - `mul` takes three optional terms, each a token: `times` (a number token the product is multiplied by, such as a
    density), `round` (a step: the result is rounded to its nearest multiple, ties upward, as CSS `round(nearest, …)`
    rounds) and `min` (a floor applied after rounding, so a floor off the grid gives exactly the floor):
    `max(min, round(of × by^exp × times, round))`. A rule without them gives what it gave before.
  - `pad`, `{ "fn": "pad", "of": "{padding}", "height": "{height}" }`, is the block padding of a box whose height moves:
    `max(0, of + (height − height₁) / 2)` on the 0.25px grid, where height₁ is the height as its rules give it with every
    `times` read as 1 and no `min`. It gives up half of what the box lost and takes half of what it gained, so the box
    stays two paddings and one line: a 32 box with 6 above and below its 20 line, held at a floor of 36, gets 8.
  - The web receives both as the same arithmetic in CSS (`max()`, `round()`, with height₁ written out through the
    height's aliases), so a density, a floor or a size unit set on `:root` at runtime moves a height and its padding
    together; JSON, Swift, Kotlin, Dart and React Native receive the values. The engine exports `roundToStep` and
    `unscaledLookup`, and `evaluateNumeric` reads height₁ from `ctx.unscaled`.
  
  No token uses the new forms yet: no value, no generated file and no picture changes.
- 590e070: Scroll area, a new component, and one system-wide choice of how the edge of a box that scrolls is marked while content
  lies beyond it.
  
  - Web: `<tanrei-scroll-area>` (`scroll-edge`, `edges`, `label`); React: `ScrollArea`. It keeps the browser's own
    scrolling and scroll bars, and draws no fill, edge or corner of its own. While it scrolls and holds nothing focusable
    it is one focus stop and a region named by `label` (WCAG 2.1.1). SwiftUI, Compose, Flutter and React Native are
    planned: their generated tokens carry `comp.scroll-area` and the new choice, and no component yet.
  - New core vocabulary: `sys.behavior.scroll-edge` — `shadow` (the default system's: a band in the color of the surface
    the box stands on, not a fixed shadow color), `fade` (the content itself fades out toward the edge, for a transparent
    surface, a picture or a video behind it), `line` and `blur` (a progressive blur). m3-like draws `line`, cupertino
    `blur`. Its amounts are `sys.scroll-edge.extent` (24) and `sys.scroll-edge.blur.extent` (48), `.radius` (8) and
    `.layers` (4). A platform that cannot blur draws `shadow`; forced colors draw the line in the text color.
  - `sys.behavior.divider-visibility` is unchanged: it says when the line of a region that stays in place stands;
    `scroll-edge` says what marks the edge of a box that scrolls.
  - Whether content lies beyond an edge is read from an intersection notice on a mark at each end of the content, never
    from a scroll listener or a layout read in a frame of a scroll.
  - Tokens: `comp.scroll-area`. `comp.scroll-area.shadow.color` defaults to `sys.color.surface`; set it (on the web, the
    `--tanrei-comp-scroll-area-shadow-color` custom property) to the surface the area stands on.
  - Nothing is removed or renamed.
  - Baselines: new images for the scroll area's 7 fixtures, and one per preset — new, not changed.
- e0810e9: **Breaking — a stacked input box is as tall as a Button of the same size.** An input and a Button set side by side in
  one row (a search box and its button, a code and Apply, a quantity and Add) now stand as tall as each other at one size
  name. The stacked box — the one that draws no label inside it, and the only look the default system ships — is 32 / 40
  / 56 high at small, medium and large, where it was 40 / 48 / 56: the Button's heights. Filled and outlined boxes, which
  float their label inside them, keep 40 / 48 / 56. This holds for every box drawn from `comp.input-box`: the text input,
  the select, the combobox, the number input and the color input, and every field and composite that frames one (text,
  select, combobox, number and color fields, the chip field, the field group, the search field).
  
  - New tokens: `comp.input-box.stacked.container.height.{small,medium,large}`, which alias
    `comp.button.container.height.*` in the default system, and
    `comp.input-box.stacked.container.padding-block.{small,medium,large}` (4 / 6 / 14), so that a line of the size's
    text fits in the new heights. Both are members of the box's size axis. `comp.input-box.container.height.*` and
    `.container.padding-block.*` are now read by the filled and outlined boxes only. A layer that set those to resize its
    stacked boxes sets the stacked tokens instead.
  - The token build (`pnpm validate`) refuses a default system whose stacked heights are not its Button's.
  - `cupertino` and `m3-like` (and so `m3-expressive-like`) set the stacked tokens to their own `container.*` values:
    their fields keep the heights they had, and their pictures do not move.
  - The hit area does not shrink: where a box is shorter than the minimum target, its target still reaches it.
  - A small number input draws its steppers as small Buttons (they were medium at every size, NMI-25), so that it is
    as tall as a small text input beside it; at medium and large they stay medium Buttons.
  
  The specs say it in `TXI-16`, `TXI-51`, `TXI-68`, `SEL-1`, `SEL-65`, `CMB-1`, `CMB-63`, `NMI-1`, `NMI-25`, `NMI-47`, `CLI-1` and
  `CLI-45`, and in each `size` description. SwiftUI, Compose, Flutter and React Native receive the new tokens only; their
  boxes are not built yet. Baselines: every default-system picture of a stacked small or medium box is recorded again
  (the five boxes, their fields, the field and field group, the chip field and the search field); that is the intended
  result of this change. The presets' pictures are unchanged.
- 0646d07: **The rule language has `sub`: a corner inside another.** `{ "fn": "sub", "of": "{outer}", "by": "{inset}" }` gives
  max(0, of − by) in the unit of `of` — the radius of a corner that stands inside another at an inset, so that the two
  curves keep one distance. A layer may write it on any dimension; an inset wider than the corner gives a square corner,
  never a negative one. The web receives it as `max(0px, calc(var(<outer>) - var(<inset>)))`, so it follows an outer
  corner or an inset a product sets at runtime; the native platforms receive the value.
  
  `pnpm validate` holds an inner corner annotated `$extensions["dev.tanrei.concentric"]` (`{ "outer": "{id}", "inset":
  "{id}" }`) to that rule in the default system. Nothing is annotated yet: no value and no picture changes.
- f669310: **Breaking — no compatibility is kept in the tokens during 0.x.** Tokens kept only for platforms that had not caught up,
  the path for deprecated tokens, and the pass that let a layer declare what the core already has are removed. Nothing a
  web component draws changes: no component read any of the removed tokens. What breaks:
  
  - **Navigation bar:** `comp.navigation-bar.item.container.width` and `.height` are gone
    (`--tanrei-comp-navigation-bar-item-container-width` and `-height`). The item container is the destination's share
    of the bar less `container.padding`, as before. `cupertino` now gives `item.icon-indicator.height` its own value
    (`dial.size.unit × 8`, 32), the value the alias it replaces resolved to.
  - **Navigation drawer:** `comp.navigation-drawer.item.badge.typescale` and `item.badge.color` in its four conditions,
    with their per-state tokens (21 tokens), are gone. A destination's trailing string is drawn with
    `item.trailing-text.*`.
  - **Navigation rail:** the retired rail's whole token set (`comp.navigation-rail.*`, 63 tokens; 71 custom properties in
    `tokens.css`) is gone. A collapsible navigation drawer, collapsed, is the rail (`comp.navigation-drawer.collapsed.*`).
  - **`$deprecated`:** `pnpm validate` and `pnpm generate` refuse a `$deprecated` in Tanrei's token sources, and the
    build no longer has a path for deprecated tokens (the native emitters left them out). The MCP server's token answers
    and Theme Studio no longer carry a `deprecated` field. A token that goes is removed and named in the changeset.
  - **Layers:** a layer that declares under `vocabulary` a token, a step of a series, an axis value or a color role the
    core already has is refused with an error that says to delete the declaration and write its value under `tokens`; it
    was accepted with a notice. `notices` is gone from the resolved system, from `tanrei validate`'s output, from the MCP
    server's `validate_layer` and `propose_extension` answers, and from Theme Studio's accessibility panel.
  
  The paused native packages' generated tokens lose the same fields; their navigation bar, drawer and rail sources catch
  up when their pause ends.
- 11e9c59: **Breaking — Toolbar: inline by default.** A `<tanrei-toolbar>` (React `Toolbar`) that does not say its `variant` is now
  `inline`: it stands where the layout puts it, as long as its items need and never longer than its container, with no
  surface, shadow or edge of its own in the default system, its items closed up as a floating toolbar's are. It no longer
  spans the bottom edge or reads the bottom inset. Write `variant="docked"` where you want the bar across the bottom edge.
  A variant a design system adds now takes the inline structure (it took the docked one). The toolbar moves from the
  navigation category to actions: a toolbar is not a way to choose a destination.
  
  A toolbar is now a container of related controls wherever it stands, as the WAI-ARIA toolbar pattern, React Aria, Primer's
  action bar and Fluent 2 describe it:
  
  - **Items:** Buttons (icon-only or labelled, toggles among them), a Button with a `<tanrei-menu anchor>` beside it (a menu
    button: the menu is not laid out), `<tanrei-button-with-menu>` (each half its own stop of the arrow keys), and the new
    `<tanrei-toolbar-group label>` (React `ToolbarGroup`) holding them; a `<tanrei-divider>` is a separator.
  - **Separation:** two groups, or a group and an item, are set apart by a short line with space on each side, or by space
    alone, as `separation` (`auto`, the design system's `comp.toolbar.separation`, which follows
    `sys.behavior.separation`; `divider`; `gap`) says.
  - **Overflow:** `overflow="menu"` (the default) hides items from the end, one at a time, behind an overflow button whose
    menu repeats them — a toggle as a checkbox item, a menu button as a submenu, a Button with menu as its main action and
    a submenu — and a row activates the hidden item itself. Name the button with `overflow-label`, or once with
    `setWords({ toolbarOverflowLabel })` (English word pack: "More actions"). `toolbar-overflow="never"` on an item keeps
    it. What is hidden is decided before a frame is drawn. **Breaking:** a toolbar whose items do not fit no longer scrolls
    by default and no longer reports that it scrolls; `overflow="scroll"` keeps the scrolling.
  - Tokens: twelve new `comp.toolbar` tokens (the inline variant's members, `group.gap`, `divider.length`,
    `divider.thickness`, `divider.color`, `separation`); none renamed or re-valued.
  - `<tanrei-button-with-menu>` in a toolbar keeps one of its halves at `tabindex="-1"`, as the toolbar's roving Tab stop
    says; outside a toolbar both halves are Tab stops as before.
  
  SwiftUI, Compose, Flutter and React Native stay lagging: they keep the docked default, Buttons only and scrolling until
  they catch up.
  
  Baselines (web, recorded on Linux by the Record baselines workflow): nine new pictures, one per new fixture —
  `toolbar/inline-formatting`, `inline-separation-gap`, `inline-overflow`, `inline-overflow-pinned`, `inline-menu-button`,
  `inline-button-with-menu`, `inline-labelled-toggles`, `floating-vertical-groups` and `rtl-inline-overflow`. The seven
  existing toolbar pictures state their variant and did not move.
- b787a0c: **Breaking — `@tanrei/web` registers the default system's components and no other.** A product on the default system
  reaches only the components its system ships, so it cannot pick one the system does not have. What breaks:
  
  - `import '@tanrei/web'` no longer registers the segmented button (`<tanrei-segmented-button>`, `<tanrei-segment>`),
    which the default system leaves out, and no longer exports `TanreiSegmentedButton`, `TanreiSegment` and their types.
  - `@tanrei/web/m3-like` now registers everything the m3-like system ships, not the FAB menu alone.
  
  **New — an entry per system, and one for everything.**
  
  - `@tanrei/web/<id>` (`m3-like`, `m3-expressive-like`, `cupertino`; the default system's is `@tanrei/web` itself)
    registers what system `<id>` ships: everything `@tanrei/web` registers, and the components only that system ships
    (the segmented button on the three presets, the FAB menu on the two m3-like systems). It exports their classes and
    types. `@tanrei/react/<id>` is the same set in React.
  - `@tanrei/web/all` registers every component of the package.
  - A component's own module, `@tanrei/web/components/<name>`, registers it alone: a product on the default system that
    includes the segmented button in its layer (`"components": { "include": ["segmented-button"] }`) imports
    `@tanrei/web/components/segmented-button`, and draws it with its own tokens.
  
  The components manifests name these entries: a system's components are registered by its entry (`@tanrei/web` for the
  default system's), and in a product's manifest (`tanrei build`) a component no system it is built on ships — one it
  brings back or includes from another layer — is registered by its own module.
  
  **A lighter `custom-elements.json`, and one per system.** The elements' manifest lists the package's public surface:
  the private and protected members of the classes and the text of the components' styles are no longer in it (4.6 MB →
  2.2 MB). `@tanrei/web/custom-elements/<id>.json` is the manifest of the elements system `<id>` ships: the default
  system's has neither the FAB menu nor the segmented button.

### Patch Changes

- 908d897: A `contrast-pick` on a color role whose candidates are `ref.palette` tones no longer fails the build with
  `unknown color role`. The role aliases the tone it picks, and the per-state component colors that read the role (a
  filled button's label on `on-primary`, for one) now follow that alias into the palette. Before, they looked the tone
  up as a role. In Theme Studio, a layer that sets such a pick now previews instead of reporting the error.
- a0f001b: **Visual change, intended — the rows of a menu, a select, a combobox and a search view are concentric with their
  sheet.** A row stands inside its sheet at the sheet's inline padding (4) and was rounded by `corner.small` (6) inside
  a sheet rounded by `corner.medium` (8), so a filled row bulged past the sheet's curve at the first and last rows. In
  the default system each row's corner is now the sheet's corner less that padding (4), derived with `sub`, and follows
  the sheet's corner and padding: `comp.menu.container.shape`, `comp.select.option.shape`, `comp.combobox.option.shape`
  and `comp.search.suggestion.container.shape`. On the web they are
  `max(0px, calc(var(<sheet corner>) - var(<sheet padding>)))`, so a product that sets the sheet's corner or padding moves
  the rows with it. The snapshot baselines that show a filled menu row (five menu fixtures: an open submenu's item, a
  current link item) are recorded again for this. The presets keep the corners they drew.
- dda6ec1: **Fixed — a product's stylesheet says what its system does not have.** The sheet `tanrei build` writes for the `web`
  target now declares `--tanrei-unavailable` (the components and `variant` values the product's system leaves out) and
  `--tanrei-unavailable-layer` (the components that live in a layer it does not extend) in the product's own scope, as a
  shipped system's sheet does. Before, an element under a product's `data-tanrei-system` read the default system's lists
  from `:root`: a product on m3-like was told in a debug build that its outlined text input and its FAB menu were not in
  its system, and a product's own `components.omit` was never reported.
  Theme Studio (`tanrei studio`) previews a layer with the same lists in its scope, so what it previews is still what
  the build writes.
- 5368526: **Visual change, intended — a selected row is told from a hovered one in the tree view, the navigation drawer and
  the table.** In the default system a selected tree row, drawer destination and table row took the neutral
  `secondary-container` tone, which in light is the grey of a hovered row (1.00:1 to 1.03:1 between them). They now
  take the list's selection: a layer of the row's own content color at the selected layer (16 %, twice the hover layer),
  1.15:1 to 1.30:1 from a hovered row in every scheme and on every surface role. `comp.tree-view.selected.container.color`,
  `comp.navigation-drawer.selected.item.container.color` and `comp.table.row.selected.container.color` change value; the
  text of a selected row keeps its color. The snapshot baselines of the tree view, navigation drawer and table fixtures
  that show a selected row are recorded again for this. The presets `m3-like`, `m3-expressive-like` and `cupertino` draw
  as before.
  
  `pnpm validate` holds it: in the default system a selected row and a hovered one (list, tree view, navigation drawer,
  table) stand at least 1.1:1 apart in every scheme, each laid over each surface role, and a selected row's text is read
  on its fill at 4.5:1 (7:1 in the high-contrast schemes).
- b9c5fbe: **A system's scope inherits the colour scheme around it.** A preset's stylesheet (`@tanrei/web/systems/<id>.css`), and a
  product's built with `tanrei build`, no longer declares `color-scheme: light dark` on `[data-tanrei-system="<id>"]`.
  That declaration took the scope back to the operating system's scheme: a preset placed under `<html
  data-tanrei-theme="dark">` drew light on a light system. Now only the root declares both themes, and a scope draws in
  the theme forced around it, or follows the system where nothing is forced, as every other subtree does; a scope still
  forces its own with `data-tanrei-theme` on itself. What broke: a page that relied on a scope following the operating
  system under a forced ancestor must take `data-tanrei-theme` off that ancestor, or remove it from around the scope.
  
  The documentation's gallery of fixtures follows the header's theme as it changes (until a stage's own switch is
  turned), and a gallery window is given the page's contrast, at its first paint and on every change.
- Updated dependencies [50a3f0e]
- Updated dependencies [908d897]
- Updated dependencies [d8fb809]
- Updated dependencies [991095d]
- Updated dependencies [5287d31]
- Updated dependencies [2fe1f5a]
- Updated dependencies [66f1b1c]
- Updated dependencies [db7055c]
- Updated dependencies [c927a0a]
- Updated dependencies [0646d07]
- Updated dependencies [f669310]
  - @tanrei/token-engine@0.1.0-next.1

## 0.1.0-next.0

### Patch Changes

- Updated dependencies [f181fc2]
  - @tanrei/token-engine@0.1.0-next.0
