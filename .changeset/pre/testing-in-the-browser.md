---
'@tanrei/docs': patch
---

The web guide has a Testing section, in six languages. Tests that render Tanrei's elements run in a real browser
(Vitest's browser mode or Playwright Test): jsdom and happy-dom are not supported, and no stand-ins are shipped. The
section also covers finding a control by its role and name inside the element's shadow root, finding a tab or a
dialog's action through the element that holds the named role (chaining from the role finds nothing, because the
content is slotted), checking an open menu through its items (the element takes no room in the page), and failing a
test on `[tanrei]` warnings. `@tanrei/web` adds a test that checks each of those locators in Chromium, Firefox and
WebKit.
