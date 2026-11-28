---
'@tanrei/web': patch
---

App shell: the resize handle of a navigation drawer no longer covers the start of the main content. The handle's
target lies wholly beside the drawer's end edge and is a pointer target wide (`sys.target.pointer`, or
`sys.target.touch` for a coarse pointer): 36 in the default system. The expanded gutter is 32, so the target reached
4 into the main content, and a press there went to the handle instead of the content.

While the navigation region holds a drawer that draws its resize handle, the shell now insets the content of the main
region, and of an aside stacked in its column, from the start by the greater of the gutter and the handle's target.
Under the default system a full-width main region beside a resizable drawer moves its content 4 toward the end in an
expanded window. A contained one wide enough to be centred does not move. A drawer with `resizable="false"`, a modal
drawer and a frame with no drawer keep the gutter alone. Before the drawer is defined, `app-shell.css` reads the same
from its attributes, so loading it moves nothing.

The drawer shows that it draws its handle with a new state attribute, `data-resize`.
