import { COMPOSITION_INPUT_TYPES } from './composition-end.js';

/** The native element a component edits its text in. */
export type NativeText = HTMLInputElement | HTMLTextAreaElement;

export interface NativeTextOptions {
  /** The native element, when it is rendered. */
  input: () => NativeText | null;
  /** The component's value now. */
  value: () => string;
  /** The component takes a value the person gave the element (no event of its own: the element's `input` is it). */
  setValue: (value: string) => void;
  /**
   * The value the component's `input` reports, where the element shows another text in its place (a search's
   * suggestion or completion, SRC-14, SRC-55): a composition that ends with it as it began changed no value and is not
   * committed (TXI-4). `value` by default.
   */
  reported?: () => string;
  /**
   * What a committed composition may leave in the element, before the component takes it: the text field's limit
   * (TXF-18). `from` is the value when the composition began. Not called when a value the product set is applied.
   */
  commit?: (input: NativeText, from: string) => void;
  /**
   * After a composition has reached the component's value (a multi-line field's height, the count). `closed`: an
   * `input` closes it — the engine's, or the one the controller sends next; none closes a composition that changed no
   * value (TXI-4).
   */
  settled?: (closed: boolean) => void;
}

/**
 * A component's `value` and its native text element kept in step without breaking an input method (TXF-1, TXF-4, and
 * every component that edits text as the text field does: SRC-4). The element's own `input` event is the component's —
 * it is composed, so it leaves the shadow root by itself, after the element has taken the new value — and a value the
 * product sets is shown and fires nothing.
 *
 * While an input method composes, the composition is the platform's: the component's value follows the element and
 * nothing is written back; a value the product sets meanwhile waits for the end. A committed composition always
 * produces one `input` that is not composing — where the browser sent its last one before the end (Chromium, WebKit),
 * one more is sent. A composition that ends with the value as it began (cancelled, or committing nothing) is not
 * committed and produces none (TXI-1): nothing is sent, and the engine's own closing `input` (Firefox's) is stopped at
 * the element — unless the last `input` during the composition reported another value, which one `input` corrects.
 *
 * Bind `onCompositionStart` / `onCompositionEnd` on the element, call `composingInput(event)` first in its `input`
 * listener (and stop there when it returns true), and `show()` from `updated()`.
 */
export class NativeTextController {
  /** An input method is composing text in the element. */
  composing = false;
  /**
   * A composition has ended and the task that may send the `input` closing it has not run yet. An `input` that is not
   * composing while this is true is the one that closes the composition — what happened in between (an Escape that
   * closed a popup, SRC-5, CMB-21) is not undone by it. A composition that changed no value has no such `input`.
   */
  ending = false;
  /** The value when the composition began. */
  private from = '';
  /** The value the component's `input` reported when the composition began (`reported`). */
  private began = '';
  /** The value the last `input` of the composition reported: the element's text as it reached the component. */
  private last = '';
  /** The engine's own `input` closing the composition may still come (Firefox's), before the task that may send one. */
  private engineMayClose = false;
  /** The engine's closing `input` of a composition that changed no value was stopped (`composingInput`). */
  private stopped = false;
  /** A value the product set during a composition; it is applied when the composition ends. */
  private deferred: string | undefined;

  constructor(private readonly options: NativeTextOptions) {}

  /**
   * An `input` from the element during a composition: the value follows it and the caller does nothing else. Also the
   * engine's own `input` closing a composition that changed no value (Firefox sends it after the end): it is stopped
   * at the element, and the caller does nothing else either (TXI-4).
   */
  composingInput(event: Event): boolean {
    const input = this.options.input();
    if (!this.composing && !(event as InputEvent).isComposing) {
      if (!this.engineMayClose || !input || !COMPOSITION_INPUT_TYPES.has((event as InputEvent).inputType ?? '')) return false;
      this.engineMayClose = false;
      if (input.value !== this.began || input.value !== this.last) return false;
      this.stopped = true;
      event.stopPropagation();
      return true;
    }
    if (input) {
      this.options.setValue(input.value);
      this.last = input.value;
    }
    return true;
  }

  readonly onCompositionStart = () => {
    this.composing = true;
    this.from = this.options.value();
    this.began = (this.options.reported ?? this.options.value)();
    this.last = this.began;
  };

  readonly onCompositionEnd = (event: CompositionEvent) => {
    this.composing = false;
    const input = this.options.input();
    if (!input) return;
    if (this.deferred !== undefined) {
      input.value = this.deferred;
      this.deferred = undefined;
    } else this.options.commit?.(input, this.from);
    // This composition's own: another may begin before the task below runs.
    const began = this.began;
    let last = this.last;
    let heard = false;
    // The engine's `input` after the end, as the component left it (listeners on the element run in order).
    const hear = () => {
      heard = true;
      last = input.value;
    };
    input.addEventListener('input', hear, { once: true });
    this.ending = true;
    this.engineMayClose = true;
    this.stopped = false;
    setTimeout(() => {
      input.removeEventListener('input', hear);
      this.engineMayClose = false;
      // The element holds another value than the last `input` reported (a composition cut to the limit, TXF-18).
      const changed = input.value !== last;
      // The composition changed the value, and the engine sent no `input` after its end.
      const committed = !heard && input.value !== began;
      const send = changed || committed;
      this.options.setValue(input.value);
      this.options.settled?.(send || (heard && !this.stopped));
      if (send) input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertCompositionText', data: event.data }));
      this.ending = false;
      this.stopped = false;
    });
  };

  /**
   * Shows the component's value in the element — never into a composition: a value set meanwhile waits for its end (the
   * composition's own inputs keep the value in step with the element, so a difference is the product's). Returns
   * whether the element was written.
   */
  show(): boolean {
    const input = this.options.input();
    const value = this.options.value();
    if (!input || input.value === value) return false;
    if (this.composing) {
      this.deferred = value;
      return false;
    }
    input.value = value;
    return true;
  }
}
