---
'@tanrei/web': patch
---

Navigation drawer: a modal drawer written open now moves focus to its selected destination (or else its first
focusable element) when it is inserted into a page that is already drawn, as it does when it is mounted with the page.
Inserted together with its items, the drawer was shown before the items had drawn their cells, so focus stayed on the
drawer's dialog. Focus now moves once the items have drawn, in the same task, before the drawer's first frame. Items
that arrive after the drawer is shown take the focus it could not give, while focus is still on the drawer's panel:
items the product adds later, or items the browser has not yet parsed.
