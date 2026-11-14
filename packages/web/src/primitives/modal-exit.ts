import { type CSSResult, unsafeCSS } from 'lit';
import { afterFirstPaint, documentPainted, startFromNextFrame, startTogetherFromNextFrame } from './motion.js';
import { deepActive, modalLayer } from './modal.js';

// How a modal `<dialog>` leaves (MDL-7: "keeping them drawn until the fade ends"), for every modal surface: the
// dialog, the modal layer, the side and bottom sheets, the image preview, the modal date-time picker, the popover's sheet,
// the modal navigation drawer (sliding out, or narrowing back to its column) and the search's dialog and full-screen
// views.
//
// A closed `<dialog>` is `display: none` and out of the top layer. CSS can keep it drawn there while its exit plays
// (`display` and `overlay` transitioned with `transition-behavior: allow-discrete`), but only Chromium does: WebKit and
// Firefox take the dialog away at `close()`, so its surface and its scrim vanished there with no motion at all. And the
// dialog cannot simply stay modal until its exit ends: everything outside a modal dialog is inert, and focus goes back to
// the opener when it closes, not when its motion ends (MDL-5, DLG-13).
//
// So it is handed over. `closeModal()` closes the modal dialog — the page is no longer inert, and focus can go back — and
// in the same task shows it as a manual popover: still in the top layer, with its `::backdrop` (the scrim), no longer
// modal. While it leaves it is marked `data-tanrei-leaving`, inert, takes no pointer, and keeps the display and the box
// the browser gave it as a modal dialog. Its exit, and its scrim's, start from the values they showed: the scrim is a
// new `::backdrop` once the dialog is back in the top layer (and `close()` itself brings style up to date where it gives
// focus back), so both are drawn once as they were shown, with no transition, before the closed style moves them. When
// every transition on the dialog and its scrim has finished (their own `finished`, never a timer) it leaves the top layer
// at once and is closed. `openModal()` on a dialog still leaving takes it back the same way: modal again, its exit turned
// round from the values it shows (MOT-2).
//
// A surface that becomes part of the page as it leaves — a collapsible navigation drawer, which narrows back to the
// column it widened from, holding the menu button that focus goes back to — leaves `interactive`: not inert and taking
// the pointer, only its scrim taking none. An exit that moves more than what an appearance moves (`SHOWN`: the drawer's
// width, color, elevation and corners) names it in `moves`, so that it too is drawn as it was shown where the dialog
// changes hands.

/** The attribute of a modal dialog that is leaving: closed, still drawn in the top layer while its exit plays. */
export const LEAVING = 'data-tanrei-leaving';
/** While it is set the scrim starts no transition: see `modalExitStyles`. */
const QUIET = 'data-tanrei-quiet';
/** While it is set the scrim is held at the opacity it showed (`--_tanrei-backdrop-shown`). */
const KEEPING = 'data-tanrei-keeping';
const BACKDROP_SHOWN = '--_tanrei-backdrop-shown';

/**
 * What the browser draws differently for a modal dialog and for a popover (its own style sheet: `dialog:modal` has a
 * greatest width and height, `[popover]` its own padding, a closed dialog no box): held at the modal dialog's values
 * while it leaves, so that the box does not change under its exit.
 */
const HELD = ['display', 'max-width', 'max-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'] as const;
/** What an exit moves on the dialog itself: drawn as it was shown where the dialog changes hands. */
const SHOWN = ['opacity', 'scale', 'translate', 'filter', 'transform'] as const;

/**
 * What else an exit moves on the dialog itself (`closeModal`'s and `openModal`'s `moves`): longhands, by the physical
 * names the engines give their transitions (`width` for `inline-size`, a corner's radius for `border-radius`).
 */
export type ModalMoves = readonly string[];

type Own = [property: string, value: string, priority: string][];

interface Leaving {
  run: number;
  /** The dialog's own inline values of what is held, put back when it has left. */
  own: Own;
  /** What its exit moves besides `SHOWN`. */
  moves: ModalMoves;
}

const leaving = new WeakMap<HTMLDialogElement, Leaving>();
let runs = 0;

