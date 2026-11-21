---
'@tanrei/web': patch
'@tanrei/react': patch
---

**A menu opens at the top of its list (MNU-68).** In a short window, a menu whose items were taller than the room
opened with its list scrolled to its end in Chromium and WebKit, so its first items were hidden. Focus on the first
item was scrolled into view through the opening motion, and on the motion's first frame the surface is scaled to
nothing. Now the menu moves focus without the browser's scroll and scrolls the list itself, just far enough to show the
focused item. It judges this from the surface at rest: a key pressed during the opening motion moves focus at once, and
the list moves when the motion ends. A list taller than its surface opens at its top, a submenu's too, and so does a
menu opened again before its closing motion has ended. The first item scrolls the list back to its start, the last to
its end, and the first item of a titled group brings the title into view. Focus that follows the pointer scrolls
nothing.

**Japanese and Chinese text breaks by the strict rules.** Text a product gives a component (`productText()`: labels,
values, descriptions in every shadow-DOM component) takes `line-break: strict`, whatever language the page marks. A
line no longer begins with ー, a small kana, an iteration mark or closing punctuation. The browsers' default allowed
that in Chromium, and in WebKit where the text is marked Japanese. In a menu, the label, supporting text, trailing text
and group titles also take `word-break: auto-phrase` (MNU-69). Chromium then breaks text marked `lang="ja"` between
phrases, as in `Claude Code のコマンドを` / `コピー`. The menu spec gains a `japanese` fixture.
