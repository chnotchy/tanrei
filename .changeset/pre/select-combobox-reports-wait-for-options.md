---
'@tanrei/web': patch
---

Select, combobox and image preview: used correctly, they no longer warn in a debug build when a React product renders
them. React's wrappers set each option's `value` and each image's `alt` as a property once the elements are in the
document, and the child writes it to its attribute — which the parent reads — only in its own update. So the parent's
checks ran on children without what the product gave them: a select warned that its value "names no option" and that
"two options share the value ''", a combobox that "an option has the empty value", and an image preview mounted open
that "the image at 0 has no alt". The checks now wait until the children's own updates are done, and judge them as the
product gave them. A value that names no option, two options that share a value, an option without a value and an
image without an alt are still reported, once.
