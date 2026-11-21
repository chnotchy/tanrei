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
- c51f733: **New contrast check — Chip.** The build holds an input chip's remove glyph at 3:1 against its round container as it
  is drawn (WCAG 1.4.11): the round container of the state over the chip's own container at rest, over every surface role
  where that container is clear (the outlined chip), in both looks — the `remove.*` parts and the `destructive-remove.*`
  parts, whose glyph takes the error color while it is hovered, focused or pressed — at rest, hovered, focused and pressed,
  in every scheme. No pair of color roles held it before: the round container is a state layer over the chip.
  
  The default system passes in every scheme (its lowest is the destructive glyph's 3.98:1, light, outlined, over
  `surface-container-highest`, focused and pressed). A product layer that re-points the chip's remove colors, the error
  role or a surface now gets a warning where the glyph falls under 3:1. The `cupertino` preset's outlined chip measures
  2.77:1 (light) and 2.92:1 (dark) hovered, focused and pressed, listed in its `a11y-report.json` as measurements that do
  not apply to an imitation preset. Each report's `componentPairs` grows by 16 per scheme.
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
- 0e36941: Combobox chooses several values: `selection="multiple"` (default `single`, which is unchanged) with `values`, an array
  in the order the values were chosen (the attribute is a JSON array or words). Each chosen value is an input Chip in the
  box before the text, in lines that wrap; the box grows by whole lines and never hides a value behind a count. A choice
  adds the option, or takes it out where it is chosen, empties the text and leaves the list open for the next one;
  leaving the field or Escape empties the text and chooses nothing. Backspace at the start of the text moves focus to the
  last chip, where the arrows, Home and End move among the chips and Backspace or Delete removes one — the chip field's
  keys. The listbox is `aria-multiselectable`, each option says whether it is selected, the chips are a list named like
  the combobox, and a polite live region says what was added or removed (`remove-label`, `added-text`, `removed-text`,
  which read the chip field's words `entryRemoveLabel`, `entryAddedText` and `entryRemovedText` when left empty). In a
  form it submits one entry per value under its `name`, as `<select multiple>` does, and resets to its `values`
  attribute. `change` carries `detail.values`. New parts: `entry`, `entry-container`, `entry-label`, `entry-remove`. New
  tokens `comp.combobox.entries.gap`, `.row-gap` and `.typing-min-width`, aliases of the text input's entries spacing.
  Combobox spec: CMB-70 to CMB-82; the native platforms have not implemented it yet.
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
- e70559b: **Fields, pickers and the segmented button are drawn at the control height.** The search bar, a filled and an
  outlined input box, the one-time-code input's cells, the date-time picker's range fields, the calendar's view toggle
  and a year's container, and the segmented button now read `sys.control.height.medium` in their default size, and are
  marked `"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.
  
  - **The default system changes, as intended:** at the default control height of 40 the search bar goes from **56 to
    40** (`comp.search.container.height`, now as tall as its button trigger), a filled or an outlined box of medium size
    from **48 to 40** (`comp.input-box.container.height.medium`, as tall as a stacked box), a one-time-code cell from
    **48 to 40**, a range field from **48 to 40**, the calendar's view toggle and a year's container from **36 to 40**
    (as a day's container already was), and a medium segmented button from **36 to 40**.
  - **The other sizes read the step of their size**: a small filled or outlined box is the small step, 36 (was 40, the
    medium step), and a large segmented button the large step, 56 (was 40), so that a set and the Buttons of its size
    stand at one height (36, 40 and 56).
  - **Block paddings give up half of what a box loses below 40**, so that one line always fits: a filled or outlined
    box's padding is 6 at small and medium (were 8 and 10), a stacked box's; the padding of a filled box that shows its
    label stays 2 at small and 4 at medium. A filled box that shows its label holds the floated
    label above the value's line, and is as tall as the two lines and that padding where that is more than the control
    height: 50 at 40, 42 at 32.
  - **What is no control on a row keeps its own height**, and its spec says why: the calendar's cell (48), the pitch of
    the grid that holds a touch target for every day; a wheel's row (48), the pitch of one wheel, five rows beside the
    dial; the time display's selectors and the dial, Material's time picker's faces; and the search view's header (72),
    the frame of a view. The controls inside them follow the control height.
  - **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
    3's 56 search bar, its 56 filled and outlined fields, its 40 segmented button and its 72 × 36 years, and the small
    field (40), the 32 and 48 sets, the 36 view toggle and the 48 range field they drew; cupertino keeps the 34 and 44
    fields, Apple's 28 and 32 segmented controls and the 40 set, and the 36 view toggle, 36 years and 48 range field it
    drew. Their paddings stay as they were.
  - The spec and the docs say what had stayed: a search's medium row is at the control height (40, not 48), a small
    select is 36 high, and the web's suggestion rows are the control height under a mouse.
  - The web baselines of these components, and of what embeds them, move with this change; they are not recorded in it.
  - New behaviour: SRC-59, TXI-74, SEL-75, CMB-85, NMI-50, CLI-48, OTC-32, DTM-53, CAL-37 and SEG-32 say a default
    control is as tall as the control height; `src/control-height-fields.test.ts` draws each at 32, 36 and 40 in
    Chromium, Firefox and WebKit.
- bdd731f: **Lists, rows, accordions and tables are drawn at the control height.** A list's item that is an action, a link or an
  option, a list row of one line, an accordion's header and a table's row now read `sys.control.height.medium` in their
  default size, and are marked `"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.
  
  - **The default system changes, as intended:** at the default control height of 40 a list's item goes from **48 to
    40** (`comp.list.container.height.medium`), a list row of one line from **56 to 40**
    (`comp.list-row.container.height.one-line.medium`), an accordion's header from **56 to 40**
    (`comp.accordion.container.height.medium`) and a table's row of one-line cells from **46 to 40**. Their block
    paddings give up half of what the row loses below 40, so that one line always fits: a list's and a list row's 8, an
    accordion header's 8 at medium and 6 at small (were 16 and 12), a table cell's 9 (was 12).
  - **The small sizes read the small step**, held at the minimum target where a person presses them: a small list row of
    one line is 36 (was 40), a small accordion header 36 (was 48); a small table row is 32, as before, and is not held at
    the target, because nobody presses a row that holds no control.
  - **A row of more lines is the one-line row and what each further line needs**, five size units, the line of the
    supporting text: a list row of two lines is 60 (was 72) and of three 80 (was 88) at medium, 56 and 76 at small (were
    56 and 72). They add to the one-line row, so they follow the control height with it: 52 and 72 at a control height of
    32. Material's 56, 72 and 88 step 16 a line from a row that holds a touch target; here the one-line row is the control
    height, and the line it adds is derived, not a fixed step.
  - **New tokens: `comp.table.row.height.medium` and `comp.table.row.height.small`**, a table row's least height per
    size: the control height and the small step. Every row of a table (the header row, a body row, a placeholder row, a
    footer row) is at least that tall and taller where a cell needs more; `comp.table.cell.padding-block.*` gives up what
    the row loses, so that a row of one-line cells is exactly that tall. On the web, `table.css` draws it.
  - The accordion's small header is a small navigation drawer row's height and text style, no longer "a drawer row's and
    a menu item's 48"; its tokens' and its spec's words say so.
  - **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
    3's 56 list item and its 56, 72 and 88 rows of one, two and three lines, the 40, 56 and 72 small rows and the 56 and 48 accordion headers
    they drew, and take **Material's 52 data table row**, its one line centred with 16 above and below (a table row there
    was 44); cupertino keeps Apple's 44 list row and the 72 and 88 rows, small rows and accordion headers it drew, and
    draws Apple's 44 table row (12 above and below its line, as before). A small table row in either keeps the height
    its cells give it.
  - The web baselines of these components move with this change; they are not recorded in it.
  - New behaviour: LST-53, LRW-19, ACC-38 and TBL-63 say a default row is as tall as the control height; the web tests
    draw each at 32, 36 and 40.
