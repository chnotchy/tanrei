// Reading together in the task of the render (`readTogether`), and the step every batch of reads takes
// (`readThenWrite`): every read, then every write the reads returned. The frame's read phase (`readInPhase`) is in
// src/primitives/read-phase.ts, which says why both exist; this module is apart from it so that what reads together
// only (the motions held from the next frame, src/primitives/motion.ts) does not bring the phase's resize observer.
//
// A host that reads the cascade or the layout in its own update has the browser style and lay out the page for it
// there: Lit updates the hosts connected in one task one microtask after another, each read comes after the render
// before it, and building a hundred of them styles the page a hundred times. A read handed to `readTogether` is made in
// one microtask after the updates queued so far, with every other read of the turn, before any of the writes they
// return — one style and layout for them all, still in the task of the render, before any frame, and with the same
// answer: the cascade and the layout after every render of the turn. Nothing is cached; each request reads again.
//
// Ask in `willUpdate`, before the render, when the write gives something to an element the render makes (a Button's
// variant): the elements a render makes update in microtasks queued by the render, after the reads asked before it, so
// each is drawn with what it was given — never styled first without it, which would start a transition. A read asked
// in `updated` comes after the updates of the elements its render made.
//
// What a script that waits for the element (`updateComplete`) finds is in place: the reads of its update run before
// that promise settles. A write that changes what the host draws requests another update, which that promise does not
// wait for.

/** A read: it reads, and returns the write that follows from what it read, if any. */
export type PhaseRead = () => (() => void) | void;

/**
 * Runs `reads`, then the writes they returned, in the order of the reads. One read's failure is not another's: every
 * read and write runs, and the first failure is thrown once they have.
 */
export function readThenWrite(reads: Iterable<PhaseRead>): void {
  const writes: (() => void)[] = [];
  let failure: { error: unknown } | null = null;
  for (const read of reads) {
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
  if (failure) throw failure.error;
}

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
    try {
      readThenWrite(due);
    } catch (error) {
      failure ??= { error };
    }
    // Taken off only now: a read asked by a write joins this microtask instead of queueing another.
    together.splice(0, due.length);
  }
  // One host's failure is not another's: every read and write ran, and the first failure is the turn's.
  if (failure) throw failure.error;
}
