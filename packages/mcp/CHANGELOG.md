# @tanrei/mcp

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
- b0e55fb: The edge of a region that stays in place is drawn at rest. The app bar's bottom edge, the dividers below a dialog's
  or a popover's header and above its actions, and the divider below a side sheet's header came and went with the
  scroll position; each parts a fixed region from content that scrolls, so an app shell's header, for one, showed its
  line only once the page had moved. In the default system the app bar now draws its edge in both conditions, a dialog
  and a popover draw both dividers for as long as their content scrolls (at its top included; none while everything
  fits), and a side sheet draws the divider below its header whenever the header is drawn, as it already drew the one
  above its actions.
  
  A new choice of kind, `sys.behavior.divider-visibility` (`always` | `scroll`), read through
  `comp.app-bar.outline.visibility` and `comp.{dialog,popover,side-sheet}.divider.visibility`, and a
  `dividerVisibility` prop (`auto` | `always` | `scroll`, the `divider-visibility` attribute on the web) on the four
  components: `scroll` draws what they drew before. `cupertino` and `m3-like` choose `scroll`, as Apple's bars and
  Material's top app bar and dialogs do, so nothing changes under those presets. Lines that say there is more to scroll
  to — a table's sides and sticky header, a tree's or a drawer's pinned rows — are not this choice and still follow the
  scroll.
  
  The vocabulary gains these five tokens. The web draws the choice; SwiftUI, Compose, Flutter and React Native receive
  the tokens and the typed enumeration but do not draw the choice yet, and keep the scroll form. Baselines: the default
  system's app bar fixtures now show the bottom edge at rest, the dialog's and the popover's `scrolling` fixtures both
  dividers, and the side sheet's fixtures with a header the divider below it — the intended result of this change.
