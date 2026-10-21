import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, GlyphDrawnController, GlyphMirrorController, WordsController, report } from '../../primitives/index.js';
import { acceptConverter, acceptList } from '../../primitives/file-format.js';
import { type FileJudgement, type FileRefused, type FileRejectReason, countLimit, dragAnswer, droppedFiles, givenFiles, holdsFiles, judgeFiles, readAccept, sizeLimit } from '../../primitives/file-judge.js';
import { ambientLocale } from '../../primitives/locale-date.js';
import { fillPlaces, reportPlaces } from '../../primitives/places.js';
import { debugBuild } from '../../primitives/report.js';
import { type WordKey, wordPlaces } from '../../generated/words.js';
import { styles } from './drop-zone.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** Why a file was refused — the File picker's reasons: its kind, its size, or how many there were. */
export type TanreiDropZoneRejectReason = FileRejectReason;
/** A file that was refused, with the reason: what `reject` carries and `judge()` answers with. */
export type TanreiDropZoneRefused = FileRefused;
/** `select`: the files of one drop that passed, in the order the browser gave them — the File picker's detail. */
export interface TanreiDropZoneSelectDetail {
  files: File[];
}
/** `reject`: the files of one drop that were refused, each with its reason — the File picker's detail. */
export interface TanreiDropZoneRejectDetail {
  files: TanreiDropZoneRefused[];
}
/** What `judge()` answers with: the files that passed, and the refused files with their reasons, each in the order given. */
export type TanreiDropZoneJudgement = FileJudgement;

/** DRZ-4, DRZ-5: the glyphs, by their names in the system's icon set — the File picker's. */
const GLYPHS = { upload: 'upload', refusing: 'block' } as const;
/** DRZ-11, DRZ-12: the prop that reads each key, for what a debug build is told. */
const WORD_PROPS = { dropZoneText: 'dropText', dropZoneRefusingText: 'refusingText', filesDroppedText: 'droppedText', filesRefusedText: 'refusedText' } as const satisfies Partial<Record<WordKey, string>>;

/** The parent of `node` in the flat tree that a drag crosses: its parent, or the host of the shadow root it stands in. */
const up = (node: Node): Node | null => node.parentNode instanceof ShadowRoot ? node.parentNode.host : (node.parentNode ?? null);

/** DRZ-13: whether the page has any way to choose a file — a native file input, in the document or in any open shadow root (a File picker's is in its). */
function pickerOnPage(root: Document | ShadowRoot = document): boolean {
  if (root.querySelector('input[type="file"]')) return true;
  for (const element of root.querySelectorAll('*')) if (element.shadowRoot && pickerOnPage(element.shadowRoot)) return true;
  return false;
}

/**
 * Wraps any part of a screen so that files can be dropped anywhere on it, while what it holds is used exactly as
 * without it: it draws nothing at rest and adds no hover, no press, no focus stop and no role (DRZ-1, DRZ-2). While
 * files are dragged over it, one overlay covers it and says they can be dropped (DRZ-4); on the drop it judges them by
 * the File picker's rule and hands over what passed and what was refused (DRZ-9). It keeps nothing (DRZ-10), and it is
 * never the only way to add a file: the page also has a File picker or a File upload (DRZ-13).
 *
 * Contract: specs/drop-zone.spec.json. `<tanrei-drop-zone multiple accept="video/*" drop-text="Drop videos to upload
 * them"> … the screen … </tanrei-drop-zone>`. The content stays in the product's light DOM and is laid out by styling
 * the host, which is `display: block`, `position: relative` and one stacking context of its own (DRZ-6).
 * `select` and `reject` carry the File picker's details, so one listener serves both; `judge(files)` judges files that
 * came another way and emits nothing (DRZ-15).
 *
 * @tag tanrei-drop-zone
 * @slot - The content: any part of the product's screen.
 * @csspart overlay - The layer drawn over the whole zone while files are dragged over it: the scrim and the edge.
 * @csspart panel - The raised surface that holds the glyph and the message.
 * @csspart icon - The box of the glyph.
 * @csspart label - The message.
 * @fires select - Files were dropped and passed. Once per drop; `detail.files` is a `File[]`. Bubbles.
 * @fires reject - Files of one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 */
