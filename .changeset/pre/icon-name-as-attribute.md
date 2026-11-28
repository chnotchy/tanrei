---
'@tanrei/web': minor
'@tanrei/docs': patch
---

Icons: a `.tanrei-icon` can take its glyph's name from `data-icon` instead of its text —
`<span class="tanrei-icon" data-icon="folder"></span>`. `icons.css` draws the name as generated content with an empty
alternative, so it is the same glyph at the same size, selection and fill, but the name is no longer text of the page:
it is not in `textContent` or `innerText`, in what people copy, or (from Firefox 128 and Safari 17.4) in the accessible
name of the control around it. Right-to-left mirroring reads the attribute too, for a bare icon (`observeIcons()`) and
for one in a component's icon slot, and follows a changed `data-icon`. `data-icon=""` is no name. The Icons page
describes it in six languages.
