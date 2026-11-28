---
'@tanrei/docs': patch
---

Documentation site: the fixtures' gallery draws presented fixtures in the page where it can, and a window writes its
own document.

- A presented fixture whose surface the web package's document draws in place (an open menu, a select's or a
  combobox's list, a popover beside its anchor, a docked picker, a search's view, an open FAB menu), and one presented
  in its own place in the layout (a standard drawer or sheet, an expanded snackbar, a compact table of contents' open
  list), is drawn in the page, as every other fixture is.
- A tooltip and a button's menu, whose surface stands beside its anchor in the top layer, are drawn closed, and the
  stage has an action that opens the real surface on the page and closes it again ("Open {id}", in every language).
- A modal fixture (a dialog, a modal sheet or drawer, a modal picker, an image preview), a whole page's frame (the app
  shell) and a stage the size of the window (a responsive drawer) are drawn in a window whose document the page writes
  itself (`srcdoc`), when the window comes near the view; it is emptied three windows away and written again on the way
  back. About 90 windows a language, down from about 500.
- A window draws without scrolling the page or taking its focus, in every engine (a modal fixture opening in a window
  moved the page's focus into it, and WebKit scrolled the page to it), in the stage's scheme, the page's contrast and
  the stage's design system and direction.
- What broke: the pages under `/fixtures/<component>/` are gone, with their `noindex` and the sitemap's filter for them.
  The host's `/fixtures/*` rule is gone too: every document is sent `X-Frame-Options: DENY` and `frame-ancestors 'none'`,
  and every page's policy says `frame-src 'none'` again. A window's document keeps the page's policy: it runs no inline
  script, and loads the one module that defines its elements by its address.
