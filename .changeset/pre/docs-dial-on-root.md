---
'@tanrei/docs': patch
---

Documentation site: the Design systems page no longer says that setting a dial such as `--tanrei-dial-type-base` on
any element rescales everything inside it. The derived tokens are declared on the root, so a dial takes effect when it
is set on the root element; set on an element further down, it leaves them as they are. The page says so in all six
languages.
