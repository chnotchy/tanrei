# @tanrei/token-engine

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
- 991095d: **Breaking — the FAB menu lives in the m3-like layer.** A component lives in the layer every system that ships it
  descends from; the FAB menu is shipped by `m3-like` only, so it lives in `m3-like`. Its name,
  its element (`<tanrei-fab-menu>`, `<tanrei-fab-menu-item>`) and its behaviour do not change. What breaks:
  
  - `import '@tanrei/web'` no longer registers it. Import the entry of a system that ships it
    (`@tanrei/web/m3-like`), or the component's own module (`@tanrei/web/components/fab-menu`).
  - Its 226 tokens (282 declarations) are no longer in the default `tokens.css` nor in `systems/cupertino.css`; they stay,
    unchanged, in `systems/m3-like.css`. The default system and cupertino no longer
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
  - `m3-like` states Material 3's durations and emphasized curves for every role and
    chooses `unfold`, so it draws the same when its components take their roles. `cupertino` takes the root's.
  - The vocabulary grows by 31 ids (`tokens/vocabulary.lock.json`). The Figma plan documents the role durations and the
    appear values as numbers without a scope. The native platforms' generated system types gain `appearance` and the four
    easing roles.
  - `docs/architecture/motion.md` states the principles every component's motion is held to (MOT-1 to MOT-6).
