---
'@tanrei/web': patch
---

Typeahead in the select, the list, the menu, the tree view and the menubar compares what is typed with the labels as
the components' filters compare (the combobox's, the navigation drawer's and the tree view's): neither case, nor the
width of a character, nor the marks on a letter count, so "e" finds "École" and a full-width "ｚ" finds "Zebra", while
the two sound marks of kana are kept, so "か" does not find "が". It is the filters' own comparison, so typing to an
item and filtering for it find the same labels. Before, labels were lower-cased and compared character by character,
so a marked or full-width first letter was never found. The specs of the five typeaheads now state the combobox's
rule in its words.
