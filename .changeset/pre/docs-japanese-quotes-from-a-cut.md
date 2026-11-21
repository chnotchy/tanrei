---
'@tanrei/docs': patch
---

Documentation site: a page not in Japanese no longer downloads whole files of Noto Sans JP for the Japanese it
quotes.

- Noto Sans JP comes in about 120 files by Unicode range, and a page takes each whole file one of its characters is
  in. The Button page's guideline quotes 保存 and デプロイ: six characters, 107 KB of three files. The site now also
  registers the family cut down to the Japanese characters its specs and its pages in the other languages hold, as
  "Noto Sans JP Cut", named before Noto Sans JP in each text stack on a page whose language is not Japanese. The
  characters are drawn with the same glyphs at every weight; one the cut does not hold falls through to the family's
  own files. A page in Japanese is drawn as before and never asks for the cut.
- What a page transfers before it is idle, at 412 px: the Button page 1196 KB → 1152 KB, Text field 1498 → 1313,
  Combobox 1497 → 1414, Field 1431 → 1230, Text input 1386 → 1289, Table 1373 → 1218. The home page draws no Japanese
  and takes 1 KB more (the cut's faces in the stylesheet).
- A font file is no longer inlined into the site's stylesheet however small it is: inlined, every page would carry it.
