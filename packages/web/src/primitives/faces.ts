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
   * starts loading): while a face is loading, `changed` is called once more when the faces are ready.
   */
  measured() {
    const fonts = fontSet();
    if (!fonts || fonts.status !== 'loading' || !connected.has(this)) return;
    waiting.add(this);
    awaitReady(fonts);
  }
}
