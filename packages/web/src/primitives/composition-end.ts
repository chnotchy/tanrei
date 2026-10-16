// The end of an input method's composition, and what an engine still reports for it once it has ended.
//
// A composition ends at its `compositionend`: by then every engine has put the committed text in the element (Chromium
// and WebKit send its last `input` before the end, Firefox one more after it, which no longer says it composes). What
// else may follow belongs to the composition by what it is, never by when a timer runs:
//   - an `input` or `beforeinput` whose inputType names a composition (`insertCompositionText`, Firefox's last one;
//     `insertFromComposition`, `deleteCompositionText`, `deleteByComposition`);
//   - the key that committed it, which WebKit reports after the end: carrying key code 229 — the platform's mark of a
//     key an input method took — or, where a platform reports it without any mark, pressed no later than the end.
// A timer of zero delay after the end is not that: an engine handles input before timers on a busy page, so the next
// thing a person typed could reach the component before such a timer ran, and be taken as the composition's (a key
// ignored, a digit lost) or the composition's text taken where the next one began. A composition committed by a pointer
// (a candidate picked) sends no key at all, so "the next key" would swallow a real one.

/** The inputTypes of a composition's own edits (Input Events Level 1 and 2, and what WebKit still sends). */
export const COMPOSITION_INPUT_TYPES: ReadonlySet<string> = new Set(['insertCompositionText', 'insertFromComposition', 'deleteCompositionText', 'deleteByComposition']);

/** An edit the input method made, during a composition or as the last report of one that ended. */
export const isCompositionInput = (event: Event): boolean =>
  (event as InputEvent).isComposing === true || COMPOSITION_INPUT_TYPES.has((event as InputEvent).inputType ?? '');

/**
 * Remembers when the last composition of an element ended, so that a key event can be told apart: the one that committed
 * it (the composition's) from one a person pressed afterwards (the component's). Call `ended(event)` from
 * `compositionend`; `reset()` when the element leaves the document.
 */
export class CompositionEnd {
  /** The `timeStamp` of the last `compositionend`: when the platform reported the composition ended. */
  private at = Number.NEGATIVE_INFINITY;

  readonly ended = (event: Event): void => {
    this.at = event.timeStamp;
  };

  reset(): void {
    this.at = Number.NEGATIVE_INFINITY;
  }

  /**
   * A key the input method took: one pressed while composing, one carrying key code 229, or one pressed no later than the
   * last composition ended — a key event's time is when the key was pressed, so the committing key a platform reports
   * after the end is earlier than it, and a key a person pressed after the end is later (both are read at the
   * platform's resolution: two times in its one step are the same time, and the key is the composition's).
   */
  tookKey(event: KeyboardEvent): boolean {
    return event.isComposing || event.keyCode === 229 || event.timeStamp <= this.at;
  }
}
