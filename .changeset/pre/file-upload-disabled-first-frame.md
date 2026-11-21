---
'@tanrei/web': patch
---

File upload: a disabled file upload that appears on a page that is already drawn shows its trigger disabled from its
first frame. The trigger no longer fades from its enabled colors to the disabled ones over the state motion. The file
upload assigns its trigger to the file picker after its own render, and the file picker told the trigger it was
disabled only after the file picker's first render, which came after the trigger's. Now the file upload has the file
picker tell the trigger as soon as it is passed on, before the trigger is first drawn.