- 38ef509: **Menus and the options of a list are drawn at the control height.** A menu's item — opened from an anchor, as a
  context menu or from a menu bar —, a select's and a combobox's option, a search's suggestion and result, and the item of
  a FAB menu that a product includes now read `sys.control.height.medium` in their default size, and are marked
  `"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.
  
  - **The default system changes, as intended:** at the default control height of 40 these rows go from **48 to 40**
    (`comp.menu.container.height.medium`, `comp.select.option.height.medium`, `comp.combobox.option.height.medium`, and
    `comp.search.suggestion.container.height.medium` through the combobox's), so a menu's rows stand as tall as the
    Buttons and fields beside them. Their block paddings stay 8 at 40, and give up half of what the row loses below it.
    The web baselines of these components are recorded again for this change.
  - The small sizes are unchanged: they already read the small step.
  - `comp.fab-menu.item.height` is a menu item's height in its own vocabulary: a product that includes the FAB menu draws
    its items at its own menu's height (40 under the default system, where it was 48).
  - **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
    3's 48 menu item and 56 FAB menu item; cupertino keeps its 44 menu, option and suggestion rows.
  - New behaviour: MNU-70, SEL-74, CMB-84, SRC-58 and FBM-29 say a default row is as tall as the control height.
- d2df5f1: **Tabs, navigation and trees are drawn at the control height.** A tab of a medium row (and so a Tab view's own row), a
  navigation drawer's destination and its collapsed cell, a tree view's row and a table of contents' row (and its compact
  presentation's) now read `sys.control.height.medium` in their default size, and are marked
  `"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.
  
  - **The default system changes, as intended:** at the default control height of 40 these rows go from **48 to 40**
    (`comp.tabs.container.height.medium`, `comp.navigation-drawer.item.container.height.medium`,
    `comp.navigation-drawer.collapsed.item.container.width.medium`, `comp.tree-view.container.height.medium`,
    `comp.table-of-contents.compact.row.height`), and a table of contents' row from **44 to 40**
    (`comp.table-of-contents.row.height.medium`). A collapsed drawer's cell is a square as tall as its row, centred in a
    column that keeps its 72; its padding-block now gives up half of what the cell loses below 40. A tree row's padding
    is 8 and a table of contents row's 10 at 40, so that one line still fits. The web baselines of these components are
    recorded again for this change. A primary tab with its icon above its label keeps its 64. A tab's indicator is the
    row less the track's inset, so it is 32 at 40, and a circle is 32 across: in the default system a tab that holds only
    a glyph is now the 36 target wide, wider than its circle; `comp.tabs.active-indicator.padding-block.medium` gives up
    half of what the row loses below 40, so that one line of the label fits a tab of a lower control height.
  - **Breaking: the navigation drawer's `density` is now `size`**, so that "density" has one meaning: `density="regular"`
    is `size="medium"` (the default) and `density="compact"` is `size="small"`. The axis and its tokens are renamed with
    it: `comp.navigation-drawer.*.regular` is `*.medium` and `*.compact` is `*.small` (CSS
    `--tanrei-comp-navigation-drawer-…-regular` is `…-medium`), and the web type `TanreiNavigationDrawerDensity` is
    `TanreiNavigationDrawerSize`. No alias is kept.
  - **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
    3's 48 tab (and their 56 drawer row and cell), and the 48 tree row and 44 and 48 table of contents rows they drew;
    cupertino keeps the 48 tab, tree, drawer and compact table of contents rows and the 44 table of contents row it drew.
  - **A drawer's row is drawn higher rather than reach over its neighbour (NVD-6).** Now that a medium row (40) is lower
    than a target of 48, a layer whose targets are 48 and whose `comp.navigation-drawer.container.gap.medium` is 2 would
    have given each row a hit area of 48 over its neighbours' rows. Where a system's row and gap give less than the
    target, the row is now drawn at least the target less the gap high (46 there), its hit area the row and half the gap
    around it, as a small row is for touch. No shipped system is affected: every one gives a row and a gap at least its
    targets.
  - New behaviour: TAB-63, TBV-25, NVD-105, TRV-74 and TOC-43 say a default row is as tall as the control height.
