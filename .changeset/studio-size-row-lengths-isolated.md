---
'@tanrei/studio': patch
---

**Theme Studio's Size row keeps each length whole in Arabic**: the control height and the minimum target are each a
left-to-right run of their own inside the sentence, so the minimum's unit no longer stands apart from its digits
("36 الأدنىpx"), and the sentence is read from the right.
