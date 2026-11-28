---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`, and on the documentation site): typing the layer's name, its description or
its attribution, a dial's or a group's reason, a palette's description or an extension's rationale no longer computes
the whole layer at every key. None of them is part of a value: the Studio checks the layer at each key (its id, what it
extends, the schema) and shows what was typed at once — the file's JSON, the fields, the checks — and computes the layer
only when a value changes. A reason, a rationale or a palette's description is also shown as text in Every token; that
text catches up once the typing has rested. The preview's stylesheet is not written again for any of them.
