# @tanrei/cli

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
- dfea3ff: The token build reports how many contrast pairs it checked, in each scheme. Every `a11y-report.json` — a product's in
  the `tokens` output of `tanrei build`, and each shipped system's in the repository — has a `checked` field: `rolePairs`,
  the pairs of color roles (each foreground role on every background it may sit on, the tonal and declared pairs, and the
  hairline and an input's edge in the raised-contrast schemes), and `componentPairs`, the pairs of a component's own
  colors (a focus indicator on its own bar, the snackbar's inverse status forms, code, a radio's mark, a link told from
  text by color), as totals and per scheme. A pair whose colors a role pair already holds, or that the system does not
  have, is neither measured nor counted. The default system now has a report of its own, `tokens/generated/a11y-report.json`
  (`criteria: "enforced"`): 826 role pairs across its six schemes (127 at standard contrast, 143 at medium and at high)
  and 888 component pairs (148 per scheme), none failing. The build's output prints the same count.
- 8f7b8f0: `tanrei build` prints the glyph names of the icon set that Tanrei's components may draw by themselves (a chevron, a
  check, the cross of a close button…), in alphabetical order and comma-separated, and the axis values the product's
  system draws icons at (fill, weight, grade, optical size). The full Material Symbols file is 5.4 MB; a product adds its
  own names to the list and loads only those glyphs at those values — from Google Fonts with `icon_names=` and axis
  ranges, or from a file it cuts down with a subsetter that keeps the ligature features. The list is generated from the
  glyphs the specs give and the web components' code declares.
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
- 97aaf61: The glyph names `tanrei build` prints are the glyphs the components draw and no other word: 163 names instead of 242.
  The list no longer holds words such as `start`, `width`, `script` or `function` that the icon set also names but that
  the components' code writes only as strings, so an icon font cut down to it is about a third smaller.
