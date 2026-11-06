---
'@tanrei/studio': minor
'@tanrei/docs': minor
---

**Theme Studio: the start point, first in the bar.** It names what the layer starts from, and its menu offers the
others: **Tanrei**, the default system; **Core**, Tanrei's root layer, listed and not offered yet — it still holds the
default system's values, and becomes a blank start once they are neutral — with that reason on the item; and, under
**Theme gallery examples**, m3-like, cupertino and m3-expressive-like, each marked as an example, not an official
design. Another start keeps the layer's id, name and description on that system's defaults.

- **Import a file…**, the menu's last item, loads a `<id>.system.json` in the layer's place through the browser's own
  picker. A file that is not JSON, that the schema refuses, or that extends a system the Studio does not have is not
  loaded, and the top of the panel says why, problem by problem. A file the schema accepts is loaded, and what the
  token engine and the build's checks find in it is listed there.
- A layer that holds changes asks before a new start or a file replaces them, and each is one step to undo. The Base
  system panel asks by the same rule (a choice of components is a change too).
- The page's API has `startFrom(id)`; `studio.startPoints()` and `studio.holdsChanges(layer)` are the core's.
- The docs' Theme Studio page says where a layer starts, in every language.
