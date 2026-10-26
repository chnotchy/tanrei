---
'@tanrei/react': patch
---

On a server, the React wrappers now write their props as attributes. Before, `renderToString(<TextField label="Name" />)` gave a bare `<tanrei-text-field>`: the label, the value and the states only arrived after hydration. Now each string, number and boolean prop the element reads from an attribute is written as that attribute, under the attribute's name from the elements' manifest (`maxLength` is written as `maxlength`, `supportingText` as `supporting-text`) and by the element's own converter. A prop at its default writes nothing, so a `false` is never written as present, and a boolean that is on by default and turned off writes what the element reads as off (`icon-only="false"`, `no-handle`). Handlers, objects and arrays are still set in the browser. The shadow root is not rendered on the server, and Lit's server renderer (`@lit-labs/ssr-react`) is not supported. The React guide has a new Next.js (App Router) section, in all six languages.
