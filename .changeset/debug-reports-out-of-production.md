---
'@tanrei/web': patch
---

A production bundle no longer carries the debug reports' messages. Every report a component makes in a debug build is
now guarded by a constant where it starts, and a browser bundler (Vite, webpack, Parcel, esbuild) replaces that
constant when it builds for production. It then leaves out each report with its message, and the words that say what a
missing word costs. Measured with esbuild, minified and compressed with gzip, as the package's bundle budgets measure:
`@tanrei/web/all` is 38.4 kB smaller (669.8 kB to 631.5 kB, 5.7 %), and a component's own module is up to 5.3 kB
smaller (file upload). The app shell is 0.6 kB smaller. No module grew.

How you get a debug build is unchanged: `process.env.NODE_ENV` set to anything but `"production"`, as your bundler
already sets it. Without a bundler reports stay on, and `tanrei.bundle.js` is still a development bundle. The package
now has a `browser` field. It maps one internal module onto its bundler form, which reads `process.env.NODE_ENV`
unguarded. A bundler that builds for the browser and reads that field without defining the variable would now throw
where it used to report. esbuild, webpack, Vite and Parcel all define it.

`missingWords()` still records every missing word in a production build.
