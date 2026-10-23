---
'@tanrei/web': minor
---

**Breaking (behaviour).** The search's suggestions are queries, and the query as typed is now always what Enter takes
until the person moves.

- **The query row** (`query-row="first"`, the default): while suggestions show and there is a query, the first row is a
  row of the search's own — the search glyph and the query, and under it `query-row-text` if you give one ("Search all
  mail") — active from the moment the suggestions appear, so Enter searches for what was typed, as the first row of a
  browser's address bar does. A press on it does the same. What broke: Enter with suggestions showing no longer chooses
  the first suggestion. A product that gave the typed text as its first suggestion, as the previous release advised,
  takes it out: the query row is that row now.
- **`query-row="none"`**, a web search page's form: no query row, nothing active until the person moves, and the input
  is the place before the first suggestion in the arrow keys' cycle.
- **The arrow keys** go through the query row (or the input's place), the suggestions and the results, and go round at
  both ends; `no-wrap` stops them. The first Down Arrow goes to the next row again: it no longer stays on the row Enter
  takes. A suggestion an arrow key reaches is shown in the input without changing `value` or firing `input`; the query
  as typed comes back on the query row, and when the view closes or the input loses focus. Typing on a shown suggestion
  edits that text, which becomes the value.
- **Results**: with no suggestion the first result is still current and opened by Enter; Down Arrow now goes to the
  second.
- **`inline-completion`** (off by default) completes the query in the input from the first suggestion that begins with
  it, the added part selected after the caret. A caret key or a press in the input accepts it (one `input`), Backspace
  takes it away, Enter accepts it and submits. It never completes after a deletion or a paste, during an input-method
  composition or on an on-screen keyboard.
- **A query suggestion's completion** — the part of its headline after the query — is drawn heavier (`part="completion"`,
  the new token `comp.search.suggestion.completion.emphasis`). The vocabulary gains that token.
- **Announcements**: a row the search makes current by itself — the query row, or the first result — becomes the input's
  `aria-activedescendant` once typing has paused for 500 ms, and a row an arrow key reaches at once. A result's link is now
  the result's own light-DOM child (slotted over the row it draws), so that the input can name it.

The combobox's arrow keys go round at the ends too — through the text where `allow-custom-value` is set — unless
`no-wrap` (the combobox field passes it on), and the first match typing makes active is named as the active descendant
once typing pauses for 500 ms.

Baselines: every search fixture with suggestions and a query gains the query row and the completion's weight (`docked`,
`full-screen`, which now shows `query-row-text`, `docked-results`, `icon-space-auto`, `icon-space-always`,
`icon-space-never`, `density-compact`), and the new fixture `docked-query-row-none` shows the form without it: the
intended result of the spec change.
