import { type PropertyDeclarations, type PropertyValues, css, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { wordPlaces } from '../../generated/words.js';
import { exported } from '../../primitives/composed.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  BUTTON_VARIANTS,
  GlyphDrawnController,
  SHEET_FLING_VELOCITY,
  SHEET_TOUCH_SLOP,
  SystemWatchController,
  WordsController,
  closeRequestReason,
  compChoice,
  deepActive,
  focusOverlay,
  giveVariant,
  holdPageScroll,
  modalLayer,
  modalSheetKeys,
  report,
  returnFocus,
  stoppedBefore,
  syncFocusStyle,
  watchEscape,
  watchInput,
} from '../../primitives/index.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import { fillPlaces, reportPlaces } from '../../primitives/places.js';
import { TanreiButton } from '../button/button.js';
import '../skeleton/skeleton.js';
import { styles } from './image-preview.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** Why the preview asks to close (IMP-5): its close control, Escape, the platform's back, or the downward drag by touch. */
export type TanreiImagePreviewCloseReason = 'button' | 'escape' | 'back' | 'swipe';

/** `close`'s detail: why the preview asks to be closed. */
export interface TanreiImagePreviewCloseDetail {
  reason: TanreiImagePreviewCloseReason;
}
/** `indexchange`'s detail: the image the person moved to, counted from 0. */
export interface TanreiImagePreviewIndexChangeDetail {
  index: number;
}
/** `zoomchange`'s detail: the zoom the image shown has now (1 is its fit). */
export interface TanreiImagePreviewZoomChangeDetail {
  zoom: number;
}
/** `controlshiddenchange`'s detail: whether the controls are hidden now. */
export interface TanreiImagePreviewControlsHiddenChangeDetail {
  hidden: boolean;
}
/** `loaderror`'s detail: the image whose source did not load, counted from 0. */
export interface TanreiImagePreviewLoadErrorDetail {
  index: number;
}

const ITEM_TAG = 'tanrei-image-preview-item';
const PREFIX = '--tanrei-comp-image-preview';
/** The five controls, in the order Tab visits them (IMP-3); each is a part of that name (IMP-8, IMP-10). */
const CONTROLS = ['zoom-out', 'zoom-in', 'close', 'previous', 'next'] as const;
type Control = (typeof CONTROLS)[number];

/** Each Button's documented parts under the control's name: `close-container`, `close-label`, `close-icon`. */
const BUTTON_PARTS = Object.fromEntries(
  CONTROLS.map((control) => [control, exported(TanreiButton, Object.fromEntries(TanreiButton.parts.map((part) => [part, { as: `${control}-${part}` }])))]),
) as Record<Control, { attribute: string; names: string[] }>;

/** IMP-14: two presses are a double tap within this long, in ms, and within the touch slop: the web names no interval of its own. */
const DOUBLE_TAP = 300;
/** IMP-14: how far apart the two presses of a double tap may land, in px: a second finger does not land within the slop of a drag. */
const DOUBLE_TAP_REACH = 24;
/** IMP-15: how much one pixel of a wheel turned with Ctrl or Command — or of a trackpad pinch, which arrives as one — changes the zoom. */
const WHEEL_ZOOM = 0.01;
/** IMP-15, IMP-21: a wheel names no end of its gesture; one that has been still this long, in ms, has ended. */
const WHEEL_END = 160;
/** IMP-16: a wheel that counts lines or pages, as pixels. */
const WHEEL_LINE = 16;
/** IMP-16: how a fling slows — the time, in ms, over which its speed falls to 1/e — and the speed below which it has stopped, in px per ms. */
const FLING_TIME = 325;
const FLING_REST = 0.02;
/** IMP-18: how much of a drag past the first or the last image the image follows (the web names no overscroll of its own). */
const OVERSCROLL = 0.3;
const EPSILON = 0.001;

interface Size {
  w: number;
  h: number;
}

/** One image of the set, as its element holds it. */
interface ImageData {
  element: Element;
  src: string;
  alt: string;
  caption: string;
  thumbnailSrc: string;
  width: number | null;
  height: number | null;
}

/** One of the three images asked for (IMP-32): what was asked, what is drawn, and what is known of its size. */
interface Picture {
  /** The source asked for: the item's `src`. Empty: nothing was asked, and the image waits (IMP-29). */
  asked: string;
  /** The source drawn: the last that loaded (IMP-30). */
  drawn: string;
  /** The source that was asked for and did not load (IMP-31). */
  refused: string;
  /** The picture's own size: the item's `width` and `height`, else what the first source that loaded was. */
  own: Size | null;
  /** The thumbnail's source and, once it has loaded, its size; `failed` when it did not arrive. */
  thumbnail: string;
  thumbnailSize: Size | null;
  thumbnailFailed: boolean;
}

/** Where the image shown is: its zoom, and how far its centre is from the centre of the fit area. */
interface View {
  z: number;
  x: number;
  y: number;
}

/** A pointer on the stage. */
interface Touch {
  x: number;
  y: number;
  type: string;
}

type Gesture =
  | { kind: 'wait'; id: number; x: number; y: number; time: number }
  | { kind: 'pan'; id: number; lastX: number; lastY: number; samples: { x: number; y: number; time: number }[] }
  | { kind: 'page'; id: number; x: number; from: number; samples: { at: number; time: number }[] }
  | { kind: 'close'; id: number; y: number; samples: { at: number; time: number }[] }
  | { kind: 'pinch'; distance: number; midX: number; midY: number; view: View }
  | { kind: 'none'; id: number };

/** One event of the preview's, with its detail, from the element. */
function fire<T>(host: Element, name: string, detail: T) {
  host.dispatchEvent(new CustomEvent<T>(name, { detail, bubbles: true, composed: true }));
}

const positive = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** IMP-31: nothing is drawn for it, and what was asked for did not load. */
const failed = (picture: Picture | null): boolean => !!picture && !picture.drawn && !!picture.asked && picture.refused === picture.asked;

const numberOrNull = {
  fromAttribute: (value: string | null) => (value === null || value.trim() === '' ? null : Number(value)),
};

/**
 * One picture of an image preview's set: where it is, what it shows in words, and optionally what the product says
 * about it. `<tanrei-image-preview-item src="room-large.jpg" alt="A bedroom with a window onto a garden">`.
 *
 * The element is data for the preview that holds it: it draws nothing, takes no focus and fires no event, and it is
 * not an `<img>`, so the browser asks for no picture the preview has not asked for (IMP-32). The preview reads its
 * children in order and reads them again when an attribute changes. Every property reflects to its attribute, which
 * is what the preview reads.
 *
 * @tag tanrei-image-preview-item
 */
export class TanreiImagePreviewItem extends TanreiElement {
  static override styles = css`
    :host {
      display: none !important;
    }
  `;

  static override properties: PropertyDeclarations = {
    src: { type: String, reflect: true },
    alt: { type: String, reflect: true },
    caption: { type: String, reflect: true },
    thumbnailSrc: { type: String, attribute: 'thumbnail-src', reflect: true },
    width: { converter: numberOrNull, reflect: true },
    height: { converter: numberOrNull, reflect: true },
  };

  /** The address of the picture as the preview shows it — usually a larger file than the thumbnail on the page. Required; while it is empty the preview asks for nothing and the image waits. Changed while the image is shown, the new picture replaces the old one in place once it has loaded (IMP-30). */
  src = '';

  /** What the picture shows, in the product's language: the name assistive technology reads for it. Required for every image (IMP-27). Never drawn. */
  alt = '';

  /** What the product says about the picture, drawn below it and read as its description: a credit, a date, a sentence. Plain text of any length; a long one scrolls in its own region (IMP-26). Empty draws no caption. */
  caption = '';

  /** The address of a smaller picture of the same image that the page has usually loaded already (`thumbnail-src`). Drawn enlarged in the image's place until `src` has loaded, in place of the Skeleton (IMP-29). */
  thumbnailSrc = '';

  /** The picture's own width in pixels, where the product knows it. With `height` it lets the preview hold the image's place before the picture has loaded. Null: learned when it loads. */
  width: number | null = null;

  /** The picture's own height in pixels; see `width`. */
  height: number | null = null;
}

