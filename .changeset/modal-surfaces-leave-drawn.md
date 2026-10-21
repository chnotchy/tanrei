---
'@tanrei/web': patch
'@tanrei/react': patch
---

Dialog, Modal Layer, modal Side Sheet and Bottom Sheet, Image Preview and the Popover's sheet: closed, the surface and
its scrim play their exit in every browser. In WebKit and Firefox a closed `<dialog>` was taken out of the top layer at
`close()`, so the surface and the scrim vanished at once with no motion (only Chromium kept them drawn while the exit
played). Now each one closes at once — focus goes back to the opener and the page behind is no longer inert in the same
task, as MDL-5 says — and stays drawn in the top layer, inert and taking no pointer, until its exit and its scrim's have
finished; opened again on the way out, it goes back from where it was, modal again.

- One mechanism for every modal surface: `openModal()` and `closeModal()` (with `modalExitStyles()` for the scrim) in
  the web package's primitives. While it leaves, the `<dialog>` carries `data-tanrei-leaving`, is a manual popover and
  is `inert`; a style that targets a closed dialog sees it closed (no `[open]`, not `:modal`) from the first frame.
- The modal surfaces no longer transition `display` and `overlay` (`transition-behavior: allow-discrete`): their
  `transition-property` lists only what moves (`opacity`, `scale`, `translate`).
- The page's scroll, held while a modal surface is open (MDL-2), no longer moves the page sideways where the scroll bar
  takes room: the root keeps that room (`scrollbar-gutter: stable`, or as much padding where the engine keeps no gutter
  for the bar). Nothing changes where the bar is drawn over the page.
