---
'@tanrei/mcp': patch
---

Component specs: `platforms.web.parts` says where each part of a component's anatomy is drawn on the web, and
`anatomyFixture` may name the fixture an anatomy diagram draws. A part maps to a CSS part (`container`), a slot
(`slot:icon`), a child element or one of its parts (`tanrei-menu-item label`), a light-DOM class, or one of these
with `@outline`, `@focus-ring` or `@backdrop` (`container@focus-ring`); a part with no box of its own on the web says
why (`{ "noBox": "…" }`). `validate` holds that every anatomy id is mapped and that every target exists in
`custom-elements.json` or the component's stylesheet. The specs the MCP server returns carry it for 32 components so
far: button, tabs, slider, menu, navigation-drawer, text-field, the controls whose remaining parts are an outline, a
focus ring or a scrim, and the components whose every part is a CSS part of the same name. The native platforms'
blocks may not write it. Nothing is removed or renamed.