- c3bf525: **Checkboxes, radio buttons, switches and sliders are drawn at the control height.** The round state layers of the
  checkbox, the radio button, the switch and the slider's handle (`comp.checkbox.container.size`,
  `comp.radio-button.container.size`, `comp.switch.container.size`, `comp.slider.container.size`) now read
  `sys.control.height.medium` and are marked `"dev.tanrei.aligned": "control"`. Each control takes that height in a row:
  a checkbox, a radio button or a switch with a label of one line is a row as tall as the control height, and a horizontal
  slider is that thick, so that they stand as tall as the Buttons and fields beside them. At a control height of 32 they
  are 32 tall; at 36, 36.
  
  - **At the default control height of 40 no token value changes**: each state layer was 40 and stays 40.
  - **A switch now takes the control height in layout**: across its track it is as tall as the larger of its track and
    its round container, the track centered in it. In the default system a switch is **40 tall, was 32** (its track's
    height), as a checkbox and a radio button already were; the track and the handle keep their sizes, and the container
    still takes no room along the track. The same rule gives m3-like and m3-expressive-like switches 40 (their 40 state
    layer around a 32 track), and leaves cupertino's at its 31 track.
  - **What each control draws inside its row keeps its own size**, and the spec says why: the checkbox's 18 box and its
    mark, the radio button's 20 ring, the switch's 52 × 32 track and its handle, the slider's tracks and its 20 handle —
    the sign of a condition or of a value, sized for the eye and the glyph, no control on a row.
  - **A rating keeps its own size**: a mark's container is the pitch of a row of glyphs, which follows the mark's size,
    and its targets reach the minimum beyond it; it does not follow the control height.
  - **The presets keep their originals' sizes**, pinned with the reason: m3-like and m3-expressive-like keep Material 3's
    40 state layers of the checkbox, the radio button and the switch, and their own slider inset; cupertino keeps the 28
    and 32 it drew.
  - The web baselines of the switch, and of what draws a switch (the field and the field group), move with this change;
    they are not recorded in it.
  - New behaviour: CHK-26, RAD-30, RGP-22, SWT-27, SLD-31 and RAT-20; SWT-10 says the switch's layout is its row.
    `src/control-height-selection.test.ts` draws each at 32, 36 and 40 in Chromium, Firefox and WebKit.
- 9ca3d46: **Breaking — the root layer `core` is grey, and Tanrei's own colors are the default system's.** `core` now values the
  vocabulary with a neutral palette without chroma, the four status palettes, the color roles drawn from them and the
  per-state rules, and declares no accent, no tints and no code colors. What was Tanrei's look moved to
  `tokens/systems/tanrei.system.json`: the accent palette (the keyboard focus ring and its `accent` roles), the four quiet
  palettes of the status containers and of the inverse status bars, and the six syntax palettes of code. `m3-like` and
  `cupertino` declare every palette and color they used to take from the root, each with a reason where Material 3 or
  Apple's guidelines have no counterpart.
  
  No shipped system moved: every stylesheet, bundle value and native constant of `tanrei`, `m3-like`
  and `cupertino` is byte for byte what it was, and `fidelity.json` is unchanged. Only the bundles'
  recipe (`dial/dial.tokens.json`, which carries the layers as written) differs.
  
  What broke, for anyone who read `core` directly (a layer chain built on it, `diff_systems … core`, the Studio's preview
  of it):
  
  - `core` has no `accent` palette and no `sys.color.accent`, `on-accent`, `accent-container` or `on-accent-container`;
    its focus ring is the primary's. A layer on `core` that wants an accent declares the palette itself.
  - `core` has no `error-quiet`, `success-quiet`, `warning-quiet`, `info-quiet` or `syntax-*` palettes. Its status
    containers are tints of the status palettes themselves; its inverse status bars take the roles their component
    document names; its code is drawn in the text colors the code block's document gives it.
  - `accent: null` in a layer that extends `core` drops nothing any more: delete it.
  
  New: the root's stylesheet, `@tanrei/web/systems/core.css` (scoped to `[data-tanrei-system="core"]`), the grey starting
  point. `core` is still not offered where a system is chosen, and the build holds it to every accessibility invariant as
  it holds the default system: a finding fails `pnpm generate` and `pnpm validate`.
