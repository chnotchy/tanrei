---
'@tanrei/cli': minor
---

**`tanrei init --from <id>.system.json`** starts a product from a layer file it already has — the one Theme Studio's
Export downloads. The file is checked against the schema and the vocabulary rules (with the systems this version ships
as its parents), copied unchanged to `design/<id>.system.json` with the id read from the file rather than its name, and
`tanrei.json` is written beside it. Nothing is written when the file is refused, or when `tanrei.json` or the
destination already exists. It takes a file only: the link Theme Studio copies is not an input.
