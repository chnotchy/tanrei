// What the page sheet's worker answers (./sheet-worker.ts), as a function of the Studio core and the message: kept
// apart from the worker's wiring so that Node runs it against the same core the tests build (test/page-sheet.test.js).

/**
 * @typedef {{ id: number, layer: unknown }} SheetRequest  What the page asks: the sheet of one layer; `id` names the answer.
 * @typedef {{ id: number, css: string } | { id: number, error: string }} SheetAnswer  The sheet, or why there is none.
 */

/**
 * @param {{ fromLayer(input: unknown): object, preview(layer: object): { problems: string[], computation?: { error?: string } }, pageSheet(view: object): string | null }} core
 * @param {SheetRequest} request
 * @returns {SheetAnswer}
 */
export function answer(core, { id, layer }) {
  try {
    const view = core.preview(core.fromLayer(layer));
    const css = core.pageSheet(view);
    if (css === null) return { id, error: view.computation?.error ?? view.problems.join('\n') };
    return { id, css };
  } catch (error) {
    return { id, error: error instanceof Error ? error.message : String(error) };
  }
}
