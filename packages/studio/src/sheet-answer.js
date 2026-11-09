// What the page sheet's worker answers (./sheet-worker.ts), as a function of the page sheet (./sheet.js
// `createPageSheet`) and the message: kept apart from the worker's wiring so that Node runs it against the same page
// sheet the tests build (test/page-sheet.test.js).

/**
 * @typedef {{ id: number, layer: unknown }} SheetRequest  What the page asks: the sheet of one layer; `id` names the answer.
 * @typedef {{ id: number, css: string } | { id: number, error: string }} SheetAnswer  The sheet, or why there is none.
 */

/**
 * @param {{ pageSheet(layer: unknown): Promise<string> }} sheets
 * @param {SheetRequest} request
 * @returns {Promise<SheetAnswer>}
 */
export async function answer(sheets, { id, layer }) {
  try {
    return { id, css: await sheets.pageSheet(layer) };
  } catch (error) {
    return { id, error: error instanceof Error ? error.message : String(error) };
  }
}
