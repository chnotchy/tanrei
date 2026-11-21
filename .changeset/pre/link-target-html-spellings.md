---
'@tanrei/web': minor
'@tanrei/react': minor
---

A link's `target` is typed to take HTML's spelling of its two values as well, `_self` and `_blank`, which the elements
already read as `same` and `new`: `<Button href="/docs/" target="_blank">` now type-checks in React and in TypeScript,
on every element with a link form (`TanreiLinkTarget`, `TanreiLinkCardTarget`). Any other value is still a type error,
and at run time still opens where the person is, reported in debug builds.
