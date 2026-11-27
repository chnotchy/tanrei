---
'@tanrei/studio': patch
---

Theme Studio no longer loses an edit made while the host has not answered the last save. An undo saved, then a redo
before that save's answer, was weighed against the save before the undo: the redo matched it, was drawn saved and was
never sent, and the file kept the undo. A commit is now weighed against the save on its way, which the file already
holds: one that differs is unsaved and is sent after the answer; one that matches it is said to be saving, and its
answer says it is saved.
