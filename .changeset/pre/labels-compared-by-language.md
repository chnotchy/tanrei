---
'@tanrei/web': patch
---

List, menu, select, combobox, tree view, menubar, navigation drawer and search: typed text is now compared with a
label as the label's language compares, as their specs say (SEL-33, LST-17, MNU-7, TRV-23, MBR-12, CMB-25, CMB-29,
CMB-38, NVD-81, TRV-56, SRC-55). Typeahead, the combobox's filter and the run it marks, the filters of the navigation
drawer and the tree view, and the search's completion compare by the collator of the language of the label's nearest
`lang` (`Intl.Collator`, for searching, at base strength), without regard to case, to the width of a character or to
the marks on a letter. Under `lang="tr"` a typed "i" now finds "İzmir" and not "Isparta", and "ı" finds "Isparta"; a
typed "ss" finds "Straße" in every language; and kana in hiragana finds the same kana in katakana, and a large kana
the small one. The two kana sound marks stay the letter's own in every engine ("か" does not find "が", nor "ば"
"ぱ"). Before, each letter was folded by itself for every script alike, and a typed letter that would end inside a
ligature letter of the label found it ("f" found "ﬁle"); now only whole letters of a label answer.
