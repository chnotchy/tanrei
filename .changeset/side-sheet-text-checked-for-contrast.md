---
'@tanrei/web': patch
---

**`<tanrei-side-sheet>`: the text in a sheet is checked for contrast.** The start edge is drawn above the content, by an
element that axe's `color-contrast` rule took for one covering the text — the content and the action buttons' labels were
left incomplete ("overlapped by another element"). The `outline` part now holds the edge's values while hidden, and its
`::before` draws them over the part's whole box, at the same place in the paint order; nothing a sheet draws changes.