/**
 * Shows one picture of a set over the whole window when the person presses its thumbnail, to be looked at closely —
 * enlarged and back by a double tap, a pinch, a control or a key, moved about while enlarged — and moved on to the
 * next picture or back, until it is closed.
 *
 * Contract: specs/image-preview.spec.json. A feature: its stage — the picture, its zoom and its place —
 * and its pager are its own; its five controls are real `<tanrei-button>` elements and its placeholder a real
 * `<tanrei-skeleton>`, each reading its own tokens. The images are `<tanrei-image-preview-item>` children.
 *
 * The product opens it from its own thumbnail — a `<button type="button" aria-haspopup="dialog">` around its own
 * picture, named for what it does — by setting `index` and `open`, and closes it in answer to `close` by setting
 * `open` to false: the preview never closes itself. It is a native `<dialog>` in the shadow root opened with
 * `showModal()`: in the top layer over the whole window, everything else inert, the page held from scrolling, focus on
 * the stage and kept inside, and returned where it was when the preview closes. It writes no history entry.
 *
 * Every gesture has a control and a key: the zoom controls and `+` `−` `0` for a double tap and a pinch; the previous
 * and next controls, the arrow keys, Page Up, Page Down, Home and End for a sideways drag; the arrow keys for a drag
 * over an enlarged picture; the close control and Escape for the downward drag by touch. `index`, `zoom` and
 * `controlsHidden` are plain values the element writes itself on a person's change, before the event.
 *
 * Only the image shown and the one before and after it are asked for. An item without a `src` is asked for nothing
 * and waits. Every visual value comes from `--tanrei-comp-image-preview-*` tokens.
 *
 * @tag tanrei-image-preview
 * @slot - The images: `<tanrei-image-preview-item>` elements, in the order they are shown. They are read, never drawn in place.
 * @csspart container - The surface that fills the window: the native `<dialog>`.
 * @csspart bar - The row across the top: the count and the zoom-out, zoom-in and close controls.
 * @csspart count - The sentence that says which image of how many is shown.
 * @csspart stage - The whole of the container as the place the image is shown: the focus stop that takes the gestures and the keys, exposed as the image shown.
 * @csspart image - The picture shown, and its neighbour beside it while one replaces the other.
 * @csspart placeholder - What stands in the image's place while it is on its way: its thumbnail enlarged, or the box of the Skeleton.
 * @csspart error - The mark and the sentence in place of an image that did not arrive.
 * @csspart caption - The region that holds the text about the image shown, and scrolls where it is long.
 * @csspart zoom-out - The zoom-out control: a `<tanrei-button>`.
 * @csspart zoom-in - The zoom-in control: a `<tanrei-button>`.
 * @csspart close - The close control: a `<tanrei-button>`.
 * @csspart previous - The previous control: a `<tanrei-button>`.
 * @csspart next - The next control: a `<tanrei-button>`.
 * @exportparts tanrei-button container: zoom-out-container, label: zoom-out-label, icon: zoom-out-icon
 * @exportparts tanrei-button container: zoom-in-container, label: zoom-in-label, icon: zoom-in-icon
 * @exportparts tanrei-button container: close-container, label: close-label, icon: close-icon
 * @exportparts tanrei-button container: previous-container, label: previous-label, icon: previous-icon
 * @exportparts tanrei-button container: next-container, label: next-label, icon: next-icon
 * @fires {CustomEvent<TanreiImagePreviewCloseDetail>} close - The person asked to close the preview: `detail.reason` is `button`, `escape`, `back` or `swipe`. Set `open` to false.
 * @fires {CustomEvent<TanreiImagePreviewIndexChangeDetail>} indexchange - The person moved to another image: `detail.index`, which `index` already is. Not fired when you set `index`.
 * @fires {CustomEvent<TanreiImagePreviewZoomChangeDetail>} zoomchange - The zoom changed by the person's gesture, control or key, or returned to 1 because the image changed: `detail.zoom`, once the change has ended. Not fired when you set `zoom`.
 * @fires {CustomEvent<TanreiImagePreviewControlsHiddenChangeDetail>} controlshiddenchange - The person hid or showed the controls: `detail.hidden`. Not fired when you set `controlsHidden`.
 * @fires {CustomEvent<TanreiImagePreviewLoadErrorDetail>} loaderror - The source of an image the preview asked for did not load: `detail.index`. Once for each source that fails.
 */
