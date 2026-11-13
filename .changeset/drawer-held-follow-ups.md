---
'@tanrei/web': patch
---

Navigation drawer: three motions that could be drawn at once now play from their first frame. A modal drawer that opens
starts the menu button's change of colors (it loses focus) in the first frame drawn after the opening, with the drawer's
slide; WebKit dated it from the frame before, so on a loaded machine the button could take its new colors before the
drawer's first frame. A drawer held below an app shell's header that moves to a new presentation starts its panel's and
its scrim's move in the first frame drawn after the change; WebKit drew the panel in its new place at once where the
change's task outlasted the move. A standard drawer opened or closed in the frames just after its room changed (or after
a key's step on its resize handle) slides by its motion, where it was drawn opened or gone at once.
