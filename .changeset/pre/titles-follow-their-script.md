---
'@tanrei/web': patch
---

A title's letter-spacing now follows the script of its text, in every component and not in prose alone. In Chinese,
Japanese and Korean a negative tracking is dropped and the text is set solid; a positive tracking a product's layer
chose stays. In a script that joins its letters or stacks marks on them (Arabic, Persian, Urdu, Pashto, the Brahmic
scripts, Thai, Lao, Khmer, Burmese) there is no tracking at all. It applies by the text's `lang` to the titles of the
dialog, popover, side sheet, snackbar, rich tooltip, app bar, callout, empty state, navigation drawer section, the
date-time picker's header value, accordion, figure, link card, steps, timeline, page header (title and eyebrow),
description list (the stat figure), prose headings and the heading and eyebrow classes of `text.css`. The rule is one
source shared by the shadow styles and the light-DOM stylesheets, and is not a token.

Intended visual change: a title in Chinese, Japanese or Korean in the default system loses the heading styles'
negative tracking (the Japanese and Chinese fixtures of those components draw slightly wider titles); a Japanese page
header's eyebrow now keeps the eyebrow's positive tracking, which it used to drop. The affected web baselines are
recorded again.
