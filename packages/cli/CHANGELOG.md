# @tanrei/cli

## 0.1.0-next.1

### Minor Changes

- 8f7b8f0: `tanrei build` prints the glyph names of the icon set that Tanrei's components may draw by themselves (a chevron, a
  check, the cross of a close button…), in alphabetical order and comma-separated, and the axis values the product's
  system draws icons at (fill, weight, grade, optical size). The full Material Symbols file is 5.4 MB; a product adds its
  own names to the list and loads only those glyphs at those values — from Google Fonts with `icon_names=` and axis
  ranges, or from a file it cuts down with a subsetter that keeps the ligature features. The list is generated from the
  specs and the web components' code, and is an upper bound: it may name a word the components only use as a string.
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

### Patch Changes

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
- 65bbe74: Theme Studio (served by `tanrei studio`, and on the documentation site): dragging inside a colour picker or along a
  slider no longer makes the page heavy. Every move of the pointer used to compute the whole layer and write the
  preview's stylesheet again — about 200 ms each — so a one-second drag across the brand color took the page tens of
  seconds to follow. A value is now shown at the next frame, the latest one only; a palette's color (a seed, a hue and
  chroma, a fixed tone) is drawn from the palette alone while it moves, and the layer is computed when the picker
  closes or the pointer rests. The same final color gives the same theme. A fixed tone's colour field previews while it
  is picked and is written when the picker closes, as the seed's is.

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
