<!--
  The specimen document of inline code. One source for every platform's baselines, in the form of prose's
  specimen.

  A fixture's `content` names a section below (`<!-- section: <name> -->` … up to the next section marker). Each
  harness builds the section as prose of the default size in a container 480 wide, on the surface color, at the
  default text size; a run between backticks is an inline code of the fixture's props (variant `auto` unless the
  fixture sets one). The section `large-text` is built as prose of size large. The section `table` is built as a
  plain grid of two columns; until the Table exists a harness draws the cells as text blocks side by side.

  All text here is written for this file.
-->

<!-- section: paragraph -->

Run `npm install` in the folder that holds `package.json`, then start the server with `npm run dev -- --port 4000`. The first run writes `.cache/` beside your sources; it is safe to delete.

<!-- section: heading -->

## Setting `size` on a group

### When `variant` is `outlined`

A heading keeps its own size for the code inside it: `size` above is set as large as the words beside it.

<!-- section: large-text -->

A reading page sets its text larger, and `comp.prose.measure` still limits the line. The code in this sentence, `measure`, grows with it.

<!-- section: link-and-strong -->

See [the `Button` reference](#button) for every prop. **Never set `disabled` on the only way out of a dialog**; *use `hidden` with care*.

<!-- section: wrapping -->

The token `tanrei.comp.navigation-drawer.item.selected.hovered.state-layer.color` is longer than this line, and so is the path `packages/web/src/components/navigation-drawer/navigation-drawer.styles.generated.ts`; both break where the line ends, and neither is cut.

<!-- section: table -->

| Prop | Default |
|---|---|
| `variant` | `filled` |
| `size` | `medium` |
| `iconPosition` | `leading` |

<!-- section: japanese -->

`package.json` と同じフォルダで `npm install` を実行します。初回は `.cache/` が作られます。

<!-- section: rtl -->

شغّل `npm install` في المجلد الذي يحتوي على `package.json`، ثم افتح `src/app/main.ts` وعدّل `port: 4000`.
