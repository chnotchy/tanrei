---
'@tanrei/docs': patch
---

Documentation site: an anatomy or measure figure is never drawn over a fixture that the fixture gallery draws in a window
of its own. A modal fixture is one of these. The bottom sheet's anatomy figure used to stand on its `modal` fixture, which
opened a real modal sheet in the page's own top layer. The sheet lay at the bottom of the window, outside the figure,
over a scrim that covered the whole site, and a press of Tab took focus into it.

Component specs: the bottom sheet's `anatomyFixture` is `standard-header`. This standard sheet with a headline and a
close button is drawn in the layout at rest, and it shows every part that has a box: the container, the drag handle and
its grip, the header, the headline, the close button, the divider, the content and the handle's focus ring. Only the
scrim has no box.
