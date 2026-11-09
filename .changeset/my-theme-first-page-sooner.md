---
'@tanrei/docs': patch
---

The first page of the documentation opened in **My theme**, before its stylesheet is kept in this browser, is shown in
the theme sooner: the stylesheet's worker is started by a module the head runs as soon as it finds no stylesheet kept,
instead of after every module of the page has run. A page whose stylesheet is not in after three seconds is still shown
in the default system, and the stylesheet is kept for the next page. A page whose stylesheet is kept is also shown
sooner in WebKit (Safari).