- 14b445d: **cupertino follows Apple's current Human Interface Guidelines** (read 2026-11-12). Its fidelity to Apple's published figures rises from 38 of 52 to 50 of 52.
  
  - **Colors.** `primary`, `error`, `success`, `warning` and `info` are Apple's system Blue, Red, Green, Orange and Cyan as Apple has published them since its June 2025 color update, in light and dark: primary is #0088ff / #0091ff (was #087aff / #4c8eff), error #ff383c / #ff4245, success #34c759 / #30d158, warning #ff8d28 / #ff9230, info #00c0e8 / #3cd3fe. The medium and high contrast schemes take Apple's increased-contrast swatches (Apple publishes one increased contrast): primary #1e6ef4 / #5cb8ff, error #e9152d / #ff6165, success #008932 / #4ad968, warning #c55300 / #ffa056, info #007eae / #6dd9ff. The containers and the other tones of these palettes follow the new seeds. Text in these colors and white text on them contrast less than before (cupertino's accessibility report lists 226 measurements, was 113), as on Apple's platforms; an imitation preset is held to fidelity, so none of them is an error.
  - **Type.** `display` and `heading-1` to `heading-3` are Regular (400), as Apple's Large Title and Title 1 to 3 are (were 700, 700, 700, 600). The display and heading emphasis steps are 300 (were 100 and 200), so emphasized display, heading-1 and heading-2 are Bold (700) as Apple's are (were 800, 900, 900). One step serves the heading family, so emphasized heading-3 is 700 and heading-4 900 where Apple's emphasized Title 3 and Headline are Semibold (600); the fidelity map lists both. cupertino's large app-bar title, which aliases `display`, is now Regular where Apple's large navigation title is Bold: a component text style cannot take its role's emphasized weight yet (mimicry gap `emphasis-per-style`).
  - **The fidelity harness** compares a color in every scheme a map names (`colors.schemes`, Tanrei scheme to the reference's appearance), and the Apple reference records the increased-contrast swatches.
  - **A model read one scheme at a time** (the MCP server) now reports the snackbar's expand and close glyph in every scheme, as a whole model does; it reported the light scheme only.
  
  No snapshot baseline moves: every cupertino snapshot stays within the comparison tolerance of its baseline with these values.
- fcf2ed2: **`cupertino` is measured against Apple's Human Interface Guidelines.** Its fidelity map
  (`tokens/fidelity/cupertino.fidelity.json`) compares it with the figures the guidelines publish — the control sizes,
  the iOS text styles at the default Dynamic Type size, and the system colors its accent and statuses stand for — read
  from the guidelines' render data into `tokens/fidelity/reference/apple-hig.json`. The result is
  `tokens/generated/cupertino/fidelity.json`, and the MCP server's system summary now reports it: 36 of 52 figures equal.
  The 16 that differ are listed in the map as open findings; no cupertino value changed. What cupertino sets and Apple
  gives no figure for (corner radii, control heights, shadows, the pressed dimming, the neutral roles) is named in the map.
  
  The fidelity harness gains what this needed: a section's reference prefix, single figures (`values`), an `outside`
  list of reference tokens a preset does not reproduce (each with its reason, not counted), and `findings`, differences
  awaiting a decision that still count against the number. Every fidelity report gains an `outside` list.
- 9646c7f: **Breaking — the default system's minimum target is 36, for a mouse and for a finger, and nothing a person presses is
  drawn below it.** The default system no longer keeps a 48 touch target (or a 44 pointer target) by adding space:
  `sys.target.minimum` is 36, and `sys.target.pointer` and `sys.target.touch` alias it, so one value sets all three. A
  product that follows a platform guideline sets `touch` or `pointer` above the minimum in its layer; the build refuses
  either below it. The m3-like and cupertino presets keep the targets they had (48 / 44, and their own minimums).
  
  What moves in the default system (and in the root layer, which shares these values):
  
  - **Held at 36** (from 32): the small Button, Button with menu, Copy button and segmented button; the small stacked
    input boxes (text input, select, combobox, number input, color input and their fields); the medium chip; small Tabs;
    small Pagination; the snackbar's controls; the compact rows of the tree view, navigation drawer (and its collapsed
    column), table of contents, menu, select, combobox, search and list. Their block paddings take half of what the box
    gained (a small Button has 8 above and below its label, where it had 6), and so do the small Button with menu's
    trailing half, the medium chip's avatar and remove ends and the compact collapsed drawer cell, which stay square and
    concentric with the taller box. The space between a field's clear button and the chevron or button after it
    (`comp.combobox.container.action-gap`, which the select and the text input alias) grows from 4 to 6 the same way, so
    the 36 clear button meets its neighbour instead of overlapping it.
  - **Hit areas** shrink from 44 (pointer) and 48 (touch) to 36 everywhere: a control that is drawn at least 36 reaches
    nothing past what it draws. A mark keeps its size and still reaches the target (a checkbox's and a radio button's 40
    containers already hold it; a small chip, 24, reaches 36).
  - **Spaces that existed only to keep a 48 target whole are 0:** the standard button group's gap, the docked toolbar's
    gap and the search bar's gap (each `sys.target.touch` less a small Button, never below 0), so their items now touch.
    The radio button's option row is its 40 container high (it was 48), and the carousel's controls row is 40, the
    height of its controls (it was 48).
  - The invariant that a stacked input box is as tall as a Button of the same size is now the general rule it was an
    instance of: in the default system every height that reads a step of `sys.control.height` is as tall as that step,
    or as `sys.target.minimum` where it is floored.
  - Web: the app bar's brand cell is as large as the navigation item's (the larger of the target and a medium icon-only
    Button), so its symbol still stands where the icon does; a list that is dragged near its edge reads the width of its
    scrolling band from `sys.target.touch` in pixels, whatever unit the token is written in (it read `2.25rem` as 2.25).
  
  Every web baseline of the default system that shows one of these heights, hit areas or gaps is re-recorded; the
  presets' baselines do not move. `dial.size.unit` no longer scales any target: it scales control heights and glyphs.
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
- 38b7cd2: **More heights read the control height ladder, and the presets hold their own targets. No resolved value changes: every
  token of every system, in every scheme, is what it was, and no picture moves.**
  
  What a layer sees differently:
  
  - **The small rows read `sys.control.height.small`.** The tree view's compact row, the navigation drawer's compact item
    and collapsed cell, the table of contents' compact row, and the menu's, list's and search suggestion's compact rows
    are now `{ "fn": "mul", "of": "{tanrei.sys.control.height.small}", "by": 1, "min": "{tanrei.sys.target.minimum}" }`,
    as the small Button is. **Breaking for a layer that set the tree view's compact row to move the others:** the menu,
    the list and the search suggestion aliased it, and no longer do; set `sys.control.height.small` to move every small
    control and row together, or each row's own token.
  - **The medium tag and key cap alias `sys.control.height.extra-small`** (24), which they equalled.
  - **m3-like and cupertino set `sys.target.pointer` and `sys.target.touch`** (44 and 48, the values they had), and m3-like
    sets `sys.target.minimum` (32), each with its reason, so the default system's targets no longer reach them. They are
    values, no longer multiples of `dial.size.unit`: a product that changes the size unit on top of a preset keeps the
    preset's targets.
  - The size descriptions of Button, Button with menu, Copy button, Chip, Tabs, Pagination, Segmented button and the
    stacked input boxes now say that the height is never drawn below `sys.target.minimum`.
- ff0416e: **Breaking — a host's own Buttons take their size from a token.** The Buttons a component draws itself were drawn at a
  size written into the component; each now takes the size a component token names, next to the variant it already
  names. The new tokens (each an index into the core Button sizes, small · medium · large; platforms receive the name):
  
  - `comp.popover.close-button.size`, `comp.side-sheet.close-button.size`, `comp.callout.close-button.size`,
    `comp.bottom-sheet.close-button.size`, `comp.snackbar.close-button.size` (the close and the expand button) — small in
    the default system;
  - `comp.image-preview.bar.button.size` (zoom out, zoom in, close) — small; `comp.image-preview.navigation.button.size`
    (previous, next) — medium;
  - `comp.carousel.navigation.button.size` (previous, next) — medium;
  - `comp.date-time-picker.actions.size` (Cancel and OK) — medium.
  
  The default system and cupertino draw what they drew before. **m3-like** draws the close buttons of the popover, side
  sheet, callout and bottom sheet, the image preview's bar controls and the snackbar's close and expand buttons at medium
  (40, Material's standard icon button) instead of small (32, Material's extra small), and its snackbar's action as tall
  (`comp.snackbar.controls.height` now aliases the medium Button height under m3-like).
  
  What broke: the vocabulary grows by nine tokens (`tokens/vocabulary.lock.json`). A system that set a host's close button
  apart from its other icon buttons by restyling it now sets the size token instead. Under m3-like the snackbar is taller
  by the difference between the two heights wherever its controls set the bar's height. The m3-like baselines of
  `popover/arrow-actions`, `callout/closable-title-actions`, `image-preview/several-rtl`, `side-sheet/modal` and
  `snackbar/action-closable` change for that reason; no baseline of the default system changes. The fidelity map of
  m3-like measures each host's size against the Material component it reproduces. SwiftUI, Compose, Flutter and React
  Native receive the tokens and do not read them yet.
