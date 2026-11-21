---
'@tanrei/docs': patch
---

Documentation site: a choice of design system beside the list of components and at the top of the sidebar (Tanrei's
Select field, one option for each shipped system, read from the components manifests). The lists show the default
system's components until the reader chooses another; a component the chosen system does not have is not drawn in
either list (the page being read stays in the sidebar), and the index says in one line what that system does not have
and what it uses instead. The choice is kept on the device under the same key as a set of tabs with `syncKey="system"`.

The page of a component that some systems do not have — the FAB menu, the segmented button — leads its overview with a
note drawn from the manifests: which systems have it and which entries register it, which do not and why, what they
use instead (each a link), and the line of a layer and the import that take it into a product's own system. The notes
written by hand on those two pages, in six languages, are gone.

A new page, Getting started › Presets, in six languages: how to use a preset on the web (its stylesheet, its
attribute, its entry, its fonts), each preset's facts read from its layer, its resolved tokens and its manifest (the
fonts to load and their packages, the components and the values of `variant` it has and does not have beside the
default system), and how a product on the default system takes one preset component into its own layer
(`components.include`) and draws it with its own tokens.
