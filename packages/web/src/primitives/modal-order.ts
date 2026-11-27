// Where a modal surface opens (MDL-8): every modal surface — a dialog, a modal layer, a sheet, a picker, an image
// preview, a search's view, a popover's sheet, a modal navigation drawer — asks to open here, with what it reads to
// open, and opens in the write that follows.
//
// Once the document has been painted, that is the write that follows the turn's reads (`readTogether`,
// src/primitives/read-together.ts): surfaces whose `open` is set in one task open in the order of their updates, the
// later on top.
//
// Before that, the surfaces asked to open open together in the first frame, in the order they stand in the document (a
// surface in a shadow root, where its host stands; two in one host's, in the order they asked): a page's markup that
// writes two of them open has the later above, focus in it, as if it had opened from the earlier. The order their
// updates came in is the order the bundle defines their elements — and an element may update a task later than another
// — which says nothing of the page; and nothing has been painted yet, so none of them was shown before another. A frame
// callback is the first moment every element the page's modules upgraded has asked: they open there, reading and then
// writing (`readThenWrite`) — or, where one of them asked to open in the first frame's read phase (`inPhase`:
// `readInPhase`, src/primitives/read-phase.ts), all of them in that phase, after the frame's layout and before its
// paint, where their opening reads nothing the frame has not laid out (a modal navigation drawer: opened in the turn of
// a loading page's upgrade, the dialog drawn at once, the room the page's scroll bar takes and the focus given had the
// browser style and lay out the whole page, several times). The phase is the asker's to give: a surface that never
// asks for it does not bring it into its bundle.

import { documentPainted } from './first-paint.js';
import { type PhaseRead, readThenWrite, readTogether } from './read-together.js';

/** `readInPhase` (src/primitives/read-phase.ts): asks for a read in the first frame's read phase. */
type InPhase = (owner: object, read: PhaseRead) => unknown;

/** The surfaces asked to open before the document's first paint and not opened yet: what each reads to open. */
const asked = new Map<Element, PhaseRead>();
/** The read phase, once a surface asked to open there. */
let phase: InPhase | undefined;
/** The frame callback that opens them, while one is asked for. */
let frame = 0;

/** The element of the document that `element` stands in: itself, or the host of its outermost shadow root. */
function standing(element: Element): Element {
  for (let root = element.getRootNode(); root instanceof ShadowRoot; root = element.getRootNode()) element = root.host;
  return element;
}

/**
 * Asks for `host`'s modal surface to open (MDL-8): `read` reads what it needs to, and returns the write that opens it.
 * Once the document has been painted, with the turn's reads; before that, with every surface asked to open by then, in
 * the document's order of the hosts, in the next frame — in its read phase where one of them gave it (`inPhase`).
 */
export function openInOrder(host: Element, read: PhaseRead, inPhase?: InPhase): void {
  if (documentPainted()) {
    readTogether(read);
    return;
  }
  asked.set(host, read);
  phase ??= inPhase;
  frame ||= requestAnimationFrame(openAsked);
}

/** Every surface asked to open, in the document's order: read, then opened — or asked of the read phase so. */
function openAsked() {
  frame = 0;
  // A stable sort: two that stand as one keep the order they asked in. (4: `Node.DOCUMENT_POSITION_FOLLOWING`, b after a.)
  const order = [...asked].sort(([a], [b]) => ((a = standing(a)) === (b = standing(b)) ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1));
  asked.clear();
  if (phase) for (const [surface, opens] of order) phase(surface, opens);
  else readThenWrite(order.map(([, opens]) => opens));
}
