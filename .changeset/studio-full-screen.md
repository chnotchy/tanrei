---
'@tanrei/studio': minor
'@tanrei/docs': minor
---

**Theme Studio is a tool of its own page.** On the docs site it moves to `/studio/` (and `/<language>/studio/` in each
translation): the whole window, with the Studio's own bar and none of the documentation's header or navigation. The
page that held it, Foundations › Theme Studio, is now a short page about the tool that links to it.

- **The frame.** A bar across the top — the host's brand and items, **undo** and **redo**, the file's state — and under
  it the rail of levels, a large preview and, on the right, the panel of what the level edits. Each column scrolls by
  itself. The panel is resized by a handle (Tanrei's Handle: dragged, or from the keyboard — the arrow keys, Home and
  End, Enter to its least and back), and the width is kept in the browser. In a narrow window the three stand in one
  column. The controls are the ones the Studio had; they moved into the frame as they were.
- **Undo and redo** step through what was committed, from the bar or with ⌘Z and ⇧⌘Z (Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y
  elsewhere); in a field that holds text the keys stay the field's. With a file behind the Studio (`tanrei studio`),
  each step is saved like any other edit.
- **The layer is in the address.** On the docs site the layer is written into the page's fragment (`#layer=…`, the
  layer file's text compressed and in base64url), so a link copied from the address bar opens the Studio on the same
  layer, in any browser. A link never writes over the layer a browser kept: the Studio shows the link's layer under a
  notice, keeps the visitor's own until they edit the link's or choose **Keep this layer**, and **Back to my layer**
  returns to theirs.

**Breaking (`mountStudio`).** The Studio now takes the whole page it is mounted in and draws its own bar; a host gives
its items to that bar with the new `bar: { start, end }` option instead of drawing a bar of its own (the standalone
app's brand, file, language and theme are now in the Studio's bar). `address: true` keeps the layer in the page's
address. The Studio no longer writes `data-ts-mounted` on the document's root, and its stylesheet no longer sets
`--sl-content-width`: a host gives it a page of its own.
