---
'@tanrei/studio': minor
'@tanrei/docs': minor
---

**Theme Studio: Export has a Command tab.** Between File and CSS, it shows the commands that take the layer into a
product as one block to copy — `npm install --save-dev @tanrei/cli`, `npx tanrei init --from <id>.system.json` with
the downloaded file, `npx tanrei build` — and says what to run instead in a product that already has `tanrei.json`.
With a file behind the Studio (`tanrei studio`) it shows `npx tanrei build` alone. What next runs the same
`init --from` step instead of `tanrei init <id> --extends …` followed by saving the file over the starter; the step
that put the file in place by hand is gone. The command takes the file, never the link. The page's API takes
`openExport('command')`.
