// A worker that computes a layer's page sheet (./sheet.js): the token engine and the build's emitter run here, off the
// page's thread, so that the page that asks for it answers its reader meanwhile. It holds only what a sheet is computed
// from (./sheet-data.ts), not the Studio. One message in, `{ id, layer }`; one out, `{ id, css }`, or `{ id, error }`
// for a layer that cannot be computed. ./page-sheet.ts is the page's side.
import { pageSheets } from './sheet-data';
import { answer, type SheetRequest } from './sheet-answer.js';

// The default system's sheet is needed for every layer's: it is computed from the start, while the first request comes.
pageSheets.warm();

addEventListener('message', (event: MessageEvent<SheetRequest>) => {
  void answer(pageSheets, event.data).then((said) => postMessage(said));
});
