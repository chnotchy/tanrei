// What the docs do for the search index before it is written (the framework's build reads every built page: the text
// of the main region, `data-pagefind-body`, less whatever stands under `data-pagefind-ignore`). The index takes a
// page's text as the markup has it: where two elements meet with no white space between them it reads one word, and
// the site's own components are written to the page without any (the build removes the white space between tags).
// A term and its description, and two cells of a row, are then one word in an excerpt — «Minimum targetThe hit area»,
// «LevelBase», «FixturePropertiesLive» — and no search finds either half.
//
// `indexSeparated` puts one space after the end of every term, description and cell that another tag follows. White
// space there is never drawn: a row's cells and a list's terms are boxes of a table, a grid or a block, and the space
// between two such boxes makes no box of its own. Before the end of a `div` it puts none: the index ends a sentence
// where a `div` ends («Category Actions. Level Base.»), and only where the text before it ends without a space — a fact
// (`<div><dt>…</dt><dd>…</dd></div>`) is such a sentence, and stays one. It is done once, to the main region as it was rendered
// (components/frame/TwoColumnContent.astro), so that a table a component writes tomorrow needs nothing; what stands
// side by side as inline boxes — where a space would be drawn — is written with its own space by the component that
// writes it, or is not text of the page at all and carries the index's ignore mark (a live example's stage, a glyph's
// name).

/** What is left as written — text whose white space is drawn, or that is not markup at all — or the end of what is never run-in text: a term, a description, a cell of a table, a panel of a tab view, where another tag follows it that is not the end of a `div`. */
const KEPT_OR_END = /(<(pre|script|style|textarea)\b[\s\S]*?<\/\2>)|(<\/(?:dt|dd|th|td|tanrei-tab-panel)>)(?=<(?!\/div>))/gi;

/**
 * The page's markup with a space between a term, a description or a cell and the tag that follows it.
 *
 * @param {string} html
 * @returns {string}
 */
export function indexSeparated(html) {
  return html.replace(KEPT_OR_END, (_, kept, _name, end) => kept ?? `${end} `);
}
