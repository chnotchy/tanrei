---
'@tanrei/web': patch
---

**`<tanrei-chat-composer>`: the counter is checked for contrast.** The capsule's edge was drawn by an element over
everything the capsule holds, which axe's `color-contrast` rule took for one covering the counter: it left the counter
incomplete ("overlapped by another element") instead of checking it. The edge's box now draws nothing itself and its
`::before` draws the edge — border, widths, colors and their transition — at the same place in the paint order. Nothing
the composer draws changes, in any state or engine.