export class TanreiDropZone extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'drop-zone');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    multiple: { type: Boolean, reflect: true },
    accept: { converter: acceptConverter },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    dropText: { type: String, attribute: 'drop-text' },
    refusingText: { type: String, attribute: 'refusing-text' },
    droppedText: { type: String, attribute: 'dropped-text' },
    refusedText: { type: String, attribute: 'refused-text' },
    silent: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    drag: { state: true },
  };

  /** Whether a drop may bring more than one file. False: a drop of several is refused whole. */
  multiple = false;

  /** The kinds of file that are taken: extensions with their dot (".pdf") and media types ("image/png", a family as "image/*"). The attribute is a comma-separated list, as a native file input's. Empty takes every kind. */
  accept: string[] = [];

  /** The largest size of one file, in bytes (`max-size`). Null sets no limit. Judged from the size the browser reports; the file is not read. */
  maxSize: number | null = null;

  /** The most files one drop may bring, while `multiple` is set (`max-files`). Null sets no limit; zero refuses every file. Nothing is counted across drops. */
  maxFiles: number | null = null;

  /** The message in the overlay while the zone takes what is dragged over it (`drop-text`). Empty reads the product's words (`dropZoneText`). */
  dropText = '';

  /** The message in the overlay while the zone refuses what is dragged over it (`refusing-text`). Empty reads the product's words (`dropZoneRefusingText`). */
  refusingText = '';

  /** What assistive technology is told after a drop in which files passed, with `{count}` (`dropped-text`). Empty reads the product's words (`filesDroppedText`). */
  droppedText = '';

  /** What assistive technology is told after a drop in which files were refused, with `{count}` (`refused-text`). Empty reads the product's words (`filesRefusedText`). */
  refusedText = '';

  /** Says nothing after a drop: for a zone that hands its files to a component that says them itself (a File upload that keeps its own rows). */
  silent = false;

  /** Nothing can be dropped: no overlay, no event. The content is neither disabled nor dimmed. */
  disabled = false;

  /** DRZ-4, DRZ-5: the drag over the zone can be taken (receiving), cannot (refusing), or none is over it. */
  protected drag: '' | 'receiving' | 'refusing' = '';

  private readonly words = new WordsController(this);

  /** DRZ-19: the glyph the element writes is marked where the icon set mirrors its name. */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  /** DRZ-21: the glyph box carries `data-drawn` while the icon set can draw its ligature. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.icon') ?? []);

  /** DRZ-7: enters less leaves, within the zone — a child of the content entered is the zone still. */
  private depth = 0;
  /** DRZ-7: the window is listened to while a drag of files is within the zone. */
  private watching = false;
  /** DRZ-13: told once per element. */
  private pickerChecked = false;
  /** DRZ-6: the part of the box in view, as the custom properties of `.view`. */
  private view = '';

  constructor() {
    super();
    // DRZ-3, DRZ-8: the host hears every drag event of its content in the bubbling phase, after any target inside it.
    this.addEventListener('dragenter', this.onDragEnter);
    this.addEventListener('dragover', this.onDragOver);
    this.addEventListener('dragleave', this.onDragLeave);
    this.addEventListener('drop', this.onDrop);
  }

  // ─── What it reads ────────────────────────────────────────────────────────────────────────────────────────────

  /** Whether `node` stands in the zone: in its content, in its shadow root, or the host itself. */
  private within(node: Node | null): boolean {
    for (let at = node; at; at = up(at)) if (at === this) return true;
    return false;
  }

  /** DRZ-8, DRZ-14: an enabled drop zone encloses this one, and takes what this one, disabled, does not. */
  private get enclosed(): boolean {
    for (let at = up(this); at; at = up(at)) if (at instanceof TanreiDropZone && !at.disabled) return true;
    return false;
  }

  // ─── The drag (DRZ-3 to DRZ-8, DRZ-14) ────────────────────────────────────────────────────────────────────────

  /** Tells the browser what letting go here does: copy, or nothing. */
  private effect(event: DragEvent, effect: 'copy' | 'none') {
    if (!event.dataTransfer) return;
    try {
      event.dataTransfer.dropEffect = effect;
    } catch {
      // A data transfer that takes no effect.
    }
  }

  /**
   * DRZ-3, DRZ-8, DRZ-14: one dragenter or dragover of files that reached the host. An event whose default a target
   * inside the zone prevented is that target's: the zone draws nothing for it. Disabled, the zone takes nothing — but
   * where no enabled zone encloses it, it still keeps the browser from opening a file let go over it.
   */
  private answerDrag(event: DragEvent) {
    if (event.defaultPrevented) {
      this.drag = '';
      return;
    }
    if (this.disabled) {
      this.drag = '';
      if (this.enclosed) return;
      event.preventDefault();
      this.effect(event, 'none');
      return;
    }
    event.preventDefault();
    const answer = dragAnswer(event.dataTransfer, this);
    if (!this.drag) this.checkPicker();
    this.drag = answer;
    this.effect(event, answer === 'receiving' ? 'copy' : 'none');
    this.placeView();
  }

  private readonly onDragEnter = (event: DragEvent) => {
    if (!holdsFiles(event.dataTransfer)) return;
    this.depth += 1;
    this.watch(true);
    this.answerDrag(event);
  };

  private readonly onDragOver = (event: DragEvent) => {
    if (!holdsFiles(event.dataTransfer)) return;
    // A dragover with no dragenter before it (the drag began inside the zone, or the count was lost): it is within.
    this.depth = Math.max(1, this.depth);
    this.watch(true);
    this.answerDrag(event);
  };

  /** DRZ-7: a leave to a node outside the zone ends the condition at once; otherwise the count says whether it is still within. */
  private readonly onDragLeave = (event: DragEvent) => {
    if (!holdsFiles(event.dataTransfer)) return;
    const to = event.relatedTarget as Node | null;
    this.depth = Math.max(0, this.depth - 1);
    if ((to && !this.within(to)) || this.depth === 0) this.end();
  };

  /**
   * DRZ-9, DRZ-14: the condition ends at once and the drop is taken, so that the browser does not open the file; what
   * was dropped is judged as the File picker judges an arrival. A drop an inner target took is its own.
   */
  private readonly onDrop = (event: DragEvent) => {
    if (!holdsFiles(event.dataTransfer)) return;
    this.end();
    if (event.defaultPrevented) return;
    if (this.disabled) {
      if (!this.enclosed) event.preventDefault();
      return;
    }
    event.preventDefault();
    const { files, folders } = droppedFiles(event.dataTransfer);
    if (!files.length) return;
    const { accepted, refused } = judgeFiles(files, this, folders);
    if (accepted.length) this.dispatchEvent(new CustomEvent<TanreiDropZoneSelectDetail>('select', { bubbles: true, detail: { files: accepted } }));
    if (refused.length) this.dispatchEvent(new CustomEvent<TanreiDropZoneRejectDetail>('reject', { bubbles: true, detail: { files: refused } }));
    this.announce(accepted.length, refused.length);
  };

  /** DRZ-7: the drag entered something outside the zone. */
  private readonly onWindowDragEnter = (event: DragEvent) => {
    if (!this.within(event.composedPath()[0] as Node | null)) this.end();
  };

  /** DRZ-7: the drag was let go, or ended, anywhere; or the pointer moved, which no browser tells during a drag. */
  private readonly onWindowEnd = () => this.end();

  /** DRZ-7: the window is listened to only while a drag of files is within the zone. */
  private watch(on: boolean) {
    if (on === this.watching) return;
    this.watching = on;
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('dragenter', this.onWindowDragEnter as EventListener, true);
    for (const type of ['drop', 'dragend', 'pointermove']) window[method](type, this.onWindowEnd, true);
  }

  /** DRZ-7: the condition ends — the drag left, ended or was let go. */
  private end() {
    this.depth = 0;
    this.drag = '';
    this.watch(false);
  }

  /**
   * DRZ-6: the part of the zone's box that is in view — the box cut by the window and by every ancestor that clips or
   * scrolls — where the panel is centred. The whole box where none of it is in view.
   */
  private placeView() {
    const overlay = this.renderRoot?.querySelector<HTMLElement>('.overlay');
    if (!overlay) return;
    const box = overlay.getBoundingClientRect();
    let [top, left, bottom, right] = [Math.max(box.top, 0), Math.max(box.left, 0), Math.min(box.bottom, window.innerHeight), Math.min(box.right, window.innerWidth)];
    for (let at = up(this); at instanceof Element && at !== document.documentElement && at !== document.body; at = up(at)) {
      const style = getComputedStyle(at);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
      const clip = at.getBoundingClientRect();
      // The ancestor's padding box: inside its borders, and short of its scroll bars.
      const [ct, cl] = [clip.top + at.clientTop, clip.left + at.clientLeft];
      [top, left, bottom, right] = [Math.max(top, ct), Math.max(left, cl), Math.min(bottom, ct + at.clientHeight), Math.min(right, cl + at.clientWidth)];
    }
    const view = bottom > top && right > left ? `--_view-top:${top - box.top}px;--_view-left:${left - box.left}px;--_view-width:${right - left}px;--_view-height:${bottom - top}px` : '';
    if (view === this.view) return;
    this.view = view;
    this.renderRoot.querySelector<HTMLElement>('.view')?.setAttribute('style', view);
  }

  // ─── What is said (DRZ-11, DRZ-12, DRZ-13) ────────────────────────────────────────────────────────────────────

  /** DRZ-11: one message after a drop — how many passed, then how many were refused — in the product's words. */
  private announce(passed: number, refusedCount: number) {
    const region = this.renderRoot?.querySelector('.announcer');
    if (!region || this.silent) return;
    const count = (n: number) => new Intl.NumberFormat(ambientLocale(this), { maximumFractionDigits: 0 }).format(n);
    const said: string[] = [];
    const say = (key: 'filesDroppedText' | 'filesRefusedText', own: string, n: number, effect: string) => {
      if (!n) return;
      const sentence = this.words.get(key, own);
      if (!sentence) {
        this.words.missing(key, { prop: WORD_PROPS[key], id: 'DRZ-11', effect });
        return;
      }
      reportPlaces(this, 'DRZ-11', WORD_PROPS[key], sentence, wordPlaces[key] ?? [], 'it is said as it is written');
      said.push(fillPlaces(sentence, { count: count(n) }).runs.map((run) => run.text).join(''));
    };
    say('filesDroppedText', this.droppedText, passed, 'nothing is said for the files that passed');
    say('filesRefusedText', this.refusedText, refusedCount, 'nothing is said for the files that were refused');
    region.textContent = said.join(' ');
  }

  /** DRZ-13: the first drag over the zone, on a page with no way to choose a file without a pointer, is reported. */
  private checkPicker() {
    if (this.pickerChecked || !debugBuild()) return;
    this.pickerChecked = true;
    if (!pickerOnPage()) report(this, 'DRZ-13', 'the page has no file picker, so files can be added only by dragging them, which a keyboard, a screen reader and most touch screens cannot do; add a tanrei-file-picker or a tanrei-file-upload to the screen');
  }

  // ─── The product's way (DRZ-15) ───────────────────────────────────────────────────────────────────────────────

  /**
   * DRZ-15: judges files that did not arrive by a drop on the zone — pasted, dropped elsewhere, made by the product —
   * as one arrival, by the File picker's rule. Answers with the files that passed and the refused files with their
   * reasons, each in the order given. Emits nothing, says nothing and keeps nothing. Works while disabled.
   */
  judge(files: Iterable<File>): TanreiDropZoneJudgement {
    return judgeFiles(givenFiles(files), this);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────────────────────────────────────

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.end();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // DRZ-14: disabled during a drag ends the condition at once.
    if (changed.has('disabled') && this.disabled && this.drag) this.end();
  }

  protected override updated(changed: PropertyValues<this>) {
    this.reports(changed);
  }

  /** DRZ-20: a value that sets no limit, and an entry of accept that says no kind, are reported. */
  private reports(changed: PropertyValues<this>) {
    const has = (name: keyof TanreiDropZone) => changed.has(name);
    if (has('maxSize') && this.maxSize !== null && sizeLimit(this.maxSize) === null) report(this, 'DRZ-20', `max-size "${String(this.maxSize)}" is not a number above zero; no size limit is set`);
    if (has('maxFiles') && this.maxFiles !== null && countLimit(this.maxFiles) === null) report(this, 'DRZ-20', `max-files "${String(this.maxFiles)}" is not a whole number of zero or more; no limit of files is set`);
    if (has('accept')) {
      const { ignored } = readAccept(acceptList(this.accept));
      if (ignored.length) report(this, 'DRZ-20', `accept holds ${ignored.map((entry) => `"${entry}"`).join(', ')}, which is neither an extension with its dot nor a media type; it is ignored`);
    }
  }

  protected override render() {
    const drag = this.disabled ? '' : this.drag;
    const refusing = drag === 'refusing';
    const key = refusing ? 'dropZoneRefusingText' : 'dropZoneText';
    const text = this.words.get(key, refusing ? this.refusingText : this.dropText);
    // DRZ-12: a word is needed only where its panel is drawn.
    if (drag && !text) this.words.missing(key, { prop: WORD_PROPS[key], id: 'DRZ-12', effect: 'the panel is drawn with its glyph alone' });
    return html`<slot></slot
      ><div part="overlay" class="overlay" data-drag=${drag || nothing} aria-hidden="true">
        <div class="edge"></div>
        <div class="view" style=${this.view || nothing}>
          <div part="panel" class="panel" data-tanrei-shape>
            <span part="icon" class="icon"><span class="ink">${refusing ? GLYPHS.refusing : GLYPHS.upload}</span></span>
            ${text ? html`<span part="label" class="label">${text}</span>` : nothing}
          </div>
        </div>
      </div
      ><span class="announcer" aria-live="polite"></span>`;
  }
}

if (!customElements.get('tanrei-drop-zone')) customElements.define('tanrei-drop-zone', TanreiDropZone);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-drop-zone': TanreiDropZone;
  }
}
