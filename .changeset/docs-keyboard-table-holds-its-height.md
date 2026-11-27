---
'@tanrei/web': patch
'@tanrei/docs': patch
---

Keyboard shortcut: a page written on a server can draw the keys before the element is defined, as the element will
draw them. `keyboardShortcutContent(keys, { label })` from the new `@tanrei/web/keyboard-convention` gives the markup to
write between the tags (the keys in both conventions, and the text read in their place), the new
`@tanrei/web/keyboard-shortcut.css` draws it with the element's tokens, and `keyboardPlatformScript()`, inline in
`<head>`, puts the platform's convention on `<html>` (`data-tanrei-keyboard-platform`) by the element's own test, so the
stylesheet shows the convention the element will resolve: its own `convention`, else the nearest ancestor's
`data-tanrei-keyboard-convention`, else the platform's. The cloak leaves a shortcut that holds these keys to that
stylesheet, so they are shown under it too. The element now writes its keys from the same table; what it draws is
unchanged.

Documentation site: a component page's keyboard table keeps its height when its keys are defined. Before, a key was
drawn as its words in one cap until the Keyboard shortcut was defined, and then in the reader's convention (on Apple's
platforms one cap per key, in symbols), so the rows wrapped again: the Date and time picker's table went from 1719 to
1654 px at 390 px wide and from 1052 to 1080 px at 1440, the Japanese Select's from 1248 to about 1130 px at 390. Each
key now holds the web package's own content, drawn by its stylesheet; the site writes no key itself.
