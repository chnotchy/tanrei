---
'@tanrei/studio': patch
---

Theme Studio sends one save at a time. An edit made while the host had not yet answered the last save was saved
600 ms later, alongside it, with the etag that answer was about to replace: a host slower than that refused the second
save as a conflict with the Studio's own write, and the Studio said the file had changed on disk. A save asked for
meanwhile — the autosave, Build, `api.save` — is now sent once the answer has come. The answer to a save that a later
edit has overtaken no longer draws the file's state again: that edit has said the file is unsaved already.