export class TanreiImagePreview extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'image-preview');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  /** IMP-8, IMP-10: the variants its tokens name are read again when the document's root switches the design system. */
  private readonly system = new SystemWatchController(this);
  /** IMP-31: the mark carries `data-drawn` while the icon set can draw its ligature; until then it draws nothing. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.glyph') ?? []);

  static override styles = [styles, hiddenHost];

  /** @internal */
  static readonly parts: readonly string[] = ['container', 'bar', 'count', 'stage', 'image', 'placeholder', 'error', 'caption', ...CONTROLS, ...CONTROLS.flatMap((control) => BUTTON_PARTS[control].names)];

  static override properties: PropertyDeclarations = {
    open: { type: Boolean, reflect: true },
    index: { type: Number },
    zoom: { type: Number },
    maxZoom: { converter: numberOrNull, attribute: 'max-zoom' },
    controlsHidden: { type: Boolean, attribute: 'controls-hidden', reflect: true },
    label: { type: String },
    closeLabel: { type: String, attribute: 'close-label' },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
    zoomInLabel: { type: String, attribute: 'zoom-in-label' },
    zoomOutLabel: { type: String, attribute: 'zoom-out-label' },
    countText: { type: String, attribute: 'count-text' },
    loadingLabel: { type: String, attribute: 'loading-label' },
    errorText: { type: String, attribute: 'error-text' },
    images: { state: true },
    shown: { state: true },
    drawn: { state: true },
    captionScrolls: { state: true },
  };

  /** Whether the preview is presented. Open it from your own thumbnail, with `index` set to that image, and close it in answer to `close`. Reflected. */
  open = false;

  /** Which image is shown, counted from 0 in the order the images are given. The person changes it by a drag, the previous and next controls and the keys, and the preview then fires `indexchange`; setting it fires nothing. A number outside the images is taken as the nearest that exists (IMP-20). */
  index = 0;

  /** How far the image shown is enlarged: 1 is its fit in the window, 2 twice that. The person changes it by a double tap, a pinch, the zoom controls and the keys, and the preview then fires `zoomchange`; it returns to 1 whenever the image shown changes. Kept between 1 and the greatest zoom (IMP-12). */
  zoom = 1;

  /** The greatest zoom (`max-zoom`). Null takes the greater of 4 and twice the zoom at which the image fills the window's free area, so that a very wide or very tall image can still be read (IMP-12). */
  maxZoom: number | null = null;

  /** Whether the bar, the count, the previous and next controls and the caption are not drawn (`controls-hidden`). The person changes it by one tap on the picture, and the preview then fires `controlshiddenchange`; any key, focus on a control or a moving mouse shows them again (IMP-25). Hidden controls stay in the focus order and exposed to assistive technology. Reflected. */
  controlsHidden = false;

  /** The accessible name of the preview, in the product's language ("Photos of the room"). Never drawn. Required. */
  label = '';

  /** The close control's accessible name ("Close"). Required. Left empty, it reads the product's words (`closeLabel`). */
  closeLabel = '';

  /** The previous control's accessible name ("Previous image"). Required while there are two or more images. Left empty, it reads the product's words (`previousImageLabel`). */
  previousLabel = '';

  /** The next control's accessible name ("Next image"). Required while there are two or more images. Left empty, it reads the product's words (`nextImageLabel`). */
  nextLabel = '';

  /** The zoom-in control's accessible name ("Zoom in"). Required. Left empty, it reads the product's words (`zoomInLabel`). */
  zoomInLabel = '';

  /** The zoom-out control's accessible name ("Zoom out"). Required. Left empty, it reads the product's words (`zoomOutLabel`). */
  zoomOutLabel = '';

  /**
   * The sentence that says which image of how many is shown, drawn in the bar and told to assistive technology. Write
   * the whole sentence in your own language and mark two places in it, which the preview fills: `{position}` with the
   * place of the image shown, counted from 1, and `{count}` with the number of images ("{position} of {count}"). Left
   * empty, it reads the product's words (`imageCountText`). Required while there are two or more images.
   */
  countText = '';

  /** What assistive technology is told while the image shown is on its way ("Loading image"): the name of the Skeleton that stands in its place. Left empty, the Skeleton reads the product's words (`loadingLabel`). */
  loadingLabel = '';

  /** The sentence drawn, and told to assistive technology, in place of an image that did not arrive ("This image could not be loaded"). Left empty, it reads the product's words (`imageErrorText`). Required. */
  errorText = '';

  /** The images, as its children hold them now. */
  private images: ImageData[] = [];
  /** The place of the image shown: `index`, kept within the images (IMP-20). */
  private shown = 0;
  /** Counts what is drawn anew for a reason that is no property (a source that loaded, a zoom that ended). */
  private drawn = 0;
  /** IMP-26: whether the caption's text needs more than its region. */
  private captionScrolls = false;

  /** IMP-32: the three images asked for, by their elements. */
  private readonly pictures = new Map<Element, Picture>();
  /** IMP-31: the sources that failed, by element: `loaderror` is fired once for each. */
  private readonly failed = new WeakMap<Element, Set<string>>();
  /** A picture's own size, kept while its element is not one of the three, so that it is drawn where it was. */
  private readonly sizes = new WeakMap<Element, Size>();

  /** IMP-12 to IMP-17: where the image shown is. */
  private view: View = { z: 1, x: 0, y: 0 };
  /** IMP-11: the stage and the fit area in it, as last measured (px, from the stage's top left corner). */
  private stage: Size = { w: 0, h: 0 };
  private fit = { x: 0, y: 0, w: 0, h: 0 };

  /** IMP-4: where focus was when it opened. */
  private opener: Element | null = null;
  /** Presented: in the top layer. */
  private presented = false;
  /** IMP-43: an opening with nothing to show was reported, until there is something. */
  private reportedEmpty = false;

  private readonly touches = new Map<number, Touch>();
  private gesture: Gesture | null = null;
  /** IMP-14: the last single press, which a second one within the interval makes a double tap. */
  private lastTap: { x: number; y: number; time: number; timer: ReturnType<typeof setTimeout> } | null = null;
  /** IMP-25: where the pointer was when the controls were hidden by a press: a mouse shows them again once it has moved from there. */
  private hiddenAt: { x: number; y: number } | null = null;
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  private flingFrame = 0;
  /** IMP-15: the view when a trackpad pinch that arrives as a gesture event began. */
  private gestureView: View | null = null;
  /** IMP-28: the control that had focus when it became disabled: focus goes to the stage once it is drawn so. */
  private focusLeaves = false;

  private readonly children$ = new MutationObserver(() => this.readImages());
  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.onResize());

  private get dialog(): HTMLDialogElement | null {
    return this.renderRoot?.querySelector('dialog') ?? null;
  }

  private get stageElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.stage') ?? null;
  }

  private get pagesElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.pages') ?? null;
  }

  private get reduced(): boolean {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private get rtl(): boolean {
    return this.matches(':dir(rtl)');
  }

  override connectedCallback() {
    super.connectedCallback();
    this.children$.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'alt', 'caption', 'thumbnail-src', 'width', 'height'] });
    this.readImages();
    if (this.hasUpdated && this.open) this.present();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$.disconnect();
    this.resize$?.disconnect();
    if (this.presented) this.withdraw(false);
  }

  // ---- The images (IMP-20, IMP-32, IMP-43) ----

  /** The images, read from its children in order. */
  private readImages() {
    const read: ImageData[] = [...this.children]
      .filter((child) => child.localName === ITEM_TAG)
      .map((element) => {
        const number = (name: string) => {
          const written = element.getAttribute(name);
          const value = written === null || written.trim() === '' ? null : Number(written);
          return positive(value) ? value : null;
        };
        return {
          element,
          src: element.getAttribute('src') ?? '',
          alt: element.getAttribute('alt') ?? '',
          caption: element.getAttribute('caption') ?? '',
          thumbnailSrc: element.getAttribute('thumbnail-src') ?? '',
          width: number('width'),
          height: number('height'),
        };
      });
    const same =
      read.length === this.images.length &&
      read.every((image, at) => {
        const was = this.images[at];
        return image.element === was.element && image.src === was.src && image.alt === was.alt && image.caption === was.caption && image.thumbnailSrc === was.thumbnailSrc && image.width === was.width && image.height === was.height;
      });
    if (!same) this.images = read;
  }

  /** IMP-20: `index` within the images: the nearest that exists. */
  private within(index: number): number {
    const last = this.images.length - 1;
    if (last < 0) return 0;
    const whole = Number.isFinite(index) ? Math.round(index) : 0;
    return Math.min(last, Math.max(0, whole));
  }

  /** IMP-32: the picture of each of the three images, asked for as its `src` says now; every other is let go. */
  private syncPictures() {
    // Closed, it asks for nothing: what it drew stays as it was while it fades (IMP-33), and is let go after.
    if (!this.open) return;
    const three = [this.shown - 1, this.shown, this.shown + 1].filter((at) => at >= 0 && at < this.images.length);
    const kept = new Set<Element>();
    for (const at of three) {
      const image = this.images[at];
      kept.add(image.element);
      const declared = positive(image.width) && positive(image.height) ? { w: image.width, h: image.height } : null;
      let picture = this.pictures.get(image.element);
      if (!picture) {
        picture = { asked: '', drawn: '', refused: '', own: declared ?? this.sizes.get(image.element) ?? null, thumbnail: '', thumbnailSize: null, thumbnailFailed: false };
        this.pictures.set(image.element, picture);
      }
      if (declared) picture.own = declared;
      // IMP-30, IMP-31: another source is asked for; the earlier picture stays drawn until it has loaded.
      picture.asked = image.src;
      if (picture.thumbnail !== image.thumbnailSrc) {
        picture.thumbnail = image.thumbnailSrc;
        picture.thumbnailSize = null;
        picture.thumbnailFailed = false;
      }
    }
    for (const element of [...this.pictures.keys()]) if (!kept.has(element)) this.pictures.delete(element);
  }

  private pictureAt(at: number): Picture | null {
    const image = this.images[at];
    return image ? (this.pictures.get(image.element) ?? null) : null;
  }

  /** IMP-13, IMP-29, IMP-31: whether the image shown can be enlarged: it has loaded. */
  private get ready(): boolean {
    const picture = this.pictureAt(this.shown);
    return !!picture && !!picture.drawn;
  }

  private readonly onLoad = (event: Event) => {
    const element = event.currentTarget as HTMLImageElement;
    const at = Number(element.dataset.at);
    const picture = this.pictureAt(at);
    const src = element.dataset.src ?? '';
    if (!picture || src !== picture.asked) return;
    const natural = positive(element.naturalWidth) && positive(element.naturalHeight) ? { w: element.naturalWidth, h: element.naturalHeight } : null;
    const image = this.images[at];
    const declared = positive(image.width) && positive(image.height);
    // IMP-30: a picture of the same proportions as the one drawn takes its place, at its size; another is its own.
    if (!declared && natural) {
      const same = picture.own && Math.abs(picture.own.w / picture.own.h - natural.w / natural.h) < 0.01;
      if (!same || !picture.drawn) picture.own = natural;
    }
    if (picture.own) this.sizes.set(image.element, picture.own);
    picture.drawn = src;
    this.drawn++;
  };

  private readonly onError = (event: Event) => {
    const element = event.currentTarget as HTMLImageElement;
    const at = Number(element.dataset.at);
    const picture = this.pictureAt(at);
    const src = element.dataset.src ?? '';
    const image = this.images[at];
    if (!picture || !image || src !== picture.asked) return;
    // IMP-31: once for each source that fails.
    const told = this.failed.get(image.element) ?? new Set<string>();
    const first = !told.has(src);
    told.add(src);
    this.failed.set(image.element, told);
    // A source that was to replace a picture that is drawn (IMP-30) leaves that picture drawn.
    picture.refused = src;
    this.drawn++;
    if (first) this.emit<TanreiImagePreviewLoadErrorDetail>('loaderror', { index: at });
    if (at === this.shown && failed(picture)) {
      const sentence = this.words.get('imageErrorText', this.errorText);
      if (sentence) this.say([sentence]);
    }
  };

  private readonly onThumbnailLoad = (event: Event) => {
    const element = event.currentTarget as HTMLImageElement;
    const picture = this.pictureAt(Number(element.dataset.at));
    if (!picture || element.dataset.src !== picture.thumbnail) return;
    if (positive(element.naturalWidth) && positive(element.naturalHeight)) picture.thumbnailSize = { w: element.naturalWidth, h: element.naturalHeight };
    this.drawn++;
  };

  private readonly onThumbnailError = (event: Event) => {
    const element = event.currentTarget as HTMLImageElement;
    const picture = this.pictureAt(Number(element.dataset.at));
    if (!picture || element.dataset.src !== picture.thumbnail) return;
    picture.thumbnailFailed = true;
    this.drawn++;
  };

  // ---- The geometry (IMP-11, IMP-12, IMP-17, IMP-40) ----

  /** IMP-11: the size an image has at fit: the largest at which the whole of it lies in the fit area, never above its own. */
  private fitSize(size: Size | null, own: boolean): Size {
    if (!size) return { w: this.fit.w, h: this.fit.h };
    const scale = Math.min(this.fit.w / size.w, this.fit.h / size.h, own ? 1 : Number.POSITIVE_INFINITY);
    return { w: Math.max(0, size.w * scale), h: Math.max(0, size.h * scale) };
  }

  /** The size the image at `at` has at fit: from its own size, else its thumbnail's proportions, else the fit area (IMP-29). */
  private baseAt(at: number): Size {
    const picture = this.pictureAt(at);
    if (picture?.own) return this.fitSize(picture.own, true);
    if (picture?.thumbnailSize) return this.fitSize(picture.thumbnailSize, false);
    return this.fitSize(null, false);
  }

  /** IMP-12: the greatest zoom of the image shown and its steps. */
  private limits(): { max: number; steps: number[] } {
    const base = this.baseAt(this.shown);
    if (!this.ready || base.w <= 0 || base.h <= 0) return { max: 1, steps: [1] };
    const fill = Math.max(this.fit.w / base.w, this.fit.h / base.h, 1);
    const given = positive(this.maxZoom) && this.maxZoom >= 1 ? this.maxZoom : null;
    const max = given ?? Math.max(4, 2 * fill);
    const steps = [1];
    for (let step = Math.max(2, fill); step < max - EPSILON; step *= 2) steps.push(step);
    if (max > 1 + EPSILON) steps.push(max);
    return { max, steps };
  }

  /** IMP-17: `view` within its limits: each edge of the image can reach the matching edge of the fit area and no farther; centred along an axis it does not fill. */
  private held(view: View): View {
    const base = this.baseAt(this.shown);
    const { max } = this.limits();
    const z = Math.min(max, Math.max(1, view.z));
    const reachX = Math.max(0, (base.w * z - this.fit.w) / 2);
    const reachY = Math.max(0, (base.h * z - this.fit.h) / 2);
    return { z, x: Math.min(reachX, Math.max(-reachX, view.x)), y: Math.min(reachY, Math.max(-reachY, view.y)) };
  }

  /** How far the image shown can be moved from the centre, each way, at its zoom. */
  private reach(): { x: number; y: number } {
    const base = this.baseAt(this.shown);
    return { x: Math.max(0, (base.w * this.view.z - this.fit.w) / 2), y: Math.max(0, (base.h * this.view.z - this.fit.h) / 2) };
  }

  /** `view` at the zoom `z`, with the point of the image at (`ax`, `ay`) from the centre of the fit area kept there (IMP-13 to IMP-15), within the limits (IMP-17). */
  private zoomedAbout(view: View, z: number, ax: number, ay: number): View {
    const { max } = this.limits();
    const to = Math.min(max, Math.max(1, z));
    const ratio = to / view.z;
    return this.held({ z: to, x: ax - (ax - view.x) * ratio, y: ay - (ay - view.y) * ratio });
  }

  /** IMP-11, IMP-40: the stage and the fit area, measured; true when either changed. */
  private measure(): boolean {
    const dialog = this.dialog;
    const area = this.renderRoot?.querySelector<HTMLElement>('.fit');
    if (!dialog || !area) return false;
    const outer = dialog.getBoundingClientRect();
    const inner = area.getBoundingClientRect();
    const stage = { w: outer.width, h: outer.height };
    const fit = { x: inner.left - outer.left, y: inner.top - outer.top, w: inner.width, h: inner.height };
    const changed = stage.w !== this.stage.w || stage.h !== this.stage.h || fit.x !== this.fit.x || fit.y !== this.fit.y || fit.w !== this.fit.w || fit.h !== this.fit.h;
    // IMP-40: the point of the image at the middle of the fit area stays there: its distance from the image's centre
    // grows as the image does.
    if (changed && this.view.z > 1 && this.fit.w > 0) {
      const before = this.baseAt(this.shown);
      this.stage = stage;
      this.fit = fit;
      const after = this.baseAt(this.shown);
      const ratio = before.w > 0 ? after.w / before.w : 1;
      this.view = this.held({ z: this.view.z, x: this.view.x * ratio, y: this.view.y * ratio });
    } else {
      this.stage = stage;
      this.fit = fit;
      this.view = this.held(this.view);
    }
    if (changed) {
      // IMP-33: the image grows about the centre of the fit area.
      dialog.style.setProperty('--_fit-x', `${fit.x + fit.w / 2}px`);
      dialog.style.setProperty('--_fit-y', `${fit.y + fit.h / 2}px`);
    }
    const caption = this.renderRoot.querySelector<HTMLElement>('.caption');
    const scrolls = !!caption && caption.scrollHeight > caption.clientHeight + 0.5;
    if (scrolls !== this.captionScrolls) this.captionScrolls = scrolls;
    return changed;
  }

  private onResize() {
    if (!this.presented) return;
    // IMP-40: without a motion.
    this.still();
    this.measure();
    this.place();
  }

  /** Where everything on the pages is drawn: each image at its fit, the one shown at its zoom and place. */
  private place() {
    const root = this.renderRoot;
    if (!root) return;
    const centre = { x: this.fit.x + this.fit.w / 2, y: this.fit.y + this.fit.h / 2 };
    for (const page of root.querySelectorAll<HTMLElement>('.page')) {
      const at = Number(page.dataset.at);
      const base = this.baseAt(at);
      const view = at === this.shown ? this.view : { z: 1, x: 0, y: 0 };
      const left = centre.x - base.w / 2;
      const top = centre.y - base.h / 2;
      for (const element of page.querySelectorAll<HTMLElement>('.image, .thumbnail')) {
        element.style.width = `${base.w}px`;
        element.style.height = `${base.h}px`;
        element.style.transform = `translate(${centre.x + view.x - (base.w * view.z) / 2}px, ${centre.y + view.y - (base.h * view.z) / 2}px) scale(${view.z})`;
      }
      const waiting = page.querySelector<HTMLElement>('.waiting');
      if (waiting) {
        waiting.style.width = `${base.w}px`;
        waiting.style.height = `${base.h}px`;
        waiting.style.transform = `translate(${left}px, ${top}px)`;
      }
      const error = page.querySelector<HTMLElement>('.error');
      if (error) {
        error.style.width = `${this.fit.w}px`;
        error.style.height = `${this.fit.h}px`;
        error.style.transform = `translate(${this.fit.x}px, ${this.fit.y}px)`;
      }
    }
  }

  private get shownImage(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>(`.page[data-at="${this.shown}"] .image`) ?? null;
  }

  /**
   * Ends a motion of the image shown where it is drawn now (a step of the zoom that a pinch or a drag interrupts): the
   * view becomes what is drawn, so the person's gesture goes on from what they see.
   */
  private still() {
    cancelAnimationFrame(this.flingFrame);
    this.flingFrame = 0;
    const image = this.shownImage;
    if (!image?.classList.contains('stepping')) return;
    const drawn = new DOMMatrixReadOnly(getComputedStyle(image).transform);
    image.classList.remove('stepping');
    const base = this.baseAt(this.shown);
    const z = drawn.a || 1;
    const centre = { x: this.fit.x + this.fit.w / 2, y: this.fit.y + this.fit.h / 2 };
    this.view = { z, x: drawn.e + (base.w * z) / 2 - centre.x, y: drawn.f + (base.h * z) / 2 - centre.y };
    this.place();
  }

  /** IMP-13, IMP-14: the image shown moves to `view` over the zoom motion — at once where motion is reduced (IMP-34). */
  private stepTo(view: View) {
    this.still();
    const image = this.shownImage;
    const moves = !this.reduced && !!image && (view.z !== this.view.z || view.x !== this.view.x || view.y !== this.view.y);
    this.view = view;
    if (image && moves) image.classList.add('stepping');
    this.place();
  }

  private readonly onImageSettled = (event: Event) => {
    (event.currentTarget as HTMLElement).classList.remove('stepping');
  };

  // ---- The zoom (IMP-12 to IMP-15, IMP-21) ----

  /** IMP-21: the zoom the person's change ended at becomes `zoom`, and `zoomchange` is fired once for it. */
  private commitZoom() {
    const zoom = this.view.z;
    if (Math.abs(zoom - this.zoom) < EPSILON) {
      this.drawn++;
      return;
    }
    this.zoom = zoom;
    this.emit<TanreiImagePreviewZoomChangeDetail>('zoomchange', { zoom });
  }

  /** IMP-13: one step up or down, or to fit, about the centre of the fit area. */
  private stepZoom(direction: 1 | -1 | 0) {
    if (!this.ready) return;
    const { steps } = this.limits();
    const z = this.view.z;
    const to = direction === 0 ? 1 : direction > 0 ? (steps.find((step) => step > z + EPSILON) ?? z) : ([...steps].reverse().find((step) => step < z - EPSILON) ?? z);
    if (Math.abs(to - z) < EPSILON) return;
    this.stepTo(this.zoomedAbout(this.view, to, 0, 0));
    this.commitZoom();
  }

  /** IMP-14: fit to the first step with the point under the tap kept there, and any other zoom to fit. */
  private doubleTap(x: number, y: number) {
    if (!this.ready) return;
    const { steps } = this.limits();
    if (steps.length < 2) return;
    const to = this.view.z > 1 + EPSILON ? 1 : steps[1];
    this.stepTo(this.zoomedAbout(this.view, to, x - (this.fit.x + this.fit.w / 2), y - (this.fit.y + this.fit.h / 2)));
    this.commitZoom();
  }

  // ---- Moving between images (IMP-18 to IMP-20) ----

  /** IMP-20: the person moved to the image at `to`: it slides in as the one shown slides out; `index`, then `indexchange`. */
  private go(to: number) {
    const index = this.within(to);
    if (index === this.shown || !this.images.length) return false;
    this.settle();
    this.index = index;
    const zoomed = this.show(index);
    this.emit<TanreiImagePreviewIndexChangeDetail>('indexchange', { index });
    if (zoomed) this.emit<TanreiImagePreviewZoomChangeDetail>('zoomchange', { zoom: 1 });
    return true;
  }

  /**
   * IMP-20: the image shown is the one at `index`: the zoom returns to 1 and the image left to its fit, and the new one
   * is said (IMP-28). True where the zoom was not 1: the caller fires `zoomchange`, after `zoom` is written.
   */
  private show(index: number): boolean {
    const left = this.shownImage;
    const zoomed = this.view.z > 1 + EPSILON || this.zoom !== 1;
    this.still();
    // The image left returns to its fit as it leaves, over the zoom motion.
    if (left && zoomed && !this.reduced && this.pagesElement?.classList.contains('settling')) left.classList.add('stepping');
    this.shown = index;
    this.view = { z: 1, x: 0, y: 0 };
    if (zoomed) this.zoom = 1;
    this.zoomGiven = false;
    this.announce = true;
    return zoomed;
  }

  private announce = false;

  /** The pages move to where they rest over the page motion (IMP-18, IMP-20) — at once where motion is reduced. */
  private settle() {
    const pages = this.pagesElement;
    if (!pages) return;
    pages.classList.toggle('settling', !this.reduced);
    pages.style.removeProperty('--_drag-x');
    pages.style.removeProperty('--_drag-y');
  }

  /** IMP-32, IMP-33: once it has faded out, what it drew is let go. */
  private readonly onFaded = (event: TransitionEvent) => {
    if (event.target !== this.dialog || event.propertyName !== 'opacity' || this.presented || this.open || !this.pictures.size) return;
    this.pictures.clear();
    this.drawn++;
  };

  private readonly onPagesSettled = (event: TransitionEvent) => {
    if (event.propertyName !== 'translate') return;
    this.pagesElement?.classList.remove('settling');
  };

  // ---- The controls (IMP-21, IMP-24, IMP-25) ----

  /** IMP-21: the person hid or showed the controls. */
  private hideControls(hidden: boolean) {
    if (this.controlsHidden === hidden) return;
    this.controlsHidden = hidden;
    this.emit<TanreiImagePreviewControlsHiddenChangeDetail>('controlshiddenchange', { hidden });
  }

  /** Its events bubble and leave the shadow root (the names are the class's `@fires` lines). */
  private emit<T>(name: string, detail: T) {
    fire(this, name, detail);
  }

  /** IMP-5: `close` with the reason, once for each asking, while it is presented. */
  private requestClose(reason: TanreiImagePreviewCloseReason) {
    if (!this.open || !this.presented) return;
    this.emit<TanreiImagePreviewCloseDetail>('close', { reason });
  }

  /** The Buttons' clicks do not leave the preview: it answers them. */
  private readonly onControl = (control: Control) => (event: Event) => {
    event.stopPropagation();
    if (control === 'close') this.requestClose('button');
    else if (control === 'zoom-in') this.stepZoom(1);
    else if (control === 'zoom-out') this.stepZoom(-1);
    else if (control === 'previous') this.go(this.shown - 1);
    else this.go(this.shown + 1);
  };

  // ---- The keys (IMP-3, IMP-5, IMP-23, IMP-25) ----

  /** IMP-25: any key shows the controls, before the control answers (heard on the way down). */
  private readonly onKeyDownFirst = () => this.hideControls(false);

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const dialog = this.dialog;
    if (!dialog) return;
    // IMP-3, IMP-5: Tab stays inside; Escape asks to close, whatever the zoom.
    if (event.key === 'Escape' || event.key === 'Tab') {
      modalSheetKeys(event, dialog, () => this.requestClose('escape'));
      return;
    }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    // IMP-23: a part that uses the key itself keeps it: the caption that scrolls.
    const inCaption = event.composedPath().some((node) => node instanceof HTMLElement && node.classList.contains('caption') && node.tabIndex >= 0);
    const zoomed = this.view.z > 1 + EPSILON;
    const last = this.images.length - 1;
    const sideways = (toward: 1 | -1) => {
      // IMP-23, IMP-35: at fit, the image that lies on that side; enlarged, the view moves toward it (never mirrored).
      if (!zoomed) this.go(this.shown + (this.rtl ? -toward : toward));
      else this.stepTo(this.held({ ...this.view, x: this.view.x - (toward * this.fit.w) / 4 }));
    };
    const upDown = (toward: 1 | -1) => {
      if (zoomed) this.stepTo(this.held({ ...this.view, y: this.view.y - (toward * this.fit.h) / 4 }));
    };
    const keys: Record<string, (() => void) | undefined> = {
      ArrowLeft: inCaption ? undefined : () => sideways(-1),
      ArrowRight: inCaption ? undefined : () => sideways(1),
      ArrowUp: inCaption ? undefined : () => upDown(-1),
      ArrowDown: inCaption ? undefined : () => upDown(1),
      PageUp: inCaption ? undefined : () => this.go(this.shown - 1),
      PageDown: inCaption ? undefined : () => this.go(this.shown + 1),
      Home: inCaption ? undefined : () => this.go(0),
      End: inCaption ? undefined : () => this.go(last),
      '+': () => this.stepZoom(1),
      '=': () => this.stepZoom(1),
      '-': () => this.stepZoom(-1),
      '−': () => this.stepZoom(-1),
      '0': () => this.stepZoom(0),
    };
    const answer = Object.hasOwn(keys, event.key) ? keys[event.key] : undefined;
    if (!answer) return;
    // A key that has nothing to do does nothing, and does not leave the preview.
    event.preventDefault();
    answer();
  };

  /** IMP-5: a close request without a key the preview saw (Android's back) arrives as the native cancel. */
  private readonly onNativeCancel = (event: Event) => {
    event.preventDefault();
    this.requestClose(closeRequestReason(event));
  };

  /** The browser closed the dialog itself (a close request it would not let the preview cancel): ask, and stay unless closed. */
  private readonly onNativeClose = () => {
    const dialog = this.dialog;
    if (!this.presented || !dialog || dialog.open) return;
    this.requestClose('back');
    if (this.open && this.presented) dialog.showModal();
  };

  /** IMP-25: focus that reaches a control shows the controls. IMP-26, IMP-27: the focus style of the stage and of the caption, where style queries are missing. */
  private readonly onFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target === this.stageElement) {
      syncFocusStyle(this, target);
      return;
    }
    // IMP-26: the scrolling caption draws its own indicator, and is one of what a hidden preview does not draw.
    if (target.classList.contains('caption')) syncFocusStyle(this, target);
    this.hideControls(false);
  };

  private readonly onStageBlur = () => this.stageElement?.removeAttribute('data-focus-quiet');

  /**
   * IMP-3, IMP-23: focus stays inside. An engine that gives a button no focus for a press takes focus from where it was
   * and puts it on nothing: the keys would then reach no part of the preview. Focus that has left for nothing, in a
   * window that still has it, is on the stage again.
   */
  private readonly onFocusOut = (event: FocusEvent) => {
    if (!this.presented || event.relatedTarget) return;
    setTimeout(() => {
      const active = deepActive();
      const nowhere = !active || active === document.body || active === document.documentElement;
      const stage = this.stageElement;
      if (this.presented && nowhere && document.hasFocus() && stage) focusOverlay(this, stage);
    }, 0);
  };

  // ---- The gestures (IMP-14 to IMP-19, IMP-22, IMP-24) ----

  /** A point of the window, from the stage's top left corner. */
  private point(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const box = this.dialog?.getBoundingClientRect();
    return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const stage = this.stageElement;
    if (!stage) return;
    const at = this.point(event);
    this.touches.set(event.pointerId, { ...at, type: event.pointerType });
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer counts as active cannot be captured; its moves still arrive while it is over the stage.
    }
    this.still();
    if (this.touches.size === 2) {
      this.beginPinch();
      return;
    }
    if (this.touches.size > 2) return;
    this.gesture = { kind: 'wait', id: event.pointerId, x: at.x, y: at.y, time: event.timeStamp };
  };

  /** IMP-15: two fingers: the zoom follows their distance about the point midway between them, and the image their move. */
  private beginPinch() {
    const [a, b] = [...this.touches.values()];
    this.cancelTap();
    // A drag that a second finger joins ends where it is.
    this.endDrag();
    this.gesture = { kind: 'pinch', distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2, view: { ...this.view } };
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const touch = this.touches.get(event.pointerId);
    if (!touch) {
      // IMP-25: a pointer that can hover moves over the preview.
      if (event.pointerType === 'mouse' && this.controlsHidden) this.onHover(event);
      return;
    }
    const at = this.point(event);
    touch.x = at.x;
    touch.y = at.y;
    const gesture = this.gesture;
    if (!gesture) return;
    if (gesture.kind === 'pinch') {
      if (this.touches.size < 2 || !this.ready) return;
      const [a, b] = [...this.touches.values()];
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const centre = { x: this.fit.x + this.fit.w / 2, y: this.fit.y + this.fit.h / 2 };
      // The point that was midway between the fingers is midway between them still.
      const zoomed = this.zoomedAbout(gesture.view, gesture.view.z * (distance / gesture.distance), gesture.midX - centre.x, gesture.midY - centre.y);
      this.view = this.held({ z: zoomed.z, x: zoomed.x + (mid.x - gesture.midX), y: zoomed.y + (mid.y - gesture.midY) });
      this.place();
      return;
    }
    if (gesture.id !== event.pointerId) return;
    if (gesture.kind === 'wait') {
      const dx = at.x - gesture.x;
      const dy = at.y - gesture.y;
      if (Math.hypot(dx, dy) <= SHEET_TOUCH_SLOP) return;
      this.cancelTap();
      this.gesture = this.begin(event, gesture, dx, dy);
      if (this.gesture.kind === 'none') return;
    }
    this.follow(event, at);
  };

  /** IMP-16, IMP-18, IMP-19, IMP-22: whose a drag that has passed the slop is. */
  private begin(event: PointerEvent, from: { id: number; x: number; y: number }, dx: number, dy: number): Gesture {
    const sideways = Math.abs(dx) > Math.abs(dy);
    const zoomed = this.view.z > 1 + EPSILON;
    const several = this.images.length > 1;
    const time = event.timeStamp;
    const page = (): Gesture => {
      const pages = this.pagesElement;
      // From where the pages are drawn (a settle under way included); nothing transitions while they follow.
      const drawn = this.drawnDrag();
      pages?.classList.remove('settling');
      return { kind: 'page', id: from.id, x: from.x, from: drawn, samples: [{ at: from.x, time }] };
    };
    if (zoomed) {
      // IMP-19: the image already stands at its limit on the side the drag would uncover: the drag is the pager's.
      const reach = this.reach();
      const atLimit = dx > 0 ? this.view.x >= reach.x - 0.5 : this.view.x <= -reach.x + 0.5;
      if (sideways && several && atLimit) return page();
      return { kind: 'pan', id: from.id, lastX: from.x, lastY: from.y, samples: [{ x: from.x, y: from.y, time }] };
    }
    if (sideways) return several ? page() : { kind: 'none', id: from.id };
    // IMP-22: downward, by touch, at fit. An upward drag, and a mouse's, close nothing.
    if (dy > 0 && event.pointerType === 'touch') {
      const dialog = this.dialog;
      dialog?.classList.remove('returning');
      dialog?.classList.add('clearing');
      this.pagesElement?.classList.remove('settling');
      return { kind: 'close', id: from.id, y: from.y, samples: [{ at: from.y, time }] };
    }
    return { kind: 'none', id: from.id };
  }

  /** How far the pages are drawn from where they rest, sideways (px). */
  private drawnDrag(): number {
    const page = this.renderRoot?.querySelector<HTMLElement>(`.page[data-at="${this.shown}"]`);
    if (!page) return 0;
    return Number.parseFloat(getComputedStyle(page).translate) || 0;
  }

  private follow(event: PointerEvent, at: { x: number; y: number }) {
    const gesture = this.gesture;
    if (!gesture) return;
    const recent = <S extends { time: number }>(samples: S[], sample: S) => {
      samples.push(sample);
      while (samples.length > 2 && sample.time - samples[0].time > 80) samples.shift();
    };
    if (gesture.kind === 'pan') {
      // IMP-16, IMP-19: the image moves with the pointer, and stops at its limit.
      this.view = this.held({ z: this.view.z, x: this.view.x + (at.x - gesture.lastX), y: this.view.y + (at.y - gesture.lastY) });
      gesture.lastX = at.x;
      gesture.lastY = at.y;
      recent(gesture.samples, { x: at.x, y: at.y, time: event.timeStamp });
      this.place();
    } else if (gesture.kind === 'page') {
      recent(gesture.samples, { at: at.x, time: event.timeStamp });
      let moved = gesture.from + (at.x - gesture.x);
      // IMP-18: where there is no neighbour on that side, it follows by a part only.
      const toward = this.rtl ? Math.sign(moved) : -Math.sign(moved);
      const neighbour = this.shown + toward;
      if (neighbour < 0 || neighbour >= this.images.length) moved *= OVERSCROLL;
      this.pagesElement?.style.setProperty('--_drag-x', `${moved}px`);
    } else if (gesture.kind === 'close') {
      recent(gesture.samples, { at: at.y, time: event.timeStamp });
      const moved = Math.max(0, at.y - gesture.y);
      this.pagesElement?.style.setProperty('--_drag-y', `${moved}px`);
      this.dialog?.style.setProperty('--_presence', `${Math.max(0, 1 - moved / Math.max(1, this.stage.h))}`);
    }
  }

  /**
   * The speed of a release along what `samples` hold, px per ms; 0 when the pointer had stopped — it held still for
   * longer than POINTER_STOPPED_TIME before the release (IMP-18), so a drag stopped where it was wanted is no fling.
   */
  private speed(samples: { at: number; time: number }[], now: number): number {
    if (!samples.length || stoppedBefore(samples[samples.length - 1].time, now)) return 0;
    const recent = samples.filter((sample) => now - sample.time <= 80);
    if (recent.length < 2) return 0;
    const time = recent[recent.length - 1].time - recent[0].time;
    return time > 0 ? (recent[recent.length - 1].at - recent[0].at) / time : 0;
  }

  private readonly onPointerUp = (event: PointerEvent) => {
    const touch = this.touches.get(event.pointerId);
    if (!touch) return;
    this.touches.delete(event.pointerId);
    const gesture = this.gesture;
    const cancelled = event.type === 'pointercancel';
    if (!gesture) return;
    if (gesture.kind === 'pinch') {
      if (this.touches.size >= 2) return;
      // IMP-15: the zoom stays where it is. IMP-21: the gesture has ended.
      this.gesture = null;
      this.commitZoom();
      // The finger that stays goes on as a drag of its own.
      const [left] = [...this.touches.entries()];
      if (left) this.gesture = { kind: 'pan', id: left[0], lastX: left[1].x, lastY: left[1].y, samples: [] };
      return;
    }
    if (gesture.id !== event.pointerId) return;
    this.gesture = null;
    const at = this.point(event);
    if (gesture.kind === 'wait') {
      if (!cancelled) this.tap(at.x, at.y, event.timeStamp, touch.type);
      return;
    }
    if (gesture.kind === 'pan') {
      if (cancelled || this.reduced) return;
      const now = event.timeStamp;
      // IMP-16, IMP-18: a pan whose pointer held still before the release has no fling to continue.
      const lastMove = gesture.samples[gesture.samples.length - 1];
      if (!lastMove || stoppedBefore(lastMove.time, now)) return;
      const recent = gesture.samples.filter((sample) => now - sample.time <= 80);
      if (recent.length < 2) return;
      const time = recent[recent.length - 1].time - recent[0].time;
      if (time <= 0) return;
      // IMP-16: a fling goes on and slows.
      this.fling((recent[recent.length - 1].x - recent[0].x) / time, (recent[recent.length - 1].y - recent[0].y) / time);
      return;
    }
    if (gesture.kind === 'page') {
      const moved = at.x - gesture.x + gesture.from;
      const velocity = cancelled ? 0 : this.speed(gesture.samples, event.timeStamp);
      // IMP-18, IMP-19: past half the stage's width — or, by a finger or a pen, flung toward that side. A mouse's drag
      // turns the page by its distance alone, at fit and from the limit of an enlarged image alike: a mouse moves at a
      // fling's speed in ordinary use and is dragged in repeated strokes. The kind is the `pointerType` of the
      // pointer's `pointerdown`; an empty or unknown one is taken as a finger's.
      const far = Math.abs(moved) > this.stage.w / 2;
      const flung = touch.type !== 'mouse' && Math.abs(velocity) > SHEET_FLING_VELOCITY && Math.sign(velocity) === Math.sign(moved);
      const toward = this.rtl ? Math.sign(moved) : -Math.sign(moved);
      if (!cancelled && (far || flung) && this.go(this.shown + toward)) return;
      this.settle();
      return;
    }
    if (gesture.kind === 'close') {
      const moved = Math.max(0, at.y - gesture.y);
      const velocity = cancelled ? 0 : this.speed(gesture.samples, event.timeStamp);
      if (!cancelled && (moved > this.stage.h / 4 || velocity > SHEET_FLING_VELOCITY)) {
        // IMP-22: ask, hold the image where it was left for one frame, then close from there (the product closed it:
        // the exit motion starts from there) or bring everything back (it declined).
        this.requestClose('swipe');
        requestAnimationFrame(() => {
          if (this.open && this.presented) this.comeBack();
        });
        return;
      }
      this.comeBack();
    }
  };

  /** A drag that is taken over (a second finger) ends where it rests. */
  private endDrag() {
    const gesture = this.gesture;
    if (gesture?.kind === 'page') this.settle();
    if (gesture?.kind === 'close') this.comeBack();
  }

  /** IMP-22: everything back to where it rests, over the page motion. */
  private comeBack() {
    const dialog = this.dialog;
    if (!dialog) return;
    dialog.classList.remove('clearing');
    dialog.classList.toggle('returning', !this.reduced);
    dialog.style.removeProperty('--_presence');
    this.settle();
  }

  /** IMP-16: the image goes on as it was flung (`vx`, `vy`, px per ms) and slows, to its limit at most. */
  private fling(vx: number, vy: number) {
    let last = performance.now();
    const step = (now: number) => {
      // (A frame's time may be the time the fling began, or a little before it.)
      const elapsed = Math.min(64, Math.max(0, now - last));
      last = now;
      const wanted = { z: this.view.z, x: this.view.x + vx * elapsed, y: this.view.y + vy * elapsed };
      const next = this.held(wanted);
      // Stopped at a limit along an axis, it does not go on along it.
      if (next.x !== wanted.x) vx = 0;
      if (next.y !== wanted.y) vy = 0;
      this.view = next;
      this.place();
      const slow = Math.exp(-elapsed / FLING_TIME);
      vx *= slow;
      vy *= slow;
      this.flingFrame = Math.hypot(vx, vy) > FLING_REST ? requestAnimationFrame(step) : 0;
    };
    if (Math.hypot(vx, vy) > FLING_REST) this.flingFrame = requestAnimationFrame(step);
  }

  private cancelTap() {
    if (this.lastTap) clearTimeout(this.lastTap.timer);
    this.lastTap = null;
  }

  /** IMP-14, IMP-24: a press without a drag: the second of two within the interval is a double tap, and one alone hides or shows the controls. */
  private tap(x: number, y: number, time: number, type: string) {
    const last = this.lastTap;
    if (last && time - last.time <= DOUBLE_TAP && Math.hypot(x - last.x, y - last.y) <= DOUBLE_TAP_REACH) {
      this.cancelTap();
      this.doubleTap(x, y);
      return;
    }
    this.cancelTap();
    const timer = setTimeout(() => {
      this.lastTap = null;
      if (!this.presented) return;
      const hidden = !this.controlsHidden;
      // IMP-25: a mouse shows them again when it moves from here, not while it rests where it pressed.
      this.hiddenAt = hidden && type === 'mouse' ? { x, y } : null;
      this.hideControls(hidden);
    }, DOUBLE_TAP);
    this.lastTap = { x, y, time, timer };
  }

  private onHover(event: PointerEvent) {
    const at = this.point(event);
    if (this.hiddenAt && Math.hypot(at.x - this.hiddenAt.x, at.y - this.hiddenAt.y) <= SHEET_TOUCH_SLOP) return;
    this.hiddenAt = null;
    this.hideControls(false);
  }

  /** IMP-15, IMP-16: a wheel with Ctrl or Command — and a trackpad pinch, which arrives as one — zooms about the pointer; without, it moves an enlarged image; at fit it does nothing. */
  private readonly onWheel = (event: WheelEvent) => {
    if (!this.presented) return;
    const unit = event.deltaMode === 1 ? WHEEL_LINE : event.deltaMode === 2 ? this.fit.h : 1;
    if (event.ctrlKey || event.metaKey) {
      // The browser's own zoom of the page does not take it.
      event.preventDefault();
      if (!this.ready) return;
      this.still();
      const at = this.point(event);
      this.view = this.zoomedAbout(this.view, this.view.z * Math.exp(-event.deltaY * unit * WHEEL_ZOOM), at.x - (this.fit.x + this.fit.w / 2), at.y - (this.fit.y + this.fit.h / 2));
      this.place();
      this.wheelEnds();
      return;
    }
    if (this.view.z <= 1 + EPSILON) return;
    event.preventDefault();
    this.still();
    // Up and down, and sideways with a sideways wheel or Shift.
    const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit;
    const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit;
    this.view = this.held({ z: this.view.z, x: this.view.x - dx, y: this.view.y - dy });
    this.place();
  };

  private wheelEnds() {
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      this.wheelTimer = null;
      if (this.presented) this.commitZoom();
    }, WHEEL_END);
  }

  /** IMP-15: a trackpad pinch where the browser tells it as a gesture of its own (its `scale` from 1), not as a wheel. */
  private readonly onGesture = (event: Event) => {
    const told = event as Event & { scale?: number; clientX?: number; clientY?: number };
    // Two fingers on a touch screen are followed as pointers.
    if (this.touches.size > 0 || !this.presented) return;
    event.preventDefault();
    if (event.type === 'gesturestart') {
      this.still();
      this.gestureView = { ...this.view };
      return;
    }
    const from = this.gestureView;
    if (!from) return;
    if (event.type === 'gesturechange' && this.ready && positive(told.scale ?? null)) {
      const at = this.point({ clientX: told.clientX ?? 0, clientY: told.clientY ?? 0 });
      this.view = this.zoomedAbout(from, from.z * (told.scale as number), at.x - (this.fit.x + this.fit.w / 2), at.y - (this.fit.y + this.fit.h / 2));
      this.place();
    }
    if (event.type === 'gestureend') {
      this.gestureView = null;
      this.commitZoom();
    }
  };

  // ---- Presenting and focus (IMP-1, IMP-2, IMP-4, IMP-6, IMP-43) ----

  /** IMP-8, IMP-10: each control is told the variant its token names, through the channel a Button reads from the component that places it (BTN-10). */
  private giveVariants() {
    const bar = compChoice(this, `${PREFIX}-bar-button-variant`, BUTTON_VARIANTS);
    const navigation = compChoice(this, `${PREFIX}-navigation-button-variant`, BUTTON_VARIANTS);
    for (const control of CONTROLS) giveVariant(this.renderRoot?.querySelector(`tanrei-button.${control}`), control === 'previous' || control === 'next' ? navigation : bar);
  }

  /** IMP-1, IMP-2: in the top layer over the whole window, the page held, focus on the stage. */
  private present() {
    const dialog = this.dialog;
    if (!dialog || this.presented || !this.isConnected) return;
    if (!this.images.length) {
      // IMP-43: nothing to show: nothing is presented. A document that is still being read has not given its images yet.
      const say = () => {
        if (this.open && !this.presented && !this.images.length && !this.reportedEmpty) {
          this.reportedEmpty = true;
          report(this, 'IMP-43', 'it was opened with no image, so nothing is presented; give it <tanrei-image-preview-item> children before it opens', { once: false, level: 'error' });
        }
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', say, { once: true });
      else say();
      return;
    }
    this.reportedEmpty = false;
    watchEscape();
    watchInput();
    this.opener = deepActive();
    // What a drag that closed it left (IMP-22) is gone when it opens again.
    dialog.classList.remove('clearing', 'returning');
    dialog.style.removeProperty('--_presence');
    this.pagesElement?.classList.remove('settling');
    this.pagesElement?.style.removeProperty('--_drag-x');
    this.pagesElement?.style.removeProperty('--_drag-y');
    if (!dialog.open) dialog.showModal();
    this.presented = true;
    modalLayer.add(this);
    holdPageScroll(this, true);
    this.giveVariants();
    this.measure();
    this.place();
    this.resize$?.observe(dialog);
    const area = this.renderRoot.querySelector('.fit');
    if (area) this.resize$?.observe(area);
    // IMP-2: focus moves when it opens, not when its motion ends.
    const stage = this.stageElement;
    if (stage) focusOverlay(this, stage);
  }

  /** IMP-4: out of the top layer (fading), the page given back, focus back where it was. */
  private withdraw(restore: boolean) {
    if (!this.presented) return;
    this.presented = false;
    this.cancelTap();
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = null;
    cancelAnimationFrame(this.flingFrame);
    this.flingFrame = 0;
    this.touches.clear();
    this.gesture = null;
    this.gestureView = null;
    this.resize$?.disconnect();
    modalLayer.delete(this);
    holdPageScroll(this, false);
    const dialog = this.dialog;
    if (dialog?.open) dialog.close();
    const opener = this.opener;
    this.opener = null;
    if (restore) returnFocus(opener, this);
  }

  /** IMP-28: what assistive technology is told, politely: each sentence a block of its own, in place of what was said. */
  private say(sentences: string[]) {
    const region = this.renderRoot?.querySelector('.said');
    if (!region) return;
    region.replaceChildren(
      ...sentences.filter(Boolean).map((sentence) => {
        const block = document.createElement('div');
        block.textContent = sentence;
        return block;
      }),
    );
  }

  /**
   * IMP-9: the count's sentence with its two places filled, each number written as the preview's language writes a
   * whole number; empty where it is not drawn.
   */
  private countSentence(report_ = false): string {
    if (this.images.length < 2) return '';
    const sentence = this.words.get('imageCountText', this.countText);
    if (!sentence) return '';
    const number = new Intl.NumberFormat(ambientLocale(this), { maximumFractionDigits: 0 });
    // (A word with places is read in one place: src/primitives/places.ts.) Another text between braces and a brace that
    // opens or closes nothing are drawn as they are written, and reported.
    const { runs } = fillPlaces(sentence, { position: number.format(this.shown + 1), count: number.format(this.images.length) });
    if (report_) reportPlaces(this, 'IMP-9', 'countText', sentence, wordPlaces.imageCountText ?? [], 'it is drawn as it is written');
    return runs.map((run) => run.text).join('');
  }

  // ---- The update ----

  protected override willUpdate(changed: PropertyValues) {
    const images = changed.has('images' as keyof this);
    // IMP-20, IMP-43: the image shown is `index`, within the images. The product set it: at once, and no `indexchange`.
    const was = images ? ((changed.get('images' as keyof this) as ImageData[] | undefined)?.[this.shown]?.element ?? null) : null;
    const target = this.within(this.index);
    if (changed.has('index') && this.images.length && target !== this.index) {
      report(this, 'IMP-20', `index is ${this.index}, which is not one of its ${this.images.length} images; the nearest, ${target}, is shown`, { once: false });
    }
    if (target !== this.shown) {
      this.pagesElement?.classList.remove('settling');
      this.pagesElement?.style.removeProperty('--_drag-x');
      if (!this.presented) this.shown = target;
      else if (this.show(target)) this.emit<TanreiImagePreviewZoomChangeDetail>('zoomchange', { zoom: 1 });
    } else if (images && this.presented && was && this.images[this.shown]?.element !== was) {
      // IMP-43: the image shown is no longer the same one.
      if (this.show(this.shown)) this.emit<TanreiImagePreviewZoomChangeDetail>('zoomchange', { zoom: 1 });
    }
    if (!this.presented && (changed.has('open') || changed.has('index') || images)) this.view = { z: 1, x: 0, y: 0 };
    this.syncPictures();
    // IMP-12, IMP-21: the product set the zoom (the element's own writes are what the view already is): taken at once.
    if ((changed.has('zoom') && Math.abs(this.zoom - this.view.z) > EPSILON) || changed.has('maxZoom')) {
      this.zoomGiven = true;
      if (positive(this.maxZoom) ? this.maxZoom < 1 : this.maxZoom !== null) report(this, 'IMP-12', `max-zoom is ${this.maxZoom}, which is less than 1; it is taken as not given`, { once: false });
    }
    this.takeZoom();
    // IMP-28: a control that is about to be disabled while it has focus.
    if (this.presented) {
      const active = this.shadowRoot?.activeElement;
      const control = CONTROLS.find((name) => active?.classList.contains(name));
      this.focusLeaves = !!control && this.disabledNow(control);
    }
  }

  /** IMP-12: the product set `zoom`, and the image shown has not taken it yet (it has not loaded, or is not presented). */
  private zoomGiven = false;

  /** IMP-12: `zoom` as the product set it, once the image can take it: within 1 and the greatest value, about the centre of the fit area, at once. */
  private takeZoom() {
    if (!this.zoomGiven || !this.presented || !this.ready || this.fit.w <= 0) return;
    this.zoomGiven = false;
    const { max } = this.limits();
    const asked = Number.isFinite(this.zoom) ? this.zoom : 1;
    const zoom = Math.min(max, Math.max(1, asked));
    if (Math.abs(zoom - asked) > EPSILON) report(this, 'IMP-12', `zoom is ${this.zoom}, which is outside 1 to ${max}; ${zoom} is used`, { once: false });
    if (Math.abs(zoom - this.view.z) < EPSILON) return;
    this.still();
    this.view = this.zoomedAbout(this.view, zoom, 0, 0);
  }

  /** IMP-10, IMP-13: whether a control is disabled as things are now. */
  private disabledNow(control: Control): boolean {
    if (control === 'previous') return this.shown <= 0;
    if (control === 'next') return this.shown >= this.images.length - 1;
    if (control === 'zoom-out') return this.view.z <= 1 + EPSILON;
    if (control === 'zoom-in') return !this.ready || this.view.z >= this.limits().max - EPSILON;
    return false;
  }

  protected override firstUpdated() {
    const stage = this.stageElement;
    // Not passive: a wheel with Ctrl or Command, and one over an enlarged image, is the preview's (IMP-15, IMP-16).
    // The stage has a box only while the preview is presented, so a closed preview takes no wheel of the page's.
    stage?.addEventListener('wheel', this.onWheel, { passive: false });
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) stage?.addEventListener(type, this.onGesture);
    this.dialog?.addEventListener('keydown', this.onKeyDownFirst, { capture: true });
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has('open') || (this.open && !this.presented && changed.has('images' as keyof this))) {
      if (this.open) this.present();
      else if (this.presented) this.withdraw(true);
    }
    // IMP-43: the images are gone while it is presented: there is nothing to show.
    if (this.presented && !this.images.length) this.withdraw(true);
    if (!this.presented) return;
    this.giveVariants();
    this.measure();
    this.takeZoom();
    this.place();
    // IMP-7, IMP-8, IMP-9, IMP-10, IMP-27, IMP-31: what a debug build reports.
    this.reports();
    // IMP-28: the new image is said — the count's sentence, then its alt — and focus stays where it is, unless the
    // control it is on has become disabled: then it is on the stage.
    if (this.announce) {
      this.announce = false;
      this.say([this.countSentence(), this.images[this.shown]?.alt ?? '']);
    }
    if (this.focusLeaves) {
      this.focusLeaves = false;
      this.stageElement?.focus({ preventScroll: true });
    }
  }

  private reports() {
    if (!this.label.trim()) report(this, 'IMP-7', 'label is empty, so the modal dialog has no accessible name; give it a label');
    const named = (key: 'closeLabel' | 'zoomInLabel' | 'zoomOutLabel' | 'previousImageLabel' | 'nextImageLabel', prop: string, own: string, id: string, what: string) => {
      if (!this.words.get(key, own)) this.words.missing(key, { prop, id, effect: `the ${what} control is drawn and has no accessible name` });
    };
    named('closeLabel', 'closeLabel', this.closeLabel, 'IMP-8', 'close');
    named('zoomInLabel', 'zoomInLabel', this.zoomInLabel, 'IMP-8', 'zoom-in');
    named('zoomOutLabel', 'zoomOutLabel', this.zoomOutLabel, 'IMP-8', 'zoom-out');
    if (this.images.length > 1) {
      named('previousImageLabel', 'previousLabel', this.previousLabel, 'IMP-10', 'previous');
      named('nextImageLabel', 'nextLabel', this.nextLabel, 'IMP-10', 'next');
      if (!this.words.get('imageCountText', this.countText)) this.words.missing('imageCountText', { prop: 'countText', id: 'IMP-9', effect: 'no count is drawn' });
      else this.countSentence(true);
    }
    const image = this.images[this.shown];
    if (image && !image.alt.trim()) report(this, 'IMP-27', `the image at ${this.shown} has no alt, so the image shown has no accessible name; give every image an alt`);
    if (failed(this.pictureAt(this.shown)) && !this.words.get('imageErrorText', this.errorText)) {
      this.words.missing('imageErrorText', { prop: 'errorText', id: 'IMP-31', effect: 'the mark is drawn alone and the failure is told to no one' });
    }
  }

  private page(at: number) {
    const image = this.images[at];
    const picture = this.pictureAt(at);
    if (!image || !picture) return nothing;
    const shown = at === this.shown;
    const broken = failed(picture);
    const sources = [...new Set([picture.drawn, picture.asked === picture.refused ? '' : picture.asked].filter(Boolean))];
    // IMP-29: until the source has loaded, the thumbnail enlarged, or — for the image shown — a Skeleton's one block.
    const waiting = !picture.drawn && !broken;
    const thumbnail = waiting && !!picture.thumbnail && !picture.thumbnailFailed;
    const errorText = this.words.get('imageErrorText', this.errorText);
    return html`<div class="page" data-at=${at} style="--_at: ${at - this.shown}">
      ${thumbnail
        ? html`<img part="placeholder" class="thumbnail" alt="" draggable="false" data-at=${at} data-src=${picture.thumbnail} src=${picture.thumbnail} @load=${this.onThumbnailLoad} @error=${this.onThumbnailError} />`
        : nothing}
      ${repeat(
        sources,
        (src) => src,
        (src) =>
          html`<img
            part=${src === picture.drawn ? 'image' : nothing}
            class=${src === picture.drawn ? 'image' : 'asked'}
            alt=""
            draggable="false"
            data-at=${at}
            data-src=${src}
            src=${src}
            @load=${this.onLoad}
            @error=${this.onError}
            @transitionend=${this.onImageSettled}
            @transitioncancel=${this.onImageSettled}
          />`,
      )}
      ${waiting && !thumbnail && shown
        ? html`<div part="placeholder" class="waiting"><tanrei-skeleton label=${this.loadingLabel}><div class="tanrei-skeleton-placeholder" data-shape="block"></div></tanrei-skeleton></div>`
        : nothing}
      ${broken
        ? html`<div part="error" class="error">
            <span class="glyph" aria-hidden="true"><span class="ink">broken_image</span></span>
            ${errorText ? html`<p class="error-text" id=${shown ? 'error' : nothing}>${errorText}</p>` : nothing}
          </div>`
        : nothing}
    </div>`;
  }

  /** IMP-8: the bar's three controls are small, as every host's close button is; IMP-10: previous and next are medium. */
  private control(control: Control, glyph: string, label: string) {
    return html`<tanrei-button
      part=${control}
      exportparts=${BUTTON_PARTS[control].attribute}
      class=${control}
      size=${control === 'previous' || control === 'next' ? 'medium' : 'small'}
      label=${label}
      ?disabled=${this.disabledNow(control)}
      @click=${this.onControl(control)}
      ><span slot="icon">${glyph}</span></tanrei-button
    >`;
  }

  protected override render() {
    const several = this.images.length > 1;
    const image = this.images[this.shown];
    const count = this.countSentence();
    const caption = image?.caption ?? '';
    const broken = failed(this.pictureAt(this.shown)) && !!this.words.get('imageErrorText', this.errorText);
    // IMP-27: named by the alt of the image shown; described by the count's sentence first, then its caption, then
    // what failed (IMP-31).
    const described = [count ? 'count' : '', caption ? 'caption' : '', broken ? 'error' : ''].filter(Boolean).join(' ');
    const three = [this.shown - 1, this.shown, this.shown + 1].filter((at) => !!this.pictureAt(at));
    return html`<dialog
      part="container"
      class=${classMap({ container: true, 'controls-hidden': this.controlsHidden, captioned: !!caption })}
      data-tanrei-appear
      aria-label=${this.label.trim() ? this.label : nothing}
      tabindex="-1"
      @keydown=${this.onKeyDown}
      @cancel=${this.onNativeCancel}
      @close=${this.onNativeClose}
      @focusin=${this.onFocusIn}
      @focusout=${this.onFocusOut}
      @transitionend=${this.onFaded}
      @pointermove=${this.onPointerMove}
    >
      <div class="surface"></div>
      <div class="pages" data-tanrei-appear @transitionend=${this.onPagesSettled} @transitioncancel=${this.onPagesSettled}>
        ${repeat(
          three,
          (at) => this.images[at].element,
          (at) => this.page(at),
        )}
      </div>
      <div part="bar" class="bar">
        <p part="count" class="count" id="count">${count}</p>
        <div class="controls">
          ${this.control('zoom-out', 'zoom_out', this.words.get('zoomOutLabel', this.zoomOutLabel))} ${this.control('zoom-in', 'zoom_in', this.words.get('zoomInLabel', this.zoomInLabel))}
          ${this.control('close', 'close', this.words.get('closeLabel', this.closeLabel))}
        </div>
      </div>
      ${several ? this.control('previous', 'chevron_left', this.words.get('previousImageLabel', this.previousLabel)) : nothing}
      <div
        part="stage"
        class="stage"
        role="img"
        tabindex="0"
        aria-label=${image?.alt.trim() ? image.alt : nothing}
        aria-describedby=${described || nothing}
        @pointerdown=${this.onPointerDown}
        @pointerup=${this.onPointerUp}
        @pointercancel=${this.onPointerUp}
        @blur=${this.onStageBlur}
      ></div>
      ${several ? this.control('next', 'chevron_right', this.words.get('nextImageLabel', this.nextLabel)) : nothing}
      ${caption
        ? html`<div part="caption" class="caption" role=${this.captionScrolls ? 'group' : nothing} tabindex=${this.captionScrolls ? '0' : nothing} data-tanrei-shape>
              <p class="caption-text" id="caption">${caption}</p>
            </div>
            <div class="caption-focus" aria-hidden="true" data-tanrei-shape></div>`
        : nothing}
      <div class="fit" aria-hidden="true" data-tanrei-shape></div>
      <div class="said" aria-live="polite"></div>
    </dialog>`;
  }
}

if (!customElements.get(ITEM_TAG)) customElements.define(ITEM_TAG, TanreiImagePreviewItem);
if (!customElements.get('tanrei-image-preview')) customElements.define('tanrei-image-preview', TanreiImagePreview);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-image-preview': TanreiImagePreview;
    'tanrei-image-preview-item': TanreiImagePreviewItem;
  }
}
