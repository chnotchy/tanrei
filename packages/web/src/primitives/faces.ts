/**
 * What measures text hears the page's faces arrive. A text laid out while the face it asks for is loading is drawn,
 * and measured, in a fallback face of another width; the measurement has to be taken again once the face is there.
 *
 * The set of fonts says a load is over with `loadingdone` (and `loadingerror`), but not always: WebKit on Linux does not
 * fire `loadingdone` for a face that was already loading when the listener was added, though `document.fonts.ready`
 * resolves (a marquee text kept the width of its fallback face, 400.4 px where Inter draws 426.8, and never measured
 * again). So a watcher told that it measured while `document.fonts.status` was `loading` (`measured()`) is also told
 * when `document.fonts.ready` resolves — a load that is over whether or not an event said so.
 *
 * One subscription to the page's fonts for every watcher (not one per host: a page of a thousand checkboxes had two
 * thousand), none once no watcher is connected, and one wait on `ready` for every watcher that measured while loading.
 */

/** What a watcher is told: the faces whose load ended when an event names them; none when `ready` resolved. */
export type FacesChanged = (faces?: readonly FontFace[]) => void;

const fontSet = (): FontFaceSet | undefined => (typeof document === 'undefined' ? undefined : document.fonts);

const connected = new Map<FacesWatch, FacesChanged>();
/** The watchers that measured while a face was loading, told when the faces are ready. */
const waiting = new Set<FacesWatch>();
/** The `ready` promise waited on: one wait for each, however many watchers measured while it was pending. */
let awaited: Promise<FontFaceSet> | null = null;

function loadEnded(event: Event) {
  const faces = (event as Event & { fontfaces?: readonly FontFace[] }).fontfaces;
  for (const changed of [...connected.values()]) changed(faces);
}

/**
 * The watchers that measured since the last frame, and the frame callback that asks the set of fonts whether a face is
 * loading. `document.fonts.status` is a read of the page's style: WebKit brings the whole document's style up to date to
 * answer it. Asked in the task of a measurement — a Button's label changed by a press, a list's mark — it styled the
 * page once more in the task of the press, before its frame (a press on a docs page with ten thousand elements: 7 to
 * 50 ms each time in CI's WebKit). Asked in the next frame callback instead, it is answered with the style that frame
 * computes anyway, once for every watcher that measured meanwhile. A face that started loading in the measurement's
 * layout is still loading then, or its load has ended, and then `loadingdone` has told every connected watcher (the
 * listener was there before that load began; a load it was not there for is `unheard`).
 */
const asked = new Set<FacesWatch>();
/** Whether a load that was under way when the page's fonts were first listened to (`connect`) is still under way. */
let unheard = false;

function askStatus() {
  const fonts = fontSet();
  if (fonts?.status === 'loading') for (const watch of asked) if (connected.has(watch)) waitFor(watch, fonts);
  asked.clear();
}

/** `watch` is told when the faces are ready. */
function waitFor(watch: FacesWatch, fonts: FontFaceSet) {
  waiting.add(watch);
  awaitReady(fonts);
}

function awaitReady(fonts: FontFaceSet) {
  const ready = fonts.ready;
  if (ready === awaited) return;
  awaited = ready;
  void ready.then(() => {
    if (awaited === ready) awaited = null;
    // A watcher that measures again while another face is loading waits again, on the `ready` of that load.
    const told = [...waiting];
    waiting.clear();
    for (const watch of told) connected.get(watch)?.();
  });
}

export class FacesWatch {
  /** `changed`: measure again. Called after a face's load ends, and when the faces are ready after `measured()`. */
  constructor(private readonly changed: FacesChanged) {}

  /** Call when the host is connected. */
  connect() {
    const fonts = fontSet();
    if (!fonts || connected.has(this)) return;
    if (!connected.size) {
      fonts.addEventListener('loadingdone', loadEnded);
      fonts.addEventListener('loadingerror', loadEnded);
      // A load already under way is one no `loadingdone` may tell of (WebKit on Linux): until the faces are ready, a
      // measurement waits for them without asking.
      if (fonts.status === 'loading') {
        unheard = true;
        void fonts.ready.then(() => (unheard = false));
      }
    }
    connected.set(this, this.changed);
  }

  /** Call when the host is disconnected: it is told nothing more, and the page's fonts are let go with the last watcher. */
  disconnect() {
    if (!connected.delete(this)) return;
    waiting.delete(this);
    if (connected.size) return;
    const fonts = fontSet();
    fonts?.removeEventListener('loadingdone', loadEnded);
    fonts?.removeEventListener('loadingerror', loadEnded);
  }

  /**
   * Call after the host measured its text (after the layout its reads forced, in which a face its text first asks for
   * starts loading): while a face is loading, `changed` is called once more when the faces are ready. Whether one is
   * loading is asked in the next frame callback (`askStatus`).
   */
  measured() {
    const fonts = fontSet();
    if (!fonts || !connected.has(this)) return;
    if (unheard) return waitFor(this, fonts);
    if (!asked.size) requestAnimationFrame(askStatus);
    asked.add(this);
  }

}
