---
'@tanrei/web': patch
---

Navigation drawer: a modal drawer now always leaves a strip of scrim you can press to close it, however narrow the
window. Over the content the drawer stays `container.width` wide (240 in the default system), but it never comes closer
to the window's end edge than `sys.target.touch`, and that limit includes its start inset. The scrim is the press target
that closes the drawer, and it now stays at least a touch target wide (WCAG 2.5.8). A modal side sheet keeps the same
distance, and an app shell keeps it beside its navigation. Before, the drawer was limited only by the window's full
width, so in a window narrower than 240 plus the touch target the strip shrank and then disappeared.

The limit applies to a drawer that slides in, to a collapsible drawer that widens from its column, and to a drawer an app
shell holds below its header. It follows the window as the window resizes. Each row is laid out at the narrower width.
The slide still starts and ends wholly off-screen.

A collapsed drawer whose parent is narrower than its column (72 in the default system) now takes the parent's width. Its
icons stay where they are, the overflow is cut at its end edge, and its edge line is drawn there. This applies to a
standard drawer and to a collapsible modal drawer's column. Before, a standard drawer was cut at its start edge, which
hid its icons, and a collapsible modal drawer's column reached past its parent. Opened from there, the column widens
from the width it is drawn at.

No baseline changes: every fixture's window is wide enough that the limit leaves `container.width` whole.
