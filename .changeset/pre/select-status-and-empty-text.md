---
'@tanrei/web': minor
---

Select and Select field have `status` (`idle`, `loading`, `error`; default `idle`), `statusText` (`status-text`) and
`emptyText` (`empty-text`): the combobox's and the search's three properties, with the same values and meaning. While
`status` is `loading` the list shows a small loading indicator named by `statusText` after its options and is marked
busy; while it is `error` it shows `statusText` in the error color and reads it at once; `statusText` alone is shown
after the options and read politely. While the select holds no option and has no status, it shows `emptyText` in the
list. The row stands under the options, outside the part that scrolls, and is never an option. Its live regions are
given the row's text once the list is shown, so what it already says when the list opens is read too. The status row
is the `status` part.

The product's words have a new key, `noOptionsText`, which an empty `emptyText` reads (the English word pack:
"No options"). The combobox's `emptyText` keeps reading `emptyText`, "No matches": a text that matched nothing and a
list with nothing in it are different things to say.

Tokens: `comp.select.status.typescale`, `comp.select.status.color` and `comp.select.status.error.color`, which hold the
combobox's status row's values in every shipped system.

What changed for an existing page: a select with no option still does not open unless it is given a status, a status
text or an empty text, as before; given one, it now opens and its list holds that row alone.

Baselines: new fixtures `open-loading`, `open-status`, `open-status-error` and `open-empty`. No existing image changes.
