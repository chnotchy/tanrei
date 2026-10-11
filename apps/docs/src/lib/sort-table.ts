// The docs' own answer to a table that asks for an order (specs/table.spec.json, TBL-33, TBL-34): Tanrei's Table
// never sorts — a sortable column's header emits `sort` with the direction asked for and changes nothing — so the page
// that owns the rows orders them and says so on the header cell. One listener for every table of a page that is
// marked `data-docs-sorts`; a page whose script has not run, or never runs, keeps the order it was built in.
//
// A header cell the page wrote to sort (`data-docs-sort`) is a plain header until this script is here: only now can a
// press be answered, so only now does the cell get its button and say its order (`aria-sort`), which is what the
// Table draws a sort button from. A page without script never shows a mark it cannot honour.
//
// A cell is ordered by its `data-sort-key` where it has one (a priority is ordered by what it means, not by its
// spelling), else by its text: as numbers where every cell of the column is one, else as text in the page's language.
interface SortDetail {
  index: number;
  direction: 'ascending' | 'descending';
}

const number = (text: string) => Number(text.replace(/[,\s%]/g, ''));

function sortRows(host: HTMLElement, { index, direction }: SortDetail) {
  const table = host.querySelector<HTMLTableElement>(':scope > table');
  const header = table?.tHead?.rows[0];
  if (!table || !header) return;
  const collator = new Intl.Collator(host.closest('[lang]')?.getAttribute('lang') ?? undefined, { numeric: true, sensitivity: 'base' });
  const turn = direction === 'descending' ? -1 : 1;
  for (const body of table.tBodies) {
    const rows = [...body.rows].map((row, at) => {
      // The event's index counts the columns of data: a selection column before them is none (TBL-42).
      const cell = [...row.cells].filter((each) => each.dataset.part !== 'selection')[index];
      return { row, at, key: (cell?.dataset.sortKey ?? cell?.textContent ?? '').trim() };
    });
    const numeric = rows.length > 0 && rows.every(({ key }) => key !== '' && Number.isFinite(number(key)));
    // Rows that are equal in this column keep the order they were in.
    rows.sort((a, b) => (numeric ? number(a.key) - number(b.key) : collator.compare(a.key, b.key)) * turn || a.at - b.at);
    body.append(...rows.map(({ row }) => row));
  }
  // The order the rows are in now, on the header cells: the table draws what they say.
  const columns = [...header.cells].filter((each) => each.dataset.part !== 'selection');
  for (const cell of columns) if (cell.hasAttribute('aria-sort')) cell.setAttribute('aria-sort', columns.indexOf(cell) === index ? direction : 'none');
}

for (const cell of document.querySelectorAll<HTMLTableCellElement>('tanrei-table[data-docs-sorts] > table > thead th[data-docs-sort]:not([aria-sort])')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.append(...cell.childNodes);
  cell.append(button);
  cell.setAttribute('aria-sort', 'none');
}

document.addEventListener('sort', (event) => {
  const host = event.target;
  if (host instanceof HTMLElement && host.matches('tanrei-table[data-docs-sorts]')) sortRows(host, (event as CustomEvent<SortDetail>).detail);
});
