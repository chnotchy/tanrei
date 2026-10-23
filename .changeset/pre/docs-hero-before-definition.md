---
'@tanrei/docs': patch
---

Documentation site: the home page's hero is drawn right before its elements are defined, and nothing in it moves when
they are.

- The primary action's label is never drawn in the plain link's color over the Button's dark fill. The plain anchor
  each link form holds until its element is defined is now taken away in the same task as the element is defined, by
  the first module script of every page; it was taken away only once the whole web package had arrived, while the
  header's script had defined the Buttons long before (about 3.9 s on a throttled phone, 0.4 s on a desktop line).
- The title and the copy stand at the top of the hero's first column instead of at the middle of the specimen beside
  them, and the specimen's stage holds the rows its Buttons take once drawn: the desktop home page's layout shift
  (CLS) was 0.058 and is 0.
