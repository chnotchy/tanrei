---
'@tanrei/studio': patch
---

Theme Studio removes the family whose remove button was pressed, even while a family removed a moment before is still
leaving the font stack. A removed family stays the list's child, drawn leaving, until its motion has ended, and the
Studio read the place of the family to remove among all the list's children: a second removal during that motion
took the next family's place, and removed nothing or the wrong family. The Studio now counts only the list's items,
as the list asks of a script that reads its children (`tanrei-list-item:not([data-leaving])`).
