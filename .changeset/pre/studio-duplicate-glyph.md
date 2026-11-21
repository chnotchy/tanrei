---
'@tanrei/docs': patch
---

Theme Studio on the documentation site: the overview's menu sample draws its "Duplicate" item's icon (`library_add`)
from the first frame, instead of its letters until the full icon file has loaded. The glyph lists now also read a
glyph attribute given as an object's quoted key (`{ 'leading-icon': 'library_add' }`), the form the Studio's code uses
to build elements.
