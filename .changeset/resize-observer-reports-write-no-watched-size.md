---
'@tanrei/web': patch
---

An embedded text input and a chat composer no longer have the browser report "ResizeObserver loop completed with
undelivered notifications" when their width changes in a box whose size does not change, or when a chat composer is
first drawn too narrow for its inline layout, and what they draw still follows in the frame of the change:

- A multi-line embedded text input is as tall as its lines by the browser's own layout (`field-sizing: content`, in
  every engine the tests run): a changed width or text size changes its height in the frame of the change, between
  `minRows` and `maxRows`, and as tall as its placeholder's lines while it is empty. The element only reads the lines
  to say them (`rowschange`). The text it holds no longer gives it a width in a place that sizes it to its content. A
  browser without `field-sizing` fits the height in the resize observer's report, as before.
- A chat composer watches its capsule's width on a box of its own that its layout cannot change, so deciding the
  layout in the report no longer leaves the capsule undelivered; and it no longer observes again the parts it already
  observes when its layout draws the attach button anew.
