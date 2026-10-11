// A tree of files, as a page writes it, said in the words of Tanrei's Tree view (specs/tree-view.spec.json): the
// mapping itself, as a function of the rendered list, so that Node can run it without the site
// (test/file-tree.test.mjs). `components/FileTree.astro` draws what this returns.
//
// A page writes a Markdown list between `<FileTree>` and `</FileTree>`:
//
//   - tokens/ source of truth, edited by hand
//     - ref/
//     - tanrei.resolver.json
//   - design/tokens/ six resolved permutations
//
// An item's first word is its name; what follows the name is a note about it, in the page's language. An item is a
// folder where its name ends with a slash or it holds a list; any other is a file. The list arrives rendered (the
// content is rewritten as text because it arrives rendered) and leaves as the nested list the tree view is written
// around (`@tanrei/web/tree-view.css`: an item is an `<li>`, its first child element is its row):
//
//   <ul>
//     <li data-open>
//       <span>
//         <span class="tanrei-icon" aria-hidden="true" data-pagefind-ignore>folder</span>   (a glyph's name is not read by the search index)
//         <span><bdi dir="ltr"><code>tokens/</code></bdi><br hidden><small data-supporting-text>source of truth, edited by hand</small></span>
//       </span>
//       <ul>…</ul>
//     </li>
//   </ul>
//
//   a parent      a folder that holds a list, written open (`data-open`): the tree is a picture of the files to read,
//                 so every level is shown. A folder that holds nothing here is a leaf (TRV-42): it has no chevron and
//                 answers nothing;
//   the icon      the icon set's `folder` or `draft`: a folder or a file, and no glyph for a kind of file. A row that
//                 only says that more follows (`…`) has none. Decorative;
//   the label     the name, in the code face (`<code>`: `components/MarkdownContent.astro` gives it the inline-code
//                 class) and always left to right — a path is, whatever the page's direction — inside a `<bdi>`, which
//                 also keeps the name out of the question of which way the row's text runs: in a right-to-left page
//                 the row runs as its note does;
//   the note      the row's supporting text, after the name in the same block of text, with the inline markup the
//                 author gave it. To assistive technology it is the row's description, not part of its name;
//   the break     a line break that is hidden (`<br hidden>`), between the name and the note. It is there for the
//                 search index alone, which reads a break as the end of a word and would otherwise read the name and
//                 the note as one («tokens/source»): the two are inline boxes of one line, where a space would be
//                 drawn and the tree view sets the note apart by its own gap. A hidden element makes no box, is not
//                 in the accessibility tree and is no part of the row to the tree view, so nothing is drawn or read
//                 differently; where no stylesheet is applied at all the note begins a line of its own.
//
// No item has a value: nothing in the tree can be chosen (the tree's `selection` is `none`).

const TAG = /<(\/?)(ul|ol|li|p)\b[^>]*>/g;
/** A name that is not a file's: more follows here. */
const MORE = /^(…|\.\.\.)$/;

/**
 * @typedef {object} FileItem
 * @property {string} name The file's or folder's name, as HTML text (escaped as the page's renderer left it).
 * @property {string} note What the page says about it, as HTML (inline content), or an empty string.
 * @property {boolean} folder Whether it is a folder: its name ends with a slash, or it holds a list.
 * @property {FileItem[]} items What it holds.
 */

/**
 * The items of a rendered Markdown list, with their names and notes.
 * @param {string} html One `<ul>` and nothing else.
 * @returns {FileItem[]}
 */
export function fileItems(html) {
  /** @type {FileItem[]} */
  const top = [];
  /** @type {{ items: FileItem[], item?: { item: FileItem, own: string } }[]} */
  const lists = [];
  let last = 0;
  let closed = false;
  const fail = (/** @type {string} */ what) => new Error(`<FileTree> holds one Markdown list and nothing else: ${what}.`);
  const text = (/** @type {string} */ between) => {
    const list = lists.at(-1);
    if (list?.item && list.item.item.items.length === 0) list.item.own += between;
    else if (between.trim()) throw fail(`"${between.trim().slice(0, 40)}" stands outside an item, or after an item's own list`);
  };
  const finish = (/** @type {{ item: FileItem, own: string }} */ { item, own }) => {
    const content = own.trim();
    // The name: up to the first white space that is not inside a tag.
    const end = /^(?:[^\s<]|<[^>]*>)+/.exec(content)?.[0].length ?? 0;
    item.name = content.slice(0, end).replace(/<[^>]*>/g, '');
    item.note = content.slice(end).trim();
    if (!item.name) throw fail('an item has no name');
    item.folder = item.name.endsWith('/') || item.items.length > 0;
  };

  for (const match of html.matchAll(TAG)) {
    const [tag, closing, name] = match;
    text(html.slice(last, match.index));
    last = match.index + tag.length;
    if (name === 'p') continue; // A list whose items are set apart by blank lines: each item's text is a paragraph.
    if (name === 'ol') throw fail('the list is numbered; files are not');
    if (name === 'ul') {
      if (!closing) {
        const parent = lists.at(-1);
        if (lists.length === 0 && closed) throw fail('a second list');
        if (lists.length > 0 && !parent?.item) throw fail('a list stands in a list, outside an item');
        lists.push({ items: parent?.item ? parent.item.item.items : top });
      } else {
        if (!lists.pop()) throw fail('a list is closed that was not opened');
        closed = lists.length === 0;
      }
      continue;
    }
    const list = lists.at(-1);
    if (!list) throw fail('an item stands outside the list');
    if (!closing) {
      const item = { name: '', note: '', folder: false, items: [] };
      list.items.push(item);
      list.item = { item, own: '' };
    } else if (list.item) {
      finish(list.item);
      list.item = undefined;
    }
  }
  if (html.slice(last).trim()) throw fail('something follows the list');
  if (lists.length > 0 || top.length === 0) throw fail(top.length === 0 ? 'no item was found' : 'the list is not closed');
  return top;
}

/** What parts a name from its note for the search index, and for nothing else: see «the break» above. */
const BREAK = '<br hidden>';
const row = (/** @type {FileItem} */ { name, note, folder }) => {
  const icon = MORE.test(name) ? '' : `<span class="tanrei-icon" aria-hidden="true" data-pagefind-ignore>${folder ? 'folder' : 'draft'}</span>`;
  const label = MORE.test(name) ? name : `<bdi dir="ltr"><code>${name}</code></bdi>`;
  return `<span>${icon}<span>${label}${note ? `${BREAK}<small data-supporting-text>${note}</small>` : ''}</span></span>`;
};
const list = (/** @type {FileItem[]} */ items) => `<ul>${items.map((item) => `<li${item.items.length > 0 ? ' data-open' : ''}>${row(item)}${item.items.length > 0 ? list(item.items) : ''}</li>`).join('')}</ul>`;

/**
 * The nested list a tree view is written around, from the rendered Markdown list of a page.
 * @param {string} html One `<ul>` and nothing else.
 * @returns {string}
 */
export const fileTree = (html) => list(fileItems(html.trim()));
