// A worker that computes a layer's page sheet (core.js `pageSheet`): the whole pipeline — the token engine, the
// build's emitter — runs here, off the page's thread, so that the page that asks for it answers its reader meanwhile.
// One message in, `{ id, layer }`; one out, `{ id, css }`, or `{ id, error }` for a layer that cannot be computed.
// ./page-sheet.ts is the page's side.
import { studio } from './data';
import { answer, type SheetRequest } from './sheet-answer.js';

addEventListener('message', (event: MessageEvent<SheetRequest>) => {
  postMessage(answer(studio, event.data));
});
