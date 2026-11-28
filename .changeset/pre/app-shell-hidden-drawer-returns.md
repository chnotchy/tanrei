---
'@tanrei/web': patch
---

App shell: in an expanded window, a responsive navigation drawer with no collapsed form can be shown and hidden again
by the frame's menu button, in a frame without a header and in one with `menu-button-placement="drawer"`. Before, those
frames showed no menu button there: a drawer whose `expanded` was false could not be brought back, and a drawer that
was shown could not be hidden. Such a drawer has no menu button of its own, so the frame now shows its menu button
beside the content too, whether the drawer is shown or hidden. A frame without a header shows the `menu-button` slot's
button alone in the header's place, and the drawer begins below it, as the main region and the aside do, and stays in
view below it while the page scrolls. With a header and the `drawer` placement the frame shows the header's marked
button. Each activation shows or hides the drawer with one `expandedchange` and no `navigationopenchange`. Focus stays
on the button, which says expanded while the drawer is shown and collapsed while it is hidden. Nothing else changes in
any presentation.
