---
'@tanrei/studio': minor
'@tanrei/cli': patch
---

**The standalone Theme Studio (`tanrei studio`) has a bar of one line**, wide and on a phone, as the documentation's
Studio page has. Its language and its theme are chosen in one menu, a glyph at the end of the bar (it was a select and a
button). The line beside the brand that repeated the file's path, what it extends and its targets is read, not drawn —
Inspect bears the file's name — unless it says there is no file behind the Studio, or why the session could not be read.
On a phone the brand, a link to the same page, is left out; the file's state is its dot (its word is read), and Build
shows its glyph alone, named by its label and shown its name by its tooltip. Build is made once now, so a build that is
running keeps its button disabled while the file's state changes.
