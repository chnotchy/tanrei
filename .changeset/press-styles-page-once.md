---
'@tanrei/web': patch
---

A press has the page styled fewer times before its frame. Three reads of the cascade made in the task of a press each
brought the whole document's style up to date in WebKit, after the press and the focus it moved had changed it:
press-hold, read when the press ended; the focus style, read when a press focused a control; and whether a font face is
loading, asked after a control measured its glyph (a Button whose label changed, a list's mark). Press-hold is now read
with the pressed feedback, when the press begins and before it writes anything; the focus style of a focus that draws
no indicator (one that came with a press) and the state of the faces are read in the next frame callback, with the
style that frame computes anyway. Keyboard focus still reads its focus style at once. Choosing a theme in the
documentation's Appearance panel in CI's WebKit (a page of ten thousand elements, 40 presses each way): from the press
to the change, a median of 54 ms instead of 88 and at most 144 instead of 317; to the frame after it, a 90th percentile
of 176 ms instead of 251. Nothing is drawn differently.
