---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`, and on the documentation site): typing at Source no longer computes the whole
layer at every key whose text parses. Each key is still parsed and checked against the schema at once; the layer is
computed and saved once the typing has rested for 400 ms, or when the text loses focus. A name, a description or a
reason typed there is the layer at once (it computes nothing), and a palette's source or a dial is drawn at the next
frame without computing the layer. Four letters typed into a family's name computed the layer four times; they now
compute it once.