- 8641a2e: **Breaking — `m3-like` maps Material 3's button sizes to Tanrei's by role, not by name.** Material 3's default button
  and icon button is its small size, 40dp (`ButtonSmallTokens`, `SmallIconButtonTokens`), and its top app bar's actions
  are icon buttons of that size. Tanrei's default size is `medium`, so `m3-like`'s `medium` is Material's small, 40; its
  `small` is Material's extra small, 32, and its `large` Material's medium, 56. Material's large (96) and extra large
  (136) are the two sizes `m3-like` adds above them. Before, `medium` was Material's medium (56), so every Button at the
  default size was 56 tall where Material draws 40, and the docs site's app bar was 408 px wide in a 390 px window.
  
  What breaks:
  
  - `tanrei.comp.button.size.xsmall` is gone from `m3-like`, with no alias: its 32 is now `small`. `xlarge` is 96 tall
    (was 136) and `xxlarge` (136) joins the vocabulary. `small`, `medium` and `large` are 32, 40 and 56 (were 40, 56
    and 96), each with the leading space, icon size, gap, outline width, label style and icon-only widths of the
    Material size it now stands for. The native constants follow: `TanreiButtonSize.Xxlarge` (Compose),
    `.xxlarge` (SwiftUI), `M3LikeButtonSize.xxlarge` (Flutter) and `xxlarge` (React Native), and no `xsmall`.
  - Everything sized from a Button moves with it under `m3-like`: a Button at the default size, the app bar's
    navigation item, brand and actions, and the toolbar's items are 40 (were 56); a host's close button and the
    snackbar's actions are 32 (were 40), where Material draws 40 — the mimicry gap `close-button-size` is open again,
    and `axis-default` is resolved.
  - The fidelity map maps androidx's `ButtonXSmallTokens` … `ButtonXLargeTokens` (and the icon button objects) to
    `small` … `xxlarge`, and material-web's single 40px button to `medium`. Every mapped value is still equal.
  
  `tanrei` and `cupertino` do not move: their generated outputs are byte for byte what they were. Baselines: 24 of the
  107 `packages/web/snapshots/systems/m3-like/` baselines change, the intended result of this change, found by rendering
  every one with the stylesheet before and after the change on one machine and comparing the two renders:
  app-bar/small-scrolled, button/{elevated,filled,outlined,text,tonal}-medium, button-group/connected, calendar/range,
  callout/closable-title-actions, chat-composer/inline-rtl, code-block/syntax-marked, copy-button/labelled-tonal,
  date-time-picker/modal-date-time, dialog/icon, empty-state/actions, figure/docs-demo-code, file-picker/drop-area-error,
  file-upload/drop-area-statuses, image-preview/several-rtl, navigation-drawer/collapsed-labels-always,
  page-header/everything, popover/arrow-actions, side-sheet/modal and toolbar/floating. They are recorded again on
  Linux, not in this change. The native platforms' `m3-like` baselines of the fixtures that draw Buttons change too,
  when those platforms catch up.
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
  - `m3-like` states Material 3's durations and emphasized curves for every role and
    chooses `unfold`, so it draws the same when its components take their roles. `cupertino` takes the root's.
  - The vocabulary grows by 31 ids (`tokens/vocabulary.lock.json`). The Figma plan documents the role durations and the
    appear values as numbers without a scope. The native platforms' generated system types gain `appearance` and the four
    easing roles.
  - `docs/architecture/motion.md` states the principles every component's motion is held to (MOT-1 to MOT-6).
- d05c5ac: **A collapsed navigation drawer's short label spans the column, not its square.** Material 3's navigation rail keeps
  its active indicator behind the icon and lets the label under it span the item. The drawer now does the same. A
  collapsed cell that draws a short label (`collapsedLabels` set to `selected` or `always`) keeps its item container the
  square behind the icon (40 by 40 in the default system), and with it the state layer, the selected fill and the focus
  ring. The label is drawn `collapsed.item.gap` under the square, across the column less
  `collapsed.item.label.padding-inline` on each side: 64 in the default system, where it was 32 (the square less 4 on
  each side). Every label of the labelled fixtures is now drawn whole except Notifications. The cell keeps
  `collapsed.item.container.padding-block` under the label, so a labelled cell is 68 high in the default system (it was
  60).
  
  - **Breaking: `comp.navigation-drawer.collapsed.item.container.padding-inline` is renamed
    `comp.navigation-drawer.collapsed.item.label.padding-inline`** (CSS
    `--tanrei-comp-navigation-drawer-collapsed-item-container-padding-inline` is
    `--tanrei-comp-navigation-drawer-collapsed-item-label-padding-inline`, and each platform's token struct member is
    renamed with it). The value is still 4. It is now the label's room on each side inside the column, no longer a padding
    inside the item container. No alias is kept. m3-like's pin of it (0) is dropped: Material's rail gives no number for
    it.
  - **`comp.navigation-drawer.collapsed-selected.item.label.color` is `sys.color.on-surface`**, where it was the selected
    row's label color, because the label stands on the drawer's surface and not on the selected fill. Under cupertino the
    selected short label was white on the tint; it is now on-surface on the drawer's surface.
  - **What moves in the presets:** under m3-like and m3-expressive-like the label is 72 wide (it was 56) and the cell
    stays 64 high. Their transparent item container, which carries the focus ring, is now the 56 by 32 indicator's box
    instead of reaching around the label. Under cupertino the label is 64 wide (it was 40), the item container is 48 by 44
    (it was 48 by 66), and a labelled cell is 80 high (it was 68).
  - The web baselines of the labelled collapsed fixtures move with this change, as intended.