- f818941: **Breaking — one Material preset: `m3-like` follows current Material 3, and `m3-expressive-like` is removed.**
  Material 3 Expressive is not a separate design system: it is the name of an update to Material 3, documented on the
  same site and pages. So there is one Material preset, `m3-like`, and it follows the current Material 3 specification,
  the Expressive update included. Like every preset it is an example of imitating another design system, not Tanrei's
  own design.
  
  What breaks:
  
  - The system `m3-expressive-like` is gone, with everything generated from it: the `@tanrei/web/m3-expressive-like` and
    `@tanrei/react/m3-expressive-like` entries, `systems/m3-expressive-like.css`, its native system constants
    (`TanreiSystem.m3ExpressiveLike`, `TanreiSystem.M3ExpressiveLike`, `m3ExpressiveLikeSystem`, `m3ExpressiveLike`),
    its design-tool export, its fidelity report, its place on the docs site and in the Theme Studio's start menu. There
    is no alias and no redirect from the old id: use `m3-like`, which now has what it had.
  - `m3-like`'s buttons are Material 3's five sizes (androidx.compose.material3's `Button*Tokens` and
    `*IconButtonTokens`), mapped to Tanrei's by role: `small`, `medium` and `large` are Material's extra small, small
    and medium, 32, 40 and 56 tall as before, so a Button at the default size is Material's default, and `xlarge` (96)
    and `xxlarge` (136), Material's large and extra large, join its vocabulary. From `small` to `xxlarge` they take
    Material's leading and trailing space (16 / 16 / 24 / 48 / 64; small was 12), icon-to-label gap (8 / 8 / 8 / 12 /
    16), icon size (20 / 20 / 24 / 32 / 40; was 18), outline width (1 / 1 / 1 / 2 / 3) and label style (label, label,
    heading-5, heading-3, heading-1, after `ButtonDefaults.textStyleFor`; large was label). An icon-only Button draws
    its glyph at 20 / 24 / 24 / 32 / 40, is 28 / 32 / 48 / 64 / 104 wide when narrow and 40 / 52 / 72 / 128 / 184 when
    wide (small to large as before). A host's close button and the snackbar's actions stay at the small Button size,
    32 under `m3-like`, where Material draws its 40 standard icon button: the mimicry gap `close-button-size`.
  - `m3-like`'s loading indicator is 38 in its 48 container (was 40), and contained it draws on-primary-container on a
    flat primary-container (was on-surface-variant on surface-container-lowest at level 2), as androidx's
    `LoadingIndicatorTokens` give it.
  - The fidelity report's `reference` is a list (one entry per reference snapshot), in `tokens/generated/<id>/fidelity.json`
    and in the MCP server's `list_systems`. `m3-like` is measured against material-web and against androidx's Material 3
    tokens (the five button sizes, the five icon button sizes and the loading indicator); where material-web's older
    figure differs (a button's icon at 18), the androidx one is current Material 3, and the map says so
    (`superseded-by`). `tokens/fidelity/reference/androidx-material3-buttons.json` is now `androidx-material3.json`.
  
  Baselines: the snapshot baselines of the `m3-like` fixtures that draw these parts change, and that is the intended
  result of this change. They are recorded again on Linux, not in this change. On the web, 25 of the 107
  `packages/web/snapshots/systems/m3-like/` baselines change, found by rendering every one before and after the change
  on one machine and comparing the two renders: app-bar/small-scrolled, button/{elevated,filled,outlined,text,tonal}-medium,
  button-group/connected, calendar/range, callout/closable-title-actions, chat-composer/inline-rtl,
  code-block/syntax-marked, copy-button/labelled-tonal, date-time-picker/modal-date-time, dialog/icon,
  empty-state/actions, figure/docs-demo-code, file-picker/drop-area-error, file-upload/drop-area-statuses,
  image-preview/several-rtl, loading-indicator/contained-medium, navigation-drawer/collapsed-labels-always,
  page-header/everything, popover/arrow-actions, side-sheet/modal and toolbar/floating. The native platforms'
  `m3-like` baselines of the button, button group, icon button, loading indicator and the fixtures that draw Buttons
  change too, when those platforms catch up. Every `m3-expressive-like` baseline is removed with its system: 107 on
  the web and 35 each on SwiftUI, Compose and Flutter.
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

### Patch Changes

- 908d897: A `contrast-pick` on a color role whose candidates are `ref.palette` tones no longer fails the build with
  `unknown color role`. The role aliases the tone it picks, and the per-state component colors that read the role (a
  filled button's label on `on-primary`, for one) now follow that alias into the palette. Before, they looked the tone
  up as a role. In Theme Studio, a layer that sets such a pick now previews instead of reporting the error.
- 66f1b1c: The packages say on npm where their documentation is (`homepage`, the package's page on the docs site), where to
  report a bug (`bugs`, the repository's issues) and what they are (`keywords`). `@tanrei/mcp` carries `mcpName`, its
  name in the MCP registry. `pnpm generate` writes them from `tanrei.config.json` (its new `site`) and
  `docs/registries/npm-keywords.json`.
- db7055c: The READMEs on npm no longer say that the packages are not on npm. Each is written as it reads from 0.1.0 on
  (`npm install @tanrei/web`), and what it says exists — the version, what to install while it is a prerelease, each
  platform's components by status — is written by `pnpm generate` from the repository, so it never claims more than is
  there. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, and its
  changeset says what broke.
  
  `@tanrei/web`'s README is a short guide for its users (it was 953 KB, and npm showed only its first 65,536
  characters); the implementation notes it held stay in the repository as `packages/web/IMPLEMENTATION.md`, which the
  package does not ship.

## 0.1.0-next.0

### Minor Changes

- f181fc2: Initial release. Tanrei is one design system shipped to five platforms — Web Components (with React wrappers), SwiftUI,
  Jetpack Compose, Flutter and React Native — from one set of DTCG design tokens and platform-neutral component specs.
  This release includes the token pipeline and its generated outputs for every platform, the default `tanrei` system and
  the shipped presets, the components listed in the [status matrix](https://tanrei.chnotchy.com/status/) at the status shown there
  for each platform, the token engine, the CLI, and the MCP server.
  
  Every published package carries its LICENSE and NOTICE, and what a build bundles (Lit in `@tanrei/web`'s
  `dist/tanrei.bundle.js`; the code and fonts of the Theme Studio app in `@tanrei/cli`) ships with its licences in
  `THIRD_PARTY_LICENSES.md`.
