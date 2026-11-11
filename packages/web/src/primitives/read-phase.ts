// Two moments to read the layout or the cascade in, with every other element that asks: the frame's read phase
// (`readInPhase`), and the end of the turn of a render (`readTogether`, at the end of this file).
//
// The frame's read phase: one moment of each frame, after its layout and before it is painted, in which every element
// that asked reads the layout or the cascade — all of them first, then each writes what follows from what it read.
//
// A read of a box or of a computed style in an element's own turn (its connection, its update, a microtask of its own)
// has the browser style and lay out the page for that read, there and then. While a page is still loading, each module
// that defines its elements upgrades them in a task of its own, and a page that draws ten kinds of component pays for
// ten styles of the whole page before its first frame — on a long page, a tenth of a second each. A read here costs
// nothing: the frame has just been laid out for its paint, and the reads all come before the first write. What the
// writes change is styled and laid out again in the same frame, before it is painted, so the first frame painted shows
// it: nothing is drawn wrong and then corrected.
//
// The moment is a resize observer's: a frame delivers the first report of an element just observed after its layout,
// and the observer here is given the document's root element in a frame callback of its own each time it is asked for,
// and lets it go when it reports (`src/primitives/read-phase.test.ts` holds the order in every engine). Never `observe()` it from a resize observer's callback (a request that arrives while
// the phase runs waits for the next frame's): an element given to an observer in the middle of the reports of a frame,
// no deeper in the tree than the last one reported, is left for the next frame, and the browser reports an error
// ("ResizeObserver loop completed with undelivered notifications"). A root element with no box (a document that is not
// rendered) is reported never: its reads are made in a task after the frame instead. Where there is no resize observer
// they are made in the frame callback, before its layout — one style and layout for all of them, still.
//
// What is read here is read a frame later than in the element's own turn. Do not use it for what a script that waits
// for the element (`updateComplete`) must find in place, nor for a read whose answer the element's first style must
// have (a presentation that motion is drawn from: what is styled once is drawn from, MOT-3 aside).

/** A read made in the phase: it reads, and returns the write that follows from what it read, if any. */
export type PhaseRead = () => (() => void) | void;

/** What has asked to read in the next phase, by who asked: a second request of the same owner replaces the first. */
const queued = new Map<object, PhaseRead>();
let frame = 0;
let observing = false;
// Made with the module, before the elements that ask for it make theirs, and kept observing an element that is in no
// document, which is never reported: a frame's observers are told in the order they started to observe (WebKit forgets
// an observer that observes nothing, and counts it from its next `observe()`), so the phase comes before what a page or
// an element observes, and whatever they read there reads what the phase wrote.
const observer: ResizeObserver | null = typeof ResizeObserver === 'undefined' || typeof document === 'undefined' ? null : new ResizeObserver(() => run());
observer?.observe(document.createElement('div'));

/** The reads queued, then the writes they returned, in the order they were asked for. */
function run() {
  if (observing) {
    observing = false;
    observer?.unobserve(document.documentElement);
  }
  if (!queued.size) return;
  const due = [...queued.values()];
  queued.clear();
  const writes: (() => void)[] = [];
  let failure: { error: unknown } | null = null;
  for (const read of due) {
    try {
      const write = read();
      if (write) writes.push(write);
    } catch (error) {
      failure ??= { error };
    }
  }
  for (const write of writes) {
    try {
      write();
    } catch (error) {
      failure ??= { error };
    }
  }
  // One element's failure is not another's: every read and write ran, and the first failure is the phase's.
  if (failure) throw failure.error;
}

function schedule() {
  if (frame || observing || typeof requestAnimationFrame !== 'function') return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!queued.size) return;
    if (!observer) {
      run();
      return;
    }
    observing = true;
    observer.observe(document.documentElement);
    // Reported in this frame, after its layout, unless the root element has no box: then after the frame.
    setTimeout(() => {
      if (observing) run();
    });
  });
}

/**
 * Asks for `read` in the next frame's read phase, after its layout: every read of the phase runs before any write it
 * returns. `owner` asks once per phase: a later request replaces the read it asked for, in its place in the order.
 * Returns a function that withdraws the request.
 */
export function readInPhase(owner: object, read: PhaseRead): () => void {
  queued.set(owner, read);
  schedule();
  return () => {
    if (queued.get(owner) === read) queued.delete(owner);
  };
}

/** Withdraws what `owner` asked to read in the next phase. */
export function cancelPhaseRead(owner: object): void {
  queued.delete(owner);
}

// Reading together in the task of the render. A host that reads the cascade or the layout in its own update has the
// browser style and lay out the page for it there: Lit updates the hosts connected in one task one microtask after
// another, each read comes after the render before it, and building a hundred of them styles the page a hundred times.
// A read handed to `readTogether` is made in one microtask after the updates queued so far, with every other read of
// the turn, before any of the writes they return — one style and layout for them all, still in the task of the render,
// before any frame, and with the same answer: the cascade and the layout after every render of the turn. Nothing is
// cached; each request reads again.
//
// Ask in `willUpdate`, before the render, when the write gives something to an element the render makes (a Button's
// variant): the elements a render makes update in microtasks queued by the render, after the reads asked before it, so
// each is drawn with what it was given — never styled first without it, which would start a transition. A read asked
// in `updated` comes after the updates of the elements its render made.
//
// What a script that waits for the element (`updateComplete`) finds is in place: the reads of its update run before
// that promise settles. A write that changes what the host draws requests another update, which that promise does not
// wait for.

/** The reads asked for and not made yet. */
const together: PhaseRead[] = [];

/**
 * Asks for `read` together with every other host's of the turn: in a microtask after the updates queued so far, all the
 * reads, then the writes they returned, in the order they were asked for. A read asked by a write is made after them.
 */
export function readTogether(read: PhaseRead): void {
  if (!together.length) queueMicrotask(readAll);
  together.push(read);
}

function readAll() {
  let failure: { error: unknown } | null = null;
  while (together.length) {
    const due = together.slice();
    const writes: (() => void)[] = [];
    for (const read of due) {
      try {
        const write = read();
        if (write) writes.push(write);
      } catch (error) {
        failure ??= { error };
      }
    }
    for (const write of writes) {
      try {
        write();
      } catch (error) {
        failure ??= { error };
      }
    }
    // Taken off only now: a read asked by a write joins this microtask instead of queueing another.
    together.splice(0, due.length);
  }
  // One host's failure is not another's: every read and write ran, and the first failure is the turn's.
  if (failure) throw failure.error;
}
