---
'@tanrei/web': patch
---

Badge: a badge with no anchor (nothing in its slot) now draws nothing, takes no space and says nothing, and a debug
build reports it. Before, it drew its dot or pill hanging off an empty box, over whatever came next. Given an anchor
later, it draws on it and describes it at once; when its anchor is taken away, the anchor gets its own description
back. A badge on an anchor is unchanged.

Navigation drawer: the trailing slot of a destination and of a group no longer suggests a badge. A count at the end of
a row is the row's `trailing-text`, read with the row; a badge marks the icon (`badge`).
