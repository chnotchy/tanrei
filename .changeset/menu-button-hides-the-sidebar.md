---
'@tanrei/web': minor
'@tanrei/react': minor
---

In a wide window an app shell's menu button hides the navigation drawer beside the content and shows it again, in the
same place, whatever the drawer's form (NVD-105, APS-7). Hidden, the drawer slides out over its exit motion while the
main region takes its width, takes no width and is exposed to nothing, and the button says collapsed and names
nothing; shown, it slides back in over its enter motion. Focus stays on the button, and focus that was in the drawer
moves to it. The choice is the drawer's new `standardHidden` (`standard-hidden`, reflected), and the drawer fires
`standardhiddenchange` (React: `onStandardHiddenChange`) when a person changes it. Showing the drawer also opens it, so
it is over the content when the window narrows; a drawer hidden beside the content is closed in a narrower window and
hidden again when the window widens. `navigationOpen` follows the drawer's `open` beside the content too, and
`navigationopenchange` fires where it changes. The docs site's sidebar keeps the reader's choice across visits.
**Breaking**: in a wide window the app shell's menu button no longer folds a collapsible drawer to its column (its own
menu button and its resize handle still do), and `expanded` no longer hides a responsive drawer that is not collapsible
— a product that hid one with `expanded="false"` writes `standard-hidden` instead, and one that kept the person's choice
from `expandedchange` for that keeps what `standardhiddenchange` carries.
