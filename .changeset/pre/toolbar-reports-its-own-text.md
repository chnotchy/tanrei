---
'@tanrei/web': patch
---

The toolbar reports text written directly in it, or in one of its groups, in debug builds, as it reports an element
that is none of its item kinds: each text once, by what it says, and a text added later when it arrives. Such text is
assigned to no slot, so it was never drawn, and nothing said so; the white space between the items is not reported.
The toolbar's spec now says this of text in TBR-12.
