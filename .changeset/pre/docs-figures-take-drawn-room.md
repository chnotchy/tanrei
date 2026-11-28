---
'@tanrei/docs': patch
---

Docs: a figure below the view takes the room it is drawn in before the reader reaches it. A figure's elements are
defined as it comes near the view, and until then it held the room of its elements before they are defined (an open
date picker's 141 px for its 941), so a reader who paged down or flung the page reached it holding the wrong room and
saw the page pushed down as it was drawn: at a phone's width the Date and time picker's page moved by 0.074, the Text
field's by 0.075 (0.236 in Arabic) and the Japanese Select's by 0.078. Right after the page's load, the
elements the figures hold are defined, and each figure still below the view takes its drawn room then, at the
reader's width and in the page's language; its actions are still drawn as it comes near. The same pages now move by
0.013 at most, all of it a tokens' table, as they are paged through.
