# Tanrei for SwiftUI

> **Pre-release.** Nothing has been released: no version of the `Tanrei` Swift package is tagged yet. It has not caught up with the current specs and tokens and **does not build yet**; its CI is paused until it does (the [status matrix](../../docs/status/STATUS.md) marks it *lagging*). Documentation: <https://tanrei.chnotchy.com/getting-started/swiftui/>.

The SwiftUI implementation of the Tanrei design system. Components implement the
platform-neutral specs in [`specs/`](../../specs) and take every design value from a
**design system instance** (`TanreiSystem`) carried by the theme. The shipped default,
`TanreiSystem.tanrei`, is generated into `Sources/Tanrei/Generated/`; a product can supply its own.

- Swift 6 language mode, strict-concurrency clean
- iOS 17+, macOS 14+
- No dependencies

## Install

The package manifest is at the repository root (SwiftPM resolves git URLs from there).

```swift
// Package.swift
dependencies: [
  .package(url: "https://github.com/chnotchy/tanrei.git", from: "0.0.0")
],
targets: [
  .target(name: "App", dependencies: [.product(name: "Tanrei", package: "tanrei")])
]
```

In Xcode: **File → Add Package Dependencies…**, paste the repository URL, add the `Tanrei` library.

## Use

```swift
import SwiftUI
import Tanrei

struct DeployView: View {
  @Environment(\.tanreiSystem) private var system   // every token of the current design system

  var body: some View {
    VStack(spacing: system.space.space150) {
      TanreiButton("Deploy", variant: .filled, size: .medium, action: deploy)

      TanreiButton("Roll back", variant: .outlined, action: rollBack) {
        Image(systemName: "arrow.uturn.backward")
      }

      TanreiButton("Delete", variant: .text, action: delete)
        .disabled(true)  // `disabled` is SwiftUI's own environment value
    }
  }
}
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiButtonVariant` — `.filled` (default) `.tonal` `.elevated` `.outlined` `.text`, plus any variant the design system adds |
| `size` | `size: TanreiButtonSize` — `.small` `.medium` (default) `.large`, plus any size the design system adds |
| `disabled` | `.disabled(_:)` |
| `click` | `action:` |
| `icon` slot | trailing `icon:` view builder |

`TanreiButtonVariant` and `TanreiButtonSize` are **open keys**, not enums: string-backed
structs with a constant per core value, `.core` (the values every system has) and `.fallback` (the
default). A value the current design system does not have draws the default value's tokens and is
reported in debug builds (BTN-7) — see [Extending the vocabulary](#extending-the-vocabulary).

### Icon button

An action or an on/off switch drawn as one icon (specs/icon-button.spec.json). The label is the
**accessible name** and is required: an icon alone is not a name.

```swift
@State private var isFavorite = false

TanreiIconButton("Favorite", icon: "favorite", action: like)                            // a glyph of the icon font
TanreiIconButton("Settings", variant: .filled, action: open) { Image(systemName: "gearshape") }   // any icon view
TanreiIconButton("Favorite", isSelected: $isFavorite, icon: "favorite", variant: .filled)  // a toggle
TanreiIconButton("Delete", icon: "delete", action: delete).disabled(true)
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiIconButtonVariant` — `.standard` (default) `.filled` `.tonal` `.outlined`, plus any variant the design system adds |
| `size` | `size: TanreiIconButtonSize` — `.small` `.medium` (default) `.large` (32 / 36 / 40, square), plus any size the design system adds |
| `toggle` + `selected` | the initializers with `isSelected: Binding<Bool>` — passing a binding makes it a toggle |
| `disabled` | `.disabled(_:)` |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`): the accessibility label |
| `click` | `action:` (optional for a toggle) |
| `change` | the `isSelected` binding: activation calls `action` (click), then flips it (ICB-11: click, then change) |
| `icon` slot | trailing `icon:` view builder, or `icon: "name"` for a glyph of the icon font (`TanreiIconGlyph`) |

- **Looks (ICB-12).** An action draws its variant's own parts; a toggle draws the variant's `unselected.`
  parts while off and its `selected.` parts while on (`system.iconButton.variants.filled.enabled.selectedContainerColor` …).
  A filled toggle that is off is quiet (surface-container-highest), and on it is filled.
- **Accessibility (ICB-11).** A toggle carries the toggle trait, plus the selected trait while on; an action carries
  neither. VoiceOver announces the label only; the icon is hidden.
- **The icon (ICB-13).** The slot is drawn in the icon color of the look, in a box of the size's `iconSize`, with the
  icon font of the selection state as its font: the family and `FILL` of *selected* only for a toggle that is on,
  `sys.icon.weight`, and `opsz` = the box clamped to `sys.icon.optical-size.min…max`. `TanreiIconGlyph("favorite")` (or
  `icon: "favorite"`) is a glyph of that font. **Without the icon font installed — or under
  `TanreiTheme(fontFamilyPolicy: .system)` — a glyph draws nothing** (never the glyph's name in a text font); any other
  view in the slot (an SF Symbol) gets the platform font at the box size and draws itself. SF Symbols have no `FILL`
  axis: pass the `.fill` symbol for a toggle that is on yourself.
- **Not text.** Dynamic Type changes neither the square nor the icon (the spec's accessibility notes).
- **Empty label (ICB-14).** Still drawn; reported through `TanreiDiagnostics` in debug builds.
- Press, hold, ripple, focus ring, corner smoothing and the minimum target (on both axes) are Button's (ICB-1…10 are
  BTN-1…10), built from the same primitives.

### Button group

Lays out a few related Buttons and icon buttons in one row, spaced apart or joined into one shape, and names them as a
group (specs/button-group.spec.json). The group draws nothing of its own: its items are `TanreiButton`s and
`TanreiIconButton`s, toggles included, drawn and behaving as they do anywhere.

```swift
@State private var isBold = true
@State private var isItalic = false

TanreiButtonGroup {
  TanreiButton("Cancel", variant: .outlined, action: cancel)
  TanreiButton("Save draft", variant: .tonal, action: save)
  TanreiButton("Publish", action: publish)
}

TanreiButtonGroup(variant: .connected, label: "Text style") {
  TanreiIconButton("Bold", isSelected: $isBold, variant: .tonal) { Image(systemName: "bold") }
  TanreiIconButton("Italic", isSelected: $isItalic, variant: .tonal) { Image(systemName: "italic") }
}
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiButtonGroupVariant` — `.standard` (default) `.connected`. A closed enum: the two differ in structure, so a design system adds none; `TanreiButtonGroupVariant(named:)` reads a spec value from data and makes any other name `.standard`, reported in debug builds (BGR-9) |
| `label` | `label:` (`LocalizedStringKey` or `StringProtocol`, default empty) — the group's accessible name |
| item `button` | a `TanreiButton` in the content builder: `variant`, `size`, `.disabled(_:)`, `action:` (`click`) as anywhere |
| item `icon-button` | a `TanreiIconButton` in the content builder: `variant`, `size`, `isSelected:` (`toggle`, `selected`, `change`), `.disabled(_:)`, the label, `action:` (`click`) as anywhere |

- **Layout (BGR-1, BGR-7, BGR-8).** One row, in order, each item at its own width: `standard` spaces them
  `button-group.standard.gap` apart, centred on the row's middle; `connected` `connected.gap` apart, every item as tall as
  the tallest (a label that wraps, larger text). A row wider than it is given narrows its Buttons in proportion to their
  widths, down to their longest word — their labels wrap between words, never inside one — and keeps its icon buttons;
  it never wraps onto a second line or scrolls, and a row that still does not fit overflows its trailing end and is
  reported in debug builds. The longest word is known only for a title given as a string: a `LocalizedStringKey` title
  cannot be read, so such a Button may be narrowed to less than a word.
  Right to left, the first item is on the right.
- **Connected (BGR-2, BGR-3, BGR-11).** Where two items meet, their corners are `connected.inner-shape` (eased by the
  corner smoothing, as every corner); the first item's leading corners and the last item's trailing ones stay the item's
  own — a pill's end stays a half circle. The fill, the outline, the state layer, the ripple, the elevation and the focus
  ring follow that shape. Each item is at least the platform's target wide (`sys.target.pointer` on macOS,
  `sys.target.touch` elsewhere): an icon button widens around its centred icon. An item added, removed or disabled keeps
  the others in order and changes which corners are inner at once, never animated; a disabled item keeps its place.
- **Items stay themselves (BGR-4, BGR-5).** Each item draws from its own tokens, answers hover, focus and press itself,
  calls its own action and is its own keyboard stop; the group takes no focus, handles no arrow key and keeps no
  selection — its toggles are independent. Above and below the row every item's hit area reaches the minimum target (BTN-5,
  ICB-5); sideways, in a standard group, no further than the middle of the gap, so a press on an item's visible bounds is
  always that item's and a press in the gap goes to the nearer item. A focused item is drawn above its neighbours, so its
  ring is not covered where they meet.
- **Accessibility (BGR-6).** With a `label` the group is one container named by it (`.accessibilityElement(children:
  .contain)`), holding its items; without one it adds no element of its own, only its items.
- **Content (BGR-10).** The group reads its content as items — `ForEach` and `if` included, and an item wrapped in a
  view of your own — and reports in debug builds a group of fewer than two items and content that is not a `TanreiButton`
  or `TanreiIconButton` (a trait the two set on themselves); either still renders. Give every item the same size.
- **The internal channel (BTN-10, ICB-10).** The group reaches its items through environment values internal to the
  package (`tanreiInJoinedRow`, `tanreiJoinedPlace`, `tanreiJoinedSize`): the corners that face a neighbour, a minimum
  width, the height of the row, how far a hit area may reach sideways, and that a label wraps between words. It is not a
  styling API; outside a group `TanreiButton` and `TanreiIconButton` draw exactly as they always have. Because SwiftUI
  evaluates the top of an item's body where the item was written, before the group has placed it, a Tanrei button in a
  group draws below a one-child container (`TanreiButtonTarget`), where the place is known.
- **Fixtures.** On a 400 × 96 stage at the natural width, start-aligned; a connected fixture's icon buttons at macOS's
  pointer target (44 wide); glyphs as the SF Symbols a product would pass (edit → pencil, share → square.and.arrow.up,
  delete → trash, format_bold → bold, format_italic → italic, format_underlined → underline).

### Split button

Performs a main action with one press, and offers related actions in a menu from a second, joined button beside it
(specs/split-button.spec.json). The view builder is the menu's content — the menu's own items — presented as
`.tanreiMenu` presents a menu. SwiftUI's `Menu(primaryAction:)` is not used: neither half could be tokenised.

```swift
@State private var showsSaveOptions = false
TanreiSplitButton("Save", menuLabel: "More save options", isMenuPresented: $showsSaveOptions, action: save) {
  TanreiMenuItem("Save as…", action: saveAs)
  TanreiMenuItem("Save a copy", action: saveCopy)
  TanreiMenuSection("Options") { TanreiMenuToggle("Keep a backup", isOn: $keepsBackup) }
}
TanreiSplitButton("Save", icon: "save", menuLabel: "More save options", isMenuPresented: $showsSaveOptions,
                  variant: .outlined, size: .small, action: save) { … }          // a glyph of the icon font
TanreiSplitButton("Save", icon: { Image(systemName: "square.and.arrow.down") }, menuLabel: "More save options",
                  isMenuPresented: $showsSaveOptions, action: save) { … }       // any icon view
  .disabled(isSaving)
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiSplitButtonVariant` — `.filled` (default) `.tonal` `.elevated` `.outlined`, plus any variant the design system adds |
| `size` | `size: TanreiSplitButtonSize` — `.small` `.medium` (default) `.large`, plus any size the design system adds |
| `label` | the title, first (`StringProtocol` or `LocalizedStringKey`): the leading half's text and accessible name |
| `menuLabel` | `menuLabel:` (the same type as the title): the trailing half's accessible name |
| `open` / `toggle` / `close` | `isMenuPresented: Binding<Bool>` — the trailing half writes the opposite of it (`toggle`; Down Arrow on a closed menu writes `true`), the menu writes `false` when it asks to close (`close`) |
| `disabled` | `.disabled(_:)` |
| `click` | `action:` — the leading half |
| slot `icon` | `icon:` — a glyph name (`TanreiIconGlyph`) or a view builder |
| slot `menu` | the trailing view builder: `TanreiMenuItem`, `TanreiMenuToggle`, `TanreiMenuSection` with `TanreiMenuOption`s, as in a menu |

- **Two halves (SPB-1, SPB-2, SPB-4, SPB-17).** Two SwiftUI `Button`s in reading order, each its own keyboard stop, with
  no element of the split button's own around them: the leading half named by its title, which calls `action` (by
  pointer, touch, Enter, Space or assistive technology) and never opens or closes the menu; the trailing half named by
  `menuLabel`, which writes the opposite of `isMenuPresented`. Each half answers its own hover, focus and press; the other
  keeps its own state. The icon and the chevron are hidden. **SwiftUI has no "opens a menu" or expanded state** for the
  trailing half.
- **The menu (SPB-15, SPB-16, SPB-20).** While `isMenuPresented` is true the menu's items are presented as the Tanrei
  Menu, `bottom-end`, with everything the menu does (MNU-1 … MNU-29: focus in, the keys, typeahead, flipping, the
  popover's presentation — see Menu). The popover is attached to the trailing half: its bottom end is the whole split
  button's (the halves share one height and the trailing half ends the row, on either side), and it is where focus returns
  when the menu closes. The menu closes itself through the binding — Escape, Tab, a press outside, an item after its own
  action — so the binding is both `toggle` and `close`; the close reason is the menu's and is not exposed. On iOS a tap on
  the trailing half while the menu is open is taken by the popover and closes it. A menu slot with no item presents no
  menu, draws the open form all the same, and is reported in debug builds — as are an empty title and an empty
  `menuLabel`. The slot is read as the menu reads it (`ForEach`, `if` and sections included) on the first pass.
- **Disabled (SPB-3, SPB-7).** `.disabled(true)` disables both halves (no event, no keyboard stop, exposed as disabled),
  draws them from the disabled tokens and draws the closed form; no menu is presented and nothing is written, whatever
  `isMenuPresented` says.
- **Layout (SPB-6, SPB-12, SPB-14, SPB-19).** One row, `container.inner-gap` apart: the leading half as wide as its
  content — the icon, then the title, `container.gap` apart, padded by `leading.padding-inline-start(-with-icon)` and
  `-end` — and at least `container.height` tall; the trailing half the chevron between `trailing.padding-inline` on each
  side, as tall as the leading half. Offered less width, the title wraps (it never truncates) and both halves grow
  together; so does larger text. Right to left the trailing half is on the left and paddings follow start and end; the
  chevron does not mirror. Each half's hit area reaches the minimum target above and below and outward, and toward the
  other half no further than the middle of the gap (the button group's `TanreiJoinedHitLayout`).
- **Corners and the open form (SPB-11, SPB-13).** The leading half's start corners and the trailing half's end corners
  are the state's `container.shape`; the corners where they meet are `container.inner-shape` — the trailing half's
  `container.inner-shape-open` while open, when its chevron also points up. Both change over `motion.open-*` (at once
  under Reduce Motion). Fill, ripple, outline, elevation and focus ring follow each half's own corners (the button
  group's `TanreiSideCorners`), eased by the corner smoothing.
- **Icons (SPB-14).** The icon and the chevron are drawn at the size's `icon.size` in their own half's label color,
  unselected, through the icon helper; the chevron is the icon font's `keyboard_arrow_down`, and without the font (or
  under `fontFamilyPolicy: .system`) a vector chevron in the same box stroked at `sys.border.thick`, as the chip's drawn
  glyphs are. The icon keeps its size under Dynamic Type; the title grows.
- Press, hold, ripple, the focus ring (around the half's own shape), corner smoothing, the state motion and each half's
  elevation are Button's (SPB-5, SPB-8 … SPB-11, SPB-18).
- **Fixtures.** The test-only `TanreiSplitButton(fixture:icon:menuLabel:isMenuPresented:variant:size:action:)`
  (`@_spi(Fixtures) import Tanrei`) draws a split button whose menu slot is empty, as a fixture's must be (SPB-15), without
  reporting it; the baselines and the gallery's fixture rows use it. On a 320 × 96 stage at the natural width,
  start-aligned; the icon slot's `save` as the SF Symbol a product would pass (`square.and.arrow.down`).

### Floating action button

The single most important action of a screen: one icon on a raised container that floats above the content
(specs/fab.spec.json). The label is the **accessible name** and is required.

```swift
ScrollView { Messages() }
  .overlay(alignment: .bottomTrailing) {
    TanreiFloatingActionButton("Compose", icon: "edit", action: compose)                          // a glyph of the icon font
      .padding(system.space.space200)
  }

TanreiFloatingActionButton("Create", variant: .tonal, size: .small, action: create) { Image(systemName: "plus") }
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiFabVariant` — `.filled` (default) `.tonal` `.surface`, plus any variant the design system adds |
| `size` | `size: TanreiFabSize` — `.small` `.medium` (default) `.large` (40 / 48 / 64, square), plus any size the design system adds |
| `disabled` | `.disabled(_:)` — hiding a FAB whose action is unavailable is usually better |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`): the accessibility label |
| `click` | `action:` |
| `icon` slot | trailing `icon:` view builder, or `icon: "name"` for a glyph of the icon font (`TanreiIconGlyph`) |

- **It does not position itself (FAB-13).** It lays out at its own square; put it where the screen wants it (typically
  an `.overlay(alignment: .bottomTrailing)`, clear of a tab bar). It draws no scrim and moves no content.
- **Elevation is part of each state (FAB-12).** The container casts the elevation of its variant and state outside
  itself, unclipped — in the default system level3 at rest, level4 under hover, none when disabled — and colors and
  elevation change over `motion.state-*` (at once under Reduce Motion). Leave room for the shadow; nothing clips it.
- **The icon (FAB-11).** Centred in a box of the size's `iconSize`, drawn in the icon color with the icon font of an
  unselected icon (a FAB has no selection). Without the icon font a glyph draws nothing: pass your own view (an SF
  Symbol). **Not text**: Dynamic Type changes neither the square nor the icon.
- **Corners** are the size's own (`sizes[size].containerShape`: 8 / 12 / 16; a circle in cupertino); a FAB does not
  change shape per state.
- **Empty label (FAB-14).** Still drawn; reported through `TanreiDiagnostics` in debug builds.
- Press, hold, ripple, focus ring, corner smoothing and the minimum target (on both axes) are Button's (FAB-1…10 are
  BTN-1…10), built from the same primitives.

### Extended floating action button

The FAB with its name written out: a label and an optional leading icon, collapsing to a square that holds only the
icon (specs/extended-fab.spec.json). The title is the visible text **and** the accessible name, also while collapsed.

