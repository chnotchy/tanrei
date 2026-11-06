---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Content components, after the review of the web components:

- Avatar: the avatars of a group overlap by 2, 4 and 8 (small, medium, large; were 6, 10 and 14), so that two
  initials side by side stay whole and are not misread. The overflow box reads "99+" above 99 at every size (was
  "999+" above 999), so it never holds more than three characters; the exact number stays in `overflowLabel`. The spec
  now says what was built for enlarged text: initials grow with the text up to the glyph's box of their size.
- List: a reorderable list moves its buttons below the text only where they would leave the text narrower than the new
  token `comp.list.reorder.text-min-width` (96 px at the default text size, growing with the text), in place of "less
  than half the row", so a row with two move buttons and a remove button stays on one line at the default text size;
  where the line under the text is too short, the trailing control goes to a further line. A selected option's fill
  is, in the default system, a layer of the row's content color at 16% (as a menu's checked item), and its overline,
  supporting text, trailing text and trailing icon take the fill's content color; m3-like and cupertino keep their
  look.
- Code block: an added line and a removed line draw a faint band of their kind (new tokens
  `comp.code-block.line.added.container.color` and `…removed.container.color`) behind the line, besides the bar and
  the sign; code keeps its syntax colors, which the build holds at 4.5:1 (7:1 in high contrast) on the bands. No band
  in forced colors, and none in cupertino.
- Table: the checkbox of the selection column stands with its box, not its round container, at the cell's padding,
  where the text of the other cells starts; the column is narrower (50 in the default system). The spec of a wrapped
  sortable header now says what was built: the mark stands after the label's box, on its last line.
- Tree view: a disabled row that has keyboard focus draws its focus ring at full strength; the row stays faded.
- Prose: Japanese running text is set at a line height of 1.85 (new token `comp.prose.japanese.line-height`), the
  space between lines near one character, as JLREQ recommends for lines of the measure's length.
- Image preview: the spec records the web's edge resistance (three tenths of the drag past the first or last image).

Baselines re-recorded for these intended changes: avatar groups, list reorder and selected rows, code block diffs,
table selection, and Japanese prose.
