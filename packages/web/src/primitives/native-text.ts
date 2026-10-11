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
   * What a committed composition may leave in the element, before the component takes it: the text field's limit
   * (TXF-18). `from` is the value when the composition began. Not called when a value the product set is applied.
   */
  commit?: (input: NativeText, from: string) => void;
  /** After a committed composition has reached the component's value (a multi-line field's height, the count). */
  settled?: () => void;
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
 * one more is sent.
 *
 * Bind `onCompositionStart` / `onCompositionEnd` on the element, call `composingInput(event)` first in its `input`
 * listener (and stop there when it returns true), and `show()` from `updated()`.
 */
export class NativeTextController {
  /** An input method is composing text in the element. */
  composing = false;
  /** The value when the composition began. */
  private from = '';
  /** A value the product set during a composition; it is applied when the composition ends. */
  private deferred: string | undefined;

  constructor(private readonly options: NativeTextOptions) {}

  /** An `input` from the element during a composition: the value follows it and the caller does nothing else. */
  composingInput(event: Event): boolean {
    if (!this.composing && !(event as InputEvent).isComposing) return false;
    const input = this.options.input();
    if (input) this.options.setValue(input.value);
    return true;
  }

  readonly onCompositionStart = () => {
    this.composing = true;
    this.from = this.options.value();
  };

  readonly onCompositionEnd = (event: CompositionEvent) => {
    this.composing = false;
    const input = this.options.input();
    if (!input) return;
    if (this.deferred !== undefined) {
      input.value = this.deferred;
      this.deferred = undefined;
    } else this.options.commit?.(input, this.from);
    let heard = false;
    const hear = () => (heard = true);
    input.addEventListener('input', hear, { once: true });
    setTimeout(() => {
      input.removeEventListener('input', hear);
      const changed = input.value !== this.options.value();
      this.options.setValue(input.value);
      this.options.settled?.();
      if (!heard || changed) input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertCompositionText', data: event.data }));
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
