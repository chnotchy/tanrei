---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/cli': minor
'@tanrei/mcp': minor
---

The edge of a region that stays in place is drawn at rest. The app bar's bottom edge, the dividers below a dialog's
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
