---
'@tanrei/web': patch
---

Tabs: a row of tabs now appears already drawn as it is. Before, for the first 150 ms after a row appeared, its
selected tab faded in: the icon filled in, a tonal label grew bold, a disabled selected tab's indicator faded to the
disabled color, and under some systems (m3-like) the label and icon colors faded too. Selecting a tab, hovering,
focusing and pressing animate as before, and the look at rest is unchanged.
