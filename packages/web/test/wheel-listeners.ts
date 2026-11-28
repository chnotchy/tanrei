import type { Page } from '@playwright/test';

/**
 * A `wheel` listener added to the window or the document, or taken off it, has WebKit restyle the whole document at its
 * next read of a style: it keeps in every element's style whether the page listens for the wheel. On a page of 3,000
 * rows and 200 buttons with the package's stylesheets, that read took 40–47 ms in WebKit, against nothing in
 * Chromium and Firefox (an element's own `wheel` listener cost 9 ms there). So what the package listens for
 * on the window or the document while a person uses the page (the acts that end a still pointer, MOT-3; the scrolling
 * that ends a table of contents' hold, TOC-12) is listened for from its first use, or from the element's connection, to
 * the end of the page or of the element — never from one interaction to the next.
 *
 * `countWheelListeners()` starts counting, in the page, every `wheel` (or `mousewheel`) listener added to or taken off
 * the window or the document; `wheelListenersCounted()` returns what was counted since, each as
 * `<method> <type> on the <window|document>`. The count is the page's: a test reads it, it measures no time.
 */
export const countWheelListeners = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const counted: string[] = [];
    (window as unknown as { __wheelListeners: string[] }).__wheelListeners = counted;
    for (const method of ['addEventListener', 'removeEventListener'] as const) {
      const own = EventTarget.prototype[method] as (this: EventTarget, ...args: unknown[]) => void;
      // The page's own method, with the call noted where it is a wheel on the window or the document.
      EventTarget.prototype[method] = function (this: EventTarget, ...args: unknown[]) {
        const type = String(args[0]);
        if ((this === window || this === document) && /^(mouse)?wheel$/.test(type)) counted.push(`${method} ${type} on the ${this === window ? 'window' : 'document'}`);
        own.apply(this, args);
      } as unknown as EventTarget['addEventListener'];
    }
  });

export const wheelListenersCounted = (page: Page): Promise<string[]> => page.evaluate(() => [...(window as unknown as { __wheelListeners: string[] }).__wheelListeners]);
