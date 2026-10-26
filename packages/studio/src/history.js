// What can be undone and redone: the layers the person committed, newest last. A step is one commit (ui.ts
// `ctx.commit`), and the commits that follow one another closely — the letters of a name typed in one go, the steps of
// a slider moved by its keys — are one step: a commit that comes less than `merge` milliseconds after the last one
// joins its step, so undoing takes them back together. A commit that stands `alone` — a new start, a layer loaded in
// the place of the layer, a shuffle — is a step of its own however soon it comes, and the next commit is not joined to it.
// A value shown while it moves (a drag) is no commit and no step.
//
// It keeps layers, never pieces of one: undoing hands back the layer as it was, and the Studio draws it whole.

/**
 * @param {{ limit?: number, merge?: number, now?: () => number }} [options]
 *   `limit`: how many steps are kept (the oldest goes first); `merge`: the time, in ms, within which a commit joins the
 *   step before it; `now`: the clock (tests give their own).
 */
export function createHistory({ limit = 100, merge = 500, now = () => Date.now() } = {}) {
  /** @type {unknown[]} */
  let past = [];
  /** @type {unknown[]} */
  let future = [];
  let last = -Infinity;
  return {
    /**
     * A commit is about to replace `before`: remember it, unless the commit joins the step that is open. Redo is gone.
     * `alone`: the commit is a step of its own, and closes it.
     */
    record(before, { alone = false } = {}) {
      const at = now();
      if (alone || !(past.length && at - last < merge)) {
        past.push(before);
        if (past.length > limit) past.shift();
      }
      last = alone ? -Infinity : at;
      future = [];
    },
    /** The layer before `current`, or `null`; `current` can then be redone. */
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      last = -Infinity;
      return past.pop();
    },
    /** The layer that was undone last, or `null`; `current` can then be undone again. */
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      last = -Infinity;
      return future.pop();
    },
    /** Forget every step: the layer came from somewhere else (the file was read again). */
    clear() {
      past = [];
      future = [];
      last = -Infinity;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
  };
}