- 779373a: **New — the MCP server answers about components.** An agent that writes UI can now work with only the components a
  design system has. Four read-only tools and one resource, answered from the system's components manifest and the
  component specs (never from the documentation site):
  
  - `list_components` — the components a system ships (default `tanrei`; with `layerFile`, a product's system as
    `tanrei build` works it out): each with its web element and the module that registers it, its React wrapper and the
    entry to import it from, the `variant` values the system offers and its status. `omitted` lists what the system does
    not have — why, what to use instead (`insteadUse`), the shipped systems that have it (`availableIn`) and the line of
    a product's layer that takes it (`howToInclude`); `omittedVariants` the variant values it leaves out. Cupertino lists
    no FAB menu; m3-like lists it, registered by `@tanrei/web/m3-like`.
  - `get_component` — one component from its spec, for one system: props with `variant` narrowed to the system's values,
    events, slots, items, states, the behaviour as EARS rules with their stable ids, accessibility and one fixture as an
    example; `available: false` with what to use instead where the system does not have it.
  - `find_component` — which component does a job, by the words of its name, summary and props.
  - `check_usage` — the elements, selectors, imports and literal variants in code that the system does not have, each
    with its file, line and column and what to use instead: the check `tanrei audit` runs.
  - `tanrei://components/<id>` — each shipped system's components manifest.
  
  The server's instructions now say to call `list_components` first and use nothing it does not list, and to use the
  default system when asked to rebuild a product with Tanrei. The published server carries the component specs, the
  catalog and the manifests in its copy of the vocabulary.
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
- de408fa: Documentation site: an anatomy figure and a measure figure on the page of every component whose spec says where the
  web draws its parts (32 so far), drawn over the live component in the example frame.
  
  - The anatomy figure numbers each part the fixture draws, in the spec's order, with a leader to it; the anatomy table
    under it is its legend. A focus ring, drawn only while a control has the keyboard's focus, is shown as a dashed ring
    as far out as the component draws it.
  - The measure figure draws a dimension line for each length it can show on the fixture — heights, sizes, widths, the
    container's paddings, the gap between its parts — labelled with what it is and the value its token resolves to, and
    names each token in a table under it. A line is drawn only where the component draws that length; where it draws
    another, the table says what it found instead.
  - Both follow the design system chosen in the header, the scheme, the contrast and the page's direction (mirrored in
    Arabic), are drawn in the system's colors under forced colors, and hold their room before the component is defined.
    Their text alternatives are in the six languages.
  
  Component specs: the button's and the badge's `anatomyFixture` name the fixture their anatomy figures draw — the
  button with its leading icon (`filled-leading-icon`), the badge with a count (`count-single`).
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
- 87218b3: `@tanrei/mcp` has a listing for the MCP registry: `packages/mcp/server.json`, which `mcp-publisher publish` sends. It
  names the server `io.github.chnotchy/tanrei` (the package's `mcpName`), says what it does in the registry's 100
  characters, and lists the npm package at its exact version, run over stdio. `pnpm generate` writes it from
  `tanrei.config.json`, the package's `package.json` and `docs/registries/npm-keywords.json`, whose `mcpServer` entry is
  now an object with the listing's `title` and `description`; `pnpm version-packages` rewrites it with each new version.
  Nothing is listed yet: the registry refuses a version with an `x` in it, so no `-next` prerelease can be listed.
- 19b491d: `@tanrei/mcp` depends on `@modelcontextprotocol/sdk` `^1.32.1` (was `^1.30.0`). Versions from 1.12.0 up to 1.30.x are
  affected by GHSA-6qxp-vccf-f47h: the SDK's OAuth client could send stored credentials to an authorization server the
  MCP server chose. The Tanrei server talks over stdio and uses no OAuth, but a product that installs it resolves the SDK
  for its whole tree, so the range no longer admits an affected version.
- 66f1b1c: The packages say on npm where their documentation is (`homepage`, the package's page on the docs site), where to
  report a bug (`bugs`, the repository's issues) and what they are (`keywords`). `@tanrei/mcp` carries `mcpName`, its
  name in the MCP registry. `pnpm generate` writes them from `tanrei.config.json` (its new `site`) and
  `docs/registries/npm-keywords.json`.
- 6016e87: Radio button: the center of a chosen radio now stands 3:1 apart from the ring around it (WCAG 1.4.11). In the default
  system the fill inside the thick ring is the ring's color at 16 % opacity rather than 50 %
  (`comp.radio-button.fill.opacity`, 0.5 → 0.16): a lighter tint, at least 3.17:1 from the ring at rest, hovered, focused
  and pressed, on every surface role and in all six schemes, where 50 % fell to 1.91:1 (the focused error form on
  `surface-container-highest` in light) and under 3:1 in the dark schemes once a state layer was under it. 16 % is the
  step the default system already uses for a selection's tint (a checked menu row, a selected list option, the tonal tabs'
  indicator). A menu's radio item draws the same ring, and its fill follows (`comp.menu.control.fill.opacity`,
  0.5 → 0.16; 4.67:1 at the least on the menu's sheet). The ring, its stroke and the motion are unchanged, and so are the
  imitation presets, whose radios have opaque centers of their own and whose menus mark radio items with a check.
  
  The token build holds it from now on: in every scheme, the fill of a radio's mark as drawn — at its opacity, over the
  state layer of each enabled state — is held 3:1 against the ring it meets, or, where `fill.inset` leaves a gap (a dot),
  against the gap, on every surface role (the menu's sheet for a menu's radio item). It fails the default system's build,
  is a warning for a product layer, and is recorded as information for an imitation preset (`cupertino`'s light center in
  a hairline ring is 1.80:1 in light). A product layer that strengthens the state layers may need a quieter fill: `tanrei
  validate` and the MCP server's `validate_layer` now say so. A finding about a pair of component colors is classed as a
  contrast measurement, as a pair of roles is.
- db7055c: The READMEs on npm no longer say that the packages are not on npm. Each is written as it reads from 0.1.0 on
  (`npm install @tanrei/web`), and what it says exists — the version, what to install while it is a prerelease, each
  platform's components by status — is written by `pnpm generate` from the repository, so it never claims more than is
  there. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, and its
  changeset says what broke.
  
  `@tanrei/web`'s README is a short guide for its users (it was 953 KB, and npm showed only its first 65,536
  characters); the implementation notes it held stay in the repository as `packages/web/IMPLEMENTATION.md`, which the
  package does not ship.
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
- 179f1e0: Search: the usage rule its tokens give an agent no longer says a match's fill is transparent in the default system. A
  match is marked by the stronger text color, a raised weight and a quiet fill (`comp.search.result.mark.container.color`,
  the secondary container in the default system), as the token's value and the spec say.
- bdf187b: Component specs: `platforms.web.parts` says where each part of a component's anatomy is drawn on the web, and
  `anatomyFixture` may name the fixture an anatomy diagram draws. A part maps to a CSS part (`container`), a slot
  (`slot:icon`), a child element or one of its parts (`tanrei-menu-item label`), a light-DOM class, or one of these
  with `@outline`, `@focus-ring` or `@backdrop` (`container@focus-ring`); a part with no box of its own on the web says
  why (`{ "noBox": "…" }`). `validate` holds that every anatomy id is mapped and that every target exists in
  `custom-elements.json` or the component's stylesheet. The specs the MCP server returns carry it for 32 components so
  far: button, tabs, slider, menu, navigation-drawer, text-field, the controls whose remaining parts are an outline, a
  focus ring or a scrim, and the components whose every part is a CSS part of the same name. The native platforms'
  blocks may not write it. Nothing is removed or renamed.
- 0646d07: **The rule language has `sub`: a corner inside another.** `{ "fn": "sub", "of": "{outer}", "by": "{inset}" }` gives
  max(0, of − by) in the unit of `of` — the radius of a corner that stands inside another at an inset, so that the two
  curves keep one distance. A layer may write it on any dimension; an inset wider than the corner gives a square corner,
  never a negative one. The web receives it as `max(0px, calc(var(<outer>) - var(<inset>)))`, so it follows an outer
  corner or an inset a product sets at runtime; the native platforms receive the value.
  
  `pnpm validate` holds an inner corner annotated `$extensions["dev.tanrei.concentric"]` (`{ "outer": "{id}", "inset":
  "{id}" }`) to that rule in the default system. Nothing is annotated yet: no value and no picture changes.

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
