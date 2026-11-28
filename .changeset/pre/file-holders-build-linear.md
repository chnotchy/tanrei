---
'@tanrei/web': patch
---

File upload and chat composer: the File items a product gives them (`rows="given"`, `attachments="given"`) are read
once per turn. Each File item tells its holder when it first draws and whenever something the holder reads of it
changes, and the holder re-read every item each time — so building N items, or changing N of them at once, did O(N²)
work. The holder now re-reads its items once, in a microtask before the next frame, however many of them changed in
it; a file upload's `validity`, `validationMessage`, `checkValidity()` and `reportValidity()` read them first. In
Chromium, with 1,000 items:

- a chat composer builds in about 1.2 s (4 s before), and setting every item uploading takes 0.26 s (1.4 s);
- a file upload renames every row in about 0.15 s (0.8 s), and builds in about 1.2 s (2.5 s) — the List it draws the
  rows in still re-reads its items once for each row as it builds.

Every frame draws the items as before, and what is announced and submitted is unchanged.

Stepper: what it reports of steps that share a value is found in one pass over the steps. Its re-read of the steps
already ran once per turn.

Debug builds count each re-read on `globalThis.__tanreiCounts` (`file-upload.sync`, `chat-composer.sync`,
`stepper.sync`), for the performance tests. No baseline changes.
