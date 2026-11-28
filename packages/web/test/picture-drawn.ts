import { type Locator, expect } from '@playwright/test';
import { motionEnded } from './motions.ts';

/**
 * Waits until a component has drawn the picture it was given — it has loaded, the component has taken it in, it is
 * decoded — and, unless `atRest` is false, until what its arrival started has ended (the avatar's cross-fade, AVT-4;
 * the link card's fade in, LKC-13). Give the component's host; or an `<img>` — one that no component listens to, or a
 * picture of a component's own that keeps no state of its own (the image preview's thumbnail, whose `load` gives the
 * size it is drawn at, IMP-29) — which is waited for until its `load` has been dispatched.
 *
 * A picture's `complete` is not that moment. Every engine reports `complete` (and `naturalWidth`) before it dispatches
 * the element's `load` — measured in a page that watched 200 `data:` pictures arrive, one task at a time: Chromium 200
 * of 200, Firefox 200 of 200, WebKit 27 to 71 of 200 — and a component draws, or fades in, a picture in its `load`
 * listener. A wait for `complete` returned before that listener had run, and a read of the picture's opacity then
 * caught the fade it started a moment later (LKC-11 read 0.80 in Firefox). So the wait is for the state the component
 * sets in that listener, where it has one. `decode()` called once the picture is complete resolves after its `load`
 * in every engine (in none of those 600 pictures did it resolve before): a picture is drawn by then, and a component
 * that keeps no state of its own has had its `load`.
 */
export async function pictureDrawn(target: Locator, { atRest = true }: { atRest?: boolean } = {}): Promise<void> {
  const tag = await target.evaluate((el) => el.localName);
  const own = OWN_STATE[tag];
  const picture = own ? target.locator(own.selector) : tag === 'img' ? target : LOAD_ONLY[tag] ? target.locator(LOAD_ONLY[tag].selector) : null;
  if (!picture) throw new Error(`pictureDrawn: <${tag}> is no component this helper knows the picture of; add it to OWN_STATE (the state it sets when its picture has loaded) or, if it keeps none, to LOAD_ONLY`);
  if (own) await expect(picture, `<${tag}>: ${own.what}`).toHaveCount(1);
  else await expect.poll(() => picture.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: `<${tag}>: its picture has loaded` }).toBe(true);
  // Loaded is not yet drawn: a picture asked for with `decoding="async"` is decoded off the page's turn, and a picture
  // of the component taken before that shows its ground where the picture comes a frame later.
  await picture.evaluate((el: HTMLImageElement) => el.decode());
  if (atRest) await motionEnded(target);
}

/** The state each component sets in its picture's `load` listener: the picture element that carries it once it has loaded. */
const OWN_STATE: Record<string, { selector: string; what: string }> = {
  // AVT-4: `loaded` once the picture has loaded and been decoded; its cross-fade starts then.
  'tanrei-avatar': { selector: 'img.image.loaded', what: 'its picture is loaded (AVT-4: img.image.loaded)' },
  // FIT-6: `data-drawn` once the picture at the source drawn has loaded.
  'tanrei-file-item': { selector: 'img[part="preview"][data-drawn]', what: 'its picture is drawn (FIT-6: img[part="preview"][data-drawn])' },
  // IMP-29, IMP-30: the part `image` is the source that has loaded, on the page of the image shown (`--_at: 0`).
  'tanrei-image-preview': { selector: '.page[style="--_at: 0"] img[part="image"]', what: 'the image shown has loaded (IMP-29: its img[part="image"])' },
};

/**
 * The components that act in a picture's `load` listener and keep no state of their own that says it ran: waited for
 * by the picture's `load` itself, which `decode()` follows. A state of their own would say it in their terms.
 */
// TODO: the link card keeps no mark of a media picture it has taken in (it writes `data-tanrei-arriving` only while
// the fade runs); a private mark set in its `load` listener, as the file item's `data-drawn`, would let this wait for
// the card itself instead of for the order in which engines resolve `decode()`.
const LOAD_ONLY: Record<string, { selector: string }> = {
  // LKC-13: the media picture, the product's own `<img>` in the light DOM, which the card fades in from its `load`.
  'tanrei-link-card': { selector: 'img[data-part="media"]' },
};