```swift
ScrollView { Messages() }
  .overlay(alignment: .bottomTrailing) {
    TanreiExtendedFloatingActionButton("Compose", icon: "edit", isExpanded: !isScrolling, action: compose)
      .padding(system.space.space200)
  }

TanreiExtendedFloatingActionButton("New invoice", variant: .tonal, action: create)                     // no icon
TanreiExtendedFloatingActionButton("Compose", size: .large, action: compose) { Image(systemName: "pencil") }
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiExtendedFabVariant` — `.filled` (default) `.tonal` `.surface`, plus any variant the design system adds |
| `size` | `size: TanreiExtendedFabSize` — `.small` `.medium` (default) `.large` (heights 40 / 48 / 64: the FAB's sides), plus any size the design system adds |
| `expanded` | `isExpanded: Bool` — default `true` |
| `disabled` | `.disabled(_:)` |
| `label` | the first argument, `title` (`StringProtocol` or `LocalizedStringKey`): the visible text and the accessibility label |
| `click` | `action:` |
| `icon` slot | trailing `icon:` view builder, or `icon: "name"` for a glyph of the icon font (as `systemImage:` names an SF Symbol); omit it for none |

- **Layout (EFB-11, EFB-12).** Button's geometry: start padding (tighter next to an icon), icon, gap, label, end padding,
  at least the size's height. The label never truncates: given less width it wraps and the container grows; it grows with
  Dynamic Type too. The icon takes the label color and does not grow with Dynamic Type (an icon is not text).
- **Collapsing (EFB-13, EFB-14).** `isExpanded: false` narrows it to a square of its height with the icon centred — the
  same pixels as `TanreiFloatingActionButton` of that size. Width, icon place and the label's fade move together over
  `motion.resize-*` (at once under Reduce Motion). Which edge stays put is the layout's: in an overlay aligned
  bottom-trailing, it collapses toward the trailing edge. **Without an icon it stays expanded** and reports it in debug
  builds (EFB-15).
- **Right to left (EFB-18).** The row mirrors and paddings are logical; a ripple grows from where the press landed.
- **Elevation, placement, empty label** are the FAB's (EFB-16, EFB-17, EFB-19); press, hold, ripple, focus ring, corner
  smoothing and the minimum target are Button's (EFB-1…10).

### FAB menu

A short list of related actions opened from a floating action button, which turns into the list's close button while
they show (specs/fab-menu.spec.json). The label names the toggle and the list and is required; each item is a
`TanreiFabMenuItem` in the view builder (the item kind `item`).

```swift
@State private var showsCreate = false
ScrollView { Documents() }
  .overlay(alignment: .bottomTrailing) {
    TanreiFabMenu("Create", icon: "add", isPresented: $showsCreate) {                    // a glyph of the icon font
      TanreiFabMenuItem("Document", icon: "description", action: newDocument)
      TanreiFabMenuItem("Folder", icon: "create_new_folder", action: newFolder)
      TanreiFabMenuItem("Upload", icon: .image(Image(systemName: "square.and.arrow.up")), action: upload)
    }
    .padding(system.space.space200)
  }

TanreiFabMenu("Create", variant: .tonal, size: .large, isPresented: $showsCreate) { … } icon: { Image(systemName: "plus") }
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiFabMenuVariant` — `.filled` (default) `.tonal` `.surface`, plus any variant the design system adds |
| `size` | `size: TanreiFabMenuSize` — `.small` `.medium` (default) `.large` (the toggle's side: 40 / 48 / 64), plus any size the design system adds |
| `open` / `toggle` / `close` | `isPresented: Binding<Bool>` — the FAB menu opens and closes itself by writing it |
| `label` | the first argument: the toggle's accessibility label and the list's |
| `disabled` | `.disabled(_:)` — hiding a FAB menu whose actions are unavailable is usually better |
| `icon` slot | `icon: "name"` for a glyph of the icon font (`TanreiIconGlyph`), or the trailing `icon:` view builder |
| item `item` (`label`, `icon`, `click`) | `TanreiFabMenuItem(_ title:, icon:, action:)` — `icon` is a `TanreiItemIcon`: a glyph name (a string literal) or `.image(_:)` |

- **Placement (FBM-12, FBM-13).** It does not position itself: it lays out at the toggle's square where you put it (an
  `.overlay(alignment: .bottomTrailing)`, clear of a tab bar), as a FAB. While open the items are presented in a popover
  above the toggle's end edge, as `TanreiMenu` presents its surface — a popover that stays a popover on iPhone
  (`presentationCompactAdaptation(.popover)`) on a clear presentation background, padded so that it clips neither the
  items' shadows nor a focus ring. **The popover places itself**: the column's end edge, `list.offset` and the popover's
  own distance, arrow and chrome are the popover's, not the tokens'. The
  items move no content and there is **no scrim** (FBM-14), but **a press outside closes the menu and does not reach
  what is under it** (a popover's rule, FBM-15).
- **Opening and closing (FBM-1, FBM-15, FBM-16).** A tap, Enter or Space on the toggle writes the opposite of
  `isPresented` (the spec's `toggle`); Down or Up Arrow on the closed toggle opens it. The FAB menu writes `false` on
  Escape (and the macOS exit command), on Tab from an item, on a press outside, and after an item's `action` has run
  (the item's `click`, then `close`). A press on the open toggle is the toggle, not a press outside. The close reason is
  not exposed: writing the binding is the event. Disabled, it is drawn closed and presents nothing, whatever the binding
  says (FBM-2).
- **Focus (FBM-13, FBM-17).** When it opens, focus moves to the first item — to the last, the one nearest the toggle,
  when Up Arrow opened it — and back to the toggle when it closes with focus inside. Down and Up Arrow wrap, Home and End
  reach the ends; no typeahead. Focus moved in after a pointer opened it shows no ring until a key moves it. Tab closes
  the menu and returns focus to the toggle; SwiftUI cannot then move it on past the toggle in the same keystroke, as the
  menu's. The keys are tested as rules, not yet with a real keyboard.
- **The toggle (FBM-3, FBM-6, FBM-11, FBM-19, FBM-21).** A square of the size's side with the size's corners, casting
  the elevation of its look and state (level3, level4 under hover — not in cupertino —, none when disabled). While open
  it takes the variant's open look (`open.` tokens: the variant's other look in the default system), round corners
  (`container.shape-open`, held to half the side) and the icon set's close glyph (a drawn cross without the icon font),
  cross-faded with the slot's glyph; the change runs over `motion.open-*` and back over `motion.close-*`. **Not text**:
  Dynamic Type changes neither the square nor the icon. The toggle keeps its name while open.
- **The items (FBM-18, FBM-19, FBM-22).** Each is a raised container at least `item.height` (and the minimum target)
  tall and as wide as its content: the icon (`item.icon.size`, unselected) and then the label `item.gap` apart, padded
  by `item.padding-inline-start` / `-end` — logical, so right to left mirrors them and the column aligns with the
  toggle's left edge. The label is set in `item.label.typescale` on one line while it fits, wraps rather than
  truncates, and grows with Dynamic Type. The items fade and grow in from their end edge, the one nearest the toggle
  first and each next one `motion.stagger` later, and fade out together over `motion.close-*` before the popover goes;
  everything at once under Reduce Motion. An SF Symbol wider than it is tall is drawn at the box's font size and can
  reach past the box.
- **Accessibility (FBM-20).** The toggle is a button named by the label; the items are buttons named by their labels,
  each with its position ("2 of 3", English only) as its value, in a container named by the label. The glyphs are
  hidden. **SwiftUI has no menu or menu item role, and no "opens a menu" or expanded state** for the toggle. An item's accessibility frame also takes in its drawn shadow, so neighbouring items' frames
  overlap by a few points.
- **Content as data (FBM-23).** The FAB menu reads its items from their own views (each item's title, icon and action)
  and draws them itself, as `TanreiMenu` does; the items draw nothing outside a FAB menu. An empty label, an item
  without a label or an icon, and fewer than two or more than six items still render and are reported in debug builds.
- **Fixtures.** The test-only `.inPlace()` (`@_spi(Fixtures) import Tanrei`) draws the open items in place above the
  toggle, in the toggle's own overlay, with their elevation and without the popover, the open motion or focus moving
  in (FBM-13's verify); the baselines and the gallery's open rows use it.
- Press, hold, ripple, focus ring (around the toggle's or the item's own shape), corner smoothing, the state motion and
  the minimum target (the toggle's on both axes, each item's height) are Button's (FBM-4, FBM-5, FBM-8 … FBM-10), for
  the toggle and for each item from its own parts. FBM-7: an unknown variant or size draws the default's tokens and is
  reported in debug builds.

### Chip

A compact control in a row: an action, a filter that is on or off, or an item the user entered and can remove
(specs/chip.spec.json). The spec's `kind` is chosen by initializer.

```swift
@State private var vegetarian = false

TanreiChip("Add to calendar", icon: "event", action: add)                                     // action
TanreiChip("Sounds good", variant: .elevated, action: reply)
TanreiChip("Vegetarian", isSelected: $vegetarian)                                             // filter
TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", onRemove: { remove(ada) })      // input
TanreiChip("Ada Lovelace", removeLabel: "Remove Ada Lovelace", avatar: { Photo(ada) }, onRemove: { remove(ada) })
```

| Spec | SwiftUI |
|---|---|
| `kind` | the initializer: `init(_:action:)` action, `init(_:isSelected:)` filter, `init(_:removeLabel:action:onRemove:)` input |
| `variant` | `variant: TanreiChipVariant` — `.outlined` (default) `.elevated`, plus any variant the design system adds |
| `size` | `size: TanreiChipSize` — `.small` `.medium` (default) (24 / 32), plus any size the design system adds |
| `selected` | `isSelected: Binding<Bool>` (filter chips only) |
| `disabled` | `.disabled(_:)` — reaches the remove action too |
| `label` | the first argument, `title`: the visible text and the accessibility label |
| `removeLabel` | `removeLabel:` — the remove action's name; name the item ("Remove Ada Lovelace") |
| `click` | `action:` (optional for filter and input chips) |
| `change` | the `isSelected` binding: activation calls `action`, then flips it (click, then change) |
| `remove` | `onRemove:` |
| `icon` slot | trailing `icon:` view builder, or `icon: "name"` for a glyph of the icon font |
| `avatar` slot | `avatar:` view builder (input chips only) |

- **Filter chips (CHP-11 … CHP-13).** A button with the toggle trait, plus the selected trait while on — never a
  checkbox. On, it draws the variant's `selected.` parts and a check in the leading position (in place of its icon);
  the width follows the check over `motion.selection-*`. The check is the icon font's `check` glyph when the font is
  installed, else the checkbox's mark stroked at `sys.border.thick`.
- **Input chips (CHP-18 … CHP-22).** Two elements and two focus stops: the chip, then its remove action — a second
  `Button` laid over the chip's inline end (not nested in the chip's label, where it would take the chip's taps), named
  by `removeLabel`. The remove action has its own hover, focus ring and press (the chip is not hovered while the
  pointer is on it), and a hit area of at least the minimum target that reaches outward past the chip, never over the
  label. Backspace or Delete on the focused chip asks for removal too. The chip never removes itself or moves focus:
  `onRemove` asks its owner.
- **Layout (CHP-16, CHP-17, CHP-25).** Each end is padded by what it holds (text, glyph, avatar); the label stays on
  one line and truncates only when the chip is given less width; larger text grows the chip's height. The row mirrors
  right to left, with the remove action at the left.
- **Rows of chips (CHP-23).** A chip is one tab stop (an input chip two) and handles no arrow keys. Grouping, arrow
  navigation, selection rules among filter chips and focus after a removal belong to the layout that holds the chips.
- Press, hold, ripple, focus ring, corner smoothing and the minimum target are Button's (CHP-1…10); the remove action
  answers its own press the same way, within its round container.

### Card

A surface for content about one subject, optionally one action (specs/card.spec.json). As with `Button`, the
initializer that takes `action:` makes it interactive.

```swift
TanreiCard { ReportSummary() }                                                        // outlined (default), inset
TanreiCard(variant: .filled, inset: false) { Photo(); Caption().padding() }           // content to the edges
TanreiCard(variant: .elevated, label: Text("Quarterly report")) { ReportSummary() }   // a named group
TanreiCard(label: Text("Quarterly report"), action: open) { ReportSummary() }         // one pressable action
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiCardVariant` — `.elevated` `.filled` `.outlined` (default), plus any variant the design system adds |
| `interactive` | the initializers with `action:` |
| `disabled` | `.disabled(_:)` — ignored by a card without `action:` (CRD-11) |
| `inset` | `inset: Bool` — default `true` |
| `label` | `label: Text?` — the accessible name (an interactive card's), or the name of a group |
| `click` | `action:` |
| default slot | trailing `content:` view builder |

- **Content (CRD-12, CRD-13).** Inset by `container.padding` on every side (logical, so it mirrors), or to the edges;
  clipped to `container.shape`; the outline of the outlined variant is drawn above it. The card has no height of its
  own. The content gets the variant's content color as its foreground style and `sys.typescale.body` as its font.
- **An interactive card is one button (CRD-14, CRD-15).** Its content is read as part of it, named by `label` (without
  a label its text is the name, reported in debug builds). **Put nothing interactive in it** — no button, link, field or
  toggle: SwiftUI cannot look inside the content to report one, and VoiceOver could not reach it. A card that needs its
  own buttons stays a container, and its primary action is one of them.
- **States (CRD-3, CRD-6, CRD-16).** Hover, focus and press paint the container (and change the elevation, e.g. the
  default elevated card rises from level2 to level3 on hover) over `motion.state-*`; disabled keeps the colors and dims
  the whole card by `disabled.opacity`. A card without `action:` is always drawn at rest and is not focusable.
- **Hit target (CRD-5).** A card smaller than the minimum target on an axis is hit-tested at the target; its container
  keeps its size, but its layout slot grows.
- Press, hold, ripple, focus ring, corner smoothing and the variant fallback are Button's (CRD-7 … CRD-10).

### Carousel

A row of visual items that scrolls sideways, each item opening what it shows (specs/carousel.spec.json). The label
names the carousel's list and is required; each item is a `TanreiCarouselItem` in the view builder (the item kind
`item`), named by its own label, its content what it shows.

```swift
TanreiCarousel("Recently played") {                                                   // multi-browse (default)
  ForEach(albums) { album in
    TanreiCarouselItem(album.title, action: { open(album) }) {
      Image(album.cover).resizable().scaledToFill()
    }
  }
}
TanreiCarousel("Featured walks", layout: .hero) { … }                                  // one featured item at a time
TanreiCarousel("Posters", layout: .uncontained, itemWidth: 120) { … }                  // a plain row, 120-point items
```

| Spec | SwiftUI |
|---|---|
| `layout` | `layout: TanreiCarouselLayout` — `.multiBrowse` (default) `.hero` `.uncontained`. A closed enum: the layouts are geometry, so a design system adds none; `TanreiCarouselLayout(named:)` reads a spec value from data and makes any other name `.multiBrowse`, reported in debug builds (CRL-24) |
| `itemWidth` | `itemWidth: CGFloat?` — the large width in points (multi-browse, uncontained); `nil` (default) takes `container.large-width`; a value that is not a positive number is `nil`, reported in debug builds (CRL-24); hero ignores it |
| `label` | the first argument: the list's accessibility label |
| item `item` (`label`, `click`) | `TanreiCarouselItem(_ label:, action:) { content }` — the content is the item's default slot |

- **Layout (CRL-8 … CRL-13).** As wide as its parent and `layout.height` tall (never below the minimum target); every
  item as tall. The slots are the spec's arithmetic, unrounded: multi-browse fits as many large items as leave room for
  a medium and a small one (40 to 56 wide by default), hero is one large item and a small one, uncontained is every item
  L wide and cut at the edge. Items scroll under `layout.padding-inline` to the carousel's edges. **The height is the
  token's**: SwiftUI cannot tell a `.frame(height:)` from a stack's proposal, so the product sizes a carousel through
  the tokens of a layer, not a frame.
- **Scrolling (CRL-12 … CRL-14).** A horizontal `ScrollView` whose content is a track as long as the scroll range; the
  items are placed on it from the scroll offset, so each grows toward slot 0 and shrinks as it leaves. Multi-browse and
  hero settle at a whole item when a drag ends — the next one after a release at 0.5 points a millisecond or faster, else
  the nearest — through a `ScrollTargetBehavior`; **the settle moves with the scroll view's own deceleration**, not
  `motion.scroll-*`, and not at once under Reduce Motion. Uncontained scrolls
  freely, and not at all while its items fit.
- **Content (CRL-15, CRL-16).** Laid out at the large slot's width and the carousel's height, centred on the item and
  clipped to its corners, so a narrower item shows its middle; it gets `item.content.color` as its foreground style and
  the product's layout direction. Give an image `.resizable().scaledToFill()`. The resting `item.container.color` fills
  the item under the content; hover, focus and press draw `item.state-layer.color` at the `sys.state` state-layer opacity
  **over** the content, and a ripple in the same layer. **Put nothing interactive in the content** — no button, link or
  field: an item is one action, SwiftUI cannot look inside the content to report one (CRL-20), and VoiceOver could not
  reach it.
- **Keyboard (CRL-17, CRL-18).** One stop: the item that last had keyboard focus, or else the item at slot 0 (the first
  wholly in view, uncontained). Right and Left Arrow move to the next and previous item without wrapping (mirrored right to
  left), Home and End to the ends; Enter and Space activate. Keyboard or VoiceOver focus scrolls the item to slot 0, as
  near as the range allows (wholly into view, uncontained), over `motion.scroll-*`, at once under Reduce Motion. SwiftUI
  never focuses an item on a tap. The keys and VoiceOver's focus are tested as rules, not yet on a device.
- **Accessibility (CRL-19, CRL-20).** The carousel is a container named by its label and each item one button named by its
  label; the content is hidden. Items out of view stay in the tree, in order. **SwiftUI has no list role and no
  position-in-set property for a custom container**: VoiceOver's own count of the container's elements stands in for an
  item's position and the number of items. An empty label (the carousel's or an item's) still renders and is reported in
  debug builds.
- **Right to left (CRL-23).** The row, its padding, the scroll and the arrow keys are mirrored; a ripple still grows from
  the point of contact, and an item's content is not mirrored. The scroll view and the track are laid out left to right
  and the carousel mirrors its geometry itself, so offsets are the same on both sides.
- **Changes (CRL-21, CRL-25).** A new width, new items or a new layout keep the item at slot 0 (first in view,
  uncontained) where it was, at once. Larger text changes nothing: the carousel holds no text of its own.
- Press, hold, ripple, focus ring (inside the item, which the row would clip), corner smoothing, the state motion and the
  minimum target — the item and half the gap on each side, at least the target — are Button's (CRL-1 … CRL-7, CRL-22),
  for each item from `comp.carousel` (one part, `item`).

### Divider

One thin line between groups of content (specs/divider.spec.json).

```swift
VStack(spacing: system.space.space100) { inbox; TanreiDivider(); archive }        // horizontal, full width
TanreiDivider(inset: .start)                                                      // lines up with an inset list's text
HStack { bold; TanreiDivider(axis: .vertical, inset: .both); italic }             // vertical, a middle divider
TanreiDivider(isDecorative: false)                                                // exposed to assistive technology
```

| Spec | SwiftUI |
|---|---|
| `orientation` | `axis: Axis` — `.horizontal` (default) `.vertical` |
| `inset` | `inset: TanreiDividerInset` — `.none` (default) `.start` `.both` |
| `decorative` | `isDecorative: Bool` — `true` (default) |

- **Size (DIV-1, DIV-2).** A horizontal divider fills the width its layout proposes and is exactly
  `comp.divider.line.thickness` high; a vertical one fills the height. It adds no margin: the gap is the layout's.
  Unlike SwiftUI's `Divider`, the axis is stated, not taken from the enclosing stack.
- **Inset (DIV-3, DIV-4).** `comp.divider.line.inset` is left undrawn at the start (the leading edge, so the right end in
  right-to-left layouts; the top of a vertical divider) or at both ends.
- **Pixel grid (DIV-8).** The thickness is rounded to whole device pixels of `displayScale`, never below one, so a
  hairline is never blurred over two rows.
- **Accessibility (DIV-5, DIV-6).** Decorative, it is hidden. `isDecorative: false` makes it an element with no name
  whose value is its orientation (`horizontal` / `vertical`). **Apple platforms have no separator role** — neither
  UIKit nor SwiftUI can say "separator", and SwiftUI's own `Divider` is never exposed — so VoiceOver reaches the
  element and reads only the orientation. It is never focusable and takes no
  input: a tap on it reaches what is beneath.
- **Names from data (DIV-7).** `TanreiDividerInset(named:)` and `Axis(tanreiDividerOrientation:)` read the spec's names
  (`"start"`, `"vertical"` …); an unknown name is the default, reported in debug builds.

### Badge

A dot or a small count on the top-end corner of an anchor (specs/badge.spec.json). SwiftUI's own `.badge` works only
in lists and tab bars; this one decorates any view.

```swift
TanreiBadge(count: nil, label: "New messages") { Image(systemName: "bell").accessibilityLabel("Notifications") }
TanreiBadge(count: unread, label: "\(unread) unread") { inboxButton }      // 0 draws nothing and adds nothing
Image(systemName: "bell").tanreiBadge(1200, label: "More than 999 unread") // the modifier form: draws 999+
```

| Spec | SwiftUI |
|---|---|
| `count` | `count: Int?` — `nil` is the dot, 0 is nothing, above 0 the number |
| `max` | `max: Int` — default `TanreiBadge.defaultMax` (999); a larger count shows as `999+` |
| `label` | `label: String` — default `""` |
| default slot | the trailing `anchor:` view builder, or the view `.tanreiBadge(_:max:label:)` is applied to |

- **Placement (BDG-1, BDG-3, BDG-11).** The dot's center sits `comp.badge.dot.offset` inside the anchor's top-end corner;
  the pill's *leading circle* (a `container.height` square at its start) sits `container.offset` inside it, so a longer
  count grows toward the end. Right to left, the top-end corner is the top-left and the pill grows to the left.
- **No space, no input (BDG-7).** It is an overlay: the anchor's size and position never change, the badge may extend
  past the anchor (leave room around it), and a tap on it reaches the anchor.
- **The pill (BDG-2, BDG-6, BDG-13).** At least `container.height` high and as wide as it is high, `padding-inline`
  around the count, `label.typescale` with tabular digits; the outline (`outline.width` of `outline.color`) is drawn
  outside the edge and changes nothing else. Enlarged text grows the pill with its line; the dot stays `dot.size`.
- **Digits (BDG-4, BDG-12).** Formatted with the environment's `locale`, no grouping (`1000`, `٩٩٩+` in Arabic); the text
  is a first-strong isolate so the plus stays after the digits in any direction.
- **Accessibility (BDG-5, BDG-8, BDG-9, BDG-10).** The drawn dot and number are hidden. `label` — or without one the
  displayed count — becomes the anchor's **accessibility value**, so VoiceOver reads "Notifications, 3 unread". Make the
  anchor one element with a name of its own. On iOS 18 / macOS 15 a count of 0 leaves the anchor's own value alone; on
  iOS 17 / macOS 14 the badge always sets the value (empty for 0), replacing one the anchor had. Nothing is announced
  when the count changes; a dot with no label, a negative count and a `max` below 1 are reported in debug builds (BDG-14).

### Bottom sheet

Supplementary content or a short task in a surface that rises from the bottom edge (specs/bottom-sheet.spec.json): over
the lower part of the content while the rest stays usable (`standard`), or as a modal step that dims and blocks everything
else until it is dismissed (`modal`). A view modifier on the view it covers, as `.sheet` is — but not the native sheet,
whose dim cannot take the scrim token and which becomes a centred form on iPad.

```swift
@State private var sharing = false
@State private var height = TanreiBottomSheetDetent.partial
PhotoView()
  .tanreiBottomSheet(isPresented: $sharing, detent: $height, handleLabel: "Resize sheet", label: "Share photo",
                     onClose: { reason in log(reason) }) {
    ShareTargets()
  }

// Standard: over the bottom of the map, which stays usable; the sheet keeps the height the person chooses.
MapView()
  .tanreiBottomSheet(isPresented: $showsPlaces, variant: .standard, handleLabel: "Resize sheet", label: "Nearby places") {
    PlacesList()
  }
```

| Spec | SwiftUI |
|---|---|
| `open` / `close` | `isPresented: Binding<Bool>` — the sheet writes `false` itself, then calls `onClose` with the reason |
| `close`'s reason | `onClose: ((TanreiSheetCloseReason) -> Void)?` — `.drag`, `.scrim`, `.escape`, `.back` (`.close` is a side sheet's) |
| `variant` | `variant: TanreiBottomSheetVariant` — `.modal` (default) or `.standard`; `TanreiBottomSheetVariant(named:)` for data |
| `detent` / `detentChange` | `detent: Binding<TanreiBottomSheetDetent>` — `.partial` or `.full`; the sheet writes the height the person chose. Omit it and the sheet keeps the height itself, from `.partial` each time it opens |
| `dismissible` / `handle` / `inset` | `dismissible:` / `handle:` / `inset:` (all default `true`) |
| `handleLabel` / `label` | `handleLabel:` / `label:` — the drag handle's name and the sheet's |
| default slot | the `content:` view builder |

- **Presentation (BSH-1 … BSH-4).** A **modal** sheet is presented as `tanreiDialog` is: on iOS a `.fullScreenCover` on a
  clear background with the system transition off — Tanrei draws the scrim (`scrim.color`) over the whole window and the
  motion —, which makes the rest of the app unreachable by touch, VoiceOver and the keyboard; **macOS has no full-screen
  cover**, so the sheet is drawn over the view the modifier is attached to (attach it to the window's root), which is
  disabled meanwhile. It carries the modal trait and counts as an open Tanrei modal (a snackbar host waits; a dialog opened
  from it stacks above it). A **standard** sheet is an overlay at the bottom of the view it is attached to: no scrim,
  nothing inert, no focus trap, Escape ignored; presses above it reach the view, which it neither resizes nor pads (pad your
  scrolling content by the partial height if it must stay visible above the sheet). It slides up over `motion.enter-*` and
  down over `motion.exit-*` from wherever it is; under Reduce Motion it fades in place; presented with the view (mounted
  open) it is there at once.
- **Heights (BSH-6, BSH-7, BSH-21, BSH-24).** As tall as its handle's row and its content, but no taller than
  `container.partial-fraction` of the area (`.partial`) or the area less `container.margin-block-start` (`.full`); the area
  is the window below its top inset (modal) or the view it covers (standard), ending at the on-screen keyboard. A sheet
  shorter than its partial height has one height, and `detent` changes nothing. At most `container.max-width` wide,
  centred, on `container.color` at `container.elevation`, its top corners `container.shape` (eased by the corner smoothing)
  and its bottom corners square; its color reaches under the bottom inset and its content stays above it. Setting
  `detent` moves the sheet over the enter motion. Larger text grows the content (and the sheet, up to its height); the
  handle keeps its size.
- **Content (BSH-8, BSH-10).** Below the handle's row, inset by `container.padding` from its sides and bottom (and its top
  without a handle) unless `inset` is `false`, handed `content.color` as its foreground style and the body text style,
  clipped to the sheet and scrolled when it is taller than the room; the row stays. **On iOS a drag on the content is the
  sheet's while the sheet is below its full height** — it raises the sheet, and the next drag scrolls (SwiftUI cannot hand
  one touch from the sheet to a scroll view partway through) —, and at the full height a drag down on content scrolled to
  its top lowers the sheet, taking a scroll over once the content is back at its top. On macOS a mouse drag moves the sheet
  and the wheel scrolls at either height. Give the sheet a plain column, not a lazy list.
- **Dragging and closing (BSH-5, BSH-9, BSH-20).** The sheet follows a vertical drag on its row, its padding or its content
  beyond 8 points (SwiftUI names no touch slop), never above its full height; released, it settles at the next height in
  the direction of a fling (faster than 0.5 points per millisecond) or at the nearest, over the enter motion (at once under
  Reduce Motion), writing `detent` once when it changed. Released below half its lowest height, or flung down from it, it
  closes; so do, for a modal sheet, a tap on the scrim, Escape (with focus in the sheet) and the iOS accessibility escape
  gesture (`.back`) — only while `dismissible`, and each writes `false` once. A binding that declines the write keeps it
  open, and it settles back. With `dismissible: false`, put a Close or Done button in the content.
- **The drag handle (BSH-11 … BSH-19).** A `handle.container-*` box `handle.margin-block` below the top, centred, the grip
  (`handle.grip-*`) in it. While the sheet has two heights it is one button named by `handleLabel` that moves the sheet to
  its other height (tap, click, Enter, Space) and writes `detent`; **SwiftUI has no expanded state, so its accessibility
  value says "expanded" or "collapsed"** (English only). Its hit area is its row across the box and at least
  `sys.target.pointer` (macOS) or `sys.target.touch`, from the row's top — over the content where the row is shorter. It is
  pressed like Button (`controls[drag-handle]` tokens, the press held for `press-hold`, the answer `pressed-feedback`
  names, the ring or glow for keyboard focus only, the state motion); a drag that starts on it does not leave it pressed and
  does not toggle it. At one height it is drawn at rest and is not focusable, pressable or exposed.
- **Accessibility (BSH-22, BSH-23).** The sheet is a container named by `label` — SwiftUI has neither a dialog nor a region
  role — with the modal trait while modal; the grip is hidden. An empty `label`, and an empty `handleLabel` while the handle
  is interactive, are reported in debug builds. **Focus (BSH-3):** mark a control in the content with
  `.defaultFocus(_:_:)` or `@AccessibilityFocusState`; on iOS the cover moves VoiceOver in and gives it back. SwiftUI cannot
  focus the container itself, nor name the element that had focus to give it back to.
- **Fixtures.** `TanreiBottomSheetSurface(inPlace:…)` (`@_spi(Fixtures) import Tanrei`) draws the scrim and the sheet in
  place, at rest and not modal; the baselines draw it in a 400 × 720 frame with no system insets. Its handle and a drag move
  it, and a close is reported to its `onClose` while it stays open.

### Progress indicator

How far a task has come, as a bar or a ring (specs/progress-indicator.spec.json). The initialisers follow
`ProgressView`: no value is indeterminate.

```swift
TanreiProgressIndicator("Uploading report.pdf", value: 0.4)                                   // a bar at 40 %
TanreiProgressIndicator("Uploading", value: 3, in: 0...10, currentValueLabel: "3 of 10 files")  // min, max, valueText
TanreiProgressIndicator("Loading", variant: .circular, size: .small)                          // an indeterminate ring
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiProgressIndicatorVariant` — `.linear` (default) `.circular` |
| `size` | `size: TanreiProgressIndicatorSize` — `.small` `.medium` (default) `.large`, plus any size the design system adds |
| `value` | `value: Double?` — `nil` (default) is indeterminate |
| `min` / `max` | `in bounds: ClosedRange<Double>` — default `0...1`, as `Slider`'s `in:` |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`): the accessible name |
| `valueText` | `currentValueLabel: String?` |

- **Drawing (PRG-1, PRG-3, PRG-4, PRG-5).** A bar fills the width its layout proposes and is `linear.thickness` high; a
  ring fills `circular.size` with a stroke of `circular.thickness`, from the top, clockwise. Ends are rounded by
  `track.shape` (clamped to half the thickness); a ring's caps are round unless the shape is `corner.none`. With a
  `track.gap`, a bar leaves it after the indicator and a ring at both ends of its arc; a bar draws the stop indicator
  with its center half the thickness before the track's end.
- **Motion (PRG-2, PRG-6, PRG-7, PRG-14).** A value change eases over `motion.value-duration`. Indeterminate, a bar moves
  a segment two fifths long across the track once per `motion.cycle-duration` with `motion.cycle-easing`; a ring turns
  a quarter arc once per cycle at constant speed. Under Reduce Motion a value changes at once, and an indeterminate
  indicator covers the whole track and pulses its opacity 1 → 0 → 1 once per cycle. The loop runs on the display's
  timeline (`TimelineView`), which does not tick in the background; it also stops when the view leaves the hierarchy
  and, on iOS 18 / macOS 15, when it is scrolled out of view.
- **Right to left (PRG-13).** A bar fills from the right (SwiftUI mirrors shapes); a ring is drawn left to right in
  every direction, so it still turns clockwise.
- **Accessibility (PRG-8 … PRG-10, PRG-15).** The element borrows `ProgressView`'s semantics
  (`accessibilityRepresentation`): a progress element named by the label, whose value is the percentage of the range —
  or `currentValueLabel` instead — and, indeterminate, an in-progress (busy) element with no value. It carries the
  frequently-updating trait, is never focusable and announces nothing. An empty label is reported in debug builds;
  out-of-range values are clamped and reported (PRG-11). `TanreiProgressIndicatorVariant(named:)` reads a spec name
  from data (PRG-12).

### Loading indicator

A short wait of unknown length: a quarter arc that turns (specs/loading-indicator.spec.json). Follows
`ProgressView(_:)` without a value.

```swift
TanreiLoadingIndicator("Loading messages")                            // next to text
TanreiLoadingIndicator("Saving", size: .small)                        // in place of an icon in a control
TanreiLoadingIndicator("Refreshing", size: .large, contained: true)   // over content, on a raised circle
```

| Spec | SwiftUI |
|---|---|
| `size` | `size: TanreiLoadingIndicatorSize` — `.small` `.medium` (default) `.large` (16 / 24 / 40), plus any size the design system adds |
| `contained` | `contained: Bool` — default `false` |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`): the accessible name |

- **Drawing (LDG-1 … LDG-3).** A quarter arc with round caps, its outer edge on `indicator.size`, stroke
  `indicator.thickness`, no track, turning clockwise once per `motion.cycle-duration` at constant speed. Uncontained it
  is exactly that square in `indicator.color`; contained, it is centered on a `container.size` circle
  (`container.shape`) in `contained.container.color`, raised by `contained.container.elevation`, in
  `contained.indicator.color`.
- **Reduce Motion (LDG-4).** The arc stops; the whole circle pulses its opacity 1 → 0 → 1 once per cycle with
  `sys.motion.easing.standard`. The container stays still and opaque.
- **Visibility (LDG-7).** The loop is the progress indicator's (`TimelineView`, paused out of the hierarchy and, on
  iOS 18 / macOS 15, out of the scroll view's visible area).
- **Right to left (LDG-8).** Never mirrored.
- **Accessibility (LDG-5, LDG-6, LDG-10).** An indeterminate `ProgressView`'s semantics (busy, no value) named by the
  label; never focusable, and it announces nothing when it appears. An empty label is reported in debug builds.

### Checkbox

One independent choice, on or off; a parent choice that is partly on; a required choice left unmade
(specs/checkbox.spec.json). Follows `Toggle(_:isOn:)`.

```swift
@State private var updates = false
TanreiCheckbox("Email me updates", isOn: $updates)
TanreiCheckbox("Select all", isOn: $allOn, isIndeterminate: someOn && !allOn)   // derived from the children
TanreiCheckbox("I accept the terms", isOn: $accepted, isError: showsErrors && !accepted)
TanreiCheckbox("Select row", isOn: $rowSelected).labelsHidden()
```

| Spec | SwiftUI |
|---|---|
| `checked` | `isOn: Binding<Bool>` |
| `indeterminate` | `isIndeterminate: Bool` — default `false`; a value the caller derives from its data |
| `error` | `isError: Bool` — default `false` |
| `disabled` | `.disabled(_:)` |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`): drawn and the accessible name |
| `labelHidden` | `.labelsHidden()` (read from iOS 18 / macOS 15) |
| `change` | the `isOn` binding: activation writes it |

- **Conditions (CHK-4).** Indeterminate wins over checked, and `isError` selects the `error-` form: six conditions,
  each read from `system.checkbox.conditions[condition]` in each state. Hover, focus and press show on the round
  container behind the box, never on the box.
- **Activation (CHK-1, CHK-2).** A tap or click on the box or on its label, Space on the keyboard, or VoiceOver flips
  `isOn`; while indeterminate it sets `isOn` to true, and the caller's data clears the indeterminate state. Enter does
  nothing: iOS and macOS do not activate a focused control with it.
- **Drawing (CHK-12, CHK-13).** A `box.size` box centered in a `container.size` circle; the outline inside the box's
  edge and the fill inside the outline; the check (or dash) stroked at `mark.width` with square caps. A new condition
  moves over `motion.selection-*` — the check draws along its path, the dash grows from its center — and an
  interaction over `motion.state-*`; under Reduce Motion both appear at once. The box is not mirrored right to left;
  the row is (CHK-15).
- **Label (CHK-15, CHK-16).** At the container's inline end, `label.gap` away, in `label.typescale`, wrapping; the
  control is centered on the label's first line, and the label is part of the hit area. It grows with Dynamic Type;
  the box does not. `.labelsHidden()` draws no label and keeps the title as the name — **from iOS 18 / macOS 15**
  (`labelsVisibility`); before, the label is drawn. An empty title is
  reported in debug builds.
- **Accessibility (CHK-14).** A toggle (the toggle trait; XCUITest sees a switch), on while checked (the selected
  trait); while indeterminate its value is "mixed" (iOS has no mixed trait; English only). **`isError` is drawn, not announced:** Apple platforms have no invalid
  state — put the form's message where VoiceOver reads it.
- Press, hold, ripple (a press on the label grows it from the container's center), focus ring (around the box),
  corner smoothing and the minimum target are Button's (CHK-7, CHK-9 … CHK-11 are BTN-5, BTN-8 … BTN-10).

### Date picker

Lets a person choose one date, or one range of dates, from a month calendar or by typing it, in a dialog or in a surface
that drops down below a field (specs/date-picker.spec.json). A view modifier, as `.sheet` and `.popover` are; the overload
is the mode. Dates are `DateComponents` with a year, a month and a day of the Gregorian calendar, as `MultiDatePicker`
uses, so no time zone enters. SwiftUI's `DatePicker` is not used: it cannot take the tokens and has no range.

```swift
@State private var due: DateComponents? = DateComponents(year: 2026, month: 9, day: 17)
@State private var stay = TanreiDateRange()
@State private var picking = false
TanreiButton("Due date", variant: .outlined) { picking = true }
  .tanreiDatePicker(isPresented: $picking, selection: $due)                                  // modal, one date
TanreiTextField("Check-in", text: $text)
  .tanreiDatePicker(isPresented: $open, range: $stay, presentation: .docked,                // docked below the field
                    minDate: DateComponents(year: 2026, month: 9, day: 3), disabledDates: booked,
                    isDateDisabled: { isWeekend($0) }, labels: TanreiDatePickerLabels(label: "Select dates"),
                    onClose: { reason in log(reason) })
```

| Spec | SwiftUI |
|---|---|
| `open` / `close` | `isPresented: Binding<Bool>` — the picker writes `false` itself; `onClose:` hears why first (`TanreiDatePickerCloseReason`: `.escape` `.back` `.outside` `.tab` `.focusOut` `.cancel` `.confirm` `.select`) |
| `mode` / `value` / `start` / `end` / `change` | the overload: `selection: Binding<DateComponents?>` (single) or `range: Binding<TanreiDateRange>` (`start`, `end`); writing it is `change`, only when the choice differs, before `onClose` |
| `presentation` | `presentation: TanreiDatePickerPresentation` — `.modal` (default) `.docked`; `(named:)` reads a spec name |
| `min` / `max` / `disabledDates` | `minDate:` / `maxDate:` / `disabledDates: Set<DateComponents>`, and the predicate `isDateDisabled:` |
| `today` | `today: DateComponents?` — the device's date in its own time zone, read when it opens, while `nil` |
| `firstDayOfWeek` / `locale` | `firstDayOfWeek: TanreiDatePickerFirstDayOfWeek` (`.locale` — the locale's calendar's `firstWeekday` — `.sunday` … `.saturday`) / `locale: Locale?` (the environment's `\.locale` while `nil`) |
| `entryMode` / `startView` | `entryMode: TanreiDatePickerEntryMode` (`.calendar` `.text`) / `startView: TanreiDatePickerStartView` (`.day` `.year`) |
| `label`, `dateLabel` … `unavailableText` | the fields of `labels: TanreiDatePickerLabels`, named as the spec's props, with its English defaults |
| items `day` / `year` | `TanreiDatePickerDay` / `TanreiDatePickerYear`: generated by the picker, never listed |

- **Presentations (DTP-1, DTP-2, DTP-22).** Modal: as the dialog — a `.fullScreenCover` on a clear background with the
  system transition off on iOS (Tanrei draws `modal.scrim.color` over the whole window and the motion: the scrim fades, the
  container fades and grows from `modal.motion.enter-scale` over `modal.motion.open-*`, both fade out over
  `modal.motion.close-*`; under Reduce Motion it fades without growing); it counts as a Tanrei modal (a snackbar host waits).
  **macOS has no full-screen cover**: attach a modal picker to the window's root; it is drawn over that view, which is
  disabled meanwhile. Docked: an operated overlay that is not modal, **drawn by Tanrei in the anchor's overlay,
  not in a popover** — the popover draws its own bubble, arrow and placement
  —: `docked.offset` below the view the modifier is attached to, start edges aligned (end edges right to left), above it
  when the room below within `docked.viewport-margin` of the window is short and the room above is more, shifted along
  to stay in the window, and scrolling when taller than the room on its side. It grows in from the edge that faces the
  anchor and fades over `docked.motion.open-*`, fades out over `docked.motion.close-*`, appears and disappears at once under
  Reduce Motion. **The overlay is drawn above what the anchor's own container holds after it, not above every view of the
  window**: the anchor is raised with `zIndex` while open; keep room around it
  in a scrolling container.
- **Closing (DTP-5).** Escape (`.escape`); the iOS accessibility escape gesture (`.back`); a press on the scrim or outside
  a docked picker and its anchor (`.outside`); Tab out of a docked picker — from its last stop, the grid or the year list
  — (`.tab`); focus leaving a docked picker (`.focusOut`); Cancel (`.cancel`); OK (`.confirm`); a completed choice in a
  docked picker (`.select`). **A press outside a docked picker still reaches what is under it** (a passive watcher of the
  window's touches on iOS, a local event monitor on macOS); a press on a modal picker's scrim does not. After `.tab` focus
  goes back to the anchor (when it had it); SwiftUI cannot move it on from there.
  A click inside a docked picker that drops SwiftUI's focus is not focus leaving: focus goes back to the grid.
- **Choosing (DTP-6 … DTP-9).** A modal picker holds a pending choice — shown in its header, its calendar and its fields —
  from when it opens (a value the product writes meanwhile does not change it) and writes it on OK, which is disabled while
  the choice is incomplete or a field holds text that is not an available date. A docked picker writes a completed choice
  at once and closes; a range's start writes nothing. In range mode a day is the start when none is chosen, when both are,
  or before the start; otherwise the end. Unavailable days inside a range stay in it.
- **The calendar (DTP-10 … DTP-21).** Each day from one condition — selected, in-range, today, unselected — and from its
  disabled tokens while unavailable (still drawn chosen when the choice names it). Six rows of seven cells of `cell.size`,
  never under the minimum target (`sys.target.pointer` on macOS, `sys.target.touch` elsewhere), a weekday row one cell
  tall, the navigation row at least a cell tall; a day's number on a `day.container.size` square with its condition's
  outline; the band spans in-range cells and runs half a cell into a range's ends. The view toggle (month and year,
  `expand_more` turning half a turn while the year view shows) reaches the minimum target; the previous and next buttons
  are standard medium `TanreiIconButton`s, disabled at min's and max's months, hidden in the year view. The year view lists
  min's to max's years (1900 to 2100 without them) in rows of three, the displayed year's row third in view. Paging slides
  the grid over `motion.page-*` (from the end for a later month); the views cross-fade; both at once under Reduce Motion.
  Glyphs are the icon font's (`chevron_left`, `chevron_right`, `expand_more`, `keyboard`, `calendar_month`) where the font
  is installed and vectors in the same box otherwise.
- **Keyboard and focus (DTP-3, DTP-4, DTP-17 … DTP-19, DTP-27).** Focus moves in when it opens — to the day grid, the year
  list or the first field — and back to the anchor when it closes, if the anchor had it. **The grid is one focusable
  element** (its days take no focus of their own): the active day — the choice, else today, else the first available day
  — is drawn focused while the grid has keyboard focus; the arrows move it by a day (mirrored right to left) or a week,
  Home and End to the row's ends, Page Up and Page Down by a month and with Shift by a year, never past min or max, over
  unavailable days, showing the new month; Enter and Space choose it. The year list likewise. The action key in a field
  moves to the next field, and in the last one activates OK when it is enabled. On iOS keys need a hardware keyboard.
- **States (DTP-31 … DTP-35).** Days, years and the view toggle draw hover, focus (keyboard only) and press from their
  condition's state tokens, the press held for `press-hold`, answered per `pressed-feedback` (overlay, ripple, dim, none);
  the focus ring (or glow) around the square — an in-range day's too; corners eased by the corner smoothing.
- **Header and text entry (DTP-23 … DTP-26, DTP-28).** The label and the pending choice ("Thu, Sep 17"; a range "Sep 10 –
  Sep 16"; the year when not today's; what is not chosen yet in `header.placeholder.color`), the entry-mode toggle at the
  end of its line, the divider below. Text entry: outlined medium `TanreiTextField`s — one, or two side by side — with the
  locale's numeric pattern as placeholder ("mm/dd/yyyy"); a field reads three digit groups in the locale's order with any
  separators, never reformats typing, and on commit shows `invalidText` or `unavailableText`. The two fields' equal
  height when one label wraps (DTP-25) waits on the text field's TXF-13.
- **Layout (DTP-38, DTP-39).** A modal picker too tall for the window keeps its header and actions and scrolls the calendar
  or fields between them; when those alone leave no room everything scrolls. On a narrow window the margins give way, then
  the padding, then the cells narrow equally; the surface is never wider than the window. Days grow with enlarged text.
  Right to left mirrors everything; the chevrons swap.
- **Accessibility (DTP-36).** The surface is a container named by the label (modal while modal); the grid a container
  named by its month and year, the weekday names headers named by their full names; each day a button named by its full
  date ("Thursday, September 17, 2026", then todayLabel for today), selected for the chosen date and every day of a range,
  its hint startLabel or endLabel at a range's ends, disabled while unavailable; empty cells hidden. **SwiftUI has no
  dialog, grid, current-date or expanded property**: the view toggle is a toggle (on while the year view shows), described
  by yearViewLabel; the element that opens a docked picker gets no popup semantics.
- **Reports (DTP-28, DTP-40).** Unknown names (`(named:)`), dates that are not calendar dates, an end before its start, a
  value for the other mode, min after max (both ignored), an empty label and `entryMode: .text` on a docked picker are
  reported in debug builds.
- **Fixtures.** `TanreiDatePickerSurface` (`@_spi(Fixtures) import Tanrei`) draws the open picker in place on the space it
  is given — a modal one's scrim over it and its container centred, a docked one at its natural size, centred —, at rest
  and not modal; the baselines draw it on the spec's stages (480 × 640, 400 × 440).

### Radio button

One option of a question whose options exclude each other (specs/radio-button.spec.json). SwiftUI has no radio
group on iOS: `TanreiRadioGroup` — a container that draws nothing and has no tokens — is the spec's `name`.

```swift
@State private var frequency: Frequency? = .weekly
TanreiRadioGroup("Email frequency") {                                 // the group's accessible name
  TanreiRadioButton("Daily", value: .daily, selection: $frequency)
  TanreiRadioButton("Weekly", value: .weekly, selection: $frequency)
  TanreiRadioButton("Never", value: .never, selection: $frequency).disabled(true)
}
```

| Spec | SwiftUI |
|---|---|
| `selected` | `selection: Binding<Value?>` — selected while `selection == value` |
| `value` | `value: Value` (any `Hashable`) |
| `name` | `TanreiRadioGroup(_:content:)`: the options inside it are one group; its title is the group's name |
| `disabled` | `.disabled(_:)` |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`) |
| `labelHidden` | `.labelsHidden()` (read from iOS 18 / macOS 15) |
| `change` | the `selection` binding: activation writes `value` |

- **Activation (RAD-1 … RAD-3).** A tap on the ring or its label, Space, or VoiceOver writes `value` once; the
  selected option writes nothing (it is never cleared by itself); the others unselect through the shared binding.
- **The group (RAD-4, RAD-5, RAD-16).** Down / Right Arrow move focus to the next enabled option and select it, Up /
  Left to the previous, wrapping (Right and Left swap right to left); only the selected option — or the first enabled
  one — takes keyboard focus. The options report themselves in view order (a preference), so the group knows each
  option's position. The arrow keys and the tab stop are tested as rules and through the group's model; the simulator
  gives no keyboard focus under automation.
- **Accessibility (RAD-16).** iOS has no radio role: an option is a button, with the selected trait while chosen and
  its position ("2 of 3", in English only) as its value; the group is a
  container named by its title.
- **Drawing (RAD-14, RAD-15).** A `ring.size` ring stroked at `ring.width` inside its diameter, centered in a
  `container.size` circle; a `dot.size` dot that grows from the ring's center over `motion.selection-*` and shrinks
  back (at once under Reduce Motion).
- Label, `.labelsHidden()`, press, hold, ripple, focus ring (around the ring), corner smoothing and the minimum target
  are the checkbox's (RAD-8 … RAD-13, RAD-17, RAD-18).

### Search

Lets people search the product from a bar, and offers suggestions while they type — in a view docked under the bar, or
over the whole window (specs/search.spec.json). The bar edits text in SwiftUI's own `TextField`, as the text field does;
the suggestions are views in its first view builder, one `TanreiSearchSuggestion` each. SwiftUI's
`.searchable` is not used: its field and suggestions cannot take the tokens, and it ties search to a navigation stack.

```swift
@State private var query = ""
@State private var isSearching = false
TanreiSearch("Search mail", text: $query, isExpanded: $isSearching, prompt: Text("Search mail"), clearLabel: "Clear search",
             onSubmit: search, onSelect: { value in query = value; search(value) }) {
  TanreiSearchSuggestion("invoices", leadingIcon: "history", value: "invoices")
  TanreiSearchSuggestion("Invoices", supportingText: "Folder · 24 messages", leadingIcon: "folder", value: "folder:invoices")
} leading: {
  TanreiIconButton("Menu", icon: "menu", action: openDrawer)
} trailing: {
  TanreiIconButton("Voice search", icon: "mic", action: listen)
} content: {
  if results.isEmpty { Text("No messages match.") }
}
TanreiSearch("Search mail", text: $query, isExpanded: $isSearching, presentation: .fullScreen, clearLabel: "Clear search",
             backLabel: "Back") { … }                                      // on a small screen
```

| Spec | SwiftUI |
|---|---|
| `presentation` | `presentation: TanreiSearchPresentation` — `.docked` (default) `.fullScreen`; `TanreiSearchPresentation(named:)` reads a spec name |
| `value` / `input` | `text: Binding<String>` — every edit writes it (typing, pasting, the clear button, Escape) |
| `label` | the first argument: the search field's, its suggestions' and its full-screen view's accessible name; never drawn |
| `placeholder` | `prompt: Text?` |
| `expanded` / `toggle` | `isExpanded: Binding<Bool>` — the search writes it when it opens and closes its view; `onToggle:` hears each change with the reason (`TanreiSearchToggleReason`: `.escape` `.back` `.select` `.submit` `.outside` `.tab` `.focusOut`; `nil` when opening) |
| `disabled` | `.disabled(_:)` |
| `clearLabel` / `backLabel` | `clearLabel:` / `backLabel:` |
| `submit` | `onSubmit:` — the value |
| `select` | `onSelect:` — the chosen suggestion's value |
| item `suggestion` | `TanreiSearchSuggestion(_ headline:supportingText:leadingIcon:value:)`; `leadingIcon` a `TanreiItemIcon` (a glyph name or `.image(…)`), as the list's |
| slots `leading` / `trailing` / default | `leading:` / `trailing:` / `content:` view builders |

- **Opening and closing (SRC-5, SRC-6).** The search writes `isExpanded = true` when the bar is pressed, when the person
  types, or on Down Arrow — never on focus alone (Tab, or focus coming back from the full-screen view). It writes `false` on
  Escape, the back button, a choice, a submit, and — docked — on Tab or Shift+Tab (focus then moves on), when focus leaves
  the input, and on a press outside the bar and the view. **A press outside still reaches what is under it** on iOS (a
  passive watcher of the window's touches) and on macOS (a local event monitor). The value stays as it is. Writing
  `isExpanded` yourself opens or closes the view and calls no `onToggle`.
- **Keys (SRC-12 … SRC-15).** Down and Up Arrow move the active suggestion while focus stays in the input (Up on the first
  leaves none; typing, moving the caret or a change of the suggestions leaves none); Enter chooses the active one
  (`onSelect`, then close) or submits (`onSubmit`, then close); Escape closes the view, and while it is closed empties the
  value — with an empty value it passes on. The search never changes `text` on a choice: set the value you want.
- **The docked view (SRC-7, SRC-8, SRC-23).** Drawn in an overlay of the bar, not a popover (which would take focus from the
  field): `view.offset` under the bar, as wide as it, on `view.container.color` at `view.container.elevation`, rounded by
  `view.container.shape`, its content clipped and inset. Above the bar instead when the room below — within
  `view.viewport-margin` of the window's edge and of the keyboard — is less than it needs and the room above is more;
  taller than the room left, it scrolls. It fades and grows in from the edge facing the bar over `motion.open-*` and fades
  out over `motion.close-*` (at once under Reduce Motion). Without suggestions or content no view is drawn and the search
  stays expanded. **The overlay is drawn above what the search's own container holds after it, not above every view of the
  window**: keep the search late in its container, or raise it with `zIndex`.
  On macOS the window's height is not read: the view opens below at its natural height. Focus stays in the input: the rows
  take no keyboard focus, and a press on one does not take focus away.
- **The full-screen view (SRC-9, SRC-11, SRC-23).** A modal overlay: `.fullScreenCover` on iOS with the system transition
  off (Tanrei fades it over `motion.open-*` and `motion.close-*`), as the dialog's; a sheet as large as the window on macOS.
  The view's color fills every edge; inside the safe area, the header — the back button (`arrow_back`, mirrored right to
  left), the input with the same value and the clear button (medium) — the divider across the window, then the suggestions
  and your content, scrolling. Focus moves to the header's input as it opens and back to the bar's input as it closes, when
  it starts to close. It counts as a Tanrei modal (a snackbar host waits). The slots are not drawn in the header.
- **Layout (SRC-1, SRC-2, SRC-16, SRC-28, SRC-29).** One row: the search glyph (or your leading icon button) at
  `container.padding-inline` (`-with-button`), the input taking the rest, the clear button (small) while there is a value,
  your trailing icon buttons; `container.gap` apart, `container.padding-inline-with-button` after a button at the end. At
  least `container.height`, growing to hold one line of the input under Dynamic Type. Suggestion rows reserve the icon
  column while any row has an icon; headline and supporting text wrap and grow the row; rows are at least the minimum
  target tall. Your content gets the headline color as its foreground and the body style, inset as the rows' content is.
  Right to left mirrors everything but the search glyph.
- **States (SRC-17 … SRC-22, SRC-26).** The bar is focused whenever its input has focus, however it got there, and shows it
  with its focused edge, inside its edge (a glow too under `focus-style: glow`) — no ring. It answers hover and a
  press on it (the pressed state held for `press-hold`, the ripple, the dim, per `pressed-feedback`); the active suggestion
  takes the focused tokens and the focus ring inside its row. Disabled: no focus, no editing, no view, no events, the clear
  button hidden, drawn from the disabled tokens. **`.disabled(true)` also reaches the icon buttons of the slots**
  (SwiftUI's environment), which the spec leaves in their own state.
- **Accessibility (SRC-24).** The input is a search field (the search-field trait) named by the label; the suggestions are
  buttons named by their headline, with the supporting text as their hint and their position ("2 of 3", English only) as
  their value, in a container named by the label; the full-screen view is a modal container named by the label. **SwiftUI
  has no combobox, listbox or dialog role.** Icons and the divider are hidden.
- **Reports (SRC-10, SRC-11, SRC-27).** An empty label, an empty `clearLabel` while the clear button shows, an empty
  `backLabel` while the back button is drawn, a suggestion whose value is empty or repeats another's, an empty headline and
  more than two trailing buttons are reported in debug builds; all still draw.
- **Not yet.** The selection highlight follows the caret's tint, not `comp.text-field.selection.color`.
- **Fixtures.** The test-only `.inPlace()` (`@_spi(Fixtures) import Tanrei`) draws the open view in place: docked under the
  bar in the flow at its natural height, full-screen filling the space it is given, presenting nothing. The baselines and
  the gallery's open fixture rows use it.

### Segmented button

Lets people choose one option, or several, from two to five related options drawn as the joined segments of one control
(specs/segmented-button.spec.json). The segments are views in the set's view builder, one `TanreiSegment` per item of the
kind `segment`, tagged by value as a `Picker`'s options are. SwiftUI's `Picker` with `.pickerStyle(.segmented)`
is not used: its segments cannot be tokenised.

```swift
@State private var range: String? = "week"
TanreiSegmentedButton("Range", selection: $range) {                      // Binding<V?>: a single choice (nil: none)
  TanreiSegment("Day").tag("day")
  TanreiSegment("Week").tag("week")
  TanreiSegment("Month").tag("month").disabled(!hasHistory)
}
@State private var days: Set<String> = ["mon"]
TanreiSegmentedButton("Days", selection: $days, size: .small) {          // Binding<Set<V>>: a multiple choice
  ForEach(weekdays) { TanreiSegment($0.short).tag($0.id) }
}
TanreiSegmentedButton("Text alignment", selection: $alignment) {
  TanreiSegment("Align left", icon: "format_align_left").tag(TextAlignment.leading).labelStyle(.iconOnly)
  TanreiSegment("Center", icon: "format_align_center").tag(TextAlignment.center).labelStyle(.iconOnly)
}
.fixedSize(horizontal: true, vertical: false)                            // its natural width instead of the width offered
```

| Spec | SwiftUI |
|---|---|
| `selection` | the binding's type: `Binding<V?>` is `single`, `Binding<Set<V>>` is `multiple` |
| `value` / `values` / `change` | `selection:` — the selected segment's tag (or `nil`), or the set of selected tags; activating a segment writes it |
| `size` | `size: TanreiSegmentedButtonSize` — `.small` `.medium` (default) `.large`, plus any size the design system adds |
| `label` | the first argument (`LocalizedStringKey` or `StringProtocol`) — the set's accessibility label |
| item `segment` | `TanreiSegment(_ title:, icon:)` in the view builder (`ForEach` works) |
| `value` (segment) | `.tag(_:)`, applied to the `TanreiSegment` itself |
| `label` (segment) / `icon` | the title (`StringProtocol`) / `icon:` — a `TanreiItemIcon`, as the list's: a glyph by name, or `.image(Image(…))` |
| `labelHidden` | `.labelStyle(.iconOnly)`, applied to the `TanreiSegment` itself |
| `disabled` | `.disabled(_:)` on a segment |

- **Selection (SEG-1, SEG-2, SEG-12).** Single: activating an enabled segment that is not selected — by pointer, touch,
  Enter or Space — writes its tag once; the selected one writes nothing (a single choice is never cleared by its own
  segment). Multiple: activating a segment inserts its tag, or removes it; the set may become empty. For each value the
  first segment with that tag is the one it selects. A value naming no segment, a segment without a tag, with an empty
  tag or sharing one, a hidden label without an icon, an empty label (the set's or a segment's) and fewer than two or
  more than five segments are reported in debug builds and still render. **Apply `.tag(_:)` and `.labelStyle(.iconOnly)`
  directly to the `TanreiSegment`**, before any other modifier: the segment reads them itself.
- **Keyboard (SEG-18, SEG-19).** The set is one Tab stop: single, the selected segment (or the first enabled one);
  multiple, the segment that had focus last, else the first selected one, else the first enabled one — never a disabled
  segment. Right / Down Arrow move to the next enabled segment and Left / Up Arrow to the previous one, wrapping (Left and
  Right mirrored right to left); Home and End to the ends. With a single choice every move also selects the segment it
  reaches; with a multiple choice Space or Enter switches it. The keys are tested as rules: the simulator gives no
  keyboard focus under automation.
- **Layout (SEG-6, SEG-13, SEG-14, SEG-17).** The set takes the width it is offered and divides it equally; each segment
  is at least as wide as the widest segment's content measured as if selected (so selecting one never changes a width)
  and at least the minimum target (`sys.target.touch` on iOS, `.pointer` on macOS: neighbours cannot reach over each
  other). `.fixedSize(horizontal: true, vertical: false)` keeps the natural width. Offered less, labels wrap and every
  segment grows to the tallest. The set is at least `container.height` tall, filled with `set.color`, its segments inset by
  `set.padding`, its outline drawn inside its edge over them; the dividers fill the gaps from the top padding to the bottom
  padding and keep their color beside a disabled, dimmed or selected segment. Each segment's hit area reaches the minimum
  target above and below the set.
- **Corners (SEG-13, SEG-11).** The end segments' outer corners are `set.shape − set.padding`, concentric with the set's;
  every other corner is the state's `container.shape`; a corner reaching half the height is a round cap. The shadow of an
  elevation and the focus ring take the largest of a segment's corners (the primitives have one radius).
- **Check and icons (SEG-15, SEG-16).** A selected segment whose label is drawn shows the filter chip's check before it,
  at `check.size`, in place of its icon; an icon-only segment keeps its icon (with the selected family and fill) and shows
  no check; where `check.size` is 0 (cupertino) none is drawn and no room is kept. The check draws in and the content
  re-centres over `motion.selection-*`; at once under Reduce Motion. An SF Symbol given as an image does not follow the
  selection.
- **Accessibility (SEG-20, SEG-22).** The set is a container named by `label` — **SwiftUI has no radio group role**. A
  single-choice segment is a button named by its title, drawn or not, with the selected trait while chosen and its
  position ("2 of 3", English only) as its value. A multiple-choice segment is a toggle (the toggle trait, iOS 17), on
  while chosen; it states no position, because a value of its own would replace the toggle's on / off. Icons, the check, the dividers and the outline are hidden.
- Press, hold, ripple, the focus ring (inside the segment, drawn above the set's outline), corner smoothing, the state
  motion (SEG-23) and a selected segment's elevation cast above its neighbours (SEG-24) are Button's (SEG-4 … SEG-11).
- **Fixtures.** The set at its natural width, start-aligned and vertically centred on a 400 × 96 stage; the SF Symbol a
  product would pass for each glyph (filled when selected, where the symbol has a filled form).

### Side sheet

Supplementary content or a secondary task in a panel at the trailing edge (specs/side-sheet.spec.json): beside the content
on a wide screen (`standard`, a layout region), over it on a compact one (`modal`, a modal overlay). A view for
the standard form, placed at the end of an `HStack`; a view modifier on the view it covers for the modal form.

```swift
@State private var showsFilters = true
HStack(spacing: 0) {
  ResultsList()
  TanreiSideSheet("Filters", isPresented: $showsFilters, closable: true, closeLabel: "Close filters") {
    FilterControls()
  } actions: {
    TanreiButton("Apply", variant: .text, action: apply)
    TanreiButton("Reset", variant: .text, action: reset)
  }
}

// Compact: a modal sheet over the results, opened from a button.
ResultsList()
  .tanreiSideSheet("Filters", isPresented: $showsFilters, closable: true, closeLabel: "Close filters",
                   onClose: { reason in log(reason) }) {
    FilterControls()
  }
```

| Spec | SwiftUI |
|---|---|
| `open` / `close` | `isPresented: Binding<Bool>` — the sheet writes `false` itself, then calls `onClose` with the reason |
| `close`'s reason | `onClose: ((TanreiSheetCloseReason) -> Void)?` — `.close` (either variant), `.scrim`, `.escape`, `.back`, `.drag` (modal only) |
| `variant` | `variant: TanreiSideSheetVariant` — `.standard` (the view's default), `.modal` (the modifier's default), or a value a design system adds |
| `headline` | the first, unlabelled argument |
| `closable` / `closeLabel` | `closable:` (default `false`) / `closeLabel:` |
| default slot / `actions` | the `content:` and `actions:` view builders |
| initial focus (SSH-3) | `initialFocus: AccessibilityFocusState<Bool>.Binding?`, or `.defaultFocus(_:_:)` in the content |

- **Standard (SSH-1).** Takes `container.width` at the end of its row while `isPresented` is `true` and none while it is
  `false`, sliding in and out at the trailing edge over `motion.enter-*` / `motion.exit-*` while the content beside it
  resizes (at once under Reduce Motion); closed, it is hidden from VoiceOver and the pointer at once. No scrim, no focus
  trap; Escape and drags do nothing. Place it at the trailing edge of the window's row: it is not clipped while it slides.
- **Modal (SSH-2, SSH-4, SSH-15).** Presented as `tanreiDialog` and the bottom sheet are: on iOS a `.fullScreenCover` on a
  clear background with the system transition off, which makes the rest of the app unreachable by touch, VoiceOver and the
  keyboard; **macOS has no full-screen cover**, so the sheet is drawn over the view the modifier is attached to (attach it
  to the window's root), which is disabled meanwhile. Tanrei draws the scrim (`scrim.color`) and the slide from the trailing
  edge; under Reduce Motion it fades in place. A tap on the scrim, Escape (with focus in the sheet), the iOS accessibility
  escape gesture (`.back`) and a drag toward the trailing edge past half its width, or flung that way (faster than 0.5
  points per millisecond; it follows the finger beyond 8 points) close it; a shorter drag slides back. A binding that
  declines the write keeps it open, and a released drag slides back. It carries the modal trait and counts as an open
  Tanrei modal: a dialog or menu opened from it stacks above it and has Escape first.
- **Geometry (SSH-7, SSH-8, SSH-14).** `container.width` beside the trailing inset — a modal sheet never wider than the
  window less `sys.target.touch`, so a strip of scrim stays —, the full height; its variant's `container.color` and
  `container.elevation`, its leading corners `container.shape` (eased by the corner smoothing) and its trailing corners
  square, edged at its leading side by `outline.width` of its variant's `outline.color`. Its color reaches under the
  trailing, top and bottom insets; what it holds stays inside them. Right to left it sits at the left edge, mirrored. The
  header (while there is a headline or a close button) is at least `header.height` and grows with a headline that wraps;
  the width never scales with the text.
- **Close button (SSH-5).** A standard, medium `TanreiIconButton` showing the close glyph (the icon font's, or a drawn
  cross), named by `closeLabel`; it closes either variant with `.close`. An empty `closeLabel` is reported in debug builds.
- **Content and actions (SSH-10, SSH-11).** The content is inset by `container.padding-inline`, handed `content.color` as
  its foreground style and the body text style, and scrolled between the header and the actions. The actions are laid out
  as given — a row from the leading edge, `actions.gap` apart, or a column when they do not fit — under a `divider.*`
  hairline across the sheet; the sheet never restyles them.
- **Accessibility (SSH-3, SSH-9, SSH-12).** The sheet is a container named by `headline` — SwiftUI has neither a dialog nor
  a complementary-region role — with the modal trait while modal; the headline is a header. **Focus:** when the sheet
  opens (a modal sheet also when it is presented with its view), VoiceOver moves to the control whose
  `@AccessibilityFocusState` you pass as `initialFocus`, or to the headline. SwiftUI cannot give keyboard focus to the
  container, nor name the element that had focus to give it back to: on iOS the modal cover hands VoiceOver back; a
  standard sheet lets focus go. An empty `headline` is reported in debug builds.
- **Fixtures.** `TanreiSideSheetSurface(inPlace:…)` (`@_spi(Fixtures) import Tanrei`) draws the sheet in place — a standard
  one at the end of a row, a modal one over its scrim —, open, at rest and not modal; the baselines draw it in a 720 × 480
  frame with no system insets. A close is reported to its `onClose` while it stays open.

### Slider

Lets people choose a value, or a range of values, from a continuous or stepped scale by dragging a handle along a track
(specs/slider.spec.json). SwiftUI's `Slider` is not used: its track and handle cannot take the tokens. The initialisers
follow it.

```swift
@State private var volume = 40.0
TanreiSlider("Volume", value: $volume)                                              // 0…100, continuous
TanreiSlider("Brightness", value: $level, in: 0...100, step: 10, showsStops: true)  // discrete, a dot per step
TanreiSlider("Balance", value: $balance, in: -50...50, origin: 0)                    // a centered slider
TanreiSlider("Volume", value: $volume, size: .large, valueIndicator: .active, valueText: "\(Int(volume)) %")
TanreiSlider("Volume", value: $volume, orientation: .vertical).frame(height: 240)
@State private var price = 100.0...400.0
TanreiSlider("Maximum price", startLabel: "Minimum price", value: $price, in: 0...500, step: 10,
             onCommit: { range in search(price: range) })                           // a range: two handles
```

| Spec | SwiftUI |
|---|---|
| `value` / `input` | `value:` — a `Binding<Double>`; every change the person makes writes it |
| `range` / `startValue` | the initialiser whose `value:` is a `Binding<ClosedRange<Double>>`: lower bound the start handle, upper bound the end handle |
| `min` / `max` | `in bounds: ClosedRange<Double>` (default `0...100`) |
| `step` | `step:` — 0 (default) is continuous; a negative step is 0 (reported) |
| `origin` | `origin: Double?` (default `nil`: min); not on the range initialiser |
| `stops` | `showsStops:` |
| `size` | `size: TanreiSliderSize` — `.small` (default) `.medium` `.large`, plus any size the design system adds |
| `orientation` | `orientation: TanreiSliderOrientation` — `.horizontal` (default) `.vertical`; `init(named:)` for data |
| `valueIndicator` | `valueIndicator: TanreiSliderValueIndicator` — `.none` (default) `.active` `.always`; `init(named:)` for data |
| `label` / `startLabel` | the first argument / `startLabel:` (`StringProtocol` or `LocalizedStringKey`) — never drawn |
| `valueText` / `startValueText` | `valueText:` / `startValueText:` — empty reads the number |
| `change` | `onCommit:` — `(Double) -> Void`, or `(ClosedRange<Double>) -> Void` for a range, after the input it follows |
| `disabled` | `.disabled(_:)` |

- **Values (SLD-1, SLD-5, SLD-22).** The binding is drawn and exposed clamped to `bounds` and, with a step, snapped to the
  nearest step (`bounds.lowerBound` plus whole multiples of `step`, never past the upper bound); a range's handles stop at
  each other. Out-of-range values, a start past the end, a negative step and `bounds` whose bounds are equal (no input;
  the handles at the track's start) are reported in debug builds and still render. A `ClosedRange` cannot hold a max below
  its min, nor a start past its end: those cases of SLD-22 cannot be written in SwiftUI.
- **Input and change (SLD-2, SLD-16).** Every change the person makes writes the binding (the spec's `input`); `onCommit`
  follows once the change is finished — when a press ends with other values than it began with, and after each key press
  or assistive-technology adjustment that changed them. A value the product sets writes nothing, calls nothing and moves
  the handle over the value motion; a drag follows the press without it.
- **The press (SLD-2, SLD-7, SLD-13).** The whole slider is the hit area, reaching `sys.target` across its axis
  (`target.touch` on iOS, `.pointer` on macOS). SwiftUI does not tell a touch from a pointer, so **iOS presses are
  touches** (an iPad pointer too) and **macOS presses are a pointer's**: a pointer moves the nearer handle to the value
  under it at once and a drag follows; a touch shows the pressed handle as it lands, moves it when it lifts without moving
  (a tap), and drags it once it has travelled the platform's slop along the track. From iOS 18 that drag is UIKit's pan,
  which a touch that travels across the track first fails, so an enclosing scroll view scrolls and the slider changes
  nothing; before iOS 18 it is a SwiftUI drag past an 8-point slop, which a scroll view may not get past.
- **Keyboard (SLD-3).** Each handle is its own focus stop, focusable as the platform's controls are (with Full Keyboard
  Access on iOS, keyboard navigation on macOS). Right / Up Arrow increase by one keyboard step and Left / Down Arrow
  decrease (Right and Left swapped right to left), Page Up / Page Down by ten, Home / End to the handle's lowest and
  highest value; the keyboard step is `step`, or a hundredth of the range while it is 0. A key that changes nothing emits
  nothing. The keys are tested as rules: the simulator gives no keyboard focus under automation.
- **Accessibility (SLD-4, SLD-18, SLD-19, SLD-20).** Each handle is an adjustable element (`.accessibilityAdjustableAction`:
  a VoiceOver swipe up or down moves one keyboard step, then `onCommit`) named by `label` (a range's start handle by
  `startLabel`), whose value is its value text: `valueText`, or the number in the environment's locale with as many fraction
  digits as the keyboard step, at most two. A range's start handle is read first. The tracks, the dots, the state layer
  and the value indicator are hidden. **SwiftUI cannot expose a custom element's lowest and highest value nor its
  orientation**. An empty `label` or `startLabel` is reported in debug builds.
- **Drawing (SLD-6 … SLD-10, SLD-21).** The track is inset by half the state layer from each end; a handle's center
  travels between the points half the track's thickness in from its ends. The active track runs from `origin` (or min) to
  the value, or between a range's handles. Beside a handle a piece of the track stops `handle.width / 2 + track.gap` from
  its center, rounded when there is a gap and square when the track runs up to the handle, as the web's. Stop dots at the ends of the travel that lie on the track, and at every step with
  `showsStops`, in the color of the piece they lie on and clipped to it. A vertical slider runs from the bottom up in every
  layout direction; a horizontal one mirrors right to left.
- **Value indicator (SLD-17).** Above a horizontal slider's handle, at a vertical one's inline start, `value-indicator.offset`
  beyond the handle's edge; shifted along the axis to stay inside **the slider** (so inside the window as long as the
  slider is). A read overlay drawn over what lies above the slider, taking no focus and no
  input and hidden from assistive technology; it fades over the state motion, and its text grows with Dynamic Type — the
  slider itself does not.
- Press, hold, ripple (from the pressed handle's center), the focus ring around the focused handle, the state motion and
  corner smoothing are Button's (SLD-11 … SLD-15). A handle and its state layer take the handle's own state; the tracks,
  the dots and the opacity the highest state of either handle.
- **Fixtures.** A horizontal slider 320 long centered in a 320 × 96 stage, the vertical one 240 tall in 96 × 240 (SLD-7).

### Switch

One setting, on or off, with an immediate effect (specs/switch.spec.json). Drawn by Tanrei rather than by a
`Toggle` style: the label follows the track, at its inline end, as the spec says (a row that wants the label first is
a list item's layout).

```swift
@State private var wifi = true
TanreiSwitch("Wi-Fi", isOn: $wifi)
TanreiSwitch("Wi-Fi", isOn: $wifi, selectedIcon: "check", unselectedIcon: "close")      // glyphs of the icon font
TanreiSwitch("Wi-Fi", isOn: $wifi) { Image(systemName: "checkmark").imageScale(.small) } unselectedIcon: { EmptyView() }
TanreiSwitch("Wi-Fi", isOn: $wifi).labelsHidden()
```

| Spec | SwiftUI |
|---|---|
| `selected` | `isOn: Binding<Bool>` |
| `disabled` | `.disabled(_:)` |
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`) |
| `labelHidden` | `.labelsHidden()` (read from iOS 18 / macOS 15) |
| `selectedIcon` / `unselectedIcon` | `selectedIcon:` / `unselectedIcon:` — glyph names (`""` shows none), or view builders (`EmptyView()` shows none) |
| `change` | the `isOn` binding: activation flips it |

- **Drawing (SWT-10 … SWT-13).** A `track.width` × `track.height` track (`track.shape`), its outline inside its edge
  and its fill inside the outline; the handle's center half the track height from the start while off and from the
  end while on (mirrored right to left); the round `container.size` state layer centered on the handle, moving with
  it and reaching beyond the track without affecting layout. With an icon the handle is at least
  `handle.size-with-icon`, and the glyph (`icon.size`) takes the family and fill of the condition. A change of
  condition moves the handle, its size and every color over `motion.selection-*`; at once under Reduce Motion.
- **Corners (SWT-9).** A pill track (a corner that reaches half its height) is the same pill at every
  `corner-smoothing` amount; a track with a smaller corner takes the OS's continuous curve above 0.
- **Accessibility (SWT-14).** A switch (the toggle trait), on while selected (the selected trait); the icons are
  hidden. SF Symbols fill their size where the icon font's glyphs keep a margin: pass `.imageScale(.small)` for a
  handle.
- Label, `.labelsHidden()`, activation keys (Space; not Enter), press, hold, ripple (a press away from the handle grows
  it from the handle's center), focus ring (around the track) and the minimum target (the whole track and the label)
  are the checkbox's (SWT-1 … SWT-8, SWT-15, SWT-16).

### Text field

A single- or multi-line field for text the user types (specs/text-field.spec.json). The typing happens in SwiftUI's
own `TextField` / `SecureField`, so IME, autofill, selection and the clipboard are the platform's; Tanrei draws the
container, the edge, the floating label, the affixes, the icons and the supporting row around it.

```swift
@State private var email = ""
TanreiTextField("Email", text: $email, type: .email, textContentType: "email")
TanreiTextField("Email", text: $email, variant: .filled, supportingText: "We only use it to sign you in.")
TanreiTextField("Email", text: $email, errorText: "Enter a complete email address.", error: !isValid)
TanreiTextField("Amount", text: $amount, type: .number, prefix: "$", suffix: "USD")
TanreiTextField("Display name", text: $name, maxLength: 40, counter: true, onCommit: save)
TanreiTextField("Message", text: $message, axis: .vertical, lineLimit: 3...8)
TanreiTextField("Search", text: $query, prompt: Text("Search components"), type: .search, onSubmit: search) {
  Image(systemName: "magnifyingglass")
} trailingIcon: {
  TanreiIconButton("Clear", action: { query = "" }) { Image(systemName: "xmark") }
}
.labelsHidden()
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiTextFieldVariant` — `.filled` `.outlined` (default), plus any variant the design system adds |
| `size` | `size: TanreiTextFieldSize` — `.medium` (default, 36) `.large` (40), plus any size the design system adds |
| `type` | `type: TanreiTextFieldType` — `.text` `.email` `.password` `.number` `.search` `.tel` `.url`; `TanreiTextFieldType(named:)` reads a spec name |
| `value` | `text: Binding<String>` |
| `label` | the first argument: drawn, and the accessible name |
| `labelHidden` | `.labelsHidden()` (read from iOS 18 / macOS 15) |
| `placeholder` | `prompt: Text?` |
| `supportingText` / `errorText` / `error` | `supportingText:` / `errorText:` / `error:` |
| `disabled` | `.disabled(_:)` |
| `readOnly` / `required` | `readOnly:` / `required:` |
| `multiline`, `minRows`, `maxRows` | `axis: .vertical`, `lineLimit: minRows...maxRows` (`Int.max` for no limit; default `2...Int.max`) |
| `maxLength` / `counter` | `maxLength:` (0: none) / `counter:` |
| `prefixText` / `suffixText` | `prefix:` / `suffix:` |
| `autocomplete` | `textContentType:` — an HTML autofill name (`"email"`, `"current-password"`, `"one-time-code"` …), mapped to `UITextContentType` (iOS) or `NSTextContentType` (macOS) |
| `input` | the `text` binding: every edit writes it |
| `change` | `onCommit:` — focus left, or the action key, with a changed value |
| `action` | `onSubmit:` — the action key of a single-line field, after `onCommit` |
| slots | `leadingIcon:` / `trailingIcon:` view builders |

- **Label and edge (TXF-6, TXF-7, TXF-13, TXF-14).** The label rests in the input line and floats (onto the outline's
  top edge, which opens a gap around it, or to the top of a filled field) while focused or filled, over
  `motion.label-*`. Focus — by keyboard, pointer or touch — thickens and recolors the outline or the active indicator:
  that is the focus indicator; no ring is drawn (a glow is, under `focus-style: glow`). A press anywhere on the field
  focuses the input, and the field is hit-tested at the minimum target vertically.
- **Actions.** Pass the action to `onSubmit:`: an enclosing `.onSubmit` modifier also fires, but SwiftUI runs it
  **before** the field commits, so before `onCommit` (TXF-3 wants the change first).
- **Slots (TXF-22).** Icons are drawn at the size's `icon.size`, unselected, in their part's color. An icon button you
  put in the trailing slot keeps its own tokens and is its own focus stop. The field builds in no clear or reveal
  button. An `if` with no match in a slot (or `EmptyView()`) is no icon.
- **Limits (TXF-18).** `maxLength` counts user-perceived characters; an edit is refused once the value is full, and
  a longer edit (a paste) is shortened to fit. A value you set is never shortened.
- **Accessibility (TXF-11, TXF-15, TXF-19, TXF-23).** The input is the element, named by the label (never by the
  prompt). The shown affixes, supporting or error text and count are its hint (the description). SwiftUI has no
  invalid, required or read-only state for a field: `error`, `required` and `readOnly` are drawn or enforced, not
  announced. An error set while the field has focus, and the count once
  typing pauses for a second, are announced.
- **Not yet.** SwiftUI gives no signal while an input method composes text, so `maxLength` applies to the
  composition too; the selection highlight follows the caret's tint, not
  `selection.color`; a read-only field draws its value as selectable text.
- **Snapshots.** `ImageRenderer` cannot draw the platform's text element, so baselines draw the input's text as text
  in the same style (the internal `\.tanreiStaticTextInput`); hosted tests type into the real field.

### Time picker

Lets a person choose a time of day, in hours and minutes, on a clock dial or by typing it, in a dialog
(specs/time-picker.spec.json). A view modifier, as `.sheet` is; the time is `DateComponents` with an hour (0 to 23) and a
minute, and nothing else.

```swift
@State private var picksTime = false
@State private var alarm: DateComponents? = DateComponents(hour: 7, minute: 30)

TanreiButton("Set alarm") { picksTime = true }
  .tanreiTimePicker(isPresented: $picksTime, selection: $alarm)                       // the locale's clock, on the dial
  .tanreiTimePicker(isPresented: $picksTime, selection: $alarm, hourCycle: .h23, entryMode: .text,
                    labels: TanreiTimePickerLabels(label: "Wake up at")) { reason in log(reason) }
```

| Spec | SwiftUI |
|---|---|
| `open` | `isPresented: Binding<Bool>` — the picker writes `false` to it itself when it closes |
| `value` / `change` | `selection: Binding<DateComponents?>` — OK writes it; `nil` is empty |
| `hourCycle` / `entryMode` / `unit` / `layout` | `TanreiTimePickerHourCycle` (`.locale` `.h12` `.h23`), `TanreiTimePickerEntryMode` (`.dial` `.text`), `TanreiTimePickerUnit` (`.hour` `.minute`), `TanreiTimePickerLayout` (`.auto` `.vertical` `.horizontal`) — closed enums; `init(named:)` reads a spec value from data and makes any other name the default, reported in debug builds (TMP-29) |
| `locale` | `locale: Locale?` — `nil` (default) takes the `\.locale` environment |
| `label`, `hourLabel`, `minuteLabel`, `confirmLabel`, `cancelLabel`, `textEntryLabel`, `dialEntryLabel`, `invalidText` | fields of `labels: TanreiTimePickerLabels`, English defaults |
| `close` | `onClose: (TanreiTimePickerCloseReason) -> Void` — `.escape` `.back` `.outside` `.cancel` `.confirm`, called once, after `selection` is written |

- **Presentation (TMP-1, TMP-3, TMP-25).** As the dialog: on iOS a `.fullScreenCover` on a clear presentation background
  with the system transition off — Tanrei draws the scrim over the whole window and the motion (the scrim and the container
  fade in over `motion.open-*` while the container grows from `motion.enter-scale`; both fade out over `motion.close-*`;
  under Reduce Motion it fades without growing). The cover keeps the rest of the app unreachable and keyboard focus in.
  **macOS has no full-screen cover**: the picker is drawn over the view the modifier is attached to — attach it to the
  window's root — and that view is disabled meanwhile. It counts as a Tanrei modal (a snackbar host holds its next one).
  Centred in the safe area, `container.margin` from every edge and from the keyboard, on `container.color` at
  `container.elevation` with `container.shape` corners eased by the corner smoothing. The view it is attached to gets
  keyboard focus back when it closes, if it had it; iOS returns VoiceOver focus itself.
- **Pending time (TMP-4, TMP-5).** The picker holds a pending time from `selection` (or, while it is `nil`, the device's time
  when it opens); a `selection` written while it is open does not change it. OK writes it when it differs from `selection`
  as it is then (one written while the picker was open included), or when there is none, then calls
  `onClose(.confirm)`; Escape (`.escape`), the accessibility escape gesture (`.back`), the scrim (`.outside`) and Cancel
  (`.cancel`) commit nothing. The picker writes `false` to `isPresented` itself.
- **Clock and locale (TMP-6, TMP-9, TMP-10, TMP-27).** Everything comes from Foundation for the locale: the period names
  (`amSymbol`, `pmSymbol`), the digits (`NumberFormatter`), the separator (the pattern of the `Hm` template), where the period
  goes (before the hour where the `hm` pattern writes it first, as ja, zh and ko do) and the preferred clock (the `j`
  template). With `hourCycle: .locale` the person's 12/24-hour setting wins: Foundation's current locale carries it, so it is
  read for a picker on the current locale, and for another locale only where it differs from the current locale's default.
- **Layout (TMP-7, TMP-8).** Vertical: the label, the time display and the dial, the actions row below; horizontal: the dial
  beside them. `.auto` chooses horizontal only when vertical does not fit the window's height and horizontal fits its width
  (`ViewThatFits`). Vertical keeps the label and the actions in place and scrolls what lies between them; when they alone
  leave no room for a row of selectors, everything scrolls; horizontal scrolls as one. Text entry is always the vertical
  arrangement. The selectors, the segments and the dial's numbers grow with Dynamic Type.
- **The time display (TMP-9 … TMP-11, TMP-16 … TMP-22, TMP-26).** Each selector is a `Button` the picker draws from
  `conditions[condition][state:]` — selected while the dial shows its unit — at least `selector.container.*` and the target;
  it is an adjustable element (`accessibilityAdjustableAction`, the button trait removed) named `hourLabel` / `minuteLabel`
  whose value is its text, the period added to the hour ("7 AM"). Up and Right, Down and Left, Page Up and Down (minutes),
  Home and End (`onKeyPress`) change it; a press or keyboard focus shows its unit on the dial. The period is two buttons, the
  chosen one selected (**SwiftUI has no radio role**: the selected trait stands in for checked), one tab stop, Left and Right
  choosing the other. Press, hold, pressed feedback, ripple, the keyboard focus ring and corner smoothing are Button's.
  Hour, separator and minute stay left to right in a right-to-left layout; the period's place mirrors.
- **The dial (TMP-12 … TMP-15).** Drawn from `dial.*` and never mirrored; a `DragGesture` sets the value under the finger
  without animation and, let go on the hours, moves on to the minutes (and keyboard focus with it). The handle travels the
  shorter arc and the numbers cross-fade over `motion.dial-*`, at once under Reduce Motion. Hidden from VoiceOver: the
  selectors do everything it does.
- **Text entry (TMP-22 … TMP-24).** Two `TanreiTextField`s (outlined, large, number, `maxLength` 2) named `hourLabel` and
  `minuteLabel`; a field's text that is not a number of its unit is an error when committed, OK disabled meanwhile; the
  action key moves from hour to minute and then activates OK. Beside them the period is drawn as tall as their containers,
  its hit area reaching the target above and below. The entry-mode toggle is a standard medium `TanreiIconButton` whose
  `keyboard` / `schedule` glyph is the icon font's, or a drawn vector without the font; Cancel and OK are text-variant
  `TanreiButton`s.
- **Not yet.** Keyboard focus moves in when the picker opens (TMP-2), but VoiceOver focus is left where iOS puts it; the keys and VoiceOver are tested as rules and in the gallery, not yet on a device.
- **Fixtures.** `TanreiTimePickerSurface` (`@_spi(Fixtures) import Tanrei`) draws the scrim and the surface in place, open
  and not modal; the baselines draw it on a 480 × 640 stage (720 × 480 for `horizontal`), the fields unfocused.

### List

A column of related items that people read, open one by one, or choose from (specs/list.spec.json). Its rows are one
item kind, `TanreiListItem`, in the list's view builder; the list's `selection` is the type of its binding,
as with SwiftUI's `List(selection:)`. The rows are not `List` rows: `List`'s own row chrome and separators cannot be
tokenised.

```swift
TanreiList {                                                              // selection none
  TanreiListItem("Wi-Fi", supportingText: "Connected", leadingIcon: "wifi", trailingIcon: "chevron_right", divider: true, action: openWifi)
  TanreiListItem("Airplane mode", trailing: { TanreiSwitch("Airplane mode", isOn: $airplane).labelsHidden() })
  TanreiListItem("Ada Lovelace", supportingText: "Edited the roadmap", leadingMedia: .avatar) { Image("ada").resizable().scaledToFill() }
}
TanreiList(selection: $theme, label: "Theme") {                           // single: Binding<String?>
  TanreiListItem("Light").tag("light")
  TanreiListItem("Dark").tag("dark")
}
TanreiList(selection: $labels, label: "Labels") {                         // multiple: Binding<Set<String>>
  ForEach(labels) { TanreiListItem($0.name, leadingIcon: .image(Image(systemName: "tag"))).tag($0.id) }
}
```

| Spec | SwiftUI |
|---|---|
| `selection` | the initializer: none without a binding, single with `selection: Binding<V?>`, multiple with `selection: Binding<Set<V>>` |
| `label` | `label: LocalizedStringKey` — the list's accessible name; required with a binding |
| `value` / `values` | the binding's content; `change` is a write to it |
| item `list-item` | `TanreiListItem` in the view builder (`ForEach` works) |
| `headline` | the first argument (`StringProtocol`) — the name, and what typeahead matches |
| `overline` / `supportingText` / `trailingText` | `overline:` / `supportingText:` / `trailingText:` |
| `supportingMaxLines` | `supportingLineLimit: Int?` — `nil` or 0 shows all of it |
| `leadingIcon` / `trailingIcon` | `leadingIcon:` / `trailingIcon:` — a `TanreiItemIcon`: a glyph of the icon font by name (a string literal), or `.image(Image(…))` |
| `leadingMedia` | `leadingMedia: TanreiListLeadingMedia` — `.none` (default) `.avatar` `.image`; `TanreiListLeadingMedia(named:)` reads a spec name |
| `interactive` / `click` | the initializers with `action:`, as `Button` |
| `value` (item) | `.tag(_:)`, applied to the `TanreiListItem` itself |
| `disabled` / `divider` | `.disabled(_:)` / `divider: Bool` |
| slots `leading` / `trailing` | `leading:` / `trailing:` view builders (`trailing:` only on a static item) |

- **Three kinds of row (LST-11, LST-12).** In a list with a binding every item is an option (a button with the selected
  trait while chosen). Otherwise `action:` makes an item one button, and an item without it is static: not focusable,
  no state, `disabled` ignored, and a control in `trailing:` keeps its own tokens, semantics and focus stop.
- **Selection (LST-13, LST-14, LST-26).** Activating an option writes the binding: single sets it unless the option is
  already chosen (a single choice is never cleared by its own option), multiple adds or removes the tag. **Apply
  `.tag(_:)` directly to the `TanreiListItem`**, before any other modifier: the item reads its own tag, SwiftUI's `tag`
  on another view does not reach it. An option without a tag, a tag two options share, and a selection naming no option
  are reported in debug builds.
- **Layout (LST-16 … LST-18).** One row: start padding, leading icon or media, the text column, the trailing text, icon,
  control and — in an option — the check's box, `container.gap` apart, then the end padding; mirrored right to left. At
  least `container.height.one-line` / `two-line` / `three-line` tall by the lines of text beyond the headline (counted as
  laid out), and at least the minimum target for an action or an option (`sys.target.touch` on iOS, `.pointer` on
  macOS); it grows with its content and with Dynamic Type. Leading and trailing elements are centered in one or two lines
  and top-aligned in three. The headline, overline and trailing text wrap; `supportingLineLimit` cuts the supporting
  text with an ellipsis, and the full text is still the description.
- **Media, mark and divider (LST-19 … LST-22).** An avatar is fitted into a round `avatar.size` box, an image into a
  `image.size` square with `image.shape` corners, each on `media.container.color` with `media.content.color` as the
  content's foreground and a monogram in the headline's style. A selected option strokes the checkbox's check in its
  box, drawn along its path over the state motion. `divider: true` draws a hairline along the row's bottom from the text
  column's start to the end edge, at full opacity even under a disabled item.
- **Accessibility (LST-12, LST-23).** An action or an option is one button named by its headline, with the overline,
  supporting and trailing text as its hint and its position ("2 of 3", in English only)
  as its value; a static item's headline is its element, described the same way. Icons, media, the mark and the divider
  are hidden (media always: SwiftUI cannot tell whether the product named it). The list is a
  container named by `label`: **SwiftUI has no list or listbox role** and no multi-selectable property.
- **Keyboard (LST-15).** A list with actions or options is one tab stop — the item focused last, else the first
  selected option, else the first enabled item; Up and Down Arrow move without wrapping, Home and End to the ends,
  typing to the next headline that begins with what was typed (within a second); Space and Enter activate; moving
  focus never selects. **SwiftUI never gives keyboard focus to a disabled button, so the arrow keys pass over a
  disabled item** instead of reaching it (LST-2). The rules are tested as rules and
  through the list's model; the simulator gives no keyboard focus under automation.
- **Put nothing interactive in an action or an option (LST-24).** The whole row is one button: VoiceOver could not
  reach a control inside it, and SwiftUI cannot look inside a slot to report one. A row that needs its own control stays
  static and holds it in `trailing:`.
- The list draws nothing, adds no space around its rows and neither scrolls nor virtualizes: put it in your own
  `ScrollView` (or build the rows in a `LazyVStack` yourself). Press, hold, ripple, focus ring (drawn inside the row, so
  a scroll view cannot clip it), corner smoothing and the state motion are Button's (LST-3 … LST-10, LST-25).

### Menu

A short set of actions or choices on a temporary surface that opens from the element that asked for it
(specs/menu.spec.json). A modifier on the anchor — your own button, icon button or field — as `.popover`; the items are
views in its view builder, one per item kind. SwiftUI's own `Menu` is not used: its items cannot be tokenised.

```swift
@State private var showsMenu = false
TanreiIconButton("More", action: { showsMenu = true }) { Image(systemName: "ellipsis") }
  .tanreiMenu(isPresented: $showsMenu, placement: .bottomEnd) {
    TanreiMenuItem("Cut", leadingIcon: "content_cut", trailingText: "⌘X", action: cut)
    TanreiMenuItem("Share link", supportingText: "Anyone with the link can view", action: share)
    TanreiMenuItem("Delete", role: .destructive, action: delete)
    TanreiMenuSection("View") {
      TanreiMenuToggle("Show grid", isOn: $showsGrid)
    }
    TanreiMenuSection("Sort by", selection: $sort) {                     // Binding<Sort?>
      TanreiMenuOption("Name").tag(Sort.name)
      TanreiMenuOption("Date").tag(Sort.date)
    }
  }
```

| Spec | SwiftUI |
|---|---|
| `open` / `close` | `isPresented: Binding<Bool>` — the menu closes itself by writing `false` |
| `placement` | `placement: TanreiMenuPlacement` — `.bottomStart` (default) `.bottomEnd` `.topStart` `.topEnd`; `TanreiMenuPlacement(named:)` reads a spec name |
| item `item` / `click` | `TanreiMenuItem(_:role:…action:)`, as `Button(role:)`; `role: .destructive` is `destructive` |
| item `checkbox-item` / `change` | `TanreiMenuToggle(_:isOn:…)`, as `Toggle`; writing `isOn` is `change` |
| item `radio-item` / `value` | `TanreiMenuOption(_:…).tag(_:)` in a section with a selection, as a `Picker`'s options |
| item `group` (`title`, `value`, `change`) | `TanreiMenuSection(_:content:)` / `TanreiMenuSection(_:selection:content:)`, as `Section` and an inline `Picker` |
| `label` / `supportingText` / `leadingIcon` / `trailingIcon` / `trailingText` | the title, `supportingText:`, `leadingIcon:` / `trailingIcon:` (a `TanreiItemIcon`, as the list's), `trailingText:` |
| `disabled` | `.disabled(_:)` on an item or a section |

- **Presentation (MNU-1, MNU-2, MNU-4, MNU-25).** A popover that stays a popover on iPhone
  (`presentationCompactAdaptation(.popover)`), attached to the anchor's bottom or top edge at its start or end (mirrored
  right to left) with its edge facing the anchor, and drawn on a clear presentation background: the surface is Tanrei's.
  The menu opens on the side `placement` names unless that side has less room than the menu needs (after
  `surface.offset`, within `surface.viewport-margin` of the window's edge) and the other side has more — then it flips;
  the popover shifts itself, keeps its own distance and follows the anchor, the start or end alignment is the
  popover's, and on iOS 26 the popover clips the surface to its own larger corners and draws its own shadow. The surface
  fades and grows in from the edge facing the anchor over `motion.open-*` (at once under Reduce Motion); closing is the
  popover's own motion. A menu taller than the room left scrolls. The menu draws no scrim; **a press outside closes it
  and does not reach what is under it** (a popover's rule).
- **Closing (MNU-5, MNU-6).** The menu writes `isPresented = false` after an action; after a toggle or an option chosen
  by pointer, touch or Enter (Space leaves it open — a checked option too); on Escape and Tab, and on a press outside.
  The reason (`escape`, `tab`, `outside`, `item` …) is not exposed: the binding is the close event.
- **Focus (MNU-1, MNU-7, MNU-8, MNU-11).** When the menu opens, focus moves to the first enabled item; when it closes
  with focus inside, focus returns to the anchor (Tab closes the menu there: SwiftUI cannot move focus on past the anchor).
  Down and Up Arrow wrap, Home and End go to the ends, typing goes to the next label that begins with it; the keys
  continue from the item the pointer entered last, and no ring shows while the pointer leads — SwiftUI's own focus stays
  where it was (moving it as a press begins left the button pressed), so Space and Enter act on the focused item. **SwiftUI never gives keyboard focus to a disabled button**, so the keys pass over a
  disabled item.
- **Layout (MNU-3, MNU-19 … MNU-23, MNU-28).** The surface is as wide as its widest item between `surface.min-width` and
  `surface.max-width`, padded by `surface.padding-*`, in `surface.color` at `surface.elevation`, rounded by
  `surface.shape` (eased by the corner smoothing) and clipping its items. Each row reserves the mark column while any
  item is a toggle or an option, and the leading icon column while any item has one, so labels align; every column is
  centered on the label's first line. A divider runs between a section and what is next to it, inside the surface's
  padding, `divider.space` above and below; a section's title starts where the labels start.
- **Accessibility (MNU-24).** Each item is a button named by its label, with its supporting and trailing text as its hint
  and its position ("2 of 3", English only) as its value; a toggle is a toggle, on or off (its value, so it states no
  position), an option is selected while checked; a section is a container named by its title. **SwiftUI has no menu, menu item or separator role**, no
  keyboard-shortcut property for the trailing text, and no "opens a menu" or expanded state for the anchor.
- **Content as data (MNU-29).** The menu reads its items from their own views: each item's title, icons, texts, action
  or binding and whether it is enabled (so `.disabled(_:)` on an item or a section is seen), and each section's items and
  title; it then draws every row itself, which is how every row knows the columns of the whole menu on the first layout
  pass. The items draw nothing outside a menu. Apply `.tag(_:)` directly to a `TanreiMenuOption`. A radio item outside a
  section with a selection, a selection naming none of its options, two options sharing a value and a section inside
  another are reported in debug builds; a nested section is drawn as the outer one's items.
- **Fixtures.** The test-only `TanreiMenu(inPlace:)` (`@_spi(Fixtures) import Tanrei`) draws the open menu in place, at
  its natural size, with its elevation and without an anchor, placement or open motion; the baselines and the gallery's
  fixture rows use it.
- Press, hold, ripple, focus ring (inside the row, which the surface would otherwise clip), corner smoothing, the state
  motion and the minimum target (rows at least `sys.target.touch` tall on iOS, `.pointer` on macOS) are Button's
  (MNU-10 … MNU-17, MNU-27).

### Tabs

Switches between views of the same subject with a row of labelled tabs, one of them selected, above the view it shows
(specs/tabs.spec.json). The tabs are views in the row's view builder, one `TanreiTab` per item of the kind `tab`,
tagged by value as `TabView`'s tabs are; each carries its panel. SwiftUI's `TabView` is an app's tab bar (a
navigation bar), not this component.

```swift
@State private var tab = "overview"
TanreiTabs(selection: $tab, label: "Project") {                          // Binding<V>, or Binding<V?> (nil: the first enabled tab)
  TanreiTab("Overview", icon: "dashboard") { OverviewPanel() }.tag("overview")
  TanreiTab("Activity", icon: "history") { ActivityPanel() }.tag("activity")
  TanreiTab("Settings", icon: "settings") { SettingsPanel() }.tag("settings").disabled(!canEdit)
}
TanreiTabs(selection: $section, variant: .secondary, scrollable: true) {
  ForEach(sections) { TanreiTab($0.name).tag($0.id) }                     // no panels: show the view yourself
}
```

| Spec | SwiftUI |
|---|---|
| `selected` / `change` | `selection: Binding<V>` (or `Binding<V?>`) — the selected tab's tag; activating another tab writes it |
| `variant` | `variant: TanreiTabsVariant` — `.primary` (default) `.secondary`, plus any variant the design system adds |
| `scrollable` | `scrollable: Bool` |
| `label` | `label: LocalizedStringKey` — the row's accessibility label |
| item `tab` | `TanreiTab(_ title:, icon:) { panel }` in the view builder (`ForEach` works) |
| `value` | `.tag(_:)`, applied to the `TanreiTab` itself |
| `label` (tab) / `icon` | the title (`StringProtocol`) / `icon:` — a `TanreiItemIcon`, as the list's: a glyph by name, or `.image(Image(…))` |
| `labelHidden` | `.labelStyle(.iconOnly)`, applied to the `TanreiTab` itself |
| `disabled` | `.disabled(_:)` on a tab |

- **Selection (TAB-1, TAB-11).** Activating an enabled tab that is not selected — by pointer, touch, Enter or Space —
  writes its tag to the binding once; the selected tab writes nothing. A `nil` selection selects the first enabled tab; a
  selection naming no tab selects none and shows no panel. **Apply `.tag(_:)` and `.labelStyle(.iconOnly)` directly to
  the `TanreiTab`**, before any other modifier: the tab reads them itself (SwiftUI's own `tag` and label style do not
  reach it). A tab without a tag, a tag two tabs share, a selection naming no tab and a hidden label without an icon are
  reported in debug builds.
- **Keyboard (TAB-12).** The row is one tab stop, the selected tab (the first enabled one when that is disabled). Right
  and Left Arrow move to the next and previous enabled tab, wrapping, mirrored right to left; Home and End to the ends;
  every move selects the tab it reaches (automatic activation). Tab moves on into the panel. The keys are tested as rules:
  the simulator gives no keyboard focus under automation.
- **Layout (TAB-14, TAB-16, TAB-18).** Fixed (`scrollable: false`) divides the width it is offered equally, each tab at
  least the minimum target (`sys.target.touch` on iOS, `.pointer` on macOS; a tab touches its neighbours and the panel,
  so the tab itself grows instead of its hit area); a label that does not fit wraps and grows every tab to the tallest.
  Scrollable sizes each tab to its label on one line plus `container.padding-inline` on each side, in a horizontal
  `ScrollView` that starts at its start edge. A tab is at least `container.height` tall, a primary tab with its icon
  stacked above its label `container.height-with-icon`; a secondary tab places the icon before the label, beside its
  first line. The content keeps clear of the indicator: it is inset above and below by the variant's resting indicator
  thickness.
- **Indicator and divider (TAB-16, TAB-17, TAB-20).** The selected tab's indicator sits on the row's bottom edge —
  primary's under the tab's content (its label, or its icon when wider or alone), secondary's under the whole tab — its
  top corners rounded by the variant's `active-indicator.shape`. It slides and resizes to the newly selected tab over
  `motion.indicator-*` (`matchedGeometryEffect`), at once under Reduce Motion; the panel changes at once. The divider
  runs under the tabs along the whole row, also while it scrolls, and is hidden from VoiceOver.
- **Scrolling into view (TAB-15).** A scrollable row scrolls a tab that becomes selected or takes keyboard focus until it
  is wholly visible, over the indicator's motion; when the row first appears, at once.
- **Accessibility (TAB-13, TAB-19, TAB-22).** Each tab is a button named by its title, drawn or not, with the selected
  trait while selected; the row is a container named by `label` with the tab bar trait — **SwiftUI has no tab list, tab
  or tab panel role**. On iOS VoiceOver states each tab's position from the tab bar trait; elsewhere it is the tab's
  value ("2 of 3", English only). The selected tab's panel follows the row in reading order, as a container named by its
  tab; the other panels are not built. SwiftUI cannot associate the panel with its tab, nor tell whether a panel holds
  anything focusable, so a panel with nothing focusable is not made a Tab stop. An empty
  title still renders and is reported in debug builds.
- Press, hold, ripple, focus ring (inside the tab, which a scrolling row would otherwise clip), corner smoothing and the
  state motion (TAB-23) are Button's (TAB-3 … TAB-10).
- **Fixtures.** Snapshots render a scrolling region in place, at rest (`ImageRenderer` draws a `ScrollView` as nothing
  on macOS); the scrolling itself and TAB-15 are tested in a hosted window.

### Tooltip

Describes an element in a few words when a person points at it, focuses it with the keyboard or long-presses it,
without taking focus or blocking anything (specs/tooltip.spec.json). A view modifier on the anchor — your own icon
button, truncated label or chart mark. SwiftUI's `.help` shows nothing on iPhone and cannot be tokenised, and `.popover`
is modal at compact widths and moves VoiceOver focus, so neither is used.

```swift
TanreiIconButton("Delete", icon: "delete", action: delete)
  .tanreiTooltip("Move to trash", describes: false)                       // the text repeats the button's name
Text(term).tanreiTooltip("Trash still counts toward storage.", title: "Storage", variant: .rich)
Image(systemName: "sparkles").tanreiTooltip("New: filters", isPresented: $showsHint)   // a first-run hint
```

| Spec | SwiftUI |
|---|---|
| `text` | the first argument |
| `title` | `title:` (rich only) |
| `variant` | `variant: TanreiTooltipVariant` — `.plain` (default) `.rich`; structural, not a token axis |
| `placement` | `placement: TanreiTooltipPlacement` — `.top` (default) `.bottom` `.start` `.end`; `init(named:)` reads a spec name |
| `describes` | `describes: Bool` (default `true`) |
| `open` / `toggle` | `isPresented: Binding<Bool>?` — the tooltip writes it when it opens or closes by itself |
| default slot | the view the modifier is applied to |

- **Opening and closing (TIP-1 … TIP-8).** A pointer resting on the anchor (iPadOS and macOS) opens it after
  `motion.show-delay`; the pointer may move onto the tooltip, and off both for `motion.hide-delay` it closes. Keyboard
  focus opens it at once and losing focus closes it. On iOS a long press opens it without activating the anchor (a
  high-priority `LongPressGesture`, SwiftUI's own duration), and it closes `timeout.touch` after the finger lifts, or at
  a touch anywhere else. Escape closes it and is consumed; an activation of the anchor closes it; either keeps it closed
  until the pointer enters again or focus returns. While hovered or focused it never times out. At most one tooltip is
  open in a tooltip layer (the one `.tanreiTheme(_:)` puts over a window, or a dialog's); while one is open the next opens
  without the delay. The rules are a pure state machine (`TanreiTooltipMachine`), tested event by event.
- **Keys.** On a Mac, while a tooltip is open a local event monitor sees Escape wherever focus is (and consumes it, so an
  enclosing dialog stays open), a click on the anchor and Return or Space on a focused anchor. On iOS, Escape closes it
  only while the anchor has focus, and Return or Space on the anchor is not seen: a Tanrei control consumes those keys
  before an enclosing modifier hears them.
- **Where it is drawn (TIP-9, TIP-13).** In a tooltip layer above the content: `.tanreiTheme(_:)` has one over everything
  it covers, a Tanrei dialog has one over its surface, and **`.tanreiTooltipLayer()` adds one to content SwiftUI presents
  apart** — a `.sheet` or `.popover` of your own — whose tooltips cannot reach the layer of the view that presented it. The anchor publishes its bounds (an anchor preference), so the tooltip follows
  it as it scrolls or moves; it goes `offset` away on the preferred side, centred, flips when that side has no room (or
  takes the roomier one), shifts along the side to stay `window-margin` inside the layer, and closes when its anchor is
  removed or leaves the layer. It takes no focus, dims nothing, and a press on it closes it and goes no further.
- **Look (TIP-10 … TIP-12, TIP-15).** Plain: the text in `plain.supporting-text.*` on `plain.container.color`, at least
  `plain.container.min-height` tall and wrapping at `plain.container.max-width`. Rich: the title above the text,
  `rich.container.gap` apart, on the raised `rich.container.*` surface, wrapping at its maximum width. Corners eased by the
  corner smoothing, text start-aligned, growing with enlarged text. It fades in over `motion.enter-*` and out over
  `motion.exit-*`, and keeps the fade under Reduce Motion (nothing moves).
- **Accessibility (TIP-14, TIP-16).** While `describes` is true the text — after the title of a rich tooltip — is the
  anchor's accessibility hint, open or not, and the drawn tooltip is hidden so it is not read twice; the anchor's label
  and traits are left alone. SwiftUI has no tooltip role. An empty text never opens and adds nothing; it and a plain
  tooltip's ignored title are reported in debug builds.
- **Fixtures.** Each baseline is the spec's stage (320 × 200, a medium standard icon button at its centre) with its own
  tooltip layer and the tooltip open through `isPresented`.

### Snackbar

Tells a person briefly, at the bottom edge of the screen, what the app just did, with at most one action, without taking
focus or interrupting their work (specs/snackbar.spec.json). A host shows them one at a time in an overlay of the view
it is attached to — not in a sheet, which would be modal — and `show` returns how each closed.

```swift
@State private var snackbars = TanreiSnackbarHost()
ContentView()
  .tanreiSnackbarHost(snackbars)                                          // the bottom edge it uses
…
if await snackbars.show(message: "Conversation archived", actionLabel: "Undo") == .action { unarchive() }
await snackbars.show(message: "Connected to the office printer", withCloseButton: true, closeLabel: "Close")
snackbars.dismissCurrent()                                                // .dismissed(.host); the next one shows
snackbars.clear()                                                         // and drops every waiting one
TanreiSnackbar(message: "Photo saved")                                    // drawn in place (SNK-19): docs, previews
```

| Spec | SwiftUI |
|---|---|
| `message` / `action` / `closable` / `closeLabel` / `duration` | `show(message:actionLabel:withCloseButton:closeLabel:duration:)` (and the same on `TanreiSnackbar`) |
| `duration` | `TanreiSnackbarDuration` — `.auto` (default) `.short` `.long` `.indefinite`; `init(named:)` reads a spec name |
| `action` event | the result `TanreiSnackbarResult.action` |
| `dismiss` event | the result `TanreiSnackbarResult.dismissed(reason)` — `.close` `.escape` `.timeout` `.host` |

- **Host (SNK-12, SNK-13).** One at a time, in the order requested; a request waits for the one showing to close and fade
  out, and one not yet shown waits while a Tanrei dialog covers the app. `show` returns once its snackbar has closed. The
  bar sits at the bottom of the host view, centred, `container.margin` above its bottom edge and from its sides, inside
  the safe area and above the keyboard (the overlay's own), over the view's content; a Tanrei dialog is presented above
  it. **A request to a host whose view is not on screen waits.**
- **Timing (SNK-8, SNK-9).** Auto is `timeout.short` without an action and never with one; short and long are the
  timeout tokens; a snackbar with an action never times out while VoiceOver runs. The timeout pauses while the pointer is
  over the bar, focus is inside it, the scene is not active (`scenePhase`) or a Tanrei dialog covers the app, and starts
  again from its whole length. Apple platforms have no accessibility timeout setting like Android's. SwiftUI hosted
  outside a scene (an `NSHostingView` of your own) reports no active phase, so its timeouts wait.
- **Announcement and focus (SNK-10, SNK-11).** Showing one posts `AccessibilityNotification.Announcement` (default
  priority, after what is being read) with the message, then the action's label, and moves no focus. The action and the
  close button are reached at the host's place in the focus order; Escape while focus is inside dismisses it (`.escape`).
  When it closes with focus inside, SwiftUI moves focus where it moves it for a removed view: it cannot return it to the
  element that had it before.
- **Layout (SNK-14 … SNK-16, SNK-18).** As wide as its content between `container.min-width` and `container.max-width`,
  never wider than the host less its margins; at least `container.min-height` tall. The message (never cut) after
  `padding-inline-start`, then `container.gap`, the action and the close button `controls.gap` apart, centred on the
  message's first line, then `padding-inline-end-with-controls` (`padding-inline-end` without controls). When the message
  would need more than two lines beside them, or the action would not fit beside it, the action moves to its own row at
  the end, `container.gap` below the message and `padding-inline-end-with-controls` above the bottom edge, while the close
  button stays on the first row. Mirrored right to left.
- **Controls (SNK-1 … SNK-7, SNK-15).** The action (its label in `controls.label.typescale`, at least `controls.height`
  tall) and the close button (the close glyph at `controls.icon.size` in a `controls.height` square, drawn as a cross where
  the icon font is not installed) are drawn from the control axis's tokens (`system.snackbar.controls.action` / `.close`),
  each with Button's press, hold, ripple, focus ring (around the control), corner smoothing and minimum target.
- **Motion (SNK-17).** In, it rises from below by its height plus its margin while fading over `motion.enter-*`; out, it
  fades in place over `motion.exit-*`, and the next one shows after that. Under Reduce Motion it only fades.
- **In place (SNK-19, SNK-20).** `TanreiSnackbar` draws the bar at rest: no timeout, queue, entrance or announcement; its
  `onResult` still receives the action and the close button. An empty message, a close button without `closeLabel` and a
  timed action are reported in debug builds.

### Dialog

Stops a person for a decision or a few details that the task cannot go on without, in a surface that dims and blocks
everything behind it until it is answered or dismissed (specs/dialog.spec.json). A view modifier, as `.alert` and
`.sheet` are; the actions are your own Tanrei Buttons.

```swift
.tanreiDialog("Discard draft?", isPresented: $confirmsDiscard,
              supportingText: "The message you were writing will be deleted from this device.") {
  TanreiButton("Cancel", variant: .text) { confirmsDiscard = false }
  TanreiButton("Discard", variant: .text) { discard(); confirmsDiscard = false }
}
.tanreiDialog("Delete project?", isPresented: $confirmsDelete, alert: true, icon: { TanreiIconGlyph("delete") }) { … }
.tanreiDialog("Share with the team", isPresented: $shares, dismissible: false) { … } content: { PeoplePicker() }
```

| Spec | SwiftUI |
|---|---|
| `open` / `dismiss` | `isPresented: Binding<Bool>` — a dismissal writes `false` to it |
| `headline` / `supportingText` | the first argument / `supportingText:` |
| `alert` / `dismissible` | `alert:` / `dismissible:` |
| slots `icon` / `actions` / default | `icon:` / `actions:` / `content:` view builders |

- **Presentation (DLG-1, DLG-13, DLG-15).** On iOS a `.fullScreenCover` on a clear presentation background with the
  system transition off: Tanrei draws the scrim (`scrim.color`, the one role, as drawn) over the whole window and the
  motion — the scrim fades, the container fades and grows from `motion.enter-scale` over `motion.enter-*`, both fade out
  over `motion.exit-*`; under Reduce Motion it fades without growing. The cover makes the rest of the app unreachable by
  touch and VoiceOver and keeps keyboard focus in it; a dialog opened from a dialog stacks above it with its own scrim.
  **macOS has no full-screen cover**: the dialog is drawn over the view the modifier is attached to — attach it to the
  window's root — and that view is disabled meanwhile (not pressable, hidden from VoiceOver, and no keyboard focus can
  reach it; its controls draw their disabled state under the scrim). While it is open a snackbar host holds its next
  snackbar (SNK-12).
- **Closing (DLG-5, DLG-6).** While `dismissible`, Escape (with focus in the dialog), the iOS accessibility escape gesture
  and a tap on the scrim write `false` to the binding; otherwise they do nothing. Actions never close it: set the binding
  in their actions.
- **Focus (DLG-2 … DLG-4).** Mark the control that should take keyboard focus with `.defaultFocus(_:_:)`, or VoiceOver's
  with `@AccessibilityFocusState`; without a mark VoiceOver starts at the headline. On iOS the presentation returns
  VoiceOver focus to the presenting element when it closes; SwiftUI cannot move keyboard focus to the container itself, nor
  on a Mac give focus back to the element that had it.
- **Layout (DLG-7 … DLG-12, DLG-16).** Centred in the safe area, `container.margin` from every edge and from the keyboard,
  as wide as its content between `container.min-width` and `container.max-width` but never wider than the window less the
  margins, on `container.color` at `container.elevation` with `container.shape` corners eased by the corner smoothing.
  Inside `container.padding`: the icon (at `icon.size` in `icon.color`, the icon and the headline then centred), the
  headline (`headline.*`), the supporting text (`supporting-text.*`) and the content (handed `content.color` as its
  foreground style and the body text style), `container.gap` apart, leaving out what is empty; the actions
  `actions.margin-block-start` below, in a row at the end `actions.gap` apart, or a column at the end when they do not fit.
  When it does not fit the window's height the supporting text and the content scroll between the fixed headline and
  actions, with a `divider.*` hairline below the headline while scrolled from the top and above the actions while more lies
  below; when even the headline and the actions leave no room, everything scrolls together. Mirrored right to left.
- **Accessibility (DLG-14).** The container carries the modal trait, is named by the headline and described by the
  supporting text (its hint); the headline is a header. SwiftUI has no dialog or alert dialog role: `alert: true` has
  VoiceOver read the headline and the supporting text as it opens (an announcement). An empty headline is reported in
  debug builds.
- **Fixtures.** `TanreiDialogSurface(inPlace:…)` (`@_spi(Fixtures) import Tanrei`) draws the scrim and the container in
  place, at rest and not modal; the baselines draw it in a 480 × 640 frame, their icon slot an SF Symbol and their actions
  text-variant Tanrei Buttons.

### App bar

Names the current screen at its top edge and holds the way back and the screen's most used actions, flat while the
content is at its top and set apart once content scrolls under it (specs/app-bar.spec.json). A layout region:
placed with `.safeAreaInset(edge: .top)` in a `NavigationStack` whose system bar is hidden; the items are your own
`TanreiIconButton`s.

```swift
NavigationStack {
  ScrollView { … }
    .safeAreaInset(edge: .top, spacing: 0) {
      TanreiAppBar("Inbox", subtitle: "ada@example.com", size: .large) {
        TanreiIconButton("Menu", action: openMenu) { Image(systemName: "line.3.horizontal") }
      } actions: {
        TanreiIconButton("Search", action: search) { Image(systemName: "magnifyingglass") }
      }
    }
    .tanreiAppBarScrollSource()               // AFTER the inset: the bar is inside what it marks
    .toolbar(.hidden, for: .navigationBar)
}
TanreiAppBar("Settings")                                         // a title only
TanreiAppBar("Inbox", titleAlignment: .center, isScrolled: true, actions: { … })   // no navigation button
```

| Spec | SwiftUI |
|---|---|
| `title` / `subtitle` | the first argument / `subtitle:` |
| `size` | `size: TanreiAppBarSize` — `.small` (default) `.large`, plus any size the design system adds |
| `titleAlignment` | `titleAlignment: TanreiAppBarTitleAlignment` — `.start` (default) `.center` |
| `scrolled` | `isScrolled: Bool?` — `nil` (default) follows `.tanreiAppBarScrollSource()`, a value overrides it |
| item `navigation` / `action` | a `TanreiIconButton` in the `navigation` / `actions` view builder (`label` → its label, `click` → `action:`) |

- **Condition (APB-1 … APB-3).** Flat or scrolled: the container color, elevation and bottom edge (`outline.width`, inside
  the bar) of that condition, changing over `motion.condition-*`, at once under Reduce Motion.
- **Layout (APB-4 … APB-7, APB-15).** The full width offered; a top row at least small's `container.height`, each item in a
  cell of at least the minimum target (so cupertino's 44 row is 48 on iOS with items, as on every platform), the navigation
  item `container.padding-inline` from the start, the actions from the end `actions.gap` apart, `container.gap` to the title
  block; without a navigation item (or actions) the title block starts (ends) `title.inset` from the edge. Centered, the
  block is centered on the bar and narrowed equally so it never runs under the slots. Title and subtitle on one line each,
  truncated at the end; the rows grow with the text, the items never scale. A size taller than small has a title row of
  its own in its own styles, its block `container.padding-block-end` above the bottom edge. Custom `Layout`, mirrored
  right to left.
- **Collapse (APB-8, APB-9).** Connected, a large bar is drawn shorter by the distance scrolled, one for one, down to its
  top row, its title row moving up with the bottom edge and clipped under the top row; the top row's title fades in with
  the covered part; the bar is scrolled only once it has collapsed. While connected the bar keeps its expanded height in the
  layout, so the scroll view's inset does not move while it collapses. Not connected, a large bar is expanded, or drawn
  collapsed while `isScrolled` is true.
- **Scroll source.** `.tanreiAppBarScrollSource()` reads `onScrollGeometryChange` (iOS 18 / macOS 15; before, nothing is
  connected) and hands the distance to the bar through the environment — so it must be applied **after** the
  `.safeAreaInset` that holds the bar: a modifier inside it cannot reach the inset's content.
- **System insets (APB-10).** The container reaches under the top and side safe-area insets; the content stays inside.
- **Back swipe (iOS).** While the system bar is hidden, UIKit refuses the navigation controller's edge swipe; the bar keeps
  it working (it begins whenever a screen lies under the top one), and leaves UIKit's decision alone while the system bar
  shows. The gallery's UI test swipes back from the edge.
- **Accessibility (APB-11 … APB-13).** No role, never focusable: focus moves from the navigation item to the actions. The
  title is one element, a header, read in full even when truncated; the subtitle is text read after it. A large bar exposes
  one title: the expanded one while any of it shows, the top row's once it is covered. An empty title draws and exposes
  nothing; more than one navigation button or three actions still render and are reported in debug builds, as is an
  unknown size (APB-14).
- **Fixtures.** 360 wide, no insets, standard medium icon buttons drawing the SF Symbol a product would pass for the glyph;
  `scrolled` fixtures pass `isScrolled: true`. The collapse is tested with a connected scroll view in a hosted window.

### Toolbar

Holds a short row of actions for the current screen or selection, docked across the bottom edge or floating over the
content (specs/toolbar.spec.json). The items are your own `TanreiIconButton`s and `TanreiButton`s in the toolbar's view
builder (the item kinds `action` and `button`), drawn and behaving as they do anywhere. SwiftUI's own `.toolbar`
with a bottom-bar placement is not used: its bar cannot take the tokens.

```swift
@State private var bold = false
ContentView()
  .safeAreaInset(edge: .bottom, spacing: 0) {       // docked: a layout region at the bottom edge
    TanreiToolbar("Message actions") {
      TanreiIconButton("Archive", icon: "archive", action: archive)
      TanreiIconButton("Delete", icon: "delete", action: delete)
      TanreiButton("Reply", variant: .tonal, action: reply)
    }
  }
TanreiToolbar("Formatting", variant: .floating) {    // placed by your layout, over the content
  TanreiIconButton("Bold", isSelected: $bold, icon: "format_bold")
  TanreiIconButton("Insert link", icon: "link", action: insertLink)
}
TanreiToolbar("Map controls", variant: .floating, orientation: .vertical) { … }
```

| Spec | SwiftUI |
|---|---|
| `label` | the first argument (`StringProtocol` or `LocalizedStringKey`) — never drawn |
| `variant` | `variant: TanreiToolbarVariant` — `.docked` (default) `.floating`, plus any variant the design system adds |
| `orientation` | `orientation: TanreiToolbarOrientation` — `.horizontal` (default) `.vertical`; `init(named:)` for data |
| item `action` | a `TanreiIconButton` in the view builder: its label, `variant`, `isSelected:` (`toggle`, `selected`, `change`), `.disabled(_:)`, `action:` (`click`) as anywhere |
| item `button` | a `TanreiButton` in the view builder: `variant`, `.disabled(_:)`, `action:` (`click`) as anywhere |

- **Docked (TBR-1 … TBR-3).** The full width it is offered, at least `container.size.docked` high, in the docked color,
  elevation and corners, with a `outline.width` top edge in `outline.color.docked`. The items are in one row, the first
  `padding-inline.docked` from the start, the last as far from the end, with equal space between them (never less than
  `gap.docked`), each centred in the row; one item is centred. Placed with `.safeAreaInset(edge: .bottom)`, its color
  reaches under the bottom and side system insets and its items stay above and inside them.
- **Floating (TBR-4 … TBR-6).** A rounded surface (the corners eased by the corner smoothing) in the floating color and
  elevation, with an edge around the whole shape, as long as its items need — `padding-inline.floating` at each end and
  `gap.floating` between — and at least `container.size.floating` across. It places itself nowhere and reaches under no
  inset: put it where your layout wants it (above the bottom of the content, clear of a navigation bar; beside the content
  for a vertical one). Vertical stacks the items top to bottom; a docked toolbar is always horizontal (vertical is reported
  in debug builds). A variant a design system adds takes the docked structure with its own values; a variant the system
  does not have draws `.docked`, and an unknown orientation name `.horizontal` (both reported, TBR-13).
- **Right to left (TBR-7).** A row starts at the right edge, in reading order; a column keeps its order.
- **Too many items (TBR-8).** Every item keeps its own size and the gap its minimum: once laid out, the row moves into a
  scroll view along the toolbar's axis, and an item that takes keyboard focus is brought fully into view, at once. It never
  wraps, shrinks or hides an item, and debug builds report that the extra actions belong in an overflow menu (a
  `TanreiMenu` opened from a "More" icon button) — from the row as it was laid out, not from a layout probe. Fixtures and
  galleries whose stage is fixed may silence that report with `tanreiToolbarReportsOverflow(false)`
  (`@_spi(Fixtures)`): an accessibility audit enlarges the text until a Button no longer fits. A row that fits is in no
  scroll view. While it scrolls, an end item's hit
  area stops at the toolbar's edge (a scroll view hit-tests nothing outside itself).
- **Items stay themselves (TBR-9).** Each item draws from its own tokens, variant and size, keeps its own press, focus
  ring, target, disabled state and semantics — a toggle stays a toggle — and calls its own action; the toolbar reads no
  state token. Between two items the hit areas meet at the middle of the space between them and never overlap (as in a
  button group, above and below in a vertical toolbar); where an item has no neighbour it keeps its whole target.
- **Keyboard (TBR-10).** The toolbar is one keyboard stop (with Full Keyboard Access on iOS, keyboard navigation on macOS):
  the item focused last, else the first enabled item. Right and Left Arrow (swapped right to left) in a row, Down and Up
  Arrow in a column, move to the next and previous enabled item, wrapping; Home and End to the first and last. Moving
  focus never activates; Enter and Space are the item's own. A disabled item takes no focus. The keys are tested as rules:
  the simulator gives no keyboard focus under automation.
- **Accessibility (TBR-11, TBR-12).** SwiftUI has no toolbar role: the toolbar is an accessibility container
  (`.accessibilityElement(children: .contain)`) named by `label`, holding its items in order, each with its own name, role
  and state; its orientation is not exposed. An empty label, no item, and content that is not a `TanreiIconButton` or
  `TanreiButton` (a field or a slider would take the arrow keys) still render and are reported in debug builds.
- **Larger text (TBR-14).** The toolbar grows across its axis to hold its items; a Button grows as it does anywhere, icon
  buttons keep their size.
- **The internal channel.** The toolbar reaches its items through the button group's (`TanreiJoinedItem.swift`): each
  item's place as an unconnected row item — the reach of its hit area toward each neighbour, along the toolbar's axis —
  and the row's one keyboard stop (`TanreiJoinedRoving`). Outside a toolbar or a group the items draw and behave exactly as
  they always have.
- **Fixtures.** Docked in a 360 × 56 stage, floating centred in 360 × 96, vertical in 96 × 240; the SF Symbol a product
  would pass for each glyph (archive → archivebox, delete → trash, mark_email_unread → envelope.badge, drive_file_move →
  folder, attach_file → paperclip, image → photo, ink_highlighter → highlighter, ink_eraser → eraser, remove → minus,
  my_location → scope). The hit areas are tested with clicks in a hosted window (macOS's pointer target).

### Navigation bar

Moves between three to five top-level destinations from the bottom edge of a compact screen, and shows which one is
current (specs/navigation-bar.spec.json). A layout region, placed with `.safeAreaInset(edge: .bottom)`. The
destinations are views in the bar's view builder, one `TanreiNavigationBarItem` per item of the kind `destination`.
A bar of its own rather than a restyled `TabView`, whose bar the tokens cannot reach.

```swift
@State private var tab = "inbox"
ContentView()
  .safeAreaInset(edge: .bottom, spacing: 0) {
    TanreiNavigationBar(selection: $tab, accessibilityLabel: "Main", onReselect: { scrollToTop($0) }) {
      TanreiNavigationBarItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
      TanreiNavigationBarItem("Chat", icon: "chat", value: "chat", badge: TanreiNavigationBadge(label: "New"))   // a dot
      TanreiNavigationBarItem("Starred", icon: "star", value: "starred").disabled(!signedIn)
      TanreiNavigationBarItem("Profile", icon: .image(Image(systemName: tab == "profile" ? "person.fill" : "person")), value: "profile")
    }
  }
TanreiNavigationBar(selection: $screen, labelVisibility: .selected) { … }   // Binding<V>, or Binding<V?> (nil: none selected)
```

| Spec | SwiftUI |
|---|---|
| `value` / `change` | `selection: Binding<V>` (or `Binding<V?>`) — the selected destination's value; activating another destination writes it |
| `reselect` | `onReselect: (V) -> Void` — the selected destination was activated again |
| `labelVisibility` | `labelVisibility: TanreiNavigationLabelVisibility` — `.always` (default) `.selected` `.never` |
| `label` | `accessibilityLabel: LocalizedStringKey` — names the bar |
| item `destination` | `TanreiNavigationBarItem(_ title:, icon:, value:, badge:)` in the view builder (`ForEach` works) |
| `value` / `label` / `icon` (destination) | `value:` (any `Hashable`) / the title / `icon:` — a glyph by name (`String`), or a `TanreiItemIcon` (`.image(Image(…))`) |
| `badge`, `badgeCount`, `badgeLabel` | `badge: TanreiNavigationBadge?` — `TanreiNavigationBadge(count: Int? = nil, label: String = "")`; `nil` is no badge |
| `disabled` | `.disabled(_:)` on a destination |

- **Selection (NVB-1, NVB-3, NVB-22).** Activating a destination — pointer, touch, Enter or Space — that is not the
  selected one writes its value to the binding once; activating the selected one calls `onReselect` once with its value
  and writes nothing. An empty value (`""`, or `nil`) selects none; a value naming no destination selects none and is
  reported in debug builds, as are two destinations sharing a value (the first is the one it selects), an empty label
  (NVB-20) and fewer than three or more than five destinations (NVB-17) — all still render.
- **Layout (NVB-6, NVB-11 … NVB-13, NVB-18).** The full width offered, divided into equal cells in reading order
  (mirrored right to left), each at least the minimum target wide while the width holds them — a bar narrower than its
  destinations times the target keeps the equal share and narrows its cells (and their item containers) below it, never
  wider than it is offered; at least `container.height` high above the bottom system inset. Each cell is its destination's
  whole hit area; in it the item container (`item.container.width` × `.height`, its corners eased by the corner
  smoothing) with the icon centered, and the label `item.gap` below it on one
  line, truncated at the end — centered as a group; a destination that draws no label centers its item container. The
  container's color, elevation and top edge reach under the bottom and side safe-area insets; the destinations stay
  inside them.
- **States (NVB-4 … NVB-10).** Hover, focus and press show on the item container (the active indicator's box) from the
  tokens of the destination's condition (`unselected`, `selected`), whichever part of the cell the pointer is over; the
  ripple is clipped to the item container and grows from the point of contact, or from its center for a press elsewhere
  in the cell or by key. The focus ring surrounds the item container, keyboard focus only, never dimmed. Press, hold,
  ripple and focus ring are Button's.
- **Selection motion (NVB-15).** The new active indicator grows in width from the center of its item container, at its
  full height; the previous one fades; colors change and labels (under `.selected`) come and go over
  `motion.selection-*`; at once under Reduce Motion. The icon's family and fill switch at once (SwiftUI cannot animate a
  font's axes).
- **Icons and badges (NVB-14, NVB-16).** A glyph is drawn at `item.icon.size` in the icon font's family and fill of the
  destination's condition; an image (an SF Symbol) does not follow the selection — pass the `.fill` symbol for the
  selected destination yourself. A badge is the badge component on the icon's top-end corner, kept while disabled.
- **Accessibility (NVB-19, NVB-21).** The bar is a container named by `accessibilityLabel`, with the tab bar trait; each
  destination one button named by its title, drawn or not, with the selected trait; its icon hidden. On iOS VoiceOver states
  the position ("tab, 2 of 4") from the tab bar trait; elsewhere it is the destination's value ("2 of 4", English only),
  followed by the badge's description (its label, or the displayed count). Larger text grows the bar to hold the labels on
  one line; item containers and icons keep their size, and a long press shows the large-content viewer. A disabled
  destination is not focusable and is exposed as disabled. Each enabled destination is a Tab stop.
- **Fixtures.** 360 wide, no insets, the SF Symbol a product would pass for each glyph (filled when selected). The
  selection motion is tested in a hosted window; the insets with `safeAreaPadding`.

### Navigation drawer

Lists a product's destinations in a panel at the leading edge, grouped under headings: beside the content on a large
screen, over it on a compact one (specs/navigation-drawer.spec.json). A **standard** drawer is a layout region,
placed at the leading edge (an `HStack`); a **modal** one is a modal overlay, presented with `.tanreiNavigationDrawer(…)`.
The rows are the drawer's own — list-like, not the bar's destination — pressed like Button through the shared press and row
primitives.

```swift
@State private var folder = "inbox"
@State private var showsDrawer = true
HStack(spacing: 0) {
  TanreiNavigationDrawer(isPresented: $showsDrawer, selection: $folder, accessibilityLabel: "Mail", onReselect: { scrollToTop($0) }) {
    TanreiNavigationDrawerSection("Mail") {
      TanreiNavigationDrawerItem("Inbox", icon: "inbox", value: "inbox", badge: "24")
      TanreiNavigationDrawerItem("Sent", icon: "send", value: "sent")
      TanreiNavigationDrawerItem("Drafts", icon: "draft", value: "drafts").disabled(!signedIn)
    }
    TanreiNavigationDrawerSection("Labels", divider: true) {
      ForEach(labels) { TanreiNavigationDrawerItem($0.name, icon: "label", value: $0.id) }
    }
  } header: {
    AccountSwitcher()
  }
  MailboxView(folder: folder)
}

// Compact: over the content, opened from a menu button; it closes itself.
MailboxView(folder: folder)
  .tanreiNavigationDrawer(isPresented: $showsDrawer, selection: $folder, accessibilityLabel: "Mail") { … }
```

| Spec | SwiftUI |
|---|---|
| `variant` | `variant: TanreiNavigationDrawerVariant` — `.standard` (default for the view), `.modal` (default for the modifier), or a value a design system adds (laid out as standard) |
| `open` / `close` | `isPresented: Binding<Bool>` — a modal drawer writes `false` when it closes (the spec's `close`); a standard one never writes it |
| `value` / `change` | `selection: Binding<V>` (or `Binding<V?>`) — the selected destination's value, in a section or not; activating another destination writes it |
| `reselect` | `onReselect: (V) -> Void` — the selected destination was activated again |
| `label` | `accessibilityLabel: LocalizedStringKey` — names the drawer, and the modal drawer as a whole |
| slot `header` | the `header:` view builder, above the destinations, scrolling with them — omit it for a drawer without a header |
| item `destination` | `TanreiNavigationDrawerItem(_ title:, icon:, value:, badge:)` in the content builder (`ForEach` works) |
| `value` / `label` / `icon` / `badge` (destination) | `value:` (any `Hashable`) / the title / `icon:` — a glyph by name (`String?`), or a `TanreiItemIcon` / `badge: String` ("24", "New"; empty draws none) |
| `disabled` | `.disabled(_:)` on a destination, or on a section for all of its destinations |
| item `section` | `TanreiNavigationDrawerSection(_ heading: String = "", divider: Bool = false) { … }`, as SwiftUI's `Section` |

- **Selection (NVD-1 … NVD-3, NVD-29).** As the bar's and the rail's: another destination writes its value once, the
  selected one calls `onReselect` once and writes nothing; an empty value selects none. A value naming no destination, two
  destinations sharing a value (the first is the one it selects), an empty label and a modal drawer without
  `accessibilityLabel` (NVD-24), and a section inside a section (NVD-17: its destinations are drawn in its place) are
  reported in debug builds and still render.
- **Layout (NVD-6, NVD-11 … NVD-17, NVD-25).** `container.width` wide beside the leading safe-area inset — never scaled with
  the text — and the full height it is offered; its variant's color and elevation reach under the leading, top and bottom
  insets, its trailing corners are rounded by its variant's shape (its leading ones square), and its end edge
  (`outline.*`, on the left right to left) runs its full height. Inside, `container.padding-*` from its edges: the header,
  then the destinations and sections — each section its divider (a `TanreiDivider` across the inner width), its heading
  (at least `heading.height`, starting where the rows' content starts, with the header trait) and its destinations —, all
  `container.gap` apart, scrolling together. A row is at least `item.container.height` high across the inner width: the
  icon, the label (wrapping, never cut) and the badge text at its end. Its hit area is the row with half the gap above and
  below, and never lower than `sys.target.pointer` (macOS) or `sys.target.touch`; a system whose row and gap give less
  reaches over the gaps without moving the rows.
- **States, motion, icons (NVD-4 … NVD-10, NVD-14).** As Button's, on the row: one state from the condition's tokens, the
  press held for `press-hold`, the answer `pressed-feedback` names, the ring (or glow) around the row for keyboard focus
  only, corners eased by the corner smoothing (the OS's continuous corner for any amount above 0). The icon is drawn at
  `item.icon.size` in its condition's family and fill, and not scaled with the text.
- **Standard (NVD-18, NVD-28).** Takes its width while `isPresented` is `true`, none — and no focus or presence to
  VoiceOver — while it is `false`, sliding over `motion.enter-*` / `motion.exit-*` while the content beside it resizes (the
  change is animated where the drawer sees it, so the whole layout moves with it); at once under Reduce Motion. Opening it
  moves keyboard focus to the selected destination (or the first enabled one); closing it with focus inside lets focus go —
  SwiftUI cannot name the view that had focus, so the platform puts it where it does by default. No scrim, no focus trap; Tab leaves it.
- **Modal (NVD-19 … NVD-22).** The modifier presents it as the dialog is presented: on iOS in a full-screen cover on a clear
  background (the rest of the app inert to touch, VoiceOver and the keyboard), on macOS over the view it is attached to
  (attach it to the window's root), which is inert meanwhile. The drawer slides in from the leading edge and fades the scrim
  in, and out again (at once under Reduce Motion); it carries the modal trait, moves focus to the selected destination, and
  closes itself — writing `false` once — on the scrim, Escape, the accessibility escape gesture, a drag toward its leading
  edge past half its width or a fling (0.5 points per millisecond; followed beyond 8 points: SwiftUI names neither), and
  after a destination was activated (change or reselect first). It counts as an open Tanrei modal while it is presented, so
  a snackbar host waits. Written as a view with `.modal`, the drawer draws its scrim over the space it is given and makes
  nothing outside it inert.
- **Accessibility (NVD-15, NVD-23, NVD-27).** The drawer is a container named by `accessibilityLabel`; each destination is
  one button named by its title with the selected trait, its value its position among all the destinations ("2 of 6",
  English only) and then its badge text; icons are hidden. A section is a group whose heading has the header trait and takes
  no focus. Larger text makes rows and headings taller; the width and the icons keep their size.
- **Fixtures.** A standard drawer 560 high, no insets; the modal one drawn in place (`inPlace()`, `@_spi(Fixtures)`) over a
  480 × 640 stage; the SF Symbol a product would pass for each glyph (filled when selected). Opening and closing, the slide,
  the hit area and the press are tested in a hosted window; the scrim and the drag, which a synthetic event cannot reach
  there, in the Gallery.

### Navigation rail

Moves between three to seven top-level destinations from the leading edge of a medium or large screen, shows which one is
current, and holds the screen's menu button or main action above them (specs/navigation-rail.spec.json). A layout region,
placed at the leading edge (an `HStack`, or `.safeAreaInset(edge: .leading)`). The destinations are the
navigation bar's — the same arguments, the same `TanreiNavigationBadge` and `TanreiNavigationLabelVisibility` —, so a
product switches between the two at a breakpoint without touching them; each is drawn from the rail's own tokens.

```swift
@State private var screen = "inbox"
HStack(spacing: 0) {
  TanreiNavigationRail(selection: $screen, accessibilityLabel: "Main", onReselect: { scrollToTop($0) }) {
    TanreiNavigationRailItem("Inbox", icon: "inbox", value: "inbox", badge: TanreiNavigationBadge(count: 3, label: "3 unread"))
    TanreiNavigationRailItem("Sent", icon: "send", value: "sent")
    TanreiNavigationRailItem("Starred", icon: "star", value: "starred").disabled(!signedIn)
    TanreiNavigationRailItem("Settings", icon: "settings", value: "settings")
  } header: {
    TanreiIconButton("Menu", action: openDrawer) { TanreiIconGlyph("menu") }
    TanreiFab("Compose", action: compose) { TanreiIconGlyph("edit") }
  }
  ContentView()
}
TanreiNavigationRail(selection: $screen, labelVisibility: .selected) { … }   // no header; Binding<V>, or Binding<V?>
```

| Spec | SwiftUI |
|---|---|
| `value` / `change` | `selection: Binding<V>` (or `Binding<V?>`) — the selected destination's value; activating another destination writes it |
| `reselect` | `onReselect: (V) -> Void` — the selected destination was activated again |
| `labelVisibility` | `labelVisibility: TanreiNavigationLabelVisibility` — `.always` (default) `.selected` `.never` |
| `label` | `accessibilityLabel: LocalizedStringKey` — names the rail |
| slot `header` | the `header:` view builder — omit it for a rail without a header |
| item `header-button` | a `TanreiIconButton` in the `header:` builder (`label` → its label, `click` → `action:`), standard and medium by default |
| item `destination` | `TanreiNavigationRailItem(_ title:, icon:, value:, badge:)` in the content builder (`ForEach` works) |
| `value` / `label` / `icon` (destination) | `value:` (any `Hashable`) / the title / `icon:` — a glyph by name (`String`), or a `TanreiItemIcon` |
| `badge`, `badgeCount`, `badgeLabel` | `badge: TanreiNavigationBadge?` — `TanreiNavigationBadge(count: Int? = nil, label: String = "")`; `nil` is no badge |
| `disabled` | `.disabled(_:)` on a destination |

- **Selection (NVR-1, NVR-3, NVR-23).** As the bar's: another destination writes its value once, the selected one calls
  `onReselect` once and writes nothing; an empty value selects none. A value naming no destination, two destinations
  sharing a value (the first is the one it selects), an empty label (NVR-21) and fewer than three or more than seven
  destinations (NVR-18) are reported in debug builds and still render.
- **Layout (NVR-6, NVR-11 … NVR-14, NVR-18, NVR-19).** `container.width` wide beside the leading safe-area inset — never
  scaled with the text — and the full height it is offered; its color and elevation reach under the leading, top and bottom
  insets, its end edge (`outline.*`, on the left right to left) runs its full height, and the header and destinations stay
  inside the insets. The header's content is stacked and centered `container.padding-block` below the top, its items
  `container.gap` apart (the spec names no distance); the destinations are stacked below
  it, `header.gap` away (`container.padding-block` below the top without a header), `container.gap` apart. Each cell is its
  destination's whole hit area — the rail's full width, half the gap above and below — and at least `sys.target.touch` high
  (so under `.never` the item containers are 16 apart). A label takes at most two lines,
  then is truncated at its end. The destinations scroll when they do not fit; the header stays.
- **States, motion, icons, badges (NVR-4 … NVR-10, NVR-15 … NVR-17).** The bar's, from the rail's tokens. Under `.selected`,
  the labels come and go and the destinations below move with them over `motion.selection-*`; at once under Reduce Motion.
- **Accessibility (NVR-20, NVR-22).** The rail is a container named by `accessibilityLabel`; the header comes first with its
  own semantics; the destinations are a container with the tab bar trait, each one button named by its title (drawn or
  not) with the selected trait, its position ("tab, 2 of 4" from the trait on iOS; the value "2 of 4" elsewhere, English
  only) and its badge's words. Larger text makes destinations taller; item containers and icons keep their size; a long
  press shows the large-content viewer.
- **Fixtures.** 400 high, no insets, `header-button` items as standard medium icon buttons in the header, the SF Symbol a
  product would pass for each glyph (filled when selected). Selection motion, whole-cell hit area and scrolling are tested
  in a hosted window; the insets with `safeAreaPadding`.

## Theming

A `TanreiTheme` is a **design system** plus theme (light / dark / system) × contrast
(standard / medium / high / system), which pick one of the system's six `TanreiColors`
schemes. Without any setup, components use `TanreiSystem.tanrei`, follow the OS
`colorScheme`, and `colorSchemeContrast == .increased` selects the high-contrast scheme.

```swift
ContentView()
  .tanreiTheme(TanreiTheme(appearance: .dark, contrast: .medium))
```

Inside your own views, read tokens from the environment — never from a static:

```swift
struct Card: View {
  @Environment(\.tanreiSystem) private var system   // typescale, shape, space, measure, motion, elevation, button…
  @TanreiPalette private var colors                 // the system's TanreiColors for this environment

  var body: some View {
    Text("Build passed")
      .tanreiTextStyle(system.typescale.body)            // font + tracking + exact line height
    Text("42 checks")
      .tanreiTextStyle(system.typescale.heading5, emphasized: true)   // + the heading family's weight step
      .foregroundStyle(colors[.onSurface])
      .padding(system.space.space200)
      .background(TanreiElevationSurface(system.elevation.level2, fill: colors[.surfaceContainerLowest], cornerRadius: system.shape.large))
  }
}
```

### Design systems

Tanrei ships design systems as layers: the default, presets that imitate other
systems, and systems a product generates for itself. In Swift a system is one value:

```swift
public struct TanreiSystem: Sendable, Equatable {
  var id: String
  var colors: TanreiColorSchemes      // light, lightMedium, lightHigh, dark, darkMedium, darkHigh
  var typescale: TanreiTypescale      // 16 roles + emphasis (a weight step per family)
  var shape: TanreiShape              // corner radii + cornerSmoothing (0–1)
  var space: TanreiSpace
  var state: TanreiState
  var measure: TanreiMeasure          // borders, focus indicator, targets, icon sizes
  var typefaces: TanreiTypefaces      // brand, plain, mono, icon — each a TanreiFontStack
  var icon: TanreiIconStyle           // an icon family per selection state, weight, fill of the two states
  var behavior: TanreiBehavior        // choices of kind: pressedFeedback, focusStyle
  var motion: TanreiMotionTokens      // duration (incl. pressHold), easing, spring
  var elevation: TanreiElevation
  var button: TanreiButtonTokens      // one struct per component
}
```

- `Generated/TanreiTokens.swift` holds the **vocabulary types**. They are the same for every
  system. Each struct has exactly one public initializer that requires every label (the one
  exception is `extra`, below, which defaults to empty).
- `Generated/TanreiSystem+Tanrei.swift` holds the **values** of the default system:
  `extension TanreiSystem { public static let tanrei = TanreiSystem(…) }`.
- The shipped presets are generated the same way: `.m3Like` (adds the button sizes `.xsmall` and
  `.xlarge` and revalues all five) and `.cupertino`.

**Supplying your own system.** A product describes its system as a layer file
(`tokens/systems/<id>.system.json`) and generates it. The Swift emitter turns a system's
resolved tokens into one values file of the same form,
`extension TanreiSystem { public static let acme = … }`, which the product adds to its app
target next to the `Tanrei` library (the vocabulary types come from the library;
`tanrei build` with the `swiftui` output writes the file). Then:

```swift
ContentView().tanreiTheme(TanreiTheme(system: .acme))
```

Because the initializers require every label, a system file generated against an older
vocabulary **stops compiling** when Tanrei adds a token — regenerate it; nothing is silently
defaulted. Properties are `var`, so a product can also adjust a copy at runtime
(`var system = TanreiSystem.tanrei; system.button.pressed.opacity = 0.6`).

**Colors are paints.** A component color token is a `TanreiPaint`, a scheme-independent
description evaluated at runtime against the current scheme (`colors[paint]` or
`paint.resolve(in: colors)`):

| Paint | Meaning |
|---|---|
| `.role(.onSurface)` | a color role of the current scheme |
| `.mix(base:with:amount:)` | premultiplied interpolation — identical to CSS `color-mix(in srgb, …)` |
| `.alpha(of:amount:)` | the paint with its alpha multiplied |
| `.none` | nothing is drawn |
| `.literal(TanreiColorValue)` | a fixed color, the same in every scheme |
| `.scheme(by: [TanreiScheme: TanreiPaint])` | one paint per scheme, where the six schemes disagree (a palette `tone`, a contrast pick); evaluated by `colors.scheme` — every `TanreiColors` says which scheme it is |

**Roles are open-ended.** `TanreiColorRole` is a string-backed key, not an enum: every system
has the core roles (`.primary`, `.onSurface`, …, generated as static constants), and a system
may declare more palettes (`TanreiColorRole(rawValue: "tertiary")`). Asking a scheme for a
role it does not define is reported in debug builds and falls back to the matching `primary`
role (there are no emphasis roles; a recolored component is a variant).

### Text styles

`system.typescale` has sixteen roles, by level, and every family is monotonic in size:

| Role | HTML | Family | Use |
|---|---|---|---|
| `display` | — | display | one hero size |
| `heading1` … `heading6` | `h1` … `h6` | heading | `heading5` a card's or dialog's title, `heading6` a table's |
| `bodyLarge` / `body` / `bodySmall` | lead / `p` / `small` | body | running text |
| `label` / `labelSmall` / `caption` | — | label | text inside and next to controls (buttons, inputs, chips, helper text) |
| `code` / `codeSmall` | `code` / `pre` | label | monospace |
| `eyebrow` | — | label | a section's kicker: small, tracked, uppercased by the component |

Where a heading and a body role share a size: headings weigh 500 or more, body weighs 400. A system may add
roles (`cupertino` adds `body-callout`, `body-subhead`, `caption-small`; `m3-like` `display-large`,
`display-small`) — read them with `typescale["body-callout"]` or the typed accessor that system generates.

**Emphasis is a weight, not a role.** `.tanreiTextStyle(style, emphasized: true)` adds
`system.typescale.emphasis[style.family]` — the step of the family the role belongs to (`TanreiTypeEmphasis`:
`display`, `heading`, `body`, `label`; 100 each by default, `m3-like` gives labels 200) — to the role's weight
and changes nothing else: size, tracking, line height and the Dynamic Type factor stay. The pure form is
`style.emphasized(by: system.typescale.emphasis)`; a resolved style reports `weight` and `emphasized`. Every
`TanreiTextStyle` carries its `family` (generated from the role's name: the first segment; `caption`, `code*`
and `eyebrow` belong to `label`).

### Extending the vocabulary

The core vocabulary is small, and any design system — a preset or your product's layer — may add
to it under `vocabulary`. Everything a layer can extend has **one shape**, the one
color roles have: named fields for the core values, an `extra` map for what a system added, and
a lookup by key.

| What | Core | Added | Lookup |
|---|---|---|---|
| Button sizes | `system.button.sizes.small` `.medium` `.large` | `sizes.extra[key]` | `sizes[size]` — total; `sizes.value(for:)` — optional; `sizes.keys` |
| Button variants | `system.button.variants.filled` … `.text`, each `.enabled` `.hovered` `.focused` `.pressed` `.disabled` | `variants.extra[key]` | `variants[variant]`, `variants.value(for:)`, `variants.keys` |
| Icon button sizes and variants | `system.iconButton.sizes.small` …, `system.iconButton.variants.standard` … | `extra[key]` | as Button's |
| Series: `space`, `shape`, `typescale`, `elevation`, `state`, `measure`, `motion.duration`, `motion.easing` | `system.space.space200` … | `space.extra["space1200"]` | `space["space1200"]` — optional, by token key (`measure` keys are `"<group>-<step>"`, e.g. `"icon-small"`) |
| Springs: `motion.spring.<scheme>.<name>` | `spring.standard.fastEffects` … | `spring.standard.extra["bouncy"]`, and a whole scheme in `spring.extra["playful"]` (it values every core spring) | `spring["standard"]?["bouncy"]` — optional at both levels; typed accessors `spring.standard.bouncy` never throw |
| Color roles | `.primary` … | any `TanreiColorRole(rawValue:)` in `colors.values` | `colors[role]` |

Per size a button reads `containerHeight`, `containerPaddingInlineStart`, `…End`,
`…StartWithIcon`, `containerPaddingBlock`, `labelTypescale`, `iconSize`, `containerGap` (between
icon and label) and `outlineWidth` (`TanreiButtonSizeTokens`). The last two are the same at every
size in the default system (8 and 1); a system such as `m3-like` grows them with the size. The component does `tokens.sizes[size]` and `tokens.variants[variant]`;
there is no switch over sizes or variants anywhere. Interaction states are **not** extensible.

`extra` defaults to empty, so the generated file of a system that adds nothing never mentions it.
The generated file of a system that **does** add vocabulary fills `extra` and ends with one marked
section of typed names, so product code is fully typed:

```swift
// generated into YOUR module by `tanrei build` (TanreiSystem+Acme.swift)
extension TanreiSpace        { public var space1200: CGFloat { … } }
extension TanreiColorRole    { public static let brandGlow = TanreiColorRole(rawValue: "brand-glow") }
extension TanreiButtonSize   { public static let size3x = TanreiButtonSize(rawValue: "3x") }   // `3x` is not an identifier: prefixed with the axis
extension TanreiButtonVariant { public static let danger = TanreiButtonVariant(rawValue: "danger") }
public struct AcmeTokens { … }                     // the layer's OWN tokens (acme.comp.rating.star.size)
extension AcmeTokens { public static let acme = … }

// your code
TanreiButton("Delete", variant: .danger, size: .size3x, action: delete)
    .padding(.top, system.space.space1200)
Image(systemName: "star.fill")
    .frame(width: AcmeTokens.acme.rating.star.size)
    .foregroundStyle(colors[AcmeTokens.acme.rating.star.color])   // a TanreiPaint: follows the scheme
```

- Typed names are generated by the system that **declared** the extension (`declaredBy`), so two
  systems of one product never declare the same member twice; a product that stacks its own layers
  generates the declaring layer too. Values (`extra`, `AcmeTokens.<system>`) are written for every system.
- A layer's own tokens are not part of `TanreiSystem`. `comp` is dropped from the path:
  `acme.comp.rating.star.size` → `AcmeTokens.acme.rating.star.size`.
- **Unknown keys never crash a release build.** `sizes[_:]` / `variants[_:]` return the default
  value's tokens; a typed step accessor read from a system without that step returns the declaring
  system's value. Both report through `TanreiDiagnostics.report`, which exists in debug builds only
  (an `assertionFailure`, or the task-local `TanreiDiagnostics.handler` when one is set — tests use
  `TanreiDiagnostics.$handler.withValue { … }` to collect reports instead of trapping).

**States are values.** For each state (`enabled`, `hovered`, `focused`, `pressed`,
`disabled`) a component reads that state's tokens —
`system.button.variants.filled.hovered.containerColor`, `system.button.pressed.opacity`,
`system.button.pressed.containerShape` — and never computes how a state looks. The lookup from a
resolved `TanreiInteraction` is generated next to the groups it reads:
`system.button.variants[variant][state: state]` (total) and `system.button[state: state]` (the values
shared by every variant; `nil` at rest, which has none). A component whose tokens lack a state gets an
optional lookup that is `nil` for it. In the default
system hover is a mix of the label color into the container; another system can use explicit
colors, a dim, a different shape, or nothing, with no component change. The focus indicator
likewise comes from `system.measure`: signed `focusOffset` (negative = inside the control),
optional inner stroke (`focusInnerWidth`, role `focusRingInner`), outer stroke
(`focusOuterWidth`, role `focusRing`).

### Behaviour: choices of kind

`system.behavior` holds what a design system *does* where the other tokens say *how much*.
Typed enums, required like every token; a layer chooses among the names, it cannot add one.

| Choice | Values (first = default) | What SwiftUI draws |
|---|---|---|
| `pressedFeedback` (BTN-9) | `.overlay` `.ripple` `.dim` `.none` | **overlay**: the pressed tokens on the whole container at once. **ripple**: the pressed container paint as a circle that grows from the point of contact (the center for Return/Space) over `button.motionFeedbackDuration` with `motionStateEasing`, clipped to the container's shape; it fades with the state change (`motionStateDuration`) and appears whole under Reduce Motion. **dim**: no state layer — the container keeps the color of the state under the press, and the pressed opacity dims the whole control (flattened first, as CSS `opacity` does). **none**: the button stays in the state under the press. Under ripple and dim only the container color stays with the state under the press; label, outline, elevation, opacity and shape are the pressed tokens'. |
| `focusStyle` (BTN-10) | `.ring` `.glow` | **ring**: the hard line(s). **glow**: the same line(s) in the same focus colors as a soft halo whose blur is the line's width. Never animated, keyboard focus only. |

Shipped: default overlay / ring; `m3-like` ripples; `cupertino` dims. **Nothing falls back on this
platform**: SwiftUI can draw every choice. Where the point of
contact comes from: on macOS the pointer's last hover location; on iOS a passive UIKit recognizer on the
window that never recognizes, cancels or delays anything (a SwiftUI gesture in a button's label takes the
tap from the button and stops a list from scrolling — the Gallery UI tests guard both).

**Corner smoothing is an amount (BTN-10).** `system.shape.cornerSmoothing` is 0–1 with Figma's
meaning: 0 a quarter circle, 0.6 the iOS continuous corner, 1 the most eased (`cupertino` sets 0.6). SwiftUI
has only the OS's own curve, so **the amount is rounded to the OS's**: `system.shape.roundedCornerStyle` is
`.circular` at 0 and `.continuous` for any amount above 0 — 0.3 and 1 draw the same corner as 0.6. The OS curve is
not Figma's construction (what the amount means, and what Compose and Flutter draw): 5.1 px² apart on a 180×80 box at
radius 20 at 0.6, within what parity tolerates. Container, outline, elevation ring and shadows, ripple clip
and focus indicator all take it.

**A press is held (BTN-8).** The pressed state appears on touch/mouse-down with no delay of Tanrei's
(inside a `ScrollView` iOS itself delays touches briefly — platform behaviour) and stays visible at least
`system.motion.duration.pressHold` (100 ms by default) even when the press ended sooner. Return and Space
activate a focused button once per key-down (a held key does not repeat) and show the same held press.

**Shadows are CSS shadows.** A `TanreiShadowLayer.blur` is a CSS `box-shadow` blur radius: σ = blur / 2.
`TanreiShadowBlur` is the one place that converts it: SwiftUI's shadow `radius` *is* σ (measured in
`TanreiPrimitivesTests`, not assumed), so radius = blur / 2. `elevation.level0` is an empty list and
draws nothing.

### Fonts

A font stack arrives already read — this package parses no CSS keyword:

```swift
TanreiFontStack(families: ["Inter", "Noto Sans JP", "Noto Sans"], generic: .sansSerif, system: false)
```

`families` are the named families in order; the first one **registered with the process** is used
(`stack.installedFamily`). When none is, the platform font of class `generic` is: `.sansSerif` → San
Francisco, `.serif` → New York, `.monospace` → SF Mono. `system: true` (cupertino) means the stack asks
for the platform's own font first: named families are then not consulted. Every text style carries its
stack (`style.font`); `system.typefaces` has the four named ones (`brand`, `plain`, `mono`, `icon`).
`generic` is the IR's `genericClass`: its reading of the stack's generic keyword for a platform with
three classes of platform font (a stack ending in `cursive`, `fantasy`, `math` or `emoji` arrives as
`.sansSerif`). The emitter decides nothing and refuses a class outside the three by name.

**Tanrei bundles no font.** What a product must install for the shipped systems: default — `Inter`,
`Noto Sans JP`, `Noto Sans` (+ the Noto family of each further script), `Roboto Mono`; `m3-like` —
`Roboto`, `Roboto Mono`; `cupertino` — nothing on Apple platforms; icons — see below. How: add the font
files to the app target and list them under `UIAppFonts` (iOS) / set `ATSApplicationFontsPath` (macOS)
in Info.plist, or register at launch with `CTFontManagerRegisterFontsForURL`. `tanrei build` lists the
families a system names. Register before the first Tanrei view appears: lookups are cached per family.
Token weights are numeric (450, 550 …) and are mapped to the nearest `Font.Weight`; with the variable
Inter bundled you can apply the exact value on the `wght` axis yourself.
`TanreiTheme(fontFamilyPolicy: .system)` forces the platform font.

**Dynamic Type.** `tanreiTextStyle(_:emphasized:)` follows the environment's `dynamicTypeSize` at every step, from
`xSmall` to `accessibility5`. A token size is scaled to the size iOS gives a font of that size "relative
to body" (`UIFontMetrics(forTextStyle: .body).scaledFont(for:)`, whole points: 14 → 12 … 14 … 39), and
that size ÷ the token size is the ONE factor for glyphs, tracking, line height and a button's icon — so a
text keeps the token's proportion of line height to size at every Dynamic Type size
(`style.resolved(policy:dynamicTypeSize:emphasis:)` returns all of it: `font`, `pointSize`, `scale`, `weight`,
`tracking`, `lineHeight`; the factor never touches the weight). Both the named family and the platform font are built AT that size. Not with
`Font.custom(_:size:relativeTo:)`: SwiftUI's own scaling of it differs from `UIFontMetrics` by a point from
47pt up at some sizes (measured by `TanreiDynamicTypeTests`), and then glyphs and line box would follow
two scalings. XCUITest's accessibility audit (`performAccessibilityAudit`, Dynamic Type included) passes:
the audit is behavioural — it flags text whose size does not follow the content size category. Set
`.dynamicTypeSize(…)` OUTSIDE `tanreiTextStyle` (one between it and the `Text` is not seen). macOS has
no Dynamic Type; the size is the token's.

The audit's "Text clipped" check is a guess and guesses wrong for wrapped text with tracking — plain
SwiftUI `Text(…).font(.footnote).tracking(0.5)` gets it too, and nothing is clipped at any size. Every Tanrei text style has tracking, so expect that finding on a
Tanrei text that wraps.

### Icons

The default icon set is Material Symbols, Rounded, weight 300, and the rule is the same
everywhere: an icon for something **unselected** is drawn with `FILL` 0, the same icon in its
**selected** state with `FILL` 1. These are tokens (`system.icon`, a `TanreiIconStyle`):
`families` (a `TanreiFontStack` per selection state: `.unselected`, `.selected`), `weight` (300),
`fillUnselected` (0), `fillSelected` (1). Icon sizes stay in `system.measure.iconSmall` /
`.iconMedium` / `.iconLarge` and in a component's own `iconSize`.

**An icon set is a family per selection state**. A variable font (Material Symbols) names
one family twice and tells the states apart with `FILL`; a static set names two families — the `acme`
fixture draws `Material Icons Outlined` unselected and `Material Icons` selected — and the axes are
harmless, because an axis the font does not declare is skipped. `m3-like` draws
`Material Symbols Outlined` at 400. `icon.drawing(size:selected:)` returns everything at once: the
family of that state, fill, weight, optical size, grade 0.

One helper turns them into what an icon font needs:

```swift
@Environment(\.tanreiSystem) private var system

let icon = system.icon
icon.fill(selected: isOn)                       // 1 or 0 in the default system
icon.axes(size: 24, selected: isOn)             // TanreiIconAxes(fill:, weight: 300, opticalSize: 24, grade: 0)
icon.drawing(size: 24, selected: isOn)          // TanreiIconDrawing(family: the state's TanreiFontStack, axes:)
if let font = icon.font(size: system.measure.iconMedium, selected: isOn) {
  Text(verbatim: "favorite").font(font)         // the glyph by ligature name
} else {
  Image(systemName: isOn ? "heart.fill" : "heart")   // the font is not registered: your own icons
}
```

`opsz` is the icon box size kept inside `icon.opticalSizeRange` — the tokens
`sys.icon.optical-size.min` / `.max` (20–48, Material Symbols', in the shipped systems; a system naming
another icon font names its range), and then inside the axis the installed font declares — `GRAD` is 0. `font(size:selected:)`
returns `nil` when no family of that state's stack is registered with the process — **Tanrei does not
bundle the icon font**; add the variable `Material Symbols Rounded` font (or the families your
design system names) to your app
(`UIAppFonts` / `ATSApplicationFontsPath`, or `CTFontManagerRegisterFontsForURL`). With another
variable font named by a design system, axes the font lacks are skipped and values are kept inside
the ranges the font declares. A component's `icon:` slot stays a slot: it draws whatever view you give
it. The icon button hands its slot the icon font of its selection state (above), which a `TanreiIconGlyph`
draws with; Button's slot is sized by the button and gets no icon font. The icon is centered in the container and **never grows
it**: only the label's text has a line box, so a button keeps its token height whatever the icon's size.

## Develop

Run everything from the **repository root**:

```sh
swift build
swift test --no-parallel
```

The whole suite runs serially: 36 test files host a real window (`HostedView`), and in parallel their windows take key
status from one another and starve one another's main-actor timers. Keep the flag on a `--filter` run that takes in more than one component.

`pnpm --filter @tanrei/swiftui test` runs two more checks first: `scripts/check-emitter.mjs` (emitter
inputs no shipped system produces: per-scheme paints, added springs and spring schemes) and
`scripts/generate-acme-fixture.mjs --check` (the generated `acme` fixture is not stale).

### Gallery and UI tests

`Gallery/TanreiGallery.xcodeproj` is a small iOS app — hand-written project, file-system-synchronized
groups, the root package as a local dependency — that shows every fixture of every spec SwiftUI draws
(read from the specs themselves: the repository's `specs/` is bundled as a folder reference, so a new spec
needs no project edit), every size and variant of the selected system, under every shipped system and the
`acme` fixture system, with theme and contrast switches. Launch arguments:
`-system m3-like -appearance dark -contrast high -focus button.filled-medium` (and `-touchProbe YES`, which
shows what the window received of the last touch — the scroll test and the app bar's back-swipe test read it; `-component
divider` shows one spec's section only, `-noExplore YES` its fixtures without the rows of every size and variant,
`-fixtures id,id,…` only those fixtures, `-noSwitches YES` leaves out the switches so that the fixtures start at the top
of the screen, and `-freezeLoops YES` draws looping animations at the start of their cycle — the accessibility audits
need them all, see below).

A component joins the gallery with one entry in `App/GalleryRegistry.swift`:

```swift
static let components: [String: GalleryComponent] = [
  "badge": .badge,              // App/Components/BadgeGallery.swift: the anchor is named by its glyph, the badge adds its value
  "bottom-sheet": .bottomSheet, // App/Components/BottomSheetGallery.swift: each sheet in place on a 240 × 440 stage; plus a modal one presented and a standard one over a page
  "button": .button,            // App/Components/ButtonGallery.swift: GalleryFixture props → TanreiButton, fire from its action
  "button-group": .buttonGroup, // App/Components/ButtonGroupGallery.swift: the fixture's items at the natural width; a toggle owns its state
  "card": .card,                // App/Components/CardGallery.swift: at a phone column's width; an interactive one fires
  "carousel": .carousel,        // App/Components/CarouselGallery.swift: the fixture's items, 260 wide; glyphs as SF Symbols on the simulator
  "checkbox": .checkbox,        // App/Components/CheckboxGallery.swift: a fixture owns its value; a select-all clears its mixed state
  "chip": .chip,                // App/Components/ChipGallery.swift: a filter owns its selection; an input chip counts its removals
  "date-picker": .datePicker,   // App/Components/DatePickerGallery.swift: each open picker in place, 304 wide (cells narrowed, a modal's calendar scrolling, DTP-38); plus one presented and one docked below a field
  "divider": .divider,          // App/Components/DividerGallery.swift: between two groups, which carry the row's identifier
  "extended-fab": .extendedFab, // App/Components/ExtendedFabGallery.swift: plus one that collapses and expands on each tap
  "fab": .fab,                  // App/Components/FabGallery.swift: glyphs as SF Symbols on the simulator (App/GalleryIcon.swift)
  "fab-menu": .fabMenu,         // App/Components/FabMenuGallery.swift: each fixture on its 320 stage; closed ones present a popover, open ones are drawn in place
  "icon-button": .iconButton,   // App/Components/IconButtonGallery.swift: a toggle fixture owns its @State selection
  "list": .list,                // App/Components/ListGallery.swift: the fixture's items; a selectable list owns its selection
  "menu": .menu,                // App/Components/MenuGallery.swift: each fixture in place (TanreiMenu(inPlace:)); plus one opened from a button
  "navigation-bar": .navigationBar,           // App/Components/NavigationBarGallery.swift: the fixture's destinations; the bar owns its selection
  "navigation-drawer": .navigationDrawer,     // App/Components/NavigationDrawerGallery.swift: sections and destinations in order; the modal one in place; plus one presented
  "navigation-rail": .navigationRail,         // App/Components/NavigationRailGallery.swift: header buttons in the header, destinations in order; 360 high
  "loading-indicator": .loadingIndicator,     // App/Components/LoadingIndicatorGallery.swift
  "progress-indicator": .progressIndicator,   // App/Components/ProgressIndicatorGallery.swift: a bar gets a fixed width
  "radio-button": .radioButton, // App/Components/RadioButtonGallery.swift: each fixture is a group of one; plus a group of three
  "segmented-button": .segmentedButton,       // App/Components/SegmentedButtonGallery.swift: the fixture's segments at the natural width; the set owns its selection
  "slider": .slider,            // App/Components/SliderGallery.swift: a fixture owns its value, 240 long; fire counts onCommit; plus every size
  "split-button": .splitButton, // App/Components/SplitButtonGallery.swift: a fixture toggles its own open value, no menu (SPB-15); plus one with a menu
  "switch": .switch,            // App/Components/SwitchGallery.swift: a fixture owns its value; glyphs as SF Symbols on the simulator
  "text-field": .textField,     // App/Components/TextFieldGallery.swift: a fixture owns its value; fire counts inputs
  "time-picker": .timePicker,   // App/Components/TimePickerGallery.swift: each open picker in place on a 336 × 520 stage (text entry 320 tall; horizontal 720 × 480, scrolling sideways); plus one presented
  "tabs": .tabs,                // App/Components/TabsGallery.swift: the fixture's tabs; the row owns its selection
  "toolbar": .toolbar,          // App/Components/ToolbarGallery.swift: the fixture's items; docked 260 wide; a toggle owns its state; plus every variant
  "tooltip": .tooltip,          // App/Components/TooltipGallery.swift: its anchor, the tooltip in the gallery's layer
  "snackbar": .snackbar,        // App/Components/SnackbarGallery.swift: each in place; plus a host shown from a button
  "dialog": .dialog,            // App/Components/DialogGallery.swift: each surface in place, slots filled; plus one presented
  "app-bar": .appBar,           // App/Components/AppBarGallery.swift: each bar across its row, items as icon buttons; plus a screen
]
```

Rows are keyed `<component>.<fixture-id>` — accessibility identifiers `fixture.button.filled-medium` and
`count.button.filled-medium` (how often its event fired).

```sh
xcodebuild test -project packages/swiftui/Gallery/TanreiGallery.xcodeproj -scheme TanreiGallery \
  -destination 'platform=iOS Simulator,name=iPhone 17'
```

The UI tests: every fixture of every spec SwiftUI implements is shown (read from the UI test bundle's
own copy of `specs/`) and none lacks a gallery entry; a tap fires exactly once under every system (BTN-1)
and never when disabled (BTN-2); a list still scrolls from a button under `ripple` (on Button's section alone, `-component button`, so the
drag never starts in the bottom-edge gesture area; judged only on a drag
the app received whole — a drag the simulator did not deliver is replayed, at most three times, and
logged); the button and its captions —
in the platform font and in a named family — grow and shrink with Dynamic Type, one step from the
default included; `performAccessibilityAudit()` in light and dark, every audit, Dynamic Type included
(exempt: contrast findings on disabled elements, as in WCAG 1.4.3, and "Text clipped" on the gallery's
one wrapped caption — see Fonts → Dynamic Type).
For the icon button: a tap fires once and a toggle flips its selected trait, under three systems (ICB-1, ICB-11);
a disabled one never fires (ICB-2). The gallery draws the icon font's glyph where the device has the font and the
SF Symbol a product would use otherwise (the simulator has no icon font).
For the button group: a named group is a container holding its items and an unnamed one adds no element (BGR-6); each
item fires on its own, toggles stay independent, a disabled item never fires, and a connected icon button is the touch
target wide, the connected gap from its neighbour (BGR-3, BGR-5); larger text keeps a connected row one row of equal
heights (BGR-1); its fixtures pass the audit.
For the FAB menu: a tap on the toggle presents the items above it, each a button named by its label with its position
(FBM-13, FBM-20); a tap on an item fires once and closes the menu, a tap outside closes it and fires nothing (FBM-15,
FBM-16), under overlay, ripple and dim; a disabled one is exposed as such and presents nothing (FBM-2); an open fixture's
items are drawn in place above its toggle and end-aligned with it; larger text keeps the toggle and grows the items; its
fixtures pass the audit.
For the carousel: it is a container named by its label holding one button per item, named by the item's label, in order —
the items out of view too (CRL-19); a tap fires the item once under overlay, ripple and dim (CRL-1); a slow drag let go
settles back at the nearest whole position and a fast one goes on to the next, the item there at slot 0, and neither
activates the item it started on (CRL-14, CRL-12, CRL-1); larger text changes neither the carousel nor its items
(CRL-25); and an audit of the fixtures in light and dark, two a launch.
For the date picker: the surface is a container named by its label; each day a button named by its full date (todayLabel
after today's), selected for the chosen date and every day of a range, not enabled while unavailable, and 30 of them for
September — empty cells hidden; the view toggle a toggle named by its month and year, on in the year view; the years
buttons, the displayed one selected (DTP-36, DTP-13); one presented from a button covers the gallery, holds a tapped day
until OK fires once, and closes on its scrim without firing (DTP-1, DTP-5, DTP-6); one docked below a field opens from the
calendar button beside it and a tapped day fires once and closes it (DTP-2, DTP-7); larger text grows the days (DTP-38);
and an audit of the fixtures in light and dark, one a launch, the modal ones — whose calendar scrolls in the row — without
the contrast check, the docked ones with every check, and the text fields' inner input exempt from the hit-area check.
For the time picker: the surface is a container named by its label; the selectors are named Hour and Minute with their
values ("7 AM"), the period two buttons with the chosen one selected, the dial not exposed (TMP-26); a tap on PM keeps the
hour (TMP-11); a drag on the hour dial sets the hour and letting go shows the minutes, where a tap sets any minute (TMP-14);
OK fires once (TMP-5); in text entry the fields hold the time and a tap just above the period's drawing chooses it
(TMP-22, TMP-23); one presented from a button covers the gallery, closes on its scrim without firing, and commits a time
(TMP-1, TMP-4); larger text grows the selectors (TMP-8); and an audit of the fixtures in light and dark, one a launch,
without the Dynamic Type check, as for the dialog, the fields' "Text clipped" guess
exempt as the text field's, and no contrast judged on the part of the horizontal fixture its sideways-scrolling row clips.
For the split button: two buttons named by the title and `menuLabel`, and no element of its own (SPB-17); the leading
half fires once, the trailing half fires nothing, a disabled one never fires (SPB-1 … SPB-3); the split button with a
menu opens it from the trailing half, an item fires and closes it, and the trailing half closes an open menu (SPB-15,
SPB-16); larger text grows both halves together (SPB-12); its fixtures pass the audit.
Return/Space on a focused button is written but **skips** where the simulator gives no keyboard focus.
For the divider, the badge, the progress and the loading indicator: their semantics as VoiceOver gets them (a divider
is hidden unless it is a separator — an unnamed element whose value is its orientation; a badge's label is its anchor's
value; a progress indicator is a progress element with a percentage or `currentValueLabel`, busy when indeterminate; a
loading indicator is busy), and an accessibility audit of their fixtures, light and dark, screen by screen
(`auditFixtures(of:)`: it deals the rows into launches whose rows are all wholly on the first screen, measured, and never
audits a scrolled screen — after a scroll the audit misreports). `performAccessibilityAudit()` does not complete in time over the whole gallery, nor while a
view redraws every frame, so those audits — and the default system's audit, which launches with `-component button`
— run on one section with `-noExplore YES` and `-freezeLoops YES`.
A progress or loading indicator is exempt from the hit-region audit only: it is not interactive.
For the selection controls, the card and the text field: their semantics as XCUITest sees them (a checkbox or switch is a
switch element whose value is 0 / 1, or "mixed"; a radio option is a button, selected while chosen, with its position as
its value, inside a named group; an interactive card is one button named by its label; a text field is named by its
label, never its placeholder), taps on the control and on its label (a text field: typing, `maxLength`, and a tap on its
padding focusing it), and an audit of their fixtures in light and dark. A text field keeps its own keyboard focus: its
rows are not bound to `-focus` (`GalleryComponent.managesFocus`), and the audit's "Text clipped" guess is exempt for its
input (`testTextFieldGrowsWithDynamicType` measures the growth).
For the FAB, the extended FAB and the chip: the label is the name (a collapsed extended FAB's too), a tap fires once
under three systems, disabled never fires; the FAB keeps its square at the largest text size while the extended FAB
and the chip grow; a filter chip is a switch element that flips on a tap; an input chip is two buttons — the chip and its
remove action, named by `removeLabel` — and a tap on the remove action removes without clicking the chip (the input
fixture's `removed.<key>` caption counts it); and an audit of each one's fixtures in light and dark.
For the list and the menu, whose fixtures list items (`GalleryFixture.items`, each a `GalleryItem` with its kind,
props and nested items): a list's static items are no buttons, an interactive item and an option are buttons named by
their headline with their position as their value, a tap fires once, a disabled item never, and an option is selected
by a tap (single) or switched (multiple); a menu's items are buttons named by their label (a checkbox item a switch
that flips, a radio item selected while checked), a disabled item never fires, and a menu opened from a button closes
after an item is chosen (the anchor's value says `open` or `closed`); and an audit of their fixtures in light and dark,
two or three fixtures per launch so that the screen never scrolls (after a scroll the audit misreports rows whose
contrast is 7:1 and more).
For the tabs, the tooltip, the snackbar and the dialog: each tab is a button named by its label (drawn or not), selected
while selected, and a tap on another selects it and fires once — on the selected or a disabled tab nothing (the tab's
drawn text is also listed as a button inside it under the tab bar trait: the tests take the first match); a tooltip that
starts open closes on a tap on its anchor, opens on a long press and closes by itself after the touch timeout (its
anchor's value says `open` or `closed`); an in-place snackbar's action and close button fire once, and a host shows a
snackbar when asked and resolves it with its action; a dialog presented from a button leaves the gallery unreachable,
closes on a tap on its scrim and after its action; and an audit of their fixtures in light and dark (the snackbar's and
the dialog's rows leave room for their shadow, which XCUITest counts in their frames;
the dialog's audit is one fixture a launch and without the Dynamic Type check).
For the toolbar: it is a container named by its label holding its items in reading order — an action a button, a toggle a
switch that is on or off, a Button by its text —; a docked toolbar spreads its items with equal space and a vertical one
stacks them; each item fires once, a toggle flips only itself, a disabled item is not enabled and never fires (under
overlay, ripple and dim); with larger text a docked toolbar grows around its Button while a floating one of icon buttons
keeps its size; and an audit of the fixtures in light and dark, four a launch.
For the app bar: its icon buttons are buttons named by their labels, each firing once, and the bar adds none; a large bar
draws its title under the top row, and only the top row while scrolled; a screen presented from a button (a
`NavigationStack` with its system bar hidden, the bar connected to its scroll view) collapses as its content scrolls and
expands again at the top, and goes back on an edge swipe; and an audit of the fixtures in light and dark, three a launch.
XCUITest lists hidden text as well, so which title copy is exposed is not read
there.
For the segmented button: the set is named by its label; a single-choice segment is a button named by its label (drawn or
not), selected while chosen, its position its value, and a tap on another selects it and fires once, a tap on the selected
one nothing; a multiple-choice segment is a toggle (a switch to XCUITest) switched on and off by a tap; a disabled segment
never fires; larger text makes the segments taller, all equally tall and wide; and an audit of the fixtures in light and
dark, three a launch, with no exemption. (Inside a `ViewThatFits` the same segments failed the audit's Dynamic Type check,
as the dialog's texts do.)
For the slider: each handle is one element named by its label (a range's two by theirs), its value text its value; a tap
on the track moves the handle there and fires one change, a drag along it moves it and fires one change, a tap beside the
track inside the minimum target moves it too, and a tap near a range's start handle moves that one; a disabled slider is
exposed as not enabled and never changes — under overlay, ripple and dim; a swipe that starts on a slider and runs across
it scrolls the gallery and changes nothing (judged, like the button's, only on a drag the app received whole); and an
audit of the fixtures in light and dark, five a launch, with no exemption.
For the navigation bar: the bar is named by its label; each destination is a button named by its label (drawn or not),
selected while selected, its badge's words its value; a tap on another selects it and fires once, a tap on the selected one
fires once more (reselect) and keeps it, a disabled one never fires; the bar grows with larger text; and an audit of the
fixtures in light and dark, four a launch — exempt: "Text clipped" on a destination, whose label is one line and truncated
by design, and "Contrast failed" on the selected destination, where the audit
measures the default system's active indicator against the surface. XCUITest lists
the container as Other: the tab bar trait is not visible to it.
For the navigation drawer: the drawer is named by its label; each destination is a button named by its label, selected
while selected, its value its position among all the destinations and then its badge text; a heading is text, not a
button; a tap on another destination selects it and fires once, a tap on the selected one fires once more (reselect) and
keeps it, a disabled one never fires (under overlay, ripple and dim); a modal drawer presented from a button leaves the
gallery unreachable and closes on its scrim, on a swipe toward its leading edge, and after a destination is chosen (which
fires); larger text keeps the drawer's width and makes a destination taller; and an audit of the fixtures in light and
dark, one a launch, with no exemption. The gallery's drawers are 440 high, so no row is cut by the scroll view (the audit
reads a cut row's contrast against what lies beyond it).
For the navigation rail: the rail is named by its label; the menu button comes first, above the destinations, and fires
its own click; the destinations are checked as the bar's (selection, change, reselect, disabled, badge words, a label that
is not drawn); larger text keeps the rail's width and makes a destination taller; and an audit of the fixtures in light
and dark, one a launch — exempt: "Text clipped" on a destination (two lines, then truncated, by design) and on the badge's
count XCUITest lists inside it, and "Contrast failed" on the selected
destination.

### Snapshots

Every spec fixture has a baseline PNG at
`Tests/TanreiTests/__Snapshots__/Tanrei<Name>Tests/<fixture-id>.png`, and each shipped preset one representative
fixture at `…/<system-id>/<fixture-id>.png`, rendered with
`ImageRenderer` at scale 2 in the light scheme, with the system font (so baselines do not depend
on whether Inter is installed), on a `surface` background. The same policy keeps the icon font out: an icon
button's fixtures draw the SF Symbol a product would pass (`heart`, `heart.fill` when on), so a machine with
Material Symbols installed records what CI renders. `swift test` compares against them (a small antialiasing tolerance applies — it also absorbs the OS
renderer's ±1/255 cache-dependent jitter; tests that assert two views draw IDENTICALLY use
`Snapshot.renderExact`, which replays the display list into a CoreGraphics context and is bit-stable)
and fails when a baseline is missing or differs; the differing render is written to
`$TMPDIR/tanrei-snapshot-failures/`.

Recording is deliberate:

```sh
TANREI_RECORD_SNAPSHOTS=1 TANREI_SNAPSHOT_REASON="cupertino draws continuous corners" swift test
```

Without a reason nothing is recorded.

This rewrites only the baselines whose pixels changed. A snapshot diff is a finding —
re-record only when the change is the intended result of a spec or token change, and say so
in the changeset. Baselines are recorded on macOS; text rasterisation can differ between
major OS versions.

Interaction tests host the button in an off-screen AppKit window and send it real mouse
events, so they need a macOS session with a window server.
