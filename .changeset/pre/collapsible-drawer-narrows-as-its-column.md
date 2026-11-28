---
'@tanrei/web': patch
---

Navigation drawer: a collapsible modal drawer narrowing back to its column is exposed as its column is (NVD-23,
NVD-40). From the moment it closed until the column took its place, its closed `<dialog>` was still exposed as a dialog
named by the drawer's label, around the navigation landmark; while it narrows the dialog now takes the landmark's role
and name (`role="navigation"`, its inner `<nav>` `role="none"`) and is not focusable itself, so assistive technology
meets the navigation landmark and its destinations, as in the column, and no dialog. Opened again while it narrows, it
is the modal dialog again.
