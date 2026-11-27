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
/**
 * Whether the page's fonts were first listened to while the document was loading, and the set has not been asked
 * since whether a load is under way (`connect`). Until it is, a watcher that measures is asked about in the next frame
 * callback with the others: if a load is under way then, it waits for the faces as one `connect` found would; if none
 * is, one may have ended since it measured with no event to say so, and it is told to measure again there.
 */
let connecting = false;
/** The frame callback that asks the set (`askStatus`), while one is requested. */
let frame = 0;

function askSoon() {
  if (!frame) frame = requestAnimationFrame(askStatus);
}

function askStatus() {
  frame = 0;
  const fonts = fontSet();
  const watches = [...asked].filter((watch) => connected.has(watch));
  asked.clear();
  if (!fonts) return;
  const loading = fonts.status === 'loading';
  if (connecting) {
    connecting = false;
    if (loading) void fonts.ready.then(() => (unheard = false));
    else {
      unheard = false;
      for (const watch of watches) connected.get(watch)?.();
      return;
    }
  }
  if (loading) for (const watch of watches) waitFor(watch, fonts);
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
    // The faces are ready, so the load `connect` found is over too. Cleared only by that load's own `ready`, `unheard`
    // stayed set where WebKit had not settled it yet: a watcher told here measured again, waited on this settled
    // `ready`, and was told again in the next microtask — for ever, and the page never finished loading.
    unheard = false;
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
      // measurement waits for them without asking. While the document is still loading one is taken to be under way,
      // and the set is asked in the next frame callback (`askStatus`), with the style that frame computes anyway:
      // `status` is a read of the page's style in WebKit, and `ready` in Chromium, and asked here — in the connection
      // of the page's first host, while its modules upgrade one kind of element after another — they styled the whole
      // page there and then, in a task of its own (three quarters of a second of a long page's load in CI's WebKit).
      if (document.readyState !== 'complete') {
        unheard = true;
        connecting = true;
        askSoon();
      } else if (fonts.status === 'loading') {
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
    if (unheard && !connecting) return waitFor(this, fonts);
    askSoon();
    asked.add(this);
  }

}