- 66f1b1c: The packages say on npm where their documentation is (`homepage`, the package's page on the docs site), where to
  report a bug (`bugs`, the repository's issues) and what they are (`keywords`). `@tanrei/mcp` carries `mcpName`, its
  name in the MCP registry. `pnpm generate` writes them from `tanrei.config.json` (its new `site`) and
  `docs/registries/npm-keywords.json`.
- dda6ec1: **Fixed — a product's stylesheet says what its system does not have.** The sheet `tanrei build` writes for the `web`
  target now declares `--tanrei-unavailable` (the components and `variant` values the product's system leaves out) and
  `--tanrei-unavailable-layer` (the components that live in a layer it does not extend) in the product's own scope, as a
  shipped system's sheet does. Before, an element under a product's `data-tanrei-system` read the default system's lists
  from `:root`: a product on m3-like was told in a debug build that its outlined text input and its FAB menu were not in
  its system, and a product's own `components.omit` was never reported.
  Theme Studio (`tanrei studio`) previews a layer with the same lists in its scope, so what it previews is still what
  the build writes.
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
- ad3e53b: Theme Studio (served by `tanrei studio`): the Japanese messages are Japanese sentences — a message that names a thing
  puts the name first («<id> を語彙に追加しました», «<file> をダウンロードしました»), a label and its value are joined by a
  full-width colon with no space after it, and two sentences are joined with no space. The Japanese wording changed.
  Arabic is drawn in Noto Sans Arabic, which the app now loads for the Arabic subset alone (its OFL notice travels in the
  app's third-party licences); a label beside a value is set in the text face and only the value in the code face; a
  component with no size axis or no variants shows no empty "Sizes:" or "Variants:" row.
  
  The default system's token descriptions say each measure by its value and role instead of by another design system's
  name, and the corner smoothing description says how the curve differs on Apple's platforms and on the web. The Japanese
  fixture of the table now says «4 件中 1 件を選択中» (its web baseline is recorded again with the new text), and the color
  field's and the field's Japanese fixtures name their picker «色を選択» (an accessible name, not drawn).
- 1a4e09f: Theme Studio (served by `tanrei studio`, and on the documentation site): stepping a number with the keys — a palette's
  hue or chroma, a dial, any number field or slider of the Studio, with Up and Down Arrow, Page Up and Page Down, or a
  held key — no longer computes and saves the whole layer at every step. The steps made on one control are one change,
  as a drag is: each step is shown as it is made (a palette's color and a dial are drawn without computing the layer),
  the layer is computed once the keys rest, and the change is saved 300 ms after the last key is released, at Enter, or
  when focus leaves the control. Twenty presses of Up Arrow on a palette's chroma computed the layer twenty times; they
  now compute it once.
- cc06539: Theme Studio (served by `tanrei studio`, and on the documentation site): dragging a dial's slider — text size, type
  contrast, spacing, size, shape, stroke, motion — no longer computes the whole layer while it moves. A dial reaches the
  preview's stylesheet as one custom property that every token derived from it follows in CSS, so the slider's value is
  set on the preview at the next frame, with the few text-style values the build writes as numbers (letter spacing in
  `em`); the layer is computed when the press ends, or once the pointer has rested. The same final value gives the same
  theme. While a value is dragged, the preview also no longer keeps a value from earlier in the drag once the value
  returns to where the drag started.
- 65bbe74: Theme Studio (served by `tanrei studio`, and on the documentation site): dragging inside a colour picker or along a
  slider no longer makes the page heavy. Every move of the pointer used to compute the whole layer and write the
  preview's stylesheet again — about 200 ms each — so a one-second drag across the brand color took the page tens of
  seconds to follow. A value is now shown at the next frame, the latest one only; a palette's color (a seed, a hue and
  chroma, a fixed tone) is drawn from the palette alone while it moves, and the layer is computed when the picker
  closes or the pointer rests. The same final color gives the same theme. A fixed tone's colour field previews while it
  is picked and is written when the picker closes, as the seed's is.
- 3d05485: Theme Studio (served by `tanrei studio`, and on the documentation site): switching to Groups no longer draws the whole
  level under the press. The panels the window shows are drawn before the first paint, the others as the page is
  scrolled near them, and the rest one at a time while the page is idle, so every panel is there for the Tab key and the
  browser's find soon after. A declaration of the layer's own, the build's warnings and the import are written when their
  fold first opens. The switch drew some 3,100 elements in one task of about 300 ms; it now draws a few hundred, and the
  press is answered in about 50 ms.
- 1d4d2e8: Theme Studio (served by `tanrei studio`, and on the documentation site): typing at Source no longer computes the whole
  layer at every key whose text parses. Each key is still parsed and checked against the schema at once; the layer is
  computed and saved once the typing has rested for 400 ms, or when the text loses focus. A name, a description or a
  reason typed there is the layer at once (it computes nothing), and a palette's source or a dial is drawn at the next
  frame without computing the layer. Four letters typed into a family's name computed the layer four times; they now
  compute it once.
- 176a951: Theme Studio (served by `tanrei studio`, and on the documentation site): typing the layer's name, its description or
  its attribution, a dial's or a group's reason, a palette's description or an extension's rationale no longer computes
  the whole layer at every key. None of them is part of a value: the Studio checks the layer at each key (its id, what it
  extends, the schema) and shows what was typed at once — the file's JSON, the fields, the checks — and computes the layer
  only when a value changes. A reason, a rationale or a palette's description is also shown as text in Every token; that
  text catches up once the typing has rested. The preview's stylesheet is not written again for any of them.
- b9c5fbe: **A system's scope inherits the colour scheme around it.** A preset's stylesheet (`@tanrei/web/systems/<id>.css`), and a
  product's built with `tanrei build`, no longer declares `color-scheme: light dark` on `[data-tanrei-system="<id>"]`.
  That declaration took the scope back to the operating system's scheme: a preset placed under `<html
  data-tanrei-theme="dark">` drew light on a light system. Now only the root declares both themes, and a scope draws in
  the theme forced around it, or follows the system where nothing is forced, as every other subtree does; a scope still
  forces its own with `data-tanrei-theme` on itself. What broke: a page that relied on a scope following the operating
  system under a forced ancestor must take `data-tanrei-theme` off that ancestor, or remove it from around the scope.
  
  The documentation's gallery of fixtures follows the header's theme as it changes (until a stage's own switch is
  turned), and a gallery window is given the page's contrast, at its first paint and on every change.

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
