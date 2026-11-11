---
'@tanrei/web': patch
---

Fewer forced style and layout passes when many carousels, steppers, paginations, segmented buttons or number tickers
are built at once. Each of them measured in its own update — the carousel its tokens, its width, its direction and its
scroll offset; the stepper and the pagination whether their full form fits; the segmented button whether its size draws
a check — and had the browser style and lay out the page for it there, once for each instance and more. They now read
after the renders of the task, together with every other component's, and write after all of them; the carousel then
scrolls every row once all their tracks are laid out. One resize observer watches every instance of each of the four,
so a window resized under a hundred of them is read in one pass too. A carousel reads its autoplay interval only where
its progress fill is drawn, and a number ticker reads its animation, and the motions to stop, only when it changes from
a number it drew. A hundred of any of them now cost the passes ten do. Nothing drawn changes.
