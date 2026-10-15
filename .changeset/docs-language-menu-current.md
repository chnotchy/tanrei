---
'@tanrei/docs': patch
---

Documentation site: the header's language menus mark the language being read as the menu's current link item
(`current`), not with a trailing check glyph. Assistive technology is now told which language is current
(`aria-current="page"` on its link), and the row is drawn with the menu's current fill, as the menu specifies for the
destination a person is at; a check belongs to a choice the menu holds, which a language link is not.
