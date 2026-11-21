---
'@tanrei/docs': patch
---

Documentation site: every live example, every stage of a component's gallery of fixtures and every figure drawn from
the repository stand in one frame.

- **Its code.** A Code button in the frame's header opens the example's code under it, closed until a reader opens it:
  the markup as a product writes it, in HTML or in React with the React package's components and props (the choice is
  kept for every example). The copy button copies the code in the kind chosen. The gallery's copy now copies the same
  code.
- **Its direction and width.** A button draws the example right to left (left to right on a page that reads right to
  left), and a handle on the stage's end edge makes it narrower or wider.
- **It follows the page.** Every example is drawn under the design system chosen beside the brand in the header, and in
  the scheme and contrast of the appearance menu. The examples' contrast rows and the figures' design-system switches
  are removed: the header's menus are the one place to choose. An example the default system does not have is still
  drawn under the preset it lives in.
- **It is drawn when it is near.** What an example holds is defined once it comes near the view, so a long page no
  longer fetches and defines, as it loads, the components of examples far below.
