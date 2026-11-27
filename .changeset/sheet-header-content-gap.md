---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
---

Side sheet and bottom sheet: the content starts a gap below the header. With a headline or a close button, the
content's first line began directly below the header, against its divider. It now starts
`comp.side-sheet.content.padding-block-start` / `comp.bottom-sheet.content.padding-block-start` below it. Both are
new tokens that alias `sys.space.space100` (8). Material 3 starts a dialog's content 8 below the divider under its
headline (material-web's scrollable dialog), and Fluent's drawer puts 8 between its headline and the divider below
the header. m3-like and cupertino keep the 8. Apple publishes no figure for the space between a sheet's title and its
content. A bottom sheet whose content is flush (`inset` false) still reaches the header: content that pads itself
sets its own space.

The web draws the gap. The native platforms receive the new tokens but do not draw the gap yet. The baselines of every
side-sheet fixture and of the bottom-sheet fixtures with a header move 8 down below the header, in every system.
