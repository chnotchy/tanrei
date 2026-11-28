---
'@tanrei/web': patch
---

File item: in a row whose body is pressable (`interactive` or `href`), the action next to the body (retry, or remove
where it stands alone) no longer reaches over the body's end. Under a system whose targets are larger than the actions
(m3-like), its hit area reached across the whole of `comp.file-item.row.container.gap`, past the body's bounds grown by
`comp.file-item.row.container.outset`, so a press on the end of the body went to the action. It now stops halfway
across the space between the two, in both directions. Beside a body that is not pressable the action still reaches as
far as the gap. FIT-18 now says this in words. Nothing is drawn differently.

The bundle budgets of file-upload and of `@tanrei/web/all` are raised by what this fix and the wrapped breadcrumbs' fix
add (129 and 361 bytes gzip): each stood within 60 bytes of its budget before.
