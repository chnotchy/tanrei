---
'@tanrei/web': patch
---

Navigation drawer: a collapsed drawer in a parent narrower than its column (72 in the default system) now unfolds and
folds back without a jump. It already takes the parent's width at rest. Through the change of form its panel now stays
at that width too, laid out from its start edge, and never reaches past its parent. Before, the unfold started from the
column's full width, a jump of the difference in its first frame. When the unfold ended, the drawer was drawn at the
width it asks for, anchored at its end edge and cut at its start, which hid its icons. It now ends at the parent's width.
This holds for a standard drawer, and for one an app shell holds beside the content when the frame leaves it less room
than its column. Sliding in still starts no motion of the panel's own when the slide ends.

The `all` bundle's budget rises from 669200 to 669300 bytes gzip, the next hundred above 669288, which it measures with
this change and the next one (a modal drawer's rows under a scroll bar): 139 bytes more than before them, for the room
read again as a change of form ends and the window measured while the drawer is over the content.

No baseline changes: no fixture has a parent narrower than its column while it changes form.
