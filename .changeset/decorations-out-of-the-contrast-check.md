---
'@tanrei/web': patch
---

**The text under a component's own decorations is checked for contrast.** axe-core's `color-contrast` rule builds its
own paint order of every visible element with a size, whatever its `pointer-events`, and left a text under any of them
incomplete ("overlapped by another element") instead of checking it, so faint text there was never reported. These
boxes lay over text: the focus indicator's box of `<tanrei-tabs>` (and so `<tanrei-tab-view>`), `<tanrei-snackbar>`,
`<tanrei-code-block>`, `<tanrei-bottom-sheet>`, `<tanrei-side-sheet>`, `<tanrei-popover>`, `<tanrei-dialog>` and
`<tanrei-scroll-area>`; the selected tab's state layer; the side sheet's start edge (`::part(outline)`); the state layer
of a file item's row; and the navigation bar's fill, which lies under the label at a negative level that axe-core takes
for one above it. Each box now holds its values and draws them by its `::before`, at the same place in the paint order
(the side sheet's edge part holds the edge's color; its width is `--tanrei-comp-side-sheet-outline-width`), or the
labels are ordered above the fill as they were drawn. Nothing a component draws changes, in any fixture, theme, hover
or focus, in Chromium, Firefox or WebKit.
