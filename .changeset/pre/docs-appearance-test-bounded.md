---
---

The docs' appearance test gives every wait that Playwright leaves unlimited (a new context or page, closing one, a script that awaits the page) a limit, and each test one too, so a browser that stops answering fails the test, naming what it waited for, instead of holding the CI job silently until its own limit; the docs' browser tests end a file once its tests have reported. Nothing released changes.
