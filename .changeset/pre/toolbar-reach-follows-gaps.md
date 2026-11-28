---
'@tanrei/web': patch
---

Toolbar: hit areas now follow the gaps when the tokens change, and the overflow button stops halfway to the item before
it.

- The toolbar measures how far each item may reach toward its neighbours. It measured again only when an item or the
  toolbar itself changed length. A change of tokens can move the items without changing the toolbar's length: wider
  spaces between a group's items can make up for a narrower line between two groups. The reach measured for the old
  gaps was then kept, and two items reached over each other across the line. The toolbar now also watches its spaces
  and lines.
- The overflow button reached its whole target toward the item before it, past the middle of a narrow gap. It is now
  capped like an item.

TBR-9 now says both. Nothing is drawn differently.

The toolbar's bundle budget is raised to hold what this fix adds (162 bytes gzip): it stood 76 bytes under its budget
before. The budget of `@tanrei/web/all` is raised to hold what the five hit-area fixes released with it add together
(414 bytes gzip).