/** Whether `dialog` is leaving: closed, its exit still playing in the top layer. */
export const isLeaving = (dialog: HTMLDialogElement): boolean => leaving.has(dialog);

/** Sets `property` inline with `!important`, keeping what the dialog's own inline style had. */
function hold(dialog: HTMLDialogElement, property: string, value: string, own: Own) {
  own.push([property, dialog.style.getPropertyValue(property), dialog.style.getPropertyPriority(property)]);
  dialog.style.setProperty(property, value, 'important');
}

/** Puts back what `hold` replaced, last first. */
function release(dialog: HTMLDialogElement, own: Own) {
  for (const [property, value, priority] of [...own].reverse()) {
    if (value) dialog.style.setProperty(property, value, priority);
    else dialog.style.removeProperty(property);
  }
}

/** Brings the dialog's style, and its scrim's, up to date. */
const flush = (dialog: HTMLDialogElement) => {
  void getComputedStyle(dialog).opacity;
  void getComputedStyle(dialog, '::backdrop').opacity;
};

/** The motions of the dialog itself and of its `::backdrop` (not of anything inside it) that will end. */
function motions(dialog: HTMLDialogElement): Animation[] {
  return dialog.getAnimations({ subtree: true }).filter((animation) => {
    const effect = animation.effect as KeyframeEffect | null;
    return effect?.target === dialog && animation.playState !== 'finished' && Number(effect.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY;
  });
}

/** The transitions of what an appearance moves on the dialog itself, and of what `moves` names (not on its scrim, nor inside it). */
function turning(dialog: HTMLDialogElement, moves: ModalMoves = []): Animation[] {
  return dialog.getAnimations().filter((animation) => {
    const effect = animation.effect as KeyframeEffect | null;
    const property = (animation as CSSTransition).transitionProperty;
    return effect?.target === dialog && effect.pseudoElement === null && ((SHOWN as readonly string[]).includes(property) || moves.includes(property));
  });
}

/**
 * Runs `change` with no transition on the dialog or its scrim (one under way is finished first), and draws the result.
 * Exported for a dialog drawn in place, opened by its `open` attribute and never modal (a view drawn inline for tests
 * and documentation): before the document's first paint it too is drawn open at once (MOT-4).
 */
export function atOnce(dialog: HTMLDialogElement, change: () => void) {
  const own: Own = [];
  hold(dialog, 'transition-property', 'none', own);
  dialog.setAttribute(QUIET, '');
  for (const animation of motions(dialog)) animation.finish();
  change();
  flush(dialog);
  dialog.removeAttribute(QUIET);
  release(dialog, own);
}

/**
 * Runs `change` — which takes the dialog out of the top layer and puts it back, closed or open — with the dialog and its
 * scrim drawn as they were shown before it, with no transition; let go, they move from there to what their style gives
 * them now (MOT-2).
 */
function asShown(dialog: HTMLDialogElement, change: () => void, moves: ModalMoves) {
  const style = getComputedStyle(dialog);
  const shown = [...SHOWN, ...moves].map((property) => [property, style.getPropertyValue(property)] as const);
  const scrim = getComputedStyle(dialog, '::backdrop').opacity;
  const kept: Own = [];
  hold(dialog, 'transition-property', 'none', kept);
  for (const [property, value] of shown) hold(dialog, property, value, kept);
  hold(dialog, BACKDROP_SHOWN, scrim, kept);
  // The motions it is turned from end here, where they had got to (the values just held draw it there): the engine is
  // not left to replace them across the change. WebKit, taking the dialog out of the top layer and putting it back, can
  // keep a transition beside the one that replaces it — seen as a second `scale` on a dialog closed while its entrance
  // grew it, on a loaded machine — and the exit then waits for both.
  for (const animation of turning(dialog, moves)) animation.cancel();
  dialog.setAttribute(QUIET, '');
  dialog.setAttribute(KEEPING, '');
  change();
  flush(dialog);
  dialog.removeAttribute(KEEPING);
  dialog.removeAttribute(QUIET);
  release(dialog, kept);
}

/** Out of the top layer and closed, at once, its attributes and inline style as they were before it left. */
function gone(dialog: HTMLDialogElement, state: Leaving) {
  leaving.delete(dialog);
  atOnce(dialog, () => {
    if (dialog.matches(':popover-open')) dialog.hidePopover();
    dialog.removeAttribute('popover');
    dialog.removeAttribute(LEAVING);
    dialog.inert = false;
    release(dialog, state.own);
  });
}

/**
 * Closes the modal `dialog` (MDL-5, MDL-7). It is no longer modal at once — the page is no longer inert, so focus can
 * go back to the opener in the same task — and stays drawn in the top layer, inert and taking no pointer, while its exit
 * and its scrim's play from the values they showed; then it leaves the top layer. Resolves with true once it has, or with
 * false when it was opened again first (`openModal`). `instant` (or a dialog out of the document): closed now.
 *
 * `interactive`: while it leaves it is not inert and takes the pointer (its scrim takes none) — a surface that becomes
 * part of the page as it leaves and holds what focus goes back to (a collapsible navigation drawer narrowing to its
 * column). `moves`: what its exit moves on the dialog itself besides what an appearance moves (`ModalMoves`).
 *
 * The exit is what the dialog's style gives it closed: its `[open]` rules are its open look, and its closed rules
 * transition to the closed look. Give the dialog `modalExitStyles()`. It and its scrim's fade begin in the first frame
 * drawn after the closing task (`startFromNextFrame`, src/primitives/motion.ts); before the document's first paint they
 * are left as they are.
 */
export async function closeModal(
  dialog: HTMLDialogElement,
  { instant = false, interactive = false, moves = [] }: { instant?: boolean; interactive?: boolean; moves?: ModalMoves } = {},
): Promise<boolean> {
  const was = leaving.get(dialog);
  if (was) {
    if (!instant) return leave(dialog, was);
    gone(dialog, was);
    return true;
  }
  if (!dialog.open) return true;
  if (instant || !dialog.isConnected || typeof dialog.showPopover !== 'function') {
    atOnce(dialog, () => dialog.close());
    modalLayer.delete(dialog);
    return true;
  }
  const state: Leaving = { run: ++runs, own: [], moves };
  leaving.set(dialog, state);
  const style = getComputedStyle(dialog);
  const drawn = HELD.map((property) => [property, style.getPropertyValue(property)] as const);
  asShown(
    dialog,
    () => {
      for (const [property, value] of drawn) hold(dialog, property, value, state.own);
      if (!interactive) hold(dialog, 'pointer-events', 'none', state.own);
      dialog.setAttribute(LEAVING, '');
      // Inert while it changes hands, so that the focusing steps of `close()` and `showPopover()` give focus to nothing
      // in it (a dialog shown as a popover takes focus itself): where focus goes back is the caller's (MDL-5).
      dialog.inert = true;
      dialog.close();
      dialog.setAttribute('popover', 'manual');
      dialog.showPopover();
      dialog.inert = !interactive;
    },
    moves,
  );
  // No longer modal, and back in the top layer as it leaves: what is shown in it moves out now (a snackbar, SNK-38), and
  // is drawn above it.
  modalLayer.delete(dialog);
  // Asking flushes style: the exit's transitions, and its scrim's, exist now. They begin in the first frame drawn after
  // this task, as an entrance does: WebKit dated them from the frame drawn before it, and where a long task outlasted
  // the exit the surface and its scrim were gone in that frame without a frame of their motion.
  if (documentPainted()) startFromNextFrame([...turning(dialog, moves), ...scrimMotions(dialog)], { leaving: true });
  return leave(dialog, state);
}

/** Waits for the exit of a dialog leaving: what replaces a transition while it runs is waited for too. */
async function leave(dialog: HTMLDialogElement, state: Leaving): Promise<boolean> {
  const { run } = state;
  for (;;) {
    if (leaving.get(dialog)?.run !== run) return false;
    // Asking flushes style: the exit's transitions exist now.
    const running = motions(dialog);
    if (!running.length || !dialog.isConnected) break;
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
  if (leaving.get(dialog)?.run !== run) return false;
  gone(dialog, state);
  return true;
}

/**
 * The transitions of the dialog's scrim, its `::backdrop` (WebKit names that pseudo-element `''` on the animation's
 * effect, where an animation of the dialog itself has none: `null`).
 */
function scrimMotions(dialog: HTMLDialogElement): Animation[] {
  return dialog.getAnimations({ subtree: true }).filter((animation) => {
    const effect = animation.effect as KeyframeEffect | null;
    return effect?.target === dialog && (effect.pseudoElement === '::backdrop' || effect.pseudoElement === '') && 'transitionProperty' in animation;
  });
}

/**
 * Opens `dialog` modally (`showModal()`, where it is not open). A dialog still leaving is taken back: modal again, its
 * surface and its scrim going on from the values they show, not from their start.
 *
 * Its entrance and its scrim's fade, which the open state starts in this task, begin in the first frame drawn after
 * it, as an appearance does (`startFromNextFrame`, src/primitives/motion.ts): WebKit dates them from the frame drawn
 * before the task, and drew the surface and its scrim whole at once where a long task outlasted them. What moves inside
 * the dialog is its component's (an `AppearController`'s).
 *
 * Before the document's first paint — a dialog in the page's markup with `open` — or `instant`, the dialog and its
 * scrim are drawn open at once, with no transition (MOT-4). Their own fade is no part of an `AppearController`'s motion
 * element where that is inside the dialog (an image preview's pages, which its container fades round; a modal layer's
 * content), so no controller makes it at once: left to itself it would play over the first frames, everything in the
 * dialog translucent (an image preview's controls below their contrast).
 *
 * `moves`: what its entrance moves on the dialog itself besides what an appearance moves (`ModalMoves`); a dialog
 * taken back from leaving goes on with what its `closeModal()` named.
 *
 * `keep`: an element inside the dialog that has focus once `showModal()` returns — one that has focus as it opens keeps
 * it. `showModal()` always runs the dialog focusing steps (HTML): focus goes to the dialog's autofocus delegate,
 * else to its first focusable descendant, else to the dialog itself — and nowhere, the kept element losing focus, where
 * none of them can take it. Left to themselves the engines give focus to something else first, and Chromium brings the
 * style up to date before the component can give it back, so the focused element and the one that took focus for a
 * moment each began a motion for a state they then left at once. So the element carries `autofocus` while
 * `showModal()` runs: an element of the dialog's own tree is then its autofocus delegate in every engine, and, focused
 * already, moves no focus at all.
 *
 * An element slotted into the dialog (a navigation drawer's destination) is not one of the dialog's descendants, which
 * is where the focusing steps look (whatwg/html#9245, #12649 ask whether they should look through slots). Chromium
 * looks through slots and shadow roots, takes it and moves no focus; Firefox and WebKit, as the standard says, give
 * focus to the dialog, and the element is given it back in the same task, before any style is read, and without
 * scrolling (where it is shown is the component's to say): a focus out of it and back, which no frame shows. The
 * standard leaves no way around it: a dialog that cannot take focus (inert, or not rendered while it is shown) leaves
 * the steps nothing to focus, and every engine then takes focus from the kept element. Focus that moves into the dialog
 * from elsewhere is the component's to give, after this: WebKit draws an element that is first styled in the top layer
 * as it is then, so focus given to it before that would be drawn at once. An element of the dialog's own tree whose
 * focus draws no motion may be given it here all the same (an image preview's stage, whose focus is an indicator that
 * comes at once): focus then goes from elsewhere to it in one move, in every engine.
 *
 * Without `keep`, focus goes to the dialog itself as it opens, in one move, and from there where the component gives it
 * (MDL-3): what is inside the dialog is inert while `showModal()` runs, so that its focusing steps find nothing else.
 * Left to them, the dialog's first control took focus for no frame (a sheet's close button, a search's back button, a
 * dialog's first action), and its state began a motion all the same. A component that then gives focus to an element
 * inside passes it as `keep` where it can: in Chromium the focus that leaves the dialog for it brings the style and the
 * layout up to date again, for every instance opened in the task.
 */
export function openModal(dialog: HTMLDialogElement, { instant = !documentPainted(), moves = [], keep = null }: { instant?: boolean; moves?: ModalMoves; keep?: HTMLElement | null } = {}): void {
  if (dialog.open && !leaving.has(dialog)) return;
  if (instant) {
    atOnce(dialog, () => show(dialog, keep));
    if (!documentPainted()) quietUntilPainted(dialog);
    return;
  }
  const taken = leaving.get(dialog)?.moves ?? [];
  show(dialog, keep);
  // Asking flushes style: the transitions the open state starts exist then. They are asked for with every other host's
  // reads of the turn (`startTogetherFromNextFrame`), not here after this dialog's own writes: a hundred dialogs opened in
  // one task style the page once for them, not once each.
  startTogetherFromNextFrame(() => [...turning(dialog, [...moves, ...taken]), ...scrimMotions(dialog)]);
}

/**
 * MOT-4: a dialog opened before the document's first paint keeps its scrim from starting a transition until that paint.
 * WebKit can start the `::backdrop`'s entrance from its `@starting-style` again after the dialog was drawn open at once,
 * when the component lays the dialog out anew in the task that opened it — seen where the actions do not fit in a row
 * and are stacked (a dialog's, a side sheet's), whose scrim then faded in as the page loaded.
 */
function quietUntilPainted(dialog: HTMLDialogElement) {
  dialog.setAttribute(QUIET, '');
  void afterFirstPaint().then(() => dialog.removeAttribute(QUIET));
}

/** Modal: shown, or taken back from leaving; `keep` keeps focus (`openModal()`). */
function show(dialog: HTMLDialogElement, keep: HTMLElement | null) {
  const state = leaving.get(dialog);
  if (!state) {
    showFocused(dialog, keep);
    return;
  }
  leaving.delete(dialog);
  asShown(
    dialog,
    () => {
      if (dialog.matches(':popover-open')) dialog.hidePopover();
      dialog.removeAttribute('popover');
      dialog.removeAttribute(LEAVING);
      dialog.inert = false;
      release(dialog, state.own);
      showFocused(dialog, keep);
    },
    state.moves,
  );
}

/**
 * `showModal()`, `keep` keeping focus (`openModal()`). The layer keeps where focus goes back to from it, asked before it
 * opens (`modalLayer.opener()`, what its component asked too), for a region of the page that opens under it (`openerFor()`).
 */
function showFocused(dialog: HTMLDialogElement, keep: HTMLElement | null) {
  const opener = modalLayer.opener();
  const marked = !!keep && !keep.hasAttribute('autofocus');
  if (marked) keep.setAttribute('autofocus', '');
  // Nothing to keep: focus goes to the dialog itself (`openModal()`). `autofocus` on the dialog would say so in Firefox
  // and WebKit, but Chromium does not read it there; with nothing inside it able to take focus, every engine focuses it.
  const quieted = keep ? [] : [...dialog.children].filter((child): child is HTMLElement => child instanceof HTMLElement && !child.inert);
  for (const child of quieted) child.inert = true;
  try {
    dialog.showModal();
  } finally {
    if (marked) keep.removeAttribute('autofocus');
    for (const child of quieted) child.inert = false;
  }
  if (keep && deepActive() !== keep) keep.focus({ preventScroll: true });
  modalLayer.add(dialog, opener);
}

/**
 * The CSS a dialog opened and closed with `openModal()` and `closeModal()` needs, for `dialog` (its selector): where
 * the dialog changes hands its scrim starts no transition and stands at the opacity it showed — a `::backdrop` takes
 * neither from the dialog's inline style — and while it leaves its scrim takes no pointer, so that a press reaches the
 * page, which is no longer inert. Compose it after the dialog's own rules.
 */
export function modalExitStyles(dialog: string): CSSResult {
  return unsafeCSS(`
  ${dialog}[${LEAVING}]::backdrop {
    pointer-events: none;
  }
  ${dialog}[${QUIET}]::backdrop {
    transition-property: none !important;
  }
  ${dialog}[${KEEPING}]::backdrop {
    opacity: var(${BACKDROP_SHOWN}) !important;
  }`);
}
