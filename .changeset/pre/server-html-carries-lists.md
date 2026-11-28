---
'@tanrei/react': patch
---

**A page rendered on a server carries its lists.** On a server, a wrapper wrote each string, number and boolean prop as
the attribute its element reads, but skipped every list, even where the element reads that list from an attribute: a
chip field's entries (`value`), a multiple combobox's, list's, segmented button's, tag group's, toolbar group's or tree
view's `values`, a keyboard shortcut's `keys`, a file control's `accept`, disabled dates and the rest. So the HTML held an
empty chip field or combobox: a person saw it empty until the page was hydrated, and a reader without scripts never saw
the entries. Each such list is now written as the element's converter writes it, or as JSON, wherever the element reads
that text back as the same list, entry for entry; a list at its default writes nothing, and a list the element would read
otherwise is still set in the browser. A checkbox group's `value`, which no attribute carries, is still given by the
client once it mounts.
