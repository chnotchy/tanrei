---
'@tanrei/web': minor
---

Code block: the copy button no longer stands over the code. A block with `copy` and no title or language label used to
draw the button over the top end corner of the code, so a first line wider than the room before the button ran under
it (the end of an import at 390 px wide, for example). The block now always draws its header's row when it has a copy
button, with the button alone there where there are no words, and the code begins below that row — at every width,
wrapped or not, scrolled or not, in either direction. What breaks: such a block is one header row taller; the padding
after the longest line and the wrapped rows are no longer widened for the button, and the patch the button stood on
is gone. The visual baselines of the code block's copy fixtures without a title change with it.
