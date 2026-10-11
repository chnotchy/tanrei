// The docs' own sentence about what is chosen (specs/table.spec.json, TBL-44, TBL-52): Tanrei's Table holds which rows
// are chosen and counts nothing — it emits `selectionchange` with the values of the chosen rows, and the product says
// how many that is, in its own language, in the status line. One listener for every table of a page that is marked
// `data-docs-counts`; the attribute is the page's sentence, with `{count}` where the number goes. A page whose script
// has not run keeps the sentence it was built with.
interface SelectionChangeDetail {
  values: string[];
}

document.addEventListener('selectionchange', (event) => {
  const host = event.target;
  // The browser has an event of this name, of text selections: the table's is a CustomEvent.
  if (!(event instanceof CustomEvent) || !(host instanceof HTMLElement) || !host.matches('tanrei-table[data-docs-counts]')) return;
  const status = host.querySelector(':scope > [data-part="status"] > [role="status"]');
  const { values } = (event as CustomEvent<SelectionChangeDetail>).detail;
  if (status) status.textContent = (host.getAttribute('data-docs-counts') ?? '').replace('{count}', String(values.length));
});
