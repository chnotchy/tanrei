---
'@tanrei/docs': patch
---

Documentation site: the content security policy is enforced, no longer only reported.

- The host's header (`public/_headers`) is now `Content-Security-Policy`, not `Content-Security-Policy-Report-Only`. It
  adds the origins of the analytics beacon the host puts into every page (`https://static.cloudflareinsights.com` for the
  script, `https://cloudflareinsights.com` for its reports) and `'wasm-unsafe-eval'`, which the search needs to compile
  its index's WebAssembly. Enforced without it, the search would stop working.
- The build writes a second policy into every page, as a `<meta http-equiv="Content-Security-Policy">` right after its
  `<meta charset>`: it names the SHA-256 hash of each inline script the page holds and of each event handler in its
  markup (the demos' `onclick`, through `'unsafe-hashes'`). A browser enforces both policies, so an inline script runs
  only if the page holds it by its hash. The hashes are per page because the whole site's would not fit in one header
  line, and they change whenever the scripts' text does.
- What broke: an inline script or event handler that a page creates while it runs (not written into its HTML) is
  refused. A script the host injects inline into a page is refused too.