- 328d945: **Breaking — the navigation drawer is resizable, by default.** Where a `<tanrei-navigation-drawer>` (React
  `NavigationDrawer`) stands beside the content — a standard drawer that is open, or a responsive drawer's standard
  presentation — a person can change its width at its end edge, and fold a collapsible drawer to its column the same way.
  
  What breaks:
  
  - Every standard drawer now has a resize handle on its end edge: **one more Tab stop**, after the drawer's last row and
    before what follows the drawer, exposed as a window splitter (`role="separator"`). It is out of sight until a mouse
    comes over the edge or it has keyboard focus; on a touch screen its line is drawn at rest. `resizable="false"`
    (React `resizable={false}`) leaves it out.
  - The drawer's end edge takes a press over the content beside it: a band 36 px wide (`sys.target.pointer`, or
    `sys.target.touch` for a coarse pointer) from the edge outward, with the handle's box at its middle. It never lies
    over the drawer, so a row's hit area keeps the drawer's full width, a group's chevron keeps its whole target, and a
    scrollbar at the drawer's end edge is still taken.
  - In an app shell, a navigation drawer stands over the main region (`z-index: 1` among the frame's regions) so that the
    edge takes the press there; the footer is still drawn over it.
  - The navigation drawer's host is no longer `overflow: hidden`: what slides in and out is cut by a `clip-path` at its
    start edge, top and bottom, and not past its end edge.
  
  What it does (NVD-96 to NVD-104):
  
  - **A drag** on the edge follows the press without a motion, between the least width (`min-width`, else
    `comp.navigation-drawer.container.min-width`, 200) and the greatest (`max-width`, else
    `comp.navigation-drawer.container.max-width`, 400, and never more than the room the parent gives — in a parent
    narrower than its width, the drawer and its rows are laid out at the room, labels cut with an ellipsis, and the width
    comes back with the room). A collapsible drawer
    folds to its column past halfway between its column and its least width, over its change of form's motion, and
    unfolds again past it; a drawer that cannot fold stops at its least width. While a drag lasts the document selects
    nothing and no iframe takes the pointer.
  - **Keys** on the handle: the arrow pointing away from the drawer widens it by 10, the other narrows it (never folding
    it); Shift, Page Up and Page Down by 100; Home and End give the least and the greatest width. On the column, the
    widening arrow, Home and End expand it.
  - **Enter, Space or a press without a drag**: a collapsible drawer folds to its column and unfolds at the person's
    width; another takes its default width (`container.width`) and then the width it had before.
  - New attributes `resizable` (on unless `"false"`), `width`, `min-width`, `max-width` and `resize-label` (the handle's
    name; empty names it by `label`). New event `widthchange` (`detail.width`), fired once when a person changes the width
    — after the drawer has set `width` — and never when the product sets it. `expandedchange` is also fired by the handle
    (a press, or a drag past the fold point). New part `resize-handle`.
  - The drawer stores nothing. A product that keeps a person's width keeps what `widthchange` carries and gives it back
    as `width` — and, in a page rendered before the element is defined, also as `--tanrei-navigation-drawer-width` on the
    element, which the drawer writes itself once defined and which the app shell's stylesheet reads for a drawer that is
    not defined yet. A drawer given a width draws it in its first frame; a width set afterwards moves over
    `motion.expand`.
  - Over the content (a modal drawer, the column and modal presentations of a responsive drawer) the drawer keeps
    `container.width`, whatever `width` says; the collapsed column keeps its own width.
  - In an app shell the main region takes the room that is left in every frame of a drag, with no motion of its own, and
    the shell keeps the place being read in the main content where it was. The shell remembers nothing of the width.
  
  **Handle: `reach`.** `<tanrei-handle reach="edge">` takes a press, shows its resize cursor and comes into sight along
  the whole length of the box its owner lays it out in (the edge of a pane), with its box and line drawn at the middle and
  its focus ring around the box. `reach="container"` (the default) is the handle as before. React `Handle` gets `reach`.
  New baselines: the Handle's `reach-edge` and the drawer's seven resized fixtures. No existing baseline changes.
  
  **Tokens.** Two new component tokens, `comp.navigation-drawer.container.min-width` (200, `dial.size.unit` × 50) and
  `comp.navigation-drawer.container.max-width` (400, × 100). A new invariant holds, in every density and every system:
  `collapsed.container.width` < `container.min-width` ≤ `container.width` ≤ `container.max-width` — an error, and a warning
  in a product layer.
  
  **Resizable frame**: its description no longer suggests wrapping a navigation drawer in it (the drawer has its own
  edge); its behaviour does not change.
  
  The navigation drawer's module grows by about 2.6 kB gzip (116,354 → 118,939 bytes, measured against main): the handle
  and the reckoning of drags, keys and the room its parent gives. Its bundle budget is raised from 118,800 to 124,900 bytes
  (measured + 5 %), as a person's control of the drawer's width is the point of this change. The Handle grows by 164 bytes
  (19,055), within its budget.
  
  The native platforms are paused and do not have this yet: their drawers stay as they were.
  
  New fixtures that need baselines: the Navigation drawer's `resized`, `resized-below-least`, `resized-collapsed`,
  `resized-modal`, `not-resizable`, `resized-rtl` and `responsive-wide-resized`, and the Handle's `reach-edge`.
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
- b8106ad: The presets' target sizes now follow their originals. **cupertino** takes Apple's figures: `sys.target.touch` 44 (iOS's default control size, 44×44pt, was 48), `sys.target.pointer` 28 (macOS's, 28×28pt, was 44), and `sys.target.minimum` stays 28, iOS's least control size and the height of its small controls; its 34 and 44 controls are unchanged. **m3-like** keeps 48 / 44 / 32, now checked against Material 3: 48dp for touch, 44dp for a pointer (a mouse or stylus), and 32dp, its extra-small button and chips, as the least drawn height. `dial.density` stays 1 in both.
  
  What breaks: under cupertino, what is taken from the touch or pointer target is smaller. Rows and items that are drawn as tall as the target are drawn at their own height under a fine pointer (radio buttons, radio groups and file items are shorter; app bar actions are 34 instead of 44), a floating toolbar's items move as far apart only as a 28 target needs, and the carousel's controls row is 44 instead of 48. The baselines under cupertino change for those fixtures; m3-like draws exactly as before.
- 75a89b5: **Breaking — the presets extend `core`.** `m3-like` and `cupertino` now extend the root layer `core` directly, not the
  default system `tanrei`. A preset no longer inherits the default
  system's choice of components: each says for itself what it leaves out. `m3-like` leaves out the `filled` navigation
  bar and the `tonal` tabs; `cupertino` leaves out the `filled` navigation bar and the FAB menu, with its reason and what
  to use instead (`toolbar`, `button-with-menu`). The `include` lines that only undid the default system's omissions are
  gone. What each preset ships is unchanged (`--tanrei-unavailable` holds the same list), and no resolved value moved:
  every token of every preset, and of a product built on one, resolves as it did, in every scheme, and every generated
  stylesheet, design-tool export, native constant, accessibility report and fidelity report is unchanged (a test holds
  it). What changes is the chain: a preset's bundle recipe, `tanrei build`, `tanrei validate`, Theme Studio and the MCP
  server's `list_systems`, `resolve` and `validate_layer` now say `core → m3-like → acme` where they said
  `core → tanrei → m3-like → acme`, and a preset's `extends` is `core`.
- 93ff352: Rating, a new component: a score out of a few marks — stars by default — that a person gives, or a score already given
  (an average, a review's score), in whole marks or, where the product allows it, in halves.
  
  - Web: `<tanrei-rating>` (`value`, `max`, `allow-half`, `size`, `icon`, `label`, `option-labels`, `value-text`,
    `read-only`, `disabled`, `name`; `change` and `preview`); React: `Rating`. SwiftUI, Compose, Flutter and React Native
    are planned: their generated tokens carry `comp.rating`, and no component yet.
  - What it is to assistive technology follows the number of choices (WAI-ARIA APG): whole marks up to seven are a radio
    group with the radio group's keys; halves, or more than seven marks, a slider; read-only, one image named by `label`
    and described by `value-text`. A read-only rating shows halves whatever `allow-half` says.
  - No input takes a score back to none: a press on the score already given changes nothing. A product that needs it
    places a Button beside the rating.
  - New vocabulary: `comp.rating` — per size the mark (the icon sizes) and the round container behind it (28 / 32 / 40),
    the container's corner, and for each condition (unselected, selected) the container, mark and state-layer colors, and
    the motion of a state, a change of score and a press. The unselected mark is `sys.color.outline` (3:1 against the
    surface), the selected one `sys.color.primary`. The default system's rules keep the round state layer invisible when
    disabled, as the radio button's.
- bc9b8bd: **Breaking — `@tanrei/react` has one entry per design system, and its main entry is the default system's.** What a
  product can import is what its system has, so an editor offers, and a type check accepts, only that:
  
  | Entry | What it exports |
  |---|---|
  | `@tanrei/react` | the default system's components (Tanrei) |
  | `@tanrei/react/m3-like`, `@tanrei/react/cupertino` | that preset's components |
  | `@tanrei/react/advanced` | the components listed as advanced, the building blocks of others, in every system |
  | `@tanrei/react/all` | every wrapper, whichever system has its component: for a product's own system and for building one |
  
  What breaks:
  
  - `FabMenu` and `FabMenuItem` are no longer exported by `@tanrei/react`: the FAB menu lives in the m3-like layer, and
    the default system does not descend from it. Import them from `@tanrei/react/m3-like` (or `/all`).
  - `SegmentedButton` and `Segment` are no longer exported by `@tanrei/react`: the default system leaves the segmented
    button out. Import them from `@tanrei/react/m3-like` or `/cupertino` (or `/all`).
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
- 265e59c: Size transition, a new component: a box around content whose size changes — a reply that grows by a line, a summary
  replaced by its full text, a status word that gets longer — that moves its own size to the content's new size as one
  motion, so that what follows it moves instead of jumping, while the edge it is anchored to stays still.
  
  - `axis`: `block` (the default), `inline` or `both`. `anchor`: `start` (the default: the first line never moves),
    `end` or `center`. `disabled` follows the content at once. `settle` arrives once per change, after its last frame,
    with the new width and height.
  - The time grows with the distance: `comp.size-transition.motion.duration` (`sys.motion.role.resize.default`, 300 ms)
    up to `motion.distance-step` (`sys.space.space800`, 64 px), `motion.duration-step` (`sys.motion.duration.short1`,
    50 ms) for each further step begun, never more than `motion.duration-max` (`sys.motion.role.resize.large`, 400 ms),
    on `sys.motion.easing.spatial`. `duration` sets one place's tempo, in milliseconds.
  - The first frame is drawn at rest; a change during a motion goes on from the size shown; a change of the window's
    size, the text size or the direction is made at once; a size transition whose content holds a moving one follows it;
    reduced motion makes every change at once. Nothing scrolls while it moves, and it exposes nothing to assistive
    technology.
  - Web: `<tanrei-size-transition>` (`SizeTransition` in React), alpha, with its baselines; SwiftUI, Compose, Flutter
    and React Native are planned.
  - Web, the size motion inside it (`AnimatedSize`): its duration may be a function of the distance the motion covers,
    and `fit()` may be told the size the last frame drew.
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
  - `cupertino` and `m3-like` set the stacked tokens to their own `container.*` values:
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
- 2e77342: **A type role reaches web CSS as its longhands only: the composite `--…-<role>-font` is gone.** No component, and none
  of `text.css`, `prose.css` or `base.css`, read it any more, so a product that set one changed nothing and could not tell.
  The token pipeline no longer writes it, for a role of `sys.typescale` or for a component's text that aliases one
  (`--tanrei-comp-button-label-typescale-medium-font`); every other property of a role is written as before: `-font-family`,
  `-font-size`, `-font-weight`, `-line-height`, `-letter-spacing` and, for a role, `-font-weight-emphasized`. The
  typography token itself is unchanged, and so are the native outputs, the DTCG outputs and the Tailwind theme, none of
  which read the CSS composite.
  
  - **What broke: `var(--…-<role>-font)` is no longer defined.** A rule that set its text with
    `font: var(--tanrei-sys-typescale-body-font)` now takes its parent's font. Compose `font` from the longhands where the
    text is drawn —
    `font: var(--tanrei-sys-typescale-body-font-weight) var(--tanrei-sys-typescale-body-font-size)/var(--tanrei-sys-typescale-body-line-height) var(--tanrei-sys-typescale-body-font-family)`,
    with `letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing)` beside it — or use `text.css`
    (`class="tanrei-text-body"`). A product that set a composite sets the longhands instead, one at a time, on the root
    for every instance or on an element for one.
  - Italic is not a token: no role sets a style. It is the text's own (`em`, or `font-style: italic` on the element).
  - No component and no test fixture is drawn differently: every reader of a composite in the documentation site, Theme
    Studio and the tests now composes the same `font` from the longhands. The documentation's examples set their text
    with the `text.css` utilities, which set the role whole, so the headings in the Card and Inline code examples now
    take their role's letter spacing (−0.01em, −0.025em), which the composite never carried. The pages on typography,
    the typescale tokens and getting started on the web say that a style is changed one longhand at a time.
- b787a0c: **Breaking — `@tanrei/web` registers the default system's components and no other.** A product on the default system
  reaches only the components its system ships, so it cannot pick one the system does not have. What breaks:
  
  - `import '@tanrei/web'` no longer registers the segmented button (`<tanrei-segmented-button>`, `<tanrei-segment>`),
    which the default system leaves out, and no longer exports `TanreiSegmentedButton`, `TanreiSegment` and their types.
  - `@tanrei/web/m3-like` now registers everything the m3-like system ships, not the FAB menu alone.
  
  **New — an entry per system, and one for everything.**
  
  - `@tanrei/web/<id>` (`m3-like`, `cupertino`; the default system's is `@tanrei/web` itself)
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
- 1e459d5: **Visual change, intended — rows that should match are drawn alike in the default system.** A row of a search view and
  a row of a combobox's list are rows of the same kind of list, and a tree beside a navigation drawer draws its glyphs at
  the drawer's size, so they now take the same values instead of values of their own that had drifted apart:
  
  - `comp.search.suggestion.container.{height,padding-inline,padding-block,gap}` alias `comp.combobox.option.*` at both
    sizes, and `comp.search.suggestion.headline.typescale` aliases `comp.combobox.option.label.typescale`. In the default
    system a medium suggestion or result is 48 high (was 56), 12 from its edges (was 16) with 12 after its glyph (was
    16), and its headline is set in `label` (14/20, weight 500) instead of `body` (14/22, weight 400). The small values
    were already the combobox's and do not move. `comp.search.suggestion.completion.emphasis` is two of the label
    family's emphasis steps (200 in the default system, was three of the body family's, 300), so a completion is still
    drawn bold, at 700 over the 500 headline.
  - `comp.tree-view.icon.size.{medium,small}` alias `comp.navigation-drawer.item.icon.size.{regular,compact}`: a medium
    tree's glyph is 24 (was 20) and its label starts 4 further in; the small glyph stays 16.
  - `comp.table-of-contents.row.shape` is `sys.shape.corner.small` (6, was `corner.extra-small`, 3).
  
  The presets (`m3-like`, `cupertino`) keep every one of these rows as they drew them: their
  layers now set the values the default system no longer gives them.
  
  On the web a table of contents row takes a press in its corners too: the row's rounded box no longer decides where it
  can be pressed, a square box as large as the row does, so no point between two rows is dead under a larger corner.
  
  The snapshot baselines of the search view's rows and of the tree view's fixtures differ for this and are to be
  recorded again.
- 5368526: **Visual change, intended — a selected row is told from a hovered one in the tree view, the navigation drawer and
  the table.** In the default system a selected tree row, drawer destination and table row took the neutral
  `secondary-container` tone, which in light is the grey of a hovered row (1.00:1 to 1.03:1 between them). They now
  take the list's selection: a layer of the row's own content color at the selected layer (16 %, twice the hover layer),
  1.15:1 to 1.30:1 from a hovered row in every scheme and on every surface role. `comp.tree-view.selected.container.color`,
  `comp.navigation-drawer.selected.item.container.color` and `comp.table.row.selected.container.color` change value; the
  text of a selected row keeps its color. The snapshot baselines of the tree view, navigation drawer and table fixtures
  that show a selected row are recorded again for this. The presets `m3-like` and `cupertino` draw
  as before.
  
  `pnpm validate` holds it: in the default system a selected row and a hovered one (list, tree view, navigation drawer,
  table) stand at least 1.1:1 apart in every scheme, each laid over each surface role, and a selected row's text is read
  on its fill at 4.5:1 (7:1 in the high-contrast schemes).
- 8ba18ba: **Visual change, intended — a search bar's text no longer touches its search glyph.** `comp.search.container.gap` is
  derived from the bar's buttons' targets and is 0 in the default system since its minimum target became 36, and it was
  also the space after the search glyph, so the query and the placeholder stood right against the glyph. The glyph is no
  button: the space after it is now a decision of its own, the new `comp.search.leading-icon.gap` (the trigger's gap, 8
  in the default system), and the input stands the larger of it and `comp.search.container.gap` after the glyph (SRC-1).
  Nothing else in the bar or the full-screen header moves, and the presets' bars do not move: their gap is already 8. The web draws it; the native platforms, all lagging for the
  search, do not yet read the token.
  
  The snapshot baselines of every search fixture whose bar shows the search glyph differ for this and are to be recorded
  again.
- b91e6da: **A skeleton's placeholders are seen on every surface, the highest container step included.** A placeholder was
  filled with `surface-variant`, which in the default system is the tone of `surface-container-highest`: on that
  surface, in light and in dark, the placeholders were 1.00:1 from it and could not be seen at all, and in dark they
  were 1.04:1 on `surface-bright`. The presets had the same gap on one surface or another (m3-like on its highest
  container, cupertino on its high container in light and on its bright surface and its container in dark).
  
  `comp.skeleton.placeholder.color` is now valued in the root layer as a layer of the content color, `on-surface` at a
  tenth of its opacity, laid over whatever surface is beneath. It stands off every surface role by the same quiet step:
  1.22:1 on each in light, 1.18:1 to 1.32:1 in dark, and at least 1.18:1 in every scheme of every shipped system. This is how
  Material's placeholder for Compose, MUI, Atlassian, Radix, Ant Design and Fluent's translucent skeleton draw theirs.
  On the page's own surface a placeholder is a little stronger than before (1.22:1 where it was 1.16:1 in light).
  
  The spec (SKL-2) now says that the fill is laid over what stands behind the placeholder, once at each point, and holds it
  to 1.1:1 on every surface role. A layer that points the token at one opaque tone gives up that step on the surface of
  that tone, and the docs now say so in place of the advice to re-point it on the highest container. Every skeleton baseline changes.
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
- Updated dependencies [435ebe9]
- Updated dependencies [d8fb809]
- Updated dependencies [be82919]
- Updated dependencies [991095d]
- Updated dependencies [5287d31]
- Updated dependencies [2fe1f5a]
- Updated dependencies [66f1b1c]
- Updated dependencies [f818941]
- Updated dependencies [db7055c]
- Updated dependencies [26a105d]
- Updated dependencies [c927a0a]
- Updated dependencies [0646d07]
- Updated dependencies [f669310]
  - @tanrei/token-engine@0.1.0-next.1

## 0.1.0-next.0

### Patch Changes

- Updated dependencies [f181fc2]
  - @tanrei/token-engine@0.1.0-next.0
