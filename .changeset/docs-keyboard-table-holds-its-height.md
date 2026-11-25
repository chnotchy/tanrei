---
'@tanrei/web': patch
'@tanrei/docs': patch
---

New entry point, `@tanrei/web/keyboard-convention`, for a page written on a server that draws a keyboard shortcut's keys
before the element is defined: `keyboardPlatformScript()`, inline in `<head>`, puts the platform's convention on
`<html>` (`data-tanrei-keyboard-platform="apple|standard"`) by the element's own test of the platform, and
`shortcutLegends(keys, convention)` gives the legends the element draws for each chord in that convention. The
Keyboard shortcut now writes its keys from the same table; what it draws is unchanged.

Documentation site: a component page's keyboard table keeps its height when its keys are defined. Before, a key was
drawn as its words in one cap until the Keyboard shortcut was defined, and then in the reader's convention (on Apple's
platforms one cap per key, in symbols), so the rows wrapped again: the Date and time picker's table went from 1719 to
1654 px at 390 px wide and from 1052 to 1080 px at 1440, the Japanese Select's from 1248 to about 1130 px at 390. The
page now draws each key's caps in both conventions before the element is defined and shows the reader's, as the element
resolves `auto`; the words are read in place of the caps.
