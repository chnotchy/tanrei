---
'@tanrei/web': patch
---

**`<tanrei-card>`: the text in a card is checked for contrast.** The outline is drawn above the content, by an element
that axe's `color-contrast` rule took for one covering the text: it left every text in a card incomplete ("overlapped by
another element") instead of checking it, so faint text in a card was never reported. The `outline` part now holds the
edge's values and its `::before` draws them, at the same place in the paint order; nothing a card draws changes, in any
variant, state or engine. In forced colors the part still draws its system-color border itself.
