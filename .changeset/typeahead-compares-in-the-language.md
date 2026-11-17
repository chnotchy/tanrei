---
'@tanrei/web': patch
---

Typeahead in the select, the list, the menu, the tree view and the menubar compares what is typed with the labels as
the element's language compares (the nearest `lang`, through shadow roots; the browser's language where there is
none), by base letters: neither case, nor the width of a character, nor the marks on a letter count, so "e" finds
"École" and a full-width "ｚ" finds "Zebra", while the letters a language tells apart stay apart — under `lang="tr"`,
"i" finds "İzmir" and not "Irmak", and "ı" finds "Irmak". Before, labels were lower-cased without the language and
compared character by character, so a marked or full-width first letter was never found and Turkish i matched
dotless I. A `lang` that is not a language tag compares in the browser's language.
