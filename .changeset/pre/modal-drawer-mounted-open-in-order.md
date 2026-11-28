---
'@tanrei/web': patch
---

A collapsible modal navigation drawer that is inserted into the page already open now opens in the write that follows
the reads every component makes together, as every other modal surface does. So when a product draws such a drawer in
the same task as it sets a dialog's or a modal layer's `open`, the one that comes later is on top and takes focus, in
either order. Before this, the drawer opened in its own first update, under a dialog set open before it in that task.

The drawer now draws its header for the buttons, title and main action it holds from its first render, read from its
children. Before this, the header was drawn only once its slots had reported what they held, one update later. A drawer
written open with no selected destination still gives focus to its first header button (the menu button), not to the
first destination after it (NVD-19).

SRC-9 now says where focus goes when a search's view closes and the bar's input or the trigger cannot take focus back:
to the platform's default for a closed overlay, as POP-22 and MDL-5 say. The web already does this.
